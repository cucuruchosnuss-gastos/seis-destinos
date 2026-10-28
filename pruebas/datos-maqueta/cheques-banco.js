// Datos de la maqueta: depositar y vender cheques al banco (13/10/2026), EN
// DOS PASOS: mandar al banco (en_banco) y cargar lo acreditado.
// Ver pruebas/datos-maqueta/README.md.
//
// Parte de los datos de Administración (administracion.js) sin cambiarlos y
// suma lo que hace falta para la cartera:
//  - la Empresa (v_empleados_publico tipo 'empresa') y sus cuentas: dos bancos
//    de Nuss en pesos, uno en dólares (no se ofrece), uno inactivo (no se
//    ofrece) y el de Dolce Pasta; más el efectivo de una persona (no se ofrece);
//  - un cheque en cartera de Dolce Pasta (para el aviso "entre empresas");
//  - un cheque VENDIDO (acreditó $ 95.000 de $ 100.000, con su gasto) y el
//    depositado de siempre con la cuenta donde entró;
//  - tres cheques EN EL BANCO esperando que acrediten: dos ventas de Nuss
//    ($ 300.000 y $ 200.000, mandados el 10/10) y un depósito de Dolce Pasta
//    ($ 50.000, mandado el 12/10) en el Macro de Nuss (para "Entre empresas");
//  - las respuestas de enviar_cheques_al_banco, acreditar_cheques,
//    cancelar_envio_cheques, depositar_cheques y vender_cheques.
//
//   http://localhost:4180/modulos/administracion.html?seccion=cheques&maqueta=cheques-banco
'use strict';

const admin = require('./administracion');

const N = 'u-n', D = 'u-d';
const copia = (x) => JSON.parse(JSON.stringify(x));
const base = copia(admin);
const t = base.tablas;

const yaTiene = (m, tarea) => t.empleado_tareas.some(x => x.modulo === m && x.tarea === tarea);
for (const [m, tarea] of [['cobranzas', 'procesar'], ['cobranzas', 'ver_todo']]) {
  if (!yaTiene(m, tarea)) t.empleado_tareas.push({ empleado_id: 'emp-1', modulo: m, tarea, alcance: null, habilitado: true });
}

t.v_empleados_publico = (t.v_empleados_publico ?? []).concat([
  { id: 'emp-empresa', nombre: 'Empresa', tipo: 'empresa' },
]);

t.cuentas_caja = (t.cuentas_caja ?? []).filter(c => !['cta-banco-nuss'].includes(c.id)).concat([
  { id: 'cta-banco-nuss', nombre: 'Banco Macro · Nuss', unidad_negocio_id: N, medio: 'banco', moneda: 'ARS', activa: true, empleado_id: 'emp-empresa' },
  { id: 'cta-nacion-nuss', nombre: 'Banco Nación · Nuss', unidad_negocio_id: N, medio: 'banco', moneda: 'ARS', activa: true, empleado_id: 'emp-empresa' },
  { id: 'cta-usd-nuss', nombre: 'Macro USD', unidad_negocio_id: N, medio: 'banco', moneda: 'USD', activa: true, empleado_id: 'emp-empresa' },
  { id: 'cta-vieja-nuss', nombre: 'Banco Viejo · Nuss', unidad_negocio_id: N, medio: 'banco', moneda: 'ARS', activa: false, empleado_id: 'emp-empresa' },
  { id: 'cta-dolce', nombre: 'Macro · Dolce', unidad_negocio_id: D, medio: 'banco', moneda: 'ARS', activa: true, empleado_id: 'emp-empresa' },
  { id: 'cta-persona', nombre: 'Banco de Emanuel', unidad_negocio_id: N, medio: 'banco', moneda: 'ARS', activa: true, empleado_id: 'emp-9' },
]);

const cheque = (extra) => Object.assign({
  sucursal_codigo: '123', codigo_postal: '5000', dv_ruta: 0, dv_numero: 0, cuenta: '00012345678', dv_cuenta: 0,
  salida_fecha: null, salida_destino: null, salida_por: null, salida_registrada_en: null, salida_proveedor_id: null,
  salida_cuenta_id: null, venta_neto: null, venta_gasto_id: null, salida_modo: null, envio_fecha: null, envio_detalle: null, tipo: 'comun', fecha_pago: null,
}, extra);

