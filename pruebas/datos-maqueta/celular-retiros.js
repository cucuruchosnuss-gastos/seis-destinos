// Datos de la maqueta: "Mis retiros" de la Carga de órdenes de retiro, para
// mirarlo en el celular (10/10/2026, e2e/31-vistas-faltantes.spec.js). Ver
// pruebas/datos-maqueta/README.md.
//
// Parte de retiros.js SIN cambiarlo (lo usan otras pruebas) y le suma a
// mis_ordenes_retiro una orden de un cliente con nombre largo (con un cono de
// nombre largo y transporte largo) y una anulada, así la lista y la orden
// abierta se miden con lo que más ocupa.
//
//   http://localhost:4180/modulos/retiros.html?maqueta=celular-retiros
'use strict';

const base = JSON.parse(JSON.stringify(require('./retiros')));
const mis = base.rpc.mis_ordenes_retiro;
const molde = mis[0];

mis.push(
  {
    ...JSON.parse(JSON.stringify(molde)),
    orden_id: 'o-2', codigo: 'N-0103', fecha: '2026-09-29', cargada_en: '2026-09-29T13:05:00Z',
    cliente: 'Supermercados Mayoristas del Norte Grande S.R.L. (sucursal Ruta 9)',
    transporte: 'Transportes Hermanos Gutiérrez e Hijos — camión con acoplado',
    observaciones: null,
    renglones: [
      { orden: 1, tipo: 'producto', producto: 'Cucurucho grande', presentacion: 'Caja con cono x 100', marca: 'HELADERÍA LOS ÁNGELES DE SAN FRANCISCO', cajas: 120, unidades: 12000, lotes: [{ lote: '7010-1', cajas: 60 }, { lote: '7030-1', cajas: 40 }, { lote: '7041-3', cajas: 20 }] },
      { orden: 2, tipo: 'insumo', insumo: 'Azúcar común tipo A', marca_insumo: 'Ledesma', cantidad: 1250.5, unidad_medida: 'kg', lotes: [{ lote: 'AZ-77-2026-SEPTIEMBRE', cantidad: 1250.5 }] },
    ],
  },
  { ...JSON.parse(JSON.stringify(molde)), orden_id: 'o-3', codigo: 'N-0098', fecha: '2026-09-27', estado: 'anulada', cliente: 'Kiosco Pepe' },
);

module.exports = base;
