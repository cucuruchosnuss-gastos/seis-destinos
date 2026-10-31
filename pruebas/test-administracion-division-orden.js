// ADMINISTRACIÓN — DIVIDIR PARA FACTURAR, la CONDICIÓN DE VENTA y las
// COMISIONES DE LOS 3 VENDEDORES (21/10/2026; los vendedores, a la tarde).
//
// Cada cliente puede tener una condición de venta: un % de cada orden va a la
// PARTE A y el resto a la PARTE B; a la A se le suman APARTE las comisiones de
// 3 vendedores ("Vendedor 1/2/3", con su % de la configuración; un cliente
// puede tener los suyos y una orden, los suyos). Se factura en ARCA, fuera de
// la app: la hoja da los dos montos y después se pegan los números de
// factura. La orden NO cambia. La base calcula todo.
// DESDE EL 28/10/2026 la parte A y la B son los puntos de venta N1 y N2 y se
// eligen en la misma pantalla de la orden valorizada (sin ventana): la
// orden, el papel y las facturas los fija
// test-administracion-valorizar-con-division.js. Esta suite fija lo que quedó:
//  - LOS %: el otro se completa con la diferencia a 100; la suma de los %.
//  - LAS REGLAS, con los textos de la base (y el código del punto).
//  - LA CONFIGURACIÓN: los 3 vendedores en orden, el total, guardar_comision_vendedor.
//  - LA FICHA: el punto 2 se completa solo a partir del 1 (y al revés);
//    vacío = todo al punto 1; cada vendedor con el % de la configuración
//    (marcado) o propio; cambiar uno lo deja propio; "volver al de la
//    configuración" manda null; se guarda con
//    guardar_condicion_venta_cliente(p_comisiones); error tal cual.
//  - XSS de los vendedores y la configuración.
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

const VENDEDORES = [
  { id: 'v1', nombre: 'Vendedor 1', orden: 1, pct_defecto: 2 },
  { id: 'v2', nombre: 'Vendedor 2', orden: 2, pct_defecto: 3 },
  { id: 'v3', nombre: 'Vendedor 3', orden: 3, pct_defecto: 4 },
]
const CLIENTES = [
  { id: 'c1', nombre: 'Distribuidora Anatolia', razon_social: 'ANATOLIA SRL', cuit: '30712345678', lista_precio_id: 'l1', activo: true, pct_parte_a: 30 },
  { id: 'c2', nombre: 'Kiosco Pepe', razon_social: null, cuit: null, lista_precio_id: null, activo: true, pct_parte_a: null },
]
const CAT = {
  productos: [{ id: 'p1', nombre: 'Cucurucho grande' }],
  presentaciones: [{ id: 'pr1', producto_id: 'p1', nombre: 'Caja x 100', con_cono: false, unidades_por_caja: 100 }],
  marcas: [], insumos: [],
}
const ORDEN = { id: 'o1', numero: 15, codigo: 'N-0015', unidad_negocio_id: 'u-n', fecha: '2026-10-20', estado: 'confirmada', estado_valorizacion: 'valorizada',
  total: 12140, moneda: 'ARS', cliente_id: 'c1', cargada_por: 'emp-9', cargada_en: '2026-10-20T17:32:00Z', transporte: null, observaciones: null,
  comision_modo: null, comision_valor: null, comision_importe: null, comision_factura_id: null, division_pct_a: null }
const ITEMS = [{ id: 'i1', orden: 1, presentacion_id: 'pr1', marca_id: null, cajas: 10, unidades: 1000, precio_caja: 1000, subtotal: 10000, lote: null }]

