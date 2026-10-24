// El producto terminado de Stock (23/10/2026, modulos/stock.html,
// #vista-terminado). Pedido de Facu: la vista armada como el selector de
// productos de la Carga de retiros —una línea por producto + presentación +
// cono, agrupadas por producto, buscador arriba, sin lotes a la vista—; al
// tocar una línea, sus lotes (lo negativo en rojo) y sus movimientos (el
// ajuste con su motivo); "Corregir stock" por lote y "+ Otro lote" por línea
// solo con stock:ajustar_inventario en esa fábrica, con una sola llamada a
// ajustar_stock_terminado (firma verificada con pg_get_functiondef el
// 23/10/2026) y el error de la base tal cual.
//
// Se EJECUTA el código real de la pantalla (las funciones del módulo, los
// números de js/utils.js y pasaFiltroUnidad de js/barra-unidad.js) contra un
// DOM falso y un supabase falso, con los MISMOS datos que mira la maqueta
// (pruebas/datos-maqueta/stock-terminado.js).
//
//   node pruebas/test-stock-terminado.js
//   ARCHIVO_TEST=<copia de stock.html> node pruebas/test-stock-terminado.js
'use strict'

const fs = require('fs')
const path = require('path')
const { construirCon } = require('./sandbox')
const { fuenteNumeros, inputFalso } = require('./numeros-comun')
const { extraerFn } = require('./extraer')
const { arnes, leer, marca, escapada } = require('./circuito-comun')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos', 'stock.html')
const HTML = leer(ARCHIVO)
const BARRA = fs.readFileSync(path.join(RAIZ, 'js', 'barra-unidad.js'), 'utf8')
const DATOS = require('./datos-maqueta/stock-terminado')
const { chk, esperas, fin } = arnes()

const PRELUDIO = `
  ${fuenteNumeros()}
  ${extraerFn(BARRA, 'pasaFiltroUnidad').replace(/^export /, '')}
  var __inputFalso = ${inputFalso.toString()}
  var console = { log(){}, warn(){}, error(){} }
  var __els = new Map()
  var __signos = []
  function __nuevo(id) {
    const el = {
      id, hidden: false, disabled: false, textContent: '', value: '', dataset: {}, __attrs: {},
      classList: { add(){}, remove(){}, toggle(){}, contains(){ return false } },
      setAttribute(k, v) { this.__attrs[k] = v }, focus() { document.activeElement = this },
    }
    let html = ''
    Object.defineProperty(el, 'innerHTML', { get() { return html }, set(h) { html = String(h); __alDibujar(el, html) } })
    return el
  }
  // Lo que el navegador crearía al dibujar la lista: los campos y botones de
  // la corrección (si están en el HTML nuevo) y los Sumar / Restar.
  var __CAMPOS = ['ptm-f-lote', 'ptm-f-tipo', 'ptm-f-motivo', 'ptm-f-queda', 'ptm-f-error', 'ptm-f-guardar']
  function __alDibujar(el, html) {
    if (el.id !== 'ptm-lista') return
    for (const id of [...__CAMPOS, 'ptm-f-cajas']) __els.delete(id)
    __signos = []
    for (const id of __CAMPOS) if (html.includes('id="' + id + '"')) { const e = __nuevo(id); if (id === 'ptm-f-error' || id === 'ptm-f-queda') e.hidden = true; __els.set(id, e) }
    if (html.includes('id="ptm-f-cajas"')) { const e = __inputFalso(''); e.id = 'ptm-f-cajas'; e.dataset = { ptmCampo: 'cajas' }; __els.set('ptm-f-cajas', e) }
    for (const s of ['+', '-']) if (html.includes('data-ptm-signo="' + s + '"')) { const b = __nuevo(''); b.dataset.ptmSigno = s; __signos.push(b) }
  }
  function __el(id) { if (!__els.has(id)) __els.set(id, __nuevo(id)); return __els.get(id) }
  var document = {
    activeElement: null,
    body: { classList: { add(){}, remove(){} } },
    getElementById: (id) => (id.startsWith('ptm-f-') ? (__els.get(id) ?? null) : __el(id)),
    querySelectorAll: (s) => (s === '[data-ptm-signo]' ? __signos : []),
  }
  var window = { scrollTo(){} }

  // ── supabase falso ─────────────────────────────────────────────────────
  var __tablas = {}
  var __consultas = []
  var __rpc = []
  var __respuestaRpc = { data: 'stm-nuevo', error: null }
  var __errorTabla = null
  var supabase = {
    from(t) {
      const q = { t, sel: '', desde: 0, hasta: null }
      __consultas.push(q)
      const api = {
        select(s) { q.sel = s; return api }, order() { return api }, eq() { return api },
        range(a, b) { q.desde = a; q.hasta = b; return api },
        then(res, rej) {
          if (__errorTabla === t) return Promise.resolve({ data: null, error: { message: 'falla de ' + t } }).then(res, rej)
          const filas = __tablas[t] ?? []
          const data = q.hasta === null ? filas : filas.slice(q.desde, q.hasta + 1)
          return Promise.resolve({ data, error: null }).then(res, rej)
        },
      }
      return api
    },
    rpc(n, p) {
      __rpc.push([n, p])
      const r = __respuestaRpc
      if (r instanceof Error) return Promise.reject(r)
      return Promise.resolve(r)
    },
  }

  var __repintes = 0
  function mostrarVista(id) { estado.vista = id }
  function salirDeEleccion() { estado.enEleccion = false }
  var estado = {
    miRolApp: 'usuario', misTareas: new Set(), alcancesTareas: new Map(),
    unidadBarra: null, unidadesBarra: [], unidadesStock: [], unidadesAjuste: [], unidadesBaja: [], unidadesEnvio: [], destinos: [],
    fabrica: { ok: true, unidades: new Set(['u-p']), personas: new Set(), soyDePrueba: false },
    ptm: null, vista: 'terminado', enEleccion: false, sucios: new Set(), guardando: false,
  }
`

