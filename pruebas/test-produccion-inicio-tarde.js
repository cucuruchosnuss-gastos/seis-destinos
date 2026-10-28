// INICIO TARDE DE PRODUCCIÓN (27/10/2026): la cuarta acción de la planilla de
// la tablet, y el piso de la parada igualado al de la base.
//
// Caso real (27/10, lote 6270, Máquina 2, tarde): el turno era de 15:00 pero
// faltó un operario y se empezó a producir a las 17:53. El encargado quiso
// cargarlo como parada 15:00–17:53 y la tablet dijo "La hora en que paró no
// entra en el turno": limitesParada tomaba el piso como abierto_en − 1 h, y
// la planilla se abrió a las 17:40. No es una parada: es un INICIO TARDE.
//
// Contrato con la base (pg_get_functiondef, 27/10/2026):
//  - registrar_parada: el piso es least(abierto_en, _ts_turno(fecha,
//    hora_inicio, null)) − 1 hora (sin hora_inicio, abierto_en − 1 hora).
//  - registrar_inicio_tarde(p_turno_id, p_hora_inicio time, p_hora_largada
//    time, p_motivo text) → { minutos_tarde }: motivo de 2 letras o más;
//    demora = largada − inicio, + 1440 si es negativa (cruce de medianoche);
//    0 → "no es un inicio tarde"; más de 720 → "más de 12 horas". Llama a
//    corregir_horario_turno(turno, inicio, null) y a
//    registrar_hora_largada(turno, largada, motivo) (la largada no puede ser
//    futura con la planilla sin cerrar; al día siguiente si cae más de 2 h
//    antes del inicio). Guarda hora_inicio, hora_largada y largada_motivo.
//  - ejecutar_tablet acepta la operación 'registrar_inicio_tarde'.
//
//   node pruebas/test-produccion-inicio-tarde.js
//   ARCHIVO_TEST=<copia de modulos/produccion.html>

process.env.TZ = 'UTC'
const path = require('path')
const { arnes, leer, marca, chequearMarcas } = require('./circuito-comun')
const { construirProduccion } = require('./sandbox-produccion')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/produccion.html')
const FUENTE = leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

const RED = { message: 'TypeError: Failed to fetch', code: '' }
// El 27/10/2026 a las 18:30 de Argentina (21:30 UTC).
const AHORA = new Date('2026-10-27T21:30:00Z')
// El lote 6270: turno de 15:00, la planilla se abrió a las 17:40.
const TURNO = {
  id: 't6270', lote: 6270, maquina_id: 'm2', fecha: '2026-10-27', turno: 'Tarde', encargado_id: 'e-fede',
  abierto_en: '2026-10-27T20:40:00Z', estado: 'abierto', forzado_por: null, forzado_en: null, forzado_motivo: null,
  hora_inicio: '15:00:00', hora_fin: null, hora_largada: null, largada_motivo: null,
}
const HORARIOS = [{ turno: 'Tarde', hora_inicio: '15:00:00', hora_fin: '23:00:00', activo: true }]

