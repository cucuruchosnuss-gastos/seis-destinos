// Caja: los movimientos de una EMPRESA, salgan de la caja que salgan
// (01/10/2026).
//
// La base completa caja_movimientos.unidad_negocio_id en cada movimiento (el
// trigger trg_completar_unidad_caja: la del gasto, la de la cobranza, la de la
// cuenta si es de una empresa, si no la de la persona). Caja:
//   - unidadDeMovimiento() usa esa columna primero;
//   - con una empresa elegida en la barra, la ficha de Empresa trae TODOS los
//     movimientos de esa empresa (.eq('unidad_negocio_id')), con la caja de
//     donde salió en cada renglón, y arriba sus entradas y salidas;
//   - los saldos de cada cuenta siguen siendo los de la cuenta entera;
//   - con "Todas", como siempre (las cuentas de la Empresa);
//   - sin permiso para leer todas las cajas, como siempre y lo dice.
// EL CASO DEL PEDIDO: un gasto de Nuss pagado desde la caja personal de
// alguien de Dolce Pasta aparece al filtrar Nuss y no al filtrar Dolce.
// Se EJECUTA el código real de caja.html con un document falso.
//
//   node pruebas/test-caja-unidad-movimientos.js

const path = require('path')
const { construirCon, scriptModulo } = require('./sandbox')
const { arnes, leer } = require('./circuito-comun')
const { fuenteNumeros } = require('./numeros-comun')
const { extraerFn } = require('./extraer')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/caja.html')
const SRC = leer(ARCHIVO)
const { chk, fin } = arnes()

const STUBS = new Set([
  'verificarSesion', 'mostrarBannerVersion', 'mostrarError', 'mostrarExito', 'formatearFecha',
  'abrirDetallePersona', 'abrirDirectorio', 'abrirModalMovimiento', 'abrirModalTraspaso',
  'marcarCuentaFavorita', 'abrirModalDesactivarCuenta', 'abrirModalRenombrarCuenta', 'abrirModalEditarBancarios',
  'responderSolicitud', 'abrirModalRechazo', 'cancelarSolicitud', 'exportarMovimientosExcel',
  'crearMultiselect', 'init', 'seleccionarMedioCuentaNueva',
])
const ENTRADAS = [
  'unidadDeMovimiento', 'movimientosVisibles', 'renderizarMovimientos', 'cargarMovimientosFichaEmpresa',
  'renderizarTotalesFicha', 'entradasYSalidas', 'htmlEntradasYSalidas', 'fichaEmpresaPorUnidad', 'puedeVerMovimientosDeTodos',
  'todosMovimientosVisibles', 'renderizarTodosMovimientos', 'renderizarSaldosDetalle', 'alCambiarUnidadCaja', 'repintarPorUnidad',
  'cargarCuentas', 'renderizarFiltrosFichaEmpresa',
]

