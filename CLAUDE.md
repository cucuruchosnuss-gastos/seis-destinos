# Seis Destinos — Guía del proyecto

## PRINCIPIO CENTRAL: automatizar lo que ya está automatizado y eficientizar lo que ya es eficiente

Es la forma de pensar de Grupo Nuss. En la fábrica pasamos de una máquina de 1.000 unidades con 4 personas, a 1.000 con 2, a 2.500 con 2; lo próximo es 2.500 con una sola persona, y después 4.000 con una. Cada paso hace el trabajo más rápido, con menos carga y menos horas.

Con el software es igual. El costo a bajar es el tiempo de Facu y el tiempo de trabajo de Claude. Por eso:
- **Toda tarea que se repite dos veces se convierte en skill, script o prueba automática.** No esperes a que Facu lo pida: proponelo.
- **Cada traspaso termina con una sección "Qué automatizaría ahora"**, con la tarea repetida más cara que viste y cómo sacarla.
- **Buscá siempre la mejor tecnología del momento que sea gratuita o barata.**
- **Facu deja trabajando tandas largas de noche: el trabajo tiene que poder avanzar horas sin él, publicando parte por parte.**

## Objetivo
Sistema de gestión de fábrica de Grupo Nuss sobre una única base de datos central en Supabase (nuss-central), con datos maestros compartidos y módulos separados. Nombre de la app: Seis Destinos. Las empresas del grupo son: Cucuruchos Nuss (Córdoba), Dolce Pasta (Rosario), Taller (Córdoba), Mengui/Heladitos Orly (Córdoba).

