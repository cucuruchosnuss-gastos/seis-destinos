// PARA CUÁNTOS DÍAS HÁBILES ALCANZA (02/10/2026) — modulos/stock.html.
//
// Sale de v_stock_cobertura. Exige:
//  - debajo de cada insumo "Alcanza para ~N días hábiles": rojo hasta 3, amarillo
//    hasta 7, gris arriba (contra el número QUE SE MUESTRA, redondeado); sin
//    consumo, nada; con pocos días de historia, "(estimado con N días)";
//  - los umbrales en UNA constante;
//  - el mismo nombre con varias marcas: "Harina 000, todas las marcas: ~N días"
//    UNA vez, con la suma del stock dividida la suma del consumo diario;
//  - "N insumos alcanzan para 7 días hábiles o menos" arriba; tocarlo filtra la
//    lista a esos, y otra vez la vuelve a mostrar entera;
//  - la barra de fábricas de arriba manda (con "Todas", la tarjeta sumada usa la
//    suma de sus unidades); la fábrica de pruebas no se cuenta;
//  - si la vista no se puede leer, el stock se ve igual y sin cartelitos;
//  - todo texto escapado.
//
// EJECUTA los renders reales (juntados por clausura, como
// test-stock-barra-unidad.js) con un document y un supabase falsos.
//
//   node pruebas/test-stock-dias-habiles.js
// Archivo bajo prueba: ARCHIVO_TEST, o modulos/stock.html.

const path = require('path')
const { construirCon, scriptModulo } = require('./sandbox')
const { arnes, leer } = require('./circuito-comun')
const { extraerFn } = require('./extraer')
const { fuenteNumeros } = require('./numeros-comun')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/stock.html')
const FUENTE = leer(ARCHIVO)
const { chk, fin } = arnes()

const STUBS = new Set([
  'formatearFecha', 'mostrarError', 'mostrarExito', 'abrirConHistorial', 'asegurarCatalogo',
  'guardarConteoAhora', 'cargarRecuento', 'cargarLotesMov', 'prepararCantidadMov',
  'poblarSelectorMotivoTipo', 'actualizarContadorRec', 'renderizarClaseRecuento', 'mostrarVista',
  'verificarSesion', 'mostrarBannerVersion', 'renderizarItemsTransf', 'limpiarErroresTransf',
  'limpiarErroresMov', 'quitarInsumoMov', 'elegirInsumoMov', 'puedeDarBaja',
])
// pasaFiltroUnidad y sinUnidadesDePrueba son las REALES de js/ (extraerFn las
// encuentra por el import del módulo).
const RENDERS = ['esc', 'pasaFiltroUnidad', 'sinUnidadesDePrueba', 'alCambiarBarra', 'cargarStock', 'renderizarStock',
  'numeroCobertura', 'mapaCobertura', 'coberturaDe', 'nivelCobertura', 'textoCobertura', 'textoEstimado', 'htmlCobertura']

function clausura(src) {
  const nombresFn = new Set([...src.matchAll(/(?:^|\n)\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g)].map(m => m[1]))
  const posConst = new Map([...src.matchAll(/\n {4}const ([A-Za-z_$][\w$]*)\s*=/g)].map(m => [m[1], m.index + 1]))
  const fns = new Set(), consts = []
  const cola = [...RENDERS]
  const mirar = (texto) => {
    for (const m of texto.matchAll(/[A-Za-z_$][\w$]*/g)) {
      const id = m[0]
      if (nombresFn.has(id) && !fns.has(id) && !STUBS.has(id)) cola.push(id)
      if (posConst.has(id) && !consts.includes(id)) {
        consts.push(id)
        const resto = src.slice(posConst.get(id))
        const finC = resto.slice(1).search(/\n {4}(?:const|let|function|async function|\/\/)/)
        mirar(resto.slice(0, finC === -1 ? 400 : finC + 1))
      }
    }
  }
  while (cola.length) {
    const n = cola.shift()
    if (fns.has(n) || STUBS.has(n)) continue
    let texto
    try { texto = extraerFn(src, n) } catch (e) { chk(`existe la función ${n}`, false, e.message); continue }
    fns.add(n)
    mirar(texto)
  }
  consts.sort((a, b) => posConst.get(a) - posConst.get(b))
  return { funciones: [...fns], constantes: consts }
}

