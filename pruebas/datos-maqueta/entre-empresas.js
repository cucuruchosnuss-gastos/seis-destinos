// Datos de la maqueta: Administración → Entre empresas (13/10/2026). Ver
// pruebas/datos-maqueta/README.md. Parte de los datos de Administración
// (administracion.js) SIN cambiarlos —las otras pruebas los usan tal cual— y
// suma gastos:gastos_empresa y la respuesta de movimientos_entre_empresas (con
// la forma real de la base: el producto terminado en dos mitades, los numeric
// como texto), más precio_venta y precios_insumos_lista para valorizar.
//
//   http://localhost:4180/modulos/administracion.html?maqueta=entre-empresas
'use strict';

const base = JSON.parse(JSON.stringify(require('./administracion')));
const t = base.tablas;
const EMP = t.empleados[0].id;

t.empleado_tareas.push({ empleado_id: EMP, modulo: 'gastos', tarea: 'gastos_empresa', alcance: null, habilitado: true });

const F = (o) => ({ fecha: '2026-10-05', tipo: 'otro', de_unidad_id: null, de_unidad: null, a_unidad_id: null, a_unidad: null, detalle: '', moneda: null,
  importe: null, cantidad: null, unidad_medida: null, presentacion_id: null, insumo_id: null, referencia_tipo: null, referencia_id: null, ...o });
const DE_D = { de_unidad_id: 'u-d', de_unidad: 'Dolce Pasta' }, A_N = { a_unidad_id: 'u-n', a_unidad: 'Cucuruchos Nuss' };
const DE_N = { de_unidad_id: 'u-n', de_unidad: 'Cucuruchos Nuss' }, A_D = { a_unidad_id: 'u-d', a_unidad: 'Dolce Pasta' };

base.rpc.movimientos_entre_empresas = [
  F({ tipo: 'otro', fecha: '2026-10-06', ...DE_D, ...A_N, detalle: 'Traspaso de producto terminado · semana 40', moneda: 'ARS', importe: '20000.00', referencia_tipo: 'movimiento_entre_unidades', referencia_id: 'mu1' }),
  F({ tipo: 'mercaderia', fecha: '2026-10-06', ...DE_D, detalle: 'Cono dulce · Caja x 50', unidad_medida: 'cajas', presentacion_id: 'pr-dp', referencia_tipo: 'traspaso_terminado', referencia_id: 't2' }),
  F({ tipo: 'mercaderia', fecha: '2026-10-06', ...A_N, detalle: 'Cono dulce · Caja x 50', cantidad: '5', unidad_medida: 'cajas', presentacion_id: 'pr-n9', referencia_tipo: 'traspaso_terminado', referencia_id: 't2' }),
  F({ tipo: 'cheque', fecha: '2026-10-05', ...DE_D, ...A_N, detalle: 'Cheque depositado 007-12345678 en Banco Galicia Nuss · de Distribuidora Anatolia', moneda: 'ARS', importe: '100000.00', referencia_tipo: 'cheque', referencia_id: 'q1' }),
  F({ tipo: 'pago', fecha: '2026-10-04', ...DE_N, ...A_D, detalle: 'Insumos - Materia Prima · MOLINO CAÑUELAS SA · pagado desde Banco Galicia Nuss', moneda: 'ARS', importe: '30000.00', referencia_tipo: 'gasto', referencia_id: 'g1' }),
  F({ tipo: 'traspaso_dinero', fecha: '2026-10-04', ...DE_D, ...A_N, detalle: 'Traspaso de Banco Macro DP a Banco Galicia Nuss', moneda: 'ARS', importe: '5000.50', referencia_tipo: 'caja_movimiento', referencia_id: 'm1' }),
  F({ tipo: 'pago', fecha: '2026-10-03', ...DE_N, ...A_D, detalle: 'Repuestos · pagado desde Caja dólares Nuss', moneda: 'USD', importe: '200.00', referencia_tipo: 'gasto', referencia_id: 'g2' }),
  F({ tipo: 'mercaderia', fecha: '2026-10-02', ...DE_N, detalle: 'Cucurucho grande · Caja x 100', unidad_medida: 'cajas', presentacion_id: 'pr1', referencia_tipo: 'traspaso_terminado', referencia_id: 't1' }),
  F({ tipo: 'mercaderia', fecha: '2026-10-02', ...A_D, detalle: 'Cucurucho grande · Caja x 100', cantidad: '10', unidad_medida: 'cajas', presentacion_id: 'pr-d1', referencia_tipo: 'traspaso_terminado', referencia_id: 't1' }),
  F({ tipo: 'insumos', fecha: '2026-10-01', ...DE_N, ...A_D, detalle: 'Harina 000 Molino Cañuelas · lote L-0925', cantidad: '50', unidad_medida: 'kg', insumo_id: 'ins-1', referencia_tipo: 'transferencia_stock', referencia_id: 's1' }),
];
base.rpc.precio_venta = { precio_unitario: '15.0025', precio_caja: '1500.25', unidades_por_caja: 100, producto_unitario: '15.0025', conito_unitario: 0, papel_conito: null, lista: 'Mayoristas', recargo_pct: 0, sin_precio: false };
base.rpc.precios_insumos_lista = [
  { insumo_id: 'ins-1', insumo: 'Harina 000', unidad_medida: 'kg', precio_unitario: '100.50', tipo: 'fijo', recargo_costo_pct: null, vigente_desde: '2026-10-01', sin_costo: false },
];

module.exports = base;
