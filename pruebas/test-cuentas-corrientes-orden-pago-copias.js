// CUENTAS CORRIENTES: LA ORDEN DE PAGO, ORIGINAL Y DUPLICADO (23/10/2026,
// rama ci-prueba/orden-pago-duplicado).
//
// Pedido de Facu (23/10/2026), sobre la orden de pago impresa (y el PDF, que
// es la misma impresión: "Imprimir / Guardar PDF" usa window.print()):
//  1. Los cheques SIN la columna "Librador" (no se dice quién nos dio el
//     cheque): quedan Banco, N°, Fecha de pago e Importe.
//  2. (23/10/2026: DOS hojas, ORIGINAL y DUPLICADO.) DESDE EL 30/10/2026
//     (rama ci-prueba/cc-proveedor-una-lista, pedido de Facu: "sale UNA
//     hoja, sin ORIGINAL/DUPLICADO; si hacen falta dos, se imprime dos
//     veces"): UNA sola hoja, sin rótulo, con las firmas.
//  3. Letra y tabla al ~80% (entran más comprobantes).
//  4. Cuando se pagan facturas, "Se cancelan los siguientes comprobantes" las
//     lista (no "Pago a cuenta") con número, fecha e importe aplicado.
//
// Se EJECUTAN las funciones reales del módulo con un document y una base
// falsos. Para el punto 4 se arma la cadena entera: las facturas tildadas en
// el formulario → p_aplicaciones de pagar_proveedor_mixto (parametrosPagoMixto)
// → lo que guardaría la base (el reparto entre el gasto de los cheques y el
// del resto, como hace pagar_proveedor_mixto) → lo que devuelve
// datos_orden_pago (la suma de aplicaciones_pago de los gastos de la orden,
// por factura, de la más vieja a la más nueva) → la hoja (abrirOrdenPago).
// Las dos funciones de la base se leyeron con pg_get_functiondef el
// 23/10/2026; el modelo de acá las copia y está anotado línea por línea.
// La impresión real (UNA página, la letra) la mide e2e/88-orden-pago-copias.spec.js.
// DESDE EL 31/10/2026 (rama ci-prueba/orden-pago-a4) la hoja es la A4 de dos
// columnas: "Con qué se pagó" (los cheques siguen SIN librador) y "Facturas
// que cancela" (Comprobante / Fecha / Importe / Aplicado / Le queda). Lo
// nuevo lo prueba test-cuentas-corrientes-orden-pago-a4.js.
//
//   node pruebas/test-cuentas-corrientes-orden-pago-copias.js
'use strict'

const path = require('path')
const { construirCon } = require('./sandbox')
const { arnes, leer, marca, chequearMarcas } = require('./circuito-comun')
const { fuenteNumeros } = require('./numeros-comun')
const { FUNCIONES_PAGO_APLICAR } = require('./pago-aplicar-comun')
// Arreglos 30/10 (la orden de pago A4, 31/10/2026)
const { FUNCIONES_ORDEN_PAGO_A4, CONSTANTES_ORDEN_PAGO_A4 } = require('./orden-pago-a4-comun')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/cuentas-corrientes.html')
const FUENTE = leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

const PRELUDIO = `
  ${fuenteNumeros()}
  var console = { log(){}, warn(){}, error(){} }
  function nuevoEl(id) {
    const clases = new Set()
    return { id, value: '', innerHTML: '', textContent: '', hidden: true, style: {}, dataset: {},
      classList: { add(c) { clases.add(c) }, remove(c) { clases.delete(c) }, contains(c) { return clases.has(c) } },
      addEventListener() {}, focus() {} }
  }
  var __els = new Map()
  var document = {
    getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) },
    documentElement: nuevoEl('html'),
  }
  var __impresiones = 0
  var window = { print() { __impresiones++ }, addEventListener() {}, removeEventListener() {} }
  var __rpc = [], __respuestas = {}
  var supabase = {
    rpc: async (nombre, params) => {
      __rpc.push({ nombre, params: JSON.parse(JSON.stringify(params)) })
      return __respuestas[nombre] ?? { data: null, error: null }
    },
  }
  var turnoOrdenPago = 0
  var ordenPagoActual = null
  function formatearFecha(f) { if (!f) return '—'; const [a, m, d] = String(f).split('-'); return d + '/' + m + '/' + a }
`

