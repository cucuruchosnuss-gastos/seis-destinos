// Datos de la maqueta: LA VENTA Y SUS PUNTOS N1 / N2 en Cuentas corrientes
// (30/10/2026, rama ci-prueba/cc-orden-n1-n2). Ver pruebas/datos-maqueta/README.md.
//
// Parte de los de cliente y proveedor (cuenta-unica.js): ANATOLIA SRL (pv1)
// es también el cliente Distribuidora Anatolia (c1, Nuss). Su cuenta junta
// (cuenta_unificada) trae la venta N-0042 con la comisión de vendedores
// adentro (como la devuelve la base desde el 30/10/2026), su corrección de
// comisión aparte, una venta sin condición de venta (N-0043) y una 100/0
// (N-0044); datos_division_orden responde por orden.
//
//   http://localhost:4180/modulos/cuentas-corrientes.html?proveedor=pv1&unidad=u-n&maqueta=cc-orden-n1-n2
'use strict';

const cu = require('./cuenta-unica');

const N = 'u-n';
const copia = (x) => JSON.parse(JSON.stringify(x));
const t = copia(cu.tablas);

const fila = (fecha, orden, lado, etiqueta, detalle, te, le, teAc, leAc, ordenRetiro = null) => ({
  fecha, orden, lado, etiqueta, detalle, moneda: 'ARS', te_debe: te, le_debes: le,
  te_debe_acum: teAc, le_debes_acum: leAc, neto_acum: Math.round((teAc - leAc) * 100) / 100,
  cliente_id: 'c1', proveedor_id: 'pv1', unidad_negocio_id: N,
  orden_retiro_id: ordenRetiro, cobranza_id: null, gasto_id: null, factura_pendiente_id: null,
});
const CUENTA = [
  fila('2026-10-01', '2026-10-01T10:00:00Z', 'proveedor', 'Compra', 'Factura A 0003-00001201', 0, 250000, 0, 250000),
  fila('2026-10-20', '2026-10-20T12:00:00Z', 'cliente', 'Venta', 'Orden N-0042 · incluye comisión de vendedores $ 299.454,88', 4012369.65, 0, 4012369.65, 250000, 'or-42'),
  fila('2026-10-22', '2026-10-22T12:00:00Z', 'cliente', 'Comisión', 'Corrección de la comisión de la orden N-0042', 1500, 0, 4013869.65, 250000, 'or-42'),
  fila('2026-10-24', '2026-10-24T12:00:00Z', 'cliente', 'Venta', 'Orden N-0043', 500000, 0, 4513869.65, 250000, 'or-43'),
  fila('2026-10-26', '2026-10-26T12:00:00Z', 'cliente', 'Venta', 'Orden N-0044', 120000, 0, 4633869.65, 250000, 'or-44'),
];

const rpc = copia(cu.rpc);
Object.assign(rpc, {
  cuenta_unificada: { __segun: [{ si: { p_cliente_id: 'c1' }, r: CUENTA }], __defecto: [] },
  datos_division_orden: { __segun: [
    { si: { p_orden_id: 'or-42' }, r: { orden_id: 'or-42', codigo: 'N-0042', pct_a: 40, pct_b: 60, subtotal_a: 1425975.6, comision_total: 299454.88, total_a: 1725430.48, subtotal_b: 2286939.17, total_b: 2286939.17, guardada: true } },
    { si: { p_orden_id: 'or-43' }, r: 'ERROR:Este cliente no tiene condición de venta: poné el % de la parte A.' },
    { si: { p_orden_id: 'or-44' }, r: { orden_id: 'or-44', codigo: 'N-0044', pct_a: 100, pct_b: 0, subtotal_a: 114000, comision_total: 6000, total_a: 120000, subtotal_b: 0, total_b: 0, guardada: true } },
  ], __defecto: 'ERROR:La orden no existe.' },
});

module.exports = { uid: cu.uid, tablas: t, rpc };
