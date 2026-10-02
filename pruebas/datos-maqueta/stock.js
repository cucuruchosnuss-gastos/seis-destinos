// Datos de la maqueta y de las pruebas: stock (ver pruebas/datos-maqueta/README.md).
// Se generan a e2e/maqueta/datos/stock.json con `npm run maqueta:datos`.
//
// La persona ve stock en DOS unidades (Nuss y Dolce Pasta) y además tiene una
// tarea de Ingreso en Mengui: la barra de unidad de arriba le muestra las tres,
// y en Mengui Stock tiene que decir "no tenés permiso para ver el stock".
'use strict';

const { UID, tarea } = require('./comun');

const NUSS = 'u-n', DOLCE = 'u-d', MENGUI = 'u-m', ROBOT = 'u-p';
const EMP = 'emp-stock';

const UNIDADES = [
  { id: NUSS, nombre: 'Cucuruchos Nuss', prefijo: 'N', logo_url: 'logo-cucuruchos-nuss.png', activo: true, es_prueba: false },
  { id: DOLCE, nombre: 'Dolce Pasta', prefijo: 'D', logo_url: 'logo-dolce-pasta.png', activo: true, es_prueba: false },
  { id: MENGUI, nombre: 'Mengui', prefijo: 'O', logo_url: 'logo-heladitos-orly.png', activo: true, es_prueba: false },
  { id: ROBOT, nombre: 'Pruebas (robot)', prefijo: 'X', logo_url: null, activo: true, es_prueba: true },
];
const nom = id => UNIDADES.find(u => u.id === id).nombre;
const vista = ids => ids.map(id => ({ id, nombre: nom(id), ciudad: 'Córdoba' }));

const fila = (u, id, nombre, cantidad, extra = {}) => ({
  unidad_negocio_id: u, insumo_id: id, insumo_nombre: nombre, marca: null, unidad_medida: 'kg',
  tipo: 'materia_prima', categoria: 'Harinas', aclaracion: null, cantidad_total: cantidad, lotes_distintos: 1,
  presentaciones: 0, contenido_unico: null, kilos_sueltos: 0, vista_preferida: 'base', ...extra,
});

const insumo = (id, nombre, extra = {}) => ({
  id, nombre, marca: null, unidad_medida: 'kg', tipo: 'materia_prima', categoria: 'Harinas', aclaracion: null,
  activo: true, estado_alta: 'activo', tolerancia_merma_pct: 1, vista_preferida: 'base', ...extra,
});

