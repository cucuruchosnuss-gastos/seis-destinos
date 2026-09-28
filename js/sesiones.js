// Las sesiones abiertas de una persona y cerrarlas todas (27/09/2026).
//
// Un solo componente, compartido por las dos pantallas que lo usan:
//  - Accesos: la ficha de cada usuario (solo un super_admin entra ahí).
//  - "Mis sesiones abiertas", en el menú de perfil de cada persona.
// Copiado en dos archivos serían dos reglas que divergen en silencio (la
// misma razón que js/salud.js o js/cobranzas-comun.js).
//
// La base decide todo: sesiones_de(p_empleado_id) devuelve las sesiones
// (creada, ultima_actividad, dispositivo = el user agent, ip) solo a la propia
// persona o a un super_admin, y cerrar_sesiones(p_empleado_id, p_motivo)
// cierra todas (borra las de Auth y marca empleados.sesiones_revocadas_en, así
// el token que quedó vivo deja de servir) con motivo de 3 letras o más, solo
// consigo mismo o siendo super_admin. Sus mensajes ya vienen para una
// persona: se muestran TAL CUAL.
//
// El user agent y la IP vienen de la base y los manda quien se conecta: van
// SIEMPRE escapados.

import { sesionCortada } from './salud.js'

export const LARGO_MINIMO_MOTIVO_SESIONES = 3
const ZONA_AR = 'America/Argentina/Buenos_Aires'

