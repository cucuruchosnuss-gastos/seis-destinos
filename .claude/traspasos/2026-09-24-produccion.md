# Traspaso — Producción: que la configuración no frene la carga, y la burbuja de conos (24/09/2026)

Prompt para el chat de arquitectura. Autocontenido: quien lo lee no vio nada del trabajo.

## Qué cambió, en dos líneas

1. **Si la configuración del empaque no se puede leer, la tablet ya NO frena la carga de lo producido.** El renglón se carga igual, **sin caja**, con un aviso bordó, y queda marcado en bordó en la planilla y en el historial ("Sin empaque descontado: …"). Lo producido entra al stock terminado igual (lo hace la base).
2. **La burbuja de "conos por revisar"** (la misma cifra que la tarjeta del dashboard) aparece también en los dos accesos a Configuración de la pantalla (el botón del inicio de oficina y la entrada del Menú), y tocarlos con pendientes abre Configuración **derecho en "Marcas / Conos"**.

**Solo `modulos/produccion.html` y sus suites.** Cero SQL corrido (Supabase en solo lectura). Ninguna RPC cambió. Ninguna tarea ni permiso nuevo. **No se commiteó** (lo pidió el agente coordinador).

## Lo verificado contra la base (24/09/2026, solo lectura, `pg_get_functiondef` / `information_schema`)

- `registrar_produccion_item(..., p_caja_insumo_id DEFAULT null, p_embolsado DEFAULT null)`: con los dos en null guarda `caja_insumo_id = null` y `embolsado = 'ninguno'` (**o `'doble'` si el cono tiene `doble_bolsa`**), suma el stock terminado y llama a `_descontar_empaque`.
- `_descontar_empaque`: sin caja **no descuenta la caja**; con `'ninguno'` **no descuenta las bolsas** (los renglones `bolsa_grande` / `bolsa_individual` se saltean); **los renglones `siempre` de `presentacion_empaque` (tiras, separadores) SÍ se descuentan**. O sea: "sin caja" no es "sin nada de empaque".
- `corregir_produccion_item(p_item_id, p_cajas, p_motivo)`: **solo cambia el número de cajas, NO la caja ni el embolsado.** No hay RPC que corrija la caja de un sublote ya cargado.
- `anular_produccion_item` devuelve el empaque; volver a cargar crea un sublote NUEVO (otro número), que no sirve si el número ya se selló en la caja.
- `produccion_items.caja_insumo_id` y `embolsado`: nullables y sin default. Datos: **4 renglones, los 4 anteriores al empaque, con los dos en null.** `registrar_produccion_item` y `cerrar_turno` escriben SIEMPRE `embolsado` desde el empaque (`coalesce(..., 'ninguno')` / `case`).
- `agregar_produccion_item` (turno ya cerrado, con `configurar`) **no escribe caja ni embolsado ni llama a `_descontar_empaque`**. La pantalla no la usa.
- `mis_pendientes()` → `TABLE(modulo, clave, cantidad bigint, texto)`; con `tiene_tarea('produccion','configurar')` (sin unidad) devuelve `('produccion','conos_por_revisar', count(marcas_personalizadas en pendiente_revision), 'Conos nuevos por revisar')`.

## Qué hace la pantalla ahora (para CLAUDE.md, módulo 10 "Producción", bloque "EL EMPAQUE")

Reemplazar la línea **"Si el empaque no se puede leer, no se puede agregar producto (el catálogo falla entero)…"** por:

