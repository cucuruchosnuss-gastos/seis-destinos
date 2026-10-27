// Datos de la maqueta: el precio de compra en el Ingreso de materia prima
// (27/10/2026, rama ci-prueba/precios-compra). Ver
// pruebas/datos-maqueta/README.md.
//
// Parte de ingreso-terminado-mp.js SIN cambiarlo (lo usa e2e/65) y le suma a
// la Harina 000 su bulto: la "bolsa" de 25 kg (insumos.nombre_bulto y
// contenido_bulto), para escribir el precio como lo dice el papel ("$ 17.500
// la bolsa") y que se guarde por kg.
//
//   http://localhost:4180/modulos/materia-prima.html?maqueta=precios-compra-mp
'use strict';

const base = JSON.parse(JSON.stringify(require('./ingreso-terminado-mp')));
const harina = base.tablas.insumos.find(i => i.id === 'ins-harina');
harina.nombre_bulto = 'bolsa';
harina.contenido_bulto = 25;

module.exports = base;
