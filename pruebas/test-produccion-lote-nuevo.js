// EL "LOTE NUEVO" POR ERROR EN LA TABLET (pedido del 14/10/2026,
// .claude/pedidos/2026-10-14-tablet.md).
//
// Caso real (14/10 15:03, Máquina 2): la parada "Limpieza de planchas"
// (13:00–14:35) se terminó con "Volvió con lote nuevo". relanzar_con_lote_nuevo
// cerró el lote 6241 y abrió otro como turno MAÑANA a nombre de Federico, justo
// en el cambio de turno; la tarde no pudo abrir su planilla, cerró la otra con
// scrap 9.999.999 para salir y abrió otra más. Cuatro arreglos:
//  1. "Volvió con lote nuevo" pide confirmación con el cartel ("Se va a CERRAR
//     el lote 6241 y se va a ABRIR el lote nuevo en Máquina 2, turno Mañana,
//     encargado …. ¿Confirmás?"), "Sí, abrir lote nuevo" / "No, solo terminar
//     la parada".
//  2. En los últimos 30 minutos del turno o después de su fin (horarios_turno)
//     NO se ofrece el lote nuevo: "Terminar parada" y "Cerrar planilla del
//     turno". Sin horario cargado, se ofrece (con el cartel).
//  3. "Anular, se abrió por error": planilla abierta hace menos de 1 hora y sin
//     cajas ni masas → anular_turno_vacio(p_turno_id, p_motivo); los errores de
//     la base tal cual; la máquina queda sin planilla.
//  4. Scrap: "6.700" (punto de miles) pregunta "¿Quisiste decir 6,7 kg?" antes
//     de mandar; "6,7" y "6.7" son decimales.
//
// Contrato con la base (pg_get_functiondef, 14/10/2026):
//  - relanzar_con_lote_nuevo(p_parada_id, p_hora) → { lote_viejo, turno_id, lote }:
//    abre la planilla nueva con la MISMA fecha, turno y encargado.
//  - anular_turno_vacio(p_turno_id, p_motivo) → { lote_anulado, motivo }.
//  - horarios_turno: Cucuruchos Nuss Mañana 06:00–15:00, Tarde 15:00–23:36.
//  - cerrar_turno rechaza p_scrap_kg > 100.
//
//   node pruebas/test-produccion-lote-nuevo.js
//   ARCHIVO_TEST=<copia de modulos/produccion.html>

process.env.TZ = 'UTC'
const path = require('path')
const { arnes, leer } = require('./circuito-comun')
const { construirProduccion } = require('./sandbox-produccion')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/produccion.html')
// Primero: el runner de mutaciones confirma por esta línea que se leyó el mutado.
const FUENTE = leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

// ── Fuente ─────────────────────────────────────────────────────────────
chk('la ventana de "Anular la planilla": un diálogo con el motivo y sus dos botones',
  /id="pr-anular-planilla" hidden role="dialog" aria-modal="true"/.test(FUENTE) && /id="pr-anular-planilla-motivo" class="pr-input"/.test(FUENTE) &&
  /id="pr-anular-planilla-cancelar">Cancelar</.test(FUENTE) && /id="pr-anular-planilla-confirmar">Anular la planilla</.test(FUENTE))
chk('el botón "No" del cartel corre su acción; afuera y Escape solo lo cierran',
  /getElementById\('pr-confirma-no'\)\.addEventListener\('click', \(\) => responderConfirma\(false\)\)/.test(FUENTE) &&
  /if \(ev\.target\.id === 'pr-confirma'\) responderConfirma\(false, true\)/.test(FUENTE) &&
  /ev\.key === 'Escape' && estado\.confirma\) responderConfirma\(false, true\)/.test(FUENTE))
chk('los botones nuevos están escuchados', /closest\('\[data-hv-cerrar-planilla\]'\)\) return confirmarHoraVentana\(new Date\(\), \{ luegoCerrar: true \}\)/.test(FUENTE) &&
  /closest\('\[data-parada-cerrar-planilla\]'\)\) return guardarParadaNueva\(new Date\(\), \{ luegoCerrar: true \}\)/.test(FUENTE) &&
  /closest\('\[data-anular-error\]'\)\) abrirAnularPorError\(\)/.test(FUENTE) &&
  /getElementById\('pr-anular-planilla-confirmar'\)\.addEventListener\('click', confirmarAnularPorError\)/.test(FUENTE))
chk('la planta importa leerNumeroAr de js/utils.js', /formatearNumeroAr, leerNumeroAr,\n\s*cargarFabricaDePruebas/.test(FUENTE))

// Lo nuevo de este pedido (también está en la lista del sandbox; acá por si
// una suite vieja de la lista no lo trae).
const FUNCIONES = ['finTurnoPlanillaMs', 'loteNuevoSegunHorario', 'textoFinDeTurno', 'textoConfirmaLoteNuevo', 'pedirConfirmaLoteNuevo',
  'irAlCierreDe', 'finParadaFormulario', 'loteNuevoFormulario', 'loteNuevoVentana', 'puedeAnularPorError', 'htmlAnularPorError',
  'abrirAnularPorError', 'cerrarAnularPorError', 'pintarAnularPorError', 'confirmarAnularPorError', 'avisoScrapMiles',
  'preguntaScrapMiles', 'preguntarScrapMiles']
const CONSTANTES = ['MINUTOS_SIN_LOTE_NUEVO', 'MINUTOS_ANULAR_POR_ERROR']