export function escSes(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

// "Chrome en Android", "Safari en iPhone", "Edge en Windows"… Lo que no es un
// navegador conocido dice "Otro programa"; sin nada, "Dispositivo desconocido".
export function dispositivoLegible(ua) {
  const t = String(ua ?? '').trim()
  if (!t) return 'Dispositivo desconocido'
  let nav = null
  if (/SamsungBrowser\//.test(t)) nav = 'Samsung Internet'
  else if (/Edg(A|iOS)?\//.test(t)) nav = 'Edge'
  else if (/OPR\/|Opera/.test(t)) nav = 'Opera'
  else if (/Firefox\/|FxiOS\//.test(t)) nav = 'Firefox'
  else if (/Chrome\/|CriOS\//.test(t)) nav = 'Chrome'
  else if (/Safari\//.test(t) && /Version\//.test(t)) nav = 'Safari'
  let so = null
  if (/Android/.test(t)) so = 'Android'
  else if (/iPhone/.test(t)) so = 'iPhone'
  else if (/iPad/.test(t)) so = 'iPad'
  else if (/CrOS/.test(t)) so = 'Chromebook'
  else if (/Windows/.test(t)) so = 'Windows'
  else if (/Macintosh|Mac OS X/.test(t)) so = 'Mac'
  else if (/Linux/.test(t)) so = 'Linux'
  if (nav && so) return `${nav} en ${so}`
  if (nav) return nav
  if (so) return `Navegador en ${so}`
  return 'Otro programa'
}

function partesAr(fecha) {
  const f = new Intl.DateTimeFormat('es-AR', { timeZone: ZONA_AR, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
  const p = Object.fromEntries(f.formatToParts(fecha).map(x => [x.type, x.value]))
  return { dia: `${p.day}/${p.month}/${p.year}`, hora: `${p.hour === '24' ? '00' : p.hour}:${p.minute}` }
}

// "recién", "hace 12 min", "hoy a las 14:32", "25/09/2026 a las 09:05". Una
// fecha que no se puede leer dice "—", nunca una fecha inventada.
export function momentoSesion(iso, ahora = new Date()) {
  const f = iso ? new Date(iso) : null
  if (!f || Number.isNaN(f.getTime())) return '—'
  const min = Math.floor((ahora.getTime() - f.getTime()) / 60000)
  if (min >= 0 && min < 1) return 'recién'
  if (min >= 1 && min < 60) return `hace ${min} min`
  const a = partesAr(f), h = partesAr(ahora)
  return a.dia === h.dia ? `hoy a las ${a.hora}` : `${a.dia} a las ${a.hora}`
}

export function motivoValido(t) {
  return String(t ?? '').trim().length >= LARGO_MINIMO_MOTIVO_SESIONES
}

export function htmlListaSesiones(filas, ahora = new Date()) {
  if (!filas.length) return '<p class="sesiones__vacio">No hay sesiones abiertas.</p>'
  return '<ul class="sesiones__lista">' + filas.map(s =>
    `<li class="sesiones__item"><span class="sesiones__dispositivo">${escSes(dispositivoLegible(s.dispositivo))}</span>` +
    `<span class="sesiones__detalle">Última actividad: ${escSes(momentoSesion(s.ultima_actividad, ahora))} · IP ${escSes(s.ip || '—')}</span>` +
    `<span class="sesiones__detalle">Abierta: ${escSes(momentoSesion(s.creada, ahora))}</span></li>`).join('') + '</ul>'
}

export function textoConfirmar({ nombre, cantidad, propia }) {
  const n = cantidad === 1 ? 'la sesión abierta' : `las ${cantidad} sesiones abiertas`
  return propia
    ? `¿Cerrar ${n}? También se cierra esta: vas a tener que volver a entrar.`
    : `¿Cerrar ${n} de ${nombre}? Va a tener que volver a entrar en todos sus dispositivos.`
}

// El panel entero, a partir de su estado.
export function htmlPanelSesiones(e, ahora = new Date()) {
  const titulo = e.propia ? 'Mis sesiones abiertas' : `Sesiones de ${escSes(e.nombre)}`
  let cuerpo
  if (e.error) {
    cuerpo = `<div class="sesiones__aviso sesiones__aviso--grave" role="alert">${escSes(e.error)}</div>` +
      '<button type="button" class="btn btn--secundario sesiones__boton" data-accion="reintentar">Volver a intentar</button>'
  } else if (!e.filas) {
    cuerpo = '<p class="sesiones__vacio">Cargando…</p>'
  } else {
    cuerpo = htmlListaSesiones(e.filas, ahora)
  }
  let acciones = ''
  if (e.hecho) {
    acciones = `<div class="sesiones__aviso" role="status">${escSes(e.hecho)}</div>`
  } else if (e.filas?.length) {
    const rotulo = e.propia ? 'Cerrar todas mis sesiones' : 'Cerrar todas sus sesiones'
    if (e.paso === 'confirmar' || e.paso === 'cerrando') {
      acciones = `<p class="sesiones__confirmar">${escSes(textoConfirmar({ nombre: e.nombre, cantidad: e.filas.length, propia: e.propia }))}</p>` +
        (e.errorCierre ? `<div class="sesiones__aviso sesiones__aviso--grave" role="alert">${escSes(e.errorCierre)}</div>` : '') +
        '<div class="sesiones__botones">' +
        `<button type="button" class="btn sesiones__boton sesiones__boton--peligro" data-accion="confirmar-cerrar"${e.paso === 'cerrando' ? ' disabled' : ''}>${e.paso === 'cerrando' ? 'Cerrando…' : 'Sí, cerrarlas'}</button>` +
        `<button type="button" class="btn btn--secundario sesiones__boton" data-accion="volver"${e.paso === 'cerrando' ? ' disabled' : ''}>Volver</button></div>`
    } else {
      acciones = '<label class="sesiones__rotulo" for="sesiones-motivo">Motivo</label>' +
        `<textarea id="sesiones-motivo" class="sesiones__motivo" rows="2" maxlength="300">${escSes(e.motivo)}</textarea>` +
        (e.errorMotivo ? `<div class="sesiones__aviso sesiones__aviso--grave" role="alert">${escSes(e.errorMotivo)}</div>` : '') +
        (e.propia ? '<p class="sesiones__nota">También se cierra esta sesión: vas a tener que volver a entrar.</p>' : '') +
        `<button type="button" class="btn sesiones__boton sesiones__boton--peligro" data-accion="pedir-cerrar">${rotulo}</button>`
    }
  }
  return '<div class="sesiones__cabecera">' +
      `<h2 class="sesiones__titulo" id="sesiones-titulo">${titulo}</h2>` +
      '<button type="button" class="sesiones__cerrar" data-accion="cerrar-panel" aria-label="Cerrar">✕</button></div>' +
    `<div class="sesiones__cuerpo">${cuerpo}</div>` +
    `<div class="sesiones__acciones">${acciones}</div>`
}

// ── Contra la base ─────────────────────────────────────────────────────────

export async function leerSesiones(sb, empleadoId) {
  try {
    const { data, error } = await sb.rpc('sesiones_de', { p_empleado_id: empleadoId })
    if (error) throw error
    return { filas: Array.isArray(data) ? data : [], error: null }
  } catch (err) {
    return { filas: null, error: err?.message || 'No se pudieron leer las sesiones.' }
  }
}

export async function cerrarSesionesDe(sb, empleadoId, motivo) {
  try {
    const { data, error } = await sb.rpc('cerrar_sesiones', { p_empleado_id: empleadoId, p_motivo: String(motivo).trim() })
    if (error) throw error
    const n = Number(data?.sesiones_cerradas)
    return { ok: true, cerradas: Number.isInteger(n) ? n : null, error: null }
  } catch (err) {
    return { ok: false, cerradas: null, error: err?.message || 'No se pudieron cerrar las sesiones.' }
  }
}

// ── Las acciones del panel (sobre el estado; el DOM lo repinta quien llama) ─

export function pedirCerrar(e) {
  if (!motivoValido(e.motivo)) { e.errorMotivo = 'Poné el motivo (3 letras o más).'; return e }
  e.errorMotivo = null
  e.errorCierre = null
  e.paso = 'confirmar'
  return e
}

// Devuelve 'cortar' si hay que ir al login (se cerraron las propias).
export async function confirmarCerrar(e, sb) {
  if (e.paso !== 'confirmar' || !motivoValido(e.motivo)) return null
  e.paso = 'cerrando'
  const r = await cerrarSesionesDe(sb, e.empleadoId, e.motivo)
  if (!r.ok) { e.paso = 'confirmar'; e.errorCierre = r.error; return null }
  if (e.propia) return 'cortar'
  e.paso = 'ver'
  e.motivo = ''
  e.hecho = r.cerradas === null ? 'Listo: se cerraron sus sesiones.'
    : r.cerradas === 1 ? 'Listo: se cerró 1 sesión.' : `Listo: se cerraron ${r.cerradas} sesiones.`
  return 'recargar'
}

// ── El panel en la página ──────────────────────────────────────────────────

let abierto = null

export async function abrirPanelSesiones({ sb, empleadoId, nombre = '', propia = false, doc = document, alCortar = () => sesionCortada('cerrar_mis_sesiones') }) {
  if (abierto) abierto.cerrar()
  const volverA = doc.activeElement
  const e = { empleadoId, nombre, propia, filas: null, error: null, motivo: '', paso: 'ver', errorMotivo: null, errorCierre: null, hecho: null }
  const fondo = doc.createElement('div')
  fondo.className = 'sesiones-fondo'
  const panel = doc.createElement('div')
  panel.className = 'sesiones'
  panel.setAttribute('role', 'dialog')
  panel.setAttribute('aria-modal', 'true')
  panel.setAttribute('aria-labelledby', 'sesiones-titulo')
  fondo.appendChild(panel)
  const pintar = () => {
    panel.innerHTML = htmlPanelSesiones(e)
    const t = panel.querySelector('#sesiones-motivo')
    if (t) t.addEventListener('input', () => { e.motivo = t.value })
  }
  const cargar = async () => {
    e.filas = null; e.error = null; pintar()
    const r = await leerSesiones(sb, empleadoId)
    if (abierto?.panel !== panel) return
    e.filas = r.filas; e.error = r.error; pintar()
  }
  const cerrar = () => {
    fondo.remove()
    doc.removeEventListener('keydown', teclas)
    if (abierto?.panel === panel) abierto = null
    try { volverA?.focus?.() } catch { /* nada */ }
  }
  const teclas = (ev) => { if (ev.key === 'Escape' && e.paso !== 'cerrando') cerrar() }
  fondo.addEventListener('click', async (ev) => {
    if (ev.target === fondo) { if (e.paso !== 'cerrando') cerrar(); return }
    const b = ev.target.closest?.('[data-accion]')
    if (!b) return
    const accion = b.dataset.accion
    if (accion === 'cerrar-panel') cerrar()
    else if (accion === 'reintentar') cargar()
    else if (accion === 'pedir-cerrar') { pedirCerrar(e); pintar() }
    else if (accion === 'volver') { e.paso = 'ver'; e.errorCierre = null; pintar() }
    else if (accion === 'confirmar-cerrar') {
      const pendiente = confirmarCerrar(e, sb)
      pintar()
      const r = await pendiente
      if (r === 'cortar') { alCortar(); return }
      pintar()
      if (r === 'recargar') { const l = await leerSesiones(sb, empleadoId); if (abierto?.panel === panel) { e.filas = l.filas; e.error = l.error; pintar() } }
    }
  })
  doc.addEventListener('keydown', teclas)
  doc.body.appendChild(fondo)
  abierto = { panel, cerrar }
  pintar()
  panel.querySelector('[data-accion="cerrar-panel"]')?.focus?.()
  await cargar()
  return abierto
}
