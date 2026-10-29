// Stock con dos entradas (14/10/2026, pedido del 13/10, paso 4): al entrar a
// Stock, "Producto terminado" (desde el 23/10/2026 la vista #vista-terminado de
// Stock; antes, la gestión de Producción) e "Insumos y materias primas" (la
// pantalla de siempre). Cada una con su
// permiso; con una sola, derecho; sin ninguna, el aviso. ?vista=terminado e
// ?vista=insumos saltean la elección. En la gestión, ?vista=stock&desde=stock
// dice "‹ Stock" y vuelve; con stock:ver y sin Producción entra "solo stock".
// init() de Stock se EJECUTA con todo lo de alrededor de mentira.
//
//   node pruebas/test-stock-entrada.js
//   ARCHIVO_TEST=<copia de stock.html> ARCHIVO_GESTION=<copia de la gestión> node pruebas/test-stock-entrada.js
'use strict'

const path = require('path')
const fs = require('fs')
const { construirCon } = require('./sandbox')
const { arnes, leer } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos', 'stock.html')
const GESTION = process.env.ARCHIVO_GESTION || path.join(__dirname, '..', 'modulos', 'produccion-gestion.html')
leer(ARCHIVO)
console.log(`ARCHIVO ${GESTION} (${fs.readFileSync(GESTION, 'utf8').length} bytes)`)
const HTML = fs.readFileSync(ARCHIVO, 'utf8')
const HTML_GESTION = fs.readFileSync(GESTION, 'utf8')
const TABLERO = fs.readFileSync(path.join(__dirname, '..', 'js', 'tablero.js'), 'utf8')
const { chk, fin } = arnes()

// ── Stock: lo de alrededor de init(), de mentira ──────────────────────────
const PRELUDIO = `
  var console = { log(){}, warn(){}, error(){} }
  var __llamadas = []
  var __els = new Map()
  function __el(id) {
    if (!__els.has(id)) __els.set(id, { id, hidden: true, textContent: '', dataset: {}, classList: { toggle(){}, add(){}, remove(){} } })
    return __els.get(id)
  }
  var __pestanas = ['stock', 'catalogo', 'recuento', 'costos'].map(v => ({ dataset: { vista: v }, hidden: true, classList: { toggle(){}, add(){}, remove(){} } }))
  var __clasesBody = new Set()
  var document = {
    body: { classList: { add(c) { __clasesBody.add(c) }, remove(c) { __clasesBody.delete(c) }, contains(c) { return __clasesBody.has(c) } } },
    getElementById: __el,
    querySelector: (s) => __el(s),
    querySelectorAll: (s) => s === '.pestana-stock' ? __pestanas : [],
  }
  var __busqueda = ''
  var __reemplazo = null
  var window = { scrollTo(){}, location: { get search() { return __busqueda }, pathname: '/modulos/stock.html', hash: '', replace(u) { __reemplazo = u } } }
  var history = { state: null, replaceState(s, t, u) { __llamadas.push(['replaceState', u]) } }
  function setTimeout() {}
  var __tareas = []
  var __rol = 'usuario'
  async function verificarSesion() { return { user: { id: 'auth-1' } } }
  async function cargarFabricaDePruebas() { return { ok: true, unidades: new Set(), personas: new Set(), soyDePrueba: false } }
  async function unidadesDeLaBarra() { return null }
  function aplicarEstadoBarra() {}
  function alCambiarUnidad() {}
  function alCambiarBarra() {}
  function mostrarError(m) { __llamadas.push(['error', m]) }
  var supabase = {
    from(t) {
      const q = {
        select() { return q }, eq() { return q }, in(c, v) { if (t === 'empleado_tareas') __llamadas.push(['modulos', v]); return q }, order() { return q },
        maybeSingle() { return Promise.resolve({ data: { id: 'emp-1', rol_app: __rol }, error: null }) },
        then(res) { return Promise.resolve({ data: t === 'empleado_tareas' ? __tareas : [], error: null }).then(res) },
      }
      return q
    },
  }
  const anotar = (n) => async () => { __llamadas.push([n]) }
  // "Mandar a otra empresa del grupo" (26/10/2026): lo prueba test-stock-mandar-grupo.js.
  function pintarMandarGrupo() { __llamadas.push(['pintarMandarGrupo']) }
  var cargarStock = anotar('cargarStock'), cargarInsumos = anotar('cargarInsumos'), cargarRecuento = anotar('cargarRecuento')
  var cargarUnidadesRecuento = async () => { __llamadas.push(['cargarUnidadesRecuento']) }
  var cargarUnidadesBaja = anotar('cargarUnidadesBaja'), cargarUnidadesEnvio = anotar('cargarUnidadesEnvio'), cargarDestinos = anotar('cargarDestinos')
  var cargarCostos = anotar('cargarCostos'), cargarPendientesStock = () => {}, iniciarActualizacionSola = () => {}
  // "En camino desde otra empresa" (29/10/2026): lo prueba test-stock-en-camino.js.
  var cargarEnCamino = anotar('cargarEnCamino')
  function aplicarFiltroDesdeUrl() {}
  function puedeTraspasar() { return false }
  function puedeVerCostosAlgo() { return true }
  function puedeDarBaja() { return tieneTarea('stock', 'dar_baja') }
  function abrirTraspaso() { __llamadas.push(['abrirTraspaso']) }
  // La vista de producto terminado (23/10/2026): la de verdad la prueba
  // test-stock-terminado.js; acá alcanza con saber que se abre.
  async function abrirTerminado() { __llamadas.push(['abrirTerminado']); if (estado.enEleccion) salirDeEleccion(); mostrarVista('terminado') }
  var estado = {
    sesion: null, miRolApp: 'usuario', misTareas: new Set(), alcancesTareas: new Map(), vista: 'stock',
    barraLista: Promise.resolve(), fabrica: null, cargados: new Set(),
  }
`
const FUNCIONES = ['tieneTarea', 'vistaDesdeUrl', 'mostrarVista', 'puedeVerTerminado', 'decidirEntrada', 'entradaPedida', 'urlTerminado', 'camino', 'recibeEnAlgunaFabrica',
  'mostrarEleccion', 'salirDeEleccion', 'elegirInsumos', 'alVolverDelEncabezado', 'init']
