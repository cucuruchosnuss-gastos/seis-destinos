# Seis Destinos — Guía del proyecto

## Objetivo
Sistema de gestión de fábrica de Grupo Nuss sobre una única base de datos central en Supabase (nuss-central), con datos maestros compartidos y módulos separados. Nombre de la app: Seis Destinos. Las empresas del grupo son: Cucuruchos Nuss (Córdoba), Dolce Pasta (Rosario), Taller (Córdoba), Mengui/Heladitos Orly (Córdoba).

## Arquitectura
- PWA (Progressive Web App): instalable en celular y funciona en navegador de escritorio
- Multi-archivo: un HTML por módulo, CSS compartido (`css/main.css`), sin JS compartido entre módulos — cada archivo duplica localmente sus propios helpers (parseImporte, formatearImporte, colorAvatar, etc.), es el patrón establecido, no crear un JS común
- **Contraseñas — excepción consciente a la regla de arriba.** El mínimo del servidor es **10 caracteres** (configurado en el panel; NO está configurado "required characters"). Los helpers viven compartidos en `js/utils.js` porque la regla de duplicar aplica a los 6 módulos, y estas pantallas de auth ya comparten `auth.js` y `utils.js`: `LARGO_MINIMO_CONTRASENA` (10), `validarContrasena(texto)` → `{ largo, mayuscula, minuscula, numero, simbolo, todoOk }`, `renderizarRequisitos(contenedor, resultado)` y `renderizarCoincidencia(contenedor, coinciden)`.
  - Usa clases Unicode (`\p{Lu}`, `\p{Ll}`, `\p{N}`) y NO rangos ASCII: con `/[A-Z]/` una contraseña que arranca con "Ángel" no contaría la mayúscula. "Símbolo" se define como `[^\p{L}\p{N}]` — complementario exacto de las otras categorías, así ningún carácter queda sin clasificar ni cuenta dos veces. El espacio cuenta como símbolo (a propósito: habilita passphrases).
  - El cliente queda MÁS ESTRICTO que el servidor, que solo exige largo. Es el lado seguro para equivocarse: nadie pasa los cinco requisitos y aun así se come un rechazo en inglés. Si algún día se configura "required characters" en el panel, revisar que no pida algo que el cliente no exige.
  - Se usan en los CUATRO lugares donde se ELIGE una contraseña nueva: el modal de dashboard.html, los dos formularios de registro.html y restablecer-contrasena.html. En login.html NO — ahí se escribe una que ya existe. registro.html no tiene campo de confirmación, así que ahí van solo los cinco requisitos, sin el de coincidencia.
  - La validación no es solo visual: el botón queda `disabled` hasta que se cumpla todo. El `disabled` se aplica DESDE JS y no como atributo del HTML, para que si el script fallara los botones queden habilitados como antes en vez de dejar el formulario inutilizable. Y los `catch`/`finally` revalidan en lugar de habilitar a ciegas.
  - Accesibilidad: el estado de cada requisito NO se comunica solo con color — el ✓ / ○ va como TEXTO dentro del span, así lo lee un lector de pantalla. Sin `aria-live` a propósito: se dispararía en cada tecla.
  - CSS unificado en `css/main.css`: `.campo-contrasena`, `.btn-mostrar-contrasena` (el "ojito", con íconos Lucide) y `.requisitos-contrasena` / `.requisito` / `.requisito--ok`. Antes había TRES implementaciones distintas del ojito — copias locales en registro.html y restablecer-contrasena.html, más una versión con emoji y colores hardcodeados en login.html. Toda pantalla de contraseña necesita el `<script>` de Lucide cargado.
  - En `_traducirError` de `js/auth.js`, el mensaje de largo mínimo NO tiene el número hardcodeado: se lee del propio mensaje de Supabase con `/Password should be at least (\d+) characters/`. La versión anterior tenía una clave fija con el 6 adentro; al subir el mínimo a 10 esa clave dejó de matchear y el error caía en el genérico "Ocurrió un error", justo cuando más falta hacía saber el motivo.
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
  - `caja_raiz` (boolean): LEGADO — YA NO CONTROLA NADA desde la migración de permisos de julio 2026; el control de ingresos externos pasó a las tareas `caja:ingreso_externo_propio` y `caja:ingreso_externo_empresa`. La columna todavía existe y caja.html la sigue leyendo (~líneas 1709, 1727, 2174, 2284, 4177: comentarios y selects sin efecto) — código muerto, pendiente conocido de limpieza (no urgente). Pendiente de drop en la limpieza final.
  - `contacto_emergencia_*`: carga manual únicamente, Naaloo no lo trae.
