// Datos de la maqueta y de las pruebas: Proyectos Taller con los datos del
// diseño "Proyectos Taller" (e2e/disenos/taller), como lo ve Tomás (las cuatro
// tareas del Taller). Los usan e2e/14-comparar-taller.spec.js y
// test-taller-diseno.js. Se generan a e2e/maqueta/datos/taller-diseno.json con
// `npm run maqueta:datos`.
//
// Los ids de los proyectos terminan en 0, 1, 2, 3 y 4 a propósito: el color de
// cada proyecto sale de su id (indiceColor), y así caen en los colores del
// diseño (ciruela, ámbar, oliva, rosa, violeta).
'use strict';

const { UID, tarea, UNIDADES_4 } = require('./comun');

const ID = n => `aaaaaaaa-0000-4000-8000-${String(n).padStart(12, '0')}`;
const P = { car: ID(0), dos: ID(1), dp: ID(2), per: ID(3), duo: ID(4), horno: ID(8) };

const PERSONAS = {
  tomas: { id: 'emp-tomas', nombre: 'Tomás' },
  edgar: { id: 'emp-edgar', nombre: 'Edgar Molina' },
  julian: { id: 'emp-julian', nombre: 'Julián Ferreyra' },
  gustavo: { id: 'emp-gustavo', nombre: 'Gustavo Páez' },
};

const PROYECTOS = [
  { id: P.car, nombre: 'Maq Barquillo 24 Carrizo', destino: 'externo', categoria: 'maquina', estado: 'en_curso', cliente: 'Carrizo Hnos. SRL', cliente_id: 'c-carrizo',
    fabrica_destino: null, fecha_entrega_prometida: '2026-10-15', atrasado: false, presupuesto_costo: 5200000, costo_total: 4820000, horas: 112, horas_estimadas: 140, precio_venta: 9800000 },
  { id: P.dos, nombre: 'Dosificador de masa M3', destino: 'interno', categoria: 'dispositivo', estado: 'en_curso', cliente: null, cliente_id: null,
    fabrica_destino: 'Cucuruchos Nuss', fecha_entrega_prometida: '2026-09-12', atrasado: true, presupuesto_costo: 1240000, costo_total: 1340000, horas: 64, horas_estimadas: 48, precio_venta: 1900000 },
  { id: P.dp, nombre: 'Automatización empaque', destino: 'interno', categoria: 'automatizacion', estado: 'aprobado', cliente: null, cliente_id: null,
    fabrica_destino: 'Dolce Pasta', fecha_entrega_prometida: '2026-11-30', atrasado: false, presupuesto_costo: 2900000, costo_total: 380000, horas: 10, horas_estimadas: 90, precio_venta: 4200000 },
  { id: P.horno, nombre: 'Mantenimiento horno Carrizo', destino: 'externo', categoria: 'mantenimiento', estado: 'terminado', cliente: 'Carrizo Hnos. SRL', cliente_id: 'c-carrizo',
    fabrica_destino: null, fecha_entrega_prometida: '2026-09-20', atrasado: false, presupuesto_costo: 450000, costo_total: 410000, horas: 14, horas_estimadas: 16, precio_venta: 720000 },
  { id: P.duo, nombre: 'Cinta transportadora Duomo', destino: 'externo', categoria: 'maquina', estado: 'presupuestado', cliente: 'Duomo SRL', cliente_id: 'c-duomo',
    fabrica_destino: null, fecha_entrega_prometida: null, atrasado: false, presupuesto_costo: 3600000, costo_total: 0, horas: 0, horas_estimadas: 160, precio_venta: 6500000 },
  { id: P.per, nombre: 'Soporte mensual Persicco', destino: 'externo', categoria: 'horas', estado: 'en_curso', cliente: 'Persicco Córdoba SA', cliente_id: 'c-persicco',
    fabrica_destino: null, fecha_entrega_prometida: '2026-09-30', atrasado: false, presupuesto_costo: 555000, costo_total: 407000, horas: 22, horas_estimadas: 30, precio_venta: 900000 },
  // Los otros ocho, así los números del segmentado son los del diseño (14).
  ...[
    ['Tablero de control horno 2', 'externo', 'presupuestado'], ['Reparación empaquetadora', 'interno', 'en_curso'],
    ['Guardas de seguridad línea 1', 'interno', 'en_curso'], ['Soporte mensual Heladería Sol', 'externo', 'en_curso'],
    ['Cambio de rodillos Mengui', 'interno', 'terminado'], ['Mesa de acero Dolce', 'interno', 'entregado'],
    ['Horno túnel Bianchi', 'externo', 'entregado'], ['Selladora Bianchi', 'externo', 'cancelado'],
  ].map(([nombre, destino, estado], i) => ({
    id: ID(10 + i), nombre, destino, categoria: 'otro', estado, cliente: destino === 'externo' ? 'Bianchi Hnos.' : null, cliente_id: null,
    fabrica_destino: destino === 'interno' ? 'Mengui' : null, fecha_entrega_prometida: '2026-12-15', atrasado: false,
    presupuesto_costo: 800000, costo_total: 100000, horas: 4, horas_estimadas: 40, precio_venta: 1500000,
  })),
];

