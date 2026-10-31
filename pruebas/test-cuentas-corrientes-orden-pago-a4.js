// CUENTAS CORRIENTES: LA ORDEN DE PAGO A4 (31/10/2026, rama
// ci-prueba/orden-pago-a4).
//
// Pedido de Facu (31/10/2026), la hoja de la orden de pago:
//  - UNA sola hoja A4, sin ORIGINAL ni DUPLICADO; arriba la empresa (logo,
//    razón social, CUIT, domicilio), el número y la fecha; el proveedor.
//  - "Con qué se pagó": los cheques en tabla compacta (banco, número, fecha
//    de pago, importe) SIN librador, SIN cliente y SIN "entregado por";
//    "Transferencias" (cuenta e importe) y "Efectivo", cada uno con su subtotal.
//  - "Facturas que cancela": comprobante, fecha, importe, lo aplicado en este
//    pago y lo que le queda; si ya tenía pagos o créditos anteriores, un
//    subrenglón chico que lo diga.
//  - Los totales en dos cajas a la misma altura: subtotales por medio +
//    TOTAL PAGADO | TOTAL FACTURAS.
//  - La franja: "Queda saldo pendiente $ X", "Queda a favor de [empresa] $ X"
//    o "Facturas canceladas".
//  - UNA línea "Saldo de la cuenta: $ X" (deuda_pendiente − credito_disponible
//    de v_saldo_proveedor), "le debemos" o "a nuestro favor".
//  - El total y el "Son … pesos" de datos_orden_pago.total (el vivo). Si
//    anulada = true, tachada "ANULADA" y sin imprimir.
//  - Firmas; solo las observaciones de la orden; "Enviar" = navigator.share
//    con el PDF, sin share se descarga; todo texto de la base escapado.
//
// Se EJECUTAN las funciones reales del módulo con un document, una base, un
// html2canvas, un jsPDF y un navigator falsos (en este contenedor cdnjs no
// carga). La hoja impresa de verdad (UNA A4 con muchos cheques y facturas,
// las cajas a la misma altura, 390 y 1280 px) la mide e2e/117-orden-pago-a4.spec.js.
//
//   node pruebas/test-cuentas-corrientes-orden-pago-a4.js
'use strict'

const path = require('path')
const { construirCon } = require('./sandbox')
const { arnes, leer, marca, chequearMarcas } = require('./circuito-comun')
const { fuenteNumeros } = require('./numeros-comun')
const { FUNCIONES_PAGO_APLICAR } = require('./pago-aplicar-comun')
const { FUNCIONES_ORDEN_PAGO_A4, CONSTANTES_ORDEN_PAGO_A4 } = require('./orden-pago-a4-comun')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/cuentas-corrientes.html')
const FUENTE = leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

const PRELUDIO = `
  ${fuenteNumeros()}
  var console = { log(){}, warn(){}, error(){} }
  function nuevoEl(id, tag) {
    const clases = new Set()
    const el = { id, tagName: tag, value: '', innerHTML: '', textContent: '', hidden: false, disabled: false, style: {}, dataset: {}, hijos: [],
      className: '',
      classList: { add(c) { clases.add(c) }, remove(c) { clases.delete(c) }, contains(c) { return clases.has(c) } },
      addEventListener() {}, focus() { __foco = id },
      appendChild(h) { el.hijos.push(h); h.padre = el; if (h.tagName === 'script') __scripts.push(h); if (h.tagName === 'div' && el.id === 'body') __montados.push(h); return h },
      remove() { el.quitado = true },
      querySelectorAll() { return [] },
      click() { if (tag === 'a') __descargas.push({ href: el.href, download: el.download }) },
    }
    return el
  }
  var __foco = null, __scripts = [], __montados = [], __descargas = [], __errores = [], __exitos = []
  var __els = new Map()
  var document = {
    getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) },
    createElement(tag) { return nuevoEl(null, tag) },
    querySelector() { return null },
    documentElement: nuevoEl('html'),
    body: nuevoEl('body'), head: nuevoEl('head'),
  }
  var __impresiones = 0
  var __pdf = { lienzos: [], imagenes: [] }
  // Los dobles de html2canvas y jsPDF (cdnjs no carga en este contenedor)
  // los pone cada prueba en window.
  var window = { print() { __impresiones++ }, addEventListener() {}, removeEventListener() {} }
  var __nav = {}
  var navigator = __nav
  function File(partes, nombre, op) { this.partes = partes; this.name = nombre; this.type = op && op.type }
  var URL = { createObjectURL(b) { return 'blob:orden' }, revokeObjectURL() {} }
  function setTimeout() {}
  function mostrarError(m) { __errores.push(m) }
  function mostrarExito(m) { __exitos.push(m) }
  // La base: tablas en memoria, con los filtros que usan las lecturas.
  var __db = { ordenes_pago: [], gastos: [], aplicaciones_pago: [], aplicaciones_credito: [], facturas_pendientes: [], v_saldo_proveedor: [] }
  var __fallar = new Set(), __consultas = []
  var __rpc = [], __respuestas = {}
  var supabase = {
    rpc: async (nombre, params) => { __rpc.push({ nombre, params: JSON.parse(JSON.stringify(params)) }); return __respuestas[nombre] ?? { data: null, error: null } },
    from(t) {
      const filtros = [], q = { t, sel: null, uno: false }
      const c = {
        select(s) { q.sel = s; return c },
        eq(k, v) { filtros.push(r => r[k] === v); return c },
        in(k, v) { filtros.push(r => v.includes(r[k])); return c },
        maybeSingle() { q.uno = true; return c },
        then(ok, mal) {
          __consultas.push(q)
          if (__fallar.has(t)) return Promise.resolve({ data: null, error: { message: 'sin permiso' } }).then(ok, mal)
          const filas = (__db[t] ?? []).filter(r => filtros.every(f => f(r)))
          return Promise.resolve({ data: q.uno ? (filas[0] ?? null) : filas, error: null }).then(ok, mal)
        },
      }
      return c
    },
  }
  var turnoOrdenPago = 0
  var ordenPagoActual = null
  function formatearFecha(f) { if (!f) return '—'; const [a, m, d] = String(f).split('-'); return d + '/' + m + '/' + a }
`

const FUNCIONES = [
  'esc', 'formatearImporte', 'importeHtml', 'numeroParaMostrar',
  'logoSeguroCC', 'cuitConGuiones', 'fechaOrden', 'letrasMenorDeMil', 'letrasMenorDeMillon', 'enteroEnLetras', 'importeEnLetras',
  'htmlOrdenPago', 'lineaSaldoOrdenPago', 'leerSaldoOrdenPago', 'abrirOrdenPago', 'cerrarOrdenPago', 'imprimirOrdenPago',
  ...FUNCIONES_PAGO_APLICAR,
  // la orden de pago A4 (31/10/2026)
  ...FUNCIONES_ORDEN_PAGO_A4,
]
const CONSTANTES = ['NUMERO_SALDO_INICIAL', 'LETRAS_UNIDAD', 'LETRAS_DECENA', 'LETRAS_CENTENA', 'NOMBRE_MEDIO_ORDEN', ...CONSTANTES_ORDEN_PAGO_A4]

