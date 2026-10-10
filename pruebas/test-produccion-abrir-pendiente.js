// ABRIR UN TURNO CON UNA PLANILLA PENDIENTE DE COMPLETAR (09/10/2026).
//
// El pedido: "abrir turnos se frena si hay una planilla pendiente de
// completar". Una planilla 'pendiente_completar' (cerrada a la fuerza, o la
// que dejó "Volvió con lote nuevo") NO ocupa la máquina: la PANTALLA tiene que
// ofrecerla para abrir igual, mandar la llamada, y la pendiente seguir viéndose
// y pudiéndose completar. Una planilla 'abierto' sigue sin ofrecerse.
//
// Lo que se leyó de la base (pg_get_functiondef, 09/10/2026):
//  - abrir_turno(…) solo rechaza si la máquina tiene un turno estado = 'abierto'.
//  - ejecutar_tablet('abrir_turnos', …) solo delega en abrir_turnos.
//  - abrir_turnos(…) SÍ rechaza: busca en la unidad un turno con
//    estado <> 'cerrado' (o sea, también 'pendiente_completar') de OTRA fecha
//    u otro turno, y corta con "La X sigue abierta en el turno … Cerrá primero
//    las planillas de ese turno…". ESE es el freno, y es de la base.
// La pantalla no repite esa regla: muestra el error TAL CUAL y, al lado, las
// planillas pendientes de la fábrica con un botón para completarlas.
//
//   node pruebas/test-produccion-abrir-pendiente.js
//   ARCHIVO_TEST=<copia de modulos/produccion.html>

process.env.TZ = 'UTC'
const path = require('path')
const { arnes, leer, marca, chequearMarcas } = require('./circuito-comun')
const { construirProduccion } = require('./sandbox-produccion')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/produccion.html')
const FUENTE = leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

const MAQUINAS = [{ id: 'm1', nombre: 'Máquina 1', orden: 1 }, { id: 'm2', nombre: 'Máquina 2', orden: 2 }]
// La de la Máquina 2 se cerró a la fuerza el día anterior: quedó pendiente.
const PENDIENTE = { id: 'tp', lote: 6230, maquina_id: 'm2', fecha: '2026-10-08', turno: 'Tarde', estado: 'pendiente_completar',
  encargado_id: 'e-fede', abierto_en: '2026-10-08T18:00:00Z', forzado_por: 'e-fede' }

// Una tabla de turnos que SÍ mira el estado pedido (el doble general devuelve
// todo): así se mide que el tablero no trae la pendiente como abierta.
function turnos(lista) {
  return (filtros) => {
    const eq = (k) => filtros.find(f => f[0] === 'eq' && f[1] === k)
    const est = eq('estado')
    const id = eq('id')
    let r = lista
    if (est) r = r.filter(t => t.estado === est[2])
    if (id) r = r.filter(t => t.id === id[2])
    return { data: r, error: null }
  }
}

function armar(lista) {
  const S = construirProduccion(ARCHIVO)
  const hoy = S.hoyArgentina()
  const conHoy = lista.map(t => ({ ...t, fecha: t.fecha === 'HOY' ? hoy : t.fecha }))
  Object.assign(S.__tablas, {
    maquinas: MAQUINAS, turnos_produccion: turnos(conHoy), masas: [], paradas_produccion: [], produccion_items: [],
    turno_operarios: [],
  })
  S.estado.modo = 'produccion'
  S.estado.persona = { id: 'e-fede', nombre: 'Federico Silva' }
  S.estado.personal = [
    { id: 'e-fede', nombre: 'Federico Silva', misma_unidad: true, puestos: ['encargado'] },
    { id: 'e-op1', nombre: 'Ramón Díaz', misma_unidad: true, puestos: ['operario'] },
  ]
  return S
}