const FUNCIONES = [
  'esc', 'formatearImporte', 'importeHtml', 'numeroParaMostrar', 'centavosDe',
  'aplicacionesPago', 'parametrosPagoMixto',
  'logoSeguroCC', 'cuitConGuiones', 'fechaOrden', 'letrasMenorDeMil', 'letrasMenorDeMillon', 'enteroEnLetras', 'importeEnLetras',
  'htmlOrdenPago', 'lineaSaldoOrdenPago', 'leerSaldoOrdenPago', 'abrirOrdenPago', 'cerrarOrdenPago', 'imprimirOrdenPago',
  // aplicar un pago a facturas y anular un pago (30/10/2026)
  ...FUNCIONES_PAGO_APLICAR,
  // la orden de pago A4 (31/10/2026)
  ...FUNCIONES_ORDEN_PAGO_A4,
]
const CONSTANTES = ['NUMERO_SALDO_INICIAL', 'LETRAS_UNIDAD', 'LETRAS_DECENA', 'LETRAS_CENTENA', 'NOMBRE_MEDIO_ORDEN', ...CONSTANTES_ORDEN_PAGO_A4]

function sandbox() {
  return construirCon(ARCHIVO, {
    preludio: PRELUDIO, funciones: FUNCIONES, constantes: CONSTANTES,
    retorno: `__els, __rpc, __responder(n, r){ __respuestas[n] = r }, __impresiones(){ return __impresiones }, __doc: document`,
  })
}

// ── Leer la hoja que devolvió el render (texto, no regex sobre el código) ──
const sinEtiquetas = (h) => h.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
// Las hojas que salen (30/10/2026: UNA, la hoja entera, sin envoltorio de
// copia): [{ rotulo, html }]. Si volviera un envoltorio .op-copia, salen
// tantas como haya (y el chequeo de "una sola" da rojo).
function copias(html) {
  if (!html.includes('class="op-cab"')) return []
  const envueltas = html.split('<div class="op-copia ').slice(1)
  if (envueltas.length) return envueltas.map(trozo => ({ rotulo: 'copia', html: trozo.slice(trozo.indexOf('>') + 1) }))
  return [{ rotulo: 'la hoja', html }]
}
// Lo que hay entre el título de una sección y el de la siguiente.
function seccion(html, titulo, siguiente) {
  const i = html.indexOf(titulo)
  if (i < 0) return null
  const j = siguiente ? html.indexOf(siguiente, i) : -1
  return html.slice(i + titulo.length, j < 0 ? undefined : j)
}
// Las filas de la primera tabla de un trozo: { cabecera: [...], filas: [[...]] }.
function tabla(trozo) {
  if (!trozo || !trozo.includes('<table')) return null
  const celdas = (fila, tag) => fila.split(new RegExp(`<${tag}(?=[ >])`)).slice(1).map(c => sinEtiquetas('<x' + c.slice(0, c.indexOf(`</${tag}>`))))
  const cab = trozo.slice(trozo.indexOf('<thead>'), trozo.indexOf('</thead>'))
  const cuerpo = trozo.slice(trozo.indexOf('<tbody>'), trozo.indexOf('</tbody>'))
  return { cabecera: celdas(cab, 'th'), filas: cuerpo.split('<tr>').slice(1).map(f => celdas(f, 'td')) }
}

