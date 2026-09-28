// La barra lateral de la compu (js/barra-lateral.js, 27/09/2026). Se EJECUTAN
// sus funciones reales con el catálogo real (js/modulos.js), un DOM falso y
// una base falsa:
//  - solo los módulos que la persona puede abrir (la regla del dashboard);
//  - el módulo actual marcado;
//  - se achica y se agranda, y lo recuerda;
//  - no aparece en el celular (CSS: solo desde 1024 px), ni en la planta, ni
//    para una cuenta de tablet, ni sin sesión;
//  - la burbuja de pendientes, con el texto de la base escapado; si la RPC
//    falla, ninguna;
//  - todas las pantallas la cargan, menos la planta.
//
//   node pruebas/test-barra-lateral.js
//   ARCHIVO_TEST=<copia de js/barra-lateral.js>  ARCHIVO_MODULOS=<copia de js/modulos.js>

const fs = require('fs')
const path = require('path')
const { extraerFn, extraerConst } = require('./extraer')
const { arnes } = require('./circuito-comun')

const RAIZ = path.join(__dirname, '..')
const RUTA = process.env.ARCHIVO_TEST || path.join(RAIZ, 'js', 'barra-lateral.js')
const RUTA_MODULOS = process.env.ARCHIVO_MODULOS || path.join(RAIZ, 'js', 'modulos.js')
const src = fs.readFileSync(RUTA, 'utf8')
const mod = fs.readFileSync(RUTA_MODULOS, 'utf8')
console.log(`ARCHIVO ${RUTA} (${src.length} bytes)`)
console.log(`ARCHIVO ${RUTA_MODULOS} (${mod.length} bytes)`)
const { chk, esperas, fin } = arnes()

const FUNCIONES = ['debeMostrarse', 'modulosDeBarra', 'claveActual', 'leerColapsada', 'htmlBurbujaBarra', 'htmlBarra',
  'pintarBurbujasBarra', 'pascal', 'cargarLucide', 'ponerIconos', 'leerGuardado', 'guardar', 'instalarBarraLateral']
const DE_MODULOS = ['moduloVisible', 'escDash', 'textoPendiente', 'agruparPendientes']

function construir() {
  let codigo = `
    var RAIZ = new URL('https://ejemplo.test/seis-destinos/')
    var __ls = new Map()
    var localStorage = { getItem(k) { return __ls.has(k) ? __ls.get(k) : null }, setItem(k, v) { __ls.set(k, String(v)) } }
    var window = { lucide: {} }
    var console = { warn() {}, error() {}, log() {} }
  `
  for (const c of ['MODULOS', 'MODULO_DE_PENDIENTE', 'TAMBIEN_EN_TARJETA']) codigo += extraerConst(mod, c)
  for (const f of DE_MODULOS) codigo += extraerFn(mod, f) + '\n'
  for (const c of ['CLAVE_COLAPSADA', 'ANCHO_ABIERTA', 'URL_LUCIDE']) codigo += extraerConst(src, c)
  for (const f of FUNCIONES) codigo += extraerFn(src, f) + '\n'
  codigo += `return { ${FUNCIONES.join(', ')}, MODULOS, __ls, __win: window }`
  return new Function(codigo)()
}

