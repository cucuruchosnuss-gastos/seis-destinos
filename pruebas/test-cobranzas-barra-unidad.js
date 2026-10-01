// La barra de unidad de negocio en Cobranzas — modulos/cobranzas.html (28/09/2026).
//
// Facu elige la fábrica UNA vez arriba (js/barra-unidad.js) y el listado de
// cobranzas muestra solo lo de esa fábrica. Una cobranza recién tiene unidad
// cuando se ASIENTA (en Administración); por eso, con una unidad elegida, se
// ven sus asentadas (y anuladas) y TODO lo que no tiene unidad —las por
// controlar, las asentadas viejas sin unidad—, marcado "Sin unidad".
//
// Se EJECUTAN las funciones reales —htmlFilaCobranza, renderizarListado,
// cargarCobranzas, cobranzasVisibles, filtroUnidadDeConsulta,
// alCambiarUnidadCob, htmlResumen, cargarResumen, soltarSeleccionFueraDelListado
// y el pasaFiltroUnidad REAL de js/barra-unidad.js (llega por el import)— con un
// document falso y un supabase falso que anota cada operación. Lo que se afirma:
//  - Todas: se ve todo, y cada asentada dice su unidad (celular y escritorio);
//    ninguna marca "Sin unidad" (sería ruido en cada por controlar);
//  - una unidad: solo lo suyo + lo sin unidad, marcado; una por controlar con
//    la unidad vieja de antes de reabrirse cuenta como sin unidad;
//  - la consulta lleva un or() que NO descarta los null, y solo con un uuid;
//  - cambiar la barra repinta en el acto y recarga con turno (una respuesta
//    vieja no se suma a la lista nueva);
//  - las cifras de cabecera son de la unidad elegida: resumen_cobranzas
//    recibe p_unidad desde el 28/09/2026 (con Todas, la clave no va);
//  - no hay ningún selector de unidad propio, y el formulario de CARGA es
//    idéntico al del baseline FIJO 5592f5a: el chofer no elige unidad.
//
// Archivo bajo prueba: ARCHIVO_TEST, o modulos/cobranzas.html.

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const { construirCon } = require('./sandbox')
const { fuenteNumeros } = require('./numeros-comun')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/cobranzas.html')
const FUENTE = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${FUENTE.length} bytes)`)
// El commit FIJO de antes de la barra en Cobranzas (nunca HEAD).
const BASELINE = '5592f5a'

let ok = 0
const fallas = []
function chk(nombre, condicion, detalle) {
  if (condicion) ok++
  else fallas.push(nombre + (detalle !== undefined ? ` — ${String(detalle).slice(0, 400)}` : ''))
}

const PRELUDIO = `
  ${fuenteNumeros()}
  var console = { error(){}, log(){}, warn(){} }
  function nuevoEl(id) {
    return {
      id, innerHTML: '', textContent: '', value: '', hidden: false, disabled: false, dataset: {},
      classList: { add(){}, remove(){}, toggle(){}, contains(){ return false } },
      addEventListener(){}, querySelectorAll: () => [], querySelector: () => null,
    }
  }
  var __els = new Map()
  var document = {
    getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) },
    querySelectorAll: () => [], querySelector: () => null,
  }
  var window = { scrollTo(){}, matchMedia: () => ({ matches: false }) }
  function hoyArgentina() { return '2026-09-28' }

  // --- supabase falso: cada consulta anota sus operaciones y contesta lo
  // que la suite ponga en la cola (una promesa por consulta, en orden).
  var __consultas = []
  var __respuestas = []
  var __rpcs = []
  var supabase = {
    rpc(nombre, params) { __rpcs.push({ nombre, params }); return Promise.resolve({ data: [{ por_controlar: 2, cantidad: 3, total: 1500 }], error: null }) },
    from(tabla) {
      const c = { tabla, ops: [] }
      __consultas.push(c)
      const q = {}
      for (const op of ['select', 'order', 'range', 'like', 'gte', 'lte', 'eq', 'in', 'or', 'is', 'maybeSingle']) {
        q[op] = (...a) => { c.ops.push([op, ...a]); return q }
      }
      q.then = (res, rej) => (__respuestas.length ? __respuestas.shift() : Promise.resolve({ data: [], error: null })).then(res, rej)
      return q
    },
  }

  var __llamadas = { errores: [], panelVacio: [] }
  function mostrarError(m){ __llamadas.errores.push(m) }
  function abrirDetalle(){}
  var __maestro = false
  function enModoMaestro(){ return __maestro }
  function pintarPanelVacio(t){ __llamadas.panelVacio.push(t) }
  var turnoResumen = 0
  var turnoListado = 0

  var estado = {
    miEmpleadoId: 'emp-1', miRolApp: 'usuario',
    misTareas: new Set(['cobranzas:cargar', 'cobranzas:ver_todo', 'cobranzas:procesar']),
    cobranzas: [], hayMas: false, cobranzaSeleccionadaId: null, linkDirecto: null, detalle: null,
    filtros: { texto: '', desde: '', hasta: '', estado: '', repartidor: '' },
    resumen: { cargando: true, etiqueta: 'Total del mes' },
    unidadElegida: null, unidadesBarra: [], listadoPedido: false,
  }
