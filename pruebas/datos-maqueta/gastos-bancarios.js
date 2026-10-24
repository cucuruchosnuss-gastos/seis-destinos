// Datos de la maqueta: los GASTOS DEL BANCO (24/10/2026, importe completo de
// los cheques). Ver pruebas/datos-maqueta/README.md.
//
// Parte de los datos de Gastos (gastos.js) sin cambiarlos y suma:
//  - la categoría "Gastos bancarios y comisiones" con su id REAL (leído en
//    `categorias` el 24/10/2026; antes se llamaba como los intereses de la
//    venta de cheques), que es el que manda el botón de la cartera de cheques;
//  - dos gastos del 24/10/2026: uno de esa categoría (la comisión del banco) y
//    uno de Repuestos, para mirar que el filtro por categoría deja solo el
//    primero.
//
//   http://localhost:4180/modulos/gastos.html?maqueta=gastos-bancarios&nuevo=1&categoria=7041825a-5a0c-484b-be07-17f9978a0d97
'use strict';

const gastos = require('./gastos');

const copia = (x) => JSON.parse(JSON.stringify(x));
const base = copia(gastos);
const t = base.tablas;

const BANCARIOS = { id: '7041825a-5a0c-484b-be07-17f9978a0d97', nombre: 'Gastos bancarios y comisiones', icon: 'landmark' };
t.categorias.push({ ...BANCARIOS, activo: true });

const molde = t.gastos[0];
const delDia = (id, razon, importe, cat, extra = {}) => Object.assign(copia(molde), {
  id, fecha: '2026-10-24', fecha_pago: '2026-10-24', periodo: 'oct-26', numero_doc: '0001-000099' + id.slice(-2),
  razon_social: razon, importe, categoria_id: cat.id, categorias: { id: cat.id, nombre: cat.nombre, icon: cat.icon ?? null },
}, extra);

t.gastos.push(
  delDia('g-b1', 'Banco Macro · comisión', 12500, BANCARIOS, { medio_pago: 'transferencia' }),
  delDia('g-b2', 'Repuestos del día', 8000, { id: 'c-rep', nombre: 'Repuestos' }),
);

module.exports = base;
