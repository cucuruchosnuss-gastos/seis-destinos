// EL SALDO CORRIENTE en Caja (30/09/2026): el saldo de la cuenta DESPUÉS de
// cada movimiento, como en un extracto bancario.
//
// Las reglas que se exigen:
//   - Por CUENTA, en orden de fecha, después created_at, después id (de lo más
//     viejo a lo más nuevo), aunque la lista se muestre al revés.
//   - El signo de las vistas v_caja_saldos*: todo tipo que empieza con
//     'ingreso' suma, el resto resta.
//   - Verde si queda en cero o más, bordó si queda negativo, "—" si no se sabe
//     (nunca "$ 0").
//   - Sobre TODA la historia de la cuenta (de a 1000 filas, con el conteo
//     exacto); si no se pudo leer toda, se dice y no se inventa.
//   - El último saldo de cada cuenta coincide con v_caja_saldos_cuenta; si no,
//     se dice en la pantalla y esa cuenta no muestra saldos.
//   - Con filtro de fechas, el renglón "Saldo al <desde>" con el saldo de cada
//     cuenta antes del primer día, calculado con todos los anteriores.
//   - En la ficha de una persona, en la de Empresa, en Retiros socios y en
//     Todos los movimientos (las dos últimas mezclan cuentas: cada renglón
//     lleva el saldo de SU cuenta).
//
// Se EJECUTA el código real de caja.html con un document y un Supabase falsos.
//
//   node pruebas/test-caja-saldo-corriente.js
//   ARCHIVO_TEST=otra-copia.html node pruebas/test-caja-saldo-corriente.js

const path = require('path')
const { execFileSync } = require('child_process')
const { construirCon, scriptModulo } = require('./sandbox')
const { arnes, leer, marca, escapada } = require('./circuito-comun')
const { fuenteNumeros } = require('./numeros-comun')
const { extraerFn } = require('./extraer')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/caja.html')
const SRC = leer(ARCHIVO) // informa el largo leído (lo usa el runner de mutaciones)
const { chk, esperas, fin } = arnes()

// El commit FIJO de antes de este trabajo (Caja sin saldo corriente).
const BASE = '1bb50c5'

const STUBS = new Set([
  'verificarSesion', 'mostrarBannerVersion', 'mostrarError', 'mostrarExito', 'formatearFecha',
  'abrirDetallePersona', 'abrirDirectorio', 'abrirModalMovimiento', 'abrirModalTraspaso',
  'exportarMovimientosExcel', 'crearMultiselect', 'init',
])

const ENTRADAS = [
  'esc', 'calcularSaldoCorriente', 'leerSaldoCorriente', 'leerHistoriaCaja', 'desdeDePeriodos',
  'htmlSaldoDeFila', 'htmlAvisoSaldoCorriente', 'htmlAperturaSaldo', 'renderizarFilaMovimiento',
  'renderizarMovimientos', 'cargarMovimientos', 'cargarMovimientosFichaEmpresa', 'cargarSaldoFicha',
  'renderizarRetiros', 'cargarRetiros', 'renderizarTodosMovimientos', 'cargarTodosMovimientos',
]

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

// El Supabase falso aplica los filtros que usa Caja (eq, in, gte, lte, el or
// de los períodos y range) y devuelve el conteo exacto cuando se lo piden.
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
  var __errores = {}
  var __countForzado = null
  var __sinCount = false
  var __demora = null
  function __pasaOr(r, expr) {
    return expr.split('),').some(parte => {
      const m = /fecha\\.gte\\.([0-9-]+),fecha\\.lte\\.([0-9-]+)/.exec(parte)
      return !m || (r.fecha >= m[1] && r.fecha <= m[2])
    })
  }
  function __consulta(tabla) {
    const reg = { tabla, select: null, opciones: null, filtros: [], rango: null }
    const demora = __demora
    __consultas.push(reg)
    const q = {}
    q.select = (s, o) => { reg.select = s; reg.opciones = o || null; return q }
    for (const k of ['eq', 'neq', 'in', 'is', 'order', 'gte', 'lte', 'limit', 'or', 'not'])
      q[k] = (...a) => { reg.filtros.push([k, ...a]); return q }
    q.range = (a, b) => { reg.rango = [a, b]; return q }
    q.maybeSingle = () => q
    q.then = (res, rej) => {
      const r = (() => {
        if (__errores[tabla]) return { data: null, error: { message: __errores[tabla] }, count: null }
        let filas = (__datos[tabla] ?? []).map(x => ({ ...x }))
        for (const [k, a, b] of reg.filtros) {
          if (k === 'eq') filas = filas.filter(f => f[a] === b)
          if (k === 'in') filas = filas.filter(f => b.includes(f[a]))
          if (k === 'gte') filas = filas.filter(f => f[a] >= b)
          if (k === 'lte') filas = filas.filter(f => f[a] <= b)
          if (k === 'or') filas = filas.filter(f => __pasaOr(f, a))
        }
        const total = filas.length
        if (reg.rango) filas = filas.slice(reg.rango[0], reg.rango[1] + 1)
        const count = reg.opciones && reg.opciones.count ? (__sinCount ? null : (__countForzado ?? total)) : null
        return { data: filas, error: null, count }
      })()
      const p = demora ? demora(reg).then(() => r) : Promise.resolve(r)
      return p.then(res, rej)
    }
    return q
  }
  var supabase = { from: (t) => __consulta(t), rpc: async () => ({ data: null, error: null }) }
  function mostrarError() {} function mostrarExito() {}
  function formatearFecha(fecha) { const [a, m, d] = String(fecha).split('-'); return d + '/' + m + '/' + a }
  function abrirDetallePersona() {} function abrirDirectorio() {} function abrirModalMovimiento() {} function abrirModalTraspaso() {}
  function exportarMovimientosExcel() {} function crearMultiselect() {}
