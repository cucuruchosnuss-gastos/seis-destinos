// Mutaciones de "cómo se pide una cantidad" (05/10/2026): js/cantidades.js
// (la regla), Stock (enviar, corregir y dar de baja) e Ingreso (la recepción
// de un envío). Cada una rompe la regla a propósito y su suite tiene que dar
// rojo. Ver mutar.js (los tres guards). Corren de a una.
//
//   node pruebas/mut-cantidades-escribir.js

const path = require('path')
const { correrMutacionesEnVarios } = require('./mutar')

const RAIZ = path.join(__dirname, '..')

correrMutacionesEnVarios([
  // ── La regla compartida ────────────────────────────────────────────────
  {
    suite: path.join(__dirname, 'test-cantidades-escribir.js'),
    variable: 'ARCHIVO_JS_CANTIDADES',
    original: path.join(RAIZ, 'js/cantidades.js'),
    funciones: [],
    manuales: [
      { nombre: 'EL BUG: la bolsa se manda como 1 kg (no multiplica por el contenido)',
        de: '  const base = Math.round(n * c * 1e6) / 1e6\n  if (modo.decimalesBase === 0',
        a: '  const base = n\n  if (modo.decimalesBase === 0' },
      { nombre: 'ignora la vista preferida (todo en bultos)',
        de: '  if (vista !== \'bulto\') return enBase\n',
        a: '\n' },
      { nombre: 'dos presentaciones se piden en bultos',
        de: '  if (conocidos.length === 1 && !haySueltos) {',
        a: '  if (conocidos.length >= 1 && !haySueltos) {' },
      { nombre: 'la parte suelta se ignora',
        de: '  if (conocidos.length === 1 && !haySueltos) {',
        a: '  if (conocidos.length === 1) {' },
      { nombre: 'el campo en su unidad queda sin unidad',
        de: 'const enBase = { enBultos: false, contenido: null, unidad: u, rotulo: u,',
        a: 'const enBase = { enBultos: false, contenido: null, unidad: u, rotulo: \'\',' },
      { nombre: 'litros dicho como "lt"',
        de: "  if (['lt', 'l', 'lts', 'litro', 'litros'].includes(u)) return 'L'",
        a: "  if (['lt', 'l', 'lts', 'litro', 'litros'].includes(u)) return 'lt'" },
      { nombre: 'sin unidad, vacío',
        de: "  if (!u) return 'unidades'",
        a: "  if (!u) return ''" },
      { nombre: 'vacío es cero',
        de: "  if (escrito === null || escrito === undefined || escrito === '') return { base: null, error: null }\n  const n = Number(escrito)",
        a: '  const n = Number(escrito)' },
      { nombre: '2,5 bultos de 3 u se redondean en silencio',
        de: '  if (modo.decimalesBase === 0 && !Number.isInteger(base)) {',
        a: '  if (false) {' },
      { nombre: 'el "= 50 kg" pierde el igual',
        de: '  return base === null ? null : `= ${formatearCantidadStock(base, modo.unidad)}`',
        a: '  return base === null ? null : `${formatearCantidadStock(base, modo.unidad)}`' },
      { nombre: 'el aviso de dos presentaciones no dice la unidad',
        de: 'como no son todos iguales, la cantidad se pide en ${u}.`',
        a: 'como no son todos iguales.`' },
      { nombre: 'los bultos sin medio bulto',
        de: 'export const DECIMALES_BULTOS_CARGA = 3',
        a: 'export const DECIMALES_BULTOS_CARGA = 0' },
      { nombre: 'volver a escribir lo guardado no divide',
        de: '  const b = Math.round((n / Number(modo.contenido)) * 1e6) / 1e6',
        a: '  const b = n' },
    ],
  },
  // ── Stock: enviar, corregir y dar de baja ──────────────────────────────
  {
    suite: path.join(__dirname, 'test-stock-numeros.js'),
    original: path.join(RAIZ, 'modulos/stock.html'),
    funciones: [],
    manuales: [
      { nombre: 'stock: el envío manda lo escrito sin convertir',
        de: "      const { base } = aUnidadBase(leerCantidadEscrita(document.getElementById('ti-cantidad'), modo), modo)",
        a: "      const base = leerCantidadEscrita(document.getElementById('ti-cantidad'), modo)" },
      { nombre: 'stock: el envío ignora la vista del insumo',
        de: "        vista: ti.insumo.vista_preferida,",
        a: "        vista: 'base'," },
      { nombre: 'stock: el envío no mira las otras presentaciones del lote',
        de: "        contenidos: [...conocidas, cont],\n        haySueltos: haySueltos || cont === null,\n        decimalesBase: decimalesCantidad(ti.insumo.unidad_medida ?? ''),",
        a: "        contenidos: [cont],\n        haySueltos: haySueltos || cont === null,\n        decimalesBase: decimalesCantidad(ti.insumo.unidad_medida ?? '')," },
      { nombre: 'stock: el campo no dice la unidad',
        de: "      ui('unidad-cantidad').textContent = modo ? modo.rotulo : ''",
        a: "      ui('unidad-cantidad').textContent = ''" },
      { nombre: 'stock: sin el "= 50 kg" debajo',
        de: '      eq.hidden = !txt\n',
        a: '      eq.hidden = true\n' },
      { nombre: 'stock: sin el aviso de por qué se pide en kg',
        de: '      aviso.hidden = !modo?.aviso\n',
        a: '      aviso.hidden = true\n' },
      { nombre: 'stock: la conversión que no sirve no se dice',
        de: "      if (ti.insumo && cant === null) err('ti-error-cantidad', convTi.error || 'Escribí cuánto mandás.')",
        a: "      if (ti.insumo && cant === null) err('ti-error-cantidad', 'Escribí cuánto mandás.')" },
      { nombre: 'stock: la baja manda lo escrito sin convertir',
        de: '      const r = aUnidadBase(Math.abs(n), modo)\n',
        a: '      const r = { base: Math.abs(n), error: null }\n' },
      { nombre: 'stock: la baja ignora la vista del insumo',
        de: "        vista: m.insumo.vista_preferida,",
        a: "        vista: 'bulto'," },
      { nombre: 'stock: el ajuste pierde el signo al convertir',
        de: '      return r.base === null ? r : { base: n < 0 ? -r.base : r.base, error: null }',
        a: '      return r' },
    ],
  },
  // ── Ingreso: recibir un envío ──────────────────────────────────────────
  {
    suite: path.join(__dirname, 'test-materia-prima-numeros.js'),
    original: path.join(RAIZ, 'modulos/materia-prima.html'),
    funciones: [],
    manuales: [
      { nombre: 'ingreso: la recepción pide bultos siempre que hay contenido (lo de antes)',
        de: '      if (modoRecepcion(it).enBultos) return baseDesdeBultos(it.bultos, it.fraccion, it.contenido)',
        a: '      if (it.contenido != null) return baseDesdeBultos(it.bultos, it.fraccion, it.contenido)' },
      { nombre: 'ingreso: la recepción ignora la vista del insumo',
        de: '        vista: it.vista,\n',
        a: "        vista: 'bulto',\n" },
      { nombre: 'ingreso: el embed no trae la preferencia',
        de: "          vista: it.insumos?.vista_preferida ?? 'base',",
        a: "          vista: 'base'," },
    ],
  },
])
