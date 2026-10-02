// Mutaciones de test-produccion-horarios-base.js (la planta contra la base
// simulada: el cierre con la hora de fin, la limpieza que empieza ahora,
// "Volvió con lote nuevo", corregir el inicio y la marca "no volvió" al
// corregir una parada; 01/10/2026). Ver mutar.js y mutar-produccion.js.
//
//   node pruebas/mut-produccion-horarios-base.js
//
// UN RUNNER POR VEZ: dos corridas en paralelo se pisan el mut-tmp-*.html.

const path = require('path')
const { correrMutacionesProduccion } = require('./mutar-produccion')

correrMutacionesProduccion({
  suite: path.join(__dirname, 'test-produccion-horarios-base.js'),
  escape: 'esc',
  funciones: [],
  manuales: [
    // El cierre.
    { nombre: 'p_hora_fin no viaja (la base usaría el horario igual: se mide el chip)', de: "        p_hora_fin: normalizarHora(b.fin) || null,\n", a: '' },
    { nombre: 'la hora de fin no viene marcada', de: "      if (!normalizarHora(estado.cierre.fin)) estado.cierre.fin = horasDelTurno(p).fin || ''\n", a: '' },
    { nombre: 'el chip de 8 h pasa a 7 h', de: 'return [8, 9].map(h =>', a: 'return [7, 9].map(h =>' },
    { nombre: 'elegir un chip no cambia la hora de fin', de: "      document.getElementById('pr-cierre-fin').value = h\n      cambioEnCierre()\n", a: "      cambioEnCierre()\n" },
    // La limpieza.
    { nombre: 'la limpieza que empezó ahora manda una duración', de: "p_minutos: r.minutos ?? null }]", a: "p_minutos: r.minutos ?? 10 }]" },
    { nombre: 'la limpieza al terminar va como "en el medio"', de: "return ['registrar_limpieza_planchas', { p_turno_id: p.turno.id, p_momento: f.limpieza,", a: "return ['registrar_limpieza_planchas', { p_turno_id: p.turno.id, p_momento: 'medio'," },
    // Volvió con lote nuevo.
    { nombre: 'lote nuevo no abre la planilla nueva', de: "      if (res?.turno_id) return abrirPlanilla(res.turno_id)\n", a: '' },
    { nombre: 'lote nuevo manda una hora propia en vez de la del servidor', de: "        if (f.ahora) return { rpc: 'relanzar_con_lote_nuevo', params: { p_parada_id: f.paradaId, p_hora: null } }", a: "        if (f.ahora) return { rpc: 'relanzar_con_lote_nuevo', params: { p_parada_id: f.paradaId, p_hora: isoAr(new Date(ahora).getTime() - 600000) } }" },
    { nombre: 'una hora escrita para el lote nuevo se corre un día', de: "        return { rpc: 'relanzar_con_lote_nuevo', params: { p_parada_id: f.paradaId, p_hora: isoAr(ms) } }", a: "        return { rpc: 'relanzar_con_lote_nuevo', params: { p_parada_id: f.paradaId, p_hora: isoAr(ms - 60000) } }" },
    // Corregir el inicio.
    { nombre: 'corregir el inicio también pisa la hora de fin', de: "params: { p_turno_id: f.turnoId, p_hora_inicio: h, p_hora_fin: null } }", a: "params: { p_turno_id: f.turnoId, p_hora_inicio: h, p_hora_fin: h } }" },
    // La marca "no volvió" al corregir una parada (planta y gestión).
    { nombre: 'el tope de la vuelta ignora el fin del turno', archivo: 'ambos',
      de: "      const tope = Math.max(Math.min(new Date(ahora).getTime(), cerrado ? new Date(turno.cerrado_en).getTime() : Infinity), finTurno ?? -Infinity) + TOLERANCIA_FUTURO_MS\n",
      a: "      const tope = Math.min(new Date(ahora).getTime(), cerrado ? new Date(turno.cerrado_en).getTime() : Infinity) + TOLERANCIA_FUTURO_MS\n" },
    { nombre: 'el fin del turno extiende el tope también con el turno abierto', archivo: 'ambos',
      de: "      const finTurno = turno?.estado !== 'abierto' ? finDelTurnoMs(turno) : null\n",
      a: "      const finTurno = finDelTurnoMs(turno)\n" },
    { nombre: 'el turno de noche no pasa al día siguiente', archivo: 'ambos',
      de: "      return instanteAr(turno.fecha, fin) + (ini && fin <= ini ? MS_DIA : 0)\n", a: "      return instanteAr(turno.fecha, fin)\n" },
    { nombre: 'sin hora de fin se inventa una', archivo: 'ambos',
      de: "      const fin = normalizarHora(String(turno?.hora_fin ?? '').slice(0, 5))\n      if (!fin ||",
      a: "      const fin = normalizarHora(String(turno?.hora_fin ?? '').slice(0, 5)) || '15:00'\n      if (!fin ||" },
    { nombre: 'la nota de "no volvió" no se dibuja', archivo: 'ambos',
      de: "        resumen.innerHTML = htmlNotaNoVolvio(f)\n", a: "        resumen.innerHTML = ''\n" },
    { nombre: 'la nota dice "sigue marcada" con otra vuelta', archivo: 'ambos',
      de: "      const igual = !h.error && !!h.fin && new Date(h.fin).getTime() === new Date(f.parada.fin).getTime()\n",
      a: "      const igual = !h.error && !!h.fin\n" },
    { nombre: 'la nota aparece en una parada que volvió', archivo: 'ambos',
      de: "      if (f?.modo !== 'editar' || !f.parada?.hasta_fin_de_turno || !f.parada.fin) return ''\n",
      a: "      if (f?.modo !== 'editar' || !f.parada.fin) return ''\n" },
  ],
})
