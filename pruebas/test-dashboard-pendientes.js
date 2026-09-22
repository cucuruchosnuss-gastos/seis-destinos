// Burbujas de pendientes del dashboard (mis_pendientes). Se EJECUTAN las
// funciones reales de dashboard.html con la RPC mockeada y un DOM falso.
//
//   node pruebas/test-dashboard-pendientes.js
//   ARCHIVO_TEST=/otra/copia.html node pruebas/test-dashboard-pendientes.js

const fs = require('fs')
const path = require('path')
const { extraerFn, extraerConst } = require('./extraer')

const RUTA = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'dashboard.html')
const html = fs.readFileSync(RUTA, 'utf8')
console.log(`LEIDO:${html.length} de ${RUTA}`)
console.log(`ARCHIVO ${RUTA} (${html.length} bytes)`)
const ini = html.indexOf('<script type="module">')
const src = html.slice(ini, html.indexOf('</script>', ini))

let ok = 0
const fallas = []
function chk(nombre, cond, detalle) { if (cond) ok++; else fallas.push(nombre + (detalle !== undefined ? ` — ${detalle}` : '')) }

const FUNCIONES = ['moduloVisible', 'escDash', 'textoPendiente', 'agruparPendientes', 'htmlBurbuja', 'pintarBurbujas', 'cargarPendientes']
let codigo = `
  var __tarjetas = []
  var __rpc = async () => ({ data: [], error: null })
  var __avisos = []
  var console = { warn: (...a) => __avisos.push(a.join(' ')), error: () => {}, log: () => {} }
  function tarjetaFalsa(clave) {
    const t = { dataset: { clave }, hijos: [],
      insertAdjacentHTML(pos, h) { this.hijos.push(h) } }
    return t
  }
  var document = {
    querySelectorAll(sel) {
      if (sel === '.tarjeta-modulo__burbuja') return __tarjetas.flatMap(t => t.hijos.map((h, i) => ({ remove() { t.hijos = t.hijos.filter(x => x !== h) } })))
      if (sel === '.tarjeta-modulo[data-clave]') return __tarjetas
      return []
    },
  }
  var supabase = { rpc: (...a) => __rpc(...a) }
  var turnoPendientes = 0
`
codigo += extraerConst(src, 'MODULO_DE_PENDIENTE')
codigo += extraerConst(src, 'MODULOS')
for (const f of FUNCIONES) codigo += extraerFn(src, f) + '\n'
codigo += `return { ${FUNCIONES.join(', ')}, MODULO_DE_PENDIENTE, MODULOS,
  __setTarjetas(c) { __tarjetas = c.map(tarjetaFalsa); return __tarjetas }, __setRpc(f) { __rpc = f }, __avisos }`
const S = new Function(codigo)()

// --- el mapeo de nombres ---------------------------------------------------
const clavesTarjeta = new Set(S.MODULOS.map(m => m.clave))
// Los módulos que devuelve la RPC, leídos de su cuerpo el 22/09/2026
// (pg_get_functiondef de public.mis_pendientes).
const DE_LA_RPC = ['cobranzas', 'cheques', 'accesos', 'materia_prima', 'gastos', 'cuentas_corrientes', 'stock', 'caja']
for (const m of DE_LA_RPC) {
  chk(`el módulo «${m}» de la RPC está mapeado`, !!S.MODULO_DE_PENDIENTE[m])
  chk(`«${m}» apunta a una tarjeta que existe`, clavesTarjeta.has(S.MODULO_DE_PENDIENTE[m]), S.MODULO_DE_PENDIENTE[m])
}
chk('materia_prima (guión bajo) → materia-prima (guión medio)', S.MODULO_DE_PENDIENTE.materia_prima === 'materia-prima')
chk('cuentas_corrientes → cuentas-corrientes', S.MODULO_DE_PENDIENTE.cuentas_corrientes === 'cuentas-corrientes')
chk('cheques (por_vencer) → la tarjeta de Cheques', S.MODULO_DE_PENDIENTE.cheques === 'cheques')

