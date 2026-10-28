# Cómo trabajar: reglas de oro, integración y registro de escrituras

> Movido tal cual desde CLAUDE.md el 14/10/2026 (CLAUDE.md quedó como índice). Los "ver más abajo / arriba" se refieren al CLAUDE.md original: buscá con grep en docs/memoria/.

## Cómo trabajar

### Cómo trabajamos (reglas permanentes de Facu, 02/10/2026)

Hay UNA sola sesión de Claude Code trabajando en seis-destinos. Estas reglas valen para todo pedido:
1. **Antes de cada tarea: `git fetch`** y revisar que nadie haya movido `main` ni la rama propia. Si algo cambió sin que se sepa por qué, **frenar y avisar**.
2. **Cada tarea en su rama `ci-prueba/<tema>`**, creada desde el `origin/main` más reciente. **Se pushea SOLO la rama.**
3. **INTEGRACIÓN NOCTURNA (regla del 09/10/2026, reemplaza a "main solo con INTEGRÁ" y a "NADA se integra: Claude audita primero").** Todo paso terminado con `npm run pruebas` en verde y **Pruebas + Navegador de GitHub en verde** en su rama **se integra esa misma noche, después de las 23:36 y antes de las 05:30 (hora de Argentina)**. **Antes, `npm run ensayo -- <las ramas, en orden>` en verde** (desde el 10/10/2026; ver *Automatización*). Procedimiento: rama **`respaldo/antes-de-<paso>`** en el `main` de ese momento y push (confirmado con `git ls-remote`), `git merge --no-ff` de la rama, `npm run pruebas`, push, y esperar **Pruebas, Navegador y Pages** en `completed success`. **Si algo falla: un commit nuevo con contenido idéntico al respaldo** (`git read-tree`/`checkout <respaldo> -- .` y commit), **nunca `push --force`**. Si dos ramas chocan, se queda lo de todos los lados. Claude (el chat) audita a la mañana. Fuera de esa ventana, `main` se toca solo para el archivo del pedido y cuando Facu escribe "INTEGRÁ".
   - **EL CANDADO DE INTEGRACIÓN (28/10/2026).** Varias sesiones integran a la vez, y dos que tocaron `main` juntas tuvieron que repetir respaldo, merge y 20 minutos de pruebas. Ahora, **antes del primer respaldo, `npm run candado -- tomar <tema>`** (sube la rama remota `integrando/<tema>`). Si otra sesión tiene uno vigente, **espera y avisa** quién está integrando ("ESPERO: está integrando integrando/x…"); si no lo suelta en 120 min (`--esperar <min>` lo cambia), sale en rojo con "No integres todavía": no se integra hasta tenerlo. **Al terminar, siempre, también si algo falló: `npm run candado -- soltar <tema>`.** El candado vence si no se renueva en 90 minutos (se da por abandonado; nadie lo borra), así que una integración larga lo **renueva con el mismo `tomar`** después de cada rama. `npm run candado -- ver` dice quién lo tiene. Si dos lo toman casi a la vez, gana el que lo tomó primero y el otro suelta el suyo solo. Detalle: `pruebas/candado.js`.
   - **El ensayo es confiable con varias sesiones (28/10/2026)**: los topes salen de la última corrida en verde + 30 %, el navegador corre en dos mitades a la vez como en GitHub, `--limpiar` nunca borra un ensayo que sigue corriendo (ver `pruebas-y-ensayo.md`).
4. **La base de datos la maneja Claude (el chat): Claude Code solo la LEE.** Lo que haya que cambiar en la base viene descripto en cada pedido.
5. **Al terminar:** el hash de cada rama, lo que se decidió sin consultar y lo que no se pudo probar. Después, frenar hasta el próximo pedido.
6. **Facu no programa**: los resúmenes van en castellano simple.

Las pruebas en navegador (`navegador.yml`) corren también en cada push a una rama `ci-prueba/**` (02/10/2026), en fila con las de `main` por la concurrency `navegador`.

### REGLA DE ORO — Territorio compartido

Cada chat de módulo trabaja EXCLUSIVAMENTE sobre su módulo: su HTML, sus RPCs, sus policies RLS.

