// COSTOS DE INSUMOS Y STOCK VALORIZADO (09/10/2026) — modulos/stock.html.
//
// Exige:
//  - sin stock:ver_costos en la fábrica no aparece NADA (ni el total, ni el
//    valor de cada fila, ni la pantalla de costos) y no se llama a NINGUNA RPC
//    de costos; la regla es la de tiene_tarea_alcance() (todas / unidades /
//    super_admin con bypass; un alcance null no da ninguna);
//  - el total valorizado suma EN CENTAVOS solo los insumos con costo, y cuenta
//    los sin costo ("N insumos sin costo"); un ausente es "—", nunca "$ 0";
//  - con "Todas" y varias fábricas con costos, se pide la fábrica;
//  - la lista de costos: los sin costo arriba ("Sin costo"), la variación ↑
//    en bordó y ↓ en verde;
//  - cargar un costo: 1 bulto de 50 kg a $ 50.000 viaja como 1.000 por kg a
//    guardar_costo_insumo; por unidad viaja lo escrito; cambiar de modo vacía
//    el campo; sin cargar_costos no hay formulario; un doble toque manda UNA
//    vez; el error de la base va tal cual, pegado al botón;
//  - anular: solo después de la confirmación propia (nunca confirm());
//  - todo texto de la base escapado.
//
// EJECUTA las funciones reales (juntadas por clausura, como
// test-stock-dias-habiles.js) con un document y un supabase falsos.
//
//   node pruebas/test-stock-costos.js
// Archivo bajo prueba: ARCHIVO_TEST, o modulos/stock.html.

