// Lo que las pantallas importan de js/cantidades.js (02/10/2026), para las
// suites que juntan las funciones de un módulo "por clausura" mirando solo su
// <script>: las importadas no aparecen como `function` en el archivo, así que
// se suman a mano. extraerFn / extraerConst las encuentran por el import
// (pruebas/imports.js) y el sandbox corre las REALES.
module.exports = {
  FUNCIONES_CANTIDADES: ['formatearCantidadStock', 'equivalenteEnBultos', 'cabezaBultos', 'textoBultos', 'cantidadSegunVista', 'textoSegunVista'],
  CONSTANTES_CANTIDADES: ['DECIMALES_CANTIDAD', 'FRACCIONES'],
}
