// Mutaciones de test-produccion-inicio-tarde.js (Inicio tarde de producción
// y el piso de la parada igualado a registrar_parada, 27/10/2026). Ver
// mutar.js y mutar-produccion.js.
//
//   node pruebas/mut-produccion-inicio-tarde.js
//
// UN RUNNER POR VEZ: dos corridas en paralelo se pisan el mut-tmp-*.html.

const path = require('path')
const { correrMutacionesProduccion } = require('./mutar-produccion')

correrMutacionesProduccion({
  suite: path.join(__dirname, 'test-produccion-inicio-tarde.js'),
  escape: 'esc',
  funciones: ['htmlAccionTarde', 'htmlHorasTarde', 'pintarTardeVentana'],
  soloPlanta: ['htmlAccionTarde', 'htmlHorasTarde', 'pintarTardeVentana'],
  equivalentes: [
    { expr: 'esc(textoMinutos(it.min))', motivo: 'la demora: textoMinutos() arma "2 h 53 min" con números' },
    { expr: 'esc(it.inicio)', motivo: 'sale de horaCorta(): "HH:MM" o vacío' },
    { expr: 'esc(it.largada)', motivo: 'sale de horaCorta(): "HH:MM" o vacío' },
    { expr: 'esc(muestraHoraTarde(f, c))', motivo: 'lo que se escribe con el teclado (solo dígitos) o una hora de normalizarHora()' },
    { expr: 'esc(c)', motivo: 'el campo: "inicio" o "largada", literales del código' },
    { expr: 'esc(rotulo)', motivo: 'las dos preguntas, literales del código' },
    { expr: 'esc(m)', motivo: 'los motivos son MOTIVOS_TARDE y «Otro», constantes del código' },
  ],
  manuales: [
    // ── 1 · El piso de la parada ───────────────────────────────────────
    { nombre: 'el piso vuelve a ser solo la apertura − 1 h (el bug del lote 6270)',
      de: '      const piso = inicios.length ? Math.min(...inicios) - PISO_APERTURA_MS',
      a: '      const piso = turno?.abierto_en ? new Date(turno.abierto_en).getTime() - PISO_APERTURA_MS' },
    { nombre: 'el piso toma la más tardía de las dos', de: 'inicios.length ? Math.min(...inicios)', a: 'inicios.length ? Math.max(...inicios)' },
    { nombre: 'el piso no mira la hora de inicio', de: "        hi && /^\\d{4}-\\d{2}-\\d{2}$/.test(String(turno?.fecha ?? '')) ? instanteAr(turno.fecha, hi) : NaN]", a: '        NaN]' },
    { nombre: 'el piso no mira la apertura', de: '      const inicios = [turno?.abierto_en ? new Date(turno.abierto_en).getTime() : NaN,', a: '      const inicios = [NaN,' },
    // ── 2 · La cuenta de la demora ─────────────────────────────────────
    { nombre: 'la demora no cruza la medianoche', de: '      return ((min(b) - min(a)) % 1440 + 1440) % 1440', a: '      return min(b) - min(a)' },
    { nombre: 'la demora al revés', de: '      return ((min(b) - min(a)) % 1440 + 1440) % 1440', a: '      return ((min(a) - min(b)) % 1440 + 1440) % 1440' },
    { nombre: 'la misma hora cuenta como inicio tarde', de: "      if (min === 0) return { error: 'Si empezó a producir a la hora del turno, no es un inicio tarde.' }", a: '' },
    { nombre: 'acepta más de 12 horas', de: "      if (min > MAX_TARDE_MIN) return { error: 'La demora no puede ser de más de 12 horas: revisá las horas.' }", a: '' },
    { nombre: 'en vivo no avisa la misma hora', de: "      if (min === 0) return { texto: 'Empezó a la hora del turno: no es un inicio tarde.', mal: true }", a: '' },
    { nombre: 'la largada se ubica con el inicio viejo', de: '      const ms = instanteLargada({ ...p?.turno, hora_inicio: hi }, hl)', a: '      const ms = instanteLargada(p?.turno, hl)' },
    { nombre: 'una largada futura se manda', de: '      if (p?.turno?.estado !== \'cerrado\' && ms != null && ms > new Date(ahora).getTime() + TOLERANCIA_FUTURO_MS) {\n        return { error: `Las ${hl} todavía no pasaron: la hora en que se empezó a producir no puede ser futura.` }', a: '      if (false) {\n        return { error: \'\' }' },
    { nombre: 'sin los 5 minutos de tolerancia', de: '      if (p?.turno?.estado !== \'cerrado\' && ms != null && ms > new Date(ahora).getTime() + TOLERANCIA_FUTURO_MS) {\n        return { error: `Las ${hl}', a: '      if (p?.turno?.estado !== \'cerrado\' && ms != null && ms > new Date(ahora).getTime()) {\n        return { error: `Las ${hl}' },
    { nombre: 'el inicio igual al fin se manda', de: "      if (hi === horaCorta(p?.turno?.hora_fin)) return { error: 'El turno no puede empezar y terminar a la misma hora.' }", a: '' },
    // ── 3 · El motivo obligatorio ──────────────────────────────────────
    { nombre: 'sin motivo elegido igual se manda', de: "      if (!f.motivo) return { error: 'Elegí por qué se empezó tarde.' }\n", a: '' },
    { nombre: '«Otro» sin texto se manda', de: "      if (motivo.length < 2) return { error: 'Contá por qué se empezó tarde (en «Otro»).' }", a: '' },
    { nombre: '«Otro» manda la palabra Otro', de: "      const motivo = f.motivo === 'Otro' ? String(f.otro ?? '').trim() : f.motivo", a: '      const motivo = f.motivo' },
    { nombre: '«Otro» no recorta los espacios', de: "      const motivo = f.motivo === 'Otro' ? String(f.otro ?? '').trim() : f.motivo", a: "      const motivo = f.motivo === 'Otro' ? String(f.otro ?? '') : f.motivo" },
    { nombre: 'Guardar no lee lo escrito en «Otro»', de: "      f.otro = document.getElementById('pr-tarde-ventana-otro').value\n", a: '' },
    { nombre: '«Otro» no muestra su campo', de: "      document.getElementById('pr-tarde-ventana-campo-otro').hidden = f.motivo !== 'Otro'", a: "      document.getElementById('pr-tarde-ventana-campo-otro').hidden = true" },
    // ── 4 · La ventana ─────────────────────────────────────────────────
    { nombre: 'no precarga la hora del turno', de: "      const inicio = it?.inicio || horarioDePlanilla(p).inicio || ''", a: "      const inicio = it?.inicio || ''" },
    { nombre: 'no precarga la largada al corregir', de: "      const largada = it?.largada || horaCorta(p.turno.hora_largada) || ''", a: "      const largada = ''" },
    { nombre: 'al corregir no reconoce «Otro»', de: "(MOTIVOS_TARDE.includes(it.motivo) ? it.motivo : 'Otro')", a: '(it.motivo)' },
    { nombre: 'no pasa sola a la hora de producir', de: "      if (h && f.buffer.length === 4 && f.campo === 'inicio') { f.campo = 'largada'; f.buffer = '' }\n", a: '' },
    { nombre: 'escribe siempre en la hora del turno', de: '      if (h) f[f.campo] = h', a: '      if (h) f.inicio = h' },
    { nombre: 'la demora no se muestra en vivo', de: '      dem.textContent = d.texto', a: "      dem.textContent = ''" },
    { nombre: 'manda otra operación', de: "      return { rpc: 'registrar_inicio_tarde', params:", a: "      return { rpc: 'registrar_hora_largada', params:" },
    { nombre: 'el rechazo de la base cierra la ventana', de: "        f.errorBase = r.error?.message || 'No se pudo guardar. Revisá la conexión y probá de nuevo.'\n        return pintarTardeVentana()", a: '        return cerrarTardeVentana()' },
    // ── 5 · La planilla ────────────────────────────────────────────────
    { nombre: 'la planilla no lee largada_motivo', de: "hora_inicio, hora_fin, hora_largada, largada_motivo')", a: "hora_inicio, hora_fin, hora_largada')" },
    { nombre: 'la línea del inicio tarde no se ve', de: "      document.getElementById('pr-aviso-tarde').hidden = !it", a: "      document.getElementById('pr-aviso-tarde').hidden = true" },
    { nombre: 'el botón no se pinta', de: '      tarde.innerHTML = htmlAccionTarde(p.turno)\n', a: '' },
    { nombre: 'sin motivo cuenta como inicio tarde', de: '      return motivo && min ? { inicio, largada, min, motivo } : null', a: '      return min ? { inicio, largada, min, motivo } : null' },
    { nombre: 'el texto no dice el motivo', de: "      return it ? `Inicio tarde: ${it.inicio} → ${it.largada} (${textoMinutos(it.min)}) · ${it.motivo}` : ''\n    }\n\n    // El botón", a: "      return it ? `Inicio tarde: ${it.inicio} → ${it.largada} (${textoMinutos(it.min)})` : ''\n    }\n\n    // El botón" },
    // ── 6 · Sin internet ───────────────────────────────────────────────
    { nombre: 'sin red, la planilla no muestra el inicio tarde que espera', de: "          Object.assign(turno, { hora_inicio: p.p_hora_inicio, hora_largada: p.p_hora_largada, largada_motivo: p.p_motivo })\n", a: '' },
  ],
})
