// LA BARRA DE ARRIBA (handoff "Esqueleto", 29/09/2026): a la izquierda la
// barra de UNIDAD DE NEGOCIO (28/09/2026) y a la derecha el USUARIO (sus
// iniciales, su nombre y un menú con Mi cuenta, Mis sesiones y Salir). Es la
// ÚNICA barra de arriba: la barra blanca vieja del dashboard (logo grande,
// nombre, mail y Salir) se eliminó. En el celular: el logo y las iniciales
// arriba, y las fábricas en una fila que se desliza de costado.
//
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
import { abrirPanelSesiones } from './sesiones.js'

const RAIZ = new URL('../', import.meta.url)
export const CLAVE_ELEGIDA = 'barraUnidad.elegida'
const TODAS = 'todas'

// El nombre corto de cada unidad, por su prefijo (unidades_negocio.prefijo).
export const NOMBRE_CORTO = { N: 'Nuss', D: 'Dolce Pasta', O: 'Mengui', T: 'Taller', X: 'Pruebas' }
// La marca de cada fábrica cuando no hay logo (colores del diseño).
export const MARCA_FABRICA = { N: ['oklch(0.55 0.11 55)', 'N'], D: ['oklch(0.52 0.1 130)', 'DP'], O: ['oklch(0.57 0.19 25)', 'M'], T: ['#57534E', 'T'] }

// Las iniciales de una persona: la primera letra de las dos primeras palabras.
export function inicialesDe(nombre) {
  const p = String(nombre ?? '').trim().split(/\s+/).filter(Boolean)
  return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? '')).toLocaleUpperCase('es') || '·'
}
// El color del círculo de una persona: un tono cálido que sale del nombre.
const TONOS_PERSONA = [55, 340, 150, 20, 85, 305]
export function colorPersona(nombre) {
  let h = 0
  for (const ch of String(nombre ?? '')) h = (h * 31 + ch.codePointAt(0)) >>> 0
  return `oklch(0.45 0.09 ${TONOS_PERSONA[h % TONOS_PERSONA.length]})`
}
// El nombre de pila (lo que dice la pastilla): la primera palabra.
export function nombreDePila(nombre) {
  return String(nombre ?? '').trim().split(/\s+/)[0] || 'Mi cuenta'
}

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
  const chip = (id, texto, marca, activa, titulo) =>
    `<button type="button" class="barra-unidad__chip${activa ? ' barra-unidad__chip--activa' : ''}" data-unidad="${escUni(id)}"` +
    ` aria-pressed="${activa ? 'true' : 'false'}" title="${escUni(titulo)}">${marca}<span class="barra-unidad__texto">${escUni(texto)}</span></button>`
  const todas = '<span class="barra-unidad__marca barra-unidad__marca--todas" aria-hidden="true"><i style="background: oklch(0.55 0.11 55)"></i><i style="background: oklch(0.52 0.1 130)"></i><i style="background: oklch(0.57 0.19 25)"></i><i style="background: #57534E"></i></span>'
  const marcaDe = (u) => {
    const logo = logoUnidad(u.logo_url)
    if (logo) return `<img class="barra-unidad__logo" src="${escUni(new URL(encodeURIComponent(logo), raiz).href)}" alt="" aria-hidden="true">`
    const [color, ini] = MARCA_FABRICA[u.prefijo] ?? ['#57534E', inicialesDe(u.nombre)]
    return `<span class="barra-unidad__marca" style="background: ${color}" aria-hidden="true">${escUni(ini)}</span>`
  }
  const chips = [chip(TODAS, 'Todas', todas, !elegida, 'Todas las unidades')]
  for (const u of unidades) chips.push(chip(u.id, nombreCorto(u), marcaDe(u), u.id === elegida, u.nombre))
  return `<div class="barra-unidad__chips" role="group" aria-label="Unidad de negocio">${chips.join('')}</div>` +
    (nota ? `<span class="barra-unidad__nota">${escUni(nota)}</span>` : '')
}

