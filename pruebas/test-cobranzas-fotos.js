// Estados de las fotos al cargar una cobranza (modulos/cobranzas.html).
//
// Se EJECUTAN las funciones reales —procesarFoto, el render de cada estado, el
// contador y los reintentos— con un document falso, timers falsos y un
// supabase falso cuyas respuestas se controlan desde acá. Lo que se afirma:
//  - con señal y una subida en curso, la palabra "señal" NO aparece;
//  - cada estado dice lo suyo: subiendo, leyendo (con contador), más de 90 s,
//    leída (singular y plural, ✓ en la miniatura), sin señal y error del lector;
//  - dos procesarFoto a la vez sobre la misma foto llaman UNA vez al OCR y no
//    duplican los cheques, y la marca se libera aunque el OCR falle;
//  - el intervalo del contador se apaga cuando no queda ninguna foto leyendo;
//  - las marcas en memoria (enCurso, fase, …) NO llegan al borrador: se clona
//    igual que IndexedDB, con structuredClone;
//  - con el formulario abierto se reintenta en 'online' y cada 30 s, y todo se
//    limpia al salir del formulario.
//
// Archivo bajo prueba: ARCHIVO_TEST, o modulos/cobranzas.html.

const fs = require('fs')
const path = require('path')
const { construirCon } = require('./sandbox')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/cobranzas.html')

// El sub-proceso VERIFICA que leyó el archivo que el runner le pasó.
const FUENTE = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${FUENTE.length} bytes)`)

let ok = 0
const fallas = []
function chk(nombre, condicion, detalle) {
  if (condicion) ok++
  else fallas.push(nombre + (detalle !== undefined ? ` — ${String(detalle).slice(0, 300)}` : ''))
}

const PRELUDIO = `
  var console = { error(){}, log(){}, warn(){} }
  // --- tiempo y timers falsos ----------------------------------------------
  var __ahora = 1000000
  var Date = { now: () => __ahora }
  var __timers = new Map(), __idTimer = 0
  function setInterval(fn, ms) { const id = ++__idTimer; __timers.set(id, { fn, ms }); return id }
  function clearInterval(id) { __timers.delete(id) }
  function __timersDe(ms) { return [...__timers.values()].filter(t => t.ms === ms) }

  // --- DOM falso -------------------------------------------------------------
  function nuevoEl(id) {
    return {
      id, innerHTML: '', textContent: '', value: '', hidden: false, max: '', dataset: {},
      classList: { add(){}, remove(){}, toggle(){} }, addEventListener(){},
    }
  }
  var __els = new Map()
  var __spans = new Map()
  var document = {
    getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) },
    querySelectorAll(sel) {
      if (sel !== '[data-lectura-foto]') return []
      const html = document.getElementById('cob-fotos-estado').innerHTML
      const ids = [...html.matchAll(/data-lectura-foto="([^"]*)"/g)].map(m => m[1])
      return ids.map(id => {
        if (!__spans.has(id)) __spans.set(id, { dataset: { lecturaFoto: id }, textContent: '' })
        return __spans.get(id)
      })
    },
  }
  var __listeners = new Map()
  var window = {
    scrollTo(){},
    addEventListener(t, f) { if (!__listeners.has(t)) __listeners.set(t, new Set()); __listeners.get(t).add(f) },
    removeEventListener(t, f) { __listeners.get(t)?.delete(f) },
  }
  var navigator = { onLine: true }

  // --- supabase falso ----------------------------------------------------------
  var __sb = {
    uploads: 0, invokes: 0,
    upload: async () => ({ error: null }),
    invoke: async () => ({ data: { ok: true, cheques: [] }, error: null }),
  }
  var supabase = {
    storage: { from: () => ({ upload: (...a) => { __sb.uploads++; return __sb.upload(...a) } }) },
    functions: { invoke: (...a) => { __sb.invokes++; return __sb.invoke(...a) } },
  }

  // --- IndexedDB falso: se clona IGUAL que IndexedDB -------------------------
  var __guardados = []
  async function dbGuardar(store, clave, valor) { __guardados.push(structuredClone(valor)) }
  var STORE_BORRADORES = 'borradores'
  function mostrarError(){}

  // --- lo que el formulario usa y acá no importa -----------------------------
  var __pintadasFormulario = 0
  function pintarCheques(){} function pintarTotalYGuardado(){}
  function hoyArgentina(){ return '2026-09-21' }
  async function urlDeFoto(){ return null } function abrirVisor(){}
  var puedeCargar = () => true
  var SUBTITULO_VISTA_COB = { listado: 'Listado', form: 'Nueva cobranza' }
  var reintentoFotos = null
  var contadorLecturas = null

  var estado = { sesion: { user: { id: 'uid' } }, form: null, sincronizando: false, bancos: new Map() }
