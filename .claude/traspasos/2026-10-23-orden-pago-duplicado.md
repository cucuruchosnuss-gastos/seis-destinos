# Traspaso — Orden de pago: ORIGINAL y DUPLICADO, sin librador y más compacta (23/10/2026)

Rama `ci-prueba/orden-pago-duplicado` (desde `origin/main` f32b687). Módulo: Cuentas corrientes (`modulos/cuentas-corrientes.html`). Cero cambios de lógica de pago, de RPC, de base o de permisos.

## Para el chat de arquitectura (CLAUDE.md / docs/memoria)
Ya quedó una entrada nueva en `docs/memoria/cuentas-corrientes.md`, justo debajo de "PAGO A PROVEEDORES EN LOS DOS SENTIDOS Y ORDEN DE PAGO (20/10/2026…)", que MANDA sobre lo que esa entrada dice de la orden. Revisala y, si la querés más corta, resumila; CLAUDE.md no necesita cambios (el índice ya apunta a `cuentas-corrientes.md`). En la entrada del 20/10 quedó escrito "cheques: Banco / N° / Fecha de pago / Librador / Importe": eso ya no es así (lo corrige la entrada nueva).

## Qué cambió (lo que ve Facu)
1. **Sin la columna "Librador"** en los cheques de la orden: quedan Banco, N°, Fecha de pago e Importe (con "eCheq" como antes). Se borró `textoLibrador`. La base (`datos_orden_pago`) sigue mandando el librador; la pantalla lo ignora.
2. **Dos hojas iguales en la misma impresión**: la primera dice **ORIGINAL** y la segunda **DUPLICADO**, en un recuadro arriba a la derecha, debajo del número y la fecha. Las dos con las firmas ("Recibí conforme (proveedor) — firma y aclaración" y "Autorizó"). El DUPLICADO empieza siempre en una hoja nueva.
   - En la pantalla se ve solo el ORIGINAL, y arriba de la hoja dice "Se imprimen dos hojas iguales: ORIGINAL y DUPLICADO, las dos con las firmas." (ese aviso no se imprime).
   - Código: `COPIAS_ORDEN_PAGO = ['ORIGINAL', 'DUPLICADO']`; `htmlOrdenPago` arma la hoja una vez (`copia(rotulo)`) y devuelve `<div class="op-copia op-copia--original|--duplicado" data-copia="…">` por cada una. CSS: `.op-copia--duplicado { display: none }` en pantalla; en `@media print` con `html.op-imprimiendo`, `display: block; break-before: page`.
3. **Más compacta (~80%)**: hoja 8.5pt (era 10.5), tabla 7.5pt (era 9.5), relleno de celdas 0.6 × 1.2 mm (era 1.2 × 1.6), títulos, total y logo en proporción, firmas a 15 mm (eran 18). Medido en la maqueta con el PDF de Chromium (A4, márgenes 8 mm): **una copia entra en una hoja con ~30 comprobantes; antes, con ~15** (la fila bajó de 27 a 18 px).
4. **El PDF para compartir**: no existe otro PDF de la orden; el botón es "Imprimir / Guardar PDF" (`window.print()`), así que el PDF es la misma impresión y ya sale sin librador, con ORIGINAL + DUPLICADO y compacto. Lo prueba el e2e generando el PDF de verdad (2 páginas).