// El usuario, a la derecha: la pastilla (iniciales, nombre de pila, flecha)
// que abre el menú. En el celular, solo el círculo con las iniciales. El menú
// va aparte (htmlMenuUsuario) y se abre al tocarla.
export function htmlUsuario({ nombre }) {
  return `<button type="button" class="barra-arriba__usuario" id="barra-arriba-usuario" aria-haspopup="menu" aria-expanded="false" aria-controls="barra-arriba-menu">` +
    `<span class="barra-arriba__ini" style="background: ${colorPersona(nombre)}" aria-hidden="true">${escUni(inicialesDe(nombre))}</span>` +
    `<span class="barra-arriba__nombre">${escUni(nombreDePila(nombre))}</span>` +
    '<svg class="barra-arriba__flecha" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>'
}

// El menú del usuario (4b): cabecera con iniciales, nombre completo y mail;
// Mi cuenta, Mis sesiones ("N abiertas" cuando se sabe) y Salir.
export function htmlMenuUsuario({ nombre, email, sesiones = null, raiz = RAIZ }) {
  const ico = d => `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`
  const cuantas = Number.isInteger(sesiones) && sesiones > 0 ? `<span class="barra-arriba__menu-extra">${sesiones} ${sesiones === 1 ? 'abierta' : 'abiertas'}</span>` : ''
  return '<div class="barra-arriba__menu-cab">' +
      `<span class="barra-arriba__ini barra-arriba__ini--grande" style="background: ${colorPersona(nombre)}" aria-hidden="true">${escUni(inicialesDe(nombre))}</span>` +
      `<span class="barra-arriba__menu-quien"><span class="barra-arriba__menu-nombre">${escUni(nombre || 'Mi cuenta')}</span><span class="barra-arriba__menu-mail">${escUni(email || '')}</span></span></div>` +
    `<a class="barra-arriba__menu-item" role="menuitem" href="${escUni(new URL('dashboard.html?cuenta=mi-cuenta', raiz).href)}" id="barra-arriba-mi-cuenta">${ico('M12 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM4 21c0-4 3.6-6 8-6s8 2 8 6')}Mi cuenta</a>` +
    `<button type="button" class="barra-arriba__menu-item" role="menuitem" id="barra-arriba-sesiones">${ico('M3 5h14v10H3zM7 19h6M10 15v4M17 9h4v11h-4z')}<span class="barra-arriba__menu-texto">Mis sesiones</span>${cuantas}</button>` +
    '<div class="barra-arriba__menu-divisor" role="separator"></div>' +
    `<button type="button" class="barra-arriba__menu-item barra-arriba__menu-item--salir" role="menuitem" id="barra-arriba-salir">${ico('M10 4H5v16h5M14 8l4 4-4 4M18 12H9')}Salir</button>`
}

