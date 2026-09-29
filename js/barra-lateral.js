// La barra lateral (handoff "Esqueleto", 29/09/2026; antes 27/09/2026).
//
// COMPU (desde 1024 px): fija a la izquierda, 232 px abierta y 64 achicada.
// Arriba el logo ("Seis Destinos · GROUP"), después "Inicio" (el tablero),
// un divisor, los FIJADOS, otro divisor y el resto; abajo "Personalizar" y el
// botón de achicar. Cada módulo con su ícono en un cuadradito de su color
// (js/modulos.js, PALETA_MODULO), su nombre y la burbuja de pendientes
// (bordó si algo es urgente, gris si no). Achicada, el nombre y lo pendiente
// salen en un cartel negro al pasar el mouse.
//
// CELULAR (debajo de 1024 px): una barra ABAJO con Inicio + los 3 módulos más
// usados (o los fijados) + "Más", que abre una hoja con todos los módulos y
// Personalizar, Mi cuenta, Mis sesiones y Salir.
//
// UN SOLO COMPONENTE para todas las pantallas: cada página lo carga con
//   <script type="module" src="../js/barra-lateral.js"></script>
// (el dashboard, con ./js/). El catálogo y la regla de qué se ve son los del
// dashboard (js/modulos.js); el orden y los fijados, los de Personalizar
// (js/preferencias.js), guardados por persona.
//
// - La PLANTA (modulos/produccion.html, la tablet) no la carga, y si igual la
//   cargara no se dibuja: tampoco para una cuenta de tablet en ninguna
//   pantalla (es_dispositivo).
// - Sin sesión o sin fila en empleados, no se dibuja nada.
// - Todo lo que viene de la base (el texto de los pendientes) va escapado.
// - Los íconos son los trazos del diseño (sin depender de Lucide).

import { supabase } from './supabase.js'
import { MODULOS, moduloVisible, agruparPendientes, escDash, colorDeModulo, enOrdenDeBarra } from './modulos.js'
import { leerPrefs, guardarPrefs, ordenarBarra, anotarUso, modulosDeAbajo } from './preferencias.js'
import { abrirPanelSesiones } from './sesiones.js'

// La raíz del repo: este archivo vive en js/.
const RAIZ = new URL('../', import.meta.url)
const CLAVE_COLAPSADA = 'barraLateral.colapsada'
// Por debajo de este ancho, sin preferencia guardada, arranca achicada.
const ANCHO_ABIERTA = 1280

// Los trazos de cada ícono, copiados del diseño (viewBox 24 × 24).
export const ICONOS = {
  inicio: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  gastos: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3',
  caja: 'M4 7h15a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM4 7l12-3v3M15 13.5h2',
  cobranzas: 'M12 4c4 0 7 1.3 7 3s-3 3-7 3-7-1.3-7-3 3-3 7-3zM5 7v5c0 1.7 3 3 7 3s7-1.3 7-3V7M5 12v5c0 1.7 3 3 7 3s7-1.3 7-3v-5',
  cheques: 'M3 7h18v10H3zM6 13.5h6M15 13.5h3M6 10.5h3',
  'cuentas-corrientes': 'M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11M9 8h6',
  'materia-prima': 'M3 8l9-5 9 5v8l-9 5-9-5zM3 8l9 5 9-5M12 13v8',
  stock: 'M4 4h16v16H4zM4 12h16M10 8h4M10 16h4',
  produccion: 'M3 21V10l6 4v-4l6 4V5h6v16zM7 17h2M13 17h2',
  pedidos: 'M9 3h6v3H9zM7 4.5H5V21h14V4.5h-2M9 11h6M9 15h4',
  retiros: 'M2 6h12v10H2zM14 9h4l3 3.5V16h-7M4 18.5a2 2 0 1 0 4 0 2 2 0 1 0-4 0M15 18.5a2 2 0 1 0 4 0 2 2 0 1 0-4 0',
  administracion: 'M3 10l9-6 9 6M5 10v8M10 10v8M14 10v8M19 10v8M3 21h18',
  taller: 'M14 3.5a5 5 0 0 0-4.6 6.9L3.6 16.2a2 2 0 0 0 2.8 2.8l5.8-5.8A5 5 0 0 0 20.5 10l-3.2.8-2.1-2.1.8-3.2z',
  accesos: 'M9 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM2 21c0-3.9 3.1-6 7-6s7 2.1 7 6M16 11l2 2 4-4',
  empleados: 'M9 4a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7zM2.5 20c0-3.5 2.9-5.5 6.5-5.5s6.5 2 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14.8c2.2.6 3.5 2.3 3.5 5.2',
  seguridad: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM9 12l2 2 4-4',
  personalizar: 'M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1M15 4v4M9 10v4M17 16v4',
  mas: 'M5 12h.01M12 12h.01M19 12h.01',
}

