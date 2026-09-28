# Traspaso — Pedidos con la barra de unidad (28/09/2026)

Prompt para el chat de arquitectura (dueño de CLAUDE.md). Autocontenido: quien lo lea no vio el trabajo.

## Qué cambió y por qué

La app tiene desde `5592f5a` una **barra de unidad de negocio arriba** (`js/barra-unidad.js`, compartida): se elige la fábrica UNA vez ("Todas", "Cucuruchos Nuss", "Dolce Pasta"…) y cada pantalla filtra por esa elección. `modulos/pedidos.html` ya cargaba la barra en el `<head>` pero seguía teniendo su propio segmento de unidades. Esta tanda lo integra.

Rama `pedidos-barra-unidad` (desde `5592f5a`), sin push:
- `404f41a` feat(pedidos): la unidad la elige la barra de arriba
- `132e1dd` test(pedidos): mutaciones de la barra de unidad y anclas al día
- (este traspaso)

### Lo que hace la pantalla ahora
- **Se retiró el segmento de unidades propio** (`#pe-unidades`, `htmlUnidades()`, `elegirUnidad()`) y **ya no se lee ni se escribe la clave `pedidos.unidad` de localStorage**. Nunca dos lugares para elegir lo mismo. Declarado en `pruebas/controles-pedidos.js` → `RETIRADOS` (`control:button[data-unidad][type=button]`, motivo "lo decide la barra de unidad de arriba").
- **La lista con "Todas"**: `pedidos_de()` pide UNA unidad, así que se hace **una llamada por unidad donde la persona tiene `pedidos:ver`, en paralelo y con turno** (una respuesta vieja no pisa la nueva). Cada fila dice su unidad ("Nº 3 · Cucuruchos Nuss · Pedido …"), la lista va ordenada por fecha y número del más nuevo al más viejo (el mismo orden de la base), y la cuenta de arriba lleva el detalle por unidad ("3 pedidos · Cucuruchos Nuss: 3 · Dolce Pasta: 0"). **Si una unidad falla, se dice cuál ("No se pudieron leer los pedidos de X…") y las otras se muestran igual**; si fallan todas, el error de siempre. Un pedido repetido entre respuestas se muestra una vez (deduplicado por id).
- **Una unidad en la barra**: la lista es solo de esa unidad (`pasaFiltroUnidad`, el helper real de la barra). **Si la persona no tiene ninguna tarea de Pedidos en esa unidad, lo dice** ("En X no tenés ninguna tarea de Pedidos. Elegí otra unidad arriba, o «Todas».") en vez de mostrar una lista vacía. Si tiene alguna tarea pero no `ver` en unidades que se miran, se dice en chico cuáles quedan afuera.
- **Cargar un pedido con "Todas"** (regla f): el formulario pregunta **"¿De qué unidad es el pedido?"** (solo las unidades donde puede cargar), **sin tocar la barra**. Con una sola posible, viene puesta y no pregunta ("Unidad: X"). Hasta elegir no se leen productos ni clientes, y guardar sin unidad dice "Elegí de qué unidad es el pedido.". Cambiar de unidad suelta el cliente y reinicia los renglones de producto (conservan cajas y nota); los de texto libre quedan enteros. `guardar_pedido` recibe la unidad del formulario. Al corregir un pedido, su unidad, sin elegir. El detalle de un pedido lee el catálogo **de la unidad del pedido** y muestra el dato "Unidad" cuando hay más de una.
- **Clientes con "Todas"**: la lista trae los de **todas las unidades donde tiene `pedidos:configurar`** (una lectura por unidad, en paralelo), cada fila dice su unidad y van ordenados por nombre; si una unidad falla, se dice y las otras se ven. **El cliente nuevo pregunta la unidad** (sin tocar la barra); editar uno usa la suya y no se abre si es de una unidad donde no configura. Guardar sin unidad: "Elegí de qué unidad es el cliente.".
- **Cambiar la barra con la pantalla abierta repinta sin recargar** (`alCambiarUnidad`), con turno. Si el pedido abierto ya no es de la unidad elegida, se vuelve a la lista. Un formulario a medio cargar no se toca.
- Los botones "+ Pedido nuevo" y "Clientes" se ven si la persona puede en **alguna** de las unidades que se miran (`puedeEnAlguna`).
- **Si la barra falla al leer**, la pantalla trabaja como "Todas" sobre las unidades del módulo.
- Todo texto de la base que entró nuevo (nombres de unidad, los avisos que los nombran) va con `esc()`, y las suites lo prueban con HTML malicioso.
- La fábrica de pruebas sigue sin aparecer para una cuenta real: sale de `unidadesDelModulo()` (y la barra ya la saca de sus chips).

### Decisiones y sus motivos
- **La lista de clientes con "Todas" muestra todas las unidades** (en vez de pedir elegir una antes de mirar): mirar no necesita una unidad; solo el alta la necesita. Es un desvío chico de la regla f, que pedía la unidad en la pantalla: se pide al crear, no al mirar.
- **Deduplicar por id** al juntar: un pedido es de una sola unidad; si llegara repetido (la maqueta devuelve lo mismo para cualquier unidad), se muestra una vez.
- **Regla g ("sin unidad" marcado) no aplica**: `pedidos.unidad_negocio_id` y `clientes.unidad_negocio_id` son NOT NULL. Nada quedó sin poder filtrar.
- **No hizo falta ninguna tarea, permiso, RPC ni cambio de base.** Ninguna RPC cambió de firma. Cero SQL corrido.

