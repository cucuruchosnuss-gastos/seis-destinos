// Datos de la maqueta: produccion-pendiente (la PLANTA con una planilla
// PENDIENTE DE COMPLETAR, 09/10/2026). Ver pruebas/datos-maqueta/README.md.
//
// Son los datos de produccion.js más la planilla de la Máquina 3 del turno
// Noche del día anterior (lote 7030), cerrada a la fuerza: quedó
// 'pendiente_completar'. La Máquina 3 tiene que verse LIBRE en el tablero, con
// su "Abrir turno", y la pendiente en el aviso de arriba. Abrir manda
// ejecutar_tablet('abrir_turnos', …), que acá devuelve el lote 7036. Los usa
// e2e/29-planta-abrir-pendiente.spec.js.
'use strict';
const base = require('./produccion');

const d = JSON.parse(JSON.stringify(base));
d.tablas.turnos_produccion.push({
  id: 't3p', lote: 7030, maquina_id: 'maq-3', unidad_negocio_id: 'u-n', fecha: '2099-12-30', turno: 'Noche', encargado_id: 'emp-fede',
  estado: 'pendiente_completar', abierto_en: '2099-12-31T01:00:00Z', forzado_por: 'emp-fede', forzado_en: '2099-12-31T09:00:00Z',
  forzado_motivo: 'Se cortó la luz', hora_inicio: '22:00:00', hora_fin: null, hora_largada: null,
});
d.rpc.ejecutar_tablet = {
  __segun: [{ si: { p_operacion: 'abrir_turnos' }, r: { turnos: [{ maquina_id: 'maq-3', maquina: 'Máquina 3', turno_id: 't-nuevo', lote: 7036 }], reintento: false } }],
  __defecto: { reintento: false },
};

module.exports = d;
