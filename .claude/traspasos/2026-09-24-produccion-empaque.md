# Traspaso — Producción: producir descuenta el EMPAQUE (24/09/2026)

Prompt para el chat de arquitectura. Autocontenido: quien lo lee no vio nada del trabajo.

## Qué pasó, en una línea

`modulos/produccion.html` ahora deja elegir **la caja y el embolsado** de cada renglón de lo producido, **dice lo que va a consumir** (caja, planchas, separadores, bolsas), lo **muestra después** en la planilla y en el historial (con el **empaque consumido** del turno), deja **configurar** el empaque de cada presentación y la **doble bolsa** de los conos, y **avisa si el stock no alcanza** sin impedir la carga. **La pantalla no descuenta nada ni escribe en el stock**: lo hace la base (`registrar_produccion_item` → `_descontar_empaque`).

**Cero SQL corrido** (Supabase en solo lectura). **Ninguna tarea ni permiso nuevo.** Ninguna RPC cambió de firma por este trabajo: la base ya estaba lista (la preparó el chat de arquitectura).

## Los cuatro commits

| Parte | Hash | Qué |
|---|---|---|
| 1 | `b112134` | Elegir la caja y el embolsado al cargar lo producido |
| 2 | `20f3e83` | La caja y el embolsado de cada renglón, y el empaque consumido del turno |
| 3 | `e7bea21` | Configurar el empaque de cada presentación y la doble bolsa de los conos |
| 4 | (el commit que trae este archivo) | Avisos de stock del empaque |

## Lo que se verificó contra la base ANTES de escribir código (24/09/2026, solo lectura)

- `pg_get_functiondef` de `registrar_produccion_item`, `_descontar_empaque`, `guardar_empaque_presentacion`, `marcar_doble_bolsa` y `tiene_tarea_alcance`: coinciden con lo que describía el encargo. En particular:
  - `registrar_produccion_item(p_turno_id, p_presentacion_id, p_marca_id, p_cajas integer, p_caja_insumo_id uuid DEFAULT null, p_embolsado text DEFAULT null)` → `{produccion_item_id, sublote, orden, unidades, embolsado}`. Rechaza una caja no habilitada **solo si la presentación tiene alguna**. Embolsado: el que viene → el sugerido de la caja → `'ninguno'`; un cono con `doble_bolsa` lo fuerza a `'doble'`.
  - `_descontar_empaque(item, delta)`: la caja misma por `−cajas` (1 caja de cartón por caja producida, también en media caja) y cada renglón de `presentacion_empaque` (`siempre`; `bolsa_grande` si embolsado ∈ grande/doble; `bolsa_individual` si ∈ individual/doble) por `−cantidad × cajas`. Con delta negativo, `ajuste` positivo con motivo "Empaque devuelto del sublote X" y `motivo_tipo = 'correccion_carga'`. Sin lote.
  - `cerrar_turno` sí lee `caja_insumo_id` y `embolsado` en cada renglón de `p_productos` (verificado con `position(...)` en su cuerpo), y ahí **no** valida que la caja esté habilitada.
  - `tiene_tarea_alcance`: una fila con `alcance` null **no** alcanza (hace falta `todas` o la unidad en `unidades`). La pantalla replica eso.
- `v_stock_insumos`: 15 columnas (incluye `insumo_id`, `unidad_negocio_id`, `cantidad_total`), `security_invoker=true`, **una fila por (insumo, unidad)** (32 filas, 32 pares).
- Datos: las presentaciones de Cucuruchos admiten Caja N°1 Nuss (grande), Dolce Pasta (individual) y Sin impresión (grande); la media caja lleva 0,5 Tiras x4, 1 Separador N°1, 1 Bolsa 100x80 (bolsa grande) y 8 o 10 Bolsa PPP (bolsa individual).

## Qué hace la pantalla ahora (para la sección "10. Producción" de CLAUDE.md)

