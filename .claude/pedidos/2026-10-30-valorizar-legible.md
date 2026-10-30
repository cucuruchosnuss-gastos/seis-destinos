# Pedido de Facu — 30/10/2026: valorizar más legible

Rama: `ci-prueba/valorizar-legible` (worktree propio, candado y spec:numero; `modulos/administracion.html` y
`modulos/conos.html`). Si ya se hizo "UNIDADES POR CAJA" en js/remitos-comun.js, reusar esa misma función de nombre y no
duplicarla. Integración de noche, con auditoría del .patch.

1) NOMBRE DEL RENGLÓN AL VALORIZAR Y EN EL DETALLE DE LA ORDEN
- Hoy dice "Barquillo 40 x4 · Caja con cono · VENEZIA" y "Soft · Caja sin cono · Sin cono". Cambialo a:
  - "Barquillo 40 x4 · Caja con cono × 252 u. · VENEZIA"
  - "Soft · Caja sin cono × 224 u."
- Las unidades por caja (unidades_por_caja de la presentación) van siempre, en negrita (salvo que sea 1).
- El "· Sin cono" final se saca: el cono solo se nombra si la presentación es con cono.
- Lo mismo en las hojas N1/N2 si usan ese nombre.

2) DESCUENTO DEL CONO (la base ya lo calcula)
- precio_venta ahora devuelve también descuento_pct y precio_caja_sin_descuento. El precio_caja ya viene con el descuento
  hecho: usalo tal cual.
- En la pantalla de valorizar, si el renglón tiene descuento_pct, al lado del precio mostrá "(−5 % CASERATO · antes $
  35.830,80)", con color normal (no rojo) y letra chica.
- En la orden ya valorizada, orden_retiro_items.descuento_pct queda guardado (lo pone valorizar_orden_retiro): mostrá
  "(−5 %)" al lado del precio por caja.
- En modulos/conos.html, en la ficha de cada cono, un campo "Descuento en el precio de venta (%)" (vacío = sin descuento)
  que guarda con el RPC guardar_descuento_marca(p_marca_id uuid, p_pct numeric) (null lo saca). Solo lo ve y lo edita
  quien tiene retiros:precios en alguna unidad. En la lista de conos, un sello "−5 %" en los que tienen descuento.

3) MISMA CUENTA QUE LA BASE EN LISTAS
- precio_venta ya no redondea el precio por unidad a 4 decimales en el medio: la caja se calcula con el precio exacto y
  se redondea a 2 decimales una sola vez al final (antes la caja de $ 23.990,80 daba $ 23.990,82).
- Fijate en la pantalla de listas de precios (la que replica "la misma cuenta de precio_venta") y en cualquier otro lugar
  que la copie: que haga lo mismo, sin redondeo intermedio, y que muestre el mismo número que la base.

PRUEBAS: nombre con "× N u." y sin el "Sin cono" repetido; renglón con cono con descuento muestra "(−5 %)" y el "antes";
campo de descuento en Conos, que guarda y se puede borrar; la caja de 23.990,80 se muestra 23.990,80. Ensayo y CI en
verde. Integración de noche, con auditoría del .patch. Un resumen al final y, como último mensaje, solo: TERMINADO —
mandar al chat
