// Mutaciones de test-produccion-masa.js (B5 de Producción). Ver mutar.js.
//
//   node pruebas/mut-produccion-masa.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-produccion-masa.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/produccion.html'),
  escape: 'esc',
  funciones: ['mostrarSala', 'htmlPasoTipo', 'htmlPasoBase', 'htmlPasoPartida', 'htmlFilaIngrediente', 'htmlOpcionesLote',
    'htmlLoteIngrediente', 'htmlPasoLotes', 'htmlPasoResumen', 'pintarWizard', 'htmlMasaFila'],
  equivalentes: [
    { expr: 'esc(textoMasas(e.masas))', motivo: 'un conteo con "masa"/"masas"' },
    { expr: "esc(horaArgentina(ant.hora) || '—')", motivo: 'una hora HH:MM formateada por Intl, o una raya' },
    { expr: 'esc(textoDiferencias(difs))', motivo: 'la diferencia se arma con gramos formateados y el nombre del ingrediente; en htmlPasoBase la anterior del test de marcas no difiere, y el nombre se prueba escapado en htmlFilaIngrediente y en el resumen' },
    { expr: 'esc(dif)', motivo: 'textoGramos() + un texto constante: signo, dígitos y "g"' },
    { expr: 'esc(textoKg(Number(l.stock)))', motivo: 'formatearNumeroAr() + " kg"' },
    { expr: 'esc(textoKg(b.cantidades[it.ingrediente_id] ?? 0))', motivo: 'formatearNumeroAr() + " kg"' },
    { expr: 'esc(textoKg(kg))', motivo: 'formatearNumeroAr() + " kg"' },
    { expr: 'esc(textoKg(redondearKg(kg * factor)))', motivo: 'formatearNumeroAr() + " kg"' },
    { expr: "esc(b.tipo ?? '')", motivo: 'el cartel de masa pendiente: el tipo se prueba escapado en los pasos tipo y resumen; el pendiente se dibuja con el mismo esc()' },
    { expr: "esc(horaArgentina(m.hora) || '—')", motivo: 'una hora HH:MM formateada por Intl, o una raya' },
    { expr: 'esc(sinInsumo.map(x => x.ingrediente).join(\', \'))', motivo: 'el test de marcas no tiene ingredientes sin insumo; los nombres se prueban escapados en las filas y el resumen' },
  ],
  manuales: [
    // La regla del uuid
    { nombre: 'uuid nuevo en cada reintento', de: "        ;({ data, error } = await supabase.rpc('registrar_masa', b.payload))", a: "        ;({ data, error } = await supabase.rpc('registrar_masa', { ...b.payload, p_client_uuid: crypto.randomUUID() }))" },
    { nombre: 'el payload se rehace en cada envío', de: '      if (!b.payload) {\n        const faltan = faltanLotes(b, d)', a: '      if (true) {\n        const faltan = faltanLotes(b, d)' },
    { nombre: '"Nueva masa" pisa la empezada', de: '      estado.masa = leerBorradorMasa(t.id) ?? nuevoBorradorMasa(t.id, t.lote, t.maquinaNombre)', a: '      estado.masa = nuevoBorradorMasa(t.id, t.lote, t.maquinaNombre)' },
    { nombre: 'el borrador no se guarda al empezar', de: '      estado.masa = leerBorradorMasa(t.id) ?? nuevoBorradorMasa(t.id, t.lote, t.maquinaNombre)\n      guardarBorradorMasa(estado.masa)', a: '      estado.masa = leerBorradorMasa(t.id) ?? nuevoBorradorMasa(t.id, t.lote, t.maquinaNombre)' },
    { nombre: 'no queda pendiente antes de mandar', de: '    async function enviarMasa(b) {\n      b.pendiente = true\n      guardarBorradorMasa(b)', a: '    async function enviarMasa(b) {' },
    { nombre: 'el borrador se borra aunque no llegue', de: "        if (esErrorDeRed(error)) return { resultado: 'red', error }", a: "        if (esErrorDeRed(error)) { borrarBorradorMasa(b.turnoId); return { resultado: 'red', error } }" },
    { nombre: 'el borrador no se borra al llegar', de: "      borrarBorradorMasa(b.turnoId)\n      return { resultado: 'ok', data }", a: "      return { resultado: 'ok', data }" },
    { nombre: 'un rechazo queda pendiente', de: '        b.pendiente = false\n        b.payload = null\n        guardarBorradorMasa(b)', a: '        guardarBorradorMasa(b)' },
    { nombre: 'toda falla se trata como de red', de: "      if (typeof err.code === 'string' && err.code !== '') return false", a: '' },
    { nombre: 'no hay reintento automático', de: '          if (b && b.pendiente && b.payload) out.push(b)', a: '          if (false) out.push(b)' },
    { nombre: 'se puede descartar una pendiente', de: '      if (!b || b.pendiente) return\n      borrarBorradorMasa(b.turnoId)', a: '      if (!b) return\n      borrarBorradorMasa(b.turnoId)' },
    { nombre: 'el borrador de otro turno se acepta', de: "        return b && typeof b.client_uuid === 'string' && b.turnoId === turnoId ? b : null", a: "        return b && typeof b.client_uuid === 'string' ? b : null" },
    // El payload
    { nombre: 'manda la doble multiplicada', de: '            cantidad_simple_kg: redondearKg(b.cantidades[it.ingrediente_id] ?? 0),', a: '            cantidad_simple_kg: redondearKg((b.cantidades[it.ingrediente_id] ?? 0) * (b.doble ? 2 : 1)),' },
    { nombre: 'p_doble siempre falso', de: '        p_doble: !!b.doble,', a: '        p_doble: false,' },
    { nombre: 'solo los ingredientes con cantidad', de: '        p_items: datos.original.items.map(it => {', a: '        p_items: datos.original.items.filter(it => (b.cantidades[it.ingrediente_id] ?? 0) > 0).map(it => {' },
    { nombre: 'el masero no es la persona', de: 'b.payload = parametrosRegistrarMasa(b, d, estado.persona?.id ?? null)', a: 'b.payload = parametrosRegistrarMasa(b, d, null)' },
    { nombre: '"sin lote" viaja como texto', de: "      l.sinLote = valor === '__sin__'\n      if (valor === '__manual__') { l.manual = true; l.lote = null }\n      else { l.manual = false; l.lote = valor === '' || l.sinLote ? null : valor }", a: "      if (valor === '__manual__') { l.manual = true; l.lote = null }\n      else { l.manual = false; l.lote = valor === '' ? null : valor }" },
    { nombre: 'elegir un lote no apaga el "a mano"', de: "      else { l.manual = false; l.lote = valor === '' || l.sinLote ? null : valor }", a: "      else { l.lote = valor === '' || l.sinLote ? null : valor }" },
    { nombre: 'el lote a mano sin recortar', de: "          const lote = l ? String(l.lote ?? '').trim() : ''", a: "          const lote = l ? String(l.lote ?? '') : ''" },
    { nombre: 'los que no piden lote viajan con insumo', de: '          const l = conLote.has(it.ingrediente_id) ? b.lotes[it.ingrediente_id] : null', a: '          const l = b.lotes[it.ingrediente_id] ?? null' },
    // Cantidades y diferencias
    { nombre: 'paso de 100 g en todos', de: "      return INGREDIENTES_PASO_GRANDE.includes(normalizarBusqueda(nombreIngrediente)) ? 0.1 : 0.01", a: '      return 0.1' },
    { nombre: 'el paso no reconoce "Azúcar" con tilde', de: "      return INGREDIENTES_PASO_GRANDE.includes(normalizarBusqueda(nombreIngrediente)) ? 0.1 : 0.01", a: "      return INGREDIENTES_PASO_GRANDE.includes(String(nombreIngrediente).toLowerCase()) ? 0.1 : 0.01" },
    { nombre: 'puede quedar negativo', de: '      b.cantidades[ingredienteId] = redondearKg(Math.max(0, kg))', a: '      b.cantidades[ingredienteId] = redondearKg(kg)' },
    { nombre: 'un número ilegible pone 0', de: '      if (kg == null || !Number.isFinite(kg)) return\n', a: '' },
    { nombre: 'la anterior no se usa al partir de ella', de: "        const v = partida === 'anterior' && ant && ant.cantidad_simple_kg != null ? Number(ant.cantidad_simple_kg) : Number(it.cantidad_kg)", a: '        const v = Number(it.cantidad_kg)' },
    { nombre: 'la diferencia contra la anterior en vez de la original', de: '        const g = Math.round(((cantidades[it.ingrediente_id] ?? 0) - Number(it.cantidad_kg)) * 1000)', a: '        const g = Math.round((cantidades[it.ingrediente_id] ?? 0) * 1000)' },
    { nombre: 'la diferencia en vivo sin bordó', de: "      return `<div class=\"pr-ing${g !== 0 ? ' pr-ing--cambia' : ''}\">` +", a: '      return `<div class="pr-ing">` +' },
    { nombre: 'sin redondeo de coma flotante', de: '      return Math.round(n * 1000) / 1000', a: '      return n' },
    // Base
    { nombre: '"Usar la anterior" sin anterior', de: "      if (base === 'anterior' && !d.anterior) return\n", a: '' },
    { nombre: '"Usar la anterior" nunca deshabilitado', de: "`<button type=\"button\" class=\"pr-opcion\" data-base=\"anterior\"${ant ? '' : ' disabled'}>", a: '`<button type="button" class="pr-opcion" data-base="anterior">' },
    { nombre: 'no dice si la anterior es igual', de: "(difs.length ? `Contra la original: ${esc(textoDiferencias(difs))}` : 'Es igual a la original')", a: "`Contra la original: ${esc(textoDiferencias(difs))}`" },
    { nombre: '"Modificar" no pregunta de dónde parte', de: "      if (base === 'modificar') { b.base = 'modificada'; b.partida = null; irAPaso('partida'); return }", a: "      if (base === 'modificar') { b.base = 'modificada'; b.cantidades = cantidadesDesde('original', d.original, d.anterior); irAPaso('editar'); return }" },
    // Lotes
    { nombre: 'piden lote también los sin insumo', de: '        datos.insumos.some(x => x.ingrediente_id === it.ingrediente_id))\n    }', a: '        true)\n    }' },
    { nombre: 'piden lote también los de cantidad 0', de: "        it.descuenta_stock && (cantidades[it.ingrediente_id] ?? 0) > 0 &&\n        datos.insumos", a: "        it.descuenta_stock &&\n        datos.insumos" },
    { nombre: 'la materia prima no exige lote', de: "        if (ins.tipo === 'materia_prima' && !String(l.lote ?? '').trim()) faltan.push", a: "        if (false) faltan.push" },
    { nombre: '"Sí" no copia los lotes de la anterior', de: '      b.lotes = si ? lotesDeLaAnterior(d) : {}', a: '      b.lotes = {}' },
    { nombre: 'el insumo por defecto ignora la anterior', de: '      if (ant && posibles.some(x => x.insumo_id === ant)) return ant\n', a: '' },
    { nombre: 'el insumo por defecto ignora el preferido', de: '      if (pref && posibles.some(x => x.insumo_id === pref)) return pref\n', a: '' },
    { nombre: 'no pregunta por los lotes de la anterior', de: '      } else if (d.anterior && b.mismosLotes === null) {', a: '      } else if (false) {' },
    { nombre: 'materia prima ofrece "Sin lote"', de: "      if (ins && ins.tipo !== 'materia_prima') opciones.push", a: '      if (ins) opciones.push' },
    { nombre: 'sin "El lote no está en la lista"', de: "      opciones.push(`<option value=\"__manual__\"${elegido === '__manual__' ? ' selected' : ''}>El lote no está en la lista</option>`)", a: '' },
    { nombre: 'sin el aviso de revisión', de: '          `<p class="pr-aviso">Un lote que no figura con stock queda marcado para revisar.</p>`', a: "          ''" },
    { nombre: 'no se manda aunque falten lotes', de: "        if (faltan.length) { err.textContent = `Falta ${faltan.join(', ')}.`; err.hidden = false; return }\n        b.payload", a: '        b.payload' },
    { nombre: 'no avisa de los que no descuentan', de: "? `<p class=\"pr-texto-suave\">No descuentan stock porque no tienen insumo en el catálogo: ${esc(sinInsumo.map(x => x.ingrediente).join(', '))}.</p>` : ''", a: "? '' : ''" },
    // Resumen
    { nombre: 'la doble no se ve', de: "      const cartel = b.doble ? '<span class=\"pr-doble\">DOBLE ×2</span>' : '<span class=\"pr-chip-origen\">Simple</span>'", a: "      const cartel = '<span class=\"pr-chip-origen\">Simple</span>'" },
    { nombre: 'el ×2 no multiplica', de: 'esc(textoKg(redondearKg(kg * factor)))', a: 'esc(textoKg(redondearKg(kg)))' },
    // Sala y lista
    { nombre: 'la sala muestra también las libres', de: '      const abiertas = estado.tablero.filter(e => e.turno)', a: '      const abiertas = estado.tablero.filter(e => e.turno || true)' },
    { nombre: 'los tipos se repiten', de: '      return [...new Set((data ?? []).map(r => r.tipo_masa))].sort((a, b) => a.localeCompare(b, \'es\'))', a: '      return (data ?? []).map(r => r.tipo_masa)' },
    { nombre: 'la diferencia de la lista contra la original de hoy', de: '        items: datos.recItems.filter(r => r.receta_id === masa.receta_id)', a: '        items: datos.recItems' },
    { nombre: 'una anulada se puede anular', de: '      const anular = puedeAnular && !m.anulada ?', a: '      const anular = puedeAnular ?' },
    { nombre: 'anular sin motivo', de: "      if (motivo.length < 3) { err.textContent = 'Escribí el motivo (al menos 3 letras).'", a: "      if (motivo.length < 0) { err.textContent = 'Escribí el motivo (al menos 3 letras).'" },
    { nombre: 'anular manda otra masa', de: "supabase.rpc('anular_masa', { p_masa_id: estado.anulando, p_motivo: motivo })", a: "supabase.rpc('anular_masa', { p_masa_id: null, p_motivo: motivo })" },
    { nombre: 'datos_para_masa sin el tipo', de: "supabase.rpc('datos_para_masa', { p_turno_id: b.turnoId, p_tipo_masa: b.tipo })", a: "supabase.rpc('datos_para_masa', { p_turno_id: b.turnoId, p_tipo_masa: null })" },
    { nombre: 'rechazo con mensaje genérico', de: "        err.textContent = r.error?.message || 'La base no aceptó la masa.'", a: "        err.textContent = 'La base no aceptó la masa.'" },
    { nombre: 'sin conexión no lo dice', de: "        err.textContent = 'Sin conexión. La masa quedó guardada en esta tablet y se envía sola cuando vuelva la señal. No la cargues de nuevo.'", a: "        err.textContent = ''" },
  ],
})