// El logo y el nombre, solo en el celular (en la compu están en la barra lateral).
export function htmlMarcaCelular(raiz = RAIZ) {
  return `<a class="barra-arriba__marca" href="${escUni(new URL('dashboard.html', raiz).href)}" aria-label="Seis Destinos · Inicio">` +
    `<span class="barra-arriba__logo" style="background-image: url('${escUni(new URL('logo.png', raiz).href)}')" aria-hidden="true"></span>` +
    '<span class="barra-arriba__marca-nombre">Seis Destinos</span></a>'
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

// Que la barra muestre ESA unidad, pedido desde un MÓDULO (02/10/2026):
// Cobranzas, al elegir la empresa de una cobranza nueva, pasa la barra a esa
// empresa (pedido de Facu). Devuelve si la barra quedó en esa unidad: false
// si la persona no la tiene en la barra (con UNA sola unidad la barra no
// aparece y no se cambia nada) o si la barra todavía no terminó de cargar.
// Si ya estaba elegida, no vuelve a avisar.
export function pasarBarraAUnidad(id) {
  if (!estado || !id) return false
  if (!estado.unidades.some(u => u.id === id)) return false
  elegirUnidad(id)
  return estado.elegida === id
}

// Cambia la elección (la usan los chips y pasarBarraAUnidad; un módulo llama a
// pasarBarraAUnidad, que dice si se pudo).
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
let persona = null      // { id, nombre, email }
function pintar() {
  if (!nav || !estado) return
  const fabricas = estado.mostrar ? htmlBarraUnidad({ unidades: estado.unidades, elegida: estado.elegida, nota: notaPagina }) : ''
  nav.querySelector('.barra-arriba__fabricas').innerHTML = fabricas
  nav.classList.toggle('barra-arriba--sin-fabricas', !estado.mostrar)
}

// Lo que se carga de la base para saber las unidades de la persona.
export async function cargarUnidadesDeLaPersona(sb) {
  const { data: s } = await sb.auth.getSession()
  const uid = s?.session?.user?.id
  if (!uid) return null
  const { data: yo, error } = await sb.from('empleados').select('id, nombre, rol_app, es_dispositivo, unidad_negocio_id').eq('auth_user_id', uid).maybeSingle()
  if (error || !yo) return null
  yo.email = s?.session?.user?.email ?? ''
  // El nombre para mostrar sale del registro (user_metadata.nombre_completo,
  // "Nombre Apellido"), como en el dashboard: el de la ficha viene de Naaloo
  // como "Apellido Nombre" y la pastilla diría el apellido.
  const meta = s?.session?.user?.user_metadata ?? {}
  yo.nombreVisible = meta.nombre_completo || meta.full_name || yo.nombre || ''
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
    persona = { id: r.yo.id, nombre: r.yo.nombreVisible ?? r.yo.nombre ?? '', email: r.yo.email ?? '' }
    // La barra de arriba va SIEMPRE (el usuario y su menú); las fábricas,
    // solo con más de una unidad.
    nav = doc.createElement('nav')
    nav.className = 'barra-unidad barra-arriba'
    nav.setAttribute('aria-label', 'Barra de arriba')
    nav.innerHTML = htmlMarcaCelular() + '<div class="barra-arriba__fabricas"></div>' +
      htmlUsuario({ nombre: persona.nombre }) +
      '<div class="barra-arriba__menu" id="barra-arriba-menu" role="menu" hidden></div>'
    pintar()
    const menu = nav.querySelector('#barra-arriba-menu')
    const boton = nav.querySelector('#barra-arriba-usuario')
    const cerrarMenu = () => { menu.hidden = true; boton.setAttribute('aria-expanded', 'false') }
    const abrirMenu = async () => {
      menu.innerHTML = htmlMenuUsuario({ nombre: persona.nombre, email: persona.email })
      menu.hidden = false
      boton.setAttribute('aria-expanded', 'true')
      menu.querySelector('.barra-arriba__menu-item')?.focus()
      // "N abiertas": se pregunta al abrir; si falla, no se dice nada.
      try {
        const { data, error } = await sb.rpc('sesiones_de', { p_empleado_id: persona.id })
        if (!error && Array.isArray(data) && !menu.hidden) menu.innerHTML = htmlMenuUsuario({ nombre: persona.nombre, email: persona.email, sesiones: data.length })
      } catch { /* sin el número */ }
    }
    nav.addEventListener('click', async ev => {
      const b = ev.target.closest?.('[data-unidad]')
      if (b) { elegirUnidad(b.dataset.unidad); return }
      if (ev.target.closest?.('#barra-arriba-usuario')) { if (menu.hidden) abrirMenu(); else cerrarMenu(); return }
      if (ev.target.closest?.('#barra-arriba-sesiones')) { cerrarMenu(); abrirPanelSesiones({ sb, empleadoId: persona.id, nombre: persona.nombre, propia: true, doc }); return }
      if (ev.target.closest?.('#barra-arriba-salir')) {
        cerrarMenu()
        try { await sb.auth.signOut() } finally { win.location.replace(new URL('login.html', RAIZ).href) }
        return
      }
      // En el dashboard, "Mi cuenta" abre su panel sin recargar.
      if (ev.target.closest?.('#barra-arriba-mi-cuenta') && /\/dashboard\.html$/.test(win.location.pathname)) {
        ev.preventDefault(); cerrarMenu(); win.dispatchEvent(new CustomEvent('cuenta:abrir'))
      }
    })
    doc.addEventListener('click', ev => { if (!menu.hidden && !nav.contains(ev.target)) cerrarMenu() })
    doc.addEventListener('keydown', ev => { if (ev.key === 'Escape' && !menu.hidden) { cerrarMenu(); boton.focus() } })
    // Arriba de todo lo de la página (la barra lateral es fija: no cuenta).
    doc.body.insertBefore(nav, doc.body.firstChild)
    doc.body.classList.add('con-barra-unidad')
    if (!estado.mostrar) return nav
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