export function htmlIcono(clave, tam = 15) {
  const d = Object.prototype.hasOwnProperty.call(ICONOS, clave) ? ICONOS[clave] : ICONOS.inicio
  return `<svg width="${tam}" height="${tam}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`
}

// Lo que no es un módulo del catálogo pero va en la barra.
export const INICIO = { clave: 'inicio', nombre: 'Inicio', url: 'dashboard.html' }
export const SEGURIDAD = { clave: 'seguridad', nombre: 'Seguridad', url: 'modulos/administracion.html?seccion=seguridad' }
export const URL_PERSONALIZAR = 'dashboard.html?vista=personalizar'

// ¿Se dibuja en esta pantalla, para esta cuenta?
export function debeMostrarse({ pathname, esDispositivo }) {
  if (esDispositivo === true) return false
  if (/\/modulos\/produccion\.html$/.test(pathname || '')) return false
  return true
}

// Los módulos que van en la barra: los mismos que las tarjetas del dashboard,
// en el orden del diseño, más Seguridad para un super_admin.
export function modulosDeBarra(ctx) {
  const lista = enOrdenDeBarra(MODULOS.filter(m => !m.proximamente && moduloVisible(m, ctx)))
  return ctx?.esSuperAdmin ? [...lista, SEGURIDAD] : lista
}

// Qué ítem es la pantalla actual. Se compara el archivo de la url de cada
// uno; si dos comparten archivo (Administración, Cheques y Seguridad), gana
// el que tiene TODOS sus parámetros en la dirección actual, y si no, el que no
// pide ninguno. cheques.html (la redirección vieja) es Cheques; el dashboard,
// Inicio (o Personalizar, con ?vista=personalizar).
export function claveActual(pathname, search) {
  const archivo = String(pathname || '').split('/').pop()
  const aca = new URLSearchParams(search || '')
  if (archivo === 'cheques.html') return 'cheques'
  if (archivo === 'dashboard.html' || archivo === '') return aca.get('vista') === 'personalizar' ? 'personalizar' : 'inicio'
  const candidatos = [...MODULOS, SEGURIDAD].filter(m => (m.url || '').split('?')[0].split('/').pop() === archivo)
  const conParametros = candidatos.find(m => {
    const q = (m.url || '').split('?')[1]
    if (!q) return false
    return [...new URLSearchParams(q)].every(([k, v]) => aca.get(k) === v)
  })
  if (conParametros) return conParametros.clave
  return candidatos.find(m => !(m.url || '').includes('?'))?.clave ?? null
}

// La preferencia guardada manda; sin ella, achicada en pantallas angostas.
export function leerColapsada(guardado, ancho) {
  if (guardado === '1') return true
  if (guardado === '0') return false
  return ancho < ANCHO_ABIERTA
}

