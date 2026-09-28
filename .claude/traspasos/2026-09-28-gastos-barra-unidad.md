# Traspaso — Gastos: la barra de unidad y los proyectos del Taller (28/09/2026)

Para el chat de arquitectura. Quien lo reciba no vio el trabajo: esto es autocontenido.
Hecho por el subagente de Gastos en la rama `worktree-agent-a2376e4e157cddf1d`, sin push.
**Cero SQL corrido y cero datos tocados**: Supabase estuvo en solo lectura; lo único que se
consultó fue `has_column_privilege` sobre `proyectos` (27/09/2026).

## Commits

- Un solo commit en la rama `worktree-agent-a2376e4e157cddf1d` con los dos trabajos, las suites y este
  traspaso (el hash lo da `git log` de esa rama; al integrar por cherry-pick cambia).

## TRABAJO 1 — Gastos obedece a la barra de unidad

La barra de unidad de negocio (`js/barra-unidad.js`, commit `5592f5a`, compartida, **no se tocó**)
ahora decide qué unidad muestra Gastos. `gastos.html` la importa (`unidadesDeLaBarra`,
`alCambiarUnidad`, `pasaFiltroUnidad`) y la guarda en `estado.unidadBarra = { elegida, unidades, mostrar }`.

Qué cambió, y por qué:

1. **Se RETIRÓ el filtro "Unidad" de la lista** (el multiselect `ms-unidad`, con su botón y su panel, y
   la pseudo-opción "🚚 Vehículos"). Motivo: *lo decide la barra de unidad de arriba*; dos selectores de
   unidad en la misma pantalla dirían cosas distintas. La pseudo-opción "Vehículos" no se pierde: el
   filtro **Vehículo** de la barra de filtros ya la cubre, y los gastos de vehículo (sin unidad) se ven
   siempre (ver punto 4). Declarado en `pruebas/controles-gastos.js` → `RETIRADOS`.
2. **Se filtra donde se ARMA la lista, no en la consulta.** `cargarLista()` ya no pone ningún filtro de
   unidad en el `.select()` (y ahora trae `unidad_negocio_id`); el filtro vive en `gastosVisibles()`,
   que aplica `pasaFiltroUnidad()` y el buscador. Así **cambiar la barra repinta sin volver a pedir nada**
   (`repintarPorUnidad()`, colgado de `alCambiarUnidad`).
3. **Las cifras "Gastos de hoy/mes" y "Registros" cuentan lo que muestra la unidad elegida.** Con
   **"Todas"** muestran la suma y, debajo, una tarjeta **"Por unidad"** (`htmlTotalesPorUnidad`,
   `id="totales-por-unidad"`) con el importe y la cantidad de gastos de cada unidad; "Sin unidad" va
   última. Con una sola unidad (o un solo grupo) la tarjeta no se dibuja: repetiría el total. Se suma
   **solo ARS y sin anulados**, el mismo criterio que ya tenía el total.
4. **Lo que no tiene unidad se muestra igual, marcado.** Un gasto de vehículo tiene `unidad_negocio_id`
   null: con una unidad elegida en la barra sigue apareciendo (así lo define `pasaFiltroUnidad`) con un
   chip **"Sin unidad"**; con "Todas" no lleva chip (no hay nada que distinguir).
5. **El Excel exporta lo visible** (`exportarExcel` usa `gastosVisibles()`), con "Sin unidad" en la
   columna Empresa y "Gasto general del taller" en Proyecto cuando corresponde.
6. **"Facturas ingresadas sin gasto" también se filtra por la barra**; el título cuenta las visibles, y si
   quedaron afuera algunas de otras unidades lo dice debajo ("Hay 1 más de otra unidad: elegí «Todas»
   arriba para verla."). **OJO:** con una unidad elegida, ese número puede ser menor que la burbuja del
   dashboard, que cuenta todas; la nota existe justamente para que no parezca un error.
7. **El wizard viene con la unidad de la barra ya elegida** (`unidadDeLaBarraParaWizard()`, en
   `resetearWizard()`). **La grilla de unidades del wizard SE QUEDA**: es la unidad del gasto nuevo, no
   un filtro. Como la unidad ya viene puesta, en el paso Destino aparece un **"Siguiente →"**
   (`btn-destino-siguiente`) para seguir sin tener que volver a tocar la tarjeta.

**Qué no se pudo filtrar:** nada. Todo lo que muestra Gastos tiene `unidad_negocio_id` (o es null y se
muestra marcado). Lo único que queda como estaba es un detalle viejo: el título de la cifra dice
"GASTOS DE HOY" también cuando se usa el filtro de Período; no se tocó porque no era del pedido.

## TRABAJO 2 — Los proyectos del Taller: Gastos solo ELIGE

**a) Se fue la administración de proyectos de Gastos.** El botón `btn-abrir-proyectos`, el modal
`modal-proyectos` (con su lista, alta, baja y reactivar) y el **"+ Proyecto nuevo"** del wizard
(`btn-proyecto-nuevo` y su formulario) salieron del archivo. Declarados en `controles-gastos.js` →
`MOVIDOS` a `modulos/taller.html` (lo construye el orquestador en esta misma tanda). **Gastos ya no llama
a `crear_proyecto`, `dar_de_baja_proyecto` ni `reactivar_proyecto`**, y tampoco lee
`gastos:gestionar_proyectos`. Las RPCs **no se tocaron**.