// Lo que devuelve datos_division_orden con 30 % y los % de la configuración:
// la harina (2 kg) y el renglón de 1 caja no llegan a la A (floor de la base).
function comisionesDe(pcts, subtotalA) {
  return VENDEDORES.map((v, i) => ({ vendedor_id: v.id, nombre: v.nombre, orden: v.orden, pct: pcts[i], monto: Math.round(subtotalA * pcts[i]) / 100 }))
}
function datos({ pctA = 30, pcts = [2, 3, 4] } = {}) {
  const sa = 3000
  const com = comisionesDe(pcts, sa)
  const total = com.reduce((s, c) => s + c.monto, 0)
  return {
    orden_id: 'o1', codigo: 'N-0015', fecha: '2026-10-20', cliente: 'Distribuidora Anatolia', cliente_cuit: '30712345678',
    pct_a: pctA, pct_b: 100 - pctA,
    items: [
      { orden: 1, descripcion: 'Cucurucho grande · Caja x 100', unidad: 'cajas', precio: 1000, cantidad: 10, cant_a: 3, cant_b: 7, subtotal_a: 3000, subtotal_b: 7000 },
      { orden: 2, descripcion: 'Harina 000 Morixe', unidad: 'kg', precio: 820, cantidad: 2, cant_a: 0, cant_b: 2, subtotal_a: 0, subtotal_b: 1640 },
      { orden: 3, descripcion: 'Conito chico · Caja x 50', unidad: 'cajas', precio: 500, cantidad: 1, cant_a: 0, cant_b: 1, subtotal_a: 0, subtotal_b: 500 },
    ],
    subtotal_a: sa, comisiones: com, comision_pct_total: pcts.reduce((s, p) => s + p, 0), comision_total: total, total_a: sa + total,
    subtotal_b: 9140, total_b: 9140, total_orden: 12140, guardada: false, facturas: [],
  }
}
const DATOS = datos()

function preparar(S, { orden = ORDEN, items = ITEMS, clientes = CLIENTES, propias = [] } = {}) {
  S.estado.clientes = clientes
  S.estado.catalogo = CAT
  S.estado.catalogoEmpresa = 'u-n'
  // Una copia por sandbox: guardar la división escribe en la orden abierta.
  S.__tablas.ordenes_retiro = [{ ...orden }]
  S.__tablas.orden_retiro_items = items
  S.__tablas.v_empleados_publico = [{ id: 'emp-9', nombre: 'Emanuel Romero' }]
  S.__tablas.vendedores_comision = VENDEDORES.map(v => ({ ...v }))
  S.__tablas.cliente_comisiones = propias
}
const el = (S, id) => S.__doc.getElementById(id)
const cuerpo = (S) => el(S, 'ad-orden-cuerpo').innerHTML
const rpcs = (S, nombre) => S.__llamadas.rpc.filter(r => r[0] === nombre)
const json = (x) => JSON.stringify(x)
const COMISIONES_CONFIG = [{ vendedor_id: 'v1', pct: 2 }, { vendedor_id: 'v2', pct: 3 }, { vendedor_id: 'v3', pct: 4 }]
// Retiene TODAS las rpc hasta soltar(): si se guardara solo la última, una
// segunda llamada (la que prueba el doble toque) dejaría la primera colgada.
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
  chk('el % se escribe sin ceros de más', S.textoPct(30) === '30' && S.textoPct(33.5) === '33,5' && S.textoPct(2) === '2')
  chk('la suma de los % (0,1 + 0,2 = 0,3, sin error de coma flotante)', S.sumaPcts([0.1, 0.2]) === 0.3 && S.sumaPcts([2, 3, 4]) === 9)
  chk('la suma ignora un % vacío y sin ninguno no inventa un 0', S.sumaPcts([2, null, 4]) === 6 && S.sumaPcts([null, '']) === null && S.sumaPcts([]) === null)
}