esperas.push((async () => {
  // ── Con la planilla de la Máquina 2 pendiente de completar ──────────────
  const S = armar([PENDIENTE])
  await S.mostrarTablero()
  const tab = S.__doc.getElementById('pr-tablero').innerHTML
  const aviso = S.__doc.getElementById('pr-tablero-aviso').innerHTML
  chk('el tablero NO pide los pendientes como abiertos: lee solo estado = abierto',
    S.__llamadas.consultas.some(([t, f]) => t === 'turnos_produccion' && f.some(x => x[0] === 'eq' && x[1] === 'estado' && x[2] === 'abierto')))
  chk('la Máquina 2 (pendiente) aparece libre, con su "Abrir turno"', /data-abrir-libre="m2">Abrir turno</.test(tab), tab)
  chk('… y no como andando (no lleva a una planilla desde la tarjeta)', !/data-producido="tp"/.test(tab) && !/data-planilla="tp"/.test(tab))
  chk('la pendiente se sigue viendo arriba, con su botón para completarla',
    /1 planilla quedó pendiente de completar/.test(aviso) && /data-planilla="tp"[^>]*>Máquina 2 · lote 6230</.test(aviso), aviso)
  chk('"Abrir turno" de la barra está prendido (la pendiente no cuenta como abierta)',
    !/data-seccion="abrir"[^>]*disabled/.test(S.htmlLatSecciones()))
  chk('la pendiente no habilita SALA DE MASA', S.estado.hayTurnoAbierto === false)

  await S.mostrarAbrir('m2')
  const form = S.estado.abrir
  chk('Abrir turno ofrece la Máquina 2 aunque su planilla anterior esté pendiente',
    S.estado.vista === 'pr-abrir' && form.filas.some(f => f.maquinaId === 'm2' && f.elegida && !f.bloqueada),
    JSON.stringify(form?.filas))
  chk('… y no la bloquea como "abierta de ayer"', form.filas.every(f => !f.bloqueada))
  chk('el botón dice que se abre la Máquina 2', /Abrir turno de Máquina 2/.test(S.__doc.getElementById('pr-abrir-confirmar').textContent))
  chk('… y se puede tocar', S.__doc.getElementById('pr-abrir-confirmar').disabled === false)

  S.__setRpc(async (n) => n === 'abrir_turnos'
    ? { data: { turnos: [{ maquina_id: 'm2', maquina: 'Máquina 2', turno_id: 'tn', lote: 6240 }], reintento: false }, error: null }
    : { data: null, error: null })
  S.__llamadas.rpc.length = 0
  await S.confirmarAbrir()
  const llamada = S.__llamadas.tablet.find(([, op]) => op === 'abrir_turnos')
  chk('abrir MANDA la llamada (ejecutar_tablet → abrir_turnos) con la Máquina 2',
    !!llamada && JSON.stringify(llamada[2].p_maquinas) === JSON.stringify([{ maquina_id: 'm2', operarios: [] }]), JSON.stringify(S.__llamadas.tablet))
  chk('… con una clave propia del pedido', !!llamada && /^uuid-/.test(llamada[0]))
  chk('… y muestra el lote nuevo', S.estado.vista === 'pr-abiertos' &&
    /class="pr-lote-tarjeta__lote">6240</.test(S.__doc.getElementById('pr-abiertos-lista').innerHTML))

  // ── La base rechaza: el error tal cual y, al lado, las pendientes ───────
  const E = armar([PENDIENTE])
  await E.mostrarTablero()
  await E.mostrarAbrir('m2')
  const MSJ = 'La Máquina 2 sigue abierta en el turno Tarde del 08/10. Cerrá primero las planillas de ese turno antes de abrir el turno Mañana.'
  E.__setRpc(async () => ({ data: null, error: { message: MSJ, code: 'P0001' } }))
  E.__llamadas.consultas.length = 0
  await E.confirmarAbrir()
  await new Promise(r => setImmediate(r))
  const err = E.__doc.getElementById('pr-abrir-error')
  const pend = E.__doc.getElementById('pr-abrir-pendientes').innerHTML
  chk('el error de la base se ve TAL CUAL', err.textContent === MSJ && err.hidden === false, err.textContent)
  chk('… se leen las pendientes de la fábrica', E.__llamadas.consultas.some(([t, f]) => t === 'turnos_produccion' &&
    f.some(x => x[0] === 'eq' && x[1] === 'estado' && x[2] === 'pendiente_completar') &&
    f.some(x => x[0] === 'eq' && x[1] === 'unidad_negocio_id' && x[2] === 'u-cn')))
  chk('… y se ofrecen al lado del error para completarlas',
    /Hay 1 planilla pendiente de completar en esta fábrica/.test(pend) && /Completala desde acá/.test(pend) &&
    /data-planilla="tp"[^>]*>Completar Máquina 2 · lote 6230</.test(pend), pend)
  chk('el botón de abrir vuelve a quedar usable', E.__doc.getElementById('pr-abrir-confirmar').disabled === false && E.estado.abriendo === false)
  chk('tocar la pendiente abre su planilla (el contenedor escucha data-planilla)',
    /getElementById\('pr-abrir-pendientes'\)\.addEventListener\('click', ev => \{\s*const b = ev\.target\.closest\('\[data-planilla\]'\); if \(b\) \{ tocar\(\); abrirPlanilla\(b\.dataset\.planilla\) \}/.test(FUENTE))
  // Volver a intentar limpia lo de antes; volver a entrar a Abrir también.
  E.__setRpc(async () => ({ data: { turnos: [{ maquina_id: 'm2', maquina: 'Máquina 2', turno_id: 'tn', lote: 6240 }] }, error: null }))
  await E.confirmarAbrir()
  chk('un reintento que sale bien no deja las pendientes del error anterior', E.__doc.getElementById('pr-abrir-pendientes').innerHTML === '')
  E.__doc.getElementById('pr-abrir-pendientes').innerHTML = 'viejo'
  await E.mostrarAbrir('m2')
  chk('… y entrar de nuevo a Abrir turno tampoco', E.__doc.getElementById('pr-abrir-pendientes').innerHTML === '')

  // Más de una: el plural.
  const D = armar([PENDIENTE, { ...PENDIENTE, id: 'tp2', lote: 6231, maquina_id: 'm1', forzado_por: null }])
  await D.mostrarTablero()
  await D.mostrarAbrir()
  D.estado.abrir.filas[0].elegida = true
  D.__setRpc(async () => ({ data: null, error: { message: 'Otra cosa.' } }))
  await D.confirmarAbrir()
  await new Promise(r => setImmediate(r))
  const pd = D.__doc.getElementById('pr-abrir-pendientes').innerHTML
  chk('dos pendientes: el plural y un botón por cada una', /Hay 2 planillas pendientes de completar/.test(pd) && /Completalas desde acá/.test(pd) &&
    /data-planilla="tp"/.test(pd) && /data-planilla="tp2"[^>]*>Completar Máquina 1 · lote 6231</.test(pd), pd)

  // Sin pendientes: nada.
  const N = armar([])
  await N.mostrarTablero()
  await N.mostrarAbrir('m1')
  N.__setRpc(async () => ({ data: null, error: { message: 'Esa persona no figura como encargado de esta unidad.' } }))
  await N.confirmarAbrir()
  await new Promise(r => setImmediate(r))
  chk('sin pendientes en la fábrica no se agrega nada al error', N.__doc.getElementById('pr-abrir-pendientes').innerHTML === '')

  // Un corte de RED: no se lee nada más (sin red no hay qué leer).
  const R = armar([PENDIENTE])
  await R.mostrarTablero()
  await R.mostrarAbrir('m2')
  R.__setRpc(async () => { throw new TypeError('Failed to fetch') })
  R.__llamadas.consultas.length = 0
  await R.confirmarAbrir()
  await new Promise(r => setImmediate(r))
  chk('con un corte de red no se leen las pendientes', !R.__llamadas.consultas.some(([t]) => t === 'turnos_produccion') &&
    R.__doc.getElementById('pr-abrir-pendientes').innerHTML === '')

  // Si leer las pendientes falla, no se inventa nada.
  const F = armar([PENDIENTE])
  await F.mostrarTablero()
  await F.mostrarAbrir('m2')
  F.__setRpc(async () => ({ data: null, error: { message: MSJ } }))
  const turnosOk = F.__tablas.turnos_produccion
  F.__tablas.turnos_produccion = (filtros) => filtros.some(x => x[1] === 'estado' && x[2] === 'pendiente_completar')
    ? { data: null, error: { message: 'sin red' } } : turnosOk(filtros)
  await F.confirmarAbrir()
  await new Promise(r => setImmediate(r))
  chk('si no se pueden leer las pendientes, no se dibuja nada (y el error sigue)', F.__doc.getElementById('pr-abrir-pendientes').innerHTML === '' &&
    F.__doc.getElementById('pr-abrir-error').textContent === MSJ)

  // Si mientras tanto se salió de Abrir, no se pinta.
  const G = armar([PENDIENTE])
  await G.mostrarTablero()
  await G.mostrarAbrir('m2')
  const formG = G.estado.abrir
  G.estado.abrir = null
  await G.mostrarPendientesAlAbrir(formG)
  chk('una respuesta que llega con otro formulario no se pinta', G.__doc.getElementById('pr-abrir-pendientes').innerHTML === '')

  // ── Con la planilla de la Máquina 2 ABIERTA: sigue sin ofrecerse ────────
  const A = armar([{ ...PENDIENTE, id: 'ta', fecha: 'HOY', estado: 'abierto', forzado_por: null }])
  await A.mostrarTablero()
  const ta = A.__doc.getElementById('pr-tablero').innerHTML
  chk('con planilla ABIERTA la Máquina 2 no tiene "Abrir turno" (lleva a su planilla)', !/data-abrir-libre="m2"/.test(ta) && /data-producido="ta"/.test(ta))
  await A.mostrarAbrir('m2')
  chk('… Abrir turno no la ofrece', A.estado.abrir.filas.every(f => f.maquinaId !== 'm2'), JSON.stringify(A.estado.abrir.filas))
  chk('… ni la elige al pedirla por su id', !A.estado.abrir.filas.some(f => f.elegida))

  // ── Lo que arma: escapado ───────────────────────────────────────────────
  chequearMarcas(chk, 'pendientes al lado del error', S.htmlPendientesAbrir(
    [{ id: marca('idPend'), lote: marca('lotePend'), maquina_id: 'mx' }], [{ id: 'mx', nombre: marca('maqPend') }]), ['idPend', 'lotePend', 'maqPend'])
  chk('sin máquina conocida dice "Máquina"', /Completar Máquina · lote 1</.test(S.htmlPendientesAbrir([{ id: 'x', lote: 1, maquina_id: 'zz' }], [])))
  chk('sin pendientes no dibuja nada', S.htmlPendientesAbrir([], []) === '' && S.htmlPendientesAbrir(null, []) === '')
  chk('el contenedor está en el HTML, entre el error y el botón',
    /id="pr-abrir-error" hidden><\/p>[\s\S]{0,400}?<div id="pr-abrir-pendientes"><\/div>\s*<button type="button" class="pr-prim" id="pr-abrir-confirmar">/.test(FUENTE))
})())

fin()
