// Datos de la maqueta: Cuentas Corrientes (ver pruebas/datos-maqueta/README.md).
// Se generan a e2e/maqueta/datos/cuentas-corrientes.json con `npm run maqueta:datos`.
//
// Para MIRAR la barra de unidad de arriba (28/09/2026): dos unidades reales
// (Nuss y Dolce Pasta; la de pruebas no aparece), proveedores con saldo en
// una, en la otra y SIN unidad, facturas sin proveedor, el historial y la
// ficha de "Harinera Uno", que tiene movimientos en las dos.
//
//   http://localhost:4180/modulos/cuentas-corrientes.html?maqueta=cuentas-corrientes
'use strict';

const { UID, UNIDADES } = require('./comun');

const N = 'u-n', D = 'u-d';

module.exports = {
  uid: UID,
  tablas: {
    // Un usuario común con su unidad propia (Nuss) y una tarea con alcance en
    // Dolce Pasta: la barra le da las DOS (propia + alcance).
    empleados: [
      { id: 'emp-1', auth_user_id: UID, nombre: 'Facu Maqueta', rol_app: 'usuario', activo: true,
        unidad_negocio_id: N, es_prueba: false, es_dispositivo: false },
    ],
    empleado_modulos: [
      { empleado_id: 'emp-1', modulo: 'cuentas-corrientes', habilitado: true },
    ],
    empleado_tareas: [
      { empleado_id: 'emp-1', modulo: 'cuentas_corrientes', tarea: 'ver_todo', alcance: null, habilitado: true },
      { empleado_id: 'emp-1', modulo: 'cuentas_corrientes', tarea: 'registrar_pago', alcance: null, habilitado: true },
      { empleado_id: 'emp-1', modulo: 'cuentas_corrientes', tarea: 'aplicar_credito', alcance: null, habilitado: true },
      { empleado_id: 'emp-1', modulo: 'cuentas_corrientes', tarea: 'alta_proveedor', alcance: null, habilitado: true },
      { empleado_id: 'emp-1', modulo: 'cuentas_corrientes', tarea: 'aprobar_rechazar_proveedor', alcance: null, habilitado: true },
      { empleado_id: 'emp-1', modulo: 'materia_prima', tarea: 'ver_todo', alcance: { unidades: [D] }, habilitado: true },
    ],
    unidades_negocio: UNIDADES,
    v_empleados_publico: [],
    proveedores: [
      { id: 'p1', razon_social: 'Harinera Uno SA', nombre_fantasia: null, cuit: '30111111118', direccion: 'Ruta 9 km 700', activo: true, estado_alta: 'activo' },
      { id: 'p2', razon_social: 'Cartonera del Sur SRL', nombre_fantasia: 'La Cartonera', cuit: '30222222229', direccion: null, activo: true, estado_alta: 'activo' },
      { id: 'p3', razon_social: 'Proveedor sin unidad todavía, con un nombre largo para ver el celular', nombre_fantasia: null, cuit: null, direccion: null, activo: true, estado_alta: 'activo' },
      { id: 'p4', razon_social: 'Pendiente de aprobar SA', nombre_fantasia: null, cuit: '30444444440', direccion: null, activo: false, estado_alta: 'pendiente_aceptacion' },
    ],
    v_saldo_proveedor: [
      { proveedor_id: 'p1', unidad_negocio_id: N, moneda: 'ARS', deuda_pendiente: 1250000.5, credito_disponible: 0 },
      { proveedor_id: 'p1', unidad_negocio_id: D, moneda: 'ARS', deuda_pendiente: 480000, credito_disponible: 0 },
      { proveedor_id: 'p2', unidad_negocio_id: D, moneda: 'ARS', deuda_pendiente: 0, credito_disponible: 35000 },
      { proveedor_id: 'p3', unidad_negocio_id: null, moneda: 'ARS', deuda_pendiente: 12000, credito_disponible: 0 },
    ],
    facturas_pendientes: [
      { id: 'f-n1', proveedor_id: 'p1', unidad_negocio_id: N, estado: 'pendiente', moneda: 'ARS', importe: 1250000.5, saldo_pendiente: 1250000.5, numero_comprobante: '0001-00012345', fecha_factura: '2026-10-02' },
      { id: 'f-d1', proveedor_id: 'p1', unidad_negocio_id: D, estado: 'parcial', moneda: 'ARS', importe: 600000, saldo_pendiente: 480000, numero_comprobante: '0002-00000077', fecha_factura: '2026-10-01' },
      { id: 'fsp-n', proveedor_id: null, unidad_negocio_id: N, estado: 'pendiente', razon_social: 'FERRETERIA KM 711', importe: 8500, moneda: 'ARS', fecha_factura: '2026-10-03' },
      { id: 'fsp-d', proveedor_id: null, unidad_negocio_id: D, estado: 'pendiente', razon_social: 'LIMPIEZA ROSARIO', importe: 4300, moneda: 'ARS', fecha_factura: '2026-10-02' },
    ],
    v_cuenta_corriente_movimientos: [
      { proveedor_id: 'p1', unidad_negocio_id: N, moneda: 'ARS', fecha: '2026-10-02', tipo: 'factura', monto: 1250000.5, factura_pendiente_id: 'f-n1', gasto_id: null, credito_id: null, referencia: '0001-00012345', saldo_acumulado: 1250000.5, orden_desempate: 1 },
      { proveedor_id: 'p1', unidad_negocio_id: D, moneda: 'ARS', fecha: '2026-10-01', tipo: 'factura', monto: 600000, factura_pendiente_id: 'f-d1', gasto_id: null, credito_id: null, referencia: '0002-00000077', saldo_acumulado: 600000, orden_desempate: 1 },
      { proveedor_id: 'p1', unidad_negocio_id: D, moneda: 'ARS', fecha: '2026-10-03', tipo: 'pago', monto: -120000, factura_pendiente_id: null, gasto_id: 'g-1', credito_id: null, referencia: 'Transferencia', saldo_acumulado: 480000, orden_desempate: 2 },
      { proveedor_id: 'p2', unidad_negocio_id: D, moneda: 'ARS', fecha: '2026-10-02', tipo: 'pago', monto: -35000, factura_pendiente_id: null, gasto_id: 'g-2', credito_id: null, referencia: 'Efectivo', saldo_acumulado: -35000, orden_desempate: 1 },
    ],
    creditos_proveedor: [
      { id: 'cr-d', proveedor_id: 'p2', unidad_negocio_id: D, moneda: 'ARS', monto_original: 35000, monto_disponible: 35000, estado: 'disponible' },
    ],
  },
  rpc: {
    mis_pendientes: [],
    remitos_sin_facturar: [],
  },
};
