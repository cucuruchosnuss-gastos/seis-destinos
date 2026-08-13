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
- `proveedores`: id, razon_social, nombre_fantasia, cuit, activo, created_at, estado_alta, creado_por, direccion
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
  - Hoy son NUEVE las tareas con alcance: `empleados:ver_editar`, las tres de `materia_prima` (`cargar`, `ver_todo`, `editar_anular`) y cinco de `stock` (`ver`, `dar_baja`, `enviar_transferencia`, `recibir_transferencia`, `ajustar_inventario`). **El mecanismo es data-driven desde el flag `conAlcance` de cada entrada de `CATALOGO_TAREAS`** (mismo precedente que `requiere` para las dependencias): una tarea nueva con alcance es UNA LÍNEA del catálogo, sin tocar lógica. La constante `CLAVE_VER_EDITAR` ya no existe — se eliminó en el commit `1730511`, que generalizó estado, prefill, validación y payload (el render ya era data-driven).
    - **Marcar `conAlcance` NO alcanza para que el alcance tenga efecto: son dos mitades del mismo sistema.** El catálogo hace que la pantalla dibuje el sub-bloque de unidades y guarde el jsonb; que ese jsonb **haga algo** depende de que las policies y RPCs de ese módulo lo lean con `tiene_tarea_alcance()`. El catálogo no valida esa otra mitad. Caso vivo: la policy de `empleados` ("leer propia o con tarea de alcance") resuelve el acceso con `tiene_tarea_alcance('empleados','ver_editar', unidad_negocio_id)`, así que esa tarea gobierna quién lee la tabla. Al sumar `conAlcance` a una tarea nueva, revisar **también** el lado del servidor: si nadie lo lee, la pantalla va a ofrecer un alcance que no restringe nada.
  - El catálogo válido lo define el CHECK constraint `chk_tarea_valida` (31 tareas — lista completa con labels en la sección Sistema de permisos); en el frontend está hardcodeado en `CATALOGO_TAREAS` dentro de accesos.html (decisión explícita: no se lee de la base). Los dos tienen que mantenerse en sincronía a mano, y **desde `1730511` lo están por primera vez**: las 31 del CHECK son las 31 del catálogo.
  - **Estructura de `CATALOGO_TAREAS`** — por GRUPO: `grupo` (título), `modulos: [...]` (claves de `empleado_modulos`, guión MEDIO, que gobiernan el despliegue condicional — ver Sistema de permisos), `nota` opcional. Por TAREA: `modulo` + `tarea` (guión BAJO en el módulo), `label`, **`descripcion`** (texto largo que se muestra en un globo al tocar el botón `?` al lado del label; las 31 la tienen), y los flags opcionales `conAlcance` y `requiere`. El botón `?` va FUERA del `<label>` a propósito: adentro, tocarlo tildaría la tarea. Y la descripción va como contenido de un `<div>` y no en un `title=""`, porque varias llevan comillas dobles.
  - El campo `modulos` va a mano contra claves que vienen de la tabla `modulos`. `construirListasModulos()` avisa por consola si una no existe — sin eso, cambiar una clave en la base dejaría el grupo invisible para siempre sin ningún error.
- Convención de nombres (ya existente, explícita porque confunde): `modulos.clave` / `empleado_modulos.modulo` / `MODULOS[].clave` de dashboard.html usan GUIÓN MEDIO (`'cuentas-corrientes'`, `'materia-prima'`); `empleado_tareas.modulo` usa GUIÓN BAJO (`'cuentas_corrientes'`). Son namespaces distintos, no mezclar.
  - Caso vivo de la doble convención: la fila de `modulos` es `clave='materia-prima'` (guión MEDIO), nombre visible "Insumos - Materia Prima", orden 6; sus cuatro tareas en `empleado_tareas` usan `modulo='materia_prima'` (guión BAJO). El `CATALOGO_TAREAS` de accesos.html lleva un comentario al respecto en ese grupo.
- `solicitudes_acceso`: id, nombre, apellido, email, cuil, estado, fecha_solicitud, usuario_id, fecha_nacimiento, telefono, tuvo_match

**Gastos**
- `gastos`: id, fecha, periodo, empleado_id, unidad_negocio_id, vehiculo_id, proveedor_id, categoria_id, proyecto_id, tipo_doc, numero_doc, razon_social, importe, moneda, kilometraje, lugar_servicio, foto_url, descripcion, observaciones, estado, created_at, receptor, descripcion_item, medio_pago, fecha_pago, cuenta_id, anulado_por, anulado_en, motivo_anulacion
  - `estado`: `'registrado'` / `'anulado'`. **NO tiene CHECK constraint** — la restricción vive solo en el código, así que un INSERT a mano puede meter cualquier string.
  - `anulado_por` (uuid), `anulado_en` (timestamptz), `motivo_anulacion` (text): los completa `anular_gasto`. `anulado_por` está SIN FK a `empleados` a propósito (ver Aprendizajes: rompería los embeds de PostgREST por ambigüedad).
- `facturas_pendientes`: id, unidad_negocio_id, categoria_id, razon_social, tipo_documento, numero_comprobante, importe, moneda, empleado_id, fecha_factura, lugar, observaciones, comprobante_url, estado, gasto_id, created_at, updated_at, proyecto_id, vehiculo_id, kilometraje, modulo_origen, proveedor_id, saldo_pendiente
  - `estado`: `'pendiente'` / `'parcial'` / `'pagada'` / `'anulada'`. El CHECK constraint de esta columna tuvo que ampliarse a mano para admitir `'parcial'` — si en el futuro se agrega otro estado nuevo, recordar revisar el constraint (`facturas_pendientes_estado_check`), no asumir que Postgres lo acepta solo.
  - `modulo_origen`: `'gastos'` / `'materia_prima'` — para cuándo Materia Prima también inserte acá.
  - `saldo_pendiente`: arranca igual a `importe` (trigger `fn_inicializar_saldo_pendiente`), baja con cada pago aplicado o crédito aplicado. Fuente de verdad real del estado de deuda de esa factura puntual.
  - `gasto_id`: legado del diseño atómico original (una factura = un pago completo). Desde que existe `aplicaciones_pago`, un pago puede repartirse entre varias facturas — este campo ya no es la fuente de verdad para saber qué pago cubrió una factura, usar `aplicaciones_pago` en su lugar.

**Cuentas Corrientes** (proveedores — evolución de facturas_pendientes que soporta pagos parciales/mixtos)
- `aplicaciones_pago`: id, gasto_id, factura_pendiente_id, monto_aplicado, created_at — un pago (una fila de `gastos`) puede repartirse entre varias facturas.
- `creditos_proveedor`: id, proveedor_id, unidad_negocio_id, moneda, monto_original, monto_disponible, origen_gasto_id, estado (`'disponible'`/`'agotado'`), created_at — saldo a favor por sobrepago.
- `aplicaciones_credito`: id, credito_id, factura_pendiente_id, monto_aplicado, created_at — un crédito puede aplicarse a más de una factura futura.
- `intereses_factura`: id, factura_pendiente_id, monto, moneda, fecha, tasa_pct, tasa_periodo, dias_transcurridos, observaciones, creado_por, created_at, base_calculo — intereses por mora sobre una factura pendiente. RLS: solo SELECT, con la validación `rol_app IN ('admin','super_admin')` — ver la nota de permisos en las RPCs de Cuentas Corrientes.
  - `base_calculo`: `'importe'` / `'saldo_pendiente'` — sobre qué monto se calculó. Lo elige la persona al cargarlo.
  - `tasa_pct` / `tasa_periodo` / `dias_transcurridos` quedan en null cuando el interés se cargó como monto exacto en vez de calculado por tasa.
  - Interés SIMPLE, nunca compuesto. LIMITACIÓN CONOCIDA: cargar interés dos veces sobre la misma factura hace que la segunda base incluya el primer interés (porque `agregar_interes_factura` suma el interés a `importe` y a `saldo_pendiente`).
