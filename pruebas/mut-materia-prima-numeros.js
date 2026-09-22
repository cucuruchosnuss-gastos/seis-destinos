// Mutaciones de test-materia-prima-numeros.js. Ver mutar.js (los tres guards:
// suite verde sobre el limpio, ancla única, mutación que cambia algo).
//
//   node pruebas/mut-materia-prima-numeros.js
//
// Sin automáticas: los esc() de estos renders los cubre la suite del circuito.
// Cada una rompe, de a una, una lectura (vuelve a Number / parseFloat), una
// escritura (saca el ponerNumero), un enlace, la regla de decimales o un
// formateador. Todas tienen que dar ROJO.

const path = require('path')
const { correrMutaciones } = require('./mutar')

const RAIZ = path.join(__dirname, '..')
const PF = (x) => `parseFloat(String(${x}).replace(',', '.'))`

const BULTOS_REC = "          const n = leerCampoNumero(el)\n          it.error = (el.value.trim() !== '' && n === null)\n            ? 'No se entiende ese número de bultos."
const BASE_REC = "          const n = leerCampoNumero(el)\n          it.error = (el.value.trim() !== '' && n === null)\n            ? 'No se entiende esa cantidad."

correrMutaciones({
  suite: path.join(__dirname, 'test-materia-prima-numeros.js'),
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/materia-prima.html'),
  funciones: [],
  manuales: [
    // ── Lecturas ─────────────────────────────────────────────────────────────
    { nombre: 'los campos del ítem se leen con parseFloat',
      de: '              item[campo] = leerCampoNumero(el)', a: `              item[campo] = ${PF('el.value')}` },
    { nombre: 'los campos del ítem se leen con Number',
      de: '              item[campo] = leerCampoNumero(el)', a: "              item[campo] = el.value === '' ? null : Number(el.value)" },
    { nombre: 'las líneas mixtas se leen con parseFloat',
      de: '            item.lineas[n][campo] = leerCampoNumero(el)', a: `            item.lineas[n][campo] = ${PF('el.value')}` },
    { nombre: 'las líneas mixtas se leen con Number',
      de: '            item.lineas[n][campo] = leerCampoNumero(el)', a: "            item.lineas[n][campo] = el.value === '' ? null : Number(el.value)" },
    { nombre: 'el total de la factura se lee con parseFloat',
      de: '        estado.wizard.totalFactura = leerCampoNumero(campo)', a: `        estado.wizard.totalFactura = ${PF('campo.value')}` },
    { nombre: 'el total de la factura se lee con Number',
      de: '        estado.wizard.totalFactura = leerCampoNumero(campo)', a: '        estado.wizard.totalFactura = Number(campo.value)' },
    { nombre: 'el total de la factura se guarda como TEXTO',
      de: '        estado.wizard.totalFactura = leerCampoNumero(campo)', a: '        estado.wizard.totalFactura = campo.value' },
    { nombre: 'el reintento lee el total con parseFloat',
      de: '      const importe = input ? leerCampoNumero(input) : null', a: `      const importe = input ? ${PF('input.value')} : null` },
    { nombre: 'el reintento lee el total con Number',
      de: '      const importe = input ? leerCampoNumero(input) : null', a: '      const importe = input ? Number(input.value) : null' },
    { nombre: 'la recepción lee los bultos con parseFloat',
      de: BULTOS_REC, a: BULTOS_REC.replace('leerCampoNumero(el)', PF('el.value')) },
    { nombre: 'la recepción lee los bultos con Number',
      de: BULTOS_REC, a: BULTOS_REC.replace('leerCampoNumero(el)', "(el.value === '' ? null : Number(el.value))") },
    { nombre: 'la recepción lee la cantidad directa con parseFloat',
      de: BASE_REC, a: BASE_REC.replace('leerCampoNumero(el)', PF('el.value')) },
    { nombre: 'la recepción lee la cantidad directa con Number',
      de: BASE_REC, a: BASE_REC.replace('leerCampoNumero(el)', "(el.value === '' ? null : Number(el.value))") },
    { nombre: 'el importe del OCR guardado se lee con la regla de lo tipeado',
      de: '      return numeroDesdeOcr(c?.importe_ocr)', a: '      return leerNumeroAr(c?.importe_ocr)' },
    { nombre: 'el total tocado y borrado vuelve al del OCR',
      de: '      return w.totalFacturaTocado ? (w.totalFactura ?? null) : (w.importeOcr ?? null)', a: '      return w.totalFactura ?? w.importeOcr ?? null' },
    // ── Escrituras ───────────────────────────────────────────────────────────
    { nombre: 'el total se escribe como texto crudo (sin ponerNumero)',
      de: "      ponerNumero(document.getElementById('campo-total-factura'), totalFacturaDe(w))",
      a: "      document.getElementById('campo-total-factura').value = String(totalFacturaDe(w) ?? '')" },
    { nombre: 'las cantidades se escriben como texto crudo (sin ponerNumero)',
      de: '    function ponerCantidadEnCampo(el, n, esEntero) {\n      ponerNumero(el, n)',
      a: "    function ponerCantidadEnCampo(el, n, esEntero) {\n      el.value = n == null ? '' : String(n).replace('.', ',')" },
    { nombre: 'un número que no entra en los decimales se redondea en silencio',
      de: '      if (leido !== null && Math.abs(leido - n) < 1e-9) return\n', a: '      return\n' },
    { nombre: 'el reintento no escribe el importe del OCR',
      de: '        ponerNumero(input, importeOcrDe(c))\n', a: '' },
    { nombre: 'el re-render de la recepción pisa lo que se está tipeando',
      de: "      if (texto !== undefined && campo !== 'motivo') nuevo.value = texto\n", a: '' },
    // ── Enlaces y decimales ──────────────────────────────────────────────────
    { nombre: 'la tarjeta no enlaza sus cantidades',
      de: '        enlazarCantidadesItem(tarjeta, item)\n', a: '' },
    { nombre: 'el campo del total no se enlaza',
      de: '    enlazarCampoNumero(campoTotal, { decimales: 2 })\n', a: '' },
    { nombre: 'el reintento no se enlaza',
      de: '        enlazarCampoNumero(input, { decimales: 2 })\n        const c = entrega', a: '        const c = entrega' },
    { nombre: 'las unidades enteras admiten decimales',
      de: '      return (enteros || esUnidadEntera(unidad)) ? 0 : DECIMALES_CANTIDAD', a: '      return DECIMALES_CANTIDAD' },
    { nombre: 'los bultos del ítem admiten decimales',
      de: "      return decimalesCantidad({ unidad: item.unidadMedida, enteros: campoEsEntero(item, campo) })", a: "      return decimalesCantidad({ unidad: item.unidadMedida })" },
    { nombre: 'los bultos de una línea mixta admiten decimales',
      de: "enteros: campo === 'bultos' })\n        enlazarCampoNumero(el, { decimales })", a: "enteros: false })\n        enlazarCampoNumero(el, { decimales })" },
    { nombre: 'kilos con 2 decimales en vez de 3',
      de: '    const DECIMALES_CANTIDAD = 3\n', a: '    const DECIMALES_CANTIDAD = 2\n' },
    { nombre: 'los bultos de la recepción admiten decimales',
      de: "        enlazarCampoNumero(el, { decimales: 0 })\n        ponerCantidadEnCampo(el, estado.recepcion", a: "        enlazarCampoNumero(el, { decimales: 3 })\n        ponerCantidadEnCampo(el, estado.recepcion" },
    // ── Formateadores ────────────────────────────────────────────────────────
    { nombre: 'formatearCantidad con null dice "— kg"',
      de: "      const num = formatearNumeroAr(n, { decimales: 2, minimos: 0 })\n      if (num === '—') return '—'\n", a: "      const num = formatearNumeroAr(n, { decimales: 2, minimos: 0 })\n" },
    { nombre: 'formatearCantidad vuelve al cero inventado',
      de: "      const num = formatearNumeroAr(n, { decimales: 2, minimos: 0 })\n      if (num === '—') return '—'\n", a: "      const num = Number(n ?? 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })\n" },
    { nombre: 'formatearNumero vuelve al cero inventado',
      de: '    function formatearNumero(n) {\n      return formatearNumeroAr(n, { decimales: 2, minimos: 0 })', a: "    function formatearNumero(n) {\n      return Number(n ?? 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })" },
    { nombre: 'formatearCantidad cambia los decimales que muestra',
      de: "      const num = formatearNumeroAr(n, { decimales: 2, minimos: 0 })\n      if (num === '—') return '—'\n", a: "      const num = formatearNumeroAr(n, { decimales: 3, minimos: 0 })\n      if (num === '—') return '—'\n" },
  ],
})
