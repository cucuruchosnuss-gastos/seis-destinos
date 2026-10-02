// CÓMO SE DICE UNA CANTIDAD (02/10/2026) — js/cantidades.js, compartido por
// Stock, la planta y la sala de masa.
//
// Exige:
//  - la regla de bultos (equivalenteEnBultos, cabezaBultos, textoBultos,
//    formatearCantidadStock) y la de la vista preferida (cantidadSegunVista,
//    textoSegunVista) en UN solo lugar: ninguna pantalla tiene su copia;
//  - LA MISMA CANTIDAD SALE IGUAL EN LAS TRES PANTALLAS: la tarjeta de Stock,
//    lo que HAY del empaque en la planta y lo que QUEDA de un lote en la sala;
//  - en la tablet: bultos cuando la preferencia es 'bulto' y el lote tiene UN
//    contenido por bulto conocido; si no, en su unidad (con los gramos de la
//    sala abajo de un kilo);
//  - si la preferencia o el contenido no se pueden leer, todo sigue en kilos
//    (nunca un bulto inventado) y sin stock:ver no se consulta la vista.
//
// Se EJECUTA el código real: las funciones de js/cantidades.js las encuentra
// extraerFn por el import de cada pantalla (pruebas/imports.js).
//
//   node pruebas/test-cantidades.js
// Archivos: ARCHIVO_STOCK / ARCHIVO_PLANTA (por defecto los de modulos/), y
// ARCHIVO_JS_CANTIDADES para mutar js/cantidades.js.

const path = require('path')
const fs = require('fs')
const { construirCon, scriptModulo } = require('./sandbox')
const { construirProduccion } = require('./sandbox-produccion')
const { arnes, leer } = require('./circuito-comun')
const { fuenteNumeros } = require('./numeros-comun')
const { FUNCIONES_CANTIDADES, CONSTANTES_CANTIDADES } = require('./cantidades-comun')

const RAIZ = path.join(__dirname, '..')
const STOCK = process.env.ARCHIVO_STOCK || path.join(RAIZ, 'modulos/stock.html')
const PLANTA = process.env.ARCHIVO_PLANTA || path.join(RAIZ, 'modulos/produccion.html')
const JS = process.env.ARCHIVO_JS_CANTIDADES || path.join(RAIZ, 'js/cantidades.js')
const FUENTE_STOCK = leer(STOCK)
const FUENTE_PLANTA = leer(PLANTA)
const FUENTE_JS = leer(JS)
const { chk, fin } = arnes()

// ── Stock: lo mínimo para dibujar una tarjeta ────────────────────────────
const PRELUDIO_STOCK = `
  ${fuenteNumeros()}
  function nuevoEl(id) {
    return { id, innerHTML: '', textContent: '', hidden: false, dataset: {}, style: {}, querySelectorAll: () => [],
      addEventListener(){}, setAttribute(){}, classList: { add(){}, remove(){}, toggle(){}, contains: () => false } }
  }
  var __els = new Map()
  var document = { getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) }, querySelectorAll: () => [] }
  var console = { log(){}, warn(){}, error(){} }
  function sinPermisoEnBarra() { return false }
  function pintarAvisoUnidad() {}
  function textoSinPermiso() { return '' }
  function stockConUnidades() { return false }
  function filasStockVisibles() { return estado.stock }
  function pintarAvisoCobertura() {}
  function htmlCobertura() { return '' }
  function coberturaDe() { return null }
  function filasCoberturaDe() { return [] }
  function coberturaPorNombre() { return new Map() }
  function abrirLotes() {}
  var estado = { stock: [], unidadBarra: null, cobertura: new Map(), filtroCobertura: false }
`
const FUNCIONES_STOCK = ['esc', 'normalizar', 'renderizarStock', 'textoLotes', 'textoPresentaciones', 'nombresRepetidos',
  'htmlMarca', 'htmlAclaracion', 'htmlAgrupado', 'agruparPorTipoYCategoria', 'ordenDe', 'htmlGrupoStock', ...FUNCIONES_CANTIDADES]