const PRELUDIO = `
  ${fuenteNumeros()}
  function nuevoEl(id) {
    const attrs = {}
    return {
      id, innerHTML: '', textContent: '', value: '', className: '', hidden: false, checked: false, disabled: false,
      dataset: {}, style: {}, querySelector: () => null, querySelectorAll: () => [], addEventListener(){}, focus(){},
      removeAttribute(){}, setAttribute(k, v){ attrs[k] = v }, getAttribute(k){ return attrs[k] ?? null },
      closest: () => nuevoEl('closest'), setSelectionRange(){},
      classList: { add(){}, remove(){}, toggle(){}, contains: () => false },
    }
  }
  var __els = new Map()
  var document = {
    activeElement: null,
    getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) },
    querySelectorAll: () => [], querySelector: () => null, addEventListener(){},
  }
  var window = { scrollTo(){}, addEventListener(){}, removeEventListener(){} }
  var history = { pushState(){}, back(){} }
  var console = { log(){}, warn(){}, error(){} }
  var __datos = {}
  var __errores = {}
  function __consulta(tabla) {
    const q = {}
    for (const k of ['select', 'eq', 'neq', 'in', 'is', 'order', 'gte', 'lte', 'limit', 'range', 'not', 'or']) q[k] = () => q
    q.maybeSingle = () => q
    q.then = (res, rej) => Promise.resolve(__errores[tabla]
      ? { data: null, error: __errores[tabla] }
      : { data: (__datos[tabla] ?? []).map(f => ({ ...f })), error: null }).then(res, rej)
    return q
  }
  var supabase = { from: (t) => __consulta(t), rpc: async () => ({ data: null, error: null }) }
  function mostrarError() {}
  function mostrarExito() {}
  function formatearFecha(f) { return f }
  function abrirConHistorial() {}
  async function asegurarCatalogo() {}
  async function guardarConteoAhora() {}
  async function cargarRecuento() {}
  function cargarLotesMov() {}
  function prepararCantidadMov() {}
  function poblarSelectorMotivoTipo() {}
  function actualizarContadorRec() {}
  function renderizarClaseRecuento() {}
  function mostrarVista() {}
  function renderizarItemsTransf() {}
  function limpiarErroresTransf() {}
  function limpiarErroresMov() {}
  function quitarInsumoMov() {}
  async function elegirInsumoMov() {}
  function puedeDarBaja() { return false }
`
const RETORNO = 'estado, __el(id){ return document.getElementById(id) }, __setDatos(t, d){ __datos[t] = d }, __setError(t, e){ __errores[t] = e }'

const NUSS = 'u-nuss', DOLCE = 'u-dolce', ROBOT = 'u-robot'
const BARRA = [{ id: NUSS, nombre: 'Cucuruchos Nuss', prefijo: 'N' }, { id: DOLCE, nombre: 'Dolce Pasta', prefijo: 'D' }]

function fila(unidad, insumo, nombre, cantidad, extra = {}) {
  return {
    unidad_negocio_id: unidad, insumo_id: insumo, insumo_nombre: nombre, marca: null, unidad_medida: 'kg',
    tipo: 'materia_prima', categoria: 'Harinas', aclaracion: null, cantidad_total: cantidad,
    lotes_distintos: 1, presentaciones: 0, contenido_unico: null, kilos_sueltos: 0, vista_preferida: 'base', ...extra,
  }
}
// Como devuelve la base: los numeric vienen como TEXTO.
function cob(unidad, insumo, nombre, marca, stock, consumo, dias, { base = 12, estimado = false } = {}) {
  return {
    unidad_negocio_id: unidad, insumo_id: insumo, insumo_nombre: nombre, marca, stock: String(stock),
    dias_base: base, consumo_diario: consumo === null ? null : String(consumo),
    dias_cobertura: dias === null ? null : String(dias), estimado_con_pocos_dias: estimado,
  }
}