// ── Las reglas, con los textos de la base ──────────────────────────────────
{
  const S = nuevo()
  const C = (pcts) => pcts.map((pct, i) => ({ vendedor_id: 'v' + (i + 1), pct }))
  chk('condición: A vacío se puede (no se divide)', S.validarCondicionVenta(null, null) === null)
  chk('condición: el punto 1 fuera de rango, con su nombre', S.validarCondicionVenta(101, null) === 'El % del punto de venta 1 va de 0 a 100.')
  chk('condición: un % de vendedor vacío se puede (vuelve a la configuración)', S.validarCondicionVenta(30, C([2, null, 4])) === null)
  chk('condición: un vendedor fuera de rango, el texto de la base', S.validarCondicionVenta(30, C([2, 101, 4])) === 'Las comisiones van de 0 a 100.')
  chk('condición: 0 y 100 sirven', S.validarCondicionVenta(0, C([0, 100, 0])) === null)
  chk('división: el % del N1 es obligatorio, con el código del punto', S.validarDivision(null, C([2, 3, 4]), 'N-0015') === 'El % del N1-0015 va de 0 a 100.' &&
    S.validarDivision(101, C([2, 3, 4]), 'D-0045') === 'El % del D1-0045 va de 0 a 100.')
  chk('división: un vendedor vacío no sirve', S.validarDivision(30, C([2, null, 4])) === 'Las comisiones van de 0 a 100.')
  chk('división: un vendedor negativo no sirve', S.validarDivision(30, C([-1, 3, 4])) === 'Las comisiones van de 0 a 100.')
  chk('división: lo que sirve no tiene error', S.validarDivision(30, C([2, 3, 4])) === null)
  chk('los parámetros de la división: los 3 vendedores con su %',
    json(S.parametrosDivision('o1', 30, C([2, 3, 4]))) === json({ p_orden_id: 'o1', p_pct_a: 30, p_comisiones: COMISIONES_CONFIG }))
  chk('sin vendedores leídos, p_comisiones en null (decide la base)', json(S.parametrosDivision('o1')) === json({ p_orden_id: 'o1', p_pct_a: null, p_comisiones: null }) &&
    S.parametrosDivision('o1', 30, []).p_comisiones === null)
  chk('número de factura: de 3 a 40 letras, con el texto de la base',
    S.validarNumeroFactura('ab') === 'Pegá el número de la factura de ARCA.' && S.validarNumeroFactura('x'.repeat(41)) === 'Pegá el número de la factura de ARCA.' &&
    S.validarNumeroFactura('  ') === 'Pegá el número de la factura de ARCA.' && S.validarNumeroFactura('0003-00001234') === null && S.validarNumeroFactura('abc') === null)
  chk('el PDF es opcional', S.validarPdfFactura(null) === null)
  chk('un PDF sirve (por tipo o por nombre)', S.validarPdfFactura({ name: 'f.pdf', type: '' }) === null && S.validarPdfFactura({ name: 'factura', type: 'application/pdf' }) === null)
  chk('una foto no es un PDF', S.validarPdfFactura({ name: 'f.jpg', type: 'image/jpeg' }) === 'El archivo tiene que ser un PDF.')
}

{
  const S = nuevo()
  const f = S.facturasPorParte([{ parte: 'A', numero: '0003-1', archivo_url: 'r.pdf' }, { parte: 'B', numero: '0003-2' }])
  chk('las facturas por parte', f.A.numero === '0003-1' && f.A.archivo_url === 'r.pdf' && f.B.archivo_url === null && !f.UNICA)
  chk('sin facturas, vacío', json(S.facturasPorParte(null)) === '{}')
  chk('la cantidad: cajas o la unidad del insumo', S.cantidadDivision(3, 'cajas') === '3 cajas' && S.cantidadDivision(1, 'cajas') === '1 caja' && S.cantidadDivision(25.5, 'kg') === '25,5 kg')
  chk('la ruta del PDF va en la carpeta del usuario (la policy del bucket; en la base sigue siendo la parte)',
    S.rutaPdfFactura('uid-1', 'u-n', '2026-10-20', 'N-0015', 'A') === 'uid-1/facturas-venta/u-n/2026/N-0015-A.pdf')
  const ra = S.renglonesParte(DATOS, 'A')
  const rb = S.renglonesParte(DATOS, 'B')
  chk('el N1 tiene SOLO los renglones con algo en el N1', ra.length === 1 && ra[0].cantidad === 3 && ra[0].subtotal === 3000)
  chk('el N2 tiene los tres', rb.length === 3 && rb[1].cantidad === 2 && rb[1].subtotal === 1640)
}