const CONSTANTES = ['puedeVerStock', 'puedeAjustar', 'puedeEnviar', 'puedeGestionar', 'VISTAS_DESDE_URL', 'PESTANA_DE_VISTA', 'SUBTITULO_VISTA', 'VISTAS_DE_INSUMOS']

function sandbox() {
  return construirCon(ARCHIVO, {
    preludio: PRELUDIO, funciones: FUNCIONES, constantes: CONSTANTES,
    retorno: `estado, __els, __llamadas, __clasesBody, __reemplazo: () => __reemplazo, __setTareas(t){ __tareas = t }, __setRol(r){ __rol = r }, __setBusqueda(s){ __busqueda = s }, __abrirTerminado: () => abrirTerminado()`,
  })
}

const VER = { modulo: 'stock', tarea: 'ver', alcance: { todas: true } }
const CATALOGO = { modulo: 'stock', tarea: 'gestionar_catalogo', alcance: null }
const PROD_VER = { modulo: 'produccion', tarea: 'ver', alcance: { todas: true } }

async function correr(tareas, busqueda = '', rol = 'usuario') {
  const S = sandbox()
  S.__setTareas(tareas)
  S.__setBusqueda(busqueda)
  S.__setRol(rol)
  await S.init()
  return S
}
const enEleccion = (S) => S.__els.get('stock-eleccion')?.hidden === false && S.__clasesBody.has('stock-en-eleccion')

// ── Gestión: las piezas de "desde Stock" ──────────────────────────────────
const PRELUDIO_G = `
  var console = { log(){}, warn(){}, error(){} }
  var __els = new Map()
  var __abrioMenu = 0
  function __el(id) {
    if (!__els.has(id)) {
      const clases = new Set(id === 'pr-stock-volver' ? ['pr-btn', 'pg-volver-menu'] : [])
      __els.set(id, { id, hidden: true, textContent: id === 'pr-stock-volver' ? '‹ Menú' : '', __clases: clases, classList: { add(c) { clases.add(c) }, remove(c) { clases.delete(c) }, contains(c) { return clases.has(c) } } })
    }
    return __els.get(id)
  }
  var document = { getElementById: __el, querySelectorAll: () => [], body: { classList: { add(){}, remove(){} } } }
  var __ir = null
  var window = { location: { set href(u) { __ir = u }, get href() { return '' } } }
  function abrirMenu() { __abrioMenu++ }
  function puedeVerHistorial() { return true }
  function tieneTarea() { return true }
  function unidadesCon() { return ['u-prod'] }
  var estado = { miRolApp: 'usuario', stockVer: { unidades: ['u-n'] }, unidades: new Map([['u-n', 'Nuss'], ['u-d', 'Dolce Pasta'], ['u-prod', 'Mengui']]) }
`
function sandboxG() {
  return construirCon(GESTION, {
    preludio: PRELUDIO_G,
    funciones: ['leerParametrosEntrada', 'destinoVolverStock', 'pintarVolverStock', 'alVolverDelStock', 'puedeVerStockEn', 'unidadesDeHistorial', 'pintarAccesosOficina'],
    retorno: 'estado, __els, __ir: () => __ir, __abrioMenu: () => __abrioMenu',
  })
}

