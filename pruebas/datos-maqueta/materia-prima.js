// Datos de la maqueta: Ingreso — Insumos / Materia Prima (ver pruebas/datos-maqueta/README.md).
// Se generan a e2e/maqueta/datos/materia-prima.json con `npm run maqueta:datos`.
//
// Una persona con DOS unidades (Nuss propia + Dolce por el alcance de sus
// tareas), así la barra de unidad aparece con "Todas", Nuss y Dolce Pasta.
// Mengui existe pero no es de la persona (no aparece en la barra), y hay una
// transferencia recibida en Dolce, gastos pagados (uno sin unidad), facturas
// por ingresar y un envío en tránsito.
'use strict';

const { UID, tarea } = require('./comun');

const EMP = 'emp-mp';
const N = 'u-n', D = 'u-d', O = 'u-o';

const UNIDADES = [
  { id: N, nombre: 'Cucuruchos Nuss', prefijo: 'N', logo_url: 'logo-cucuruchos-nuss.png', activo: true, es_prueba: false },
  { id: D, nombre: 'Dolce Pasta', prefijo: 'D', logo_url: 'logo-dolce-pasta.png', activo: true, es_prueba: false },
  { id: O, nombre: 'Mengui', prefijo: 'O', logo_url: 'logo-heladitos-orly.png', activo: true, es_prueba: false },
  { id: 'u-p', nombre: 'Pruebas (robot)', prefijo: 'X', logo_url: null, activo: true, es_prueba: true },
];
const nombre = id => UNIDADES.find(u => u.id === id)?.nombre;

const item = (insumo, extra = {}) => ({ insumo_id: insumo, lote: 'L-1', lote_ilegible: false, cantidad_documento: null, ya_recibido_con_remito: false, ...extra });
const ingreso = (id, fecha, tipo, numero, razon, unidad, items, extra = {}) => ({
  id, fecha, tipo_doc: tipo, numero_doc: numero, razon_social: razon, nombre_fantasia: null, unidad_negocio_id: unidad,
  foto_url: null, remito_vinculado_id: null, empleado_id: EMP, editado_por: null, editado_en: null,
  created_at: `${fecha}T10:00:00Z`, proveedor_id: null, gasto_id: null, factura_pendiente_id: null, sin_stock_motivo: null,
  importe_ocr: null, proveedores: null, materia_prima_items: items, ...extra,
});

module.exports = {
  uid: UID,
  tablas: {
    empleados: [
      { id: EMP, auth_user_id: UID, nombre: 'Facu Maqueta', rol_app: 'usuario', activo: true, unidad_negocio_id: N, es_prueba: false, es_dispositivo: false },
    ],
    empleado_modulos: [
      { empleado_id: EMP, modulo: 'materia-prima', habilitado: true },
      { empleado_id: EMP, modulo: 'stock', habilitado: true },
    ],
    empleado_tareas: [
      tarea(EMP, 'materia_prima', 'cargar', { unidades: [N, D] }),
      tarea(EMP, 'materia_prima', 'ver_todo', { unidades: [N, D] }),
      tarea(EMP, 'stock', 'ver', { unidades: [N, D] }),
      tarea(EMP, 'stock', 'recibir_transferencia', { unidades: [N, D] }),
    ],
    unidades_negocio: UNIDADES,
    v_empleados_publico: [
      { id: EMP, nombre: 'Facu Maqueta', unidad_negocio_id: N, tipo: 'naaloo', activo: true },
    ],
    materia_prima_ingresos: [
      ingreso('i-1', '2026-09-26', 'remito', '0001-00004512', 'CORRUGADORA DEL CENTRO S.A.', N, [item('ins-caja'), item('ins-bolsa')]),
      ingreso('i-2', '2026-09-25', 'factura_a', '0069-00109678', 'CARLOS BOERO ROMANO', N, [item('ins-harina', { cantidad_documento: 250 })]),
      ingreso('i-3', '2026-09-24', 'remito', '0002-00000871', 'FERPLAST S.R.L.', D, [item('ins-film')]),
      ingreso('i-4', '2026-09-20', 'sin_comprobante', null, 'Descarga sin papel', D, [item('ins-azucar')]),
    ],
    materia_prima_factura_remitos: [],
    v_mis_unidades_stock: [
      { id: N, nombre: nombre(N) }, { id: D, nombre: nombre(D) },
    ],
    v_mis_unidades_recepcion: [
      { id: N, nombre: nombre(N) }, { id: D, nombre: nombre(D) },
    ],
    stock_transferencias: [
      {
        id: 't-1', fecha: '2026-09-23', created_at: '2026-09-23T15:00:00Z', estado: 'aceptada', unidad_origen_id: N, unidad_destino_id: D,
        observaciones: null, respondido_por: EMP,
        stock_transferencia_items: [
          { id: 'ti-1', lote: 'L-9', contenido_por_bulto: 25, cantidad_enviada: 500, cantidad_recibida: 450, motivo_diferencia: 'Se rompieron dos bolsas', insumos: { nombre: 'Harina 000', marca: 'Júpiter', unidad_medida: 'kg', aclaracion: null } },
        ],
      },
    ],
    v_stock_en_transito: [
      { id: 'tr-1', unidad_origen_id: D, origen_nombre: nombre(D), unidad_destino_id: N, destino_nombre: nombre(N), fecha: '2026-09-26', dias_en_transito: 1, items: 2 },
    ],
  },
  rpc: {
    fecha_inicio_circuito_stock: '2026-10-01',
    gastos_sin_ingreso: [
      { gasto_id: 'g-1', fecha: '2026-09-26', proveedor_id: null, razon_social: 'MOLINO SAN JOSÉ', numero_doc: '0003-00012345', importe: 387300.5, moneda: 'ARS', unidad_negocio_id: N, foto_url: null },
      { gasto_id: 'g-2', fecha: '2026-09-25', proveedor_id: null, razon_social: 'DISTRIBUIDORA SIN UNIDAD', numero_doc: '0001-00000077', importe: 12000, moneda: 'ARS', unidad_negocio_id: null, foto_url: null },
      { gasto_id: 'g-3', fecha: '2026-09-24', proveedor_id: null, razon_social: 'AZUCARERA DEL SUR', numero_doc: '0004-00000999', importe: 55000, moneda: 'ARS', unidad_negocio_id: D, foto_url: null },
    ],
    facturas_sin_ingreso: [
      { origen: 'factura', id: 'f-1', fecha: '2026-09-22', proveedor: 'Embalajes Mercosur S.R.L.', razon_social: 'EMBALAJES MERCOSUR S.R.L.', tipo_doc: 'Factura A', numero_doc: '0005-00022151', importe: 145000, moneda: 'ARS', unidad_negocio_id: N, unidad: nombre(N), foto_url: null },
      { origen: 'factura', id: 'f-2', fecha: '2026-09-21', proveedor: 'Badic S.A.S.', razon_social: 'BADIC S.A.S.', tipo_doc: 'Factura A', numero_doc: '0002-00000456', importe: null, moneda: 'ARS', unidad_negocio_id: D, unidad: nombre(D), foto_url: null },
    ],
    mis_pendientes: [
      { modulo: 'stock', clave: 'transferencias_por_aceptar', cantidad: 1, texto: 'Transferencias por aceptar' },
      { modulo: 'materia_prima', clave: 'pagado_sin_ingresar', cantidad: 3, texto: 'Pagado sin ingresar' },
    ],
  },
};
