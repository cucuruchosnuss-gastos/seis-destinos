// Datos de la maqueta: ARREGLOS DEL DETALLE DEL PAGO (31/10/2026, arreglos de
// la auditoría del 30/10, punto 4). Ver pruebas/datos-maqueta/README.md.
//
// Parte de los del detalle del pago con cheques (detalle-pago-cheques.js).
// ANATOLIA SRL (pv1) en Nuss, con los pagos a nombre de la persona de la
// maqueta (emp-1: puede anularlos), y además:
//  - en el pago g-p5, dos cheques que NO son de ese pago para la base: uno
//    rechazado con pago_gasto_id = g-p5 y otro con salida_gasto_id = g-p5
//    pero pago_gasto_id de OTRO pago (coalesce = el otro);
//  - el pago g-sinver: con cheques de la cartera, pero ninguno se puede leer
//    (la RLS los filtra sin error);
//  - el pago g-ef: en efectivo, sin cuenta (al anularlo, la plata vuelve a la caja).
//
//   http://localhost:4180/modulos/cuentas-corrientes.html?proveedor=pv1&unidad=u-n&maqueta=arreglos-detalle-pago
'use strict';

const base = require('./detalle-pago-cheques');

const N = 'u-n';
const copia = (x) => JSON.parse(JSON.stringify(x));
const t = copia(base.tablas);

for (const g of t.gastos) Object.assign(g, { empleado_id: 'emp-1', cuenta_id: null, orden_pago_id: null, motivo_anulacion: null });
t.gastos.push(
  { id: 'g-sinver', proveedor_id: 'pv1', unidad_negocio_id: N, fecha_pago: '2026-10-22', medio_pago: 'cheque', importe: 70000, moneda: 'ARS', estado: 'pagado',
    descripcion: 'Pago con cheques de terceros (N° 70707070) — ANATOLIA SRL', observaciones: null, empleado_id: 'emp-1', cuenta_id: null, orden_pago_id: null, motivo_anulacion: null },
  { id: 'g-ef', proveedor_id: 'pv1', unidad_negocio_id: N, fecha_pago: '2026-10-23', medio_pago: 'efectivo', importe: 1500.5, moneda: 'ARS', estado: 'pagado',
    descripcion: 'Pago a proveedor', observaciones: null, empleado_id: 'emp-1', cuenta_id: null, orden_pago_id: null, motivo_anulacion: null },
);

// Los dos cheques que la base NO cuenta en el pago g-p5.
const molde = t.cobranza_cheques.find(c => c.id === 'chq-p5-1');
t.cobranza_cheques.push(
  { ...copia(molde), id: 'chq-rechazado', numero: '33333333', importe: 60000, estado: 'rechazado', titulares: null, pago_gasto_id: 'g-p5', salida_gasto_id: null },
  { ...copia(molde), id: 'chq-de-otro', numero: '44444444', importe: 65000, titulares: null, pago_gasto_id: 'g-otro', salida_gasto_id: 'g-p5' },
);

t.v_cuenta_corriente_movimientos.push(
  { proveedor_id: 'pv1', unidad_negocio_id: N, moneda: 'ARS', fecha: '2026-10-22', tipo: 'pago', monto: -70000, factura_pendiente_id: 'fp-2', gasto_id: 'g-sinver', credito_id: null, referencia: '0003-00001245', saldo_acumulado: 130000, orden_desempate: 4 },
  { proveedor_id: 'pv1', unidad_negocio_id: N, moneda: 'ARS', fecha: '2026-10-23', tipo: 'pago', monto: -1500.5, factura_pendiente_id: 'fp-2', gasto_id: 'g-ef', credito_id: null, referencia: '0003-00001245', saldo_acumulado: 128499.5, orden_desempate: 5 },
);

module.exports = { uid: base.uid, tablas: t, rpc: copia(base.rpc) };
