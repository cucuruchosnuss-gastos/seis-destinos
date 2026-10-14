// Datos de la maqueta: ingreso de producto terminado (14/10/2026). Ver
// pruebas/datos-maqueta/README.md. Parte de los datos de la gestión de
// Producción (produccion-gestion.js) SIN cambiarlos y les suma: la tarea
// materia_prima:cargar en Cucuruchos Nuss (lo que pide la base para cargar un
// ingreso), dos proveedores, el lote vigente del Mini y las respuestas de
// ingresar_producto_terminado y guardar_lote_vigente.
//
//   http://localhost:4180/modulos/produccion-gestion.html?vista=stock&maqueta=ingreso-terminado
'use strict';

const { tarea } = require('./comun');

const base = JSON.parse(JSON.stringify(require('./produccion-gestion')));
const t = base.tablas;
const EMP = t.empleados[0].id;

t.empleado_tareas.push(tarea(EMP, 'materia_prima', 'cargar', { unidades: ['u-n'] }));
t.proveedores = [
  { id: 'prov-1', razon_social: 'RODRIGO CAPELINAS SRL', nombre_fantasia: 'Rodrigo', cuit: '30712345678', activo: true, estado_alta: 'activo' },
  { id: 'prov-2', razon_social: 'DISTRIBUIDORA ANATOLIA SRL', nombre_fantasia: null, cuit: '30700000001', activo: true, estado_alta: 'activo' },
];
t.producto_lote_vigente = [
  { unidad_negocio_id: 'u-n', producto_id: 'p1', lote: 'L-1013', actualizado_por: EMP, actualizado_en: '2026-10-13T12:00:00Z' },
];
base.rpc = base.rpc ?? {};
base.rpc.ingresar_producto_terminado = { ingreso_id: 'ing-1', renglones: 1, cajas: 12, importe: 0 };
base.rpc.guardar_lote_vigente = null;

module.exports = base;
