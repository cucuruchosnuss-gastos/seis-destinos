// LOTES USADOS SIN INGRESO CARGADO (23/10/2026; con la RPC desde el
// 24/10/2026) — modulos/stock.html.
//
// Pedido de Facu: en Stock (la pantalla de administración, no la tablet) un
// aviso con los lotes que la sala de masa usó sin ingreso cargado
// (masa_items.lote_fuera_de_stock) en los últimos 30 días, por insumo y lote,
// con los kg y la fecha de la última masa.
//
// Desde el 24/10/2026 lo junta la base: una llamada POR FÁBRICA a
//   lotes_usados_sin_ingreso(p_unidad_negocio_id uuid, p_dias integer DEFAULT 30)
//   → jsonb [{insumo_id, insumo, marca, unidad_medida, lote, kg, masas, ultima_fecha, maquinas}]
// (pg_get_functiondef, 24/10/2026): SECURITY DEFINER; ya excluye los lotes
// con ingreso; exige stock:ver, produccion:ver o produccion:configurar con
// alcance en la fábrica (si no, error); ultima_fecha es un date.
// Exige:
//  - una llamada por fábrica de la pantalla donde la regla da, con
//    { p_unidad_negocio_id, p_dias: 30 }, todas a la vez; ninguna lectura
//    directa de masa_items ni de stock_movimientos;
//  - la regla del permiso, la MISMA que la RPC (puedeTareaEn = alcance);
//  - lo que devuelve, mostrado: insumo · marca (· fábrica), lote, kg, masas,
//    máquinas y la fecha de la última masa (el date tal cual, sin zona);
//  - las fábricas juntas, la más reciente primero; la barra manda sin volver
//    a consultar; la fábrica de pruebas nunca;
//  - el error de UNA fábrica se muestra tal cual, con su nombre, y las demás
//    se ven igual; el stock se ve igual; sin nota de "sin permiso";
//  - una respuesta vieja no pisa a una nueva;
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
  'cargarLotesSinIngreso', 'pintarLotesSinIngreso', 'alternarLotesSinIngreso', 'puedeVerLotesSinIngresoEn',
  'filasSinIngreso', 'ordenarSinIngreso', 'formatearFechaCorta', ...FUNCIONES_CANTIDADES]

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

// El doble de supabase ANOTA cada consulta y cada rpc. La rpc
// lotes_usados_sin_ingreso responde POR FÁBRICA lo que diga __rpc[unidad]:
// un array (data), { error } (la base contesta un error), { tira } (la
// promesa se rechaza) o nada (data null). Con __retener, las respuestas
// quedan esperando hasta __soltar() (para ver que salen todas a la vez y que
// una respuesta vieja no pisa a una nueva).
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
  var __consultas = []
  var __rpc = {}
  var __rpcs = []
  var __eventos = []
  var __retener = false
  var __pendientes = []
  function __consulta(tabla) {
    const ops = []
    __consultas.push({ tabla, ops })
    const q = {}
    for (const k of ['select', 'eq', 'neq', 'in', 'is', 'order', 'gte', 'gt', 'lte', 'lt', 'limit', 'range', 'not', 'or']) q[k] = (...a) => { ops.push([k, ...a]); return q }
    q.maybeSingle = () => q
    q.then = (res, rej) => {
      let data = (__datos[tabla] ?? []).map(f => JSON.parse(JSON.stringify(f)))
      const r = ops.find(o => o[0] === 'range')
      if (r) data = data.slice(r[1], r[2] + 1)
      return Promise.resolve({ data, error: null }).then(res, rej)
    }
    return q
  }
  function __responder(nombre, params) {
    if (nombre !== 'lotes_usados_sin_ingreso') return { data: null, error: null }
    const r = __rpc[params?.p_unidad_negocio_id]
    __eventos.push('fin ' + params?.p_unidad_negocio_id)
    if (r && r.tira) throw r.tira
    if (r && r.error) return { data: null, error: r.error }
    return { data: r === undefined ? null : JSON.parse(JSON.stringify(r)), error: null }
  }
  var supabase = {
    from: (t) => __consulta(t),
    rpc(nombre, params) {
      __rpcs.push({ nombre, params: JSON.parse(JSON.stringify(params ?? null)) })
      __eventos.push('empieza ' + params?.p_unidad_negocio_id)
      if (__retener) return new Promise((ok, mal) => __pendientes.push(() => { try { ok(__responder(nombre, params)) } catch (e) { mal(e) } }))
      return new Promise((ok, mal) => { try { ok(__responder(nombre, params)) } catch (e) { mal(e) } })
    },
  }
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
const RETORNO = 'estado, __el(id){ return document.getElementById(id) }, __setDatos(t, d){ __datos[t] = d }, ' +
  '__setRpc(u, r){ __rpc[u] = r }, __consultas, __rpcs, __eventos, __retener(v){ __retener = v }, ' +
  '__soltar(){ const p = __pendientes.splice(0); for (const f of p) f() }'

