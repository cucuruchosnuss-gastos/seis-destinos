// Datos de la maqueta y de las pruebas: Conos de papel (10/10/2026), como lo ve
// Pablo, que pide (las cuatro tareas de conos). Los pliegos 317, 320 y 321 son
// los de las órdenes de compra de Musumeci (cargados de los PDF); el 322 está
// en armado y el 323 pedido, en camino. Ver pruebas/datos-maqueta/README.md.
//
//   http://localhost:4180/modulos/conos.html?maqueta=conos
'use strict';

const { UID, tarea } = require('./comun');

const EMP = 'emp-pablo';
const M = n => `cccccccc-0000-4000-8000-${String(n).padStart(12, '0')}`;

// Los conos: [nombre, papel ilustración, stock, en camino, en armado, consumo 30 días, activa].
const CONOS = [
  ['ASPEN', false, 42000, 0, 0, 30000, true],
  ['CASERATO', false, 6000, 0, 0, 9000, true],
  ['CHUII', false, 8000, 0, 0, 2000, true],
  ['COSQUIN', false, 15000, 10000, 0, 3000, true],
  ['DIPALE', false, 9000, 0, 10000, 1500, true],
  ['DUOMO', false, 180000, 0, 0, 60000, true],
  ['FIBRO', false, -2000, 0, 0, 4000, true],
  ['GARAVANO', false, 9500, 0, 0, 800, true],
  ['HELANUS', false, 9000, 0, 0, 1200, true],
  ['KREMS', false, 7000, 0, 0, 900, true],
  ['LA AMERICANA', false, 10000, 0, 0, 0, true],
  ['LEROMA', false, 14000, 0, 20000, 6000, true],
  ['MARBET', true, 12000, 0, 0, 3000, true],
  ['MAS', false, 8000, 0, 0, 1000, true],
  ['MAYO', false, 16000, 0, 0, 5000, true],
  ['QUINTANA', true, 40000, 0, 0, 20000, true],
  ['RIO', true, 15000, 0, 0, 4000, true],
  ['RIO OLIMPICOS', true, 18000, 0, 0, 2500, true],
  ['SOPPELSA', false, 7500, 0, 0, 1000, true],
  ['WOLLEN', false, 9800, 0, 0, 700, true],
  ['YO', false, 17000, 0, 0, 3000, true],
  ['YOMO', false, 18000, 0, 0, 2000, true],
  ['VIEJO <b>X</b>', false, 0, 0, 0, 0, false],
];
const ID = {};
CONOS.forEach(([n], i) => { ID[n] = M(i + 1); });

const conos_stock = CONOS.map(([cono, ilus, stock, camino, armado, c30, activa]) => ({
  marca_id: ID[cono], cono, activa, papel_ilustracion: ilus, base_conteo: null, base_desde: '2026-10-11T03:00:00+00:00',
  recibido: 0, ajustes: 0, consumido: 0, stock, en_camino: camino, en_armado: armado, consumo_30d: c30,
}));

const P = { p317: 'pl-317', p320: 'pl-320', p321: 'pl-321', p322: 'pl-322', p323: 'pl-323' };
const pliego = (id, numero, papel, total, estado, fecha, entrega, precio, comentarios, extra = {}) => ({
  id, numero, papel, cantidad_total: total, fecha_pedido: fecha, fecha_entrega_estimada: entrega, estado,
  proveedor_id: 'prov-musumeci', precio_unitario: precio, nota: null, creado_por: EMP, creado_en: fecha + 'T12:00:00Z',
  pedido_en: estado === 'armando' ? null : fecha + 'T13:00:00Z', recibido_en: estado.startsWith('recibido') ? entrega + 'T15:00:00Z' : null,
  anulado_en: null, anulado_motivo: null, iva_pct: 21, comentarios, version: 1, reabierto_en: null, ...extra,
});
const cono_pliegos = [
  pliego(P.p323, 323, 'ilustracion', 120000, 'pedido', '2026-10-08', '2026-10-15', 15, 'PLIEGO DE 5000 · PAPEL ILUSTRACIÓN 80', { version: 2, reabierto_en: '2026-10-09T12:00:00Z' }),
  pliego(P.p322, 322, 'obra', 240000, 'armando', '2026-10-10', '2026-10-20', null, 'PAPEL OBRA BLANCO 70'),
  pliego(P.p321, 321, 'obra', 240000, 'recibido', '2026-09-29', '2026-10-01', 9, 'PAPEL OBRA BLANCO 70'),
  pliego(P.p320, 320, 'obra_nature', 240000, 'recibido', '2026-09-21', '2026-09-24', 6.75, 'PAPELES DE 12cm X12cm · PAPEL OBRA NATURE A 2 COLORES'),
  pliego(P.p317, 317, 'ilustracion', 120000, 'recibido', '2026-08-26', '2026-08-31', 15, 'PLIEGO DE 5000 · PAPEL ILUSTRACIÓN 80'),
];

