// Las funciones y constantes de js/cuenta-unica.js (06/10/2026), para las
// suites que arman un sandbox de Administración o de Cuentas corrientes: las
// dos pantallas las importan, y extraerFn las encuentra por el import.
'use strict'

const FUNCIONES_CU = [
  'escCu', 'centavosCu', 'plataCu', 'claseEtiquetaCu', 'etiquetasPresentes', 'filasFiltradas',
  'netoPorMoneda', 'textoNeto', 'saldosCompensables', 'puedeOfrecerCompensar', 'maximoCompensable',
  'repartoFifoCu', 'aplicadoCu', 'textoDespues', 'validarCompensacion', 'parametrosCompensar',
  'htmlClasificacion', 'textoVinculado',
  'estadoCuentaUnica', 'parametrosCuentaUnica', 'cargarCuentaUnica', 'fechaCu', 'columnaCu',
  'linkFilaCu', 'htmlFilaCu', 'htmlCompensar', 'htmlFacturasCu', 'htmlResumenCu', 'htmlCuentaUnica',
  'pintarCuentaUnica', 'enlazarCamposCu', 'enlazarFacturasCu', 'repintarParteCu',
  'abrirCompensar', 'cerrarCompensar', 'confirmarCompensacion', 'alTocarCuentaUnica', 'alCambiarCuentaUnica',
]
const CONSTANTES_CU = ['TOPE_FACTURAS_CU', 'ETIQUETAS_CU', 'CLASIFICACIONES']

// La venta y sus puntos N1 / N2 en la cuenta de Cuentas corrientes
// (30/10/2026, test-cuentas-corrientes-orden-n1-n2.js).
const FUNCIONES_N1N2_CC = [
  'codigoPuntoCC', 'puedeVerDivisionCC', 'filaVentaCC', 'divisionesOrdenCC', 'centavosN1n2CC', 'divisionDeRespuestaCC',
  'infoDivisionCC', 'htmlDivisionVentaCC', 'leerDivisionCC', 'cargarDivisionCC', 'decorarVentasCC', 'alternarVentaCC', 'alTocarVentaCC',
]

// Lo de Cuentas corrientes (la ficha del proveedor y el chip de las listas),
// con todo lo de js/cuenta-unica.js: abrirFicha, renderizarFicha, las listas y
// el padrón las llaman.
const FUNCIONES_CP_CC = [
  'puedeLeerClientesCC', 'puedeClasificarCC', 'puedeCompensarCC', 'mapaClienteProveedor', 'cargarClientesProveedores',
  'esClienteYProveedor', 'cargarVinculosFicha', 'vinculoDeUnidad', 'textoDondeEsCliente', 'htmlClasificacionCC',
  'renderizarClasificacionProveedor', 'elegirClasificacionCC', 'alTocarClasificacionCC', 'idsClientesDe',
  'confirmarVincularCC', 'confirmarDesvincularCC', 'ctxCuentaUnicaCC', 'pintarCuentaUnicaFicha', 'prepararCuentaUnicaFicha',
  // 30/10/2026: la fila de una Venta despliega sus N1 / N2
  // (pintarCuentaUnicaFicha llama a decorarVentasCC).
  ...FUNCIONES_N1N2_CC,
  ...FUNCIONES_CU,
]
const CONSTANTES_CP_CC = ['CHIP_CLIENTE_PROVEEDOR', 'NUMERO_PUNTO_CC', 'TEXTO_SIN_DIVISION_CC', ...CONSTANTES_CU]

module.exports = { FUNCIONES_CU, CONSTANTES_CU, FUNCIONES_CP_CC, CONSTANTES_CP_CC, FUNCIONES_N1N2_CC }
