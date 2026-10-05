// La barra de abajo del celular a gusto de cada persona (05/10/2026). Se
// EJECUTAN las funciones reales de js/barra-lateral.js, js/preferencias.js y
// js/modulos.js con un DOM falso y una base falsa:
//  - cuántos módulos entran según el ancho (4 a 6; nunca menos de 4);
//  - si la persona eligió (barra_inferior), esos y en su orden, solo los que
//    puede abrir; si nunca eligió, los que más usa y después los fijados;
//  - el editor: agregar (hasta lo que entra), sacar, subir y bajar; Guardar,
//    "Volver a la automática" y cerrar sin guardar; el toque largo lo abre;
//  - GUARDAR LA BARRA NO BORRA LO DE LA PANTALLA PRINCIPAL: se lee la cuenta
//    (mis_preferencias) justo antes, se cambia SOLO barra_inferior y se sube
//    el objeto entero; y guardar el tablero con una copia vieja no borra la
//    barra;
//  - si la cuenta no contesta, queda en este celular y se dice.
//
//   node pruebas/test-barra-abajo.js
//   ARCHIVO_TEST=<copia de js/barra-lateral.js>  ARCHIVO_PREFS=<copia de js/preferencias.js>
//   ARCHIVO_CSS=<copia de css/main.css>

const fs = require('fs')
const path = require('path')
const { extraerFn, extraerConst } = require('./extraer')
const { arnes } = require('./circuito-comun')

const RAIZ = path.join(__dirname, '..')
const RUTA = process.env.ARCHIVO_TEST || path.join(RAIZ, 'js', 'barra-lateral.js')
const RUTA_MODULOS = process.env.ARCHIVO_MODULOS || path.join(RAIZ, 'js', 'modulos.js')
const RUTA_PREFS = process.env.ARCHIVO_PREFS || path.join(RAIZ, 'js', 'preferencias.js')
const RUTA_CSS = process.env.ARCHIVO_CSS || path.join(RAIZ, 'css', 'main.css')
const src = fs.readFileSync(RUTA, 'utf8')
const mod = fs.readFileSync(RUTA_MODULOS, 'utf8')
const pref = fs.readFileSync(RUTA_PREFS, 'utf8')
const css = fs.readFileSync(RUTA_CSS, 'utf8')
console.log(`ARCHIVO ${RUTA} (${src.length} bytes)`)
console.log(`ARCHIVO ${RUTA_PREFS} (${pref.length} bytes)`)
console.log(`ARCHIVO ${RUTA_CSS} (${css.length} bytes)`)
const { chk, esperas, fin } = arnes()

const FUNCIONES = ['htmlIcono', 'debeMostrarse', 'modulosDeBarra', 'claveActual', 'leerColapsada', 'htmlBurbujaBarra', 'htmlItem',
  'htmlBarra', 'capacidadBarraAbajo', 'htmlBarraAbajo', 'htmlHojaMas', 'htmlEditarAbajo', 'cambiarListaAbajo',
  'pintarBurbujasBarra', 'pintarBurbujasAbajo', 'leerGuardado', 'guardar', 'instalarBarraLateral']
const DE_MODULOS = ['moduloVisible', 'escDash', 'textoPendiente', 'agruparPendientes', 'colorDeModulo', 'enOrdenDeBarra']
const DE_PREFS = ['clavePrefs', 'prefsVacias', 'normalizarPrefs', 'leerCopia', 'escribirCopia', 'sonDeFabrica', 'leerPrefs', 'guardarPrefs', 'subirPrefs',
  'cargarPrefs', 'guardarBarraInferior', 'dondeSeGuardanPrefs', 'anotarUso', 'vecesUsado', 'ordenarBarra', 'modulosDeAbajo']