- Todas con RLS, sin políticas de escritura — toda escritura pasa por las RPCs `SECURITY DEFINER` de abajo. (La descripción vieja "SELECT solo para admin/super_admin" es pre-migración de permisos; hoy los gates van por tareas — re-verificar el detalle de las policies en la próxima auditoría.)

**Caja**
- `cuentas_caja`: id, empleado_id, nombre, medio, moneda, favorita, activa, created_at, unidad_negocio_id, cbu, numero_cuenta, alias
  - `unidad_negocio_id` (uuid, nullable, FK a `unidades_negocio`): agregada en la sesión de Cuenta de Empresa.
  - `cbu` / `numero_cuenta` / `alias` (text): datos bancarios públicos, editables vía `editar_datos_publicos_cuenta_caja`.
- `caja_movimientos`: id, empleado_id, tipo, monto, moneda, medio_pago, gasto_id, fecha, descripcion, creado_por, created_at, contraparte_empleado_id, cuenta_id
  - `tipo`: a los 7 valores que ya existían se sumó `'ingreso_reversion_gasto'` — lo inserta `anular_gasto` para devolver a Caja la plata de un gasto anulado.
- `caja_solicitudes_movimiento`: id, origen_empleado_id, destino_empleado_id, monto, moneda, medio_pago, fecha, descripcion, estado, creado_por, motivo_rechazo, respondido_por, respondido_en, created_at, cuenta_origen_id, cuenta_destino_id
  - Regla de negocio: transferencias entre personas requieren que al menos una de las dos partes sea `super_admin`. EXCEPCIÓN: las que involucran a la Cuenta de Empresa no exigen super_admin de contraparte, y cualquier super_admin puede aceptarlas en su nombre (auto-aceptación permitida) — ver sección Sistema de permisos.

**Materia Prima / Insumos** (esquema completo con RLS. El módulo de INGRESO tiene el listado y el **wizard de carga completo** — ver el detalle funcional en la sección Módulos. El stock y la administración del catálogo se mudan a un módulo aparte, todavía no construido.)
- `insumos`: id, nombre, marca, unidad_medida, tipo, activo, estado_alta, created_at. CATÁLOGO ÚNICO COMPARTIDO por las 4 unidades de negocio — NO tiene unidad_negocio_id (se eliminó a propósito).
  - `tipo`: `'materia_prima'` (exige lote) | `'insumo'` (no lleva lote). Materia prima es lo que entra a la receta (harina, azúcar, colorante, grasa, lecitina, fécula, cacao, esencias, bicarbonato); insumo es lo auxiliar (cajas, bolsas, limpieza, repuestos).
  - `estado_alta`: `'activo'` | `'pendiente_revision'`. Los productos creados al vuelo durante una carga entran como `'pendiente_revision'`.
    - **La policy de INSERT acepta CUALQUIER `tipo` mientras `estado_alta` sea `'pendiente_revision'`.** (Una versión anterior de este documento decía que forzaba `tipo='materia_prima'` — ya no es así.) El control real no es imponer el tipo, sino que **todo producto creado al vuelo quede marcado para revisar**: quien carga elige si es materia prima o insumo en la tarjeta del ítem, y alguien lo confirma después. Forzar el tipo obligaba a marcar "lote ilegible" en cosas que no llevan lote, como una caja de cartón.
  - Índice único: `(lower(nombre), lower(coalesce(marca,'')))`.
  - Los insumos NO se borran nunca (romperían la trazabilidad histórica): se desactivan con `activo=false`.
- `materia_prima_ingresos`: id, fecha, tipo_doc, numero_doc, razon_social, nombre_fantasia, proveedor_id, unidad_negocio_id, foto_url, remito_vinculado_id, empleado_id, editado_por, editado_en, created_at.
  - `tipo_doc`: `'remito'` | `'factura_a'` | `'factura_x'` | `'sin_comprobante'`
  - `remito_vinculado_id`: autorreferencia. Cuando una factura corresponde a un remito ya cargado, apunta a ese remito y NO vuelve a sumar stock (evita duplicar cantidades cuando llegan los dos documentos por la misma mercadería).
  - `proveedor_id` (uuid, nullable, FK a `proveedores`): vínculo con el catálogo de proveedores. **`razon_social` se sigue guardando además**, como texto histórico de lo que decía el comprobante — puede no coincidir exactamente con el nombre del proveedor en la tabla, y esa diferencia es dato, no ruido.
  - `editado_por` (uuid) y `editado_en` (timestamptz): auditoría de edición, las completa el trigger `trg_marcar_edicion_ingreso`. **`editado_por` va SIN FK a `empleados` a propósito**: la tabla ya tiene `empleado_id` con FK y una segunda rompería los embeds de PostgREST por ambigüedad (mismo criterio que `gastos.anulado_por`). El nombre se resuelve contra `v_empleados_publico`, NUNCA con un embed.
- `materia_prima_items`: id, ingreso_id, insumo_id, cantidad, lote, lote_ilegible, ficha_tecnica_url, foto_lote_url, cantidad_bultos, contenido_por_bulto, created_at. NO tiene unidad_medida (se eliminó: la unidad vive solo en el catálogo, para no sumar kg con bolsas).
  - `cantidad` siempre está en la unidad base del catálogo.
  - `cantidad_bultos` / `contenido_por_bulto`: presentación opcional ("200 bolsas × 25 kg"). CHECK `chk_presentacion_coherente`: si están cargados, `cantidad` debe ser igual a `cantidad_bultos * contenido_por_bulto`.
  - `lote`: se tipea SIEMPRE a mano, nunca sale del OCR (los lotes no vienen en el remito, están en la etiqueta del envase).
  - `lote_ilegible`: para etiquetas rotas o borrosas. CHECK `chk_lote_ilegible_sin_lote`: no puede estar en true y tener lote a la vez.
  - `ficha_tecnica_url` y `foto_lote_url` son adjuntos SEPARADOS y opcionales.
