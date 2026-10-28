// ADMINISTRACIÓN — VALORIZAR CON LA DIVISIÓN EN UNA SOLA PANTALLA (28/10/2026).
//
// La "parte A" y la "parte B" son los PUNTOS DE VENTA 1 y 2 de ARCA: cada uno
// es una ORDEN DE PEDIDO VALORIZADA aparte (N-0036 → N1-0036 y N2-0036). Caso
// real: la N-0036 de ICARDI (condición 40 / 60, Vendedor 1 al 21 %): Yanina
// valorizó, tuvo que entrar a "Dividir para facturar", poner los %, guardar e
// imprimir, y el listado de la izquierda siguió diciendo "sin valorizar".
// Esta suite fija:
//  - EL CÓDIGO de cada punto (una sola función): N1-0036, N2-0036, D1-0045.
//  - LA PANTALLA: al valorizar, la condición del cliente se guarda sola
//    (guardar_division_orden) y en la misma pantalla quedan la condición
//    ("N1-0036: 40 % · N2-0036: 60 %", botones 100/0, 80/20, 50/50, 40/60 y
//    "Otro %"), los 3 vendedores y los dos puntos con sus importes; sin
//    condición en el cliente, 100/0 y un solo punto; un cliente del grupo,
//    nada. Cambiar la condición o un vendedor guarda SOLO con un retardo,
//    "Guardando…" mientras tanto, el error de la base tal cual, una respuesta
//    vieja no pisa una nueva y nunca hay dos guardados en camino.
//  - EL PAPEL: cada punto es un documento aparte ("ORDEN DE PEDIDO" + el
//    código, sin factura, sin % y sin pie; en el N1 los vendedores con monto
//    y sin %; en el N2 solo el TOTAL); imprimir uno saca solo ese; un PDF por
//    punto, "Orden de pedido N1-0036 - <CLIENTE>.pdf".
//  - "Parte A/B" en ningún lado (pantalla ni papel).
//  - EL LISTADO: la fila de la orden queda al día en el momento (valorizar,
//    condición, factura) y se relee sola al volver a la pestaña.
//  - XSS de lo que viene de la base.
//
//   node pruebas/test-administracion-valorizar-con-division.js

const path = require('path')
const fs = require('fs')
const { construirAdministracion } = require('./sandbox-administracion')
const { arnes, marca, chequearMarcas } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/administracion.html')
const src = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${src.length} bytes)`)
const { chk, esperas, fin } = arnes()

// Relojes que se corren a mano (el retardo del guardado), Storage con
// subida, File y las librerías del PDF de mentira.
const PRELUDIO = `
  var __relojes = new Map()
  var __idReloj = 0
  function setTimeout(f, ms) { const id = ++__idReloj; __relojes.set(id, { f, ms }); return id }
  function clearTimeout(id) { __relojes.delete(id) }
  window.__relojes = __relojes
  var __subidas = []
  supabase.storage = { from(b) { return {
    upload(ruta, archivo, op) { __subidas.push([b, ruta, op]); return Promise.resolve({ data: { path: ruta }, error: null }) },
    createSignedUrl(ruta, seg) { __urlsFirmadas.push([b, ruta, seg]); return Promise.resolve({ data: { signedUrl: 'https://firmada/' + ruta }, error: null }) },
  } } }
  window.__subidas = __subidas
  var File = class { constructor(partes, nombre, op) { this.partes = partes; this.name = nombre; this.type = op?.type } }
  window.__fotos = []
  window.__pdfs = []
  window.html2canvas = async (el) => { window.__fotos.push(el.innerHTML); return { width: 100, height: 100, toDataURL: () => 'data:x' } }
  window.jspdf = { jsPDF: class { constructor() { this.paginas = 1; window.__pdfs.push(this) } addPage() { this.paginas++ } addImage() {} output() { return { blob: true } } } }
