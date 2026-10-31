# Pedido de Facu (31/10/2026) — rama `ci-prueba/orden-pago-a4`

Rama aparte ci-prueba/orden-pago-a4 (worktree propio, candado, spec:numero). Es la ORDEN DE PAGO A4 que no entró en detalle-pago-cheques:
- UNA sola hoja A4, sin ORIGINAL ni DUPLICADO.
- Arriba: empresa (logo, razón social, CUIT, domicilio), número y fecha; proveedor (razón social, CUIT, domicilio).
- Columna "Con qué se pagó":
  - Cheques en tabla compacta (banco, número, fecha de pago, importe) SIN librador, SIN cliente y SIN "entregado por". El proveedor no tiene que ver de qué cliente vino el cheque.
  - Bloque "Transferencias" (cuenta e importe) y bloque "Efectivo", cada uno con su subtotal.
- Columna "Facturas que cancela": tipo y número, fecha, importe de la factura, lo aplicado en este pago y lo que le queda. Si la factura ya tenía créditos o pagos anteriores, un subrenglón chico que lo diga.
- Totales en dos cajas A LA MISMA ALTURA: a la izquierda los subtotales por medio + TOTAL PAGADO; a la derecha TOTAL FACTURAS.
- Una franja con la diferencia: "Queda saldo pendiente $ X", "Queda a favor de [empresa] $ X" o "Facturas canceladas".
- UNA sola línea "Saldo de la cuenta: $ X" (deuda_pendiente − credito_disponible de v_saldo_proveedor de ese proveedor y empresa), con "le debemos" si es deuda o "a nuestro favor" si es crédito. Nada de "crédito aplicado / no aplicado".
- El total y el "Son … pesos" salen de datos_orden_pago.total (ya es el vivo). Si anulada = true, la hoja sale tachada "ANULADA" y no se ofrece imprimir.
- Firmas abajo. Las observaciones internas del gasto no van en la hoja; solo las de la orden marcadas "Van impresas".
- Botón "Enviar": navigator.share con el PDF; si no hay share, que lo descargue.
- Escapá todo texto de la base. No toques produccion.html.
PRUEBAS: specs y mutaciones (cheques sin librador, cajas de totales, franja en los 3 casos, saldo de la cuenta, anulada, Enviar con y sin share).