const DIA = '2026-10-14'
// "14:10" del 14/10/2026 en Argentina (−03:00).
const ar = (hhmm, dia = DIA) => new Date(`${dia}T${hhmm}:00-03:00`)
const MIN = 60000
const MOTIVOS = [{ id: 'mo-limp', nombre: 'Limpieza de planchas', categoria: 'programada', pide_detalle: false, orden: 1 }]
const TURNO = {
  id: 't1', lote: 6241, maquina_id: 'm2', fecha: DIA, turno: 'Mañana', encargado_id: 'e-fede',
  abierto_en: '2026-10-14T09:02:00Z', estado: 'abierto', forzado_por: null, forzado_en: null, forzado_motivo: null,
  hora_inicio: '06:00:00', hora_fin: null, hora_largada: '06:10:00',
}
const MANANA = { turno: 'Mañana', hora_inicio: '06:00:00', hora_fin: '15:00:00', activo: true }
const ITEMS = [{ id: 'it-1', orden: 1, sublote: '6241-1', presentacion_id: 'pr-x', marca_id: null, cajas: 10, unidades_por_caja: 100, unidades: 1000, anulado: false }]

function armar({ turno = TURNO, paradas = [], horarios = [MANANA], items = ITEMS, masas = [], rpc = null } = {}) {
  const S = construirProduccion(ARCHIVO, { funciones: FUNCIONES, constantes: CONSTANTES })
  const db = { turno: { ...turno }, paradas: paradas.map(p => ({ ...p })) }
  S.db = db
  Object.assign(S.__tablas, {
    turnos_produccion: filtros => {
      if (filtros.some(f => f[1] === 'estado' && f[2] === 'pendiente_completar')) return { data: [], error: null }
      return { data: db.turno ? [db.turno] : [], error: null }
    },
    turno_operarios: [], masas, produccion_items: items,
    paradas_produccion: () => ({ data: db.paradas, error: null }),
    maquinas: [{ id: 'm2', nombre: 'Máquina 2', orden: 2 }],
    motivos_parada: MOTIVOS,
    horarios_turno: horarios,
  })
  S.__setRpc(rpc ?? (async (n, p) => {
    if (n === 'registrar_parada') {
      const id = 'pa-' + (db.paradas.length + 1)
      db.paradas.push({ id, turno_id: p.p_turno_id, inicio: p.p_inicio, fin: p.p_fin, motivo: p.p_motivo, categoria: null })
      return { data: { parada_id: id }, error: null }
    }
    if (n === 'editar_parada') { const x = db.paradas.find(y => y.id === p.p_parada_id); if (x) x.fin = p.p_fin; return { data: null, error: null } }
    if (n === 'relanzar_con_lote_nuevo') return { data: { lote_viejo: 6241, turno_id: null, lote: 6242 }, error: null }
    // La base borra la planilla: el tablero ya no la trae.
    if (n === 'anular_turno_vacio') { db.turno = null; return { data: { lote_anulado: 6241, motivo: p.p_motivo }, error: null } }
    if (n === 'cerrar_turno') return { data: { lote: 6241, sublotes: [] }, error: null }
    return { data: null, error: null }
  }))
  S.estado.modo = 'produccion'
  S.estado.persona = { id: 'e-fede', nombre: 'Silva Federico' }
  S.estado.personal = [{ id: 'e-fede', nombre: 'Silva Federico', puestos: ['encargado'] }]
  S.estado.tablero = [{ maquina: { id: 'm2', nombre: 'Máquina 2' }, turno: { id: 't1' } }]
  return S
}
const el = (S, id) => S.__doc.getElementById(id)
const html = (S, id) => el(S, id).innerHTML
const rpcs = (S, n) => S.__llamadas.rpc.filter(([x]) => x === n)
const tic = () => new Promise(r => setImmediate(r))
async function escribirHora(S, tipo, numeros, ahora) {
  S.abrirHoraVentana(tipo, ahora)
  for (const d of numeros) S.teclaHoraVentana(d)
  await S.confirmarHoraVentana(ahora)
  await tic()
}
const PARADA_13 = { id: 'pa-7', turno_id: 't1', inicio: '2026-10-14T13:00:00-03:00', fin: null, motivo: 'Limpieza de planchas', categoria: 'programada' }
const CARTEL = 'Se va a CERRAR el lote 6241 y se va a ABRIR el lote nuevo en Máquina 2, turno Mañana, encargado Silva Federico. ¿Confirmás?'

