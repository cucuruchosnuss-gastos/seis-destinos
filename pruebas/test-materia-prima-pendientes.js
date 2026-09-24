// Burbujas de pendientes ADENTRO de modulos/materia-prima.html (24/09/2026),
// con mis_pendientes() —la misma RPC que el dashboard, sin cambiarla—:
//   · stock:transferencias_por_aceptar → en el botón "Ingresos internos", que
//     es donde se reciben;
//   · materia_prima:insumos_por_revisar → una línea con link a Stock → Catálogo;
//   · materia_prima:pagado_sin_ingresar → NO lleva burbuja aparte: el título de
//     "Pagado sin ingresar" ya dice "(N)" con las filas de gastos_sin_ingreso(),
//     que es exactamente lo que cuenta la RPC.
// Reglas del dashboard: si la llamada falla, NINGUNA burbuja; 0/null/'' no
// dibujan nada; el número es el de la RPC; title/aria-label escapados; turno.
//
// Se EJECUTA el código real del módulo, y el agrupado REAL del dashboard para
// comparar que lo que se ve acá suma lo mismo que su tarjeta.
//
//   node pruebas/test-materia-prima-pendientes.js

const fs = require('fs')
const path = require('path')
const { construirCon, scriptModulo } = require('./sandbox')
const { arnes, marca, chequearMarcas, estaticoAcotado, leer } = require('./circuito-comun')
const { extraerFn, extraerConst } = require('./extraer')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/materia-prima.html')
const FUENTE = leer(ARCHIVO)
const SCRIPT = scriptModulo(ARCHIVO)
const { chk, esperas, fin } = arnes()

const PRELUDIO = `
  function nuevoEl(id) { return { id, innerHTML: '', textContent: '', hidden: true } }
  var __els = new Map()
  var document = { getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) } }
  var console = { error() {}, log() {}, warn() {} }
  var __respuestas = []   // una por llamada, en orden: { data, error } o una promesa
  var __llamadas = 0
  var supabase = { rpc(nombre) { __llamadas++; const r = __respuestas.shift(); return r && r.then ? r : Promise.resolve(r || { data: [], error: null }) } }
  var estado = { pendientes: null, pagadoSinIngresar: [], errorPagadoSinIngresar: null, descarte: {} }
  function puedeDescartarIngreso() { return false }
  function formatearFecha(f) { return f }
  function importeConMoneda() { return null }
  function nombreUnidad() { return '' }
`

const FUNCIONES = ['esc', 'cantidadPendiente', 'agruparPendientesMp', 'textoPendienteMp', 'htmlBurbujaMp', 'pintarPendientesMp',
  'cargarPendientesMp', 'renderizarPagadoSinIngresar', 'htmlPagadoSinIngresar']
const CONSTANTES = ['PENDIENTES_DEL_MODULO']

function nuevo() {
  return construirCon(ARCHIVO, {
    preludio: PRELUDIO + '\n  var turnoPendientesMp = 0\n', funciones: FUNCIONES, constantes: CONSTANTES,
    retorno: 'estado, __els, __el(id){ return document.getElementById(id) }, __responder(r){ __respuestas.push(r) }, __cuantas(){ return __llamadas }',
  })
}

// El agrupado REAL del dashboard: la tarjeta de Ingreso suma las filas de
// materia_prima.
const DASH = fs.readFileSync(path.join(RAIZ, 'dashboard.html'), 'utf8')
const dash = new Function(`var console = { warn() {} }\n${extraerConst(DASH, 'MODULO_DE_PENDIENTE')}\n${extraerFn(DASH, 'textoPendiente')}\n${extraerFn(DASH, 'agruparPendientes')}\nreturn { agruparPendientes }`)()

let S0
try { S0 = nuevo() } catch (e) {
  chk('el sandbox se arma con las funciones reales del archivo', false, String(e && e.stack || e))
  fin()
  return
}

const FILAS = [
  { modulo: 'materia_prima', clave: 'pagado_sin_ingresar', cantidad: 3, texto: 'Pagado sin ingresar' },
  { modulo: 'materia_prima', clave: 'insumos_por_revisar', cantidad: 4, texto: 'Insumos nuevos por revisar' },
  { modulo: 'stock', clave: 'transferencias_por_aceptar', cantidad: 2, texto: 'Transferencias por aceptar' },
  { modulo: 'cobranzas', clave: 'por_controlar', cantidad: 9, texto: 'Cobranzas por controlar' },
]

