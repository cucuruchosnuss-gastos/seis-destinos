// Mutaciones de test-materia-prima-por-ingresar.js. Ver mutar.js (los tres
// guards: suite verde sobre el limpio, ancla única, mutación que cambia algo).
//
//   node pruebas/mut-materia-prima-por-ingresar.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

const RAIZ = path.join(__dirname, '..')

correrMutaciones({
  suite: path.join(__dirname, 'test-materia-prima-por-ingresar.js'),
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/materia-prima.html'),
  // Automáticas: cada esc() de los renders nuevos.
  funciones: ['htmlPorIngresar', 'htmlFotoCompletar', 'htmlFaltanRenglones'],
  manuales: [
    // ── El payload de la RPC ──
    { nombre: 'p_origen pasa a ir fijo en factura', de: '          p_origen: fila.origen,\n', a: "          p_origen: 'factura',\n" },
    { nombre: 'se suma un parámetro de más a la RPC', de: '          p_id: fila.id,\n        })', a: '          p_id: fila.id,\n          p_unidad: fila.unidad_negocio_id,\n        })' },
    { nombre: 'el botón no se traba mientras manda', de: "      btn.disabled = true\n      btn.textContent = 'Un momento…'\n      estado.porIngresarError = null", a: "      btn.textContent = 'Un momento…'\n      estado.porIngresarError = null" },
    { nombre: 'la lista no se recarga después de crear', de: '      await cargarFacturasPorIngresar()\n      await cargarIngresos()\n      document.getElementById', a: '      await cargarIngresos()\n      document.getElementById' },
    // ── El aviso ──
    { nombre: 'el aviso se muestra también con la lista vacía', de: '      aviso.hidden = !filas.length\n', a: '      aviso.hidden = false\n' },
    { nombre: 'el texto del aviso cambia', de: 'Si la mercadería ya está contada en el inventario, no la cargues', a: 'Si la mercadería ya está contada, no la cargues' },
    // ── Permiso ──
    { nombre: 'la lista se consulta sin materia_prima:cargar', de: '      if (!puedeCargarMp()) {\n        estado.porIngresar = []', a: '      if (false) {\n        estado.porIngresar = []' },
    { nombre: 'el acceso aparece sin permiso', de: '      btn.hidden = !puedeCargarMp() || (!n && !estado.errorPorIngresar)', a: '      btn.hidden = (!n && !estado.errorPorIngresar)' },
    { nombre: 'la tarea que habilita pasa a ser ver_todo', de: "const puedeCargarMp = () => tieneTarea('materia_prima', 'cargar')", a: "const puedeCargarMp = () => tieneTarea('materia_prima', 'ver_todo')" },
    // ── La lista ──
    { nombre: 'un importe null deja de decir "—"', de: "const importe = importeConMoneda(f.importe, f.moneda) ?? '—'", a: "const importe = importeConMoneda(f.importe ?? 0, f.moneda) ?? '—'" },
    { nombre: 'los gastos de "Pagado sin ingresar" no se sacan', de: "return (estado.porIngresar ?? []).filter(f => !(f.origen === 'gasto' && pagados.has(f.id)))", a: 'return (estado.porIngresar ?? [])' },
    { nombre: 'las gemelas no se marcan', de: '          gemela: filas.some(o => o !== f && mismo(', a: '          gemela: false && filas.some(o => o !== f && mismo(' },
    { nombre: 'claveNumeroDocMp deja de partir un grupo largo', de: '      if (g.length >= 9) return', a: '      if (g.length >= 99) return' },
    { nombre: 'la fila sin proveedor no cae a la razón social', de: "const titulo = f.proveedor || f.razon_social || '(sin proveedor)'", a: "const titulo = f.proveedor || '(sin proveedor)'" },
    // ── Errores ──
    { nombre: 'el error de CHECK se muestra crudo', de: "      if (String(error?.code || '') === '23514' || /check constraint|violates/i.test(msg)) {", a: '      if (false) {' },
    { nombre: 'un mensaje propio de la RPC se tapa con un genérico', de: "      return msg || 'No se pudo crear el ingreso. Probá de nuevo en un momento.'", a: "      return 'No se pudo crear el ingreso. Probá de nuevo en un momento.'" },
    { nombre: 'con error se abre el wizard igual', de: '        renderizarPorIngresar()   // redibuja el botón, destrabado\n        return\n', a: '        renderizarPorIngresar()   // redibuja el botón, destrabado\n' },
    // ── Modo completar: foto y OCR ──
    { nombre: 'la foto se baja con la ruta cruda (sin rutaFotoMp)', de: '      const ruta = rutaFotoMp(guardada)\n', a: '      const ruta = guardada\n' },
    { nombre: 'el OCR recibe otro archivo', de: '        const imagen_base64 = await fileABase64(archivo)\n        const { data, error } = await supabase.functions.invoke(\'ocr-materia-prima\', {\n          body: { imagen_base64, mime_type: archivo.type },', a: '        const imagen_base64 = await fileABase64({})\n        const { data, error } = await supabase.functions.invoke(\'ocr-materia-prima\', {\n          body: { imagen_base64, mime_type: archivo.type },' },
    { nombre: 'el OCR que corre es el de Gastos', de: "        const { data, error } = await supabase.functions.invoke('ocr-materia-prima', {\n          body: { imagen_base64, mime_type: archivo.type },", a: "        const { data, error } = await supabase.functions.invoke('ocr-comprobante', {\n          body: { imagen_base64, mime_type: archivo.type }," },
    { nombre: 'los renglones del OCR no se agregan', de: '        w.items.push(...nuevos)\n', a: '' },
    { nombre: 'ok:false del OCR no se trata como error', de: "        if (!data?.ok) throw new Error(data?.mensaje || 'No se pudo leer el comprobante')\n        if (estado.wizard !== w) return\n        const renglones", a: '        if (estado.wizard !== w) return\n        const renglones' },
    { nombre: 'la miniatura no se pone', de: '      if (img && w.completar.foto.url) img.src = w.completar.foto.url\n', a: '' },
    { nombre: 'el render de la foto no se muestra', de: '      fotoEl.innerHTML = htmlFotoCompletar(w.completar)\n      fotoEl.hidden = false\n', a: '      fotoEl.innerHTML = htmlFotoCompletar(w.completar)\n' },
    { nombre: 'Ver foto → deja de llevar la ruta', de: '<button type="button" data-ruta-foto="${esc(f.ruta)}" class="comprobante-mp__foto">Ver foto →</button>', a: '<button type="button" class="comprobante-mp__foto">Ver foto →</button>' },
    // ── Modo completar: confirmar ──
    { nombre: 'confirmarIngreso ya no deriva al modo completar', de: '      if (w.completar) return confirmarCompletarIngreso()\n', a: '' },
    { nombre: 'los renglones van con otro ingreso_id', de: '        const filas = w.items.flatMap(item => filasItemParaBase(item, ingresoId))\n        const { error: errorItems } = await supabase.from(\'materia_prima_items\').insert(filas)\n        if (errorItems) throw new Error(mensajeErrorItems(errorItems))\n\n        let avisoAlias', a: '        const filas = w.items.flatMap(item => filasItemParaBase(item, null))\n        const { error: errorItems } = await supabase.from(\'materia_prima_items\').insert(filas)\n        if (errorItems) throw new Error(mensajeErrorItems(errorItems))\n\n        let avisoAlias' },
    { nombre: 'un reintento vuelve a crear los productos nuevos', de: 'const porCrear = w.items.filter(i => i.esNuevo && i.creando && !i.insumoId)', a: 'const porCrear = w.items.filter(i => i.esNuevo && i.creando)' },
    { nombre: 'el insert fallido deja el botón trabado', de: "      w.guardando = false\n      btn.disabled = false\n      btn.textContent = 'Confirmar ingreso'\n    }\n\n    // ═══════════════════════════════════════════════════════════════════════\n    // PENDIENTES", a: "    }\n\n    // ═══════════════════════════════════════════════════════════════════════\n    // PENDIENTES" },
    { nombre: 'después de completar no se recarga "Facturas por ingresar"', de: '        await cargarPagadoSinIngresar()\n        await cargarFacturasPorIngresar()\n        if (buscarEntrega(ingresoId)) await abrirDetalleIngreso(ingresoId)\n        return', a: '        await cargarPagadoSinIngresar()\n        if (buscarEntrega(ingresoId)) await abrirDetalleIngreso(ingresoId)\n        return' },
    { nombre: 'el modo completar vuelve a pedir el total', de: '      return !w.completar && esFactura(w.encabezado.tipoDoc)', a: '      return esFactura(w.encabezado.tipoDoc)' },
    { nombre: 'volver desde ítems en modo completar va a Datos', de: "        ? { confirmar: 'items' }[w.paso]", a: "        ? { confirmar: 'items', items: 'datos' }[w.paso]" },
    { nombre: 'salir del modo completar no recarga el listado', de: '          cerrarWizard()\n          cargarIngresos()\n          return', a: '          cerrarWizard()\n          return' },
    // ── Faltan los renglones ──
    { nombre: 'faltan: se ignora el destino contable', de: '      if (!(c.gasto_id || c.factura_pendiente_id)) return false\n', a: '' },
    { nombre: 'faltan: se ignora el remito vinculado', de: '      if (c.remito_vinculado_id || estado.facturasConRemito?.has(c.id)) return false\n', a: '' },
    { nombre: 'faltan: un remito también cuenta', de: "      if (!c || c.tipo_doc === 'remito') return false", a: '      if (!c) return false' },
    { nombre: 'faltan: el botón aparece sin permiso', de: '        ${puedeCargarMp() ? `<button type="button" class="btn-mp-primario btn-completar-ingreso"', a: '        ${true ? `<button type="button" class="btn-mp-primario btn-completar-ingreso"' },
    { nombre: 'el listado no dibuja "Faltan los renglones"', de: '            ${htmlFaltanRenglones(e)}\n', a: '' },
    { nombre: 'el botón de la tarjeta abre también el detalle', de: '          if (completar) { abrirCompletarIngreso(completar.dataset.completar); return }', a: '          if (completar) { abrirCompletarIngreso(completar.dataset.completar) }' },
    { nombre: 'el detalle sin renglones no lo dice', de: ".join('') || htmlFaltanRenglones(entrega) || '<p", a: ".join('') || '<p" },
  ],
})
