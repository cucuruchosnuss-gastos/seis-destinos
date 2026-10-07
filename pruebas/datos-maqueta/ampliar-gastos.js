// Datos de la maqueta: el botón "Ampliar" de Gastos (06/10/2026, js/ampliar.js).
// Ver pruebas/datos-maqueta/README.md. Parte de los datos de Gastos
// (gastos.js) SIN cambiarlos, y suma un gasto con observaciones largas y la
// foto del comprobante, para mirar la ventana grande (el resumen sin cortar y
// la grilla con la clasificación y el comprobante).
//
//   http://localhost:4180/modulos/gastos.html?maqueta=ampliar-gastos
'use strict';

const base = JSON.parse(JSON.stringify(require('./gastos')));
const t = base.tablas;
const molde = t.gastos[0];

t.gastos.unshift({
  ...molde,
  id: 'g-amp', razon_social: 'Ferretería del Centro', importe: 98765.43, fecha: '2026-09-28', fecha_pago: '2026-09-28',
  lugar_servicio: 'Av. Colón 1234, Córdoba',
  observaciones: 'Se compraron los repuestos de la máquina 2: rodamientos, una correa y tornillería. ' +
    'El proveedor avisó que la correa de repuesto llega la semana que viene; quedó pagada. ' +
    'Pedir factura A la próxima vez: esta vino como X y hay que reclamarla.',
  foto_url: 'uid-maqueta/comprobante-g-amp.jpg',
});

module.exports = base;
