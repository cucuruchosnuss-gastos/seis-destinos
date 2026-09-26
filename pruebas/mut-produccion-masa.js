// Mutaciones de test-produccion-masa.js (B5 de Producción · rediseño parte 4:
// la sala de masa, la receta y las masas del turno). Ver mutar.js.
//
//   node pruebas/mut-produccion-masa.js

const path = require('path')
const { correrMutacionesProduccion } = require('./mutar-produccion')

correrMutacionesProduccion({
  suite: path.join(__dirname, 'test-produccion-masa.js'),
  escape: 'esc',
  funciones: ['htmlFilaSala', 'detalleAnterior', 'htmlComo', 'htmlCabeceraReceta',
    'htmlCeldaLote', 'htmlCeldaQueda', 'htmlFilaReceta', 'htmlFilaOtro', 'htmlFilaMasaPendiente', 'htmlFilaMasaTurno'],
  equivalentes: [
    { expr: 'esc(textoMasas(e.masas))', motivo: 'un conteo con "masa"/"masas"' },
    { expr: "esc(horaArgentina(e.ultimaMasa) || '—')", motivo: 'una hora HH:MM formateada por Intl, o una raya' },
    { expr: "esc(horaArgentina(a.hora) || '—')", motivo: 'una hora HH:MM formateada por Intl, o una raya' },
    { expr: "esc(horaArgentina(m.hora) || '—')", motivo: 'una hora HH:MM formateada por Intl, o una raya' },
    { expr: 'esc(a.nro)', motivo: 'el número de la anterior sale de datos_para_masa; el de la cabecera y el de 6d se prueban escapados en htmlCabeceraReceta y htmlFilaMasaTurno, con el mismo esc()' },
    { expr: 'esc(textoDiferencias(difs, 2))', motivo: 'gramos formateados más el nombre del ingrediente, que se prueba escapado en htmlFilaReceta' },
    { expr: 'esc(textoGramos(g))', motivo: 'textoGramos(): signo, dígitos y " g"' },
    { expr: 'esc(textoCantidad(e.queda))', motivo: 'formatearNumeroAr() + " kg" o " g"' },
    { expr: 'esc(o.etiqueta)', motivo: 'la etiqueta la arma opcionesLote() con el lote, el insumo y su marca; los tres se prueban escapados en htmlFilaReceta' },
    { expr: "esc(ETIQUETA_ORIGEN[clave] ?? clave)", motivo: 'constante del código: Original / Anterior / Modificada' },
    { expr: 'esc(clave)', motivo: 'constante del código: etiquetaBorrador() devuelve original / anterior / modificada y nada más' },
    { expr: 'esc(d.original.version)', motivo: 'el número de versión de la receta vigente, que sale de datos_para_masa' },
    { expr: 'esc(dePartida(d))', motivo: 'texto constante más el número de la masa anterior, que ya se prueba escapado en detalleAnterior' },
  ],
  manuales: [
    // ── LA REGLA DEL UUID ────────────────────────────────────────────────
    { nombre: 'uuid nuevo en cada reintento', de: "        ;({ data, error } = await supabase.rpc('registrar_masa', b.payload))", a: "        ;({ data, error } = await supabase.rpc('registrar_masa', { ...b.payload, p_client_uuid: crypto.randomUUID() }))" },
    { nombre: 'el reintento manda un payload distinto del que se mandó', de: '      let data = null, error = null', a: '      let data = null, error = null\n      b.payload = { ...b.payload, p_items: [] }' },
    { nombre: 'empezar otra masa pisa la empezada', de: '      const b = estado.masa ?? nuevoBorradorMasa(t)', a: '      const b = nuevoBorradorMasa(t)' },
    { nombre: 'el borrador no se guarda al empezarlo', de: '      estado.masa = b\n      guardarBorradorMasa(b)\n      marcarEnCurso(b)', a: '      estado.masa = b' },
    { nombre: 'no queda pendiente antes de mandar', de: '    async function enviarMasa(b) {\n      b.pendiente = true\n      guardarBorradorMasa(b)', a: '    async function enviarMasa(b) {' },
    { nombre: 'el borrador se borra aunque no llegue', de: "        if (esErrorDeRed(error)) return { resultado: 'red', error }", a: "        if (esErrorDeRed(error)) { borrarBorradorMasa(b); return { resultado: 'red', error } }" },
    { nombre: 'el borrador no se borra al llegar', de: "      borrarBorradorMasa(b)\n      return { resultado: 'ok', data }", a: "      return { resultado: 'ok', data }" },
    { nombre: 'un rechazo queda pendiente', de: '        b.pendiente = false\n        b.payload = null\n        guardarBorradorMasa(b)', a: '        guardarBorradorMasa(b)' },
    { nombre: 'toda falla se trata como de red', de: "      if (typeof err.code === 'string' && err.code !== '') return false", a: '' },
    { nombre: 'no hay reintento automático', de: '          if (b && b.pendiente && b.payload) out.push(b)', a: '          if (false) out.push(b)' },
    { nombre: 'el borrador de otro uuid se acepta', de: '        return b && b.client_uuid === uuid ? b : null', a: '        return b ? b : null' },
    // La masa PENDIENTE no se pierde al empezar la siguiente: el borrador va
    // por uuid, no por turno, y borradorEnCurso() no la devuelve.
    { nombre: 'una pendiente se retoma como si estuviera a medias', de: '      return b && !b.pendiente ? b : null', a: '      return b ?? null' },
    { nombre: 'el borrador se guarda bajo el turno y la siguiente lo pisa', de: '      return PREFIJO_BORRADOR_MASA + uuid', a: '      return PREFIJO_BORRADOR_MASA' },

    // ── LOS LOTES VIENEN PUESTOS ─────────────────────────────────────────
    { nombre: 'los lotes NO vienen de la anterior', de: '      b.lotes = lotesIniciales(d)', a: '      b.lotes = {}' },
    { nombre: 'la primera masa del día igual copia los lotes de otro día', de: '      if (!ant || ant.es_de_hoy === false) return {}', a: '      if (!ant) return {}' },

    // ── El 10% ───────────────────────────────────────────────────────────
    { nombre: 'cualquier diferencia va en bordó', de: '      if (!(base > 0)) return false\n      return Math.abs(Number(kg ?? 0) - base) > base * UMBRAL_ALEJADA + 1e-9', a: '      return Math.abs(Number(kg ?? 0) - base) > 0' },
    { nombre: 'el umbral es un número fijo y no el 10% de ese ingrediente', de: '      return Math.abs(Number(kg ?? 0) - base) > base * UMBRAL_ALEJADA + 1e-9', a: '      return Math.abs(Number(kg ?? 0) - base) > 0.25' },
    { nombre: 'con la receta en 0 cualquier cantidad va en bordó', de: '      if (!(base > 0)) return false', a: '' },
    { nombre: 'la diferencia no se muestra si no pasa el umbral', de: "      const dif = g === 0\n        ? '<span class=\"pr-rec__igual\">=</span>'", a: "      const dif = g === 0 || !aleja\n        ? '<span class=\"pr-rec__igual\">=</span>'" },

    // ── "Queda" y el bloqueo de Registrar ────────────────────────────────
    { nombre: 'queda no descuenta esta masa', de: '      const queda = redondearKg(Number(enLista.stock) - consumo)', a: '      const queda = redondearKg(Number(enLista.stock))' },
    { nombre: 'una doble descuenta como una simple', de: "      const consumo = redondearKg((b.cantidades[it.ingrediente_id] ?? 0) * (b.doble ? 2 : 1))", a: '      const consumo = redondearKg(b.cantidades[it.ingrediente_id] ?? 0)' },
    { nombre: 'nunca avisa que no alcanza para otra', de: '      return { ...base, queda, alcanza: queda >= consumo }', a: '      return { ...base, queda, alcanza: true }' },
    // Terminar la tablet, parte 3: "terminado" ya no lo deduce la pantalla (un lote que no está en stock queda elegido con "sin ingreso cargado"); lo dice la persona con "Se terminó".
    { nombre: 'un lote que se terminó pasa como bueno', de: '      if (l && l.terminado) return { ...base, terminado: true, falta: true }', a: '      if (l && l.terminado) return base' },
    { nombre: 'un lote sin elegir no bloquea', de: '      if (!l || !ins) return { ...base, falta: true }', a: '      if (!l || !ins) return { ...base }' },
    { nombre: 'un lote escrito a mano vacío no bloquea', de: '        return { ...base, falta: !texto, sinIngreso:', a: '        return { ...base, falta: false, sinIngreso:' },
    { nombre: 'Registrar no se bloquea con lo que falta', de: "      btn.disabled = !!pendiente.length || !!estado.enviandoMasa", a: '      btn.disabled = !!estado.enviandoMasa' },
    { nombre: 'se manda igual con lotes sin elegir', de: '        const faltan = faltanParaRegistrar(b, d)\n        if (faltan.length) { pintarPieReceta(); return }', a: '        const faltan = faltanParaRegistrar(b, d)' },
    { nombre: 'el renglón flojo no se tinta', de: '      if (!e.alcanza || e.terminado) clases.push(\'pr-rec--floja\')', a: '' },
    { nombre: 'el botón del lote terminado no se marca', de: "      if (e.terminado) clases.push('pr-rec__lote--terminado')\n      else if (vacio)", a: '      if (vacio)' },

    // ── El payload ───────────────────────────────────────────────────────
    { nombre: 'se manda la cantidad ya multiplicada por 2', de: '          cantidad_simple_kg: redondearKg(b.cantidades[it.ingrediente_id] ?? 0),\n          insumo_id: l?.insumo_id || null,', a: '          cantidad_simple_kg: redondearKg((b.cantidades[it.ingrediente_id] ?? 0) * (b.doble ? 2 : 1)),\n          insumo_id: l?.insumo_id || null,' },
    { nombre: 'los ingredientes en cero no viajan', de: '      const items = datos.original.items.map(it => {', a: '      const items = datos.original.items.filter(it => (b.cantidades[it.ingrediente_id] ?? 0) > 0).map(it => {' },
    { nombre: 'se manda el origen calculado en la pantalla', de: '        p_client_uuid: b.client_uuid,\n      }\n    }', a: '        p_client_uuid: b.client_uuid,\n        p_origen: etiquetaBorrador(b),\n      }\n    }' },
    { nombre: 'un "otro" viaja con ingrediente_id', de: "          ingrediente_id: null,\n          ingrediente_libre: String(o.nombre ?? '').trim(),", a: "          ingrediente_id: o.id,\n          ingrediente_libre: String(o.nombre ?? '').trim()," },
    { nombre: 'un "otro" viaja con insumo y lote', de: "          cantidad_simple_kg: redondearKg(o.kg ?? 0),\n        })", a: "          cantidad_simple_kg: redondearKg(o.kg ?? 0),\n          insumo_id: null, lote: null,\n        })" },
    // Anclada al items.push() y no al `for` solo: desde que faltanParaRegistrar
    // también recorre los "otro", ese renglón aparece DOS veces en el archivo.
    { nombre: 'los "otro" no viajan', de: '      for (const o of b.otros ?? []) {\n        items.push({', a: '      for (const o of []) {\n        items.push({' },
    { nombre: 'el lote a mano no se recorta', de: "          lote: lote === '' ? null : lote,", a: '          lote: l ? l.lote : null,' },
    { nombre: 'el masero no viaja', de: '        p_masero_id: maseroId,', a: '        p_masero_id: null,' },

    // ── "+ Otro": la misma regla que la base ─────────────────────────────
    { nombre: 'un "otro" con una sola letra se agrega', de: "      if (String(nombre ?? '').trim().length < 2) return 'Escribí qué le pusiste (al menos 2 letras).'", a: "      if (String(nombre ?? '').trim().length < 1) return 'Escribí qué le pusiste (al menos 2 letras).'" },
    { nombre: 'un "otro" en cero se agrega', de: "      if (kg == null || !Number.isFinite(kg) || kg <= 0) return 'Escribí cuánto le pusiste, en kilos.'", a: "      if (kg == null || !Number.isFinite(kg) || kg < 0) return 'Escribí cuánto le pusiste, en kilos.'" },
    { nombre: 'solo puede haber un "otro"', de: '      b.otros.push({ id: `o${b.proximoOtro ?? b.otros.length + 1}`, nombre, kg: redondearKg(kg) })', a: '      b.otros = [{ id: `o${b.proximoOtro ?? 1}`, nombre, kg: redondearKg(kg) }]' },
    { nombre: 'los "otro" comparten id', de: '      b.proximoOtro = (b.proximoOtro ?? b.otros.length) + 1', a: '' },
    { nombre: '"Quitar" saca todos', de: '      b.otros = (b.otros ?? []).filter(o => o.id !== id)', a: '      b.otros = []' },

    // ── El chocolate ─────────────────────────────────────────────────────
    { nombre: 'el chocolate sale del NOMBRE del ingrediente', de: '        if (definen.has(it) && (b.cantidades[it] ?? 0) > 0) return true', a: "        if (normalizarBusqueda(it).includes('cacao') && (b.cantidades[it] ?? 0) > 0) return true" },
    { nombre: 'el chip de chocolate aparece con el ingrediente en cero', de: '        if (definen.has(it) && (b.cantidades[it] ?? 0) > 0) return true', a: '        if (definen.has(it)) return true' },
    { nombre: 'define_chocolate no se lee de la tabla', de: "      const { data, error } = await supabase.from('ingredientes').select('id, define_chocolate')", a: "      const { data, error } = { data: [], error: null }; if (false) await supabase.from('ingredientes').select('id, define_chocolate')" },
    { nombre: 'cualquier ingrediente define chocolate', de: '      return new Set((data ?? []).filter(x => x.define_chocolate === true).map(x => x.id))', a: '      return new Set((data ?? []).map(x => x.id))' },

    // ── 6a / 6b ──────────────────────────────────────────────────────────
    { nombre: 'la sala muestra también las máquinas libres', de: '      return (estado.tablero ?? []).filter(e => e.turno)', a: '      return (estado.tablero ?? []).filter(e => e.turno || true)' },
    { nombre: 'la máquina sin masas no avisa que hay que cargar los lotes', de: "        : '<div class=\"pr-sala-maq__cuenta pr-sala-maq__primera\">Primera masa</div>' +", a: "        : '<div class=\"pr-sala-maq__cuenta\">Sin masas</div>' +" },
    { nombre: 'la parada no se ve en la fila', de: "      const parada = e.parada ? ' · <span class=\"pr-sala-maq__parada\">parada</span>' : ''", a: "      const parada = ''" },
    { nombre: 'el tipo de masa se pregunta aunque haya una sola receta', de: '      const tipoHtml = tipos.length > 1', a: '      const tipoHtml = tipos.length > 0' },
    { nombre: 'el panel se habilita sin máquina elegida', de: "      const off = listo ? '' : ' disabled'", a: "      const off = ''" },
    { nombre: '"Usar la anterior" se ofrece sin anterior', de: "        htmlComo('anterior', 'Usar la anterior', listo ? detalleAnterior(d) : 'Igual a la última masa de esa máquina.', listo && hayAnterior) +", a: "        htmlComo('anterior', 'Usar la anterior', listo ? detalleAnterior(d) : 'Igual a la última masa de esa máquina.', listo) +" },
    { nombre: 'no se avisa que la anterior era de chocolate', de: "      const choco = a.es_chocolate ? ' <span class=\"pr-como__choco\">Era de CHOCOLATE.</span>' : ''", a: "      const choco = ''" },
    { nombre: '"Modificar" siempre parte de la original', de: "      return d?.anterior && d.anterior.es_de_hoy !== false ? 'anterior' : 'original'", a: "      return 'original'" },
    { nombre: '"Usar la anterior" trae las cantidades de la original', de: "      b.partida = como === 'modificar' ? partidaDeModificar(d) : como", a: "      b.partida = 'original'" },
    { nombre: 'los tipos se repiten', de: "      return [...new Set((data ?? []).map(r => r.tipo_masa))].sort((a, b) => a.localeCompare(b, 'es'))", a: '      return (data ?? []).map(r => r.tipo_masa)' },
    { nombre: 'datos_para_masa sin el tipo', de: "supabase.rpc('datos_para_masa', { p_turno_id: estado.salaTurno.id, p_tipo_masa: estado.tipoMasa })", a: "supabase.rpc('datos_para_masa', { p_turno_id: estado.salaTurno.id, p_tipo_masa: null })" },

    // ── 6c: la cabecera y los renglones ──────────────────────────────────
    { nombre: 'la cabecera no dice si quedó modificada', de: '      if (b.cambiada) return \'modificada\'', a: '' },
    { nombre: 'tocar una cantidad no marca la masa como cambiada', de: '      b.cantidades[ingredienteId] = redondearKg(Math.max(0, kg))\n      b.cambiada = true', a: '      b.cantidades[ingredienteId] = redondearKg(Math.max(0, kg))' },
    { nombre: 'una cantidad negativa queda negativa', de: '      b.cantidades[ingredienteId] = redondearKg(Math.max(0, kg))', a: '      b.cantidades[ingredienteId] = redondearKg(kg)' },
    { nombre: 'un número ilegible borra la cantidad', de: '      if (!b || kg == null || !Number.isFinite(kg)) return', a: '      if (!b) return' },
    { nombre: 'el paso es siempre el chico', de: "      return INGREDIENTES_PASO_GRANDE.includes(normalizarBusqueda(nombreIngrediente)) ? 0.1 : 0.01", a: '      return 0.01' },
    { nombre: 'el ingrediente en cero no se ve apagado', de: "      if (kg <= 0) clases.push('pr-rec--cero')", a: '' },
    { nombre: 'el "+" del ingrediente en cero se deshabilita', de: 'aria-label="Más ${esc(it.ingrediente)}">+</button>`', a: 'aria-label="Más ${esc(it.ingrediente)}"${kg <= 0 ? \' disabled\' : \'\'}>+</button>`' },
    { nombre: 'la columna Marca queda vacía', de: "      const marca = e.ins ? (e.ins.marca || e.ins.nombre || '') : ''", a: "      const marca = ''" },
    { nombre: 'el ingrediente sin insumo igual pide lote', de: "        if (!insumosDe(estado.datosMasa ?? { insumos: [] }, it.ingrediente_id).length) {\n          return '<span class=\"pr-rec__nota\">no lleva lote</span>'\n        }", a: '' },
    { nombre: 'un insumo de materia prima ofrece "Sin lote"', de: "        if (ins.tipo !== 'materia_prima') {", a: '        if (true) {' },
    { nombre: 'no se puede escribir un lote que no figura', de: "        out.push({\n          insumo_id: ins.insumo_id, lote: null, manual: true, sinLote: false, stock: null,", a: "        if (false) out.push({\n          insumo_id: ins.insumo_id, lote: null, manual: true, sinLote: false, stock: null," },
    { nombre: 'elegir un lote no guarda el insumo', de: '        ? { insumo_id: o.insumo_id, lote: o.manual || o.sinLote ? null : o.lote, manual: !!o.manual, sinLote: !!o.sinLote }', a: "        ? { insumo_id: '', lote: o.manual || o.sinLote ? null : o.lote, manual: !!o.manual, sinLote: !!o.sinLote }" },
    { nombre: 'un "otro" en 0 se manda igual y la base lo rechaza', de: "        if (!(Number(o.kg ?? 0) > 0)) faltan.push(", a: '        if (false) faltan.push(' },
    { nombre: 'el rechazo de una masa queda escrito sobre la siguiente', de: "    function mostrarReceta() {\n      estado.errorReceta = null", a: '    function mostrarReceta() {' },
    // Number('') es 0: sin el guard, volver a la opción vacía del desplegable
    // elige el PRIMER lote de la lista sin que nadie lo haya tocado.
    { nombre: 'la opción vacía del desplegable elige el primer lote', de: "      const i = indice === '' || indice == null ? -1 : Number(indice)\n      const o = Number.isInteger(i) && i >= 0 ? ops[i] : undefined", a: '      const o = ops[Number(indice)]' },
    { nombre: 'menos de un kilo se lee en kilos', de: "      if (n !== 0 && Math.abs(n) < 1) return `${formatearNumeroAr(Math.round(n * 1000000) / 1000, { decimales: 3, minimos: 0 })} g`", a: '' },

    // ── Registrar, la banda y 6d ─────────────────────────────────────────
    { nombre: 'un rechazo de la base se muestra genérico', de: "        estado.errorReceta = r.error?.message || 'La base no aceptó la masa.'", a: "        estado.errorReceta = 'La base no aceptó la masa.'" },
    { nombre: 'la máquina queda elegida con datos viejos después de registrar', de: '      soltarMaquinaSala()\n      await mostrarSala()', a: '      await mostrarSala()' },
    { nombre: 'un rechazo se lleva la masa puesta', de: "      if (r.resultado === 'rechazo') {", a: '      if (false) {' },
    { nombre: 'la banda verde muestra el origen del borrador y no el de la base', de: '      if (res.origen) partes.push((ETIQUETA_ORIGEN[res.origen] ?? res.origen).toLowerCase())', a: '      partes.push(etiquetaBorrador(b))' },
    { nombre: 'la banda verde no se puede apagar', de: '      estado.exitoMasa = null\n      pintarBandaExito()', a: '      pintarBandaExito()' },
    { nombre: 'la banda de pendientes no dice que no la carguen de nuevo', de: "        return `${cual} quedó guardada en esta tablet. Se manda sola cuando vuelva la señal. No la cargues de nuevo.`", a: '        return `${cual} quedó guardada en esta tablet.`' },
    { nombre: 'las pendientes no van primero en 6d', de: '      const html = pend.map(b => htmlFilaMasaPendiente(b)).join(\'\') +\n        lista.map(m => htmlFilaMasaTurno(m, tieneTarea(\'cargar\'))).join(\'\')', a: "      const html = lista.map(m => htmlFilaMasaTurno(m, tieneTarea('cargar'))).join('') +\n        pend.map(b => htmlFilaMasaPendiente(b)).join('')" },
    { nombre: 'la pendiente no se ve tintada ni dice que espera', de: "      return '<div class=\"pr-masa-fila pr-masa-fila--espera\">' +", a: "      return '<div class=\"pr-masa-fila\">' +" },
    { nombre: '6d muestra solo las masas de la máquina elegida', de: '        estado.masasTurno = await leerMasasSala(maquinasAbiertas().map(e => e.turno.id))', a: '        estado.masasTurno = await leerMasasSala([estado.salaTurno?.id].filter(Boolean))' },
    { nombre: 'una anulada se ve como enviada y se puede anular', de: '      const estadoHtml = m.anulada', a: '      const estadoHtml = false' },
    { nombre: 'el botón de anular aparece sin permiso de cargar', de: '(puedeAnular ? `<button type="button" class="pr-btn pr-btn--secundario" data-anular-masa=', a: '(true ? `<button type="button" class="pr-btn pr-btn--secundario" data-anular-masa=' },
    { nombre: 'una masa sin turno se cuelga de una máquina libre', de: "      if (!turnoId) return '—'\n      const e = (estado.tablero ?? []).find(x => x.turno && x.turno.id === turnoId)", a: "      const e = (estado.tablero ?? []).find(x => x.turno?.id === turnoId)" },
    { nombre: 'anular sin motivo', de: "      if (motivo.length < 3) { err.textContent = 'Escribí el motivo (al menos 3 letras).'", a: "      if (motivo.length < 0) { err.textContent = 'Escribí el motivo (al menos 3 letras).'" },
    { nombre: 'anular manda otra masa', de: "supabase.rpc('anular_masa', { p_masa_id: estado.anulando, p_motivo: motivo })", a: "supabase.rpc('anular_masa', { p_masa_id: null, p_motivo: motivo })" },
  ],
})
