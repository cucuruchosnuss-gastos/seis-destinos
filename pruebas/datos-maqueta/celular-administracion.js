// Datos de la maqueta: Administración para mirar en el celular los PUNTOS DE
// VENTA de una orden (antes, su comisión común) y "Dar salida" de un cheque
// (10/10/2026, e2e/31-vistas-faltantes.spec.js). Ver pruebas/datos-maqueta/README.md.
//
// Parte de administracion.js SIN cambiarlo (lo usan muchas pruebas) y le suma
// la comisión habitual de Distribuidora Anatolia (c1) en 5 %. Desde el
// 28/10/2026 la orden N-0012 (o12), valorizada, abre debajo "Órdenes de pedido
// para facturar en ARCA": datos_division_orden responde su cuenta al 40 %.
//
//   http://localhost:4180/modulos/administracion.html?maqueta=celular-administracion
'use strict';

const base = JSON.parse(JSON.stringify(require('./administracion')));
for (const c of base.tablas.clientes) c.comision_habitual = c.id === 'c1' ? 5 : (c.comision_habitual ?? null);
base.rpc.cargar_comision_orden = { comision_importe: 32120.5, total_con_comision: 674530.5, factura_pendiente_id: 'fc1' };

// La cuenta de la N-0012 al 40 % (como la hace la base: el punto 1 lleva
// floor(cantidad × 40 %) y las comisiones de los vendedores).
const items = [
  { orden: 1, tipo: 'producto', descripcion: 'Cucurucho grande · Caja x 100', unidad: 'cajas', precio: 3000, cantidad: 5 },
  { orden: 2, tipo: 'producto', descripcion: 'Cucurucho grande · Caja x 100 · con cono', unidad: 'cajas', precio: 3250, cantidad: 6 },
].map(it => {
  const a = Math.floor(it.cantidad * 40 / 100);
  return { ...it, cant_a: a, cant_b: it.cantidad - a, subtotal_a: a * it.precio, subtotal_b: (it.cantidad - a) * it.precio };
});
const sa = items.reduce((s, it) => s + it.subtotal_a, 0);
const sb = items.reduce((s, it) => s + it.subtotal_b, 0);
const comisiones = [
  { vendedor_id: 'v1', nombre: 'Vendedor 1', orden: 1, pct: 2, monto: Math.round(sa * 2) / 100 },
  { vendedor_id: 'v2', nombre: 'Vendedor 2', orden: 2, pct: 0, monto: 0 },
];
const ct = comisiones.reduce((s, c) => s + c.monto, 0);
base.rpc.datos_division_orden = {
  orden_id: 'o12', codigo: 'N-0012', fecha: '2026-09-26', cliente: 'Distribuidora Anatolia', cliente_cuit: '30712345678',
  pct_a: 40, pct_b: 60, items, subtotal_a: sa, comisiones, comision_pct_total: 2, comision_total: ct,
  total_a: sa + ct, subtotal_b: sb, total_b: sb, total_orden: sa + sb, guardada: true, facturas: [],
};

module.exports = base;
