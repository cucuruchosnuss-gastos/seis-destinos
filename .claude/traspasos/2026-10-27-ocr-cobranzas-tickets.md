# Traspaso 27/10/2026 — Cobranzas: la v2 del lector de comprobantes

Rama `ci-prueba/ocr-cobranzas-tickets`, desde `origin/main` `7793c83` (worktree `../sd-ocr-cobranzas`). Pedido: `.claude/pedidos/2026-10-27-ocr-cobranzas-tickets.md`. Sin integrar.

## Lo que se hizo
- `supabase/functions/ocr-cobranza-comprobantes/index.ts` y `normalizar.js`: copia exacta de los adjuntos del chat de la base (`cmp` idéntico). NO se publicó nada.
- `test-ocr-cobranza-comprobantes.js` 58 → 78: medio (por defecto, exacto, todo lo demás → transferencia), destinatario (espacios, tope 150, no-texto → null), cbu_destino (22 dígitos, guiones y espacios, ceros adelante, largo distinto → null), "solo medio" (y medio + notas) es ruido, el e-cheque no lleva los campos nuevos, y el prompt v2 (depósito sin ordenante, la empresa nunca es el ordenante, importe antes de la comisión, ok:false devuelve crudo). `mut-ocr-cobranza-comprobantes.js`: el ancla vieja del filtro de ruido se actualizó (la v2 cambió esa línea) y 6 mutaciones nuevas; 39/39.
- `modulos/cobranzas.html`:
  - **Depósito en efectivo**: título "Depósito en efectivo N", chips "Cómo pagó" (Transferencia / Depósito en efectivo), rótulos "Quién depositó (opcional)", "Banco donde se depositó". El ordenante ya era opcional.
  - **La tabla no tiene medio** (`cobranza_transferencias`: sin columna `medio` ni `notas`; CHECKs solo de importe, origen_datos y referencia; verificado 27/10 con `information_schema` y `pg_get_constraintdef`). Se guarda como transferencia con **"Depósito en efectivo · <banco>"** en `banco_origen`; al volver de la base se separa. El medio leído queda en `ocr_propuesto`.
  - **Cuenta por CBU**: `cuentas_caja` se lee con `cbu` (hay grant de SELECT para authenticated). Coincide con UNA cuenta de las que se pueden elegir → preseleccionada con aviso; la persona la cambia.
  - **Lo crudo** también con ok:false (ya funcionaba con HTTP 200; ahora además si viene en el cuerpo de un error). El aviso ya no dice "Cargalo a mano. Cargalo a mano: …".
  - **Varios de una vez**: Galería y Archivo ya eran `multiple`; ahora se leen DE A UNO (cola), los que esperan dicen "en espera".
- Suites nuevas `test-/mut-cobranzas-ocr-tickets.js` (62 verificaciones; 26/26 mutaciones; en rojo contra `7793c83`). `mut-cobranzas-cuatro-botones.js`: dos anclas actualizadas. `pruebas/sandbox.js`: los helpers nuevos en `FUNCIONES_PAGO`.
- `e2e/70-cobranzas-ocr-tickets.spec.js`: tres comprobantes de una vez desde la Galería (ticket de depósito, BNA+ de un tercero y uno ilegible) a 1280 y 390; 2/2 en la maqueta. La maqueta tiene el CBU de PAZ MIRTA en "Banco Macro · Nuss" (`pruebas/datos-maqueta/cobranzas.js` + `npm run maqueta:datos`; el .json NO se edita a mano: lo controla `test-maqueta-datos.js`). Los 55 recorridos de Cobranzas en la maqueta (18, 22, 41 y 70) pasan.
- `docs/memoria/cobranzas.md`: la entrada nueva bajo "E-cheque desde PDF".

## Decidido sin consultar
- La nota del depósito va en `banco_origen` (y no en las observaciones de la cobranza): es por transferencia, se ve en el detalle ("Desde Depósito en efectivo · Banco Macro · …") y vuelve separada al editar.
- "Uno por uno" = **de a uno en fila** (no en paralelo): cada comprobante tarda ~30 s, así que tres tardan ~1,5 min, pero en paralelo el lector puede cortar por exceso de pedidos y cada corte queda para cargar a mano. Las propuestas aparecen a medida que se leen.
- Botones para cambiar el medio a mano (no pedidos): para corregir una lectura o cargar un depósito a mano.
- La cuenta por CBU solo entre las de la empresa elegida; con dos cuentas con el mismo CBU, ninguna.
- Arreglado de paso el "Cargalo a mano" repetido en el aviso.

## Cambio de base que haría falta (si se quiere el medio como dato)
`alter table cobranza_transferencias add column medio text not null default 'transferencia' check (medio in ('transferencia','deposito_efectivo'))`, que `_cobranza_escribir_transferencias` lea `t->>'medio'`, y migrar las filas con `banco_origen like 'Depósito en efectivo%'`. La pantalla mandaría `medio` y dejaría de poner la nota.

## Lo no probado
- Con la base y la Edge Function reales (la v2 no está publicada todavía): todo fue en la maqueta y con el normalizador real.
- Fotos y tickets reales de Yanina contra el modelo.
- La preselección por CBU depende de que la cuenta tenga el CBU cargado: hoy lo tienen Macro Paz Mirta, Nación Paz Mirta, Macro Dolce y algunas personales; "Macro Seis Destinos" y "Macro Pablo U" no.

## Qué automatizaría ahora
- **Un script que compare la Edge Function del repo con la publicada** (`get_edge_function` contra los archivos): hoy "copia exacta del adjunto" y "lo que corre en Supabase" se controlan a mano en cada traspaso.
- **Una medición del lector por `medio` y por `origen_datos`** (SELECT semanal sobre `cobranza_transferencias.ocr_propuesto`): cuántos depósitos y transferencias salen `ocr` vs `ocr_corregido` y qué campo se corrige, para decidir el modelo con números.
- La maqueta en el puerto 4180 suele estar ocupada por otra carpeta: `servir.js` podría buscar un puerto libre solo y decirlo, y las specs leerlo.
