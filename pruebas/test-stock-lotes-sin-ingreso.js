// LOTES USADOS SIN INGRESO CARGADO (23/10/2026) — modulos/stock.html.
//
// Pedido de Facu: en Stock (la pantalla de administración, no la tablet) un
// aviso con los lotes que la sala de masa usó sin ingreso cargado
// (masa_items.lote_fuera_de_stock) en los últimos 30 días, agrupados por
// insumo y lote, con los kg y la fecha de la última masa.
// Exige:
//  - la consulta: masa_items con lote_fuera_de_stock = true, masas no
//    anuladas y de los últimos 30 días (masas!inner), paginada;
//  - agrupado por fábrica, insumo y lote: kg sumados, cuántas masas y la
//    fecha de la ÚLTIMA (en hora argentina);
//  - un lote que ya tiene un movimiento positivo en el libro no se lista;
//  - la barra de unidad manda; la fábrica de pruebas no aparece;
//  - LA RLS: masa_items se lee solo con un permiso de Producción en la
//    fábrica (pg_policies, 23/10/2026). Sin él NO se consulta y se DICE;
//  - un error de la base se dice tal cual y el stock se ve igual;
//  - todo escapado.
//
// EJECUTA los renders reales (juntados por clausura, como
// test-stock-dias-habiles.js) con un document y un supabase falsos.
//
//   node pruebas/test-stock-lotes-sin-ingreso.js

const path = require('path')
const { construirCon, scriptModulo } = require('./sandbox')
const { FUNCIONES_CANTIDADES, CONSTANTES_CANTIDADES } = require('./cantidades-comun')
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
  'limpiarErroresMov', 'quitarInsumoMov', 'elegirInsumoMov', 'puedeDarBaja', 'cargarValorizado',
])
const RENDERS = ['esc', 'pasaFiltroUnidad', 'sinUnidadesDePrueba', 'alCambiarBarra', 'cargarStock', 'renderizarStock',
  'cargarLotesSinIngreso', 'pintarLotesSinIngreso', 'alternarLotesSinIngreso', 'puedeVerMasasEn', 'agruparSinIngreso',
  'fechaArSinIngreso', ...FUNCIONES_CANTIDADES]

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