// "99+" arriba de 99; nada con 0. Bordó si algo es urgente, gris si no.
export function htmlBurbujaBarra(p) {
  if (!p || !(p.total > 0)) return ''
  const detalle = escDash(p.detalle.join(' · '))
  const numero = p.total > 99 ? '99+' : String(p.total)
  return `<span class="barra-lateral__burbuja${p.urgente ? ' barra-lateral__burbuja--urgente' : ''}" title="${detalle}" aria-label="${detalle}">${numero}</span>`
}

function htmlItem(m, actual, raiz) {
  const href = new URL(m.url, raiz).href
  const esActual = m.clave === actual
  const col = colorDeModulo(m.clave)
  return `<a class="barra-lateral__item${esActual ? ' barra-lateral__item--actual' : ''}" href="${escDash(href)}" data-clave="${escDash(m.clave)}"` +
    ` title="${escDash(m.nombre)}"${esActual ? ' aria-current="page"' : ''}>` +
    `<span class="barra-lateral__icono" style="background: ${col.t}; color: ${col.c}">${htmlIcono(m.clave)}</span>` +
    `<span class="barra-lateral__nombre">${escDash(m.nombre)}</span>` +
    `<span class="barra-lateral__tip" aria-hidden="true">${escDash(m.nombre)}<span class="barra-lateral__tip-extra"></span></span></a>`
}

// La barra entera de la compu. `raiz` es la dirección de la raíz del repo
// (con / final). `fijados` y `resto` ya vienen ordenados (ordenarBarra).
export function htmlBarra({ fijados = [], resto = [], modulos, actual, colapsada, raiz }) {
  if (modulos && !fijados.length && !resto.length) resto = modulos
  const textoBoton = colapsada ? 'Agrandar la barra' : 'Achicar la barra'
  const flecha = colapsada ? 'M6 7l5 5-5 5M13 7l5 5-5 5' : 'M18 7l-5 5 5 5M11 7l-5 5 5 5'
  const col = colorDeModulo('personalizar')
  return `<a class="barra-lateral__logo" href="${escDash(new URL('dashboard.html', raiz).href)}" title="Inicio">` +
      `<span class="barra-lateral__logo-img" style="background-image: url('${escDash(new URL('logo.png', raiz).href)}')" role="img" aria-label="Seis Destinos · Inicio"></span>` +
      '<span class="barra-lateral__marca"><span class="barra-lateral__marca-nombre">Seis Destinos</span><span class="barra-lateral__marca-group">GROUP</span></span></a>' +
    '<div class="barra-lateral__items">' +
      htmlItem(INICIO, actual, raiz) +
      '<div class="barra-lateral__divisor" role="separator"></div>' +
      fijados.map(m => htmlItem(m, actual, raiz)).join('') +
      (fijados.length && resto.length ? '<div class="barra-lateral__divisor" role="separator"></div>' : '') +
      resto.map(m => htmlItem(m, actual, raiz)).join('') +
    '</div>' +
    '<div class="barra-lateral__pie">' +
      `<a class="barra-lateral__item barra-lateral__personalizar${actual === 'personalizar' ? ' barra-lateral__item--actual' : ''}" href="${escDash(new URL(URL_PERSONALIZAR, raiz).href)}" data-clave="personalizar" title="Personalizar"${actual === 'personalizar' ? ' aria-current="page"' : ''}>` +
        `<span class="barra-lateral__icono" style="background: #F1EEE9; color: ${col.c}">${htmlIcono('personalizar')}</span>` +
        '<span class="barra-lateral__nombre">Personalizar</span>' +
        '<span class="barra-lateral__tip" aria-hidden="true">Personalizar<span class="barra-lateral__tip-extra"></span></span></a>' +
      `<button type="button" class="barra-lateral__plegar" id="barra-lateral-plegar" aria-expanded="${colapsada ? 'false' : 'true'}"` +
        ` aria-label="${textoBoton}" title="${textoBoton}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${flecha}"/></svg></button>` +
    '</div>'
}