const NUSS = 'u-nuss', DOLCE = 'u-dolce', ROBOT = 'u-robot'
const BARRA = [{ id: NUSS, nombre: 'Cucuruchos Nuss', prefijo: 'N' }, { id: DOLCE, nombre: 'Dolce Pasta', prefijo: 'D' }]
const STOCK = [
  { unidad_negocio_id: NUSS, insumo_id: 'col', insumo_nombre: 'Colorante', marca: null, unidad_medida: 'kg', tipo: 'insumo', categoria: 'Aditivos',
    aclaracion: null, cantidad_total: -1.3, lotes_distintos: 1, presentaciones: 0, contenido_unico: null, kilos_sueltos: 0, vista_preferida: 'base' },
]

// Como la devuelve la RPC (jsonb_build_object): kg numeric, masas bigint,
// ultima_fecha date.
function lote(insumo_id, insumo, marca, lote, kg, masas, ultima_fecha, maquinas = 'Máquina 1') {
  return { insumo_id, insumo, marca, unidad_medida: 'kg', lote, kg, masas, ultima_fecha, maquinas }
}
const RPC = {
  [NUSS]: [
    // La RPC ya las manda ordenadas por fecha; acá a propósito NO, para ver
    // que la pantalla junta las fábricas y ordena.
    lote('har', 'Harina 000', null, '01/10/26', 50, 1, '2026-10-15', 'Máquina 3'),
    // kg y masas como texto: también tienen que valer como números.
    lote('col', 'Colorante', 'Fleibor', '35349771', '0.125', '2', '2026-10-21', 'Máquina 1, Máquina 2'),
  ],
  [DOLCE]: [
    lote('col', 'Colorante', 'Fleibor', 'D-77', '0.04', 1, '2026-10-21'),
    lote('har', 'Harina 000', null, '01/10/26', 10, 1, '2026-10-16'),
  ],
  [ROBOT]: [lote('col', 'Colorante', 'Fleibor', 'ROBOT-1', 9, 1, '2026-10-21')],
}

const SRC = scriptModulo(ARCHIVO)
let MOLDE = null
try { MOLDE = clausura(SRC) } catch (e) { chk('la clausura de funciones se arma', false, String(e && e.stack || e)) }

function nuevo({ tareas = ['stock:ver'], alcances = {}, rol = 'usuario', rpc = RPC, unidades = null } = {}) {
  const S = construirCon(ARCHIVO, { preludio: PRELUDIO, funciones: MOLDE.funciones, constantes: [...CONSTANTES_CANTIDADES, ...MOLDE.constantes], retorno: RETORNO })
  const E = S.estado
  E.miRolApp = rol
  E.misTareas = new Set(tareas)
  E.alcancesTareas = new Map(tareas.map(t => [t, t in alcances ? alcances[t] : { todas: true }]))
  E.fabrica = { ok: true, unidades: new Set([ROBOT]), personas: new Set(), soyDePrueba: false }
  S.__setDatos('v_mis_unidades_stock', unidades ?? [...BARRA, { id: ROBOT, nombre: 'Robot' }].map(({ id, nombre }) => ({ id, nombre })))
  S.__setDatos('v_stock_insumos', STOCK)
  S.__setDatos('v_stock_cobertura', [])
  for (const [u, r] of Object.entries(rpc)) S.__setRpc(u, r)
  return S
}
const barra = (elegida) => ({ elegida, unidades: BARRA, mostrar: true })
const caja = (S) => S.__el('stock-sin-ingreso')
const llamadas = (S) => S.__rpcs.filter(c => c.nombre === 'lotes_usados_sin_ingreso')
const unidadesLlamadas = (S) => llamadas(S).map(c => c.params?.p_unidad_negocio_id).sort().join(',')

