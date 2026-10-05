// Stock se actualiza solo (02/10/2026) — modulos/stock.html.
//
// Exige:
//  - el texto "Actualizado hace X min" (recién / min / h; sin dato no dice nada);
//  - que refresque (relea el stock y la vista abierta) al pedirlo, al volver a
//    la pestaña y cada 2 minutos, pero no dos veces seguidas en 15 segundos;
//  - que NUNCA refresque con un formulario abierto (un modal, un recuento con
//    filas sin guardar o guardando, el foco en un campo del recuento, el
//    traspaso): ahí solo pregunta si cambió el stock y, si cambió, dice
//    "Hay datos nuevos" con el botón;
//  - que el botón sí refresque, y en el recuento GUARDE antes;
//  - que un error no muestre un número viejo como si fuera nuevo: dice "No se
//    pudo actualizar" y no mueve la hora;
//  - sin señal no lo intenta solo.
//
// Se EJECUTA el código real (funciones extraídas del <script>) con un DOM y un
// supabase falsos. Archivo bajo prueba: ARCHIVO_TEST, o modulos/stock.html.

const path = require('path')
const { construirCon, scriptModulo } = require('./sandbox')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/stock.html')
const { leer } = require('./circuito-comun')
const HTML = leer(ARCHIVO)
const SCRIPT = scriptModulo(ARCHIVO)

let ok = 0
const fallas = []
function chk(nombre, condicion, detalle) {
  if (condicion) ok++
  else fallas.push(nombre + (detalle !== undefined ? ` — ${typeof detalle === 'string' ? detalle : JSON.stringify(detalle)}` : ''))
}

const PRELUDIO = `
  var console = { log(){}, warn(){}, error(){} }
  function elemento(id) {
    const clases = new Set()
    return { id, hidden: false, innerHTML: '', textContent: '', disabled: false, dataset: {},
      classList: { toggle(c, on) { if (on) clases.add(c); else clases.delete(c) }, contains: c => clases.has(c) } }
  }
  var __els = new Map()
  var __modales = []
  var document = {
    visibilityState: 'visible',
    activeElement: null,
    getElementById(id) { if (!__els.has(id)) __els.set(id, elemento(id)); return __els.get(id) },
    querySelectorAll(sel) { return sel === '.modal-stock' ? __modales : [] },
  }
  var __ahora = 1_000_000_000
  var Date = { now: () => __ahora }
  var navigator = { onLine: true }
  var __intervalos = []
  function setInterval(fn, ms) { __intervalos.push({ fn, ms }) }

  // El stock que devuelve la base AHORA (lo cambia la prueba).
  var __baseStock = [{ unidad_negocio_id: 'u1', insumo_id: 'i1', cantidad_total: 100 }]
  var __errorHuella = null
  var __consultasHuella = 0
  var supabase = {
    from(t) {
      return { select(cols) {
        __consultasHuella++
        return Promise.resolve(__errorHuella ? { data: null, error: __errorHuella } : { data: __baseStock.map(f => ({ ...f })), error: null })
      } }
    },
  }
  var __llamadas = []
  var __falla = new Set()
  async function cargarStock(o) {
    __llamadas.push('stock' + (o && o.silencioso ? ':silencioso' : ''))
    if (__falla.has('stock')) return false
    estado.stock = __baseStock.map(f => ({ ...f }))
    return true
  }
  async function cargarInsumos() { __llamadas.push('insumos') }
  async function cargarItemsRecuento() { __llamadas.push('items') }
  async function cargarRecuento() { __llamadas.push('recuento') }
  async function cargarHistorial() { __llamadas.push('historial') }
  async function cargarMermas() { __llamadas.push('mermas') }
  async function cargarTransito() { __llamadas.push('transito') }
  async function cargarPendientesStock() { __llamadas.push('pendientes') }
  async function guardarConteoAhora() { __llamadas.push('guardar'); if (!__falla.has('guardar')) estado.sucios.clear() }
  function renderizarChipsFiltroRec() { __llamadas.push('chips-rec') }
  function renderizarItemsRecuento() { __llamadas.push('render-rec') }
  function puedeVerStock() { return __verStock }
  function puedeGestionar() { return __gestiona }
  var __verStock = true, __gestiona = false
  function sinUnidadesDePrueba(filas) { return filas }

  var estado = {
    miEmpleadoId: 'e-1', vista: 'stock', cargados: new Set(['stock']),
    stock: [{ unidad_negocio_id: 'u1', insumo_id: 'i1', cantidad_total: 100 }],
    sucios: new Set(), guardando: false, recuento: null, fabrica: null,
  }
`