const GASTOS = [
  ['2026-09-03', 'Chapa inox 304 1,5 mm', 'Aceros Córdoba', 986000], ['2026-09-05', 'Motorreductor 0,75 kW', 'Transmisiones del Centro', 642000],
  ['2026-09-10', 'Rodamientos y cadenas', 'Rulemanes Colón', 214000], ['2026-09-14', 'Resistencias y termocuplas', 'Electro Hornos', 388000],
  ['2026-09-18', 'Tablero eléctrico', 'Electricidad Rivera', 356000], ['2026-09-22', 'Pintura epoxi y tornillería', 'Pinturerías Rex', 162000],
].map(([fecha, descripcion, razon_social, importe]) => ({ fecha, descripcion, razon_social, importe, moneda: 'ARS' }));

const HORAS = [
  ['2026-09-26', 'Edgar Molina', 6, 'Soldadura del bastidor'], ['2026-09-26', 'Tomás', 3, 'Armado del tablero eléctrico'],
  ['2026-09-25', 'Edgar Molina', 8, 'Soldadura del bastidor'], ['2026-09-24', 'Edgar Molina', 7, 'Corte y plegado de chapa'],
  ['2026-09-23', 'Tomás', 4, 'Pruebas del motorreductor'], ['2026-09-22', 'Edgar Molina', 8, 'Corte y plegado de chapa'],
  ['2026-09-19', 'Edgar Molina', 6, 'Montaje de transmisión'],
].map(([fecha, persona, horas, t], i) => ({ id: `h${i + 1}`, fecha, persona, horas, tarea: t }));

const NOTAS = [
  ['Quedó soldado el bastidor. Mañana arranco con la tolva.', 'Edgar Molina', '2026-09-26T21:10:00Z'],
  ['Carrizo pidió que la salida de barquillos quede a 90 cm del piso. Lo charlé con Edgar, entra sin cambiar el plano.', 'Tomás', '2026-09-25T14:32:00Z'],
  ['Llegó el motorreductor. Probado en vacío, anda bien.', 'Tomás', '2026-09-23T19:05:00Z'],
  ['Se aprobó el plano v3. Arrancamos con el corte de chapa.', 'Tomás', '2026-09-19T12:40:00Z'],
].map(([texto, autor, fecha]) => ({ texto, autor, fecha }));

const ARCHIVOS = [
  ['ar1', 'plano', 'Plano general v3.pdf', '2026-09-19T12:00:00Z', 'emp-tomas'], ['ar2', 'presupuesto', 'Presupuesto aprobado.pdf', '2026-09-02T12:00:00Z', 'emp-tomas'],
  ['ar3', 'foto', 'Bastidor soldado.jpg', '2026-09-26T12:00:00Z', 'emp-edgar'], ['ar4', 'foto', 'Motorreductor en prueba.jpg', '2026-09-23T12:00:00Z', 'emp-tomas'],
  ['ar5', 'plano', 'Plano tolva.pdf', '2026-09-25T12:00:00Z', 'emp-tomas'], ['ar6', 'foto', 'Tablero armado.jpg', '2026-09-26T13:00:00Z', 'emp-edgar'],
];

