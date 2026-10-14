# Sistema de permisos

> Movido tal cual desde CLAUDE.md el 14/10/2026 (CLAUDE.md quedó como índice). Los "ver más abajo / arriba" se refieren al CLAUDE.md original: buscá con grep en docs/memoria/.

## Sistema de permisos (migrado — julio 2026)

REGLA CENTRAL: el rol `admin` YA NO EXISTE. Solo hay dos valores de `empleados.rol_app`: `super_admin` (control total, bypass automático de todos los chequeos) y `usuario`. NUNCA escribir código nuevo que chequee `rol_app IN ('admin', ...)` — ese patrón está muerto. **Y desde el 31/08/2026 la base lo impide**: el CHECK `empleados_rol_app_check` solo acepta esos dos valores, así que un `UPDATE` a `'admin'` ahora es un error y no un dato raro que aparece meses después. Con eso **la migración de permisos queda cerrada también a nivel estructural**, no solo de código.

Los permisos finos son TAREAS granulares en la tabla `empleado_tareas` (empleado_id + modulo + tarea + habilitado + alcance jsonb). El catálogo válido lo define el CHECK constraint `chk_tarea_valida` — 57 tareas hoy (releído el 10/10/2026: las 53 de antes más `conos:ver`, `conos:pedir`, `conos:precios` y `conos:recibir`), listadas abajo, las mismas 57 que el `CATALOGO_TAREAS` de accesos.html (las de conos desde el 10/10/2026, `ci-prueba/conos-papel`). Las tareas son independientes entre sí y no hay jerarquías, **con UNA excepción forzada por servidor y UI: `cuentas_corrientes:ver_todo` requiere `gastos:ver_exportar`** (ver "Regla de otorgamiento" más abajo).

**Vínculo tarea ↔ módulo en la UI (decisión de Facu del 13/08/2026, que REVIERTE la anterior de "las tareas son independientes de los toggles de módulos"):** cada grupo de `CATALOGO_TAREAS` declara un campo **`modulos: [...]`** con claves de `empleado_modulos` (guión MEDIO), y el modal solo muestra sus tareas si **ALGUNO** de esos módulos está tildado — semántica "any", porque `facturas_pendientes:editar_interes` se opera desde Gastos o desde Cuentas Corrientes y con uno solo ya es útil. Es data-driven, mismo precedente que `conAlcance` y `requiere`.
- **El servidor sigue permisivo a propósito: NO valida el vínculo tarea-módulo.** Si lo validara rompería el passthrough de claves fuera de catálogo y los otorgamientos por SQL directo — justo los casos que la pantalla no sabe dibujar y no tiene que revocar.
- **Memoria de sesión al destildar:** las tareas de los grupos que se ocultan **por ese evento** salen del Set activo y quedan guardadas en `estado.modal.tareasRecordadas`; al volver a tildar el módulo se restauran, con su alcance intacto (`alcances` no se toca nunca). La restauración es silenciosa a propósito: el grupo reaparece en pantalla con sus checkboxes tildados, así que un aviso anunciaría algo que la persona ya está viendo.
- **SEMÁNTICA DE NO-PÉRDIDA — la regla que no hay que romper:** una tarea otorgada por SQL cuyo módulo NO está tildado **se preserva al guardar**. Al abrir el modal no se mueve nada: esas tareas quedan en el Set, ocultas pero vivas, y abrir y guardar sin tocar produce el payload idéntico. **Solo la ACCIÓN de destildar un módulo durante la sesión revoca; no tocar preserva.** Es el mismo principio del fix `0e70708`.
- Las tres invariantes están escritas en `moverTareasPorCambioDeModulos()` dentro de accesos.html, que es la única función que mueve tareas — y se llama SOLO desde el handler del toggle, nunca al abrir ni desde un render.

