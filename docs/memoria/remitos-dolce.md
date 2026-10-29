# Remitos Dolce (modulos/remitos-dolce.html)

Desde el 28/10/2026 (rama `ci-prueba/modulo-remitos-dolce`, pedido de Facu: "los remitos de Rosario en un MÓDULO
APARTE, que no se mezclen con la Carga ni con Administración"). Antes (27/10/2026) subir vivía en la Carga
(retiros.md, "Subir remitos Rosario") y revisar en Administración → Órdenes (administracion.md, "Remitos
precargados de Rosario"): esas dos secciones describen el código que se MUDÓ tal cual acá.

## Cómo está armado
- Un HTML vanilla como los demás. El código se movió (no se copió) con un script que lo saca por anclas; los nombres
  de clase quedaron como venían: `rt-*` lo de Subir, `ad-*` lo de Revisar; `rd-*` es lo propio del módulo (pestañas,
  link). El CSS de base que usan (botones, filas, sellos) se copió de la Carga y de Administración (regla de duplicar).
- Lo que usan dos pantallas está en **`js/remitos-comun.js`** (decimoséptima excepción, arquitectura.md):
  `talonarioDe`, `textoNumeroRemito`, `htmlSelloAcopio`, y el catálogo de un renglón (`GRUPOS_REMITO`,
  `presentacionRemito`, `nombreRenglonRemito`, `opcionesRemito(cat, categorias)`, `gruposRemito(cat, busqueda,
  categorias)`). Administración lo importa para "Nuevo acopio" y la ficha de la orden.
- Color propio: el azul de Rosario, `PALETA_MODULO['remitos-dolce'] = [0.50, 0.13, 250]`; ícono del remito
  (`ICONOS['remitos-dolce']`); en la barra, después de Órdenes de retiro.
- La tarjeta del menú (js/modulos.js): `requiereModulo: 'retiros'`, `requiereTareas: ['retiros:cargar',
  'retiros:ver']` y **`alcanceEn`** = el id de Dolce Pasta (`118b348c-…`, verificado el 28/10/2026):
  `moduloVisible` pide que esa tarea alcance esa fábrica (la regla de `tiene_tarea_alcance`: `{"todas": true}` o el id
  en `unidades`; null no). El dashboard y la barra lateral pasan `misAlcances` (leen `alcance` de `empleado_tareas`);
  sin alcances leídos la tarjeta no se ve. Ningún otro módulo usa `alcanceEn`.
- `<meta name="sd-unidad" content="no-filtra">`: la pantalla elige sola la fábrica (las sin control de stock).

## Arranque y permisos
- `cargarPermisos` (empleados + `empleado_tareas` del módulo `retiros` con su alcance) y `cargarFabricas`
  (`unidades_negocio`: todas para nombrarlas —"(también en Nuss)"— y las **sin control de stock** donde la persona
  carga o ve retiros, sin la de pruebas para una cuenta real).
- Pestañas (`pestanasVisibles`): **Subir** con `retiros:cargar`, **Revisar** (a la vista **"Órdenes cargadas"** desde el
  29/10/2026; adentro de un remito se sale con "‹ Remitos": ver "Un solo recorrido") con `retiros:ver` (en esa fábrica). Con
  una sola, la barra de pestañas no se ve. Sin ninguna: "No tenés permiso…" y vuelve al dashboard. `?pestana=subir|revisar`
  (los links de la Carga y de Administración) o la última usada (`remitos-dolce.pestana`). Adentro de un remito no hay
  pestañas (se sale con "‹ Revisar", que manda antes lo que quedó sin guardar: ver "El autoguardado").

## Subir
Lo de retiros.md "Subir remitos Rosario", con estos cambios: sin el botón de entrada ni la flecha de volver (es su
pestaña); la fábrica: la elegida, con una sola esa, si no la última usada (ya no la de la barra); el estado vive en
`estado.subida`; **"Confirmado: Orden D-0012"** con la columna **`remitos_precarga.orden_codigo`** (verificada con
information_schema el 28/10/2026; antes un embed de `ordenes_retiro` que Manuel, sin `retiros:ver`, no podía leer).

## Revisar
Lo de administracion.md "Remitos precargados de Rosario" (corregir, confirmar, descartar, talonario Oficial / Acopio,
saldo de acopio, zoom de la foto, Volver a leer), con estos cambios: después de confirmar o descartar vuelve a Revisar;
el aviso dice "Ya se puede valorizar en Administración.". **Abajo, las órdenes por N° de remito** (`cargarOrdenesRemito`:
`ordenes_retiro` de la fábrica de los últimos 120 días, tope 400, con `numero_remito`, `numero_remito_n` y `talonario`),
en solapas Oficial / Acopio, el más nuevo primero y las sin número al final, **de solo lectura** (sello Valorizada /
Por valorizar / Anulada, sin plata) y "Valorizar en Administración →" con `retiros:precios`.

### El autoguardado (29/10/2026, rama `ci-prueba/remitos-autoguardado`)
Pedido de Facu: "Guardar" y "Confirmar" confundían (tocó Guardar, salió "guardado" y pensó que había confirmado).
**Ya no hay botón Guardar**: quedan **Confirmar** (crea la orden), Volver a leer y Descartar.
- Cada cambio se manda solo a `actualizar_remito_precarga` (firma verificada con pg_get_functiondef el 29/10/2026:
  `(p_id, p_numero_remito, p_fecha, p_cliente_id, p_transporte, p_observaciones, p_items, p_talonario)`, devuelve la
  fila normalizada y la deja en 'precargada'). Lo que se **toca** (cliente, talonario, producto, insumo, cono, Aceptar
  sugerencia, "No va en la orden", agregar/quitar renglón o lote), en seguida; lo que se **escribe** (número, fecha,
  transporte, observaciones, cantidad, lote, cajas del lote), después de `RETARDO_AUTOGUARDADO_REMITO` (800 ms) sin
  tocar nada, y al salir del campo (`change` → `guardarYaRemito`). Buscar (cliente, producto, cono) no guarda.
- **Una sola llamada a la vez** (`autoguardarRemito`, `rm.guardando`): la que vuelve, si hubo cambios mientras tanto
  (`rm.version`), manda lo último. Así una respuesta vieja no pisa a una nueva ni en la pantalla ni en la base. Lo que
  vuelve deja al día `rm.fila` y la lista, pero **NO rearma el formulario** (pisaría lo que se escribe, un renglón con
  el buscador abierto o un lote a medio cargar); lo idéntico a lo último guardado (`rm.ultimoGuardado`, el JSON de los
  parámetros) no se vuelve a mandar. Sin `retiros:cargar` no se guarda nada.
- El estado chico al lado de Confirmar (`#ad-rm-guardado`, `pintarGuardadoRemito` lo pinta solo, sin redibujar):
  "Los cambios se guardan solos." al abrir, **"Guardando…"**, **"Guardado"** o **el error de la base tal cual**, en
  bordó. Un error se borra con el próximo guardado bueno; si falla una vieja con algo nuevo detrás, se manda lo nuevo
  sin mostrar ese error.
- **Confirmar** (`esperarGuardadoRemito`): espera la llamada en curso, manda lo que esperaba el retardo y recién después
  llama a `confirmar_remito_precarga`; si el guardado falla, no confirma (el error, pegado a los botones). Antes de
  confirmar rearma el formulario con lo guardado (el amarillo es el de la base: si dice "el renglón 2 está en amarillo",
  se ve). Mientras confirma, el autoguardado queda en pausa (`rm.pausado`); si confirmar falla, lo cambiado mientras
  tanto se manda.
- **"‹ Revisar"** con algo pendiente lo manda y sale cuando la base respondió; si lo rechaza, se queda con el error y
  el segundo toque sale igual. Cambiar de pestaña con algo pendiente hace lo mismo. Al esconder la página
  (`visibilitychange`, `pagehide`) se manda ya, y `beforeunload` pregunta si quedó algo sin llegar.
- **Volver a leer y Descartar** (`frenarAutoguardadoRemito`): esperan la llamada en curso (que no caiga en la base
  DESPUÉS) y no mandan lo que esperaba el retardo (se pisa o se tira); si fallan, lo pendiente se manda.

### La orden interna y los lotes (29/10/2026, rama `ci-prueba/recibir-entre-empresas`)
- **Orden interna**: si el cliente ES otra empresa del grupo (`clientes.unidad_grupo_id`, que `leerClientes` ya traía;
  ej. "Paz Mirta" = Cucuruchos Nuss), arriba de la barra de Confirmar va `#ad-rm-interna`: "Es una orden interna: la
  mercadería va en tránsito hasta que <empresa> la reciba." (`empresaGrupoRemito`, `textoOrdenInterna`; la misma
  fábrica no cuenta; una empresa que no se conoce, "la otra empresa del grupo"). El aviso de confirmada suma "Va en
  tránsito hasta que <empresa> la reciba.". La base (`_orden_grupo_espejar`, 29/10) arma la recepción en tránsito; se
  recibe en Stock (stock.md).
- **Varios lotes por renglón**: ya existían (lote + cajas, "+ Agregar lote", quitar, lo leído por la IA precargado,
  mayúsculas y 40 letras al guardar). El pie ahora dice **"Lotes: 25 de 31 cajas · faltan 6 cajas"**, con "Lotes: …" en
  amarillo (`.ad-rm-lotes__asignado--falta`) mientras no suman; la base lo rechaza al confirmar ("los lotes suman X y
  el renglón dice Y"). Formato de `p_items[].lotes`: [{lote, cajas}] en producto (verificado con pg_get_functiondef de
  `_remito_items_normalizar` el 29/10/2026; en insumo la base ya acepta {lote, cantidad}, la pantalla todavía no).
- Suites `test-/mut-remitos-dolce-interna-lotes.js` (33; 15/15, baseline 497c393) y `e2e/98-recibir-entre-empresas.spec.js`
  (la maqueta `remitos-dolce-revisar` tiene el cliente `c-d-paz` del grupo).

## Un solo recorrido (29/10/2026, rama `ci-prueba/remitos-mas-simple`)
Pedido de Facu: "que Manuel suba la foto y cargue los lotes en el mismo lugar, sin ir a otra pestaña a revisar".
**Lo de arriba sobre "Revisar" sigue valiendo por dentro** (la pestaña se llama `'revisar'` en el código, `rd-vista-revisar`,
`mostrarRevisar`), pero el usuario ya no ve esa palabra.
- **Subir**: leído, el remito queda en **NARANJA "Listo para cargar lotes"** (`estadoRemitoSubido` → `abrir: true`;
  `detalleListoSubida`: "Remito N° … · cliente · N renglones"; el cliente, el elegido si ya se leyeron los clientes de esa
  fábrica —`asegurarClientesSubida`, una lectura al costado— o el leído). `leerMisRemitos` ahora trae `cliente_id,
  cliente_leido, items`. La tarjeta entera es un `<button data-remito-abrir>` (con `retiros:cargar` en esa fábrica; sin eso se
  ve igual pero no se abre) que llama a **`abrirRemito(id, 'subir')`**: el mismo editor `ad-vista-remito`, que pasa a la
  fábrica del remito (`usarEmpresaRemito`). Estados a la vista: "Leyendo…" (gris) → "Listo para cargar lotes" (naranja) →
  **"Orden cargada · D-00XX"** (verde, `orden_codigo` o la respuesta de `confirmar_remito_precarga`, verificada con
  pg_get_functiondef el 29/10/2026: `v_res` con `codigo` + `numero_remito` y `talonario`) / "No se pudo leer" (rojo, igual).
  En la base sigue 'precargada' / 'confirmada'.
- **"‹ Remitos"** (antes "‹ Revisar") y Confirmar/Descartar vuelven a donde se abrió (`estado.origenRemito`, `salirDeRemito`);
  cambiar de pestaña con algo pendiente lo manda y va a la pestaña tocada (`volverDeRemito(p)`). Todo el autoguardado igual.
- Lo confirmado o descartado en la visita queda marcado (`marcarSubidoRemito`, `conResueltosSubida`): una lectura vieja que
  todavía lo trae 'precargada' no lo vuelve naranja (la maqueta no cambia las tablas al confirmar).
- **"Órdenes cargadas"** (la segunda pestaña, `retiros:ver`): arriba **"Sin terminar · para cargar lotes"** (los
  precargados/leyendo/error de CUALQUIERA, para que otro los termine; sin ninguno, la sección no se ve) y abajo **"Órdenes
  cargadas por N° de remito"** con **"Buscar por N° de remito"** (`buscarOrdenRemito`, `digitosRemito`: los dígitos en
  cualquier parte del número). `?pestana=revisar` (los links de la Carga y Administración) la abre: no se tocaron.
