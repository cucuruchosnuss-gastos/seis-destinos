// STOCK — AJUSTES DEL 24/10/2026 (rama ci-prueba/ajustes-24-10) —
// modulos/stock.html.
//
// a) COSTOS: lo que trae UN bulto sale PRIMERO del catálogo
//    (insumos.contenido_bulto, como Administración y la Carga desde la Tanda
//    A del 24/10/2026); si es null, como hasta ahora (v_stock_insumos:
//    contenido_unico con UNA sola presentación). Exige:
//     - se lee insumos con contenido_bulto (lo lee cualquier usuario
//       logueado: policy "leer catalogo de insumos", SELECT 24/10/2026), UNA
//       vez por página aunque se cambie de fábrica;
//     - harina: catálogo 25 y la fábrica 50 → 25 (el catálogo manda), por
//       bulto: $ 17.500 el bulto viaja como 700 por kg a guardar_costo_insumo;
//     - azúcar: catálogo null → el de la fábrica (50), como antes;
//     - lecitina sin stock en la fábrica: catálogo 20 y vista 'bulto' → por
//       bulto de 20 kg;
//     - si el catálogo no se puede leer, los costos se ven igual, con el
//       bulto de la fábrica (dato de más, como en Administración);
//     - el contenido viene como TEXTO (numeric): '25' vale 25; 0 o negativo
//       no es un bulto.
// d) LOTES USADOS SIN INGRESO: la cantidad con la unidad que manda la base
//    (lotes_usados_sin_ingreso devuelve unidad_medida de insumos;
//    pg_get_functiondef 24/10/2026); "kg" solo si viene vacía. Escapada.
// Y nada de lo que había se perdió: todo id y data-* de stock.html en el
// commit FIJO d2d1dc1 (main antes de esta rama) sigue estando.
//
// EJECUTA las funciones reales (juntadas por clausura, como
// test-stock-costos.js) con un document y un supabase falsos.
//
//   node pruebas/test-stock-ajustes-24-10.js
// Archivo bajo prueba: ARCHIVO_TEST, o modulos/stock.html.
'use strict'

const fs = require('fs')
const path = require('path')
const { construirCon, scriptModulo } = require('./sandbox')
const { FUNCIONES_CANTIDADES, CONSTANTES_CANTIDADES, FUNCIONES_PRECIO } = require('./cantidades-comun')
const { arnes, leer, marca, chequearMarcas } = require('./circuito-comun')
const { extraerFn } = require('./extraer')
const { fuenteNumeros } = require('./numeros-comun')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/stock.html')
const FUENTE = leer(ARCHIVO)
const { chk, fin } = arnes()

const STUBS = new Set([
  'formatearFecha', 'mostrarError', 'mostrarExito', 'abrirConHistorial', 'cerrarConHistorial', 'asegurarCatalogo',
  'guardarConteoAhora', 'cargarRecuento', 'cargarLotesMov', 'prepararCantidadMov',
  'poblarSelectorMotivoTipo', 'actualizarContadorRec', 'renderizarClaseRecuento', 'mostrarVista',
  'verificarSesion', 'mostrarBannerVersion', 'renderizarItemsTransf', 'limpiarErroresTransf',
  'limpiarErroresMov', 'quitarInsumoMov', 'elegirInsumoMov', 'puedeDarBaja',
])
const RENDERS = ['esc', 'pasaFiltroUnidad', 'sinUnidadesDePrueba', 'alCambiarBarra', 'cargarStock', 'renderizarStock',
  'cargarCostos', 'renderizarCostos', 'abrirCosto', 'cerrarModalCosto', 'cambiarModoCosto', 'guardarCosto',
  'pintarModalCosto', 'presentacionCosto', 'cargarBultosCatalogoCostos', 'costoUnitarioDe',
  'cargarLotesSinIngreso', 'pintarLotesSinIngreso', 'filasSinIngreso', 'unidadSinIngreso', 'formatearFechaCorta',
  ...FUNCIONES_CANTIDADES, 'unidadCorta', ...FUNCIONES_PRECIO]

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

