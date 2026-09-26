# Traspaso al chat de arquitectura — Producción: la gestión con el diseño "Producción · Gestión" y lo que salió por retiros (26/09/2026)

Pegale esto al chat de arquitectura. Es autocontenido: quien lo lea no vio nada del trabajo.

## Qué se hizo

Dos commits del subagente de Producción, en la rama `worktree-agent-adeea22504b72b2e5` (base `48b9da5`):

1. **`e211129` — `modulos/produccion-gestion.html` con el diseño "Producción · Gestión"** (handoff de Claude Design, compu 1440 y celular 390).
2. **Parte B (este commit) — el stock terminado dice lo que salió por retiros**, con el CÓDIGO de cada orden.

**Cero SQL corrido** (Supabase en solo lectura). Ninguna RPC, tabla, policy ni permiso cambió. No hacen falta tareas nuevas: `retiros:ver` ya está en el CHECK.

### 1. La gestión con el diseño nuevo (`e211129`)

- **Menú de secciones, sin fila de pestañas.** En la compu, una barra lateral de 248 px con tres bloques: **Control** (Planillas pendientes con su número, Historial, Stock terminado), **Catálogo** (Máquinas, Recetas, Ingredientes, Productos, Empaque, Marcas / Conos con su número) y **Personas** (Personal y PINes). En el celular, "Menú" lo abre (una clase en el body, `pg-menu-abierto`, no `[hidden]`), Escape lo cierra, y cada sección tiene "‹ Menú". El renglón de donde se está va con `aria-current="page"`. Control se ve con `ver` o `configurar`; Catálogo y Personas solo con `configurar`. Salir de Configuración con cambios sin guardar en Personal pregunta primero (el panel de siempre), también al ir a otra sección.
- **Se fueron:** la grilla "Ir a" de la pantalla de inicio (`pr-btn-ir-config`, `pr-btn-ir-historial`, `pr-btn-ir-stock`), el "Menú" viejo con "Configuración" (`pr-menu-config`), la fila de pestañas (`data-config-tab`) y el botón Activar/Desactivar de los conos (`data-marca-activa`). Están declarados con su motivo en `RETIRADOS` de `pruebas/controles-produccion-gestion.js` (lista nueva; uno que vuelva a aparecer pone la prueba en rojo). **`accionDelMenu()` se sacó** de la gestión (quedaba muerta).
- **Cambio de comportamiento a saber:** antes, con conos por revisar, tocar "Configuración" abría derecho en Marcas / Conos. Ahora el número va al lado del renglón **"Marcas / Conos"**, que ya lleva ahí: esa regla no hace falta y se sacó.
- **Indicadores**, en este orden (el del celular, decisión de Facu; en la compu la grilla de 3 columnas pone las mismas tarjetas de izquierda a derecha, sin `order` por CSS): **Ahora · Hoy · Pendientes · Semana · Rendimiento de la harina · Scrap por lote de harina**. Arriba, el día con ‹ › (› apagado en hoy; hoy se pide SIN `p_fecha` y otro día con él).
  - **Ahora:** las paradas primero, en bordó con el chip **PARADA** (el color no va solo); el contexto "2 máquinas abiertas · 1 pendiente".
  - **Hoy:** el total grande con su diferencia y cada producto con la suya, **con flecha** (▲ +7 / ▼ −3 / = 0). **Decisión propia, leyendo el cuerpo de `indicadores_produccion` (26/09/2026):** en `cajas_por_producto` un null sale de `sum(...) filter (where ...)` sin renglones de ESE día, o sea "ese día ese producto no salió": ahí se muestra "—" en las cajas y la diferencia se calcula contra cero (lo que dibuja el diseño: "Barquillo — ▼ −2"). Un valor que NO es un número sigue siendo "no se sabe" y da "—", nunca un cero. Sin producción: "Hoy no se produjo" / "Ese día no se produjo" y cuánto salió el mismo día de la semana pasada.
  - **Semana:** cajas y unidades grandes; turnos, masas (modificadas y de chocolate), scrap en kg y % de la masa (masa en 0 → "—"), paradas en h y min con el motivo más común. Sin turnos: "Sin producción esta semana", sin ceros.
  - **Rendimiento de la harina, POR PRODUCTO** (la base devuelve `{producto, lote, kg_harina, unidades, unidades_por_kg, promedio_del_producto, diferencia_pct}`): agrupado por producto, de peor a mejor, los sin dato al final con "—" y sin barra. **"Rinde poco" = `diferencia_pct < −10`, estricto (decisión de Facu): −9,9 no, −10 no, −10,1 sí; un null nunca se marca ni se pinta como 0.** El que rinde poco va en bordó con "Rinde X % menos que el promedio de <producto>."; el mejor de cada grupo (con 2 o más lotes con dato) se marca.
  - **Scrap por lote de harina** (bloque nuevo `scrap_por_lote [{lote, scrap_pct}]`): una tarjeta más en `TARJETAS_INDICADORES`. **Neutra: sin bordó**, porque no hay un umbral decidido y un color sin regla sería inventar un juicio.
  - **Pendientes:** un botón por tipo con su número; "Turno abierto de otro día" primero y en bordó; sin nada, "Nada pendiente" en verde; un número que no llegó dice "—" sin botón.
  - **Cada tarjeta falla sola:** "Esta tarjeta no se pudo cargar. Las demás están bien." con el porqué PEGADO a su "Reintentar"; si la RPC entera falla, cada tarjeta dice el error de la base con la hora (Argentina) pegado a su "Reintentar".
  - El número de planillas del menú sale de los indicadores de la unidad elegida; cambiar de unidad lo borra en el acto (nunca un número viejo).