Catálogo completo de tareas (verificado contra `pg_get_constraintdef` del CHECK real, no reconstruido — claves exactas `modulo:tarea`, no inventar claves nuevas ni duplicar una existente con otro nombre; labels según `CATALOGO_TAREAS` de accesos.html):
- `gastos:ver_exportar` — Ver todos los gastos de la empresa + exportar Excel (incluye cargar gastos a nombre de otro)
- `gastos:editar_anular` — Editar y anular cualquier gasto
- `gastos:gastos_empresa` — Cargar gastos contra las cuentas de la Empresa (CON bypass)
- `gastos:gestionar_proyectos` — Dar de alta y baja proyectos del Taller (SIN alcance, CON bypass). Entró al CHECK el 16/09/2026 (chat de permisos) y al catálogo en `8361046`.
  - **SIN ALCANCE porque la tabla no lo permite:** `proyectos` tiene solo `id, nombre, activo, created_at` (verificado el 16/09/2026) — **no tiene `unidad_negocio_id`**, así que un proyecto es visible desde cualquier unidad y no hay contra qué acotar. Marcar `conAlcance` dibujaría un selector de unidades que nada puede aplicar. **Si algún día se le agrega la columna, recién ahí tiene sentido el alcance** — y en las dos mitades, catálogo y servidor.
  - **YA HABILITA ALGO (desde el 16/09/2026):** la exigen `crear_proyecto`, `dar_de_baja_proyecto` y `reactivar_proyecto` (verificado contra `pg_proc`), y `modulos/gastos.html` (`892297d`) muestra con ella la pantalla "Proyectos del Taller" y el "+ Proyecto nuevo" del wizard. Hasta ese día era la mitad "catálogo" esperando a la mitad "servidor". `proyectos` sigue sin policy de escritura: todo entra por esas tres RPCs.
- `caja:ver_listado` — Ver el listado completo de cajas de la empresa
- `caja:retiros_todos` — Ver los retiros personales de todos
- `caja:movimientos_todos` — Ver todos los movimientos de todas las cuentas
- `caja:ingreso_externo_propio` — Cargar ingresos externos en su propia caja (SIN bypass de super_admin — ver la nota de abajo)
- `caja:ingreso_externo_empresa` — Cargar ingresos en las cuentas de la Empresa (SIN bypass de super_admin — ver la nota de abajo)
- `caja:ver_empresa` — Ver la ficha y las cuentas de la Empresa (SIN bypass — es la puerta de entrada a todo lo de Empresa: sin esta tarea no aparece el atajo a la ficha)
- `caja:egreso_empresa` — Transferir plata de la Empresa a una persona (SIN bypass)
- `caja:traspaso_empresa` — Mover plata entre cuentas de la Empresa (SIN bypass)
- `caja:transferir_entre_personas` — Transferir plata entre dos personas comunes, sin super_admin ni Empresa de por medio (SIN bypass). Ya está en `CATALOGO_TAREAS`.
  - La exige **solo quien CREA** el movimiento; la contraparte no necesita nada para aceptar. Y sigue siendo una **solicitud**: la plata no se mueve hasta que la otra persona la confirma, así que la tarea no habilita a sacarle plata a nadie — habilita a pedírsela.
- `empleados:ver_editar` — Ver y editar empleados (CON ALCANCE por unidad)
- `empleados:importar_naaloo` — Importar/actualizar empleados desde Naaloo
- `empleados:reasignar_unidad` — Reasignar empleados entre unidades de negocio
- `cuentas_corrientes:ver_todo` — Ver proveedores, saldos y facturas de toda la empresa
- `cuentas_corrientes:alta_proveedor` — Dar de alta proveedores directamente
- `cuentas_corrientes:aprobar_rechazar_proveedor` — Aprobar/rechazar proveedores pendientes
- `cuentas_corrientes:registrar_pago` — Registrar pagos a proveedores
- `cuentas_corrientes:aplicar_credito` — Aplicar créditos a favor a facturas
- `cuentas_corrientes:anular_factura` — Anular facturas pendientes
- `cuentas_corrientes:asignar_proveedor_legado` — Asignar proveedor a facturas sin vincular
- `facturas_pendientes:editar_interes` — Editar facturas pendientes y agregar intereses (válida desde Gastos y desde Cuentas Corrientes)
- `materia_prima:cargar` — Registrar ingresos de materia prima (y ver los propios) (CON ALCANCE por unidad)
- `materia_prima:ver_todo` — Ver los ingresos de todas las personas (CON ALCANCE por unidad)
- `stock:ver` — Ver el stock, los lotes y los movimientos (CON ALCANCE por unidad)
- `stock:gestionar_catalogo` — Dar de alta y editar insumos del catálogo (SIN alcance — el catálogo de insumos es único y compartido por las 4 unidades, así que acotarlo por unidad no tendría sentido)
  - **Esta es la tarea que decide si un insumo EXIGE LOTE o no**, así que quien la tiene puede apagar la trazabilidad de un insumo. Otorgar con criterio restrictivo, a poca gente.
