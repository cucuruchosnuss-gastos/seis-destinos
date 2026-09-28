// La barra de unidad de negocio (js/barra-unidad.js, 28/09/2026). Se EJECUTAN
// sus funciones reales con un DOM falso y una base falsa:
//  - cada persona ve SOLO sus unidades (propia + alcance; super_admin todas),
//    sin la fábrica de pruebas salvo para una cuenta de prueba;
//  - "Todas" solo con más de una; con una sola, no aparece y no se filtra;
//  - la elección se recuerda y una recordada que ya no es de la persona no
//    queda elegida; cambiarla avisa a los módulos;
//  - una fila sin unidad se ve siempre;
//  - no aparece en la planta, ni para una tablet, ni sin sesión, ni al imprimir;
//  - todo texto de la base va escapado;
//  - todas las pantallas la cargan, menos la planta.
//
//   ARCHIVO_TEST=<copia de js/barra-unidad.js>
'use strict'

const fs = require('fs')
const path = require('path')
const { extraerFn, extraerConst } = require('./extraer')
const { arnes } = require('./circuito-comun')

const RAIZ = path.join(__dirname, '..')
const RUTA = process.env.ARCHIVO_TEST || path.join(RAIZ, 'js', 'barra-unidad.js')
const src = fs.readFileSync(RUTA, 'utf8')
console.log(`ARCHIVO ${RUTA} (${src.length} bytes)`)
const { chk, esperas, fin } = arnes()

const FUNCIONES = ['escUni', 'logoUnidad', 'nombreCorto', 'debeMostrarseUnidad', 'idsDeLaPersona', 'ordenarUnidades',
  'resolverElegida', 'pasaFiltroUnidad', 'filtrarPorUnidad', 'htmlBarraUnidad', 'leerGuardada', 'guardarElegida', 'avisar',
  'estadoUnidad', 'unidadesDeLaBarra', 'alCambiarUnidad', 'elegirUnidad', 'pintar', 'cargarUnidadesDeLaPersona', 'instalarBarraUnidad']

function construir() {
  let codigo = `
    var RAIZ = new URL('https://ejemplo.test/seis-destinos/')
    var __ls = new Map()
    var localStorage = { getItem(k) { return __ls.has(k) ? __ls.get(k) : null }, setItem(k, v) { __ls.set(k, String(v)) } }
    var __eventos = []
    var __oyentes = {}
    var window = {
      dispatchEvent(e) { __eventos.push(e) },
      addEventListener(t, f) { (__oyentes[t] = __oyentes[t] || []).push(f) },
      location: { pathname: '/seis-destinos/modulos/gastos.html' },
    }
    var CustomEvent = function (tipo, o) { this.type = tipo; this.detail = o && o.detail }
    var console = { warn() {}, error() {}, log() {} }
    var FABRICA_SIN_DATOS = { ok: false, unidades: new Set(), personas: new Set(), soyDePrueba: false }
    var __fabrica = FABRICA_SIN_DATOS
    async function cargarFabricaDePruebas() { return __fabrica }
    function sinUnidadesDePrueba(filas, fabrica, clave = f => f && f.id) {
      if (!Array.isArray(filas) || !fabrica || fabrica.soyDePrueba || !fabrica.unidades || !fabrica.unidades.size) return filas || []
      return filas.filter(f => !fabrica.unidades.has(clave(f)))
    }
    var suscriptores = new Set()
    var estado = null
    var promesa = null
    var nav = null
    var notaPagina = ''
  `
  for (const c of ['CLAVE_ELEGIDA', 'TODAS', 'NOMBRE_CORTO', 'ORDEN_PREFIJO']) codigo += extraerConst(src, c)
  for (const f of FUNCIONES) codigo += extraerFn(src, f) + '\n'
  codigo += `return { ${FUNCIONES.join(', ')}, __ls, __win: window, __eventos, __oyentes,
    __setFabrica(f) { __fabrica = f }, __estado() { return estado }, __setPromesa(p) { promesa = p } }`
  return new Function(codigo)()
}

const U = {
  nuss: { id: 'u-nuss', nombre: 'Cucuruchos Nuss', prefijo: 'N', logo_url: 'logo-cucuruchos-nuss.png', activo: true },
  dolce: { id: 'u-dolce', nombre: 'Dolce Pasta', prefijo: 'D', logo_url: 'logo-dolce-pasta.png', activo: true },
  mengui: { id: 'u-mengui', nombre: 'Mengui', prefijo: 'O', logo_url: 'logo-heladitos-orly.png', activo: true },
  taller: { id: 'u-taller', nombre: 'Taller', prefijo: 'T', logo_url: 'logo-taller.png', activo: true },
  robot: { id: 'u-robot', nombre: 'Pruebas (robot)', prefijo: 'X', logo_url: null, activo: true },
}
const TODAS_U = Object.values(U)

