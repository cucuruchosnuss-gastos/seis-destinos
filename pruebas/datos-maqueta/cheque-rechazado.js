// Datos de la maqueta: el CHEQUE RECHAZADO y la NOTA DE DÉBITO (24/10/2026).
// Ver pruebas/datos-maqueta/README.md.
//
// Parte de los de la cartera al banco (cheques-banco.js) sin cambiarlos y suma:
//  - un cheque ya RECHAZADO (chq-rech, el 20/10 por "Sin fondos") con su nota
//    de débito al cliente N-ND-0001 (notas_debito);
//  - las respuestas de buscar_cheques_para_rechazo (el depositado chq-4 de
//    Dolce Pasta y el endosado a ANATOLIA SRL chq-6), registrar_cheque_rechazado,
//    datos_nota_debito (la hoja), anular_nota_debito y
//    registrar_nota_debito_cliente;
//  - en la cuenta del cliente c1, "Nota de débito N-ND-0001".
//
//   http://localhost:4180/modulos/administracion.html?seccion=cheques&maqueta=cheque-rechazado
'use strict';

const banco = require('./cheques-banco');

const copia = (x) => JSON.parse(JSON.stringify(x));
const base = copia(banco);
const t = base.tablas;

// Para cargar la nota de débito del proveedor hace falta «Registrar pagos a proveedores».
if (!t.empleado_tareas.some(x => x.modulo === 'cuentas_corrientes' && x.tarea === 'registrar_pago')) {
  t.empleado_tareas.push({ empleado_id: 'emp-1', modulo: 'cuentas_corrientes', tarea: 'registrar_pago', alcance: null, habilitado: true });
}

t.cobranza_cheques.push({
  id: 'chq-rech', cobranza_id: 'cob-1', banco_codigo: '285', numero: '77778888', estado: 'rechazado', importe: 150000,
  sucursal_codigo: '123', codigo_postal: '5000', dv_ruta: 0, dv_numero: 0, cuenta: '00012345678', dv_cuenta: 0,
  tipo: 'comun', fecha_emision: '2026-09-25', fecha_pago: null,
  salida_fecha: '2026-10-10', salida_destino: 'Banco Macro · Nuss', salida_por: 'emp-1', salida_registrada_en: '2026-10-10T12:00:00Z',
  salida_proveedor_id: null, salida_cuenta_id: 'cta-banco-nuss', venta_neto: null, venta_gasto_id: null, salida_modo: null, envio_fecha: null, envio_detalle: null,
  rechazo_fecha: '2026-10-20', rechazo_motivo: 'Sin fondos', rechazo_estado_anterior: 'depositado',
});

t.notas_debito = [
  { id: 'nd-1', unidad_negocio_id: 'u-n', direccion: 'emitida', numero: 1, codigo: 'N-ND-0001', cliente_id: 'c1', proveedor_id: null, fecha: '2026-10-20',
    cheque_id: 'chq-rech', total: 151500.5, estado: 'vigente' },
];

const HOJA = {
  id: 'nd-1', direccion: 'emitida', codigo: 'N-ND-0001', comprobante: null, fecha: '2026-10-20', estado: 'vigente', anulada_motivo: null,
  items: [
    { concepto: 'Cheque rechazado BANCO MACRO S.A. Nº 77778888', importe: 150000 },
    { concepto: 'Gastos de cheque rechazado', importe: 1500.5 },
  ],
  total: 151500.5, moneda: 'ARS', observaciones: 'Rechazo: Sin fondos', archivo_url: null,
  empresa: { nombre: 'Cucuruchos Nuss', razon_social: 'PAZ MIRTA', cuit: '20924106795', domicilio: 'Unión 843, Córdoba', telefono: '351 555-0000', logo_url: 'logo-cucuruchos-nuss.png' },
  cliente: { id: 'c1', nombre: 'Distribuidora Anatolia', razon_social: 'ANATOLIA SRL', cuit: '30712345678', domicilio: 'Ruta 9 km 3', localidad: 'Córdoba', condicion_iva: 'responsable_inscripto', email: null },
  proveedor: null,
  cheque: { banco: 'BANCO MACRO S.A.', numero: '77778888', importe: 150000, fecha_pago: null, rechazo_fecha: '2026-10-20', rechazo_motivo: 'Sin fondos' },
  cargada_por: 'Yanina', cargada_en: '2026-10-20T15:00:00Z',
};

const BUSCADOS = [
  { cheque_id: 'chq-4', banco_codigo: '007', banco: 'BANCO DE GALICIA', numero: '11112222', importe: 250000, fecha_pago: '2026-09-01', es_echeck: false,
    estado: 'depositado', salida_fecha: '2026-09-02', destino: 'Macro · Dolce', cliente_id: 'c1', cliente: 'Distribuidora Anatolia', unidad_negocio_id: 'u-d',
    proveedor_id: null, proveedor: null, titulares: [] },
  { cheque_id: 'chq-6', banco_codigo: '285', banco: 'BANCO MACRO S.A.', numero: '68435161', importe: 550000, fecha_pago: null, es_echeck: false,
    estado: 'endosado', salida_fecha: '2026-09-22', destino: 'ANATOLIA SRL', cliente_id: null, cliente: null, unidad_negocio_id: 'u-n',
    proveedor_id: 'pv1', proveedor: 'ANATOLIA SRL', titulares: [] },
];

const cuenta = base.rpc.cuenta_cliente;
const movimientoNota = { fecha: '2026-10-20', tipo: 'nota_debito', detalle: 'Nota de débito N-ND-0001', importe: 151500.5, saldo: null, orden_retiro_id: null };
if (cuenta && Array.isArray(cuenta.__defecto)) {
  const ultimo = cuenta.__defecto[cuenta.__defecto.length - 1];
  movimientoNota.saldo = Number(ultimo?.saldo ?? 0) + movimientoNota.importe;
  cuenta.__defecto.push(movimientoNota);
}

Object.assign(base.rpc, {
  buscar_cheques_para_rechazo: { __segun: [{ si: { p_texto: '1' }, r: [] }], __defecto: BUSCADOS },
  registrar_cheque_rechazado: { nota_debito_cliente_id: 'nd-1', codigo: 'N-ND-0001', total_cliente: 251500.5, nota_debito_proveedor_id: null,
    caja_movimiento_id: 'cm-rech', proveedor_id: null, estado_anterior: 'depositado' },
  datos_nota_debito: HOJA,
  anular_nota_debito: null,
  registrar_nota_debito_cliente: { nota_debito_id: 'nd-1', codigo: 'N-ND-0001', total: 2500 },
});

module.exports = base;
