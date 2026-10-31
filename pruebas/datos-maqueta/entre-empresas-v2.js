// Datos de la maqueta: Administración → Entre empresas v2 (30/10/2026). Ver
// pruebas/datos-maqueta/README.md. Parte de los datos de Administración
// (administracion.js) SIN cambiarlos y suma gastos:gastos_empresa, Mengui,
// la respuesta de movimientos_entre_empresas con la forma de la base del
// 30/10/2026 (con marca_id y con_precio; el caso real de Nuss y Dolce: un
// pago de Nuss por un gasto de Dolce y tres cheques endosados por Dolce, más
// la orden interna D-I-0002 sin valorizar), las dos listas internas con
// precios_lista_interna, guardar_lista_interna y
// registrar_movimiento_entre_empresas.
//
//   http://localhost:4180/modulos/administracion.html?maqueta=entre-empresas-v2
'use strict';

const base = JSON.parse(JSON.stringify(require('./administracion')));
const t = base.tablas;
const EMP = t.empleados[0].id;

t.empleado_tareas.push({ empleado_id: EMP, modulo: 'gastos', tarea: 'gastos_empresa', alcance: null, habilitado: true });
t.unidades_negocio.push({ id: 'u-o', nombre: 'Mengui', prefijo: 'O', logo_url: null, activo: true, es_prueba: false });

const F = (o) => ({ fecha: '2026-10-15', tipo: 'otro', de_unidad_id: null, de_unidad: null, a_unidad_id: null, a_unidad: null, detalle: '', moneda: null,
  importe: null, cantidad: null, unidad_medida: null, presentacion_id: null, insumo_id: null, referencia_tipo: null, referencia_id: null,
  marca_id: null, con_precio: null, ...o });
const DE = { n: { de_unidad_id: 'u-n', de_unidad: 'Cucuruchos Nuss' }, d: { de_unidad_id: 'u-d', de_unidad: 'Dolce Pasta' }, o: { de_unidad_id: 'u-o', de_unidad: 'Mengui' } };
const A = { n: { a_unidad_id: 'u-n', a_unidad: 'Cucuruchos Nuss' }, d: { a_unidad_id: 'u-d', a_unidad: 'Dolce Pasta' }, o: { a_unidad_id: 'u-o', a_unidad: 'Mengui' } };

