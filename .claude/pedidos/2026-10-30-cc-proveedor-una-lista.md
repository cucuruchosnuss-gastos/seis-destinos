# Pedido de Facu (30/10/2026) — rama `ci-prueba/cc-proveedor-una-lista`

1) CUENTA DEL PROVEEDOR EN UNA SOLA LISTA
- La base ahora devuelve TODOS los pagos en v_cuenta_corriente_movimientos (también los que no se aplicaron a ninguna factura) y los saldos a favor del corte inicial, y el saldo_acumulado ya da bien.
- Sacá el recuadro aparte "Órdenes de pago (N)" de abajo. La orden de pago se ve en el renglón del pago dentro de la lista (con "Reimprimir" en ese renglón, si existe la orden de pago del gasto: gastos.orden_pago_id → ordenes_pago.numero, ej. N-OP-00001).
- Que facturas, notas de débito, pagos y créditos queden mezclados por fecha: los que suman (facturas, ND) en un color y los que restan (pagos, créditos) en otro, con el saldo corrido en cada renglón.
- El filtro "Pagos" tiene que mostrar también los pagos sin aplicar.
2) NOTA DE DÉBITO: UNA SOLA HOJA
- Al imprimir una nota de débito (emitida o recibida), sale UNA hoja, sin "ORIGINAL"/"DUPLICADO". Si hacen falta dos, se imprime dos veces. Revisá si la orden de pago u otro comprobante hacen lo mismo y sacalo también.
3) ORDEN DE PAGO: abajo de todo, en lugar del "Resumen de cuenta" con dos renglones, va UNA sola línea: "Saldo de la cuenta con <PROVEEDOR> (a pagar) $ X" o "Saldo de la cuenta a favor de <EMPRESA> $ X", con el neto (deuda_pendiente − credito_disponible de v_saldo_proveedor). Nada de "aplicado / no aplicado".
PRUEBAS: proveedor con un pago sin aplicar: aparece en la lista y resta; sin recuadro de órdenes de pago abajo; ND imprime una sola hoja; orden de pago con una sola línea de saldo.

La hoja de la nota de débito (punto 2) vive en modulos/administracion.html: la hizo la sesión principal en esta misma rama (commit "Nota de débito en UNA sola hoja").
