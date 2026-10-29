# Traspaso 29/10/2026 — Administración: Corregir orden

Pedido: `.claude/pedidos/2026-10-29-corregir-orden.md`. Rama `ci-prueba/corregir-orden`, salida de
`origin/ci-prueba/recibir-entre-empresas` = 2003aa3 (main + el detalle de la orden interna), trabajada en un git
worktree aparte. A mitad de camino esa rama avanzó a ac11ce8 (Stock: En camino, y el mismo arreglo de la maqueta y de las
seguras de XSS que se había hecho acá): se trajo con un merge (5386635), quedándose con su versión de
`pruebas/datos-maqueta/remitos-dolce-revisar.js` y de las dos seguras de la recepción. **No se integró** (la integra la noche, después de que otro chat audite el patch) y no se tomó el
candado. No toca `modulos/produccion.html`. La parte 1 (Administración) no toca `modulos/remitos-dolce.html`; la parte 2 sí (abajo).

## Qué cambió (modulos/administracion.html, detalle de una orden)
- Botón **"Corregir orden"** al lado de Valorizar / Corregir valorización / Anular: con retiros:precios en la fábrica de
  la orden y la orden no anulada (también valorizada). Mientras se corrige se esconden los otros, Ampliar y la pantalla
  de facturar (N1 / N2).
- Abre con `orden_para_corregir`; con `no_se_puede` (o un error) muestra el aviso tal cual y no deja editar.
- Editor: por renglón, producto / cono / insumo (el catálogo de "Nuevo acopio"), cajas o cantidad (decimales según la
  unidad), precio si está valorizada, devolución / reposición con motivo, lote que trajo y destino, y varios lotes con
  "Lotes: X de Y cajas · faltan repartir N / sobran N / ✓ repartido completo" (amarillo si no suma; no deja seguir).
  Agregar y sacar renglones y lotes. Fecha (bloqueada si está valorizada, con la explicación), transporte,
  observaciones y el motivo (3 letras).
- "Revisar los cambios" → resumen (qué se saca, qué se agrega, qué cambia; fecha, transporte, observaciones) y, si está
  valorizada, total antes → después estimado y la diferencia: a la cuenta corriente del cliente o, si es entre
  empresas, a la deuda entre las dos.
- "Guardar la corrección" → `corregir_orden_retiro` (una sola llamada aunque se toque dos veces); errores de la base tal
  cual; después relee la orden y pone la fila del listado al día (total, fecha, transporte, cajas); si
  `stock_insuficiente` trae algo, "Lo que no estaba en stock" arriba del detalle.
- **"Corregida N veces"** en la tarjeta de la orden, con fecha y hora de Argentina, quién, motivo y total antes → después.
- Detalle: `docs/memoria/administracion.md`, "Corregir una orden".

## Parte 2 — Lotes de insumo en Remitos Dolce (la hizo la sesión principal, sobre la rama)
- La rama trae `ci-prueba/remitos-mas-simple` (302b351) con un merge, para que esto vaya sobre el editor nuevo de Remitos
  Dolce. **Por eso el patch de esta rama incluye también remitos-mas-simple: se auditan e integran en ese orden**
  (primero remitos-mas-simple, después corregir-orden; o las dos juntas).
- Renglón de insumo: lote + "Cantidad (kg)" con decimales según la unidad, "Lotes: 20,5 de 25 kg · falta repartir 4,5 kg"
  en amarillo, `{lote, cantidad}` a la base; confirmar_remito_precarga exige la suma (verificado el 29/10/2026). Detalle en
  docs/memoria/remitos-dolce.md.
- Pruebas: test-/mut-remitos-dolce-lotes-insumo (24; 20/20, baseline 302b351), e2e 101; revisar, interna-lotes,
  mas-simple y acopio con anclas o casos ajustados.

## Pruebas
- Nueva `test-administracion-corregir-orden.js` (178) y `mut-administracion-corregir-orden.js` (135/135 detectadas + 21
  equivalentes justificadas: claves numéricas del editor, ids del catálogo, textos con números; baseline
  2003aa3: la suite da ROJO sobre la Administración de antes).
- `e2e/100-corregir-orden.spec.js` 4/4 en la maqueta "administracion" (390 y 1280 px, sin scroll horizontal, capturas
  miradas): historial, editor, lotes, precio y total, renglón nuevo del catálogo, resumen, lo que viaja, faltantes;
  sin retiros:cargar y con no_se_puede. Encontró un bug que las suites no veían: el `change` del buscador al tocar una
  opción redibujaba la lista y se comía el toque (arreglado: el `change` solo mira la fecha y el destino).
- `test-administracion-xss.js` daba ROJO en 2003aa3 (la lista de diferencias de la recepción sin justificar): lo
  arregló también la otra rama (ac11ce8) y quedó su versión; acá se justificó lo nuevo.
- Anclas de mutaciones ajustadas por las líneas que cambiaron: `mut-administracion-ordenes.js` ("Anular sin permiso"),
  `mut-clientes-provisorios.js` ("Valorizar queda visible con el aviso") y `mut-administracion-valorizar-con-division.js`
  ("la pantalla a la vista mientras se valoriza"): la misma mutación sobre el texto nuevo.
