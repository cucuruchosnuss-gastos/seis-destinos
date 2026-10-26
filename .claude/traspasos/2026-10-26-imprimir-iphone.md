# Traspaso — Imprimir en el iPhone y el PDF con las dos copias (26/10/2026)

Pedido: `.claude/pedidos/2026-10-26-imprimir-iphone.md`.
Rama: `ci-prueba/imprimir-iphone` (desde `origin/main` `8c42d68`, que ya tenía integrada `ci-prueba/ingreso-terminado-desde-mp`). Hashes: al final del resumen del chat.
Supabase: solo lectura (la N-0032 se leyó para probar con sus datos: 26/10/2026, confirmada, FERNANDEZ RICARDO, 1 renglón, 42 cajas).

## Qué se hizo (en castellano simple)

- **El iPhone ya imprime.** Safari del iPhone no deja imprimir si la orden de imprimir no sale "pegada" al toque, y la pantalla esperaba hasta 3 segundos (la letra, el logo, medir la hoja) antes de imprimir. Ahora la hoja se prepara **apenas se abre la orden** (la recién cargada, la de "Mis retiros" y la de Administración), así que al tocar **Imprimir** sale de inmediato.
- Si se toca Imprimir antes de que la hoja esté (por ejemplo, el botón de reimprimir de la lista de "Mis retiros", sin abrir la orden), en el iPhone aparece abajo **"La hoja está lista. [Listo, imprimir] [Cancelar]"**: ese botón imprime. En la compu y en Android todo sigue igual.
- En Administración: la hoja de la orden igual; **"Guardar e imprimir" de la división** primero guarda, así que en el iPhone pide "Listo, imprimir"; la **nota de débito** ya imprimía bien.
- **El PDF de "Enviar" ahora trae el original Y el duplicado**, igual que la impresión: en una sola A4 con la línea de corte cuando entra (como la N-0032), o cada copia en sus hojas cuando la orden es larga.

## Decidido sin consultar

1. **La lógica vive en `js/retiros-comun.js`** (la quinta excepción, la hoja compartida por la Carga y Administración): `nuevaImpresion`, `claveHoja`, `hojaLista`, `olvidarHoja`, `prepararHoja`, `esIos`, `imprimirHoja`, `mostrarListoParaImprimir`. Así las dos pantallas se comportan igual.
2. **La hoja se arma en una caja aparte** y pasa al contenedor recién al final, en fila: nunca queda a medio armar ni la pisa una orden anterior que terminó tarde.
3. **En Administración se prepara cada vez que se dibuja la orden** (`pintarOrden`): con precios, y si cambian (valorizar) se vuelve a armar sola; la misma hoja no se arma dos veces.
4. **Fuera del iPhone/iPad no hay cartel**: si la hoja no estaba, se imprime apenas termina (como antes), porque ahí el navegador sí lo permite.
5. **"Enviar" no se tocó**: también espera (arma el PDF) antes de abrir el menú de compartir. Si Safari lo rechaza, la pantalla ya cae a descargar el PDF y abrir el mail. Si en el iPhone no aparece el menú de compartir, es por esto (ver "Qué automatizaría ahora").

## Lo que no se pudo probar

- En un iPhone de verdad: se probó con **WebKit** (el motor de Safari) con un iPhone 13 de Playwright, que no tiene la regla de "pegado al toque" del Safari real; por eso el e2e mira que `window.print()` se llame **dentro del mismo toque** (si eso pasa, Safari lo acepta). Guion para Facu abajo.
- La división en el iPhone en el navegador (el e2e mira la Carga y la orden de Administración; la división está en la suite).

## Guion para Facu (en el iPhone)

1. Órdenes de retiro → Mis retiros → tocá **N-0032** → **Imprimir**: tiene que abrir la ventana de imprimir con el original y el duplicado en una hoja.
2. Volvé a la lista y tocá el ícono de imprimir de otra orden (sin abrirla): aparece "La hoja está lista" → **Listo, imprimir**.
3. **Enviar** en la N-0032: el PDF tiene que tener las dos copias en una página.
4. Administración → la orden → Imprimir.

## Qué automatizaría ahora

- **"Enviar" en el iPhone**: armar el PDF también antes del toque (como la hoja) y llamar a `navigator.share` sin await; es el mismo patrón (`prepararHoja`) aplicado al blob del PDF.
- **Un proyecto WebKit fijo en `e2e/playwright.config.js`** para las pantallas que se usan desde el celular (Carga, Cobranzas): hoy solo el 66 corre en WebKit.
