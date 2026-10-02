// Producción · los horarios de turno CONTRA UNA BASE SIMULADA CON ESTADO
// (01/10/2026). test-produccion-horarios.js mira qué manda la pantalla con
// respuestas fijas; esta corre las MISMAS funciones de la planta contra
// pruebas/base-produccion-simulada.js, que hace lo que la descripción de las
// RPCs dice (cerrar_turno con p_hora_fin, registrar_limpieza_planchas,
// relanzar_con_lote_nuevo, editar_parada, corregir_horario_turno), y mira
// cómo QUEDA la base. Los cuatro casos de Facu:
//  - cerrar a las 13:54 con fin 15:00 → la parada queda de 13:20 a 15:00;
//  - la limpieza "Al terminar" que empezó ahora se guarda sin duración;
//  - "Volvió con lote nuevo" deja el lote viejo para completar y abre el nuevo;
//  - el chip de 8 h manda 14:00 (y la parada termina a las 14:00).
//
//   node pruebas/test-produccion-horarios-base.js

process.env.TZ = 'UTC'

const path = require('path')
const { arnes, leer } = require('./circuito-comun')
const { construirProduccion } = require('./sandbox-produccion')
const { crearBaseProduccion } = require('./base-produccion-simulada')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/produccion.html')
const ARCHIVO_G = process.env.ARCHIVO_GESTION || path.join(__dirname, '..', 'modulos/produccion-gestion.html')
// El sub-proceso dice qué leyó: el runner de mutaciones lo compara.
leer(ARCHIVO)
leer(ARCHIVO_G)
const { chk, esperas, fin } = arnes()

const tic = () => new Promise(r => setImmediate(r))
const el = (S, id) => S.__doc.getElementById(id)

// El 01/10/2026 a las 13:54 de Argentina (16:54 UTC).
const AHORA = new Date('2026-10-01T16:54:00Z')
const HORARIOS = [
  { turno: 'Mañana', hora_inicio: '06:00', hora_fin: '15:00' },
  { turno: 'Tarde', hora_inicio: '15:00', hora_fin: '23:36' },
]
const T1 = { id: 't1', lote: 6210, maquina_id: 'm1', fecha: '2026-10-01', turno: 'Mañana', encargado_id: 'e-fede',
  abierto_en: '2026-10-01T09:02:00Z', estado: 'abierto', hora_inicio: '06:00:00' }
const PARADA = { id: 'pa1', turno_id: 't1', inicio: '2026-10-01T16:20:00Z', fin: null, motivo: 'Corte de cadena', categoria: 'falla' } // 13:20
const OPERARIOS = [
  { turno_id: 't1', empleado_id: 'e-op1', desde: '2026-10-01T09:02:00Z' },
  { turno_id: 't1', empleado_id: 'e-op2', desde: '2026-10-01T09:02:00Z' },
]
const MOTIVOS = [{ id: 'mo-limp', nombre: 'Limpieza de planchas', categoria: 'programada', pide_detalle: false, orden: 1 },
  { id: 'mo-cad', nombre: 'Corte de cadena', categoria: 'falla', pide_detalle: false, orden: 2 }]

function armar({ turnos = [T1], paradas = [], horarios = HORARIOS, operarios = OPERARIOS } = {}) {
  const base = crearBaseProduccion({ ahora: AHORA, horarios, turnos, paradas, operarios })
  const S = construirProduccion(ARCHIVO)
  Object.assign(S.__tablas, base.tablas, { motivos_parada: MOTIVOS })
  S.__setRpc(base.rpc)
  S.estado.unidadId = 'u-nuss'
  S.estado.modo = 'produccion'
  S.estado.persona = { id: 'e-fede', nombre: 'Federico Silva' }
  S.estado.personal = [{ id: 'e-fede', nombre: 'Federico Silva', puestos: ['encargado'] },
    { id: 'e-op1', nombre: 'Ana', puestos: ['operario'] }, { id: 'e-op2', nombre: 'Beto', puestos: ['operario'] }]
  return { S, base }
}

const turnoDe = (base, id) => base.datos.turnos_produccion.find(t => t.id === id)
const paradaDe = (base, id) => base.datos.paradas_produccion.find(p => p.id === id)

