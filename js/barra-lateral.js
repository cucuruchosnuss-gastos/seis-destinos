// La barra lateral de la COMPU (27/09/2026): fija a la izquierda, con el logo
// arriba (lleva al inicio) y un ícono por cada módulo al que la persona tiene
// acceso, con su nombre (o, achicada, en el tooltip), la burbuja de
// pendientes y el módulo actual marcado. Se achica y se agranda, y recuerda
// cómo la dejó.
//
// UN SOLO COMPONENTE para todas las pantallas: cada página lo carga con
//   <script type="module" src="../js/barra-lateral.js"></script>
// (el dashboard, con ./js/). El catálogo y la regla de qué se ve son los del
// dashboard (js/modulos.js): la barra y las tarjetas dicen lo mismo.
//
// - En el CELULAR no aparece (css/main.css: solo desde 1024 px).
// - La PLANTA (modulos/produccion.html, la tablet) no la carga, y si igual la
//   cargara no se dibuja: tampoco para una cuenta de tablet en ninguna
//   pantalla (es_dispositivo).
// - Sin sesión o sin fila en empleados, no se dibuja nada.
// - Todo lo que viene de la base (el texto de los pendientes) va escapado.

import { supabase } from './supabase.js'
import { MODULOS, moduloVisible, agruparPendientes, escDash } from './modulos.js'

// La raíz del repo: este archivo vive en js/.
const RAIZ = new URL('../', import.meta.url)
const CLAVE_COLAPSADA = 'barraLateral.colapsada'
// Por debajo de este ancho, sin preferencia guardada, arranca achicada.
const ANCHO_ABIERTA = 1280
const URL_LUCIDE = 'https://unpkg.com/lucide@latest/dist/umd/lucide.js'

// ¿Se dibuja en esta pantalla, para esta cuenta?
export function debeMostrarse({ pathname, esDispositivo }) {
  if (esDispositivo === true) return false
  if (/\/modulos\/produccion\.html$/.test(pathname || '')) return false
  return true
}

// Los módulos que van en la barra: los mismos que las tarjetas del dashboard.
export function modulosDeBarra(ctx) {
  return MODULOS.filter(m => !m.proximamente && moduloVisible(m, ctx))
}

// Qué módulo es la pantalla actual. Se compara el archivo de la url de cada
// módulo; si dos comparten archivo (Administración y Cheques), gana el que
// tiene TODOS sus parámetros en la dirección actual, y si no, el que no pide
// ninguno. cheques.html (la redirección vieja) es Cheques.
export function claveActual(pathname, search) {
  const archivo = String(pathname || '').split('/').pop()
  if (archivo === 'cheques.html') return 'cheques'
  const aca = new URLSearchParams(search || '')
  const candidatos = MODULOS.filter(m => (m.url || '').split('?')[0].split('/').pop() === archivo)
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

// "99+" arriba de 99; nada con 0.
export function htmlBurbujaBarra(p) {
  if (!p || !(p.total > 0)) return ''
  const detalle = escDash(p.detalle.join(' · '))
  const numero = p.total > 99 ? '99+' : String(p.total)
  return `<span class="barra-lateral__burbuja" title="${detalle}" aria-label="${detalle}">${numero}</span>`
}

// La barra entera. `raiz` es la dirección de la raíz del repo (con / final).
export function htmlBarra({ modulos, actual, colapsada, raiz }) {
  const items = modulos.map(m => {
    const href = new URL(m.url, raiz).href
    const esActual = m.clave === actual
    return `<a class="barra-lateral__item${esActual ? ' barra-lateral__item--actual' : ''}" href="${escDash(href)}" data-clave="${escDash(m.clave)}"` +
      ` title="${escDash(m.nombre)}"${esActual ? ' aria-current="page"' : ''}>` +
      `<span class="barra-lateral__icono" data-icono="${escDash(m.icono)}" aria-hidden="true">${escDash(m.nombre.charAt(0))}</span>` +
      `<span class="barra-lateral__nombre">${escDash(m.nombre)}</span></a>`
  }).join('')
  const textoBoton = colapsada ? 'Agrandar la barra' : 'Achicar la barra'
  return `<a class="barra-lateral__logo" href="${escDash(new URL('dashboard.html', raiz).href)}" title="Inicio">` +
      `<img src="${escDash(new URL('logo.png', raiz).href)}" alt="Seis Destinos · Inicio"></a>` +
    `<div class="barra-lateral__items">${items}</div>` +
    `<button type="button" class="barra-lateral__plegar" id="barra-lateral-plegar" aria-expanded="${colapsada ? 'false' : 'true'}"` +
      ` aria-label="${textoBoton}" title="${textoBoton}"><span aria-hidden="true">${colapsada ? '»' : '«'}</span>` +
      `<span class="barra-lateral__nombre">Achicar</span></button>`
}

// Pone las burbujas nuevas (y saca las viejas). Con null (la llamada falló)
// solo las saca: nunca un número viejo o inventado.
export function pintarBurbujasBarra(nav, porModulo) {
  nav.querySelectorAll('.barra-lateral__burbuja').forEach(b => b.remove())
  if (!porModulo) return
  nav.querySelectorAll('.barra-lateral__item[data-clave]').forEach(item => {
    const html = htmlBurbujaBarra(porModulo.get(item.dataset.clave))
    if (html) item.insertAdjacentHTML('beforeend', html)
  })
}

function pascal(nombre) {
  return String(nombre).split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('')
}

// Los íconos de Lucide, sin volver a recorrer la página: cada ícono se arma
// con lucide.createElement. Si la página no cargó Lucide, se carga acá; si
// no se puede, queda la inicial del módulo.
function cargarLucide(doc) {
  if (window.lucide) return Promise.resolve(window.lucide)
  return new Promise(resolve => {
    const s = doc.createElement('script')
    s.src = URL_LUCIDE
    s.onload = () => resolve(window.lucide ?? null)
    s.onerror = () => resolve(null)
    doc.head.appendChild(s)
  })
}

async function ponerIconos(nav, doc) {
  const lucide = await cargarLucide(doc)
  if (!lucide?.createElement || !lucide.icons) return
  nav.querySelectorAll('[data-icono]').forEach(el => {
    const icono = lucide.icons[pascal(el.dataset.icono)]
    if (!icono) return
    try { el.replaceChildren(lucide.createElement(icono)) } catch { /* queda la inicial */ }
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

    let colapsada = leerColapsada(leerGuardado(), win.innerWidth)
    // Lo último que devolvió mis_pendientes (se repinta al plegar).
    let ultimos = null
    let turno = 0
    const nav = doc.createElement('nav')
    nav.className = 'barra-lateral'
    nav.setAttribute('aria-label', 'Módulos')
    const actual = claveActual(win.location.pathname, win.location.search)
    const dibujar = () => {
      nav.innerHTML = htmlBarra({ modulos, actual, colapsada, raiz: RAIZ })
      doc.body.classList.toggle('barra-lateral-colapsada', colapsada)
      nav.querySelector('#barra-lateral-plegar').addEventListener('click', () => {
        colapsada = !colapsada
        guardar(colapsada)
        dibujar()
        ponerIconos(nav, doc)
        pintarBurbujasBarra(nav, ultimos)
      })
    }
    dibujar()
    doc.body.prepend(nav)
    doc.body.classList.add('con-barra-lateral')
    ponerIconos(nav, doc)

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
