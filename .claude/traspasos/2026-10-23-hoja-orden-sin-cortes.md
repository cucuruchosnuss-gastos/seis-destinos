# Traspaso — la hoja de la orden sin cortes de más (23/10/2026)

Rama `ci-prueba/hoja-orden-sin-cortes`, desde `origin/main` `df19453`. Pedido: `.claude/pedidos/2026-10-23-hoja-orden-sin-cortes.md`. NO se tocó la base (solo SELECT).

## Qué pasó con la N-0025 (la causa)

Reproducido con los datos reales de la N-0025 (leídos de la base) en Chromium y en WebKit (el motor de Safari, Playwright 2359), a 1280, 768, 390 y 360 px, en la Carga y en Administración:

- **En WebKit la hoja se medía SIN sus estilos.** `ESTILOS_HOJA` empezaba con `@import url(Google Fonts)`. En WebKit, una `<style>` con un `@import` que todavía está bajando no aplica NINGUNA de sus reglas, y además frena a las hojas que se agregan después. `medirHoja` medía en ese momento: el logo salía del tamaño de la imagen (766 × 640 → ~160 mm de alto), la cabecera ("fijo") medía **197,7 mm**, los renglones 4,8 mm (sin estilos de tabla) y la copia entera 242,5 mm. Con eso `planHoja` decía "no entra en media hoja" y, como cabecera + renglones + final pasaba los 281 mm, partía en "HOJA 1 DE 2" (4) y "HOJA 2 DE 2" (1). Cuando se imprimía, los estilos ya habían llegado: por eso la hoja impresa se veía normal pero partida. Facu imprimió desde Safari (iPhone/iPad/Mac): en Chromium no pasa.
- **Además, `document.fonts.ready` se esperaba ANTES de poner el texto**: como nadie había pedido todavía la letra Archivo, no esperaba nada, y la primera medida podía salir con la letra de respaldo.
- **En Administración (con precios), en Chromium, la N-0025 medía 141,6 mm** (las columnas de precio achican el producto y dos renglones pasaban a dos líneas): ahí "no entró en media hoja" aunque se midiera bien. Con la media hoja más justa ahora mide 106,0.
- Descartado: zoom del navegador (CSS px y mm guardan la misma proporción), el ancho del celular (la caja de medir tiene 194 mm fijos y `position: fixed`), `display:none` (se mide afuera de la pantalla, no escondida), el `min-height` de `.rh-hoja--entera` (la copia se mide con `height: auto`), el logo sin cargar (se esperaba y no cambia el alto: el círculo tiene alto fijo... con estilos).

## Qué se hizo (todo en `js/retiros-comun.js`)

1. **La letra en su propio `<link id="rh-fuente">`, agregado DESPUÉS del `<style id="rh-estilos">`** (si el link fuera antes, WebKit frena el style hasta que Google contesta: probado).
2. **`medirHoja`**: pone el texto, pide la letra con `document.fonts.load('400/600/700/800 14px Archivo')`, espera el link de la letra (load/error) y `fonts.ready`, las imágenes, y que la hoja tenga sus estilos (`hojaConEstilos`: la copia en `display: flex` y el logo de 56 px). Todo con tope de 3 s. Devuelve `estilos: true/false`.
3. **`planHoja`**: si la copia entera entra en una hoja (≤ 281 mm), UNA hoja por copia, sin "Sigue en la hoja". Si las medidas son absurdas (`medidasRaras`: `fijo`, `final` o `intermedio` más altos que la hoja entera, cabecera + final que no entran juntos, algo que no es un número, la copia de 0 mm o `estilos: false`), media hoja si la copia entra, si no UNA hoja entera por copia (no se confía en las partes). Lo que de verdad no entra se parte como antes.
4. **El registro**: una medida absurda va a Errores de la app con `registrarError` de `js/salud.js` (evento `hoja`, mensaje "Hoja de la orden: medida rara (<motivo>)", detalle JSON con la orden, si tenía precios, las medidas en mm ENTEROS y los renglones separados con espacios —`limpiarTexto` tapa los números de 4 cifras o más, y "129,2" o "12,8,12" saldrían "#"— y el plan). Nunca rompe la impresión.
5. **Media hoja más justa** (mismo diseño, blanco y negro): renglones 14 px y cajas 18 px (antes 16 / 22; insumo 14), cajas con interlineado 1, celdas con 2 px de relleno e interlineado 1,15; cabecera y logo 56 px (antes 70), datos de la empresa con interlineado 1,15, recuadro del número con 2 px de relleno; espacios entre bloques 3 px (antes 8), margen de la copia 1 mm (antes 2), firmas 26 px (antes 34), encabezado de la tabla y total con menos relleno.