- `empleado_modulos`: id, empleado_id, modulo, habilitado, otorgado_por, otorgado_en. El dashboard SÍ la consulta (dashboard.html ~línea 419) y filtra los tiles con `esAdmin || misModulos.includes(modulo.clave)` — la variable del código se sigue llamando `esAdmin`, pero con el rol `admin` muerto equivale a super_admin; los super_admin ven todos los módulos sin pasar por esta tabla.
- `empleado_tareas`: id, empleado_id, modulo, tarea, habilitado, alcance (jsonb), más columnas de auditoría. Sistema de permisos granulares: el toggle de `empleado_modulos` decide si la persona VE el módulo; `empleado_tareas` decide qué puede HACER adentro. Las tareas son independientes entre sí, con UNA excepción forzada por servidor y UI: `cuentas_corrientes:ver_todo` requiere `gastos:ver_exportar` (ver la regla de otorgamiento en Sistema de permisos).
  - `alcance` (jsonb): limita una tarea a unidades de negocio concretas — `{"todas": true}` o `{"unidades": [uuid, ...]}`.
  - Hoy la ÚNICA tarea con alcance es `empleados:ver_editar`. En accesos.html eso está hardcodeado en la constante `CLAVE_VER_EDITAR`, no como lista — si en el futuro otra tarea necesita alcance, hay que generalizar esa constante a un conjunto, no alcanza con agregarla al catálogo.
    - **`CLAVE_VER_EDITAR` dejó de ser un detalle de UI: hoy está acoplada con el RLS.** La policy de `empleados` ("leer propia o con tarea de alcance") resuelve el acceso con `tiene_tarea_alcance('empleados','ver_editar', unidad_negocio_id)`, así que esa misma tarea gobierna quién puede leer la tabla. Consecuencia: generalizar la constante para una tarea nueva con alcance obliga a revisar **también la policy**, no solo la pantalla.
  - El catálogo válido lo define el CHECK constraint `chk_tarea_valida` (26 tareas — lista completa con labels en la sección Sistema de permisos); en el frontend está hardcodeado en `CATALOGO_TAREAS` dentro de accesos.html (decisión explícita: no se lee de la base). Los dos tienen que mantenerse en sincronía a mano — y hoy NO lo están: faltan las 4 de `materia_prima` en accesos.html, ver la brecha vigente en esa sección.
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

**MFA**: `listar_factores_mfa(p_auth_user_id uuid)` → devuelve `id`, `friendly_name`, `status` de `auth.mfa_factors` para ese usuario. Existe porque NO hay forma de leer los factores de otra persona desde el SDK:
- `admin.mfa.listFactors()` está documentada de forma contradictoria (el ejemplo JS no lleva argumentos pero la descripción dice "for a user") y su parámetro no está documentado en ningún lado. No adivinarlo.
- El objeto `user` documentado NO tiene campo `factors`, así que `admin.getUserById()` tampoco sirve.
- Un `.from('mfa_factors')` con service_role NO funciona: verificado contra `pg_class.relacl`, la ACL de `auth.mfa_factors` es solo `supabase_auth_admin`, `postgres` y `dashboard_user` — `service_role` tiene CERO privilegios. Y PostgREST no expone el esquema `auth`.
- OJO con la trampa: `service_role` tiene `rolbypassrls = true`, pero BYPASSRLS saltea las POLICIES, no otorga PRIVILEGIOS. Sin GRANT no puede leer igual.
Es `SECURITY DEFINER` con `search_path = ''` y su EXECUTE está revocado de `public`/`anon`/`authenticated` y otorgado SOLO a `service_role`: la llama únicamente la Edge Function, nunca el navegador.

**Permisos**: `tiene_tarea(modulo, tarea)` y `tiene_tarea_alcance(modulo, tarea, unidad_negocio_id)` — los helpers estándar que usan todas las RPCs y policies RLS, con bypass de super_admin incorporado. `tiene_tarea_explicita(modulo, tarea)` — misma idea pero SIN bypass, para operaciones que no deben heredarse por rol (hoy las dos de ingreso externo de Caja). Ver sección Sistema de permisos.

**Accesos / Registro**: `aprobar_solicitud_acceso(p_solicitud_id uuid, p_modulos text[], p_tareas jsonb, p_unidad_negocio_id uuid)` y `actualizar_permisos_empleado(p_empleado_id uuid, p_modulos text[], p_tareas jsonb)` — firmas nuevas SIN parámetro de rol; `p_tareas` con semántica de REEMPLAZO TOTAL (ver sección Sistema de permisos) —, `obtener_mi_solicitud_acceso`, `buscar_empleado_por_cuil` (el rechazo de una solicitud NO es una RPC — es la Edge Function `rechazar-solicitud-acceso`, ver sección Login y roles)

**Empleados**: `completar_datos_empleado`, `importar_empleados_naaloo` (regla: `unidad_negocio_id` se asigna solo en el alta/INSERT, nunca se pisa en una reimportación — para no revertir correcciones manuales, ej. Taller viene agrupado con Cucuruchos Nuss en el Excel de Naaloo), `actualizar_contacto_emergencia`

