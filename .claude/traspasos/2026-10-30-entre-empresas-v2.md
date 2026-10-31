# Traspaso — Entre empresas v2 (30/10/2026)

Rama `ci-prueba/entre-empresas-v2`, creada desde `origin/main` = `e6e0c74` (confirmado con `git fetch` y `git ls-remote`). Sin integrar. Archivo: `modulos/administracion.html`, vista "Entre empresas" (no se tocó `produccion.html`).

## El pedido

"""
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
"""

## Qué cambió (en castellano simple)

- **Arriba de todo, el saldo de cada par de empresas, desde siempre.** Una tarjeta por par ("Nuss le debe a Dolce Pasta $ 11.687.409,88", y abajo chico "Dolce Pasta debe $ 563.000,07 · Nuss debe $ 12.250.409,95"). Si hubiera plata en dólares, va en otro renglón: nunca se suma con los pesos. Si hay mercadería o insumos sin precio, la tarjeta dice cuántos y que no están en el saldo.
- **Tocar una tarjeta filtra la lista** a ese par (la tarjeta queda marcada y el filtro "Par de empresas" también); tocarla de nuevo muestra todo.
- **"Mercadería sin valorizar"**: un bloque arriba de la lista con la mercadería que todavía no tiene precio, por orden ("Orden D-I-0002", cada producto con sus cajas y el total) y el botón **"Valorizar la orden"**, que abre la orden en su empresa (si la persona solo puede ver órdenes ahí, dice "Ver la orden"; sin permiso, lo dice).
- **La lista**: filtros período, par de empresas y tipo (se fueron "empresa que entrega / que recibe"). Cada renglón: el sello de color del tipo (Pago, Cobro, Cheque, Traspaso, Mercadería, Insumos, Otro), la fecha, el importe (o las cajas), el detalle, **quién le debe a quién** ("Dolce Pasta le debe a Nuss") y el link: la orden, "Ver el gasto", "Ver la cobranza" o "Ver el cheque".
- **"Cargar ajuste o compensación"** (solo con el permiso de gastos de la empresa): quién le debe a quién, importe, fecha y concepto, con la ayuda del pedido. Al guardar, el saldo y la lista se actualizan solos.
- **Listas internas**: una tarjeta por lista interna con su nombre, el % ("−5 % sobre la lista más barata de cada producto") que se puede cambiar y guardar, y la tabla (en la compu, en columnas; en el celular, apilada): producto · presentación, precio interno, lista más barata con su precio y precio propio. Lo que no tiene precio en ninguna lista va en gris. Con el texto de ayuda del pedido.
- **Se fueron** el resumen por par del período (lo reemplaza el saldo de arriba) y la cuenta "≈" que valorizaba en pantalla con una lista de precios elegida (ver "Lo decidido sin consultar").

## Lo verificado en la base (30/10/2026, solo lectura)

- Las cuatro funciones existen con la firma del pedido (`pg_get_functiondef`):
  - `movimientos_entre_empresas(p_desde date, p_hasta date)` → TABLE(…, marca_id, con_precio). Pide `gastos:gastos_empresa`; "Elegí el período."; no más de **800 días** ("El período no puede pasar de dos años.").
  - `precios_lista_interna(p_lista_id uuid, p_fecha date default null)` → jsonb. Pide `gastos:gastos_empresa` **o** `retiros:precios` en la empresa de la lista.
  - `guardar_lista_interna(p_lista_id uuid, p_pct numeric)` → jsonb `{lista_id, pct}`. El mismo permiso; el % va de −50 a 50 ("El porcentaje va de −50 a 50 (ej. −5 = 5 % menos que la lista más barata)."). El botón se muestra con esa misma regla.
  - `registrar_movimiento_entre_empresas(p_acreedora uuid, p_deudora uuid, p_importe numeric, p_fecha date, p_concepto text)` → uuid. Pide `gastos:gastos_empresa` (sin alcance); valida "Elegí las dos empresas (distintas).", "Poné el importe." (solo rechaza 0 o vacío: **acepta negativos**; la pantalla pide un importe positivo y la dirección se elige con las empresas) y "Poné el concepto." (3 letras). Siempre en pesos (ARS).
- `tipo`: cheque, pago, cobro, traspaso_dinero, mercaderia, insumos, otro. `referencia_tipo`: cheque, gasto, cobranza, caja_movimiento, traspaso_terminado, ingreso_externo, orden_retiro, transferencia_stock, traspaso_terminado_precio, movimiento_entre_unidades.
- Monedas: los pagos, cobros, traspasos y deudas cargadas traen la moneda de su registro (puede haber dólares); los cheques, pesos. Por eso el saldo es por moneda. Hoy todo es en pesos.
- **La convención coincide con un ejemplo de verdad**: 4 gastos de Dolce pagados desde cuentas de Nuss ($ 563.000,07, de = Nuss, a = Dolce → Dolce le debe a Nuss) y 3 cheques de Nuss endosados o usados por Dolce ($ 12.250.409,95 en `movimientos_entre_unidades`, acreedora Dolce, deudora Nuss). El neto da exactamente "Nuss le debe a Dolce $ 11.687.409,88", el número del pedido. No encontré nada que contradiga la convención.
- Las listas internas: `9b62a408-…` "Nuss → Dolce Pasta (interna)" (Nuss) y `c763ef91-…` "Dolce Pasta → Nuss (interna)" (Dolce), las dos con `recargo_pct` 0 y sin precios propios. `listas_precios` solo se lee con retiros:ver/precios/cargar en su empresa (su policy).
- Datos raros (no los toqué): un `ingreso_externo` del 27/10 con `unidad_origen_id` = la misma empresa (Dolce → Dolce, "Conos de papel sueltos"): la pantalla lo lista con "sin otra empresa: no es deuda entre empresas" y no lo cuenta en ningún par ni en "sin valorizar". Y el cliente "PAZ, MIRTA" de Dolce tiene `unidad_grupo_id` = Nuss (por eso las órdenes D-I-0001/0002 son internas): conviene que el chat de la base lo mire.