// --- la tarjeta de Cheques: módulo cobranzas Y (ver_todo o procesar) --------
{
  const cheques = S.MODULOS.find(m => m.clave === 'cheques')
  chk('hay tarjeta de Cheques que abre modulos/cheques.html', cheques && cheques.url === 'modulos/cheques.html')
  const ver = (ctx) => S.moduloVisible(cheques, { esAdmin: false, esSuperAdmin: false, misModulos: [], misTareas: new Set(), ...ctx })
  chk('Cheques: sin el módulo cobranzas no se ve, aunque tenga la tarea',
    !ver({ misTareas: new Set(['cobranzas:procesar']) }))
  chk('Cheques: con cobranzas y solo "cargar" no se ve',
    !ver({ misModulos: ['cobranzas'], misTareas: new Set(['cobranzas:cargar']) }))
  chk('Cheques: con cobranzas y ver_todo se ve', ver({ misModulos: ['cobranzas'], misTareas: new Set(['cobranzas:ver_todo']) }))
  chk('Cheques: con cobranzas y procesar se ve', ver({ misModulos: ['cobranzas'], misTareas: new Set(['cobranzas:procesar']) }))
  chk('Cheques: una fila "cheques" en empleado_modulos NO alcanza (cuelga de cobranzas)',
    !ver({ misModulos: ['cheques'], misTareas: new Set(['cobranzas:procesar']) }))
  chk('Cheques: super_admin la ve (bypass, como tiene_tarea)', ver({ esAdmin: true, esSuperAdmin: true }))
  chk('Cheques: un "admin" viejo sin la tarea no la ve', !ver({ esAdmin: true }))
  // Las demás tarjetas no cambiaron de regla.
  const gastos = S.MODULOS.find(m => m.clave === 'gastos')
  chk('Gastos: se sigue viendo solo con su módulo', S.moduloVisible(gastos, { esAdmin: false, esSuperAdmin: false, misModulos: ['gastos'], misTareas: new Set() }) &&
    !S.moduloVisible(gastos, { esAdmin: false, esSuperAdmin: false, misModulos: [], misTareas: new Set() }))
  const accesos = S.MODULOS.find(m => m.clave === 'accesos')
  chk('Accesos: solo super_admin', !S.moduloVisible(accesos, { esAdmin: true, esSuperAdmin: false, misModulos: ['accesos'], misTareas: new Set() }) &&
    S.moduloVisible(accesos, { esAdmin: true, esSuperAdmin: true, misModulos: [], misTareas: new Set() }))
}

// --- agrupar --------------------------------------------------------------
{
  const g = S.agruparPendientes([
    { modulo: 'cobranzas', clave: 'por_controlar', cantidad: 5, texto: 'Cobranzas por controlar' },
    { modulo: 'materia_prima', clave: 'pagado_sin_ingresar', cantidad: 2, texto: 'Pagado sin ingresar' },
    { modulo: 'materia_prima', clave: 'insumos_por_revisar', cantidad: 3, texto: 'Insumos nuevos por revisar' },
    { modulo: 'caja', clave: 'x', cantidad: 0, texto: 'Movimientos por aceptar' },
    { modulo: 'gastos', clave: 'x', cantidad: null, texto: 'Facturas' },
    { modulo: 'stock', clave: 'x', cantidad: '4', texto: 'Transferencias por aceptar' },
    { modulo: 'modulo_inventado', clave: 'x', cantidad: 9, texto: '<b>' },
  ])
  chk('cobranzas suma 5', g.get('cobranzas')?.total === 5)
  chk('el detalle dice "5 cobranzas por controlar"', g.get('cobranzas')?.detalle[0] === '5 cobranzas por controlar', g.get('cobranzas')?.detalle[0])
  chk('materia-prima suma sus dos filas: 5', g.get('materia-prima')?.total === 5)
  chk('materia-prima lleva los dos detalles', g.get('materia-prima')?.detalle.length === 2)
  chk('caja con 0 no tiene burbuja', !g.has('caja'))
  chk('una cantidad null no se vuelve 0 ni un número', !g.has('gastos'))
  chk('bigint como texto "4" (PostgREST) se lee', g.get('stock')?.total === 4)
  chk('un módulo que no existe se ignora', ![...g.keys()].some(k => /inventado/.test(k)) && g.size === 3)
  chk('y se avisa por consola', S.__avisos.some(a => /modulo_inventado/.test(a)))
}

// --- htmlBurbuja ----------------------------------------------------------
{
  chk('sin datos → nada', S.htmlBurbuja(undefined) === '')
  chk('total 0 → nada', S.htmlBurbuja({ total: 0, detalle: [] }) === '')
  const h = S.htmlBurbuja({ total: 5, detalle: ['5 cobranzas por controlar'] })
  chk('muestra el número', />5<\/span>$/.test(h), h)
  chk('aria-label con el detalle', h.includes('aria-label="5 cobranzas por controlar"'))
  chk('title con el detalle', h.includes('title="5 cobranzas por controlar"'))
  chk('más de 99 → "99+"', />99\+</.test(S.htmlBurbuja({ total: 150, detalle: ['x'] })))
  const mal = S.htmlBurbuja({ total: 1, detalle: ['1 "><img src=x onerror=alert(1)>'] })
  chk('el texto va escapado', !mal.includes('<img') && mal.includes('&quot;&gt;&lt;img'), mal)
}