function construir() {
  let codigo = `
    var RAIZ = new URL('https://ejemplo.test/seis-destinos/')
    var __ls = new Map()
    var localStorage = { getItem(k) { return __ls.has(k) ? __ls.get(k) : null }, setItem(k, v) { __ls.set(k, String(v)) } }
    var globalThis = { localStorage }
    var console = { warn() {}, error(...a) { __errores.push(a) }, log() {} }
    var __errores = []
    var abrirPanelSesiones = () => {}
  `
  for (const c of ['MODULOS', 'MODULO_DE_PENDIENTE', 'TAMBIEN_EN_TARJETA', 'PENDIENTES_URGENTES', 'PALETA_MODULO', 'ORDEN_BARRA']) codigo += extraerConst(mod, c)
  for (const f of DE_MODULOS) codigo += extraerFn(mod, f) + '\n'
  for (const c of ['ORDENES_BARRA', 'TAMANOS', 'DIAS_USO', 'MS_DIA', 'TOPE_USO', 'VERSION_PREFS', 'ESTADO_PREFS']) codigo += extraerConst(pref, c)
  for (const f of DE_PREFS) codigo += extraerFn(pref, f) + '\n'
  for (const c of ['CLAVE_COLAPSADA', 'ANCHO_ABIERTA', 'ANCHO_TAB_ABAJO', 'MIN_ABAJO', 'MAX_ABAJO', 'MS_TOQUE_LARGO', 'ICONOS', 'INICIO', 'SEGURIDAD', 'URL_PERSONALIZAR']) codigo += extraerConst(src, c)
  for (const f of FUNCIONES) codigo += extraerFn(src, f) + '\n'
  codigo += `return { ${FUNCIONES.join(', ')}, ${DE_PREFS.join(', ')}, MODULOS, ESTADO_PREFS, __ls, __errores }`
  return new Function(codigo)()
}

