# Traspaso 27/10/2026 — Cobranzas: la v2 del lector de comprobantes

Rama `ci-prueba/ocr-cobranzas-tickets`, desde `origin/main` `7793c83` (worktree `../sd-ocr-cobranzas`). Pedido: `.claude/pedidos/2026-10-27-ocr-cobranzas-tickets.md`. Sin integrar.

## Lo que se hizo
- `supabase/functions/ocr-cobranza-comprobantes/index.ts` y `normalizar.js`: copia exacta de los adjuntos del chat de la base (`cmp` idéntico). NO se publicó nada.
- `test-ocr-cobranza-comprobantes.js` 58 → 78: medio (por defecto, exacto, todo lo demás → transferencia), destinatario (espacios, tope 150, no-texto → null), cbu_destino (22 dígitos, guiones y espacios, ceros adelante, largo distinto → null), "solo medio" (y medio + notas) es ruido, el e-cheque no lleva los campos nuevos, y el prompt v2 (depósito sin ordenante, la empresa nunca es el ordenante, importe antes de la comisión, ok:false devuelve crudo). `mut-ocr-cobranza-comprobantes.js`: el ancla vieja del filtro de ruido se actualizó (la v2 cambió esa línea) y 6 mutaciones nuevas; 39/39.
- `modulos/cobranzas.html`:
  - **Depósito en efectivo**: título "Depósito en efectivo N", chips "Cómo pagó" (Transferencia / Depósito en efectivo), rótulos "Quién depositó (opcional)", "Banco donde se depositó". El ordenante ya era opcional.
  - **El medio va en su columna** (AGREGADO del 27/10): el chat de la base agregó `cobranza_transferencias.medio` (`text not null default 'transferencia'`, CHECK de los dos valores) y `_cobranza_escribir_transferencias` lee `t->>'medio'` (verificado con `pg_get_functiondef`, `information_schema` y los grants de columna). La pantalla manda `medio`, ya no mete la nota en `banco_origen` (el campo vuelve a 80), y los dos select de Cobranzas lo leen. `separarNotaDeposito` queda solo de respaldo para un `banco_origen` que empiece con la nota (0 filas así el 27/10). El medio leído queda además en `ocr_propuesto`.
  - **La cobranza guardada lo dice**: el detalle de Cobranzas ("Depósito en efectivo" arriba de "Entró en …") y la tarjeta de Administración (`leerTransferenciasDe` lee `medio`; `htmlTransferenciaCob`: "$ 500.000 · Depósito en efectivo · entró en …").
  - **Cuenta por CBU**: `cuentas_caja` se lee con `cbu` (hay grant de SELECT para authenticated). Coincide con UNA cuenta de las que se pueden elegir → preseleccionada con aviso; la persona la cambia.
  - **Lo crudo** también con ok:false (ya funcionaba con HTTP 200; ahora además si viene en el cuerpo de un error). El aviso ya no dice "Cargalo a mano. Cargalo a mano: …".
  - **Varios de una vez**: Galería y Archivo ya eran `multiple`; ahora se leen DE A UNO (cola), los que esperan dicen "en espera".
- Suites nuevas `test-/mut-cobranzas-ocr-tickets.js` (66 verificaciones; 33/33 mutaciones; en rojo contra `7793c83`). `test-/mut-administracion-cobranzas-formas.js`: el depósito en la tarjeta y el select con `medio` (34/34; 24/24). `mut-cobranzas-cuatro-botones.js`: dos anclas actualizadas. `pruebas/sandbox.js`: los helpers nuevos en `FUNCIONES_PAGO`.
- `e2e/72-cobranzas-ocr-tickets.spec.js` (era el 70; el 70 y el 71 los tomaron precios-compra y venta-por-unidad, integradas en paralelo): tres comprobantes de una vez desde la Galería (ticket de depósito, BNA+ de un tercero y uno ilegible) a 1280 y 390; 2/2 en la maqueta. La maqueta tiene el CBU de PAZ MIRTA en "Banco Macro · Nuss" (`pruebas/datos-maqueta/cobranzas.js` + `npm run maqueta:datos`; el .json NO se edita a mano: lo controla `test-maqueta-datos.js`). Los 55 recorridos de Cobranzas en la maqueta (18, 22, 41 y 70) pasan.
- `docs/memoria/cobranzas.md`: la entrada nueva bajo "E-cheque desde PDF".

## Decidido sin consultar
- El detalle de Cobranzas mira solo la columna `medio` (no el respaldo): así no hubo que sumar helpers a las ocho suites que arman ese detalle; una fila vieja con la nota igual la muestra en "Desde …".
- En Administración el depósito se dice en el texto de la línea; la etiqueta de la forma sigue siendo "Transferencia" (la fila de formas de la cobranza no cambia).
- "Uno por uno" = **de a uno en fila** (no en paralelo): cada comprobante tarda ~30 s, así que tres tardan ~1,5 min, pero en paralelo el lector puede cortar por exceso de pedidos y cada corte queda para cargar a mano. Las propuestas aparecen a medida que se leen.
- Botones para cambiar el medio a mano (no pedidos): para corregir una lectura o cargar un depósito a mano.
- La cuenta por CBU solo entre las de la empresa elegida; con dos cuentas con el mismo CBU, ninguna.
- Arreglado de paso el "Cargalo a mano" repetido en el aviso.

## Lo no probado
- Con la base y la Edge Function reales (la v2 no está publicada todavía): todo fue en la maqueta y con el normalizador real.
- Fotos y tickets reales de Yanina contra el modelo.
- La preselección por CBU depende de que la cuenta tenga el CBU cargado: hoy lo tienen Macro Paz Mirta, Nación Paz Mirta, Macro Dolce y algunas personales; "Macro Seis Destinos" y "Macro Pablo U" no.

## Qué automatizaría ahora
- **Un script que compare la Edge Function del repo con la publicada** (`get_edge_function` contra los archivos): hoy "copia exacta del adjunto" y "lo que corre en Supabase" se controlan a mano en cada traspaso.
- **Una medición del lector por `medio` y por `origen_datos`** (SELECT semanal sobre `cobranza_transferencias.ocr_propuesto`): cuántos depósitos y transferencias salen `ocr` vs `ocr_corregido` y qué campo se corrige, para decidir el modelo con números.
- La maqueta en el puerto 4180 suele estar ocupada por otra carpeta: `servir.js` podría buscar un puerto libre solo y decirlo, y las specs leerlo.
