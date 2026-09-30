# Traspaso — Producción (gestión): reventa y traspasos en el stock terminado (30/09/2026)

Para el chat de arquitectura (dueño de CLAUDE.md). Autocontenido: quien lo lee no vio el trabajo.

## Qué cambió y por qué

La base ya tenía (verificado el 30/09/2026 contra `information_schema`, `pg_constraint`, `pg_policy` y `pg_get_functiondef`):

- `productos_terminados.origen_producto_id` (uuid null): en un producto de REVENTA apunta al producto original de la fábrica que lo hace. Hoy: **Cucuruchos Nuss tiene 15 productos de reventa que vienen de Dolce Pasta** (23 presentaciones activas) y **Dolce Pasta tiene 8 que vienen de Nuss** (22 presentaciones activas); todos activos.
- `stock_terminado_movimientos.tipo` admite ahora `traspaso_salida` y `traspaso_entrada` (CHECK con seis valores: produccion, inventario_inicial, ajuste, despacho, traspaso_salida, traspaso_entrada; los dos nuevos caen en la rama que exige motivo de 3 letras), con la columna `traspaso_id`. Los genera `traspasar_producto_terminado` (la usa Stock). Al 30/09/2026 no hay ningún movimiento de traspaso cargado.
- La policy de SELECT de `productos_terminados` es `puede_ver_produccion() OR stock:ver OR pedidos:ver/cargar OR retiros:cargar/ver`, y `puede_ver_produccion()` es `tiene_tarea(...)` de cualquiera de las tres tareas de Producción, **SIN unidad**: quien ve la gestión puede leer el producto de origen aunque sea de otra fábrica.

La pantalla `modulos/produccion-gestion.html`, sección **Stock terminado**, ahora:

1. **Etiqueta los productos de reventa**: al lado del título del grupo (producto · presentación · cono) va una pastilla **"Reventa · Dolce Pasta"** (`.pg-reventa`, neutra: fondo `--color-pista`, texto `--color-texto-2`, borde `--color-borde`; ni bordó ni naranja). La fábrica sale de: `origen_producto_id` → el producto de origen (se lee aparte, `productos_terminados.select('id, unidad_negocio_id').in('id', ids)`, una sola consulta, `leerOrigenesReventa`) → el nombre de esa unidad del mapa `estado.unidades` que ya tenía la pantalla. **Si no se pudo leer el origen, o la unidad no está en el mapa, dice "Reventa" a secas: nunca inventa la fábrica.** Si la lectura del origen falla, el stock se ve igual (no tira). Un producto propio no lleva etiqueta. Si mientras se leía el origen se eligió otra unidad, la respuesta vieja no se dibuja. El `.select()` de los productos de la unidad suma `origen_producto_id`.
2. **Lista los traspasos** en una sección nueva, **"Traspasos entre fábricas"** (`#pr-stock-traspasos`, debajo de "Lo que salió por retiros"): fecha, "Traspaso a otra fábrica" / "Traspaso desde otra fábrica", producto · presentación · cono, sublote, "salieron N cajas" / "entraron N cajas" (sin signo; unas cajas que no se leen dicen "—"), lo más nuevo primero (y el mismo día, lo cargado más tarde primero). Sin traspasos no se dibuja; al recargar se limpia. El nombre de cada tipo sale de `textoTipoStockTerminado()` (con `NOMBRE_TIPO_STOCK_TERMINADO`): los seis tipos de la base con nombre en castellano; **un tipo desconocido se muestra tal cual, escapado con `esc()`**, uno vacío dice "Movimiento", y un nombre como `toString` no rompe (se mira con `hasOwnProperty`).
3. Los totales del stock ya sumaban todos los movimientos, así que **los traspasos restan en la fábrica que manda y suman en la que recibe** sin tocar `agruparStockTerminado`. Los traspasos no aparecen en "Lo que salió por retiros" (esa lista exige `orden_retiro_id`).

No había otra lista de movimientos por lote en la gestión que mostrara el tipo: la única era la de retiros.

**Cero SQL corrido: Supabase en solo lectura. Ninguna RPC cambió de firma. Ninguna tarea ni permiso nuevo.**

## Qué se verificó y contra qué