- **Si el empaque no se puede leer, se carga igual, SIN caja.** `leerCatalogoProductos` lee el empaque aparte (`leerEmpaqueCatalogo`): si falla cualquiera de sus cuatro lecturas (`presentacion_cajas`, `presentacion_empaque`, `unidades_negocio.caja_predeterminada_id`, los `insumos` de esas dos), el catálogo vuelve con `empaqueError: true` y las listas vacías — **los productos, las presentaciones y los conos siguen**. Si fallan los productos, las presentaciones o los conos, el catálogo sí se cae (no hay qué elegir).
  - El paso de la caja **se saltea** y figura hecho con "Sin caja · no se pudo leer el empaque"; al lado de las cajas y en el paso de la caja va en bordó: *"No se pudo leer la configuración del empaque: este renglón se carga sin caja, así que no se va a descontar la caja ni las bolsas. Corregilo después: avisale a quien lleva el stock para que las descuente a mano."* No se dibuja consumo ni aviso de stock (no hay qué medir).
  - A `registrar_produccion_item` van **`p_caja_insumo_id` y `p_embolsado` en null**: la base decide el embolsado (con un cono de doble bolsa, `'doble'`, que la pantalla sin empaque no sabría).
  - **La corrección es de stock, a mano**, y por eso el aviso manda a quien lleva el stock: `corregir_produccion_item` no cambia la caja, y anular y volver a cargar cambia el número del sublote ya sellado.
- **La marca del renglón sin caja**, en la planilla (fondo `--bordo-suave`, `pr-producido--sin-caja`) y en el historial (`pr-of-sin-caja`): *"Sin empaque descontado: no se descontó la caja ni las bolsas"* (con embolsado `doble`, solo "la caja", porque las bolsas sí se descontaron).
  - **Criterio (`sinCajaDescontada`)**: `caja_insumo_id` null **y** `embolsado` no null **y** no anulado. Sale del propio renglón, no del catálogo, así que vale igual en el historial y con el catálogo caído. **Los renglones anteriores al empaque (los dos en null) no se marcan**: no es un error, el empaque no existía, y marcarlos llenaría el historial de bordó. **Un anulado tampoco**: su empaque ya se devolvió. **Entra también el de una presentación sin cajas configuradas**: ahí tampoco se descontó la caja, y es verdad decirlo (Configuración → Empaque ya lo avisa aparte).
- **Otros lugares del mismo patrón, arreglados:**
  - `leerPlanilla`: si falla la lectura de los NOMBRES de las cajas de los renglones, la planilla ya no se cae entera; el renglón dice "caja sin nombre".
  - `cargarDatosMasa` (sala de masa): si falla `leerDefineChocolate` (qué ingredientes definen el chocolate), la masa se carga igual y el chip "Chocolate" simplemente no aparece (la base calcula `es_chocolate` sola).
- **La burbuja de conos por revisar.** `cargarBurbujaConos()` llama a `mis_pendientes()` al entrar, al volver a la pestaña (`visibilitychange`) y después de aceptar o rechazar un cono, con un turno para que una respuesta vieja no pise la nueva; toma solo la fila `('produccion','conos_por_revisar')`. Solo con `produccion:configurar` (sin la tarea ni se llama). Se dibuja en `#pr-btn-ir-config` y en `#pr-menu-config` (clase local `.pr-burbuja`, la receta de `.tarjeta-modulo__burbuja` pero en línea; "99+" arriba de 99), con `title` / `aria-label` "N conos nuevos por revisar" (singular con 1) y el botón con `aria-label` "Configuración: …". **Si la llamada falla, da 0 o viene null: nada** (y si antes había un número, se borra). Tocar cualquiera de los dos accesos con pendientes abre Configuración en "Marcas / Conos" (`mostrarConfig(tab)` acepta ahora la pestaña con la que abre); sin pendientes, donde estaba (Máquinas por defecto).

## Lo que queda abierto y NO se tocó