const ORDEN = {
  numero_texto: 'N-OP-00012', fecha: '2026-10-23', total: 650000.5, observaciones: 'Entregado en mano', creada_por: 'Facu',
  emisor: { empresa: 'Cucuruchos Nuss', razon_social: 'PAZ MIRTA', cuit: '20924106795', domicilio: 'Unión 843', logo_url: 'logo-cucuruchos-nuss.png' },
  proveedor: { razon_social: 'ANATOLIA SRL', cuit: '30712345678', direccion: 'Ruta 9' },
  facturas: [
    { tipo: 'Factura A', numero: '0003-00001201', fecha: '2026-08-20', importe: 250000, aplicado: 250000, saldo_actual: 0 },
    { tipo: 'Factura A', numero: '0003-00001245', fecha: '2026-09-05', importe: 400000, aplicado: 400000, saldo_actual: 0 },
  ],
  cheques: [{ banco: 'GALICIA', numero: '12345678', fecha_pago: '2026-10-25', librador: [{ nombre: 'PEREZ JUAN', cuit: '20111111112' }], es_echeq: true, importe: 120000, de_empresa: 'Dolce Pasta', otra_empresa: true }],
  otros_medios: [{ medio: 'transferencia', cuenta: 'Macro · Nuss', importe: 530000.5 }],
  a_favor: 0.5,
}

