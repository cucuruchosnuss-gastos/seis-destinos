// Mutaciones de test-retiros-imprimir-iphone.js (imprimir en el iPhone y el
// PDF con las dos copias, 26/10/2026). Tres archivos: el común
// (js/retiros-comun.js, por ARCHIVO_COMUN_RETIROS), la Carga
// (modulos/retiros.html, por ARCHIVO_TEST) y Administración (por ARCHIVO_ADMIN).
//
//   node pruebas/mut-retiros-imprimir-iphone.js
//
// UN RUNNER POR VEZ: dos corridas en paralelo se pisan el mut-tmp-*.html.

const path = require('path')
const { correrMutacionesEnVarios } = require('./mutar')

const RAIZ = path.join(__dirname, '..')
const suite = path.join(__dirname, 'test-retiros-imprimir-iphone.js')

correrMutacionesEnVarios([
  {
    suite, original: path.join(RAIZ, 'js/retiros-comun.js'), variable: 'ARCHIVO_COMUN_RETIROS', funciones: [], equivalentes: [],
    manuales: [
      // imprimirHoja
      { nombre: 'imprime aunque la hoja no esté lista', de: "  if (hojaLista(imp, orden, { conPrecios, copias })) { print(); return 'impreso' }", a: "  if (true) { print(); return 'impreso' }" },
      { nombre: 'con la hoja lista espera antes de imprimir', de: "  if (hojaLista(imp, orden, { conPrecios, copias })) { print(); return 'impreso' }", a: "  if (hojaLista(imp, orden, { conPrecios, copias })) { Promise.resolve().then(print); return 'impreso' }" },
      { nombre: 'en el iPhone imprime solo, sin "Listo, imprimir"', de: '    if (ios) mostrarListoParaImprimir({ doc, imprimir: print })', a: '    if (ios) print()' },
      { nombre: 'fuera del iPhone no imprime al terminar', de: '    else print()\n  })', a: '  })' },
      { nombre: 'imprime una hoja que no se pudo armar', de: '    if (!hojaLista(imp, orden, { conPrecios, copias })) return\n    if (ios)', a: '    if (ios)' },
      { nombre: 'por defecto no llama a window.print', de: '  const print = imprimir ?? (() => window.print())', a: '  const print = imprimir ?? (() => {})' },
      // "Listo, imprimir"
      { nombre: 'el cartel imprime sin que lo toquen', de: '  doc.body.appendChild(caja)\n  caja.querySelector', a: '  doc.body.appendChild(caja)\n  imprimir()\n  caja.querySelector' },
      { nombre: 'Cancelar también imprime', de: "    if (b.dataset.rhListo === 'imprimir') imprimir()", a: '    imprimir()' },
      { nombre: 'el cartel no se va al tocarlo', de: "    if (!b) return\n    caja.remove()\n", a: '    if (!b) return\n' },
      { nombre: 'dos carteles a la vez', de: "  doc.getElementById('rh-listo')?.remove()\n", a: '' },
      { nombre: 'el cartel sale en el papel', de: '@media print { .rh-listo { display: none !important; } }', a: '' },
      { nombre: 'el texto del cartel sin escapar', de: '<p class="rh-listo__texto">${escHoja(texto)}</p>', a: '<p class="rh-listo__texto">${texto}</p>' },
      { nombre: 'el botón no toma el foco', de: "  caja.querySelector('.rh-listo__si')?.focus?.()\n", a: '' },
      // prepararHoja
      { nombre: 'arma directo en el contenedor', de: "    const caja = doc.createElement('div')\n    await armarHoja(caja,", a: '    const caja = contenedor\n    await armarHoja(caja,' },
      { nombre: 'una vieja que termina tarde pisa a la nueva', de: '    if (imp.clave !== clave) return false\n    contenedor.innerHTML = caja.innerHTML', a: '    contenedor.innerHTML = caja.innerHTML' },
      { nombre: 'arma aunque ya no se quiera', de: '    if (imp.clave !== clave || !contenedor) return false', a: '    if (!contenedor) return false' },
      { nombre: 'vuelve a armar la misma orden', de: '  if (imp.clave === clave && (imp.lista || imp.armando)) return imp.armando ?? Promise.resolve(true)', a: '  if (false) return imp.armando ?? Promise.resolve(true)' },
      { nombre: 'sin fila: arman a la vez', de: '  const antes = imp.armando ?? Promise.resolve()', a: '  const antes = Promise.resolve()' },
      { nombre: 'queda lista aunque falle', de: '    if (imp.clave === clave) imp.lista = ok === true', a: '    if (imp.clave === clave) imp.lista = true' },
      { nombre: 'olvidarHoja no olvida', de: '  imp.clave = null\n  imp.lista = false\n}', a: '}' },
      { nombre: 'la clave no mira los precios', de: '  return JSON.stringify([orden ?? null, conPrecios === true, copias])', a: '  return JSON.stringify([orden ?? null, copias])' },
      { nombre: 'la clave no mira las copias', de: '  return JSON.stringify([orden ?? null, conPrecios === true, copias])', a: '  return JSON.stringify([orden ?? null, conPrecios === true])' },
      // esIos
      { nombre: 'el iPad que se presenta como Mac no cuenta', de: "  return /iPad|iPhone|iPod/.test(ua) || (nav?.platform === 'MacIntel' && Number(nav?.maxTouchPoints) > 1)", a: '  return /iPad|iPhone|iPod/.test(ua)' },
      { nombre: 'una Mac de verdad cuenta como iPad', de: "(nav?.platform === 'MacIntel' && Number(nav?.maxTouchPoints) > 1)", a: "(nav?.platform === 'MacIntel' && Number(nav?.maxTouchPoints) >= 0)" },
      // El PDF
      { nombre: 'el PDF con una sola copia', de: "export const COPIAS_PDF = ['ORIGINAL', 'DUPLICADO']", a: "export const COPIAS_PDF = ['ORIGINAL']" },
    ],
  },
  {
    suite, original: path.join(RAIZ, 'modulos/retiros.html'), variable: 'ARCHIVO_TEST', funciones: [], equivalentes: [],
    manuales: [
      { nombre: 'Carga: la orden recién hecha no deja armada la hoja', de: '      pintarAccionesHoja(\'hecho\', h)\n      // La hoja, armada antes del toque de Imprimir (el iPhone).\n      prepararHojaDe(h)\n', a: "      pintarAccionesHoja('hecho', h)\n" },
      { nombre: 'Carga: abrir una orden mía no deja armada la hoja', de: '      // La hoja, armada antes del toque de Imprimir (el iPhone).\n      prepararHojaDe(estado.mio)\n', a: '' },
      { nombre: 'Carga: imprimir espera antes', de: '    function imprimirOrden(o, cliente) {\n      asegurarEstilosHoja()\n      return imprimirHoja(', a: '    async function imprimirOrden(o, cliente) {\n      asegurarEstilosHoja()\n      await null\n      return imprimirHoja(' },
      { nombre: 'Carga: la hoja armada no es la del click (sin el cliente)', de: "ordenParaHoja(obj.orden, { cliente: obj.cliente }), { conPrecios: false, copias: COPIAS_IMPRESION })", a: "ordenParaHoja(obj.orden, {}), { conPrecios: false, copias: COPIAS_IMPRESION })" },
      { nombre: 'Carga: cada vez un contenedor de impresión nuevo', de: '      if (!estado.impresion) estado.impresion = nuevaImpresion()\n      return estado.impresion', a: '      return nuevaImpresion()' },
    ],
  },
  {
    suite, original: path.join(RAIZ, 'modulos/administracion.html'), variable: 'ARCHIVO_ADMIN', funciones: [], equivalentes: [],
    manuales: [
      { nombre: 'Administración: pintarOrden no arma la hoja', de: '      pintarAccionesOrden()\n      // La hoja, armada antes del toque de Imprimir (el iPhone).\n      prepararHojaOrden()\n', a: '      pintarAccionesOrden()\n' },
      { nombre: 'Administración: imprimir espera antes', de: '    function imprimirOrden() {\n      const d = estado.orden\n      if (!d?.orden) return\n      asegurarEstilosHoja()\n      return imprimirHoja(', a: '    async function imprimirOrden() {\n      const d = estado.orden\n      if (!d?.orden) return\n      asegurarEstilosHoja()\n      await null\n      return imprimirHoja(' },
      { nombre: 'Administración: la hoja armada sin precios', de: "      prepararHoja(impresionHoja(), document.getElementById('ad-impresion'), ordenParaHoja(d), { conPrecios: true, copias: COPIAS_IMPRESION })", a: "      prepararHoja(impresionHoja(), document.getElementById('ad-impresion'), ordenParaHoja(d), { conPrecios: false, copias: COPIAS_IMPRESION })" },
      { nombre: 'Administración: la nota de débito no olvida la hoja de la orden', de: "      olvidarHoja(impresionHoja())\n      document.getElementById('ad-impresion').innerHTML = '<style>@media print { @page { size: A4 portrait; margin: 8mm; } }</style>' +", a: "      document.getElementById('ad-impresion').innerHTML = '<style>@media print { @page { size: A4 portrait; margin: 8mm; } }</style>' +" },
      { nombre: 'Administración: la división no olvida la hoja de la orden', de: "      olvidarHoja(impresionHoja())\n      document.getElementById('ad-impresion').innerHTML = '<style>@media print { @page { size: A4 portrait; margin: 12mm; } }</style>' +", a: "      document.getElementById('ad-impresion').innerHTML = '<style>@media print { @page { size: A4 portrait; margin: 12mm; } }</style>' +" },
      { nombre: 'Administración: la división en el iPhone imprime después del await', de: '      if (despuesDeGuardar && esIos()) {', a: '      if (false) {' },
      { nombre: 'Administración: guardar la división no avisa que viene de un await', de: '        imprimirDivision(data, { despuesDeGuardar: true })', a: '        imprimirDivision(data)' },
    ],
  },
])