## Medidas (mm de la copia entera; media hoja = 136)

| Orden | Carga (sin precios) | Administración (con precios) |
|---|---|---|
| N-0025 real, antes (Chromium) | 129,2 | 141,6 (no entraba) |
| N-0025 real, antes (WebKit, primera medida) | 242,5 (sin estilos, fijo 197,7) | 242,5 |
| **N-0025 real, ahora** (Chromium = WebKit) | **101,9** (margen 34,1) | **106,0** (margen 30,0) |
| **8 renglones de prueba** (los 5 de la N-0025 + 3, con observaciones) | **120,1** (margen 15,9) | **124,2** (margen 11,8) |
| 8 renglones "pesada" (3 con dos lotes, observación larga) | 123,9 (margen 12,1) | 140,3: no entra → UNA hoja entera por copia |

## Decidido sin consultar

- **"Nunca una hoja con un solo renglón cuando el total entraba en una"**: se cumple con dos reglas: si la copia entera entra en una hoja va en una, y si cabecera + renglones + final entran, también (el bucle de siempre). NO agregué un "rebalanceo" que pase renglones de la hoja anterior a la última cuando de verdad no entra: rompía un assert viejo de `test-retiros-hoja.js` (22 renglones de 9 mm → 21 + 1, con copia de 300 mm) que el pedido dice no relajar.
- **Un renglón más alto que la hoja NO es "medida rara"** (va solo en su hoja, como siempre: lo exige un assert viejo).
- Achiqué también la cabecera y los espacios **en la hoja entera** (los estilos son los mismos para las dos: medir con unos y dibujar con otros sería otra fuente de errores).
- Evento `hoja` en `errores_app` (texto libre, sin CHECK: verificado). Sin patrón en `errores_conocidos`, sale como "Error sin explicación todavía" (gravedad error): visible.
- Para llegar a 10 mm de margen en Administración toqué, además de lo pedido, el interlineado de los datos de la empresa y el relleno del recuadro del número (cabecera). El título, el cliente (26 px), el código (28 px) y los anchos de las columnas no cambiaron.

## Asserts viejos actualizados (al valor nuevo pedido, ninguno relajado)

- `test-retiros-hoja.js`: logo 70 → 56 px; cabecera 70 → 56 px; cajas 22 → 18 px; producto y lote 16 → 14 px; la letra: antes exigía el `@import` adentro de `ESTILOS_HOJA`, ahora exige el `<link>` con `FUENTE_HOJA` y que NO haya `@import` (más estricto).
- `mut-retiros-hoja.js`: anclas al texto nuevo (td, recuadro, `if (copia <= media)`), "sin la letra Archivo" saca el `f.href`, y una mutación nueva que vuelve a poner el `@import`.
- `e2e/28-hoja-retiro.spec.js`: el caso "25 renglones → hojas enteras" pasó a **40 renglones**: con la letra más chica, 25 renglones ya entran en UNA hoja entera (es justamente lo pedido). Los asserts del caso son los mismos.
- `sandbox-retiros.js` / `sandbox-administracion.js`: las funciones y la constante nuevas (`medidasRaras`, `textoMedidaRara`, `registrarMedidaRara`, `hojaConEstilos`, `esperarHojaLista`, `ALTO_LOGO_HOJA_PX`).

## La rama vieja `origin/ci-prueba/orden-impresa-faltante` (3123244, NO integrada)

No la toqué. **Lo mío la pisa** en `planHoja`, en los tamaños de letra (ella bajaba ~22 % todo; yo bajé los renglones a 14/18 y achiqué cabecera y espacios) y en la forma de partir (ella partía cada hoja también al medio): si alguien la quiere integrar, va a chocar en `js/retiros-comun.js`, `test-retiros-hoja.js`, `mut-retiros-hoja.js`, los sandboxes y `e2e/28`. **Lo que sigue sirviendo de ella y NO hice**: la hoja sin "faltan N" ni "pendiente de revisión" (caso N-0013), los lotes reales sumados y sin "INICIAL"/"SIN STOCK", no repetir "Caja sin cono · sin cono" (la N-0025 lo muestra así: "Cucuruchón Mini · Caja sin cono · sin cono"), y los números que no se parten (`.rh-tabla td` le gana a `.rh-plata { white-space: nowrap }`, ver aprendizajes del 15/10). Recomiendo rehacer esas cuatro cosas en una rama nueva desde este main, no integrar la vieja.

