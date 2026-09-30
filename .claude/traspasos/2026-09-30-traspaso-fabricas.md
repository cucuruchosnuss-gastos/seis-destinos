# Traspaso a otra fábrica (Stock, 30/09/2026) — prompt para el chat de arquitectura

Pegale esto al chat de arquitectura para que actualice CLAUDE.md. Quien lo recibe no vio el trabajo: está todo acá.

## Qué cambió

`modulos/stock.html` tiene una pantalla nueva, **"Traspaso a otra fábrica"**: pasa **producto terminado** de una fábrica a otra, lote por lote (Nuss le compra a Dolce Pasta lo que se hace en Rosario y Dolce le compra a Nuss los cucuruchones). Es un drill-down de la pestaña Stock, como el historial de recuentos y las mermas (`PESTANA_DE_VISTA.traspaso = 'stock'`, vista `#vista-traspaso`, botón `#btn-ver-traspaso` en la barra de acciones del stock).

**Cero SQL corrido**: la base ya estaba. Todo lo que escribe es UNA llamada a `traspasar_producto_terminado`.

## La base que usa (verificada con SELECT el 30/09/2026)

- **`traspasar_producto_terminado(p_origen_id, p_destino_id, p_items jsonb, p_fecha default null, p_observaciones default null)`** → `{traspaso_id, importe}` (SECURITY DEFINER, `search_path=public`). Exige `stock:ver` con alcance en LAS DOS fábricas. Por ítem `{presentacion_id (del origen), marca_id (null = sin cono o cono común), lotes: [{lote, cajas}], precio_caja}`. Busca en el destino la presentación del producto con el MISMO nombre de producto + `con_cono` + `media_caja` + `unidades_por_caja`, activa (**no compara el nombre de la presentación**). Por lote: `traspaso_salida` (−cajas) en el origen y `traspaso_entrada` (+cajas) en el destino, mismo lote, con `traspaso_id` (el CHECK `stock_terminado_movimientos_tipo_check` ya admite los dos tipos). Si el total > 0, `movimientos_entre_unidades` (acreedora = origen, deudora = destino, ARS).
- **`precio_venta(p_lista_id, p_presentacion_id, p_marca_id, p_fecha)`** → jsonb `{precio_caja, precio_unitario, sin_precio, …}`; exige `retiros:precios` en la unidad de la lista, si no lanza.
- Lecturas: `productos_terminados`, `producto_presentaciones`, `marcas_personalizadas` (policy con `tiene_tarea('stock','ver')`, sin alcance: se leen las de todas las fábricas, hace falta la del destino); `stock_terminado_movimientos` del origen (`_ve_produccion_en(unidad)` o `stock:ver` con alcance), **paginado de a 1000** con `.range()`, tope de 20 páginas; `listas_precios` (policy: `retiros:ver/precios/cargar` con alcance).
- Datos: 19 listas activas, **ninguna "interna"**; Nuss tiene 15 productos de reventa (de Dolce) y Dolce 8 (de Nuss); 45 de las 55 presentaciones activas de Nuss tienen par en Dolce y las 45 de Dolce tienen par en Nuss. Cero filas con `lote` null en `stock_terminado_movimientos`.

## Cómo funciona la pantalla

