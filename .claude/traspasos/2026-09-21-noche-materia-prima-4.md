# Traspaso — Ingreso (materia-prima), fase 2 de las fotos — 21/09/2026 (noche, parte 16)

Para el chat de arquitectura. Quien lo lee no vio el trabajo. **Sin commit ni push** (lo pidió la tarea); los cambios están en el working copy.

## Qué cambió y por qué

Ingreso era el último módulo que firmaba fotos a **10 años** y guardaba esa URL en la base (una URL firmada abre el archivo sin sesión y no se puede revocar). Pasa al mismo criterio que Gastos (`21289ef`) y Cobranzas: **se guarda la RUTA y se firma al mirar, a 300 s**.

En `modulos/materia-prima.html`:

1. **`subirArchivoMp()` devuelve la RUTA** (`{uid}/mp/{Date.now()}-{azar}.{ext}`, el mismo formato de siempre) y ya **no llama a `createSignedUrl`**. Alimenta las tres columnas: `materia_prima_ingresos.foto_url` y `materia_prima_items.ficha_tecnica_url` / `foto_lote_url`. La extensión ahora se limpia a `[a-z0-9]` (máx. 8, default `jpg`): sale del nombre del archivo del celular, y un nombre sin punto con espacios daba una ruta con espacios.
2. **`hrefFoto()` se eliminó**. El "Ver foto →" del detalle pasó de `<a href="…">` a un `<button data-ruta-foto="…">` con la ruta escapada; al tocarlo, `abrirFotoMp()` firma con `createSignedUrl(ruta, 300)` y abre SOLO la URL que devuelve la firma. **Ningún valor de la base va ya a un href/src.** Helpers nuevos: `BUCKET_FOTOS_MP`, `SEGUNDOS_FIRMA_FOTO_MP` (300), `MENSAJES_FOTO_MP`, `rutaFotoMp()`, `clasificarErrorFirmaMp()`, `firmarFotoMp()`, `abrirFotoMp()`, `manejarClickFotoMp()` (listener delegado en `#detalle-comprobantes`). CSS: `button.comprobante-mp__foto` para que el botón se vea igual que el link.
3. **`rutaFotoMp()`**: una ruta se acepta tal cual si tiene ≥2 segmentos, cada uno `[\w.-]+` y ninguno `.`/`..`; una URL solo si es `https://…/storage/v1/object/sign/comprobantes/<ruta>` y de ahí se extrae (decodificada) la ruta. Cualquier otra cosa (`javascript:`, `data:`, `http:`, otro formato) → `null` → "Foto no disponible". Así **el token de las URLs viejas deja de aparecer en la página**.
4. Mismo manejo de errores que Gastos: el token vencido (`AccessDenied`/`InvalidJWT`/401/403) refresca la sesión y reintenta UNA vez; `NoSuchKey`/404 dice "no se encontró" si la ruta es de la carpeta propia, y un mensaje que no afirma nada ("no está o no tenés permiso") si es de otra persona (Storage no distingue sin permiso de no existe); la pestaña se abre antes del `await` y se cierra si falla; una excepción de red avisa y no rompe.

**NO se migraron datos** (la tarea decía solo lectura en Supabase). Las 12 filas viejas con URL siguen así y se ven igual (se extrae la ruta).

## Qué se verificó y contra qué