const FUNCIONES = [
  'esc', 'normalizar', 'tieneTarea', 'puedeTareaEn', 'nombreDeUnidadBarra', 'hayFormularioAbierto',
  'estadoTerminadoVacio', 'claveLineaTerminado', 'textoCajasTerminado', 'fechaCortaTerminado', 'textoLineaTerminado',
  'lineasTerminado', 'tieneStockLineaTerminado', 'coincideLineaTerminado', 'armarTerminado', 'puedeCorregirTerminadoEn',
  'nombreUnidadTerminado', 'lineaTerminado', 'leerCatalogoTerminado', 'leerMovimientosTerminado', 'cargarTerminado',
  'abrirTerminado', 'formTerminadoNuevo', 'abrirFormTerminado', 'cerrarFormTerminado', 'loteDelFormTerminado',
  'faltaFormTerminado', 'textoFaltaTerminado', 'parametrosAjusteTerminado', 'saldoLoteTerminado', 'textoQuedaTerminado',
  'textoExitoTerminado', 'guardarAjusteTerminado', 'htmlFormTerminado', 'htmlHistorialTerminado', 'htmlDetalleTerminado',
  'htmlLineaTerminado', 'htmlTerminado', 'pintarTerminado', 'pintarFormTerminado', 'alTocarTerminado', 'alEscribirTerminado',
  'alMandarTerminado', 'alBuscarTerminado',
]
const CONSTANTES = [
  'puedeAjustar', 'TIPOS_MOV_TERMINADO', 'MOTIVOS_AJUSTE_TERMINADO', 'FILAS_POR_PAGINA_PTM', 'TOPE_PAGINAS_PTM',
  'HISTORIAL_PTM', 'LARGO_LOTE_PTM', 'TEXTO_ERROR_RED_PTM',
]

function sandbox() {
  return construirCon(ARCHIVO, {
    preludio: PRELUDIO, funciones: FUNCIONES, constantes: CONSTANTES,
    retorno: `estado, __els, __consultas, __rpc, TEXTO_ERROR_RED_PTM, HISTORIAL_PTM,
      __signos: () => __signos,
      __setTablas(t) { __tablas = t }, __setRpc(r) { __respuestaRpc = r }, __setErrorTabla(t) { __errorTabla = t }`,
  })
}

const T = DATOS.tablas
const TABLAS = () => ({
  productos_terminados: JSON.parse(JSON.stringify(T.productos_terminados)),
  producto_presentaciones: JSON.parse(JSON.stringify(T.producto_presentaciones)),
  marcas_personalizadas: JSON.parse(JSON.stringify(T.marcas_personalizadas)),
  unidades_negocio: JSON.parse(JSON.stringify(T.unidades_negocio)),
  stock_terminado_movimientos: JSON.parse(JSON.stringify(T.stock_terminado_movimientos)),
})
const AJUSTAR_NUSS = { modulo: 'stock', tarea: 'ajustar_inventario', alcance: { unidades: ['u-n'] } }

// Un sandbox con los datos cargados y la vista abierta. tareas = filas de
// empleado_tareas habilitadas.
async function abierto({ tareas = [AJUSTAR_NUSS], rol = 'usuario', tablas = TABLAS() } = {}) {
  const S = sandbox()
  S.estado.miRolApp = rol
  S.estado.misTareas = new Set(tareas.map(t => `${t.modulo}:${t.tarea}`))
  S.estado.alcancesTareas = new Map(tareas.map(t => [`${t.modulo}:${t.tarea}`, t.alcance]))
  S.__setTablas(tablas)
  await S.abrirTerminado()
  return S
}
const lista = (S) => S.__els.get('ptm-lista').innerHTML
const aviso = (S) => S.__els.get('ptm-estado')
// Un toque sobre un elemento con esos data-*.
const toque = (S, dataset) => S.alTocarTerminado({ target: { dataset, closest() { return this } } })
const CLAVE_MINI = 'u-n|pp-mini|'
const CLAVE_ASPEN = 'u-n|pp-mini-c|mk-aspen'
const CLAVE_DOLCE = 'u-d|dp-mini|'