- Trigger `trg_validar_item_materia_prima` → `fn_validar_item_materia_prima()` (SECURITY DEFINER): si el insumo es `tipo='materia_prima'`, exige lote cargado o `lote_ilegible=true`. Se valida solo al insertar/actualizar el ítem: si después alguien cambia el tipo de un insumo del catálogo, los ítems viejos no se re-validan.
- Trigger `trg_marcar_edicion_ingreso` → `fn_marcar_edicion_ingreso()`: BEFORE UPDATE sobre `materia_prima_ingresos`, completa `editado_por` y `editado_en`. No lo escribe el frontend.
- **Visibilidad de los ingresos (cambió — la versión anterior de este documento decía que se veía todo lo de la unidad):** con `materia_prima:cargar` la persona ve SOLO los ingresos que cargó ella; con `materia_prima:ver_todo` ve los de todas las personas, en las unidades de su alcance.
- Funciones propias del módulo:
  - `mi_empleado_id()` — SECURITY DEFINER. Devuelve el `empleado_id` del usuario actual sin chocar con el RLS de `empleados`, que solo deja leer la fila propia. La usan las policies del módulo.
  - `remitos_vinculables(p_unidad_negocio_id)` — SECURITY DEFINER. Devuelve los 3 últimos remitos SIN vincular de esa unidad, con sus ítems en un `jsonb` (`[{nombre, marca, cantidad, unidad}]`), a quien tenga `materia_prima:cargar` ahí. **Existe porque el listado muestra solo lo propio pero el vínculo remito↔factura necesita ver los remitos de los compañeros**: el de depósito carga el remito y el de administración la factura. Devuelve a propósito filas que la persona NO ve en el listado general — por eso su **uso está acotado al paso del vínculo del wizard y no debe usarse para nada más**. Todo el filtrado (que sean remitos, de esa unidad, sin vincular, el orden y el tope de 3) vive del lado del servidor: el frontend no lo replica.
- Vistas (ambas con `security_invoker=true`):
  - `v_stock_insumos` (insumo_id, insumo_nombre, marca, unidad_medida, unidad_negocio_id, cantidad_total) — excluye ingresos con `remito_vinculado_id` no nulo para no duplicar.
  - `v_stock_insumos_presentacion` — lo mismo + contenido_por_bulto, bultos.
- Decisión de diseño explícita: el módulo de Materia Prima NO captura precios, importes, IVA ni moneda, y NO toca gastos ni caja. Solo cantidades. Está excluido deliberadamente en esta etapa.
- Pendientes conocidos del módulo:
  - **Fotos huérfanas en Storage**: si alguien reemplaza la foto a mitad del wizard, la anterior ya se subió y queda en el bucket. Limpieza pendiente, no urgente — borrar de Storage es destructivo y se decidió no hacerlo automático.
  - **No existe pantalla de edición de un ingreso**, así que `editado_en` está siempre en null por ahora. La columna y el trigger están listos para cuando se agregue.

### Vistas
- `v_caja_saldos` (empleado_id, moneda, saldo), `v_caja_saldos_cuenta` (cuenta_id, saldo), `v_caja_saldos_medio` (empleado_id, moneda, medio_pago, saldo)
- `v_saldo_proveedor` (proveedor_id, unidad_negocio_id, moneda, deuda_pendiente, credito_disponible) — hace `FULL OUTER JOIN` entre facturas pendientes y créditos disponibles, para que un proveedor con solo crédito (sin deuda) también aparezca.
- `v_cuenta_corriente_movimientos` — 13 columnas, en este orden: proveedor_id, unidad_negocio_id, moneda, fecha, tipo, monto, factura_pendiente_id, gasto_id, credito_id, referencia, saldo_acumulado, monto_informativo, orden_desempate. `saldo_acumulado` es un `SUM() OVER (PARTITION BY ... ORDER BY fecha)`, saldo corrido cronológico, no depende de qué filtro de fecha esté aplicado en pantalla.
  - `tipo`: `'factura'` / `'pago'` / `'credito_aplicado'` / `'interes'`. `'credito_generado'` existió un tiempo y **se eliminó**: un pago ahora es UNA sola fila con el monto total real del gasto, no fragmentado por factura ni con el sobrante aparte.
  - `orden_desempate`: para ordenar los movimientos del mismo día. `fecha` es `date` (sin hora), así que sin esta columna el orden entre movimientos de la misma fecha queda arbitrario.
  - Excluye los gastos con `estado = 'anulado'`.
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

Cuentas Corrientes, agregadas después (verificadas contra information_schema el 10/08/2026):
- `crear_proveedor_activo(p_razon_social, p_cuit, p_nombre_fantasia, p_direccion)` — alta manual desde Cuentas Corrientes; el proveedor queda activo directo, sin pasar por aprobación. **Razón social y CUIT OBLIGATORIOS.**
- `importar_proveedores_excel(p_filas jsonb)` — importación masiva. Acá el **CUIT es OPCIONAL** — es una diferencia real con el alta manual, no un descuido. Cada fila corre en su propio bloque de excepción, así que una fila mala no voltea el resto. Devuelve `{creados, errores: [{fila, razon_social, motivo}]}`. **Ese `fila` es el índice 1-based dentro de `p_filas`, NO el número de fila del Excel**: el frontend lo ignora a propósito y ubica la fila real por `razon_social`, porque en cuanto hay filas ignoradas al parsear el offset se corre y el mapeo empieza a apuntar al renglón equivocado en silencio.
- `agregar_interes_factura(p_factura_id, p_monto, p_observaciones, p_base_calculo, p_tasa_pct, p_tasa_periodo, p_dias_transcurridos, p_fecha)` — suma el interés a `importe` Y a `saldo_pendiente` de la factura. Bloquea si la factura no está en `'pendiente'`/`'parcial'`.
- `tiene_cuenta_corriente_activa(p_proveedor_id)` → boolean. Abierta a cualquier usuario autenticado: no expone montos, solo sí/no.
- `editar_proveedor(p_proveedor_id, p_razon_social, p_cuit, p_nombre_fantasia, p_direccion)` — edita un proveedor existente, desde el padrón completo. Razón social obligatoria; el **CUIT es OPCIONAL a propósito**, porque hay proveedores importados por Excel sin CUIT que tienen que poder editarse igual. Valida que el CUIT no quede duplicado contra OTRO proveedor. Es la **única RPC de edición** de proveedores: todas las demás son de alta (`crear_proveedor_activo`, `crear_proveedor_pendiente`, `importar_proveedores_excel`) o de aprobación (`aprobar_proveedor`, `rechazar_proveedor`).

Cruce Gastos ↔ Cuentas Corrientes (diseñadas en el chat de Cuentas Corrientes):
- `registrar_pago_directo_proveedor(...)` — para el gasto que se paga en el momento pero igual tiene que quedar asentado en la cuenta corriente. Crea una `facturas_pendientes` ya en `'pagada'` más su fila de `aplicaciones_pago`. **NO toca Caja** (de eso ya se encarga el trigger del gasto). Abierta a cualquier usuario. Valida que el gasto sea propio O que quien llama tenga la tarea `gastos:ver_exportar` — que es la misma que ya habilita cargar un gasto a nombre de otra persona en el wizard: si puede cargar el gasto para otro, puede reflejarlo en cuenta corriente, es la consecuencia directa y no una atribución nueva. La factura espejo se inserta con el `empleado_id` DEL GASTO, no con el de quien llama: la factura espejo no es un registro propio, es el reflejo de un gasto que ya existe. Además, la política RLS de lectura de `facturas_pendientes` es "propia O `cuentas_corrientes:ver_todo`", así que atribuirla a quien la carga dejaría la factura invisible para la persona dueña del gasto.
  - **Este registro YA NO ES OPCIONAL**: se dispara siempre que el gasto tenga `proveedor_id`. El checkbox "Registrar también en la cuenta corriente" se eliminó del wizard de Gastos. Fundamento: un historial de proveedor incompleto es peor que no tenerlo, y dejarlo a criterio de cada persona garantiza que quede incompleto.
