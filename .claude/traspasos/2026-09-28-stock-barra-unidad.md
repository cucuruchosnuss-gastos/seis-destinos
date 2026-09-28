# Traspaso — Stock y la barra de unidad de arriba (28/09/2026)

**Para el chat de arquitectura** (dueño de CLAUDE.md). Quien lo recibe no vio nada de este trabajo: todo lo que hace falta está acá. Lo hizo el subagente de Stock en su rama, sin push; lo integra el agente que lo invocó.

## Qué pidió Facu

Elegir la fábrica UNA vez, arriba, y que toda la app muestre solo lo de esa fábrica. La barra ya existía (`js/barra-unidad.js` + su CSS en `main.css`, commit `5592f5a`) y `modulos/stock.html` ya la cargaba en el `<head>`; faltaba que Stock la USE. No se tocó `js/barra-unidad.js` (compartido) ni nada fuera del territorio de Stock. **Cero SQL, cero cambios de base, cero permisos nuevos.**

## Qué se hizo (commit de la rama `worktree-agent-adfddcb0a8b4c350f`)

`modulos/stock.html` importa `unidadesDeLaBarra`, `alCambiarUnidad` y `pasaFiltroUnidad` de `js/barra-unidad.js` y filtra lo que muestra por la unidad elegida:

1. **Se retiraron los chips de unidad PARA MIRAR** de tres vistas (nunca dos lugares para lo mismo): `#chips-unidad-stock` (listado de stock), `#chips-unidad-historial` (historial de recuentos) y `#chips-unidad-mermas` (tablero de mermas), con sus funciones `renderizarChipsUnidadStock/Historial/Merma` y los campos `estado.unidadStock / unidadHist / unidadMerma`. Declarados en `pruebas/controles-stock.js` en una lista nueva **`RETIRADOS`** (y `MENOS_COPIAS` para `button[data-unidad]`, que baja de 2 a 1 porque queda el del recuento), con el motivo "lo decide la barra de unidad de arriba". Un retirado que vuelva al archivo, o una declaración que apunte a algo que no estaba en el baseline, da rojo.
2. **El estado de la barra** vive en `estado.unidadBarra` (id, o null = Todas; también null con una sola unidad, que es cuando la barra no aparece), `estado.unidadesBarra` (para los nombres) y `estado.barraVisible`. `init()` pide la barra **en paralelo** con el resto (`estado.barraLista = unidadesDeLaBarra().then(aplicarEstadoBarra, …)`) y se suscribe con `alCambiarUnidad(alCambiarBarra)`. Cada carga (`cargarStock`, `cargarHistorial`, `cargarMermas`, `cargarTransito`, `cargarUnidadesRecuento`) hace sus consultas y **espera la barra recién antes de dibujar**. `estado.cargados` dice qué vistas ya tienen datos: cambiar la barra repinta solo esas, sin recargar.
3. **Listado de stock.** Con una unidad elegida, solo lo suyo (como antes con el chip). **Con "Todas" y más de una unidad con stock: un insumo que está en VARIAS unidades es UNA tarjeta con la suma** (en la unidad del catálogo, que es una sola por insumo) **y un renglón por unidad** (botón de 44 px con el nombre y la cantidad de esa unidad, que abre el detalle por lote de ESA unidad); uno que está en una sola lleva el nombre de su unidad en la línea gris. Los bultos no se suman entre unidades (cada una puede tener otra presentación): la tarjeta sumada muestra la cantidad en la unidad base, y el detalle por lote de cada unidad sigue mostrando los bultos.
4. **Historial de recuentos, mermas, tránsito e historial de transferencias** filtran por la barra. El tránsito y el historial de transferencias muestran las que **salen de O llegan a** la unidad elegida. En mermas, con "Todas" y más de una unidad en el mes, una línea con cuántas pérdidas tuvo cada unidad (el conteo, que es lo único que se suma sin mentir). Los vacíos con una unidad elegida la nombran ("No hay recuentos en Dolce Pasta.").
5. **SIN PERMISO SE DICE, no se muestra vacío.** La barra muestra las unidades de la PERSONA (la propia + el alcance de TODAS sus tareas), y cada vista de Stock tiene su propio alcance. Con una unidad elegida donde esa vista no tiene permiso, un aviso (`#stock-aviso-unidad`, `#hist-aviso-unidad`, `#mermas-aviso-unidad`, `#transito-aviso-unidad`, `#rec-aviso-unidad`) dice "No tenés permiso para ver el stock en Mengui." y la lista queda vacía sin el "no hay nada". El historial mira `ver` **o** `ajustar_inventario` (así es la policy de `v_recuentos`).
6. **Lo que necesita UNA unidad para operar** (regla f):
   - **Recuento:** con una unidad elegida (y con `ajustar_inventario` ahí), se cuenta en esa y los chips no aparecen; sin permiso ahí, lo dice y no cuenta en ninguna; **con "Todas" y dos o más unidades de ajuste, los chips de `#chips-unidad-recuento` piden elegir** (con el aviso "Elegí en qué unidad vas a contar"), y **ya no se elige la primera por las dudas** como antes; con una sola, esa. Cambiar la barra con un recuento abierto **guarda lo contado antes** (`guardarConteoAhora`) y relee. `cargarRecuento` ganó **turno** (`turnoRecuento`) y `cargarItemsRecuento` no escribe si el recuento cambió mientras viajaba.
   - **Corregir stock (movimiento):** la unidad de la barra **viene puesta** si en ese modo hay permiso ahí, pero **no fija** (se puede cambiar: es la unidad de un registro nuevo). Sin permiso en ese modo, `#mov-aviso-unidad-barra` lo dice y, con una sola posible, muestra en cuál queda.
   - **Enviar a otra unidad:** el origen viene puesto con la unidad de la barra si desde ahí se puede enviar; si no, `#transf-aviso-unidad-barra` lo dice y se elige ahí. El destino no cambió.
