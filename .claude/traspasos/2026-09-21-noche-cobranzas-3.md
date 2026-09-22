# Traspaso — Cobranzas, noche del 21/09/2026 (parte 18): diálogos propios en lugar de prompt / confirm

Para el chat de arquitectura. Actualizar CLAUDE.md, sección **8. Cobranzas** → "PENDIENTES DEL MÓDULO", y la lista de `pruebas/` en "Las suites de verificación viven en `pruebas/`".

## Qué cambió (sin commit todavía; lo commitea quien cierre la noche)

`modulos/cobranzas.html` ya **no usa `window.prompt` ni `window.confirm`** (ni `prompt(` / `confirm(` / `alert(` sueltos: había solo esos dos, verificado con un chequeo estático sobre todo el `<script>`). Se reemplazaron por dos diálogos propios, con el mismo estilo que el de "Salió" (`.cob-modal`, botones `.cob-btn` de 44 px como mínimo):

1. **Descartar un borrador guardado en el celular** (el botón "Descartar" del banner "Hay cobranzas solo en este celular"). Antes era `window.confirm`. Ahora es `#cob-dialogo-confirmar` con "Cancelar" / "Descartar". "Descartar" hace lo mismo que el `true` de antes (borra de IndexedDB y refresca); "Cancelar" y Escape hacen lo mismo que el `false` (nada). La lógica salió del listener a una función con nombre, `descartarBorradorLocal(id)`.
2. **Elegir a qué foto corresponde un cheque cargado a mano, cuando hay varias fotos.** Antes era `window.prompt` pidiendo un número. Ahora es `#cob-dialogo-foto` con un botón por foto ("Foto 1", "Foto 2", …) con la miniatura si se puede cargar (usa `urlDeFoto`, el helper que ya existía; sin miniatura el botón dice igual "Foto N", que es lo que decía el prompt). **Con una sola foto se sigue eligiendo sola, sin diálogo.** Cancelar o Escape = lo que pasaba con el prompt en null: no se agrega el cheque y aparece el mismo aviso ("No se agregó el cheque: hay que decir a qué foto corresponde."). La lógica salió del listener a `agregarChequeAMano()`.

Mecanismo común (`abrirDialogo(id, valorCancelar)` / `cerrarDialogo(valor)`): devuelve una **promesa** que resuelve con la respuesta, así el código que antes era síncrono hace `await` y sigue igual. Al abrir, el foco va al primer botón del diálogo (en el de descartar es "Cancelar", el lado seguro); **Tab y Shift+Tab ciclan adentro**; **Escape cancela**; al cerrar **el foco vuelve al elemento que lo tenía** y se saca el listener de teclado. Los botones fijos se conectan en `conectarDialogos()`, que llama el init.

Una sola diferencia deliberada con el comportamiento anterior, que el nativo hacía imposible: como la respuesta ahora es asíncrona, si con el diálogo de fotos abierto el formulario en pantalla cambiara, el cheque **no** se agrega al formulario viejo (guard `estado.form !== f`). Con el `prompt` síncrono ese estado no podía existir.

**Los diálogos de salida y de motivo que ya existían NO se tocaron**: no tienen foco atrapado ni Escape. No era parte del pedido; si se quiere unificarlos, es mover sus aperturas a `abrirDialogo`.

**Estilos en línea en el diálogo de fotos, a propósito:** `test-cobranzas-escritorio.js` exige que el CSS de abajo de 1100 px sea idéntico al del baseline `d79765b`. En vez de tocar ese baseline, el diálogo reusa `.cob-salida-tipos` y `.cob-btn--grande` y lleva unos `style=""` para la miniatura (está comentado en el HTML).

## Por qué

`window.prompt` / `window.confirm` no se pueden estilar y algunos webviews los bloquean; el proyecto ya había decidido no usarlos (era un pendiente listado en "PENDIENTES DEL MÓDULO").

## Qué se verificó

- `node pruebas/check-scripts.js` → OK (todos los bloques parsean, sin identificadores pisados).
- `node pruebas/controles-cobranzas.js` → 364/364 (baseline `fba6396`); solo altas: los ids y botones de los dos diálogos. Ningún control existente cambió, así que no hizo falta `RENOMBRADOS`.
- **Suite nueva `pruebas/test-cobranzas-dialogos.js` → 68/68**, ejecutando las funciones reales con un `document` falso que sigue el foco y despacha teclas: 1 foto (no abre diálogo, ni por un rato), 3 fotos eligiendo la 2 (el cheque queda con `foto_id` de la 2), Cancelar y Escape (mismo aviso que el prompt en null, no se agrega), formulario cambiado con el diálogo abierto, descartar con sí (dbBorrar con el store y el id, refresca) / no / Escape (no borra), foco al abrir, vuelta del foco, Tab y Shift+Tab en los dos diálogos, y el chequeo estático de cero `prompt`/`confirm`/`alert` fuera de comentarios. Si una promesa quedara colgada, la suite sale en ROJO (no en 0). Contra `fba6396` falla, como corresponde.
- **Mutaciones `pruebas/mut-cobranzas-dialogos.js` → 19/19 detectadas** (sí/no invertidos por los dos lados, Escape que confirma o que no hace nada, Cancelar de foto que elige la 1, sin devolver el foco, sin foco al abrir, Tab y Shift+Tab rotos, listener de teclado que queda, una foto que abre el diálogo, índice corrido, "Foto 0", sin el guard de formulario, cancelar sin aviso, vuelve `window.confirm`, vuelve un `alert()`).
- `pruebas/clasificar.js`: se sumó a sus seguras de Cobranzas la regex `fotos.map((foto, i) =>` (la plantilla anidada solo interpola el índice, y se verifica aparte). `test-cobranzas-xss.js` sigue en verde con el diálogo nuevo adentro del chequeo estático.
- Todas las `pruebas/test-*.js` en verde. Mutaciones de Cobranzas corridas de a una: xss 222/222 (+1 eq.), fotos 27/27 (+2 eq.), escritorio 45/45, cabecera 45/45, números 22/22.
- Supabase: no se tocó (ni lectura hizo falta: ningún objeto de la base cambió).

## Qué tocar en CLAUDE.md

- Sección 8 Cobranzas → PENDIENTES DEL MÓDULO: **sacar** el renglón de `window.prompt` / `window.confirm` (quedó cerrado) y, si se quiere, anotar que los dos diálogos viejos (salida y motivo) todavía no atrapan el foco ni cierran con Escape.
- REGLA de `pruebas/` → "Qué hay hoy", en la línea de Cobranzas: sumar `test-cobranzas-dialogos.js` / `mut-cobranzas-dialogos.js` (68/68 y 19/19).

No hay tareas ni permisos nuevos, ni RPCs cambiadas.
