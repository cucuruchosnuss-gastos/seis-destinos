// Maqueta "remitos-dolce-revisar" (28/10/2026): Remitos Dolce → Revisar. La
// misma de la revisión en Administración (administracion-remitos.js: Dolce
// Pasta sin control de stock, cinco remitos precargados y las órdenes con N°
// de remito), solo con lo que lee el módulo. Los remitos los subió Manuel
// (emp-2): así "Mis remitos subidos" de quien revisa queda vacío.
'use strict'
const base = JSON.parse(JSON.stringify(require('./administracion-remitos')))

const QUEDAN = ['empleados', 'empleado_modulos', 'empleado_tareas', 'unidades_negocio', 'clientes', 'productos_terminados',
  'producto_presentaciones', 'marcas_personalizadas', 'insumos', 'remitos_precarga', 'ordenes_retiro', 'v_empleados_publico']
for (const k of Object.keys(base.tablas)) if (!QUEDAN.includes(k)) delete base.tablas[k]
for (const f of base.tablas.remitos_precarga) {
  f.subido_por = 'emp-2'
  f.orden_codigo = f.orden_codigo ?? null
}
// 29/10/2026: un cliente de Dolce que ES Cucuruchos Nuss (orden interna, en tránsito): e2e 98.
base.tablas.clientes.push({ id: 'c-d-paz', unidad_negocio_id: 'u-d', nombre: 'Paz Mirta', razon_social: 'PAZ MIRTA', apodos: [], cuit: null, localidad: 'Córdoba',
  activo: true, codigo_anterior: null, limite_credito: null, proveedor_id: null, unidad_grupo_id: 'u-n' })

module.exports = base