Hay territorio COMPARTIDO con un único dueño, **el chat de arquitectura de permisos**. Ningún chat de módulo lo modifica directamente:
- el CHECK constraint `chk_tarea_valida`
- el `CATALOGO_TAREAS` de accesos.html
- la pantalla de Accesos (`modulos/accesos.html`)
- este archivo, `CLAUDE.md`
- **la carpeta `.claude/`**, donde viven las definiciones de los subagentes (`.claude/agents/*.md`, un archivo por módulo, con el territorio y los límites de ese subagente) y los traspasos que dejan al cerrar (`.claude/traspasos/*.md`, que se borran cuando se aplicaron). **Un subagente que puede editar su propia definición puede aflojarse sus propios límites**, así que ninguno la toca — la ÚNICA excepción es que cada uno escribe su propio archivo en `.claude/traspasos/`.
  - **Son ONCE subagentes, uno por módulo** (21/09/2026, más `cheques` y `produccion` el 22/09/2026 y `pedidos` el 23/09/2026): `gastos`, `caja`, `cuentas-corrientes`, `empleados`, `materia-prima`, `stock`, `cobranzas`, `cheques`, `produccion`, `pedidos` y `accesos`. **`pedidos`** es dueño de `modulos/pedidos.html` y de `guardar_cliente`, `guardar_pedido`, `marcar_avance_pedido`, `cambiar_estado_pedido` y `pedidos_de`; escribe `clientes`, `pedidos` y `pedido_items` SOLO vía esas RPCs y **lee sin tocar el catálogo de Producción** (`productos_terminados`, `producto_presentaciones`, `marcas_personalizadas`). **`produccion`** es dueño de `modulos/produccion.html` y, desde el 25/09/2026, de `modulos/produccion-gestion.html`, y de las RPCs de turnos, masas, paradas, cierre y configuración (lista en `.claude/agents/produccion.md`); escribe las 16 tablas del módulo SOLO vía esas RPCs, y **comparte con Stock `stock_movimientos`** (cada masa descuenta sus insumos con el trigger de `masa_items`, tipo `consumo_sala_masa`). **`cheques`** es dueño de `modulos/cheques.html` y de las RPCs `marcar_salida_cheque`, `marcar_salida_cheques` y `volver_cheque_a_cartera`; escribe `cobranza_cheques` y `cobranza_historial` SOLO vía esas RPCs y lee `cobranzas` (vía `v_cobranzas`), `bancos_bcra`, `v_empleados_publico`, `empleados` y `empleado_tareas`. Esas tablas son del esquema de Cobranzas y **COMPARTIDAS** entre los dos subagentes, igual que `js/cobranzas-comun.js`, que no edita ninguno de los dos. Los diez comparten el mismo molde —primera acción, límites de escritura, verificación, cierre y lenguaje idénticos— y difieren solo en el territorio: su HTML, sus RPCs, las tablas que **escribe** separadas de las que **solo lee** (sacadas de cada `.from`, `.rpc` y `.storage.from` del HTML y confirmadas contra `pg_proc`), y sus Edge Functions.
    - **`css/main.css`, `js/auth.js`, `js/utils.js` y `dashboard.html` no son de ningún subagente**: está escrito así en los ocho.
    - **Las tablas que escriben dos módulos figuran como COMPARTIDAS en los dos**: `empleados` (Empleados y Accesos), `caja_movimientos` (Caja, y Gastos por `anular_gasto` y el trigger del gasto), e `insumos`, `proveedor_insumo_alias`, `stock_movimientos` y las dos de transferencias (Stock e Ingreso). Antes de tocar la estructura o las policies de una compartida, el subagente mira qué hace el otro módulo y, si lo afecta, devuelve un traspaso.
    - **`accesos` es el único con una excepción dentro de su propio archivo:** el `CATALOGO_TAREAS` vive en `modulos/accesos.html` pero lo sigue decidiendo el chat de arquitectura de permisos, en sincronía con el CHECK; el subagente solo lo toca cuando un traspaso de ese chat lo pide. Las pantallas de auth y sus Edge Functions (`crear-solicitud-acceso`, `buscar-empleado-cuil`) no son suyas.