- `stock:dar_baja` — Dar de baja mercadería: rotura, vencimiento, merma (CON ALCANCE por unidad)
- `stock:enviar_transferencia` — Enviar mercadería a otra unidad de negocio (CON ALCANCE por unidad — el alcance controla desde dónde se SACA; el destino puede ser cualquier unidad, porque recibirla la controla el otro lado con su propia tarea)
- `stock:recibir_transferencia` — Recibir y confirmar mercadería de otra unidad (CON ALCANCE por unidad)
- `stock:ajustar_inventario` — Ajustar el stock del sistema al conteo real (CON ALCANCE por unidad)
- `stock:ver_costos` — Ver costos y stock valorizado (CON ALCANCE por unidad, CON bypass). La exigen `costos_insumos`, `stock_valorizado`, la policy de `insumo_costos` y el "costo + %" de `guardar_precio_insumo_lista` / `precios_insumos_lista`. Entró al CHECK por el chat de la base y al catálogo el 09/10/2026 (rama `ci-prueba/costos-insumos`).
- `stock:cargar_costos` — Cargar costos de insumos (CON ALCANCE por unidad, CON bypass). La exigen `guardar_costo_insumo` y `anular_costo_insumo`. Para ver la pantalla de costos hace falta además `ver_costos`.
  - **CONSTANCIA DEJADA A PEDIDO EXPLÍCITO (traspaso de Stock, 13/08/2026):** un ajuste positivo **crea stock de la nada**. Es el análogo exacto de las tareas de Caja-Empresa —donde meter plata "de la nada" motivó elegir `tiene_tarea_explicita` SIN bypass— y es además el mecanismo por el que se puede **tapar un faltante**. Acá se implementó **CON bypass de super_admin**, por decisión explícita de Facu tomada conociendo esa tensión. Si algún día aparece un descuadre raro de stock, este es el primer lugar a revisar.
- `materia_prima:editar_anular` — Corregir o anular ingresos ya cargados (CON ALCANCE por unidad)
- `cobranzas:cargar` — Cargar cobranzas y ver las propias (SIN alcance). Incluye editar y anular **lo propio mientras siga `registrada`**: quien cobra en la calle puede corregir su propio error antes de que administración lo procese, sin que haya que darle permiso sobre las cobranzas de todos.
- `cobranzas:ver_todo` — Ver las cobranzas de todas las personas (SIN alcance)
- `cobranzas:procesar` — Marcar una cobranza como procesada y reabrirla con motivo (SIN alcance)
- `cobranzas:editar_anular` — Editar cobranzas ajenas sin procesar y anular cualquiera (SIN alcance)
  - **Los dos límites son distintos y los pone el servidor para TODOS**, tenga quien tenga la tarea (verificado en `pg_get_functiondef` el 16/09/2026): `editar_cobranza` corta si `estado <> 'registrada'` —una procesada hay que reabrirla primero, con `procesar`—, y `anular_cobranza` solo corta si ya está `anulada`, así que anula también una procesada.
  - **El límite va en el LABEL y no solo en la descripción** (`8361046`): el label es lo que se lee al tildar y la descripción está detrás del `?`. El anterior, *"Editar y anular cobranzas de cualquier persona"*, hacía creer que habilitaba a corregir lo ya procesado.
  - **LAS CUATRO VAN SIN ALCANCE POR UNIDAD, y es una decisión y no un olvido:** las RPCs gatean con `tiene_tarea()` y **ninguna** con `tiene_tarea_alcance()`, porque **al cargarla una cobranza no pertenece a ninguna unidad de negocio** — el repartidor le cobra a un cliente, no a una empresa del grupo. Desde el 22/09/2026 `cobranzas.unidad_negocio_id` existe, pero la pone el ASENTAR, no la carga, y las RPCs siguen gateando sin alcance. Marcar `conAlcance` en el catálogo dibujaría un selector de unidades que el servidor ignora: la pantalla prometería un recorte que no existe.
  - Las cuatro **CON bypass de super_admin** (`tiene_tarea`, no `tiene_tarea_explicita`): ninguna mueve plata de la empresa ni crea valor de la nada — registran cheques de papel que ya existen.

