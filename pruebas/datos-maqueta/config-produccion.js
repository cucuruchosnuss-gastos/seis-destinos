// Datos de la maqueta: config-produccion (la CONFIGURACIÓN de la gestión de
// Producción con los MISMOS datos de ejemplo que el diseño de Claude Design,
// e2e/disenos/config-produccion). Ver pruebas/datos-maqueta/README.md.
//
// Existe para COMPARAR CON EL DISEÑO (e2e/10-comparar-config.spec.js): con los
// mismos productos, presentaciones, máquinas, versiones de receta, conos y
// personas que dibujó el diseño, la foto de la app y la del diseño se pueden
// poner lado a lado y lo que queda es de diseño, no de datos. La prueba fija el
// reloj en el 28/09/2026 12:42 de Argentina (la hora del celular del diseño).
//
// LO QUE EL DISEÑO DIBUJA Y LA BASE NO TIENE (no se inventa acá tampoco):
//  - el cliente de cada cono y de qué sublote salió un cono por revisar
//    (marcas_personalizadas no los guarda);
//  - el color de cada producto (sale del nombre, ver colorDeProducto);
//  - las condiciones "Si es con cono" y "Si lleva doble bolsa" del empaque
//    (presentacion_empaque.condicion es siempre / bolsa_grande /
//    bolsa_individual).
'use strict';
const { UID, tarea } = require('./comun');

// Las cuatro fábricas reales y la de pruebas, como las dibuja el selector de
// unidad del diseño (sin logo: la maqueta no los necesita).
const u = (id, nombre, prefijo, es_prueba = false) => ({ id, nombre, prefijo, logo_url: null, activo: true, es_prueba });
const UNIDADES_4 = [u('u-n', 'Cucuruchos Nuss', 'N'), u('u-d', 'Dolce Pasta', 'D'), u('u-o', 'Mengui', 'O'), u('u-t', 'Taller', 'T'), u('u-p', 'Pruebas (robot)', 'X', true)];

const EMP = 'emp-fu';
// Horas de Argentina (UTC−3).
const hora = (dia, hhmm = '12:00') => {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(Date.UTC(Number(dia.slice(0, 4)), Number(dia.slice(5, 7)) - 1, Number(dia.slice(8, 10)), h + 3, m)).toISOString();
};

// ── Insumos del depósito ────────────────────────────────────────────────
const ins = (id, nombre, marca, categoria, tipo = 'insumo') => ({ id, nombre, marca, categoria, tipo, activo: true });
const INSUMOS = [
  ins('i-h-jup', 'Harina 000', 'Júpiter', 'Harinas', 'materia_prima'),
  ins('i-h-cha', 'Harina 000', 'Chacabuco', 'Harinas', 'materia_prima'),
  ins('i-h-cla', 'Harina 000', 'La Clásica', 'Harinas', 'materia_prima'),
  ins('i-h-wal', 'Harina 000', 'Wali', 'Harinas', 'materia_prima'),
  ins('i-az-led', 'Azúcar', 'Ledesma', 'Azúcares y secos', 'materia_prima'),
  ins('i-az-cha', 'Azúcar', 'Chango', 'Azúcares y secos', 'materia_prima'),
  ins('i-lec', 'Lecitina de soja', 'Solae', 'Aditivos', 'materia_prima'),
  ins('i-bic', 'Bicarbonato', 'Dos Anclas', 'Aditivos', 'materia_prima'),
  ins('i-cac-1', 'Cacao amargo', 'Mapsa', 'Azúcares y secos', 'materia_prima'),
  ins('i-cac-2', 'Cacao alcalino', 'Cargill', 'Azúcares y secos', 'materia_prima'),
  ins('i-gr-vac', 'Grasa vacuna refinada', 'Tres Arroyos', 'Grasas', 'materia_prima'),
  ins('i-gr-veg', 'Grasa vegetal', 'Dánica', 'Grasas', 'materia_prima'),
  ins('i-marg', 'Margarina de hojaldre', 'Primicia', 'Grasas', 'materia_prima'),
  ins('i-caja1', 'Caja N°1', 'Nuss', 'Cajas'),
  ins('i-caja2', 'Caja N°2', 'Nuss', 'Cajas'),
  ins('i-caja3', 'Caja N°3', 'Nuss', 'Cajas'),
  ins('i-caja-cas', 'Caja Caserato impresa', null, 'Cajas'),
  ins('i-caja-duo', 'Caja Duomo impresa', null, 'Cajas'),
  ins('i-caja-exp', 'Caja Exportación', null, 'Cajas'),
  ins('i-caja-d2', 'Caja Dolce N°2', null, 'Cajas'),
  ins('i-caja-d3', 'Caja Dolce N°3', null, 'Cajas'),
  ins('i-bolsa-g', 'bolsa grande', null, 'Bolsas'),
  ins('i-bolsa-m', 'bolsa mediana', null, 'Bolsas'),
  ins('i-plancha', 'plancha', null, 'Separadores y tiras'),
  ins('i-sep', 'separadores', null, 'Separadores y tiras'),
  ins('i-consorcio', 'bolsa de consorcio', null, 'Bolsas'),
  ins('i-precinto', 'precinto', null, 'Cintas y adhesivos'),
];

