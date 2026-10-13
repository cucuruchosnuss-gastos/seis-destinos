// Datos de la maqueta: Cuentas corrientes con las dos pestañas y los cheques
// en un pago (05/10/2026). Ver pruebas/datos-maqueta/README.md.
//
// Parte de los datos de Administración (administracion.js): la pestaña
// Clientes de Cuentas corrientes ES Administración → Clientes abierta adentro,
// y el iframe usa la misma maqueta (sessionStorage es de la pestaña). Suma lo
// de Cuentas corrientes: la cuenta de ANATOLIA SRL en Nuss (dos facturas) y
// las cuentas de cada empresa. Los cheques emitidos (cheques propios) se
// sacaron el 11/10/2026: la empresa no emite cheques propios.
//
//   http://localhost:4180/modulos/cuentas-corrientes.html?maqueta=cc-cheques
//   http://localhost:4180/modulos/administracion.html?seccion=cheques&maqueta=cc-cheques
'use strict';

const admin = require('./administracion');

const N = 'u-n', D = 'u-d';
const copia = (x) => JSON.parse(JSON.stringify(x));
const t = copia(admin.tablas);

const yaTiene = (m, tarea) => t.empleado_tareas.some(x => x.modulo === m && x.tarea === tarea);
for (const [m, tarea] of [['cuentas_corrientes', 'ver_todo'], ['cuentas_corrientes', 'registrar_pago'], ['cuentas_corrientes', 'aplicar_credito'], ['cobranzas', 'procesar'], ['cobranzas', 'ver_todo'], ['retiros', 'ver']]) {
  if (!yaTiene(m, tarea)) t.empleado_tareas.push({ empleado_id: 'emp-1', modulo: m, tarea, alcance: null, habilitado: true });
}

// Las cuentas: dos de banco de Nuss en pesos, una en dólares, una de Dolce
// Pasta y el efectivo de quien registra el pago.
t.cuentas_caja = [
  { id: 'cta-banco-nuss', nombre: 'Banco Macro · Nuss', unidad_negocio_id: N, medio: 'banco', moneda: 'ARS', activa: true, empleado_id: 'emp-empresa' },
  { id: 'cta-nacion-nuss', nombre: 'Banco Nación · Nuss', unidad_negocio_id: N, medio: 'banco', moneda: 'ARS', activa: true, empleado_id: 'emp-empresa' },
  { id: 'cta-usd-nuss', nombre: 'Macro USD', unidad_negocio_id: N, medio: 'banco', moneda: 'USD', activa: true, empleado_id: 'emp-empresa' },
  { id: 'cta-dolce', nombre: 'Macro · Dolce', unidad_negocio_id: D, medio: 'banco', moneda: 'ARS', activa: true, empleado_id: 'emp-empresa' },
  { id: 'cta-efectivo-yo', nombre: 'Efectivo', unidad_negocio_id: null, medio: 'efectivo', moneda: 'ARS', activa: true, empleado_id: 'emp-1' },
];

t.v_saldo_proveedor = [
  { proveedor_id: 'pv1', unidad_negocio_id: N, moneda: 'ARS', deuda_pendiente: 650000, credito_disponible: 0 },
  { proveedor_id: 'pv1', unidad_negocio_id: D, moneda: 'ARS', deuda_pendiente: 90000, credito_disponible: 0 },
];
t.v_cuenta_corriente_movimientos = [
  { proveedor_id: 'pv1', unidad_negocio_id: N, moneda: 'ARS', fecha: '2026-08-20', tipo: 'factura', monto: 250000, factura_pendiente_id: 'fp-1', gasto_id: null, credito_id: null, referencia: '0003-00001201', saldo_acumulado: 250000, orden_desempate: 1 },
  { proveedor_id: 'pv1', unidad_negocio_id: N, moneda: 'ARS', fecha: '2026-09-05', tipo: 'factura', monto: 400000, factura_pendiente_id: 'fp-2', gasto_id: null, credito_id: null, referencia: '0003-00001245', saldo_acumulado: 650000, orden_desempate: 1 },
  { proveedor_id: 'pv1', unidad_negocio_id: D, moneda: 'ARS', fecha: '2026-09-12', tipo: 'factura', monto: 90000, factura_pendiente_id: 'fp-3', gasto_id: null, credito_id: null, referencia: '0003-00001300', saldo_acumulado: 90000, orden_desempate: 1 },
];
t.creditos_proveedor = [];
for (const f of t.facturas_pendientes) { f.importe = f.importe ?? f.saldo_pendiente; }

// Un cheque de la cartera ya usado en un pago desde Cuentas corrientes.
t.cobranza_cheques.push({
  sucursal_codigo: '123', codigo_postal: '5000', dv_ruta: 0, dv_numero: 0, cuenta: '00012345678', dv_cuenta: 0,
  id: 'chq-pago', cobranza_id: 'cob-1', banco_codigo: '007', numero: '77777777', estado: 'endosado', importe: 90000, tipo: 'comun',
  fecha_emision: '2026-09-01', fecha_pago: null, salida_fecha: '2026-10-04', salida_destino: 'ANATOLIA SRL', salida_por: 'emp-1',
  salida_registrada_en: '2026-10-04T12:00:00Z', salida_proveedor_id: null, salida_gasto_id: null, pago_gasto_id: 'g-pago-0',
});

const rpc = copia(admin.rpc);
Object.assign(rpc, {
  mis_pendientes: [],
  remitos_sin_facturar: [],
  sugerir_facturas_fifo: [],
  pagar_proveedor_con_cheques_cartera: 'g-nuevo',
});

module.exports = { uid: admin.uid, tablas: t, rpc };
