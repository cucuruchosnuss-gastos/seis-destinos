// Mutaciones de test-administracion-revisar.js (Retiros por revisar,
// 28/09/2026). Ver mutar.js.
//
//   node pruebas/mut-administracion-revisar.js
const path = require('path')
const { correrMutaciones } = require('./mutar')
const { limitesAdministracion } = require('./fuente-cheques')

correrMutaciones({
  suite: path.join(__dirname, 'test-administracion-revisar.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/administracion.html'),
  region: limitesAdministracion,
  funciones: ['htmlFilaRevisar', 'pintarRevisar'],
  equivalentes: [
    { expr: 'esc(rv.error)', motivo: 'texto constante del código: lo pone mostrarRevisar()' },
  ],
  manuales: [
    // Quién la ve
    { nombre: 'la ve quien solo ve retiros', de: "      { id: 'revisar', titulo: 'Retiros por revisar', permiso: ['retiros', 'precios'] },", a: "      { id: 'revisar', titulo: 'Retiros por revisar', permiso: ['retiros', 'ver'] }," },
    { nombre: 'se abre sin permiso', de: "      if (!puedeEn('retiros', 'precios', estado.empresaId)) { mostrarInicio(); return }\n      mostrarVista('ad-vista-revisar')", a: "      mostrarVista('ad-vista-revisar')" },
    { nombre: 'la portada no la ofrece', de: "      else if (id === 'revisar') mostrarRevisar()\n", a: '' },
    // La portada
    { nombre: 'la portada no la cuenta', de: '        leerPorRevisar(unidad).then(l => { p.porRevisar = l.length })', a: '        Promise.resolve([]).then(l => { p.porRevisar = null })' },
    { nombre: 'un error en la portada da 0', de: "p.errorRevisar = 'No se pudo contar.' })", a: 'p.porRevisar = 0 })' },
    { nombre: 'la portada no muestra el número', de: "        numero = portada?.porRevisar ?? null", a: '        numero = null' },
    // La lista
    { nombre: 'se piden los de todas las empresas', de: "supabase.rpc('retiros_por_revisar', { p_unidad_negocio_id: unidadId })", a: "supabase.rpc('retiros_por_revisar', { p_unidad_negocio_id: null })" },
    { nombre: 'sin el código de la orden', de: "<span class=\"ad-fila__codigo\">${esc(f.codigo || '—')}</span><span class=\"ad-sello ad-sello--anulada\">Sin stock</span>", a: "<span class=\"ad-sello ad-sello--anulada\">Sin stock</span>" },
    { nombre: 'sin quién la cargó', de: "f.cargada_por ? 'cargó ' + f.cargada_por : null", a: 'null' },
    { nombre: 'sin cuánto faltaba', de: ' · faltaban ${cantidadRevisar(f.faltante, f.unidad)} en stock`', a: '`' },
    { nombre: 'un insumo en cajas', de: "      return !unidad || unidad === 'cajas' ?", a: '      return true ?' },
    { nombre: 'un error de la lista la deja vacía', de: "        estado.revisar.error = 'No se pudieron leer los retiros por revisar. Revisá la conexión y volvé a entrar.'", a: '        estado.revisar.filas = []' },
    { nombre: 'la respuesta vieja pisa la nueva', de: '        if (turno !== turnoRevisar) return\n        estado.revisar.filas = filas', a: '        estado.revisar.filas = filas' },
    { nombre: 'sin la cuenta', de: "      cuenta.textContent = rv.filas.length === 1 ? '1 renglón por revisar' : `${rv.filas.length} renglones por revisar`", a: "      cuenta.textContent = ''" },
    // Aceptar
    { nombre: 'Aceptar sin motivo', de: '      if (limpio(a.motivo).length < LARGO_MINIMO_MOTIVO_REVISAR) {', a: '      if (false) {' },
    { nombre: 'el motivo sin limpiar', de: "{ p_item_id: a.itemId, p_motivo: limpio(a.motivo) }", a: '{ p_item_id: a.itemId, p_motivo: a.motivo }' },
    { nombre: 'Aceptar manda otro renglón', de: "{ p_item_id: a.itemId, p_motivo: limpio(a.motivo) }", a: "{ p_item_id: rv.filas[rv.filas.length - 1]?.item_id, p_motivo: limpio(a.motivo) }" },
    { nombre: 'el aceptado queda en la lista', de: '        rv.filas = rv.filas.filter(x => x.item_id !== a.itemId)\n', a: '' },
    { nombre: 'el error de la base se tapa', de: "        a.error = err?.message || 'No se pudo aceptar. Probá de nuevo.'", a: "        a.error = 'No se pudo aceptar. Probá de nuevo.'" },
    { nombre: 'el botón queda trabado después del error', de: "        console.error('No se pudo aceptar el renglón:', err)\n        a.enviando = false", a: "        console.error('No se pudo aceptar el renglón:', err)" },
    { nombre: 'un doble toque manda dos veces', de: '      if (!a || a.enviando) return\n      a.motivo', a: '      if (!a) return\n      a.motivo' },
    { nombre: 'mientras manda el botón no se traba', de: "id=\"ad-revisar-si\"${abierto.enviando ? ' disabled' : ''}>", a: 'id="ad-revisar-si">' },
    { nombre: 'Cancelar no cierra', de: '    function cancelarAceptarRevisar() {\n      estado.revisar.aceptando = null', a: '    function cancelarAceptarRevisar() {' },
    { nombre: 'se abre un renglón que no está', de: '      if (!rv.filas?.some(f => f.item_id === itemId)) return\n', a: '' },
    { nombre: 'no se dice que quedó aceptado', de: "        mostrarExito('Renglón aceptado.')\n", a: '' },
    { nombre: 'el motivo tipeado no se guarda', de: "if (e.target.id === 'ad-revisar-motivo' && estado.revisar.aceptando) estado.revisar.aceptando.motivo = e.target.value", a: "if (false) estado.revisar.aceptando.motivo = e.target.value" },
  ],
})