// Una base chica con estado: registrar_inicio_tarde hace lo de la base.
function armar({ turno = TURNO, horarios = HORARIOS } = {}) {
  const S = construirProduccion(ARCHIVO)
  const db = { turno: { ...turno } }
  const red = { on: true, cargas: [], rechazo: null }
  S.db = db
  Object.assign(S.__tablas, {
    turnos_produccion: filtros => filtros.some(f => f[1] === 'estado' && f[2] === 'pendiente_completar') ? { data: [], error: null } : { data: [db.turno], error: null },
    turno_operarios: [], masas: [], produccion_items: [], paradas_produccion: [],
    maquinas: [{ id: 'm2', nombre: 'Máquina 2', orden: 2 }],
    motivos_parada: [{ id: 'mo-otro', nombre: 'Otro motivo', categoria: 'otro', pide_detalle: true, orden: 99 }],
    horarios_turno: horarios,
  })
  S.__setRpc(async (op, p) => {
    if (!red.on) return { data: null, error: RED }
    if (op !== 'registrar_inicio_tarde') return { data: op === 'personal_produccion' ? [] : null, error: null }
    if (red.rechazo) return { data: null, error: { message: red.rechazo, code: 'P0001' } }
    red.cargas.push(p)
    let min = (Number(p.p_hora_largada.slice(0, 2)) * 60 + Number(p.p_hora_largada.slice(3, 5))) - (Number(p.p_hora_inicio.slice(0, 2)) * 60 + Number(p.p_hora_inicio.slice(3, 5)))
    if (min < 0) min += 1440
    Object.assign(db.turno, { hora_inicio: p.p_hora_inicio + ':00', hora_largada: p.p_hora_largada + ':00', largada_motivo: p.p_motivo })
    return { data: { minutos_tarde: min }, error: null }
  })
  S.estado.modo = 'produccion'
  S.estado.persona = { id: 'e-fede', nombre: 'Federico Silva' }
  S.estado.personal = [{ id: 'e-fede', nombre: 'Federico Silva', puestos: ['encargado'] }]
  S.estado.tablero = [{ maquina: { id: 'm2', nombre: 'Máquina 2' }, turno: { id: turno.id } }]
  S.estado.sesionPlanta = { unidad_negocio_id: 'u-cn' }
  return { S, db, red, sinRed(v = true) { red.on = !v; S.__nav.onLine = !v } }
}
const el = (S, id) => S.__doc.getElementById(id)
const html = (S, id) => el(S, id).innerHTML
const pedidas = (S) => S.__llamadas.rpc.filter(([x]) => x === 'registrar_inicio_tarde').map(([, p]) => p)
const tic = () => new Promise(r => setImmediate(r))
const teclas = (S, numeros) => { for (const d of numeros) S.teclaTardeVentana(d) }

// ── Fuente ─────────────────────────────────────────────────────────────
chk('la cuarta acción "Inicio tarde" va en la fila de las tres, con su mismo estilo (pr-acc)',
  /id="pr-btn-largada"[^>]*><\/button>[\s\S]{0,400}<button type="button" class="pr-acc pr-acc--tarde" id="pr-btn-tarde" aria-haspopup="dialog"><\/button>\s*<button type="button" class="pr-acc pr-acc--paro"/.test(FUENTE))
chk('la ventana es un diálogo con el teclado de la planta, nunca un input de hora',
  /id="pr-tarde-ventana" hidden role="dialog" aria-modal="true"/.test(FUENTE) && !/type="time"/.test(FUENTE))