- `produccion:cargar` — Abrir y cerrar turnos, registrar masas, paradas y lo producido desde la tablet (CON ALCANCE por unidad, CON bypass). Es la tarea de la cuenta de cada tablet.
- `produccion:ver` — Ver el historial de producción y el stock terminado (CON ALCANCE por unidad, CON bypass).
- `produccion:configurar` — Máquinas, recetas, productos, marcas, personal e insumos de cada ingrediente (CON ALCANCE por unidad, CON bypass). Ingredientes y marcas son comunes: `guardar_ingrediente`, `guardar_ingrediente_insumos` y `guardar_marca` la piden con `tiene_tarea()`, sin unidad. También deja anular una masa de un turno ya cerrado.
  - Las tres entraron al CHECK y al catálogo el 22/09/2026 (grupo "Producción", `modulos: ['produccion']`); verificado: el catálogo tiene las 40 claves del CHECK (`pruebas/test-accesos-produccion.js`).

- `pedidos:ver` — Ver los pedidos de los clientes y su avance (CON ALCANCE por unidad, CON bypass). Es la que lee las tres tablas del módulo (sus policies) y la que filtra `pedidos_de`.
- `pedidos:cargar` — Cargar pedidos, marcar su avance y entregarlos o anularlos (CON ALCANCE por unidad, CON bypass). La exigen `guardar_pedido`, `marcar_avance_pedido` y `cambiar_estado_pedido`.
- `pedidos:configurar` — Dar de alta y editar los clientes y sus apodos (CON ALCANCE por unidad, CON bypass). La exige `guardar_cliente`.
- `retiros:cargar` — Cargar órdenes de retiro en el depósito, sin precios (CON ALCANCE por unidad, CON bypass). La exigen `registrar_orden_retiro` y `mis_ordenes_retiro`. **No lee `ordenes_retiro` ni sus renglones**: lo suyo pasa por `mis_ordenes_retiro`.
- `retiros:ver` — Ver todas las órdenes y las cuentas de los clientes, en Administración (CON ALCANCE, CON bypass). Lee `ordenes_retiro`, `orden_retiro_items` y `cliente_movimientos`; la exigen `clientes_con_saldo` y `cuenta_cliente`.
- `retiros:anular` — Anular órdenes de retiro con motivo (CON ALCANCE, CON bypass). La exige `anular_orden_retiro`.
- `retiros:precios` — Valorizar, listas de precios y fichas de clientes (CON ALCANCE, CON bypass). La exigen `valorizar_orden_retiro`, `guardar_ficha_cliente` (o `pedidos:configurar`), `registrar_saldo_inicial_cliente`, `ajustar_cuenta_cliente`, `guardar_lista_precios` y `guardar_precios`.
- `conos:ver` "Ver conos de papel", `conos:pedir` "Armar pedidos de conos", `conos:precios` "Ver y cargar precios del papel", `conos:recibir` "Recibir pliegos de conos" — Conos de papel (SIN alcance, CON bypass: `tiene_tarea('conos', …)`). Grupo "Conos de papel" de `CATALOGO_TAREAS` con `siempreVisible` (no hay fila `conos` en la tabla `modulos`). Ver el módulo 15.
- `taller:ver`, `taller:cargar`, `taller:gestionar`, `taller:precios` — Proyectos Taller (SIN alcance, CON bypass por `_puede_taller`). Entraron al CHECK por el chat de arquitectura y al catálogo el 28/09/2026 (grupo "Proyectos Taller", `modulos: ['taller']`, `daed9a4`). **El CHECK tiene 51 claves** (leído el 28/09/2026). `gastos:gestionar_proyectos` sigue en el CHECK y en el catálogo (passthrough), rotulada "ya no se usa": ninguna pantalla la lee desde que Gastos dejó de gestionar proyectos. Suite `test-accesos-taller.js`.
  - Las cuatro entraron al CHECK por el chat de arquitectura y al catálogo el 26/09/2026 (grupo "Órdenes de retiro", `modulos: ['retiros']`, `b03cd8e`); `test-accesos-produccion.js` compara las 47 claves y `test-accesos-retiros.js` el grupo.
  - Están en el catálogo (grupo "Pedidos", `modulos: ['pedidos']`, `41fe94c`) y, desde el 23-24/09/2026, también en el CHECK (verificado con `pg_get_constraintdef` el 24/09/2026). El aviso de que faltaba se sacó de accesos.html, y `test-accesos-pedidos.js` exige que no vuelva.

