// Datos de la maqueta: planta-v2 (la PLANTA con los MISMOS datos de ejemplo que
// el diseño de Claude Design, e2e/disenos/planta-v2). Ver
// pruebas/datos-maqueta/README.md.
//
// Existe para COMPARAR CON EL DISEÑO (e2e/9-comparar-planta.spec.js): con los
// mismos nombres, lotes, horas y cantidades que dibujó el diseño, la foto de la
// app y la del diseño se pueden poner lado a lado y la diferencia que queda es
// de diseño, no de datos. La prueba fija el reloj en el 28/09/2026 15:58 de
// Argentina (la hora que dice el diseño), así "hace 12 min" y "desde las 06:00"
// son los mismos.
//
// DOS DIFERENCIAS CON EL DISEÑO QUE SON DE LA BASE, NO DE LA PANTALLA:
//  - ¿Quién sos? de Producción lista solo ENCARGADOS: verificar_pin_produccion
//    acepta los puestos 'encargado' y 'masero' (pg_get_functiondef, 28/09/2026);
//    un operario no puede entrar a Producción. El diseño dibuja también a los
//    operarios.
//  - Las presentaciones reales son cuatro por producto (Caja con / sin cono,
//    Media caja con / sin cono); la pantalla dice "Caja completa" y "Media
//    altura" como el diseño.
'use strict';
const { UID, tarea, UNIDADES, MOTIVOS_PARADA } = require('./comun');

const DIA = '2026-09-28';
const AYER = '2026-09-27';
// Horas de Argentina (UTC−3) escritas como en el diseño.
const hora = (hhmm, dia = DIA) => {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(Date.UTC(Number(dia.slice(0, 4)), Number(dia.slice(5, 7)) - 1, Number(dia.slice(8, 10)), h + 3, m)).toISOString();
};

const MAQUINAS = [1, 2, 3, 4, 5].map(n => ({ id: `maq-${n}`, unidad_negocio_id: 'u-n', nombre: `Máquina ${n}`, activa: true, orden: n }));

// El personal del diseño. Los encargados entran a Producción, los maseros a
// Sala de masa; los operarios van en Abrir turno y en la planilla.
const P = (id, nombre, puestos, extra = {}) => ({ id, nombre, misma_unidad: true, puestos, puestos_temporales: [], tiene_pin: true,
  pin_temporal: false, debe_cambiar_pin: false, es_maestro: false, ...extra });
const PERSONAL = [
  P('e-hinga', 'Hinga Luciano', ['encargado']),
  P('e-rios', 'Ríos Marcela', ['encargado']),
  P('e-villagra', 'Villagra Vladimir', ['operario', 'masero']),
  P('e-aguirre', 'Aguirre Fabrizio', ['operario']),
  P('e-barrera', 'Barrera Agustín', ['operario', 'masero']),
  P('e-sosa', 'Sosa Diego', ['operario']),
  P('e-medina', 'Medina Lucas', ['operario']),
  P('e-quiroga', 'Quiroga Brenda', ['operario']),
  P('e-correa', 'Correa Nahuel', ['operario']),
  P('e-pazs', 'Paz Sergio', ['operario']),
  P('e-vera', 'Vera Romina', ['operario']),
  P('e-molina', 'Molina Iván', ['operario']),
  P('e-luna', 'Luna Tomás', ['operario']),
  P('e-paredes', 'Paredes Julieta', ['encargado']),
  P('e-gomez', 'Gómez Ezequiel', ['operario']),
  P('e-ledesma', 'Ledesma Cintia', ['operario']),
  P('e-pazl', 'Paz Lucas', [], { tiene_pin: false }),
  P('e-marta', 'Marta Jefa', ['encargado'], { es_maestro: true }),
  // De otra fábrica: no aparece en la grilla, sí en "Buscar a otra persona".
  P('e-otra', 'Ferreyra Daniela', ['encargado'], { misma_unidad: false }),
];

