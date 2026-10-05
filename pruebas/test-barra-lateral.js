// La barra lateral (js/barra-lateral.js; handoff "Esqueleto", 29/09/2026). Se
// EJECUTAN sus funciones reales con el catálogo real (js/modulos.js), las
// preferencias reales (js/preferencias.js), un DOM falso y una base falsa:
//  - solo los módulos que la persona puede abrir (la regla del dashboard), en
//    el orden del diseño, con Inicio primero y Seguridad para un super_admin;
//  - los FIJADOS arriba, entre divisores; el orden a mano / alfabético / los
//    que más uso (Personalizar);
//  - el actual marcado (Inicio en el dashboard, Personalizar con ?vista=);
//  - se achica y se agranda, y lo recuerda; achicada, el cartel del mouse;
//  - el celular: la barra de abajo (Inicio + 3 + Más) y la hoja "Más";
//  - no aparece en la planta, para una cuenta de tablet, ni sin sesión;
//  - la burbuja de pendientes (bordó si es urgente), con el texto escapado;
//    si la RPC falla, ninguna;
//  - todas las pantallas la cargan, menos la planta.
//
//   node pruebas/test-barra-lateral.js
//   ARCHIVO_TEST=<copia de js/barra-lateral.js>  ARCHIVO_MODULOS=<copia de js/modulos.js>
//   ARCHIVO_PREFS=<copia de js/preferencias.js>  ARCHIVO_CSS=<copia de css/main.css>

const fs = require('fs')
const path = require('path')
const { extraerFn, extraerConst } = require('./extraer')
const { arnes } = require('./circuito-comun')

const RAIZ = path.join(__dirname, '..')
const RUTA = process.env.ARCHIVO_TEST || path.join(RAIZ, 'js', 'barra-lateral.js')
const RUTA_MODULOS = process.env.ARCHIVO_MODULOS || path.join(RAIZ, 'js', 'modulos.js')
const RUTA_PREFS = process.env.ARCHIVO_PREFS || path.join(RAIZ, 'js', 'preferencias.js')
const src = fs.readFileSync(RUTA, 'utf8')
const mod = fs.readFileSync(RUTA_MODULOS, 'utf8')
const pref = fs.readFileSync(RUTA_PREFS, 'utf8')
console.log(`ARCHIVO ${RUTA} (${src.length} bytes)`)
console.log(`ARCHIVO ${RUTA_MODULOS} (${mod.length} bytes)`)
console.log(`ARCHIVO ${RUTA_PREFS} (${pref.length} bytes)`)
const { chk, esperas, fin } = arnes()

const FUNCIONES = ['htmlIcono', 'debeMostrarse', 'modulosDeBarra', 'claveActual', 'leerColapsada', 'htmlBurbujaBarra', 'htmlItem',
  'htmlBarra', 'capacidadBarraAbajo', 'htmlBarraAbajo', 'htmlHojaMas', 'htmlEditarAbajo', 'cambiarListaAbajo',
  'pintarBurbujasBarra', 'pintarBurbujasAbajo', 'leerGuardado', 'guardar', 'instalarBarraLateral']
const DE_MODULOS = ['moduloVisible', 'escDash', 'textoPendiente', 'agruparPendientes', 'colorDeModulo', 'enOrdenDeBarra']
const DE_PREFS = ['clavePrefs', 'prefsVacias', 'normalizarPrefs', 'leerCopia', 'escribirCopia', 'sonDeFabrica', 'leerPrefs', 'guardarPrefs', 'subirPrefs',
  'cargarPrefs', 'dondeSeGuardanPrefs', 'anotarUso', 'vecesUsado', 'ordenarBarra', 'modulosDeAbajo', 'guardarBarraInferior']

function construir() {
  let codigo = `
    var RAIZ = new URL('https://ejemplo.test/seis-destinos/')
    var __ls = new Map()
    var localStorage = { getItem(k) { return __ls.has(k) ? __ls.get(k) : null }, setItem(k, v) { __ls.set(k, String(v)) } }
    var globalThis = { localStorage }
    var console = { warn() {}, error() {}, log() {} }
    var __paneles = []
    var abrirPanelSesiones = (o) => { __paneles.push(o) }
  `
  for (const c of ['MODULOS', 'MODULO_DE_PENDIENTE', 'TAMBIEN_EN_TARJETA', 'PENDIENTES_URGENTES', 'PALETA_MODULO', 'ORDEN_BARRA']) codigo += extraerConst(mod, c)
  for (const f of DE_MODULOS) codigo += extraerFn(mod, f) + '\n'
  for (const c of ['ORDENES_BARRA', 'TAMANOS', 'DIAS_USO', 'MS_DIA', 'TOPE_USO', 'VERSION_PREFS', 'ESTADO_PREFS']) codigo += extraerConst(pref, c)
  for (const f of DE_PREFS) codigo += extraerFn(pref, f) + '\n'
  for (const c of ['CLAVE_COLAPSADA', 'ANCHO_ABIERTA', 'ANCHO_TAB_ABAJO', 'MIN_ABAJO', 'MAX_ABAJO', 'MS_TOQUE_LARGO', 'ICONOS', 'INICIO', 'SEGURIDAD', 'URL_PERSONALIZAR']) codigo += extraerConst(src, c)
  for (const f of FUNCIONES) codigo += extraerFn(src, f) + '\n'
  codigo += `return { ${FUNCIONES.join(', ')}, ${DE_PREFS.join(', ')}, MODULOS, __ls, __paneles }`
  return new Function(codigo)()
}

