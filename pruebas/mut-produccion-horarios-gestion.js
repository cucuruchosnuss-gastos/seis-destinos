// Mutaciones de test-produccion-horarios-gestion.js (Horarios de turno en la
// gestión, la planilla relanzada y la parada que no volvió). Ver mutar.js.
//
//   node pruebas/mut-produccion-horarios-gestion.js
//
// UN RUNNER POR VEZ: dos corridas en paralelo se pisan el mut-tmp-*.html.

const path = require('path')
const { correrMutacionesProduccion } = require('./mutar-produccion')

correrMutacionesProduccion({
  suite: path.join(__dirname, 'test-produccion-horarios-gestion.js'),
  escape: 'esc',
  funciones: ['htmlConfigHorarios'],
  soloGestion: ['htmlConfigHorarios'],
  equivalentes: [
    { expr: 'esc(turno)', motivo: 'el turno sale de TURNOS_HORARIO (Mañana, Tarde, Noche), constante del código' },
    { expr: 'esc(dur)', motivo: 'duracionHorario() arma "9 h" / "8 h 36" con números' },
    { expr: 'esc(DONDE)', motivo: 'id armado con la clave constante de TURNOS_HORARIO (manana, tarde, noche)' },
  ],
  manuales: [
    { nombre: 'guardar sin p_activo', de: ', p_activo: h.activo !== false } }', a: ' } }' },
    { nombre: 'sin la hora de fin se manda', de: "      if (!fin) return { error: `Escribí a qué hora termina el turno ${turno}, por ejemplo 15:00.` }\n", a: '' },
    { nombre: 'sin la hora de inicio se manda', de: "      if (!inicio) return { error: `Escribí a qué hora empieza el turno ${turno}, por ejemplo 06:00.` }\n", a: '' },
    { nombre: 'no vuelve a leer después de guardar', de: '      if (r?.ok) { delete c.horBorrador?.[turno]; await cargarPestanaConfig() }', a: '      if (r?.ok) { delete c.horBorrador?.[turno] }' },
    { nombre: 'la duración no cruza la medianoche', de: '      if (min <= 0) min += 24 * 60\n', a: '' },
    { nombre: 'la sección no está en el segmentado', de: "      ['horarios', 'Horarios'],\n", a: '' },
    { nombre: 'la relanzada dice "Pendiente de completar"', de: "      return t?.estado === 'pendiente_completar' && !!t && Object.prototype.hasOwnProperty.call(t, 'forzado_por') && t.forzado_por == null && !t.forzado_motivo", a: '      return false' },
    { nombre: 'sin forzado_por en la consulta se adivina', de: "Object.prototype.hasOwnProperty.call(t, 'forzado_por') && t.forzado_por == null", a: 't.forzado_por == null' },
    { nombre: 'la parada en curso no dice hasta cuándo', de: "${finTurno ? ` · se cuenta hasta las ${esc(finTurno)} si no vuelve` : ''}", a: '' },
    { nombre: 'finTurnoAbierto también con la cerrada', de: "      if (d?.turno?.estado !== 'abierto') return null\n      return normalizarHora", a: '      return normalizarHora' },
    { nombre: 'el fin del turno no cruza la medianoche', de: '      return instanteAr(turno.fecha, fin) + (ini && fin <= ini ? MS_DIA : 0)', a: '      return instanteAr(turno.fecha, fin)' },
    { nombre: 'la cerrada no llega al fin del turno', de: "      const finTurno = turno?.estado !== 'abierto' ? finDelTurnoMs(turno) : null", a: '      const finTurno = null' },
    { nombre: 'la nota de "no volvió" al revés', de: '      return igual\n        ? `<p class="pr-hp__resumen">Sigue marcada', a: '      return !igual\n        ? `<p class="pr-hp__resumen">Sigue marcada' },
  ],
})