// ── Productos, presentaciones y su empaque ──────────────────────────────
const PRODUCTOS = [];
const PRESENTACIONES = [];
const CAJAS = [];
const EMPAQUE = [];
let nEmp = 0;
// emp: [caja, [[insumo, cantidad, condicion?], …]] o null (sin empaque).
function producto(unidad, id, nombre, tipo, categoria, orden, pres, activo = true) {
  PRODUCTOS.push({ id, unidad_negocio_id: unidad, nombre, tipo_masa: tipo, activo, orden, categoria });
  pres.forEach(([nombreP, conCono, u, emp, activa = true], i) => {
    const pid = `${id}-${i + 1}`;
    PRESENTACIONES.push({ id: pid, producto_id: id, nombre: nombreP, con_cono: conCono, media_caja: /media/i.test(nombreP), empaque: null, unidades_por_caja: u, activa, orden: i + 1 });
    if (!emp) return;
    const [caja, renglones] = emp;
    if (caja) CAJAS.push({ presentacion_id: pid, insumo_id: caja, embolsado_sugerido: 'grande' });
    for (const [insumo, cantidad, condicion = 'siempre'] of renglones) EMPAQUE.push({ id: `em-${++nEmp}`, presentacion_id: pid, insumo_id: insumo, cantidad, condicion });
  });
}
const E_CAJA1 = ['i-caja1', [['i-bolsa-g', 1], ['i-plancha', 1], ['i-sep', 3]]];
const E_CAJA1_CONO = ['i-caja1', [['i-bolsa-g', 2], ['i-plancha', 1], ['i-sep', 3]]];
const E_MEDIA = ['i-caja3', [['i-bolsa-m', 1], ['i-sep', 2]]];
const E_CAJA2 = ['i-caja2', [['i-bolsa-g', 1], ['i-plancha', 1], ['i-sep', 2]]];