- El sello del renglón dudoso dice **"Controlar"**; el pie de lotes **"Lotes: 25 de 31 cajas · falta repartir 6 cajas"**
  ("1 caja"). Los sellos de color (`.ad-sello.ad-sello--x`) ya no los pisa la regla base `.ad-sello` (salían grises).
- **El buscador de conos** (`conosParaBuscar`, `MIN_LETRAS_CONO` 2, `MAX_CONOS_REMITO` 20): con menos de 2 letras ninguno y
  la pista "Escribí 2 o 3 letras del cono"; con 2, primero los que EMPIEZAN así (el nombre o una palabra), después los que lo
  contienen, sin tildes; lista vertical, `max-height: 16rem; overflow-y: auto`. Con cono elegido (también el que leyó la IA):
  cerrado, el cono a la vista y "Cambiar" (`cambiarConoRemito`, `r.cambiandoCono`; "Dejar X" vuelve). El selector de
  producto ya tenía scroll: quedó con la misma altura (16rem).
- **"× N u."** (`js/remitos-comun.js`: `unidadesPresentacionRemito`, `textoUnidadesRemito`; `producto_presentaciones.unidades_por_caja`
  integer not null, information_schema el 29/10/2026): "Barquillo 40 x4 · Caja con cono × 252 u. · GLACE", "Media caja × 128 u.";
  con 1 ("Por cono") nada; si el nombre ya trae el número ("Caja ×1800", "Caja x 48") no se repite; miles con punto. Las
  opciones también, y el número se busca ("180" → la Caja N°2). En el renglón elegido, en negrita (`htmlNombreRenglonRemito`,
  `.ad-rm-unidades` sin cortarse). Administración ("Nuevo acopio") usa el mismo `nombreRenglonRemito`/`gruposRemito`: también
  lo muestra. La Carga y la hoja no lo usan.
