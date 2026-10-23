# Traspaso — Stock: producto terminado prolijo (23/10/2026)

Rama `ci-prueba/stock-terminado-prolijo` (desde `origin/main` = `f32b687`). **No se integra**: queda pusheada para auditoría. Tag de seguridad: `antes-de-stock-terminado-prolijo-2026-10-23`.

## Para el chat de arquitectura (prompt autocontenido)

Hola. El subagente de Stock rehízo la vista de **producto terminado** de Stock (`modulos/stock.html`). Lo que cambió y qué hay que reflejar en la documentación:

1. **"Producto terminado" ya no manda a la gestión de Producción.** Desde esta rama, el botón de la elección de Stock abre una vista NUEVA del propio módulo, `#vista-terminado` (`abrirTerminado()`). `?vista=terminado` la abre derecho y queda en la dirección (recargar vuelve ahí). Quien solo tiene Producción (sin tareas de insumos) entra derecho a esta vista, sin pestañas. El "‹ Volver" vuelve a la elección; "Insumos y materias primas" vuelve a la vista de insumos con la que se entró (`elegirInsumos()`). Abajo de la vista queda un link "Producción › Stock terminado" (`produccion-gestion.html?vista=stock&desde=stock`) para cargar un ingreso o ver las salidas entre fábricas, que siguen viviendo en la gestión de Producción.
2. **La vista**, como el selector de productos de la Carga de retiros pero más chica: una línea por fábrica + presentación + cono ("Caja con cono · ASPEN ×320 ····· 45 cajas"), agrupadas por producto con su total, buscador arriba, sin lotes a la vista. Al tocar una línea: sus lotes con cajas (lo negativo en rojo) y sus movimientos (el `ajuste` muestra su motivo, que la base guarda en `stock_terminado_movimientos.motivo`).
3. **"Corregir stock"** (por lote) y **"+ Otro lote"** (por línea), solo con `stock:ajustar_inventario` con alcance en esa fábrica. Una sola llamada a la función que ya estaba en la base: `ajustar_stock_terminado(p_unidad_negocio_id, p_presentacion_id, p_marca_id, p_lote, p_cajas, p_motivo_tipo, p_motivo) → uuid`.
4. **Nada cambió en la base**, ni tareas, ni permisos, ni catálogo.

Qué tocar en la documentación:
- `docs/memoria/stock.md`: el subagente YA agregó la entrada "PRODUCTO TERMINADO EN STOCK (23/10/2026…)" debajo de "INGRESO DE PRODUCTO TERMINADO". Falta, si la rama se integra, corregir la entrada **"DOS ENTRADAS (14/10/2026…)"** de ese archivo: hoy dice que "Producto terminado" es un link a la gestión y que `?vista=terminado` "va derecho a la gestión"; ahora abre `#vista-terminado` de Stock.
- `docs/memoria/produccion.md`, la entrada **"DESDE STOCK (14/10/2026…)"**: dice "(lo abre 'Producto terminado' de Stock)". Ahora la gestión se abre desde el link "Producción › Stock terminado" de la vista de producto terminado de Stock (sigue con `&desde=stock`, así que el "‹ Stock" de la gestión sigue igual y vuelve a Stock).
- `docs/memoria/pruebas-y-ensayo.md` (si lista suites): `test-stock-terminado.js` / `mut-stock-terminado.js`, `e2e/53-stock-terminado.spec.js` y la maqueta `stock-terminado`.
- Hueco de base para anotar (ver abajo): `ajustar_stock_terminado` sin clave de idempotencia.

## Qué se hizo

- `modulos/stock.html`:
  - HTML: `#btn-entrada-terminado` pasó de `<a href="produccion-gestion.html…">` a `<button>`; vista nueva `#vista-terminado` (buscador `#buscador-terminado`, avisos `#ptm-incompleto` y `#ptm-error`, lista `#ptm-lista`, estado `#ptm-estado`, link `#ptm-link-gestion`).
  - CSS `.ptm-*`: líneas de 13 px y 40 px de alto, lotes de 34 px, historial de 12 px; lo negativo `--rojo-oscuro` y el lote negativo con fondo `--rojo-suave`; `#vista-terminado { max-width: 52rem }` en la compu; en el celular, los campos en 16 px (si no, el celular agranda la pantalla). Sin ancho fijo: a 360 px no hay scroll de costado.
  - JS, sección "PRODUCTO TERMINADO — el stock de cajas (23/10/2026)": `lineasTerminado` (suma el libro por fábrica + presentación + cono + lote), `armarTerminado` (filtra por la barra y el buscador, agrupa y ordena), los `html*Terminado` (todo texto de la base con `esc()`), `pintarTerminado` / `pintarFormTerminado` (el formulario se repinta sin redibujar la lista, para no sacar el foco), `guardarAjusteTerminado` (una llamada, error de la base tal cual, relee después), `cargarTerminado` (paginado de a 1000, tope 20 páginas, sin la fábrica de pruebas).
  - `init()`: con solo producto terminado abre la vista y termina (sin cargar nada de insumos); con `?vista=terminado` y también insumos, abre el terminado y carga los insumos abajo. `vistaDesdeUrl` deja `?vista=terminado` en la dirección. `mostrarVista` conoce `terminado` (y pone `body.stock-en-terminado`, que esconde las pestañas). El refresco solo relee el terminado si está a la vista y no lo hace con una corrección abierta; cambiar la barra lo repinta.