PASSTHROUGH del modal de Accesos (sigue vigente, y desde `0e70708` es completo): el modal precarga TODAS las filas de `empleado_tareas` de la persona y el payload reenvía el Set completo, así que **una tarea otorgada por SQL que todavía no está en el catálogo conserva el permiso Y SU ALCANCE** al guardar, aunque la pantalla no sepa dibujarla. Hasta `0e70708` preservaba el permiso pero pisaba el alcance con null en cada guardado — una revocación parcial silenciosa (ver el aprendizaje sobre passthroughs a medias). **NO agregar un filtro del payload contra el catálogo**: revocaría en silencio esas tareas cada vez que se editen los permisos de esa persona. Es la red de seguridad para toda tarea que entre al CHECK antes que a `CATALOGO_TAREAS` — situación que ya ocurrió con las 4 de `materia_prima`.

Chequeo server-side (SIEMPRE en RPCs SECURITY DEFINER y policies RLS):
- `tiene_tarea(modulo, tarea)` — el estándar, CON bypass de super_admin
- `tiene_tarea_alcance(modulo, tarea, unidad_negocio_id)` — para tareas con alcance por unidad (hoy solo `empleados:ver_editar`; alcance = `{"todas": true}` o `{"unidades": ["uuid", ...]}`). También con bypass.
- `tiene_tarea_explicita(modulo, tarea)` — variante SIN bypass: exige la fila otorgada aunque quien llame sea super_admin. Se usa hoy en las SEIS tareas de Caja que tocan plata de Empresa, meten plata "de la nada" o saltean una regla de control: `ingreso_externo_propio`, `ingreso_externo_empresa`, `ver_empresa`, `egreso_empresa`, `traspaso_empresa` y `transferir_entre_personas`. El criterio: esas operaciones no se heredan por rol — ser super_admin no alcanza, hace falta la fila otorgada. (La sexta no toca plata de Empresa: lo que hace es saltear el requisito de que haya un super_admin en la operación, así que heredarla por rol sería circular — el super_admin ya cumple la regla por su cuenta.) El resto de las tareas usa `tiene_tarea()`. El frontend replica esta distinción: caja.html tiene `tieneTarea()` y `tieneTareaExplicita()` — ojo que ahí la firma es de UN solo argumento, el módulo va implícito.

Chequeo frontend (patrón en los módulos migrados —hoy los 10, Cobranzas, Cheques y Producción incluidos; Cheques usa las tareas de `cobranzas`—, copiar de gastos.html): al init se consulta `empleado_tareas` filtrando por módulo(s), se guarda un Set con claves `'modulo:tarea'`, y un helper `tieneTarea(modulo, tarea)` devuelve true si `rol_app === 'super_admin'` o el Set contiene la clave. El frontend solo oculta UI — la barrera real es siempre server-side.

### Las cuentas de las tablets NO son personas (25/09/2026)

