// LA SALUD DE LA APP (27/09/2026): registro de errores, la sesión al volver de
// estar bloqueada y el aviso de "Sin conexión". Lo instala js/supabase.js en
// TODAS las pantallas (instalarSalud(supabase)), así ninguna tiene que
// acordarse.
//
// Nació de un caso real: la planta, en una tablet Samsung, quedó en blanco al
// desbloquear la pantalla, y no había forma de saber qué había pasado.
//
// 1. REGISTRO DE ERRORES → registrar_error_app(p_pantalla, p_mensaje,
//    p_detalle, p_url, p_dispositivo, p_evento), que anota en errores_app
//    (tope de 200 por persona por día; la lee solo un super_admin). Eventos:
//    'error' (window.onerror), 'promesa' (unhandledrejection), 'rpc' (una RPC
//    que falló), 'sesion' (la sesión se cortó o no se pudo renovar) y
//    'reanudar' (volver de estar bloqueada costó o falló).
//    NUNCA datos sensibles: no se mandan los parámetros de ninguna RPC (ahí
//    van PINes e importes), se tapan los números largos del texto, y la URL va
//    sin su ? ni su # (el # de una recuperación de contraseña trae un token).
//    Si el registro falla, no rompe nada; si no hay red, queda en una cola
//    chiquita del navegador y se manda después.
//
// 2. AL VOLVER (visibilitychange, pageshow, resume, online): se revisa la
//    sesión —renovándola si venció— y se avisa con el evento
//    'app:reanudada' para que la pantalla se redibuje EN EL MISMO LUGAR, sin
//    navegar. Sin red: "Sin conexión, reintentando…" y se reintenta solo.
//    UN EVENTO DE SESIÓN PASAJERO NUNCA MANDA AL LOGIN: solo una respuesta
//    de Auth que dice que la sesión ya no existe (refresh token inválido) o
//    que el usuario fue dado de baja / su sesión cortada.
//
// 3. SESIÓN CORTADA → al login (o al de la planta, <meta name="sd-login">)
//    con "Tu sesión fue cerrada. Volvé a iniciar sesión."

const CLAVE_COLA = 'sd_errores_pendientes'
const CLAVE_AVISO_LOGIN = 'sd_aviso_login'
const MAX_COLA = 20
const REPETIDO_MS = 60 * 1000
const ESPERA_SESION_MS = 10 * 1000
export const MENSAJE_SESION_CERRADA = 'Tu sesión fue cerrada. Volvé a iniciar sesión.'
// Los errores de una función propia de la base (raise exception) son
// mensajes para la persona ("No tenés permiso", "Poné el motivo"), no fallas
// de la app: no se registran.
const CODIGOS_DE_NEGOCIO = new Set(['P0001'])

let cliente = null
let rpcOriginal = null
const recientes = new Map()

// ── Qué se manda ─────────────────────────────────────────────────────────────

export function pantallaActual(loc = globalThis.location) {
  const ruta = String(loc?.pathname ?? '')
  return (ruta.split('/').pop() || 'index.html').replace(/\.html$/, '') || 'index'
}

// La URL sin ? ni #: un parámetro puede traer un id que no hace falta y el #
// de una recuperación de contraseña trae un token.
export function urlSegura(loc = globalThis.location) {
  try { return String(loc.origin ?? '') + String(loc.pathname ?? '') } catch { return '' }
}

export function dispositivo(nav = globalThis.navigator, win = globalThis) {
  let modo = 'navegador'
  try { if (win.matchMedia?.('(display-mode: standalone)')?.matches) modo = 'app instalada' } catch { /* nada */ }
  let orientacion = ''
  try { orientacion = win.screen?.orientation?.type ?? '' } catch { /* nada */ }
  const tam = `${win.innerWidth ?? '?'}x${win.innerHeight ?? '?'}`
  return [String(nav?.userAgent ?? ''), modo, tam, orientacion].filter(Boolean).join(' · ').slice(0, 300)
}