**Gastos / Facturas pendientes**: `pagar_factura_pendiente` (legado — pago atómico de una sola factura completa; sigue existiendo para el botón "Pagar" de facturas legado sin `proveedor_id`, pero el camino nuevo es `registrar_pago_proveedor` desde Cuentas Corrientes), `anular_factura_pendiente` (bloquea si `estado` ya es `'parcial'`/`'pagada'`), `editar_factura_pendiente` (bloquea si `estado` no es `'pendiente'`), `fn_inicializar_saldo_pendiente` (trigger, no se llama directo), `fn_fecha_a_periodo` (helper de formato, ej "jul-26")

**Cuentas Corrientes**: `crear_proveedor_pendiente`, `aprobar_proveedor`, `rechazar_proveedor`, `asignar_proveedor_factura_pendiente` (para facturas legado sin proveedor), `sugerir_facturas_fifo` (devuelve `factura_pendiente_id, fecha_factura, numero_comprobante, saldo_pendiente, monto_a_aplicar` — nombres exactos, no adivinar variantes), `registrar_pago_proveedor` (recibe `p_aplicaciones jsonb` como array de `{factura_pendiente_id, monto_aplicado}` — la clave es literalmente `monto_aplicado`, no `monto`; si la suma aplicada es menor al monto pagado, el resto se registra como crédito automáticamente; la categoría del gasto resultante es la categoría real si todas las facturas del pago comparten la misma, o la categoría genérica "Pago a Cta. Cte. Proveedor" si son mixtas), `aplicar_credito_a_factura` (siempre manual, nunca automático — decisión de diseño explícita)

**Caja**: `crear_cuenta_caja`, `desactivar_cuenta_caja`, `renombrar_cuenta_caja`, `marcar_cuenta_favorita_caja`, `registrar_ingreso_propio_caja`, `registrar_ingreso_externo_caja` (exige con `tiene_tarea_explicita` —SIN bypass de super_admin— la tarea que corresponda según el DUEÑO de la cuenta elegida: `caja:ingreso_externo_propio` si es de quien llama, `caja:ingreso_externo_empresa` si es de la Cuenta de Empresa. Ya NO usa `caja_raiz` ni la tarea vieja `ingreso_externo`. Params: `p_monto`, `p_cuenta_id`, `p_descripcion` + `p_fecha` opcional), `registrar_retiro_caja` (mismos params que la anterior), `registrar_traspaso_cuenta_caja` (params `p_cuenta_origen_id`, `p_cuenta_destino_id`, `p_monto_origen`, `p_monto_destino` + `p_fecha` opcional, MÁS `p_empleado_id` opcional para traspasar entre cuentas de OTRA caja —hoy solo Empresa, con `caja:traspaso_empresa`—; si se omite opera sobre quien llama), `crear_solicitud_movimiento_caja` (**DEVUELVE TEXT** con el estado resultante: `'aceptada'` si el movimiento se aplicó atómicamente, `'pendiente'` si quedó como solicitud a confirmar. Quien decide es el servidor —se auto-acepta cuando la crea un super_admin y hay Empresa de por medio—; el frontend solo informa y refresca según ese valor, nunca lo asume. Antes devolvía el uuid, que nadie usaba. Acepta además `p_empleado_propio_id` opcional, para que "mi lado" del movimiento sea Empresa y no quien llama), `responder_solicitud_movimiento_caja`, `cancelar_solicitud_movimiento_caja`, `fn_sincronizar_caja_gasto` (trigger — descuenta Caja automáticamente al insertar un `gasto`; con `medio_pago='cheque'` y `cuenta_id=null` no descuenta nada, es comportamiento esperado, no hay circuito de cheques todavía)

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
- Rescate de MFA: Edge Function `quitar-mfa-empleado`. Un super_admin le da de baja TODOS los factores TOTP a otra persona que perdió su dispositivo. Sin esto la única salida sería tocar la base a mano, porque Supabase no tiene códigos de recuperación. Recibe `empleado_id` (NO el auth_user_id). Valida, en orden: sesión válida → `rol_app = 'super_admin'` → **sesión en aal2** → body con `empleado_id` → esa persona tiene `auth_user_id` → no es uno mismo. Borra todos los factores (un factor vivo la sigue trabando); un borrado parcial devuelve error, no éxito.
  - Rescatar a OTRO super_admin está permitido a propósito: es el caso de uso principal, los super_admin se rescatan entre ellos.
  - **PRECONDICIÓN OPERATIVA, no es un bug**: exigir aal2 significa que un super_admin SIN MFA propio no puede rescatar a nadie (su sesión es aal1 y la función lo rechaza). Sumado a que no se permite el auto-rescate, hacen falta **DOS super_admin con MFA activo** para que este circuito sirva. Si solo una persona tiene MFA y pierde el dispositivo, no hay rescate posible desde la app. Es la decisión de seguridad correcta: sin el requisito de aal2, una sesión robada podría desactivarle el MFA a todo el equipo.
  - El claim `aal` se lee decodificando el payload del token DESPUÉS de que `getUser()` lo validó contra el servidor de Auth. Eso es seguro y el archivo lleva un comentario largo explicando por qué, para que nadie lo "arregle" mal: la verificación fuerte ya ocurrió en `getUser()`; decodificar después un token ya probado no es confiar en un token sin verificar. Quitar el `getUser()` y dejar solo el decode SÍ sería un agujero grave. Si el claim no viene, se asume aal1 y se rechaza — la doc dice "JWTs without an `aal` claim are at the `aal1` level".
  - El botón está en `modulos/accesos.html`, en la tarjeta de cada persona de "Usuarios y roles". Su condición es INDEPENDIENTE de `puedeEditar` (que sigue gateando solo a "Editar", porque un super_admin no edita permisos de otro). Si colgara de `puedeEditar` sería imposible rescatar a un super_admin, que es justamente el caso principal. Lo único que se excluye es la tarjeta propia.