// ═══ 2 · LA REGLA DEL FIN DEL TURNO (pura) ═══════════════════════════════
{
  const S = armar()
  const P = { turno: { ...TURNO }, horario: MANANA }
  const ms = (d) => d.getTime()
  chk('MINUTOS_SIN_LOTE_NUEVO es 30', S.MINUTOS_SIN_LOTE_NUEVO === 30)
  chk('el fin del turno Mañana: las 15:00 del día del turno', S.finTurnoPlanillaMs(P) === ms(ar('15:00')), String(S.finTurnoPlanillaMs(P)))
  const r = (finParada, ahora, p = P) => S.loteNuevoSegunHorario(p, finParada == null ? null : ms(ar(finParada)), ar(ahora))
  chk('parada hasta 14:00 a las 14:10: se ofrece', r('14:00', '14:10').ofrecer === true && r('14:00', '14:10').fin === '15:00', JSON.stringify(r('14:00', '14:10')))
  chk('parada hasta 14:29 a las 14:29: se ofrece (un minuto antes del borde)', r('14:29', '14:29').ofrecer === true)
  chk('parada hasta 14:30 a las 14:30: NO (empiezan los últimos 30 minutos)', r('14:30', '14:30').ofrecer === false)
  chk('parada hasta 14:30 tocada a las 14:20 (la hora de la parada manda): NO', r('14:30', '14:20').ofrecer === false)
  chk('EL CASO REAL: hasta 14:35, tocada a las 15:03: NO, y dice que el turno es hasta las 15:00',
    r('14:35', '15:03').ofrecer === false && r('14:35', '15:03').fin === '15:00')
  chk('parada hasta 13:00 pero tocada a las 15:10 (ya pasó el fin): NO', r('13:00', '15:10').ofrecer === false)
  chk('parada hasta 13:00 tocada a las 14:29: se ofrece', r('13:00', '14:29').ofrecer === true)
  chk('… tocada a las 14:30: NO (cuenta también la hora de ahora)', r('13:00', '14:30').ofrecer === false)
  chk('sin hora de la parada todavía: decide la hora de ahora (14:00 sí, 14:31 no)', r(null, '14:00').ofrecer === true && r(null, '14:31').ofrecer === false)
  chk('una planilla de otro día (13/10) a las 10:00 del 14: NO', r(null, '10:00', { turno: { ...TURNO, fecha: '2026-10-13' }, horario: MANANA }).ofrecer === false)
  const sinHorario = { turno: { ...TURNO }, horario: null }
  chk('SIN horario cargado: no se puede saber, se ofrece (con el cartel) y no hay fin', S.finTurnoPlanillaMs(sinHorario) === null &&
    r('14:35', '15:03', sinHorario).ofrecer === true && r('14:35', '15:03', sinHorario).fin === '')
  chk('… un horario sin hora de fin es lo mismo que no tenerlo', r('23:00', '23:59', { turno: { ...TURNO }, horario: { turno: 'Mañana', hora_inicio: '06:00:00', hora_fin: null } }).ofrecer === true)
  const tarde = { turno: { ...TURNO, turno: 'Tarde', hora_inicio: '15:00:00' }, horario: { turno: 'Tarde', hora_inicio: '15:00:00', hora_fin: '23:36:00', activo: true } }
  chk('Tarde (15:00–23:36): 23:05 sí, 23:06 no', r('23:05', '23:05', tarde).ofrecer === true && r('23:06', '23:06', tarde).ofrecer === false && r('23:06', '23:06', tarde).fin === '23:36')
  const noche = { turno: { ...TURNO, turno: 'Noche', hora_inicio: '22:00:00' }, horario: { turno: 'Noche', hora_inicio: '22:00:00', hora_fin: '06:00:00', activo: true } }
  const DIA_SIG = '2026-10-15'
  chk('Noche (22:00–06:00): el fin es las 06:00 del día SIGUIENTE', S.finTurnoPlanillaMs(noche) === ms(ar('06:00', DIA_SIG)))
  chk('… a las 23:00 del día del turno se ofrece; a las 05:00 del siguiente también; a las 05:31, no',
    S.loteNuevoSegunHorario(noche, ms(ar('23:00')), ar('23:00')).ofrecer === true &&
    S.loteNuevoSegunHorario(noche, ms(ar('05:00', DIA_SIG)), ar('05:00', DIA_SIG)).ofrecer === true &&
    S.loteNuevoSegunHorario(noche, ms(ar('05:31', DIA_SIG)), ar('05:31', DIA_SIG)).ofrecer === false)
  // La planilla que ya es un lote nuevo: relanzar le pone hora_inicio = la
  // hora del relanzado (15:03). Con esa hora, el fin de las 15:00 pasaría al
  // día siguiente y se ofrecería otra vez el lote nuevo.
  const relanzada = { turno: { ...TURNO, hora_inicio: '15:03:00' }, horario: MANANA }
  chk('la planilla relanzada a las 15:03 (hora_inicio 15:03): el fin sigue siendo las 15:00 de ESE día',
    S.finTurnoPlanillaMs(relanzada) === ms(ar('15:00')) && r('15:10', '15:10', relanzada).ofrecer === false, String(S.finTurnoPlanillaMs(relanzada)))
  const conFin = { turno: { ...TURNO, hora_fin: '12:00:00' }, horario: MANANA }
  chk('con hora_fin propia en la planilla manda esa (12:00), no la del horario', S.finTurnoPlanillaMs(conFin) === ms(ar('12:00')) &&
    r(null, '11:29', conFin).ofrecer === true && r(null, '11:30', conFin).ofrecer === false)
  chk('el texto del fin del turno', S.textoFinDeTurno('15:00') === 'El turno termina a las 15:00: a esta hora no se abre un lote nuevo.')
}

// ═══ 4 · EL SCRAP CON PUNTO DE MILES (pura) ═══════════════════════════════
{
  const S = armar()
  const casos = [
    // [texto, valor, sugerido] — null = no se avisa.
    ['6.700', 6700, 6.7], ['1.000', 1000, 1], ['12.500', 12500, 12.5], ['1.234', 1234, 1.234], ['100.000', 100000, 100],
    ['999.999', 999999, 999.999], ['67.000', 67000, 67], ['1.050', 1050, 1.05], [' 6.700 ', 6700, 6.7],
    ['9.999.999', 9999999, null], ['1.000.000', 1000000, null], ['6.700,5', 6700.5, null], ['1.000,25', 1000.25, null],
  ]
  for (const [texto, valor, sugerido] of casos) {
    const a = S.avisoScrapMiles(texto)
    chk(`scrap «${texto}»: avisa (${valor} kg, sugiere ${sugerido})`, !!a && a.valor === valor && a.sugerido === sugerido, JSON.stringify(a))
  }
  const sinAviso = ['6,7', '6.7', '6.70', '0.700', '0,700', '6,700', '0.5', '1.5', '999.5', '999', '1000', '100', '6', '0',
    '', null, undefined, 'abc', '6.7000', '06.700', '1.00.000', '-6.700']
  for (const t of sinAviso) chk(`scrap «${t}»: no avisa`, S.avisoScrapMiles(t) === null, JSON.stringify(S.avisoScrapMiles(t)))
  const q = S.preguntaScrapMiles({ valor: 6700, sugerido: 6.7 })
  chk('el cartel: «¿Quisiste decir 6,7 kg?», con "Sí, 6,7 kg" y "No, fueron 6.700 kg"', q.titulo === '¿Quisiste decir 6,7 kg?' &&
    q.si === 'Sí, 6,7 kg' && q.no === 'No, fueron 6.700 kg' && /Escribiste 6\.700 kg de scrap/.test(q.texto), JSON.stringify(q))
  const q2 = S.preguntaScrapMiles({ valor: 9999999, sugerido: null })
  chk('sin sugerencia: «¿Fueron 9.999.999 kg de scrap?», "Corregir el número" y "Sí, fueron 9.999.999 kg"',
    q2.titulo === '¿Fueron 9.999.999 kg de scrap?' && q2.si === 'Corregir el número' && q2.no === 'Sí, fueron 9.999.999 kg', JSON.stringify(q2))
  chk('… 1.234 sugiere 1,234 kg (los tres decimales)', S.preguntaScrapMiles({ valor: 1234, sugerido: 1.234 }).titulo === '¿Quisiste decir 1,234 kg?')
}