const RESUMEN_CAR = {
  id: P.car, nombre: 'Maq Barquillo 24 Carrizo', destino: 'externo', categoria: 'maquina', estado: 'en_curso',
  cliente: { id: 'c-carrizo', nombre: 'Carrizo Hnos. SRL', razon_social: 'Carrizo Hnos. SRL' }, fabrica_destino: null,
  descripcion: null, ubicacion: null, observaciones: null, responsable: null,
  fecha_inicio: '2026-09-01', fecha_entrega_prometida: '2026-10-15', fecha_entrega_real: null, atrasado: false, moneda: 'ARS',
  presupuesto_costo: 5200000, horas_estimadas: 140, gastado: 2748000, horas: 112, costo_horas: 2072000, costo_total: 4820000,
  presupuesto_usado_pct: 92.7, horas_usadas_pct: 80,
  gastos: GASTOS, horas_detalle: HORAS, notas: NOTAS,
  archivos: ARCHIVOS.map(([id, tipo, nombre, fecha]) => ({ id, tipo, nombre, ruta: `${P.car}/${id}`, fecha })),
  precio_venta: 9800000, facturado: 5880000, cobrado: 3480000, margen: 4980000, margen_pct: 50.8,
};

// Lo facturado y lo cobrado de cada tarjeta (con precios, la lista pide el
// resumen de cada proyecto).
function resumenCorto(p, facturado, cobrado) {
  return { ...RESUMEN_CAR, id: p.id, nombre: p.nombre, destino: p.destino, estado: p.estado, facturado, cobrado, precio_venta: p.precio_venta,
    categoria: p.categoria, fabrica_destino: p.fabrica_destino, fecha_entrega_prometida: p.fecha_entrega_prometida, atrasado: p.atrasado, cliente: p.cliente ? { id: p.cliente_id, nombre: p.cliente, razon_social: p.cliente } : null,
    gastos: [], horas_detalle: [], notas: [], archivos: [] };
}
const CORTOS = { [P.dos]: [1200000, null], [P.dp]: [0, null], [P.horno]: [720000, 540000], [P.duo]: [0, 0], [P.per]: [0, 0] };

const T = (id, titulo, proyecto, persona, fecha_inicio, dias, extra = {}) => {
  const d = new Date(fecha_inicio + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + dias - 1);
  return {
    id, titulo, nombre_corto: null, descripcion: null, estado: 'por_hacer', prioridad: null, orden: 0, avance_pct: 0,
    proyecto_id: P[proyecto], proyecto: PROYECTOS.find(p => p.id === P[proyecto]).nombre,
    fecha_inicio, dias, fecha_fin_plan: d.toISOString().slice(0, 10), fecha_fin_real: null, horas_estimadas: dias * 8,
    motivo_bloqueo: null, horas: 0, atrasada: false, se_superpone: false, personas: [PERSONAS[persona]], ...extra,
  };
};
const TAREAS = [
  T('t06', 'Ajuste de la bomba', 'dos', 'julian', '2026-09-25', 2, { avance_pct: 70, atrasada: true, estado: 'en_curso', horas_estimadas: 16 }),
  T('t01', 'Tolva y dosificación', 'car', 'edgar', '2026-09-28', 4, { avance_pct: 20, estado: 'en_curso', horas_estimadas: 32, orden: 1 }),
  T('t02', 'Tablero eléctrico', 'car', 'tomas', '2026-09-28', 2, { avance_pct: 60, estado: 'en_curso', horas_estimadas: 16, orden: 2 }),
  T('t07', 'Instalación en Máquina 3', 'dos', 'julian', '2026-09-30', 1, { nombre_corto: 'Instalación M3', se_superpone: true, horas_estimadas: 8 }),
  T('t08', 'Relevamiento en Dolce Pasta', 'dp', 'tomas', '2026-09-30', 1, { nombre_corto: 'Relevar DP', horas_estimadas: 8 }),
  T('t11', 'Visita mensual Persicco', 'per', 'gustavo', '2026-09-30', 1, { nombre_corto: 'Visita Persicco', horas_estimadas: 8 }),
  T('t12', 'Medir en Heladería Duomo', 'duo', 'julian', '2026-09-30', 1, { nombre_corto: 'Medir Duomo', se_superpone: true, horas_estimadas: 8 }),
  T('t09', 'Diseño y plano', 'dp', 'tomas', '2026-10-01', 6, { horas_estimadas: 40 }),
  T('t03', 'Montaje de cadena y moldes', 'car', 'edgar', '2026-10-02', 6, { horas_estimadas: 40, orden: 3 }),
  T('t10', 'Compra de sensores', 'dp', 'gustavo', '2026-10-05', 1, { nombre_corto: 'Sensores', horas_estimadas: 8 }),
  T('t04', 'Pruebas en vacío', 'car', 'tomas', '2026-10-08', 2, { horas_estimadas: 16, orden: 4 }),
  T('t05', 'Pintura', 'car', 'gustavo', '2026-10-08', 3, { horas_estimadas: 24, orden: 5 }),
];