7. **Catálogo y alias:** son uno solo para todas las unidades; con la barra a la vista, una nota chica (`#catalogo-nota-unidad`, `#alias-nota-unidad`, clase `.nota-unidad-barra`) dice que la barra no los filtra.
8. **CSS nuevo al final del `<style>`** (variante `.fila-stock--grupo` después de su base, por la trampa del orden): `.fila-stock__cabeza`, `.fila-stock__unidades`, `.fila-stock__unidad(-nombre/-cant/-cant--negativa)`, `.nota-unidad-barra`.

## Decisiones, con su motivo

- **Se filtra donde se arma la lista, nunca en la consulta.** Las cinco `v_mis_unidades_*` siguen cargándose: son las que dicen los PERMISOS de cada vista. La barra solo filtra lo que se muestra.
- **Stock no tiene nada "sin unidad"** (regla g): toda fila de `v_stock_insumos`, `v_recuentos`, `v_mermas` y de las transferencias tiene su unidad. El tránsito no usa `pasaFiltroUnidad` sino su propia regla (`pasaTransfPorBarra`: origen O destino), porque una transferencia tiene dos unidades.
- **El recuento con "Todas" pide elegir** en vez de tomar la primera: un recuento es de UNA unidad, y contar en la que nadie eligió genera ajustes en la unidad equivocada.
- **Los chips del recuento, del movimiento y de la transferencia NO se retiraron**: no son un filtro, eligen la unidad de algo nuevo.
- **La tarjeta sumada no suma bultos** ni aplica la vista preferida: no existe un bulto que represente a dos unidades con presentaciones distintas.

## Qué no se pudo filtrar (regla h)

Nada quedó sin filtrar por falta de columna o de RPC: todo lo que Stock muestra trae su unidad. El catálogo y los alias no se filtran **por diseño** (son únicos para las cuatro unidades), y la pantalla lo dice.

## Lo que NO se probó

- **Nada con sesión real ni contra la base**: las suites corren contra un doble y la pantalla se miró en la **maqueta** (datos fijos, `pruebas/datos-maqueta/stock.js` → `e2e/maqueta/datos/stock.json`, nuevos).
- Mirado en la maqueta a **390 y 1280 px**, sin scroll horizontal y sin errores de consola: listado con "Todas" (tarjeta sumada de la harina 6.250 + 500 kg y de la caja), Dolce Pasta, Mengui (sin permiso: el aviso), recuento con Todas (pide elegir) / Dolce / Mengui, la nota del catálogo, mermas con el conteo por unidad, tránsito y historial con Dolce, "Corregir stock" en Dolce (ajuste puesto en Dolce; baja: el aviso y queda en Nuss) y "Enviar" (origen Dolce puesto).
- No se probó el cambio de barra **con un recuento a medio contar** en un navegador (sí en la suite, con `guardarConteoAhora` observado).

## Guion para Facu (cuando haya sesión real)