;(async () => {
  // ── Los cuatro casos de permisos ──────────────────────────────────────
  {
    const S = await correr([VER])
    chk('con stock:ver (ve las dos cosas) muestra la elección', enEleccion(S))
    chk('… y lee también las tareas de producción', S.__llamadas.some(l => l[0] === 'modulos' && l[1].includes('produccion')))
    chk('… y la pantalla de insumos se carga abajo (para entrar sin esperar)', S.__llamadas.some(l => l[0] === 'cargarStock'))
    chk('… sin ir a ningún lado', S.__reemplazo() === null)
    chk('… sin el aviso de sin acceso', S.__els.get('sin-acceso')?.hidden !== false)
    chk('… y dice "Elegí qué mirar"', S.__els.get('stock-subtitulo')?.textContent === 'Elegí qué mirar')
  }
  {
    const S = await correr([CATALOGO])
    chk('solo insumos (el catálogo, sin stock:ver ni Producción): derecho a los insumos, sin elección', !enEleccion(S) && S.estado.vista === 'catalogo', S.estado.vista)
    chk('… sin ir a la gestión', S.__reemplazo() === null)
  }
  {
    const S = await correr([PROD_VER])
    // 23/10/2026: el producto terminado es una vista de Stock, ya no la gestión.
    chk('solo producto terminado (Producción, sin nada de stock): la vista de producto terminado de acá', S.__llamadas.some(l => l[0] === 'abrirTerminado') && S.estado.vista === 'terminado', S.estado.vista)
    chk('… sin ir a ningún lado', S.__reemplazo() === null, S.__reemplazo())
    chk('… sin la elección ni el aviso', !enEleccion(S) && S.__els.get('sin-acceso')?.hidden !== false)
    chk('… sin pestañas', S.__els.get('pestanas-stock')?.hidden === true)
    chk('… y no carga nada de insumos', !S.__llamadas.some(l => ['cargarStock', 'cargarInsumos', 'cargarUnidadesRecuento', 'cargarCostos', 'cargarUnidadesBaja'].includes(l[0])))
    chk('… y abre el terminado UNA vez', S.__llamadas.filter(l => l[0] === 'abrirTerminado').length === 1)
    chk('… y "‹ Volver" va al inicio (no hay elección)', (() => { let p = false; S.alVolverDelEncabezado({ preventDefault() { p = true } }); return !p })())
    chk('… con el link a la gestión de Producción, con &desde=stock', S.__els.get('ptm-link-gestion')?.href === 'produccion-gestion.html?vista=stock&desde=stock', S.__els.get('ptm-link-gestion')?.href)
  }
  {
    const S = await correr([{ modulo: 'stock', tarea: 'cargar_costos', alcance: { todas: true } }])
    chk('sin ninguna de las dos: el aviso de siempre', S.__els.get('sin-acceso')?.hidden === false && !enEleccion(S) && S.__reemplazo() === null)
  }
  {
    const S = await correr([CATALOGO, PROD_VER])
    chk('el catálogo + Producción: elección', enEleccion(S))
  }
  {
    const S = await correr([], '', 'super_admin')
    chk('un super_admin ve la elección', enEleccion(S))
  }

  // ── ?vista= ────────────────────────────────────────────────────────────
  {
    const S = await correr([VER], '?vista=insumos')
    chk('?vista=insumos saltea la elección y abre el stock', !enEleccion(S) && S.estado.vista === 'stock' && S.__reemplazo() === null)
  }
  {
    const S = await correr([VER], '?vista=terminado')
    chk('?vista=terminado abre el producto terminado de acá, sin elección', S.__reemplazo() === null && S.estado.vista === 'terminado' && !enEleccion(S), S.estado.vista)
    chk('… y los insumos se cargan igual abajo (para "Insumos" desde la elección)', S.__llamadas.some(l => l[0] === 'cargarStock'))
    chk('… y ?vista=terminado se queda en la dirección (recargar vuelve al terminado)', !S.__llamadas.some(l => l[0] === 'replaceState'))
    let prevenido = false
    S.alVolverDelEncabezado({ preventDefault() { prevenido = true } })
    chk('… y "‹ Volver" lleva a la elección, sin navegar', prevenido && enEleccion(S))
    S.elegirInsumos()
    chk('… y desde ahí "Insumos" abre el stock de insumos (no el terminado)', !enEleccion(S) && S.estado.vista === 'stock', S.estado.vista)
  }
  {
    const S = await correr([VER])
    // La elección → "Producto terminado" → "‹ Volver" → "Insumos".
    S.__abrirTerminado()
    chk('"Producto terminado" en la elección abre la vista y saca la elección', S.estado.vista === 'terminado' && !enEleccion(S))
    S.alVolverDelEncabezado({ preventDefault() {} })
    S.elegirInsumos()
    chk('"Insumos" después del terminado vuelve a la vista de insumos con la que se entró', S.estado.vista === 'stock', S.estado.vista)
  }
  {
    const S = await correr([CATALOGO], '?vista=terminado')
    chk('?vista=terminado sin poder ver el terminado: los insumos', S.__reemplazo() === null && S.estado.vista === 'catalogo' && !enEleccion(S))
  }
  {
    const S = await correr([PROD_VER], '?vista=insumos')
    chk('?vista=insumos sin poder ver insumos: el terminado (de acá)', S.__reemplazo() === null && S.estado.vista === 'terminado', S.estado.vista)
  }
  {
    const S = await correr([VER, CATALOGO], '?vista=catalogo')
    chk('?vista=catalogo (el link del tablero) sigue salteando la elección', !enEleccion(S) && S.estado.vista === 'catalogo')
  }

  // ── Volver a la elección sin recargar ──────────────────────────────────
  {
    const S = await correr([VER])
    S.salirDeEleccion()
    chk('"Insumos y materias primas" saca la elección', !enEleccion(S) && S.__els.get('stock-eleccion').hidden === true)
    chk('… y le saca la clase al body (si no, las vistas siguen escondidas)', !S.__clasesBody.has('stock-en-eleccion'))
    chk('… y repone el subtítulo de la vista', S.__els.get('stock-subtitulo').textContent === S.SUBTITULO_VISTA?.[S.estado.vista] || S.__els.get('stock-subtitulo').textContent !== 'Elegí qué mirar')
    let prevenido = false
    S.alVolverDelEncabezado({ preventDefault() { prevenido = true } })
    chk('"‹ Volver" desde los insumos vuelve a la elección, sin navegar', prevenido && enEleccion(S))
    prevenido = false
    S.alVolverDelEncabezado({ preventDefault() { prevenido = true } })
    chk('"‹ Volver" en la elección va al inicio (no se previene)', !prevenido)
  }
  {
    const S = await correr([CATALOGO])
    let prevenido = false
    S.alVolverDelEncabezado({ preventDefault() { prevenido = true } })
    chk('sin elección, "‹ Volver" va al inicio como siempre', !prevenido)
  }

  // ── El HTML ────────────────────────────────────────────────────────────
  chk('el botón "Producto terminado" es un botón de acá (ya no un link a la gestión)', /<button type="button" class="stock-eleccion__opcion" id="btn-entrada-terminado">/.test(HTML) && !/id="btn-entrada-terminado" href=/.test(HTML))
  chk('la vista de producto terminado tiene el link a la gestión con &desde=stock', /id="ptm-link-gestion" href="produccion-gestion\.html\?vista=stock&amp;desde=stock"/.test(HTML))
  chk('el botón "Insumos y materias primas" existe', /id="btn-entrada-insumos"/.test(HTML))
  chk('los listeners están conectados', /getElementById\('btn-entrada-insumos'\)\.addEventListener\('click', elegirInsumos\)/.test(HTML) &&
    /getElementById\('btn-entrada-terminado'\)\.addEventListener\('click', \(\) => abrirTerminado\(\)\)/.test(HTML) &&
    /querySelector\('\.stock-header__volver'\)\.addEventListener\('click', alVolverDelEncabezado\)/.test(HTML))
  chk('en el celular una arriba de la otra, en la compu lado a lado', /\.stock-eleccion \{[^}]*grid-template-columns: 1fr;/.test(HTML) && /@media \(min-width: 640px\) \{\s*\.stock-eleccion \{ grid-template-columns: 1fr 1fr; \}/.test(HTML))
  chk('en la elección no se ven las vistas, las pestañas ni "Actualizado"', /body\.stock-en-eleccion \.vista-stock,\s*body\.stock-en-eleccion \.pestanas-stock,\s*body\.stock-en-eleccion \.stock-actualizado \{ display: none !important; \}/.test(HTML))
  chk('el tablero manda "recuento abierto" a ?vista=insumos', /'stock:recuento_abierto':[^\n]*url: 'modulos\/stock\.html\?vista=insumos'/.test(TABLERO))
  chk('el tablero manda "lotes sin ingreso" a ?vista=insumos', /'stock:lotes_sin_ingreso':[^\n]*url: 'modulos\/stock\.html\?vista=insumos'/.test(TABLERO))

  // ── La gestión ─────────────────────────────────────────────────────────
  {
    const G = sandboxG()
    chk('lee ?vista=stock&desde=stock', JSON.stringify(G.leerParametrosEntrada('?vista=stock&desde=stock')) === '{"vista":"stock","desdeStock":true}')
    chk('sin desde, desdeStock en false', G.leerParametrosEntrada('?vista=stock').desdeStock === false)
    chk('desde Stock: "‹ Stock" a stock.html', JSON.stringify(G.destinoVolverStock({ desdeStock: true, soloStock: false })) === '{"texto":"‹ Stock","url":"stock.html"}')
    chk('solo stock sin desde: "‹ Inicio" al inicio (no a Stock, que rebotaría)', G.destinoVolverStock({ desdeStock: false, soloStock: true })?.url === '../dashboard.html')
    chk('sin nada: el menú de siempre', G.destinoVolverStock({ desdeStock: false, soloStock: false }) === null)

    G.estado.desdeStock = true
    G.pintarVolverStock()
    const btn = G.__els.get('pr-stock-volver')
    chk('el botón dice "‹ Stock"', btn.textContent === '‹ Stock')
    chk('… y se ve también en la compu (sin pg-volver-menu)', !btn.classList.contains('pg-volver-menu'))
    G.alVolverDelStock()
    chk('… y vuelve a stock.html', G.__ir() === 'stock.html' && G.__abrioMenu() === 0)
  }
  {
    const G = sandboxG()
    G.pintarVolverStock()
    G.alVolverDelStock()
    chk('sin venir de Stock, "‹ Menú" abre el menú como siempre', G.__abrioMenu() === 1 && G.__ir() === null && G.__els.get('pr-stock-volver').textContent === '‹ Menú')
    chk('… y las unidades son las de Producción', JSON.stringify(G.unidadesDeHistorial()) === '["u-prod"]')
  }
  {
    const G = sandboxG()
    G.estado.soloStock = true
    chk('solo stock: las unidades son las de stock:ver', JSON.stringify(G.unidadesDeHistorial()) === '["u-n"]', JSON.stringify(G.unidadesDeHistorial()))
    G.pintarAccesosOficina()
    chk('solo stock: sin menú', G.__els.get('pr-menu').hidden === true && G.__els.get('pr-menu-tabla')?.hidden !== false)
  }
  chk('la gestión entra en "solo stock" solo sin Producción y pidiendo el stock', /if \(!puedeVerGestion\(\) && entradaUrl\.vista === 'stock'\) \{\s*await cargarPermisoStock\(\)\s*estado\.soloStock = \[\.\.\.estado\.unidades\.keys\(\)\]\.some\(id => puedeVerStockEn\(id\) === true\)/.test(HTML_GESTION))
  chk('… y si no, el rebote de siempre', /if \(!puedeVerGestion\(\) && !estado\.soloStock\) \{\s*sinAcceso\(/.test(HTML_GESTION))
  chk('en solo stock abre el stock terminado', /const entrada = estado\.soloStock \? 'stock' : vistaDeEntrada\(/.test(HTML_GESTION))
  chk('desde Stock la dirección no se limpia (recargar vuelve al stock)', /if \(!estado\.desdeStock && !estado\.soloStock && window\.location\?\.search/.test(HTML_GESTION))
  chk('el "‹ Menú" del stock usa alVolverDelStock', /getElementById\('pr-stock-volver'\)\.addEventListener\('click', alVolverDelStock\)/.test(HTML_GESTION))

  fin()
})().catch(e => { console.error(e); process.exit(1) })