let n = 0;
const item = (pliego_id, cono, cantidad, recibido, logo_nuevo = false) => ({ id: `it-${++n}`, pliego_id, marca_id: ID[cono], cantidad, recibido, logo_nuevo });
const cono_pliego_items = [
  // 321: el de la orden de compra de Musumeci (240.000 × $ 9 = $ 2.160.000 + 21 %).
  ...[['ASPEN', 50000], ['LEROMA', 20000], ['MAYO', 20000], ['YO', 20000], ['YOMO', 20000], ['DIPALE', 10000],
    ['SOPPELSA', 10000], ['WOLLEN', 10000], ['CHUII', 10000], ['CASERATO', 10000], ['COSQUIN', 10000],
    ['FIBRO', 10000, true], ['LA AMERICANA', 10000], ['MAS', 10000], ['KREMS', 10000], ['HELANUS', 10000, true]]
    .map(([c, q, nuevo]) => item(P.p321, c, q, q, !!nuevo)),
  item(P.p320, 'DUOMO', 230000, 230000), item(P.p320, 'GARAVANO', 10000, 10000),
  item(P.p317, 'QUINTANA', 60000, 60000), item(P.p317, 'RIO', 20000, 20000), item(P.p317, 'MARBET', 20000, 20000),
  item(P.p317, 'RIO OLIMPICOS', 20000, 20000, true),
  // 322, en armado: 30.000 asignados de 240.000.
  item(P.p322, 'LEROMA', 20000, 0), item(P.p322, 'DIPALE', 10000, 0, true),
  // 323, pedido: llegó una parte del MARBET? no, todavía nada.
  item(P.p323, 'COSQUIN', 10000, 0), item(P.p323, 'QUINTANA', 60000, 0), item(P.p323, 'RIO', 50000, 0),
];

const cono_papeles = [
  { papel: 'ilustracion', nombre: 'Ilustración', descripcion_oc: 'Etiquetas para conos en Papel Ilustración Brillante 80 gramos cortados de 12cm x 12cm según siguiente detalle:', gramaje: '80 g brillante' },
  { papel: 'obra', nombre: 'Obra blanco', descripcion_oc: 'Etiquetas para conos en Papel Obra Blanco 70 gramos cortados de 12cm x 12cm según siguiente detalle:', gramaje: '70 g' },
  { papel: 'obra_nature', nombre: 'Obra nature', descripcion_oc: 'Etiquetas para conos en Papel Obra Nature de 60 gramos cortados de 12cm x 12cm según siguiente detalle:', gramaje: '60 g, a 2 colores' },
];

const conos_config = [
  ['proximo_pliego', '322'], ['oc_razon_social', 'PAZ MIRTA'], ['oc_cuit', '20-92410679-5'],
  ['oc_domicilio', 'Las Gredas 2555 · Córdoba Capital'], ['oc_telefono', '3513125236'], ['oc_solicitante', 'Pablo'],
  ['oc_envio', 'Transporte Propio'],
  ['oc_proveedor_texto', 'MUSUMECI SRL · At. Adrián Musumeci · Antonio de Sucre 1559, Córdoba · Tel. 0351-4712933 · ventas@graficamusumeci.com.ar'],
].map(([clave, valor]) => ({ clave, valor, nota: null }));