- Suites `test-/mut-remitos-dolce-mas-simple.js` (112; 77/77, baseline 2003aa3; también `test-remitos-dolce-subir` 156 / 125/125 y `-revisar` 188 / 98/98), `e2e/99-remitos-mas-simple.spec.js` (maqueta
  nueva `remitos-dolce-mas-simple`: el catálogo de Dolce de la base y 30 conos). La maqueta `remitos-dolce-revisar` tenía el
  cliente `c-d-paz` solo en el `.json`: ahora sale del generador.

## Lo que quedó afuera
- **La Carga** (retiros.html): un link chico **"Remitos Dolce →"** (`#rt-link-remitos`, a `?pestana=subir`), con la
  misma regla de antes (retiros:cargar en una fábrica sin control; `pintarEntradaRemitos`).
- **Administración**: en Órdenes de una fábrica sin control, la lista DE SIEMPRE (sin solapas ni orden por remito) y un
  link chico **"Remitos Dolce →"** (`pintarLinkRemitos`, a `?pestana=revisar`). La ficha y la hoja siguen diciendo
  "Remito N° X" / "Acopio N° X".
- **La hoja de la Carga** (28/10/2026): `mis_ordenes_retiro` devuelve `numero_remito` y `talonario`
  (pg_get_functiondef el 28/10/2026) y `ordenParaHoja` los pasa: la hoja y el PDF impresos desde la Carga dicen
  "Remito N° X".
