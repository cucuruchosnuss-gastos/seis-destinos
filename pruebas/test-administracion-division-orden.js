// ADMINISTRACIÓN — DIVIDIR PARA FACTURAR y la CONDICIÓN DE VENTA (21/10/2026).
//
// Cada cliente puede tener una condición de venta: un % de cada orden va a la
// PARTE A y el resto a la PARTE B; a la A se le suma APARTE una comisión (21 %
// por defecto). Se factura en ARCA, fuera de la app: la hoja da los dos
// montos y después se pegan los números de factura. La orden NO cambia.
// La base calcula todo (datos_division_orden / guardar_division_orden).
// Esta suite fija:
//  - LA FICHA: B se completa sola a partir de A (y al revés); vacío = no se
//    divide; se guarda con guardar_condicion_venta_cliente; error tal cual.
//  - LA VENTANA: prellenada con datos_division_orden; la vista previa con %
//    distintos llama a datos_division_orden SIN guardar; sin condición de
//    venta los % arrancan vacíos con el texto de la base; "Guardar e
//    imprimir" llama a guardar_division_orden y después imprime.
//  - LA HOJA: la comisión FUERA de la tabla, los totales de la base, los
//    renglones en 0 no se imprimen en esa parte, el pie con la orden.
//  - LAS FACTURAS: A, B y única; el PDF opcional (con la ruta que deja la
//    policy de Storage); los errores de la base tal cual; un doble toque
//    manda una vez.
//  - XSS de todo lo que viene de la base.
//
//   node pruebas/test-administracion-division-orden.js

const path = require('path')
const fs = require('fs')
const { construirAdministracion } = require('./sandbox-administracion')
const { arnes, marca, chequearMarcas } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/administracion.html')
const src = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${src.length} bytes)`)
const { chk, esperas, fin } = arnes()

// Storage con subida (el sandbox de siempre solo firma) y window.open.
const PRELUDIO_STORAGE = `
  var __subidas = []
  var __respuestasSubida = []
  supabase.storage = { from(b) { return {
    upload(ruta, archivo, op) { __subidas.push([b, ruta, op]); const r = __respuestasSubida.shift(); return Promise.resolve(r ?? { data: { path: ruta }, error: null }) },
    createSignedUrl(ruta, seg) { __urlsFirmadas.push([b, ruta, seg]); return Promise.resolve({ data: { signedUrl: 'https://firmada/' + ruta }, error: null }) },
  } } }
  window.__subidas = __subidas
  window.__respuestasSubida = __respuestasSubida
  window.__pestanas = []
  window.open = () => { const p = { location: { href: '' }, opener: 'yo', cerrada: false, close() { this.cerrada = true } }; window.__pestanas.push(p); return p }
