// Datos de la maqueta: los ACOPIOS en Administración (27/10/2026, rama
// ci-prueba/acopios). Ver pruebas/datos-maqueta/README.md.
//
// Parte de administracion-remitos.js SIN cambiarlo (lo usa el e2e 71) y le suma:
//  - acopios de Dolce (u-d, sin control de stock): dos activos de "Almacén
//    Rosario" (Tallarín ×10: quedan 70 de 100; Cono dulce 48 con LEROMA: 20 de
//    20), uno terminado de "Almacén Rivadavia" y uno anulado de "Kiosco Pepe";
//    sus retiros (acopio_movimientos) con las órdenes de acopio N° 977490 y
//    977485; Nuss sin acopios (la sección no aparece);
//  - el remito de acopio rm-4 con tres renglones: Tallarín 30 (alcanza), Cono
//    dulce LEROMA 25 (quedan 20: no alcanza) y Capelina 5 (no hay acopio);
//  - FERNANDEZ RICARDO en Dolce (c-d-fer, cliente_principal_id → c-n-fer, el
//    de Nuss) con la lista de Nuss "Lista 1 (Turi · Tissot · Richard)", su
//    cuenta en el grupo (Nuss $ 350.000 · Dolce Pasta $ 120.000) y una orden
//    de Dolce sin valorizar (od7: Capelina ×12, que en Nuss es pr-n-cap con
//    precio, y Tallarín, que Nuss no tiene);
//  - la cuenta de Almacén Rosario con el movimiento "Acopio …" y su
//    "Anulación de acopio".
//
//   http://localhost:4180/modulos/administracion.html?maqueta=administracion-acopios
'use strict';

const base = JSON.parse(JSON.stringify(require('./administracion-remitos')));
const t = base.tablas;
const rpc = base.rpc;

// ── Nuss: la Capelina Grande, la equivalente de la de Dolce ─────────────────
t.productos_terminados.push({ id: 'p-n-cap', unidad_negocio_id: 'u-n', nombre: 'Capelina Grande', tipo_masa: 'Pasta', categoria: 'pasta', activo: true });
t.producto_presentaciones.push({ id: 'pr-n-cap', producto_id: 'p-n-cap', nombre: 'Caja x 12', con_cono: false, unidades_por_caja: 12, activa: true });

// ── FERNANDEZ RICARDO: en Nuss y vinculado en Dolce, con la lista de Nuss ──
t.listas_precios.push({ id: 'l-turi', unidad_negocio_id: 'u-n', nombre: 'Lista 1 (Turi · Tissot · Richard)', moneda: 'ARS', activa: true });
t.clientes.push(
  { id: 'c-n-fer', unidad_negocio_id: 'u-n', nombre: 'FERNANDEZ RICARDO', razon_social: null, apodos: ['Richard'], cuit: null, localidad: 'Rosario', activo: true, lista_precio_id: 'l-turi' },
  { id: 'c-d-fer', unidad_negocio_id: 'u-d', nombre: 'FERNANDEZ RICARDO', razon_social: null, apodos: ['Richard'], cuit: null, localidad: 'Rosario', activo: true, lista_precio_id: 'l-turi',
    cliente_principal_id: 'c-n-fer' },
);
const filaSaldo = (x) => ({ razon_social: null, cuit: null, lista: null, ultimo_movimiento: '2026-10-20', retiros_mes: 0, es_tambien_proveedor: false, activo: true, codigo_anterior: null, ...x });
const dolce = rpc.clientes_con_saldo.__segun.find(s => s.si.p_unidad_negocio_id === 'u-d');
dolce.r.push(
  filaSaldo({ cliente_id: 'c-d-ros', nombre: 'Almacén Rosario', razon_social: 'ROSARIO ALIMENTOS SA', saldo: 610000, retiros_mes: 2 }),
  filaSaldo({ cliente_id: 'c-d-fer', nombre: 'FERNANDEZ RICARDO', lista: 'Lista 1 (Turi · Tissot · Richard)', saldo: 120000, retiros_mes: 1 }),
);
rpc.clientes_con_saldo.__defecto.push(filaSaldo({ cliente_id: 'c-n-fer', nombre: 'FERNANDEZ RICARDO', lista: 'Lista 1 (Turi · Tissot · Richard)', saldo: 350000 }));

