// PARÓ Y TERMINÓ DE PRODUCIR (05/10/2026): las tres acciones de la planilla.
//
// Pedido de Facu: en la planilla las paradas eran confusas (varios botones que
// hacían lo mismo), la hora en que se abre la planilla no es la hora en que se
// empieza a producir, y el "se apagó el fuego ± 5 minutos" no servía. Quedan
// TRES acciones: "Empezó a producir", "Paró" (un solo formulario) y "Terminó
// de producir" (en el cierre). Las horas se escriben con la ventana de la
// hora (el teclado de la planta).
//
// Contrato con la base (pg_get_functiondef, 05/10/2026):
//  - registrar_hora_largada(p_turno_id, p_hora time): guarda hora_largada. No
//    acepta una hora futura (+5 min) con la planilla sin cerrar.
//  - registrar_parada(p_turno_id, p_motivo, p_inicio, p_fin) → { parada_id }:
//    p_fin null = sigue parada (y no deja dos abiertas). El trigger engancha el
//    motivo por su nombre ("Limpieza de planchas", "Otro motivo: …").
//  - editar_parada(p_parada_id, p_motivo, p_inicio, p_fin): para terminar la
//    que sigue a una hora dada ("Volvió a las HH:MM").
//  - relanzar_con_lote_nuevo(p_parada_id, p_hora) → { lote_viejo, turno_id,
//    lote }: SOLO sobre una parada ABIERTA y con el turno abierto: la termina,
//    deja el lote viejo pendiente de completar y abre otro.
//  - cerrar_turno(p_turno_id, p_hora_apagado, p_scrap_kg, p_observaciones,
//    p_productos, p_hora_fin, p_motivo_cierre): p_hora_apagado es "terminó de
//    producir". Si es más de 20 minutos antes del fin del turno y ninguna
//    parada cubre el hueco (empieza a más tardar 10 minutos después y llega
//    hasta 10 minutos antes del fin), crea la parada de cierre anticipado con
//    p_motivo_cierre (el NOMBRE de un motivo).
//  - motivos_parada: categorías programada (limpiezas), falla, organizativa y
//    otro.
//
//   node pruebas/test-produccion-paradas-simple.js
//   ARCHIVO_TEST=<copia de modulos/produccion.html>  ARCHIVO_GESTION=<copia de la gestión>

process.env.TZ = 'UTC'
const path = require('path')
const { arnes, leer, marca, chequearMarcas } = require('./circuito-comun')
const { construirProduccion, GESTION } = require('./sandbox-produccion')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/produccion.html')
const ARCHIVO_G = process.env.ARCHIVO_GESTION || GESTION
const FUENTE = leer(ARCHIVO)
const FUENTE_G = leer(ARCHIVO_G)
const { chk, esperas, fin } = arnes()

// Los motivos como en la base (05/10/2026), desordenados a propósito.
const MOTIVOS = [
  { id: 'mo-otro', nombre: 'Otro motivo', categoria: 'otro', pide_detalle: true, orden: 99 },
  { id: 'mo-pedido', nombre: 'No hay pedido', categoria: 'organizativa', pide_detalle: false, orden: 22 },
  { id: 'mo-cadena', nombre: 'Corte de cadena', categoria: 'falla', pide_detalle: false, orden: 10 },
  { id: 'mo-limp', nombre: 'Limpieza de planchas', categoria: 'programada', pide_detalle: false, orden: 1 },
  { id: 'mo-personal', nombre: 'Se retiró personal', categoria: 'organizativa', pide_detalle: false, orden: 20 },
  { id: 'mo-tachos', nombre: 'Limpieza de tachos', categoria: 'programada', pide_detalle: false, orden: 2 },
  { id: 'mo-luz', nombre: 'Corte de luz', categoria: 'falla', pide_detalle: false, orden: 13 },
]
// El 05/10/2026 a las 17:00 de Argentina (20:00 UTC).
const AHORA = new Date('2026-10-05T20:00:00Z')
const TURNO = {
  id: 't1', lote: 7040, maquina_id: 'm1', fecha: '2026-10-05', turno: 'Mañana', encargado_id: 'e-fede',
  abierto_en: '2026-10-05T09:02:00Z', estado: 'abierto', forzado_por: null, forzado_en: null, forzado_motivo: null,
  hora_inicio: '06:00:00', hora_fin: null, hora_largada: null,
}
const HORARIOS = [{ turno: 'Mañana', hora_inicio: '06:00:00', hora_fin: '15:00:00', activo: true }]
const ITEMS = [{ id: 'it-1', orden: 1, sublote: '7040-1', presentacion_id: 'pr-x', marca_id: null, cajas: 10, unidades_por_caja: 100, unidades: 1000, anulado: false }]

// Una base chica con estado: las RPCs cambian lo que la planilla vuelve a leer.
function armar({ turno = TURNO, paradas = [], motivos = MOTIVOS, horarios = HORARIOS, items = ITEMS, rpc = null } = {}) {
  const S = construirProduccion(ARCHIVO)
  const db = { turno: { ...turno }, paradas: paradas.map(p => ({ ...p })), nuevo: null }
  S.db = db
  Object.assign(S.__tablas, {
    turnos_produccion: filtros => {
      if (filtros.some(f => f[1] === 'estado' && f[2] === 'pendiente_completar')) return { data: [], error: null }
      const id = filtros.find(f => f[0] === 'eq' && f[1] === 'id')?.[2]
      if (id && db.nuevo && id === db.nuevo.id) return { data: [db.nuevo], error: null }
      return { data: [db.turno], error: null }
    },
    turno_operarios: [], masas: [], produccion_items: items,
    paradas_produccion: filtros => {
      const id = filtros.find(f => f[0] === 'eq' && f[1] === 'turno_id')?.[2]
      return { data: db.paradas.filter(p => !id || (p.turno_id ?? 't1') === id), error: null }
    },
    maquinas: [{ id: 'm1', nombre: 'Máquina 1', orden: 1 }],
    motivos_parada: motivos,
    horarios_turno: horarios,
  })
  S.__setRpc(rpc ?? (async (n, p) => {
    if (n === 'registrar_hora_largada') { db.turno.hora_largada = p.p_hora + ':00'; return { data: null, error: null } }
    if (n === 'registrar_parada') {
      const id = 'pa-' + (db.paradas.length + 1)
      db.paradas.push({ id, turno_id: p.p_turno_id, inicio: p.p_inicio, fin: p.p_fin, motivo: p.p_motivo, categoria: null })
      return { data: { parada_id: id }, error: null }
    }
    if (n === 'editar_parada') { const x = db.paradas.find(y => y.id === p.p_parada_id); if (x) x.fin = p.p_fin; return { data: null, error: null } }
    if (n === 'relanzar_con_lote_nuevo') {
      const x = db.paradas.find(y => y.id === p.p_parada_id); if (x) x.fin = p.p_hora
      db.turno.estado = 'pendiente_completar'
      db.nuevo = { ...TURNO, id: 't2', lote: 7041 }
      return { data: { lote_viejo: 7040, turno_id: 't2', lote: 7041 }, error: null }
    }
    if (n === 'cerrar_turno') return { data: { lote: 7040, sublotes: [], cierre_anticipado: !!p.p_motivo_cierre }, error: null }
    return { data: null, error: null }
  }))
  S.estado.modo = 'produccion'
  S.estado.persona = { id: 'e-fede', nombre: 'Federico Silva' }
  S.estado.personal = [{ id: 'e-fede', nombre: 'Federico Silva', puestos: ['encargado'] }]
  S.estado.tablero = [{ maquina: { id: 'm1', nombre: 'Máquina 1' }, turno: { id: 't1' } }]
  return S
}
const el = (S, id) => S.__doc.getElementById(id)
const html = (S, id) => el(S, id).innerHTML
const rpcs = (S, n) => S.__llamadas.rpc.filter(([x]) => x === n)
const tic = () => new Promise(r => setImmediate(r))
// Escribe una hora en la ventana (con el teclado de la planta) y toca Listo.
async function escribirHora(S, tipo, numeros, ahora = AHORA) {
  S.abrirHoraVentana(tipo, ahora)
  for (const d of numeros) S.teclaHoraVentana(d)
  await S.confirmarHoraVentana(ahora)
  await tic()
}

// ── Fuente ─────────────────────────────────────────────────────────────
chk('las tres acciones en la planilla: Empezó a producir, Paró y Terminó de producir',
  /id="pr-btn-largada"/.test(FUENTE) && /class="pr-acc pr-acc--paro" id="pr-planilla-paradas-resumen"/.test(FUENTE) && /id="pr-btn-termino"/.test(FUENTE))