const turno = (id, lote, maquina, encargado, extra = {}) => ({
  id, lote, maquina_id: maquina, unidad_negocio_id: 'u-n', fecha: DIA, turno: 'Tarde', encargado_id: encargado,
  estado: 'abierto', abierto_en: hora('06:00'), forzado_por: null, forzado_en: null, forzado_motivo: null, ...extra,
});
const TURNOS = [
  turno('t1', 7038, 'maq-1', 'e-hinga'),
  turno('t2', 7036, 'maq-2', 'e-rios'),
  turno('t3', 7031, 'maq-3', 'e-paredes'),
  // Un turno de AYER, cerrado, en la Máquina 4: son los que "trabajaron hace
  // poco en Máquina 4" en Abrir turno.
  turno('t0', 7030, 'maq-4', 'e-hinga', { fecha: AYER, estado: 'cerrado', abierto_en: hora('06:00', AYER), cerrado_en: hora('15:50', AYER), scrap_kg: 1.4 }),
];
const OPERARIOS = [
  ['t1', 'e-villagra'], ['t1', 'e-aguirre'], ['t1', 'e-barrera'], ['t2', 'e-quiroga'], ['t3', 'e-correa'],
  ['t0', 'e-aguirre'], ['t0', 'e-villagra'], ['t0', 'e-sosa'], ['t0', 'e-medina'],
].map(([turno_id, empleado_id]) => ({ turno_id, empleado_id, desde: hora('06:00', turno_id === 't0' ? AYER : DIA), hasta: null }));

const masa = (id, turnoId, nro, hhmm, extra = {}) => ({
  id, turno_id: turnoId, nro, hora: hora(hhmm), tipo_masa: 'Común', doble: false, origen: 'anterior',
  es_chocolate: false, anulada: false, anulada_motivo: null, masero_id: 'e-villagra', motivo: null, receta_id: 'rec-1', ...extra,
});
const MASAS = [
  masa('m1-1', 't1', 1, '06:40', { origen: 'original' }),
  masa('m1-2', 't1', 2, '09:30', { doble: true }),
  masa('m1-3', 't1', 3, '11:15'),
  masa('m1-4', 't1', 4, '12:40'),
  masa('m1-5', 't1', 5, '14:05', { doble: true, origen: 'modificada', es_chocolate: true, motivo: 'Masa de chocolate para Mini Chocolate' }),
  masa('m1-6', 't1', 6, '15:20'),
  masa('m2-1', 't2', 1, '07:10'), masa('m2-2', 't2', 2, '09:40'), masa('m2-3', 't2', 3, '12:20'), masa('m2-4', 't2', 4, '14:50'),
  masa('m3-1', 't3', 1, '07:30'), masa('m3-2', 't3', 2, '10:30'), masa('m3-3', 't3', 3, '13:45'),
];

const PARADAS = [
  { id: 'pa-1', turno_id: 't1', inicio: hora('10:05'), fin: hora('10:11'), motivo: 'Otro motivo' },
  { id: 'pa-2', turno_id: 't1', inicio: hora('13:10'), fin: hora('13:22'), motivo: 'Se cortó la cadena' },
  { id: 'pa-3', turno_id: 't3', inicio: hora('15:46'), fin: null, motivo: 'Se cortó la cadena' },
];

