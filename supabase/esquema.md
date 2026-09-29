# Esquema de la base (nuss-central, `public`)

Foto tomada el 2026-09-29 con `npm run esquema` (una consulta de solo lectura a information_schema y pg_proc). **Es una foto, no la fuente de verdad**: ante la duda, consultá la base.

- 77 tablas, 19 vistas, 234 funciones.

## Tablas y vistas

### _respaldo_urls_comprobantes_20260916

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| tabla | text | sí |  |
| id | uuid | sí |  |
| url | text | sí |  |

### aplicaciones_credito

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| credito_id | uuid | no |  |
| factura_pendiente_id | uuid | no |  |
| monto_aplicado | numeric | no |  |
| created_at | timestamp with time zone | no | now() |

### aplicaciones_pago

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| gasto_id | uuid | no |  |
| factura_pendiente_id | uuid | no |  |
| monto_aplicado | numeric | no |  |
| created_at | timestamp with time zone | no | now() |

### bancos_bcra

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| codigo | text | no |  |
| denominacion | text | no |  |
| activo | boolean | no | true |

### caja_movimientos

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| empleado_id | uuid | no |  |
| tipo | text | no |  |
| monto | numeric | no |  |
| moneda | text | no | 'ARS'::text |
| medio_pago | text | sí |  |
| gasto_id | uuid | sí |  |
| fecha | date | no | CURRENT_DATE |
| descripcion | text | sí |  |
| creado_por | uuid | sí |  |
| created_at | timestamp with time zone | no | now() |
| contraparte_empleado_id | uuid | sí |  |
| cuenta_id | uuid | sí |  |

### caja_solicitudes_movimiento

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| origen_empleado_id | uuid | no |  |
| destino_empleado_id | uuid | no |  |
| monto | numeric | no |  |
| moneda | text | no | 'ARS'::text |
| medio_pago | text | no |  |
| fecha | date | no | CURRENT_DATE |
| descripcion | text | sí |  |
| estado | text | no | 'pendiente'::text |
| creado_por | uuid | no |  |
| motivo_rechazo | text | sí |  |
| respondido_por | uuid | sí |  |
| respondido_en | timestamp with time zone | sí |  |
| created_at | timestamp with time zone | no | now() |
| cuenta_origen_id | uuid | sí |  |
| cuenta_destino_id | uuid | sí |  |

### categorias

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| nombre | text | no |  |
| activo | boolean | no | true |
| created_at | timestamp with time zone | no | now() |
| icon | text | sí | '📌'::text |

### cliente_movimientos

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| cliente_id | uuid | no |  |
| fecha | date | no |  |
| tipo | text | no |  |
| importe | numeric | no |  |
| moneda | text | no | 'ARS'::text |
| orden_retiro_id | uuid | sí |  |
| observacion | text | sí |  |
| cargado_por | uuid | sí |  |
| cargado_en | timestamp with time zone | no | now() |
| cobranza_id | uuid | sí |  |
| proyecto_id | uuid | sí |  |

### clientes

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| unidad_negocio_id | uuid | no |  |
| nombre | text | no |  |
| apodos | ARRAY | no | '{}'::text[] |
| localidad | text | sí |  |
| telefono | text | sí |  |
| observaciones | text | sí |  |
| activo | boolean | no | true |
| creado_por | uuid | sí |  |
| creado_en | timestamp with time zone | no | now() |
| razon_social | text | sí |  |
| cuit | text | sí |  |
| proveedor_id | uuid | sí |  |
| lista_precio_id | uuid | sí |  |
| email | text | sí |  |
| domicilio | text | sí |  |
| provincia | text | sí |  |
| codigo_postal | text | sí |  |
| condicion_iva | text | sí |  |
| contacto_nombre | text | sí |  |
| contacto_telefono | text | sí |  |
| transporte_habitual | text | sí |  |
| banco | text | sí |  |
| cbu | text | sí |  |
| alias_cbu | text | sí |  |
| limite_credito | numeric | sí |  |
| plazo_pago_dias | integer | sí |  |
| codigo_anterior | integer | sí |  |

### cobranza_cheques

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | no |  |
| cobranza_id | uuid | no |  |
| foto_id | uuid | no |  |
| banco_codigo | text | no |  |
| sucursal_codigo | text | no |  |
| codigo_postal | text | no |  |
| dv_ruta | smallint | no |  |
| numero | text | no |  |
| dv_numero | smallint | no |  |
| cuenta | text | no |  |
| dv_cuenta | smallint | no |  |
| tipo | text | no |  |
| fecha_emision | date | no |  |
| fecha_pago | date | sí |  |
| importe | numeric | no |  |
| importe_letras | text | sí |  |
| titulares | jsonb | no | '[]'::jsonb |
| beneficiario | text | sí |  |
| origen_datos | text | no |  |
| ocr_propuesto | jsonb | sí |  |
| estado | text | no | 'en_cartera'::text |
| created_at | timestamp with time zone | no | now() |
| salida_fecha | date | sí |  |
| salida_destino | text | sí |  |
| salida_por | uuid | sí |  |
| salida_registrada_en | timestamp with time zone | sí |  |
| salida_proveedor_id | uuid | sí |  |
| salida_gasto_id | uuid | sí |  |

### cobranza_fotos

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | no |  |
| cobranza_id | uuid | no |  |
| storage_path | text | no |  |
| subida_por | uuid | no |  |
| ocr_crudo | jsonb | sí |  |
| ocr_modelo | text | sí |  |
| created_at | timestamp with time zone | no | now() |

### cobranza_historial

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | bigint | no |  |
| cobranza_id | uuid | no |  |
| accion | text | no |  |
| empleado_id | uuid | no |  |
| antes | jsonb | sí |  |
| despues | jsonb | sí |  |
| motivo | text | sí |  |
| created_at | timestamp with time zone | no | now() |

### cobranzas

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | no |  |
| empleado_id | uuid | no |  |
| cliente | text | no |  |
| cliente_normalizado | text | sí |  |
| fecha | date | no |  |
| efectivo | numeric | no |  |
| moneda | text | no | 'ARS'::text |
| comprobante_referencia | text | sí |  |
| observaciones | text | sí |  |
| estado | text | no | 'registrada'::text |
| procesada_por | uuid | sí |  |
| procesada_en | timestamp with time zone | sí |  |
| anulada_por | uuid | sí |  |
| anulada_en | timestamp with time zone | sí |  |
| motivo_anulacion | text | sí |  |
| created_at | timestamp with time zone | no | now() |
| unidad_negocio_id | uuid | sí |  |
| cliente_id | uuid | sí |  |
| proyecto_id | uuid | sí |  |

### creditos_proveedor

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| proveedor_id | uuid | no |  |
| unidad_negocio_id | uuid | no |  |
| moneda | text | no | 'ARS'::text |
| monto_original | numeric | no |  |
| monto_disponible | numeric | no |  |
| origen_gasto_id | uuid | sí |  |
| estado | text | no | 'disponible'::text |
| created_at | timestamp with time zone | no | now() |

### cuentas_caja

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| empleado_id | uuid | no |  |
| nombre | text | no |  |
| medio | text | no |  |
| moneda | text | no | 'ARS'::text |
| favorita | boolean | no | false |
| activa | boolean | no | true |
| created_at | timestamp with time zone | no | now() |
| cbu | text | sí |  |
| numero_cuenta | text | sí |  |
| alias | text | sí |  |
| unidad_negocio_id | uuid | sí |  |

### empleado_modulos

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| empleado_id | uuid | no |  |
| modulo | text | no |  |
| habilitado | boolean | no | true |
| otorgado_por | uuid | sí |  |
| otorgado_en | timestamp with time zone | no | now() |

### empleado_tareas

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| empleado_id | uuid | no |  |
| modulo | text | no |  |
| tarea | text | no |  |
| habilitado | boolean | no | true |
| alcance | jsonb | sí |  |
| otorgado_por | uuid | sí |  |
| otorgado_en | timestamp with time zone | no | now() |

### empleados

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| nombre | text | no |  |
| unidad_negocio_id | uuid | sí |  |
| rol | text | sí |  |
| cuil | text | sí |  |
| activo | boolean | no | true |
| created_at | timestamp with time zone | no | now() |
| tipo | text | no | 'naaloo'::text |
| auth_user_id | uuid | sí |  |
| rol_app | text | no | 'usuario'::text |
| origen | text | no | 'naaloo'::text |
| fecha_nacimiento | date | sí |  |
| telefono | text | sí |  |
| email | text | sí |  |
| domicilio | text | sí |  |
| legajo | text | sí |  |
| fecha_alta | date | sí |  |
| contacto_emergencia_nombre | text | sí |  |
| contacto_emergencia_telefono | text | sí |  |
| caja_raiz | boolean | no | false |
| oculto_como_contraparte | boolean | no | false |
| es_empresa | boolean | no | false |
| es_dispositivo | boolean | no | false |
| es_prueba | boolean | no | false |
| sesiones_revocadas_en | timestamp with time zone | sí |  |
| baja_en_app | boolean | no | false |
| baja_motivo | text | sí |  |
| baja_por | uuid | sí |  |
| baja_en | timestamp with time zone | sí |  |

