# Traspaso — Ingreso (materia-prima) con la barra de unidad (28/09/2026)

Prompt listo para el chat de arquitectura. Autocontenido: quien lo recibe no vio el trabajo.

## Qué pasó

Tanda nocturna del 27-28/09/2026, parte 4: **la barra de unidad de negocio arriba, en toda la app** (`js/barra-unidad.js`, commit `5592f5a`). Este traspaso es la parte de **`modulos/materia-prima.html` (Ingreso)**. Se trabajó en la rama del subagente de Ingreso (worktree `agent-a36a33cc6ec1cd7e9`), sin push; el integrador la cherry-pickea a `main`. **Cero SQL escrito: Supabase en solo lectura.** No se tocó `js/barra-unidad.js` ni `css/main.css`.

## Qué cambió en la pantalla

1. **Los chips de unidad del listado se RETIRARON** (`#chips-unidad-ingresos` y `renderizarChipsUnidadIngresos()`): los reemplaza la barra de arriba ("lo decide la barra de unidad de arriba"). `estado.filtros.ingresos` ya no tiene `unidadId`. **El filtro de vínculo con remito (`#chips-vinculo-ingresos`) queda.** Este módulo no tiene `controles-materia-prima.js`, así que no hubo que declarar el retiro en controles; lo exige la suite nueva (y contra el commit fijo `5592f5a`, donde estaban).
2. **Todo lo que se muestra se filtra por la unidad elegida**, en el cliente, donde se arma cada lista (nunca en la consulta):
   - **El listado** de ingresos y las **transferencias recibidas** (estas por su unidad DESTINO, que es la de la fila).
   - **El banner "Ingresos del mes"** cuenta lo que se ve (la unidad elegida). Con **"Todas"** y más de una unidad en el mes, abajo va **el detalle por unidad** (`#banner-por-unidad`: "Dolce Pasta 3 · Cucuruchos Nuss 2", el de más ingresos primero). Sin barra (una sola unidad) no hay detalle.
   - **"Pagado sin ingresar"** (título "(N)" con lo que se ve), **"Facturas por ingresar"** (el botón "(N)" y la lista) e **"Ingresos internos"** (por el destino; con una unidad elegida no se agrupa por destino).
   - **El aviso de stock** (unidades sin `stock:ver`) sigue, pero avisa solo por la unidad que se mira (con "Todas", por todas).
3. **Lo que no tiene unidad se ve siempre y lo dice**: un gasto de "Pagado sin ingresar" o una factura de "Facturas por ingresar" con `unidad_negocio_id` null dicen **"Sin unidad"** en su línea y aparecen con cualquier unidad elegida (`pasaFiltroUnidad` los deja pasar). Los ingresos y las transferencias no pueden no tener unidad (`materia_prima_ingresos.unidad_negocio_id` y `stock_transferencias.unidad_destino_id` son NOT NULL, verificado el 28/09/2026 contra `information_schema.columns`).
4. **Una lista que la barra deja vacía dice cuántos hay en otras unidades**: el vacío del listado ("Hay N ingresos en otras unidades: elegí «Todas» arriba para verlos.") y el de "Ingresos internos" ("No hay mercadería en tránsito hacia Dolce Pasta. Hay 1 envío en otras unidades…"). Solo con una unidad elegida y si de verdad hay algo afuera; con "Todas" o por el buscador no culpa a la barra.
5. **El wizard sigue pidiendo la unidad del ingreso** (es un registro NUEVO: el selector queda). **Viene puesta la de la barra** si hay una elegida, si se ofrece en el selector (no la fábrica de pruebas para una cuenta real) y **si la persona puede cargar ahí**: `puedeCargarEn(unidad)` replica `tiene_tarea_alcance('materia_prima','cargar', unidad)` (super_admin sí; alcance `{"todas": true}` o la unidad en `unidades`; alcance null, no — verificado contra `pg_get_functiondef` el 28/09/2026). Para eso la consulta de `empleado_tareas` del `init` ahora trae también `alcance` (`estado.alcances`). **Con "Todas" no viene nada y el selector pide elegir, sin tocar la barra.** Con una sola unidad elegible se preselecciona como antes. "Ingresar" desde un gasto sigue poniendo la unidad del gasto.
6. **Cambiar la barra repinta sin recargar**: `alCambiarUnidad(aplicarBarraUnidad)`; `repintarPorUnidad()` redibuja banner, aviso, listado, las dos listas de pendientes, "Ingresos internos" y las burbujas. **No hace falta turno**: no hay consultas en el medio (se filtra lo que ya está en memoria). Antes de que el listado esté cargado (`estado.listadoCargado`) solo guarda la elección. El `init` pide la barra en paralelo con todo y la **espera con un tope de 3 s** antes del primer listado (para no dibujar todas las unidades y un instante después una sola); si llega más tarde se aplica igual.
7. **La burbuja de "Ingresos internos" sale de `mis_pendientes()`, que no devuelve la unidad**: con una unidad elegida su `title` dice "(en todas tus unidades)". El número no se toca (regla: el de adentro es el de la RPC).