## Cómo está armado (lo mínimo; el detalle en docs/memoria/arquitectura.md)
- PWA multi-archivo: un HTML por módulo en `modulos/`, CSS compartido `css/main.css`, sin frameworks (HTML, CSS y JS vanilla). Hosting: GitHub Pages (https://github.com/cucuruchosnuss-gastos/seis-destinos).
- Cada módulo duplica sus propios helpers. Las excepciones conscientes (lo compartido en `js/`) están numeradas en `docs/memoria/arquitectura.md`; una nueva lleva el ordinal que sigue (lo controla `pruebas/test-claude-md-excepciones.js`).
- Backend: Supabase `nuss-central` (https://xtorxouhzuizdvawqakb.supabase.co, publishable key `sb_publishable_G8GZe2uAvb6VdJ1S4DD8nA_CC7iugYw`). RLS en todas las tablas; toda escritura por RPCs `SECURITY DEFINER` con `search_path` fijo que re-verifican con `tiene_tarea()` / `tiene_tarea_alcance()` / `tiene_tarea_explicita()`. Nunca gatear por `rol_app` (solo existen `super_admin` y `usuario`). Base vieja `oxcypiztfoxxxhtuqmrd`: solo lectura, no se toca.
- Responder SIEMPRE en español, en castellano simple: Facu no programa.

## REGLA: LOS ARCHIVOS GRANDES NO SE LEEN ENTEROS
Los módulos son enormes (`modulos/administracion.html` ~850 KB, `produccion-gestion.html` ~640 KB, `stock.html` ~570 KB, y varios más arriba de 300 KB) y `docs/memoria/*.md` también pesan. Leer uno entero llena la ventana y traba el autocompact.
- **NUNCA leer un módulo entero.** Siempre `grep -n` para ubicar y `Read` con `offset`/`limit` de **300 líneas como máximo**.
- La exploración amplia (varios archivos, "¿dónde se usa X?") va con un agente **Explore** que devuelva solo las líneas que importan.
- Antes de leer cualquier archivo desconocido, `wc -c`. Arriba de ~100 KB, por partes.
- CLAUDE.md queda chico (menos de 15 KB): lo nuevo de un módulo se escribe en su archivo de `docs/memoria/`, no acá.

## Reglas de trabajo (las completas: docs/memoria/reglas-de-integracion.md)
1. **Una sola sesión de Claude Code por vez** en seis-destinos. Antes de cada tarea, `git fetch` y revisar que nadie haya movido `main` ni la rama propia; si algo cambió sin explicación, frenar y avisar.
2. **Los pedidos de Facu viven en `.claude/pedidos/<fecha>.md`**; los traspasos al cerrar, en `.claude/traspasos/`.
3. **Cada tarea en su rama `ci-prueba/<tema>`**, creada desde el `origin/main` más reciente. Se pushea solo la rama.
4. **Integración**: de noche (después de las 23:36 y antes de las 05:30, hora de Argentina) o cuando Facu escribe "INTEGRÁ" / lo autoriza en el pedido. Requisitos: `npm run pruebas` en verde y Pruebas + Navegador de GitHub en verde en la rama. Procedimiento:
   - `npm run ensayo -- <ramas, en el orden en que se integran>` en verde (une todo en una rama de descarte y corre suites + navegador de lo alcanzado; **cada paso tiene tope**: 20 min suites, 45 min navegador, y un paso colgado se corta entero).
   - Rama `respaldo/antes-de-<paso>` en el `main` de ese momento, pusheada y confirmada con `git ls-remote`.
   - `git merge --no-ff` de la rama, `npm run pruebas`, push, y esperar Pruebas, Navegador y Pages en `completed success`.
   - Si algo falla: un commit nuevo con contenido idéntico al respaldo. **Nunca `push --force`**, nunca `git stash`, nunca `reset` sobre trabajo ajeno. Si dos ramas chocan, se queda lo de todos los lados.
5. **La base la maneja el chat de la base: Claude Code solo la LEE** (SELECT de verificación libres). Lo que haya que cambiar viene descripto en el pedido. Datos ya cargados: nunca se borran ni se editan sin pedido explícito de Facu.
6. **Verificar antes de asumir**: todo dato de la base se consulta (`pg_get_functiondef`, `pg_get_constraintdef`, `information_schema`) antes de escribirlo o codificar contra él, con fecha.
7. **Al terminar**: el hash de cada rama, lo decidido sin consultar, lo que no se pudo probar y una sección **"Qué automatizaría ahora"**. Después, frenar hasta el próximo pedido.
8. Ediciones con script: skill `editar-archivos` (nada de `node -e`, `python -c`, heredocs que escriben ni `sed -i`: los frena el hook).
9. Territorio compartido (CHECK `chk_tarea_valida`, `CATALOGO_TAREAS`, Accesos, CLAUDE.md, `docs/memoria/`, `.claude/`): ver `docs/memoria/reglas-de-integracion.md`. Un CHECK compartido se cambia leyendo el real primero, nunca regenerándolo de memoria.

## Cómo correr las pruebas (detalle: docs/memoria/pruebas-y-ensayo.md)
- `npm run pruebas` — check-bytes (sin CR ni NUL) + todas las suites `pruebas/test-*.js` y `controles-*.js`. Tiene que terminar en `N/N en verde`.
- `npm run pruebas:rama` / `npm run mutaciones:rama` — solo lo que alcanza el cambio de la rama contra `origin/main` (`... lista` dice qué correría). No reemplaza a `npm run pruebas` antes de integrar.
- `node pruebas/check-scripts.js` — cada `<script>` como lo ve el navegador; en el cierre de todo commit que toque un módulo.
- `npm run ensayo -- <ramas>` — el ensayo de integración (ver arriba).
- Mutaciones de a una por vez (`node pruebas/mut-<x>.js`); el baseline de una suite se ancla a un commit fijo, nunca a `HEAD`. Para ver solo si sus anclas siguen en pie (segundos): `MUT_SOLO_ANCLAS=1 node pruebas/mut-<x>.js`; `test-anclas-mutaciones.js` lo hace con todas en `npm run pruebas`.
- Navegador: `npm run e2e` (Playwright); maqueta sin sesión: `npm run maqueta` + `?maqueta=<datos>` (skill `mirar-en-maqueta`, a 390 y 1280 px).
- Una suite nueva no se registra en ningún lado: alcanza con el nombre `test-<modulo>-<tema>.js` / `mut-<modulo>-<tema>.js`.

## Índice: para trabajar en X, leé docs/memoria/X.md (por partes si es grande)
- `arquitectura.md` — arquitectura, las excepciones a la regla de duplicar (js/ compartido), contraseñas, números, OCR y Edge Functions.
- `base-de-datos.md` — tablas generales (maestros, empleados, gastos, caja), vistas, RPCs generales, base vieja.
- `circuito-ingreso-gastos-cc.md` — el circuito Ingreso ↔ Gastos ↔ Cuentas Corrientes y sus RPCs.
- `dashboard.md` — burbujas de `mis_pendientes()` y el tablero de resúmenes (`js/tablero.js`).
- `barra-de-unidad.md` — la barra de fábricas de arriba y cómo filtra cada módulo.
- `login-y-mfa.md` — login, registro, roles, sesiones y verificación en dos pasos.
- `permisos.md` — tareas, `CATALOGO_TAREAS`, alcance, passthrough, tablets.
- `gastos.md` — Gastos (wizard, proveedores, préstamos, detector de duplicados).
- `caja.md` — Caja.
- `cuentas-corrientes.md` — Cuentas corrientes (proveedores y clientes, cheques en pagos, comisiones).
- `accesos-y-empleados.md` — Accesos y Empleados.
- `materia-prima.md` — Ingreso de insumos / materia prima (tablas y wizard).
- `stock.md` — Stock (libro, recuento, transferencias, mermas, costos, traspaso de producto terminado).
- `cobranzas.md` — Cobranzas (tablas y pantalla).
- `cheques.md` — la cartera de cheques (en Administración), depósito, venta y endoso.
- `produccion.md` — Producción: tablas, la planta (tablet) y la gestión.
- `pedidos.md` — Pedidos.
- `retiros.md` — Órdenes de retiro: tablas (compartidas con Administración) y la Carga.
- `administracion.md` — Administración (clientes, órdenes, listas, retenciones, préstamos, entre empresas, errores).
- `taller.md` — Proyectos Taller.
- `conos.md` — Conos de papel.
- `planificados.md` — módulos planificados.
- `estilo-visual.md` — el sistema visual, colores por módulo, barras, celular.
- `seguridad.md` — RLS, grants, Storage, XSS, registro de errores.
- `pruebas-y-ensayo.md` — automatización, GitHub Actions, navegador, maqueta, skills y las suites de `pruebas/`.
- `aprendizajes.md` — bugs recurrentes ya resueltos (leer el de tu tema antes de tocar algo parecido).
- `reglas-de-integracion.md` — las reglas de oro completas, territorio compartido y registro de escrituras en la base.
