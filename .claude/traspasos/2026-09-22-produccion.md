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