async function main() {
  // ══ 1. UNA SOLA HOJA, SIN ORIGINAL / DUPLICADO (30/10/2026) ════════════════
  {
    const S = sandbox()
    const h = S.htmlOrdenPago(ORDEN)
    const cs = copias(h)
    chk('sale UNA sola hoja (sin envoltorio de copias)', cs.length === 1 && !h.includes('op-copia') && !h.includes('data-copia'), String(cs.length))
    chk('no dice ORIGINAL ni DUPLICADO en ningún lado', !/ORIGINAL|DUPLICADO/.test(sinEtiquetas(h)))
    chk('la cabecera aparece una sola vez', (h.match(/class="op-cab"/g) || []).length === 1)
    for (const c of cs) {
      const t = sinEtiquetas(c.html)
      // El rótulo, arriba a la derecha bajo el número y la fecha.
      const titulo = sinEtiquetas(seccion(c.html, '<div class="op-cab__titulo">', '<div class="op-seccion ') ?? '')
      chk(`${c.rotulo}: arriba a la derecha dice "ORDEN DE PAGO", el número y la fecha, en ese orden (sin rótulo de copia)`,
        titulo === 'ORDEN DE PAGO N-OP-00012 Fecha 23/10/2026', titulo)
      chk(`${c.rotulo}: con las dos firmas`, t.includes('Recibí conforme (proveedor) — firma y aclaración') && t.includes('Autorizó'))
      chk(`${c.rotulo}: el total en número y en letras`, t.includes('$ 650.000,50') && t.includes('Son SEISCIENTOS CINCUENTA MIL PESOS CON CINCUENTA CENTAVOS'))
      chk(`${c.rotulo}: el proveedor, las observaciones y quién la generó`, t.includes('ANATOLIA SRL') && t.includes('Entregado en mano') && t.includes('Generada por Facu'))
    }
    chk('vacía tampoco se rompe: una hoja', copias(S.htmlOrdenPago({})).length === 1 && /ORDEN DE PAGO/.test(S.htmlOrdenPago({})))
  }

  // ══ 2. LOS CHEQUES SIN LIBRADOR ════════════════════════════════════════════
  {
    const S = sandbox()
    const h = S.htmlOrdenPago(ORDEN)
    for (const c of copias(h)) {
      const tv = tabla(seccion(c.html, 'Con qué se pagó', 'Facturas que cancela'))
      chk(`${c.rotulo}: los cheques con Banco, Número, Fecha de pago e Importe (sin Librador)`,
        JSON.stringify(tv?.cabecera) === '["Banco","Número","Fecha de pago","Importe"]', JSON.stringify(tv?.cabecera))
      chk(`${c.rotulo}: la fila del cheque`, JSON.stringify(tv?.filas) === '[["GALICIA eCheq","12345678","25/10/2026","$ 120.000,00"]]', JSON.stringify(tv?.filas))
    }
    const t = sinEtiquetas(h)
    chk('el librador no aparece en ningún lado (ni nombre ni CUIT)', !t.includes('PEREZ JUAN') && !t.includes('20-11111111-2') && !t.includes('Librador'))
    // 31/10/2026: la cuenta de la transferencia SÍ va (pedido de Facu:
    // "Transferencias (cuenta e importe)"); la empresa del cheque, no.
    chk('tampoco la empresa del cheque (la cuenta de la transferencia sí, desde el 31/10/2026)', !t.includes('Dolce Pasta') && t.includes('Macro · Nuss'))
    const conMarcas = S.htmlOrdenPago({ ...ORDEN, cheques: [{ banco: marca('banco'), numero: marca('cnum'), fecha_pago: '2026-10-01', librador: [{ nombre: marca('lib'), cuit: marca('lcuit') }], importe: 5 }] })
    chequearMarcas(chk, 'los cheques de la orden', conMarcas, ['banco', 'cnum'])
    chk('un librador con marcas no entra ni escapado', !conMarcas.includes('data-xss=&quot;lib') && !conMarcas.includes('data-xss=&quot;lcuit'))
  }

  // ══ 3. SE PAGAN FACTURAS → SE LISTAN (la cadena entera) ════════════════════
  // El formulario: tres facturas del proveedor, se tildan dos (la segunda
  // parcial) y una queda sin tildar. Valores: un cheque de $ 300.000 +
  // transferencia de $ 100.000.
  const FORMULARIO = [
    { id: 'fp-1', numero: '0003-00001201', fecha: '2026-08-20', saldo: 250000, monto: 250000, checked: true },
    { id: 'fp-2', numero: '0003-00001245', fecha: '2026-09-05', saldo: 400000, monto: 150000, checked: true },
    { id: 'fp-3', numero: '0003-00001300', fecha: '2026-10-01', saldo: 90000, monto: 90000, checked: false },
  ]
  const FACTURAS_BASE = new Map([
    ['fp-1', { tipo_documento: 'Factura A', numero_comprobante: '0003-00001201', fecha_factura: '2026-08-20', importe: 250000, saldo_pendiente: 250000 }],
    ['fp-2', { tipo_documento: 'Factura A', numero_comprobante: '0003-00001245', fecha_factura: '2026-09-05', importe: 400000, saldo_pendiente: 400000 }],
    ['fp-3', { tipo_documento: 'Factura A', numero_comprobante: '0003-00001300', fecha_factura: '2026-10-01', importe: 90000, saldo_pendiente: 90000 }],
  ])
  // pagar_proveedor_mixto (pg_get_functiondef, 23/10/2026): recorre
  // p_aplicaciones por fecha_factura, numero_comprobante; los cheques cubren
  // primero (v_ap_ch, al gasto de los cheques) y lo que falta va al del resto
  // (v_ap_re). Cada gasto escribe sus aplicaciones_pago (registrar_pago_proveedor)
  // y los dos quedan con orden_pago_id = la orden.
  function baseGuarda(p) {
    const cheques = 300000
    let disp = cheques
    const filas = []
    const lista = [...p.p_aplicaciones].sort((a, b) => {
      const fa = FACTURAS_BASE.get(a.factura_pendiente_id), fb = FACTURAS_BASE.get(b.factura_pendiente_id)
      return fa.fecha_factura.localeCompare(fb.fecha_factura) || fa.numero_comprobante.localeCompare(fb.numero_comprobante)
    })
    for (const a of lista) {
      const parte = Math.min(a.monto_aplicado, disp)
      if (parte > 0) { filas.push({ gasto_id: 'g-cheques', factura_pendiente_id: a.factura_pendiente_id, monto_aplicado: parte }); disp -= parte }
      if (a.monto_aplicado - parte > 0) filas.push({ gasto_id: 'g-resto', factura_pendiente_id: a.factura_pendiente_id, monto_aplicado: a.monto_aplicado - parte })
    }
    for (const f of filas) FACTURAS_BASE.get(f.factura_pendiente_id).saldo_pendiente -= f.monto_aplicado
    return { aplicaciones_pago: filas, gastosDeLaOrden: ['g-cheques', 'g-resto'], total: cheques + p.p_monto_resto }
  }
  // datos_orden_pago (pg_get_functiondef, 23/10/2026), 'facturas':
  // sum(monto_aplicado) de aplicaciones_pago de los gastos de la orden,
  // agrupado por factura, con tipo / número / fecha / importe / saldo actual,
  // ordenado por fecha_factura, numero_comprobante.
  function baseDevuelve(g) {
    const suma = new Map()
    for (const a of g.aplicaciones_pago) {
      if (!g.gastosDeLaOrden.includes(a.gasto_id)) continue
      suma.set(a.factura_pendiente_id, (suma.get(a.factura_pendiente_id) ?? 0) + a.monto_aplicado)
    }
    const facturas = [...suma].map(([id, aplicado]) => {
      const f = FACTURAS_BASE.get(id)
      return { tipo: f.tipo_documento, numero: f.numero_comprobante, fecha: f.fecha_factura, importe: f.importe, aplicado, saldo_actual: f.saldo_pendiente }
    }).sort((a, b) => a.fecha.localeCompare(b.fecha) || a.numero.localeCompare(b.numero))
    return { ...ORDEN, total: g.total, facturas, a_favor: g.total - [...suma.values()].reduce((s, x) => s + x, 0) }
  }
  esperas.push((async () => {
    const S = sandbox()
    const t = { cResto: 10000000, cValores: 40000000, cFacturas: 40000000 }
    const params = S.parametrosPagoMixto({ proveedorId: 'pv1', unidadId: 'u-n', fecha: '2026-10-23', chequeIds: ['chq-1'], t,
      medio: 'transferencia', cuentaId: 'cta-1', facturas: FORMULARIO, observaciones: '' })
    chk('a la base viajan las dos tildadas, con lo que se aplica a cada una (la parcial, parcial)',
      JSON.stringify(params.p_aplicaciones) === JSON.stringify([{ factura_pendiente_id: 'fp-1', monto_aplicado: 250000 }, { factura_pendiente_id: 'fp-2', monto_aplicado: 150000 }]),
      JSON.stringify(params.p_aplicaciones))
    const guardado = baseGuarda(params)
    chk('el modelo de la base parte la segunda factura entre los cheques y la transferencia (como pagar_proveedor_mixto)',
      guardado.aplicaciones_pago.filter(a => a.factura_pendiente_id === 'fp-2').length === 2)
    S.__responder('datos_orden_pago', { data: baseDevuelve(guardado), error: null })
    await S.abrirOrdenPago('op-12')
    chk('la orden se lee con su id', S.__rpc.at(-1)?.nombre === 'datos_orden_pago' && S.__rpc.at(-1)?.params?.p_orden_id === 'op-12')
    const hoja = S.__els.get('orden-pago-hoja').innerHTML
    chk('la orden se abre', S.__els.get('modal-orden-pago').hidden === false)
    // Sin esto, una hoja vacía pasaría el for de abajo sin afirmar nada.
    chk('la hoja abierta es UNA sola', copias(hoja).length === 1, hoja.slice(0, 80))
    for (const c of copias(hoja)) {
      const trozo = seccion(c.html, 'Facturas que cancela', 'op-totales')
      chk(`${c.rotulo}: con facturas pagadas NO dice "Pago a cuenta"`, trozo !== null && !trozo.includes('Pago a cuenta'))
      const tf = tabla(trozo)
      chk(`${c.rotulo}: la tabla de comprobantes (Comprobante, Fecha, Importe, Aplicado, Le queda)`,
        JSON.stringify(tf?.cabecera) === '["Comprobante","Fecha","Importe","Aplicado","Le queda"]', JSON.stringify(tf?.cabecera))
      chk(`${c.rotulo}: se listan las DOS pagadas, la más vieja arriba, con número, fecha e importe aplicado (la partida, sumada)`,
        JSON.stringify(tf?.filas) === JSON.stringify([
          ['Factura A 0003-00001201', '20/08/2026', '$ 250.000,00', '$ 250.000,00', '$ 0,00'],
          ['Factura A 0003-00001245', '05/09/2026', '$ 400.000,00', '$ 150.000,00', '$ 250.000,00'],
        ]), JSON.stringify(tf?.filas))
      chk(`${c.rotulo}: la que no se tildó no aparece`, !c.html.includes('0003-00001300'))
    }
    chk('no queda nada a favor (lo aplicado = lo pagado); sí lo pendiente de la parcial', !hoja.includes('Queda a favor') && sinEtiquetas(hoja).includes('Queda saldo pendiente $ 250.000,00'))
  })())

  // Sin facturas sí es "Pago a cuenta".
  {
    const S = sandbox()
    const cs = copias(S.htmlOrdenPago({ ...ORDEN, facturas: [] }))
    chk('sin facturas: "Pago a cuenta", sin tabla de comprobantes',
      cs.length === 1 && cs.every(c => { const s = seccion(c.html, 'Facturas que cancela', 'op-totales'); return s.includes('Pago a cuenta') && !s.includes('<table') }))
    // El saldo inicial se nombra como en el resto del módulo.
    const si = copias(S.htmlOrdenPago({ ...ORDEN, facturas: [{ tipo: 'otro', numero: 'SALDO-INICIAL', fecha: '2026-10-10', importe: 9, aplicado: 9, saldo_actual: 0 }] }))
    chk('el saldo inicial dice "Saldo inicial" en el comprobante', tabla(seccion(si[0].html, 'Facturas que cancela', 'op-totales'))?.filas?.[0]?.[0] === 'Saldo inicial')
  }

  // Muchas facturas: todas (la hoja no corta ninguna).
  {
    const S = sandbox()
    const muchas = Array.from({ length: 30 }, (_, i) => ({ tipo: 'Factura A', numero: `0003-${String(2000 + i).padStart(8, '0')}`, fecha: '2026-09-01', importe: 1000, aplicado: 1000, saldo_actual: 0 }))
    const cs = copias(S.htmlOrdenPago({ ...ORDEN, facturas: muchas }))
    chk('30 facturas: las 30', cs.length === 1 && cs.every(c => tabla(seccion(c.html, 'Facturas que cancela', 'op-totales'))?.filas?.length === 30))
  }

  // ══ 4. IMPRIMIR Y CERRAR ═══════════════════════════════════════════════════
  {
    const S = sandbox()
    S.imprimirOrdenPago()
    chk('"Imprimir / Guardar PDF" marca el html (la hoja) e imprime una vez', S.__impresiones() === 1 && S.__doc.documentElement.classList.contains('op-imprimiendo'))
    S.cerrarOrdenPago()
    chk('"Cerrar" saca la marca', !S.__doc.documentElement.classList.contains('op-imprimiendo'))
  }

  // ══ 5. LA HOJA DE IMPRESIÓN (el CSS que la arma) ═══════════════════════════
  // Lo que pasa de verdad al imprimir lo mide e2e/88-orden-pago-copias.spec.js
  // (un PDF de Chromium de UNA página); acá, que las reglas estén.
  {
    const css = FUENTE.slice(FUENTE.indexOf('/* ── La orden de pago'), FUENTE.indexOf('/* La orden de pago en el renglón del pago'))
    const regla = (sel) => { const i = css.indexOf(sel + ' {'); return i < 0 ? '' : css.slice(i, css.indexOf('}', i)) }
    chk('se leyó el CSS de la orden de pago', css.length > 500 && css.includes('.op-hoja {'))
    chk('ya no hay reglas de copias (ni el duplicado en otra hoja ni la nota)', !/op-copia|op-nota-copias|break-before: page/.test(css))
    const pt = (sel, prop) => Number((regla(sel).match(new RegExp(prop + ': ([0-9.]+)pt')) || [])[1])
    // Antes (20/10/2026): hoja 10.5pt, tabla 9.5pt, razón social 13pt.
    chk('la letra de la hoja al ~80% (10.5pt → 8.5pt)', pt('    .op-hoja', 'font-size') === 8.5)
    chk('la letra de la tabla al ~80% (9.5pt → 7.5pt)', pt('    .op-tabla', 'font-size') === 7.5)
    chk('ni el estilo del rótulo de copia', !css.includes('.op-cab__copia'))
  }
  {
    // La nota "Se imprimen dos hojas iguales" del modal se fue.
    chk('el modal ya no avisa que salen dos hojas', !FUENTE.includes('nota-copias-orden') && !FUENTE.includes('Se imprimen dos hojas iguales'))
  }

  fin()
}

main()
