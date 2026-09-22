// Mutaciones de test-cuentas-corrientes-numeros.js. Ver mutar.js (los tres
// guards: suite verde sobre el limpio, ancla única, mutación que cambia algo).
//
//   node pruebas/mut-cuentas-corrientes-numeros.js
//
// Sin automáticas: los esc() de estos renders los cubre la suite del circuito.
// Cada una rompe, de a una, una lectura (vuelve a Number / parseFloat / el
// parser viejo), una escritura (saca el ponerNumero), un enlace o un
// formateador. Todas tienen que dar ROJO.

const path = require('path')
const { correrMutaciones } = require('./mutar')

const RAIZ = path.join(__dirname, '..')
const PF = (x) => `parseFloat(String(${x}).replace(',', '.'))`
const VIEJO = (x) => `parseFloat(String(${x}).replace(/\\./g, '').replace(',', '.'))`
const V = (id) => `document.getElementById('${id}').value`

correrMutaciones({
  suite: path.join(__dirname, 'test-cuentas-corrientes-numeros.js'),
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/cuentas-corrientes.html'),
  funciones: [],
  manuales: [
    // ── Lecturas ─────────────────────────────────────────────────────────────
    { nombre: 'montoDeCampo lee con parseFloat',
      de: '      return leerCampoNumero(document.getElementById(id))', a: `      return ${PF('document.getElementById(id).value')}` },
    { nombre: 'montoDeCampo lee con Number',
      de: '      return leerCampoNumero(document.getElementById(id))', a: '      return Number(document.getElementById(id).value) || null' },
    { nombre: 'montoDeCampo vuelve al parser viejo (borra todos los puntos)',
      de: '      return leerCampoNumero(document.getElementById(id))', a: `      return ${VIEJO('document.getElementById(id).value')} || null` },
    { nombre: 'sugerencias FIFO leen el pago con parseFloat',
      de: "      const monto  = montoDeCampo('campo-monto-pago')", a: `      const monto  = ${PF(V('campo-monto-pago'))}` },
    { nombre: 'confirmarPago lee el monto con parseFloat',
      de: "      const monto = montoDeCampo('campo-monto-pago')\n      if (!moneda)", a: `      const monto = ${PF(V('campo-monto-pago'))}\n      if (!moneda)` },
    { nombre: 'confirmarPago lee el monto con Number',
      de: "      const monto = montoDeCampo('campo-monto-pago')\n      if (!moneda)", a: `      const monto = Number(${V('campo-monto-pago')})\n      if (!moneda)` },
    { nombre: 'confirmarAplicarCredito lee el monto con parseFloat',
      de: "      const monto = montoDeCampo('campo-monto-credito')", a: `      const monto = ${PF(V('campo-monto-credito'))}` },
    { nombre: 'confirmarAplicarCredito lee el monto con Number',
      de: "      const monto = montoDeCampo('campo-monto-credito')", a: `      const monto = Number(${V('campo-monto-credito')})` },
    { nombre: 'el monto FIFO se lee con parseFloat',
      de: '          facturasParaPago[i].monto = leerCampoNumero(e.target) || 0', a: `          facturasParaPago[i].monto = ${PF('e.target.value')} || 0` },
    { nombre: 'el monto FIFO se lee con Number',
      de: '          facturasParaPago[i].monto = leerCampoNumero(e.target) || 0', a: '          facturasParaPago[i].monto = Number(e.target.value) || 0' },
    { nombre: '"Cargar importe" se lee con parseFloat',
      de: '      form.importe = leerCampoNumero(input)', a: `      form.importe = ${PF('input.value')}` },
    { nombre: '"Cargar importe" se lee con Number',
      de: '      form.importe = leerCampoNumero(input)', a: '      form.importe = Number(input.value)' },
    { nombre: '"Cargar importe" vuelve a guardar el TEXTO del campo',
      de: '      form.importe = leerCampoNumero(input)', a: '      form.importe = input.value' },
    { nombre: 'el prefill del crédito ignora el saldo de la factura',
      de: '      const saldoFactura = aNumero(factura?.saldo_pendiente)', a: '      const saldoFactura = null' },
    // ── Escrituras ───────────────────────────────────────────────────────────
    { nombre: 'la sugerencia FIFO no se escribe en el campo',
      de: '        ponerNumero(inp, facturasParaPago[Number(inp.dataset.index)].monto || null)\n', a: '' },
    { nombre: 'la sugerencia FIFO se escribe como texto con punto decimal',
      de: '        ponerNumero(inp, facturasParaPago[Number(inp.dataset.index)].monto || null)', a: "        inp.value = facturasParaPago[Number(inp.dataset.index)].monto ? String(facturasParaPago[Number(inp.dataset.index)].monto) : ''" },
    { nombre: 'tildar una factura escribe el saldo como texto',
      de: '            ponerNumero(cont.querySelector(`.monto-fifo[data-index="${i}"]`), facturasParaPago[i].monto)',
      a: '            cont.querySelector(`.monto-fifo[data-index="${i}"]`).value = String(facturasParaPago[i].monto)' },
    { nombre: 'el prefill del crédito se escribe como texto',
      de: "      ponerNumero(document.getElementById('campo-monto-credito'), sugerido)", a: "      document.getElementById('campo-monto-credito').value = String(sugerido)" },
    { nombre: 'elegir el crédito no limpia el monto',
      de: "      ponerNumero(document.getElementById('campo-monto-credito'), null)\n", a: '' },
    { nombre: 'abrir el pago no limpia el monto',
      de: "      ponerNumero(document.getElementById('campo-monto-pago'), null)\n", a: '' },
    { nombre: 'abrir el pago limpia con .value y deja el enlace con lo viejo',
      de: "      ponerNumero(document.getElementById('campo-monto-pago'), null)\n", a: "      document.getElementById('campo-monto-pago').value = 'x'\n" },
    { nombre: '"Cargar importe" no repone el número al redibujar',
      de: '      ponerNumero(input, form.importe ?? null)\n', a: '' },
    { nombre: '"Cargar importe" vuelve a llevar el value en la plantilla',
      de: 'placeholder="0,00" aria-label="Importe">', a: 'placeholder="0,00" value="${esc(form.importe ?? \'\')}" aria-label="Importe">' },
    // ── Enlaces ──────────────────────────────────────────────────────────────
    { nombre: 'los montos fijos no se enlazan',
      de: '      for (const id of IDS_CAMPOS_MONTO) enlazarCampoNumero(document.getElementById(id), { decimales: 2 })',
      a: '      for (const id of IDS_CAMPOS_MONTO) void id' },
    { nombre: 'los montos fijos se enlazan con 0 decimales',
      de: 'enlazarCampoNumero(document.getElementById(id), { decimales: 2 })', a: 'enlazarCampoNumero(document.getElementById(id), { decimales: 0 })' },
    { nombre: 'el monto del crédito queda afuera de la lista',
      de: "    const IDS_CAMPOS_MONTO = ['campo-monto-pago', 'campo-monto-credito']", a: "    const IDS_CAMPOS_MONTO = ['campo-monto-pago']" },
    { nombre: 'el enlace no corre al iniciar',
      de: '    enlazarCamposMonto()\n', a: '' },
    { nombre: 'los montos FIFO no se enlazan',
      de: '        enlazarCampoNumero(inp, { decimales: 2 })\n', a: '' },
    { nombre: '"Cargar importe" no se enlaza',
      de: '      enlazarCampoNumero(input, { decimales: decimalesImporteSin(form) })\n', a: '' },
    { nombre: '"Cargar importe" se enlaza siempre con 2 decimales (el precio por unidad se corta)',
      de: '      enlazarCampoNumero(input, { decimales: decimalesImporteSin(form) })', a: '      enlazarCampoNumero(input, { decimales: 2 })' },
    { nombre: 'el precio por unidad admite 5 decimales',
      de: "return form?.modo === 'unidad' ? 4 : 2", a: "return form?.modo === 'unidad' ? 5 : 2" },
    { nombre: 'el total admite 4 decimales',
      de: "return form?.modo === 'unidad' ? 4 : 2", a: "return 4" },
    { nombre: 'el total en modo total no se redondea a 2',
      de: "if (form.modo !== 'unidad') return Math.round(n * 100) / 100", a: "if (form.modo !== 'unidad') return n" },
    { nombre: 'el total por unidad no se redondea a 2',
      de: "return Math.round(n * Number(unico.cantidad) * 100) / 100", a: "return n * Number(unico.cantidad)" },
    { nombre: 'totalImporteFormulario lee con 2 decimales (el precio de 4 decimales da null)',
      de: "const n = leerNumeroAr(form?.importe ?? null, { decimales: decimalesImporteSin(form) })", a: "const n = leerNumeroAr(form?.importe ?? null)" },
    { nombre: 'la ficha no enlaza "Cargar importe" al redibujar',
      de: '      enlazarCampoImporteSin(listaEl)\n', a: '' },
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
    { nombre: 'textoCantidadInsumo muestra siempre 3 decimales',
      de: 'formatearNumeroAr(c.cantidad, { decimales: 3, minimos: 0 })', a: 'formatearNumeroAr(c.cantidad, { decimales: 3 })' },
  ],
})
