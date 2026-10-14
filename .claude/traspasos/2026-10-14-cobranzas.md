# Traspaso 14/10/2026 — Cobranzas: e-cheque desde PDF (rama `ci-prueba/echeque-pdf`)

Para el chat de arquitectura. Autocontenido.

## Qué pasaba
Pedido de Facu del 14/10: en la cobranza `f47dadf1-2b8c-4ddf-acc3-991daaab0942` (Dolce, BERSANO) Yanina subió el PDF de un ECHEQ del Macro y "en la tarjeta solo apareció el importe"; el resto se tipeó a mano.

## Causa (verificada)
- SELECT del 14/10 sobre `cobranza_cheques` de esa cobranza: el e-cheque guardado tiene el `ocr_propuesto` COMPLETO (banco 285, número 78013718, BERSANO SRL, CUIT 30690839691, pago 16/11, importe) y coincide campo por campo con lo guardado; quedó `ocr_corregido` solo porque `fecha_emision` vino `null` y se puso la de hoy. O sea: el lector (`ocr-cobranza-comprobantes`) y el mapeo de la pantalla estaban bien.
- Reproducido en la maqueta con el crudo real: lo que fallaba era el CAMINO. La tarjeta recién nacía cuando el lector respondía (20-40 s con un PDF) y como tarjeta NUEVA, abajo de la vacía que la persona ya estaba llenando ("Cargar a mano"); en el celular lo único que cambiaba a la vista era el total. Sin fecha de emisión en el comprobante, además, la tarjeta quedaba con la fecha vacía y frenaba el guardado.

## Qué cambió (solo `modulos/cobranzas.html`; ni base ni Edge Function)
- Al subir el comprobante de un e-cheque (cámara, galería o archivo) la tarjeta aparece en el momento: usa la tarjeta vacía abierta (sin comprobante ni datos) o crea una, con el comprobante adjunto. Dice "Leyendo el comprobante… Podés ir escribiendo: lo que escribas no se pisa." (actualizado en el lugar, sin repintar).
- Al responder el lector se completa ESA tarjeta, solo en los campos que la persona no escribió. Un segundo e-cheque del mismo PDF va en otra tarjeta; si la quitaron mientras leía, vuelve como nueva.
- Sin `fecha_emision`: la de hoy con la leyenda "No figura en el comprobante: revisala"; esa fecha puesta por el sistema no cuenta como corrección en `origen_datos` (sí si la persona la cambia).
- Al repintar las tarjetas el foco vuelve al campo donde se escribía.
- Funciones nuevas: `escritoPorPersona`, `echequeSinDatos`, `completarEcheque`, `tarjetaParaComprobante`, `textoLecturaEcheque`, `restaurarFoco` (agregadas a `FUNCIONES_PAGO` de `pruebas/sandbox.js`).
- Transferencias: sin cambios (mismo patrón; no pedido).
- `e2e/maqueta/supabase-falso.js`: una Edge Function EN VIVO, `globalThis.__maqueta.funciones.<nombre> = (op) => respuesta | Promise`.

## Verificado
- `pruebas/test-cobranzas-echeque-pdf.js` 59/59 (crudo real + normalizador real de la Edge Function); sobre `e9fdabf` 16/51 en rojo. `mut-cobranzas-echeque-pdf.js` 32/32 (exige rojo sobre el baseline fijo `e9fdabf`).
- `e2e/41-echeque-pdf.spec.js` 36/36 (Archivo, Galería, Sacar foto × sin tarjeta, con tarjeta vacía, escribiendo mientras lee × 1280, 390, 360, tablet 1000×540); antes del arreglo 36/36 en rojo.
- `npm run pruebas` 257/257; `check-scripts` OK; mutaciones cuatro-botones 54/54 (+1 eq.), formas 75/75, xss 284/284 (+3 eq.); e2e 18-cobranza-asentada verde.

## Qué tocar en la doc
Ya anotado en `docs/memoria/cobranzas.md` (bullet "E-CHEQUE DESDE PDF" debajo de "¿Cómo pagó? — cuatro botones") y una entrada en `docs/memoria/aprendizajes.md` ("UN RESULTADO QUE TARDA NO CREA SU PROPIO LUGAR…"). CLAUDE.md no necesita cambios. Administración no se ve afectada (no cambió lo que se escribe en las tablas).

## Qué automatizaría ahora
Un helper de maqueta "lector demorado" ya existe (`__maqueta.funciones`); lo siguiente es un spec genérico que, para cada Edge Function de lectura (cheques, comprobantes, materia prima), suba el archivo, escriba mientras lee y exija que nada se pise: el mismo bug puede estar en Transferencias y en Ingreso.
