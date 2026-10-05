// Lo que las pantallas importan de js/cantidades.js (02/10/2026), para las
// suites que juntan las funciones de un módulo "por clausura" mirando solo su
// <script>: las importadas no aparecen como `function` en el archivo, así que
// se suman a mano. extraerFn / extraerConst las encuentran por el import
// (pruebas/imports.js) y el sandbox corre las REALES.
//
// FUNCIONES_CARGA (05/10/2026): las de los campos donde se ESCRIBE una
// cantidad. Van aparte porque las importan solo las pantallas que piden
// cantidades (Stock, Ingreso); la planta no, y extraerFn falla con un nombre
// que el archivo no importa.
module.exports = {
  FUNCIONES_CANTIDADES: ['formatearCantidadStock', 'equivalenteEnBultos', 'cabezaBultos', 'textoBultos', 'cantidadSegunVista', 'textoSegunVista'],
  CONSTANTES_CANTIDADES: ['DECIMALES_CANTIDAD', 'FRACCIONES'],
  FUNCIONES_CARGA: ['unidadCorta', 'modoDeCarga', 'aUnidadBase', 'equivalenteDeCarga'],
  CONSTANTES_CARGA: ['DECIMALES_BULTOS_CARGA'],
}