`

const RETORNO = 'estado, __el(id){ return document.getElementById(id) }, __consultas, ' +
  '__setDatos(t, d){ __datos[t] = d }, __setError(t, e){ __errores[t] = e }, __setCount(n){ __countForzado = n }, __setSinCount(v){ __sinCount = v }, ' +
  '__setDemora(f){ __demora = f }'

const NOMBRE_RARO = 'Banco ' + marca('cuenta')

let _fns = null
function nuevoSandbox() {
  if (!_fns) _fns = clausura(scriptModulo(ARCHIVO))
  const S = construirCon(ARCHIVO, { preludio: PRELUDIO, funciones: _fns.funciones, constantes: _fns.constantes, retorno: RETORNO })
  const E = S.estado
  E.miEmpleado = { id: 'p1', nombre: 'Pepa', rol_app: 'super_admin' }
  E.idEmpresa = 'emp'
  E.personaAbierta = 'p1'
  E.misTareasCaja = new Set(['ver_empresa'])
  E.unidadElegida = null
  E.barraUnidadVisible = false
  E.maestros.unidadesNegocio = []
  E.empleados = [{ id: 'p1', nombre: 'Pepa', unidad_negocio_id: null }, { id: 'p2', nombre: 'Tito', unidad_negocio_id: null }]
  E.nombresEmpleados = { p1: 'Pepa', p2: 'Tito', emp: 'Empresa' }
  const cuenta = (id, empleado_id, nombre) => ({ id, empleado_id, nombre, medio: 'efectivo', moneda: 'ARS', favorita: false, activa: true, unidad_negocio_id: null })
  E.cuentasPorId = {
    cA: cuenta('cA', 'p1', 'Efectivo Pepa'), cB: cuenta('cB', 'p1', NOMBRE_RARO),
    cT: cuenta('cT', 'p2', 'Efectivo Tito'), cE: cuenta('cE', 'emp', 'Caja fuerte'),
  }
  return S
}

// Un movimiento; created_at por defecto al mediodía de su fecha.
const mov = (id, cuenta_id, tipo, monto, fecha, extra = {}) => ({
  id, cuenta_id, tipo, monto, moneda: 'ARS', medio_pago: 'efectivo', descripcion: null, fecha,
  created_at: fecha + 'T12:00:00+00:00', gasto_id: null, contraparte_empleado_id: null,
  empleado_id: { cA: 'p1', cB: 'p1', cT: 'p2', cE: 'emp' }[cuenta_id] ?? null, ...extra,
})

// El saldo que dice cada fila, por id de movimiento, leído del HTML.
function saldosDelHtml(html) {
  const out = {}
  // Un ajuste lleva además la clase tarjeta-movimiento--ajuste.
  const tarjetas = html.split(/class="tarjeta-movimiento(?:"| tarjeta-movimiento--ajuste")/).slice(1)
  for (const t of tarjetas) {
    const desc = /class="movimiento__descripcion">([^<]*)</.exec(t)
    const s = /class="movimiento__saldo([^"]*)"[^>]*>Saldo ([^<]*)</.exec(t)
    if (desc) out[desc[1]] = s ? { clase: s[1].trim(), texto: s[2] } : null
  }
  return out
}
// Cada movimiento lleva su id como descripción, para encontrarlo en el HTML.
const conDesc = (m) => ({ ...m, descripcion: m.id })

async function casos() {
  // ── El cálculo puro ───────────────────────────────────────────────────
  {
    const S = nuevoSandbox()
    const historia = [
      mov('g1', 'cA', 'egreso_gasto', 20000, '2026-09-02'),
      mov('i1', 'cA', 'ingreso', 100000, '2026-09-01'),
    ]
    const r = S.calcularSaldoCorriente(historia, [{ cuenta_id: 'cA', saldo: 80000 }])
    chk('el ejemplo de Facu: entra 100.000 → 100.000', r.porMovimiento.get('i1') === 10000000, r.porMovimiento.get('i1'))
    chk('el ejemplo de Facu: un gasto de 20.000 → 80.000', r.porMovimiento.get('g1') === 8000000, r.porMovimiento.get('g1'))
    chk('la cuenta cierra con la vista', r.cuentas.get('cA').cierra === true)

    // Misma fecha: decide created_at, aunque el id diga lo contrario.
    const mismaFecha = [
      mov('z-primero', 'cA', 'ingreso', 50, '2026-09-01', { created_at: '2026-09-01T08:00:00+00:00' }),
      mov('a-segundo', 'cA', 'egreso_gasto', 80, '2026-09-01', { created_at: '2026-09-01T09:00:00+00:00' }),
    ]
    const r2 = S.calcularSaldoCorriente(mismaFecha, [{ cuenta_id: 'cA', saldo: -30 }])
    chk('misma fecha: va primero el cargado antes (created_at)', r2.porMovimiento.get('z-primero') === 5000 && r2.porMovimiento.get('a-segundo') === -3000,
      [r2.porMovimiento.get('z-primero'), r2.porMovimiento.get('a-segundo')].join())
    // Misma fecha y mismo created_at: decide el id.
    const empate = [
      mov('id-b', 'cA', 'egreso_gasto', 10, '2026-09-01'),
      mov('id-a', 'cA', 'ingreso', 30, '2026-09-01'),
    ]
    const r3 = S.calcularSaldoCorriente(empate, [{ cuenta_id: 'cA', saldo: 20 }])
    chk('mismo created_at: decide el id', r3.porMovimiento.get('id-a') === 3000 && r3.porMovimiento.get('id-b') === 2000)
    // Una fecha más vieja gana aunque se haya cargado después.
    const tarde = [
      mov('nuevo', 'cA', 'ingreso', 10, '2026-09-05', { created_at: '2026-09-01T00:00:00+00:00' }),
      mov('viejo', 'cA', 'ingreso', 5, '2026-09-01', { created_at: '2026-09-09T00:00:00+00:00' }),
    ]
    const r4 = S.calcularSaldoCorriente(tarde, [{ cuenta_id: 'cA', saldo: 15 }])
    chk('manda la fecha, después created_at', r4.porMovimiento.get('viejo') === 500 && r4.porMovimiento.get('nuevo') === 1500)

    // Por cuenta: dos cuentas intercaladas no se mezclan.
    const dos = [
      mov('a1', 'cA', 'ingreso', 100, '2026-09-01'),
      mov('b1', 'cB', 'ingreso', 7, '2026-09-02'),
      mov('a2', 'cA', 'egreso_retiro', 40, '2026-09-03'),
      mov('b2', 'cB', 'egreso_gasto', 2, '2026-09-04'),
    ]
    const r5 = S.calcularSaldoCorriente(dos, [{ cuenta_id: 'cA', saldo: 60 }, { cuenta_id: 'cB', saldo: 5 }])
    chk('por cuenta: la A no suma lo de la B', r5.porMovimiento.get('a2') === 6000, r5.porMovimiento.get('a2'))
    chk('por cuenta: la B no suma lo de la A', r5.porMovimiento.get('b2') === 500, r5.porMovimiento.get('b2'))

    // El signo: todo lo que empieza con "ingreso" suma.
    const tipos = ['ingreso', 'ingreso_externo', 'ingreso_traspaso', 'ingreso_reversion_gasto', 'ingreso_ajuste',
      'egreso_gasto', 'egreso_retiro', 'egreso_transferencia', 'egreso_traspaso', 'egreso_ajuste']
    for (const tipo of tipos) {
      const r6 = S.calcularSaldoCorriente([mov('x', 'cA', tipo, 10, '2026-09-01')], [])
      const esperado = tipo.startsWith('ingreso') ? 1000 : -1000
      chk(`signo de ${tipo}: ${esperado > 0 ? 'suma' : 'resta'}`, r6.cuentas.get('cA').final === esperado, r6.cuentas.get('cA').final)
    }

    // Centavos: tres de 0,10 dan 0,30 exacto (la vista dice 0,30).
    const centavos = ['c1', 'c2', 'c3'].map((id, i) => mov(id, 'cA', 'ingreso', 0.1, '2026-09-0' + (i + 1)))
    const r7 = S.calcularSaldoCorriente(centavos, [{ cuenta_id: 'cA', saldo: 0.3 }])
    chk('en centavos: 0,10 + 0,10 + 0,10 cierra con 0,30', r7.cuentas.get('cA').cierra === true, r7.cuentas.get('cA').final)
    // 1 + 0,15 en coma flotante da 115,00000000000001 centavos y 1,15 da
    // 114,99999999999999: solo cierran en centavos enteros.
    const r7b = S.calcularSaldoCorriente([mov('e1', 'cA', 'ingreso', 1, '2026-09-01'), mov('e2', 'cA', 'ingreso', 0.15, '2026-09-02')],
      [{ cuenta_id: 'cA', saldo: 1.15 }])
    chk('en centavos: 1 + 0,15 cierra con 1,15', r7b.cuentas.get('cA').cierra === true && r7b.porMovimiento.get('e2') === 115, r7b.cuentas.get('cA').final)

    // No cierra con la vista: ninguna fila de esa cuenta tiene saldo.
    const r8 = S.calcularSaldoCorriente(historia, [{ cuenta_id: 'cA', saldo: 79999 }])
    chk('si no cierra con la vista, la cuenta no cierra', r8.cuentas.get('cA').cierra === false)
    chk('si no cierra, ninguna fila de esa cuenta tiene saldo', !r8.porMovimiento.has('i1') && !r8.porMovimiento.has('g1'))
    const r9 = S.calcularSaldoCorriente(historia, [])
    chk('sin la fila de la vista, la cuenta no cierra', r9.cuentas.get('cA').cierra === false && r9.cuentas.get('cA').vista === null)
    // Un monto ausente no se vuelve 0.
    const r10 = S.calcularSaldoCorriente([mov('n', 'cA', 'ingreso', null, '2026-09-01')], [{ cuenta_id: 'cA', saldo: 0 }])
    chk('un monto ausente: la cuenta no cierra (nunca se toma como 0)', r10.cuentas.get('cA').cierra === false && r10.cuentas.get('cA').final === null)

    // La apertura: el saldo antes del primer día, con TODOS los anteriores.
    const conViejos = [
      mov('v1', 'cA', 'ingreso', 1000, '2026-08-10'),
      mov('v2', 'cA', 'egreso_gasto', 300, '2026-08-31'),
      mov('n1', 'cA', 'egreso_gasto', 50, '2026-09-01'),
    ]
    const r11 = S.calcularSaldoCorriente(conViejos, [{ cuenta_id: 'cA', saldo: 650 }], '2026-09-01')
    chk('apertura: el saldo al 01/09 es lo de antes del 1 (700)', r11.cuentas.get('cA').apertura === 70000, r11.cuentas.get('cA').apertura)
    const r12 = S.calcularSaldoCorriente(conViejos, [{ cuenta_id: 'cA', saldo: 650 }], '2026-08-01')
    chk('apertura sin nada anterior: un cero de verdad', r12.cuentas.get('cA').apertura === 0)
    const r13 = S.calcularSaldoCorriente(conViejos, [{ cuenta_id: 'cA', saldo: 1 }], '2026-09-01')
    chk('apertura de una cuenta que no cierra: no se sabe', r13.cuentas.get('cA').apertura === null)

    chk('desdeDePeriodos: el más viejo, aunque venga segundo', S.desdeDePeriodos(['oct-26', 'sep-26']) === '2026-09-01', S.desdeDePeriodos(['oct-26', 'sep-26']))
    chk('desdeDePeriodos: sin períodos, sin desde', S.desdeDePeriodos([]) === null)
  }

  // ── La fila ───────────────────────────────────────────────────────────
  {
    const S = nuevoSandbox()
    const m = mov('i1', 'cA', 'ingreso', 100000, '2026-09-01')
    const sinSaldo = S.renderizarFilaMovimiento(m)
    chk('una lista que no pide saldo: la fila no lo dibuja', !/movimiento__saldo/.test(sinSaldo))
    const listo = (pares) => ({ estado: 'listo', resultado: { porMovimiento: new Map(pares), cuentas: new Map() } })
    const pos = S.renderizarFilaMovimiento(m, { saldo: listo([['i1', 8000000]]) })
    chk('saldo positivo: en verde con el importe', /movimiento__saldo movimiento__saldo--positivo">Saldo \$ 80\.000,00</.test(pos), pos.match(/movimiento__saldo[^<]*</))
    const neg = S.renderizarFilaMovimiento(m, { saldo: listo([['i1', -150050]]) })
    chk('saldo negativo: en bordó, escrito como el saldo de arriba', /movimiento__saldo movimiento__saldo--negativo">Saldo \$ -1\.500,50</.test(neg), neg.match(/movimiento__saldo[^<]*</))
    const cero = S.renderizarFilaMovimiento(m, { saldo: listo([['i1', 0]]) })
    chk('saldo en cero de verdad: verde y "$ 0,00"', /movimiento__saldo--positivo">Saldo \$ 0,00</.test(cero))
    const ausente = S.renderizarFilaMovimiento(m, { saldo: listo([]) })
    chk('saldo que no se sabe: "—", nunca "$ 0"', /movimiento__saldo--sin"[^>]*>Saldo —</.test(ausente) && !/Saldo \$/.test(ausente))
    const sinCuenta = S.renderizarFilaMovimiento({ ...m, cuenta_id: null }, { saldo: listo([['i1', 5]]) })
    chk('un movimiento sin cuenta: "—"', /Saldo —/.test(sinCuenta))
    const cargando = S.renderizarFilaMovimiento(m, { saldo: { estado: 'cargando' } })
    chk('mientras carga: "…" y nunca un número', /Saldo …/.test(cargando))
    const error = S.renderizarFilaMovimiento(m, { saldo: { estado: 'error' } })
    chk('con error: "—"', /Saldo —/.test(error))
  }

  // ── La ficha de una persona: de punta a punta ──────────────────────────
  {
    const S = nuevoSandbox()
    const movs = [
      mov('i1', 'cA', 'ingreso', 100000, '2026-09-01'),
      mov('g1', 'cA', 'egreso_gasto', 20000, '2026-09-02'),
      mov('g2', 'cA', 'egreso_gasto', 90000, '2026-09-03'),
      mov('b1', 'cB', 'ingreso', 500, '2026-09-02'),
    ].map(conDesc)
    S.__setDatos('caja_movimientos', movs)
    S.__setDatos('v_caja_saldos_cuenta', [{ cuenta_id: 'cA', saldo: -10000 }, { cuenta_id: 'cB', saldo: 500 }])
    await S.cargarMovimientos('p1')
    const h = S.__el('detalle-persona-movimientos').innerHTML
    const s = saldosDelHtml(h)
    chk('ficha: 100.000 después del ingreso', s.i1?.texto === '$ 100.000,00' && s.i1.clase.includes('positivo'), JSON.stringify(s.i1))
    chk('ficha: 80.000 después del gasto, en verde', s.g1?.texto === '$ 80.000,00' && s.g1.clase.includes('positivo'), JSON.stringify(s.g1))
    chk('ficha: queda negativa, en bordó', s.g2?.texto === '$ -10.000,00' && s.g2.clase.includes('negativo'), JSON.stringify(s.g2))
    chk('ficha: la otra cuenta, con su propio saldo', s.b1?.texto === '$ 500,00', JSON.stringify(s.b1))
    chk('ficha: sin aviso cuando todo cierra', !/aviso-saldo-corriente/.test(h))
    chk('ficha de una persona: sin "Saldo al" (no tiene filtro de fechas)', !/saldo-apertura/.test(h))
    // El último saldo de cada cuenta coincide con v_caja_saldos_cuenta.
    const vista = { cA: -1000000, cB: 50000 }
    const r = S.estado.saldoFicha.resultado
    for (const [c, v] of Object.entries(vista)) {
      const ultimo = movs.filter(x => x.cuenta_id === c).sort((a, b) => a.fecha < b.fecha ? 1 : -1)[0]
      chk(`el último saldo de ${c} es el de la cuenta`, r.porMovimiento.get(ultimo.id) === v, r.porMovimiento.get(ultimo.id))
    }
    // La historia se pide aparte, con el conteo exacto y paginada.
    const hist = S.__consultas.filter(c => c.tabla === 'caja_movimientos' && c.opciones?.count === 'exact')
    chk('la historia se pide con el conteo exacto', hist.length === 1, hist.length)
    chk('la historia se pide por cuenta', hist[0] && hist[0].filtros.some(f => f[0] === 'in' && f[1] === 'cuenta_id' && f[2].includes('cA') && f[2].includes('cB')))
    chk('la historia se pide con range (de a 1000)', hist[0] && hist[0].rango?.[0] === 0 && hist[0].rango?.[1] === 999, hist[0] && hist[0].rango)
    chk('la historia trae lo que el orden necesita', hist[0] && /created_at/.test(hist[0].select) && /fecha/.test(hist[0].select))
    chk('la vista se lee para controlar', S.__consultas.some(c => c.tabla === 'v_caja_saldos_cuenta'))

    // No cierra: se dice y esa cuenta no muestra saldos; la otra sí.
    S.__setDatos('v_caja_saldos_cuenta', [{ cuenta_id: 'cA', saldo: 1 }, { cuenta_id: 'cB', saldo: 500 }])
    await S.cargarMovimientos('p1')
    const h2 = S.__el('detalle-persona-movimientos').innerHTML
    const s2 = saldosDelHtml(h2)
    chk('no cierra: aviso en la pantalla', /aviso-saldo-corriente/.test(h2) && /no cierra/.test(h2), h2.slice(0, 300))
    chk('no cierra: el aviso nombra la cuenta y los dos números', /Efectivo Pepa/.test(h2) && /\$ 1,00/.test(h2) && /\$ -10\.000,00/.test(h2))
    chk('no cierra: esa cuenta dice "—"', s2.i1?.texto === '—' && s2.g2?.texto === '—', JSON.stringify(s2))
    chk('no cierra: la otra cuenta sigue con su saldo', s2.b1?.texto === '$ 500,00')

    // El nombre de la cuenta va escapado en el aviso.
    S.__setDatos('v_caja_saldos_cuenta', [{ cuenta_id: 'cA', saldo: -10000 }, { cuenta_id: 'cB', saldo: 1 }])
    await S.cargarMovimientos('p1')
    const h3 = S.__el('detalle-persona-movimientos').innerHTML
    chk('aviso: el nombre de la cuenta va escapado', h3.includes(escapada('cuenta')) && !/<b data-xss=/.test(h3))

    // Incompleto: el conteo dice más filas de las que llegan.
    S.__setDatos('v_caja_saldos_cuenta', [{ cuenta_id: 'cA', saldo: -10000 }, { cuenta_id: 'cB', saldo: 500 }])
    S.__setCount(5000)
    await S.cargarMovimientos('p1')
    const h4 = S.__el('detalle-persona-movimientos').innerHTML
    chk('incompleto: se dice', /aviso-saldo-corriente/.test(h4) && /más movimientos de los que se pueden leer/.test(h4))
    chk('incompleto: ningún saldo inventado', !/Saldo \$|Saldo − /.test(h4) && /Saldo —/.test(h4))
    S.__setCount(null)

    // Error al leer.
    S.__setError('v_caja_saldos_cuenta', 'se cayó')
    await S.cargarMovimientos('p1')
    const h5 = S.__el('detalle-persona-movimientos').innerHTML
    chk('error: se dice', /No se pudo leer el saldo/.test(h5))
    chk('error: ningún saldo', !/Saldo \$/.test(h5))
    S.__setError('v_caja_saldos_cuenta', null)
  }

  // ── Paginación: más de 1000 movimientos ────────────────────────────────
  {
    const S = nuevoSandbox()
    const muchos = []
    for (let i = 0; i < 2500; i++) {
      const d = String(1 + (i % 28)).padStart(2, '0')
      muchos.push(mov('m' + String(i).padStart(5, '0'), 'cA', i % 3 ? 'ingreso' : 'egreso_gasto', 10, '2026-08-' + d,
        { created_at: '2026-08-' + d + 'T00:00:' + String(i % 60).padStart(2, '0') + '.' + String(i).padStart(6, '0') + '+00:00' }))
    }
    const total = muchos.reduce((a, m) => a + (m.tipo.startsWith('ingreso') ? 10 : -10), 0)
    S.__setDatos('caja_movimientos', muchos)
    S.__setDatos('v_caja_saldos_cuenta', [{ cuenta_id: 'cA', saldo: total }])
    const sc = await S.leerSaldoCorriente(['cA'])
    chk('2500 movimientos: se leen todos, en tres páginas', sc.estado === 'listo', sc.estado)
    const pags = S.__consultas.filter(c => c.tabla === 'caja_movimientos').map(c => c.rango && c.rango.join('-'))
    chk('las páginas piden 0-999, 1000-1999, 2000-2999', pags.join() === '0-999,1000-1999,2000-2999', pags.join())
    chk('2500 movimientos: cierra con la vista', sc.resultado.cuentas.get('cA').cierra === true)
    // Más de 20 páginas: no se lee todo y se dice.
    const T = nuevoSandbox()
    T.__setDatos('caja_movimientos', muchos)
    T.__setCount(25000)
    const sc2 = await T.leerSaldoCorriente(['cA'])
    chk('más de lo que se puede leer: incompleto', sc2.estado === 'incompleto', sc2.estado)
    // Sin conteo (la base no lo dio): no se sabe si está todo.
    const U = nuevoSandbox()
    U.__setDatos('caja_movimientos', muchos.slice(0, 10))
    U.__setDatos('v_caja_saldos_cuenta', [{ cuenta_id: 'cA', saldo: 0 }])
    U.__setSinCount(true)
    const sc3 = await U.leerSaldoCorriente(['cA'])
    chk('sin conteo: incompleto, no se supone que está todo', sc3.estado === 'incompleto', sc3.estado)
    const antes = U.__consultas.length
    chk('sin cuentas: listo y vacío', (await U.leerSaldoCorriente([])).estado === 'listo')
    chk('sin cuentas: no consulta nada', U.__consultas.length === antes)
  }

  // ── La ficha de Empresa con un filtro de período: "Saldo al" ───────────
  {
    const S = nuevoSandbox()
    S.estado.personaAbierta = 'emp'
    S.estado.filtrosFichaEmpresa = { periodos: ['sep-26'], tipos: [], cuenta_ids: [] }
    const movs = [
      mov('v1', 'cE', 'ingreso', 1000, '2026-08-10'),
      mov('v2', 'cE', 'egreso_gasto', 300, '2026-08-31'),
      mov('n1', 'cE', 'egreso_gasto', 50, '2026-09-01'),
      mov('n2', 'cE', 'egreso_gasto', 800, '2026-09-15'),
    ].map(conDesc)
    S.__setDatos('caja_movimientos', movs)
    S.__setDatos('v_caja_saldos_cuenta', [{ cuenta_id: 'cE', saldo: -150 }])
    await S.cargarMovimientosFichaEmpresa()
    const h = S.__el('detalle-persona-movimientos').innerHTML
    const s = saldosDelHtml(h)
    chk('Empresa con filtro: solo se ven los de septiembre', !('v1' in s) && 'n1' in s && 'n2' in s, Object.keys(s).join())
    chk('Empresa con filtro: el saldo de cada renglón cuenta lo de antes del filtro', s.n1?.texto === '$ 650,00', JSON.stringify(s.n1))
    chk('Empresa con filtro: queda negativa, en bordó', s.n2?.texto === '$ -150,00' && s.n2.clase.includes('negativo'), JSON.stringify(s.n2))
    chk('Empresa con filtro: el renglón "Saldo al 01/09/2026"', /saldo-apertura__titulo">Saldo al 01\/09\/2026</.test(h), h.slice(-400))
    chk('Empresa con filtro: arranca de 700 (lo de antes del 1)', /saldo-apertura__monto movimiento__saldo--positivo">\$ 700,00</.test(h), h.slice(-300))
    chk('el "Saldo al" va al final (lo más viejo, abajo)', h.indexOf('saldo-apertura') > h.lastIndexOf('tarjeta-movimiento'))
    // Sin poder leer todo, el "Saldo al" dice "—".
    S.__setCount(9999)
    await S.cargarMovimientosFichaEmpresa()
    const h2 = S.__el('detalle-persona-movimientos').innerHTML
    chk('sin toda la historia: "Saldo al" dice "—" (no se inventa)', /Saldo al 01\/09\/2026/.test(h2) && /saldo-apertura__monto saldo-apertura__monto--sin">—</.test(h2))
    S.__setCount(null)
    // Sin filtro: sin "Saldo al".
    S.estado.filtrosFichaEmpresa = { periodos: [], tipos: [], cuenta_ids: [] }
    await S.cargarMovimientosFichaEmpresa()
    chk('Empresa sin filtro: sin "Saldo al"', !/saldo-apertura/.test(S.__el('detalle-persona-movimientos').innerHTML))
  }

  // ── Retiros socios: mezcla cuentas; cada uno con el saldo de SU cuenta ──
  {
    const S = nuevoSandbox()
    S.estado.filtrosRetiros = { empleado_id: '', fecha_desde: '2026-09-01', fecha_hasta: '' }
    const movs = [
      mov('pa0', 'cA', 'ingreso', 500, '2026-08-20'),
      mov('pa1', 'cA', 'egreso_retiro', 100, '2026-09-02'),
      mov('ti0', 'cT', 'ingreso', 50, '2026-08-25'),
      mov('ti1', 'cT', 'egreso_retiro', 80, '2026-09-03'),
    ].map(conDesc)
    S.__setDatos('caja_movimientos', movs)
    S.__setDatos('v_caja_saldos_cuenta', [{ cuenta_id: 'cA', saldo: 400 }, { cuenta_id: 'cT', saldo: -30 }])
    await S.cargarRetiros()
    const h = S.__el('lista-retiros-personales').innerHTML
    const s = saldosDelHtml(h)
    chk('retiros: el de Pepa con el saldo de su cuenta', s.pa1?.texto === '$ 400,00', JSON.stringify(s.pa1))
    chk('retiros: el de Tito con el de la suya, en bordó', s.ti1?.texto === '$ -30,00' && s.ti1.clase.includes('negativo'), JSON.stringify(s.ti1))
    chk('retiros: "Saldo al 01/09/2026"', /Saldo al 01\/09\/2026/.test(h))
    chk('retiros: el "Saldo al" nombra cada cuenta con su dueño', /Pepa · Efectivo Pepa/.test(h) && /Tito · Efectivo Tito/.test(h))
    chk('retiros: "Saldo al" de Pepa 500 y de Tito 50', /Efectivo Pepa<\/span><span class="saldo-apertura__monto movimiento__saldo--positivo">\$ 500,00/.test(h) &&
      /Efectivo Tito<\/span><span class="saldo-apertura__monto movimiento__saldo--positivo">\$ 50,00/.test(h), h.slice(-500))
    // Una respuesta vieja del saldo no pisa la nueva (el turno).
    let soltar = null
    S.__setDemora((reg) => reg.tabla === 'v_caja_saldos_cuenta' && !soltar ? new Promise(r => { soltar = r }) : Promise.resolve())
    const vieja = S.cargarRetiros()
    await new Promise(r => setTimeout(r, 0))
    S.__setDemora(null)
    S.__setDatos('v_caja_saldos_cuenta', [{ cuenta_id: 'cA', saldo: 999 }, { cuenta_id: 'cT', saldo: 999 }])
    await S.cargarRetiros()
    const nuevo = S.estado.saldoRetiros
    soltar && soltar()
    await vieja
    chk('el saldo de una carga vieja no pisa el de la nueva', S.estado.saldoRetiros === nuevo)
  }

  // ── El "Saldo al" escapa el nombre de la cuenta y el de su dueño ───────
  {
    const S = nuevoSandbox()
    S.estado.nombresEmpleados.p1 = 'Pepa ' + marca('dueno')
    const r = S.calcularSaldoCorriente([mov('b1', 'cB', 'ingreso', 5, '2026-08-01')], [{ cuenta_id: 'cB', saldo: 5 }], '2026-09-01')
    const h = S.htmlAperturaSaldo({ estado: 'listo', resultado: r, desde: '2026-09-01' }, ['cB'], true)
    chk('"Saldo al": el nombre de la cuenta va escapado', h.includes(escapada('cuenta')))
    chk('"Saldo al": el nombre del dueño va escapado', h.includes(escapada('dueno')))
    chk('"Saldo al": ninguna marca cruda', !/<b data-xss=/.test(h))
    // El desde sale de un input de fecha o de un período: igual va escapado.
    const hf = S.htmlAperturaSaldo({ estado: 'cargando', desde: marca('desde') }, ['cB'])
    // (el formatearFecha de prueba parte en los guiones: se busca el "<b" suelto)
    chk('"Saldo al": la fecha del filtro también va escapada', !/<b/.test(hf) && /&lt;b/.test(hf), hf)
    const h2 = S.htmlAvisoSaldoCorriente({ estado: 'listo', resultado: S.calcularSaldoCorriente([mov('b1', 'cB', 'ingreso', 5, '2026-08-01')], []) }, ['cB'], true)
    chk('aviso con dueño: escapado y sin marca cruda', h2.includes(escapada('dueno')) && !/<b data-xss=/.test(h2))
    chk('aviso: sin la fila de la vista, dice "—" y no "$ 0"', /la cuenta dice —/.test(h2), h2)
  }

  // ── Todos los movimientos ──────────────────────────────────────────────
  {
    const S = nuevoSandbox()
    S.estado.filtrosTodosMovimientos = { periodos: ['oct-26', 'sep-26'], tipos: [], cuenta_ids: [], empleado_ids: [] }
    const movs = [
      mov('x0', 'cA', 'ingreso', 10, '2026-08-01'),
      mov('x1', 'cA', 'ingreso', 5, '2026-09-10'),
      mov('y1', 'cT', 'egreso_gasto', 3, '2026-10-02'),
    ].map(conDesc)
    S.__setDatos('caja_movimientos', movs)
    S.__setDatos('v_caja_saldos_cuenta', [{ cuenta_id: 'cA', saldo: 15 }, { cuenta_id: 'cT', saldo: -3 }])
    await S.cargarTodosMovimientos()
    const h = S.__el('lista-todos-movimientos').innerHTML
    const s = saldosDelHtml(h)
    chk('todos: cada renglón con el saldo de su cuenta', s.x1?.texto === '$ 15,00' && s.y1?.texto === '$ -3,00', JSON.stringify(s))
    chk('todos: "Saldo al" desde el período más viejo', /Saldo al 01\/09\/2026/.test(h))
  }

  // ── Los ajustes de saldo (01/10/2026): suman y restan como cualquiera ──
  {
    const S = nuevoSandbox()
    const conAjustes = [
      mov('aj0', 'cA', 'ingreso', 100, '2026-09-01'),
      mov('aj1', 'cA', 'ingreso_ajuste', 30, '2026-09-02'),
      mov('aj2', 'cA', 'egreso_ajuste', 50, '2026-09-03'),
      mov('aj3', 'cA', 'egreso_gasto', 10, '2026-09-04'),
    ]
    const r = S.calcularSaldoCorriente(conAjustes, [{ cuenta_id: 'cA', saldo: 70 }])
    chk('ajuste que suma: 100 + 30 = 130', r.porMovimiento.get('aj1') === 13000, r.porMovimiento.get('aj1'))
    chk('ajuste que resta: 130 − 50 = 80', r.porMovimiento.get('aj2') === 8000, r.porMovimiento.get('aj2'))
    chk('con ajustes de por medio, el último cierra con la vista', r.cuentas.get('cA').cierra === true && r.porMovimiento.get('aj3') === 7000)
    // De punta a punta, en la ficha de una persona.
    S.__setDatos('caja_movimientos', conAjustes.map(conDesc))
    S.__setDatos('v_caja_saldos_cuenta', [{ cuenta_id: 'cA', saldo: 70 }])
    await S.cargarMovimientos('p1')
    const h = S.__el('detalle-persona-movimientos').innerHTML
    const s = saldosDelHtml(h)
    chk('ficha con ajustes: el saldo después del ajuste que suma', s.aj1?.texto === '$ 130,00', JSON.stringify(s.aj1))
    chk('ficha con ajustes: el saldo después del ajuste que resta', s.aj2?.texto === '$ 80,00', JSON.stringify(s.aj2))
    chk('ficha con ajustes: cierra (sin aviso) y el último da la vista', !/aviso-saldo-corriente/.test(h) && s.aj3?.texto === '$ 70,00', JSON.stringify(s.aj3))
    // Si la vista no contara los ajustes, no cerraría: se dice y no se muestra.
    S.__setDatos('v_caja_saldos_cuenta', [{ cuenta_id: 'cA', saldo: 90 }])
    await S.cargarMovimientos('p1')
    const h2 = S.__el('detalle-persona-movimientos').innerHTML
    chk('ajustes que no cierran con la vista: aviso y "—"', /no cierra/.test(h2) && saldosDelHtml(h2).aj3?.texto === '—')
  }

  // ── Con una empresa elegida: el saldo es el de la cuenta ENTERA ────────
  // La ficha de Empresa trae todo lo de Nuss, también lo que salió de la caja
  // de una persona (Tito, de Dolce). El saldo de cada renglón es el de SU
  // cuenta con toda su historia, sin el filtro de empresa ni de fechas.
  {
    const NUSS = 'u-n', DOLCE = 'u-d'
    const movsEmp = [
      mov('t0', 'cT', 'ingreso', 1000, '2026-08-01', { unidad_negocio_id: DOLCE }),
      mov('t1', 'cT', 'egreso_gasto', 200, '2026-09-05', { unidad_negocio_id: NUSS }),
      mov('t2', 'cT', 'egreso_retiro', 100, '2026-09-10', { unidad_negocio_id: DOLCE }),
      mov('e0', 'cE', 'ingreso', 500, '2026-08-01', { unidad_negocio_id: NUSS }),
      mov('e1', 'cE', 'ingreso_ajuste', 50, '2026-09-02', { unidad_negocio_id: NUSS }),
      mov('e2', 'cE', 'egreso_ajuste', 20, '2026-09-03', { unidad_negocio_id: NUSS }),
      // Una cuenta que no se conoce (no se sabe de quién es): sin saldo.
      mov('x1', 'cX', 'egreso_gasto', 7, '2026-09-06', { unidad_negocio_id: NUSS }),
    ].map(conDesc)
    const vistaEmp = [{ cuenta_id: 'cT', saldo: 700 }, { cuenta_id: 'cE', saldo: 530 }, { cuenta_id: 'cX', saldo: -7 }]
    const armar = (unidad, periodos = []) => {
      const S = nuevoSandbox()
      S.estado.personaAbierta = 'emp'
      S.estado.unidadElegida = unidad
      S.estado.filtrosFichaEmpresa = { periodos, tipos: [], cuenta_ids: [] }
      S.__setDatos('caja_movimientos', movsEmp)
      S.__setDatos('v_caja_saldos_cuenta', vistaEmp)
      return S
    }
    const S = armar(NUSS)
    await S.cargarMovimientosFichaEmpresa()
    chk('con Nuss elegido: modo "toda la unidad"', S.estado.movimientosPorUnidad === NUSS)
    const h = S.__el('detalle-persona-movimientos').innerHTML
    const s = saldosDelHtml(h)
    chk('con Nuss: se ve el gasto de Nuss de la caja de Tito y no lo de Dolce', 't1' in s && !('t0' in s) && !('t2' in s), Object.keys(s).join())
    chk('el saldo del gasto de Nuss es el de la cuenta ENTERA de Tito (800), no el de lo filtrado', s.t1?.texto === '$ 800,00', JSON.stringify(s.t1))
    chk('Empresa con ajustes: después del que suma 550, del que resta 530', s.e1?.texto === '$ 550,00' && s.e2?.texto === '$ 530,00', JSON.stringify([s.e1, s.e2]))
    chk('un renglón de una cuenta que no se puede leer entera: sin saldo (ni "—")', 'x1' in s && s.x1 === null, JSON.stringify(s.x1))
    chk('…y ningún aviso por esa cuenta', !/aviso-saldo-corriente/.test(h), h.slice(0, 200))
    const hist = S.__consultas.filter(c => c.tabla === 'caja_movimientos' && c.opciones?.count === 'exact')
    chk('la historia del saldo NO se filtra por empresa', hist.length > 0 && hist.every(c => !c.filtros.some(f => f[1] === 'unidad_negocio_id')), JSON.stringify(hist.map(c => c.filtros)))
    const idsHist = hist[0]?.filtros.find(f => f[0] === 'in' && f[1] === 'cuenta_id')?.[2] || []
    chk('la historia se pide para las cuentas que se pueden leer (Tito y Empresa), no para la desconocida', idsHist.includes('cT') && idsHist.includes('cE') && !idsHist.includes('cX'), idsHist.join())
    // Con un filtro de fechas el saldo del renglón no cambia, y "Saldo al" cuenta lo de antes.
    const F = armar(NUSS, ['sep-26'])
    await F.cargarMovimientosFichaEmpresa()
    const hf = F.__el('detalle-persona-movimientos').innerHTML
    chk('con filtro de fechas, el mismo renglón dice el mismo saldo (800)', saldosDelHtml(hf).t1?.texto === '$ 800,00', JSON.stringify(saldosDelHtml(hf).t1))
    chk('"Saldo al 01/09/2026" de la cuenta de Tito: 1.000 (con lo de Dolce de agosto)', /Tito · Efectivo Tito<\/span><span class="saldo-apertura__monto movimiento__saldo--positivo">\$ 1\.000,00/.test(hf), hf.slice(-600))
    chk('el "Saldo al" no nombra la cuenta que no se puede leer', /saldo-apertura__titulo/.test(hf) && !/saldo-apertura__cuenta">una cuenta</.test(hf), hf.slice(-600))
    // Con Dolce elegido: el retiro de Tito, con el saldo de toda su cuenta.
    const D = armar(DOLCE)
    await D.cargarMovimientosFichaEmpresa()
    const sd = saldosDelHtml(D.__el('detalle-persona-movimientos').innerHTML)
    chk('con Dolce: el retiro de Tito dice 700 (la cuenta entera) y el gasto de Nuss no está', sd.t2?.texto === '$ 700,00' && !('t1' in sd), JSON.stringify(sd))
  }

  // ── ¿Qué cuenta se puede mostrar en una lista que mezcla cajas? ────────
  {
    const S = nuevoSandbox()
    S.estado.miEmpleado = { id: 'p1', nombre: 'Pepa', rol_app: 'usuario' }
    S.estado.misTareasCaja = new Set(['ver_empresa'])
    chk('sin poder leer todas las cajas: la cuenta propia sí', S.cuentaConSaldoLegible('cA') === true)
    chk('sin poder leer todas las cajas: la de otra persona no', S.cuentaConSaldoLegible('cT') === false)
    chk('una cuenta que no se conoce: no', S.cuentaConSaldoLegible('cX') === false && S.cuentaConSaldoLegible(null) === false)
    S.estado.misTareasCaja = new Set(['ver_empresa', 'movimientos_todos'])
    chk('con movimientos_todos: la de otra persona sí', S.cuentaConSaldoLegible('cT') === true)
  }

  // ── El código: lo que no se ve ejecutando ──────────────────────────────
  {
    const fila = extraerFn(SRC, 'renderizarFilaMovimiento')
    chk('la fila usa la misma regla de signo que el saldo', /startsWith\('ingreso'\)/.test(fila) && /startsWith\('ingreso'\)/.test(extraerFn(SRC, 'efectoEnSaldo')))
    let base = ''
    try { base = execFileSync('git', ['show', `${BASE}:modulos/caja.html`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 1 << 26 }) } catch (e) { base = '' }
    chk(`se pudo leer el baseline fijo ${BASE}`, base.length > 100000, base.length)
    chk('el baseline no tenía saldo corriente', !/movimiento__saldo/.test(base))
    chk('ahora sí: las tres listas lo piden', /saldo: legible\(m\) \? sc : null \}/.test(extraerFn(SRC, 'renderizarMovimientos')) &&
      /saldo: sc \}/.test(extraerFn(SRC, 'renderizarRetiros')) && /saldo: sc \}/.test(extraerFn(SRC, 'renderizarTodosMovimientos')))
  }
}

esperas.push(casos())
fin()