### errores_app

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| empleado_id | uuid | sí |  |
| pantalla | text | sí |  |
| mensaje | text | no |  |
| detalle | text | sí |  |
| url | text | sí |  |
| dispositivo | text | sí |  |
| evento | text | sí |  |
| creado_en | timestamp with time zone | no | now() |

### facturas_pendientes

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| unidad_negocio_id | uuid | sí |  |
| categoria_id | uuid | sí |  |
| razon_social | text | sí |  |
| tipo_documento | text | sí |  |
| numero_comprobante | text | sí |  |
| importe | numeric | sí |  |
| moneda | text | sí | 'ARS'::text |
| empleado_id | uuid | no |  |
| fecha_factura | date | sí |  |
| lugar | text | sí |  |
| observaciones | text | sí |  |
| comprobante_url | text | sí |  |
| estado | text | no | 'pendiente'::text |
| gasto_id | uuid | sí |  |
| created_at | timestamp with time zone | sí | now() |
| updated_at | timestamp with time zone | sí | now() |
| proyecto_id | uuid | sí |  |
| vehiculo_id | uuid | sí |  |
| kilometraje | integer | sí |  |
| modulo_origen | text | no | 'gastos'::text |
| proveedor_id | uuid | sí |  |
| saldo_pendiente | numeric | sí |  |
| origen_gasto_id | uuid | sí |  |
| importe_cargado_por | uuid | sí |  |
| importe_cargado_en | timestamp with time zone | sí |  |

### gastos

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| fecha | date | no |  |
| periodo | text | sí |  |
| empleado_id | uuid | no |  |
| unidad_negocio_id | uuid | sí |  |
| vehiculo_id | uuid | sí |  |
| proveedor_id | uuid | sí |  |
| categoria_id | uuid | no |  |
| proyecto_id | uuid | sí |  |
| tipo_doc | text | sí |  |
| numero_doc | text | sí |  |
| razon_social | text | sí |  |
| importe | numeric | no | 0 |
| moneda | text | no | 'ARS'::text |
| kilometraje | integer | sí |  |
| lugar_servicio | text | sí |  |
| foto_url | text | sí |  |
| descripcion | text | sí |  |
| observaciones | text | sí |  |
| estado | text | no | 'ok'::text |
| created_at | timestamp with time zone | no | now() |
| receptor | text | sí |  |
| descripcion_item | text | sí |  |
| medio_pago | text | sí |  |
| fecha_pago | date | no | CURRENT_DATE |
| cuenta_id | uuid | sí |  |
| anulado_por | uuid | sí |  |
| anulado_en | timestamp with time zone | sí |  |
| motivo_anulacion | text | sí |  |
| sin_ingreso_motivo | text | sí |  |

### ingrediente_insumos

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| ingrediente_id | uuid | no |  |
| insumo_id | uuid | no |  |

### ingredientes

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| nombre | text | no |  |
| descuenta_stock | boolean | no | true |
| orden | integer | no | 0 |
| activo | boolean | no | true |
| define_chocolate | boolean | no | false |

### insumos

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| nombre | text | no |  |
| unidad_medida | text | no |  |
| activo | boolean | no | true |
| created_at | timestamp with time zone | no | now() |
| tipo | text | no |  |
| marca | text | sí |  |
| estado_alta | text | no | 'activo'::text |
| tolerancia_merma_pct | numeric | sí |  |
| categoria | text | sí |  |
| aclaracion | text | sí |  |
| vista_preferida | text | no | 'base'::text |

### intereses_factura

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| factura_pendiente_id | uuid | no |  |
| monto | numeric | no |  |
| moneda | text | no |  |
| fecha | date | no | CURRENT_DATE |
| tasa_pct | numeric | sí |  |
| tasa_periodo | text | sí |  |
| dias_transcurridos | integer | sí |  |
| observaciones | text | sí |  |
| creado_por | uuid | sí |  |
| created_at | timestamp with time zone | no | now() |
| base_calculo | text | sí |  |

### lista_precios_items

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| lista_id | uuid | no |  |
| presentacion_id | uuid | sí |  |
| precio_caja | numeric | no |  |
| vigente_desde | date | no | CURRENT_DATE |
| cargado_por | uuid | sí |  |
| cargado_en | timestamp with time zone | no | now() |
| insumo_id | uuid | sí |  |

### listas_precios

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| unidad_negocio_id | uuid | no |  |
| nombre | text | no |  |
| moneda | text | no | 'ARS'::text |
| activa | boolean | no | true |
| creada_en | timestamp with time zone | no | now() |

### maquinas

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| unidad_negocio_id | uuid | no |  |
| nombre | text | no |  |
| activa | boolean | no | true |
| orden | integer | no | 0 |
| created_at | timestamp with time zone | no | now() |

### marcas_personalizadas

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| nombre | text | no |  |
| activa | boolean | no | true |
| estado_alta | text | no | 'aprobada'::text |
| creada_por | uuid | sí |  |
| creada_en | timestamp with time zone | no | now() |
| revisada_por | uuid | sí |  |
| revisada_en | timestamp with time zone | sí |  |
| doble_bolsa | boolean | no | false |

### masa_items

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| masa_id | uuid | no |  |
| ingrediente_id | uuid | sí |  |
| insumo_id | uuid | sí |  |
| lote | text | sí |  |
| lote_fuera_de_stock | boolean | no | false |
| cantidad_simple_kg | numeric | no |  |
| cantidad_kg | numeric | no |  |
| ingrediente_libre | text | sí |  |

### masas

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| turno_id | uuid | no |  |
| nro | integer | no |  |
| hora | timestamp with time zone | no | now() |
| tipo_masa | text | no |  |
| doble | boolean | no | false |
| origen | text | no |  |
| receta_id | uuid | no |  |
| masero_id | uuid | no |  |
| cargada_por | uuid | no |  |
| anulada | boolean | no | false |
| anulada_por | uuid | sí |  |
| anulada_en | timestamp with time zone | sí |  |
| anulada_motivo | text | sí |  |
| client_uuid | uuid | sí |  |
| es_chocolate | boolean | no | false |
| motivo | text | sí |  |

### materia_prima_factura_remitos

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| factura_id | uuid | no |  |
| remito_id | uuid | no |  |
| created_at | timestamp with time zone | no | now() |

### materia_prima_ingresos

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| fecha | date | no |  |
| tipo_doc | text | no |  |
| numero_doc | text | sí |  |
| razon_social | text | sí |  |
| nombre_fantasia | text | sí |  |
| unidad_negocio_id | uuid | no |  |
| foto_url | text | sí |  |
| remito_vinculado_id | uuid | sí |  |
| empleado_id | uuid | no |  |
| created_at | timestamp with time zone | no | now() |
| proveedor_id | uuid | sí |  |
| editado_por | uuid | sí |  |
| editado_en | timestamp with time zone | sí |  |
| ocr_crudo | jsonb | sí |  |
| gasto_id | uuid | sí |  |
| factura_pendiente_id | uuid | sí |  |
| sin_stock_motivo | text | sí |  |

### materia_prima_items

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| ingreso_id | uuid | no |  |
| insumo_id | uuid | no |  |
| cantidad | numeric | no |  |
| created_at | timestamp with time zone | no | now() |
| lote | text | sí |  |
| ficha_tecnica_url | text | sí |  |
| foto_lote_url | text | sí |  |
| lote_ilegible | boolean | no | false |
| cantidad_bultos | numeric | sí |  |
| contenido_por_bulto | numeric | sí |  |
| cantidad_documento | numeric | sí |  |
| motivo_diferencia | text | sí |  |
| ya_recibido_con_remito | boolean | no | false |
| interpretacion | text | sí |  |
| contenido_documento | numeric | sí |  |
| precio_unitario | numeric | sí |  |
| alicuota_iva | numeric | sí |  |

### modulos

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| clave | text | no |  |
| nombre_visible | text | no |  |
| grupo_clave | text | sí |  |
| grupo_label | text | sí |  |
| orden | integer | no |  |
| activo | boolean | no | true |

### movimientos_entre_unidades

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| unidad_acreedora_id | uuid | no |  |
| unidad_deudora_id | uuid | no |  |
| importe | numeric | no |  |
| moneda | text | no | 'ARS'::text |
| fecha | date | no |  |
| concepto | text | no |  |
| proyecto_id | uuid | sí |  |
| cargado_por | uuid | sí |  |
| cargado_en | timestamp with time zone | no | now() |

### numeradores

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| unidad_negocio_id | uuid | no |  |
| tipo | text | no |  |
| ultimo | bigint | no | 0 |

### orden_retiro_items

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| orden_id | uuid | no |  |
| orden | integer | no |  |
| presentacion_id | uuid | sí |  |
| marca_id | uuid | sí |  |
| cajas | integer | sí |  |
| unidades | integer | sí |  |
| precio_caja | numeric | sí |  |
| subtotal | numeric | sí |  |
| lote | text | sí |  |
| insumo_id | uuid | sí |  |
| cantidad | numeric | sí |  |
| faltante | numeric | sí |  |
| revision | text | sí |  |
| revision_motivo | text | sí |  |
| revisada_por | uuid | sí |  |
| revisada_en | timestamp with time zone | sí |  |

