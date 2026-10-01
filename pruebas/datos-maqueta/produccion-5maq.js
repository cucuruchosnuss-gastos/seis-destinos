// Datos de la maqueta: produccion-5maq (la PLANTA con CINCO máquinas
// abiertas, 01/10/2026). Ver pruebas/datos-maqueta/README.md.
//
// Son los datos de produccion.js con las cinco máquinas de la fábrica
// abiertas (lotes 7033 a 7037), la 2 y la 5 paradas, y una receta para cada
// una. Los usa e2e/17-planta-pestanas.spec.js: con cinco, las pestañas se
// achican y siguen entrando en UNA fila, sin scroll, a 1000 × 540.
'use strict';
const base = require('./produccion');

const d = JSON.parse(JSON.stringify(base));
const t1 = d.tablas.turnos_produccion.find(t => t.id === 't1');
d.tablas.turnos_produccion = [
  ...d.tablas.turnos_produccion,
  { ...t1, id: 't3', lote: 7036, maquina_id: 'maq-3' },
  { ...t1, id: 't5', lote: 7037, maquina_id: 'maq-5' },
].sort((a, b) => a.lote - b.lote);
d.tablas.recetas = [1, 2, 3, 4, 5].map(n => ({ id: `rec-${n}`, maquina_id: `maq-${n}`, tipo_masa: 'Común', version: n === 1 ? 7 : 3 }));
const parada1 = d.tablas.paradas_produccion.find(p => p.id === 'pa-1');
d.tablas.paradas_produccion = [...d.tablas.paradas_produccion, { ...parada1, id: 'pa-5', turno_id: 't5' }];

module.exports = d;
