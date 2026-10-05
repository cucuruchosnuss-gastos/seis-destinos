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
const { UID, tarea, UNIDADES, MOTIVOS_PARADA } = require('./comun');

const DIA = '2099-12-31';
const hora = (hhmm) => `${DIA}T${hhmm}:00Z`;

// Máquinas en orden fijo: 1 andando, 2 parada, 3 sin turno, 4 andando, 5 sin turno.
const MAQUINAS = [1, 2, 3, 4, 5].map(n => ({ id: `maq-${n}`, unidad_negocio_id: 'u-n', nombre: `Máquina ${n}`, activa: true, orden: n }));
const turno = (id, lote, maquina, encargado) => ({
  id, lote, maquina_id: maquina, unidad_negocio_id: 'u-n', fecha: DIA, turno: 'Mañana', encargado_id: encargado,
  estado: 'abierto', abierto_en: hora('09:02'), forzado_por: null, forzado_en: null, forzado_motivo: null,
  hora_inicio: '06:00:00', hora_fin: null, hora_largada: null,
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
    { ingrediente_id: 'i-bicarbonato', ingrediente: 'Bicarbonato', orden: 7, descuenta_stock: true, cantidad_kg: 0.08, insumo_preferido_id: 'ins-bic' },
    { ingrediente_id: 'i-colorante', ingrediente: 'Colorante caramelo', orden: 8, descuenta_stock: true, cantidad_kg: 0.05, insumo_preferido_id: 'ins-col' },
    { ingrediente_id: 'i-esencia', ingrediente: 'Esencia de vainilla', orden: 9, descuenta_stock: true, cantidad_kg: 0.03, insumo_preferido_id: 'ins-esv' },
    { ingrediente_id: 'i-cacao', ingrediente: 'Cacao', orden: 10, descuenta_stock: true, cantidad_kg: 0, insumo_preferido_id: 'ins-cac' },
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
    { ingrediente_id: 'i-bicarbonato', insumo_id: 'ins-bic', lote: 'B-44', cantidad_simple_kg: 0.08 },
    { ingrediente_id: 'i-colorante', insumo_id: 'ins-col', lote: 'C-2231', cantidad_simple_kg: 0.05 },
    { ingrediente_id: 'i-esencia', insumo_id: 'ins-esv', lote: 'EV-09', cantidad_simple_kg: 0.03 },
    { ingrediente_id: 'i-cacao', insumo_id: null, lote: null, cantidad_simple_kg: 0 },
  ],
};
const INSUMOS = [
  { ingrediente_id: 'i-harina', insumo_id: 'ins-h1', nombre: 'Harina 000', marca: 'Júpiter', tipo: 'materia_prima', lotes: [{ lote: '24518', stock: 18 }, { lote: 'L-101', stock: 250 }] },
  { ingrediente_id: 'i-harina', insumo_id: 'ins-h2', nombre: 'Harina 000', marca: 'Pureza', tipo: 'materia_prima', lotes: [{ lote: 'P-7', stock: 120 }, { lote: 'P-9', stock: 875 }] },
  { ingrediente_id: 'i-harina', insumo_id: 'ins-h3', nombre: 'Harina 000', marca: 'La Clásica', tipo: 'materia_prima', lotes: [{ lote: '08/09/26', stock: 2425 }, { lote: '15/09/26', stock: 900 }, { lote: '22/09/26', stock: 1500 }] },
  { ingrediente_id: 'i-azucar', insumo_id: 'ins-az', nombre: 'Azúcar', marca: 'Ledesma', tipo: 'materia_prima', lotes: [{ lote: '3391', stock: 44 }] },
  { ingrediente_id: 'i-lecitina', insumo_id: 'ins-lec', nombre: 'Lecitina', marca: 'Solae', tipo: 'materia_prima', lotes: [{ lote: '3310', stock: 3 }] },
  { ingrediente_id: 'i-sal', insumo_id: 'ins-sal', nombre: 'Sal fina', marca: 'Celusal', tipo: 'materia_prima', lotes: [{ lote: 'S-2', stock: 30 }] },
  { ingrediente_id: 'i-bicarbonato', insumo_id: 'ins-bic', nombre: 'Bicarbonato de sodio', marca: 'Dalgas', tipo: 'materia_prima', lotes: [{ lote: 'B-44', stock: 12 }] },
  { ingrediente_id: 'i-colorante', insumo_id: 'ins-col', nombre: 'Colorante caramelo', marca: 'Saporiti', tipo: 'materia_prima', lotes: [{ lote: 'C-2231', stock: 4.5 }] },
  { ingrediente_id: 'i-esencia', insumo_id: 'ins-esv', nombre: 'Esencia de vainilla', marca: 'Parafarm', tipo: 'materia_prima', lotes: [{ lote: 'EV-09', stock: 2 }] },
  { ingrediente_id: 'i-cacao', insumo_id: 'ins-cac', nombre: 'Cacao', marca: 'Fénix', tipo: 'materia_prima', lotes: [{ lote: '3012', stock: 22 }] },
];
// Los ocho cucuruchones de Nuss (el orden y el tipo_masa como en la base el
// 28/09/2026: primero los comunes, después los de chocolate).
const TAMANOS = ['Mini', 'Chico', 'Grande', 'Standard']
const POR_CAJA = { Mini: [320, 320], Chico: [256, 240], Grande: [240, 224], Standard: [224, 208] }
const PRODUCTOS = [
  ...TAMANOS.map((t, i) => ({ id: `p${i + 1}`, unidad_negocio_id: 'u-n', nombre: `Cucuruchón ${t}`, tipo_masa: 'Común', activo: true, orden: i + 1 })),
  ...TAMANOS.map((t, i) => ({ id: `p${i + 5}`, unidad_negocio_id: 'u-n', nombre: `Cucuruchón ${t} Chocolate`, tipo_masa: 'Chocolate', activo: true, orden: i + 5 })),
]
const PRESENTACIONES = PRODUCTOS.map((p, i) => {
  const t = TAMANOS[i % 4]
  const [sin, con] = POR_CAJA[t]
  // pp-1 es la "Caja con cono" del Mini común (la usan lo producido y el historial).
  return [
    { id: i === 0 ? 'pp-1' : `pp-${p.id}-con`, producto_id: p.id, nombre: 'Caja con cono', con_cono: true, media_caja: false, empaque: 'caja', unidades_por_caja: con, activa: true, orden: 2 },
    { id: i === 4 ? 'pp-2' : `pp-${p.id}-sin`, producto_id: p.id, nombre: 'Caja sin cono', con_cono: false, media_caja: false, empaque: 'caja', unidades_por_caja: sin, activa: true, orden: 1 },
    ...(t !== 'Standard' ? [{ id: `pp-${p.id}-media`, producto_id: p.id, nombre: 'Media caja', con_cono: false, media_caja: true, empaque: 'caja', unidades_por_caja: sin / 2, activa: true, orden: 3 }] : []),
  ]
}).flat()
// Muchos conos: la lista de conos es la única que scrollea en Lo producido.
const CONOS = ['CASERATO', 'FABRI', 'LA ESQUINA', 'HELADOS DON JUAN', 'GRIDO SUR', 'EL PINGÜINO', 'DULCE FRÍO', 'NIEVE',
  'BARILOCHE', 'LA FLORIDA', 'MUNDO HELADO', 'PASO DEL NORTE', 'SAN CARLOS', 'TENTACIÓN', 'VIA BONA', 'YUKÓN']
  .map((nombre, i) => ({ id: i === 0 ? 'mc-1' : `mc-${i + 1}`, nombre, activa: true, estado_alta: 'aprobada', doble_bolsa: nombre === 'PASO DEL NORTE' }))