// ── La configuración de comisiones ─────────────────────────────────────────
{
  const S = nuevo()
  preparar(S)
  esperas.push(S.mostrarComisiones().then(async () => {
    const h = el(S, 'ad-comisiones-cuerpo').innerHTML
    chk('lee vendedores_comision en orden', S.__llamadas.consultas.some(c => c[0] === 'vendedores_comision' && c[1].some(x => x[0] === 'order' && x[1] === 'orden')))
    chk('los 3 vendedores, en orden', h.indexOf('Vendedor 1 %') !== -1 && h.indexOf('Vendedor 1 %') < h.indexOf('Vendedor 2 %') && h.indexOf('Vendedor 2 %') < h.indexOf('Vendedor 3 %'))
    chk('cada uno con su % (formato argentino, campo de texto)', el(S, 'ad-cv-v1').value === '2' && el(S, 'ad-cv-v3').value === '4' && el(S, 'ad-cv-v1').type === 'text')
    chk('abajo, el total', el(S, 'ad-comisiones-total').innerHTML === 'Total: 9 %' || /Total: 9 %/.test(h))
    S.cambiarComisionConfig('v2', 3.5)
    chk('tipear cambia el total', el(S, 'ad-comisiones-total').textContent === 'Total: 9,5 %')
    await S.guardarComisionConfig('v2')
    const r = rpcs(S, 'guardar_comision_vendedor')
    chk('guarda con guardar_comision_vendedor', r.length === 1 && json(r[0][1]) === json({ p_vendedor_id: 'v2', p_pct: 3.5 }))
    chk('lo dice', S.__llamadas.exitos.some(m => m === 'Vendedor 2: 3,5 % guardado.'))
    chk('lo escrito en otro vendedor no se pierde al repintar', el(S, 'ad-cv-v2').value === '3,50' || el(S, 'ad-cv-v2').value === '3,5')
    S.cambiarComisionConfig('v1', null)
    await S.guardarComisionConfig('v1')
    chk('vacío no llama y lo dice con el texto de la base', rpcs(S, 'guardar_comision_vendedor').length === 1 && S.estado.comisiones.filasEstado.v1.error === 'El porcentaje va de 0 a 100.')
    S.__setRpc(async () => ({ data: null, error: { message: 'No tenés permiso para cambiar las comisiones.' } }))
    S.cambiarComisionConfig('v1', 2)
    await S.guardarComisionConfig('v1')
    chk('el error de la base TAL CUAL, pegado a ese vendedor', S.estado.comisiones.filasEstado.v1.error === 'No tenés permiso para cambiar las comisiones.' &&
      /data-cv-error="v1">No tenés permiso para cambiar las comisiones\./.test(el(S, 'ad-comisiones-cuerpo').innerHTML))
  }))
}
{
  const S = nuevo()
  preparar(S)
  esperas.push(S.cargarComisiones().then(async () => {
    const soltar = retener(S)
    const p1 = S.guardarComisionConfig('v3')
    const p2 = S.guardarComisionConfig('v3')
    soltar()
    await Promise.all([p1, p2])
    chk('configuración: un doble toque manda UNA vez', rpcs(S, 'guardar_comision_vendedor').length === 1)
  }))
}
{
  const S = nuevo()
  preparar(S)
  S.__tablas.vendedores_comision = () => ({ data: null, error: { message: 'x' } })
  esperas.push(S.cargarComisiones().then(() => chk('sin vendedores leídos, lo dice (no un 0)', /No se pudieron leer los vendedores/.test(el(S, 'ad-comisiones-cuerpo').innerHTML))))
}
{
  const S = nuevo()
  const c = S.contenidoSeccionComisiones({ vendedores: VENDEDORES })
  chk('la tarjeta de la portada: el total y cada vendedor', c.numero === '9 %' && c.lineas[0] === 'Vendedor 1 2 % · Vendedor 2 3 % · Vendedor 3 4 %')
  chk('la sección se ve con retiros:precios', S.seccionesVisibles().some(s => s.id === 'comisiones'))
  S.estado.misTareas = new Map([['retiros:ver', { unidades: ['u-n'] }]])
  chk('y no sin retiros:precios', !S.seccionesVisibles().some(s => s.id === 'comisiones'))
}

