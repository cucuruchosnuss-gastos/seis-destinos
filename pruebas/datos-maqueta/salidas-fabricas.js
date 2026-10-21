// Datos de la maqueta: Salidas entre fábricas (21/10/2026). Ver
// pruebas/datos-maqueta/README.md. Parte de los datos de la gestión de
// Producción (produccion-gestion.js) SIN cambiarlos y les suma Mengui como
// fábrica y la vista v_salidas_entre_fabricas con lo que Mengui le mandó a
// Dolce Pasta y a Nuss en octubre (y una de septiembre, que con el mes
// actual de entrada no se ve), más una de Dolce Pasta a Nuss. Los textos
// son largos a propósito: a 360 px no tienen que salirse de su recuadro.
//
//   http://localhost:4180/modulos/produccion-gestion.html?vista=stock&maqueta=salidas-fabricas
'use strict';

const base = JSON.parse(JSON.stringify(require('./produccion-gestion')));
const t = base.tablas;

t.unidades_negocio.push({ id: 'u-m', nombre: 'Mengui', prefijo: 'O', logo_url: null, activo: true, es_prueba: false });

const S = (id, fecha, origen, destino, producto, presentacion, marca, lote, cajas, unidades, remito, motivo = null) => ({
  id, fecha, created_at: `${fecha}T15:00:00Z`,
  unidad_origen_id: origen[0], origen: origen[1], destino_id: destino[0], destino: destino[1],
  producto, presentacion, marca, lote, cajas, unidades, remito, ingreso_id: `ing-${id}`, motivo,
});
const MENGUI = ['u-m', 'Mengui'], DOLCE = ['u-d', 'Dolce Pasta'], NUSS = ['u-n', 'Cucuruchos Nuss'];

// Lo más nuevo primero (la maqueta no ordena).
t.v_salidas_entre_fabricas = [
  S('s1', '2026-10-20', MENGUI, DOLCE, 'Cucurucho Mini', 'Caja x 600 con cono', 'HELADERÍA LA AMERICANA DEL CENTRO', 'M-2026-10-20-A', 10, 6000, 'R-0001-00001234'),
  S('s2', '2026-10-18', MENGUI, NUSS, 'Cucurucho Mini', 'Caja x 600', null, 'M-2026-10-18', 4, 2400, null),
  S('s3', '2026-10-05', MENGUI, DOLCE, 'Barquillo', 'Caja x 100', null, 'B-1', 3, 300, 'R-0001-00001190', 'Pedido de Dolce'),
  S('s4', '2026-09-28', MENGUI, DOLCE, 'Barquillo', 'Caja x 100', null, 'B-0', 9, 900, 'R-0001-00001100'),
  S('s5', '2026-10-10', DOLCE, NUSS, 'Cono dulce', 'Caja x 100', null, 'D-5', 2, 200, null),
];

module.exports = base;
