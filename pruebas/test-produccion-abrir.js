// B3 del módulo Producción (22/09/2026): el tablero del encargado y abrir turno.
//
// - Cada máquina activa con su estado: "Libre", o "Lote 7023 · abierta desde
//   06:02 · 5 masas". Solo una abierta lleva a su planilla.
// - Abrir turno: fecha (hoy), turno, y las máquinas elegidas cada una con su
//   operario. UNA sola llamada a abrir_turnos(p_fecha, p_turno,
//   p_encargado_id, p_maquinas [{maquina_id, operario_id}]) — leída con
//   pg_get_functiondef el 22/09/2026 — y los lotes que devuelve, grandes.
// - Pantalla encendida (Wake Lock) mientras haya un turno abierto, con
//   try/catch.
//
//   node pruebas/test-produccion-abrir.js

// La tablet puede estar en cualquier zona: las horas tienen que salir en la de
// Argentina igual. Con la zona del proceso en UTC, una hora sin timeZone da
// otra cosa y la suite se pone en rojo.
process.env.TZ = 'UTC'

const path = require('path')
const { arnes, leer, marca, chequearMarcas } = require('./circuito-comun')
const { construirProduccion } = require('./sandbox-produccion')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/produccion.html')
leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

// 06:02 de Argentina = 09:02 UTC.
const TABLAS = {
  maquinas: [{ id: 'm1', nombre: 'Máquina 1', orden: 1 }, { id: 'm2', nombre: 'Máquina 2', orden: 2 }, { id: 'm3', nombre: 'Máquina 3', orden: 3 }],
  turnos_produccion: [{ id: 't1', lote: 7023, maquina_id: 'm1', fecha: '2026-09-22', turno: 'Mañana', encargado_id: 'e-fede', abierto_en: '2026-09-22T09:02:00Z' }],
  masas: [{ turno_id: 't1' }, { turno_id: 't1' }, { turno_id: 't1' }, { turno_id: 't1' }, { turno_id: 't1' }],
  paradas_produccion: [],
}

function armar(tablas = TABLAS) {
  const S = construirProduccion(ARCHIVO)
  Object.assign(S.__tablas, tablas)
  S.estado.modo = 'produccion'
  S.estado.persona = { id: 'e-fede', nombre: 'Federico Silva' }
  S.estado.personal = [
    { id: 'e-fede', nombre: 'Federico Silva', misma_unidad: true, puestos: ['encargado'] },
    { id: 'e-op1', nombre: 'Operario Uno', misma_unidad: true, puestos: ['operario'] },
    { id: 'e-op2', nombre: 'Operario Dos', misma_unidad: true, puestos: ['operario'] },
  ]
  return S
}

// ── Textos del estado ─────────────────────────────────────────────────────
{
  const S = armar()
  chk('libre', S.textoEstadoMaquina({ turno: null }) === 'Libre')
  chk('abierta: lote, hora de Argentina y masas',
    S.textoEstadoMaquina({ turno: { lote: 7023, abierto_en: '2026-09-22T09:02:00Z' }, masas: 5 }) === 'Lote 7023 · abierta desde 06:02 · 5 masas',
    S.textoEstadoMaquina({ turno: { lote: 7023, abierto_en: '2026-09-22T09:02:00Z' }, masas: 5 }))
  chk('una masa en singular', S.textoEstadoMaquina({ turno: { lote: 1, abierto_en: '2026-09-22T09:02:00Z' }, masas: 1 }).endsWith('· 1 masa'))
  chk('hora ilegible: no dice "NaN"', S.textoEstadoMaquina({ turno: { lote: 7, abierto_en: 'basura' }, masas: 0 }) === 'Lote 7 · abierta · 0 masas')
  chk('turno sugerido por hora: 6 → Mañana', S.turnoSegunHora(6) === 'Mañana')
  chk('12 → Mañana', S.turnoSegunHora(12) === 'Mañana')
  chk('14 → Tarde', S.turnoSegunHora(14) === 'Tarde')
  chk('22 → Noche', S.turnoSegunHora(22) === 'Noche')
  chk('3 → Noche', S.turnoSegunHora(3) === 'Noche')
  chk('hoyArgentina a las 23:30 de Argentina del 22 (02:30 UTC del 23) es el 22', S.hoyArgentina(new Date('2026-09-23T02:30:00Z')) === '2026-09-22')
}

