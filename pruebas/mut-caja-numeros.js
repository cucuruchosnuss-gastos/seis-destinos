// Mutaciones de test-caja-numeros.js. Ver mutar.js (los tres guards: suite
// verde sobre el limpio, ancla única, mutación que cambia algo).
//
//   node pruebas/mut-caja-numeros.js
//
// Sin automáticas: los esc() del módulo no tienen suite propia de XSS acá, y
// estas prueban números. Cada una rompe, de a una, una lectura (vuelve a
// Number / parseFloat / el parser viejo), una escritura (saca el ponerNumero),
// el enlace de un campo o un formateador. Todas tienen que dar ROJO.

const path = require('path')
const { correrMutaciones } = require('./mutar')

const RAIZ = path.join(__dirname, '..')
const PF = (x) => `parseFloat(String(${x}).replace(',', '.'))`
const VIEJO = (x) => `parseFloat(String(${x}).replace(/\\./g, '').replace(',', '.'))`
const V = (id) => `document.getElementById('${id}').value`

correrMutaciones({
  suite: path.join(__dirname, 'test-caja-numeros.js'),
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/caja.html'),
  funciones: [],
  manuales: [
    // ── Lecturas ─────────────────────────────────────────────────────────────
    { nombre: 'montoDeCampo lee con parseFloat',
      de: '      return leerCampoNumero(document.getElementById(id))', a: `      return ${PF("document.getElementById(id).value")}` },
    { nombre: 'montoDeCampo lee con Number',
      de: '      return leerCampoNumero(document.getElementById(id))', a: '      return Number(document.getElementById(id).value) || null' },
    { nombre: 'montoDeCampo vuelve al parser viejo (borra todos los puntos)',
      de: '      return leerCampoNumero(document.getElementById(id))', a: `      return ${VIEJO("document.getElementById(id).value")} || null` },
    { nombre: 'guardarMovimiento lee el monto con parseFloat',
      de: "      const monto       = montoDeCampo('movimiento-monto')", a: `      const monto       = ${PF(V('movimiento-monto'))}` },
    { nombre: 'guardarMovimiento lee el monto con Number',
      de: "      const monto       = montoDeCampo('movimiento-monto')", a: `      const monto       = Number(${V('movimiento-monto')})` },
    { nombre: 'guardarTraspaso lee el monto de origen con parseFloat',
      de: "      const monto           = montoDeCampo('traspaso-monto')", a: `      const monto           = ${PF(V('traspaso-monto'))}` },
    { nombre: 'guardarTraspaso lee el monto de origen con Number',
      de: "      const monto           = montoDeCampo('traspaso-monto')", a: `      const monto           = Number(${V('traspaso-monto')})` },
    { nombre: 'guardarTraspaso lee el monto de destino con parseFloat',
      de: "        montoDestino = montoDeCampo('traspaso-monto-destino')", a: `        montoDestino = ${PF(V('traspaso-monto-destino'))}` },
    { nombre: 'guardarTraspaso lee el monto de destino con Number',
      de: "        montoDestino = montoDeCampo('traspaso-monto-destino')", a: `        montoDestino = Number(${V('traspaso-monto-destino')})` },
    { nombre: 'guardarTraspaso manda el monto de origen como destino entre monedas',
      de: "        montoDestino = montoDeCampo('traspaso-monto-destino')", a: "        montoDestino = montoDeCampo('traspaso-monto')" },
    // ── Escrituras ───────────────────────────────────────────────────────────
    { nombre: 'abrir el movimiento no limpia el monto',
      de: "      ponerNumero(document.getElementById('movimiento-monto'), null)\n", a: '' },
    { nombre: 'abrir el movimiento limpia con .value y deja el enlace con lo viejo',
      de: "      ponerNumero(document.getElementById('movimiento-monto'), null)\n", a: "      document.getElementById('movimiento-monto').value = 'x'\n" },
    { nombre: 'abrir el traspaso no limpia el monto de origen',
      de: "      ponerNumero(document.getElementById('traspaso-monto'), null)\n", a: '' },
    { nombre: 'abrir el traspaso no limpia el monto de destino',
      de: "      ponerNumero(document.getElementById('traspaso-monto-destino'), null)\n", a: '' },
    // ── Enlaces ──────────────────────────────────────────────────────────────
    { nombre: 'los montos no se enlazan',
      de: '      for (const id of IDS_CAMPOS_MONTO) enlazarCampoNumero(document.getElementById(id), { decimales: 2 })',
      a: '      for (const id of IDS_CAMPOS_MONTO) void id' },
    { nombre: 'los montos se enlazan con 0 decimales',
      de: 'enlazarCampoNumero(document.getElementById(id), { decimales: 2 })', a: 'enlazarCampoNumero(document.getElementById(id), { decimales: 0 })' },
    { nombre: 'el monto de destino del traspaso queda afuera de la lista',
      de: "    const IDS_CAMPOS_MONTO = ['movimiento-monto', 'traspaso-monto', 'traspaso-monto-destino']",
      a: "    const IDS_CAMPOS_MONTO = ['movimiento-monto', 'traspaso-monto']" },
    { nombre: 'el enlace no corre al iniciar',
      de: '    enlazarCamposMonto()\n\n    init()', a: '    init()' },
    { nombre: 'el HTML del monto vuelve a type="number"',
      de: '<input type="text" inputmode="decimal" id="movimiento-monto"', a: '<input type="number" id="movimiento-monto"' },
    // ── Mostrar ──────────────────────────────────────────────────────────────
    { nombre: 'formatearImporte vuelve a Number(): \'\' da "$ 0,00"',
      de: "      const num = formatearNumeroAr(importe, { decimales: 2 })\n      if (num === '—') return '—'",
      a: "      if (importe == null) return '—'\n      const num = formatearNumeroAr(Number(importe), { decimales: 2 })" },
    { nombre: 'formatearImporte pierde el prefijo de la moneda extranjera',
      de: "      return moneda === 'ARS' ? `$ ${num}` : `${moneda} ${num}`\n    }\n\n    // Igual que formatearImporte()",
      a: "      return `$ ${num}`\n    }\n\n    // Igual que formatearImporte()" },
    { nombre: 'formatearImporteCentavosSuaves vuelve a importe || 0 (null da "$ 0,00")',
      de: '      const texto = formatearNumeroAr(importe, { decimales: 2 })', a: '      const texto = formatearNumeroAr(importe || 0, { decimales: 2 })' },
    { nombre: 'formatearImporteCentavosSuaves deja de escapar la moneda',
      de: "      const simbolo = moneda === 'ARS' ? '$' : esc(moneda)", a: "      const simbolo = moneda === 'ARS' ? '$' : moneda" },
    { nombre: 'importeHtml deja de escapar',
      de: '      return esc(formatearImporte(importe, moneda))', a: '      return formatearImporte(importe, moneda)' },
  ],
})
