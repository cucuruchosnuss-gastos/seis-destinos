# Traspaso — Stock, noche del 21/09/2026, Parte 15: barrido completo de XSS

**Para:** el chat de arquitectura (dueño de CLAUDE.md).
**De:** el chat del módulo Stock.
**Estado:** trabajo hecho en el working copy, SIN commit ni push (lo pidió así quien lanzó la tarea). Supabase se usó solo para leer.

## Qué se hizo

Barrido de escapado de `modulos/stock.html` sobre el **archivo entero**, con el mismo método que el de Ingreso (`afe4217`): renders EJECUTADOS con un document falso y una marca distinta por campo, más un chequeo estático sobre TODO el `<script>`. Hasta hoy el módulo tenía su `esc()` desde que nació, pero nadie había verificado que estuviera en todos los sinks.

### Números del `<script>`

- **414** interpolaciones `${...}` en total; **324** caen en una plantilla que arma HTML. Además hay **87** asignaciones a `innerHTML` (ningún `insertAdjacentHTML`, `outerHTML`, `document.write` ni `innerHTML +=`; la suite lo verifica).
- Contra `afe4217` el chequeo estático nombra **6 hojas sin escapar ni justificar**, en 3 funciones. De esas, **1 era un sink real y alcanzable**; las otras 5 **no eran alcanzables con datos de la base** (uuid o columna con CHECK) y se cerraron igual, porque la función que las dibuja no puede saber de dónde viene el dato. Las 6 están cerradas.
- El módulo estaba **mucho más limpio que Ingreso**: el resto de las 324 interpolaciones ya iba escapado o es número/constante/HTML armado con `esc()`.

### Sinks cerrados (campo — función)

1. **SINK REAL: la unidad de medida en el selector de vista preferida — `poblarSelectorVista`.** `nombreDeUnidadMedida()` traduce `kg`/`lt`/`un` y **devuelve cualquier otra unidad TAL CUAL**, y eso entraba crudo a `<option>…(${nom})</option>`. `insumos.unidad_medida` es texto libre **sin CHECK** (verificado contra `pg_constraint` y `information_schema` el 22/09/2026), y un insumo creado al vuelo desde Ingreso con `materia_prima:cargar` la trae como la tipeó quien cargaba. Se dibuja al abrir el modal de edición de ese insumo, que abre quien tiene `stock:gestionar_catalogo`. Ahora `${esc(nom)}`.
2. **`data-insumo` de la tarjeta del catálogo — `renderizarLista`** (endurecimiento): `insumos.id` es uuid, así que no era alcanzable; se escapa por consistencia con `data-stock`, que ya lo hacía.
3. **La clase `chip-tipo--${tipo}` y su texto, en el catálogo — `renderizarLista`** (endurecimiento): `insumos.tipo` tiene CHECK (`insumos_tipo_check`: `materia_prima` / `insumo`). Queda `chip-tipo--${esc(i.tipo)}` y `${esc(TIPOS[i.tipo] ?? i.tipo)}` (antes el lookup en `TIPOS` iba crudo y solo el fallback escapado).
4. **Lo mismo en el listado de stock — `renderizarStock`** (endurecimiento): `v_stock_insumos.tipo` sale de `insumos.tipo`.

Ninguno de los cuatro escapa dos veces: `TIPOS` son literales sin caracteres escapables.

### Lo que se descartó midiendo (verificado contra la base el 22/09/2026)

- `v_recuentos.items` y `con_diferencia`, `v_transferencias.items` e `items_con_diferencia`, `v_stock_en_transito.items`: **bigint**. `v_stock_en_transito.dias_en_transito`: **integer**.
- `v_stock_por_lote.desde`, `v_mermas.fecha` / `mes`, `v_stock_en_transito.fecha`, `v_transferencias.fecha`: **date**; igual van por `esc()`.
- `stock_recuentos.estado` (CHECK de 3) y `stock_transferencias.estado` (CHECK de 4): las clases salen de `BADGE_RECUENTO` / `BADGE_TRANSF` o caen a `''`.
- `insumos.categoria` tiene CHECK de 11 valores; igual `htmlAgrupado` la escapa.
- Los errores que devuelve `importar_insumos_excel` (nombre, marca, motivo del Excel) ya iban escapados; la vista previa del Excel usa `textContent`.
- Los mensajes de error de las RPCs van por `mostrarError`, que usa `textContent` (verificado en `js/utils.js`, y la suite lo controla). `confirm()` y `textContent` no son sink.

## Suites (nuevas, en `pruebas/`)

