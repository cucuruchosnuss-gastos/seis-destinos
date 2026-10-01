// Mutaciones de test-produccion-horarios.js (horarios de turno, la hora de fin
// del cierre, la limpieza en el medio y "Volvió con lote nuevo"; 01/10/2026).
// Ver mutar.js y mutar-produccion.js: cada mutación va al archivo donde está
// su código.
//
//   node pruebas/mut-produccion-horarios.js
//
// UN RUNNER POR VEZ: dos corridas en paralelo se pisan el mut-tmp-*.html.

const path = require('path')
const { correrMutacionesProduccion } = require('./mutar-produccion')

correrMutacionesProduccion({
  suite: path.join(__dirname, 'test-produccion-horarios.js'),
  escape: 'esc',
  funciones: ['htmlHorarioPlanilla', 'htmlAvisoRelanzado', 'htmlChipsFinCierre', 'htmlConfigHorarios'],
  soloPlanta: ['htmlHorarioPlanilla', 'htmlAvisoRelanzado', 'htmlChipsFinCierre'],
  soloGestion: ['htmlConfigHorarios'],
  equivalentes: [
    { expr: 'esc(c.hora)', motivo: 'c.hora la arma horaConPaso() del código: siempre "hh:mm", sin caracteres escapables' },
    { expr: 'esc(c.texto)', motivo: 'c.texto lo arma chipsFinTurno(): "14:00 · 8 h", del código' },
    { expr: 'esc(dur)', motivo: 'dur lo arma duracionHorario(): "9 h" / "8 h 36", del código' },
    { expr: 'esc(que)', motivo: 'que se arma con horas ya normalizadas ("06:00 – 15:00", "abierta 06:02"): solo dígitos, ":" y palabras del código' },
  ],
  manuales: [
    // El horario de la planilla.
    { nombre: 'el horario no se lee por unidad', de: ".select('turno, hora_inicio, hora_fin, activo').eq('unidad_negocio_id', unidadId).eq('turno', turno).eq('activo', true)", a: ".select('turno, hora_inicio, hora_fin, activo').eq('turno', turno).eq('activo', true)" },
    { nombre: 'sin horario se inventa una hora de fin', de: "      const fin = horaDeColumna(t.hora_fin) || h?.fin || null\n", a: "      const fin = horaDeColumna(t.hora_fin) || h?.fin || '15:00'\n" },
    { nombre: 'la planilla no dibuja el horario', de: "      document.getElementById('pr-planilla-horario').innerHTML = htmlHorarioPlanilla(p)\n", a: '' },
    { nombre: 'un horario que no se lee frena la planilla', de: "        console.error('horario del turno:', err)\n        return null\n", a: "        throw err\n" },
    // Corregir el inicio.
    { nombre: 'corregir el inicio también pisa la hora de fin', de: "params: { p_turno_id: f.turnoId, p_hora_inicio: h, p_hora_fin: null } }", a: "params: { p_turno_id: f.turnoId, p_hora_inicio: h, p_hora_fin: h } }" },
    { nombre: 'el error de la ventana se tapa', de: "        f.errorBase = e?.message || 'No se pudo guardar. Revisá la conexión y probá de nuevo.'\n        return pintarHoraVentana()", a: "        f.errorBase = 'No se pudo guardar. Revisá la conexión y probá de nuevo.'\n        return pintarHoraVentana()" },
    { nombre: 'la ventana no se destraba después del error', de: "        console.error(pedido.rpc + ':', e)\n        f.enviando = false\n", a: "        console.error(pedido.rpc + ':', e)\n" },
    { nombre: 'una hora tipeada que no existe se manda', de: "      if (f.buffer && !(f.buffer.length >= 3 && normalizarHora(f.buffer))) return { error: 'Esa hora no existe. Escribila con 4 números, por ejemplo 0930.' }\n", a: '' },
    // El cierre.
    { nombre: 'la hora de fin no viene marcada', de: "      if (!normalizarHora(estado.cierre.fin)) estado.cierre.fin = horasDelTurno(p).fin || ''\n", a: '' },
    { nombre: 'los chips de 8 y 9 h pasan a 7 y 8', de: 'return [8, 9].map(h =>', a: 'return [7, 8].map(h =>' },
    { nombre: 'p_hora_fin no viaja', de: "        p_hora_fin: normalizarHora(b.fin) || null,\n", a: '' },
    { nombre: 'la hora de fin deja de ser obligatoria', de: "      if (!normalizarHora(b.fin)) {\n        faltan.push({ campo: 'fin',", a: "      if (false) {\n        faltan.push({ campo: 'fin'," },
    { nombre: 'el fin de un turno de noche cae el mismo día', de: '      const otroDia = !!inicio && f <= inicio\n', a: '      const otroDia = false\n' },
    { nombre: 'la parada hasta el fin no se avisa en lo que falta', de: "      if (hastaFin) avisos.push({ texto: hastaFin.texto, ir: 'paradas', boton: 'Ir a Paradas' })\n", a: '' },
    { nombre: 'la parada hasta el fin no se avisa al confirmar', de: '        if (hasta) avisos.push(hasta.texto)\n', a: '' },
    { nombre: 'la parada se cuenta en segundos', de: '      const minutos = Math.round((ms - ini) / 60000)\n', a: '      const minutos = Math.round((ms - ini) / 1000)\n' },
    { nombre: 'el chip elegido no escribe la hora de fin', de: "      document.getElementById('pr-cierre-fin').value = h\n      cambioEnCierre()", a: "      cambioEnCierre()" },
    // La parada en curso y el lote nuevo.
    { nombre: '"lote nuevo" también con la planilla pendiente', de: "      document.getElementById('pr-btn-relanzar').hidden = !enCurso || !abierta\n", a: "      document.getElementById('pr-btn-relanzar').hidden = !enCurso\n" },
    { nombre: 'relanzar abre sin turno abierto', de: "        if (!enCurso || p.turno.estado !== 'abierto') return\n", a: '        if (!enCurso) return\n' },
    { nombre: '"Ahora" manda la hora de la tablet', de: "if (f.ahora) return { rpc: 'relanzar_con_lote_nuevo', params: { p_parada_id: f.paradaId, p_hora: null } }", a: "if (f.ahora) return { rpc: 'relanzar_con_lote_nuevo', params: { p_parada_id: f.paradaId, p_hora: isoAr(new Date(ahora).getTime()) } }" },
    { nombre: 'una hora futura se manda como de ayer', de: "          if (!(Number.isFinite(ini) && ms - MS_DIA > ini)) return { error: `Las ${h} todavía no pasaron: poné la hora en que volvió, o tocá «Ahora».` }\n", a: '' },
    { nombre: 'una hora anterior a la parada se manda', de: "        if (Number.isFinite(ini) && ms <= ini) return { error:", a: "        if (false) return { error:" },
    { nombre: 'después de relanzar no se abre la planilla nueva', de: '      if (res?.turno_id) return abrirPlanilla(res.turno_id)\n', a: '' },
    { nombre: 'el aviso de relanzado no se guarda', de: '      estado.avisoRelanzado = { turnoId: res?.turno_id ?? null, texto }\n', a: '' },
    { nombre: 'el aviso de relanzado dice otro lote', de: "Ahora la ${maquinaNombre || 'máquina'} sigue con el lote ${res?.lote ?? '—'}", a: "Ahora la ${maquinaNombre || 'máquina'} sigue con el lote ${res?.lote_viejo ?? '—'}" },
    // Pendientes: relanzada contra forzada.
    { nombre: 'una relanzada se lee como forzada (planilla)', de: "      if (t.estado === 'pendiente_completar' && !t.forzado_por) {\n", a: "      if (false) {\n" },
    { nombre: 'una relanzada se lee como forzada (tablero)', de: '      const relanzadas = lista.filter(t => !t.forzado_por).length\n', a: '      const relanzadas = 0\n' },
    { nombre: 'los pendientes no traen forzado_por', de: ".select('id, lote, maquina_id, fecha, turno, forzado_por').eq('unidad_negocio_id', unidadId).eq('estado', 'pendiente_completar')", a: ".select('id, lote, maquina_id, fecha, turno').eq('unidad_negocio_id', unidadId).eq('estado', 'pendiente_completar')" },
    // Las paradas.
    { nombre: 'la parada en curso no dice hasta cuándo', de: "${finTurno ? ` · se cuenta hasta las ${finTurno} si no vuelve` : ''}`", a: "`" },
    { nombre: 'la lista no recibe la hora de fin', de: "innerHTML = htmlParadasTurno(p.paradas, finTurno)", a: "innerHTML = htmlParadasTurno(p.paradas)" },
    { nombre: 'una pendiente también dice hasta cuándo', de: '      const finTurno = abierta ? horasDelTurno(p).fin : null\n', a: '      const finTurno = horasDelTurno(p).fin\n' },
    // La limpieza.
    { nombre: 'la limpieza "en el medio" no se ofrece', de: " + boton('medio', 'En el medio') + ", a: ' + ' },
    { nombre: 'empezó ahora vuelve a pedir la duración', de: "      if (f.duracion === 'sigue') return { minutos: null }\n", a: "      if (f.duracion === 'sigue') { if (f.limpieza !== 'arranque') return { error: 'Elegí cuánto duró.' }; return { minutos: null } }\n" },
    { nombre: 'p_minutos de "empezó ahora" no va en null', de: 'p_momento: f.limpieza, p_minutos: r.minutos ?? null }', a: 'p_momento: f.limpieza, p_minutos: r.minutos ?? 5 }' },
    { nombre: 'el momento siempre "final"', de: 'p_momento: f.limpieza, p_minutos', a: "p_momento: f.limpieza === 'arranque' ? 'arranque' : 'final', p_minutos" },
    { nombre: '"Al arrancar" cuenta desde la apertura', de: "      if (h && /^\\d{4}-\\d{2}-\\d{2}$/.test(String(turno?.fecha ?? ''))) return instanteAr(turno.fecha, h)\n", a: '' },
    { nombre: 'empezó ahora con otra parada en curso se manda', de: "      if (!f.limpieza || r.error) return false\n      if (r.minutos === null) return true\n", a: "      if (!f.limpieza || r.error) return false\n      if (r.minutos === null) return false\n" },
    // La gestión: Horarios de turno.
    { nombre: 'Horarios no está en el segmentado', de: "      ['horarios', 'Horarios'],\n", a: '' },
    { nombre: 'los horarios no se leen por unidad', de: ".select('turno, hora_inicio, hora_fin, activo').eq('unidad_negocio_id', c.unidadId)", a: ".select('turno, hora_inicio, hora_fin, activo')" },
    { nombre: 'guardar no manda p_activo', de: ', p_hora_fin: fin, p_activo: h.activo !== false } }', a: ', p_hora_fin: fin } }' },
    { nombre: 'guardar sin hora de fin se manda', de: "      if (!fin) return { error: `Escribí a qué hora termina el turno ${turno}, por ejemplo 15:00.` }\n", a: '' },
    { nombre: 'el error de guardar no va pegado a la fila', de: "        r = await guardarEnConfig('guardar_horario_turno', r0.params, `Horario del turno ${turno} guardado.`, DONDE)", a: "        r = await guardarEnConfig('guardar_horario_turno', r0.params, `Horario del turno ${turno} guardado.`, null)" },
    { nombre: 'lo escrito se pierde al repintar', de: "      return { ...horarioGuardado(c?.datos, turno), ...(c?.horBorrador?.[turno] ?? {}) }", a: "      return { ...horarioGuardado(c?.datos, turno) }" },
    { nombre: 'el botón de guardar no se destraba', de: "      } finally {\n        c.horGuardando = null\n      }", a: "      } finally {\n      }" },
    { nombre: 'después de guardar no se vuelve a leer', de: "      if (r?.ok) { delete c.horBorrador?.[turno]; await cargarPestanaConfig() }", a: "      if (r?.ok) { delete c.horBorrador?.[turno] }" },
    { nombre: 'la duración no cruza la medianoche', de: '      if (min <= 0) min += 24 * 60\n', a: '' },
    // La gestión: el historial.
    { nombre: 'historial: una relanzada se lee como forzada', de: "      const [clase, texto] = esRelanzado(t) ? ['pendiente', 'Falta completar (productos y scrap)'] :", a: "      const [clase, texto] = false ? ['pendiente', 'Falta completar (productos y scrap)'] :" },
    { nombre: 'historial: sin la columna se adivina relanzada', de: "Object.prototype.hasOwnProperty.call(t, 'forzado_por') && t.forzado_por == null", a: 't.forzado_por == null' },
    { nombre: 'historial: el horario usa el cierre y no la hora de fin', de: "(String(t.hora_fin ?? '').slice(0, 5) || horaArgentina(t.cerrado_en) || '—')", a: "(horaArgentina(t.cerrado_en) || '—')" },
    { nombre: 'historial: la parada en curso no dice hasta cuándo', de: "${finTurno ? ` · se cuenta hasta las ${esc(finTurno)} si no vuelve` : ''}", a: '' },
    { nombre: 'historial: finTurnoAbierto ignora el horario', de: "      return normalizarHora(String(d.turno.hora_fin ?? '').slice(0, 5)) || d.finHorario || null\n", a: "      return normalizarHora(String(d.turno.hora_fin ?? '').slice(0, 5)) || null\n" },
    { nombre: 'historial: finTurnoAbierto también en un cerrado', de: "      if (d?.turno?.estado !== 'abierto') return null\n      return normalizarHora", a: '      return normalizarHora' },
  ],
})
