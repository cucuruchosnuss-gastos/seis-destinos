# Traspaso — Cobranzas con la barra de unidad de negocio (28/09/2026)

Para el chat de arquitectura (dueño de CLAUDE.md). Autocontenido: quien lo lea no vio nada del trabajo.

## Qué se hizo

Tanda nocturna 27-28/09/2026, Parte 4 ("la barra de unidad de negocio arriba, en toda la app"), en `modulos/cobranzas.html`. La barra (`js/barra-unidad.js`, commit `5592f5a`) ya la cargaba la pantalla; faltaba que el listado la obedeciera. **Cero SQL corrido, cero cambios de base, cero RPCs nuevas, cero tareas nuevas** (Supabase en solo lectura). No se tocó `js/barra-unidad.js`, `css/main.css`, `js/cobranzas-comun.js` ni `modulos/administracion.html`.

Rama: `worktree-agent-a3509154895262562` (sin push). Commits: `5d2cf9b` (el trabajo, las suites y los datos de maqueta) y el que anota este hash en el traspaso. Al cerrar, `check-bytes` verde y `correr-todo` **126/126**; las mutaciones de Cobranzas corridas de a una.

### El listado filtra por la unidad de la barra

- **Qué unidad cuenta — `unidadDeCobranza(c)`** (pura): la de `v_cobranzas.unidad_negocio_id`, **salvo en una por controlar (`registrada`), que no tiene unidad aunque la columna diga una**. Motivo verificado con `pg_get_functiondef` el 28/09/2026: `reabrir_cobranza` limpia `procesada_por/_en`, `cliente_id` y `proyecto_id` pero **NO `unidad_negocio_id`**, así que una cobranza reabierta conserva la unidad del cliente viejo; la que vale es la del cliente con que se vuelva a asentar. Las anuladas conservan la suya.
- **Con una unidad elegida se ven: sus asentadas, sus anuladas y TODO lo sin unidad** (las por controlar, las asentadas viejas sin unidad —10 al 28/09/2026—, las anuladas sin unidad). Nada desaparece por no tener unidad (regla g).
- **La consulta también filtra, porque el listado pagina de a 50**: filtrar solo en la pantalla dejaría páginas cortas o vacías con "Cargar más". `filtroUnidadDeConsulta(elegida)` arma `or=(unidad_negocio_id.eq.<uuid>,unidad_negocio_id.is.null,estado.eq.registrada)` — **no descarta los null** (un `.eq()` pelado sí). Solo se arma con un uuid válido (`UUID_COB`): el id no se mete crudo en un filtro de PostgREST. Sintaxis verificada contra PostgREST real con la key pública (la válida contesta 401 de permisos; una mal armada, 400 PGRST100).
- **La pantalla vuelve a filtrar al armar la lista** (`cobranzasVisibles()` con el `pasaFiltroUnidad` REAL de la barra), así cambiar la barra **repinta en el acto** con lo que ya estaba y lo que el servidor devolviera de más no se dibuja. `hayMas` se mide sobre la página que llegó.
- **La fila**: la unidad de la asentada (y ahora también de la anulada que la tiene) en la línea chica, como antes; **con una unidad elegida, lo sin unidad dice "Sin unidad"** (`.cob-unidad-sin`, `data-sin-unidad="fila"`). **Con "Todas" no se marca "Sin unidad"**: marcaría cada por controlar, que es ruido. En la **tabla de escritorio** la unidad (o "sin unidad") va **debajo del cliente, en su propio renglón chico, en la misma celda** (`.cob-unidad-tabla`): no hay columna nueva (las siete ya no entran a 1280 px); al lado del nombre se lo comía.
- **La nota** `#cob-nota-unidad`, arriba de la lista, solo con una unidad elegida: *"Se ven las cobranzas de <unidad> y las que todavía no tienen unidad (las por controlar la toman al asentarlas)."* (por `textContent`).
- **El vacío con una unidad**: *"No hay cobranzas de <unidad> ni sin unidad[ con esos filtros]."*
- **Escritorio**: si la cobranza abierta en el panel es de otra unidad, el panel se vacía (`soltarSeleccionFueraDelListado` mira lo que SE VE, no lo que llegó). Una por controlar abierta sigue.
- **Cambiar la barra con la pantalla abierta** (`alCambiarUnidad(alCambiarUnidadCob)`): repinta, pide la lista nueva y recalcula las cifras. Antes del primer listado solo guarda la unidad (ese listado ya sale con ella).
- **TURNO NUEVO en `cargarCobranzas`** (`turnoListado`): un listado que arranca de cero invalida la página en vuelo; una respuesta vieja (o su error) no se suma a la lista nueva. Antes no había turno.
- **El init** pide la barra EN PARALELO con el resto (`unidadesDeLaBarra()` apenas hay sesión) y el primer listado la espera **como mucho 3 s** (`MS_ESPERA_BARRA`); si tarda, sale sin filtro y se recarga al llegar.

### Las cifras de cabecera

