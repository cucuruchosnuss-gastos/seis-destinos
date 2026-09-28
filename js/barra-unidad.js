// La barra de UNIDAD DE NEGOCIO, arriba, en toda la app (28/09/2026).
//
// Facu elige la fábrica UNA vez y toda la app muestra solo lo de esa fábrica:
// "Todas", Nuss, Dolce Pasta, Mengui, Taller, con el logo de cada una.
//
// UN SOLO COMPONENTE para todas las pantallas: cada página lo carga con
//   <script type="module" src="../js/barra-unidad.js"></script>
// (el dashboard, con ./js/), y cada módulo que filtra lo importa para leer la
// elección y enterarse cuando cambia:
//   import { unidadesDeLaBarra, alCambiarUnidad, pasaFiltroUnidad } from '../js/barra-unidad.js'
// Es el mismo archivo, así que el navegador lo ejecuta una sola vez.
//
// Las reglas, en un solo lugar:
// - Cada persona ve SOLO sus unidades: un super_admin, todas; si no, su unidad
//   propia (empleados.unidad_negocio_id) más las del alcance de sus tareas
//   ({"todas": true} = todas). La fábrica de pruebas, solo para una cuenta de
//   prueba (js/utils.js).
// - "Todas" solo con más de una. Con UNA sola la barra no aparece y la
//   elección es null: la pantalla no filtra nada (mostrar de menos lo que antes
//   se veía por una tarea sin alcance sería peor que no filtrar).
// - La elección se recuerda en el dispositivo (localStorage) y sigue por toda
//   la app. Una unidad recordada que ya no es de la persona no queda elegida.
// - La barra SOLO FILTRA LO QUE SE MUESTRA: los permisos siguen en la base.
// - No se dibuja en la planta (la tablet), ni para una cuenta de tablet, ni
//   sin sesión, ni al imprimir.
// - Lo que no tiene unidad (una cobranza por controlar) no desaparece:
//   pasaFiltroUnidad lo deja pasar siempre (la pantalla lo marca "sin unidad").
// - Todo texto de la base va escapado (escUni).

import { supabase } from './supabase.js'
import { cargarFabricaDePruebas, sinUnidadesDePrueba, FABRICA_SIN_DATOS } from './utils.js'

const RAIZ = new URL('../', import.meta.url)
export const CLAVE_ELEGIDA = 'barraUnidad.elegida'
const TODAS = 'todas'

// El nombre corto de cada unidad, por su prefijo (unidades_negocio.prefijo).
export const NOMBRE_CORTO = { N: 'Nuss', D: 'Dolce Pasta', O: 'Mengui', T: 'Taller', X: 'Pruebas' }