// Lo de la base del 02/10/2026 (Nuss), más Dolce y la fábrica de pruebas.
const STOCK = [
  fila(NUSS, 'h-wali', 'Harina 000', 5000, { marca: 'Wali' }),
  fila(NUSS, 'h-jup', 'Harina 000', 5675, { marca: 'Júpiter' }),
  fila(NUSS, 'bolsa', 'Bolsa 100x80', 1491, { tipo: 'insumo', categoria: 'Bolsas', unidad_medida: 'un' }),
  fila(NUSS, 'lecitina', 'Lecitina de soja', 30, { categoria: 'Aditivos' }),
  fila(NUSS, 'sal', 'Sal', 100, { categoria: 'Azúcares y secos' }),
  fila(DOLCE, 'h-wali', 'Harina 000', 1000, { marca: 'Wali' }),
  fila(DOLCE, 'colorante', 'Colorante', 2, { categoria: 'Aditivos' }),
]
const COBERTURA = [
  cob(NUSS, 'h-wali', 'Harina 000', 'Wali', 5000, 550, 9.1, { base: 1, estimado: true }),
  cob(NUSS, 'h-jup', 'Harina 000', 'Júpiter', 5675, 250, 22.7, { base: 1, estimado: true }),
  cob(NUSS, 'bolsa', 'Bolsa 100x80', null, 1491, 209, 7.1),
  cob(NUSS, 'lecitina', 'Lecitina de soja', null, 30, 12.8, 2.3),
  cob(NUSS, 'sal', 'Sal', null, 100, null, null),           // sin consumo: nada
  cob(DOLCE, 'h-wali', 'Harina 000', 'Wali', 1000, 50, 20),
  cob(DOLCE, 'colorante', 'Colorante', null, 2, 1, 2),
  cob(ROBOT, 'h-wali', 'Harina 000', 'Wali', 1, 999, 0.001), // la fábrica de pruebas
]

const SRC = scriptModulo(ARCHIVO)
let MOLDE = null
try { MOLDE = clausura(SRC) } catch (e) { chk('la clausura de funciones se arma', false, String(e && e.stack || e)) }