- Tablets de fábrica: cuenta genérica + PIN de turno por encargado (a implementar)

## Verificación en dos pasos (MFA / TOTP) — agosto 2026

MFA es OPCIONAL por usuario: quien no lo activa entra como siempre. TOTP es gratis y viene habilitado por defecto en todos los proyectos de Supabase.

**NO EXISTEN CÓDIGOS DE RECUPERACIÓN.** La referencia de Auth MFA lo dice textual: "Recovery codes are not supported". El único respaldo posible es dar de alta un segundo dispositivo (máximo 10 factores por usuario). Todo el diseño de la UI y la existencia de la Edge Function de rescate salen de acá — no buscar una API de recovery codes, no la hay.

Otras dos consecuencias del diseño de Supabase, ambas visibles para el usuario:
- Verificar un factor CIERRA todas las demás sesiones de esa persona.
- Dar de baja un factor NO degrada el JWT de aal2 a aal1 hasta el próximo refresco automático; hace falta `refreshSession()` explícito.

### Chequeo de nivel (AAL) — `js/auth.js`, dentro de `verificarSesion()`

Va después del `getSession()` y ANTES de los dos returns de redirección. Vive ahí, y no en cada pantalla, para que proteja automáticamente a las 11 páginas que llaman a `verificarSesion()` — incluidos los 6 módulos — sin que ninguna tenga que acordarse.

- Condición para exigir el segundo factor: `nextLevel === 'aal2' && nextLevel !== currentLevel`
- **Falla CERRADA**: si `getAuthenticatorAssuranceLevel()` devuelve error, se exige el factor igual. No saber el nivel no es "seguí de largo".
- Corre SOLO si hay sesión. index.html, login.html, registro.html y recuperar-contrasena.html llaman con `redirigirSiNoHay:false`; sin este guard un visitante anónimo entrando a la home terminaría rebotando contra mfa.html.
- No redirige si ya estamos en mfa.html (se compara por `pathname`, no por string suelto, para que funcione igual en GitHub Pages que en local).
- Va ANTES de los returns a propósito: si fuera después, una sesión con el factor pendiente que abre login.html saltaría primero al dashboard por `redirigirSiHay` y recién de ahí a mfa.html.

`restablecer-contrasena.html` NO llama a `verificarSesion()` (maneja su propia sesión de recuperación), así que el reseteo de contraseña no queda bloqueado. Termina redirigiendo a dashboard.html, donde el chequeo sí corre.

### Funciones de MFA en `js/auth.js`

- `listarFactoresMfa()` → solo los factores TOTP con `status === 'verified'`.
- `iniciarAltaMfa(nombreAmigable)` → `{ factorId, qrCode, secret }`. El `qrCode` viene en SVG, va directo al `src` de un `<img>`. Antes de crear el factor nuevo da de baja los `unverified` colgados: `enroll()` crea la fila apenas se lo llama, y si la persona abandona el modal esa fila queda para siempre haciendo chocar el reintento con `mfa_factor_name_conflict`. NUNCA toca un factor `verified`.
- `verificarCodigoMfa(factorId, codigo)` → `challenge()` + `verify()`. Sirve tanto para completar el alta como para el desafío al entrar. El challenge se crea al verificar y no al abrir la pantalla: tiene expiración propia.
- `darDeBajaMfa(factorId)` → `unenroll()` + `refreshSession()`.

