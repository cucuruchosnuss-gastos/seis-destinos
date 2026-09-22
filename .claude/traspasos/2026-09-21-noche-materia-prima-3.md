# Traspaso — Ingreso (materia-prima), noche del 21/09/2026, Parte 14: barrido completo de XSS

**Para:** el chat de arquitectura (dueño de CLAUDE.md).
**De:** el chat del módulo Ingreso — Insumos / Materia Prima.
**Estado:** trabajo hecho en el working copy, SIN commit ni push (lo pidió así quien lanzó la tarea). Supabase se usó solo para leer.

## Qué se hizo

Barrido de escapado de `modulos/materia-prima.html` sobre el **archivo entero**, con el mismo método que el piloto de Cobranzas: renders ejecutados con un document falso y una marca distinta por campo, más un chequeo estático que recorre TODO el `<script>`. Hasta hoy el único chequeo de este archivo era el de la suite del circuito, **acotado a las funciones nuevas** porque este barrido estaba pendiente.

### Números del `<script>`

- **514** interpolaciones `${...}` en total; **329** caen en una plantilla que arma HTML. Además hay **38** asignaciones directas a `innerHTML` (ningún `insertAdjacentHTML`, `outerHTML` ni `innerHTML +=`; ningún HTML armado con `+`).
- Hojas abiertas contra el archivo anterior (`da0bf70`): **8**, todas cerradas. El chequeo estático nombra 7 contra `da0bf70`; la octava (la unidad en la cabecera del detalle) vivía en una plantilla SIN `<` propio metida en un arreglo que termina en `.join('<br>')`, así que el escáner no la marcaba "en HTML": la atrapó el render ejecutado. Ver el hueco de método más abajo.

### Sinks cerrados (campo — función)

1. **`foto_url` en el `href` de "Ver foto →" — `abrirDetalleIngreso`.** El más serio. Iba con `esc()`, pero en un href escapar HTML no alcanza: `javascript:alert(...)` no tiene ningún carácter que `esc()` toque. `materia_prima_ingresos.foto_url` es texto libre y la policy de INSERT solo mira `tiene_tarea_alcance('materia_prima','cargar', unidad)` (verificado contra `pg_policy` el 22/09/2026), así que quien carga podía guardar un `javascript:` y hacerlo correr en la sesión de quien abre el detalle con `ver_todo`. Nuevo helper **`hrefFoto(url)`**: solo acepta `https://` sin espacios, comillas ni `<>`; lo demás muestra "Foto no disponible" en vez de un enlace. Verificado contra la base: de los 13 ingresos, 12 tienen `foto_url` y los 12 empiezan con la URL de Storage del proyecto, así que ninguno deja de verse.
2. **Unidad de medida del insumo en el detalle** — `abrirDetalleIngreso`, dos lugares: el desglose "N bultos de X" (`formatearCantidad(contenido_por_bulto, unidad_medida)`) y la cantidad de cada renglón. `insumos.unidad_medida` **no tiene CHECK** (verificado) y la policy de INSERT de `insumos` deja crear con cualquier valor a quien tiene `cargar`, con `estado_alta = 'pendiente_revision'`.
3. **"Recibido por" (nombre del empleado)** — `abrirDetalleTransferenciaRecibida`, `textoRecepcion()` entraba crudo a la cabecera.
4. **Nombre de la unidad de negocio en la cabecera del detalle** — `abrirDetalleIngreso`, `nombreUnidad(...)` entraba crudo.
5. **Nombre de la unidad en los chips del listado** — `renderizarChipsUnidadIngresos`, contenido.
6. **Id de la unidad en `data-unidad`** — `renderizarChipsUnidadIngresos`, atributo (uuid en la base, pero se escapa igual: es un atributo).
7. **Etiqueta del chip de tipo de comprobante** — `chipTipoDoc`, en el fallback de un tipo desconocido. Hoy no alcanzable con datos de la base (`tipo_doc` tiene CHECK de 4 valores y los 4 están en `TIPOS_DOC`), se cerró igual porque la función no puede saber de dónde viene el tipo.

Las dos cabeceras del detalle (`[ … ].filter(Boolean).join('<br>')`) se reescribieron para que **cada elemento de texto vaya entero por `esc()`** (fecha, unidad, origen, fantasía, observaciones, "Recibido por"); los que son HTML fijo quedan como estaban.

### Otros cambios en el archivo

- En `htmlItemAbierto` la variable `u` (que ya era `esc(item.unidadMedida)`) pasó a llamarse **`unidadHtml`**. No era un sink: se renombró porque la lista de seguras es por nombre de hoja, y `u` en `renderizarItemsInternos` es la unidad **cruda**. Un nombre que dice que ya está escapado no se confunde con el otro.
- Se corrigió el comentario de `esc()`, que decía que *"el listado de la etapa 1 no lo necesita porque ahí todo va como texto"*. Era falso (el listado arma HTML) y es de la familia del comentario que desactiva la revisión.

### Lo que se descartó midiendo

- `formatearFecha(...)` sobre `materia_prima_ingresos.fecha` y `stock_transferencias.fecha`: columnas `date` (verificado), salen como dd/mm/aaaa.
- `x.items` de `v_stock_en_transito`: `bigint` (verificado).
- `b.id` en `data-ingreso`: uuid.
- Los toasts (`mostrarError`/`mostrarExito`) usan `textContent`.