**Parte 1 — la caja al cargar lo producido.** El agregar-producto pasó de 5 a **6 pasos**: Producto → Con/sin cono → Presentación → Cono → **Caja** → Cajas (sin cono, 5).
- Solo se ofrecen las cajas **habilitadas** para esa presentación (`presentacion_cajas`), con nombre y marca. Viene puesta la `caja_predeterminada_id` de la unidad si está habilitada; si no, la única habilitada; si no, **ninguna y hay que elegir** (y ahí el flujo va al paso de la caja).
- **Cuando la caja vino puesta, el paso se saltea**: figura hecho en la columna de pasos ("Caja N°1 Nuss · bolsa grande") y al lado de las cajas hay un botón con la caja elegida y **"Cambiar"**. Lo más usado viene predeterminado, lo raro a un toque.
- Presentación **sin cajas configuradas**: lo dice en bordó ("Esta presentación no tiene cajas configuradas: no se va a descontar la caja") y sigue sin caja.
- El **embolsado** (Bolsa grande / Bolsitas individuales / Las dos, y **"Sin bolsa" solo si la caja sugiere `ninguno`**) viene de la caja y **cambia con ella**. Un cono con `doble_bolsa` lo fuerza a "Las dos": las otras opciones quedan deshabilitadas, se explica ("Este cono va con doble bolsa…") y la función que elige tampoco acepta bajarlo.
- **Lo que va a consumir**, con la MISMA regla que `_descontar_empaque`: "Por caja: …" en el paso de la caja y "10 cajas = 10 Caja N°1 Nuss · 10 Tiras x4 · 30 Separador N°1 · 10 Bolsa 100x80" en vivo al lado de las cajas (hasta 3 decimales: "0,5").
- `registrar_produccion_item` recibe siempre `p_caja_insumo_id` y `p_embolsado` (el **efectivo**: con cono de doble bolsa, `'doble'`).
- El catálogo de la planilla (`leerCatalogoProductos`) lee además `presentacion_cajas`, `presentacion_empaque`, los `insumos` de esas dos, `unidades_negocio.caja_predeterminada_id` (de la unidad de la tablet) y `marcas_personalizadas.doble_bolsa`. **Si el empaque no se puede leer, el catálogo entero falla y no se puede agregar**: agregar sin la caja la dejaría sin descontar en silencio.
- **`cerrar_turno`: ningún camino de la pantalla arma renglones de `p_productos`** (el cierre manda `[]` desde el rediseño de la parte 3: lo producido se carga con `registrar_produccion_item`). Por eso no hubo dónde agregar `caja_insumo_id`/`embolsado`; la suite afirma que sigue yendo `[]`. Si algún día se arman renglones ahí, **la base no valida la caja habilitada en ese camino**.

**Parte 2 — verlo después.**
- Cada renglón de lo producido (planilla e historial) dice su caja y su embolsado ("bolsa grande", "bolsitas individuales", "doble bolsa", "sin bolsa"). Un renglón anterior al empaque (los dos en null) no dice nada. El nombre de la caja se lee **aparte, por id**: una caja que después se deshabilitó sigue nombrándose.
- En el detalle del turno del historial, **"Empaque consumido"**: `stock_movimientos` con `produccion_item_id` de los sublotes del turno, sumado por insumo y **neto** (lo devuelto al corregir o anular se resta solo), mostrado como `−suma`. Un insumo que quedó en cero no se lista; si todo se devolvió, lo dice; sin movimientos, "No se descontó empaque en este turno"; con 1000 movimientos, avisa que puede estar incompleto.
- **`stock_movimientos` se lee con `stock:ver` en la unidad del TURNO** (su RLS). La pantalla ahora carga esa tarea (`cargarPermisoStock()`, una consulta aparte a `empleado_tareas` con `modulo='stock'`, `tarea='ver'`, que **no** voltea la entrada si falla) y la resuelve con `puedeVerStockEn(unidad)`, la misma regla que `tiene_tarea_alcance`. **Sin el permiso no se consulta el libro** y se dice "No se puede ver el stock con este usuario" (una respuesta vacía por RLS se leería como "no se descontó nada"). Si no se pudo leer el permiso, se dice que no se sabe.

**Parte 3 — Configuración → Empaque** (con `produccion:configurar`, pestaña nueva entre Productos y Marcas / Conos).
- Por presentación, agrupadas por producto (los de chocolate abajo): las **cajas habilitadas** con su embolsado sugerido (se agregan de los insumos **activos** del rubro `Cajas` que no estén, y se quitan) y los **renglones** (insumo con un buscador `<datalist>` sobre los insumos activos, cantidad con `enlazarCampoNumero` a 3 decimales, condición siempre / solo con bolsa grande / solo con bolsa individual).
- Se edita en un **borrador por presentación** (la tarjeta se marca "sin guardar") y se guarda con **UNA llamada** a `guardar_empaque_presentacion` con las dos listas. El error de la base va tal cual, pegado al botón de esa presentación. Cantidad vacía o ≤ 0 y el mismo insumo dos veces con la misma condición (el UNIQUE de la tabla) se frenan antes de mandar.
- **Aviso bordó en las presentaciones activas** sin caja y/o sin renglones ("Produce sin descontar la caja / el empaque / la caja ni el empaque"), mirando lo **guardado**, que es con lo que produce la base. Una inactiva no avisa.
- En **Marcas / Conos**, un tilde **"Doble bolsa"** por cono del catálogo (`marcar_doble_bolsa`, se guarda en el acto), con la explicación de que es para los que van al norte por la humedad.

