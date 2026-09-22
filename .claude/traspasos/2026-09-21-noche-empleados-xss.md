# Traspaso — Empleados: suite de regresión de XSS (noche del 21/09/2026)

Para el chat de arquitectura. Quien lee esto no vio el trabajo: todo lo necesario está acá.

## Qué se hizo y por qué

CLAUDE.md dice que el barrido de XSS de `modulos/empleados.html` se cerró en `3ee44c5` (17/09/2026), pero la prueba que lo demostraba se había perdido (vivía en un scratchpad). Esta tarea la reconstruye y la versiona, para BLOQUEAR el estado actual. **No se tocó `modulos/empleados.html`**: solo dos archivos nuevos en `pruebas/`.

- `pruebas/test-empleados-xss.js` (nuevo) — el mismo método que las suites de Caja y Cuentas Corrientes:
  1. **Renders EJECUTADOS** con un `document` falso y una marca distinta por campo (`"><b data-xss="campo">`), sobre las funciones reales del archivo (juntadas por clausura). Se corre `init()` entero (con sesión, `empleado_tareas` y la carga falsos), así quedan cubiertos las cifras, el listado agrupado por unidad (título de grupo, `data-id`, avatar, iniciales, chip de rol con un `rol_app` raro en la clase, puesto) y el `<select>` de empresa de la importación, que solo se dibuja ahí. Después, la ficha: datos de Naaloo (legajo, CUIL que no tiene 11 dígitos, domicilio, teléfono, fechas), datos laborales, contacto de emergencia, acceso con chips de módulo **incluido el fallback de un módulo desconocido** (`empleado_modulos.modulo` es texto sin CHECK ni FK), acciones; los **dos formularios de edición** que precargan `value="${esc(...)}"` más el `<select>` de unidad; y la cabecera de la ficha (nombre, email, iniciales), que se verifica que va por `textContent`. El `style` del avatar se ejecuta con un nombre malicioso y se afirma que siempre es un hex de `PALETA_AVATAR`.
  2. **La importación de Naaloo de punta a punta**: un Excel falso con una marca en cada columna pasa por el `manejarArchivoExcel()` real. Se verifica qué viaja a `importar_empleados_naaloo` (la unidad elegida; una fecha que no es `dd/mm/yyyy` viaja como `null`), que éxito y error de la RPC van por toast (`textContent` en `js/utils.js`), y que cuando esas filas vuelven de la base el listado, la ficha y los datos laborales las dibujan escapadas. **La importación no dibuja nada del Excel directamente**: lo manda a la RPC y lo muestran después los renders de siempre.
  3. **Chequeo estático sobre TODO el `<script>`**: cada interpolación de HTML, cada asignación a `innerHTML` completa y cada plantilla sin HTML propio que termina en un `innerHTML`, escapada o justificada en una lista de seguras POR FUNCIÓN con su motivo (una entrada sin uso es rojo). Contexto: atributo sin comillas, `on*=`, `href`/`src` sin `encodeURIComponent`, `style` (única excepción: `colorAvatar(emp.nombre)`, que devuelve un hex de la constante). Además: `iniciales()` y `formatearCuil()` solo entran a HTML dentro de `esc()`, y `#ficha-nombre` / `#ficha-email` / `#ficha-avatar` solo se escriben con `textContent`.
  4. **Sinks de navegación: ninguno.** Empleados no lee NINGÚN parámetro de la URL (cero `URLSearchParams` / `location.search` / `location.hash`), su única navegación por código es `window.location.replace('../dashboard.html')` (literal), el único `href` de las plantillas es el literal `accesos.html`, y no asigna `.src` ni `.href` en runtime.
- `pruebas/mut-empleados-xss.js` (nuevo) — runner de mutaciones (`mutar.js`): automáticas por cada `${esc(...)}` de 6 funciones de render (incluido `init()`, por el `<select>` de la importación), más 9 a mano: `esc()` deja de escapar la comilla doble o el `&`; nombre, email e iniciales de la cabecera de la ficha pasan a `innerHTML`; `colorAvatar()` devuelve el texto; el `style` del avatar y el link a Accesos reciben un dato de la base (escapado, pero en un contexto donde escapar HTML no alcanza); el chip de módulo deja de escapar solo el fallback.

**Empleados NO importa funciones de números de `js/utils.js`** (solo `mostrarError`, `mostrarExito` y `formatearFecha`, verificado), así que el preludio no lleva `fuenteNumeros()`; la suite lo afirma, y si mañana importa alguna se pone en rojo para revisarla. `formatearFecha` se ejecuta con su código real de `utils.js`.

## Números

- **52 interpolaciones** en el `<script>`, **44 arman HTML**; **12 asignaciones a `innerHTML`**; 25 interpolaciones de HTML empiezan directamente con `esc(`.
- **Todas estaban cerradas**: el barrido de `3ee44c5` se sostiene. Ninguna hoja cruda, ningún sink de navegación. **Cero hallazgos.**
- Suite: **110/110** sobre el archivo actual (**84** de renders + **26** del estático). **Mutaciones: 34/34 detectadas** (25 automáticas + 9 a mano), sin equivalentes.
- Contra el archivo anterior al barrido (`3ee44c5~1`) la suite da **ROJO** (23/28: los renders no corren porque `esc()` no existía, y el estático lista los 26 sinks crudos).

Verificado contra la base el 21/09/2026 (solo lectura), para justificar las entradas de la lista de seguras: `empleados.fecha_nacimiento` y `fecha_alta` son `date` (lo que pasa por `formatearFecha()`); `empleados.rol_app` tiene CHECK `('super_admin','usuario')` (igual se escapa en la clase y se prueba con marca).

## Qué hay que tocar en CLAUDE.md

1. **Módulo Empleados**, en el párrafo "TODO EL TEXTO LIBRE SE ESCAPA (`3ee44c5`, 17/09/2026)": agregar que desde el 21/09/2026 lo bloquea `pruebas/test-empleados-xss.js` + `mut-empleados-xss.js` (números de arriba), que cubre también la importación de Naaloo de punta a punta, y que **no tiene sinks de navegación**.
2. **Aprendizajes clave → regla "TODO TEXTO QUE NO SEA LITERAL DEL CÓDIGO SE ESCAPA…"**: en el renglón de `empleados.html`, "La prueba da 70/70 … 37/37 mutaciones" eran números de la suite perdida: reemplazarlos por los de esta y decir que ahora está versionada.
3. **Reglas de oro → las suites viven en `pruebas/`**: agregar `test-empleados-xss.js` / `mut-empleados-xss.js` a la lista de lo que hay, con los números.

## Qué se corrió

- `node pruebas/check-scripts.js`: OK, todos los bloques parsean, sin identificadores pisados.
- Todas las `pruebas/test-*.js` y `controles-cobranzas.js`, de a una: todas verdes (empleados-xss 110/110, caja-xss 171/171, cuentas-corrientes-xss 183/183, gastos-xss 243/243, stock-xss 234/234, materia-prima-xss 167/167, cobranzas-xss 323/323, controles 354/354, el resto también verde).
- `node pruebas/mut-empleados-xss.js`: 34/34.
- Ningún cambio en la base, en `modulos/`, en `js/` ni en `css/`.

## Un solo commit

`pruebas/test-empleados-xss.js`, `pruebas/mut-empleados-xss.js` y este traspaso. No hay arreglo que separar. (`pruebas/test-cuentas-corrientes-xss.js` figuraba modificado en el working copy antes de esta tarea: no es de este trabajo y no va en este commit.)