## Verificado en la base (SELECT, 23/10/2026 ~12:15 de Argentina)

- `ordenes_retiro` N-0025: Cucuruchos Nuss, 21/10/2026 14:46 UTC, confirmada, transporte "Ostera", observaciones "Las 4 cajas de cucuruchon son de cambio", cliente SALVADOR LOFORTE (Cordoba), cargó Usabarrena Franco, sin valorizar.
- `orden_retiro_items` (5) + lotes de `stock_terminado_movimientos` (despacho, como `mis_ordenes_retiro`): 62 Cucuruchón Mini · Caja sin cono (6244-2 ×20 · 6252-1 ×42); 30 Obleas dulces · Caja (DOLCE-2110); 15 Capelina Grande · Caja (RODRIGOA-2110); 9 Cucuruchón Mini · Caja con cono · LLAO LLAO (INICIAL); 4 Cucuruchón Grande · Caja sin cono (6245-1).
- `registrar_error_app(p_pantalla, p_mensaje, p_detalle, p_url, p_dispositivo, p_evento)` (`pg_get_functiondef`): SECURITY DEFINER, sin sesión no hace nada, tope 200 por persona por día, `p_evento` texto libre (40). `errores_app` sin CHECK (solo FKs y PK). `errores_resumen`: lo sin patrón conocido sale como error.

## Pruebas

- `node pruebas/test-retiros-hoja-sin-cortes.js` 74/74; `node pruebas/mut-retiros-hoja-sin-cortes.js` 29/29.
- `node pruebas/test-retiros-hoja.js` 171/171; `node pruebas/mut-retiros-hoja.js` 78/78.
- `e2e/54-hoja-sin-cortes.spec.js` 14/14 (N-0025 en la Carga y en Administración a 390, 360, tablet y 1280: media hoja, una página en `page.pdf`, nada recortado, sin scroll horizontal ni errores; 8 renglones con 10 mm de margen; Google Fonts demorada 2,5 s y caída; WebKit a 390 y 1280 con la letra demorada; el PDF de Enviar con html2canvas + jsPDF en una página). `e2e/28-hoja-retiro.spec.js` 3/3, `e2e/5-maqueta.spec.js` verde.
- `npm run pruebas` 271/271 en verde; `node pruebas/check-scripts.js` OK (504 imports); `node pruebas/check-bytes.js` verde.

## Lo que no se pudo probar

- **Safari de verdad** (iPhone/iPad/Mac): solo WebKit de Playwright en Windows. El motor es el mismo, pero conviene que Facu imprima la N-0025 desde el equipo donde le falló.
- **La impresión real con el diálogo de Safari** (márgenes, escala): no se puede automatizar. Si el diálogo tiene "Escala" distinta de 100 % o márgenes propios, la media hoja puede no entrar igual: la hoja trae `@page { margin: 8mm }`.
- Que el registro llegue a `errores_app` con sesión real (en la maqueta la RPC es falsa; en la suite se espía `registrarError`).

## Guion para Facu (2 minutos)

1. Desde el mismo equipo donde falló (Safari), Administración → la orden N-0025 → Imprimir: tiene que salir UNA hoja con el ORIGINAL arriba y el DUPLICADO abajo.
2. Lo mismo desde la Carga (Mis retiros → la N-0025 → Imprimir).
3. "Enviar" la N-0025: el PDF tiene una sola página.

## Qué automatizaría ahora

- **El caso más caro fue que el bug solo existía en Safari y ninguna prueba corría la hoja en WebKit.** Ya quedó `e2e/54` con WebKit y la letra demorada. Lo próximo: un **"medidor de hoja" único** en `e2e/` (función `medirHojaEn(page, orden, { motor, demoraLetra })`) que usen `28`, `54` y `5-maqueta`, y que corra cada orden de `e2e/maqueta/datos` en Chromium **y** WebKit: hoy cada spec arma su propia medición.
- **Un patrón en `errores_conocidos` para "Hoja de la orden: medida rara%"** (lo carga el chat de la base): con título y "qué hacer" en castellano, para que la próxima medida rara se entienda sola en Errores de la app.
- **Una suite que busque `@import` en cualquier `<style>` inyectado por JS** (`js/*.js`): es la misma trampa para cualquier otra hoja (el resumen de cuenta, los PDF).