module.exports = {
  uid: UID,
  tablas: {
    empleados: [
      { id: EMP, auth_user_id: UID, nombre: 'Facu Maqueta', rol_app: 'usuario', activo: true,
        unidad_negocio_id: NUSS, es_prueba: false, es_dispositivo: false },
    ],
    // Los módulos habilitados: la barra lateral los lee.
    empleado_modulos: [
      { empleado_id: EMP, modulo: 'stock', habilitado: true },
      { empleado_id: EMP, modulo: 'materia-prima', habilitado: true },
    ],
    empleado_tareas: [
      tarea(EMP, 'stock', 'ver', { unidades: [NUSS, DOLCE] }),
      tarea(EMP, 'stock', 'ajustar_inventario', { unidades: [NUSS, DOLCE] }),
      tarea(EMP, 'stock', 'dar_baja', { unidades: [NUSS] }),
      tarea(EMP, 'stock', 'enviar_transferencia', { unidades: [NUSS, DOLCE] }),
      tarea(EMP, 'stock', 'gestionar_catalogo', null),
      // Mengui: la barra la muestra (es de la persona), Stock no tiene permiso.
      tarea(EMP, 'materia_prima', 'cargar', { unidades: [MENGUI] }),
    ],
    unidades_negocio: UNIDADES,
    v_empleados_publico: [
      { id: EMP, nombre: 'Facu Maqueta', unidad_negocio_id: NUSS, tipo: 'naaloo', activo: true, rol_app: 'usuario', tiene_acceso: true },
    ],
    v_mis_unidades_stock: vista([NUSS, DOLCE]),
    v_mis_unidades_ajuste: vista([NUSS, DOLCE]),
    v_mis_unidades_baja: vista([NUSS]),
    v_mis_unidades_envio: vista([NUSS, DOLCE]),
    v_stock_insumos: [
      fila(NUSS, 'i-harina', 'Harina 000', 6250, { presentaciones: 1, contenido_unico: 25, vista_preferida: 'bulto' }),
      fila(DOLCE, 'i-harina', 'Harina 000', 500, { presentaciones: 1, contenido_unico: 25, vista_preferida: 'bulto' }),
      fila(NUSS, 'i-lecitina', 'Lecitina de soja con un nombre larguísimo para ver que no empuje el ancho', 12.5, { categoria: 'Aditivos' }),
      fila(DOLCE, 'i-azucar', 'Azúcar', -3, { categoria: 'Azúcares y secos' }),
      fila(NUSS, 'i-caja', 'Caja N°1', 1200, { tipo: 'insumo', categoria: 'Cajas', unidad_medida: 'un', marca: 'Nuss' }),
      fila(DOLCE, 'i-caja', 'Caja N°1', 300, { tipo: 'insumo', categoria: 'Cajas', unidad_medida: 'un', marca: 'Nuss' }),
    ],
    insumos: [
      insumo('i-harina', 'Harina 000'),
      insumo('i-lecitina', 'Lecitina de soja con un nombre larguísimo para ver que no empuje el ancho', { categoria: 'Aditivos' }),
      insumo('i-azucar', 'Azúcar', { categoria: 'Azúcares y secos' }),
      insumo('i-caja', 'Caja N°1', { tipo: 'insumo', categoria: 'Cajas', unidad_medida: 'un', marca: 'Nuss' }),
    ],
    v_recuentos: [
      { id: 'r-1', unidad_negocio_id: NUSS, unidad_nombre: nom(NUSS), estado: 'cerrado', abierto_en: '2026-09-01T12:00:00Z',
        cerrado_en: '2026-09-01T15:00:00Z', observaciones: null, motivo_anulacion: null, abierto_por_nombre: 'Facu Maqueta',
        cerrado_por_nombre: 'Facu Maqueta', items: 40, con_diferencia: 3 },
      { id: 'r-2', unidad_negocio_id: DOLCE, unidad_nombre: nom(DOLCE), estado: 'anulado', abierto_en: '2026-09-05T12:00:00Z',
        cerrado_en: null, observaciones: null, motivo_anulacion: 'Se abrió en la unidad equivocada', abierto_por_nombre: 'Facu Maqueta',
        cerrado_por_nombre: null, items: 12, con_diferencia: 0 },
    ],
    v_mermas: [
      { unidad_negocio_id: NUSS, unidad_nombre: nom(NUSS), fecha: '2026-09-12', mes: '2026-09-01', insumo_id: 'i-harina',
        insumo_nombre: 'Harina 000', marca: null, unidad_medida: 'kg', lote: 'L-100', cantidad: 25, origen: 'baja',
        motivo_tipo: 'mojado', motivo_texto: 'Se mojó con la lluvia', empleado_id: EMP },
      { unidad_negocio_id: DOLCE, unidad_nombre: nom(DOLCE), fecha: '2026-09-14', mes: '2026-09-01', insumo_id: 'i-caja',
        insumo_nombre: 'Caja N°1', marca: 'Nuss', unidad_medida: 'un', lote: null, cantidad: 10, origen: 'transferencia',
        motivo_tipo: null, motivo_texto: 'Llegaron rotas', empleado_id: EMP },
    ],
    v_stock_en_transito: [
      { id: 't-1', unidad_origen_id: NUSS, origen_nombre: nom(NUSS), unidad_destino_id: DOLCE, destino_nombre: nom(DOLCE),
        fecha: '2026-09-25', creado_por: EMP, created_at: '2026-09-25T12:00:00Z', dias_en_transito: 2, items: 3 },
    ],
    v_transferencias: [
      { id: 'h-1', estado: 'aceptada', fecha: '2026-09-10', unidad_origen_id: DOLCE, origen_nombre: nom(DOLCE),
        unidad_destino_id: MENGUI, destino_nombre: nom(MENGUI), motivo_rechazo: null, respondido_en: '2026-09-11T12:00:00Z',
        creado_por_nombre: 'Facu Maqueta', respondido_por_nombre: 'Otra persona', items: 2, items_con_diferencia: 1 },
    ],
    proveedor_insumo_alias: [],
    v_stock_por_lote: [],
    stock_recuento_items: [],
    // ── Traspaso a otra fábrica (producto terminado, 30/09/2026) ─────────
    // Nuss pasa cucuruchones a Dolce; el "Solo en Nuss" no existe en Dolce
    // (el renglón tiene que avisarlo), y un bombón de chocolate va al final.
    productos_terminados: [
      { id: 'pt-mini', unidad_negocio_id: NUSS, nombre: 'Cucuruchón Mini', tipo_masa: 'Común', categoria: 'cucuruchones', activo: true, orden: 1, origen_producto_id: null },
      { id: 'pt-solo', unidad_negocio_id: NUSS, nombre: 'Barquillo solo en Nuss con nombre muy largo', tipo_masa: 'Común', categoria: 'barquillos', activo: true, orden: 2, origen_producto_id: null },
      { id: 'pt-bombon', unidad_negocio_id: NUSS, nombre: 'Bombón', tipo_masa: 'Chocolate', categoria: 'especiales', activo: true, orden: 3, origen_producto_id: null },
      { id: 'dt-mini', unidad_negocio_id: DOLCE, nombre: 'Cucuruchón Mini', tipo_masa: 'Común', categoria: 'cucuruchones', activo: true, orden: 1, origen_producto_id: 'pt-mini' },
      { id: 'dt-bombon', unidad_negocio_id: DOLCE, nombre: 'Bombón', tipo_masa: 'Chocolate', categoria: 'especiales', activo: true, orden: 2, origen_producto_id: 'pt-bombon' },
    ],
    producto_presentaciones: [
      { id: 'pp-mini', producto_id: 'pt-mini', nombre: 'Caja x 600', con_cono: false, media_caja: false, unidades_por_caja: 600, activa: true, orden: 1 },
      { id: 'pp-mini-c', producto_id: 'pt-mini', nombre: 'Caja con cono', con_cono: true, media_caja: false, unidades_por_caja: 600, activa: true, orden: 2 },
      { id: 'pp-solo', producto_id: 'pt-solo', nombre: 'Caja x 50', con_cono: false, media_caja: false, unidades_por_caja: 50, activa: true, orden: 1 },
      { id: 'pp-bombon', producto_id: 'pt-bombon', nombre: 'Caja x 100', con_cono: false, media_caja: false, unidades_por_caja: 100, activa: true, orden: 1 },
      { id: 'dp-mini', producto_id: 'dt-mini', nombre: 'Caja 600', con_cono: false, media_caja: false, unidades_por_caja: 600, activa: true, orden: 1 },
      { id: 'dp-mini-c', producto_id: 'dt-mini', nombre: 'Caja con cono', con_cono: true, media_caja: false, unidades_por_caja: 600, activa: true, orden: 2 },
      { id: 'dp-bombon', producto_id: 'dt-bombon', nombre: 'Caja 100', con_cono: false, media_caja: false, unidades_por_caja: 100, activa: true, orden: 1 },
    ],
    marcas_personalizadas: [
      { id: 'mk-lolo', nombre: 'LOLO', activa: true, estado_alta: 'aprobada' },
      { id: 'mk-sol', nombre: 'HELADERÍA DEL SOL', activa: true, estado_alta: 'aprobada' },
    ],
    stock_terminado_movimientos: [
      { unidad_negocio_id: NUSS, presentacion_id: 'pp-mini', marca_id: null, lote: '7020-1', cajas: 5, fecha: '2026-08-20' },
      { unidad_negocio_id: NUSS, presentacion_id: 'pp-mini', marca_id: null, lote: '7023-1', cajas: 7, fecha: '2026-09-01' },
      { unidad_negocio_id: NUSS, presentacion_id: 'pp-mini', marca_id: null, lote: '7030-1', cajas: 40, fecha: '2026-09-10' },
      { unidad_negocio_id: NUSS, presentacion_id: 'pp-mini-c', marca_id: 'mk-lolo', lote: '7031-2', cajas: 12, fecha: '2026-09-12' },
      { unidad_negocio_id: NUSS, presentacion_id: 'pp-solo', marca_id: null, lote: '7033-1', cajas: 9, fecha: '2026-09-15' },
      { unidad_negocio_id: NUSS, presentacion_id: 'pp-bombon', marca_id: null, lote: '7035-1', cajas: 6, fecha: '2026-09-18' },
    ],
    listas_precios: [
      // La lista interna se marca con es_interna (30/09/2026), no por el nombre.
      { id: 'lp-interna', unidad_negocio_id: NUSS, nombre: 'Entre fábricas', activa: true, es_interna: true },
      { id: 'lp-dist', unidad_negocio_id: NUSS, nombre: 'Distribuidores', activa: true, es_interna: false },
    ],
  },
  rpc: {
    mis_pendientes: [],
    precio_venta: { precio_caja: 18500, precio_unitario: 30.8333, sin_precio: false },
    traspasar_producto_terminado: { traspaso_id: 'tr-maqueta', importe: 222000 },
  },
};
