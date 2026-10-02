// Mutaciones de test-cantidades.js: js/cantidades.js (la regla compartida),
// la planta (modulos/produccion.html) y Stock (modulos/stock.html). Ver
// mutar.js (los tres guards). Corren de a una.
//
//   node pruebas/mut-cantidades.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

const RAIZ = path.join(__dirname, '..')
const SUITE = path.join(__dirname, 'test-cantidades.js')

const tandas = [
  // ── La planta, y por su import, js/cantidades.js ────────────────────────
  {
    suite: SUITE, variable: 'ARCHIVO_PLANTA',
    original: process.env.ARCHIVO_BASE_PLANTA || path.join(RAIZ, 'modulos/produccion.html'),
    funciones: [],
    manuales: [
      // js/cantidades.js
      { nombre: 'cantidades: la fracción no redondea al más cercano',
        de: '    if (Math.abs(resto - f.valor) < Math.abs(resto - mejor.valor)) mejor = f',
        a: '    if (resto >= f.valor) mejor = f' },
      { nombre: 'cantidades: redondear a 1 no sube el entero',
        de: "  if (mejor.valor === 1) { enteros += 1; mejor = FRACCIONES[0] }",
        a: "  if (mejor.valor === 1) { mejor = FRACCIONES[0] }" },
      { nombre: 'cantidades: null es 0 bultos',
        de: "  if (kilos === null || kilos === undefined || kilos === '') return null\n  const n = Number(kilos)",
        a: '  const n = Number(kilos)' },
      { nombre: 'cantidades: sin singular',
        de: "  const palabra = (e.enteros === 1 && !e.fraccion) ? 'bulto' : 'bultos'",
        a: "  const palabra = 'bultos'" },
      { nombre: 'cantidades: el negativo sin signo',
        de: "  const menos = e.signo < 0 ? '−' : ''",
        a: "  const menos = ''" },
      { nombre: 'cantidades: el ausente dice 0 kg',
        de: "  if (num === '—') return '—'\n  return `${num} ${unidad || ''}`.trim()",
        a: "  return `${num === '—' ? '0' : num} ${unidad || ''}`.trim()" },
      { nombre: 'cantidades: los sueltos se dividen',
        de: '    : cabezaBultos(Number(cantidad) - s, contenido)',
        a: '    : cabezaBultos(Number(cantidad), contenido)' },
      { nombre: 'cantidades: la vista no importa (siempre bultos si puede)',
        de: "  const enBultos = vista === 'bulto' && !!cabeza",
        a: '  const enBultos = !!cabeza' },
      { nombre: 'cantidades: la vista bulto sin contenido no cae a su unidad',
        de: "  const enBultos = vista === 'bulto' && !!cabeza",
        a: "  const enBultos = vista === 'bulto'" },
      { nombre: 'cantidades: la gris sin los kilos',
        de: '    secundario: enBultos ? `${cola} · ${kilos}` : conSueltos,',
        a: '    secundario: enBultos ? cola : conSueltos,' },
      { nombre: 'cantidades: la cola sin los sueltos',
        de: "    ? `de ${formatearCantidadStock(contenido, unidad)}` + (s !== 0 ? ` + ${formatearCantidadStock(s, unidad)}` : '')",
        a: '    ? `de ${formatearCantidadStock(contenido, unidad)}`' },
      { nombre: 'cantidades: textoSegunVista sin los kilos al lado',
        de: '  return conKilos && r.enBultos ? `${r.destacado} (${r.kilos})` : r.destacado',
        a: '  return r.destacado' },
      { nombre: 'cantidades: textoSegunVista con kilos también en base',
        de: '  return conKilos && r.enBultos ? `${r.destacado} (${r.kilos})` : r.destacado',
        a: '  return conKilos ? `${r.destacado} (${r.kilos})` : r.destacado' },
      // la planta
      { nombre: 'planta: la sala dice kilos siempre',
        de: '      if (!cantidadSegunVista(args).enBultos) return textoCantidad(cantidad)\n      return textoSegunVista(args, { conKilos })',
        a: '      return textoCantidad(cantidad)' },
      { nombre: 'planta: en base usa formatearCantidadStock (pierde los gramos)',
        de: '      if (!cantidadSegunVista(args).enBultos) return textoCantidad(cantidad)',
        a: '      if (!cantidadSegunVista(args).enBultos) return textoSegunVista(args)' },
      { nombre: 'planta: el contenido de otro lote',
        de: '      const contenido = p?.contenido?.get(`${insumoId}|${lote}`) ?? null',
        a: '      const contenido = [...(p?.contenido?.values() ?? [])][0] ?? null' },
      { nombre: 'planta: sin la unidad del insumo',
        de: "      const unidad = estado.stockMasa?.get(insumoId)?.unidad_medida || 'kg'",
        a: "      const unidad = 'kg'" },
      { nombre: 'planta: conQuedan no guarda el insumo',
        de: ', quedaInsumo: insumoId, quedaLote: lote }',
        a: ' }' },
      { nombre: 'planta: el renglón de la receta en kilos',
        de: 'quedan ${esc(textoStockLote(e.quedaInsumo, e.quedaLote, e.quedaAntes))}</span>`',
        a: 'quedan ${esc(textoCantidad(e.quedaAntes))}</span>`' },
      { nombre: 'planta: contenidoPorLote acepta dos presentaciones',
        de: '        else if (vistos.get(clave) !== v) vistos.set(clave, null)',
        a: '' },
      { nombre: 'planta: contenidoPorLote acepta un lote null',
        de: '        if (!f?.insumo_id || f.lote == null) continue',
        a: '        if (!f?.insumo_id) continue' },
      { nombre: 'planta: sin stock:ver consulta igual',
        de: '        if (!ids.length || puedeVerStockEn(estado.unidadId) !== true) return',
        a: '        if (!ids.length) return' },
      { nombre: 'planta: la vista de otra fábrica',
        de: ".eq('unidad_negocio_id', estado.unidadId).in('insumo_id', ids)",
        a: ".in('insumo_id', ids)" },
      { nombre: 'planta: si falla el contenido, la preferencia queda',
        de: "        console.error('bultos de la sala:', err)\n        pres.vista = new Map()",
        a: "        console.error('bultos de la sala:', err)" },
      { nombre: 'planta: las preferencias de todos (sin filtrar bulto)',
        de: ".select('id, vista_preferida').eq('vista_preferida', 'bulto')",
        a: ".select('id, vista_preferida')" },
      { nombre: 'planta: el empaque sin bultos',
        de: '      return cantidadSegunVista(args).enBultos ? textoSegunVista(args, { conKilos: true }) : num(hay)',
        a: '      return num(hay)' },
      { nombre: 'planta: el empaque con varias presentaciones arma bultos',
        de: '        contenido: Number(f.presentaciones) === 1 ? f.contenido_unico : null, sueltos: Number(f.kilos_sueltos) || 0,',
        a: '        contenido: f.contenido_unico, sueltos: Number(f.kilos_sueltos) || 0,' },
      { nombre: 'planta: el stock del empaque sin la preferencia',
        de: ".select('insumo_id, cantidad_total, unidad_medida, vista_preferida, presentaciones, contenido_unico, kilos_sueltos')",
        a: ".select('insumo_id, cantidad_total')" },
    ],
  },
  // ── Stock ───────────────────────────────────────────────────────────────
  {
    suite: SUITE, variable: 'ARCHIVO_STOCK',
    original: process.env.ARCHIVO_BASE_STOCK || path.join(RAIZ, 'modulos/stock.html'),
    funciones: [],
    manuales: [
      { nombre: 'stock: la tarjeta en kilos siempre',
        de: '          cantidad: f.cantidad_total, unidad: f.unidad_medida, vista: f.vista_preferida,',
        a: "          cantidad: f.cantidad_total, unidad: f.unidad_medida, vista: 'base'," },
      { nombre: 'stock: con varias presentaciones arma bultos',
        de: '          contenido: presentaciones === 1 ? f.contenido_unico : null, sueltos,',
        a: '          contenido: f.contenido_unico, sueltos,' },
    ],
  },
]

let det = 0, tot = 0, eq = 0, mal = 0
for (const t of tandas) {
  const r = correrMutaciones({ ...t, salir: false })
  det += r.detectadas; tot += r.total; eq += r.equivalentes; mal += r.fallas
}
console.log(`\nTOTAL: ${det}/${tot} mutaciones detectadas${eq ? ` (+${eq} equivalentes)` : ''}`)
process.exit(det === tot && !mal ? 0 : 1)