- **Selector de unidad:** en la compu un segmentado; en el celular el select. La fábrica de pruebas no aparece en ninguno (verificado con la función real de `js/utils.js`).
- **Personal y PINes:** tabla en la compu, tarjetas en el celular con los roles como botones de 44 px (el MISMO HTML: la casilla va adentro de su `<label>`; marcado en naranja con "✓" como texto). Un solo "Guardar los cambios · N filas", **fijo abajo en el celular** (el `body` pasó de `overflow-x: hidden` a `clip`, sin eso el `sticky` no pega). "Generar PIN para los que no tienen · N" (N = los de ESTA unidad sin PIN). El estado del PIN: **Sin PIN en bordó**, pendiente de cambiar en gris, propio en verde, siempre con texto.
- **La hoja de PINes:** dice de qué unidad, cuándo y quién los generó; cada tira con los roles y "lo cambiás la primera vez que entrás"; aviso "Solo se ven ahora. Imprimí la hoja antes de cerrar." **"Ya la imprimí, cerrar" pregunta "¿Ya la imprimiste? No se va a volver a mostrar."** en un panel propio (`role="alertdialog"`, sin `confirm()`, decisión de Facu): "Volver a la hoja" no toca nada; recién "Sí, ya la imprimí: cerrar" borra los PINes de la memoria y del DOM.
- **Marcas / Conos:** "N conos · N activos", por revisar arriba (con "Lo cargó X en la tablet" y cuándo; el error de Aceptar/Rechazar va pegado a ESE cono: "No se pudo aceptar: …"), buscador ("Mostrando N de M") y el segmentado Activos · Apagados · Por revisar. **"Activo" (interruptor `role="switch"`, 52×30) y "Doble bolsa" se guardan al tocarlos** (decisión de Facu): si la base rechaza, el control vuelve a lo guardado y el error va PEGADO a la fila de ese cono; mientras se guarda, los dos quedan trabados y un segundo toque no manda nada; apagar un cono con el filtro "Activos" NO lo hace desaparecer bajo el dedo (la lista se rearma recién al filtrar o buscar).
  - **Verificado contra `pg_get_functiondef`:** `marcar_doble_bolsa` cambia SOLO `doble_bolsa`. **`guardar_marca(p_id, p_nombre, p_activa)` no tiene una variante que cambie solo `activa`: también reescribe `nombre = upper(btrim(p_nombre))`.** Se le manda el nombre que ya tiene; hoy los 351 nombres ya están en mayúsculas y sin espacios en los bordes, así que no cambia nada — pero si alguna vez entra un nombre sin normalizar, prenderlo o apagarlo lo normaliza.
- **El historial de un turno:** cabecera con el lote grande, máquina y turno, "Jueves 24/09 · 06:02 a 14:10 · fuego apagado 13:55", encargado y estado; tres tarjetas (Operarios, Masas con su cantidad, Paradas y scrap con el total parado —solo las paradas con fin— y el scrap); **Lo producido** con "N renglones · N anulados" y **Corregir / Anular** en cada renglón vivo: se edita en el mismo renglón, motivo obligatorio (3 letras), cajas enteras > 0 y distintas de las que tiene; los errores (los de la pantalla y el de la base, tal cual) van pegados al botón, que NO se traba por lo que falta. Llama a `corregir_produccion_item(p_item_id, p_cajas, p_motivo)` / `anular_produccion_item(p_item_id, p_motivo)` y vuelve a leer el turno. **Permisos, la misma regla que la base** (leída en `pg_get_functiondef`): turno `'cerrado'` pide `configurar` en la unidad; cualquier otro estado (también `pendiente_completar`), `cargar`.

