// Mutaciones de test-produccion-abrir.js (máquinas y abrir turno). Ver mutar.js.
//
//   node pruebas/mut-produccion-abrir.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-produccion-abrir.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/produccion.html'),
  escape: 'esc',
  funciones: ['htmlMaquina', 'htmlFilaAbrir', 'htmlLotesAsignados', 'htmlBuscadorOperarios',
    'htmlResultadosOperario', 'htmlChipOperario', 'htmlOperariosPlanilla'],
  equivalentes: [
    { expr: 'esc(textoMasas(e.masas))', motivo: 'textoMasas() devuelve "N masas" con N contado en el cliente: no hay texto libre adentro' },
    { expr: 'esc(textoSublotes(e.sublotes ?? 0))', motivo: 'textoSublotes() devuelve "N sublotes" con N contado en el cliente: no hay texto libre adentro' },
    { expr: 'esc(cuando)', motivo: 'cuando se arma con diaDeLaSemana()/diaMes() (de la fecha de la base, validada por regex) y una hora formateada' },
    { expr: "esc(horaArgentina(o.hasta) || '\u2014')", motivo: 'una hora HH:MM formateada por Intl, o una raya: horaArgentina() devuelve \'\' ante cualquier cosa que no sea una fecha, as\u00ed que nada de la base llega a la salida' },
  ],
  manuales: [
    // ── El tablero ──────────────────────────────────────────────────────
    { nombre: 'la libre también lleva a una planilla', de: '      if (!e.turno) {\n        return `<div class="pr-maquina pr-maquina--libre">', a: '      if (false) {\n        return `<div class="pr-maquina pr-maquina--libre">' },
    { nombre: 'cuenta también las masas anuladas', de: ".select('turno_id, hora').in('turno_id', ids).eq('anulada', false)", a: ".select('turno_id, hora').in('turno_id', ids)" },
    { nombre: 'cuenta también los sublotes anulados', de: ".from('produccion_items').select('turno_id').in('turno_id', ids).eq('anulado', false)", a: ".from('produccion_items').select('turno_id').in('turno_id', ids)" },
    { nombre: 'lee turnos de todas las unidades', de: "        .eq('unidad_negocio_id', unidadId).eq('estado', 'abierto')", a: "        .eq('estado', 'abierto')" },
    { nombre: 'lee también los turnos pendiente_completar', de: "        .eq('unidad_negocio_id', unidadId).eq('estado', 'abierto')", a: "        .eq('unidad_negocio_id', unidadId)" },
    { nombre: 'la hora sin zona de Argentina', de: "new Intl.DateTimeFormat('es-AR', { timeZone: ZONA_AR, hour: '2-digit', minute: '2-digit', hour12: false })", a: "new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })" },
    // Anclada al Intl de la hora: fechaCorta() (B6) tiene el mismo renglón del NaN.
    { nombre: 'hora ilegible dice NaN', de: "      if (Number.isNaN(d.getTime())) return ''\n      return new Intl.DateTimeFormat('es-AR', { timeZone: ZONA_AR, hour:", a: "      return new Intl.DateTimeFormat('es-AR', { timeZone: ZONA_AR, hour:" },
    // La fecha se ancla al MEDIODÍA UTC justamente para que ninguna zona pueda
    // correr el día: a las 12:00Z son las 09:00 en Argentina, el mismo día. Con
    // medianoche, 00:00Z son las 21:00 del día ANTERIOR y el día sale mal.
    { nombre: 'la fecha del día de la semana se ancla a medianoche', de: "      const d = new Date(`${iso}T12:00:00Z`)\n      if (Number.isNaN(d.getTime())) return ''\n      return new Intl.DateTimeFormat('es-AR', { timeZone: ZONA_AR, weekday: 'long' })", a: "      const d = new Date(`${iso}T00:00:00Z`)\n      if (Number.isNaN(d.getTime())) return ''\n      return new Intl.DateTimeFormat('es-AR', { timeZone: ZONA_AR, weekday: 'long' })" },
    { nombre: 'el día/mes sale del Intl (mes sin cero)', de: "      const m = /^(\\d{4})-(\\d{2})-(\\d{2})$/.exec(String(iso ?? ''))\n      return m ? `${m[3]}/${m[2]}` : ''", a: "      const m = /^(\\d{4})-(\\d{2})-(\\d{2})$/.exec(String(iso ?? ''))\n      return m ? `${Number(m[3])}/${Number(m[2])}` : ''" },
    { nombre: 'una fecha ilegible se toma como "de ayer"', de: "      return /^\\d{4}-\\d{2}-\\d{2}$/.test(String(f ?? '')) && String(f) < String(hoy)", a: "      return String(f ?? '') < String(hoy)" },
    { nombre: 'la de ayer no va primera', de: '      if (esDeAyer(e, hoy)) return 0\n      return e.parada ? 1 : 2', a: '      return e.parada ? 1 : 2' },
    { nombre: 'la parada no va antes que las abiertas', de: '      return e.parada ? 1 : 2', a: '      return 2' },
    { nombre: 'el orden no es estable', de: '        .sort((a, b) => (rangoTablero(a[0], hoy) - rangoTablero(b[0], hoy)) || (a[1] - b[1]))', a: '        .sort((a, b) => (rangoTablero(a[0], hoy) - rangoTablero(b[0], hoy)) || (b[1] - a[1]))' },
    { nombre: 'el tablero no se ordena', de: '      cont.innerHTML = ordenTablero(estado.tablero, hoy).map(e => htmlMaquina(e, hoy)).join(\'\')', a: '      cont.innerHTML = estado.tablero.map(e => htmlMaquina(e, hoy)).join(\'\')' },
    { nombre: 'el encabezado inventa el turno de una máquina de ayer', de: "      const t = (entradas ?? []).find(e => e.turno && e.turno.fecha === hoy && e.turno.turno)?.turno.turno", a: "      const t = (entradas ?? []).find(e => e.turno && e.turno.turno)?.turno.turno" },
    { nombre: 'la de ayer no dice qué hay que hacer', de: '. Hay que cerrarla antes de volver a usarla.</div>', a: '.</div>' },
    { nombre: 'la de ayer no ofrece cerrar la planilla', de: '`<button type="button" class="pr-btn pr-btn--peligro pr-btn--accion" data-planilla="${esc(e.turno.id)}">Cerrar planilla de ayer</button>` +', a: '`` +' },
    { nombre: 'la parada no dice desde cuándo ni por qué', de: "        ? `Parada desde ${esc(horaArgentina(e.parada.inicio) || '—')} · ${esc(e.parada.motivo)}`", a: "        ? `Parada`" },
    { nombre: 'el lote no se muestra grande en la tarjeta', de: '        `<span class="pr-maquina__lote">${esc(e.turno.lote)}</span>` +', a: '        `<span>${esc(e.turno.lote)}</span>` +' },
    { nombre: 'no pide la pantalla encendida', de: '      mantenerPantalla(hay)\n', a: '' },
    { nombre: 'wake lock sin try', de: "      } catch (err) {\n        bloqueoPantalla = null\n        console.warn('No se pudo mantener la pantalla encendida:', err)\n      }", a: '      } finally {}' },
    { nombre: 'el botón abrir con todas abiertas', de: '      btn.disabled = !estado.tablero.some(e => !e.turno)', a: '      btn.disabled = false' },

    // ── Abrir turno ─────────────────────────────────────────────────────
    { nombre: 'el formulario ofrece también las abiertas de hoy', de: '      const ofrecibles = (estado.tablero ?? []).filter(e => !e.turno || esDeAyer(e, hoy))', a: '      const ofrecibles = estado.tablero ?? []' },
    { nombre: 'la abierta de ayer no se ofrece', de: '      const ofrecibles = (estado.tablero ?? []).filter(e => !e.turno || esDeAyer(e, hoy))', a: '      const ofrecibles = (estado.tablero ?? []).filter(e => !e.turno)' },
    { nombre: 'la bloqueada no va al final', de: "        filas: [...filas.filter(f => !f.bloqueada), ...filas.filter(f => f.bloqueada)],", a: '        filas,' },
    { nombre: 'la casilla de la bloqueada se puede marcar', de: 'data-abrir-maquina="${i}" disabled aria-label="${esc(f.nombre)}: abierta de ayer', a: 'data-abrir-maquina="${i}" aria-label="${esc(f.nombre)}: abierta de ayer' },
    { nombre: 'la bloqueada no dice qué hacer', de: 'Abierta de ayer (lote ${esc(f.lote ?? \'—\')}). Cerrala primero.', a: 'Abierta de ayer.' },
    { nombre: 'la bloqueada viaja en el payload', de: '        p_maquinas: form.filas.filter(f => f.elegida && !f.bloqueada).map(f => ({', a: '        p_maquinas: form.filas.filter(f => f.elegida).map(f => ({' },
    { nombre: 'la bloqueada cuenta como máquina elegida', de: "      if (!form.filas.some(f => f.elegida && !f.bloqueada)) faltan.push('al menos una máquina')", a: "      if (!form.filas.some(f => f.elegida)) faltan.push('al menos una máquina')" },
    { nombre: 'a la bloqueada se le puede abrir el buscador', de: '      if (!f || f.bloqueada) return\n      f.buscando = abierto', a: '      if (!f) return\n      f.buscando = abierto' },
    { nombre: 'viajan también las no elegidas', de: '        p_maquinas: form.filas.filter(f => f.elegida && !f.bloqueada).map(f => ({', a: '        p_maquinas: form.filas.map(f => ({' },
    { nombre: 'los operarios viajan con la clave vieja', de: '          operarios: [...f.operarios],', a: '          operario_id: f.operarios[0] ?? null,' },
    { nombre: 'viaja un solo operario por máquina', de: '          operarios: [...f.operarios],', a: '          operarios: f.operarios.slice(0, 1),' },
    { nombre: 'acepta fecha futura', de: "      else if (fecha > hoyArgentina()) faltan.push('una fecha que no sea futura')\n", a: '' },
    { nombre: 'no exige máquina', de: "      if (!form.filas.some(f => f.elegida && !f.bloqueada)) faltan.push('al menos una máquina')\n", a: '' },
    { nombre: 'no exige turno', de: "      if (!TURNOS.includes(form.turno)) faltan.push('el turno')\n", a: '' },
    { nombre: 'el encargado no es la persona', de: "supabase.rpc('abrir_turnos', parametrosAbrirTurnos(form, fecha, estado.persona?.id ?? null))", a: "supabase.rpc('abrir_turnos', parametrosAbrirTurnos(form, fecha, null))" },
    { nombre: 'una llamada por máquina', de: "        const { data, error } = await supabase.rpc('abrir_turnos', parametrosAbrirTurnos(form, fecha, estado.persona?.id ?? null))\n        if (error) throw error", a: "        for (const f of form.filas) await supabase.rpc('abrir_turnos', parametrosAbrirTurnos(form, fecha, estado.persona?.id ?? null))\n        const { data, error } = await supabase.rpc('abrir_turnos', parametrosAbrirTurnos(form, fecha, estado.persona?.id ?? null))\n        if (error) throw error" },
    { nombre: 'el error de la base se tapa', de: "        err.textContent = e?.message || 'No se pudo abrir el turno.'", a: "        err.textContent = 'No se pudo abrir el turno.'" },
    { nombre: 'SALA DE MASA no se habilita al abrir', de: '        marcarAbiertas(true)\n        document.getElementById(\'pr-abiertos-titulo\')', a: '        document.getElementById(\'pr-abiertos-titulo\')' },
    { nombre: 'el botón queda trabado después de un error', de: '      } finally {\n        estado.abriendo = false\n        pintarBotonAbrir()', a: '      } finally {\n        pintarBotonAbrir()' },
    { nombre: 'el lote asignado no se muestra grande', de: '          `<span class="pr-lote-tarjeta__lote">${esc(f.lote)}</span>` +', a: '          `<span>${esc(f.lote)}</span>` +' },
    { nombre: 'los lotes no dicen sus operarios', de: "        const ops = (fila?.operarios ?? []).map(id => nombreOperario(operarios ?? [], id)).join(' · ')", a: "        const ops = ''" },
    { nombre: 'el turno sugerido cambia a las 12', de: "      if (hora >= 5 && hora < 13) return 'Mañana'", a: "      if (hora >= 5 && hora < 12) return 'Mañana'" },
    { nombre: 'el operario ofrece al encargado', de: "      const { personas, sinConfigurar } = personasParaPuesto(estado.personal, 'operario')\n      estado.operarios = personas", a: "      const { personas, sinConfigurar } = personasParaPuesto(estado.personal, 'encargado')\n      estado.operarios = personas" },
    { nombre: 'la fecha no arranca en hoy', de: '        fecha: hoy,', a: "        fecha: sumarDias(hoy, -3)," },
    { nombre: '› deja pasar de hoy', de: "      if (nueva > hoyArgentina()) return\n      form.fecha = nueva", a: '      form.fecha = nueva' },
    { nombre: '› no se deshabilita en hoy', de: "      document.getElementById('pr-abrir-dia-mas').disabled = form.fecha >= hoy", a: "      document.getElementById('pr-abrir-dia-mas').disabled = false" },
    { nombre: 'la nota de la fecha no dice "hoy"', de: "      if (iso === hoy) nota = `hoy, ${semana}`\n", a: '' },
    { nombre: 'el resumen no cuenta los operarios', de: '      const ops = elegidas.reduce((n, f) => n + f.operarios.length, 0)', a: '      const ops = 0' },

    // ── Los operarios, en abrir y en la planilla ────────────────────────
    { nombre: 'la búsqueda no resalta la coincidencia', de: '        `${htmlResaltado(c.nombre, texto)}${c.nota', a: '        `${esc(c.nombre)}${c.nota' },
    { nombre: 'el resaltado se corre con los acentos', de: '        for (const c of textoPlano(ch)) { plano += c; de.push(k) }\n        k += ch.length', a: '        plano += ch.toLowerCase(); de.push(k)\n        k += ch.length' },
    { nombre: 'se ofrece a quien ya está en la fila', de: '        .filter(p => !puestos.has(p.id))\n', a: '' },
    { nombre: 'el que está en otra máquina no se apaga', de: '          return { id: p.id, nombre: p.nombre, nota: d, apagado: !!d }', a: '          return { id: p.id, nombre: p.nombre, nota: d, apagado: false }' },
    { nombre: 'el que está en otra máquina no dice en cuál', de: '            return otra ? `en ${otra.nombre}` : \'\'\n          }\n          buscador', a: '            return otra ? \' \' : \'\'\n          }\n          buscador' },
    { nombre: 'el buscador no filtra', de: '      return personasFiltradas(personas ?? [], texto)', a: '      return (personas ?? [])' },
    { nombre: 'agregar el mismo operario dos veces', de: '      if (!f || !id || f.operarios.includes(id)) return', a: '      if (!f || !id) return' },
    { nombre: 'al tipear se repinta la fila entera (se pierde el foco)', de: "      const cont = document.querySelector(`[data-res-op=\"${i}\"]`)\n      if (!cont) return", a: '      const cont = null\n      pintarAbrir()\n      if (!cont) return' },
    { nombre: 'la planilla no lee hasta', de: ".select('empleado_id, desde, hasta').eq('turno_id', turnoId)", a: ".select('empleado_id, desde').eq('turno_id', turnoId)" },
    { nombre: 'el que se fue desaparece de la lista', de: '        filas.filter(o => o.hasta).map(o =>\n', a: '        [].map(o =>\n' },
    { nombre: 'el que se fue no dice a qué hora salió', de: "} · salió ${esc(horaArgentina(o.hasta) || '—')}</span>", a: '}</span>' },
    { nombre: 'al que se fue se le ofrece la ×', de: '      const chipsHtml = adentro.map(o =>', a: '      const chipsHtml = filas.map(o =>' },
    { nombre: 'se ofrece sumar a quien ya está adentro', de: '        ? htmlBuscadorOperarios(candidatosOperario(personas, ops.busqueda, adentro.map(o => o.empleado_id)), ops.busqueda, CTX_PLANILLA)', a: '        ? htmlBuscadorOperarios(candidatosOperario(personas, ops.busqueda, []), ops.busqueda, CTX_PLANILLA)' },
    { nombre: 'sumar no manda el turno', de: "        const { error } = await supabase.rpc(rpc, { p_turno_id: p.turno.id, p_empleado_id: id })", a: "        const { error } = await supabase.rpc(rpc, { p_turno_id: null, p_empleado_id: id })" },
    { nombre: 'sumar no relee la lista', de: "        estado.opsPlanilla = { buscando: false, busqueda: '', guardando: true }\n        await recargarPlanilla()\n", a: "        estado.opsPlanilla = { buscando: false, busqueda: '', guardando: true }\n" },
    { nombre: 'el error de sumar un operario se tapa', de: '          : (e?.message || generico)', a: '          : generico' },
    { nombre: 'una relectura que falla se lee como que no se guardó', de: "        err.textContent = guardado\n          ? 'El cambio se guardó, pero no se pudo actualizar la lista.", a: "        err.textContent = false\n          ? 'El cambio se guardó, pero no se pudo actualizar la lista." },
    { nombre: 'queda trabado después de un error', de: '      } finally {\n        estado.opsPlanilla.guardando = false\n        pintarOperariosPlanilla()', a: '      } finally {\n        pintarOperariosPlanilla()' },
  ],
})