- `pruebas/sandbox-administracion.js`: la lista `FUNCIONES_CORREGIR` con reemplazos para las copias viejas.
- `test-maqueta-datos.js` daba ROJO en 2003aa3 (Paz Mirta agregada a mano en `remitos-dolce-revisar.json`): arreglado
  acá en el generador y también en ac11ce8; quedó la versión de la otra rama.
- Las 3 mutaciones de otras suites con el ancla ajustada se probaron sueltas contra su suite: las 3 detectadas.
- `npm run pruebas`: 328/329 con solo `test-maqueta-datos.js` en rojo (lo de arriba, ya arreglado y en verde suelto).
- Ensayo `BASE=origin/ci-prueba/recibir-entre-empresas npm run ensayo -- ci-prueba/corregir-orden` (sobre ac11ce8):
  se une sin chocar, **npm run pruebas VERDE (330/330)**; navegador ROJO en las dos mitades. Lo único de esta rama:
  `e2e/78-ampliar.spec.js` contaba 4 acciones en la orden y ahora son 5 (el botón nuevo): ajustado, 10/10 menos los 2 de
  Gastos. El resto falla IGUAL sobre ac11ce8 en este contenedor (se corrió aparte: 5-maqueta de administracion /
  dashboard / empleados, filtros de Empleados) o depende de lo que el contenedor no alcanza: los CDN (cdnjs, unpkg:
  el importador de Excel, Gastos, html2canvas/jsPDF, el diseño de 13-comparar), WebKit (66-imprimir-iphone) y la
  base real (0-humo "la planta sin sesión"). En GitHub (Pruebas + Navegador) se tiene que ver en verde.
- Una primera corrida de las mutaciones se descartó: la suite cambió mientras corría (ver "Qué automatizaría ahora").

## Decidido sin consultar
- **Sin retiros:cargar** el editor se abre igual, con la explicación ("también hace falta el permiso para cargar
  retiros… Podés mirar cómo quedaría, pero no guardarla"), y Guardar queda apagado: así se ve qué cambiaría sin un
  error de la base al final.
- **El historial se lee de la tabla `orden_correcciones`** (su policy pide retiros:ver en la fábrica de la orden), no de
  `orden_para_corregir`: lo ve todo el que ve la orden, tenga o no precios, y no suma una llamada que pide precios.
  Solo trae `antes->>total` y `despues->>total` (no el jsonb entero). Si no se puede leer, no se muestra.
- Lo que salió SIN STOCK / SIN LOTE (que `_orden_items_editables` no devuelve como lote) vuelve como **un lote sin
  nombre** con lo que falta, para que el renglón siga sumando igual; viaja `lote: ''` y la base lo pone SIN STOCK (o
  SIN LOTE si la fábrica no controla el stock). Sin ningún lote, la base elige como siempre.
- Cambiar el producto o el cono **saca los lotes** (eran del anterior); pasar de producto a insumo (o a otro insumo de
  otra unidad) borra la cantidad.
- Los lotes viajan en mayúsculas (como Remitos Dolce); el transporte, con los espacios limpios.
- Un renglón sin precio en una valorizada **no manda precio**: la base toma el anterior del mismo producto o, si no, la
  lista. La pantalla lo estima igual que la base ("Sin precio: toma el que tenía ($ X)" / "lo toma de la lista al
  guardar"), y si alguno va a la lista el resumen dice que la diferencia se sabe al guardar.
- Precio por caja / por unidad base del insumo (kg, lt, un.), como lo guarda la base; NO por bulto como "Valorizar".
- Orden de talonario acopio valorizada: sin campos de precio (la base no la revaloriza), con un aviso.
- "No cambiaste nada de la orden." frena el guardado si no hay ningún cambio.
- La fila del listado suma `fecha`, `transporte` y las cajas a `CAMPOS_FILA_ORDEN` (`conteosFilaOrden`, la misma cuenta
  que `leerOrdenes`).

## Lo que no se pudo probar
- Contra la base real: todo con el doble de la suite y la maqueta (Claude Code solo lee la base). En particular el
  `select('…, total_antes:antes->>total, …')` de PostgREST (desde el contenedor no se llega a la API de Supabase; la
  sintaxis es la de PostgREST para un campo de un jsonb).
- Que `corregir_orden_retiro` acepte cada caso con datos reales (lotes que no existen en el stock → faltantes; una
  orden de Dolce sin control de stock con lotes escritos; una devolución que vuelve al stock).
- En un celular real.

## Qué automatizaría ahora
- **Un editor de renglones compartido.** Ya hay tres pantallas que eligen producto / cono / insumo con lotes y cajas
  (la Carga, Revisar en Remitos Dolce y ahora Corregir orden), cada una con su "Lotes: X de Y" y su armado del p_items
  de `registrar_orden_retiro`. Un `js/renglon-orden.js` (estado del renglón, validar lotes, `itemParaBase`) con UNA
  suite lo probaría una vez para las tres; sería la excepción numerada que sigue en arquitectura.md.
- **Que el runner de mutaciones congele la suite**: si la suite cambia mientras corre (pasó acá: un chequeo nuevo hizo
  que todas las mutaciones siguientes "se detectaran"), los números no valen. `mutar.js` podría copiar la suite a un
  temporal al arrancar y correr esa copia.
