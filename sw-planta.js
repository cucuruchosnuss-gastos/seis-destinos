// EL SERVICE WORKER DE LA PLANTA (06/10/2026): que la tablet abra SIN INTERNET.
//
// POR QUÉ EL ANTERIOR SE APAGÓ (eda3595, 06/07/2026) Y CÓMO SE EVITA ACÁ:
//  1. Servía TODO de la caché primero (cache-first), también el HTML: la
//     gente veía la versión vieja hasta que alguien subiera a mano el número
//     CACHE_VERSION en cada commit (casi todos los commits de julio tocan
//     sw.js solo para eso). Acá el HTML va SIEMPRE a la red primero (3 s) y la
//     copia es solo para cuando no hay red.
//  2. La "versión" era un número a mano. Acá la versión es la HUELLA de los
//     archivos de la app (SHA-256 de todo lo que la planta carga): cambia sola
//     cuando cambia cualquier archivo. Nadie tiene que acordarse de nada.
//  3. Se registraba desde index.html con rutas absolutas ('/sw.js',
//     '/index.html'), que en GitHub Pages (/seis-destinos/) apuntaban afuera.
//     Acá todo se resuelve contra la ubicación de este archivo.
//  4. Su alcance era TODA la app. Este controla SOLO la planta
//     (scope modulos/produccion.html): el resto de la app sigue como siempre.
//
// QUÉ GUARDA: la planta y lo que carga (HTML, JS, CSS, fuentes, íconos y el
// manifest), encontrado leyendo los propios archivos (los <script>, <link>,
// import y url(...)). NUNCA las respuestas de Supabase ni Turnstile.
//
// CÓMO: el conjunto se arma COMPLETO en una caché nueva ('planta-app-<huella>')
// y recién cuando está entero pasa a ser el actual y se borran los viejos: la
// copia nunca queda mezclada (HTML nuevo con JS viejo deja la pantalla en
// blanco). La página pide revisar al abrir, al volver la red y cada 15 min.
// Si la huella cambió, avisa "Hay una versión nueva · Actualizar"; nunca
// recarga sola.
//
// Una página que se sirvió desde la copia (sin red) carga sus JS y CSS de esa
// MISMA copia; una que vino de la red, los pide a la red (10 s) y solo si no
// llegan usa la copia.

const PREFIJO = 'planta-app-'
const META = 'planta-meta'
const RAIZ = new URL('./', self.location.href).href
const INICIO = new URL('modulos/produccion.html', RAIZ).href
const ESPERA_HTML_MS = 3000
const ESPERA_RECURSO_MS = 10000
const MAX_ARCHIVOS = 250
const HOSTS_CDN = new Set(['cdn.jsdelivr.net', 'unpkg.com', 'fonts.googleapis.com', 'fonts.gstatic.com', 'cdnjs.cloudflare.com'])
const NUNCA = /supabase\.co|challenges\.cloudflare\.com/i
const EXT_APP = /\.(html|js|mjs|css|png|jpg|jpeg|webp|svg|ico|webmanifest|json|woff2?)$/i

// ¿Es un archivo de la app (que se puede guardar)?
function esDeLaApp(urlTexto) {
  let u
  try { u = new URL(urlTexto) } catch { return false }
  if (NUNCA.test(u.href)) return false
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return false
  if (u.origin === self.location.origin) {
    if (!u.href.startsWith(RAIZ)) return false
    // La verificación de versión (js/version-banner.js) va siempre a la red.
    if (u.searchParams.has('_check')) return false
    return EXT_APP.test(u.pathname)
  }
  return HOSTS_CDN.has(u.hostname)
}