// Cierra la planilla abierta desde la pantalla: apagado 13:50, scrap 2 kg y la
// hora de fin que se pida (null = la que viene marcada).
async function cerrarDesdeLaPantalla(S, finElegido = null) {
  await S.mostrarCierre()
  if (finElegido === 'chip 8 h') {
    // Se toca el chip que DICE "8 h", el que dibuja la pantalla.
    const m = /data-fin-chip="(\d\d:\d\d)"[^>]*>[^<]*· 8 h</.exec(el(S, 'pr-cierre-fin-chips').innerHTML)
    S.elegirFinCierre(m?.[1] ?? null)
  } else if (finElegido) S.elegirFinCierre(finElegido)
  S.ponerNumero(el(S, 'pr-cierre-scrap'), 2)
  el(S, 'pr-cierre-hora').value = '13:50'
  S.cambioEnCierre()
  S.estado.cierre.confirmado = true
  S.intentarCerrar()
  for (let i = 0; i < 6; i++) await tic()
}

// ── 0 · La base simulada hace lo que dice la descripción ──────────────────
esperas.push((async () => {
  const { base } = armar({ turnos: [] })
  const r = await base.rpc('abrir_turno', { p_maquina_id: 'm1', p_fecha: '2026-10-01', p_turno: 'Mañana', p_encargado_id: 'e-fede', p_operarios: ['e-op1'] })
  chk('base: abrir_turno pone hora_inicio con el horario del turno (06:00)', turnoDe(base, r.data.turno_id)?.hora_inicio === '06:00:00')
  const s = crearBaseProduccion({ ahora: AHORA, horarios: [] })
  const r2 = await s.rpc('abrir_turno', { p_maquina_id: 'm1', p_fecha: '2026-10-01', p_turno: 'Mañana', p_encargado_id: 'e-fede' })
  chk('base: sin horario, hora_inicio null', s.datos.turnos_produccion.find(t => t.id === r2.data.turno_id)?.hora_inicio === null)
  const g = await base.rpc('guardar_horario_turno', { p_unidad_negocio_id: 'u-dolce', p_turno: 'Noche', p_hora_inicio: '22:00', p_hora_fin: '06:00' })
  chk('base: guardar_horario_turno con p_activo por defecto true', !g.error && base.datos.horarios_turno.some(h => h.unidad_negocio_id === 'u-dolce' && h.turno === 'Noche' && h.activo === true))
  const sin = crearBaseProduccion({ ahora: AHORA, tareas: ['produccion:cargar'] })
  chk('base: guardar_horario_turno pide produccion:configurar', !!(await sin.rpc('guardar_horario_turno', { p_unidad_negocio_id: 'u', p_turno: 'Mañana', p_hora_inicio: '06:00', p_hora_fin: '15:00' })).error)
  const c = crearBaseProduccion({ ahora: AHORA, turnos: [{ ...T1, hora_fin: '15:00:00' }] })
  await c.rpc('corregir_horario_turno', { p_turno_id: 't1', p_hora_inicio: '06:30', p_hora_fin: null })
  chk('base: corregir_horario_turno con p_hora_fin null deja la hora de fin', c.datos.turnos_produccion[0].hora_inicio === '06:30:00' && c.datos.turnos_produccion[0].hora_fin === '15:00:00')
  const cc = crearBaseProduccion({ ahora: AHORA, turnos: [{ ...T1, estado: 'cerrado' }], tareas: ['produccion:cargar'] })
  chk('base: una planilla cerrada pide configurar para corregir el horario', !!(await cc.rpc('corregir_horario_turno', { p_turno_id: 't1', p_hora_inicio: '06:30' })).error)
})())

// ── 1 · Cerrar a las 13:54 con fin 15:00: la parada queda de 13:20 a 15:00 ─
esperas.push((async () => {
  const { S, base } = armar({ paradas: [PARADA] })
  await S.abrirPlanilla('t1')
  await cerrarDesdeLaPantalla(S)
  const llamada = base.llamadas.find(([n]) => n === 'cerrar_turno')?.[1]
  chk('el cierre manda la hora de fin marcada (la del horario, 15:00)', llamada?.p_hora_fin === '15:00', JSON.stringify(llamada))
  const pa = paradaDe(base, 'pa1')
  chk('cerrar 13:54 con fin 15:00 → la parada queda de 13:20 a 15:00',
    Date.parse(pa.inicio) === Date.parse('2026-10-01T16:20:00Z') && pa.fin === '2026-10-01T18:00:00.000Z', JSON.stringify(pa))
  chk('… marcada "no volvió en todo el turno"', pa.hasta_fin_de_turno === true)
  chk('… y la planilla cerrada con hora_fin 15:00', turnoDe(base, 't1').estado === 'cerrado' && turnoDe(base, 't1').hora_fin === '15:00:00')
  chk('la pantalla quedó en "cerrada"', S.estado.vista === 'pr-cerrado', S.estado.vista)
  const lista = S.htmlParadasTurno([pa], null)
  chk('… y la lista dice 13:20 – 15:00, 1 h 40 min y "no volvió en todo el turno"', /13:20 – 15:00/.test(lista) && /1 h 40 min/.test(lista) && /no volvió en todo el turno/.test(lista), lista)
})())