**Los errores de MFA se traducen por `error.code`, no por el texto del mensaje** (`_traducirErrorMfa`). Los códigos son contrato público documentado de Supabase; el texto no. Si el código no viene, cae al genérico y loguea a consola. Dos códigos que importan por UX y no solo por traducción:
- `mfa_ip_address_mismatch`: el alta tiene que empezar y terminar en la misma IP. En celular, pasar de WiFi a datos móviles en el medio la rompe. El mensaje traducido lo explica con esas palabras.
- `mfa_factor_name_conflict`: dos factores del mismo usuario no pueden tener el mismo nombre. Por eso el alta pide un nombre de dispositivo editable.

### `mfa.html` — pantalla del desafío al entrar

Misma estructura visual que login (`.pagina-auth` + `.tarjeta-auth`). Sin CAPTCHA: el usuario ya pasó el login. Tres salidas posibles:
- Sesión ya en `aal2` → al dashboard (alguien entró a la URL a mano).
- Hay factores verificados → pide el código de 6 dígitos.
- NO hay factores verificados → mensaje sin salida + botón de cerrar sesión. **NO redirige.** Ver el aprendizaje sobre bucles de redirección.

Un código mal tipeado NO cierra la sesión: se limpia el campo y se reintenta.

### Alta desde `dashboard.html` (menú de perfil → "Verificación en dos pasos")

Modal con dos estados: sin factor (aviso + nombre de dispositivo + Activar → QR + secreto + código) y con factor (lista + "Agregar otro dispositivo"). NO hay botón de desactivar.

El aviso previo al alta es obligatorio y explícito porque no hay recovery codes: "Guardá el código de texto en un lugar seguro y escaneá el QR en un segundo dispositivo. Si perdés el único dispositivo, no vas a poder entrar."

PENDIENTE DE CONFIRMAR: no está documentado si `listFactors()` devuelve `created_at`. La columna existe en `auth.mfa_factors`, pero la API puede no devolverla. El código muestra la fecha si viene y solo el nombre si no.

### Pendiente operativo

- **Configurarle MFA al segundo super_admin.** Sin eso, el circuito de rescate de `quitar-mfa-empleado` queda escrito y desplegado pero inutilizable (ver la precondición en Login y roles).

## Sistema de permisos (migrado — julio 2026)

REGLA CENTRAL: el rol `admin` YA NO EXISTE. Solo hay dos valores de `empleados.rol_app`: `super_admin` (control total, bypass automático de todos los chequeos) y `usuario`. NUNCA escribir código nuevo que chequee `rol_app IN ('admin', ...)` — ese patrón está muerto.

Los permisos finos son TAREAS granulares en la tabla `empleado_tareas` (empleado_id + modulo + tarea + habilitado + alcance jsonb). El catálogo válido lo define el CHECK constraint `chk_tarea_valida` — 26 tareas hoy, listadas abajo. Las tareas son independientes entre sí y no hay jerarquías, **con UNA excepción forzada por servidor y UI: `cuentas_corrientes:ver_todo` requiere `gastos:ver_exportar`** (ver "Regla de otorgamiento" más abajo).

Catálogo completo de tareas (verificado contra `pg_get_constraintdef` del CHECK real, no reconstruido — claves exactas `modulo:tarea`, no inventar claves nuevas ni duplicar una existente con otro nombre; labels según `CATALOGO_TAREAS` de accesos.html):
- `gastos:ver_exportar` — Ver todos los gastos de la empresa + exportar Excel (incluye cargar gastos a nombre de otro)
- `gastos:editar_anular` — Editar y anular cualquier gasto
- `gastos:gastos_empresa` — Cargar gastos contra las cuentas de la Empresa (CON bypass)
- `caja:ver_listado` — Ver el listado completo de cajas de la empresa
- `caja:retiros_todos` — Ver los retiros personales de todos
- `caja:movimientos_todos` — Ver todos los movimientos de todas las cuentas
- `caja:ingreso_externo_propio` — Cargar ingresos externos en su propia caja (SIN bypass de super_admin — ver la nota de abajo)
- `caja:ingreso_externo_empresa` — Cargar ingresos en las cuentas de la Empresa (SIN bypass de super_admin — ver la nota de abajo)
- `caja:ver_empresa` — Ver la ficha y las cuentas de la Empresa (SIN bypass — es la puerta de entrada a todo lo de Empresa: sin esta tarea no aparece el atajo a la ficha)
- `caja:egreso_empresa` — Transferir plata de la Empresa a una persona (SIN bypass)
- `caja:traspaso_empresa` — Mover plata entre cuentas de la Empresa (SIN bypass)
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
- `materia_prima:cargar` — definida en el chat de Materia Prima; descripción TENTATIVA: cargar ingresos de materia prima — confirmar semántica exacta en ese chat
- `materia_prima:ver_todo` — ídem, TENTATIVA: ver ingresos de todas las unidades
- `materia_prima:gestionar_catalogo` — ídem, TENTATIVA: administrar el catálogo de insumos
- `materia_prima:editar_anular` — ídem, TENTATIVA: editar/anular ingresos