// Tapa los números de 4 cifras o más que no son parte de un id (un PIN, un
// importe, un CUIT): "PIN 4821 rechazado" → "PIN # rechazado". Los uuid y los
// nombres de archivo con números no se tocan (van pegados a letras o guiones).
export function limpiarTexto(t) {
  return String(t ?? '')
    .replace(/(?<![\w\-./])\d[\d.,]{2,}\d(?![\w\-/])/g, (m) => (m.replace(/\D/g, '').length >= 4 ? '#' : m))
    .replace(/(contrase(ñ|n)a|password|pin|token)\s*[:=]\s*\S+/gi, '$1: #')
    .slice(0, 4000)
}

// La cola de lo que no se pudo mandar (sin red). Nunca más de MAX_COLA.
function leerCola(ls = globalThis.localStorage) {
  try { const c = JSON.parse(ls?.getItem(CLAVE_COLA) ?? '[]'); return Array.isArray(c) ? c : [] } catch { return [] }
}
function guardarCola(cola, ls = globalThis.localStorage) {
  try { cola.length ? ls?.setItem(CLAVE_COLA, JSON.stringify(cola.slice(-MAX_COLA))) : ls?.removeItem(CLAVE_COLA) } catch { /* nada */ }
}

export function parametrosError({ evento = 'error', mensaje, detalle = null }) {
  return {
    p_pantalla: pantallaActual(),
    p_mensaje: limpiarTexto(mensaje || '(sin mensaje)').slice(0, 1000),
    p_detalle: detalle == null ? null : limpiarTexto(detalle),
    p_url: urlSegura(),
    p_dispositivo: dispositivo(),
    p_evento: evento,
  }
}

async function mandar(params) {
  if (!rpcOriginal) return false
  try {
    const { error } = await rpcOriginal('registrar_error_app', params)
    return !error
  } catch { return false }
}

// Registra un error. Nunca tira. El mismo mensaje del mismo evento no se
// repite en un minuto (un error en un bucle no se come el tope del día).
export async function registrarError({ evento = 'error', mensaje, detalle = null }) {
  try {
    const params = parametrosError({ evento, mensaje, detalle })
    const clave = evento + '|' + params.p_pantalla + '|' + params.p_mensaje
    const ahora = Date.now()
    if (recientes.has(clave) && ahora - recientes.get(clave) < REPETIDO_MS) return
    recientes.set(clave, ahora)
    if (!(await mandar(params))) guardarCola([...leerCola(), params])
  } catch { /* el registro nunca rompe nada */ }
}

// Manda lo que quedó en la cola (al volver la red o al reanudar).
export async function vaciarCola() {
  const cola = leerCola()
  if (!cola.length) return
  guardarCola([])
  const quedan = []
  for (const p of cola) if (!(await mandar(p))) quedan.push(p)
  if (quedan.length) guardarCola([...quedan, ...leerCola()])
}

// ── ¿Qué clase de error es? ──────────────────────────────────────────────────

// Sin red (o la red no llegó): fetch que falló, un corte, un timeout.
export function esErrorDeRed(err) {
  if (!err) return false
  const t = `${err.name ?? ''} ${err.message ?? ''} ${err.details ?? ''}`
  return err.name === 'AuthRetryableFetchError' || err.status === 0 ||
    /Failed to fetch|NetworkError|Load failed|fetch failed|ERR_INTERNET|network|timeout|tiempo agotado/i.test(t)
}

// Auth dice que la sesión YA NO EXISTE: el refresh token no sirve más (se
// cerró la sesión desde otro lado, se cortaron las sesiones, se dio de baja).
export function esSesionInvalida(err) {
  if (!err || esErrorDeRed(err)) return false
  const t = `${err.code ?? ''} ${err.message ?? ''}`
  return /refresh_token_not_found|refresh_token_already_used|session_not_found|session_expired|Invalid Refresh Token|user_not_found|user_banned/i.test(t)
}