// ── 2 · El chip de 8 h manda 14:00 ────────────────────────────────────────
esperas.push((async () => {
  const { S, base } = armar({ paradas: [PARADA] })
  await S.abrirPlanilla('t1')
  await cerrarDesdeLaPantalla(S, 'chip 8 h')
  const llamada = base.llamadas.find(([n]) => n === 'cerrar_turno')?.[1]
  chk('el chip de 8 h manda p_hora_fin 14:00', llamada?.p_hora_fin === '14:00', JSON.stringify(llamada))
  chk('… y la parada abierta termina a las 14:00', paradaDe(base, 'pa1').fin === '2026-10-01T17:00:00.000Z', paradaDe(base, 'pa1').fin)
  chk('… con hora_fin 14:00 en la planilla', turnoDe(base, 't1').hora_fin === '14:00:00')
})())

// ── 3 · La limpieza "Al terminar" que empezó ahora, sin duración ──────────
esperas.push((async () => {
  const { S, base } = armar()
  await S.abrirPlanilla('t1')
  S.pintarParadas(); await tic(); await tic()
  S.elegirMotivoParada('mo-limp', 'final')
  S.elegirDuracionParada('sigue')
  await S.guardarParadaNueva(AHORA)
  const p = base.datos.paradas_produccion.find(x => x.motivo === 'Limpieza de planchas')
  chk('limpieza "Al terminar" que empezó ahora → se guarda sin duración (abierta)', !!p && p.fin === null, JSON.stringify(p))
  chk('… empieza ahora (13:54) y dice "al terminar"', p?.inicio === AHORA.toISOString() && p?.detalle === 'al terminar', JSON.stringify(p))
  chk('… con p_minutos null', base.llamadas.find(([n]) => n === 'registrar_limpieza_planchas')?.[1]?.p_minutos === null)
  // Si nadie toca "Volvió", el cierre la termina en el fin del turno.
  await S.abrirPlanilla('t1')
  await cerrarDesdeLaPantalla(S)
  const p2 = base.datos.paradas_produccion.find(x => x.motivo === 'Limpieza de planchas')
  chk('… y si no volvió, el cierre la cuenta hasta las 15:00', p2.fin === '2026-10-01T18:00:00.000Z' && p2.hasta_fin_de_turno === true, JSON.stringify(p2))
})())

// ── 4 · "Volvió con lote nuevo" ───────────────────────────────────────────
esperas.push((async () => {
  const { S, base } = armar({ paradas: [PARADA] })
  await S.abrirPlanilla('t1')
  S.pintarParadas()
  S.abrirHoraVentana('relanzar', AHORA)
  await S.confirmarHoraVentana(AHORA)
  for (let i = 0; i < 4; i++) await tic()
  const viejo = turnoDe(base, 't1')
  chk('"Volvió con lote nuevo" deja el lote viejo para completar', viejo.estado === 'pendiente_completar' && viejo.forzado_por === null, JSON.stringify(viejo))
  chk('… con hora_fin = la hora en que volvió (13:54)', viejo.hora_fin === '13:54:00')
  chk('… y la parada terminada a esa hora', paradaDe(base, 'pa1').fin === AHORA.toISOString())
  const nuevo = base.datos.turnos_produccion.find(t => t.id !== 't1')
  chk('… y abre el lote nuevo en la misma máquina, con el mismo encargado', !!nuevo && nuevo.estado === 'abierto' && nuevo.maquina_id === 'm1' && nuevo.encargado_id === 'e-fede' && nuevo.lote === 6211, JSON.stringify(nuevo))
  chk('… desde las 13:54', nuevo?.hora_inicio === '13:54:00')
  const ops = base.datos.turno_operarios.filter(o => o.turno_id === nuevo?.id).map(o => o.empleado_id).sort()
  chk('… con los mismos operarios', JSON.stringify(ops) === '["e-op1","e-op2"]', JSON.stringify(ops))
  chk('la pantalla abre la planilla NUEVA', S.estado.planilla?.turno?.id === nuevo?.id, S.estado.planilla?.turno?.id)
  chk('… avisando "Lote 6210 queda para completar · Ahora la Máquina 1 sigue con el lote 6211"',
    /Lote 6210 queda para completar · Ahora la Máquina 1 sigue con el lote 6211/.test(el(S, 'pr-planilla-estado').innerHTML), el(S, 'pr-planilla-estado').innerHTML)
  const pendientes = base.datos.turnos_produccion.filter(t => t.estado === 'pendiente_completar')
  chk('el tablero dice que falta completar (no "a la fuerza")', /1 planilla falta completar \(productos y scrap\)/.test(S.htmlPendientesCompletar(pendientes, base.datos.maquinas)))
  // Completarla: el mismo cerrar_turno, con la hora de fin ya puesta.
  await S.abrirPlanilla('t1')
  await S.mostrarCierre()
  chk('completar el lote viejo trae marcada su hora de fin (13:54)', el(S, 'pr-cierre-fin').value === '13:54', el(S, 'pr-cierre-fin').value)
  await cerrarDesdeLaPantalla(S)
  chk('… y lo cierra con fin 13:54', turnoDe(base, 't1').estado === 'cerrado' && turnoDe(base, 't1').hora_fin === '13:54:00')
  chk('… sin tocar la parada (ya había vuelto)', paradaDe(base, 'pa1').fin === AHORA.toISOString() && paradaDe(base, 'pa1').hasta_fin_de_turno === false)
})())