// Las referencias de un archivo de texto, ya resueltas contra su dirección.
function referencias(texto, base, tipo) {
  const out = new Set()
  const sumar = (r) => {
    if (!r || /^(data:|blob:|#|mailto:|javascript:)/i.test(r)) return
    try { out.add(new URL(r, base).href) } catch { /* nada */ }
  }
  let m
  if (tipo === 'html') {
    const reScript = /<script\b[^>]*\bsrc=["']([^"']+)["']/gi
    while ((m = reScript.exec(texto))) sumar(m[1])
    const reLink = /<link\b[^>]*>/gi
    while ((m = reLink.exec(texto))) {
      const tag = m[0]
      const rel = /\brel=["']([^"']+)["']/i.exec(tag)?.[1] ?? ''
      if (!/stylesheet|manifest|icon|apple-touch-icon/i.test(rel)) continue
      const href = /\bhref=["']([^"']+)["']/i.exec(tag)?.[1]
      sumar(href)
    }
  }
  if (tipo === 'html' || tipo === 'js') {
    const reFrom = /\b(?:import|export)\b[^'"`;]*?\bfrom\s*["']([^"']+)["']/g
    while ((m = reFrom.exec(texto))) sumar(m[1])
    const reSolo = /\bimport\s*["']([^"']+)["']/g
    while ((m = reSolo.exec(texto))) sumar(m[1])
    const reDin = /\bimport\(\s*["']([^"']+)["']\s*\)/g
    while ((m = reDin.exec(texto))) sumar(m[1])
  }
  if (tipo === 'css') {
    const reUrl = /url\(\s*["']?([^"')]+)["']?\s*\)/g
    while ((m = reUrl.exec(texto))) sumar(m[1])
    const reImp = /@import\s+["']([^"']+)["']/g
    while ((m = reImp.exec(texto))) sumar(m[1])
  }
  if (tipo === 'manifest') {
    try {
      const j = JSON.parse(texto)
      for (const i of j.icons ?? []) sumar(i.src)
    } catch { /* nada */ }
  }
  return [...out].filter(esDeLaApp)
}

function tipoDe(url, resp) {
  const ct = resp.headers.get('content-type') ?? ''
  if (/text\/html/.test(ct) || /\.html$/i.test(new URL(url).pathname)) return 'html'
  if (/css/.test(ct) || /\.css$/i.test(new URL(url).pathname)) return 'css'
  if (/manifest/.test(ct) || /\.webmanifest$/i.test(new URL(url).pathname)) return 'manifest'
  if (/javascript|ecmascript/.test(ct) || /\.(m?js)$/i.test(new URL(url).pathname) || /\/\+esm$/.test(url)) return 'js'
  return 'otro'
}

async function huellaDe(archivos) {
  const enc = new TextEncoder()
  const partes = []
  for (const a of [...archivos].sort((x, y) => (x.url < y.url ? -1 : 1))) {
    partes.push(enc.encode(a.url + '\n'))
    partes.push(new Uint8Array(a.cuerpo))
  }
  const total = partes.reduce((n, p) => n + p.length, 0)
  const todo = new Uint8Array(total)
  let i = 0
  for (const p of partes) { todo.set(p, i); i += p.length }
  const dig = await crypto.subtle.digest('SHA-256', todo)
  return [...new Uint8Array(dig)].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16)
}

// Baja la planta y TODO lo que carga, siguiendo las referencias. Si algo no
// baja, falla entera (una copia a medias no sirve).
async function juntarArchivos() {
  const pendientes = [INICIO]
  const vistos = new Set()
  const archivos = []
  while (pendientes.length) {
    const url = pendientes.shift()
    if (vistos.has(url)) continue
    vistos.add(url)
    if (vistos.size > MAX_ARCHIVOS) throw new Error('demasiados archivos')
    const mismoOrigen = new URL(url).origin === self.location.origin
    const resp = await fetch(url, { cache: mismoOrigen ? 'no-cache' : 'default', mode: mismoOrigen ? 'same-origin' : 'cors', credentials: 'omit' })
    // La planta misma tiene que bajar. Una referencia que da 404 (algo que
    // pareció un import adentro de un texto) se saltea; sin red, falla entera.
    if (!resp.ok) {
      if (url === INICIO) throw new Error(`no bajó ${url} (${resp.status})`)
      continue
    }
    const cuerpo = await resp.arrayBuffer()
    const encabezados = {}
    for (const h of ['content-type', 'cache-control']) { const v = resp.headers.get(h); if (v) encabezados[h] = v }
    archivos.push({ url, cuerpo, encabezados, estado: resp.status })
    const tipo = tipoDe(url, resp)
    if (tipo !== 'otro') {
      const texto = new TextDecoder().decode(cuerpo)
      // La URL final (después de una redirección, unpkg @latest): las
      // referencias relativas se resuelven contra ella.
      for (const r of referencias(texto, resp.url || url, tipo)) if (!vistos.has(r)) pendientes.push(r)
    }
  }
  return archivos
}

async function huellaActual() {
  const meta = await caches.open(META)
  const r = await meta.match('actual')
  return r ? (await r.text()) : null
}

let revisando = null
// Arma la copia de nuevo. Devuelve { huella, cambio } o { error }.
function revisar() {
  if (revisando) return revisando
  revisando = (async () => {
    try {
      const archivos = await juntarArchivos()
      const huella = await huellaDe(archivos)
      const antes = await huellaActual()
      if (huella !== antes) {
        const nombre = PREFIJO + huella
        await caches.delete(nombre)
        const cache = await caches.open(nombre)
        for (const a of archivos) {
          await cache.put(a.url, new Response(a.cuerpo, { status: a.estado, headers: a.encabezados }))
        }
        const meta = await caches.open(META)
        await meta.put('actual', new Response(huella))
        await borrarViejas(huella)
      }
      return { huella, cambio: antes != null && huella !== antes, primera: antes == null }
    } catch (err) {
      return { error: String(err?.message ?? err) }
    } finally {
      revisando = null
    }
  })()
  return revisando
}

// Borra las cachés que no son la actual (también las del Service Worker
// anterior, 'seis-destinos-v36' y compañía).
async function borrarViejas(huella) {
  const nombres = await caches.keys()
  await Promise.all(nombres.filter(n => n !== META && n !== PREFIJO + huella).map(n => caches.delete(n)))
}

async function desdeCopia(req) {
  const h = await huellaActual()
  if (!h) return null
  const cache = await caches.open(PREFIJO + h)
  const esNav = req.mode === 'navigate'
  return (await cache.match(req, { ignoreVary: true, ignoreSearch: esNav })) ??
    (esNav ? await cache.match(INICIO, { ignoreVary: true }) : null)
}

function conTiempo(promesa, ms) {
  let t
  return Promise.race([promesa, new Promise((_, rej) => { t = setTimeout(() => rej(new Error('tiempo agotado')), ms) })])
    .finally(() => clearTimeout(t))
}

// De qué se sirvió cada página: 'red' o 'copia'. Decide de dónde salen sus
// JS y CSS (los de la copia con la página de la copia, nunca mezclados).
const origenDePagina = new Map()

self.addEventListener('install', (ev) => {
  self.skipWaiting()
  // La primera copia; si no hay red, se arma después (no frena la instalación).
  ev.waitUntil(revisar().then(() => undefined))
})

self.addEventListener('activate', (ev) => {
  ev.waitUntil((async () => {
    const h = await huellaActual()
    if (h) await borrarViejas(h)
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', (ev) => {
  const req = ev.request
  if (req.method !== 'GET') return
  if (!esDeLaApp(req.url)) return
  if (req.mode === 'navigate') {
    ev.respondWith((async () => {
      try {
        const resp = await conTiempo(fetch(req), ESPERA_HTML_MS)
        if (ev.resultingClientId) origenDePagina.set(ev.resultingClientId, 'red')
        return resp
      } catch (err) {
        const copia = await desdeCopia(req)
        if (copia) {
          if (ev.resultingClientId) origenDePagina.set(ev.resultingClientId, 'copia')
          return copia
        }
        throw err
      }
    })())
    return
  }
  ev.respondWith((async () => {
    // Una página de la copia: sus archivos, de la misma copia.
    if (origenDePagina.get(ev.clientId) === 'copia') {
      const c = await desdeCopia(req)
      if (c) return c
    }
    try {
      return await conTiempo(fetch(req), ESPERA_RECURSO_MS)
    } catch (err) {
      const c = await desdeCopia(req)
      if (c) return c
      throw err
    }
  })())
})

self.addEventListener('message', (ev) => {
  const tipo = ev.data?.tipo
  const fuente = ev.source
  if (tipo === 'revisar') {
    ev.waitUntil(revisar().then(r => { try { fuente?.postMessage({ tipo: 'huella', ...r }) } catch { /* nada */ } }))
  } else if (tipo === 'origen') {
    try { fuente?.postMessage({ tipo: 'origen', origen: origenDePagina.get(fuente.id) ?? 'red' }) } catch { /* nada */ }
  }
})
