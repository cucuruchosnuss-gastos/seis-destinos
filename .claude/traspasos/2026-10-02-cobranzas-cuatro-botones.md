# Traspaso — "¿Cómo pagó?" con cuatro botones en Cobranzas (02/10/2026)

Rama: `ci-prueba/cobranzas-cuatro-botones` (también en `claude/cobranzas-cuatro-botones-2kgmnd`), salida de `origin/main` = `7f8d915`. **No está en `main`.** Tag de antes: `antes-de-cobranzas-cuatro-botones-2026-10-02`. Trabajado en la nube, sin Facu: lo ambiguo se resolvió por lo más conservador y está abajo.

## Qué se hizo
1. **La empresa (solo con `cobranzas:procesar`)**: "¿De qué empresa es la cobranza?", **no viene marcada aunque la barra tenga una**, y al tocarla la barra de arriba pasa a esa con la función nueva **`pasarBarraAUnidad(id)`** de `js/barra-unidad.js` (con pruebas en `test-/mut-barra-unidad.js`). Después, los clientes de esa empresa, como antes. El chofer sigue escribiendo el cliente.
2. **"¿Cómo pagó?"**: cuatro botones grandes (Efectivo, Cheque, E-cheque, Transferencia); el chofer ve solo Efectivo y Cheque. Cada uno abre su sección; se pueden abrir varias; una abierta y vacía se cierra al tocarla (o con "Cerrar"); al editar, las que tienen datos vienen abiertas.
3. **Cheque, e-cheque y transferencia** con "Sacar foto", "Galería", "Archivo" y "Cargar a mano" (y el texto de "+ Otro…" para seguir). Cheques → `ocr-cheques` como siempre (más "Archivo", solo imágenes). Transferencias con importe, fecha, banco de origen con sugerencias, quién transfirió, CUIT (aviso por dígito verificador), número de operación (→ `referencia`) y la cuenta propia SOLO de la empresa elegida. E-cheque con emisor y CUIT del emisor además de lo de antes.
4. **Comprobantes de transferencias y e-cheques**: se suben con `tipo` y `mime`, van al lector nuevo y lo leído se propone; `origen_datos` `ocr` / `ocr_corregido`. PNG y fotos → JPEG; PDF tal cual hasta 10 MB, con aviso si pesa más (no se sube).
5. **Lector nuevo `supabase/functions/ocr-cobranza-comprobantes/`** (`index.ts` + `normalizar.js`), copiando `ocr-cheques`. **NO publicado.**
6. Maqueta: `functions.invoke` responde `DATOS.funciones` (el lector propone una transferencia en los datos de `cobranzas`) y Dolce Pasta tiene una cuenta de banco.

## Verificado contra la base (02/10/2026, solo lectura)
- `cobranza_fotos.tipo` (default `'cheque'`) y `mime`; `cobranza_transferencias.banco_origen`, `ordenante`, `cuit_ordenante`, `foto_id`, `origen_datos` (default `'manual'`) y `ocr_propuesto` existen, como decía el pedido.
- Las firmas de `guardar_cobranza_completa` y `cargar_cobranza_asentada` no cambiaron (la pantalla las llama igual).

## Para publicar el lector (lo hace Claude después de auditarlo)
- Publicar la carpeta entera: **los DOS archivos** (`index.ts` importa `./normalizar.js`), con `verify_jwt: true` como las demás.
- Secret opcional `OCR_COMPROBANTES_MODELO`; sin él usa el mismo default que `ocr-cheques`.
- Hasta que se publique, subir un comprobante de transferencia o e-cheque dice que no se pudo leer y deja la tarjeta vacía con el comprobante adjunto para cargarlo a mano: **la pantalla sirve igual**.

## Decisiones tomadas sin preguntar
- **El chofer conserva "+ Agregar un cheque que no se leyó"** (deshabilitado sin foto, como antes). "✎ Cargar a mano" es solo de Administración, y ahí carga un cheque sin foto **solo si no hay fotos de cheques** (con fotos sigue el camino de antes, vinculado a una).
- **Si el lector falla o no encuentra nada**: aviso y una tarjeta vacía con el comprobante; **no reintenta** (reintentar un error del lector no lo arregla). **Sin señal, sí espera y reintenta.**
- **Las fotos que ya están en la base viajan sin `tipo` ni `mime`** al editar (para no pisarlas con un valor adivinado).
- **El sincronizador sin señal solo lee fotos de cheques** (los comprobantes se leen al subirlos con el formulario abierto).
- **El CUIT con dígito que no cierra se avisa y NO bloquea** (puede estar mal leído y la persona tiene el papel); uno que no tiene 11 dígitos sí bloquea.
- **E-cheque**: el emisor va en `titulares` `[{nombre, cuit}]`; sucursal, código postal y cuenta del CMC7 viajan solo si tienen su largo exacto (si no, null).
- **Una cobranza SOLO con transferencias** se deja guardar con `procesar` (la base lo acepta por `guardar_cobranza_completa`); el chofer no (su `editar_cobranza` no lo avisa a la base) y se le dice por qué.
- **Un comprobante que no usa ninguna tarjeta** se avisa ("se descartan al guardar") y no viaja.
- Se fueron `#cob-formas-acciones` (los dos "Agregar …" de la versión anterior; reemplazados por los botones) y `empresaInicialAsentar`.
- El número de operación tiene tope de 100 letras (el mismo que pone el lector al normalizar `referencia`).

## Lo que NO se probó
- **Nada con sesión real ni contra la base**: las suites corren contra un doble y `e2e/18` contra la maqueta (Chromium local).
- **El lector nunca corrió contra un modelo real** (no está publicado): no hay medición de qué tan bien lee transferencias de Mercado Pago, Macro, Galicia, etc., ni PDFs.
- La cámara del celular (`capture`) solo se puede ver en un teléfono.

## Guion para Facu (después de publicar el lector)
1. Cobranzas → "+ Nueva cobranza" con la barra en Nuss: la empresa NO viene marcada. Tocá Dolce Pasta: la barra de arriba pasa a Dolce Pasta.
2. Elegí un cliente. Abajo, "¿Cómo pagó?": tocá Transferencia → "Galería" → una captura de una transferencia: aparece la tarjeta con importe, fecha, banco y número de operación, y "Leído del comprobante". Cambiá el importe: dice "y corregido".
3. La cuenta propia ofrece solo las de Dolce Pasta.
4. Tocá Cheque → sacale foto a un cheque, como siempre. Tocá Efectivo y cargá un importe. "Guardar y asentar".
5. Probá un PDF de un e-cheque desde "Archivo" en E-cheque.
6. Con la cuenta de Emanuel (chofer): ve solo Efectivo y Cheque, sin "Cargar a mano".

## Qué automatizaría ahora
**Reanclar mutaciones a mano después de cada rediseño.** En esta tanda, cinco runners viejos de Cobranzas quedaron con anclas que ya no existen y hubo que reescribirlas una por una. Propuesta: que `mutar.js`, cuando un ancla NO EXISTE, busque el renglón más parecido del archivo actual (distancia de edición sobre la primera línea del ancla) y lo sugiera en el mensaje de aborto con su número de línea; reanclar pasaría de leer el archivo a confirmar una sugerencia.