// ── El tablero ────────────────────────────────────────────────────────────
esperas.push((async () => {
  const S = armar()
  let pedidos = 0
  S.__nav.wakeLock = { request: async () => { pedidos++; return { release: async () => {}, addEventListener() {} } } }
  await S.mostrarTablero()
  const html = S.__doc.getElementById('pr-tablero').innerHTML
  chk('una tarjeta por máquina activa', (html.match(/class="pr-maquina[ "]/g) || []).length === 3)
  chk('la abierta lleva a su planilla', /data-planilla="t1"/.test(html) && (html.match(/data-planilla=/g) || []).length === 1)
  chk('la abierta dice su lote y sus masas', html.includes('Lote 7023 · abierta desde 06:02 · 5 masas'))
  chk('las libres dicen "Libre"', (html.match(/>Libre</g) || []).length === 2)
  chk('lee las máquinas activas de la unidad', S.__llamadas.consultas.some(([t, f]) => t === 'maquinas' && JSON.stringify(f).includes('["eq","unidad_negocio_id","u-cn"]') && JSON.stringify(f).includes('["eq","activa",true]')))
  chk('lee los turnos abiertos de la unidad', S.__llamadas.consultas.some(([t, f]) => t === 'turnos_produccion' && JSON.stringify(f).includes('["eq","estado","abierto"]') && JSON.stringify(f).includes('["eq","unidad_negocio_id","u-cn"]')))
  chk('cuenta solo masas sin anular', S.__llamadas.consultas.some(([t, f]) => t === 'masas' && JSON.stringify(f).includes('["eq","anulada",false]')))
  const btn = S.__doc.getElementById('pr-btn-abrir-turno')
  chk('hay libres: se puede abrir otra', btn.disabled === false && btn.textContent === 'Abrir otra máquina')
  chk('con un turno abierto se pide la pantalla encendida', pedidos === 1 && S.estado.hayTurnoAbierto === true)

  const T = armar({ ...TABLAS, turnos_produccion: [], masas: [] })
  await T.mostrarTablero()
  chk('sin turnos abiertos: "Abrir turno"', T.__doc.getElementById('pr-btn-abrir-turno').textContent === 'Abrir turno')
  chk('… y no se pide la pantalla encendida', T.estado.hayTurnoAbierto === false)

  const U = armar({ ...TABLAS, turnos_produccion: ['m1', 'm2', 'm3'].map((m, i) => ({ id: 't' + i, lote: 1 + i, maquina_id: m, abierto_en: null })) })
  await U.mostrarTablero()
  chk('todas abiertas: no hay nada que abrir', U.__doc.getElementById('pr-btn-abrir-turno').disabled === true)

  const V = armar({ ...TABLAS, maquinas: () => ({ data: null, error: { message: 'sin red' } }) })
  await V.mostrarTablero()
  chk('si falla la lectura: aviso, sin tablero viejo', /No se pudieron leer las máquinas/.test(V.__doc.getElementById('pr-tablero-aviso').innerHTML) &&
    V.__doc.getElementById('pr-tablero').innerHTML === '' && V.__doc.getElementById('pr-btn-abrir-turno').disabled === true)

  const W = armar({ ...TABLAS, maquinas: [] })
  await W.mostrarTablero()
  chk('sin máquinas: lo dice', /no tiene máquinas activas/.test(W.__doc.getElementById('pr-tablero-aviso').innerHTML))

  // Wake Lock que tira: no rompe.
  const X = armar()
  X.__nav.wakeLock = { request: async () => { throw new Error('no permitido') } }
  let tiro = false
  try { await X.mostrarTablero() } catch { tiro = true }
  let tiro2 = false
  try { await X.mantenerPantalla(true) } catch { tiro2 = true }
  chk('mantenerPantalla con Wake Lock que falla no tira', !tiro2)
  chk('Wake Lock que falla no rompe el tablero', !tiro && (X.__doc.getElementById('pr-tablero').innerHTML.match(/pr-maquina/g) || []).length >= 3)

  // Parada en curso y HTML malicioso.
  const Y = armar({
    maquinas: [{ id: 'm1', nombre: marca('maquina'), orden: 1 }, { id: 'm9', nombre: marca('maquinaLibre'), orden: 2 }],
    turnos_produccion: [{ id: marca('turnoId'), lote: 9, maquina_id: 'm1', abierto_en: null }],
    masas: [], paradas_produccion: [{ id: 'p', turno_id: marca('turnoId'), motivo: marca('motivo'), inicio: null }],
  })
  await Y.mostrarTablero()
  const hy = Y.__doc.getElementById('pr-tablero').innerHTML
  chequearMarcas(chk, 'tablero', hy, ['maquina', 'maquinaLibre', 'turnoId', 'motivo'])
  chk('la parada en curso se ve en la tarjeta', /En parada: /.test(hy))

  // ── Abrir turno ───────────────────────────────────────────────────────
  S.mostrarAbrir()
  chk('el formulario ofrece solo las libres', S.estado.abrir.filas.map(f => f.maquinaId).join() === 'm2,m3')
  chk('la fecha arranca en hoy y no puede ser futura', S.__doc.getElementById('pr-abrir-fecha').value === S.hoyArgentina() && S.__doc.getElementById('pr-abrir-fecha').max === S.hoyArgentina())
  chk('el turno queda sugerido por la hora', S.TURNOS.includes(S.estado.abrir.turno))
  chk('el encargado es la persona de "¿Quién sos?"', /Federico Silva/.test(S.__doc.getElementById('pr-abrir-encargado').textContent))
  const filas = S.__doc.getElementById('pr-abrir-maquinas').innerHTML
  chk('cada máquina con su casilla y su operario', (filas.match(/data-abrir-maquina=/g) || []).length === 2 && (filas.match(/data-operario=/g) || []).length === 2)
  chk('los operarios configurados, más "Sin operario"', /Operario Uno/.test(filas) && /Operario Dos/.test(filas) && /Sin operario/.test(filas) && !/Federico Silva<\/option>/.test(filas))
  chk('sin elegir máquina no se puede abrir', S.__doc.getElementById('pr-abrir-confirmar').disabled === true)

  const f = S.estado.abrir
  f.filas[0].elegida = true
  chk('máquina elegida sin operario: falta el operario', S.faltanParaAbrir(f, S.hoyArgentina()).some(x => x.includes('operario de Máquina 2')))
  f.filas[0].operario = 'e-op1'
  f.filas[1].elegida = true
  f.filas[1].operario = S.SIN_OPERARIO
  chk('con operario (o "sin operario") elegido: se puede', S.faltanParaAbrir(f, S.hoyArgentina()).length === 0)
  chk('fecha futura: no', S.faltanParaAbrir(f, '2999-01-01').length === 1)
  chk('fecha vacía: no', S.faltanParaAbrir(f, '').length === 1)
  const p = S.parametrosAbrirTurnos(f, '2026-09-22', 'e-fede')
  chk('payload de abrir_turnos: fecha, turno, encargado y las máquinas en orden',
    JSON.stringify(p) === JSON.stringify({ p_fecha: '2026-09-22', p_turno: f.turno, p_encargado_id: 'e-fede',
      p_maquinas: [{ maquina_id: 'm2', operario_id: 'e-op1' }, { maquina_id: 'm3', operario_id: null }] }), JSON.stringify(p))
  f.filas[1].elegida = false
  chk('una máquina no elegida no viaja', S.parametrosAbrirTurnos(f, '2026-09-22', 'e-fede').p_maquinas.length === 1)
  f.filas[1].elegida = true

  // Confirmar: UNA sola llamada, y los lotes grandes.
  S.__setRpc(async (n, par) => n === 'abrir_turnos'
    ? { data: [{ maquina_id: 'm2', maquina: 'Máquina 2', turno_id: 'x', lote: 7024 }, { maquina_id: 'm3', maquina: 'Máquina 3', turno_id: 'y', lote: 7025 }], error: null }
    : { data: null, error: null })
  S.__llamadas.rpc.length = 0
  await S.confirmarAbrir()
  const llamadas = S.__llamadas.rpc.filter(([n]) => n === 'abrir_turnos')
  chk('una sola llamada a abrir_turnos con las dos máquinas', llamadas.length === 1 && llamadas[0][1].p_maquinas.length === 2)
  chk('… con el encargado de "¿Quién sos?"', llamadas[0]?.[1].p_encargado_id === 'e-fede')
  const lotes = S.__doc.getElementById('pr-abiertos-lista').innerHTML
  chk('muestra los lotes asignados, grandes', /class="pr-lote">7024</.test(lotes) && /class="pr-lote">7025</.test(lotes))
  chk('queda en la pantalla de lotes', S.__doc.getElementById('pr-abiertos').hidden === false)

  const E = armar()
  await E.mostrarTablero()
  E.mostrarAbrir()
  E.estado.abrir.filas[0].elegida = true
  E.estado.abrir.filas[0].operario = 'e-op1'
  E.__setRpc(async () => ({ data: null, error: { message: 'Esa persona no figura como encargado de esta unidad.' } }))
  await E.confirmarAbrir()
  chk('el error de la base se muestra tal cual', E.__doc.getElementById('pr-abrir-error').textContent === 'Esa persona no figura como encargado de esta unidad.' &&
    E.__doc.getElementById('pr-abrir-error').hidden === false)
  chk('… y el botón vuelve a quedar usable', E.__doc.getElementById('pr-abrir-confirmar').disabled === false && E.estado.abriendo === false)

  // Lotes y operarios con HTML malicioso.
  chequearMarcas(chk, 'lotes asignados', S.htmlLotesAsignados([{ maquina: marca('nombreMaq'), lote: marca('lote') }]), ['nombreMaq', 'lote'])
  chequearMarcas(chk, 'operarios', S.htmlOpcionesOperario([{ id: marca('opId'), nombre: marca('opNombre') }], ''), ['opId', 'opNombre'])
  chequearMarcas(chk, 'fila de abrir', S.htmlFilaAbrir({ nombre: marca('filaNombre'), elegida: true, operario: '' }, 0, []), ['filaNombre'])
})())

fin()
