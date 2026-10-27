// Datos de la maqueta: el DETALLE DE UNA FACTURA DE COMPRA que cargó Ingreso
// de materia prima (27/10/2026), el que abre el 👁 de Cuentas corrientes. Ver
// pruebas/datos-maqueta/README.md. Se abre derecho con ?factura=<id>.
//
// Parte de ampliar-gastos.js SIN cambiarlo, le suma cuentas_corrientes:ver_todo
// y tres facturas sin comprobante_url: con los renglones leídos (fc-con), sin
// renglones (fc-sin: lo que entró al stock) y sin permiso (fc-perm).
// detalle_factura_compra responde según p_factura_id.
//
//   http://localhost:4180/modulos/gastos.html?maqueta=detalle-factura-compra&factura=fc-con
'use strict';

const base = JSON.parse(JSON.stringify(require('./ampliar-gastos')));
const t = base.tablas;
const uni = t.unidades_negocio[0];

t.empleado_tareas.push({ empleado_id: 'emp-g', modulo: 'cuentas_corrientes', tarea: 'ver_todo', alcance: { todas: true }, habilitado: true });

const factura = (id, numero, importe) => ({
  id, razon_social: 'Molino Harinero del Centro SA', tipo_documento: 'Factura A', numero_comprobante: numero,
  importe, moneda: 'ARS', fecha_factura: '2026-10-20', lugar: null, observaciones: null,
  comprobante_url: null, estado: 'pendiente', saldo_pendiente: importe, proveedor_id: 'prov-mp', modulo_origen: 'materia_prima',
  proveedores: { id: 'prov-mp', razon_social: 'Molino Harinero del Centro SA' },
  categorias: null, unidades_negocio: { id: uni.id, nombre: uni.nombre },
});
t.facturas_pendientes = [
  factura('fc-con', '0001-00001234', 3655355),
  factura('fc-sin', '0001-00001235', 152343.78),
  factura('fc-perm', '0001-00001236', 298058.14),
];

// La foto en la carpeta de Ingreso de OTRA persona: la deja ver la tarea de CC.
const foto = 'otro-uid/mp/1793040090436-75hfie.jpg';
base.rpc.detalle_factura_compra = {
  __segun: [
    { si: { p_factura_id: 'fc-con' }, r: {
      origen: 'materia_prima', ingreso_id: 'ing-1', foto_url: foto, tipo_doc: 'Factura A', numero_doc: '0001-00001234', fecha: '2026-10-20',
      importe_neto: 3303500, importe_iva: 351855, importe_total: 3655355,
      renglones_factura: [
        { descripcion: 'Harina de trigo 000 x 25 kg - bolsa de papel triple', cantidad: 50, unidad: 'un', precio_unitario: 950, alicuota_iva: 21, precio_total: 47500 },
        { descripcion: 'Azúcar refinada', cantidad: 5000, unidad: 'kg', precio_unitario: 16280, alicuota_iva: 10.5, precio_total: 3256000 },
      ],
      items_ingreso: [],
    } },
    { si: { p_factura_id: 'fc-sin' }, r: {
      origen: 'materia_prima', ingreso_id: 'ing-2', foto_url: foto, importe_neto: null, importe_iva: null, importe_total: null,
      renglones_factura: [],
      items_ingreso: [
        { insumo: 'Harina 000', marca: 'Pureza', unidad: 'kg', cantidad: 1250, precio_unitario: 38, alicuota_iva: 21 },
        { insumo: 'Esencia de vainilla', marca: null, unidad: 'l', cantidad: 2.5, precio_unitario: null, alicuota_iva: null },
      ],
    } },
    { si: { p_factura_id: 'fc-perm' }, r: 'ERROR:No tenés permiso para ver el detalle de esta factura' },
  ],
  __defecto: null,
};

module.exports = base;
