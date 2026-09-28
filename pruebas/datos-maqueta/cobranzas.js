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
  },
};
