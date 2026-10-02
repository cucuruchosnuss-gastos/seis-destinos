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

// unidad: caja_movimientos.unidad_negocio_id (01/10/2026), la que completa el
// trigger de la base (la del gasto, la de la cuenta de empresa o la de la persona).
// fecha: para el saldo corriente (30/09/2026), los movimientos viejos de cada cuenta.
const mov = (id, empleado_id, cuenta_id, tipo, monto, descripcion = null, medio_pago = 'efectivo', unidad = null, fecha = hoy) => ({
  id, empleado_id, cuenta_id, tipo, monto, moneda: 'ARS', medio_pago, fecha, descripcion,
  gasto_id: null, contraparte_empleado_id: null, created_at: fecha + 'T12:00:00Z', unidad_negocio_id: unidad,
});

// El SALDO CORRIENTE (30/09/2026): la cuenta de Ana tiene varios movimientos y
// uno la deja negativa; el último saldo de cada cuenta coincide con
// v_caja_saldos_cuenta (por eso cada cuenta lleva su ingreso de agosto), con
// los ajustes de por medio (e-1b suma, m-6 resta) y el gasto de Nuss pagado
// desde la caja de Beto (m-7), que con Nuss elegido aparece en la ficha de
// Empresa con el saldo de la cuenta ENTERA de Beto.

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
      { empleado_id: 'emp-ana', moneda: 'ARS', saldo: -8000 },
      { empleado_id: 'emp-beto', moneda: 'ARS', saldo: 8500 },
      { empleado_id: 'emp-carla', moneda: 'ARS', saldo: 120000 },
      { empleado_id: EMPRESA, moneda: 'ARS', saldo: 2951000 },
    ],
    v_caja_saldos_cuenta: [
      { cuenta_id: 'c-yo', saldo: 15000 },
      { cuenta_id: 'c-ana', saldo: -8000 },
      { cuenta_id: 'c-beto', saldo: 8500 },
      { cuenta_id: 'c-carla', saldo: 120000 },
      { cuenta_id: 'c-e-n1', saldo: 350000 },
      { cuenta_id: 'c-e-n2', saldo: 1800000 },
      { cuenta_id: 'c-e-d1', saldo: 800000 },
      { cuenta_id: 'c-e-x', saldo: 1000 },
    ],
    caja_movimientos: [
      mov('a-1', 'emp-ana', 'c-ana', 'ingreso', 100000, 'Entrega de la semana', 'efectivo', 'u-n', '2026-09-01'),
      mov('a-2', 'emp-ana', 'c-ana', 'egreso_gasto', 20000, 'Combustible', 'efectivo', 'u-n', '2026-09-02'),
      mov('a-3', 'emp-ana', 'c-ana', 'egreso_retiro', 90000, 'Retiro', 'efectivo', 'u-n', '2026-09-10'),
      mov('a-4', 'emp-ana', 'c-ana', 'ingreso_reversion_gasto', 7000, 'Gasto anulado', 'efectivo', 'u-n', '2026-09-20'),
      mov('y-0', YO, 'c-yo', 'ingreso', 15000, 'Saldo inicial', 'efectivo', 'u-n', '2026-08-01'),
      mov('b-0', 'emp-beto', 'c-beto', 'ingreso', 15700, 'Saldo inicial', 'efectivo', 'u-d', '2026-08-15'),
      mov('c-0', 'emp-carla', 'c-carla', 'ingreso', 120000, 'Saldo inicial', 'transferencia', 'u-d', '2026-08-01'),
      mov('e-1', EMPRESA, 'c-e-n1', 'ingreso', 345000, 'Saldo inicial', 'efectivo', 'u-n', '2026-08-01'),
      // Un ajuste que SUMA (01/10/2026): el saldo corriente lo cuenta igual.
      mov('e-1b', EMPRESA, 'c-e-n1', 'ingreso_ajuste', 5000, 'Sobrante del arqueo de agosto', 'efectivo', 'u-n', '2026-09-01'),
      mov('e-2', EMPRESA, 'c-e-n2', 'ingreso', 1562500, 'Saldo inicial', 'transferencia', 'u-n', '2026-08-01'),
      mov('e-3', EMPRESA, 'c-e-d1', 'ingreso', 620000, 'Saldo inicial', 'transferencia', 'u-d', '2026-08-01'),
      mov('e-4', EMPRESA, 'c-e-x', 'ingreso', 2500, 'Saldo inicial', 'efectivo', null, '2026-08-01'),
      mov('m-1', 'emp-ana', 'c-ana', 'egreso_retiro', 5000, 'Retiro de la semana', 'efectivo', 'u-n'),
      mov('m-2', 'emp-beto', 'c-beto', 'egreso_retiro', 3000, 'Retiro', 'efectivo', 'u-d'),
      mov('m-3', EMPRESA, 'c-e-n2', 'ingreso_externo', 250000, 'Cobranza de un cliente', 'transferencia', 'u-n'),
      mov('m-4', EMPRESA, 'c-e-d1', 'ingreso_externo', 180000, 'Depósito', 'transferencia', 'u-d'),
      mov('m-5', EMPRESA, 'c-e-x', 'egreso_gasto', 1500, 'Caja chica'),
      // Un ajuste de saldo cargado desde la base (01/10/2026): "Ajuste", en gris.
      mov('m-6', EMPRESA, 'c-e-n2', 'egreso_ajuste', 12500, 'Diferencia del arqueo de septiembre', 'efectivo', 'u-n'),
      // Un gasto de Nuss pagado desde la caja personal de Beto (de Dolce
      // Pasta): con Nuss elegido aparece en la ficha de Empresa; con Dolce, no.
      mov('m-7', 'emp-beto', 'c-beto', 'egreso_gasto', 4200, 'Repuesto de la máquina de Nuss', 'efectivo', 'u-n'),
    ],
    caja_solicitudes_movimiento: [],
  },
  rpc: {
    mis_pendientes: [],
  },
};