// ── El DOM falso ─────────────────────────────────────────────────────────────
// Un elemento que entiende lo que la barra le pide: innerHTML, los botones por
// id (querySelector('#…')) y las listas por clase, armadas del HTML.
function clases() {
  const s = new Set()
  return { add(c) { s.add(c) }, remove(c) { s.delete(c) }, toggle(c, f) { (f ?? !s.has(c)) ? s.add(c) : s.delete(c) }, contains(c) { return s.has(c) } }
}
function boton() { return { handlers: [], addEventListener(t, f) { if (t === 'click') this.handlers.push(f) }, focus() {} } }
function elFalso() {
  let html = ''
  const el = {
    className: '', atributos: {}, hidden: false, botones: {}, burbujas: [], extras: {}, listeners: [],
    setAttribute(k, v) { this.atributos[k] = String(v) },
    get innerHTML() { return html },
    set innerHTML(v) { html = v; this.botones = {}; this.burbujas = []; this.extras = {} },
    addEventListener(t, f) { this.listeners.push([t, f]) },
    querySelector(sel) {
      const id = /^#([\w-]+)$/.exec(sel)?.[1]
      if (id && html.includes(`id="${id}"`)) return (this.botones[id] ||= boton())
      return null
    },
    querySelectorAll(sel) {
      if (sel === '.barra-lateral__burbuja' || sel === '.barra-abajo__burbuja') return this.burbujas.map(b => ({ remove: () => { this.burbujas = this.burbujas.filter(x => x !== b) } }))
      if (sel === '.barra-lateral__tip-extra') return Object.keys(this.extras).map(k => ({ set textContent(v) { el.extras[k] = v } }))
      if (sel === '.barra-lateral__item[data-clave]') {
        return [...html.matchAll(/class="barra-lateral__item[^"]*" href="[^"]*" data-clave="([^"]+)"/g)].map(m => {
          el.extras[m[1]] ??= ''
          return {
            dataset: { clave: m[1] },
            querySelector: (s) => s === '.barra-lateral__tip' ? { insertAdjacentHTML: (pos, h) => el.burbujas.push({ clave: m[1], html: h }) }
              : s === '.barra-lateral__tip-extra' ? { set textContent(v) { el.extras[m[1]] = v } } : null,
          }
        })
      }
      if (sel === '.barra-abajo__tab[data-clave]') {
        return [...html.matchAll(/class="barra-abajo__tab[^"]*"[^>]*data-clave="([^"]+)"/g)].map(m => ({
          dataset: { clave: m[1] }, insertAdjacentHTML: (pos, h) => el.burbujas.push({ clave: m[1], html: h }),
        }))
      }
      return []
    },
  }
  return el
}
function docFalso() {
  const body = { classList: clases(), prepended: [], appended: [], prepend(n) { this.prepended.push(n) }, append(...n) { this.appended.push(...n) } }
  return {
    body, visibilityState: 'visible', listeners: [],
    createElement() { return elFalso() },
    addEventListener(t, f) { this.listeners.push([t, f]) },
    getElementById() { return null },
  }
}
// La base falsa: empleados, módulos, tareas y mis_pendientes.
function sbFalso({ uid = 'uid-1', empleado = { id: 'e1', rol_app: 'usuario', es_dispositivo: false }, modulos = [], tareas = [], pendientes = [], errorPendientes = null, errorTareas = null, prefsCuenta = {} } = {}) {
  const consultas = []
  const sb = {
    consultas, salio: false, guardadas: [],
    auth: { async getSession() { return { data: { session: uid ? { user: { id: uid } } : null }, error: null } }, async signOut() { sb.salio = true } },
    from(tabla) {
      const q = { tabla, filtros: [] }
      consultas.push(q)
      const resp = () => {
        if (tabla === 'empleados') return { data: empleado, error: null }
        if (tabla === 'empleado_modulos') return { data: modulos.map(m => ({ modulo: m })), error: null }
        if (tabla === 'empleado_tareas') return errorTareas ? { data: null, error: errorTareas } : { data: tareas.map(t => ({ modulo: t.split(':')[0], tarea: t.split(':')[1] })), error: null }
        return { data: [], error: null }
      }
      const cadena = {
        select() { return cadena }, eq(c, v) { q.filtros.push([c, v]); return cadena },
        maybeSingle() { return Promise.resolve(resp()) },
        then(ok, mal) { return Promise.resolve(resp()).then(ok, mal) },
      }
      return cadena
    },
    rpc(nombre, args) {
      consultas.push({ rpc: nombre })
      if (nombre === 'mis_preferencias') return Promise.resolve({ data: prefsCuenta, error: null })
      if (nombre === 'guardar_mis_preferencias') { sb.guardadas.push(args?.p_datos); return Promise.resolve({ data: null, error: null }) }
      return Promise.resolve(errorPendientes ? { data: null, error: errorPendientes } : { data: pendientes, error: null })
    },
  }
  return sb
}
const winEn = (pathname, search = '', ancho = 1440) => {
  const oyentes = {}
  return { location: { pathname, search, replace(u) { this.fue = u } }, innerWidth: ancho, oyentes,
    addEventListener(t, f) { (oyentes[t] ||= []).push(f) } }
}
const claves = (html) => [...String(html).matchAll(/class="barra-lateral__item[^"]*" href="[^"]*" data-clave="([^"]+)"/g)].map(m => m[1])