function stockSandbox() {
  // Lo que exista en ESTE archivo: con o sin la tarea de días hábiles.
  const src = scriptModulo(STOCK)
  const funciones = FUNCIONES_STOCK.filter(n => FUNCIONES_CANTIDADES.includes(n) || new RegExp(`function ${n}\\(`).test(src))
  const constantes = [...CONSTANTES_CANTIDADES, 'TIPOS', 'ORDEN_TIPO', 'CATEGORIAS', 'SIN_CATEGORIA']
    .filter(n => CONSTANTES_CANTIDADES.includes(n) || new RegExp(`\\n {4}const ${n}\\b`).test(src))
  return construirCon(STOCK, { preludio: PRELUDIO_STOCK, funciones, constantes, retorno: 'estado, __el(id){ return document.getElementById(id) }' })
}

function tarjetaStock(S, fila) {
  S.estado.stock = [fila]
  S.renderizarStock()
  const h = S.__el('lista-stock').innerHTML
  const m = /<div class="fila-stock__total[^"]*">([^<]*)<\/div>/.exec(h)
  return m ? m[1] : null
}

function fila(extra = {}) {
  return {
    unidad_negocio_id: 'u-n', insumo_id: 'h', insumo_nombre: 'Harina 000', marca: null, unidad_medida: 'kg',
    tipo: 'materia_prima', categoria: 'Harinas', aclaracion: null, cantidad_total: 6250, lotes_distintos: 1,
    presentaciones: 1, contenido_unico: 25, kilos_sueltos: 0, vista_preferida: 'bulto', ...extra,
  }
}

// ── La planta / sala ──────────────────────────────────────────────────────
function planta() {
  const P = construirProduccion(PLANTA)
  P.estado.stockMasa = new Map([['h', { insumo_id: 'h', unidad_medida: 'kg', lotes: [] }], ['c', { insumo_id: 'c', unidad_medida: 'un', lotes: [] }]])
  P.estado.presMasa = { vista: new Map([['h', 'bulto'], ['c', 'bulto']]), contenido: new Map([['h|L1', 25], ['c|C1', 500]]) }
  return P
}

