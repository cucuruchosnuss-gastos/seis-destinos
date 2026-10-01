// Datos de la maqueta y de las pruebas: Caja (ver pruebas/datos-maqueta/README.md).
// Se generan a e2e/maqueta/datos/caja.json con `npm run maqueta:datos`.
//
// Para mirar la barra de unidad (28/09/2026): una cuenta super_admin (la barra
// ofrece todas las unidades reales), personas en Nuss y en Dolce Pasta, y la
// Empresa con cuentas de las dos unidades y UNA sin unidad (se ve marcada).
'use strict';
const { UID, tarea, UNIDADES } = require('./comun');

const YO = 'emp-yo';
const EMPRESA = 'emp-empresa';
const hoy = '2026-09-28';

const persona = (id, nombre, unidad, extra = {}) => ({
  id, nombre, tipo: 'naaloo', unidad_negocio_id: unidad, rol_app: 'usuario',
  caja_raiz: false, oculto_como_contraparte: false, tiene_acceso: true, activo: true, ...extra,
});

const cuenta = (id, empleado_id, nombre, medio, unidad_negocio_id = null, extra = {}) => ({
  id, empleado_id, nombre, medio, moneda: 'ARS', favorita: false, activa: true, created_at: '2026-08-01T12:00:00Z',
  cbu: null, numero_cuenta: null, alias: null, unidad_negocio_id, ...extra,
});

const mov = (id, empleado_id, cuenta_id, tipo, monto, descripcion = null, medio_pago = 'efectivo') => ({
  id, empleado_id, cuenta_id, tipo, monto, moneda: 'ARS', medio_pago, fecha: hoy, descripcion,
  gasto_id: null, contraparte_empleado_id: null, created_at: hoy + 'T12:00:00Z',
});

module.exports = {
  uid: UID,
  tablas: {
    empleados: [
      { id: YO, auth_user_id: UID, nombre: 'Facu Maqueta', rol_app: 'super_admin', caja_raiz: false,
        activo: true, unidad_negocio_id: 'u-n', es_prueba: false, es_dispositivo: false },
    ],
    empleado_modulos: [
      { empleado_id: YO, modulo: 'caja', habilitado: true },
      { empleado_id: YO, modulo: 'gastos', habilitado: true },
    ],
    empleado_tareas: [
      tarea(YO, 'caja', 'ver_listado'),
      tarea(YO, 'caja', 'ver_empresa'),
      tarea(YO, 'caja', 'retiros_todos'),
      tarea(YO, 'caja', 'movimientos_todos'),
      // El ingreso externo (préstamos, aportes): super_admin + la tarea.
      tarea(YO, 'caja', 'ingreso_externo_empresa'),
    ],
    unidades_negocio: UNIDADES,
    v_empleados_publico: [
      persona(YO, 'Facu Maqueta', 'u-n', { tipo: 'admin', rol_app: 'super_admin' }),
      persona('emp-ana', 'Ana Nuss', 'u-n'),
      persona('emp-beto', 'Beto Dolce', 'u-d'),
      persona('emp-carla', 'Carla Dolce', 'u-d'),
      { id: EMPRESA, nombre: 'Empresa', tipo: 'empresa', unidad_negocio_id: null, rol_app: 'usuario',
        caja_raiz: false, oculto_como_contraparte: false, tiene_acceso: false, activo: false },
    ],
    cuentas_caja: [
      cuenta('c-yo', YO, 'Efectivo', 'efectivo', null, { favorita: true }),
      cuenta('c-ana', 'emp-ana', 'Efectivo', 'efectivo', null, { favorita: true }),
      cuenta('c-beto', 'emp-beto', 'Efectivo', 'efectivo', null, { favorita: true }),
      cuenta('c-carla', 'emp-carla', 'Banco Galicia', 'banco', null, { favorita: true }),
      cuenta('c-e-n1', EMPRESA, 'Caja fuerte Nuss', 'efectivo', 'u-n', { favorita: true }),
      cuenta('c-e-n2', EMPRESA, 'Banco Macro Nuss', 'banco', 'u-n', { favorita: true, cbu: '2850590940090418135201', alias: 'nuss.macro' }),
      cuenta('c-e-d1', EMPRESA, 'Banco Santander Dolce', 'banco', 'u-d'),
      cuenta('c-e-x', EMPRESA, 'Caja chica vieja', 'efectivo', null),
    ],
    v_caja_saldos: [
      { empleado_id: YO, moneda: 'ARS', saldo: 15000 },
      { empleado_id: 'emp-ana', moneda: 'ARS', saldo: 42000 },
      { empleado_id: 'emp-beto', moneda: 'ARS', saldo: 8500 },
      { empleado_id: 'emp-carla', moneda: 'ARS', saldo: 120000 },
      { empleado_id: EMPRESA, moneda: 'ARS', saldo: 2951000 },
    ],
    v_caja_saldos_cuenta: [
      { cuenta_id: 'c-yo', saldo: 15000 },
      { cuenta_id: 'c-ana', saldo: 42000 },
      { cuenta_id: 'c-beto', saldo: 8500 },
      { cuenta_id: 'c-carla', saldo: 120000 },
      { cuenta_id: 'c-e-n1', saldo: 350000 },
      { cuenta_id: 'c-e-n2', saldo: 1800000 },
      { cuenta_id: 'c-e-d1', saldo: 800000 },
      { cuenta_id: 'c-e-x', saldo: 1000 },
    ],
    caja_movimientos: [
      mov('m-1', 'emp-ana', 'c-ana', 'egreso_retiro', 5000, 'Retiro de la semana'),
      mov('m-2', 'emp-beto', 'c-beto', 'egreso_retiro', 3000, 'Retiro'),
      mov('m-3', EMPRESA, 'c-e-n2', 'ingreso_externo', 250000, 'Cobranza de un cliente', 'transferencia'),
      mov('m-4', EMPRESA, 'c-e-d1', 'ingreso_externo', 180000, 'Depósito', 'transferencia'),
      mov('m-5', EMPRESA, 'c-e-x', 'egreso_gasto', 1500, 'Caja chica'),
      // Un ajuste de saldo cargado desde la base (01/10/2026): "Ajuste", en gris.
      mov('m-6', EMPRESA, 'c-e-n2', 'egreso_ajuste', 12500, 'Diferencia del arqueo de septiembre'),
    ],
    caja_solicitudes_movimiento: [],
  },
  rpc: {
    mis_pendientes: [],
  },
};
