// Datos de la maqueta: cobranzas (ver pruebas/datos-maqueta/README.md).
// Se generan a e2e/maqueta/datos/cobranzas.json con `npm run maqueta:datos`.
//
// La persona tiene DOS unidades (su unidad propia, Cucuruchos Nuss, y Dolce
// Pasta por el alcance de una tarea), así la barra de unidad de arriba se
// dibuja con "Todas" + las dos. Las cobranzas cubren cada caso de la barra
// (28/09/2026): asentadas de cada unidad, una asentada vieja sin unidad, por
// controlar (una reabierta que conserva la unidad de antes) y anuladas.
'use strict';
const { UID, tarea, UNIDADES } = require('./comun');

const EMP = 'emp-cob';
const cob = (id, extra) => ({
  id, empleado_id: EMP, cliente: 'Don Pepe', cliente_normalizado: 'donpepe', fecha: '2026-09-26',
  created_at: '2026-09-26T15:00:00Z', efectivo: 0, moneda: 'ARS', comprobante_referencia: null, observaciones: null,
  estado: 'registrada', procesada_por: null, procesada_en: null, anulada_por: null, anulada_en: null, motivo_anulacion: null,
  unidad_negocio_id: null, unidad_negocio_nombre: null,
  total_cheques: 150000, cantidad_cheques: 1, total: 150000,
  cargada_por_nombre: 'Mariano Gómez', procesada_por_nombre: null, anulada_por_nombre: null, editada: false,
  ...extra,
});
const asentada = (unidad, nombre) => ({ estado: 'procesada', procesada_por_nombre: 'Emanuel Romero', procesada_en: '2026-09-27T12:00:00Z', unidad_negocio_id: unidad, unidad_negocio_nombre: nombre });

module.exports = {
  uid: UID,
  tablas: {
    empleados: [
      { id: EMP, rol_app: 'usuario', nombre: 'Facundo Maqueta', auth_user_id: UID, unidad_negocio_id: 'u-n', es_prueba: false, es_dispositivo: false },
    ],
    empleado_modulos: [
      { empleado_id: EMP, modulo: 'cobranzas', habilitado: true },
      { empleado_id: EMP, modulo: 'stock', habilitado: true },
    ],
    empleado_tareas: [
      tarea(EMP, 'cobranzas', 'cargar'),
      tarea(EMP, 'cobranzas', 'ver_todo'),
      tarea(EMP, 'cobranzas', 'procesar'),
      // La segunda unidad de la barra sale del alcance de esta tarea.
      tarea(EMP, 'stock', 'ver', { unidades: ['u-d'] }),
    ],
    unidades_negocio: UNIDADES,
    v_empleados_publico: [
      { id: EMP, nombre: 'Facundo Maqueta', unidad_negocio_id: 'u-n', tiene_acceso: true, tipo: 'naaloo', activo: true },
      { id: 'emp-mariano', nombre: 'Mariano Gómez', unidad_negocio_id: 'u-n', tiene_acceso: true, tipo: 'naaloo', activo: true },
    ],
    bancos_bcra: [
      { codigo: '007', denominacion: 'BANCO DE GALICIA Y BUENOS AIRES S.A.U.', activo: true },
    ],
    v_cobranzas: [
      cob('00000000-0000-4000-8000-000000000001', { cliente: 'Caserato', cliente_normalizado: 'caserato' }),
      cob('00000000-0000-4000-8000-000000000002', { cliente: 'Kiosco El Turco', cliente_normalizado: 'kioscoelturco', efectivo: 25000, cantidad_cheques: 0, total_cheques: 0, total: 25000 }),
      cob('00000000-0000-4000-8000-000000000003', { cliente: 'Heladería Laponia', cliente_normalizado: 'heladerialaponia', ...asentada('u-n', 'Cucuruchos Nuss') }),
      cob('00000000-0000-4000-8000-000000000004', { cliente: 'Distribuidora Anatolia', cliente_normalizado: 'distribuidoraanatolia', total: 480000, total_cheques: 480000, cantidad_cheques: 2, ...asentada('u-d', 'Dolce Pasta') }),
      cob('00000000-0000-4000-8000-000000000005', { cliente: 'Almacén Don Luis', cliente_normalizado: 'almacendonluis', ...asentada(null, null) }),
      // Reabierta: la columna conserva la unidad de antes (reabrir_cobranza no la limpia).
      cob('00000000-0000-4000-8000-000000000006', { cliente: 'Supermercado La Estrella', cliente_normalizado: 'supermercadolaestrella', unidad_negocio_id: 'u-d', unidad_negocio_nombre: 'Dolce Pasta' }),
      cob('00000000-0000-4000-8000-000000000007', { cliente: 'Pastas Doña Rosa', cliente_normalizado: 'pastasdonarosa', estado: 'anulada', anulada_por_nombre: 'Emanuel Romero', anulada_en: '2026-09-27T13:00:00Z', motivo_anulacion: 'Cargada dos veces', unidad_negocio_id: 'u-d', unidad_negocio_nombre: 'Dolce Pasta' }),
    ],
  },
  rpc: {
    resumen_cobranzas: [{ por_controlar: 3, cantidad: 5, total: 955000 }],
    mis_pendientes: [{ modulo: 'cobranzas', clave: 'por_controlar', cantidad: 3, texto: 'Cobranzas por controlar' }],
    // La cobranza ya asentada (01/10/2026): la lista de clientes de cada
    // empresa. Viene mezclada a propósito: la pantalla se queda con los de la
    // empresa elegida.
    buscar_clientes: [
      { cliente_id: 'cli-jm-d', nombre: 'J&M', razon_social: 'J Y M SA', localidad: 'Rosario', empresa: 'Dolce Pasta', unidad_negocio_id: 'u-d', activo: true, saldo: 250000, parecido: 0, apodos: [], apodo_coincide: null },
      { cliente_id: 'cli-ana-d', nombre: 'Distribuidora Anatolia', razon_social: 'ANATOLIA SRL', localidad: 'Córdoba', empresa: 'Dolce Pasta', unidad_negocio_id: 'u-d', activo: true, saldo: -15000, parecido: 0, apodos: [], apodo_coincide: null },
      { cliente_id: 'cli-jm-n', nombre: 'J&M', razon_social: 'J Y M SA', localidad: 'Rosario', empresa: 'Cucuruchos Nuss', unidad_negocio_id: 'u-n', activo: true, saldo: 98000, parecido: 0, apodos: [], apodo_coincide: null },
      { cliente_id: 'cli-lap-n', nombre: 'Heladería Laponia', razon_social: null, localidad: 'Villa Carlos Paz', empresa: 'Cucuruchos Nuss', unidad_negocio_id: 'u-n', activo: true, saldo: 0, parecido: 0, apodos: [], apodo_coincide: null },
    ],
    cargar_cobranza_asentada: { id: 'x', importe: 100000, saldo_cliente: 150000, asentada: true },
  },
};

