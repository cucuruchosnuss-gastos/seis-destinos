// Datos de la maqueta y de las pruebas: el producto terminado de Stock
// (23/10/2026, ver pruebas/datos-maqueta/README.md). Se generan a
// e2e/maqueta/datos/stock-terminado.json con `npm run maqueta:datos`.
//
// La MISMA cuenta que "stock" (stock:ver y stock:ajustar_inventario en Nuss y
// Dolce Pasta), con un libro de producto terminado más largo: varios
// productos, presentaciones con y sin cono, lotes en negativo, una línea que
// quedó en cero, ajustes con su motivo y movimientos de la fábrica de pruebas
// (que nunca se ven). Las columnas de stock_terminado_movimientos son las de
// la base (verificadas con information_schema el 23/10/2026).
'use strict';

const base = JSON.parse(JSON.stringify(require('./stock')));

const NUSS = 'u-n', DOLCE = 'u-d', ROBOT = 'u-p';

const PRODUCTOS = [
  { id: 'pt-mini', unidad_negocio_id: NUSS, nombre: 'Cucuruchón Mini', tipo_masa: 'Común', categoria: 'cucuruchones', activo: true, orden: 1, origen_producto_id: null },
  { id: 'pt-grande', unidad_negocio_id: NUSS, nombre: 'Cucuruchón Grande', tipo_masa: 'Común', categoria: 'cucuruchones', activo: true, orden: 2, origen_producto_id: null },
  { id: 'pt-vaso', unidad_negocio_id: NUSS, nombre: 'Vaso CERO', tipo_masa: 'Común', categoria: 'vasos', activo: true, orden: 3, origen_producto_id: null },
  { id: 'pt-obleas', unidad_negocio_id: NUSS, nombre: 'Obleas dulces', tipo_masa: 'Común', categoria: 'obleas', activo: true, orden: 4, origen_producto_id: null },
  { id: 'pt-solo', unidad_negocio_id: NUSS, nombre: 'Barquillo solo en Nuss con nombre muy largo para ver cómo baja de renglón', tipo_masa: 'Común', categoria: 'barquillos', activo: true, orden: 5, origen_producto_id: null },
  { id: 'dt-mini', unidad_negocio_id: DOLCE, nombre: 'Cucuruchón Mini', tipo_masa: 'Común', categoria: 'cucuruchones', activo: true, orden: 1, origen_producto_id: 'pt-mini' },
  { id: 'xt-robot', unidad_negocio_id: ROBOT, nombre: 'Producto del robot', tipo_masa: 'Común', categoria: 'cucuruchones', activo: true, orden: 1, origen_producto_id: null },
];

const pres = (id, producto_id, nombre, unidades_por_caja, orden, con_cono = false, media_caja = false) =>
  ({ id, producto_id, nombre, con_cono, media_caja, unidades_por_caja, activa: true, orden });

const PRESENTACIONES = [
  pres('pp-mini', 'pt-mini', 'Caja sin cono', 320, 1),
  pres('pp-mini-c', 'pt-mini', 'Caja con cono', 320, 2, true),
  pres('pp-mini-m', 'pt-mini', 'Media caja', 160, 3, false, true),
  pres('pp-grande', 'pt-grande', 'Caja sin cono', 240, 1),
  pres('pp-vaso', 'pt-vaso', 'Caja ×1800', 1800, 1),
  pres('pp-obleas', 'pt-obleas', 'Caja', 55, 1),
  pres('pp-solo', 'pt-solo', 'Caja x 50', 50, 1),
  pres('dp-mini', 'dt-mini', 'Caja 600', 600, 1),
  pres('xp-robot', 'xt-robot', 'Caja', 100, 1),
];

const MARCAS = [
  { id: 'mk-aspen', nombre: 'ASPEN', activa: true, estado_alta: 'aprobada' },
  { id: 'mk-duomo', nombre: 'DUOMO', activa: true, estado_alta: 'aprobada' },
  { id: 'mk-lolo', nombre: 'LOLO', activa: true, estado_alta: 'aprobada' },
  { id: 'mk-sol', nombre: 'HELADERÍA DEL SOL', activa: true, estado_alta: 'aprobada' },
];

