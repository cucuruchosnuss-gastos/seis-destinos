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
- empleados: 33 filas desde Naaloo (fuente de verdad de RRHH). Campos: id, nombre, unidad_negocio_id, rol, cuil, activo
- vehiculos: 9 filas. Campos: id, nombre, marca, patente, unidad_negocio_id, activo
- categorias: 9 filas con icon. Campos: id, nombre, icon, activo
- proveedores: 5 filas. Campos: id, razon_social, nombre_fantasia, cuit, activo
- proyectos: 3 filas. Campos: id, nombre, activo
- solicitudes_acceso: para registro con aprobación. Campos: id, nombre, email, estado, fecha_solicitud, usuario_id

### Módulo Gastos (tabla ya creada)
Tabla: gastos
Campos: id, fecha, periodo, empleado_id, unidad_negocio_id, vehiculo_id, proveedor_id, categoria_id, proyecto_id, tipo_doc, numero_doc, razon_social, importe, moneda, kilometraje, lugar_servicio, foto_url, descripcion, observaciones, estado, created_at

## Base vieja (solo lectura, referencia)
- Proyecto: oxcypiztfoxxxhtuqmrd
- NO se modifica nunca. Conectada por MCP en solo lectura.
- Los módulos (gastos, ingresos_mp) NO se migran. Solo se migraron los maestros.

## Login y roles
- Supabase Auth (email + contraseña)
- Registro con aprobación manual: el usuario se registra, queda en estado "pendiente" en solicitudes_acceso, un admin aprueba antes de que pueda entrar
- Roles: admin (todo), pablo (revisión y reportes), usuario (carga)
- Tablets de fábrica: cuenta genérica + PIN de turno por encargado (a implementar)

## Módulos planificados
1. Gastos (en construcción): wizard de carga con OCR, vínculo a vehículo y/o unidad de negocio
2. Materia Prima (próxima fase): ingreso de materias primas con detalle de ítems, lotes, proveedor
3. Producción (futuro)
4. Salamasa (futuro)
5. Mantenimiento de máquinas (futuro)
6. Trazabilidad de lotes (futuro)
7. Empleados (futuro)

## Estilo visual
- Clean minimal tipo Apple/Airbnb/Linear
- Fondo blanco (#FFFFFF), superficies gris muy claro (#F7F7F7)
- Acento: azul índigo (#5B6CF9)
- Texto principal: #111111, secundario: #6B7280
- Bordes: #E5E7EB, sombras muy sutiles
- Tipografía: Inter / system-ui
- Bordes redondeados: 12px cards, 8px inputs y botones
- Mobile-first

## Cómo trabajar
- Responder SIEMPRE en español
- Paso a paso detallado para alguien sin experiencia técnica
- Mostrar qué se va a hacer antes de hacerlo y esperar aprobación
- No tocar lo que funciona
- Nunca exponer claves secretas en el código ni en commits
- Aprobar manualmente cada herramienta de Supabase