const FUNCIONES = [
  'textoActualizado', 'huellaStock', 'hayFormularioAbierto', 'pintarActualizado',
  'stockCambio', 'recargarLoVisible', 'actualizarStock', 'iniciarActualizacionSola',
]
const CONSTANTES = ['CADA_REFRESCO_MS', 'MINIMO_ENTRE_REFRESCOS_MS', 'CADA_RELOJ_MS', 'auto']

function nuevo() {
  return construirCon(ARCHIVO, {
    preludio: PRELUDIO, funciones: FUNCIONES, constantes: CONSTANTES,
    retorno: `estado, auto, document, navigator, __els, __modales, __llamadas, __falla, __intervalos,
      __avanzar(ms){ __ahora += ms }, __setBase(f){ __baseStock = f }, __setErrorHuella(e){ __errorHuella = e },
      __consultas(){ return __consultasHuella }, __setPermisos(v, g){ __verStock = v; __gestiona = g },
      CADA_REFRESCO_MS, MINIMO_ENTRE_REFRESCOS_MS`,
  })
}
const texto = s => s.__els.get('stock-actualizado-texto')?.textContent
const caja = s => s.__els.get('stock-actualizado')

async function main() {
  // ── 1. El texto de "hace cuánto" ─────────────────────────────────────────
  {
    const s = nuevo()
    chk('sin hora no dice nada', s.textoActualizado(null, 5) === '')
    chk('NaN no dice nada', s.textoActualizado(NaN, 5) === '')
    chk('menos de un minuto: recién', s.textoActualizado(0, 59_999) === 'Actualizado recién')
    chk('un minuto', s.textoActualizado(0, 60_000) === 'Actualizado hace 1 min')
    chk('59 minutos', s.textoActualizado(0, 59 * 60_000 + 59_000) === 'Actualizado hace 59 min')
    chk('una hora', s.textoActualizado(0, 60 * 60_000) === 'Actualizado hace 1 h')
    chk('el reloj del celular atrasado no da negativo', s.textoActualizado(10_000, 0) === 'Actualizado recién')
    chk('cada 2 minutos', s.CADA_REFRESCO_MS === 120_000)
    chk('no dos en 15 segundos', s.MINIMO_ENTRE_REFRESCOS_MS === 15_000)
  }

  // ── 2. La huella: cambia con la cantidad, no con el orden ────────────────
  {
    const s = nuevo()
    const a = [{ unidad_negocio_id: 'u1', insumo_id: 'i1', cantidad_total: 5 }, { unidad_negocio_id: 'u2', insumo_id: 'i1', cantidad_total: 7 }]
    chk('el orden no cuenta', s.huellaStock(a) === s.huellaStock([a[1], a[0]]))
    chk('otra cantidad es otra huella', s.huellaStock(a) !== s.huellaStock([a[0], { ...a[1], cantidad_total: 8 }]))
    chk('otro insumo es otra huella', s.huellaStock(a) !== s.huellaStock([a[0]]))
    chk('la misma cantidad en otra unidad es otra huella',
      s.huellaStock([{ unidad_negocio_id: 'u1', insumo_id: 'i1', cantidad_total: 5 }]) !== s.huellaStock([{ unidad_negocio_id: 'u2', insumo_id: 'i1', cantidad_total: 5 }]))
    chk('null no rompe', s.huellaStock(null) === '')
  }

  // ── 3. Arranque: la línea aparece con "recién" y se programan los relojes ─
  {
    const s = nuevo()
    s.iniciarActualizacionSola()
    chk('la línea se ve', caja(s).hidden === false)
    chk('dice recién', texto(s) === 'Actualizado recién', texto(s))
    chk('se programa el refresco de 2 minutos', s.__intervalos.some(i => i.ms === 120_000))
    chk('se programa el reloj del texto', s.__intervalos.some(i => i.ms === 30_000))
    s.__avanzar(3 * 60_000)
    s.__intervalos.find(i => i.ms === 30_000).fn()
    chk('el reloj reescribe el texto', texto(s) === 'Actualizado hace 3 min', texto(s))
  }

  // ── 4. Refresca lo visible y mueve la hora ───────────────────────────────
  {
    const s = nuevo()
    s.iniciarActualizacionSola()
    s.__avanzar(5 * 60_000)
    s.__setBase([{ unidad_negocio_id: 'u1', insumo_id: 'i1', cantidad_total: 80 }])
    await s.actualizarStock()
    chk('relee el stock en silencio', s.__llamadas.includes('stock:silencioso'), s.__llamadas)
    chk('relee las burbujas', s.__llamadas.includes('pendientes'))
    chk('no relee vistas que no están abiertas', !s.__llamadas.some(l => ['historial', 'mermas', 'transito', 'insumos', 'items', 'recuento'].includes(l)), s.__llamadas)
    chk('dibuja el stock nuevo', s.estado.stock[0].cantidad_total === 80)
    chk('vuelve a decir recién', texto(s) === 'Actualizado recién', texto(s))
    chk('el botón queda habilitado', s.__els.get('btn-actualizar-stock').disabled === false)
  }

  // ── 5. Cada vista abierta relee lo suyo ──────────────────────────────────
  for (const [vista, esperado] of [['historial', 'historial'], ['mermas', 'mermas'], ['transito', 'transito']]) {
    const s = nuevo()
    s.iniciarActualizacionSola()
    s.__avanzar(60_000)
    s.estado.vista = vista
    await s.actualizarStock()
    chk(`la vista ${vista} se relee`, s.__llamadas.includes(esperado), s.__llamadas)
  }
  {
    const s = nuevo()
    s.iniciarActualizacionSola()
    s.__avanzar(60_000)
    s.estado.vista = 'catalogo'
    await s.actualizarStock()
    chk('el catálogo sin gestionar no se relee', !s.__llamadas.includes('insumos'))
    const t = nuevo()
    t.__setPermisos(true, true)
    t.iniciarActualizacionSola()
    t.__avanzar(60_000)
    t.estado.vista = 'catalogo'
    await t.actualizarStock()
    chk('el catálogo con gestionar se relee', t.__llamadas.includes('insumos'))
  }
  {
    // Recuento abierto y limpio: relee los ítems y redibuja.
    const s = nuevo()
    s.iniciarActualizacionSola()
    s.__avanzar(60_000)
    s.estado.vista = 'recuento'
    s.estado.cargados.add('recuento')
    s.estado.recuento = { id: 'r1' }
    await s.actualizarStock()
    chk('recuento limpio: relee los ítems', s.__llamadas.includes('items'))
    chk('recuento limpio: redibuja', s.__llamadas.includes('render-rec') && s.__llamadas.includes('chips-rec'))
    const t = nuevo()
    t.iniciarActualizacionSola()
    t.__avanzar(60_000)
    t.estado.vista = 'recuento'
    t.estado.cargados.add('recuento')
    await t.actualizarStock()
    chk('sin recuento abierto: busca si alguien abrió uno', t.__llamadas.includes('recuento'))
  }

  // ── 6. No dos seguidos (focus + visibilitychange) ────────────────────────
  {
    const s = nuevo()
    s.iniciarActualizacionSola()
    await s.actualizarStock()
    chk('apenas arrancó no relee', s.__llamadas.length === 0, s.__llamadas)
    s.__avanzar(20_000)
    await s.actualizarStock()
    const n = s.__llamadas.length
    await s.actualizarStock()
    chk('dos seguidas: la segunda no hace nada', s.__llamadas.length === n && n > 0, s.__llamadas)
    await s.actualizarStock({ forzado: true })
    chk('el botón no espera los 15 segundos', s.__llamadas.length > n)
  }

  // ── 7. Sin señal no lo intenta solo; el botón sí ─────────────────────────
  {
    const s = nuevo()
    s.iniciarActualizacionSola()
    s.__avanzar(60_000)
    s.navigator.onLine = false
    await s.actualizarStock()
    chk('sin señal no relee solo', s.__llamadas.length === 0)
    await s.actualizarStock({ forzado: true })
    chk('sin señal el botón igual intenta', s.__llamadas.includes('stock:silencioso'))
  }

  // ── 8. NUNCA refresca con un formulario abierto ──────────────────────────
  const casos = [
    ['un modal abierto', s => { s.__modales.push({ hidden: false }) }],
    ['un recuento con filas sin guardar', s => { s.estado.sucios.add('it-1') }],
    ['un recuento guardando', s => { s.estado.guardando = true }],
    ['el traspaso', s => { s.estado.vista = 'traspaso' }],
    ['el foco en un campo del recuento', s => {
      s.document.activeElement = { tagName: 'INPUT', closest: sel => sel === '#vista-recuento' ? {} : null }
    }],
  ]
  for (const [nombre, preparar] of casos) {
    const s = nuevo()
    s.iniciarActualizacionSola()
    s.__avanzar(5 * 60_000)
    preparar(s)
    s.__setBase([{ unidad_negocio_id: 'u1', insumo_id: 'i1', cantidad_total: 40 }])
    await s.actualizarStock()
    chk(`${nombre}: no relee nada`, !s.__llamadas.some(l => l.startsWith('stock') || l === 'pendientes' || l === 'items'), s.__llamadas)
    chk(`${nombre}: no cambia lo dibujado`, s.estado.stock[0].cantidad_total === 100)
    chk(`${nombre}: dice "Hay datos nuevos"`, texto(s) === 'Hay datos nuevos', texto(s))
    chk(`${nombre}: el botón se destaca`, caja(s).classList.contains('stock-actualizado--nuevos'))
    // Cerrado el formulario, el próximo refresco dibuja lo nuevo y el aviso se va.
    s.__modales.length = 0
    s.estado.sucios.clear()
    s.estado.guardando = false
    s.estado.vista = 'stock'
    s.document.activeElement = null
    s.__avanzar(20_000)
    await s.actualizarStock()
    chk(`${nombre}: al cerrarlo se dibuja lo nuevo`, s.estado.stock[0].cantidad_total === 40)
    chk(`${nombre}: y el aviso se va`, texto(s) === 'Actualizado recién' && !caja(s).classList.contains('stock-actualizado--nuevos'), texto(s))
  }
  {
    // Un modal CERRADO no frena; un campo FUERA del recuento (el buscador) tampoco.
    const s = nuevo()
    s.__modales.push({ hidden: true })
    s.document.activeElement = { tagName: 'INPUT', closest: () => null }
    chk('modal cerrado y buscador con foco: no es un formulario', s.hayFormularioAbierto() === false)
    s.document.activeElement = { tagName: 'BUTTON', closest: sel => sel === '#vista-recuento' ? {} : null }
    chk('un botón con foco en el recuento no frena', s.hayFormularioAbierto() === false)
  }
  {
    // Con un formulario abierto y SIN cambios: no inventa "datos nuevos".
    const s = nuevo()
    s.iniciarActualizacionSola()
    s.__avanzar(5 * 60_000)
    s.estado.sucios.add('it-1')
    await s.actualizarStock()
    chk('sin cambios no dice que hay datos nuevos', texto(s) === 'Actualizado hace 5 min', texto(s))
    chk('pregunta solo con una consulta', s.__consultas() === 1)
    // Si no se pudo preguntar, tampoco lo inventa.
    const t = nuevo()
    t.iniciarActualizacionSola()
    t.__avanzar(60_000)
    t.estado.sucios.add('it-1')
    t.__setBase([{ unidad_negocio_id: 'u1', insumo_id: 'i1', cantidad_total: 1 }])
    t.__setErrorHuella({ message: 'sin red' })
    await t.actualizarStock()
    chk('sin poder preguntar no dice "Hay datos nuevos"', texto(t) !== 'Hay datos nuevos', texto(t))
    // Sin stock:ver no pregunta.
    const u = nuevo()
    u.__setPermisos(false, true)
    u.iniciarActualizacionSola()
    u.__avanzar(60_000)
    u.estado.sucios.add('it-1')
    await u.actualizarStock()
    chk('sin stock:ver no consulta el stock', u.__consultas() === 0)
  }

  // ── 9. El botón con un recuento sucio: guarda primero y después relee ────
  {
    const s = nuevo()
    s.iniciarActualizacionSola()
    s.__avanzar(60_000)
    s.estado.vista = 'recuento'
    s.estado.cargados.add('recuento')
    s.estado.recuento = { id: 'r1' }
    s.estado.sucios.add('it-1')
    await s.actualizarStock()
    chk('solo: no relee', !s.__llamadas.includes('items'))
    await s.actualizarStock({ forzado: true })
    const iG = s.__llamadas.indexOf('guardar'), iI = s.__llamadas.indexOf('items')
    chk('el botón guarda el conteo', iG !== -1)
    chk('y recién después relee', iI > iG, s.__llamadas)
    chk('el aviso de datos nuevos se va', texto(s) === 'Actualizado recién', texto(s))
  }

  // ── 10. Un error no mueve la hora ni muestra datos viejos como nuevos ────
  {
    const s = nuevo()
    s.iniciarActualizacionSola()
    s.__avanzar(4 * 60_000)
    s.__falla.add('stock')
    await s.actualizarStock()
    chk('dice que no se pudo', /^No se pudo actualizar/.test(texto(s)), texto(s))
    chk('y la hora de antes', /hace 4 min/.test(texto(s)), texto(s))
    chk('en bordó', caja(s).classList.contains('stock-actualizado--error'))
    s.__falla.delete('stock')
    s.__avanzar(60_000)
    await s.actualizarStock()
    chk('cuando vuelve a andar, se va el error', texto(s) === 'Actualizado recién' && !caja(s).classList.contains('stock-actualizado--error'), texto(s))
  }
  {
    // Antes del primer dibujo no hay nada que decir.
    const s = nuevo()
    s.pintarActualizado()
    chk('sin primera carga la línea no se ve', caja(s).hidden === true)
    // Y antes de saber quién es, no relee.
    s.estado.miEmpleadoId = null
    await s.actualizarStock({ forzado: true })
    chk('sin init no relee', s.__llamadas.length === 0)
  }
  {
    // Mientras relee, dice "Actualizando…" y el botón no se puede tocar dos veces.
    const s = nuevo()
    s.iniciarActualizacionSola()
    s.__avanzar(60_000)
    const p = s.actualizarStock()
    chk('mientras relee dice Actualizando…', texto(s) === 'Actualizando…', texto(s))
    chk('mientras relee el botón está trabado', s.__els.get('btn-actualizar-stock').disabled === true)
    const n = s.__llamadas.length
    await s.actualizarStock({ forzado: true })
    await p
    chk('un segundo toque mientras relee no hace otra lectura', s.__llamadas.filter(l => l.startsWith('stock')).length === 1, s.__llamadas)
    void n
  }

  // ── 11. El cableado (sobre el fuente) ───────────────────────────────────
  chk('el botón Actualizar está en el HTML', /id="btn-actualizar-stock"/.test(HTML))
  chk('la línea arranca escondida', /id="stock-actualizado"[^>]*hidden/.test(HTML))
  chk('el botón llama con forzado', /'btn-actualizar-stock'\)\.addEventListener\('click', \(\) => actualizarStock\(\{ forzado: true \}\)\)/.test(SCRIPT))
  chk('al volver a la pestaña', /visibilityState === 'visible'\) actualizarStock\(\)/.test(SCRIPT))
  chk('al volver el foco', /window\.addEventListener\('focus', \(\) => actualizarStock\(\)\)/.test(SCRIPT))
  chk('init arranca la actualización sola', /cargarPendientesStock\(\)\n\s*iniciarActualizacionSola\(\)\n\s*\}/.test(SCRIPT))
  chk('el intervalo solo con la pestaña visible', /if \(document\.visibilityState === 'visible'\) actualizarStock\(\)\n\s*\}, CADA_REFRESCO_MS\)/.test(SCRIPT))

  if (fallas.length) {
    console.log(`FALLAS (${fallas.length}):`)
    for (const f of fallas) console.log('  ✗ ' + f)
  }
  console.log(`${ok}/${ok + fallas.length}`)
  process.exit(fallas.length ? 1 : 0)
}

main().catch(e => { console.log('ERROR', e); console.log(`${ok}/${ok + fallas.length + 1}`); process.exit(1) })