- `sincronizar_pago_directo_proveedor(...)` — mantiene ese espejo al día cuando se edita el gasto. Si el gasto nunca se registró en cuenta corriente no hace nada — eso NO es un error, es el caso normal.
- `anular_gasto(p_gasto_id, p_motivo)` — anula un gasto y devuelve la plata a Caja con un movimiento `'ingreso_reversion_gasto'`, solo si el medio de pago fue efectivo o transferencia (con cheque no toca Caja, coherente con que tampoco la descuenta al cargarlo). Revierte el `saldo_pendiente` y el `estado` de cada factura que ese pago había saldado, y marca `'anulado'` cualquier crédito que ese pago hubiera generado. **BLOQUEA la anulación si ese crédito ya fue consumido por otra factura** — deshacerlo implicaría desarmar en cascada movimientos posteriores. Permisos: el dueño del gasto O `tiene_tarea('gastos','editar_anular')`.
  - **La devolución se atribuye al DUEÑO REAL de la cuenta** (`cuentas_caja.empleado_id` de `v_gasto.cuenta_id`), NO a `v_gasto.empleado_id` — mismo criterio que `fn_sincronizar_caja_gasto`. Antes usaba el empleado del gasto y ese era el bug: anular un gasto pagado con una cuenta de Empresa dejaba la plata descontada de Empresa y acreditada a la persona equivocada. `creado_por` guarda quién anuló.
  - Condición exacta para devolver: `medio_pago in ('efectivo','transferencia')` **Y `cuenta_id is not null`**. OJO con la asimetría contra el trigger, que cuando `cuenta_id` es null cae a la cuenta favorita y SÍ genera el egreso — ver el pendiente al final de esta sección.

**Nota de permisos (actualizada — verificado contra `pg_get_functiondef` y `pg_policy` el 12/08/2026):** el pendiente de unificar estas validaciones con tareas granulares **ya está hecho**. Ninguna de `anular_gasto`, `registrar_pago_directo_proveedor`, `agregar_interes_factura` ni el RLS de `intereses_factura` chequea `rol_app`: todas usan `tiene_tarea()`. La policy de `intereses_factura` es `tiene_tarea('cuentas_corrientes','ver_todo') OR tiene_tarea('facturas_pendientes','editar_interes')`. `sincronizar_pago_directo_proveedor` no valida permisos por su cuenta (solo actualiza un espejo que ya existe). **No queda ningún `rol_app IN ('admin', ...)` en estas RPCs** — ese patrón está muerto en todo el proyecto.

**Caja**: `crear_cuenta_caja`, `desactivar_cuenta_caja`, `renombrar_cuenta_caja`, `marcar_cuenta_favorita_caja`, `registrar_ingreso_propio_caja`, `registrar_ingreso_externo_caja` (exige con `tiene_tarea_explicita` —SIN bypass de super_admin— la tarea que corresponda según el DUEÑO de la cuenta elegida: `caja:ingreso_externo_propio` si es de quien llama, `caja:ingreso_externo_empresa` si es de la Cuenta de Empresa. Ya NO usa `caja_raiz` ni la tarea vieja `ingreso_externo`. Params: `p_monto`, `p_cuenta_id`, `p_descripcion` + `p_fecha` opcional), `registrar_retiro_caja` (mismos params que la anterior), `registrar_traspaso_cuenta_caja` (params `p_cuenta_origen_id`, `p_cuenta_destino_id`, `p_monto_origen`, `p_monto_destino` + `p_fecha` opcional, MÁS `p_empleado_id` opcional para traspasar entre cuentas de OTRA caja —hoy solo Empresa, con `caja:traspaso_empresa`—; si se omite opera sobre quien llama), `crear_solicitud_movimiento_caja` (**DEVUELVE TEXT** con el estado resultante: `'aceptada'` si el movimiento se aplicó atómicamente, `'pendiente'` si quedó como solicitud a confirmar. Quien decide es el servidor —se auto-acepta cuando la crea un super_admin y hay Empresa de por medio—; el frontend solo informa y refresca según ese valor, nunca lo asume. Antes devolvía el uuid, que nadie usaba. Acepta además `p_empleado_propio_id` opcional, para que "mi lado" del movimiento sea Empresa y no quien llama), `responder_solicitud_movimiento_caja`, `cancelar_solicitud_movimiento_caja`, `fn_sincronizar_caja_gasto` (trigger — descuenta Caja automáticamente al insertar un `gasto`; con `medio_pago='cheque'` y `cuenta_id=null` no descuenta nada, es comportamiento esperado, no hay circuito de cheques todavía)

**`fn_sincronizar_caja_gasto` en detalle** (verificado contra `pg_get_functiondef` el 12/08/2026) — es el trigger que sostiene toda la Cuenta de Empresa, así que conviene tenerlo escrito:
- **El movimiento espejo se atribuye al DUEÑO REAL de la cuenta elegida**, no a quien cargó el gasto: `select empleado_id into v_dueno_cuenta from cuentas_caja where id = v_cuenta_id` y después `empleado_id = coalesce(v_dueno_cuenta, new.empleado_id)`. Es lo que hace que un gasto contra una cuenta de Empresa descuente de **Empresa** y no de la caja personal de quien lo carga. **Antes usaba `new.empleado_id` y ese era el bug.** `creado_por` sí guarda quién lo cargó (`new.empleado_id`), para auditoría — o sea que las dos cosas quedan registradas, en columnas distintas.
  - CONSECUENCIA PARA EL FRONTEND: `gastos.empleado_id` define a quién se ATRIBUYE el gasto, y NO de qué caja sale la plata. No asumir que son lo mismo (ver la nota del selector de cuenta en el módulo Cuentas Corrientes).
- **Guarda de `estado='anulado'`**: si el gasto YA estaba anulado y se edita (`old.estado = 'anulado' and new.estado = 'anulado'`), el trigger corta al principio y no toca nada. Sin esa guarda, editar un gasto ya anulado borraba la devolución que insertó `anular_gasto` y volvía a descontar la plata.
  - **La transición a anulado SÍ pasa a propósito** (`old <> 'anulado'`, `new = 'anulado'`): ahí el trigger tiene que regenerar el egreso, porque `anular_gasto` inserta después la devolución que lo compensa. La sutileza es que la guarda distingue "ya estaba anulado" de "se está anulando ahora" — no es un simple `if new.estado = 'anulado' then return`.
- Cuando `cuenta_id` viene null y el medio es efectivo/transferencia, resuelve la cuenta **favorita** del empleado del gasto y genera el egreso igual.

**Nota de diseño — asimetría entre el trigger y `anular_gasto` con `cuenta_id` null:** el trigger, cuando `cuenta_id` es null, cae a la cuenta favorita y **sí** descuenta; pero `anular_gasto` exige `cuenta_id is not null` para insertar la devolución. Un gasto guardado sin `cuenta_id` explícito quedaría descontado y sin devolver al anularlo.

**Hoy NO afecta a nadie**: verificado contra la base el 12/08/2026, no hay ningún gasto de efectivo/transferencia sin anular con `cuenta_id` en null. Es un chequeo de datos de ese día, no una garantía estructural — no hay constraint que lo impida.