`resumen_cobranzas(p_clave, p_desde, p_hasta, p_estado, p_repartidor)` **no recibe unidad** (verificado con `pg_get_function_identity_arguments` el 28/09/2026). Con una unidad elegida:
- **"Total del mes/período" dice en chico "· de todas las unidades"** (no se muestra el total de todas como si fuera de la unidad).
- **"Por controlar" NO lo dice, porque coincide**: las por controlar se ven en cualquier unidad (ver `unidadDeCobranza`).

### Qué selector se retiró

**Ninguno: Cobranzas no tenía un selector de unidad para mirar.** El diálogo de unidad del asentar ya se había ido a Administración el 27/09/2026. El filtro "Repartidor" queda. **La carga no pide unidad** (el chofer no la sabe): el formulario es byte a byte el de `5592f5a`, y la suite lo exige. **Ninguna operación de este módulo necesita una unidad** (regla f no aplica).

## Qué no se pudo filtrar, y por qué

- **El total de cabecera por unidad**: `resumen_cobranzas()` no recibe unidad. Lo dice la pantalla. **Pedido de base** (para quien tenga escritura): sumar `p_unidad uuid default null` a `resumen_cobranzas` con la MISMA regla que el listado — `(p_unidad is null or unidad_negocio_id = p_unidad or unidad_negocio_id is null or estado = 'registrada')` — y la pantalla le pasa `estado.unidadElegida`. Con eso también saldría el "total por unidad" de "Todas" (regla e), que hoy no está.
- **Hueco de base a anotar**: `reabrir_cobranza` no limpia `unidad_negocio_id`. La pantalla lo trata como sin unidad, pero la columna miente hasta el próximo asentado. Arreglo sugerido: poner `unidad_negocio_id = null` en el UPDATE de `reabrir_cobranza` (es un cambio de estructura de la función, no de datos; hoy hay 0 registradas con unidad).

## Hallazgo fuera de alcance (NO lo causó la barra; está igual en `5592f5a`)

**En la tabla de escritorio la columna CLIENTE queda en 0 px a 1440 px** (y a 1100 px con la barra lateral abierta). Medido en Chromium con la maqueta, contra la versión nueva y contra `git show 5592f5a:modulos/cobranzas.html`: con la barra lateral abierta (su default desde 1280 px), el ancho del cliente es 74 px a 1280, 193 a 1399, **0 a 1440** (entre 1400 y ~1500 vuelven Efectivo y Cargada por y no entra), 142 a 1600 y 214 a 1920. Lo causa la barra lateral (232 px, 27/09/2026) sobre los cortes de 1100/1399 del master-detail, que se calcularon sin ella. **No lo arreglé**: es un cambio de los cortes de escritorio que `test-cobranzas-escritorio.js` fija, y merece su propia parte. Propuesta: subir el corte de "esconder Efectivo y Cargada por" de 1399 a ~1599 px cuando el body tiene la barra lateral abierta, y volver a medir.

## Lo que NO se probó

- **Nada con sesión real ni contra la base**: la barra en producción, el `or()` contra el RLS real de `v_cobranzas`, un super_admin con las cuatro unidades.
- **La fábrica de pruebas en la barra** la resuelve `js/barra-unidad.js` (no es de este módulo).
- **El sincronizador sin señal** con una unidad elegida: las cobranzas solo locales no son filas del listado, no las toca la barra.

## Pruebas (números finales)

- **Nueva `pruebas/test-cobranzas-barra-unidad.js`: 52/52**; **`pruebas/mut-cobranzas-barra-unidad.js`: 41/41 mutaciones detectadas.** Ejecuta los renders reales: Todas muestra todo con la unidad de cada asentada (celular y escritorio) y sin marcas "Sin unidad"; una unidad muestra lo suyo + lo sin unidad, marcado; una reabierta cuenta como sin unidad; el `or()` exacto (y ningún `.eq` de unidad); un id no-uuid no entra al filtro; el turno descarta la respuesta y el error viejos; cambiar la barra repinta en el acto, recarga con la unidad nueva y recalcula las cifras; la misma unidad no recarga; el panel de escritorio se suelta si la abierta es de otra unidad; el total dice "de todas las unidades" y "Por controlar" no; `cargarResumen` no manda unidad. Baseline FIJO **`5592f5a`**: el formulario de carga es idéntico.
- Suites existentes que se ajustaron **sin aflojar lo que protegen**:
  - `sandbox.js`, `test-cobranzas-cabecera.js`, `test-cobranzas-unidad.js`, `test-cobranzas-escritorio.js`: suman `unidadDeCobranza` (y en escritorio `cobranzasVisibles`, `pasaFiltroUnidad`, `nombreUnidadElegida`, `pintarNotaUnidad`) a su lista de funciones; cabecera suma `var turnoListado`, `filtroUnidadDeConsulta` y `UUID_COB`, y declara el texto del filtro de PostgREST (`...estado.eq.registrada`) como valor de la base en su lista de permitidos.
  - `test-cobranzas-escritorio.js`: el CSS de abajo de 1100 px sigue idéntico al de `f3633ba` salvo las reglas nuevas con prefijo `.cob-unidad-` (sumado a `ENTRARON`, con su motivo).
  - `test-cobranzas-xss.js`: `unidadTabla` entra a `SEGURAS_LOCALES` con su motivo (HTML armado con `escCob`).
  - `mut-cobranzas-escritorio.js`, `mut-cobranzas-unidad.js`, `mut-cobranzas-cabecera.js`: tres anclas se movieron con el código (la selección mira `cobranzasVisibles()`; la regla "por controlar no muestra unidad" vive en `unidadDeCobranza`; el bloque de reiniciar suma `turnoListado++`). Cada mutación sigue rompiendo lo mismo.