const cono_papel_precios = [
  { id: 'pp-1', papel: 'ilustracion', cantidad: 120000, precio_unitario: 15, vigente_desde: '2026-08-26', nota: 'Del pliego 317', cargado_por: EMP, cargado_en: '2026-10-11T01:53:36Z' },
  { id: 'pp-2', papel: 'obra_nature', cantidad: 240000, precio_unitario: 6.75, vigente_desde: '2026-09-21', nota: 'Del pliego 320', cargado_por: EMP, cargado_en: '2026-10-11T01:53:36Z' },
  { id: 'pp-3', papel: 'obra', cantidad: 240000, precio_unitario: 9, vigente_desde: '2026-09-29', nota: 'Del pliego 321', cargado_por: EMP, cargado_en: '2026-10-11T01:53:36Z' },
];

const pendientes = [
  ['obra', 'MAYO', [['pd-1', 20000, 'Pidió Carlos'], ['pd-2', 10000, null]]],
  ['obra', 'CASERATO', [['pd-3', 10000, null]]],
  ['obra', 'FIBRO', [['pd-4', 150000, null]]],
  ['ilustracion', 'MARBET', [['pd-5', 20000, 'Logo <nuevo>']]],
];
const conos_por_pedir = pendientes.map(([papel, cono, an]) => ({
  papel, marca_id: ID[cono], cono, cantidad: an.reduce((a, x) => a + x[1], 0),
  anotados: an.map(([id, cantidad, nota]) => ({ id, cantidad, nota, creado_en: '2026-10-09T15:00:00+00:00' })),
}));

module.exports = {
  uid: UID,
  email: 'pablo@seisdestinos.com',
  meta: { nombre_completo: 'Pablo Usabarrena' },
  tablas: {
    empleados: [{ id: EMP, auth_user_id: UID, nombre: 'Usabarrena Pablo', rol_app: 'usuario', activo: true, unidad_negocio_id: 'u-n', es_prueba: false, es_dispositivo: false }],
    empleado_modulos: [],
    empleado_tareas: [tarea(EMP, 'conos', 'ver'), tarea(EMP, 'conos', 'pedir'), tarea(EMP, 'conos', 'precios'), tarea(EMP, 'conos', 'recibir')],
    unidades_negocio: [{ id: 'u-n', nombre: 'Cucuruchos Nuss', prefijo: 'N', logo_url: 'logo-cucuruchos-nuss.png', activo: true, es_prueba: false, domicilio: 'Unión 843, Córdoba, Argentina', telefono: '+54 351 312-5236' }],
    cono_pliegos, cono_pliego_items, cono_papeles, conos_config, cono_papel_precios,
    cono_pliego_cambios: [
      { id: 'cb-1', pliego_id: P.p323, tipo: 'reabierto', detalle: [], motivo: 'Faltaba el RIO', hecho_por: EMP, hecho_en: '2026-10-09T12:00:00Z' },
    ],
    v_empleados_publico: [{ id: EMP, nombre: 'Usabarrena Pablo', unidad_negocio_id: 'u-n', tipo: 'naaloo', activo: true, rol_app: 'usuario' }],
  },
  rpc: {
    conos_stock,
    conos_por_pedir,
    cono_papel_sugerido: 'obra',
    anotar_cono_pendiente: 'pd-nuevo',
    editar_cono_pendiente: null,
    crear_pliego_desde_pendientes: { id: P.p322, numero: 322, cargado: 30000, falta: 210000, quedaron_anotados: 150000 },
    crear_pliego: { id: P.p322, numero: 322 },
    poner_cono_pliego: { asignado: 40000, falta: 200000, logo_nuevo: false },
    marcar_logo_nuevo: null,
    confirmar_pliego: { numero: 322, asignado: 30000, sin_asignar: 210000, precio_unitario: 9, subtotal: 270000, total_con_iva: 326700 },
    reabrir_pliego: 2,
    recibir_pliego: { recibido: 120000 },
    corregir_recepcion_pliego: null,
    cambiar_fecha_pliego: null,
    guardar_comentarios_pliego: null,
    editar_pliego: null,
    anular_pliego: null,
    ajustar_stock_cono: null,
    guardar_precio_cono_papel: 'pp-nuevo',
    proponer_marca: { marca_id: M(99), ya_existia: false },
  },
};
