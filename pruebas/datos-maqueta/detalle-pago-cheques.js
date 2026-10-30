// Datos de la maqueta: EL DETALLE DEL PAGO CON SUS CHEQUES (30/10/2026, rama
// ci-prueba/detalle-pago-cheques). Ver pruebas/datos-maqueta/README.md.
//
// Parte de los de Cuentas corrientes con cheques (cc-cheques.js). ANATOLIA SRL
// (pv1) en Nuss tiene:
//  - el pago g-p5: $ 500.000 con CINCO cheques de terceros, que cubrió la
//    factura 0003-00001201 entera ($ 250.000) y $ 200.000 de la 0003-00001245
//    (le quedan $ 200.000), y dejó $ 50.000 de crédito a favor; con
//    observaciones de un cheque agregado antes;
//  - el pago g-pago-0: $ 90.000 con UN solo cheque (sacarlo lo anula).
// En la cartera quedan, de Nuss, el N° 66259862 ($ 387.300,50) y el
// N° 12345678 ($ 150.000). Las respuestas de sacar_cheque_de_pago y
// agregar_cheques_a_pago son las que daría la base.
//
//   http://localhost:4180/modulos/cuentas-corrientes.html?proveedor=pv1&unidad=u-n&maqueta=detalle-pago-cheques
'use strict';

const cc = require('./cc-cheques');

const N = 'u-n';
const copia = (x) => JSON.parse(JSON.stringify(x));
const t = copia(cc.tablas);

// Las facturas como quedaron después del pago.
for (const f of t.facturas_pendientes) {
  if (f.id === 'fp-1') Object.assign(f, { importe: 250000, saldo_pendiente: 0, estado: 'pagada', created_at: '2026-08-21T10:00:00Z' });
  if (f.id === 'fp-2') Object.assign(f, { importe: 400000, saldo_pendiente: 200000, estado: 'parcial', created_at: '2026-09-06T10:00:00Z' });
}
const fp = (id) => {
  const f = t.facturas_pendientes.find(x => x.id === id);
  return { numero_comprobante: f.numero_comprobante, razon_social: 'ANATOLIA SRL', fecha_factura: f.fecha_factura, created_at: f.created_at,
    saldo_pendiente: f.saldo_pendiente, estado: f.estado, categorias: { nombre: 'Materia prima' } };
};

t.gastos = [
  { id: 'g-p5', proveedor_id: 'pv1', unidad_negocio_id: N, fecha_pago: '2026-10-20', medio_pago: 'cheque', importe: 500000, moneda: 'ARS', estado: 'pagado',
    descripcion: 'Pago con cheques de terceros (N° 16603539, N° 21000001, N° 32000002, N° 43000003, N° 55555555) — ANATOLIA SRL',
    observaciones: '25/10/2026: se agregó N° 55555555 ($ 50.000,00) — Reemplaza al cheque N° 16603538' },
  { id: 'g-pago-0', proveedor_id: 'pv1', unidad_negocio_id: N, fecha_pago: '2026-10-04', medio_pago: 'cheque', importe: 90000, moneda: 'ARS', estado: 'pagado',
    descripcion: 'Pago con cheques de terceros (N° 77777777) — ANATOLIA SRL', observaciones: null },
];
t.aplicaciones_pago = [
  { id: 'ap-1', gasto_id: 'g-p5', factura_pendiente_id: 'fp-1', monto_aplicado: 250000, created_at: '2026-10-20T10:00:00Z', facturas_pendientes: fp('fp-1') },
  { id: 'ap-2', gasto_id: 'g-p5', factura_pendiente_id: 'fp-2', monto_aplicado: 200000, created_at: '2026-10-20T10:00:00Z', facturas_pendientes: fp('fp-2') },
  { id: 'ap-3', gasto_id: 'g-pago-0', factura_pendiente_id: 'fp-2', monto_aplicado: 0, created_at: '2026-10-04T10:00:00Z', facturas_pendientes: fp('fp-2') },
];
t.aplicaciones_pago = t.aplicaciones_pago.filter(a => a.monto_aplicado > 0);
t.creditos_proveedor = [
  { id: 'cr-p5', proveedor_id: 'pv1', unidad_negocio_id: N, origen_gasto_id: 'g-p5', monto_original: 50000, monto_disponible: 50000, moneda: 'ARS', estado: 'disponible', created_at: '2026-10-20T10:00:01Z', aplicaciones_credito: [] },
  { id: 'cr-p0', proveedor_id: 'pv1', unidad_negocio_id: N, origen_gasto_id: 'g-pago-0', monto_original: 90000, monto_disponible: 90000, moneda: 'ARS', estado: 'disponible', created_at: '2026-10-04T10:00:01Z', aplicaciones_credito: [] },
];
t.v_saldo_proveedor = [
  { proveedor_id: 'pv1', unidad_negocio_id: N, moneda: 'ARS', deuda_pendiente: 200000, credito_disponible: 140000 },
];
t.v_cuenta_corriente_movimientos = [
  { proveedor_id: 'pv1', unidad_negocio_id: N, moneda: 'ARS', fecha: '2026-08-20', tipo: 'factura', monto: 250000, factura_pendiente_id: 'fp-1', gasto_id: null, credito_id: null, referencia: '0003-00001201', saldo_acumulado: 250000, orden_desempate: 1 },
  { proveedor_id: 'pv1', unidad_negocio_id: N, moneda: 'ARS', fecha: '2026-09-05', tipo: 'factura', monto: 400000, factura_pendiente_id: 'fp-2', gasto_id: null, credito_id: null, referencia: '0003-00001245', saldo_acumulado: 650000, orden_desempate: 1 },
  { proveedor_id: 'pv1', unidad_negocio_id: N, moneda: 'ARS', fecha: '2026-10-04', tipo: 'pago', monto: -90000, factura_pendiente_id: null, gasto_id: 'g-pago-0', credito_id: null, referencia: null, saldo_acumulado: 560000, orden_desempate: 2 },
  { proveedor_id: 'pv1', unidad_negocio_id: N, moneda: 'ARS', fecha: '2026-10-20', tipo: 'pago', monto: -250000, factura_pendiente_id: 'fp-1', gasto_id: 'g-p5', credito_id: null, referencia: '0003-00001201', saldo_acumulado: 400000, orden_desempate: 2 },
  { proveedor_id: 'pv1', unidad_negocio_id: N, moneda: 'ARS', fecha: '2026-10-20', tipo: 'pago', monto: -200000, factura_pendiente_id: 'fp-2', gasto_id: 'g-p5', credito_id: null, referencia: '0003-00001245', saldo_acumulado: 200000, orden_desempate: 3 },
];