producto('u-n', 'p-mini', 'Cucuruchón Mini', 'Común', 'cucuruchones', 1, [
  ['Caja sin cono', false, 320, E_CAJA1],
  ['Caja con cono', true, 320, E_CAJA1_CONO],
  ['Media caja', false, 160, E_MEDIA],
  ['Caja Caserato', true, 300, null],
  ['Caja exportación', false, 288, ['i-caja-exp', [['i-bolsa-g', 2], ['i-plancha', 2], ['i-sep', 4]]], false],
]);
producto('u-n', 'p-chico', 'Cucuruchón Chico', 'Común', 'cucuruchones', 2, [
  ['Caja sin cono', false, 240, E_CAJA1], ['Caja con cono', true, 240, E_CAJA1_CONO], ['Media caja', false, 120, E_MEDIA],
]);
producto('u-n', 'p-grande', 'Cucuruchón Grande', 'Común', 'cucuruchones', 3, [
  ['Caja sin cono', false, 150, E_CAJA2],
  ['Caja con cono', true, 150, ['i-caja2', [['i-bolsa-g', 2], ['i-plancha', 1], ['i-sep', 2]]]],
  ['Media caja', false, 75, ['i-caja3', [['i-bolsa-m', 1], ['i-sep', 1]]]],
  ['Caja Caserato', true, 150, ['i-caja-cas', [['i-bolsa-g', 2], ['i-plancha', 1], ['i-sep', 2]]]],
  ['Caja Duomo', true, 150, ['i-caja-duo', [['i-bolsa-g', 2], ['i-plancha', 1], ['i-sep', 2]]]],
  ['Caja ×100', false, 100, ['i-caja3', [['i-bolsa-g', 1], ['i-sep', 1]]]],
  ['Bolsón granel', false, 500, [null, [['i-consorcio', 1], ['i-precinto', 1]]]],
]);
producto('u-n', 'p-standard', 'Cucuruchón Standard', 'Común', 'cucuruchones', 4, [
  ['Caja sin cono', false, 200, E_CAJA2], ['Caja con cono', true, 200, E_CAJA2], ['Media caja', false, 100, E_MEDIA],
]);
producto('u-n', 'p-mini-ch', 'Mini Chocolate', 'Chocolate', 'cucuruchones', 5, [['Caja sin cono', false, 320, E_CAJA1], ['Caja con cono', true, 320, E_CAJA1_CONO]]);
producto('u-n', 'p-chico-ch', 'Chico Chocolate', 'Chocolate', 'cucuruchones', 6, [['Caja sin cono', false, 240, E_CAJA1], ['Caja con cono', true, 240, E_CAJA1_CONO]]);
producto('u-n', 'p-std-ch', 'Standard Chocolate', 'Chocolate', 'cucuruchones', 7, [['Caja sin cono', false, 200, E_CAJA2]]);
producto('u-n', 'p-grande-ch', 'Grande Chocolate', 'Chocolate', 'cucuruchones', 8, [['Caja sin cono', false, 150, E_CAJA2]], false);

// Dolce Pasta (7a y 7b): barquillos y especiales.
const D_CAJA = ['i-caja-d2', [['i-bolsa-g', 1], ['i-sep', 2]]];
const D_MEDIA = ['i-caja-d3', [['i-bolsa-m', 1]]];
producto('u-d', 'd-b35-4', 'Barquillo 35 · de 4', 'Común', 'barquillos', 1, [['Caja', false, 240, D_CAJA], ['Media caja', false, 120, D_MEDIA]]);
producto('u-d', 'd-b40-4', 'Barquillo 40 · de 4', 'Común', 'barquillos', 2, [['Caja', false, 240, D_CAJA], ['Media caja', false, 120, D_MEDIA], ['Caja Duomo', false, 240, null]]);
producto('u-d', 'd-b45-4', 'Barquillo 45 · de 4', 'Común', 'barquillos', 3, [['Caja', false, 240, D_CAJA], ['Media caja', false, 120, D_MEDIA]]);
producto('u-d', 'd-b35-3', 'Barquillo 35 · de 3', 'Común', 'barquillos', 4, [['Caja', false, 180, D_CAJA]]);
producto('u-d', 'd-b40-3', 'Barquillo 40 · de 3', 'Común', 'barquillos', 5, [['Caja', false, 180, D_CAJA]]);
producto('u-d', 'd-b45-3', 'Barquillo 45 · de 3', 'Común', 'barquillos', 6, [['Caja', false, 180, D_CAJA]], false);
producto('u-d', 'd-soft', 'Soft', 'Común', 'especiales', 7, [['Caja', false, 200, D_CAJA], ['Media caja', false, 100, D_MEDIA]]);
producto('u-d', 'd-cubanon', 'Cubanón', 'Chocolate', 'especiales', 8, [['Caja', false, 150, D_CAJA]]);
producto('u-d', 'd-canoli', 'Canoli', 'Común', 'especiales', 9, [['Caja', false, 120, D_CAJA]]);
producto('u-d', 'd-capelina', 'Capelina', 'Común', 'especiales', 10, [['Caja', false, 100, D_CAJA]]);
producto('u-d', 'd-obleas', 'Obleas', 'Común', 'especiales', 11, [['Caja', false, 400, D_CAJA], ['Media caja', false, 200, D_MEDIA]]);
producto('u-d', 'd-vaso', 'Vaso 125', 'Común', 'especiales', 12, [['Caja', false, 500, D_CAJA]]);

