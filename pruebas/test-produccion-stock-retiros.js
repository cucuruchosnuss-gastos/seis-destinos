// El stock terminado de la gestión dice LO QUE SALIÓ POR RETIROS (26/09/2026).
//
// Una orden de retiro (módulo Retiros) descuenta el stock terminado con
// movimientos `despacho` (cajas < 0, con orden_retiro_id) y, si se anula, lo
// devuelve con un `ajuste` (con orden_retiro_id y motivo). La pantalla los
// lista con el CÓDIGO de la orden (ordenes_retiro.codigo, "N-0001") y NUNCA
// con el número suelto.
//
// El código se lee de ordenes_retiro, cuya policy de SELECT pide
// retiros:ver en la unidad (tiene_tarea_alcance, con bypass de super_admin).
// Sin ese permiso NO se consulta: se muestra "Retiro" con sus cajas y su
// sublote y "sin permiso para ver el código". Nunca se inventa un código.
//
//   node pruebas/test-produccion-stock-retiros.js

process.env.TZ = 'UTC'

const { arnes, leer, marca, chequearMarcas } = require('./circuito-comun')
const { construirProduccion, GESTION } = require('./sandbox-produccion')

const ARCHIVO = process.env.ARCHIVO_GESTION || process.env.ARCHIVO_TEST || GESTION
const FUENTE = leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

const MOVS = [
  { presentacion_id: 'pr1', marca_id: null, lote: '7033-1', cajas: 35, unidades: 11200, tipo: 'produccion', orden_retiro_id: null, fecha: '2026-09-24', motivo: null, created_at: '2026-09-24T17:00:00Z' },
  { presentacion_id: 'pr1', marca_id: null, lote: '7033-1', cajas: -5, unidades: -1600, tipo: 'despacho', orden_retiro_id: 'o1', fecha: '2026-09-25', motivo: null, created_at: '2026-09-25T12:00:00Z' },
  { presentacion_id: 'pr1', marca_id: 'mk1', lote: 'SIN STOCK', cajas: -2, unidades: -640, tipo: 'despacho', orden_retiro_id: 'o2', fecha: '2026-09-25', motivo: null, created_at: '2026-09-25T13:00:00Z' },
  { presentacion_id: 'pr1', marca_id: 'mk1', lote: 'SIN STOCK', cajas: 2, unidades: 640, tipo: 'ajuste', orden_retiro_id: 'o2', fecha: '2026-09-26', motivo: 'Anulación de la orden de retiro N° 2: se cargó mal', created_at: '2026-09-26T10:00:00Z' },
  // Un ajuste que NO es de un retiro no se lista acá.
  { presentacion_id: 'pr1', marca_id: null, lote: '7033-1', cajas: -1, unidades: -320, tipo: 'ajuste', orden_retiro_id: null, fecha: '2026-09-26', motivo: 'Rota', created_at: '2026-09-26T11:00:00Z' },
]
const ORDENES = [{ id: 'o1', codigo: 'N-0001', numero: 1, estado: 'confirmada' }, { id: 'o2', codigo: 'N-0002', numero: 2, estado: 'anulada' }]

function armar({ retirosVer = { todas: true }, rol = 'usuario', ordenes = ORDENES } = {}) {
  const S = construirProduccion(ARCHIVO)
  S.estado.miRolApp = rol
  S.estado.misTareas = new Map([['ver', { todas: true }]])
  S.estado.unidades = new Map([['u-cn', 'Cucuruchos Nuss'], ['u-dp', 'Dolce Pasta']])
  S.estado.unidadId = 'u-cn'
  S.estado.stockUnidad = 'u-cn'
  S.estado.retirosVer = retirosVer
  Object.assign(S.__tablas, {
    stock_terminado_movimientos: MOVS.map(m => ({ ...m })),
    productos_terminados: [{ id: 'pt1', nombre: 'Cucuruchón Mini', orden: 1 }],
    producto_presentaciones: [{ id: 'pr1', producto_id: 'pt1', nombre: 'Caja con cono', orden: 1 }],
    marcas_personalizadas: [{ id: 'mk1', nombre: 'GRIDO' }],
    ordenes_retiro: ordenes,
  })
  return S
}
const retiros = S => S.__doc.getElementById('pr-stock-retiros').innerHTML
const consultas = (S, t) => S.__llamadas.consultas.filter(([x]) => x === t)
const select = (S, t) => ((consultas(S, t)[0]?.[1] ?? []).find(x => x[0] === 'select')?.[1] ?? '').split(/,\s*/)