- **`pruebas/test-stock-xss.js`** — **234/234 verde**; contra `git show afe4217:modulos/stock.html` da **228/234 ROJO** (la unidad del selector de vista y el `data-insumo` con la marca cruda, más el estático nombrando las 6 hojas con línea y función).
  - Ejecuta los renders con **54 chequeos de marcas** y datos que imitan la base: catálogo (datalist de unidades, chips, listado agrupado, detalle, selector de vista, selector de categoría, errores del Excel), stock (chips de unidad, listado agrupado, detalle por lote: título y tabla), recuento abierto (chips, cabecera, filtros, renglones, buscador de catálogo, presentaciones al agregar, resumen de diferencias antes de cerrar), historial (chips, lista, cabecera anulado y cerrado, aviso del anulado, detalle, ajustes del cierre y posteriores), alias (lista, modal de corrección, confirmación de borrado, buscador), movimiento (vínculo con el recuento, chips de unidad, motivos, buscador, insumo elegido, lotes, presentaciones, saldo), mermas (chips de unidad y origen, tablero con un origen desconocido), transferencias (chips de origen y destino, renglones a enviar, buscador, insumo elegido, lotes, presentaciones, saldo, sin saldo en el origen, en tránsito, historial, cabecera, aviso de rechazo, renglones del detalle).
  - Las funciones del sandbox se juntan por **clausura** desde los renders, así corre el código real de cada helper; `estado` es el objeto real del archivo.
  - **Chequeo estático** sobre todo el `<script>`, con la lista de seguras **POR FUNCIÓN** (y una variante con regex para las dos asignaciones de `htmlAgrupado(..., callback)`, cuyo texto completo no tiene sentido copiar). Una entrada sin usar es rojo.
  - Cubre los dos puntos ciegos que contó el traspaso de Ingreso (expresión ENTERA de cada asignación a `innerHTML`; plantillas sin `<` propio devueltas por una flecha) **y un tercero** (ver abajo), con un control del control: dos asignaciones inventadas donde el chequeo TIENE que encontrar la hoja cruda.
  - Contexto: ninguna interpolación sin comillas, en `on*=`, en `style`, ni en `href`/`src` sin `encodeURIComponent()`.
- **`pruebas/mut-stock-xss.js`** — **178/178 detectadas (+4 equivalentes, aparte)**. Automáticas: cada `${esc(...)}` de 49 funciones de render (incluidas las anidadas). A mano: los cuatro cambios de este barrido y los siete `esc()` que no están al principio de su interpolación (ternarios, la concatenación del título del detalle por lote, `' · lote ' + esc(...)`, el `.map(esc)` de la meta de mermas). Equivalentes: los `esc()` de `poblarSelectorMotivoTipo` y `renderizarChipsOrigenMerma`, que escapan constantes del código (igual dan rojo por el estático).

Corridas al cerrar (22/09/2026): `check-scripts` OK en todos los HTML; **todas** las `test-*.js` en verde (stock: numeros 112/112, recuento 33/33, xss 234/234; el resto sin cambios: materia-prima xss 165/165, cobranzas xss 323/323, css-hidden 322/322, etc.); `controles-cobranzas` 354/354; `mut-stock-xss` 178/178 (+4 eq.), `mut-stock-numeros` 46/46, `mut-stock-recuento` 15/15, corridas de a una, cada una con su suite verde sobre el limpio. Los tres archivos tocados están en LF (0 CR).

## Para CLAUDE.md

1. **Aprendizajes clave → la regla del escapado**, renglón *"PENDIENTE — el mismo barrido propio en `materia-prima.html` y `stock.html`"*: stock queda **HECHO** (22/09/2026), con los números de arriba. Si el traspaso de Ingreso ya sacó a materia-prima, el renglón entero se cierra.
2. **Sección "Módulos → 7. Stock"**: agregar el barrido (un sink real, `poblarSelectorVista`, más tres endurecimientos) y las dos suites.
3. **Misma regla, "Cómo se verifica" — un TERCER punto ciego del método**, además de los dos que contó Ingreso: una plantilla **sin `<` propio que es una HOJA directa** de una asignación a `innerHTML` (`x.innerHTML = cond ? \`${dato}\` : ''`). `clasificar()` la da por buena como "plantilla anidada, se verifica aparte", pero el escáner NO marca sus interpolaciones "en HTML", así que en realidad no la verifica nadie. En stock hoy no hay ninguna (el chequeo nuevo corre y da cero), pero el hueco es del método. `test-stock-xss.js` la cubre en `plantillasSinHtml()`.
4. **`pruebas/` en "Qué hay hoy"** y **`pruebas/README.md`** (no lo toqué: no es territorio de stock): sumar `test-stock-xss.js` / `mut-stock-xss.js` con sus números.
5. **Bug del andamio, fuera de mi territorio — `pruebas/test-materia-prima-xss.js`, función `clausura()`:** el regex de constantes es `/\n {4}const ([A-Za-z_$][\w$]*) = /`, con UN solo espacio antes del `=`. En stock hay constantes alineadas (`const puedeAjustar   = () => …`) y con ese regex **no entraban al sandbox**: el render tiraba `ReferenceError` recién al ejecutar. En la suite de stock se corrigió localmente (`\s*=`). Conviene revisar si en materia-prima.html hay alguna constante alineada así que la suite de Ingreso se esté perdiendo sin avisar (hoy está verde, así que si la hay, no la usa ningún render ejecutado).
6. **Recordatorio que ya está en el traspaso de Ingreso y vale igual acá:** `posicionesDeValor()` de `pruebas/clasificar.js` desenvuelve mal un `(a ?? []).map(…) || '…'`; la suite de stock usa su propia `hojas()`, igual que la de Ingreso.

No hace falta ninguna tarea ni permiso nuevo; ninguna RPC cambió.