// ── 5 · Volvió con lote nuevo a una hora escrita ──────────────────────────
esperas.push((async () => {
  const { S, base } = armar({ paradas: [PARADA] })
  await S.abrirPlanilla('t1')
  S.abrirHoraVentana('relanzar', AHORA)
  for (const t of ['1', '3', '5', '0']) S.teclaHoraVentana(t)
  await S.confirmarHoraVentana(AHORA)
  const nuevo = base.datos.turnos_produccion.find(t => t.id !== 't1')
  chk('lote nuevo a las 13:50: la parada vuelve a las 13:50 y el nuevo arranca a esa hora',
    paradaDe(base, 'pa1').fin === '2026-10-01T16:50:00.000Z' && nuevo?.hora_inicio === '13:50:00' && turnoDe(base, 't1').hora_fin === '13:50:00')
})())

// ── 6 · Corregir el inicio: la hora de fin no se toca ─────────────────────
esperas.push((async () => {
  const { S, base } = armar({ turnos: [{ ...T1, hora_fin: '15:00:00' }] })
  await S.abrirPlanilla('t1')
  S.abrirHoraVentana('inicio', AHORA)
  for (const t of ['0', '6', '3', '0']) S.teclaHoraVentana(t)
  await S.confirmarHoraVentana(AHORA)
  chk('corregir el inicio a 06:30 deja la hora de fin en 15:00', turnoDe(base, 't1').hora_inicio === '06:30:00' && turnoDe(base, 't1').hora_fin === '15:00:00', JSON.stringify(turnoDe(base, 't1')))
  chk('… y la planilla lo muestra', /06:30 – 15:00/.test(el(S, 'pr-planilla-horario').innerHTML), el(S, 'pr-planilla-horario').innerHTML)
})())