Cuando el trabajo de un módulo necesita tareas nuevas, cambios de permisos o cambios de catálogo, ese chat **DEBE generar un prompt de traspaso** para el chat de permisos, con la información completa:
- las claves exactas `modulo:tarea`
- qué significa cada una (la semántica, no solo el label)
- si lleva bypass de super_admin o no (`tiene_tarea` vs `tiene_tarea_explicita`)
- el alcance, si aplica
- qué RPCs cambiaron de firma o de valor de retorno

**Corolario, y es el que evita el daño más caro:** cualquier cambio a `chk_tarea_valida` se hace leyendo PRIMERO el constraint real con `pg_get_constraintdef` y agregando sobre eso. NUNCA regenerándolo desde una lista propia — regenerar pisa en silencio las tareas de otros módulos que ese chat no conoce.

### REGLA DE ORO — Cierre de tarea = doc al día

Ninguna tarea se considera terminada hasta que CLAUDE.md refleje sus cambios.

Si el chat que hizo el trabajo no puede editarlo (por la regla de arriba), tiene que **generar el prompt de actualización de doc y entregárselo a Facu como parte del cierre**. No es opcional ni "algo para después": una tarea sin la doc actualizada está incompleta.

### REGLA DE ORO — Quién escribe en la base, y cuál es el único límite (vigente desde el 16/09/2026)

**TODOS LOS CHATS TIENEN ACCESO DE LECTURA A SUPABASE (MCP).** Cualquier chat puede consultar el estado real: constraints, policies, funciones, vistas, columnas, filas.

**1. "Verificar antes de asumir" se queda sin excusas.** Antes, *"no puedo verificarlo desde acá"* era una limitación real, y por eso se aceptaban afirmaciones de segunda mano. Ahora verificar cuesta una consulta. Ningún chat debe afirmar, documentar ni traspasar un dato sobre la base sin haberlo consultado primero — **ni siquiera datos propios ni recientes**. **Los SELECT de verificación se corren libremente**, sin pedir permiso.

Caso real (agosto 2026): un traspaso reportó "31 tareas en el CHECK" cuando eran 32; el número venía arrastrado de la tanda anterior. Se detectó porque el chat receptor consultó antes de aceptarlo. **Esa verificación es obligatoria en los DOS lados**, el que traspasa y el que recibe: el que traspasa evita propagar el error, y el que recibe es la última red antes de que el dato entre al código o a este documento.

**2. ESTRUCTURA SÍ, DATOS NO.** Regla de Facu, que reemplaza a la anterior de *"leer no es escribir"*:
- **El chat de arquitectura y Claude Code tienen AUTORIDAD DE ESCRITURA en Supabase para CREAR y MODIFICAR ESTRUCTURA**: tablas, columnas nuevas, índices, vistas, funciones/RPCs, políticas, constraints y DDL en general. **Se aplican directamente, sin pedir permiso**, con guards (`IF NOT EXISTS` / `CREATE OR REPLACE` / `DROP` explícito ante un cambio de firma) y **verificación posterior** contra el catálogo (`pg_get_constraintdef`, `pg_get_functiondef`, `reloptions`, `information_schema`).
- **EL ÚNICO LÍMITE SON LOS DATOS.** Nunca borrar ni editar filas ya cargadas —un gasto, una persona, una cobranza— **salvo que Facu lo pida explícitamente**. También requieren **su aprobación previa** los cambios de estructura que puedan destruir o alterar datos existentes: `DROP` de tablas o columnas con datos, cambio de tipo o de nulabilidad de una columna con datos, `TRUNCATE`.
- **TODA escritura se reporta a Facu**: qué se corrió, con qué verificación y qué resultado. Es lo que conserva **un único punto donde se ve todo lo que entra a producción**, en un proyecto donde varios chats trabajan en paralelo sin verse entre ellos: antes lo daba que Facu corriera cada SQL a mano; ahora lo da el reporte.
- **Los demás chats de módulo mantienen el acceso que tengan configurado.** Si no tienen escritura, **entregan el SQL a Claude Code o a Facu** para que lo apliquen.
- **Lo que NO cambió:** leer antes de escribir; el traspaso entre chats cuando el cambio toca territorio de otro; y **nunca regenerar de memoria un CHECK o un catálogo compartido** —se lee el real y se agrega sobre eso (ver el corolario de la regla del territorio compartido)—. Tener permiso para escribir no vuelve más seguro escribir sin haber leído: la corrección chiquita de un chat sigue siendo el cambio invisible que otro chat va a pisar si no está reportada.