chk('el aviso suave "¿A qué hora empezó a producir?"', /id="pr-aviso-largada" hidden>¿A qué hora empezó a producir\?/.test(FUENTE))
chk('se fueron "Paró ahora", la limpieza en dos momentos, el reloj de ruedas, "cuánto duró", "La máquina se rompió" y el ± 5',
  !/id="pr-btn-parada"/.test(FUENTE) && !/registrar_limpieza_planchas/.test(FUENTE) && !/data-rueda-set/.test(FUENTE) &&
  !/data-duracion=/.test(FUENTE) && !/pr-cierre-rota/.test(FUENTE) && !/data-hora-paso="5"/.test(FUENTE) && !/iniciar_parada/.test(FUENTE))
chk('la ventana de la hora: un diálogo con el teclado de la planta, nunca un input de hora',
  /id="pr-hora-ventana" hidden role="dialog" aria-modal="true"/.test(FUENTE) && !/type="time"/.test(FUENTE))
chk('"¿A qué hora terminó de producir?" en el cierre, como botón (mismo id)', /<button type="button" id="pr-cierre-hora"/.test(FUENTE) &&
  /¿A QUÉ HORA TERMINÓ DE PRODUCIR\?/.test(FUENTE) && /id="pr-cierre-campo-motivo" hidden/.test(FUENTE))
