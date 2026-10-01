// Datos de la maqueta: produccion-horarios (la PLANTA con el horario del
// turno, 01/10/2026). Ver pruebas/datos-maqueta/README.md.
//
// Son los datos de produccion.js (que ya traen horarios_turno: Mañana 06:00 –
// 15:00) con dos cosas más:
//  - una planilla que quedó PARA COMPLETAR porque la máquina siguió con un
//    lote nuevo ("Volvió con lote nuevo"): el lote 7030 de la Máquina 3, en
//    pendiente_completar, SIN forzado_por y con su hora de fin (13:50). El
//    tablero dice "1 planilla falta completar (productos y scrap)".
//  - la Máquina 2 (lote 7034) sigue con su parada ABIERTA ("Corte de
//    cadena", desde las 10:32 UTC): ahí aparecen "Volvió con el mismo lote"
//    y "Volvió con lote nuevo", y en el cierre el aviso de que la parada se
//    cuenta hasta la hora de fin del turno.
// Los usa e2e/19-planta-horarios.spec.js.
'use strict';
const base = require('./produccion');

const d = JSON.parse(JSON.stringify(base));
d.tablas.turnos_produccion.push({
  id: 't9', lote: 7030, maquina_id: 'maq-3', unidad_negocio_id: 'u-n', fecha: '2099-12-31', turno: 'Mañana', encargado_id: 'emp-fede',
  estado: 'pendiente_completar', abierto_en: '2099-12-31T09:00:00Z', forzado_por: null, forzado_en: null, forzado_motivo: null,
  hora_inicio: '06:00:00', hora_fin: '13:50:00',
});
d.rpc.relanzar_con_lote_nuevo = { lote_viejo: 7034, turno_id: 't2', lote: 7036 };

module.exports = d;