// La base no encuentra al usuario de la sesión (mi_empleado_id() null): lo
// dado de baja o con la sesión cortada después de emitido el token.
export function esUsuarioNoIdentificado(err) {
  return /No se pudo identificar tu usuario/i.test(String(err?.message ?? ''))
}

// ── El aviso de "Sin conexión" ───────────────────────────────────────────────

export function mostrarSinConexion(texto = 'Sin conexión, reintentando…', doc = globalThis.document) {
  if (!doc?.body) return
  let el = doc.getElementById('sd-aviso-conexion')
  if (!el) {
    el = doc.createElement('div')
    el.id = 'sd-aviso-conexion'
    el.className = 'aviso-conexion'
    el.setAttribute('role', 'status')
    doc.body.appendChild(el)
  }
  el.textContent = texto
  el.hidden = false
}

export function ocultarSinConexion(doc = globalThis.document) {
  const el = doc?.getElementById?.('sd-aviso-conexion')
  if (el) el.hidden = true
}

// ── La sesión cortada ────────────────────────────────────────────────────────

// Adónde se entra: login.html de la raíz, salvo que la pantalla diga otra
// cosa. La planta tiene su propio login, dentro del alcance de su app
// (<meta name="sd-login" content="produccion-entrar.html">): así ninguna
// navegación de la planta sale de su manifest.
const LOGIN_POR_DEFECTO = new URL('../login.html', import.meta.url).href
export function rutaLogin(doc = globalThis.document, loc = globalThis.location) {
  const meta = doc?.querySelector?.('meta[name="sd-login"]')?.getAttribute('content')
  if (!meta) return LOGIN_POR_DEFECTO
  try {
    const u = new URL(meta, loc.href)
    // Solo una página del mismo sitio: un meta raro no manda a otro lado.
    return u.origin === new URL(loc.href).origin ? u.href : LOGIN_POR_DEFECTO
  } catch { return LOGIN_POR_DEFECTO }
}

let cortando = false
export async function sesionCortada(motivo = 'sesion') {
  if (cortando) return
  cortando = true
  try { registrarError({ evento: 'sesion', mensaje: 'La sesión se cortó: ' + motivo }) } catch { /* nada */ }
  try { globalThis.localStorage?.setItem(CLAVE_AVISO_LOGIN, MENSAJE_SESION_CERRADA) } catch { /* nada */ }
  try { await cliente?.auth.signOut({ scope: 'local' }) } catch { /* nada */ }
  globalThis.location.replace(rutaLogin())
}

// El login lo lee una vez y lo borra: "Tu sesión fue cerrada…".
export function tomarAvisoLogin(ls = globalThis.localStorage) {
  try { const m = ls?.getItem(CLAVE_AVISO_LOGIN); if (m) ls.removeItem(CLAVE_AVISO_LOGIN); return m || null } catch { return null }
}

// ── Promesa con tiempo ───────────────────────────────────────────────────────

export function conTiempo(promesa, ms) {
  let t
  return Promise.race([
    promesa,
    new Promise((_, rej) => { t = setTimeout(() => rej(Object.assign(new Error('tiempo agotado'), { name: 'TiempoAgotado' })), ms) }),
  ]).finally(() => clearTimeout(t))
}

// ── Al volver ────────────────────────────────────────────────────────────────

let revisando = null
let reintento = null
let intentos = 0
// ¿Esta página TUVO sesión? Si la tuvo y al volver ya no está (sin ningún
// error de red de por medio), el SDK la borró porque Auth dijo que no existe
// más: es un corte de verdad. Si nunca la tuvo (el login), no hay nada que
// cortar.
let teniaSesion = false

