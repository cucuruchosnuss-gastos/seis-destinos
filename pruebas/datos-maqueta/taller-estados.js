// Datos de la maqueta: Proyectos Taller en sus estados raros, como lo ve Tomás.
//  - la lista de proyectos que no se pudo cargar (5c);
//  - el valor de la hora sin cargar: las horas del proyecto quedan "sin
//    valor" y el margen dice "falta el valor de hora" (5a, abriendo un
//    proyecto con ?proyecto=).
// Se genera a e2e/maqueta/datos/taller-estados.json con `npm run maqueta:datos`.
'use strict';

const base = JSON.parse(JSON.stringify(require('./taller-diseno')));

base.tablas.taller_valor_hora = [];
base.rpc.proyectos_taller = {
  __segun: [],
  __defecto: 'ERROR:Failed to fetch',
};
// El soporte de Persicco, sin valor de hora: el costo de las horas en cero.
const persicco = base.rpc.resumen_proyecto.__segun.find(c => c.r.nombre === 'Soporte mensual Persicco').r;
Object.assign(persicco, {
  categoria: 'horas', cliente: { id: 'c-persicco', nombre: 'Persicco Córdoba SA', razon_social: 'Persicco Córdoba SA' },
  fecha_entrega_prometida: '2026-09-30', presupuesto_costo: 555000, horas_estimadas: 30, gastado: 0, horas: 22, costo_horas: 0, costo_total: 0,
  presupuesto_usado_pct: 0, horas_usadas_pct: 73, precio_venta: 900000, facturado: 0, cobrado: 0, margen: 900000, margen_pct: 100,
  horas_detalle: base.rpc.resumen_proyecto.__segun[0].r.horas_detalle,
});

module.exports = base;
