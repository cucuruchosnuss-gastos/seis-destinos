---
name: comparar-con-diseno
description: Comparar una pantalla real con el diseño de Claude Design lado a lado, al mismo tamaño y con los mismos datos, para que se vea EXACTAMENTE como lo dibujó. Usala después de aplicar un handoff (skill aplicar-handoff-de-diseno), cuando Facu dice "que se vea igual al diseño", o para revisar una pantalla que ya tiene su diseño en e2e/disenos/.
---

# Comparar con el diseño

Facu quiere que lo diseñado se vea **exactamente** como lo dibujó Claude Design: copiado tal cual, sin reinterpretar. Mirar el diseño y la pantalla por separado no alcanza (se "ve parecido" y no lo es): esta skill los pone **lado a lado, al mismo tamaño, con los mismos datos**, y marca en rojo dónde difieren.

## Las piezas (ya existen, no las reescribas)

- **`e2e/disenos/<nombre>/<nombre>.dc.html`** — el lienzo del handoff, copiado del .zip (el único cambio: `../support.js`). Cada pantalla es un recuadro del tamaño exacto con su id ("4a", "9e", "10b").
- **`e2e/diseno.js`** — `abrirDiseno(page, base, nombre)` abre el lienzo y devuelve los recuadros `[{ clave: '<id>-<ancho>x<alto>', id, titulo, w, h }]`; `fotoDelDiseno(page, clave)` le saca la foto a uno.
- **`e2e/comparar.js`** — `comparar(page, pngDiseno, pngReal, { titulo, salida })` arma la imagen diseño · real · diferencias y devuelve `diferencia` (la parte de la pantalla distinta, por celdas de 8 × 8 px: un texto distinto casi no cuenta, un bloque fuera de lugar sí).
- **La maqueta** (skill `mirar-en-maqueta`) con un juego de datos IGUAL a los datos de ejemplo del diseño: `pruebas/datos-maqueta/<nombre>.js` (mismas personas, mismas máquinas, mismos lotes, la misma hora) y el reloj fijo con `page.clock.setFixedTime`.
- **El molde**: `e2e/9-comparar-planta.spec.js` + `e2e/pasos-comparar-planta.js` (cómo llevar la app a cada pantalla del diseño, en orden y en la misma pestaña).

## Pasos

1. **El diseño en el repo.** Si no está, copiá el `.dc.html` del handoff a `e2e/disenos/<nombre>/<nombre>.dc.html` y su README al lado. Listá los recuadros: `node -e` NO (hook); usá un script en el scratchpad con `abrirDiseno` que imprima las claves.

2. **Los mismos datos.** Armá `pruebas/datos-maqueta/<nombre>.js` copiando los datos de ejemplo del `.dc.html` (buscá los arreglos de nombres, máquinas, lotes, la hora "28/09/2026 · 15:58"). `npm run maqueta:datos` genera el `.json`. Un estado que los datos fijos no tienen (un error, un PIN incorrecto) se arma en el paso con `globalThis.__maqueta.rpc[<rpc>] = <respuesta>`.

3. **Los pasos.** Un `e2e/pasos-comparar-<nombre>.js` con `[id del diseño, async (page) => { … }]` por pantalla, en el orden del lienzo; cada paso parte de donde dejó el anterior y termina con un `expect` de que la pantalla está a la vista.

4. **La prueba.** Copiá `e2e/9-comparar-planta.spec.js` a `e2e/<n>-comparar-<nombre>.spec.js` y cambiá el nombre del diseño, los tamaños y los pasos. Umbrales: `AVISO` 0,12 (anotación) y `FALLA` 0,30 (rojo). Corre en cada push con Navegador, sin credenciales.

5. **Correr y MIRAR:**
   ```bash
   COMPARAR_SALIDA=<scratchpad>/comparar npx playwright test --config e2e/playwright.config.js e2e/<n>-comparar-<nombre>.spec.js
   ```
   Deja `<id>-<ancho>x<alto>.png` (diseño · real · diferencias) y `e2e/resultados/comparar/resumen-<ancho>x<alto>.json`. **Abrí cada imagen con Read** y mirala: el número orienta, la foto decide. Para iterar rápido una sola pantalla, un script tipo `mirar.js` (maqueta + pasos hasta un id + screenshot) y la foto del diseño de `fotos-diseno` al lado.

6. **Corregir copiando, no reinterpretando.** Los valores salen del `.dc.html` (los `style=""` del recuadro: tamaños, radios, colores, fuentes, gaps). Buscá el bloque con `grep -n` por un texto de la pantalla y copiá cada valor al CSS (con las variables del módulo cuando el hex ya existe). Repetí hasta que las diferencias sean solo de datos.

7. **Lo que no se puede copiar se dice.** Si el diseño no cubre algo que la pantalla necesita (un control que no dibujó, un estado de error, un dato que la base no tiene), se agrega lo mínimo, discreto, y se anota en el traspaso como **desvío del diseño** con el motivo. Nunca se saca un control para parecerse más: los controles se declaran como dice `aplicar-handoff-de-diseno`.

8. **Al cerrar:** en el traspaso, la tabla de diferencias por pantalla (del resumen) y la lista de desvíos. Cerrá con `cerrar-tanda`.