// cuenta_cliente_consolidada: la misma respuesta desde cualquiera de las dos cuentas.
const grupoFer = [
  { cliente_id: 'c-n-fer', unidad_negocio_id: 'u-n', empresa: 'Cucuruchos Nuss', cliente: 'FERNANDEZ RICARDO', saldo: 350000, ultimo_movimiento: '2026-10-20' },
  { cliente_id: 'c-d-fer', unidad_negocio_id: 'u-d', empresa: 'Dolce Pasta', cliente: 'FERNANDEZ RICARDO', saldo: 120000, ultimo_movimiento: '2026-10-02' },
];
rpc.cuenta_cliente_consolidada = { __segun: [{ si: { p_cliente_id: 'c-d-fer' }, r: grupoFer }, { si: { p_cliente_id: 'c-n-fer' }, r: grupoFer }], __defecto: [] };

// Las cuentas: lo que escribe la base para un acopio con precio y su anulación.
const mov = (fecha, tipo, detalle, importe, saldo) => ({ fecha, tipo, detalle, importe, saldo, orden_retiro_id: null });
rpc.cuenta_cliente.__segun.unshift(
  { si: { p_cliente_id: 'c-d-fer' }, r: [
    mov('2026-10-01', 'saldo_inicial', 'Deuda de septiembre', 66000, 66000),
    mov('2026-10-02', 'acopio', 'Acopio 10 cajas Capelina Grande · ×12 · factura A-0001-00001240', 54000, 120000),
  ] },
  { si: { p_cliente_id: 'c-d-ros' }, r: [
    mov('2026-10-01', 'acopio', 'Acopio 100 cajas Tallarín al huevo · ×10 · factura A-0001-00001234', 540000, 540000),
    mov('2026-10-05', 'acopio', 'Acopio 10 cajas Capelina Grande · ×12', 70000, 610000),
    mov('2026-10-06', 'anulacion_acopio', 'Anulación del acopio: se cargó dos veces', -70000, 540000),
    mov('2026-10-20', 'ajuste', 'Flete', 70000, 610000),
  ] },
);

// ── La orden de FERNANDEZ en Dolce, para valorizar con la lista de Nuss ─────
t.ordenes_retiro.push({ id: 'od7', numero: 7, codigo: 'D-0007', unidad_negocio_id: 'u-d', estado: 'confirmada', estado_valorizacion: 'pendiente', total: 0, moneda: 'ARS',
  cliente_id: 'c-d-fer', cargada_por: 'emp-1', transporte: null, observaciones: null, numero_remito: '0001-00003110', numero_remito_n: 100003110, talonario: 'oficial',
  fecha: '2026-10-26', cargada_en: '2026-10-26T14:00:00Z' });
t.orden_retiro_items.push(
  { id: 'id7a', orden_id: 'od7', orden: 1, presentacion_id: 'pr-d-cap', marca_id: null, cajas: 10, unidades: 120, insumo_id: null, cantidad: null, precio_caja: null, subtotal: null, tipo: 'retiro' },
  { id: 'id7b', orden_id: 'od7', orden: 2, presentacion_id: 'pr-d-tall', marca_id: null, cajas: 5, unidades: 50, insumo_id: null, cantidad: null, precio_caja: null, subtotal: null, tipo: 'retiro' },
);
// _presentacion_en_unidad: la Capelina de Dolce es pr-n-cap en Nuss; el
// Tallarín no tiene equivalente (vuelve la misma).
rpc._presentacion_en_unidad = { __segun: [
  { si: { p_presentacion_id: 'pr-d-cap', p_unidad: 'u-n' }, r: 'pr-n-cap' },
  { si: { p_presentacion_id: 'pr-d-tall', p_unidad: 'u-n' }, r: 'pr-d-tall' },
], __defecto: null };
rpc.precio_venta.__segun.unshift({ si: { p_lista_id: 'l-turi', p_presentacion_id: 'pr-n-cap', p_marca_id: null }, r: {
  precio_unitario: 800, precio_caja: 9600, unidades_por_caja: 12, producto_unitario: 800, conito_unitario: 0, papel_conito: null,
  lista: 'Lista 1 (Turi · Tissot · Richard)', recargo_pct: 0, sin_precio: false } });

// ── Los acopios de Dolce ────────────────────────────────────────────────────
const acopio = (x) => ({ unidad_negocio_id: 'u-d', marca_id: null, cono: null, numero_remito: null, numero_factura: null, precio_caja: null, observaciones: null,
  ultimo_retiro: null, retiradas: 0, ...x });