**b) En un gasto del Taller el proyecto es OBLIGATORIO.**
- El Taller se reconoce por `unidades_negocio.prefijo = 'T'` o, si no vino, por el nombre "Taller"
  (`esUnidadTaller`). El grupo "Proyecto" del paso Detalles **solo se ve en el Taller**; fuera del Taller
  el `proyecto_id` viaja null aunque haya quedado algo elegido (`proyectoIdDeWizard`).
- El select ofrece **"— Elegí el proyecto —"** (vacío), **"Gasto general del taller"** (se guarda
  `proyecto_id` null) y los proyectos **abiertos**: `activo = true` y `estado` distinto de
  `entregado` / `cancelado` (`proyectosAbiertos`). No viene nada preelegido: "Gasto general" es una
  respuesta, no un default.
- Sin elegir, "Siguiente" no avanza: el error va **pegado al campo** (`#proyecto-error`, `role="alert"`),
  el campo queda marcado (`campo--con-error`), el foco va ahí, y la ayuda de abajo se esconde para no
  decir lo mismo dos veces. **El botón no se deshabilita** (la regla del error pegado).
- **"¿No está? Crealo en Proyectos Taller"** — link a `taller.html`, `target="_blank" rel="noopener"`.
- **"Actualizar la lista"** — relee `proyectos` sin perder lo cargado: conserva lo elegido si sigue
  abierto; si se cerró, lo dice pegado al campo; si la lectura falla, dice un error genérico (nunca el
  mensaje crudo de la base) y deja la lista que había.
- **Columnas:** todas las consultas a `proyectos` piden exactamente `COLUMNAS_PROYECTO = 'id, nombre,
  activo, estado'` (y los dos embeds `proyectos (...)` de la lista y del detalle, lo mismo). Verificado
  con `has_column_privilege('authenticated', 'public.proyectos', col, 'SELECT')` el 27/09/2026: esas
  cuatro dan `true`; hay columnas de la tabla que `authenticated` NO puede leer (por eso nada de `*`).

**c) Editar y mostrar.**
- La edición de un gasto **conserva un proyecto ya cerrado**: aparece con "(dado de baja)",
  "(entregado)" o "(cancelado)" (`opcionesProyectoEdicion`).
- Un gasto del Taller sin proyecto abre la edición con **"Gasto general del taller" elegido**; fuera del
  Taller la primera opción sigue siendo "— Ninguno —". Al guardar, "Gasto general" viaja null
  (`valorAProyectoId`).
- El detalle y el Excel dicen **"Gasto general del taller"** en vez de dejar vacío, solo para gastos del
  Taller (`etiquetaProyectoGasto`).

## Qué se verificó y contra qué

- **La base (solo lectura):** `has_column_privilege` sobre las columnas de `proyectos` (arriba).
- **Ejecutando el código real** (sandbox con `document` falso, `construirCon` de `pruebas/sandbox.js`):
  las dos suites nuevas y las cinco de Gastos que ya existían, adaptadas (detalle abajo).
- **Controles:** `pruebas/controles-gastos.js` (nuevo, baseline `5592f5a`) exige que todo control de
  `gastos.html` en ese commit siga estando o esté declarado, y que ninguna declaración sobre.
- **Mirado en la maqueta** (`?maqueta=gastos`, datos nuevos en `pruebas/datos-maqueta/gastos.js`; elegir
  Período "sep-26" porque la maqueta no mueve el reloj): a **1280 px** con "Todas", 7 tarjetas, total
  $ 351.600,50 y el desglose por unidad con "Sin unidad"; con Taller, 3 tarjetas (el YPF del vehículo con
  su chip "Sin unidad"), $ 47.300 y la nota de "Facturas ingresadas sin gasto"; el wizard con Taller
  preelegido, "Siguiente" visible, el grupo Proyecto con sus opciones (sin el entregado) y el error
  pegado. A **390 px**, sin scroll horizontal.

## Lo que NO se probó

- **Nada con sesión real ni contra la base**: ninguna escritura, ningún gasto guardado de verdad.
- El link a `taller.html`: la pantalla ya está en `main` (`daed9a4`), pero no en esta rama, así que el
  recorrido "crear allá y Actualizar la lista acá" no se hizo.
- Playwright no se tocó: `e2e/5-maqueta.spec.js` no tiene todavía una entrada para Gastos.

## Guion para Facu (con la app de verdad)

1. Entrá a Gastos con "Todas" en la barra de arriba: tiene que verse el total y, debajo, "Por unidad".
2. Elegí "Taller" en la barra: la lista cambia sin recargar, el total pasa a ser solo del Taller, y los
   gastos de vehículo aparecen con "Sin unidad".
