// Mutaciones de test-cheques-pago-cartera.js (el pago con cheques de la
// cartera, 05/10/2026, y que no vuelva la pestaña "Emitidos", 11/10/2026).
// Ver mutar.js. Antes se llamaba mut-cheques-emitidos.js.
//
//   node pruebas/mut-cheques-pago-cartera.js

const path = require('path')
const { correrMutaciones } = require('./mutar')
// La cartera vive en una región de administracion.html: se muta SOLO ahí.
const { ARCHIVO_CHEQUES, limitesCheques } = require('./fuente-cheques')

correrMutaciones({
  region: limitesCheques,
  suite: path.join(__dirname, 'test-cheques-pago-cartera.js'),
  original: process.env.ARCHIVO_BASE || ARCHIVO_CHEQUES,
  escape: 'esc',
  funciones: [],
  manuales: [
    // ── El pago con cheques de la cartera ─────────────────────────────────
    { nombre: 'un pago con cheques de la cartera ofrece volver a cartera', de: "      return ch?.estado === 'endosado' && !!(ch.salida_proveedor_id || ch.pago_gasto_id)", a: "      return ch?.estado === 'endosado' && !!ch.salida_proveedor_id" },
    { nombre: 'el link al pago no usa pago_gasto_id', de: '      return ch?.pago_gasto_id || ch?.salida_gasto_id || null', a: '      return ch?.salida_gasto_id || null' },
    { nombre: '"Pagó su cuenta" sin el link al pago', de: "Pagó su cuenta corriente</span>' + htmlLinkPago(ch)", a: "Pagó su cuenta corriente</span>'" },
    { nombre: 'el link al pago sin encodeURIComponent', de: 'href="cuentas-corrientes.html?pago=${encodeURIComponent(g)}">Ver el pago</a>', a: 'href="cuentas-corrientes.html?pago=${g}">Ver el pago</a>' },
    { nombre: 'la lista no trae pago_gasto_id', de: 'salida_proveedor_id, salida_gasto_id, pago_gasto_id, salida_cuenta_id', a: 'salida_proveedor_id, salida_gasto_id, salida_cuenta_id' },
    { nombre: '"Ver el pago" además abre la cobranza', de: "      cont.querySelectorAll('.chq-link-pago').forEach(a => a.addEventListener('click', (ev) => ev.stopPropagation()))\n", a: '' },
    // ── 11/10/2026: "Emitidos" NO vuelve ──────────────────────────────────
    { nombre: 'vuelve el segmentado Cartera | Emitidos', de: '    <div id="chq-vista" hidden>\n', a: '    <div id="chq-vista" hidden>\n      <div class="chq-segmento" id="chq-vistas"><button type="button" data-chq-vista="emitidos">Emitidos</button></div>\n' },
    { nombre: 'vuelve el panel de los emitidos', de: '      <div class="chq-vacio" id="chq-vacio" hidden></div>\n', a: '      <div class="chq-vacio" id="chq-vacio" hidden></div>\n      <div id="chq-panel-emitidos" hidden></div>\n' },
    { nombre: 'la cartera vuelve a ir envuelta en un panel', de: '    <div id="chq-vista" hidden>\n', a: '    <div id="chq-vista" hidden>\n      <div id="chq-panel-cartera"></div>\n' },
    { nombre: 'vuelve la lectura de cheques_emitidos', de: '    async function refrescarTodo() {\n', a: "    async function cargarEmitidos() { await supabase.from('cheques_emitidos').select('id') }\n    async function refrescarTodo() {\n" },
    { nombre: 'se va la tabla de la cartera', de: '<table class="chq-tabla" id="chq-tabla"></table>', a: '' },
  ],
})
