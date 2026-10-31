// ADMINISTRACIÓN — LA ORDEN A OTRA EMPRESA DEL GRUPO (24/10/2026).
//
// clientes.unidad_grupo_id: el cliente ES otra empresa del grupo ("DOLCE
// PASTA SRL" dentro de Nuss → Dolce Pasta). La base (verificada con
// pg_get_functiondef el 24/10/2026): valorizar_orden_retiro NO escribe
// cliente_movimientos para ese cliente, deja la deuda en
// movimientos_entre_unidades (orden_retiro_id; acreedora = la que entrega,
// deudora = la que recibe) con el concepto "Orden de retiro N-0042" (una
// corrección, "Corrección de la valorización de la orden N-0042"; la
// anulación, "Anulación de la orden N-0042: …"). Esta suite EJECUTA la
// pantalla y fija:
//  - EL SELLO "Entre empresas" en la lista y en el detalle; "Empresa del
//    grupo" en la lista de clientes.
//  - LA VALORIZACIÓN dice "Queda como deuda de <la que recibe> con <la que
//    entrega>", nunca cuenta corriente ni límite de crédito; la RPC no cambia.
//  - NO se ofrecen "Dividir para facturar", la comisión ni "Facturas de ARCA";
//    el filtro "Con comisión sin cargar" no las cuenta.
//  - LA FICHA: "Es la empresa <X> del grupo" (solo lectura).
//  - ENTRE EMPRESAS: cada deuda de una orden muestra su código con el link a
//    la orden (orden_retiro_id de la tabla, o el código del concepto), y el
//    link la abre en su empresa.
//  - XSS de todo lo nuevo.
//
//   node pruebas/test-administracion-orden-entre-empresas.js