3. Exportá el Excel: tienen que venir solo las filas que estás viendo.
4. Tocá "+" para cargar un gasto: el Taller tiene que venir elegido; tocá "Siguiente →".
5. Llegá a Detalles y tocá "Siguiente" sin elegir proyecto: tiene que aparecer el error debajo del campo,
   sin cartel suelto, y el botón tiene que poder tocarse.
6. Elegí "Gasto general del taller" y guardá: en el detalle del gasto tiene que decir "Gasto general del
   taller".
7. Tocá "¿No está? Crealo en Proyectos Taller": se abre en otra pestaña. Creá uno allá, volvé y tocá
   "Actualizar la lista": tiene que aparecer, sin perder lo que ya habías cargado.
8. Abrí para editar un gasto viejo de un proyecto ya entregado: el proyecto tiene que seguir elegido, con
   "(entregado)" al lado.
9. Con una unidad elegida en la barra, mirá "Facturas ingresadas sin gasto": si hay de otras unidades,
   tiene que decirlo debajo.

## Números al cerrar

- `node pruebas/check-bytes.js`: 414 archivos de texto, 0 CR, 0 NUL, sin comillas abiertas.
- `node pruebas/correr-todo.js`: **128/128 en verde** (incluye `check-scripts.js` sobre todo el repo).
- Suites de Gastos: `test-gastos-barra-unidad` **67/67** (nueva), `test-gastos-proyecto-taller` **91/91**
  (nueva), `test-gastos-xss` 244/244, `test-gastos-numeros` 205/205, `test-gastos-circuito` 57/57,
  `test-gastos-fabrica-pruebas` 55/55 (era 56), `test-gastos-tablets` 40/40, `controles-gastos` 365/365 (nuevo).
- Mutaciones, de a una: barra-unidad **30/30**, proyecto-taller **33/33**, xss **118/118**, numeros 33/33,
  circuito 22/22, fabrica-pruebas 12/12, tablets 12/12.
  - En la primera corrida de xss escapó UNA: el `esc()` que envolvía "· N gastos" en el desglose por
    unidad. Era equivalente —el texto es un número y dos palabras fijas, no hay nada que escapar—, así
    que se sacó el `esc()` (el chequeo estático ya lo cubre como número, `x.registros` en SEGURAS) y
    la mutación dejó de existir: 118/118.

## Baselines al integrar por cherry-pick

`pruebas/controles-gastos.js` compara contra `BASE_COMMIT = '5592f5a'`, que ya está en `main`: **no hay
que reescribir nada**. Ninguna otra suite de esta rama fija un commit propio.

## Qué sección de CLAUDE.md tocar

- **Módulos → 1. Gastos:** una entrada nueva "LA BARRA DE UNIDAD" (puntos 1–7 del Trabajo 1) y otra
  "LOS PROYECTOS DEL TALLER SE ELIGEN, NO SE ADMINISTRAN" (Trabajo 2). La entrada de la fábrica de
  pruebas (tabla de Arquitectura, fila Gastos) dice *filtro "Unidad"*: ese filtro ya no existe; la unidad
  la saca la barra, y la grilla del wizard sigue filtrada con `sinUnidadesDePrueba`. La suite de
  fábrica de pruebas pasó de 56/56 a 55/55 por eso (se fue la assertion del filtro retirado, y se sumó la
  de que el filtro ya no existe).
- **Sistema de permisos → `gastos:gestionar_proyectos`:** la entrada dice que `gastos.html` la usa para
  "Proyectos del Taller" y "+ Proyecto nuevo"; desde este commit **Gastos ya no la lee** (la pantalla se
  mudó a `taller.html`). Las RPCs que la exigen siguen igual. **No hace falta ninguna tarea nueva ni
  cambio de permisos**; es solo documentación (y, si `taller.html` la usa, esa entrada pasa a decir eso).
- **Tablas → Maestros → `proyectos`:** el documento dice `id, nombre, activo, created_at`. La tabla tiene
  hoy también `estado` (con `entregado` / `cancelado` entre sus valores) y otras columnas que
  `authenticated` no puede leer; conviene re-listarla con `information_schema` y anotar qué columnas
  tienen SELECT para `authenticated`.
- **Registro de pruebas (`pruebas/`):** `test-/mut-gastos-barra-unidad.js`, `test-/mut-gastos-proyecto-taller.js`,
  `controles-gastos.js` (primer chequeo de controles de Gastos, baseline `5592f5a`) y los datos de maqueta
  `gastos`.

## Qué automatizaría ahora

La tarea repetida más cara de esta tanda fue **mirar la pantalla en la maqueta a 390 y 1280 px a mano**
(levantar el servidor, elegir el Período, tocar la barra, abrir el wizard, medir el scroll). Ya existe
`e2e/5-maqueta.spec.js` para eso: **sumarle una entrada `gastos`** (datos `?maqueta=gastos`, elegir
Período "sep-26", recorrer lista con "Todas" y con "Taller", y el wizard hasta Detalles) lo dejaría
corriendo en cada push. No lo hice porque ese archivo no es mío en esta tanda.