### 2. Lo que salió por retiros (Parte B)

- La pantalla de **Stock terminado** suma una sección **"Lo que salió por retiros"**: fecha · retiro · producto · presentación · cono · sublote · cajas, lo más nuevo primero. Sale de los `stock_terminado_movimientos` con `orden_retiro_id`: el `despacho` ("Retiro N-0001 · salieron 5 cajas", "· anulado" si la orden está anulada) y el `ajuste` de una anulación ("Anulación del retiro N-0002 · volvieron 2 cajas" y su motivo). El stock de arriba sigue siendo la suma de TODOS los movimientos (no cambió).
- **El código sale de `ordenes_retiro.codigo`, NUNCA del número suelto.** `ordenes_retiro` se lee con `retiros:ver` en la unidad (su policy de SELECT, `tiene_tarea_alcance`, con bypass de super_admin). La gestión lee ahora ese permiso al entrar (`cargarPermisoRetiros()` / `puedeVerRetirosEn()`, mismo criterio que `stock:ver`):
  - **Sin `retiros:ver` en esa unidad NO se consulta** (un vacío por RLS no se distingue de "no existe"): se muestra "Retiro" con sus cajas y su sublote y "sin permiso para ver el código", y arriba "hace falta retiros:ver en esta unidad". Nunca se inventa un código.
  - Si no se pudo leer el permiso, se intenta; lo que no llega (o si la consulta falla) dice "no se pudo leer el código".
- **HUECO DE BASE, anotado y no resuelto:** quien ve el stock terminado (`produccion:ver` o `stock:ver`) pero no `retiros:ver` no puede saber QUÉ retiro se llevó su mercadería. Arreglarlo es exponer el código a quien ve el stock: una vista `security_invoker` sobre `stock_terminado_movimientos` con `ordenes_retiro.codigo`, o una RPC `SECURITY DEFINER` que devuelva `(orden_retiro_id, codigo)` gateada por `puede_ver_produccion()` o `stock:ver` en la unidad. Es del dueño de Retiros / arquitectura.

## Huecos de base encontrados (no tocados)

1. **`generar_pines_iniciales` recorre los `empleados` de la unidad sin excluir `es_dispositivo`:** si la cuenta de una tablet no tiene PIN, le genera uno y la hoja lo muestra. `personal_produccion` sí las excluye, así que "Generar PIN… · N" puede decir un número menor que las tiras que salen. Arreglo: `and not coalesce(e.es_dispositivo, false)` en la función.
2. **`guardar_marca` reescribe el nombre** (ver arriba). Una RPC que cambie solo `activa` lo evitaría.
3. **`marcas_personalizadas` no guarda de qué sublote salió un cono propuesto** (el diseño lo muestra); tampoco se puede mostrar "PIN bloqueado · 3:10" (`personal_produccion` no lo devuelve). Siguen salteados, como ya estaba escrito.
4. El código de un retiro para quien ve el stock sin `retiros:ver` (Parte B).

## Qué se verificó y contra qué