BRECHA VIGENTE (no es un bug, es un pendiente conocido): las 4 tareas de `materia_prima` existen en el CHECK pero **todavía NO están en el `CATALOGO_TAREAS` de accesos.html**, así que no se pueden otorgar desde la pantalla de Accesos — solo por SQL directo. Queda así hasta que el chat de Materia Prima las sume (o se decida sumarlas desde otro lado). Ojo con la consecuencia del diseño de esa pantalla: el modal de permisos precarga TODAS las filas de la persona y el payload reenvía el Set completo, así que una tarea otorgada por SQL que no está en el catálogo se preserva al guardar aunque no tenga checkbox. NO agregar un filtro del payload contra el catálogo: revocaría en silencio esas 4 tareas cada vez que se editen los permisos de esa persona.

Chequeo server-side (SIEMPRE en RPCs SECURITY DEFINER y policies RLS):
- `tiene_tarea(modulo, tarea)` — el estándar, CON bypass de super_admin
- `tiene_tarea_alcance(modulo, tarea, unidad_negocio_id)` — para tareas con alcance por unidad (hoy solo `empleados:ver_editar`; alcance = `{"todas": true}` o `{"unidades": ["uuid", ...]}`). También con bypass.
- `tiene_tarea_explicita(modulo, tarea)` — variante SIN bypass: exige la fila otorgada aunque quien llame sea super_admin. Se usa hoy en las CINCO tareas de Caja que tocan plata de Empresa o meten plata "de la nada": `ingreso_externo_propio`, `ingreso_externo_empresa`, `ver_empresa`, `egreso_empresa` y `traspaso_empresa`. El criterio: esas operaciones no se heredan por rol — ser super_admin no alcanza, hace falta la fila otorgada. El resto de las tareas usa `tiene_tarea()`. El frontend replica esta distinción: caja.html tiene `tieneTarea()` y `tieneTareaExplicita()` — ojo que ahí la firma es de UN solo argumento, el módulo va implícito.

Chequeo frontend (patrón en los 5 módulos migrados, copiar de gastos.html): al init se consulta `empleado_tareas` filtrando por módulo(s), se guarda un Set con claves `'modulo:tarea'`, y un helper `tieneTarea(modulo, tarea)` devuelve true si `rol_app === 'super_admin'` o el Set contiene la clave. El frontend solo oculta UI — la barrera real es siempre server-side.

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

Formato del CHECK `chk_tarea_valida`: hoy valida con `(modulo || ':' || tarea) = any(array[...])` — ya NO es la cadena de OR anidados de la versión original. Para cambiarlo hay que hacer DROP + ADD con el array completo de las 26 (no se puede alterar in-place) — leyendo antes el constraint real, nunca regenerándolo de memoria (ver la regla del territorio compartido en "Cómo trabajar").

Para módulos NUEVOS (ej. Materia Prima): definir sus tareas con Facu, agregarlas al CHECK constraint `chk_tarea_valida` (DROP + ADD con el array completo), al catálogo hardcodeado `CATALOGO_TAREAS` de accesos.html, y gatear RPCs/RLS con `tiene_tarea()` — o con `tiene_tarea_explicita()` si la operación no debe heredarse por rol — nunca con `rol_app`.

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
- `empleados`: **CERRADO** (el pendiente viejo de "se lee completo por cualquier logueado" ya no aplica). La policy vigente se llama "leer propia o con tarea de alcance" y su `qual` es:
  ```
  (auth_user_id = auth.uid())
  OR tiene_tarea_alcance('empleados', 'ver_editar', unidad_negocio_id)
  ```
  El acceso migró del chequeo por rol al sistema de tareas granulares, con alcance por unidad de negocio. Un usuario común solo lee SU PROPIA fila; el CUIL, el teléfono, el domicilio y la fecha de nacimiento de los demás dejaron de ser legibles. Los super_admin siguen viendo todo, pero no por un chequeo de rol en la policy: `tiene_tarea_alcance` es SECURITY DEFINER y lleva la excepción de super_admin adentro (`e.rol_app = 'super_admin' or exists(...)`).
