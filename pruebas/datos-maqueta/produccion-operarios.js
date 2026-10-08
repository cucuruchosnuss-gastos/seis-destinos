// Datos de la maqueta: produccion-operarios (los operarios cuando termina una
// planilla, 08/10/2026). Ver pruebas/datos-maqueta/README.md.
//
// Son los datos de produccion.js más:
//  - la planilla de la MAÑANA de la Máquina 3, ya CERRADA, con Gómez Rodrigo
//    y su hora de salida (la base se la pone al cerrar): en Abrir turno se
//    tiene que poder elegir, no está ocupado;
//  - una planilla de la Máquina 5 pendiente de completar con Sosa Marcela SIN
//    hora de salida (un dato viejo): tampoco la ocupa.
// Ramón Díaz sigue sin salida en la Máquina 1 (abierta): ese sí está ocupado.
// Los usa e2e/28-planta-operarios-fin.spec.js.
'use strict';
const base = require('./produccion');

const d = JSON.parse(JSON.stringify(base));
const DIA = '2099-12-31';
const hora = (hhmm) => `${DIA}T${hhmm}:00Z`;
const t1 = d.tablas.turnos_produccion.find(t => t.id === 't1');
d.tablas.turnos_produccion.push(
  { ...t1, id: 't-man', lote: 7031, maquina_id: 'maq-3', estado: 'cerrado', abierto_en: hora('09:00'), hora_fin: '18:00:00' },
  { ...t1, id: 't-vie', lote: 7032, maquina_id: 'maq-5', estado: 'pendiente_completar', abierto_en: hora('09:00') },
);
d.tablas.turno_operarios.push(
  { turno_id: 't-man', empleado_id: 'emp-op2', desde: hora('09:00'), hasta: hora('21:00') },
  { turno_id: 't-vie', empleado_id: 'emp-op3', desde: hora('09:00'), hasta: null },
);

module.exports = d;