// ── Funciones puras ─────────────────────────────────────────────────────────
{
  const S = construir()
  chk('la planta no la dibuja', S.debeMostrarse({ pathname: '/seis-destinos/modulos/produccion.html' }) === false)
  chk('la gestión de Producción sí', S.debeMostrarse({ pathname: '/seis-destinos/modulos/produccion-gestion.html' }) === true)
  chk('una cuenta de tablet no la ve en ninguna pantalla', S.debeMostrarse({ pathname: '/seis-destinos/modulos/gastos.html', esDispositivo: true }) === false)
  chk('un valor raro de es_dispositivo no la esconde', S.debeMostrarse({ pathname: '/x/modulos/gastos.html', esDispositivo: 'si' }) === true)

  const ctx = (o) => ({ esAdmin: false, esSuperAdmin: false, misModulos: [], misTareas: new Set(), ...o })
  let cl = S.modulosDeBarra(ctx({ misModulos: ['gastos'] })).map(m => m.clave)
  chk('solo los módulos permitidos: con gastos, solo Gastos', cl.join() === 'gastos', cl.join())
  cl = S.modulosDeBarra(ctx({ misModulos: ['cobranzas'] })).map(m => m.clave)
  chk('Cheques pide además una tarea (la regla del dashboard)', cl.join() === 'cobranzas', cl.join())
  cl = S.modulosDeBarra(ctx({ misModulos: ['cobranzas', 'gastos', 'caja'], misTareas: new Set(['cobranzas:procesar']) })).map(m => m.clave)
  chk('en el orden del diseño (Cobranzas, Caja, Gastos, Cheques…)', cl.join() === 'cobranzas,caja,gastos,cheques', cl.join())
  chk('Accesos no aparece para un usuario común', !S.modulosDeBarra(ctx({ misModulos: ['accesos'] })).some(m => m.clave === 'accesos'))
  const todos = S.modulosDeBarra(ctx({ esAdmin: true, esSuperAdmin: true })).map(m => m.clave)
  chk('un super_admin ve todos los del catálogo y Seguridad al final', todos.length === S.MODULOS.filter(m => !m.proximamente).length + 1 && todos.includes('accesos') && todos[todos.length - 1] === 'seguridad', todos.join())
  chk('el orden del super_admin arranca por Producción', todos[0] === 'produccion')
  chk('un usuario común no ve Seguridad', !S.modulosDeBarra(ctx({ misModulos: ['gastos'] })).some(m => m.clave === 'seguridad'))
  chk('sin ningún módulo, ninguno', S.modulosDeBarra(ctx({})).length === 0)

  chk('actual: gastos.html → Gastos', S.claveActual('/x/modulos/gastos.html', '') === 'gastos')
  chk('actual: Administración', S.claveActual('/x/modulos/administracion.html', '') === 'administracion')
  chk('actual: Administración en Cheques → Cheques', S.claveActual('/x/modulos/administracion.html', '?seccion=cheques') === 'cheques')
  chk('actual: Administración en Seguridad → Seguridad', S.claveActual('/x/modulos/administracion.html', '?seccion=seguridad') === 'seguridad')
  chk('actual: otra sección de Administración → Administración', S.claveActual('/x/modulos/administracion.html', '?seccion=cobranzas') === 'administracion')
  chk('actual: la gestión → Producción', S.claveActual('/x/modulos/produccion-gestion.html', '') === 'produccion')
  chk('actual: cheques.html (la redirección) → Cheques', S.claveActual('/x/modulos/cheques.html', '') === 'cheques')
  chk('actual: el dashboard → Inicio', S.claveActual('/x/dashboard.html', '') === 'inicio')
  chk('actual: el dashboard con ?vista=personalizar → Personalizar', S.claveActual('/x/dashboard.html', '?vista=personalizar') === 'personalizar')

  chk('colapsada: lo guardado manda (1)', S.leerColapsada('1', 1920) === true)
  chk('colapsada: lo guardado manda (0)', S.leerColapsada('0', 1100) === false)
  chk('sin preferencia: angosta → achicada', S.leerColapsada(null, 1100) === true)
  chk('sin preferencia: ancha → abierta', S.leerColapsada(null, 1440) === false)

  const raiz = new URL('https://ejemplo.test/seis-destinos/')
  const mods = S.MODULOS.filter(m => ['gastos', 'caja'].includes(m.clave))
  const h = S.htmlBarra({ fijados: [], resto: mods, actual: 'caja', colapsada: false, raiz })
  chk('Inicio va primero, con su divisor', claves(h)[0] === 'inicio' && /data-clave="inicio"[^]*?barra-lateral__divisor/.test(h))
  chk('cada módulo es un link a su pantalla desde la raíz', h.includes('href="https://ejemplo.test/seis-destinos/modulos/gastos.html"'))
  chk('el actual va marcado con aria-current', /data-clave="caja" title="Caja" aria-current="page"/.test(h) && !/data-clave="gastos"[^>]*aria-current/.test(h))
  chk('el actual tiene su clase', h.includes('barra-lateral__item barra-lateral__item--actual" href="https://ejemplo.test/seis-destinos/modulos/caja.html"'))
  chk('el nombre va visible, en el title y en el cartel', h.includes('title="Gastos"') && h.includes('<span class="barra-lateral__nombre">Gastos</span>') && h.includes('<span class="barra-lateral__tip" aria-hidden="true">Gastos'))
  chk('el ícono va en un cuadradito del color del módulo', /data-clave="gastos"[^>]*><span class="barra-lateral__icono" style="background: oklch\(0\.955 0\.045 355\); color: oklch\(0\.55 0\.16 355\)"><svg/.test(h), h)
  chk('el logo lleva al inicio y dice Seis Destinos · GROUP', h.includes('<a class="barra-lateral__logo" href="https://ejemplo.test/seis-destinos/dashboard.html"') && h.includes('>Seis Destinos<') && h.includes('>GROUP<'))
  chk('abajo, Personalizar (lleva al dashboard con ?vista=personalizar)', h.includes('href="https://ejemplo.test/seis-destinos/dashboard.html?vista=personalizar" data-clave="personalizar"'))
  chk('abierta: el botón dice achicar', /aria-expanded="true" aria-label="Achicar la barra"/.test(h))
  const hc = S.htmlBarra({ resto: mods, actual: null, colapsada: true, raiz })
  chk('achicada: el botón dice agrandar', /aria-expanded="false" aria-label="Agrandar la barra"/.test(hc))
  chk('achicada: los nombres siguen en el title', hc.includes('title="Caja"'))
  chk('solo los módulos que se le pasan', !h.includes('data-clave="stock"'))
  chk('sin fijados, un solo divisor (el de Inicio)', (h.match(/barra-lateral__divisor/g) || []).length === 1)
  const hf = S.htmlBarra({ fijados: [mods[1]], resto: [mods[0]], actual: null, colapsada: false, raiz })
  chk('con fijados, van arriba entre divisores', claves(hf).join() === 'inicio,caja,gastos,personalizar' && (hf.match(/barra-lateral__divisor/g) || []).length === 2, claves(hf).join())
  chk('el ícono de una clave desconocida cae al de Inicio (nunca rompe)', S.htmlIcono('no-existe').includes('M3 10.5'))

  {
    const nav = elFalso()
    nav.innerHTML = S.htmlBarra({ resto: mods, actual: null, colapsada: false, raiz })
    S.pintarBurbujasBarra(nav, new Map([['caja', { total: 2, detalle: ['2 movimientos'], urgente: false }]]))
    chk('pinta la burbuja de su módulo', nav.burbujas.length === 1 && nav.burbujas[0].clave === 'caja')
    chk('el cartel del mouse dice lo pendiente', nav.extras.caja === '2 movimientos')
    S.pintarBurbujasBarra(nav, new Map([['gastos', { total: 1, detalle: ['b'] }]]))
    chk('repintar saca la vieja', nav.burbujas.length === 1 && nav.burbujas[0].clave === 'gastos' && nav.extras.caja === '')
    S.pintarBurbujasBarra(nav, null)
    chk('si la llamada falló, ninguna (nunca un número viejo)', nav.burbujas.length === 0)
  }
  chk('burbuja: nada con 0', S.htmlBurbujaBarra({ total: 0, detalle: [] }) === '' && S.htmlBurbujaBarra(null) === '')
  chk('burbuja: 99+', />99\+</.test(S.htmlBurbujaBarra({ total: 120, detalle: ['x'] })))
  chk('burbuja urgente: bordó (su clase)', S.htmlBurbujaBarra({ total: 3, detalle: ['x'], urgente: true }).includes('barra-lateral__burbuja barra-lateral__burbuja--urgente'))
  chk('burbuja no urgente: sin la clase de urgente', !S.htmlBurbujaBarra({ total: 3, detalle: ['x'], urgente: false }).includes('--urgente'))
  const mala = S.htmlBurbujaBarra({ total: 2, detalle: ['<img src=x onerror=alert(1)>', '"><b>'] })
  chk('burbuja: el texto de la base va escapado', !/<img|<b>/.test(mala) && mala.includes('&lt;img') && mala.includes('&quot;&gt;&lt;b&gt;'), mala)

  // El celular: la barra de abajo y la hoja "Más".
  const hab = S.htmlBarraAbajo({ abajo: mods, actual: 'gastos', raiz })
  chk('abajo: Inicio + los módulos + Más', /data-clave="inicio"[^]*data-clave="gastos"[^]*data-clave="caja"[^]*data-clave="mas"/.test(hab))
  chk('abajo: el actual en naranja, con aria-current', /barra-abajo__tab barra-abajo__tab--actual"[^>]*data-clave="gastos" aria-current="page" style="--tab-color: var\(--color-acento\)"/.test(hab), hab)
  chk('abajo: los demás con el color de su módulo', /data-clave="caja" style="--tab-color: oklch\(0\.6 0\.13 85\)"/.test(hab), hab)
  const hm = S.htmlHojaMas({ modulos: mods, raiz })
  chk('Más: todos los módulos y Personalizar, Mi cuenta, Mis sesiones, Salir', hm.includes('data-clave="gastos"') && hm.includes('>Personalizar<') && hm.includes('dashboard.html?cuenta=mi-cuenta') && hm.includes('id="hoja-mas-sesiones"') && hm.includes('id="hoja-mas-salir"'))
  chk('Más: es un diálogo con título', hm.includes('role="dialog" aria-modal="true" aria-labelledby="hoja-mas-titulo"') && hm.includes('>Todos los módulos<'))
  {
    const abajo = elFalso()
    abajo.innerHTML = hab
    S.pintarBurbujasAbajo(abajo, new Map([['gastos', { total: 2, detalle: [], urgente: false }], ['cheques', { total: 3, detalle: [], urgente: true }], ['stock', { total: 1, detalle: [] }]]))
    const deGastos = abajo.burbujas.find(b => b.clave === 'gastos'), deMas = abajo.burbujas.find(b => b.clave === 'mas')
    chk('abajo: cada tab su burbuja', !!deGastos && />2</.test(deGastos.html) && !deGastos.html.includes('--urgente'))
    chk('abajo: "Más" suma lo que no está a la vista (3 + 1), bordó si algo es urgente', !!deMas && />4</.test(deMas.html) && deMas.html.includes('--urgente'))
    S.pintarBurbujasAbajo(abajo, null)
    chk('abajo: si la llamada falló, ninguna', abajo.burbujas.length === 0)
  }

  // Las preferencias: fijados arriba y el orden elegido.
  const ocho = S.MODULOS.filter(m => ['gastos', 'caja', 'stock', 'cobranzas'].includes(m.clave))
  let o = S.ordenarBarra(ocho, { barra: { orden: 'mano', manual: [], fijados: ['stock'] } })
  chk('fijados: arriba y fuera del resto', o.fijados.map(m => m.clave).join() === 'stock' && !o.resto.some(m => m.clave === 'stock'))
  o = S.ordenarBarra(ocho, { barra: { orden: 'alfa', manual: [], fijados: [] } })
  chk('alfabético', o.resto.map(m => m.nombre).join() === 'Caja,Cobranzas,Gastos,Stock', o.resto.map(m => m.nombre).join())
  o = S.ordenarBarra(ocho, { barra: { orden: 'mano', manual: ['stock', 'gastos'], fijados: [] } })
  chk('a mano: el orden guardado primero, lo nuevo después', o.resto.map(m => m.clave).join() === 'stock,gastos,caja,cobranzas', o.resto.map(m => m.clave).join())
  const ahora = Date.parse('2026-09-29T12:00:00Z')
  let p = S.prefsVacias()
  for (let i = 0; i < 3; i++) p = S.anotarUso(p, 'stock', ahora)
  p = S.anotarUso(p, 'caja', ahora)
  p = S.anotarUso(p, 'gastos', ahora - 40 * 86400000)
  p.barra.orden = 'uso'
  o = S.ordenarBarra(ocho, p, ahora)
  chk('los que más uso (30 días): Stock, Caja y después el resto', o.resto.map(m => m.clave).slice(0, 2).join() === 'stock,caja', o.resto.map(m => m.clave).join())
  chk('una apertura de hace 40 días no cuenta', S.vecesUsado(p, 'gastos', ahora) === 0)
  chk('abajo del celular, sin elegir: los más usados primero, después los fijados (05/10/2026)', S.modulosDeAbajo(ocho, { ...p, barra: { orden: 'mano', manual: [], fijados: ['cobranzas'] } }, ahora, 3).map(m => m.clave).join() === 'stock,caja,cobranzas')
  chk('una preferencia rara vuelve a la de fábrica', JSON.stringify(S.normalizarPrefs({ barra: { orden: 'raro', fijados: 'x' } }).barra) === JSON.stringify({ orden: 'mano', manual: [], fijados: [] }))
  chk('se guarda por persona (sd.prefs.<id>)', S.guardarPrefs('e7', p) && S.__ls.has('sd.prefs.e7') && S.leerPrefs('e7').barra.orden === 'uso')
}

// ── Instalarla ──────────────────────────────────────────────────────────────
esperas.push((async () => {
  // La planta: ni se consulta la base.
  {
    const S = construir(); const doc = docFalso(); const sb = sbFalso()
    const r = await S.instalarBarraLateral({ sb, doc, win: winEn('/x/modulos/produccion.html') })
    chk('en la planta no se instala', r === null && doc.body.prepended.length === 0)
    chk('en la planta ni se pregunta la sesión', sb.consultas.length === 0)
  }
  // Sin sesión.
  {
    const S = construir(); const doc = docFalso(); const sb = sbFalso({ uid: null })
    const r = await S.instalarBarraLateral({ sb, doc, win: winEn('/x/modulos/gastos.html') })
    chk('sin sesión no se dibuja', r === null && doc.body.prepended.length === 0 && !doc.body.classList.contains('con-barra-lateral'))
    chk('sin sesión ni se consulta la base', sb.consultas.length === 0)
  }
  // Sin fila en empleados.
  {
    const S = construir(); const doc = docFalso()
    const r = await S.instalarBarraLateral({ sb: sbFalso({ empleado: null }), doc, win: winEn('/x/modulos/gastos.html') })
    chk('sin empleado no se dibuja', r === null && doc.body.prepended.length === 0)
  }
  // Una tablet en otra pantalla.
  {
    const S = construir(); const doc = docFalso()
    const r = await S.instalarBarraLateral({ sb: sbFalso({ empleado: { id: 'e1', rol_app: 'usuario', es_dispositivo: true }, modulos: ['produccion', 'stock'] }), doc, win: winEn('/x/modulos/stock.html') })
    chk('una tablet no la ve', r === null && doc.body.prepended.length === 0)
  }
  // Una persona común con Gastos y Caja, en Caja.
  {
    const S = construir(); const doc = docFalso(); const win = winEn('/x/modulos/caja.html')
    const sb = sbFalso({ modulos: ['gastos', 'caja'], pendientes: [{ modulo: 'caja', clave: 'solicitudes_mi_caja', cantidad: 3, texto: 'Movimientos <b>por aceptar</b>' }] })
    const nav = await S.instalarBarraLateral({ sb, doc, win })
    await new Promise(r => setImmediate(r))
    chk('se instala al principio del body, con la barra de abajo, la hoja y el editor al final', !!nav && doc.body.prepended[0] === nav && doc.body.appended.length === 3 && doc.body.classList.contains('con-barra-lateral'))
    chk('lleva su rótulo', nav.atributos['aria-label'] === 'Módulos' && nav.className === 'barra-lateral')
    chk('Inicio, Caja, Gastos y Personalizar', claves(nav.innerHTML).join() === 'inicio,caja,gastos,personalizar', claves(nav.innerHTML).join())
    chk('Caja marcada como actual', /data-clave="caja" title="Caja" aria-current="page"/.test(nav.innerHTML))
    chk('lee los módulos y las tareas de ESA persona, habilitados', sb.consultas.filter(q => q.tabla === 'empleado_modulos' || q.tabla === 'empleado_tareas').every(q => q.filtros.some(f => f[0] === 'empleado_id' && f[1] === 'e1') && q.filtros.some(f => f[0] === 'habilitado' && f[1] === true)))
    chk('anota que se abrió Caja (para "los que más uso")', S.vecesUsado(S.leerPrefs('e1'), 'caja') === 1)
    const b = nav.burbujas.find(x => x.clave === 'caja')
    chk('la burbuja de Caja con su número', !!b && />3</.test(b.html))
    chk('la burbuja escapa el texto de la base', !!b && !b.html.includes('<b>') && b.html.includes('&lt;b&gt;'))
    chk('ancha y sin preferencia: abierta', !doc.body.classList.contains('barra-lateral-colapsada'))
    const [abajo, hoja] = doc.body.appended
    chk('abajo: Inicio, sus módulos y Más', /data-clave="inicio"[^]*data-clave="mas"/.test(abajo.innerHTML) && abajo.className === 'barra-abajo')
    chk('la hoja "Más" arranca escondida', hoja.hidden === true && hoja.className === 'hoja-mas')
    abajo.botones['barra-abajo-mas'].handlers[0]()
    chk('"Más" abre la hoja', hoja.hidden === false)
    hoja.botones['hoja-mas-cerrar'].handlers[0]()
    chk('la ✕ la cierra', hoja.hidden === true)
    hoja.botones['hoja-mas-sesiones'].handlers[0]()
    const pn = S.__paneles[0]
    chk('"Mis sesiones" abre el panel con las PROPIAS de quien mira', !!pn && pn.empleadoId === 'e1' && pn.propia === true && pn.doc === doc)
    await hoja.botones['hoja-mas-salir'].handlers[0]()
    chk('"Salir" cierra la sesión y va al login', sb.salio === true && /login\.html$/.test(win.location.fue || ''))
    // Achicar.
    nav.botones['barra-lateral-plegar'].handlers[0]()
    chk('al achicar: el body lo sabe', doc.body.classList.contains('barra-lateral-colapsada'))
    chk('al achicar: se recuerda', S.__ls.get('barraLateral.colapsada') === '1')
    chk('al achicar: el botón dice agrandar', /aria-label="Agrandar la barra"/.test(nav.innerHTML))
    chk('al achicar: la burbuja se repinta', nav.burbujas.some(x => x.clave === 'caja'))
    nav.botones['barra-lateral-plegar'].handlers[0]()
    chk('al agrandar: se recuerda', S.__ls.get('barraLateral.colapsada') === '0' && !doc.body.classList.contains('barra-lateral-colapsada'))
    chk('al volver a la pestaña se recargan los pendientes', doc.listeners.some(([t]) => t === 'visibilitychange'))
    // Personalizar fija Gastos: la barra se rearma.
    const pr = S.leerPrefs('e1'); pr.barra.fijados = ['gastos']; S.guardarPrefs('e1', pr)
    win.oyentes['preferencias:cambio'][0]()
    chk('Personalizar avisa y la barra se rearma con Gastos fijado arriba', claves(nav.innerHTML).join() === 'inicio,gastos,caja,personalizar', claves(nav.innerHTML).join())
  }
  // Personalizar → "Acomodar sobre el tablero": la dirección vuelve al tablero y la barra marca Inicio.
  {
    const S = construir(); const doc = docFalso(); const win = winEn('/x/dashboard.html', '?vista=personalizar')
    const nav = await S.instalarBarraLateral({ sb: sbFalso({ modulos: ['gastos'] }), doc, win })
    chk('en Personalizar, Personalizar es el actual', /data-clave="personalizar" title="Personalizar" aria-current="page"/.test(nav.innerHTML) && !/data-clave="inicio"[^>]*aria-current/.test(nav.innerHTML))
    win.location.search = ''
    ;(win.oyentes['vista:cambio'] || []).forEach(f => f())
    chk('al pasar a acomodar, la barra marca Inicio y no Personalizar', /data-clave="inicio"[^>]*aria-current="page"/.test(nav.innerHTML) && !/data-clave="personalizar"[^>]*aria-current/.test(nav.innerHTML), nav.innerHTML.slice(0, 400))
  }
  // Las preferencias vienen de la cuenta (mis_preferencias), no del dispositivo.
  {
    const S = construir(); const doc = docFalso()
    const sb = sbFalso({ modulos: ['gastos', 'caja'], prefsCuenta: { v: 1, barra: { orden: 'mano', manual: [], fijados: ['gastos'] }, tablero: {}, uso: {} } })
    const nav = await S.instalarBarraLateral({ sb, doc, win: winEn('/x/dashboard.html') })
    chk('la barra lee las preferencias de la cuenta', sb.consultas.some(q => q.rpc === 'mis_preferencias'))
    chk('los fijados de la cuenta van arriba', claves(nav.innerHTML).join() === 'inicio,gastos,caja,personalizar', claves(nav.innerHTML).join())
    const S2 = construir(); const doc2 = docFalso()
    const sb2 = sbFalso({ modulos: ['gastos', 'caja'] })
    await S2.instalarBarraLateral({ sb: sb2, doc: doc2, win: winEn('/x/modulos/caja.html') })
    await new Promise(r => setImmediate(r))
    chk('abrir un módulo sube la apertura a la cuenta', sb2.guardadas.length === 1 && sb2.guardadas[0].v === 1 && (sb2.guardadas[0].uso.caja || []).length === 1)
  }
  // La preferencia guardada se respeta al abrir otra pantalla.
  {
    const S = construir(); const doc = docFalso()
    S.__ls.set('barraLateral.colapsada', '1')
    await S.instalarBarraLateral({ sb: sbFalso({ modulos: ['gastos'] }), doc, win: winEn('/x/modulos/gastos.html', '', 1920) })
    chk('recuerda que la dejó achicada', doc.body.classList.contains('barra-lateral-colapsada'))
  }
  // mis_pendientes falla: ninguna burbuja.
  {
    const S = construir(); const doc = docFalso()
    const nav = await S.instalarBarraLateral({ sb: sbFalso({ modulos: ['caja'], errorPendientes: { message: 'x' } }), doc, win: winEn('/x/modulos/caja.html') })
    await new Promise(r => setImmediate(r))
    chk('si mis_pendientes falla, ninguna burbuja', nav.burbujas.length === 0)
  }
  // Si las tareas no se leen, lo que las pide no aparece.
  {
    const S = construir(); const doc = docFalso()
    const nav = await S.instalarBarraLateral({ sb: sbFalso({ modulos: ['cobranzas'], tareas: ['cobranzas:procesar'], errorTareas: { message: 'x' } }), doc, win: winEn('/x/modulos/cobranzas.html') })
    chk('sin tareas leídas, Cheques no aparece', !!nav && !nav.innerHTML.includes('data-clave="cheques"'))
  }
  // Un super_admin: todo, sin leer módulos ni tareas.
  {
    const S = construir(); const doc = docFalso()
    const sb = sbFalso({ empleado: { id: 'e9', rol_app: 'super_admin', es_dispositivo: false },
      pendientes: [{ modulo: 'cheques', clave: 'por_vencer', cantidad: 2, texto: 'Cheques que vencen esta semana' }, { modulo: 'produccion', clave: 'conos_por_revisar', cantidad: 1, texto: 'Conos nuevos por revisar' }] })
    const nav = await S.instalarBarraLateral({ sb, doc, win: winEn('/x/dashboard.html') })
    await new Promise(r => setImmediate(r))
    chk('cheques que vencen esta semana: burbuja urgente (bordó)', nav.burbujas.find(b => b.clave === 'cheques')?.html.includes('--urgente'))
    chk('conos por revisar: burbuja gris (no urgente)', nav.burbujas.find(b => b.clave === 'produccion') && !nav.burbujas.find(b => b.clave === 'produccion').html.includes('--urgente'))
    chk('un super_admin ve Accesos y Seguridad', nav.innerHTML.includes('data-clave="accesos"') && nav.innerHTML.includes('data-clave="seguridad"'))
    chk('en el dashboard, Inicio es el actual', /data-clave="inicio" title="Inicio" aria-current="page"/.test(nav.innerHTML))
    chk('un super_admin no lee empleado_modulos', !sb.consultas.some(q => q.tabla === 'empleado_modulos'))
  }
  // Sin ningún módulo permitido: nada.
  {
    const S = construir(); const doc = docFalso()
    const r = await S.instalarBarraLateral({ sb: sbFalso({ modulos: [] }), doc, win: winEn('/x/dashboard.html') })
    chk('sin módulos no se dibuja una barra vacía', r === null && doc.body.prepended.length === 0)
  }
})())

// ── El CSS: la barra en la compu, la de abajo en el celular, nunca al imprimir ─
{
  const RUTA_CSS = process.env.ARCHIVO_CSS || path.join(RAIZ, 'css', 'main.css')
  const css = fs.readFileSync(RUTA_CSS, 'utf8')
  console.log(`ARCHIVO ${RUTA_CSS} (${css.length} bytes)`)
  const i = css.indexOf('/* ─── La barra lateral (js/barra-lateral.js')
  const bloque = i >= 0 ? css.slice(i, css.indexOf('/* ─── Panel de sesiones', i)) : ''
  chk('el CSS de la barra existe', i >= 0 && bloque.length > 0)
  chk('fuera de la compu no existe (display: none)', /\n\.barra-lateral \{ display: none; \}/.test(bloque))
  const media = /@media \(min-width: 1024px\) \{([\s\S]*?)\n\}\n/.exec(bloque)
  chk('se muestra desde 1024 px', !!media && /\.barra-lateral \{\s*display: flex;/.test(media[1]))
  chk('la página se corre con margin-left', !!media && /body\.con-barra-lateral \{[^}]*margin-left: var\(--ancho-barra-lateral\)/.test(media[1]))
  chk('abierta mide 232 px y achicada 64', !!media && /--ancho-barra-lateral: 232px/.test(media[1]) && /body\.con-barra-lateral\.barra-lateral-colapsada \{ --ancho-barra-lateral: 64px; \}/.test(media[1]))
  chk('achicada esconde los nombres', !!media && /\.barra-lateral-colapsada \.barra-lateral__nombre, \.barra-lateral-colapsada \.barra-lateral__marca \{ display: none; \}/.test(media[1]))
  chk('debajo de los modales (z-index 30)', !!media && /z-index: 30;/.test(media[1]))
  chk('ítems de 32 px con radio 9 (el diseño)', !!media && /\.barra-lateral__item \{[^}]*height: 32px;[^}]*border-radius: 9px;/.test(media[1]))
  chk('el actual en naranja suave con letra naranja oscura', !!media && /\.barra-lateral__item--actual[^{]*\{ background: var\(--color-acento-suave\); color: var\(--color-acento-hover\); font-weight: 700; \}/.test(media[1]))
  chk('la burbuja urgente en bordó', /\.barra-lateral__burbuja--urgente \{ background: var\(--bordo\); color: #fff; \}/.test(bloque))
  chk('en el celular, la barra de abajo', /@media \(max-width: 1023\.98px\) \{[^]*\.barra-abajo \{\s*display: flex; position: fixed;/.test(bloque))
  chk('la barra de abajo por debajo de los modales (z-index 25) y la hoja por arriba de ella (45)', /\.barra-abajo \{[^}]*z-index: 25;/.test(bloque) && /\.hoja-mas, \.hoja-abajo \{[^}]*z-index: 45;/.test(bloque))
  chk('al imprimir no está ninguna (tampoco el editor de la barra de abajo, 05/10/2026)', /@media print \{\s*\.barra-lateral, \.barra-abajo, \.hoja-mas, \.hoja-abajo \{ display: none !important; \}\s*body\.con-barra-lateral \{ margin-left: 0 !important; padding-bottom: 0 !important; \}/.test(bloque))
}

// ── Qué pantallas la cargan ─────────────────────────────────────────────────
{
  const paginas = ['dashboard.html', ...fs.readdirSync(path.join(RAIZ, 'modulos')).filter(f => f.endsWith('.html')).map(f => `modulos/${f}`)]
  const sinBarra = ['modulos/produccion.html', 'modulos/cheques.html']
  for (const p of paginas) {
    const html = fs.readFileSync(path.join(RAIZ, p), 'utf8')
    const carga = /<script type="module" src="(?:\.\.\/|\.\/)js\/barra-lateral\.js"><\/script>/.test(html)
    if (sinBarra.includes(p)) chk(`${p} NO carga la barra`, !carga)
    else chk(`${p} carga la barra`, carga)
  }
}

fin()
