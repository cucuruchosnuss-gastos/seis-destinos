// Datos de la maqueta: los insumos de una lista de precios a precio fijo o a
// costo + % (09/10/2026). Ver pruebas/datos-maqueta/README.md. Parte de los
// datos de Administración (administracion.js) SIN cambiarlos —las otras
// pruebas los usan tal cual— y suma stock:ver_costos en Nuss, una tercera
// insumo (sin costo cargado) y las respuestas de precios_insumos_lista y
// costos_insumos.
//
//   http://localhost:4180/modulos/administracion.html?maqueta=administracion-costos
'use strict';

const base = JSON.parse(JSON.stringify(require('./administracion')));
const t = base.tablas;
const EMP = t.empleados[0].id;

t.empleado_tareas.push({ empleado_id: EMP, modulo: 'stock', tarea: 'ver_costos', alcance: { unidades: ['u-n'] }, habilitado: true });
t.insumos.push({ id: 'ins-3', nombre: 'Azúcar', marca: null, unidad_medida: 'kg', categoria: 'Azúcares y secos', activo: true });

// Como devuelve la base: los numeric como texto.
base.rpc.precios_insumos_lista = [
  { insumo_id: 'ins-1', insumo: 'Harina 000', unidad_medida: 'kg', precio_unitario: '1500', tipo: 'fijo', recargo_costo_pct: null, vigente_desde: '2026-10-01', sin_costo: false },
  { insumo_id: 'ins-2', insumo: 'Caja N°1', unidad_medida: 'un', precio_unitario: '109.25', tipo: 'costo_mas_pct', recargo_costo_pct: '15', vigente_desde: '2026-10-01', sin_costo: false },
  { insumo_id: 'ins-3', insumo: 'Azúcar', unidad_medida: 'kg', precio_unitario: null, tipo: 'costo_mas_pct', recargo_costo_pct: '20', vigente_desde: '2026-10-01', sin_costo: true },
];
base.rpc.costos_insumos = [
  { insumo_id: 'ins-1', insumo: 'Harina 000', marca: 'Molino Cañuelas', categoria: 'Harinas', unidad_medida: 'kg', costo_unitario: '1000.0000', vigente_desde: '2026-10-01', cargado_por: 'Emanuel Romero', costo_anterior: null, variacion_pct: null },
  { insumo_id: 'ins-2', insumo: 'Caja N°1', marca: 'Nuss', categoria: 'Cajas', unidad_medida: 'un', costo_unitario: '95', vigente_desde: '2026-09-01', cargado_por: 'Emanuel Romero', costo_anterior: null, variacion_pct: null },
  { insumo_id: 'ins-3', insumo: 'Azúcar', marca: null, categoria: 'Azúcares y secos', unidad_medida: 'kg', costo_unitario: null, vigente_desde: null, cargado_por: null, costo_anterior: null, variacion_pct: null },
];
base.rpc.guardar_precio_insumo_lista = 'lpi-nuevo';

module.exports = base;