base.rpc.movimientos_entre_empresas = [
  F({ tipo: 'mercaderia', fecha: '2026-10-30', ...DE.d, ...A.n, detalle: 'Barquillo 40 x4 · Caja sin cono · lote 2210 · orden D-I-0002', cantidad: '10', unidad_medida: 'cajas', presentacion_id: 'pr1', referencia_tipo: 'orden_retiro', referencia_id: 'o-di2', con_precio: false }),
  F({ tipo: 'mercaderia', fecha: '2026-10-30', ...DE.d, ...A.n, detalle: 'Barquillo 35 x4 · Caja con cono · lote 2211 · orden D-I-0002', cantidad: '4', unidad_medida: 'cajas', presentacion_id: 'pr2', referencia_tipo: 'orden_retiro', referencia_id: 'o-di2', con_precio: false }),
  F({ tipo: 'otro', fecha: '2026-10-30', ...DE.d, ...A.n, detalle: 'Cheque 191-62294736 usado para pagar a BADIC S.A.S.', moneda: 'ARS', importe: '2200000.00', referencia_tipo: 'movimiento_entre_unidades', referencia_id: 'mu-3' }),
  F({ tipo: 'pago', fecha: '2026-10-29', ...DE.n, ...A.d, detalle: 'Combustible · Axion · pagado desde Efectivo Nuss', moneda: 'ARS', importe: '563000.07', referencia_tipo: 'gasto', referencia_id: 'g-1' }),
  F({ tipo: 'cobro', fecha: '2026-10-20', ...DE.n, ...A.o, detalle: 'Transferencia de Distribuidora Anatolia a Banco Mengui', moneda: 'ARS', importe: '150000.00', referencia_tipo: 'cobranza', referencia_id: 'k-1' }),
  F({ tipo: 'traspaso_dinero', fecha: '2026-10-18', ...DE.o, ...A.d, detalle: 'Traspaso de Caja Mengui a Banco Macro DP', moneda: 'ARS', importe: '42000.50', referencia_tipo: 'caja_movimiento', referencia_id: 'cm-1' }),
  F({ tipo: 'otro', fecha: '2026-10-16', ...DE.d, ...A.n, detalle: 'Cheque 285-78013718 endosado a CORRUGADORA CENTRO S.A.', moneda: 'ARS', importe: '9400228.77', referencia_tipo: 'movimiento_entre_unidades', referencia_id: 'mu-2' }),
  F({ tipo: 'otro', fecha: '2026-10-15', ...DE.d, ...A.n, detalle: 'Cheque 191-85815389 endosado a DIMAFLO S.A.', moneda: 'ARS', importe: '650181.18', referencia_tipo: 'movimiento_entre_unidades', referencia_id: 'mu-1' }),
  F({ tipo: 'cheque', fecha: '2026-10-10', ...DE.o, ...A.n, detalle: 'Cheque depositado 007-12345678 en Banco Galicia Nuss · de Heladería Sol', moneda: 'ARS', importe: '80000.00', referencia_tipo: 'cheque', referencia_id: 'q-1' }),
  F({ tipo: 'insumos', fecha: '2026-10-08', ...DE.n, ...A.d, detalle: 'Harina 000 Molino Cañuelas · lote L-0925', cantidad: '50', unidad_medida: 'kg', insumo_id: 'ins-1', referencia_tipo: 'transferencia_stock', referencia_id: 's-1' }),
];
t.movimientos_entre_unidades = [];
// La orden de la mercadería sin valorizar (de Dolce, a Nuss).
t.ordenes_retiro.push({ id: 'o-di2', numero: 2, codigo: 'D-I-0002', unidad_negocio_id: 'u-d', fecha: '2026-10-30', estado: 'confirmada',
  estado_valorizacion: 'pendiente', total: 0, moneda: 'ARS', cliente_id: 'c1', cargada_por: 'emp-9', cargada_en: '2026-10-30T12:00:00Z', transporte: null, observaciones: null });

// Las listas internas.
t.listas_precios.push(
  { id: 'li-nd', unidad_negocio_id: 'u-n', nombre: 'Nuss → Dolce Pasta (interna)', moneda: 'ARS', activa: true, es_base: false, es_interna: true, recargo_pct: '-5.000' },
  { id: 'li-dn', unidad_negocio_id: 'u-d', nombre: 'Dolce Pasta → Nuss (interna)', moneda: 'ARS', activa: true, es_base: false, es_interna: true, recargo_pct: '0.000' },
);
base.rpc.precios_lista_interna = { __segun: [
  { si: { p_lista_id: 'li-nd' }, r: { lista_id: 'li-nd', nombre: 'Nuss → Dolce Pasta (interna)', pct: -5, items: [
    { presentacion_id: 'pr-a', producto: 'Capelina Grande', presentacion: 'Caja', unidades_por_caja: 50, precio_interno: '7000.00', precio_propio: 7000, mas_barata: { lista: 'Distribuidores', precio_caja: 8000 } },
    { presentacion_id: 'pr-b', producto: 'Cucuruchón Chico', presentacion: 'Caja sin cono', unidades_por_caja: 100, precio_interno: '9500.00', precio_propio: null, mas_barata: { lista: 'Mayoristas', precio_caja: 10000 } },
    { presentacion_id: 'pr-c', producto: 'Vaso 125', presentacion: 'Caja media altura', unidades_por_caja: 200, precio_interno: null, precio_propio: null, mas_barata: null },
  ] } },
  { si: { p_lista_id: 'li-dn' }, r: { lista_id: 'li-dn', nombre: 'Dolce Pasta → Nuss (interna)', pct: 0, items: [
    { presentacion_id: 'pr-d', producto: 'Barquillo 40 x4', presentacion: 'Caja sin cono', unidades_por_caja: 40, precio_interno: '12345.67', precio_propio: null, mas_barata: { lista: 'Rosario mayorista', precio_caja: 12345.67 } },
  ] } },
], __defecto: null };
base.rpc.guardar_lista_interna = { lista_id: 'li-nd', pct: -7.5 };
base.rpc.registrar_movimiento_entre_empresas = 'mu-nuevo';

module.exports = base;
