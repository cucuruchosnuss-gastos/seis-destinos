# Traspaso — Caja: suite de regresión de XSS (noche del 21/09/2026)

Para el chat de arquitectura. Quien lee esto no vio el trabajo: todo lo necesario está acá.

## Qué se hizo y por qué

CLAUDE.md dice que el barrido de XSS de `modulos/caja.html` se cerró en `a3fd993` (17/09/2026), pero la prueba que lo demostraba se había perdido (vivía en un scratchpad). Esta tarea la reconstruye y la versiona, para BLOQUEAR el estado actual. **No se tocó `modulos/caja.html`**: solo dos archivos nuevos en `pruebas/`.

- `pruebas/test-caja-xss.js` (nuevo) — el mismo método que las suites de Gastos, Stock e Ingreso:
  1. **Renders EJECUTADOS** con un `document` falso y una marca distinta por campo (`"><b data-xss="campo">`), sobre las funciones reales del archivo (juntadas por clausura): total de la empresa con su desglose "dueño — cuenta", listado agrupado por unidad (incluidas las iniciales del avatar), Directorio (personas y cuentas), modal de datos bancarios (se verifica que va por DOM y `textContent`, nunca por `innerHTML`), ficha (saldos, desglose gestionable de Empresa con logo de unidad, desglose de una ficha ajena), acciones y filtros de la ficha, multiselect de la ficha de Empresa y de "Todos los movimientos", filas de movimiento (persona, contraparte, "Entregado a…", nombre de cuenta, tipo desconocido, razón social y categoría del gasto, descripción), solicitudes pendientes en sus tres ramas de botones, selects (contraparte como super_admin y como usuario común, las cuatro de `opcionesCuenta()`, unidad de la cuenta nueva, persona de Retiros), y la carga + totales + filas de Retiros y de "Todos los movimientos". Las monedas se prueban con marca aunque tengan CHECK.
  2. **Chequeo estático sobre TODO el `<script>`**: cada interpolación de HTML, cada asignación a `innerHTML` completa y cada plantilla sin HTML propio que termina en un `innerHTML`, escapada o justificada en una lista de seguras POR FUNCIÓN con su motivo (una entrada sin uso es rojo). Contexto: atributo sin comillas, `on*=`, `href`/`src` sin `encodeURIComponent` (única excepción: el `src` del logo de unidad, que sale de la constante `LOGOS_EMPRESA`), `style`. Además afirma que `importeHtml()` es `esc(formatearImporte())` y que `formatearImporte()` y `etiquetaMovimiento()` siguen en texto plano (a propósito, alimentan el Excel).
  3. **Sinks de navegación.** Se buscaron a propósito, por el hallazgo de `?volver=` en Gastos (`8f73654`). **Caja no tiene ninguno abierto:** no lee NINGÚN parámetro de la URL (cero `URLSearchParams` / `location.search` / `location.hash`), sus únicas dos navegaciones van a la ruta literal `'../dashboard.html'`, no asigna `.src` ni `.href` en runtime, y el único link armado con datos —"Ver gasto →"— es prefijo fijo `gastos.html?gasto=` + `encodeURIComponent(m.gasto_id)` + `&volver=` + `encodeURIComponent(location.href)`, entre comillas DOBLES. La suite ejecuta ese href con un `gasto_id` que trae `javascript:` y una comilla, y con un `location.href` que trae `"`, `'`, `<` y `>`. (El `volver=` que Caja arma lo LEE Gastos, que desde `8f73654` solo navega a su mismo origen.)
- `pruebas/mut-caja-xss.js` (nuevo) — runner de mutaciones (`mutar.js`): automáticas por cada `${esc(...)}` de 13 funciones de render, más 10 a mano (el `esc` de adentro de `importeHtml()`, la moneda de `formatearImporteCentavosSuaves()`, la categoría del gasto concatenada con `' · '`, los dos `encodeURIComponent` del href y su delimitador de comillas, el título y los valores del modal de datos bancarios pasados a `innerHTML`, el lookup del medio en el Directorio y el logo reemplazado por el nombre de la unidad).

## Números

- **172 interpolaciones** en el `<script>`, **129 arman HTML**; **38 asignaciones a `innerHTML`**; 49 interpolaciones de HTML empiezan directamente con `esc(`.
- **Todas estaban cerradas**: el barrido de `a3fd993` se sostiene. Ninguna hoja cruda, ningún sink de navegación. **Cero hallazgos.**
- Suite: **171/171** sobre el archivo actual (**148** de renders + **23** del estático). **Mutaciones: 59/59 detectadas, sin equivalentes.**
- Contra el archivo anterior al barrido (`a3fd993~1`) la suite da **ROJO** (17/27: los renders no pueden ni correr porque `esc()` no existía, y el estático lista cada sink crudo).

Verificado contra la base el 21/09/2026 (solo lectura), para justificar las entradas de la lista de seguras: `caja_movimientos.fecha` y `caja_solicitudes_movimiento.fecha` son `date` (lo que pasa por `formatearFecha()`); `cuentas_caja.medio` tiene CHECK `('efectivo','banco')`; `caja_movimientos.tipo` y los dos `medio_pago` tienen CHECK; las tres `moneda` tienen el CHECK de 12 códigos.

## Qué hay que tocar en CLAUDE.md

1. **Módulo Caja**, en el párrafo "TODO EL TEXTO LIBRE SE ESCAPA (`a3fd993`, 17/09/2026)": agregar que desde el 21/09/2026 lo bloquea `pruebas/test-caja-xss.js` + `mut-caja-xss.js` (números de arriba), y que **no tiene sinks de navegación** (no lee parámetros de la URL; el href "Ver gasto" es prefijo fijo + `encodeURIComponent` + comillas dobles). Donde hoy dice "La prueba da 148/148 … 88/88 mutaciones", esos números eran de la suite perdida: reemplazarlos por los de esta.
2. **Aprendizajes clave → regla "TODO TEXTO QUE NO SEA LITERAL DEL CÓDIGO SE ESCAPA…"**: en la lista de módulos, `caja.html` pasa a tener suite versionada.
3. **Reglas de oro → las suites viven en `pruebas/`**: agregar `test-caja-xss.js` / `mut-caja-xss.js` a la lista de lo que hay, con los números.

## Qué se corrió

- `node pruebas/check-scripts.js`: OK, todos los bloques parsean, sin identificadores pisados.
- Todas las `pruebas/test-*.js` y `controles-cobranzas.js`, de a una: todas verdes (caja-numeros 379/379, caja-xss 171/171, gastos-xss 243/243, stock-xss 234/234, materia-prima-xss 167/167, cobranzas-xss 323/323, controles 354/354, el resto también verde).
- `node pruebas/mut-caja-xss.js`: 59/59.
- Ningún cambio en la base, en `modulos/`, en `js/` ni en `css/`.

## Un solo commit

`pruebas/test-caja-xss.js`, `pruebas/mut-caja-xss.js` y este traspaso. No hay arreglo que separar.
