// Burbujas de pendientes ADENTRO de modulos/stock.html.
//
// La tarjeta del dashboard suma las filas de mis_pendientes() de cada módulo;
// esta suite exige que adentro de Stock se vea lo mismo y donde se resuelve:
//  - ('stock','transferencias_por_aceptar') → burbuja en "En tránsito" y la
//    línea de la vista de tránsito que lleva a Ingreso → Ingresos internos.
//  - ('materia_prima','insumos_por_revisar') → burbuja en la pestaña Catálogo,
//    SOLO con stock:gestionar_catalogo.
//  - stock.html?vista=catalogo abre el catálogo (con "Sin revisar" si hay
//    pendientes); un valor raro, o sin la tarea, se ignora; el parámetro se
//    limpia siempre.
//
// Se EJECUTA el código real (funciones extraídas del <script>) contra un DOM
// falso y un supabase falso cuyas respuestas se liberan a mano, para probar
// que una respuesta vieja no pisa a la nueva.
//
// Archivo bajo prueba: ARCHIVO_TEST, o modulos/stock.html.

const path = require('path')
const { construirCon, scriptModulo } = require('./sandbox')
const { leer } = require('./circuito-comun')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/stock.html')
const FUENTE = leer(ARCHIVO)
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
    return { id, hidden: false, innerHTML: '', textContent: '', dataset: {} }
  }
  var __els = new Map()
  var document = {
    visibilityState: 'visible',
    getElementById(id) { if (!__els.has(id)) __els.set(id, elemento(id)); return __els.get(id) },
    querySelectorAll: () => [],
  }
  var __url = { search: '', pathname: '/seis-destinos/modulos/stock.html', hash: '' }
  var __reemplazos = []
  var window = { get location() { return __url } }
  var history = { state: null, replaceState(st, t, u) { __reemplazos.push(u) } }

  // Cada llamada a la RPC queda PENDIENTE hasta que la prueba la libera.
  var __pendientes = []
  var supabase = {
    rpc: (n) => new Promise(res => __pendientes.push({ n, res })),
  }
  var __renders = { chips: 0, lista: 0 }
  function renderizarChips() { __renders.chips++ }
  function renderizarLista() { __renders.lista++ }

  var turnoPendientesStock = 0
  var estado = { miRolApp: 'usuario', misTareas: new Set(), insumos: [], filtro: 'todos', miEmpleadoId: 'e-1' }