// ── Máquinas, ingredientes y recetas ────────────────────────────────────
const MAQUINAS = [
  { id: 'maq-1', unidad_negocio_id: 'u-n', nombre: 'Máquina 1', activa: true, orden: 1 },
  { id: 'maq-2', unidad_negocio_id: 'u-n', nombre: 'Máquina 2', activa: true, orden: 2 },
  { id: 'maq-3', unidad_negocio_id: 'u-n', nombre: 'Máquina 3', activa: true, orden: 3 },
  { id: 'maq-4', unidad_negocio_id: 'u-n', nombre: 'Máquina 4', activa: true, orden: 4 },
  { id: 'maq-5', unidad_negocio_id: 'u-n', nombre: 'Máquina 5', activa: false, orden: 5 },
];
const ING = [
  ['g-harina', 'Harina', true], ['g-azucar', 'Azúcar', true], ['g-grasa', 'Grasa', true], ['g-lecitina', 'Lecitina', true],
  ['g-cacao', 'Cacao', true], ['g-colorante', 'Colorante', true], ['g-fecula', 'Fécula', true], ['g-bicarbonato', 'Bicarbonato', true],
  ['g-agua', 'Agua', false],
];
const INGREDIENTES = ING.map(([id, nombre, descuenta], i) => ({ id, nombre, descuenta_stock: descuenta, orden: i + 1, activo: true }));
const RELACIONES = [
  ['g-harina', 'i-h-jup'], ['g-harina', 'i-h-cha'], ['g-harina', 'i-h-cla'], ['g-harina', 'i-h-wal'],
  ['g-azucar', 'i-az-led'], ['g-azucar', 'i-az-cha'], ['g-lecitina', 'i-lec'], ['g-cacao', 'i-cac-1'], ['g-cacao', 'i-cac-2'],
  ['g-bicarbonato', 'i-bic'],
].map(([ingrediente_id, insumo_id]) => ({ ingrediente_id, insumo_id }));

