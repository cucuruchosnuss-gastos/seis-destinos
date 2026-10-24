// Mutaciones de test-produccion-ingreso-propia.js (la producción propia en el
// ingreso de producto terminado de la gestión, 24/10/2026). Ver mutar.js y
// mutar-produccion.js. El escapado del ingreso ya lo mutan solas
// mut-produccion-ingreso.js (htmlRenglonIngreso, htmlLoteIngreso,
// opcionesIngreso); acá va a mano el esc() nuevo, el del nombre de la fábrica.
//
//   node pruebas/mut-produccion-ingreso-propia.js
//
// UN RUNNER POR VEZ: dos corridas en paralelo se pisan el mut-tmp-*.html.

const path = require('path')
const { correrMutacionesProduccion } = require('./mutar-produccion')

const G = 'gestion'
correrMutacionesProduccion({
  suite: path.join(__dirname, 'test-produccion-ingreso-propia.js'),
  escape: 'esc',
  funciones: [],
  manuales: [
    // ── El origen, a la base ───────────────────────────────────────────
    { archivo: G, nombre: 'sin la opción de producción propia', de: "    const ORIGENES_INGRESO = ['propia', 'proveedor', 'fabrica']", a: "    const ORIGENES_INGRESO = ['proveedor', 'fabrica']" },
    { archivo: G, nombre: 'producción propia va sin fábrica de origen', de: "      if (ing.origen === 'propia') return { p_proveedor_id: null, p_unidad_origen_id: ing.unidadId || null }", a: "      if (ing.origen === 'propia') return { p_proveedor_id: null, p_unidad_origen_id: null }" },
    { archivo: G, nombre: 'producción propia manda la otra fábrica guardada', de: "      if (ing.origen === 'propia') return { p_proveedor_id: null, p_unidad_origen_id: ing.unidadId || null }", a: "      if (ing.origen === 'propia') return { p_proveedor_id: null, p_unidad_origen_id: ing.unidadOrigenId || null }" },
    { archivo: G, nombre: 'producción propia manda también el proveedor', de: "      if (ing.origen === 'propia') return { p_proveedor_id: null, p_unidad_origen_id: ing.unidadId || null }", a: "      if (ing.origen === 'propia') return { p_proveedor_id: ing.proveedorId || null, p_unidad_origen_id: ing.unidadId || null }" },
    // ── El lote de fabricación ─────────────────────────────────────────
    { archivo: G, nombre: 'producción propia pregunta por el último lote', de: "      if (ing?.origen === 'propia') return 'fabricacion'\n", a: '' },
    { archivo: G, nombre: 'sin lote de fabricación dice otra cosa', de: "        if (!lote && ing.origen === 'propia') return `Renglón ${n}: poné el lote de fabricación.`\n", a: '' },
    { archivo: G, nombre: 'el rótulo dice siempre "Lote"', de: "      const rotulo = ing?.origen === 'propia' ? 'Lote de fabricación' : 'Lote'", a: "      const rotulo = 'Lote'" },
    { archivo: G, nombre: 'el rótulo dice siempre "Lote de fabricación"', de: "      const rotulo = ing?.origen === 'propia' ? 'Lote de fabricación' : 'Lote'", a: "      const rotulo = 'Lote de fabricación'" },
    { archivo: G, nombre: 'el lote de fabricación no es obligatorio', de: "campo(' required aria-required=\"true\"', r.lote, 'El lote de esta tanda')", a: "campo('', r.lote, 'El lote de esta tanda')" },
    { archivo: G, nombre: 'el lote de fabricación trae el vigente', de: "campo(' required aria-required=\"true\"', r.lote, 'El lote de esta tanda')", a: "campo(' required aria-required=\"true\"', r.loteVigente, 'El lote de esta tanda')" },
    { archivo: G, nombre: 'el lote de fabricación de solo lectura', de: "campo(' required aria-required=\"true\"', r.lote, 'El lote de esta tanda')", a: "campo(' readonly aria-readonly=\"true\"', r.lote, 'El lote de esta tanda')" },
    { archivo: G, nombre: 'entrar a producción propia no suelta el vigente del Sí', de: "      if (r.loteResp === 'si') r.lote = ''\n", a: '' },
    { archivo: G, nombre: 'entrar a producción propia no suelta la respuesta', de: "      if (r.loteResp === 'si') r.lote = ''\n      r.loteResp = ''", a: "      if (r.loteResp === 'si') r.lote = ''" },
    { archivo: G, nombre: 'el lote se suelta con cualquier cambio de origen', de: "      if ((antes === 'propia') !== (tipo === 'propia')) for", a: '      if (true) for' },
    { archivo: G, nombre: 'el lote no se suelta nunca', de: "      if ((antes === 'propia') !== (tipo === 'propia')) for", a: '      if (false) for' },
    // ── Elegida por defecto (origen_tipo 'fabrica') ────────────────────
    { archivo: G, nombre: 'tocar un origen no lo marca a mano', de: '      if (aMano) ing.origenAMano = true\n', a: '' },
    { archivo: G, nombre: 'lo sugerido cuenta como elegido a mano', de: "      if (propio && ing.origen !== 'propia') elegirOrigenIngreso(ing, 'propia', false)", a: "      if (propio && ing.origen !== 'propia') elegirOrigenIngreso(ing, 'propia')" },
    { archivo: G, nombre: 'lo elegido a mano se pisa', de: '      if (!ing || ing.origenAMano) return', a: '      if (!ing) return' },
    { archivo: G, nombre: 'mira otro origen_tipo', de: "r.productoId && origenTipoDe(ing.catalogo, r.productoId) === 'fabrica')", a: "r.productoId && origenTipoDe(ing.catalogo, r.productoId) === 'unidad')" },
    { archivo: G, nombre: 'cualquier producto sugiere producción propia', de: "r.productoId && origenTipoDe(ing.catalogo, r.productoId) === 'fabrica')", a: 'r.productoId)' },
    { archivo: G, nombre: 'lo sugerido no se suelta', de: "      else if (!propio && ing.origen === 'propia') { ing.origen = null; for (const r of ing.renglones) soltarLoteDeOrigen(r) }\n", a: '' },
    { archivo: G, nombre: 'origenTipoDe lee otra columna', de: ".find(p => p.id === productoId)?.origen_tipo ?? null", a: ".find(p => p.id === productoId)?.tipo_masa ?? null" },
    { archivo: G, nombre: 'elegir el producto no sugiere', de: '        if (pres.length === 1) r.presentacionId = pres[0].id\n        sugerirOrigenIngreso(ing)\n', a: '        if (pres.length === 1) r.presentacionId = pres[0].id\n' },
    { archivo: G, nombre: 'quitar un renglón no vuelve a sugerir', de: 'ing.renglones.filter(r => r.id !== b.dataset.ingQuitar); sugerirOrigenIngreso(ing);', a: 'ing.renglones.filter(r => r.id !== b.dataset.ingQuitar);' },
    { archivo: G, nombre: 'cambiar la fábrica que recibe no vuelve a sugerir', de: '        ing.renglones = [nuevoRenglonIngreso()]\n        sugerirOrigenIngreso(ing)\n', a: '        ing.renglones = [nuevoRenglonIngreso()]\n' },
    { archivo: G, nombre: 'el catálogo no lee origen_tipo', de: "select('id, nombre, orden, tipo_masa, origen_tipo')", a: "select('id, nombre, orden, tipo_masa')" },
    // ── La pantalla ────────────────────────────────────────────────────
    { archivo: G, nombre: 'el nombre de la fábrica sin escapar', de: "Producción propia (${esc(estado.unidades.get(ing.unidadId) ?? 'esta fábrica')})", a: "Producción propia (${estado.unidades.get(ing.unidadId) ?? 'esta fábrica'})" },
    { archivo: G, nombre: 'el botón sin el nombre de la fábrica', de: "Producción propia (${esc(estado.unidades.get(ing.unidadId) ?? 'esta fábrica')})", a: 'Producción propia' },
    { archivo: G, nombre: 'el botón nunca queda marcado', de: "data-ing-origen=\"propia\" aria-pressed=\"${ing.origen === 'propia' ? 'true' : 'false'}\"", a: 'data-ing-origen="propia" aria-pressed="false"' },
    { archivo: G, nombre: 'el botón no ocupa la fila', de: 'class="pr-ing__op pr-ing__op--propia" data-ing-origen="propia"', a: 'class="pr-ing__op" data-ing-origen="propia"' },
    { archivo: G, nombre: 'la fila entera sin estilo', de: '    .pr-ing__op--propia { grid-column: 1 / -1; }\n', a: '' },
    { archivo: G, nombre: 'la nota siempre', de: "${ing.origen === 'propia' ? '<p class=\"pr-texto-suave pr-ing__nota\">", a: "${true ? '<p class=\"pr-texto-suave pr-ing__nota\">" },
    { archivo: G, nombre: 'la nota nunca', de: "${ing.origen === 'propia' ? '<p class=\"pr-texto-suave pr-ing__nota\">", a: "${false ? '<p class=\"pr-texto-suave pr-ing__nota\">" },
    // ── Las salidas entre fábricas ─────────────────────────────────────
    { archivo: G, nombre: 'las salidas listan la producción propia', de: '        s.filas = s.filas.filter(f => !f.destino_id || f.destino_id !== f.unidad_origen_id)\n', a: '' },
    { archivo: G, nombre: 'las salidas listan SOLO la producción propia', de: 'f => !f.destino_id || f.destino_id !== f.unidad_origen_id', a: 'f => !f.destino_id || f.destino_id === f.unidad_origen_id' },
  ],
})