- Pruebas: `pruebas/test-stock-terminado.js` (nueva, 133) y `pruebas/mut-stock-terminado.js` (nueva, 73/73 + 19 equivalentes declaradas: números, fechas de dígitos, constantes y las claves de uuid); `test-stock-entrada.js` / `mut-stock-entrada.js` puestas al día (61; 37/37); `test-stock-xss.js` con las entradas de los `html*Terminado` en su lista de seguras (cada una con su motivo); `e2e/53-stock-terminado.spec.js` (nuevo) y `e2e/39-stock-entrada.spec.js` actualizado.
- Maqueta: `pruebas/datos-maqueta/stock-terminado.js` → `e2e/maqueta/datos/stock-terminado.json` (varios productos, con y sin cono, lotes negativos, una línea en cero, ajustes con motivo y movimientos de la fábrica de pruebas que no se ven).

## Lo que se verificó en la base (23/10/2026, solo lectura)

- `pg_get_functiondef(ajustar_stock_terminado)`: firma `(uuid, uuid, uuid, text, integer, text, text) → uuid`, SECURITY DEFINER, `search_path = public`; `authenticated` puede ejecutarla, `anon` no (`has_function_privilege`). Exige `tiene_tarea_alcance('stock','ajustar_inventario', p_unidad_negocio_id)`; `p_cajas` ≠ 0 (con signo); `p_motivo_tipo` ∈ faltante_recuento / sobrante_recuento / aparecio_otro_lado / correccion_carga / carga_inicial; `p_motivo` de 3 letras o más; lote obligatorio, `upper(btrim(...))`, hasta 40; la presentación tiene que ser de esa fábrica; el cono tiene que existir. Inserta en `stock_terminado_movimientos` un `tipo = 'ajuste'` con `motivo = '<Etiqueta del tipo>: <motivo>'`, `unidades = cajas × unidades_por_caja`, `fecha = _cobranza_hoy_ar()`.
- `stock_terminado_movimientos`: columnas (`information_schema`), CHECK de `tipo` (produccion, inventario_inicial, ajuste, despacho, traspaso_salida, traspaso_entrada, ingreso_externo, devolucion), `stock_terminado_movimientos_tipo_reglas` (el ajuste exige motivo de 3 letras), policy de lectura "stock terminado: leer" = `_ve_produccion_en(unidad) OR tiene_tarea_alcance('stock','ver', unidad)`. 299 filas ese día; **todos los lotes ya están en mayúsculas y sin espacios** (consulta: ninguno distinto de `upper(btrim(lote))`), así que pasar el lote existente a la RPC (que lo pasa a mayúsculas) cae en el mismo lote.
- Policies de lectura de `productos_terminados`, `producto_presentaciones` y `marcas_personalizadas`: se leen con Producción o `stock:ver` (y Pedidos / Retiros).
- `tiene_tarea_alcance`: super_admin, o la tarea habilitada con `alcance.todas = true` o la unidad en `alcance.unidades` (lo mismo que `puedeTareaEn` del módulo).
- No hay ninguna vista con el saldo de producto terminado hecho (solo `v_salidas_entre_fabricas`): el saldo se suma en la pantalla, paginado.

## Decidido sin consultar