// ── La base falsa ────────────────────────────────────────────────────────────
function sbFalso({ uid = 'uid-1', yo, tareas = [], unidades = TODAS_U, errorUnidades = null } = {}) {
  const consultas = []
  function q(tabla) {
    const filtros = {}
    const o = {
      select() { return o }, eq(k, v) { filtros[k] = v; return o },
      maybeSingle() { consultas.push(tabla); return Promise.resolve({ data: tabla === 'empleados' ? yo : null, error: null }) },
      then(res, rej) {
        consultas.push(tabla)
        let r
        if (tabla === 'unidades_negocio') r = { data: errorUnidades ? null : unidades.filter(u => u.activo), error: errorUnidades }
        else if (tabla === 'empleado_tareas') r = { data: tareas, error: null }
        else r = { data: [], error: null }
        return Promise.resolve(r).then(res, rej)
      },
    }
    return o
  }
  return { auth: { getSession: async () => ({ data: { session: uid ? { user: { id: uid } } : null } }) }, from: q, __consultas: consultas }
}

// ── El DOM falso ─────────────────────────────────────────────────────────────
function docFalso(meta = null) {
  const clases = new Set()
  const hijos = []
  let handler = null
  const nav = null
  return {
    body: {
      firstChild: null,
      insertBefore(n) { hijos.unshift(n) },
      classList: { add(c) { clases.add(c) }, contains(c) { return clases.has(c) } },
    },
    querySelector(sel) { return sel === 'meta[name="sd-unidad"]' && meta ? { getAttribute: () => meta } : null },
    createElement() {
      return {
        className: '', atributos: {}, innerHTML: '',
        setAttribute(k, v) { this.atributos[k] = v },
        addEventListener(t, f) { if (t === 'click') this.click = f },
      }
    },
    __hijos: hijos, __clases: clases, nav, handler,
  }
}

async function instalar(opciones = {}, { guardado = null, pathname = '/seis-destinos/modulos/gastos.html', meta = null, fabrica = null } = {}) {
  const s = construir()
  if (guardado != null) s.__ls.set('barraUnidad.elegida', guardado)
  if (fabrica) s.__setFabrica(fabrica)
  s.__win.location.pathname = pathname
  const doc = docFalso(meta)
  const sb = sbFalso(opciones)
  const nav = await s.instalarBarraUnidad({ sb, doc, win: s.__win })
  return { s, doc, sb, nav }
}
const chips = html => [...String(html).matchAll(/data-unidad="([^"]+)"/g)].map(m => m[1])

