# Traspaso para el chat de arquitectura — la planta a 360 px (10/10/2026)

**Para pegarle al chat de arquitectura (dueño de CLAUDE.md).** Lo escribió el subagente de Producción en la rama `ci-prueba/planta-360` (creada desde `origin/main` en `febafa9`). No se tocó la base (solo lectura), ni RPCs, ni permisos: solo CSS de `modulos/produccion.html` y pruebas de navegador en `e2e/`.

## Qué cambió y por qué

Facu vio que a 360 px de ancho (los celulares más angostos) la planta no se salía de costado pero cuatro cosas se cortaban POR DENTRO, tapadas por su caja o pisadas por lo de al lado, sin ningún scroll que lo delatara: (a) el lote del tablero ("Lote 7033" no entraba en la tarjeta), (b) el encargado de Abrir turno ("Fe…" al lado de la fecha), (c) "Andando" de Paradas (pisado por "1 parada en el turno · Ver") y (d) la tarjeta de la Sala de masa ("Máquina / 2" partido, "Turno mañana" saliéndose de su chip, el número de masas tapado por arriba y "Parada · se puede hacer masa igual" tapado por "+ Nueva masa"). Midiendo apareció que (b), las pestañas de las máquinas ("M1 · 7033" cortado por los costados) y el número de la Sala ya pasaban a 390 px.

Solo CSS, en `modulos/produccion.html`:
- **Bloque "LA PLANTA EN UN CELULAR" (debajo de 520 px), agregado al final:** el encargado de Abrir turno ocupa su renglón (`.pr-abrir__caja--encargado { flex: 1 1 100% }`); con las pestañas de las máquinas, "‹ Inicio" queda solo con la flecha (44 px; el texto sigue para el lector de pantalla); en la Sala de masa cada tarjeta mide lo que necesita (`grid-auto-rows: auto`, la lista scrollea si son muchas máquinas), el número de masas va a 64 px, la tarjeta recorta con `overflow: clip` (con `hidden` la grilla la achicaba por debajo de su contenido y se tapaba o se pisaba con la de abajo) y su cuerpo `flex: 1 0 auto`.
- **Bloque nuevo "LA PLANTA A 360 PX" (`@media (max-width: 380px)`):** el lote del tablero a 34 px con la tarjeta en 12 px de relleno; "Andando" con su ancho (`flex: 0 0 auto`: "N paradas · Ver" baja de renglón si no entra); en la Sala, "Máquina 2" y "Turno mañana" sin partirse (`nowrap`, la columna izquierda con `min-width: min-content`) y lo de la derecha bajando de renglón, alineado a la derecha. Es 380 y no 400 a propósito: así un celular de 390 no cambia el lote ni "Andando" (que a 390 entran).

## Qué se verificó y contra qué

- **La tablet no cambió:** se volcaron las cajas (`getBoundingClientRect`) de todo lo visible en cada paso de `e2e/pasos-planta.js` con el CSS de `origin/main` y con el nuevo: **1000 × 540: 4.073 cajas, 600 × 940: 3.996, 1280 × 800: 4.079 → 12.148 cajas, 0 distintas.** A 390 cambian solo las pantallas tocadas a propósito (Abrir turno, las pestañas, la Sala).
- **Prueba nueva `e2e/30-planta-360.spec.js`:** recorre los pasos de `e2e/pasos-planta.js` en la maqueta a 360 × 780 (una ventana y un celular emulado) y da rojo si la página o el marco se sale de costado, si algo se sale de su recuadro, si un campo tiene letra de menos de 16 px, o si una pieza se corta por dentro (**`medirCortesPlanta` + `PIEZAS_CELULAR`, nuevas en `e2e/medir-pantalla.js`**: el lote, el chip de estado, el encargado, "Andando", la tarjeta de la Sala y su cuerpo, las pestañas — su contenido no más ancho que ella, nada de adentro fuera de su recuadro, no tapada por la caja de arriba que recorta, y dos de la misma clase no se pisan). Exige además que cada pieza se haya visto al menos una vez, y tiene una prueba del propio medidor. **Contra el CSS de antes da ROJO en las cuatro** (lote 12, encargado 4, "Andando" 8, Sala 12, pestañas 80 avisos en la ventana); con el arreglo, verde.
- `medirCostado` se mudó de `e2e/29-planta-390.spec.js` a `e2e/medir-pantalla.js` (sin cambios) y **`29-planta-390` ahora también mide los cortes por dentro a 390**.
- En la maqueta (`MAQUETA_URL` a un servidor propio, porque el 4180 lo tenía otra copia del repo): `8-planta-tamanos`, `16-planta-sin-zoom`, `25-planta-paradas`, `29-planta-390` y `30-planta-360` → 32/32 en verde.

## Qué tocar en CLAUDE.md

En el módulo 10 (Producción), entrada **"LA PLANTA EN UN CELULAR, SIN SALIRSE DE COSTADO (09/10/2026 …)"**, reemplazar la frase final

> A 360 px no hay scroll de costado, pero quedan recortes internos (lote del tablero, encargado de Abrir turno, "Andando" de Paradas, tarjeta de la sala).

por algo como:

> **A 360 px (10/10/2026, rama `ci-prueba/planta-360`):** se arreglaron los cortes por dentro con CSS (bloque `@media (max-width: 380px)` "LA PLANTA A 360 PX" más unas líneas en el de 520): el lote del tablero a 34 px, el encargado de Abrir turno en su renglón, "Andando" entero, la tarjeta de la Sala de masa del alto que necesita (`overflow: clip`, la lista scrollea) y, ya desde 390, las pestañas de las máquinas sin cortar ("‹ Inicio" queda solo con la flecha). La tablet no cambió (12.148 cajas idénticas a 1000×540, 600×940 y 1280×800). Lo cubre **`e2e/30-planta-360.spec.js`** (360 × 780, ventana y celular) con **`medirCortesPlanta`** de `e2e/medir-pantalla.js`, que también corre a 390 en `29-planta-390`.

## Lo que no se arregló ni se probó

- **Siguen cortados con "…" (a 360 y también a 390), fuera de los cuatro pedidos:** el nombre de la persona arriba ("F." / "A."), "Producción" en la banda de ¿Quién sos? (4 px), "Anterior (última)" en la receta, "Federico Silva ENCARGADO" y el total del turno en la planilla, los nombres largos de producto en Agregar producto y el aviso de empaque que falta. La mayoría es un corte con "…" deliberado.
- Un lote de 6 cifras (los de la fábrica de pruebas, 900001) no entra a 34 px en una tarjeta de 360: no se midió con datos de la fábrica de pruebas.
- Nada en un celular de verdad; todo en la maqueta (Chromium).

## Qué automatizaría ahora

El volcado de cajas "antes / después" que prueba que la tablet no cambió se escribió a mano en el scratchpad dos veces (la rama planta-390 hizo lo mismo). Convertirlo en `e2e/comparar-cajas.js` (vuelca con el CSS de `origin/main` servido desde un `git show` y con el actual, y compara por tamaño) dejaría a cualquier cambio de la planta en celular probar en un comando que la tablet quedó idéntica.
