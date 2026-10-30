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

## CAMBIO (30/10/2026, más tarde): el PUNTO 2 queda ANULADO y se reemplaza

No hagas el campo de descuento en conos.html, guardar_descuento_marca ya no está habilitado, y precio_venta ya NO
devuelve descuento_pct ni precio_caja_sin_descuento (devuelve el precio de lista). Los puntos 1 y 3 siguen igual.

2) CONDICIONES ESPECIALES DEL CLIENTE (la base ya está lista)
a) Ficha del cliente (modulos/administracion.html, Clientes), debajo de la condición de venta N1/N2: sección "Condiciones
   especiales". Lista con condiciones_especiales_cliente(p_cliente_id, p_solo_activas => false). Cada una devuelve {id,
   nombre, descuento_pct, activa, marcas[{id,nombre}], productos[{id,nombre}], alcance}. Cada fila muestra "Caserato ·
   Verasens · Dipale  −5 %  · conos: CASERATO, DIPALE, VERASENS", un interruptor Activa y Editar. "Agregar condición"
   abre un formulario con: Nombre (ej. "Venta a Ostera"); Descuento % (mayor que 0 y menor que 100); Conos: buscador con
   varios elegidos; mismo criterio que en Remitos: nada listado hasta 2 letras, después los que empiezan así; Productos:
   varios, de la fábrica del cliente; Ayuda: "Sin conos ni productos = se descuenta de toda la orden". Guarda con
   guardar_condicion_especial(p_id (null = nueva), p_cliente_id, p_nombre, p_descuento_pct, p_marcas uuid[], p_productos
   uuid[], p_activa). Solo con retiros:precios en la fábrica del cliente.
b) Valorizar: debajo de los renglones, "Condiciones especiales de este cliente": un tilde por cada condición ACTIVA
   ("Caserato · Verasens · Dipale (−5 %)" + su alcance en chico). Si la orden ya estaba valorizada, vienen tildadas las de
   ordenes_retiro.condiciones_especiales. Al tildar, en vivo, los renglones que entran muestran el precio con descuento y,
   en chico y color normal (no rojo), "(−5 % · antes $ 35.830,80)", con el total recalculado. Regla (la misma que la
   base): entra si (la condición no tiene conos o el cono del renglón está) Y (no tiene productos o el producto del
   renglón está). Si entra en varias, la de mayor %. Las reposiciones no. Los precios que se mandan siguen siendo los de
   LISTA (no descuentes en el navegador lo que mandás): guardar llama a valorizar_con_condiciones(p_orden_id, p_precios,
   p_condiciones uuid[]) en lugar de valorizar_orden_retiro. La base hace el descuento y lo guarda.
c) Orden ya valorizada (detalle y hojas): orden_retiro_items trae precio_lista, descuento_pct y condicion_id. Si
   descuento_pct no es null, al lado del precio por caja: "(−5 % · <nombre de la condición>)".
d) Corregir orden: orden_para_corregir ahora trae en cada renglón precio_lista, descuento_pct y condicion_id. El "precio"
   editable del renglón es el de LISTA (precio_lista); las condiciones de la orden se vuelven a aplicar solas al corregir.

PRUEBAS: alta, edición y desactivar condición; valorizar con y sin tilde (solo los renglones con esos conos bajan 5 %);
con condición "toda la orden" bajan todos menos las reposiciones; revalorizar trae los tildes. Ensayo y CI en verde.
Mismo cierre: un resumen y, como último mensaje, solo: TERMINADO — mandar al chat