async function correr() {
  // ── 1. La regla, sin pantalla (las funciones reales de js/cantidades.js) ─
  const S = stockSandbox()
  {
    chk('6.250 kg de a 25: 250 bultos', S.cabezaBultos(6250, 25) === '250 bultos')
    chk('un bulto en singular', S.cabezaBultos(25, 25) === '1 bulto')
    chk('fracción a cuartos: 3 bultos + ½', S.cabezaBultos(87.5, 25) === '3 bultos + ½')
    chk('casi entero sube: 3,9 → 4 bultos', S.cabezaBultos(97.5, 25) === '4 bultos', S.cabezaBultos(97.5, 25))
    chk('negativo con su signo', S.cabezaBultos(-50, 25) === '−2 bultos')
    chk('sin dato no hay bultos (nunca "0 bultos")', S.cabezaBultos(null, 25) === null && S.cabezaBultos('', 25) === null)
    chk('sin contenido no hay bultos', S.cabezaBultos(100, null) === null && S.cabezaBultos(100, 0) === null)
    chk('miles con punto', S.cabezaBultos(37500, 25) === '1.500 bultos')
    chk('textoBultos con la cola', S.textoBultos(6250, 25, 'kg') === '250 bultos de 25 kg')
    chk('formatearCantidadStock: miles y coma', S.formatearCantidadStock(6250.5, 'kg') === '6.250,5 kg')
    chk('formatearCantidadStock: ausente es —', S.formatearCantidadStock(null, 'kg') === '—')
    chk('formatearCantidadStock: cero de verdad', S.formatearCantidadStock(0, 'kg') === '0 kg')

    const r = S.cantidadSegunVista({ cantidad: 6350, unidad: 'kg', vista: 'bulto', contenido: 25, sueltos: 100 })
    chk('vista bulto: destacado en bultos (sin los sueltos)', r.destacado === '250 bultos', r)
    chk('vista bulto: la cola con los sueltos', r.cola === 'de 25 kg + 100 kg', r.cola)
    chk('vista bulto: la gris con la cola y los kilos', r.secundario === 'de 25 kg + 100 kg · 6.350 kg', r.secundario)
    const b = S.cantidadSegunVista({ cantidad: 6350, unidad: 'kg', vista: 'base', contenido: 25, sueltos: 100 })
    chk('vista base: destacado en kilos', b.destacado === '6.350 kg' && b.enBultos === false)
    chk('vista base: los bultos a la gris', b.secundario === '250 bultos de 25 kg + 100 kg', b.secundario)
    const sin = S.cantidadSegunVista({ cantidad: 80, unidad: 'kg', vista: 'bulto', contenido: null })
    chk('bulto sin contenido: cae a su unidad (el caso mayoritario)', sin.destacado === '80 kg' && sin.enBultos === false && sin.secundario === null)
    const nada = S.cantidadSegunVista({ cantidad: null, unidad: 'kg', vista: 'bulto', contenido: 25 })
    chk('cantidad ausente: "—", nunca "0 bultos"', nada.destacado === '—' && nada.cabeza === null)
    chk('textoSegunVista es el destacado', S.textoSegunVista({ cantidad: 6250, unidad: 'kg', vista: 'bulto', contenido: 25 }) === '250 bultos')
    chk('textoSegunVista con kilos', S.textoSegunVista({ cantidad: 6250, unidad: 'kg', vista: 'bulto', contenido: 25 }, { conKilos: true }) === '250 bultos (6.250 kg)')
    chk('textoSegunVista con kilos en base: solo los kilos', S.textoSegunVista({ cantidad: 6250, unidad: 'kg', vista: 'base', contenido: 25 }, { conKilos: true }) === '6.250 kg')
  }

  // ── 2. LA MISMA CANTIDAD, IGUAL EN LAS TRES PANTALLAS ───────────────────
  const P = planta()
  const casos = [
    // [fila de stock, lo que queda en el lote para la sala, el contenido del lote]
    { nombre: 'harina en bultos', f: fila(), queda: 6250, lote: 'L1', esperado: '250 bultos' },
    { nombre: 'harina con fracción', f: fila({ cantidad_total: 87.5 }), queda: 87.5, lote: 'L1', esperado: '3 bultos + ½' },
    { nombre: 'harina en base', f: fila({ vista_preferida: 'base' }), queda: 6250, lote: 'L1', esperado: '6.250 kg', base: true },
  ]
  for (const c of casos) {
    const enStock = tarjetaStock(S, c.f)
    if (c.base) P.estado.presMasa.vista.set('h', 'base'); else P.estado.presMasa.vista.set('h', 'bulto')
    const enSala = P.textoStockLote('h', c.lote, c.queda)
    const filaPlanta = { cantidad_total: c.f.cantidad_total, unidad_medida: 'kg', vista_preferida: c.f.vista_preferida, presentaciones: 1, contenido_unico: 25, kilos_sueltos: 0 }
    const enPlanta = P.textoHayEmpaque({ stock: { filas: new Map([['h', filaPlanta]]) } }, 'h', c.f.cantidad_total, x => `${x} crudo`)
    chk(`${c.nombre}: Stock dice ${c.esperado}`, enStock === c.esperado, enStock)
    chk(`${c.nombre}: la sala dice lo mismo`, enSala === c.esperado, enSala)
    if (c.base) chk(`${c.nombre}: la planta, el número crudo (sin bultos no se cambia)`, enPlanta === `${c.f.cantidad_total} crudo`, enPlanta)
    else chk(`${c.nombre}: la planta dice lo mismo (con los kilos al lado)`, enPlanta.startsWith(c.esperado + ' ('), enPlanta)
  }
  P.estado.presMasa.vista.set('h', 'bulto')
  // Stock con varias presentaciones: no hay "un" bulto, aunque llegara un
  // contenido_unico (la vista lo manda en null; acá se exige igual).
  chk('Stock con dos presentaciones: en kilos', tarjetaStock(S, fila({ presentaciones: 2 })) === '6.250 kg')

  // ── 3. La sala: cuándo bultos y cuándo su unidad ───────────────────────
  {
    chk('sala: lote sin contenido conocido → kilos', P.textoStockLote('h', 'OTRO', 6250) === '6.250 kg', P.textoStockLote('h', 'OTRO', 6250))
    chk('sala: insumo en base → kilos', P.textoStockLote('x', 'L1', 6250) === '6.250 kg')
    chk('sala: menos de un kilo sigue en gramos', P.textoStockLote('x', 'L1', 0.09) === '90 g', P.textoStockLote('x', 'L1', 0.09))
    chk('sala: unidades en bultos', P.textoStockLote('c', 'C1', 1500) === '3 bultos')
    chk('sala: unidades con su unidad al lado', P.textoStockLote('c', 'C1', 1500, { conKilos: true }) === '3 bultos (1.500 un)', P.textoStockLote('c', 'C1', 1500, { conKilos: true }))
    chk('sala: con kilos al lado', P.textoStockLote('h', 'L1', 50, { conKilos: true }) === '2 bultos (50 kg)')
    P.estado.presMasa = null
    chk('sala: sin haber leído la preferencia → kilos', P.textoStockLote('h', 'L1', 6250) === '6.250 kg')
    P.estado.presMasa = { vista: new Map([['h', 'bulto']]), contenido: new Map([['h|L1', 25]]) }
    // El renglón de la receta y el aviso de "no alcanza".
    const celda = P.htmlCeldaQueda({ quedaAntes: 6250, quedaInsumo: 'h', quedaLote: 'L1', noAlcanza: false })
    chk('el renglón de la receta dice "quedan 250 bultos"', /quedan 250 bultos</.test(celda), celda)
    chk('conQuedan guarda de qué insumo y lote es', (() => {
      P.estado.stockMasa.get('h').lotes = [{ lote: 'L1', queda: 100 }]
      const e = P.conQuedan({ consumo: 25 }, 'h', 'L1')
      return e.quedaInsumo === 'h' && e.quedaLote === 'L1' && e.quedaAntes === 100
    })())
  }

  // ── 4. contenidoPorLote ─────────────────────────────────────────────────
  {
    const m = P.contenidoPorLote([
      { insumo_id: 'h', lote: 'A', contenido_por_bulto: 25 },
      { insumo_id: 'h', lote: 'B', contenido_por_bulto: 25 }, { insumo_id: 'h', lote: 'B', contenido_por_bulto: 50 },
      { insumo_id: 'h', lote: 'C', contenido_por_bulto: 25 }, { insumo_id: 'h', lote: 'C', contenido_por_bulto: null },
      { insumo_id: 'h', lote: 'D', contenido_por_bulto: null },
      { insumo_id: 'h', lote: 'E', contenido_por_bulto: '25' },
      { insumo_id: 'h', lote: null, contenido_por_bulto: 25 },
    ])
    chk('una presentación: el contenido', m.get('h|A') === 25)
    chk('dos presentaciones: ninguno', !m.has('h|B'))
    chk('una presentación y algo suelto: ninguno', !m.has('h|C'))
    chk('sin presentación: ninguno', !m.has('h|D'))
    chk('el número de la base como texto', m.get('h|E') === 25)
    chk('sin lote: afuera', !m.has('h|null'))
  }

  // ── 5. leerPresentacionesMasa ──────────────────────────────────────────
  {
    const Q = construirProduccion(PLANTA)
    Q.estado.unidadId = 'u-cn'
    Q.estado.stockVer = { unidades: ['u-cn'] }
    Q.__tablas.insumos = [{ id: 'h', vista_preferida: 'bulto' }]
    Q.__tablas.v_stock_por_lote = [{ insumo_id: 'h', lote: 'L1', contenido_por_bulto: 25 }]
    await Q.leerPresentacionesMasa()
    chk('lee la preferencia', Q.estado.presMasa.vista.get('h') === 'bulto')
    chk('lee el contenido del lote', Q.estado.presMasa.contenido.get('h|L1') === 25)
    const consulta = Q.__llamadas.consultas.find(c => c[0] === 'v_stock_por_lote')
    chk('la vista se pide de SU fábrica y de esos insumos', consulta && consulta[1].some(f => f[0] === 'eq' && f[1] === 'unidad_negocio_id' && f[2] === 'u-cn') &&
      consulta[1].some(f => f[0] === 'in' && f[1] === 'insumo_id' && f[2].includes('h')))
    const ins = Q.__llamadas.consultas.find(c => c[0] === 'insumos')
    chk('las preferencias: solo las de bultos', ins && ins[1].some(f => f[0] === 'eq' && f[1] === 'vista_preferida' && f[2] === 'bulto'))

    const R = construirProduccion(PLANTA)
    R.estado.unidadId = 'u-cn'
    R.estado.stockVer = null
    R.__tablas.insumos = [{ id: 'h', vista_preferida: 'bulto' }]
    await R.leerPresentacionesMasa()
    chk('sin stock:ver no consulta la vista', !R.__llamadas.consultas.some(c => c[0] === 'v_stock_por_lote'))
    chk('sin stock:ver: sin contenido (todo en kilos)', R.estado.presMasa.contenido.size === 0)

    const T = construirProduccion(PLANTA)
    T.estado.unidadId = 'u-cn'
    T.estado.stockVer = { todas: true }
    T.__tablas.insumos = () => ({ data: null, error: { message: 'x' } })
    await T.leerPresentacionesMasa()
    chk('si falla, todo vacío (kilos)', T.estado.presMasa.vista.size === 0 && T.estado.presMasa.contenido.size === 0)

    const U = construirProduccion(PLANTA)
    U.estado.unidadId = 'u-cn'
    U.estado.stockVer = { todas: true }
    U.__tablas.insumos = [{ id: 'h', vista_preferida: 'bulto' }]
    U.__tablas.v_stock_por_lote = () => ({ data: null, error: { message: 'x' } })
    await U.leerPresentacionesMasa()
    chk('si falla el contenido, también la preferencia queda vacía', U.estado.presMasa.vista.size === 0)
  }

  // ── 6. El empaque: lo que HAY ──────────────────────────────────────────
  {
    const f = { cantidad_total: 1500, unidad_medida: 'un', vista_preferida: 'bulto', presentaciones: 1, contenido_unico: 500, kilos_sueltos: 0 }
    const crudo = x => `${x}`
    chk('empaque en bultos con la cantidad', P.textoHayEmpaque({ stock: { filas: new Map([['c', f]]) } }, 'c', 1500, crudo) === '3 bultos (1.500 un)')
    chk('empaque con dos presentaciones: el número', P.textoHayEmpaque({ stock: { filas: new Map([['c', { ...f, presentaciones: 2 }]]) } }, 'c', 1500, crudo) === '1500')
    chk('empaque sin la fila: el número', P.textoHayEmpaque({ stock: { filas: new Map() } }, 'c', 18, crudo) === '18')
    chk('empaque sin filas (lectura vieja): el número', P.textoHayEmpaque({ stock: {} }, 'c', 18, crudo) === '18')
    chk('el stock del empaque trae la preferencia', /select\('insumo_id, cantidad_total, unidad_medida, vista_preferida, presentaciones, contenido_unico, kilos_sueltos'\)/.test(FUENTE_PLANTA))
  }

  // ── 7. UNA sola copia ───────────────────────────────────────────────────
  {
    const htmls = fs.readdirSync(path.join(RAIZ, 'modulos')).filter(n => n.endsWith('.html')).map(n => path.join(RAIZ, 'modulos', n))
    for (const ruta of [...htmls, path.join(RAIZ, 'dashboard.html')]) {
      const t = ruta === STOCK ? FUENTE_STOCK : ruta === PLANTA ? FUENTE_PLANTA : fs.readFileSync(ruta, 'utf8')
      const copia = /function (equivalenteEnBultos|cabezaBultos|textoBultos|formatearCantidadStock|cantidadSegunVista)\s*\(|const FRACCIONES\s*=/.exec(t)
      chk(`${path.basename(ruta)}: sin copia de la regla de bultos`, !copia, copia && copia[0])
    }
    chk('Stock la importa', /import \{[^}]*cantidadSegunVista[^}]*\} from '\.\.\/js\/cantidades\.js'/.test(FUENTE_STOCK))
    chk('la planta la importa', /import \{[^}]*cantidadSegunVista[^}]*textoSegunVista[^}]*\} from '\.\.\/js\/cantidades\.js'/.test(FUENTE_PLANTA))
    chk('la tarjeta de Stock usa la regla compartida', /const \{ destacado, secundario \} = cantidadSegunVista\(\{/.test(FUENTE_STOCK))
    chk('js/cantidades.js exporta la regla', /export function cantidadSegunVista\(/.test(FUENTE_JS) && /export function textoSegunVista\(/.test(FUENTE_JS))
  }
}

correr().then(() => fin(), e => { chk('la suite corre sin excepción', false, String(e && e.stack || e)); fin() })