- **Pendiente de base: no hay forma de corregir la caja/embolsado de un sublote ya cargado.** Hoy el faltante de un renglón cargado sin caja se arregla con una baja de Stock a mano. Si se quiere corregir en Producción, hace falta una RPC nueva (o ampliar `corregir_produccion_item`) que cambie `caja_insumo_id`/`embolsado` y llame a `_descontar_empaque` con la diferencia. Territorio del chat de arquitectura.
- **`agregar_produccion_item` no descuenta empaque ni guarda caja/embolsado.** Sus renglones quedan con `embolsado` null y por eso **no se marcan** en bordó aunque no hayan descontado nada. La pantalla hoy no la usa; si se usa, conviene que la base la alinee con `registrar_produccion_item`.
- **Otros fallos de lectura que siguen frenando, anotados y no tocados** (no son configuración del empaque, o no son chicos):
  - Si fallan los **conos** (`marcas_personalizadas`) el catálogo entero se cae y no se puede agregar producto. Degradar a "Común" solo es posible pero cambia el paso del cono y la doble bolsa; no se hizo.
  - Si falla `personal_produccion`, "¿Quién sos?" no deja entrar (ya muestra "Reintentar"). Es la identificación, no configuración.
  - Si falla `datos_para_masa` (la receta y los lotes) o `recetas` (los tipos de masa), la sala no deja registrar la masa (ya dice "Actualizar"). Sin receta la pantalla no tiene con qué armar la planilla de la masa.

## Qué se verificó y contra qué

- `node pruebas/check-scripts.js`: OK.
- **Suite nueva** `pruebas/test-produccion-sin-empaque.js` (118/118) + `pruebas/mut-produccion-sin-empaque.js` (51/51): cada una de las cuatro lecturas del empaque fallando deja el catálogo en pie y "Agregar producto" tocable; el flujo saltea la caja con el aviso; el payload va con caja y embolsado en null y con el turno, la presentación, el cono y las cajas; `registrar_produccion_item` se llama y se carga sin error; el aviso de stock sigue sin bloquear; el criterio de la marca en sus cinco casos; la marca en la planilla (vía `abrirPlanilla`) y en el historial (vía `leerDetalleTurno`), incluso con el producto fuera del catálogo o sin catálogo; la planilla sin los nombres de las cajas; la sala sin `define_chocolate`; la burbuja (número, singular, 99+, title/aria-label, los dos botones, abrir en Marcas por los dos caminos, 0/null/vacío/sin fila/error/excepción → nada, un número viejo se borra, sin `configurar` no se llama, turno) y HTML malicioso en los renders nuevos.
- Suites tocadas: `sandbox-produccion.js` (funciones nuevas y el `let` `turnoBurbujaConos`), `test-produccion-empaque.js` (la assertion "sin el empaque, el catálogo no queda a medias" pasó a exigir el comportamiento nuevo), anclas de `mut-produccion-empaque.js` (el payload se escribe distinto) y `mut-produccion-historial.js` (el renglón del sublote cambió).
- Números al cerrar (todos en verde, mutaciones de a un runner por vez): suites `test-produccion-*` abrir 162, acceso 26, cierre 250, config 208, empaque 247, historial 122, masa 217, pin 144, quien 129, sin-empaque 118, xss 6; `test-dashboard-produccion` 27, `test-accesos-produccion` 20; `controles-produccion` 1541/1541 (sin declaraciones nuevas: la burbuja es un control nuevo, que se permite). Mutaciones: sin-empaque 51/51, empaque 146/146 (+14 eq.), cierre 157/157 (+35 eq.), historial 104/104 (+14 eq.), config 182/182 (+8), abrir 92/92 (+2), masa 123/123 (+10), pin 71/71 (+2), quien 57/57 (+2), acceso 13/13, dashboard 14/14.
- Equivalentes nuevos declarados: `esc(textoSinCaja(it))` en cierre y `esc(textoSinCaja(p))` en historial (texto constante del código). Anclas de `mut-produccion-historial.js` ajustadas a las dos líneas del sublote que cambiaron.

## Qué NO se pudo probar

- Nada en un navegador real ni contra la base (las suites corren contra un doble de supabase). No se miró renderizado el aviso bordó a 1280×800, ni la burbuja en el botón del inicio y del Menú.