let n = 0;
const mov = (u, presentacion_id, marca_id, lote, cajas, tipo, fecha, motivo = null) => {
  n++;
  return {
    id: `stm-${String(n).padStart(3, '0')}`, unidad_negocio_id: u, presentacion_id, marca_id, lote, cajas,
    unidades: cajas * (PRESENTACIONES.find(p => p.id === presentacion_id)?.unidades_por_caja ?? 1),
    tipo, fecha, motivo, created_at: `${fecha}T1${n % 10}:00:00-03:00`,
  };
};

const MOVIMIENTOS = [
  // Cucuruchón Mini sin cono: tres lotes con stock y uno en negativo.
  mov(NUSS, 'pp-mini', null, '6201-1', 40, 'produccion', '2026-09-20'),
  mov(NUSS, 'pp-mini', null, '6201-1', -12, 'despacho', '2026-09-25'),
  mov(NUSS, 'pp-mini', null, '6215-2', 30, 'produccion', '2026-10-05'),
  mov(NUSS, 'pp-mini', null, '6230-1', -7, 'despacho', '2026-10-15'),
  mov(NUSS, 'pp-mini', null, '6230-1', 3, 'ajuste', '2026-10-19', 'Corrección de carga: estas cajas no salieron de este lote; salieron del 6240-2'),
  mov(NUSS, 'pp-mini', null, '6240-2', 25, 'produccion', '2026-10-20'),
  // Con cono: ASPEN con stock, DUOMO que quedó en cero, LOLO negativo.
  mov(NUSS, 'pp-mini-c', 'mk-aspen', '6243-1', 45, 'produccion', '2026-10-21'),
  mov(NUSS, 'pp-mini-c', 'mk-duomo', '6244-1', 20, 'produccion', '2026-10-21'),
  mov(NUSS, 'pp-mini-c', 'mk-duomo', '6244-1', -20, 'despacho', '2026-10-22'),
  mov(NUSS, 'pp-mini-c', 'mk-lolo', '6245-3', -4, 'despacho', '2026-10-22'),
  mov(NUSS, 'pp-mini-c', 'mk-sol', '6246-1', 12, 'ajuste', '2026-10-22', 'Sobrante en el recuento: aparecieron en el depósito de atrás'),
  mov(NUSS, 'pp-mini-m', null, '6250-1', 308, 'produccion', '2026-10-22'),
  // Cucuruchón Grande: muchos lotes, para ver la lista larga.
  ...['6190-1', '6195-2', '6202-1', '6208-3', '6212-1', '6219-2', '6222-1', '6229-4'].map((lote, i) =>
    mov(NUSS, 'pp-grande', null, lote, i % 3 === 0 ? -(i + 2) : 10 + i, i % 3 === 0 ? 'despacho' : 'produccion', `2026-10-0${(i % 9) + 1}`)),
  mov(NUSS, 'pp-grande', null, '6202-1', 5, 'inventario_inicial', '2026-09-01'),
  // Vaso CERO: el nombre ya dice "×1800" (no se repite).
  mov(NUSS, 'pp-vaso', null, 'SIN LOTE', 6, 'ingreso_externo', '2026-10-10'),
  mov(NUSS, 'pp-vaso', null, 'SIN LOTE', -1, 'ajuste', '2026-10-12', 'Faltante en el recuento: una caja rota'),
  // Obleas: el total en negativo.
  mov(NUSS, 'pp-obleas', null, '6100-1', 4, 'produccion', '2026-09-10'),
  mov(NUSS, 'pp-obleas', null, '6100-1', -14, 'despacho', '2026-09-30'),
  mov(NUSS, 'pp-solo', null, '6101-1', 9, 'produccion', '2026-09-11'),
  // Dolce Pasta.
  mov(DOLCE, 'dp-mini', null, 'D-7001', 83, 'traspaso_entrada', '2026-10-01', 'Traspaso de Cucuruchos Nuss'),
  mov(DOLCE, 'dp-mini', null, 'D-7002', -3, 'despacho', '2026-10-02'),
  // La fábrica de pruebas: nunca aparece para una cuenta real.
  mov(ROBOT, 'xp-robot', null, 'R-1', 99, 'produccion', '2026-10-01'),
];

base.tablas.productos_terminados = PRODUCTOS;
base.tablas.producto_presentaciones = PRESENTACIONES;
base.tablas.marcas_personalizadas = MARCAS;
base.tablas.stock_terminado_movimientos = MOVIMIENTOS;
base.rpc.ajustar_stock_terminado = 'stm-nuevo';

module.exports = base;
