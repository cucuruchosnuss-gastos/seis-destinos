# Pedido de Facu (30/10/2026) — rama `ci-prueba/entre-empresas-v2`

La base ya tiene (confirmalas antes de usarlas; si falta alguna o la firma es distinta, pará y avisame):
- movimientos_entre_empresas(p_desde, p_hasta), ya en uso. Convención: de_unidad = la que TIENE QUE COBRAR, a_unidad = la que DEBE, en las filas con importe (pago, cobro, cheque, traspaso_dinero, otro). Las de 'mercaderia' traen cantidades sin importe y con_precio (si ya se valorizó).
- precios_lista_interna(p_lista_id, p_fecha default null) → {lista_id, nombre, pct, items[{presentacion_id, producto, presentacion, unidades_por_caja, precio_interno, precio_propio, mas_barata{lista, precio_caja}}]}
- guardar_lista_interna(p_lista_id, p_pct) (ej. −5 = 5 % menos que la más barata)
- registrar_movimiento_entre_empresas(p_acreedora, p_deudora, p_importe, p_fecha, p_concepto)
Las listas internas son listas_precios con es_interna = true (hoy "Nuss → Dolce Pasta (interna)" y "Dolce Pasta → Nuss (interna)").

1) ARRIBA DE TODO: SALDO NETO POR PAR DE EMPRESAS (desde siempre, con un rango amplio)
- Una tarjeta por par con movimientos (Nuss↔Dolce, Nuss↔Mengui, Dolce↔Mengui): "Nuss le debe a Dolce $ 11.687.409,88", con los dos lados chicos abajo ("Nuss debe $ X · Dolce debe $ Y").
- Tocar la tarjeta filtra la lista de abajo a ese par.

2) LA LISTA DE MOVIMIENTOS (como hoy), más clara:
- Cada renglón: fecha, tipo con sello (Pago, Cobro, Cheque, Traspaso, Mercadería, Otro), detalle, quién le debe a quién y el importe.
- Links: la orden de retiro, el gasto, la cobranza o el cheque, según referencia_tipo/referencia_id.
- Filtros: período, par de empresas y tipo.
- Bloque aparte arriba de la lista: "Mercadería sin valorizar", con las filas 'mercaderia' que tienen con_precio = false (orden, producto, cajas) y link para valorizar la orden. Son deuda que todavía no tiene precio.

3) "CARGAR AJUSTE O COMPENSACIÓN" (solo gastos:gastos_empresa): quién le debe a quién, importe, fecha y concepto → registrar_movimiento_entre_empresas. Ayuda: "La plata que se pasa de una empresa a otra se carga como traspaso entre cuentas en Caja; esto es para ajustes y compensaciones".

4) LISTAS INTERNAS (sección dentro de Entre empresas)
- Una tarjeta por lista interna: nombre, el % ("−5 % sobre la lista más barata de cada producto", editable, con guardar_lista_interna) y la tabla de precios_lista_interna: producto · presentación · precio interno · lista más barata (nombre y precio) · precio propio si lo tiene.
- Los productos sin precio (precio_interno null) en gris: "sin precio en ninguna lista".
- Texto de ayuda: "Si un producto tiene precio propio en la lista interna, manda ese; si no, el más barato de las listas de venta de esa empresa, con el %".

PRUEBAS: saldo neto por par con la convención de signos (un pago de Nuss por un gasto de Dolce suma a "Dolce le debe a Nuss"); filtro por par; mercadería sin valorizar; ajuste manual; % de la lista interna y su tabla.