- `cuentas_caja`: **SIGUE ABIERTA, Y ES A PROPÓSITO. No es un pendiente.** Cualquier empleado logueado ve el nombre, el medio y la moneda de las cuentas de cualquier otro, y hace falta para dos cosas concretas: elegir la cuenta destino en las transferencias entre personas (caja.html) y el selector de contraparte del wizard de Gastos. Es segura porque `cuentas_caja` NO tiene columna de saldo: la plata vive en las vistas `v_caja_saldos*`, que sí respetan el RLS de `caja_movimientos` gracias a `security_invoker`. O sea: se ve QUE la cuenta existe, no CUÁNTO tiene. Si alguna vez se le agrega una columna sensible, esta decisión hay que revisarla — hoy es segura por la forma de la tabla, no por una restricción de acceso.
- **`REVOKE` a `anon` sobre todo el esquema `public`**, más `ALTER DEFAULT PRIVILEGES` para que las tablas futuras nazcan sin permisos para `anon`. Verificado en su momento con una consulta a `information_schema.role_table_grants`, que devolvió CERO filas para `anon`. Los DEFAULT PRIVILEGES no son opcionales: sin ellos el revoke se degrada solo, porque cubre lo que existía ese día y no lo que se cree después. CONSECUENCIA A TENER PRESENTE: cualquier funcionalidad futura que necesite leer algo sin sesión (una pantalla pública, un healthcheck) va a fallar con permission denied, y el motivo no va a ser obvio.
- **Todas las vistas llevan `security_invoker=true`** para que respeten el RLS de quien consulta y no el del dueño de la vista. Verificado: las 8 vistas del proyecto lo tienen, con UNA excepción deliberada. REGLA: toda vista nueva se crea con `security_invoker=true`. Sin eso, una vista sobre una tabla con RLS es un agujero: corre como su dueño.
  - EXCEPCIÓN JUSTIFICADA — `v_empleados_publico` NO lo tiene, y es a propósito. Si respetara el RLS de `empleados`, un usuario común solo se vería a sí mismo y los selectores de empleados de Gastos y Caja le quedarían vacíos — que es exactamente el problema que esa vista vino a resolver. Es segura por dos motivos: sus columnas son solo `id`, `nombre`, `unidad_negocio_id`, `tipo`, `activo`, `rol_app`, `caja_raiz` (NADA de CUIL, teléfono, domicilio, fecha de nacimiento ni email); y el `REVOKE` a `anon` también le aplicó, así que no es legible sin sesión. Si alguna vez se le agrega una columna, revisar esta lista antes: es la única vista del proyecto donde una columna nueva se expone salteando el RLS.
- **`mi_rol_app()` está HUÉRFANA.** Se creó para resolver el chequeo por afuera de las policies y evitar la recursión (ver Aprendizajes clave), pero tras la migración de la policy de `empleados` a `tiene_tarea_alcance()` no le quedó ningún uso: verificado contra `pg_policies` (cero usos), `pg_proc` (ninguna función la invoca) y el repo completo (el frontend tampoco). Pendiente de `DROP` en la limpieza final. **NO usarla en código nuevo** — para policies nuevas, usar `tiene_tarea()` / `tiene_tarea_alcance()` / `tiene_tarea_explicita()`.
- CORS de las Edge Functions usa `Access-Control-Allow-Origin: '*'` (default del scaffolding de Supabase) — no es una puerta abierta real porque cada función valida el token de sesión igual, pero si se quiere cerrar del todo, cambiar a `https://cucuruchosnuss-gastos.github.io` en las 5 funciones (`ocr-comprobante`, `ocr-materia-prima`, `crear-solicitud-acceso`, `rechazar-solicitud-acceso`, `quitar-mfa-empleado`).