### Registro de escrituras en la base

**POR QUÉ EXISTE:** el 16/09/2026 hubo **DOS agentes escribiendo en producción en paralelo sin coordinarse**. Las funciones de `public` ejecutables por `anon` pasaron de **65 a 11** durante una misma sesión por trabajo que nadie reportó, y lo detectó el chat de permisos al medir dos veces con media hora de diferencia. No rompió nada y el trabajo iba en la dirección correcta, pero **nadie sabía que estaba pasando** — que es exactamente lo que la regla de escritura (arriba) dice que el reporte tiene que evitar.

**65 y 66 NO son un error de tipeo: son dos mediciones distintas del mismo momento, y se dejan las dos a propósito.** **65** es la cantidad de funciones con `anon=X` **explícito** en `proacl`; **66** es la cantidad que `anon` **realmente podía ejecutar**, medida con `has_function_privilege`. La que hace la diferencia no tenía el grant explícito: lo recibía **por `PUBLIC`**, del que `anon` es miembro. Es el caso concreto, medido en este proyecto, del aprendizaje *"el ACL ya no muestra ese rol no es lo mismo que ese rol no puede"*. **No unificar el número:** uno solo borra el ejemplo, y con él la razón para medir con `has_function_privilege` y no leyendo el ACL.

**REGLA: todo chat que escriba en la base reporta, EN EL MISMO TURNO, el SQL exacto y la verificación posterior**, y se anota acá. El acceso de lectura es para todos; el de escritura deja rastro solo si se escribe.

**16/09/2026 — chat de permisos** (todo esquema y políticas, cero datos):
1. `alter default privileges in schema public revoke execute on functions from anon, public` → **insuficiente**: no saca el `PUBLIC` global (ver Seguridad y el aprendizaje sobre el ACL).
2. `alter default privileges for role postgres revoke execute on functions from public` → **el que sí cerró**.
3. Policies del bucket `comprobantes`: cerradas por carpeta propia, y después corregidas dos veces (`TO authenticated` en vez de `PUBLIC`; alcance por unidad en la rama `mp/`; segundo `EXISTS` para `materia_prima_items`).
4. CHECK `chk_tarea_valida`: 36 → 37 (`gastos:gestionar_proyectos`), leyendo el constraint real antes del `DROP` + `ADD`.
5. `REVOKE` de `PUBLIC` y `anon` sobre las 10 funciones listadas en Seguridad, con `GRANT` a `authenticated` y `service_role`.
6. Creada y borrada `public.__test_acl_descartable()` para la verificación empírica.
7. CHECK **`chk_solicitud_texto_sin_html`** sobre `solicitudes_acceso`: rechaza `<` y `>` en `nombre`, `apellido` y `email`. Defensa en profundidad del XSS de `accesos.html`; **cero filas existentes lo violaban** (validado).

**16/09/2026 — Claude Code, módulo Cobranzas** (autorizado por Facu bloque por bloque, reportado en su sesión; esquema y filas nuevas, cero datos existentes tocados): los 7 bloques de creación del módulo — CHECK 32 → 36; las 5 tablas, `v_cobranzas` y `dv_bcra()`; 59 filas en `bancos_bcra`; las **10 funciones** de Cobranzas con `REVOKE ... FROM public, anon` sobre **esas** solamente; el bucket `cobranzas` y sus dos policies; la fila de `modulos`; y las 4 filas de `empleado_tareas` + 2 de `empleado_modulos` del permiso inicial. Más el deploy de la Edge Function `ocr-cheques`.
- **Son las 11 funciones más nuevas de `public` por OID** (`dv_bcra` y las diez de Cobranzas, verificado el 16/09/2026). Así que las "funciones nuevas creadas por un chat sin identificar" que se midieron ese día **son, en su mayoría, estas**: no estaban sin reporte, sino reportadas en otra sesión que el chat de permisos no veía — que es el mismo problema de coordinación que motiva este registro, desde el otro lado.