// Revisa la sesión y, si está bien, avisa 'app:reanudada'. Devuelve 'ok',
// 'sin_red', 'sin_sesion' o 'cortada'.
export async function revisarAlVolver(origen = 'volver') {
  if (revisando) return revisando
  revisando = (async () => {
    const t0 = Date.now()
    try {
      const { data, error } = await conTiempo(cliente.auth.getSession(), ESPERA_SESION_MS)
      if (error && esSesionInvalida(error)) { await sesionCortada('al volver: ' + (error.code || error.message)); return 'cortada' }
      if (error) throw error
      const s = data?.session
      // Sin sesión guardada: esta pantalla no tenía (el login) o se cerró en
      // otra pestaña. Si la pantalla la necesitaba, lo decide verificarSesion.
      if (!s) {
        ocultarSinConexion()
        if (teniaSesion) { await sesionCortada('al volver, la sesión ya no estaba'); return 'cortada' }
        return 'sin_sesion'
      }
      teniaSesion = true
      if (Number(s.expires_at) * 1000 - Date.now() < 60 * 1000) {
        const r = await conTiempo(cliente.auth.refreshSession(), ESPERA_SESION_MS)
        if (r.error && esSesionInvalida(r.error)) { await sesionCortada('al volver: ' + (r.error.code || r.error.message)); return 'cortada' }
        if (r.error) throw r.error
      }
      ocultarSinConexion()
      const demora = Date.now() - t0
      if (intentos > 0 || demora > 5000) {
        registrarError({ evento: 'reanudar', mensaje: `Volvió después de ${intentos} reintentos (${Math.round(demora / 1000)} s)`, detalle: origen })
      }
      intentos = 0
      clearTimeout(reintento)
      vaciarCola()
      globalThis.dispatchEvent?.(new CustomEvent('app:reanudada', { detail: { origen } }))
      return 'ok'
    } catch (err) {
      intentos++
      mostrarSinConexion()
      if (intentos === 1) registrarError({ evento: 'reanudar', mensaje: 'Al volver no se pudo revisar la sesión: ' + (err?.message ?? err), detalle: origen })
      clearTimeout(reintento)
      // 3 s, 6 s, 12 s… hasta 30 s entre intentos.
      reintento = setTimeout(() => revisarAlVolver('reintento'), Math.min(30000, 3000 * 2 ** Math.min(intentos - 1, 4)))
      return 'sin_red'
    } finally {
      revisando = null
    }
  })()
  return revisando
}

// ── Instalar ─────────────────────────────────────────────────────────────────

// ── LA PLANTA NUNCA QUEDA AFUERA DE SU ALCANCE (29/09/2026) ─────────────────
// Red de seguridad del "atrás" de Android: si la pestaña de la PLANTA
// INSTALADA (anclada en la tablet) termina en otra página de la app, vuelve
// sola a la planta en vez de quedarse en blanco. La planta lo anota en la
// pestaña (sessionStorage, que es de esa pestaña) solo para una cuenta de
// dispositivo en la app instalada; al mandar a la gestión lo borra.
export const CLAVE_PLANTA_INSTALADA = 'sd_planta_instalada'
const RUTA_PLANTA = '/modulos/produccion.html'

export function esAppInstalada(win = globalThis) {
  try {
    if (win.navigator?.standalone === true) return true
    return ['standalone', 'fullscreen', 'minimal-ui'].some(m => win.matchMedia?.(`(display-mode: ${m})`)?.matches === true)
  } catch { return false }
}

export function marcarPlantaInstalada(win = globalThis) {
  try { if (esAppInstalada(win)) win.sessionStorage.setItem(CLAVE_PLANTA_INSTALADA, '1') } catch { /* nada */ }
}

export function olvidarPlantaInstalada(win = globalThis) {
  try { win.sessionStorage.removeItem(CLAVE_PLANTA_INSTALADA) } catch { /* nada */ }
}

// ¿Hay que volver a la planta? Devuelve la dirección, o null.
export function destinoRedPlanta(win = globalThis, base = import.meta.url) {
  try {
    if (win.sessionStorage?.getItem(CLAVE_PLANTA_INSTALADA) !== '1') return null
    const planta = new URL('..' + RUTA_PLANTA, base)
    const ruta = String(win.location?.pathname ?? '')
    if (ruta === planta.pathname) return null
    // El segundo factor lo pide verificarSesion() y vuelve solo: no se corta.
    if (ruta.endsWith('/mfa.html')) return null
    return planta.href
  } catch { return null }
}

