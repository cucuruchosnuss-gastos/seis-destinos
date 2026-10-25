// Datos de la maqueta: la producción propia en el ingreso de producto
// terminado (24/10/2026). Ver pruebas/datos-maqueta/README.md. Parte de los
// datos del ingreso (ingreso-terminado.js) SIN cambiarlos y les suma: el
// permiso de ingresar también en Dolce Pasta, el "Cono dulce" de Dolce con
// origen_tipo 'fabrica' (se hace ahí, como los 7 barquillos reales) y con un
// lote vigente (igual NO se pregunta: cada tanda trae el suyo), y unos Ñoquis
// sin origen (no eligen nada solos).
//
//   http://localhost:4180/modulos/produccion-gestion.html?vista=stock&maqueta=ingreso-produccion-propia
'use strict';

const base = JSON.parse(JSON.stringify(require('./ingreso-terminado')));
const t = base.tablas;

const ingreso = t.empleado_tareas.find(x => x.modulo === 'materia_prima' && x.tarea === 'cargar');
ingreso.alcance = { unidades: ['u-n', 'u-d'] };

const cono = t.productos_terminados.find(p => p.id === 'p-d1');
cono.origen_tipo = 'fabrica';
t.productos_terminados.push({ id: 'p-d2', unidad_negocio_id: 'u-d', nombre: 'Ñoquis', tipo_masa: null, activo: true, orden: 2, origen_tipo: null });
t.producto_presentaciones.push(
  { id: 'pr-d1', producto_id: 'p-d1', nombre: 'Caja x 120', con_cono: false, media_caja: false, empaque: null, unidades_por_caja: 120, activa: true, orden: 1 },
  { id: 'pr-d2', producto_id: 'p-d2', nombre: 'Bolsa x 10', con_cono: false, media_caja: false, empaque: null, unidades_por_caja: 10, activa: true, orden: 1 },
);
t.producto_lote_vigente.push({ unidad_negocio_id: 'u-d', producto_id: 'p-d1', lote: 'B-0910', actualizado_por: t.empleados[0].id, actualizado_en: '2026-10-10T12:00:00Z' });
base.rpc.ingresar_producto_terminado = { ingreso_id: 'ing-2', renglones: 1, cajas: 8, importe: 0 };

module.exports = base;
