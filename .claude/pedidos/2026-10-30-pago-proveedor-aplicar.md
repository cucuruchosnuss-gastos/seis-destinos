# Pedido de Facu (30/10/2026) — rama `ci-prueba/pago-proveedor-aplicar`

Agregalo a la cola (rama ci-prueba/pago-proveedor-aplicar, worktree propio, candado y spec:numero; modulos/cuentas-corrientes.html).

1) ERROR: Yanina eligió una factura al registrar un pago con cheques de cartera a BADIC (30/10, $ 4.200.000) y el pago llegó a la base SIN aplicaciones (quedó todo como crédito a cuenta). Reproducilo: pago con cheques de cartera (uno de otra empresa del grupo) + una factura elegida → revisá qué p_aplicaciones se manda a pagar_proveedor_con_cheques_cartera. Corregilo y agregá una prueba que falle si una factura elegida no viaja en p_aplicaciones. Si no seleccionó bien la factura, que no deje confirmar sin avisar: "No elegiste ninguna factura: el pago va a quedar a cuenta. ¿Seguro?".

2) "APLICAR A FACTURAS" en los pagos que tienen algo a cuenta (crédito disponible que dejó ese mismo pago):
- En el renglón del pago y en su detalle, si tiene saldo a cuenta: "A cuenta $ X · Aplicar a facturas".
- Abre las facturas pendientes del proveedor en esa empresa (con saldo), propone de la más vieja a la más nueva, editable.
- Confirma con aplicar_pago_a_facturas(p_gasto_id, p_aplicaciones [{factura_pendiente_id, monto_aplicado}]) → {aplicado, queda_a_cuenta}. Mostrá los errores de la base tal cual.
- Solo con cuentas_corrientes:registrar_pago.

PRUEBAS: la factura elegida viaja; el aviso sin factura; aplicar después un pago a cuenta deja la factura pagada y baja el crédito. Ensayo y CI en verde. Integración de noche, con auditoría del .patch. Un resumen al final y, como último mensaje, solo: TERMINADO — mandar al chat

## Agregado (misma rama)

3) ANULAR UN PAGO A PROVEEDOR (cualquier medio): la base ahora devuelve todo (anular_gasto): las facturas vuelven a deberse, el crédito a cuenta se anula, los cheques de terceros vuelven a la CARTERA y se da vuelta la deuda entre empresas si eran de otra. Revisá que el botón "Anular" esté disponible en el detalle del pago también para pagos con cheques (hoy Yanina no podía), con motivo obligatorio y una vista previa: "Vuelven a la cartera: N° 62921151 ($ 2.000.000), N° 62294736 ($ 2.200.000) · La factura 0004-00011115 vuelve a deber $ 3.360.000,01". Después de anular ofrecé "Hacer el pago de nuevo" (abre el formulario de pago a ese proveedor). La orden de pago (ordenes_pago) de un pago anulado se muestra tachada con "ANULADA" y no se puede reimprimir.

PRUEBAS: anular pago con cheques → cheques en cartera, factura pendiente; la orden de pago se ve anulada. Mismo cierre: un resumen y, como último mensaje, solo: TERMINADO — mandar al chat
