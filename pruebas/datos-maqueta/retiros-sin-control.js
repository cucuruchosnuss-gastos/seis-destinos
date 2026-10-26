// Datos de la maqueta: la Carga en una fábrica SIN control de stock de
// producto terminado (26/10/2026, rama ci-prueba/orden-sin-stock-rosario).
// Ver pruebas/datos-maqueta/README.md.
//
// Parte de retiros.js SIN cambiarlo (lo usan otras pruebas) y le suma:
//  - unidades_negocio con controla_stock_terminado: Dolce Pasta (u-d) false,
//    Cucuruchos Nuss (u-n) true;
//  - en Dolce: la Capelina Grande (Caja) y el Cono dulce (con cono), los dos
//    con stock 0, y la Harina 000 con stock (los insumos sí se controlan);
//    los clientes "Almacén Rosario" y PAZ, MIRTA (empresa del grupo: Nuss);
//  - la respuesta de registrar_orden_retiro para Dolce (D-0007, sin
//    faltantes, como la base) y esa orden en mis_ordenes_retiro con los lotes
//    escritos, para la hoja.
//
//   http://localhost:4180/modulos/retiros.html?maqueta=retiros-sin-control
'use strict';

const base = JSON.parse(JSON.stringify(require('./retiros')));
const t = base.tablas;
const r = base.rpc;

t.unidades_negocio = [
  { id: 'u-n', nombre: 'Cucuruchos Nuss', es_prueba: false, controla_stock_terminado: true },
  { id: 'u-d', nombre: 'Dolce Pasta', es_prueba: false, controla_stock_terminado: false },
];
t.clientes.push(
  { id: 'c-ros', unidad_negocio_id: 'u-d', nombre: 'Almacén Rosario', razon_social: null, apodos: [], cuit: null, domicilio: null,
    localidad: 'Rosario', email: null, transporte_habitual: null, activo: true, provisorio: false, unidad_grupo_id: null },
  { id: 'c-paz', unidad_negocio_id: 'u-d', nombre: 'PAZ, MIRTA', razon_social: null, apodos: ['Nuss', 'Cucuruchos Nuss', 'Córdoba'], cuit: null,
    domicilio: null, localidad: 'Córdoba', email: null, transporte_habitual: null, activo: true, provisorio: false, unidad_grupo_id: 'u-n' },
);

const DOLCE = {
  productos: [
    { presentacion_id: 'pr-d-cap', producto: 'Capelina Grande', presentacion: 'Caja', categoria: 'barquillos', con_cono: false, media_caja: false, unidades_por_caja: 100, stock_cajas: 0 },
    { presentacion_id: 'pr-d-cono', producto: 'Cono dulce', presentacion: 'Caja con cono', categoria: 'cucuruchones', con_cono: true, media_caja: false, unidades_por_caja: 200, stock_cajas: 0 },
  ],
  conos: [],
  insumos: [{ insumo_id: 'i-d-har', nombre: 'Harina 000', marca: 'Molino', categoria: 'Harinas', unidad_medida: 'kg', stock: 100 }],
};
r.catalogo_para_retiro = { __segun: [{ si: { p_unidad_negocio_id: 'u-d' }, r: DOLCE }], __defecto: r.catalogo_para_retiro };

const ORIGINAL = r.registrar_orden_retiro;
r.registrar_orden_retiro = {
  __segun: [{ si: { p_cliente_id: 'c-ros' }, r: { orden_id: 'o-d7', numero: 7, codigo: 'D-0007', stock_insuficiente: [], entre_empresas: false } }],
  __defecto: ORIGINAL,
};
r.mis_ordenes_retiro = [
  {
    orden_id: 'o-d7', codigo: 'D-0007', fecha: '2026-10-26', estado: 'confirmada', cliente: 'Almacén Rosario', transporte: null, observaciones: null,
    cargada_en: '2026-10-26T15:00:00Z',
    renglones: [{ orden: 1, tipo: 'producto', producto: 'Capelina Grande', presentacion: 'Caja', marca: null, cajas: 84, unidades: 8400, movimiento: 'retiro',
      item_id: 'it-d7', lotes: [{ lote: '10430', cajas: 30 }, { lote: '10433', cajas: 39 }, { lote: '10440', cajas: 15 }] }],
  },
  ...r.mis_ordenes_retiro,
];

module.exports = base;