// ── 7 · Corregir una parada que no volvió: la marca y su regla ────────────
esperas.push((async () => {
  // Cerrada a las 13:54 con fin 15:00: la parada vuelve a las 15:00, DESPUÉS
  // del cierre. Corregirla sin tocar la vuelta tiene que poder guardarse.
  const cerrada = { ...T1, estado: 'cerrado', cerrado_en: AHORA.toISOString(), hora_fin: '15:00:00' }
  const novolvio = { ...PARADA, fin: '2026-10-01T18:00:00.000Z', hasta_fin_de_turno: true }
  {
    const { S, base } = armar({ turnos: [cerrada], paradas: [novolvio] })
    S.abrirEditorParada({ modo: 'editar', turno: cerrada, paradas: [novolvio], parada: novolvio, contexto: 'planilla' })
    chk('el tope de la vuelta incluye el fin del turno (15:00) aunque se cerró a las 13:54',
      !S.resolverHorasParada(S.estado.paradaForm, cerrada, AHORA).error, JSON.stringify(S.resolverHorasParada(S.estado.paradaForm, cerrada, AHORA)))
    chk('… pero no más allá', !!S.resolverHorasParada({ ...S.estado.paradaForm, fin: '15:30' }, cerrada, AHORA).error)
    chk('"Corregir" avisa que sigue marcada si la vuelta es el fin del turno',
      /Sigue marcada «no volvió en todo el turno»: vuelve a las 15:00/.test(el(S, 'pr-parada-editor-resumen').innerHTML), el(S, 'pr-parada-editor-resumen').innerHTML)
    await S.guardarParada()
    chk('guardar sin tocar la vuelta: editar_parada conserva la marca', paradaDe(base, 'pa1').hasta_fin_de_turno === true && paradaDe(base, 'pa1').fin === '2026-10-01T18:00:00.000Z',
      JSON.stringify([paradaDe(base, 'pa1'), S.estado.paradaForm?.errorBase]))
  }
  {
    const { S, base } = armar({ turnos: [cerrada], paradas: [novolvio] })
    S.abrirEditorParada({ modo: 'editar', turno: cerrada, paradas: [novolvio], parada: novolvio, contexto: 'planilla' })
    S.cambiarHoraParada('fin', -60)
    chk('con otra vuelta (14:00), avisa que deja de estar marcada',
      /deja de estar marcada «no volvió en todo el turno» \(el fin del turno es a las 15:00\)/.test(el(S, 'pr-parada-editor-resumen').innerHTML), el(S, 'pr-parada-editor-resumen').innerHTML)
    await S.guardarParada()
    chk('… y editar_parada apaga la marca', paradaDe(base, 'pa1').hasta_fin_de_turno === false && paradaDe(base, 'pa1').fin === '2026-10-01T17:00:00.000Z', JSON.stringify(paradaDe(base, 'pa1')))
  }
  {
    // Una parada común no tiene nota.
    const { S } = armar({ turnos: [cerrada], paradas: [{ ...PARADA, fin: '2026-10-01T16:40:00Z' }] })
    S.abrirEditorParada({ modo: 'editar', turno: cerrada, paradas: [], parada: { ...PARADA, fin: '2026-10-01T16:40:00Z' }, contexto: 'planilla' })
    chk('una parada que volvió no lleva la nota', el(S, 'pr-parada-editor-resumen').innerHTML === '')
    chk('el turno abierto no extiende el tope (la vuelta no puede ser futura)', S.limitesParada({ ...T1, hora_fin: '15:00:00' }, AHORA).tope === AHORA.getTime() + 5 * 60000)
    chk('finDelTurnoMs: un turno de noche termina al día siguiente',
      new Date(S.finDelTurnoMs({ fecha: '2026-10-01', hora_inicio: '22:00:00', hora_fin: '06:00:00' })).toISOString() === '2026-10-02T09:00:00.000Z')
    chk('finDelTurnoMs: sin hora de fin, null', S.finDelTurnoMs({ fecha: '2026-10-01', hora_inicio: '06:00:00', hora_fin: null }) === null)
  }
})())

// ── 8 · La gestión (historial) tiene la misma regla ───────────────────────
esperas.push((async () => {
  const cerrada = { ...T1, estado: 'cerrado', cerrado_en: AHORA.toISOString(), hora_fin: '15:00:00' }
  const novolvio = { ...PARADA, fin: '2026-10-01T18:00:00.000Z', hasta_fin_de_turno: true }
  const base = crearBaseProduccion({ ahora: AHORA, horarios: HORARIOS, turnos: [cerrada], paradas: [novolvio] })
  const G = construirProduccion(ARCHIVO_G)
  Object.assign(G.__tablas, base.tablas)
  G.__setRpc(base.rpc)
  G.abrirEditorParada({ modo: 'editar', turno: cerrada, paradas: [novolvio], parada: novolvio, contexto: 'historial' })
  chk('gestión: el tope de la vuelta incluye el fin del turno', !G.resolverHorasParada(G.estado.paradaForm, cerrada, AHORA).error)
  chk('gestión: "Corregir" avisa que sigue marcada', /Sigue marcada «no volvió en todo el turno»: vuelve a las 15:00/.test(el(G, 'pr-parada-editor-resumen').innerHTML), el(G, 'pr-parada-editor-resumen').innerHTML)
  G.cambiarHoraParada('fin', -60)
  chk('gestión: con otra vuelta avisa que deja de estar marcada', /deja de estar marcada/.test(el(G, 'pr-parada-editor-resumen').innerHTML))
  chk('gestión: un turno abierto no extiende el tope', G.limitesParada({ ...T1, hora_fin: '15:00:00' }, AHORA).tope === AHORA.getTime() + 5 * 60000)
})())

fin()
