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
