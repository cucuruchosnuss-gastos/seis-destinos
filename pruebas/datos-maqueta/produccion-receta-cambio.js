// Datos de la maqueta: produccion-receta-cambio (la PLANTA con la receta que
// CAMBIÓ en medio del turno, 30/09/2026). Ver pruebas/datos-maqueta/README.md.
//
// Son los datos de produccion.js con una sola diferencia: la masa anterior de
// la Máquina 1 (ma-3) se hizo con la receta v7 (rec-1) y la vigente es la v8
// (rec-2). En la v7 el bicarbonato estaba en 0 y llevaba mejorador; la v8
// lleva bicarbonato y ya no lleva mejorador. La anterior además tiene un
// "otro" escrito a mano. Así la sala de masa dibuja el caso más alto: el
// aviso "La receta cambió (v7 → v8) desde la masa anterior. Nuevo en la
// receta: bicarbonato. Ya no está en la receta: mejorador de masa.", el
// renglón "nuevo en la receta" y el "otro" de la anterior. Lo mide
// e2e/8-planta-tamanos.spec.js en cada push.
'use strict';
const base = require('./produccion');

const d = JSON.parse(JSON.stringify(base));
const V7 = d.rpc.datos_para_masa.original;
const V8 = { ...V7, receta_id: 'rec-2', version: 8 };

// La v7: bicarbonato en 0 y el mejorador, que la v8 no tiene.
const itemsV7 = V7.items.map(it => ({ ...it, cantidad_kg: it.ingrediente_id === 'i-bicarbonato' ? 0 : it.cantidad_kg }));
const MEJORADOR = { ingrediente_id: 'i-mejorador', ingrediente: 'Mejorador de masa', orden: 11, descuenta_stock: true, cantidad_kg: 0.1, insumo_preferido_id: null };

// La anterior (hecha con la v7): bicarbonato en 0, con mejorador y un "otro".
const anterior = d.rpc.datos_para_masa.anterior;
anterior.items = anterior.items.map(it => it.ingrediente_id === 'i-bicarbonato' ? { ...it, insumo_id: null, lote: null, cantidad_simple_kg: 0 } : it);
anterior.items.push(
  { ingrediente_id: 'i-mejorador', insumo_id: null, lote: null, cantidad_simple_kg: 0.1 },
  { ingrediente_id: null, ingrediente_libre: 'Gluten', insumo_id: null, lote: null, cantidad_simple_kg: 0.2 },
);
d.rpc.datos_para_masa.original = V8;

d.tablas.recetas = [
  { id: 'rec-1', maquina_id: 'maq-1', tipo_masa: 'Común', version: 7 },
  { id: 'rec-2', maquina_id: 'maq-1', tipo_masa: 'Común', version: 8 },
  { id: 'rec-4', maquina_id: 'maq-4', tipo_masa: 'Común', version: 3 },
];
d.tablas.receta_items = [
  ...[...itemsV7, MEJORADOR].map(it => ({ receta_id: 'rec-1', ingrediente_id: it.ingrediente_id, cantidad_kg: it.cantidad_kg, insumo_preferido_id: it.insumo_preferido_id })),
  ...V8.items.map(it => ({ receta_id: 'rec-2', ingrediente_id: it.ingrediente_id, cantidad_kg: it.cantidad_kg, insumo_preferido_id: it.insumo_preferido_id })),
];
d.tablas.ingredientes = [...d.tablas.ingredientes, { id: 'i-mejorador', nombre: 'Mejorador de masa', define_chocolate: false }];
// Las masas de la Máquina 1 anteriores a la receta nueva son de la v7.
d.tablas.masas = d.tablas.masas.map(m => m.turno_id === 't1' ? { ...m, receta_id: 'rec-1' } : { ...m, receta_id: 'rec-4' });

module.exports = d;
