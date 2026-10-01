// PARADAS CON MOTIVOS FIJOS Y "ANOTAR UNA QUE YA PASÓ" (30/09/2026).
//
// Contrato con la base (pg_get_functiondef, 30/09/2026):
//  - motivos_parada (nombre, categoria programada|falla|otro, pide_detalle,
//    orden, activo): la lista fija. SELECT para todos los autenticados.
//  - El trigger _clasificar_parada engancha el TEXTO del motivo con la lista
//    ("Corte de luz: se cortó en el barrio" → Corte de luz + detalle).
//  - registrar_parada(p_turno_id, p_motivo, p_inicio, p_fin): fin null deja la
//    parada abierta; rechaza una vuelta futura (+5 min) y dos abiertas.
//  - registrar_limpieza_planchas(p_turno_id, p_momento 'arranque'|'final',
//    p_minutos 5..480): al arrancar va desde la apertura del turno (sin
//    minutos, abierta); al terminar, hasta ahora.
// Se EJECUTA el código de la planta con su sandbox.
//
//   node pruebas/test-produccion-paradas-motivos.js
//   ARCHIVO_TEST=<copia de modulos/produccion.html>

process.env.TZ = 'UTC'
const path = require('path')
const { arnes, leer, marca, chequearMarcas } = require('./circuito-comun')
const { construirProduccion } = require('./sandbox-produccion')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/produccion.html')
const FUENTE = leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

// La lista real (30/09/2026), desordenada a propósito: la pantalla ordena.
const MOTIVOS = [
  { id: 'mo-otro', nombre: 'Otro motivo', categoria: 'otro', pide_detalle: true, orden: 99 },
  { id: 'mo-cadena', nombre: 'Corte de cadena', categoria: 'falla', pide_detalle: false, orden: 10 },
  { id: 'mo-limp', nombre: 'Limpieza de planchas', categoria: 'programada', pide_detalle: false, orden: 1 },
  { id: 'mo-correa', nombre: 'Corte de correa', categoria: 'falla', pide_detalle: false, orden: 11 },
  { id: 'mo-luz', nombre: 'Corte de luz', categoria: 'falla', pide_detalle: false, orden: 13 },
]
// 10:15 de Argentina = 13:15 UTC del 30/09/2026.
const AHORA = new Date('2026-09-30T14:00:00Z') // 11:00 de Argentina
const TURNO = { id: 't1', lote: 6209, maquina_id: 'm1', fecha: '2026-09-30', turno: 'Mañana', abierto_en: '2026-09-30T09:00:00Z', estado: 'abierto' }

function armar({ motivos = MOTIVOS, paradas = [], turno = TURNO } = {}) {
  const S = construirProduccion(ARCHIVO)
  S.__tablas.motivos_parada = motivos
  // Para que recargarPlanilla() (después de guardar) encuentre el turno.
  S.__tablas.turnos_produccion = [{ ...turno, unidad_negocio_id: 'u1', encargado_id: 'e-fede' }]
  S.__tablas.maquinas = [{ id: 'm1', nombre: 'Máquina 1', unidad_negocio_id: 'u1' }]
  S.__tablas.paradas_produccion = paradas
  S.estado.modo = 'produccion'
  S.estado.persona = { id: 'e-fede', nombre: 'Federico Silva' }
  S.estado.vista = 'pr-paradas'
  S.estado.planilla = { turno, paradas, masas: [], items: [], operarios: [], maquinaNombre: 'Máquina 1' }
  return S
}
const el = (S, id) => S.__doc.getElementById(id)
const rpcs = (S, n) => S.__llamadas.rpc.filter(([x]) => x === n)
const tic = () => new Promise(r => setImmediate(r))

// ── Fuente ─────────────────────────────────────────────────────────────
chk('los motivos se leen de motivos_parada, activos y por orden',
  /from\('motivos_parada'\)\s*\n?\s*\.select\('id, nombre, categoria, pide_detalle, orden'\)\.eq\('activo', true\)\.order\('orden'\)/.test(FUENTE))