**16/09/2026 — Facu, a pedido de Claude Code (Gastos, Bloque A):** índice único `uq_proyectos_nombre` sobre `normalizar_texto(nombre)` y las RPCs `crear_proyecto(p_nombre)`, `dar_de_baja_proyecto(p_proyecto_id)` y `reactivar_proyecto(p_proyecto_id)` — `SECURITY DEFINER`, `search_path = public`, `authenticated` sí y `anon` no, las tres gateadas por `gastos:gestionar_proyectos`. Verificado por Claude Code contra `pg_proc` y `pg_indexes`.

**16/09/2026 — Claude Code, Gastos:** deploy de la Edge Function `ocr-comprobante`, versión 8 → **9** (`verify_jwt: true`), con el fuente de `4b677fa`. Verificado: el fuente desplegado coincide con el del repo, sin token responde 401 y el preflight 200. Cero cambios de base y cero datos tocados.

**16/09/2026 — chat de seguridad** (esquema, cero datos): `REVOKE EXECUTE ON FUNCTION public.buscar_empleado_por_cuil(text) FROM public, anon, authenticated` + `GRANT EXECUTE ... TO service_role`, corrido **después** de que el frontend de `f49bdd9` estuviera en producción. Verificado: ACL `{postgres=X/postgres, service_role=X/postgres}`, `has_function_privilege` `false` / `false` / `true`, y **cero** funciones de `public` ejecutables por `anon`.
- **Despliegues de Edge Functions de ese traspaso (`f49bdd9`), hechos por Claude Code con el CLI:** `buscar-empleado-cuil` **v1** (nueva) y `crear-solicitud-acceso` **v4 → v5**, las dos con `verify_jwt: true`. Verificado: el fuente descargado es idéntico byte a byte al del commit, y pruebas sin efectos con la key pública (sin token → 400 `esErrorCaptcha`; token falso → 400, lo que prueba que `TURNSTILE_SECRET_KEY` está configurada; nombre con `<` → 400 que nombra el campo; contraseña de 9 → 400).

**17/09/2026 — chat de arquitectura general** (esquema, cero datos): `alter function public.tiene_tarea(text,text) set search_path = public`, y lo mismo para `tiene_tarea_alcance(text,text,uuid)` y `tiene_tarea_explicita(text,text)`. **Se usó `ALTER FUNCTION` y NO `CREATE OR REPLACE`, a propósito:** no toca el cuerpo —que en estas tres está guardado con CRLF— y evita cualquier riesgo de reescribir una función que corre adentro de **cada policy RLS del sistema**. Verificado después: `proconfig` = `search_path=public` en las tres, las tres siguen ejecutando y devolviendo `false` sin sesión, `authenticated` las ejecuta y `anon` no. SECURITY DEFINER sin `search_path`: **20 → 17**.

**17/09/2026 — chat de Ingreso** (esquema, cero datos): `buscar_comprobante_cargado` suma `p_excluir_modulo text default null` y `p_excluir_id uuid default null`, con la exclusión como `is distinct from` en las tres ramas. Reportado a Facu con su verificación: una sola función sin sobrecargas, y ejecutada contra la base con los tres casos (sin excluir → 1; excluyendo `('gastos', id)` → 0; excluyendo otro módulo con el mismo id → 1). Verificado también por Claude Code contra `pg_proc` (firma, `SECURITY DEFINER`, `search_path = public`, `anon` no y `authenticated` sí).

**16-17/09/2026 — migración de las URLs de comprobantes (DATOS, con aprobación de Facu):** las 86 URLs firmadas de `gastos.foto_url` y las 19 de `facturas_pendientes.comprobante_url` pasaron a ruta de Storage, con respaldo previo en `_respaldo_urls_comprobantes_20260916` (105 filas; RLS sin policies). Verificado el 17/09/2026: 0 URLs viejas, 0 rutas rotas, las 105 filas del respaldo tienen hoy ruta. Reportada por Facu; **falta anotar qué chat la corrió.**