;(async () => {
  // ── El texto de cada línea ───────────────────────────────────────────────
  {
    const S = sandbox()
    chk('"Caja con cono · ASPEN ×320"', S.textoLineaTerminado({ presentacion: 'Caja con cono', cono: 'ASPEN', upc: 320 }) === 'Caja con cono · ASPEN ×320',
      S.textoLineaTerminado({ presentacion: 'Caja con cono', cono: 'ASPEN', upc: 320 }))
    chk('sin cono: "Media caja ×160"', S.textoLineaTerminado({ presentacion: 'Media caja', cono: null, upc: 160 }) === 'Media caja ×160')
    chk('"Caja x 600" no repite el 600', S.textoLineaTerminado({ presentacion: 'Caja x 600', upc: 600 }) === 'Caja x 600')
    chk('"Caja 600" no repite el 600', S.textoLineaTerminado({ presentacion: 'Caja 600', upc: 600 }) === 'Caja 600')
    chk('"Caja ×1.800" no repite el 1800', S.textoLineaTerminado({ presentacion: 'Caja ×1.800', upc: 1800 }) === 'Caja ×1.800')
    chk('"Caja x 60" con 600 por caja SÍ lo dice (otro número)', S.textoLineaTerminado({ presentacion: 'Caja x 60', upc: 600 }) === 'Caja x 60 ×600')
    chk('las unidades con punto de miles: "Caja ×1.800"', S.textoLineaTerminado({ presentacion: 'Caja', upc: 1800 }) === 'Caja ×1.800')
    chk('sin unidades por caja, sin "×"', S.textoLineaTerminado({ presentacion: 'Caja', upc: null }) === 'Caja')
    chk('"1 caja" / "45 cajas" / "-4 cajas" / "1.200 cajas"', S.textoCajasTerminado(1) === '1 caja' && S.textoCajasTerminado(45) === '45 cajas' &&
      S.textoCajasTerminado(-4) === '-4 cajas' && S.textoCajasTerminado(1200) === '1.200 cajas', [S.textoCajasTerminado(-4), S.textoCajasTerminado(1200)].join(' / '))
    chk('la fecha corta: 20/09/26', S.fechaCortaTerminado('2026-09-20') === '20/09/26')
  }

  // ── Las líneas, desde el libro ───────────────────────────────────────────
  {
    const S = await abierto()
    const lineas = S.estado.ptm.lineas
    const mini = lineas.find(l => l.clave === CLAVE_MINI)
    chk('una línea por fábrica + presentación + cono', !!mini && !!lineas.find(l => l.clave === CLAVE_ASPEN) && !!lineas.find(l => l.clave === CLAVE_DOLCE))
    chk('el total de la línea es la suma de sus movimientos (79)', mini?.total === 79, mini?.total)
    chk('los lotes, los más viejos primero', mini?.lotes.map(g => g.lote).join(',') === '6201-1,6215-2,6230-1,6240-2', mini?.lotes.map(g => g.lote).join(','))
    chk('el saldo de cada lote (6201-1: 28, 6230-1: -4)', mini?.lotes[0].saldo === 28 && mini?.lotes[2].saldo === -4)
    chk('los movimientos, los más nuevos primero', mini?.movs[0].fecha === '2026-10-20' && mini?.movs[mini.movs.length - 1].fecha === '2026-09-20')
    chk('la fábrica de pruebas nunca aparece para una cuenta real', !lineas.some(l => l.unidadId === 'u-p'))
    const q = S.__consultas.find(c => c.t === 'stock_terminado_movimientos')
    chk('el libro se lee con tipo, motivo, fecha y created_at (la columna que no llega no la ve el doble)',
      /\bunidad_negocio_id\b/.test(q?.sel) && /\bpresentacion_id\b/.test(q?.sel) && /\bmarca_id\b/.test(q?.sel) && /\blote\b/.test(q?.sel) &&
      /\bcajas\b/.test(q?.sel) && /\btipo\b/.test(q?.sel) && /\bmotivo\b/.test(q?.sel) && /\bfecha\b/.test(q?.sel) && /\bcreated_at\b/.test(q?.sel), q?.sel)
    chk('… de a páginas (range)', q?.hasta === 999 && q?.desde === 0)
    const pp = S.__consultas.find(c => c.t === 'producto_presentaciones')
    chk('las presentaciones con sus unidades por caja y su orden', /\bunidades_por_caja\b/.test(pp?.sel) && /\borden\b/.test(pp?.sel) && /\bproducto_id\b/.test(pp?.sel), pp?.sel)
    const pt = S.__consultas.find(c => c.t === 'productos_terminados')
    chk('los productos con su orden', /\borden\b/.test(pt?.sel) && /\bnombre\b/.test(pt?.sel), pt?.sel)
  }
  {
    // Una cuenta de PRUEBAS sí ve la fábrica de pruebas.
    const S = sandbox()
    S.estado.fabrica = { ok: true, unidades: new Set(['u-p']), personas: new Set(), soyDePrueba: true }
    S.__setTablas(TABLAS())
    await S.abrirTerminado()
    chk('una cuenta de pruebas ve la fábrica de pruebas', S.estado.ptm.lineas.some(l => l.unidadId === 'u-p'))
  }
  {
    // Paginado: 2.500 movimientos → tres páginas, todo leído.
    const tablas = TABLAS()
    const muchos = []
    for (let i = 0; i < 2500; i++) muchos.push({ id: `m${i}`, unidad_negocio_id: 'u-n', presentacion_id: 'pp-mini', marca_id: null, lote: `L-${i % 7}`, cajas: 1, tipo: 'produccion', motivo: null, fecha: '2026-10-01', created_at: '2026-10-01T10:00:00-03:00' })
    tablas.stock_terminado_movimientos = muchos
    const S = await abierto({ tablas })
    const paginas = S.__consultas.filter(c => c.t === 'stock_terminado_movimientos')
    chk('2.500 movimientos se leen en tres páginas', paginas.length === 3 && paginas[2].desde === 2000, paginas.map(p => p.desde).join(','))
    chk('… y se suman todos', S.estado.ptm.lineas.find(l => l.clave === CLAVE_MINI)?.total === 2500)
    chk('… sin el aviso de incompleto', S.estado.ptm.incompleto === false && S.__els.get('ptm-incompleto').hidden === true)
  }
  {
    const tablas = TABLAS()
    const muchos = []
    for (let i = 0; i < 20000; i++) muchos.push({ id: `m${i}`, unidad_negocio_id: 'u-n', presentacion_id: 'pp-mini', marca_id: null, lote: 'L', cajas: 1, tipo: 'produccion', fecha: '2026-10-01' })
    tablas.stock_terminado_movimientos = muchos
    const S = await abierto({ tablas })
    chk('pasado el tope de páginas, se avisa que puede estar incompleto', S.estado.ptm.incompleto === true && S.__els.get('ptm-incompleto').hidden === false)
  }

  // ── Lo que se dibuja ─────────────────────────────────────────────────────
  {
    const S = await abierto()
    const h = lista(S)
    chk('agrupado por producto: el encabezado "Cucuruchón Mini" con su total', /ptm-producto__nombre">Cucuruchón Mini<\/span><span class="ptm-producto__total">440 cajas/.test(h))
    chk('una línea "Caja con cono · ASPEN ×320" con "45 cajas"', /Caja con cono · ASPEN ×320<\/span>.*?<span class="ptm-linea__cajas">45 cajas/s.test(h))
    chk('sin lotes a la vista (ningún lote en la lista cerrada)', !h.includes('6201-1') && !h.includes('6243-1') && !h.includes('ptm-lote'))
    chk('lo negativo en rojo: "-4 cajas" de LOLO con ptm-neg', /<span class="ptm-linea__cajas ptm-neg">-4 cajas/.test(h))
    chk('… y la línea dice cuántos lotes tiene en negativo', h.includes('1 lote en negativo') && h.includes('3 lotes en negativo'))
    chk('el total del producto en negativo, en rojo (Obleas: -10)', /ptm-producto__total ptm-neg">-10 cajas/.test(h))
    chk('sin buscar, la línea que quedó en cero (DUOMO) no aparece', !h.includes('DUOMO'))
    chk('con "Todas", el nombre de cada fábrica', h.includes('<h3 class="ptm-fabrica">Cucuruchos Nuss</h3>') && h.includes('<h3 class="ptm-fabrica">Dolce Pasta</h3>'))
    const iMini = h.indexOf('Cucuruchón Mini'), iGrande = h.indexOf('Cucuruchón Grande'), iObleas = h.indexOf('Obleas dulces')
    chk('los productos por su orden (Mini, Grande, …, Obleas)', iMini >= 0 && iGrande > iMini && iObleas > iGrande)
    const iSin = h.indexOf('Caja sin cono ×320'), iAspen = h.indexOf('ASPEN'), iSol = h.indexOf('HELADERÍA DEL SOL'), iLolo = h.indexOf('LOLO')
    chk('las líneas: sin cono primero, los conos por nombre', iSin >= 0 && iAspen > iSin && iSol > iAspen && iLolo > iSol, [iSin, iAspen, iSol, iLolo].join(','))
    chk('"Caja ×1800" no repite las unidades', h.includes('>Caja ×1800<') && !h.includes('×1800 ×'))
    chk('el aviso de "Leyendo…" se va', aviso(S).hidden === true)
    chk('el botón de la línea dice si está abierta (aria-expanded)', h.includes(`data-ptm-linea="${CLAVE_MINI}" aria-expanded="false"`))

    // La barra de arriba elige la fábrica.
    S.estado.unidadBarra = 'u-d'
    S.pintarTerminado()
    const d = lista(S)
    chk('con Dolce Pasta en la barra, solo Dolce Pasta (sin el nombre de la fábrica arriba)', d.includes('Caja 600') && !d.includes('ASPEN') && !d.includes('ptm-fabrica'))
    S.estado.unidadBarra = 'u-m'
    S.pintarTerminado()
    chk('una fábrica sin producto terminado lo dice con su nombre', aviso(S).hidden === false && aviso(S).textContent === 'Mengui no tiene producto terminado en stock.', aviso(S).textContent)
    S.estado.unidadBarra = null

    // El buscador.
    S.alBuscarTerminado({ target: { value: 'aspen' } })
    const b = lista(S)
    chk('buscar "aspen": solo esa línea', b.includes('ASPEN') && !b.includes('LOLO') && !b.includes('Caja sin cono'))
    S.alBuscarTerminado({ target: { value: 'mini duomo' } })
    chk('buscando aparece también la línea en cero, como "sin stock"', lista(S).includes('DUOMO') && lista(S).includes('<span class="ptm-linea__sin">sin stock</span>'))
    chk('… y con dos palabras tienen que estar las dos ("mini duomo" no trae ASPEN)', !lista(S).includes('ASPEN') && !lista(S).includes('Caja sin cono'))
    S.alBuscarTerminado({ target: { value: '6230' } })
    chk('se busca también por lote', lista(S).includes('Caja sin cono ×320') && !lista(S).includes('ASPEN'))
    S.alBuscarTerminado({ target: { value: 'zzz' } })
    chk('nada coincide: lo dice', lista(S) === '' && aviso(S).textContent === 'Nada coincide con «zzz».')
    S.alBuscarTerminado({ target: { value: '' } })
  }

  {
    const S = sandbox()
    const base = { unidadId: 'u-n', productoId: 'p', producto: 'P', ordenProducto: 1, presentacion: 'Caja', ordenPresentacion: 1, upc: 10, movs: [] }
    const lineas = [
      { ...base, clave: 'c2', cono: 'ZETA', total: 1, lotes: [{ lote: 'A', saldo: 1 }] },
      { ...base, clave: 'c1', cono: null, total: 1, lotes: [{ lote: 'B', saldo: 1 }] },
      { ...base, clave: 'c3', cono: 'ALFA', total: 1, lotes: [{ lote: 'C', saldo: 1 }] },
    ]
    const orden = S.armarTerminado(lineas)[0].productos[0].lineas.map(l => l.clave).join(',')
    chk('en la misma presentación: sin cono primero y los conos por nombre', orden === 'c1,c3,c2', orden)
  }

  // ── Al tocar una línea: lotes y movimientos ──────────────────────────────
  {
    const S = await abierto()
    toque(S, { ptmLinea: CLAVE_MINI })
    let h = lista(S)
    chk('al tocar la línea se despliegan sus lotes', h.includes('ptm-lote__lote">6201-1') && h.includes('ptm-lote__lote">6240-2'))
    chk('… con las cajas de cada uno', /6201-1<\/span>\s*<span class="ptm-lote__desde">desde 20\/09\/26<\/span>\s*<span class="ptm-lote__cajas">28 cajas/.test(h))
    chk('… el lote negativo, en rojo', /<li class="ptm-lote ptm-lote--neg">\s*<span class="ptm-lote__lote">6230-1<\/span>[\s\S]*?<span class="ptm-lote__cajas ptm-neg">-4 cajas/.test(h))
    chk('… y la línea queda marcada abierta', h.includes(`data-ptm-linea="${CLAVE_MINI}" aria-expanded="true"`))
    toque(S, { ptmLinea: CLAVE_MINI })
    chk('otro toque la cierra', !lista(S).includes('ptm-lote__lote'))

    // Un lote en cero no se lista.
    toque(S, { ptmLinea: 'u-n|pp-grande|' })
    h = lista(S)
    chk('los lotes con cajas se listan (Grande: 6195-2)', h.includes('ptm-lote__lote">6195-2'))
    S.alBuscarTerminado({ target: { value: 'duomo' } })
    toque(S, { ptmLinea: 'u-n|pp-mini-c|mk-duomo' })
    chk('una línea sin stock dice que ningún lote tiene cajas', lista(S).includes('Ningún lote tiene cajas.'))
    S.alBuscarTerminado({ target: { value: '' } })

    // Movimientos.
    toque(S, { ptmLinea: CLAVE_MINI })
    toque(S, { ptmHistorial: CLAVE_MINI })
    h = lista(S)
    chk('"Movimientos" muestra el historial de la línea', h.includes('<ul class="ptm-hist">') && h.includes('ptm-hist__tipo">Producción'))
    chk('el ajuste dice su motivo (de la columna motivo)', h.includes('<span class="ptm-hist__tipo">Ajuste</span> · lote 6230-1<span class="ptm-hist__motivo">Corrección de carga: estas cajas no salieron de este lote; salieron del 6240-2</span>'))
    chk('el retiro dice "Retiro" y lo que sale en rojo con su signo', /ptm-hist__tipo">Retiro<\/span>[\s\S]*?ptm-hist__cajas ptm-neg">-12/.test(h))
    chk('lo que entra con "+"', h.includes('ptm-hist__cajas">+40'))
    toque(S, { ptmLinea: CLAVE_DOLCE })
    toque(S, { ptmHistorial: CLAVE_DOLCE })
    const hd = lista(S)
    chk('un movimiento que no es ajuste NO muestra el motivo (el traspaso de Dolce)', hd.includes('Vino de otra fábrica') && !hd.includes('Traspaso de Cucuruchos Nuss'))
  }
  {
    // La devolución de un cliente (tipo 'devolucion', rama devoluciones-retiro,
    // 24/10/2026): con el mismo nombre que en la gestión de Producción.
    const tablas = TABLAS()
    tablas.stock_terminado_movimientos.push({ id: 'dev1', unidad_negocio_id: 'u-n', presentacion_id: 'pp-vaso', marca_id: null, lote: 'SIN LOTE', cajas: 3, tipo: 'devolucion', fecha: '2026-10-12', created_at: '2026-10-12T10:00:00-03:00' })
    const S = await abierto({ tablas })
    toque(S, { ptmLinea: 'u-n|pp-vaso|' })
    toque(S, { ptmHistorial: 'u-n|pp-vaso|' })
    chk('la devolución se llama "Devolución de cliente"', lista(S).includes('ptm-hist__tipo">Devolución de cliente</span>'), lista(S))
  }
  {
    // Ver más: con más de HISTORIAL_PTM movimientos.
    const tablas = TABLAS()
    for (let i = 0; i < 20; i++) tablas.stock_terminado_movimientos.push({ id: `x${i}`, unidad_negocio_id: 'u-n', presentacion_id: 'pp-vaso', marca_id: null, lote: 'SIN LOTE', cajas: 1, tipo: 'produccion', fecha: '2026-10-11', created_at: `2026-10-11T10:${String(i).padStart(2, '0')}:00-03:00` })
    const S = await abierto({ tablas })
    toque(S, { ptmLinea: 'u-n|pp-vaso|' })
    toque(S, { ptmHistorial: 'u-n|pp-vaso|' })
    const filas = (lista(S).match(/<li class="ptm-hist__fila">/g) ?? []).length
    chk(`el historial muestra ${S.HISTORIAL_PTM} y "Ver más"`, filas === S.HISTORIAL_PTM && lista(S).includes('Ver más (quedan 7)'), `${filas}`)
    toque(S, { ptmMas: 'u-n|pp-vaso|' })
    chk('"Ver más" muestra el resto', (lista(S).match(/<li class="ptm-hist__fila">/g) ?? []).length === 22 && !lista(S).includes('Ver más'))
    toque(S, { ptmHistorial: 'u-n|pp-vaso|' })
    chk('"Ocultar movimientos" lo cierra', !lista(S).includes('<ul class="ptm-hist">'))
  }

  // ── Quién ve los botones de corregir ─────────────────────────────────────
  {
    const S = await abierto({ tareas: [AJUSTAR_NUSS] })
    toque(S, { ptmLinea: CLAVE_MINI })
    toque(S, { ptmLinea: CLAVE_DOLCE })
    const h = lista(S)
    const nuss = h.slice(0, h.indexOf('Dolce Pasta'))
    const dolce = h.slice(h.indexOf('Dolce Pasta'))
    chk('con ajustar_inventario en Nuss: "Corregir stock" en cada lote de Nuss', (nuss.match(/data-ptm-corregir=/g) ?? []).length === 4)
    chk('… y "+ Otro lote" en la línea', nuss.includes(`data-ptm-otro="${CLAVE_MINI}">+ Otro lote`))
    chk('… pero NO en Dolce Pasta (sin alcance ahí)', !dolce.includes('data-ptm-corregir') && !dolce.includes('data-ptm-otro'))
    S.abrirFormTerminado(CLAVE_DOLCE, 'D-7001')
    chk('… y abrir la corrección de Dolce por código no hace nada', S.estado.ptm.form === null)
  }
  {
    const S = await abierto({ tareas: [{ modulo: 'stock', tarea: 'ver', alcance: { todas: true } }] })
    toque(S, { ptmLinea: CLAVE_MINI })
    chk('sin ajustar_inventario: ni "Corregir stock" ni "+ Otro lote"', !lista(S).includes('data-ptm-corregir') && !lista(S).includes('data-ptm-otro'))
  }
  {
    const S = await abierto({ tareas: [{ modulo: 'stock', tarea: 'ajustar_inventario', alcance: null }] })
    toque(S, { ptmLinea: CLAVE_MINI })
    chk('ajustar_inventario SIN alcance (null): no (como tiene_tarea_alcance)', !lista(S).includes('data-ptm-corregir'))
  }
  {
    const S = await abierto({ tareas: [{ modulo: 'stock', tarea: 'ajustar_inventario', alcance: { todas: true } }] })
    toque(S, { ptmLinea: CLAVE_DOLCE })
    chk('ajustar_inventario en todas: también en Dolce', lista(S).includes('data-ptm-corregir'))
  }
  {
    const S = await abierto({ tareas: [], rol: 'super_admin' })
    toque(S, { ptmLinea: CLAVE_MINI })
    chk('super_admin: sí', lista(S).includes('data-ptm-corregir'))
  }

  // ── Corregir un lote ─────────────────────────────────────────────────────
  {
    const S = await abierto()
    toque(S, { ptmLinea: CLAVE_MINI })
    toque(S, { ptmCorregir: CLAVE_MINI, lote: '6201-1' })
    let h = lista(S)
    chk('"Corregir stock" abre la corrección debajo del lote', /6201-1[\s\S]*?<li class="ptm-lote__form"><form class="ptm-form"/.test(h) && h.includes('Corregir el lote <b>6201-1</b> · hay 28 cajas'))
    chk('… con Sumar y Restar, ninguno elegido', S.__signos().length === 2 && h.includes('data-ptm-signo="+" aria-pressed="false"') && h.includes('data-ptm-signo="-" aria-pressed="false"'))
    chk('… y los cinco motivos con sus etiquetas', ['faltante_recuento">Faltante en el recuento', 'sobrante_recuento">Sobrante en el recuento', 'aparecio_otro_lado">Apareció en otro lado',
      'correccion_carga">Corrección de carga', 'carga_inicial">Carga inicial'].every(o => h.includes(`<option value="${o}</option>`)))
    chk('… y el lote que se corrige ya no ofrece otro "Corregir stock"', (h.match(/data-ptm-corregir=/g) ?? []).length === 3)
    const cajas = S.__els.get('ptm-f-cajas')
    chk('el campo de cajas es de texto con teclado numérico (enlazarCampoNumero, enteros)', cajas?.type === 'text' && cajas?.atributos?.inputmode === 'numeric', JSON.stringify(cajas?.atributos))

    // Guardar sin nada: dice lo que falta, pegado al botón, y no llama.
    await S.alMandarTerminado({ target: { closest: () => ({}) }, preventDefault() {} })
    const err = S.__els.get('ptm-f-error')
    chk('Guardar sin nada: dice lo que falta', err.hidden === false && err.textContent === 'Falta: elegir Sumar o Restar, las cajas (un número entero mayor que cero), por qué se corrige y el motivo (al menos 3 letras).', err.textContent)
    chk('… el botón se puede seguir tocando', S.__els.get('ptm-f-guardar').disabled === false)
    chk('… y no llama a la base', S.__rpc.length === 0)

    // Restar 3 por faltante.
    toque(S, { ptmSigno: '-' })
    chk('Restar queda elegido', S.__signos().find(b => b.dataset.ptmSigno === '-').__attrs['aria-pressed'] === 'true' && S.__signos().find(b => b.dataset.ptmSigno === '+').__attrs['aria-pressed'] === 'false')
    cajas.teclear ? cajas.teclear('3') : (cajas.value = '3')
    S.alEscribirTerminado({ target: cajas })
    chk('las cajas se leen con leerCampoNumero (3)', S.estado.ptm.form.cajas === 3, String(S.estado.ptm.form.cajas))
    {
      const otro = S.__els.get('ptm-f-cajas')
      otro.value = '1.200'
      S.alEscribirTerminado({ target: otro })
      chk('"1.200" en el campo son mil doscientas cajas (no 1,2)', S.estado.ptm.form.cajas === 1200, String(S.estado.ptm.form.cajas))
      otro.value = '3'
      S.alEscribirTerminado({ target: otro })
    }
    chk('"Queda: 28 → 25 cajas"', S.__els.get('ptm-f-queda').textContent === 'Queda: 28 → 25 cajas' && S.__els.get('ptm-f-queda').hidden === false, S.__els.get('ptm-f-queda').textContent)
    S.alEscribirTerminado({ target: { value: 'faltante_recuento', dataset: { ptmCampo: 'tipo' } } })
    S.alEscribirTerminado({ target: { value: '  Contamos 25 en el depósito  ', dataset: { ptmCampo: 'motivo' } } })
    chk('con todo completo, el aviso de lo que falta se va', S.__els.get('ptm-f-error').hidden === true)

    let enVuelo = null
    S.__setRpc(new Promise(r => { enVuelo = r }))
    const guardando = S.alMandarTerminado({ target: { closest: () => ({}) }, preventDefault() {} })
    chk('mientras manda, el botón se traba y dice "Guardando…"', S.__els.get('ptm-f-guardar').disabled === true && S.__els.get('ptm-f-guardar').textContent === 'Guardando…')
    await S.alMandarTerminado({ target: { closest: () => ({}) }, preventDefault() {} })
    chk('un segundo toque mientras manda no vuelve a llamar', S.__rpc.length === 1)
    const antes = S.__consultas.length
    enVuelo({ data: 'stm-nuevo', error: null })
    await guardando
    chk('UNA sola llamada a ajustar_stock_terminado', S.__rpc.length === 1 && S.__rpc[0][0] === 'ajustar_stock_terminado')
    chk('con los parámetros EXACTOS (cajas con signo: restar = negativo; motivo sin espacios de más)', JSON.stringify(S.__rpc[0][1]) === JSON.stringify({
      p_unidad_negocio_id: 'u-n', p_presentacion_id: 'pp-mini', p_marca_id: null, p_lote: '6201-1', p_cajas: -3,
      p_motivo_tipo: 'faltante_recuento', p_motivo: 'Contamos 25 en el depósito',
    }), JSON.stringify(S.__rpc[0][1]))
    chk('después de guardar se relee el libro', S.__consultas.slice(antes).some(c => c.t === 'stock_terminado_movimientos'))
    h = lista(S)
    chk('la corrección se cierra y dice qué se hizo', S.estado.ptm.form === null && h.includes('<p class="ptm-exito" role="status">Listo: se restaron 3 cajas del lote 6201-1.</p>'), h.slice(h.indexOf('ptm-detalle'), h.indexOf('ptm-detalle') + 200))
    chk('… y la línea sigue abierta', h.includes(`data-ptm-linea="${CLAVE_MINI}" aria-expanded="true"`))
  }
  {
    // Sumar, con cono: p_marca_id va.
    const S = await abierto()
    toque(S, { ptmLinea: CLAVE_ASPEN })
    toque(S, { ptmCorregir: CLAVE_ASPEN, lote: '6243-1' })
    toque(S, { ptmSigno: '+' })
    const cajas = S.__els.get('ptm-f-cajas')
    cajas.value = '2'
    S.alEscribirTerminado({ target: cajas })
    S.alEscribirTerminado({ target: { value: 'sobrante_recuento', dataset: { ptmCampo: 'tipo' } } })
    S.alEscribirTerminado({ target: { value: 'Aparecieron', dataset: { ptmCampo: 'motivo' } } })
    await S.guardarAjusteTerminado()
    const p = S.__rpc[0]?.[1]
    chk('con cono: p_marca_id es el cono, y sumar = positivo', p?.p_marca_id === 'mk-aspen' && p?.p_cajas === 2 && p?.p_presentacion_id === 'pp-mini-c', JSON.stringify(p))
    chk('… "Listo: se sumaron 2 cajas al lote 6243-1."', lista(S).includes('Listo: se sumaron 2 cajas al lote 6243-1.'))
  }
  {
    // Cajas que no valen.
    const S = await abierto()
    S.abrirFormTerminado(CLAVE_MINI, '6201-1')
    const f = S.estado.ptm.form
    f.signo = '+'; f.tipo = 'correccion_carga'; f.motivo = 'abc'
    for (const [cajas, nombre] of [[0, 'cero'], [null, 'vacío'], [2.5, 'con decimales'], [-2, 'negativo']]) {
      f.cajas = cajas
      chk(`cajas ${nombre}: falta`, S.faltaFormTerminado(f).includes('las cajas (un número entero mayor que cero)'))
    }
    f.cajas = 1
    f.motivo = 'ab'
    chk('motivo de 2 letras: falta (la base pide 3)', S.faltaFormTerminado(f).includes('el motivo (al menos 3 letras)'))
    f.motivo = '   abc   '
    chk('motivo de 3 letras con espacios: alcanza', S.faltaFormTerminado(f).length === 0, S.faltaFormTerminado(f).join(' | '))
    f.tipo = 'otra_cosa'
    chk('un motivo_tipo que no es de la lista: falta', S.faltaFormTerminado(f).includes('por qué se corrige'))
    f.tipo = 'carga_inicial'
    f.signo = null
    chk('sin Sumar ni Restar: falta', S.faltaFormTerminado(f).includes('elegir Sumar o Restar'))
    chk('una sola cosa: "Falta: X."', S.textoFaltaTerminado(['a']) === 'Falta: a.')
    // Cancelar.
    toque(S, { ptmCancelar: '1' })
    chk('Cancelar cierra la corrección', S.estado.ptm.form === null)
  }
  {
    // El campo de cajas no acepta la coma (enteros): "2,5" no entra.
    const S = await abierto()
    toque(S, { ptmLinea: CLAVE_MINI })
    toque(S, { ptmCorregir: CLAVE_MINI, lote: '6201-1' })
    const cajas = S.__els.get('ptm-f-cajas')
    if (typeof cajas.teclear === 'function') {
      cajas.teclear('2,5')
      S.alEscribirTerminado({ target: cajas })
      // El campo de enteros no deja escribir la coma: lo que se lee es
      // EXACTAMENTE lo que se ve en el campo (nada se pega en silencio).
      chk('"2,5" en el campo de cajas: la coma no entra y se lee lo que se ve', !cajas.value.includes(',') && S.estado.ptm.form.cajas === Number(cajas.value), `${cajas.value} → ${S.estado.ptm.form.cajas}`)
    } else {
      chk('el input falso sabe teclear', false)
    }
  }

  // ── "+ Otro lote" ────────────────────────────────────────────────────────
  {
    const S = await abierto()
    toque(S, { ptmLinea: CLAVE_MINI })
    toque(S, { ptmOtro: CLAVE_MINI })
    let h = lista(S)
    chk('"+ Otro lote" abre la corrección con el campo del lote', h.includes('<p class="ptm-form__titulo">Otro lote</p>') && h.includes('id="ptm-f-lote"') && !h.includes(`data-ptm-otro="${CLAVE_MINI}"`))
    chk('… que avisa cómo poner SIN LOTE', h.includes('Si no tiene lote, escribí SIN LOTE.'))
    toque(S, { ptmSigno: '+' })
    const cajas = S.__els.get('ptm-f-cajas')
    cajas.value = '10'
    S.alEscribirTerminado({ target: cajas })
    S.alEscribirTerminado({ target: { value: 'carga_inicial', dataset: { ptmCampo: 'tipo' } } })
    S.alEscribirTerminado({ target: { value: 'Cajas viejas del depósito', dataset: { ptmCampo: 'motivo' } } })
    await S.guardarAjusteTerminado()
    chk('sin lote: falta el lote, y no llama', S.__rpc.length === 0 && S.__els.get('ptm-f-error').textContent === 'Falta: el lote (si no tiene, escribí SIN LOTE).', S.__els.get('ptm-f-error').textContent)
    S.alEscribirTerminado({ target: { value: 'x'.repeat(41), dataset: { ptmCampo: 'lote' } } })
    chk('un lote de más de 40: falta', S.faltaFormTerminado(S.estado.ptm.form).some(t => t.startsWith('un lote más corto')))
    S.alEscribirTerminado({ target: { value: ' 7001-a ', dataset: { ptmCampo: 'lote' } } })
    chk('"Queda: 0 → 10 cajas" para un lote nuevo', S.__els.get('ptm-f-queda').textContent === 'Queda: 0 → 10 cajas', S.__els.get('ptm-f-queda').textContent)
    await S.guardarAjusteTerminado()
    const p = S.__rpc[0]?.[1]
    chk('el lote nuevo viaja sin espacios y en mayúsculas (como lo guarda la base)', p?.p_lote === '7001-A' && p?.p_cajas === 10 && p?.p_motivo_tipo === 'carga_inicial', JSON.stringify(p))
  }

  // ── El error de la base, tal cual ────────────────────────────────────────
  {
    const S = await abierto()
    toque(S, { ptmLinea: CLAVE_MINI })
    S.abrirFormTerminado(CLAVE_MINI, '6201-1')
    Object.assign(S.estado.ptm.form, { signo: '-', cajas: 1, tipo: 'faltante_recuento', motivo: 'Rota' })
    S.__setRpc({ data: null, error: { message: 'No tenés permiso para ajustar stock en esa unidad.', code: 'P0001' } })
    await S.guardarAjusteTerminado()
    const err = S.__els.get('ptm-f-error')
    chk('el error de la base se muestra TAL CUAL', err.textContent === 'No tenés permiso para ajustar stock en esa unidad.' && err.hidden === false, err.textContent)
    chk('… la corrección sigue abierta, con lo escrito', S.estado.ptm.form?.motivo === 'Rota')
    chk('… y el botón se puede volver a tocar', S.__els.get('ptm-f-guardar').disabled === false && S.__els.get('ptm-f-guardar').textContent === 'Guardar')
    S.__setRpc(new Error())
    await S.guardarAjusteTerminado()
    chk('sin mensaje (se cortó la red): manda a mirar antes de reintentar', S.__els.get('ptm-f-error').textContent === S.TEXTO_ERROR_RED_PTM)
    S.alEscribirTerminado({ target: { value: 'Rota en el piso', dataset: { ptmCampo: 'motivo' } } })
    chk('escribir de nuevo borra el error de la base', S.__els.get('ptm-f-error').hidden === true)
  }

  // ── No se lee: lo dice ───────────────────────────────────────────────────
  {
    const S = sandbox()
    S.__setTablas(TABLAS())
    S.__setErrorTabla('stock_terminado_movimientos')
    await S.abrirTerminado()
    chk('si el libro no se puede leer, lo dice (y nada de números inventados)', aviso(S).hidden === false && /No se pudo leer el stock de producto terminado/.test(aviso(S).textContent) && lista(S) === '')
    S.__setErrorTabla(null)
    const ok = await S.cargarTerminado({ silencioso: true })
    chk('al reintentar, se dibuja', ok === true && lista(S).includes('Cucuruchón Mini'))
    S.__setErrorTabla('productos_terminados')
    const mal = await S.cargarTerminado({ silencioso: true })
    chk('un refresco que falla deja lo dibujado y avisa arriba', mal === false && lista(S).includes('Cucuruchón Mini') && S.__els.get('ptm-error').hidden === false)
  }

  // ── El refresco solo no pisa una corrección abierta ──────────────────────
  {
    const S = await abierto()
    S.estado.vista = 'terminado'
    chk('sin corrección abierta, el refresco puede repintar', S.hayFormularioAbierto() === false)
    S.abrirFormTerminado(CLAVE_MINI, '6201-1')
    chk('con una corrección abierta, el refresco no la pisa', S.hayFormularioAbierto() === true)
  }

  // ── Escapado: todo texto de la base ──────────────────────────────────────
  {
    const tablas = TABLAS()
    tablas.productos_terminados.find(p => p.id === 'pt-mini').nombre = 'Mini' + marca('producto')
    tablas.producto_presentaciones.find(p => p.id === 'pp-mini-c').nombre = 'Caja' + marca('presentacion')
    tablas.marcas_personalizadas.find(m => m.id === 'mk-aspen').nombre = 'ASPEN' + marca('cono')
    tablas.unidades_negocio.find(u => u.id === 'u-n').nombre = 'Nuss' + marca('fabrica')
    for (const m of tablas.stock_terminado_movimientos) {
      if (m.presentacion_id === 'pp-mini-c' && m.marca_id === 'mk-aspen') { m.lote = 'L' + marca('lote'); m.tipo = 'ajuste'; m.motivo = 'Mot' + marca('motivo') }
      if (m.presentacion_id === 'pp-mini' && m.lote === '6201-1') m.lote = 'K' + marca('lote2')
    }
    tablas.stock_terminado_movimientos.push({ id: 'zz', unidad_negocio_id: 'u-n', presentacion_id: 'pp-vaso', marca_id: null, lote: 'V', cajas: 1, tipo: 'tipo' + marca('tipo'), fecha: '2026-10-01' })
    const S = await abierto({ tablas })
    const clave = 'u-n|pp-mini-c|mk-aspen'
    toque(S, { ptmLinea: clave })
    toque(S, { ptmHistorial: clave })
    toque(S, { ptmCorregir: clave, lote: 'L' + marca('lote') })
    toque(S, { ptmLinea: 'u-n|pp-vaso|' })
    toque(S, { ptmHistorial: 'u-n|pp-vaso|' })
    // Un lote con marca en OTRA línea, sin la corrección abierta: su botón
    // "Corregir stock" lleva el lote en data-lote.
    toque(S, { ptmLinea: CLAVE_MINI })
    const h = lista(S)
    const campos = ['producto', 'presentacion', 'cono', 'fabrica', 'lote', 'motivo', 'tipo', 'lote2']
    chk('ningún texto de la base entra crudo', campos.every(c => !h.includes(marca(c))), campos.filter(c => h.includes(marca(c))).join(','))
    chk('… y todos aparecen escapados', campos.every(c => h.includes(escapada(c))), campos.filter(c => !h.includes(escapada(c))).join(','))
    chk('el lote en el data-lote del botón, escapado', h.includes(`data-lote="K&quot;&gt;${escapada('lote2')}"`) && !h.includes(`data-lote="K${marca('lote2')}"`))

    // Lo que escribe la persona vuelve al value del campo al redibujar.
    S.estado.ptm.form = null
    S.abrirFormTerminado(CLAVE_MINI, null)
    S.alEscribirTerminado({ target: { value: 'N' + marca('lote_nuevo'), dataset: { ptmCampo: 'lote' } } })
    S.alEscribirTerminado({ target: { value: 'M' + marca('motivo_escrito'), dataset: { ptmCampo: 'motivo' } } })
    S.pintarTerminado()
    const hf = lista(S)
    chk('el lote nuevo escrito vuelve escapado al campo', hf.includes(`value="N&quot;&gt;${escapada('lote_nuevo')}"`) && !hf.includes(marca('lote_nuevo')))
    chk('el motivo escrito vuelve escapado al campo', hf.includes(`value="M&quot;&gt;${escapada('motivo_escrito')}"`) && !hf.includes(marca('motivo_escrito')))
    // El mensaje de éxito dice el lote: escapado.
    Object.assign(S.estado.ptm.form, { signo: '+', cajas: 1, tipo: 'carga_inicial' })
    await S.guardarAjusteTerminado()
    const he = lista(S)
    chk('el mensaje de éxito con el lote, escapado', /<p class="ptm-exito" role="status">Listo: se sumó 1 caja al lote N/.test(he) && he.includes(escapada('lote_nuevo').toUpperCase().replace(/&AMP;|&LT;|&GT;|&QUOT;/g, x => x.toLowerCase())) && !he.includes(marca('lote_nuevo').toUpperCase()), he.slice(he.indexOf('ptm-exito'), he.indexOf('ptm-exito') + 160))
  }

  // ── El HTML, el CSS y lo conectado ───────────────────────────────────────
  chk('la vista existe, con su buscador, su lista y el link a la gestión', /<div class="vista-stock" id="vista-terminado" hidden>/.test(HTML) &&
    /id="buscador-terminado"/.test(HTML) && /<div class="ptm-lista" id="ptm-lista"><\/div>/.test(HTML) && /id="ptm-link-gestion"/.test(HTML))
  chk('mostrarVista muestra y esconde la vista de producto terminado', /document\.getElementById\('vista-terminado'\)\.hidden = id !== 'terminado'/.test(HTML))
  chk('mientras se mira, sin las pestañas de insumos', /body\.stock-en-terminado \.pestanas-stock \{ display: none !important; \}/.test(HTML) &&
    /if \(id === 'terminado'\) document\.body\?\.classList\.add\('stock-en-terminado'\)/.test(HTML))
  chk('lo negativo en rojo (--rojo-oscuro) y el lote negativo con fondo rojo suave', /\.ptm-neg \{ color: var\(--rojo-oscuro\); \}/.test(HTML) && /\.ptm-lote--neg \{ background: var\(--rojo-suave\); \}/.test(HTML))
  chk('la letra de la lista es más chica que la de los insumos (13 px las líneas)', /\.ptm-linea__nombre \{ font-size: 0\.8125rem;/.test(HTML))
  chk('los eventos de la lista están conectados', ["addEventListener('click', alTocarTerminado)", "addEventListener('input', alEscribirTerminado)",
    "addEventListener('change', alEscribirTerminado)", "addEventListener('submit', alMandarTerminado)", "getElementById('buscador-terminado').addEventListener('input', alBuscarTerminado)"].every(t => HTML.includes(t)))
  chk('el refresco solo relee el producto terminado cuando está a la vista', /if \(estado\.vista === 'terminado'\) tareas\.push\(cargarTerminado\(\{ silencioso: true \}\)\)/.test(HTML))
  chk('cambiar la barra de arriba lo repinta', /if \(estado\.ptm\?\.leido\) pintarTerminado\(\)/.test(HTML))
  chk('el campo de cajas se enlaza como entero', /enlazarCampoNumero\(cajas, \{ decimales: 0 \}\)/.test(HTML))

  fin()
})().catch(e => { console.error(e); process.exit(1) })