## Suites (nuevas, en `pruebas/`)

- **`pruebas/test-materia-prima-xss.js`** — **165/165 verde**; contra `git show da0bf70:modulos/materia-prima.html` da **145/167 ROJO** (22 fallas: renders con la marca cruda y el estático nombrando línea y función). Ejecuta 30 renders con datos de la base y del OCR: listado, chips de unidad, detalle de ingreso (cabecera, comprobantes, renglones, diferencia), detalle de transferencia recibida, buscador del padrón, parecidos, proveedor identificado/nuevo, duplicados, remitos vinculables, sugerencias de catálogo, categorías, tarjetas de ítem cerrada y abierta (producto nuevo, por alias en bultos, recibido en unidades, mixto, unidades que no reparten), suma mixta en vivo, confirmación, recepción de transferencias (lista, cabecera, renglones), resultado del circuito, selector de unidades.
  - **Las funciones del sandbox se juntan por clausura**: se arranca de los renders y se suman todas las funciones y constantes del archivo que nombran, así se ejecuta el código real de cada helper.
  - **La lista de seguras es POR FUNCIÓN** (la hoja se asigna a la función declarada más chica que la contiene): un `${texto}` justificado en `renderizarListaIngresos` no justifica un `${texto}` en otra función. Una entrada que queda sin usar es rojo ("huérfana").
  - Cierra dos huecos del método que tenía el piloto: (a) toma la **expresión completa** de cada asignación a `innerHTML` (el escáner la cortaba en la primera línea que parseaba) y clasifica **cada elemento** de los arreglos `[…].join('<br>')`; (b) clasifica también las **plantillas sin `<` propio que devuelve una flecha** dentro de una asignación a `innerHTML` (caso real: la lista de recepción agrupada), que el escáner no marca "en HTML".
  - Contexto: ninguna interpolación sin comillas, en `on*=`, en `style` salvo constantes, ni en `href/src` salvo `encodeURIComponent()` o `esc(hrefFoto(...))`.
- **`pruebas/mut-materia-prima-xss.js`** — mutaciones: **123/123 detectadas**, sin equivalentes declaradas. Automáticas: cada `${esc(...)}` de 24 funciones de render; manuales: los sinks cerrados y los `esc()` que no están al principio de la interpolación (ternarios, arreglos, constantes). Quedan afuera `htmlCircuitoDetalle`, `htmlPagadoSinIngresar` y `renderizarPagadoSinIngresar`, que ya muta y detecta `mut-materia-prima-circuito.js`.

Corridas al cerrar (22/09/2026): `check-scripts` OK en todos los HTML; todas las `test-*.js` en verde (materia-prima: circuito 115/115, números 87/87, xss 165/165); `controles-cobranzas` 354/354; `mut-materia-prima-xss`, `mut-materia-prima-circuito` y `mut-materia-prima-numeros`: **123/123**, **33/33** y **32/32**, corridas de a una, cada una con su suite verde sobre el archivo limpio.

## Para CLAUDE.md

1. **Sección "Módulos → 6. Ingreso", el renglón *"Se escaparon, de paso, textos que entraban crudos … El barrido completo del archivo sigue pendiente"***: reemplazarlo por que el barrido completo está hecho (22/09/2026), con los 7 puntos de arriba, `hrefFoto()` y las dos suites.
2. **Aprendizajes clave → la regla del escapado**, lista de módulos: sacar a materia-prima de *"PENDIENTE — el mismo barrido propio en `materia-prima.html` y `stock.html`"* (queda solo stock.html) y sumar los números. Y agregar a las cinco lecciones, o como sexta: **en un `href` que recibe una URL entera (no un parámetro), `esc()` no alcanza y `encodeURIComponent` no sirve: se valida el esquema** (`hrefFoto`, solo `https://`). El chequeo de contexto de la suite lo exige.
3. **Misma regla, "Cómo se verifica"**: dos huecos que el método del piloto tenía y que esta suite cierra (expresión completa de la asignación; plantillas sin `<` devueltas por un map). Y la lista de seguras **por función**, no global.
4. **`pruebas/` en "Qué hay hoy"**: sumar `test-materia-prima-xss.js` / `mut-materia-prima-xss.js` con sus números.
5. **Bug en un helper compartido, `pruebas/clasificar.js` (no lo toqué: no es de este módulo):** `posicionesDeValor()` desenvuelve cualquier expresión que empiece con `(` si el interior parsea, y con `(items ?? []).map(…).join('') || '…'` el interior —`items ?? []).map(…) || '…'`— **también parsea**, así que parte mal la expresión (queda una hoja `items`). No esconde un sink en Cobranzas hoy, pero puede. El arreglo es verificar con `cuerpoDesde()` que el paréntesis que abre sea el que cierra al final; en la suite nueva está hecho localmente en `hojas()`. Lo mismo `extraer.js` y el escáner deciden regex-o-división por el carácter anterior, y detrás de `return` leen una división (`return /…/.test(x)` rompe la extracción): se evitó en `hrefFoto` escribiendo la regex en una asignación.
6. **Pendiente de seguridad relacionado, no de este barrido:** `foto_url` sigue siendo una URL firmada a diez años (la fase 2 de Storage de Ingreso). Cuando pase a guardar la ruta, `hrefFoto` deja de aplicar a ese campo y el detalle tiene que firmar al tocar, como Gastos.
