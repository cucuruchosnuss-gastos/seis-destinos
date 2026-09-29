// Datos de la maqueta: el tablero de alguien con SOLO Gastos y Caja (pantalla
// 2a del handoff "Esqueleto"): Lucía ve dos tarjetas, sin franja urgente, y
// Caja sin pendientes dice "Nada pendiente". Mismo reloj que tablero.js.
// Tiene una tarea con alcance en todas las fábricas (stock:ver, sin el módulo)
// para que la barra de arriba muestre las fábricas, como en el diseño.
'use strict';
const { UID, tarea, UNIDADES_4 } = require('./comun');

const YO = 'emp-lucia';
const hoy = '2026-09-28';
const gasto = (id, fecha, importe, categoria_id, proveedor_id) => ({
  id, fecha, importe, moneda: 'ARS', categoria_id, proveedor_id, unidad_negocio_id: 'u-n', estado: 'registrado',
});

module.exports = {
  uid: UID,
  email: 'lucia.ferreyra@gmail.com',
  meta: { nombre_completo: 'Lucía Ferreyra' },
  ahora: '2026-09-28T13:30:00.000Z',
  tablas: {
    empleados: [{ id: YO, auth_user_id: UID, nombre: 'Lucía Ferreyra', rol_app: 'usuario', activo: true, unidad_negocio_id: 'u-n', es_prueba: false, es_dispositivo: false }],
    empleado_modulos: [
      { empleado_id: YO, modulo: 'gastos', habilitado: true },
      { empleado_id: YO, modulo: 'caja', habilitado: true },
    ],
    empleado_tareas: [
      tarea(YO, 'gastos', 'ver_exportar'),
      tarea(YO, 'stock', 'ver', { todas: true }),
    ],
    unidades_negocio: UNIDADES_4,
    v_empleados_publico: [
      { id: YO, nombre: 'Lucía Ferreyra', unidad_negocio_id: 'u-n', tipo: 'naaloo', activo: true, rol_app: 'usuario', caja_raiz: false, oculto_como_contraparte: false, tiene_acceso: true },
    ],
    categorias: [{ id: 'cat-mp', nombre: 'Materia prima' }, { id: 'cat-ma', nombre: 'Mantenimiento' }, { id: 'cat-li', nombre: 'Limpieza' },
      ...[1, 2, 3, 4, 5].map(i => ({ id: `cat-o${i}`, nombre: `Otra ${i}` }))],
    // Septiembre $ 1.310.000; hoy $ 42.800; últimos 7 días $ 268.400; 2 sin proveedor.
    gastos: [
      gasto('g1', hoy, 42800, 'cat-mp', 'prov-1'),
      gasto('g2', '2026-09-24', 225600, 'cat-mp', 'prov-1'),
      gasto('g3', '2026-09-10', 341600, 'cat-mp', 'prov-1'),
      gasto('g4', '2026-09-11', 214000, 'cat-ma', null),
      gasto('g5', '2026-09-12', 98500, 'cat-li', 'prov-2'),
      // El resto (387.500) en cinco categorías chicas: no entran en las 3 que más pesan.
      ...[1, 2, 3, 4, 5].map(i => gasto(`g-o${i}`, '2026-09-13', 77500, `cat-o${i}`, i === 1 ? null : 'prov-2')),
    ],
    v_caja_saldos: [{ empleado_id: YO, moneda: 'ARS', saldo: 86400 }, { empleado_id: YO, moneda: 'USD', saldo: 0 }],
    caja_movimientos: [
      { empleado_id: YO, fecha: hoy, tipo: 'ingreso', monto: 150000, moneda: 'ARS' },
      { empleado_id: YO, fecha: hoy, tipo: 'egreso_gasto', monto: 63600, moneda: 'ARS' },
    ],
  },
  rpc: {
    mis_pendientes: [{ modulo: 'caja', clave: 'solicitudes_mi_caja', cantidad: 0, texto: 'Movimientos por aceptar en mi caja' }],
  },
};