// ── El DOM falso ─────────────────────────────────────────────────────────────
function clases() {
  const s = new Set()
  return { add(c) { s.add(c) }, remove(c) { s.delete(c) }, toggle(c, f) { (f ?? !s.has(c)) ? s.add(c) : s.delete(c) }, contains(c) { return s.has(c) } }
}
function elFalso() {
  let html = ''
  const el = {
    className: '', atributos: {}, hidden: false, botones: {}, oyentes: {},
    setAttribute(k, v) { this.atributos[k] = String(v) },
    get innerHTML() { return html },
    set innerHTML(v) { html = v; this.botones = {} },
    addEventListener(t, f) { (this.oyentes[t] ||= []).push(f) },
    disparar(t, ev = {}) { for (const f of this.oyentes[t] || []) f(ev) },
    querySelector(sel) {
      const id = /^#([\w-]+)$/.exec(sel)?.[1]
      if (id && html.includes(`id="${id}"`)) {
        return (this.botones[id] ||= { handlers: [], addEventListener(t, f) { if (t === 'click') this.handlers.push(f) }, focus() {} })
      }
      return null
    },
    querySelectorAll(sel) {
      if (sel === '.barra-abajo__tab[data-clave]') return [...html.matchAll(/class="barra-abajo__tab[^"]*"[^>]*data-clave="([^"]+)"/g)].map(m => ({ dataset: { clave: m[1] }, insertAdjacentHTML() {} }))
      return []
    },
  }
  return el
}
function docFalso() {
  const body = { classList: clases(), prepended: [], appended: [], prepend(n) { this.prepended.push(n) }, append(...n) { this.appended.push(...n) } }
  return { body, visibilityState: 'visible', oyentes: {}, createElement() { return elFalso() },
    addEventListener(t, f) { (this.oyentes[t] ||= []).push(f) }, getElementById() { return null } }
}
// Un botón del editor, como lo entrega el click delegado (ev.target.closest).
function botonDe(html, atributo, clave) {
  const re = clave == null ? new RegExp(`<button[^>]*id="${atributo}"[^>]*>`) : new RegExp(`<button[^>]*data-${atributo}="${clave}"[^>]*>`)
  const tag = re.exec(html)?.[0]
  if (!tag) return null
  const dataset = {}
  for (const m of tag.matchAll(/data-abajo-(\w+)="([^"]*)"/g)) dataset['abajo' + m[1][0].toUpperCase() + m[1].slice(1)] = m[2]
  return { id: /id="([^"]+)"/.exec(tag)?.[1] ?? '', disabled: / disabled[ >]/.test(tag), dataset }
}
function tocar(editor, atributo, clave) {
  const b = botonDe(editor.innerHTML, atributo, clave)
  if (!b) throw new Error(`no está el botón ${atributo} ${clave ?? ''}`)
  editor.disparar('click', { target: { closest: () => b } })
  return b
}
// La base falsa: la cuenta es un objeto que puede cambiar "en otro dispositivo".
function sbFalso({ modulos = [], cuenta = {}, errorLeer = null, errorGuardar = null, demoraGuardar = 0 } = {}) {
  const sb = {
    cuenta, llamadas: [], guardadas: [],
    auth: { async getSession() { return { data: { session: { user: { id: 'uid-1' } } }, error: null } }, async signOut() {} },
    from(tabla) {
      const resp = () => {
        if (tabla === 'empleados') return { data: { id: 'e1', rol_app: 'usuario', es_dispositivo: false }, error: null }
        if (tabla === 'empleado_modulos') return { data: modulos.map(m => ({ modulo: m })), error: null }
        if (tabla === 'empleado_tareas') return { data: [], error: null }
        return { data: [], error: null }
      }
      const cadena = { select() { return cadena }, eq() { return cadena }, maybeSingle() { return Promise.resolve(resp()) }, then(ok, mal) { return Promise.resolve(resp()).then(ok, mal) } }
      return cadena
    },
    async rpc(nombre, args) {
      sb.llamadas.push(nombre)
      if (nombre === 'mis_preferencias') {
        if (sb.errorLeer) return { data: null, error: sb.errorLeer }
        return { data: JSON.parse(JSON.stringify(sb.cuenta)), error: null }
      }
      if (nombre === 'guardar_mis_preferencias') {
        if (sb.errorGuardar) return { data: null, error: sb.errorGuardar }
        // Una subida que tarda: lo que se lea mientras, todavía es lo viejo.
        if (demoraGuardar) await new Promise(r => setTimeout(r, demoraGuardar))
        sb.guardadas.push(args.p_datos)
        sb.cuenta = JSON.parse(JSON.stringify(args.p_datos))
        return { data: null, error: null }
      }
      return { data: [], error: null }
    },
  }
  sb.errorLeer = errorLeer
  sb.errorGuardar = errorGuardar
  return sb
}
function winEn(pathname, ancho = 390) {
  const oyentes = {}
  const relojes = []
  return { location: { pathname, search: '', replace(u) { this.fue = u } }, innerWidth: ancho, oyentes, relojes,
    addEventListener(t, f) { (oyentes[t] ||= []).push(f) },
    setTimeout(f) { relojes.push(f); return relojes.length }, clearTimeout(n) { relojes[n - 1] = null },
    correrRelojes() { const r = relojes.splice(0); r.forEach(f => f && f()) } }
}
const tabs = (html) => [...String(html).matchAll(/class="barra-abajo__tab[^"]*"[^>]*data-clave="([^"]+)"/g)].map(m => m[1])
const tic = () => new Promise(r => setImmediate(r))
const SEIS = ['gastos', 'caja', 'stock', 'cobranzas', 'pedidos', 'materia-prima']

// ── Las piezas sueltas ──────────────────────────────────────────────────────
{
  const S = construir()
  chk('capacidad: 320 y 360 px → 4 (nunca menos)', S.capacidadBarraAbajo(320) === 4 && S.capacidadBarraAbajo(360) === 4)
  chk('capacidad: 390 → 4, 419 → 4, 420 → 5', S.capacidadBarraAbajo(390) === 4 && S.capacidadBarraAbajo(419) === 4 && S.capacidadBarraAbajo(420) === 5)
  chk('capacidad: 480 → 6, 768 → 6 (tope)', S.capacidadBarraAbajo(480) === 6 && S.capacidadBarraAbajo(768) === 6)
  chk('capacidad: un ancho raro → 4', S.capacidadBarraAbajo(undefined) === 4 && S.capacidadBarraAbajo('x') === 4)

  const mods = S.MODULOS.filter(m => SEIS.includes(m.clave))
  const ahora = Date.parse('2026-10-05T12:00:00Z')
  let p = S.prefsVacias()
  p.barra.fijados = ['gastos']
  for (let i = 0; i < 4; i++) p = S.anotarUso(p, 'pedidos', ahora)
  for (let i = 0; i < 2; i++) p = S.anotarUso(p, 'stock', ahora)
  const auto = S.modulosDeAbajo(mods, p, ahora, 4).map(m => m.clave)
  chk('sin elegir: los más usados primero (Pedidos, Stock), después el fijado (Gastos) y el orden', auto.length === 4 && auto.slice(0, 3).join() === 'pedidos,stock,gastos', auto.join())
  chk('sin elegir ni uso ni fijados: el orden de la barra', S.modulosDeAbajo(mods, S.prefsVacias(), ahora, 4).length === 4)
  const elegida = { ...p, barra_inferior: ['caja', 'materia-prima', 'gastos'] }
  chk('elegida: esos, en SU orden (aunque Pedidos se use más)', S.modulosDeAbajo(mods, elegida, ahora, 4).map(m => m.clave).join() === 'caja,materia-prima,gastos')
  chk('elegida con más de los que entran: los primeros', S.modulosDeAbajo(mods, { barra_inferior: ['caja', 'stock', 'gastos', 'pedidos', 'cobranzas'] }, ahora, 4).map(m => m.clave).join() === 'caja,stock,gastos,pedidos')
  chk('elegida con un módulo que ya no puede abrir: ese no sale', S.modulosDeAbajo(mods, { barra_inferior: ['accesos', 'caja'] }, ahora, 4).map(m => m.clave).join() === 'caja')
  chk('elegida y ninguno a su alcance: vuelve a la automática', S.modulosDeAbajo(mods, { ...p, barra_inferior: ['accesos'] }, ahora, 4).map(m => m.clave).slice(0, 2).join() === 'pedidos,stock')

  chk('lista: agregar al final', S.cambiarListaAbajo(['a', 'b'], 'agregar', 'c', 4).join() === 'a,b,c')
  chk('lista: agregar no pasa de lo que entra', S.cambiarListaAbajo(['a', 'b', 'c', 'd'], 'agregar', 'e', 4).join() === 'a,b,c,d')
  chk('lista: agregar uno que ya está no lo repite', S.cambiarListaAbajo(['a', 'b'], 'agregar', 'a', 4).join() === 'a,b')
  chk('lista: sacar', S.cambiarListaAbajo(['a', 'b', 'c'], 'sacar', 'b', 4).join() === 'a,c')
  chk('lista: subir y bajar', S.cambiarListaAbajo(['a', 'b', 'c'], 'subir', 'c', 4).join() === 'a,c,b' && S.cambiarListaAbajo(['a', 'b', 'c'], 'bajar', 'a', 4).join() === 'b,a,c')
  chk('lista: subir el primero y bajar el último no hacen nada', S.cambiarListaAbajo(['a', 'b'], 'subir', 'a', 4).join() === 'a,b' && S.cambiarListaAbajo(['a', 'b'], 'bajar', 'b', 4).join() === 'a,b')

  const h = S.htmlEditarAbajo({ lista: ['caja', 'stock'], modulos: mods, cantidad: 4 })
  chk('editor: es un diálogo con título', /role="dialog" aria-modal="true" aria-labelledby="editar-abajo-titulo"/.test(h) && />La barra de abajo</.test(h))
  chk('editor: dice cuántos entran y cuántos hay', /Elegí hasta 4 módulos/.test(h) && /En la barra · 2 de 4/.test(h))
  chk('editor: los de la barra en su orden, con subir/bajar/sacar', /data-abajo-subir="caja"[^]*data-abajo-subir="stock"/.test(h) && /data-abajo-sacar="stock"/.test(h))
  chk('editor: subir el primero y bajar el último apagados', / data-abajo-subir="caja"[^>]*disabled/.test(h) && / data-abajo-bajar="stock"[^>]*disabled/.test(h) && !/ data-abajo-bajar="caja"[^>]*disabled/.test(h))
  chk('editor: los demás se pueden agregar', /data-abajo-agregar="gastos"/.test(h) && !/data-abajo-agregar="caja"/.test(h) && !/ data-abajo-agregar="gastos"[^>]*disabled/.test(h))
  const lleno = S.htmlEditarAbajo({ lista: ['caja', 'stock', 'gastos', 'pedidos'], modulos: mods, cantidad: 4 })
  chk('editor lleno: "Agregar" apagado y lo dice', / data-abajo-agregar="cobranzas"[^>]*disabled/.test(lleno) && /La barra está llena/.test(lleno))
  chk('editor vacío: lo dice', /Todavía no elegiste ninguno/.test(S.htmlEditarAbajo({ lista: [], modulos: mods, cantidad: 4 })))
  const malo = S.htmlEditarAbajo({ lista: ['x"><b>'], modulos: [{ clave: 'x"><b>', nombre: '<img src=x onerror=1>', url: 'x' }], cantidad: 4, error: '<b>mal</b>' })
  chk('editor: nombre, clave y error escapados', !/<img|<b>/.test(malo) && /&lt;img/.test(malo) && /&lt;b&gt;mal/.test(malo))
  chk('editor guardando: los dos botones apagados', /id="editar-abajo-guardar" disabled>Guardando…/.test(S.htmlEditarAbajo({ lista: ['caja'], modulos: mods, cantidad: 4, guardando: true })))

  const hm = S.htmlHojaMas({ modulos: mods, raiz: new URL('https://ejemplo.test/x/') })
  chk('"Más" tiene "Editar la barra de abajo"', /id="hoja-mas-editar"[^>]*>Editar la barra de abajo</.test(hm))
  const anchos = [...S.htmlBarraAbajo({ abajo: mods.slice(0, 2), actual: null, raiz: new URL('https://ejemplo.test/x/') }).matchAll(/<svg width="(\d+)"/g)].map(m => m[1])
  chk('los íconos de la barra de abajo, TODOS un poco más grandes (23)', anchos.length === 4 && anchos.every(a => a === '23'), anchos.join())

  // Las preferencias: barra_inferior y las claves que no se conocen.
  const n = S.normalizarPrefs({ barra_inferior: ['caja', 'caja', 3, '', 'stock'], otra: { a: 1 }, v: 1 })
  chk('normalizar: barra_inferior sin repetidos ni cosas raras', JSON.stringify(n.barra_inferior) === '["caja","stock"]')
  chk('normalizar: una clave que no conoce se conserva; la marca v no', JSON.stringify(n.otra) === '{"a":1}' && !('v' in n))
  chk('normalizar: sin barra_inferior (o vacía) no aparece', !('barra_inferior' in S.normalizarPrefs({ barra_inferior: [] })) && !('barra_inferior' in S.normalizarPrefs({})))
}

// ── Guardar: la barra no borra lo de la pantalla principal (y al revés) ─────
esperas.push((async () => {
  const TABLERO_VIEJO = { orden: ['gastos'], tamanos: {}, ocultas: [] }
  const TABLERO_NUEVO = { orden: ['caja', 'gastos'], tamanos: { caja: 'ancha' }, ocultas: ['stock'] }
  {
    const S = construir()
    const sb = sbFalso({ cuenta: { v: 1, barra: { orden: 'alfa', manual: [], fijados: ['caja'] }, tablero: TABLERO_VIEJO, uso: {} } })
    await S.cargarPrefs({ sb, empleadoId: 'e1' })
    // Otro dispositivo cambió el tablero DESPUÉS de que esta página leyó la cuenta.
    sb.cuenta = { v: 1, barra: { orden: 'alfa', manual: [], fijados: ['caja'] }, tablero: TABLERO_NUEVO, uso: { caja: [1] }, otra: 'x' }
    const r = await S.guardarBarraInferior({ empleadoId: 'e1', lista: ['stock', 'caja'] })
    const g = sb.guardadas.at(-1)
    chk('guardar la barra: queda en la cuenta', r.ok === true && r.donde === 'cuenta')
    chk('guardar la barra: lee la cuenta justo antes de guardar', sb.llamadas.slice(-2).join() === 'mis_preferencias,guardar_mis_preferencias', sb.llamadas.join())
    chk('guardar la barra: sube barra_inferior en orden', JSON.stringify(g.barra_inferior) === '["stock","caja"]')
    chk('guardar la barra NO BORRA el tablero: sube el de la cuenta (el nuevo), no la copia vieja', JSON.stringify(g.tablero) === JSON.stringify(TABLERO_NUEVO), JSON.stringify(g.tablero))
    chk('… ni la barra de la compu, ni el uso, ni una clave desconocida', g.barra.orden === 'alfa' && g.barra.fijados[0] === 'caja' && JSON.stringify(g.uso) === '{"caja":[1]}' && g.otra === 'x')
    chk('… con la marca v', g.v === 1)
    chk('después, la página ve el tablero nuevo y la barra elegida', JSON.stringify(S.leerPrefs('e1').tablero) === JSON.stringify(TABLERO_NUEVO) && S.leerPrefs('e1').barra_inferior.join() === 'stock,caja')
    // Y al revés: el tablero guarda con su copia VIEJA (sin barra_inferior).
    S.guardarPrefs('e1', { barra: { orden: 'mano', manual: [], fijados: [] }, tablero: TABLERO_VIEJO, uso: {} })
    await S.ESTADO_PREFS.cola.get('e1')
    const g2 = sb.guardadas.at(-1)
    chk('guardar el tablero con una copia vieja NO BORRA la barra de abajo', JSON.stringify(g2.barra_inferior) === '["stock","caja"]', JSON.stringify(g2))
    chk('guardar el tablero conserva la clave desconocida', g2.otra === 'x')
    // Una copia vieja que trae OTRA barra (la de antes de editarla) tampoco la pisa.
    S.guardarPrefs('e1', { tablero: TABLERO_VIEJO, barra_inferior: ['gastos'] })
    await S.ESTADO_PREFS.cola.get('e1')
    chk('una copia con la barra VIEJA no pisa la elegida', JSON.stringify(sb.guardadas.at(-1).barra_inferior) === '["stock","caja"]', JSON.stringify(sb.guardadas.at(-1).barra_inferior))
    // Volver a la automática: se saca la clave, el resto queda.
    await S.guardarBarraInferior({ empleadoId: 'e1', lista: [] })
    const g3 = sb.guardadas.at(-1)
    chk('"Volver a la automática": sin barra_inferior y el tablero intacto', !('barra_inferior' in g3) && JSON.stringify(g3.tablero) === JSON.stringify(TABLERO_VIEJO))
    S.guardarPrefs('e1', { tablero: TABLERO_VIEJO, barra_inferior: ['gastos'] })
    await S.ESTADO_PREFS.cola.get('e1')
    chk('… y una copia vieja con barra no la vuelve a poner', !('barra_inferior' in sb.guardadas.at(-1)))
  }
  // La cuenta no contestó al abrir: la barra queda en este celular.
  {
    const S = construir()
    const sb = sbFalso({ cuenta: { v: 1 }, errorLeer: { message: 'sin red' } })
    await S.cargarPrefs({ sb, empleadoId: 'e5' })
    sb.errorLeer = null
    const r = await S.guardarBarraInferior({ empleadoId: 'e5', lista: ['caja', 'stock'] })
    chk('sin cuenta leída: no sube nada y queda en el celular', r.ok === false && r.donde === 'dispositivo' && !sb.llamadas.includes('guardar_mis_preferencias') &&
      S.leerPrefs('e5').barra_inferior.join() === 'caja,stock')
  }
  // La cuenta no contesta: queda en este celular.
  {
    const S = construir()
    const sb = sbFalso({ cuenta: { v: 1, tablero: TABLERO_VIEJO } })
    await S.cargarPrefs({ sb, empleadoId: 'e2' })
    sb.errorLeer = { message: 'sin red' }
    const r = await S.guardarBarraInferior({ empleadoId: 'e2', lista: ['caja'] })
    chk('sin leer la cuenta NO se guarda en la cuenta (no se pisa a ciegas)', r.ok === false && r.donde === 'dispositivo' && !sb.llamadas.includes('guardar_mis_preferencias'))
    chk('… pero queda en este celular', S.leerPrefs('e2').barra_inferior.join() === 'caja' && /barra_inferior/.test(S.__ls.get('sd.prefs.e2')))
    sb.errorLeer = null; sb.errorGuardar = { message: 'no' }
    const r2 = await S.guardarBarraInferior({ empleadoId: 'e2', lista: ['stock'] })
    chk('si guardar falla, también lo dice', r2.ok === false && S.leerPrefs('e2').barra_inferior.join() === 'stock')
  }
  // La cuenta nunca guardó nada: la base es lo de este dispositivo.
  {
    const S = construir()
    S.__ls.set('sd.prefs.e3', JSON.stringify({ tablero: TABLERO_VIEJO }))
    const sb = sbFalso({ cuenta: {} })
    await S.cargarPrefs({ sb, empleadoId: 'e3' })
    await S.guardarBarraInferior({ empleadoId: 'e3', lista: ['caja'] })
    const g = sb.guardadas.at(-1)
    chk('cuenta vacía: sube lo del dispositivo + la barra', JSON.stringify(g.tablero) === JSON.stringify(TABLERO_VIEJO) && g.barra_inferior.join() === 'caja')
  }
  // En la cola: espera la subida que está en camino.
  {
    const S = construir()
    const sb = sbFalso({ cuenta: { v: 1, tablero: TABLERO_VIEJO }, demoraGuardar: 30 })
    await S.cargarPrefs({ sb, empleadoId: 'e4' })
    S.guardarPrefs('e4', { tablero: TABLERO_NUEVO })
    await S.guardarBarraInferior({ empleadoId: 'e4', lista: ['caja'] })
    const g = sb.guardadas.at(-1)
    chk('va después de la subida en camino: lee el tablero que esa subió', JSON.stringify(g.tablero) === JSON.stringify(TABLERO_NUEVO) && sb.llamadas.join() === 'mis_preferencias,guardar_mis_preferencias,mis_preferencias,guardar_mis_preferencias', sb.llamadas.join())
  }
})())

// ── Instalada: la barra, el editor y el toque largo ─────────────────────────
esperas.push((async () => {
  const S = construir(); const doc = docFalso(); const win = winEn('/x/modulos/caja.html', 390)
  const sb = sbFalso({ modulos: SEIS, cuenta: { v: 1, tablero: { orden: ['caja'], tamanos: {}, ocultas: [] }, uso: { pedidos: [Date.now(), Date.now()] } } })
  const nav = await S.instalarBarraLateral({ sb, doc, win })
  await tic()
  chk('se instala', !!nav, S.__errores.map(String).join(' | '))
  const [abajo, hoja, editor] = doc.body.appended
  chk('390 px: Inicio + 4 módulos + Más', tabs(abajo.innerHTML).length === 6 && tabs(abajo.innerHTML)[0] === 'inicio' && tabs(abajo.innerHTML).at(-1) === 'mas', tabs(abajo.innerHTML).join())
  chk('sin elegir: el más usado (Pedidos) primero', tabs(abajo.innerHTML)[1] === 'pedidos', tabs(abajo.innerHTML).join())
  chk('el editor arranca escondido', editor.hidden === true && /hoja-abajo/.test(editor.className))
  // Desde "Más" → "Editar la barra de abajo".
  abajo.botones['barra-abajo-mas'].handlers[0]()
  hoja.botones['hoja-mas-editar'].handlers[0]()
  chk('"Editar" cierra "Más" y abre el editor', hoja.hidden === true && editor.hidden === false && /En la barra · 4 de 4/.test(editor.innerHTML))
  tocar(editor, 'abajo-sacar', 'pedidos')
  tocar(editor, 'abajo-sacar', 'gastos')
  tocar(editor, 'abajo-agregar', 'materia-prima')
  tocar(editor, 'abajo-subir', 'materia-prima')
  const antes = sb.guardadas.length
  chk('cambiar la lista no guarda nada todavía', sb.guardadas.length === antes && /En la barra · 3 de 4/.test(editor.innerHTML))
  tocar(editor, 'editar-abajo-guardar')
  await tic(); await tic(); await tic()
  const g = sb.guardadas.at(-1)
  chk('Guardar sube la lista en el orden elegido', sb.guardadas.length === antes + 1 && Array.isArray(g.barra_inferior) && g.barra_inferior.length === 3 && g.barra_inferior.indexOf('materia-prima') < g.barra_inferior.length - 1, JSON.stringify(g?.barra_inferior))
  chk('… sin tocar el tablero de la cuenta', JSON.stringify(g.tablero) === '{"orden":["caja"],"tamanos":{},"ocultas":[]}')
  chk('… cierra el editor y la barra muestra lo elegido', editor.hidden === true && tabs(abajo.innerHTML).slice(1, -1).join() === g.barra_inferior.join(), tabs(abajo.innerHTML).join())
  // Sin ninguno: no se guarda y se dice.
  hoja.botones['hoja-mas-editar'].handlers[0]()
  for (const c of g.barra_inferior) tocar(editor, 'abajo-sacar', c)
  const n1 = sb.guardadas.length
  tocar(editor, 'editar-abajo-guardar')
  await tic()
  chk('Guardar sin ninguno: no guarda y pide elegir', sb.guardadas.length === n1 && /Elegí al menos un módulo/.test(editor.innerHTML) && editor.hidden === false)
  // Cerrar sin guardar.
  tocar(editor, 'editar-abajo-cerrar')
  chk('la ✕ cierra sin guardar', editor.hidden === true && sb.guardadas.length === n1)
  // Volver a la automática.
  hoja.botones['hoja-mas-editar'].handlers[0]()
  tocar(editor, 'editar-abajo-auto')
  await tic(); await tic(); await tic()
  chk('"Volver a la automática" saca la clave', !('barra_inferior' in sb.guardadas.at(-1)) && tabs(abajo.innerHTML)[1] === 'pedidos')
  // El toque largo abre el editor, y ese toque no navega.
  abajo.disparar('pointerdown')
  chk('el toque largo espera', editor.hidden === true && win.relojes.length === 1)
  win.correrRelojes()
  chk('… y abre el editor', editor.hidden === false)
  let prevenido = false
  abajo.disparar('click', { preventDefault() { prevenido = true }, stopPropagation() {} })
  chk('… el click de ese toque no navega', prevenido === true)
  tocar(editor, 'editar-abajo-cerrar')
  abajo.disparar('pointerdown'); abajo.disparar('pointerup')
  win.correrRelojes()
  chk('soltar antes NO abre el editor', editor.hidden === true)
  prevenido = false
  abajo.disparar('click', { preventDefault() { prevenido = true }, stopPropagation() {} })
  chk('… y un toque común navega', prevenido === false)
  let menu = false
  abajo.disparar('contextmenu', { preventDefault() { menu = true } })
  chk('el menú del navegador del toque largo no sale', menu === true)
  // Otro ancho: entran más.
  win.innerWidth = 480
  ;(win.oyentes.resize || []).forEach(f => f())
  chk('a 480 px entran 6', tabs(abajo.innerHTML).length === 8, tabs(abajo.innerHTML).join())
  // Escape cierra el editor.
  hoja.botones['hoja-mas-editar'].handlers[0]()
  ;(doc.oyentes.keydown || []).forEach(f => f({ key: 'Escape' }))
  chk('Escape cierra el editor', editor.hidden === true)
})())

// ── El CSS ──────────────────────────────────────────────────────────────────
{
  const bloque = (/@media \(max-width: 1023\.98px\) \{[^]*?\n\}/.exec(css.slice(css.indexOf('.barra-abajo {'))) || [''])[0]
  const celu = css.slice(css.indexOf('/* CELULAR: la barra de abajo'))
  chk('la barra de abajo un poco más alta (68 px) y el body le deja lugar', /body\.con-barra-lateral \{ padding-bottom: calc\(68px/.test(celu) && /height: calc\(68px \+ env/.test(celu))
  chk('ícono en una caja de 48 × 33 y nombre de 12.5 px', /\.barra-abajo__icono \{ width: 48px; height: 33px;/.test(celu) && /\.barra-abajo__nombre \{ font-size: 12\.5px;/.test(celu))
  chk('los botones del editor de 44 px (cómodos de tocar)', /\.editar-abajo__boton \{\s*min-width: 44px; height: 44px;/.test(celu))
  chk('la variante del botón principal va DESPUÉS de su base', celu.indexOf('.hoja-mas__accion--principal') > celu.indexOf('.hoja-mas__accion {'))
  chk('al imprimir no sale el editor', /@media print \{\s*\.barra-lateral, \.barra-abajo, \.hoja-mas, \.hoja-abajo \{ display: none !important; \}/.test(css))
  chk('el editor es una hoja como "Más" (fija, encima) y se esconde con hidden', /\.hoja-mas, \.hoja-abajo \{ position: fixed; inset: 0;/.test(css) && /\.hoja-abajo\[hidden\] \{ display: none; \}/.test(css))
  void bloque
}

fin()