module.exports = {
  uid: UID,
  email: 'tomas@seisdestinos.com',
  meta: { nombre_completo: 'Tomás Olmos' },
  tablas: {
    empleados: [
      { id: 'emp-tomas', auth_user_id: UID, nombre: 'Tomás Olmos', rol_app: 'usuario', activo: true, unidad_negocio_id: 'u-t', es_prueba: false, es_dispositivo: false },
    ],
    empleado_modulos: [
      { empleado_id: 'emp-tomas', modulo: 'taller', habilitado: true },
      { empleado_id: 'emp-tomas', modulo: 'gastos', habilitado: true },
      { empleado_id: 'emp-tomas', modulo: 'caja', habilitado: true },
      { empleado_id: 'emp-tomas', modulo: 'stock', habilitado: true },
    ],
    // Las tareas de gastos y stock con alcance en las cuatro fábricas: así la
    // barra de arriba muestra las cuatro, como en el diseño.
    empleado_tareas: [
      tarea('emp-tomas', 'taller', 'ver'), tarea('emp-tomas', 'taller', 'cargar'),
      tarea('emp-tomas', 'taller', 'gestionar'), tarea('emp-tomas', 'taller', 'precios'),
      tarea('emp-tomas', 'stock', 'ver', { todas: true }),
    ],
    unidades_negocio: UNIDADES_4,
    v_empleados_publico: [
      { id: 'emp-tomas', nombre: 'Tomás', unidad_negocio_id: 'u-t', tipo: 'naaloo', activo: true },
      { id: 'emp-edgar', nombre: 'Edgar Molina', unidad_negocio_id: 'u-t', tipo: 'naaloo', activo: true },
      { id: 'emp-julian', nombre: 'Julián Ferreyra', unidad_negocio_id: 'u-t', tipo: 'naaloo', activo: true },
      { id: 'emp-gustavo', nombre: 'Gustavo Páez', unidad_negocio_id: 'u-t', tipo: 'naaloo', activo: true },
      { id: 'emp-facundo', nombre: 'Facundo U.', unidad_negocio_id: 'u-n', tipo: 'admin', activo: true },
      { id: 'emp-tablet', nombre: 'Tablet Producción · Cucuruchos Nuss', unidad_negocio_id: 'u-n', tipo: 'sistema', activo: true },
    ],
    clientes: [
      { id: 'c-carrizo', nombre: 'Carrizo Hnos. SRL', razon_social: 'Carrizo Hnos. SRL', activo: true, unidad_negocio_id: 'u-t' },
      { id: 'c-duomo', nombre: 'Duomo SRL', razon_social: 'Duomo SRL', activo: true, unidad_negocio_id: 'u-t' },
      { id: 'c-persicco', nombre: 'Persicco Córdoba SA', razon_social: 'Persicco Córdoba SA', activo: true, unidad_negocio_id: 'u-t' },
    ],
    taller_valor_hora: [
      { valor: 18500, vigente_desde: '2026-09-01', cargado_por: 'emp-tomas', cargado_en: '2026-09-01T12:00:00Z' },
      { valor: 16800, vigente_desde: '2026-06-01', cargado_por: 'emp-tomas', cargado_en: '2026-06-01T12:00:00Z' },
      { valor: 15000, vigente_desde: '2026-03-01', cargado_por: 'emp-facundo', cargado_en: '2026-03-01T12:00:00Z' },
    ],
    proyecto_archivos: ARCHIVOS.map(([id, , , , subido_por]) => ({ id, subido_por, proyecto_id: P.car })),
  },
  rpc: {
    proyectos_taller: PROYECTOS,
    resumen_proyecto: {
      __segun: [
        { si: { p_proyecto_id: P.car }, r: RESUMEN_CAR },
        ...Object.entries(CORTOS).map(([id, [f, c]]) => ({ si: { p_proyecto_id: id }, r: resumenCorto(PROYECTOS.find(p => p.id === id), f, c) })),
      ],
      __defecto: { ...RESUMEN_CAR, facturado: 0, cobrado: 0 },
    },
    tareas_taller: TAREAS,
    mis_pendientes: [],
  },
};