`
const nuevo = () => construirAdministracion(ARCHIVO, { preludioExtra: PRELUDIO_STORAGE })

const CLIENTES = [
  { id: 'c1', nombre: 'Distribuidora Anatolia', razon_social: 'ANATOLIA SRL', cuit: '30712345678', lista_precio_id: 'l1', activo: true, pct_parte_a: 30, comision_parte_a_pct: 21 },
  { id: 'c2', nombre: 'Kiosco Pepe', razon_social: null, cuit: null, lista_precio_id: null, activo: true, pct_parte_a: null, comision_parte_a_pct: 15 },
]
const CAT = {
  productos: [{ id: 'p1', nombre: 'Cucurucho grande' }],
  presentaciones: [{ id: 'pr1', producto_id: 'p1', nombre: 'Caja x 100', con_cono: false, unidades_por_caja: 100 }],
  marcas: [], insumos: [],
}
const ORDEN = { id: 'o1', numero: 15, codigo: 'N-0015', unidad_negocio_id: 'u-n', fecha: '2026-10-20', estado: 'confirmada', estado_valorizacion: 'valorizada',
  total: 12140, moneda: 'ARS', cliente_id: 'c1', cargada_por: 'emp-9', cargada_en: '2026-10-20T17:32:00Z', transporte: null, observaciones: null,
  comision_modo: null, comision_valor: null, comision_importe: null, comision_factura_id: null, division_pct_a: null, division_comision_pct: null }
const ITEMS = [{ id: 'i1', orden: 1, presentacion_id: 'pr1', marca_id: null, cajas: 10, unidades: 1000, precio_caja: 1000, subtotal: 10000, lote: null }]

// Lo que devuelve datos_division_orden con 30 % / comisión 21 %: la harina
// (2 kg) y el renglón de 1 caja no llegan a la A (floor de la base).
const DATOS = {
  orden_id: 'o1', codigo: 'N-0015', fecha: '2026-10-20', cliente: 'Distribuidora Anatolia', cliente_cuit: '30712345678',
  pct_a: 30, pct_b: 70, comision_pct: 21,
  items: [
    { orden: 1, descripcion: 'Cucurucho grande · Caja x 100', unidad: 'cajas', precio: 1000, cantidad: 10, cant_a: 3, cant_b: 7, subtotal_a: 3000, subtotal_b: 7000 },
    { orden: 2, descripcion: 'Harina 000 Morixe', unidad: 'kg', precio: 820, cantidad: 2, cant_a: 0, cant_b: 2, subtotal_a: 0, subtotal_b: 1640 },
    { orden: 3, descripcion: 'Conito chico · Caja x 50', unidad: 'cajas', precio: 500, cantidad: 1, cant_a: 0, cant_b: 1, subtotal_a: 0, subtotal_b: 500 },
  ],
  subtotal_a: 3000, comision_a: 630, total_a: 3630, subtotal_b: 9140, total_b: 9140, total_orden: 12140, guardada: false, facturas: [],
}

function preparar(S, { orden = ORDEN, items = ITEMS, clientes = CLIENTES } = {}) {
  S.estado.clientes = clientes
  S.estado.catalogo = CAT
  S.estado.catalogoEmpresa = 'u-n'
  // Una copia por sandbox: guardar la división escribe en la orden abierta.
  S.__tablas.ordenes_retiro = [{ ...orden }]
  S.__tablas.orden_retiro_items = items
  S.__tablas.v_empleados_publico = [{ id: 'emp-9', nombre: 'Emanuel Romero' }]
}
const el = (S, id) => S.__doc.getElementById(id)
const cuerpo = (S) => el(S, 'ad-orden-cuerpo').innerHTML
const rpcs = (S, nombre) => S.__llamadas.rpc.filter(r => r[0] === nombre)
// Retiene TODAS las rpc hasta soltar(): si se guardara solo la última, una
// segunda llamada (la que prueba el doble toque) dejaría la primera colgada,
// y node terminaría sin afirmar nada (con código 0).
function retener(S, data = null) {
  const pendientes = []
  S.__setRpc(() => new Promise(r => pendientes.push(() => r({ data, error: null }))))
  return () => pendientes.forEach(f => f())
}
// La parte de un HTML entre dos marcas (para "la comisión NO está en la tabla").
const entre = (h, a, b) => { const i = h.indexOf(a); const j = h.indexOf(b, i + 1); return i === -1 || j === -1 ? '' : h.slice(i, j) }

// ── Los % : el otro se completa con la diferencia a 100 ─────────────────────
{
  const S = nuevo()
  chk('30 → 70', S.complementoPct(30) === 70)
  chk('33,33 → 66,67', S.complementoPct(33.33) === 66.67)
  chk('66,6 → 33,4 y 99,9 → 0,1 (sin error de coma flotante)', S.complementoPct(66.6) === 33.4 && S.complementoPct(99.9) === 0.1)
  chk('0 → 100 y 100 → 0', S.complementoPct(0) === 100 && S.complementoPct(100) === 0)
  chk('vacío → vacío (la orden no se divide)', S.complementoPct(null) === null && S.complementoPct('') === null && S.complementoPct(undefined) === null)
  chk('fuera de 0 a 100 → vacío', S.complementoPct(101) === null && S.complementoPct(-1) === null)
  chk('el % se escribe sin ceros de más', S.textoPct(30) === '30' && S.textoPct(33.5) === '33,5' && S.textoPct(21) === '21')
}

// ── Las reglas, con los textos de la base ──────────────────────────────────
{
  const S = nuevo()
  chk('condición: A vacío se puede (no se divide)', S.validarCondicionVenta(null, 21) === null)
  chk('condición: A fuera de rango, el texto de la base', S.validarCondicionVenta(101, 21) === 'El % de la parte A va de 0 a 100.')
  chk('condición: sin comisión, el texto de la base', S.validarCondicionVenta(30, null) === 'La comisión va de 0 a 100.')
  chk('condición: comisión fuera de rango', S.validarCondicionVenta(30, 100.5) === 'La comisión va de 0 a 100.')
  chk('condición: 0 y 100 sirven', S.validarCondicionVenta(0, 0) === null && S.validarCondicionVenta(100, 100) === null)
  chk('división: el % de la A es obligatorio', S.validarDivision(null, 21) === 'El % de la parte A va de 0 a 100.')
  chk('división: lo que sirve no tiene error', S.validarDivision(30, 21) === null)
  chk('los parámetros de la división', JSON.stringify(S.parametrosDivision('o1', 30, 21)) === JSON.stringify({ p_orden_id: 'o1', p_pct_a: 30, p_comision_pct: 21 }))
  chk('sin % los parámetros van en null (los decide la base)', JSON.stringify(S.parametrosDivision('o1')) === JSON.stringify({ p_orden_id: 'o1', p_pct_a: null, p_comision_pct: null }))
  chk('número de factura: de 3 a 40 letras, con el texto de la base',
    S.validarNumeroFactura('ab') === 'Pegá el número de la factura de ARCA.' && S.validarNumeroFactura('x'.repeat(41)) === 'Pegá el número de la factura de ARCA.' &&
    S.validarNumeroFactura('  ') === 'Pegá el número de la factura de ARCA.' && S.validarNumeroFactura('0003-00001234') === null && S.validarNumeroFactura('abc') === null)
  chk('el PDF es opcional', S.validarPdfFactura(null) === null)
  chk('un PDF sirve (por tipo o por nombre)', S.validarPdfFactura({ name: 'f.pdf', type: '' }) === null && S.validarPdfFactura({ name: 'factura', type: 'application/pdf' }) === null)
  chk('una foto no es un PDF', S.validarPdfFactura({ name: 'f.jpg', type: 'image/jpeg' }) === 'El archivo tiene que ser un PDF.')
}

// ── Las partes y los rótulos ────────────────────────────────────────────────
{
  const S = nuevo()
  chk('los rótulos', S.rotuloParte('N-0015', 'A') === 'N-0015-A' && S.rotuloParte('N-0015', 'B') === 'N-0015-B' && S.rotuloParte('N-0015', 'UNICA') === 'Factura única')
  chk('se divide con la división guardada en la orden', S.seDivideOrden({ division_pct_a: 40 }, CLIENTES[1]) === true)
  chk('se divide con la condición del cliente', S.seDivideOrden({ division_pct_a: null }, CLIENTES[0]) === true)
  chk('un 0 % también es una división', S.seDivideOrden({ division_pct_a: 0 }, null) === true)
  chk('sin nada, no se divide', S.seDivideOrden({ division_pct_a: null }, CLIENTES[1]) === false && S.seDivideOrden({}, null) === false)
  chk('dividida: A y B', JSON.stringify(S.partesFacturaOrden(true, {})) === '["A","B"]')
  chk('sin dividir: la única', JSON.stringify(S.partesFacturaOrden(false, {})) === '["UNICA"]')
  chk('una única ya cargada no se esconde al dividir', JSON.stringify(S.partesFacturaOrden(true, { UNICA: { numero: '1-2' } })) === '["A","B","UNICA"]')
  const f = S.facturasPorParte([{ parte: 'A', numero: '0003-1', archivo_url: 'r.pdf' }, { parte: 'B', numero: '0003-2' }])
  chk('las facturas por parte', f.A.numero === '0003-1' && f.A.archivo_url === 'r.pdf' && f.B.archivo_url === null && !f.UNICA)
  chk('sin facturas, vacío', JSON.stringify(S.facturasPorParte(null)) === '{}')
  chk('la cantidad: cajas o la unidad del insumo', S.cantidadDivision(3, 'cajas') === '3 cajas' && S.cantidadDivision(1, 'cajas') === '1 caja' && S.cantidadDivision(25.5, 'kg') === '25,5 kg')
  chk('la ruta del PDF va en la carpeta del usuario (la policy del bucket)',
    S.rutaPdfFactura('uid-1', 'u-n', '2026-10-20', 'N-0015', 'A') === 'uid-1/facturas-venta/u-n/2026/N-0015-A.pdf', S.rutaPdfFactura('uid-1', 'u-n', '2026-10-20', 'N-0015', 'A'))
}

// ── La hoja ─────────────────────────────────────────────────────────────────
{
  const S = nuevo()
  const ra = S.renglonesParte(DATOS, 'A')
  const rb = S.renglonesParte(DATOS, 'B')
  chk('la A tiene SOLO los renglones con algo en la A', ra.length === 1 && ra[0].cantidad === 3 && ra[0].subtotal === 3000)
  chk('la B tiene los tres', rb.length === 3 && rb[1].cantidad === 2 && rb[1].subtotal === 1640)
  const h = S.htmlHojaDivision(DATOS, S.facturasPorParte([{ parte: 'A', numero: '0003-00001234' }]))
  const a = entre(h, 'data-parte="A"', 'data-parte="B"')
  const b = entre(h, 'data-parte="B"', 'ad-dvh__pie')
  chk('dos bloques: N-0015-A y N-0015-B', /N-0015-A/.test(a) && /N-0015-B/.test(b))
  chk('cliente y CUIT, fecha y el % de la parte', /Distribuidora Anatolia · CUIT 30712345678/.test(a) && /Fecha 20\/10\/2026 · Parte A: 30 %/.test(a) && /Parte B: 70 %/.test(b))
  chk('la tabla: Producto, Cantidad, Precio, Subtotal', /<th>Producto<\/th><th class="ad-dvh__num">Cantidad<\/th><th class="ad-dvh__num">Precio<\/th><th class="ad-dvh__num">Subtotal<\/th>/.test(a))
  chk('el renglón de la A: 3 cajas, $ 1.000,00, $ 3.000,00', /3 cajas<\/td><td[^>]*>\$\s1\.000,00<\/td><td[^>]*>\$\s3\.000,00/.test(a))
  chk('los renglones en 0 no se imprimen en la A', !/Harina/.test(a) && !/Conito chico/.test(a))
  chk('pero sí en la B', /Harina 000 Morixe/.test(b) && /2 kg/.test(b) && /Conito chico/.test(b) && /1 caja</.test(b))
  const tablaA = entre(a, '<table', '</table>')
  chk('la comisión NO es un renglón de la tabla', tablaA && !/Comisión/.test(tablaA) && !/Total productos/.test(tablaA))
  chk('debajo de la tabla: Total productos, Comisión 21% y TOTAL de la base',
    /Total productos: \$\s3\.000,00/.test(a) && /Comisión 21%: \$\s630,00/.test(a) && /TOTAL: \$\s3\.630,00/.test(a) &&
    a.indexOf('</table>') < a.indexOf('Total productos'))
  chk('la B: solo el TOTAL, sin comisión', /TOTAL: \$\s9\.140,00/.test(b) && !/Comisión/.test(b) && !/Total productos/.test(b))
  chk('el pie chico: la orden y su total', /Orden N-0015 · total de la orden \$\s12\.140,00/.test(h))
  chk('el número de ARCA guardado sale al lado de N-0015-A', /N-0015-A <span class="ad-dvh__factura">· Factura 0003-00001234/.test(a))
  chk('la B sin factura no inventa un número', !/Factura/.test(entre(b, '<h2', '</h2>')))
  const vacia = S.htmlBloqueParte({ ...DATOS, items: [DATOS.items[1]] }, 'A', null)
  chk('una parte sin renglones lo dice', /Sin productos en esta parte/.test(vacia))
  chk('otra comisión se escribe con su %', /Comisión 15,5%: /.test(S.htmlBloqueParte({ ...DATOS, comision_pct: 15.5 }, 'A', null)))
  const usd = S.htmlHojaDivision(DATOS, {}, 'USD')
  chk('una orden en dólares dice US$', /TOTAL: US\$\s3\.630,00/.test(usd))
}

// ── La ficha: la condición de venta ─────────────────────────────────────────
function prepararFicha(S, cliente = { id: 'c1', nombre: 'Anatolia', pct_parte_a: 30, comision_parte_a_pct: 21 }) {
  S.estado.ficha = { id: cliente.id, original: cliente, condicion: { error: null, enviando: false } }
  S.llenarCondicionVenta(cliente)
}
{
  const S = nuevo()
  prepararFicha(S)
  chk('al abrir: A, B y la comisión', el(S, 'ad-f-pct-a').value === '30' && el(S, 'ad-f-pct-b').value === '70' && el(S, 'ad-f-comision-a').value === '21')
  el(S, 'ad-f-pct-a').value = '25,5'
  S.completarOtroPct('ad-f-pct-a', 'ad-f-pct-b')
  chk('escribir A completa B con la diferencia a 100', el(S, 'ad-f-pct-b').value === '74,50', el(S, 'ad-f-pct-b').value)
  el(S, 'ad-f-pct-b').value = '60'
  S.completarOtroPct('ad-f-pct-b', 'ad-f-pct-a')
  chk('escribir B completa A', el(S, 'ad-f-pct-a').value === '40')
  el(S, 'ad-f-pct-a').value = ''
  S.completarOtroPct('ad-f-pct-a', 'ad-f-pct-b')
  chk('vaciar A vacía B (no se divide)', el(S, 'ad-f-pct-b').value === '')
  const S2 = nuevo()
  prepararFicha(S2, { id: 'c2', nombre: 'Pepe', pct_parte_a: null, comision_parte_a_pct: null })
  chk('sin condición: A y B vacíos, la comisión en 21', el(S2, 'ad-f-pct-a').value === '' && el(S2, 'ad-f-pct-b').value === '' && el(S2, 'ad-f-comision-a').value === '21')
  chk('los campos son de texto (número argentino)', el(S2, 'ad-f-pct-a').type === 'text' && el(S2, 'ad-f-comision-a').type === 'text')
}
{
  const S = nuevo()
  prepararFicha(S)
  S.estado.clientes = CLIENTES
  el(S, 'ad-f-pct-a').value = '40'
  esperas.push(S.guardarCondicionVenta().then(() => {
    const r = rpcs(S, 'guardar_condicion_venta_cliente')
    chk('guarda con guardar_condicion_venta_cliente', r.length === 1 && JSON.stringify(r[0][1]) === JSON.stringify({ p_cliente_id: 'c1', p_pct_a: 40, p_comision_pct: 21 }), JSON.stringify(r))
    chk('no toca guardar_ficha_cliente', !rpcs(S, 'guardar_ficha_cliente').length)
    chk('dice lo que guardó', S.__llamadas.exitos.some(m => /parte A 40 % · parte B 60 % · comisión 21 %/.test(m)), JSON.stringify(S.__llamadas.exitos))
    chk('la lista de clientes se relee (la orden usa la condición)', S.estado.clientes === null)
  }))
}
{
  const S = nuevo()
  prepararFicha(S)
  el(S, 'ad-f-pct-a').value = ''
  esperas.push(S.guardarCondicionVenta().then(() => {
    const r = rpcs(S, 'guardar_condicion_venta_cliente')
    chk('A vacío manda null (sus órdenes no se dividen)', r.length === 1 && r[0][1].p_pct_a === null)
    chk('y lo dice', S.__llamadas.exitos.some(m => /no se dividen/.test(m)))
  }))
}
{
  const S = nuevo()
  prepararFicha(S)
  el(S, 'ad-f-comision-a').value = ''
  esperas.push(S.guardarCondicionVenta().then(() => {
    chk('sin comisión no llama a la base', !rpcs(S, 'guardar_condicion_venta_cliente').length)
    chk('y lo dice pegado al botón', el(S, 'ad-f-condicion-error').textContent === 'La comisión va de 0 a 100.' && el(S, 'ad-f-condicion-error').hidden === false)
  }))
}
{
  const S = nuevo()
  prepararFicha(S)
  S.__setRpc(async () => ({ data: null, error: { message: 'No tenés permiso sobre este cliente.' } }))
  esperas.push(S.guardarCondicionVenta().then(() => {
    chk('el error de la base TAL CUAL, pegado', el(S, 'ad-f-condicion-error').textContent === 'No tenés permiso sobre este cliente.')
    chk('y el botón se destraba', el(S, 'ad-f-condicion-guardar').disabled === false)
  }))
}
{
  const S = nuevo()
  prepararFicha(S)
  const soltar = retener(S)
  const p1 = S.guardarCondicionVenta()
  const p2 = S.guardarCondicionVenta()
  chk('mientras guarda, el botón dice Guardando…', el(S, 'ad-f-condicion-guardar').disabled === true && /Guardando/.test(el(S, 'ad-f-condicion-guardar').textContent))
  soltar()
  esperas.push(Promise.all([p1, p2]).then(() => chk('un doble toque manda UNA vez', rpcs(S, 'guardar_condicion_venta_cliente').length === 1)))
}
{
  const S = nuevo()
  preparar(S)
  S.__tablas.clientes = [{ id: 'c1', nombre: 'Anatolia', pct_parte_a: 30, comision_parte_a_pct: 18, unidad_negocio_id: 'u-n' }]
  esperas.push(S.abrirFicha('c1').then(() => {
    const q = S.__llamadas.consultas.find(c => c[0] === 'clientes' && c[1].some(x => x[0] === 'select' && /plazo_pago_dias/.test(x[1])))
    chk('la ficha lee la condición de venta', !!q && q[1].some(x => x[0] === 'select' && /pct_parte_a/.test(x[1]) && /comision_parte_a_pct/.test(x[1])))
    chk('y la muestra al abrir', el(S, 'ad-f-pct-a').value === '30' && el(S, 'ad-f-pct-b').value === '70' && el(S, 'ad-f-comision-a').value === '18')
  }))
}

// ── El detalle de la orden ─────────────────────────────────────────────────
{
  const S = nuevo()
  preparar(S)
  esperas.push(S.abrirOrden('o1').then(() => {
    const h = cuerpo(S)
    chk('el select de la orden trae la división', S.__llamadas.consultas.some(c => c[0] === 'ordenes_retiro' && c[1].some(x => x[0] === 'select' && /division_pct_a/.test(x[1]) && /division_comision_pct/.test(x[1]))))
    chk('se leen las facturas de la orden', S.__llamadas.consultas.some(c => c[0] === 'orden_facturas' && c[1].some(x => x[0] === 'eq' && x[1] === 'orden_retiro_id' && x[2] === 'o1')))
    chk('el bloque "Facturas de ARCA"', /Facturas de ARCA/.test(h))
    chk('con la condición del cliente, todavía sin guardar', /Su condición de venta: parte A 30 % · parte B 70 %/.test(h))
    chk('N-0015-A y N-0015-B sin factura', /N-0015-A<\/span><span class="ad-texto-suave">sin factura cargada/.test(h) && /N-0015-B/.test(h))
    chk('con retiros:precios: "Dividir para facturar"', el(S, 'ad-btn-dividir').hidden === false)
  }))
}
{
  const S = nuevo()
  preparar(S, { orden: { ...ORDEN, division_pct_a: 40, division_comision_pct: 10 } })
  S.__tablas.orden_facturas = [{ parte: 'A', numero_factura: '0003-00001234', archivo_url: null }]
  esperas.push(S.abrirOrden('o1').then(() => {
    const h = cuerpo(S)
    chk('dividida: los % guardados en la orden', /Dividida para facturar: parte A 40 % \(más la comisión de 10 %\) · parte B 60 %/.test(h))
    chk('el número guardado al lado de N-0015-A', /N-0015-A<\/span><span class="ad-facturas-orden__numero">Factura 0003-00001234/.test(h))
  }))
}
{
  const S = nuevo()
  preparar(S, { orden: { ...ORDEN, cliente_id: 'c2' } })
  esperas.push(S.abrirOrden('o1').then(() => {
    const h = cuerpo(S)
    chk('sin condición: factura única', /No se divide: va en una factura única/.test(h) && /Factura única/.test(h) && !/N-0015-A/.test(h))
  }))
}
{
  const S = nuevo()
  preparar(S)
  S.estado.misTareas = new Map([['retiros:ver', { unidades: ['u-n'] }]])
  esperas.push(S.abrirOrden('o1').then(() => {
    chk('solo con ver: se ven las facturas pero no el botón', /Facturas de ARCA/.test(cuerpo(S)) && el(S, 'ad-btn-dividir').hidden === true)
  }))
}
{
  const S = nuevo()
  preparar(S)
  S.estado.misTareas = new Map([['retiros:ver', { todas: true }], ['retiros:precios', { unidades: ['u-d'] }]])
  esperas.push(S.abrirOrden('o1').then(() => chk('con precios en OTRA empresa, no', el(S, 'ad-btn-dividir').hidden === true)))
}
{
  const S = nuevo()
  preparar(S, { orden: { ...ORDEN, estado_valorizacion: 'pendiente', total: null } })
  esperas.push(S.abrirOrden('o1').then(() => {
    chk('sin valorizar: ni botón ni bloque', el(S, 'ad-btn-dividir').hidden === true && !/Facturas de ARCA/.test(cuerpo(S)))
    chk('y no lee facturas', !S.__llamadas.consultas.some(c => c[0] === 'orden_facturas'))
  }))
}
{
  const S = nuevo()
  preparar(S, { orden: { ...ORDEN, estado: 'anulada', anulada_motivo: 'error' } })
  esperas.push(S.abrirOrden('o1').then(() => chk('anulada: ni botón ni bloque', el(S, 'ad-btn-dividir').hidden === true && !/Facturas de ARCA/.test(cuerpo(S)))))
}
{
  const S = nuevo()
  preparar(S)
  S.__tablas.orden_facturas = () => ({ data: null, error: { message: 'permission denied' } })
  esperas.push(S.abrirOrden('o1').then(() => {
    chk('si no se pueden leer las facturas, lo dice (no "sin factura")', /No se pudieron leer las facturas/.test(cuerpo(S)) && !/sin factura cargada/.test(cuerpo(S)))
    chk('y la orden se ve igual', /Cucurucho grande/.test(cuerpo(S)))
  }))
}

// ── La ventana ──────────────────────────────────────────────────────────────
async function abrirVentana(S, { rpc } = {}) {
  S.__setRpc(rpc ?? (async (nombre, p) => {
    if (nombre === 'datos_division_orden' || nombre === 'guardar_division_orden') {
      const pct = p.p_pct_a ?? 30
      return { data: { ...DATOS, pct_a: pct, pct_b: 100 - pct, comision_pct: p.p_comision_pct ?? 21, guardada: nombre === 'guardar_division_orden' }, error: null }
    }
    return { data: null, error: null }
  }))
  await S.abrirOrden('o1')
  await S.abrirDivision()
}
{
  const S = nuevo()
  preparar(S)
  esperas.push(abrirVentana(S).then(() => {
    const r = rpcs(S, 'datos_division_orden')
    chk('al abrir pide datos_division_orden sin %', r.length === 1 && JSON.stringify(r[0][1]) === JSON.stringify({ p_orden_id: 'o1', p_pct_a: null, p_comision_pct: null }))
    chk('la ventana se ve', el(S, 'ad-dv').hidden === false)
    chk('prellenada con lo de la base', el(S, 'ad-dv-pct-a').value === '30' && el(S, 'ad-dv-pct-b').value === '70' && el(S, 'ad-dv-comision').value === '21')
    chk('con la vista previa de la hoja', /N-0015-A/.test(el(S, 'ad-dv-vista').innerHTML) && /TOTAL: \$\s3\.630,00/.test(el(S, 'ad-dv-vista').innerHTML))
    chk('con las facturas A y B para cargar', /data-dv-parte="A"/.test(el(S, 'ad-dv-facturas').innerHTML) && /data-dv-parte="B"/.test(el(S, 'ad-dv-facturas').innerHTML) && !/data-dv-parte="UNICA"/.test(el(S, 'ad-dv-facturas').innerHTML))
  }))
}
{
  const S = nuevo()
  preparar(S)
  esperas.push(abrirVentana(S).then(async () => {
    el(S, 'ad-dv-pct-a').value = '40'
    S.cambiarPctDivision('a')
    chk('escribir A completa B', el(S, 'ad-dv-pct-b').value === '60')
    chk('la vista previa espera a que se deje de escribir', rpcs(S, 'datos_division_orden').length === 1)
    await S.pedirVistaDivision()
    const r = rpcs(S, 'datos_division_orden')
    chk('la vista previa pide datos_division_orden con los % nuevos', r.length === 2 && JSON.stringify(r[1][1]) === JSON.stringify({ p_orden_id: 'o1', p_pct_a: 40, p_comision_pct: 21 }))
    chk('y NO guarda', !rpcs(S, 'guardar_division_orden').length)
    chk('la vista previa muestra los % nuevos', /Parte A: 40 %/.test(el(S, 'ad-dv-vista').innerHTML))
    el(S, 'ad-dv-pct-b').value = '55'
    S.cambiarPctDivision('b')
    chk('escribir B completa A', el(S, 'ad-dv-pct-a').value === '45')
    el(S, 'ad-dv-comision').value = '10'
    S.cambiarPctDivision('comision')
    chk('la comisión no toca los %', el(S, 'ad-dv-pct-a').value === '45' && el(S, 'ad-dv-pct-b').value === '55')
    await S.pedirVistaDivision()
    chk('la vista previa manda la comisión nueva', JSON.stringify(rpcs(S, 'datos_division_orden')[2][1]) === JSON.stringify({ p_orden_id: 'o1', p_pct_a: 45, p_comision_pct: 10 }))
    el(S, 'ad-dv-pct-a').value = ''
    S.cambiarPctDivision('a')
    await S.pedirVistaDivision()
    chk('A vacío: no llama y pide el %', rpcs(S, 'datos_division_orden').length === 3 && /Poné el % de la parte A/.test(el(S, 'ad-dv-aviso').innerHTML))
  }))
}
{
  // Una respuesta vieja no pisa a una más nueva.
  const S = nuevo()
  preparar(S)
  esperas.push(abrirVentana(S).then(async () => {
    const pendientes = []
    S.__setRpc((nombre, p) => new Promise(r => pendientes.push(() => r({ data: { ...DATOS, pct_a: p.p_pct_a, pct_b: 100 - p.p_pct_a }, error: null }))))
    el(S, 'ad-dv-pct-a').value = '40'
    const v1 = S.pedirVistaDivision()
    el(S, 'ad-dv-pct-a').value = '50'
    const v2 = S.pedirVistaDivision()
    pendientes[1]()
    await v2
    pendientes[0]()
    await v1
    chk('la respuesta vieja (40 %) no pisa la nueva (50 %)', /Parte A: 50 %/.test(el(S, 'ad-dv-vista').innerHTML) && !/Parte A: 40 %/.test(el(S, 'ad-dv-vista').innerHTML))
  }))
}
{
  const S = nuevo()
  preparar(S, { orden: { ...ORDEN, cliente_id: 'c2' } })
  esperas.push(abrirVentana(S, { rpc: async (nombre) => nombre === 'datos_division_orden'
    ? { data: null, error: { message: 'Este cliente no tiene condición de venta: poné el % de la parte A.' } }
    : { data: null, error: null } }).then(() => {
    chk('sin condición: el texto de la base tal cual', /Este cliente no tiene condición de venta: poné el % de la parte A\./.test(el(S, 'ad-dv-aviso').innerHTML))
    chk('los % arrancan vacíos', el(S, 'ad-dv-pct-a').value === '' && el(S, 'ad-dv-pct-b').value === '')
    chk('la comisión, la del cliente', el(S, 'ad-dv-comision').value === '15')
    chk('sin vista previa inventada', el(S, 'ad-dv-vista').innerHTML === '')
    chk('y se puede cargar la factura única', /data-dv-parte="UNICA"/.test(el(S, 'ad-dv-facturas').innerHTML) && !/data-dv-parte="A"/.test(el(S, 'ad-dv-facturas').innerHTML))
  }))
}
{
  const S = nuevo()
  preparar(S)
  esperas.push(abrirVentana(S).then(async () => {
    el(S, 'ad-dv-pct-a').value = '35'
    el(S, 'ad-dv-comision').value = '21'
    await S.guardarEImprimirDivision()
    const r = rpcs(S, 'guardar_division_orden')
    chk('"Guardar e imprimir" llama a guardar_division_orden', r.length === 1 && JSON.stringify(r[0][1]) === JSON.stringify({ p_orden_id: 'o1', p_pct_a: 35, p_comision_pct: 21 }), JSON.stringify(r))
    chk('y DESPUÉS imprime', S.__impresiones() === 1)
    const hoja = el(S, 'ad-impresion').innerHTML
    chk('la hoja: A4 vertical', /@page \{ size: A4 portrait/.test(hoja))
    chk('la hoja: los dos bloques con lo que devolvió la base', /N-0015-A/.test(hoja) && /N-0015-B/.test(hoja) && /Parte A: 35 %/.test(hoja))
    chk('la orden abierta se entera de la división', S.estado.orden.orden.division_pct_a === 35 && /Dividida para facturar: parte A 35 %/.test(cuerpo(S)))
  }))
}
{
  const S = nuevo()
  preparar(S)
  esperas.push(abrirVentana(S).then(async () => {
    S.__setRpc(async () => ({ data: null, error: { message: 'Primero hay que valorizar la orden.' } }))
    await S.guardarEImprimirDivision()
    chk('el error de la base TAL CUAL, pegado al botón', el(S, 'ad-dv-error').textContent === 'Primero hay que valorizar la orden.' && el(S, 'ad-dv-error').hidden === false)
    chk('con error no imprime', S.__impresiones() === 0)
    chk('y el botón se destraba', el(S, 'ad-dv-guardar').disabled === false)
  }))
}
{
  const S = nuevo()
  preparar(S)
  esperas.push(abrirVentana(S).then(async () => {
    el(S, 'ad-dv-pct-a').value = ''
    await S.guardarEImprimirDivision()
    chk('sin % de la A no llama y lo dice con el texto de la base', !rpcs(S, 'guardar_division_orden').length && el(S, 'ad-dv-error').textContent === 'El % de la parte A va de 0 a 100.')
  }))
}
{
  const S = nuevo()
  preparar(S)
  esperas.push(abrirVentana(S).then(async () => {
    const soltar = retener(S, DATOS)
    const p1 = S.guardarEImprimirDivision()
    const p2 = S.guardarEImprimirDivision()
    chk('mientras guarda: "Guardando…" trabado', el(S, 'ad-dv-guardar').disabled === true && el(S, 'ad-dv-guardar').textContent === 'Guardando…')
    soltar()
    await Promise.all([p1, p2])
    chk('un doble toque guarda e imprime UNA vez', rpcs(S, 'guardar_division_orden').length === 1 && S.__impresiones() === 1)
  }))
}
{
  const S = nuevo()
  preparar(S)
  esperas.push(abrirVentana(S).then(() => {
    S.cerrarDivision()
    chk('cerrar esconde la ventana', el(S, 'ad-dv').hidden === true && S.estado.division === null)
  }))
}
{
  const S = nuevo()
  preparar(S)
  S.estado.misTareas = new Map([['retiros:ver', { unidades: ['u-n'] }]])
  esperas.push(S.abrirOrden('o1').then(async () => {
    await S.abrirDivision()
    chk('sin retiros:precios la ventana no abre', !S.estado.division && !rpcs(S, 'datos_division_orden').length)
  }))
}

// ── Las facturas de ARCA ───────────────────────────────────────────────────
{
  const S = nuevo()
  preparar(S)
  esperas.push(abrirVentana(S).then(async () => {
    el(S, 'ad-dv-numero-a').value = '  0003-00001234 '
    await S.guardarFacturaDivision('A')
    const r = rpcs(S, 'guardar_factura_orden')
    chk('la factura A: guardar_factura_orden sin PDF', r.length === 1 && JSON.stringify(r[0][1]) === JSON.stringify({ p_orden_id: 'o1', p_parte: 'A', p_numero: '0003-00001234', p_archivo_url: null }), JSON.stringify(r))
    chk('no sube nada', S.__win.__subidas.length === 0)
    chk('se ve al lado de N-0015-A en la ventana', /Factura 0003-00001234/.test(el(S, 'ad-dv-facturas').innerHTML))
    chk('y en la orden', /N-0015-A<\/span><span class="ad-facturas-orden__numero">Factura 0003-00001234/.test(cuerpo(S)))
    chk('y en la vista previa de la hoja', /N-0015-A <span class="ad-dvh__factura">· Factura 0003-00001234/.test(el(S, 'ad-dv-vista').innerHTML))
    chk('lo dice', S.__llamadas.exitos.some(m => m === 'N-0015-A: se guardó la factura 0003-00001234.'))
  }))
}
{
  const S = nuevo()
  preparar(S)
  esperas.push(abrirVentana(S).then(async () => {
    el(S, 'ad-dv-numero-b').value = '0003-00001235'
    el(S, 'ad-dv-pdf-b').files = [{ name: 'factura.pdf', type: 'application/pdf' }]
    await S.guardarFacturaDivision('B')
    const sub = S.__win.__subidas
    chk('el PDF de la B se sube al bucket comprobantes, en la carpeta del usuario',
      sub.length === 1 && sub[0][0] === 'comprobantes' && sub[0][1] === 'uid-1/facturas-venta/u-n/2026/N-0015-B.pdf' && sub[0][2].upsert === false, JSON.stringify(sub))
    const r = rpcs(S, 'guardar_factura_orden')
    chk('y la ruta va a guardar_factura_orden', r.length === 1 && r[0][1].p_parte === 'B' && r[0][1].p_archivo_url === 'uid-1/facturas-venta/u-n/2026/N-0015-B.pdf')
    chk('después ofrece verlo', /data-dv-ver-pdf="B"/.test(el(S, 'ad-dv-facturas').innerHTML))
    await S.verPdfFactura('B')
    chk('ver el PDF lo firma por 5 minutos', S.__urlsFirmadas().some(u => u[0] === 'comprobantes' && u[1] === 'uid-1/facturas-venta/u-n/2026/N-0015-B.pdf' && u[2] === 300))
    chk('y lo abre en otra pestaña, sin opener', S.__win.__pestanas[0].location.href === 'https://firmada/uid-1/facturas-venta/u-n/2026/N-0015-B.pdf' && S.__win.__pestanas[0].opener === null)
  }))
}
{
  const S = nuevo()
  preparar(S)
  esperas.push(abrirVentana(S).then(async () => {
    S.__win.__respuestasSubida.push({ data: null, error: { message: 'The resource already exists', statusCode: '409' } })
    el(S, 'ad-dv-numero-a').value = '0003-00009999'
    el(S, 'ad-dv-pdf-a').files = [{ name: 'nueva.pdf', type: 'application/pdf' }]
    await S.guardarFacturaDivision('A')
    const sub = S.__win.__subidas
    chk('un PDF que ya existe va con otro nombre (Storage no pisa)', sub.length === 2 && /^uid-1\/facturas-venta\/u-n\/2026\/N-0015-A-\d+\.pdf$/.test(sub[1][1]), JSON.stringify(sub))
    chk('y esa ruta es la que se guarda', rpcs(S, 'guardar_factura_orden')[0][1].p_archivo_url === sub[1][1])
  }))
}
{
  const S = nuevo()
  preparar(S)
  esperas.push(abrirVentana(S).then(async () => {
    S.__win.__respuestasSubida.push({ data: null, error: { message: 'new row violates row-level security policy' } })
    el(S, 'ad-dv-numero-a').value = '0003-00009999'
    el(S, 'ad-dv-pdf-a').files = [{ name: 'f.pdf', type: 'application/pdf' }]
    await S.guardarFacturaDivision('A')
    chk('si el PDF no sube, no se guarda el número y se dice', !rpcs(S, 'guardar_factura_orden').length &&
      S.estado.division.cargas.A.error === 'No se pudo subir el PDF: new row violates row-level security policy')
  }))
}
{
  const S = nuevo()
  preparar(S)
  esperas.push(abrirVentana(S).then(async () => {
    el(S, 'ad-dv-numero-a').value = '12'
    await S.guardarFacturaDivision('A')
    chk('un número corto no llama a la base', !rpcs(S, 'guardar_factura_orden').length && S.estado.division.cargas.A.error === 'Pegá el número de la factura de ARCA.')
    el(S, 'ad-dv-numero-a').value = '0003-1'
    el(S, 'ad-dv-pdf-a').files = [{ name: 'foto.jpg', type: 'image/jpeg' }]
    await S.guardarFacturaDivision('A')
    chk('una foto en vez de PDF no se sube', !S.__win.__subidas.length && S.estado.division.cargas.A.error === 'El archivo tiene que ser un PDF.')
    el(S, 'ad-dv-pdf-a').files = []
    S.__setRpc(async () => ({ data: null, error: { message: 'No tenés permiso sobre esta orden.' } }))
    await S.guardarFacturaDivision('A')
    chk('el error de la base TAL CUAL', S.estado.division.cargas.A.error === 'No tenés permiso sobre esta orden.' && S.estado.division.cargas.A.enviando === false)
    chk('el error sale en la parte', /No tenés permiso sobre esta orden\./.test(S.htmlFacturaDivision(S.estado.division, 'A')))
    el(S, 'ad-dv-numero-unica').value = '0003-00000077'
    await S.guardarFacturaDivision('UNICA')
    chk('una orden dividida no carga la única', rpcs(S, 'guardar_factura_orden').length === 1)
  }))
}
{
  const S = nuevo()
  preparar(S)
  esperas.push(abrirVentana(S).then(async () => {
    const soltar = retener(S)
    el(S, 'ad-dv-numero-a').value = '0003-00001234'
    const p1 = S.guardarFacturaDivision('A')
    const p2 = S.guardarFacturaDivision('A')
    soltar()
    await Promise.all([p1, p2])
    chk('un doble toque en una factura manda UNA vez', rpcs(S, 'guardar_factura_orden').length === 1)
  }))
}
{
  const S = nuevo()
  preparar(S, { orden: { ...ORDEN, cliente_id: 'c2' } })
  esperas.push(abrirVentana(S, { rpc: async (nombre) => nombre === 'datos_division_orden'
    ? { data: null, error: { message: 'Este cliente no tiene condición de venta: poné el % de la parte A.' } }
    : { data: null, error: null } }).then(async () => {
    el(S, 'ad-dv-numero-unica').value = '0003-00000077'
    await S.guardarFacturaDivision('UNICA')
    const r = rpcs(S, 'guardar_factura_orden')
    chk('la factura única: p_parte UNICA', r.length === 1 && r[0][1].p_parte === 'UNICA' && r[0][1].p_numero === '0003-00000077')
    chk('y se ve en la orden', /Factura única<\/span><span class="ad-facturas-orden__numero">Factura 0003-00000077/.test(cuerpo(S)))
    el(S, 'ad-dv-numero-a').value = '0003-00000078'
    await S.guardarFacturaDivision('A')
    chk('una orden sin dividir no carga la A', rpcs(S, 'guardar_factura_orden').length === 1)
  }))
}

// ── XSS: todo lo que viene de la base ──────────────────────────────────────
{
  const S = nuevo()
  const datos = { ...DATOS, codigo: marca('codigo'), cliente: marca('cliente'), cliente_cuit: marca('cuit'),
    items: [{ ...DATOS.items[0], descripcion: marca('descripcion') }, { ...DATOS.items[1], descripcion: marca('desc-b'), unidad: marca('unidad') }] }
  const h = S.htmlHojaDivision(datos, S.facturasPorParte([{ parte: 'A', numero: marca('numero-a') }, { parte: 'B', numero: marca('numero-b') }]))
  chequearMarcas(chk, 'la hoja de la división', h, ['codigo', 'cliente', 'cuit', 'descripcion', 'desc-b', 'unidad', 'numero-a', 'numero-b'])
  const dv = { codigo: marca('codigo-v'), facturas: { A: { numero: marca('numero-v'), archivo_url: 'x' } }, cargas: { A: { error: marca('error-v') } } }
  chequearMarcas(chk, 'una factura de la ventana', S.htmlFacturaDivision(dv, 'A'), ['codigo-v', 'numero-v', 'error-v'])
  S.estado.clientes = [{ ...CLIENTES[0], pct_parte_a: 30 }]
  const ho = S.htmlFacturasOrden({ orden: { ...ORDEN, codigo: marca('codigo-o') }, facturas: [{ parte: 'A', numero: marca('numero-o') }] })
  chequearMarcas(chk, 'las facturas de la orden', ho, ['codigo-o', 'numero-o'])
}
{
  const S = nuevo()
  preparar(S)
  esperas.push(abrirVentana(S, { rpc: async () => ({ data: null, error: { message: marca('error-base') } }) }).then(() => {
    chequearMarcas(chk, 'el aviso de la base en la ventana', el(S, 'ad-dv-aviso').innerHTML, ['error-base'])
  }))
}

fin()