// --- con la RPC: datos, cero, error, módulo inexistente ------------------
const esperas = []
async function correr(nombre, rpc, verificar) {
  const tarjetas = S.__setTarjetas(['gastos', 'caja', 'accesos', 'cobranzas', 'materia-prima', 'stock', 'cuentas-corrientes'])
  S.__setRpc(rpc)
  await S.cargarPendientes()
  await verificar(tarjetas, nombre)
}
const porClave = (ts, c) => ts.find(t => t.dataset.clave === c).hijos
esperas.push((async () => {
  await correr('con datos', async () => ({ data: [
    { modulo: 'cobranzas', clave: 'por_controlar', cantidad: 5, texto: 'Cobranzas por controlar' },
    { modulo: 'accesos', clave: 'solicitudes', cantidad: 2, texto: 'Solicitudes de acceso' },
    { modulo: 'caja', clave: 'solicitudes_por_aceptar', cantidad: 0, texto: 'Movimientos por aceptar' },
  ], error: null }), (ts) => {
    chk('con datos: cobranzas tiene su burbuja', porClave(ts, 'cobranzas').length === 1 && />5</.test(porClave(ts, 'cobranzas')[0]))
    chk('con datos: accesos tiene su burbuja', porClave(ts, 'accesos').length === 1)
    chk('con datos: caja en 0 no tiene', porClave(ts, 'caja').length === 0)
    chk('con datos: gastos sin fila no tiene', porClave(ts, 'gastos').length === 0)
  })
  // Repintar no duplica
  await correr('con datos dos veces', async () => ({ data: [{ modulo: 'stock', clave: 'x', cantidad: 1, texto: 'Transferencias por aceptar' }], error: null }), async (ts) => {
    await S.cargarPendientes()
    chk('volver a cargar no duplica la burbuja', porClave(ts, 'stock').length === 1)
  })
  await correr('con cero', async () => ({ data: [
    { modulo: 'cobranzas', clave: 'por_controlar', cantidad: 0, texto: 'Cobranzas por controlar' },
  ], error: null }), (ts) => {
    chk('con cero: ninguna burbuja', ts.every(t => t.hijos.length === 0))
  })
  // Error: primero hay burbujas, después falla → no queda ninguna (nunca un número viejo)
  {
    const tarjetas = S.__setTarjetas(['cobranzas'])
    S.__setRpc(async () => ({ data: [{ modulo: 'cobranzas', clave: 'x', cantidad: 3, texto: 'Cobranzas por controlar' }], error: null }))
    await S.cargarPendientes()
    chk('antes del error había burbuja', tarjetas[0].hijos.length === 1)
    S.__setRpc(async () => ({ data: null, error: { message: 'sin red' } }))
    await S.cargarPendientes()
    chk('con error: se saca la burbuja vieja', tarjetas[0].hijos.length === 0)
    S.__setRpc(async () => { throw new Error('red caída') })
    await S.cargarPendientes()
    chk('con excepción: ninguna burbuja', tarjetas[0].hijos.length === 0)
  }
  await correr('módulo inexistente', async () => ({ data: [{ modulo: 'produccion', clave: 'x', cantidad: 7, texto: 'Algo' }], error: null }), (ts) => {
    chk('módulo inexistente: ninguna burbuja', ts.every(t => t.hijos.length === 0))
  })
  // Respuesta vieja que llega tarde no pisa la nueva
  {
    const tarjetas = S.__setTarjetas(['cobranzas'])
    let soltar
    S.__setRpc(() => new Promise(r => { soltar = () => r({ data: [{ modulo: 'cobranzas', clave: 'x', cantidad: 9, texto: 'Viejo' }], error: null }) }))
    const vieja = S.cargarPendientes()
    S.__setRpc(async () => ({ data: [{ modulo: 'cobranzas', clave: 'x', cantidad: 1, texto: 'Nuevo' }], error: null }))
    await S.cargarPendientes()
    soltar(); await vieja
    chk('la respuesta vieja no pisa la nueva', tarjetas[0].hijos.length === 1 && />1</.test(tarjetas[0].hijos[0]), tarjetas[0].hijos.join())
  }
})())

// --- estático: una sola llamada al abrir, otra al volver a la pestaña -----
{
  const sinComentarios = src.replace(/^\s*\/\/.*$/gm, '')
  chk('se llama al abrir', /\n\s*cargarPendientes\(\)\n/.test(sinComentarios))
  chk('se llama al volver a la pestaña', /visibilitychange[\s\S]{0,120}visibilityState === 'visible'\) cargarPendientes\(\)/.test(sinComentarios))
  chk('la consulta vieja a solicitudes_acceso ya no está', !/from\('solicitudes_acceso'\)/.test(sinComentarios))
  chk('cada tarjeta lleva data-clave', /class="tarjeta-modulo" data-clave="\$\{modulo\.clave\}"/.test(src))
}

Promise.all(esperas).catch(e => chk('rama async sin excepción', false, e && e.stack)).then(() => {
  console.log(fallas.map(f => '  ✗ ' + f).join('\n'))
  console.log(`${ok}/${ok + fallas.length} ${fallas.length ? 'ROJO' : 'verde'}`)
  process.exit(fallas.length ? 1 : 0)
})