// Los cinco cheques del pago g-p5 (de dos clientes; uno con titulares) y el
// único del g-pago-0 (chq-pago, que ya viene de cc-cheques).
const cheque = (id, cobranza, banco, numero, importe, tipo, pago, titulares = null) => ({
  sucursal_codigo: '123', codigo_postal: '5000', dv_ruta: 0, dv_numero: 0, cuenta: '00012345678', dv_cuenta: 0,
  id, cobranza_id: cobranza, banco_codigo: banco, numero, estado: 'endosado', importe, tipo,
  fecha_emision: '2026-10-01', fecha_pago: tipo === 'diferido' ? pago : null, titulares,
  salida_fecha: '2026-10-20', salida_destino: 'ANATOLIA SRL', salida_por: 'emp-1', salida_registrada_en: '2026-10-20T12:00:00Z',
  salida_proveedor_id: null, salida_gasto_id: null, pago_gasto_id: 'g-p5',
});
t.cobranza_cheques.push(
  cheque('chq-p5-1', 'cob-1', '007', '16603539', 100000, 'diferido', '2026-11-10', [{ nombre: 'PEREZ JUAN CARLOS', cuit: '20123456789' }]),
  cheque('chq-p5-2', 'cob-1', '011', '21000001', 120000, 'diferido', '2026-11-15'),
  cheque('chq-p5-3', 'c3333333-3333-4333-8333-333333333333', '285', '32000002', 80000, 'comun', null),
  cheque('chq-p5-4', 'c3333333-3333-4333-8333-333333333333', '007', '43000003', 150000, 'diferido', '2026-12-01', [{ nombre: 'GOMEZ SRL', cuit: '30712345678' }]),
  cheque('chq-p5-5', 'cob-1', '011', '55555555', 50000, 'diferido', '2026-11-30'),
);

const rpc = copia(cc.rpc);
Object.assign(rpc, {
  // Sacar el N° 32000002 ($ 80.000): sale $ 50.000 del crédito y $ 30.000
  // vuelven a deberse en la 0003-00001245. Sacar el único del g-pago-0: se anula.
  sacar_cheque_de_pago: { __segun: [
    { si: { p_cheque_id: 'chq-pago' }, r: { pago_antes: 90000, pago_despues: 0, del_credito: 90000, vuelve_a_facturas: 0, pago_anulado: true } },
  ], __defecto: { pago_antes: 500000, pago_despues: 420000, del_credito: 50000, vuelve_a_facturas: 30000, pago_anulado: false } },
  // Agregar el N° 66259862 ($ 387.300,50): completa la 0003-00001245 ($ 200.000)
  // y $ 187.300,50 quedan a favor.
  agregar_cheques_a_pago: { pago_antes: 500000, pago_despues: 887300.5, a_facturas: 200000, credito_a_favor: 187300.5 },
});

module.exports = { uid: cc.uid, tablas: t, rpc };
