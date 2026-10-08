// Mutaciones de test-produccion-corregir-completo.js: corregir TODO un sublote
// (planta y gestión) con corregir_produccion_item_completo. De a una.
//
//   node pruebas/mut-produccion-corregir-completo.js

const path = require('path')
const { correrMutacionesProduccion } = require('./mutar-produccion')

correrMutacionesProduccion({
  suite: path.join(__dirname, 'test-produccion-corregir-completo.js'),
  // Sacar el esc() de los renders nuevos de la gestión.
  funciones: ['opcion', 'htmlCamposCorreccion', 'htmlEditorSublote'],
  soloGestion: ['htmlEditorSublote'],
  manuales: [
    // ── La planta ─────────────────────────────────────────────────────
    { nombre: 'planta: manda todo y no solo lo que cambió', de: "      for (const [k, v] of Object.entries(ahora)) if ((antes[k] ?? null) !== (v ?? null)) datos[k] = v\n      return datos\n    }\n\n    function cerrarCorregir()", a: "      for (const [k, v] of Object.entries(ahora)) datos[k] = v\n      return datos\n    }\n\n    function cerrarCorregir()" },
    { nombre: 'planta: el cono de doble bolsa no fuerza el embolsado', de: "      if (conoDobleBolsa(cat, a?.marcaId)) return 'doble'", a: "      if (false) return 'doble'" },
    { nombre: 'planta: un renglón viejo gana embolsado de regalo', de: "        if (!(antes.embolsado == null && a.embolsado == null && emb === 'ninguno')) ahora.embolsado = emb", a: "        ahora.embolsado = emb" },
    { nombre: 'planta: sin cono el cono no va en null', de: "        marca_id: pr?.con_cono ? (a.marcaId ?? null) : null,", a: "        marca_id: a.marcaId ?? null," },
    { nombre: 'planta: sin cambios llama igual', de: "      if (!Object.keys(datos).length) { err.textContent = 'No cambiaste nada: tocá el paso que querés corregir.'; err.hidden = false; return }", a: '' },
    { nombre: 'planta: sin motivo llama igual', de: "      if (motivo.length < 3) { err.textContent = 'Escribí por qué lo corregís, con tres letras por lo menos.'; err.hidden = false; return }", a: '' },
    { nombre: 'planta: el error de la base se tapa', de: "          : (e?.message || 'No se pudo guardar la corrección.')", a: "          : 'No se pudo guardar la corrección.'" },
    { nombre: 'planta: un doble toque manda dos veces', de: "      if (!a || a.guardando) return\n      const err = document.getElementById('pr-agregar-error')", a: "      if (!a) return\n      const err = document.getElementById('pr-agregar-error')" },
    { nombre: 'planta: los conos rechazados se ofrecen', de: "      return !!m && m.activa !== false && (m.estado_alta === 'aprobada' || m.estado_alta === 'pendiente_revision')", a: "      return !!m", archivo: 'planta' },
    { nombre: 'planta sin catálogo: usa la RPC vieja', de: "await supabase.rpc('corregir_produccion_item_completo', { p_item_id: c.id, p_datos: { cajas }, p_motivo: motivo })", a: "await supabase.rpc('corregir_produccion_item', { p_item_id: c.id, p_cajas: cajas, p_motivo: motivo })" },
    // ── La gestión ────────────────────────────────────────────────────
    { nombre: 'gestión: los conos rechazados se ofrecen', de: "      return !!m && m.activa !== false && (m.estado_alta === 'aprobada' || m.estado_alta === 'pendiente_revision')", a: "      return !!m", archivo: 'gestion' },
    { nombre: 'gestión: la reventa se ofrece', de: "        .filter(p => p?.origen_producto_id == null)\n      const ids = productos.map(p => p.id)\n      const presentaciones = ids.length ? await leer(", a: "\n      const ids = productos.map(p => p.id)\n      const presentaciones = ids.length ? await leer(" },
    { nombre: 'gestión: manda todo y no solo lo que cambió', de: "      for (const [k, v] of Object.entries(ahora)) if ((antes[k] ?? null) !== (v ?? null)) datos[k] = v\n      return datos\n    }\n\n    function opcion(", a: "      for (const [k, v] of Object.entries(ahora)) datos[k] = v\n      return datos\n    }\n\n    function opcion(" },
    { nombre: 'gestión: sin cono el cono no va en null', de: "        ahora.marca_id = pr?.con_cono ? (e.marcaId ?? null) : null", a: "        ahora.marca_id = e.marcaId ?? null" },
    { nombre: 'gestión: sin empaque manda la caja igual', de: "        if (!e.cat.empaqueError) {\n          ahora.caja_insumo_id", a: "        if (true) {\n          ahora.caja_insumo_id" },
    { nombre: 'gestión: el cono de doble bolsa no fuerza', de: "      if (pr?.con_cono && conoDobleBolsa(e.cat, e.marcaId)) return 'doble'", a: '' },
    { nombre: 'gestión: un renglón viejo gana embolsado de regalo', de: "          if (!(antes.embolsado == null && e.embolsado == null && emb === 'ninguno')) ahora.embolsado = emb", a: "          ahora.embolsado = emb" },
    { nombre: 'gestión: el select del embolsado no se traba', de: "id=\"pr-hist-corr-embolsado\"${forzado ? ' disabled' : ''}", a: "id=\"pr-hist-corr-embolsado\"" },
    { nombre: 'gestión: se ofrecen cajas no habilitadas', de: "        const habilitadas = cajasDe(cat, e.presentacionId)", a: "        const habilitadas = (cat.cajas ?? [])" },
    { nombre: 'gestión: otra presentación no trae su caja', de: "        const ini = cajaInicial(cat, presId)\n        e.cajaId = ini.cajaId", a: "        const ini = { cajaId: e.cajaId, cajaElegida: true }\n        e.cajaId = ini.cajaId" },
    { nombre: 'gestión: sin la caja predeterminada', de: "      if (pred && cajas.some(c => c.insumo_id === pred)) return { cajaId: pred, cajaElegida: true }", a: '', archivo: 'gestion' },
    { nombre: 'gestión: otra caja no trae su embolsado', de: "        e.cajaElegida = true\n        e.embolsado = embolsadoSugerido(cat, e.presentacionId, e.cajaId)", a: "        e.cajaElegida = true" },
    { nombre: 'gestión: otra presentación sin cono deja el cono', de: "        if (!pr?.con_cono) e.marcaId = null\n", a: '' },
    { nombre: 'gestión: un producto con una presentación no la elige', de: "        if (presDe.length === 1) ponerPresentacion(presDe[0].id)\n        else", a: "        if (false) ponerPresentacion(presDe[0].id)\n        else" },
    { nombre: 'gestión: el cono que tenía no se ve', de: "        if (e.marcaId && !ofrecibles.some(m => m.id === e.marcaId)) {", a: "        if (false) {" },
    { nombre: 'gestión: sin presentación se manda', de: "      if (e.cat && !e.presentacionId) return 'Elegí la presentación.'\n", a: '' },
    { nombre: 'gestión: sin cambios se manda', de: "      if (!Object.keys(datosCorreccionSublote(e, p)).length) return 'No cambiaste nada: cambiá lo que está mal y escribí por qué.'\n", a: '' },
    { nombre: 'gestión: sin motivo se manda', de: "      if (String(e.motivo ?? '').trim().length < 3) return 'Escribí el motivo para guardar.'\n", a: '' },
    { nombre: 'gestión: usa la RPC vieja de solo cajas', de: "await supabase.rpc('corregir_produccion_item_completo', { p_item_id: p.id, p_datos: datosCorreccionSublote(e, p), p_motivo: motivo })", a: "await supabase.rpc('corregir_produccion_item', { p_item_id: p.id, p_cajas: e.cajas, p_motivo: motivo })" },
    { nombre: 'gestión: un doble toque manda dos veces', de: "      if (!e || !p || e.enviando) return false\n      const falta = faltaEnCorreccion(e, p)", a: "      if (!e || !p) return false\n      const falta = faltaEnCorreccion(e, p)" },
    { nombre: 'gestión: el error de la base se tapa', de: "        console.error('corregir sublote:', err)\n        error = err?.message || 'No hubo respuesta del servidor. Revisá la conexión.'", a: "        console.error('corregir sublote:', err)\n        error = 'No hubo respuesta del servidor. Revisá la conexión.'" },
    { nombre: 'gestión: el catálogo no se espera', de: "      if (modo === 'corregir') e.carga = cargarCatalogoCorreccion(e, d.turno.unidad_negocio_id)", a: '' },
    { nombre: 'gestión: sin catálogo no se dice', de: "      if (!e.cat) return '<div class=\"pr-aviso pr-aviso--grave pg-corr__ancho\">No se pudieron leer los productos de la fábrica: por ahora solo se pueden corregir las cajas.</div>'", a: "      if (!e.cat) return ''" },
    { nombre: 'gestión: la corrección completa se dice con su clave cruda', de: "        : c.tipo === 'datos'\n", a: "        : false\n" },
    { nombre: 'gestión: la corrección completa no dice las cajas', de: "`Corregido${c.cajas_antes !== c.cajas_despues ?", a: "`Corregido${false ?" },
    { nombre: 'gestión: los selects no cambian nada', de: "if (String(ev.target?.id ?? '').startsWith('pr-hist-corr-') && ev.target.tagName === 'SELECT') cambiarCampoCorreccion(ev.target.id, ev.target.value)", a: "if (false) cambiarCampoCorreccion(ev.target.id, ev.target.value)" },
  ],
})