## Qué se verificó y contra qué
- Suites (ejecutan los renders reales con el sandbox): `test-pedidos-barra-unidad.js` **105/105 (nueva)**, `clientes` 89/89, `carga` 146/146, `lista` 134/134, `imprimir` 33/33, `xss` 6/6, `fabrica-pruebas` 23/23, `controles-pedidos.js` 315/315.
- Mutaciones, de a una: `mut-pedidos-barra-unidad.js` **64/64 (+1 eq., nueva)**, `clientes` 32/32 (+1 eq.), `lista` 75/75 (+11 eq.), `carga` 68/68 (+3 eq.), `imprimir` 22/22 (+5 eq.), `fabrica-pruebas` 5/5. Las mutaciones viejas que apuntaban al segmento retirado se sacaron (con nota) y las de gates se reanclaron al código de hoy; dos mutaciones escaparon al principio (clientes de otra unidad reusados, clientes sin ordenar) y se cerraron con casos nuevos en la suite.
- `node pruebas/check-bytes.js`: 415 archivos, 0 CR, 0 NUL, verde. `node pruebas/correr-todo.js`: **126/126 en verde**.
- **Maqueta** (`?maqueta=pedidos`) a 390 y 1280 px: lista con "Todas", con una unidad, pedido nuevo (pregunta la unidad) y con la unidad elegida, y clientes — **sin scroll horizontal y sin errores de JavaScript** en ninguna.
- `e2e/5-maqueta.spec.js` y `e2e/7-barra-unidad.spec.js` **no se tocaron**.

## Qué NO se probó
- Nada con sesión real ni contra la base (ninguna RPC se ejecutó; Supabase en solo lectura).
- La maqueta devuelve los mismos pedidos para cualquier unidad, así que ahí "Dolce Pasta" figura con 0 y "Todas" no muestra filas de dos unidades distintas; eso lo cubren las suites.
- La hoja impresa del pedido no se miró.

## Guion para Facu (en la app, con tu cuenta)
1. Entrá a Pedidos con "Todas" arriba: tienen que aparecer los pedidos de tus unidades juntos, cada fila con su unidad, y arriba la cuenta con el detalle por unidad.
2. Tocá una unidad en la barra de arriba: la lista se achica a esa unidad sin recargar la página.
3. Tocá una unidad donde no tenés tareas de Pedidos (si hay): tiene que decirlo con un cartel, no mostrar la lista vacía.
4. Volvé a "Todas" y tocá "+ Pedido nuevo": te pregunta de qué unidad es. Elegí una: aparecen sus clientes y sus productos. Cambiá a la otra: el cliente se suelta.
5. Guardá un pedido de prueba y fijate que quede en la unidad que elegiste.
6. Tocá "Clientes" con "Todas": ves los de todas tus unidades, cada uno con su unidad. "+ Cliente nuevo" te pregunta la unidad.
7. Con un pedido abierto, cambiá la barra a otra unidad: tiene que volver a la lista.

## Para el cherry-pick
- `controles-pedidos.js`: sus `BASES` siguen siendo los commits viejos fijos (87d3c9d, d525f8f, 4062707, 51d3749), que existen en `main`: **no hay que reescribir ningún baseline**.

## Qué sección de CLAUDE.md tocar
Módulo 11, **Pedidos**:
- En "Permisos", reemplazar "Con más de una unidad hay un segmento arriba y la elegida se recuerda en `localStorage` (`pedidos.unidad`)" por: *la unidad la elige la barra de unidad de arriba (`js/barra-unidad.js`, 28/09/2026); el segmento propio y la clave `pedidos.unidad` se retiraron (declarado en `controles-pedidos.js`).*
- Sumar un bullet **"LA BARRA DE UNIDAD"** con lo de "Lo que hace la pantalla ahora" de arriba (lista con Todas = una llamada a `pedidos_de` por unidad, en paralelo, con turno, unidad en cada fila, falla parcial dicha; unidad sin tareas dicha; pedido nuevo y cliente nuevo preguntan la unidad sin tocar la barra; clientes con Todas de todas las unidades; cambiar la barra repinta).
- Actualizar la línea de suites: agregar `test-/mut-pedidos-barra-unidad.js` (105/105; 64/64 +1 eq.) y los números nuevos de clientes (89/89; 32/32), lista (134/134; 75/75) y carga (68/68). En la tabla de *Fábrica de pruebas* de Arquitectura, Pedidos: `unidadesDelModulo()` (de ahí salen las unidades de "Todas" y las que se ofrecen al elegir; ya no hay "unidad recordada"), 23/23 · 5/5.

## Pedidos al componente compartido (js/barra-unidad.js)
Ninguno. La API (`unidadesDeLaBarra`, `alCambiarUnidad`, `pasaFiltroUnidad`) alcanzó.

## Qué automatizaría ahora
Lo más caro fue **reanclar a mano las mutaciones viejas** cuando el código de las funciones que mutaban cambió (7 anclas en tres runners, una por una). Propuesta: un script `pruebas/anclas-rotas.js` que cargue todos los `mut-*.js` de un módulo, pruebe cada `de:` contra el archivo actual SIN correr las suites y liste de una vez las que no existen o son ambiguas, con el renglón más parecido del archivo al lado. Convierte tres corridas abortadas en una sola lista, en segundos. Y para la maqueta: sumar a `pruebas/datos-maqueta/pedidos.js` respuestas de `pedidos_de` distintas por unidad (hoy el falso responde lo mismo para cualquiera), así "Todas" se ve con filas de dos unidades; eso toca el falso de la maqueta y es territorio del coordinador.
