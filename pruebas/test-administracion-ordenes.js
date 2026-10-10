// ADMINISTRACIÓN — la portada y las Órdenes de retiro (26/09/2026).
//
// La portada con una tarjeta por sección y su número (órdenes sin valorizar),
// y los accesos directos a Cheques, Cuentas Corrientes y Cobranzas. Las
// órdenes con sus filtros; el detalle con renglones y lotes; Valorizar con
// los precios de la lista del cliente, corregibles, con el total y el aviso
// de límite de crédito; Corregir valorización; Anular con motivo; la hoja CON
// precios. Cada sección solo con su permiso, y la fábrica de pruebas oculta.
//
//   node pruebas/test-administracion-ordenes.js

const path = require('path')
const fs = require('fs')
const { construirAdministracion } = require('./sandbox-administracion')
const { arnes, marca, chequearMarcas } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/administracion.html')
const src = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${src.length} bytes)`)
const { chk, esperas, fin } = arnes()
const nuevo = () => construirAdministracion(ARCHIVO)

const CLIENTES = [
  { id: 'c1', nombre: 'Distribuidora Anatolia', razon_social: 'ANATOLIA SRL', cuit: '30712345678', email: 'compras@anatolia.com', lista_precio_id: 'l1', limite_credito: 100000, activo: true },
  { id: 'c2', nombre: 'Kiosco Pepe', razon_social: null, lista_precio_id: null, limite_credito: null, activo: true },
]
const CAT = {
  productos: [{ id: 'p1', nombre: 'Cucurucho grande' }],
  presentaciones: [
    { id: 'pr1', producto_id: 'p1', nombre: 'Caja x 100', con_cono: false, unidades_por_caja: 100 },
    { id: 'pr2', producto_id: 'p1', nombre: 'Caja x 100 con cono', con_cono: true, unidades_por_caja: 100 },
  ],
  marcas: [{ id: 'm1', nombre: 'LOLO' }],
  insumos: [{ id: 'ins-h', nombre: 'Harina 000', marca: 'Molino', unidad_medida: 'kg', activo: true }],
}
const ORDEN = { id: 'o1', numero: 12, codigo: 'N-0012', unidad_negocio_id: 'u-n', fecha: '2026-09-20', estado: 'confirmada', estado_valorizacion: 'pendiente',
  total: 0, moneda: 'ARS', cliente_id: 'c1', cargada_por: 'emp-9', cargada_en: '2026-09-20T15:00:00Z', transporte: 'Expreso Norte', observaciones: null }
const ITEMS = [
  { id: 'i1', orden: 1, presentacion_id: 'pr1', marca_id: null, cajas: 10, unidades: 1000, precio_caja: null, subtotal: null, lote: null },
  { id: 'i2', orden: 2, presentacion_id: 'pr2', marca_id: 'm1', cajas: 4, unidades: 400, precio_caja: null, subtotal: null, lote: null },
]
const LISTA = [
  { presentacion_id: 'pr1', precio_caja: 2500, vigente_desde: '2026-09-01' },
  { presentacion_id: 'pr1', precio_caja: 3000, vigente_desde: '2026-09-15' },
  { presentacion_id: 'pr1', precio_caja: 9999, vigente_desde: '2026-09-25' },   // posterior al retiro: no vale
  { presentacion_id: 'pr2', precio_caja: 4000, vigente_desde: '2026-08-01' },
]

// precio_venta() de la base (30/09/2026): la lista tiene precio solo en la
// presentación sin cono; con cono suma el conito de la lista.
const PRECIO_VENTA = {
  'pr1|': { precio_unitario: 30, precio_caja: 3000, unidades_por_caja: 100, producto_unitario: 30, conito_unitario: 0, papel_conito: null, lista: 'Heladerías', recargo_pct: 0, sin_precio: false },
  'pr2|m1': { precio_unitario: 40, precio_caja: 4000, unidades_por_caja: 100, producto_unitario: 30, conito_unitario: 10, papel_conito: 'comun', lista: 'Heladerías', recargo_pct: 0, sin_precio: false },
}
// El precio de los INSUMOS al valorizar lo calcula la base con
// precios_insumos_lista(p_lista_id, p_fecha = fecha del retiro) (09/10/2026):
// el doble devuelve INSUMOS_LISTA y anota cada llamada en LLAMADAS_INS.
const INSUMOS_LISTA = [{ insumo_id: 'ins-h', insumo: 'Harina 000', unidad_medida: 'kg', precio_unitario: '100', tipo: 'fijo', recargo_costo_pct: null, vigente_desde: '2026-09-01', sin_costo: false }]
const LLAMADAS_INS = []
function rpcPrecioVenta(tabla = RESP_PV, llamadas = [], insumos = INSUMOS_LISTA) {
  return async (n, p) => {
    if (n === 'precios_insumos_lista') { LLAMADAS_INS.push(p); return { data: insumos, error: null } }
    if (n !== 'precio_venta') return { data: null, error: null }
    llamadas.push(p)
    const r = tabla[p.p_presentacion_id + '|' + (p.p_marca_id ?? '')]
    if (typeof r === 'function') return r(p)
    return r ?? { data: { sin_precio: true, motivo: 'El producto no tiene precio en la lista base.' }, error: null }
  }
}
// Envuelve cada fila de PRECIO_VENTA como respuesta de la rpc.
const RESP_PV = Object.fromEntries(Object.entries(PRECIO_VENTA).map(([k, v]) => [k, { data: v, error: null }]))

function preparar(S, { orden = ORDEN, items = ITEMS, movs = [{ importe: 80000 }], lotes = null } = {}) {
  S.__setRpc(rpcPrecioVenta())
  S.estado.clientes = CLIENTES
  S.estado.catalogo = CAT
  S.estado.catalogoEmpresa = 'u-n'
  S.__tablas.ordenes_retiro = [orden]
  S.__tablas.orden_retiro_items = items
  S.__tablas.lista_precios_items = LISTA
  S.__tablas.cliente_movimientos = movs
  S.__tablas.v_empleados_publico = [{ id: 'emp-9', nombre: 'Emanuel Romero' }]
  if (lotes) S.__tablas.stock_terminado_movimientos = lotes
}

// ── Permisos: cada sección solo con su permiso ──────────────────────────────
{
  const S = nuevo()
  chk('con retiros:ver se ve la sección Órdenes', S.seccionesVisibles().some(s => s.id === 'ordenes'))
  S.estado.misTareas = new Map([['retiros:precios', { unidades: ['u-n'] }]])
  chk('sin retiros:ver NO se ve la sección Órdenes', !S.seccionesVisibles().some(s => s.id === 'ordenes'))
  chk('pero la empresa sigue siendo de Administración (precios)', S.empresasDeAdministracion().some(e => e.id === 'u-n'))
  S.estado.misTareas = new Map([['retiros:cargar', { todas: true }]])
  chk('solo con cargar (el depósito) NO hay Administración', S.empresasDeAdministracion().length === 0)
  S.estado.misTareas = new Map([['retiros:ver', { unidades: ['u-d'] }]])
  chk('el alcance manda: ver en Dolce Pasta no abre Cucuruchos', !S.puedeEn('retiros', 'ver', 'u-n') && S.puedeEn('retiros', 'ver', 'u-d'))
  S.estado.miRolApp = 'super_admin'
  chk('super_admin ve todo', S.seccionesVisibles('u-n').length === S.SECCIONES.length)
}
{
  const S = nuevo()
  S.estado.miRolApp = 'super_admin'
  S.estado.empresas = [...S.estado.empresas, { id: 'u-x', nombre: 'Pruebas (robot)' }]
  S.estado.fabrica = { ok: true, unidades: new Set(['u-x']), personas: new Set(), soyDePrueba: false }
  chk('la fábrica de pruebas no aparece para una cuenta real', !S.empresasDeAdministracion().some(e => e.id === 'u-x'))
  chk('ni en el selector de empresas', !/Pruebas \(robot\)/.test(S.htmlEmpresas()))
  S.estado.fabrica = { ...S.estado.fabrica, soyDePrueba: true }
  chk('una cuenta de prueba sí la ve', S.empresasDeAdministracion().some(e => e.id === 'u-x'))
}
{
  const S = nuevo()
  chk('con una sola empresa no se dibuja el selector', S.htmlEmpresas() === '')
  S.estado.misTareas.set('retiros:ver', { todas: true })
  chk('con varias, el selector', /data-empresa="u-n"/.test(S.htmlEmpresas()) && /data-empresa="u-d"/.test(S.htmlEmpresas()))
  chk('la empresa recordada se usa si todavía se puede', S.empresaInicial(S.empresasDeAdministracion(), 'u-d') === 'u-d' && S.empresaInicial(S.empresasDeAdministracion(), 'zzz') === 'u-n')
}

// ── Los accesos directos (la fila, 27/09/2026) ─────────────────────────────
// Cheques, Cobranzas, Cuentas corrientes, Gastos y Caja, del catálogo
// compartido (js/modulos.js), con la MISMA regla que el dashboard.
{
  const S = nuevo()
  chk('los cinco, en este orden', S.LINKS.map(x => x.clave).join() === 'cheques,cobranzas,cuentas-corrientes,gastos,caja')
  chk('sin esos módulos no hay accesos directos', S.linksVisibles().length === 0)
  S.estado.misModulos = new Set(['cobranzas', 'cuentas-corrientes', 'gastos', 'caja'])
  let l = S.linksVisibles().map(x => x.clave)
  chk('con los módulos: cobranzas, cuentas corrientes, gastos y caja', l.join() === 'cobranzas,cuentas-corrientes,gastos,caja', l.join())
  chk('Cheques necesita además ver_todo o procesar (la regla del dashboard)', !l.includes('cheques'))
  S.estado.misTareas.set('cobranzas:procesar', null)
  l = S.linksVisibles().map(x => x.clave)
  chk('con cobranzas:procesar aparece Cheques, primero', l[0] === 'cheques', l.join())
  S.estado.misModulos = new Set(['gastos'])
  chk('sin el módulo cobranzas, ni Cobranzas ni Cheques', S.linksVisibles().map(x => x.clave).join() === 'gastos')
  const S2 = nuevo()
  S2.estado.miRolApp = 'super_admin'
  chk('un super_admin ve los cinco', S2.linksVisibles().length === 5)
  chk('los links van a pantallas que existen', S.LINKS.every(x => fs.existsSync(path.join(__dirname, '..', x.url.split('?')[0]))))
  const h = S.htmlLink(S.LINKS.find(x => x.clave === 'gastos'))
  chk('un link es un <a> a su pantalla (la misma carpeta modulos/)', /<a class="ad-acceso" href="gastos\.html" data-link="gastos">/.test(h), h)
  chk('lleva su ícono y su nombre (el trazo y el color del módulo, como el diseño)', /<svg[^>]*><path d="M6 3h12v18/.test(h) && /ad-acceso__icono" style="background:oklch\(/.test(h) && />Gastos<\/span>/.test(h))
  const hc = S.htmlLink(S.LINKS.find(x => x.clave === 'cheques'))
  chk('Cheques es un botón de esta misma pantalla (no recarga)', /^<button type="button" class="ad-acceso" data-link="cheques">/.test(hc) && !hc.includes('href'), hc)
  S2.pintarPortada()
  chk('la portada dibuja la fila y muestra su título', /data-link="caja"/.test(S2.__doc.getElementById('ad-links').innerHTML) && S2.__doc.getElementById('ad-links-titulo').hidden === false)
  const S3 = nuevo()
  S3.pintarPortada()
  chk('sin accesos, el título se esconde', S3.__doc.getElementById('ad-links-titulo').hidden === true && S3.__doc.getElementById('ad-links').innerHTML === '')
  chk('Cheques se abre sin recargar (el click va a mostrarCheques)', /closest\('button\[data-link="cheques"\]'\)\) mostrarCheques\(\)/.test(src))
}

// ── La portada ─────────────────────────────────────────────────────────────
{
  const S = nuevo()
  let filtros = null
  S.__tablas.ordenes_retiro = (f) => { filtros = f; return { data: [{ id: 'a' }, { id: 'b' }, { id: 'c' }], error: null } }
  esperas.push(S.mostrarInicio().then(() => {
    const h = S.__els.get('ad-secciones').innerHTML
    chk('la portada tiene la tarjeta de Órdenes', /data-seccion="ordenes"/.test(h))
    chk('con el número de órdenes sin valorizar, en bordó', /ad-seccion__numero--atencion">3</.test(h) && /sin valorizar</.test(h))
    chk('cuenta las confirmadas pendientes de la empresa', filtros.some(x => x[1] === 'unidad_negocio_id' && x[2] === 'u-n') &&
      filtros.some(x => x[1] === 'estado' && x[2] === 'confirmada') && filtros.some(x => x[1] === 'estado_valorizacion' && x[2] === 'pendiente'))
  }))
  const T = nuevo()
  T.__tablas.ordenes_retiro = () => ({ data: null, error: { message: 'x' } })
  esperas.push(T.mostrarInicio().then(() => {
    const tarjeta = (T.__els.get('ad-secciones').innerHTML.match(/<button[^>]*data-seccion="ordenes"[\s\S]*?<\/button>/) || [''])[0]
    chk('si no se pueden contar las órdenes, esa tarjeta lo dice (nunca un 0)', /No se pudo contar/.test(tarjeta) && /numero">—</.test(tarjeta))
  }))
  const U = nuevo()
  U.estado.misTareas = new Map([['retiros:precios', { unidades: ['u-n'] }]])
  esperas.push(U.mostrarInicio().then(() => chk('sin retiros:ver no se consulta nada de órdenes', !U.__llamadas.consultas.some(c => c[0] === 'ordenes_retiro'))))
}

// ── La lista de órdenes y sus filtros ──────────────────────────────────────
{
  const S = nuevo()
  preparar(S)
  let filtros = null
  S.__tablas.ordenes_retiro = (f) => { filtros = f; return { data: [ORDEN, { ...ORDEN, id: 'o2', codigo: 'N-0011', estado_valorizacion: 'valorizada', total: 45000 }, { ...ORDEN, id: 'o3', codigo: 'N-0010', estado: 'anulada' }], error: null } }
  S.__tablas.orden_retiro_items = [{ orden_id: 'o1', cajas: 10 }, { orden_id: 'o1', cajas: 4 }, { orden_id: 'o2', cajas: 3 }]
  S.estado.filtros = { desde: '2026-09-01', hasta: '2026-09-30', clienteId: 'c1', estado: 'confirmada', sinValorizar: true }
  esperas.push(S.cargarOrdenes().then(() => {
    chk('filtra por fecha', filtros.some(x => x[0] === 'gte' && x[1] === 'fecha' && x[2] === '2026-09-01') && filtros.some(x => x[0] === 'lte' && x[2] === '2026-09-30'))
    chk('por cliente', filtros.some(x => x[1] === 'cliente_id' && x[2] === 'c1'))
    chk('y "solo sin valorizar"', filtros.some(x => x[1] === 'estado_valorizacion' && x[2] === 'pendiente'))
    chk('por la empresa elegida', filtros.some(x => x[1] === 'unidad_negocio_id' && x[2] === 'u-n'))
    const h = S.__els.get('ad-ordenes-lista').innerHTML
    chk('cada orden con su CÓDIGO', /N-0012/.test(h) && /N-0011/.test(h))
    chk('con fecha, cliente y cajas', /20\/09\/2026 · Distribuidora Anatolia · 14 cajas/.test(h))
    chk('"sin valorizar" en bordó', /ad-fila__importe ad-fila__importe--pendiente">sin valorizar</.test(h) && /ad-sello--pendiente">Sin valorizar/.test(h))
    chk('una valorizada con su total', /\$ 45\.000,00/.test(h) && /Valorizada/.test(h))
    chk('una anulada lo dice', /ad-fila--anulada/.test(h) && />Anulada</.test(h))
    chk('la cuenta', S.__els.get('ad-ordenes-cuenta').textContent === '3 órdenes')
  }))
}
{
  const S = nuevo()
  preparar(S)
  S.__tablas.ordenes_retiro = () => ({ data: null, error: { message: 'x' } })
  esperas.push(S.cargarOrdenes().then(() => chk('si falla, lo dice', /No se pudieron leer las órdenes/.test(S.__els.get('ad-ordenes-lista').innerHTML))))
}

// ── El detalle, los lotes ──────────────────────────────────────────────────
{
  const S = nuevo()
  preparar(S, {
    items: [...ITEMS, { id: 'i3', orden: 3, presentacion_id: 'pr2', marca_id: null, cajas: 2, unidades: 200, precio_caja: null, subtotal: null, lote: null }],
    lotes: [{ presentacion_id: 'pr1', marca_id: null, lote: '7030-1', cajas: -6 }, { presentacion_id: 'pr1', marca_id: null, lote: '7031-2', cajas: -4 },
      { presentacion_id: 'pr2', marca_id: 'm1', lote: '7032-1', cajas: -4 }, { presentacion_id: 'pr2', marca_id: null, lote: '7039-9', cajas: -2 }] })
  S.estado.misTareas.set('stock:ver', null)
  esperas.push(S.abrirOrden('o1').then(() => {
    const h = S.__els.get('ad-orden-cuerpo').innerHTML
    chk('el detalle muestra cada renglón con cono y presentación', /10 cajas · Cucurucho grande · Caja x 100 · Sin cono/.test(h) && /4 cajas · Cucurucho grande · Caja x 100 con cono · LOLO/.test(h))
    chk('y los lotes de cada renglón', /lotes 7030-1 \(6\) · 7031-2 \(4\)/.test(h) && /lotes 7032-1 \(4\)</.test(h))
    chk('el lote de un cono no se mezcla con el del cono común de la misma presentación', /Común<\/div><div class="ad-renglon__lotes">200 unidades · lotes 7039-9 \(2\)</.test(h))
    chk('quién la cargó (por v_empleados_publico, sin embed)', /Emanuel Romero/.test(h) && S.__llamadas.consultas.some(c => c[0] === 'v_empleados_publico'))
    chk('el título dice el código', S.__els.get('ad-orden-titulo').textContent === 'Orden N-0012')
    chk('con precios: "Valorizar" visible', S.__els.get('ad-btn-valorizar').hidden === false && S.__els.get('ad-btn-corregir-valor').hidden === true)
    chk('con anular: "Anular" visible', S.__els.get('ad-btn-anular').hidden === false)
  }))
}
{
  const S = nuevo()
  preparar(S)
  S.estado.misTareas = new Map([['retiros:ver', { unidades: ['u-n'] }]])
  esperas.push(S.abrirOrden('o1').then(() => {
    const h = S.__els.get('ad-orden-cuerpo').innerHTML
    chk('sin permiso de ver lotes, NO se consulta el stock y se dice', !S.__llamadas.consultas.some(c => c[0] === 'stock_terminado_movimientos') && /no se pueden ver los lotes/.test(h))
    chk('solo con ver: ni Valorizar ni Anular', S.__els.get('ad-btn-valorizar').hidden === true && S.__els.get('ad-btn-anular').hidden === true)
    chk('pero sí imprimir', S.__els.get('ad-btn-imprimir').hidden === false)
  }))
}

// ── Valorizar con la lista del cliente ──────────────────────────────────────
{
  // El precio de un insumo, como lo devuelve precios_insumos_lista (09/10/2026).
  const S = nuevo()
  const m = S.preciosInsumosDeLista([
    { insumo_id: 'a', precio_unitario: '100', tipo: 'fijo', recargo_costo_pct: null, sin_costo: false },
    { insumo_id: 'b', precio_unitario: '1150', tipo: 'costo_mas_pct', recargo_costo_pct: '15', sin_costo: false },
    { insumo_id: 'c', precio_unitario: '57.5', tipo: 'costo_mas_pct', recargo_costo_pct: null, sin_costo: false },
    { insumo_id: 'd', precio_unitario: null, tipo: 'costo_mas_pct', recargo_costo_pct: '20', sin_costo: true },
  ])
  chk('un precio fijo: su precio y sin origen', m.get('ins:a').precio === 100 && m.get('ins:a').origen === null)
  chk('costo + %: el precio de la base y lo dice', m.get('ins:b').precio === 1150 && m.get('ins:b').origen.texto === 'Costo + 15 % (lista)' && !m.get('ins:b').origen.grave)
  chk('costo + % sin ver costos: "sobre el costo"', m.get('ins:c').precio === 57.5 && m.get('ins:c').origen.texto === 'Sobre el costo (lista)')
  chk('sin costo: sin precio (nunca 0) y en bordó', m.get('ins:d').precio === null && m.get('ins:d').origen.grave === true && /falta cargar el costo/.test(m.get('ins:d').origen.texto))
}
{
  const S = nuevo()
  preparar(S)
  esperas.push(S.abrirOrden('o1').then(() => S.abrirValorizar()).then(() => {
    const d = S.estado.orden
    chk('Valorizar trae los precios de la lista del cliente', d.valorizar.precios.i1 === 3000 && d.valorizar.precios.i2 === 4000)
    chk('muestra el total', S.totalValorizar(d) === 46000 && /Total \$ 46\.000,00/.test(S.__els.get('ad-orden-cuerpo').innerHTML))
    chk('saldo 80.000 + 46.000 pasa el límite de 100.000: lo AVISA', S.saldoProyectado(d) === 126000 && /pasa su límite de crédito/.test(S.__els.get('ad-orden-cuerpo').innerHTML))
    S.cambiarPrecio('i1', 1000)
    chk('corregir un precio recalcula el total', S.totalValorizar(d) === 26000)
    chk('y el aviso del límite (80.000 + 26.000 sigue pasando)', /pasa su límite/.test(S.avisoLimite(S.saldoProyectado(d), 100000, 'ARS')))
    S.cambiarPrecio('i1', 100)
    chk('con 80.000 + 17.000 ya no pasa: no avisa', S.avisoLimite(S.saldoProyectado(d), 100000, 'ARS') === null)
    let params = null
    S.__setRpc(async (n, p) => { if (n === 'valorizar_orden_retiro') { params = p; return { data: { total: 17000, moneda: 'ARS', saldo_cliente: 97000, limite_credito: 100000, supera_limite: false }, error: null } } return { data: null, error: null } })
    return S.guardarValorizacion().then(() => {
      chk('valorizar manda la orden y el precio de CADA renglón (los de la lista y los corregidos)', params && params.p_orden_id === 'o1' && params.p_precios.i1 === 100 && params.p_precios.i2 === 4000)
      chk('y avisa el total', S.__llamadas.exitos.some(x => /N-0012 valorizada: \$ 17\.000,00/.test(x)))
    })
  }))
}
{
  const S = nuevo()
  preparar(S)
  esperas.push(S.abrirOrden('o1').then(() => S.abrirValorizar()).then(async () => {
    S.__setRpc(async () => ({ data: { total: 46000, moneda: 'ARS', saldo_cliente: 126000, limite_credito: 100000, supera_limite: true }, error: null }))
    await S.guardarValorizacion()
    chk('si la base dice que supera el límite, se avisa después de valorizar', /pasa su límite de crédito: quedaría debiendo \$ 126\.000,00 y su límite es \$ 100\.000,00/.test(S.estado.orden?.aviso || ''))
  }))
}
{
  const S = nuevo()
  preparar(S)
  S.estado.clientes = [{ ...CLIENTES[1], id: 'c1' }]   // sin lista
  esperas.push(S.abrirOrden('o1').then(() => S.abrirValorizar()).then(async () => {
    const d = S.estado.orden
    chk('sin lista, los precios vienen vacíos y se dice', d.valorizar.precios.i1 === null && /no tiene una lista de precios/.test(S.__els.get('ad-orden-cuerpo').innerHTML))
    await S.guardarValorizacion()
    chk('faltando precios NO se llama a la base', !S.__llamadas.rpc.some(x => x[0] === 'valorizar_orden_retiro'))
    chk('y dice cuántos faltan, pegado al botón', /Faltan precios en 2 renglones/.test(d.valorizar.errorGuardar))
    S.cambiarPrecio('i1', -5); S.cambiarPrecio('i2', 10)
    await S.guardarValorizacion()
    chk('un precio negativo no se manda', !S.__llamadas.rpc.some(x => x[0] === 'valorizar_orden_retiro') && /negativo/.test(d.valorizar.errorGuardar))
    S.cambiarPrecio('i1', 10)
    S.__setRpc(async () => ({ data: null, error: { message: 'Faltan precios en 1 renglón(es): cargalos o asignale una lista con esos productos al cliente.' } }))
    await S.guardarValorizacion()
    chk('el error de la base va tal cual', /cargalos o asignale una lista/.test(d.valorizar.errorGuardar))
  }))
}
// Corregir una valorización: parte de los precios que ya tenía.
{
  const S = nuevo()
  preparar(S, { orden: { ...ORDEN, estado_valorizacion: 'valorizada', total: 46000 }, items: ITEMS.map(i => ({ ...i, precio_caja: i.id === 'i1' ? 3100 : 4000, subtotal: i.id === 'i1' ? 31000 : 16000 })), movs: [{ importe: 80000 }, { importe: 47000 }] })
  esperas.push(S.abrirOrden('o1').then(() => {
    chk('valorizada: "Corregir valorización" y no "Valorizar"', S.__els.get('ad-btn-corregir-valor').hidden === false && S.__els.get('ad-btn-valorizar').hidden === true)
    chk('muestra el precio y el subtotal de cada renglón y el total', /\$ 3\.100,00 x caja/.test(S.__els.get('ad-orden-cuerpo').innerHTML) && /Total \$ 46\.000,00/.test(S.__els.get('ad-orden-cuerpo').innerHTML))
    return S.abrirValorizar()
  }).then(() => {
    const d = S.estado.orden
    chk('corregir arranca con los precios que ya tenía (no los de la lista)', d.valorizar.precios.i1 === 3100)
    chk('la corrección entra por la diferencia: saldo 127.000 − 46.000 + 47.000', S.saldoProyectado(d) === 128000)
  }))
}

// ── Valorizar con precio_venta() (30/09/2026) ───────────────────────────────
// Las listas nuevas tienen precio solo en la presentación SIN cono y el
// conito aparte: el precio de cada producto lo propone la base.
{
  const S = nuevo()
  preparar(S, { items: [...ITEMS, { ...ITEMS[1], id: 'i2b', orden: 3, cajas: 1, unidades: 100 }] })
  const llamadas = []
  S.__setRpc(rpcPrecioVenta(RESP_PV, llamadas))
  esperas.push(S.abrirOrden('o1').then(() => S.abrirValorizar()).then(() => {
    const d = S.estado.orden
    const v = d.valorizar
    chk('los productos se valorizan con precio_venta (sin cono y con cono)', v.precios.i1 === 3000 && v.precios.i2 === 4000 && v.precios.i2b === 4000)
    chk('una llamada por renglón DISTINTO (presentación + cono)', llamadas.length === 2, JSON.stringify(llamadas))
    const p1 = llamadas.find(p => p.p_presentacion_id === 'pr1')
    const p2 = llamadas.find(p => p.p_presentacion_id === 'pr2')
    chk('con la lista del cliente, la fecha del retiro y el cono del renglón', p1 && p1.p_lista_id === 'l1' && p1.p_fecha === '2026-09-20' && p1.p_marca_id === null && p2 && p2.p_marca_id === 'm1')
    chk('no pide el precio de insumos si no hay insumos', !S.__llamadas.rpc.some(r => r[0] === 'precios_insumos_lista') && !S.__llamadas.consultas.some(c => c[0] === 'lista_precios_items'))
    const h = S.__els.get('ad-orden-cuerpo').innerHTML
    chk('con cono dice de dónde sale: unidad + conito', /lista Heladerías · \$ 30,00 por unidad \+ conito \$ 10,00/.test(h), h)
    chk('sin cono, solo la unidad', v.origen.i1.texto === 'lista Heladerías · $ 30,00 por unidad' && !v.origen.i1.grave)
    chk('los propuestos cuentan como de la lista', v.desdeLista.has('i1') && v.desdeLista.has('i2'))
    const pv = S.parametrosValorizar(d)
    chk('se mandan TODOS los precios a valorizar_orden_retiro', pv.p_precios.i1 === 3000 && pv.p_precios.i2 === 4000 && pv.p_precios.i2b === 4000 && Object.keys(pv.p_precios).length === 3)
  }))
}
{
  const S = nuevo()
  preparar(S)
  const tabla = {
    'pr1|': { data: { sin_precio: true, motivo: 'El producto no tiene precio en la lista base.' }, error: null },
    'pr2|m1': { data: null, error: { message: 'No tenés permiso para ver precios.' } },
  }
  S.__setRpc(rpcPrecioVenta(tabla))
  esperas.push(S.abrirOrden('o1').then(() => S.abrirValorizar()).then(() => {
    const v = S.estado.orden.valorizar
    const h = S.__els.get('ad-orden-cuerpo').innerHTML
    chk('sin_precio: el campo vacío (nunca un número inventado)', v.precios.i1 === null && !v.desdeLista.has('i1'))
    chk('y el motivo de la base en bordó', v.origen.i1.grave && /ad-renglon__origen--grave">El producto no tiene precio en la lista base\./.test(h))
    chk('error de la llamada: vacío y "No se pudo leer el precio de la lista"', v.precios.i2 === null && v.origen.i2.grave && /No se pudo leer el precio de la lista\. No tenés permiso para ver precios\./.test(h))
    chk('nunca "$ 0": el subtotal sin precio dice "—"', !/\$ 0,00/.test(h) && /data-subtotal="i1">—</.test(h))
    chk('el total dice que faltan precios', /Total: faltan precios/.test(h))
  }))
}
{
  const S = nuevo()
  preparar(S)
  S.estado.clientes = [{ ...CLIENTES[1], id: 'c1' }]   // sin lista
  const llamadas = []
  S.__setRpc(rpcPrecioVenta(RESP_PV, llamadas))
  esperas.push(S.abrirOrden('o1').then(() => S.abrirValorizar()).then(() => {
    chk('cliente sin lista: no se llama a precio_venta y se carga a mano', llamadas.length === 0 && S.estado.orden.valorizar.precios.i1 === null)
  }))
}
{
  // Corregir: los renglones con precio guardado no se vuelven a pedir.
  const S = nuevo()
  preparar(S, { orden: { ...ORDEN, estado_valorizacion: 'valorizada', total: 31000 }, items: [{ ...ITEMS[0], precio_caja: 3100, subtotal: 31000 }, ITEMS[1]] })
  const llamadas = []
  S.__setRpc(rpcPrecioVenta(RESP_PV, llamadas))
  esperas.push(S.abrirOrden('o1').then(() => S.abrirValorizar()).then(() => {
    const v = S.estado.orden.valorizar
    chk('corregir conserva el precio guardado y pide solo el que falta', v.precios.i1 === 3100 && v.precios.i2 === 4000 && llamadas.length === 1 && llamadas[0].p_presentacion_id === 'pr2')
  }))
}
{
  // Turno: una respuesta vieja no pisa la de un panel abierto de nuevo.
  const S = nuevo()
  preparar(S)
  let soltar = null
  let n = 0
  const lenta = { 'pr1|': () => { n++; return n === 1 ? new Promise(r => { soltar = () => r({ data: { ...PRECIO_VENTA['pr1|'], precio_caja: 1 }, error: null }) }) : { data: PRECIO_VENTA['pr1|'], error: null } }, 'pr2|m1': RESP_PV['pr2|m1'] }
  S.__setRpc(rpcPrecioVenta(lenta))
  esperas.push(S.abrirOrden('o1').then(async () => {
    const vieja = S.abrirValorizar()
    await Promise.resolve()
    S.cancelarValorizar()
    await S.abrirValorizar()
    const v = S.estado.orden.valorizar
    soltar()
    await vieja
    chk('la respuesta vieja no pisa el panel nuevo', S.estado.orden.valorizar === v && v.precios.i1 === 3000)
    chk('y el panel nuevo quedó cargado', !S.estado.orden.valorizar.cargando)
    // Cerrar mientras carga: la respuesta que llega después no lo reabre.
    n = 0
    const otra = S.abrirValorizar()
    await Promise.resolve()
    S.cancelarValorizar()
    soltar()
    await otra
    chk('cerrar el panel mientras carga: la respuesta tarde no lo reabre', S.estado.orden.valorizar === null)
  }))
}
{
  // Insumo intacto: sigue con la lista (precio_vigente_insumo) y no llama a precio_venta.
  const S = nuevo()
  preparar(S, { items: [{ id: 'i3', orden: 1, presentacion_id: null, marca_id: null, cajas: null, unidades: null, insumo_id: 'ins-h', cantidad: 2, precio_caja: null, subtotal: null, lote: null }] })
  S.__tablas.lista_precios_items = [{ presentacion_id: null, insumo_id: 'ins-h', precio_caja: 100, vigente_desde: '2026-09-01' }]
  const llamadas = []
  S.__setRpc(rpcPrecioVenta(RESP_PV, llamadas))
  esperas.push(S.abrirOrden('o1').then(() => S.abrirValorizar()).then(() => {
    const v = S.estado.orden.valorizar
    chk('un insumo no llama a precio_venta y sale de la lista', llamadas.length === 0 && v.precios.i3 === 100 && v.desdeLista.has('i3') && !v.origen.i3)
    const pi = S.__llamadas.rpc.filter(r => r[0] === 'precios_insumos_lista')
    chk('el precio del insumo lo calcula la base con la fecha del retiro', pi.length === 1 && pi[0][1].p_lista_id === 'l1' && pi[0][1].p_fecha === '2026-09-20', JSON.stringify(pi))
  }))
}
{
  // Insumo a costo + % (09/10/2026): el precio que calculó la base; sin costo, sin precio y en bordó.
  const ITEM = (id, ins) => ({ id, orden: 1, presentacion_id: null, marca_id: null, cajas: null, unidades: null, insumo_id: ins, cantidad: 2, precio_caja: null, subtotal: null, lote: null })
  const S = nuevo()
  preparar(S, { items: [ITEM('i3', 'ins-h'), ITEM('i4', 'ins-z')] })
  S.__setRpc(rpcPrecioVenta(RESP_PV, [], [
    { insumo_id: 'ins-h', insumo: 'Harina 000', unidad_medida: 'kg', precio_unitario: '1150', tipo: 'costo_mas_pct', recargo_costo_pct: '15', vigente_desde: '2026-09-01', sin_costo: false },
    { insumo_id: 'ins-z', insumo: 'Azúcar', unidad_medida: 'kg', precio_unitario: null, tipo: 'costo_mas_pct', recargo_costo_pct: '20', vigente_desde: '2026-09-01', sin_costo: true },
  ]))
  esperas.push(S.abrirOrden('o1').then(() => S.abrirValorizar()).then(() => {
    const v = S.estado.orden.valorizar
    chk('costo + %: propone el precio de la base', v.precios.i3 === 1150 && v.desdeLista.has('i3') && v.origen.i3.texto === 'Costo + 15 % (lista)')
    chk('sin costo: no propone nada (nunca 0) y lo dice en bordó', v.precios.i4 === null && !v.desdeLista.has('i4') && v.origen.i4.grave === true)
  }))
}
{
  // HTML malicioso en el nombre de la lista y en el motivo de la base.
  const S = nuevo()
  chequearMarcas(chk, 'origen del precio', S.htmlOrigenPrecio({ texto: S.textoOrigenPrecio({ lista: marca('lista'), producto_unitario: 1, conito_unitario: 1 }, true) }), ['lista'])
  chequearMarcas(chk, 'motivo sin precio', S.htmlOrigenPrecio({ texto: marca('motivo-pv'), grave: true }), ['motivo-pv'])
  chk('con cono sin conito cargado lo dice (no "$ 0")', /la lista no tiene precio de conito/.test(S.textoOrigenPrecio({ lista: 'X', producto_unitario: 30, conito_unitario: 0 }, true)))
  chk('el precio por unidad con hasta 4 decimales', S.textoPrecioUnitario(135.2345) === '$ 135,2345' && S.textoPrecioUnitario(135.2) === '$ 135,20')
}

// ── Anular ─────────────────────────────────────────────────────────────────
{
  const S = nuevo()
  preparar(S)
  esperas.push(S.abrirOrden('o1').then(async () => {
    S.pedirAnular()
    chk('anular abre el panel del motivo', S.__els.get('ad-panel-anular').hidden === false)
    S.__els.get('ad-anular-motivo').value = 'x'
    await S.confirmarAnular()
    chk('sin motivo no se anula', !S.__llamadas.rpc.some(x => x[0] === 'anular_orden_retiro') && /Escribí por qué/.test(S.__els.get('ad-anular-error').textContent))
    S.__els.get('ad-anular-motivo').value = '  Se cargó dos veces  '
    let p = null
    S.__setRpc(async (n, q) => { if (n === 'anular_orden_retiro') p = q; return { data: null, error: null } })
    await S.confirmarAnular()
    chk('con motivo, anular_orden_retiro con el motivo limpio', p && p.p_orden_id === 'o1' && p.p_motivo === 'Se cargó dos veces')
  }))
  const T = nuevo()
  preparar(T)
  T.estado.misTareas.delete('retiros:anular')
  esperas.push(T.abrirOrden('o1').then(() => {
    T.pedirAnular()
    chk('sin retiros:anular no se puede ni pedir', !T.estado.orden.anular && T.__els.get('ad-btn-anular').hidden === true)
  }))
  const U = nuevo()
  preparar(U, { orden: { ...ORDEN, estado: 'anulada', anulada_motivo: 'error' } })
  esperas.push(U.abrirOrden('o1').then(() => {
    chk('una anulada no se valoriza ni se anula de nuevo', U.__els.get('ad-btn-valorizar').hidden === true && U.__els.get('ad-btn-anular').hidden === true)
    chk('y dice el motivo', /Anulada\. Motivo: error/.test(U.__els.get('ad-orden-cuerpo').innerHTML))
  }))
}

// ── La hoja CON precios ────────────────────────────────────────────────────
{
  const S = nuevo()
  preparar(S, { orden: { ...ORDEN, estado_valorizacion: 'valorizada', total: 46000 }, items: ITEMS.map(i => ({ ...i, precio_caja: i.id === 'i1' ? 3000 : 4000, subtotal: i.id === 'i1' ? 30000 : 16000 })) })
  esperas.push(S.abrirOrden('o1').then(async () => {
    // Imprimir mide la hoja antes (07/10/2026): se espera.
    await S.imprimirOrden()
    const h = S.__els.get('ad-impresion').innerHTML
    chk('imprimir desde Administración lleva PRECIOS', S.__impresiones() === 1 && /PRECIO X CAJA/.test(h) && /\$ 30\.000,00/.test(h) && /rh-total__plata">\$ 46\.000,00/.test(h))
    chk('con la misma hoja: dos copias y la leyenda', (h.match(/<section class="rh-copia/g) || []).length === 2 && /No válido como factura/.test(h))
    chk('con el logo de la empresa de la orden', /logo-cucuruchos-nuss\.png/.test(h) && /NUSS SRL/.test(h))
    chk('y quién la cargó', /Entregó: <strong>Emanuel Romero<\/strong>/.test(h))
  }))
  const T = nuevo()
  preparar(T)
  esperas.push(T.abrirOrden('o1').then(async () => {
    await T.imprimirOrden()
    const h = T.__els.get('ad-impresion').innerHTML
    chk('sin valorizar, la hoja con precios dice "—" (nunca $ 0,00)', /PRECIO X CAJA/.test(h) && !/0,00/.test(h))
  }))
}
{
  const S = nuevo()
  preparar(S)
  S.__win.html2canvas = async () => ({ width: 1000, height: 700, toDataURL: () => 'data:,' })
  S.__win.jspdf = { jsPDF: function () { this.addImage = () => {}; this.output = () => new Blob(['%PDF']) } }
  S.__doc.querySelector = (sel) => /data-lib=/.test(sel) ? {} : null
  S.__setNav({})
  esperas.push(S.abrirOrden('o1').then(() => S.enviarOrdenAd()).then(() => {
    chk('enviar abre el mail al cliente', /^mailto:compras%40anatolia\.com/.test(S.__win.location.href))
    chk('y lo dice pegado a los botones', /Adjuntá el PDF/.test(S.__els.get('ad-orden-hoja-aviso').textContent))
  }))
  chk('Enviar desde Administración va con precios', /enviarOrden\(hoja, \{ conPrecios: true/.test(src))
}

// ── HTML malicioso ─────────────────────────────────────────────────────────
{
  const S = nuevo()
  S.estado.clientes = [{ id: 'c1', nombre: marca('cliente'), razon_social: marca('razon'), lista_precio_id: null }]
  S.estado.catalogo = { productos: [{ id: 'p1', nombre: marca('producto') }], presentaciones: [{ id: 'pr1', producto_id: 'p1', nombre: marca('presentacion'), con_cono: true }], marcas: [{ id: 'm1', nombre: marca('cono') }] }
  S.estado.nombres.set('emp-9', marca('cargo'))
  const o = { ...ORDEN, codigo: marca('codigo'), transporte: marca('transporte'), observaciones: marca('obs'), estado: 'anulada', anulada_motivo: marca('motivo'), estado_valorizacion: 'valorizada', total: 1 }
  const d = { orden: o, items: [{ id: marca('item'), presentacion_id: 'pr1', marca_id: 'm1', cajas: 1, unidades: 1, precio_caja: 1, subtotal: 1 }], lotes: [{ presentacion_id: 'pr1', marca_id: 'm1', lote: marca('lote'), cajas: -1 }], valorizar: null }
  chequearMarcas(chk, 'detalle de la orden', S.htmlDetalleOrden(d, S.estado.catalogo), ['cliente', 'razon', 'producto', 'presentacion', 'cono', 'lote', 'cargo', 'transporte', 'obs', 'motivo'])
  chequearMarcas(chk, 'fila de orden', S.htmlFilaOrden({ ...o, cliente_id: 'c1', cajas: 1 }), ['codigo', 'cliente'])
  chequearMarcas(chk, 'filtro de clientes', S.htmlOpcionesClientes(S.estado.clientes, ''), ['cliente'])
  S.estado.empresas = [{ id: 'u-n', nombre: marca('empresa') }, { id: 'u-d', nombre: 'Otra' }]
  S.estado.misTareas.set('retiros:ver', { todas: true })
  chequearMarcas(chk, 'selector de empresas', S.htmlEmpresas(), ['empresa'])
  d.valorizar = { precios: {}, desdeLista: new Set(), sinLista: false, saldo: 0, limite: null, cargando: false, error: marca('error-v'), errorGuardar: marca('error-g') }
  chequearMarcas(chk, 'valorizar', S.htmlValorizar(d), ['error-v', 'error-g'])
}


// ── Una orden con un renglón de INSUMO (materia prima de reventa) ───────────
const ITEMS_INS = [
  ITEMS[0],
  { id: 'i3', orden: 2, presentacion_id: null, marca_id: null, cajas: null, unidades: null, insumo_id: 'ins-h', cantidad: 25.5, precio_caja: null, subtotal: null, lote: null },
]
const LISTA_INS = [...LISTA, { presentacion_id: null, insumo_id: 'ins-h', precio_caja: 100, vigente_desde: '2026-09-01' }]
{
  const S = nuevo()
  preparar(S, { items: ITEMS_INS })
  S.__tablas.lista_precios_items = LISTA_INS
  S.estado.misTareas = new Map([['retiros:ver', { todas: true }], ['retiros:precios', { todas: true }], ['stock:ver', { todas: true }]])
  S.__tablas.stock_movimientos = [{ insumo_id: 'ins-h', lote: 'H-10', cantidad: -25.5 }]
  esperas.push(S.abrirOrden('o1').then(() => {
    const h = S.__els.get('ad-orden-cuerpo').innerHTML
    chk('el renglón de insumo muestra su cantidad y unidad', /25,5 kg · Harina 000 · Molino/.test(h))
    chk('los lotes del insumo salen de stock_movimientos, con stock:ver', /lotes H-10 \(25,5 kg\)/.test(h) &&
      S.__llamadas.consultas.some(c => c[0] === 'stock_movimientos' && c[1].some(f => f[0] === 'eq' && f[1] === 'orden_retiro_id' && f[2] === 'o1')))
    return S.abrirValorizar()
  }).then(() => {
    const v = S.estado.orden.valorizar
    const selDe = (tabla) => ((S.__llamadas.consultas.find(c => c[0] === tabla) || [null, []])[1].find(f => f[0] === 'select') || [null, ''])[1]
    chk('los renglones se leen con el insumo y su cantidad (se afirma sobre el select)', /insumo_id/.test(selDe('orden_retiro_items')) && /cantidad/.test(selDe('orden_retiro_items')))
    chk('los precios de los insumos los calcula la base (precios_insumos_lista), no la pantalla', S.__llamadas.rpc.some(r => r[0] === 'precios_insumos_lista') && !S.__llamadas.consultas.some(c => c[0] === 'lista_precios_items'))
    chk('valorizar trae el precio del insumo de la lista del cliente', v.precios.i3 === 100 && v.desdeLista.has('i3'))
    chk('el subtotal del insumo es precio por CANTIDAD', S.subtotalValorizar(S.estado.orden, ITEMS_INS[1]) === 2550)
    chk('el total suma cajas y cantidad', S.totalValorizar(S.estado.orden) === 30000 + 2550)
    const h = S.__els.get('ad-orden-cuerpo').innerHTML
    chk('el precio del insumo se pide "x kg"', /Precio x kg/.test(h) && /Precio x caja/.test(h))
    const pv = S.parametrosValorizar(S.estado.orden)
    chk('se manda el precio de cada renglón, también el del insumo', pv.p_precios.i1 === 3000 && pv.p_precios.i3 === 100)
    const hoja = S.htmlHoja(S.ordenParaHoja(S.estado.orden), { conPrecios: true })
    chk('la hoja con precios lleva el insumo con su cantidad', /Harina 000 · Molino/.test(hoja) && /25,5 kg/.test(hoja))
  }))
}
{
  const S = nuevo()
  preparar(S, { items: ITEMS_INS })
  S.estado.misTareas = new Map([['retiros:ver', { todas: true }], ['produccion:ver', null]])
  esperas.push(S.abrirOrden('o1').then(() => {
    chk('sin stock:ver no se consultan los lotes de los insumos', !S.__llamadas.consultas.some(c => c[0] === 'stock_movimientos'))
    chk('y el renglón lo dice', /Insumo · lotes: no se pueden ver con tu usuario/.test(S.__els.get('ad-orden-cuerpo').innerHTML))
  }))
}
{
  const S = nuevo()
  chk('la cantidad valorizable: cajas o cantidad del insumo', S.cantidadValorizable(ITEMS[0]) === 10 && S.cantidadValorizable(ITEMS_INS[1]) === 25.5)
  const S2 = nuevo()
  S2.estado.catalogo = { ...CAT, insumos: [{ id: 'ins-x', nombre: marca('ins-nombre'), marca: marca('ins-marca'), unidad_medida: marca('ins-unidad') }] }
  S2.estado.clientes = CLIENTES
  const d = { orden: ORDEN, items: [{ id: 'ix', insumo_id: 'ins-x', cantidad: 2, precio_caja: 1, subtotal: 2 }], lotes: [], lotesInsumos: [{ insumo_id: 'ins-x', lote: marca('ins-lote'), cantidad: -2 }], valorizar: null }
  chequearMarcas(chk, 'detalle con un insumo', S2.htmlDetalleOrden(d, S2.estado.catalogo), ['ins-nombre', 'ins-marca', 'ins-unidad', 'ins-lote'])
  d.valorizar = { precios: { ix: 1 }, desdeLista: new Set(), sinLista: false, saldo: null, limite: null }
  chequearMarcas(chk, 'valorizar un insumo', S2.htmlDetalleOrden(d, S2.estado.catalogo), ['ins-unidad'])
  const valorizada = { ...d, valorizar: null, orden: { ...ORDEN, estado_valorizacion: 'valorizada', total: 2 } }
  chequearMarcas(chk, 'insumo valorizado', S2.htmlDetalleOrden(valorizada, S2.estado.catalogo), ['ins-unidad'])
  chequearMarcas(chk, 'fila de orden con insumos', S2.htmlFilaOrden({ ...ORDEN, cliente_id: 'c1', cajas: 0, insumos: 2, codigo: marca('codigo-ins') }), ['codigo-ins'])
}

fin()
