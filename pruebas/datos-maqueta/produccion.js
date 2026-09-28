// Datos de la maqueta y de las pruebas: produccion (la PLANTA, la tablet de la
// fábrica, con sus dos modos). Ver pruebas/datos-maqueta/README.md.
// Se generan a e2e/maqueta/datos/produccion.json con `npm run maqueta:datos`.
//
// LAS FECHAS VAN EN 2099 A PROPÓSITO: la tablet compara la fecha de cada
// turno con "hoy" (una abierta de otro día se trata distinto), y estos datos
// son un .json fijo. Con una fecha que nunca es pasada, la maqueta dibuja
// siempre la misma pantalla, el día que se corra. Las horas "hace …" no se
// dibujan (serían negativas): no se inventa ninguna.
'use strict';
const { UID, tarea, UNIDADES } = require('./comun');

const DIA = '2099-12-31';
const hora = (hhmm) => `${DIA}T${hhmm}:00Z`;

// Máquinas en orden fijo: 1 andando, 2 parada, 3 sin turno, 4 andando, 5 sin turno.
const MAQUINAS = [1, 2, 3, 4, 5].map(n => ({ id: `maq-${n}`, unidad_negocio_id: 'u-n', nombre: `Máquina ${n}`, activa: true, orden: n }));
const turno = (id, lote, maquina, encargado) => ({
  id, lote, maquina_id: maquina, unidad_negocio_id: 'u-n', fecha: DIA, turno: 'Mañana', encargado_id: encargado,
  estado: 'abierto', abierto_en: hora('09:02'), forzado_por: null, forzado_en: null, forzado_motivo: null,
});
const masa = (id, turnoId, nro, hhmm, extra = {}) => ({
  id, turno_id: turnoId, nro, hora: hora(hhmm), tipo_masa: 'Común', doble: false, origen: 'original',
  es_chocolate: false, anulada: false, anulada_motivo: null, masero_id: 'emp-agus', motivo: null, receta_id: 'rec-1', ...extra,
});

const ORIGINAL = {
  receta_id: 'rec-1', version: 7, items: [
    { ingrediente_id: 'i-agua', ingrediente: 'Agua', orden: 1, descuenta_stock: false, cantidad_kg: 10, insumo_preferido_id: null },
    { ingrediente_id: 'i-harina', ingrediente: 'Harina', orden: 2, descuenta_stock: true, cantidad_kg: 25, insumo_preferido_id: 'ins-h1' },
    { ingrediente_id: 'i-azucar', ingrediente: 'Azúcar', orden: 3, descuenta_stock: true, cantidad_kg: 2.5, insumo_preferido_id: 'ins-az' },
    { ingrediente_id: 'i-grasa', ingrediente: 'Grasa', orden: 4, descuenta_stock: true, cantidad_kg: 1.2, insumo_preferido_id: null },
    { ingrediente_id: 'i-lecitina', ingrediente: 'Lecitina', orden: 5, descuenta_stock: true, cantidad_kg: 0.15, insumo_preferido_id: 'ins-lec' },
    { ingrediente_id: 'i-sal', ingrediente: 'Sal', orden: 6, descuenta_stock: true, cantidad_kg: 0.1, insumo_preferido_id: 'ins-sal' },
    { ingrediente_id: 'i-cacao', ingrediente: 'Cacao', orden: 7, descuenta_stock: true, cantidad_kg: 0, insumo_preferido_id: 'ins-cac' },
  ],
};
const ANTERIOR = {
  masa_id: 'ma-3', lote: 7033, nro: 3, hora: hora('10:40'), doble: false, fecha_turno: DIA, es_de_hoy: true, es_chocolate: false,
  items: [
    { ingrediente_id: 'i-agua', insumo_id: null, lote: null, cantidad_simple_kg: 10 },
    { ingrediente_id: 'i-harina', insumo_id: 'ins-h1', lote: '24518', cantidad_simple_kg: 25 },
    { ingrediente_id: 'i-azucar', insumo_id: 'ins-az', lote: '3391', cantidad_simple_kg: 2.7 },
    { ingrediente_id: 'i-grasa', insumo_id: null, lote: null, cantidad_simple_kg: 1.2 },
    { ingrediente_id: 'i-lecitina', insumo_id: 'ins-lec', lote: '3310', cantidad_simple_kg: 0.15 },
    { ingrediente_id: 'i-sal', insumo_id: 'ins-sal', lote: 'S-2', cantidad_simple_kg: 0.1 },
    { ingrediente_id: 'i-cacao', insumo_id: null, lote: null, cantidad_simple_kg: 0 },
  ],
};
const INSUMOS = [
  { ingrediente_id: 'i-harina', insumo_id: 'ins-h1', nombre: 'Harina 000', marca: 'Júpiter', tipo: 'materia_prima', lotes: [{ lote: '24518', stock: 18 }, { lote: 'L-101', stock: 250 }] },
  { ingrediente_id: 'i-harina', insumo_id: 'ins-h2', nombre: 'Harina 000', marca: 'Pureza', tipo: 'materia_prima', lotes: [{ lote: 'P-7', stock: 120 }] },
  { ingrediente_id: 'i-azucar', insumo_id: 'ins-az', nombre: 'Azúcar', marca: 'Ledesma', tipo: 'materia_prima', lotes: [{ lote: '3391', stock: 44 }] },
  { ingrediente_id: 'i-lecitina', insumo_id: 'ins-lec', nombre: 'Lecitina', marca: 'Solae', tipo: 'materia_prima', lotes: [{ lote: '3310', stock: 3 }] },
  { ingrediente_id: 'i-sal', insumo_id: 'ins-sal', nombre: 'Sal fina', marca: 'Celusal', tipo: 'materia_prima', lotes: [{ lote: 'S-2', stock: 30 }] },
  { ingrediente_id: 'i-cacao', insumo_id: 'ins-cac', nombre: 'Cacao', marca: 'Fénix', tipo: 'materia_prima', lotes: [{ lote: '3012', stock: 22 }] },
];
const STOCK = INSUMOS.map(i => ({
  insumo_id: i.insumo_id, nombre: i.nombre, marca: i.marca, categoria: 'Harinas', unidad_medida: 'kg',
  lotes: i.lotes.map((l, k) => ({ lote: l.lote, queda: l.stock, desde: `2099-12-0${k + 1}` })),
}));

