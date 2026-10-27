// Datos de la maqueta: la HOJA NUEVA de la orden (26/10/2026: CANT. |
// PRODUCTO | DESCRIPCIÓN | TOTAL | LOTE). Ver pruebas/datos-maqueta/README.md.
// Parte de los de la Carga (retiros.js) SIN cambiarlos y suma, en "Mis
// retiros", tres órdenes para mirar la hoja:
//  - N-0031 (RODRIGO ARRASCAETA, solo insumos) y N-0032 (FERNANDEZ RICARDO,
//    42 cajas de Cucuruchón Grande), como están en la base (leídas el
//    26/10/2026; los lotes de la N-0032, de ejemplo);
//  - N-0099, con todos los casos del pedido: Cucuruchón Grande ×240 en dos
//    lotes, ×224 con cono DUOMO, Mini ×160 (media caja), Chico ×128, Harina
//    Wali en dos lotes, Colorante Nico bidón de 25 kg y Caja media altura sin
//    impresión por unidad.
// Los insumos van en la tabla `insumos` con su bulto (vista, contenido y
// nombre_bulto) para que la hoja diga "bolsa de 25 kg".
//
//   http://localhost:4180/modulos/retiros.html?maqueta=retiros-hoja-nueva
'use strict';

const base = JSON.parse(JSON.stringify(require('./retiros')));
const t = base.tablas;

const insumo = (id, nombre, marca, unidad_medida, contenido_bulto, nombre_bulto, categoria = 'Materia prima') => ({
  id, nombre, marca, categoria, unidad_medida, activo: true,
  vista_preferida: contenido_bulto ? 'bulto' : 'base', contenido_bulto, nombre_bulto,
});
t.insumos.push(
  insumo('i-azucar', 'Azúcar', null, 'kg', 50, 'bolsa'),
  insumo('i-har-jup', 'Harina 000', 'Júpiter', 'kg', 25, 'bolsa'),
  insumo('i-har-wali', 'Harina 000', 'Wali', 'kg', 25, 'bolsa'),
  insumo('i-oleo', 'Óleo margarina', 'Cordobesa', 'kg', 20, 'caja'),
  insumo('i-caja-cap', 'Caja capelina', 'Sin impresión', 'un', null, null, 'Cajas'),
  insumo('i-bolsa', 'Bolsa 100x80', null, 'un', null, null, 'Bolsas'),
  insumo('i-colorante', 'Colorante', 'Nico', 'kg', 25, 'bidón'),
  insumo('i-caja-ma', 'Caja media altura', 'Sin impresión', 'un', null, null, 'Cajas'),
);

const rIns = (orden, insumo_id, insumoNombre, marca_insumo, cantidad, unidad_medida, lotes = []) =>
  ({ orden, tipo: 'insumo', insumo_id, insumo: insumoNombre, marca_insumo, cantidad, unidad_medida, movimiento: 'retiro', item_id: `it-${insumo_id}-${orden}`, lotes });
const rPt = (orden, producto, presentacion, marca, cajas, porCaja, lotes = []) =>
  ({ orden, tipo: 'producto', producto, presentacion, marca, cajas, unidades: cajas * porCaja, movimiento: 'retiro', item_id: `it-pt-${orden}`, lotes });

const N0031 = {
  orden_id: 'o-n31', codigo: 'N-0031', fecha: '2026-10-26', estado: 'confirmada', cliente: 'RODRIGO ARRASCAETA', transporte: null, observaciones: null,
  cargada_en: '2026-10-26T12:30:00Z',
  renglones: [
    rIns(1, 'i-azucar', 'Azúcar', null, 150, 'kg'),
    rIns(2, 'i-har-jup', 'Harina 000', 'Júpiter', 250, 'kg'),
    rIns(3, 'i-har-wali', 'Harina 000', 'Wali', 125, 'kg'),
    rIns(4, 'i-oleo', 'Óleo margarina', 'Cordobesa', 40, 'kg'),
    rIns(5, 'i-caja-cap', 'Caja capelina', 'Sin impresión', 80, 'un'),
    rIns(6, 'i-bolsa', 'Bolsa 100x80', null, 80, 'un'),
  ],
};
const N0032 = {
  orden_id: 'o-n32', codigo: 'N-0032', fecha: '2026-10-26', estado: 'confirmada', cliente: 'FERNANDEZ RICARDO', transporte: null, observaciones: null,
  cargada_en: '2026-10-26T13:00:00Z',
  renglones: [rPt(1, 'Cucuruchón Grande', 'Caja sin cono', null, 42, 240, [{ lote: '6262-1', cajas: 30 }, { lote: '6263-2', cajas: 12 }])],
};
const N0099 = {
  orden_id: 'o-n99', codigo: 'N-0099', fecha: '2026-10-26', estado: 'confirmada', cliente: 'Distribuidora Anatolia', transporte: 'Expreso Norte', observaciones: 'Todos los casos de la hoja nueva.',
  cargada_en: '2026-10-26T15:00:00Z',
  renglones: [
    rPt(1, 'Cucuruchón Grande', 'Caja sin cono', null, 42, 240, [{ lote: '6262-1', cajas: 30 }, { lote: '6263-2', cajas: 12 }]),
    rPt(2, 'Cucuruchón Grande', 'Caja con cono', 'DUOMO', 5, 224, [{ lote: '6270', cajas: 5 }]),
    rPt(3, 'Cucuruchón Mini', 'Media caja', null, 3, 160, [{ lote: '6271', cajas: 3 }]),
    rPt(4, 'Cucuruchón Chico', 'Caja N°2 media altura doble bolsa', null, 10, 128, [{ lote: '6250', cajas: 10 }]),
    rIns(5, 'i-har-wali', 'Harina 000', 'Wali', 125, 'kg', [{ lote: 'W-0910', cantidad: 75 }, { lote: 'W-0915', cantidad: 50 }]),
    rIns(6, 'i-colorante', 'Colorante', 'Nico', 25, 'kg', [{ lote: 'C-77', cantidad: 25 }]),
    rIns(7, 'i-caja-ma', 'Caja media altura', 'Sin impresión', 80, 'un'),
  ],
};
base.rpc.mis_ordenes_retiro = [N0099, N0032, N0031, ...base.rpc.mis_ordenes_retiro];

module.exports = base;