// ═══ 3 · ¿SE OFRECE "ANULAR, SE ABRIÓ POR ERROR"? (pura) ══════════════════
{
  const S = armar()
  const abierto = '2026-10-14T09:02:00Z'
  const P = (cambios = {}, resto = {}) => ({ turno: { ...TURNO, abierto_en: abierto, ...cambios }, items: [], masas: [], ...resto })
  const t0 = new Date(abierto).getTime()
  const en = (min) => new Date(t0 + min * MIN)
  chk('MINUTOS_ANULAR_POR_ERROR es 60', S.MINUTOS_ANULAR_POR_ERROR === 60)
  chk('recién abierta, vacía: sí', S.puedeAnularPorError(P(), en(10), []) === true)
  chk('a los 59 minutos: sí', S.puedeAnularPorError(P(), en(59), []) === true)
  chk('a los 60 minutos: no (lo anula quien configura, desde la base)', S.puedeAnularPorError(P(), en(60), []) === false)
  chk('el reloj de la tablet 2 minutos atrasado: sí; 10 minutos: no', S.puedeAnularPorError(P(), en(-2), []) === true && S.puedeAnularPorError(P(), en(-10), []) === false)
  chk('con una caja cargada (aunque esté anulada): no', S.puedeAnularPorError(P({}, { items: [{ id: 'x', anulado: true }] }), en(10), []) === false)
  chk('con una masa: no', S.puedeAnularPorError(P({}, { masas: [{ id: 'm' }] }), en(10), []) === false)
  chk('pendiente de completar o cerrada: no', S.puedeAnularPorError(P({ estado: 'pendiente_completar' }), en(10), []) === false &&
    S.puedeAnularPorError(P({ estado: 'cerrado' }), en(10), []) === false)
  chk('con el cierre en la cola: no', S.puedeAnularPorError(P({ cierreCola: { estado: 'pendiente' } }), en(10), []) === false)
  chk('con algo de esta planilla esperando en la cola: no', S.puedeAnularPorError(P(), en(10), [{ grupo: 't1', estado: 'pendiente' }]) === false)
  chk('… lo de OTRA planilla, o lo ya enviado, no cuenta', S.puedeAnularPorError(P(), en(10), [{ grupo: 't9', estado: 'pendiente' }, { grupo: 't1', estado: 'enviado' }]) === true)
  chk('sin hora de apertura (o una que no es fecha): no', S.puedeAnularPorError(P({ abierto_en: null }), en(10), []) === false &&
    S.puedeAnularPorError(P({ abierto_en: undefined }), en(10), []) === false && S.puedeAnularPorError(P({ abierto_en: 'ayer' }), en(10), []) === false)
  chk('sin planilla: no', S.puedeAnularPorError(null, en(10), []) === false)
  S.estado.colaLista = []
  chk('el botón: «Anular, se abrió por error», solo cuando corresponde', /data-anular-error="1">Anular, se abrió por error</.test(S.htmlAnularPorError(P(), en(10))) &&
    S.htmlAnularPorError(P(), en(61)) === '')
}

