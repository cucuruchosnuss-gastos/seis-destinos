# Valorizar con precio_venta() — traspaso (30/09/2026)

Administración → Órdenes → **Valorizar** propone el precio de cada renglón de PRODUCTO con `precio_venta()` de la base, y ya no lo busca por `presentacion_id` en `lista_precios_items`.

## Por qué

Se cargaron 19 listas (11 de Nuss, 8 de Dolce Pasta). Sus renglones tienen precio **solo en la presentación SIN cono** de cada producto, y cada lista tiene su **conito** aparte (`precios_conito.lista_id`). La regla vieja (réplica de `precio_vigente()` por presentación) dejaba "sin precio" todo renglón con cono y toda media caja.

## Qué hace ahora (`modulos/administracion.html`)

- `abrirValorizar()`: para cada renglón de producto (sin precio ya guardado si se corrige) llama a `precio_venta(p_lista_id, p_presentacion_id, p_marca_id, p_fecha)` con la lista del cliente, el cono del renglón (null sin cono) y **la fecha del retiro**. **Una llamada por renglón DISTINTO** (presentación + cono), todas en paralelo; los insumos y el saldo del cliente, en paralelo con eso.
- **Turno** (`turnoValorizar`, sube también en `cancelarValorizar()`): una respuesta vieja no pisa el panel reabierto ni reabre uno cerrado.
- Al lado del campo, en chico (`htmlOrigenPrecio`, escapado): "lista Heladerías · $ 30,00 por unidad" o "… + conito $ 8,50" (precio por unidad con hasta 4 decimales). Con cono y conito 0 dice "(la lista no tiene precio de conito)" en vez de "$ 0".
- `sin_precio` → campo vacío y **el motivo de la base en bordó**. Error de la llamada (sin permiso incluido) → vacío y "No se pudo leer el precio de la lista." + el mensaje de la base. Nunca un número inventado.
- **Cliente sin lista**: como antes, se escribe a mano (no se llama a la base).
- **Insumos: sin cambios** (la regla de `precio_vigente_insumo()` replicada, leyendo `lista_precios_items`); esa lectura ahora solo se hace si la orden tiene insumos.
- **Corregir valorización**: arranca de los precios guardados; solo pide a la base los renglones que no tenían.
- Se siguen mandando **TODOS** los precios en `p_precios` de `valorizar_orden_retiro` (el aviso de límite y lo demás, igual).
- Si falla la lectura de los insumos o del saldo, los productos se proponen igual (antes un solo error tapaba todo).

## Decisiones

- `precio_venta()` exige `retiros:precios` en la unidad de la lista; la pantalla ya solo abre Valorizar con ese permiso, así que "sin permiso" solo pasaría con una lista de otra unidad (se muestra el error).
- El texto de origen queda al lado aunque la persona corrija el precio: es la referencia de lo que propuso la lista.

## Lo que NO se tocó (anotado)

- **La grilla de Listas de precios** sigue mostrando `lista_precios_items` por presentación: en las listas nuevas las presentaciones con cono (y las medias cajas) salen **sin precio** y el **conito no se ve en ningún lado**; tampoco el `precio_unitario`. Hay que rediseñarla para: precio por unidad del producto (de su presentación sin cono), las presentaciones derivadas calculadas, y el conito de la lista (común / ilustración).
- **"Aumentar todo un X%"** y **el importador de precios** siguen trabajando por presentación sobre `precio_caja` (mismo problema).
- `test-administracion-listas.js` no se tocó.

## Huecos de base

- **`valorizar_orden_retiro` sin precio de un renglón cae en `precio_vigente()` viejo, SIN conito** (y sin la regla de "presentación sin cono del mismo producto"). La pantalla manda siempre todos los precios, así que hoy no muerde; pero una llamada que omita un renglón valoriza mal un producto con cono, o falla diciendo que falta. Conviene que la base use `precio_venta()` también ahí.
- `precio_venta()` hace `coalesce(precio_conito(...), 0)`: **"sin conito cargado" y "conito $ 0" son indistinguibles** para la pantalla. Se muestra como "la lista no tiene precio de conito".
- Al 30/09/2026 ninguna lista tiene `es_base` ni `base_id`: cada lista es su propia base con recargo 0.

## Lo no probado

- Nada con sesión real ni contra la base (el conector es de solo lectura; `precio_venta` no se ejecutó). Verificado con `pg_get_functiondef` el 30/09/2026: firma, SECURITY DEFINER, `authenticated` sí, `anon` no.
- Mirado en la maqueta (`administracion`, orden o1) a 1280 y 390 px: sin scroll horizontal, los dos orígenes a la vista.

## Guion para Facu

1. Administración → Órdenes → una orden sin valorizar de un cliente con lista, con un renglón con cono y uno sin cono → **Valorizar**.
2. Cada renglón viene con precio y abajo "lista X · $ … por unidad (+ conito $ …)". Comparar contra la lista en papel.
3. Un producto que no esté en la lista: campo vacío y el motivo en bordó.
4. Valorizar y mirar el total en la cuenta del cliente.

## Pruebas

- `test-administracion-ordenes.js`: 157/157 (casos nuevos: con cono, sin cono, una llamada por renglón distinto, sin_precio, error/sin permiso, cliente sin lista, corregir, turno, insumo intacto, payload completo, XSS del origen).
- `mut-administracion-ordenes.js`: 77/77 (+31 equivalentes); 15 mutaciones nuevas de precio_venta.
- `correr-todo.js` 172/172, `check-bytes.js` verde, `controles-administracion.js` verde, `e2e/5-maqueta.spec.js` de Administración 6/6.
- **No hay mutación sobre el guard de turno**: una respuesta vieja escribe sobre un objeto `v` ya descolgado, así que sin el guard no hay efecto observable (solo un repintado de más). Es defensivo.

## Qué automatizaría ahora

La réplica de reglas de precio en el cliente (`preciosVigentes` para insumos, la grilla de listas, el importador) es la tarea repetida más cara: cada cambio de la base obliga a tocar tres lugares de la pantalla. Una RPC `precios_de_orden(p_orden_id)` que devuelva el precio propuesto y su origen para TODOS los renglones (productos e insumos) dejaría a la pantalla sin ninguna regla de precios, y un solo test de contrato.
