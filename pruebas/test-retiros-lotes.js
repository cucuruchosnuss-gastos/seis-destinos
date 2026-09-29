// VARIOS LOTES POR RENGLÓN, LOS TRES GRUPOS DEL CATÁLOGO Y EL FALTANTE
// (modulos/retiros.html, 28/09/2026).
//
// - El catálogo en TRES grupos: "Producto terminado · SIN CONO", "· CON CONO"
//   (cada cono con su stock, de catalogo_para_retiro().conos, sin pedir
//   stock:ver —29/09/2026—; el cono común se deduce) y "Materia prima e
//   insumos". Lo que no tiene stock aparece al
//   buscar, marcado "sin stock", y se puede elegir.
// - Los lotes del renglón en lista, los más viejos primero, con un campo por
//   lote; "Completar con los más viejos" reparte lo pedido; siempre se ve el
//   total y cuánto falta asignar.
// - El payload con 'lotes' [{lote, cajas}] / [{lote, cantidad}]; lo que no
//   entra en ningún lote va al lote "SIN STOCK".
// - El faltante se avisa en bordó y NO bloquea: la orden sale igual.
//
//   node pruebas/test-retiros-lotes.js

const path = require('path')
const fs = require('fs')
const { construirRetiros } = require('./sandbox-retiros')
const { arnes, marca, chequearMarcas } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/retiros.html')
const src = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${src.length} bytes)`)
const { chk, esperas, fin } = arnes()
const nuevo = () => construirRetiros(ARCHIVO)
const tic = () => new Promise(r => setTimeout(r, 0))

const CAT = {
  productos: [
    { id: 'p-mini', nombre: 'Cucurucho Mini', categoria: 'cucuruchones' },
    { id: 'p-cap', nombre: 'Capelina', categoria: 'barquillos' },
  ],
  presentaciones: [
    { id: 'pr-mini', producto_id: 'p-mini', nombre: 'Caja x 600', con_cono: false, unidades_por_caja: 600, stock_cajas: 42 },
    { id: 'pr-mini-cono', producto_id: 'p-mini', nombre: 'Caja x 600 con cono', con_cono: true, unidades_por_caja: 600, stock_cajas: 20 },
    { id: 'pr-cap', producto_id: 'p-cap', nombre: 'Caja x 200', con_cono: false, unidades_por_caja: 200, stock_cajas: 0 },
    { id: 'pr-cap-cono', producto_id: 'p-cap', nombre: 'Caja x 200 con cono', con_cono: true, unidades_por_caja: 200, stock_cajas: 0 },
  ],
  marcas: [{ id: 'm-lolo', nombre: 'LOLO' }, { id: 'm-caserato', nombre: 'CASERATO' }],
  insumos: [
    { id: 'i-har', nombre: 'Harina 000', marca: 'Molino', categoria: 'Harinas', unidad_medida: 'kg', stock: 250 },
    { id: 'i-bol', nombre: 'Bolsa 100x80', marca: null, categoria: 'Bolsas', unidad_medida: 'un', stock: 0 },
  ],
}
// El stock de las presentaciones con cono, cono por cono.
const CONOS = new Map([['pr-mini-cono|m-lolo', 12], ['pr-mini-cono|', 8], ['pr-mini-cono|m-caserato', 0], ['pr-cap-cono|m-lolo', 0]])
const LOTES_MINI = [
  { lote: '7001-1', saldo: 15, desde: '2026-09-01' },
  { lote: '7005-2', saldo: 10, desde: '2026-09-05' },
  { lote: '7010-1', saldo: 20, desde: '2026-09-10' },
]

function conEmpresa(S) {
  S.estado.empresaId = 'u-n'
  S.estado.catalogo = CAT
  S.estado.catalogoEmpresa = 'u-n'
  S.estado.clientes = [{ id: 'c1', nombre: 'Anatolia', apodos: [], activo: true }]
  S.estado.form = S.formVacio()
  return S.estado.form
}
function conLotes(S, clave, lista) { S.estado.lotes.set(clave, { cargando: false, error: null, lista }) }

// ── Los TRES grupos, con el stock de cada cono ────────────────────────────
{
  const S = nuevo()
  conEmpresa(S)
  const g = S.gruposCatalogo(CAT, '', CONOS)
  chk('tres grupos, en orden: SIN CONO, CON CONO, insumos', g.map(x => x.tipo).join() === 'sin_cono,con_cono,insumos')
  chk('los títulos dicen SIN CONO y CON CONO', g[0].titulo === 'Producto terminado · SIN CONO' && g[1].titulo === 'Producto terminado · CON CONO')
  const con = g[1].lista
  chk('CON CONO: una opción por cono con stock (el cono de cada uno)', con.length === 2 && con.some(o => o.marcaId === 'm-lolo' && o.stock === 12) && con.some(o => o.marcaId === null && o.stock === 8))
  chk('el nombre dice el cono', con.find(o => o.marcaId === 'm-lolo').nombre === 'Cucurucho Mini · Caja x 600 con cono · LOLO' &&
    con.find(o => o.marcaId === null).nombre === 'Cucurucho Mini · Caja x 600 con cono · Común')
  chk('un cono sin stock no se ofrece sin buscar', !con.some(o => o.marcaId === 'm-caserato'))
  chk('sin buscar, SIN CONO trae solo lo que tiene stock', g[0].lista.map(o => o.presentacionId).join() === 'pr-mini')
  chk('sin buscar, los insumos sin stock no aparecen', g[2].lista.map(o => o.insumoId).join() === 'i-har')
  const h = S.htmlProductosRenglon(0, CAT, '', CONOS)
  chk('cada grupo con su encabezado de color', /rt-grupo rt-grupo--sin-cono">Producto terminado · SIN CONO</.test(h) &&
    /rt-grupo rt-grupo--con-cono">Producto terminado · CON CONO</.test(h) && /rt-grupo rt-grupo--insumos">Materia prima e insumos</.test(h))
  chk('cada opción con el color de su grupo', /rt-opcion rt-opcion--sin-cono" data-r-producto/.test(h) && /rt-opcion rt-opcion--con-cono" data-r-producto/.test(h) && /rt-opcion rt-opcion--insumos" data-r-insumo/.test(h))
  chk('cada opción dice cuánto hay', /hay 42 cajas/.test(h) && /hay 12 cajas/.test(h) && /hay 8 cajas/.test(h) && /hay 250 kg/.test(h))
  chk('la opción con cono lleva la presentación y el cono', /data-presentacion="pr-mini-cono" data-marca="m-lolo"/.test(h) && /data-presentacion="pr-mini-cono" data-marca=""/.test(h))
  const css = src.slice(src.indexOf('<style>'), src.indexOf('</style>'))
  chk('sin buscar se dice cómo encontrar lo que no tiene stock', /Escribí para buscar también lo que no tiene stock/.test(h))
  const catNull = { ...CAT, presentaciones: [{ ...CAT.presentaciones[2], stock_cajas: null }] }
  chk('un stock que no se sabe NO esconde la opción', S.gruposCatalogo(catNull, '', CONOS).some(x => x.lista.some(o => o.presentacionId === 'pr-cap')))
  chk('los tres colores son distintos (grafito, amarillo, marrón)', /\.rt-grupo--sin-cono \{[^}]*--grafito/.test(css) && /\.rt-grupo--con-cono \{[^}]*--amarillo/.test(css) && /\.rt-grupo--insumos  \{[^}]*--marron/.test(css))
}
{
  // Si la base no mandara 'conos' (red por si la función cambia): una opción
  // por presentación con el stock entre todos los conos, y el cono se elige
  // después.
  const S = nuevo()
  conEmpresa(S)
  const con = S.gruposCatalogo(CAT, '', null).find(x => x.tipo === 'con_cono').lista
  chk('sin stock por cono, una sola opción por presentación con cono', con.length === 1 && con[0].presentacionId === 'pr-mini-cono' && con[0].marcaId === undefined)
  const h = S.htmlProductosRenglon(0, CAT, '', null)
  chk('y dice que el stock es entre todos los conos', /hay 20 cajas entre todos los conos/.test(h))
  chk('y que el cono se elige después', /data-presentacion="pr-mini-cono" data-marca="elegir"/.test(h))
}
{
  // BUSCAR trae también lo que no tiene stock, marcado "sin stock".
  const S = nuevo()
  conEmpresa(S)
  const g = S.gruposCatalogo(CAT, 'capelina', CONOS)
  chk('al buscar aparecen los productos sin stock', g.find(x => x.tipo === 'sin_cono').lista.some(o => o.presentacionId === 'pr-cap' && o.stock === 0))
  chk('una presentación con cono sin ningún cono con stock: una opción para elegir el cono', g.find(x => x.tipo === 'con_cono').lista.some(o => o.presentacionId === 'pr-cap-cono' && o.marcaId === undefined))
  const h = S.htmlProductosRenglon(0, CAT, 'capelina', CONOS)
  chk('marcado "sin stock" en bordó', /<span class="rt-opcion__sin-stock">sin stock<\/span>/.test(h))
  chk('y no se dice la pista de buscar', !/Escribí para buscar/.test(h))
  const hb = S.htmlProductosRenglon(0, CAT, 'bolsa', CONOS)
  chk('al buscar aparece el insumo sin stock, marcado', /data-id="i-bol"/.test(hb) && /sin stock/.test(hb))
  chk('al buscar "caserato" aparece ese cono sin stock', S.gruposCatalogo(CAT, 'lolo', CONOS).find(x => x.tipo === 'con_cono').lista.length === 1)
}
{
  // Elegir una opción de CON CONO pone la presentación y el cono.
  const S = nuevo()
  const f = conEmpresa(S)
  S.elegirProductoRenglon(0, 'p-mini', 'pr-mini-cono', 'm-lolo')
  const r = f.renglones[0]
  chk('elegir "Mini con cono · LOLO" pone producto, presentación, con cono y el cono', r.productoId === 'p-mini' && r.presentacionId === 'pr-mini-cono' && r.conCono === true && r.marcaId === 'm-lolo')
  S.elegirProductoRenglon(0, 'p-mini', 'pr-mini-cono', 'elegir')
  chk('"elegir" deja el cono común para cambiarlo', r.conCono === true && r.marcaId === null)
  S.elegirProductoRenglon(0, 'p-mini', 'pr-mini', '')
  chk('una opción SIN CONO deja sin cono', r.conCono === false && r.marcaId === null && r.presentacionId === 'pr-mini')
  S.elegirProductoRenglon(0, 'p-mini', 'pr-cap', '')
  chk('una presentación de otro producto no se toma (queda la única del producto)', r.presentacionId === 'pr-mini')
  S.elegirInsumoRenglon(0, 'i-bol')
  chk('un insumo sin stock se puede elegir', r.insumoId === 'i-bol' && r.unidad === 'un')
}

// ── El catálogo lee los insumos sin stock y el stock por cono ─────────────
{
  const S = nuevo()
  S.__setRpc(async (n) => n === 'catalogo_para_retiro'
    ? { data: { productos: [], insumos: [{ insumo_id: 'i-har', nombre: 'Harina', unidad_medida: 'kg', stock: 5 }] }, error: null }
    : { data: null, error: null })
  S.__tablas.insumos = [{ id: 'i-har', nombre: 'Harina', unidad_medida: 'kg' }, { id: 'i-sin', nombre: 'Film', unidad_medida: 'kg' }]
  esperas.push(S.leerCatalogo('u-n').then(c => {
    chk('los insumos sin stock se suman con stock 0', c.insumos.length === 2 && c.insumos.find(i => i.id === 'i-sin').stock === 0)
    chk('el que tiene stock no se duplica', c.insumos.filter(i => i.id === 'i-har').length === 1 && c.insumos.find(i => i.id === 'i-har').stock === 5)
    const q = S.__llamadas.consultas.find(x => x[0] === 'insumos')
    chk('los insumos se leen activos', q && q[1].some(f => f[0] === 'eq' && f[1] === 'activo' && f[2] === true))
  }))
  const T = nuevo()
  T.__setRpc(async () => ({ data: { productos: [], insumos: [] }, error: null }))
  T.__tablas.insumos = () => ({ data: null, error: { message: 'falló' } })
  esperas.push(T.leerCatalogo('u-n').then(c => chk('si los insumos sin stock no se pueden leer, el catálogo sale igual', Array.isArray(c.insumos) && c.insumos.length === 0),
    () => chk('si los insumos sin stock no se pueden leer, el catálogo sale igual', false)))
}
{
  // El stock por cono viene de catalogo_para_retiro().conos (29/09/2026), sin
  // pedir stock:ver: el depósito lo ve siempre. Desde la noche del 29/09/2026
  // la base trae también el cono común (marca null, cono 'Común').
  const S = nuevo()
  const data = {
    productos: [
      { presentacion_id: 'pr-a', producto: 'Mini', presentacion: 'Caja con cono', categoria: 'cucuruchones', con_cono: true, stock_cajas: 11 },
      { presentacion_id: 'pr-b', producto: 'Mini', presentacion: 'Caja', categoria: 'cucuruchones', con_cono: false, stock_cajas: 30 },
      { presentacion_id: 'pr-c', producto: 'Grande', presentacion: 'Caja con cono', categoria: 'cucuruchones', con_cono: true, stock_cajas: 5 },
    ],
    conos: [
      { presentacion_id: 'pr-a', marca_id: null, cono: 'Común', stock_cajas: 4 },
      { presentacion_id: 'pr-a', marca_id: 'm1', cono: 'LOLO', stock_cajas: 7 },
      { presentacion_id: 'pr-c', marca_id: 'm2', cono: 'CASERATO', stock_cajas: 5 },
    ],
    insumos: [],
  }
  const m = S.conosDesdeRpc(data)
  chk('los conos de la base, por presentación y cono', m instanceof Map && m.get('pr-a|m1') === 7 && m.get('pr-c|m2') === 5)
  chk('el cono común viene de la base (marca null)', m.get('pr-a|') === 4)
  chk('el común NO se deduce restando: sin fila de común no hay común', !m.has('pr-c|'))
  chk('el común de la base se toma tal cual aunque el stock de la presentación diga otra cosa', S.conosDesdeRpc({ ...data, conos: [{ presentacion_id: 'pr-a', marca_id: null, cono: 'Común', stock_cajas: 9 }] }).get('pr-a|') === 9)
  chk('una presentación SIN cono no suma cono común', !m.has('pr-b|'))
  chk('sin la clave conos, null (el cono se elige después)', S.conosDesdeRpc({ productos: data.productos }) === null && S.conosDesdeRpc(null) === null)
  chk('un stock de presentación desconocido no inventa un cono común', !S.conosDesdeRpc({ productos: [{ presentacion_id: 'pr-x', con_cono: true, stock_cajas: null }], conos: [] }).has('pr-x|'))
  const cat = S.catalogoDesdeRpc(data, [{ id: 'm1', nombre: 'LOLO' }, { id: 'm2', nombre: 'CASERATO' }], [])
  chk('el catálogo lleva los conos', cat.conos instanceof Map && cat.conos.get('pr-a|m1') === 7)
  const h = S.htmlProductosRenglon(0, cat, '')
  chk('sin pasar nada, las opciones usan los conos del catálogo', /data-presentacion="pr-a" data-marca="m1"/.test(h) && /hay 7 cajas/.test(h) &&
    /data-presentacion="pr-a" data-marca=""/.test(h) && !/entre todos los conos/.test(h))
  const sinConos = S.catalogoDesdeRpc({ productos: data.productos }, [], [])
  chk('sin conos de la base, la red: entre todos los conos', sinConos.conos === null && /hay 11 cajas entre todos los conos/.test(S.htmlProductosRenglon(0, sinConos, '')))
  chk('ya no se lee stock_terminado_movimientos ni se pide stock:ver', !/stock_terminado_movimientos/.test(src.slice(src.indexOf('<script'))) && !/leerStockConos|puedeVerStockTerminado/.test(src))
  const T = nuevo()
  T.__setRpc(async (n) => n === 'catalogo_para_retiro' ? { data, error: null } : { data: null, error: null })
  T.__tablas.insumos = []
  esperas.push(T.leerCatalogo('u-n').then(c => chk('leerCatalogo trae los conos de catalogo_para_retiro', c.conos instanceof Map && c.conos.get('pr-c|m2') === 5 &&
    !T.__llamadas.consultas.some(q => q[0] === 'stock_terminado_movimientos'))))
}

// ── Los lotes de un insumo: el stock SIN LOTE se ofrece, "SIN STOCK" no ─────
{
  const S = nuevo()
  const li = S.lotesDeInsumo([{ lote: null, cantidad: 30, desde: '2026-09-01' }, { lote: 'SIN STOCK', cantidad: 4, desde: '2026-09-02' }, { lote: 'H-1', cantidad: 5, desde: '2026-09-03' }])
  chk('el stock sin lote de un insumo se ofrece, como lote ""', li.some(l => l.lote === '' && l.saldo === 30))
  chk('"SIN STOCK" nunca es un lote para elegir', !li.some(l => l.lote === 'SIN STOCK') && li.length === 2)
}

// ── Completar con los más viejos: 42 = 15 + 10 + 17 ────────────────────────
{
  const S = nuevo()
  chk('reparte desde el más viejo, cada lote hasta su stock', JSON.stringify(S.completarConLosMasViejos(LOTES_MINI, 42)) === '{"7001-1":15,"7005-2":10,"7010-1":17}')
  chk('lo que no entra queda sin asignar', JSON.stringify(S.completarConLosMasViejos(LOTES_MINI, 50)) === '{"7001-1":15,"7005-2":10,"7010-1":20}')
  chk('poco alcanza con el primero', JSON.stringify(S.completarConLosMasViejos(LOTES_MINI, 4)) === '{"7001-1":4}')
  chk('kilos con decimales, sin ruido de punto flotante', JSON.stringify(S.completarConLosMasViejos([{ lote: 'a', saldo: 0.1 }, { lote: 'b', saldo: 0.2 }], 0.3)) === '{"a":0.1,"b":0.2}')
  chk('sin nada pedido no reparte', JSON.stringify(S.completarConLosMasViejos(LOTES_MINI, null)) === '{}')
}
{
  const S = nuevo()
  const f = conEmpresa(S)
  S.elegirProductoRenglon(0, 'p-mini', 'pr-mini', '')
  conLotes(S, S.claveLotes('pr-mini', null), LOTES_MINI)
  const r = f.renglones[0]
  r.cajas = 42
  S.completarLotes(0)
  chk('"Completar con los más viejos" en el renglón: 15 + 10 + 17', JSON.stringify(r.lotes) === '{"7001-1":15,"7005-2":10,"7010-1":17}')
  const h = S.htmlLoteRenglon(r, 0)
  chk('la lista de lotes: el más viejo primero, con lo que queda', h.indexOf('7001-1') < h.indexOf('7005-2') && h.indexOf('7005-2') < h.indexOf('7010-1') && /queda 20 cajas/.test(h))
  chk('un campo por lote', (h.match(/data-r-lote-cant="0"/g) || []).length === 3)
  chk('y el botón "Completar con los más viejos"', /data-r-completar="0"[^>]*>Completar con los más viejos</.test(h))
  chk('siempre dice el total pedido y lo asignado', /Pedido: <strong>42 cajas<\/strong> · asignado todo\./.test(h))
  chk('el payload lleva los tres lotes', JSON.stringify(S.itemParaBase(r)) ===
    '{"presentacion_id":"pr-mini","marca_id":null,"cajas":42,"lotes":[{"lote":"7001-1","cajas":15},{"lote":"7005-2","cajas":10},{"lote":"7010-1","cajas":17}]}')
  chk('repartido todo, nada falta', S.faltanRenglon(r) === null)
  // A mano: 15 del más viejo y nada más → falta asignar 27, y bloquea (hay lugar).
  r.lotes = {}
  S.ponerCantidadLote(0, '7001-1', 15)
  const a = S.asignacion(r, LOTES_MINI)
  chk('asignado 15 de 42: falta asignar 27', a.asignado === 15 && a.falta === 27 && a.sinLugar === false)
  chk('viaja SOLO el lote con cantidad, y lo que falta con lugar NO va a "SIN STOCK"', JSON.stringify(S.lotesParaBase(r, LOTES_MINI)) === '[{"lote":"7001-1","cajas":15}]')
  chk('el resumen dice cuánto falta asignar', /falta asignar: <strong>27 cajas<\/strong>/.test(S.htmlResumenLotes(r, LOTES_MINI)))
  chk('con lugar en otros lotes, lo que falta asignar bloquea (con qué hacer)', /faltan asignar 27 cajas a los lotes \(tocá «Completar con los más viejos»\)/.test(S.faltanRenglon(r)))
  S.ponerCantidadLote(0, '7001-1', null)
  chk('borrar un lote lo saca', !('7001-1' in r.lotes))
  S.ponerCantidadLote(0, '7001-1', 30)
  S.ponerCantidadLote(0, '7005-2', 20)
  chk('asignar de más que lo pedido bloquea', /asignaste 8 cajas de más a los lotes/.test(S.faltanRenglon(r)))
  S.limpiarLotes(0)
  chk('"Que salga sola de los más viejos" suelta todo', Object.keys(r.lotes).length === 0 && !('lotes' in S.itemParaBase(r)))
  chk('sin repartir no bloquea', S.faltanRenglon(r) === null)
  chk('un lote que no está en la lista no viaja', (r.lotes = { 'no-existe': 5 }, !('lotes' in S.itemParaBase(r))))
}

// ── El FALTANTE: se avisa en bordó y NO bloquea ─────────────────────────────
{
  const S = nuevo()
  const f = conEmpresa(S)
  S.elegirProductoRenglon(0, 'p-mini', 'pr-mini', '')
  conLotes(S, S.claveLotes('pr-mini', null), LOTES_MINI)
  const r = f.renglones[0]
  r.cajas = 50
  // Sin repartir: 50 pedidas, 45 en stock → faltan 5.
  let a = S.asignacion(r, LOTES_MINI)
  chk('sin repartir, lo pedido de más que el stock es faltante', a.faltante === 5)
  let h = S.htmlLoteRenglon(r, 0)
  chk('el aviso en bordó con el texto pedido', /rt-aviso rt-aviso--grave" data-r-faltante>Esto no está en stock: la orden sale igual y queda pendiente de revisión en Administración \(faltan 5 cajas\)/.test(h))
  chk('y no bloquea', S.faltanRenglon(r) === null)
  chk('sin repartir no viajan lotes: la base descuenta y marca el faltante', !('lotes' in S.itemParaBase(r)))
  // Completar: 45 asignadas, 5 sin lugar → lote SIN STOCK.
  S.completarLotes(0)
  a = S.asignacion(r, LOTES_MINI)
  chk('completado: falta 5 y no hay más lugar', a.falta === 5 && a.sinLugar === true && a.faltante === 5)
  chk('el resumen dice que no hay más en stock', /falta asignar: <strong>5 cajas<\/strong> \(no hay más en stock\)/.test(S.htmlResumenLotes(r, LOTES_MINI)))
  chk('sin lugar, lo que falta asignar NO bloquea', S.faltanRenglon(r) === null)
  chk('y viaja en el lote "SIN STOCK"', JSON.stringify(S.itemParaBase(r).lotes) ===
    '[{"lote":"7001-1","cajas":15},{"lote":"7005-2","cajas":10},{"lote":"7010-1","cajas":20},{"lote":"SIN STOCK","cajas":5}]')
  chk('la suma de los lotes es lo pedido (la base toma las cajas de la suma)', S.itemParaBase(r).lotes.reduce((s, l) => s + l.cajas, 0) === 50)
  // Pedir de más en UN lote: también es faltante, y no bloquea.
  r.cajas = 20
  r.lotes = { '7001-1': 20 }
  a = S.asignacion(r, LOTES_MINI)
  chk('pedir 20 de un lote con 15 es un faltante de 5', a.faltante === 5 && a.falta === 0)
  chk('se avisa el lote excedido', /Lote 7001-1: pusiste 20 cajas y hay 15 cajas\./.test(S.htmlResumenLotes(r, LOTES_MINI)))
  chk('y no bloquea', S.faltanRenglon(r) === null)
  // Sin ningún lote (sin stock): todo es faltante.
  conLotes(S, S.claveLotes('pr-cap', null), [])
  S.elegirProductoRenglon(0, 'p-cap', 'pr-cap', '')
  r.cajas = 3
  h = S.htmlLoteRenglon(r, 0)
  chk('algo sin stock: todo lo pedido es faltante, con el aviso', /No hay lotes con stock de este producto/.test(h) && /faltan 3 cajas/.test(h))
  chk('y no bloquea', S.faltanRenglon(r) === null)
  // Lotes que no se pudieron leer: no se inventa un faltante.
  S.estado.lotes.set(S.claveLotes('pr-cap', null), { cargando: false, error: 'No se pudieron leer los lotes.', lista: [] })
  chk('si los lotes no se pudieron leer, no se inventa un faltante', S.asignacion(r, S.listaLotesDe(r)).faltante === null && !/data-r-faltante/.test(S.htmlLoteRenglon(r, 0)))
}
{
  // Confirmar con un faltante: la orden SALE (no bloquea).
  const S = nuevo()
  const f = conEmpresa(S)
  S.elegirCliente('c1')
  S.elegirProductoRenglon(0, 'p-mini', 'pr-mini', '')
  conLotes(S, S.claveLotes('pr-mini', null), LOTES_MINI)
  f.renglones[0].cajas = 50
  S.completarLotes(0)
  S.revisar()
  const res = S.__els.get('rt-resumen').innerHTML
  chk('el resumen dice de qué lote sale cada parte', /Lote 7001-1: 15 cajas · Lote 7005-2: 10 cajas · Lote 7010-1: 20 cajas/.test(res))
  chk('y el aviso del faltante en bordó', /data-r-faltante>Esto no está en stock/.test(res))
  let p = null
  S.__setRpc(async (n, x) => {
    if (n === 'registrar_orden_retiro') { p = x; return { data: { orden_id: 'o', codigo: 'N-0040', stock_insuficiente: [{ renglon: 1, producto: 'Cucurucho Mini', presentacion: 'Caja x 600', pedidas: 50, faltaron: 5 }] }, error: null } }
    return { data: [], error: null }
  })
  esperas.push(S.confirmar().then(() => {
    chk('confirmar con faltante LLAMA a la base (no bloquea)', !!p && p.p_items[0].lotes.length === 4)
    const h = S.__els.get('rt-hecho').innerHTML
    chk('la orden sale y dice que quedó pendiente de revisión en Administración', S.estado.vista === 'rt-vista-hecho' && /quedó pendiente de revisión en Administración/.test(h) && /faltaron 5 de 50 cajas/.test(h))
  }))
}

// ── Insumos: cantidad por lote, y el stock SIN LOTE ─────────────────────────
{
  const S = nuevo()
  const f = conEmpresa(S)
  S.elegirInsumoRenglon(0, 'i-har')
  const r = f.renglones[0]
  r.cantidad = 30.5
  conLotes(S, S.claveLotesInsumo('i-har'), [{ lote: '', saldo: 10, desde: '2026-09-01' }, { lote: 'H-10', saldo: 25, desde: '2026-09-10' }])
  S.completarLotes(0)
  chk('un insumo reparte en su unidad, con decimales', JSON.stringify(r.lotes) === '{"":10,"H-10":20.5}')
  chk('el stock sin lote viaja con lote "" (la base lo toma como el lote null)', JSON.stringify(S.itemParaBase(r)) ===
    '{"insumo_id":"i-har","cantidad":30.5,"lotes":[{"lote":"","cantidad":10},{"lote":"H-10","cantidad":20.5}]}')
  const h = S.htmlLoteRenglon(r, 0)
  chk('el stock sin lote se llama "Sin lote"', />Sin lote<span/.test(h) && /queda 10 kg/.test(h))
  r.cantidad = 40
  S.completarLotes(0)
  chk('un insumo que no alcanza: el resto al lote "SIN STOCK", con cantidad', JSON.stringify(S.itemParaBase(r).lotes.at(-1)) === '{"lote":"SIN STOCK","cantidad":5}')
  chk('y el aviso lo dice en su unidad', /faltan 5 kg/.test(S.htmlLoteRenglon(r, 0)))
}

// ── Los lotes se leen solos y el resumen se redibuja sin perder el foco ───
{
  const S = nuevo()
  const f = conEmpresa(S)
  let pedidos = 0
  S.__setRpc(async (n) => { if (n === 'lotes_para_retiro') pedidos++; return { data: [{ lote: '7001-1', cajas: 15, desde: '2026-09-01' }], error: null } })
  S.elegirProductoRenglon(0, 'p-mini', 'pr-mini', '')
  esperas.push(tic().then(() => {
    chk('elegido el producto, los lotes se leen solos', pedidos === 1 && S.listaLotesDe(f.renglones[0])?.[0]?.lote === '7001-1')
    S.agregarRenglon()
    return tic().then(() => chk('no se vuelven a leer los que ya están', pedidos === 1))
  }))
  const src2 = src
  chk('tipear en un lote redibuja SOLO el resumen (no el renglón)', /function ponerCantidadLote[\s\S]*?pintarResumenLotes\(i\)[\s\S]*?\n    \}/.test(src2) &&
    !/function ponerCantidadLote[^}]*pintarRenglones/.test(src2))
  chk('los campos de lote se enlazan con los decimales del renglón y se escriben con ponerNumero', /querySelectorAll\('\[data-r-lote-cant\]'\)/.test(src2) &&
    /enlazarCampoNumero\(input, \{ decimales: r\?\.insumoId \? decimalesDeUnidad\(r\.unidad\) : DECIMALES_CAJAS \}\)/.test(src2))
}
{
  // Un borrador de antes (con UN lote elegido) pasa a la forma nueva.
  const S = nuevo()
  S.estado.misTareas = new Map([['retiros:cargar', { unidades: ['u-n'] }]])
  S.__ls.set(S.CLAVE_BORRADOR, JSON.stringify({ empresaId: 'u-n', form: { uuid: 'u-1', renglones: [
    { clave: 1, productoId: 'p-mini', presentacionId: 'pr-mini', conCono: false, cajas: 7, lote: '7001-1', eligiendoLote: true }] } }))
  chk('se retoma', S.retomarBorrador() === true)
  const r = S.estado.form.renglones[0]
  chk('el lote elegido pasa a "lotes" con todo lo pedido', JSON.stringify(r.lotes) === '{"7001-1":7}' && !('lote' in r) && !('eligiendoLote' in r))
}

// ── HTML malicioso ─────────────────────────────────────────────────────────
{
  const S = nuevo()
  conEmpresa(S)
  const cat = {
    productos: [{ id: 'p1', nombre: marca('prod'), categoria: null }],
    presentaciones: [{ id: 'pr1', producto_id: 'p1', nombre: marca('pres'), con_cono: true, stock_cajas: 3 }],
    marcas: [{ id: 'm1', nombre: marca('cono') }],
    insumos: [{ id: 'i1', nombre: marca('ins'), marca: marca('ins-marca'), unidad_medida: marca('uni'), stock: 0 }],
  }
  const h = S.htmlProductosRenglon(0, cat, '', new Map([['pr1|m1', 3]]))
  chequearMarcas(chk, 'opción con cono', h, ['prod', 'pres', 'cono'])
  chequearMarcas(chk, 'insumo sin stock al buscar', S.htmlProductosRenglon(0, cat, 'b data', null), ['ins', 'ins-marca', 'prod', 'pres'])
  const r = { ...S.renglonNuevo(), insumoId: 'i1', unidad: marca('uni'), cantidad: 9, lotes: { [marca('lote')]: 9 } }
  S.estado.lotes.set(S.claveLotesInsumo('i1'), { cargando: false, error: null, lista: [{ lote: marca('lote'), saldo: 4, desde: null }] })
  chequearMarcas(chk, 'lotes repartidos, excedidos y el faltante', S.htmlLoteRenglon(r, 0), ['lote', 'uni'])
  chequearMarcas(chk, 'resumen de lotes', S.htmlResumenLotes(r, [{ lote: marca('lote'), saldo: 4 }]), ['lote', 'uni'])
  // Cada rama del resumen (sin repartir, falta asignar, de más) con la unidad de la base.
  const L = [{ lote: 'a', saldo: 4 }, { lote: 'b', saldo: 10 }]
  chequearMarcas(chk, 'resumen sin repartir', S.htmlResumenLotes({ ...r, lotes: {} }, L), ['uni'])
  chequearMarcas(chk, 'resumen con falta asignar', S.htmlResumenLotes({ ...r, lotes: { a: 2 } }, L), ['uni'])
  chequearMarcas(chk, 'resumen con de más', S.htmlResumenLotes({ ...r, lotes: { a: 4, b: 10 } }, L), ['uni'])
  const catUni = { ...cat, insumos: [{ ...cat.insumos[0], stock: 5 }] }
  chequearMarcas(chk, 'stock de un insumo en su unidad', S.htmlProductosRenglon(0, catUni, '', null), ['uni'])
}

fin()