// ── El DOM falso ─────────────────────────────────────────────────────────────
function clases() {
  const s = new Set()
  return { add(c) { s.add(c) }, remove(c) { s.delete(c) }, toggle(c, f) { (f ?? !s.has(c)) ? s.add(c) : s.delete(c) }, contains(c) { return s.has(c) } }
}
function navFalso() {
  let html = ''
  const nav = {
    className: '', atributos: {}, burbujas: [], boton: null,
    setAttribute(k, v) { this.atributos[k] = String(v) },
    get innerHTML() { return html },
    set innerHTML(v) { html = v; this.boton = null; this.burbujas = [] },
    querySelector(sel) {
      if (sel === '#barra-lateral-plegar' && html.includes('id="barra-lateral-plegar"')) {
        if (!this.boton) this.boton = { handlers: [], addEventListener(t, f) { if (t === 'click') this.handlers.push(f) } }
        return this.boton
      }
      return null
    },
    querySelectorAll(sel) {
      if (sel === '.barra-lateral__burbuja') return this.burbujas.map(b => ({ remove: () => { this.burbujas = this.burbujas.filter(x => x !== b) } }))
      if (sel === '.barra-lateral__item[data-clave]') {
        return [...html.matchAll(/class="barra-lateral__item[^"]*" href="[^"]*" data-clave="([^"]+)"/g)].map(m => ({
          dataset: { clave: m[1] },
          insertAdjacentHTML: (pos, h) => this.burbujas.push({ clave: m[1], html: h }),
        }))
      }
      return []
    },
  }
  return nav
}
function docFalso() {
  const body = { classList: clases(), prepended: [], prepend(n) { this.prepended.push(n) } }
  return {
    body, head: { appendChild() {} }, visibilityState: 'visible', listeners: [],
    createElement(tag) { return tag === 'nav' ? navFalso() : { tag } },
    addEventListener(t, f) { this.listeners.push([t, f]) },
  }
}
// La base falsa: empleados, módulos, tareas y mis_pendientes.
function sbFalso({ uid = 'uid-1', empleado = { id: 'e1', rol_app: 'usuario', es_dispositivo: false }, modulos = [], tareas = [], pendientes = [], errorPendientes = null, errorTareas = null } = {}) {
  const consultas = []
  const sb = {
    consultas,
    auth: { async getSession() { return { data: { session: uid ? { user: { id: uid } } : null }, error: null } } },
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
    rpc(nombre) { consultas.push({ rpc: nombre }); return Promise.resolve(errorPendientes ? { data: null, error: errorPendientes } : { data: pendientes, error: null }) },
  }
  return sb
}
const winEn = (pathname, search = '', ancho = 1440) => ({ location: { pathname, search }, innerWidth: ancho })

