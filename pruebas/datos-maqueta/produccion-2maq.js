// Datos de la maqueta: produccion-2maq (la PLANTA con DOS máquinas abiertas,
// 01/10/2026). Ver pruebas/datos-maqueta/README.md.
//
// Son los datos de produccion.js con solo la Máquina 1 (lote 7033) y la
// Máquina 2 (lote 7034, parada) abiertas, y una receta para cada una. Los usa
// e2e/17-planta-pestanas.spec.js: las pestañas de las máquinas entran en una
// fila y cambiar de máquina deja en la misma sección.
'use strict';
const base = require('./produccion');

const d = JSON.parse(JSON.stringify(base));
d.tablas.turnos_produccion = d.tablas.turnos_produccion.filter(t => ['t1', 't2'].includes(t.id));
d.tablas.recetas = [
  ...d.tablas.recetas.filter(r => r.maquina_id === 'maq-1'),
  { id: 'rec-2', maquina_id: 'maq-2', tipo_masa: 'Común', version: 2 },
];

module.exports = d;