chk('ninguna lista de motivos escrita en el código (MOTIVOS_PARADA se fue)', !/const MOTIVOS_PARADA\b/.test(FUENTE) && !/'Se cortó la cadena', 'Falta masa'/.test(FUENTE))
chk('la limpieza tiene su color (verde agua), distinto del naranja de lo elegido',
  /\.pr-pa-limpieza \{[^}]*background: var\(--p-teal-suave\);/.test(FUENTE) && /\.pr-pa-limpieza__boton\[aria-pressed="true"\] \{ background: var\(--p-teal\);/.test(FUENTE))
chk('"Anotar" es lo principal (naranja) y "Paró ahora" el secundario',
  /id="pr-btn-parada" hidden>Paró ahora</.test(FUENTE) && /class="pr-pa-ahora"/.test(FUENTE) && /class="pr-prim pr-pa-guardar" id="pr-btn-guardar-parada"/.test(FUENTE))
chk('el estado "Andando" es UNA línea chica (sin el cartel grande)', /class="pr-parada-andando" id="pr-parada-andando" hidden>\s*<span class="pr-parada-andando__punto"/.test(FUENTE) &&
  !/Si la máquina se para, elegí por qué y tocá «Paró ahora»/.test(FUENTE))

esperas.push((async () => {
  // 1 · Los motivos, de la base y en su orden; la limpieza primero.
  {
    const S = armar()
    S.pintarParadas()
    await tic()
    const h = el(S, 'pr-parada-sugerencias').innerHTML
    const ids = [...h.matchAll(/data-motivo="([^"]+)"/g)].map(m => m[1])
    chk('consulta motivos_parada', S.__llamadas.consultas.some(([t]) => t === 'motivos_parada'))
    chk('la limpieza va PRIMERO (sus dos botones) y después en su orden', JSON.stringify(ids) ===
      JSON.stringify(['mo-limp', 'mo-limp', 'mo-cadena', 'mo-correa', 'mo-luz', 'mo-otro']), ids.join(','))
    chk('la limpieza con "Al arrancar" y "Al terminar"', /data-limpieza="arranque"[^>]*>Al arrancar</.test(h) && /data-limpieza="final"[^>]*>Al terminar</.test(h))
    chk('la limpieza en su caja de color, aparte de las fallas', h.indexOf('pr-pa-limpieza') < h.indexOf('pr-pa-motivos__grilla'))
    chk('ninguno elegido de antemano', !/aria-pressed="true"/.test(h))
    chk('el detalle no aparece sin motivo', el(S, 'pr-parada-otro').hidden === true)
  }

  // 2 · "Otro motivo" no guarda sin detalle; una falla sí (detalle opcional).
  {
    const S = armar()
    S.pintarParadas(); await tic()
    S.elegirMotivoParada('mo-otro')
    chk('"Otro motivo": aparece el detalle, obligatorio', el(S, 'pr-parada-otro').hidden === false && el(S, 'pr-parada-motivo').placeholder === '¿Qué pasó? (obligatorio)')
    S.estado.paradaNueva.inicio = '10:00'
    S.elegirDuracionParada('30')
    await S.guardarParadaNueva(AHORA)
    chk('"Otro motivo" sin detalle: no se manda', rpcs(S, 'registrar_parada').length === 0)
    chk('… y se dice', el(S, 'pr-parada-error').hidden === false && el(S, 'pr-parada-error').textContent === 'Escribí qué pasó.')
    chk('… el botón NO queda trabado', el(S, 'pr-btn-guardar-parada').disabled === false)
    el(S, 'pr-parada-motivo').value = '  Se trabó la cinta  '
    await S.guardarParadaNueva(AHORA)
    const r = rpcs(S, 'registrar_parada')[0]?.[1]
    chk('con detalle: "Otro motivo: Se trabó la cinta"', r?.p_motivo === 'Otro motivo: Se trabó la cinta', JSON.stringify(r))
  }
  {
    const S = armar()
    S.pintarParadas(); await tic()
    S.elegirMotivoParada('mo-cadena')
    chk('una falla: el detalle es opcional', el(S, 'pr-parada-motivo').placeholder === 'Detalle (opcional)')
    S.estado.paradaNueva.inicio = '10:15'
    S.elegirDuracionParada('30')
    chk('el resumen en una línea antes de guardar', el(S, 'pr-parada-resumen').textContent === 'Corte de cadena · de 10:15 a 10:45 (30 min)' || S.resumenParadaNueva(S.estado.paradaNueva, S.estado.planilla, AHORA) === 'Corte de cadena · de 10:15 a 10:45 (30 min)',
      S.resumenParadaNueva(S.estado.paradaNueva, S.estado.planilla, AHORA))
    S.__tablas.paradas_produccion = []
    await S.guardarParadaNueva(AHORA)
    const r = rpcs(S, 'registrar_parada')[0]?.[1]
    chk('"30 min" desde las 10:15 guarda de 10:15 a 10:45', r && r.p_motivo === 'Corte de cadena' &&
      r.p_inicio === '2026-09-30T10:15:00-03:00' && r.p_fin === '2026-09-30T10:45:00-03:00', JSON.stringify(r))
    chk('… y el formulario vuelve a empezar', S.estado.paradaNueva.motivoId === null && S.estado.paradaNueva.duracion === null)
  }
  {
    const S = armar()
    S.pintarParadas(); await tic()
    S.elegirMotivoParada('mo-cadena')
    el(S, 'pr-parada-motivo').value = 'la de abajo'
    S.escribirDetalleParada('la de abajo')
    S.estado.paradaNueva.inicio = '09:40'
    S.elegirDuracionParada('60')
    chk('el resumen dice el detalle', S.resumenParadaNueva(S.estado.paradaNueva, S.estado.planilla, AHORA) === 'Corte de cadena (la de abajo) · de 09:40 a 10:40 (1 h 00 min)',
      S.resumenParadaNueva(S.estado.paradaNueva, S.estado.planilla, AHORA))
    await S.guardarParadaNueva(AHORA)
    chk('el detalle viaja como "Corte de cadena: la de abajo"', rpcs(S, 'registrar_parada')[0]?.[1]?.p_motivo === 'Corte de cadena: la de abajo')
  }

  // 3 · "Todavía no volvió" la deja abierta.
  {
    const S = armar()
    S.pintarParadas(); await tic()
    S.elegirMotivoParada('mo-luz')
    S.estado.paradaNueva.inicio = '10:40'
    S.elegirDuracionParada('sigue')
    chk('el resumen dice que sigue parada', S.resumenParadaNueva(S.estado.paradaNueva, S.estado.planilla, AHORA) === 'Corte de luz · desde las 10:40, todavía parada')
    await S.guardarParadaNueva(AHORA)
    const r = rpcs(S, 'registrar_parada')[0]?.[1]
    chk('"Todavía no volvió": registrar_parada con p_fin null, a la hora que paró', r && r.p_fin === null && r.p_inicio === '2026-09-30T10:40:00-03:00', JSON.stringify(r))
  }
  {
    const S = armar({ paradas: [{ id: 'pa', inicio: '2026-09-30T13:00:00Z', fin: null, motivo: 'Corte de luz' }] })
    S.pintarParadas(); await tic()
    chk('con una parada en curso, "Todavía no volvió" se apaga', /data-duracion="sigue"[^>]*disabled|disabled[^>]*data-duracion="sigue"/.test(el(S, 'pr-parada-duracion').innerHTML))
    chk('… y "Paró ahora" no se ofrece', el(S, 'pr-btn-parada').hidden === true)
    chk('… la línea de arriba dice PARADA con su motivo y "Volvió a andar"', el(S, 'pr-parada-activa').hidden === false &&
      el(S, 'pr-parada-activa-motivo').textContent === 'Corte de luz' && el(S, 'pr-btn-reanudar').hidden === false)
    S.estado.paradaNueva.duracion = 'sigue'
    S.estado.paradaNueva.motivoId = 'mo-cadena'
    S.estado.paradaNueva.inicio = '10:40'
    chk('… y si igual se elige, se dice antes', S.faltanParaParadaNueva(S.estado.paradaNueva, S.estado.planilla, AHORA)[0] === 'Ya hay una parada sin terminar: tocá «Volvió a andar» primero.')
  }

  // 4 · La hora futura se avisa ANTES de guardar.
  {
    const S = armar()
    S.pintarParadas(); await tic()
    S.elegirMotivoParada('mo-cadena')
    S.estado.paradaNueva.inicio = '10:45'
    S.elegirDuracionParada('30')
    await S.guardarParadaNueva(AHORA)
    chk('10:45 + 30 min con las 11:00: no se manda', rpcs(S, 'registrar_parada').length === 0)
    chk('… y se dice que la vuelta todavía no pasó', /Con esa duración volvió a las 11:15, que todavía no pasó/.test(el(S, 'pr-parada-error').textContent), el(S, 'pr-parada-error').textContent)
  }
  {
    const S = armar()
    S.pintarParadas(); await tic()
    S.elegirMotivoParada('mo-cadena')
    S.estado.paradaNueva.inicio = '11:30'
    S.elegirDuracionParada('sigue')
    chk('una hora de parada futura también se avisa', /no entra en el turno/.test(S.faltanParaParadaNueva(S.estado.paradaNueva, S.estado.planilla, AHORA)[0] ?? ''))
  }

  // 5 · "Otro" abre el segundo reloj: "Volvió a las".
  {
    const S = armar()
    S.pintarParadas(); await tic()
    S.elegirMotivoParada('mo-correa')
    S.estado.paradaNueva.inicio = '09:50'
    S.elegirDuracionParada('otro')
    const h = el(S, 'pr-parada-hora').innerHTML
    chk('"Otro": dos relojes, paró y volvió', /data-rueda="inicio"/.test(h) && /data-rueda="fin"/.test(h) && /Volvió a las/.test(h))
    chk('… el de vuelta arranca 30 minutos después', S.estado.paradaNueva.fin === '10:20')
    S.tocarRueda('fin', 'm', '35')
    chk('tocar un minuto lo elige', S.estado.paradaNueva.fin === '10:35')
    await S.guardarParadaNueva(AHORA)
    const r = rpcs(S, 'registrar_parada')[0]?.[1]
    chk('guarda de 09:50 a 10:35', r && r.p_inicio === '2026-09-30T09:50:00-03:00' && r.p_fin === '2026-09-30T10:35:00-03:00', JSON.stringify(r))
  }

  // 6 · El reloj de ruedas: de a 5, y tocando el minuto, de a 1.
  {
    const S = armar()
    S.pintarParadas(); await tic()
    const f = S.estado.paradaNueva
    chk('arranca en la hora de ahora menos 30 (redondeada a 5)', S.paradaNuevaVacia(TURNO, AHORA).inicio === '10:30')
    const h1 = el(S, 'pr-parada-hora').innerHTML
    chk('minutos de a 5: 12 renglones', (h1.match(/data-rueda-set="inicio:m:/g) ?? []).length === 12 && (h1.match(/data-rueda-set="inicio:h:/g) ?? []).length === 24)
    const m = f.inicio.slice(3)
    S.tocarRueda('inicio', 'm', m)
    const h2 = el(S, 'pr-parada-hora').innerHTML
    chk('tocar el minuto elegido: de a 1 (60 renglones)', (h2.match(/data-rueda-set="inicio:m:/g) ?? []).length === 60 && /de a 1 minuto/.test(h2))
    S.tocarRueda('inicio', 'm', '17')
    chk('… y se afina al minuto', S.estado.paradaNueva.inicio.slice(3) === '17')
    S.tocarRueda('inicio', 'm', '17')
    chk('tocarlo otra vez vuelve de a 5, redondeando para abajo', S.estado.paradaNueva.inicio.slice(3) === '15' &&
      (el(S, 'pr-parada-hora').innerHTML.match(/data-rueda-set="inicio:m:/g) ?? []).length === 12)
    S.tocarRueda('inicio', 'h', '08')
    chk('tocar una hora la elige', S.estado.paradaNueva.inicio === '08:15')
  }

  // 7 · La limpieza de planchas: registrar_limpieza_planchas.
  {
    const S = armar()
    S.pintarParadas(); await tic()
    S.elegirMotivoParada('mo-limp', 'arranque')
    chk('al arrancar: dice desde cuándo, sin reloj', /Desde que se abrió el turno, a las 06:00/.test(el(S, 'pr-parada-hora').innerHTML) && !/data-rueda=/.test(el(S, 'pr-parada-hora').innerHTML))
    chk('… "Todavía no terminó" en vez de "Todavía no volvió"', /data-duracion="sigue"[^>]*>Todavía no terminó</.test(el(S, 'pr-parada-duracion').innerHTML))
    chk('… "Paró ahora" no se ofrece con la limpieza', el(S, 'pr-btn-parada').hidden === true)
    S.elegirDuracionParada('30')
    chk('… el resumen', S.resumenParadaNueva(S.estado.paradaNueva, S.estado.planilla, AHORA) === 'Limpieza de planchas al arrancar · de 06:00 a 06:30 (30 min)')
    await S.guardarParadaNueva(AHORA)
    chk('al arrancar con 30 min: registrar_limpieza_planchas', JSON.stringify(rpcs(S, 'registrar_limpieza_planchas')[0]?.[1]) ===
      '{"p_turno_id":"t1","p_momento":"arranque","p_minutos":30}', JSON.stringify(rpcs(S, 'registrar_limpieza_planchas')))
  }
  {
    const S = armar()
    S.pintarParadas(); await tic()
    S.elegirMotivoParada('mo-limp', 'arranque')
    S.elegirDuracionParada('sigue')
    await S.guardarParadaNueva(AHORA)
    chk('al arrancar, todavía limpiando: sin minutos (queda abierta)', rpcs(S, 'registrar_limpieza_planchas')[0]?.[1]?.p_minutos === null)
  }
  {
    const S = armar()
    S.pintarParadas(); await tic()
    S.elegirMotivoParada('mo-limp', 'final')
    chk('al terminar: no se ofrece "Todavía no terminó"', !/data-duracion="sigue"/.test(el(S, 'pr-parada-duracion').innerHTML))
    await S.guardarParadaNueva(AHORA)
    chk('al terminar sin minutos: no se manda', rpcs(S, 'registrar_limpieza_planchas').length === 0 && el(S, 'pr-parada-error').textContent === 'Elegí cuánto duró.')
    S.elegirDuracionParada('45')
    chk('… el resumen va hasta ahora', S.resumenParadaNueva(S.estado.paradaNueva, S.estado.planilla, AHORA) === 'Limpieza de planchas al terminar · de 10:15 a 11:00 (45 min)')
    await S.guardarParadaNueva(AHORA)
    chk('al terminar con 45 min', JSON.stringify(rpcs(S, 'registrar_limpieza_planchas')[0]?.[1]) === '{"p_turno_id":"t1","p_momento":"final","p_minutos":45}')
  }
  {
    const S = armar()
    S.pintarParadas(); await tic()
    S.elegirMotivoParada('mo-limp')
    chk('la limpieza sin elegir al arrancar o al terminar no se manda',
      S.faltanParaParadaNueva(S.estado.paradaNueva, S.estado.planilla, AHORA)[0] === 'Elegí si la limpieza fue al arrancar o al terminar.')
  }

  // 8 · Sin los motivos: se escribe y se guarda igual (la base lo engancha).
  {
    const S = armar({ motivos: () => ({ data: null, error: { message: 'sin red' } }) })
    S.pintarParadas(); await tic(); await tic()
    chk('sin motivos: se dice, con "Volver a leer"', /No se pudieron leer los motivos/.test(el(S, 'pr-parada-sugerencias').innerHTML) && /data-motivos-reintentar/.test(el(S, 'pr-parada-sugerencias').innerHTML))
    chk('… y queda el campo para escribir el motivo', el(S, 'pr-parada-otro').hidden === false && el(S, 'pr-parada-motivo').placeholder === 'Escribí qué pasó')
    S.estado.paradaNueva.inicio = '10:00'
    S.elegirDuracionParada('20')
    el(S, 'pr-parada-motivo').value = 'Corte de luz: el barrio'
    await S.guardarParadaNueva(AHORA)
    chk('… y se guarda con el texto escrito', rpcs(S, 'registrar_parada')[0]?.[1]?.p_motivo === 'Corte de luz: el barrio')
  }

  // 9 · El error de la base, tal cual; "Paró ahora" con el motivo elegido.
  {
    const S = armar()
    S.pintarParadas(); await tic()
    S.elegirMotivoParada('mo-cadena')
    S.estado.paradaNueva.inicio = '10:00'
    S.elegirDuracionParada('20')
    S.__setRpc(() => ({ data: null, error: { message: 'La parada no puede ser anterior a la apertura del turno.' } }))
    await S.guardarParadaNueva(AHORA)
    chk('el error de la base, TAL CUAL', el(S, 'pr-parada-error').textContent === 'La parada no puede ser anterior a la apertura del turno.' && S.estado.paradaNueva.enviando === false)
  }
  {
    const S = armar()
    S.pintarParadas(); await tic()
    await S.confirmarParada()
    chk('"Paró ahora" sin motivo: no se manda y se dice', rpcs(S, 'iniciar_parada').length === 0 && el(S, 'pr-parada-error').textContent === 'Elegí por qué paró.')
    S.elegirMotivoParada('mo-correa')
    await S.confirmarParada()
    chk('"Paró ahora" con el motivo elegido: iniciar_parada', JSON.stringify(rpcs(S, 'iniciar_parada')[0]?.[1]) === '{"p_turno_id":"t1","p_motivo":"Corte de correa"}')
  }

  // 10 · El botón de volver: primero suelta cuánto duró, después el motivo.
  {
    const S = armar()
    S.pintarParadas(); await tic()
    S.elegirMotivoParada('mo-cadena')
    S.elegirDuracionParada('15')
    chk('con duración: "Atrás" la suelta', S.destinoVolver()?.texto === 'Atrás' && S.volverEnPlanta() === 'paso' && S.estado.paradaNueva.duracion === null)
    chk('con motivo: "Atrás" lo suelta', S.volverEnPlanta() === 'paso' && S.estado.paradaNueva.motivoId === null)
    chk('sin nada: "Inicio"', S.destinoVolver()?.texto === 'Inicio')
  }

  // 11 · La lista del turno: el motivo, el detalle, la categoría; la limpieza en su color.
  {
    const S = armar()
    const h = S.htmlParadasTurno([
      { id: 'a', inicio: '2026-09-30T09:00:00Z', fin: '2026-09-30T09:30:00Z', motivo: 'Limpieza de planchas: al arrancar', categoria: 'programada' },
      { id: 'b', inicio: '2026-09-30T12:00:00Z', fin: '2026-09-30T12:20:00Z', motivo: 'Corte de cadena: la de abajo', categoria: 'falla' },
    ])
    chk('la limpieza con su color y "Programada"', /pr-parada-item pr-parada-item--programada" data-parada-editar="a"/.test(h) && /pr-parada-item__cat--programada">Programada</.test(h))
    chk('la falla con "Falla" y su detalle', /pr-parada-item__cat--falla">Falla</.test(h) && /Corte de cadena: la de abajo/.test(h))
    const x = S.htmlParadasTurno([{ id: 'c', inicio: '2026-09-30T12:00:00Z', fin: null, motivo: marca('motivo'), categoria: '"><b>' }])
    chk('una categoría desconocida no se dibuja (y no entra cruda)', !/<b>/.test(x) && !/pr-parada-item__cat/.test(x))
    chequearMarcas(chk, 'htmlParadasTurno', x, ['motivo'])
    const y = S.htmlMotivosParada([{ id: '"x', nombre: marca('nombre'), categoria: 'falla', pide_detalle: false, orden: 1 }], { motivoId: null })
    chequearMarcas(chk, 'htmlMotivosParada', y, ['nombre'])
    chk('… y el id va escapado', /data-motivo="&quot;x"/.test(y))
    const yl = S.htmlMotivosParada([{ id: '"l', nombre: 'Limpieza de planchas', categoria: 'programada', pide_detalle: false, orden: 1 }], { motivoId: null })
    chk('… también el de la limpieza', /data-motivo="&quot;l" data-limpieza="arranque"/.test(yl) && !/data-motivo=""l"/.test(yl))
  }
})())


// ── La gestión: la limpieza aparte de las fallas ─────────────────────────
// "2 h de limpieza programada · 40 min de fallas", por máquina y por semana,
// y las fallas por motivo (la tarjeta "Paradas de la semana").
const { GESTION } = require('./sandbox-produccion')
const ARCHIVO_G = process.env.ARCHIVO_GESTION || GESTION
const FUENTE_G = leer(ARCHIVO_G)
const TURNOS_G = [
  { id: 'g1', maquina_id: 'm-1', fecha: '2026-09-29' },
  { id: 'g2', maquina_id: 'm-2', fecha: '2026-09-30' },
]
const PARADAS_G = [
  { id: 'p1', turno_id: 'g1', inicio: '2026-09-29T09:00:00Z', fin: '2026-09-29T10:00:00Z', motivo: 'Limpieza de planchas: al arrancar', motivo_id: 'mo-limp', categoria: 'programada' },
  { id: 'p2', turno_id: 'g2', inicio: '2026-09-30T09:00:00Z', fin: '2026-09-30T10:00:00Z', motivo: 'Limpieza de planchas: al terminar', motivo_id: 'mo-limp', categoria: 'programada' },
  { id: 'p3', turno_id: 'g1', inicio: '2026-09-29T12:00:00Z', fin: '2026-09-29T12:30:00Z', motivo: 'Corte de cadena: la de abajo', motivo_id: 'mo-cadena', categoria: 'falla' },
  { id: 'p4', turno_id: 'g2', inicio: '2026-09-30T12:00:00Z', fin: '2026-09-30T12:10:00Z', motivo: 'Corte de cadena', motivo_id: 'mo-cadena', categoria: 'falla' },
  { id: 'p5', turno_id: 'g2', inicio: '2026-09-30T13:00:00Z', fin: '2026-09-30T13:15:00Z', motivo: 'Otro motivo: pulpo', motivo_id: 'mo-otro', categoria: 'otro' },
]
function gestion({ paradas = PARADAS_G, fallaParadas = false, maquinas = null } = {}) {
  const G = construirProduccion(ARCHIVO_G)
  G.estado.miRolApp = 'usuario'
  G.estado.misTareas = new Map([['ver', { todas: true }]])
  G.estado.unidades = new Map([['u-cn', 'Cucuruchos Nuss']])
  G.estado.unidadId = 'u-cn'
  G.estado.fechaInd = '2026-09-30'
  Object.assign(G.__tablas, {
    turnos_produccion: TURNOS_G,
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
  const G = gestion()
  const r = await G.leerParadasSemana('u-cn', '2026-09-30', AHORA)
  const qT = G.__llamadas.consultas.find(c => c[0] === 'turnos_produccion')?.[1] ?? []
  chk('gestión: los turnos de la unidad de los 7 días que terminan en el elegido',
    qT.some(f => f[0] === 'eq' && f[1] === 'unidad_negocio_id' && f[2] === 'u-cn') && qT.some(f => f[0] === 'gte' && f[1] === 'fecha' && f[2] === '2026-09-24') &&
    qT.some(f => f[0] === 'lte' && f[1] === 'fecha' && f[2] === '2026-09-30'), JSON.stringify(qT))
  chk('… las paradas de esos turnos, con su categoría', /from\('paradas_produccion'\)\.select\('id, turno_id, inicio, fin, motivo, motivo_id, categoria'\)\.in\('turno_id', ids\)/.test(FUENTE_G))
  const t = r.datos?.totales
  chk('la limpieza (programada) aparte de las fallas', t && t.programada === 120 && t.falla === 40 && t.otro === 15 && t.sin === 0, JSON.stringify(t))
  chk('por máquina: limpieza y lo demás', JSON.stringify(r.datos.porMaquina) ===
    JSON.stringify([{ nombre: 'Máquina 1', limpieza: 60, fallas: 30 }, { nombre: 'Máquina 2', limpieza: 60, fallas: 25 }]), JSON.stringify(r.datos.porMaquina))
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
  const r2 = G.resumenParadasSemana({ turnos: TURNOS_G, paradas: [{ turno_id: 'g1', inicio: '2026-09-29T12:00:00Z', fin: '2026-09-29T12:20:00Z', motivo: 'Se cortó la luz', motivo_id: null, categoria: null }], maquinas: [], motivos: [], ahora: AHORA })
  chk('una parada sin categoría no cuenta como limpieza ni como falla', r2.totales.sin === 20 && r2.totales.programada === 0 && r2.totales.falla === 0 &&
    r2.porMotivo[0]?.nombre === 'Se cortó la luz' && /20 min de otros motivos/.test(sinEtiquetas(G.renderParadasSemana(r2))))
  // La que sigue abierta cuenta hasta ahora.
  const r3 = G.resumenParadasSemana({ turnos: TURNOS_G, paradas: [{ turno_id: 'g2', inicio: '2026-09-30T13:30:00Z', fin: null, motivo: 'Corte de luz', motivo_id: 'mo-luz', categoria: 'falla' }], maquinas: [], motivos: MOTIVOS, ahora: AHORA })
  chk('una parada que sigue abierta cuenta hasta ahora', r3.totales.falla === 30, JSON.stringify(r3.totales))
  chk('una parada de un turno que no es de la semana no cuenta', G.resumenParadasSemana({ turnos: TURNOS_G, paradas: [{ turno_id: 'otro', inicio: '2026-09-29T12:00:00Z', fin: '2026-09-29T13:00:00Z', categoria: 'falla' }], maquinas: [], motivos: [], ahora: AHORA }).cantidad === 0)
  chk('sin paradas: lo dice, sin ceros', /Sin paradas/.test(G.renderParadasSemana({ cantidad: 0, totales: { programada: 0, falla: 0, otro: 0, sin: 0 }, porMaquina: [], porMotivo: [] })) &&
    !/0 min/.test(G.renderParadasSemana({ cantidad: 0, totales: { programada: 0, falla: 0, otro: 0, sin: 0 }, porMaquina: [], porMotivo: [] })))
  chk('un dato que no se entiende no se dibuja como cero', G.renderParadasSemana(null) === null && G.renderParadasSemana({ totales: null }) === null)

  // La tarjeta en los indicadores, y que falla SOLA.
  await G.cargarIndicadores()
  const hi = G.__doc.getElementById('pr-indicadores').innerHTML
  chk('la tarjeta "Paradas de la semana" está en los indicadores', /Paradas de la semana/.test(tarjetaG(hi, 'paradas')) && /limpieza programada/.test(sinEtiquetas(tarjetaG(hi, 'paradas'))))
  const GF = gestion({ fallaParadas: true })
  await GF.cargarIndicadores()
  const hf = GF.__doc.getElementById('pr-indicadores').innerHTML
  chk('si no se pueden leer, SOLO esa tarjeta lo dice, con el mensaje de la base', /No se pudieron leer las paradas\./.test(tarjetaG(hf, 'paradas')) &&
    /permission denied for table paradas_produccion/.test(tarjetaG(hf, 'paradas')) && !/No se pudieron leer las paradas/.test(tarjetaG(hf, 'tiradas')))
  const GC = gestion()
  GC.estado.paradasSemana = { cargando: true }
  chk('mientras carga, dice "Cargando…"', /Cargando…/.test(tarjetaG(GC.htmlIndicadores(null, null), 'paradas')))

  // Los nombres van escapados.
  const GX = gestion({ maquinas: [{ id: 'm-1', nombre: marca('maquina') }, { id: 'm-2', nombre: 'Máquina 2' }] })
  const rx = GX.resumenParadasSemana({ turnos: TURNOS_G, paradas: [...PARADAS_G, { turno_id: 'g1', inicio: '2026-09-29T15:00:00Z', fin: '2026-09-29T15:05:00Z', motivo: marca('motivo'), motivo_id: null, categoria: 'falla' }],
    maquinas: [{ id: 'm-1', nombre: marca('maquina') }], motivos: MOTIVOS, ahora: AHORA })
  chequearMarcas(chk, 'renderParadasSemana', GX.renderParadasSemana(rx), ['maquina', 'motivo'])
})())

fin()
