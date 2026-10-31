// Datos de la maqueta: LA CUENTA DEL PROVEEDOR EN UNA SOLA LISTA (30/10/2026,
// rama ci-prueba/cc-proveedor-una-lista). Ver pruebas/datos-maqueta/README.md.
//
// Parte de los de Cuentas corrientes con cheques (cc-cheques.js). La cuenta
// de ANATOLIA SRL (pv1) en Nuss, como la devuelve la vista nueva (todos los
// pagos, también los sin aplicar, y el saldo a favor del corte inicial), de
// la más nueva a la más vieja:
//   25/10 pago SIN aplicar   −50.000        360.000
//   15/10 pago (N-OP-00005) −250.000        410.000
//   10/10 nota de débito     +30.000        660.000
//   05/09 factura           +400.000        630.000
//   20/08 factura           +250.000        230.000
//   01/08 saldo a favor del corte  −20.000  −20.000
// v_saldo_proveedor: debe 380.000 y tiene 20.000 a favor → neto 360.000.
//
//   http://localhost:4180/modulos/cuentas-corrientes.html?proveedor=pv1&unidad=u-n&maqueta=cc-proveedor-una-lista
'use strict';

const cc = require('./cc-cheques');

const N = 'u-n';
const copia = (x) => JSON.parse(JSON.stringify(x));
const t = copia(cc.tablas);

const mov = (fecha, tipo, monto, saldo, extra) => ({ proveedor_id: 'pv1', unidad_negocio_id: N, moneda: 'ARS', fecha, tipo, monto,
  factura_pendiente_id: null, gasto_id: null, credito_id: null, referencia: null, saldo_acumulado: saldo, orden_desempate: fecha + 'T12:00:00Z', ...extra });
t.v_cuenta_corriente_movimientos = [
  mov('2026-10-25', 'pago', -50000, 360000, { gasto_id: 'g-suelto', referencia: 'Pago a proveedor' }),
  mov('2026-10-15', 'pago', -250000, 410000, { gasto_id: 'g-op', referencia: 'Pago a proveedor' }),
  mov('2026-10-10', 'factura', 30000, 660000, { factura_pendiente_id: 'fp-nd', referencia: 'Nota de débito 0001-00004567' }),
  mov('2026-09-05', 'factura', 400000, 630000, { factura_pendiente_id: 'fp-2', referencia: '0003-00001245' }),
  mov('2026-08-20', 'factura', 250000, 230000, { factura_pendiente_id: 'fp-1', referencia: '0003-00001201' }),
  mov('2026-08-01', 'credito_aplicado', -20000, -20000, { credito_id: 'cr-corte', referencia: 'Saldo a favor (corte inicial)' }),
];
for (const f of t.facturas_pendientes) {
  if (f.id === 'fp-1') Object.assign(f, { importe: 250000, saldo_pendiente: 0, estado: 'pagada' });
  if (f.id === 'fp-2') Object.assign(f, { importe: 400000, saldo_pendiente: 350000, estado: 'parcial' });
}
t.facturas_pendientes.push({ ...copia(t.facturas_pendientes.find(f => f.id === 'fp-2')), id: 'fp-nd', numero_comprobante: 'Nota de débito 0001-00004567',
  importe: 30000, saldo_pendiente: 30000, estado: 'pendiente', modulo_origen: 'nota_debito', fecha_factura: '2026-10-10' });
t.notas_debito = [{ id: 'nd-1', factura_pendiente_id: 'fp-nd', comprobante: '0001-00004567', estado: 'vigente', archivo_url: null }];
t.gastos = [
  { id: 'g-op', proveedor_id: 'pv1', unidad_negocio_id: N, fecha_pago: '2026-10-15', medio_pago: 'transferencia', importe: 250000, moneda: 'ARS', estado: 'pagado', descripcion: 'Pago a proveedor', observaciones: null, orden_pago_id: 'op-5' },
  { id: 'g-suelto', proveedor_id: 'pv1', unidad_negocio_id: N, fecha_pago: '2026-10-25', medio_pago: 'efectivo', importe: 50000, moneda: 'ARS', estado: 'pagado', descripcion: 'Pago a proveedor', observaciones: null, orden_pago_id: null },
];
t.ordenes_pago = [{ id: 'op-5', unidad_negocio_id: N, proveedor_id: 'pv1', numero: 5, fecha: '2026-10-15', total: 250000, creada_en: '2026-10-15T12:00:00Z' }];
t.creditos_proveedor = [
  { id: 'cr-corte', proveedor_id: 'pv1', unidad_negocio_id: N, origen_gasto_id: null, monto_original: 20000, monto_disponible: 20000, moneda: 'ARS', estado: 'disponible', created_at: '2026-08-01T12:00:00Z', aplicaciones_credito: [] },
];
t.v_saldo_proveedor = [
  { proveedor_id: 'pv1', unidad_negocio_id: N, moneda: 'ARS', deuda_pendiente: 380000, credito_disponible: 20000 },
];

const rpc = copia(cc.rpc);
Object.assign(rpc, {
  datos_orden_pago: {
    id: 'op-5', numero: 5, numero_texto: 'N-OP-00005', fecha: '2026-10-15', total: 250000, observaciones: null, creada_por: 'Usuario Maqueta',
    emisor: { empresa: 'Cucuruchos Nuss', razon_social: 'PAZ MIRTA', cuit: '20924106795', domicilio: 'Unión 843, Córdoba', logo_url: 'logo-cucuruchos-nuss.png' },
    proveedor: { razon_social: 'ANATOLIA SRL', cuit: '30712345678', direccion: 'Ruta 9 km 5' },
    facturas: [
      { tipo: 'Factura A', numero: '0003-00001201', fecha: '2026-08-20', importe: 250000, aplicado: 200000, saldo_actual: 0 },
      { tipo: 'Factura A', numero: '0003-00001245', fecha: '2026-09-05', importe: 400000, aplicado: 50000, saldo_actual: 350000 },
    ],
    cheques: [], otros_medios: [{ medio: 'transferencia', importe: 250000 }], a_favor: 0,
  },
});

module.exports = { uid: cc.uid, tablas: t, rpc };