## Lo decidido sin consultar

1. **"Desde siempre" = los últimos 800 días**, que es lo más que deja pedir la base. Hoy el primer movimiento es del 10/09/2026, así que es todo. Si algún día hace falta más, la base tiene que aceptar un rango mayor.
2. **Saqué la cuenta "≈" con una lista de precios** (la "Valorizar mercadería e insumos" de octubre, que era una cuenta de la pantalla y no se guardaba) y el resumen por par del período: el pedido pide "más clara" y la mercadería ahora se valoriza en la orden. Los insumos transferidos (sin precio y sin `con_precio`) se listan con "Sin importe" y la tarjeta los cuenta como "sin valor".
3. **"Mercadería sin valorizar" usa el rango de "desde siempre"** (no el período de la lista), porque es deuda pendiente sin importar la fecha; sí respeta el par elegido.
4. **El sello "Insumos"** se suma a los seis del pedido (la base también devuelve ese tipo).
5. **Links**: la cobranza y el cheque se abren recargando Administración (`administracion.html?seccion=cobranzas&cobranza=…` y `?seccion=cheques&cheque=…`, los mismos links que ya usan Caja y cheques.html), solo si la persona ve esa sección; el gasto, con `gastos.html?gasto=…&volver=…` como Caja. **Sin link (queda el detalle)**: los traspasos de plata (`caja_movimiento`: Caja no tiene cómo abrir un movimiento), los traspasos e ingresos de producto de Stock y las transferencias de insumos (Stock no abre un registro por link).
6. Las tarjetas del saldo van ordenadas por nombre de empresa (Dolce ↔ Mengui, Dolce ↔ Nuss, Mengui ↔ Nuss) y en el texto chico va primero la empresa que va primera por nombre ("Dolce Pasta debe … · Nuss debe …", no "Nuss debe … · Dolce debe …" como en el ejemplo del pedido).
7. La fecha del ajuste no puede ser futura (el campo tiene tope hoy).

## Lo no probado

- Nada contra la base de verdad (solo lectura): guardar un ajuste y guardar el % se probaron con la maqueta y con las suites.
- El link a la cobranza y al cheque se probó que se arma bien, no que la otra pantalla abra ese registro (es el mismo link que ya usan Caja y cheques.html).
- Una persona con `gastos:gastos_empresa` pero sin permiso de Órdenes de retiro no ve ninguna lista interna (la policy de `listas_precios` no la deja leerlas): la pantalla lo dice. Si Facu quiere que la vean, hace falta una función de la base que las liste.

## Pruebas

- `test-administracion-entre-empresas-v2.js` (nueva): 177/177. Ejecuta el código real con el caso de la base del 30/10 (el pago de Nuss por el gasto de Dolce → "Dolce Pasta le debe a Nuss"; con los cheques → "Nuss le debe a Dolce Pasta $ 11.687.409,88"), los tres pares, pesos y dólares aparte, la tarjeta que filtra, la mercadería sin valorizar, los links, el ajuste y las listas internas, más XSS.
- `mut-administracion-entre-empresas-v2.js` (nueva, baseline fijo `e6e0c74`: la suite da rojo sobre la Administración de antes): 87/87 detectadas (+2 equivalentes: textos constantes).
- `test-administracion-entre-empresas.js` al día con la v2 (sin la cuenta "≈", con el filtro por par y `con_precio`): 87/87; `mut-administracion-entre-empresas.js`: 43/43 (+1 equivalente, la clase del sello).
- `mut-administracion-orden-entre-empresas.js`: dos anclas al día (`vincularOrdenesEntre` ahora lee la tabla solo si hay deudas cargadas; el link de la fila sale de `htmlLinkEntre`): 45/45.
- `test-administracion-anular-nota-debito.js` y `test-modulos-esqueleto-parejo.js`: anotados los ids que se fueron a propósito (`ad-entre-origen`, `-destino`, `-resumen`, `-valorizar`, los selectores de lista).
- `seguras-administracion.js`: fuera las 5 hojas de la fila vieja (ya no existen).
- Navegador (maqueta `entre-empresas-v2`, nueva): `e2e/111-entre-empresas-v2.spec.js` a 1280 y 390 px, en verde, sin scroll de costado y con campos de 16 px en el celular; `e2e/36` (al día) y `e2e/62` en verde.
- `node pruebas/check-scripts.js` y `check-bytes` en verde; `npm run pruebas` en verde (ver el informe).

## Qué automatizaría ahora

- **Buscar el número de spec en todas las ramas**: `npm run spec:numero` solo mira `main` y hubo que armar a mano un script que recorre las ramas `ci-prueba/*` remotas. Sumarle a `pruebas/spec-numero.js` una opción `--ramas` que haga `git ls-tree` de cada rama remota y salte los números tomados ahorraría el paso (y los choques de números entre ramas abiertas).
- Cuando una rama cambia una función que otras suites de mutaciones usan como ancla (acá `vincularOrdenesEntre`), `test-anclas-mutaciones` lo detecta, pero no corre las que "corren algo antes de mutar" (las de baseline fijo). Que corra también esas con `MUT_SOLO_ANCLAS=1` (ya saltean el baseline) habría avisado solo de las dos anclas de `mut-administracion-orden-entre-empresas.js` que hubo que arreglar.
