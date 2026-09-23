// B7 del módulo Producción (22/09/2026): historial de turnos y stock de
// producto terminado (produccion:ver o produccion:configurar). Solo lectura.
//
// El detalle de un turno: encargado, operario, masas con ingredientes, lotes y
// diferencia contra SU receta, paradas con su duración, scrap, sublotes
// producidos, y lo consumido por insumo y lote (solo masas NO anuladas;
// masa_items.cantidad_kg ya es la doble ×2). El stock terminado sale de
// stock_terminado_movimientos, sumado por presentación, marca y sublote.
//
//   node pruebas/test-produccion-historial.js

process.env.TZ = 'UTC'

const path = require('path')
const { arnes, leer, marca, chequearMarcas } = require('./circuito-comun')
const { construirProduccion } = require('./sandbox-produccion')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/produccion.html')
leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

function armar(tareas = [['ver', { unidades: ['u-cn'] }]]) {
  const S = construirProduccion(ARCHIVO)
  S.estado.misTareas = new Map(tareas)
  S.estado.unidades = new Map([['u-cn', 'Cucuruchos Nuss'], ['u-dp', 'Dolce Pasta'], ['u-ta', 'Taller']])
  return S
}

const DETALLE = {
  turnos_produccion: [{ id: 't1', lote: 7023, maquina_id: 'm1', fecha: '2026-09-22', turno: 'Mañana', encargado_id: 'e-fede', estado: 'cerrado',
    abierto_en: '2026-09-22T09:02:00Z', cerrado_en: '2026-09-22T19:00:00Z', hora_inicio: '06:02:00', hora_apagado: '16:10:00', scrap_kg: 3.5, observaciones: 'Se cortó la luz' }],
  turno_operarios: [{ empleado_id: 'e-op' }],
  masas: [
    { id: 'ma1', nro: 1, hora: '2026-09-22T09:30:00Z', tipo_masa: 'Común', doble: true, origen: 'modificada', receta_id: 'r1', masero_id: 'e-mas', anulada: false },
    { id: 'ma2', nro: 2, hora: '2026-09-22T10:30:00Z', tipo_masa: 'Común', doble: false, origen: 'original', receta_id: 'r1', masero_id: 'e-mas', anulada: false },
    { id: 'ma3', nro: 3, hora: '2026-09-22T11:30:00Z', tipo_masa: 'Común', doble: false, origen: 'original', receta_id: 'r1', masero_id: 'e-mas', anulada: true, anulada_motivo: 'Se volcó' },
  ],
  masa_items: [
    { masa_id: 'ma1', ingrediente_id: 'i-harina', insumo_id: 'ins-h1', lote: 'L-100', lote_fuera_de_stock: false, cantidad_simple_kg: 25.2, cantidad_kg: 50.4 },
    { masa_id: 'ma1', ingrediente_id: 'i-grasa', insumo_id: null, lote: null, lote_fuera_de_stock: false, cantidad_simple_kg: 2, cantidad_kg: 4 },
    { masa_id: 'ma2', ingrediente_id: 'i-harina', insumo_id: 'ins-h1', lote: 'L-100', lote_fuera_de_stock: false, cantidad_simple_kg: 25, cantidad_kg: 25 },
    { masa_id: 'ma2', ingrediente_id: 'i-azucar', insumo_id: 'ins-az', lote: 'A-X', lote_fuera_de_stock: true, cantidad_simple_kg: 5, cantidad_kg: 5 },
    { masa_id: 'ma3', ingrediente_id: 'i-harina', insumo_id: 'ins-h1', lote: 'L-100', lote_fuera_de_stock: false, cantidad_simple_kg: 25, cantidad_kg: 25 },
    { masa_id: 'ma2', ingrediente_id: 'i-lecitina', insumo_id: 'ins-h1', lote: 'L-200', lote_fuera_de_stock: false, cantidad_simple_kg: 1, cantidad_kg: 1 },
  ],
  receta_items: [{ receta_id: 'r1', ingrediente_id: 'i-harina', cantidad_kg: 25 }, { receta_id: 'r1', ingrediente_id: 'i-grasa', cantidad_kg: 2 }],
  ingredientes: [{ id: 'i-harina', nombre: 'Harina', orden: 1 }, { id: 'i-grasa', nombre: 'Grasa', orden: 2 }, { id: 'i-azucar', nombre: 'Azúcar', orden: 3 }],
  insumos: [{ id: 'ins-h1', nombre: 'Harina 000', marca: 'Jupiter' }, { id: 'ins-az', nombre: 'Azúcar', marca: null }],
  paradas_produccion: [{ id: 'p1', inicio: '2026-09-22T12:00:00Z', fin: '2026-09-22T12:45:00Z', motivo: 'Cambio de molde' }],
  produccion_items: [{ orden: 1, sublote: '7023-1', presentacion_id: 'pr1', marca_id: null, cajas: 12, unidades_por_caja: 600, unidades: 7200 },
    { orden: 2, sublote: '7023-2', presentacion_id: 'pr1', marca_id: 'mk1', cajas: 3, unidades_por_caja: 600, unidades: 1800 }],
  producto_presentaciones: [{ id: 'pr1', producto_id: 'p1', nombre: 'Caja x600' }],
  productos_terminados: [{ id: 'p1', nombre: 'Cucuruchón Mini' }],
  marcas_personalizadas: [{ id: 'mk1', nombre: 'GRIDO' }],
  v_empleados_publico: [{ id: 'e-fede', nombre: 'Federico Silva' }, { id: 'e-op', nombre: 'Operario Uno' }, { id: 'e-mas', nombre: 'Juan Masero' }],
}

