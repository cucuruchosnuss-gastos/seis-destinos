// Mutaciones de test-caja-xss.js. Ver mutar.js.
//
//   node pruebas/mut-caja-xss.js
//
// AUTOMÁTICAS: cada `${esc(...)}` de las funciones de render pierde su esc()
// (también las anidadas, que son interpolaciones propias).
//
// A MANO: los helpers que escapan POR DENTRO (importeHtml, la moneda de
// formatearImporteCentavosSuaves), los esc() que no están al principio de la
// interpolación (la categoría del gasto, concatenada con ' · ') y los dos
// encodeURIComponent del href "Ver gasto →", más su delimitador de comillas.

const path = require('path')
const { correrMutaciones } = require('./mutar')

const RAIZ = path.join(__dirname, '..')

correrMutaciones({
  suite: path.join(__dirname, 'test-caja-xss.js'),
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/caja.html'),
  funciones: [
    'crearMultiselect', 'renderizarDesglosePorCuenta', 'renderizarTarjetaPersona', 'renderizarListado',
    'renderizarListaDirectorio', 'renderizarCuentasDirectorio', 'renderizarFilaMovimiento',
    'renderizarFilaSolicitud', 'renderizarFilaCuenta', 'abrirModalCuentaNueva', 'poblarSelectorRetirosPersona',
    'poblarSelectorContraparte', 'opcionesCuenta',
  ],
  manuales: [
    { nombre: 'importeHtml() deja de escapar',
      de: 'return esc(formatearImporte(importe, moneda))', a: 'return formatearImporte(importe, moneda)' },
    { nombre: 'formatearImporteCentavosSuaves() deja de escapar la moneda',
      de: "const simbolo = moneda === 'ARS' ? '$' : esc(moneda)", a: "const simbolo = moneda === 'ARS' ? '$' : moneda" },
    { nombre: 'la categoría del gasto del movimiento pierde el esc()',
      de: "' · ' + esc(m.gastos.categorias.nombre)", a: "' · ' + m.gastos.categorias.nombre" },
    { nombre: 'el href "Ver gasto" pierde el encodeURIComponent del id',
      de: 'gasto=${encodeURIComponent(m.gasto_id)}&', a: 'gasto=${m.gasto_id}&' },
    { nombre: 'el href "Ver gasto" pierde el encodeURIComponent de location.href',
      de: 'volver=${encodeURIComponent(location.href)}', a: 'volver=${location.href}' },
    { nombre: 'el href "Ver gasto" pasa a comillas simples (encodeURIComponent no escapa la simple)',
      de: '<a href="gastos.html?gasto=${encodeURIComponent(m.gasto_id)}&volver=${encodeURIComponent(location.href)}">',
      a: "<a href='gastos.html?gasto=${encodeURIComponent(m.gasto_id)}&volver=${encodeURIComponent(location.href)}'>" },
    { nombre: 'el título del modal de datos bancarios pasa a innerHTML',
      de: "document.getElementById('datos-bancarios-titulo').textContent = c?.nombre",
      a: "document.getElementById('datos-bancarios-titulo').innerHTML = c?.nombre" },
    { nombre: 'el valor de un dato bancario pasa a innerHTML',
      de: "spanValor.textContent = valor || 'No cargado'", a: "spanValor.innerHTML = valor || 'No cargado'" },
    { nombre: 'el lookup del medio en el Directorio deja de ser una constante',
      de: '<div class="tarjeta-lista__subtitulo">${MEDIO_CUENTA_LABEL[c.medio]} · ', a: '<div class="tarjeta-lista__subtitulo">${c.medio} · ' },
    { nombre: 'el logo de unidad pasa a ser el nombre',
      de: 'const logo = LOGOS_EMPRESA[nombreUnidad]', a: 'const logo = nombreUnidad' },
  ],
})
