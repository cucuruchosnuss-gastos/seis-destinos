// El stock terminado de la gestión dice qué es REVENTA y lista los TRASPASOS
// entre fábricas (30/09/2026).
//
// Un producto de reventa tiene productos_terminados.origen_producto_id: el
// producto de la fábrica que lo hace (Nuss revende conos de Dolce Pasta y
// Dolce Pasta revende cucuruchones de Nuss). Su grupo en el stock lleva la
// etiqueta "Reventa · <fábrica que lo hace>", con la fábrica sacada del
// producto de origen (que es de OTRA unidad) y del mapa de unidades. Si no se
// pudo leer el origen: "Reventa" a secas, nunca una fábrica inventada.
//
// traspasar_producto_terminado (lo usa Stock) deja dos movimientos:
// traspaso_salida (−cajas, en la que manda) y traspaso_entrada (+cajas, en la
// que recibe). Se listan en "Traspasos entre fábricas" con su nombre; un tipo
// que la pantalla no conoce se muestra tal cual, escapado, sin romper nada.
//
//   node pruebas/test-produccion-reventa.js

process.env.TZ = 'UTC'

const { arnes, leer, marca, chequearMarcas } = require('./circuito-comun')
const { construirProduccion, GESTION } = require('./sandbox-produccion')

const ARCHIVO = process.env.ARCHIVO_GESTION || process.env.ARCHIVO_TEST || GESTION
leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

const MOVS = [
  { presentacion_id: 'pr1', marca_id: null, lote: '7033-1', cajas: 35, unidades: 11200, tipo: 'produccion', orden_retiro_id: null, fecha: '2026-09-24', motivo: null, created_at: '2026-09-24T17:00:00Z' },
  { presentacion_id: 'pr1', marca_id: null, lote: '7033-1', cajas: -5, unidades: -1600, tipo: 'traspaso_salida', orden_retiro_id: null, fecha: '2026-09-28', motivo: 'Traspaso a otra fábrica', created_at: '2026-09-28T12:00:00Z' },
  { presentacion_id: 'pr2', marca_id: 'mk1', lote: 'D-120-2', cajas: 12, unidades: 1200, tipo: 'traspaso_entrada', orden_retiro_id: null, fecha: '2026-09-29', motivo: 'Traspaso desde otra fábrica', created_at: '2026-09-29T09:00:00Z' },
  { presentacion_id: 'pr3', marca_id: null, lote: 'D-9-1', cajas: 4, unidades: 400, tipo: 'traspaso_entrada', orden_retiro_id: null, fecha: '2026-09-27', motivo: 'Traspaso desde otra fábrica', created_at: '2026-09-27T09:00:00Z' },
]
const PRODUCTOS = [
  { id: 'pt1', nombre: 'Cucuruchón Mini', orden: 1, origen_producto_id: null },
  { id: 'pt2', nombre: 'Cono dulce', orden: 2, origen_producto_id: 'pt-dp-1' },
  { id: 'pt3', nombre: 'Canoli', orden: 3, origen_producto_id: 'pt-dp-2' },
]
const ORIGENES = [{ id: 'pt-dp-1', unidad_negocio_id: 'u-dp' }, { id: 'pt-dp-2', unidad_negocio_id: 'u-dp' }]

function armar({ origenes = ORIGENES, productos = PRODUCTOS, movs = MOVS } = {}) {
  const S = construirProduccion(ARCHIVO)
  S.estado.miRolApp = 'usuario'
  S.estado.misTareas = new Map([['ver', { todas: true }]])
  S.estado.unidades = new Map([['u-cn', 'Cucuruchos Nuss'], ['u-dp', 'Dolce Pasta']])
  S.estado.unidadId = 'u-cn'
  S.estado.stockUnidad = 'u-cn'
  S.estado.retirosVer = { todas: true }
  Object.assign(S.__tablas, {
    stock_terminado_movimientos: movs.map(m => ({ ...m })),
    // La misma tabla responde dos consultas: la de la unidad (eq) y la de los
    // productos de origen (in id).
    productos_terminados: (filtros) => {
      if (filtros.some(f => f[0] === 'in' && f[1] === 'id')) return typeof origenes === 'function' ? origenes(filtros) : { data: origenes, error: null }
      return { data: productos, error: null }
    },
    producto_presentaciones: [
      { id: 'pr1', producto_id: 'pt1', nombre: 'Caja con cono', orden: 1 },
      { id: 'pr2', producto_id: 'pt2', nombre: 'Caja x100', orden: 1 },
      { id: 'pr3', producto_id: 'pt3', nombre: 'Caja x100', orden: 1 },
    ],
    marcas_personalizadas: [{ id: 'mk1', nombre: 'GRIDO' }],
  })
  return S
}
const lista = S => S.__doc.getElementById('pr-stock-lista').innerHTML
const traspasos = S => S.__doc.getElementById('pr-stock-traspasos').innerHTML
const consultas = (S, t) => S.__llamadas.consultas.filter(([x]) => x === t)
const selectDe = c => (c?.[1] ?? []).find(x => x[0] === 'select')?.[1] ?? ''
// El título de un grupo del stock (con su etiqueta, si la tiene).
const titulo = (h, nombre) => (h.match(new RegExp(`<h2 class="pr-of-grupo__titulo">${nombre}[^]*?</h2>`)) ?? [''])[0]