**Si alguna vez se permite guardar un gasto de efectivo/transferencia sin `cuenta_id`, hay que arreglar `anular_gasto` primero**: que resuelva la cuenta con el mismo fallback a favorita que ya usa el trigger, en vez de saltear la devolución. La regla de fondo es que las dos funciones tienen que resolver la cuenta IGUAL — si una usa fallback y la otra no, la plata sale por un camino y no vuelve por el otro.

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

Los permisos finos son TAREAS granulares en la tabla `empleado_tareas` (empleado_id + modulo + tarea + habilitado + alcance jsonb). El catálogo válido lo define el CHECK constraint `chk_tarea_valida` — 31 tareas hoy, listadas abajo. Las tareas son independientes entre sí y no hay jerarquías, **con UNA excepción forzada por servidor y UI: `cuentas_corrientes:ver_todo` requiere `gastos:ver_exportar`** (ver "Regla de otorgamiento" más abajo).

**Vínculo tarea ↔ módulo en la UI (decisión de Facu del 13/08/2026, que REVIERTE la anterior de "las tareas son independientes de los toggles de módulos"):** cada grupo de `CATALOGO_TAREAS` declara un campo **`modulos: [...]`** con claves de `empleado_modulos` (guión MEDIO), y el modal solo muestra sus tareas si **ALGUNO** de esos módulos está tildado — semántica "any", porque `facturas_pendientes:editar_interes` se opera desde Gastos o desde Cuentas Corrientes y con uno solo ya es útil. Es data-driven, mismo precedente que `conAlcance` y `requiere`.
- **El servidor sigue permisivo a propósito: NO valida el vínculo tarea-módulo.** Si lo validara rompería el passthrough de claves fuera de catálogo y los otorgamientos por SQL directo — justo los casos que la pantalla no sabe dibujar y no tiene que revocar.
- **Memoria de sesión al destildar:** las tareas de los grupos que se ocultan **por ese evento** salen del Set activo y quedan guardadas en `estado.modal.tareasRecordadas`; al volver a tildar el módulo se restauran, con su alcance intacto (`alcances` no se toca nunca). La restauración es silenciosa a propósito: el grupo reaparece en pantalla con sus checkboxes tildados, así que un aviso anunciaría algo que la persona ya está viendo.
- **SEMÁNTICA DE NO-PÉRDIDA — la regla que no hay que romper:** una tarea otorgada por SQL cuyo módulo NO está tildado **se preserva al guardar**. Al abrir el modal no se mueve nada: esas tareas quedan en el Set, ocultas pero vivas, y abrir y guardar sin tocar produce el payload idéntico. **Solo la ACCIÓN de destildar un módulo durante la sesión revoca; no tocar preserva.** Es el mismo principio del fix `0e70708`.
- Las tres invariantes están escritas en `moverTareasPorCambioDeModulos()` dentro de accesos.html, que es la única función que mueve tareas — y se llama SOLO desde el handler del toggle, nunca al abrir ni desde un render.

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
  - **CONSTANCIA DEJADA A PEDIDO EXPLÍCITO (traspaso de Stock, 13/08/2026):** un ajuste positivo **crea stock de la nada**. Es el análogo exacto de las tareas de Caja-Empresa —donde meter plata "de la nada" motivó elegir `tiene_tarea_explicita` SIN bypass— y es además el mecanismo por el que se puede **tapar un faltante**. Acá se implementó **CON bypass de super_admin**, por decisión explícita de Facu tomada conociendo esa tensión. Si algún día aparece un descuadre raro de stock, este es el primer lugar a revisar.
- `materia_prima:editar_anular` — Corregir o anular ingresos ya cargados (CON ALCANCE por unidad)

PASSTHROUGH del modal de Accesos (sigue vigente, y desde `0e70708` es completo): el modal precarga TODAS las filas de `empleado_tareas` de la persona y el payload reenvía el Set completo, así que **una tarea otorgada por SQL que todavía no está en el catálogo conserva el permiso Y SU ALCANCE** al guardar, aunque la pantalla no sepa dibujarla. Hasta `0e70708` preservaba el permiso pero pisaba el alcance con null en cada guardado — una revocación parcial silenciosa (ver el aprendizaje sobre passthroughs a medias). **NO agregar un filtro del payload contra el catálogo**: revocaría en silencio esas tareas cada vez que se editen los permisos de esa persona. Es la red de seguridad para toda tarea que entre al CHECK antes que a `CATALOGO_TAREAS` — situación que ya ocurrió con las 4 de `materia_prima`.

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

Formato del CHECK `chk_tarea_valida`: hoy valida con `(modulo || ':' || tarea) = any(array[...])` — ya NO es la cadena de OR anidados de la versión original. Para cambiarlo hay que hacer DROP + ADD con el array completo de las 31 (no se puede alterar in-place) — leyendo antes el constraint real, nunca regenerándolo de memoria (ver la regla del territorio compartido en "Cómo trabajar").

**Migración `materia_prima:gestionar_catalogo` → `stock:gestionar_catalogo` (12-13/08/2026).** La pantalla del catálogo de insumos se mudó al módulo Stock, así que la tarea se mudó con ella. La clave vieja YA NO EXISTE en el CHECK ni en `CATALOGO_TAREAS`.

**Lección de orden de ejecución, que es lo que hay que recordar de esto:** al migrar una clave del CHECK, el `UPDATE` de las filas existentes de `empleado_tareas` va **ENTRE el DROP y el ADD**. El `ADD` valida las filas que ya están en la tabla contra el array nuevo, así que si el UPDATE va después, el ADD falla por las filas con la clave vieja; y si va antes del DROP, falla contra el constraint viejo, que todavía no conoce la clave nueva. El orden correcto es DROP → UPDATE → ADD.

(Si alguna fila con la clave vieja sobreviviera igual, el modal de Accesos la deja pasar por el passthrough sin romperse — pero no cuenta como plan, es la red.)

Para módulos NUEVOS: definir sus tareas con Facu, agregarlas al CHECK constraint `chk_tarea_valida` (DROP + ADD con el array completo), al catálogo hardcodeado `CATALOGO_TAREAS` de accesos.html —con su `descripcion`, el `modulos` del grupo, y `conAlcance: true` si la tarea se acota por unidad—, y gatear RPCs/RLS con `tiene_tarea()` / `tiene_tarea_alcance()` — o con `tiene_tarea_explicita()` si la operación no debe heredarse por rol — nunca con `rol_app`.

PENDIENTE de Materia Prima: las 4 tareas ya se pueden otorgar desde Accesos, pero **el frontend del módulo todavía NO las chequea** — `modulos/materia-prima.html` solo verifica que exista la fila de `empleados`, sin `tieneTarea()`. Las barreras server-side (RLS y RPCs) sí están, así que no hay agujero real: lo que falta es ocultar lo que la persona no puede hacer. Queda para el chat de Materia Prima.

## Módulos

