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
  'htmlFilaCu', 'htmlCompensar', 'htmlFacturasCu', 'htmlResumenCu', 'htmlCuentaUnica',
  'pintarCuentaUnica', 'enlazarCamposCu', 'enlazarFacturasCu', 'repintarParteCu',
  'abrirCompensar', 'cerrarCompensar', 'confirmarCompensacion', 'alTocarCuentaUnica', 'alCambiarCuentaUnica',
]
const CONSTANTES_CU = ['TOPE_FACTURAS_CU', 'ETIQUETAS_CU', 'CLASIFICACIONES']

// Lo de Cuentas corrientes (la ficha del proveedor y el chip de las listas),
// con todo lo de js/cuenta-unica.js: abrirFicha, renderizarFicha, las listas y
// el padrón las llaman.
const FUNCIONES_CP_CC = [
  'puedeLeerClientesCC', 'puedeClasificarCC', 'puedeCompensarCC', 'mapaClienteProveedor', 'cargarClientesProveedores',
  'esClienteYProveedor', 'cargarVinculosFicha', 'vinculoDeUnidad', 'textoDondeEsCliente', 'htmlClasificacionCC',
  'renderizarClasificacionProveedor', 'elegirClasificacionCC', 'alTocarClasificacionCC', 'idsClientesDe',
  'confirmarVincularCC', 'confirmarDesvincularCC', 'ctxCuentaUnicaCC', 'pintarCuentaUnicaFicha', 'prepararCuentaUnicaFicha',
  ...FUNCIONES_CU,
]
const CONSTANTES_CP_CC = ['CHIP_CLIENTE_PROVEEDOR', ...CONSTANTES_CU]

module.exports = { FUNCIONES_CU, CONSTANTES_CU, FUNCIONES_CP_CC, CONSTANTES_CP_CC }
