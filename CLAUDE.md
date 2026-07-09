# Seis Destinos — Guía del proyecto

## Objetivo
Sistema de gestión de fábrica de Grupo Nuss sobre una única base de datos central en Supabase (nuss-central), con datos maestros compartidos y módulos separados. Nombre de la app: Seis Destinos. Las empresas del grupo son: Cucuruchos Nuss (Córdoba), Dolce Pasta (Rosario), Taller (Córdoba), Mengui/Heladitos Orly (Córdoba).

## Arquitectura
- PWA (Progressive Web App): instalable en celular y funciona en navegador de escritorio
- Multi-archivo: un HTML por módulo, CSS y JS compartidos
- Sin frameworks: HTML, CSS y JS vanilla
- Backend: Supabase (PostgreSQL administrado, región São Paulo)
- OCR de comprobantes: la app llama a la API de Anthropic en tiempo real
- Hosting: GitHub Pages (repo: https://github.com/cucuruchosnuss-gastos/seis-destinos)

## Base de datos central (nuss-central)
- URL: https://xtorxouhzuizdvawqakb.supabase.co
- Publishable key: sb_publishable_G8GZe2uAvb6VdJ1S4DD8nA_CC7iugYw
- RLS activado en todas las tablas

### Tablas maestras (ya creadas y pobladas)
- unidades_negocio: 4 filas (Cucuruchos Nuss, Dolce Pasta, Taller, Mengui)
- empleados: desde Naaloo (fuente de verdad de RRHH) + altas por auto-registro. Campos: id, nombre, unidad_negocio_id, rol, cuil, activo, auth_user_id, rol_app, tipo, origen, fecha_nacimiento, telefono, email, domicilio, legajo, fecha_alta.
  - `rol_app`: permiso dentro de la app (`super_admin` / `admin` / `usuario`). No confundir con `rol`.
  - `rol`: puesto de RRHH (viene de Naaloo — Categoría + Subcategoría concatenadas, ej "Fuera de convenio · Categoría I").
  - `tipo`: `naaloo` / `admin` — bucket usado por el selector de empleados de Gastos (`gastos.html`), no tocar sin revisar ese uso.
  - `origen`: `naaloo` (importado desde Excel) / `app_registro` (creado por auto-registro sin match de CUIL). Distinto de `tipo`, no fusionar.
  - Un empleado con `origen='app_registro'` y `rol` vacío tiene datos incompletos — se completan desde el módulo Empleados.
- empleado_modulos: controla qué módulos puede ver cada usuario (a futuro). Campos: empleado_id, modulo, habilitado, otorgado_por, otorgado_en. Pendiente conocido: el dashboard hoy filtra el tile de cada módulo por `rol_app` (soloAdmin), todavía no consulta esta tabla.
- vehiculos: 9 filas. Campos: id, nombre, marca, patente, unidad_negocio_id, activo
- categorias: 12 filas con icon. Campos: id, nombre, icon, activo. Lista completa: Combustible, Flete-Transportes, Insumos, Inversion, Limpieza, Mantenimiento, Otros, Peaje, Repuestos, Seguros-Patente, Service, Viático
- proveedores: 5 filas. Campos: id, razon_social, nombre_fantasia, cuit, activo
- proyectos: 3 filas. Campos: id, nombre, activo
- solicitudes_acceso: registro con aprobación manual. Campos: id, nombre, apellido, email, cuil, estado, fecha_solicitud, usuario_id, fecha_nacimiento, telefono, tuvo_match.

### RPCs existentes (no recrear — son SECURITY DEFINER, re-verifican rol_app server-side)
- `aprobar_solicitud_acceso`, `actualizar_permisos_empleado`, `rechazar_solicitud_acceso` — usadas por `modulos/accesos.html`.
- `importar_empleados_naaloo`, `completar_datos_empleado` — usadas por `modulos/empleados.html`.
  - Regla de `importar_empleados_naaloo`: `unidad_negocio_id` se asigna solo en el alta (INSERT). En una reimportación (UPDATE de un empleado ya existente) NO se debe pisar, para no revertir correcciones manuales (ej. empleados de Taller, que en el Excel de Naaloo figuran agrupados junto con Cucuruchos Nuss).

### Módulo Gastos (tabla ya creada)
Tabla: gastos
Campos: id, fecha, periodo, empleado_id, unidad_negocio_id, vehiculo_id, proveedor_id, categoria_id, proyecto_id, tipo_doc, numero_doc, razon_social, importe, moneda, kilometraje, lugar_servicio, foto_url, descripcion, observaciones, estado, created_at

## Base vieja (solo lectura, referencia)
- Proyecto: oxcypiztfoxxxhtuqmrd
- NO se modifica nunca. Conectada por MCP en solo lectura.
- Los módulos (gastos, ingresos_mp) NO se migran. Solo se migraron los maestros.

## Login y roles
- Supabase Auth (email + contraseña)
- Auto-registro (`registro.html`): el usuario busca su CUIL; si matchea con un empleado de Naaloo, pre-completa nombre/puesto; si no matchea, completa sus datos a mano. En ambos casos crea la cuenta de Auth y una fila en `solicitudes_acceso` pendiente de aprobación.
- Aprobación manual desde `modulos/accesos.html`: un admin/super_admin revisa la solicitud, asigna rol y módulos, y aprueba (o crea el empleado nuevo si no hubo match de CUIL).
- Roles (`empleados.rol_app`): `super_admin` (todo, incluida la asignación de `admin`; nunca se asigna desde ninguna UI), `admin` (aprueba accesos, asigna `usuario`), `usuario` (carga)
- Tablets de fábrica: cuenta genérica + PIN de turno por encargado (a implementar)

## Módulos
### Existentes
1. Gastos (`modulos/gastos.html`): wizard de carga con OCR, vínculo a vehículo y/o unidad de negocio
2. Accesos (`modulos/accesos.html`, soloAdmin): aprobación de solicitudes de registro y gestión de roles/módulos por usuario
3. Empleados (`modulos/empleados.html`, soloAdmin): directorio de empleados activos agrupado por unidad de negocio, ficha con datos de Naaloo, importación de Excel de Naaloo

### Planificados
1. Materia Prima (próxima fase): ingreso de materias primas con detalle de ítems, lotes, proveedor
2. Producción (futuro)
3. Salamasa (futuro)
4. Mantenimiento de máquinas (futuro)
5. Trazabilidad de lotes (futuro)

## Estilo visual
- Clean minimal tipo Apple/Airbnb/Linear
- Fondo blanco (#FFFFFF), superficies gris muy claro (#F7F7F7)
- Acento: azul índigo (#5B6CF9)
- Texto principal: #111111, secundario: #6B7280
- Bordes: #E5E7EB, sombras muy sutiles
- Tipografía: Inter / system-ui
- Bordes redondeados: 12px cards, 8px inputs y botones
- Mobile-first
- Colores de acento por módulo: son variables CSS locales definidas en el `body {}` de cada archivo (no tocan `--color-acento` global). Gastos usa `--color-acento-highlight` (cian, ya existente en `css/main.css`). Accesos usa `--rojo` (`#C23B3B`). Empleados usa `--violeta` (`#6E56CF` / suave `#F1EDFC` / oscuro `#5B45AD`) — valores definitivos, no cambiarlos sin pedido explícito del usuario en el mensaje, aunque algún archivo o commit viejo tenga otro valor.

## Cómo trabajar
- Responder SIEMPRE en español
- Paso a paso detallado para alguien sin experiencia técnica
- Mostrar qué se va a hacer antes de hacerlo y esperar aprobación
- No tocar lo que funciona
- Nunca exponer claves secretas en el código ni en commits
- Aprobar manualmente cada herramienta de Supabase