function sandbox() {
  return construirCon(ARCHIVO, {
    preludio: PRELUDIO, funciones: FUNCIONES, constantes: CONSTANTES,
    retorno: `__els, __db, __fallar, __consultas, __rpc, __responder(n, r){ __respuestas[n] = r }, __impresiones(){ return __impresiones },
      __doc: document, __win: window, __nav, __pdf, __scripts, __montados, __descargas, __errores, __exitos, __foco(){ return __foco },
      __actual(){ return ordenPagoActual }, __setActual(x){ ordenPagoActual = x }`,
  })
}

// ── Leer la hoja que devolvió el render (texto, no regex sobre el código) ──
const sinEtiquetas = (h) => String(h ?? '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
// El trozo que empieza en el primer elemento con esa clase y termina donde
// cierra (contando los <div> que abren y cierran).
function bloque(html, clase) {
  const re = new RegExp(`<(div|table|p|tr)\\b[^>]*class="(?:[^"]* )?${clase}(?: [^"]*)?"`)
  const m = re.exec(html)
  if (!m) return null
  const tag = m[1]
  let i = m.index, prof = 0
  const abre = new RegExp(`<${tag}\\b`, 'g'), cierra = new RegExp(`</${tag}>`, 'g')
  for (let p = i; p < html.length;) {
    abre.lastIndex = p; cierra.lastIndex = p
    const a = abre.exec(html), c = cierra.exec(html)
    if (!c) return html.slice(i)
    if (a && a.index < c.index) { prof++; p = a.index + 1 } else { prof--; p = c.index + c[0].length; if (prof === 0) return html.slice(i, p) }
  }
  return html.slice(i)
}
const todos = (html, clase) => { const r = []; let h = html; for (;;) { const b = bloque(h, clase); if (!b) return r; r.push(b); h = h.slice(h.indexOf(b) + b.length) } }
// Las filas de una tabla: { cabecera, filas, pie }.
function tabla(trozo) {
  if (!trozo || !trozo.includes('<table')) return null
  const celdas = (fila, tag) => fila.split(new RegExp(`<${tag}(?=[ >])`)).slice(1).map(c => sinEtiquetas('<x' + c.slice(0, c.indexOf(`</${tag}>`))))
  const parte = (a, b) => trozo.includes(a) ? trozo.slice(trozo.indexOf(a), trozo.indexOf(b)) : ''
  const filas = (t) => t.split(/<tr(?=[ >])/).slice(1).map(f => celdas(f, f.includes('<th') ? 'th' : 'td'))
  return { cabecera: celdas(parte('<thead>', '</thead>'), 'th'), filas: filas(parte('<tbody>', '</tbody>')), pie: filas(parte('<tfoot>', '</tfoot>')) }
}

const ORDEN = {
  id: 'op-5', numero_texto: 'N-OP-00005', fecha: '2026-10-31', total: 1350000.5, total_original: 1400000, anulada: false,
  observaciones: 'Retira Juan', creada_por: 'Facu',
  emisor: { empresa: 'Cucuruchos Nuss', razon_social: 'PAZ MIRTA', cuit: '20924106795', domicilio: 'Unión 843, Córdoba', logo_url: 'logo-cucuruchos-nuss.png' },
  proveedor: { razon_social: 'ANATOLIA SRL', cuit: '30712345678', direccion: 'Ruta 9 km 5' },
  facturas: [
    { tipo: 'Factura A', numero: '0003-00001201', fecha: '2026-08-20', importe: 900000, aplicado: 700000, saldo_actual: 0 },
    { tipo: 'factura', numero: '0003-00001245', fecha: '2026-09-05', importe: 800000, aplicado: 650000.5, saldo_actual: 149999.5 },
  ],
  cheques: [
    { banco: 'BANCO DE GALICIA', numero: '62921151', fecha_pago: '2026-11-15', librador: [{ nombre: 'HELADERIA LOPEZ SA', cuit: '30700000001' }], es_echeq: true, importe: 500000, de_empresa: 'Dolce Pasta', otra_empresa: true },
    { banco: 'MACRO', numero: '00012345', fecha_pago: '2026-11-30', librador: [{ nombre: 'KIOSCO EL SOL', cuit: '20300000002' }], es_echeq: false, importe: 350000, de_empresa: 'Cucuruchos Nuss', otra_empresa: false },
  ],
  otros_medios: [
    { medio: 'transferencia', cuenta: 'Banco Macro CC 123', importe: 400000.5 },
    { medio: 'efectivo', cuenta: 'Caja chica Nuss', importe: 100000 },
  ],
  a_favor: 0,
}
const t = (h) => sinEtiquetas(h)

async function main() {
  // ══ 1. UNA HOJA: la cabecera, el proveedor y las dos columnas ═════════════
  {
    const S = sandbox()
    const h = S.htmlOrdenPago(ORDEN, { saldo: { deuda: 1, credito: 0 } })
    chk('una sola cabecera, sin ORIGINAL ni DUPLICADO', (h.match(/class="op-cab"/g) || []).length === 1 && !/ORIGINAL|DUPLICADO|op-copia/.test(h))
    const emisor = t(bloque(h, 'op-cab__emisor'))
    chk('arriba a la izquierda: la razón social, el CUIT con guiones y el domicilio', emisor === 'PAZ MIRTA CUIT 20-92410679-5 Unión 843, Córdoba', emisor)
    chk('el logo de la empresa', /<img class="op-cab__logo" src="\.\.\/logo-cucuruchos-nuss\.png"/.test(h))
    chk('arriba a la derecha: ORDEN DE PAGO, el número y la fecha', t(bloque(h, 'op-cab__titulo')) === 'ORDEN DE PAGO N-OP-00005 Fecha 31/10/2026', t(bloque(h, 'op-cab__titulo')))
    chk('el proveedor: razón social, CUIT y domicilio', t(bloque(h, 'op-proveedor')) === 'Proveedor ANATOLIA SRL CUIT 30-71234567-8 Ruta 9 km 5', t(bloque(h, 'op-proveedor')))
    const cols = bloque(h, 'op-columnas')
    const pago = bloque(cols ?? '', 'op-columna--pago'), facs = bloque(cols ?? '', 'op-columna--facturas')
    chk('dos columnas: "Con qué se pagó" a la izquierda y "Facturas que cancela" a la derecha',
      !!pago && !!facs && cols.indexOf(pago) < cols.indexOf(facs) && t(pago).startsWith('Con qué se pagó') && t(facs).startsWith('Facturas que cancela'))
    chk('el orden de la hoja: columnas, cajas, "Son…", franja, saldo, observaciones, firmas, pie',
      ['op-columnas', 'op-totales', 'op-letras', 'op-franja', 'op-saldo-cuenta', 'op-observaciones', 'op-firmas', 'op-pie']
        .map(c => h.search(new RegExp(`class="(?:[^"]* )?${c}[" ]`))).every((x, i, a) => x > 0 && (i === 0 || a[i - 1] < x)))
    chk('las dos firmas', t(bloque(h, 'op-firmas')) === 'Recibí conforme (proveedor) — firma y aclaración Autorizó')
    chk('vacía no se rompe', /ORDEN DE PAGO/.test(S.htmlOrdenPago({})) && /ORDEN DE PAGO/.test(S.htmlOrdenPago(null)))
  }

  // ══ 2. LOS CHEQUES: SIN LIBRADOR, SIN CLIENTE, SIN "ENTREGADO POR" ═══════
  {
    const S = sandbox()
    const h = S.htmlOrdenPago(ORDEN)
    const tc = tabla(bloque(h, 'op-bloque--cheques'))
    chk('el bloque "Cheques" con su tabla', t(bloque(h, 'op-bloque--cheques')).startsWith('Cheques Banco'))
    chk('los cheques: Banco, Número, Fecha de pago, Importe (nada más)', JSON.stringify(tc?.cabecera) === '["Banco","Número","Fecha de pago","Importe"]', JSON.stringify(tc?.cabecera))
    chk('las filas de los cheques', JSON.stringify(tc?.filas) === JSON.stringify([
      ['BANCO DE GALICIA eCheq', '62921151', '15/11/2026', '$ 500.000,00'],
      ['MACRO', '00012345', '30/11/2026', '$ 350.000,00'],
    ]), JSON.stringify(tc?.filas))
    chk('el subtotal de los cheques', JSON.stringify(tc?.pie) === '[["Subtotal cheques","$ 850.000,00"]]', JSON.stringify(tc?.pie))
    const todo = t(h)
    chk('el librador no aparece (ni nombre ni CUIT ni la palabra)', !/HELADERIA LOPEZ|KIOSCO EL SOL|30-70000000-1|20-30000000-2|Librador/i.test(todo))
    chk('ni el cliente / la empresa de la que vino el cheque', !/Dolce Pasta/.test(todo) && !/cliente/i.test(todo))
    chk('ni "entregado por"', !/entregado/i.test(todo))
    const conMarcas = S.htmlOrdenPago({ ...ORDEN, cheques: [{ banco: marca('banco'), numero: marca('cnum'), fecha_pago: '2026-10-01', librador: [{ nombre: marca('lib') }], de_empresa: marca('demp'), importe: 5 }] })
    chequearMarcas(chk, 'los cheques', conMarcas, ['banco', 'cnum'])
    chk('un librador o una empresa con marcas no entra ni escapado', !conMarcas.includes('data-xss=&quot;lib') && !conMarcas.includes('data-xss=&quot;demp'))
  }

  // ══ 3. TRANSFERENCIAS, EFECTIVO (Y QR): CADA UNO CON SU SUBTOTAL ═════════
  {
    const S = sandbox()
    const h = S.htmlOrdenPago({ ...ORDEN, otros_medios: [
      { medio: 'transferencia', cuenta: 'Banco Macro CC 123', importe: 400000.5 },
      { medio: 'transferencia', cuenta: 'Galicia CA 9', importe: 100 },
      { medio: 'efectivo', cuenta: 'Caja chica Nuss', importe: 100000 },
      { medio: 'qr', cuenta: 'Mercado Pago', importe: 50 },
    ] })
    const tt = tabla(bloque(h, 'op-bloque--transferencia'))
    chk('"Transferencias": cuenta e importe', t(bloque(h, 'op-bloque--transferencia')).startsWith('Transferencias Cuenta Importe') &&
      JSON.stringify(tt?.filas) === JSON.stringify([['Banco Macro CC 123', '$ 400.000,50'], ['Galicia CA 9', '$ 100,00']]), JSON.stringify(tt))
    chk('… con su subtotal', JSON.stringify(tt?.pie) === '[["Subtotal transferencias","$ 400.100,50"]]', JSON.stringify(tt?.pie))
    const te = tabla(bloque(h, 'op-bloque--efectivo'))
    chk('"Efectivo" con su subtotal, sin la caja de la que salió', t(bloque(h, 'op-bloque--efectivo')).startsWith('Efectivo') &&
      JSON.stringify(te?.pie) === '[["Subtotal efectivo","$ 100.000,00"]]' && !t(h).includes('Caja chica Nuss'), JSON.stringify(te))
    const tq = tabla(bloque(h, 'op-bloque--qr'))
    chk('QR va en su propio bloque con la cuenta', JSON.stringify(tq?.filas) === '[["Mercado Pago","$ 50,00"]]' && JSON.stringify(tq?.pie) === '[["Subtotal QR","$ 50,00"]]', JSON.stringify(tq))
    const col = bloque(h, 'op-columna--pago')
    chk('el orden: cheques, transferencias, QR, efectivo', ['op-bloque--cheques', 'op-bloque--transferencia', 'op-bloque--qr', 'op-bloque--efectivo'].every((c, i, a) => i === 0 || col.indexOf(a[i - 1]) < col.indexOf(c)))
    const raro = S.htmlOrdenPago({ ...ORDEN, cheques: [], otros_medios: [{ medio: marca('medio'), importe: 3 }] })
    chequearMarcas(chk, 'un medio desconocido', raro, ['medio'])
    chk('sin cheques no hay bloque de cheques', !raro.includes('op-bloque--cheques'))
    const sin = S.htmlOrdenPago({ ...ORDEN, cheques: [], otros_medios: [] })
    chk('sin ningún medio: un guion', t(bloque(sin, 'op-columna--pago')) === 'Con qué se pagó —')
    chequearMarcas(chk, 'la cuenta de la transferencia', S.htmlOrdenPago({ ...ORDEN, otros_medios: [{ medio: 'transferencia', cuenta: marca('cuenta'), importe: 1 }] }), ['cuenta'])
  }

  // ══ 4. FACTURAS QUE CANCELA (con el subrenglón de lo anterior) ═══════════
  {
    const S = sandbox()
    const ant = new Map([
      [S.claveFacturaOrden('Factura A', '0003-00001201', '2026-08-20'), { pagos: 150000, creditos: 50000 }],
    ])
    const h = S.htmlOrdenPago(ORDEN, { anteriores: ant })
    const tf = tabla(bloque(h, 'op-tabla--facturas'))
    chk('la tabla: Comprobante, Fecha, Importe, Aplicado, Le queda', JSON.stringify(tf?.cabecera) === '["Comprobante","Fecha","Importe","Aplicado","Le queda"]', JSON.stringify(tf?.cabecera))
    chk('cada factura con tipo y número, fecha, importe, lo aplicado en este pago y lo que le queda; el subrenglón debajo de la suya', JSON.stringify(tf?.filas) === JSON.stringify([
      ['Factura A 0003-00001201', '20/08/2026', '$ 900.000,00', '$ 700.000,00', '$ 0,00'],
      ['Ya tenía pagos anteriores por $ 150.000,00 y créditos por $ 50.000,00'],
      ['Factura 0003-00001245', '05/09/2026', '$ 800.000,00', '$ 650.000,50', '$ 149.999,50'],
    ]), JSON.stringify(tf?.filas))
    chk('el subrenglón es chico (su propia fila, de toda la tabla)', /<tr class="op-sub"><td colspan="5">/.test(h) && /\.op-tabla tr\.op-sub td \{[^}]*font-size: 0\.88em;/.test(FUENTE))
    chk('solo pagos', S.textoAnterioresFactura({ pagos: 10, creditos: 0 }) === 'Ya tenía pagos anteriores por $ 10,00')
    chk('solo créditos', S.textoAnterioresFactura({ pagos: 0, creditos: 2.5 }) === 'Ya tenía créditos por $ 2,50')
    chk('sin nada, sin texto', S.textoAnterioresFactura({ pagos: 0, creditos: 0 }) === '' && S.textoAnterioresFactura(null) === '')
    chk('sin anteriores leídos, ningún subrenglón', !S.htmlOrdenPago(ORDEN).includes('op-sub'))
    chk('"otro" y sin tipo: solo el número; nota_debito con su nombre',
      S.tipoComprobanteOrden('otro') === '' && S.tipoComprobanteOrden(null) === '' && S.tipoComprobanteOrden('nota_debito') === 'Nota de débito' && S.tipoComprobanteOrden('Comisión') === 'Comisión')
    const si = tabla(bloque(S.htmlOrdenPago({ ...ORDEN, facturas: [{ tipo: 'otro', numero: 'SALDO-INICIAL', fecha: '2026-10-10', importe: 9, aplicado: 9, saldo_actual: 0 }] }), 'op-tabla--facturas'))
    chk('el saldo inicial dice "Saldo inicial"', si?.filas?.[0]?.[0] === 'Saldo inicial', JSON.stringify(si?.filas))
    const aCuenta = S.htmlOrdenPago({ ...ORDEN, facturas: [] })
    chk('sin facturas: "Pago a cuenta", sin tabla', t(bloque(aCuenta, 'op-columna--facturas')) === 'Facturas que cancela Pago a cuenta: no cancela facturas.' && !aCuenta.includes('op-tabla--facturas'))
    chequearMarcas(chk, 'las facturas', S.htmlOrdenPago({ ...ORDEN, facturas: [{ tipo: marca('ftipo'), numero: marca('fnum'), fecha: '2026-01-01', importe: 1, aplicado: 1, saldo_actual: 0 }] }), ['ftipo', 'fnum'])
  }

  // ══ 5. LO ANTERIOR DE CADA FACTURA, LEÍDO DE LA BASE ═════════════════════
  // aplicaciones de OTROS pagos y de créditos, ANTES de la orden.
  function baseAnteriores(S) {
    const db = S.__db
    db.ordenes_pago.push({ id: 'op-5', proveedor_id: 'pv1', unidad_negocio_id: 'u-n', creada_en: '2026-10-31T14:00:00.123456+00:00' })
    db.gastos.push({ id: 'g-ch', orden_pago_id: 'op-5' }, { id: 'g-tr', orden_pago_id: 'op-5' }, { id: 'g-viejo', orden_pago_id: 'op-1' })
    db.facturas_pendientes.push(
      { id: 'f1', tipo_documento: 'Factura A', numero_comprobante: '0003-00001201', fecha_factura: '2026-08-20' },
      { id: 'f2', tipo_documento: 'factura', numero_comprobante: '0003-00001245', fecha_factura: '2026-09-05' },
      { id: 'f9', tipo_documento: 'factura', numero_comprobante: '9', fecha_factura: '2026-01-01' })
    db.aplicaciones_pago.push(
      { gasto_id: 'g-ch', factura_pendiente_id: 'f1', monto_aplicado: 500000, created_at: '2026-10-31T14:00:00.123456+00:00' },
      { gasto_id: 'g-tr', factura_pendiente_id: 'f1', monto_aplicado: 200000, created_at: '2026-10-31T14:00:00.123456+00:00' },
      { gasto_id: 'g-tr', factura_pendiente_id: 'f2', monto_aplicado: 650000.5, created_at: '2026-10-31T14:00:00.123456+00:00' },
      // de otro pago, antes: cuenta
      { gasto_id: 'g-viejo', factura_pendiente_id: 'f1', monto_aplicado: 100000, created_at: '2026-10-01T10:00:00+00:00' },
      { gasto_id: 'g-viejo2', factura_pendiente_id: 'f1', monto_aplicado: 50000.25, created_at: '2026-10-02T10:00:00+00:00' },
      // de otro pago, DESPUÉS de la orden: no cuenta
      { gasto_id: 'g-nuevo', factura_pendiente_id: 'f2', monto_aplicado: 9999, created_at: '2026-11-02T10:00:00+00:00' },
      // de la PROPIA orden con una hora anterior (un reloj corrido): no es "anterior"
      { gasto_id: 'g-tr', factura_pendiente_id: 'f2', monto_aplicado: 1, created_at: '2026-10-31T13:59:59+00:00' },
      // de otra factura que no está en la orden
      { gasto_id: 'g-viejo', factura_pendiente_id: 'f9', monto_aplicado: 7, created_at: '2026-01-02T10:00:00+00:00' })
    db.aplicaciones_credito.push(
      { factura_pendiente_id: 'f1', monto_aplicado: 49999.75, created_at: '2026-10-20T10:00:00+00:00' },
      { factura_pendiente_id: 'f2', monto_aplicado: 1, created_at: '2026-11-05T10:00:00+00:00' })
  }
  esperas.push((async () => {
    const S = sandbox()
    baseAnteriores(S)
    const m = await S.leerAnterioresOrdenPago('op-5')
    const f1 = m?.get(S.claveFacturaOrden('Factura A', '0003-00001201', '2026-08-20'))
    chk('la factura 1: los pagos de OTROS gastos anteriores y el crédito anterior, en centavos', f1?.pagos === 150000.25 && f1?.creditos === 49999.75, JSON.stringify(f1))
    chk('la factura 2: lo posterior a la orden no cuenta (sin subrenglón)', m?.has(S.claveFacturaOrden('factura', '0003-00001245', '2026-09-05')) === false)
    chk('solo las facturas de la orden', m?.size === 1)
    chk('las aplicaciones de la propia orden no son "anteriores"', f1 && f1.pagos !== 850000.25)
    chk('lee por la orden: sus gastos y sus aplicaciones', S.__consultas.some(q => q.t === 'gastos' && q.sel === 'id') && S.__consultas.some(q => q.t === 'aplicaciones_credito'))
    S.__fallar.add('aplicaciones_credito')
    chk('si algo no se puede leer: null (no se afirma nada)', (await S.leerAnterioresOrdenPago('op-5')) === null)
    const V = sandbox()
    V.__db.ordenes_pago.push({ id: 'op-5', creada_en: '2026-10-31T14:00:00Z' })
    V.__db.gastos.push({ id: 'g-1', orden_pago_id: 'op-5' })
    const vacio = await V.leerAnterioresOrdenPago('op-5')
    chk('sin aplicaciones leídas (sin ver_todo vienen vacías): ningún subrenglón', vacio instanceof Map && vacio.size === 0)
    chk('una orden que no está: null', (await V.leerAnterioresOrdenPago('no-existe')) === null)
    // Al abrir la orden, la hoja trae el subrenglón.
    const A = sandbox()
    baseAnteriores(A)
    A.__responder('datos_orden_pago', { data: ORDEN, error: null })
    await A.abrirOrdenPago('op-5')
    chk('al abrir la orden: la factura con lo anterior lleva su subrenglón', A.__els.get('orden-pago-hoja').innerHTML.includes('<tr class="op-sub"><td colspan="5">Ya tenía pagos anteriores por $ 150.000,25 y créditos por $ 49.999,75</td></tr>'))
    chk('el corte es estricto: lo del mismo instante no es anterior',
      V.anterioresPorFactura({ creadaEn: '2026-10-31T14:00:00Z', gastoIds: [], pagos: [{ gasto_id: 'x', factura_pendiente_id: 'a', monto_aplicado: 5, created_at: '2026-10-31T14:00:00Z' }], creditos: [], facturas: [{ id: 'a' }] }).size === 0)
  })())

  // ══ 6. LAS CAJAS DE TOTALES, A LA MISMA ALTURA ═══════════════════════════
  {
    const S = sandbox()
    const h = S.htmlOrdenPago(ORDEN)
    const tot = bloque(h, 'op-totales')
    const cajas = todos(tot ?? '', 'op-caja')
    chk('dos cajas lado a lado en la misma fila (.op-totales)', cajas.length === 2 && cajas[0].includes('op-caja--pagado') && cajas[1].includes('op-caja--facturas'))
    chk('la izquierda: los subtotales por medio y TOTAL PAGADO', t(cajas[0]) === 'Cheques $ 850.000,00 Transferencias $ 400.000,50 Efectivo $ 100.000,00 TOTAL PAGADO $ 1.350.000,50', t(cajas[0]))
    chk('la derecha: lo aplicado, lo que les queda y TOTAL FACTURAS', t(cajas[1]) === 'Aplicado en este pago $ 1.350.000,50 Les queda $ 149.999,50 TOTAL FACTURAS $ 1.500.000,00', t(cajas[1]))
    const css = FUENTE.slice(FUENTE.indexOf('/* LA ORDEN DE PAGO A4'), FUENTE.indexOf('@container (max-width: 150mm)'))
    chk('CSS: las cajas en una grilla que estira las dos al alto de la más alta', /\.op-totales \{[^}]*display: grid;[^}]*align-items: stretch;/.test(css))
    chk('CSS: el TOTAL de cada caja pegado abajo (las dos líneas de total a la misma altura)', /\.op-caja__total \{[^}]*margin-top: auto;/.test(css) && /\.op-caja \{[^}]*flex-direction: column;/.test(css))
    chk('CSS: las cajas con las mismas columnas que las de arriba', (css.match(/grid-template-columns: 9fr 11fr;/g) || []).length === 2)
    const c = S.cuentasOrdenPago(ORDEN)
    chk('las cuentas en centavos', c.cCheques === 85000000 && c.porMedio.get('transferencia') === 40000050 && c.cPagado === 135000050 && c.cAplicado === 135000050 && c.cQueda === 14999950 && c.cFacturas === 150000000 && c.cFavor === 0, JSON.stringify({ ...c, porMedio: [...c.porMedio] }))
  }

  // ══ 7. EL TOTAL Y EL "SON … PESOS": EL VIVO ══════════════════════════════
  {
    const S = sandbox()
    const h = S.htmlOrdenPago(ORDEN)
    chk('TOTAL PAGADO es datos_orden_pago.total (no total_original)', t(bloque(h, 'op-caja--pagado')).endsWith('TOTAL PAGADO $ 1.350.000,50') && !t(h).includes('1.400.000'))
    chk('"Son …" del total vivo', t(bloque(h, 'op-letras')) === 'Son UN MILLÓN TRESCIENTOS CINCUENTA MIL PESOS CON CINCUENTA CENTAVOS', t(bloque(h, 'op-letras')))
  }

  // ══ 8. LA FRANJA, EN LOS TRES CASOS ══════════════════════════════════════
  {
    const S = sandbox()
    const franja = (d) => t(bloque(S.htmlOrdenPago(d), 'op-franja') ?? '')
    chk('queda deuda en las facturas: "Queda saldo pendiente $ X"', franja(ORDEN) === 'Queda saldo pendiente $ 149.999,50', franja(ORDEN))
    chk('… marcada como pendiente', /op-franja__linea--pendiente/.test(S.htmlOrdenPago(ORDEN)))
    const sobra = { ...ORDEN, total: 1500000, facturas: [{ tipo: 'factura', numero: '1', fecha: '2026-10-01', importe: 1000000, aplicado: 1000000, saldo_actual: 0 }] }
    chk('se pagó de más: "Queda a favor de PAZ MIRTA $ X"', franja(sobra) === 'Queda a favor de PAZ MIRTA $ 500.000,00', franja(sobra))
    chk('… sin razón social, con el nombre de la empresa', franja({ ...sobra, emisor: { empresa: 'Cucuruchos Nuss' } }) === 'Queda a favor de Cucuruchos Nuss $ 500.000,00')
    const justo = { ...sobra, total: 1000000 }
    chk('justo: "Facturas canceladas"', franja(justo) === 'Facturas canceladas', franja(justo))
    chk('… marcada como cancelada', /op-franja__linea--cancelada/.test(S.htmlOrdenPago(justo)))
    const ambas = { ...ORDEN, total: 1400000.5 }
    chk('una parte pendiente y lo que sobró a favor: los dos renglones', franja(ambas) === 'Queda saldo pendiente $ 149.999,50 Queda a favor de PAZ MIRTA $ 50.000,00', franja(ambas))
    chk('pago a cuenta (sin facturas): todo a favor', franja({ ...ORDEN, facturas: [] }) === 'Queda a favor de PAZ MIRTA $ 1.350.000,50')
    chk('sin facturas y sin nada a favor: no va la franja', !S.htmlOrdenPago({ ...ORDEN, facturas: [], total: 0 }).includes('op-franja'))
    chk('ya no está "Saldo a favor del proveedor"', !S.htmlOrdenPago({ ...sobra, a_favor: 500000 }).includes('a favor del proveedor'))
    chequearMarcas(chk, 'la franja', S.htmlOrdenPago({ ...sobra, emisor: { razon_social: marca('emp') } }), ['emp'])
  }

  // ══ 9. EL SALDO DE LA CUENTA: UNA LÍNEA ══════════════════════════════════
  {
    const S = sandbox()
    const linea = (saldo) => { const h = S.htmlOrdenPago(ORDEN, { saldo }); return { n: (h.match(/class="op-saldo-cuenta"/g) || []).length, txt: t(bloque(h, 'op-saldo-cuenta') ?? '') } }
    const deuda = linea({ deuda: 400000, credito: 39999.5 })
    chk('deuda: "Saldo de la cuenta: $ 360.000,50 le debemos" (deuda − crédito)', deuda.n === 1 && deuda.txt === 'Saldo de la cuenta: $ 360.000,50 le debemos', deuda.txt)
    const favor = linea({ deuda: 10000, credito: 35000 })
    chk('crédito: "Saldo de la cuenta: $ 25.000,00 a nuestro favor"', favor.txt === 'Saldo de la cuenta: $ 25.000,00 a nuestro favor', favor.txt)
    chk('en cero: "$ 0,00" sin "le debemos" ni "a nuestro favor" (en centavos)', linea({ deuda: 0.1, credito: 0.1 }).txt === 'Saldo de la cuenta: $ 0,00')
    chk('sin saldo leído: la línea no va', linea(null).n === 0)
    const h = S.htmlOrdenPago(ORDEN, { saldo: { deuda: 1, credito: 0 } })
    chk('nada de "aplicado / no aplicado" ni del proveedor en la línea', !/no aplicado|crédito aplicado/i.test(t(h)) && !t(bloque(h, 'op-saldo-cuenta')).includes('ANATOLIA'))
  }
  esperas.push((async () => {
    const S = sandbox()
    S.__db.ordenes_pago.push({ id: 'op-5', proveedor_id: 'pv1', unidad_negocio_id: 'u-n', creada_en: '2026-10-31T14:00:00Z' })
    S.__db.v_saldo_proveedor.push(
      { proveedor_id: 'pv1', unidad_negocio_id: 'u-n', moneda: 'ARS', deuda_pendiente: 500000, credito_disponible: 139999.5 },
      { proveedor_id: 'pv1', unidad_negocio_id: 'u-d', moneda: 'ARS', deuda_pendiente: 999, credito_disponible: 0 },
      { proveedor_id: 'pv1', unidad_negocio_id: 'u-n', moneda: 'USD', deuda_pendiente: 7, credito_disponible: 0 })
    S.__responder('datos_orden_pago', { data: ORDEN, error: null })
    await S.abrirOrdenPago('op-5')
    const h = S.__els.get('orden-pago-hoja').innerHTML
    chk('al abrir: el saldo de ESE proveedor en ESA empresa y en pesos', t(bloque(h, 'op-saldo-cuenta')) === 'Saldo de la cuenta: $ 360.000,50 le debemos', t(bloque(h, 'op-saldo-cuenta') ?? ''))
  })())

  // ══ 10. OBSERVACIONES: SOLO LAS DE LA ORDEN ══════════════════════════════
  {
    const S = sandbox()
    chk('las observaciones de la orden van impresas', t(bloque(S.htmlOrdenPago(ORDEN), 'op-observaciones')) === 'Observaciones Retira Juan')
    chk('sin observaciones (o en blanco), no va la sección', !S.htmlOrdenPago({ ...ORDEN, observaciones: '  ' }).includes('op-observaciones') && !S.htmlOrdenPago({ ...ORDEN, observaciones: null }).includes('Observaciones'))
    chk('las del gasto no se leen ni se imprimen (la hoja no las pide)', !/descripcion|gasto\.observaciones|g\.observaciones/.test(S.htmlOrdenPago.toString()))
    chequearMarcas(chk, 'las observaciones', S.htmlOrdenPago({ ...ORDEN, observaciones: marca('obs') }), ['obs'])
  }

  // ══ 11. ANULADA: TACHADA Y SIN IMPRIMIR ══════════════════════════════════
  {
    const S = sandbox()
    const h = S.htmlOrdenPago({ ...ORDEN, anulada: true })
    chk('anulada: el aviso arriba y el sello "ANULADA" cruzado', /^<div class="op-a4[^"]* op-a4--anulada">\s*<div class="op-anulada" role="alert">ANULADA: el pago de esta orden se anuló\. No se reimprime\.<\/div><div class="op-sello-anulada" aria-hidden="true">ANULADA<\/div>/.test(h), h.slice(0, 200))
    chk('CSS: el sello va cruzado arriba de la hoja y el total tachado', /\.op-sello-anulada \{[^}]*position: absolute;[^}]*rotate\(-24deg\)/.test(FUENTE) && /\.op-hoja--anulada \.op-cab__titulo-texto, \.op-hoja--anulada \.op-caja__total \{ text-decoration: line-through; \}/.test(FUENTE))
    chk('no anulada: sin aviso ni sello', !/op-anulada|op-sello-anulada|op-a4--anulada/.test(S.htmlOrdenPago(ORDEN)))
  }
  esperas.push((async () => {
    const S = sandbox()
    S.__responder('datos_orden_pago', { data: { ...ORDEN, anulada: true }, error: null })
    await S.abrirOrdenPago('op-5')
    const hoja = S.__els.get('orden-pago-hoja')
    chk('al abrir una anulada: la hoja marcada y SIN "Imprimir" ni "Enviar"', hoja.classList.contains('op-hoja--anulada') && S.__els.get('btn-imprimir-orden').hidden === true && S.__els.get('btn-enviar-orden').hidden === true)
    chk('… sin leer los gastos para saberlo (manda la base)', !S.__consultas.some(q => q.t === 'gastos' && q.sel === 'id, orden_pago_id, estado'))
    S.imprimirOrdenPago()
    chk('… imprimir no imprime', S.__impresiones() === 0)
    await S.enviarOrdenPago()
    chk('… enviar no arma ningún PDF', S.__pdf.lienzos.length === 0 && S.__descargas.length === 0)
    // Después, una sana: vuelven los dos botones.
    S.__responder('datos_orden_pago', { data: ORDEN, error: null })
    await S.abrirOrdenPago('op-6')
    await new Promise(r => setImmediate(r))
    chk('una sana después: sin la marca y con "Imprimir" y "Enviar"', !hoja.classList.contains('op-hoja--anulada') && S.__els.get('btn-imprimir-orden').hidden === false && S.__els.get('btn-enviar-orden').hidden === false)
    chk('… y el foco en "Imprimir"', S.__foco() === 'btn-imprimir-orden')
  })())
  esperas.push((async () => {
    // La base dice que NO está anulada, pero los gastos que se ven (solo los
    // propios) están todos anulados: es "en parte".
    const S = sandbox()
    S.__db.gastos.push({ id: 'g-mio', orden_pago_id: 'op-7', estado: 'anulado' })
    S.__responder('datos_orden_pago', { data: { ...ORDEN, anulada: false }, error: null })
    await S.abrirOrdenPago('op-7')
    await new Promise(r => setImmediate(r))
    const hoja = S.__els.get('orden-pago-hoja')
    chk('base "no anulada" + gastos visibles anulados: ANULADA EN PARTE', /^<div class="op-anulada" role="alert">ANULADA EN PARTE/.test(hoja.innerHTML) && S.__els.get('btn-enviar-orden').hidden === true, hoja.innerHTML.slice(0, 90))
    const V = sandbox()
    V.__db.gastos.push({ id: 'g-1', orden_pago_id: 'op-8', estado: 'anulado' })
    V.__responder('datos_orden_pago', { data: { ...ORDEN, anulada: undefined }, error: null })
    await V.abrirOrdenPago('op-8')
    await new Promise(r => setImmediate(r))
    chk('una base vieja (sin "anulada"): como antes, por los gastos', /^<div class="op-anulada" role="alert">ANULADA: /.test(V.__els.get('orden-pago-hoja').innerHTML))
  })())

  // ══ 12. LA VERSIÓN COMPACTA ══════════════════════════════════════════════
  {
    const S = sandbox()
    const cheques = (n) => Array.from({ length: n }, (_, i) => ({ banco: 'GALICIA', numero: String(1000 + i), fecha_pago: '2026-11-01', importe: 1000 }))
    const facturas = (n) => Array.from({ length: n }, (_, i) => ({ tipo: 'factura', numero: `0003-${String(i).padStart(8, '0')}`, fecha: '2026-09-01', importe: 1000, aplicado: 1000, saldo_actual: 0 }))
    chk('pocos renglones: la hoja normal', !S.htmlOrdenPago(ORDEN).includes('op-a4--compacta'))
    chk('muchos cheques: la compacta', S.htmlOrdenPago({ ...ORDEN, cheques: cheques(30) }).includes('op-a4--compacta'))
    chk('muchas facturas: la compacta', S.htmlOrdenPago({ ...ORDEN, facturas: facturas(30) }).includes('op-a4--compacta'))
    chk('el umbral: más de 15 renglones en la columna más larga (14 facturas + la cabecera, no; 15, sí)', !S.htmlOrdenPago({ ...ORDEN, cheques: [], otros_medios: [], facturas: facturas(14) }).includes('op-a4--compacta') &&
      S.htmlOrdenPago({ ...ORDEN, cheques: [], otros_medios: [], facturas: facturas(15) }).includes('op-a4--compacta'))
    // En la compacta el banco va en UN renglón (los del BCRA tienen 30 a 40
    // letras) cortado con "…"; el eCheq queda afuera del corte.
    chk('compacta: el banco en su propio span, con el eCheq afuera', S.htmlOrdenPago({ ...ORDEN, cheques: cheques(30) }).includes('<td><span class="op-banco">GALICIA</span></td>') &&
      S.htmlOrdenPago(ORDEN).includes('<td><span class="op-banco">BANCO DE GALICIA</span> <strong>eCheq</strong></td>'))
    chk('CSS: en la compacta el banco no pasa de un renglón', /\.op-a4--compacta \.op-banco \{[^}]*max-width: 28mm;[^}]*text-overflow: ellipsis;[^}]*white-space: nowrap;/.test(FUENTE) &&
      FUENTE.includes('.op-a4--compacta .op-bloque--cheques td:first-child { white-space: nowrap; }'))
    const t40 = tabla(bloque(S.htmlOrdenPago({ ...ORDEN, cheques: cheques(40) }), 'op-bloque--cheques'))
    chk('40 cheques: los 40 (no se corta ninguno)', t40?.filas?.length === 40)
  }

  // ══ 13. "ENVIAR": SHARE CON EL PDF, O DESCARGA ═══════════════════════════
  async function abierta(S) {
    S.__win.html2canvas = (el, op) => {
      S.__pdf.lienzos.push({ html: el.innerHTML, className: el.className, op })
      return Promise.resolve({ width: 1466, height: 2400, toDataURL: (tp, q) => `data:${tp};${q}` })
    }
    S.__win.jspdf = { jsPDF: function (op) { S.__pdf.op = op; this.addImage = (...a) => { S.__pdf.imagenes.push(a) }; this.output = (tp) => ({ blob: true, tipo: tp }) } }
    S.__responder('datos_orden_pago', { data: ORDEN, error: null })
    await S.abrirOrdenPago('op-5')
  }
  esperas.push((async () => {
    const S = sandbox()
    await abierta(S)
    const compartidos = []
    S.__nav.canShare = (x) => Array.isArray(x?.files) && x.files.length === 1
    S.__nav.share = async (x) => { compartidos.push(x) }
    await S.enviarOrdenPago()
    chk('con share: se comparte UN archivo PDF con el nombre de la orden y el proveedor',
      compartidos.length === 1 && compartidos[0].files[0].name === 'Orden de pago N-OP-00005 ANATOLIA SRL.pdf' && compartidos[0].files[0].type === 'application/pdf' &&
      compartidos[0].title === 'Orden de pago N-OP-00005 ANATOLIA SRL', JSON.stringify(compartidos[0]))
    chk('… el PDF es la hoja que se ve (con las dos columnas) en una A4', S.__pdf.lienzos.length === 1 && S.__pdf.lienzos[0].html === S.__els.get('orden-pago-hoja').innerHTML &&
      S.__pdf.lienzos[0].className === 'op-hoja op-hoja--pdf' && S.__pdf.op?.format === 'a4' && S.__pdf.op?.unit === 'mm')
    const [, , x, y, w, hh] = S.__pdf.imagenes[0] ?? []
    chk('… achicada para entrar en UNA hoja (190 × 277 mm como máximo; este lienzo, por el alto)', x === 10 && y === 10 && Math.abs(hh - 277) < 0.01 && w < 190 && Math.abs(w / hh - 1466 / 2400) < 1e-9, JSON.stringify([x, y, w, hh]))
    chk('… lo que se compartió es lo que devolvió jsPDF', compartidos[0].files[0].partes?.[0]?.tipo === 'blob')
    chk('… y no se descarga nada', S.__descargas.length === 0 && S.__exitos.length === 0)
    chk('… el contenedor del PDF se saca de la página', S.__montados.length === 1 && S.__montados[0].quitado === true && /width:194mm/.test(S.__montados[0].style.cssText))
    chk('… el botón vuelve a quedar habilitado', S.__els.get('btn-enviar-orden').disabled === false)
  })())
  esperas.push((async () => {
    const S = sandbox()
    await abierta(S)
    await S.enviarOrdenPago()
    chk('sin share: se descarga con el nombre de la orden', S.__descargas.length === 1 && S.__descargas[0].download === 'Orden de pago N-OP-00005 ANATOLIA SRL.pdf' && S.__descargas[0].href === 'blob:orden', JSON.stringify(S.__descargas))
    chk('… y lo avisa', S.__exitos.at(-1) === 'Se descargó la orden de pago: Orden de pago N-OP-00005 ANATOLIA SRL.pdf')
    const T = sandbox()
    await abierta(T)
    let llamadas = 0
    T.__nav.share = async () => { llamadas++ }
    T.__nav.canShare = () => false
    await T.enviarOrdenPago()
    chk('share que no acepta archivos: no se llama a share y se descarga', llamadas === 0 && T.__descargas.length === 1)
    const U = sandbox()
    await abierta(U)
    U.__nav.canShare = () => true
    U.__nav.share = async () => { const e = new Error('cancelado'); e.name = 'AbortError'; throw e }
    await U.enviarOrdenPago()
    chk('si la persona cancela el share: no se descarga', U.__descargas.length === 0)
    const W = sandbox()
    await abierta(W)
    W.__nav.canShare = () => true
    W.__nav.share = async () => { throw new Error('falló') }
    await W.enviarOrdenPago()
    chk('si el share falla por otra cosa: se descarga', W.__descargas.length === 1)
  })())
  esperas.push((async () => {
    // Sin las librerías: se cargan de cdnjs (acá, los dobles al "cargar").
    const S = sandbox()
    S.__responder('datos_orden_pago', { data: ORDEN, error: null })
    await S.abrirOrdenPago('op-5')
    const p = S.enviarOrdenPago()
    for (let i = 0; i < 5; i++) await new Promise(r => setImmediate(r))
    chk('sin las librerías: carga html2canvas 1.4.1 de cdnjs primero', S.__scripts[0]?.src === 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js', S.__scripts[0]?.src)
    S.__win.html2canvas = () => Promise.resolve({ width: 100, height: 100, toDataURL: () => 'x' })
    S.__scripts[0].onload()
    for (let i = 0; i < 5; i++) await new Promise(r => setImmediate(r))
    chk('… y después jsPDF 2.5.1', S.__scripts[1]?.src === 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', S.__scripts[1]?.src)
    S.__win.jspdf = { jsPDF: function () { this.addImage = () => {}; this.output = () => 'pdf' } }
    S.__scripts[1].onload()
    await p
    chk('… y arma el PDF', S.__descargas.length === 1)
    // Si cdnjs no carga: el error, sin descarga.
    const T = sandbox()
    T.__responder('datos_orden_pago', { data: ORDEN, error: null })
    await T.abrirOrdenPago('op-5')
    const q = T.enviarOrdenPago()
    for (let i = 0; i < 5; i++) await new Promise(r => setImmediate(r))
    T.__scripts[0].onerror()
    await q
    chk('si no se pueden cargar: avisa y no descarga nada', T.__errores.length === 1 && /^No se pudo armar el PDF de la orden de pago: No se pudo cargar https:\/\/cdnjs/.test(T.__errores[0]) && T.__descargas.length === 0, T.__errores[0])
    chk('… y el botón queda habilitado para reintentar', T.__els.get('btn-enviar-orden').disabled === false)
  })())
  esperas.push((async () => {
    const S = sandbox()
    await abierta(S)
    let soltar
    S.__win.html2canvas = () => new Promise(r => { soltar = () => r({ width: 1, height: 1, toDataURL: () => 'x' }) })
    const a = S.enviarOrdenPago()
    await new Promise(r => setImmediate(r))
    await S.enviarOrdenPago()
    chk('doble toque: arma UN solo PDF', S.__els.get('btn-enviar-orden').disabled === true && S.__descargas.length === 0)
    soltar()
    await a
    chk('… y descarga una vez', S.__descargas.length === 1)
    const V = sandbox()
    await V.enviarOrdenPago()
    chk('sin orden abierta: no hace nada', V.__pdf.lienzos.length === 0 && V.__descargas.length === 0)
  })())
  {
    const S = sandbox()
    chk('el nombre del archivo sin caracteres que el sistema no acepta', S.nombreArchivoOrdenPago({ numero_texto: 'N-OP-00001', proveedor: { razon_social: 'A/B: "C" <D>' } }) === 'Orden de pago N-OP-00001 A B C D.pdf')
    chk('sin datos, igual un nombre', S.nombreArchivoOrdenPago({}) === 'Orden de pago sin número.pdf')
    chk('el botón "Enviar" está en el modal, entre Imprimir y Cerrar', /id="btn-imprimir-orden">Imprimir \/ Guardar PDF<\/button>\s*<button type="button" class="btn btn--secundario" id="btn-enviar-orden">Enviar<\/button>\s*<button type="button" class="btn btn--secundario" id="btn-cerrar-orden">/.test(FUENTE))
    chk('y lo escucha', /getElementById\('btn-enviar-orden'\)\.addEventListener\('click', enviarOrdenPago\)/.test(FUENTE))
  }

  // ══ 14. TODO TEXTO DE LA BASE, ESCAPADO ══════════════════════════════════
  {
    const S = sandbox()
    const h = S.htmlOrdenPago({
      numero_texto: marca('num'), fecha: '2026-10-31', total: 5, observaciones: marca('obs2'), creada_por: marca('creador'),
      emisor: { razon_social: marca('razon'), cuit: marca('cuit'), domicilio: marca('dom'), logo_url: marca('logo') },
      proveedor: { razon_social: marca('prov'), cuit: marca('pcuit'), direccion: marca('pdir') },
      facturas: [{ tipo: marca('tipo'), numero: marca('nro'), fecha: marca('fecha'), importe: 1, aplicado: 1, saldo_actual: 0 }],
      cheques: [{ banco: marca('bco'), numero: marca('chn'), fecha_pago: marca('fp'), importe: 1 }],
      otros_medios: [{ medio: 'transferencia', cuenta: marca('cta'), importe: 4 }],
    }, { anteriores: new Map() })
    chequearMarcas(chk, 'la hoja entera', h, ['num', 'obs2', 'creador', 'razon', 'cuit', 'dom', 'prov', 'pcuit', 'pdir', 'tipo', 'nro', 'bco', 'chn', 'cta'])
    chk('un logo con marcas no se dibuja', !/<img/.test(h))
  }

  // ══ 15. NADA DE LO QUE HABÍA SE PERDIÓ (baseline FIJO 1c20f98, nunca HEAD) ═
  {
    const BASE_COMMIT = '1c20f98'
    let antes = null
    if (process.env.ARCHIVO_BASE) antes = require('fs').readFileSync(process.env.ARCHIVO_BASE, 'utf8')
    else {
      try {
        antes = require('child_process').execFileSync('git', ['show', `${BASE_COMMIT}:modulos/cuentas-corrientes.html`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] })
      } catch { antes = null }
    }
    chk(`se pudo leer el baseline ${BASE_COMMIT}`, !!antes)
    if (antes) {
      const marcas = (x) => new Set([...x.matchAll(/\b(id="[a-z][\w-]*"|data-[a-z][\w-]*)/g)].map(m => m[1]))
      const ahora = marcas(FUENTE)
      const faltan = [...marcas(antes)].filter(m => !ahora.has(m))
      chk(`ningún id ni data-* de ${BASE_COMMIT} se perdió`, faltan.length === 0, faltan.join(', '))
      chk(`en ${BASE_COMMIT} la orden no tenía "Enviar" ni las dos columnas (lo que este cambio agrega)`, !/btn-enviar-orden|op-columnas|Facturas que cancela/.test(antes))
      chk('siguen "Imprimir / Guardar PDF" y "Cerrar"', /id="btn-imprimir-orden"/.test(FUENTE) && /id="btn-cerrar-orden"/.test(FUENTE))
    }
  }

  fin()
}

main()
