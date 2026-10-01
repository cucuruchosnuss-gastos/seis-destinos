// LA BARRA DE UNIDAD DE NEGOCIO en Caja (28/09/2026).
//
// La barra de arriba (js/barra-unidad.js) elige UNA unidad (o Todas) y Caja
// muestra solo lo de esa unidad. Las reglas de Caja:
//   - Una PERSONA es de su unidad; la Empresa no es de ninguna, sus CUENTAS sí.
//   - Una cuenta es de su unidad propia (las de Empresa) o de la de su dueño.
//   - Un movimiento es de la unidad de su cuenta (o de su dueño).
//   - Lo SIN unidad se ve siempre, marcado, pero no se suma en el total de una
//     unidad (y se dice en chico).
//   - La caja de una persona no se separa por unidad: se ve entera y se dice.
//   - Solo filtra lo que se muestra: las consultas no cambian (salvo el conteo
//     de "Mov. del mes", que se cuenta en la base con un .or).
//
// Se EJECUTA el código real de caja.html (y pasaFiltroUnidad de
// js/barra-unidad.js, que extraer.js encuentra por el import) con un document
// falso y datos de prueba.
//
//   node pruebas/test-caja-barra-unidad.js
//   ARCHIVO_TEST=otra-copia.html node pruebas/test-caja-barra-unidad.js

const path = require('path')
const { execFileSync } = require('child_process')
const { construirCon, scriptModulo } = require('./sandbox')
const { arnes, leer } = require('./circuito-comun')
const { fuenteNumeros } = require('./numeros-comun')
const { extraerFn } = require('./extraer')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/caja.html')
const SRC = leer(ARCHIVO) // informa el largo leído (lo usa el runner de mutaciones)
const { chk, esperas, fin } = arnes()

// El commit FIJO de antes de este trabajo (la barra ya cargada, Caja sin filtrar).
const BASE = '5592f5a'

const STUBS = new Set([
  'verificarSesion', 'mostrarBannerVersion', 'mostrarError', 'mostrarExito', 'formatearFecha',
  'abrirDetallePersona', 'abrirDirectorio', 'abrirModalMovimiento', 'abrirModalTraspaso',
  'marcarCuentaFavorita', 'abrirModalDesactivarCuenta', 'abrirModalRenombrarCuenta', 'abrirModalEditarBancarios',
  'responderSolicitud', 'abrirModalRechazo', 'cancelarSolicitud', 'exportarMovimientosExcel',
  'crearMultiselect', 'init', 'seleccionarMedioCuentaNueva',
])

const ENTRADAS = [
  'esc', 'pasaUnidad', 'sumaEnUnidad', 'unidadDeEmpleado', 'unidadDeCuenta', 'unidadDeMovimiento',
  'htmlUnidadDeFila', 'htmlDetallePorUnidad', 'sumarPorUnidad', 'cuentasOperables', 'podarFiltro',
  'renderizarListado', 'renderizarStatTotal', 'contarMovimientosDelMes',
  'renderizarSaldosDetalle', 'renderizarMovimientos', 'movimientosVisibles',
  'renderizarRetiros', 'retirosVisibles', 'poblarSelectorRetirosPersona',
  'renderizarTodosMovimientos', 'todosMovimientosVisibles', 'renderizarFiltrosTodosMovimientos', 'opcionesCuentaTodasPersonas',
  'renderizarFiltrosFichaEmpresa',
  'renderizarListaDirectorio', 'renderizarCuentasDirectorio',
  'poblarSelectorCuentaUnica', 'poblarSelectoresTraspaso', 'actualizarSelectorCuentaContraparte',
  'abrirModalCuentaNueva', 'cargarNombresEmpleados',
  'alCambiarUnidadCaja', 'repintarPorUnidad',
]