### ordenes_retiro

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| numero | bigint | no |  |
| unidad_negocio_id | uuid | no |  |
| cliente_id | uuid | no |  |
| fecha | date | no |  |
| estado | text | no | 'confirmada'::text |
| transporte | text | sí |  |
| observaciones | text | sí |  |
| total | numeric | no | 0 |
| moneda | text | no | 'ARS'::text |
| cargada_por | uuid | sí |  |
| cargada_en | timestamp with time zone | no | now() |
| anulada_por | uuid | sí |  |
| anulada_en | timestamp with time zone | sí |  |
| anulada_motivo | text | sí |  |
| client_uuid | uuid | sí |  |
| codigo | text | sí |  |
| estado_valorizacion | text | no | 'pendiente'::text |
| valorizada_por | uuid | sí |  |
| valorizada_en | timestamp with time zone | sí |  |

### paradas_produccion

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| turno_id | uuid | no |  |
| inicio | timestamp with time zone | no |  |
| fin | timestamp with time zone | sí |  |
| motivo | text | no |  |
| cargada_por | uuid | no |  |
| hasta_fin_de_turno | boolean | no | false |

### pedido_items

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| pedido_id | uuid | no |  |
| orden | integer | no |  |
| presentacion_id | uuid | sí |  |
| marca_id | uuid | sí |  |
| cajas | numeric | no |  |
| cajas_cumplidas | numeric | no | 0 |
| texto_libre | text | sí |  |
| observacion | text | sí |  |

### pedidos

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| unidad_negocio_id | uuid | no |  |
| cliente_id | uuid | no |  |
| numero | bigint | no | nextval('pedido_numero_seq'::regclass) |
| fecha | date | no |  |
| fecha_entrega | date | sí |  |
| estado | text | no | 'pendiente'::text |
| observaciones | text | sí |  |
| texto_original | text | sí |  |
| anulado_motivo | text | sí |  |
| creado_por | uuid | sí |  |
| creado_en | timestamp with time zone | no | now() |
| actualizado_en | timestamp with time zone | no | now() |

### pines_maestros

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| empleado_id | uuid | no |  |
| pin_hash | text | no |  |
| intentos_fallidos | integer | no | 0 |
| bloqueado_hasta | timestamp with time zone | sí |  |
| actualizado_en | timestamp with time zone | no | now() |

### pines_produccion

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| empleado_id | uuid | no |  |
| pin_hash | text | no |  |
| intentos_fallidos | integer | no | 0 |
| bloqueado_hasta | timestamp with time zone | sí |  |
| actualizado_en | timestamp with time zone | no | now() |
| actualizado_por | uuid | sí |  |
| expira_en | timestamp with time zone | sí |  |
| debe_cambiar | boolean | no | false |

### preferencias_usuario

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| empleado_id | uuid | no |  |
| datos | jsonb | no | '{}'::jsonb |
| actualizado_en | timestamp with time zone | no | now() |

### presentacion_cajas

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| presentacion_id | uuid | no |  |
| insumo_id | uuid | no |  |
| embolsado_sugerido | text | no | 'grande'::text |

### presentacion_empaque

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| presentacion_id | uuid | no |  |
| insumo_id | uuid | no |  |
| cantidad | numeric | no |  |
| condicion | text | no | 'siempre'::text |

### produccion_correcciones

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| produccion_item_id | uuid | no |  |
| tipo | text | no |  |
| cajas_antes | integer | sí |  |
| cajas_despues | integer | sí |  |
| motivo | text | no |  |
| hecha_por | uuid | no |  |
| hecha_en | timestamp with time zone | no | now() |
| detalle | jsonb | sí |  |

### produccion_items

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| turno_id | uuid | no |  |
| orden | integer | no |  |
| sublote | text | no |  |
| presentacion_id | uuid | no |  |
| marca_id | uuid | sí |  |
| cajas | integer | no |  |
| unidades_por_caja | integer | no |  |
| unidades | integer | no |  |
| anulado | boolean | no | false |
| caja_insumo_id | uuid | sí |  |
| embolsado | text | sí |  |

### producto_presentaciones

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| producto_id | uuid | no |  |
| nombre | text | no |  |
| con_cono | boolean | no | false |
| media_caja | boolean | no | false |
| empaque | text | sí |  |
| unidades_por_caja | integer | no |  |
| activa | boolean | no | true |
| orden | integer | no | 0 |

### productos

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| nombre | text | no |  |
| unidad_negocio_id | uuid | sí |  |
| activo | boolean | no | true |
| created_at | timestamp with time zone | no | now() |

### productos_terminados

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| unidad_negocio_id | uuid | no |  |
| nombre | text | no |  |
| tipo_masa | text | sí |  |
| activo | boolean | no | true |
| orden | integer | no | 0 |
| categoria | text | sí |  |
| color | text | sí |  |

### proveedor_insumo_alias

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| proveedor_id | uuid | no |  |
| texto_proveedor | text | no |  |
| insumo_id | uuid | no |  |
| creado_por | uuid | no |  |
| created_at | timestamp with time zone | no | now() |

### proveedores

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| razon_social | text | no |  |
| nombre_fantasia | text | sí |  |
| cuit | text | sí |  |
| activo | boolean | no | true |
| created_at | timestamp with time zone | no | now() |
| estado_alta | text | no | 'activo'::text |
| creado_por | uuid | sí |  |
| direccion | text | sí |  |
| cuenta_corriente | boolean | no | false |

### proyecto_archivos

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| proyecto_id | uuid | no |  |
| tipo | text | no |  |
| nombre | text | no |  |
| ruta | text | no |  |
| subido_por | uuid | sí |  |
| subido_en | timestamp with time zone | no | now() |
| borrado | boolean | no | false |

### proyecto_horas

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| proyecto_id | uuid | sí |  |
| empleado_id | uuid | no |  |
| fecha | date | no |  |
| horas | numeric | no |  |
| tarea | text | sí |  |
| cargado_por | uuid | sí |  |
| cargado_en | timestamp with time zone | no | now() |
| anulado | boolean | no | false |
| tarea_id | uuid | sí |  |

### proyecto_notas

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| proyecto_id | uuid | no |  |
| texto | text | no |  |
| autor_id | uuid | sí |  |
| creado_en | timestamp with time zone | no | now() |

### proyectos

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| nombre | text | no |  |
| activo | boolean | no | true |
| created_at | timestamp with time zone | no | now() |
| destino | text | no | 'externo'::text |
| categoria | text | sí |  |
| cliente_id | uuid | sí |  |
| unidad_destino_id | uuid | sí |  |
| descripcion | text | sí |  |
| ubicacion | text | sí |  |
| estado | text | no | 'presupuestado'::text |
| fecha_inicio | date | sí |  |
| fecha_entrega_prometida | date | sí |  |
| fecha_entrega_real | date | sí |  |
| presupuesto_costo | numeric | sí |  |
| horas_estimadas | numeric | sí |  |
| precio_venta | numeric | sí |  |
| moneda | text | no | 'ARS'::text |
| responsable_id | uuid | sí |  |
| observaciones | text | sí |  |
| creado_por | uuid | sí |  |
| actualizado_en | timestamp with time zone | sí |  |

### puestos_produccion

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| empleado_id | uuid | no |  |
| unidad_negocio_id | uuid | no |  |
| puesto | text | no |  |

### puestos_temporales

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| empleado_id | uuid | no |  |
| unidad_negocio_id | uuid | no |  |
| puesto | text | no |  |
| desde | timestamp with time zone | no | now() |
| hasta | timestamp with time zone | no |  |
| otorgado_por | uuid | no |  |
| revocado_en | timestamp with time zone | sí |  |

### receta_items

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| receta_id | uuid | no |  |
| ingrediente_id | uuid | no |  |
| cantidad_kg | numeric | no |  |
| insumo_preferido_id | uuid | sí |  |

### recetas

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| maquina_id | uuid | no |  |
| tipo_masa | text | no |  |
| version | integer | no |  |
| nota | text | sí |  |
| creada_por | uuid | sí |  |
| created_at | timestamp with time zone | no | now() |

### registro_seguridad

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| empleado_id | uuid | sí |  |
| accion | text | no |  |
| motivo | text | sí |  |
| hecho_por | uuid | sí |  |
| hecho_en | timestamp with time zone | no | now() |

### solicitudes_acceso

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| nombre | text | no |  |
| email | text | no |  |
| estado | text | no | 'pendiente'::text |
| fecha_solicitud | timestamp with time zone | no | now() |
| usuario_id | uuid | sí |  |
| cuil | text | sí |  |
| apellido | text | sí |  |
| fecha_nacimiento | date | sí |  |
| telefono | text | sí |  |
| tuvo_match | boolean | no | false |