async function correr() {
  if (!MOLDE) return

  // ── 1. El permiso: la MISMA regla que la RPC (con alcance) ───────────────
  {
    const S = nuevo({ tareas: ['stock:ver'] })
    chk('stock:ver con alcance a todas: puede', S.puedeVerLotesSinIngresoEn(NUSS) && S.puedeVerLotesSinIngresoEn(DOLCE))
    const T = nuevo({ tareas: ['stock:ver'], alcances: { 'stock:ver': { unidades: [NUSS] } } })
    chk('stock:ver solo en Nuss: Nuss sí, Dolce no', T.puedeVerLotesSinIngresoEn(NUSS) && !T.puedeVerLotesSinIngresoEn(DOLCE))
    const V = nuevo({ tareas: ['produccion:ver'], alcances: { 'produccion:ver': { unidades: [DOLCE] } } })
    chk('produccion:ver en Dolce: Dolce sí, Nuss no', V.puedeVerLotesSinIngresoEn(DOLCE) && !V.puedeVerLotesSinIngresoEn(NUSS))
    const K = nuevo({ tareas: ['produccion:configurar'], alcances: { 'produccion:configurar': { unidades: [NUSS] } } })
    chk('produccion:configurar en Nuss: Nuss sí', K.puedeVerLotesSinIngresoEn(NUSS) && !K.puedeVerLotesSinIngresoEn(DOLCE))
    const C = nuevo({ tareas: ['produccion:cargar'] })
    chk('produccion:cargar solo NO alcanza (la RPC no lo acepta)', C.puedeVerLotesSinIngresoEn(NUSS) === false)
    const O = nuevo({ tareas: ['stock:ajustar_inventario'] })
    chk('otra tarea de stock no alcanza', O.puedeVerLotesSinIngresoEn(NUSS) === false)
    const A = nuevo({ tareas: [], rol: 'super_admin' })
    chk('super_admin: sí (como en la base)', A.puedeVerLotesSinIngresoEn(NUSS))
    const N = nuevo({ tareas: ['stock:ver'], alcances: { 'stock:ver': null } })
    chk('una tarea con alcance null no da ninguna fábrica', N.puedeVerLotesSinIngresoEn(NUSS) === false)
  }

  // ── 2. La llamada: una por fábrica, con sus parámetros, todas a la vez ───
  {
    const S = nuevo()
    S.__retener(true)
    const p = S.cargarStock()
    // cargarStock espera el stock antes de pedir los lotes: unos turnos.
    for (let i = 0; i < 50 && llamadas(S).length < 2; i++) await null
    chk('una llamada por fábrica de la pantalla (Nuss y Dolce)', unidadesLlamadas(S) === [DOLCE, NUSS].sort().join(','), unidadesLlamadas(S))
    chk('… todas a la vez: la segunda sale antes de que vuelva la primera', S.__eventos.filter(e => e.startsWith('empieza')).length === 2 && !S.__eventos.some(e => e.startsWith('fin')), S.__eventos.join(' | '))
    S.__soltar()
    await p
    chk('… con { p_unidad_negocio_id, p_dias: 30 } y nada más', llamadas(S).every(c => JSON.stringify(Object.keys(c.params).sort()) === '["p_dias","p_unidad_negocio_id"]' && c.params.p_dias === 30), JSON.stringify(llamadas(S)))
    chk('la fábrica de pruebas no se consulta', !llamadas(S).some(c => c.params.p_unidad_negocio_id === ROBOT))
    chk('no se lee masa_items ni stock_movimientos directo', !S.__consultas.some(c => c.tabla === 'masa_items' || c.tabla === 'stock_movimientos'), S.__consultas.map(c => c.tabla).join(','))
    await S.alCambiarBarra(barra(DOLCE))
    await S.alCambiarBarra(barra(null))
    chk('cambiar la barra no vuelve a consultar', llamadas(S).length === 2)
  }
  {
    const S = nuevo({ tareas: ['produccion:ver'], alcances: { 'produccion:ver': { unidades: [NUSS] } } })
    await S.cargarStock()
    chk('con permiso solo en Nuss: se consulta solo Nuss', unidadesLlamadas(S) === NUSS, unidadesLlamadas(S))
    await S.alCambiarBarra(barra(null))
    chk('… y lo de Dolce no aparece, sin nota de permiso', !/D-77/.test(caja(S).innerHTML) && !/No se pueden ver|permiso/.test(caja(S).innerHTML), caja(S).innerHTML)
  }
  {
    const S = nuevo({ tareas: ['produccion:cargar'] })
    await S.cargarStock()
    await S.alCambiarBarra(barra(null))
    chk('sin ningún permiso que la RPC acepte: no se llama', llamadas(S).length === 0)
    chk('… y no se muestra nada (ni nota de permiso)', caja(S).hidden === true && caja(S).innerHTML === '', caja(S).innerHTML)
  }

  // ── 3. Lo que devuelve, en pantalla ──────────────────────────────────────
  {
    const S = nuevo()
    await S.cargarStock()
    await S.alCambiarBarra(barra(null))
    const g = S.estado.sinIngreso.grupos
    const col = g.find(x => x.unidad_negocio_id === NUSS && x.lote === '35349771')
    chk('cada renglón lleva su fábrica (la de la llamada)', !!col && g.filter(x => x.unidad_negocio_id === DOLCE).length === 2, JSON.stringify(g))
    chk('… kg y masas como números (también si llegan como texto)', col?.kg === 0.125 && col?.masas === 2 && g.find(x => x.lote === 'D-77')?.kg === 0.04, JSON.stringify(g))
    chk('la fábrica de pruebas no aparece', !g.some(x => x.unidad_negocio_id === ROBOT || x.lote === 'ROBOT-1'))
    chk('las fábricas juntas, la más reciente primero (y por insumo y lote)', g.map(x => x.lote).join(',') === '35349771,D-77,01/10/26,01/10/26' &&
      g[2].unidad_negocio_id === DOLCE && g[3].unidad_negocio_id === NUSS, g.map(x => `${x.lote}@${x.unidad_negocio_id}`).join(','))

    const h = caja(S).innerHTML
    chk('el aviso se ve, con cuántos lotes', caja(S).hidden === false && /<span>4 lotes usados sin ingreso cargado<\/span>/.test(h), h)
    chk('… cerrado: "Ver cuáles" y la lista escondida', /aria-expanded="false"/.test(h) && /Ver cuáles/.test(h) && /class="stock-sin-ingreso__cuerpo" hidden>/.test(h), h)
    chk('… sin nota de "sin permiso"', !/No se pueden ver|permiso de Producción/.test(h))
    S.alternarLotesSinIngreso()
    const a = caja(S).innerHTML
    chk('al tocarlo se abre', /aria-expanded="true"/.test(a) && /Ocultar/.test(a) && /class="stock-sin-ingreso__cuerpo">/.test(a), a)
    chk('… dice para qué es', /en los últimos 30 días y no tienen ingreso cargado\. Cargá el ingreso en Insumos/.test(a))
    chk('el renglón: insumo, marca y fábrica (con Todas y dos fábricas)', /Colorante · Fleibor<span class="stock-sin-ingreso__unidad"> · Cucuruchos Nuss<\/span>/.test(a), a)
    chk('… sin marca, sin el " · "', /<div class="stock-sin-ingreso__que">Harina 000<span/.test(a), a)
    chk('… el lote', /<div class="stock-sin-ingreso__lote">Lote 35349771<\/div>/.test(a))
    chk('… kg, masas, máquinas y la fecha de la última masa (el date TAL CUAL: 21/10, sin correrlo por zona horaria)',
      /0,125 kg en 2 masas · Máquina 1, Máquina 2 · última masa el 21\/10\/2026/.test(a), a)
    chk('una sola masa: singular', /50 kg en 1 masa · Máquina 3 · última masa el 15\/10\/2026/.test(a), a)
    S.alternarLotesSinIngreso()
    chk('y se vuelve a cerrar', /aria-expanded="false"/.test(caja(S).innerHTML))

    // La barra manda.
    await S.alCambiarBarra(barra(DOLCE))
    S.estado.sinIngresoAbierto = true
    S.pintarLotesSinIngreso()
    const d = caja(S).innerHTML
    chk('con Dolce elegida: solo lo de Dolce', /2 lotes usados sin ingreso cargado/.test(d) && /D-77/.test(d) && !/35349771/.test(d), d)
    chk('… y sin nombrar la fábrica (una sola)', !/stock-sin-ingreso__unidad/.test(d))
  }
  {
    // Sin máquinas, sin fecha y sin lote.
    const S = nuevo({ rpc: { [NUSS]: [{ insumo_id: 'col', insumo: 'Colorante', marca: null, unidad_medida: 'kg', lote: null, kg: 1, masas: 1, ultima_fecha: null, maquinas: null }], [DOLCE]: [] } })
    await S.cargarStock()
    S.estado.sinIngresoAbierto = true
    S.pintarLotesSinIngreso()
    const h = caja(S).innerHTML
    chk('un lote sin número dice "Sin número de lote"', /<div class="stock-sin-ingreso__lote">Sin número de lote<\/div>/.test(h), h)
    chk('… sin máquinas ni fecha, sin los " · " de más', /<div class="stock-sin-ingreso__datos">1 kg en 1 masa<\/div>/.test(h), h)
    chk('una sola fábrica con lotes (aunque haya Todas): no se nombra', !/stock-sin-ingreso__unidad/.test(h))
    chk('un solo lote: singular', /<span>1 lote usado sin ingreso cargado<\/span>/.test(h), h)
  }

  // ── 4. Errores: el de UNA fábrica, tal cual; las demás se ven igual ──────
  {
    const S = nuevo({ rpc: { ...RPC, [NUSS]: { error: { message: 'No tenés permiso para ver el stock de esta fábrica.', code: 'P0001' } } } })
    await S.cargarStock()
    await S.alCambiarBarra(barra(null))
    S.alternarLotesSinIngreso()
    const h = caja(S).innerHTML
    chk('el error de la base se dice tal cual, con su fábrica', caja(S).hidden === false &&
      /<p class="rec-aviso">No se pudieron leer los lotes usados sin ingreso cargado de Cucuruchos Nuss: No tenés permiso para ver el stock de esta fábrica\.<\/p>/.test(h), h)
    chk('… y lo de la otra fábrica se ve igual', /2 lotes usados sin ingreso cargado/.test(h) && /D-77/.test(h) && !/35349771/.test(h), h)
    chk('… y el stock se ve igual', /Colorante/.test(S.__el('lista-stock').innerHTML))
    await S.alCambiarBarra(barra(DOLCE))
    chk('con Dolce elegida, el error de Nuss no se ve', !/No se pudieron leer/.test(caja(S).innerHTML) && /D-77/.test(caja(S).innerHTML), caja(S).innerHTML)
    await S.alCambiarBarra(barra(NUSS))
    chk('con Nuss elegida, solo el error (la caja se ve)', caja(S).hidden === false && /de Cucuruchos Nuss: No tenés permiso/.test(caja(S).innerHTML) && !/lotes? usados? sin ingreso cargado<\/span>/.test(caja(S).innerHTML), caja(S).innerHTML)
  }
  {
    const S = nuevo({ rpc: { ...RPC, [DOLCE]: { tira: new Error('Failed to fetch') }, [NUSS]: { error: {} } } })
    await S.cargarStock()
    await S.alCambiarBarra(barra(null))
    const h = caja(S).innerHTML
    chk('una llamada que se cae (promesa rechazada) también se dice, sin romper', /de Dolce Pasta: Failed to fetch/.test(h), h)
    chk('… y un error sin mensaje dice "error de la base"', /de Cucuruchos Nuss: error de la base/.test(h), h)
    chk('… el stock se ve igual', /Colorante/.test(S.__el('lista-stock').innerHTML))
  }
  {
    const S = nuevo({ rpc: { [NUSS]: [], [DOLCE]: null } })
    await S.cargarStock()
    await S.alCambiarBarra(barra(null))
    chk('sin lotes usados sin ingreso (vacío o null): no se muestra nada', caja(S).hidden === true && caja(S).innerHTML === '', caja(S).innerHTML)
  }

  // ── 5. Una respuesta vieja no pisa a una nueva ───────────────────────────
  {
    const S = nuevo()
    await S.cargarStock()
    S.__retener(true)
    const vieja = S.cargarLotesSinIngreso()
    S.__retener(false)
    S.__setRpc(NUSS, [lote('col', 'Colorante', 'Fleibor', 'NUEVO-1', 1, 1, '2026-10-22')])
    S.__setRpc(DOLCE, [])
    await S.cargarLotesSinIngreso()
    S.__setRpc(NUSS, [lote('col', 'Colorante', 'Fleibor', 'VIEJO-1', 1, 1, '2026-10-22')])
    S.__soltar()
    await vieja
    chk('la respuesta que llega tarde no pisa a la más nueva', S.estado.sinIngreso.grupos.map(g => g.lote).join(',') === 'NUEVO-1', S.estado.sinIngreso.grupos.map(g => g.lote).join(','))
  }

  // ── 6. Escape ────────────────────────────────────────────────────────────
  {
    const MAL = '<img src=x onerror=alert(1)>'
    const S = nuevo({
      rpc: { [NUSS]: [lote('col', MAL, MAL, MAL, 1, 1, MAL, MAL)], [DOLCE]: [lote('col', 'C', null, 'L', 1, 1, '2026-10-20')] },
      unidades: [{ id: NUSS, nombre: MAL }, { id: DOLCE, nombre: 'Dolce Pasta' }],
    })
    await S.cargarStock()
    S.estado.sinIngresoAbierto = true
    S.pintarLotesSinIngreso()
    const h = caja(S).innerHTML
    // insumo, marca, fábrica, lote, máquinas y fecha: seis.
    chk('insumo, marca, lote, máquinas, fecha y fábrica van escapados', !/<img/.test(h) && (h.match(/&lt;img src=x/g) || []).length >= 6, h)
    const E = nuevo({ rpc: { [NUSS]: { error: { message: '<b>falló</b>' } }, [DOLCE]: [] }, unidades: [{ id: NUSS, nombre: MAL }, { id: DOLCE, nombre: 'Dolce Pasta' }] })
    await E.cargarStock()
    chk('el error de la base y el nombre de su fábrica van escapados', !/<b>|<img/.test(caja(E).innerHTML) && /&lt;b&gt;falló/.test(caja(E).innerHTML) && /de &lt;img/.test(caja(E).innerHTML), caja(E).innerHTML)
  }

  // ── 7. Lo que no se ejecuta ──────────────────────────────────────────────
  chk('la caja está en el HTML, escondida', /<section class="stock-sin-ingreso" id="stock-sin-ingreso" hidden><\/section>/.test(FUENTE))
  chk('tocar la cabecera abre y cierra', /getElementById\('stock-sin-ingreso'\)\.addEventListener\('click', ev => \{\n\s*if \(ev\.target\.closest\('\[data-sin-ingreso-alternar\]'\)\) alternarLotesSinIngreso\(\)/.test(SRC))
  chk('los 30 días en UNA constante', /const DIAS_SIN_INGRESO = 30\n/.test(FUENTE))
  chk('ya no queda la lectura directa de masa_items en Stock', !/from\('masa_items'\)/.test(SRC))
}

correr().then(() => fin(), e => { chk('la suite corre sin excepción', false, String(e && e.stack || e)); fin() })