function clausura(src) {
  const nombresFn = new Set([...src.matchAll(/(?:^|\n)\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g)].map(m => m[1]))
  const imp = src.match(/import \{([^}]*)\} from '\.\.\/js\/barra-unidad\.js'/)
  chk('el script importa de js/barra-unidad.js', !!imp)
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
    const el = {
      id, innerHTML: '', textContent: '', value: '', className: '', hidden: false, checked: false, disabled: false,
      title: '', dataset: {}, style: {},
      querySelector: () => nuevoEl('hijo'), querySelectorAll: () => [], addEventListener(){}, focus(){},
      removeAttribute(){}, setAttribute(){}, remove(){}, closest: () => nuevoEl('cercano'),
      classList: { add(){}, remove(){}, toggle(){}, contains: () => false },
    }
    return el
  }
  var __els = new Map()
  var document = {
    getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) },
    querySelectorAll: () => [], querySelector: (s) => nuevoEl(s), addEventListener(){},
    createElement: (t) => nuevoEl('creado-' + t),
  }
  var location = { href: 'https://x.test/modulos/caja.html' }
  var window = { location: { set href(v) {}, replace(v) {} } }
  // Cada consulta queda anotada con sus filtros; responde lo de __datos.
  var __consultas = []
  var __datos = {}
  var __count = 7
  var __errorCount = null
  var __demora = null
  function __consulta(tabla) {
    const reg = { tabla, select: null, opciones: null, filtros: [] }
    // Lo que va a responder se toma AL ARMAR la consulta (el then corre
    // después): así una consulta vieja que llega tarde trae SU respuesta.
    const demora = __demora
    const datos = (__datos[tabla] ?? []).map(x => ({ ...x }))
    const count = __count, errorCount = __errorCount
    __consultas.push(reg)
    const q = {}
    q.select = (s, o) => { reg.select = s; reg.opciones = o || null; return q }
    for (const k of ['eq', 'neq', 'in', 'is', 'order', 'gte', 'lte', 'limit', 'or', 'not'])
      q[k] = (...a) => { reg.filtros.push([k, ...a]); return q }
    q.maybeSingle = () => q
    q.then = (res, rej) => {
      const r = reg.opciones && reg.opciones.head
        ? { data: null, error: errorCount, count: errorCount ? null : count }
        : { data: datos, error: null, count: 0 }
      const p = demora ? demora(reg).then(() => r) : Promise.resolve(r)
      return p.then(res, rej)
    }
    return q
  }
  var supabase = { from: (t) => __consulta(t), rpc: async () => ({ data: null, error: null }) }
  function mostrarError() {} function mostrarExito() {}
  function formatearFecha(fecha) { const [a, m, d] = fecha.split('-'); return d + '/' + m + '/' + a }
  function abrirDetallePersona() {} function abrirDirectorio() {} function abrirModalMovimiento() {} function abrirModalTraspaso() {}
  function marcarCuentaFavorita() {} function abrirModalDesactivarCuenta() {} function abrirModalRenombrarCuenta() {}
  function abrirModalEditarBancarios() {} function responderSolicitud() {} function abrirModalRechazo() {} function cancelarSolicitud() {}
  function seleccionarMedioCuentaNueva() {}
  var __exportado = null
  function exportarMovimientosExcel(movs) { __exportado = movs }
  var __multiselects = {}
  function crearMultiselect(op) { __multiselects[op.idBase] = op.opciones }
  var cuentaBancariaAbierta = null, cuentaAEditarBancariosId = null, solicitudARechazarId = null
  var cuentaADesactivarId = null, cuentaARenombrarId = null, medioCuentaNuevaSeleccionado = null
  var traspasoEmpleadoId = null, debounceBusquedaCaja = null
