// Arma un sandbox con el <script type="module"> REAL de modulos/taller.html
// (Proyectos Taller, 29/09/2026). A diferencia de otros sandboxes, no extrae
// función por función: corre el script ENTERO (sin los import y sin el init()
// del final), así todas las funciones y constantes del módulo quedan vivas y
// se EJECUTAN con un DOM falso y una base falsa.
//
// Lo importado llega así:
//  - js/utils.js: el código REAL de la sección de números hasta el final
//    (fuenteNumeros: números, fábrica de pruebas); mostrarError / mostrarExito
//    son dobles que anotan lo que se muestra.
//  - js/barra-unidad.js: inicialesDe y colorPersona REALES (extraer.js las
//    encuentra por el import).
//  - supabase: un doble. rpc() anota [nombre, parámetros] en __llamadas.rpc y
//    responde con __rpc (la suite lo cambia con __setRpc); from() arma una
//    consulta encadenable que responde con __tablas[tabla] (un array, o una
//    función (filtros) => { data, error }) y anota la consulta.
//
// OJO: el doble IGNORA el .select(): una columna que falte en la consulta no
// se ve acá.

const fs = require('fs')
const path = require('path')
const { extraerFn, extraerConst } = require('./extraer')
const { fuenteNumeros } = require('./numeros-comun')

const RAIZ = path.join(__dirname, '..')

function scriptDelModulo(html) {
  const ini = html.indexOf('<script type="module">')
  if (ini === -1) throw new Error('taller.html: no está el <script type="module">')
  const fin = html.indexOf('</script>', ini)
  return html.slice(ini + '<script type="module">'.length, fin)
}

// El cuerpo sin los import (de una o varias líneas), sin la llamada al banner
// y sin el init() del final.
function cuerpoEjecutable(script) {
  let c = script.replace(/^\s*import\s[\s\S]*?from\s+'[^']+'\s*$/gm, '')
  c = c.replace(/^\s*import\s+'[^']+'\s*$/gm, '')
  c = c.replace(/^\s*mostrarBannerVersion\(\)\s*$/m, '')
  const ultimo = c.lastIndexOf('init()')
  if (ultimo === -1) throw new Error('taller.html: no está el init() del final')
  c = c.slice(0, ultimo) + c.slice(ultimo + 'init()'.length)
  return c
}

function nombresTopLevel(cuerpo) {
  const fns = [...cuerpo.matchAll(/^ {4}(?:async\s+)?function\s+([A-Za-z0-9_]+)\s*\(/gm)].map(m => m[1])
  const consts = [...cuerpo.matchAll(/^ {4}(?:const|let)\s+([A-Za-z0-9_]+)\s*=/gm)].map(m => m[1])
  return [...new Set([...fns, ...consts])]
}

const PRELUDIO = `
  ${fuenteNumeros()}
  var __llamadas = { rpc: [], consultas: [], exitos: [], errores: [], storage: [], abiertos: [], foco: [] }
  function nuevoEl(id) {
    const clases = new Set()
    const oyentes = {}
    return {
      id, innerHTML: '', textContent: '', value: '', className: '', hidden: false, disabled: false, checked: false,
      dataset: {}, style: { setProperty() {} }, title: '', type: 'text', files: null, atributos: {},
      setAttribute(k, v) { this.atributos[k] = String(v) }, getAttribute(k) { return this.atributos[k] ?? null },
      removeAttribute(k) { delete this.atributos[k] },
      querySelectorAll: () => [], querySelector: () => null, closest: () => null, contains: () => false,
      addEventListener(t, f) { (oyentes[t] ||= []).push(f) }, removeEventListener() {},
      focus() { __llamadas.foco.push(id) }, blur() {}, click() {}, select() {}, scrollIntoView() {},
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0 }),
      appendChild() {}, remove() {},
      classList: { add(c) { clases.add(c) }, remove(c) { clases.delete(c) }, toggle(c, f) { (f ?? !clases.has(c)) ? clases.add(c) : clases.delete(c) }, contains(c) { return clases.has(c) } },
    }
  }
  var __els = new Map()
  function __el(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) }
  var document = {
    getElementById(id) { return __els.get(id) ?? null },
    querySelector: () => null, querySelectorAll: () => [],
    createElement: () => nuevoEl('creado'), body: nuevoEl('body'), documentElement: nuevoEl('html'),
    addEventListener() {}, activeElement: null,
  }
  var __movil = false
  var window = {
    location: { search: '', pathname: '/x/modulos/taller.html', href: '' },
    matchMedia: () => ({ matches: __movil, addEventListener() {} }),
    scrollTo() {}, open(u) { __llamadas.abiertos.push(u) }, addEventListener() {}, lucide: null,
  }
  var history = { replaceState() {} }
  var console = { error() {}, warn() {}, log() {} }
  function setTimeout(f) { return 0 } function clearTimeout() {}
  function mostrarExito(m) { __llamadas.exitos.push(m) }
  function mostrarError(m) { __llamadas.errores.push(m) }
  async function verificarSesion() { return null }
  function unidadesDeLaBarra() { return null }
  function alCambiarUnidad() {}
  var __rpc = async () => ({ data: null, error: null })
  var __tablas = {}
  function __consulta(tabla) {
    const filtros = { tabla, eq: {}, in: {}, orden: [] }
    const q = {
      select(c) { filtros.select = c; return q }, eq(k, v) { filtros.eq[k] = v; return q }, in(k, v) { filtros.in[k] = v; return q },
      order(k, o) { filtros.orden.push([k, o]); return q }, limit(n) { filtros.limit = n; return q }, is() { return q },
      gte() { return q }, lte() { return q }, neq() { return q }, not() { return q }, or() { return q },
      maybeSingle() { filtros.single = true; return q }, single() { filtros.single = true; return q },
      then(res, rej) {
        __llamadas.consultas.push(filtros)
        const t = __tablas[tabla]
        let r
        if (typeof t === 'function') r = t(filtros)
        else r = { data: t ?? [], error: null }
        if (filtros.single && Array.isArray(r.data)) r = { ...r, data: r.data[0] ?? null }
        return Promise.resolve(r).then(res, rej)
      },
    }
    return q
  }
  var supabase = {
    rpc: (n, p) => { __llamadas.rpc.push([n, p]); return __rpc(n, p) },
    from: __consulta,
    auth: { getUser: async () => ({ data: { user: null } }) },
    storage: { from: b => ({
      upload: async (ruta) => { __llamadas.storage.push(['upload', b, ruta]); return { data: { path: ruta }, error: null } },
      createSignedUrl: async (ruta, seg) => { __llamadas.storage.push(['firma', b, ruta, seg]); return { data: { signedUrl: 'https://x/' + ruta }, error: null } },
    }) },
  }
`

function construirTaller({ archivo } = {}) {
  const ruta = archivo || process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos', 'taller.html')
  const html = fs.readFileSync(ruta, 'utf8')
  const script = scriptDelModulo(html)
  const cuerpo = cuerpoEjecutable(script)
  const nombres = nombresTopLevel(cuerpo)
  const importados = extraerFn(html, 'inicialesDe') + '\n' + extraerConst(html, 'TONOS_PERSONA') + '\n' + extraerFn(html, 'colorPersona') + '\n'
  const codigo = PRELUDIO + importados + cuerpo +
    `\nreturn { ${nombres.join(', ')}, __els, __el, __llamadas, __tablas, document, window,
      __setRpc(f) { __rpc = f }, __setMovil(v) { __movil = v } }`
  return new Function(codigo)()
}

module.exports = { construirTaller, scriptDelModulo, cuerpoEjecutable, nombresTopLevel }
