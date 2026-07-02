export function mostrarBannerVersion() {
  const banner = document.createElement('div')
  banner.id = 'version-banner'
  banner.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#111;color:#0f0;font-family:monospace;font-size:12px;font-weight:bold;padding:6px 8px;z-index:99998;text-align:center;'
  banner.textContent = 'Verificando versión…'
  document.body.prepend(banner)

  const urlSinCache = window.location.pathname + '?_check=' + Date.now()
  fetch(urlSinCache, { method: 'HEAD', cache: 'no-store' })
    .then(r => {
      const lastMod = r.headers.get('last-modified')
      banner.textContent = lastMod
        ? '🟢 Build: ' + new Date(lastMod).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'medium' })
        : '⚠️ No se pudo verificar la versión'
    })
    .catch(() => { banner.textContent = '⚠️ Error al verificar versión (sin conexión)' })
}
