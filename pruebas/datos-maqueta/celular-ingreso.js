// Datos de la maqueta: "Pagado sin ingresar" de Ingreso, para mirarlo en el
// celular (10/10/2026, e2e/31-vistas-faltantes.spec.js). Ver
// pruebas/datos-maqueta/README.md.
//
// Parte de materia-prima.js SIN cambiarlo (lo usan otras pruebas) y le suma la
// tarea materia_prima:editar_anular (así cada gasto ofrece también "No lleva
// ingreso", el segundo botón) y un gasto de un proveedor con razón social
// larga y número largo.
//
//   http://localhost:4180/modulos/materia-prima.html?maqueta=celular-ingreso
'use strict';

const base = JSON.parse(JSON.stringify(require('./materia-prima')));
const t = base.tablas;
const molde = t.empleado_tareas[0];
t.empleado_tareas.push({ ...molde, tarea: 'editar_anular' });
base.rpc.gastos_sin_ingreso.push({
  gasto_id: 'g-4', fecha: '2026-09-23', proveedor_id: null,
  razon_social: 'COOPERATIVA AGRÍCOLA GANADERA Y DE PROVISIÓN DEL SUR SANTAFESINO LIMITADA',
  numero_doc: '00012-00004567891', importe: 1234567.89, moneda: 'ARS', unidad_negocio_id: 'u-n', foto_url: null,
});

module.exports = base;
