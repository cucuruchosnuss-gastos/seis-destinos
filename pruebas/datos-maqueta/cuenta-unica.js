// Datos de la maqueta: CLIENTE Y PROVEEDOR (06/10/2026). Ver
// pruebas/datos-maqueta/README.md.
//
// Parte de los de Cuentas corrientes con cheques (cc-cheques.js, que a su vez
// parte de Administración): Distribuidora Anatolia (c1, Nuss) es cliente y
// también es el proveedor ANATOLIA SRL (pv1). Suma la cuenta de las dos cosas
// juntas (cuenta_unificada), las facturas abiertas para compensar
// (sugerir_facturas_fifo) y las respuestas de vincular / separar / compensar.
//
//   http://localhost:4180/modulos/administracion.html?seccion=clientes&maqueta=cuenta-unica
//   http://localhost:4180/modulos/cuentas-corrientes.html?proveedor=pv1&unidad=u-n&maqueta=cuenta-unica
'use strict';

const cc = require('./cc-cheques');

const N = 'u-n';
const copia = (x) => JSON.parse(JSON.stringify(x));
const t = copia(cc.tablas);

// Lo que pide compensar (cobranzas:procesar y cuentas_corrientes:registrar_pago)
// y vincular (retiros:precios, alta_proveedor).
const yaTiene = (m, tarea) => t.empleado_tareas.some(x => x.modulo === m && x.tarea === tarea);
for (const [m, tarea] of [['cobranzas', 'procesar'], ['cuentas_corrientes', 'registrar_pago'], ['cuentas_corrientes', 'alta_proveedor'], ['retiros', 'precios'], ['retiros', 'ver']]) {
  if (!yaTiene(m, tarea)) t.empleado_tareas.push({ empleado_id: 'emp-1', modulo: m, tarea, alcance: { todas: true }, habilitado: true });
}

// La cuenta de cliente y proveedor de Anatolia en Nuss: como cliente nos debe
// 126.000 (saldo inicial, una venta, una cobranza); como proveedor le debemos
// 650.000 (dos facturas). Neto: le debemos 524.000.
const fila = (fecha, orden, lado, etiqueta, detalle, te, le, teAc, leAc) => ({
  fecha, orden, lado, etiqueta, detalle, moneda: 'ARS', te_debe: te, le_debes: le,
  te_debe_acum: teAc, le_debes_acum: leAc, neto_acum: teAc - leAc,
  cliente_id: 'c1', proveedor_id: 'pv1', unidad_negocio_id: N,
  orden_retiro_id: null, cobranza_id: null, gasto_id: null, factura_pendiente_id: null,
});
const CUENTA = [
  fila('2026-08-20', '2026-08-21T10:00:00Z', 'proveedor', 'Compra', 'Factura A 0003-00001201', 0, 250000, 0, 250000),
  fila('2026-09-01', '2026-09-01T12:00:00Z', 'cliente', 'Saldo inicial', 'Deuda de agosto', 80000, 0, 80000, 250000),
  fila('2026-09-05', '2026-09-06T10:00:00Z', 'proveedor', 'Compra', 'Factura A 0003-00001245', 0, 400000, 80000, 650000),
  fila('2026-09-20', '2026-09-20T12:00:00Z', 'cliente', 'Venta', 'Orden de retiro N° 12', 76000, 0, 156000, 650000),
  fila('2026-09-22', '2026-09-22T12:00:00Z', 'cliente', 'Cobranza', 'Cobranza de la ruta', -30000, 0, 126000, 650000),
];

const rpc = copia(cc.rpc);
Object.assign(rpc, {
  cuenta_unificada: { __segun: [{ si: { p_cliente_id: 'c1' }, r: CUENTA }], __defecto: [] },
  sugerir_facturas_fifo: { __segun: [{ si: { p_proveedor_id: 'pv1', p_unidad_negocio_id: N }, r: [
    { factura_pendiente_id: 'fp-1', fecha_factura: '2026-08-20', numero_comprobante: '0003-00001201', saldo_pendiente: 250000, monto_a_aplicar: 250000 },
    { factura_pendiente_id: 'fp-2', fecha_factura: '2026-09-05', numero_comprobante: '0003-00001245', saldo_pendiente: 400000, monto_a_aplicar: 400000 },
  ] }], __defecto: [] },
  compensar_cuentas: 'g-compensacion',
  vincular_cliente_proveedor: 'pv-nuevo',
  vincular_proveedor_cliente: 'c-nuevo',
  desvincular_cliente_proveedor: null,
});

module.exports = { uid: cc.uid, tablas: t, rpc };