### Existentes
1. **Gastos** (`modulos/gastos.html`): wizard de carga con OCR (que extrae CUIT además de razón social), vínculo a vehículo y/o unidad de negocio, envío a "pendiente de pago" (ver Cuentas Corrientes), y anulación de gasto con motivo obligatorio. El selector de proveedor con matching automático (CUIT normalizado, con fallback a razón social) ahora funciona también en el flujo NORMAL y no solo en "pendiente de pago" — antes `armarGasto()` mandaba `proveedor_id` en null siempre.
   - **Buscador de proveedor en el campo "Razón social / Proveedor"** (paso Datos), además del que ya existía en el paso Detalles. Existe porque ahí es donde la gente escribe el nombre del proveedor —el label lo promete— y porque el OCR no siempre puede leerlo: las facturas tipo "X" no traen el nombre impreso. Sin sugerencias ahí, la persona no encontraba al proveedor, asumía que no existía y creaba un duplicado. **No hay umbral mínimo de caracteres**: busca desde la primera letra, contra `razon_social` y `nombre_fantasia`, hasta 8 resultados. La comparación **ignora acentos** (`normalize('NFD')`), porque los comprobantes vienen en mayúsculas sin tildes y el padrón no — "LACTEOS DEL SUR" tiene que encontrar a "Lácteos del Sur". Esa misma normalización se aplica al match automático (`normalizarRazonSocial`).
     - Elegir una sugerencia **pisa el texto** con el nombre del padrón, y el campo queda editable por si el papel decía otra cosa.
     - **Seguir escribiendo NO suelta el vínculo**, a diferencia del buscador de Detalles, donde tipear sí lo suelta. Es deliberado: tener dos campos existe justamente para que el texto del comprobante pueda diferir del nombre registrado, y si tipear borrara la selección eso sería imposible. Para soltarlo está el **indicador "Proveedor: X ✕"**, que además hace visible con qué proveedor quedó vinculado el gasto — incluido cuando lo vinculó el match automático del OCR.
     - El panel de sugerencias **se abre hacia arriba cuando abajo no entra**, medido contra `visualViewport` y NO contra `innerHeight`: en el celular `innerHeight` no se achica al abrirse el teclado, así que un panel tapado seguiría midiendo "entra perfecto". Aplica a los tres buscadores del archivo, que comparten la función de render.
   - **El checkbox "Registrar también en la cuenta corriente" YA NO EXISTE.** Ese registro dejó de ser opcional: se dispara siempre que el gasto tenga `proveedor_id` (ver `registrar_pago_directo_proveedor` en la sección de RPCs). Fundamento: un historial de proveedor incompleto es peor que no tenerlo, y dejarlo a criterio de cada persona —que carga apurada, en el celular, en la fábrica— garantiza que quede incompleto.
   - **Anulación de un gasto**: botón "Anular" en el detalle, con motivo obligatorio, que llama a `anular_gasto()` y devuelve la plata a Caja con un movimiento visible de tipo `'ingreso_reversion_gasto'` (salvo cheques, que tampoco la descuentan al cargarlos).
     - **Anular y Editar NO tienen el mismo gate, y esa diferencia es el punto.** Editar exige `gastos:editar_anular`; anular lo permite **el dueño del gasto O** quien tenga esa tarea. Así, alguien puede corregir un error propio sin que haya que darle permiso de edición libre sobre los gastos de todos — la anulación con motivo obligatorio deja rastro, la edición no.
     - Los gastos anulados **quedan visibles en la lista**, no se ocultan: atenuados, con el importe tachado y badge "Anulado". El detalle muestra motivo, quién anuló y cuándo. **No cuentan en el total de "Gastos de hoy/mes"** —la plata se devolvió— **pero sí en el contador de "Registros"**, porque el registro existe igual.
2. **Caja** (`modulos/caja.html`): cuentas de efectivo/banco por persona, ingresos/egresos/traspasos/retiros, transferencias entre personas (requieren al menos un `super_admin` en la operación — ver excepción de la Cuenta de Empresa en la sección Sistema de permisos), vista "Retiros socios" (gateada por la tarea `caja:retiros_todos`) y "Todos los movimientos" (gateada por `caja:movimientos_todos`)
3. **Cuentas Corrientes** (`modulos/cuentas-corrientes.html`): saldo por proveedor (deuda o crédito, nunca ambos mostrados a la vez — prioridad a la deuda), historial de facturas, registro de pagos con sugerencia FIFO editable, aplicación manual de créditos a favor, aprobación de proveedores nuevos, ver/editar/eliminar una factura (eliminar = `anular_factura_pendiente`, nunca un DELETE real). Además: intereses por mora (monto exacto o calculado por tasa mensual/anual), desglose de cada pago (a qué facturas se aplicó y qué pasó con el sobrante hasta hoy), badge de estado por factura (Pendiente/Parcial/Pagada) en las dos pantallas, filtros y orden en Movimientos, alta manual de proveedor e importación masiva por Excel.
   - **Tiene 3 vistas, no 2** (drill-down por `hidden`, no pestañas):
     - **Pestaña "Proveedores"** — la lista de TRABAJO: solo los que tienen saldo distinto de cero, deuda o crédito. Es a propósito: responde "a quién le debo o quién me debe", no es el padrón.
     - **Padrón completo** (botón "Ver todos los proveedores") — TODOS los proveedores activos y aprobados (`activo=true` Y `estado_alta='activo'`), incluidos los que están en $0 y los que nunca tuvieron un movimiento. Los **pendientes de aprobación NO aparecen acá**: se ven en la pestaña "Pendientes de aceptación", que es donde se aprueban. Muestra razón social, CUIT, dirección y el saldo **neto por moneda, agregado entre todas las unidades de negocio** (la ficha sigue mostrando el detalle por unidad). El buscador compara el CUIT **por dígitos de los dos lados**, así "30-123…" encuentra al guardado como "30123…". Desde acá se edita cada proveedor (`editar_proveedor`) y se entra a su ficha.
     - **Ficha de un proveedor** — la cuenta corriente se lleva SEPARADA por unidad de negocio (decisión de negocio, no técnica: la plata de un pago sale de una empresa concreta, y consolidar haría que una empresa termine pagando deuda de otra). Pero la ficha se puede MIRAR consolidada: se entra siempre en "Todas las unidades" (ya no se pregunta al entrar) y hay un filtro de unidad adentro.
       - En modo **"Todas las unidades"**: el banner muestra el saldo desglosado por unidad (con el nombre de la empresa más destacado que la moneda), cada movimiento muestra a qué unidad pertenece, y se **OCULTA la línea de saldo corrido por fila** — `saldo_acumulado` viene de la vista particionado por proveedor + unidad + moneda, así que con las unidades mezcladas cada fila trae el saldo de SU unidad y verlas intercaladas daría una secuencia que no cierra. "Registrar pago" y "Aplicar crédito" quedan **DESHABILITADOS (no escondidos)** con el motivo escrito al lado, más un `return` temprano en sus funciones como guarda de fondo: `unidadId` viaja hasta el `p_unidad_negocio_id` de las RPCs, y un pago con unidad nula sería plata mal atribuida.
       - Con **una unidad elegida**: todo habilitado, saldo corrido visible, igual que siempre.
       - Si el proveedor no tiene ningún movimiento, la ficha **no se abre** y avisa. El deep link `?proveedor=X` sin `&unidad=` abre en "Todas".
   - Gates de permiso de estas pantallas: "Ver todos los proveedores" con `cuentas_corrientes:ver_todo` (muestra saldos de toda la empresa); editar un proveedor con `cuentas_corrientes:alta_proveedor`, la misma tarea que crear uno.
   - **De qué cuenta sale la plata** — el selector del modal "Registrar pago" muestra dos grupos: "Mis cuentas" (las de quien está registrando el pago, siempre) y "Cuenta de Empresa" (las 9 cuentas del empleado ficticio con `tipo='empresa'`), este último SOLO si tiene la tarea `gastos:gastos_empresa`. Antes estaba hardcodeado a las cuentas de Pablo, que era la regla cuando había una sola caja general; con la Cuenta de Empresa eso quedó viejo y provocaba que, por ejemplo, al elegir "Transferencia" no apareciera ninguna cuenta (Pablo solo tiene una de efectivo). El id de Empresa NO se hardcodea: sale de `v_empleados_publico` filtrando por `tipo='empresa'` — tiene que ser esa vista y no `empleados`, porque el RLS de `empleados` no deja a un usuario común leer esa fila y el grupo no aparecería nunca. Cuando ningún grupo tiene cuentas para el medio de pago y la moneda elegidos, se muestra un aviso explicando por qué, en vez de un selector vacío y mudo.
     - El `p_empleado_id` que va a la RPC es el del usuario que registra el pago (antes iba Pablo fijo, así que todos los pagos quedaban a su nombre sin importar quién los hacía). **Ojo: eso define solo a quién se ATRIBUYE el gasto** — de qué caja sale la plata lo decide el trigger `fn_sincronizar_caja_gasto`, que descuenta al DUEÑO DE LA CUENTA elegida, no a `gastos.empleado_id`.