`

const FUNCIONES = [
  'escCob', 'formatearImporte', 'esFechaIso', 'formatearFechaCob', 'momentoArgentina', 'fechaDeMomentoAr',
  'normalizarCliente', 'tieneTarea', 'hayFiltrosPuestos',
  'htmlFilaCobranza', 'renderizarListado', 'soltarSeleccionFueraDelListado', 'cargarCobranzas',
  'unidadDeCobranza', 'cobranzasVisibles', 'pasaFiltroUnidad', 'filtroUnidadDeConsulta',
  'nombreUnidadElegida', 'pintarNotaUnidad', 'aplicarUnidadBarra', 'alCambiarUnidadCob',
  'parametrosResumen', 'cargarResumen', 'pintarResumen', 'numeroDeResumen', 'htmlResumen',
  // E-cheques y transferencias (30/09/2026)
  'sumaDeImportes', 'totalConTransferencias', 'htmlTransferenciasDetalle', 'htmlEtiquetaForma', 'totalesPorForma', 'sumaImportes', 'erroresDeEcheque', 'erroresDeTransferencia', 'pintarResumenFormas', 'htmlResumenFormas', 'usaCobranzaCompleta', 'echequeParaBase', 'transferenciaParaBase', 'textoOpcional', 'pintarFormasNuevas', 'htmlEcheckForm', 'htmlTransferenciaForm', 'cuentasParaElegir', 'htmlOpcionesCuentas', 'nombreUnidadCob', 'echequeDesdeBase', 'transferenciaDesdeBase', 'nombresDeCuentas', 'formasPresentes', 'htmlLineaFormas', 'cargarFormasDe', 'formasDeFila', 'htmlDatosCheque', 'textoDiasHastaPago', 'diasEntre',
]
const CONSTANTES = [
  'ZONA_AR', 'ACENTOS_COB', 'SIN_ACENTOS_COB', 'ETIQUETA_ESTADO_COBRANZA', 'ESTADOS_COBRANZA', 'PAGINA', 'UUID_COB',
  'puedeVerTodo',
]

function sandbox() {
  return construirCon(ARCHIVO, {
    preludio: PRELUDIO, funciones: FUNCIONES, constantes: CONSTANTES,
    retorno: `estado, __els, __llamadas, __consultas(){ return __consultas }, __rpcs(){ return __rpcs },
      __responder(p){ __respuestas.push(p) }, __setMaestro(v){ __maestro = v }`,
  })
}
const esperar = () => new Promise(r => setTimeout(r, 0))
function diferida() { let resolver; const p = new Promise(r => { resolver = r }); return { p, resolver } }

// Dos unidades de verdad (uuid) y un nombre malicioso para el escape.
const NUSS = '11111111-1111-4111-8111-111111111111'
const DOLCE = '22222222-2222-4222-8222-222222222222'
const MAL = '"><b data-xss="unidad">Nuss</b>'
const MAL_ESC = '&quot;&gt;&lt;b data-xss=&quot;unidad&quot;&gt;Nuss&lt;/b&gt;'
const UNIDADES = [{ id: NUSS, nombre: MAL, prefijo: 'N' }, { id: DOLCE, nombre: 'Dolce Pasta', prefijo: 'D' }]

const base = { cliente: 'Don Pepe', fecha: '2026-09-20', created_at: '2026-09-20T15:00:00Z', efectivo: 0, cantidad_cheques: 1, total: 1000, cargada_por_nombre: 'Mariano', editada: false }
const COBRANZAS = [
  { ...base, id: 'c-nuss', estado: 'procesada', unidad_negocio_id: NUSS, unidad_negocio_nombre: MAL },
  { ...base, id: 'c-dolce', estado: 'procesada', unidad_negocio_id: DOLCE, unidad_negocio_nombre: 'Dolce Pasta' },
  { ...base, id: 'c-vieja', estado: 'procesada', unidad_negocio_id: null, unidad_negocio_nombre: null },
  { ...base, id: 'c-controlar', estado: 'registrada', unidad_negocio_id: null, unidad_negocio_nombre: null },
  // Reabierta: la columna conserva la unidad de antes (reabrir_cobranza no la limpia).
  { ...base, id: 'c-reabierta', estado: 'registrada', unidad_negocio_id: DOLCE, unidad_negocio_nombre: 'Dolce Pasta' },
  { ...base, id: 'c-anulada-dolce', estado: 'anulada', unidad_negocio_id: DOLCE, unidad_negocio_nombre: 'Dolce Pasta' },
  { ...base, id: 'c-anulada-sin', estado: 'anulada', unidad_negocio_id: null, unidad_negocio_nombre: null },
]
const idsEn = (html) => [...String(html).matchAll(/data-cobranza="([^"]*)"/g)].map(m => m[1])
const filaDe = (html, id) => {
  const i = html.indexOf(`data-cobranza="${id}"`)
  if (i === -1) return ''
  const j = html.indexOf('data-cobranza="', i + 10)
  return html.slice(i, j === -1 ? undefined : j)
}

async function pruebas() {
  // ══ 1. TODAS ═══════════════════════════════════════════════════════════════
  {
    const S = sandbox()
    S.estado.cobranzas = COBRANZAS.slice()
    S.estado.unidadesBarra = UNIDADES
    S.renderizarListado()
    const html = S.__els.get('cob-lista').innerHTML
    chk('Todas: se ven las siete', idsEn(html).length === 7, idsEn(html))
    chk('Todas: la asentada de Nuss dice su unidad, escapada (celular)',
      /class="cob-fila__unidad">/.test(filaDe(html, 'c-nuss')) && filaDe(html, 'c-nuss').includes(MAL_ESC) && !html.includes(MAL))
    chk('Todas: la asentada de Nuss dice su unidad en la tabla de escritorio, escapada',
      new RegExp(`cob-celda--cliente">Don Pepe<span class="cob-unidad-tabla">${MAL_ESC.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</span>`).test(filaDe(html, 'c-nuss')), filaDe(html, 'c-nuss'))
    chk('Todas: la anulada de Dolce Pasta también dice su unidad', /cob-fila__unidad">Dolce Pasta/.test(filaDe(html, 'c-anulada-dolce')))
    chk('Todas: la por controlar reabierta NO muestra la unidad vieja', !/Dolce Pasta/.test(filaDe(html, 'c-reabierta')), filaDe(html, 'c-reabierta'))
    chk('Todas: ninguna marca "Sin unidad" (sería ruido en cada por controlar)', !/data-sin-unidad="(fila|tabla)"/.test(html))
    chk('Todas: la tabla de escritorio sigue con 7 celdas por fila',
      (filaDe(html, 'c-nuss').match(/class="cob-celda/g) || []).length === 7)
    chk('Todas: la nota de la unidad está oculta', S.__els.get('cob-nota-unidad').hidden === true && S.__els.get('cob-nota-unidad').textContent === '')
  }

  // ══ 2. UNA UNIDAD ══════════════════════════════════════════════════════════
  {
    const S = sandbox()
    S.estado.cobranzas = COBRANZAS.slice()
    S.estado.unidadesBarra = UNIDADES
    S.estado.unidadElegida = DOLCE
    S.renderizarListado()
    const html = S.__els.get('cob-lista').innerHTML
    const ids = idsEn(html)
    chk('Dolce Pasta: se ven las suyas y las sin unidad',
      JSON.stringify(ids) === JSON.stringify(['c-dolce', 'c-vieja', 'c-controlar', 'c-reabierta', 'c-anulada-dolce', 'c-anulada-sin']), ids)
    chk('Dolce Pasta: la asentada de Nuss NO se ve', !ids.includes('c-nuss'))
    chk('Dolce Pasta: lo sin unidad dice "Sin unidad" (celular), las cuatro',
      ['c-vieja', 'c-controlar', 'c-reabierta', 'c-anulada-sin'].every(id => /<span class="cob-unidad-sin" data-sin-unidad="fila">Sin unidad<\/span>/.test(filaDe(html, id))))
    chk('Dolce Pasta: lo sin unidad dice "sin unidad" también en la tabla de escritorio',
      ['c-vieja', 'c-controlar'].every(id => /cob-celda--cliente">Don Pepe<span class="cob-unidad-tabla cob-unidad-tabla--sin" data-sin-unidad="tabla">sin unidad<\/span>/.test(filaDe(html, id))))
    chk('Dolce Pasta: la suya NO dice "Sin unidad"', !/data-sin-unidad/.test(filaDe(html, 'c-dolce')))
    const nota = S.__els.get('cob-nota-unidad')
    chk('Dolce Pasta: la nota dice por qué se ven las sin unidad, con el nombre',
      nota.hidden === false && /Se ven las cobranzas de Dolce Pasta y las que todavía no tienen unidad/.test(nota.textContent), nota.textContent)
    chk('Dolce Pasta: estado.cobranzas no se toca (se filtra al armar la lista)', S.estado.cobranzas.length === 7)
  }
  {
    // Una unidad con nombre malicioso: la nota va por textContent (no escapa, no interpreta).
    const S = sandbox()
    S.estado.cobranzas = []
    S.estado.unidadesBarra = UNIDADES
    S.estado.unidadElegida = NUSS
    S.renderizarListado()
    chk('vacío con unidad: dice "No hay cobranzas de <unidad> ni sin unidad"',
      S.__els.get('cob-lista-vacia').hidden === false && S.__els.get('cob-lista-vacia').textContent === `No hay cobranzas de ${MAL} ni sin unidad.`,
      S.__els.get('cob-lista-vacia').textContent)
    S.estado.filtros.texto = 'pepe'
    S.renderizarListado()
    chk('vacío con unidad y filtros: lo dice', /ni sin unidad con esos filtros\.$/.test(S.__els.get('cob-lista-vacia').textContent))
    const S2 = sandbox()
    S2.renderizarListado()
    chk('vacío con Todas: el texto de siempre', /^Todavía no se cargó ninguna cobranza/.test(S2.__els.get('cob-lista-vacia').textContent))
  }

  // ══ 3. LA CONSULTA ════════════════════════════════════════════════════════
  {
    const S = sandbox()
    chk('filtro de consulta: Todas → ninguno', S.filtroUnidadDeConsulta(null) === null)
    chk('filtro de consulta: un id que no es uuid → ninguno (no se inyecta en PostgREST)',
      S.filtroUnidadDeConsulta('x,estado.eq.anulada') === null)
    chk('filtro de consulta: la unidad, los null y las por controlar',
      S.filtroUnidadDeConsulta(NUSS) === `unidad_negocio_id.eq.${NUSS},unidad_negocio_id.is.null,estado.eq.registrada`)

    S.estado.unidadElegida = NUSS
    S.__responder(Promise.resolve({ data: COBRANZAS.slice(), error: null }))
    await S.cargarCobranzas({ reiniciar: true })
    const q = S.__consultas().find(c => c.tabla === 'v_cobranzas')
    chk('con unidad: el listado lleva el or() (no un .eq() que descarte los null)',
      q.ops.some(o => o[0] === 'or' && o[1] === S.filtroUnidadDeConsulta(NUSS)) && !q.ops.some(o => o[0] === 'eq' && o[1] === 'unidad_negocio_id'), JSON.stringify(q.ops))
    chk('con unidad: lo que el servidor devuelva de otra unidad igual no se dibuja (red)',
      !idsEn(S.__els.get('cob-lista').innerHTML).includes('c-dolce') && idsEn(S.__els.get('cob-lista').innerHTML).includes('c-nuss'))
    chk('con unidad: hayMas se mide sobre la página que llegó, no sobre lo filtrado', S.estado.hayMas === false && S.estado.cobranzas.length === 7)

    const T = sandbox()
    await T.cargarCobranzas({ reiniciar: true })
    const qt = T.__consultas().find(c => c.tabla === 'v_cobranzas')
    chk('con Todas: sin or()', !qt.ops.some(o => o[0] === 'or'))
  }

  // ══ 4. EL TURNO ═══════════════════════════════════════════════════════════
  {
    const S = sandbox()
    const vieja = diferida()
    S.__responder(vieja.p)
    const p1 = S.cargarCobranzas({ reiniciar: true })
    S.__responder(Promise.resolve({ data: [COBRANZAS[1]], error: null }))
    await S.cargarCobranzas({ reiniciar: true })
    vieja.resolver({ data: [COBRANZAS[0], COBRANZAS[2]], error: null })
    await p1
    chk('turno: la respuesta vieja no se suma a la lista nueva',
      JSON.stringify(S.estado.cobranzas.map(c => c.id)) === JSON.stringify(['c-dolce']), S.estado.cobranzas.map(c => c.id))
    // Un error viejo tampoco avisa encima de la lista nueva.
    const S2 = sandbox()
    const mala = diferida()
    S2.__responder(mala.p)
    const p2 = S2.cargarCobranzas({ reiniciar: true })
    S2.__responder(Promise.resolve({ data: [], error: null }))
    await S2.cargarCobranzas({ reiniciar: true })
    mala.resolver({ data: null, error: { message: 'sin red' } })
    await p2
    chk('turno: un error de una lista vieja no se muestra', S2.__llamadas.errores.length === 0, S2.__llamadas.errores)
  }

  // ══ 5. CAMBIAR LA BARRA ═══════════════════════════════════════════════════
  {
    const S = sandbox()
    S.estado.cobranzas = COBRANZAS.slice()
    // Antes del primer listado: se guarda, no se recarga (el listado sale con ella).
    S.alCambiarUnidadCob({ elegida: DOLCE, unidades: UNIDADES })
    chk('antes del primer listado: guarda la unidad y no consulta',
      S.estado.unidadElegida === DOLCE && S.__consultas().length === 0 && S.estado.unidadesBarra.length === 2)
    S.estado.listadoPedido = true
    const lenta = diferida()
    S.__responder(lenta.p)
    S.alCambiarUnidadCob({ elegida: NUSS, unidades: UNIDADES })
    // Repinta EN EL ACTO con lo que ya estaba, antes de que llegue la consulta.
    const enElActo = idsEn(S.__els.get('cob-lista').innerHTML)
    chk('cambio: repinta en el acto (sin Dolce Pasta, con las sin unidad)',
      enElActo.includes('c-nuss') && !enElActo.includes('c-dolce') && enElActo.includes('c-controlar'), enElActo)
    const q = S.__consultas().filter(c => c.tabla === 'v_cobranzas')
    chk('cambio: pide la lista nueva con la unidad nueva', q.length === 1 && q[0].ops.some(o => o[0] === 'or' && String(o[1]).includes(NUSS)))
    chk('cambio: recalcula las cifras de cabecera', S.__rpcs().some(r => r.nombre === 'resumen_cobranzas'))
    lenta.resolver({ data: [COBRANZAS[0]], error: null })
    await esperar(); await esperar()
    const antes = S.__consultas().length
    S.alCambiarUnidadCob({ elegida: NUSS, unidades: UNIDADES })
    chk('misma unidad: no recarga nada', S.__consultas().length === antes)
    S.alCambiarUnidadCob({ elegida: null, unidades: UNIDADES })
    chk('volver a Todas: recarga sin or()', S.__consultas().length === antes + 1 &&
      !S.__consultas()[S.__consultas().length - 1].ops.some(o => o[0] === 'or'))
    chk('aplicar: un estado raro de la barra no rompe (sin unidades → [])',
      S.aplicarUnidadBarra(undefined) === false && Array.isArray(S.estado.unidadesBarra) && S.estado.unidadesBarra.length === 0)
  }
  {
    // ESCRITORIO: la cobranza abierta en el panel es de otra unidad → el panel se vacía.
    const S = sandbox()
    S.__setMaestro(true)
    S.estado.cobranzas = COBRANZAS.slice()
    S.estado.cobranzaSeleccionadaId = 'c-dolce'
    S.estado.listadoPedido = true
    S.alCambiarUnidadCob({ elegida: NUSS, unidades: UNIDADES })
    chk('escritorio: la abierta de otra unidad suelta el panel', S.estado.cobranzaSeleccionadaId === null && S.__llamadas.panelVacio.length === 1)
    const S2 = sandbox()
    S2.__setMaestro(true)
    S2.estado.cobranzas = COBRANZAS.slice()
    S2.estado.cobranzaSeleccionadaId = 'c-controlar'
    S2.estado.listadoPedido = true
    S2.alCambiarUnidadCob({ elegida: NUSS, unidades: UNIDADES })
    chk('escritorio: una por controlar abierta sigue en el panel con cualquier unidad', S2.estado.cobranzaSeleccionadaId === 'c-controlar')
  }

  // ══ 6. LAS CIFRAS DE CABECERA ═════════════════════════════════════════════
  {
    const S = sandbox()
    const r = { etiqueta: 'Total del mes', estadoFiltro: null, desdeMes: '2026-09-01', porControlar: 2, cantidad: 3, total: 1500 }
    const h = S.htmlResumen(r)
    chk('las cifras ya no aclaran "de todas las unidades"', !/todas las unidades/.test(h), h)
    S.estado.unidadElegida = NUSS
    await S.cargarResumen()
    chk('cargarResumen: con una unidad, cada llamada manda p_unidad', S.__rpcs().length > 0 && S.__rpcs().every(x => x.params.p_unidad === NUSS),
      JSON.stringify(S.__rpcs().map(x => x.params)))
    const antes = S.__rpcs().length
    S.estado.unidadElegida = null
    await S.cargarResumen()
    chk('cargarResumen: con Todas, sin p_unidad', S.__rpcs().slice(antes).every(x => !('p_unidad' in x.params)))
    chk('parametrosResumen: algo que no es un uuid no viaja', !('p_unidad' in S.parametrosResumen({}, '2026-09-28', 'todas').base))
  }

  // ══ 7. EL FUENTE ═══════════════════════════════════════════════════════════
  {
    chk('import: trae la barra de js/barra-unidad.js',
      /import \{ unidadesDeLaBarra, alCambiarUnidad, pasaFiltroUnidad \} from '\.\.\/js\/barra-unidad\.js'/.test(FUENTE))
    const ini = FUENTE.indexOf('async function init()')
    const cuerpo = FUENTE.slice(ini, FUENTE.indexOf('\n    init()', ini))
    chk('init: se suscribe a los cambios de la barra', /alCambiarUnidad\(alCambiarUnidadCob\)/.test(cuerpo))
    chk('init: pide la barra ANTES de las otras cargas (en paralelo)',
      cuerpo.indexOf('unidadesDeLaBarra()') !== -1 && cuerpo.indexOf('unidadesDeLaBarra()') < cuerpo.indexOf('cargarBancos()'))
    chk('init: el primer listado espera a la barra con un tope, no para siempre',
      /await Promise\.race\(\[promesaBarra, new Promise\(r => setTimeout\(r, MS_ESPERA_BARRA\)\)\]\)/.test(cuerpo) &&
      cuerpo.indexOf('Promise.race') < cuerpo.indexOf('refrescarListado()'))
    chk('init: listadoPedido se marca antes del primer listado',
      cuerpo.indexOf('estado.listadoPedido = true') !== -1 && cuerpo.indexOf('estado.listadoPedido = true') < cuerpo.indexOf('refrescarListado()'))
    chk('la barra se carga en el <head> (el script del componente)', /<script type="module" src="\.\.\/js\/barra-unidad\.js"><\/script>/.test(FUENTE))
    chk('no hay ningún selector de unidad propio (lo decide la barra de arriba)',
      !/id="cob-filtro-unidad"|cob-dialogo-unidad|id="cob-chips-unidad"/.test(FUENTE))

    // El formulario de CARGA, idéntico al del baseline fijo: el chofer no elige unidad.
    let baseline = ''
    try {
      baseline = execSync(`git show ${BASELINE}:modulos/cobranzas.html`, { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    } catch { baseline = '' }
    // Las dos piezas que sumó el 30/09/2026 (e-cheques y transferencias: el
    // resumen de las cuatro formas y su sección) son de Administración y no
    // piden unidad: se sacan para comparar (test-cobranzas-formas.js las prueba).
    const sinFormas = (t) => t
      .replace(/\n\n {6}<!-- Arriba de la cobranza, el total de las cuatro formas[\s\S]*?<div class="cob-resumen-formas" id="cob-resumen-formas" hidden><\/div>/, '')
      .replace(/\n\n {6}<!-- E-cheques y transferencias \(30\/09\/2026\)[\s\S]*?<button type="button" class="cob-btn cob-btn--chico" id="cob-btn-transferencia">\+ Agregar transferencia<\/button>\n {8}<\/div>\n {6}<\/div>/, '')
    const form = (t) => { const i = t.indexOf('<div id="cob-vista-form" hidden>'); return i === -1 ? '' : sinFormas(t.slice(i, t.indexOf('<!-- ══ BARRA FIJA', i))) }
    chk(`baseline ${BASELINE}: se pudo leer (si no, esta verificación no mide nada)`, baseline.length > 100000 && form(baseline).length > 1000)
    chk(`el formulario de carga es IDÉNTICO al de ${BASELINE} (no pide unidad)`, form(baseline) === form(FUENTE) && form(FUENTE).length > 1000)
    chk('el formulario de carga no nombra ninguna unidad', !/unidad/i.test(form(FUENTE)))
  }

  for (const f of fallas) console.log('  ✗ ' + f)
  const total = ok + fallas.length
  console.log(`${ok}/${total} ${fallas.length ? 'ROJO' : 'verde'}`)
  process.exit(fallas.length ? 1 : 0)
}

pruebas().catch(e => { console.log('EXCEPCIÓN: ' + (e && e.stack || e)); console.log('ROJO'); process.exit(1) })