// La barra de abajo del celular: Inicio + 3 módulos + Más. "Más" suma las
// burbujas de lo que no está en la barra.
export function htmlBarraAbajo({ abajo, actual, raiz }) {
  const tab = (m) => {
    const esActual = m.clave === actual
    const col = colorDeModulo(m.clave)
    return `<a class="barra-abajo__tab${esActual ? ' barra-abajo__tab--actual' : ''}" href="${escDash(new URL(m.url, raiz).href)}" data-clave="${escDash(m.clave)}"${esActual ? ' aria-current="page"' : ''}` +
      ` style="--tab-color: ${esActual ? 'var(--color-acento)' : col.c}">` +
      `<span class="barra-abajo__icono">${htmlIcono(m.clave, 21)}</span><span class="barra-abajo__nombre">${escDash(m.nombre)}</span></a>`
  }
  return tab(INICIO) + abajo.map(tab).join('') +
    '<button type="button" class="barra-abajo__tab barra-abajo__mas" id="barra-abajo-mas" aria-haspopup="dialog" data-clave="mas" style="--tab-color: var(--color-texto-2)">' +
      `<span class="barra-abajo__icono">${htmlIcono('mas', 21)}</span><span class="barra-abajo__nombre">Más</span></button>`
}

// La hoja "Todos los módulos" del celular.
export function htmlHojaMas({ modulos, raiz }) {
  const celda = (m) => {
    const col = colorDeModulo(m.clave)
    return `<a class="hoja-mas__modulo" href="${escDash(new URL(m.url, raiz).href)}" data-clave="${escDash(m.clave)}">` +
      `<span class="hoja-mas__icono" style="background: ${col.t}; color: ${col.c}">${htmlIcono(m.clave, 20)}</span>` +
      `<span class="hoja-mas__nombre">${escDash(m.nombre)}</span></a>`
  }
  return '<div class="hoja-mas__caja" role="dialog" aria-modal="true" aria-labelledby="hoja-mas-titulo">' +
      '<div class="hoja-mas__manija" aria-hidden="true"></div>' +
      '<div class="hoja-mas__cab"><h2 class="hoja-mas__titulo" id="hoja-mas-titulo">Todos los módulos</h2>' +
      '<button type="button" class="hoja-mas__cerrar" id="hoja-mas-cerrar" aria-label="Cerrar"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
      `<div class="hoja-mas__grilla">${modulos.map(celda).join('')}</div>` +
      '<div class="hoja-mas__acciones">' +
        `<a class="hoja-mas__accion" href="${escDash(new URL(URL_PERSONALIZAR, raiz).href)}">Personalizar</a>` +
        `<a class="hoja-mas__accion" href="${escDash(new URL('dashboard.html?cuenta=mi-cuenta', raiz).href)}">Mi cuenta</a>` +
        '<button type="button" class="hoja-mas__accion" id="hoja-mas-sesiones">Mis sesiones</button>' +
        '<button type="button" class="hoja-mas__accion" id="hoja-mas-salir">Salir</button>' +
      '</div></div>'
}

// Pone las burbujas nuevas (y saca las viejas). Con null (la llamada falló)
// solo las saca: nunca un número viejo o inventado. Achicada, el cartel del
// mouse dice también lo pendiente ("Cobranzas · 5 por controlar").
export function pintarBurbujasBarra(nav, porModulo) {
  nav.querySelectorAll('.barra-lateral__burbuja').forEach(b => b.remove())
  nav.querySelectorAll('.barra-lateral__tip-extra').forEach(t => { t.textContent = '' })
  if (!porModulo) return
  nav.querySelectorAll('.barra-lateral__item[data-clave]').forEach(item => {
    const p = porModulo.get(item.dataset.clave)
    const html = htmlBurbujaBarra(p)
    if (html) item.querySelector('.barra-lateral__tip')?.insertAdjacentHTML('beforebegin', html)
    const extra = item.querySelector('.barra-lateral__tip-extra')
    if (extra && p?.detalle?.length) extra.textContent = p.detalle.join(' · ')
  })
}