- **Contra la base (solo lectura, 26/09/2026):** `pg_get_functiondef` de `indicadores_produccion`, `guardar_marca`, `marcar_doble_bolsa`, `revisar_marca`, `corregir_produccion_item`, `anular_produccion_item`, `generar_pines_iniciales`, `personal_produccion`, `registrar_orden_retiro`, `anular_orden_retiro`; `pg_constraint` de `stock_terminado_movimientos` (despacho `cajas < 0`; ajuste con motivo ≥ 3) y `ordenes_retiro` (estado `confirmada` / `anulada`); `information_schema.columns` de `stock_terminado_movimientos` (`tipo`, `orden_retiro_id`, `fecha`, `motivo`, `created_at`); `pg_policy` de `ordenes_retiro` (SELECT con `tiene_tarea_alcance('retiros','ver', unidad)`) y de `stock_terminado_movimientos`.
- **Se EJECUTA el código real** (`pruebas/sandbox-produccion.js`) con datos de prueba y HTML malicioso en cada render nuevo. Suites, al cerrar:
  - `test-produccion-gestion.js` **163/163** (reescrita: la regla del 10 %, el orden, el día, los números del menú, cada tarjeta que falla sola) · mut **94/94** (+24 eq.)
  - `test-produccion-gestion-diseno.js` **134/134** (NUEVA: menú, salir sin guardar, Personal, la hoja, los conos, corregir/anular, HTML malicioso) · mut **102/102** (+21 eq.)
  - `test-produccion-stock-retiros.js` **47/47** (NUEVA) · mut **31/31** (+3 eq.)
  - `test-produccion-config.js` 210/210 · mut 193/193 (+7) — `test-produccion-historial.js` 122/122 · mut 104/104 (+15) — `test-produccion-legible.js` 99/99 · mut 47/47 (+28) — `test-produccion-sin-empaque.js` 105/105 · mut 47/47 — `test-produccion-empaque.js` 248/248 · mut 146/146 (+14) — `test-produccion-color.js` 62/62 · mut 29/29 — `test-produccion-xss.js` 12/12 — mut acceso 24/24, fábrica de pruebas 14/14, paradas 61/61 (+30), planta 28/28.
  - `controles-produccion-gestion.js` **612/612** (con `RETIRADOS` y el baseline nuevo `e211129` en `BASES_GESTION`) · `controles-produccion.js` 1722/1722 · `check-scripts` OK · `check-bytes` 0 CR, 0 NUL · **`correr-todo.js` 98/98**.
- **Mirado renderizado** en un navegador con un Supabase falso (datos de ejemplo, sin sesión): indicadores a 1440 y 390 px (en el celular Pendientes termina en y = 827 px de 844, sin scroll horizontal), Personal en tabla y en tarjetas con el pie fijo, la hoja con la pregunta, los conos con el error pegado y el control que vuelve, la corrección de un sublote, y la sección de retiros a 1440 y 390 (sin desborde).

## Qué NO se probó

- **Nada con sesión ni contra la base real**: ninguna RPC se ejecutó (solo lectura). Tampoco la impresión real de la hoja, ni un celular de verdad.
- **`e2e/2-gestion.spec.js` se ajustó al menú nuevo** (en el celular abre "Menú"; el historial es `#pr-menu-historial`) **y no corrió** (faltan los secretos del robot).
- La barra del rendimiento (`--pr-prod-apagado-borde` sobre `--pr-panel-gris`) tiene 2,38:1: es decorativa, el número va al lado en texto, pero no llega a 3:1.

## Guion para Facu (en la compu y en el celular, con tu usuario)

1. Abrí Producción desde el dashboard. En la compu tenés que ver la barra de la izquierda con Control, Catálogo y Personas; en el celular, tocá "Menú".
2. Indicadores: mirá que "Pendientes" esté tercero en el celular y que "Rendimiento de la harina" agrupe por producto. Un lote en bordó tiene que decir "Rinde X % menos que el promedio de …". Tocá ‹ para ver ayer y › para volver.
3. Personal y PINes: tildá un rol en dos personas y mirá que el botón diga "Guardar los cambios · 2 filas". En el celular tiene que quedar fijo abajo. Tocá "Historial" sin guardar: tiene que preguntarte.
4. Generá PINes (si hay alguien sin PIN): tocá "Ya la imprimí, cerrar" y fijate que pregunte antes de borrarlos.
5. Marcas / Conos: apagá un cono y volvé a prenderlo. Tiene que guardarse al tocar, sin botón Guardar.
6. Historial → un turno cerrado → "Corregir" en un sublote: probá guardar sin motivo (tiene que avisar pegado al botón) y después con motivo.
7. Stock terminado: si ya hubo algún retiro, abajo tiene que aparecer "Lo que salió por retiros" con el código (N-0001). Con un usuario sin permiso de Retiros tiene que decir "sin permiso para ver el código".

## Qué automatizaría ahora

**Un "mirador" de pantallas en el repo**, para no volver a armarlo a mano en cada tanda: acá se reescribió por tercera vez un script que reemplaza `verificarSesion` y `supabase` por dobles con datos fijos y deja un HTML servible en `e2e/resultados/`. Que viva en `e2e/maqueta/` con los datos por módulo, un comando `npm run maqueta -- produccion-gestion` y un Playwright que mida a 390 y 1440 px (scroll horizontal, que las tarjetas no se pisen) — así la medición entra a GitHub Actions sin secretos.