// Las consultas guardan la tabla y el select; una tabla en __fallan responde
// con ese error de la base.
const PRELUDIO = `
  ${fuenteNumeros()}
  function nuevoEl(id) {
    const attrs = {}
    return {
      id, innerHTML: '', textContent: '', value: '', className: '', hidden: false, checked: false, disabled: false,
      dataset: {}, style: {}, querySelector: () => null, querySelectorAll: () => [], addEventListener(){}, focus(){},
      removeAttribute(){}, setAttribute(k, v){ attrs[k] = v }, getAttribute(k){ return attrs[k] ?? null },
      closest: () => nuevoEl('closest'), setSelectionRange(){}, dispatchEvent(){},
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
  var __datos = {}, __fallan = {}, __rpc = {}, __llamadas = [], __consultas = []
  function __consulta(tabla) {
    const reg = { tabla, select: null }
    __consultas.push(reg)
    const q = { filtros: [] }
    for (const k of ['neq', 'is', 'order', 'gte', 'lte', 'limit', 'range', 'not', 'or']) q[k] = () => q
    q.select = (c) => { reg.select = c; return q }
    q.in = (c, v) => { q.filtros.push(['in', c, v]); return q }
    q.eq = (c, v) => { q.filtros.push([c, v]); return q }
    q.maybeSingle = () => q
    q.then = (res, rej) => {
      if (__fallan[tabla]) return Promise.resolve({ data: null, error: __fallan[tabla] }).then(res, rej)
      return Promise.resolve({ data: (__datos[tabla] ?? [])
        .filter(f => q.filtros.every(([op, c, v]) => op !== 'in' || v.includes(f[c])))
        .map(f => ({ ...f })), error: null }).then(res, rej)
    }
    return q
  }
  var supabase = {
    from: (t) => __consulta(t),
    rpc: async (n, p) => {
      __llamadas.push({ n, p })
      const r = __rpc[n]
      if (typeof r === 'function') return r(p)
      return r ?? { data: null, error: null }
    },
  }
  var __exitos = []
  function mostrarError() {}
  function mostrarExito(t) { __exitos.push(t) }
  function formatearFecha(f) { const [a, m, d] = String(f).split('-'); return d + '/' + m + '/' + a }
  function abrirConHistorial() {}
  function cerrarConHistorial() {}
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
const RETORNO = 'estado, __el(id){ return document.getElementById(id) }, __setDatos(t, d){ __datos[t] = d }, ' +
  '__falla(t, e){ __fallan[t] = e }, __setRpc(n, r){ __rpc[n] = r }, __llamadas, __consultas, __exitos'

const NUSS = 'u-nuss', DOLCE = 'u-dolce', ROBOT = 'u-robot'
const BARRA = [{ id: NUSS, nombre: 'Cucuruchos Nuss', prefijo: 'N' }, { id: DOLCE, nombre: 'Dolce Pasta', prefijo: 'D' }]

function fila(unidad, insumo, nombre, cantidad, extra = {}) {
  return {
    unidad_negocio_id: unidad, insumo_id: insumo, insumo_nombre: nombre, marca: null, unidad_medida: 'kg',
    tipo: 'materia_prima', categoria: 'Harinas', aclaracion: null, cantidad_total: cantidad,
    lotes_distintos: 1, presentaciones: 0, contenido_unico: null, kilos_sueltos: 0, vista_preferida: 'base', ...extra,
  }
}
// La harina de la fábrica tiene lotes de 50 kg, pero el catálogo dice 25; el
// azúcar no tiene contenido en el catálogo; la lecitina no tiene stock en Nuss.
const STOCK = [
  fila(NUSS, 'harina', 'Harina 000', 5000, { presentaciones: 1, contenido_unico: '50', vista_preferida: 'bulto' }),
  fila(NUSS, 'azucar', 'Azúcar', 1000, { presentaciones: 1, contenido_unico: '50', vista_preferida: 'bulto' }),
  fila(NUSS, 'sal', 'Sal', 10, { presentaciones: 1, contenido_unico: '25', vista_preferida: 'bulto' }),
  fila(DOLCE, 'harina', 'Harina 000', 1000, { presentaciones: 1, contenido_unico: '50', vista_preferida: 'bulto' }),
]
// Como devuelve la base: numeric como TEXTO.
const CATALOGO = [
  { id: 'harina', contenido_bulto: '25', vista_preferida: 'bulto' },
  { id: 'azucar', contenido_bulto: null, vista_preferida: 'bulto' },
  { id: 'lecitina', contenido_bulto: '20', vista_preferida: 'bulto' },
  { id: 'sal', contenido_bulto: '0', vista_preferida: 'bulto' },
]
const costo = (insumo_id, insumo, c) => ({ insumo_id, insumo, marca: null, categoria: 'Harinas', unidad_medida: 'kg', costo_unitario: c, vigente_desde: '2026-10-01', cargado_por: 'Facundo', costo_anterior: null, variacion_pct: null })
const COSTOS_NUSS = [costo('harina', 'Harina 000', '1000.0000'), costo('azucar', 'Azúcar', '2.0000'), costo('lecitina', 'Lecitina', '300.0000'), costo('sal', 'Sal', '1.0000')]

const SRC = scriptModulo(ARCHIVO)
let MOLDE = null
try { MOLDE = clausura(SRC) } catch (e) { chk('la clausura de funciones se arma', false, String(e && e.stack || e)) }

function nuevo({ tareas = new Map([['stock:ver', { todas: true }], ['stock:ver_costos', { unidades: [NUSS, DOLCE] }], ['stock:cargar_costos', { unidades: [NUSS] }]]) } = {}) {
  const S = construirCon(ARCHIVO, { preludio: PRELUDIO, funciones: MOLDE.funciones, constantes: [...CONSTANTES_CANTIDADES, ...MOLDE.constantes], retorno: RETORNO })
  const E = S.estado
  E.miRolApp = 'usuario'
  E.misTareas = new Set(tareas.keys())
  E.alcancesTareas = tareas
  E.fabrica = { ok: true, unidades: new Set([ROBOT]), personas: new Set(), soyDePrueba: false }
  S.__setDatos('v_mis_unidades_stock', BARRA.map(({ id, nombre }) => ({ id, nombre })))
  S.__setDatos('v_stock_insumos', STOCK)
  S.__setDatos('v_stock_cobertura', [])
  S.__setDatos('insumos', CATALOGO)
  S.__setRpc('stock_valorizado', () => ({ data: [], error: null }))
  S.__setRpc('costos_insumos', (p) => ({ data: p.p_unidad_negocio_id === NUSS ? COSTOS_NUSS : [], error: null }))
  S.__setRpc('lotes_usados_sin_ingreso', () => ({ data: [], error: null }))
  return S
}
const barra = (elegida, unidades = BARRA) => ({ elegida, unidades, mostrar: true })
const tick = () => new Promise(r => setTimeout(r, 0))
const lecturasCatalogo = S => S.__consultas.filter(c => c.tabla === 'insumos')

async function enCostos(S, unidad = NUSS) {
  await S.alCambiarBarra(barra(unidad))
  await S.cargarStock()
  await S.cargarCostos()
  return S
}

async function correr() {
  if (!MOLDE) return

  // ── a) El catálogo manda ────────────────────────────────────────────────
  {
    const S = await enCostos(nuevo())
    const lect = lecturasCatalogo(S)
    chk('costos: se lee el catálogo de insumos con contenido_bulto', lect.length === 1 && /\bcontenido_bulto\b/.test(lect[0].select ?? '') && /\bid\b/.test(lect[0].select ?? ''), JSON.stringify(lect))
    chk('… y con vista_preferida (para un insumo sin stock en la fábrica)', /\bvista_preferida\b/.test(lect[0]?.select ?? ''))
    const p = (id) => S.presentacionCosto(NUSS, id)
    chk('harina: catálogo 25 y lotes de 50 → 25 (el catálogo manda)', p('harina').contenido === 25 && p('harina').vista === 'bulto', JSON.stringify(p('harina')))
    chk('azúcar: catálogo null → el de la fábrica (50), como antes', p('azucar').contenido === 50, JSON.stringify(p('azucar')))
    chk('lecitina sin stock en la fábrica: catálogo 20, vista bulto del catálogo', p('lecitina').contenido === 20 && p('lecitina').vista === 'bulto', JSON.stringify(p('lecitina')))
    chk('sal: un 0 en el catálogo no es un bulto → el de la fábrica (25)', p('sal').contenido === 25, JSON.stringify(p('sal')))
    chk('un insumo que no está en ningún lado: sin bulto, en su unidad', p('nada').contenido === null && p('nada').vista === 'base', JSON.stringify(p('nada')))
    const h = S.__el('lista-costos').innerHTML
    chk('la fila de la harina: "$ 25.000,00 el bulto de 25 kg · $ 1.000,00 por kg"', /\$ 25\.000,00 el bulto de 25 kg · \$ 1\.000,00 por kg/.test(h), h)
    chk('la del azúcar sigue con su bulto de 50 kg', /\$ 100,00 el bulto de 50 kg · \$ 2,00 por kg/.test(h), h)
    chk('la de la lecitina, por bidón de 20 kg del catálogo', /\$ 6\.000,00 el bulto de 20 kg · \$ 300,00 por kg/.test(h), h)
    // Otra fábrica y vuelta: el catálogo se leyó UNA vez.
    await S.alCambiarBarra(barra(DOLCE))
    await S.cargarCostos()
    await S.alCambiarBarra(barra(NUSS))
    await S.cargarCostos()
    chk('el catálogo se lee una sola vez por página', lecturasCatalogo(S).length === 1, lecturasCatalogo(S).length)
    chk('en Dolce la harina también va por 25 (el catálogo es uno solo)', S.presentacionCosto(DOLCE, 'harina').contenido === 25)
  }

  // Cargar un costo por bulto: 17.500 el bulto de 25 kg → 700 por kg.
  {
    const S = await enCostos(nuevo())
    S.abrirCosto('harina')
    await tick()
    const m = S.estado.costo
    chk('el modal de la harina: bulto de 25 kg y arranca por bulto', m.contenido === 25 && m.modo === 'bulto', JSON.stringify({ c: m.contenido, modo: m.modo }))
    chk('rótulo: "Precio por bulto de 25 kg"', S.__el('costo-precio-rotulo').textContent === 'Precio por bulto de 25 kg', S.__el('costo-precio-rotulo').textContent)
    S.__el('costo-precio').value = '17.500'
    S.pintarModalCosto()
    chk('debajo: "→ $ 700,00 por kg"', S.__el('costo-equivale').textContent === '→ $ 700,00 por kg', S.__el('costo-equivale').textContent)
    S.__setRpc('guardar_costo_insumo', () => ({ data: 'nuevo', error: null }))
    await S.guardarCosto()
    const g = S.__llamadas.filter(l => l.n === 'guardar_costo_insumo')
    chk('$ 17.500 el bulto de 25 kg viaja como 700 por kg', g.length === 1 && g[0].p.p_costo_unitario === 700, JSON.stringify(g))
  }
  {
    // La lecitina (sin stock en Nuss) también se escribe por bulto.
    const S = await enCostos(nuevo())
    S.abrirCosto('lecitina')
    await tick()
    chk('lecitina sin stock: el modal arranca por bulto de 20 kg', S.estado.costo.contenido === 20 && S.estado.costo.modo === 'bulto')
  }

  // Si el catálogo no se puede leer: los costos igual, con el bulto de antes.
  {
    const S = nuevo()
    S.__falla('insumos', { message: 'permission denied for table insumos' })
    await enCostos(S)
    chk('sin catálogo: la harina vuelve al bulto de la fábrica (50)', S.presentacionCosto(NUSS, 'harina').contenido === 50)
    chk('sin catálogo: la lecitina sin stock queda en su unidad', S.presentacionCosto(NUSS, 'lecitina').contenido === null)
    const h = S.__el('lista-costos').innerHTML
    chk('sin catálogo: la lista de costos se ve igual, sin aviso de error', /data-costo="harina"/.test(h) && !/rec-aviso/.test(h), h)
    chk('sin catálogo: se vuelve a intentar al recargar', (await S.cargarCostos(), lecturasCatalogo(S).length === 2))
  }

  // ── d) Lotes usados sin ingreso: la unidad que manda la base ───────────
  {
    const lote = (insumo_id, insumo, unidad_medida, lote, kg) => ({ insumo_id, insumo, marca: null, unidad_medida, lote, kg, masas: 1, ultima_fecha: '2026-10-21', maquinas: 'Máquina 1' })
    const S = nuevo()
    S.__setRpc('lotes_usados_sin_ingreso', (p) => ({ data: p.p_unidad_negocio_id === NUSS ? [
      lote('lec', 'Lecitina', 'lt', 'L-1', '1.5'),
      lote('caja', 'Caja', 'un', 'C-1', 3),
      lote('har', 'Harina', 'kg', 'H-1', 50),
      lote('col', 'Colorante', null, 'K-1', '0.125'),
      lote('sal', 'Sal', '  ', 'S-1', 2),
    ] : [], error: null }))
    await S.alCambiarBarra(barra(NUSS))
    await S.cargarStock()
    S.estado.sinIngresoAbierto = true
    S.pintarLotesSinIngreso()
    const h = S.__el('stock-sin-ingreso').innerHTML
    const datos = (l) => (h.split('<li class="stock-sin-ingreso__fila">').find(x => x.includes(`Lote ${l}`)) ?? '').match(/stock-sin-ingreso__datos">([^<]*)</)?.[1] ?? ''
    chk('lecitina en litros: "1,5 lt"', /^1,5 lt en 1 masa/.test(datos('L-1')), datos('L-1'))
    chk('cajas en unidades: "3 un"', /^3 un en 1 masa/.test(datos('C-1')), datos('C-1'))
    chk('harina en kg, como siempre', /^50 kg en 1 masa/.test(datos('H-1')), datos('H-1'))
    chk('sin unidad de la base: "kg" de respaldo', /^0,125 kg en 1 masa/.test(datos('K-1')), datos('K-1'))
    chk('unidad en blanco: "kg" de respaldo', /^2 kg en 1 masa/.test(datos('S-1')), datos('S-1'))
    chk('el renglón guarda la unidad que vino', S.estado.sinIngreso.grupos.find(g => g.lote === 'L-1')?.unidad_medida === 'lt')
    chk('unidadSinIngreso: la de la base, recortada; si no, kg', S.unidadSinIngreso(' lt ') === 'lt' && S.unidadSinIngreso(null) === 'kg' && S.unidadSinIngreso('') === 'kg')
  }
  {
    // Todo texto de la base, escapado: también la unidad.
    const S = nuevo()
    S.__setRpc('lotes_usados_sin_ingreso', (p) => ({ data: p.p_unidad_negocio_id === NUSS ? [
      { insumo_id: 'x', insumo: 'X', marca: null, unidad_medida: marca('unidad'), lote: 'X-1', kg: 1, masas: 1, ultima_fecha: '2026-10-21', maquinas: null },
    ] : [], error: null }))
    await S.alCambiarBarra(barra(NUSS))
    await S.cargarStock()
    S.estado.sinIngresoAbierto = true
    S.pintarLotesSinIngreso()
    chequearMarcas(chk, 'la unidad de los lotes sin ingreso', S.__el('stock-sin-ingreso').innerHTML, ['unidad'])
  }

  // ── Nada de lo que había se perdió (baseline FIJO d2d1dc1, nunca HEAD) ──
  {
    const BASE_COMMIT = 'd2d1dc1'
    let antes = null
    if (process.env.ARCHIVO_BASE) antes = fs.readFileSync(process.env.ARCHIVO_BASE, 'utf8')
    else {
      try {
        antes = require('child_process').execFileSync('git', ['show', `${BASE_COMMIT}:modulos/stock.html`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] })
      } catch { antes = null }
    }
    chk(`se pudo leer el baseline ${BASE_COMMIT}`, !!antes)
    if (antes) {
      const marcas = t => new Set([...t.matchAll(/\b(id="[a-z][\w-]*"|data-[a-z][\w-]*)/g)].map(m => m[1]))
      const ahora = marcas(FUENTE)
      const faltan = [...marcas(antes)].filter(m => !ahora.has(m))
      chk(`ningún id ni data-* de ${BASE_COMMIT} se perdió`, faltan.length === 0, faltan.join(', '))
      chk(`en ${BASE_COMMIT} los lotes sin ingreso decían siempre "kg" (lo que este cambio arregla)`, /formatearCantidadStock\(g\.kg, 'kg'\)/.test(antes))
    }
  }
}

correr().then(fin, (e) => { chk('la suite corre sin excepción', false, String(e && e.stack || e)); fin() })