const ACOPIOS = [
  acopio({ id: 'ac-1', cliente_id: 'c-d-ros', cliente: 'Almacén Rosario', presentacion_id: 'pr-d-tall', producto: 'Tallarín al huevo', unidades_por_caja: 10,
    cajas: 100, retiradas: 30, saldo: 70, estado: 'activo', fecha: '2026-10-01', numero_remito: '3021', numero_factura: 'A-0001-00001234', precio_caja: 5400,
    ultimo_retiro: '2026-10-23' }),
  acopio({ id: 'ac-2', cliente_id: 'c-d-ros', cliente: 'Almacén Rosario', presentacion_id: 'pr-d-cono', producto: 'Cono dulce 48', unidades_por_caja: 48,
    marca_id: 'm-ler', cono: 'LEROMA', cajas: 20, saldo: 20, estado: 'activo', fecha: '2026-10-12', numero_remito: '3040', observaciones: 'Retira de a 5 cajas.' }),
  acopio({ id: 'ac-3', cliente_id: 'c-dolce', cliente: 'Almacén Rivadavia', presentacion_id: 'pr-d-cap', producto: 'Capelina Grande', unidades_por_caja: 12,
    cajas: 40, retiradas: 40, saldo: 0, estado: 'terminado', fecha: '2026-09-15', numero_factura: 'A-0001-00001100', ultimo_retiro: '2026-10-25' }),
  acopio({ id: 'ac-4', cliente_id: 'c2-d', cliente: 'Kiosco Pepe', presentacion_id: 'pr-d-cap', producto: 'Capelina Grande', unidades_por_caja: 12,
    cajas: 10, saldo: 10, estado: 'anulado', fecha: '2026-10-05' }),
];
rpc.acopios_lista = { __segun: [
  { si: { p_unidad_negocio_id: 'u-d', p_cliente_id: null }, r: ACOPIOS },
  ...['c-d-ros', 'c-dolce', 'c2-d', 'c-d-fer'].map(id => ({ si: { p_unidad_negocio_id: 'u-d', p_cliente_id: id }, r: ACOPIOS.filter(a => a.cliente_id === id) })),
], __defecto: [] };
t.acopios = ACOPIOS.map(a => ({ id: a.id, unidad_negocio_id: a.unidad_negocio_id, cliente_id: a.cliente_id, estado: a.estado === 'anulado' ? 'anulado' : 'activo',
  anulado_motivo: a.estado === 'anulado' ? 'Era de otro cliente' : null, anulado_en: a.estado === 'anulado' ? '2026-10-06T12:00:00Z' : null }));
t.acopio_movimientos = [
  { id: 'am-1', acopio_id: 'ac-1', orden_retiro_id: 'od4', orden_retiro_item_id: 'id4', cajas: -30, fecha: '2026-10-23', motivo: null, creado_en: '2026-10-23T14:00:00Z' },
  { id: 'am-2', acopio_id: 'ac-3', orden_retiro_id: 'od6', orden_retiro_item_id: null, cajas: -40, fecha: '2026-10-25', motivo: null, creado_en: '2026-10-25T14:00:00Z' },
  { id: 'am-3', acopio_id: 'ac-1', orden_retiro_id: 'od2', orden_retiro_item_id: null, cajas: -5, fecha: '2026-10-21', motivo: null, creado_en: '2026-10-21T14:00:00Z' },
  { id: 'am-4', acopio_id: 'ac-1', orden_retiro_id: 'od2', orden_retiro_item_id: null, cajas: 5, fecha: '2026-10-22', motivo: 'Se anuló la orden', creado_en: '2026-10-22T14:00:00Z' },
];
rpc.crear_acopio = 'ac-nuevo';
rpc.anular_acopio = null;

// ── El remito de acopio con un renglón que alcanza, uno que no y uno sin acopio ──
const rm4 = t.remitos_precarga.find(r => r.id === 'rm-4');
const item = (x) => ({ texto_leido: '', cantidad: null, presentacion_id: null, marca_id: null, insumo_id: null, lotes: [], revisar: false, omitir: false, nota: '', ...x });
rm4.items = [
  item({ texto_leido: 'Tallarín al huevo', cantidad: 30, presentacion_id: 'pr-d-tall' }),
  item({ texto_leido: 'Cono dulce 48 Leroma', cantidad: 25, presentacion_id: 'pr-d-cono', marca_id: 'm-ler' }),
  item({ texto_leido: 'Capelina', cantidad: 5, presentacion_id: 'pr-d-cap' }),
];

module.exports = base;
