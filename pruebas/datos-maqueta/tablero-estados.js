// Datos de la maqueta: los ESTADOS de las tarjetas (pantalla 3a del handoff
// "Esqueleto"), con Dolce Pasta elegida arriba: Cobranzas sin datos ("Hoy no
// hubo cobranzas"), Caja con error y Reintentar, Cheques cargando (la tabla no
// responde nunca) y el resto funcionando. Cada tarjeta carga y falla sola.
'use strict';
const { UID, tarea, UNIDADES_4 } = require('./comun');

const YO = 'emp-facundo';
const hoy = '2026-09-28';
const gasto = (id, fecha, importe, categoria_id) => ({
  id, fecha, importe, moneda: 'ARS', categoria_id, proveedor_id: 'prov-1', unidad_negocio_id: 'u-d', estado: 'registrado',
});
const pedido = (i, fecha_entrega) => ({ id: `pe-${i}`, numero: 2000 + i, fecha: '2026-09-20', fecha_entrega, cliente: `Cliente ${i}`,
  estado: 'pendiente', cajas_pedidas: 5, cajas_cumplidas: 0, renglones: 1, sin_interpretar: 0, observaciones: null });
const pedidos = [
  ...[1, 2, 3, 4].map(i => pedido(i, hoy)),
  ...[5, 6, 7, 8, 9, 10].map(i => pedido(i, '2026-10-01')),
  pedido(11, '2026-09-23'), pedido(12, '2026-09-25'),
  pedido(13, '2026-10-15'), pedido(14, null),
];

module.exports = {
  uid: UID,
  email: 'facundousabarrena@gmail.com',
  meta: { nombre_completo: 'Facundo Usabarrena' },
  ahora: '2026-09-28T13:30:00.000Z',
  tablas: {
    empleados: [{ id: YO, auth_user_id: UID, nombre: 'Usabarrena Facundo', rol_app: 'usuario', activo: true, unidad_negocio_id: 'u-d', es_prueba: false, es_dispositivo: false }],
    empleado_modulos: ['gastos', 'caja', 'cobranzas', 'pedidos', 'stock', 'empleados'].map(modulo => ({ empleado_id: YO, modulo, habilitado: true })),
    empleado_tareas: [
      tarea(YO, 'gastos', 'ver_exportar'),
      tarea(YO, 'cobranzas', 'ver_todo'),
      tarea(YO, 'pedidos', 'ver', { todas: true }),
      tarea(YO, 'stock', 'ver', { todas: true }),
      tarea(YO, 'empleados', 'ver_editar', { todas: true }),
    ],
    unidades_negocio: UNIDADES_4,
    v_empleados_publico: [
      { id: YO, nombre: 'Usabarrena Facundo', unidad_negocio_id: 'u-d', tipo: 'naaloo', activo: true, rol_app: 'usuario', caja_raiz: false, oculto_como_contraparte: false, tiene_acceso: true },
      ...Array.from({ length: 30 }, (_, i) => ({ id: `emp-${i}`, nombre: `Persona ${i}`, unidad_negocio_id: 'u-d', tipo: 'naaloo', activo: true,
        rol_app: 'usuario', caja_raiz: false, oculto_como_contraparte: false, tiene_acceso: i < 8 })),
    ],
    categorias: [{ id: 'cat-mp', nombre: 'Materia prima' }, { id: 'cat-en', nombre: 'Envases' }, { id: 'cat-fl', nombre: 'Fletes' },
      ...[1, 2, 3, 4].map(i => ({ id: `cat-o${i}`, nombre: `Otra ${i}` }))],
    // Septiembre $ 1.064.000; hoy $ 51.200; últimos 7 días $ 233.000.
    gastos: [
      gasto('g1', hoy, 51200, 'cat-mp'),
      gasto('g2', '2026-09-23', 181800, 'cat-mp'),
      gasto('g3', '2026-09-10', 287000, 'cat-mp'),
      gasto('g4', '2026-09-11', 176000, 'cat-en'),
      gasto('g5', '2026-09-12', 91000, 'cat-fl'),
      // El resto (277.000) en cuatro categorías chicas.
      ...[1, 2, 3, 4].map(i => gasto(`g-o${i}`, '2026-09-14', 69250, `cat-o${i}`)),
    ],
    // La caja falla: la tarjeta dice "No se pudo cargar" y las demás siguen.
    v_caja_saldos: 'ERROR:no se pudo leer la caja',
    // Los cheques no responden nunca: la tarjeta queda en "Cargando…".
    cobranza_cheques: 'ESPERAR',
    v_cobranzas: [{ id: 'co1', cargada_por_nombre: 'Juan Pérez', total: 3120000, estado: 'procesada', unidad_negocio_id: 'u-d', fecha: '2026-09-24' }],
  },
  rpc: {
    mis_pendientes: [{ modulo: 'stock', clave: 'transferencias_por_aceptar', cantidad: 1, texto: 'Transferencias por aceptar' }],
    resumen_cobranzas: { __segun: [
      { si: { p_desde: hoy, p_hasta: hoy }, r: [{ por_controlar: 0, cantidad: 0, total: 0 }] },
      { si: { p_desde: '2026-09-22', p_hasta: hoy }, r: [{ por_controlar: 0, cantidad: 1, total: 3120000 }] },
    ], __defecto: [{ por_controlar: 0, cantidad: 0, total: 0 }] },
    pedidos_de: { __segun: [{ si: { p_unidad_negocio_id: 'u-d' }, r: pedidos }], __defecto: [] },
  },
};
