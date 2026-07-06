// Este Service Worker fue desactivado. Este código existe únicamente
// para desregistrarse a sí mismo y borrar cualquier caché vieja en los
// pocos navegadores que hayan llegado a registrarlo alguna vez.

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((nombres) => Promise.all(nombres.map((nombre) => caches.delete(nombre))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.matchAll())
      .then((clientes) => {
        clientes.forEach((cliente) => cliente.navigate(cliente.url))
      })
  )
})
