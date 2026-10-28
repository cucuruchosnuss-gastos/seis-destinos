# Pedido 27/10/2026 — Cobranzas: la v2 del lector de comprobantes (tickets, CBU, varios de una vez)

Rama `ci-prueba/ocr-cobranzas-tickets` desde `origin/main` `7793c83`. No se publica nada en Supabase: la Edge Function la publica el chat de la base.

**Contexto:** Yanina carga cobranzas subiendo comprobantes. Richard (y otros) pagan desde cuentas de terceros a PAZ MIRTA Macro. Llegan capturas BNA+/Mercado Pago, fotos de la pantalla de una PC, tickets "DEPÓSITO EFECTIVO EN CUENTA" de Macro y PDFs del banco con comisión. El chat de la base hizo la v2 de `ocr-cobranza-comprobantes` (`index.ts` y `normalizar.js` adjuntos).

1. Reemplazar `supabase/functions/ocr-cobranza-comprobantes/index.ts` y `normalizar.js` por los adjuntos, tal cual.
2. Ampliar `pruebas/test-ocr-cobranza-comprobantes.js`: `medio` ('transferencia' por defecto, 'deposito_efectivo' solo exacto), `destinatario` (texto, máx 150), `cbu_destino` (solo 22 dígitos, si no null), y que un comprobante con solo "medio" se descarta como ruido.
3. `modulos/cobranzas.html`, al leer una transferencia:
   a. `medio = 'deposito_efectivo'` → "Depósito en efectivo" en la propuesta, sin ordenante obligatorio. Mirar qué acepta la tabla antes de guardar un medio nuevo; si no existe, guardarlo como transferencia con la nota "Depósito en efectivo" y avisar qué cambio de base haría falta.
   b. `cbu_destino` que coincide con el CBU de una cuenta bancaria de la empresa → preseleccionarla (se puede cambiar).
   c. Archivar la respuesta cruda en `cobranza_fotos.ocr_crudo` también cuando la lectura falla (ok:false con crudo).
   d. Varios comprobantes de una vez (selección múltiple): uno por uno contra el OCR, cada uno con su propuesta.
4. Ordenante distinto del cliente: no bloquear ni usarlo para elegir el cliente; el cliente lo elige Yanina.
5. `npm run pruebas` en verde, check-scripts, y mirarla en maqueta a 390 y 1280 px.

Al terminar: hash de la rama, lo decidido sin consultar, lo no probado y "Qué automatizaría ahora". Un solo resumen y, como último mensaje: TERMINADO — mandar al chat.

## AGREGADO (27/10/2026, antes de integrar)
El chat de la base ya agregó `cobranza_transferencias.medio` (text not null default 'transferencia', check in ('transferencia','deposito_efectivo')) y `_cobranza_escribir_transferencias` ya lee `t->>'medio'` (verificarlo con pg_get_functiondef).
1. Mandar "medio" en cada transferencia y dejar de meter "Depósito en efectivo · " en banco_origen (sacar bancoOrigenParaBase y el maxlength 57: vuelve a 80).
2. Leer "medio" en los dos select de cobranza_transferencias y usarlo en transferenciaDesdeBase. separarNotaDeposito solo como respaldo para un banco_origen que ya empiece con la nota.
3. Donde se muestra una cobranza asentada, que el depósito diga "Depósito en efectivo".
4. Ajustar suites y mutaciones; npm run pruebas en verde. Después INTEGRÁ (no toca la tablet).
Mismo cierre: UN resumen y "TERMINADO — mandar al chat".