`

const FUNCIONES = [
  'esc', 'tieneTarea', 'cantidadPendiente', 'textoFilaPendiente', 'htmlBurbujaStock',
  'pintarPendientesStock', 'cargarPendientesStock', 'vistaDesdeUrl', 'aplicarFiltroDesdeUrl',
]
const CONSTANTES = ['puedeGestionar', 'esPendiente', 'contarPendientes', 'VISTAS_DESDE_URL']

function nuevo() {
  return construirCon(ARCHIVO, {
    preludio: PRELUDIO, funciones: FUNCIONES, constantes: CONSTANTES,
    retorno: `estado, document, __pendientes, __renders, __reemplazos,
      __setUrl(s){ __url.search = s }`,
  })
}
const tick = () => new Promise(r => setImmediate(r))

const FILAS = [
  { modulo: 'stock', clave: 'transferencias_por_aceptar', cantidad: 3, texto: 'Transferencias por aceptar' },
  { modulo: 'materia_prima', clave: 'insumos_por_revisar', cantidad: 2, texto: 'Insumos nuevos por revisar' },
  { modulo: 'materia_prima', clave: 'pagado_sin_ingresar', cantidad: 7, texto: 'Pagado sin ingresar' },
  { modulo: 'caja', clave: 'solicitudes_mi_caja', cantidad: 9, texto: 'Movimientos' },
]

;(async () => {
  // ── 1. Cada burbuja en su lugar ─────────────────────────────────────────
  {
    const S = nuevo()
    S.estado.misTareas = new Set(['stock:gestionar_catalogo'])
    const p = S.cargarPendientesStock()
    chk('llama a mis_pendientes', S.__pendientes[0]?.n === 'mis_pendientes', S.__pendientes.map(x => x.n))
    S.__pendientes[0].res({ data: FILAS, error: null })
    await p
    const bT = S.document.getElementById('burbuja-transito').innerHTML
    const bC = S.document.getElementById('burbuja-catalogo').innerHTML
    chk('burbuja de tránsito con el número de la RPC (3)', />3<\/span>/.test(bT) && /class="burbuja-stock"/.test(bT), bT)
    chk('la burbuja de tránsito lleva el detalle en title y aria-label',
      bT.includes('title="3 transferencias por aceptar"') && bT.includes('aria-label="3 transferencias por aceptar"'), bT)
    chk('burbuja de catálogo con el número de la RPC (2)', />2<\/span>/.test(bC), bC)
    chk('la burbuja de catálogo dice insumos nuevos por revisar', bC.includes('title="2 insumos nuevos por revisar"'), bC)
    chk('ninguna burbuja suma filas ajenas (7 y 9 no aparecen)', !/>(7|9|12|16)</.test(bT + bC), bT + bC)
    const av = S.document.getElementById('transito-aviso-recibir')
    chk('la línea de tránsito se muestra', av.hidden === false)
    chk('la línea dice cuántas esperan y dónde se reciben',
      /<strong>3<\/strong> transferencias esperan que las recibas: se reciben en <strong>Ingreso → Ingresos internos<\/strong>/.test(av.innerHTML), av.innerHTML)
    chk('la línea linkea a materia-prima.html (ruta relativa desde modulos/)', /href="materia-prima\.html"/.test(av.innerHTML), av.innerHTML)
  }

  // Singular.
  {
    const S = nuevo()
    const p = S.cargarPendientesStock()
    S.__pendientes[0].res({ data: [{ modulo: 'stock', clave: 'transferencias_por_aceptar', cantidad: 1, texto: 'Transferencias por aceptar' }], error: null })
    await p
    const av = S.document.getElementById('transito-aviso-recibir')
    chk('singular: "1 transferencia espera que la recibas"', /<strong>1<\/strong> transferencia espera que la recibas/.test(av.innerHTML), av.innerHTML)
  }

  // Más de 99.
  {
    const S = nuevo()
    chk('más de 99 dice 99+', S.htmlBurbujaStock(150, 'x').includes('>99+<'))
  }

  // ── 2. Sin gestionar_catalogo no hay burbuja de catálogo ───────────────
  {
    const S = nuevo()
    const p = S.cargarPendientesStock()
    S.__pendientes[0].res({ data: FILAS, error: null })
    await p
    chk('sin gestionar_catalogo: burbuja de catálogo vacía', S.document.getElementById('burbuja-catalogo').innerHTML === '',
      S.document.getElementById('burbuja-catalogo').innerHTML)
    chk('sin gestionar_catalogo: la de tránsito sigue', />3</.test(S.document.getElementById('burbuja-transito').innerHTML))
  }
  {
    const S = nuevo()
    S.estado.miRolApp = 'super_admin'
    const p = S.cargarPendientesStock()
    S.__pendientes[0].res({ data: FILAS, error: null })
    await p
    chk('super_admin (bypass): burbuja de catálogo', />2</.test(S.document.getElementById('burbuja-catalogo').innerHTML))
  }

  // ── 3. Fallo → nada, y lo que había se borra ────────────────────────────
  {
    const S = nuevo()
    S.estado.misTareas = new Set(['stock:gestionar_catalogo'])
    let p = S.cargarPendientesStock()
    S.__pendientes[0].res({ data: FILAS, error: null })
    await p
    p = S.cargarPendientesStock()
    S.__pendientes[1].res({ data: null, error: { message: 'sin señal' } })
    await p
    chk('fallo: burbuja de tránsito borrada', S.document.getElementById('burbuja-transito').innerHTML === '')
    chk('fallo: burbuja de catálogo borrada', S.document.getElementById('burbuja-catalogo').innerHTML === '')
    chk('fallo: la línea de tránsito se esconde', S.document.getElementById('transito-aviso-recibir').hidden === true)
    chk('fallo: la línea de tránsito queda vacía', S.document.getElementById('transito-aviso-recibir').innerHTML === '')
  }
  {
    const S = nuevo()
    S.estado.misTareas = new Set(['stock:gestionar_catalogo'])
    const p = S.cargarPendientesStock()
    S.__pendientes[0].res(Promise.reject(new Error('red caída')))
    await p
    chk('excepción: ninguna burbuja', S.document.getElementById('burbuja-transito').innerHTML === '' &&
      S.document.getElementById('transito-aviso-recibir').hidden === true)
  }

  // ── 4. 0 / null / '' / no entero → nada ────────────────────────────────
  for (const c of [0, null, '', undefined, 'tres', 2.5, -4, '3']) {
    const S = nuevo()
    const n = S.cantidadPendiente([{ modulo: 'stock', clave: 'transferencias_por_aceptar', cantidad: c }], 'stock', 'transferencias_por_aceptar')
    const esperado = c === '3' ? 3 : 0
    chk(`cantidad ${JSON.stringify(c)} → ${esperado}`, n === esperado, n)
  }
  {
    const S = nuevo()
    chk('sin la fila → 0', S.cantidadPendiente(FILAS, 'stock', 'otra') === 0)
    chk('con filas null → 0', S.cantidadPendiente(null, 'stock', 'transferencias_por_aceptar') === 0)
    chk('htmlBurbujaStock(0) no dibuja nada', S.htmlBurbujaStock(0, 'x') === '')
    const p = S.cargarPendientesStock()
    S.__pendientes[0].res({ data: [{ modulo: 'stock', clave: 'transferencias_por_aceptar', cantidad: 0, texto: 'x' }], error: null })
    await p
    chk('cantidad 0: sin burbuja y sin línea', S.document.getElementById('burbuja-transito').innerHTML === '' &&
      S.document.getElementById('transito-aviso-recibir').hidden === true)
  }

  // ── 5. Una respuesta vieja no pisa la nueva ────────────────────────────
  {
    const S = nuevo()
    const p1 = S.cargarPendientesStock()
    const p2 = S.cargarPendientesStock()
    S.__pendientes[1].res({ data: [{ modulo: 'stock', clave: 'transferencias_por_aceptar', cantidad: 5, texto: 'T' }], error: null })
    await p2
    S.__pendientes[0].res({ data: [{ modulo: 'stock', clave: 'transferencias_por_aceptar', cantidad: 8, texto: 'T' }], error: null })
    await p1
    const b = S.document.getElementById('burbuja-transito').innerHTML
    chk('la respuesta vieja (8) no pisa la nueva (5)', />5</.test(b) && !/>8</.test(b), b)
  }
  {
    // Y un fallo viejo tampoco borra la nueva.
    const S = nuevo()
    const p1 = S.cargarPendientesStock()
    const p2 = S.cargarPendientesStock()
    S.__pendientes[1].res({ data: [{ modulo: 'stock', clave: 'transferencias_por_aceptar', cantidad: 5, texto: 'T' }], error: null })
    await p2
    S.__pendientes[0].res({ data: null, error: { message: 'x' } })
    await p1
    chk('un fallo viejo no borra la respuesta nueva', />5</.test(S.document.getElementById('burbuja-transito').innerHTML))
  }

  // ── 6. Escape del texto de la RPC ──────────────────────────────────────
  {
    const S = nuevo()
    S.estado.misTareas = new Set(['stock:gestionar_catalogo'])
    const mal = '"><img src=x onerror=alert(1)>'
    const p = S.cargarPendientesStock()
    S.__pendientes[0].res({ data: [
      { modulo: 'stock', clave: 'transferencias_por_aceptar', cantidad: 2, texto: mal },
      { modulo: 'materia_prima', clave: 'insumos_por_revisar', cantidad: 1, texto: '<b data-xss="c">' },
    ], error: null })
    await p
    const html = S.document.getElementById('burbuja-transito').innerHTML + S.document.getElementById('burbuja-catalogo').innerHTML
    chk('ningún texto malicioso llega crudo', !html.includes('<img') && !html.includes('<b data-xss'), html)
    chk('el texto malicioso aparece escapado', html.includes('&quot;&gt;&lt;img') && html.includes('&lt;b data-xss'), html)
  }

  // ── 7. ?vista=catalogo ─────────────────────────────────────────────────
  {
    const S = nuevo()
    S.__setUrl('?vista=catalogo')
    const v = S.vistaDesdeUrl(['stock', 'catalogo', 'recuento'])
    chk('?vista=catalogo con la tarea → catalogo', v === 'catalogo', v)
    chk('el parámetro se limpia con replaceState', S.__reemplazos[0] === '/seis-destinos/modulos/stock.html', S.__reemplazos)
  }
  {
    const S = nuevo()
    S.__setUrl('?vista=catalogo&otra=1')
    S.vistaDesdeUrl(['stock', 'catalogo'])
    chk('limpiar conserva los otros parámetros', S.__reemplazos[0] === '/seis-destinos/modulos/stock.html?otra=1', S.__reemplazos)
  }
  for (const raro of ['recuento', 'stock', 'mermas', 'alias', '<script>', 'CATALOGO', '']) {
    const S = nuevo()
    S.__setUrl('?vista=' + encodeURIComponent(raro))
    const v = S.vistaDesdeUrl(['stock', 'catalogo', 'recuento'])
    chk(`?vista=${raro} se ignora`, v === null, v)
    chk(`?vista=${raro} igual se limpia`, S.__reemplazos.length === 1, S.__reemplazos)
  }
  {
    const S = nuevo()
    S.__setUrl('?vista=catalogo')
    chk('sin gestionar_catalogo (no está en sus vistas) se ignora', S.vistaDesdeUrl(['stock']) === null)
    chk('sin gestionar_catalogo igual se limpia', S.__reemplazos.length === 1)
  }
  {
    const S = nuevo()
    S.__setUrl('')
    chk('sin parámetro → null y sin tocar el historial', S.vistaDesdeUrl(['stock', 'catalogo']) === null && S.__reemplazos.length === 0)
  }

  // El filtro "Sin revisar" al llegar por el link.
  {
    const S = nuevo()
    S.estado.insumos = [
      { id: 'a', activo: true, estado_alta: 'pendiente_revision' },
      { id: 'b', activo: true, estado_alta: 'activo' },
    ]
    S.aplicarFiltroDesdeUrl()
    chk('con pendientes: filtro Sin revisar', S.estado.filtro === 'pendientes', S.estado.filtro)
    chk('con pendientes: redibuja chips y lista', S.__renders.chips === 1 && S.__renders.lista === 1, S.__renders)
  }
  {
    const S = nuevo()
    S.estado.insumos = [{ id: 'b', activo: true, estado_alta: 'activo' }]
    S.aplicarFiltroDesdeUrl()
    chk('sin pendientes: el filtro queda en Todos', S.estado.filtro === 'todos', S.estado.filtro)
  }

  // ── 8. El cableado (init, HTML) — sobre el fuente, anclado a lo único ──
  chk('init abre la vista pedida por URL antes que la primera',
    /const desdeUrl = vistaDesdeUrl\(vistas\)\n\s*mostrarVista\(desdeUrl \?\? vistas\[0\]\)/.test(SCRIPT))
  chk('init aplica el filtro solo si vino por el link al catálogo',
    /if \(desdeUrl === 'catalogo'\) aplicarFiltroDesdeUrl\(\)/.test(SCRIPT))
  const iInit = SCRIPT.indexOf('async function init()')
  const iLlamada = SCRIPT.indexOf('      cargarPendientesStock()\n    }', iInit)
  chk('init llama a cargarPendientesStock al final', iInit !== -1 && iLlamada > iInit)
  chk('visibilitychange: recarga al volver a verse, solo después de init',
    /document\.visibilityState === 'visible' && estado\.miEmpleadoId\) cargarPendientesStock\(\)/.test(SCRIPT))
  chk('la burbuja de tránsito vive dentro del botón En tránsito',
    /id="btn-ver-transito">En tránsito<span id="burbuja-transito"><\/span><\/button>/.test(FUENTE))
  chk('la burbuja de catálogo vive dentro de la pestaña Catálogo',
    /data-vista="catalogo">Catálogo<span id="burbuja-catalogo"><\/span><\/button>/.test(FUENTE))
  chk('la línea de tránsito está dentro del listado de tránsito',
    /id="transito-paso-lista"[\s\S]{0,600}id="transito-aviso-recibir" hidden/.test(FUENTE))
  chk('la burbuja tiene estilo (fondo rojo)', /\.burbuja-stock \{[\s\S]*?background: var\(--rojo\)/.test(FUENTE))

  if (fallas.length) {
    console.log(`FALLAS (${fallas.length}):`)
    for (const f of fallas) console.log('  ✗ ' + f)
    console.log(`${ok}/${ok + fallas.length}`)
    process.exit(1)
  }
  console.log(`${ok}/${ok} verde`)
})().catch(e => { console.log('EXCEPCIÓN:', e && e.stack || e); process.exit(1) })