- Suite nueva `pruebas/test-produccion-reventa.js`: **47/47**. Ejecuta `cargarStockTerminado()` en el sandbox (`sandbox-produccion.js`, que suma las funciones nuevas a `SOLO_GESTION` y la constante a `CONST_NUEVAS_GESTION`) con un Supabase falso: la etiqueta con su fábrica, "Reventa" a secas si el origen falla, viene vacío o es de una unidad fuera del mapa, sin etiqueta en un producto propio, las consultas (el `in('id', …)` una sola vez, con la unidad; sin reventa no se consulta), la respuesta de otra unidad, los dos tipos nombrados, sin tipo crudo, el orden, las cajas sin signo, los totales del stock, y el texto malicioso escapado en producto, presentación, cono, fábrica, lote y tipo (`chequearMarcas`).
- Mutaciones `pruebas/mut-produccion-reventa.js`: **36/36 detectadas (+6 equivalentes declaradas: fecha y números formateados)**, de a una.
- `node pruebas/check-bytes.js` verde; `node pruebas/correr-todo.js` **173/173 en verde** (incluye `controles-produccion-gestion.js` 751/751 y `controles-produccion.js` 1822/1822).
- `mut-produccion-historial.js` 105/105 (+15 eq.) y `mut-produccion-stock-retiros.js` 31/31 (+3 eq.) siguen verdes (sus anclas se mantuvieron únicas: el código nuevo usa `cajasTr` y `(x, y)` para no duplicarlas).
- Maqueta: `pruebas/datos-maqueta/produccion-gestion.js` suma un producto de reventa de Nuss ("Cono dulce", origen en Dolce Pasta), su presentación y tres movimientos de stock terminado (producción, traspaso de salida y de entrada); `npm run maqueta:datos` regenerado. `e2e/5-maqueta.spec.js` suma el paso **"stock"** en la gestión (abre Stock terminado y exige "Reventa · Dolce Pasta" y los dos traspasos): **3/3 en verde** a 390 y 1280 px, sin scroll horizontal ni errores.
- **Nada con sesión real.**

## Pendiente para Facu (no se tocó)

- **La planta ofrece los productos de reventa para PRODUCIR.** `leerCatalogoProductos()` de `modulos/produccion.html` trae todos los productos activos de la unidad sin mirar `origen_producto_id`, así que en la tablet de Nuss aparecen los 15 de reventa de Dolce Pasta (y en la de Dolce Pasta los 8 de Nuss) en "Agregar producto". **Es decisión de Facu** si se esconden en la planta (una línea: `.is('origen_producto_id', null)` en la consulta, o filtrar al armar la lista) o si se pueden cargar a propósito. Tampoco se marcan en Configuración → Productos de la gestión.
- La fábrica del producto de origen no se ve si esa unidad no está en `estado.unidades` (inactiva o la fábrica de pruebas para una cuenta real): ahí dice "Reventa" a secas, a propósito.

## Qué hay que tocar en CLAUDE.md

Módulo 10 (Producción), dentro de "DESDE EL 25/09/2026 SON DOS PANTALLAS…", al lado de la viñeta **"Stock terminado → «Lo que salió por retiros»"**, sumar una viñeta (texto propuesto abajo). En la sección de tablas de **Producción**, la línea de `stock_terminado_movimientos` dice `tipo ∈ produccion/inventario_inicial/ajuste/despacho`: sumar `traspaso_salida/traspaso_entrada` (con `traspaso_id`) y `productos_terminados.origen_producto_id`. En "Las suites viven en `pruebas/`", sumar la entrada del 30/09/2026.

Viñeta propuesta:

> - **Stock terminado → reventa y traspasos** (30/09/2026; traspaso `.claude/traspasos/2026-09-30-reventa-stock-terminado.md`): un producto con `productos_terminados.origen_producto_id` (revende lo que hace otra fábrica del grupo: 15 de Dolce Pasta en Nuss, 8 de Nuss en Dolce Pasta) lleva la pastilla neutra **"Reventa · <fábrica que lo hace>"** (`.pg-reventa`); la fábrica sale del producto de origen, leído por id (la policy lo deja leer: `puede_ver_produccion()` no mira unidad) y del mapa de unidades; si no se pudo leer, **"Reventa" a secas**, nunca inventada. Debajo de los retiros, **"Traspasos entre fábricas"** (`#pr-stock-traspasos`): `traspaso_salida` → "Traspaso a otra fábrica", `traspaso_entrada` → "Traspaso desde otra fábrica" (los genera `traspasar_producto_terminado`, de Stock); un tipo desconocido se muestra tal cual y escapado (`textoTipoStockTerminado`). Los totales ya los sumaban. **Pendiente de Facu:** la planta ofrece los productos de reventa para producir. Suite `test-/mut-produccion-reventa.js` (47/47; 36/36 +6 eq.).

## Qué automatizaría ahora

La tarea repetida más cara de esta parte fue **cuidar que las mutaciones de OTRAS suites sigan teniendo anclas únicas** cuando se agrega código parecido cerca (dos veces tuve que renombrar variables porque `mut-produccion-stock-retiros.js` pasó a ver sus anclas repetidas). Un chequeo barato: que `correr-todo.js` (o un `pruebas/test-anclas-mutaciones.js`) cargue TODOS los `mut-*.js` en modo "solo planificar" y falle si alguna ancla dejó de existir o dejó de ser única, sin correr las mutaciones. Tarda segundos y avisa en el mismo commit que rompe el ancla, en vez de recién cuando alguien corre ese runner a mano.