1. Entrá a Stock con una cuenta que tenga stock en dos unidades. Arriba, en la barra, tocá **Todas**: la harina (o cualquier insumo que esté en las dos) tiene que aparecer **una sola vez**, con el total sumado y un renglón por unidad abajo.
2. Tocá el renglón de una unidad: se abre el detalle por lote **de esa unidad**.
3. Elegí **una unidad** en la barra: el listado muestra solo lo de ella, sin nombres de unidad.
4. Si tu cuenta tiene alguna unidad en la barra donde no ves stock (por una tarea de otro módulo), elegila: tiene que decir **"No tenés permiso para ver el stock en …"**, no un listado vacío.
5. Con una unidad elegida, entrá a **Historial de recuentos**, **Mermas** y **En tránsito**: solo lo de esa unidad (en tránsito, lo que sale de ella o llega a ella).
6. Pestaña **Recuento** con **Todas**: tiene que pedirte elegir en qué unidad contar (no elige sola). Con una unidad en la barra: va derecho a esa.
7. Con un recuento abierto y algo contado, cambiá la barra a otra unidad y volvé: lo contado tiene que seguir ahí.
8. **Corregir stock** y **Enviar a otra unidad** con una unidad en la barra: vienen con esa unidad puesta, y se puede cambiar.
9. Pestaña **Catálogo**: abajo del buscador, una nota chica dice que la barra no lo filtra.

## Números finales

- `test-stock-barra-unidad.js` **85/85** (nueva) — `mut-stock-barra-unidad.js` **50/50** (nueva).
- `test-stock-xss.js` **238/238** (era 234: sumó la tarjeta sumada y el conteo por unidad de mermas; se sacaron los tres chequeos de los chips retirados) — `mut-stock-xss.js` **193/193** (+4 equivalentes).
- `test-stock-fabrica-pruebas.js` **40/40** (era 44: se fueron los chequeos de los chips retirados; lo que protegían —que la unidad del robot no se ofrezca— lo cubren la lista `estado.unidadesStock` y la barra, que saca la fábrica de pruebas por su cuenta) — `mut-stock-fabrica-pruebas.js` **16/16**.
- `controles-stock.js` **993/993** (baseline `2cd547a`, sin cambiar) con `RETIRADOS` y `MENOS_COPIAS` nuevos.
- `mut-stock-numeros.js` **46/46** (suite 112/112) · `mut-stock-recuento.js` **75/75** (suite 158/158) · `mut-stock-pendientes.js` **28/28** (suite 66/66).
- `node pruebas/check-bytes.js && node pruebas/correr-todo.js`: **126/126 en verde** (todo el repo), 0 CR, 0 NUL.

## Baselines al integrar por cherry-pick

**Ninguno para reescribir.** `test-stock-barra-unidad.js` compara contra `5592f5a` y `controles-stock.js` contra `2cd547a`, los dos commits de `main`.

## Para e2e (los integra el agente que invocó)

Para sumar Stock a `e2e/5-maqueta.spec.js` / `e2e/7-barra-unidad.spec.js`: archivo `modulos/stock.html`, datos **`stock`** (`?maqueta=stock`). La barra muestra Todas / Nuss / Dolce Pasta / Mengui; en Mengui el listado dice "No tenés permiso para ver el stock en Mengui."

## Qué hay que tocar en CLAUDE.md

- **Módulo 7 (Stock)**: una entrada nueva "LA BARRA DE UNIDAD DE ARRIBA (28/09/2026)" con los puntos 1 a 8 de arriba. Y corregir lo que quedó viejo: el historial ya no tiene chips ("Lista desde `v_recuentos`, con chips de unidad"), el tablero de mermas tampoco ("Los chips de la pantalla son un FILTRO" ahora es la barra), y el recuento ya no elige la primera unidad sola con varias.
- **Tabla de la Fábrica de pruebas** (fila de Stock): "las cinco `v_mis_unidades_*` y los destinos de transferencia" siguen; los chips de stock/historial/mermas ya no existen (los reemplaza la barra, que filtra la fábrica por su cuenta). La suite pasó de 44/44 · 16/16 a 40/40 · **16/16**.
- **Suites** (`pruebas/`): `test-/mut-stock-barra-unidad.js` y los datos de maqueta `pruebas/datos-maqueta/stock.js`.

## Qué automatizaría ahora

**Una clausura de funciones compartida para los sandboxes de un módulo.** `test-stock-xss.js` y `test-stock-barra-unidad.js` tienen hoy la MISMA función `clausura()` copiada (junta las funciones reales que un render usa, siguiendo nombres), y cada suite nueva de Stock (y de los otros módulos grandes) la vuelve a copiar con su lista de STUBS. Llevarla a `pruebas/sandbox.js` como `sandboxPorClausura(archivo, { renders, stubs, preludio, retorno })` ahorra copiarla en cada suite y hace que una mejora (por ejemplo, seguir también los nombres importados de `js/`) llegue a todas. Es la tarea repetida más cara que vi en esta parte: la suite nueva tardó más en armar el sandbox que en escribir las verificaciones.