// El depositado de siempre (chq-4) ahora dice en qué cuenta entró.
const depositado = t.cobranza_cheques.find(c => c.id === 'chq-4');
if (depositado) Object.assign(depositado, { salida_cuenta_id: 'cta-dolce', salida_destino: 'Macro · Dolce' });

t.cobranza_cheques.push(
  cheque({ id: 'chq-b1', cobranza_id: 'cob-1', banco_codigo: '007', numero: '90000001', estado: 'en_banco', importe: 300000, fecha_emision: '2026-09-15',
    salida_por: 'emp-1', salida_destino: 'Banco Macro · Nuss', salida_cuenta_id: 'cta-banco-nuss', salida_modo: 'venta', envio_fecha: '2026-10-10' }),
  cheque({ id: 'chq-b2', cobranza_id: 'cob-1', banco_codigo: '011', numero: '90000002', estado: 'en_banco', importe: 200000, fecha_emision: '2026-09-15',
    salida_por: 'emp-1', salida_destino: 'Banco Macro · Nuss', salida_cuenta_id: 'cta-banco-nuss', salida_modo: 'venta', envio_fecha: '2026-10-10' }),
  cheque({ id: 'chq-b3', cobranza_id: 'cob-3', banco_codigo: '285', numero: '90000003', estado: 'en_banco', importe: 50000, fecha_emision: '2026-09-20',
    salida_por: 'emp-1', salida_destino: 'Banco Macro · Nuss', salida_cuenta_id: 'cta-banco-nuss', salida_modo: 'deposito', envio_fecha: '2026-10-12' }),
  cheque({ id: 'chq-dolce', cobranza_id: 'cob-3', banco_codigo: '011', numero: '44445555', estado: 'en_cartera', importe: 80000, fecha_emision: '2026-08-25' }),
  cheque({
    id: 'chq-vendido', cobranza_id: 'cob-1', banco_codigo: '285', numero: '55556666', estado: 'vendido', importe: 100000,
    fecha_emision: '2026-09-01', tipo: 'diferido', fecha_pago: '2026-11-30',
    salida_fecha: '2026-10-05', salida_destino: 'Banco Macro · Nuss', salida_por: 'emp-1', salida_registrada_en: '2026-10-05T12:00:00Z',
    salida_cuenta_id: 'cta-banco-nuss', venta_neto: 95000, venta_gasto_id: 'g-venta-1',
  }),
);

base.rpc = Object.assign(base.rpc ?? {}, {
  enviar_cheques_al_banco: { cheques: 2, total: 537300.5 },
  // ACREDITAR VENTA Y DEPÓSITO (28/10/2026): un renglón por cuenta y modo.
  // Las dos ventas (chq-b1 y chq-b2, $ 500.000) acreditaron $ 490.000 (gasto
  // de $ 10.000) y el depósito (chq-b3, $ 50.000) entró entero con $ 1.500
  // de gastos del banco. La base crea los dos gastos sola.
  acreditar_cheques: [
    { cuenta: 'Banco Macro · Nuss', modo: 'venta', cheques: 2, bruto: 500000, acreditado: 490000, gastos: 10000, caja_movimiento_id: 'cm-acr', gasto_id: 'g-acr-venta' },
    { cuenta: 'Banco Macro · Nuss', modo: 'deposito', cheques: 1, bruto: 50000, acreditado: 50000, gastos: 1500, caja_movimiento_id: 'cm-acr', gasto_id: 'g-acr-deposito' },
  ],
  cancelar_envio_cheques: 2,
  depositar_cheques: { cheques: 2, bruto: 537300.5, neto: 537300.5, descuento: 0, caja_movimiento_id: 'cm-dep', gasto_id: null },
  vender_cheques: { cheques: 1, bruto: 387300.5, neto: 387300.5, descuento: 0, caja_movimiento_id: 'cm-ven', gasto_id: null },
});

module.exports = base;