**16/09/2026 — chat de Caja, con autorización de Facu** (IDENTIFICADO DESPUÉS; acá figuraba como "chat SIN IDENTIFICAR"): `REVOKE` de `anon` sobre **~54 funciones ajenas a Cobranzas** — el salto de 66 a 11 funciones ejecutables por `anon`. Verificado y correcto; en su momento **no se reportó**, y por eso el chat de permisos lo detectó midiendo. Claude Code (Cobranzas) **no** lo hizo: su revoke solo tocó las funciones que creó.

**17/09/2026 — chat de Caja, con autorización de Facu** (esquema; la verificación previa miró los datos sin tocarlos): **CHECK de `moneda`** en las 7 tablas que no lo tenían (`caja_movimientos`, `caja_solicitudes_movimiento`, `creditos_proveedor`, `cuentas_caja`, `facturas_pendientes`, `gastos`, `intereses_factura`), con las 12 monedas del selector de la app. Antes se verificó que las filas existentes solo tenían `ARS` y `USD`. Verificado después (Claude Code): los 8 CHECK de `moneda` existen y están validados.

**21/09/2026 — chat del rediseño de Cobranzas** (esquema, cero datos; registrado acá al detectarse desde otra sesión, no reportado en su momento): migración `20260922000832` que crea `resumen_cobranzas(text,date,date,text,uuid) → TABLE(por_controlar bigint, cantidad bigint, total numeric)`, `LANGUAGE sql STABLE`, SECURITY INVOKER sobre `v_cobranzas`, `search_path=public`. Verificado el 21/09/2026 (Claude Code, solo lectura) contra `pg_get_functiondef` y `proacl`: EXECUTE `authenticated` y `service_role`, no `anon`; es la única función de Cobranzas con parámetros DEFAULT.

### REGLA DE ORO — Verificar antes de asumir

Antes de documentar, modificar o dar por conocido cualquier objeto de la base (policies, funciones, vistas, constraints), **verificar su estado real primero** — aunque lo haya hecho uno mismo y aunque haya sido hace poco.

El modelo de "un chat por tema" hace que ningún chat vea lo que hicieron los otros. Con el MCP de Supabase en modo lectura verificar cuesta treinta segundos; asumir costó, en este proyecto, estar a punto de documentar una policy que ya no existía: el chat de seguridad había diseñado la de `empleados` como "fila propia o admin/super_admin" con `mi_rol_app()`, y mientras trabajaba fue reescrita desde otro chat para usar `tiene_tarea_alcance()`. No se rompió nada y la policy nueva es mejor, pero se estuvo a un paso de escribir documentación falsa — y podría haber salido al revés, con un chat pisando el cambio del otro.

### Resto
- Responder SIEMPRE en español
- Un chat de Claude por módulo — más fácil de trocklear que mezclar todo en uno solo
- Paso a paso detallado para alguien sin experiencia técnica, cuando se pide un plan
- Mostrar qué se va a hacer antes de hacerlo y esperar aprobación
- Auditar el código/esquema real antes de proponer cambios — nunca asumir en base a este documento solo, puede estar desactualizado
- No tocar lo que funciona
- Los SELECT de verificación contra Supabase se corren libremente, sin pedir permiso.
- SQL de estructura (DDL, RPCs, ALTER, vistas, políticas RLS, constraints): el chat de arquitectura y Claude Code lo aplican directamente, con guards (`IF NOT EXISTS` / `CREATE OR REPLACE` / `DROP` explícito ante cambio de firma), verificación posterior y **reporte a Facu** de qué se corrió y con qué resultado. Los chats sin escritura entregan el SQL a Claude Code o a Facu.
- **Datos: nunca se borran ni se editan filas ya cargadas sin pedido explícito de Facu**, y requieren su aprobación previa los cambios que puedan destruir o alterar datos existentes (`DROP` de tablas o columnas con datos, cambio de tipo o de nulabilidad de una columna con datos, `TRUNCATE`). Ver la regla de oro de escritura.
- RPCs: convención `p_` en los parámetros, siempre `SECURITY DEFINER`, siempre re-verifican permisos server-side con `tiene_tarea()`/`tiene_tarea_alcance()`/`tiene_tarea_explicita()` (nunca confiar en que el frontend ya validó; nunca gatear por `rol_app` — ver sección Sistema de permisos)
- Nunca exponer claves secretas en el código ni en commits — los secretos de las Edge Functions se leen con `Deno.env.get(...)`