function nuevo() {
  const S = construirCon(ARCHIVO, { preludio: PRELUDIO, funciones: MOLDE.funciones, constantes: MOLDE.constantes, retorno: RETORNO })
  const E = S.estado
  E.miRolApp = 'usuario'
  E.misTareas = new Set(['stock:ver'])
  E.fabrica = { ok: true, unidades: new Set([ROBOT]), personas: new Set(), soyDePrueba: false }
  S.__setDatos('v_mis_unidades_stock', BARRA.map(({ id, nombre }) => ({ id, nombre })))
  S.__setDatos('v_stock_insumos', STOCK)
  S.__setDatos('v_stock_cobertura', COBERTURA)
  return S
}
const barra = (elegida) => ({ elegida, unidades: BARRA, mostrar: true })
const lista = S => S.__el('lista-stock').innerHTML
const aviso = S => S.__el('stock-cobertura-aviso')
const tarjetas = h => (h.match(/class="tarjeta-lista fila-stock/g) || []).length

async function correr() {
  if (!MOLDE) return

  // ── 1. Las reglas, sin pantalla ───────────────────────────────────────────
  {
    const S = nuevo()
    const c = (dias, extra = {}) => ({ dias, estimado: false, diasBase: 12, ...extra })
    const nivel = S.nivelCobertura, texto = S.textoCobertura
    chk('3 días: rojo', nivel(c(3)) === 'rojo')
    chk('3,4 se muestra ~3: rojo', nivel(c(3.4)) === 'rojo' && texto(c(3.4)) === 'Alcanza para ~3 días hábiles')
    chk('3,5 se muestra ~4: amarillo', nivel(c(3.5)) === 'amarillo' && texto(c(3.5)) === 'Alcanza para ~4 días hábiles')
    chk('7 días: amarillo', nivel(c(7)) === 'amarillo')
    chk('7,1 se muestra ~7: amarillo (el color no contradice al número)', nivel(c(7.1)) === 'amarillo')
    chk('7,5 se muestra ~8: gris', nivel(c(7.5)) === 'gris' && texto(c(7.5)) === 'Alcanza para ~8 días hábiles')
    chk('un día: singular', texto(c(1)) === 'Alcanza para ~1 día hábil')
    chk('menos de medio día: no alcanza, en rojo', texto(c(0.2)) === 'No alcanza ni para un día hábil' && nivel(c(0.2)) === 'rojo')
    chk('saldo negativo: no alcanza, en rojo', texto(c(-4)) === 'No alcanza ni para un día hábil' && nivel(c(-4)) === 'rojo')
    chk('miles con punto', texto(c(1234)) === 'Alcanza para ~1.234 días hábiles', texto(c(1234)))
    chk('sin dato no dice nada', texto(null) === '' && S.htmlCobertura(null) === '' && nivel(null) === null)
    chk('estimado con 1 día', S.textoEstimado(c(9, { estimado: true, diasBase: 1 })) === '(estimado con 1 día)')
    chk('estimado con 4 días', S.textoEstimado(c(9, { estimado: true, diasBase: 4 })) === '(estimado con 4 días)')
    chk('no estimado no aclara', S.textoEstimado(c(9)) === '')
    chk('los umbrales en UNA constante', /const UMBRALES_COBERTURA = \{ rojo: 3, amarillo: 7 \}/.test(FUENTE))
    chk('el aviso dice el umbral de la constante, no un 7 escrito aparte',
      /\$\{n\} insumos alcanzan para \$\{dias\} días hábiles o menos/.test(FUENTE) && /const dias = UMBRALES_COBERTURA\.amarillo/.test(FUENTE))

    chk('numeroCobertura: null no es 0', S.numeroCobertura(null) === null && S.numeroCobertura('') === null && S.numeroCobertura(undefined) === null)
    chk('numeroCobertura: el texto de la base', S.numeroCobertura('7.1') === 7.1 && S.numeroCobertura('abc') === null)

    const una = [cob(NUSS, 'x', 'X', null, 100, 10, 9.9)]
    chk('una fila: manda lo que calculó la base', S.coberturaDe(una).dias === 9.9)
    chk('una fila sin consumo: nada', S.coberturaDe([cob(NUSS, 'x', 'X', null, 100, null, null)]) === null)
    chk('una fila con consumo 0: nada', S.coberturaDe([cob(NUSS, 'x', 'X', null, 100, 0, null)]) === null)
    const dos = [cob(NUSS, 'a', 'H', 'A', 5000, 550, 9.1, { base: 1, estimado: true }), cob(NUSS, 'b', 'H', 'B', 5675, 250, 22.7, { base: 3 })]
    const r = S.coberturaDe(dos)
    chk('varias: suma del stock dividida la suma del consumo', Math.abs(r.dias - 10675 / 800) < 1e-9, r)
    chk('varias: estimado si alguna lo es', r.estimado === true)
    chk('varias: la base más corta', r.diasBase === 1)
    const conSinConsumo = [cob(NUSS, 'a', 'H', 'A', 100, 10, 10), cob(NUSS, 'b', 'H', 'B', 100, null, null)]
    chk('varias: el stock de la que no consume también cuenta', S.coberturaDe(conSinConsumo).dias === 20)
  }

  // ── 2. Nuss elegida ─────────────────────────────────────────────────────
  {
    const S = nuevo()
    await S.cargarStock()
    await S.alCambiarBarra(barra(NUSS))
    const h = lista(S)
    chk('Wali: ~9 días (estimado con 1 día), gris', /cobertura cobertura--gris">Alcanza para ~9 días hábiles <span class="cobertura__estimado">\(estimado con 1 día\)/.test(h), h)
    chk('Júpiter: ~23 días', /Alcanza para ~23 días hábiles/.test(h))
    chk('Bolsa: ~7 días, amarillo', /cobertura--amarillo">Alcanza para ~7 días hábiles/.test(h))
    chk('Lecitina: ~2 días, rojo', /cobertura--rojo">Alcanza para ~2 días hábiles/.test(h))
    chk('Sal sin consumo: sin cartelito', !/Sal[\s\S]{0,600}?class="cobertura /.test(h.slice(h.indexOf('>Sal<'), h.indexOf('>Sal<') + 900)) && (h.match(/class="cobertura cobertura--/g) || []).length === 5, (h.match(/class="cobertura cobertura--/g) || []).length)
    chk('Harina 000 todas las marcas: ~13 días', /Harina 000, todas las marcas:<span class="cobertura cobertura--gris">~13 días hábiles/.test(h), h)
    chk('la línea de todas las marcas sale UNA vez', (h.match(/todas las marcas/g) || []).length === 1)
    chk('y arriba de la primera harina', h.indexOf('todas las marcas') < h.indexOf('data-stock="h-wali"') && h.indexOf('todas las marcas') < h.indexOf('data-stock="h-jup"'))
    chk('Dolce no se ve con Nuss elegida', !/data-unidad="u-dolce"/.test(h))
    // El aviso: Bolsa (7) y Lecitina (2).
    chk('el aviso cuenta 2', /2 insumos alcanzan para 7 días hábiles o menos/.test(aviso(S).innerHTML), aviso(S).innerHTML)
    chk('el aviso se ve', aviso(S).hidden === false)
    chk('el aviso ofrece ver cuáles', /Ver cuáles/.test(aviso(S).innerHTML))

    // Tocarlo filtra.
    S.estado.filtroCobertura = true
    S.renderizarStock()
    const f = lista(S)
    chk('filtrado: solo la bolsa y la lecitina', tarjetas(f) === 2 && /data-stock="bolsa"/.test(f) && /data-stock="lecitina"/.test(f), tarjetas(f))
    chk('filtrado: el total de las harinas no aparece (no hay harinas en la lista)', !/todas las marcas/.test(f))
    chk('filtrado: el aviso ofrece ver todos', /Ver todos/.test(aviso(S).innerHTML))
    chk('filtrado: aria-pressed', aviso(S).getAttribute('aria-pressed') === 'true')
    S.estado.filtroCobertura = false
    S.renderizarStock()
    chk('sin filtro: todas otra vez', tarjetas(lista(S)) === 5)
  }

  // ── 3. Dolce elegida: otra cuenta ───────────────────────────────────────
  {
    const S = nuevo()
    await S.cargarStock()
    await S.alCambiarBarra(barra(DOLCE))
    const h = lista(S)
    chk('Dolce: el colorante ~2 días', /Alcanza para ~2 días hábiles/.test(h))
    chk('Dolce: la Wali de Dolce ~20 días', /Alcanza para ~20 días hábiles/.test(h))
    chk('Dolce: sin línea de todas las marcas (una sola harina)', !/todas las marcas/.test(h))
    chk('Dolce: el aviso cuenta 1, en singular', /^<span>1 insumo alcanza para 7 días hábiles o menos/.test(aviso(S).innerHTML), aviso(S).innerHTML)
  }

  // ── 4. "Todas": la tarjeta sumada usa la suma de sus unidades ───────────
  {
    const S = nuevo()
    await S.cargarStock()
    await S.alCambiarBarra(barra(null))
    const h = lista(S)
    // Wali: (5000 + 1000) / (550 + 50) = 10 días.
    const iW = h.indexOf('fila-stock--grupo')
    chk('Todas: la Wali es una tarjeta sumada', iW !== -1)
    chk('Todas: la Wali sumada alcanza ~10 días', /fila-stock--grupo[\s\S]*?Alcanza para ~10 días hábiles/.test(h), h)
    // Harina todas las marcas: (6000 + 5675) / (600 + 250) = 13,7 → ~14.
    chk('Todas: todas las marcas suma las dos fábricas', /todas las marcas:<span class="cobertura cobertura--gris">~14 días hábiles/.test(h), h)
    chk('Todas: la fábrica de pruebas no se cuenta (no hay un "No alcanza")', !/No alcanza/.test(h))
    chk('Todas: el aviso cuenta 3 (bolsa, lecitina, colorante)', /3 insumos alcanzan/.test(aviso(S).innerHTML), aviso(S).innerHTML)
  }

  // ── 5. Sin nada para avisar, el aviso no se ve; con el filtro y nada, lo dice
  {
    const S = nuevo()
    S.__setDatos('v_stock_cobertura', COBERTURA.filter(c => c.insumo_id !== 'bolsa' && c.insumo_id !== 'lecitina'))
    await S.cargarStock()
    await S.alCambiarBarra(barra(NUSS))
    chk('nada para avisar: el aviso no se ve', aviso(S).hidden === true && aviso(S).innerHTML === '')
    S.estado.filtroCobertura = true
    S.renderizarStock()
    chk('con el filtro puesto y nada: el aviso sigue para poder sacarlo', aviso(S).hidden === false && /Ver todos/.test(aviso(S).innerHTML))
    chk('con el filtro puesto y nada: lo dice', S.__el('stock-vacio').hidden === false && /Ningún insumo alcanza para 7 días hábiles o menos/.test(S.__el('stock-vacio').textContent), S.__el('stock-vacio').textContent)
  }

  // ── 5b. El total de todas las marcas no cambia al filtrar ───────────────
  {
    const S = nuevo()
    S.__setDatos('v_stock_cobertura', COBERTURA.map(c => c.unidad_negocio_id === NUSS && c.insumo_id === 'h-wali'
      ? cob(NUSS, 'h-wali', 'Harina 000', 'Wali', 5000, 2500, 2) : c))
    await S.cargarStock()
    await S.alCambiarBarra(barra(NUSS))
    S.estado.filtroCobertura = true
    S.renderizarStock()
    const h = lista(S)
    chk('filtrado: la Wali (2 días) está y la Júpiter no', /data-stock="h-wali"/.test(h) && !/data-stock="h-jup"/.test(h))
    chk('filtrado: igual se dice el total de todas las marcas', /Harina 000, todas las marcas:/.test(h), h)
    // (5000 + 5675) / (2500 + 250) = 3,9 → ~4.
    chk('filtrado: el total suma las dos marcas', /todas las marcas:<span class="cobertura cobertura--amarillo">~4 días hábiles/.test(h), h)
  }

  // ── 5c. Una unidad sin permiso: ni lista ni aviso ───────────────────────
  {
    const S = nuevo()
    await S.cargarStock()
    await S.alCambiarBarra(barra(NUSS))
    chk('antes: el aviso se ve', aviso(S).hidden === false)
    await S.alCambiarBarra({ elegida: 'u-mengui', unidades: [...BARRA, { id: 'u-mengui', nombre: 'Mengui', prefijo: 'O' }], mostrar: true })
    chk('sin permiso en esa unidad: el aviso se va', aviso(S).hidden === true)
  }

  // ── 5d. La fábrica de pruebas no entra al mapa ─────────────────────────
  {
    const S = nuevo()
    const m = S.mapaCobertura({ data: COBERTURA, error: null })
    chk('el mapa no tiene la fábrica de pruebas', !m.has(`${ROBOT}|h-wali`) && m.has(`${NUSS}|h-wali`))
    chk('con error, mapa vacío', S.mapaCobertura({ data: null, error: { message: 'x' } }).size === 0)
    chk('sin respuesta, mapa vacío', S.mapaCobertura(null).size === 0)
  }

  // ── 6. Si la vista falla, el stock se ve igual ───────────────────────────
  {
    const S = nuevo()
    S.__setError('v_stock_cobertura', { message: 'permiso' })
    await S.cargarStock()
    await S.alCambiarBarra(barra(NUSS))
    const h = lista(S)
    chk('sin cobertura: el stock se ve', tarjetas(h) === 5)
    chk('sin cobertura: ningún cartelito', !/class="cobertura/.test(h))
    chk('sin cobertura: el aviso no se ve', aviso(S).hidden === true)
  }

  // ── 7. Escapado ─────────────────────────────────────────────────────────
  {
    const S = nuevo()
    const malo = '"><img src=x onerror=alert(1)>'
    S.__setDatos('v_stock_insumos', [fila(NUSS, 'a', malo, 10, { marca: 'A' }), fila(NUSS, 'b', malo, 10, { marca: 'B' })])
    S.__setDatos('v_stock_cobertura', [cob(NUSS, 'a', malo, 'A', 10, 1, 10), cob(NUSS, 'b', malo, 'B', 10, 1, 10)])
    await S.cargarStock()
    await S.alCambiarBarra(barra(NUSS))
    const h = lista(S)
    chk('el nombre de la línea de todas las marcas va escapado', /&quot;&gt;&lt;img src=x onerror=alert\(1\)&gt;, todas las marcas/.test(h), h)
    chk('ningún <img crudo', !/<img src=x/.test(h))
  }

  // ── 8. El cableado ──────────────────────────────────────────────────────
  chk('la vista se lee junto con el stock', /supabase\.from\('v_stock_cobertura'\)/.test(SRC))
  chk('tocar el aviso alterna el filtro', /'stock-cobertura-aviso'\)\.addEventListener\('click', \(\) => \{\n\s*estado\.filtroCobertura = !estado\.filtroCobertura\n\s*renderizarStock\(\)/.test(SRC))
  chk('el aviso está en el HTML y arranca escondido', /<button type="button" class="stock-cobertura-aviso" id="stock-cobertura-aviso" hidden><\/button>/.test(FUENTE))
}

correr().then(() => fin(), e => { chk('la suite corre sin excepción', false, String(e && e.stack || e)); fin() })
