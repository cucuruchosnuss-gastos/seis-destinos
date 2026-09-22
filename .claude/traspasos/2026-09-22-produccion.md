# Traspaso — Unidad de las cobranzas y módulo Producción (22/09/2026)

Sesión de Claude Code. Tag de resguardo antes de empezar: `antes-de-produccion-2026-09-22` (pusheado).
Supabase se usó SOLO en lectura: la base ya estaba hecha. Toda la verificación de la base se hizo contra
`pg_get_functiondef`, `pg_get_constraintdef`, `pg_policy` e `information_schema` el 22/09/2026.

## Lo que no coincidía con la base, y cómo se resolvió

- **La tabla `modulos` no tenía la fila `produccion`**, y `actualizar_permisos_empleado` rechaza cualquier módulo
  que no esté ahí ("Módulo desconocido en la lista."): desde Accesos no se habría podido habilitar Producción.
  Se frenó y se le preguntó a Facu. **La fila la creó el chat de arquitectura el 22/09/2026, NO esta sesión**:
  `('produccion', 'Producción', grupo null, orden 9, activo true)`, verificada después con el conector de lectura.

## Sub-partes

### B1 — Estructura, acceso, dashboard, accesos y subagente
- `modulos/produccion.html`: la estructura de los otros módulos. Se entra con cualquiera de `produccion:cargar`,
  `produccion:ver` o `produccion:configurar` (con bypass de super_admin); sin ninguna, aviso y vuelta al dashboard.
  `unidadesCon(tarea)` replica la regla de `tiene_tarea_alcance()` (super_admin todas; `{"todas": true}` todas;
  si no, la lista de `{"unidades": [...]}`), porque no existe una vista `v_mis_unidades_*` de producción.
- `dashboard.html`: tarjeta "Producción" (clave `produccion`, ícono `factory`, color `azul`).
- `css/main.css`: `--azul` #1F5FAD / `--azul-suave` #E7EFFA / `--azul-oscuro` #164680 (contraste 6,37:1 sobre blanco).
- `modulos/accesos.html`: grupo "Producción" en `CATALOGO_TAREAS`, `modulos: ['produccion']`, las tres tareas con
  `conAlcance: true` y los labels pedidos. El catálogo tiene las 40 claves del CHECK (verificado).
- `.claude/agents/produccion.md` (el subagente) y CLAUDE.md: diez subagentes.
- Pruebas: `test-produccion-acceso.js` (+ mut), `test-accesos-produccion.js`, `test-dashboard-produccion.js`,
  `controles-produccion.js` (baseline por sub-parte), `sandbox-produccion.js`.
- **Commit `9a70841`.** Números: check-scripts OK; test-produccion-acceso 15/15, mut 7/7 (+1 equivalente anotado en
  el archivo); test-accesos-produccion 19/19; test-dashboard-produccion 9/9; controles-produccion 6/6 (sin baseline:
  primera sub-parte). Todas las demás suites del repo en verde en un árbol limpio con estos cambios.

### B2 — Modo de la tablet y "¿Quién sos?"
- La tablet usa una cuenta propia. Se elige el **modo** del equipo (`produccion.modo` en localStorage:
  `produccion` o `masa`) y, si la cuenta puede cargar en más de una unidad, la **unidad** (`produccion.unidad`).
  Las dos se cambian desde el menú. localStorage siempre con try/catch.
- La unidad posible es la de las máquinas: unidades con `produccion:cargar` que tienen alguna máquina activa (si
  ninguna tiene, todas las de carga).
- "¿Quién sos?" pregunta cada vez que se entra o se toca "Cambiar de persona" (siempre visible, sin contraseña):
  encargados en modo Producción, maseros en Sala de masa, de `personal_produccion(p_unidad_negocio_id)`. Si la unidad
  no tiene a nadie con ese puesto, todo el personal activo con un aviso para configurarlos. **La persona elegida NO se
  guarda**: recargar vuelve a preguntar (decisión: la tablet pasa de mano en mano).
- Cambiar de modo borra la persona (los que responden son otros).
- Pruebas: `test-produccion-quien.js` (+ mut), `test-produccion-xss.js` (chequeo estático de TODO el archivo, con
  `seguras-produccion.js`).
- **Commit `d995d1f`.** Números: test-produccion-quien 46/46, mut 24/24 (+1 equivalente); test-produccion-xss 6/6;
  controles-produccion 33/33 (baseline B1); check-scripts OK; el resto de las suites del repo en verde.

