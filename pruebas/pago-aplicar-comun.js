// Las funciones de "Aplicar un pago a facturas" y "Anular un pago" de Cuentas
// corrientes (30/10/2026, rama ci-prueba/pago-proveedor-aplicar), para las
// suites que arman un sandbox y dibujan la cuenta del proveedor (el renglón
// del pago lleva "A cuenta $ X · Aplicar a facturas"), abren el detalle del
// pago (que carga su panel de acciones), las órdenes de pago (que miran si
// están anuladas) o el "Registrar pago" (el renglón entero tilda la factura).
// Las variables del módulo que usan (accionesPago, turnoAccionesPago,
// aplicarPago, turnoAplicarPago) las declara la suite que las ejerce:
// cargarAccionesDetallePago nunca tira, así que en las demás no hacen falta.
'use strict'

const FUNCIONES_PAGO_APLICAR = [
  'leerSeguroCC', 'tildarFacturaPago', 'alTocarRenglonFactura', 'siDejarACuenta', 'elegirFacturaEnVezDeACuenta',
  'aCuentaPorPago', 'htmlACuentaPago', 'htmlACuentaEnFila',
  'cargarAccionesDetallePago', 'leerAccionesDetallePago', 'lineasPreviaAnularPago', 'avisosAnularPago', 'puedeAnularPago',
  'htmlPanelAnularPago', 'htmlAccionesDetallePago', 'pintarAccionesDetallePago', 'alTocarAccionesPago', 'alEscribirAccionesPago',
  'confirmarAnularPago', 'hacerPagoDeNuevo',
  'abrirAplicarPago', 'cerrarAplicarPago', 'htmlFilasAplicarPago', 'renderizarAplicarPago', 'totalesAplicarPago', 'pintarPieAplicarPago',
  'validarAplicarPago', 'textoExitoAplicarPago', 'confirmarAplicarPago', 'tildarFacturaAplicar', 'alTocarListaAplicarPago',
  'alCambiarListaAplicarPago', 'proponerAplicarPagoViejas',
  'anulacionDeOrdenes', 'leerAnulacionOrdenes', 'htmlOrdenAnulada', 'marcarHojaAnulada',
  // lo que usan del resto del módulo
  'centavosDe',
]

module.exports = { FUNCIONES_PAGO_APLICAR }
