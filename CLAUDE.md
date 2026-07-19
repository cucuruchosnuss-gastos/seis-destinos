# Seis Destinos — Guía del proyecto

## Objetivo
Sistema de gestión de fábrica de Grupo Nuss sobre una única base de datos central en Supabase (nuss-central), con datos maestros compartidos y módulos separados. Nombre de la app: Seis Destinos. Las empresas del grupo son: Cucuruchos Nuss (Córdoba), Dolce Pasta (Rosario), Taller (Córdoba), Mengui/Heladitos Orly (Córdoba).

## Arquitectura
- PWA (Progressive Web App): instalable en celular y funciona en navegador de escritorio
- Multi-archivo: un HTML por módulo, CSS compartido (`css/main.css`), sin JS compartido entre módulos — cada archivo duplica localmente sus propios helpers (parseImporte, formatearImporte, colorAvatar, etc.), es el patrón establecido, no crear un JS común
- Sin frameworks: HTML, CSS y JS vanilla
- Backend: Supabase (PostgreSQL administrado, región São Paulo)
- OCR de comprobantes: Edge Function `ocr-comprobante`, llama a la API de Anthropic (modelo claude-sonnet) en tiempo real. Extrae razon_social, cuit, y demás campos del comprobante — ver detalle en el propio archivo de la función antes de asumir qué campos devuelve.
- Hosting: GitHub Pages (repo: https://github.com/cucuruchosnuss-gastos/seis-destinos)

## Base de datos central (nuss-central)
- URL: https://xtorxouhzuizdvawqakb.supabase.co
- Publishable key: sb_publishable_G8GZe2uAvb6VdJ1S4DD8nA_CC7iugYw
- RLS activado en las 20 tablas de `public` (verificado). Ver sección Seguridad más abajo por lo que todavía falta afinar.

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
  - `rol_app`: permiso dentro de la app (`super_admin` / `admin` / `usuario`). No confundir con `rol`.
  - `rol`: puesto de RRHH (viene de Naaloo — Categoría + Subcategoría concatenadas, ej "Fuera de convenio · Categoría I").
  - `tipo`: `naaloo` / `admin` — bucket usado por el selector de empleados de Gastos, no tocar sin revisar ese uso.
  - `origen`: `naaloo` (importado desde Excel) / `app_registro` (creado por auto-registro sin match de CUIL).
  - `caja_raiz` (boolean): marca a la única persona habilitada para registrar ingresos externos a Caja (hoy Pablo Usabarrena) — usado por `registrar_ingreso_externo_caja`.
  - `contacto_emergencia_*`: carga manual únicamente, Naaloo no lo trae.
- `empleado_modulos`: id, empleado_id, modulo, habilitado, otorgado_por, otorgado_en. Pendiente conocido: el dashboard todavía filtra el tile de cada módulo por `rol_app` (soloAdmin), no consulta esta tabla.
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
- Todas con RLS: solo `SELECT` para `admin`/`super_admin`, sin políticas de escritura — toda escritura pasa por las RPCs `SECURITY DEFINER` de abajo.

**Caja**
- `cuentas_caja`: id, empleado_id, nombre, medio, moneda, favorita, activa, created_at
- `caja_movimientos`: id, empleado_id, tipo, monto, moneda, medio_pago, gasto_id, fecha, descripcion, creado_por, created_at, contraparte_empleado_id, cuenta_id
- `caja_solicitudes_movimiento`: id, origen_empleado_id, destino_empleado_id, monto, moneda, medio_pago, fecha, descripcion, estado, creado_por, motivo_rechazo, respondido_por, respondido_en, created_at, cuenta_origen_id, cuenta_destino_id
  - Regla de negocio: transferencias entre personas requieren que al menos una de las dos partes sea `super_admin`.

**Materia Prima** (esquema creado y con RLS, implementación de UI todavía pendiente — no es "planificado" a secas, ya tiene base de datos real)
- `insumos`: id, nombre, unidad_medida, unidad_negocio_id, activo, created_at
- `materia_prima_ingresos`: id, fecha, tipo_doc, numero_doc, razon_social, nombre_fantasia, unidad_negocio_id, foto_url, remito_vinculado_id, empleado_id, created_at
- `materia_prima_items`: id, ingreso_id, insumo_id, cantidad, unidad_medida, created_at

### Vistas
- `v_caja_saldos` (empleado_id, moneda, saldo), `v_caja_saldos_cuenta` (cuenta_id, saldo), `v_caja_saldos_medio` (empleado_id, moneda, medio_pago, saldo)
- `v_saldo_proveedor` (proveedor_id, unidad_negocio_id, moneda, deuda_pendiente, credito_disponible) — hace `FULL OUTER JOIN` entre facturas pendientes y créditos disponibles, para que un proveedor con solo crédito (sin deuda) también aparezca.
- `v_cuenta_corriente_movimientos` (proveedor_id, unidad_negocio_id, moneda, fecha, tipo, monto, factura_pendiente_id, gasto_id, credito_id, referencia, saldo_acumulado) — `saldo_acumulado` es un `SUM() OVER (PARTITION BY ... ORDER BY fecha)`, saldo corrido cronológico, no depende de qué filtro de fecha esté aplicado en pantalla.
- `v_stock_insumos` (insumo_id, insumo_nombre, unidad_medida, unidad_negocio_id, cantidad_total)

### RPCs (verificadas contra information_schema — 32 en total, todas SECURITY DEFINER, re-verifican rol_app server-side salvo que se indique lo contrario)

**Accesos / Registro**: `aprobar_solicitud_acceso`, `rechazar_solicitud_acceso`, `actualizar_permisos_empleado`, `obtener_mi_solicitud_acceso`, `buscar_empleado_por_cuil`

**Empleados**: `completar_datos_empleado`, `importar_empleados_naaloo` (regla: `unidad_negocio_id` se asigna solo en el alta/INSERT, nunca se pisa en una reimportación — para no revertir correcciones manuales, ej. Taller viene agrupado con Cucuruchos Nuss en el Excel de Naaloo), `actualizar_contacto_emergencia`

**Gastos / Facturas pendientes**: `pagar_factura_pendiente` (legado — pago atómico de una sola factura completa; sigue existiendo para el botón "Pagar" de facturas legado sin `proveedor_id`, pero el camino nuevo es `registrar_pago_proveedor` desde Cuentas Corrientes), `anular_factura_pendiente` (bloquea si `estado` ya es `'parcial'`/`'pagada'`), `editar_factura_pendiente` (bloquea si `estado` no es `'pendiente'`), `fn_inicializar_saldo_pendiente` (trigger, no se llama directo), `fn_fecha_a_periodo` (helper de formato, ej "jul-26")

**Cuentas Corrientes**: `crear_proveedor_pendiente`, `aprobar_proveedor`, `rechazar_proveedor`, `asignar_proveedor_factura_pendiente` (para facturas legado sin proveedor), `sugerir_facturas_fifo` (devuelve `factura_pendiente_id, fecha_factura, numero_comprobante, saldo_pendiente, monto_a_aplicar` — nombres exactos, no adivinar variantes), `registrar_pago_proveedor` (recibe `p_aplicaciones jsonb` como array de `{factura_pendiente_id, monto_aplicado}` — la clave es literalmente `monto_aplicado`, no `monto`; si la suma aplicada es menor al monto pagado, el resto se registra como crédito automáticamente; la categoría del gasto resultante es la categoría real si todas las facturas del pago comparten la misma, o la categoría genérica "Pago a Cta. Cte. Proveedor" si son mixtas), `aplicar_credito_a_factura` (siempre manual, nunca automático — decisión de diseño explícita)

**Caja**: `crear_cuenta_caja`, `desactivar_cuenta_caja`, `renombrar_cuenta_caja`, `marcar_cuenta_favorita_caja`, `registrar_ingreso_propio_caja`, `registrar_ingreso_externo_caja` (solo para quien tiene `caja_raiz=true`), `registrar_retiro_caja`, `registrar_traspaso_cuenta_caja`, `crear_solicitud_movimiento_caja`, `responder_solicitud_movimiento_caja`, `cancelar_solicitud_movimiento_caja`, `fn_sincronizar_caja_gasto` (trigger — descuenta Caja automáticamente al insertar un `gasto`; con `medio_pago='cheque'` y `cuenta_id=null` no descuenta nada, es comportamiento esperado, no hay circuito de cheques todavía)

## Base vieja (solo lectura, referencia)
- Proyecto: oxcypiztfoxxxhtuqmrd
- NO se modifica nunca. Conectada por MCP en solo lectura.
- Los módulos (gastos, ingresos_mp) NO se migran. Solo se migraron los maestros.

## Login y roles
- Supabase Auth (email + contraseña)
- Auto-registro (`registro.html`): busca CUIL con `buscar_empleado_por_cuil`; si matchea, pre-completa datos; si no, completa a mano. Crea la cuenta de Auth y una fila en `solicitudes_acceso` pendiente — todo vía Edge Function `crear-solicitud-acceso` (service role, atómico con rollback), nunca insert directo desde el cliente.
- Aprobación manual desde `modulos/accesos.html`: admin/super_admin revisa, asigna rol y módulos, aprueba.
- Roles (`empleados.rol_app`): `super_admin` (todo, incluida asignación de `admin`; se asigna solo por SQL directo, nunca desde ninguna UI), `admin` (aprueba accesos, asigna `usuario`), `usuario` (carga)
- `caja_raiz` es un flag aparte de `rol_app` — hoy solo Pablo Usabarrena lo tiene, es quien puede registrar ingresos externos a Caja.
- Tablets de fábrica: cuenta genérica + PIN de turno por encargado (a implementar)

## Módulos

### Existentes
1. **Gastos** (`modulos/gastos.html`): wizard de carga con OCR (incluye CUIT), vínculo a vehículo y/o unidad de negocio, selector de proveedor con matching automático por CUIT/razón social normalizada, envío a "pendiente de pago" (ver Cuentas Corrientes)
2. **Caja** (`modulos/caja.html`): cuentas de efectivo/banco por persona, ingresos/egresos/traspasos/retiros, transferencias entre personas (requieren al menos un `super_admin` en la operación), vista "Retiros socios" y "Todos los movimientos" (solo `super_admin`)
3. **Cuentas Corrientes** (`modulos/cuentas-corrientes.html`, soloAdmin): saldo por proveedor (deuda o crédito, nunca ambos mostrados a la vez — prioridad a la deuda), historial de facturas, registro de pagos con sugerencia FIFO editable, aplicación manual de créditos a favor, aprobación de proveedores nuevos, ver/editar/eliminar una factura (eliminar = `anular_factura_pendiente`, nunca un DELETE real)
4. **Accesos** (`modulos/accesos.html`, soloAdmin): aprobación de solicitudes de registro y gestión de roles/módulos por usuario
5. **Empleados** (`modulos/empleados.html`, soloAdmin): directorio agrupado por unidad de negocio, ficha con datos de Naaloo, importación de Excel de Naaloo

### Planificados
1. **Materia Prima**: esquema de base de datos ya creado (`insumos`, `materia_prima_ingresos`, `materia_prima_items`, con RLS), falta construir la UI del módulo
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
- Rediseño en curso: se está adoptando un lenguaje visual más redondeado/con tarjetas (headers en tarjeta blanca propia, banners con gradiente, chips de color) módulo por módulo, vía mockups de Claude Design revisados antes de implementar. Cuentas Corrientes y Caja ya lo tienen; Gastos/Empleados/Accesos quedan con el estilo anterior hasta que se rediseñen (decisión: Empleados y Accesos NO se van a rediseñar, están bien como están y son los menos usados).

## Seguridad
- RLS activado en las 20 tablas de `public` (verificado).
- Pendiente, sin urgencia (que ningún admin lo olvide): `empleados` y `cuentas_caja` se pueden leer completos (incluido CUIL, teléfono, fecha de nacimiento, domicilio en el caso de `empleados`) por cualquier usuario logueado, no solo por un admin. Requiere crear una vista angosta (`v_empleados_publico` con solo los campos no sensibles) para los selectores que hoy dependen de esto (ej. selector de empleado en el wizard de Gastos) antes de poder cerrar el acceso a la tabla completa.
- CORS de las Edge Functions usa `Access-Control-Allow-Origin: '*'` (default del scaffolding de Supabase) — no es una puerta abierta real porque cada función valida el token de sesión igual, pero si se quiere cerrar del todo, cambiar a `https://cucuruchosnuss-gastos.github.io` en las 3 funciones.

## Aprendizajes clave (bugs recurrentes ya resueltos — no repetirlos)
- **`hidden` de HTML puede quedar pisado por una regla CSS con más especificidad** (ej. `#vista-lista { display: flex }` sin `:not([hidden])`) — pasó una vez, causó que dos pantallas se vieran superpuestas. Auditar todo el archivo por el mismo patrón, no parchear un solo caso.
- **Formato de número argentino (punto de miles, coma decimal) vs. el formato con punto decimal que usa `toFixed()`/JS nativo** — mismo bug apareció dos veces en dos lugares distintos del código (un valor formateado se re-parseaba mal, terminaba en `NaN`/`null`). Regla: el número canónico vive como valor JS plano, se formatea solo para mostrar, nunca se re-parsea un string ya formateado como si fuera la fuente de verdad.
- **Nombres de columnas/parámetros de un RPC: nunca adivinar variantes.** Cuando no se tiene el cuerpo real de la función a mano, preguntar o verificar antes de escribir código defensivo con múltiples nombres posibles — cuesta más tiempo debuggear después que preguntar antes.
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
- RPCs: convención `p_` en los parámetros, siempre `SECURITY DEFINER`, siempre re-verifican `rol_app` server-side (nunca confiar en que el frontend ya validó el rol)
- Nunca exponer claves secretas en el código ni en commits — los secretos de las Edge Functions se leen con `Deno.env.get(...)`
