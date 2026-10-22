# Traspaso — 21/10/2026: "¿Quisiste decir…?" al crear un cono

Rama `ci-prueba/conos-parecidos` (desde `origin/main` f32b687). **Sin integrar. Toca la tablet (`modulos/produccion.html`): se integra SOLO de noche.**
Pedido: `.claude/pedidos/2026-10-21-conos-parecidos.md`. Documentación: `docs/memoria/conos.md` (entrada de arriba) y `docs/memoria/produccion.md` (sub-entrada sobre "+ Agregar cono nuevo").

## Lugares que proponen un cono (grep de `proponer_marca`, 21/10/2026)
1. **La tablet** — `modulos/produccion.html`, Agregar producto → paso Cono → "+ Agregar cono nuevo" (`crearConoNuevo`). **Tocado.**
2. **Conos de papel** — `modulos/conos.html`, "+ Cono nuevo" del buscador de **Anotar para pedir**. **Tocado.**
3. **Conos de papel** — `modulos/conos.html`, "+ Cono nuevo" del buscador de **Agregar cono al pliego** (comparte `htmlResultados` y `proponerCono` con el 2). **Tocado.**
- **No tocado**: Configuración de Producción (`modulos/produccion-gestion.html`, campo "Cono nuevo"), que usa `guardar_marca` y no `proponer_marca` (crea directo y aprobado; la base no le pide `p_es_otro`).

## Qué se hizo
- Al escribir el nombre (3 letras o más, 300 ms después de la última tecla) se piden los parecidos (`conos_parecidos`) y se muestran arriba del botón de crear, bajo "¿Quisiste decir…?". En la tablet son botones de 56 px. Tocar uno **elige ese cono**: no se crea nada.
- Con un parecido "igual", el botón dice "Es otro cono, crearlo igual" y pide "¿Seguro que no es CASERATO?"; recién al confirmar manda `p_es_otro = true`. El "No" elige el que ya existe.
- Si la base contesta "Ya existe el cono X…", el mensaje va tal cual y se ofrece "Elegir X" (y "Es otro cono, crearlo igual", que también pregunta).
- Sin internet no se piden parecidos y crear funciona como antes (la base frena igual).

## Decisiones tomadas sin consultar
- En conos.html los parecidos solo se piden cuando se ofrece "+ Cono nuevo" (es decir, cuando lo escrito no coincide exacto con un cono); van entre los resultados del buscador y el botón de crear, y sin repetir uno que ya está en los resultados.
- La confirmación en la tablet usa el cartel de siempre (`pedirConfirmacion`); en conos.html, el cartel de la pantalla (`abrirModal`). Tocar afuera solo cierra.
- Después del error "Ya existe…" también se ofrece "Es otro cono, crearlo igual" (el mensaje de la base dice "si de verdad es otro cono, confirmalo"); pasa por la misma pregunta.
- Si la base no contesta los parecidos (error), no se muestra nada y crear sigue andando.
- Un parecido que no está en el catálogo de la tablet (dado de baja) no se elige: se dice, igual que con `ya_existia`.

## Lo que no se pudo probar
- Contra la base real (`conos_parecidos` de verdad, con `pg_trgm`): todo con la maqueta y el sandbox.
- La tablet física (el dedo y el teclado en pantalla): se midió el botón (≥ 56 px) a 1000×540 en Chromium.

## Guion para Facu (2 minutos)
1. En la tablet: Agregar producto → un producto con cono → "+ Agregar cono nuevo" → escribí "CASERATTO". Arriba aparece "¿Quisiste decir…? CASERATO": tocalo y queda elegido, sin crear nada.
2. Probá de nuevo y tocá "Es otro cono, crearlo igual": pregunta "¿Seguro que no es CASERATO?".
3. En Conos de papel → Por pedir, escribí "caseratto" en el buscador: lo mismo.

## Resultado de las pruebas
- `npm run pruebas` 271/271 en verde (incluye check-bytes); `node pruebas/check-scripts.js` OK.
- `test-produccion-conos-parecidos.js` 55/55 · `mut-produccion-conos-parecidos.js` 26/26.
- `test-conos-parecidos.js` 69/69 · `mut-conos-parecidos.js` 39/39 (+1 equivalente) · `mut-conos-anotar-nuevo.js` 28/28 (anclas al día; `test-conos-anotar-nuevo.js` 46/46).
- `e2e/54-conos-parecidos.spec.js` 10/10 (tablet y conos, a 1000×540 y 390×844); `e2e/46-conos-anotar-nuevo` y `e2e/31-sin-cono-unico` siguen en verde.

## Qué automatizaría ahora
- **Una prueba que liste los lugares que llaman a cada RPC "de alta"** (`proponer_marca`, `guardar_marca`, `guardar_cliente`…) y exija que cada uno tenga su suite: hoy hubo que buscarlos con grep y decidir a mano cuál entraba. Con un mapa `RPC → pantallas` versionado en `pruebas/`, un llamado nuevo sin prueba daría rojo.
- **Helpers duplicados a propósito** (`listaParecidos`, `conoQueYaExiste` están en las dos pantallas, como manda la regla de duplicar): una prueba que compare las dos copias y avise si una cambia sin la otra.