**Parte 4 — avisos de stock.**
- Al abrir "Agregar producto" se lee **una vez** `v_stock_insumos` (`insumo_id, cantidad_total`) de la unidad, para los insumos de empaque del catálogo. Con `stock:ver`, un insumo sin fila es un **cero de verdad** (la vista trae solo saldo ≠ 0).
- Si alguno no alcanza para lo que se va a cargar (las cajas escritas, o 1 si todavía no hay número), aviso bordó por insumo: **"Faltan 12 Separador N°1: hay 18, se necesitan 30"** ("Falta" hasta 1), más **"Se puede cargar igual."**. **No bloquea**: el botón de agregar sigue andando.
- Sin `stock:ver`: "No se puede ver el stock con este usuario" y **no se consulta**. Si falla la lectura: "No se pudo leer el stock". Nunca un cero inventado.
- Al lado de las cajas, **con faltantes el aviso reemplaza a la línea del consumo** (las dos juntas no entran en la columna a 1280×800; lo que consume una caja se sigue viendo en el paso de la caja).

## Decisiones tomadas sin preguntar

1. **La caja que viene puesta saltea su paso** (se cambia con "Cambiar"). Solo se para en el paso de la caja cuando hay que elegir.
2. **Cambiar la caja siempre trae el embolsado que ELLA sugiere**, aunque se haya tocado a mano: el embolsado es de la caja. Es la regla más simple que no deja un embolsado "de otra caja".
3. **Tocar una caja en su paso no avanza**: hay un botón "Seguir con las cajas", para poder cambiar también el embolsado sin volver.
4. **El embolsado viaja siempre explícito** (el efectivo), nunca null. Sin cajas configuradas va `'ninguno'` (igual que haría la base) y se ofrece "Sin bolsa".
5. **Si el empaque no se puede leer, no se puede agregar** (el catálogo falla entero), en vez de agregar sin caja.
6. **`stock:ver` se lee con una consulta aparte y no fatal**, sin tocar `cargarPermisos()` (que sigue leyendo solo `produccion`). `estado.stockVer`: `undefined` = no se sabe, `null` = no la tiene, si no su alcance.
7. **Empaque consumido**: neto, sin los que quedaron en cero; el permiso se mira contra la unidad del turno, no la de la tablet.
8. **Configuración**: borrador y guardado **por presentación**; buscador de insumos con `<datalist>` (la pestaña es de oficina y así no se redibuja nada mientras se escribe); caja nueva arranca sugiriendo `grande` (el default de la tabla); se muestran también las presentaciones inactivas (atenuadas, sin aviso).
9. **Cambiar de pestaña o de unidad con un borrador de empaque sin guardar NO pregunta** (solo la tarjeta dice "sin guardar"): el aviso de salida existente es de Personal y no lo toqué. Si molesta, es sumar el borrador de empaque a `cambiosSinGuardar()`.
10. **El tilde de doble bolsa está solo en el catálogo**, no en los pendientes de revisar.
11. **Stock**: una sola lectura al abrir Agregar (no en cada tecla); la cantidad para el aviso es la escrita o 1; un saldo negativo se muestra tal cual.

## Lo que NO se pudo probar

- **Nada con sesión en un navegador real ni contra la base**: ninguna RPC se ejecutó (solo lectura); todas las suites corren contra un doble de supabase.
- Lo único mirado renderizado: una **foto estática** de "Agregar producto" (CSS y HTML reales + renders del sandbox) a **1280×800**: la pantalla de las cajas con cuatro faltantes a la vez (el peor caso) termina en 782 px y el paso de la caja en 759 px, sin desborde horizontal. **No** se miró renderizada la pestaña Empaque de Configuración, ni el historial, ni a 800×1280 ni a 390 px.
- El `<datalist>` del buscador de insumos en la compu real.
- Que la tablet, con su cuenta real, tenga o no `stock:ver`: hoy solo los dos super_admin tienen tareas de producción; **una cuenta de tablet con solo `produccion:cargar` va a ver "No se puede ver el stock con este usuario"** en los avisos y en el empaque consumido. Si se quiere que los vea, es otorgarle `stock:ver` con alcance en su unidad (decisión de Facu y del chat de permisos; no hace falta ninguna tarea nueva).

## Números al cerrar