// ── La ficha: la condición de venta ─────────────────────────────────────────
function prepararFicha(S, cliente = { id: 'c1', nombre: 'Anatolia', pct_parte_a: 30 }, propias = {}) {
  S.estado.vista = 'ad-vista-ficha'
  S.estado.ficha = { id: cliente.id, original: cliente, condicion: { error: null, enviando: false, vendedores: S.filasVendedoresFicha(VENDEDORES, propias), errorVendedores: null } }
  S.llenarCondicionVenta(cliente)
}
{
  const S = nuevo()
  prepararFicha(S)
  chk('al abrir: punto 1 y punto 2', el(S, 'ad-f-pct-a').value === '30' && el(S, 'ad-f-pct-b').value === '70')
  chk('la ficha dice "Punto de venta 1 %" y "Punto de venta 2 %", no "Parte A/B"', /<label for="ad-f-pct-a">Punto de venta 1 %<\/label>/.test(src) && /<label for="ad-f-pct-b">Punto de venta 2 %<\/label>/.test(src) &&
    !/>Parte [AB] %</.test(src) && !/Comisiones de la parte A/.test(src))
  el(S, 'ad-f-pct-a').value = '25,5'
  S.completarOtroPct('ad-f-pct-a', 'ad-f-pct-b')
  chk('escribir A completa B con la diferencia a 100', el(S, 'ad-f-pct-b').value === '74,50', el(S, 'ad-f-pct-b').value)
  el(S, 'ad-f-pct-b').value = '60'
  S.completarOtroPct('ad-f-pct-b', 'ad-f-pct-a')
  chk('escribir B completa A', el(S, 'ad-f-pct-a').value === '40')
  el(S, 'ad-f-pct-a').value = ''
  S.completarOtroPct('ad-f-pct-a', 'ad-f-pct-b')
  chk('vaciar A vacía B (no se divide)', el(S, 'ad-f-pct-b').value === '')
  chk('ya no hay un campo único de comisión', !/ad-f-comision-a/.test(src) && !/comision_parte_a_pct['"]?\s*[,)]/.test(src.replace(/\/\/.*$/gm, '')))
  chk('los 3 vendedores con el % de la configuración', el(S, 'ad-f-v1').value === '2' && el(S, 'ad-f-v2').value === '3' && el(S, 'ad-f-v3').value === '4')
  const h = el(S, 'ad-f-vendedores').innerHTML
  chk('marcados "De la configuración"', (h.match(/data-origen-config>De la configuración/g) || []).length === 3 && (h.match(/data-origen-propio hidden/g) || []).length === 3)
  chk('cada campo de vendedor es de texto (número argentino)', el(S, 'ad-f-v1').type === 'text')
}
{
  const S = nuevo()
  prepararFicha(S, undefined, { v2: 5 })
  const h = el(S, 'ad-f-vendedores').innerHTML
  chk('un % propio del cliente se ve con el suyo', el(S, 'ad-f-v2').value === '5' && el(S, 'ad-f-v1').value === '2')
  const v2 = entre(h, 'data-vendedor="v2"', 'data-vendedor="v3"')
  chk('marcado "Propio de este cliente" con "Volver al de la configuración (3 %)"',
    /data-origen-config hidden/.test(v2) && /data-origen-propio>Propio de este cliente/.test(v2) && /data-volver-config="v2"[^>]*>Volver al de la configuración \(3 %\)/.test(v2))
}
{
  const S = nuevo()
  prepararFicha(S)
  S.cambiarVendedorFicha('v1', 2.5)
  const v1 = S.estado.ficha.condicion.vendedores[0]
  chk('cambiar un % lo deja propio del cliente', v1.propio === true && v1.pct === 2.5)
  el(S, 'ad-f-pct-a').value = '40'
  esperas.push(S.guardarCondicionVenta().then(() => {
    const r = rpcs(S, 'guardar_condicion_venta_cliente')
    chk('guarda con guardar_condicion_venta_cliente: el propio con su %, los de la configuración en null',
      r.length === 1 && json(r[0][1]) === json({ p_cliente_id: 'c1', p_pct_a: 40, p_comisiones: [{ vendedor_id: 'v1', pct: 2.5 }, { vendedor_id: 'v2', pct: null }, { vendedor_id: 'v3', pct: null }] }), json(r))
    chk('no toca guardar_ficha_cliente', !rpcs(S, 'guardar_ficha_cliente').length)
    // 30/10/2026: "Condición guardada: N1 X% / N2 Y%" (el texto de Facu), también pegado al botón.
    chk('dice lo que guardó, con los puntos', S.__llamadas.exitos.some(m => m === 'Condición guardada: N1 40% / N2 60%.'), json(S.__llamadas.exitos))
    chk('…y queda escrito en la ficha', el(S, 'ad-f-condicion-estado').textContent === 'Condición guardada: N1 40% / N2 60%' && el(S, 'ad-f-condicion-estado').hidden === false)
    chk('la lista de clientes se relee (la orden usa la condición)', S.estado.clientes === null)
  }))
  S.estado.clientes = CLIENTES
}
{
  const S = nuevo()
  prepararFicha(S, undefined, { v2: 5, v3: 1 })
  S.volverVendedorAConfig('v2')
  const v2 = S.estado.ficha.condicion.vendedores[1]
  chk('"Volver al de la configuración": vuelve a 3 y deja de ser propio', v2.propio === false && v2.pct === 3 && el(S, 'ad-f-v2').value === '3')
  esperas.push(S.guardarCondicionVenta().then(() => {
    const r = rpcs(S, 'guardar_condicion_venta_cliente')
    chk('y se guarda con pct null (el otro propio sigue)', json(r[0][1].p_comisiones) === json([{ vendedor_id: 'v1', pct: null }, { vendedor_id: 'v2', pct: null }, { vendedor_id: 'v3', pct: 1 }]))
  }))
}
{
  const S = nuevo()
  prepararFicha(S, undefined, { v3: 6 })
  S.cambiarVendedorFicha('v3', null)
  esperas.push(S.guardarCondicionVenta().then(() => {
    const r = rpcs(S, 'guardar_condicion_venta_cliente')
    chk('un propio vaciado vuelve a la configuración (pct null)', r.length === 1 && r[0][1].p_comisiones[2].pct === null)
    const v3 = S.estado.ficha.condicion.vendedores[2]
    chk('y después de guardar se ve el de la configuración', v3.propio === false && v3.pct === 4)
  }))
}
{
  const S = nuevo()
  prepararFicha(S)
  S.cambiarVendedorFicha('v2', 120)
  esperas.push(S.guardarCondicionVenta().then(() => {
    chk('un vendedor fuera de rango no llama', !rpcs(S, 'guardar_condicion_venta_cliente').length)
    chk('y lo dice pegado al botón', el(S, 'ad-f-condicion-error').textContent === 'Las comisiones van de 0 a 100.' && el(S, 'ad-f-condicion-error').hidden === false)
  }))
}
{
  const S = nuevo()
  prepararFicha(S)
  el(S, 'ad-f-pct-a').value = ''
  esperas.push(S.guardarCondicionVenta().then(() => {
    const r = rpcs(S, 'guardar_condicion_venta_cliente')
    chk('el punto 1 vacío manda null (sin condición)', r.length === 1 && r[0][1].p_pct_a === null)
    // 30/10/2026: sin condición ya no es "todo al punto 1": se pone el % en cada orden.
    chk('y lo dice', S.__llamadas.exitos.some(m => /^Condición guardada: sin condición \(se pone el % en cada orden, al facturar\)\.$/.test(m)), json(S.__llamadas.exitos))
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
  preparar(S, { propias: [{ vendedor_id: 'v3', pct: 7 }] })
  S.__tablas.clientes = [{ id: 'c1', nombre: 'Anatolia', pct_parte_a: 30, unidad_negocio_id: 'u-n' }]
  esperas.push(S.abrirFicha('c1').then(() => {
    const q = S.__llamadas.consultas.find(c => c[0] === 'clientes' && c[1].some(x => x[0] === 'select' && /plazo_pago_dias/.test(x[1])))
    chk('la ficha lee pct_parte_a y NO la comisión vieja', !!q && q[1].some(x => x[0] === 'select' && /pct_parte_a/.test(x[1]) && !/comision_parte_a_pct/.test(x[1])))
    chk('lee los % propios del cliente', S.__llamadas.consultas.some(c => c[0] === 'cliente_comisiones' && c[1].some(x => x[0] === 'eq' && x[1] === 'cliente_id' && x[2] === 'c1')))
    chk('y la muestra al abrir', el(S, 'ad-f-pct-a').value === '30' && el(S, 'ad-f-pct-b').value === '70' && el(S, 'ad-f-v1').value === '2' && el(S, 'ad-f-v3').value === '7')
    chk('el propio, marcado', S.estado.ficha.condicion.vendedores[2].propio === true && S.estado.ficha.condicion.vendedores[0].propio === false)
  }))
}
{
  const S = nuevo()
  preparar(S)
  S.__tablas.clientes = [{ id: 'c1', nombre: 'Anatolia', pct_parte_a: 30, unidad_negocio_id: 'u-n' }]
  S.__tablas.cliente_comisiones = () => ({ data: null, error: { message: 'permission denied' } })
  esperas.push(S.abrirFicha('c1').then(async () => {
    chk('sin las comisiones leídas, lo dice', /No se pudieron leer las comisiones de los vendedores/.test(el(S, 'ad-f-vendedores').innerHTML))
    await S.guardarCondicionVenta()
    chk('y guarda solo el % de la A (p_comisiones null)', rpcs(S, 'guardar_condicion_venta_cliente')[0][1].p_comisiones === null)
  }))
}

// ── XSS: todo lo que viene de la base ──────────────────────────────────────
{
  const S = nuevo()
  const hv = S.htmlVendedoresPct('ad-f', [{ vendedor_id: marca('id-v'), nombre: marca('nombre-v'), orden: 1, pct: 2, defecto: 2, propio: true }], { conOrigen: true })
  chequearMarcas(chk, 'los vendedores de la ficha', hv, ['id-v', 'nombre-v'])
}
{
  const S = nuevo()
  preparar(S)
  S.__tablas.vendedores_comision = [{ id: marca('id-c'), nombre: marca('nombre-c'), orden: 1, pct_defecto: 2 }]
  esperas.push(S.cargarComisiones().then(() => chequearMarcas(chk, 'la configuración de comisiones', el(S, 'ad-comisiones-cuerpo').innerHTML, ['id-c', 'nombre-c'])))
}
{
  const S = nuevo()
  preparar(S)
  esperas.push(S.cargarComisiones().then(async () => {
    S.__setRpc(async () => ({ data: null, error: { message: marca('error-cv') } }))
    await S.guardarComisionConfig('v1')
    chequearMarcas(chk, 'el error de la base en la configuración', el(S, 'ad-comisiones-cuerpo').innerHTML, ['error-cv'])
  }))
}
// ── La ficha no pierde la condición en silencio (30/10/2026) ───────────────
// Lo elegido: se guarda sola, sin preguntar, al tocar "Guardar la ficha" y al
// salir de la ficha.
const vaciar = async () => { for (let i = 0; i < 20; i++) await new Promise(r => setImmediate(r)) }
{
  const S = nuevo()
  prepararFicha(S)
  chk('recién abierta: nada sin guardar', S.condicionSinGuardar(S.estado.ficha) === false)
  el(S, 'ad-f-pct-a').value = '45'
  S.completarOtroPct('ad-f-pct-a', 'ad-f-pct-b')
  S.marcarCondicionTocada()
  chk('cambiar un %: queda sin guardar', S.condicionSinGuardar(S.estado.ficha) === true)
  S.estado.clientes = CLIENTES
  S.mostrarVista('ad-vista-clientes')
  esperas.push(vaciar().then(() => {
    const r = rpcs(S, 'guardar_condicion_venta_cliente')
    chk('al salir de la ficha se guarda sola', r.length === 1 && r[0][1].p_pct_a === 45 && r[0][1].p_cliente_id === 'c1', json(r))
    chk('…lo dice: "Condición guardada: N1 45% / N2 55%"', S.__llamadas.exitos.includes('Condición guardada: N1 45% / N2 55%.'), json(S.__llamadas.exitos))
    chk('…y ya no queda nada sin guardar', S.condicionSinGuardar(S.estado.ficha) === false)
    S.mostrarVista('ad-vista-inicio')
    return vaciar().then(() => chk('salir otra vez no la vuelve a mandar', rpcs(S, 'guardar_condicion_venta_cliente').length === 1))
  }))
}
{
  // Un vendedor cambiado y "Volver al de la configuración" también cuentan.
  const S = nuevo()
  prepararFicha(S, undefined, { v2: 5 })
  S.volverVendedorAConfig('v2')
  chk('volver al de la configuración: sin guardar', S.condicionSinGuardar(S.estado.ficha) === true)
  const S2 = nuevo()
  prepararFicha(S2)
  S2.cambiarVendedorFicha('v1', 2.5)
  chk('cambiar un vendedor: sin guardar', S2.condicionSinGuardar(S2.estado.ficha) === true)
  S2.mostrarVista('ad-vista-inicio')
  esperas.push(vaciar().then(() => {
    const r = rpcs(S2, 'guardar_condicion_venta_cliente')
    chk('al salir viaja el vendedor propio', r.length === 1 && json(r[0][1].p_comisiones) === json([{ vendedor_id: 'v1', pct: 2.5 }, { vendedor_id: 'v2', pct: null }, { vendedor_id: 'v3', pct: null }]), json(r))
  }))
}
{
  // Sin tocar la condición, salir no llama.
  const S = nuevo()
  prepararFicha(S)
  S.mostrarVista('ad-vista-inicio')
  esperas.push(vaciar().then(() => chk('sin cambios, salir no guarda nada', !rpcs(S, 'guardar_condicion_venta_cliente').length)))
}
{
  // Al salir no se puede guardar: lo dice con el aviso (la ficha ya no se ve).
  const S = nuevo()
  prepararFicha(S)
  S.__setRpc(async (n) => n === 'guardar_condicion_venta_cliente' ? { data: null, error: { message: 'No tenés permiso sobre este cliente.' } } : { data: null, error: null })
  el(S, 'ad-f-pct-a').value = '20'
  S.marcarCondicionTocada()
  S.mostrarVista('ad-vista-inicio')
  esperas.push(vaciar().then(() => {
    chk('el aviso con el nombre y el texto de la base', S.__llamadas.errores.includes('No se guardó la condición de venta de Anatolia: No tenés permiso sobre este cliente.'), json(S.__llamadas.errores))
    chk('…y sigue sin guardar (se puede reintentar)', S.condicionSinGuardar(S.estado.ficha) === true)
  }))
}
{
  // Un % que no sirve al salir: no llama y lo avisa.
  const S = nuevo()
  prepararFicha(S)
  S.cambiarVendedorFicha('v2', 120)
  S.mostrarVista('ad-vista-inicio')
  esperas.push(vaciar().then(() => {
    chk('un vendedor fuera de rango al salir: no llama', !rpcs(S, 'guardar_condicion_venta_cliente').length)
    chk('…y lo avisa', S.__llamadas.errores.includes('No se guardó la condición de venta de Anatolia: Las comisiones van de 0 a 100.'), json(S.__llamadas.errores))
  }))
}
{
  // "Guardar la ficha" con la condición cambiada: la guarda también (antes que el resto).
  const S = nuevo()
  prepararFicha(S)
  S.estado.ficha.error = null
  S.llenarFicha(S.estado.ficha.original)
  el(S, 'ad-f-pct-a').value = '35'
  S.marcarCondicionTocada()
  esperas.push(S.guardarFicha().then(() => {
    const r = rpcs(S, 'guardar_condicion_venta_cliente')
    chk('"Guardar la ficha" guarda también la condición', r.length === 1 && r[0][1].p_pct_a === 35, json(r))
    chk('…sin el "No cambiaste nada" (cambió la condición)', !S.estado.ficha.error, S.estado.ficha.error)
    chk('…y queda escrito "Condición guardada: N1 35% / N2 65%"', el(S, 'ad-f-condicion-estado').textContent === 'Condición guardada: N1 35% / N2 65%')
  }))
}
{
  // Si la condición no se puede guardar, "Guardar la ficha" no sigue (no se pierde).
  const S = nuevo()
  prepararFicha(S)
  S.cambiarVendedorFicha('v2', 120)
  esperas.push(S.guardarFicha().then(() => {
    chk('condición inválida: "Guardar la ficha" frena y lo dice', !rpcs(S, 'guardar_condicion_venta_cliente').length && !rpcs(S, 'guardar_ficha_cliente').length &&
      S.estado.ficha.error === 'No se guardó la condición de venta: Las comisiones van de 0 a 100.', S.estado.ficha.error)
  }))
}
{
  // Cerrar o recargar la página con la condición sin guardar: el navegador pregunta.
  chk('beforeunload con la condición sin guardar', /addEventListener\('beforeunload', \(e\) => \{\n\s+if \(estado\.vista === 'ad-vista-ficha' && condicionSinGuardar\(estado\.ficha\)\) \{ e\.preventDefault\(\); e\.returnValue = '' \}/.test(src))
  chk('el texto de "vacío" en la ficha ya no dice 100/0', /Vacío: sin condición \(se pone el % en cada orden, al facturar\)\./.test(src) && !/Vacío: todo al punto 1 \(100\/0\)/.test(src))
}

fin()