// Los productos y presentaciones como en la base (28/09/2026): cuatro por
// producto. El diseño muestra Mini, Chico, Grande y Standard, y de chocolate
// Mini, Chico y Standard.
const TAMANOS = ['Mini', 'Chico', 'Grande', 'Standard'];
const POR_CAJA = { Mini: [320, 320, 160, 160], Chico: [256, 240, 128, 120], Grande: [240, 224, 120, 112], Standard: [224, 208, 112, 104] };
const PRODUCTOS = [
  ...TAMANOS.map((t, i) => ({ id: `p-${t}`, unidad_negocio_id: 'u-n', nombre: `Cucuruchón ${t}`, tipo_masa: 'Común', activo: true, orden: i + 1 })),
  ...['Mini', 'Chico', 'Standard'].map((t, i) => ({ id: `p-${t}-ch`, unidad_negocio_id: 'u-n', nombre: `Cucuruchón ${t} Chocolate`, tipo_masa: 'Chocolate', activo: true, orden: i + 5 })),
];
const PRESENTACIONES = PRODUCTOS.map(p => {
  const t = p.nombre.split(' ')[1];
  const [sin, con, msin, mcon] = POR_CAJA[t];
  return [
    { id: `pp-${p.id}-sin`, producto_id: p.id, nombre: 'Caja sin cono', con_cono: false, media_caja: false, empaque: 'caja', unidades_por_caja: sin, activa: true, orden: 1 },
    { id: `pp-${p.id}-con`, producto_id: p.id, nombre: 'Caja con cono', con_cono: true, media_caja: false, empaque: 'caja', unidades_por_caja: con, activa: true, orden: 2 },
    { id: `pp-${p.id}-msin`, producto_id: p.id, nombre: 'Media caja', con_cono: false, media_caja: true, empaque: 'caja', unidades_por_caja: msin, activa: true, orden: 3 },
    { id: `pp-${p.id}-mcon`, producto_id: p.id, nombre: 'Media caja con cono', con_cono: true, media_caja: true, empaque: 'caja', unidades_por_caja: mcon, activa: true, orden: 4 },
  ];
}).flat();

const CONOS = ['BAHIA CHAJARI', 'CASERATO', 'DUOMO', 'HELADOS KATY', 'LA ROMANA', 'FREDDO TANDIL', 'GIUSEPPE', 'PERSICCO', 'SEI TU',
  'LA VENECIA', 'VIA FLAMINIA', 'CHUNGO', 'EL PIAMONTÉS', 'SAN REMO', 'LUCCIANO’S']
  .map((nombre, i) => ({ id: `c-${i + 1}`, nombre, activa: true, estado_alta: 'aprobada', doble_bolsa: nombre === 'BAHIA CHAJARI' }));
const cono = n => CONOS.find(c => c.nombre === n)?.id ?? null;

// Los 12 renglones de la Máquina 1 y los 2 de la Máquina 2, como el diseño.
const renglon = (turnoId, lote, i, prod, choc, conoNombre, media, cajas, embolsado = 'grande') => {
  const pid = `p-${prod}${choc ? '-ch' : ''}`;
  const tipo = `${media ? 'm' : ''}${conoNombre ? 'con' : 'sin'}`;
  const pres = PRESENTACIONES.find(x => x.id === `pp-${pid}-${tipo}`);
  return { id: `pi-${turnoId}-${i}`, turno_id: turnoId, orden: i, sublote: `${lote}-${i}`, presentacion_id: pres.id, marca_id: cono(conoNombre),
    cajas, unidades_por_caja: pres.unidades_por_caja, unidades: cajas * pres.unidades_por_caja, anulado: false, caja_insumo_id: 'caja-1', embolsado };
};
const PRODUCIDO = [
  renglon('t1', 7038, 1, 'Mini', false, null, false, 4),
  renglon('t1', 7038, 2, 'Mini', false, 'BAHIA CHAJARI', false, 3, 'doble'),
  renglon('t1', 7038, 3, 'Chico', false, null, false, 5),
  renglon('t1', 7038, 4, 'Mini', false, 'CASERATO', false, 2),
  renglon('t1', 7038, 5, 'Grande', false, null, true, 3),
  renglon('t1', 7038, 6, 'Standard', false, 'DUOMO', false, 2),
  renglon('t1', 7038, 7, 'Mini', false, null, false, 4),
  renglon('t1', 7038, 8, 'Chico', false, 'HELADOS KATY', true, 3),
  renglon('t1', 7038, 9, 'Mini', true, null, false, 4),
  renglon('t1', 7038, 10, 'Grande', false, 'LA ROMANA', false, 2, 'doble'),
  renglon('t1', 7038, 11, 'Mini', false, null, false, 3),
  renglon('t1', 7038, 12, 'Standard', false, null, true, 3),
  renglon('t2', 7036, 1, 'Mini', false, null, false, 4),
  renglon('t2', 7036, 2, 'Mini', false, 'BAHIA CHAJARI', false, 3, 'doble'),
];

