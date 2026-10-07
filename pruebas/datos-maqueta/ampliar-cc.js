// Datos de la maqueta: el botón "Ampliar" del detalle de un pago en Cuentas
// corrientes (06/10/2026, js/ampliar.js). Ver pruebas/datos-maqueta/README.md.
// Parte de los datos de Cuentas corrientes (cuentas-corrientes.js) SIN
// cambiarlos, y suma lo que lee el detalle del pago g-1 de Harinera Uno en
// Dolce Pasta: el gasto, las facturas que cubrió y el sobrante que quedó como
// crédito.
//
//   http://localhost:4180/modulos/cuentas-corrientes.html?maqueta=ampliar-cc
'use strict';

const base = JSON.parse(JSON.stringify(require('./cuentas-corrientes')));
const t = base.tablas;
const fp = (numero, razon, fecha) => ({ numero_comprobante: numero, razon_social: razon, fecha_factura: fecha, categorias: { nombre: 'Insumos - Materia Prima' } });

t.gastos = [
  { id: 'g-1', fecha_pago: '2026-10-03', medio_pago: 'transferencia', importe: 120000, moneda: 'ARS', descripcion: 'Pago a cuenta' },
];
t.aplicaciones_pago = [
  { gasto_id: 'g-1', monto_aplicado: 60000, facturas_pendientes: fp('0002-00000077', 'Harinera Uno SA', '2026-10-01') },
  { gasto_id: 'g-1', monto_aplicado: 35000, facturas_pendientes: fp('0002-00000078', 'Harinera Uno SA', '2026-10-02') },
  { gasto_id: 'g-1', monto_aplicado: 15000, facturas_pendientes: fp('0002-00000079', 'Harinera Uno SA', '2026-10-03') },
];
t.creditos_proveedor = t.creditos_proveedor.concat([
  { id: 'cr-g1', proveedor_id: 'p1', unidad_negocio_id: 'u-d', moneda: 'ARS', monto_original: 10000, monto_disponible: 10000, estado: 'disponible',
    origen_gasto_id: 'g-1', aplicaciones_credito: [] },
]);

module.exports = base;
