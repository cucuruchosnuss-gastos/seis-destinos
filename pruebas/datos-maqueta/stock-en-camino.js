// Datos de la maqueta: "En camino desde otra empresa" en Stock (29/10/2026).
// Ver pruebas/datos-maqueta/README.md. La persona de stock.js (stock:ver en
// Nuss y Dolce) más stock:recibir_transferencia en Dolce Pasta; con Dolce en
// la barra vienen en camino una orden de Nuss (producto terminado e insumo) y
// una de Mengui (un insumo), y hay una recibida con una diferencia.
// recibir_orden_grupo responde que se recibió; e2e/97-stock-en-camino.spec.js
// la cambia en vivo (globalThis.__maqueta.rpc) para mirar el error de la base.
// "Recibidos" es de los últimos 30 días: la prueba de navegador pone la fecha
// de la recibida relativa a hoy (la de acá es fija).
//
//   http://localhost:4180/modulos/stock.html?maqueta=stock-en-camino
'use strict';

const base = JSON.parse(JSON.stringify(require('./stock')));

base.tablas.empleado_tareas.push({ empleado_id: 'emp-stock', modulo: 'stock', tarea: 'recibir_transferencia', alcance: { unidades: ['u-d'] }, habilitado: true });

const EN_TRANSITO = [
  {
    id: 'rec-1', estado: 'en_transito', creada_en: '2026-10-29T13:10:00Z', recibida_en: null, recibida_por: null,
    orden_id: 'o-31', codigo: 'N-0031', fecha: '2026-10-29', numero_remito: '0001-00001234', transporte: 'Camión de Ramón (AB 123 CD)',
    observaciones: null, origen_id: 'u-n', origen: 'Cucuruchos Nuss', destino_id: 'u-d', destino: 'Dolce Pasta',
    items: [
      { item_id: 'it-1', tipo: 'producto', descripcion: 'Cucurucho N°1 · Caja x 100 · Dolce Pasta', unidad: 'cajas', lote: 'L-2910', cantidad_enviada: 40, cantidad_recibida: null, motivo_diferencia: null },
      { item_id: 'it-2', tipo: 'insumo', descripcion: 'Harina 000 · Wali', unidad: 'kg', lote: 'H-778', cantidad_enviada: 1250.5, cantidad_recibida: null, motivo_diferencia: null },
    ],
  },
  {
    id: 'rec-2', estado: 'en_transito', creada_en: '2026-10-28T18:00:00Z', recibida_en: null, recibida_por: null,
    orden_id: 'o-12', codigo: 'O-0012', fecha: '2026-10-28', numero_remito: null, transporte: null,
    observaciones: 'Va con la camioneta de reparto', origen_id: 'u-m', origen: 'Mengui', destino_id: 'u-d', destino: 'Dolce Pasta',
    items: [
      { item_id: 'it-3', tipo: 'insumo', descripcion: 'Azúcar impalpable · Ledesma', unidad: 'kg', lote: null, cantidad_enviada: 75, cantidad_recibida: null, motivo_diferencia: null },
    ],
  },
];

const RECIBIDOS = [
  {
    id: 'rec-0', estado: 'recibida', creada_en: '2026-10-27T12:00:00Z', recibida_en: '2026-10-28T14:05:00Z', recibida_por: 'Lucía Fernández',
    orden_id: 'o-28', codigo: 'N-0028', fecha: '2026-10-27', numero_remito: '0001-00001220', transporte: null, observaciones: null,
    origen_id: 'u-n', origen: 'Cucuruchos Nuss', destino_id: 'u-d', destino: 'Dolce Pasta',
    items: [
      { item_id: 'it-0', tipo: 'producto', descripcion: 'Cucurucho N°1 · Caja x 100 · Dolce Pasta', unidad: 'cajas', lote: 'L-2710', cantidad_enviada: 30, cantidad_recibida: 28, motivo_diferencia: 'Dos cajas aplastadas en el viaje' },
      { item_id: 'it-00', tipo: 'insumo', descripcion: 'Harina 000 · Wali', unidad: 'kg', lote: 'H-770', cantidad_enviada: 500, cantidad_recibida: 500, motivo_diferencia: null },
    ],
  },
];

base.rpc.recepciones_grupo = {
  __segun: [
    { si: { p_estado: 'en_transito' }, r: EN_TRANSITO },
    { si: { p_estado: 'recibida' }, r: RECIBIDOS },
  ],
  __defecto: [],
};
base.rpc.recibir_orden_grupo = { estado: 'recibida', entradas: 2, codigo: 'N-0031' };

module.exports = base;