// ── 1. Las funciones puras ───────────────────────────────────────────────────
{
  const s = construir()
  const todas = TODAS_U.map(u => u.id)
  chk('super_admin: todas', s.idsDeLaPersona({ yo: { rol_app: 'super_admin' }, tareas: [], todas }).size === 5)
  const propia = s.idsDeLaPersona({ yo: { rol_app: 'usuario', unidad_negocio_id: 'u-nuss' }, tareas: [], todas })
  chk('usuario sin alcances: solo su unidad', propia.size === 1 && propia.has('u-nuss'))
  const conAlcance = s.idsDeLaPersona({ yo: { rol_app: 'usuario', unidad_negocio_id: 'u-nuss' }, tareas: [{ alcance: { unidades: ['u-dolce', 'u-no-existe'] } }, { alcance: null }], todas })
  chk('propia + alcance, sin ids que no existen', conAlcance.size === 2 && conAlcance.has('u-dolce') && !conAlcance.has('u-no-existe'))
  chk('alcance {todas:true} da todas', s.idsDeLaPersona({ yo: { rol_app: 'usuario' }, tareas: [{ alcance: { todas: true } }], todas }).size === 5)
  chk('una tarea SIN alcance no suma unidades', s.idsDeLaPersona({ yo: { rol_app: 'usuario' }, tareas: [{ alcance: null }], todas }).size === 0)
  chk('sin fila: ninguna', s.idsDeLaPersona({ yo: null, tareas: [], todas }).size === 0)

  const orden = s.ordenarUnidades([U.taller, U.robot, U.mengui, U.nuss, U.dolce]).map(u => u.prefijo).join('')
  chk('orden Nuss, Dolce Pasta, Mengui, Taller y lo demás', orden === 'NDOTX', orden)

  const dos = [U.nuss, U.dolce]
  chk('guardado que es de la persona: queda', s.resolverElegida('u-dolce', dos) === 'u-dolce')
  chk('guardado que YA NO es de la persona: Todas', s.resolverElegida('u-taller', dos) === null)
  chk('"todas" guardado: Todas', s.resolverElegida('todas', dos) === null)
  chk('con UNA sola unidad: null (no se filtra)', s.resolverElegida('u-nuss', [U.nuss]) === null)
  chk('sin lista: null', s.resolverElegida('u-nuss', null) === null)

  chk('filtro: Todas deja pasar todo', s.pasaFiltroUnidad('u-nuss', null) && s.pasaFiltroUnidad(null, null))
  chk('filtro: la misma unidad pasa', s.pasaFiltroUnidad('u-nuss', 'u-nuss'))
  chk('filtro: otra unidad no pasa', !s.pasaFiltroUnidad('u-dolce', 'u-nuss'))
  chk('filtro: una fila SIN unidad se ve siempre', s.pasaFiltroUnidad(null, 'u-nuss') && s.pasaFiltroUnidad('', 'u-nuss') && s.pasaFiltroUnidad(undefined, 'u-nuss'))
  const f = s.filtrarPorUnidad([{ unidad_negocio_id: 'u-nuss' }, { unidad_negocio_id: 'u-dolce' }, { unidad_negocio_id: null }], 'u-nuss')
  chk('filtrarPorUnidad: la elegida y las sin unidad', f.length === 2 && f.every(x => x.unidad_negocio_id !== 'u-dolce'))
  chk('filtrarPorUnidad con otra clave', s.filtrarPorUnidad([{ u: 'u-nuss' }, { u: 'u-dolce' }], 'u-dolce', x => x.u).length === 1)
  chk('filtrarPorUnidad sin lista: []', Array.isArray(s.filtrarPorUnidad(null, 'u-nuss')) && s.filtrarPorUnidad(null, 'u-nuss').length === 0)

  chk('logo: un nombre de archivo', s.logoUnidad('logo-taller.png') === 'logo-taller.png')
  chk('logo: ni esquemas, ni carpetas, ni ..', [
    'javascript:alert(1)', '../x.png', 'a/b.png', 'https://x/y.png', 'x.svg', '"><img>.png', '',
  ].every(l => s.logoUnidad(l) === null))
  chk('nombre corto por prefijo', s.nombreCorto(U.nuss) === 'Nuss' && s.nombreCorto({ nombre: 'Otra', prefijo: 'Z' }) === 'Otra')

  chk('no se muestra en la planta', !s.debeMostrarseUnidad({ pathname: '/seis-destinos/modulos/produccion.html' }))
  chk('no se muestra a una tablet', !s.debeMostrarseUnidad({ pathname: '/x/modulos/gastos.html', esDispositivo: true }))
  chk('no se muestra en el login', !s.debeMostrarseUnidad({ pathname: '/x/login.html' }))
  chk('sí en la gestión de Producción', s.debeMostrarseUnidad({ pathname: '/x/modulos/produccion-gestion.html' }))

  const malo = { id: 'u"><script>1</script>', nombre: '<img src=x onerror=alert(1)>', prefijo: 'Z', logo_url: 'javascript:1' }
  const h = s.htmlBarraUnidad({ unidades: [malo], elegida: null, raiz: new URL('https://e.test/'), nota: '<b>nota</b>' })
  chk('escapa el nombre, el id y la nota', !h.includes('<img src=x') && !h.includes('<script>') && !h.includes('<b>nota') && h.includes('&lt;img'))
  chk('un logo que no es un archivo no se dibuja', !h.includes('javascript:'))
  const h2 = s.htmlBarraUnidad({ unidades: [U.nuss, U.dolce], elegida: 'u-dolce', raiz: new URL('https://e.test/r/') })
  chk('Todas primero, después cada unidad', JSON.stringify(chips(h2)) === '["todas","u-nuss","u-dolce"]')
  chk('la elegida va marcada (aria-pressed)', /data-unidad="u-dolce" aria-pressed="true"/.test(h2) && /data-unidad="todas" aria-pressed="false"/.test(h2))
  chk('el logo sale de la raíz del repo', h2.includes('src="https://e.test/r/logo-dolce-pasta.png"'))
  chk('el nombre completo en el title', h2.includes('title="Cucuruchos Nuss"'))
  chk('un grupo con nombre para el lector', h2.includes('role="group" aria-label="Unidad de negocio"'))
}