**`empleados.es_dispositivo = true` marca la cuenta de una TABLET de la fábrica.** Hoy son tres —"Tablet Producción · Cucuruchos Nuss" / "· Dolce Pasta" / "· Mengui"—, `tipo='sistema'`, `rol_app='usuario'`, cada una con `produccion:cargar` y `stock:ver` **solo en su unidad** (alcance `{"unidades":[su unidad]}`) y los módulos `produccion` y `stock` (verificado el 25/09/2026). Tienen login, así que **cualquier lista armada con "tiene acceso" las trae**: la regla es que **no se ofrecen nunca como una persona**.
- **Dónde se aplica hoy:** `personal_produccion()` las excluye en la base; **Empleados** y **Accesos** las muestran aparte con la etiqueta **"Tablet"** (grupo "Tablets de la fábrica", al final; no cuentan en las cifras; en Empleados su ficha no tiene PIN; en Accesos conservan "Editar", porque sus permisos se editan ahí); **Caja** (`2df8e8d`) y **Gastos** (`32be78e`) las sacan de toda lista de personas elegibles o mostradas (contraparte, listado, directorio, filtros, selector de empleado del wizard) y NO de las búsquedas de un nombre por id.
- **CAJA Y GASTOS FILTRAN POR `tipo === 'sistema'`, Y NO POR `es_dispositivo`, porque `v_empleados_publico` no expone esa columna** (y Supabase estaba en solo lectura). Es un sustituto verificado, no la regla: **si la vista suma `es_dispositivo`, los dos filtros tienen que pasar a mirarla**. Filtran en el CLIENTE (`esCuentaDeTablet(e) = e?.tipo === 'sistema'`) y **nunca con `.neq('tipo','sistema')` en la consulta**, que en SQL descarta también las filas con `tipo` null en silencio. En Gastos, el selector de la EDICIÓN conserva a la persona del propio gasto aunque fuera una tablet (`personasParaEditar(g)`), para no guardarlo sin persona.
- **Empleados y Accesos sí leen `es_dispositivo`** (leen la tabla `empleados`), y las dos exigen `=== true`: un valor raro nunca saca a una persona de la lista.
- **Una tablet no tiene PIN de producción**: el PIN identifica a la PERSONA que usa la tablet.
- **REGLA para pantallas nuevas:** toda lista de personas se pregunta si puede traer una tablet, y si puede, la saca.

### Regla de otorgamiento — `cuentas_corrientes:ver_todo` requiere `gastos:ver_exportar`

**Es una REGLA FORZADA, no una recomendación.** El servidor la valida en `actualizar_permisos_empleado` (y `aprobar_solicitud_acceso` la hereda porque la invoca internamente), y la UI del modal de Accesos la refleja desde el commit `e9accc2`.

Motivo: la vista `v_cuenta_corriente_movimientos` hace un UNION de cinco tablas y una de ellas es `gastos` — los pagos a proveedor son filas de `gastos`. Sin `gastos:ver_exportar`, el RLS filtra esas filas y la persona ve el listado SIN los pagos, con el `saldo_acumulado` calculado sobre datos incompletos.

Esto NO es "queda a medias": son números que parecen correctos y están mal, sin ningún error a la vista y sin nada que le avise a la persona que le falta información. Es el peor modo de falla posible para un módulo de plata.

En la UI la dependencia se declara con el campo `requiere` en `CATALOGO_TAREAS` (mismo precedente que `conAlcance`), así que una dependencia nueva es una línea del catálogo y no otro `if`. Se BLOQUEA el guardado y NO se auto-tilda la tarea faltante: `gastos:ver_exportar` incluye "cargar gastos a nombre de otro", y auto-otorgarla sería una escalada silenciosa de privilegios en la única pantalla donde se reparten permisos.

Gestión: pantalla de Accesos (solo super_admin) con checkboxes por tarea. RPCs con firma nueva (SIN parámetro de rol):
- `actualizar_permisos_empleado(p_empleado_id uuid, p_modulos text[], p_tareas jsonb)`
- `aprobar_solicitud_acceso(p_solicitud_id uuid, p_modulos text[], p_tareas jsonb, p_unidad_negocio_id uuid)`

