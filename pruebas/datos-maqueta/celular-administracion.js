// Datos de la maqueta: Administración para mirar en el celular la COMISIÓN de
// una orden y "Dar salida" de un cheque (10/10/2026,
// e2e/31-vistas-faltantes.spec.js). Ver pruebas/datos-maqueta/README.md.
//
// Parte de administracion.js SIN cambiarlo (lo usan muchas pruebas) y le suma
// la comisión habitual de Distribuidora Anatolia (c1) en 5 %: así la orden
// N-0012 (o12), valorizada y sin comisión, abre "Cargar comisión" con el
// porcentaje puesto, sin el truco de 'maqueta.cambios' de 27-comisiones.
//
//   http://localhost:4180/modulos/administracion.html?maqueta=celular-administracion
'use strict';

const base = JSON.parse(JSON.stringify(require('./administracion')));
for (const c of base.tablas.clientes) c.comision_habitual = c.id === 'c1' ? 5 : (c.comision_habitual ?? null);
base.rpc.cargar_comision_orden = { comision_importe: 32120.5, total_con_comision: 674530.5, factura_pendiente_id: 'fc1' };

module.exports = base;