// ── 2. Instalar ─────────────────────────────────────────────────────────────
esperas.push((async () => {
  // Super admin: las cuatro reales (la de prueba no, sin ser cuenta de prueba).
  const fab = { ok: true, unidades: new Set(['u-robot']), personas: new Set(), soyDePrueba: false }
  const a = await instalar({ yo: { id: 'e1', rol_app: 'super_admin', unidad_negocio_id: 'u-nuss' } }, { fabrica: fab })
  chk('super_admin: se dibuja', !!a.nav)
  chk('super_admin: Todas + las cuatro reales, sin la de prueba', JSON.stringify(chips(a.nav.innerHTML)) === '["todas","u-nuss","u-dolce","u-mengui","u-taller"]', a.nav.innerHTML)
  chk('arranca en Todas', a.s.estadoUnidad().elegida === null && a.s.estadoUnidad().mostrar === true)
  chk('va arriba de todo y marca el body', a.doc.__hijos[0] === a.nav && a.doc.__clases.has('con-barra-unidad'))
  chk('un super_admin no lee sus tareas', !a.sb.__consultas.includes('empleado_tareas'))

  // Cambiar avisa a los módulos, se guarda y repinta.
  let oido = null
  a.s.alCambiarUnidad(e => { oido = e })
  a.nav.click({ target: { closest: () => ({ dataset: { unidad: 'u-mengui' } }) } })
  chk('tocar un chip elige esa unidad', a.s.estadoUnidad().elegida === 'u-mengui')
  chk('se recuerda en el dispositivo', a.s.__ls.get('barraUnidad.elegida') === 'u-mengui')
  chk('avisa a quien escucha', oido && oido.elegida === 'u-mengui')
  chk('manda el evento unidad:cambio', a.s.__eventos.some(e => e.type === 'unidad:cambio' && e.detail.elegida === 'u-mengui'))
  chk('repinta con la elegida marcada', /data-unidad="u-mengui" aria-pressed="true"/.test(a.nav.innerHTML))
  const antes = a.s.__eventos.length
  a.nav.click({ target: { closest: () => ({ dataset: { unidad: 'u-mengui' } }) } })
  chk('elegir la misma no vuelve a avisar', a.s.__eventos.length === antes)
  a.nav.click({ target: { closest: () => ({ dataset: { unidad: 'todas' } }) } })
  chk('Todas guarda "todas" y deja null', a.s.estadoUnidad().elegida === null && a.s.__ls.get('barraUnidad.elegida') === 'todas')
  a.nav.click({ target: { closest: () => ({ dataset: { unidad: 'u-robot' } }) } })
  chk('una unidad que no es de la persona no se elige', a.s.estadoUnidad().elegida === null)
  // Otra pestaña cambió la elección.
  a.s.__oyentes.storage[0]({ key: 'barraUnidad.elegida', newValue: 'u-taller' })
  chk('sigue lo que eligió otra pestaña', a.s.estadoUnidad().elegida === 'u-taller')

  // Un usuario con su unidad y un alcance: dos y Todas.
  const b = await instalar({ yo: { id: 'e2', rol_app: 'usuario', unidad_negocio_id: 'u-nuss' }, tareas: [{ alcance: { unidades: ['u-dolce'] } }] }, { guardado: 'u-dolce' })
  chk('usuario: solo sus unidades', JSON.stringify(chips(b.nav.innerHTML)) === '["todas","u-nuss","u-dolce"]', b.nav && b.nav.innerHTML)
  chk('respeta lo guardado', b.s.estadoUnidad().elegida === 'u-dolce')

  const c = await instalar({ yo: { id: 'e3', rol_app: 'usuario', unidad_negocio_id: 'u-nuss' }, tareas: [{ alcance: { unidades: ['u-dolce'] } }] }, { guardado: 'u-taller' })
  chk('lo guardado que ya no es de la persona: Todas', c.s.estadoUnidad().elegida === null)

  // Una sola unidad: no se dibuja y no se filtra.
  const d = await instalar({ yo: { id: 'e4', rol_app: 'usuario', unidad_negocio_id: 'u-nuss' }, tareas: [] }, { guardado: 'u-nuss' })
  chk('con UNA sola unidad no se dibuja', d.nav === null && d.doc.__hijos.length === 0)
  chk('con UNA sola unidad la elección es null (no se filtra)', d.s.estadoUnidad().elegida === null && d.s.estadoUnidad().mostrar === false)

  // Cuenta de prueba: ve la de prueba.
  const e = await instalar({ yo: { id: 'e5', rol_app: 'usuario', unidad_negocio_id: 'u-robot' }, tareas: [{ alcance: { unidades: ['u-nuss'] } }] },
    { fabrica: { ok: true, unidades: new Set(['u-robot']), personas: new Set(), soyDePrueba: true } })
  chk('una cuenta de prueba sí ve su unidad', chips(e.nav.innerHTML).includes('u-robot'))

  // No se dibuja: tablet, planta, sin sesión, sin fila, error de la base.
  const t = await instalar({ yo: { id: 'e6', rol_app: 'usuario', es_dispositivo: true, unidad_negocio_id: 'u-nuss' }, tareas: [{ alcance: { todas: true } }] })
  chk('una tablet: no', t.nav === null)
  const p = await instalar({ yo: { id: 'e7', rol_app: 'super_admin' } }, { pathname: '/x/modulos/produccion.html' })
  chk('la planta: no (y no consulta nada)', p.nav === null && p.sb.__consultas.length === 0)
  const sin = await instalar({ uid: null, yo: null })
  chk('sin sesión: no', sin.nav === null)
  const nof = await instalar({ yo: null })
  chk('sin fila en empleados: no', nof.nav === null)
  const err = await instalar({ yo: { id: 'e8', rol_app: 'super_admin' }, errorUnidades: new Error('x') })
  chk('si falla leer las unidades: no se dibuja y no se filtra', err.nav === null && err.s.estadoUnidad().elegida === null)

  // La nota de las pantallas que no filtran.
  const n = await instalar({ yo: { id: 'e9', rol_app: 'super_admin' } }, { meta: 'no-filtra' })
  chk('una pantalla que no filtra lo dice en chico', n.nav.innerHTML.includes('barra-unidad__nota') && n.nav.innerHTML.includes('muestra todas las unidades'))
  chk('una que filtra no pone nota', !a.nav.innerHTML.includes('barra-unidad__nota'))

  // unidadesDeLaBarra espera a que termine.
  const s2 = construir()
  let listo = null
  s2.__setPromesa(Promise.resolve())
  listo = await s2.unidadesDeLaBarra()
  chk('antes de cargar: sin unidades, sin elección', listo.elegida === null && listo.unidades.length === 0)
})())

