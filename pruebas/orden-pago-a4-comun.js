// Las funciones de LA ORDEN DE PAGO A4 de Cuentas corrientes (31/10/2026,
// rama ci-prueba/orden-pago-a4), para las suites que arman un sandbox y
// dibujan o abren la orden de pago (htmlOrdenPago, abrirOrdenPago,
// marcarHojaAnulada). La variable del módulo que usa abrirOrdenPago
// (ordenPagoActual) la declara cada suite en su preludio.
'use strict'

const FUNCIONES_ORDEN_PAGO_A4 = [
  'tipoComprobanteOrden', 'cuentasOrdenPago', 'franjaOrdenPago', 'claveFacturaOrden', 'anterioresPorFactura',
  'leerAnterioresOrdenPago', 'textoAnterioresFactura', 'botonesOrdenPago',
  'cargarScriptOP', 'nombreArchivoOrdenPago', 'generarPdfOrdenPago', 'descargarOrdenPago', 'enviarOrdenPago',
]
const CONSTANTES_ORDEN_PAGO_A4 = ['BLOQUES_MEDIO_ORDEN', 'RENGLONES_OP_COMPACTA', 'LIBRERIAS_PDF_OP']

module.exports = { FUNCIONES_ORDEN_PAGO_A4, CONSTANTES_ORDEN_PAGO_A4 }
