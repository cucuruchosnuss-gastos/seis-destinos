# Pedido de Facu (30/10/2026) — rama `ci-prueba/detalle-pago-cheques`

DETALLE DEL PAGO A PROVEEDOR
1) La ventana "Detalle del pago" queda en DOS COLUMNAS iguales (en el celular, una abajo de la otra):
   - Izquierda, "Con qué se pagó": el total, la fecha y, si fue con cheques de terceros, la LISTA de cheques. Uno por renglón: banco (nombre desde bancos_bcra), N°, importe, fecha de pago, a nombre de quién (titulares) y de qué cliente vino (la cobranza). Se leen de cobranza_cheques donde coalesce(pago_gasto_id, salida_gasto_id) = el gasto. Abajo, el crédito a favor que sobró, como hoy.
   - Derecha, "Facturas que paga": como hoy.
   Hoy los cheques salen como texto corrido ("N° 68994157, N° 00000042…") sin importes: eso se va.
2) En cada cheque, un botón "Sacar del pago" (solo con cuentas_corrientes:registrar_pago Y cobranzas:procesar):
   - Pide el motivo (ej. "El proveedor no lo aceptó: tiene rechazos").
   - Antes de confirmar, muestra qué va a pasar: el pago baja de $ X a $ Y; sale $ Z del crédito a favor; $ W vuelve a deberse en la factura N; el cheque vuelve a la cartera.
   - Confirma con sacar_cheque_de_pago(p_cheque_id, p_motivo), que devuelve {pago_antes, pago_despues, del_credito, vuelve_a_facturas, pago_anulado}. Si pago_anulado es true (era el único cheque), avisá "El pago quedó anulado".
   - Después de sacarlo, se relee la ventana y la cuenta del proveedor.
3) Si el gasto tiene observaciones (ahí queda anotado qué cheque se sacó y por qué), mostralas abajo del total.
4) "Agregar cheque" en la columna izquierda del detalle de un pago con cheques (mismos permisos que "Sacar del pago"):
- Abre la lista de cheques EN CARTERA (procesados, en pesos), con banco, N°, importe, fecha de pago y cliente, y un buscador por número o importe.
- Se pueden elegir varios. Antes de confirmar, la vista previa: el pago sube de $ X a $ Y; $ Z completa la factura N que este pago cubría; $ W queda como crédito a favor.
- Motivo opcional (ej. "Reemplaza al cheque N° 16603539").
- Confirma con agregar_cheques_a_pago(p_gasto_id, p_cheque_ids uuid[], p_motivo), que devuelve {pago_antes, pago_despues, a_facturas, credito_a_favor}.
- Para reemplazar un cheque se hace en dos pasos: "Sacar del pago" del viejo y "Agregar cheque" del nuevo. Después de sacar uno, ofrecé "¿Lo reemplazás por otro de la cartera?", que abre la misma lista.
PRUEBAS: pago con 5 cheques muestra la lista con importes; "Sacar del pago" muestra la vista previa y llama al RPC; con un solo cheque avisa que se anula; sin permisos no aparece el botón; agregar un cheque completa la factura y el sobrante queda como crédito; reemplazo (sacar + agregar) deja el pago y la factura bien.
