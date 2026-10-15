// Mutaciones de test-produccion-lote-nuevo.js (el "lote nuevo" por error en
// la tablet, 14/10/2026): el cartel de confirmación, el fin del turno,
// "Anular, se abrió por error" y el scrap con punto de miles. Ver mutar.js y
// mutar-produccion.js. Cada una tiene que poner la suite en ROJO.
//
//   node pruebas/mut-produccion-lote-nuevo.js
//
// UN RUNNER POR VEZ: dos corridas en paralelo se pisan el mut-tmp-*.html.

const path = require('path')
const { correrMutacionesProduccion } = require('./mutar-produccion')

correrMutacionesProduccion({
  suite: path.join(__dirname, 'test-produccion-lote-nuevo.js'),
  escape: 'esc',
  funciones: [],
  manuales: [
    // ── 2 · La regla del fin del turno ─────────────────────────────────────
    { nombre: 'el fin usa la hora de inicio de la planilla (la relanzada pasa al día siguiente)',
      de: '      const inicio = propio ? horaCorta(t?.hora_inicio) : horaCorta(p?.horario?.hora_inicio)',
      a: '      const inicio = horaCorta(t?.hora_inicio) || horaCorta(p?.horario?.hora_inicio)' },
    { nombre: 'el fin no usa la hora_fin propia de la planilla', de: '      const fin = propio || horaCorta(p?.horario?.hora_fin)', a: '      const fin = horaCorta(p?.horario?.hora_fin)' },
    { nombre: 'sin horario cargado no se ofrece', de: "      if (finMs == null) return { ofrecer: true, fin: '' }", a: "      if (finMs == null) return { ofrecer: false, fin: '' }" },
    { nombre: 'no mira la hora de ahora', de: '      const ref = Number.isFinite(finParadaMs) ? Math.max(finParadaMs, ahoraMs) : ahoraMs', a: '      const ref = Number.isFinite(finParadaMs) ? finParadaMs : ahoraMs' },
    { nombre: 'no mira la hora de la parada', de: '      const ref = Number.isFinite(finParadaMs) ? Math.max(finParadaMs, ahoraMs) : ahoraMs', a: '      const ref = ahoraMs' },
    { nombre: 'el borde de los 30 minutos entra (<=)', de: 'ofrecer: ref < finMs - MINUTOS_SIN_LOTE_NUEVO * 60000', a: 'ofrecer: ref <= finMs - MINUTOS_SIN_LOTE_NUEVO * 60000' },
    { nombre: 'sin los 30 minutos (solo después del fin)', de: 'ofrecer: ref < finMs - MINUTOS_SIN_LOTE_NUEVO * 60000', a: 'ofrecer: ref < finMs' },
    { nombre: 'son 20 minutos y no 30', de: '    const MINUTOS_SIN_LOTE_NUEVO = 30', a: '    const MINUTOS_SIN_LOTE_NUEVO = 20' },
    { nombre: 'el texto del fin no dice la hora', de: "      return `El turno termina a las ${fin || '—'}: a esta hora no se abre un lote nuevo.`", a: "      return 'El turno termina: a esta hora no se abre un lote nuevo.'" },
    // ── 1 · El cartel ──────────────────────────────────────────────────────
    { nombre: 'el cartel sin el encargado', de: "`turno ${t.turno ?? '—'}${enc === '—' ? '' : `, encargado ${enc}`}. ¿Confirmás?`", a: "`turno ${t.turno ?? '—'}. ¿Confirmás?`" },
    { nombre: 'el cartel dice "encargado —"', de: "`turno ${t.turno ?? '—'}${enc === '—' ? '' : `, encargado ${enc}`}. ¿Confirmás?`", a: "`turno ${t.turno ?? '—'}, encargado ${enc}. ¿Confirmás?`" },
    { nombre: 'el cartel sin la máquina', de: "el lote nuevo en ${p?.maquinaNombre || 'la máquina'}, `", a: "el lote nuevo en la máquina, `" },
    { nombre: 'el cartel no es grande', de: "no: 'No, solo terminar la parada', grande: true },", a: "no: 'No, solo terminar la parada', grande: false }," },
    { nombre: 'Paró: el lote nuevo se manda sin cartel', de: '      if (loteNuevo && !loteConfirmado) {', a: '      if (false) {' },
    { nombre: 'la ventana: el lote nuevo se manda sin cartel', de: "      if (pedido.rpc === 'relanzar_con_lote_nuevo' && !loteConfirmado) {", a: '      if (false) {' },
    { nombre: 'Paró: "No, solo terminar la parada" igual relanza', de: '          g.loteNuevo = false\n          return guardarParadaNueva(ahora)', a: '          return guardarParadaNueva(ahora, { loteConfirmado: true })' },
    { nombre: 'la ventana: "No, solo terminar la parada" igual relanza', de: '          g.loteNuevo = false\n          return confirmarHoraVentana(ahora)', a: '          return confirmarHoraVentana(ahora, { loteConfirmado: true })' },
    { nombre: 'tocar afuera del cartel corre el "No"', de: '      if (!si && !afuera && c?.accionNo) return c.accionNo()', a: '      if (!si && c?.accionNo) return c.accionNo()' },
    { nombre: 'el "No" del cartel no hace nada', de: '      if (!si && !afuera && c?.accionNo) return c.accionNo()\n', a: '' },
    { nombre: 'el botón "No" no cambia de texto', de: "textContent = c.no || 'No, seguir'", a: "textContent = 'No, seguir'" },
    // ── 2 · Al final del turno, en el formulario de Paró ───────────────────
    { nombre: 'Paró: la casilla sigue al final del turno', de: '      if (horario && !horario.ofrecer) {', a: '      if (false) {' },
    { nombre: 'Paró: el lote nuevo marcado no se desmarca al final del turno', de: '      if (f.loteNuevo && !loteNuevoFormulario(f, p, ahora).ofrecer) f.loteNuevo = false\n', a: '' },
    { nombre: 'Paró: lo que falta no frena el lote nuevo al final del turno', de: '        else if (!loteNuevoFormulario(f, p, ahora).ofrecer) faltan.push(textoFinDeTurno(loteNuevoFormulario(f, p, ahora).fin))\n', a: '' },
    { nombre: 'Paró: HASTA futura no cuenta para la regla', de: '      return instanteDelTurno(p.turno.fecha, f.fin, horarioDePlanilla(p).inicio)\n    }', a: '      return null\n    }' },
    { nombre: 'Paró: "Cerrar planilla del turno" no va al cierre', de: '        if (luegoCerrar) { await recargarPlanilla(); return irAlCierreDe(p.turno.id) }\n', a: '' },
    // ── 2 · Al final del turno, en "Volvió a las…" ─────────────────────────
    { nombre: 'la ventana ofrece la casilla al final del turno', de: '        lote = loteNuevoVentana(f, p).ofrecer', a: '        lote = true' },
    { nombre: 'la ventana no desmarca el lote nuevo al final del turno', de: "      if (f.tipo === 'volvio' && f.loteNuevo && !loteNuevoVentana(f).ofrecer) f.loteNuevo = false\n", a: '' },
    { nombre: 'la ventana manda el lote nuevo al final del turno', de: '      if (f.loteNuevo && !loteNuevoSegunHorario(p, v.ms, ahora).ofrecer) return { error: textoFinDeTurno(loteNuevoSegunHorario(p, v.ms, ahora).fin) }\n', a: '' },
    { nombre: 'el botón no dice "Terminar parada"', de: "(h.ofrecer ? 'Guardar' : 'Terminar parada')", a: "'Guardar'" },
    { nombre: 'la nota no dice el fin del turno', de: "${h.ofrecer ? '' : ' ' + textoFinDeTurno(h.fin)}", a: '' },
    { nombre: 'la ventana usa la hora de verdad y no la de cuando se abrió', de: 'ahora = new Date(f?.abiertaEn ?? Date.now())) {', a: 'ahora = new Date()) {' },
    { nombre: 'la ventana: "Cerrar planilla del turno" no va al cierre', de: '      if (alCierre) { await recargarPlanilla(); return irAlCierreDe(p.turno.id) }\n', a: '' },
    { nombre: 'la ventana: "Cerrar planilla del turno" con el lote nuevo marcado no termina', de: '      if (luegoCerrar) f.loteNuevo = false\n', a: '' },
    // ── 3 · "Anular, se abrió por error" ───────────────────────────────────
    { nombre: 'se ofrece a la hora justa', de: 'pasaron >= MINUTOS_ANULAR_POR_ERROR * 60000', a: 'pasaron > MINUTOS_ANULAR_POR_ERROR * 60000' },
    { nombre: 'son 90 minutos y no 60', de: '    const MINUTOS_ANULAR_POR_ERROR = 60', a: '    const MINUTOS_ANULAR_POR_ERROR = 90' },
    { nombre: 'sin tolerancia para el reloj atrasado', de: 'if (pasaron < -TOLERANCIA_FUTURO_MS ||', a: 'if (pasaron < 0 ||' },
    { nombre: 'con el reloj muy atrasado igual se ofrece', de: 'if (pasaron < -TOLERANCIA_FUTURO_MS ||', a: 'if (' },
    { nombre: 'se ofrece con cajas', de: '      if ((p.items ?? []).length || (p.masas ?? []).length) return false', a: '      if ((p.masas ?? []).length) return false' },
    { nombre: 'se ofrece con masas', de: '      if ((p.items ?? []).length || (p.masas ?? []).length) return false', a: '      if ((p.items ?? []).length) return false' },
    { nombre: 'se ofrece en una pendiente o cerrada', de: "      if (!t || t.estado !== 'abierto' || t.cierreCola) return false\n      const abierto", a: '      if (!t || t.cierreCola) return false\n      const abierto' },
    { nombre: 'se ofrece con el cierre en la cola', de: "      if (!t || t.estado !== 'abierto' || t.cierreCola) return false\n      const abierto", a: "      if (!t || t.estado !== 'abierto') return false\n      const abierto" },
    { nombre: 'no mira la cola', de: "      return !(cola ?? []).some(x => String(x.grupo) === String(t.id) && x.estado !== 'enviado')", a: '      return true' },
    { nombre: 'lo ya enviado de la cola cuenta', de: "      return !(cola ?? []).some(x => String(x.grupo) === String(t.id) && x.estado !== 'enviado')", a: '      return !(cola ?? []).some(x => String(x.grupo) === String(t.id))' },
    { nombre: 'sin hora de apertura se ofrece', de: '      if (!Number.isFinite(abierto)) return false\n', a: '' },
    { nombre: 'el botón no se pinta en la planilla', de: ' + htmlAnularPorError(p)\n', a: '\n' },
    { nombre: 'el motivo corto se manda', de: "      if (motivo.length < 3) f.error = 'Escribí por qué se anula, con tres letras por lo menos.'", a: "      if (false) f.error = ''" },
    { nombre: 'sin internet se manda', de: "      else if (sinInternet()) f.error = 'Sin internet", a: "      else if (false) f.error = 'Sin internet" },
    { nombre: 'el motivo viaja con los espacios', de: "String(document.getElementById('pr-anular-planilla-motivo').value ?? '').trim()", a: "String(document.getElementById('pr-anular-planilla-motivo').value ?? '')" },
    { nombre: 'el error de la base se tapa', de: "        f.error = e?.message || 'No se pudo anular la planilla. Revisá la conexión y probá de nuevo.'", a: "        f.error = 'No se pudo anular la planilla. Revisá la conexión y probá de nuevo.'" },
    { nombre: 'después de anular no vuelve al tablero', de: "        await maquinaCerrada(turnoId)\n        await mostrarTablero()\n      } catch (e) {\n        console.error('anular_turno_vacio:', e)", a: "        await maquinaCerrada(turnoId)\n      } catch (e) {\n        console.error('anular_turno_vacio:', e)" },
    { nombre: 'después de anular la máquina sigue elegida', de: "        await maquinaCerrada(turnoId)\n        await mostrarTablero()\n      } catch (e) {\n        console.error('anular_turno_vacio:', e)", a: "        await mostrarTablero()\n      } catch (e) {\n        console.error('anular_turno_vacio:', e)" },
    { nombre: 'la ventana de anular no se cierra', de: '        cerrarAnularPorError()\n        guardarPreferencia(claveBorradorCierre(turnoId), null)', a: '        guardarPreferencia(claveBorradorCierre(turnoId), null)' },
    { nombre: 'Cancelar no suelta la ventana', de: '      estado.anularPlanilla = null\n      document.getElementById(\'pr-anular-planilla\').hidden = true\n    }', a: "      document.getElementById('pr-anular-planilla').hidden = true\n    }" },
    // ── 4 · El scrap con punto de miles ────────────────────────────────────
    { nombre: 'el scrap con punto de miles no pregunta', de: '      if (miles && b.scrapMilesAceptado !== miles.valor) return preguntarScrapMiles(miles)\n', a: '' },
    { nombre: 'pregunta sobre el número y no sobre lo escrito', de: "avisoScrapMiles(document.getElementById('pr-cierre-scrap').value)", a: 'avisoScrapMiles(String(b.scrap))' },
    { nombre: '"No, fueron 6.700 kg" vuelve a preguntar', de: '        estado.cierre.scrapMilesAceptado = aviso.valor\n', a: '' },
    { nombre: 'avisa desde 100 kg', de: '      if (valor == null || valor < 1000) return null', a: '      if (valor == null || valor < 100) return null' },
    { nombre: 'sin punto también avisa', de: "      if (!s.includes('.')) return null\n", a: '' },
    { nombre: 'sugiere también con varios grupos', de: '      const grupo = /^([1-9]\\d{0,2})\\.(\\d{3})$/.exec(s)', a: '      const grupo = /^([1-9]\\d{0,2})\\.(\\d{3})/.exec(s)' },
    { nombre: 'sugiere también con coma', de: '      const grupo = /^([1-9]\\d{0,2})\\.(\\d{3})$/.exec(s)', a: '      const grupo = /^([1-9]\\d{0,2})\\.(\\d{3})(,\\d*)?$/.exec(s)' },
    { nombre: 'la sugerencia pierde los decimales', de: 'sugerido: grupo ? Number(`${grupo[1]}.${grupo[2]}`) : null', a: 'sugerido: grupo ? Number(grupo[1]) : null' },
    { nombre: '"Sí, 6,7 kg" no corrige el campo', de: '        ponerNumero(campo, aviso.sugerido)\n        cambioEnCierre()\n        return intentarCerrar()', a: '        estado.cierre.scrapMilesAceptado = aviso.valor\n        return intentarCerrar()' },
    { nombre: '"Corregir el número" igual manda', de: '        if (aviso.sugerido == null) { campo.focus?.(); campo.select?.(); return }', a: '        if (aviso.sugerido == null) { estado.cierre.scrapMilesAceptado = aviso.valor; return intentarCerrar() }' },
    { nombre: 'el cartel escribe los kilos sin coma', de: '      const kg = (n) => formatearNumeroAr(n, { decimales: 3, minimos: 0 })', a: '      const kg = (n) => String(n)' },
  ],
})