// Las cantidades de la Máquina 1 por versión (el RECIPE del diseño).
const V = {
  1: { 'g-harina': 25, 'g-azucar': 11.5, 'g-grasa': 2.4, 'g-lecitina': 0.25, 'g-colorante': 0.03, 'g-fecula': 1.2, 'g-bicarbonato': 0.08, 'g-agua': 37.5 },
  2: { 'g-harina': 25, 'g-azucar': 12, 'g-grasa': 2, 'g-lecitina': 0.25, 'g-colorante': 0.03, 'g-fecula': 1.2, 'g-bicarbonato': 0.08, 'g-agua': 37.5 },
  3: { 'g-harina': 25, 'g-azucar': 12.5, 'g-grasa': 2, 'g-lecitina': 0.25, 'g-colorante': 0.03, 'g-fecula': 1.5, 'g-bicarbonato': 0.08, 'g-agua': 38 },
};
const RECETAS = [];
const ITEMS = [];
function receta(maquina, version, dia, quien, nota, cantidades) {
  const id = `r-${maquina}-${version}`;
  // El orden de las versiones lo da la columna version (la maqueta no ordena):
  // van de la más nueva a la más vieja, como las pide la pantalla.
  RECETAS.push({ id, maquina_id: maquina, tipo_masa: 'Común', version, nota, creada_por: quien, created_at: hora(dia, '10:00') });
  for (const [ingrediente_id, cantidad_kg] of Object.entries(cantidades)) ITEMS.push({ receta_id: id, ingrediente_id, cantidad_kg, insumo_preferido_id: null });
}
receta('maq-1', 3, '2026-08-14', EMP, 'La masa salía seca con la harina nueva', V[3]);
receta('maq-1', 2, '2026-06-02', 'emp-pablo', 'Menos grasa, más azúcar', V[2]);
receta('maq-1', 1, '2026-01-10', EMP, 'Primera versión', V[1]);
receta('maq-2', 2, '2026-05-20', EMP, 'Ajuste de azúcar', V[3]);
receta('maq-2', 1, '2026-01-10', EMP, 'Primera versión', V[2]);
receta('maq-3', 4, '2026-09-01', EMP, 'Menos grasa', { ...V[3], 'g-harina': 24, 'g-grasa': 1.8 });
receta('maq-3', 3, '2026-07-01', EMP, 'Ajuste', V[3]);
receta('maq-3', 2, '2026-04-01', EMP, 'Ajuste', V[2]);
receta('maq-3', 1, '2026-01-10', EMP, 'Primera versión', V[1]);
receta('maq-4', 1, '2026-01-10', EMP, 'Primera versión', V[3]);
receta('maq-5', 1, '2026-01-10', EMP, 'Primera versión', V[3]);

// ── Conos ───────────────────────────────────────────────────────────────
const cono = (id, nombre, activa, estado_alta, doble_bolsa, creada_por = null, creada_en = null) => ({ id, nombre, activa, estado_alta, creada_por, creada_en, doble_bolsa });
const MARCAS = [
  cono('m-cas-mini', 'Caserato · Mini con logo', false, 'pendiente_revision', true, 'emp-agustin', hora('2026-09-28', '10:42')),
  cono('m-cas-grande', 'Caserato · Grande impreso', true, 'aprobada', true),
  cono('m-cas-chico', 'Caserato · Chico impreso', true, 'aprobada', false),
  cono('m-cas-std', 'Caserato · Standard 2019', false, 'aprobada', false),
  cono('m-fabbri', 'Casa Fabbri · Mini', false, 'aprobada', false),
  cono('m-cascabel', 'Cascabel · Grande', false, 'rechazada', false),
  cono('m-duomo-bic', 'Duomo · Grande bicolor', false, 'pendiente_revision', false, 'emp-diego', hora('2026-09-27', '16:05')),
  cono('m-duomo', 'Duomo · Mini', true, 'aprobada', false),
  cono('m-grido', 'Grido · Mini', true, 'aprobada', false),
  cono('m-lolo', 'Lolo · Chico', true, 'aprobada', true),
  cono('m-frida', 'Frida · Standard', false, 'aprobada', false),
];

// ── Personal y PINes ────────────────────────────────────────────────────
const persona = (id, nombre, puestos, pin) => ({ id, nombre, misma_unidad: true, puestos, puestos_temporales: [],
  tiene_pin: pin !== 'Sin PIN', pin_temporal: false, debe_cambiar_pin: pin === 'Por cambiar', es_maestro: false });
const PERSONAL = [
  persona(EMP, 'Facundo Usabarrena', ['encargado'], 'PIN propio'),
  persona('emp-agustin', 'Agustín Barrera', ['masero', 'operario'], 'PIN propio'),
  persona('emp-marcela', 'Marcela Ríos', ['encargado', 'masero'], 'PIN propio'),
  persona('emp-diego', 'Diego Sosa', ['operario'], 'PIN propio'),
  persona('emp-lucas', 'Lucas Medina', ['operario'], 'Por cambiar'),
  persona('emp-brenda', 'Brenda Quiroga', ['operario'], 'PIN propio'),
  persona('emp-nahuel', 'Nahuel Correa', ['masero', 'operario'], 'Sin PIN'),
  persona('emp-sergio', 'Sergio Paz', ['operario'], 'PIN propio'),
  persona('emp-romina', 'Romina Vera', ['operario'], 'Por cambiar'),
  persona('emp-ivan', 'Iván Molina', ['operario'], 'Sin PIN'),
  persona('emp-tomas', 'Tomás Luna', ['masero', 'operario'], 'PIN propio'),
  persona('emp-julieta', 'Julieta Paredes', ['encargado'], 'PIN propio'),
];