- Números al cerrar: cabecera 72/72 (mut 48/48), escritorio 57/57 (mut 45/45), unidad 33/33 (mut 17/17), xss 282/282, fábrica 16/16, fotos 101/101, números 145/145, diálogos 72/72, controles-cobranzas 316/316, administración-cobranzas 131/131; mutaciones de diálogos 20/20, fábrica 7/7, fotos 35/35 (+2 eq.), números 20/20, xss (todas detectadas). `check-bytes` y `correr-todo` en verde (ver el número total en la respuesta del subagente).
- **Mirado en la maqueta** (Chromium headless, datos `pruebas/datos-maqueta/cobranzas.js` → `e2e/maqueta/datos/cobranzas.json`, una persona con Cucuruchos Nuss propia + Dolce Pasta por alcance) a **390 y 1280 px**, con Todas, Nuss y Dolce Pasta: sin scroll horizontal, sin errores de JavaScript, la barra con tres chips, tocar "Dolce Pasta" con la pantalla abierta repinta sin recargar. Para sumarla a `e2e/5-maqueta.spec.js` / `e2e/7-barra-unidad.spec.js`: archivo `modulos/cobranzas.html`, datos `cobranzas`.

## Controles

`controles-cobranzas.js` 316/316: **ningún control se perdió** (baseline `fba6396`); se sumó `#cob-nota-unidad`. **No hay baseline de controles nuevo que reescribir** al integrar por cherry-pick. El único commit fijo que nombra la suite nueva es `5592f5a`, que ya está en `main`.

## Guion para Facu

1. Abrí Cobranzas en la compu. Arriba tiene que estar la barra con "Todas" y tus fábricas.
2. Con **Todas**: ves todas las cobranzas; las asentadas dicen su fábrica en la línea chica (en la compu, debajo del cliente).
3. Tocá **una fábrica**: sin recargar, quedan solo sus asentadas y todas las que todavía no tienen fábrica (las por controlar), que dicen "Sin unidad". Arriba de la lista aparece la línea que lo explica.
4. Mirá las cifras de arriba: "Por controlar" es el mismo número; el total dice en chico "de todas las unidades" (todavía no se puede sacar el total de una sola fábrica).
5. Asentá una en Administración, volvé a Cobranzas con esa fábrica elegida: tiene que seguir apareciendo (ya con su fábrica). Con otra fábrica elegida, desaparece.
6. En el celular, cargá una cobranza nueva: no te pide fábrica.
7. En una compu de 1440 px de ancho con la barra lateral abierta, fijate la columna "Cliente" de la tabla: hoy queda sin lugar (bug que ya estaba; ver "Hallazgo").

## Qué sección de CLAUDE.md tocar

- **Módulo 8, Cobranzas**: una entrada "La barra de unidad de negocio (28/09/2026)" con lo de arriba (la regla de `unidadDeCobranza`, el `or()` que no descarta nulls, la nota, las marcas, el turno nuevo, las cifras) y que la carga no pide unidad.
- **Tablas → Cobranzas → `cobranzas.unidad_negocio_id`**: agregar que `reabrir_cobranza` NO la limpia (verificado el 28/09/2026) y que la pantalla trata una por controlar como sin unidad.
- **RPCs → Cobranzas → `resumen_cobranzas`**: no recibe unidad; la pantalla lo dice. Pedido de `p_unidad`.
- **Pruebas (`pruebas/`)**: `test-/mut-cobranzas-barra-unidad.js` (52/52; 41/41) y los datos de maqueta `cobranzas`.
- **Aprendizajes o módulo 8**: el hallazgo del cliente en 0 px a 1440 con la barra lateral.

## Qué automatizaría ahora

**Medir el ancho real de las columnas de toda tabla de escritorio en la maqueta**, en `e2e/5-maqueta.spec.js`: para cada pantalla con tabla, a 1100/1280/1440/1600/1920 px con la barra lateral abierta y achicada, exigir que ninguna celda de texto principal (cliente, nombre) mida menos de ~80 px. El bug del cliente en 0 px pasó por todas las suites (que miran el CSS como texto) y por la maqueta (que solo mira el scroll horizontal): solo se ve midiendo el `getBoundingClientRect` de una celda. El script que lo encontró está hecho en diez líneas (Playwright contra `servir.js`, recorriendo anchos) y se puede generalizar leyendo las cabeceras de tabla de cada pantalla.
