// Datos de la maqueta y de las pruebas: Proyectos Taller como lo ve Edgar
// (ver, cargar y gestionar, SIN precios). Los mismos datos del diseño que
// taller-diseno.js. Ve los COSTOS y el valor de la hora, y NO la venta
// (decisión de Facu del 29/09/2026). Se genera a
// e2e/maqueta/datos/taller-edgar.json con `npm run maqueta:datos`.
'use strict';

const { tarea } = require('./comun');
const base = JSON.parse(JSON.stringify(require('./taller-diseno')));

base.email = 'edgar@seisdestinos.com';
base.meta = { nombre_completo: 'Edgar Molina' };
base.tablas.empleados = [
  { id: 'emp-edgar', auth_user_id: base.uid, nombre: 'Edgar Molina', rol_app: 'usuario', activo: true, unidad_negocio_id: 'u-t', es_prueba: false, es_dispositivo: false },
];
base.tablas.empleado_modulos = base.tablas.empleado_modulos.map(m => ({ ...m, empleado_id: 'emp-edgar' }));
base.tablas.empleado_tareas = [
  tarea('emp-edgar', 'taller', 'ver'), tarea('emp-edgar', 'taller', 'cargar'), tarea('emp-edgar', 'taller', 'gestionar'),
  tarea('emp-edgar', 'stock', 'ver', { todas: true }),
];
// proyectos_taller y resumen_proyecto no mandan la venta sin taller:precios.
const SIN_VENTA = ['precio_venta', 'facturado', 'cobrado', 'margen', 'margen_pct'];
const sinVenta = o => Object.fromEntries(Object.entries(o).filter(([k]) => !SIN_VENTA.includes(k)));
base.rpc.proyectos_taller = base.rpc.proyectos_taller.map(sinVenta);
base.rpc.resumen_proyecto.__segun = base.rpc.resumen_proyecto.__segun.map(c => ({ ...c, r: sinVenta(c.r) }));
base.rpc.resumen_proyecto.__defecto = sinVenta(base.rpc.resumen_proyecto.__defecto);

module.exports = base;