`
const nuevo = () => {
  const S = construirAdministracion(ARCHIVO, { preludioExtra: PRELUDIO })
  // cargarScript: la librería ya está (no se baja nada).
  const qs = S.__doc.querySelector
  S.__doc.querySelector = (sel) => /script\[data-lib=/.test(sel) ? {} : qs(sel)
  return S
}
const vaciar = async () => { for (let i = 0; i < 6; i++) await new Promise(r => setImmediate(r)) }
// Corre los relojes pendientes (el retardo del guardado).
async function correrRelojes(S) {
  for (const [id, r] of [...S.__win.__relojes]) { S.__win.__relojes.delete(id); r.f() }
  await vaciar()
}

const VENDEDORES = [
  { id: 'v1', nombre: 'Vendedor 1', orden: 1, pct_defecto: 2 },
  { id: 'v2', nombre: 'Vendedor 2', orden: 2, pct_defecto: 3 },
  { id: 'v3', nombre: 'Vendedor 3', orden: 3, pct_defecto: 4 },
]
const CLIENTES = [
  { id: 'c-icardi', nombre: 'ICARDI REPRESENTACIONES S.A.', razon_social: null, cuit: '30711222333', lista_precio_id: 'l1', activo: true, pct_parte_a: 40 },
  { id: 'c-pepe', nombre: 'Kiosco Pepe', razon_social: null, cuit: null, lista_precio_id: 'l1', activo: true, pct_parte_a: null },
  { id: 'c-dolce', nombre: 'DOLCE PASTA SRL', razon_social: null, cuit: null, lista_precio_id: 'l1', activo: true, pct_parte_a: null, unidad_grupo_id: 'u-d' },
]
const CAT = {
  productos: [{ id: 'p1', nombre: 'Cucurucho grande' }, { id: 'p2', nombre: 'Conito chico' }],
  presentaciones: [
    { id: 'pr1', producto_id: 'p1', nombre: 'Caja x 100', con_cono: false, unidades_por_caja: 100 },
    { id: 'pr2', producto_id: 'p2', nombre: 'Caja x 50', con_cono: false, unidades_por_caja: 50 },
  ],
  marcas: [], insumos: [],
}
const ITEMS = [
  { id: 'i1', orden: 1, presentacion_id: 'pr1', marca_id: null, cajas: 60, unidades: 6000, precio_caja: 6500, subtotal: 390000, lote: null },
  { id: 'i2', orden: 2, presentacion_id: 'pr2', marca_id: null, cajas: 36, unidades: 1800, precio_caja: 5819.44, subtotal: 209499.84, lote: null },
]
const DESC = { pr1: 'Cucurucho grande · Caja x 100', pr2: 'Conito chico · Caja x 50' }
// La N-0036 de Icardi, valorizada, con la condición guardada y el Vendedor 1 al 21 %.
const ORDEN = { id: 'o36', numero: 36, codigo: 'N-0036', unidad_negocio_id: 'u-n', fecha: '2026-10-28', estado: 'confirmada', estado_valorizacion: 'valorizada',
  total: 599499.84, moneda: 'ARS', cliente_id: 'c-icardi', cargada_por: 'emp-9', cargada_en: '2026-10-28T12:00:00Z', transporte: null, observaciones: null,
  comision_modo: null, comision_valor: null, comision_importe: null, comision_factura_id: null, division_pct_a: 40 }
const COM_ICARDI = { v1: 21, v2: 0, v3: 0 }

const r2 = (n) => Math.round(n * 100) / 100
// datos_division_orden / guardar_division_orden, como la base (leídas con
// pg_get_functiondef el 28/10/2026): cant_a = floor(cant * pct / 100), los %
// de los vendedores: lo mandado > lo de la orden > la configuración.
function baseFalsa(S, { guardadas = { ...COM_ICARDI }, errorGuardar = null } = {}) {
  const llamadas = []
  const responder = (nombre, p) => {
    const o = S.__tablas.ordenes_retiro[0]
    const cli = CLIENTES.find(c => c.id === o.cliente_id)
    const pct = p.p_pct_a ?? o.division_pct_a ?? cli.pct_parte_a
    if (pct === null || pct === undefined) return { data: null, error: { message: 'Este cliente no tiene condición de venta: poné el % de la parte A.' } }
    const items = S.__tablas.orden_retiro_items.map(it => {
      const ca = Math.floor(it.cajas * pct / 100)
      return { orden: it.orden, tipo: 'retiro', descripcion: DESC[it.presentacion_id], unidad: 'cajas', precio: it.precio_caja, cantidad: it.cajas,
        cant_a: ca, cant_b: it.cajas - ca, subtotal_a: r2(ca * it.precio_caja), subtotal_b: r2((it.cajas - ca) * it.precio_caja) }
    })
    const sa = r2(items.reduce((s, x) => s + x.subtotal_a, 0))
    const sb = r2(items.reduce((s, x) => s + x.subtotal_b, 0))
    const com = VENDEDORES.map(v => {
      const mandado = p.p_comisiones?.find(c => c.vendedor_id === v.id)
      const pc = mandado && mandado.pct !== null ? mandado.pct : (guardadas[v.id] ?? v.pct_defecto)
      return { vendedor_id: v.id, nombre: v.nombre, orden: v.orden, pct: pc, monto: r2(sa * pc / 100) }
    })
    const tc = r2(com.reduce((s, c) => s + c.monto, 0))
    if (nombre === 'guardar_division_orden') {
      S.__tablas.ordenes_retiro[0] = { ...o, division_pct_a: pct }
      for (const c of com) guardadas[c.vendedor_id] = c.pct
    }
    return { data: { orden_id: o.id, codigo: o.codigo, fecha: o.fecha, cliente: cli.nombre, cliente_cuit: cli.cuit, pct_a: pct, pct_b: 100 - pct, items,
      subtotal_a: sa, comisiones: com, comision_pct_total: com.reduce((s, c) => s + c.pct, 0), comision_total: tc, total_a: r2(sa + tc), subtotal_b: sb, total_b: sb,
      total_orden: o.total, guardada: nombre === 'guardar_division_orden' || o.division_pct_a !== null, facturas: (S.__tablas.orden_facturas ?? []).map(f => ({ parte: f.parte, numero: f.numero_factura, archivo_url: f.archivo_url })) }, error: null }
  }
  const rpc = async (nombre, p) => {
    if (nombre === 'datos_division_orden' || nombre === 'guardar_division_orden') {
      llamadas.push([nombre, JSON.parse(JSON.stringify(p))])
      if (nombre === 'guardar_division_orden' && errorGuardar) return { data: null, error: { message: errorGuardar } }
      return responder(nombre, p)
    }
    if (nombre === 'guardar_factura_orden') return { data: null, error: null }
    return { data: null, error: null }
  }
  S.__setRpc(rpc)
  return { llamadas, responder, rpc }
}

function preparar(S, { orden = ORDEN, items = ITEMS, clientes = CLIENTES } = {}) {
  S.estado.clientes = clientes
  S.estado.catalogo = CAT
  S.estado.catalogoEmpresa = 'u-n'
  S.estado.empresaId = 'u-n'
  S.__tablas.ordenes_retiro = [{ ...orden }]
  S.__tablas.orden_retiro_items = items.map(it => ({ ...it }))
  S.__tablas.v_empleados_publico = [{ id: 'emp-9', nombre: 'Yanina' }]
  S.__tablas.vendedores_comision = VENDEDORES.map(v => ({ ...v }))
  S.__tablas.cliente_comisiones = []
  S.__tablas.orden_facturas = []
}
const el = (S, id) => S.__doc.getElementById(id)
const txt = (S, id) => el(S, id).textContent
const html = (S, id) => el(S, id).innerHTML
const llamadasDe = (S, n) => S.__llamadas.rpc.filter(r => r[0] === n)
const json = (x) => JSON.stringify(x)
async function abrir(S, opciones) {
  const base = baseFalsa(S, opciones)
  await S.abrirOrden('o36')
  await vaciar()
  return base
}

// ── El código de cada punto ────────────────────────────────────────────────
{
  const S = nuevo()
  chk('N-0036 → N1-0036 y N2-0036', S.codigoPunto('N-0036', 'A') === 'N1-0036' && S.codigoPunto('N-0036', 'B') === 'N2-0036')
  chk('D-0045 → D1-0045 y D2-0045', S.codigoPunto('D-0045', 'A') === 'D1-0045' && S.codigoPunto('D-0045', 'B') === 'D2-0045')
  chk('una factura única de antes se sigue llamando así', S.codigoPunto('N-0036', 'UNICA') === 'Factura única')
  chk('la condición: "N1-0036: 40 % · N2-0036: 60 %"', S.textoCondicion('N-0036', 40) === 'N1-0036: 40 % · N2-0036: 60 %')
  chk('con decimales: "N1-0036: 33,5 % · N2-0036: 66,5 %"', S.textoCondicion('N-0036', 33.5) === 'N1-0036: 33,5 % · N2-0036: 66,5 %')
  chk('rotuloParte ya no existe (una sola función arma el código)', !/function rotuloParte\(/.test(src) && !/rotuloParte\(/.test(src))
  chk('los puntos de cada condición: 40/60 los dos, 100/0 solo el N1, 0/100 solo el N2',
    json(S.puntosDePct(40)) === '["A","B"]' && json(S.puntosDePct(100)) === '["A"]' && json(S.puntosDePct(0)) === '["B"]')
  chk('una factura ya cargada no se esconde', json(S.partesFacturaOrden(100, { B: { numero: '0002-1' } })) === '["A","B"]' &&
    json(S.partesFacturaOrden(40, { UNICA: { numero: '1-2' } })) === '["A","B","UNICA"]')
  chk('la condición inicial: la de la orden, si no la del cliente, si no 100/0',
    S.pctInicialFacturar({ division_pct_a: 50 }, CLIENTES[0]) === 50 && S.pctInicialFacturar({ division_pct_a: null }, CLIENTES[0]) === 40 &&
    S.pctInicialFacturar({ division_pct_a: null }, CLIENTES[1]) === 100)
  chk('el nombre del PDF: "Orden de pedido N1-0036 - ICARDI REPRESENTACIONES S.A.pdf"',
    S.nombrePdfPunto({ codigo: 'N-0036', cliente: 'ICARDI REPRESENTACIONES S.A.' }, 'A') === 'Orden de pedido N1-0036 - ICARDI REPRESENTACIONES S.A.pdf')
  chk('y sin letras que un archivo no admite', S.nombrePdfPunto({ codigo: 'N-0036', cliente: 'A/B: "C"' }, 'B') === 'Orden de pedido N2-0036 - A B C.pdf')
}

// ── El papel: cada punto es una orden de pedido aparte ─────────────────────
{
  const S = nuevo()
  preparar(S)
  const { responder } = baseFalsa(S)
  const d = responder('datos_division_orden', { p_pct_a: 40 }).data
  const n1 = S.htmlHojaPunto(d, 'A')
  const n2 = S.htmlHojaPunto(d, 'B')
  chk('el encabezado: "ORDEN DE PEDIDO" y debajo el código', /<header class="opv__cab"><p class="opv__titulo">ORDEN DE PEDIDO<\/p><p class="opv__codigo">N1-0036<\/p><\/header>/.test(n1) &&
    /<p class="opv__codigo">N2-0036<\/p>/.test(n2))
  chk('el encabezado grande y centrado (22 pt / 28 pt, en negrita, letras separadas, una línea debajo)',
    /\.opv__cab \{ text-align: center; border-bottom: 1\.5px solid #111;/.test(src) && /\.opv__titulo \{[^}]*font-size: 22pt; font-weight: 700; letter-spacing:/.test(src) &&
    /\.opv__codigo \{[^}]*font-size: 28pt; font-weight: 700;/.test(src))
  chk('como el PDF aprobado: el recuadro redondeado, Arial y una línea arriba del TOTAL',
    /\.opv \{[^}]*font-family: Arial, Helvetica, sans-serif;[^}]*border: 1px solid #a8a29e; border-radius: 2\.5mm;/.test(src) && /\.opv \.opv__total \{ border-top: 1\.5px solid #111;/.test(src))
  chk('el cliente y el CUIT, y solo "Fecha dd/mm/aaaa"', /ICARDI REPRESENTACIONES S\.A\. · CUIT 30711222333/.test(n1) && /<p class="opv__fecha">Fecha 28\/10\/2026<\/p>/.test(n1))
  chk('sin el % del punto ni "Parte A"', !/%/.test(n1) && !/%/.test(n2) && !/Parte/i.test(n1 + n2))
  chk('sin el número de factura de ARCA, aunque esté cargado', !/Factura/.test(S.htmlHojaPunto({ ...d, facturas: [{ parte: 'A', numero: '0001-00000099' }] }, 'A')))
  chk('sin el pie "Orden N-0036 · total de la orden"', !/total de la orden/.test(n1 + n2) && !/N-0036/.test(n1 + n2) && !/599\.499/.test(n1 + n2))
  chk('la tabla del N1: 24 + 14 cajas', /Cucurucho grande · Caja x 100<\/td><td class="opv__num">24 cajas<\/td><td class="opv__num">\$\s6\.500,00<\/td><td class="opv__num">\$\s156\.000,00/.test(n1) &&
    /14 cajas<\/td><td class="opv__num">\$\s5\.819,44<\/td><td class="opv__num">\$\s81\.472,16/.test(n1))
  chk('el N1: Total productos, el vendedor con monto y SIN %, Total comisiones SIN % y TOTAL',
    /<p>Total productos: \$\s237\.472,16<\/p><p data-comision-vendedor>Vendedor 1: \$\s49\.869,15<\/p><p class="opv__comisiones">Total comisiones: \$\s49\.869,15<\/p><p class="opv__total" data-total-punto>TOTAL: \$\s287\.341,31<\/p>/.test(n1), n1)
  chk('un vendedor en $ 0 no sale', !/Vendedor 2/.test(n1) && !/Vendedor 3/.test(n1))
  chk('el N2: solo el TOTAL', /<div class="opv__totales"><p class="opv__total" data-total-punto>TOTAL: \$\s362\.027,68<\/p><\/div>/.test(n2), n2)
  chk('el N2 no dice NADA del N1 (ni vendedores, ni comisiones, ni su total)', !/Vendedor|comisi|Total productos|287\.341|237\.472/.test(n2))
  chk('nunca "TOTAL PARTE A/B"', !/TOTAL PARTE/.test(n1 + n2) && !/TOTAL PARTE/.test(src))
  chk('el N2 tiene solo sus cajas: 36 + 22', /36 cajas/.test(n2) && /22 cajas/.test(n2) && !/24 cajas/.test(n2))
  const usd = S.htmlHojaPunto(d, 'A', 'USD')
  chk('una orden en dólares dice US$', /TOTAL: US\$\s287\.341,31/.test(usd))
  chk('un punto sin renglones lo dice', /Sin productos\./.test(S.htmlHojaPunto({ ...d, items: [] }, 'B')))
}

// ── La pantalla: la orden valorizada de Icardi ─────────────────────────────
{
  const S = nuevo()
  preparar(S)
  esperas.push(abrir(S).then(({ llamadas }) => {
    chk('al abrir, lee los importes con la condición de la orden (40)', llamadas.length === 1 && llamadas[0][0] === 'datos_division_orden' &&
      json(llamadas[0][1]) === json({ p_orden_id: 'o36', p_pct_a: 40, p_comisiones: null }), json(llamadas))
    chk('abrir no guarda nada', !llamadasDe(S, 'guardar_division_orden').length)
    chk('la orden se lee CON la condición guardada (division_pct_a)', S.__llamadas.consultas.some(c => c[0] === 'ordenes_retiro' && c[1].some(x => x[0] === 'select' && /division_pct_a/.test(x[1]))))
    const h = html(S, 'ad-orden-facturar')
    chk('la pantalla está en el detalle, fuera del cuerpo de la orden', el(S, 'ad-orden-facturar').hidden === false && /id="ad-fc"/.test(h) && !/id="ad-fc"/.test(html(S, 'ad-orden-cuerpo')))
    chk('la condición: "N1-0036: 40 % · N2-0036: 60 %"', txt(S, 'ad-fc-condicion') === 'N1-0036: 40 % · N2-0036: 60 %')
    chk('los botones rápidos 100/0, 80/20, 50/50, 40/60', /data-fc-pct="100"[^>]*>100\/0</.test(h) && /data-fc-pct="80"[^>]*>80\/20</.test(h) && /data-fc-pct="50"[^>]*>50\/50</.test(h) && /data-fc-pct="40"[^>]*>40\/60</.test(h))
    chk('el 40/60 marcado', el(S, 'ad-fc-rapida-40').getAttribute('aria-pressed') === 'true' && el(S, 'ad-fc-rapida-100').getAttribute('aria-pressed') === 'false')
    chk('"Otro % del N1-0036" con el 40', /Otro % del N1-0036/.test(h) && el(S, 'ad-fc-otro').value === '40')
    chk('los 3 vendedores, con el 21 % del Vendedor 1 de la orden', el(S, 'ad-fc-v1').value === '21' && el(S, 'ad-fc-v2').value === '0' && el(S, 'ad-fc-v3').value === '0')
    chk('el N1-0036 y el N2-0036 a la vista', el(S, 'ad-fc-punto-a').hidden === false && el(S, 'ad-fc-punto-b').hidden === false && el(S, 'ad-fc-punto-unica').hidden === true &&
      /N1-0036/.test(h) && /N2-0036/.test(h))
    chk('el N1 con sus importes', /Total productos: \$\s237\.472,16/.test(html(S, 'ad-fc-totales-a')) && /Vendedor 1: \$\s49\.869,15/.test(html(S, 'ad-fc-totales-a')) &&
      /TOTAL: \$\s287\.341,31/.test(html(S, 'ad-fc-totales-a')))
    chk('el N2 con su TOTAL', /TOTAL: \$\s362\.027,68/.test(html(S, 'ad-fc-totales-b')) && !/Vendedor/.test(html(S, 'ad-fc-totales-b')))
    chk('cada uno con su Imprimir y su Compartir PDF, listos', /data-fc-imprimir="A"/.test(h) && /data-fc-compartir="A"/.test(h) && /data-fc-imprimir="B"/.test(h) && /data-fc-compartir="B"/.test(h) &&
      el(S, 'ad-fc-imprimir-a').disabled === false && el(S, 'ad-fc-compartir-b').disabled === false)
    chk('y la carga de su factura de ARCA', /id="ad-fc-numero-a"/.test(h) && /id="ad-fc-numero-b"/.test(h) && /id="ad-fc-pdf-a"/.test(h) && txt(S, 'ad-fc-guardada-a') === 'sin cargar')
    chk('guardado: lo dice', txt(S, 'ad-fc-estado') === 'Guardado.')
    chk('el detalle no repite el bloque de solo lectura "Facturas de ARCA"', !/id="ad-facturas-orden"/.test(html(S, 'ad-orden-cuerpo')))
    chk('ni la comisión común', !/Comisión: sin cargar/.test(html(S, 'ad-orden-cuerpo')) && !/ad-btn-comision/.test(html(S, 'ad-orden-cuerpo')))
    chk('ni "Parte A/B" en ningún lado de la pantalla', !/Parte [AB]\b|PARTE [AB]\b|parte [AB]\b/.test(h + html(S, 'ad-fc-totales-a') + html(S, 'ad-fc-totales-b') + html(S, 'ad-orden-cuerpo')))
  }))
}
{
  // Mientras la base calcula, la condición ya se ve precargada.
  const S = nuevo()
  preparar(S)
  const { rpc } = baseFalsa(S)
  const pendientes = []
  S.__setRpc((n, p) => n === 'datos_division_orden' ? new Promise(r => pendientes.push(() => r(rpc(n, p)))) : rpc(n, p))
  esperas.push(S.abrirOrden('o36').then(async () => {
    await vaciar()
    chk('mientras calcula: "Otro %" ya con el 40 y "Calculando…"', pendientes.length === 1 && el(S, 'ad-fc-otro').value === '40' && txt(S, 'ad-fc-estado') === 'Calculando…')
    pendientes[0]()
    await vaciar()
    chk('y al llegar, los importes', /TOTAL: \$\s362\.027,68/.test(html(S, 'ad-fc-totales-b')))
  }))
}
{
  // La condición guardada en la orden manda sobre la del cliente.
  const S = nuevo()
  preparar(S, { orden: { ...ORDEN, division_pct_a: 50 } })
  esperas.push(abrir(S).then(({ llamadas }) => {
    chk('la de la orden (50) manda sobre la del cliente (40)', llamadas[0][1].p_pct_a === 50 && txt(S, 'ad-fc-condicion') === 'N1-0036: 50 % · N2-0036: 50 %')
  }))
}
{
  // Corregir la valorización: la pantalla de los puntos se esconde mientras tanto.
  const S = nuevo()
  preparar(S)
  esperas.push(abrir(S).then(async () => {
    await S.abrirValorizar()
    await vaciar()
    chk('corrigiendo la valorización, la pantalla de los puntos se esconde', !!S.estado.orden.valorizar && el(S, 'ad-orden-facturar').hidden === true)
    S.cancelarValorizar()
    chk('y al cancelar vuelve, igual que estaba', el(S, 'ad-orden-facturar').hidden === false && txt(S, 'ad-fc-condicion') === 'N1-0036: 40 % · N2-0036: 60 %')
  }))
}
{
  // Sin condición guardada en la orden: la del cliente; y avisa que falta guardarla.
  const S = nuevo()
  preparar(S, { orden: { ...ORDEN, division_pct_a: null } })
  esperas.push(abrir(S).then(({ llamadas }) => {
    chk('la condición del cliente (40) precargada', llamadas[0][1].p_pct_a === 40 && txt(S, 'ad-fc-condicion') === 'N1-0036: 40 % · N2-0036: 60 %')
    chk('dice que todavía no se guardó', /Todavía no se guardó en esta orden/.test(txt(S, 'ad-fc-estado')))
  }))
}
{
  // Un cliente sin pct_parte_a: 100/0, un solo punto.
  const S = nuevo()
  preparar(S, { orden: { ...ORDEN, cliente_id: 'c-pepe', division_pct_a: null } })
  esperas.push(abrir(S).then(({ llamadas }) => {
    chk('sin condición en el cliente: 100/0', llamadas[0][1].p_pct_a === 100 && txt(S, 'ad-fc-condicion') === 'N1-0036: 100 % · N2-0036: 0 %')
    chk('el 100/0 marcado', el(S, 'ad-fc-rapida-100').getAttribute('aria-pressed') === 'true')
    chk('uno solo: el N1-0036', el(S, 'ad-fc-punto-a').hidden === false && el(S, 'ad-fc-punto-b').hidden === true)
  }))
}
{
  // Un cliente del grupo: sin división, como siempre.
  const S = nuevo()
  preparar(S, { orden: { ...ORDEN, cliente_id: 'c-dolce', division_pct_a: null } })
  esperas.push(abrir(S).then(() => {
    chk('cliente del grupo: sin la pantalla de los puntos', el(S, 'ad-orden-facturar').hidden === true && !/ad-fc/.test(html(S, 'ad-orden-facturar')))
    chk('ni llama a la división', !llamadasDe(S, 'datos_division_orden').length && !llamadasDe(S, 'guardar_division_orden').length)
  }))
}
{
  // Sin retiros:precios (solo ver): el bloque de solo lectura, con los códigos nuevos.
  const S = nuevo()
  preparar(S)
  S.estado.misTareas = new Map([['retiros:ver', { unidades: ['u-n'] }]])
  S.__tablas.orden_facturas = [{ parte: 'A', numero_factura: '0001-00000099', archivo_url: null }]
  esperas.push(abrir(S).then(() => {
    const h = html(S, 'ad-orden-cuerpo')
    chk('solo con ver: sin la pantalla de los puntos', el(S, 'ad-orden-facturar').hidden === true && !llamadasDe(S, 'datos_division_orden').length)
    chk('el bloque "Facturas de ARCA" dice la condición con los códigos', /Facturas de ARCA/.test(h) && /N1-0036: 40 % · N2-0036: 60 %\./.test(h))
    chk('y cada punto con su factura', /N1-0036<\/span><span class="ad-facturas-orden__numero">Factura 0001-00000099/.test(h) && /N2-0036<\/span><span class="ad-texto-suave">sin factura cargada/.test(h))
  }))
}
{
  // Sin valorizar: nada de esto.
  const S = nuevo()
  preparar(S, { orden: { ...ORDEN, estado_valorizacion: 'pendiente', total: 0, division_pct_a: null } })
  esperas.push(abrir(S).then(() => chk('sin valorizar: sin la pantalla de los puntos', el(S, 'ad-orden-facturar').hidden === true && !llamadasDe(S, 'datos_division_orden').length)))
}

// ── Cambiar la condición o un vendedor: se guarda solo ─────────────────────
{
  const S = nuevo()
  preparar(S)
  esperas.push(S.cargarOrdenes().then(() => abrir(S)).then(async ({ llamadas }) => {
    S.elegirPctFacturar(50)
    chk('tocar 50/50: la condición cambia en el momento', txt(S, 'ad-fc-condicion') === 'N1-0036: 50 % · N2-0036: 50 %' && el(S, 'ad-fc-otro').value === '50')
    chk('y espera el retardo (no llama todavía)', !llamadasDe(S, 'guardar_division_orden').length)
    chk('"Guardando…" mientras tanto, y los botones esperan', txt(S, 'ad-fc-estado') === 'Guardando…' && el(S, 'ad-fc-imprimir-a').disabled === true && el(S, 'ad-fc-compartir-b').disabled === true)
    chk('el retardo es corto (400 ms)', [...S.__win.__relojes.values()].some(r => r.ms === 400))
    await correrRelojes(S)
    const g = llamadasDe(S, 'guardar_division_orden')
    chk('guarda con guardar_division_orden: 50 y los 3 vendedores', g.length === 1 &&
      json(g[0][1]) === json({ p_orden_id: 'o36', p_pct_a: 50, p_comisiones: [{ vendedor_id: 'v1', pct: 21 }, { vendedor_id: 'v2', pct: 0 }, { vendedor_id: 'v3', pct: 0 }] }), json(g))
    chk('y recalcula los importes en pantalla (30 + 18 cajas en el N1)', /Total productos: \$\s299\.749,92/.test(html(S, 'ad-fc-totales-a')), html(S, 'ad-fc-totales-a'))
    chk('después: "Guardado." y los botones listos', txt(S, 'ad-fc-estado') === 'Guardado.' && el(S, 'ad-fc-imprimir-a').disabled === false)
    chk('la 50/50 marcada', el(S, 'ad-fc-rapida-50').getAttribute('aria-pressed') === 'true' && el(S, 'ad-fc-rapida-40').getAttribute('aria-pressed') === 'false')
    chk('la orden abierta se entera', S.estado.orden.orden.division_pct_a === 50)
    chk('y la fila del listado también', S.estado.ordenes.find(o => o.id === 'o36').division_pct_a === 50)
  }))
}
{
  // Otro %: tipear varias teclas manda UNA llamada, con lo último.
  const S = nuevo()
  preparar(S)
  esperas.push(abrir(S).then(async () => {
    S.escribirPctFacturar(3)
    S.escribirPctFacturar(33)
    S.escribirPctFacturar(33.5)
    chk('tipear no llama en cada tecla', !llamadasDe(S, 'guardar_division_orden').length)
    chk('queda un solo retardo vivo', S.__win.__relojes.size === 1)
    await correrRelojes(S)
    const g = llamadasDe(S, 'guardar_division_orden')
    chk('otro %: UNA llamada con 33,5', g.length === 1 && g[0][1].p_pct_a === 33.5)
    chk('la condición: "N1-0036: 33,5 % · N2-0036: 66,5 %"', txt(S, 'ad-fc-condicion') === 'N1-0036: 33,5 % · N2-0036: 66,5 %')
    S.escribirPctFacturar(100)
    await correrRelojes(S)
    chk('100: un solo punto', el(S, 'ad-fc-punto-a').hidden === false && el(S, 'ad-fc-punto-b').hidden === true)
    S.escribirPctFacturar(0)
    await correrRelojes(S)
    chk('0: solo el N2', el(S, 'ad-fc-punto-a').hidden === true && el(S, 'ad-fc-punto-b').hidden === false)
  }))
}
{
  // Un % que no sirve: no llama y lo dice.
  const S = nuevo()
  preparar(S)
  esperas.push(abrir(S).then(async () => {
    S.escribirPctFacturar(null)
    await correrRelojes(S)
    chk('vacío no llama', !llamadasDe(S, 'guardar_division_orden').length)
    chk('y lo dice con el código del punto', txt(S, 'ad-fc-error') === 'El % del N1-0036 va de 0 a 100.' && el(S, 'ad-fc-error').hidden === false)
    S.cambiarVendedorFacturar('v2', null)
    S.escribirPctFacturar(40)
    await correrRelojes(S)
    chk('un vendedor vacío tampoco: el texto de la base', !llamadasDe(S, 'guardar_division_orden').length && txt(S, 'ad-fc-error') === 'Las comisiones van de 0 a 100.')
  }))
}
{
  // Una comisión editada recalcula.
  const S = nuevo()
  preparar(S)
  esperas.push(abrir(S).then(async () => {
    S.cambiarVendedorFacturar('v2', 5)
    await correrRelojes(S)
    const g = llamadasDe(S, 'guardar_division_orden')
    chk('cambiar el Vendedor 2 manda los 3', g.length === 1 && json(g[0][1].p_comisiones) === json([{ vendedor_id: 'v1', pct: 21 }, { vendedor_id: 'v2', pct: 5 }, { vendedor_id: 'v3', pct: 0 }]))
    const a = html(S, 'ad-fc-totales-a')
    chk('y aparece con su monto (5 % de 237.472,16)', /Vendedor 2: \$\s11\.873,61/.test(a), a)
    chk('Total comisiones y TOTAL recalculados', /Total comisiones: \$\s61\.742,76/.test(a) && /TOTAL: \$\s299\.214,92/.test(a))
    chk('el N2 no cambia', /TOTAL: \$\s362\.027,68/.test(html(S, 'ad-fc-totales-b')))
  }))
}
{
  // Una respuesta vieja no pisa a una nueva, y nunca hay dos en camino.
  const S = nuevo()
  preparar(S)
  esperas.push(abrir(S).then(async ({ rpc }) => {
    const pendientes = []
    S.__setRpc((n, p) => n === 'guardar_division_orden' ? new Promise(r => pendientes.push({ p, soltar: () => r(rpc(n, p)) })) : rpc(n, p))
    S.elegirPctFacturar(80)
    await correrRelojes(S)
    chk('el primero viaja', pendientes.length === 1 && pendientes[0].p.p_pct_a === 80)
    S.elegirPctFacturar(50)
    await correrRelojes(S)
    chk('el segundo espera a que vuelva el primero (nunca dos en camino)', pendientes.length === 1)
    chk('mientras, "Guardando…"', txt(S, 'ad-fc-estado') === 'Guardando…')
    pendientes[0].soltar()
    await vaciar()
    chk('la respuesta vieja (80) NO pisa lo de la pantalla (50)', txt(S, 'ad-fc-condicion') === 'N1-0036: 50 % · N2-0036: 50 %' &&
      /Total productos: \$\s237\.472,16/.test(html(S, 'ad-fc-totales-a')) && !/474\.944,32/.test(html(S, 'ad-fc-totales-a')), html(S, 'ad-fc-totales-a'))
    chk('y sale el segundo, con lo último', pendientes.length === 2 && pendientes[1].p.p_pct_a === 50)
    pendientes[1].soltar()
    await vaciar()
    chk('al final: los importes del 50', /Total productos: \$\s299\.749,92/.test(html(S, 'ad-fc-totales-a')) && txt(S, 'ad-fc-estado') === 'Guardado.')
    chk('y la base termina con 50', S.__tablas.ordenes_retiro[0].division_pct_a === 50)
  }))
}
{
  // El error de la base, tal cual, al lado.
  const S = nuevo()
  preparar(S)
  esperas.push(abrir(S, { errorGuardar: 'No tenés permiso sobre esta orden.' }).then(async () => {
    S.elegirPctFacturar(80)
    await correrRelojes(S)
    chk('el error de la base TAL CUAL', txt(S, 'ad-fc-error') === 'No tenés permiso sobre esta orden.' && el(S, 'ad-fc-error').hidden === false)
    chk('sin "Guardando…" ni "Guardado."', txt(S, 'ad-fc-estado') === '')
    chk('y no se imprime algo que no quedó guardado', el(S, 'ad-fc-imprimir-a').disabled === true)
  }))
}
{
  // Salir de la orden con un cambio esperando el retardo: se guarda igual.
  const S = nuevo()
  preparar(S)
  esperas.push(abrir(S).then(async () => {
    S.elegirPctFacturar(80)
    S.cerrarFacturar()
    await vaciar()
    chk('al salir con un cambio esperando, se guarda igual', llamadasDe(S, 'guardar_division_orden').length === 1 && llamadasDe(S, 'guardar_division_orden')[0][1].p_pct_a === 80)
  }))
}

// ── Valorizar: en la misma pantalla, y la fila del listado al día ──────────
{
  const S = nuevo()
  const pendiente = { ...ORDEN, estado_valorizacion: 'pendiente', total: 0, division_pct_a: null }
  preparar(S, { orden: pendiente, items: ITEMS.map(it => ({ ...it, precio_caja: null, subtotal: null })) })
  S.__tablas.lista_precios_items = [{ presentacion_id: 'pr1', precio_caja: 6500, vigente_desde: '2026-10-01' }, { presentacion_id: 'pr2', precio_caja: 5819.44, vigente_desde: '2026-10-01' }]
  S.__tablas.cliente_movimientos = []
  const { rpc } = baseFalsa(S)
  const PV = { pr1: 6500, pr2: 5819.44 }
  S.__setRpc(async (n, p) => {
    if (n === 'precio_venta') return { data: { precio_caja: PV[p.p_presentacion_id], producto_unitario: 1, conito_unitario: 0, lista: 'Lista 1', sin_precio: false }, error: null }
    if (n === 'valorizar_orden_retiro') {
      for (const it of S.__tablas.orden_retiro_items) { it.precio_caja = p.p_precios[it.id]; it.subtotal = r2(it.cajas * it.precio_caja) }
      const o = S.__tablas.ordenes_retiro[0]
      o.estado_valorizacion = 'valorizada'
      o.total = 599499.84
      return { data: { total: 599499.84, moneda: 'ARS', saldo_cliente: 0, limite_credito: null, supera_limite: false }, error: null }
    }
    return rpc(n, p)
  })
  esperas.push(S.cargarOrdenes().then(async () => {
    const lista = () => html(S, 'ad-ordenes-lista')
    chk('el listado: la N-0036 "sin valorizar"', /N-0036/.test(lista()) && /sin valorizar/.test(lista()))
    await S.abrirOrden('o36')
    await S.abrirValorizar()
    await vaciar()
    await S.guardarValorizacion()
    await vaciar()
    chk('la fila del listado queda al día SIN recargar: "Valorizada" y el total', /Valorizada/.test(lista()) && /\$\s599\.499,84/.test(lista()) && !/sin valorizar/.test(lista()), lista())
    chk('el listado nunca quedó en "Cargando…"', Array.isArray(S.estado.ordenes) && !/Cargando/.test(lista()))
    const g = llamadasDe(S, 'guardar_division_orden')
    chk('al valorizar, la condición del cliente se guarda sola (40)', g.length === 1 && g[0][1].p_pct_a === 40 && g[0][1].p_comisiones === null, json(g))
    chk('y en la misma pantalla: la condición y los dos puntos', txt(S, 'ad-fc-condicion') === 'N1-0036: 40 % · N2-0036: 60 %' && el(S, 'ad-fc-punto-a').hidden === false &&
      el(S, 'ad-fc-punto-b').hidden === false && /TOTAL: \$\s362\.027,68/.test(html(S, 'ad-fc-totales-b')))
    chk('"Guardado."', txt(S, 'ad-fc-estado') === 'Guardado.')
    chk('sin pasar por "Dividir para facturar"', !/Dividir para facturar/.test(src.replace(/\/\/.*$/gm, '').replace(/<!--[\s\S]*?-->/g, '')))
    chk('la fila sabe de la condición guardada', S.estado.ordenes.find(o => o.id === 'o36').division_pct_a === 40)
  }))
}
{
  // Un cliente del grupo: valorizar no guarda división.
  const S = nuevo()
  preparar(S, { orden: { ...ORDEN, cliente_id: 'c-dolce', estado_valorizacion: 'pendiente', total: 0, division_pct_a: null }, items: ITEMS.map(it => ({ ...it, precio_caja: null, subtotal: null })) })
  S.__tablas.cliente_movimientos = []
  const { rpc } = baseFalsa(S)
  S.__setRpc(async (n, p) => {
    if (n === 'precio_venta') return { data: { precio_caja: 100, producto_unitario: 1, conito_unitario: 0, lista: 'Interna', sin_precio: false }, error: null }
    if (n === 'valorizar_orden_retiro') { S.__tablas.ordenes_retiro[0].estado_valorizacion = 'valorizada'; return { data: { total: 9600, moneda: 'ARS' }, error: null } }
    return rpc(n, p)
  })
  esperas.push(S.abrirOrden('o36').then(() => S.abrirValorizar()).then(async () => {
    await vaciar()
    await S.guardarValorizacion()
    await vaciar()
    chk('cliente del grupo: valorizar no toca la división', !llamadasDe(S, 'guardar_division_orden').length && !llamadasDe(S, 'datos_division_orden').length)
  }))
}

// ── Imprimir y compartir: un documento por punto ───────────────────────────
{
  const S = nuevo()
  preparar(S)
  esperas.push(abrir(S).then(async () => {
    S.imprimirPunto('B')
    const papel = html(S, 'ad-impresion')
    chk('imprimir el N2 saca SOLO el N2', /data-punto="B"/.test(papel) && !/data-punto="A"/.test(papel) && /N2-0036/.test(papel) && !/N1-0036/.test(papel))
    chk('en A4 vertical', /@page \{ size: A4 portrait/.test(papel))
    chk('y se imprime', S.__impresiones() === 1)
    S.imprimirPunto('A')
    const p1 = html(S, 'ad-impresion')
    chk('imprimir el N1 saca SOLO el N1', /data-punto="A"/.test(p1) && !/data-punto="B"/.test(p1) && /Vendedor 1: \$\s49\.869,15/.test(p1))
    S.elegirPctFacturar(80)
    S.imprimirPunto('A')
    chk('mientras se guarda un cambio, no imprime (los importes no son los últimos)', S.__impresiones() === 2)
    await correrRelojes(S)
    const compartidos = []
    S.__setNav({ canShare: () => true, share: async (x) => { compartidos.push(x) } })
    await S.compartirPunto('A')
    chk('compartir el N1: UN PDF', S.__win.__pdfs.length === 1 && compartidos.length === 1 && compartidos[0].files.length === 1)
    chk('con el nombre "Orden de pedido N1-0036 - ICARDI REPRESENTACIONES S.A.pdf"', compartidos[0].files[0].name === 'Orden de pedido N1-0036 - ICARDI REPRESENTACIONES S.A.pdf')
    chk('y adentro solo el N1', /data-punto="A"/.test(S.__win.__fotos[0]) && !/data-punto="B"/.test(S.__win.__fotos[0]))
    await S.compartirPunto('B')
    chk('compartir el N2: OTRO PDF, propio', S.__win.__pdfs.length === 2 && compartidos[1].files[0].name === 'Orden de pedido N2-0036 - ICARDI REPRESENTACIONES S.A.pdf')
    chk('y adentro nada del N1', /data-punto="B"/.test(S.__win.__fotos[1]) && !/data-punto="A"/.test(S.__win.__fotos[1]) && !/Vendedor/.test(S.__win.__fotos[1]))
  }))
}
{
  // Con 100/0, el N2 no se imprime ni se comparte.
  const S = nuevo()
  preparar(S, { orden: { ...ORDEN, cliente_id: 'c-pepe', division_pct_a: null } })
  esperas.push(abrir(S).then(async () => {
    S.imprimirPunto('B')
    await S.compartirPunto('B')
    chk('100/0: el N2 no existe (ni papel ni PDF)', S.__impresiones() === 0 && S.__win.__pdfs.length === 0)
  }))
}

// ── Las facturas de ARCA de cada punto ─────────────────────────────────────
{
  const S = nuevo()
  preparar(S)
  esperas.push(S.cargarOrdenes().then(() => abrir(S)).then(async () => {
    el(S, 'ad-fc-numero-a').value = ' 0001-00000123 '
    el(S, 'ad-ordenes-lista').innerHTML = ''
    await S.guardarFacturaPunto('A')
    const r = llamadasDe(S, 'guardar_factura_orden')
    chk('la factura del N1: guardar_factura_orden con parte A', r.length === 1 && json(r[0][1]) === json({ p_orden_id: 'o36', p_parte: 'A', p_numero: '0001-00000123', p_archivo_url: null }))
    chk('la fila del listado se repinta', /N-0036/.test(html(S, 'ad-ordenes-lista')))
    chk('el aviso con el código del punto', S.__llamadas.exitos.some(m => m === 'N1-0036: se guardó la factura 0001-00000123.'))
    chk('se ve al lado del punto', txt(S, 'ad-fc-guardada-a') === 'Factura 0001-00000123')
    el(S, 'ad-fc-numero-b').value = '0002-00000456'
    el(S, 'ad-fc-pdf-b').files = [{ name: 'f.pdf', type: 'application/pdf' }]
    S.estado.sesion = { user: { id: 'uid-1' } }
    await S.guardarFacturaPunto('B')
    chk('el PDF del N2 se sube en la carpeta del usuario', S.__win.__subidas.length === 1 && S.__win.__subidas[0][1] === 'uid-1/facturas-venta/u-n/2026/N-0036-B.pdf')
    chk('y la factura va con parte B y la ruta', llamadasDe(S, 'guardar_factura_orden')[1][1].p_parte === 'B' && llamadasDe(S, 'guardar_factura_orden')[1][1].p_archivo_url === 'uid-1/facturas-venta/u-n/2026/N-0036-B.pdf')
    chk('el aviso del N2', S.__llamadas.exitos.some(m => m === 'N2-0036: se guardó la factura 0002-00000456.'))
    chk('y después ofrece verlo', el(S, 'ad-fc-ver-pdf-b').hidden === false)
    el(S, 'ad-fc-numero-a').value = '12'
    await S.guardarFacturaPunto('A')
    chk('un número corto no llama, y lo dice', llamadasDe(S, 'guardar_factura_orden').length === 2 && txt(S, 'ad-fc-factura-error-a') === 'Pegá el número de la factura de ARCA.')
    S.__setRpc(async () => ({ data: null, error: { message: 'La orden está anulada.' } }))
    el(S, 'ad-fc-numero-a').value = '0001-00000124'
    await S.guardarFacturaPunto('A')
    chk('el error de la base TAL CUAL', txt(S, 'ad-fc-factura-error-a') === 'La orden está anulada.' && el(S, 'ad-fc-factura-a').disabled === false)
  }))
}

// ── El listado se relee solo ───────────────────────────────────────────────
{
  const S = nuevo()
  preparar(S, { orden: { ...ORDEN, estado_valorizacion: 'pendiente', total: 0, division_pct_a: null } })
  baseFalsa(S)
  esperas.push(S.cargarOrdenes().then(async () => {
    chk('arranca "sin valorizar"', /sin valorizar/.test(html(S, 'ad-ordenes-lista')))
    await S.abrirOrden('o36')
    // En la compu (lista | detalle) la lista sigue a la vista con la orden abierta.
    el(S, 'ad-vista-ordenes').hidden = false
    // Otra persona la valorizó desde otra compu.
    Object.assign(S.__tablas.ordenes_retiro[0], { estado_valorizacion: 'valorizada', total: 599499.84 })
    S.__doc.hidden = true
    await S.releerOrdenesEnSilencio()
    chk('con la pestaña escondida no lee', /sin valorizar/.test(html(S, 'ad-ordenes-lista')))
    S.__doc.hidden = false
    const ordenAntes = S.estado.orden
    await S.releerOrdenesEnSilencio()
    chk('al volver a la pestaña se relee y la fila queda al día', /Valorizada/.test(html(S, 'ad-ordenes-lista')) && /\$\s599\.499,84/.test(html(S, 'ad-ordenes-lista')))
    chk('sin perder la orden abierta', S.estado.orden === ordenAntes && S.estado.vista === 'ad-vista-orden')
    el(S, 'ad-vista-ordenes').hidden = true
    Object.assign(S.__tablas.ordenes_retiro[0], { total: 1 })
    await S.releerOrdenesEnSilencio()
    chk('con el listado fuera de la vista, no lee', /599\.499,84/.test(html(S, 'ad-ordenes-lista')))
  }))
}
{
  const S = nuevo()
  chk('se relee al volver a la pestaña (visibilitychange y focus)', /addEventListener\('visibilitychange', \(\) => \{ if \(!document\.hidden\) releerOrdenesEnSilencio\(\) \}\)/.test(src) &&
    /window\.addEventListener\('focus', \(\) => releerOrdenesEnSilencio\(\)\)/.test(src))
  chk('y cada 60 segundos mientras se ve', S.RELEER_ORDENES_CADA === 60000 && /setInterval\(\(\) => releerOrdenesEnSilencio\(\), RELEER_ORDENES_CADA\)/.test(src))
  chk('releer no pasa por "Cargando…" (no vacía la lista)', !/estado\.ordenes = null/.test(S.releerOrdenesEnSilencio.toString()))
  chk('valorizar y anular ya no vacían la lista: actualizan la fila', !/estado\.ordenes = null/.test(S.guardarValorizacion.toString()) && !/estado\.ordenes = null/.test(S.confirmarAnular.toString()) &&
    /actualizarFilaOrden\(/.test(S.guardarValorizacion.toString()) && /actualizarFilaOrden\(/.test(S.confirmarAnular.toString()))
}

// ── "Parte A/B" en ningún lado de lo que se ve ─────────────────────────────
{
  // Sin los comentarios: lo que queda es lo que se ve (o arma lo que se ve).
  const visible = src.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
  const malos = visible.split('\n').filter(l => /Parte [AB]\b|PARTE [AB]\b|parte [AB]\b|\$\{[^}]*\}-\$\{parte\}|-A['"`]|-B['"`]/.test(l) && !/rutaPdfFactura|facturas-venta/.test(l))
  chk('nada dice "Parte A/B" ni "N-0036-A"', malos.length === 0, malos.join('\n'))
}