- `pg_policy` (21/09/2026): la policy SELECT "comprobantes: ver los propios o los que la tarea habilita" matchea la rama `mp/` con `foto_url ~~ '%' || objects.name || '%'` (y lo mismo en `ficha_tecnica_url` / `foto_lote_url`). **Una ruta guardada está contenida en sí misma**, así que las filas nuevas entran en la rama sin tocar la policy. No se tocó.
- Base: `materia_prima_ingresos` tiene 13 filas, **12 con `foto_url`, las 12 URL firmadas, cero rutas**; las 12 matchean `^https://[^/]+/storage/v1/object/sign/comprobantes/[\w.-]+/mp/[\w.-]+\?`, o sea `rutaFotoMp()` las reconoce todas. `materia_prima_items`: 28 filas, cero adjuntos. Ningún objeto `mp/` del bucket tiene caracteres fuera de `[\w.-]`.
- El OCR (`ocr-materia-prima`) recibe el archivo en base64, no la URL: no se afectó.
- "Pagado sin ingresar" baja la foto de `gastos.foto_url` con `rutaComprobanteGasto()` + `storage.download`: no depende de lo de acá.
- `gastos.html` `archivoDeIngreso()` (leído, no tocado): con una ruta hace `storage.download(ruta)`, así que **no se rompe**. Ver la observación de abajo.
- Suites: `pruebas/test-materia-prima-fotos.js` **57/57** (ejecuta `subirArchivoMp`, `leerConIA`, `filaItemParaBase`, `rutaFotoMp`, `abrirFotoMp`, `manejarClickFotoMp` y la plantilla real del detalle con storage/auth/window.open falsos) y `mut-materia-prima-fotos.js` **14/14** (firmar a 10 años al subir o al mirar, no extraer la ruta de la URL vieja, valor crudo en un href, URL vieja entera en el botón, sin reintento, pestaña no cerrada, etc.). `test-materia-prima-xss.js` adaptado (ahora verifica `rutaFotoMp`, que el botón lleva la ruta, que el token viejo no aparece y que en un href/src solo entra `encodeURIComponent` — se sacó la excepción de `hrefFoto`): **167/167**, mutaciones **124/124**. Circuito 115/115 (mut 33/33), números 87/87 (mut 32/32). `check-scripts` OK; todas las `test-*.js` y `controles-cobranzas` en verde. Archivos en LF (0 CR).

## Qué tocar en CLAUDE.md

1. **Seguridad → "EL BUCKET comprobantes" → punto 2 (URLs firmadas a 10 años):** Ingreso ya **no firma a 10 años** (código de la fase 2 hecho, 21/09/2026). Quedan las **12** filas viejas de `materia_prima_ingresos.foto_url` con URL (la migración de datos es aparte y necesita a Facu, igual que la de Gastos); el número ya no sube solo. Borrar las frases "al 16/09/2026 el código todavía firma a 10 años" y "El número sube solo: `subirArchivoMp` sigue firmando a diez años…". La policy `mp/` sigue con `LIKE` y funciona con ruta; pasar a comparación exacta es mejora opcional, recién después de migrar las 12.
2. **Módulo 6 (Ingreso):** agregar una entrada corta "FOTOS: RUTA + FIRMA AL MIRAR" con los puntos 1–4 de arriba (y que `hrefFoto()` ya no existe).
3. **Registro de suites (`pruebas/`)**: sumar `test-materia-prima-fotos.js` / `mut-materia-prima-fotos.js` con sus números (57/57, 14/14). El `pruebas/README.md` no lo toqué (es compartido).

## Observaciones (no bloqueantes, no tocadas)

- **Gastos, "Facturas ingresadas sin gasto" → "Cargar gasto"**: `archivoDeIngreso()` bajaba antes las fotos de Ingreso con `fetch` a la URL a 10 años, que saltea el RLS. Con una ruta hace `storage.download`, que pasa por la policy: quien tenga `gastos:ver_exportar` pero **no** `materia_prima:ver_todo` en esa unidad (y no sea quien subió la foto) ya no va a poder copiar la foto de un ingreso NUEVO. No se rompe: Gastos muestra su aviso y deja cargar la foto a mano. Es la consecuencia correcta de cerrar la llave sin sesión; si se quiere que ese flujo copie la foto igual, hay que ampliar la policy (territorio del chat de arquitectura) o que Gastos lo avise mejor (chat de Gastos).
- La ficha técnica y la foto de lote **no se muestran en ninguna pantalla** del módulo (el `.select()` del detalle no las trae), así que no había "Ver" que adaptar para ellas. Se guardan como ruta.
- Las fotos huérfanas siguen igual que antes (pendiente conocido).