esperas.push((async () => {
  // ═══ 1 · EL CARTEL DE "VOLVIÓ CON LOTE NUEVO", desde "Volvió a las…" ═══
  {
    const AHORA = ar('14:10')
    const S = armar({ paradas: [PARADA_13] })
    await S.abrirPlanilla('t1', 'pr-paradas')
    S.abrirHoraVentana('volvio', AHORA)
    for (const d of '1400') S.teclaHoraVentana(d)
    chk('a las 14:10, la ventana ofrece "Volvió con lote nuevo"', /data-hv-lote-nuevo="1"/.test(html(S, 'pr-hora-ventana-hora')) &&
      !/data-hv-cerrar-planilla/.test(html(S, 'pr-hora-ventana-hora')) && el(S, 'pr-hora-ventana-guardar').textContent === 'Guardar')
    S.alternarLoteNuevoVentana()
    await S.confirmarHoraVentana(AHORA)
    await tic()
    chk('tocar "Volvió con lote nuevo" NO relanza: muestra el cartel', rpcs(S, 'relanzar_con_lote_nuevo').length === 0 && rpcs(S, 'editar_parada').length === 0 &&
      el(S, 'pr-confirma').hidden === false)
    chk('el cartel, con los datos de la planilla: lote, máquina, turno y encargado', el(S, 'pr-confirma-texto').textContent === CARTEL, el(S, 'pr-confirma-texto').textContent)
    chk('… y los dos botones grandes', el(S, 'pr-confirma-si').textContent === 'Sí, abrir lote nuevo' && el(S, 'pr-confirma-no').textContent === 'No, solo terminar la parada' &&
      S.estado.confirma?.grande === true)
    S.responderConfirma(false, true)
    await tic()
    chk('tocar afuera del cartel no manda nada (ni lote nuevo ni terminar)', rpcs(S, 'relanzar_con_lote_nuevo').length === 0 && rpcs(S, 'editar_parada').length === 0 &&
      el(S, 'pr-confirma').hidden === true && el(S, 'pr-hora-ventana').hidden === false)
    await S.confirmarHoraVentana(AHORA)
    S.responderConfirma(false)
    await tic()
    chk('"No, solo terminar la parada": editar_parada a las 14:00 y NADA de lote nuevo', rpcs(S, 'relanzar_con_lote_nuevo').length === 0 &&
      JSON.stringify(rpcs(S, 'editar_parada')[0]?.[1]) === '{"p_parada_id":"pa-7","p_motivo":"Limpieza de planchas","p_inicio":"2026-10-14T13:00:00-03:00","p_fin":"2026-10-14T14:00:00-03:00"}',
      JSON.stringify(S.__llamadas.rpc))
    chk('… y el botón de "No" vuelve a decir "No, seguir" para la próxima pregunta', (S.pedirConfirmacion({ titulo: 'x', texto: 'y', si: 'Sí' }, () => {}), el(S, 'pr-confirma-no').textContent === 'No, seguir'))
    // "Sí, abrir lote nuevo"
    const Y = armar({ paradas: [PARADA_13] })
    await Y.abrirPlanilla('t1', 'pr-paradas')
    Y.abrirHoraVentana('volvio', AHORA)
    for (const d of '1400') Y.teclaHoraVentana(d)
    Y.alternarLoteNuevoVentana()
    await Y.confirmarHoraVentana(AHORA)
    Y.responderConfirma(true)
    await tic()
    chk('"Sí, abrir lote nuevo": relanzar_con_lote_nuevo a las 14:00', JSON.stringify(rpcs(Y, 'relanzar_con_lote_nuevo')[0]?.[1]) ===
      '{"p_parada_id":"pa-7","p_hora":"2026-10-14T14:00:00-03:00"}' && rpcs(Y, 'editar_parada').length === 0, JSON.stringify(Y.__llamadas.rpc))
    // Sin el encargado en el personal, el cartel no inventa un nombre.
    const N = armar()
    N.estado.personal = []
    chk('sin el nombre del encargado, el cartel no dice "encargado —"', N.textoConfirmaLoteNuevo({ turno: TURNO, maquinaNombre: 'Máquina 2' }) ===
      'Se va a CERRAR el lote 6241 y se va a ABRIR el lote nuevo en Máquina 2, turno Mañana. ¿Confirmás?')
  }

  // ═══ 1 · EL CARTEL, desde el formulario de Paró ═══════════════════════
  {
    const AHORA = ar('14:10')
    const S = armar()
    await S.abrirPlanilla('t1', 'pr-paradas')
    await S.asegurarMotivosParada()
    S.elegirMotivoParada('mo-limp')
    await escribirHora(S, 'desde', '1300', AHORA)
    await escribirHora(S, 'hasta', '1400', AHORA)
    chk('Paró de 13:00 a 14:00, a las 14:10: la casilla "Volvió con lote nuevo"', /data-parada-lote-nuevo="1" aria-pressed="false"/.test(html(S, 'pr-parada-hora')) &&
      !/data-parada-cerrar-planilla/.test(html(S, 'pr-parada-hora')), html(S, 'pr-parada-hora'))
    S.alternarLoteNuevoParada(AHORA)
    await S.guardarParadaNueva(AHORA)
    await tic()
    chk('Guardar con lote nuevo NO manda nada: muestra el cartel', S.__llamadas.rpc.filter(([n]) => ['registrar_parada', 'relanzar_con_lote_nuevo'].includes(n)).length === 0 &&
      el(S, 'pr-confirma').hidden === false && el(S, 'pr-confirma-texto').textContent === CARTEL, el(S, 'pr-confirma-texto').textContent)
    S.responderConfirma(true)
    await tic(); await tic()
    chk('"Sí": la parada entra abierta y relanzar la termina a las 14:00', rpcs(S, 'registrar_parada')[0]?.[1]?.p_fin === null &&
      JSON.stringify(rpcs(S, 'relanzar_con_lote_nuevo')[0]?.[1]) === '{"p_parada_id":"pa-1","p_hora":"2026-10-14T14:00:00-03:00"}', JSON.stringify(S.__llamadas.rpc))
    const N = armar()
    await N.abrirPlanilla('t1', 'pr-paradas')
    await N.asegurarMotivosParada()
    N.elegirMotivoParada('mo-limp')
    await escribirHora(N, 'desde', '1300', AHORA)
    await escribirHora(N, 'hasta', '1400', AHORA)
    N.alternarLoteNuevoParada(AHORA)
    await N.guardarParadaNueva(AHORA)
    N.responderConfirma(false)
    await tic(); await tic()
    chk('"No, solo terminar la parada": registrar_parada de 13:00 a 14:00 y ningún relanzar', rpcs(N, 'relanzar_con_lote_nuevo').length === 0 &&
      JSON.stringify(rpcs(N, 'registrar_parada')[0]?.[1]) === '{"p_turno_id":"t1","p_motivo":"Limpieza de planchas","p_inicio":"2026-10-14T13:00:00-03:00","p_fin":"2026-10-14T14:00:00-03:00"}',
      JSON.stringify(N.__llamadas.rpc))
  }

  // ═══ 2 · AL FINAL DEL TURNO: "Terminar parada" y "Cerrar planilla del turno" ═══
  {
    // EL CASO REAL: la parada de las 13:00 termina 14:35 y se carga a las 15:03.
    const AHORA = ar('15:03')
    const S = armar({ paradas: [PARADA_13] })
    await S.abrirPlanilla('t1', 'pr-paradas')
    S.abrirHoraVentana('volvio', AHORA)
    for (const d of '1435') S.teclaHoraVentana(d)
    chk('15:03, vuelta 14:35: NO se ofrece "Volvió con lote nuevo"', !/data-hv-lote-nuevo/.test(html(S, 'pr-hora-ventana-hora')), html(S, 'pr-hora-ventana-hora'))
    chk('… se ofrece "Cerrar planilla del turno"', /data-hv-cerrar-planilla="1">Cerrar planilla del turno</.test(html(S, 'pr-hora-ventana-hora')))
    chk('… el botón de guardar dice "Terminar parada"', el(S, 'pr-hora-ventana-guardar').textContent === 'Terminar parada', el(S, 'pr-hora-ventana-guardar').textContent)
    chk('… y la nota dice hasta qué hora es el turno', /El turno termina a las 15:00: a esta hora no se abre un lote nuevo\./.test(el(S, 'pr-hora-ventana-nota').textContent),
      el(S, 'pr-hora-ventana-nota').textContent)
    S.alternarLoteNuevoVentana()
    chk('… tocar donde estaba la casilla no marca el lote nuevo', S.estado.horaForm.loteNuevo === false)
    // Aunque quedara marcado (la ventana abierta desde antes), al mandar no relanza.
    S.estado.horaForm.loteNuevo = true
    await S.confirmarHoraVentana(AHORA)
    await tic()
    chk('marcado a la fuerza, al mandar tampoco relanza: lo dice', rpcs(S, 'relanzar_con_lote_nuevo').length === 0 && rpcs(S, 'editar_parada').length === 0 &&
      /El turno termina a las 15:00/.test(el(S, 'pr-hora-ventana-error').textContent), el(S, 'pr-hora-ventana-error').textContent)
    // "Cerrar planilla del turno" nunca relanza, aunque quedara marcado.
    S.estado.horaForm.loteNuevo = true
    S.estado.horaForm.errorBase = ''
    await S.confirmarHoraVentana(AHORA, { luegoCerrar: true })
    await tic(); await tic()
    chk('"Cerrar planilla del turno": termina la parada a las 14:35 (editar_parada)', JSON.stringify(rpcs(S, 'editar_parada')[0]?.[1]) ===
      '{"p_parada_id":"pa-7","p_motivo":"Limpieza de planchas","p_inicio":"2026-10-14T13:00:00-03:00","p_fin":"2026-10-14T14:35:00-03:00"}' &&
      rpcs(S, 'relanzar_con_lote_nuevo').length === 0, JSON.stringify(S.__llamadas.rpc))
    chk('… y pasa al cierre de esa planilla', S.estado.vista === 'pr-cierre' && el(S, 'pr-hora-ventana').hidden === true, S.estado.vista)
    // "Terminar parada" (el botón de siempre): termina y se queda.
    const T = armar({ paradas: [PARADA_13] })
    await T.abrirPlanilla('t1', 'pr-paradas')
    await escribirHora(T, 'volvio', '1435', AHORA)
    chk('"Terminar parada": editar_parada a las 14:35, sin cartel y sin ir al cierre', rpcs(T, 'editar_parada')[0]?.[1]?.p_fin === '2026-10-14T14:35:00-03:00' &&
      T.estado.confirma == null && T.estado.vista === 'pr-paradas', T.estado.vista)
    // Parada que terminó temprano (13:30) pero cargada a las 15:10: tampoco.
    const L = armar({ paradas: [PARADA_13] })
    await L.abrirPlanilla('t1', 'pr-paradas')
    L.abrirHoraVentana('volvio', ar('15:10'))
    for (const d of '1330') L.teclaHoraVentana(d)
    chk('vuelta 13:30 cargada a las 15:10 (ya pasó el fin): tampoco se ofrece', !/data-hv-lote-nuevo/.test(html(L, 'pr-hora-ventana-hora')) &&
      /data-hv-cerrar-planilla/.test(html(L, 'pr-hora-ventana-hora')))
    // Sin horario cargado (Dolce Pasta, Taller…): se ofrece, siempre con el cartel.
    const H = armar({ paradas: [PARADA_13], horarios: [] })
    await H.abrirPlanilla('t1', 'pr-paradas')
    H.abrirHoraVentana('volvio', AHORA)
    for (const d of '1435') H.teclaHoraVentana(d)
    chk('SIN horario: a las 15:03 se ofrece "Volvió con lote nuevo"', /data-hv-lote-nuevo/.test(html(H, 'pr-hora-ventana-hora')) && el(H, 'pr-hora-ventana-guardar').textContent === 'Guardar')
    H.alternarLoteNuevoVentana()
    await H.confirmarHoraVentana(AHORA)
    chk('… y pide el cartel antes de relanzar', rpcs(H, 'relanzar_con_lote_nuevo').length === 0 && el(H, 'pr-confirma').hidden === false &&
      el(H, 'pr-confirma-texto').textContent === CARTEL)
  }
  {
    // El formulario de Paró al final del turno.
    const AHORA = ar('14:40')
    const S = armar()
    await S.abrirPlanilla('t1', 'pr-paradas')
    await S.asegurarMotivosParada()
    S.elegirMotivoParada('mo-limp')
    await escribirHora(S, 'desde', '1300', AHORA)
    await escribirHora(S, 'hasta', '1435', AHORA)
    chk('Paró 13:00–14:35 a las 14:40: sin la casilla del lote nuevo', !/data-parada-lote-nuevo/.test(html(S, 'pr-parada-hora')), html(S, 'pr-parada-hora'))
    chk('… dice hasta cuándo es el turno y ofrece "Cerrar planilla del turno"', /data-parada-fin-turno="1">El turno termina a las 15:00/.test(html(S, 'pr-parada-hora')) &&
      /data-parada-cerrar-planilla="1">Cerrar planilla del turno</.test(html(S, 'pr-parada-hora')))
    S.alternarLoteNuevoParada(AHORA)
    chk('… y el lote nuevo no se puede marcar', S.estado.paradaNueva.loteNuevo === false)
    S.estado.paradaNueva.loteNuevo = true
    chk('marcado a la fuerza: lo que falta lo dice', S.faltanParaParadaNueva(S.estado.paradaNueva, S.estado.planilla, AHORA)
      .includes('El turno termina a las 15:00: a esta hora no se abre un lote nuevo.'))
    S.estado.paradaNueva.loteNuevo = false
    await S.guardarParadaNueva(AHORA, { luegoCerrar: true })
    await tic(); await tic()
    chk('"Cerrar planilla del turno": guarda la parada de 13:00 a 14:35 y pasa al cierre', rpcs(S, 'relanzar_con_lote_nuevo').length === 0 &&
      rpcs(S, 'registrar_parada')[0]?.[1]?.p_fin === '2026-10-14T14:35:00-03:00' && S.estado.vista === 'pr-cierre', JSON.stringify(S.__llamadas.rpc) + ' ' + S.estado.vista)
    // Con HASTA a las 14:29 y son las 14:29: todavía se ofrece.
    const A = armar()
    await A.abrirPlanilla('t1', 'pr-paradas')
    await A.asegurarMotivosParada()
    A.elegirMotivoParada('mo-limp')
    await escribirHora(A, 'desde', '1300', ar('14:29'))
    await escribirHora(A, 'hasta', '1429', ar('14:29'))
    chk('Paró hasta 14:29 a las 14:29: la casilla sigue', /data-parada-lote-nuevo="1"/.test(html(A, 'pr-parada-hora')))
    // Marcada con HASTA 14:00 a las 14:10, y después HASTA pasa a 14:35: se desmarca.
    const D = armar()
    await D.abrirPlanilla('t1', 'pr-paradas')
    await D.asegurarMotivosParada()
    D.elegirMotivoParada('mo-limp')
    await escribirHora(D, 'desde', '1300', ar('14:10'))
    await escribirHora(D, 'hasta', '1400', ar('14:10'))
    D.alternarLoteNuevoParada(ar('14:10'))
    chk('marcada a las 14:10 con HASTA 14:00', D.estado.paradaNueva.loteNuevo === true)
    // Todavía a las 14:10, HASTA 14:35 (futura: no se puede mandar) ya cae en
    // los últimos 30 minutos: la regla mira la hora escrita igual.
    await escribirHora(D, 'hasta', '1435', ar('14:10'))
    chk('a las 14:10, HASTA 14:35 (futura) ya no ofrece el lote nuevo', D.estado.paradaNueva.loteNuevo === false &&
      /data-parada-cerrar-planilla/.test(html(D, 'pr-parada-hora')) && !/data-parada-lote-nuevo/.test(html(D, 'pr-parada-hora')))
    await escribirHora(D, 'hasta', '1435', ar('14:40'))
    chk('… HASTA pasa a 14:35 (son 14:40): se desmarca sola y queda "Cerrar planilla del turno"', D.estado.paradaNueva.loteNuevo === false &&
      /data-parada-cerrar-planilla/.test(html(D, 'pr-parada-hora')))
    await D.guardarParadaNueva(ar('14:40'))
    await tic()
    chk('… y Guardar la manda terminada, sin cartel ni lote nuevo', D.estado.confirma == null && rpcs(D, 'relanzar_con_lote_nuevo').length === 0 &&
      rpcs(D, 'registrar_parada')[0]?.[1]?.p_fin === '2026-10-14T14:35:00-03:00')
  }

  // ═══ 3 · "ANULAR, SE ABRIÓ POR ERROR" en la planilla ═══════════════════
  {
    const recien = new Date(Date.now() - 10 * MIN).toISOString()
    const vacia = { turno: { ...TURNO, abierto_en: recien }, items: [] }
    const S = armar(vacia)
    await S.abrirPlanilla('t1')
    chk('planilla recién abierta y vacía: el botón arriba', /data-anular-error="1"/.test(html(S, 'pr-planilla-estado')), html(S, 'pr-planilla-estado'))
    const C = armar({ turno: { ...TURNO, abierto_en: recien } })
    await C.abrirPlanilla('t1')
    chk('con cajas cargadas: sin el botón', !/data-anular-error/.test(html(C, 'pr-planilla-estado')))
    const V = armar({ ...vacia, turno: { ...TURNO, abierto_en: new Date(Date.now() - 61 * MIN).toISOString() } })
    await V.abrirPlanilla('t1')
    chk('abierta hace más de una hora: sin el botón', !/data-anular-error/.test(html(V, 'pr-planilla-estado')))
    S.abrirAnularPorError()
    chk('el botón abre la ventana con el lote', el(S, 'pr-anular-planilla').hidden === false && el(S, 'pr-anular-planilla-titulo').textContent === 'Anular la planilla del lote 6241')
    el(S, 'pr-anular-planilla-motivo').value = 'ab'
    await S.confirmarAnularPorError()
    chk('motivo de menos de 3 letras: no se manda y se dice', rpcs(S, 'anular_turno_vacio').length === 0 &&
      el(S, 'pr-anular-planilla-error').textContent === 'Escribí por qué se anula, con tres letras por lo menos.' && el(S, 'pr-anular-planilla-error').hidden === false)
    S.__nav.onLine = false
    el(S, 'pr-anular-planilla-motivo').value = 'Máquina equivocada'
    await S.confirmarAnularPorError()
    chk('sin internet: no se manda y se dice', rpcs(S, 'anular_turno_vacio').length === 0 && /^Sin internet no se puede anular/.test(el(S, 'pr-anular-planilla-error').textContent))
    S.__nav.onLine = true
    el(S, 'pr-anular-planilla-motivo').value = '  Máquina equivocada  '
    await S.confirmarAnularPorError()
    await tic()
    chk('anular_turno_vacio con la planilla y el motivo sin espacios', JSON.stringify(rpcs(S, 'anular_turno_vacio')[0]?.[1]) === '{"p_turno_id":"t1","p_motivo":"Máquina equivocada"}',
      JSON.stringify(rpcs(S, 'anular_turno_vacio')))
    chk('… avisa el lote anulado', S.__llamadas.exitos.some(m => /Se anuló la planilla del lote 6241/.test(m)), JSON.stringify(S.__llamadas.exitos))
    chk('… la ventana se cierra y la máquina queda SIN planilla abierta (vuelve al tablero)', el(S, 'pr-anular-planilla').hidden === true &&
      S.estado.planilla === null && S.estado.vista === 'pr-produccion' && (S.estado.tablero ?? []).every(x => x.turno?.id !== 't1'), S.estado.vista)
    // El error de la base, tal cual.
    const MSG = 'Pasó más de una hora desde que se abrió: pedile a quien configura producción que la anule.'
    const E = armar({ ...vacia, rpc: async () => ({ data: null, error: { message: MSG } }) })
    await E.abrirPlanilla('t1')
    E.abrirAnularPorError()
    el(E, 'pr-anular-planilla-motivo').value = 'Se abrió de más'
    await E.confirmarAnularPorError()
    chk('el error de la base TAL CUAL, la ventana sigue y la planilla también', el(E, 'pr-anular-planilla-error').textContent === MSG &&
      el(E, 'pr-anular-planilla').hidden === false && E.estado.planilla?.turno?.id === 't1' && el(E, 'pr-anular-planilla-confirmar').disabled === false)
    E.cerrarAnularPorError()
    chk('Cancelar cierra la ventana', el(E, 'pr-anular-planilla').hidden === true && E.estado.anularPlanilla === null)
  }

  // ═══ 4 · EL SCRAP AL CERRAR ═══════════════════════════════════════════
  {
    async function cierre(scrap) {
      const S = armar()
      await S.abrirPlanilla('t1')
      await S.mostrarCierre()
      S.ponerHoraCierre('14:50')
      S.ponerNumero(el(S, 'pr-cierre-scrap'), scrap)
      S.cambioEnCierre()
      return S
    }
    const S = await cierre(6700)
    chk('el campo muestra "6.700"', el(S, 'pr-cierre-scrap').value === '6.700', el(S, 'pr-cierre-scrap').value)
    S.intentarCerrar()
    await tic()
    chk('"6.700": NO se manda; pregunta «¿Quisiste decir 6,7 kg?»', rpcs(S, 'cerrar_turno').length === 0 && el(S, 'pr-confirma').hidden === false &&
      el(S, 'pr-confirma-titulo').textContent === '¿Quisiste decir 6,7 kg?')
    S.responderConfirma(true)
    await tic()
    chk('"Sí, 6,7 kg": el campo queda 6,7 y se cierra con 6,7 kg', el(S, 'pr-cierre-scrap').value === '6,70' || el(S, 'pr-cierre-scrap').value === '6,7')
    chk('… cerrar_turno con p_scrap_kg 6.7', rpcs(S, 'cerrar_turno')[0]?.[1]?.p_scrap_kg === 6.7, JSON.stringify(rpcs(S, 'cerrar_turno')[0]?.[1]))
    const N = await cierre(6700)
    N.intentarCerrar()
    N.responderConfirma(false)
    await tic()
    chk('"No, fueron 6.700 kg": se manda igual (la base dice si es demasiado)', rpcs(N, 'cerrar_turno')[0]?.[1]?.p_scrap_kg === 6700, JSON.stringify(rpcs(N, 'cerrar_turno')))
    const A = await cierre(6700)
    A.intentarCerrar()
    A.responderConfirma(false, true)
    await tic()
    chk('tocar afuera: ni corrige ni manda', rpcs(A, 'cerrar_turno').length === 0 && el(A, 'pr-cierre-scrap').value === '6.700')
    const D = await cierre(6.7)
    D.intentarCerrar()
    await tic()
    chk('"6,7": sin pregunta, se manda 6,7', D.estado.confirma == null && rpcs(D, 'cerrar_turno')[0]?.[1]?.p_scrap_kg === 6.7)
    const M = await cierre(9999999)
    M.intentarCerrar()
    chk('"9.999.999": pregunta sin sugerir', el(M, 'pr-confirma-titulo').textContent === '¿Fueron 9.999.999 kg de scrap?' && rpcs(M, 'cerrar_turno').length === 0)
    M.responderConfirma(true)
    await tic()
    chk('… "Corregir el número" no manda nada', rpcs(M, 'cerrar_turno').length === 0 && M.estado.confirma == null)
    M.intentarCerrar()
    M.responderConfirma(false)
    await tic()
    chk('… "Sí, fueron 9.999.999 kg" lo manda (y la base lo rechaza con su mensaje)', rpcs(M, 'cerrar_turno')[0]?.[1]?.p_scrap_kg === 9999999)
    const MSG = 'El scrap de 9999999 kg es demasiado para un turno. Revisá el número: si fueron, por ejemplo, 6,7 kg, escribí 6,7 (con coma, sin punto de miles).'
    const B = await cierre(9999999)
    B.__setRpc(async (n) => n === 'cerrar_turno' ? { data: null, error: { message: MSG } } : { data: null, error: null })
    B.intentarCerrar()
    B.responderConfirma(false)
    await tic(); await tic()
    chk('el rechazo de la base, TAL CUAL', B.estado.cierre?.errorBase === MSG, B.estado.cierre?.errorBase)
  }
})())

fin()
