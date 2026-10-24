// Mutaciones del faltante de un retiro (ver test-faltante-retiro.js): el
// archivo común (js/faltante-retiro.js) y lo que hacen con él la Carga y
// Administración.
const path = require('path')
const fs = require('fs')
const { correrMutacionesEnVarios, automaticasEnJs } = require('./mutar')

const RAIZ = path.join(__dirname, '..')
const SUITE = path.join(__dirname, 'test-faltante-retiro.js')
const JS = path.join(RAIZ, 'js', 'faltante-retiro.js')
// Sacar cada escFr() de los renders del cartel (un archivo .js no tiene
// <script>: las automáticas se arman con automaticasEnJs).
const RENDERS = ['htmlPreguntaFr', 'htmlProduccionFr', 'htmlOtroFr', 'htmlLoteFr', 'htmlAjusteFr', 'htmlListoFr', 'htmlErrorFr']
// EQUIVALENTES (se cuentan aparte): lo que sale del código y no puede traer
// ningún carácter para escapar —el id del título (una constante), las cajas
// (un número formateado), los errores de lectura (textos fijos) y "hay N
// cajas"—: sacarles el escape no cambia ninguna salida posible.
const EQUIVALENTE = /escFr\((op\.idTitulo|textoCajasFr\([^)]*\)|f\.errorPlanillas|f\.errorLotes|det)\)/
const TODAS = RENDERS.flatMap(fn => automaticasEnJs(fs.readFileSync(JS, 'utf8'), fn, 'escFr'))
const SIN_ESCAPE = TODAS.filter(m => !EQUIVALENTE.test(m.nombre))
console.log(`(${TODAS.length - SIN_ESCAPE.length} equivalentes, aparte: escapes de textos del código)`)