export function escUni(texto) {
  return String(texto ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

// Solo un nombre de archivo de imagen de la raíz del repo (mismo criterio que
// logoSeguro de js/retiros-comun.js): nada de esquemas ni carpetas.
export function logoUnidad(logoUrl) {
  const t = String(logoUrl ?? '').trim()
  return /^[a-z0-9][a-z0-9._-]*\.(png|jpe?g|webp)$/i.test(t) && !t.includes('..') ? t : null
}

export function nombreCorto(u) {
  return NOMBRE_CORTO[u?.prefijo] || u?.nombre || 'Unidad'
}

// ¿Se dibuja en esta pantalla, para esta cuenta?
export function debeMostrarseUnidad({ pathname, esDispositivo }) {
  if (esDispositivo === true) return false
  if (/\/modulos\/produccion\.html$/.test(pathname || '')) return false
  if (/\/(index|login|registro|mfa|recuperar-contrasena|restablecer-contrasena)\.html$/.test(pathname || '')) return false
  return true
}

// Los ids de unidad de una persona, con la regla de arriba. `todas` = el
// conjunto de unidades activas (sin filtrar por prueba: eso se hace después).
export function idsDeLaPersona({ yo, tareas, todas }) {
  if (!yo) return new Set()
  if (yo.rol_app === 'super_admin') return new Set(todas)
  const ids = new Set()
  if (yo.unidad_negocio_id && todas.includes(yo.unidad_negocio_id)) ids.add(yo.unidad_negocio_id)
  for (const t of tareas || []) {
    const a = t?.alcance
    if (!a || typeof a !== 'object') continue
    if (a.todas === true) { for (const id of todas) ids.add(id); continue }
    for (const id of Array.isArray(a.unidades) ? a.unidades : []) if (todas.includes(id)) ids.add(id)
  }
  return ids
}

// Las unidades de la barra, en el orden de la lista (Nuss, Dolce Pasta,
// Mengui, Taller y lo demás por nombre).
const ORDEN_PREFIJO = ['N', 'D', 'O', 'T']
export function ordenarUnidades(lista) {
  const pos = u => { const i = ORDEN_PREFIJO.indexOf(u?.prefijo); return i === -1 ? 99 : i }
  return [...(lista || [])].sort((a, b) => pos(a) - pos(b) || String(a.nombre).localeCompare(String(b.nombre), 'es'))
}

// Qué queda elegido: lo guardado si es de la persona; si no, Todas (null).
// Con una sola unidad, null: la barra no aparece y nada se filtra.
export function resolverElegida(guardado, unidades) {
  if (!Array.isArray(unidades) || unidades.length < 2) return null
  if (!guardado || guardado === TODAS) return null
  return unidades.some(u => u.id === guardado) ? guardado : null
}

// ¿Esta fila se ve con la unidad elegida? Sin elección (Todas), todo. Una
// fila SIN unidad se ve siempre: no desaparece por no tener unidad todavía.
export function pasaFiltroUnidad(unidadId, elegida) {
  if (!elegida) return true
  if (unidadId == null || unidadId === '') return true
  return unidadId === elegida
}

// Una lista entera por la unidad elegida. `clave` dice dónde está la unidad.
export function filtrarPorUnidad(filas, elegida, clave = f => f?.unidad_negocio_id) {
  if (!Array.isArray(filas)) return []
  if (!elegida) return filas
  return filas.filter(f => pasaFiltroUnidad(clave(f), elegida))
}

// La barra entera. `raiz` es la dirección de la raíz del repo (con / final).
export function htmlBarraUnidad({ unidades, elegida, raiz = RAIZ, nota = '' }) {
  const chip = (id, texto, logo, activa, titulo) =>
    `<button type="button" class="barra-unidad__chip${activa ? ' barra-unidad__chip--activa' : ''}" data-unidad="${escUni(id)}"` +
    ` aria-pressed="${activa ? 'true' : 'false'}" title="${escUni(titulo)}">` +
    (logo ? `<img class="barra-unidad__logo" src="${escUni(new URL(encodeURIComponent(logo), raiz).href)}" alt="" aria-hidden="true">` : '') +
    `<span class="barra-unidad__texto">${escUni(texto)}</span></button>`
  const chips = [chip(TODAS, 'Todas', null, !elegida, 'Todas las unidades')]
  for (const u of unidades) chips.push(chip(u.id, nombreCorto(u), logoUnidad(u.logo_url), u.id === elegida, u.nombre))
  return `<div class="barra-unidad__chips" role="group" aria-label="Unidad de negocio">${chips.join('')}</div>` +
    (nota ? `<span class="barra-unidad__nota">${escUni(nota)}</span>` : '')
}

// ── El estado, compartido por toda la pantalla ─────────────────────────────
const suscriptores = new Set()
let estado = null        // { unidades, elegida, mostrar }
let promesa = null

function leerGuardada() {
  try { return localStorage.getItem(CLAVE_ELEGIDA) } catch { return null }
}
function guardarElegida(id) {
  try { localStorage.setItem(CLAVE_ELEGIDA, id || TODAS) } catch { /* nada */ }
}

function avisar() {
  const e = estadoUnidad()
  for (const f of suscriptores) { try { f(e) } catch (err) { console.error('barra de unidad:', err) } }
  try { window.dispatchEvent(new CustomEvent('unidad:cambio', { detail: e })) } catch { /* sin window */ }
}

// Lo que sabe la barra ahora: { unidades, elegida (id o null), mostrar }.
// Antes de terminar de cargar, sin unidades y sin elección.
export function estadoUnidad() {
  return estado ? { ...estado, unidades: [...estado.unidades] } : { unidades: [], elegida: null, mostrar: false, listo: false }
}

// Espera a que la barra sepa las unidades de la persona.
export function unidadesDeLaBarra() {
  return promesa ? promesa.then(() => estadoUnidad()) : Promise.resolve(estadoUnidad())
}

// Avisa cada vez que cambia la elección. Devuelve la función para dejar de oír.
export function alCambiarUnidad(fn) {
  suscriptores.add(fn)
  return () => suscriptores.delete(fn)
}

// Cambia la elección (la usan los chips; un módulo no debería llamarla).
export function elegirUnidad(id) {
  if (!estado) return
  const nueva = resolverElegida(id || TODAS, estado.unidades)
  if (nueva === estado.elegida) return
  estado.elegida = nueva
  guardarElegida(nueva)
  pintar()
  avisar()
}

let nav = null
let notaPagina = ''
function pintar() {
  if (!nav || !estado) return
  nav.innerHTML = htmlBarraUnidad({ unidades: estado.unidades, elegida: estado.elegida, nota: notaPagina })
}

// Lo que se carga de la base para saber las unidades de la persona.
export async function cargarUnidadesDeLaPersona(sb) {
  const { data: s } = await sb.auth.getSession()
  const uid = s?.session?.user?.id
  if (!uid) return null
  const { data: yo, error } = await sb.from('empleados').select('id, rol_app, es_dispositivo, unidad_negocio_id').eq('auth_user_id', uid).maybeSingle()
  if (error || !yo) return null
  const [un, ta, fabrica] = await Promise.all([
    sb.from('unidades_negocio').select('id, nombre, prefijo, logo_url, activo').eq('activo', true),
    yo.rol_app === 'super_admin'
      ? Promise.resolve({ data: [], error: null })
      : sb.from('empleado_tareas').select('alcance').eq('empleado_id', yo.id).eq('habilitado', true),
    cargarFabricaDePruebas(sb).catch(() => FABRICA_SIN_DATOS),
  ])
  if (un.error) return null
  const activas = un.data || []
  const ids = idsDeLaPersona({ yo, tareas: ta.error ? [] : (ta.data || []), todas: activas.map(u => u.id) })
  const unidades = ordenarUnidades(sinUnidadesDePrueba(activas.filter(u => ids.has(u.id)), fabrica))
  return { yo, unidades }
}

export async function instalarBarraUnidad({ sb = supabase, doc = document, win = window } = {}) {
  if (!debeMostrarseUnidad({ pathname: win.location.pathname })) return null
  // Una página que no filtra por unidad lo dice en chico (meta sd-unidad).
  const meta = doc.querySelector('meta[name="sd-unidad"]')
  notaPagina = meta?.getAttribute('content') === 'no-filtra' ? 'Esta pantalla muestra todas las unidades.' : ''
  try {
    const r = await cargarUnidadesDeLaPersona(sb)
    if (!r || !debeMostrarseUnidad({ pathname: win.location.pathname, esDispositivo: r.yo.es_dispositivo })) {
      estado = { unidades: [], elegida: null, mostrar: false, listo: true }
      return null
    }
    const elegida = resolverElegida(leerGuardada(), r.unidades)
    estado = { unidades: r.unidades, elegida, mostrar: r.unidades.length > 1, listo: true }
    if (!estado.mostrar) return null
    nav = doc.createElement('nav')
    nav.className = 'barra-unidad'
    nav.setAttribute('aria-label', 'Unidad de negocio')
    pintar()
    nav.addEventListener('click', ev => {
      const b = ev.target.closest?.('[data-unidad]')
      if (b) elegirUnidad(b.dataset.unidad)
    })
    // Arriba de todo lo de la página (la barra lateral es fija: no cuenta).
    doc.body.insertBefore(nav, doc.body.firstChild)
    doc.body.classList.add('con-barra-unidad')
    // Otra pestaña cambió la elección: se sigue.
    win.addEventListener('storage', ev => {
      if (ev.key !== CLAVE_ELEGIDA || !estado) return
      const nueva = resolverElegida(ev.newValue, estado.unidades)
      if (nueva === estado.elegida) return
      estado.elegida = nueva
      pintar()
      avisar()
    })
    return nav
  } catch (err) {
    // La barra es una comodidad: si algo falla, la pantalla sigue sin filtrar.
    console.error('barra de unidad:', err)
    estado = { unidades: [], elegida: null, mostrar: false, listo: true }
    return null
  }
}

if (typeof window !== 'undefined' && !window.__sinBarraUnidad) {
  promesa = (document.readyState === 'loading'
    ? new Promise(r => document.addEventListener('DOMContentLoaded', r, { once: true }))
    : Promise.resolve()).then(() => instalarBarraUnidad())
}
