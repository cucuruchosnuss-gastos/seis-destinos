// Datos de la maqueta: cómo se pide una cantidad (05/10/2026). Ver
// pruebas/datos-maqueta/README.md. Se generan a e2e/maqueta/datos/cantidades.json
// con `npm run maqueta:datos`.
//
// El caso que lo motivó: 1 bolsa de azúcar de Nuss a Mengui se mandó como 1
// kg. Acá el azúcar tiene la vista en BULTOS y está en bolsas de 50 kg; la
// harina, en kilos aunque venga en bolsas de 25; la lecitina, en bultos pero
// con un lote en dos presentaciones (25 y 50 kg). Sirve a Stock (enviar y
// corregir) y a Ingreso (recibir un envío que viene de Dolce).
'use strict';

const { UID, tarea } = require('./comun');
const stock = require('./stock');

const NUSS = 'u-n', DOLCE = 'u-d', MENGUI = 'u-m';
const EMP = 'emp-stock';
const copia = JSON.parse(JSON.stringify(stock));
const t = copia.tablas;

const insumo = (id, nombre, extra = {}) => ({
  id, nombre, marca: null, unidad_medida: 'kg', tipo: 'materia_prima', categoria: 'Azúcares y secos', aclaracion: null,
  activo: true, estado_alta: 'activo', tolerancia_merma_pct: 1, vista_preferida: 'base', ...extra,
});
const lote = (insumoId, nombre, lote, contenido, saldo, extra = {}) => ({
  unidad_negocio_id: NUSS, insumo_id: insumoId, insumo_nombre: nombre, marca: null, unidad_medida: 'kg', tipo: 'materia_prima',
  lote, contenido_por_bulto: contenido, saldo, desde: '2026-09-01', aclaracion: null, ...extra,
});

t.insumos = [
  insumo('i-azucar', 'Azúcar', { vista_preferida: 'bulto' }),
  insumo('i-harina', 'Harina 000', { categoria: 'Harinas', vista_preferida: 'base' }),
  insumo('i-lecitina', 'Lecitina', { categoria: 'Aditivos', vista_preferida: 'bulto' }),
];
t.v_stock_insumos = [
  { unidad_negocio_id: NUSS, insumo_id: 'i-azucar', insumo_nombre: 'Azúcar', marca: null, unidad_medida: 'kg', tipo: 'materia_prima',
    categoria: 'Azúcares y secos', aclaracion: null, cantidad_total: 500, lotes_distintos: 1, presentaciones: 1, contenido_unico: 50,
    kilos_sueltos: 0, vista_preferida: 'bulto', tolerancia_merma_pct: 1 },
  { unidad_negocio_id: NUSS, insumo_id: 'i-harina', insumo_nombre: 'Harina 000', marca: null, unidad_medida: 'kg', tipo: 'materia_prima',
    categoria: 'Harinas', aclaracion: null, cantidad_total: 250, lotes_distintos: 1, presentaciones: 1, contenido_unico: 25,
    kilos_sueltos: 0, vista_preferida: 'base', tolerancia_merma_pct: 1 },
  { unidad_negocio_id: NUSS, insumo_id: 'i-lecitina', insumo_nombre: 'Lecitina', marca: null, unidad_medida: 'kg', tipo: 'materia_prima',
    categoria: 'Aditivos', aclaracion: null, cantidad_total: 150, lotes_distintos: 1, presentaciones: 2, contenido_unico: null,
    kilos_sueltos: 0, vista_preferida: 'bulto', tolerancia_merma_pct: 1 },
];
t.v_stock_cobertura = [];
t.v_stock_por_lote = [
  lote('i-azucar', 'Azúcar', 'L-AZ', 50, 500),
  lote('i-harina', 'Harina 000', 'L-H', 25, 250),
  lote('i-lecitina', 'Lecitina', 'L-LE', 25, 50),
  lote('i-lecitina', 'Lecitina', 'L-LE', 50, 100),
];

// ── Ingreso: recibir el envío que viene de Dolce ───────────────────────────
t.empleado_tareas.push(tarea(EMP, 'stock', 'recibir_transferencia', { unidades: [NUSS, DOLCE] }));
t.empleado_tareas.push(tarea(EMP, 'materia_prima', 'cargar', { unidades: [NUSS, DOLCE] }));
t.v_mis_unidades_recepcion = [{ id: NUSS, nombre: 'Cucuruchos Nuss', ciudad: 'Córdoba' }, { id: DOLCE, nombre: 'Dolce Pasta', ciudad: 'Córdoba' }];
t.v_stock_en_transito = [
  { id: 't-c', unidad_origen_id: DOLCE, origen_nombre: 'Dolce Pasta', unidad_destino_id: NUSS, destino_nombre: 'Cucuruchos Nuss',
    fecha: '2026-10-04', creado_por: EMP, created_at: '2026-10-04T12:00:00Z', dias_en_transito: 1, items: 2 },
];
t.stock_transferencia_items = [
  { id: 'tc-1', transferencia_id: 't-c', lote: 'L-AZ', contenido_por_bulto: 50, cantidad_enviada: 50,
    insumos: { nombre: 'Azúcar', marca: null, unidad_medida: 'kg', aclaracion: null, vista_preferida: 'bulto' } },
  { id: 'tc-2', transferencia_id: 't-c', lote: 'L-H', contenido_por_bulto: 25, cantidad_enviada: 1,
    insumos: { nombre: 'Harina 000', marca: null, unidad_medida: 'kg', aclaracion: null, vista_preferida: 'base' } },
];
t.materia_prima_ingresos = [];
t.materia_prima_factura_remitos = [];
t.stock_transferencias = [];
copia.rpc = Object.assign({}, copia.rpc, {
  fecha_inicio_circuito_stock: '2026-10-01',
  gastos_sin_ingreso: [],
  facturas_sin_ingreso: [],
  ingresos_sin_gasto: [],
  mis_pendientes: [],
});

module.exports = copia;
