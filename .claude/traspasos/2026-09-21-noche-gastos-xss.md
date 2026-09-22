# Traspaso — Gastos: suite de regresión de XSS + un sink de navegación cerrado (noche del 21/09/2026)

Para el chat de arquitectura. Quien lee esto no vio el trabajo: todo lo necesario está acá.

## Qué se hizo y por qué

CLAUDE.md dice que el barrido de XSS de `modulos/gastos.html` se cerró en `9a0e9a8` (16/09/2026), pero la prueba que lo demostraba se había perdido (vivía en un scratchpad). Esta tarea la reconstruye y la versiona, para BLOQUEAR el estado actual.

- `pruebas/test-gastos-xss.js` (nuevo) — dos mitades, igual que las de Stock e Ingreso:
  1. **Renders EJECUTADOS** con un `document` falso y una marca distinta por campo, sobre las funciones reales (juntadas por clausura): tarjeta del listado (incluidas las iniciales del avatar), total, barra de filtros y opciones de los multiselect, Proyectos del Taller (con la confirmación de baja), sección del comprobante (ruta propia, ajena sin permiso, URL firmada vieja), aviso de duplicados (wizard y caja), breadcrumb, grillas de destino / vehículos / categorías, selects (moneda, proyecto, empleados, cuentas del wizard y de la edición, con las de Empresa), estado del OCR, aviso de después de guardar, "Facturas ingresadas sin gasto" (lista y error), buscador de proveedor, resumen del wizard (normal y pendiente), detalle del gasto (normal y anulado), formulario de edición del gasto, detalle de la factura, su formulario de edición y el de interés.
  2. **Chequeo estático sobre TODO el `<script>`**: cada interpolación de HTML, cada asignación a `innerHTML` completa y cada plantilla sin HTML propio que termina en un `innerHTML`, escapada o justificada en una lista de seguras POR FUNCIÓN con su motivo (una entrada sin uso es rojo). Contexto: atributo sin comillas, `on*=`, `href`/`src` sin `encodeURIComponent` (las excepciones —logos y `blob:`— justificadas y controladas contra huérfanas), `style` (color del avatar y de la tarjeta, de constantes).
  3. **Sinks de navegación**: `?volver=` y el `data-url` del aviso de duplicados.
- `pruebas/mut-gastos-xss.js` (nuevo) — runner de mutaciones (`mutar.js`).

## Números

- **356 interpolaciones** en el `<script>`, **284 arman HTML**; **46 asignaciones a `innerHTML`**; 104 interpolaciones empiezan directamente con `esc(`.
- **Todas las de `innerHTML` estaban cerradas**: el barrido de `9a0e9a8` se sostiene. Ninguna hoja cruda.
- Suite: **243/243** sobre el archivo nuevo. **Mutaciones: 122/122 detectadas, sin equivalentes** (los `esc()` de constantes los detecta el estático; los de `MEDIOS_PAGO_LABEL`, los renders, porque la suite le agrega a la constante una entrada marcada).

## HALLAZGO: `?volver=` navegaba a cualquier URL (XSS por link armado)

`volverOrigenSiCorresponde()` hacía `window.location.href = decodeURIComponent(volver)` con el `?volver=` de la URL, sin mirar a dónde. Un link `gastos.html?gasto=<id>&volver=javascript:…` ejecutaba código **en la sesión de quien tocaba "Volver" o guardaba la edición** —casi siempre un super_admin, que es quien abre gastos ajenos—. No es un `innerHTML`, por eso el barrido de `9a0e9a8` no lo miró. También permitía redirigir a otro sitio.

**Arreglo** (en `modulos/gastos.html`, solo esa función): el destino se resuelve con `new URL(..., location.href)` y se navega **solo si es http/https del MISMO origen**; si no, se ignora y el detalle se cierra como si no hubiera `?volver=`. Los dos consumidores reales siguen andando: Caja manda su `location.href` absoluto y Cuentas Corrientes `'cuentas-corrientes.html'` o su `location.href` (la suite prueba los dos).

Verificado: la suite da **239/243 (rojo, 4 fallas de `?volver=`) contra el archivo de HEAD** y verde contra el arreglado; dos mutaciones del control (sin el origen; sin protocolo ni origen) se detectan.

**Dos commits sugeridos** (los archivos del primero quedaron en el scratchpad de la sesión, `commit1/pruebas/`):
1. Suite sobre el estado actual: `pruebas/test-gastos-xss.js` con `HALLAZGOS_ABIERTOS = new Set(['volver'])` y `pruebas/mut-gastos-xss.js` sin las dos mutaciones de `?volver=`. Contra HEAD: 240/240 y 120/120.
2. Arreglo: `modulos/gastos.html` (`volverOrigenSiCorresponde`) + las dos líneas de diferencia de las suites (el Set vacío y las dos mutaciones). 243/243 y 122/122.

## Qué hay que tocar en CLAUDE.md

1. **Módulo Gastos**, en el párrafo "TODO EL TEXTO LIBRE SE ESCAPA (`9a0e9a8`…)": agregar que desde el 21/09/2026 lo bloquea `pruebas/test-gastos-xss.js` + `mut-gastos-xss.js` (números de arriba), y el hallazgo de `?volver=` con su arreglo (una línea: solo mismo origen http/https; si no, se ignora). Las pantallas cubiertas son las de la lista de arriba.
2. **Aprendizajes clave → regla "TODO TEXTO QUE NO SEA LITERAL DEL CÓDIGO SE ESCAPA…"**: sumar una lección: **un parámetro de la URL que termina en `location.href` es un sink igual que `innerHTML`**, y un barrido que solo busca `innerHTML` no lo ve. `encodeURIComponent` al ARMAR el link (lo que hacen Caja y Cuentas Corrientes) no protege al que lo LEE: la validación va del lado de quien navega. Vale revisar si otro módulo tiene un `?volver=` o parecido (grep de `location.href =` y `window.open(` con datos de la URL).
3. **Reglas de oro → las suites viven en `pruebas/`**: agregar `test-gastos-xss.js` / `mut-gastos-xss.js` a la lista de lo que hay, con los números.
4. **Seguridad → "EL BUCKET comprobantes"** no cambia.

## Qué se corrió

`check-scripts.js` (OK), las 23 `test-*.js` y `controles-cobranzas.js` en verde, `mut-gastos-xss.js` 122/122. Sin cambios en la base (solo lectura; no hizo falta consultar nada: ninguna justificación depende de un CHECK).

No hay tareas ni permisos nuevos.