module.exports = {
  uid: UID,
  ahora: hora('2026-09-28', '12:42'),
  tablas: {
    empleados: [{ id: EMP, auth_user_id: UID, nombre: 'Facundo Usabarrena', rol_app: 'usuario', activo: true, unidad_negocio_id: 'u-n', es_prueba: false, es_dispositivo: false }],
    empleado_modulos: ['produccion', 'cobranzas', 'caja', 'gastos', 'materia-prima', 'stock', 'pedidos']
      .map(modulo => ({ empleado_id: EMP, modulo, habilitado: true })),
    empleado_tareas: [
      tarea(EMP, 'produccion', 'ver', { todas: true }),
      tarea(EMP, 'produccion', 'configurar', { todas: true }),
      tarea(EMP, 'stock', 'ver', { todas: true }),
    ],
    unidades_negocio: UNIDADES_4.map(u => ({ ...u, caja_predeterminada_id: u.id === 'u-n' ? 'i-caja1' : null })),
    v_empleados_publico: [
      { id: EMP, nombre: 'Facundo Usabarrena', unidad_negocio_id: 'u-n', tipo: 'naaloo', activo: true },
      { id: 'emp-pablo', nombre: 'Pablo Nuss', unidad_negocio_id: 'u-n', tipo: 'naaloo', activo: true },
      { id: 'emp-agustin', nombre: 'Agustín Barrera', unidad_negocio_id: 'u-n', tipo: 'naaloo', activo: true },
      { id: 'emp-diego', nombre: 'Diego Sosa', unidad_negocio_id: 'u-n', tipo: 'naaloo', activo: true },
    ],
    maquinas: MAQUINAS,
    ingredientes: INGREDIENTES,
    ingrediente_insumos: RELACIONES,
    insumos: INSUMOS,
    recetas: RECETAS,
    receta_items: ITEMS,
    productos_terminados: PRODUCTOS,
    producto_presentaciones: PRESENTACIONES,
    presentacion_cajas: CAJAS,
    presentacion_empaque: EMPAQUE,
    marcas_personalizadas: MARCAS,
    puestos_temporales: [],
    v_stock_insumos: [
      ['i-h-jup', 2450], ['i-h-cha', 1200], ['i-h-cla', 600], ['i-gr-vac', 180], ['i-gr-veg', 64], ['i-marg', 20],
    ].map(([insumo_id, cantidad_total]) => ({ unidad_negocio_id: 'u-n', insumo_id, cantidad_total, unidad_medida: 'kg' })),
    v_stock_por_lote: [
      ['i-h-jup', '7033', '2026-09-22'], ['i-h-cha', '7031', '2026-09-15'], ['i-h-cla', '7029', '2026-09-02'], ['i-h-wal', '7018', '2026-07-11'],
    ].map(([insumo_id, lote, desde]) => ({ unidad_negocio_id: 'u-n', insumo_id, lote, desde, saldo: 1 })),
  },
  rpc: {
    mi_sesion_produccion: { empleado_id: EMP, nombre: 'Facundo Usabarrena', es_dispositivo: false, unidad_negocio_id: 'u-n' },
    mis_pendientes: [{ modulo: 'produccion', clave: 'conos_por_revisar', cantidad: 2, texto: 'Conos nuevos por revisar' }],
    personal_produccion: PERSONAL,
  },
};