### stock_movimientos

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| unidad_negocio_id | uuid | no |  |
| insumo_id | uuid | no |  |
| lote | text | sí |  |
| lote_ilegible | boolean | no | false |
| cantidad | numeric | no |  |
| tipo | text | no |  |
| motivo | text | sí |  |
| lote_ambiguo | boolean | no | false |
| materia_prima_item_id | uuid | sí |  |
| empleado_id | uuid | sí |  |
| fecha | date | no | CURRENT_DATE |
| created_at | timestamp with time zone | no | now() |
| recuento_id | uuid | sí |  |
| contenido_por_bulto | numeric | sí |  |
| motivo_tipo | text | sí |  |
| masa_item_id | uuid | sí |  |
| produccion_item_id | uuid | sí |  |
| orden_retiro_id | uuid | sí |  |

### stock_recuento_items

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| recuento_id | uuid | no |  |
| insumo_id | uuid | no |  |
| lote | text | sí |  |
| cantidad_contada | numeric | sí |  |
| cantidad_sistema | numeric | sí |  |
| diferencia | numeric | sí |  |
| observacion | text | sí |  |
| created_at | timestamp with time zone | no | now() |
| contenido_por_bulto | numeric | sí |  |

### stock_recuentos

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| unidad_negocio_id | uuid | no |  |
| estado | text | no | 'abierto'::text |
| observaciones | text | sí |  |
| abierto_por | uuid | no |  |
| abierto_en | timestamp with time zone | no | now() |
| cerrado_por | uuid | sí |  |
| cerrado_en | timestamp with time zone | sí |  |
| anulado_por | uuid | sí |  |
| anulado_en | timestamp with time zone | sí |  |
| motivo_anulacion | text | sí |  |
| created_at | timestamp with time zone | no | now() |

### stock_terminado_movimientos

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| unidad_negocio_id | uuid | no |  |
| presentacion_id | uuid | no |  |
| marca_id | uuid | sí |  |
| lote | text | no |  |
| cajas | integer | no |  |
| unidades | integer | no |  |
| tipo | text | no |  |
| produccion_item_id | uuid | sí |  |
| empleado_id | uuid | sí |  |
| fecha | date | no |  |
| motivo | text | sí |  |
| created_at | timestamp with time zone | no | now() |
| orden_retiro_id | uuid | sí |  |

### stock_transferencia_items

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| transferencia_id | uuid | no |  |
| insumo_id | uuid | no |  |
| lote | text | sí |  |
| contenido_por_bulto | numeric | sí |  |
| cantidad_enviada | numeric | no |  |
| cantidad_recibida | numeric | sí |  |
| motivo_diferencia | text | sí |  |

### stock_transferencias

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| unidad_origen_id | uuid | no |  |
| unidad_destino_id | uuid | no |  |
| estado | text | no | 'pendiente'::text |
| fecha | date | no | CURRENT_DATE |
| observaciones | text | sí |  |
| creado_por | uuid | no |  |
| respondido_por | uuid | sí |  |
| respondido_en | timestamp with time zone | sí |  |
| motivo_rechazo | text | sí |  |
| created_at | timestamp with time zone | no | now() |

### taller_tarea_personas

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| tarea_id | uuid | no |  |
| empleado_id | uuid | no |  |

### taller_tareas

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| proyecto_id | uuid | sí |  |
| titulo | text | no |  |
| descripcion | text | sí |  |
| estado | text | no | 'por_hacer'::text |
| fecha_inicio | date | sí |  |
| dias | integer | sí |  |
| fecha_fin_real | date | sí |  |
| prioridad | integer | no | 2 |
| orden | integer | no | 0 |
| horas_estimadas | numeric | sí |  |
| motivo_bloqueo | text | sí |  |
| creada_por | uuid | sí |  |
| creada_en | timestamp with time zone | no | now() |
| actualizada_en | timestamp with time zone | sí |  |
| avance_pct | integer | no | 0 |
| nombre_corto | text | sí |  |

### taller_valor_hora

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| valor | numeric | no |  |
| vigente_desde | date | no |  |
| cargado_por | uuid | sí |  |
| cargado_en | timestamp with time zone | no | now() |

### turno_operarios

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| turno_id | uuid | no |  |
| empleado_id | uuid | no |  |
| desde | timestamp with time zone | no | now() |
| hasta | timestamp with time zone | sí |  |

### turnos_produccion

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| lote | integer | no |  |
| unidad_negocio_id | uuid | no |  |
| maquina_id | uuid | no |  |
| fecha | date | no |  |
| turno | text | no |  |
| encargado_id | uuid | sí |  |
| estado | text | no | 'abierto'::text |
| abierto_por | uuid | sí |  |
| abierto_en | timestamp with time zone | no | now() |
| cerrado_por | uuid | sí |  |
| cerrado_en | timestamp with time zone | sí |  |
| hora_inicio | time without time zone | sí |  |
| hora_apagado | time without time zone | sí |  |
| scrap_kg | numeric | sí |  |
| observaciones | text | sí |  |
| forzado_por | uuid | sí |  |
| forzado_en | timestamp with time zone | sí |  |
| forzado_motivo | text | sí |  |
| completado_por | uuid | sí |  |
| completado_en | timestamp with time zone | sí |  |

### unidades_negocio

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| nombre | text | no |  |
| ciudad | text | sí |  |
| activo | boolean | no | true |
| created_at | timestamp with time zone | no | now() |
| caja_predeterminada_id | uuid | sí |  |
| es_prueba | boolean | no | false |
| razon_social | text | sí |  |
| cuit | text | sí |  |
| domicilio | text | sí |  |
| telefono | text | sí |  |
| logo_url | text | sí |  |
| prefijo | text | sí |  |

### v_caja_saldos (vista)

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| empleado_id | uuid | sí |  |
| moneda | text | sí |  |
| saldo | numeric | sí |  |

### v_caja_saldos_cuenta (vista)

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| cuenta_id | uuid | sí |  |
| saldo | numeric | sí |  |

### v_caja_saldos_medio (vista)

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| empleado_id | uuid | sí |  |
| moneda | text | sí |  |
| medio_pago | text | sí |  |
| saldo | numeric | sí |  |

### v_cobranzas (vista)

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | sí |  |
| empleado_id | uuid | sí |  |
| cliente | text | sí |  |
| cliente_normalizado | text | sí |  |
| fecha | date | sí |  |
| efectivo | numeric | sí |  |
| moneda | text | sí |  |
| comprobante_referencia | text | sí |  |
| observaciones | text | sí |  |
| estado | text | sí |  |
| procesada_por | uuid | sí |  |
| procesada_en | timestamp with time zone | sí |  |
| anulada_por | uuid | sí |  |
| anulada_en | timestamp with time zone | sí |  |
| motivo_anulacion | text | sí |  |
| created_at | timestamp with time zone | sí |  |
| total_cheques | numeric | sí |  |
| cantidad_cheques | integer | sí |  |
| total | numeric | sí |  |
| cargada_por_nombre | text | sí |  |
| procesada_por_nombre | text | sí |  |
| anulada_por_nombre | text | sí |  |
| editada | boolean | sí |  |
| unidad_negocio_id | uuid | sí |  |
| unidad_negocio_nombre | text | sí |  |

### v_cuenta_corriente_movimientos (vista)

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| proveedor_id | uuid | sí |  |
| unidad_negocio_id | uuid | sí |  |
| moneda | text | sí |  |
| fecha | date | sí |  |
| tipo | text | sí |  |
| monto | numeric | sí |  |
| factura_pendiente_id | uuid | sí |  |
| gasto_id | uuid | sí |  |
| credito_id | uuid | sí |  |
| referencia | text | sí |  |
| saldo_acumulado | numeric | sí |  |
| monto_informativo | numeric | sí |  |
| orden_desempate | timestamp with time zone | sí |  |

### v_empleados_publico (vista)

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | sí |  |
| nombre | text | sí |  |
| unidad_negocio_id | uuid | sí |  |
| tipo | text | sí |  |
| activo | boolean | sí |  |
| rol_app | text | sí |  |
| caja_raiz | boolean | sí |  |
| oculto_como_contraparte | boolean | sí |  |
| tiene_acceso | boolean | sí |  |

### v_mermas (vista)

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| unidad_negocio_id | uuid | sí |  |
| unidad_nombre | text | sí |  |
| fecha | date | sí |  |
| mes | date | sí |  |
| insumo_id | uuid | sí |  |
| insumo_nombre | text | sí |  |
| marca | text | sí |  |
| unidad_medida | text | sí |  |
| lote | text | sí |  |
| cantidad | numeric | sí |  |
| origen | text | sí |  |
| motivo_tipo | text | sí |  |
| motivo_texto | text | sí |  |
| empleado_id | uuid | sí |  |

### v_mis_unidades_ajuste (vista)

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | sí |  |
| nombre | text | sí |  |
| ciudad | text | sí |  |

### v_mis_unidades_baja (vista)

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | sí |  |
| nombre | text | sí |  |
| ciudad | text | sí |  |

### v_mis_unidades_envio (vista)

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | sí |  |
| nombre | text | sí |  |
| ciudad | text | sí |  |