- **ocr-remito**: publicada por el chat de la base el 28/10/2026 con `MODELO_POR_DEFECTO = 'claude-opus-5'`; el repo
  quedó igual a lo publicado.

## Pruebas
- `test-/mut-remitos-dolce-subir.js` (152; mut 125/125 + 2 equivalentes, baseline la Carga de 133555d),
  `test-/mut-remitos-dolce-revisar.js` (185; mut 98/98 + 55 equivalentes, baseline Administración de 133555d; la vieja
  mut-administracion-remitos-precarga estaba ROTA desde el 27/10: un ancla repetida por los Acopios; sus 6 mutaciones de
  `js/remitos-comun.js` daban "error del test" hasta el 29/10: el runner mandaba la copia por
  `ARCHIVO_JS_REMITOS_COMUN` y el arnés lee `ARCHIVO_COMUN_REMITOS` → alias en `imports.js` y la línea `COMUN` en la suite),
  `test-/mut-remitos-dolce-autoguardado.js` (140; 42/42, baseline el módulo de 2d04d3e; relojes y respuestas de la
  base manejados por la suite: cada tipo de campo, el retardo, la respuesta vieja, el error tal cual, Confirmar que
  espera, salir con algo pendiente, Volver a leer y Descartar),
  `test-/mut-remitos-dolce-acopio.js` (20; 13/13, el saldo del acopio, que salió de test-/mut-administracion-acopios),
  `test-/mut-administracion-link-remitos.js` (26; 20/20), `test-/mut-retiros-link-remitos.js` (25; 9/9),
  `test-/mut-modulos-remitos-dolce.js` (22; 15/15, la tarjeta y el alcance), `test-/mut-retiros-hoja-remito.js` (23; 18/18,
  +6 de la Carga).
- Arnés: `pruebas/sandbox-remitos-dolce.js`; `fuente-cobranzas.js` pega `js/remitos-comun.js` si el módulo lo importa
  (`ARCHIVO_COMUN_REMITOS` para mutarlo).
- Navegador: `e2e/70-subir-remitos.spec.js` (maqueta `remitos-dolce-subir` + la Carga) y `e2e/71-revisar-remitos.spec.js`
  (maqueta `remitos-dolce-revisar` + Administración), a 390 y 1280 px. El 71 mira el autoguardado (sin Guardar, lo
  escrito letra por letra va en UNA llamada, el error de la base en rojo) y un test aparte: salir con algo sin mandar
  lo manda, y con la base en `'ESPERAR'` Confirmar no llama a `confirmar_remito_precarga`.
