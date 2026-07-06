const CACHE_VERSION = 'v35'
const CACHE_NOMBRE = `seis-destinos-${CACHE_VERSION}`

const ARCHIVOS_SHELL = [
  '/index.html',
  '/login.html',
  '/registro.html',
  '/dashboard.html',
  '/modulos/gastos.html',
  '/modulos/materia-prima.html',
  '/css/main.css',
  '/js/supabase.js',
  '/js/auth.js',
  '/js/utils.js',
  '/js/version-banner.js',
  '/manifest.json',
  'https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js'
]

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(CACHE_NOMBRE).then((cache) =>
      Promise.all(
        ARCHIVOS_SHELL.map((url) =>
          fetch(url).then((respuesta) => {
            // Solo cachear respuestas 200 — nunca 301, 302 ni errores
            if (respuesta.status === 200) {
              return cache.put(url, respuesta)
            }
          }).catch(() => {
            // Si un archivo no se puede obtener, continuar con el resto
          })
        )
      )
    )
  )
  self.skipWaiting()
})

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys().then((nombres) =>
      Promise.all(
        nombres
          .filter((nombre) => nombre !== CACHE_NOMBRE)
          .map((nombre) => caches.delete(nombre))
      )
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (evento) => {
  if (evento.request.method !== 'GET') return

  const url = new URL(evento.request.url)

  // Solo interceptar peticiones al mismo origen
  if (url.origin !== self.location.origin) return

  evento.respondWith(
    caches.match(evento.request).then((respuestaCache) => {
      if (respuestaCache) return respuestaCache

      return fetch(evento.request).then((respuesta) => {
        // Solo cachear respuestas válidas
        if (!respuesta || respuesta.status !== 200) return respuesta

        const copiaRespuesta = respuesta.clone()
        caches.open(CACHE_NOMBRE).then((cache) => {
          cache.put(evento.request, copiaRespuesta)
        })

        return respuesta
      }).catch(() => {
        // Sin conexión y sin cache: devolver página de error offline si existiera
        return new Response('<p>Sin conexión.</p>', { headers: { 'Content-Type': 'text/html' } })
      })
    })
  )
})