- **Botón**: con `stock:ver` y al menos DOS unidades en `estado.unidadesStock` (`v_mis_unidades_stock` ya pasada por `sinUnidadesDePrueba` en `cargarStock`): la fábrica de pruebas nunca cuenta ni aparece para una cuenta real.
- **Origen y destino** en dos `<select>` (destino sin el origen). El origen arranca en la unidad de la barra si es una permitida; el destino, en la otra si hay una sola posible. **Cambiar el origen con renglones cargados** abre un panel propio (`#modal-trp-origen`, nunca `confirm()`) y, si se confirma, vacía los renglones.
- **Agregar producto**: lista de las presentaciones activas de productos activos del origen con su stock en cajas (el chocolate al final con una línea "Chocolate", por `tipo_masa`), buscador sin acentos; si la presentación es con cono, un segundo paso con los conos (común + marcas activas no rechazadas + cualquier marca con stock aunque esté apagada), **los que tienen stock primero**. Un producto+cono repetido no se duplica y se dice.
- **Por renglón**: cajas que se pasan (enteras, `enlazarCampoNumero` 0 decimales), los **lotes con stock (> 0) del origen para esa presentación + cono, los más viejos primero** (fecha más vieja del lote), un campo de cajas por lote, **"Completar con los más viejos"**, y "Pedido / Asignado / Falta asignar". **Pasar más de lo que tiene un lote se avisa en bordó** ("ese lote queda en -3 cajas") **y no bloquea** (la base no lo impide). Falta asignar, asignado de más, sin pedido o sin ningún lote con stock SÍ bloquean.
- **Producto que el destino no tiene**: el renglón lo dice ANTES de mandar con el mismo texto de la base (`La fábrica de destino no tiene "Producto · Presentación": creala antes de pasarle stock.`) y no se deja confirmar.
- **Precio por caja** (opcional, `enlazarCampoNumero` 2 decimales): se **propone** de una lista **activa del origen cuyo nombre diga "interna"** (sin acentos ni mayúsculas) con `precio_venta`, marcado "Propuesto de la lista «X»: podés cambiarlo."; un precio tocado no se pisa. Sin lista interna: "Sin lista interna: escribí el precio por caja (vacío = sin deuda entre fábricas)"; si la lista no tiene precio o `precio_venta` falla, lo dice y queda vacío. Vacío viaja `precio_caja: null` = sin deuda.
- **Fecha** (hoy de Argentina, `hoyLocal()`; una fecha futura no se manda) y **observaciones**.
- **Vista previa**: por renglón producto · cono · lotes con sus cajas · precio · subtotal, el total y la frase **"Dolce Pasta le va a deber $ X a Cucuruchos Nuss."** o "Sin precio: no queda deuda entre fábricas." Un importe ausente es "—", nunca "$ 0".
- **Confirmar**: UNA llamada; el botón se traba solo mientras se manda (un doble toque manda una vez) y NO se deshabilita por lo que falta: lo que falta se dice al tocarlo, pegado al botón; el error de la base TAL CUAL. Éxito: aviso ("Listo: pasaron 12 cajas de Cucuruchos Nuss a Dolce Pasta. Dolce Pasta le debe $ … a Cucuruchos Nuss."), la lista se vacía y se relee el stock del origen.
- Todo texto de la base con `esc()`; `data-lote` escapado.

## Qué se verificó

- `pruebas/test-stock-traspaso.js` **171/171** (ejecuta el código real contra un DOM y un supabase falsos: quién ve el botón y la fábrica de pruebas, el paginado, el orden de lotes, el paso de elegir y de cono, el reparto, el aviso del destino, la propuesta con y sin lista / con error / `sin_precio`, la vista previa, el payload exacto, el doble toque, el error tal cual, el corte de red, el cambio de origen con el panel, los campos de números y texto malicioso en cada dato e id). Corta si un `await` queda colgado (`beforeExit`), así una suite colgada no cuenta como verde.
- `pruebas/mut-stock-traspaso.js` **86/86** detectadas (+33 equivalentes declaradas: `esc()` de números calculados en el código, de `textoCajasTrp`/`plataTrp` de un número y de la fecha de una columna `date`).
- `test-stock-xss.js` 238/238 (seis entradas nuevas en `SEGURAS` para los `htmlXxxTrp`, con su motivo), `controles-stock.js` 1062/1062 (los controles nuevos se listan, ninguno perdido), `check-bytes` y `check-scripts` en verde, **`correr-todo.js` 173/173**.
- **Mirado en la maqueta** (`?maqueta=stock`, datos nuevos en `pruebas/datos-maqueta/stock.js`) a 390 y 1280 px: sin scroll horizontal, sin errores de consola, el recorrido entero (elegir, completar, lote de más, destino que no tiene, confirmar).

## Lo que NO se probó

- **Nada con sesión real ni contra la base**: ninguna RPC se ejecutó (Supabase en solo lectura).
- El `<input type="date">` en un iPhone real.

## Huecos de base (para el chat de arquitectura / Facu)