// ── 3. Las pantallas y el CSS ────────────────────────────────────────────────
{
  const paginas = fs.readdirSync(path.join(RAIZ, 'modulos')).filter(f => f.endsWith('.html')).map(f => 'modulos/' + f).concat(['dashboard.html'])
  for (const p of paginas) {
    const t = fs.readFileSync(path.join(RAIZ, p), 'utf8')
    if (p === 'modulos/produccion.html') { chk('la planta NO carga la barra de unidad', !t.includes('barra-unidad.js')); continue }
    if (p === 'modulos/cheques.html') continue   // es una redirección
    chk(`${p} carga la barra de unidad`, t.includes(`src="${p === 'dashboard.html' ? './js/' : '../js/'}barra-unidad.js"`))
  }
  for (const f of ['index.html', 'login.html', 'registro.html', 'mfa.html', 'recuperar-contrasena.html', 'restablecer-contrasena.html']) {
    chk(`${f} no la carga`, !fs.readFileSync(path.join(RAIZ, f), 'utf8').includes('barra-unidad.js'))
  }
  const css = fs.readFileSync(process.env.ARCHIVO_CSS || path.join(RAIZ, 'css', 'main.css'), 'utf8')
  chk('CSS: los chips scrollean adentro de la barra', /\.barra-unidad__chips \{[^}]*overflow-x: auto/.test(css))
  chk('CSS: la barra no se sale del ancho', /\.barra-unidad \{[^}]*max-width: 100%/.test(css) && /\.barra-unidad \{[^}]*box-sizing: border-box/.test(css))
  chk('CSS: chips de 44 px', /\.barra-unidad__chip \{[^}]*min-height: 44px/.test(css))
  chk('CSS: no se imprime', /@media print \{ \.barra-unidad \{ display: none !important; \} \}/.test(css))
  const base = css.indexOf('.barra-unidad__chip {'), activa = css.indexOf('.barra-unidad__chip--activa,')
  chk('CSS: la variante activa va DESPUÉS de la base', base !== -1 && activa > base)
}

fin()