## Qué NO se pudo filtrar, y por qué

- **La burbuja de "Ingresos internos"** (`mis_pendientes()`): devuelve `(modulo, clave, cantidad, texto)` sin unidad. Se dice en chico (el `title`). Para filtrarla haría falta que la RPC devuelva la cantidad por unidad.
- **"Insumos nuevos por revisar"** (la línea con link a Stock): el catálogo de insumos es UNO para las cuatro unidades; no hay nada que filtrar y está bien que no se filtre.
- **El paso del vínculo con remitos del wizard** (`remitos_vinculables(p_unidad_negocio_id, …)`): ya va por la unidad del ingreso nuevo, no por la barra; no se tocó.
- **El selector de unidad del wizard ofrece las cuatro unidades** (de `unidades_negocio`, sin mirar el alcance de `cargar`), como antes. **No se cambió** porque restringirlo es otra decisión (la base igual rechaza una unidad sin permiso). Si se quiere, es una línea: filtrar `unidadesParaElegir()` con `puedeCargarEn`.

## Lo que NO se probó

- **Nada con sesión real ni contra la base.** Las suites corren contra un doble; la pantalla se **miró en la maqueta** (`?maqueta=materia-prima`, datos nuevos en `pruebas/datos-maqueta/materia-prima.js`: una persona con Nuss propia + Dolce por alcance, Mengui ajena) a **390 y 1280 px**: sin scroll horizontal, cero errores de consola, la barra con Todas / Nuss / Dolce Pasta, el detalle por unidad del banner, los filtros al tocar Dolce (listado 3 de 5, pagado 2 de 3 con el "Sin unidad", facturas 1 de 2), el vacío de internos con "Hay 1 envío en otras unidades", y el wizard abierto con Dolce puesta.
- **La espera de 3 s** del `init` y el caso "la barra llega tarde" solo están cubiertos por la lectura del `init` (assertions de orden) y por ejecutar `aplicarBarraUnidad` con `listadoCargado` en false y en true.
- **Otra pestaña que cambia la barra** (el evento `storage` de `js/barra-unidad.js`): llega por el mismo `alCambiarUnidad`, no se probó en el navegador.

## Guion para Facu

1. Abrí Ingreso con tu usuario (que tiene más de una fábrica). Arriba tenés que ver la barra con **Todas** y tus fábricas. Ya **no** están los chips de fábrica abajo del buscador; los de "Todos / Remitos sin factura / Con factura vinculada" sí.
2. Con **Todas**: el cuadro "Ingresos del mes" dice el total y, abajo en chico, cuántos tuvo cada fábrica.
3. Tocá una fábrica en la barra: el listado, el número del cuadro, "Pagado sin ingresar", "Facturas por ingresar (N)" e "Ingresos internos" muestran solo lo de esa fábrica, **sin recargar**. Un gasto o una factura que no tiene fábrica sigue apareciendo y dice "Sin unidad".
4. Elegí una fábrica que no tenga nada: el listado dice "Hay N ingresos en otras unidades: elegí «Todas» arriba para verlos."
5. Con una fábrica elegida tocá "+ Cargar ingreso": la unidad del ingreso ya viene puesta con esa fábrica (si podés cargar ahí). Con **Todas**, el wizard te pide elegir la unidad.
6. En "Ingresos internos", con una fábrica elegida, la burbuja roja (si hay) al pasar el dedo / mouse dice "(en todas tus unidades)".

