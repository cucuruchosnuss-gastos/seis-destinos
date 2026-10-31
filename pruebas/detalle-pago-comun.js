// Las funciones del "Detalle del pago" de Cuentas corrientes (30/10/2026,
// dos columnas, los cheques del pago y sacar / agregar cheques), para las
// suites que arman un sandbox y llaman a abrirModalDetallePago.
'use strict'

// abrirModalDetallePago carga también sus acciones ("Aplicar a facturas" y
// "Anular el pago", 30/10/2026, rama ci-prueba/pago-proveedor-aplicar).
const { FUNCIONES_PAGO_APLICAR } = require('./pago-aplicar-comun')

const FUNCIONES_DETALLE_PAGO = [
  'abrirModalDetallePago', 'cargarDetallePago', 'chequesDelPagoDP', 'puedeCambiarChequesPagoDP', 'centavosDP',
  'previaSacarChequeDP', 'previaAgregarChequesDP', 'lineasPreviaSacarDP', 'lineasPreviaAgregarDP',
  'textoResultadoSacarDP', 'textoResultadoAgregarDP', 'carteraFiltradaDP', 'chequesTildadosDP',
  'htmlChequeDP', 'htmlListaAgregarDP', 'htmlPreviaAgregarDP', 'htmlAgregarDP', 'htmlCreditosDP', 'htmlFacturasDP', 'htmlDetallePago',
  'pintarDetallePago', 'repintarAgregarDP', 'abrirAgregarChequeDP', 'confirmarSacarChequeDP', 'confirmarAgregarChequesDP',
  'refrescarCuentaTrasCambioPago', 'alTocarDetallePago', 'alEscribirDetallePago',
  // lo que usan del resto del módulo
  'fechaCobroCheque', 'libradorDe', 'asegurarBancos', 'chequesParaPagar', 'agruparChequesPorEmpresa', 'textoAvisoOtraEmpresa', 'avisosOtraEmpresa',
  ...FUNCIONES_PAGO_APLICAR,
]
const CONSTANTES_DETALLE_PAGO = ['COLUMNAS_CHEQUE_DP']

module.exports = { FUNCIONES_DETALLE_PAGO, CONSTANTES_DETALLE_PAGO }