### v_mis_unidades_recepcion (vista)

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | sí |  |
| nombre | text | sí |  |
| ciudad | text | sí |  |

### v_mis_unidades_stock (vista)

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | sí |  |
| nombre | text | sí |  |
| ciudad | text | sí |  |

### v_recuentos (vista)

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | sí |  |
| unidad_negocio_id | uuid | sí |  |
| unidad_nombre | text | sí |  |
| estado | text | sí |  |
| abierto_en | timestamp with time zone | sí |  |
| cerrado_en | timestamp with time zone | sí |  |
| observaciones | text | sí |  |
| motivo_anulacion | text | sí |  |
| abierto_por_nombre | text | sí |  |
| cerrado_por_nombre | text | sí |  |
| items | bigint | sí |  |
| con_diferencia | bigint | sí |  |

### v_saldo_proveedor (vista)

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| proveedor_id | uuid | sí |  |
| unidad_negocio_id | uuid | sí |  |
| moneda | text | sí |  |
| deuda_pendiente | numeric | sí |  |
| credito_disponible | numeric | sí |  |

### v_stock_en_transito (vista)

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | sí |  |
| unidad_origen_id | uuid | sí |  |
| origen_nombre | text | sí |  |
| unidad_destino_id | uuid | sí |  |
| destino_nombre | text | sí |  |
| fecha | date | sí |  |
| creado_por | uuid | sí |  |
| created_at | timestamp with time zone | sí |  |
| dias_en_transito | integer | sí |  |
| items | bigint | sí |  |

### v_stock_insumos (vista)

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| unidad_negocio_id | uuid | sí |  |
| insumo_id | uuid | sí |  |
| insumo_nombre | text | sí |  |
| marca | text | sí |  |
| unidad_medida | text | sí |  |
| tipo | text | sí |  |
| tolerancia_merma_pct | numeric | sí |  |
| cantidad_total | numeric | sí |  |
| lotes_distintos | bigint | sí |  |
| presentaciones | bigint | sí |  |
| contenido_unico | numeric | sí |  |
| kilos_sueltos | numeric | sí |  |
| categoria | text | sí |  |
| aclaracion | text | sí |  |
| vista_preferida | text | sí |  |

### v_stock_negativo (vista)

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| unidad_negocio_id | uuid | sí |  |
| insumo_id | uuid | sí |  |
| insumo_nombre | text | sí |  |
| marca | text | sí |  |
| unidad_medida | text | sí |  |
| tipo | text | sí |  |
| lote | text | sí |  |
| contenido_por_bulto | numeric | sí |  |
| saldo | numeric | sí |  |
| desde | date | sí |  |
| aclaracion | text | sí |  |

### v_stock_por_lote (vista)

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| unidad_negocio_id | uuid | sí |  |
| insumo_id | uuid | sí |  |
| insumo_nombre | text | sí |  |
| marca | text | sí |  |
| unidad_medida | text | sí |  |
| tipo | text | sí |  |
| lote | text | sí |  |
| contenido_por_bulto | numeric | sí |  |
| saldo | numeric | sí |  |
| desde | date | sí |  |
| aclaracion | text | sí |  |

### v_transferencias (vista)

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | sí |  |
| estado | text | sí |  |
| fecha | date | sí |  |
| unidad_origen_id | uuid | sí |  |
| origen_nombre | text | sí |  |
| unidad_destino_id | uuid | sí |  |
| destino_nombre | text | sí |  |
| observaciones | text | sí |  |
| motivo_rechazo | text | sí |  |
| respondido_en | timestamp with time zone | sí |  |
| creado_por_nombre | text | sí |  |
| respondido_por_nombre | text | sí |  |
| items | bigint | sí |  |
| items_con_diferencia | bigint | sí |  |

### vehiculos

| Columna | Tipo | Nula | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| nombre | text | no |  |
| patente | text | sí |  |
| unidad_negocio_id | uuid | sí |  |
| activo | boolean | no | true |
| created_at | timestamp with time zone | no | now() |
| marca | text | sí |  |

## Funciones

`D` = SECURITY DEFINER. `anon` / `auth` = quién la puede ejecutar.