// La receta del diseño (9b). El agua no lleva lote; el cacao solo en chocolate.
const ITEM = (id, nombre, orden, kg, descuenta = true, pref = null) => ({ ingrediente_id: id, ingrediente: nombre, orden, descuenta_stock: descuenta, cantidad_kg: kg, insumo_preferido_id: pref });
const ORIGINAL = {
  receta_id: 'rec-1', version: 3, items: [
    ITEM('i-harina', 'Harina', 1, 25, true, 'ins-jup'),
    ITEM('i-azucar', 'Azúcar', 2, 12.5, true, 'ins-az'),
    ITEM('i-grasa', 'Grasa', 3, 2, true, 'ins-grasa'),
    ITEM('i-lecitina', 'Lecitina', 4, 0.25, true, 'ins-lec'),
    ITEM('i-colorante', 'Colorante', 5, 0.03, true, 'ins-col'),
    ITEM('i-fecula', 'Fécula', 6, 1.5, true, 'ins-fec'),
    ITEM('i-bicarbonato', 'Bicarbonato', 7, 0.08, true, 'ins-bic'),
    ITEM('i-cacao', 'Cacao', 8, 0, true, 'ins-cac'),
    ITEM('i-agua', 'Agua', 9, 38, false),
  ],
};
const ANT = (id, insumo, lote, kg) => ({ ingrediente_id: id, insumo_id: insumo, lote, cantidad_simple_kg: kg });
const ANTERIOR = {
  masa_id: 'm1-6', lote: 7038, nro: 6, hora: hora('15:20'), doble: false, fecha_turno: DIA, es_de_hoy: true, es_chocolate: false,
  items: [
    ANT('i-harina', 'ins-jup', '10/09/2026', 25), ANT('i-azucar', 'ins-az', '02/09/2026', 12.5), ANT('i-grasa', 'ins-grasa', '14/09/2026', 2),
    ANT('i-lecitina', 'ins-lec', '1187', 0.25), ANT('i-colorante', 'ins-col', '0923', 0.03), ANT('i-fecula', 'ins-fec', '5521', 1.5),
    ANT('i-bicarbonato', 'ins-bic', '3301', 0.08), ANT('i-cacao', null, null, 0), ANT('i-agua', null, null, 38),
  ],
};
const INS = (ing, id, nombre, marca, lotes) => ({ ingrediente_id: ing, insumo_id: id, nombre, marca, tipo: 'materia_prima', lotes: lotes.map(([lote, stock]) => ({ lote, stock })) });
const INSUMOS = [
  INS('i-harina', 'ins-chac', 'Harina 000', 'Chacabuco', [['28/08/2026', 900], ['22/09/2026', 5000]]),
  INS('i-harina', 'ins-jup', 'Harina 000', 'Júpiter', [['10/09/2026', 6100], ['18/09/2026', 8000], ['25/09/2026', 8000]]),
  INS('i-harina', 'ins-clas', 'Harina 000', 'La Clásica', [['15/09/2026', 2400]]),
  INS('i-azucar', 'ins-az', 'Azúcar', 'Ledesma', [['02/09/2026', 840]]),
  // La grasa no tiene ingreso cargado: su lote va "sin ingreso cargado" y la
  // ventana abre directo con el campo (9f).
  INS('i-grasa', 'ins-grasa', 'Grasa', 'Tres Arroyos', []),
  INS('i-grasa', 'ins-danica', 'Grasa', 'Dánica', []),
  INS('i-lecitina', 'ins-lec', 'Lecitina', 'Solae', [['1187', 12]]),
  INS('i-colorante', 'ins-col', 'Colorante', 'Tartrazina', [['0923', 1.8]]),
  INS('i-fecula', 'ins-fec', 'Fécula', 'Maizena', [['5521', 96]]),
  INS('i-bicarbonato', 'ins-bic', 'Bicarbonato', 'Dos Anclas', [['3301', 7]]),
  INS('i-cacao', 'ins-cac', 'Cacao', 'Fénix', [['3012', 22]]),
];
const DESDE = { '28/08/2026': '2026-08-29', '10/09/2026': '2026-09-11', '18/09/2026': '2026-09-19', '15/09/2026': '2026-09-16', '22/09/2026': '2026-09-23', '25/09/2026': '2026-09-26' };
const STOCK = INSUMOS.map(i => ({
  insumo_id: i.insumo_id, nombre: i.nombre, marca: i.marca, categoria: 'Harinas', unidad_medida: 'kg',
  lotes: i.lotes.map(l => ({ lote: l.lote, queda: l.stock, desde: DESDE[l.lote] ?? '2026-09-01' })),
}));

