// Mutaciones de test-produccion-ingreso.js (el ingreso de producto terminado
// en la gestión, 14/10/2026). Ver mutar.js y mutar-produccion.js.
//
//   node pruebas/mut-produccion-ingreso.js
//
// UN RUNNER POR VEZ: dos corridas en paralelo se pisan el mut-tmp-*.html.

const path = require('path')
const { correrMutacionesProduccion } = require('./mutar-produccion')

correrMutacionesProduccion({
  suite: path.join(__dirname, 'test-produccion-ingreso.js'),
  escape: 'esc',
  funciones: ['htmlRenglonIngreso', 'htmlLoteIngreso', 'opcionesIngreso'],
  soloGestion: ['htmlRenglonIngreso', 'htmlLoteIngreso', 'opcionesIngreso'],
  equivalentes: [
    { expr: 'esc(r.id)', motivo: "el id del renglón lo arma el código ('r' y un contador)" },
    { expr: 'esc(vacia)', motivo: 'el texto de la opción vacía es constante del código' },
    { expr: 'esc(placeholder)', motivo: 'el placeholder del lote es texto constante del código' },
  ],
  manuales: [
    // ── Proveedor O otra fábrica, nunca los dos ─────────────────────────
    { nombre: 'pasar a proveedor no suelta la fábrica', de: "      if (tipo === 'proveedor') ing.unidadOrigenId = ''\n", a: "      if (tipo === 'proveedor') {}\n" },
    { nombre: 'pasar a otra fábrica no suelta el proveedor', de: "      else { ing.proveedorId = null; ing.proveedorNombre = ''; ing.busqueda = '' }", a: "      else { ing.busqueda = '' }" },
    { nombre: 'acepta cualquier origen', de: "      if (tipo !== 'proveedor' && tipo !== 'fabrica') return\n      ing.origen = tipo", a: "      ing.origen = tipo" },
    { nombre: 'de un proveedor también manda la fábrica', de: "      if (ing.origen === 'proveedor') return { p_proveedor_id: ing.proveedorId || null, p_unidad_origen_id: null }", a: "      if (ing.origen === 'proveedor') return { p_proveedor_id: ing.proveedorId || null, p_unidad_origen_id: ing.unidadOrigenId || null }" },
    { nombre: 'de otra fábrica también manda el proveedor', de: "      if (ing.origen === 'fabrica') return { p_proveedor_id: null, p_unidad_origen_id: ing.unidadOrigenId || null }", a: "      if (ing.origen === 'fabrica') return { p_proveedor_id: ing.proveedorId || null, p_unidad_origen_id: ing.unidadOrigenId || null }" },
    // ── El armado ──────────────────────────────────────────────────────
    { nombre: 'viajan los renglones vacíos', de: '      return ing.renglones.filter(r => r.presentacionId).map(r => {', a: '      return ing.renglones.map(r => {' },
    { nombre: 'el cono viaja aunque la presentación no lleve', de: '          marca_id: pr?.con_cono && r.marcaId ? r.marcaId : null,', a: '          marca_id: r.marcaId ? r.marcaId : null,' },
    { nombre: 'el precio viaja también de otra fábrica', de: "          precio_caja: ing.origen === 'proveedor' && r.precio != null ? r.precio : null,", a: '          precio_caja: r.precio != null ? r.precio : null,' },
    { nombre: 'un lote vacío viaja vacío y no null', de: '          lote: lote || null,', a: '          lote,' },
    { nombre: 'el remito sin recortar', de: "      const remito = String(ing.remito ?? '').trim()\n", a: "      const remito = String(ing.remito ?? '')\n" },
    { nombre: 'observaciones vacías viajan vacías', de: '        p_observaciones: obs || null,', a: '        p_observaciones: obs,' },
    { nombre: 'sin client_uuid', de: '        p_client_uuid: ing.clientUuid,\n', a: '' },
    { nombre: 'un uuid nuevo en cada intento', de: '        p_client_uuid: ing.clientUuid,\n', a: '        p_client_uuid: crypto.randomUUID(),\n' },
    // ── Lo que falta ───────────────────────────────────────────────────
    { nombre: 'deja pasar sin origen', de: "      if (ing.origen !== 'proveedor' && ing.origen !== 'fabrica') return 'Elegí de dónde viene: un proveedor o una fábrica del grupo.'\n", a: '' },
    { nombre: 'deja pasar sin proveedor', de: "      if (ing.origen === 'proveedor' && !ing.proveedorId) return 'Elegí el proveedor.'\n", a: '' },
    { nombre: 'deja pasar sin fábrica de origen', de: "      if (ing.origen === 'fabrica' && !ing.unidadOrigenId) return 'Elegí la fábrica de donde viene.'\n", a: '' },
    { nombre: 'deja pasar la misma fábrica', de: "      if (ing.origen === 'fabrica' && ing.unidadOrigenId === ing.unidadId) return 'La fábrica de origen tiene que ser otra.'\n", a: '' },
    { nombre: 'deja pasar sin productos', de: "      if (!usados.length) return 'Cargá al menos un producto.'\n", a: '' },
    { nombre: 'deja pasar sin presentación', de: '        if (!r.presentacionId) return `Renglón ${n}: elegí el producto y la presentación.`\n', a: '' },
    { nombre: 'deja pasar con cono sin cono elegido', de: '        if (pr?.con_cono && !r.marcaId) return', a: '        if (false) return' },
    { nombre: 'acepta cajas con decimales', de: '        if (!Number.isInteger(r.cajas) || r.cajas <= 0) return', a: '        if (r.cajas == null || r.cajas <= 0) return' },
    { nombre: 'acepta cero cajas', de: '        if (!Number.isInteger(r.cajas) || r.cajas <= 0) return', a: '        if (!Number.isInteger(r.cajas) || r.cajas < 0) return' },
    { nombre: 'acepta precio negativo', de: "        if (ing.origen === 'proveedor' && r.precio != null && r.precio < 0) return", a: '        if (false) return' },
    { nombre: 'frena por un precio que no viaja', de: "        if (ing.origen === 'proveedor' && r.precio != null && r.precio < 0) return", a: '        if (r.precio != null && r.precio < 0) return' },
    // ── Guardar ────────────────────────────────────────────────────────
    { nombre: 'dos toques mandan dos', de: '      if (!ing || ing.enviando) return\n      const falta = faltaIngreso(', a: '      if (!ing) return\n      const falta = faltaIngreso(' },
    { nombre: 'manda aunque falte algo', de: '      if (falta) { mostrarErrorIngreso(ing, falta); return }', a: '      if (falta) { mostrarErrorIngreso(ing, falta) }' },
    { nombre: 'el error de la base no se muestra tal cual', de: "        ing.error = err?.message && !/fetch|network/i.test(err.message) ? err.message", a: "        ing.error = err?.message && !/fetch|network/i.test(err.message) ? 'No se pudo guardar.'" },
    { nombre: 'sin conexión muestra el error técnico', de: "        ing.error = err?.message && !/fetch|network/i.test(err.message) ? err.message", a: '        ing.error = err?.message ? err.message' },
    { nombre: 'después de un error queda trabado', de: "        console.error('ingresar_producto_terminado:', err)\n        ing.enviando = false\n", a: "        console.error('ingresar_producto_terminado:', err)\n" },
    { nombre: 'no vuelve al stock', de: '      await mostrarStockTerminado()\n    }\n\n    function conectarIngreso() {', a: '    }\n\n    function conectarIngreso() {' },
    { nombre: 'no muestra la fábrica que recibió', de: '      estado.stockUnidad = ing.unidadId\n      estado.ing = null', a: '      estado.ing = null' },
    // ── El lote (21/10/2026): "¿Sigue siendo este?" ────────────────────
    { nombre: 'sin contestar la pregunta se guarda igual', de: "        if (modoLoteIngreso(r) === 'pregunta') return", a: '        if (false) return' },
    { nombre: 'sin lote se guarda igual', de: "        if (!lote) return `Renglón ${n}: escribí el lote.`\n", a: '' },
    { nombre: 'sin tope de 40', de: '        if (lote.length > LARGO_MAXIMO_LOTE) return', a: '        if (false) return' },
    { nombre: 'el tope es 41', de: '    const LARGO_MAXIMO_LOTE = 40', a: '    const LARGO_MAXIMO_LOTE = 41' },
    { nombre: 'el lote sin mayúsculas', de: "      return String(texto ?? '').trim().toUpperCase()", a: "      return String(texto ?? '').trim()" },
    { nombre: 'el lote sin recortar', de: "      return String(texto ?? '').trim().toUpperCase()", a: "      return String(texto ?? '').toUpperCase()" },
    { nombre: 'con Sí viaja lo escrito', de: "      return normalizarLoteIngreso(modoLoteIngreso(r) === 'si' ? r.loteVigente : r.lote)", a: '      return normalizarLoteIngreso(r.lote)' },
    { nombre: 'sin vigente se pregunta igual', de: "      if (!r.loteVigente) return 'otro'\n", a: '' },
    { nombre: 'sin contestar ya cuenta como Sí', de: "      if (r.loteResp === 'si') return 'si'", a: "      if (r.loteResp !== 'otro') return 'si'" },
    { nombre: '"No, es otro" no vacía el lote', de: "      r.lote = resp === 'si' ? r.loteVigente : ''", a: "      r.lote = r.loteVigente" },
    { nombre: 'Sí no pone el vigente', de: "      r.lote = resp === 'si' ? r.loteVigente : ''", a: "      r.lote = ''" },
    { nombre: 'acepta cualquier respuesta', de: "      if (!r || !r.loteVigente || (resp !== 'si' && resp !== 'otro')) return", a: '      if (!r) return' },
    { nombre: 'Sí sin vigente', de: "      if (!r || !r.loteVigente || (resp !== 'si' && resp !== 'otro')) return", a: "      if (!r || (resp !== 'si' && resp !== 'otro')) return" },
    { nombre: 'cambiar de producto conserva la respuesta', de: "        r.lote = ''; r.loteResp = ''", a: "        r.lote = ''" },
    { nombre: 'la pregunta sin el último lote', de: 'Último lote: <strong>${esc(r.loteVigente)}</strong>. ¿Sigue siendo este?', a: '¿Sigue siendo este?' },
    { nombre: 'con Sí el campo se puede editar', de: "      const input = modo === 'si' ? campo(' readonly aria-readonly=\"true\"', r.loteVigente, '')", a: "      const input = modo === 'si' ? campo('', r.loteVigente, '')" },
    { nombre: 'el campo no es obligatorio', de: "        : modo === 'otro' ? campo(' required aria-required=\"true\"', r.lote, 'Escribí el lote')", a: "        : modo === 'otro' ? campo('', r.lote, 'Escribí el lote')" },
    { nombre: 'el campo sin largo máximo', de: ' maxlength="${LARGO_MAXIMO_LOTE}"', a: '' },
    { nombre: 'vuelve a llamar a guardar_lote_vigente', de: '      // El lote vigente lo guarda la base sola (desde el 21/10/2026).\n', a: "      await supabase.rpc('guardar_lote_vigente', { p_unidad_negocio_id: ing.unidadId })\n" },
    { nombre: 'el renglón no dibuja el lote', de: '          ${htmlLoteIngreso(r)}\n', a: '' },
    // ── Texto de listo ─────────────────────────────────────────────────
    { nombre: 'listo sin las cajas', de: "      return `Listo: entraron ${formatearNumeroAr(cajas, { decimales: 0 })} ${cajas === 1 ? 'caja' : 'cajas'}.`", a: "      return 'Listo.'" },
    { nombre: 'el reintento no lo dice', de: "      if (res?.reintento) return 'Listo: ese ingreso ya estaba cargado (no se cargó dos veces).'\n", a: '' },
    // ── El permiso ─────────────────────────────────────────────────────
    { nombre: 'super_admin sin bypass', de: "    function puedeIngresarEn(unidadId) {\n      if (estado.miRolApp === 'super_admin') return true\n", a: '    function puedeIngresarEn(unidadId) {\n' },
    { nombre: 'todas no alcanza', de: '        if (alcance?.todas === true) return true\n', a: '' },
    { nombre: 'el alcance no se mira', de: '        if (Array.isArray(alcance?.unidades) && alcance.unidades.map(String).includes(String(unidadId))) return true', a: '        if (Array.isArray(alcance?.unidades)) return true' },
    { nombre: 'sin leer el permiso se ofrece igual', de: '      if (!(estado.ingresoAlcances instanceof Map)) return false', a: '      if (!(estado.ingresoAlcances instanceof Map)) return true' },
    { nombre: 'solo materia_prima:cargar (la base acepta las dos)', de: "    const TAREAS_INGRESO = ['materia_prima:cargar', 'stock:ajustar_inventario']", a: "    const TAREAS_INGRESO = ['materia_prima:cargar']" },
    // ── Pantalla ───────────────────────────────────────────────────────
    { nombre: 'el precio se pide también de otra fábrica', de: "          ${ing.origen === 'proveedor' ? `<label class=\"pr-campo\"><span class=\"pr-campo__rotulo\">Precio por caja", a: "          ${true ? `<label class=\"pr-campo\"><span class=\"pr-campo__rotulo\">Precio por caja" },
    { nombre: 'las cajas con decimales', de: 'enlazarCampoNumero(cajas, { decimales: 0 })', a: 'enlazarCampoNumero(cajas, { decimales: 2 })' },
    { nombre: 'el botón no se pinta al mostrar el stock', de: "pintarSelectorUnidad('pr-stock-unidad', unidades, estado.stockUnidad)\n      pintarBotonIngreso()", a: "pintarSelectorUnidad('pr-stock-unidad', unidades, estado.stockUnidad)" },
    { nombre: 'los campos del ingreso a 15 px', de: '.pr-ing .pr-input, .pr-ing .pr-select, .pr-ing .pr-textarea { font-size: 16px;', a: '.pr-ing .pr-input, .pr-ing .pr-select, .pr-ing .pr-textarea { font-size: 15px;' },
  ],
})