// ── Funciones puras ─────────────────────────────────────────────────────────
{
  const S = construir()
  chk('la planta no la dibuja', S.debeMostrarse({ pathname: '/seis-destinos/modulos/produccion.html' }) === false)
  chk('la gestión de Producción sí', S.debeMostrarse({ pathname: '/seis-destinos/modulos/produccion-gestion.html' }) === true)
  chk('una cuenta de tablet no la ve en ninguna pantalla', S.debeMostrarse({ pathname: '/seis-destinos/modulos/gastos.html', esDispositivo: true }) === false)
  chk('un valor raro de es_dispositivo no la esconde', S.debeMostrarse({ pathname: '/x/modulos/gastos.html', esDispositivo: 'si' }) === true)

  const ctx = (o) => ({ esAdmin: false, esSuperAdmin: false, misModulos: [], misTareas: new Set(), ...o })
  let claves = S.modulosDeBarra(ctx({ misModulos: ['gastos'] })).map(m => m.clave)
  chk('solo los módulos permitidos: con gastos, solo Gastos', claves.join() === 'gastos', claves.join())
  claves = S.modulosDeBarra(ctx({ misModulos: ['cobranzas'] })).map(m => m.clave)
  chk('Cheques pide además una tarea (la regla del dashboard)', claves.join() === 'cobranzas', claves.join())
  claves = S.modulosDeBarra(ctx({ misModulos: ['cobranzas'], misTareas: new Set(['cobranzas:procesar']) })).map(m => m.clave)
  chk('con cobranzas:procesar, Cheques también', claves.join() === 'cobranzas,cheques', claves.join())
  chk('Accesos no aparece para un usuario común', !S.modulosDeBarra(ctx({ misModulos: ['accesos'] })).some(m => m.clave === 'accesos'))
  const todos = S.modulosDeBarra(ctx({ esAdmin: true, esSuperAdmin: true })).map(m => m.clave)
  chk('un super_admin ve todos los del catálogo', todos.length === S.MODULOS.filter(m => !m.proximamente).length && todos.includes('accesos'))
  chk('sin ningún módulo, ninguno', S.modulosDeBarra(ctx({})).length === 0)

  chk('actual: gastos.html → Gastos', S.claveActual('/x/modulos/gastos.html', '') === 'gastos')
  chk('actual: Administración', S.claveActual('/x/modulos/administracion.html', '') === 'administracion')
  chk('actual: Administración en Cheques → Cheques', S.claveActual('/x/modulos/administracion.html', '?seccion=cheques') === 'cheques')
  chk('actual: otra sección de Administración → Administración', S.claveActual('/x/modulos/administracion.html', '?seccion=cobranzas') === 'administracion')
  chk('actual: la gestión → Producción', S.claveActual('/x/modulos/produccion-gestion.html', '') === 'produccion')
  chk('actual: cheques.html (la redirección) → Cheques', S.claveActual('/x/modulos/cheques.html', '') === 'cheques')
  chk('actual: el dashboard no marca ninguno', S.claveActual('/x/dashboard.html', '') === null)

  chk('colapsada: lo guardado manda (1)', S.leerColapsada('1', 1920) === true)
  chk('colapsada: lo guardado manda (0)', S.leerColapsada('0', 1100) === false)
  chk('sin preferencia: angosta → achicada', S.leerColapsada(null, 1100) === true)
  chk('sin preferencia: ancha → abierta', S.leerColapsada(null, 1440) === false)

  const raiz = new URL('https://ejemplo.test/seis-destinos/')
  const mods = S.MODULOS.filter(m => ['gastos', 'caja'].includes(m.clave))
  const h = S.htmlBarra({ modulos: mods, actual: 'caja', colapsada: false, raiz })
  chk('cada módulo es un link a su pantalla desde la raíz', h.includes('href="https://ejemplo.test/seis-destinos/modulos/gastos.html"'))
  chk('el actual va marcado con aria-current', /data-clave="caja" title="Caja" aria-current="page"/.test(h) && !/data-clave="gastos"[^>]*aria-current/.test(h))
  chk('el actual tiene su clase', h.includes('barra-lateral__item barra-lateral__item--actual" href="https://ejemplo.test/seis-destinos/modulos/caja.html"'))
  chk('el nombre va visible y en el tooltip', h.includes('title="Gastos"') && h.includes('<span class="barra-lateral__nombre">Gastos</span>'))
  chk('el logo lleva al inicio', h.includes('<a class="barra-lateral__logo" href="https://ejemplo.test/seis-destinos/dashboard.html"'))
  chk('abierta: el botón dice achicar', /aria-expanded="true" aria-label="Achicar la barra"/.test(h))
  const hc = S.htmlBarra({ modulos: mods, actual: null, colapsada: true, raiz })
  chk('achicada: el botón dice agrandar', /aria-expanded="false" aria-label="Agrandar la barra"/.test(hc))
  chk('achicada: los nombres siguen en el tooltip', hc.includes('title="Caja"'))
  chk('solo los módulos que se le pasan', !h.includes('data-clave="stock"'))

  {
    const nav = navFalso()
    nav.innerHTML = S.htmlBarra({ modulos: mods, actual: null, colapsada: false, raiz })
    S.pintarBurbujasBarra(nav, new Map([['caja', { total: 2, detalle: ['a'] }]]))
    chk('pinta la burbuja de su módulo', nav.burbujas.length === 1 && nav.burbujas[0].clave === 'caja')
    S.pintarBurbujasBarra(nav, new Map([['gastos', { total: 1, detalle: ['b'] }]]))
    chk('repintar saca la vieja', nav.burbujas.length === 1 && nav.burbujas[0].clave === 'gastos')
    S.pintarBurbujasBarra(nav, null)
    chk('si la llamada falló, ninguna (nunca un número viejo)', nav.burbujas.length === 0)
  }
  chk('burbuja: nada con 0', S.htmlBurbujaBarra({ total: 0, detalle: [] }) === '' && S.htmlBurbujaBarra(null) === '')
  chk('burbuja: 99+', />99\+</.test(S.htmlBurbujaBarra({ total: 120, detalle: ['x'] })))
  const mala = S.htmlBurbujaBarra({ total: 2, detalle: ['<img src=x onerror=alert(1)>', '"><b>'] })
  chk('burbuja: el texto de la base va escapado', !/<img|<b>/.test(mala) && mala.includes('&lt;img') && mala.includes('&quot;&gt;&lt;b&gt;'), mala)
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
    const S = construir(); const doc = docFalso()
    const sb = sbFalso({ modulos: ['gastos', 'caja'], pendientes: [{ modulo: 'caja', clave: 'solicitudes_mi_caja', cantidad: 3, texto: 'Movimientos <b>por aceptar</b>' }] })
    const nav = await S.instalarBarraLateral({ sb, doc, win: winEn('/x/modulos/caja.html') })
    await new Promise(r => setImmediate(r))
    chk('se instala al principio del body', !!nav && doc.body.prepended[0] === nav && doc.body.classList.contains('con-barra-lateral'))
    chk('lleva su rótulo', nav.atributos['aria-label'] === 'Módulos' && nav.className === 'barra-lateral')
    chk('solo Gastos y Caja', (nav.innerHTML.match(/data-clave="/g) || []).length === 2 && nav.innerHTML.includes('data-clave="gastos"') && nav.innerHTML.includes('data-clave="caja"'))
    chk('Caja marcada como actual', /data-clave="caja" title="Caja" aria-current="page"/.test(nav.innerHTML))
    chk('lee los módulos y las tareas de ESA persona, habilitados', sb.consultas.filter(q => q.tabla === 'empleado_modulos' || q.tabla === 'empleado_tareas').every(q => q.filtros.some(f => f[0] === 'empleado_id' && f[1] === 'e1') && q.filtros.some(f => f[0] === 'habilitado' && f[1] === true)))
    const b = nav.burbujas.find(x => x.clave === 'caja')
    chk('la burbuja de Caja con su número', !!b && />3</.test(b.html))
    chk('la burbuja escapa el texto de la base', !!b && !b.html.includes('<b>') && b.html.includes('&lt;b&gt;'))
    chk('ancha y sin preferencia: abierta', !doc.body.classList.contains('barra-lateral-colapsada'))
    // Achicar.
    nav.boton.handlers[0]()
    chk('al achicar: el body lo sabe', doc.body.classList.contains('barra-lateral-colapsada'))
    chk('al achicar: se recuerda', S.__ls.get('barraLateral.colapsada') === '1')
    chk('al achicar: el botón dice agrandar', /aria-label="Agrandar la barra"/.test(nav.innerHTML))
    chk('al achicar: la burbuja se repinta', nav.burbujas.some(x => x.clave === 'caja'))
    nav.boton.handlers[0]()
    chk('al agrandar: se recuerda', S.__ls.get('barraLateral.colapsada') === '0' && !doc.body.classList.contains('barra-lateral-colapsada'))
    chk('al volver a la pestaña se recargan los pendientes', doc.listeners.some(([t]) => t === 'visibilitychange'))
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
    const S = construir(); const doc = docFalso(); const sb = sbFalso({ empleado: { id: 'e9', rol_app: 'super_admin', es_dispositivo: false } })
    const nav = await S.instalarBarraLateral({ sb, doc, win: winEn('/x/dashboard.html') })
    chk('un super_admin ve Accesos', nav.innerHTML.includes('data-clave="accesos"'))
    chk('un super_admin no lee empleado_modulos', !sb.consultas.some(q => q.tabla === 'empleado_modulos'))
  }
  // Sin ningún módulo permitido: nada.
  {
    const S = construir(); const doc = docFalso()
    const r = await S.instalarBarraLateral({ sb: sbFalso({ modulos: [] }), doc, win: winEn('/x/dashboard.html') })
    chk('sin módulos no se dibuja una barra vacía', r === null && doc.body.prepended.length === 0)
  }
})())