esperas.push((async () => {
  // ── Cada burbuja en su lugar ────────────────────────────────────────────
  {
    const S = nuevo()
    S.__responder({ data: FILAS, error: null })
    await S.cargarPendientesMp()
    const internos = S.__el('btn-abrir-internos').innerHTML
    chk('Ingresos internos lleva la burbuja de transferencias por aceptar', /class="burbuja-mp"[^>]*>2<\/span>/.test(internos) && internos.startsWith('Ingresos internos'), internos)
    chk('la burbuja de internos dice el detalle en title y aria-label', internos.includes('title="2 transferencias por aceptar"') && internos.includes('aria-label="2 transferencias por aceptar"'))
    const linea = S.__el('linea-insumos-revisar')
    chk('la línea de insumos se ve', linea.hidden === false)
    chk('la línea de insumos lleva la burbuja con 4', /class="burbuja-mp"[^>]*>4<\/span>/.test(linea.innerHTML), linea.innerHTML)
    chk('la línea dice "insumos nuevos por revisar"', linea.innerHTML.includes('insumos nuevos por revisar'))
    chk('la línea tiene el link a Stock → Catálogo', linea.innerHTML.includes('href="stock.html?vista=catalogo"') && linea.innerHTML.includes('Revisarlos en Stock →'))
    chk('una fila de otro módulo no se dibuja acá', !internos.includes('9') && !linea.innerHTML.includes('>9<'))
    chk('pagado_sin_ingresar no se dibuja como burbuja aparte', !(internos + linea.innerHTML).includes('>3<'))
    chk('solo se guardan las filas de este módulo', [...S.estado.pendientes.keys()].sort().join(',') ===
      'materia_prima:insumos_por_revisar,materia_prima:pagado_sin_ingresar,stock:transferencias_por_aceptar', [...S.estado.pendientes.keys()].join(','))
  }

  // ── La suma: lo que se ve acá = la tarjeta de Ingreso del dashboard ──────
  {
    const S = nuevo()
    // "Pagado sin ingresar" con su propia consulta: 3 filas, las mismas que
    // cuenta la RPC con count(*) de gastos_sin_ingreso().
    S.estado.pagadoSinIngresar = [{ gasto_id: 'a' }, { gasto_id: 'b' }, { gasto_id: 'c' }]
    S.renderizarPagadoSinIngresar()
    const tituloN = Number((S.__el('pagado-sin-ingresar-titulo').textContent.match(/\((\d+)\)/) || [])[1])
    S.__responder({ data: FILAS, error: null })
    await S.cargarPendientesMp()
    const burbuja = Number((S.__el('linea-insumos-revisar').innerHTML.match(/class="burbuja-mp"[^>]*>(\d+)</) || [])[1])
    const tarjeta = dash.agruparPendientes(FILAS).get('materia-prima').total
    chk('lo que se ve en Ingreso (Pagado sin ingresar + insumos) suma lo de su tarjeta', tituloN + burbuja === tarjeta, `${tituloN} + ${burbuja} vs ${tarjeta}`)
    const tarjetaStock = dash.agruparPendientes(FILAS).get('stock').total
    const internosN = Number((S.__el('btn-abrir-internos').innerHTML.match(/>(\d+)</) || [])[1])
    chk('la burbuja de internos = lo de stock en el dashboard', internosN === tarjetaStock)
  }

  // ── Falla → ninguna burbuja; 0 / null / '' → nada ────────────────────────
  {
    const S = nuevo()
    S.__responder({ data: FILAS, error: null })
    await S.cargarPendientesMp()
    S.__responder({ data: null, error: { message: 'x' } })
    await S.cargarPendientesMp()
    chk('si la llamada falla, se SACAN las burbujas (nada viejo)', !S.__el('btn-abrir-internos').innerHTML.includes('burbuja') && S.__el('linea-insumos-revisar').hidden === true)
    chk('si la llamada falla, el botón sigue diciendo "Ingresos internos"', S.__el('btn-abrir-internos').innerHTML === 'Ingresos internos')
    chk('un error de la RPC es una falla (null), no una lista vacía', S.estado.pendientes === null)
    S.__responder(Promise.reject(new Error('sin red')))
    await S.cargarPendientesMp()
    chk('si la llamada tira, tampoco hay burbujas', S.estado.pendientes === null && S.__el('linea-insumos-revisar').hidden === true)

    for (const [valor, nombre] of [[0, '0'], [null, 'null'], ['', "''"], [undefined, 'undefined'], [-1, '-1'], [1.5, '1,5'], ['abc', 'texto']]) {
      const S2 = nuevo()
      S2.__responder({ data: [
        { modulo: 'stock', clave: 'transferencias_por_aceptar', cantidad: valor, texto: 'Transferencias por aceptar' },
        { modulo: 'materia_prima', clave: 'insumos_por_revisar', cantidad: valor, texto: 'Insumos nuevos por revisar' },
      ], error: null })
      await S2.cargarPendientesMp()
      chk(`cantidad ${nombre} → sin burbuja`, !S2.__el('btn-abrir-internos').innerHTML.includes('burbuja') && S2.__el('linea-insumos-revisar').hidden === true)
    }
    const S3 = nuevo()
    S3.__responder({ data: [{ modulo: 'stock', clave: 'transferencias_por_aceptar', cantidad: '7', texto: 'Transferencias por aceptar' }], error: null })
    await S3.cargarPendientesMp()
    chk('un bigint que llega como texto "7" cuenta como 7', />7<\/span>/.test(S3.__el('btn-abrir-internos').innerHTML))
    const S4 = nuevo()
    S4.__responder({ data: [{ modulo: 'stock', clave: 'transferencias_por_aceptar', cantidad: 150, texto: 'Transferencias por aceptar' }], error: null })
    await S4.cargarPendientesMp()
    chk('más de 99 dice 99+', />99\+<\/span>/.test(S4.__el('btn-abrir-internos').innerHTML) && S4.__el('btn-abrir-internos').innerHTML.includes('title="150 transferencias'))
  }

  // ── Turno: una respuesta vieja no pisa la nueva ──────────────────────────
  {
    const S = nuevo()
    let soltarVieja
    S.__responder(new Promise(r => { soltarVieja = () => r({ data: FILAS, error: null }) }))
    S.__responder({ data: [], error: null })
    const vieja = S.cargarPendientesMp()
    await S.cargarPendientesMp()
    soltarVieja()
    await vieja
    chk('la respuesta vieja no pisa la nueva', S.__el('linea-insumos-revisar').hidden === true && !S.__el('btn-abrir-internos').innerHTML.includes('burbuja'))
  }

  // ── Escape ──────────────────────────────────────────────────────────────
  {
    const S = nuevo()
    S.__responder({ data: [
      { modulo: 'stock', clave: 'transferencias_por_aceptar', cantidad: 1, texto: marca('texto_internos') },
      { modulo: 'materia_prima', clave: 'insumos_por_revisar', cantidad: 1, texto: marca('texto_insumos') },
    ], error: null })
    await S.cargarPendientesMp()
    chequearMarcas(chk, 'burbuja de internos', S.__el('btn-abrir-internos').innerHTML, ['texto_internos'])
    chequearMarcas(chk, 'línea de insumos', S.__el('linea-insumos-revisar').innerHTML, ['texto_insumos'])
  }
})())

// ── Estático ──────────────────────────────────────────────────────────────
// htmlBurbujaMp() escapa adentro (lo prueba la sección de escape de arriba,
// ejecutándola con HTML malicioso en el texto de la RPC).
estaticoAcotado(chk, ARCHIVO, FUENTE, ['htmlBurbujaMp', 'pintarPendientesMp'], { escape: 'esc', segurasRegex: [[/^htmlBurbujaMp\(/, 'HTML de htmlBurbujaMp(), que escapa adentro']] })
chk('se pide al abrir (init)', /cargarPendientesMp\(\)/.test(extraerFn(SCRIPT, 'init')))
chk('y al volver a la pestaña', /addEventListener\('visibilitychange'[\s\S]{0,200}document\.visibilityState === 'visible'[\s\S]{0,80}cargarPendientesMp\(\)/.test(SCRIPT))
chk('la línea de insumos existe en la pantalla principal', /id="pantalla-ingresos"[\s\S]*id="linea-insumos-revisar"[\s\S]*id="pantalla-internos"/.test(FUENTE))
chk('la RPC se llama sin parámetros (no se cambió)', /supabase\.rpc\('mis_pendientes'\)/.test(extraerFn(SCRIPT, 'cargarPendientesMp')))

fin()