### B3 — Modo Producción: el tablero y abrir turno
- Inicio del encargado: cada máquina activa de la unidad con su estado ("Libre" o "Lote 7023 · abierta desde 06:02 ·
  5 masas", con la hora de Argentina y contando solo masas sin anular; y "En parada: …" si hay una en curso). Solo
  una máquina abierta lleva a su planilla.
- "Abrir turno" ("Abrir otra máquina" si ya hay alguna abierta): fecha (hoy de Argentina, no futura), turno
  (Mañana/Tarde/Noche) y las máquinas LIBRES con una casilla y su operario. **UNA sola llamada** a
  `abrir_turnos(p_fecha, p_turno, p_encargado_id = la persona de "¿Quién sos?", p_maquinas [{maquina_id, operario_id}])`
  y los lotes que devuelve, grandes. Los errores de la base se muestran tal cual.
- **Decisiones sin preguntar:** el turno viene **sugerido por la hora** (5–13 Mañana, 13–21 Tarde, resto Noche) y se
  cambia con un toque; cada máquina elegida **exige elegir operario**, con la opción explícita "Sin operario" (viaja
  como null, que la base acepta) — así nadie la abre sin mirar; los operarios salen de los puestos `operario` (sin
  configurar, todo el personal con aviso).
- Pantalla encendida con la Wake Lock API mientras haya un turno abierto (try/catch; se vuelve a pedir al volver a la
  pestaña).
- Pruebas: `test-produccion-abrir.js` (+ mut). Corre con `TZ=UTC` para que una hora sin zona de Argentina dé rojo.
- **Commit `7aed9b3`.** Números: test-produccion-abrir 59/59, mut 33/33 (+1 equivalente); test-produccion-xss 6/6;
  controles-produccion 74/74 (baselines B1 y B2); check-scripts OK; el resto del repo en verde.

### A2 — Cheques con unidad (subagente cheques) — commit `f4d1a0f`
- Ver `.claude/traspasos/2026-09-22-cheques-2.md` (números y decisiones del subagente). Decisión que queda abierta
  para Facu: **a 1280 px, con cheques salidos a la vista, la tabla ya no entra entera** (se desplaza de costado dentro
  de su caja, la página no); CLAUDE.md decía "desde 1280 la tabla entra entera". Se dejó así en vez de recortar
  columnas. El filtro de unidad solo aparece si hay al menos dos grupos: hoy las 17 cobranzas están sin unidad.

### B4 — Modo Producción: planilla, paradas y cierre
- Planilla de cada máquina abierta: lote grande, operario, encargado, masas (solo lectura: las carga el masero; solo
  las no anuladas) y paradas con su duración.
- "Parada" pide el motivo sugiriendo los usados antes (los últimos 200, sin repetir) → `iniciar_parada`. Mientras
  dura, un cartel fijo arriba con "Reanudar" → `terminar_parada`, y no se puede ni parar otra vez ni cerrar (la base
  rechaza las dos cosas).
- "Cerrar planilla": hora en que se apagó el fuego (arranca en la hora actual de Argentina), scrap en kg
  (`enlazarCampoNumero`, 3 decimales, OBLIGATORIO — 0 si no hubo), observaciones y lo producido EN ORDEN: "Agregar
  producto" → producto → presentación (con cono / media caja / empaque / unidades por caja) → marca ("Común" o una
  marca personalizada, con buscador sin acentos) → cajas (enteras). Cada renglón muestra su sublote PROVISORIO
  (`7023-1`…) y cajas × unidades por caja = unidades; se sube, baja y borra antes de confirmar. Resumen con total de
  cajas, unidades y sublotes. `cerrar_turno` recibe `p_productos` en el orden de la pantalla y se muestran los
  sublotes DEFINITIVOS que devuelve la base.
- Sin productos: "No cargaste nada producido. ¿Seguro que esta máquina no produjo?" con confirmación.
- **Borrador** en localStorage (`produccion.cierre.<turno_id>`): cada cambio se guarda en el momento; al volver se
  recupera y se dice. Se borra recién cuando la base confirmó el cierre; si la base rechaza, queda y el mensaje se
  muestra tal cual.
- Pruebas: `test-produccion-cierre.js` (+ mut).
- **Commit `fa693f2`.** Números: test-produccion-cierre 104/104, mut 66/66 (+14 equivalentes, cada una con su motivo
  en el archivo); test-produccion-xss 6/6; controles-produccion 191/191 (baselines B1–B3); el resto del repo en verde.

### A1 — Cobranzas con unidad (subagente cobranzas) — commit `b65ac10`
- "Controlada, asentar" abre un diálogo propio que pide la unidad y llama a `marcar_cobranza_asentada`; la pantalla ya
  no llama a `marcar_cobranza_procesada`. El detalle muestra la unidad o "Sin unidad" con "Asignar unidad" / "Cambiar"
  (`asignar_unidad_cobranza`, con `cobranzas:procesar`), y el historial "Unidad asignada: … · quién · fecha".
  Detalle, números y lo no probado en `.claude/traspasos/2026-09-22-cobranzas-3.md`. Medido: las 11 cobranzas
  asentadas están sin unidad; no se tocó ningún dato.

### B5 — Sala de masa
- Solo las máquinas ABIERTAS de la unidad, grandes, con su lote; sin ninguna: "Todavía no hay máquinas abiertas: el
  encargado tiene que abrir el turno". Elegida una: "Nueva masa" y la lista de masas del turno.