// Sigue las llamadas desde ENTRADAS y junta las funciones y constantes del
// script (mismo armado que test-caja-barra-unidad.js).
function clausura(src) {
  const nombresFn = new Set([...src.matchAll(/(?:^|\n)\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g)].map(m => m[1]))
  const imp = src.match(/import \{([^}]*)\} from '\.\.\/js\/barra-unidad\.js'/)
  if (imp) for (const n of imp[1].split(',').map(s => s.trim()).filter(Boolean)) nombresFn.add(n)
  const posConst = new Map([...src.matchAll(/\n {4}const ([A-Za-z_$][\w$]*)\s*=/g)].map(m => [m[1], m.index + 1]))
  const fns = new Set(), consts = []
  const cola = [...ENTRADAS]
  const mirar = (texto) => {
    for (const m of texto.matchAll(/[A-Za-z_$][\w$]*/g)) {
      const id = m[0]
      if (nombresFn.has(id) && !fns.has(id) && !STUBS.has(id)) cola.push(id)
      if (posConst.has(id) && !consts.includes(id)) {
        consts.push(id)
        const resto = src.slice(posConst.get(id))
        const f = resto.slice(1).search(/\n {4}(?:const|let|function|async function|\/\/)/)
        mirar(resto.slice(0, f === -1 ? 400 : f + 1))
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
  var console = { log(){}, warn(){}, error(){} }
  function nuevoEl(id) {
    return {
      id, innerHTML: '', textContent: '', value: '', className: '', hidden: false, checked: false, disabled: false,
      title: '', dataset: {}, style: {},
      querySelector: () => nuevoEl('hijo'), querySelectorAll: () => [], addEventListener(){}, focus(){},
      removeAttribute(){}, setAttribute(){}, remove(){}, closest: () => nuevoEl('cercano'),
      classList: { add(){}, remove(){}, toggle(){}, contains: () => false },
    }
  }
  var __els = new Map()
  var document = {
    getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) },
    querySelectorAll: () => [], querySelector: (s) => nuevoEl(s), addEventListener(){},
    createElement: (t) => nuevoEl('creado-' + t),
  }
  var location = { href: 'https://x.test/modulos/caja.html' }
  var window = { location: { set href(v) {}, replace(v) {} } }
  var __consultas = []
  var __datos = {}
  function __consulta(tabla) {
    const reg = { tabla, select: null, opciones: null, filtros: [] }
    const datos = (__datos[tabla] ?? []).map(x => ({ ...x }))
    __consultas.push(reg)
    const q = {}
    q.select = (s, o) => { reg.select = s; reg.opciones = o || null; return q }
    for (const k of ['eq', 'neq', 'in', 'is', 'order', 'gte', 'lte', 'limit', 'or', 'not'])
      q[k] = (...a) => { reg.filtros.push([k, ...a]); return q }
    q.maybeSingle = () => q
    q.then = (res, rej) => Promise.resolve({ data: datos, error: null, count: 0 }).then(res, rej)
    return q
  }
  var supabase = { from: (t) => __consulta(t), rpc: async () => ({ data: null, error: null }) }
  function mostrarError() {} function mostrarExito() {}
  function formatearFecha(fecha) { const [a, m, d] = fecha.split('-'); return d + '/' + m + '/' + a }
  function abrirDetallePersona() {} function abrirDirectorio() {} function abrirModalMovimiento() {} function abrirModalTraspaso() {}
  function marcarCuentaFavorita() {} function abrirModalDesactivarCuenta() {} function abrirModalRenombrarCuenta() {}
  function abrirModalEditarBancarios() {} function responderSolicitud() {} function abrirModalRechazo() {} function cancelarSolicitud() {}
  function seleccionarMedioCuentaNueva() {} function exportarMovimientosExcel() {}
  function crearMultiselect() {}
  var cuentaBancariaAbierta = null, cuentaAEditarBancariosId = null, solicitudARechazarId = null
  var cuentaADesactivarId = null, cuentaARenombrarId = null, medioCuentaNuevaSeleccionado = null
  var traspasoEmpleadoId = null, debounceBusquedaCaja = null
`
const RETORNO = 'estado, __el(id){ return document.getElementById(id) }, __consultas, __setDatos(t, d){ __datos[t] = d }'

const NUSS = 'u-nuss', DOLCE = 'u-dolce'
const MAL = '"><b data-xss="mov">'

let _fns = null
function sandbox({ elegida = null, rol = 'super_admin', tareas = ['ver_empresa'] } = {}) {
  if (!_fns) _fns = clausura(scriptModulo(ARCHIVO))
  const S = construirCon(ARCHIVO, { preludio: PRELUDIO, funciones: _fns.funciones, constantes: _fns.constantes, retorno: RETORNO })
  const E = S.estado
  E.miEmpleado = { id: 'yo', nombre: 'Yo', rol_app: rol }
  E.idEmpresa = 'emp'
  E.misTareasCaja = new Set(tareas)
  E.unidadElegida = elegida
  E.barraUnidadVisible = true
  E.maestros.unidadesNegocio = [{ id: NUSS, nombre: 'Cucuruchos Nuss' }, { id: DOLCE, nombre: 'Dolce Pasta' }]
  E.empleados = [
    { id: 'yo', nombre: 'Yo', unidad_negocio_id: NUSS },
    // Emanuel es de Dolce Pasta: con la regla vieja (la unidad del dueño de
    // una caja personal) su gasto de Nuss caería en Dolce.
    { id: 'ema', nombre: 'Emanuel Romero', unidad_negocio_id: DOLCE },
    { id: 'emp', nombre: 'Empresa' },
  ]
  E.nombresEmpleados = { yo: 'Yo', ema: 'Emanuel Romero', emp: 'Empresa' }
  const cuenta = (id, empleado_id, unidad_negocio_id, nombre) =>
    ({ id, empleado_id, nombre, medio: 'efectivo', moneda: 'ARS', favorita: false, activa: true, unidad_negocio_id })
  E.cuentasPorId = {
    'cE-n': cuenta('cE-n', 'emp', NUSS, 'Efectivo Nuss'),
    'cE-d': cuenta('cE-d', 'emp', DOLCE, 'Efectivo Dolce'),
  }
  E.saldos = [{ empleado_id: 'emp', moneda: 'ARS', saldo: 1500 }]
  E.saldosPorCuenta = [{ cuenta_id: 'cE-n', saldo: 1000 }, { cuenta_id: 'cE-d', saldo: 500 }]
  E.personaAbierta = 'emp'
  E.filtrosFichaEmpresa = { periodos: [], tipos: [], cuenta_ids: [] }
  return S
}

const mov = (id, tipo, empleado_id, cuenta_id, unidad, monto, extra = {}) =>
  ({ id, tipo, monto, moneda: 'ARS', medio_pago: 'efectivo', cuenta_id, descripcion: null, fecha: '2026-10-01', empleado_id,
    gasto_id: null, contraparte_empleado_id: null, cobranza_id: null, unidad_negocio_id: unidad, ...extra })
// EL GASTO DE NUSS PAGADO DESDE LA CAJA PERSONAL DE EMANUEL (de Dolce).
const GASTO_NUSS = mov('g-nuss', 'egreso_gasto', 'ema', 'c-ema', NUSS, 5000, { descripcion: 'Repuesto ' + MAL })
const INGRESO_NUSS = mov('i-nuss', 'ingreso', 'emp', 'cE-n', NUSS, 20000)
const TRASPASO_NUSS_SALE = mov('t1', 'egreso_traspaso', 'emp', 'cE-n', NUSS, 700)
const TRASPASO_NUSS_ENTRA = mov('t2', 'ingreso_traspaso', 'emp', 'cE-n', NUSS, 700)
const GASTO_DOLCE = mov('g-dolce', 'egreso_gasto', 'emp', 'cE-d', DOLCE, 300)
const CUENTA_EMA = { id: 'c-ema', empleado_id: 'ema', nombre: 'Efectivo Ema', medio: 'efectivo', moneda: 'ARS', activa: true, unidad_negocio_id: null }

const tick = () => new Promise(r => setTimeout(r, 0))

async function casos() {
  // ── La unidad de un movimiento la dice la base ─────────────────────────
  {
    const S = sandbox()
    chk('el gasto de Nuss desde la caja de Emanuel (de Dolce) es de Nuss', S.unidadDeMovimiento(GASTO_NUSS) === NUSS)
    chk('sin la columna, cae a la regla vieja (la unidad del dueño)', S.unidadDeMovimiento({ ...GASTO_NUSS, unidad_negocio_id: null }) === DOLCE)
  }

  // ── "Todos los movimientos": aparece en Nuss y no en Dolce ─────────────
  {
    const N = sandbox({ elegida: NUSS })
    N.estado.todosMovimientos = [GASTO_NUSS, GASTO_DOLCE].map(x => ({ ...x }))
    chk('Todos los movimientos, filtrando Nuss: aparece el gasto', N.todosMovimientosVisibles().some(m => m.id === 'g-nuss'))
    const D = sandbox({ elegida: DOLCE })
    D.estado.todosMovimientos = [GASTO_NUSS, GASTO_DOLCE].map(x => ({ ...x }))
    chk('Todos los movimientos, filtrando Dolce: NO aparece', !D.todosMovimientosVisibles().some(m => m.id === 'g-nuss') &&
      D.todosMovimientosVisibles().some(m => m.id === 'g-dolce'))
    N.renderizarTodosMovimientos()
    const total = N.__el('stat-total-todos-movimientos').innerHTML
    chk('Todos los movimientos con una empresa: sus entradas y salidas arriba', /Entradas y salidas · Cucuruchos Nuss/.test(total))
    const T = sandbox()
    T.estado.todosMovimientos = [GASTO_NUSS, GASTO_DOLCE].map(x => ({ ...x }))
    T.renderizarTodosMovimientos()
    chk('Todos los movimientos con "Todas": sin la tarjeta de entradas y salidas', !/Entradas y salidas/.test(T.__el('stat-total-todos-movimientos').innerHTML))
  }

  // ── La ficha de Empresa con Nuss: TODO lo de Nuss ──────────────────────
  {
    const S = sandbox({ elegida: NUSS })
    S.__setDatos('caja_movimientos', [GASTO_NUSS, INGRESO_NUSS, TRASPASO_NUSS_SALE, TRASPASO_NUSS_ENTRA])
    S.__setDatos('cuentas_caja', [CUENTA_EMA])
    await S.cargarMovimientosFichaEmpresa()
    const q = S.__consultas.filter(c => c.tabla === 'caja_movimientos').pop()
    chk('pide por la unidad del movimiento', q && q.filtros.some(f => f[0] === 'eq' && f[1] === 'unidad_negocio_id' && f[2] === NUSS), JSON.stringify(q && q.filtros))
    chk('y NO por las cuentas de la Empresa', q && !q.filtros.some(f => f[0] === 'in' && f[1] === 'cuenta_id'))
    chk('trae la unidad y el dueño de cada movimiento', /unidad_negocio_id, empleado_id/.test(q && q.select))
    const qc = S.__consultas.filter(c => c.tabla === 'cuentas_caja').pop()
    chk('lee las cuentas de las cajas que faltan (la de Emanuel)', qc && qc.filtros.some(f => f[0] === 'in' && f[1] === 'empleado_id' && f[2].join() === 'ema'))
    chk('queda en modo "toda la unidad"', S.estado.movimientosPorUnidad === NUSS)
    const lista = S.__el('detalle-persona-movimientos').innerHTML
    chk('aparece el gasto de Nuss pagado desde la caja de Emanuel', lista.includes('Repuesto '))
    chk('el renglón dice de qué caja salió: la persona', /movimiento__persona">Emanuel Romero</.test(lista))
    chk('…y la cuenta', lista.includes('Efectivo Ema'))
    chk('la descripción va escapada', !lista.includes(MAL) && lista.includes('&quot;&gt;&lt;b data-xss=&quot;mov&quot;&gt;'))
    const tot = S.__el('detalle-persona-totales').innerHTML
    chk('arriba: las entradas y salidas de Nuss', /Entradas y salidas · Cucuruchos Nuss/.test(tot))
    chk('entradas: el ingreso (sin el traspaso)', tot.includes('+ $ 20.000,00'), tot)
    chk('salidas: el gasto (sin el traspaso)', tot.includes('− $ 5.000,00'), tot)
    const saldos = (S.renderizarSaldosDetalle('emp'), S.__el('detalle-persona-saldos').innerHTML)
    chk('los saldos de cada cuenta son los de la cuenta entera (no se filtran por los movimientos)', saldos.includes('$ 1.000,00'), saldos.slice(0, 300))
  }
  // ── La misma ficha con Dolce: el gasto de Nuss NO aparece ──────────────
  {
    const S = sandbox({ elegida: DOLCE })
    // Aunque la consulta lo trajera, no se muestra: es de Nuss.
    S.__setDatos('caja_movimientos', [GASTO_NUSS, GASTO_DOLCE])
    S.__setDatos('cuentas_caja', [CUENTA_EMA])
    await S.cargarMovimientosFichaEmpresa()
    const q = S.__consultas.filter(c => c.tabla === 'caja_movimientos').pop()
    chk('con Dolce pide Dolce', q && q.filtros.some(f => f[0] === 'eq' && f[1] === 'unidad_negocio_id' && f[2] === DOLCE))
    const lista = S.__el('detalle-persona-movimientos').innerHTML
    chk('filtrando Dolce, el gasto de Nuss NO aparece', !lista.includes('Repuesto ') && lista.includes('Efectivo Dolce'))
    chk('y las salidas de Dolce no lo suman', S.__el('detalle-persona-totales').innerHTML.includes('− $ 300,00'))
  }
  // ── Con "Todas": como siempre ──────────────────────────────────────────
  {
    const S = sandbox()
    S.__setDatos('caja_movimientos', [INGRESO_NUSS, GASTO_DOLCE])
    await S.cargarMovimientosFichaEmpresa()
    const q = S.__consultas.filter(c => c.tabla === 'caja_movimientos').pop()
    chk('Todas: pide por las cuentas de la Empresa', q && q.filtros.some(f => f[0] === 'in' && f[1] === 'cuenta_id') &&
      !q.filtros.some(f => f[0] === 'eq' && f[1] === 'unidad_negocio_id'))
    chk('Todas: sin tarjeta de entradas y salidas y sin la persona en el renglón',
      S.__el('detalle-persona-totales').innerHTML === '' && !/movimiento__persona/.test(S.__el('detalle-persona-movimientos').innerHTML))
    chk('Todas: no queda en modo unidad', S.estado.movimientosPorUnidad === null)
  }
  // ── Sin permiso para leer todas las cajas: como siempre y lo dice ──────
  {
    const S = sandbox({ elegida: NUSS, rol: 'usuario', tareas: ['ver_empresa'] })
    S.__setDatos('caja_movimientos', [INGRESO_NUSS])
    await S.cargarMovimientosFichaEmpresa()
    const q = S.__consultas.filter(c => c.tabla === 'caja_movimientos').pop()
    chk('sin ver_listado / movimientos_todos: solo las cuentas de la Empresa', q && q.filtros.some(f => f[0] === 'in' && f[1] === 'cuenta_id'))
    const nota = S.__el('detalle-persona-totales').innerHTML
    chk('…y lo dice, a la vista', /se ven solo los movimientos de las cuentas de la Empresa de Cucuruchos Nuss/.test(nota) && !/\shidden/.test(nota), nota)
    const C = sandbox({ elegida: NUSS, rol: 'usuario', tareas: ['ver_empresa', 'movimientos_todos'] })
    C.__setDatos('caja_movimientos', [INGRESO_NUSS])
    await C.cargarMovimientosFichaEmpresa()
    chk('con movimientos_todos: toda la unidad', C.estado.movimientosPorUnidad === NUSS)
    chk('la regla es la de la policy (ver_listado, retiros_todos o movimientos_todos)',
      /tieneTarea\('ver_listado'\) \|\| tieneTarea\('retiros_todos'\) \|\| tieneTarea\('movimientos_todos'\)/.test(extraerFn(SRC, 'puedeVerMovimientosDeTodos')))
  }
  // ── Cambiar la empresa de arriba con la ficha abierta: vuelve a pedir ──
  {
    const S = sandbox({ elegida: NUSS })
    S.__setDatos('caja_movimientos', [INGRESO_NUSS])
    await S.cargarMovimientosFichaEmpresa()
    const antes = S.__consultas.filter(c => c.tabla === 'caja_movimientos').length
    S.alCambiarUnidadCaja({ elegida: DOLCE, mostrar: true })
    await tick(); await tick()
    const qs = S.__consultas.filter(c => c.tabla === 'caja_movimientos')
    chk('cambiar a Dolce vuelve a pedir, por Dolce', qs.length === antes + 1 && qs.at(-1).filtros.some(f => f[0] === 'eq' && f[2] === DOLCE))
    S.alCambiarUnidadCaja({ elegida: null, mostrar: true })
    await tick(); await tick()
    chk('volver a Todas vuelve a pedir por las cuentas', S.__consultas.filter(c => c.tabla === 'caja_movimientos').at(-1).filtros.some(f => f[0] === 'in' && f[1] === 'cuenta_id'))
  }
  // ── Las entradas y salidas ─────────────────────────────────────────────
  {
    const S = sandbox()
    const r = S.entradasYSalidas([
      mov('a', 'ingreso', 'x', 'c', NUSS, 100), mov('b', 'ingreso_externo', 'x', 'c', NUSS, 50), mov('c', 'ingreso_reversion_gasto', 'x', 'c', NUSS, 5),
      mov('d', 'egreso_retiro', 'x', 'c', NUSS, 30), mov('e', 'egreso_ajuste', 'x', 'c', NUSS, 2), mov('f', 'ingreso_ajuste', 'x', 'c', NUSS, 1),
      mov('g', 'egreso_traspaso', 'x', 'c', NUSS, 999), mov('h', 'ingreso_traspaso', 'x', 'c', NUSS, 999),
      { ...mov('i', 'ingreso', 'x', 'c', NUSS, 7), moneda: 'USD' }, mov('j', 'ingreso', 'x', 'c', NUSS, 'no'),
    ])
    chk('entradas: todo lo que empieza con "ingreso", sin el traspaso', r.ARS.entradas === 156, JSON.stringify(r))
    chk('salidas: todo lo que empieza con "egreso", sin el traspaso', r.ARS.salidas === 32, JSON.stringify(r))
    chk('cada moneda por separado', r.USD && r.USD.entradas === 7 && r.USD.salidas === 0)
    chk('sin movimientos: lo dice, no inventa un cero', /No hay movimientos con estos filtros/.test(S.htmlEntradasYSalidas([], 'Nuss')))
    chk('el nombre de la unidad va escapado', !S.htmlEntradasYSalidas([], MAL).includes(MAL))
  }
  // ── El fuente ──────────────────────────────────────────────────────────
  {
    chk('unidadDeMovimiento: la columna de la base primero', /if \(m\?\.unidad_negocio_id\) return m\.unidad_negocio_id/.test(extraerFn(SRC, 'unidadDeMovimiento')))
    chk('los cuatro selects de movimientos traen unidad_negocio_id',
      (SRC.match(/from\('caja_movimientos'\)\s*\.select\([^)]*unidad_negocio_id/g) || []).length === 4, (SRC.match(/from\('caja_movimientos'\)\s*\.select\([^)]*unidad_negocio_id/g) || []).length)
    chk('el lugar de las entradas y salidas está en la ficha', /<div id="detalle-persona-totales"><\/div>/.test(SRC))
  }
}

casos().then(fin).catch(e => { chk('sin excepciones', false, e && e.stack || e); fin() })