// El doble de supabase ANOTA cada consulta con sus métodos (para afirmar los
// filtros que viajan) y respeta .range() (para la paginación).
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
  var __consultas = []
  function __consulta(tabla) {
    const ops = []
    __consultas.push({ tabla, ops })
    const q = {}
    for (const k of ['select', 'eq', 'neq', 'in', 'is', 'order', 'gte', 'gt', 'lte', 'lt', 'limit', 'range', 'not', 'or']) q[k] = (...a) => { ops.push([k, ...a]); return q }
    q.maybeSingle = () => q
    q.then = (res, rej) => {
      if (__errores[tabla]) return Promise.resolve({ data: null, error: __errores[tabla] }).then(res, rej)
      let data = (__datos[tabla] ?? []).map(f => JSON.parse(JSON.stringify(f)))
      const r = ops.find(o => o[0] === 'range')
      if (r) data = data.slice(r[1], r[2] + 1)
      return Promise.resolve({ data, error: null }).then(res, rej)
    }
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
  async function cargarValorizado() {}
`
const RETORNO = 'estado, __el(id){ return document.getElementById(id) }, __setDatos(t, d){ __datos[t] = d }, __setError(t, e){ __errores[t] = e }, __consultas'

const NUSS = 'u-nuss', DOLCE = 'u-dolce', ROBOT = 'u-robot'
const BARRA = [{ id: NUSS, nombre: 'Cucuruchos Nuss', prefijo: 'N' }, { id: DOLCE, nombre: 'Dolce Pasta', prefijo: 'D' }]
const STOCK = [
  { unidad_negocio_id: NUSS, insumo_id: 'col', insumo_nombre: 'Colorante', marca: null, unidad_medida: 'kg', tipo: 'insumo', categoria: 'Aditivos',
    aclaracion: null, cantidad_total: -1.3, lotes_distintos: 1, presentaciones: 0, contenido_unico: null, kilos_sueltos: 0, vista_preferida: 'base' },
]

// Como la devuelve PostgREST: masa_items con masas!inner(turnos_produccion!inner).
function usado(unidad, insumo, nombre, marca, lote, kg, masa, hora, extra = {}) {
  return {
    masa_id: masa, insumo_id: insumo, lote, cantidad_kg: String(kg), insumos: { nombre, marca },
    masas: { hora, anulada: false, turnos_produccion: { unidad_negocio_id: unidad } }, ...extra,
  }
}
const USADOS = [
  // Colorante 35349771 en Nuss: tres masas (una con dos renglones del mismo lote).
  usado(NUSS, 'col', 'Colorante', 'Fleibor', '35349771', 0.05, 'm1', '2026-10-19T09:45:09Z'),
  usado(NUSS, 'col', 'Colorante', 'Fleibor', '35349771', 0.05, 'm2', '2026-10-21T01:03:01Z'), // 20/10 a la noche en Argentina
  usado(NUSS, 'col', 'Colorante', 'Fleibor', '35349771', 0.025, 'm2', '2026-10-21T01:03:01Z'),
  // Harina 01/10/26 en Nuss: una masa, doble.
  usado(NUSS, 'har', 'Harina 000', null, '01/10/26', 50, 'm3', '2026-10-15T22:30:46Z'),
  // Un lote que YA tiene ingreso (se terminó, no es papeleo): no va.
  usado(NUSS, 'azu', 'Azúcar', 'Ledesma', 'AZ-9', 2.5, 'm4', '2026-10-18T10:00:00Z'),
  // Dolce Pasta. La harina con el MISMO lote que la de Nuss es otro renglón.
  usado(DOLCE, 'col', 'Colorante', 'Fleibor', 'D-77', 0.04, 'm5', '2026-10-20T12:00:00Z'),
  usado(DOLCE, 'har', 'Harina 000', null, '01/10/26', 10, 'm7', '2026-10-16T10:00:00Z'),
  // La fábrica de pruebas: nunca.
  usado(ROBOT, 'col', 'Colorante', 'Fleibor', 'ROBOT-1', 9, 'm6', '2026-10-20T12:00:00Z'),
]
const INGRESOS = [{ unidad_negocio_id: NUSS, insumo_id: 'azu', lote: 'AZ-9' }, { unidad_negocio_id: DOLCE, insumo_id: 'col', lote: '35349771' }]

const SRC = scriptModulo(ARCHIVO)
let MOLDE = null
try { MOLDE = clausura(SRC) } catch (e) { chk('la clausura de funciones se arma', false, String(e && e.stack || e)) }

function nuevo({ tareas = ['stock:ver', 'produccion:ver'], alcances = {}, rol = 'usuario', usados = USADOS, ingresos = INGRESOS } = {}) {
  const S = construirCon(ARCHIVO, { preludio: PRELUDIO, funciones: MOLDE.funciones, constantes: [...CONSTANTES_CANTIDADES, ...MOLDE.constantes], retorno: RETORNO })
  const E = S.estado
  E.miRolApp = rol
  E.misTareas = new Set(tareas)
  E.alcancesTareas = new Map(tareas.map(t => [t, t in alcances ? alcances[t] : { todas: true }]))
  E.fabrica = { ok: true, unidades: new Set([ROBOT]), personas: new Set(), soyDePrueba: false }
  S.__setDatos('v_mis_unidades_stock', [...BARRA, { id: ROBOT, nombre: 'Robot' }].map(({ id, nombre }) => ({ id, nombre })))
  S.__setDatos('v_stock_insumos', STOCK)
  S.__setDatos('v_stock_cobertura', [])
  S.__setDatos('masa_items', usados)
  S.__setDatos('stock_movimientos', ingresos)
  return S
}
const barra = (elegida) => ({ elegida, unidades: BARRA, mostrar: true })
const caja = (S) => S.__el('stock-sin-ingreso')
const consultas = (S, t) => S.__consultas.filter(c => c.tabla === t)
const op = (c, k, campo) => c.ops.find(o => o[0] === k && (campo === undefined || o[1] === campo))

async function correr() {
  if (!MOLDE) return

  // ── 1. El permiso: la MISMA regla que _ve_produccion_en() ───────────────
  {
    const S = nuevo({ tareas: ['stock:ver'] })
    chk('solo stock:ver: no puede leer las masas', S.puedeVerMasasEn(NUSS) === false)
    const V = nuevo({ tareas: ['stock:ver', 'produccion:ver'] })
    chk('produccion:ver con alcance a todas: sí', V.puedeVerMasasEn(NUSS) && V.puedeVerMasasEn(DOLCE))
    const C = nuevo({ tareas: ['stock:ver', 'produccion:cargar'], alcances: { 'produccion:cargar': { unidades: [NUSS] } } })
    chk('produccion:cargar solo en Nuss: Nuss sí, Dolce no', C.puedeVerMasasEn(NUSS) && !C.puedeVerMasasEn(DOLCE))
    const K = nuevo({ tareas: ['stock:ver', 'produccion:configurar'], alcances: { 'produccion:configurar': { unidades: [DOLCE] } } })
    chk('produccion:configurar en Dolce: Dolce sí', K.puedeVerMasasEn(DOLCE) && !K.puedeVerMasasEn(NUSS))
    const A = nuevo({ tareas: ['stock:ver'], rol: 'super_admin' })
    chk('super_admin: sí (como en la base)', A.puedeVerMasasEn(NUSS))
    const N = nuevo({ tareas: ['stock:ver', 'produccion:ver'], alcances: { 'produccion:ver': null } })
    chk('una tarea con alcance null no da ninguna fábrica', N.puedeVerMasasEn(NUSS) === false)
  }

  // ── 2. Sin permiso de Producción: no se consulta y se DICE ─────────────
  {
    const S = nuevo({ tareas: ['stock:ver'] })
    await S.cargarStock()
    await S.alCambiarBarra(barra(null))
    chk('sin permiso de Producción no se consulta masa_items', consultas(S, 'masa_items').length === 0)
    const h = caja(S).innerHTML
    chk('… y se dice, con las fábricas', caja(S).hidden === false && /No se pueden ver los lotes usados sin ingreso cargado de Cucuruchos Nuss, Dolce Pasta: la base deja leer las masas solo con un permiso de Producción/.test(h), h)
    chk('… la fábrica de pruebas no se nombra', !/Robot/.test(h))
    chk('… y el stock se ve igual', /Colorante/.test(S.__el('lista-stock').innerHTML))
    await S.alCambiarBarra(barra(NUSS))
    chk('con Nuss elegida, nombra solo Nuss', /sin ingreso cargado de Cucuruchos Nuss:/.test(caja(S).innerHTML) && !/Dolce/.test(caja(S).innerHTML), caja(S).innerHTML)
  }

  // ── 3. Con permiso: la consulta y lo agrupado ───────────────────────────
  {
    const antes = Date.now()
    const S = nuevo()
    await S.cargarStock()
    await S.alCambiarBarra(barra(null))
    const c = consultas(S, 'masa_items')[0]
    chk('se lee masa_items', !!c)
    chk('… con el insumo y la masa con su turno (masas!inner)', /masas!inner\(hora, anulada, turnos_produccion!inner\(unidad_negocio_id\)\)/.test(op(c, 'select')?.[1] ?? '') &&
      /insumos\(nombre, marca\)/.test(op(c, 'select')?.[1] ?? '') && /cantidad_kg/.test(op(c, 'select')?.[1] ?? ''), op(c, 'select'))
    chk('… solo los lotes fuera de stock', op(c, 'eq', 'lote_fuera_de_stock')?.[2] === true)
    chk('… sin las masas anuladas', op(c, 'eq', 'masas.anulada')?.[2] === false)
    const desde = new Date(op(c, 'gte', 'masas.hora')?.[2] ?? '').getTime()
    chk('… de los últimos 30 días', Math.abs(antes - desde - 30 * 24 * 3600 * 1000) < 60 * 1000, op(c, 'gte', 'masas.hora'))
    chk('… paginada', op(c, 'range')?.[1] === 0 && op(c, 'range')?.[2] === 999 && !!op(c, 'order'))
    const ci = consultas(S, 'stock_movimientos')[0]
    chk('se pregunta qué lotes ya tienen ingreso (movimientos positivos)', !!ci && op(ci, 'gt', 'cantidad')?.[2] === 0 &&
      JSON.stringify(op(ci, 'in', 'insumo_id')?.[2]?.slice().sort()) === JSON.stringify(['azu', 'col', 'har']) &&
      op(ci, 'in', 'lote')?.[2]?.includes('35349771'), ci && JSON.stringify(ci.ops))
    chk('… sin preguntar por los de la fábrica de pruebas', !op(ci, 'in', 'lote')?.[2]?.includes('ROBOT-1'))

    const g = S.estado.sinIngreso.grupos
    const col = g.find(x => x.unidad_negocio_id === NUSS && x.lote === '35349771')
    chk('agrupa por fábrica, insumo y lote: kg sumados', col?.kg === 0.125, JSON.stringify(col))
    chk('… cuenta las masas (no los renglones)', col?.masas === 2)
    chk('… y guarda la última masa', col?.ultima === '2026-10-21T01:03:01Z')
    chk('el lote que ya tiene ingreso no se lista', !g.some(x => x.lote === 'AZ-9'))
    chk('… el ingreso de OTRA fábrica no cuenta (Dolce no tiene 35349771 de Nuss)', g.some(x => x.unidad_negocio_id === NUSS && x.lote === '35349771'))
    chk('la fábrica de pruebas no aparece', !g.some(x => x.unidad_negocio_id === ROBOT))
    chk('la más reciente primero', g.map(x => x.lote).join(',') === '35349771,D-77,01/10/26,01/10/26' &&
      g[2].unidad_negocio_id === DOLCE && g[3].unidad_negocio_id === NUSS, g.map(x => x.lote).join(','))
    chk('el mismo lote en dos fábricas son dos renglones', g.find(x => x.lote === '01/10/26' && x.unidad_negocio_id === NUSS)?.kg === 50 &&
      g.find(x => x.lote === '01/10/26' && x.unidad_negocio_id === DOLCE)?.kg === 10)

    // La pantalla, cerrada.
    const h = caja(S).innerHTML
    chk('el aviso se ve, con cuántos lotes', caja(S).hidden === false && /<span>4 lotes usados sin ingreso cargado<\/span>/.test(h), h)
    chk('… cerrado: "Ver cuáles" y la lista escondida', /aria-expanded="false"/.test(h) && /Ver cuáles/.test(h) && /class="stock-sin-ingreso__cuerpo" hidden>/.test(h), h)
    S.alternarLotesSinIngreso()
    const a = caja(S).innerHTML
    chk('al tocarlo se abre', /aria-expanded="true"/.test(a) && /Ocultar/.test(a) && /class="stock-sin-ingreso__cuerpo">/.test(a), a)
    chk('… dice para qué es', /en los últimos 30 días y no tienen ingreso cargado\. Cargá el ingreso en Insumos/.test(a))
    chk('el renglón: insumo, marca y fábrica (con Todas y dos fábricas)', /Colorante · Fleibor<span class="stock-sin-ingreso__unidad"> · Cucuruchos Nuss<\/span>/.test(a), a)
    chk('… el lote', /<div class="stock-sin-ingreso__lote">Lote 35349771<\/div>/.test(a))
    chk('… kg, masas y la fecha de la última EN HORA ARGENTINA (01:03 UTC del 21 = 20/10)', /0,125 kg en 2 masas · última masa el 20\/10\/2026/.test(a), a)
    chk('una sola masa: singular', /50 kg en 1 masa · última masa el 15\/10\/2026/.test(a), a)
    S.alternarLotesSinIngreso()
    chk('y se vuelve a cerrar', /aria-expanded="false"/.test(caja(S).innerHTML))

    // La barra manda.
    await S.alCambiarBarra(barra(DOLCE))
    S.estado.sinIngresoAbierto = true
    S.pintarLotesSinIngreso()
    const d = caja(S).innerHTML
    chk('con Dolce elegida: solo lo de Dolce', /2 lotes usados sin ingreso cargado/.test(d) && /D-77/.test(d) && !/35349771/.test(d), d)
    chk('… y sin nombrar la fábrica (una sola)', !/stock-sin-ingreso__unidad/.test(d))
    chk('cambiar la barra no vuelve a consultar', consultas(S, 'masa_items').length === 1)
  }

  // ── 4. Permiso de Producción en UNA fábrica ─────────────────────────────
  {
    const S = nuevo({ tareas: ['stock:ver', 'produccion:cargar'], alcances: { 'produccion:cargar': { unidades: [NUSS] } } })
    await S.cargarStock()
    await S.alCambiarBarra(barra(null))
    const h = caja(S).innerHTML
    chk('con permiso en Nuss solo: lista lo de Nuss', /2 lotes usados sin ingreso cargado/.test(h) && !S.estado.sinIngreso.grupos.some(g => g.unidad_negocio_id === DOLCE), h)
    chk('… y dice que Dolce no se puede ver', /sin ingreso cargado de Dolce Pasta:/.test(h) && !/de Cucuruchos Nuss, Dolce/.test(h), h)
  }

  // ── 5. Errores ──────────────────────────────────────────────────────────
  {
    const S = nuevo()
    S.__setError('masa_items', { message: 'permission denied for table masa_items', code: '42501' })
    await S.cargarStock()
    await S.alCambiarBarra(barra(null))
    chk('un error de la base se dice tal cual', caja(S).hidden === false && /No se pudieron leer los lotes usados sin ingreso cargado: permission denied for table masa_items/.test(caja(S).innerHTML), caja(S).innerHTML)
    chk('… y el stock se ve igual', /Colorante/.test(S.__el('lista-stock').innerHTML))
    chk('… sin preguntar por los ingresos', consultas(S, 'stock_movimientos').length === 0)
  }
  {
    const S = nuevo()
    S.__setError('stock_movimientos', { message: 'timeout' })
    await S.cargarStock()
    await S.alCambiarBarra(barra(null))
    S.alternarLotesSinIngreso()
    const h = caja(S).innerHTML
    chk('si no se puede saber cuáles tienen ingreso, se listan todos y se avisa', /5 lotes usados sin ingreso cargado/.test(h) && /No se pudo comprobar si alguno ya tiene ingreso: timeout/.test(h), h)
  }
  {
    // El texto de los errores de la base también va escapado.
    const S = nuevo()
    S.__setError('masa_items', { message: '<b>falló</b>' })
    await S.cargarStock()
    chk('el error de la base va escapado', !/<b>/.test(caja(S).innerHTML) && /&lt;b&gt;falló/.test(caja(S).innerHTML), caja(S).innerHTML)
    const I = nuevo()
    I.__setError('stock_movimientos', { message: '<b>no</b>' })
    await I.cargarStock()
    I.alternarLotesSinIngreso()
    chk('… y el de los ingresos', !/<b>/.test(caja(I).innerHTML) && /&lt;b&gt;no/.test(caja(I).innerHTML), caja(I).innerHTML)
  }
  {
    const S = nuevo({ usados: [] })
    await S.cargarStock()
    await S.alCambiarBarra(barra(null))
    chk('sin lotes usados sin ingreso: no se muestra nada', caja(S).hidden === true && caja(S).innerHTML === '')
    chk('… ni se pregunta por los ingresos', consultas(S, 'stock_movimientos').length === 0)
  }
  {
    // Una fila anulada que llegara igual (defensa) no cuenta.
    const S = nuevo({ usados: [usado(NUSS, 'col', 'Colorante', null, 'X-1', 1, 'mx', '2026-10-20T12:00:00Z', { masas: { hora: '2026-10-20T12:00:00Z', anulada: true, turnos_produccion: { unidad_negocio_id: NUSS } } })] })
    await S.cargarStock()
    chk('una masa anulada no cuenta', S.estado.sinIngreso.grupos.length === 0)
  }

  // ── 6. Paginación ───────────────────────────────────────────────────────
  {
    const muchos = Array.from({ length: 1005 }, (_, i) => usado(NUSS, 'col', 'Colorante', null, 'P-1', 0.001, `m${i}`, '2026-10-20T12:00:00Z'))
    const S = nuevo({ usados: muchos })
    await S.cargarStock()
    const cs = consultas(S, 'masa_items')
    chk('más de 1000 renglones: pide la segunda página', cs.length === 2 && op(cs[1], 'range')?.[1] === 1000 && op(cs[1], 'range')?.[2] === 1999, cs.length)
    chk('… y suma todo', S.estado.sinIngreso.grupos[0]?.masas === 1005 && S.estado.sinIngreso.grupos[0]?.kg === 1.005, JSON.stringify(S.estado.sinIngreso.grupos[0]))
    chk('un solo lote: singular', /<span>1 lote usado sin ingreso cargado<\/span>/.test(caja(S).innerHTML), caja(S).innerHTML)
  }

  // ── 7. Escape ───────────────────────────────────────────────────────────
  {
    const MAL = '<img src=x onerror=alert(1)>'
    const S = nuevo({ usados: [usado(NUSS, 'col', MAL, MAL, MAL, 1, 'm1', '2026-10-20T12:00:00Z'), usado(DOLCE, 'col', 'C', null, 'L', 1, 'm2', '2026-10-20T12:00:00Z')] })
    S.__setDatos('v_mis_unidades_stock', [{ id: NUSS, nombre: MAL }, { id: DOLCE, nombre: 'Dolce Pasta' }])
    await S.cargarStock()
    S.estado.sinIngresoAbierto = true
    S.pintarLotesSinIngreso()
    const h = caja(S).innerHTML
    chk('insumo, marca, lote y fábrica van escapados', !/<img/.test(h) && (h.match(/&lt;img src=x/g) || []).length >= 4, h)
    const N = nuevo({ tareas: ['stock:ver'] })
    N.__setDatos('v_mis_unidades_stock', [{ id: NUSS, nombre: MAL }])
    await N.cargarStock()
    chk('… también en el aviso de permiso', !/<img/.test(caja(N).innerHTML) && /&lt;img/.test(caja(N).innerHTML), caja(N).innerHTML)
  }

  // ── 8. Lo que no se ejecuta ─────────────────────────────────────────────
  chk('la caja está en el HTML, escondida', /<section class="stock-sin-ingreso" id="stock-sin-ingreso" hidden><\/section>/.test(FUENTE))
  chk('tocar la cabecera abre y cierra', /getElementById\('stock-sin-ingreso'\)\.addEventListener\('click', ev => \{\n\s*if \(ev\.target\.closest\('\[data-sin-ingreso-alternar\]'\)\) alternarLotesSinIngreso\(\)/.test(SRC))
  chk('los 30 días en UNA constante', /const DIAS_SIN_INGRESO = 30\n/.test(FUENTE))
}

correr().then(() => fin(), e => { chk('la suite corre sin excepción', false, String(e && e.stack || e)); fin() })