esperas.push((async () => {
  // ── La etiqueta con su fábrica ──────────────────────────────────────
  const S = armar()
  await S.cargarStockTerminado()
  const cP = consultas(S, 'productos_terminados')
  chk('los productos de la unidad se piden con origen_producto_id', selectDe(cP[0]).split(/,\s*/).includes('origen_producto_id'), selectDe(cP[0]))
  const cIn = cP.find(c => c[1].some(f => f[0] === 'in'))
  chk('los productos de origen se piden por id, una sola vez', cP.filter(c => c[1].some(f => f[0] === 'in')).length === 1 &&
    JSON.stringify([...(cIn?.[1].find(f => f[0] === 'in')?.[2] ?? [])].sort()) === '["pt-dp-1","pt-dp-2"]' && cIn?.[1].find(f => f[0] === 'in')?.[1] === 'id', JSON.stringify(cIn))
  chk('… con su unidad', selectDe(cIn).split(/,\s*/).includes('unidad_negocio_id'), selectDe(cIn))
  const h = lista(S)
  chk('un producto de reventa dice "Reventa · Dolce Pasta"', /Cono dulce · Caja x100 · GRIDO<span class="pg-reventa">Reventa · Dolce Pasta<\/span>/.test(h), titulo(h, 'Cono dulce'))
  chk('… cada producto de reventa lleva la suya', /Canoli · Caja x100 · Común<span class="pg-reventa">Reventa · Dolce Pasta<\/span>/.test(h), titulo(h, 'Canoli'))
  chk('un producto propio NO lleva etiqueta', !/pg-reventa/.test(titulo(h, 'Cucuruchón Mini')), titulo(h, 'Cucuruchón Mini'))
  chk('la etiqueta es neutra: ni bordó ni naranja', /\.pg-reventa \{[^}]*background: var\(--color-pista\)[^}]*color: var\(--color-texto-2\)/.test(leer(ARCHIVO)) &&
    !/\.pg-reventa \{[^}]*(bordo|naranja)/.test(leer(ARCHIVO)))

  // ── Sin productos de reventa no se pide nada más ────────────────────
  const P = armar({ productos: [PRODUCTOS[0]], movs: [MOVS[0]] })
  await P.cargarStockTerminado()
  chk('sin reventa no se piden productos de origen', consultas(P, 'productos_terminados').length === 1)
  chk('… y no hay ninguna etiqueta', !/pg-reventa/.test(lista(P)))

  // ── No se pudo leer el origen: "Reventa" a secas ────────────────────
  const E = armar({ origenes: () => ({ data: null, error: { message: 'permission denied' } }) })
  await E.cargarStockTerminado()
  const he = lista(E)
  chk('si falla la lectura del origen, el stock se ve igual', /7033-1/.test(he) && /Cono dulce/.test(he))
  chk('… y dice "Reventa" a secas, sin inventar la fábrica', /<span class="pg-reventa">Reventa<\/span>/.test(he) && !/Reventa · /.test(he), titulo(he, 'Cono dulce'))
  const V = armar({ origenes: [] })
  await V.cargarStockTerminado()
  chk('un origen que no llegó (vacío): "Reventa" a secas', /<span class="pg-reventa">Reventa<\/span>/.test(lista(V)) && !/Reventa · /.test(lista(V)))
  const X = armar({ origenes: [{ id: 'pt-dp-1', unidad_negocio_id: 'u-otra' }, ORIGENES[1]] })
  await X.cargarStockTerminado()
  chk('un origen de una unidad que no está en el mapa: "Reventa" a secas', /Cono dulce · Caja x100 · GRIDO<span class="pg-reventa">Reventa<\/span>/.test(lista(X)) &&
    /Canoli · Caja x100 · Común<span class="pg-reventa">Reventa · Dolce Pasta<\/span>/.test(lista(X)))
  chk('etiquetaReventa sin cat.origenes (null) no rompe', X.etiquetaReventa({ origen_producto_id: 'pt-dp-1' }, { origenes: null }) === 'Reventa')
  chk('etiquetaReventa de un producto propio: null', X.etiquetaReventa({ origen_producto_id: null }, { origenes: new Map() }) === null && X.etiquetaReventa(undefined, {}) === null)

  // ── Si se cambió de unidad mientras se leía el origen, no se pisa ───
  const W = armar({ origenes: () => { W.estado.stockUnidad = 'u-dp'; return { data: ORIGENES, error: null } } })
  W.__doc.getElementById('pr-stock-lista').innerHTML = ''
  await W.cargarStockTerminado()
  chk('una respuesta de otra unidad no se dibuja', !/Cono dulce/.test(lista(W)))

  // ── Los traspasos ───────────────────────────────────────────────────
  const ht = traspasos(S)
  chk('hay una sección "Traspasos entre fábricas"', /<h2 class="pr-subtitulo">Traspasos entre fábricas<\/h2>/.test(ht))
  chk('traspaso_salida se nombra "Traspaso a otra fábrica"', /<strong>Traspaso a otra fábrica<\/strong>/.test(ht))
  chk('traspaso_entrada se nombra "Traspaso desde otra fábrica"', /<strong>Traspaso desde otra fábrica<\/strong>/.test(ht))
  chk('ningún tipo crudo en pantalla', !/traspaso_(salida|entrada)/.test(ht))
  chk('… con el producto, la presentación, el cono y el sublote', /Cucuruchón Mini · Caja con cono · Común/.test(ht) && /Cono dulce · Caja x100 · GRIDO/.test(ht) && /7033-1/.test(ht) && /D-120-2/.test(ht))
  chk('… y las cajas sin signo: salieron / entraron', /salieron 5 cajas/.test(ht) && /entraron 12 cajas/.test(ht) && /entraron 4 cajas/.test(ht))
  chk('lo más nuevo primero', ht.indexOf('D-120-2') < ht.indexOf('7033-1') && ht.indexOf('7033-1') < ht.indexOf('D-9-1'))
  const mismoDia = S.traspasosDeStock([
    { ...MOVS[1], lote: 'A', created_at: '2026-09-28T08:00:00Z' },
    { ...MOVS[1], lote: 'B', created_at: '2026-09-28T19:00:00Z' },
  ]).map(m => m.lote).join(',')
  chk('el mismo día, lo cargado más tarde primero', mismoDia === 'B,A', mismoDia)
  chk('lo que no es traspaso no se lista ahí', (ht.match(/pr-of-fila/g) || []).length === 3)
  chk('el stock suma los traspasos: 35 − 5 = 30 cajas del sublote', /7033-1<\/span><span class="pr-of-num">30<\/span>/.test(lista(S)))
  chk('… y lo que entró por traspaso está en el stock', /D-120-2<\/span><span class="pr-of-num">12<\/span>/.test(lista(S)))
  chk('los traspasos no aparecen como retiros', S.__doc.getElementById('pr-stock-retiros').innerHTML === '')
  const Q = armar({ movs: [MOVS[0]] })
  Q.__doc.getElementById('pr-stock-traspasos').innerHTML = 'VIEJO'
  await Q.cargarStockTerminado()
  chk('sin traspasos no hay sección (y la vieja se borra al recargar)', traspasos(Q) === '')
  chk('htmlTraspasosStock sin traspasos no dibuja nada', Q.htmlTraspasosStock([], { productos: [], presentaciones: [], marcas: [] }) === '')
  chk('unas cajas que no se pueden leer dicen "—"', /salieron — cajas/.test(Q.htmlTraspasosStock([{ ...MOVS[1], cajas: null }], { productos: [], presentaciones: [], marcas: [] })))

  // ── El nombre de cada tipo ──────────────────────────────────────────
  chk('textoTipoStockTerminado: los seis tipos de la base', Q.textoTipoStockTerminado('traspaso_salida') === 'Traspaso a otra fábrica' &&
    Q.textoTipoStockTerminado('traspaso_entrada') === 'Traspaso desde otra fábrica' && Q.textoTipoStockTerminado('produccion') === 'Producción' &&
    Q.textoTipoStockTerminado('despacho') === 'Despacho' && Q.textoTipoStockTerminado('ajuste') === 'Ajuste' && Q.textoTipoStockTerminado('inventario_inicial') === 'Inventario inicial')
  chk('un tipo desconocido se devuelve tal cual (no se inventa un nombre)', Q.textoTipoStockTerminado('prestamo') === 'prestamo')
  chk('un tipo vacío o null: "Movimiento"', Q.textoTipoStockTerminado(null) === 'Movimiento' && Q.textoTipoStockTerminado('  ') === 'Movimiento')
  chk('un tipo que se llama como una propiedad de Object no rompe', Q.textoTipoStockTerminado('toString') === 'toString' && Q.textoTipoStockTerminado('constructor') === 'constructor')

  // ── HTML malicioso ──────────────────────────────────────────────────
  const M = armar()
  const catMal = {
    productos: [{ id: 'pt2', nombre: marca('producto'), origen_producto_id: 'pt-dp-1' }],
    presentaciones: [{ id: 'pr2', producto_id: 'pt2', nombre: marca('presentacion') }],
    marcas: [{ id: 'mk1', nombre: marca('cono') }],
    origenes: new Map([['pt-dp-1', 'u-mal']]),
  }
  M.estado.unidades = new Map([['u-mal', marca('fabrica')]])
  const hStock = M.htmlStockTerminado([{ presentacion_id: 'pr2', marca_id: 'mk1', lote: marca('lote'), cajas: 3, unidades: 300 }], catMal)
  chequearMarcas(chk, 'stock con reventa', hStock, ['producto', 'presentacion', 'cono', 'fabrica', 'lote'])
  const hTras = M.htmlTraspasosStock([{ ...MOVS[2], lote: marca('lote'), tipo: marca('tipo') }], catMal)
  chequearMarcas(chk, 'traspasos', hTras, ['producto', 'presentacion', 'cono', 'lote', 'tipo'])
})())

fin()