`

const FUNCIONES = [
  'escCob', 'esErrorDeRed', 'guardarBorrador', 'marcarFotoEnMemoria', 'procesarFoto', 'mensajeDelLector',
  'iniciarReintentosFotos', 'detenerReintentosFotos', 'reintentarFotosPendientes',
  'pintarFormulario', 'pintarEstadoFotos', 'fotoLeidaSinProblemas', 'fotoSinSenal', 'textoLecturaFoto',
  'textoChequesLeidos', 'htmlAvisoFoto', 'hayFotosLeyendo', 'asegurarContadorLecturas',
  'detenerContadorLecturas', 'tickLecturas', 'mostrarVistaCob',
  // mostrarVistaCob consulta el modo de escritorio (rediseño 3.5); acá no hay
  // matchMedia, así que corre siempre como celular.
  'esEscritorio', 'enModoMaestro', 'pintarPanelVacio',
  'chequeVacio', 'chequeDesdeOcr', 'renglonComoImpreso', 'aplicarRenglones',
]
const CONSTANTES = ['SEGUNDOS_LECTURA_LENTA', 'MS_REINTENTO_FOTOS', 'MAX_INTENTOS_LECTOR', 'MQ_ESCRITORIO']

function sandbox() {
  return construirCon(ARCHIVO, {
    preludio: PRELUDIO, funciones: FUNCIONES, constantes: CONSTANTES,
    retorno: `estado, __sb, __els, __spans, __timersDe, __listeners, __guardados, navigator,
      __setAhora(t){ __ahora = t }, __ahoraEs(){ return __ahora }, __reintento(){ return reintentoFotos }`,
  })
}

// Una promesa que se resuelve desde afuera.
function diferida() {
  let resolver, rechazar
  const promesa = new Promise((r, j) => { resolver = r; rechazar = j })
  return { promesa, resolver, rechazar }
}
const tic = () => new Promise(r => setImmediate(r))
async function ticks(n = 6) { for (let i = 0; i < n; i++) await tic() }

function formConFoto(S, fotoExtra = {}) {
  const foto = {
    id: 'foto-1', storage_path: 'uid/cob/1.jpg', blob: { size: 10 },
    subida: false, leida: false, ocr_crudo: null, ocr_modelo: null, error: null, ...fotoExtra,
  }
  S.estado.form = { id: 'cob-1', modo: 'nueva', estadoLocal: 'borrador', cliente: '', fecha: '2026-09-21',
    efectivo: '', comprobante_referencia: '', observaciones: '', fotos: [foto], cheques: [], actualizado: 0 }
  return foto
}
const html = (S) => S.__els.get('cob-fotos-estado')?.innerHTML ?? ''
const chequeOcr = (n) => ({
  banco_codigo: '007', sucursal_codigo: '001', codigo_postal: '5000', dv_ruta: 1,
  numero: String(10000000 + n), dv_numero: 1, cuenta: '00000000001', dv_cuenta: 1,
  tipo: 'comun', fecha_emision: '2026-09-20', importe: 1000 + n,
})
const MARCAS = ['enCurso', 'fase', 'leyendoDesde', 'errorRed', 'intentosLector']

async function main() {
  // ── 1. El recorrido normal, con señal: subiendo → leyendo → leída ─────────
  {
    const S = sandbox()
    const foto = formConFoto(S)
    const subida = diferida(), lectura = diferida()
    S.__sb.upload = () => subida.promesa
    S.__sb.invoke = () => lectura.promesa

    const p = S.procesarFoto('foto-1')
    let h = html(S)
    chk('subiendo: dice "Subiendo la foto…"', h.includes('Subiendo la foto…'), h)
    chk('subiendo con señal: la palabra "señal" NO aparece', !/señal/i.test(h), h)
    chk('subiendo: la marca enCurso está puesta', foto.enCurso === true)
    chk('subiendo: la marca no es enumerable', !Object.keys(foto).some(k => MARCAS.includes(k)), Object.keys(foto))

    subida.resolver({ error: null })
    await ticks()
    h = html(S)
    chk('leyendo: dice "Leyendo los cheques con IA… puede tardar hasta un minuto"',
      h.includes('Leyendo los cheques con IA… puede tardar hasta un minuto'), h)
    chk('leyendo: arranca el contador en 0 s', h.includes('(0 s)'), h)
    chk('leyendo con señal: la palabra "señal" NO aparece', !/señal/i.test(h), h)
    chk('leyendo: UN solo intervalo de contador', S.__timersDe(1000).length === 1, S.__timersDe(1000).length)
    chk('leyendo: todavía sin mensaje de demora', !h.includes('Está tardando más de lo normal'), h)

    // Lo que se guardó en el borrador DURANTE la subida no lleva las marcas.
    const conMarcas = S.__guardados.flatMap(g => g.fotos).filter(x => MARCAS.some(k => k in x))
    chk('borrador: se guardó al menos una vez durante el proceso', S.__guardados.length >= 1, S.__guardados.length)
    chk('borrador: ninguna marca en memoria (enCurso, fase, …) llega a IndexedDB', conMarcas.length === 0,
      JSON.stringify(conMarcas.map(x => Object.keys(x))))

    // El contador: cada segundo cambia solo el texto del span.
    S.__setAhora(S.__ahoraEs() + 12000)
    S.__timersDe(1000)[0].fn()
    const span = S.__spans.get('foto-1')
    chk('contador: el tick actualiza el span con los segundos', span && span.textContent.includes('(12 s)'), span?.textContent)

    // Más de 90 s: se avisa y NO se cancela.
    S.__setAhora(S.__ahoraEs() + 83000)   // 95 s
    S.__timersDe(1000)[0].fn()
    chk('>90 s (tick): "Está tardando más de lo normal. Podés seguir cargando; se completa sola."',
      span.textContent.includes('Está tardando más de lo normal. Podés seguir cargando; se completa sola.'), span.textContent)
    S.pintarEstadoFotos()
    h = html(S)
    chk('>90 s (render): el mismo aviso', h.includes('Está tardando más de lo normal. Podés seguir cargando; se completa sola.'), h)
    chk('>90 s: la lectura NO se cancela (sigue en curso)', foto.enCurso === true && S.__sb.invokes === 1)
    // A los 90 justos todavía no.
    chk('90 s justos: sin aviso de demora', !S.textoLecturaFoto(90).includes('tardando'), S.textoLecturaFoto(90))

    lectura.resolver({ data: { ok: true, cheques: [chequeOcr(1), chequeOcr(2)] }, error: null })
    await p
    h = html(S)
    chk('leída: "✓ 2 cheques leídos"', h.includes('✓ 2 cheques leídos'), h)
    chk('leída: el ✓ también en la miniatura', /cob-foto__pie">Foto 1 ✓</.test(h), h)
    chk('leída: se agregaron los 2 cheques', S.estado.form.cheques.length === 2, S.estado.form.cheques.length)
    chk('leída: la marca enCurso se liberó', foto.enCurso === false)
    chk('leída: el intervalo del contador se limpió', S.__timersDe(1000).length === 0, S.__timersDe(1000).length)
    const conMarcasFin = S.__guardados.flatMap(g => g.fotos).filter(x => MARCAS.some(k => k in x))
    chk('borrador: tampoco al final hay marcas en IndexedDB', conMarcasFin.length === 0)
  }

  // ── 2. Singular ────────────────────────────────────────────────────────────
  {
    const S = sandbox()
    formConFoto(S)
    S.__sb.invoke = async () => ({ data: { ok: true, cheques: [chequeOcr(1)] }, error: null })
    await S.procesarFoto('foto-1')
    const h = html(S)
    chk('singular: "✓ 1 cheque leído"', h.includes('✓ 1 cheque leído') && !h.includes('1 cheques'), h)
  }

  // ── 3. Dos procesarFoto a la vez sobre la misma foto ───────────────────────
  {
    const S = sandbox()
    formConFoto(S)
    const lectura = diferida()
    S.__sb.invoke = () => lectura.promesa
    const p1 = S.procesarFoto('foto-1')
    const p2 = S.procesarFoto('foto-1')
    await ticks()
    const p3 = S.procesarFoto('foto-1')   // también mientras LEE
    lectura.resolver({ data: { ok: true, cheques: [chequeOcr(1), chequeOcr(2)] }, error: null })
    await Promise.all([p1, p2, p3])
    chk('concurrencia: UNA sola subida', S.__sb.uploads === 1, S.__sb.uploads)
    chk('concurrencia: UNA sola llamada al OCR', S.__sb.invokes === 1, S.__sb.invokes)
    chk('concurrencia: los cheques NO se duplican', S.estado.form.cheques.length === 2, S.estado.form.cheques.length)
  }

  // ── 4. Error del lector: mensaje escapado, y la marca se libera ────────────
  {
    const S = sandbox()
    const foto = formConFoto(S, { subida: true })
    S.__sb.invoke = async () => ({ data: null, error: { message: 'Edge Function returned a non-2xx status code',
      context: { json: async () => ({ mensaje: '<b>x</b> el modelo no respondió' }) } } })
    await S.procesarFoto('foto-1')
    const h = html(S)
    chk('error del lector: usa el mensaje de la función, escapado',
      h.includes('El lector no pudo leer la foto: &lt;b&gt;x&lt;/b&gt; el modelo no respondió'), h)
    chk('error del lector: nada crudo', !h.includes('<b>x</b>'), h)
    chk('error del lector con señal: la palabra "señal" NO aparece', !/señal/i.test(h), h)
    chk('error del lector: no se marca como falta de red', !foto.errorRed)
    chk('error del lector: la marca enCurso se liberó en el finally', foto.enCurso === false)
    chk('error del lector: el contador se apagó', S.__timersDe(1000).length === 0)

    // Liberada la marca, otro intento SÍ vuelve a llamar al OCR.
    await S.procesarFoto('foto-1')
    chk('error del lector: un segundo intento vuelve a llamar al OCR', S.__sb.invokes === 2, S.__sb.invokes)
    // Con el mensaje del error cuando no hay cuerpo JSON.
    S.__sb.invoke = async () => ({ data: null, error: { message: 'boom' } })
    await S.procesarFoto('foto-1')
    chk('error del lector sin cuerpo: usa el mensaje del error', html(S).includes('El lector no pudo leer la foto: boom'), html(S))
    chk('error del lector: al tercer intento ya no promete reintentar', html(S).includes('Cargá los cheques a mano.') && !html(S).includes('Se reintenta sola'), html(S))
    // Y el reintento automático no lo vuelve a intentar.
    const antes = S.__sb.invokes
    S.reintentarFotosPendientes()
    await ticks()
    chk('error del lector: pasado el tope, el reintento no llama más al OCR', S.__sb.invokes === antes, S.__sb.invokes)
  }

  // ── 5. Falta de red: SOLO ahí se habla de señal ────────────────────────────
  {
    // (a) El OCR falla por red: supabase-js lo envuelve y el original va en .context.
    const S = sandbox()
    const foto = formConFoto(S, { subida: true })
    S.__sb.invoke = async () => ({ data: null, error: { message: 'Failed to send a request to the Edge Function',
      context: { message: 'Failed to fetch' } } })
    await S.procesarFoto('foto-1')
    chk('red en el OCR: se clasifica como falta de red', foto.errorRed === true && !foto.error, `${foto.errorRed} ${foto.error}`)
    chk('red en el OCR: dice "sin señal"', /sin señal/.test(html(S)), html(S))
    chk('red en el OCR: no cuenta como intento del lector', !foto.intentosLector)

    // (b) La subida falla por red.
    const S2 = sandbox()
    const foto2 = formConFoto(S2)
    S2.__sb.upload = async () => ({ error: { message: 'Failed to fetch' } })
    await S2.procesarFoto('foto-1')
    chk('red en la subida: dice "sin señal"', /sin señal/.test(html(S2)) && foto2.errorRed === true, html(S2))
    chk('red en la subida: no se llamó al OCR', S2.__sb.invokes === 0)
    // La subida sale con un return temprano: la marca se tiene que liberar
    // igual (por eso va en el finally), o la foto queda trabada para siempre.
    chk('red en la subida: la marca enCurso se liberó', foto2.enCurso === false)
    await S2.procesarFoto('foto-1')
    chk('red en la subida: un segundo intento vuelve a subir', S2.__sb.uploads === 2, S2.__sb.uploads)

    // (c) La subida falla por OTRA cosa: no es falta de señal.
    const S3 = sandbox()
    const foto3 = formConFoto(S3)
    S3.__sb.upload = async () => ({ error: { message: 'new row violates row-level security policy' } })
    await S3.procesarFoto('foto-1')
    chk('subida rechazada (no red): lo dice con el motivo', html(S3).includes('No se pudo subir la foto (new row violates row-level security policy)'), html(S3))
    chk('subida rechazada (no red): la palabra "señal" NO aparece', !/señal/i.test(html(S3)) && !foto3.errorRed, html(S3))

    // (d) El celular dice que no hay red: ni se intenta.
    const S4 = sandbox()
    formConFoto(S4)
    S4.navigator.onLine = false
    await S4.procesarFoto('foto-1')
    chk('sin red: no se intenta subir', S4.__sb.uploads === 0)
    chk('sin red: dice "sin señal"', /sin señal/.test(html(S4)), html(S4))
  }

  // ── 6. Pendiente con señal, sin nada en curso: no se habla de señal ────────
  {
    const S = sandbox()
    formConFoto(S, { subida: true })
    S.pintarEstadoFotos()
    chk('pendiente de leer con señal: la palabra "señal" NO aparece', !/señal/i.test(html(S)), html(S))
    chk('pendiente de leer: dice que se reintenta sola', html(S).includes('Se reintenta sola'), html(S))
    const S2 = sandbox()
    formConFoto(S2)
    S2.pintarEstadoFotos()
    chk('pendiente de subir con señal: la palabra "señal" NO aparece', !/señal/i.test(html(S2)), html(S2))
    // Un error viejo que traía "señal" (de antes de este cambio) lo tapa el
    // intento en curso.
    const S3 = sandbox()
    const f3 = formConFoto(S3, { error: 'No se pudo subir. Se reintenta cuando haya señal.' })
    const sub = diferida()
    S3.__sb.upload = () => sub.promesa
    const p = S3.procesarFoto('foto-1')
    chk('un error viejo con "señal" no se muestra mientras se sube', !/señal/i.test(html(S3)), html(S3))
    sub.resolver({ error: null }); await p
    chk('...y se limpia al subir', f3.error === null || !/señal/i.test(f3.error ?? ''))
  }

  // ── 7. Las marcas no llegan al borrador (directo sobre guardarBorrador) ───
  {
    const S = sandbox()
    const foto = formConFoto(S)
    S.marcarFotoEnMemoria(foto, { enCurso: true, fase: 'leyendo', leyendoDesde: 5, errorRed: true, intentosLector: 2 })
    await S.guardarBorrador()
    const g = S.__guardados[S.__guardados.length - 1]
    const claves = Object.keys(g.fotos[0])
    chk('guardarBorrador: la foto guardada no lleva ninguna marca en memoria', !claves.some(k => MARCAS.includes(k)), claves)
    chk('guardarBorrador: la foto guardada conserva sus datos', g.fotos[0].storage_path === 'uid/cob/1.jpg' && g.fotos[0].subida === false)
    chk('las marcas siguen en memoria después de guardar', foto.enCurso === true && foto.fase === 'leyendo')
  }

  // ── 8. Reintentos con el formulario abierto ────────────────────────────────
  {
    const S = sandbox()
    formConFoto(S)
    S.__sb.upload = async () => ({ error: { message: 'Failed to fetch' } })
    S.pintarFormulario()
    chk('formulario abierto: un listener de "online"', (S.__listeners.get('online')?.size ?? 0) === 1)
    chk('formulario abierto: un intervalo de 30 s', S.__timersDe(30000).length === 1)
    S.pintarFormulario()
    chk('pintar de nuevo no duplica el listener', (S.__listeners.get('online')?.size ?? 0) === 1)
    chk('pintar de nuevo no duplica el intervalo', S.__timersDe(30000).length === 1)

    // Vuelve la señal: se reintenta.
    S.__sb.upload = async () => ({ error: null })
    S.__sb.invoke = async () => ({ data: { ok: true, cheques: [chequeOcr(1)] }, error: null })
    ;[...S.__listeners.get('online')][0]()
    await ticks()
    chk('evento online: reintenta la foto pendiente', S.__sb.uploads === 1 && S.__sb.invokes === 1, `${S.__sb.uploads} ${S.__sb.invokes}`)
    chk('evento online: quedó leída', S.estado.form.fotos[0].leida === true)

    // Cada 30 s también (otra foto pendiente).
    S.estado.form.fotos.push({ id: 'foto-2', storage_path: 'uid/cob/2.jpg', blob: { size: 1 }, subida: false, leida: false, error: null })
    S.__timersDe(30000)[0].fn()
    await ticks()
    chk('cada 30 s: reintenta la foto pendiente', S.__sb.uploads === 2, S.__sb.uploads)

    // Con el sincronizador corriendo se espera al próximo turno.
    S.estado.form.fotos.push({ id: 'foto-3', storage_path: 'uid/cob/3.jpg', blob: { size: 1 }, subida: false, leida: false, error: null })
    S.estado.sincronizando = true
    S.__timersDe(30000)[0].fn()
    await ticks()
    chk('con el sincronizador corriendo no se reintenta', S.__sb.uploads === 2, S.__sb.uploads)
    S.estado.sincronizando = false

    // Salir del formulario limpia todo.
    S.mostrarVistaCob('listado')
    chk('al salir: se quita el listener de "online"', (S.__listeners.get('online')?.size ?? 0) === 0)
    chk('al salir: se limpia el intervalo de 30 s', S.__timersDe(30000).length === 0)
    chk('al salir: no queda el estado de reintento', S.__reintento() === null)
  }

  // ── 9. Salir con una lectura en curso también apaga el contador ───────────
  {
    const S = sandbox()
    formConFoto(S, { subida: true })
    const lectura = diferida()
    S.__sb.invoke = () => lectura.promesa
    S.pintarFormulario()
    const p = S.procesarFoto('foto-1')
    await ticks()
    chk('contador: prendido mientras lee', S.__timersDe(1000).length === 1)
    S.estado.form = null
    S.mostrarVistaCob('listado')
    chk('al salir leyendo: el contador se apaga', S.__timersDe(1000).length === 0)
    lectura.resolver({ data: { ok: true, cheques: [] }, error: null })
    await p
  }

  // ── 10. Escapado de lo que entra al aviso ──────────────────────────────────
  {
    const marca = (c) => `"><b data-xss="${c}">`
    const escapada = (c) => `&lt;b data-xss=&quot;${c}&quot;&gt;`
    const S = sandbox()
    const foto = formConFoto(S, { id: marca('id_leyendo'), subida: true })
    S.marcarFotoEnMemoria(foto, { enCurso: true, fase: 'leyendo', leyendoDesde: S.__ahoraEs() })
    const h1 = S.htmlAvisoFoto(foto, 0, S.estado.form, S.__ahoraEs())
    chk('escape: el id de la foto en el contador', h1.includes(escapada('id_leyendo')) && !/<b data-xss=/.test(h1), h1)
    const foto2 = formConFoto(S, { error: marca('error_foto'), subida: true })
    const h2 = S.htmlAvisoFoto(foto2, 0, S.estado.form, S.__ahoraEs())
    chk('escape: el error de la foto', h2.includes(escapada('error_foto')) && !/<b data-xss=/.test(h2), h2)
  }

  for (const f of fallas) console.log('  FALLA: ' + f)
  const total = ok + fallas.length
  console.log(`${ok}/${total} ${fallas.length ? 'ROJO' : 'verde'}`)
  process.exit(fallas.length ? 1 : 0)
}

main().catch(err => {
  console.log('EXCEPCIÓN: ' + (err && err.stack || err))
  console.log('ROJO')
  process.exit(1)
})
