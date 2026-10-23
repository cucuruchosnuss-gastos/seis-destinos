// EL ESQUELETO PAREJO (23/10/2026): ninguna pantalla de los módulos tapa las
// barras de la app, y los módulos viejos llevan el mismo encabezado que los
// nuevos.
//
// Lo que estaba mal: el wizard y los detalles de Gastos (#vista-wizard,
// #modal-detalle-gasto, #modal-detalle-factura), la ficha de una persona en
// Caja (#vista-detalle-persona) y el menú del celular de la gestión de
// producción (.pg-menu) se abrían "position: fixed; inset: 0" con un fondo
// lleno y z-index 50/60 (más que el 30 de la barra lateral): tapaban la barra
// lateral, la de arriba (fábricas y usuario) y la de abajo del celular. Y las
// barras fijas de abajo de Cobranzas y de la cartera de cheques arrancaban en
// left: 0, encima del pie de la barra lateral (la de cheques, en el celular,
// también encima de la barra de abajo).
//
// Lo que se fija acá (lo que se ve en un navegador lo fija
// e2e/54-esqueleto-parejo.spec.js):
//  1. NINGÚN módulo (menos la planta, produccion.html) tiene una regla
//     "position: fixed" a pantalla completa con fondo LLENO: eso es una
//     pantalla encima de todo. Los modales (fondo transparente u oscurecido)
//     siguen pudiendo superponerse. Excepción con motivo: la hoja de PINes.
//  2. Toda barra fija de abajo (left: 0 + bottom: 0) deja libre la barra
//     lateral en la compu y la de abajo en el celular.
//  3. Las vistas convertidas: sin fixed, scrollea la página, arrancan arriba y
//     al volver a la lista se vuelve a la misma altura (se EJECUTA el código).
//  4. El encabezado de los módulos viejos: .cab-modulo de main.css con
//     "‹ Volver", el ícono de la barra lateral (ICONOS) y el color del módulo
//     (PALETA_MODULO), sin la tarjeta vieja ni "Seis Destinos".
//  5. NINGÚN control ni id se perdió en los módulos tocados, contra un commit
//     FIJO (f32b687, el main de antes de este cambio), nunca contra HEAD.
//
//   node pruebas/test-modulos-esqueleto-parejo.js
// Overrides (para las mutaciones): ARCHIVO_<MODULO> (ARCHIVO_GASTOS,
// ARCHIVO_CAJA, ARCHIVO_PRODUCCION_GESTION, ARCHIVO_COBRANZAS, …) y
// ARCHIVO_MAIN_CSS.
'use strict'
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const { execFileSync } = require('child_process')
const { arnes, leer } = require('./circuito-comun')
const { inventario } = require('./controles-comun')

const RAIZ = path.join(__dirname, '..')
const { chk, fin } = arnes()
const BASE = 'f32b687'

const variable = (archivo) => 'ARCHIVO_' + archivo.replace(/\.html$/, '').replace(/-/g, '_').toUpperCase()
const MODULOS = fs.readdirSync(path.join(RAIZ, 'modulos')).filter(f => f.endsWith('.html') && f !== 'produccion.html').sort()
const FUENTES = {}
for (const f of MODULOS) FUENTES[f] = leer(process.env[variable(f)] || path.join(RAIZ, 'modulos', f))
const MAIN = leer(process.env.ARCHIVO_MAIN_CSS || path.join(RAIZ, 'css/main.css'))
const BARRA = fs.readFileSync(path.join(RAIZ, 'js/barra-lateral.js'), 'utf8')
const CATALOGO = fs.readFileSync(path.join(RAIZ, 'js/modulos.js'), 'utf8')