1. **No hay "lista interna" marcada**: `listas_precios` no tiene columna para eso. La regla que usa la pantalla es por NOMBRE (una lista activa del origen que diga "interna"). Hoy no hay ninguna, así que el precio siempre se escribe a mano. Si se quiere proponer, crear una lista "Interna …" en cada fábrica con los precios entre fábricas, o agregar una columna `es_interna`.
2. **Quien no tiene tareas de retiros no lee `listas_precios`** (su policy) ni puede llamar a `precio_venta` (exige `retiros:precios`): para esa persona nunca hay propuesta.
3. **La RPC no valida stock**: un lote puede quedar negativo. La pantalla lo avisa y no lo bloquea (decisión del pedido).
4. **La RPC no tiene clave de idempotencia**: si se corta la red después de mandar, reintentar puede pasarlo dos veces. La pantalla lo dice en el error de conexión y manda a mirar el stock terminado del destino. Sugerencia: un `p_client_uuid` como en `registrar_orden_retiro`.
5. **La base no compara el nombre de la presentación** al buscar en el destino (solo producto + con_cono + media_caja + unidades): la pantalla replica esa regla exacta.
6. **El traspaso no deja rastro legible en Stock**: no hay pantalla de "traspasos hechos" ni una vista que los agrupe por `traspaso_id`; se ven como movimientos `traspaso_salida`/`traspaso_entrada` en el stock terminado (Producción) y la deuda en `movimientos_entre_unidades`.

## Qué sección de CLAUDE.md tocar

Módulo 7 **Stock**: sumar el párrafo de abajo al final de la entrada (después de la FASE 4 / el tablero de mermas). En la lista de suites de "Las suites de verificación viven en `pruebas/`", sumar `test-/mut-stock-traspaso.js`.

> **TRASPASO A OTRA FÁBRICA — producto terminado** (30/09/2026; traspaso `.claude/traspasos/2026-09-30-traspaso-fabricas.md`). Drill-down de la pestaña Stock (`#vista-traspaso`, `PESTANA_DE_VISTA.traspaso = 'stock'`), botón "Traspaso a otra fábrica" con `stock:ver` en al menos DOS unidades reales (`estado.unidadesStock`, ya sin la fábrica de pruebas). Una sola llamada a **`traspasar_producto_terminado(p_origen_id, p_destino_id, p_items [{presentacion_id, marca_id, lotes: [{lote, cajas}], precio_caja}], p_fecha, p_observaciones)`** → `{traspaso_id, importe}` (exige `stock:ver` en las dos; por lote `traspaso_salida`/`traspaso_entrada` con el mismo lote; con total > 0, deuda en `movimientos_entre_unidades`, acreedora el origen). Origen y destino en dos selects (el origen arranca en la barra; cambiarlo con renglones pide confirmación con un panel propio y los vacía). Por renglón: presentación del origen (chocolate al final por `tipo_masa`) y cono (los con stock primero), cajas enteras, los **lotes con stock del origen, los más viejos primero** (`stock_terminado_movimientos` paginado de a 1000, tope 20 páginas, "puede estar incompleto" si se pasa), "Completar con los más viejos" y Pedido / Asignado / Falta asignar; **pasar más de lo que tiene un lote se avisa en bordó y no bloquea** (la base no valida stock). Si el destino no tiene el producto (mismo nombre + con_cono + media_caja + unidades_por_caja, activa: la regla exacta de la base), se dice antes con el texto de la base y ese renglón no se confirma. **Precio por caja opcional**: se propone con `precio_venta()` de una lista activa del origen cuyo nombre diga "interna" (hoy no hay ninguna: "Sin lista interna: escribí el precio por caja (vacío = sin deuda entre fábricas)"); vacío viaja null = sin deuda. Vista previa con subtotales, total ("—" y nunca "$ 0") y "Dolce Pasta le va a deber $ X a Cucuruchos Nuss."; el botón solo se traba mientras manda y el error de la base va tal cual. **Huecos**: sin lista interna marcada, la RPC no valida stock ni tiene clave de idempotencia. Suites `test-stock-traspaso.js` (171) / `mut-stock-traspaso.js` (86/86 +33 eq.).

## Qué automatizaría ahora

**La trampa del `setTimeout(0)` en Windows** (~15 ms por tick): la primera versión de esta suite tardaba 6 s y su runner de mutaciones se cortaba a los 10 minutos; con `setImmediate` tarda 0,5 s. Un helper compartido `pruebas/esperar.js` (`tick` con `setImmediate` + el guard de `beforeExit` para la suite colgada) que usen todas las suites nuevas evitaría repetir las dos cosas, y un chequeo en `correr-todo.js` que avise de una suite de más de 5 s señalaría las lentas.