const path = require('path')
const { construirCon, scriptModulo } = require('./sandbox')
const { FUNCIONES_CANTIDADES, CONSTANTES_CANTIDADES, FUNCIONES_CARGA } = require('./cantidades-comun')
const { arnes, leer } = require('./circuito-comun')
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
  'cargarValorizado', 'pintarValorizado', 'resumenValorizado', 'puedeVerCostosAlgo', 'puedeCostosEn',
  'abrirCostos', 'cargarCostos', 'renderizarCostos', 'abrirCosto', 'cerrarModalCosto', 'cambiarModoCosto',
  'guardarCosto', 'anularCosto', 'pintarModalCosto', 'pintarHistorialCosto', 'costoUnitarioDe', 'htmlVariacion',
  ...FUNCIONES_CANTIDADES, 'unidadCorta']

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
  var __datos = {}
  var __rpc = {}
  var __llamadas = []
  var __consultas = []
  function __consulta(tabla) {
    const q = { filtros: [] }
    __consultas.push(tabla)
    for (const k of ['select', 'neq', 'is', 'order', 'gte', 'lte', 'limit', 'range', 'not', 'or']) q[k] = () => q
    // .in() SÍ filtra: el nombre de quien anuló tiene que estar en lo que se pide.
    q.in = (c, v) => { q.filtros.push(['in', c, v]); return q }
    q.eq = (c, v) => { q.filtros.push([c, v]); return q }
    q.maybeSingle = () => q
    q.then = (res, rej) => Promise.resolve({ data: (__datos[tabla] ?? [])
      .filter(f => q.filtros.every(([op, c, v]) => op !== 'in' || v.includes(f[c])))
      .map(f => ({ ...f })), error: null }).then(res, rej)
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
const RETORNO = 'estado, __el(id){ return document.getElementById(id) }, __setDatos(t, d){ __datos[t] = d }, __setRpc(n, r){ __rpc[n] = r }, __llamadas, __exitos'

const NUSS = 'u-nuss', DOLCE = 'u-dolce', ROBOT = 'u-robot'
const BARRA = [{ id: NUSS, nombre: 'Cucuruchos Nuss', prefijo: 'N' }, { id: DOLCE, nombre: 'Dolce Pasta', prefijo: 'D' }]

function fila(unidad, insumo, nombre, cantidad, extra = {}) {
  return {
    unidad_negocio_id: unidad, insumo_id: insumo, insumo_nombre: nombre, marca: null, unidad_medida: 'kg',
    tipo: 'materia_prima', categoria: 'Harinas', aclaracion: null, cantidad_total: cantidad,
    lotes_distintos: 1, presentaciones: 0, contenido_unico: null, kilos_sueltos: 0, vista_preferida: 'base', ...extra,
  }
}
const STOCK = [
  fila(NUSS, 'harina', 'Harina 000', 5000, { presentaciones: 1, contenido_unico: '50', vista_preferida: 'bulto' }),
  fila(NUSS, 'azucar', 'Azúcar', 100.5),
  fila(NUSS, 'bolsa', 'Bolsa 100x80', 1491, { tipo: 'insumo', categoria: 'Bolsas', unidad_medida: 'un' }),
  fila(DOLCE, 'harina', 'Harina 000', 1000),
]
// Como devuelve la base: los numeric vienen como TEXTO.
const VALORIZADO_NUSS = [
  { insumo_id: 'harina', insumo: 'Harina 000', marca: null, categoria: 'Harinas', unidad_medida: 'kg', cantidad: '5000', costo_unitario: '1000.0000', costo_desde: '2026-10-01', valor: '5000000.10' },
  { insumo_id: 'azucar', insumo: 'Azúcar', marca: null, categoria: 'Harinas', unidad_medida: 'kg', cantidad: '100.5', costo_unitario: '2', costo_desde: '2026-10-01', valor: '201.20' },
  { insumo_id: 'bolsa', insumo: 'Bolsa 100x80', marca: null, categoria: 'Bolsas', unidad_medida: 'un', cantidad: '1491', costo_unitario: null, costo_desde: null, valor: null },
]
const COSTOS_NUSS = [
  { insumo_id: 'harina', insumo: 'Harina 000', marca: 'Wali', categoria: 'Harinas', unidad_medida: 'kg', costo_unitario: '1000.0000', vigente_desde: '2026-10-01', cargado_por: 'Facundo', costo_anterior: '900', variacion_pct: '11.1' },
  { insumo_id: 'azucar', insumo: 'Azúcar', marca: null, categoria: 'Harinas', unidad_medida: 'kg', costo_unitario: '2', vigente_desde: '2026-09-01', cargado_por: 'Pablo', costo_anterior: '2.5', variacion_pct: '-20' },
  { insumo_id: 'bolsa', insumo: 'Bolsa 100x80', marca: null, categoria: 'Bolsas', unidad_medida: 'un', costo_unitario: null, vigente_desde: null, cargado_por: null, costo_anterior: null, variacion_pct: null },
]

const SRC = scriptModulo(ARCHIVO)
let MOLDE = null
try { MOLDE = clausura(SRC) } catch (e) { chk('la clausura de funciones se arma', false, String(e && e.stack || e)) }

// tareas: Map 'stock:x' -> alcance (o null).
function nuevo({ tareas = new Map([['stock:ver', { todas: true }]]), rol = 'usuario' } = {}) {
  const S = construirCon(ARCHIVO, { preludio: PRELUDIO, funciones: MOLDE.funciones, constantes: [...CONSTANTES_CANTIDADES, ...MOLDE.constantes], retorno: RETORNO })
  const E = S.estado
  E.miRolApp = rol
  E.misTareas = new Set(tareas.keys())
  E.alcancesTareas = tareas
  E.fabrica = { ok: true, unidades: new Set([ROBOT]), personas: new Set(), soyDePrueba: false }
  S.__setDatos('v_mis_unidades_stock', BARRA.map(({ id, nombre }) => ({ id, nombre })))
  S.__setDatos('v_stock_insumos', STOCK)
  S.__setDatos('v_stock_cobertura', [])
  S.__setRpc('stock_valorizado', (p) => ({ data: p.p_unidad_negocio_id === NUSS ? VALORIZADO_NUSS : [], error: null }))
  S.__setRpc('costos_insumos', () => ({ data: COSTOS_NUSS, error: null }))
  return S
}
const barra = (elegida, unidades = BARRA) => ({ elegida, unidades, mostrar: true })
const lista = S => S.__el('lista-stock').innerHTML
const total = S => S.__el('stock-valorizado')
const RPCS_COSTOS = ['costos_insumos', 'stock_valorizado', 'guardar_costo_insumo', 'anular_costo_insumo']
const llamadasCostos = S => S.__llamadas.filter(l => RPCS_COSTOS.includes(l.n))
const verCostosNuss = () => new Map([['stock:ver', { todas: true }], ['stock:ver_costos', { unidades: [NUSS] }], ['stock:cargar_costos', { unidades: [NUSS] }]])
const tick = () => new Promise(r => setTimeout(r, 0))

async function correr() {
  if (!MOLDE) return

  // ── 1. Sin ver_costos: nada, y ninguna RPC de costos ─────────────────────
  {
    const S = nuevo()
    await S.alCambiarBarra(barra(NUSS))
    await S.cargarStock()
    chk('sin permiso: ninguna RPC de costos', llamadasCostos(S).length === 0, JSON.stringify(S.__llamadas))
    chk('sin permiso: el total no se ve', total(S).hidden === true && total(S).textContent === '')
    chk('sin permiso: ninguna fila dice Valor ni sin costo', !/valor-stock/.test(lista(S)))
    chk('sin permiso: el botón Costos no corresponde', S.puedeVerCostosAlgo() === false)
    await S.cargarCostos()
    chk('sin permiso: la pantalla de costos tampoco consulta', llamadasCostos(S).length === 0)
    await S.alCambiarBarra(barra(null))
    chk('sin permiso con Todas: tampoco pide la fábrica', total(S).hidden === true)
  }

  // Un alcance null no da ninguna fábrica (como tiene_tarea_alcance).
  {
    const S = nuevo({ tareas: new Map([['stock:ver', { todas: true }], ['stock:ver_costos', null]]) })
    await S.alCambiarBarra(barra(NUSS))
    await S.cargarStock()
    chk('alcance null: ninguna RPC de costos', llamadasCostos(S).length === 0)
    chk('alcance null: puedeCostosEn da false', S.puedeCostosEn('ver_costos', NUSS) === false)
  }
  {
    const S = nuevo({ tareas: new Map([['stock:ver', { todas: true }]]), rol: 'super_admin' })
    chk('super_admin: bypass como la base', S.puedeCostosEn('ver_costos', NUSS) === true && S.puedeCostosEn('cargar_costos', DOLCE) === true)
    chk('sin unidad: nunca', S.puedeCostosEn('ver_costos', '') === false)
  }

  // ── 2. Con ver_costos en Nuss: el total y el valor de cada fila ──────────
  {
    const S = nuevo({ tareas: verCostosNuss() })
    await S.alCambiarBarra(barra(NUSS))
    await S.cargarStock()
    const v = S.__llamadas.filter(l => l.n === 'stock_valorizado')
    chk('valorizado: una llamada con la fábrica de la barra', v.length >= 1 && v.every(l => l.p.p_unidad_negocio_id === NUSS), JSON.stringify(v))
    chk('el total suma en centavos solo los con costo: 5.000.000,10 + 201,20', total(S).textContent === 'Stock valorizado: $ 5.000.201,30 · 1 insumo sin costo', total(S).textContent)
    chk('el total se ve', total(S).hidden === false)
    const h = lista(S)
    chk('la harina dice su valor', /class="valor-stock">Valor \$ 5\.000\.000,10</.test(h), h)
    chk('la bolsa dice "sin costo"', /valor-stock valor-stock--sin">sin costo</.test(h))
    chk('ningún "$ 0"', !/\$ 0[^.,\d]/.test(h) && !/\$ 0,00/.test(total(S).textContent))

    // Dolce: sin permiso ahí, nada (y no se llama con Dolce).
    const antes = S.__llamadas.length
    await S.alCambiarBarra(barra(DOLCE))
    await tick()
    chk('Dolce: no se llama al valorizado', S.__llamadas.slice(antes).every(l => !RPCS_COSTOS.includes(l.n)))
    chk('Dolce: el total no se ve', total(S).hidden === true)
    chk('Dolce: ninguna fila con valor', !/valor-stock/.test(lista(S)))
  }
  // resumen: sin ninguno con costo, "—".
  {
    const S = nuevo({ tareas: verCostosNuss() })
    const r = S.resumenValorizado([{ costo_unitario: null, valor: null }, { costo_unitario: null, valor: null }])
    chk('ninguno con costo: total null (se muestra "—")', r.total === null && r.sinCosto === 2)
    chk('suma en centavos: 0,1 + 0,2 = 0,3 exacto', S.resumenValorizado([{ costo_unitario: '1', valor: '0.1' }, { costo_unitario: '1', valor: '0.2' }]).total === 0.3)
    // 4,35 * 100 en flotante es 434,99999999999994: sin redondear a centavos no da 4,45.
    chk('suma en centavos: 4,35 + 0,10 = 4,45 exacto', S.resumenValorizado([{ costo_unitario: '1', valor: '4.35' }, { costo_unitario: '1', valor: '0.1' }]).total === 4.45)
    chk('un valor ilegible no suma', S.resumenValorizado([{ costo_unitario: '1', valor: 'abc' }, { costo_unitario: '1', valor: '5' }]).total === 5)
  }
  // Ninguno con costo: "—", nunca "$ 0".
  {
    const S = nuevo({ tareas: verCostosNuss() })
    S.__setRpc('stock_valorizado', () => ({ data: VALORIZADO_NUSS.map(f => ({ ...f, costo_unitario: null, valor: null })), error: null }))
    await S.alCambiarBarra(barra(NUSS))
    await S.cargarStock()
    chk('ninguno con costo: "—" y no "$ 0"', total(S).textContent === 'Stock valorizado: — · 3 insumos sin costo', total(S).textContent)
  }
  // Con Todas y dos fábricas con costos: se pide la fábrica, sin llamar.
  {
    const tareas = new Map([['stock:ver', { todas: true }], ['stock:ver_costos', { todas: true }]])
    const S = nuevo({ tareas })
    await S.alCambiarBarra(barra(null))
    await S.cargarStock()
    chk('Todas con dos fábricas: no se llama', S.__llamadas.filter(l => l.n === 'stock_valorizado').length === 0)
    chk('Todas con dos fábricas: pide elegir la fábrica', total(S).hidden === false && /Elegí una fábrica arriba/.test(total(S).textContent), total(S).textContent)
  }
  // Error de la base: se dice, no se inventa un total.
  {
    const S = nuevo({ tareas: verCostosNuss() })
    S.__setRpc('stock_valorizado', () => ({ data: null, error: { message: 'No tenés permiso para ver el stock valorizado.' } }))
    await S.alCambiarBarra(barra(NUSS))
    await S.cargarStock()
    chk('error: lo dice tal cual', /no se pudo calcular \(No tenés permiso para ver el stock valorizado\.\)/.test(total(S).textContent), total(S).textContent)
  }

  // ── 3. La lista de costos ─────────────────────────────────────────────────
  {
    const S = nuevo({ tareas: verCostosNuss() })
    await S.alCambiarBarra(barra(NUSS))
    await S.cargarStock()
    await S.cargarCostos()
    const c = S.__llamadas.filter(l => l.n === 'costos_insumos')
    chk('costos_insumos con la fábrica', c.length === 1 && c[0].p.p_unidad_negocio_id === NUSS)
    const h = S.__el('lista-costos').innerHTML
    chk('los sin costo van arriba', h.indexOf('data-costo="bolsa"') !== -1 && h.indexOf('data-costo="bolsa"') < h.indexOf('data-costo="harina"'))
    chk('dice "Sin costo"', /chip-sin-costo">Sin costo</.test(h))
    chk('cuenta los sin costo', /1 insumo sin costo/.test(h))
    chk('el costo por kg con 4 decimales', /\$ 1\.000,00 por kg/.test(h), h)
    chk('desde y quién', /desde 01\/10\/2026 · cargó Facundo/.test(h))
    chk('subió: ↑ en bordó', /variacion-costo--sube[^>]*>↑ 11,1 %/.test(h))
    chk('bajó: ↓ en verde', /variacion-costo--baja[^>]*>↓ 20 %/.test(h))
  }
  // Con Todas y dos fábricas: chips, y no se consulta hasta elegir.
  {
    const S = nuevo({ tareas: new Map([['stock:ver', { todas: true }], ['stock:ver_costos', { todas: true }]]) })
    await S.alCambiarBarra(barra(null))
    await S.cargarCostos()
    chk('Todas: no consulta sin elegir', S.__llamadas.filter(l => l.n === 'costos_insumos').length === 0)
    chk('Todas: pide la fábrica', /Elegí de qué fábrica/.test(S.__el('costos-aviso-unidad').textContent))
    chk('Todas: chips de fábrica', /data-unidad-costos="u-nuss"/.test(S.__el('chips-unidad-costos').innerHTML))
    S.estado.costosUnidad = DOLCE
    await S.cargarCostos()
    const c = S.__llamadas.filter(l => l.n === 'costos_insumos')
    chk('Todas: con la elegida, consulta esa', c.length === 1 && c[0].p.p_unidad_negocio_id === DOLCE)
  }
  // La fábrica de pruebas no se ofrece.
  {
    const S = nuevo({ tareas: new Map([['stock:ver', { todas: true }], ['stock:ver_costos', { todas: true }]]) })
    await S.alCambiarBarra(barra(null, [...BARRA, { id: ROBOT, nombre: 'Pruebas (robot)' }]))
    await S.cargarCostos()
    const chips = S.__el('chips-unidad-costos').innerHTML
    chk('la fábrica de pruebas no se ofrece', /u-nuss/.test(chips) && !/u-robot/.test(chips), chips)
  }

  // ── 4. Cargar un costo ──────────────────────────────────────────────────
  async function conModal(tareas = verCostosNuss(), insumo = 'harina') {
    const S = nuevo({ tareas })
    await S.alCambiarBarra(barra(NUSS))
    await S.cargarStock()
    await S.cargarCostos()
    S.abrirCosto(insumo)
    await tick()
    return S
  }
  {
    const S = await conModal()
    const m = S.estado.costo
    chk('la harina tiene bulto de 50 kg (contenido_unico)', m.contenido === 50)
    chk('con vista "bulto", arranca por bulto', m.modo === 'bulto')
    chk('rótulo: "Precio por bulto de 50 kg"', S.__el('costo-precio-rotulo').textContent === 'Precio por bulto de 50 kg', S.__el('costo-precio-rotulo').textContent)
    chk('la fecha arranca en hoy', /^\d{4}-\d{2}-\d{2}$/.test(S.__el('costo-desde').value))
    chk('hay formulario', S.__el('costo-carga').hidden === false)
    S.__el('costo-precio').value = '50.000'
    S.__setRpc('guardar_costo_insumo', () => ({ data: 'nuevo-id', error: null }))
    S.pintarModalCosto()
    chk('debajo: "→ $ 1.000,00 por kg"', S.__el('costo-equivale').textContent === '→ $ 1.000,00 por kg', S.__el('costo-equivale').textContent)
    // Doble toque: una sola llamada.
    const a = S.guardarCosto(), b = S.guardarCosto()
    await Promise.all([a, b])
    const g = S.__llamadas.filter(l => l.n === 'guardar_costo_insumo')
    chk('doble toque: UNA llamada', g.length === 1, g.length)
    chk('1 bulto de 50 kg a $ 50.000 viaja como 1.000 por kg', g[0]?.p.p_costo_unitario === 1000, JSON.stringify(g[0]))
    chk('con la fábrica y el insumo', g[0]?.p.p_unidad_negocio_id === NUSS && g[0]?.p.p_insumo_id === 'harina')
    chk('con la fecha y la nota (vacía = null)', /^\d{4}-\d{2}-\d{2}$/.test(g[0]?.p.p_vigente_desde) && g[0]?.p.p_nota === null)
    chk('después de guardar relee los costos', S.__llamadas.filter(l => l.n === 'costos_insumos').length === 2)
    chk('avisa que se guardó', S.__exitos.includes('Costo guardado.'))
  }
  // Por unidad: viaja lo escrito; cambiar de modo vacía el campo.
  {
    const S = await conModal()
    S.cambiarModoCosto('unidad')
    chk('cambiar de modo', S.estado.costo.modo === 'unidad' && S.__el('costo-precio-rotulo').textContent === 'Precio por kg')
    S.__el('costo-precio').value = '1.234,5678'
    S.cambiarModoCosto('bulto')
    chk('cambiar de modo VACÍA el campo', S.__el('costo-precio').value === '')
    S.cambiarModoCosto('unidad')
    S.__el('costo-precio').value = '1.234,5678'
    S.pintarModalCosto()
    chk('por kg, con bulto conocido, dice cuánto es el bulto', /el bulto de 50 kg/.test(S.__el('costo-equivale').textContent), S.__el('costo-equivale').textContent)
    S.__setRpc('guardar_costo_insumo', () => ({ data: 'x', error: null }))
    await S.guardarCosto()
    const g = S.__llamadas.filter(l => l.n === 'guardar_costo_insumo')
    chk('por kg viaja lo escrito con 4 decimales', g[0]?.p.p_costo_unitario === 1234.5678, JSON.stringify(g[0]))
  }
  // Sin presentación: solo por unidad.
  {
    const S = await conModal(verCostosNuss(), 'azucar')
    chk('sin bulto conocido: por unidad, sin elegir modo', S.estado.costo.modo === 'unidad' && S.__el('costo-modos').hidden === true)
    S.cambiarModoCosto('bulto')
    chk('no se puede pasar a bulto sin presentación', S.estado.costo.modo === 'unidad')
  }
  // Vacío o fecha muy adelante: no se llama.
  {
    const S = await conModal()
    await S.guardarCosto()
    chk('vacío: no llama y lo dice', S.__llamadas.filter(l => l.n === 'guardar_costo_insumo').length === 0 && S.__el('costo-error').hidden === false, S.__el('costo-error').textContent)
    S.__el('costo-precio').value = '100'
    S.__el('costo-desde').value = '2099-01-01'
    await S.guardarCosto()
    chk('fecha muy adelante: no llama', S.__llamadas.filter(l => l.n === 'guardar_costo_insumo').length === 0 && /tan adelante/.test(S.__el('costo-error').textContent))
  }
  // El error de la base, tal cual y pegado; el botón vuelve a andar.
  {
    const S = await conModal()
    S.__el('costo-precio').value = '100'
    S.__setRpc('guardar_costo_insumo', () => ({ data: null, error: { message: 'No tenés permiso para cargar costos en esta fábrica.' } }))
    await S.guardarCosto()
    chk('el error de la base tal cual', S.__el('costo-error').textContent === 'No tenés permiso para cargar costos en esta fábrica.' && S.__el('costo-error').hidden === false)
    chk('el botón vuelve a andar', S.__el('btn-guardar-costo').disabled === false && S.estado.costo.enviando === false)
  }
  // Sin cargar_costos: se ve pero no se carga.
  {
    const S = await conModal(new Map([['stock:ver', { todas: true }], ['stock:ver_costos', { unidades: [NUSS] }]]))
    chk('sin cargar_costos: no hay formulario', S.__el('costo-carga').hidden === true)
    S.__el('costo-precio').value = '100'
    // guardarCosto igual valida en la base; acá lo que importa es la pantalla.
  }

  // ── 5. El historial y anular ─────────────────────────────────────────────
  {
    const S = nuevo({ tareas: verCostosNuss() })
    S.__setDatos('insumo_costos', [
      { id: 'c2', costo_unitario: '1000', vigente_desde: '2026-10-01', nota: 'Factura 123', cargado_por: 'e1', cargado_en: '2026-10-01T10:00:00Z', anulado: false, origen: 'manual' },
      // Anulado el 01/09 a las 23:30 de Argentina (en UTC ya es el 02/09).
      { id: 'c1', costo_unitario: '900', vigente_desde: '2026-09-01', nota: null, cargado_por: 'e1', cargado_en: '2026-09-01T10:00:00Z', anulado: true, anulado_por: 'e2', anulado_en: '2026-09-02T02:30:00Z', origen: 'manual' },
    ])
    S.__setDatos('v_empleados_publico', [{ id: 'e1', nombre: 'Facundo' }, { id: 'e2', nombre: 'Pablo' }])
    await S.alCambiarBarra(barra(NUSS))
    await S.cargarStock()
    await S.cargarCostos()
    S.abrirCosto('harina')
    await tick(); await tick()
    const h = S.__el('costo-historial').innerHTML
    chk('el historial con quién (por v_empleados_publico)', /cargó Facundo/.test(h), h)
    chk('la nota', /Factura 123/.test(h))
    chk('el anulado tachado y sin botón', /costo-hist--anulado/.test(h) && (h.match(/data-costo-anular="/g) || []).length === 1)
    chk('el anulado dice quién y cuándo (día de Argentina)', /costo-hist__anulado">Anulado por Pablo el 01\/09\/2026</.test(h), h)
    chk('sin datos de quién anuló: "Anulado" a secas, sin inventar', S.textoAnuladoCosto({ anulado: true }, new Map()) === 'Anulado')
    // Anular sin confirmar: no llama.
    await S.anularCosto('c2')
    chk('sin confirmar: no llama', S.__llamadas.filter(l => l.n === 'anular_costo_insumo').length === 0)
    S.estado.costo.anulando = 'c2'
    S.pintarHistorialCosto()
    chk('la confirmación propia en la fila', /¿Anular el costo de \$ 1\.000,00 por kg desde el 01\/10\/2026\?/.test(S.__el('costo-historial').innerHTML))
    S.__setRpc('anular_costo_insumo', () => ({ data: null, error: null }))
    const a = S.anularCosto('c2'), b = S.anularCosto('c2')
    await Promise.all([a, b])
    const an = S.__llamadas.filter(l => l.n === 'anular_costo_insumo')
    chk('confirmado: una sola llamada con el id', an.length === 1 && an[0].p.p_id === 'c2')
  }
  {
    const S = await conModal()
    S.estado.costo.historial = [{ id: 'c9', costo_unitario: '5', vigente_desde: '2026-10-01', cargado_por: null, anulado: false }]
    S.estado.costo.anulando = 'c9'
    S.__setRpc('anular_costo_insumo', () => ({ data: null, error: { message: 'No tenés permiso.' } }))
    await S.anularCosto('c9')
    chk('anular con error: el error de la base, en la confirmación', /No tenés permiso\./.test(S.__el('costo-historial').innerHTML))
  }

  // ── 6. Escapado ───────────────────────────────────────────────────────────
  {
    const malo = '"><img src=x onerror=alert(1)>'
    const S = nuevo({ tareas: verCostosNuss() })
    S.__setRpc('costos_insumos', () => ({ data: [
      { ...COSTOS_NUSS[0], insumo: malo, marca: malo, cargado_por: malo, variacion_pct: '5', unidad_medida: '<i>kg' },
      { ...COSTOS_NUSS[2], insumo_id: 'z"><u>', insumo: 'Otro' },
    ], error: null }))
    S.__setDatos('insumo_costos', [
      { id: 'x"><b', costo_unitario: '1', vigente_desde: '2026-10-01', nota: malo, cargado_por: 'e1', anulado: false },
      { id: 'y"><s>', costo_unitario: '2', vigente_desde: '2026-09-01', nota: null, cargado_por: 'e1', anulado: false },
      { id: 'w', costo_unitario: '3', vigente_desde: '2026-08-01', nota: null, cargado_por: 'e1', anulado: true, anulado_por: 'e1', anulado_en: '2026-08-02T12:00:00Z' },
    ])
    S.__setDatos('v_empleados_publico', [{ id: 'e1', nombre: malo }])
    await S.alCambiarBarra(barra(NUSS))
    await S.cargarStock()
    await S.cargarCostos()
    S.abrirCosto('harina')
    await tick(); await tick()
    S.estado.costo.anulando = 'x"><b'
    S.estado.costo.errorAnular = malo
    S.pintarHistorialCosto()
    const todo = S.__el('lista-costos').innerHTML + S.__el('costo-historial').innerHTML
    chk('ningún <img crudo', !/<img src=x/.test(todo), todo)
    chk('el nombre escapado', /&quot;&gt;&lt;img src=x onerror=alert\(1\)&gt;/.test(todo))
    chk('el id del costo escapado en el atributo', !/data-costo-anular-si="x"><b"/.test(todo) && /data-costo-anular-si="x&quot;&gt;&lt;b"/.test(todo))
    chk('el id del otro costo escapado en Anular', !/<s>/.test(todo) && /data-costo-anular="y&quot;&gt;&lt;s&gt;"/.test(todo), todo)
    chk('el id del insumo escapado', !/<u>/.test(todo) && /data-costo="z&quot;&gt;&lt;u&gt;"/.test(todo))
    chk('la unidad de medida escapada', !/<i>/.test(todo) && /&lt;i&gt;kg/.test(todo))
    S.estado.costo.errorHistorial = malo
    S.pintarHistorialCosto()
    const S3 = nuevo({ tareas: new Map([['stock:ver', { todas: true }], ['stock:ver_costos', { todas: true }]]) })
    await S3.alCambiarBarra(barra(null, [{ id: 'u"><q>', nombre: malo }, { id: DOLCE, nombre: 'Dolce' }]))
    await S3.cargarCostos()
    const chipsM = S3.__el('chips-unidad-costos').innerHTML
    chk('el nombre de la fábrica en los chips escapado', !/<img src=x/.test(chipsM) && /&lt;img/.test(chipsM))
    chk('el id de la fábrica en los chips escapado', !/<q>/.test(chipsM) && /u&quot;&gt;&lt;q&gt;/.test(chipsM), chipsM)
    chk('el error del historial escapado', !/<img src=x/.test(S.__el('costo-historial').innerHTML) && /&lt;img/.test(S.__el('costo-historial').innerHTML))
    const S2 = nuevo({ tareas: verCostosNuss() })
    S2.__setRpc('costos_insumos', () => ({ data: null, error: { message: malo } }))
    await S2.alCambiarBarra(barra(NUSS))
    await S2.cargarCostos()
    chk('el error de la base escapado', !/<img src=x/.test(S2.__el('lista-costos').innerHTML) && /&lt;img/.test(S2.__el('lista-costos').innerHTML))
  }

  // ── 7. El cableado ──────────────────────────────────────────────────────
  chk('el botón Costos depende de ver_costos en alguna fábrica', /getElementById\('btn-ver-costos'\)\.hidden = !\(verStock && puedeVerCostosAlgo\(\)\)/.test(SRC))
  chk('el botón Costos nace escondido', /id="btn-ver-costos" hidden>Costos</.test(FUENTE))
  chk('el total nace escondido', /<div class="stock-valorizado" id="stock-valorizado" hidden><\/div>/.test(FUENTE))
  chk('el historial trae quién anuló y cuándo', /select\('id, costo_unitario, vigente_desde, nota, cargado_por, cargado_en, anulado, anulado_por, anulado_en, origen'\)/.test(SRC))
  chk('las tareas se leen con su alcance', /\.select\('modulo, tarea, alcance'\)/.test(SRC) && /estado\.alcancesTareas = new Map/.test(SRC))
  chk('costos es un drill-down de Stock', /costos: 'stock' \}/.test(SRC))
  const bloque = SRC.slice(SRC.indexOf('// COSTOS DE INSUMOS Y STOCK VALORIZADO'), SRC.indexOf('// PESTAÑAS'))
  chk('el bloque de costos no usa confirm()', bloque.length > 1000 && !/\bconfirm\(/.test(bloque))
  chk('los nombres del historial por v_empleados_publico, nunca por un embed', /from\('v_empleados_publico'\)/.test(bloque) && !/empleados\(/.test(bloque))
}

correr().then(() => fin(), e => { chk('la suite corre sin excepción', false, String(e && e.stack || e)); fin() })