// ── Un lector de CSS chico: cada regla con su selector, su cuerpo y el @media
// que la envuelve. Sin comentarios. ──────────────────────────────────────
function reglas(css) {
  const limpio = css.replace(/\/\*[\s\S]*?\*\//g, ' ')
  const out = []
  const pila = []
  let ini = 0
  for (let i = 0; i < limpio.length; i++) {
    const c = limpio[i]
    if (c === '{') {
      const sel = limpio.slice(ini, i).trim()
      if (sel.startsWith('@')) { pila.push(sel); ini = i + 1; continue }
      const j = limpio.indexOf('}', i)
      out.push({ selector: sel.replace(/\s+/g, ' '), cuerpo: limpio.slice(i + 1, j).replace(/\s+/g, ' ').trim(), media: pila.join(' ') })
      i = j
      ini = j + 1
    } else if (c === '}') {
      pila.pop()
      ini = i + 1
    }
  }
  return out
}
const cssDe = (html) => (html.match(/<style[^>]*>[\s\S]*?<\/style>/g) || []).map(s => s.replace(/<\/?style[^>]*>/g, '')).join('\n')
const REGLAS = {}
for (const f of MODULOS) REGLAS[f] = reglas(cssDe(FUENTES[f]))
const prop = (cuerpo, nombre) => { const m = cuerpo.match(new RegExp(`(?:^|;)\\s*${nombre}\\s*:\\s*([^;]+)`)); return m ? m[1].trim() : null }
const esFija = (r) => /^fixed\b/.test(prop(r.cuerpo, 'position') || '')
const aPantallaCompleta = (r) => /^0(px)?$/.test(prop(r.cuerpo, 'inset') || '') ||
  ['top', 'right', 'bottom', 'left'].every(l => /^0(px)?$/.test(prop(r.cuerpo, l) || ''))
// Un fondo LLENO: un color sin transparencia (una variable, un hex, white…).
function fondoLleno(r) {
  const v = prop(r.cuerpo, 'background') || prop(r.cuerpo, 'background-color')
  if (!v) return false
  if (/^(none|transparent)\b/.test(v)) return false
  if (/rgba\(|hsla\(|\/\s*0?\.\d+\s*\)/.test(v)) return false
  return true
}

// ══ 1. Ninguna pantalla encima de todo ═════════════════════════════════════
// [archivo, selector, motivo]
const PANTALLAS_PERMITIDAS = [
  ['produccion-gestion.html', '.pr-hoja',
    'la hoja de PINes se muestra UNA vez para imprimir: tapa todo a propósito, para que no se salga sin imprimirla (los PINes se borran al cerrarla)'],
]
{
  const encontradas = []
  for (const f of MODULOS) {
    for (const r of REGLAS[f]) {
      if (esFija(r) && aPantallaCompleta(r) && fondoLleno(r)) encontradas.push([f, r.selector])
    }
  }
  for (const [f, sel] of encontradas) {
    const permitida = PANTALLAS_PERMITIDAS.find(p => p[0] === f && p[1] === sel)
    chk(`${f}: "${sel}" NO es una pantalla encima de todo (fixed, a pantalla completa, con fondo lleno): tiene que ser una vista dentro de la página` +
      (permitida ? ` — permitida: ${permitida[2]}` : ''), !!permitida)
  }
  for (const [f, sel] of PANTALLAS_PERMITIDAS) {
    chk(`la excepción ${f} "${sel}" todavía existe (si no, sobra en la lista)`, encontradas.some(e => e[0] === f && e[1] === sel))
  }
  chk('se revisaron todos los módulos menos la planta', MODULOS.length >= 14 && !MODULOS.includes('produccion.html') && MODULOS.includes('gastos.html'), MODULOS.length)
  // Las que eran pantallas encima de todo, nombradas.
  const ERAN = [
    ['gastos.html', '#vista-wizard:not([hidden])'],
    ['gastos.html', '#modal-detalle-gasto:not([hidden]), #modal-detalle-factura:not([hidden])'],
    ['caja.html', '#vista-detalle-persona:not([hidden])'],
    ['produccion-gestion.html', 'body.pg-menu-abierto .pg-menu'],
  ]
  for (const [f, sel] of ERAN) {
    const fijas = REGLAS[f].filter(r => r.selector === sel && esFija(r))
    chk(`${f}: "${sel}" ya no es position: fixed`, fijas.length === 0)
  }
  // Y los modales de verdad siguen superpuestos (fondo oscurecido): la
  // excepción del pedido ("los modales chicos pueden quedar superpuestos").
  const anular = REGLAS['gastos.html'].find(r => r.selector === '#modal-anular-gasto')
  chk('gastos: el modal de anular sigue siendo un modal (fixed, encima)', !!anular && esFija(anular))
}

// ══ 2. Las barras fijas de abajo dejan libres las de la app ════════════════
// [archivo, selector de la barra, ¿también en la compu?]
const BARRAS_FIJAS = [
  ['cobranzas.html', '.cob-barra-fija', true],
  ['administracion.html', '.chq-barra', true],
  ['retiros.html', '.rt-editor .rt-accion', false],
]
{
  for (const f of MODULOS) {
    for (const r of REGLAS[f]) {
      if (!esFija(r) || aPantallaCompleta(r)) continue
      if (!/^0(px)?$/.test(prop(r.cuerpo, 'bottom') || '') || !/^0(px)?$/.test(prop(r.cuerpo, 'left') || '')) continue
      chk(`${f}: la barra fija de abajo "${r.selector}" está revisada (deja libres las barras de la app)`,
        BARRAS_FIJAS.some(b => b[0] === f && b[1] === r.selector))
    }
  }
  for (const [f, sel, compu] of BARRAS_FIJAS) {
    const rs = REGLAS[f]
    const enCelular = rs.find(r => r.selector === `body.con-barra-lateral ${sel}` && /max-width:\s*1023\.98px/.test(r.media))
    chk(`${f}: en el celular "${sel}" va arriba de la barra de abajo (68 px)`,
      !!enCelular && /^calc\(68px/.test(prop(enCelular.cuerpo, 'bottom') || ''), enCelular && enCelular.cuerpo)
    if (compu) {
      const enCompu = rs.find(r => r.selector === `body.con-barra-lateral ${sel}` && /min-width:\s*1024px/.test(r.media))
      chk(`${f}: en la compu "${sel}" arranca después de la barra lateral`,
        !!enCompu && /^var\(--ancho-barra-lateral/.test(prop(enCompu.cuerpo, 'left') || ''), enCompu && enCompu.cuerpo)
    }
  }
}

// ══ 3. Las vistas convertidas ══════════════════════════════════════════════
const G = FUENTES['gastos.html']
const C = FUENTES['caja.html']
const PG = FUENTES['produccion-gestion.html']
{
  const rs = REGLAS['gastos.html']
  const vista = rs.find(r => r.selector === '#vista-wizard:not([hidden]), .vista-en-pagina:not([hidden])')
  chk('gastos: el wizard y los detalles ocupan el lugar de la lista (flex, sin fixed, con el ancho de la lista)',
    !!vista && !esFija(vista) && prop(vista.cuerpo, 'max-width') === '1120px' && !prop(vista.cuerpo, 'z-index'), vista && vista.cuerpo)
  chk('gastos: los dos detalles llevan la clase de vista dentro de la página',
    /<div id="modal-detalle-gasto" class="vista-en-pagina" hidden>/.test(G) && /<div id="modal-detalle-factura" class="vista-en-pagina" hidden>/.test(G))
  const paso = rs.find(r => r.selector === '.paso')
  const cont = rs.find(r => r.selector === '.paso__contenido')
  chk('gastos: los pasos del wizard no tienen scroll propio (scrollea la página)',
    !!paso && !!cont && !/overflow/.test(paso.cuerpo) && !/overflow/.test(cont.cuerpo), `${paso && paso.cuerpo} | ${cont && cont.cuerpo}`)

  // EJECUTAR la altura de la lista: entrar, re-entrar desde un detalle, volver.
  const ini = G.indexOf('    const alturaDeLaLista = { y: 0 }')
  const finF = G.indexOf('    async function abrirWizard()')
  chk('gastos: se encontraron las funciones de la altura de la lista', ini !== -1 && finF > ini)
  if (ini !== -1 && finF > ini) {
    const lista = { hidden: false }
    const llamadas = []
    const ctx = {
      document: { getElementById: (id) => (id === 'vista-lista' ? lista : { hidden: true }) },
      window: { scrollY: 500, scrollTo: (x, y) => { llamadas.push(y); ctx.window.scrollY = y } },
    }
    vm.createContext(ctx)
    vm.runInContext(G.slice(ini, finF) + '\n;this.f = { entrarAVista, arribaDeLaVista, volverALaLista }', ctx)
    const { entrarAVista, arribaDeLaVista, volverALaLista } = ctx.f
    entrarAVista(); lista.hidden = true; arribaDeLaVista()
    chk('gastos: al abrir una vista, la página arranca arriba', llamadas.at(-1) === 0, llamadas.join(','))
    ctx.window.scrollY = 120
    entrarAVista()  // otra vista abierta encima (la lista ya está escondida): no pisa la altura
    lista.hidden = false; volverALaLista()
    chk('gastos: al volver a la lista, vuelve a la altura donde estaba (y no a la de la vista)', llamadas.at(-1) === 500, llamadas.join(','))
  }
  // Cada apertura y cada cierre usa las funciones, en el orden que importa.
  const cuerpoDe = (fuente, firma) => {
    const i = fuente.indexOf(firma)
    if (i === -1) return ''
    const j = fuente.indexOf('\n    }\n', i)
    return fuente.slice(i, j)
  }
  const orden = (txt, ...partes) => { let k = -1; for (const p of partes) { const n = txt.indexOf(p, k + 1); if (n === -1 || n < k) return false; k = n } return true }
  const aw = cuerpoDe(G, '    async function abrirWizard()')
  chk('gastos: abrir el wizard anota la altura ANTES de esconder la lista y después va arriba',
    orden(aw, 'entrarAVista()', "getElementById('vista-lista').hidden = true", "getElementById('vista-wizard').removeAttribute('hidden')", 'arribaDeLaVista()'), aw)
  chk('gastos: cerrar el wizard vuelve a la altura de la lista', /volverALaLista\(\)/.test(cuerpoDe(G, '    function cerrarWizard()')))
  chk('gastos: abrir el detalle de un gasto: altura, lista escondida, arriba',
    /entrarAVista\(\)\n      document\.getElementById\('vista-lista'\)\.hidden = true\n      document\.getElementById\('modal-detalle-gasto'\)\.removeAttribute\('hidden'\)\n      arribaDeLaVista\(\)/.test(G))
  chk('gastos: abrir el detalle de una factura: altura, lista escondida, arriba',
    /entrarAVista\(\)\n      document\.getElementById\('vista-lista'\)\.hidden = true\n      document\.getElementById\('modal-detalle-factura'\)\.removeAttribute\('hidden'\)\n      arribaDeLaVista\(\)/.test(G))
  chk('gastos: cerrar los detalles vuelve a la altura de la lista',
    /volverALaLista\(\)/.test(cuerpoDe(G, '    function cerrarDetalleGasto()')) && /volverALaLista\(\)/.test(cuerpoDe(G, '    function cerrarDetalleFactura()')))

  // Caja
  const ficha = REGLAS['caja.html'].find(r => r.selector === '#vista-detalle-persona:not([hidden])')
  chk('caja: la ficha es una vista dentro de la página (sin fixed ni z-index)', !!ficha && !esFija(ficha) && !prop(ficha.cuerpo, 'z-index'), ficha && ficha.cuerpo)
  const ad = cuerpoDe(C, '    async function abrirDetallePersona(')
  chk('caja: abrir la ficha anota la altura del listado (si está a la vista) ANTES de esconderlo, y va arriba',
    orden(ad, "if (!document.getElementById('vista-lista-caja').hidden) scrollDelListado = window.scrollY || 0",
      "getElementById('vista-lista-caja').hidden = true", "getElementById('vista-detalle-persona').removeAttribute('hidden')", 'window.scrollTo(0, 0)'), ad.slice(0, 900))
  chk('caja: cerrar la ficha vuelve a la altura del listado', /window\.scrollTo\(0, scrollDelListado\)/.test(cuerpoDe(C, '    function cerrarDetallePersona()')))
  chk('caja: la altura se declara una vez, antes de init()', (C.match(/let scrollDelListado = 0/g) || []).length === 1 &&
    C.indexOf('let scrollDelListado = 0') < C.lastIndexOf('\n    init()'))

  // La gestión de producción: el menú del celular
  const rs2 = REGLAS['produccion-gestion.html']
  const menu = rs2.find(r => r.selector === 'body.pg-menu-abierto .pg-menu' && /max-width:\s*899px/.test(r.media))
  chk('gestión: en el celular el menú abierto va dentro de la página (sin fixed ni z-index)', !!menu && !esFija(menu) && !prop(menu.cuerpo, 'z-index') && prop(menu.cuerpo, 'display') === 'flex', menu && menu.cuerpo)
  const sinCont = rs2.find(r => r.selector === 'body.pg-menu-abierto .pg-contenido' && /max-width:\s*899px/.test(r.media))
  chk('gestión: con el menú abierto el contenido se esconde (el menú ocupa su lugar)', !!sinCont && prop(sinCont.cuerpo, 'display') === 'none')
  chk('gestión: la página NO queda trabada con el menú abierto (sin overflow: hidden en el body)',
    !rs2.some(r => r.selector === 'body.pg-menu-abierto' && /overflow/.test(r.cuerpo)))
  chk('gestión: abrir el menú lo muestra desde arriba',
    /document\.getElementById\('pr-btn-menu'\)\.setAttribute\('aria-expanded', 'true'\)\n[^\n]*\n      window\.scrollTo\(0, 0\)\n      document\.getElementById\('pr-menu-cerrar'\)\.focus/.test(PG))
}

// ══ 4. El encabezado de los módulos viejos ═════════════════════════════════
const ICONOS = {}
for (const m of BARRA.matchAll(/^\s+'?([a-z-]+)'?: '(M[^']+)',$/gm)) ICONOS[m[1]] = m[2]
const PALETA = {}
for (const m of CATALOGO.matchAll(/^\s+'?([a-z-]+)'?: \[([\d.]+), ([\d.]+), (\d+)\],?$/gm)) PALETA[m[1]] = [Number(m[2]), Number(m[3]), Number(m[4])]
chk('se leyeron los íconos de la barra lateral y la paleta de los módulos', Object.keys(ICONOS).length >= 15 && Object.keys(PALETA).length >= 15)
// [archivo, clave del catálogo, título]
const VIEJOS = [
  ['gastos.html', 'gastos', 'Gastos'], ['caja.html', 'caja', 'Caja'], ['cobranzas.html', 'cobranzas', 'Cobranzas'],
  ['cuentas-corrientes.html', 'cuentas-corrientes', 'Cuentas corrientes'], ['materia-prima.html', 'materia-prima', 'Ingreso'],
  ['stock.html', 'stock', 'Stock'], ['pedidos.html', 'pedidos', 'Pedidos'], ['conos.html', 'conos', 'Conos de papel'],
  ['accesos.html', 'accesos', 'Accesos'], ['empleados.html', 'empleados', 'Empleados'],
]
const num = (s) => Number(s)
for (const [f, clave, titulo] of VIEJOS) {
  const src = FUENTES[f]
  const cuerpo = src.slice(src.indexOf('<body'))
  const cab = (cuerpo.match(/<header\b[^>]*>[\s\S]*?<\/header>/) || [''])[0]
  chk(`${f}: el primer encabezado es el de los módulos (<header class="cab-modulo">)`, /^<header class="cab-modulo">/.test(cab), cab.slice(0, 120))
  chk(`${f}: lleva "‹ Volver" al inicio`, /<a href="\.\.\/dashboard\.html" class="cab-modulo__volver[^"]*" title="Volver al dashboard">(‹|&lsaquo;) Volver<\/a>/.test(cab))
  const d = (cab.match(/<span class="cab-modulo__icono" aria-hidden="true"><svg [^>]*><path d="([^"]+)"\/><\/svg><\/span>/) || [])[1]
  chk(`${f}: el ícono es el de la barra lateral (${clave})`, !!d && d === ICONOS[clave], d)
  chk(`${f}: el título dice "${titulo}"`, cab.includes(`<span class="cab-modulo__titulo">${titulo}</span>`))
  chk(`${f}: sin "Seis Destinos" ni la tarjeta vieja en el encabezado`, !/Seis Destinos|__marca-texto|__logo|box-shadow/.test(cab))
  // Todos los encabezados de vistas de adentro, también con su Volver e ícono.
  const todos = cuerpo.match(/<header class="cab-modulo">[\s\S]*?<\/header>/g) || []
  chk(`${f}: cada encabezado de los módulos tiene su Volver, el ícono y el título`,
    todos.length >= 1 && todos.every(h => /class="cab-modulo__volver[^"]*"/.test(h) && /class="cab-modulo__titulo"/.test(h) &&
      h.includes(`<span class="cab-modulo__icono" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${ICONOS[clave]}"/></svg></span>`)), todos.length)
  // El color del módulo (el de PALETA_MODULO, con la cuenta de colorDeModulo()).
  const regla = REGLAS[f].find(r => r.selector === '.cab-modulo' && !r.media)
  const m = regla && regla.cuerpo.match(/--cab-modulo:\s*oklch\(([\d.]+) ([\d.]+) (\d+)\);\s*--cab-modulo-suave:\s*oklch\(0\.955 ([\d.]+) (\d+)\)/)
  const p = PALETA[clave]
  chk(`${f}: el color del encabezado es el del módulo (PALETA_MODULO '${clave}')`,
    !!m && !!p && num(m[1]) === p[0] && num(m[2]) === p[1] && num(m[3]) === p[2] && num(m[5]) === p[2] &&
    m[4] === Math.max(p[1] * 0.28, 0.008).toFixed(3), regla && regla.cuerpo)
  // Nada viejo quedó colgado: ni el header con estilo en línea pegajoso.
  chk(`${f}: no quedó la barra pegajosa vieja con blur`, !/<header style="position:sticky/.test(src))
}
// main.css
{
  const R = reglas(MAIN)
  const base = R.find(r => r.selector === '.cab-modulo' && !r.media)
  chk('main.css: .cab-modulo es una fila sin tarjeta, sin fondo y sin z-index (nunca tapa nada)',
    !!base && prop(base.cuerpo, 'display') === 'flex' && !prop(base.cuerpo, 'box-shadow') && !prop(base.cuerpo, 'background') && !prop(base.cuerpo, 'z-index') && !prop(base.cuerpo, 'position'), base && base.cuerpo)
  const volver = R.find(r => r.selector === '.cab-modulo__volver' && !r.media)
  chk('main.css: el "‹ Volver" es un botón de 40 px, cómodo de tocar', !!volver && prop(volver.cuerpo, 'min-height') === '40px')
  const titulo = R.find(r => r.selector === '.cab-modulo__titulo' && !r.media)
  chk('main.css: el título en la letra de títulos (Bricolage)', !!titulo && prop(titulo.cuerpo, 'font-family') === 'var(--fuente-titulo)')
  const icono = R.find(r => r.selector === '.cab-modulo__icono' && !r.media)
  chk('main.css: el ícono con el color del módulo sobre su fondo suave',
    !!icono && prop(icono.cuerpo, 'background') === 'var(--cab-modulo-suave)' && prop(icono.cuerpo, 'color') === 'var(--cab-modulo)')
  const cel = R.find(r => r.selector === '.cab-modulo' && /max-width:\s*1023\.98px/.test(r.media))
  chk('main.css: en el celular, una franja blanca de lado a lado',
    !!cel && prop(cel.cuerpo, 'margin-left') === 'calc(50% - 50vw)' && prop(cel.cuerpo, 'margin-right') === 'calc(50% - 50vw)' &&
    prop(cel.cuerpo, 'background') === 'var(--color-fondo)', cel && cel.cuerpo)
  const sub = R.find(r => r.selector === '.cab-modulo__sub:empty')
  chk('main.css: una vista sin nombre no deja la barra "/" sola', !!sub && prop(sub.cuerpo, 'display') === 'none')
}

// ══ 5. Ningún control ni id se perdió (contra el commit fijo) ═════════════
const TOCADOS = ['gastos.html', 'caja.html', 'cobranzas.html', 'conos.html', 'pedidos.html', 'stock.html', 'materia-prima.html',
  'cuentas-corrientes.html', 'accesos.html', 'empleados.html', 'produccion-gestion.html', 'administracion.html']
for (const f of TOCADOS) {
  let viejo = null
  try {
    viejo = execFileSync('git', ['show', `${BASE}:modulos/${f}`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] })
  } catch { /* sin historia */ }
  chk(`${f}: se leyó el commit fijo ${BASE}`, !!viejo)
  if (!viejo) continue
  const antes = inventario(viejo)
  const ahora = inventario(FUENTES[f])
  const faltan = []
  for (const [k, n] of antes.cuenta) {
    if (!k.startsWith('control:') && !k.startsWith('id:')) continue
    if ((ahora.cuenta.get(k) || 0) < n) faltan.push(`${k} (${ahora.cuenta.get(k) || 0} de ${n})`)
  }
  chk(`${f}: ningún control ni id se perdió`, faltan.length === 0, faltan.join(' · '))
}

fin()
