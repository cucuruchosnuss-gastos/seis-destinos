# Traspaso — Cuentas Corrientes: suite de regresión de XSS (noche del 21/09/2026)

Para el chat de arquitectura (dueño de CLAUDE.md). Autocontenido.

## Qué cambió

Nada del módulo. Solo se agregaron dos archivos de prueba:

- `pruebas/test-cuentas-corrientes-xss.js`
- `pruebas/mut-cuentas-corrientes-xss.js`

**Por qué.** CLAUDE.md da por cerrado el barrido de XSS de `modulos/cuentas-corrientes.html` (`1664384` y `6f09e8e`, 16/09/2026). La prueba que lo demostraba vivía en un scratchpad y ya no existe. Esta suite fija el estado actual del archivo, que ya incluye los dos cambios de esa noche: `a4c17a2` (números) y `eacf0ef` ("Cargar importe" con `items_de_factura_pendiente`).

## Resultado: el barrido sigue cerrado y no hay ningún hallazgo

- Hay **263 interpolaciones** en el `<script>`. **198** están en plantillas que arman HTML, y **72** de esas empiezan con `esc(`. Hay **35 asignaciones a `innerHTML`** y **un solo `innerHTML +=`**.
- Ningún sink abierto. `HALLAZGOS_ABIERTOS` está vacío.
- La suite da **183/183** verificaciones en verde sobre el archivo actual.
- Las mutaciones dan **98/98 detectadas**: 70 automáticas (a cada `${esc(...)}` de los renders se le saca el `esc`) y 28 a mano. No hay mutaciones equivalentes.
- Contra el archivo anterior al barrido (`1664384~1`), la suite da **ROJO** (22/43; el sandbox ni siquiera se arma).

## Qué cubre

1. **Renders ejecutados**, con un `document` falso y una marca distinta por campo. Se ejecutan todos estos, con el código real de cada helper juntado por clausura:
   - la lista de saldos y el resumen de arriba
   - las facturas sin proveedor
   - las sugerencias de "Asignar proveedor"
   - el detalle de un pago
   - los proveedores pendientes de aceptación
   - el padrón
   - el historial
   - la ficha:
     - el selector de unidad
     - el banner, con una unidad y en "todas"
     - los movimientos
     - la descarga sin importe, con sus cantidades y el formulario "Cargar importe"
     - los remitos sin facturar, y su error
   - el selector de orden
   - los créditos para elegir
   - el select de facturas del crédito
   - el selector de cuenta del pago ("Mis cuentas" y "Cuenta de Empresa")
   - las filas FIFO
   - los filtros de unidad de `init()`

   La vista previa y los errores de la importación por Excel se verifican **por textContent y createTextNode**.
2. **Chequeo estático sobre todo el `<script>`.** Cada `${...}` que termina en HTML tiene que estar escapado, o justificado en una lista de seguras **por función y con su motivo**. Una entrada de esa lista que deja de usarse da rojo. Se miran además:
   - el contexto: atributo sin comillas, `on*=`, `href`/`src` y `style`. En un `style` solo se admite `colorAvatar()` como `background`, y un chequeo aparte exige que devuelva un color de `PALETA_AVATAR`, que son hex literales.
   - el único `innerHTML +=`, que es el aviso numérico de "descargas sin importe".
3. **Sinks de navegación.**
   - Los 4 href a `gastos.html` son prefijo fijo más `encodeURIComponent`, entre comillas dobles. En la ficha, el `volver=` es `encodeURIComponent(location.href)`, y se probó ejecutándolo con una URL marcada.
   - La única navegación del archivo es la literal a `../dashboard.html`.
   - Nada asigna `.src` ni `.href` en tiempo de ejecución.

## Lo que hay que saber del deep link (no es un hallazgo)

`init()` lee `?proveedor=` y `&unidad=`.

- **El proveedor solo abre la ficha si es un id del padrón**, porque se busca con `find` en `estado.maestros.proveedores`.
- **La unidad NO se valida.** Entra directo a `estado.ficha.unidadId`. Se verificó ejecutando los renders con una unidad marcada, y de ahí va a tres lugares:
  - Un **lookup** en `nombreUnidad()`: si no la encuentra, muestra `—`.
  - Los **filtros** `.eq()` de las consultas.
  - `history.pushState/replaceState`, con una URL que arranca en `?`, o sea del mismo documento.

  **No llega a ningún HTML ni a ninguna navegación**, y la suite lo exige. Tampoco sale del origen. Si se quiere endurecer, habría que validar `unidadURL` contra `estado.maestros.unidades` como se hace con el proveedor, y armar la query de `sincronizarUrlFicha` con `encodeURIComponent`. Es un cambio del módulo que no se hizo esta noche.

## Observación fuera de alcance (no es XSS)

`abrirModalDetallePago()` hace `formatearFecha(gasto?.fecha_pago)`. Si la consulta del gasto no devuelve fila (`maybeSingle` → `null`), `formatearFecha(undefined)` tira un error y el modal queda en "Cargando…". No se tocó.

## Qué actualizar en CLAUDE.md

- En la sección **Cómo trabajar → REGLA DE ORO — Las suites de verificación viven en `pruebas/`**, en "Qué hay hoy": sumar `test-cuentas-corrientes-xss.js` / `mut-cuentas-corrientes-xss.js`, con **183/183** y **98/98**.
- En **Módulos → 3. Cuentas Corrientes**, en la entrada "TODO EL TEXTO LIBRE SE ESCAPA":
  - Anotar que el barrido quedó bloqueado por esa suite el 21/09/2026, sin hallazgos (263 interpolaciones, 198 en HTML).
  - Agregar la nota del `&unidad=` sin validar, que no llega a HTML.
- En **Aprendizajes clave**, en la regla de XSS, donde dice que la prueba de Cuentas Corrientes se perdió: reemplazar por la suite nueva.

## Cómo se corre

```bash
node pruebas/test-cuentas-corrientes-xss.js
node pruebas/mut-cuentas-corrientes-xss.js
```

Verificado al cerrar, todo en verde: `check-scripts`, las 23 `test-*.js` (una por una) y `controles-cobranzas` (354/354).