esperas.push((async () => {
  // ── Unidades y acceso ─────────────────────────────────────────────────
  const U = armar([['ver', { unidades: ['u-dp'] }], ['configurar', { unidades: ['u-cn'] }]])
  chk('unidades del historial: las de ver y las de configurar', JSON.stringify(U.unidadesDeHistorial().sort()) === '["u-cn","u-dp"]')
  const Nada = armar([['cargar', { unidades: ['u-cn'] }]])
  chk('solo con cargar no hay historial', Nada.unidadesDeHistorial().length === 0)
  Nada.pintarAccesosOficina()
  chk('… ni botones de historial y stock', Nada.__doc.getElementById('pr-btn-ir-historial').hidden === true && Nada.__doc.getElementById('pr-btn-ir-stock').hidden === true)
  U.pintarAccesosOficina()
  chk('con ver: los botones aparecen', U.__doc.getElementById('pr-btn-ir-historial').hidden === false && U.__doc.getElementById('pr-menu-stock').hidden === false)
  chk('sumarDias cruza de mes', U.sumarDias('2026-10-02', -7) === '2026-09-25')

  // ── Listado ───────────────────────────────────────────────────────────
  const S = armar()
  Object.assign(S.__tablas, {
    maquinas: [{ id: 'm1', nombre: 'Máquina 1' }],
    turnos_produccion: [{ id: 't1', lote: 7023, maquina_id: 'm1', fecha: '2026-09-22', turno: 'Mañana', encargado_id: 'e-fede', estado: 'cerrado' },
      { id: 't2', lote: 7024, maquina_id: 'm1', fecha: '2026-09-22', turno: 'Tarde', encargado_id: 'e-x', estado: 'abierto' }],
    v_empleados_publico: [{ id: 'e-fede', nombre: 'Federico Silva' }],
  })
  await S.mostrarHistorial()
  chk('arranca en los últimos 7 días', S.estado.historial.hasta === S.hoyArgentina() && S.estado.historial.desde === S.sumarDias(S.hoyArgentina(), -7))
  const q = S.__llamadas.consultas.find(([t]) => t === 'turnos_produccion')?.[1] ?? []
  chk('filtra por unidad y fechas', JSON.stringify(q).includes('["eq","unidad_negocio_id","u-cn"]') && JSON.stringify(q).includes('["gte","fecha"') && JSON.stringify(q).includes('["lte","fecha"'))
  chk('sin máquina ni estado elegidos no los filtra', !JSON.stringify(q).includes('["eq","maquina_id"') && !JSON.stringify(q).includes('["eq","estado"'))
  const hl = S.__doc.getElementById('pr-historial-lista').innerHTML
  chk('cada turno con lote, máquina, fecha, turno, estado y encargado', /Lote 7023 · Máquina 1/.test(hl) && /22\/09\/2026 · Mañana · Cerrado · Federico Silva/.test(hl))
  chk('un encargado sin nombre: raya', /Tarde · Abierto · —/.test(hl))
  S.estado.historial.maquina = 'm1'
  S.estado.historial.estado = 'cerrado'
  S.__llamadas.consultas.length = 0
  await S.cargarHistorial()
  const q2 = S.__llamadas.consultas.find(([t]) => t === 'turnos_produccion')?.[1] ?? []
  chk('con máquina y estado, los filtra', JSON.stringify(q2).includes('["eq","maquina_id","m1"]') && JSON.stringify(q2).includes('["eq","estado","cerrado"]'))
  S.estado.historial.desde = '2026-09-30'
  S.estado.historial.hasta = '2026-09-01'
  S.__llamadas.consultas.length = 0
  await S.cargarHistorial()
  chk('"desde" después de "hasta": lo dice y no consulta', /no sea posterior/.test(S.__doc.getElementById('pr-historial-aviso').innerHTML) && !S.__llamadas.consultas.some(([t]) => t === 'turnos_produccion'))
  const T = armar()
  Object.assign(T.__tablas, { maquinas: [], turnos_produccion: Array.from({ length: 1000 }, (_, i) => ({ id: 't' + i, lote: i, maquina_id: 'm', fecha: '2026-09-22', turno: 'Mañana', estado: 'cerrado' })) })
  await T.mostrarHistorial()
  chk('si llega al tope de 1000, lo avisa', /primeros 1000 turnos/.test(T.__doc.getElementById('pr-historial-aviso').innerHTML))

  // ── Detalle ───────────────────────────────────────────────────────────
  const D = armar()
  Object.assign(D.__tablas, DETALLE)
  const d = await D.leerDetalleTurno('t1')
  const tot = D.totalesConsumidos(d)
  chk('consumido: suma por insumo y lote, con la doble', tot.find(x => x.insumo_id === 'ins-h1' && x.lote === 'L-100')?.kg === 75.4, JSON.stringify(tot))
  chk('… sin las masas anuladas ni los ingredientes sin insumo', tot.length === 3 && !tot.some(x => x.insumo_id === null))
  chk('… el mismo insumo con otro lote va aparte', tot.find(x => x.insumo_id === 'ins-h1' && x.lote === 'L-200')?.kg === 1)
  await D.abrirDetalleHistorial('t1')
  const hd = D.__doc.getElementById('pr-historial-detalle-cuerpo').innerHTML
  chk('detalle: lote, encargado, operario y horario', /class="pr-lote">7023</.test(hd) && /Federico Silva/.test(hd) && /Operario Uno/.test(hd) && /06:02 a 16:10/.test(hd))
  chk('… scrap y observaciones', /3,5 kg/.test(hd) && /Se cortó la luz/.test(hd))
  chk('… cada masa con su masero y su origen', /Masa 1<\/strong> · 06:30 · Común · Doble/.test(hd) && /masero Juan Masero/.test(hd) && /pr-chip-origen--modificada/.test(hd))
  chk('… con ingredientes, insumo y lote', /Harina 50,4 kg \(Harina 000 · Jupiter, lote L-100\)/.test(hd))
  chk('… el lote fuera de stock se marca', /lote A-X, lote fuera de stock/.test(hd))
  chk('… la diferencia contra su receta', /\+200 g Harina/.test(hd))
  chk('… la anulada, con su motivo', /Anulada:<\/strong> Se volcó/.test(hd))
  // htmlParadas() es la MISMA de la planilla (rediseño parte 3): la hora
  // primero, en tabular, y el motivo después.
  chk('… las paradas con su duración', /09:00–09:45<\/strong> · Cambio de molde[\s\S]*45 min/.test(hd), hd.slice(hd.indexOf('Cambio de molde') - 200, hd.indexOf('Cambio de molde') + 80))
  chk('… los sublotes producidos con cajas y unidades', /7023-1<\/span> Cucuruchón Mini · Caja x600 · Común · 12 cajas × 600 = 7\.200 unidades/.test(hd) && /7023-2<\/span>[^<]*GRIDO/.test(hd))
  chk('… y lo consumido por insumo y lote', /Harina 000 · Jupiter · lote L-100: <strong>75,4 kg/.test(hd))

  // ── Stock terminado ───────────────────────────────────────────────────
  const K = armar()
  const movs = [
    { presentacion_id: 'pr1', marca_id: null, lote: '7023-1', cajas: 12, unidades: 7200 },
    { presentacion_id: 'pr1', marca_id: null, lote: '7023-1', cajas: -2, unidades: -1200 },
    { presentacion_id: 'pr1', marca_id: 'mk1', lote: '7023-2', cajas: 3, unidades: 1800 },
    { presentacion_id: 'pr1', marca_id: null, lote: '7020-1', cajas: 5, unidades: 3000 },
    { presentacion_id: 'pr1', marca_id: null, lote: '7019-1', cajas: 4, unidades: 2400 },
    { presentacion_id: 'pr1', marca_id: null, lote: '7019-1', cajas: -4, unidades: -2400 },
    { presentacion_id: 'pr1', marca_id: 'mk1', lote: '7020-1', cajas: 1, unidades: 600 },
  ]
  const g = K.agruparStockTerminado(movs)
  chk('suma por presentación, marca y sublote', g.find(x => x.lote === '7023-1').cajas === 10 && g.find(x => x.lote === '7023-1').unidades === 6000)
  chk('un sublote despachado entero no se lista', !g.some(x => x.lote === '7019-1'))
  chk('la misma presentación con marca va aparte, aunque sea el mismo sublote', g.filter(x => x.presentacion_id === 'pr1').length === 4 &&
    g.find(x => x.lote === '7020-1' && x.marca_id === null).cajas === 5 && g.find(x => x.lote === '7020-1' && x.marca_id === 'mk1').cajas === 1)
  Object.assign(K.__tablas, { stock_terminado_movimientos: movs, productos_terminados: DETALLE.productos_terminados, producto_presentaciones: DETALLE.producto_presentaciones, marcas_personalizadas: DETALLE.marcas_personalizadas })
  await K.mostrarStockTerminado()
  const hk = K.__doc.getElementById('pr-stock-lista').innerHTML
  chk('agrupa por producto · presentación · marca', /Cucuruchón Mini · Caja x600 · Común/.test(hk) && /Cucuruchón Mini · Caja x600 · GRIDO/.test(hk))
  chk('con el total del grupo', /15 cajas · 9\.000 unidades/.test(hk))
  chk('y cada sublote, en orden', /7020-1<\/span> 5 cajas[\s\S]*7023-1<\/span> 10 cajas/.test(hk))
  chk('lee el stock de la unidad', K.__llamadas.consultas.some(([t, f]) => t === 'stock_terminado_movimientos' && JSON.stringify(f).includes('["eq","unidad_negocio_id","u-cn"]')))
  chk('vacío: lo dice', /No hay producto terminado/.test(K.htmlStockTerminado([], { productos: [], presentaciones: [], marcas: [] })))
  const V = armar()
  V.__tablas.stock_terminado_movimientos = () => ({ data: null, error: { message: 'x' } })
  await V.mostrarStockTerminado()
  chk('si falla, aviso y nada viejo', /No se pudo leer el stock terminado/.test(V.__doc.getElementById('pr-stock-aviso').innerHTML) && V.__doc.getElementById('pr-stock-lista').innerHTML === '')

  // ── HTML malicioso ────────────────────────────────────────────────────
  const X = armar()
  const h = { maquinas: [{ id: 'm', nombre: marca('maquina') }], nombres: new Map([['e', marca('encargado')]]) }
  chequearMarcas(chk, 'fila del historial', X.htmlFilaHistorial({ id: marca('turnoId'), lote: marca('lote'), maquina_id: 'm', fecha: '2026-09-22', turno: marca('turno'), encargado_id: 'e', estado: 'cerrado' }, h),
    ['maquina', 'encargado', 'turnoId', 'lote', 'turno'])
  const dm = {
    turno: { lote: marca('loteT'), fecha: '2026-09-22', turno: marca('turnoT'), encargado_id: 'e', estado: 'cerrado', hora_inicio: '<i>x', hora_apagado: '<u>y', scrap_kg: 1, observaciones: marca('obs') },
    operarios: ['e'], nombres: new Map([['e', marca('persona')]]),
    masas: [{ id: 'm1', nro: marca('nro'), hora: null, tipo_masa: marca('tipo'), doble: false, origen: marca('origen'), receta_id: 'r', masero_id: 'e', anulada: false },
      { id: 'm2', nro: 2, hora: null, tipo_masa: 'x', doble: false, origen: 'original', receta_id: 'r', masero_id: 'e', anulada: true, anulada_motivo: marca('motivo') }],
    items: [{ masa_id: 'm1', ingrediente_id: 'i', insumo_id: 'ins', lote: marca('loteIns'), cantidad_kg: 1 }],
    recItems: [], ingredientes: [{ id: 'i', nombre: marca('ingrediente') }], insumos: [{ id: 'ins', nombre: marca('insumo'), marca: marca('marcaIns') }],
    paradas: [{ motivo: marca('parada'), inicio: null, fin: null }],
    producido: [{ sublote: marca('sublote'), presentacion_id: 'pr', marca_id: 'mk', cajas: 1, unidades_por_caja: 1, unidades: 1 }],
    presentaciones: [{ id: 'pr', producto_id: 'p', nombre: marca('presentacion') }], productos: [{ id: 'p', nombre: marca('producto') }], marcas: [{ id: 'mk', nombre: marca('marcaProd') }],
  }
  chequearMarcas(chk, 'detalle del turno', X.htmlDetalleTurno(dm), ['loteT', 'turnoT', 'persona', 'obs', 'nro', 'tipo', 'origen', 'motivo', 'loteIns', 'ingrediente', 'insumo', 'marcaIns', 'parada', 'sublote', 'presentacion', 'producto', 'marcaProd'])
  const hh = X.htmlDetalleTurno(dm)
  chk('las horas se recortan a HH:MM y salen escapadas', hh.includes('&lt;i&gt;x') && hh.includes('&lt;u&gt;y') && !hh.includes('<i>x') && !hh.includes('<u>y'))
  chequearMarcas(chk, 'stock terminado', X.htmlStockTerminado([{ presentacion_id: 'pr', marca_id: 'mk', lote: marca('loteStock'), cajas: 1, unidades: 1 }],
    { productos: [{ id: 'p', nombre: marca('prodStock') }], presentaciones: [{ id: 'pr', producto_id: 'p', nombre: marca('presStock') }], marcas: [{ id: 'mk', nombre: marca('marcaStock') }] }),
    ['loteStock', 'prodStock', 'presStock', 'marcaStock'])
  X.__tablas.maquinas = [{ id: marca('maqId'), nombre: marca('maqSel') }]
  X.__tablas.turnos_produccion = []
  await X.mostrarHistorial()
  chequearMarcas(chk, 'selector de máquina', X.__doc.getElementById('pr-historial-maquina').innerHTML, ['maqId', 'maqSel'])
})())

fin()