chk('la planilla lee largada_motivo', /hora_inicio, hora_fin, hora_largada, largada_motivo'\)\s*\n?\s*\.eq\('id', turnoId\)/.test(FUENTE))

// ── 1 · El piso de la parada: el de registrar_parada ─────────────────────
{
  const { S } = armar()
  const lim = S.limitesParada(TURNO, AHORA)
  chk('caso 6270: el piso es 15:00 − 1 h (la hora de inicio, no la apertura de las 17:40)',
    lim.piso === new Date('2026-10-27T14:00:00-03:00').getTime(), new Date(lim.piso).toISOString())
  const h = S.resolverHorasParada({ inicio: '15:00', fin: '17:53', sigue: false }, TURNO, AHORA)
  chk('caso 6270: la parada 15:00–17:53 ENTRA en el turno (antes: "no entra en el turno")',
    h.inicio === '2026-10-27T15:00:00-03:00' && h.fin === '2026-10-27T17:53:00-03:00', JSON.stringify(h))
  const temprano = { ...TURNO, hora_inicio: '06:00:00', abierto_en: '2026-10-27T08:30:00Z' } // abierta 05:30
  chk('abierta antes de la hora de inicio: manda la apertura (05:30 − 1 h)',
    S.limitesParada(temprano, AHORA).piso === new Date('2026-10-27T04:30:00-03:00').getTime())
  chk('sin hora de inicio: la apertura − 1 h, como antes',
    S.limitesParada({ ...TURNO, hora_inicio: null }, AHORA).piso === new Date('2026-10-27T16:40:00-03:00').getTime())
  chk('sin hora de inicio, 15:00 sigue sin entrar (la base tampoco la acepta)',
    S.resolverHorasParada({ inicio: '15:00', fin: '17:53', sigue: false }, { ...TURNO, hora_inicio: null }, AHORA).error === 'La hora en que paró no entra en el turno.')
  const noche = { ...TURNO, turno: 'Noche', hora_inicio: '22:00:00', abierto_en: '2026-10-28T01:05:00Z' }
  const hn = S.resolverHorasParada({ inicio: '02:10', fin: '02:40', sigue: false }, noche, new Date('2026-10-28T06:00:00Z'))
  chk('turno noche: 02:10 sigue siendo del día siguiente', hn.inicio === '2026-10-28T02:10:00-03:00', JSON.stringify(hn))
}

// ── 2 · La cuenta de la demora ───────────────────────────────────────────
{
  const { S } = armar()
  chk('15:00 → 17:53 son 173 minutos', S.minutosTarde('15:00', '17:53') === 173)
  chk('cruza la medianoche: 22:00 → 00:30 son 150 minutos', S.minutosTarde('22:00', '00:30') === 150)
  chk('… y 23:50 → 06:10 son 380', S.minutosTarde('23:50', '06:10') === 380)
  chk('la misma hora es 0', S.minutosTarde('15:00', '15:00') === 0)
  chk('falta una hora: null', S.minutosTarde('', '17:53') === null && S.minutosTarde('15:00', null) === null)
  chk('el texto: "Inicio tarde: 15:00 → 17:53 (2 h 53 min) · Falta de operario"',
    S.textoInicioTarde(S.inicioTardeDe({ hora_inicio: '15:00:00', hora_largada: '17:53:00', largada_motivo: 'Falta de operario' })) === 'Inicio tarde: 15:00 → 17:53 (2 h 53 min) · Falta de operario')
  chk('sin motivo no es un inicio tarde (es "Empezó a producir")', S.inicioTardeDe({ hora_inicio: '06:00:00', hora_largada: '06:40:00', largada_motivo: null }) === null)
  chk('… ni con la largada a la hora del inicio', S.inicioTardeDe({ hora_inicio: '15:00:00', hora_largada: '15:00:00', largada_motivo: 'x' }) === null)
}

esperas.push((async () => {
  // ═══ CASO 3 · El caso real, de punta a punta ════════════════════════════
  {
    const { S, red } = armar()
    await S.abrirPlanilla('t6270')
    chk('sin inicio tarde: el botón dice "INICIO TARDE · Cargar" y no hay línea arriba',
      /INICIO TARDE<\/span><span class="pr-acc__dato">Cargar</.test(html(S, 'pr-btn-tarde')) && el(S, 'pr-aviso-tarde').hidden === true, html(S, 'pr-btn-tarde'))
    S.abrirTardeVentana()
    const f = S.estado.tardeForm
    chk('la ventana abre con la hora del turno precargada (15:00) y espera la de producir',
      el(S, 'pr-tarde-ventana').hidden === false && f.inicio === '15:00' && f.largada === '' && f.campo === 'largada', JSON.stringify(f))
    chk('… pregunta las dos horas', /¿A qué hora empezaba el turno\?/.test(html(S, 'pr-tarde-ventana-horas')) && /¿A qué hora se empezó a producir\?/.test(html(S, 'pr-tarde-ventana-horas')))
    chk('… con los cuatro motivos, ninguno elegido', ['Falta de operario', 'Falta de masa', 'Mantenimiento / arreglo', 'Otro'].every(m => html(S, 'pr-tarde-ventana-motivos').includes(`data-it-motivo="${m}" aria-pressed="false"`)), html(S, 'pr-tarde-ventana-motivos'))
    teclas(S, ['1', '7', '5', '3'])
    chk('en vivo: "Empezó 2 h 53 min tarde"', el(S, 'pr-tarde-ventana-demora').textContent === 'Empezó 2 h 53 min tarde', el(S, 'pr-tarde-ventana-demora').textContent)
    await S.confirmarTardeVentana(AHORA)
    chk('sin motivo no se manda: "Elegí por qué se empezó tarde."', pedidas(S).length === 0 && el(S, 'pr-tarde-ventana-error').textContent === 'Elegí por qué se empezó tarde.' && el(S, 'pr-tarde-ventana-error').hidden === false)
    S.motivoTardeVentana('Otro')
    chk('«Otro» muestra el campo para escribir', el(S, 'pr-tarde-ventana-campo-otro').hidden === false)
    el(S, 'pr-tarde-ventana-otro').value = ' '
    await S.confirmarTardeVentana(AHORA)
    chk('«Otro» sin texto no se manda', pedidas(S).length === 0 && el(S, 'pr-tarde-ventana-error').textContent === 'Contá por qué se empezó tarde (en «Otro»).')
    S.motivoTardeVentana('Falta de operario')
    chk('elegir otro motivo esconde el campo de «Otro»', el(S, 'pr-tarde-ventana-campo-otro').hidden === true && /data-it-motivo="Falta de operario" aria-pressed="true"/.test(html(S, 'pr-tarde-ventana-motivos')))
    await S.confirmarTardeVentana(AHORA)
    await tic()
    chk('Guardar → registrar_inicio_tarde con el turno, 15:00, 17:53 y el motivo',
      JSON.stringify(pedidas(S)) === '[{"p_turno_id":"t6270","p_hora_inicio":"15:00","p_hora_largada":"17:53","p_motivo":"Falta de operario"}]', JSON.stringify(pedidas(S)))
    chk('… por la cola (ejecutar_tablet, con su clave)', S.__llamadas.tablet.some(([, op]) => op === 'registrar_inicio_tarde'))
    chk('… la ventana se cierra y lo dice', el(S, 'pr-tarde-ventana').hidden === true && S.__llamadas.exitos.includes('Inicio tarde: 15:00 → 17:53 (2 h 53 min).'), S.__llamadas.exitos.join(' | '))
    chk('la planilla muestra "Inicio tarde: 15:00 → 17:53 (2 h 53 min) · Falta de operario"',
      el(S, 'pr-aviso-tarde').hidden === false && el(S, 'pr-aviso-tarde-texto').textContent === 'Inicio tarde: 15:00 → 17:53 (2 h 53 min) · Falta de operario')
    chk('… el botón, la demora y las horas', /INICIO TARDE<\/span><span class="pr-acc__dato">2 h 53 min<\/span><span class="pr-acc__sub">15:00 → 17:53</.test(html(S, 'pr-btn-tarde')), html(S, 'pr-btn-tarde'))
    chk('… y "Empezó a producir" ya dice 17:53', /17:53/.test(html(S, 'pr-btn-largada')) && el(S, 'pr-aviso-largada').hidden === true)
    void red
  }

  // ═══ CASO 4 · Ya cargado: el botón abre la ventana para corregirlo ══════
  {
    const { S } = armar({ turno: { ...TURNO, hora_largada: '17:53:00', largada_motivo: marca('gas') } })
    await S.abrirPlanilla('t6270')
    // El motivo de «Otro» es texto libre: la línea va por textContent (nunca
    // se interpreta como HTML) y el botón, escapado.
    chk('la línea del inicio tarde pone el motivo como texto', el(S, 'pr-aviso-tarde-texto').textContent.includes(marca('gas')) &&
      /getElementById\('pr-aviso-tarde-texto'\)\.textContent = textoInicioTarde\(it\)/.test(FUENTE))
    chequearMarcas(chk, 'la ventana con el motivo de «Otro»', (S.abrirTardeVentana(), html(S, 'pr-tarde-ventana-motivos')), [])
    S.cerrarTardeVentana()
    S.abrirTardeVentana()
    const f = S.estado.tardeForm
    chk('corregir: abre con las horas cargadas y «Otro» con su texto',
      f.inicio === '15:00' && f.largada === '17:53' && f.motivo === 'Otro' && el(S, 'pr-tarde-ventana-otro').value === f.otro && /gas/.test(f.otro), JSON.stringify(f))
    S.cerrarTardeVentana()
    const { S: S2 } = armar({ turno: { ...TURNO, hora_largada: '17:53:00', largada_motivo: 'Falta de masa' } })
    await S2.abrirPlanilla('t6270')
    S2.abrirTardeVentana()
    chk('corregir con un motivo fijo: queda elegido', S2.estado.tardeForm.motivo === 'Falta de masa' && /data-it-motivo="Falta de masa" aria-pressed="true"/.test(html(S2, 'pr-tarde-ventana-motivos')))
    S2.campoTardeVentana('inicio')
    teclas(S2, ['1', '4', '3', '0'])
    chk('tocar la hora del turno y escribirla la cambia, y pasa sola a la de producir', S2.estado.tardeForm.inicio === '14:30' && S2.estado.tardeForm.campo === 'largada')
    chk('… y la demora se recalcula', el(S2, 'pr-tarde-ventana-demora').textContent === 'Empezó 3 h 23 min tarde')
    // La línea de arriba también abre la ventana.
    S2.cerrarTardeVentana()
    el(S2, 'pr-aviso-tarde').click?.()
  }

  // ═══ CASO 5 · El turno noche cruza la medianoche ════════════════════════
  {
    const noche = { ...TURNO, id: 'tn', turno: 'Noche', hora_inicio: '22:00:00', abierto_en: '2026-10-28T01:05:00Z' }
    const { S } = armar({ turno: noche })
    const ahoraNoche = new Date('2026-10-28T04:00:00Z') // 01:00 del 28
    await S.abrirPlanilla('tn')
    S.abrirTardeVentana()
    teclas(S, ['0', '0', '3', '0'])
    chk('noche: 22:00 → 00:30 "Empezó 2 h 30 min tarde"', el(S, 'pr-tarde-ventana-demora').textContent === 'Empezó 2 h 30 min tarde', el(S, 'pr-tarde-ventana-demora').textContent)
    S.motivoTardeVentana('Falta de masa')
    await S.confirmarTardeVentana(ahoraNoche)
    await tic()
    chk('… 00:30 es de la madrugada siguiente (no futura): se manda',
      JSON.stringify(pedidas(S)) === '[{"p_turno_id":"tn","p_hora_inicio":"22:00","p_hora_largada":"00:30","p_motivo":"Falta de masa"}]', JSON.stringify(pedidas(S)) + el(S, 'pr-tarde-ventana-error').textContent)
    chk('… y la planilla dice 2 h 30 min', el(S, 'pr-aviso-tarde-texto').textContent === 'Inicio tarde: 22:00 → 00:30 (2 h 30 min) · Falta de masa', el(S, 'pr-aviso-tarde-texto').textContent)
  }

  // ═══ CASO 6 · Los controles de la base, antes de mandar ═════════════════
  {
    const { S } = armar()
    await S.abrirPlanilla('t6270')
    const probar = async (inicio, largada, ahora = AHORA) => {
      S.abrirTardeVentana()
      Object.assign(S.estado.tardeForm, { inicio, largada, motivo: 'Falta de operario' })
      await S.confirmarTardeVentana(ahora)
      const e = el(S, 'pr-tarde-ventana-error').textContent
      S.cerrarTardeVentana()
      return e
    }
    chk('a la hora del turno no es un inicio tarde', (await probar('15:00', '15:00')) === 'Si empezó a producir a la hora del turno, no es un inicio tarde.')
    chk('más de 12 horas no (15:00 → 14:00 serían 23 h)', (await probar('15:00', '14:00')) === 'La demora no puede ser de más de 12 horas: revisá las horas.')
    chk('una largada futura no (18:45 con las 18:30)', (await probar('15:00', '18:45')) === 'Las 18:45 todavía no pasaron: la hora en que se empezó a producir no puede ser futura.')
    chk('… dentro de los 5 minutos de tolerancia, sí', pedidas(S).length === 0 && (await probar('15:00', '18:34')) === '' && pedidas(S).length === 1)
    chk('sin hora de inicio lo pide', (await probar('', '17:53')) === 'Poné a qué hora empezaba el turno.')
    chk('sin hora de producir la pide', (await probar('15:00', '')) === 'Poné a qué hora se empezó a producir.')
    // El día de la largada se mide con la hora de inicio NUEVA: corregir el
    // inicio a 05:00 hace que 07:00 sea de hoy (con el de 15:00 sería de
    // mañana, futura).
    chk('la largada se ubica con el inicio corregido (05:00 → 07:00 se manda)', (await probar('05:00', '07:00')) === '' &&
      pedidas(S).at(-1)?.p_hora_inicio === '05:00' && pedidas(S).at(-1)?.p_hora_largada === '07:00', JSON.stringify(pedidas(S)))
    S.estado.planilla.turno.hora_fin = '17:00:00'
    chk('el turno no puede empezar a la hora en que termina', (await probar('17:00', '18:00')) === 'El turno no puede empezar y terminar a la misma hora.')
    S.estado.planilla.turno.hora_fin = null
    S.abrirTardeVentana()
    Object.assign(S.estado.tardeForm, { inicio: '15:00', largada: '17:53', motivo: 'Otro' })
    el(S, 'pr-tarde-ventana-otro').value = '  Se cortó el gas  '
    await S.confirmarTardeVentana(AHORA)
    chk('«Otro» manda lo escrito (sin espacios de más)', pedidas(S).at(-1)?.p_motivo === 'Se cortó el gas', JSON.stringify(pedidas(S).at(-1)))
    S.abrirTardeVentana()
    chk('en vivo, la misma hora lo avisa', (Object.assign(S.estado.tardeForm, { inicio: '15:00', largada: '15:00' }), S.pintarTardeVentana(), el(S, 'pr-tarde-ventana-demora').textContent) === 'Empezó a la hora del turno: no es un inicio tarde.')
    S.cerrarTardeVentana()
  }

  // ═══ CASO 7 · Sin hora de inicio en la planilla: la del horario ═════════
  {
    const { S } = armar({ turno: { ...TURNO, hora_inicio: null } })
    await S.abrirPlanilla('t6270')
    S.abrirTardeVentana()
    chk('sin hora_inicio en la planilla, precarga la del horario de la unidad (15:00)', S.estado.tardeForm.inicio === '15:00', JSON.stringify(S.estado.tardeForm))
    const { S: S2 } = armar({ turno: { ...TURNO, hora_inicio: null }, horarios: [] })
    await S2.abrirPlanilla('t6270')
    S2.abrirTardeVentana()
    chk('sin ninguna, empieza por la hora del turno, vacía', S2.estado.tardeForm.inicio === '' && S2.estado.tardeForm.campo === 'inicio')
  }

  // ═══ CASO 8 · La base dice que no: el mensaje tal cual ══════════════════
  {
    const { S, red } = armar()
    await S.abrirPlanilla('t6270')
    red.rechazo = 'La planilla está cerrada: solo quien configura producción puede corregirla.'
    S.abrirTardeVentana()
    teclas(S, ['1', '7', '5', '3'])
    S.motivoTardeVentana('Mantenimiento / arreglo')
    await S.confirmarTardeVentana(AHORA)
    chk('el rechazo de la base va tal cual y la ventana sigue abierta',
      el(S, 'pr-tarde-ventana-error').textContent === red.rechazo && el(S, 'pr-tarde-ventana').hidden === false && S.estado.tardeForm.enviando === false)
  }

  // ═══ CASO 9 · Sin internet: por la cola, y se ve en la planilla ═════════
  {
    const A = armar()
    const { S, red } = A
    await S.abrirPlanilla('t6270')
    A.sinRed()
    S.abrirTardeVentana()
    teclas(S, ['1', '7', '5', '3'])
    S.motivoTardeVentana('Falta de operario')
    await S.confirmarTardeVentana(AHORA)
    await tic()
    chk('sin red queda en la tablet y lo dice', S.__llamadas.exitos.some(m => /^Sin internet: quedó guardada en la tablet/.test(m)), S.__llamadas.exitos.join(' | '))
    const cola = (await S.colaPlanta().todos()).filter(x => x.operacion === 'registrar_inicio_tarde')
    chk('… en la cola con sus parámetros', cola.length === 1 && cola[0].params.p_hora_largada === '17:53' && cola[0].params.p_motivo === 'Falta de operario' && cola[0].grupo === 't6270', JSON.stringify(cola))
    chk('… y la planilla ya muestra el inicio tarde', el(S, 'pr-aviso-tarde-texto').textContent === 'Inicio tarde: 15:00 → 17:53 (2 h 53 min) · Falta de operario', el(S, 'pr-aviso-tarde-texto').textContent)
    A.sinRed(false)
    await S.procesarColaPlanta()
    chk('al volver la red se manda sola, una vez', red.cargas.length === 1 && red.cargas[0].p_hora_inicio === '15:00', JSON.stringify(red.cargas))
  }
})())

fin()