chk('la planilla lee la hora de largada, el horario de la planilla y el de la unidad',
  /hora_inicio, hora_fin, hora_largada'\)\s*\n?\s*\.eq\('id', turnoId\)/.test(FUENTE) && /from\('horarios_turno'\)\.select\('turno, hora_inicio, hora_fin, activo'\)/.test(FUENTE))

esperas.push((async () => {
  // ═══ CASO 1 · "Empezó a producir 06:40" y verlo en la planilla ═══════════
  {
    const S = armar()
    await S.abrirPlanilla('t1')
    chk('sin hora de largada: "— (cargar hora)" y el aviso suave arriba',
      /EMPEZÓ A PRODUCIR<\/span><span class="pr-acc__dato">— \(cargar hora\)</.test(html(S, 'pr-btn-largada')) && el(S, 'pr-aviso-largada').hidden === false,
      html(S, 'pr-btn-largada'))
    S.abrirHoraVentana('largada', AHORA)
    chk('la ventana pregunta "¿A qué hora empezó a producir?" con la hora de ahora sugerida',
      el(S, 'pr-hora-ventana').hidden === false && el(S, 'pr-hora-ventana-titulo').textContent === '¿A qué hora empezó a producir?' &&
      S.estado.horaForm.hora === '17:00' && /17:00/.test(html(S, 'pr-hora-ventana-hora')), S.estado.horaForm?.hora)
    S.cerrarHoraVentana()
    await escribirHora(S, 'largada', ['0', '6', '4', '0'])
    chk('Guardar → registrar_hora_largada con el turno y 06:40',
      JSON.stringify(rpcs(S, 'registrar_hora_largada')[0]?.[1]) === '{"p_turno_id":"t1","p_hora":"06:40"}', JSON.stringify(rpcs(S, 'registrar_hora_largada')))
    chk('… la ventana se cierra', el(S, 'pr-hora-ventana').hidden === true)
    chk('… y la planilla dice "Empezó a producir: 06:40"', /EMPEZÓ A PRODUCIR<\/span><span class="pr-acc__dato">06:40</.test(html(S, 'pr-btn-largada')), html(S, 'pr-btn-largada'))
    chk('… sin el aviso suave', el(S, 'pr-aviso-largada').hidden === true)
    S.abrirHoraVentana('largada', AHORA)
    chk('se puede corregir: la ventana vuelve con 06:40', S.estado.horaForm.hora === '06:40')
    S.cerrarHoraVentana()
    // Una hora que todavía no pasó no se manda (la base la rechaza igual).
    const F = armar()
    await F.abrirPlanilla('t1')
    await escribirHora(F, 'largada', ['1', '8', '3', '0'])
    chk('una hora futura no se manda y se dice', rpcs(F, 'registrar_hora_largada').length === 0 &&
      /18:30 todavía no pasaron/.test(el(F, 'pr-hora-ventana-error').textContent) && el(F, 'pr-hora-ventana-error').hidden === false,
      el(F, 'pr-hora-ventana-error').textContent)
    // El error de la base, tal cual, en la ventana.
    const E = armar({ rpc: async () => ({ data: null, error: { message: 'La planilla está cerrada: solo quien configura producción puede corregirla.' } }) })
    await E.abrirPlanilla('t1')
    await escribirHora(E, 'largada', ['0', '6', '4', '0'])
    chk('el error de la base, TAL CUAL, y la ventana sigue abierta', el(E, 'pr-hora-ventana-error').textContent === 'La planilla está cerrada: solo quien configura producción puede corregirla.' &&
      el(E, 'pr-hora-ventana').hidden === false && E.estado.horaForm?.enviando === false)
    // "Ahora" con la planilla abierta; nada de "Ahora" en una pendiente.
    E.ahoraHoraVentana(AHORA)
    chk('"Ahora" pone la hora de ahora', E.estado.horaForm.hora === '17:00' && E.estado.horaForm.ahora === true)
    const P = armar({ turno: { ...TURNO, estado: 'pendiente_completar', forzado_por: 'e-fede', forzado_motivo: 'nadie', forzado_en: '2026-10-05T18:00:00Z' } })
    await P.abrirPlanilla('t1')
    P.abrirHoraVentana('largada', AHORA)
    chk('en una pendiente de completar no se ofrece "Ahora"', !/data-hv-ahora/.test(html(P, 'pr-hora-ventana-hora')))
    chk('… y la hora sugerida es la de referencia (el cierre forzado), no la de ahora', P.estado.horaForm.hora === '15:00', P.estado.horaForm.hora)
  }

  // ═══ La largada igual a la hora de inicio (05/10/2026) ═══════════════════
  // registrar_hora_largada pasa la hora al día siguiente SOLO si cae más de
  // 2 h antes del inicio del turno: una largada a las 06:00 en un turno de
  // 06:00 es de ese mismo día (antes la pantalla la tomaba como de mañana y
  // la rechazaba por "futura").
  {
    const X = armar()
    const DIA_MS = 86400000
    const dia = (h) => X.instanteAr('2026-10-05', h)
    const T6 = { fecha: '2026-10-05', hora_inicio: '06:00:00' }
    chk('instanteLargada: 06:00 en un turno de 06:00 es del mismo día', X.instanteLargada(T6, '06:00') === dia('06:00'))
    chk('… 04:00 (2 h justas antes) también', X.instanteLargada(T6, '04:00') === dia('04:00'))
    chk('… 03:59 (más de 2 h antes) pasa al día siguiente', X.instanteLargada(T6, '03:59') === dia('03:59') + DIA_MS)
    chk('… 05:30 y 14:00, del mismo día', X.instanteLargada(T6, '05:30') === dia('05:30') && X.instanteLargada(T6, '14:00') === dia('14:00'))
    const T22 = { fecha: '2026-10-05', hora_inicio: '22:00:00' }
    chk('turno de noche de 22:00: 22:00 y 23:30 del mismo día, 01:00 del siguiente',
      X.instanteLargada(T22, '22:00') === dia('22:00') && X.instanteLargada(T22, '23:30') === dia('23:30') && X.instanteLargada(T22, '01:00') === dia('01:00') + DIA_MS)
    chk('sin hora de inicio: la regla mira la hora en que se abrió (06:02)',
      X.instanteLargada({ fecha: '2026-10-05', hora_inicio: null, abierto_en: '2026-10-05T09:02:00Z' }, '06:00') === dia('06:00') &&
      X.instanteLargada({ fecha: '2026-10-05', hora_inicio: null, abierto_en: '2026-10-05T09:02:00Z' }, '04:01') === dia('04:01') + DIA_MS)
    chk('sin fecha o con una hora rara: null', X.instanteLargada({ hora_inicio: '06:00:00' }, '06:00') === null && X.instanteLargada(T6, '25:00') === null)
    // En la ventana: a las 07:00 de Argentina se carga 06:00 y se manda.
    const SIETE = new Date('2026-10-05T10:00:00Z')
    const S = armar()
    await S.abrirPlanilla('t1')
    await escribirHora(S, 'largada', ['0', '6', '0', '0'], SIETE)
    chk('a las 07:00, "Empezó a producir 06:00" en un turno de 06:00 se manda',
      JSON.stringify(rpcs(S, 'registrar_hora_largada')[0]?.[1]) === '{"p_turno_id":"t1","p_hora":"06:00"}' && el(S, 'pr-hora-ventana').hidden === true,
      el(S, 'pr-hora-ventana-error').textContent)
    // Y una de más de 2 h antes, a las 07:00, es de mañana: futura, no se manda.
    const M = armar()
    await M.abrirPlanilla('t1')
    await escribirHora(M, 'largada', ['0', '3', '3', '0'], SIETE)
    chk('… 03:30 (más de 2 h antes) es de mañana: futura, no se manda', rpcs(M, 'registrar_hora_largada').length === 0 &&
      /03:30 todavía no pasaron/.test(el(M, 'pr-hora-ventana-error').textContent))
  }

  // ═══ La ventana de la hora: el teclado ═══════════════════════════════════
  {
    const S = armar()
    await S.abrirPlanilla('t1')
    S.abrirHoraVentana('desde', AHORA)
    S.teclaHoraVentana('6'); S.teclaHoraVentana('4'); S.teclaHoraVentana('0')
    chk('"640" es 06:40', S.estado.horaForm.hora === '06:40' && S.muestraHoraVentana(S.estado.horaForm) === '64:0·')
    S.teclaHoraVentana('borrar')
    chk('⌫ borra el último número', S.estado.horaForm.buffer === '64')
    S.teclaHoraVentana('limpiar')
    chk('"Borrar" lo borra todo', S.estado.horaForm.buffer === '')
    S.teclaHoraVentana('9'); S.teclaHoraVentana('9')
    await S.confirmarHoraVentana(AHORA)
    chk('una hora a medio escribir no se toma', /Esa hora no existe/.test(el(S, 'pr-hora-ventana-error').textContent) && S.estado.paradaNueva?.inicio !== '99')
    S.teclaHoraVentana('limpiar'); for (const d of '2560') S.teclaHoraVentana(d)
    await S.confirmarHoraVentana(AHORA)
    chk('"2560" no es una hora', /Esa hora no existe/.test(el(S, 'pr-hora-ventana-error').textContent))
    chk('cinco números no entran', (() => { S.teclaHoraVentana('limpiar'); for (const d of '12345') S.teclaHoraVentana(d); return S.estado.horaForm.buffer === '1234' })())
    S.cerrarHoraVentana()
    chk('Escape cierra la ventana', (() => { S.abrirHoraVentana('desde', AHORA); S.teclaVentanaHora({ key: 'Escape', preventDefault() {} }); return el(S, 'pr-hora-ventana').hidden === true && S.estado.horaForm === null })())
  }

  // ═══ Los motivos, agrupados ════════════════════════════════════════════
  {
    const S = armar()
    await S.abrirPlanilla('t1', 'pr-paradas')
    await S.asegurarMotivosParada()
    S.pintarParadas()
    const h = html(S, 'pr-parada-sugerencias')
    const grupos = [...h.matchAll(/pr-pa-grupo__titulo">([^<]+)</g)].map(m => m[1])
    chk('cuatro grupos, en este orden: Limpiezas, Fallas, Organización, Otro', JSON.stringify(grupos) === '["Limpiezas","Fallas","Organización","Otro"]', grupos.join(','))
    const ids = [...h.matchAll(/data-motivo="([^"]+)"/g)].map(m => m[1])
    chk('adentro de cada grupo, en el orden de la base', JSON.stringify(ids) ===
      '["mo-limp","mo-tachos","mo-cadena","mo-luz","mo-personal","mo-pedido","mo-otro"]', ids.join(','))
    chk('ninguno elegido de antemano', !/aria-pressed="true"/.test(h))
    chk('una categoría desconocida va a Otro', JSON.stringify(S.motivosAgrupados([{ id: 'x', nombre: 'X', categoria: 'rara' }]).map(g => g.clave)) === '["otro"]')
    chk('los motivos se leen de la base, activos y por orden',
      /from\('motivos_parada'\)\s*\n?\s*\.select\('id, nombre, categoria, pide_detalle, orden'\)\.eq\('activo', true\)\.order\('orden'\)/.test(FUENTE))
    // "Otro motivo" pide el detalle; las demás lo dejan opcional.
    S.elegirMotivoParada('mo-otro')
    chk('"Otro motivo" abre el detalle, obligatorio', el(S, 'pr-parada-otro').hidden === false && el(S, 'pr-parada-motivo').placeholder === '¿Qué pasó? (obligatorio)')
    S.elegirMotivoParada('mo-personal')
    chk('una organizativa: detalle opcional', el(S, 'pr-parada-motivo').placeholder === 'Detalle (opcional)')
  }

  // ═══ CASO 2 · Una parada de 15:00 a 16:00 con motivo ═══════════════════
  {
    const S = armar()
    await S.abrirPlanilla('t1', 'pr-paradas')
    await S.asegurarMotivosParada()
    S.pintarParadas()
    chk('las horas arrancan sin poner', /DESDE<\/span><span class="pr-pa-hora__vacia">Tocá para poner la hora/.test(html(S, 'pr-parada-hora')) &&
      /HASTA<\/span><span class="pr-pa-hora__vacia">/.test(html(S, 'pr-parada-hora')), html(S, 'pr-parada-hora'))
    await S.guardarParadaNueva(AHORA)
    chk('sin motivo ni horas: no se manda, y se dice', rpcs(S, 'registrar_parada').length === 0 && el(S, 'pr-parada-error').textContent === 'Elegí por qué paró.')
    chk('… el botón NO queda trabado', el(S, 'pr-btn-guardar-parada').disabled === false)
    S.elegirMotivoParada('mo-limp')
    await S.guardarParadaNueva(AHORA)
    chk('sin DESDE: se pide', el(S, 'pr-parada-error').textContent === 'Poné desde qué hora estuvo parada.' && /pr-pa-hora--mal/.test(html(S, 'pr-parada-hora')))
    await escribirHora(S, 'desde', ['1', '5', '0', '0'])
    await S.guardarParadaNueva(AHORA)
    chk('sin HASTA: se pide (o "Todavía está parada")', el(S, 'pr-parada-error').textContent === 'Poné hasta qué hora estuvo parada, o «Todavía está parada».')
    await escribirHora(S, 'hasta', ['1', '6', '0', '0'])
    chk('DESDE 15:00 y HASTA 16:00 a la vista', /DESDE<\/span><span class="pr-pa-hora__num">15:00/.test(html(S, 'pr-parada-hora')) &&
      /HASTA<\/span><span class="pr-pa-hora__num">16:00/.test(html(S, 'pr-parada-hora')))
    chk('el resumen antes de guardar', el(S, 'pr-parada-resumen').textContent === 'Limpieza de planchas · de 15:00 a 16:00 (1 h)' ||
      S.resumenParadaNueva(S.estado.paradaNueva, S.estado.planilla, AHORA) === 'Limpieza de planchas · de 15:00 a 16:00 (1 h)',
      S.resumenParadaNueva(S.estado.paradaNueva, S.estado.planilla, AHORA))
    await S.guardarParadaNueva(AHORA)
    chk('registrar_parada con el motivo y las dos horas',
      JSON.stringify(rpcs(S, 'registrar_parada')[0]?.[1]) ===
      '{"p_turno_id":"t1","p_motivo":"Limpieza de planchas","p_inicio":"2026-10-05T15:00:00-03:00","p_fin":"2026-10-05T16:00:00-03:00"}',
      JSON.stringify(rpcs(S, 'registrar_parada')[0]?.[1]))
    chk('… no se llama a relanzar', rpcs(S, 'relanzar_con_lote_nuevo').length === 0)
    chk('… el formulario vuelve a empezar', S.estado.paradaNueva.motivoId === null && S.estado.paradaNueva.inicio === '' && S.estado.paradaNueva.fin === '')
    chk('… y en la lista: "15:00 a 16:00 · 1 h · Limpieza de planchas", tocable para corregir',
      /data-parada-editar="pa-1"><span class="pr-parada-item__cab"><span class="pr-parada-item__horas">15:00 a 16:00 · 1 h · <span class="pr-parada-item__que">Limpieza de planchas<\/span>/.test(html(S, 'pr-planilla-paradas')),
      html(S, 'pr-planilla-paradas'))
    chk('… y la acción Paró lo cuenta', /1 parada · 1 h 00 min/.test(html(S, 'pr-planilla-paradas-resumen')), html(S, 'pr-planilla-paradas-resumen'))
    // Con detalle: "Otro motivo: …".
    const D = armar()
    await D.abrirPlanilla('t1', 'pr-paradas')
    await D.asegurarMotivosParada()
    D.elegirMotivoParada('mo-otro')
    await escribirHora(D, 'desde', ['1', '0', '0', '0'])
    await escribirHora(D, 'hasta', ['1', '0', '2', '0'])
    await D.guardarParadaNueva(AHORA)
    chk('"Otro motivo" sin detalle no se manda', rpcs(D, 'registrar_parada').length === 0 && el(D, 'pr-parada-error').textContent === 'Escribí qué pasó.')
    el(D, 'pr-parada-motivo').value = '  Se cortó el gas  '
    await D.guardarParadaNueva(AHORA)
    chk('… con detalle: "Otro motivo: Se cortó el gas"', rpcs(D, 'registrar_parada')[0]?.[1]?.p_motivo === 'Otro motivo: Se cortó el gas')
    // HASTA antes de DESDE (y no cruza la medianoche): se dice.
    const X = armar()
    await X.abrirPlanilla('t1', 'pr-paradas')
    await X.asegurarMotivosParada()
    X.elegirMotivoParada('mo-luz')
    await escribirHora(X, 'desde', ['1', '6', '0', '0'])
    await escribirHora(X, 'hasta', ['1', '5', '0', '0'])
    await X.guardarParadaNueva(AHORA)
    chk('HASTA antes que DESDE: no se manda y se dice', rpcs(X, 'registrar_parada').length === 0 &&
      /después de la de parada/.test(el(X, 'pr-parada-error').textContent), el(X, 'pr-parada-error').textContent)
    // El error de la base, tal cual.
    const B = armar({ rpc: async () => ({ data: null, error: { message: 'La parada no puede ser anterior a la apertura del turno.' } }) })
    await B.abrirPlanilla('t1', 'pr-paradas')
    await B.asegurarMotivosParada()
    B.elegirMotivoParada('mo-luz')
    await escribirHora(B, 'desde', ['1', '0', '0', '0'])
    await escribirHora(B, 'hasta', ['1', '0', '1', '0'])
    await B.guardarParadaNueva(AHORA)
    chk('el error de la base, TAL CUAL', el(B, 'pr-parada-error').textContent === 'La parada no puede ser anterior a la apertura del turno.' && B.estado.paradaNueva.enviando === false)
  }

  // ═══ CASO 3 · Una parada que sigue, y "Volvió a las…" ══════════════════
  {
    const S = armar()
    await S.abrirPlanilla('t1', 'pr-paradas')
    await S.asegurarMotivosParada()
    S.elegirMotivoParada('mo-cadena')
    await escribirHora(S, 'desde', ['1', '5', '3', '0'])
    await escribirHora(S, 'hasta', ['1', '6', '0', '0'])
    S.alternarSigueParadaNueva()
    chk('"Todavía está parada" saca HASTA (y lo borra)', !/data-parada-hora="fin"/.test(html(S, 'pr-parada-hora')) && /data-parada-sigue="1" aria-pressed="true"/.test(html(S, 'pr-parada-hora')) &&
      S.estado.paradaNueva.fin === '')
    chk('… y el resumen dice que sigue', S.resumenParadaNueva(S.estado.paradaNueva, S.estado.planilla, AHORA) === 'Corte de cadena · desde las 15:30, todavía parada')
    await S.guardarParadaNueva(AHORA)
    chk('registrar_parada con p_fin null, a la hora que paró', JSON.stringify(rpcs(S, 'registrar_parada')[0]?.[1]) ===
      '{"p_turno_id":"t1","p_motivo":"Corte de cadena","p_inicio":"2026-10-05T15:30:00-03:00","p_fin":null}', JSON.stringify(rpcs(S, 'registrar_parada')[0]?.[1]))
    chk('… arriba: PARADA, el motivo y "Volvió a las…"', el(S, 'pr-parada-activa').hidden === false && el(S, 'pr-btn-reanudar').hidden === false &&
      el(S, 'pr-parada-activa-texto').textContent === ' · desde las 15:30')
    chk('… la acción Paró de la planilla también lo dice', /PARADA desde las 15:30<\/span><span class="pr-acc__sub">Corte de cadena/.test(html(S, 'pr-planilla-paradas-resumen')))
    chk('… y "Todavía está parada" se apaga para otra (la base no deja dos)', /data-parada-sigue="1" aria-pressed="false" disabled>/.test(html(S, 'pr-parada-hora')))
    S.abrirHoraVentana('volvio', AHORA)
    chk('"Volvió a las…": la ventana con la hora de ahora y la parada', el(S, 'pr-hora-ventana-titulo').textContent === '¿A qué hora volvió?' &&
      S.estado.horaForm.hora === '17:00' && /Corte de cadena/.test(el(S, 'pr-hora-ventana-nota').textContent) && /data-hv-lote-nuevo/.test(html(S, 'pr-hora-ventana-hora')))
    for (const d of '1620') S.teclaHoraVentana(d)
    await S.confirmarHoraVentana(AHORA)
    await tic()
    chk('… termina con editar_parada a las 16:20, con su motivo y su hora de parada',
      JSON.stringify(rpcs(S, 'editar_parada')[0]?.[1]) ===
      '{"p_parada_id":"pa-1","p_motivo":"Corte de cadena","p_inicio":"2026-10-05T15:30:00-03:00","p_fin":"2026-10-05T16:20:00-03:00"}',
      JSON.stringify(rpcs(S, 'editar_parada')[0]?.[1]))
    chk('… y la máquina vuelve a estar andando', el(S, 'pr-parada-activa').hidden === true && /15:30 a 16:20 · 50 min/.test(html(S, 'pr-planilla-paradas')))
    // Una vuelta que todavía no pasó, o antes de la parada.
    const F = armar({ paradas: [{ id: 'pa-9', inicio: '2026-10-05T15:30:00-03:00', fin: null, motivo: 'Corte de luz', categoria: 'falla' }] })
    await F.abrirPlanilla('t1', 'pr-paradas')
    await escribirHora(F, 'volvio', ['1', '8', '0', '0'])
    chk('una vuelta futura no se manda', rpcs(F, 'editar_parada').length === 0 && /18:00 todavía no pasaron/.test(el(F, 'pr-hora-ventana-error').textContent))
    F.cerrarHoraVentana()
    await escribirHora(F, 'volvio', ['1', '5', '0', '0'])
    chk('una vuelta antes de la parada no se manda', rpcs(F, 'editar_parada').length === 0 && /después de la parada \(paró a las 15:30\)/.test(el(F, 'pr-hora-ventana-error').textContent),
      el(F, 'pr-hora-ventana-error').textContent)
  }

  // ═══ "Volvió con lote nuevo" ═══════════════════════════════════════════
  {
    // Desde el formulario: con HASTA cargado, la casilla.
    const S = armar()
    await S.abrirPlanilla('t1', 'pr-paradas')
    await S.asegurarMotivosParada()
    S.elegirMotivoParada('mo-cadena')
    await escribirHora(S, 'desde', ['1', '5', '0', '0'])
    chk('sin HASTA no se ofrece "Volvió con lote nuevo"', !/data-parada-lote-nuevo/.test(html(S, 'pr-parada-hora')))
    await escribirHora(S, 'hasta', ['1', '6', '0', '0'])
    chk('con HASTA: la casilla "Volvió con lote nuevo"', /data-parada-lote-nuevo="1" aria-pressed="false"/.test(html(S, 'pr-parada-hora')))
    S.alternarLoteNuevoParada()
    chk('… marcada, dice qué pasa con el lote', /El lote 7040 queda para completar/.test(html(S, 'pr-parada-hora')))
    await S.guardarParadaNueva(AHORA)
    await tic()
    chk('la parada entra ABIERTA (relanzar solo termina una abierta)', rpcs(S, 'registrar_parada')[0]?.[1]?.p_fin === null)
    chk('… y relanzar_con_lote_nuevo la termina a la hora de HASTA', JSON.stringify(rpcs(S, 'relanzar_con_lote_nuevo')[0]?.[1]) ===
      '{"p_parada_id":"pa-1","p_hora":"2026-10-05T16:00:00-03:00"}', JSON.stringify(rpcs(S, 'relanzar_con_lote_nuevo')))
    chk('… se abre la planilla nueva con el aviso', S.estado.planilla?.turno?.id === 't2' &&
      /Lote 7040 queda para completar · Ahora la Máquina 1 sigue con el lote 7041/.test(html(S, 'pr-planilla-estado')), html(S, 'pr-planilla-estado'))
    // Si relanzar falla, la parada quedó guardada y se dice.
    const E = armar()
    const base = E.__llamadas
    E.__setRpc(async (n, p) => n === 'relanzar_con_lote_nuevo'
      ? { data: null, error: { message: 'El turno no está abierto.' } }
      : (n === 'registrar_parada' ? (E.db.paradas.push({ id: 'pa-1', turno_id: 't1', inicio: p.p_inicio, fin: null, motivo: p.p_motivo }), { data: { parada_id: 'pa-1' }, error: null }) : { data: null, error: null }))
    await E.abrirPlanilla('t1', 'pr-paradas')
    await E.asegurarMotivosParada()
    E.elegirMotivoParada('mo-cadena')
    await escribirHora(E, 'desde', ['1', '5', '0', '0'])
    await escribirHora(E, 'hasta', ['1', '6', '0', '0'])
    E.alternarLoteNuevoParada()
    await E.guardarParadaNueva(AHORA)
    chk('si relanzar falla: la parada quedó guardada y se dice, con el mensaje de la base',
      /La parada quedó guardada, pero no se pudo pasar al lote nuevo: El turno no está abierto\./.test(el(E, 'pr-parada-error').textContent) && base.rpc.length >= 2,
      el(E, 'pr-parada-error').textContent)
    // Desde "Volvió a las…": la casilla en la ventana.
    const V = armar({ paradas: [{ id: 'pa-7', inicio: '2026-10-05T15:30:00-03:00', fin: null, motivo: 'Corte de luz', categoria: 'falla' }] })
    await V.abrirPlanilla('t1', 'pr-paradas')
    V.abrirHoraVentana('volvio', AHORA)
    V.alternarLoteNuevoVentana()
    chk('en la ventana: "Volvió con lote nuevo" cambia el botón y la nota', el(V, 'pr-hora-ventana-guardar').textContent === 'Volvió con lote nuevo' &&
      /queda para completar/.test(el(V, 'pr-hora-ventana-nota').textContent))
    for (const d of '1610') V.teclaHoraVentana(d)
    await V.confirmarHoraVentana(AHORA)
    await tic()
    chk('… relanzar_con_lote_nuevo a las 16:10 (y no editar_parada)', JSON.stringify(rpcs(V, 'relanzar_con_lote_nuevo')[0]?.[1]) ===
      '{"p_parada_id":"pa-7","p_hora":"2026-10-05T16:10:00-03:00"}' && rpcs(V, 'editar_parada').length === 0, JSON.stringify(rpcs(V, 'relanzar_con_lote_nuevo')))
    // En una pendiente de completar no hay lote nuevo.
    const P = armar({ turno: { ...TURNO, estado: 'pendiente_completar', forzado_por: 'e', forzado_motivo: 'x', forzado_en: '2026-10-05T19:00:00Z' } })
    await P.abrirPlanilla('t1', 'pr-paradas')
    await P.asegurarMotivosParada()
    P.elegirMotivoParada('mo-cadena')
    await escribirHora(P, 'desde', ['1', '5', '0', '0'])
    await escribirHora(P, 'hasta', ['1', '6', '0', '0'])
    chk('en una pendiente de completar no se ofrece "Volvió con lote nuevo"', !/data-parada-lote-nuevo/.test(html(P, 'pr-parada-hora')))
  }

  // ═══ CASO 4 · Terminar a las 13:10 en un turno de 06 a 15: pide motivo ═══
  {
    const S = armar()
    await S.abrirPlanilla('t1')
    chk('la acción "Terminó de producir" dice hasta cuándo es el turno', /TERMINÓ DE PRODUCIR<\/span><span class="pr-acc__dato">Cerrar la planilla<\/span><span class="pr-acc__sub">El turno es hasta las 15:00/.test(html(S, 'pr-btn-termino')),
      html(S, 'pr-btn-termino'))
    await S.mostrarCierre()
    chk('"¿A qué hora terminó de producir?" arranca sin hora', S.estado.cierre.hora === '' && el(S, 'pr-cierre-hora').textContent === 'Tocá para poner la hora')
    S.abrirHoraVentana('termino', AHORA)
    chk('la ventana: "¿A qué hora terminó de producir?", sin ± 5', el(S, 'pr-hora-ventana-titulo').textContent === '¿A qué hora terminó de producir?' && !/data-hv-paso/.test(html(S, 'pr-hora-ventana-hora')))
    for (const d of '1310') S.teclaHoraVentana(d)
    await S.confirmarHoraVentana(AHORA)
    chk('13:10 en el cierre', S.estado.cierre.hora === '13:10' && el(S, 'pr-cierre-hora').textContent === '13:10')
    chk('… pregunta "¿Por qué paró antes?"', el(S, 'pr-cierre-campo-motivo').hidden === false &&
      /Terminó a las 13:10 y el turno es hasta las 15:00: 1 h 50 antes/.test(el(S, 'pr-cierre-motivo-nota').textContent), el(S, 'pr-cierre-motivo-nota').textContent)
    chk('… con la misma lista de motivos, agrupada', /data-cierre-motivo="mo-personal"/.test(html(S, 'pr-cierre-motivos')) && /pr-pa-grupo__titulo">Organización</.test(html(S, 'pr-cierre-motivos')),
      html(S, 'pr-cierre-motivos').slice(0, 300))
    S.ponerNumero(el(S, 'pr-cierre-scrap'), 0)
    S.cambioEnCierre()
    S.intentarCerrar()
    await tic()
    chk('sin motivo no se manda, y se dice', rpcs(S, 'cerrar_turno').length === 0 && /Falta por qué paró antes\./.test(el(S, 'pr-cierre-error').textContent) &&
      /pr-campo--mal/.test(el(S, 'pr-cierre-campo-motivo').className))
    S.elegirMotivoCierre('mo-personal')
    chk('el motivo elegido se marca', /data-cierre-motivo="mo-personal" aria-pressed="true"/.test(html(S, 'pr-cierre-motivos')))
    S.intentarCerrar()
    await tic()
    chk('cerrar_turno con TODOS los parámetros y el motivo de cierre anticipado',
      JSON.stringify(rpcs(S, 'cerrar_turno')[0]?.[1]) ===
      '{"p_turno_id":"t1","p_hora_apagado":"13:10","p_scrap_kg":0,"p_observaciones":null,"p_productos":[],"p_hora_fin":null,"p_motivo_cierre":"Se retiró personal"}',
      JSON.stringify(rpcs(S, 'cerrar_turno')[0]?.[1]))
    // "Otro motivo" pide el detalle y va como "Otro motivo: …".
    const O = armar()
    await O.abrirPlanilla('t1')
    await O.mostrarCierre()
    O.ponerHoraCierre('13:10')
    O.ponerNumero(el(O, 'pr-cierre-scrap'), 0)
    O.cambioEnCierre()
    O.elegirMotivoCierre('mo-otro')
    chk('"Otro motivo": el detalle aparece, obligatorio', el(O, 'pr-cierre-motivo-detalle').hidden === false && el(O, 'pr-cierre-motivo-detalle').placeholder === '¿Qué pasó? (obligatorio)')
    O.intentarCerrar()
    await tic()
    chk('… sin detalle no se manda', rpcs(O, 'cerrar_turno').length === 0 && /Contá por qué paró antes/.test(el(O, 'pr-cierre-error').textContent))
    el(O, 'pr-cierre-motivo-detalle').value = 'Se terminó la harina'
    O.cambioEnCierre()
    chk('el borrador del cierre guarda el motivo elegido y su detalle', (() => {
      const b = JSON.parse(O.localStorage.getItem('produccion.cierre.t1') || '{}')
      return b.motivoId === 'mo-otro' && b.motivoDetalle === 'Se terminó la harina' && b.hora === '13:10'
    })())
    O.intentarCerrar()
    await tic()
    chk('… con detalle: "Otro motivo: Se terminó la harina"', rpcs(O, 'cerrar_turno')[0]?.[1]?.p_motivo_cierre === 'Otro motivo: Se terminó la harina')
  }

  // ═══ CASO 5 · Terminar a las 14:50: no pide nada ════════════════════════
  {
    const S = armar()
    await S.abrirPlanilla('t1')
    await S.mostrarCierre()
    await escribirHora(S, 'termino', ['1', '4', '5', '0'])
    chk('14:50 (10 minutos antes del fin): no pregunta', el(S, 'pr-cierre-campo-motivo').hidden === true)
    S.ponerNumero(el(S, 'pr-cierre-scrap'), 1.5)
    S.cambioEnCierre()
    const p = S.estado.planilla
    S.intentarCerrar()
    await tic()
    chk('… y cerrar_turno va con p_motivo_cierre null y p_hora_fin null', JSON.stringify(rpcs(S, 'cerrar_turno')[0]?.[1]) ===
      '{"p_turno_id":"t1","p_hora_apagado":"14:50","p_scrap_kg":1.5,"p_observaciones":null,"p_productos":[],"p_hora_fin":null,"p_motivo_cierre":null}',
      JSON.stringify(rpcs(S, 'cerrar_turno')[0]?.[1]))
    // El borde: 20 minutos justos no pregunta; 21 sí.
    chk('14:40 (20 minutos justos) no pregunta; 14:39 sí', S.cierreAnticipado('14:40', p) === null && S.cierreAnticipado('14:39', p)?.minutos === 21)
    chk('un motivo elegido no viaja si ya no terminó antes', S.textoMotivoCierre({ hora: '14:50', motivoId: 'mo-personal', motivoDetalle: '' }, p) === null)
    // Una parada que cubre el hueco: la base no crea otra, la pantalla no pregunta.
    chk('con una parada que sigue (llega al fin del turno), no pregunta',
      S.cierreAnticipado('13:10', { ...p, paradas: [{ inicio: '2026-10-05T13:05:00-03:00', fin: null }] }) === null)
    chk('con una parada que cubre el hueco, tampoco',
      S.cierreAnticipado('13:10', { ...p, paradas: [{ inicio: '2026-10-05T13:15:00-03:00', fin: '2026-10-05T14:55:00-03:00' }] }) === null)
    chk('una que empieza más de 10 minutos después no lo cubre',
      S.cierreAnticipado('13:10', { ...p, paradas: [{ inicio: '2026-10-05T13:25:00-03:00', fin: '2026-10-05T15:00:00-03:00' }] })?.minutos === 110)
    chk('una que no llega a 10 minutos del fin tampoco',
      S.cierreAnticipado('13:10', { ...p, paradas: [{ inicio: '2026-10-05T13:10:00-03:00', fin: '2026-10-05T14:45:00-03:00' }] })?.minutos === 110)
    // Sin horario conocido no se pregunta nunca (no se inventa un fin).
    const N = armar({ horarios: [] })
    await N.abrirPlanilla('t1')
    chk('sin horario del turno: nunca pregunta', N.cierreAnticipado('09:00', N.estado.planilla) === null)
    chk('… y "Terminó de producir" no inventa un fin', !/El turno es hasta/.test(html(N, 'pr-btn-termino')))
    // La hora de fin de la planilla le gana al horario.
    const H = armar({ turno: { ...TURNO, hora_fin: '14:00:00' } })
    await H.abrirPlanilla('t1')
    chk('la hora de fin de la planilla le gana al horario', H.cierreAnticipado('13:45', H.estado.planilla) === null && H.cierreAnticipado('13:39', H.estado.planilla)?.fin === '14:00')
    // Un turno de noche: el fin es al otro día.
    const T = armar({ turno: { ...TURNO, turno: 'Noche', hora_inicio: '22:00:00' }, horarios: [{ turno: 'Noche', hora_inicio: '22:00:00', hora_fin: '06:00:00', activo: true }] })
    await T.abrirPlanilla('t1')
    chk('turno de noche: terminar 05:50 no pregunta; 04:00 sí (2 h antes)', T.cierreAnticipado('05:50', T.estado.planilla) === null &&
      T.cierreAnticipado('04:00', T.estado.planilla)?.minutos === 120)
    chk('… y terminar 23:00 (antes de la medianoche) son 7 h antes del fin de mañana', T.cierreAnticipado('23:00', T.estado.planilla)?.minutos === 420)
  }

  // ═══ El botón de volver y lo que queda a medio cargar ═══════════════════
  {
    const S = armar()
    await S.abrirPlanilla('t1', 'pr-paradas')
    await S.asegurarMotivosParada()
    S.estado.vista = 'pr-paradas'
    S.elegirMotivoParada('mo-luz')
    await escribirHora(S, 'desde', ['1', '0', '0', '0'])
    chk('con horas: "Atrás" las suelta', S.destinoVolver()?.texto === 'Atrás' && S.volverEnPlanta() === 'paso' && S.estado.paradaNueva.inicio === '')
    chk('con motivo: "Atrás" lo suelta', S.volverEnPlanta() === 'paso' && S.estado.paradaNueva.motivoId === null)
    chk('sin nada: "Inicio"', S.destinoVolver()?.texto === 'Inicio')
    chk('una parada empezada es "a medio cargar"', S.paradaNuevaEmpezada({ inicio: '10:00' }) && S.paradaNuevaEmpezada({ sigue: true }) && !S.paradaNuevaEmpezada(S.paradaNuevaVacia(TURNO)))
  }

  // ═══ Sin los motivos: se escribe y se guarda igual ════════════════════
  {
    const S = armar({ motivos: () => ({ data: null, error: { message: 'sin red' } }) })
    await S.abrirPlanilla('t1', 'pr-paradas')
    await S.asegurarMotivosParada()
    S.pintarParadas()
    chk('sin motivos: se dice, con "Volver a leer"', /No se pudieron leer los motivos/.test(html(S, 'pr-parada-sugerencias')) && /data-motivos-reintentar/.test(html(S, 'pr-parada-sugerencias')))
    chk('… y queda el campo para escribir', el(S, 'pr-parada-otro').hidden === false && el(S, 'pr-parada-motivo').placeholder === 'Escribí qué pasó')
    el(S, 'pr-parada-motivo').value = 'Corte de luz: el barrio'
    S.escribirDetalleParada('Corte de luz: el barrio')
    await escribirHora(S, 'desde', ['1', '0', '0', '0'])
    await escribirHora(S, 'hasta', ['1', '0', '3', '0'])
    await S.guardarParadaNueva(AHORA)
    chk('… y se guarda con el texto escrito', rpcs(S, 'registrar_parada')[0]?.[1]?.p_motivo === 'Corte de luz: el barrio')
    // En el cierre, sin motivos se escribe por qué paró antes.
    await S.mostrarCierre()
    S.ponerHoraCierre('13:10')
    chk('en el cierre, sin motivos: el campo para escribir', el(S, 'pr-cierre-motivo-detalle').hidden === false && /No se pudieron leer los motivos/.test(html(S, 'pr-cierre-motivos')))
    chk('… y viaja lo escrito', S.textoMotivoCierre({ hora: '13:10', motivoId: null, motivoDetalle: ' Se fue la luz ' }, S.estado.planilla, null) === 'Se fue la luz')
  }

  // ═══ La planilla que dejó "Volvió con lote nuevo" ══════════════════════
  {
    const S = armar({ turno: { ...TURNO, estado: 'pendiente_completar', hora_fin: '13:54:00', forzado_por: null, forzado_motivo: null } })
    await S.abrirPlanilla('t1')
    chk('una pendiente SIN forzado: "Falta completar (productos y scrap)", desde cuándo siguió con otro lote',
      /Falta completar \(productos y scrap\)\./.test(html(S, 'pr-planilla-estado')) && /desde las 13:54/.test(html(S, 'pr-planilla-estado')) &&
      !/se cerró a la fuerza/.test(html(S, 'pr-planilla-estado')), html(S, 'pr-planilla-estado'))
    chk('… "Terminó de producir" dice "Completar la planilla"', /Completar la planilla/.test(html(S, 'pr-btn-termino')))
    const T = armar({ turno: { ...TURNO, estado: 'pendiente_completar', forzado_por: 'e-fede', forzado_motivo: 'Nadie anotó' } })
    await T.abrirPlanilla('t1')
    chk('la forzada sigue diciendo que se cerró a la fuerza', /se cerró a la fuerza/.test(html(T, 'pr-planilla-estado')))
  }

  // ═══ HTML malicioso ═══════════════════════════════════════════════════
  {
    const X = armar()
    chequearMarcas(chk, 'htmlMotivosAgrupados', X.htmlMotivosAgrupados([{ id: '"x', nombre: marca('nombre'), categoria: 'falla' }], null), ['nombre'])
    chk('… el id del motivo va escapado', /data-motivo="&quot;x"/.test(X.htmlMotivosAgrupados([{ id: '"x', nombre: 'n', categoria: 'falla' }], null)))
    chk('… también en el cierre', /data-cierre-motivo="&quot;x"/.test(X.htmlMotivosAgrupados([{ id: '"x', nombre: 'n', categoria: 'falla' }], null, true)))
    chequearMarcas(chk, 'htmlMotivosAgrupados (cierre)', X.htmlMotivosAgrupados([{ id: 'y', nombre: marca('nombreCierre'), categoria: 'organizativa' }], null, true), ['nombreCierre'])
    chequearMarcas(chk, 'htmlAccionParo', X.htmlAccionParo([{ motivo: marca('motivo'), inicio: '2026-10-05T15:00:00-03:00', fin: null }]), ['motivo'])
    chequearMarcas(chk, 'htmlParadasTurno', X.htmlParadasTurno([{ id: marca('id'), motivo: marca('motivo2'), inicio: '2026-10-05T15:00:00-03:00', fin: '2026-10-05T16:00:00-03:00', categoria: '"><b>' }]), ['id', 'motivo2'])
    chk('… una categoría desconocida no se dibuja', !/pr-parada-item__cat/.test(X.htmlParadasTurno([{ id: 'a', motivo: 'm', inicio: '2026-10-05T15:00:00-03:00', fin: null, categoria: 'rara' }])))
    X.estado.avisoRelanzado = { turnoId: 't', texto: marca('aviso') }
    chequearMarcas(chk, 'htmlAvisoRelanzado', X.htmlAvisoRelanzado({ turno: { id: 't' } }), ['aviso'])
    chequearMarcas(chk, 'htmlAccionTermino', X.htmlAccionTermino({ turno: { hora_fin: null, estado: 'abierto' }, horario: { hora_fin: '15:00:00' } }), [])
    chk('htmlAccionLargada: una hora rara no se dibuja', !/<b/.test(X.htmlAccionLargada({ hora_largada: '"><b>' })) && /cargar hora/.test(X.htmlAccionLargada({ hora_largada: '"><b>' })))
    X.estado.planilla = { turno: { id: 't', lote: marca('lote'), estado: 'abierto' }, paradas: [], items: [] }
    X.estado.horaForm = { tipo: 'volvio', motivo: marca('motivoVolvio'), inicioParada: null, hora: '10:00', buffer: '', loteNuevo: true }
    X.pintarHoraVentana()
    chk('la nota de la ventana va como texto (textContent)', /getElementById\('pr-hora-ventana-nota'\)\s*\n\s*nota\.textContent = t\.nota/.test(FUENTE) || /nota\.textContent = t\.nota/.test(FUENTE))
    chequearMarcas(chk, 'htmlHoraVentana', X.htmlHoraVentana(X.estado.horaForm), [])
    chk('la nota de "¿Por qué paró antes?" va como texto', /getElementById\('pr-cierre-motivo-nota'\)\.textContent =/.test(FUENTE))
  }
})())

// ── La gestión: la limpieza aparte de las fallas, y la organización aparte ──
// "2 h de limpieza programada · 40 min de fallas · 30 min de organización",
// por máquina, y por motivo (la tarjeta "Paradas de la semana").
const TURNOS_G = [
  { id: 'g1', maquina_id: 'm-1', fecha: '2026-09-29' },
  { id: 'g2', maquina_id: 'm-2', fecha: '2026-09-30' },
]
const AHORA_G = new Date('2026-09-30T14:00:00Z')
const PARADAS_G = [
  { id: 'p1', turno_id: 'g1', inicio: '2026-09-29T09:00:00Z', fin: '2026-09-29T10:00:00Z', motivo: 'Limpieza de planchas', motivo_id: 'mo-limp', categoria: 'programada' },
  { id: 'p2', turno_id: 'g2', inicio: '2026-09-30T09:00:00Z', fin: '2026-09-30T10:00:00Z', motivo: 'Limpieza de tachos', motivo_id: 'mo-tachos', categoria: 'programada' },
  { id: 'p3', turno_id: 'g1', inicio: '2026-09-29T12:00:00Z', fin: '2026-09-29T12:30:00Z', motivo: 'Corte de cadena: la de abajo', motivo_id: 'mo-cadena', categoria: 'falla' },
  { id: 'p4', turno_id: 'g2', inicio: '2026-09-30T12:00:00Z', fin: '2026-09-30T12:10:00Z', motivo: 'Corte de cadena', motivo_id: 'mo-cadena', categoria: 'falla' },
  { id: 'p5', turno_id: 'g2', inicio: '2026-09-30T13:00:00Z', fin: '2026-09-30T13:15:00Z', motivo: 'Otro motivo: pulpo', motivo_id: 'mo-otro', categoria: 'otro' },
  { id: 'p6', turno_id: 'g1', inicio: '2026-09-29T17:00:00Z', fin: '2026-09-29T17:30:00Z', motivo: 'Se retiró personal · cierre anticipado', motivo_id: 'mo-personal', categoria: 'organizativa' },
]
function gestion({ paradas = PARADAS_G } = {}) {
  const G = construirProduccion(ARCHIVO_G)
  G.estado.miRolApp = 'usuario'
  G.estado.misTareas = new Map([['ver', { todas: true }]])
  G.estado.unidades = new Map([['u-cn', 'Cucuruchos Nuss']])
  G.estado.unidadId = 'u-cn'
  Object.assign(G.__tablas, { turnos_produccion: TURNOS_G, paradas_produccion: paradas, maquinas: [{ id: 'm-1', nombre: 'Máquina 1' }, { id: 'm-2', nombre: 'Máquina 2' }], motivos_parada: MOTIVOS })
  return G
}
{
  const G = gestion()
  const r = G.resumenParadasSemana({ turnos: TURNOS_G, paradas: PARADAS_G, maquinas: [{ id: 'm-1', nombre: 'Máquina 1' }, { id: 'm-2', nombre: 'Máquina 2' }], motivos: MOTIVOS, ahora: AHORA_G })
  chk('gestión: la organización aparte de las fallas', JSON.stringify(r.totales) === '{"programada":120,"falla":40,"organizativa":30,"otro":15,"sin":0}', JSON.stringify(r.totales))
  chk('… por máquina: limpieza, fallas y organización', JSON.stringify(r.porMaquina) ===
    JSON.stringify([{ nombre: 'Máquina 1', limpieza: 60, fallas: 30, organizacion: 30 }, { nombre: 'Máquina 2', limpieza: 60, fallas: 25, organizacion: 0 }]), JSON.stringify(r.porMaquina))
  const texto = G.renderParadasSemana(r).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
  chk('la tarjeta: "30 min de organización"', /2 h 0 min de limpieza programada/.test(texto) && /40 min de fallas/.test(texto) && /30 min de organización/.test(texto) && /15 min de otros motivos/.test(texto), texto)
  chk('… y por máquina', /Máquina 1 1 h 0 min limpieza · 30 min fallas · 30 min organización/.test(texto) && /Máquina 2 1 h 0 min limpieza · 25 min fallas(?! ·)/.test(texto), texto)
  const r0 = G.resumenParadasSemana({ turnos: TURNOS_G, paradas: PARADAS_G.filter(p => p.categoria !== 'organizativa'), maquinas: [], motivos: MOTIVOS, ahora: AHORA_G })
  chk('sin organizativas, no se nombra la organización', !/organización/.test(G.renderParadasSemana(r0)))
}
// La gestión: el historial dice "empezó a producir" y "terminó de producir".
{
  const G = gestion()
  const h = G.horarioTurno({ fecha: '2026-10-05', hora_inicio: '06:00:00', hora_fin: '15:00:00', hora_largada: '06:40:00', hora_apagado: '13:10:00', estado: 'cerrado', cerrado_en: '2026-10-05T16:20:00Z' })
  chk('historial: "06:00 a 15:00 · empezó a producir 06:40 · terminó de producir 13:10"', /06:00 a 15:00 · empezó a producir 06:40 · terminó de producir 13:10/.test(h), h)
  chk('… sin largada no la nombra', !/empezó/.test(G.horarioTurno({ fecha: '2026-10-05', hora_inicio: '06:00:00', estado: 'abierto' })))
  chk('el detalle lee hora_largada', /hora_apagado, hora_largada, scrap_kg/.test(FUENTE_G))
}

const AHORA_V = new Date('2026-09-30T14:00:00Z')
// ── La gestión (traído de test-produccion-paradas-motivos.js, 05/10/2026): la limpieza aparte de las fallas ─────────────────────────
// "2 h de limpieza programada · 40 min de fallas", por máquina y por semana,
// y las fallas por motivo (la tarjeta "Paradas de la semana").
const TURNOS_V = [
  { id: 'g1', maquina_id: 'm-1', fecha: '2026-09-29' },
  { id: 'g2', maquina_id: 'm-2', fecha: '2026-09-30' },
]
const PARADAS_V = [
  { id: 'p1', turno_id: 'g1', inicio: '2026-09-29T09:00:00Z', fin: '2026-09-29T10:00:00Z', motivo: 'Limpieza de planchas: al arrancar', motivo_id: 'mo-limp', categoria: 'programada' },
  { id: 'p2', turno_id: 'g2', inicio: '2026-09-30T09:00:00Z', fin: '2026-09-30T10:00:00Z', motivo: 'Limpieza de planchas: al terminar', motivo_id: 'mo-limp', categoria: 'programada' },
  { id: 'p3', turno_id: 'g1', inicio: '2026-09-29T12:00:00Z', fin: '2026-09-29T12:30:00Z', motivo: 'Corte de cadena: la de abajo', motivo_id: 'mo-cadena', categoria: 'falla' },
  { id: 'p4', turno_id: 'g2', inicio: '2026-09-30T12:00:00Z', fin: '2026-09-30T12:10:00Z', motivo: 'Corte de cadena', motivo_id: 'mo-cadena', categoria: 'falla' },
  { id: 'p5', turno_id: 'g2', inicio: '2026-09-30T13:00:00Z', fin: '2026-09-30T13:15:00Z', motivo: 'Otro motivo: pulpo', motivo_id: 'mo-otro', categoria: 'otro' },
]
function gestionV({ paradas = PARADAS_V, fallaParadas = false, maquinas = null } = {}) {
  const G = construirProduccion(ARCHIVO_G)
  G.estado.miRolApp = 'usuario'
  G.estado.misTareas = new Map([['ver', { todas: true }]])
  G.estado.unidades = new Map([['u-cn', 'Cucuruchos Nuss']])
  G.estado.unidadId = 'u-cn'
  G.estado.fechaInd = '2026-09-30'
  Object.assign(G.__tablas, {
    turnos_produccion: TURNOS_V,
    paradas_produccion: () => fallaParadas ? { data: null, error: { message: 'permission denied for table paradas_produccion' } } : { data: paradas, error: null },
    maquinas: maquinas ?? [{ id: 'm-1', nombre: 'Máquina 1' }, { id: 'm-2', nombre: 'Máquina 2' }],
    motivos_parada: MOTIVOS,
    masas: [], masa_items: [],
  })
  G.__setRpc(async () => ({ data: null, error: { message: 'sin datos' } }))
  return G
}
const tarjetaG = (html, id) => {
  const i = html.indexOf(`id="pr-ind-${id}"`)
  return i === -1 ? '' : html.slice(i, html.indexOf('</section>', i))
}
const sinEtiquetas = h => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

esperas.push((async () => {
  const G = gestionV()
  const r = await G.leerParadasSemana('u-cn', '2026-09-30', AHORA_V)
  const qT = G.__llamadas.consultas.find(c => c[0] === 'turnos_produccion')?.[1] ?? []
  chk('gestión: los turnos de la unidad de los 7 días que terminan en el elegido',
    qT.some(f => f[0] === 'eq' && f[1] === 'unidad_negocio_id' && f[2] === 'u-cn') && qT.some(f => f[0] === 'gte' && f[1] === 'fecha' && f[2] === '2026-09-24') &&
    qT.some(f => f[0] === 'lte' && f[1] === 'fecha' && f[2] === '2026-09-30'), JSON.stringify(qT))
  chk('… las paradas de esos turnos, con su categoría', /from\('paradas_produccion'\)\.select\('id, turno_id, inicio, fin, motivo, motivo_id, categoria'\)\.in\('turno_id', ids\)/.test(FUENTE_G))
  const t = r.datos?.totales
  chk('la limpieza (programada) aparte de las fallas', t && t.programada === 120 && t.falla === 40 && t.otro === 15 && t.sin === 0, JSON.stringify(t))
  chk('por máquina: limpieza y lo demás', JSON.stringify(r.datos.porMaquina) ===
    JSON.stringify([{ nombre: 'Máquina 1', limpieza: 60, fallas: 30, organizacion: 0 }, { nombre: 'Máquina 2', limpieza: 60, fallas: 25, organizacion: 0 }]), JSON.stringify(r.datos.porMaquina))
  chk('las fallas por motivo (sin la limpieza), de más a menos minutos', JSON.stringify(r.datos.porMotivo) ===
    JSON.stringify([{ nombre: 'Corte de cadena', veces: 2, minutos: 40 }, { nombre: 'Otro motivo', veces: 1, minutos: 15 }]), JSON.stringify(r.datos.porMotivo))
  const h = G.renderParadasSemana(r.datos)
  const texto = sinEtiquetas(h)
  chk('la tarjeta: "2 h 0 min de limpieza programada · 40 min de fallas"', /2 h 0 min de limpieza programada/.test(texto) && /40 min de fallas/.test(texto) && /15 min de otros motivos/.test(texto), texto)
  chk('… la limpieza con su color (verde agua), las fallas en bordó', /class="pg-par__limp">2 h 0 min de limpieza programada/.test(h) && /class="pg-par__falla">40 min de fallas/.test(h) &&
    /\.pg-par__limp \{ color: var\(--pg-teal-osc\); background: var\(--pg-teal-suave\);/.test(FUENTE_G) && /\.pg-par__falla \{ color: var\(--bordo-oscuro\); \}/.test(FUENTE_G))
  chk('… por máquina', /Máquina 1 1 h 0 min limpieza · 30 min fallas/.test(texto) && /Máquina 2 1 h 0 min limpieza · 25 min fallas/.test(texto), texto)
  chk('… y las fallas por motivo', /Corte de cadena 2 veces · 40 min/.test(texto) && /Otro motivo 1 vez · 15 min/.test(texto) && !/Limpieza de planchas/.test(texto), texto)

  // Sin categoría (una parada vieja): cuenta en "otros motivos", nunca como limpieza.
  const r2 = G.resumenParadasSemana({ turnos: TURNOS_V, paradas: [{ turno_id: 'g1', inicio: '2026-09-29T12:00:00Z', fin: '2026-09-29T12:20:00Z', motivo: 'Se cortó la luz', motivo_id: null, categoria: null }], maquinas: [], motivos: [], ahora: AHORA_V })
  chk('una parada sin categoría no cuenta como limpieza ni como falla', r2.totales.sin === 20 && r2.totales.programada === 0 && r2.totales.falla === 0 &&
    r2.porMotivo[0]?.nombre === 'Se cortó la luz' && /20 min de otros motivos/.test(sinEtiquetas(G.renderParadasSemana(r2))))
  // La que sigue abierta cuenta hasta ahora.
  const r3 = G.resumenParadasSemana({ turnos: TURNOS_V, paradas: [{ turno_id: 'g2', inicio: '2026-09-30T13:30:00Z', fin: null, motivo: 'Corte de luz', motivo_id: 'mo-luz', categoria: 'falla' }], maquinas: [], motivos: MOTIVOS, ahora: AHORA_V })
  chk('una parada que sigue abierta cuenta hasta ahora', r3.totales.falla === 30, JSON.stringify(r3.totales))
  chk('una parada de un turno que no es de la semana no cuenta', G.resumenParadasSemana({ turnos: TURNOS_V, paradas: [{ turno_id: 'otro', inicio: '2026-09-29T12:00:00Z', fin: '2026-09-29T13:00:00Z', categoria: 'falla' }], maquinas: [], motivos: [], ahora: AHORA_V }).cantidad === 0)
  chk('sin paradas: lo dice, sin ceros', /Sin paradas/.test(G.renderParadasSemana({ cantidad: 0, totales: { programada: 0, falla: 0, otro: 0, sin: 0 }, porMaquina: [], porMotivo: [] })) &&
    !/0 min/.test(G.renderParadasSemana({ cantidad: 0, totales: { programada: 0, falla: 0, otro: 0, sin: 0 }, porMaquina: [], porMotivo: [] })))
  chk('un dato que no se entiende no se dibuja como cero', G.renderParadasSemana(null) === null && G.renderParadasSemana({ totales: null }) === null)

  // La tarjeta en los indicadores, y que falla SOLA.
  await G.cargarIndicadores()
  const hi = G.__doc.getElementById('pr-indicadores').innerHTML
  chk('la tarjeta "Paradas de la semana" está en los indicadores', /Paradas de la semana/.test(tarjetaG(hi, 'paradas')) && /limpieza programada/.test(sinEtiquetas(tarjetaG(hi, 'paradas'))))
  const GF = gestionV({ fallaParadas: true })
  await GF.cargarIndicadores()
  const hf = GF.__doc.getElementById('pr-indicadores').innerHTML
  chk('si no se pueden leer, SOLO esa tarjeta lo dice, con el mensaje de la base', /No se pudieron leer las paradas\./.test(tarjetaG(hf, 'paradas')) &&
    /permission denied for table paradas_produccion/.test(tarjetaG(hf, 'paradas')) && !/No se pudieron leer las paradas/.test(tarjetaG(hf, 'tiradas')))
  const GC = gestionV()
  GC.estado.paradasSemana = { cargando: true }
  chk('mientras carga, dice "Cargando…"', /Cargando…/.test(tarjetaG(GC.htmlIndicadores(null, null), 'paradas')))

  // Los nombres van escapados.
  const GX = gestionV({ maquinas: [{ id: 'm-1', nombre: marca('maquina') }, { id: 'm-2', nombre: 'Máquina 2' }] })
  const rx = GX.resumenParadasSemana({ turnos: TURNOS_V, paradas: [...PARADAS_V, { turno_id: 'g1', inicio: '2026-09-29T15:00:00Z', fin: '2026-09-29T15:05:00Z', motivo: marca('motivo'), motivo_id: null, categoria: 'falla' }],
    maquinas: [{ id: 'm-1', nombre: marca('maquina') }], motivos: MOTIVOS, ahora: AHORA_V })
  chequearMarcas(chk, 'renderParadasSemana', GX.renderParadasSemana(rx), ['maquina', 'motivo'])
})())

fin()