const path = require('path')
const fs = require('fs')
const { construirAdministracion } = require('./sandbox-administracion')
const { arnes, marca, chequearMarcas } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/administracion.html')
const src = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${src.length} bytes)`)
const { chk, esperas, fin } = arnes()
const nuevo = () => construirAdministracion(ARCHIVO)

const DOLCE = 'u-d'
const CLIENTES = [
  // El cliente que ES Dolce Pasta (con límite y comisión habitual, a propósito: no se usan).
  { id: 'c-dp', nombre: 'DOLCE PASTA SRL', razon_social: 'DOLCE PASTA SRL', lista_precio_id: 'l-int', limite_credito: 1000, activo: true, comision_habitual: 5, unidad_grupo_id: DOLCE },
  { id: 'c1', nombre: 'Distribuidora Anatolia', razon_social: 'ANATOLIA SRL', lista_precio_id: 'l1', limite_credito: 100000, activo: true, comision_habitual: 5, unidad_grupo_id: null },
]
const CAT = {
  productos: [{ id: 'p1', nombre: 'Cucurucho grande' }],
  presentaciones: [{ id: 'pr1', producto_id: 'p1', nombre: 'Caja x 100', con_cono: false, unidades_por_caja: 100 }],
  marcas: [], insumos: [],
}
const ORDEN = { id: 'o1', numero: 42, codigo: 'N-0042', unidad_negocio_id: 'u-n', fecha: '2026-10-24', estado: 'confirmada', estado_valorizacion: 'valorizada',
  total: 500000, moneda: 'ARS', cliente_id: 'c-dp', cargada_por: 'emp-9', cargada_en: '2026-10-24T13:00:00Z', transporte: null, observaciones: null,
  comision_modo: null, comision_valor: null, comision_importe: null, comision_factura_id: null, division_pct_a: null }
const ITEMS = [{ id: 'i1', orden: 1, presentacion_id: 'pr1', marca_id: null, cajas: 10, unidades: 1000, precio_caja: 50000, subtotal: 500000, lote: null, tipo: 'retiro' }]

function preparar(S, { orden = ORDEN, items = ITEMS, clientes = CLIENTES } = {}) {
  S.estado.clientes = clientes
  S.estado.catalogo = CAT
  S.estado.catalogoEmpresa = 'u-n'
  S.__tablas.ordenes_retiro = [orden]
  S.__tablas.orden_retiro_items = items
  S.__tablas.v_empleados_publico = [{ id: 'emp-9', nombre: 'Emanuel Romero' }]
}
const el = (S, id) => S.__doc.getElementById(id)
const cuerpo = (S) => S.__els.get('ad-orden-cuerpo').innerHTML

// ── Qué orden es entre empresas y de quién es la deuda ─────────────────────
{
  const S = nuevo()
  preparar(S)
  chk('el cliente con unidad_grupo_id es otra empresa del grupo', S.empresaGrupoDe(CLIENTES[0]) === DOLCE)
  chk('un cliente común no', S.empresaGrupoDe(CLIENTES[1]) === null && S.empresaGrupoDe(null) === null && S.empresaGrupoDe({ unidad_grupo_id: '' }) === null)
  chk('la orden a Dolce Pasta es entre empresas', S.ordenEntreEmpresas(ORDEN) === true)
  chk('la orden a un cliente común no', S.ordenEntreEmpresas({ ...ORDEN, cliente_id: 'c1' }) === false && S.ordenEntreEmpresas(null) === false)
  chk('la deuda: la que recibe le debe a la que entrega', S.textoDeudaEntre(ORDEN) === 'Queda como deuda de Dolce Pasta con Cucuruchos Nuss', S.textoDeudaEntre(ORDEN))
  const h = S.htmlDeudaEntre(ORDEN)
  chk('"no va a la cuenta corriente"', /Queda como deuda de Dolce Pasta con Cucuruchos Nuss \(Entre empresas\): no va a la cuenta corriente\./.test(h), h)
  chk('con "Al valorizar, " sigue en minúscula', /Al valorizar, queda como deuda de Dolce Pasta/.test(S.htmlDeudaEntre(ORDEN, 'Al valorizar, ')))
  const S2 = nuevo()
  preparar(S2, { clientes: [{ ...CLIENTES[0], unidad_grupo_id: 'u-desconocida' }] })
  chk('una empresa que no se conoce no se inventa', S2.textoDeudaEntre(ORDEN) === 'Queda como deuda de la empresa que recibe con Cucuruchos Nuss', S2.textoDeudaEntre(ORDEN))
}

// ── La lista de órdenes ────────────────────────────────────────────────────
{
  const S = nuevo()
  preparar(S)
  const h = S.htmlFilaOrden({ ...ORDEN, cajas: 10, insumos: 0, devueltas: 0 })
  chk('la fila dice "Orden interna" (27/10/2026)', /ad-sello--entre[^>]*>Orden interna</.test(h), h)
  chk('el título del sello nombra a la que recibe', /title="Otra empresa del grupo: Dolce Pasta"/.test(h))
  chk('sin "Comisión sin cargar" aunque el cliente tenga comisión habitual', !/Comisión sin cargar/.test(h))
  const h2 = S.htmlFilaOrden({ ...ORDEN, cliente_id: 'c1', cajas: 10, insumos: 0, devueltas: 0 })
  chk('un cliente común: sin el sello (y sin "Comisión sin cargar": salió del flujo el 28/10/2026)', !/Orden interna/.test(h2) && !/Comisión sin cargar/.test(h2))
  chk('faltaComision: nunca para otra empresa del grupo', S.faltaComision(ORDEN, CLIENTES[0]) === false && S.faltaComision({ ...ORDEN, cliente_id: 'c1' }, CLIENTES[1]) === true)
  const lista = S.ordenesComisionSinCargar([ORDEN, { ...ORDEN, id: 'o2', cliente_id: 'c1' }], CLIENTES)
  chk('el filtro "Con comisión sin cargar" no cuenta las órdenes entre empresas', lista.length === 1 && lista[0].id === 'o2')
}

// ── El detalle: valorizada ─────────────────────────────────────────────────
{
  const S = nuevo()
  preparar(S)
  esperas.push(S.abrirOrden('o1').then(() => {
    const h = cuerpo(S)
    chk('el detalle tiene el sello "Orden interna"', /ad-sello--entre[^>]*>Orden interna</.test(h))
    // 29/10/2026: ya no "entró a su stock": en tránsito o recibida (test-administracion-orden-recepcion.js);
    // sin la recepción a la vista, dice quién es sin inventar.
    chk('el dato "Orden interna" dice quién es (sin la recepción a la vista, no inventa)', /id="ad-recepcion-orden"[^>]*><span class="ad-dato__rotulo">Orden interna<\/span><span class="ad-recepcion__texto">Es Dolce Pasta, otra empresa del grupo\. Con tu usuario no se ve si ya la recibieron/.test(h) && !/entró a su stock/.test(h))
    chk('el total', /Total \$\s500\.000,00/.test(h))
    chk('la deuda entre empresas, no la cuenta corriente', /Queda como deuda de Dolce Pasta con Cucuruchos Nuss \(Entre empresas\): no va a la cuenta corriente/.test(h))
    chk('sin comisión (ni el botón ni la línea)', !/Comisión/.test(h) && !/ad-btn-comision/.test(h))
    chk('sin "Facturas de ARCA" (no se divide para facturar)', !/Facturas de ARCA/.test(h))
    chk('sin las órdenes de pedido N1 / N2 (no se divide para facturar)', el(S, 'ad-orden-facturar').hidden === true && !/ad-fc/.test(el(S, 'ad-orden-facturar').innerHTML) &&
      !S.__llamadas.rpc.some(([n]) => n === 'datos_division_orden' || n === 'guardar_division_orden'))
    chk('se puede corregir la valorización', el(S, 'ad-btn-corregir-valor').hidden === false)
    chk('se puede anular', el(S, 'ad-btn-anular').hidden === false)
    chk('puedeFacturar: no', S.puedeFacturar(S.estado.orden.orden) === false)
    chk('puedeCargarComision: no', S.puedeCargarComision(S.estado.orden.orden) === false)
  }))
}
{
  // El mismo caso con un cliente común: todo lo de siempre sigue.
  const S = nuevo()
  preparar(S, { orden: { ...ORDEN, cliente_id: 'c1' } })
  // Arreglos 30/10 (punto 6): "sin condición" sale del cliente leído de la base.
  S.__tablas.clientes = [{ id: 'c1', pct_parte_a: null }]
  const esperarBase = async () => { for (let i = 0; i < 10; i++) await new Promise(r => setImmediate(r)) }
  esperas.push(S.abrirOrden('o1').then(esperarBase).then(() => {
    const h = cuerpo(S)
    chk('cliente común: sin sello ni deuda entre empresas', !/Orden interna/.test(h) && !/Entre empresas/.test(h) && !/data-entre-deuda/.test(h))
    chk('cliente común: el total, sin la comisión común (28/10/2026)', /Total \$/.test(h) && !/Comisión: sin cargar/.test(h) && !/ad-btn-comision/.test(h))
    // c1 no tiene condición de venta: desde el 30/10/2026 no se inventa el 100/0 (no se calcula nada hasta poner el %).
    chk('cliente común: las órdenes de pedido N1 / N2 en la misma pantalla', el(S, 'ad-orden-facturar').hidden === false && /id="ad-fc"/.test(el(S, 'ad-orden-facturar').innerHTML) &&
      /data-fc-sin-condicion/.test(el(S, 'ad-fc-sin-condicion').innerHTML) && !S.__llamadas.rpc.some(([n]) => n === 'datos_division_orden'))
  }))
}
{
  // Anulada: el total a secas, sin la deuda (la base ya la dio vuelta).
  const S = nuevo()
  preparar(S, { orden: { ...ORDEN, estado: 'anulada', anulada_motivo: 'Error de carga' } })
  esperas.push(S.abrirOrden('o1').then(() => {
    const h = cuerpo(S)
    chk('anulada: sello y total, sin la frase de la deuda', /Orden interna/.test(h) && /Total \$\s500\.000,00/.test(h) && !/data-entre-deuda/.test(h))
  }))
}

// ── Valorizar ──────────────────────────────────────────────────────────────
{
  const S = nuevo()
  preparar(S, { orden: { ...ORDEN, estado_valorizacion: 'pendiente', total: 0 }, items: [{ ...ITEMS[0], precio_caja: null, subtotal: null }] })
  S.__tablas.cliente_movimientos = [{ importe: 999999 }]
  S.__setRpc((n) => n === 'precio_venta' ? { data: [{ precio: 50000, origen: 'lista' }], error: null }
    : n === 'valorizar_con_condiciones' ? { data: { total: 500000, moneda: 'ARS', saldo_cliente: 999999, limite_credito: 1000, supera_limite: true }, error: null }
    : { data: null, error: null })
  esperas.push(S.abrirOrden('o1').then(async () => {
    chk('sin valorizar: se ofrece valorizar', el(S, 'ad-btn-valorizar').hidden === false)
    await S.abrirValorizar()
    const d = S.estado.orden
    chk('entre empresas no hay límite de crédito', d.valorizar.limite === null)
    S.cambiarPrecio('i1', 50000)
    const h = cuerpo(S)
    chk('la valorización avisa de quién es la deuda', /Al valorizar, queda como deuda de Dolce Pasta con Cucuruchos Nuss \(Entre empresas\): no va a la cuenta corriente/.test(h), h.slice(0, 400))
    chk('sin el aviso del límite de crédito', !/pasa su límite/.test(h))
    await S.guardarValorizacion()
    const llamada = S.__llamadas.rpc.find(r => r[0] === 'valorizar_con_condiciones')
    // 30/10/2026: valorizar_con_condiciones (sin condiciones tildadas: []), que llama a valorizar_orden_retiro.
    chk('la RPC es la de siempre (la base decide adónde va la deuda)', !!llamada && llamada[1].p_orden_id === 'o1' && Object.keys(llamada[1]).sort().join() === 'p_condiciones,p_orden_id,p_precios' &&
      JSON.stringify(llamada[1].p_condiciones) === '[]')
    const exito = S.__llamadas.exitos.join(' | ')
    chk('el aviso de éxito dice de quién es la deuda', /Orden N-0042 valorizada: \$\s500\.000,00\. Queda como deuda de Dolce Pasta con Cucuruchos Nuss\./.test(exito), exito)
    chk('aunque la base diga supera_limite, no se avisa límite', !S.estado.orden?.aviso)
  }))
}
{
  // Un cliente común sigue avisando el límite.
  const S = nuevo()
  preparar(S, { orden: { ...ORDEN, cliente_id: 'c1', estado_valorizacion: 'pendiente' } })
  S.__setRpc((n) => n === 'valorizar_con_condiciones' ? { data: { total: 500000, moneda: 'ARS', saldo_cliente: 200000, limite_credito: 100000, supera_limite: true }, error: null }
    : n === 'precio_venta' ? { data: [{ precio: 50000, origen: 'lista' }], error: null } : { data: null, error: null })
  esperas.push(S.abrirOrden('o1').then(async () => {
    await S.abrirValorizar()
    chk('cliente común: el límite sigue', S.estado.orden.valorizar.limite === 100000)
    S.cambiarPrecio('i1', 50000)
    chk('cliente común: sin la frase de entre empresas', !/data-entre-deuda/.test(cuerpo(S)))
    await S.guardarValorizacion()
    chk('cliente común: el éxito sin la deuda entre empresas', !/Queda como deuda/.test(S.__llamadas.exitos.join(' ')))
    chk('cliente común: el aviso del límite', /pasa su límite/.test(S.estado.orden?.aviso ?? ''))
  }))
}
{
  // El error de la base, tal cual.
  const S = nuevo()
  preparar(S, { orden: { ...ORDEN, estado_valorizacion: 'pendiente' } })
  S.__setRpc((n) => n === 'valorizar_con_condiciones' ? { data: null, error: { message: 'Faltan precios en 1 renglón(es): cargalos o asignale una lista con esos productos al cliente.' } }
    : n === 'precio_venta' ? { data: [{ precio: 50000, origen: 'lista' }], error: null } : { data: null, error: null })
  esperas.push(S.abrirOrden('o1').then(async () => {
    await S.abrirValorizar()
    S.cambiarPrecio('i1', 50000)
    await S.guardarValorizacion()
    chk('el error de la base tal cual', /Faltan precios en 1 renglón\(es\): cargalos o asignale una lista/.test(cuerpo(S)))
  }))
}

// ── La ficha y la lista de clientes ────────────────────────────────────────
{
  const S = nuevo()
  preparar(S)
  chk('la ficha: "Es la empresa Dolce Pasta del grupo"', /Es la empresa Dolce Pasta del grupo\./.test(S.htmlFichaEntre(CLIENTES[0])))
  chk('la ficha dice que no va a la cuenta corriente', /no van a la cuenta corriente/.test(S.htmlFichaEntre(CLIENTES[0])))
  chk('un cliente común: nada', S.htmlFichaEntre(CLIENTES[1]) === '' && S.htmlFichaEntre(null) === '')
  S.__tablas.clientes = [{ ...CLIENTES[0], unidad_negocio_id: 'u-n' }]
  S.__tablas.listas_precios = []
  S.__tablas.proveedores = []
  esperas.push(S.abrirFicha('c-dp').then(() => {
    chk('al abrir la ficha se ve arriba', /data-ficha-entre[^>]*>Es la empresa Dolce Pasta del grupo/.test(S.__els.get('ad-ficha-aviso').innerHTML), S.__els.get('ad-ficha-aviso').innerHTML)
    const sel = S.__llamadas.consultas.find(c => c[0] === 'clientes' && c[1].some(f => f[0] === 'select' && /unidad_grupo_id/.test(f[1])))
    chk('la ficha lee unidad_grupo_id', !!sel)
  }))
  const fila = S.htmlFilaCliente({ cliente_id: 'c-dp', nombre: 'DOLCE PASTA SRL', saldo: 0, lista: 'Nuss → Dolce Pasta (interna)', retiros_mes: 1 })
  chk('la lista de clientes: "Empresa del grupo"', /ad-sello--entre[^>]*>Empresa del grupo</.test(fila))
  chk('un cliente común no lo tiene', !/Empresa del grupo/.test(S.htmlFilaCliente({ cliente_id: 'c1', nombre: 'Anatolia', saldo: 0, lista: null, retiros_mes: 0 })))
  chk('leerClientes pide unidad_grupo_id', /from\('clientes'\)\s*\n\s*\.select\('[^']*unidad_grupo_id[^']*'\)\s*\n\s*\.eq\('unidad_negocio_id', unidadId\)\.order\('nombre'\)/.test(src))
}

// ── Entre empresas: el código y el link a la orden ────────────────────────
const F = (o) => ({ fecha: '2026-10-24', tipo: 'otro', de_unidad_id: 'u-n', de_unidad: 'Cucuruchos Nuss', a_unidad_id: 'u-d', a_unidad: 'Dolce Pasta', moneda: 'ARS', importe: 500000,
  cantidad: null, unidad_medida: null, presentacion_id: null, insumo_id: null, referencia_tipo: 'movimiento_entre_unidades', referencia_id: 'mu1', detalle: 'Orden de retiro N-0042', ...o })
{
  const S = nuevo()
  chk('el código de "Orden de retiro N-0042"', S.codigoOrdenEntre(F({})) === 'N-0042')
  chk('el de una corrección', S.codigoOrdenEntre(F({ detalle: 'Corrección de la valorización de la orden N-0042' })) === 'N-0042')
  chk('el de una anulación (con el motivo después)', S.codigoOrdenEntre(F({ detalle: 'Anulación de la orden D-0107: error de carga' })) === 'D-0107')
  chk('una deuda cargada a mano no tiene orden', S.codigoOrdenEntre(F({ detalle: 'Préstamo de la caja' })) === null)
  chk('solo en las deudas cargadas (no en un cheque)', S.codigoOrdenEntre(F({ tipo: 'cheque' })) === null && S.codigoOrdenEntre(null) === null)
  chk('"Desorden" no es "orden"', S.codigoOrdenEntre(F({ detalle: 'Desorden N-0042' })) === null)
}
{
  // Con la tabla (super_admin o taller:precios): el id exacto.
  const S = nuevo()
  S.__tablas.movimientos_entre_unidades = [{ id: 'mu1', orden_retiro_id: 'o1' }]
  S.__tablas.ordenes_retiro = [{ id: 'o1', codigo: 'N-0042', unidad_negocio_id: 'u-n' }]
  const filas = [F({}), F({ referencia_id: 'mu2', detalle: 'Préstamo', importe: 10 }), F({ tipo: 'cheque', referencia_tipo: 'cheque', referencia_id: 'q1', detalle: 'Cheque · orden N-0001' })]
  esperas.push(S.vincularOrdenesEntre(filas).then(() => {
    chk('la deuda de la orden queda con su id, código y empresa', filas[0].orden?.id === 'o1' && filas[0].orden.codigo === 'N-0042' && filas[0].orden.unidad === 'u-n')
    chk('una deuda sin orden no inventa', filas[1].orden === undefined)
    chk('un cheque no se toca', filas[2].orden === undefined)
    const h = S.htmlOrdenEntre(filas[0])
    chk('con retiros:ver en esa empresa: el código es un link a la orden', /data-entre-orden="o1">N-0042<\/button>/.test(h), h)
    chk('dice "Orden de retiro"', /Orden de retiro <button/.test(h))
    const consulta = S.__llamadas.consultas.find(c => c[0] === 'movimientos_entre_unidades')
    chk('lee orden_retiro_id de la tabla, por los ids de la RPC', !!consulta && consulta[1].some(f => f[0] === 'select' && f[1] === 'id, orden_retiro_id') && consulta[1].some(f => f[0] === 'in' && f[1] === 'id' && f[2].join() === 'mu1,mu2'))
  }))
}
{
  // Sin la tabla (la policy no la deja leer): por el código del concepto.
  const S = nuevo()
  S.__tablas.movimientos_entre_unidades = () => ({ data: [], error: null })
  S.__tablas.ordenes_retiro = (filtros) => {
    const f = filtros.find(x => x[0] === 'in')
    return { data: f && f[1] === 'codigo' && f[2].includes('N-0042') ? [{ id: 'o1', codigo: 'N-0042', unidad_negocio_id: 'u-n' }] : [], error: null }
  }
  const filas = [F({}), F({ referencia_id: 'mu3', detalle: 'Corrección de la valorización de la orden N-0042', importe: 1000 })]
  esperas.push(S.vincularOrdenesEntre(filas).then(() => {
    chk('sin la tabla, la orden se encuentra por el código', filas[0].orden?.id === 'o1' && filas[1].orden?.id === 'o1')
  }))
}
{
  // Sin poder leer la orden (sin retiros:ver): el código sin link.
  const S = nuevo()
  S.__tablas.movimientos_entre_unidades = () => ({ data: null, error: { message: 'permiso' } })
  S.__tablas.ordenes_retiro = () => ({ data: [], error: null })
  const filas = [F({ detalle: 'Orden de retiro D-0009' })]
  esperas.push(S.vincularOrdenesEntre(filas).then(() => {
    chk('el error de la tabla no traba: queda el código', filas[0].orden?.codigo === 'D-0009' && filas[0].orden.id === null)
    const h = S.htmlOrdenEntre(filas[0])
    chk('sin link, el código en negrita', /<strong>D-0009<\/strong>/.test(h) && !/data-entre-orden=/.test(h))
  }))
  // Sin permiso en la empresa de la orden, tampoco link.
  const S2 = nuevo()
  S2.estado.misTareas = new Map([['gastos:gastos_empresa', null], ['retiros:ver', { unidades: ['u-n'] }]])
  chk('con la orden de otra empresa que no ve: sin link', !/data-entre-orden=/.test(S2.htmlOrdenEntre(F({ orden: { id: 'o9', codigo: 'D-0009', unidad: 'u-d' } }))))
  chk('una fila sin orden: nada', S2.htmlOrdenEntre(F({ detalle: 'Préstamo' })) === '')
  chk('htmlFilaEntre muestra la orden', /Orden de retiro <strong>N-0042<\/strong>/.test(S2.htmlFilaEntre({ ...F({}), _id: 'e0' }, {})))
}
{
  // El link abre la orden en SU empresa.
  const S = nuevo()
  S.estado.miRolApp = 'super_admin'
  S.estado.empresaId = 'u-d'
  S.estado.entre = S.entreVacio()
  S.estado.entre.filas = [{ ...F({}), _id: 'e0', orden: { id: 'o1', codigo: 'N-0042', unidad: 'u-n' } }]
  preparar(S)
  S.estado.clientes = null
  S.__tablas.clientes = CLIENTES
  S.__tablas.productos_terminados = CAT.productos
  S.__tablas.producto_presentaciones = CAT.presentaciones
  esperas.push(Promise.resolve(S.abrirOrdenEntre('o1')).then(() => {
    chk('el link cambia a la empresa de la orden', S.estado.empresaId === 'u-n')
    chk('y la abre', S.estado.vista === 'ad-vista-orden' && S.estado.orden?.orden?.codigo === 'N-0042')
    chk('ya marcada "Entre empresas"', /Entre empresas/.test(cuerpo(S)))
  }))
  chk('un id que no está en la lista no abre nada', S.abrirOrdenEntre('o-x') === undefined)
}

{
  // La pantalla entera: al leer los movimientos, se buscan las órdenes y se redibuja.
  const S = nuevo()
  S.estado.miRolApp = 'super_admin'
  S.__doc.getElementById('ad-entre-desde').value = '2026-10-01'
  S.__doc.getElementById('ad-entre-hasta').value = '2026-10-24'
  S.__setRpc((n) => n === 'movimientos_entre_empresas' ? { data: [F({})], error: null } : { data: [], error: null })
  S.__tablas.movimientos_entre_unidades = [{ id: 'mu1', orden_retiro_id: 'o1' }]
  S.__tablas.ordenes_retiro = [{ id: 'o1', codigo: 'N-0042', unidad_negocio_id: 'u-n' }]
  S.__tablas.listas_precios = []
  esperas.push(S.cargarEntre().then(() => new Promise(r => setTimeout(r, 30))).then(() => {
    const h = S.__els.get('ad-entre-lista').innerHTML
    chk('la lista de Entre empresas trae el link a la orden', /data-entre-orden="o1">N-0042<\/button>/.test(h), h.slice(0, 600))
    chk('y la deuda se sigue viendo con su importe', /\$\s500\.000,00/.test(h))
  }))
}

// ── XSS de lo nuevo ────────────────────────────────────────────────────────
{
  const S = nuevo()
  S.estado.empresas = [
    { id: 'u-n', nombre: marca('entrega'), prefijo: 'N' },
    { id: 'u-d', nombre: marca('recibe'), prefijo: 'D' },
  ]
  S.estado.clientes = CLIENTES
  S.estado.miRolApp = 'super_admin'
  chequearMarcas(chk, 'la deuda entre empresas', S.htmlDeudaEntre(ORDEN), ['entrega', 'recibe'])
  chequearMarcas(chk, 'el sello entre empresas', S.htmlSelloEntre(ORDEN), ['recibe'])
  chequearMarcas(chk, 'la ficha entre empresas', S.htmlFichaEntre(CLIENTES[0]), ['recibe'])
  chequearMarcas(chk, 'la orden de una deuda (link)', S.htmlOrdenEntre(F({ orden: { id: marca('id-orden'), codigo: marca('codigo'), unidad: 'u-n' } })), ['id-orden', 'codigo'])
  chequearMarcas(chk, 'la orden de una deuda (sin link)', S.htmlOrdenEntre(F({ orden: { id: null, codigo: marca('codigo2'), unidad: null } })), ['codigo2'])
}

// ── La orden interna (27/10/2026): su propia numeración, <prefijo>-I-0001 ──
{
  const S = nuevo()
  const F = (o) => ({ tipo: 'otro', detalle: 'Valorización de la orden N-I-0001', ...o })
  chk('el código de una orden interna (N-I-0001)', S.codigoOrdenEntre(F({})) === 'N-I-0001')
  chk('… y el de una anulación de una interna', S.codigoOrdenEntre(F({ detalle: 'Anulación de la orden D-I-0012: error' })) === 'D-I-0012')
  chk('la lista se ordena por fecha y código, no por numero (N-I-0001 y N-0001 llevan numero 1)',
    /\.order\('fecha', \{ ascending: false \}\)\.order\('codigo', \{ ascending: false \}\)/.test(src) && !/\.order\('numero'/.test(src))
  chk('el detalle de la cuenta saca también el código de una interna', src.includes("base.replace(/^Orden de retiro (?:N°\\s*\\d+|[A-Z]+-(?:I-)?\\d+)/, '')"))
}

fin(esperas)