Y dos lecciones de andamio de esta tanda, para Aprendizajes:
- **Una suite que se CUELGA (un `await` que nunca vuelve) termina sin imprimir nada y con código 0**, y el runner de mutaciones la cuenta como "ESCAPÓ". Pasó con "un segundo toque mientras se guarda": el doble guardaba un solo `resolve` y el primer `tocarCono` quedaba esperando para siempre. Se arregló guardando TODOS los que esperan y poniendo un `Promise.race` con un tiempo. Vale revisar `mutar.js`: que un sub-proceso sin su línea final `N/N verde|ROJO` cuente como detectado (hoy cuenta como escapado, que es el lado seguro, pero confunde).
- **En este entorno, un heredoc a `python -` convierte `\\` en `\`**: un `\\n` escrito para que quede `\n` en un JS terminó como un salto de línea real y rompió una regex. Para editar archivos con barras invertidas, escribir el script con Write (y strings `r"""…"""`), no por heredoc.

## Qué hay que tocar en CLAUDE.md

En **Módulos → 10. Producción**, dentro de "DESDE EL 25/09/2026 SON DOS PANTALLAS", reemplazar los renglones de la gestión (el de "La pantalla principal de la gestión son los INDICADORES" y el de "Debajo, los accesos…") por algo así:

> - **EL DISEÑO "PRODUCCIÓN · GESTIÓN" (26/09/2026, `e211129`; traspaso `.claude/traspasos/2026-09-26-produccion-gestion-diseno.md`).** **Menú de secciones y sin pestañas**: en la compu una barra lateral de 248 px (Control: Planillas pendientes con su número, Historial, Stock terminado · Catálogo: Máquinas, Recetas, Ingredientes, Productos, Empaque, Marcas / Conos con su número · Personas: Personal y PINes); en el celular "Menú" (clase `pg-menu-abierto` en el body) y "‹ Menú" en cada sección. Control con `ver` o `configurar`; Catálogo y Personas con `configurar`. El número de conos por revisar va al lado de "Marcas / Conos" (ya no hay "Configuración" que abra ahí). Salir con cambios sin guardar pregunta.
> - **Indicadores, en el orden del celular: Ahora · Hoy · Pendientes · Semana · Rendimiento de la harina · Scrap por lote** (`TARJETAS_INDICADORES`), con el día ‹ › (hoy sin `p_fecha`). Diferencias con flecha (▲ ▼ =). **En `cajas_por_producto` un null es "ese día no salió"** (la base suma con `filter`): "—" en las cajas y la diferencia contra cero; un valor raro es "—". **Rendimiento por producto: bordó solo si `diferencia_pct < −10` (estricto; decisión de Facu); un null no se marca.** El scrap por lote va neutro (sin umbral decidido). Cada tarjeta falla sola, con Reintentar pegado al error.
> - **Personal y PINes**: tabla en la compu, tarjetas en el celular, un solo "Guardar los cambios · N filas" fijo abajo en el celular; Sin PIN en bordó. **La hoja de PINes pregunta "¿Ya la imprimiste? No se va a volver a mostrar." antes de borrarlos** (panel propio). **Conos: Activo y Doble bolsa se guardan al tocarlos**; si la base rechaza, vuelve y el error va pegado a la fila. `guardar_marca` reescribe el nombre con `upper(btrim())`: se le manda el que ya tiene.
> - **Historial de un turno**: cabecera con horario y fuego, tres tarjetas, y **Corregir / Anular un sublote** con motivo (`corregir_produccion_item` / `anular_produccion_item`), con la misma regla de la base: turno `'cerrado'` pide `configurar`, cualquier otro `cargar`.
> - **Stock terminado → "Lo que salió por retiros"**: los `despacho` y `ajuste` con `orden_retiro_id`, con el **código** de la orden (`ordenes_retiro.codigo`), nunca el número. Sin `retiros:ver` en la unidad no se consulta: "Retiro · sin permiso para ver el código". Hueco de base: quien ve el stock sin `retiros:ver` no puede saber qué retiro fue (hace falta una vista o RPC que exponga el código a quien ve el stock).
> - `controles-produccion-gestion.js` tiene `RETIRADOS` (con su motivo) y el baseline `e211129`. Suites nuevas: `test-/mut-produccion-gestion-diseno.js` y `test-/mut-produccion-stock-retiros.js`.

En **Aprendizajes clave**, sumar las dos lecciones de andamio de "Qué automatizaría ahora" (la suite que se cuelga y el heredoc que come barras).

En **"Qué hay hoy" de `pruebas/`**, sumar el renglón del 26/09/2026 con esas dos suites y sus números.
