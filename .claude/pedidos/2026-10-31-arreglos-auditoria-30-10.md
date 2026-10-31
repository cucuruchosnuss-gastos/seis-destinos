# Pedido de Facu (31/10/2026) — rama `ci-prueba/arreglos-auditoria-30-10`

DESPUÉS, en un worktree propio, rama ci-prueba/arreglos-auditoria-30-10 (usá spec:numero y el candado). Antes de escribir código confirmá en la base estas firmas; si alguna no existe o es distinta, pará y avisame:
  aplicaciones_credito_cliente(p_cliente_id uuid, p_credito_tipo text, p_credito_id uuid) → [{doc_tipo, doc_id, parte, medio, monto, efectivo}]
  datos_orden_pago(p_orden_id) ahora trae además total_original y anulada (boolean); total ya es el vivo.
  registrar_movimiento_entre_empresas ahora rechaza importe <= 0.
  movimiento_para_valorizar(p_referencia_tipo text, p_referencia_id uuid) → {referencia_tipo, referencia_id, fecha, acreedora_id, acreedora, deudora_id, deudora, lista_interna{id,nombre}|null, valorizado{id,importe,fecha}|null, items[{clave, presentacion_id, marca_id, insumo_id, detalle, cantidad, unidad, precio_sugerido|null, fuente('lista_interna'|'costo'|null)}]}
  valorizar_movimiento_entre_empresas(p_referencia_tipo text, p_referencia_id uuid, p_precios jsonb [{clave, precio}], p_concepto text default null) → {id, importe}
  (p_referencia_tipo: 'traspaso_terminado' | 'ingreso_externo' | 'transferencia_stock'; los dos piden gastos:gastos_empresa)
1) Valorizar (administracion.html):
   a) Al revalorizar, si no se pudieron leer las condiciones especiales (o falla cualquier lectura previa que impida dibujar los tildes), NO mandes p_condiciones: []. Bloqueá Guardar con el aviso "No se pudieron leer las condiciones especiales; reintentá", o mandá sin cambios las que ya tenía la orden (ordenes_retiro.condiciones_especiales).
   b) En precioDesdeBase, si el renglón trae precio_lista, no le pases el subtotal descontado (hoy el bulto de 17.500 queda en 17.499,90).
   c) Si la orden tenía una condición que hoy está desactivada, mostrala tildada con la etiqueta "(desactivada)" y un aviso. No la saques en silencio.
2) N1/N2 en la cuenta del cliente: el desplegable de la rama cc-orden-n1-n2 (tocar una fila Venta → N1-00XX con la comisión incluida y cuánto es, N2-00XX y total, con datos_division_orden) tiene que estar también en la cuenta del cliente de Administración (cuenta única, administracion.html cerca de 8448-8471) y en la pestaña Clientes de Cuentas corrientes. Mismas reglas: sin división guardada, solo el total; sin retiros:precios, solo el total.
3) Cobranzas (cobranzas.html ~3302): en comprobantes_ya_cargados mandá siempre p_cobranza_id = f.id, también en una cobranza nueva. Si no, al reabrir un borrador que la base ya guardó, sus propias transferencias salen en rojo.
4) Detalle del pago (cuentas-corrientes.html):
   a) Después de "Sacar del pago" o "Agregar cheque", volvé a llamar a cargarAccionesDetallePago (lo que queda a cuenta + Anular), y si el pago quedó anulado, sacá "Anular".
   b) Leé los cheques del pago con coalesce(pago_gasto_id, salida_gasto_id) = gasto y estado = 'endosado', igual que la base. Lo mismo en la vista previa de Anular.
   c) Si el pago es con cheques y la lectura de cobranza_cheques vuelve vacía, mostrá "No se pueden ver los cheques de este pago con tu usuario". La RLS filtra sin dar error.
   d) La vista previa de Anular, con efectivo o transferencia, tiene que decir siempre que la plata vuelve a la caja (la base ahora la devuelve aunque el gasto no tenga cuenta).
5) Aplicar cobranzas:
   a) En "Por medio de pago", itemsDeAplicacion ignora los medios en los que no se cobró nada (o limpia sus montos), para que Guardar no quede trabado sin un campo visible.
   b) En la cuenta del cliente, para los créditos que NO son cobranza y ya tienen algo aplicado (saldo a favor del corte, etc.), usá aplicaciones_credito_cliente: leés lo aplicado, sumás lo nuevo por doc/parte/medio y mandás todo junto a aplicar_credito_cliente. Para las cobranzas podés usar la misma función en vez de recibo_cobranza.
6) Condición de venta (administracion.html ~5461): "cliente sin condición" tiene que salir del dato de la base (clientes.pct_parte_a del cliente leído en ese momento), no de la lista de clientes del celular. Si no se pudo leer, no muestres "sin condición" ni permitas el tilde de guardarla. Y si falla guardarCondicionAlSalir, no te vayas de la ficha: quedate y mostrá el error.
7) Entre empresas (administracion.html, vista Entre empresas). Facu acepta que se saquen la cuenta "≈" de pantalla, el resumen del período por par y los filtros por empresa que entrega / recibe. A cambio, la valorización queda guardada en la base:
   a) El bloque "Mercadería sin valorizar" incluye las filas de movimientos_entre_empresas con con_precio = false de tipo 'mercaderia' Y de tipo 'insumos', agrupadas por (referencia_tipo, referencia_id): un renglón por movimiento, con fecha, quién entrega → quién recibe y el detalle resumido.
   b) Órdenes de retiro ('orden_retiro'): como hoy, link a la orden para valorizarla ahí.
   c) Traspasos, ingresos desde otra empresa y transferencias de insumos ('traspaso_terminado', 'ingreso_externo', 'transferencia_stock'): botón "Poner precio" (solo con gastos:gastos_empresa). Abre una ventana con movimiento_para_valorizar:
      - arriba: quién entrega (acreedora) → quién recibe (deudora), fecha, y la lista interna usada si vino;
      - un renglón por item: detalle, cantidad + unidad, campo de precio (por caja en producto, por unidad de medida en insumo) precargado con precio_sugerido y la fuente chiquita al lado ("lista interna" / "costo de compra"; vacío y en naranja si no hay sugerido), y subtotal;
      - total en vivo, concepto opcional;
      - si ya estaba valorizado (valorizado no es null), mostralo como "Valorizado en $ X el dd/mm" y el botón dice "Cambiar precio" (la base reemplaza).
      Guardar llama a valorizar_movimiento_entre_empresas con [{clave, precio}] para TODOS los renglones; si falta alguno, la base contesta "Faltan precios: …": mostralo tal cual. Montos con el parser argentino del proyecto. Al guardar, recargá la vista: el movimiento sale del bloque y el saldo por par ya lo incluye.
   d) Las filas 'otro' que vienen de una valorización llegan con referencia_tipo 'traspaso_terminado_precio' y referencia_id = el movimiento: en la lista, que el renglón diga "Valorización" y tenga "Cambiar precio", que reabre la misma ventana. Ojo: la referencia puede ser un traspaso, un ingreso o una transferencia de insumos; probá movimiento_para_valorizar con los tres tipos hasta que uno conteste, o tomá el tipo de la fila de mercadería/insumos con el mismo referencia_id.
   e) La pantalla frena importe <= 0 en "Cargar ajuste o compensación" antes de llamar a la base.
PRUEBAS: specs y mutaciones de cada punto (en el 7: botón visible/oculto por permiso, precarga del sugerido, total, falta de precio con el mensaje de la base, cambiar precio, insumos incluidos en el bloque). Ensayo completo y CI en verde. No integres: lo audito yo.