`

const RETORNO = 'estado, __el(id){ return document.getElementById(id) }, __consultas, __multiselects, ' +
  '__exportado(){ return __exportado }, __setDatos(t, d){ __datos[t] = d }, __setCount(n){ __count = n }, ' +
  '__setErrorCount(e){ __errorCount = e }, __setDemora(f){ __demora = f }'

const U1 = 'u-uno', U2 = 'u-dos'
// El nombre de la unidad dos lleva una marca: escaparla es obligatorio.
const NOMBRE_U2 = 'Dos "><i data-xss="u2">'
const U2_ESC = 'Dos &quot;&gt;&lt;i data-xss=&quot;u2&quot;&gt;'
const U2_CRUDO = '<i data-xss="u2">'

let _fns = null
function nuevoSandbox({ elegida = null, mostrar = true } = {}) {
  if (!_fns) _fns = clausura(scriptModulo(ARCHIVO))
  const S = construirCon(ARCHIVO, { preludio: PRELUDIO, funciones: _fns.funciones, constantes: _fns.constantes, retorno: RETORNO })
  const E = S.estado
  E.miEmpleado = { id: 'yo', nombre: 'Yo', rol_app: 'super_admin' }
  E.idEmpresa = 'emp'
  E.misTareasCaja = new Set(['ver_empresa'])
  E.unidadElegida = elegida
  E.barraUnidadVisible = mostrar
  E.maestros.unidadesNegocio = [{ id: U1, nombre: 'Unidad Uno' }, { id: U2, nombre: NOMBRE_U2 }]
  E.empleados = [
    { id: 'yo', nombre: 'Yo', unidad_negocio_id: U1 },
    { id: 'p1', nombre: 'Persona Uno', unidad_negocio_id: U1 },
    { id: 'p2', nombre: 'Persona Dos', unidad_negocio_id: U2 },
    { id: 'p0', nombre: 'Persona Sin', unidad_negocio_id: null },
    { id: 'emp', nombre: 'Empresa' },
  ]
  E.nombresEmpleados = { yo: 'Yo', p1: 'Persona Uno', p2: 'Persona Dos', p0: 'Persona Sin', emp: 'Empresa' }
  const cuenta = (id, empleado_id, unidad_negocio_id, extra = {}) =>
    ({ id, empleado_id, nombre: 'Cuenta ' + id, medio: 'efectivo', moneda: 'ARS', favorita: false, activa: true, unidad_negocio_id, ...extra })
  E.cuentasPorId = {
    'c-p1': cuenta('c-p1', 'p1', null), 'c-p2': cuenta('c-p2', 'p2', null), 'c-p0': cuenta('c-p0', 'p0', null),
    'c-yo': cuenta('c-yo', 'yo', null),
    'cE1': cuenta('cE1', 'emp', U1), 'cE2': cuenta('cE2', 'emp', U2), 'cE3': cuenta('cE3', 'emp', null),
  }
  E.saldos = [
    { empleado_id: 'p1', moneda: 'ARS', saldo: 100 },
    { empleado_id: 'p2', moneda: 'ARS', saldo: 50 },
    { empleado_id: 'p0', moneda: 'ARS', saldo: 3 },
    { empleado_id: 'emp', moneda: 'ARS', saldo: 1005 },
  ]
  E.saldosPorCuenta = [
    { cuenta_id: 'c-p1', saldo: 100 }, { cuenta_id: 'c-p2', saldo: 50 }, { cuenta_id: 'c-p0', saldo: 3 },
    { cuenta_id: 'cE1', saldo: 600 }, { cuenta_id: 'cE2', saldo: 400 }, { cuenta_id: 'cE3', saldo: 5 },
  ]
  return S
}

const mov = (id, empleado_id, cuenta_id, monto = 10) =>
  ({ id, tipo: 'egreso_retiro', monto, moneda: 'ARS', medio_pago: 'efectivo', cuenta_id, descripcion: null, fecha: '2026-09-28', empleado_id })
const MOVS_EMPRESA = [mov('mE1', 'emp', 'cE1'), mov('mE2', 'emp', 'cE2'), mov('mE3', 'emp', 'cE3')]
const MOVS_PERSONAS = [mov('m1', 'p1', 'c-p1'), mov('m2', 'p2', 'c-p2'), mov('m0', 'p0', 'c-p0')]

const opcionesDe = (html) => [...(html || '').matchAll(/<option value="([^"]*)"/g)].map(m => m[1]).filter(Boolean)
const sinCrudo = (nombre, html) => chk(`${nombre}: el nombre de la unidad nunca entra crudo`, !html.includes(U2_CRUDO))

async function casos() {
  // ── pasaFiltroUnidad es el REAL de js/barra-unidad.js ─────────────────
  {
    const S = nuevoSandbox({ elegida: U1 })
    chk('pasaUnidad: la unidad elegida pasa', S.pasaUnidad(U1) === true)
    chk('pasaUnidad: otra unidad no pasa', S.pasaUnidad(U2) === false)
    chk('pasaUnidad: lo sin unidad pasa siempre', S.pasaUnidad(null) === true)
    chk('sumaEnUnidad: lo sin unidad NO se suma', S.sumaEnUnidad(null) === false && S.sumaEnUnidad(U1) === true)
    const T = nuevoSandbox()
    chk('con Todas pasa todo y todo se suma', T.pasaUnidad(U2) && T.sumaEnUnidad(null))
  }

  // ── A quién pertenece cada cosa ────────────────────────────────────────
  {
    const S = nuevoSandbox()
    const E = S.estado
    chk('una persona es de su unidad', S.unidadDeEmpleado('p2') === U2)
    chk('la Empresa no es de ninguna unidad', S.unidadDeEmpleado('emp') === null)
    chk('una cuenta personal es de la unidad de su dueño', S.unidadDeCuenta(E.cuentasPorId['c-p1']) === U1)
    chk('una cuenta de Empresa es de su propia unidad', S.unidadDeCuenta(E.cuentasPorId['cE2']) === U2)
    chk('una cuenta de Empresa sin unidad es sin unidad', S.unidadDeCuenta(E.cuentasPorId['cE3']) === null)
    chk('un movimiento es de la unidad de su cuenta', S.unidadDeMovimiento(MOVS_EMPRESA[0]) === U1)
    chk('sin la cuenta cargada, de la unidad de su dueño', S.unidadDeMovimiento({ empleado_id: 'p2', cuenta_id: 'no-esta' }) === U2)
    // Un dueño que no está en estado.empleados: sale de unidadesEmpleados.
    E.unidadesEmpleados = { fuera: U2 }
    chk('un dueño fuera de la lista: su unidad sale de v_empleados_publico', S.unidadDeEmpleado('fuera') === U2)
  }

  // ── cargarNombresEmpleados guarda la unidad de cada persona ────────────
  {
    const S = nuevoSandbox()
    S.__setDatos('v_empleados_publico', [{ id: 'x', nombre: 'Equis', unidad_negocio_id: U2 }, { id: 'y', nombre: 'Ye', unidad_negocio_id: null }])
    await S.cargarNombresEmpleados()
    const reg = S.__consultas.find(c => c.tabla === 'v_empleados_publico')
    chk('cargarNombresEmpleados pide la unidad', /unidad_negocio_id/.test(reg.select || ''), reg.select)
    chk('cargarNombresEmpleados guarda la unidad por id', S.estado.unidadesEmpleados.x === U2 && S.estado.unidadesEmpleados.y === null)
  }

  // ── Listado: los grupos ────────────────────────────────────────────────
  {
    const T = nuevoSandbox()
    T.renderizarListado()
    const h = T.__el('lista-personas').innerHTML
    chk('Todas: están los dos grupos', h.includes('Unidad Uno') && h.includes(U2_ESC), h.slice(0, 200))
    chk('Todas: y el de las personas sin unidad', h.includes('Sin empresa asignada'))
    chk('Todas: cada grupo con su subtotal', (h.match(/grupo-personas__subtotales/g) || []).length === 3)
    sinCrudo('listado', h)
    const S = nuevoSandbox({ elegida: U1 })
    S.renderizarListado()
    const h1 = S.__el('lista-personas').innerHTML
    chk('una unidad: está su grupo', h1.includes('Unidad Uno') && h1.includes('data-id="p1"'))
    chk('una unidad: NO está el grupo de la otra', !h1.includes(U2_ESC) && !h1.includes('data-id="p2"'))
    chk('una unidad: lo sin unidad no desaparece', h1.includes('Sin empresa asignada') && h1.includes('data-id="p0"'))
  }

  // ── Tarjeta del total ──────────────────────────────────────────────────
  {
    const T = nuevoSandbox()
    T.estado.movimientosDelMes = 4
    T.renderizarStatTotal()
    const h = T.__el('stat-total-empresa').innerHTML
    chk('Todas: el total es el de siempre (personas + Empresa)', h.includes('1.158'), h.match(/stat-card-caja__monto">[^<]*/)?.[0])
    chk('Todas: dice "Total de la empresa"', h.includes('Total de la empresa'))
    chk('Todas: el detalle por unidad está', h.includes('detalle-unidad-caja') && h.includes('Unidad Uno') && h.includes(U2_ESC))
    // Unidad Uno = p1 100 + cE1 600; Dos = p2 50 + cE2 400; Sin unidad = p0 3 + cE3 5.
    chk('Todas: el detalle suma bien cada unidad', h.includes('$ 700,00') && h.includes('$ 450,00') && h.includes('$ 8,00'), h.match(/detalle-unidad-caja">.*?<\/div>/s)?.[0])
    chk('Todas: sin la nota de "no incluye"', !h.includes('No incluye'))
    chk('Todas: en el desglose, cada cuenta de Empresa dice su unidad',
      /Empresa — Cuenta cE1<\/span>\s*<span class="chip-unidad-caja">Unidad Uno<\/span>/.test(h), (h.match(/Empresa — Cuenta cE1.{0,120}/s) || [''])[0])
    sinCrudo('total (Todas)', h)

    const S = nuevoSandbox({ elegida: U1 })
    S.estado.movimientosDelMes = 4
    S.renderizarStatTotal()
    const h1 = S.__el('stat-total-empresa').innerHTML
    chk('una unidad: el total es solo el de la unidad (p1 + cuenta de Empresa de la unidad)', h1.includes('$ 700<span') || h1.includes('700<span'), h1.match(/stat-card-caja__monto">.{0,80}/s)?.[0])
    chk('una unidad: la etiqueta nombra la unidad', h1.includes('Total · Unidad Uno'))
    chk('una unidad: sin el detalle por unidad (ya se sabe)', !h1.includes('detalle-unidad-caja'))
    chk('una unidad: lo sin unidad NO se suma y se dice en chico', h1.includes('No incluye 2 cajas o cuentas sin unidad'), h1.match(/nota-unidad-caja">[^<]*/)?.[0])
    chk('una unidad: "Pendientes" dice que son de todas las unidades', h1.includes('de todas las unidades'))
    chk('una unidad: el desglose no trae cuentas de otra unidad', !h1.includes('Cuenta cE2') && !h1.includes('Cuenta c-p2'))
    chk('una unidad: el desglose trae las de la unidad', h1.includes('Cuenta cE1') && h1.includes('Cuenta c-p1'))
    chk('una unidad: "Con saldo" cuenta a p1 y a la Empresa', /Con saldo<\/div>\s*<div class="stat-card-caja__submetric-valor">2</.test(h1))

    const U = nuevoSandbox({ elegida: U2 })
    U.renderizarStatTotal()
    const h2 = U.__el('stat-total-empresa').innerHTML
    chk('la etiqueta con el nombre escapado', h2.includes('Total · ' + U2_ESC))
    sinCrudo('total (una unidad)', h2)
    chk('"Mov. del mes" desconocido dice "—", nunca un número inventado', /Mov\. del mes<\/div>\s*<div class="stat-card-caja__submetric-valor">—</.test(h2))

    // Con una sola unidad (la barra no se ve) no hay detalle ni etiquetas.
    const V = nuevoSandbox({ mostrar: false })
    V.renderizarStatTotal()
    chk('una sola unidad: sin detalle por unidad', !V.__el('stat-total-empresa').innerHTML.includes('detalle-unidad-caja'))
  }

  // ── Mov. del mes: se cuenta en la base, con turno ──────────────────────
  {
    const T = nuevoSandbox()
    await T.contarMovimientosDelMes()
    const q = T.__consultas.filter(c => c.tabla === 'caja_movimientos').pop()
    chk('Todas: cuenta por las personas visibles (el conteo de siempre)', q && q.filtros.some(f => f[0] === 'in' && f[1] === 'empleado_id'), JSON.stringify(q && q.filtros))
    chk('Todas: es un conteo (head)', q && q.opciones && q.opciones.head === true)
    chk('Todas: el número llega a la tarjeta', T.estado.movimientosDelMes === 7)

    const S = nuevoSandbox({ elegida: U1 })
    await S.contarMovimientosDelMes()
    const q1 = S.__consultas.filter(c => c.tabla === 'caja_movimientos').pop()
    // Desde el 01/10/2026 la base dice de qué unidad es cada movimiento:
    // se cuenta por caja_movimientos.unidad_negocio_id.
    const eq = q1 && q1.filtros.find(f => f[0] === 'eq' && f[1] === 'unidad_negocio_id')
    chk('una unidad: cuenta por la unidad del movimiento', !!eq && eq[2] === U1, JSON.stringify(q1 && q1.filtros))
    chk('una unidad: desde el primero del mes', q1.filtros.some(f => f[0] === 'gte' && f[1] === 'fecha'))

    const X = nuevoSandbox({ elegida: U1 })
    X.__setErrorCount({ message: 'x' })
    await X.contarMovimientosDelMes()
    chk('si el conteo falla: null ("—"), nunca 0', X.estado.movimientosDelMes === null)

    // Turno: la respuesta vieja no pisa la nueva.
    const R = nuevoSandbox({ elegida: U1 })
    let soltar
    R.__setDemora(() => new Promise(r => { soltar = r }))
    const vieja = R.contarMovimientosDelMes()
    R.__setDemora(null)
    R.__setCount(9)
    await R.contarMovimientosDelMes()
    R.__setCount(1)
    soltar()
    await vieja
    chk('turno: una respuesta vieja de "Mov. del mes" no pisa la nueva', R.estado.movimientosDelMes === 9, R.estado.movimientosDelMes)
  }

  // ── Ficha de Empresa ───────────────────────────────────────────────────
  {
    const S = nuevoSandbox({ elegida: U1 })
    S.estado.personaAbierta = 'emp'
    S.renderizarSaldosDetalle('emp')
    const h = S.__el('detalle-persona-saldos').innerHTML
    chk('Empresa con una unidad: el saldo es el de sus cuentas de la unidad', h.includes('$ 600,00'), h.match(/stat-card-caja__monto[^>]*>[^<]*/)?.[0])
    chk('Empresa con una unidad: están su cuenta y la sin unidad', h.includes('Cuenta cE1') && h.includes('Cuenta cE3'))
    chk('Empresa con una unidad: NO está la cuenta de otra unidad', !h.includes('Cuenta cE2'))
    chk('Empresa con una unidad: la sin unidad está marcada', h.includes('chip-unidad-caja--sin'))
    chk('Empresa con una unidad: se dice que no incluye la sin unidad', h.includes('no incluye la cuenta sin unidad'))
    // El resumen del medio (la fila con el color por signo), no la fila de cE1,
    // que también dice $ 600,00.
    chk('Empresa con una unidad: el desglose por medio no suma la sin unidad', h.includes('tarjeta-cuenta__saldo color-positivo">· $ 600,00'), h.match(/tarjeta-cuenta__saldo color[^>]*>[^<]*/)?.[0])

    // Quien mira sin poder gestionar (no super_admin): las filas simples
    // también marcan la cuenta sin unidad.
    const G = nuevoSandbox({ elegida: U1 })
    G.estado.miEmpleado.rol_app = 'usuario'
    G.estado.personaAbierta = 'emp'
    G.renderizarSaldosDetalle('emp')
    const hg = G.__el('detalle-persona-saldos').innerHTML
    chk('Empresa sin gestionar: la cuenta sin unidad marcada en su fila',
      /Cuenta cE3: [^<]*<span class="chip-unidad-caja chip-unidad-caja--sin">/.test(hg), (hg.match(/Cuenta cE3.{0,120}/s) || [''])[0])

    const T = nuevoSandbox()
    T.estado.personaAbierta = 'emp'
    T.renderizarSaldosDetalle('emp')
    const ht = T.__el('detalle-persona-saldos').innerHTML
    chk('Empresa con Todas: el saldo de siempre', ht.includes('$ 1.005,00'))
    chk('Empresa con Todas: todas sus cuentas', ['cE1', 'cE2', 'cE3'].every(id => ht.includes('Cuenta ' + id)))
    chk('Empresa con Todas: sin nota', !ht.includes('nota-unidad-caja'))
    sinCrudo('ficha de Empresa', ht)

    // Movimientos de la ficha.
    const M = nuevoSandbox({ elegida: U1 })
    M.estado.personaAbierta = 'emp'
    M.estado.movimientos = MOVS_EMPRESA.map(x => ({ ...x }))
    M.renderizarMovimientos()
    const hm = M.__el('detalle-persona-movimientos').innerHTML
    const n = (hm.match(/tarjeta-movimiento"/g) || []).length
    chk('Empresa con una unidad: solo los movimientos de la unidad y los sin unidad', n === 2, n)
    chk('Empresa con una unidad: el sin unidad va marcado', hm.includes('sin unidad'))
    chk('Empresa con una unidad: el de otra unidad no está', !hm.includes('Cuenta cE2'))
    chk('lo que se exporta es lo que se ve', M.movimientosVisibles().map(x => x.id).join() === 'mE1,mE3')
    const MT = nuevoSandbox()
    MT.estado.personaAbierta = 'emp'
    MT.estado.movimientos = MOVS_EMPRESA.map(x => ({ ...x }))
    MT.renderizarMovimientos()
    const hmt = MT.__el('detalle-persona-movimientos').innerHTML
    chk('Empresa con Todas: todos, con el nombre de la unidad en cada fila', (hmt.match(/tarjeta-movimiento"/g) || []).length === 3 && hmt.includes('Unidad Uno') && hmt.includes(U2_ESC))
    sinCrudo('movimientos de Empresa', hmt)

    // El filtro de cuentas de la ficha ofrece las de la unidad (+ sin unidad).
    const F = nuevoSandbox({ elegida: U1 })
    F.estado.personaAbierta = 'emp'
    F.renderizarFiltrosFichaEmpresa()
    const ops = (F.__multiselects['ms-fe-cuenta'] || []).map(o => o.value).sort().join()
    chk('filtro de cuentas de Empresa: las de la unidad y las sin unidad', ops === 'cE1,cE3', ops)
  }

  // ── Ficha de una persona: no se separa por unidad ──────────────────────
  {
    const S = nuevoSandbox({ elegida: U1 })
    S.estado.personaAbierta = 'p2'
    S.renderizarSaldosDetalle('p2')
    const h = S.__el('detalle-persona-saldos').innerHTML
    chk('persona de otra unidad: su caja se ve entera', h.includes('$ 50,00') && h.includes('Cuenta c-p2'))
    chk('persona de otra unidad: se dice en chico que no se separa', h.includes('no se separa por unidad'))
    S.renderizarSaldosDetalle('p1')
    chk('persona de la unidad elegida: sin nota', !S.__el('detalle-persona-saldos').innerHTML.includes('nota-unidad-caja'))
    const P = nuevoSandbox({ elegida: U1 })
    P.estado.personaAbierta = 'p2'
    P.estado.movimientos = [mov('m2', 'p2', 'c-p2')]
    P.renderizarMovimientos()
    chk('persona: sus movimientos no se recortan', (P.__el('detalle-persona-movimientos').innerHTML.match(/tarjeta-movimiento"/g) || []).length === 1)
  }

  // ── Retiros socios ─────────────────────────────────────────────────────
  {
    const S = nuevoSandbox({ elegida: U1 })
    S.estado.retiros = MOVS_PERSONAS.map(x => ({ ...x }))
    S.renderizarRetiros()
    const h = S.__el('lista-retiros-personales').innerHTML
    const n = (h.match(/tarjeta-movimiento"/g) || []).length
    chk('Retiros con una unidad: los de la unidad y los sin unidad', n === 2, n)
    chk('Retiros con una unidad: el de otra unidad no está', !h.includes('Persona Dos'))
    chk('Retiros con una unidad: el sin unidad va marcado', h.includes('sin unidad'))
    chk('Retiros: el total es de lo que se ve', S.__el('stat-total-retiros').innerHTML.includes('$ 20,00'))
    S.poblarSelectorRetirosPersona()
    const ops = opcionesDe(S.__el('filtro-retiros-persona').innerHTML)
    chk('Retiros: el filtro de persona ofrece las de la unidad y las sin unidad', !ops.includes('p2') && ops.includes('p1') && ops.includes('p0'), ops.join())
    const T = nuevoSandbox()
    T.estado.retiros = MOVS_PERSONAS.map(x => ({ ...x }))
    T.renderizarRetiros()
    const ht = T.__el('stat-total-retiros').innerHTML
    chk('Retiros con Todas: el detalle por unidad del total', ht.includes('detalle-unidad-caja') && ht.includes('Unidad Uno'))
    chk('Retiros con Todas: todos', (T.__el('lista-retiros-personales').innerHTML.match(/tarjeta-movimiento"/g) || []).length === 3)
  }

  // ── Todos los movimientos ──────────────────────────────────────────────
  {
    const S = nuevoSandbox({ elegida: U2 })
    S.estado.todosMovimientos = [...MOVS_PERSONAS, ...MOVS_EMPRESA].map(x => ({ ...x }))
    S.renderizarTodosMovimientos()
    const h = S.__el('lista-todos-movimientos').innerHTML
    const n = (h.match(/tarjeta-movimiento"/g) || []).length
    // U2: m2 (p2) y mE2 (cE2); sin unidad: m0 (p0) y mE3 (cE3).
    chk('Todos los movimientos con una unidad: los de la unidad y los sin unidad', n === 4, n)
    chk('Todos los movimientos con una unidad: la cuenta de Empresa va por SU unidad', h.includes('Cuenta cE2') && !h.includes('Cuenta cE1'))
    chk('Todos los movimientos: el total es de lo que se ve', S.__el('stat-total-todos-movimientos').innerHTML.includes('$ 40,00'))
    S.renderizarFiltrosTodosMovimientos()
    const cuentas = (S.__multiselects['ms-tm-cuenta'] || []).map(o => o.value).sort().join()
    const personas = (S.__multiselects['ms-tm-persona'] || []).map(o => o.value).sort().join()
    chk('Todos los movimientos: el filtro de cuentas es de la unidad (+ sin unidad)', cuentas === 'c-p0,c-p2,cE2,cE3', cuentas)
    chk('Todos los movimientos: el filtro de personas es de la unidad (+ sin unidad)', personas === 'emp,p0,p2', personas)
    sinCrudo('todos los movimientos', h)
  }

  // ── Directorio ─────────────────────────────────────────────────────────
  {
    const S = nuevoSandbox({ elegida: U1 })
    await S.renderizarListaDirectorio()
    const h = S.__el('directorio-contenido').innerHTML
    chk('Directorio con una unidad: las personas de la unidad, las sin unidad y la Empresa',
      h.includes('data-id="p1"') && h.includes('data-id="p0"') && h.includes('data-id="emp"') && !h.includes('data-id="p2"'))
    await S.renderizarCuentasDirectorio('emp')
    const hc = S.__el('directorio-contenido').innerHTML
    chk('Directorio: las cuentas de Empresa de la unidad (+ sin unidad)', hc.includes('Cuenta cE1') && hc.includes('Cuenta cE3') && !hc.includes('Cuenta cE2'))
    const T = nuevoSandbox()
    await T.renderizarListaDirectorio()
    const ht = T.__el('directorio-contenido').innerHTML
    chk('Directorio con Todas: la unidad de cada persona', ht.includes('Unidad Uno') && ht.includes(U2_ESC))
    sinCrudo('directorio', ht)
  }

  // ── Operar: las cuentas de Empresa por unidad; las personales no ───────
  {
    const S = nuevoSandbox({ elegida: U1 })
    chk('cuentasOperables(Empresa): las de la unidad y las sin unidad', S.cuentasOperables('emp').map(c => c.id).sort().join() === 'cE1,cE3')
    chk('cuentasOperables(persona): todas las suyas', S.cuentasOperables('p2').map(c => c.id).join() === 'c-p2')
    S.poblarSelectorCuentaUnica('emp')
    const ops = opcionesDe(S.__el('cuenta-select').innerHTML).sort().join()
    chk('el selector de cuenta de Empresa ofrece solo las de la unidad', ops === 'cE1,cE3', ops)
    const T = nuevoSandbox()
    T.poblarSelectorCuentaUnica('emp')
    const ht = T.__el('cuenta-select').innerHTML
    chk('con Todas: todas, con su unidad en la etiqueta', opcionesDe(ht).length === 3 && ht.includes('· Unidad Uno') && ht.includes(U2_ESC))
    sinCrudo('selector de cuenta', ht)
    // El traspaso entre cuentas de Empresa también (traspasoEmpleadoId es un
    // let del módulo: acá se mira que las dos listas salgan de cuentasOperables).
    chk('el traspaso de Empresa usa cuentasOperables', /cuentasOperables\(traspasoEmpleadoId\)/.test(extraerFn(SRC, 'poblarSelectoresTraspaso')) &&
      /cuentasOperables\(traspasoEmpleadoId\)/.test(extraerFn(SRC, 'actualizarSelectorDestinoTraspaso')))
  }

  // ── Registro nuevo: la unidad de una cuenta de Empresa viene puesta ────
  {
    const S = nuevoSandbox({ elegida: U2 })
    S.estado.personaAbierta = 'emp'
    S.abrirModalCuentaNueva()
    chk('cuenta nueva de Empresa: la unidad viene puesta con la de la barra', S.__el('cuenta-unidad-negocio').value === U2)
    chk('cuenta nueva: el campo sigue ofreciendo todas (no es un filtro)', opcionesDe(S.__el('cuenta-unidad-negocio').innerHTML).length === 2)
    const T = nuevoSandbox()
    T.estado.personaAbierta = 'emp'
    T.abrirModalCuentaNueva()
    chk('cuenta nueva con Todas: sin unidad puesta (la unidad es optativa, "Sin asignar")', T.__el('cuenta-unidad-negocio').value === '')
  }

  // ── Cambiar la elección repinta sin recargar ───────────────────────────
  {
    const S = nuevoSandbox()
    S.estado.listadoCargado = true
    S.renderizarListado()
    chk('antes del cambio: está el grupo de la unidad uno', S.__el('lista-personas').innerHTML.includes('data-id="p1"'))
    // Retiros ya cargados, con una persona de la unidad uno elegida en el filtro.
    S.estado.retirosCargadoUnaVez = true
    S.estado.filtrosRetiros.empleado_id = 'p1'
    S.estado.retiros = MOVS_PERSONAS.map(x => ({ ...x }))
    // Todos los movimientos ya cargados, filtrando por una cuenta de la unidad uno.
    S.estado.todosMovimientosCargadoUnaVez = true
    S.estado.filtrosTodosMovimientos.cuenta_ids = ['c-p1', 'c-p2']
    S.estado.todosMovimientos = MOVS_PERSONAS.map(x => ({ ...x }))
    S.__setDatos('caja_movimientos', [mov('m2', 'p2', 'c-p2')])
    const antes = S.__consultas.length
    S.alCambiarUnidadCaja({ elegida: U2, mostrar: true })
    await new Promise(r => setTimeout(r, 0))
    await new Promise(r => setTimeout(r, 0))
    chk('el cambio guarda la unidad elegida', S.estado.unidadElegida === U2 && S.estado.barraUnidadVisible === true)
    const h = S.__el('lista-personas').innerHTML
    chk('el cambio repinta el listado: ahora la unidad dos', h.includes('data-id="p2"') && !h.includes('data-id="p1"'))
    chk('el cambio repinta la tarjeta del total', S.__el('stat-total-empresa').innerHTML.includes('Total · ' + U2_ESC))
    const nuevas = S.__consultas.slice(antes)
    chk('el cambio vuelve a contar "Mov. del mes"', nuevas.some(c => c.tabla === 'caja_movimientos' && c.opciones && c.opciones.head))
    chk('Retiros: la persona que ya no se ofrece sale del filtro', S.estado.filtrosRetiros.empleado_id === '')
    chk('Retiros: y se vuelve a consultar', nuevas.some(c => c.tabla === 'caja_movimientos' && c.filtros.some(f => f[0] === 'eq' && f[1] === 'tipo')))
    chk('Todos los movimientos: la cuenta que ya no se ofrece sale del filtro', S.estado.filtrosTodosMovimientos.cuenta_ids.join() === 'c-p2')
    chk('Todos los movimientos: y se vuelve a consultar', nuevas.filter(c => c.tabla === 'caja_movimientos' && !c.opciones).length >= 2)
    // Sin nada podado, NO se vuelve a consultar: se repinta de lo que ya está.
    const R = nuevoSandbox({ elegida: U1 })
    R.estado.retirosCargadoUnaVez = true
    R.estado.retiros = MOVS_PERSONAS.map(x => ({ ...x }))
    const a = R.__consultas.length
    R.alCambiarUnidadCaja({ elegida: U2, mostrar: true })
    await new Promise(r => setTimeout(r, 0))
    chk('sin filtros que podar, el cambio no vuelve a la base', R.__consultas.length === a, R.__consultas.slice(a).map(c => c.tabla).join())
    chk('y repinta los retiros con la unidad nueva', R.__el('lista-retiros-personales').innerHTML.includes('Persona Dos') && !R.__el('lista-retiros-personales').innerHTML.includes('Persona Uno'))
    // Antes de saber quién soy, el cambio solo se guarda.
    const Q = nuevoSandbox()
    Q.estado.miEmpleado = null
    Q.estado.listadoCargado = true
    Q.alCambiarUnidadCaja({ elegida: U1, mostrar: true })
    chk('antes del init: el cambio se guarda y no dibuja nada', Q.estado.unidadElegida === U1 && Q.__el('lista-personas').innerHTML === '')
    // Ficha de Empresa abierta: el cambio la repinta. Con un usuario que NO
    // puede leer todas las cajas (solo ver_empresa, sin super_admin) la ficha
    // sigue mostrando solo las cuentas de la Empresa y no vuelve a la base;
    // el caso de quien sí puede lo prueba test-caja-unidad-movimientos.js.
    const F = nuevoSandbox()
    F.estado.miEmpleado.rol_app = 'usuario'
    F.estado.personaAbierta = 'emp'
    F.estado.movimientos = MOVS_EMPRESA.map(x => ({ ...x }))
    F.alCambiarUnidadCaja({ elegida: U1, mostrar: true })
    chk('ficha de Empresa abierta: el cambio repinta el saldo y los movimientos',
      F.__el('detalle-persona-saldos').innerHTML.includes('$ 600,00') &&
      (F.__el('detalle-persona-movimientos').innerHTML.match(/tarjeta-movimiento"/g) || []).length === 2)
  }

  // ── Turno de las cargas: una respuesta vieja no pisa la nueva ──────────
  {
    // Ejecutado: una carga vieja de Retiros que llega tarde no pisa la nueva.
    const S = nuevoSandbox()
    let soltar
    S.__setDatos('caja_movimientos', [mov('viejo', 'p1', 'c-p1')])
    S.__setDemora(() => new Promise(r => { soltar = r }))
    const vieja = S.cargarRetiros()
    S.__setDemora(null)
    S.__setDatos('caja_movimientos', [mov('nuevo', 'p2', 'c-p2')])
    await S.cargarRetiros()
    soltar()
    await vieja
    chk('turno: una carga vieja de Retiros no pisa la nueva', S.estado.retiros.map(m => m.id).join() === 'nuevo', S.estado.retiros.map(m => m.id).join())
    chk('cargarTodosMovimientos lleva turno', /turno !== estado\.turnoTodosMovimientos/.test(extraerFn(SRC, 'cargarTodosMovimientos')))
    chk('cargarRetiros lleva turno', /turno !== estado\.turnoRetiros/.test(extraerFn(SRC, 'cargarRetiros')))
    chk('cargarMovimientos lleva turno', /turno !== estado\.turnoMovimientosFicha/.test(extraerFn(SRC, 'cargarMovimientos')))
    chk('cargarMovimientosFichaEmpresa lleva turno', /turno !== estado\.turnoMovimientosFicha/.test(extraerFn(SRC, 'cargarMovimientosFichaEmpresa')))
  }

  // ── El init: la barra en paralelo y el aviso de cambio ─────────────────
  {
    const init = extraerFn(SRC, 'init')
    const pa = init.match(/await Promise\.all\(\[([^\]]*)\]\)/)
    chk('el init espera la unidad de la barra junto con lo demás', !!pa && /promesaUnidad/.test(pa[1]), pa && pa[1])
    chk('el init pide la unidad a la barra', /unidadesDeLaBarra\(\)/.test(init))
    chk('el cambio de unidad se escucha', /alCambiarUnidad\(alCambiarUnidadCaja\)/.test(SRC))
    // Desde el 01/10/2026 SÍ: caja_movimientos.unidad_negocio_id la completa
    // el trigger en todas las filas (335 de 335 ese día), así que un .eq no
    // descarta nulls. Solo en las dos consultas de movimientos.
    const conEq = (SRC.match(/\.eq\('unidad_negocio_id'/g) || []).length
    chk('se filtra por unidad con .eq solo en caja_movimientos (ficha de Empresa y Mov. del mes)', conEq === 2 &&
      /\.eq\('unidad_negocio_id'/.test(extraerFn(SRC, 'cargarMovimientosFichaEmpresa')) &&
      /\.eq\('unidad_negocio_id'/.test(extraerFn(SRC, 'contarMovimientosDelMes')), conEq)
  }

  // ── El selector viejo: Caja no tenía uno para mirar ────────────────────
  {
    let base = ''
    try { base = execFileSync('git', ['show', `${BASE}:modulos/caja.html`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 1 << 26 }) } catch (e) { base = '' }
    chk(`se pudo leer el baseline fijo ${BASE}`, base.length > 100000, base.length)
    const selectsDeUnidad = (t) => [...t.matchAll(/<select id="([^"]*unidad[^"]*)"/g)].map(m => m[1])
    chk('el baseline tenía un solo selector de unidad, el de la cuenta NUEVA', selectsDeUnidad(base).join() === 'cuenta-unidad-negocio', selectsDeUnidad(base).join())
    chk('sigue siendo el único: ningún selector de unidad para mirar', selectsDeUnidad(SRC).join() === 'cuenta-unidad-negocio', selectsDeUnidad(SRC).join())
  }
}

esperas.push(casos())
fin()
