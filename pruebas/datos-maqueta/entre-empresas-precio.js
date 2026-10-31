// Datos de la maqueta: Administración → Entre empresas, "Poner precio"
// (31/10/2026, arreglos de la auditoría, punto 7). Ver
// pruebas/datos-maqueta/README.md. Parte de entre-empresas-v2.js SIN
// cambiarlo y suma, con la forma de la base del 30/10/2026: un traspaso de
// producto terminado de Nuss a Dolce sin precio (dos renglones), la
// transferencia de insumos de Nuss a Dolce sin precio (con_precio false) y
// una valorización ya hecha de un ingreso de Mengui a Nuss ('otro' con
// referencia_tipo 'traspaso_terminado_precio'), más las respuestas de
// movimiento_para_valorizar (por tipo y id) y
// valorizar_movimiento_entre_empresas.
//
//   http://localhost:4180/modulos/administracion.html?maqueta=entre-empresas-precio&seccion=entre
'use strict';

const base = JSON.parse(JSON.stringify(require('./entre-empresas-v2')));

const F = (o) => ({ fecha: '2026-10-15', tipo: 'otro', de_unidad_id: null, de_unidad: null, a_unidad_id: null, a_unidad: null, detalle: '', moneda: null,
  importe: null, cantidad: null, unidad_medida: null, presentacion_id: null, insumo_id: null, referencia_tipo: null, referencia_id: null,
  marca_id: null, con_precio: null, ...o });
const DE = { n: { de_unidad_id: 'u-n', de_unidad: 'Cucuruchos Nuss' }, o: { de_unidad_id: 'u-o', de_unidad: 'Mengui' } };
const A = { n: { a_unidad_id: 'u-n', a_unidad: 'Cucuruchos Nuss' }, d: { a_unidad_id: 'u-d', a_unidad: 'Dolce Pasta' } };

// La transferencia de insumos: hoy la base la trae con con_precio false.
for (const f of base.rpc.movimientos_entre_empresas) if (f.tipo === 'insumos') f.con_precio = false;
base.rpc.movimientos_entre_empresas.push(
  F({ tipo: 'mercaderia', fecha: '2026-10-27', ...DE.n, ...A.d, detalle: 'Capelina Grande · Caja · lote 1201', cantidad: '10', unidad_medida: 'cajas', presentacion_id: 'pr-a', referencia_tipo: 'traspaso_terminado', referencia_id: 'tt-1', con_precio: false }),
  F({ tipo: 'mercaderia', fecha: '2026-10-27', ...DE.n, ...A.d, detalle: 'Cucuruchón Chico · Caja sin cono · lote 1202', cantidad: '5', unidad_medida: 'cajas', presentacion_id: 'pr-b', referencia_tipo: 'traspaso_terminado', referencia_id: 'tt-1', con_precio: false }),
  // Ya valorizado: el ingreso de Mengui a Nuss del 12/10 (su mercadería es de antes del período del saldo de la maqueta: solo queda la deuda).
  F({ tipo: 'otro', fecha: '2026-10-12', ...DE.o, ...A.n, detalle: 'Valorización Ingreso del 12/10/2026', moneda: 'ARS', importe: '50000.00', referencia_tipo: 'traspaso_terminado_precio', referencia_id: 'ie-7' }),
);
base.rpc.movimientos_entre_empresas.sort((x, y) => String(y.fecha).localeCompare(String(x.fecha)));

const NO = 'ERROR:No encontré ese movimiento entre dos empresas distintas.';
base.rpc.movimiento_para_valorizar = { __segun: [
  { si: { p_referencia_tipo: 'traspaso_terminado', p_referencia_id: 'tt-1' }, r: {
    referencia_tipo: 'traspaso_terminado', referencia_id: 'tt-1', fecha: '2026-10-27', acreedora_id: 'u-n', acreedora: 'Cucuruchos Nuss',
    deudora_id: 'u-d', deudora: 'Dolce Pasta', lista_interna: { id: 'li-nd', nombre: 'Nuss → Dolce Pasta (interna)' }, valorizado: null,
    items: [
      { clave: 'pr-a:', presentacion_id: 'pr-a', marca_id: null, insumo_id: null, detalle: 'Capelina Grande · Caja', cantidad: 10, unidad: 'cajas', precio_sugerido: 7000, fuente: 'lista_interna' },
      { clave: 'pr-b:', presentacion_id: 'pr-b', marca_id: null, insumo_id: null, detalle: 'Cucuruchón Chico · Caja sin cono', cantidad: 5, unidad: 'cajas', precio_sugerido: null, fuente: null },
    ] } },
  { si: { p_referencia_tipo: 'transferencia_stock', p_referencia_id: 's-1' }, r: {
    referencia_tipo: 'transferencia_stock', referencia_id: 's-1', fecha: '2026-10-08', acreedora_id: 'u-n', acreedora: 'Cucuruchos Nuss',
    deudora_id: 'u-d', deudora: 'Dolce Pasta', lista_interna: { id: 'li-nd', nombre: 'Nuss → Dolce Pasta (interna)' }, valorizado: null,
    items: [
      { clave: 'ins-1', presentacion_id: null, marca_id: null, insumo_id: 'ins-1', detalle: 'Harina 000 Molino Cañuelas', cantidad: 50, unidad: 'kg', precio_sugerido: 820.5, fuente: 'costo' },
    ] } },
  // La valorización hecha: no se sabe de qué tipo era; contesta el ingreso.
  { si: { p_referencia_tipo: 'traspaso_terminado', p_referencia_id: 'ie-7' }, r: NO },
  { si: { p_referencia_tipo: 'ingreso_externo', p_referencia_id: 'ie-7' }, r: {
    referencia_tipo: 'ingreso_externo', referencia_id: 'ie-7', fecha: '2026-10-12', acreedora_id: 'u-o', acreedora: 'Mengui',
    deudora_id: 'u-n', deudora: 'Cucuruchos Nuss', lista_interna: null, valorizado: { id: 'mu-7', importe: 50000, fecha: '2026-10-12' },
    items: [
      { clave: 'pr-m:', presentacion_id: 'pr-m', marca_id: null, insumo_id: null, detalle: 'Helado palito · Caja x 24', cantidad: 20, unidad: 'cajas', precio_sugerido: null, fuente: null },
    ] } },
], __defecto: NO };
base.rpc.valorizar_movimiento_entre_empresas = { id: 'mu-nueva', importe: 87500 };

module.exports = base;
