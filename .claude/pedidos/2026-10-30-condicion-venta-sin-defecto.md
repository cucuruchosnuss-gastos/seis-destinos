# Pedido de Facu — 30/10/2026: condición de venta sin valor por defecto

Rama: `ci-prueba/condicion-venta-sin-defecto` (worktree propio, candado y spec:numero como siempre; solo
`modulos/administracion.html`). Integración de noche, con auditoría del .patch.

1) SIN CONDICIÓN NO SE INVENTA EL 100/0
- Hoy pctInicialFacturar cae en 100 (todo al N1) cuando ni la orden ni el cliente tienen %. Sacá ese 100.
- Si el cliente no tiene condición de venta (clientes.pct_parte_a null) y la orden no tiene división guardada, la
  pantalla de facturar arranca con N1 y N2 VACÍOS y un aviso en naranja: "Este cliente no tiene condición de venta.
  Poné el % de N1 y N2 (y si querés, guardala en la ficha del cliente)".
- No se puede generar el N1/N2 ni guardar la división hasta que se complete. Escribir uno completa el otro, como en la ficha.
- Al lado, un tilde "Guardar también como condición del cliente" que llama a guardar_condicion_venta_cliente con ese %.

2) LA FICHA DEL CLIENTE NO PUEDE PERDER LA CONDICIÓN EN SILENCIO
- Si se cambiaron los % de N1/N2 o las comisiones y no se tocó "Guardar la condición de venta", al tocar el Guardar
  general de la ficha o al salir de la ficha, guardala también (o avisá "Tenés la condición de venta sin guardar" y no
  salgas hasta que se elija guardar o descartar). Elegí lo más simple y decime cuál hiciste.
- Después de guardar, mostrar "Condición guardada: N1 X% / N2 Y%".

PRUEBAS: cliente sin condición → campos vacíos, aviso y botón bloqueado; con el tilde se guarda en el cliente;
condición cambiada sin guardar → no se pierde al salir. Ensayo y CI en verde. Integración de noche, con auditoría del
.patch. Un resumen al final y, como último mensaje, solo: TERMINADO — mandar al chat