// ── XSS ────────────────────────────────────────────────────────────────────
{
  const S = nuevo()
  preparar(S)
  const { responder } = baseFalsa(S)
  const d = responder('datos_division_orden', { p_pct_a: 40 }).data
  const m = { ...d, codigo: 'N-' + marca('codigo'), cliente: marca('cliente'), cliente_cuit: marca('cuit'),
    items: [{ ...d.items[0], descripcion: marca('desc'), unidad: marca('unidad') }, d.items[1]],
    comisiones: [{ ...d.comisiones[0], nombre: marca('vendedor') }] }
  chequearMarcas(chk, 'la orden de pedido del N1', S.htmlHojaPunto(m, 'A'), ['codigo', 'cliente', 'cuit', 'desc', 'vendedor'])
  const ins = { ...d, items: [{ ...d.items[0], unidad: marca('unidad'), cant_b: 2 }] }
  chequearMarcas(chk, 'la unidad de un insumo en la hoja del N2', S.htmlHojaPunto(ins, 'B'), ['unidad'])
  chequearMarcas(chk, 'los totales del N1 en pantalla', S.htmlTotalesPunto(m, 'A'), ['vendedor'])
  const fc = { codigo: 'N-' + marca('codigo-fc'), facturas: { A: { numero: marca('numero-fc') } } }
  chequearMarcas(chk, 'un punto en pantalla', S.htmlPuntoFacturar(fc, 'A'), ['codigo-fc', 'numero-fc'])
  S.estado.clientes = CLIENTES
  S.estado.facturar = { ordenId: 'o36', codigo: 'N-' + marca('codigo-p'), moneda: 'ARS', facturas: {}, cargas: {}, puntos: {}, comisiones: null, pctA: 40, datos: null, cargando: true }
  S.pintarFacturar()
  chequearMarcas(chk, 'la pantalla de los puntos', html(S, 'ad-orden-facturar'), ['codigo-p'])
  chequearMarcas(chk, 'el bloque de solo lectura', S.htmlFacturasOrden({ orden: { ...ORDEN, codigo: 'N-' + marca('codigo-o') }, facturas: [{ parte: 'A', numero: marca('numero-o') }] }), ['codigo-o', 'numero-o'])
}
{
  const S = nuevo()
  preparar(S)
  esperas.push(abrir(S, { errorGuardar: marca('error-base') }).then(async () => {
    S.elegirPctFacturar(80)
    await correrRelojes(S)
    chk('el error de la base va como texto (textContent)', txt(S, 'ad-fc-error') === marca('error-base'))
  }))
}
{
  // El aviso de la base al leer (va en HTML).
  const S = nuevo()
  preparar(S)
  S.__setRpc(async (n) => n === 'datos_division_orden' ? { data: null, error: { message: marca('aviso-base') } } : { data: null, error: null })
  esperas.push(S.abrirOrden('o36').then(async () => {
    await vaciar()
    chequearMarcas(chk, 'el aviso de la base al leer los importes', html(S, 'ad-fc-aviso'), ['aviso-base'])
    chk('y los vendedores salen igual (los propios o la configuración)', el(S, 'ad-fc-v1').value === '2')
  }))
}

fin()