module.exports = {
  uid: UID,
  // El reloj de la maqueta para comparar con el diseño: 28/09/2026 15:58 de Argentina.
  ahora: hora('15:58'),
  tablas: {
    empleados: [{ id: 'tab-1', auth_user_id: UID, nombre: 'Tablet Producción · Cucuruchos Nuss', rol_app: 'usuario', activo: true,
      unidad_negocio_id: 'u-n', es_prueba: false, es_dispositivo: true }],
    empleado_modulos: [{ empleado_id: 'tab-1', modulo: 'produccion', habilitado: true }, { empleado_id: 'tab-1', modulo: 'stock', habilitado: true }],
    empleado_tareas: [tarea('tab-1', 'produccion', 'cargar', { unidades: ['u-n'] }), tarea('tab-1', 'stock', 'ver', { unidades: ['u-n'] })],
    unidades_negocio: UNIDADES,
    v_empleados_publico: PERSONAL.map(p => ({ id: p.id, nombre: p.nombre, unidad_negocio_id: p.misma_unidad ? 'u-n' : 'u-d', tipo: 'naaloo', activo: true })),
    maquinas: MAQUINAS,
    turnos_produccion: TURNOS,
    turno_operarios: OPERARIOS,
    masas: MASAS,
    masa_items: [
      { masa_id: 'm1-5', ingrediente_id: 'i-harina', insumo_id: 'ins-jup', lote: '10/09/2026', cantidad_simple_kg: 25, ingrediente_libre: null, ingredientes: { nombre: 'Harina', orden: 1 }, insumos: { nombre: 'Harina 000', marca: 'Júpiter' } },
      { masa_id: 'm1-5', ingrediente_id: 'i-azucar', insumo_id: 'ins-az', lote: '02/09/2026', cantidad_simple_kg: 12.7, ingrediente_libre: null, ingredientes: { nombre: 'Azúcar', orden: 2 }, insumos: { nombre: 'Azúcar', marca: 'Ledesma' } },
      { masa_id: 'm1-5', ingrediente_id: 'i-grasa', insumo_id: 'ins-grasa', lote: '14/09/2026', cantidad_simple_kg: 2, ingrediente_libre: null, ingredientes: { nombre: 'Grasa', orden: 3 }, insumos: { nombre: 'Grasa', marca: 'Tres Arroyos' } },
      { masa_id: 'm1-5', ingrediente_id: 'i-lecitina', insumo_id: 'ins-lec', lote: '1187', cantidad_simple_kg: 0.25, ingrediente_libre: null, ingredientes: { nombre: 'Lecitina', orden: 4 }, insumos: { nombre: 'Lecitina', marca: 'Solae' } },
      { masa_id: 'm1-5', ingrediente_id: 'i-colorante', insumo_id: 'ins-col', lote: '0923', cantidad_simple_kg: 0.03, ingrediente_libre: null, ingredientes: { nombre: 'Colorante', orden: 5 }, insumos: { nombre: 'Colorante', marca: 'Tartrazina' } },
      { masa_id: 'm1-5', ingrediente_id: 'i-fecula', insumo_id: 'ins-fec', lote: '5521', cantidad_simple_kg: 1.5, ingrediente_libre: null, ingredientes: { nombre: 'Fécula', orden: 6 }, insumos: { nombre: 'Fécula', marca: 'Maizena' } },
      { masa_id: 'm1-5', ingrediente_id: 'i-cacao', insumo_id: 'ins-cac', lote: '3012', cantidad_simple_kg: 0.65, ingrediente_libre: null, ingredientes: { nombre: 'Cacao', orden: 8 }, insumos: { nombre: 'Cacao', marca: 'Fénix' } },
      { masa_id: 'm1-5', ingrediente_id: 'i-agua', insumo_id: null, lote: null, cantidad_simple_kg: 38, ingrediente_libre: null, ingredientes: { nombre: 'Agua', orden: 9 }, insumos: null },
    ],
    receta_items: ORIGINAL.items.map(it => ({ receta_id: 'rec-1', ingrediente_id: it.ingrediente_id, cantidad_kg: it.cantidad_kg, insumo_preferido_id: it.insumo_preferido_id })),
    recetas: MAQUINAS.map((m, i) => ({ id: i === 0 ? 'rec-1' : `rec-${i + 1}`, maquina_id: m.id, tipo_masa: 'Común', version: 3 })),
    ingredientes: ORIGINAL.items.map(it => ({ id: it.ingrediente_id, nombre: it.ingrediente, define_chocolate: it.ingrediente_id === 'i-cacao' })),
    motivos_parada: MOTIVOS_PARADA,
    paradas_produccion: PARADAS,
    produccion_items: PRODUCIDO,
    productos_terminados: PRODUCTOS,
    producto_presentaciones: PRESENTACIONES,
    marcas_personalizadas: CONOS,
    presentacion_cajas: PRESENTACIONES.map(pr => ({ presentacion_id: pr.id, insumo_id: 'caja-1', embolsado_sugerido: 'grande' })),
    presentacion_empaque: PRESENTACIONES.map(pr => [
      { presentacion_id: pr.id, insumo_id: 'emp-tiras', cantidad: 1, condicion: 'siempre' },
      { presentacion_id: pr.id, insumo_id: 'emp-bolsa', cantidad: 1, condicion: 'bolsa_grande' },
    ]).flat(),
    insumos: [
      { id: 'caja-1', nombre: 'Caja completa', marca: 'Nuss' }, { id: 'emp-tiras', nombre: 'Tiras x4', marca: null },
      { id: 'emp-bolsa', nombre: 'Bolsa grande', marca: null },
    ],
    v_stock_insumos: [],
  },
  rpc: {
    mi_sesion_produccion: { empleado_id: 'tab-1', nombre: 'Tablet Producción · Cucuruchos Nuss', es_dispositivo: true, unidad_negocio_id: 'u-n' },
    personal_produccion: PERSONAL,
    verificar_pin_produccion: { ok: true, debe_cambiar: false },
    verificar_pin_maestro: { ok: true },
    otorgar_puesto_temporal: { ok: true, pin_temporal: '4719' },
    datos_para_masa: { turno: { id: 't1', lote: 7038 }, original: ORIGINAL, anterior: ANTERIOR, insumos: INSUMOS },
    stock_para_masa: STOCK,
    que_falta_para_cerrar: [
      { clave: 'chocolate_sin_masa', nivel: 'bloquea', texto: 'Hay producto de chocolate pero ninguna masa de chocolate en este turno.',
        accion: 'El masero tiene que registrarla en Sala de masa (con Modificar, agregando el cacao), o corregí el producto.' },
      { clave: 'parada_sin_detalle', nivel: 'aviso', texto: 'Hay una parada con "Otro motivo" sin detalle.', accion: 'Anotá qué pasó, así queda registrado.' },
    ],
    scrap_de_referencia: { promedio_kg: 1.6, turnos: 12 },
    mis_pendientes: [],
  },
};