## Números finales

- `test-materia-prima-barra-unidad.js` **92/92** (nueva) · `mut-materia-prima-barra-unidad.js` **43/43** (nueva, sin equivalentes).
- `test-materia-prima-xss.js` **167/167** (igual que antes: el render de los chips de unidad se reemplazó por el del detalle por unidad del banner, con las mismas tres verificaciones de marcas; medido también contra el archivo de `5592f5a`) · `mut-materia-prima-xss.js` **123/123**.
- `test-materia-prima-fabrica-pruebas.js` **34/34** (antes 39: salieron las 6 verificaciones de los chips retirados y la de "la fábrica se asigna antes de dibujar los chips"; entraron 2 que exigen que los chips no vuelvan — el filtro de la fábrica de pruebas de la barra lo prueba `test-barra-unidad.js`) · `mut-materia-prima-fabrica-pruebas.js` **9/9** (antes 11: salieron las dos mutaciones que tocaban los chips).
- Las demás de Ingreso sin cambio de números: circuito 117/117 (mut 33/33), fotos 57/57 (mut 14/14), números 87/87 (mut 32/32), pendientes 38/38 (mut 19/19), por-ingresar 130/130 (mut 51/51), sin-stock 41/41 (mut 15/15). Dos anclas de mutaciones actualizadas sin aflojar nada: en `mut-materia-prima-por-ingresar.js` "los gastos de «Pagado sin ingresar» no se sacan" (la función ahora arma `const filas = …` antes de filtrar por la barra) y en `mut-materia-prima-pendientes.js` "la burbuja de internos lee la clave equivocada" (la llamada suma `{ nota: notaTodas }`).
- `check-bytes` verde, `check-scripts` OK, **`correr-todo` 126/126 en verde**. Todas las mutaciones corridas de a una.

## Qué sección de CLAUDE.md tocar

- **Módulo 6, Ingreso**: sumar un bloque "LA BARRA DE UNIDAD (28/09/2026)" con los puntos 1 a 7 de arriba, y en "Filtro de vínculo" sacar la frase "en una segunda fila de chips junto a la de unidades" (la de unidades ya no existe; "Se encadena con el filtro de unidad" → "con la unidad de la barra").
- **Arquitectura → Fábrica de pruebas → tabla "Dónde se aplica"**, fila Ingreso: "chips" ya no (lo hace la barra); queda "selector y preselección del wizard, `v_mis_unidades_stock` y `_recepcion`, el aviso de stock", y los números 34/34 · 9/9.
- **Cómo trabajar → suites**: sumar `test-/mut-materia-prima-barra-unidad.js` y los datos de maqueta `materia-prima`.

## Para el integrador

- **Ningún baseline de controles que reescribir**: este módulo no tiene `controles-*.js`, y la suite nueva usa el commit fijo `5592f5a` (que está en `main`).
- Si se quiere que Ingreso entre a `e2e/5-maqueta.spec.js` y `e2e/7-barra-unidad.spec.js`: archivo `modulos/materia-prima.html`, datos `materia-prima` (`e2e/maqueta/datos/materia-prima.json`, generado de `pruebas/datos-maqueta/materia-prima.js`). Un paso útil para la barra: tocar `.barra-unidad__chip` "Dolce Pasta" y esperar que `#lista-ingresos .tarjeta-lista` sean 3 y `#banner-ingresos-mes` diga 3.
- **Nada de permisos ni tareas nuevas**: no hace falta traspaso al chat de permisos.

## Qué automatizaría ahora

La tarea repetida más cara de esta parte fue **mirar la pantalla en la maqueta con la barra en cada unidad** (recargar, tocar un chip, contar filas y cifras a mano por JS, dos anchos). Lo que la saca: un paso genérico en `e2e/7-barra-unidad.spec.js` que, para cada pantalla de `PANTALLAS`, toque cada chip de la barra y exija (a) cero errores de consola, (b) sin scroll horizontal y (c) que el conteo de un selector de filas declarado por pantalla (`'#lista-ingresos .tarjeta-lista'`) no suba al elegir una unidad respecto de "Todas". Con eso cada módulo declara una línea (su selector de filas) y el chequeo corre en cada push sin que nadie abra un navegador.
