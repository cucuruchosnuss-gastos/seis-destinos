// Mutaciones de "cómo se pide y se muestra un precio" (23/10/2026):
// js/cantidades.js (la regla y el redondeo) y Stock → Costos (el costo por
// bulto). Cada una rompe la regla a propósito y su suite tiene que dar rojo.
// Ver mutar.js (los tres guards). Corren de a una.
//
//   node pruebas/mut-cantidades-precios.js

const path = require('path')
const { correrMutacionesEnVarios } = require('./mutar')

const RAIZ = path.join(__dirname, '..')

correrMutacionesEnVarios([
  // ── La regla compartida ────────────────────────────────────────────────
  {
    suite: path.join(__dirname, 'test-cantidades-precios.js'),
    variable: 'ARCHIVO_JS_CANTIDADES',
    original: path.join(RAIZ, 'js/cantidades.js'),
    funciones: [],
    manuales: [
      { nombre: 'EL BUG: el precio del bulto se manda como precio por kilo (no divide)',
        de: '  return Math.round((n / modo.contenido) * factor) / factor',
        a: '  return Math.round(n * factor) / factor' },
      { nombre: 'se manda redondeado a centavos (la bolsa de 30 kg vuelve 17.499,90)',
        de: 'export const DECIMALES_PRECIO_BASE = 8',
        a: 'export const DECIMALES_PRECIO_BASE = 2' },
      { nombre: 'ignora la vista preferida (la lecitina por bulto)',
        de: "  if (vista === 'bulto' && Number.isFinite(c) && c > 0) {",
        a: '  if (Number.isFinite(c) && c > 0) {' },
      { nombre: 'sin contenido conocido se rompe (contenido 0 cuenta)',
        de: "  if (vista === 'bulto' && Number.isFinite(c) && c > 0) {",
        a: "  if (vista === 'bulto' && Number.isFinite(c)) {" },
      { nombre: 'el rótulo no dice de cuánto es el bulto',
        de: "rotulo: `bulto de ${formatearCantidadStock(c, u)}` }",
        a: "rotulo: 'bulto' }" },
      { nombre: 'vacío es cero al mandar',
        de: "  if (escrito === null || escrito === undefined || escrito === '') return null\n  const n = Number(escrito)\n  if (!Number.isFinite(n)) return null\n  if (!modo?.porBulto) return n",
        a: "  const n = Number(escrito)\n  if (!Number.isFinite(n)) return null\n  if (!modo?.porBulto) return n" },
      { nombre: 'volver a mostrar solo multiplica (17.499,90)',
        de: '  return mejor ? mejor.p : directo\n}',
        a: '  return directo\n}' },
      { nombre: 'volver a mostrar ignora el subtotal',
        de: '  const conSubtotal = Number.isFinite(q) && q > 0 && Number.isFinite(s)',
        a: '  const conSubtotal = false' },
      { nombre: 'volver a mostrar ignora cómo redondea la base',
        de: '    if (Math.abs(Math.round(porBase * factor) / factor - b) > paso / 1000) continue\n',
        a: '' },
      { nombre: 'el subtotal se compara con signo (la devolución no cierra)',
        de: "  const s = subtotal === null || subtotal === undefined || subtotal === '' ? NaN : Math.abs(Number(subtotal))",
        a: "  const s = subtotal === null || subtotal === undefined || subtotal === '' ? NaN : Number(subtotal)" },
      { nombre: 'entre varios gana el primero, no el más redondo',
        de: '    if (!mejor || r > mejor.r || (r === mejor.r && dist < mejor.dist)) mejor = { p: cent / 100, r, dist }',
        a: '    if (!mejor) mejor = { p: cent / 100, r, dist }' },
      { nombre: 'ausente al mostrar es $ 0',
        de: "  if (base === null || base === undefined || base === '') return null\n  const b = Number(base)",
        a: "  const b = Number(base)" },
      { nombre: 'dos presentaciones dan "un" bulto',
        de: '  return conocidos.length === 1 ? conocidos[0] : null',
        a: '  return conocidos.length ? conocidos[0] : null' },
    ],
  },
  // ── Stock → Costos: el costo por bulto ─────────────────────────────────
  {
    suite: path.join(__dirname, 'test-stock-costos.js'),
    original: path.join(RAIZ, 'modulos/stock.html'),
    funciones: [],
    manuales: [
      { nombre: 'stock: el costo de la lista ignora la presentación (solo por kg)',
        de: '${esc(textoCostoUnitario(costo, f.unidad_medida, presentacionCosto(estado.costos?.unidad, f.insumo_id)))}',
        a: '${esc(textoCostoUnitario(costo, f.unidad_medida))}' },
      { nombre: 'stock: el costo por bulto sin el kilo al lado',
        de: '      return `${plataCosto(precioDesdeBase(v, modo, { decimalesBase: 4 }))} el ${modo.rotulo} · ${porUnidad}`',
        a: '      return `${plataCosto(precioDesdeBase(v, modo, { decimalesBase: 4 }))} el ${modo.rotulo}`' },
      { nombre: 'stock: el costo del bulto no multiplica (dice el del kilo)',
        de: '      return `${plataCosto(precioDesdeBase(v, modo, { decimalesBase: 4 }))} el ${modo.rotulo} · ${porUnidad}`',
        a: '      return `${plataCosto(v)} el ${modo.rotulo} · ${porUnidad}`' },
      { nombre: 'stock: todo por bulto aunque la vista sea base',
        de: '      const modo = modoDePrecio({ unidad, vista: pres?.vista, contenido: pres?.contenido ?? null })',
        a: "      const modo = modoDePrecio({ unidad, vista: 'bulto', contenido: pres?.contenido ?? 25 })" },
      { nombre: 'stock: el historial no sabe la presentación',
        de: "                <p>¿Anular el costo de ${esc(textoCostoUnitario(h.costo_unitario, m.unidadMedida, { contenido: m.contenido, vista: m.vista }))}",
        a: "                <p>¿Anular el costo de ${esc(textoCostoUnitario(h.costo_unitario, m.unidadMedida))}" },
    ],
  },
])