| Función | Devuelve | D | anon | auth |
|---|---|---|---|---|
| `_asignar_lote()` | trigger | D |  |  |
| `_chequear_masa_chocolate(p_turno_id uuid, p_presentacion_id uuid)` | void | D |  |  |
| `_chequeo_chocolate_tras_anular()` | trigger | D |  |  |
| `_chocolate_sin_masa(p_turno_id uuid)` | boolean | D |  |  |
| `_clave_nombre(p text)` | text |  |  | sí |
| `_cobranza_cheque_proteger_salida()` | trigger |  |  |  |
| `_cobranza_escribir_detalle(p_cobranza_id uuid, p_fotos jsonb, p_cheques jsonb)` | void | D |  |  |
| `_cobranza_estado_texto(p text)` | text |  |  | sí |
| `_cobranza_hoy_ar()` | date |  |  |  |
| `_cobranza_snapshot(p_id uuid)` | jsonb | D |  |  |
| `_cobranza_validar_cabecera(p_id uuid, p_cliente text, p_fecha date, p_efectivo numeric, p_comprobante_referencia text, p_observaciones text)` | void |  |  |  |
| `_descontar_empaque(p_item_id uuid, p_cajas_delta numeric)` | void | D |  |  |
| `_gasto_autovincular_ingreso()` | trigger | D |  |  |
| `_ingreso_sin_stock_inmutable()` | trigger |  |  |  |
| `_lotes_con_stock(p_unidad uuid, p_insumo uuid)` | jsonb | D |  |  |
| `_masa_anterior(p_maquina_id uuid, p_tipo_masa text)` | uuid | D |  |  |
| `_masa_item_descontar_stock()` | trigger | D |  |  |
| `_motivo_masa()` | trigger | D |  |  |
| `_numerar_orden_retiro()` | trigger | D |  |  |
| `_pin_valido(p text)` | boolean |  |  |  |
| `_puede_ser_maestro(p_empleado_id uuid)` | boolean | D |  |  |
| `_puede_taller(p_tarea text)` | boolean | D |  |  |
| `_receta_vigente(p_maquina_id uuid, p_tipo_masa text)` | uuid | D |  |  |
| `_total_cobranza(p_id uuid)` | numeric | D |  |  |
| `_valor_hora(p_fecha date)` | numeric | D |  |  |
| `_ve_produccion_en(p_unidad uuid)` | boolean | D |  | sí |
| `_ve_turno(p_turno uuid)` | boolean | D |  | sí |
| `abrir_recuento(p_unidad_negocio_id uuid)` | uuid | D |  | sí |
| `abrir_turno(p_maquina_id uuid, p_fecha date, p_turno text, p_encargado_id uuid, p_operarios uuid[])` | jsonb | D |  | sí |
| `abrir_turnos(p_fecha date, p_turno text, p_encargado_id uuid, p_maquinas jsonb)` | jsonb | D |  | sí |
| `actualizar_contacto_emergencia(p_empleado_id uuid, p_nombre text, p_telefono text)` | void | D |  | sí |
| `actualizar_permisos_empleado(p_empleado_id uuid, p_modulos text[], p_tareas jsonb)` | void | D |  | sí |
| `agregar_interes_factura(p_factura_id uuid, p_monto numeric, p_observaciones text, p_base_calculo text, p_tasa_pct numeric, p_tasa_periodo text, p_dias_transcurridos integer, p_fecha date)` | void | D |  | sí |
| `agregar_item_recuento(p_recuento_id uuid, p_insumo_id uuid, p_lote text, p_contenido_por_bulto numeric)` | uuid | D |  | sí |
| `agregar_nota_proyecto(p_proyecto_id uuid, p_texto text)` | void | D |  | sí |
| `agregar_operario_turno(p_turno_id uuid, p_empleado_id uuid)` | void | D |  | sí |
| `agregar_produccion_item(p_turno_id uuid, p_presentacion_id uuid, p_marca_id uuid, p_cajas integer, p_motivo text)` | jsonb | D |  | sí |
| `ajustar_cuenta_cliente(p_cliente_id uuid, p_importe numeric, p_observacion text)` | void | D |  | sí |
| `anular_cobranza(p_id uuid, p_motivo text)` | void | D |  | sí |
| `anular_factura_pendiente(factura_id uuid)` | void | D |  | sí |
| `anular_gasto(p_gasto_id uuid, p_motivo text)` | void | D |  | sí |
| `anular_horas_proyecto(p_horas_id uuid)` | void | D |  | sí |
| `anular_masa(p_masa_id uuid, p_motivo text)` | void | D |  | sí |
| `anular_orden_retiro(p_orden_id uuid, p_motivo text)` | void | D |  | sí |
| `anular_produccion_item(p_item_id uuid, p_motivo text)` | void | D |  | sí |
| `anular_recuento(p_recuento_id uuid, p_motivo text)` | void | D |  | sí |
| `aplicar_credito_a_factura(p_credito_id uuid, p_factura_pendiente_id uuid, p_monto numeric)` | void | D |  | sí |
| `aprobar_proveedor(p_proveedor_id uuid)` | void | D |  | sí |
| `aprobar_solicitud_acceso(p_solicitud_id uuid, p_modulos text[], p_tareas jsonb, p_unidad_negocio_id uuid)` | void | D |  | sí |
| `asentar_cobranza(p_id uuid, p_cliente_id uuid, p_proyecto_id uuid)` | jsonb | D |  | sí |
| `asignar_mi_pin_maestro(p_pin text)` | void | D |  | sí |
| `asignar_pin_con_maestro(p_empleado_id uuid, p_pin text, p_maestro_id uuid, p_maestro_pin text)` | jsonb | D |  | sí |
| `asignar_pin_produccion(p_empleado_id uuid, p_pin text)` | void | D |  | sí |
| `asignar_proveedor_factura_pendiente(p_factura_id uuid, p_proveedor_id uuid)` | void | D |  | sí |
| `asignar_unidad_cobranza(p_id uuid, p_unidad_negocio_id uuid)` | void | D |  | sí |
| `borrar_parada(p_parada_id uuid, p_motivo text)` | void | D |  | sí |
| `buscar_cheque_cargado(p_banco_codigo text, p_numero text, p_sucursal_codigo text, p_cuenta text, p_excluir_cobranza_id uuid)` | TABLE(cobranza_id uuid, fecha date, cargada_por text, importe numeric, coincide_completo boolean) | D |  | sí |
| `buscar_clientes(p_busqueda text, p_unidad_negocio_id uuid)` | jsonb | D |  | sí |
| `buscar_comprobante_cargado(p_proveedor_id uuid, p_numero_doc text, p_razon_social text, p_excluir_modulo text, p_excluir_id uuid)` | TABLE(modulo text, registro_id uuid, numero_doc text, razon_social text, fecha date, unidad_negocio_id uuid, importe numeric) | D |  | sí |
| `buscar_empleado_por_cuil(p_cuil text)` | TABLE(nombre text, rol text) | D |  |  |
| `cambiar_activo_cliente(p_cliente_id uuid, p_activo boolean)` | void | D |  | sí |
| `cambiar_caja_predeterminada(p_unidad_negocio_id uuid, p_insumo_id uuid)` | void | D |  | sí |
| `cambiar_color_producto(p_producto_id uuid, p_color text)` | void | D |  | sí |
| `cambiar_estado_pedido(p_pedido_id uuid, p_estado text, p_motivo text)` | void | D |  | sí |
| `cambiar_pin_produccion(p_empleado_id uuid, p_unidad_negocio_id uuid, p_pin_actual text, p_pin_nuevo text)` | jsonb | D |  | sí |
| `cancelar_solicitud_movimiento_caja(p_solicitud_id uuid)` | void | D |  | sí |
| `cancelar_transferencia_stock(p_transferencia_id uuid)` | void | D |  | sí |
| `cargar_horas_proyecto(p_proyecto_id uuid, p_empleado_id uuid, p_fecha date, p_horas numeric, p_tarea text)` | uuid | D |  | sí |
| `cargar_horas_tarea(p_tarea_id uuid, p_fecha date, p_horas numeric, p_empleado_id uuid, p_nota text)` | uuid | D |  | sí |
| `cargar_proyecto_a_fabrica(p_proyecto_id uuid, p_importe numeric, p_concepto text, p_fecha date)` | void | D |  | sí |
| `catalogo_para_retiro(p_unidad_negocio_id uuid)` | jsonb | D |  | sí |
| `cerrar_recuento(p_recuento_id uuid, p_clase text)` | jsonb | D |  | sí |
| `cerrar_sesiones(p_empleado_id uuid, p_motivo text)` | jsonb | D |  | sí |
| `cerrar_turno(p_turno_id uuid, p_hora_apagado time without time zone, p_scrap_kg numeric, p_observaciones text, p_productos jsonb)` | jsonb | D |  | sí |
| `cheque_plazo_presentacion(p_tipo text, p_emision date, p_pago date)` | date |  |  | sí |
| `clientes_con_saldo(p_unidad_negocio_id uuid, p_incluir_apagados boolean)` | TABLE(cliente_id uuid, nombre text, razon_social text, cuit text, lista text, saldo numeric, ultimo_movimiento date, retiros_mes integer, es_tambien_proveedor boolean, activo boolean, codigo_anterior integer) | D |  | sí |
| `cobranzas_por_asentar()` | jsonb | D |  | sí |
| `completar_datos_empleado(p_empleado_id uuid, p_rol text, p_unidad_negocio_id uuid, p_domicilio text, p_telefono text)` | void | D |  | sí |
| `completar_importe_factura(p_factura_id uuid, p_importe numeric)` | void | D |  | sí |
| `corregir_produccion_item(p_item_id uuid, p_cajas integer, p_motivo text)` | void | D |  | sí |
| `corregir_produccion_item_completo(p_item_id uuid, p_datos jsonb, p_motivo text)` | void | D |  | sí |
| `crear_cuenta_caja(p_nombre text, p_medio text, p_moneda text, p_favorita boolean, p_empleado_id uuid, p_unidad_negocio_id uuid)` | uuid | D |  | sí |
| `crear_ingreso_desde_comprobante(p_origen text, p_id uuid)` | jsonb | D |  | sí |
| `crear_insumo(p_nombre text, p_marca text, p_unidad_medida text, p_tipo text, p_tolerancia_merma_pct numeric, p_aclaracion text, p_categoria text)` | uuid | D |  | sí |
| `crear_proveedor_activo(p_razon_social text, p_cuit text, p_nombre_fantasia text, p_direccion text)` | uuid | D |  | sí |
| `crear_proveedor_pendiente(p_razon_social text, p_cuit text, p_nombre_fantasia text)` | uuid | D |  | sí |
| `crear_proyecto(p_nombre text)` | uuid | D |  | sí |
| `crear_solicitud_movimiento_caja(p_tipo text, p_contraparte_empleado_id uuid, p_monto numeric, p_cuenta_propia_id uuid, p_cuenta_contraparte_id uuid, p_descripcion text, p_fecha date, p_empleado_propio_id uuid)` | text | D |  | sí |
| `crear_transferencia_stock(p_unidad_origen_id uuid, p_unidad_destino_id uuid, p_fecha date, p_observaciones text, p_items jsonb)` | uuid | D |  | sí |
| `cuenta_cliente(p_cliente_id uuid)` | TABLE(fecha date, tipo text, detalle text, importe numeric, saldo numeric, orden_retiro_id uuid) | D |  | sí |
| `dar_de_baja_empleado(p_empleado_id uuid, p_motivo text)` | jsonb | D |  | sí |
| `dar_de_baja_proyecto(p_proyecto_id uuid)` | void | D |  | sí |
| `datos_para_masa(p_turno_id uuid, p_tipo_masa text)` | jsonb | D |  | sí |
| `desactivar_cuenta_caja(p_cuenta_id uuid)` | void | D |  | sí |
| `desactivar_insumo(p_insumo_id uuid, p_activo boolean)` | void | D |  | sí |
| `descartar_ingreso_de_gasto(p_gasto_id uuid, p_motivo text)` | void | D |  | sí |
| `dv_bcra(p_digitos text)` | smallint |  |  | sí |
| `editar_cobranza(p_id uuid, p_cliente text, p_fecha date, p_efectivo numeric, p_comprobante_referencia text, p_observaciones text, p_fotos jsonb, p_cheques jsonb)` | jsonb | D |  | sí |
| `editar_datos_publicos_cuenta_caja(p_cuenta_id uuid, p_cbu text, p_numero_cuenta text, p_alias text)` | void | D |  | sí |
| `editar_factura_pendiente(p_factura_id uuid, p_proveedor_id uuid, p_razon_social text, p_importe numeric, p_moneda text, p_fecha_factura date, p_numero_comprobante text, p_categoria_id uuid, p_unidad_negocio_id uuid, p_lugar text, p_observaciones text)` | void | D |  | sí |
| `editar_insumo(p_insumo_id uuid, p_nombre text, p_marca text, p_unidad_medida text, p_tipo text, p_tolerancia_merma_pct numeric, p_estado_alta text, p_aclaracion text, p_categoria text, p_vista_preferida text)` | void | D |  | sí |
| `editar_parada(p_parada_id uuid, p_motivo text, p_inicio timestamp with time zone, p_fin timestamp with time zone)` | void | D |  | sí |
| `editar_proveedor(p_proveedor_id uuid, p_razon_social text, p_cuit text, p_nombre_fantasia text, p_direccion text)` | void | D |  | sí |
| `endosar_cheque_a_proveedor(p_cheque_id uuid, p_proveedor_id uuid, p_unidad_negocio_id uuid, p_fecha date, p_aplicaciones jsonb)` | jsonb | D |  | sí |
| `estado_pin_produccion(p_empleado_id uuid)` | jsonb | D |  | sí |
| `facturar_proyecto(p_proyecto_id uuid, p_importe numeric, p_concepto text, p_fecha date)` | void | D |  | sí |
| `facturas_sin_ingreso()` | TABLE(origen text, id uuid, fecha date, proveedor text, razon_social text, tipo_doc text, numero_doc text, importe numeric, moneda text, unidad_negocio_id uuid, unidad text, foto_url text) | D |  | sí |
| `fecha_inicio_circuito_stock()` | date |  |  | sí |
| `fn_espejar_stock_ingreso()` | trigger | D |  |  |
| `fn_espejar_stock_ingreso_cabecera()` | trigger | D |  |  |
| `fn_fecha_a_periodo(p_fecha date)` | text |  |  | sí |
| `fn_inicializar_saldo_pendiente()` | trigger |  |  |  |
| `fn_marcar_edicion_ingreso()` | trigger |  |  |  |
| `fn_sincronizar_caja_gasto()` | trigger | D |  |  |
| `fn_validar_item_materia_prima()` | trigger | D |  |  |
| `forzar_cierre_turno(p_turno_id uuid, p_persona_id uuid, p_motivo text)` | void | D |  | sí |
| `gastos_sin_ingreso()` | TABLE(gasto_id uuid, fecha date, proveedor_id uuid, razon_social text, numero_doc text, importe numeric, moneda text, unidad_negocio_id uuid, foto_url text) | D |  | sí |
| `generar_pines_iniciales(p_unidad_negocio_id uuid)` | TABLE(empleado_id uuid, nombre text, pin text) | D |  | sí |
| `guardar_cliente(p_id uuid, p_unidad_negocio_id uuid, p_nombre text, p_apodos text[], p_localidad text, p_telefono text, p_observaciones text, p_activo boolean)` | uuid | D |  | sí |
| `guardar_cobranza(p_id uuid, p_cliente text, p_fecha date, p_efectivo numeric, p_comprobante_referencia text, p_observaciones text, p_fotos jsonb, p_cheques jsonb)` | jsonb | D |  | sí |
| `guardar_conteo(p_items jsonb)` | void | D |  | sí |
| `guardar_empaque_presentacion(p_presentacion_id uuid, p_cajas jsonb, p_empaque jsonb)` | void | D |  | sí |
| `guardar_ficha_cliente(p_cliente_id uuid, p_datos jsonb)` | void | D |  | sí |
| `guardar_ingrediente(p_id uuid, p_nombre text, p_descuenta_stock boolean, p_orden integer, p_activo boolean)` | uuid | D |  | sí |
| `guardar_ingrediente_insumos(p_ingrediente_id uuid, p_insumo_ids uuid[])` | void | D |  | sí |
| `guardar_lista_precios(p_id uuid, p_unidad_negocio_id uuid, p_nombre text, p_moneda text, p_activa boolean)` | uuid | D |  | sí |
| `guardar_maquina(p_id uuid, p_unidad_negocio_id uuid, p_nombre text, p_activa boolean, p_orden integer)` | uuid | D |  | sí |
| `guardar_marca(p_id uuid, p_nombre text, p_activa boolean)` | uuid | D |  | sí |
| `guardar_mis_preferencias(p_datos jsonb)` | void | D |  | sí |
| `guardar_pedido(p_id uuid, p_unidad_negocio_id uuid, p_cliente_id uuid, p_fecha date, p_fecha_entrega date, p_observaciones text, p_items jsonb, p_texto_original text)` | jsonb | D |  | sí |
| `guardar_precios(p_lista_id uuid, p_vigente_desde date, p_items jsonb)` | jsonb | D |  | sí |
| `guardar_presentacion(p_id uuid, p_producto_id uuid, p_nombre text, p_con_cono boolean, p_media_caja boolean, p_empaque text, p_unidades_por_caja integer, p_activa boolean, p_orden integer)` | uuid | D |  | sí |
| `guardar_producto(p_id uuid, p_unidad_negocio_id uuid, p_nombre text, p_tipo_masa text, p_activo boolean, p_orden integer)` | uuid | D |  | sí |
| `guardar_proyecto(p_id uuid, p_datos jsonb)` | uuid | D |  | sí |
| `guardar_puestos(p_empleado_id uuid, p_unidad_negocio_id uuid, p_puestos text[])` | void | D |  | sí |
| `guardar_receta_original(p_maquina_id uuid, p_tipo_masa text, p_items jsonb, p_nota text)` | jsonb | D |  | sí |
| `guardar_tarea_taller(p_id uuid, p_datos jsonb)` | uuid | D |  | sí |
| `guardar_valor_hora(p_valor numeric, p_vigente_desde date)` | void | D |  | sí |
| `importar_empleados_naaloo(p_filas jsonb, p_unidad_negocio_id uuid)` | jsonb | D |  | sí |
| `importar_insumos_excel(p_filas jsonb)` | jsonb | D |  | sí |
| `importar_proveedores_excel(p_filas jsonb)` | jsonb | D |  | sí |
| `indicadores_produccion(p_unidad_negocio_id uuid, p_fecha date)` | jsonb | D |  | sí |
| `ingresos_sin_gasto()` | TABLE(ingreso_id uuid, fecha date, proveedor_id uuid, razon_social text, numero_doc text, unidad_negocio_id uuid, foto_url text, importe_ocr text) | D |  | sí |
| `iniciar_parada(p_turno_id uuid, p_motivo text)` | uuid | D |  | sí |
| `items_de_factura_pendiente(p_factura_id uuid)` | TABLE(insumo text, marca text, unidad_medida text, cantidad numeric, cantidad_bultos numeric, contenido_por_bulto numeric) | D |  | sí |
| `limpiar_fabrica_de_pruebas()` | jsonb | D |  | sí |
| `listar_factores_mfa(p_auth_user_id uuid)` | TABLE(id uuid, friendly_name text, status text) | D |  |  |
| `lotes_insumo_para_retiro(p_unidad_negocio_id uuid, p_insumo_id uuid)` | TABLE(lote text, cantidad numeric, desde date) | D |  | sí |
| `lotes_para_retiro(p_unidad_negocio_id uuid, p_presentacion_id uuid, p_marca_id uuid)` | TABLE(lote text, cajas integer, desde date) | D |  | sí |
| `lotes_sin_ingreso(p_unidad_negocio_id uuid)` | jsonb | D |  | sí |
| `marcar_avance_pedido(p_item_id uuid, p_cajas_cumplidas numeric)` | jsonb | D |  | sí |
| `marcar_avance_tarea(p_id uuid, p_avance_pct integer)` | void | D |  | sí |
| `marcar_cobranza_asentada(p_id uuid, p_unidad_negocio_id uuid)` | void | D |  | sí |
| `marcar_cobranza_procesada(p_id uuid)` | void | D |  | sí |
| `marcar_cuenta_favorita_caja(p_cuenta_id uuid)` | void | D |  | sí |
| `marcar_doble_bolsa(p_marca_id uuid, p_doble boolean)` | void | D |  | sí |
| `marcar_salida_cheque(p_cheque_id uuid, p_tipo text, p_fecha date, p_destino text)` | void | D |  | sí |
| `marcar_salida_cheques(p_cheque_ids uuid[], p_tipo text, p_fecha date, p_destino text)` | integer | D |  | sí |
| `mi_empleado_id()` | uuid | D |  | sí |
| `mi_rol_app()` | text | D |  | sí |
| `mi_sesion_produccion()` | jsonb | D |  | sí |
| `mis_ordenes_retiro(p_unidad_negocio_id uuid, p_desde date)` | jsonb | D |  | sí |
| `mis_pendientes()` | TABLE(modulo text, clave text, cantidad bigint, texto text) | D |  | sí |
| `mis_preferencias()` | jsonb | D |  | sí |
| `mis_unidades_retiro()` | TABLE(id uuid, nombre text, prefijo text, razon_social text, cuit text, domicilio text, telefono text, logo_url text) | D |  | sí |
| `mover_tarea_taller(p_id uuid, p_estado text, p_orden integer, p_motivo_bloqueo text)` | void | D |  | sí |
| `normalizar_numero_doc(p_texto text)` | text |  |  | sí |
| `normalizar_razon_social(p_texto text)` | text |  |  | sí |
| `normalizar_texto(p_texto text)` | text |  |  | sí |
| `obtener_mi_solicitud_acceso()` | TABLE(estado text) | D |  | sí |
| `otorgar_puesto_temporal(p_empleado_id uuid, p_unidad_negocio_id uuid, p_puesto text, p_hasta timestamp with time zone, p_maestro_id uuid, p_maestro_pin text)` | jsonb | D |  | sí |
| `pedidos_de(p_unidad_negocio_id uuid, p_desde date, p_hasta date, p_estado text)` | TABLE(id uuid, numero bigint, fecha date, fecha_entrega date, cliente text, estado text, cajas_pedidas numeric, cajas_cumplidas numeric, renglones integer, sin_interpretar integer, observaciones text) | D |  | sí |
| `personal_produccion(p_unidad_negocio_id uuid)` | TABLE(id uuid, nombre text, misma_unidad boolean, puestos text[], puestos_temporales text[], tiene_pin boolean, pin_temporal boolean, debe_cambiar_pin boolean, es_maestro boolean) | D |  | sí |
| `precio_vigente(p_lista_id uuid, p_presentacion_id uuid, p_fecha date)` | numeric | D |  |  |
| `precio_vigente_insumo(p_lista_id uuid, p_insumo_id uuid, p_fecha date)` | numeric | D |  |  |
| `presentaciones_sugeridas(p_proveedor_id uuid, p_insumo_ids uuid[])` | TABLE(insumo_id uuid, interpretacion text, presentaciones jsonb) | D |  | sí |
| `proponer_marca(p_nombre text)` | jsonb | D |  | sí |
| `proveedores_para_endoso(p_busqueda text)` | jsonb | D |  | sí |
| `proyectos_taller(p_solo_activos boolean)` | jsonb | D |  | sí |
| `puede_ver_produccion()` | boolean | D |  | sí |
| `que_falta_para_cerrar(p_turno_id uuid)` | jsonb | D |  | sí |
| `quitar_item_recuento(p_item_id uuid)` | void | D |  | sí |
| `quitar_operario_turno(p_turno_id uuid, p_empleado_id uuid)` | void | D |  | sí |
| `quitar_permiso(p_empleado_id uuid, p_modulo text, p_tarea text)` | void | D |  | sí |
| `reabrir_cobranza(p_id uuid, p_motivo text)` | void | D |  | sí |
| `reactivar_empleado(p_empleado_id uuid)` | void | D |  | sí |
| `reactivar_proyecto(p_proyecto_id uuid)` | void | D |  | sí |
| `rechazar_proveedor(p_proveedor_id uuid)` | void | D |  | sí |
| `registrar_ajuste_stock(p_unidad_negocio_id uuid, p_insumo_id uuid, p_lote text, p_cantidad numeric, p_motivo text, p_recuento_id uuid, p_contenido_por_bulto numeric, p_motivo_tipo text)` | uuid | D |  | sí |
| `registrar_archivo_proyecto(p_proyecto_id uuid, p_tipo text, p_nombre text, p_ruta text)` | uuid | D |  | sí |
| `registrar_baja_stock(p_unidad_negocio_id uuid, p_insumo_id uuid, p_lote text, p_cantidad numeric, p_motivo text, p_contenido_por_bulto numeric, p_motivo_tipo text)` | uuid | D |  | sí |
| `registrar_error_app(p_pantalla text, p_mensaje text, p_detalle text, p_url text, p_dispositivo text, p_evento text)` | void | D |  | sí |
| `registrar_factura_de_ingreso(p_ingreso_id uuid, p_importe numeric, p_moneda text)` | jsonb | D |  | sí |
| `registrar_ingreso_externo_caja(p_monto numeric, p_cuenta_id uuid, p_descripcion text, p_fecha date)` | uuid | D |  | sí |
| `registrar_ingreso_propio_caja(p_monto numeric, p_moneda text, p_medio_pago text, p_contraparte_empleado_id uuid, p_descripcion text, p_empleado_id uuid, p_fecha date)` | uuid | D |  | sí |
| `registrar_masa(p_turno_id uuid, p_tipo_masa text, p_doble boolean, p_masero_id uuid, p_items jsonb, p_client_uuid uuid, p_motivo text)` | jsonb | D |  | sí |
| `registrar_orden_retiro(p_cliente_id uuid, p_fecha date, p_transporte text, p_observaciones text, p_items jsonb, p_client_uuid uuid)` | jsonb | D |  | sí |
| `registrar_pago_directo_proveedor(p_gasto_id uuid, p_proveedor_id uuid, p_unidad_negocio_id uuid, p_moneda text, p_monto numeric, p_fecha date, p_categoria_id uuid, p_numero_comprobante text)` | void | D |  | sí |
| `registrar_pago_proveedor(p_proveedor_id uuid, p_unidad_negocio_id uuid, p_moneda text, p_monto numeric, p_medio_pago text, p_cuenta_id uuid, p_empleado_id uuid, p_fecha_pago date, p_aplicaciones jsonb)` | uuid | D |  | sí |
| `registrar_parada(p_turno_id uuid, p_motivo text, p_inicio timestamp with time zone, p_fin timestamp with time zone)` | jsonb | D |  | sí |
| `registrar_produccion_item(p_turno_id uuid, p_presentacion_id uuid, p_marca_id uuid, p_cajas integer, p_caja_insumo_id uuid, p_embolsado text)` | jsonb | D |  | sí |
| `registrar_retiro_caja(p_monto numeric, p_cuenta_id uuid, p_descripcion text, p_fecha date)` | uuid | D |  | sí |
| `registrar_saldo_inicial_cliente(p_cliente_id uuid, p_importe numeric, p_fecha date, p_observacion text)` | void | D |  | sí |
| `registrar_traspaso_cuenta_caja(p_cuenta_origen_id uuid, p_cuenta_destino_id uuid, p_monto_origen numeric, p_monto_destino numeric, p_fecha date, p_empleado_id uuid)` | void | D |  | sí |
| `remitos_sin_facturar(p_proveedor_id uuid)` | TABLE(ingreso_id uuid, fecha date, numero_doc text, unidad_negocio_id uuid, items bigint) | D |  | sí |
| `remitos_vinculables(p_unidad_negocio_id uuid, p_proveedor_id uuid)` | TABLE(id uuid, fecha date, numero_doc text, razon_social text, items jsonb) | D |  | sí |
| `renombrar_cuenta_caja(p_cuenta_id uuid, p_nuevo_nombre text)` | void | D |  | sí |
| `resolver_faltante_retiro(p_item_id uuid, p_motivo text)` | void | D |  | sí |
| `responder_solicitud_movimiento_caja(p_solicitud_id uuid, p_aceptar boolean, p_motivo_rechazo text)` | void | D |  | sí |
| `responder_transferencia_stock(p_transferencia_id uuid, p_respuesta text, p_items jsonb, p_motivo_rechazo text)` | jsonb | D |  | sí |
| `resumen_cobranzas(p_clave text, p_desde date, p_hasta date, p_estado text, p_repartidor uuid, p_unidad uuid)` | TABLE(por_controlar bigint, cantidad bigint, total numeric) |  |  | sí |
| `resumen_proyecto(p_proyecto_id uuid)` | jsonb | D |  | sí |
| `retiros_por_revisar(p_unidad_negocio_id uuid)` | jsonb | D |  | sí |
| `revisar_marca(p_marca_id uuid, p_aprobar boolean, p_nombre text)` | void | D |  | sí |
| `revocar_puesto_temporal(p_id uuid)` | void | D |  | sí |
| `scrap_de_referencia(p_turno_id uuid)` | jsonb | D |  | sí |
| `sesiones_de(p_empleado_id uuid)` | TABLE(creada timestamp with time zone, ultima_actividad timestamp with time zone, dispositivo text, ip text) | D |  | sí |
| `sincronizar_pago_directo_proveedor(p_gasto_id uuid, p_importe numeric, p_moneda text, p_fecha date, p_categoria_id uuid, p_numero_comprobante text, p_razon_social text)` | void | D |  | sí |
| `stock_para_masa(p_turno_id uuid)` | jsonb | D |  | sí |
| `sugerir_facturas_fifo(p_proveedor_id uuid, p_unidad_negocio_id uuid, p_moneda text, p_monto numeric)` | TABLE(factura_pendiente_id uuid, fecha_factura date, numero_comprobante text, saldo_pendiente numeric, monto_a_aplicar numeric) | D |  | sí |
| `sumar_permiso(p_empleado_id uuid, p_modulo text, p_tarea text, p_unidades uuid[])` | void | D |  | sí |
| `tareas_taller(p_desde date, p_hasta date, p_empleado_id uuid, p_proyecto_id uuid)` | jsonb | D |  | sí |
| `terminar_parada(p_parada_id uuid)` | void | D |  | sí |
| `tiene_cuenta_corriente_activa(p_proveedor_id uuid)` | boolean | D |  | sí |
| `tiene_puesto_produccion(p_empleado_id uuid, p_unidad uuid, p_puesto text)` | boolean | D |  |  |
| `tiene_tarea(p_modulo text, p_tarea text)` | boolean | D |  | sí |
| `tiene_tarea_alcance(p_modulo text, p_tarea text, p_unidad_negocio_id uuid)` | boolean | D |  | sí |
| `tiene_tarea_explicita(p_modulo text, p_tarea text)` | boolean | D |  | sí |
| `unidad_restringe_puesto(p_unidad uuid, p_puesto text)` | boolean | D |  |  |
| `valorizar_orden_retiro(p_orden_id uuid, p_precios jsonb)` | jsonb | D |  | sí |
| `verificar_pin_maestro(p_empleado_id uuid, p_pin text)` | jsonb | D |  | sí |
| `verificar_pin_produccion(p_empleado_id uuid, p_unidad_negocio_id uuid, p_puesto text, p_pin text)` | jsonb | D |  | sí |
| `vincular_ingreso_a_gasto(p_ingreso_id uuid, p_gasto_id uuid)` | void | D |  | sí |
| `volver_cheque_a_cartera(p_cheque_id uuid, p_motivo text)` | void | D |  | sí |