1. **La vista vive en Stock y no en la gestión de Producción.** El pedido dice `modulos/stock.html`, pero la vista de stock terminado que había era la de `produccion-gestion.html` (territorio de Producción, que este subagente no toca). Se hizo una vista nueva en Stock y el botón "Producto terminado" ahora la abre; la gestión queda a un link de distancia para lo que solo está ahí (cargar ingreso, salidas entre fábricas, "lo que salió por retiros" con el código de la orden, reventa). Si Facu prefería que se rehiciera la de la gestión, eso es un pedido para el subagente de Producción.
2. **El nombre del producto va en el encabezado del grupo y no se repite en cada línea** ("Cucuruchón Mini" arriba; la línea dice "Caja con cono · ASPEN ×320"). El ejemplo del pedido traía el producto en la línea, pero con el agrupado por producto repetirlo es leer de más. El nombre entero queda en el `title` de la línea, y el buscador busca por producto.
3. **"×320" son las unidades por caja** (`producto_presentaciones.unidades_por_caja`), y no se agrega si el nombre de la presentación ya trae ese número ("Caja x 600", "Caja ×1800").
4. **Lo negativo en rojo** con `--rojo-oscuro` (el número) y `--rojo-suave` (el fondo del lote), como pidió Facu; el resto del módulo usa bordó para los saldos negativos de insumos.
5. **Sumar / Restar arranca sin elegir**: hay que elegir uno (si no, "Falta: elegir Sumar o Restar"). Así nadie resta sin querer.
6. **Sin buscar, solo las líneas con algún lote distinto de cero**; buscando, también las que quedaron en cero (en gris, "sin stock"), para poder corregirlas. Dentro de una línea, solo los lotes con cajas.
7. **El historial muestra el motivo solo en los `ajuste`** (como pidió el pedido); los traspasos y los ingresos también tienen motivo en la base y no se muestran.
8. El link a la gestión va siempre con `&desde=stock` (volver a Stock ahora cae en la vista de producto terminado de acá, así que no rebota).

## Hueco de base (para el chat de la base)

- **`ajustar_stock_terminado` no tiene clave de idempotencia.** Si se corta la red justo después de guardar y la persona reintenta, la corrección entra dos veces. La pantalla, ante un error sin mensaje, dice: "No se pudo guardar la corrección (¿se cortó la conexión?). Antes de volver a guardar, tocá Actualizar y mirá si la corrección ya figura: la base no frena una corrección repetida." Lo que haría falta: un `p_client_uuid` (como `traspasar_producto_terminado`) que devuelva el mismo id en el reintento.
- Para "+ Otro lote" de un producto que **nunca tuvo movimientos** no hay línea donde tocar (las líneas salen del libro). Para eso sigue la carga de ingreso de la gestión, o haría falta listar el catálogo entero de presentaciones × conos (pedido aparte).

## Lo que no se pudo probar

- Nada con sesión real ni contra la base real: la llamada a `ajustar_stock_terminado` se probó con el supabase falso (suite) y con la maqueta (navegador). La firma y las reglas salen de leer la función el 23/10/2026.
- No se probó con un libro de más de 20.000 movimientos reales (sí con 20.000 de mentira: dice "puede estar incompleto").

## Números

- `node pruebas/test-stock-terminado.js`: 133/133. `node pruebas/mut-stock-terminado.js`: 73/73 (+19 equivalentes).
- `node pruebas/test-stock-entrada.js`: 61/61. `node pruebas/mut-stock-entrada.js`: 37/37.
- `test-stock-xss.js` 238/238, `test-stock-pendientes.js` 70/70, `controles-stock.js` verde.
- e2e (maqueta, puertos 4230/4231): `53-stock-terminado` (360, 390, 768x1024, 1280 y la recarga) y `39-stock-entrada` (1280, 390, 360): 14/14.
- `node pruebas/check-scripts.js` y `node pruebas/check-bytes.js`: verde. `npm run pruebas`: 270/270 en verde (887 s).

## Guion para Facu (cuando se integre)

1. Entrá a Stock y tocá "Producto terminado".
2. Mirá que cada producto tenga sus líneas (presentación y cono) con las cajas a la derecha, y que no se vean lotes.
3. Escribí "aspen" (o un cono que tengas) en el buscador: quedan solo esas líneas.
4. Tocá una línea: aparecen sus lotes; los negativos en rojo. Tocá "Movimientos": los ajustes dicen por qué.
5. Si tenés el permiso de ajustar inventario: "Corregir stock" en un lote → Restar → 1 caja → "Faltante en el recuento" → un motivo → Guardar. Tiene que decir "Listo: se restó 1 caja del lote …" y el número del lote bajar en 1. (Hacelo en un lote de prueba o corregilo de vuelta con Sumar.)

## Qué automatizaría ahora

- **La tarea repetida más cara de esta parte fue mantener a mano la lista de "seguras" de `test-stock-xss.js` y las "equivalentes" de cada `mut-*.js`** para cada render nuevo (13 entradas acá, todas "HTML armado más arriba" o "es un número"). Se puede sacar: que el chequeo estático reconozca solo una variable local cuyo valor es una plantilla con HTML propio ya revisada en la misma función (hoy hay que declararla), y que el runner de mutaciones marque solo como equivalentes los `esc()` cuyo argumento es un `.length`, un `formatearNumeroAr(...)`/`textoCajas…(número)` o una constante en MAYÚSCULAS. Eso ahorraría la mitad del trabajo de cada render nuevo en todos los módulos.
- Un generador de datos de maqueta para el libro de producto terminado (`mov(...)` de `stock-terminado.js`) compartido con las suites de Producción y Retiros, que hoy arman sus propios movimientos.
