export function mostrarBannerVersion() {
  const banner = document.createElement('div')
  banner.id = 'version-banner'
  banner.style.cssText = 'position:fixed; bottom:10px; right:10px; width:12px; height:12px; border-radius:50%; background:#999; z-index:99998; cursor:pointer; box-shadow:0 0 0 3px rgba(255,255,255,0.9), 0 1px 4px rgba(0,0,0,0.2);'
  banner.title = 'Verificando versión…'
  document.body.appendChild(banner)

  banner.addEventListener('click', () => alert(banner.title))

  const urlSinCache = window.location.pathname + '?_check=' + Date.now()
  fetch(urlSinCache, { method: 'HEAD', cache: 'no-store' })
    .then(r => {
      const lastMod = r.headers.get('last-modified')
      if (lastMod) {
        banner.style.background = '#16a34a'
        banner.title = 'Build: ' + new Date(lastMod).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'medium' })
      } else {
        banner.style.background = '#f59e0b'
        banner.title = 'No se pudo verificar la versión'
      }
    })
    .catch(() => {
      banner.style.background = '#ef4444'
      banner.title = 'Error al verificar versión (sin conexión)'
    })
}