- `node pruebas/check-scripts.js`: OK.
- Suites: **58 de 58 verdes** (`for f in pruebas/test-*.js`). De Producción: `test-produccion-empaque` **247/247** (nueva), cierre 250/250, config 208/208, historial 122/122, abrir 162/162, acceso 26/26, masa 217/217, pin 144/144, quien 129/129, xss 6/6, `test-accesos-produccion` 20/20, `test-dashboard-produccion` 27/27.
- Mutaciones (todos los runners de Producción, en secuencia, nunca dos a la vez): `mut-produccion-empaque` **146/146 (+14 equivalentes)** (nueva); cierre 157/157 (+34 eq.), config 182/182 (+8 eq.), historial 104/104 (+13 eq.), abrir 92/92 (+2), acceso 13/13, masa 123/123 (+10), pin 71/71 (+2), quien 57/57 (+2).
- Controles: produccion 1541/1541, stock 988/988, pedidos 315/315, cobranzas 327/327, cheques 181/181.
- Suites tocadas además de la nueva: `sandbox-produccion.js` (funciones nuevas), `seguras-produccion.js` (tres helpers que arman HTML escapado), `test-produccion-cierre.js` (6 pasos y el payload con caja y embolsado, por diseño), y las anclas de `mut-produccion-cierre.js` / `mut-produccion-historial.js` (renglones que cambiaron).

## Qué tocar en CLAUDE.md

1. **Sección de tablas "Producción"**: si todavía no está (la base la armó el chat de arquitectura), sumar `produccion_items.caja_insumo_id` / `embolsado`, `unidades_negocio.caja_predeterminada_id`, `presentacion_cajas`, `presentacion_empaque`, `marcas_personalizadas.doble_bolsa`, `stock_movimientos.produccion_item_id`, las RPCs `guardar_empaque_presentacion` y `marcar_doble_bolsa`, la firma nueva de `registrar_produccion_item` y `_descontar_empaque`. Verificarlo contra la base, no contra este archivo.
2. **Módulo "10. Producción"**: un bloque nuevo "EL EMPAQUE" con lo de las cuatro partes de arriba (el paso de la caja que se saltea, el embolsado, la doble bolsa, el consumo mostrado, el empaque consumido neto en el historial, la pestaña Empaque, los avisos de stock que no bloquean) y la regla de `stock:ver`: **sin el permiso la pantalla no consulta el libro ni la vista, y lo dice**.
3. **Suites**: sumar `test-produccion-empaque.js` / `mut-produccion-empaque.js` a la lista de Producción y a "Las suites de verificación viven en pruebas/".
4. **Aprendizajes** (opcional): *"un default de parámetro se come el `undefined` de la prueba"* — al armar un caso con `stockVer: undefined`, el `= {…}` del parámetro lo reemplazaba por el valor por defecto y la prueba medía otra cosa; se usó un centinela. Es de la familia "el test verde que mide otra cosa".

## Guion corto para Facu, en la tablet

1. Entrá a Producción como encargado, abrí la planilla de una máquina y tocá **"Agregar producto"**. Elegí un cucuruchón, con cono, "Caja", y un cono común.
2. Tiene que ir **derecho a las cajas** y, al lado, decir **"Caja N°1 Nuss · bolsa grande"** con **"Cambiar"**. Poné 10 cajas: debajo tiene que decir "10 cajas = 10 Caja N°1 Nuss · 10 Tiras x4 · 30 Separador N°1 · 10 Bolsa 100x80".
3. Tocá **"Cambiar"**: tienen que aparecer las tres Caja N°1. Elegí **Dolce Pasta**: el embolsado pasa a **"Bolsitas individuales"** solo. Tocá "Seguir con las cajas".
4. Volvé al cono y elegí uno marcado con **doble bolsa** (hay que tildarlo antes en Configuración → Marcas / Conos): el embolsado tiene que quedar en **"Las dos"** y las otras opciones apagadas.
5. Agregalo. En la planilla, el renglón tiene que decir la caja y el embolsado. Abrí el turno en el **Historial** (desde la compu): abajo, **"Empaque consumido"** con lo que se descontó.
6. Si el stock de separadores no alcanza, al poner las cajas tiene que aparecer en bordó **"Faltan … Separador N°1: hay …, se necesitan …"** y **"Se puede cargar igual."**, y el botón tiene que seguir andando. Si la cuenta de la tablet no tiene permiso de ver el stock, en vez del faltante tiene que decir **"No se puede ver el stock con este usuario"**.
7. En la compu, Configuración → **Empaque**: cambiá una cantidad de una presentación, tocá **"Guardar empaque"** y verificá que al volver a entrar quedó.