module.exports = {
  uid: UID,
  tablas: {
    // La cuenta de la TABLET (es_dispositivo), con produccion:cargar y stock:ver en su fábrica.
    empleados: [{ id: 'tab-1', auth_user_id: UID, nombre: 'Tablet Producción · Cucuruchos Nuss', rol_app: 'usuario', activo: true,
      unidad_negocio_id: 'u-n', es_prueba: false, es_dispositivo: true }],
    empleado_modulos: [
      { empleado_id: 'tab-1', modulo: 'produccion', habilitado: true },
      { empleado_id: 'tab-1', modulo: 'stock', habilitado: true },
    ],
    empleado_tareas: [
      tarea('tab-1', 'produccion', 'cargar', { unidades: ['u-n'] }),
      tarea('tab-1', 'stock', 'ver', { unidades: ['u-n'] }),
    ],
    unidades_negocio: UNIDADES,
    v_empleados_publico: [
      { id: 'emp-fede', nombre: 'Federico Silva', unidad_negocio_id: 'u-n', tipo: 'naaloo', activo: true },
      { id: 'emp-agus', nombre: 'Agustín Barrera', unidad_negocio_id: 'u-n', tipo: 'naaloo', activo: true },
    ],
    maquinas: MAQUINAS,
    turnos_produccion: [turno('t1', 7033, 'maq-1', 'emp-fede'), turno('t2', 7034, 'maq-2', 'emp-fede'), turno('t4', 7035, 'maq-4', 'emp-fede')],
    turno_operarios: [
      { turno_id: 't1', empleado_id: 'emp-ramon', desde: hora('09:02'), hasta: null },
      { turno_id: 't2', empleado_id: 'emp-lucia', desde: hora('09:02'), hasta: null },
    ],
    masas: [
      masa('ma-1', 't1', 1, '09:30'),
      masa('ma-2', 't1', 2, '10:05', { doble: true, origen: 'modificada', es_chocolate: true, motivo: 'Pidieron de chocolate' }),
      masa('ma-3', 't1', 3, '10:40', { origen: 'anterior', es_chocolate: true }),
      masa('ma-4', 't4', 1, '09:50'),
    ],
    masa_items: [
      { masa_id: 'ma-2', ingrediente_id: 'i-agua', insumo_id: null, lote: null, cantidad_simple_kg: 10, ingrediente_libre: null, ingredientes: { nombre: 'Agua', orden: 1 }, insumos: null },
      { masa_id: 'ma-2', ingrediente_id: 'i-harina', insumo_id: 'ins-h1', lote: '24518', cantidad_simple_kg: 25, ingrediente_libre: null, ingredientes: { nombre: 'Harina', orden: 2 }, insumos: { nombre: 'Harina 000', marca: 'Júpiter' } },
      { masa_id: 'ma-2', ingrediente_id: 'i-azucar', insumo_id: 'ins-az', lote: '3391', cantidad_simple_kg: 2.7, ingrediente_libre: null, ingredientes: { nombre: 'Azúcar', orden: 3 }, insumos: { nombre: 'Azúcar', marca: 'Ledesma' } },
      { masa_id: 'ma-2', ingrediente_id: 'i-cacao', insumo_id: 'ins-cac', lote: '3012', cantidad_simple_kg: 0.65, ingrediente_libre: null, ingredientes: { nombre: 'Cacao', orden: 7 }, insumos: { nombre: 'Cacao', marca: 'Fénix' } },
      { masa_id: 'ma-3', ingrediente_id: 'i-harina', insumo_id: 'ins-h1', lote: '24518', cantidad_simple_kg: 25, ingrediente_libre: null, ingredientes: { nombre: 'Harina', orden: 2 }, insumos: { nombre: 'Harina 000', marca: 'Júpiter' } },
      { masa_id: 'ma-3', ingrediente_id: 'i-cacao', insumo_id: 'ins-cac', lote: '3012', cantidad_simple_kg: 0.65, ingrediente_libre: null, ingredientes: { nombre: 'Cacao', orden: 7 }, insumos: { nombre: 'Cacao', marca: 'Fénix' } },
    ],
    receta_items: ORIGINAL.items.map(it => ({ receta_id: 'rec-1', ingrediente_id: it.ingrediente_id, cantidad_kg: it.cantidad_kg, insumo_preferido_id: it.insumo_preferido_id })),
    recetas: [{ id: 'rec-1', maquina_id: 'maq-1', tipo_masa: 'Común', version: 7 }, { id: 'rec-4', maquina_id: 'maq-4', tipo_masa: 'Común', version: 3 }],
    ingredientes: ORIGINAL.items.map(it => ({ id: it.ingrediente_id, nombre: it.ingrediente, define_chocolate: it.ingrediente_id === 'i-cacao' })),
    paradas_produccion: [{ id: 'pa-1', turno_id: 't2', inicio: hora('10:32'), fin: null, motivo: 'Se rompió la cadena' }],
    produccion_items: [
      { id: 'pi-1', turno_id: 't1', orden: 1, sublote: '7033-1', presentacion_id: 'pp-1', marca_id: null, cajas: 12, unidades_por_caja: 320, unidades: 3840, anulado: false, caja_insumo_id: null, embolsado: 'grande' },
      { id: 'pi-2', turno_id: 't1', orden: 2, sublote: '7033-2', presentacion_id: 'pp-1', marca_id: null, cajas: 30, unidades_por_caja: 320, unidades: 9600, anulado: false, caja_insumo_id: null, embolsado: 'grande' },
    ],
    productos_terminados: [
      { id: 'p1', unidad_negocio_id: 'u-n', nombre: 'Mini', tipo_masa: 'Común', activo: true, orden: 1 },
      { id: 'p2', unidad_negocio_id: 'u-n', nombre: 'Mini', tipo_masa: 'Chocolate', activo: true, orden: 2 },
    ],
    producto_presentaciones: [
      { id: 'pp-1', producto_id: 'p1', nombre: 'Caja con cono', con_cono: true, media_caja: false, empaque: 'caja', unidades_por_caja: 320, activa: true, orden: 1 },
      { id: 'pp-2', producto_id: 'p2', nombre: 'Caja con cono', con_cono: true, media_caja: false, empaque: 'caja', unidades_por_caja: 320, activa: true, orden: 1 },
    ],
    marcas_personalizadas: [{ id: 'mc-1', nombre: 'CASERATO', activa: true, estado_alta: 'aprobada', doble_bolsa: false }],
    presentacion_cajas: [],
    presentacion_empaque: [],
    insumos: [],
    v_stock_insumos: [],
  },
  rpc: {
    mi_sesion_produccion: { empleado_id: 'tab-1', nombre: 'Tablet Producción · Cucuruchos Nuss', es_dispositivo: true, unidad_negocio_id: 'u-n' },
    personal_produccion: [
      { id: 'emp-fede', nombre: 'Federico Silva', misma_unidad: true, puestos: ['encargado', 'operario'], tiene_pin: true, pin_temporal: false, debe_cambiar_pin: false, es_maestro: false },
      { id: 'emp-agus', nombre: 'Agustín Barrera', misma_unidad: true, puestos: ['masero'], tiene_pin: true, pin_temporal: false, debe_cambiar_pin: false, es_maestro: false },
      { id: 'emp-ramon', nombre: 'Ramón Díaz', misma_unidad: true, puestos: ['operario'], tiene_pin: true, pin_temporal: false, debe_cambiar_pin: false, es_maestro: false },
      { id: 'emp-lucia', nombre: 'Lucía Paz', misma_unidad: true, puestos: ['operario'], tiene_pin: false, pin_temporal: false, debe_cambiar_pin: false, es_maestro: false },
    ],
    verificar_pin_produccion: { ok: true, debe_cambiar: false },
    datos_para_masa: { turno: { id: 't1', lote: 7033 }, original: ORIGINAL, anterior: ANTERIOR, insumos: INSUMOS },
    stock_para_masa: STOCK,
    mis_pendientes: [],
  },
};