esperas.push((async () => {
  // ── Con retiros:ver ──────────────────────────────────────────────────
  const S = armar()
  await S.cargarStockTerminado()
  chk('los movimientos se piden con tipo, orden_retiro_id, fecha, motivo y created_at',
    ['tipo', 'orden_retiro_id', 'fecha', 'motivo', 'created_at'].every(c => select(S, 'stock_terminado_movimientos').includes(c)), select(S, 'stock_terminado_movimientos').join('|'))
  const cO = consultas(S, 'ordenes_retiro')
  chk('con retiros:ver se piden los códigos de ESAS órdenes, una sola vez', cO.length === 1 && JSON.stringify([...(cO[0][1].find(x => x[0] === 'in')?.[2] ?? [])].sort()) === '["o1","o2"]' && cO[0][1].find(x => x[0] === 'in')?.[1] === 'id', JSON.stringify(cO))
  chk('… con id, código y estado (y no el número)', select(S, 'ordenes_retiro').join(',') === 'id,codigo,estado', select(S, 'ordenes_retiro').join('|'))
  const h = retiros(S)
  chk('hay una sección "Lo que salió por retiros"', /<h2 class="pr-subtitulo">Lo que salió por retiros<\/h2>/.test(h))
  chk('la salida dice el CÓDIGO de la orden', /Retiro N-0001/.test(h))
  chk('… con el producto, la presentación y el cono', /Cucuruchón Mini · Caja con cono · Común/.test(h) && /Cucuruchón Mini · Caja con cono · GRIDO/.test(h))
  chk('… el sublote', /7033-1/.test(h) && /SIN STOCK/.test(h))
  chk('… y las cajas que salieron, sin signo raro', /salieron 5 cajas/.test(h))
  chk('la orden anulada lo dice en su salida', /Retiro N-0002 · anulado/.test(h))
  chk('la anulación: "Anulación del retiro N-0002", lo que volvió y el motivo', /Anulación del retiro N-0002/.test(h) && /volvieron 2 cajas/.test(h) && /se cargó mal/.test(h))
  chk('un ajuste que no es de un retiro no se lista acá', !/Rota/.test(h))
  chk('NUNCA el número suelto de la orden', !/N° 1\b|Retiro 1\b|Retiro 2\b|>1<\/span>/.test(h.replace(/N° 2: se cargó mal/, '')))
  chk('lo más nuevo primero', h.indexOf('Anulación del retiro N-0002') < h.indexOf('Retiro N-0002 · anulado') && h.indexOf('Retiro N-0002 · anulado') < h.indexOf('Retiro N-0001'))
  chk('el stock sigue sumando las salidas (35 − 5 del retiro − 1 roto = 29 cajas del sublote)', /7033-1<\/span><span class="pr-of-num">29<\/span>/.test(S.__doc.getElementById('pr-stock-lista').innerHTML))
  chk('… y lo que se anuló volvió: SIN STOCK queda en cero y no se lista en el stock', !/SIN STOCK/.test(S.__doc.getElementById('pr-stock-lista').innerHTML))
  chk('sin el aviso de permiso', !/sin permiso/i.test(h))

  // ── Sin retiros:ver ─────────────────────────────────────────────────
  const N = armar({ retirosVer: null })
  await N.cargarStockTerminado()
  const hn = retiros(N)
  chk('sin retiros:ver NO se consulta ordenes_retiro', consultas(N, 'ordenes_retiro').length === 0)
  chk('… se ve "Retiro" con sus cajas y su sublote', /Retiro<\/strong>/.test(hn) && /salieron 5 cajas/.test(hn) && /7033-1/.test(hn))
  chk('… y dice que no tiene permiso para ver el código', (hn.match(/sin permiso para ver el código/g) || []).length === 3, hn)
  chk('… sin inventar ningún código', !/N-000/.test(hn))
  chk('… y lo explica arriba', /hace falta retiros:ver en esta unidad/.test(hn))
  chk('la anulación sin permiso también se dice, sin código', /Anulación de un retiro/.test(hn))
  // Con alcance en otra unidad: tampoco.
  const O = armar({ retirosVer: { unidades: ['u-dp'] } })
  await O.cargarStockTerminado()
  chk('con retiros:ver de OTRA unidad: no se consulta', consultas(O, 'ordenes_retiro').length === 0 && /sin permiso para ver el código/.test(retiros(O)))
  const U = armar({ retirosVer: { unidades: ['u-cn'] } })
  await U.cargarStockTerminado()
  chk('con retiros:ver de ESTA unidad: sí', consultas(U, 'ordenes_retiro').length === 1 && /Retiro N-0001/.test(retiros(U)))
  // Super admin: la base le da bypass.
  const A = armar({ retirosVer: null, rol: 'super_admin' })
  await A.cargarStockTerminado()
  chk('un super_admin ve los códigos (tiene_tarea_alcance le da bypass)', consultas(A, 'ordenes_retiro').length === 1 && /Retiro N-0001/.test(retiros(A)))

  // ── No se supo el permiso: se intenta, y lo que no llega no se inventa ──
  const Q = armar({ retirosVer: undefined, ordenes: [ORDENES[0]] })
  await Q.cargarStockTerminado()
  const hq = retiros(Q)
  chk('sin saber el permiso se intenta leer', consultas(Q, 'ordenes_retiro').length === 1)
  chk('… lo que llega se muestra con su código', /Retiro N-0001/.test(hq))
  chk('… lo que no llega dice que no se pudo leer el código', /no se pudo leer el código/.test(hq) && !/N-0002/.test(hq))
  // La consulta falla.
  const E = armar()
  E.__tablas.ordenes_retiro = () => ({ data: null, error: { message: 'permission denied' } })
  await E.cargarStockTerminado()
  chk('si falla la lectura de las órdenes: el stock se ve igual', /7033-1/.test(E.__doc.getElementById('pr-stock-lista').innerHTML))
  chk('… y cada salida dice que no se pudo leer el código, sin inventar uno', (retiros(E).match(/no se pudo leer el código/g) || []).length === 3 && !/N-000/.test(retiros(E)))

  // ── Sin salidas: no hay sección ─────────────────────────────────────
  const V = armar()
  V.__tablas.stock_terminado_movimientos = [MOVS[0]]
  await V.cargarStockTerminado()
  chk('sin salidas por retiros no se dibuja la sección ni se consulta', retiros(V) === '' && consultas(V, 'ordenes_retiro').length === 0)
  chk('htmlRetirosStock sin salidas no dibuja nada', V.htmlRetirosStock([], { productos: [], presentaciones: [], marcas: [] }, { permiso: true, ordenes: [], error: false }) === '')
  // Si mientras se leían los códigos se eligió otra unidad, no se pisa la pantalla.
  const W = armar()
  W.__tablas.ordenes_retiro = () => { W.estado.stockUnidad = 'u-dp'; return { data: ORDENES, error: null } }
  await W.cargarStockTerminado()
  chk('una respuesta de otra unidad no se dibuja', retiros(W) === '')
  // Al recargar, lo viejo se borra primero.
  const L = armar()
  L.__doc.getElementById('pr-stock-retiros').innerHTML = 'VIEJO'
  L.__tablas.stock_terminado_movimientos = [MOVS[0]]
  await L.cargarStockTerminado()
  chk('al recargar, la sección vieja se borra', retiros(L) === '')
  // Un número que no llegó no es un cero.
  const Z = armar()
  chk('unas cajas que no se pueden leer dicen "—"', /salieron — cajas/.test(Z.htmlRetirosStock([{ ...MOVS[1], cajas: null }], { productos: [], presentaciones: [], marcas: [] }, { permiso: true, ordenes: ORDENES, error: false })))

  // ── El permiso se carga al entrar, sin trabar la pantalla ───────────
  chk('se lee retiros:ver al entrar, junto al de stock', /await cargarPermisoStock\(\)\s*\n\s*await cargarPermisoRetiros\(\)/.test(FUENTE))
  chk('se lee de empleado_tareas con el módulo retiros y la tarea ver, habilitada', /\.eq\('modulo', 'retiros'\)\.eq\('tarea', 'ver'\)\.eq\('habilitado', true\)/.test(FUENTE))
  const P = armar()
  P.estado.miEmpleadoId = 'yo'
  P.__tablas.empleado_tareas = () => ({ data: null, error: { message: 'x' } })
  await P.cargarPermisoRetiros()
  chk('si no se puede leer el permiso queda en "no se sabe" (undefined), no en "no tiene"', P.estado.retirosVer === undefined && P.puedeVerRetirosEn('u-cn') === null)
  P.__tablas.empleado_tareas = [{ tarea: 'ver', alcance: null }]
  await P.cargarPermisoRetiros()
  chk('… una fila sin alcance: el alcance vacío (no ve ninguna unidad, igual que la base)', JSON.stringify(P.estado.retirosVer) === '{}' && P.puedeVerRetirosEn('u-cn') === false)

  // ── HTML malicioso ──────────────────────────────────────────────────
  const M = armar()
  const h2 = M.htmlRetirosStock([
    { ...MOVS[1], lote: marca('lote') },
    { ...MOVS[3], motivo: marca('motivo') },
  ], { productos: [{ id: 'pt1', nombre: marca('producto') }], presentaciones: [{ id: 'pr1', producto_id: 'pt1', nombre: marca('presentacion') }], marcas: [{ id: 'mk1', nombre: marca('cono') }] },
  { permiso: true, ordenes: [{ id: 'o1', codigo: marca('codigo'), estado: 'confirmada' }, { id: 'o2', codigo: marca('codigo2'), estado: 'anulada' }], error: false })
  chequearMarcas(chk, 'salidas por retiros', h2, ['lote', 'motivo', 'producto', 'presentacion', 'cono', 'codigo', 'codigo2'])
})())

fin()