## Aprendizajes clave (bugs recurrentes ya resueltos — no repetirlos)
- **`hidden` de HTML puede quedar pisado por una regla CSS con más especificidad** (ej. `#vista-lista { display: flex }` sin `:not([hidden])`) — pasó una vez, causó que dos pantallas se vieran superpuestas. Auditar todo el archivo por el mismo patrón, no parchear un solo caso.
- **Formato de número argentino (punto de miles, coma decimal) vs. el formato con punto decimal que usa `toFixed()`/JS nativo** — mismo bug apareció dos veces en dos lugares distintos del código (un valor formateado se re-parseaba mal, terminaba en `NaN`/`null`). Regla: el número canónico vive como valor JS plano, se formatea solo para mostrar, nunca se re-parsea un string ya formateado como si fuera la fuente de verdad.
- **Nombres de columnas/parámetros de un RPC: nunca adivinar variantes.** Cuando no se tiene el cuerpo real de la función a mano, preguntar o verificar antes de escribir código defensivo con múltiples nombres posibles — cuesta más tiempo debuggear después que preguntar antes.
- **`CREATE OR REPLACE FUNCTION` con firma distinta NO reemplaza — crea una sobrecarga duplicada** que rompe las llamadas por ambigüedad (costó un bug de producción). Si cambia la firma: `DROP FUNCTION` primero, después `CREATE`.
- **Toda FK nueva hacia `empleados` desde una tabla que ya tiene otra FK a empleados rompe los embeds de PostgREST por ambigüedad** — `gastos.anulado_por` se dejó SIN FK a propósito por esto.
- **Una FK hacia `auth.users` SIN cláusula `ON DELETE` rompe cualquier borrado de usuario.** Sin `ON DELETE`, Postgres usa `NO ACTION`: mientras alguna fila referencie al usuario, `auth.admin.deleteUser()` falla con `SQLSTATE 23503 (violates foreign key constraint)`. Caso real: `rechazar-solicitud-acceso` marcaba la solicitud como 'rechazada' dejando `usuario_id` apuntando a la cuenta, y acto seguido intentaba borrar esa misma cuenta. **Falló el 100% de las veces desde que existe** — nunca borró un solo usuario, y la consecuencia era exactamente lo que esa función vino a evitar: la persona no podía volver a registrarse con su email. Era invisible porque la función atrapaba el error y devolvía HTTP 200 con `cuentaAuthNoEliminada: true` en el body, así que el status no delataba nada. Se arregló por dos lados a la vez: la FK pasó a `ON DELETE SET NULL`, y la función además pone `usuario_id: null` en el mismo UPDATE que marca el estado. REGLA: toda FK nueva hacia `auth.users` lleva `ON DELETE SET NULL` o `ON DELETE CASCADE` explícito. Nunca se deja el default.
- **Una política RLS sobre una tabla NO puede consultar esa misma tabla: es recursión, Postgres la rechaza y la tabla queda inaccesible para TODOS.** Caso real: la política original de `empleados` hacía un `EXISTS (SELECT ... FROM empleados ...)` dentro de una política SOBRE `empleados`. Resultado: nadie podía entrar a la app, ni siquiera los super_admin. Y el síntoma no delataba la causa — el dashboard mostraba su cartel genérico "Hubo un problema con tu registro", que es el mismo mensaje del caso "cuenta de Auth sin fila en empleados". REGLA: dentro de una policy RLS nunca consultar directo la tabla que esa policy protege. El chequeo se resuelve por afuera, con una función **SECURITY DEFINER** — `tiene_tarea()`, `tiene_tarea_alcance()`, `tiene_tarea_explicita()`. Lo que corta la recursión es el SECURITY DEFINER (la función corre con los permisos de su dueño y no re-dispara la policy), no una función puntual: cualquier helper nuevo que se escriba para usar dentro de una policy tiene que serlo también.
- **Dos páginas que se redirigen entre sí generan un bucle infinito del que no se sale por la UI.** Caso real: `dashboard.html` manda a `mfa.html` cuando no puede determinar el AAL (falla cerrada), y `mfa.html` mandaba al dashboard cuando la persona no tenía ningún factor verificado. Con las dos reglas juntas, cualquier error al leer el nivel dejaba a TODOS los usuarios rebotando entre las dos pantallas. REGLA: cuando la página A redirige a B bajo la condición X, y B redirige a A bajo la condición Y, verificar que X e Y no puedan ser verdaderas a la vez. Si pueden, uno de los dos lados tiene que cortar con un mensaje y una acción manual en vez de redirigir. Cómo quedó en mfa.html: sin factores → mensaje + botón de cerrar sesión, sin redirección; pero con la sesión ya en aal2 SÍ sigue redirigiendo al dashboard, porque ahí el dashboard la deja pasar y no hay rebote posible. La diferencia es entre "ya estás verificado" y "no hay nada que verificar".
- Verificación de cada commit: bajar el `.patch` real de GitHub y leerlo, nunca confiar en el resumen que da Claude Code de lo que hizo.

## Cómo trabajar

### REGLA DE ORO — Territorio compartido

Cada chat de módulo trabaja EXCLUSIVAMENTE sobre su módulo: su HTML, sus RPCs, sus policies RLS.

Hay territorio COMPARTIDO con un único dueño, **el chat de arquitectura de permisos**. Ningún chat de módulo lo modifica directamente:
- el CHECK constraint `chk_tarea_valida`
- el `CATALOGO_TAREAS` de accesos.html
- la pantalla de Accesos (`modulos/accesos.html`)
- este archivo, `CLAUDE.md`

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
- Cualquier herramienta/conector de Supabase (lectura o escritura) requiere aprobación manual de Facu en el momento — ninguna sesión de Claude ejecuta nada contra la base en vivo por su cuenta, ni siquiera un SELECT informativo.
- SQL de escritura (DDL, RPCs, ALTER, políticas RLS): lo corre Facu a mano en el SQL Editor, con guards `IF NOT EXISTS`/`CREATE OR REPLACE`.
- RPCs: convención `p_` en los parámetros, siempre `SECURITY DEFINER`, siempre re-verifican permisos server-side con `tiene_tarea()`/`tiene_tarea_alcance()`/`tiene_tarea_explicita()` (nunca confiar en que el frontend ya validó; nunca gatear por `rol_app` — ver sección Sistema de permisos)
- Nunca exponer claves secretas en el código ni en commits — los secretos de las Edge Functions se leen con `Deno.env.get(...)`