// LAS CUATRO FORMAS DE PAGO (30/09/2026): una cobranza con efectivo, un cheque
// de papel, un e-cheque y una transferencia. v_cobranzas no suma la
// transferencia (160.000); la pantalla la lee aparte y muestra 190.000.
{
  const t = module.exports.tablas
  const ID = '00000000-0000-4000-8000-000000000008'
  t.v_cobranzas.push(cob(ID, { cliente: 'Distribuidora Anatolia (cuatro formas)', cliente_normalizado: 'distribuidoraanatoliacuatroformas', fecha: '2026-09-25',
    efectivo: 10000, cantidad_cheques: 2, total_cheques: 150000, total: 160000 }))
  t.cobranza_cheques = [
    { id: 'p8', cobranza_id: ID, foto_id: 'f8', es_echeck: false, banco_codigo: '007', sucursal_codigo: '123', codigo_postal: '5000', numero: '70000001',
      cuenta: '00012345678', tipo: 'diferido', fecha_emision: '2026-09-20', fecha_pago: '2026-10-20', importe: 100000, estado: 'en_cartera', titulares: [], origen_datos: 'ocr' },
    { id: 'e8', cobranza_id: ID, foto_id: null, es_echeck: true, banco_codigo: '007', sucursal_codigo: null, codigo_postal: null, numero: '00000042',
      cuenta: null, tipo: 'diferido', fecha_emision: '2026-09-20', fecha_pago: '2026-10-30', importe: 50000, estado: 'en_cartera', titulares: [], origen_datos: 'manual' },
  ]
  t.cobranza_transferencias = [
    { id: 't8', cobranza_id: ID, cuenta_id: 'cta-banco-nuss', importe: 30000, fecha: '2026-09-25', referencia: 'Op. 4455', created_at: '2026-09-25T15:00:00Z' },
  ]
  t.cuentas_caja = [
    { id: 'cta-banco-nuss', nombre: 'Banco Macro · Nuss', unidad_negocio_id: 'u-n', medio: 'banco', moneda: 'ARS', empleado_id: 'emp-empresa', activa: true },
    // (02/10/2026) Una cuenta de banco de Dolce Pasta: una transferencia de
    // una cobranza de Dolce ofrece SOLO esta.
    { id: 'cta-banco-dolce', nombre: 'Banco Galicia · Dolce', unidad_negocio_id: 'u-d', medio: 'banco', moneda: 'ARS', empleado_id: 'emp-empresa', activa: true },
  ]
  t.v_empleados_publico.push({ id: 'emp-empresa', nombre: 'Empresa', unidad_negocio_id: null, tiene_acceso: false, tipo: 'empresa', activo: false })
}

// "¿CÓMO PAGÓ?" (02/10/2026): lo que propone el lector nuevo de comprobantes
// (ocr-cobranza-comprobantes) al subir una captura de una transferencia.
module.exports.funciones = {
  'ocr-cobranza-comprobantes': {
    ok: true, modelo: 'maqueta', tipo: 'transferencia', crudo: { comprobantes: [{}] },
    propuestos: [{ importe: 150000, fecha: '2026-09-26', banco_origen: 'Mercado Pago', ordenante: 'J Y M SA', cuit_ordenante: '30719434777',
      referencia: '000123456789', controles: { cuit_ok: true, fecha_ok: true } }],
  },
}