export function volverALaPlantaSiSeSalio(win = globalThis) {
  const destino = destinoRedPlanta(win)
  if (destino) { try { win.location.replace(destino) } catch { /* nada */ } }
  return destino
}

export function instalarSalud(supabase, win = globalThis) {
  volverALaPlantaSiSeSalio(win)
  if (!supabase || cliente) return
  cliente = supabase
  rpcOriginal = supabase.rpc.bind(supabase)
  try { supabase.auth.onAuthStateChange((_ev, ses) => { if (ses) teniaSesion = true }) } catch { /* nada */ }

  // Cada RPC que falla (menos los mensajes de negocio y el propio registro).
  supabase.rpc = (fn, args, opciones) => {
    const q = rpcOriginal(fn, args, opciones)
    if (fn === 'registrar_error_app' || !q || typeof q.then !== 'function') return q
    const then = q.then.bind(q)
    q.then = (ok, mal) => then((r) => {
      const e = r?.error
      if (e) {
        if (esUsuarioNoIdentificado(e)) verificarCorte()
        else if (!CODIGOS_DE_NEGOCIO.has(e.code)) registrarError({ evento: 'rpc', mensaje: `${fn}: ${e.code ?? ''} ${e.message ?? ''}`.trim(), detalle: e.details ?? e.hint ?? null })
      }
      return r
    }).then(ok, mal)
    return q
  }

  win.addEventListener?.('error', (ev) => {
    registrarError({ evento: 'error', mensaje: ev?.message || String(ev?.error ?? 'error'), detalle: [ev?.filename ? String(ev.filename).split('?')[0] : null, ev?.lineno, ev?.colno, ev?.error?.stack].filter(Boolean).join(' · ') })
  })
  win.addEventListener?.('unhandledrejection', (ev) => {
    const r = ev?.reason
    registrarError({ evento: 'promesa', mensaje: r?.message || String(r ?? 'promesa rechazada'), detalle: r?.stack ?? null })
  })

  // Al volver: la pantalla visible otra vez, una página restaurada de la
  // caché de atrás/adelante, una página descongelada o la red que vuelve.
  let pendiente = null
  const alVolver = (origen) => { clearTimeout(pendiente); pendiente = setTimeout(() => revisarAlVolver(origen), 300) }
  win.document?.addEventListener?.('visibilitychange', () => { if (win.document.visibilityState === 'visible') alVolver('visible') })
  win.document?.addEventListener?.('resume', () => alVolver('resume'))
  win.addEventListener?.('pageshow', (ev) => { if (ev?.persisted) alVolver('pageshow') })
  win.addEventListener?.('online', () => alVolver('online'))
  // Lo que quedó sin mandar de otra vez.
  setTimeout(() => vaciarCola(), 5000)
}

// La base dijo "No se pudo identificar tu usuario": o la sesión se cortó, o
// el usuario fue dado de baja. Se renueva la sesión: si Auth dice que ya no
// existe, se corta; si se renueva y la base sigue sin identificarlo, también
// (dado de baja). Si no hay red, no se hace nada: no es un corte.
let verificandoCorte = false
export async function verificarCorte() {
  if (verificandoCorte || !cliente) return
  verificandoCorte = true
  try {
    const r = await conTiempo(cliente.auth.refreshSession(), ESPERA_SESION_MS)
    if (r.error) { if (esSesionInvalida(r.error)) await sesionCortada('la base no identifica al usuario y la sesión no se renueva'); return }
    const { data, error } = await rpcOriginal('mi_empleado_id')
    if (!error && data == null) await sesionCortada('usuario dado de baja o sesión cortada')
  } catch { /* sin red: no es un corte */ }
  finally { verificandoCorte = false }
}