4. **Accesos** (`modulos/accesos.html`, soloSuperAdmin): aprobación de solicitudes de registro y gestión de módulos + tareas granulares por usuario
5. **Empleados** (`modulos/empleados.html`): directorio agrupado por unidad de negocio, ficha con datos de Naaloo, importación de Excel de Naaloo
6. **Ingreso — Insumos / Materia Prima** (`modulos/materia-prima.html`, tile "Ingreso", clave `materia-prima`): listado de ingresos con detalle en modal, y **wizard de carga completo**. El catálogo y el stock se mudan a un módulo aparte todavía no construido — este módulo no los muestra. Sin precios ni importes por decisión de diseño (ver sección de tablas).
   - **Wizard, 4 pasos**: comprobante (foto → OCR vía `ocr-materia-prima`, o "sin comprobante") → encabezado → vínculo con remito, solo si es factura → ítems → confirmación. El paso del vínculo **se saltea solo** cuando no hay remitos vinculables, para no preguntar algo que no tiene respuesta posible.
   - **Ítems**: los que devuelve el OCR se matchean contra el catálogo por nombre + marca normalizados (minúsculas, espacios colapsados). Los que no matchean se crean al vuelo con badge NUEVO y selector de tipo, siempre en `pendiente_revision`. El lote se tipea a mano y es obligatorio solo para `tipo='materia_prima'`.
   - **Proveedores**: se matchean por CUIT y, si no, por razón social normalizada — mismo criterio que gastos.html. Si no existe, se crea con `crear_proveedor_pendiente` y queda para aprobar en Cuentas Corrientes. **OJO: NO confundir con `crear_proveedor_activo`**, que es la de cuentas-corrientes.html y da de alta directo. Si el alta falla, el ingreso se guarda igual con `proveedor_id` en null y se avisa: perder la carga de mercadería por no poder dar de alta un proveedor sería peor.
   - **El listado FUSIONA en una sola fila el remito y la factura vinculada a él**: son dos comprobantes de la misma entrega, y la base son los datos del remito (es el que trae los ítems). Los dos chips de tipo van juntos y el modal lista ambos comprobantes, cada uno con su foto. Casos borde cubiertos: la factura queda sola y avisada cuando el RLS oculta su remito, y si más de una factura apuntara al mismo remito aparece un chip de alerta — esa mercadería podría estar facturada dos veces.
   - **Filtro de vínculo** (Todos / Remitos sin factura / Con factura vinculada), en una segunda fila de chips junto a la de unidades. Se resuelve sobre las entregas ya fusionadas, sin consultas nuevas, y se encadena con el filtro de unidad y el buscador.
     - Con **"Remitos sin factura"** activo cada fila muestra la antigüedad, y **el orden se invierte: más viejos primero**. El listado va por defecto de más reciente a más antiguo, que con este filtro dejaría abajo justo lo que interesa.
     - La antigüedad se calcula sobre **`fecha`** (la del documento) y NO sobre `created_at`: lo que hace viejo a un remito sin facturar es cuánto hace que llegó la mercadería, no cuándo alguien lo tipeó. Si se carga hoy un remito del mes pasado, `created_at` diría "hoy" y taparía el caso que este filtro existe para encontrar.
     - Se resalta en ámbar a partir de `DIAS_REMITO_VIEJO = 45`, constante arriba del archivo. **Es un número del negocio**: 45 días es el plazo máximo real en que puede llegar una factura después de la mercadería, así que hasta ahí no hay nada que reclamar y pasado ese plazo sí.
     - **LIMITACIÓN, y es la que importa si se lo usa para controlar:** el filtro trabaja sobre lo que la persona PUEDE VER. Con solo `materia_prima:cargar` ve únicamente sus propios ingresos, así que su lista de remitos sin factura está incompleta y no lo dice. Para usarlo como herramienta de control hace falta `materia_prima:ver_todo`.

7. **Stock** (clave `stock`, nombre visible "Stock", orden 7, sin grupo): fila de `modulos` y las 6 tareas del CHECK **ya existen en la base** (migración del 12-13/08/2026), y el grupo "Stock" ya se puede otorgar desde Accesos. **El frontend del módulo está en construcción, en el chat de Stock** — todavía no hay archivo. Se lleva la administración del catálogo de insumos, que antes vivía como `materia_prima:gestionar_catalogo`.
   - Ojo con los guiones: acá `stock` es igual en los dos namespaces (`modulos.clave` y `empleado_tareas.modulo`), a diferencia de `materia-prima` / `materia_prima`.

