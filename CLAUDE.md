# Seis Destinos — Guía del proyecto

## Objetivo
Sistema de gestión de fábrica de Grupo Nuss sobre una única base de datos central en Supabase (nuss-central), con datos maestros compartidos y módulos separados. Nombre de la app: Seis Destinos. Las empresas del grupo son: Cucuruchos Nuss (Córdoba), Dolce Pasta (Rosario), Taller (Córdoba), Mengui/Heladitos Orly (Córdoba).

## Arquitectura
- PWA (Progressive Web App): instalable en celular y funciona en navegador de escritorio
- Multi-archivo: un HTML por módulo, CSS compartido (`css/main.css`), sin JS compartido entre módulos — cada archivo duplica localmente sus propios helpers (parseImporte, formatearImporte, colorAvatar, etc.), es el patrón establecido, no crear un JS común
- Sin frameworks: HTML, CSS y JS vanilla
- Backend: Supabase (PostgreSQL administrado, región São Paulo)
- OCR de comprobantes: Edge Function `ocr-comprobante`, llama a la API de Anthropic (modelo claude-sonnet) en tiempo real. Extrae razon_social, cuit, y demás campos del comprobante — ver detalle en el propio archivo de la función antes de asumir qué campos devuelve. Es la de GASTOS y no se toca.
- OCR de remitos/facturas de materia prima: Edge Function `ocr-materia-prima`, SEPARADA de `ocr-comprobante`. Devuelve encabezado + array `items` con descripcion, marca, unidad_medida, cantidad_bultos, contenido_por_bulto, cantidad_total. NO devuelve lotes ni importes, a propósito.
- Hosting: GitHub Pages (repo: https://github.com/cucuruchosnuss-gastos/seis-destinos)

## Base de datos central (nuss-central)
- URL: https://xtorxouhzuizdvawqakb.supabase.co
- Publishable key: sb_publishable_G8GZe2uAvb6VdJ1S4DD8nA_CC7iugYw
- RLS activado en las tablas de `public` (verificado el 18/07/2026 sobre las 20 que existían entonces; desde esa auditoría se agregaron al menos `empleado_tareas` y `modulos` — son 22+, y el RLS de las nuevas no se re-verificó contra information_schema). Ver sección Seguridad más abajo por lo que todavía falta afinar.

### Tablas (verificado contra information_schema el 18/07/2026 — no confiar en versiones anteriores de este documento si contradicen esto)

**Maestros**
- `unidades_negocio`: id, nombre, ciudad, activo, created_at
- `categorias`: id, nombre, icon, activo, created_at
- `vehiculos`: id, nombre, marca, patente, unidad_negocio_id, activo, created_at
- `proyectos`: id, nombre, activo, created_at
- `proveedores`: id, razon_social, nombre_fantasia, cuit, activo, created_at, estado_alta, creado_por
  - `estado_alta`: `'activo'` / `'pendiente_aceptacion'` / `'rechazado'`. El booleano `activo` se mantiene sincronizado automáticamente por las RPCs (`aprobar_proveedor`/`rechazar_proveedor`/`crear_proveedor_pendiente`) — nunca tocarlo a mano por separado.
  - Índice único parcial en `cuit` (solo cuando no es null) — es la clave de matching real entre módulos, no `razon_social` (que es texto libre y varía).
- `productos`: id, nombre, unidad_negocio_id, activo, created_at
  - **Sin vincular a ningún módulo actual conocido.** Verificar con Facu si es resto de la app vieja o tiene un uso futuro no documentado antes de asumir cualquier cosa sobre esta tabla.

**Empleados / Accesos**
- `empleados`: id, nombre, unidad_negocio_id, rol, cuil, activo, created_at, tipo, auth_user_id, rol_app, origen, fecha_nacimiento, telefono, email, domicilio, legajo, fecha_alta, contacto_emergencia_nombre, contacto_emergencia_telefono, caja_raiz
  - `rol_app`: permiso dentro de la app — solo `super_admin` / `usuario` (el valor `admin` ya no existe, ver sección Sistema de permisos). No confundir con `rol`.
  - `rol`: puesto de RRHH (viene de Naaloo — Categoría + Subcategoría concatenadas, ej "Fuera de convenio · Categoría I").
  - `tipo`: `naaloo` / `admin` / `empresa` — bucket usado por el selector de empleados de Gastos, no tocar sin revisar ese uso. `'empresa'` identifica al empleado ficticio de la Cuenta de Empresa (activo=false, sin auth_user_id, unidad_negocio_id null — ver sección Sistema de permisos).
  - `origen`: `naaloo` (importado desde Excel) / `app_registro` (creado por auto-registro sin match de CUIL).
  - `caja_raiz` (boolean): LEGADO — YA NO CONTROLA NADA desde la migración de permisos de julio 2026; el control de ingresos externos pasó a la tarea `caja:ingreso_externo`. La columna todavía existe y caja.html la sigue leyendo (~líneas 1709, 1727, 2174, 2284, 4177: comentarios y selects sin efecto) — código muerto, pendiente conocido de limpieza (no urgente). Pendiente de drop en la limpieza final.
  - `contacto_emergencia_*`: carga manual únicamente, Naaloo no lo trae.
- `empleado_modulos`: id, empleado_id, modulo, habilitado, otorgado_por, otorgado_en. El dashboard SÍ la consulta (dashboard.html ~línea 419) y filtra los tiles con `esAdmin || misModulos.includes(modulo.clave)` — la variable del código se sigue llamando `esAdmin`, pero con el rol `admin` muerto equivale a super_admin; los super_admin ven todos los módulos sin pasar por esta tabla.
- `empleado_tareas`: id, empleado_id, modulo, tarea, habilitado, alcance (jsonb), más columnas de auditoría. Sistema de permisos granulares: el toggle de `empleado_modulos` decide si la persona VE el módulo; `empleado_tareas` decide qué puede HACER adentro. Las tareas son independientes entre sí.
  - `alcance` (jsonb): limita una tarea a unidades de negocio concretas — `{"todas": true}` o `{"unidades": [uuid, ...]}`.
  - Hoy la ÚNICA tarea con alcance es `empleados:ver_editar`. En accesos.html eso está hardcodeado en la constante `CLAVE_VER_EDITAR`, no como lista — si en el futuro otra tarea necesita alcance, hay que generalizar esa constante a un conjunto, no alcanza con agregarla al catálogo.
  - El catálogo válido lo define el CHECK constraint `chk_tarea_valida` (17 tareas — lista completa con labels en la sección Sistema de permisos); en el frontend está hardcodeado en `CATALOGO_TAREAS` dentro de accesos.html (decisión explícita: no se lee de la base). Los dos tienen que mantenerse en sincronía a mano.
- Convención de nombres (ya existente, explícita porque confunde): `modulos.clave` / `empleado_modulos.modulo` / `MODULOS[].clave` de dashboard.html usan GUIÓN MEDIO (`'cuentas-corrientes'`, `'materia-prima'`); `empleado_tareas.modulo` usa GUIÓN BAJO (`'cuentas_corrientes'`). Son namespaces distintos, no mezclar.
- `solicitudes_acceso`: id, nombre, apellido, email, cuil, estado, fecha_solicitud, usuario_id, fecha_nacimiento, telefono, tuvo_match

**Gastos**
- `gastos`: id, fecha, periodo, empleado_id, unidad_negocio_id, vehiculo_id, proveedor_id, categoria_id, proyecto_id, tipo_doc, numero_doc, razon_social, importe, moneda, kilometraje, lugar_servicio, foto_url, descripcion, observaciones, estado, created_at, receptor, descripcion_item, medio_pago, fecha_pago, cuenta_id
- `facturas_pendientes`: id, unidad_negocio_id, categoria_id, razon_social, tipo_documento, numero_comprobante, importe, moneda, empleado_id, fecha_factura, lugar, observaciones, comprobante_url, estado, gasto_id, created_at, updated_at, proyecto_id, vehiculo_id, kilometraje, modulo_origen, proveedor_id, saldo_pendiente
  - `estado`: `'pendiente'` / `'parcial'` / `'pagada'` / `'anulada'`. El CHECK constraint de esta columna tuvo que ampliarse a mano para admitir `'parcial'` — si en el futuro se agrega otro estado nuevo, recordar revisar el constraint (`facturas_pendientes_estado_check`), no asumir que Postgres lo acepta solo.
  - `modulo_origen`: `'gastos'` / `'materia_prima'` — para cuándo Materia Prima también inserte acá.
  - `saldo_pendiente`: arranca igual a `importe` (trigger `fn_inicializar_saldo_pendiente`), baja con cada pago aplicado o crédito aplicado. Fuente de verdad real del estado de deuda de esa factura puntual.
  - `gasto_id`: legado del diseño atómico original (una factura = un pago completo). Desde que existe `aplicaciones_pago`, un pago puede repartirse entre varias facturas — este campo ya no es la fuente de verdad para saber qué pago cubrió una factura, usar `aplicaciones_pago` en su lugar.

**Cuentas Corrientes** (proveedores — evolución de facturas_pendientes que soporta pagos parciales/mixtos)
- `aplicaciones_pago`: id, gasto_id, factura_pendiente_id, monto_aplicado, created_at — un pago (una fila de `gastos`) puede repartirse entre varias facturas.
- `creditos_proveedor`: id, proveedor_id, unidad_negocio_id, moneda, monto_original, monto_disponible, origen_gasto_id, estado (`'disponible'`/`'agotado'`), created_at — saldo a favor por sobrepago.
- `aplicaciones_credito`: id, credito_id, factura_pendiente_id, monto_aplicado, created_at — un crédito puede aplicarse a más de una factura futura.
- Todas con RLS, sin políticas de escritura — toda escritura pasa por las RPCs `SECURITY DEFINER` de abajo. (La descripción vieja "SELECT solo para admin/super_admin" es pre-migración de permisos; hoy los gates van por tareas — re-verificar el detalle de las policies en la próxima auditoría.)

**Caja**
- `cuentas_caja`: id, empleado_id, nombre, medio, moneda, favorita, activa, created_at, unidad_negocio_id, cbu, numero_cuenta, alias
  - `unidad_negocio_id` (uuid, nullable, FK a `unidades_negocio`): agregada en la sesión de Cuenta de Empresa.
  - `cbu` / `numero_cuenta` / `alias` (text): datos bancarios públicos, editables vía `editar_datos_publicos_cuenta_caja`.
- `caja_movimientos`: id, empleado_id, tipo, monto, moneda, medio_pago, gasto_id, fecha, descripcion, creado_por, created_at, contraparte_empleado_id, cuenta_id
- `caja_solicitudes_movimiento`: id, origen_empleado_id, destino_empleado_id, monto, moneda, medio_pago, fecha, descripcion, estado, creado_por, motivo_rechazo, respondido_por, respondido_en, created_at, cuenta_origen_id, cuenta_destino_id
  - Regla de negocio: transferencias entre personas requieren que al menos una de las dos partes sea `super_admin`. EXCEPCIÓN: las que involucran a la Cuenta de Empresa no exigen super_admin de contraparte, y cualquier super_admin puede aceptarlas en su nombre (auto-aceptación permitida) — ver sección Sistema de permisos.

**Materia Prima / Insumos** (esquema completo con RLS. Módulo de INGRESO construido en etapa 1: solo listado de ingresos, lectura. El stock y la administración del catálogo se mudan a un módulo aparte, todavía no construido.)
- `insumos`: id, nombre, marca, unidad_medida, tipo, activo, estado_alta, created_at. CATÁLOGO ÚNICO COMPARTIDO por las 4 unidades de negocio — NO tiene unidad_negocio_id (se eliminó a propósito).
  - `tipo`: `'materia_prima'` (exige lote) | `'insumo'` (no lleva lote). Materia prima es lo que entra a la receta (harina, azúcar, colorante, grasa, lecitina, fécula, cacao, esencias, bicarbonato); insumo es lo auxiliar (cajas, bolsas, limpieza, repuestos).
  - `estado_alta`: `'activo'` | `'pendiente_revision'`. Los productos creados al vuelo durante una carga entran como `'pendiente_revision'`.
  - Índice único: `(lower(nombre), lower(coalesce(marca,'')))`.
  - Los insumos NO se borran nunca (romperían la trazabilidad histórica): se desactivan con `activo=false`.
- `materia_prima_ingresos`: id, fecha, tipo_doc, numero_doc, razon_social, nombre_fantasia, unidad_negocio_id, foto_url, remito_vinculado_id, empleado_id, created_at.
  - `tipo_doc`: `'remito'` | `'factura_a'` | `'factura_x'` | `'sin_comprobante'`
  - `remito_vinculado_id`: autorreferencia. Cuando una factura corresponde a un remito ya cargado, apunta a ese remito y NO vuelve a sumar stock (evita duplicar cantidades cuando llegan los dos documentos por la misma mercadería).
- `materia_prima_items`: id, ingreso_id, insumo_id, cantidad, lote, lote_ilegible, ficha_tecnica_url, foto_lote_url, cantidad_bultos, contenido_por_bulto, created_at. NO tiene unidad_medida (se eliminó: la unidad vive solo en el catálogo, para no sumar kg con bolsas).
  - `cantidad` siempre está en la unidad base del catálogo.
  - `cantidad_bultos` / `contenido_por_bulto`: presentación opcional ("200 bolsas × 25 kg"). CHECK `chk_presentacion_coherente`: si están cargados, `cantidad` debe ser igual a `cantidad_bultos * contenido_por_bulto`.
  - `lote`: se tipea SIEMPRE a mano, nunca sale del OCR (los lotes no vienen en el remito, están en la etiqueta del envase).
  - `lote_ilegible`: para etiquetas rotas o borrosas. CHECK `chk_lote_ilegible_sin_lote`: no puede estar en true y tener lote a la vez.
  - `ficha_tecnica_url` y `foto_lote_url` son adjuntos SEPARADOS y opcionales.
- Trigger `trg_validar_item_materia_prima` → `fn_validar_item_materia_prima()` (SECURITY DEFINER): si el insumo es `tipo='materia_prima'`, exige lote cargado o `lote_ilegible=true`. Se valida solo al insertar/actualizar el ítem: si después alguien cambia el tipo de un insumo del catálogo, los ítems viejos no se re-validan.
- Vistas (ambas con `security_invoker=true`):
  - `v_stock_insumos` (insumo_id, insumo_nombre, marca, unidad_medida, unidad_negocio_id, cantidad_total) — excluye ingresos con `remito_vinculado_id` no nulo para no duplicar.
  - `v_stock_insumos_presentacion` — lo mismo + contenido_por_bulto, bultos.
- Decisión de diseño explícita: el módulo de Materia Prima NO captura precios, importes, IVA ni moneda, y NO toca gastos ni caja. Solo cantidades. Está excluido deliberadamente en esta etapa.

### Vistas
- `v_caja_saldos` (empleado_id, moneda, saldo), `v_caja_saldos_cuenta` (cuenta_id, saldo), `v_caja_saldos_medio` (empleado_id, moneda, medio_pago, saldo)
- `v_saldo_proveedor` (proveedor_id, unidad_negocio_id, moneda, deuda_pendiente, credito_disponible) — hace `FULL OUTER JOIN` entre facturas pendientes y créditos disponibles, para que un proveedor con solo crédito (sin deuda) también aparezca.
- `v_cuenta_corriente_movimientos` (proveedor_id, unidad_negocio_id, moneda, fecha, tipo, monto, factura_pendiente_id, gasto_id, credito_id, referencia, saldo_acumulado) — `saldo_acumulado` es un `SUM() OVER (PARTITION BY ... ORDER BY fecha)`, saldo corrido cronológico, no depende de qué filtro de fecha esté aplicado en pantalla.
- `v_stock_insumos` y `v_stock_insumos_presentacion` — ver detalle en la sección **Materia Prima / Insumos** de arriba (ambas con `security_invoker=true`, excluyen ingresos con `remito_vinculado_id` no nulo).

### RPCs (todas SECURITY DEFINER; desde la migración de permisos de julio 2026 re-verifican permisos server-side con `tiene_tarea()`/`tiene_tarea_alcance()` — NUNCA gatear por rol_app, salvo el bypass de super_admin que ya viene dentro de esos helpers. El conteo "31" era de la auditoría del 18/07/2026: después se agregaron al menos `tiene_tarea` y `tiene_tarea_alcance` y cambiaron firmas — re-verificar contra information_schema en la próxima auditoría. De esa auditoría vieja: se eliminó `rechazar_solicitud_acceso`, versión vieja que no borraba la cuenta de Auth huérfana al rechazar, reemplazada por la Edge Function `rechazar-solicitud-acceso`)

**Permisos**: `tiene_tarea(modulo, tarea)` y `tiene_tarea_alcance(modulo, tarea, unidad_negocio_id)` — los helpers estándar que usan todas las RPCs y policies RLS, con bypass de super_admin incorporado (ver sección Sistema de permisos).

**Accesos / Registro**: `aprobar_solicitud_acceso(p_solicitud_id uuid, p_modulos text[], p_tareas jsonb, p_unidad_negocio_id uuid)` y `actualizar_permisos_empleado(p_empleado_id uuid, p_modulos text[], p_tareas jsonb)` — firmas nuevas SIN parámetro de rol; `p_tareas` con semántica de REEMPLAZO TOTAL (ver sección Sistema de permisos) —, `obtener_mi_solicitud_acceso`, `buscar_empleado_por_cuil` (el rechazo de una solicitud NO es una RPC — es la Edge Function `rechazar-solicitud-acceso`, ver sección Login y roles)

**Empleados**: `completar_datos_empleado`, `importar_empleados_naaloo` (regla: `unidad_negocio_id` se asigna solo en el alta/INSERT, nunca se pisa en una reimportación — para no revertir correcciones manuales, ej. Taller viene agrupado con Cucuruchos Nuss en el Excel de Naaloo), `actualizar_contacto_emergencia`

**Gastos / Facturas pendientes**: `pagar_factura_pendiente` (legado — pago atómico de una sola factura completa; sigue existiendo para el botón "Pagar" de facturas legado sin `proveedor_id`, pero el camino nuevo es `registrar_pago_proveedor` desde Cuentas Corrientes), `anular_factura_pendiente` (bloquea si `estado` ya es `'parcial'`/`'pagada'`), `editar_factura_pendiente` (bloquea si `estado` no es `'pendiente'`), `fn_inicializar_saldo_pendiente` (trigger, no se llama directo), `fn_fecha_a_periodo` (helper de formato, ej "jul-26")

**Cuentas Corrientes**: `crear_proveedor_pendiente`, `aprobar_proveedor`, `rechazar_proveedor`, `asignar_proveedor_factura_pendiente` (para facturas legado sin proveedor), `sugerir_facturas_fifo` (devuelve `factura_pendiente_id, fecha_factura, numero_comprobante, saldo_pendiente, monto_a_aplicar` — nombres exactos, no adivinar variantes), `registrar_pago_proveedor` (recibe `p_aplicaciones jsonb` como array de `{factura_pendiente_id, monto_aplicado}` — la clave es literalmente `monto_aplicado`, no `monto`; si la suma aplicada es menor al monto pagado, el resto se registra como crédito automáticamente; la categoría del gasto resultante es la categoría real si todas las facturas del pago comparten la misma, o la categoría genérica "Pago a Cta. Cte. Proveedor" si son mixtas), `aplicar_credito_a_factura` (siempre manual, nunca automático — decisión de diseño explícita)

**Caja**: `crear_cuenta_caja`, `desactivar_cuenta_caja`, `renombrar_cuenta_caja`, `marcar_cuenta_favorita_caja`, `registrar_ingreso_propio_caja`, `registrar_ingreso_externo_caja` (migró a `tiene_tarea('caja','ingreso_externo')` con bypass de super_admin — verificado contra la definición real de la función en la base; ya NO usa `caja_raiz`; los ingresos van a las cuentas de la Cuenta de Empresa), `registrar_retiro_caja`, `registrar_traspaso_cuenta_caja`, `crear_solicitud_movimiento_caja`, `responder_solicitud_movimiento_caja`, `cancelar_solicitud_movimiento_caja`, `fn_sincronizar_caja_gasto` (trigger — descuenta Caja automáticamente al insertar un `gasto`; con `medio_pago='cheque'` y `cuenta_id=null` no descuenta nada, es comportamiento esperado, no hay circuito de cheques todavía)

## Base vieja (solo lectura, referencia)
- Proyecto: oxcypiztfoxxxhtuqmrd
- NO se modifica nunca. Conectada por MCP en solo lectura.
- Los módulos (gastos, ingresos_mp) NO se migran. Solo se migraron los maestros.

## Login y roles
- Supabase Auth (email + contraseña)
- Auto-registro (`registro.html`): busca CUIL con `buscar_empleado_por_cuil`; si matchea, pre-completa datos; si no, completa a mano. Crea la cuenta de Auth y una fila en `solicitudes_acceso` pendiente — todo vía Edge Function `crear-solicitud-acceso` (service role, atómico con rollback), nunca insert directo desde el cliente.
- Rechazo de una solicitud: Edge Function `rechazar-solicitud-acceso` (no es una RPC de Postgres) — además de marcar la solicitud como rechazada, borra la cuenta de Auth huérfana asociada para que la persona pueda volver a registrarse con el mismo email. Reemplazó a una RPC vieja del mismo nombre (con guión bajo) que no hacía ese borrado — esa RPC ya no existe, fue eliminada con `DROP FUNCTION`.
- Aprobación de solicitudes y edición de permisos/roles de otros usuarios: **exclusivo de `super_admin`**. `modulos/accesos.html` es soloSuperAdmin.
- Roles (`empleados.rol_app`): solo DOS valores — `super_admin` (control total, bypass automático de todos los chequeos; se asigna solo por SQL directo, nunca desde ninguna UI) y `usuario` (lo que puede hacer lo definen sus tareas en `empleado_tareas`). El rol `admin` YA NO EXISTE — ver sección Sistema de permisos.
- Tablets de fábrica: cuenta genérica + PIN de turno por encargado (a implementar)

## Sistema de permisos (migrado — julio 2026)

REGLA CENTRAL: el rol `admin` YA NO EXISTE. Solo hay dos valores de `empleados.rol_app`: `super_admin` (control total, bypass automático de todos los chequeos) y `usuario`. NUNCA escribir código nuevo que chequee `rol_app IN ('admin', ...)` — ese patrón está muerto.

Los permisos finos son TAREAS granulares en la tabla `empleado_tareas` (empleado_id + modulo + tarea + habilitado + alcance jsonb). El catálogo válido lo define el CHECK constraint `chk_tarea_valida` — 17 tareas hoy, listadas abajo. Todas las tareas son independientes entre sí — no hay jerarquías.

Catálogo completo de tareas (claves exactas `modulo:tarea` — no inventar claves nuevas ni duplicar una existente con otro nombre; labels según `CATALOGO_TAREAS` de accesos.html):
- `gastos:ver_exportar` — Ver todos los gastos de la empresa + exportar Excel (incluye cargar gastos a nombre de otro)
- `gastos:editar_anular` — Editar y anular cualquier gasto
- `caja:ver_listado` — Ver el listado completo de cajas de la empresa
- `caja:retiros_todos` — Ver los retiros personales de todos
- `caja:movimientos_todos` — Ver todos los movimientos de todas las cuentas
- `caja:ingreso_externo` — Cargar ingresos externos (cuenta Empresa)
- `empleados:ver_editar` — Ver y editar empleados (la ÚNICA tarea con alcance por unidad)
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

Chequeo server-side (SIEMPRE en RPCs SECURITY DEFINER y policies RLS):
- `tiene_tarea(modulo, tarea)` — el estándar, con bypass de super_admin
- `tiene_tarea_alcance(modulo, tarea, unidad_negocio_id)` — para tareas con alcance por unidad (hoy solo `empleados:ver_editar`; alcance = `{"todas": true}` o `{"unidades": ["uuid", ...]}`)

Chequeo frontend (patrón en los 5 módulos migrados, copiar de gastos.html): al init se consulta `empleado_tareas` filtrando por módulo(s), se guarda un Set con claves `'modulo:tarea'`, y un helper `tieneTarea(modulo, tarea)` devuelve true si `rol_app === 'super_admin'` o el Set contiene la clave. El frontend solo oculta UI — la barrera real es siempre server-side.

Gestión: pantalla de Accesos (solo super_admin) con checkboxes por tarea. RPCs con firma nueva (SIN parámetro de rol):
- `actualizar_permisos_empleado(p_empleado_id uuid, p_modulos text[], p_tareas jsonb)`
- `aprobar_solicitud_acceso(p_solicitud_id uuid, p_modulos text[], p_tareas jsonb, p_unidad_negocio_id uuid)`

`p_tareas`: `[{"modulo":"...","tarea":"...","alcance":null|{...}}, ...]` con semántica de REEMPLAZO TOTAL (lo no incluido se apaga).

Cuenta de Empresa (Caja): empleado ficticio identificado por `tipo='empresa'` (activo=false, sin auth_user_id, unidad_negocio_id null). Sus `cuentas_caja` se gestionan por super_admin; los ingresos externos van a sus cuentas vía la tarea `caja:ingreso_externo` (CON bypass de super_admin). Las transferencias que involucran a Empresa no exigen super_admin de contraparte, y cualquier super_admin puede aceptarlas en su nombre (auto-aceptación permitida).

Para módulos NUEVOS (ej. Materia Prima): definir sus tareas con Facu, agregarlas al CHECK constraint `chk_tarea_valida` (DROP + ADD, no se puede alterar in-place), al catálogo hardcodeado `CATALOGO_TAREAS` de accesos.html, y gatear RPCs/RLS con `tiene_tarea()` — nunca con `rol_app`.

## Módulos

### Existentes
1. **Gastos** (`modulos/gastos.html`): wizard de carga con OCR (incluye CUIT), vínculo a vehículo y/o unidad de negocio, selector de proveedor con matching automático por CUIT/razón social normalizada, envío a "pendiente de pago" (ver Cuentas Corrientes)
2. **Caja** (`modulos/caja.html`): cuentas de efectivo/banco por persona, ingresos/egresos/traspasos/retiros, transferencias entre personas (requieren al menos un `super_admin` en la operación — ver excepción de la Cuenta de Empresa en la sección Sistema de permisos), vista "Retiros socios" (gateada por la tarea `caja:retiros_todos`) y "Todos los movimientos" (gateada por `caja:movimientos_todos`)
3. **Cuentas Corrientes** (`modulos/cuentas-corrientes.html`): saldo por proveedor (deuda o crédito, nunca ambos mostrados a la vez — prioridad a la deuda), historial de facturas, registro de pagos con sugerencia FIFO editable, aplicación manual de créditos a favor, aprobación de proveedores nuevos, ver/editar/eliminar una factura (eliminar = `anular_factura_pendiente`, nunca un DELETE real)
4. **Accesos** (`modulos/accesos.html`, soloSuperAdmin): aprobación de solicitudes de registro y gestión de módulos + tareas granulares por usuario
5. **Empleados** (`modulos/empleados.html`): directorio agrupado por unidad de negocio, ficha con datos de Naaloo, importación de Excel de Naaloo
6. **Ingreso — Insumos / Materia Prima** (`modulos/materia-prima.html`, tile "Ingreso", clave `materia-prima`): etapa 1 construida — SOLO el listado de ingresos de mercadería, lectura, con detalle en modal (ítems, lotes, foto del comprobante). El catálogo y el stock se mudan a un módulo aparte todavía no construido — este módulo no los muestra. Sin precios ni importes por decisión de diseño (ver sección de tablas).

### Planificados
1. **Materia Prima — etapas siguientes**: etapa 2 = wizard de carga de ingresos (con OCR vía `ocr-materia-prima`); etapa 3 = alta/edición del catálogo de insumos. El stock y la administración del catálogo se mudan a un módulo aparte, todavía no construido.
2. Producción (futuro)
3. Salamasa (futuro)
4. Mantenimiento de máquinas (futuro)
5. Trazabilidad de lotes (futuro)

## Estilo visual
- Mobile-first, bordes redondeados (12px cards, 8px inputs/botones), sombras muy sutiles
- Fondo de página: clase global compartida `.pagina-modulo` (en `css/main.css`) → `background-color: var(--color-superficie)` (#eef1f6, gris muy claro) — **todo módulo nuevo necesita `<body class="pagina-modulo">`**, si falta, la página queda blanca lisa por error (bug real que pasó en Cuentas Corrientes).
- `.tarjeta-lista`: clase global compartida para cada ítem de una lista (fondo blanco, borde, radius, padding) — reusar siempre, no reinventar el estilo de tarjeta en cada módulo nuevo.
- Colores de acento por módulo: variables CSS locales en el `body {}` de cada archivo (no tocan las globales de `css/main.css`). Valores definitivos, no cambiarlos sin pedido explícito:
  - Gastos: `--color-acento-highlight` (cian, global)
  - Accesos: `--rojo` (#C23B3B)
  - Empleados: `--violeta` (#6E56CF / suave #F1EDFC / oscuro #5B45AD)
  - Caja: `--amarillo` (#C99A2E / suave #FBF3E0 / oscuro #8C6A1A)
  - Cuentas Corrientes: `--turquesa` (#3FBFAE / suave #E8FBF7 / oscuro #1E8C7C)
  - Insumos (Materia Prima): `--marron` (#A8601F / suave #F7EDE1 / oscuro #7A4315) — definidas en el `:root` de `css/main.css` (mismo precedente que `--rojo`/`--violeta`/`--amarillo`; `--turquesa` es la excepción, vive local en dashboard.html y cuentas-corrientes.html)
- Rediseño en curso: se está adoptando un lenguaje visual más redondeado/con tarjetas (headers en tarjeta blanca propia, banners con gradiente, chips de color) módulo por módulo, vía mockups de Claude Design revisados antes de implementar. Cuentas Corrientes y Caja ya lo tienen, e Insumos (materia-prima) nació directamente con este lenguaje; Gastos/Empleados/Accesos quedan con el estilo anterior hasta que se rediseñen (decisión: Empleados y Accesos NO se van a rediseñar, están bien como están y son los menos usados).

## Seguridad
- RLS activado en las tablas de `public` (verificado el 18/07/2026 sobre las 20 de entonces; `empleado_tareas` y `modulos` se agregaron después y su RLS no se re-verificó — confirmar en la próxima auditoría).
- Pendiente, sin urgencia (que ningún admin lo olvide): `empleados` y `cuentas_caja` se pueden leer completos (incluido CUIL, teléfono, fecha de nacimiento, domicilio en el caso de `empleados`) por cualquier usuario logueado, no solo por un admin. Requiere crear una vista angosta (`v_empleados_publico` con solo los campos no sensibles) para los selectores que hoy dependen de esto (ej. selector de empleado en el wizard de Gastos) antes de poder cerrar el acceso a la tabla completa.
- CORS de las Edge Functions usa `Access-Control-Allow-Origin: '*'` (default del scaffolding de Supabase) — no es una puerta abierta real porque cada función valida el token de sesión igual, pero si se quiere cerrar del todo, cambiar a `https://cucuruchosnuss-gastos.github.io` en las 4 funciones (`ocr-comprobante`, `ocr-materia-prima`, `crear-solicitud-acceso`, `rechazar-solicitud-acceso`).

## Aprendizajes clave (bugs recurrentes ya resueltos — no repetirlos)
- **`hidden` de HTML puede quedar pisado por una regla CSS con más especificidad** (ej. `#vista-lista { display: flex }` sin `:not([hidden])`) — pasó una vez, causó que dos pantallas se vieran superpuestas. Auditar todo el archivo por el mismo patrón, no parchear un solo caso.
- **Formato de número argentino (punto de miles, coma decimal) vs. el formato con punto decimal que usa `toFixed()`/JS nativo** — mismo bug apareció dos veces en dos lugares distintos del código (un valor formateado se re-parseaba mal, terminaba en `NaN`/`null`). Regla: el número canónico vive como valor JS plano, se formatea solo para mostrar, nunca se re-parsea un string ya formateado como si fuera la fuente de verdad.
- **Nombres de columnas/parámetros de un RPC: nunca adivinar variantes.** Cuando no se tiene el cuerpo real de la función a mano, preguntar o verificar antes de escribir código defensivo con múltiples nombres posibles — cuesta más tiempo debuggear después que preguntar antes.
- **`CREATE OR REPLACE FUNCTION` con firma distinta NO reemplaza — crea una sobrecarga duplicada** que rompe las llamadas por ambigüedad (costó un bug de producción). Si cambia la firma: `DROP FUNCTION` primero, después `CREATE`.
- **Toda FK nueva hacia `empleados` desde una tabla que ya tiene otra FK a empleados rompe los embeds de PostgREST por ambigüedad** — `gastos.anulado_por` se dejó SIN FK a propósito por esto.
- Verificación de cada commit: bajar el `.patch` real de GitHub y leerlo, nunca confiar en el resumen que da Claude Code de lo que hizo.

## Cómo trabajar
- Responder SIEMPRE en español
- Un chat de Claude por módulo — más fácil de trocklear que mezclar todo en uno solo
- Paso a paso detallado para alguien sin experiencia técnica, cuando se pide un plan
- Mostrar qué se va a hacer antes de hacerlo y esperar aprobación
- Auditar el código/esquema real antes de proponer cambios — nunca asumir en base a este documento solo, puede estar desactualizado
- No tocar lo que funciona
- Cualquier herramienta/conector de Supabase (lectura o escritura) requiere aprobación manual de Facu en el momento — ninguna sesión de Claude ejecuta nada contra la base en vivo por su cuenta, ni siquiera un SELECT informativo.
- SQL de escritura (DDL, RPCs, ALTER, políticas RLS): lo corre Facu a mano en el SQL Editor, con guards `IF NOT EXISTS`/`CREATE OR REPLACE`.
- RPCs: convención `p_` en los parámetros, siempre `SECURITY DEFINER`, siempre re-verifican permisos server-side con `tiene_tarea()`/`tiene_tarea_alcance()` (nunca confiar en que el frontend ya validó; nunca gatear por `rol_app` — ver sección Sistema de permisos)
- Nunca exponer claves secretas en el código ni en commits — los secretos de las Edge Functions se leen con `Deno.env.get(...)`