// ── El CSS: solo en la compu, nunca al imprimir ─────────────────────────────
{
  const RUTA_CSS = process.env.ARCHIVO_CSS || path.join(RAIZ, 'css', 'main.css')
  const css = fs.readFileSync(RUTA_CSS, 'utf8')
  console.log(`ARCHIVO ${RUTA_CSS} (${css.length} bytes)`)
  const i = css.indexOf('/* ─── Barra lateral de la compu')
  const bloque = i >= 0 ? css.slice(i) : ''
  chk('el CSS de la barra existe', i >= 0)
  chk('fuera de la compu no existe (display: none)', /\n\.barra-lateral \{ display: none; \}/.test(bloque))
  const media = /@media \(min-width: 1024px\) \{([\s\S]*?)\n\}\n/.exec(bloque)
  chk('se muestra desde 1024 px', !!media && /\.barra-lateral \{\s*display: flex;/.test(media[1]))
  chk('la página se corre con margin-left', !!media && /body\.con-barra-lateral \{[^}]*margin-left: var\(--ancho-barra-lateral\)/.test(media[1]))
  chk('achicada mide 64 px', !!media && /body\.con-barra-lateral\.barra-lateral-colapsada \{ --ancho-barra-lateral: 64px; \}/.test(media[1]))
  chk('achicada esconde los nombres', !!media && /\.barra-lateral-colapsada \.barra-lateral__nombre \{ display: none; \}/.test(media[1]))
  chk('debajo de los modales (z-index 30)', !!media && /z-index: 30;/.test(media[1]))
  chk('al imprimir no está', /@media print \{\s*\.barra-lateral \{ display: none !important; \}\s*body\.con-barra-lateral \{ margin-left: 0 !important; \}/.test(bloque))
  chk('los controles miden 44 px', !!media && (media[1].match(/min-height: 44px;/g) || []).length >= 2)
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