### Planificados
1. **Materia Prima — lo que falta**: la pantalla de edición de un ingreso (la columna `editado_en` y su trigger ya existen, esperándola) y el gateo de UI por tareas dentro del módulo. El alta/edición del catálogo de insumos **ya no es de este módulo**: se mudó a Stock.
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
- **`hidden` de HTML puede quedar pisado por una regla CSS con más especificidad** (ej. `#vista-lista { display: flex }` sin `:not([hidden])`) — la primera vez causó que dos pantallas se vieran superpuestas. Es el bug más recurrente del proyecto: volvió a aparecer varias veces desde entonces, y la última con consecuencia de PERMISOS — un botón quedó visible para quien no debía verlo, que es mucho peor que un problema estético. REGLA: todo contenedor con un `display` de autor que además se oculte con `[hidden]` necesita su propia regla `.clase[hidden] { display: none }`. Auditar todo el archivo por el mismo patrón, no parchear un solo caso.
- **Postgres NO permite sacar ni reordenar columnas de una vista con `CREATE OR REPLACE VIEW`, solo agregar al final.** Para sacar una columna (o cambiar el orden) hay que hacer `DROP VIEW` + `CREATE VIEW`. Pasó dos veces con `v_cuenta_corriente_movimientos`.
- **Nunca asumir que un CHECK constraint acepta un valor nuevo: verificarlo con `pg_get_constraintdef` ANTES de escribir el código que lo use.** Pasó con `facturas_pendientes.estado` y con `creditos_proveedor.estado` — en los dos casos el código ya estaba escrito cuando apareció el rechazo del constraint.
- **Formato de número argentino (punto de miles, coma decimal) vs. el formato con punto decimal que usa `toFixed()`/JS nativo** — mismo bug apareció dos veces en dos lugares distintos del código (un valor formateado se re-parseaba mal, terminaba en `NaN`/`null`). Regla: el número canónico vive como valor JS plano, se formatea solo para mostrar, nunca se re-parsea un string ya formateado como si fuera la fuente de verdad.
- **Nombres de columnas/parámetros de un RPC: nunca adivinar variantes.** Cuando no se tiene el cuerpo real de la función a mano, preguntar o verificar antes de escribir código defensivo con múltiples nombres posibles — cuesta más tiempo debuggear después que preguntar antes.
- **`CREATE OR REPLACE FUNCTION` con firma distinta NO reemplaza — crea una sobrecarga duplicada** que rompe las llamadas por ambigüedad (costó un bug de producción). Si cambia la firma: `DROP FUNCTION` primero, después `CREATE`.
- **Toda FK nueva hacia `empleados` desde una tabla que ya tiene otra FK a empleados rompe los embeds de PostgREST por ambigüedad** — `gastos.anulado_por` se dejó SIN FK a propósito por esto.
- **Una FK hacia `auth.users` SIN cláusula `ON DELETE` rompe cualquier borrado de usuario.** Sin `ON DELETE`, Postgres usa `NO ACTION`: mientras alguna fila referencie al usuario, `auth.admin.deleteUser()` falla con `SQLSTATE 23503 (violates foreign key constraint)`. Caso real: `rechazar-solicitud-acceso` marcaba la solicitud como 'rechazada' dejando `usuario_id` apuntando a la cuenta, y acto seguido intentaba borrar esa misma cuenta. **Falló el 100% de las veces desde que existe** — nunca borró un solo usuario, y la consecuencia era exactamente lo que esa función vino a evitar: la persona no podía volver a registrarse con su email. Era invisible porque la función atrapaba el error y devolvía HTTP 200 con `cuentaAuthNoEliminada: true` en el body, así que el status no delataba nada. Se arregló por dos lados a la vez: la FK pasó a `ON DELETE SET NULL`, y la función además pone `usuario_id: null` en el mismo UPDATE que marca el estado. REGLA: toda FK nueva hacia `auth.users` lleva `ON DELETE SET NULL` o `ON DELETE CASCADE` explícito. Nunca se deja el default.
- **Una política RLS sobre una tabla NO puede consultar esa misma tabla: es recursión, Postgres la rechaza y la tabla queda inaccesible para TODOS.** Caso real: la política original de `empleados` hacía un `EXISTS (SELECT ... FROM empleados ...)` dentro de una política SOBRE `empleados`. Resultado: nadie podía entrar a la app, ni siquiera los super_admin. Y el síntoma no delataba la causa — el dashboard mostraba su cartel genérico "Hubo un problema con tu registro", que es el mismo mensaje del caso "cuenta de Auth sin fila en empleados". REGLA: dentro de una policy RLS nunca consultar directo la tabla que esa policy protege. El chequeo se resuelve por afuera, con una función **SECURITY DEFINER** — `tiene_tarea()`, `tiene_tarea_alcance()`, `tiene_tarea_explicita()`. Lo que corta la recursión es el SECURITY DEFINER (la función corre con los permisos de su dueño y no re-dispara la policy), no una función puntual: cualquier helper nuevo que se escriba para usar dentro de una policy tiene que serlo también.
- **Dos páginas que se redirigen entre sí generan un bucle infinito del que no se sale por la UI.** Caso real: `dashboard.html` manda a `mfa.html` cuando no puede determinar el AAL (falla cerrada), y `mfa.html` mandaba al dashboard cuando la persona no tenía ningún factor verificado. Con las dos reglas juntas, cualquier error al leer el nivel dejaba a TODOS los usuarios rebotando entre las dos pantallas. REGLA: cuando la página A redirige a B bajo la condición X, y B redirige a A bajo la condición Y, verificar que X e Y no puedan ser verdaderas a la vez. Si pueden, uno de los dos lados tiene que cortar con un mensaje y una acción manual en vez de redirigir. Cómo quedó en mfa.html: sin factores → mensaje + botón de cerrar sesión, sin redirección; pero con la sesión ya en aal2 SÍ sigue redirigiendo al dashboard, porque ahí el dashboard la deja pasar y no hay rebote posible. La diferencia es entre "ya estás verificado" y "no hay nada que verificar".
- **Una pantalla de detalle que se abre desde más de un lugar necesita saber de dónde vino, o el "‹ Volver" devuelve siempre al mismo lado y se pierde el contexto** (la búsqueda, los filtros de la pantalla anterior). En Cuentas Corrientes se resuelve pasando el origen como **parámetro con default de la función que abre** — `abrirFicha(..., origen = 'lista')` — y NO como una variable suelta que se setea antes de llamar: así un call site nuevo no hereda en silencio el origen del anterior. Mismo criterio que el `?volver=` entre Gastos y Cuentas Corrientes.
- **Un passthrough a medias es peor que ninguno.** Caso real (`0e70708`): el modal de Accesos preservaba el permiso de una tarea que no está en `CATALOGO_TAREAS`, pero le pisaba el ALCANCE con null en cada guardado — una revocación parcial silenciosa, del tipo que no tira ningún error. Lo peor: el prefill cargaba ese alcance al Map con un comentario que decía *"para que el round-trip no lo pierda"*, y el payload hacía exactamente lo contrario. REGLA: cuando un comentario promete una garantía, verificar que la cumpla **todo el camino**, no solo la mitad donde está escrito el comentario. Un comentario que promete algo que el código no hace es peor que no tener comentario, porque desactiva la sospecha justo donde hacía falta.
- **Las opciones de un filtro salen de la tabla base, nunca de los datos ya filtrados en pantalla.** Caso real: el selector de unidad de la ficha de proveedor se alimenta de `facturas_pendientes` en cualquier estado, y NO de los movimientos (que vienen filtrados por fecha: poner "Hoy" habría borrado unidades del selector) ni de `v_saldo_proveedor` (que solo trae saldos distintos de cero: una unidad con todo pagado habría desaparecido). Las dos serían regresiones silenciosas — el filtro seguiría "funcionando", solo que con opciones de menos, y nada avisaría que faltan.
- **Un permiso puede tener criterios distintos según el módulo, y eso puede ser deliberado.** Las tareas de Cuenta de Empresa se verifican SIN bypass de super_admin (`tiene_tarea_explicita` en Caja, `tieneTareaExplicita()` en Cuentas Corrientes): la plata de la empresa no es de nadie en particular, así que operarla exige la fila otorgada en `empleado_tareas` aunque quien mire sea super_admin. En Cuentas Corrientes ese criterio aplica a UN solo gate —el grupo "Cuenta de Empresa" del selector de pago— mientras los otros seis usan `tieneTarea()` con bypass. Parece una inconsistencia y no lo es: está documentado en el código para que nadie lo "corrija" unificándolo, porque hacerlo reabriría el acceso a la plata de la empresa sin permiso explícito.
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
