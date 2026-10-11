// Datos de la maqueta: el DETALLE DE UNA PLANILLA de la gestión de Producción
// (Planillas → tocar el lote 7021), para mirarlo en el celular (10/10/2026,
// e2e/31-vistas-faltantes.spec.js). Ver pruebas/datos-maqueta/README.md.
//
// Parte de produccion-gestion.js SIN cambiarlo (lo usan otras pruebas) y le
// suma lo que el detalle lee del turno 7021 (t1): operarios (uno que se fue a
// mitad de turno), masas (una modificada, una de chocolate, una anulada y una
// tirada) con sus ingredientes, dos paradas (una que no volvió), lo producido
// (con cono, sin cono, una corrección y un sublote anulado), el empaque que se
// descontó (con stock:ver) y unas observaciones largas. La planilla es del
// 25/09/2026: la prueba fija el reloj en septiembre para que "Planillas" la
// muestre.
//
//   http://localhost:4180/modulos/produccion-gestion.html?maqueta=celular-planilla
'use strict';

const base = JSON.parse(JSON.stringify(require('./produccion-gestion')));
const t = base.tablas;
const T = 't1';
const hora = (hhmm) => `2026-09-25T${String(Number(hhmm.slice(0, 2)) + 3).padStart(2, '0')}:${hhmm.slice(3)}:00+00:00`;

// Ve también el stock de Nuss: así el detalle muestra el empaque consumido.
t.empleado_tareas.push({ empleado_id: 'emp-1', modulo: 'stock', tarea: 'ver', alcance: { todas: true }, habilitado: true });

t.v_empleados_publico.push(
  { id: 'emp-3', nombre: 'Agustín Barrera', unidad_negocio_id: 'u-n', tipo: 'naaloo', activo: true },
  { id: 'emp-4', nombre: 'María de los Ángeles Fernández Etchegaray', unidad_negocio_id: 'u-n', tipo: 'naaloo', activo: true },
  { id: 'emp-5', nombre: 'Juan Cruz', unidad_negocio_id: 'u-n', tipo: 'naaloo', activo: true },
);

Object.assign(t.turnos_produccion[0], {
  hora_fin: '15:00', hora_largada: '06:40',
  observaciones: 'Se cortó la cinta dos veces antes del mediodía; el mecánico la cambió y quedó andando. Faltó una bolsa de azúcar de la marca de siempre: se usó la de Ledesma.',
});

t.turno_operarios = [
  { turno_id: T, empleado_id: 'emp-4', desde: hora('06:00'), hasta: null },
  { turno_id: T, empleado_id: 'emp-5', desde: hora('06:00'), hasta: hora('10:30') },
];

t.ingredientes = [
  { id: 'g-harina', nombre: 'Harina', orden: 1 },
  { id: 'g-azucar', nombre: 'Azúcar', orden: 2 },
  { id: 'g-grasa', nombre: 'Grasa', orden: 3 },
  { id: 'g-cacao', nombre: 'Cacao', orden: 4 },
];
t.insumos = [
  { id: 'i-harina', nombre: 'Harina 000', marca: 'Júpiter' },
  { id: 'i-azucar', nombre: 'Azúcar común tipo A', marca: 'Ledesma' },
  { id: 'i-grasa', nombre: 'Grasa vegetal', marca: 'Dánica' },
  { id: 'i-caja', nombre: 'Caja N°1', marca: 'Nuss' },
  { id: 'i-tiras', nombre: 'Tiras x4', marca: null },
  { id: 'i-bolsa', nombre: 'Bolsa 100x80', marca: null },
];
t.recetas = [{ id: 'rec-1', maquina_id: 'maq-1', tipo_masa: 'Común', version: 3 }];
t.receta_items = [
  { receta_id: 'rec-1', ingrediente_id: 'g-harina', cantidad_kg: 25 },
  { receta_id: 'rec-1', ingrediente_id: 'g-azucar', cantidad_kg: 12 },
  { receta_id: 'rec-1', ingrediente_id: 'g-grasa', cantidad_kg: 3 },
  { receta_id: 'rec-1', ingrediente_id: 'g-cacao', cantidad_kg: 0 },
];
const masa = (id, nro, hh, extra = {}) => ({
  id, turno_id: T, nro, hora: hora(hh), tipo_masa: 'Común', doble: false, origen: 'original', receta_id: 'rec-1', masero_id: 'emp-3',
  anulada: false, anulada_motivo: null, descartada: false, descarte_motivo: null, es_chocolate: false, ...extra,
});
t.masas = [
  masa('ma-1', 1, '06:20', { doble: true }),
  masa('ma-2', 2, '08:05', { origen: 'modificada' }),
  masa('ma-3', 3, '09:40', { es_chocolate: true, origen: 'modificada' }),
  masa('ma-4', 4, '11:15', { anulada: true, anulada_motivo: 'Se cargó dos veces por error' }),
  masa('ma-5', 5, '12:50', { descartada: true, descarte_motivo: 'Se pasó de punto y quedó dura, no sirvió para la máquina' }),
];
const item = (masa_id, ingrediente_id, insumo_id, lote, simple, doble = false, extra = {}) => ({
  masa_id, ingrediente_id, ingrediente_libre: null, insumo_id, lote, lote_fuera_de_stock: false,
  cantidad_simple_kg: simple, cantidad_kg: doble ? simple * 2 : simple, ...extra,
});
t.masa_items = [
  item('ma-1', 'g-harina', 'i-harina', 'H-0910-2026-LOTE-LARGO', 25, true), item('ma-1', 'g-azucar', 'i-azucar', 'AZ-77', 12, true), item('ma-1', 'g-grasa', 'i-grasa', 'GR-3', 3, true),
  item('ma-2', 'g-harina', 'i-harina', 'H-0910-2026-LOTE-LARGO', 25), item('ma-2', 'g-azucar', 'i-azucar', 'AZ-78', 13.5, false, { lote_fuera_de_stock: true }), item('ma-2', 'g-grasa', 'i-grasa', 'GR-3', 3),
  item('ma-3', 'g-harina', 'i-harina', 'H-0910-2026-LOTE-LARGO', 25), item('ma-3', 'g-azucar', 'i-azucar', 'AZ-78', 12), item('ma-3', 'g-grasa', 'i-grasa', 'GR-3', 3),
  item('ma-3', 'g-cacao', null, null, 0.65), { masa_id: 'ma-3', ingrediente_id: null, ingrediente_libre: 'Esencia de vainilla', insumo_id: null, lote: null, lote_fuera_de_stock: false, cantidad_simple_kg: 0.05, cantidad_kg: 0.05 },
  item('ma-4', 'g-harina', 'i-harina', 'H-0910-2026-LOTE-LARGO', 25), item('ma-4', 'g-azucar', 'i-azucar', 'AZ-78', 12),
  item('ma-5', 'g-harina', 'i-harina', 'H-0910-2026-LOTE-LARGO', 25), item('ma-5', 'g-azucar', 'i-azucar', 'AZ-78', 12),
];

