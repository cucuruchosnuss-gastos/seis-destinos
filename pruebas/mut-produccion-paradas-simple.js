// Mutaciones de test-produccion-paradas-simple.js (Paró y Terminó de producir,
// 05/10/2026, y en la gestión la limpieza y la organización aparte de las
// fallas). Ver mutar.js y mutar-produccion.js: cada mutación va al archivo
// donde está su código.
//
//   node pruebas/mut-produccion-paradas-simple.js
//
// UN RUNNER POR VEZ: dos corridas en paralelo se pisan el mut-tmp-*.html.

const path = require('path')
const { correrMutacionesProduccion } = require('./mutar-produccion')

correrMutacionesProduccion({
  suite: path.join(__dirname, 'test-produccion-paradas-simple.js'),
  escape: 'esc',
  funciones: ['htmlMotivosAgrupados', 'htmlAccionParo', 'htmlParadasTurno', 'htmlAvisoRelanzado', 'htmlAccionLargada', 'renderParadasSemana'],
  soloPlanta: ['htmlMotivosAgrupados', 'htmlAccionParo', 'htmlParadasTurno', 'htmlAvisoRelanzado', 'htmlAccionLargada'],
  soloGestion: ['renderParadasSemana'],
  equivalentes: [
    { expr: 'esc(clave)', motivo: 'la clave del grupo sale de GRUPOS_MOTIVO (programada, falla, organizativa, otro): ningún carácter escapable' },
    { expr: 'esc(g.titulo)', motivo: 'el título del grupo sale de GRUPOS_MOTIVO (Limpiezas, Fallas, Organización, Otro): ningún carácter escapable' },
    { expr: 'esc(h)', motivo: 'htmlAccionLargada: h sale de horaCorta(), que solo devuelve "HH:MM" o vacío' },
    { expr: 'esc(dur)', motivo: 'htmlParadasTurno: la duración la arma textoDuracion() con números' },
    { expr: 'esc(NOMBRE_CATEGORIA_PARADA[cat])', motivo: 'constante del código (Limpieza, Falla, Organización, Otro)' },
    { expr: 'esc(cat)', motivo: 'cat solo puede ser una clave de NOMBRE_CATEGORIA_PARADA (si no, es null y no se dibuja)' },
    { expr: 'esc(clases)', motivo: 'clases CSS constantes del código' },
    { expr: 'esc(dato)', motivo: 'htmlAccionParo: el dato son horas (horaArgentina), conteos y textoMinutos(); el motivo va en el sub, escapado' },
    { expr: 'esc(horas)', motivo: 'htmlParadasTurno: las horas salen de horaArgentina() ("HH:MM") y de textos fijos' },
  ],
  manuales: [
    // Las tres acciones.
    { nombre: 'la largada no se ve en la planilla', de: '      largada.innerHTML = htmlAccionLargada(p.turno)\n', a: '' },
    { nombre: 'el aviso de la largada no se esconde', de: "      document.getElementById('pr-aviso-largada').hidden = !faltaLargada(p.turno)\n", a: "      document.getElementById('pr-aviso-largada').hidden = false\n" },
    { nombre: 'la largada no se manda', de: "        return { rpc: 'registrar_hora_largada', params: { p_turno_id: f.turnoId, p_hora: h } }", a: "        return { local: true, hora: h }" },
    { nombre: 'la largada futura se manda', de: "        if (p?.turno?.estado !== 'cerrado' && ms != null && ms > new Date(ahora).getTime() + TOLERANCIA_FUTURO_MS) {", a: '        if (false) {' },
    { nombre: 'la ventana no sugiere la hora de ahora', de: "      return turno?.estado === 'abierto' || !turno?.estado ? horaArgentina(ahora) : horaDeReferencia(turno, ahora)", a: "      return ''" },
    { nombre: '"Ahora" también en una pendiente', de: "      return p?.turno?.estado === 'abierto'\n    }\n\n    function htmlHoraVentana", a: "      return true\n    }\n\n    function htmlHoraVentana" },
    { nombre: 'una hora a medio escribir se toma', de: "      if (f.buffer && !(f.buffer.length >= 3 && normalizarHora(f.buffer))) return { error: 'Esa hora no existe. Escribila con 4 números, por ejemplo 0640.' }", a: '' },
    { nombre: 'el error de la ventana se tapa', de: "        f.errorBase = e?.message || 'No se pudo guardar. Revisá la conexión y probá de nuevo.'", a: "        f.errorBase = 'No se pudo guardar. Revisá la conexión y probá de nuevo.'" },
    // Los motivos agrupados.
    { nombre: 'los grupos en otro orden', de: "    const GRUPOS_MOTIVO = [['programada', 'Limpiezas'], ['falla', 'Fallas'], ['organizativa', 'Organización'], ['otro', 'Otro']]", a: "    const GRUPOS_MOTIVO = [['falla', 'Fallas'], ['programada', 'Limpiezas'], ['organizativa', 'Organización'], ['otro', 'Otro']]" },
    { nombre: 'una categoría desconocida se pierde', de: "      return GRUPOS_MOTIVO.some(([k]) => k === m?.categoria) ? m.categoria : 'otro'", a: '      return m?.categoria' },
    { nombre: 'los motivos no se ordenan', de: 'const lista = [...(data ?? [])].sort((a, b) => (Number(a.orden) || 0) - (Number(b.orden) || 0))', a: 'const lista = [...(data ?? [])]' },
    { nombre: 'sin los motivos no se puede escribir', de: "      if (motivos === null) return String(f?.textoLibre ?? '').trim()\n", a: "      if (motivos === null) return ''\n" },
    { nombre: '"Otro motivo" guarda sin detalle', de: "        else if (m.pide_detalle && String(f.detalle ?? '').trim().length < 2) faltan.push('Escribí qué pasó.')", a: '' },
    { nombre: 'el detalle no viaja con el motivo', de: "      return d ? `${m.nombre}: ${d}` : m.nombre\n    }\n\n    // \"1 h\"", a: "      return m.nombre\n    }\n\n    // \"1 h\"" },
    // DESDE / HASTA / Todavía está parada.
    { nombre: 'sin DESDE se manda', de: "      if (!normalizarHora(f.inicio)) return { error: 'Poné desde qué hora estuvo parada.' }\n", a: '' },
    { nombre: 'sin HASTA se manda abierta', de: "      if (!f.sigue && !normalizarHora(f.fin)) return { error: 'Poné hasta qué hora estuvo parada, o «Todavía está parada».' }\n", a: '' },
    { nombre: '"Todavía está parada" no la deja abierta', de: "      return resolverHorasParada({ inicio: f.inicio, fin: f.fin, sigue: !!f.sigue }, turno, ahora)", a: "      return resolverHorasParada({ inicio: f.inicio, fin: f.fin || f.inicio, sigue: false }, turno, ahora)" },
    { nombre: '"Todavía está parada" con otra en curso', de: '      const sigueApagada = !puedeQuedarAbierta(p) && !f.sigue\n', a: '      const sigueApagada = false\n' },
    { nombre: 'HASTA queda puesto al marcar "Todavía está parada"', de: "      if (f.sigue) { f.fin = ''; f.loteNuevo = false }", a: '' },
    { nombre: 'el botón se traba por lo que falta', de: '      g.disabled = !!f.enviando\n      g.textContent = f.enviando ? \'Guardando…\' : \'Guardar la parada\'', a: '      g.disabled = !!f.enviando || faltanParaParadaNueva(f, p, ahora).length > 0\n      g.textContent = f.enviando ? \'Guardando…\' : \'Guardar la parada\'' },
    { nombre: 'el error de la base de la parada se tapa', de: "        f.errorBase = e?.message || 'No se pudo guardar la parada. Revisá la conexión y probá de nuevo.'\n        return pintarResumenParada(ahora)", a: "        f.errorBase = 'No se pudo guardar la parada. Revisá la conexión y probá de nuevo.'\n        return pintarResumenParada(ahora)" },
    { nombre: 'el formulario no vuelve a empezar', de: '      estado.paradaNueva = paradaNuevaVacia(p.turno)\n      if (!loteNuevo) {', a: '      if (!loteNuevo) {' },
    { nombre: 'el botón de volver no suelta las horas', de: "      if (f.inicio || f.fin || f.sigue) return 'horas'\n", a: '' },
    // Volvió con lote nuevo.
    { nombre: 'con lote nuevo la parada entra cerrada', de: '      return [\'registrar_parada\', { p_turno_id: p.turno.id, p_motivo: textoParadaNueva(f, motivos), p_inicio: h.inicio, p_fin: loteNuevo ? null : h.fin }]', a: '      return [\'registrar_parada\', { p_turno_id: p.turno.id, p_motivo: textoParadaNueva(f, motivos), p_inicio: h.inicio, p_fin: h.fin }]' },
    { nombre: 'relanzar sin la hora de HASTA', de: "supabase.rpc('relanzar_con_lote_nuevo', { p_parada_id: res.parada_id, p_hora: fin })", a: "supabase.rpc('relanzar_con_lote_nuevo', { p_parada_id: res.parada_id, p_hora: null })" },
    { nombre: 'lote nuevo también en una pendiente', de: "      return !!f && !f.sigue && !!normalizarHora(f.fin) && p?.turno?.estado === 'abierto'", a: '      return !!f && !f.sigue && !!normalizarHora(f.fin)' },
    { nombre: 'no se abre la planilla nueva', de: '      if (res?.turno_id) return abrirPlanilla(res.turno_id)\n      return recargarPlanilla()', a: '      return recargarPlanilla()' },
    { nombre: 'si relanzar falla no se dice', de: "          g.errorBase = `La parada quedó guardada, pero no se pudo pasar al lote nuevo: ${e?.message || 'revisá la conexión'}. Tocá «Volvió a las…» para terminarla.`", a: '' },
    // Volvió a las…
    { nombre: '"Volvió a las…" termina ahora (terminar_parada)', de: "      return { rpc: 'editar_parada', params: { p_parada_id: f.paradaId, p_motivo: f.motivo, p_inicio: f.inicioParada, p_fin: isoAr(v.ms) } }", a: "      return { rpc: 'terminar_parada', params: { p_parada_id: f.paradaId } }" },
    { nombre: 'la vuelta futura se manda', de: '      if (ms > tope) return { error: `Las ${h} todavía no pasaron: poné la hora en que volvió, o tocá «Ahora».` }\n', a: '' },
    { nombre: 'la vuelta antes de la parada se manda', de: '      if (ms - ini > MAX_CRUCE_MS) return', a: '      if (false) return' },
    { nombre: 'con lote nuevo en la ventana igual edita', de: "      if (f.loteNuevo) return { rpc: 'relanzar_con_lote_nuevo', params: { p_parada_id: f.paradaId, p_hora: isoAr(v.ms) } }\n", a: '' },
    // Terminó de producir.
    { nombre: 'el cierre sin p_hora_fin', de: '        p_hora_fin: null,\n', a: '' },
    { nombre: 'el cierre sin p_motivo_cierre', de: '        p_motivo_cierre: textoMotivoCierre(b, p, motivos),\n', a: '' },
    { nombre: 'los 20 minutos son 10', de: '    const MINUTOS_CIERRE_ANTICIPADO = 20', a: '    const MINUTOS_CIERRE_ANTICIPADO = 10' },
    { nombre: 'el borde de los 20 minutos incluido', de: '      if (!(apag < finMs - MINUTOS_CIERRE_ANTICIPADO * 60000)) return null', a: '      if (!(apag <= finMs - MINUTOS_CIERRE_ANTICIPADO * 60000)) return null' },
    { nombre: 'una parada que cubre el hueco no cuenta', de: '      if (cubre) return null\n', a: '' },
    { nombre: 'cualquier parada cubre el hueco', de: '        return Number.isFinite(i) && i <= apag + MINUTOS_CUBRE_PARADA * 60000 && h >= finMs - MINUTOS_CUBRE_PARADA * 60000', a: '        return Number.isFinite(i)' },
    { nombre: 'la parada que sigue no llega al fin', de: '        const h = x.fin ? new Date(x.fin).getTime() : finMs\n', a: '        const h = x.fin ? new Date(x.fin).getTime() : i\n' },
    { nombre: 'el horario le gana a la planilla', de: '        fin: horaCorta(p?.turno?.hora_fin) || horaCorta(p?.horario?.hora_fin),', a: '        fin: horaCorta(p?.horario?.hora_fin) || horaCorta(p?.turno?.hora_fin),' },
    { nombre: 'el turno de noche no cruza la medianoche', de: '      return instanteAr(fecha, h) + (hi && h <= hi ? MS_DIA : 0)', a: '      return instanteAr(fecha, h)' },
    { nombre: 'sin motivo se cierra igual', de: "        else if (motivos === null ? d.length < 2 : !m) faltan.push({ campo: 'motivo', error: 'Falta por qué paró antes.', nota: 'Elegí por qué paró antes.' })", a: '' },
    { nombre: '"Otro motivo" del cierre sin detalle', de: "        else if (m?.pide_detalle && d.length < 2) faltan.push({ campo: 'motivo', error: 'Contá por qué paró antes.', nota: 'Contá qué pasó: es obligatorio.' })", a: '' },
    { nombre: 'el motivo viaja aunque no haya parado antes', de: '      if (!cierreAnticipado(b?.hora, p)) return null\n', a: '' },
    { nombre: 'el motivo de cierre sin su detalle', de: '      return d ? `${m.nombre}: ${d}` : m.nombre\n    }\n\n    // Lo que falta para poder cerrar', a: '      return m.nombre\n    }\n\n    // Lo que falta para poder cerrar' },
    { nombre: '"¿Por qué paró antes?" siempre a la vista', de: '      caja.hidden = !ant\n', a: '      caja.hidden = false\n' },
    { nombre: 'el borrador no guarda el motivo', de: "motivoId: b.motivoId ?? null, motivoDetalle: b.motivoDetalle ?? '' })", a: '})' },
    { nombre: 'el cierre arranca con la hora de ahora', de: '      estado.cierre = guardado ?? borradorCierreVacio()', a: "      estado.cierre = guardado ?? { ...borradorCierreVacio(), hora: horaArgentina(new Date()) }" },
    // La que dejó "Volvió con lote nuevo".
    { nombre: 'la relanzada dice "cerrada a la fuerza"', de: "      if (t.estado === 'pendiente_completar' && !t.forzado_por && !String(t.forzado_motivo ?? '').trim()) {", a: '      if (false) {' },
    // La gestión: la limpieza y la organización aparte de las fallas.
    { nombre: 'la organización suma como falla por máquina', de: "        else if (cat === 'organizativa') m.organizacion += min\n", a: '' },
    { nombre: 'organizativa cuenta como "sin categoría"', de: "const cat = ['programada', 'falla', 'organizativa', 'otro'].includes(p.categoria) ? p.categoria : 'sin'", a: "const cat = ['programada', 'falla', 'otro'].includes(p.categoria) ? p.categoria : 'sin'" },
    { nombre: 'la tarjeta no nombra la organización', de: "        ((t.organizativa ?? 0) > 0 ? `<span class=\"pg-par__otro\">${esc(horasMinutosInd(t.organizativa))} de organización</span>` : '') +\n", a: '' },
    { nombre: 'la limpieza entra en "fallas por motivo"', de: "        if (cat === 'programada') continue\n", a: '' },
    { nombre: 'sin categoría cuenta como limpieza', de: "['programada', 'falla', 'organizativa', 'otro'].includes(p.categoria) ? p.categoria : 'sin'", a: "['programada', 'falla', 'organizativa', 'otro'].includes(p.categoria) ? p.categoria : 'programada'" },
    { nombre: 'una abierta no cuenta', de: '      const fin = p?.fin ? new Date(p.fin).getTime() : new Date(ahora).getTime()\n', a: '      const fin = p?.fin ? new Date(p.fin).getTime() : new Date(p?.inicio).getTime()\n' },
    { nombre: 'las fallas por motivo de menos a más', de: '.sort((a, z) => z.minutos - a.minutos || z.veces - a.veces || orden(a, z))', a: '.sort((a, z) => a.minutos - z.minutos || orden(a, z))' },
    { nombre: 'sin paradas dibuja ceros', de: "      if (d.cantidad === 0) return htmlSinDatosInd('Sin paradas', 'En los últimos 7 días no se anotó ninguna parada.')\n", a: '' },
    { "nombre": "el motivo elegido no se encuentra en la lista", "de": "      return motivos.find(m => m.id === f.motivoId) ?? null\n", "a": "      return null\n" },
    { nombre: 'el historial sin "empezó a producir"', de: "largada ? `empezó a producir ${largada}` : '',", a: "''," },
    { nombre: 'el historial dice "fuego apagado"', de: "termino ? `terminó de producir ${termino}` : ''", a: "termino ? `fuego apagado ${termino}` : ''" },
  ],
})