correrMutacionesEnVarios([
  {
    suite: SUITE,
    original: JS,
    funciones: [],
    escape: 'escFr',
    manuales: [
      ...SIN_ESCAPE,
      // Los textos.
      { nombre: 'la planilla sin el lote', de: "    p.lote !== null && p.lote !== undefined && p.lote !== '' ? 'lote ' + p.lote : null,\n  ]", a: '  ]' },
      { nombre: 'la planilla de otro día sin la fecha', de: "  if (p.fecha && hoy && String(p.fecha).slice(0, 10) !== hoy) partes.push(fechaCortaFr(p.fecha))", a: '' },
      { nombre: 'esperando inventa la máquina', de: "  return m ? `Esperando la planilla de ${m}${lote}` : `Esperando una planilla en curso${lote}`", a: "  return `Esperando la planilla de ${m || 'Máquina 1'}${lote}`" },
      { nombre: 'aceptada dice lo de en_produccion', de: "  if (revision === 'aceptada') return `Listo: ya salieron del lote que produjo ${laMaquinaFr(planilla)}.`\n", a: '' },
      { nombre: 'un ausente es 0', de: "  if (!Number.isFinite(v)) return '—'", a: "  if (!Number.isFinite(v)) return '0'" },
      { nombre: 'sin punto de miles', de: "  return formatearNumeroAr(Math.round(v), { decimales: 0 })", a: '  return String(Math.round(v))' },
      { nombre: 'los lotes incluyen SIN STOCK', de: ".filter(l => l?.lote && l.lote !== 'SIN STOCK' && Number(l.cajas) > 0)", a: '.filter(l => l?.lote)' },
      { nombre: 'un lote alcanza aunque no tenga todas', de: 'alcanza: Number(l.cajas) >= n }', a: 'alcanza: Number(l.cajas) > 0 }' },
      // La pregunta.
      { nombre: 'ofrece el ajuste sin precios', de: "    (op.puedeAjustar ? `<button type=\"button\" class=\"fr-link fr-link--chico\" data-fr=\"ajuste\">Otro / ajustar</button>` : '')", a: "    `<button type=\"button\" class=\"fr-link fr-link--chico\" data-fr=\"ajuste\">Otro / ajustar</button>`" },
      { nombre: 'sin planillas: panel mudo', de: "  else if (!f.planillas.length) cuerpo = '<p class=\"fr-sub\">No hay ninguna planilla abierta en esta fábrica. Si se produce más tarde, dejalo pendiente: lo revisa Administración.</p>'", a: "  else if (!f.planillas.length) cuerpo = ''" },
      { nombre: 'el traspaso en la misma pestaña', de: 'target="_blank" rel="noopener">Ir al traspaso', a: '>Ir al traspaso' },
      { nombre: 'el lote que no alcanza se puede tocar', de: "aria-pressed=\"${elegido}\"${l.alcanza && !f.enviando ? '' : ' disabled'}>", a: 'aria-pressed="${elegido}">' },
      // a) Se están produciendo.
      { nombre: 'planillas de otra fábrica', de: "rpc('planillas_en_curso', { p_unidad_negocio_id: f.item.unidadId })", a: "rpc('planillas_en_curso', { p_unidad_negocio_id: null })" },
      { nombre: 'a la planilla sin el renglón', de: "rpc('faltante_en_produccion', { p_item_id: f.item.itemId, p_turno_id: planilla.turno_id })", a: "rpc('faltante_en_produccion', { p_item_id: null, p_turno_id: planilla.turno_id })" },
      { nombre: 'la revisión de la base no manda', de: "    const revision = typeof data === 'string' ? data : 'en_produccion'", a: "    const revision = 'en_produccion'" },
      { nombre: 'doble toque manda dos', de: "  if (f.enviando && accion !== 'volver') return\n", a: '' },
      { nombre: 'a) el error de la base se tapa', de: "    console.error('No se pudo pasar el faltante a la planilla:', err)\n    f.enviando = false\n    // Los mensajes de la base ya vienen escritos para una persona: tal cual.\n    f.error = err?.message || 'No se pudo guardar. Probá de nuevo.'", a: "    console.error('No se pudo pasar el faltante a la planilla:', err)\n    f.enviando = false\n    f.error = 'No se pudo guardar. Probá de nuevo.'" },
      { nombre: 'a) no avisa a la pantalla', de: "    f.resultado = { revision, planilla: { maquina: planilla.maquina ?? null, lote: planilla.lote ?? null, turno: planilla.turno ?? null }, mensaje: mensajeProduccion(revision, planilla) }\n    f.paso = 'listo'\n    f.enviando = false\n    ctx.alResolver?.(f.resultado, f.item)", a: "    f.resultado = { revision, planilla: { maquina: planilla.maquina ?? null, lote: planilla.lote ?? null, turno: planilla.turno ?? null }, mensaje: mensajeProduccion(revision, planilla) }\n    f.paso = 'listo'\n    f.enviando = false" },
      // b) Entró de otro lado.
      { nombre: 'los lotes sin el cono', de: 'p_presentacion_id: f.item.presentacionId, p_marca_id: f.item.marcaId ?? null,', a: 'p_presentacion_id: f.item.presentacionId, p_marca_id: null,' },
      { nombre: 'con un lote que alcanza no lo elige', de: '    if (alcanzan.length === 1) f.loteElegido = alcanzan[0].lote\n', a: '' },
      { nombre: 'elige cualquier lote', de: "    const l = (f.lotes ?? []).find(x => x.lote === valor)\n    if (!l || !l.alcanza) return", a: "    const l = (f.lotes ?? []).find(x => x.lote === valor)\n    if (!l) return" },
      { nombre: 'b) sin motivo igual llama', de: "  const motivoMal = validarMotivoFaltante(f.motivo, 'de dónde vino (por ejemplo: \"traspaso desde Dolce Pasta\")')\n  if (motivoMal) { f.error = motivoMal; ctx.repintar?.(); return }", a: '' },
      { nombre: 'b) el motivo sin limpiar', de: "rpc('faltante_a_lote', { p_item_id: f.item.itemId, p_lote: f.loteElegido, p_motivo: limpioFr(f.motivo) })", a: "rpc('faltante_a_lote', { p_item_id: f.item.itemId, p_lote: f.loteElegido, p_motivo: f.motivo })" },
      { nombre: 'volver de los lotes va a la pregunta', de: "    const destino = f.paso === 'lote' ? 'otro' : 'pregunta'", a: "    const destino = 'pregunta'" },
      { nombre: 'Admin: volver no cierra el panel', de: "    if (destino === 'pregunta' && ctx.alVolverAlPrincipio) { ctx.alVolverAlPrincipio(); return }\n", a: '' },
      // c) Ajustar.
      { nombre: 'c) el ajuste sin precios se abre', de: "  if (accion === 'ajuste') { if (!ctx.puedeAjustar) return; irAFr(ctx, 'ajuste')", a: "  if (accion === 'ajuste') { irAFr(ctx, 'ajuste')" },
      { nombre: 'c) motivo corto igual llama', de: "  const motivoMal = validarMotivoFaltante(f.motivo, 'qué pasó (por ejemplo: \"se compró y no se cargó el ingreso\")')\n  if (motivoMal) { f.error = motivoMal; ctx.repintar?.(); return }", a: '' },
      { nombre: 'c) llama a otra cosa', de: "rpc('resolver_faltante_retiro', { p_item_id: f.item.itemId, p_motivo: limpioFr(f.motivo) })", a: "rpc('faltante_a_lote', { p_item_id: f.item.itemId, p_motivo: limpioFr(f.motivo) })" },
      // Sin el id.
      { nombre: 'sin el id igual llama', de: '  if (!f || !puedeResolverFaltante(f)) return', a: '  if (!f) return' },
      { nombre: 'el textarea con letra chica', de: 'border-radius: 8px; font: inherit; font-size: 16px; resize: vertical; }', a: 'border-radius: 8px; font: inherit; font-size: 14px; resize: vertical; }' },
    ],
  },
  {
    suite: SUITE,
    original: path.join(RAIZ, 'modulos', 'retiros.html'),
    variable: 'ARCHIVO_RETIROS',
    funciones: [],
    escape: 'esc',
    manuales: [
      { nombre: 'Carga: no abre el cartel al confirmar', de: '        if (estado.hecho === h) abrirFaltantesDeHecho()\n', a: '' },
      { nombre: 'Carga: abre el cartel en un reintento', de: '      if (!h || h.reintento) return false', a: '      if (!h) return false' },
      { nombre: 'Carga: los insumos también al cartel', de: "      return (Array.isArray(lista) ? lista : []).filter(x => x && !x.insumo).map(x => {", a: "      return (Array.isArray(lista) ? lista : []).filter(x => x).map(x => {" },
      { nombre: 'Carga: el cono aunque sea sin cono', de: "        : { presentacionId: r.presentacionId ?? null, marcaId: r.conCono ? (r.marcaId ?? null) : null })", a: "        : { presentacionId: r.presentacionId ?? null, marcaId: r.marcaId ?? null })" },
      { nombre: 'Carga: la base no manda', de: '        const deLaBase = x.presentacion_id !== undefined && x.presentacion_id !== null', a: '        const deLaBase = false' },
      { nombre: 'Carga: el renglón corrido', de: '        const r = Array.isArray(renglones) ? renglones[Number(x.renglon) - 1] : null', a: '        const r = Array.isArray(renglones) ? renglones[Number(x.renglon)] : null' },
      { nombre: 'Carga: la leyenda vieja vuelve', de: "      return `<div class=\"rt-falt-estado\"><p class=\"rt-falt-estado__titulo\">Lo que no estaba en stock</p><ul>${filas}</ul></div>`", a: "      return `<div class=\"rt-aviso rt-aviso--grave\"><strong>No había stock de todo.</strong> La orden salió igual<ul>${filas}</ul></div>`" },
      { nombre: 'Carga: sin id muestra el botón', de: "        const boton = d.itemId && !res && !enCurso\n", a: "        const boton = !res && !enCurso\n" },
      { nombre: 'Carga: lo resuelto no se guarda', de: '      h.resueltos = { ...(h.resueltos ?? {}), [item.itemId]: res }\n', a: '' },
      { nombre: 'Carga: esperar es "pendiente"', de: "      if (res?.revision === 'en_produccion') return { texto: textoEsperando(res.planilla), clase: '' }\n", a: '' },
      { nombre: 'Carga: el ajuste sin precios', de: "        get puedeAjustar() { return puedeRetirosEn('precios', estado.falt?.f?.item?.unidadId) },", a: '        get puedeAjustar() { return true },' },
      { nombre: 'Carga: el cartel sin "precios" para el html', de: "        puedeAjustar: puedeRetirosEn('precios', f.item.unidadId), linkTraspaso: LINK_TRASPASO,", a: '        puedeAjustar: true, linkTraspaso: LINK_TRASPASO,' },
      { nombre: 'Carga: el siguiente no avanza', de: '      return c.idx + 1 < c.cola.length ? c.idx + 1 : null', a: '      return null' },
      { nombre: 'Carga: cerrar no esconde', de: "      document.getElementById('rt-falt').hidden = true\n", a: '' },
      { nombre: 'Carga: cerrar mientras manda', de: '      if (!c || c.f?.enviando) return\n      estado.falt = null', a: '      if (!c) return\n      estado.falt = null' },
      { nombre: 'Mis retiros: el faltante corrido', de: '${htmlFaltanteMio(o.renglones?.[i], o)}</div>`', a: '${htmlFaltanteMio(r, o)}</div>`' },
      { nombre: 'Mis retiros: esperar sin la máquina', de: "      const p = (estado.planillasMio ?? []).find(x => String(x.turno_id) === String(r?.turno_produccion_id))", a: '      const p = null' },
      { nombre: 'Mis retiros: no lee las planillas', de: "      if (!falta || estado.planillasMio) return\n", a: '      return\n' },
      { nombre: 'Mis retiros: sin el botón', de: "        const boton = r.item_id && r.presentacion_id\n", a: '        const boton = false\n' },
    ],
  },
  {
    suite: SUITE,
    original: path.join(RAIZ, 'modulos', 'administracion.html'),
    variable: 'ARCHIVO_ADM',
    funciones: [],
    escape: 'esc',
    manuales: [
      { nombre: 'Admin: el insumo con los dos botones', de: "      if (!esProductoRevisar(f)) {\n        return `<div class=\"ad-barra-acciones\">", a: "      if (false) {\n        return `<div class=\"ad-barra-acciones\">" },
      { nombre: 'Admin: "otro" sin presentación prendido', de: "${sinPresentacion ? ' disabled title=\"No se pudo leer qué producto es: aceptalo con «Otro / ajustar»\"' : ''}", a: '' },
      { nombre: 'Admin: no completa la presentación', de: '        await completarRenglonesRevisar(filas)\n', a: '' },
      { nombre: 'Admin: "otro" se abre sin presentación', de: "      if (accion === 'otro' && !fila.presentacion_id) return\n", a: '' },
      { nombre: 'Admin: resolver no saca el renglón', de: '      rv.filas = rv.filas.filter(x => x.item_id !== item.itemId)\n', a: '' },
      { nombre: 'Admin: volver no cierra', de: '        alVolverAlPrincipio: () => { estado.revisar.falt = null; pintarRevisar() },\n', a: '' },
      { nombre: 'Admin: el ajuste no cierra el faltante', de: '      if (rv.falt?.f?.enviando) return\n      rv.falt = null\n', a: '      if (rv.falt?.f?.enviando) return\n' },
      { nombre: 'Admin: los botones no hacen nada', de: "        else if ((b = e.target.closest('[data-revisar-produccion]'))) abrirFaltanteRevisar(b.dataset.revisarProduccion, 'produccion')\n", a: '' },
      { nombre: 'Admin orden: esperar sin la máquina', de: "        const p = (d.planillas ?? []).find(x => String(x.turno_id) === String(it.turno_produccion_id))", a: '        const p = null' },
      { nombre: 'Admin orden: el pendiente sin motivo', de: "        return `<div class=\"ad-error-pegado\">${esc('Faltaban ' + textoCajasFr(it.faltante) + ' en stock: por revisar' + (motivo ? ' · ' + motivo : ''))}</div>`", a: "        return `<div class=\"ad-error-pegado\">${esc('Faltaban ' + textoCajasFr(it.faltante) + ' en stock: por revisar')}</div>`" },
      { nombre: 'Admin orden: no lee la revisión', de: 'subtotal, lote, faltante, revision, revision_motivo, turno_produccion_id, tipo,', a: 'subtotal, lote, tipo,' },
      { nombre: 'Admin orden: la anulada dice el faltante', de: "      if (it?.insumo_id || d?.orden?.estado === 'anulada') return ''", a: "      if (it?.insumo_id) return ''" },
    ],
  },
])
