// Mutaciones de test-produccion-abrir.js (B3 de Producción). Ver mutar.js.
//
//   node pruebas/mut-produccion-abrir.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-produccion-abrir.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/produccion.html'),
  escape: 'esc',
  funciones: ['htmlMaquina', 'htmlOpcionesOperario', 'htmlFilaAbrir', 'htmlLotesAsignados'],
  equivalentes: [
    { expr: 'esc(textoEstadoMaquina(e))', motivo: 'textoEstadoMaquina() arma el texto con el lote (entero de la base), una hora formateada y un conteo: no hay texto libre adentro' },
  ],
  manuales: [
    { nombre: 'la libre también lleva a una planilla', de: '      if (!e.turno) {\n        return `<div class="pr-maquina">', a: '      if (false) {\n        return `<div class="pr-maquina">' },
    { nombre: 'cuenta también las masas anuladas', de: ".in('turno_id', ids).eq('anulada', false)", a: ".in('turno_id', ids)" },
    { nombre: 'lee turnos de todas las unidades', de: "        .eq('unidad_negocio_id', unidadId).eq('estado', 'abierto')", a: "        .eq('estado', 'abierto')" },
    { nombre: 'la hora sin zona de Argentina', de: "new Intl.DateTimeFormat('es-AR', { timeZone: ZONA_AR, hour: '2-digit', minute: '2-digit', hour12: false })", a: "new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })" },
    // Anclada al Intl de la hora: fechaCorta() (B6) tiene el mismo renglón del NaN.
    { nombre: 'hora ilegible dice NaN', de: "      if (Number.isNaN(d.getTime())) return ''\n      return new Intl.DateTimeFormat('es-AR', { timeZone: ZONA_AR, hour:", a: "      return new Intl.DateTimeFormat('es-AR', { timeZone: ZONA_AR, hour:" },
    // El ancla vieja era «mantenerPantalla(estado.hayTurnoAbierto)» dentro de
    // mostrarTablero: dejó de existir con el rediseño, que unificó "hay alguna
    // máquina abierta" en marcarAbiertas() —una sola puerta para el dato, que
    // además es lo que habilita SALA DE MASA en la barra de modos—.
    { nombre: 'no pide la pantalla encendida', de: '      mantenerPantalla(hay)\n', a: '' },
    { nombre: 'wake lock sin try', de: "      } catch (err) {\n        bloqueoPantalla = null\n        console.warn('No se pudo mantener la pantalla encendida:', err)\n      }", a: '      } finally {}' },
    { nombre: 'el botón abrir con todas abiertas', de: '      btn.disabled = !estado.tablero.some(e => !e.turno)', a: '      btn.disabled = false' },
    { nombre: 'el formulario ofrece también las abiertas', de: '      const libres = (estado.tablero ?? []).filter(e => !e.turno)', a: '      const libres = estado.tablero ?? []' },
    { nombre: 'no exige operario', de: "      if (sinOperario.length) faltan.push(", a: "      if (false) faltan.push(" },
    { nombre: 'acepta fecha futura', de: "      else if (fecha > hoyArgentina()) faltan.push('una fecha que no sea futura')\n", a: '' },
    { nombre: 'no exige máquina', de: "      if (!elegidas.length) faltan.push('al menos una máquina')\n", a: '' },
    { nombre: '"sin operario" viaja como texto', de: "          operario_id: f.operario === SIN_OPERARIO || f.operario === '' ? null : f.operario,", a: '          operario_id: f.operario,' },
    { nombre: 'viajan también las no elegidas', de: '        p_maquinas: form.filas.filter(f => f.elegida).map(f => ({', a: '        p_maquinas: form.filas.map(f => ({' },
    { nombre: 'el encargado no es la persona', de: "supabase.rpc('abrir_turnos', parametrosAbrirTurnos(estado.abrir, fecha, estado.persona?.id ?? null))", a: "supabase.rpc('abrir_turnos', parametrosAbrirTurnos(estado.abrir, fecha, null))" },
    { nombre: 'una llamada por máquina', de: "        const { data, error } = await supabase.rpc('abrir_turnos', parametrosAbrirTurnos(estado.abrir, fecha, estado.persona?.id ?? null))\n        if (error) throw error", a: "        for (const f of estado.abrir.filas) await supabase.rpc('abrir_turnos', parametrosAbrirTurnos(estado.abrir, fecha, estado.persona?.id ?? null))\n        const { data, error } = await supabase.rpc('abrir_turnos', parametrosAbrirTurnos(estado.abrir, fecha, estado.persona?.id ?? null))\n        if (error) throw error" },
    { nombre: 'el error de la base se tapa', de: "        err.textContent = e?.message || 'No se pudo abrir el turno.'", a: "        err.textContent = 'No se pudo abrir el turno.'" },
    { nombre: 'el botón queda trabado después de un error', de: '      } finally {\n        estado.abriendo = false\n        pintarBotonAbrir()', a: '      } finally {\n        pintarBotonAbrir()' },
    { nombre: 'el lote no se muestra grande', de: '<span class="pr-lote">${esc(f.lote)}</span>', a: '<span>${esc(f.lote)}</span>' },
    { nombre: 'el turno sugerido cambia a las 12', de: '      if (hora >= 5 && hora < 13) return \'Mañana\'', a: '      if (hora >= 5 && hora < 12) return \'Mañana\'' },
    { nombre: 'el operario ofrece al encargado', de: "      const { personas, sinConfigurar } = personasParaPuesto(estado.personal, 'operario')", a: "      const { personas, sinConfigurar } = personasParaPuesto(estado.personal, 'encargado')" },
    { nombre: 'la fecha no arranca en hoy', de: "      fecha.value = hoyArgentina()\n", a: '' },
  ],
})