// Las burbujas de la barra de abajo: cada tab la suya; "Más", la suma de lo
// que no está a la vista (bordó si algo es urgente).
export function pintarBurbujasAbajo(nav, porModulo) {
  nav.querySelectorAll('.barra-abajo__burbuja').forEach(b => b.remove())
  if (!porModulo) return
  const visibles = new Set([...nav.querySelectorAll('.barra-abajo__tab[data-clave]')].map(t => t.dataset.clave))
  let restoTotal = 0, restoUrgente = false
  for (const [clave, p] of porModulo) if (!visibles.has(clave)) { restoTotal += p.total; restoUrgente ||= !!p.urgente }
  nav.querySelectorAll('.barra-abajo__tab[data-clave]').forEach(tab => {
    const p = tab.dataset.clave === 'mas' ? (restoTotal > 0 ? { total: restoTotal, urgente: restoUrgente } : null) : porModulo.get(tab.dataset.clave)
    if (!p || !(p.total > 0)) return
    tab.insertAdjacentHTML('beforeend', `<span class="barra-abajo__burbuja${p.urgente ? ' barra-abajo__burbuja--urgente' : ''}">${p.total > 99 ? '99+' : p.total}</span>`)
  })
}

function leerGuardado() {
  try { return localStorage.getItem(CLAVE_COLAPSADA) } catch { return null }
}
function guardar(valor) {
  try { localStorage.setItem(CLAVE_COLAPSADA, valor ? '1' : '0') } catch { /* nada */ }
}