`p_tareas`: `[{"modulo":"...","tarea":"...","alcance":null|{...}}, ...]` con semántica de REEMPLAZO TOTAL (lo no incluido se apaga).

Cuenta de Empresa (Caja): empleado ficticio identificado por `tipo='empresa'` (activo=false, sin auth_user_id, unidad_negocio_id null).

Toda la ficha de Empresa —incluido el atajo de navegación que lleva a ella— exige `caja:ver_empresa` explícita. Adentro, cada operación tiene su propia tarea, también explícita: cargar ingresos exige `caja:ingreso_externo_empresa`, sacar plata hacia una persona exige `caja:egreso_empresa`, y mover plata entre cuentas de Empresa exige `caja:traspaso_empresa`. **Ninguna tiene bypass: un super_admin sin la fila otorgada tampoco puede.** (Versiones anteriores de este documento decían que el atajo usaba `tieneTarea` CON bypass como "excepción deliberada" — eso ya no es así, verificado contra caja.html ~líneas 3034 y 4533; la excepción y su consecuencia desaparecieron.)

Las transferencias que involucran a Empresa no exigen super_admin de contraparte, y cualquier super_admin puede responderlas en su nombre, incluso si él mismo las creó (auto-aceptación permitida: si no, una solicitud creada por el único super_admin disponible quedaría pendiente para siempre). El frontend replica esa regla en dos lugares que tienen que decir lo mismo — los botones Aceptar/Rechazar de cada solicitud y el contador del badge de pendientes — vía los helpers `involucraAEmpresa()` / `puedoResponderSolicitudesDeEmpresa()` de caja.html.

Formato del CHECK `chk_tarea_valida`: hoy valida con `(modulo || ':' || tarea) = any(array[...])` — ya NO es la cadena de OR anidados de la versión original. Para cambiarlo hay que hacer DROP + ADD con el array completo de las 43 (no se puede alterar in-place) — leyendo antes el constraint real, nunca regenerándolo de memoria (ver la regla del territorio compartido en "Cómo trabajar").

**Migración `materia_prima:gestionar_catalogo` → `stock:gestionar_catalogo` (12-13/08/2026).** La pantalla del catálogo de insumos se mudó al módulo Stock, así que la tarea se mudó con ella. La clave vieja YA NO EXISTE en el CHECK ni en `CATALOGO_TAREAS`.

**Lección de orden de ejecución, que es lo que hay que recordar de esto:** al migrar una clave del CHECK, el `UPDATE` de las filas existentes de `empleado_tareas` va **ENTRE el DROP y el ADD**. El `ADD` valida las filas que ya están en la tabla contra el array nuevo, así que si el UPDATE va después, el ADD falla por las filas con la clave vieja; y si va antes del DROP, falla contra el constraint viejo, que todavía no conoce la clave nueva. El orden correcto es DROP → UPDATE → ADD.

(Si alguna fila con la clave vieja sobreviviera igual, el modal de Accesos la deja pasar por el passthrough sin romperse — pero no cuenta como plan, es la red.)

Para módulos NUEVOS: definir sus tareas con Facu, agregarlas al CHECK constraint `chk_tarea_valida` (DROP + ADD con el array completo), al catálogo hardcodeado `CATALOGO_TAREAS` de accesos.html —con su `descripcion`, el `modulos` del grupo, y `conAlcance: true` si la tarea se acota por unidad—, y gatear RPCs/RLS con `tiene_tarea()` / `tiene_tarea_alcance()` — o con `tiene_tarea_explicita()` si la operación no debe heredarse por rol — nunca con `rol_app`.

PENDIENTE de Materia Prima: las 4 tareas ya se pueden otorgar desde Accesos, pero **el frontend del módulo todavía NO las chequea** — `modulos/materia-prima.html` solo verifica que exista la fila de `empleados`, sin `tieneTarea()`. Las barreras server-side (RLS y RPCs) sí están, así que no hay agujero real: lo que falta es ocultar lo que la persona no puede hacer. Queda para el chat de Materia Prima.
