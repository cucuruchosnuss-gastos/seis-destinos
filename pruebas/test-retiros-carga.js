// LA CARGA de órdenes de retiro (modulos/retiros.html, 26/09/2026): el
// depósito, desde el celular, SIN NADA DE PLATA.
//
// Empresa primero (una no pregunta, varias sí, y cambiar con la orden a medio
// cargar pide confirmación y la vacía), cliente por nombre / razón social /
// apodo, renglones producto → cono → presentación → cajas → lote opcional,
// resumen sin precios, una sola llamada a registrar_orden_retiro con el MISMO
// uuid en cada reintento, y el aviso de stock que no bloquea.
//
//   node pruebas/test-retiros-carga.js

const path = require('path')
const fs = require('fs')
const { construirRetiros } = require('./sandbox-retiros')
const { arnes, marca, chequearMarcas } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/retiros.html')
const src = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${src.length} bytes)`)
const { chk, esperas, fin } = arnes()
const nuevo = () => construirRetiros(ARCHIVO)

// El catálogo como lo arma catalogoDesdeRpc(): productos con su categoría,
// presentaciones con su stock en cajas, y los insumos con stock.
const CAT = {
  productos: [
    { id: 'p-cuc', nombre: 'Cucurucho grande', categoria: 'cucuruchones' },
    { id: 'p-cap', nombre: 'Capelina', categoria: 'barquillos' },
    { id: 'p-cho', nombre: 'Cannoli', categoria: 'especiales' },
  ],
  presentaciones: [
    { id: 'pr-cuc-sin', producto_id: 'p-cuc', nombre: 'Caja x 100', con_cono: false, unidades_por_caja: 100, stock_cajas: 40 },
    { id: 'pr-cuc-con', producto_id: 'p-cuc', nombre: 'Caja x 100 con cono', con_cono: true, unidades_por_caja: 100, stock_cajas: 5 },
    { id: 'pr-cho-sin', producto_id: 'p-cho', nombre: 'Caja x 50', con_cono: false, unidades_por_caja: 50, stock_cajas: 0 },
    { id: 'pr-cap-a', producto_id: 'p-cap', nombre: 'Caja x 200', con_cono: false, unidades_por_caja: 200, stock_cajas: 12 },
    { id: 'pr-cap-b', producto_id: 'p-cap', nombre: 'Media caja', con_cono: false, unidades_por_caja: 100, stock_cajas: 3 },
  ],
  marcas: [{ id: 'm-lolo', nombre: 'LOLO', estado_alta: 'aprobada' }],
  insumos: [
    { id: 'i-har', nombre: 'Harina 000', marca: 'Molino Cañuelas', categoria: 'Harinas', unidad_medida: 'kg', stock: 250 },
    { id: 'i-caj', nombre: 'Caja N°1', marca: 'Nuss', categoria: 'Cajas', unidad_medida: 'un', stock: 300 },
  ],
}
const CLIENTES = [
  { id: 'c1', nombre: 'Distribuidora Anatolia', razon_social: 'ANATOLIA SRL', apodos: ['el Turco'], cuit: '30712345678', domicilio: 'Av. Siempreviva 742', localidad: 'Córdoba', email: 'compras@anatolia.com', transporte_habitual: 'Expreso Norte', activo: true },
  { id: 'c2', nombre: 'Kiosco Pepe', razon_social: null, apodos: [], cuit: null, domicilio: null, localidad: null, email: null, transporte_habitual: null, activo: true },
]

function conEmpresa(S, id = 'u-n') {
  S.estado.empresaId = id
  S.estado.catalogo = CAT
  S.estado.catalogoEmpresa = id
  S.estado.clientes = CLIENTES
  S.estado.form = S.formVacio()
  return S.estado.form
}

// Un renglón completo: Cucurucho grande sin cono, 10 cajas.
function cargarRenglon(S, i = 0, cajas = 10) {
  S.elegirProductoRenglon(i, 'p-cuc')
  S.estado.form.renglones[i].cajas = cajas
}

// ── La empresa primero ──────────────────────────────────────────────────────
{
  const S = nuevo()
  S.estado.misTareas = new Map([['retiros:cargar', { unidades: ['u-n'] }]])
  chk('con retiros:cargar en una sola empresa, esa es la única', JSON.stringify(S.empresasDeCarga().map(e => e.id)) === '["u-n"]')
  S.empezarOrden()
  chk('UNA empresa NO pregunta: va derecho a cargar', S.estado.vista === 'rt-vista-form' && S.estado.empresaId === 'u-n')
  chk('y la empresa se ve arriba', S.__els.get('rt-empresa-actual').hidden === false && /Cucuruchos Nuss/.test(S.__els.get('rt-empresa-actual').innerHTML))
  chk('con una sola empresa no hay "Cambiar"', !/rt-btn-cambiar-empresa/.test(S.htmlEmpresaActual()))
}
{
  const S = nuevo()
  S.estado.misTareas = new Map([['retiros:cargar', { todas: true }]])
  S.empezarOrden()
  chk('VARIAS empresas preguntan primero', S.estado.vista === 'rt-vista-empresa' && S.estado.empresaId === null)
  const h = S.__els.get('rt-empresas').innerHTML
  chk('la pregunta ofrece las dos empresas', /data-empresa="u-n"/.test(h) && /data-empresa="u-d"/.test(h))
  chk('con el logo de cada una', /src="\.\.\/logo-cucuruchos-nuss\.png"/.test(h) && /src="\.\.\/logo-dolce-pasta\.png"/.test(h))
  S.elegirEmpresa('u-d')
  chk('elegir una empresa abre la carga de esa empresa', S.estado.vista === 'rt-vista-form' && S.estado.empresaId === 'u-d')
  chk('se recuerda la última', S.__ls.get(S.CLAVE_EMPRESA) === 'u-d')
  chk('con varias hay "Cambiar" arriba', /rt-btn-cambiar-empresa/.test(S.htmlEmpresaActual()))
  // La próxima orden vuelve a preguntar, con la última marcada y primera.
  S.estado.form = null
  S.empezarOrden()
  const h2 = S.__els.get('rt-empresas').innerHTML
  chk('una orden nueva vuelve a preguntar', S.estado.vista === 'rt-vista-empresa')
  chk('la última usada va primera', h2.indexOf('data-empresa="u-d"') < h2.indexOf('data-empresa="u-n"'))
  chk('y marcada como la última', /data-empresa="u-d" aria-pressed="true"/.test(h2) && /la última que usaste/.test(h2))
  chk('una empresa que no está en la lista no se elige', (S.elegirEmpresa('u-zzz'), S.estado.empresaId === null))
}
{
  const S = nuevo()
  S.estado.misTareas = new Map([['retiros:cargar', { unidades: ['u-n'] }], ['retiros:ver', { todas: true }]])
  chk('solo cuentan las empresas donde CARGA (ver no alcanza)', JSON.stringify(S.empresasDeCarga().map(e => e.id)) === '["u-n"]')
  S.estado.miRolApp = 'super_admin'
  S.estado.misTareas = new Map()
  chk('super_admin carga en todas', S.empresasDeCarga().length === 2)
}

// ── Cambiar de empresa con la orden a medio cargar ─────────────────────────
{
  const S = nuevo()
  S.estado.misTareas = new Map([['retiros:cargar', { todas: true }]])
  const f = conEmpresa(S, 'u-n')
  chk('una orden vacía no tiene datos', S.formTieneDatos(f) === false)
  S.elegirCliente('c1')
  chk('con cliente elegido ya tiene datos', S.formTieneDatos(f) === true)
  S.elegirEmpresa('u-d')
  chk('cambiar con la orden a medio cargar NO cambia: pide confirmación', S.estado.empresaId === 'u-n' && S.estado.empresaPendiente === 'u-d')
  chk('el panel de confirmación se ve', S.__els.get('rt-panel-cambiar').hidden === false)
  chk('la orden sigue intacta mientras tanto', S.estado.form === f && f.clienteId === 'c1')
  S.cancelarCambioEmpresa()
  chk('cancelar deja todo como estaba', S.estado.empresaId === 'u-n' && S.estado.empresaPendiente === null && S.estado.form === f)
  chk('y esconde el panel', S.__els.get('rt-panel-cambiar').hidden === true)
  S.elegirEmpresa('u-d')
  S.confirmarCambioEmpresa()
  chk('confirmar cambia de empresa', S.estado.empresaId === 'u-d')
  chk('y VACÍA la orden', S.estado.form && S.estado.form !== f && S.estado.form.clienteId === null && S.estado.form.renglones.length === 1 && !S.estado.form.renglones[0].productoId)
  chk('con un uuid nuevo', S.estado.form.uuid !== f.uuid)
  chk('y se olvida el catálogo, los clientes y los lotes de la otra empresa', S.estado.catalogoEmpresa !== 'u-d' || S.estado.catalogo === null)
}
{
  const S = nuevo()
  S.estado.misTareas = new Map([['retiros:cargar', { todas: true }]])
  const f = conEmpresa(S, 'u-n')
  S.elegirEmpresa('u-d')
  chk('sin datos cargados, cambiar de empresa no pregunta', S.estado.empresaId === 'u-d' && S.estado.empresaPendiente === null)
  chk('la orden vacía se reemplaza por una de la empresa nueva', S.estado.form !== f)
}

// ── El cliente ─────────────────────────────────────────────────────────────
{
  const S = nuevo()
  conEmpresa(S)
  chk('busca por nombre', S.clientesFiltrados(CLIENTES, 'anatolia').map(c => c.id).join() === 'c1')
  chk('busca por razón social', S.clientesFiltrados(CLIENTES, 'srl').map(c => c.id).join() === 'c1')
  chk('busca por apodo, sin acentos ni mayúsculas', S.clientesFiltrados(CLIENTES, 'TURCO').map(c => c.id).join() === 'c1')
  chk('un cliente que no coincide lo dice', /Ningún cliente coincide/.test(S.htmlResultadosClientes('zzz')))
  S.elegirCliente('c1')
  const f = S.estado.form
  chk('elegir el cliente trae su transporte habitual', f.transporte === 'Expreso Norte' && S.__els.get('rt-transporte').value === 'Expreso Norte')
  S.cambiarCliente()
  f.transporte = 'Mi flete'
  S.elegirCliente('c1')
  chk('un transporte escrito a mano no se pisa', f.transporte === 'Mi flete')
  const T = nuevo()
  let sel = ''
  T.__tablas.clientes = (fl) => { sel = (fl.find(x => x[0] === 'select') || [])[1] || ''; return { data: [], error: null } }
  esperas.push(T.leerClientes('u-n').then(() => chk('los clientes se leen SIN nada de plata (ni límite, ni lista)',
    !!sel && !/limite|lista_precio|saldo|precio|credito|plazo/i.test(sel) && /transporte_habitual/.test(sel) && /email/.test(sel), sel)))
}

// ── Los renglones ──────────────────────────────────────────────────────────
{
  const S = nuevo()
  const f = conEmpresa(S)
  const r = f.renglones[0]
  chk('arranca con un renglón SIN CONO', r.conCono === false && r.productoId === null)
  S.elegirProductoRenglon(0, 'p-cuc')
  chk('con una sola presentación sin cono, se elige sola', r.presentacionId === 'pr-cuc-sin')
  let h = S.htmlRenglon(r, 0, CAT, false)
  chk('sin cono no hay buscador de conos', !/data-r-cono-buscar/.test(h))
  S.elegirConoRenglon(0, true)
  h = S.htmlRenglon(r, 0, CAT, false)
  chk('con cono aparece el buscador de conos a un toque', /data-r-cono-buscar="0"/.test(h) && /Cono común/.test(h))
  chk('con cono cambia la presentación', r.presentacionId === 'pr-cuc-con')
  S.elegirMarcaRenglon(0, 'm-lolo')
  chk('elegir un cono', r.marcaId === 'm-lolo')
  chk('el cono se nombra', S.textoCono(CAT, true, 'm-lolo') === 'LOLO' && S.textoCono(CAT, true, null) === 'Común' && S.textoCono(CAT, false, 'm-lolo') === 'Sin cono')
  S.elegirConoRenglon(0, false)
  chk('volver a sin cono olvida el cono', r.marcaId === null)
  const hp = S.htmlProductosRenglon(0, CAT)
  const pos = (t) => hp.indexOf(t)
  chk('los productos van por categoría: Cucuruchones, Barquillos, Especiales', pos('>Cucuruchones<') !== -1 && pos('>Cucuruchones<') < pos('p-cuc') &&
    pos('p-cuc') < pos('>Barquillos<') && pos('>Barquillos<') < pos('p-cap') && pos('p-cap') < pos('>Especiales<') && pos('>Especiales<') < pos('p-cho'))
  chk('los insumos van AL FINAL, separados', pos('>Materia prima e insumos<') > pos('p-cho') && pos('>Materia prima e insumos<') < pos('data-r-insumo="0" data-id="i-har"'))
  chk('un grupo sin productos no dibuja su encabezado', !/>Pasta</.test(hp))
  chk('cada producto dice su stock en cajas', /hay 45 cajas/.test(hp))
  chk('cada insumo dice su marca y su stock en su unidad', /Molino Cañuelas · hay 250 kg/.test(hp) && /hay 300 un\./.test(hp))
  S.elegirProductoRenglon(0, 'p-cap')
  chk('con dos presentaciones no se elige sola', r.presentacionId === null)
  S.elegirPresentacionRenglon(0, 'pr-cuc-sin')
  chk('una presentación de otro producto no se elige', r.presentacionId === null)
  S.elegirPresentacionRenglon(0, 'pr-cap-b')
  chk('elegir la presentación', r.presentacionId === 'pr-cap-b')
}
{
  const S = nuevo()
  chk('las cajas son ENTERAS', S.DECIMALES_CAJAS === 0)
  const f = conEmpresa(S)
  cargarRenglon(S)
  f.renglones[0].cajas = 2.5
  chk('media caja no pasa', S.faltanRenglon(f.renglones[0]) === 'poné las cajas')
  f.renglones[0].cajas = 0
  chk('cero cajas no pasa', S.faltanRenglon(f.renglones[0]) === 'poné las cajas')
  f.renglones[0].cajas = 10
  chk('diez cajas pasan', S.faltanRenglon(f.renglones[0]) === null)
  chk('sin cliente falta el cliente', S.faltanOrden(f).includes('Elegí el cliente.'))
  S.agregarRenglon()
  chk('agregar suma un renglón nuevo, sin cono', f.renglones.length === 2 && f.renglones[1].conCono === false)
  chk('el renglón incompleto se nombra', S.faltanOrden(f).some(x => /Renglón 2: elegí el producto/.test(x)))
  S.quitarRenglon(1)
  chk('quitar lo saca', f.renglones.length === 1)
}

// ── Los lotes: opcionales, los más viejos primero ───────────────────────────
{
  const S = nuevo()
  // Lo que devuelve lotes_para_retiro(): ya con stock y en el orden de la base.
  const filas = [
    { lote: '7010-2', cajas: 8, desde: '2026-09-10' },
    { lote: 'SIN STOCK', cajas: 2, desde: '2026-09-11' },
    { lote: '7030-1', cajas: 15, desde: '2026-09-20' },
    { lote: '7031-1', cajas: 0, desde: '2026-09-21' },
  ]
  const l = S.lotesDeRetiro(filas)
  chk('los lotes de producto respetan el orden de la base (los más viejos primero)', l.map(x => x.lote).join() === '7010-2,7030-1')
  chk('con su saldo en cajas', l.find(x => x.lote === '7030-1').saldo === 15)
  chk('"SIN STOCK" no es un lote para elegir', !l.some(x => x.lote === 'SIN STOCK'))
  chk('un lote sin cajas no se ofrece', !l.some(x => x.lote === '7031-1'))
  // v_stock_por_lote: una fila por (lote, presentación).
  const li = S.lotesDeInsumo([
    { lote: 'H-20', saldo: 100, desde: '2026-09-20' },
    { lote: 'H-10', saldo: 25, desde: '2026-09-10' },
    { lote: 'H-20', saldo: 50, desde: '2026-09-22' },
    { lote: null, saldo: 30, desde: '2026-09-01' },
    { lote: 'H-05', saldo: -5, desde: '2026-09-05' },
  ])
  chk('los lotes de un insumo se suman por lote', li.find(x => x.lote === 'H-20').saldo === 150)
  chk('y van los más viejos primero, sin los agotados ni los sin lote', li.map(x => x.lote).join() === 'H-10,H-20')
}
{
  const S = nuevo()
  S.estado.misTareas = new Map([['retiros:cargar', { unidades: ['u-n'] }]])
  const f = conEmpresa(S)
  cargarRenglon(S)
  let params = null
  S.__setRpc(async (n, p) => {
    if (n === 'lotes_para_retiro') { params = p; return { data: [{ lote: '7010-2', cajas: 8, desde: '2026-09-10' }, { lote: '7030-1', cajas: 15, desde: '2026-09-20' }], error: null } }
    return { data: null, error: null }
  })
  S.abrirLotes(0)
  esperas.push(new Promise(r => setTimeout(r, 0)).then(() => {
    chk('SOLO con retiros:cargar, los lotes de producto se leen con lotes_para_retiro()', !!params)
    chk('de esa empresa, presentación y cono (sin cono = marca null)', params && params.p_unidad_negocio_id === 'u-n' && params.p_presentacion_id === 'pr-cuc-sin' && params.p_marca_id === null)
    chk('sin tocar la tabla stock_terminado_movimientos', !S.__llamadas.consultas.some(c => c[0] === 'stock_terminado_movimientos'))
    const h = S.htmlLoteRenglon(f.renglones[0], 0)
    chk('se ofrecen los lotes con su saldo', /data-lote="7010-2"/.test(h) && /data-lote="7030-1"/.test(h) && /15 cajas/.test(h))
    S.elegirLote(0, 'no-existe')
    chk('un lote que no está en la lista no se elige', f.renglones[0].lote === null)
    S.elegirLote(0, '7030-1')
    chk('elegir un lote', f.renglones[0].lote === '7030-1' && f.renglones[0].eligiendoLote === false)
    chk('el payload lleva el lote elegido', JSON.stringify(S.itemParaBase(f.renglones[0])) === '{"presentacion_id":"pr-cuc-sin","marca_id":null,"cajas":10,"lote":"7030-1"}')
    S.quitarLote(0)
    chk('"Usar los más viejos" lo suelta', f.renglones[0].lote === null)
    chk('sin lote el payload NO lleva la clave lote', JSON.stringify(S.itemParaBase(f.renglones[0])) === '{"presentacion_id":"pr-cuc-sin","marca_id":null,"cajas":10}')
    S.elegirLote(0, '7010-2')
    S.elegirConoRenglon(0, true)
    chk('pasar a "con cono" suelta el lote (es stock de otro cono)', f.renglones[0].lote === null)
    f.renglones[0].lote = '7010-2'
    S.elegirMarcaRenglon(0, 'm-lolo')
    chk('cambiar de cono suelta el lote', f.renglones[0].lote === null)
  }))
}
{
  // Un INSUMO sin stock:ver: los lotes no se pueden ver y se dice.
  const S = nuevo()
  S.estado.misTareas = new Map([['retiros:cargar', { unidades: ['u-n'] }]])
  const f = conEmpresa(S)
  S.elegirInsumoRenglon(0, 'i-har')
  chk('solo con retiros:cargar NO se ven los lotes de un insumo', S.puedeVerLotesInsumo() === false)
  S.abrirLotes(0)
  chk('y "Elegir lote" lo dice en vez de mostrar una lista vacía', /no se pueden ver los lotes de materia prima e insumos/.test(S.htmlLoteRenglon(f.renglones[0], 0)))
  esperas.push(new Promise(r => setTimeout(r, 0)).then(() =>
    chk('sin consultar v_stock_por_lote (las filas no llegarían y se leería "no hay")', !S.__llamadas.consultas.some(c => c[0] === 'v_stock_por_lote'))))
  S.estado.misTareas = new Map([['retiros:cargar', { unidades: ['u-n'] }], ['stock:ver', { unidades: ['u-d'] }]])
  chk('stock:ver en OTRA empresa no alcanza', S.puedeVerLotesInsumo() === false)
  S.estado.misTareas = new Map([['retiros:cargar', { unidades: ['u-n'] }], ['stock:ver', null]])
  chk('stock:ver sin alcance no alcanza (la misma regla que tiene_tarea_alcance)', S.puedeVerLotesInsumo() === false)
}
{
  // Un INSUMO con stock:ver en la empresa: los lotes de v_stock_por_lote.
  const S = nuevo()
  S.estado.misTareas = new Map([['retiros:cargar', { unidades: ['u-n'] }], ['stock:ver', { unidades: ['u-n'] }]])
  const f = conEmpresa(S)
  S.elegirInsumoRenglon(0, 'i-har')
  f.renglones[0].cantidad = 30
  let filtros = null
  S.__tablas.v_stock_por_lote = (fl) => { filtros = fl; return { data: [
    { lote: 'H-10', saldo: 25, desde: '2026-09-10' }, { lote: 'H-20', saldo: 150, desde: '2026-09-20' }], error: null } }
  S.abrirLotes(0)
  esperas.push(new Promise(r => setTimeout(r, 0)).then(() => {
    chk('los lotes de un insumo se leen de v_stock_por_lote, de esa empresa y ese insumo', filtros &&
      filtros.some(x => x[0] === 'eq' && x[1] === 'unidad_negocio_id' && x[2] === 'u-n') &&
      filtros.some(x => x[0] === 'eq' && x[1] === 'insumo_id' && x[2] === 'i-har'))
    chk('sin llamar a lotes_para_retiro (esa es de producto)', !S.__llamadas.rpc.some(x => x[0] === 'lotes_para_retiro'))
    const h = S.htmlLoteRenglon(f.renglones[0], 0)
    chk('se ofrecen con su saldo en la unidad del insumo', /data-lote="H-10"/.test(h) && /150 kg/.test(h))
    S.elegirLote(0, 'H-20')
    chk('el payload del insumo lleva el lote elegido', JSON.stringify(S.itemParaBase(f.renglones[0])) === '{"insumo_id":"i-har","cantidad":30,"lote":"H-20"}')
  }))
}

// ── Los renglones de INSUMO (materia prima, cajas, bolsas de reventa) ───────
{
  const S = nuevo()
  const f = conEmpresa(S)
  S.elegirCliente('c1')
  cargarRenglon(S, 0, 10)
  S.agregarRenglon()
  S.elegirInsumoRenglon(1, 'i-har')
  const r = f.renglones[1]
  chk('elegir un insumo lo guarda con su nombre, marca y unidad', r.insumoId === 'i-har' && r.insumoNombre === 'Harina 000' && r.insumoMarca === 'Molino Cañuelas' && r.unidad === 'kg')
  chk('un insumo sin cantidad falta', S.faltanRenglon(r) === 'poné la cantidad')
  r.cantidad = 12.5
  chk('kilos con decimales pasan', S.faltanRenglon(r) === null)
  const h = S.htmlRenglon(r, 1, CAT, false)
  chk('el renglón de insumo pide la CANTIDAD con su unidad, no cajas', /data-r-cantidad="1"/.test(h) && /Cantidad \(kg\)/.test(h) && !/data-r-cajas/.test(h))
  chk('y no ofrece cono ni presentación', !/data-r-cono/.test(h) && !/data-r-presentacion/.test(h))
  chk('dice que es un insumo', /rt-sello--insumo/.test(h))
  const p = S.parametrosRegistrar(f)
  chk('el renglón de insumo viaja con insumo_id y cantidad', JSON.stringify(p.p_items[1]) === '{"insumo_id":"i-har","cantidad":12.5}')
  chk('SIN cajas ni presentación ni cono', !('cajas' in p.p_items[1]) && !('presentacion_id' in p.p_items[1]) && !('marca_id' in p.p_items[1]))
  chk('y el de producto sigue igual', JSON.stringify(p.p_items[0]) === '{"presentacion_id":"pr-cuc-sin","marca_id":null,"cajas":10}')
  chk('NINGÚN dato de plata en el payload con insumos', !/precio|importe|total|saldo|subtotal|credito|lista/i.test(JSON.stringify(p)))
  chk('los insumos no suman cajas', S.totalCajasForm(f) === 10)
  chk('la cuenta dice los productos, las cajas y los insumos', S.textoCuentaForm(f) === '1 producto · 10 cajas · 1 de materia prima e insumos')
  S.revisar()
  const res = S.__els.get('rt-resumen').innerHTML
  chk('el resumen muestra el insumo con su cantidad y unidad', /Harina 000 · Molino Cañuelas/.test(res) && /12,5 kg/.test(res))
  chk('y el total dice las cajas y los insumos', /Total: 10 cajas · 1 de materia prima e insumos/.test(res))
  // Unidades enteras
  S.estado.vista = 'rt-vista-form'
  S.elegirInsumoRenglon(1, 'i-caj')
  chk('elegir otro insumo resetea la cantidad', f.renglones[1].cantidad === null && f.renglones[1].unidad === 'un')
  f.renglones[1].cantidad = 2.5
  chk('lo que se cuenta de a unidades no admite decimales', S.faltanRenglon(f.renglones[1]) === 'poné la cantidad en unidades enteras')
  f.renglones[1].cantidad = 300
  chk('trescientas unidades pasan', S.faltanRenglon(f.renglones[1]) === null)
  S.cambiarProductoRenglon(1)
  chk('"Cambiar" suelta el insumo', f.renglones[1].insumoId === null && f.renglones[1].unidad === null && f.renglones[1].cantidad === null)
  S.elegirInsumoRenglon(1, 'no-existe')
  chk('un insumo que no está en el catálogo no se elige', f.renglones[1].insumoId === null)
}
{
  // El buscador filtra TODO junto.
  const S = nuevo()
  const f = conEmpresa(S)
  chk('sin búsqueda, todos los grupos', S.gruposCatalogo(CAT, '').map(g => g.titulo).join() === 'Cucuruchones,Barquillos,Especiales,Materia prima e insumos')
  chk('"harina" encuentra el insumo (sin acentos ni mayúsculas)', S.gruposCatalogo(CAT, 'HARÍNA').map(g => g.titulo).join() === 'Materia prima e insumos')
  chk('por marca del insumo', S.gruposCatalogo(CAT, 'cañuelas')[0].lista.map(x => x.id).join() === 'i-har')
  chk('por nombre de una presentación', S.gruposCatalogo(CAT, 'media caja').map(g => g.lista.map(x => x.id).join()).join() === 'p-cap')
  chk('"caja" encuentra productos Y el insumo Caja N°1', S.gruposCatalogo(CAT, 'caja').some(g => g.tipo === 'insumos' && g.lista.some(x => x.id === 'i-caj')) &&
    S.gruposCatalogo(CAT, 'caja').some(g => g.tipo === 'productos'))
  chk('lo que no coincide lo dice', /Nada coincide con «zzz»/.test(S.htmlProductosRenglon(0, CAT, 'zzz')))
  const h = S.htmlRenglon(f.renglones[0], 0, CAT, false)
  chk('un renglón sin elegir tiene el buscador', /data-r-buscar="0"/.test(h) && /data-r-opciones="0"/.test(h))
  // Tipear redibuja SOLO las opciones (no se pierde el foco).
  S.buscarCatalogoRenglon(0, 'harina')
  chk('buscar guarda lo tipeado en el renglón', f.renglones[0].busqueda === 'harina')
}
{
  // catalogoDesdeRpc(): lo que devuelve catalogo_para_retiro().
  const S = nuevo()
  const c = S.catalogoDesdeRpc({
    productos: [
      { presentacion_id: 'pp1', producto: 'Cucurucho Mini', presentacion: 'Caja x 600', categoria: 'cucuruchones', con_cono: false, unidades_por_caja: 600, stock_cajas: 12 },
      { presentacion_id: 'pp2', producto: 'Cucurucho Mini', presentacion: 'Caja x 600 con cono', categoria: 'cucuruchones', con_cono: true, unidades_por_caja: 600, stock_cajas: 3 },
      { presentacion_id: 'pp3', producto: 'Oblea', presentacion: 'Caja', categoria: 'rara', con_cono: false, unidades_por_caja: 10, stock_cajas: 0 },
    ],
    insumos: [{ insumo_id: 'ii1', nombre: 'Bolsa', marca: null, categoria: 'Bolsas', unidad_medida: 'un', stock: 5000 }],
  }, [{ id: 'm1', nombre: 'LOLO' }])
  chk('una fila por presentación arma UN producto con sus presentaciones', c.productos.length === 2 && c.presentaciones.filter(x => x.producto_id === c.productos[0].id).length === 2)
  chk('una categoría que no es de la lista va a "Otros productos"', c.productos[1].categoria === null && S.gruposCatalogo(c, '').some(g => g.titulo === 'Otros productos'))
  chk('los insumos vienen con su unidad y stock', c.insumos[0].id === 'ii1' && c.insumos[0].unidad_medida === 'un' && c.insumos[0].stock === 5000)
  chk('los conos vienen de marcas_personalizadas', c.marcas[0].id === 'm1')
  const v = S.catalogoDesdeRpc(null, null)
  chk('sin permiso (null) da listas vacías, sin error', v.productos.length === 0 && v.insumos.length === 0 && v.marcas.length === 0)
  const T = nuevo()
  let pedido = null
  T.__setRpc(async (n, p) => { if (n === 'catalogo_para_retiro') pedido = p; return { data: { productos: [], insumos: [] }, error: null } })
  esperas.push(T.leerCatalogo('u-n').then(() => chk('el catálogo sale de catalogo_para_retiro() de la empresa', pedido && pedido.p_unidad_negocio_id === 'u-n')))
}
{
  // Un borrador viejo (el id del producto en el formato anterior) se reconcilia.
  const S = nuevo()
  const f = conEmpresa(S)
  f.renglones[0].productoId = '9f1c-uuid-viejo'
  f.renglones[0].presentacionId = 'pr-cap-a'
  S.reconciliarRenglones(f, CAT)
  chk('un renglón de un borrador viejo toma el producto de su presentación', f.renglones[0].productoId === 'p-cap')
}
{
  // Lo que faltó de un insumo.
  const S = nuevo()
  const h = S.htmlFaltantes([{ renglon: 2, insumo: 'Harina 000', pedidas: 30, faltaron: 5, unidad: 'kg' }])
  chk('lo que faltó de un insumo se dice en su unidad', /Renglón 2: Harina 000 — faltaron 5 kg de 30 kg/.test(h))
}
{
  // La hoja con insumos: los recuerda el celular y los intercala en su lugar.
  const S = nuevo()
  const f = conEmpresa(S)
  S.elegirCliente('c1')
  cargarRenglon(S, 0, 10)
  S.agregarRenglon()
  S.elegirInsumoRenglon(1, 'i-har')
  f.renglones[1].cantidad = 30
  S.agregarRenglon()
  S.elegirProductoRenglon(2, 'p-cap')
  S.elegirPresentacionRenglon(2, 'pr-cap-a')
  f.renglones[2].cajas = 2
  S.recordarInsumosDeOrden('o-9', f.renglones)
  const mem = S.leerMemoriaInsumos()
  chk('al confirmar se recuerdan los insumos de la orden, con su posición', mem['o-9'] && mem['o-9'].total === 3 && mem['o-9'].insumos[0].posicion === 1 && mem['o-9'].insumos[0].cantidad === 30)
  const o = { orden_id: 'o-9', codigo: 'N-0009', fecha: '2026-09-26', cliente: 'Distribuidora Anatolia', renglones: [
    { producto: 'Cucurucho grande', presentacion: 'Caja x 100', marca: null, cajas: 10, unidades: 1000, lotes: [] },
    { producto: 'Capelina', presentacion: 'Caja x 200', marca: null, cajas: 2, unidades: 400, lotes: [] }] }
  const rs = S.renglonesParaHoja(o, mem)
  chk('la hoja intercala el insumo en su lugar', rs.length === 3 && !rs[0].esInsumo && rs[1].esInsumo && rs[1].cantidad === 30 && rs[1].unidad === 'kg' && rs[2].producto === 'Capelina')
  const hoja = S.htmlHoja(S.ordenParaHoja(o), { conPrecios: false, copias: S.COPIAS_IMPRESION })
  chk('la hoja impresa muestra el insumo con su cantidad y unidad', /Harina 000 · Molino Cañuelas/.test(hoja) && /30 kg/.test(hoja))
  chk('la hoja sin precios sigue sin columnas de plata', !/Precio|Subtotal|\$/.test(hoja))
  const texto = S.textoOrden(S.ordenParaHoja(o))
  chk('el texto para compartir lleva el insumo', /- 30 kg · Harina 000 · Molino Cañuelas/.test(texto) && /y 1 renglón de materia prima e insumos/.test(texto))
  chk('sin memoria de esa orden, solo los renglones de producto', S.renglonesParaHoja({ ...o, orden_id: 'o-otra' }, mem).length === 2)
  chk('y "Mis retiros" avisa si la empresa vende insumos', S.faltanInsumosEnHoja({ orden_id: 'o-otra' }, mem) === true && S.faltanInsumosEnHoja(o, mem) === false)
  S.estado.catalogo = { ...CAT, insumos: [] }
  chk('una empresa sin insumos no avisa', S.faltanInsumosEnHoja({ orden_id: 'o-otra' }, mem) === false)
  chk('una orden sin insumos no se recuerda', (S.recordarInsumosDeOrden('o-10', [f.renglones[0]]), !S.leerMemoriaInsumos()['o-10']))
}

// ── El payload, SIN PLATA, y el mismo uuid en cada reintento ─────────────────
{
  const S = nuevo()
  const f = conEmpresa(S)
  S.elegirCliente('c1')
  cargarRenglon(S, 0, 10)
  S.agregarRenglon()
  S.elegirProductoRenglon(1, 'p-cuc')
  S.elegirConoRenglon(1, true)
  S.elegirMarcaRenglon(1, 'm-lolo')
  f.renglones[1].cajas = 4
  f.observaciones = 'Paga en la entrega'
  const p = S.parametrosRegistrar(f)
  chk('una sola llamada con todos los renglones', p.p_items.length === 2)
  chk('el cliente', p.p_cliente_id === 'c1')
  chk('la fecha es hoy en Argentina', p.p_fecha === S.hoyArgentina())
  chk('el transporte del cliente', p.p_transporte === 'Expreso Norte')
  chk('el uuid de la orden', p.p_client_uuid === f.uuid && /^[0-9a-f-]{36}$/.test(f.uuid))
  chk('el renglón con cono lleva la marca', p.p_items[1].marca_id === 'm-lolo' && p.p_items[1].cajas === 4)
  chk('el renglón sin cono lleva marca null', p.p_items[0].marca_id === null)
  chk('sin cono la marca va null aunque haya quedado una elegida', S.itemParaBase({ presentacionId: 'x', conCono: false, marcaId: 'm-lolo', cajas: 1 }).marca_id === null)
  chk('la fecha usa la zona de Argentina', /timeZone: ZONA_AR/.test(src) && S.ZONA_AR === 'America/Argentina/Buenos_Aires')
  const texto = JSON.stringify(p)
  chk('NINGÚN dato de plata en el payload', !/precio|importe|total|saldo|subtotal|credito|lista/i.test(texto))
  chk('las claves del renglón son solo producto, cono, cajas (y lote si se eligió)', p.p_items.every(x => Object.keys(x).every(k => ['presentacion_id', 'marca_id', 'cajas', 'lote'].includes(k))))
}
{
  const S = nuevo()
  const f = conEmpresa(S)
  S.elegirCliente('c1')
  cargarRenglon(S, 0, 10)
  let vez = 0
  S.__setRpc(async (n) => {
    if (n === 'registrar_orden_retiro') {
      vez++
      if (vez === 1) return { data: null, error: { message: 'TypeError: Failed to fetch' } }
      return { data: { orden_id: 'o-1', numero: 12, codigo: 'N-0012', stock_insuficiente: [] }, error: null }
    }
    if (n === 'mis_ordenes_retiro') return { data: [], error: null }
    return { data: null, error: null }
  })
  const uuid = f.uuid
  esperas.push(S.confirmar().then(async () => {
    const err = S.__els.get('rt-confirmar-error')
    chk('si se corta la conexión, lo dice y no se pierde la orden', err.hidden === false && /se cortó la conexión/.test(err.textContent) && S.estado.form === f)
    chk('y dice que reintentar no duplica', /no se duplica/.test(err.textContent))
    chk('el botón vuelve a quedar habilitado', S.__els.get('rt-confirmar').disabled === false)
    await S.confirmar()
    const llamadas = S.__llamadas.rpc.filter(x => x[0] === 'registrar_orden_retiro')
    chk('el reintento manda el MISMO uuid', llamadas.length === 2 && llamadas[0][1].p_client_uuid === uuid && llamadas[1][1].p_client_uuid === uuid)
    chk('confirmada, se muestra el código grande', S.estado.vista === 'rt-vista-hecho' && /rt-codigo-grande">N-0012</.test(S.__els.get('rt-hecho').innerHTML))
    chk('el código, nunca el número pelado', !/Nº\s*12|N°\s*12/.test(S.__els.get('rt-hecho').innerHTML) && S.__llamadas.exitos.some(x => /N-0012/.test(x)))
    chk('la orden y su borrador se limpian', S.estado.form === null && !S.__ls.has(S.CLAVE_BORRADOR))
    // Una orden nueva, un uuid nuevo.
    S.estado.empresaId = 'u-n'
    S.aplicarEmpresa('u-n')
    chk('la orden siguiente tiene OTRO uuid', S.estado.form.uuid !== uuid)
  }))
}
{
  const S = nuevo()
  const f = conEmpresa(S)
  S.elegirCliente('c1')
  cargarRenglon(S, 0, 10)
  S.__setRpc(async () => ({ data: null, error: { code: 'P0001', message: 'Poné las cajas del renglón 1.' } }))
  esperas.push(S.confirmar().then(() => {
    const err = S.__els.get('rt-confirmar-error')
    chk('un error de la base se muestra TAL CUAL, pegado al botón', err.textContent === 'Poné las cajas del renglón 1.' && err.hidden === false)
    chk('y la orden sigue', S.estado.form === f)
  }))
}

{
  // Confirmar una orden con insumos los deja recordados en el celular.
  const S = nuevo()
  const f = conEmpresa(S)
  S.elegirCliente('c1')
  S.elegirInsumoRenglon(0, 'i-har')
  f.renglones[0].cantidad = 40
  S.__setRpc(async (n) => n === 'registrar_orden_retiro'
    ? { data: { orden_id: 'o-ins', numero: 20, codigo: 'N-0020', stock_insuficiente: [] }, error: null }
    : { data: [], error: null })
  esperas.push(S.confirmar().then(() => {
    const m = S.leerMemoriaInsumos()['o-ins']
    chk('al confirmar, los insumos de la orden quedan recordados para la hoja', !!m && m.insumos.length === 1 && m.insumos[0].nombre === 'Harina 000' && m.insumos[0].cantidad === 40)
  }))
}

// ── El aviso de stock, que NO bloquea ───────────────────────────────────────
{
  const S = nuevo()
  conEmpresa(S)
  S.elegirCliente('c1')
  cargarRenglon(S, 0, 10)
  S.__setRpc(async (n) => n === 'registrar_orden_retiro'
    ? { data: { orden_id: 'o-2', numero: 13, codigo: 'N-0013', stock_insuficiente: [{ renglon: 1, producto: 'Cucurucho grande', presentacion: 'Caja x 100', pedidas: 10, faltaron: 3 }] }, error: null }
    : { data: [], error: null })
  esperas.push(S.confirmar().then(() => {
    const h = S.__els.get('rt-hecho').innerHTML
    chk('con stock insuficiente la orden SALE IGUAL (vista de hecho, con código)', S.estado.vista === 'rt-vista-hecho' && /N-0013/.test(h))
    chk('lo que faltó se dice en bordó', /rt-aviso--grave/.test(h) && /faltaron 3 de 10 cajas/.test(h) && /salió igual/.test(h))
  }))
}
{
  const S = nuevo()
  chk('sin faltantes no hay aviso', S.htmlFaltantes([]) === '' && S.htmlFaltantes(null) === '')
  const o = { renglones: [{ producto: 'A', presentacion: 'B', cajas: 5, lotes: [{ lote: '7001-1', cajas: 2 }, { lote: 'SIN STOCK', cajas: 3 }] }] }
  chk('en un reintento lo que faltó se deduce del lote "SIN STOCK"', JSON.stringify(S.faltantesDeLotes(o)) === JSON.stringify([{ renglon: 1, producto: 'A', presentacion: 'B', pedidas: 5, faltaron: 3 }]))
}

// ── El resumen, SIN PRECIOS, y nada de plata en ninguna pantalla ─────────────
{
  const S = nuevo()
  const f = conEmpresa(S)
  S.elegirCliente('c1')
  cargarRenglon(S, 0, 10)
  S.revisar()
  chk('revisar con todo completo muestra el resumen', S.estado.vista === 'rt-vista-resumen')
  const h = S.__els.get('rt-resumen').innerHTML
  chk('el resumen dice el cliente, el transporte y las cajas', /Distribuidora Anatolia/.test(h) && /Expreso Norte/.test(h) && /10 cajas/.test(h))
  chk('y que sale de los lotes más viejos', /De los lotes más viejos/.test(h))
  const todo = [...S.__els.values()].map(e => `${e.innerHTML} ${e.textContent}`).join(' ') + S.htmlRenglon(f.renglones[0], 0, CAT, true)
  chk('NINGUNA pantalla de la carga dice precio, saldo, importe o $', !/precio|saldo|importe|subtotal|\$\s?\d|crédito|lista de precios/i.test(todo))
}
{
  const S = nuevo()
  chk('el HTML de la carga no tiene ningún campo de plata', !/(precio|importe|saldo|subtotal)/i.test(src.slice(src.indexOf('<body'), src.indexOf('<script type="module">')).replace(/<!--[\s\S]*?-->/g, '')))
  chk('la carga nunca llama a valorizar ni lee listas de precios', !/valorizar_orden_retiro|lista_precios|cliente_movimientos|clientes_con_saldo|cuenta_cliente/.test(src))
  chk('la hoja de la carga se arma con conPrecios: false', /htmlHoja\(ordenParaHoja\(o, \{ cliente \}\), \{ conPrecios: false/.test(src) && !/conPrecios: true/.test(src))
}
{
  const S = nuevo()
  conEmpresa(S)
  S.estado.form.intentado = true
  S.revisar()
  chk('con lo que falta, revisar NO avanza', S.estado.vista !== 'rt-vista-resumen')
  chk('y dice qué falta pegado al botón', S.__els.get('rt-form-error').hidden === false && /Elegí el cliente/.test(S.__els.get('rt-form-error').textContent))
  chk('el botón de revisar no se deshabilita por lo que falta', !/rt-revisar'\)\.disabled/.test(src))
}

{
  const S = nuevo()
  const f = conEmpresa(S)
  esperas.push(S.confirmar().then(() => {
    chk('confirmar con algo que falta NO llama a la base', !S.__llamadas.rpc.some(x => x[0] === 'registrar_orden_retiro'))
    chk('y vuelve a la carga', S.estado.vista === 'rt-vista-form' && S.estado.form === f)
  }))
}

// ── El borrador ─────────────────────────────────────────────────────────────
{
  const S = nuevo()
  const f = conEmpresa(S)
  S.elegirCliente('c1')
  cargarRenglon(S, 0, 7)
  S.guardarBorrador()
  const b = S.leerBorrador()
  chk('el borrador guarda la empresa, el cliente y el uuid', b && b.empresaId === 'u-n' && b.form.clienteId === 'c1' && b.form.uuid === f.uuid)
  const T = nuevo()
  T.__ls.set(T.CLAVE_BORRADOR, S.__ls.get(S.CLAVE_BORRADOR))
  chk('al volver a abrir, se retoma con el MISMO uuid', T.retomarBorrador() === true && T.estado.form.uuid === f.uuid && T.estado.empresaId === 'u-n')
  const U = nuevo()
  U.__ls.set(U.CLAVE_BORRADOR, '{roto')
  chk('un borrador roto no rompe nada', U.leerBorrador() === null && U.retomarBorrador() === false)
  const V = nuevo()
  V.__ls.set(V.CLAVE_BORRADOR, JSON.stringify({ empresaId: 'u-d', form: { uuid: 'x', renglones: [] } }))
  chk('un borrador de una empresa donde ya no carga no se retoma', V.retomarBorrador() === false)
}

// ── La fábrica de pruebas ──────────────────────────────────────────────────
{
  const S = nuevo()
  S.estado.miRolApp = 'super_admin'
  S.estado.empresas = [...S.estado.empresas, { id: 'u-x', nombre: 'Pruebas (robot)', prefijo: 'X', logo_url: null }]
  S.estado.fabrica = { ok: true, unidades: new Set(['u-x']), personas: new Set(), soyDePrueba: false }
  chk('la fábrica de pruebas NO aparece para una cuenta real (tampoco super_admin)', !S.empresasDeCarga().some(e => e.id === 'u-x'))
  S.estado.fabrica = { ok: true, unidades: new Set(['u-x']), personas: new Set(), soyDePrueba: true }
  chk('una cuenta de la fábrica de pruebas sí la ve', S.empresasDeCarga().some(e => e.id === 'u-x'))
}

// ── HTML malicioso en cada render ──────────────────────────────────────────
{
  const S = nuevo()
  S.estado.misTareas = new Map([['retiros:cargar', { todas: true }], ['stock:ver', null]])
  S.estado.empresas = [{ id: 'u-n', nombre: marca('empresa'), logo_url: marca('logo') }, { id: 'u-d', nombre: 'Otra', logo_url: null }]
  S.estado.empresaId = 'u-n'
  const malos = [{ id: 'c1', nombre: marca('cliente'), razon_social: marca('razon'), apodos: [marca('apodo')], localidad: marca('localidad'), transporte_habitual: 'x', activo: true }]
  S.estado.clientes = malos
  const cat = {
    productos: [{ id: 'p1', nombre: marca('producto'), tipo_masa: 'Común' }, { id: 'p2', nombre: marca('producto-choco'), tipo_masa: 'Chocolate' }],
    presentaciones: [{ id: 'pr1', producto_id: 'p1', nombre: marca('presentacion'), con_cono: true, unidades_por_caja: 10 }],
    marcas: [{ id: 'm1', nombre: marca('cono') }],
    insumos: [{ id: 'i1', nombre: marca('insumo'), marca: marca('insumo-marca'), unidad_medida: 'kg', stock: 10 }],
  }
  S.estado.catalogo = cat
  S.estado.form = S.formVacio()
  const h1 = S.htmlEmpresas() + S.htmlEmpresaActual()
  chequearMarcas(chk, 'empresas', h1, ['empresa'])
  chk('un logo_url malicioso no llega a un src', !/data-xss="logo"/.test(h1) && !/src="\.\.\/"/.test(h1))
  const h2 = S.htmlResultadosClientes('') + S.htmlResultadosClientes(marca('busqueda'))
  chequearMarcas(chk, 'resultados de clientes', h2, ['cliente', 'razon', 'apodo', 'localidad', 'busqueda'])
  S.estado.form.clienteId = 'c1'
  chequearMarcas(chk, 'cliente elegido', S.htmlClienteElegido(S.estado.form), ['cliente', 'razon'])
  const r = S.estado.form.renglones[0]
  chequearMarcas(chk, 'productos', S.htmlProductosRenglon(0, cat), ['producto', 'producto-choco', 'insumo', 'insumo-marca'])
  chequearMarcas(chk, 'búsqueda sin resultados', S.htmlProductosRenglon(0, cat, marca('busca-cat')), ['busca-cat'])
  S.estado.form.renglones[0].busqueda = marca('busqueda-renglon')
  chequearMarcas(chk, 'buscador del renglón', S.htmlEleccionRenglon(S.estado.form.renglones[0], 0, cat), ['busqueda-renglon'])
  S.estado.form.renglones[0].busqueda = ''
  const ri = { ...S.renglonNuevo(), insumoId: 'i1', insumoNombre: marca('insumo'), insumoMarca: marca('insumo-marca'), unidad: marca('unidad'), cantidad: 3 }
  chequearMarcas(chk, 'renglón de insumo', S.htmlRenglon(ri, 1, cat, true), ['insumo', 'insumo-marca', 'unidad'])
  S.estado.misTareas = new Map([['retiros:cargar', { todas: true }], ['stock:ver', { todas: true }]])
  S.estado.lotes.set(S.claveLotesInsumo('i1'), { cargando: false, error: null, lista: [{ lote: marca('lote-insumo'), saldo: 4, desde: '2026-09-01' }] })
  ri.eligiendoLote = true
  chequearMarcas(chk, 'lotes de un insumo', S.htmlLoteRenglon(ri, 1), ['lote-insumo', 'unidad'])
  ri.eligiendoLote = false
  chequearMarcas(chk, 'resumen con un insumo', S.htmlResumen({ ...S.estado.form, renglones: [ri] }, cat), ['insumo', 'insumo-marca', 'unidad'])
  chequearMarcas(chk, 'faltantes de insumo', S.htmlFaltantes([{ renglon: 2, insumo: marca('f-insumo'), pedidas: 3, faltaron: 1, unidad: 'kg' }]), ['f-insumo'])
  r.productoId = 'p1'; r.conCono = true; r.presentacionId = 'pr1'; r.marcaBusqueda = marca('cono-buscado')
  chequearMarcas(chk, 'renglón con cono', S.htmlRenglon(r, 0, cat, true), ['producto', 'presentacion', 'cono-buscado'])
  r.marcaBusqueda = ''
  chequearMarcas(chk, 'conos', S.htmlMarcasRenglon(r, 0, cat), ['cono'])
  S.estado.lotes.set(S.claveLotes('pr1', null), { cargando: false, error: null, lista: [{ lote: marca('lote'), saldo: 3, desde: '2026-09-01' }] })
  r.eligiendoLote = true
  chequearMarcas(chk, 'lotes', S.htmlLoteRenglon(r, 0), ['lote'])
  r.eligiendoLote = false; r.lote = marca('lote-elegido')
  chequearMarcas(chk, 'lote elegido', S.htmlLoteRenglon(r, 0), ['lote-elegido'])
  S.estado.form.transporte = marca('transporte'); S.estado.form.observaciones = marca('obs')
  r.marcaId = 'm1'
  chequearMarcas(chk, 'resumen', S.htmlResumen(S.estado.form, cat), ['empresa', 'cliente', 'transporte', 'obs', 'producto', 'presentacion', 'cono', 'lote-elegido'])
  chequearMarcas(chk, 'faltantes', S.htmlFaltantes([{ renglon: 1, producto: marca('f-prod'), presentacion: marca('f-pres'), pedidas: 3, faltaron: 1 }]), ['f-prod', 'f-pres'])
  chequearMarcas(chk, 'hecho', S.htmlHecho({ codigo: marca('codigo'), cliente: { nombre: marca('h-cliente') }, faltantes: [] }), ['codigo', 'h-cliente'])
  S.estado.errorClientes = marca('error-clientes')
  chequearMarcas(chk, 'error de clientes', S.htmlResultadosClientes(''), ['error-clientes'])
}

fin()