export async function instalarBarraLateral({ sb = supabase, doc = document, win = window } = {}) {
  if (!debeMostrarse({ pathname: win.location.pathname })) return null
  try {
    const { data: s } = await sb.auth.getSession()
    const uid = s?.session?.user?.id
    if (!uid) return null
    const { data: yo, error } = await sb.from('empleados').select('id, rol_app, es_dispositivo').eq('auth_user_id', uid).maybeSingle()
    if (error || !yo) return null
    if (!debeMostrarse({ pathname: win.location.pathname, esDispositivo: yo.es_dispositivo })) return null
    const esSuperAdmin = yo.rol_app === 'super_admin'
    const esAdmin = esSuperAdmin
    let misModulos = []
    let misTareas = new Set()
    if (!esSuperAdmin) {
      const [m, t] = await Promise.all([
        sb.from('empleado_modulos').select('modulo').eq('empleado_id', yo.id).eq('habilitado', true),
        sb.from('empleado_tareas').select('modulo, tarea').eq('empleado_id', yo.id).eq('habilitado', true),
      ])
      misModulos = (m.data || []).map(x => x.modulo)
      // Si las tareas no se pudieron leer, los módulos que las piden no se
      // muestran (lo mismo que el dashboard).
      misTareas = new Set((t.error ? [] : (t.data || [])).map(x => `${x.modulo}:${x.tarea}`))
    }
    const modulos = modulosDeBarra({ esAdmin, esSuperAdmin, misModulos, misTareas })
    if (!modulos.length) return null

    let actual = claveActual(win.location.pathname, win.location.search)
    // Una apertura más de este módulo (para "los que más uso").
    let prefs = leerPrefs(yo.id)
    if (actual && modulos.some(m => m.clave === actual)) { prefs = anotarUso(prefs, actual); guardarPrefs(yo.id, prefs) }

    let colapsada = leerColapsada(leerGuardado(), win.innerWidth)
    // Lo último que devolvió mis_pendientes (se repinta al plegar).
    let ultimos = null
    let turno = 0
    const nav = doc.createElement('nav')
    nav.className = 'barra-lateral'
    nav.setAttribute('aria-label', 'Módulos')
    const abajo = doc.createElement('nav')
    abajo.className = 'barra-abajo'
    abajo.setAttribute('aria-label', 'Módulos')
    const hoja = doc.createElement('div')
    hoja.className = 'hoja-mas'
    hoja.hidden = true
    const salir = async () => { try { await sb.auth.signOut() } finally { win.location.replace(new URL('login.html', RAIZ).href) } }
    const sesiones = () => abrirPanelSesiones({ sb, empleadoId: yo.id, propia: true, doc })
    const cerrarHoja = () => { hoja.hidden = true; doc.getElementById('barra-abajo-mas')?.focus() }
    const dibujar = () => {
      const orden = ordenarBarra(modulos, prefs)
      nav.innerHTML = htmlBarra({ ...orden, actual, colapsada, raiz: RAIZ })
      abajo.innerHTML = htmlBarraAbajo({ abajo: modulosDeAbajo(modulos, prefs), actual, raiz: RAIZ })
      hoja.innerHTML = htmlHojaMas({ modulos: [...orden.fijados, ...orden.resto], raiz: RAIZ })
      doc.body.classList.toggle('barra-lateral-colapsada', colapsada)
      nav.querySelector('#barra-lateral-plegar').addEventListener('click', () => {
        colapsada = !colapsada
        guardar(colapsada)
        dibujar()
        pintarBurbujasBarra(nav, ultimos)
        pintarBurbujasAbajo(abajo, ultimos)
      })
      abajo.querySelector('#barra-abajo-mas').addEventListener('click', () => { hoja.hidden = false; hoja.querySelector('#hoja-mas-cerrar')?.focus() })
      hoja.querySelector('#hoja-mas-cerrar').addEventListener('click', cerrarHoja)
      hoja.querySelector('#hoja-mas-sesiones').addEventListener('click', () => { hoja.hidden = true; sesiones() })
      hoja.querySelector('#hoja-mas-salir').addEventListener('click', salir)
    }
    hoja.addEventListener('click', ev => { if (ev.target === hoja) cerrarHoja() })
    doc.addEventListener('keydown', ev => { if (ev.key === 'Escape' && !hoja.hidden) cerrarHoja() })
    dibujar()
    doc.body.prepend(nav)
    doc.body.append(abajo, hoja)
    doc.body.classList.add('con-barra-lateral')
    // Personalizar avisa cuando cambia el orden o los fijados.
    win.addEventListener('preferencias:cambio', () => {
      prefs = leerPrefs(yo.id)
      dibujar()
      pintarBurbujasBarra(nav, ultimos)
      pintarBurbujasAbajo(abajo, ultimos)
    })

    // La pantalla cambió de vista sin recargar (el tablero entra en modo
    // acomodar desde Personalizar y deja la dirección en el tablero): se
    // vuelve a leer cuál es el ítem actual.
    win.addEventListener('vista:cambio', () => {
      actual = claveActual(win.location.pathname, win.location.search)
      dibujar()
      pintarBurbujasBarra(nav, ultimos)
      pintarBurbujasAbajo(abajo, ultimos)
    })

    // Pendientes: al abrir y al volver a la pestaña, con turno.
    const cargarPendientes = async () => {
      const mio = ++turno
      let porModulo = null
      try {
        const { data, error: e } = await sb.rpc('mis_pendientes')
        if (e) throw e
        porModulo = agruparPendientes(Array.isArray(data) ? data : [])
      } catch { porModulo = null }
      if (mio !== turno) return
      ultimos = porModulo
      pintarBurbujasBarra(nav, porModulo)
      pintarBurbujasAbajo(abajo, porModulo)
    }
    cargarPendientes()
    doc.addEventListener('visibilitychange', () => { if (doc.visibilityState === 'visible') cargarPendientes() })
    return nav
  } catch (err) {
    // La barra es una comodidad: si algo falla, la pantalla sigue sin ella.
    console.error('barra lateral:', err)
    return null
  }
}

if (typeof window !== 'undefined' && !window.__sinBarraLateral) instalarBarraLateral()