## "Se cancelan los siguientes comprobantes": ¿se listan las facturas pagadas?
**Sí, y no había nada roto.** Verificado:
- Base, leída con `pg_get_functiondef` el **23/10/2026**: `pagar_proveedor_mixto` recibe `p_aplicaciones` y las reparte entre el gasto de los cheques (`pagar_proveedor_con_cheques_cartera` → `registrar_pago_proveedor`) y el del resto (`registrar_pago_proveedor`), que escriben `aplicaciones_pago`; después marca los dos gastos con `orden_pago_id`. `datos_orden_pago` arma `facturas` sumando `aplicaciones_pago` de los gastos de la orden, por factura, de la más vieja a la más nueva, con tipo, número, fecha, importe, aplicado y saldo actual.
- Pantalla: `aplicacionesPago` manda solo las tildadas con lo que se aplica (la parcial, parcial) y `htmlOrdenPago` las lista; "Pago a cuenta" solo sale sin facturas.
- La suite nueva arma la cadena entera (formulario → parámetros → un modelo de lo que guarda y devuelve la base, copiado de esas dos funciones → la hoja abierta con `abrirOrdenPago`), con una factura partida entre cheques y transferencia: se lista una vez con lo aplicado sumado.
- **Dato real, para que Facu lo confirme**: la única orden que hay en la base (N-OP-00001 de Cucuruchos Nuss, 22/10/2026, a BADIC S.A.S., 5 cheques, $ 2.262.718) no tiene facturas aplicadas: quedó todo como saldo a favor, aunque BADIC tenía 2 facturas pendientes en Nuss. Por cómo está hecho el formulario (las facturas arrancan sin tildar), lo más probable es que se haya confirmado sin tildar ninguna (pago a cuenta). Si la intención era pagar esas facturas, se puede aplicar ese crédito a las facturas desde la ficha ("Aplicar crédito"); la orden ya impresa va a seguir diciendo "Pago a cuenta" porque el crédito se aplica después, fuera de la orden. No toqué ningún dato.

## Lo decidido sin consultar
- En la pantalla se muestra solo el ORIGINAL (más el aviso de que salen dos hojas), para no duplicar el scroll en el celular; al imprimir salen las dos.
- La letra más chica también se ve en la pantalla (la hoja es una vista previa del papel). En el celular la tabla de comprobantes se desliza de costado dentro de la hoja, igual que antes (la página no tiene scroll horizontal).
- La columna "Tipo" quedó como estaba. En la base `tipo_documento` viene vacío en 11 facturas (sale "—"), "factura" en minúscula en 6 y "otro" en las de saldo inicial. Si Facu quiere, se puede mostrar "Factura" / "Saldo inicial" en vez de "—" / "otro" (solo pantalla, sin tocar la base).

## Pruebas
- `pruebas/test-cuentas-corrientes-orden-pago-copias.js` — 51/51 (nueva).
- `pruebas/mut-cuentas-corrientes-orden-pago-copias.js` — 26/26 (nueva). Una mutación ("abrir la orden no la dibuja") escapó en la primera vuelta: el `for` sobre las copias de una hoja vacía no afirmaba nada; se sumó "la hoja abierta tiene las dos copias".
- `test-cuentas-corrientes-pago-mixto.js` (198/198) y `test-cuentas-corrientes-xss.js` (233/233) actualizadas: los cheques sin librador y las interpolaciones nuevas (`rotulo`, `r`, `r.toLowerCase()`, `copia(r)`) justificadas. `mut-cuentas-corrientes-pago-mixto.js` 134/134 (+10 eq.; una menos que antes porque se fue el `esc(textoLibrador(...))`).
- `e2e/53-orden-pago-copias.spec.js` — 5/5 (1280, 390, 360, tablet 768 × 1024 y el PDF de 2 páginas también con 25 comprobantes); `e2e/49-pago-mixto.spec.js` 12/12 sigue en verde.
- `npm run pruebas`, `node pruebas/check-scripts.js` y `check-bytes`: ver el resumen de la rama.

## Lo que no se pudo probar
- La impresión en una impresora real ni el "Guardar como PDF" del diálogo de cada navegador (Safari, Chrome del celular): se probó el PDF de Chromium (Playwright `page.pdf`), que usa el mismo CSS de impresión.
- Todo en la maqueta (sin sesión real).

## Guion para Facu
1. Cuentas corrientes → un proveedor → abajo, "Órdenes de pago" → "Reimprimir" en una orden.
2. Mirá que arriba de la hoja diga "Se imprimen dos hojas iguales…", que los cheques no tengan "Librador" y que arriba a la derecha diga ORIGINAL.
3. "Imprimir / Guardar PDF" → en la vista previa tienen que aparecer DOS hojas: ORIGINAL y DUPLICADO, las dos con las firmas.

## Qué automatizaría ahora
Contar las páginas del PDF de cualquier hoja imprimible (orden de pago, orden de retiro, pedido, resumen de cuenta) con un helper compartido de e2e (`paginasDelPdf(page)` de este spec, movido a `e2e/ayuda.js`) y una prueba por hoja que diga "con N renglones entra en M hojas". Hoy cada hoja se mide a mano en la maqueta; así, achicar o agrandar una letra que haga saltar una hoja de más daría rojo solo.
