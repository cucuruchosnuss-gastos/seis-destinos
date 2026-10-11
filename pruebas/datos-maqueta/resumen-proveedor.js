// Datos de la maqueta: el resumen de cuenta de un PROVEEDOR (11/10/2026,
// js/resumen-cuenta.js). Ver pruebas/datos-maqueta/README.md.
// Parte de los datos de Cuentas corrientes (cuentas-corrientes.js) SIN
// cambiarlos, y le da a "Harinera Uno SA" movimientos desde agosto en las dos
// empresas (Nuss y Dolce Pasta), con sus saldos como los da la vista:
//   Nuss:  20/08 factura 300.000 → 05/09 pago (cheque endosado) 300.000 →
//          10/09 factura 500.000,50 → 30/09 interés 2.500 → 02/10 factura
//          1.250.000,50 → 05/10 una descarga SIN importe (monto null).
//   Dolce: 15/09 factura 100.000 → 25/09 pago 100.000 → 01/10 factura
//          600.000 → 03/10 pago 120.000.
// Septiembre: Nuss arranca con 300.000 y termina en 502.500,50; Dolce
// arranca en 0 y termina en 0.
// Las empresas con razón social, CUIT y domicilio, para la cabecera.
//
//   http://localhost:4180/modulos/cuentas-corrientes.html?maqueta=resumen-proveedor
'use strict';

const base = JSON.parse(JSON.stringify(require('./cuentas-corrientes')));
const t = base.tablas;
const N = 'u-n', D = 'u-d';

const DATOS_EMPRESA = {
  'u-n': { razon_social: 'SEIS DESTINOS SAS', cuit: '30719434777', domicilio: 'Unión 843, Córdoba', telefono: '351 000 0000' },
  'u-d': { razon_social: 'DOLCE PASTA SRL', cuit: '33709335419', domicilio: 'Rosario', telefono: null },
};
t.unidades_negocio = t.unidades_negocio.map(u => ({ ...u, ...(DATOS_EMPRESA[u.id] || {}) }));

const mov = (unidad, fecha, orden, tipo, monto, saldo, extra = {}) => ({
  proveedor_id: 'p1', unidad_negocio_id: unidad, moneda: 'ARS', fecha, tipo, monto,
  factura_pendiente_id: null, gasto_id: null, credito_id: null, referencia: null, saldo_acumulado: saldo, orden_desempate: orden, ...extra,
});

t.v_cuenta_corriente_movimientos = t.v_cuenta_corriente_movimientos.filter(m => m.proveedor_id !== 'p1').concat([
  mov(N, '2026-08-20', '2026-08-20T10:00:00Z', 'factura', 300000, 300000, { factura_pendiente_id: 'f-n0', referencia: '0001-00011000' }),
  mov(N, '2026-09-05', '2026-09-05T10:00:00Z', 'pago', -300000, 0, { gasto_id: 'g-10', referencia: 'Pago a proveedor' }),
  mov(N, '2026-09-10', '2026-09-10T10:00:00Z', 'factura', 500000.5, 500000.5, { factura_pendiente_id: 'f-n9', referencia: '0001-00011500' }),
  mov(N, '2026-09-30', '2026-09-30T10:00:00Z', 'interes', 2500, 502500.5, { factura_pendiente_id: 'f-n9', referencia: '0001-00011500' }),
  mov(N, '2026-10-02', '2026-10-02T10:00:00Z', 'factura', 1250000.5, 1752501, { factura_pendiente_id: 'f-n1', referencia: '0001-00012345' }),
  mov(N, '2026-10-05', '2026-10-05T10:00:00Z', 'factura', null, 1752501, { factura_pendiente_id: 'f-n2', referencia: '0001-00012400' }),
  mov(D, '2026-09-15', '2026-09-15T10:00:00Z', 'factura', 100000, 100000, { factura_pendiente_id: 'f-d0', referencia: '0002-00000070' }),
  mov(D, '2026-09-25', '2026-09-25T10:00:00Z', 'pago', -100000, 0, { gasto_id: 'g-11', referencia: 'Pago a proveedor' }),
  mov(D, '2026-10-01', '2026-10-01T10:00:00Z', 'factura', 600000, 600000, { factura_pendiente_id: 'f-d1', referencia: '0002-00000077' }),
  mov(D, '2026-10-03', '2026-10-03T10:00:00Z', 'pago', -120000, 480000, { gasto_id: 'g-1', referencia: 'Pago a proveedor' }),
]);

t.gastos = [
  { id: 'g-10', medio_pago: 'cheque', descripcion: 'Cheque endosado 072-43300023 — Harinera Uno SA' },
  { id: 'g-11', medio_pago: 'transferencia', descripcion: 'Pago septiembre' },
  { id: 'g-1', medio_pago: 'transferencia', descripcion: 'Pago a cuenta' },
];

module.exports = base;
