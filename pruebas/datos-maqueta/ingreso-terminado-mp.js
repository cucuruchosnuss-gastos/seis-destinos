// Datos de la maqueta: producto terminado desde el Ingreso de materia prima
// (26/10/2026, rama ci-prueba/ingreso-terminado-desde-mp). Ver
// pruebas/datos-maqueta/README.md.
//
// Parte de materia-prima.js SIN cambiarlo (lo usan otras pruebas) y le suma lo
// que necesita el wizard para el caso de Rodrigo:
//  - el catálogo de insumos (Harina 000) y los proveedores: RODRIGO ARRASCAETA
//    (trae la Capelina Grande) y otro que no trae producto terminado;
//  - en Cucuruchos Nuss la Capelina Grande con origen_proveedor_id = Rodrigo,
//    una sola presentación ("Caja") y lote vigente 310476; un Cono Nº 1 sin
//    proveedor con dos presentaciones (una con cono) y un producto sin
//    presentación activa (no se ofrece);
//  - en Dolce Pasta otra Capelina Grande, sin proveedor (es de otra fábrica:
//    no aparece cargando en Nuss);
//  - las respuestas de ingresar_producto_terminado y de lo que consulta el
//    paso Datos.
//
//   http://localhost:4180/modulos/materia-prima.html?maqueta=ingreso-terminado-mp
'use strict';

const base = JSON.parse(JSON.stringify(require('./materia-prima')));
const t = base.tablas;
const N = 'u-n', D = 'u-d';
const RODRIGO = 'prov-rodrigo';

t.insumos = [
  { id: 'ins-harina', nombre: 'Harina 000', marca: 'Júpiter', unidad_medida: 'kg', tipo: 'materia_prima', estado_alta: 'activo', categoria: 'Harinas' },
  { id: 'ins-caja', nombre: 'Caja corrugada', marca: null, unidad_medida: 'un', tipo: 'insumo', estado_alta: 'activo', categoria: 'Cajas' },
];
t.proveedores = [
  { id: RODRIGO, razon_social: 'RODRIGO ARRASCAETA', nombre_fantasia: null, cuit: '20301234567', cuenta_corriente: false, activo: true, estado_alta: 'activo' },
  { id: 'prov-molino', razon_social: 'MOLINO SAN JOSÉ', nombre_fantasia: null, cuit: '30700000002', cuenta_corriente: false, activo: true, estado_alta: 'activo' },
];
t.proveedor_insumo_alias = [];
t.productos_terminados = [
  { id: 'pt-capelina', nombre: 'Capelina Grande', orden: 1, tipo_masa: null, origen_tipo: 'proveedor', origen_proveedor_id: RODRIGO, unidad_negocio_id: N, activo: true },
  { id: 'pt-cono', nombre: 'Cono Nº 1', orden: 2, tipo_masa: 'dulce', origen_tipo: null, origen_proveedor_id: null, unidad_negocio_id: N, activo: true },
  { id: 'pt-viejo', nombre: 'Capelina Chica', orden: 3, tipo_masa: null, origen_tipo: 'proveedor', origen_proveedor_id: RODRIGO, unidad_negocio_id: N, activo: true },
  { id: 'pt-d-capelina', nombre: 'Capelina Grande', orden: 1, tipo_masa: null, origen_tipo: null, origen_proveedor_id: null, unidad_negocio_id: D, activo: true },
];
t.producto_presentaciones = [
  { id: 'pr-capelina-caja', producto_id: 'pt-capelina', nombre: 'Caja', con_cono: false, unidades_por_caja: 100, orden: 1, activa: true },
  { id: 'pr-cono-comun', producto_id: 'pt-cono', nombre: 'Caja x 600', con_cono: false, unidades_por_caja: 600, orden: 1, activa: true },
  { id: 'pr-cono-marca', producto_id: 'pt-cono', nombre: 'Caja x 600 con cono', con_cono: true, unidades_por_caja: 600, orden: 2, activa: true },
  // La Capelina Chica solo tiene una presentación dada de baja: no se ofrece.
  { id: 'pr-viejo', producto_id: 'pt-viejo', nombre: 'Caja', con_cono: false, unidades_por_caja: 100, orden: 1, activa: false },
  { id: 'pr-d-capelina', producto_id: 'pt-d-capelina', nombre: 'Caja', con_cono: false, unidades_por_caja: 100, orden: 1, activa: true },
];
t.marcas_personalizadas = [
  { id: 'm-lolo', nombre: 'LOLO', activa: true, estado_alta: 'activo' },
];
t.producto_lote_vigente = [
  { unidad_negocio_id: N, producto_id: 'pt-capelina', lote: '310476' },
  { unidad_negocio_id: D, producto_id: 'pt-d-capelina', lote: 'D-999' },
];

base.rpc.ingresar_producto_terminado = { ingreso_id: 'ing-pt-1', renglones: 1, cajas: 44, importe: 0 };
base.rpc.buscar_comprobante_cargado = [];
base.rpc.remitos_vinculables = [];
base.rpc.presentaciones_sugeridas = [];
base.rpc.registrar_factura_de_ingreso = { nivel: 'ok', resultado: 'ocasional' };

module.exports = base;
