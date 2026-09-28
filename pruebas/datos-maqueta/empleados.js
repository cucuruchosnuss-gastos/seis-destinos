// Datos de la maqueta y de las pruebas: Empleados (ver pruebas/datos-maqueta/README.md).
// Se generan a e2e/maqueta/datos/empleados.json con `npm run maqueta:datos`.
// Quien mira tiene empleados:ver_editar en todas las unidades. Hay dos
// personas activas (una con cuenta), dos DADAS DE BAJA (una desde la app, con
// motivo y quién, y otra que vino del Excel de Naaloo), una tablet y la
// Cuenta de Empresa, que no se muestra nunca.
'use strict';

const { UID, tarea } = require('./comun');

const UNIDADES = [
  { id: 'u-n', nombre: 'Cucuruchos Nuss', prefijo: 'N', logo_url: 'logo-cucuruchos-nuss.png', activo: true, es_prueba: false },
  { id: 'u-d', nombre: 'Dolce Pasta', prefijo: 'D', logo_url: 'logo-dolce-pasta.png', activo: true, es_prueba: false },
];

const fila = (x) => ({
  cuil: null, activo: true, baja_en_app: false, baja_motivo: null, baja_por: null, baja_en: null,
  auth_user_id: null, rol_app: 'usuario', tipo: 'naaloo', origen: 'naaloo', unidad_negocio_id: 'u-n',
  rol: null, email: null, domicilio: null, legajo: null, fecha_alta: null, fecha_nacimiento: null,
  telefono: null, contacto_emergencia_nombre: null, contacto_emergencia_telefono: null,
  es_dispositivo: false, es_prueba: false, ...x,
});

const EMPLEADOS = [
  fila({ id: 'emp-1', nombre: 'Usabarrena Facundo', auth_user_id: UID, rol_app: 'usuario', tipo: 'admin', origen: 'app_registro', cuil: '20301234567' }),
  fila({ id: 'emp-2', nombre: 'Romero Emanuel', auth_user_id: 'auth-2', cuil: '20311111112', rol: 'Convenio · Operario', legajo: '41', fecha_alta: '2021-03-01', telefono: '351 555 1234' }),
  fila({ id: 'emp-3', nombre: 'Silva Mauricio', cuil: '20322222223', unidad_negocio_id: 'u-d', rol: 'Convenio · Operario' }),
  // Dado de baja desde la app, con cuenta (no puede entrar) y un motivo largo.
  fila({ id: 'emp-4', nombre: 'Pérez Juan Carlos', auth_user_id: 'auth-4', cuil: '20333333334', activo: false, baja_en_app: true,
    baja_motivo: 'Renunció el 15/09 · última liquidación pagada, devolvió la llave del depósito y el celular de la empresa',
    baja_por: 'emp-1', baja_en: '2026-09-20T14:30:00Z' }),
  // Dado de baja en el Excel de Naaloo (sin motivo ni quién).
  fila({ id: 'emp-5', nombre: 'Gómez Ana', cuil: '27344444445', unidad_negocio_id: 'u-d', activo: false }),
  fila({ id: 'tab-1', nombre: 'Tablet Producción · Cucuruchos Nuss', auth_user_id: 'auth-t1', tipo: 'sistema', origen: 'app_registro', es_dispositivo: true }),
  fila({ id: 'empresa', nombre: 'Empresa', tipo: 'empresa', origen: 'app_registro', activo: false, unidad_negocio_id: null }),
];

module.exports = {
  uid: UID,
  tablas: {
    empleados: EMPLEADOS,
    empleado_modulos: [
      { empleado_id: 'emp-1', modulo: 'empleados', habilitado: true },
      { empleado_id: 'emp-2', modulo: 'gastos', habilitado: true },
    ],
    empleado_tareas: [
      { ...tarea('emp-1', 'empleados', 'ver_editar', { todas: true }) },
    ],
    unidades_negocio: UNIDADES,
    v_empleados_publico: EMPLEADOS.map(e => ({ id: e.id, nombre: e.nombre, unidad_negocio_id: e.unidad_negocio_id, tipo: e.tipo, activo: e.activo })),
  },
  rpc: {
    estado_pin_produccion: { tiene_pin: false, debe_cambiar: false, puede_asignar: false },
    dar_de_baja_empleado: { tenia_cuenta: true },
    reactivar_empleado: null,
    mis_pendientes: [],
  },
};
