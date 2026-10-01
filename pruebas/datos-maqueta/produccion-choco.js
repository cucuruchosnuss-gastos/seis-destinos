// Datos de la maqueta: produccion-choco (la PLANTA con la masa anterior de
// CHOCOLATE y de número largo, 30/09/2026). Ver pruebas/datos-maqueta/README.md.
//
// Son los datos de produccion.js con una sola diferencia: la masa anterior de
// la Máquina 1 es la 128 y es de chocolate (cacao 0,65 kg del lote 3012). Con
// el reloj de la página en el día siguiente al de la maqueta (2100-01-01, ver
// e2e/8-planta-tamanos.spec.js), el botón "Anterior (última)" dibuja el texto
// más largo posible: "Masa 128 · ayer, turno Mañana · chocolate". La prueba de
// tamaños exige que los segmentos sigan en UNA fila y que registrar no mueva
// la receta.
'use strict';
const base = require('./produccion');

const d = JSON.parse(JSON.stringify(base));
const anterior = d.rpc.datos_para_masa.anterior;
anterior.nro = 128;
anterior.es_chocolate = true;
anterior.items = anterior.items.map(it => it.ingrediente_id === 'i-cacao'
  ? { ...it, insumo_id: 'ins-cac', lote: '3012', cantidad_simple_kg: 0.65 }
  : it);

module.exports = d;