t.paradas_produccion.push(
  { id: 'pa-1', turno_id: T, inicio: hora('09:10'), fin: hora('09:55'), motivo: 'Corte de cadena · el mecánico la cambió y la tensó', hasta_fin_de_turno: false },
  { id: 'pa-2', turno_id: T, inicio: hora('13:30'), fin: hora('15:00'), motivo: 'Se retiró personal · cierre anticipado', hasta_fin_de_turno: true },
);

// Presentaciones con cono (la de la maqueta base son sin cono).
t.producto_presentaciones.push(
  { id: 'pr1c', producto_id: 'p1', nombre: 'Caja con cono x 320', con_cono: true, media_caja: false, empaque: null, unidades_por_caja: 320, activa: true, orden: 2 },
  { id: 'pr1m', producto_id: 'p1', nombre: 'Media caja con cono x 160', con_cono: true, media_caja: true, empaque: null, unidades_por_caja: 160, activa: true, orden: 3 },
);
t.marcas_personalizadas.push({ id: 'm3', nombre: 'HELADERÍA LOS ÁNGELES DE SAN FRANCISCO', activa: true, estado_alta: 'aprobada', creada_por: null, creada_en: null, doble_bolsa: true });
const pi = (id, orden, presentacion_id, marca_id, cajas, upc, extra = {}) => ({
  id, turno_id: T, orden, sublote: `7021-${orden}`, presentacion_id, marca_id, cajas, unidades_por_caja: upc, unidades: cajas * upc,
  anulado: false, caja_insumo_id: 'i-caja', embolsado: 'grande', ...extra,
});
t.produccion_items = [
  pi('pi-1', 1, 'pr1', null, 40, 600),
  pi('pi-2', 2, 'pr1c', 'm1', 25, 320, { embolsado: 'individual' }),
  pi('pi-3', 3, 'pr1m', 'm3', 12, 160, { embolsado: 'doble' }),
  pi('pi-4', 4, 'pr1c', 'm1', 6, 320, { anulado: true }),
  pi('pi-5', 5, 'pr1', null, 3, 600, { caja_insumo_id: null, embolsado: 'ninguno' }),
];
t.produccion_correcciones = [
  { produccion_item_id: 'pi-1', tipo: 'correccion', cajas_antes: 42, cajas_despues: 40, motivo: 'Se contaron mal las cajas del pallet de la esquina', hecha_por: 'emp-2', hecha_en: hora('14:20') },
  { produccion_item_id: 'pi-4', tipo: 'anulacion', cajas_antes: 6, cajas_despues: 0, motivo: 'Cargado en la máquina equivocada', hecha_por: 'emp-2', hecha_en: hora('14:25') },
];
t.stock_movimientos = [
  { insumo_id: 'i-caja', cantidad: -42, produccion_item_id: 'pi-1' }, { insumo_id: 'i-caja', cantidad: 2, produccion_item_id: 'pi-1' },
  { insumo_id: 'i-tiras', cantidad: -40, produccion_item_id: 'pi-1' }, { insumo_id: 'i-bolsa', cantidad: -40, produccion_item_id: 'pi-1' },
  { insumo_id: 'i-caja', cantidad: -25, produccion_item_id: 'pi-2' }, { insumo_id: 'i-caja', cantidad: -12, produccion_item_id: 'pi-3' },
  { insumo_id: 'i-caja', cantidad: -6, produccion_item_id: 'pi-4' }, { insumo_id: 'i-caja', cantidad: 6, produccion_item_id: 'pi-4' },
];

module.exports = base;
