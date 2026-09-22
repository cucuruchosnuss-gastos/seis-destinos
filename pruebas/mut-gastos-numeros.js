// Mutaciones de test-gastos-numeros.js. Ver mutar.js (los tres guards:
// suite verde sobre el limpio, ancla única, mutación que cambia algo).
//
//   node pruebas/mut-gastos-numeros.js
//
// Sin automáticas: los esc() del módulo los cubren sus propias suites. Cada una
// de estas rompe, de a una, una lectura (vuelve a Number / parseFloat), una
// escritura (saca el ponerNumero), el enlace de un campo o un formateador.
// Todas tienen que dar ROJO.

const path = require('path')
const { correrMutaciones } = require('./mutar')

const RAIZ = path.join(__dirname, '..')
const PF = (x) => `parseFloat(String(${x}).replace(',', '.'))`
const V = (id) => `document.getElementById('${id}').value`

correrMutaciones({
  suite: path.join(__dirname, 'test-gastos-numeros.js'),
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/gastos.html'),
  funciones: [],
  manuales: [
    // ── Lecturas ─────────────────────────────────────────────────────────────
    { nombre: 'el importe del wizard se lee con parseFloat',
      de: "      return leerCampoNumero(document.getElementById('campo-importe'))", a: `      return ${PF(V('campo-importe'))}` },
    { nombre: 'el importe del wizard se lee con Number',
      de: "      return leerCampoNumero(document.getElementById('campo-importe'))", a: `      return Number(${V('campo-importe')})` },
    { nombre: 'validarSubpaso lee el importe con parseFloat (sin importeDelWizard)',
      de: "        const imp = importeDelWizard()\n        if (imp == null || imp <= 0)\n          return mostrarError('Ingresá un importe válido mayor a cero.'), false",
      a: `        const imp = ${PF(V('campo-importe'))}\n        if (imp == null || imp <= 0)\n          return mostrarError('Ingresá un importe válido mayor a cero.'), false` },
    { nombre: '"Enviar a pendiente" lee el importe con Number',
      de: "      const imp = importeDelWizard()\n      if (imp == null || imp <= 0)\n        return mostrarError('Ingresá un importe válido mayor a cero.')\n",
      a: `      const imp = Number(${V('campo-importe')}) || null\n      if (imp == null || imp <= 0)\n        return mostrarError('Ingresá un importe válido mayor a cero.')\n` },
    { nombre: 'el kilometraje del wizard se lee con Number',
      de: "      return leerCampoNumero(document.getElementById('campo-kilometraje'))", a: `      return Number(${V('campo-kilometraje')}) || null` },
    { nombre: 'el kilometraje del wizard se lee con parseFloat',
      de: "      return leerCampoNumero(document.getElementById('campo-kilometraje'))", a: `      return ${PF(V('campo-kilometraje'))} || null` },
    { nombre: 'la edición del gasto lee el importe con parseFloat',
      de: "          importe:           leerCampoNumero(document.getElementById('edit-importe')),", a: `          importe:           ${PF(V('edit-importe'))},` },
    { nombre: 'la edición del gasto lee el kilometraje con Number',
      de: "          kilometraje:       leerCampoNumero(document.getElementById('edit-kilometraje')),", a: `          kilometraje:       Number(${V('edit-kilometraje')}) || null,` },
    { nombre: 'la edición de la factura lee el importe con Number',
      de: "        const importe = leerCampoNumero(document.getElementById('edit-factura-importe'))", a: `        const importe = Number(${V('edit-factura-importe')})` },
    { nombre: 'la edición de la factura lee el importe con parseFloat',
      de: "        const importe = leerCampoNumero(document.getElementById('edit-factura-importe'))", a: `        const importe = ${PF(V('edit-factura-importe'))}` },
    { nombre: 'el monto del interés (confirmar) se lee con parseFloat',
      de: "          monto = leerCampoNumero(document.getElementById('campo-interes-monto'))", a: `          monto = ${PF(V('campo-interes-monto'))}` },
    { nombre: 'el monto del interés (tasa informada) se lee con parseFloat',
      de: "        const monto = leerCampoNumero(document.getElementById('campo-interes-monto'))", a: `        const monto = ${PF(V('campo-interes-monto'))}` },
    { nombre: 'la tasa del interés (p_tasa_pct) se lee con Number',
      de: "          pTasa = leerCampoNumero(document.getElementById('campo-interes-tasa'))", a: `          pTasa = Number(${V('campo-interes-tasa')})` },
    { nombre: 'la tasa del interés (monto calculado) se lee con Number',
      de: "        const tasa = leerCampoNumero(document.getElementById('campo-interes-tasa'))", a: `        const tasa = Number(${V('campo-interes-tasa')})` },
    // ── Escrituras ───────────────────────────────────────────────────────────
    { nombre: 'el OCR escribe el importe con .value en vez de ponerNumero',
      de: '          ponerNumero(campoImp, datos.importe)', a: '          campoImp.value = datos.importe' },
    { nombre: '"Cargar gasto" escribe el importe con .value en vez de ponerNumero',
      de: "      if (importe != null) ponerNumero(document.getElementById('campo-importe'), importe)",
      a: "      if (importe != null) document.getElementById('campo-importe').value = importe" },
    { nombre: 'la edición del gasto no escribe el importe',
      de: '      ponerNumero(campoEditImporte, g.importe)\n', a: '' },
    { nombre: 'la edición del gasto no escribe el kilometraje',
      de: '      ponerNumero(campoEditKm, g.kilometraje)', a: '' },
    { nombre: 'la edición de la factura no escribe el importe',
      de: '      ponerNumero(campoEditFacturaImporte, f.importe)', a: '' },
    { nombre: 'la edición del gasto vuelve a escribir Number(g.importe).toLocaleString() (null da "0,00")',
      de: '      ponerNumero(campoEditImporte, g.importe)\n',
      a: "      campoEditImporte.value = Number(g.importe).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })\n" },
    { nombre: 'la edición de la factura vuelve a escribir Number(f.importe).toLocaleString() (null da "0,00")',
      de: '      ponerNumero(campoEditFacturaImporte, f.importe)',
      a: "      campoEditFacturaImporte.value = Number(f.importe).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })" },
    // ── Enlaces ──────────────────────────────────────────────────────────────
    { nombre: 'el importe del wizard no se enlaza',
      de: "      enlazarCampoNumero(document.getElementById('campo-importe'), { decimales: 2 })\n", a: '' },
    { nombre: 'el kilometraje del wizard no se enlaza',
      de: "      enlazarCampoNumero(document.getElementById('campo-kilometraje'), { decimales: 0 })\n", a: '' },
    { nombre: 'el kilometraje del wizard se enlaza con 2 decimales',
      de: "enlazarCampoNumero(document.getElementById('campo-kilometraje'), { decimales: 0 })", a: "enlazarCampoNumero(document.getElementById('campo-kilometraje'), { decimales: 2 })" },
    { nombre: 'el importe de la edición del gasto no se enlaza',
      de: '      enlazarCampoNumero(campoEditImporte, { decimales: 2 })\n', a: '' },
    { nombre: 'el kilometraje de la edición se enlaza con 2 decimales',
      de: 'enlazarCampoNumero(campoEditKm, { decimales: 0 })', a: 'enlazarCampoNumero(campoEditKm, { decimales: 2 })' },
    { nombre: 'el importe de la edición de la factura no se enlaza',
      de: '      enlazarCampoNumero(campoEditFacturaImporte, { decimales: 2 })\n', a: '' },
    { nombre: 'el monto del interés no se enlaza',
      de: "      enlazarCampoNumero(document.getElementById('campo-interes-monto'), { decimales: 2 })\n", a: '' },
    { nombre: 'la tasa del interés no se enlaza',
      de: "      enlazarCampoNumero(document.getElementById('campo-interes-tasa'), { decimales: 2 })", a: '' },
    { nombre: 'el HTML del kilometraje vuelve a type="number"',
      de: '<input type="text" inputmode="numeric" id="campo-kilometraje"', a: '<input type="number" id="campo-kilometraje"' },
    // ── Mostrar ──────────────────────────────────────────────────────────────
    { nombre: 'formatearImporte vuelve a Number(): \'\' da "$ 0,00"',
      de: "      const num = formatearNumeroAr(importe, { decimales: 2 })\n      if (num === '—') return '—'",
      a: "      if (importe == null) return '—'\n      const num = formatearNumeroAr(Number(importe), { decimales: 2 })" },
    { nombre: 'formatearImporte pierde el prefijo de la moneda extranjera',
      de: "      return moneda === 'ARS' ? `$ ${num}` : `${moneda} ${num}`\n    }\n\n    const MEDIOS_PAGO_LABEL",
      a: "      return `$ ${num}`\n    }\n\n    const MEDIOS_PAGO_LABEL" },
    { nombre: 'formatearImporteDuplicado muestra siempre 2 decimales',
      de: "formatearNumeroAr(num, { decimales: 2, minimos: 0 })", a: "formatearNumeroAr(num, { decimales: 2 })" },
  ],
})
