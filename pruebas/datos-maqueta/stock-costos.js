// Datos de la maqueta: costos de insumos y stock valorizado (09/10/2026).
// Ver pruebas/datos-maqueta/README.md. Parte de los datos de Stock (stock.js)
// SIN cambiarlos —las otras pruebas de Stock los usan tal cual— y le suma las
// dos tareas de costos (ver y cargar en Nuss; en Dolce solo ver, para que con
// "Todas" se pida la fábrica), las respuestas de costos_insumos y
// stock_valorizado y el historial de insumo_costos.
//
//   http://localhost:4180/modulos/stock.html?maqueta=stock-costos
'use strict';

const { tarea } = require('./comun');

const base = JSON.parse(JSON.stringify(require('./stock')));
const t = base.tablas;
const EMP = t.empleados[0].id;
const NUSS = 'u-n', DOLCE = 'u-d';

t.empleado_tareas.push(
  tarea(EMP, 'stock', 'ver_costos', { unidades: [NUSS, DOLCE] }),
  tarea(EMP, 'stock', 'cargar_costos', { unidades: [NUSS] }),
);

// La harina de Nuss viene en bultos de 25 kg (contenido_unico de stock.js):
// el costo se puede escribir por bulto.
t.insumo_costos = [
  { id: 'ic-3', unidad_negocio_id: NUSS, insumo_id: 'i-harina', costo_unitario: 1100, moneda: 'ARS', vigente_desde: '2026-10-01', origen: 'manual', gasto_id: null, nota: 'Factura de octubre del molino', cargado_por: EMP, cargado_en: '2026-10-01T12:00:00Z', anulado: false },
  { id: 'ic-2', unidad_negocio_id: NUSS, insumo_id: 'i-harina', costo_unitario: 980, moneda: 'ARS', vigente_desde: '2026-09-01', origen: 'manual', gasto_id: null, nota: null, cargado_por: EMP, cargado_en: '2026-09-01T12:00:00Z', anulado: false },
  { id: 'ic-1', unidad_negocio_id: NUSS, insumo_id: 'i-harina', costo_unitario: 9800, moneda: 'ARS', vigente_desde: '2026-09-01', origen: 'manual', gasto_id: null, nota: 'Cargado de más (un cero de más)', cargado_por: EMP, cargado_en: '2026-08-31T12:00:00Z', anulado: true, anulado_por: EMP, anulado_en: '2026-09-01T13:00:00Z' },
];

// Como devuelve la base: los numeric como texto.
const COSTOS_NUSS = [
  { insumo_id: 'i-caja', insumo: 'Caja N°1', marca: 'Nuss', categoria: 'Cajas', unidad_medida: 'un', costo_unitario: null, vigente_desde: null, cargado_por: null, costo_anterior: null, variacion_pct: null },
  { insumo_id: 'i-harina', insumo: 'Harina 000', marca: null, categoria: 'Harinas', unidad_medida: 'kg', costo_unitario: '1100.0000', vigente_desde: '2026-10-01', cargado_por: 'Facu Maqueta', costo_anterior: '980.0000', variacion_pct: '12.2' },
  { insumo_id: 'i-lecitina', insumo: 'Lecitina de soja con un nombre larguísimo para ver que no empuje el ancho', marca: null, categoria: 'Aditivos', unidad_medida: 'kg', costo_unitario: '5432.1234', vigente_desde: '2026-09-15', cargado_por: 'Facu Maqueta', costo_anterior: '6000', variacion_pct: '-9.5' },
];
const VALORIZADO_NUSS = [
  { insumo_id: 'i-caja', insumo: 'Caja N°1', marca: 'Nuss', categoria: 'Cajas', unidad_medida: 'un', cantidad: '1200', costo_unitario: null, costo_desde: null, valor: null },
  { insumo_id: 'i-harina', insumo: 'Harina 000', marca: null, categoria: 'Harinas', unidad_medida: 'kg', cantidad: '6250', costo_unitario: '1100.0000', costo_desde: '2026-10-01', valor: '6875000.00' },
  { insumo_id: 'i-lecitina', insumo: 'Lecitina de soja', marca: null, categoria: 'Aditivos', unidad_medida: 'kg', cantidad: '12.5', costo_unitario: '5432.1234', costo_desde: '2026-09-15', valor: '67901.54' },
];

base.rpc.costos_insumos = {
  __segun: [{ si: { p_unidad_negocio_id: NUSS }, r: COSTOS_NUSS }],
  __defecto: [],
};
base.rpc.stock_valorizado = {
  __segun: [{ si: { p_unidad_negocio_id: NUSS }, r: VALORIZADO_NUSS }],
  __defecto: [],
};
base.rpc.guardar_costo_insumo = 'ic-nuevo';
base.rpc.anular_costo_insumo = null;

module.exports = base;