- **Nueva masa**: 1) tipo (los tipos con receta en esa máquina) y Simple / Doble (×2); 2) "Usar la original", "Usar
  la anterior" (dice lote, número y hora de la anterior y su diferencia contra la original, o "Es igual a la
  original"; deshabilitado si no hay) o "Modificar" (parte de la original o de la anterior; − / + de 100 g en agua,
  harina, azúcar y grasa y de 10 g en los demás, número editable con `enlazarCampoNumero`, diferencia en gramos en
  vivo, en bordó si se aleja, nunca negativo); 3) lotes: si hay anterior, "¿Mismos lotes que la anterior?"; si no,
  por ingrediente el insumo (por defecto el de la anterior, si no el preferido de la receta) y el lote de los que
  tienen stock según `datos_para_masa`, con su cantidad, o "El lote no está en la lista" (se escribe, con el aviso
  de que queda marcado para revisar). Un insumo que no es materia prima ofrece además "Sin lote" (viaja null). Los
  ingredientes sin insumo en el catálogo no piden lote y la pantalla lo dice; 4) resumen con "DOBLE ×2" grande,
  cada ingrediente simple y ×2, y la diferencia contra la original.
- **Payload de `registrar_masa`**: SIEMPRE una masa simple (la doble es `p_doble`), TODOS los ingredientes de la
  original (0 si no lleva), `p_masero_id` = la persona de "¿Quién sos?". El origen no se manda: lo calcula la base.
- **LA REGLA DEL UUID**: `crypto.randomUUID()` se llama en UN solo lugar (`nuevoBorradorMasa`), al empezar la masa, y
  queda en su borrador (`produccion.masa.<turno_id>`). El payload se congela en el borrador al mandarlo. Sin
  respuesta (error sin código, o `navigator.onLine === false`) la masa queda PENDIENTE y se reintenta sola (al
  volver la conexión, cada 30 s y al entrar a la sala) con el MISMO payload y el MISMO uuid, también después de
  recargar la tablet. Un error CON código (un `raise` de la RPC) es un rechazo: se muestra tal cual, no queda
  pendiente y se puede corregir (sigue el mismo uuid: la base no guardó nada con él). "Nueva masa" con una empezada
  la retoma; una pendiente no se puede descartar. La respuesta `reintento: true` de la base cuenta como enviada.
- Lista de masas del turno: número, hora, tipo, simple o doble, chip de origen y diferencia corta contra SU receta;
  "Anular" con motivo (3 letras o más) → `anular_masa`, y avisa que se devolvió lo descontado.
- Pruebas: `test-produccion-masa.js` (+ mut).
- **Commit `10df632`.** Números: test-produccion-masa 143/143, mut 92/92 (+12 equivalentes, cada una con su motivo);
  test-produccion-xss 6/6; controles-produccion 280/280 (baselines B1–B4); el resto del repo en verde.

### B6 — Configuración (produccion:configurar), por unidad
- Se entra por el menú ("Configuración") o, sin `cargar`, por el inicio de la oficina. Selector de unidad (las de
  `configurar`) y seis pestañas:
  - **Máquinas**: agregar (al final), renombrar, activar/desactivar y ordenar (▲/▼ manda `guardar_maquina` solo por
    las que cambian de número). El rechazo de la base ("La máquina tiene un turno abierto…") se muestra tal cual.
  - **Recetas**: por máquina y tipo de masa, la vigente (versión más alta) editable — kilos con `ponerNumero`,
    insumo preferido entre los del ingrediente —; guardar crea una versión NUEVA con **nota obligatoria**; historial
    de versiones con autor, fecha y nota; "Tipo nuevo…" con nombre y "Partir de" otro tipo; aviso bordó "Revisar:
    esta receta vino del prototipo" cuando la nota de la vigente lo dice.
  - **Ingredientes**: alta y edición (nombre, descuenta stock, activo) y sus insumos del catálogo con buscador;
    aviso bordó con los que descuentan y no tienen insumo (hoy grasa, fécula y colorante).
  - **Productos y presentaciones**: producto (nombre, tipo de masa, activo) y presentaciones (nombre, con cono, media
    caja, empaque, unidades por caja enteras > 0, activa). Aviso de que vinieron del prototipo hasta "Ya los revisé"
    (se recuerda en esa tablet: `produccion.aviso-productos-revisado`). Una presentación nueva nace con 1 por caja y
    se avisa que hay que corregirla. Nota: cambiar las unidades por caja no toca lo ya producido.
  - **Marcas**: alta y baja/reactivación con buscador.
  - **Personal**: por persona, encargado / masero / operario en la unidad → `guardar_puestos`. Muestra el personal
    de la unidad y a quien ya tiene puesto acá; "Mostrar también el personal de otras unidades".
- **Decisión sin preguntar:** "Cambiar el modo" del menú ganó un id (`#pr-menu-modo`) para ocultarlo a quien no carga;
  está declarado como renombrado en `controles-produccion.js`.
- Pruebas: `test-produccion-config.js` (+ mut).