const STOCK = INSUMOS.map(i => ({
  insumo_id: i.insumo_id, nombre: i.nombre, marca: i.marca, categoria: 'Harinas', unidad_medida: 'kg',
  // Fechas distintas por lote: el más viejo va arriba en la ventana de lotes.
  lotes: i.lotes.map((l, k) => ({ lote: l.lote, queda: l.stock, desde: `2099-${String(9 + (i.insumo_id.length + k) % 3).padStart(2, '0')}-${String(3 + 7 * k).padStart(2, '0')}` })),
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
      { turno_id: 't1', empleado_id: 'emp-vill', desde: hora('09:02'), hasta: null },
      { turno_id: 't1', empleado_id: 'emp-tiss', desde: hora('09:10'), hasta: hora('11:30') },
      { turno_id: 't2', empleado_id: 'emp-lucia', desde: hora('09:02'), hasta: null },
    ],
    masas: [
      masa('ma-1', 't1', 1, '09:30'),
      masa('ma-2', 't1', 2, '10:05', { doble: true, origen: 'modificada', es_chocolate: true, motivo: 'Pidieron de chocolate' }),
      masa('ma-3', 't1', 3, '10:40', { origen: 'anterior', es_chocolate: true }),
      masa('ma-5', 't1', 4, '11:15'),
      masa('ma-6', 't1', 5, '11:50', { doble: true }),
      masa('ma-7', 't1', 6, '12:25', { origen: 'anterior' }),
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
    motivos_parada: MOTIVOS_PARADA,
    // El horario de la Mañana en la unidad (05/10/2026): da el fin del turno
    // para "¿Por qué paró antes?".
    horarios_turno: [
      { unidad_negocio_id: 'u-n', turno: 'Mañana', hora_inicio: '06:00:00', hora_fin: '15:00:00', activo: true },
      { unidad_negocio_id: 'u-n', turno: 'Tarde', hora_inicio: '15:00:00', hora_fin: '23:36:00', activo: true },
    ],
    paradas_produccion: [
      { id: 'pa-1', turno_id: 't2', inicio: hora('10:32'), fin: null, motivo: 'Corte de cadena: la de abajo', motivo_id: 'mp-cadena', categoria: 'falla', detalle: 'la de abajo' },
      { id: 'pa-2', turno_id: 't1', inicio: hora('10:05'), fin: hora('10:25'), motivo: 'Limpieza de planchas: al arrancar', motivo_id: 'mp-limp', categoria: 'programada', detalle: 'al arrancar' },
    ],
    produccion_items: [
      { id: 'pi-1', turno_id: 't1', orden: 1, sublote: '7033-1', presentacion_id: 'pp-1', marca_id: null, cajas: 12, unidades_por_caja: 320, unidades: 3840, anulado: false, caja_insumo_id: null, embolsado: 'grande' },
      { id: 'pi-2', turno_id: 't1', orden: 2, sublote: '7033-2', presentacion_id: 'pp-1', marca_id: null, cajas: 30, unidades_por_caja: 320, unidades: 9600, anulado: false, caja_insumo_id: null, embolsado: 'grande' },
      { id: 'pi-3', turno_id: 't1', orden: 3, sublote: '7033-3', presentacion_id: 'pp-1', marca_id: 'mc-2', cajas: 25, unidades_por_caja: 320, unidades: 8000, anulado: false, caja_insumo_id: 'caja-1', embolsado: 'grande' },
      { id: 'pi-4', turno_id: 't1', orden: 4, sublote: '7033-4', presentacion_id: 'pp-p3-sin', marca_id: null, cajas: 18, unidades_por_caja: 240, unidades: 4320, anulado: false, caja_insumo_id: 'caja-si', embolsado: 'grande' },
      { id: 'pi-5', turno_id: 't1', orden: 5, sublote: '7033-5', presentacion_id: 'pp-p8-con', marca_id: 'mc-4', cajas: 10, unidades_por_caja: 208, unidades: 2080, anulado: true, caja_insumo_id: 'caja-dp', embolsado: 'individual' },
      { id: 'pi-6', turno_id: 't1', orden: 6, sublote: '7033-6', presentacion_id: 'pp-p2-media', marca_id: null, cajas: 40, unidades_por_caja: 128, unidades: 5120, anulado: false, caja_insumo_id: 'caja-1', embolsado: 'grande' },
    ],
    productos_terminados: PRODUCTOS,
    producto_presentaciones: PRESENTACIONES,
    marcas_personalizadas: CONOS,
    presentacion_cajas: PRESENTACIONES.map(pr => [
      { presentacion_id: pr.id, insumo_id: 'caja-1', embolsado_sugerido: 'grande' },
      { presentacion_id: pr.id, insumo_id: 'caja-dp', embolsado_sugerido: 'individual' },
      { presentacion_id: pr.id, insumo_id: 'caja-si', embolsado_sugerido: 'grande' },
    ]).flat(),
    presentacion_empaque: PRESENTACIONES.map(pr => [
      { presentacion_id: pr.id, insumo_id: 'emp-tiras', cantidad: 1, condicion: 'siempre' },
      { presentacion_id: pr.id, insumo_id: 'emp-sep', cantidad: 3, condicion: 'siempre' },
      { presentacion_id: pr.id, insumo_id: 'emp-bolsa', cantidad: 1, condicion: 'bolsa_grande' },
    ]).flat(),
    insumos: [
      { id: 'caja-1', nombre: 'Caja N°1', marca: 'Nuss' }, { id: 'caja-dp', nombre: 'Caja N°1', marca: 'Dolce Pasta' },
      { id: 'caja-si', nombre: 'Caja N°1', marca: 'Sin impresión' }, { id: 'emp-tiras', nombre: 'Tiras x4', marca: null },
      { id: 'emp-sep', nombre: 'Separador N°1', marca: null }, { id: 'emp-bolsa', nombre: 'Bolsa 100x80', marca: null },
      // Bultos o kilos, como en Stock (02/10/2026): la harina La Clásica se
      // mira en bultos de 25 kg (la sala dice "quedan 97 bultos").
      { id: 'ins-h3', nombre: 'Harina 000', marca: 'La Clásica', vista_preferida: 'bulto' },
    ],
    v_stock_por_lote: [
      { unidad_negocio_id: 'u-n', insumo_id: 'ins-h3', lote: '08/09/26', contenido_por_bulto: 25, saldo: 2425 },
      { unidad_negocio_id: 'u-n', insumo_id: 'ins-h3', lote: '15/09/26', contenido_por_bulto: 25, saldo: 900 },
      { unidad_negocio_id: 'u-n', insumo_id: 'ins-h3', lote: '22/09/26', contenido_por_bulto: 25, saldo: 1500 },
    ],
    v_stock_insumos: [],
  },
  rpc: {
    mi_sesion_produccion: { empleado_id: 'tab-1', nombre: 'Tablet Producción · Cucuruchos Nuss', es_dispositivo: true, unidad_negocio_id: 'u-n' },
    personal_produccion: [
      { id: 'emp-fede', nombre: 'Federico Silva', misma_unidad: true, puestos: ['encargado', 'operario'], tiene_pin: true, pin_temporal: false, debe_cambiar_pin: false, es_maestro: false },
      { id: 'emp-agus', nombre: 'Agustín Barrera', misma_unidad: true, puestos: ['masero'], tiene_pin: true, pin_temporal: false, debe_cambiar_pin: false, es_maestro: false },
      { id: 'emp-ramon', nombre: 'Ramón Díaz', misma_unidad: true, puestos: ['operario'], tiene_pin: true, pin_temporal: false, debe_cambiar_pin: false, es_maestro: false },
      { id: 'emp-lucia', nombre: 'Lucía Paz', misma_unidad: true, puestos: ['operario'], tiene_pin: false, pin_temporal: false, debe_cambiar_pin: false, es_maestro: false },
      ...['Villagra Fabián', 'Tissera Franco', 'Gómez Rodrigo', 'Sosa Marcela', 'Quiroga Daniel', 'Ledesma Paola', 'Ferreyra Juan Cruz',
        'Aguirre Matías', 'Molina Sebastián', 'Carrizo Ana', 'Bustos Emiliano', 'Heredia Nicolás'].map((nombre, i) => ({
        id: i === 0 ? 'emp-vill' : i === 1 ? 'emp-tiss' : `emp-op${i}`, nombre, misma_unidad: true, puestos: ['operario'],
        tiene_pin: i % 3 !== 0, pin_temporal: false, debe_cambiar_pin: false, es_maestro: false })),
      { id: 'emp-marta', nombre: 'Marta Jefa', misma_unidad: true, puestos: ['encargado'], tiene_pin: true, pin_temporal: false, debe_cambiar_pin: false, es_maestro: true },
    ],
    verificar_pin_produccion: { ok: true, debe_cambiar: false },
    verificar_pin_maestro: { ok: true },
    datos_para_masa: { turno: { id: 't1', lote: 7033 }, original: ORIGINAL, anterior: ANTERIOR, insumos: INSUMOS },
    stock_para_masa: STOCK,
    mis_pendientes: [],
  },
};
