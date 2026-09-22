// Cobranzas, septiembre 2026 (segunda tanda del día):
//  1. LOS NOMBRES DE LOS ESTADOS EN PANTALLA: "Por controlar" / "Asentada" /
//     "Anulada". En la BASE siguen siendo registrada / procesada / anulada, y
//     eso es lo que viaja al filtro, a las RPCs y a resumen_cobranzas.
//  2. LAS CIFRAS DE CABECERA del listado, de resumen_cobranzas(): nunca de
//     sumar filas, nunca "$ 0,00" cuando no se sabe, nunca el número viejo
//     mientras carga, y una respuesta vieja no pisa la nueva.
//  3. LA TARJETA PLEGADA COMPACTA del formulario de carga.
//
// Se EJECUTAN las funciones reales (renders, cargarResumen, cargarCobranzas,
// accionSimple, conectarDetalle) con un document falso y un supabase falso
// que anota cada llamada. Lo único que se mira en el fuente es lo que un render
// no puede mostrar: el CSS, y que ningún texto de pantalla vuelva a decir
// "registrada" / "procesada".
//
// Archivo bajo prueba: ARCHIVO_TEST, o modulos/cobranzas.html.

const fs = require('fs')
const path = require('path')
const { construirCon } = require('./sandbox')
// Las funciones de números de js/utils.js (leerNumeroAr, ponerNumero…),
// con su código REAL: el módulo las importa desde el 21/09/2026.
const { fuenteNumeros } = require('./numeros-comun')
const { bloquesScript, analizar } = require('./escaner-interpolaciones')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/cobranzas.html')

// El sub-proceso VERIFICA que leyó el archivo que el runner le pasó.
const FUENTE = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${FUENTE.length} bytes)`)

let ok = 0
const fallas = []
function chk(nombre, condicion, detalle) {
  if (condicion) ok++
  else fallas.push(nombre + (detalle !== undefined ? ` — ${String(detalle).slice(0, 400)}` : ''))
}

const PRELUDIO = `
  ${fuenteNumeros()}
  var console = { error(){}, log(){}, warn(){} }

  // --- DOM falso -----------------------------------------------------------
  // querySelectorAll('[data-estado]') lee los botones del innerHTML propio,
  // así se puede TOCAR un segmento como lo haría una persona.
  function nuevoEl(id) {
    return {
      id, innerHTML: '', textContent: '', value: '', hidden: false, disabled: false, dataset: {},
      classList: { add(){}, remove(){}, toggle(){}, contains(){ return false } },
      setAttribute(){}, removeAttribute(){},
      __clicks: [],
      addEventListener(t, f) { if (t === 'click') this.__clicks.push(f) },
      querySelectorAll(sel) {
        if (sel !== '[data-estado]') return []
        return [...this.innerHTML.matchAll(/<button[^>]*data-estado="([^"]*)"[^>]*>/g)].map(m => {
          const b = nuevoEl('segmento')
          b.dataset.estado = m[1]
          return b
        })
      },
    }
  }
  var __els = new Map()
  var document = {
    getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) },
    querySelectorAll: () => [],
    querySelector: () => null,
  }
  var __segmentos = []
  // renderizarChipsEstado conecta los botones que devuelve querySelectorAll:
  // se guardan para poder tocarlos.
  var __qsa = nuevoEl('x').querySelectorAll
  document.getElementById('cob-chips-estado').querySelectorAll = function (sel) {
    const r = __qsa.call(this, sel)
    __segmentos = r
    return r
  }
  var window = { scrollTo(){}, matchMedia: () => ({ matches: false }) }

  // --- hoy fijo --------------------------------------------------------------
  var __hoy = '2026-09-21'
  function hoyArgentina() { return __hoy }

  // --- supabase falso --------------------------------------------------------
  // rpc: cada llamada se anota y devuelve la promesa que la suite decida.
  var __rpcs = []
  var __rpcImpl = async (nombre, params) => ({ data: [{ por_controlar: 0, cantidad: 0, total: 0 }], error: null })
  var __consultas = []
  var supabase = {
    rpc(nombre, params) { __rpcs.push({ nombre, params }); return __rpcImpl(nombre, params) },
    from(tabla) {
      const c = { tabla, ops: [] }
      __consultas.push(c)
      const q = {}
      for (const op of ['select', 'order', 'range', 'like', 'gte', 'lte', 'eq', 'in', 'maybeSingle']) {
        q[op] = (...a) => { c.ops.push([op, ...a]); return q }
      }
      q.then = (res) => Promise.resolve({ data: [], error: null }).then(res)
      return q
    },
  }

  // --- lo que estas funciones llaman y acá no importa ------------------------
  var __llamadas = { exitos: [], errores: [], abrirDetalle: 0 }
  function mostrarExito(m){ __llamadas.exitos.push(m) } function mostrarError(m){ __llamadas.errores.push(m) }
  function cerrarModalMotivo(){} function abrirModalMotivo(){} function abrirFormularioEdicion(){}
  async function abrirDetalle(){ __llamadas.abrirDetalle++ }
  function renderizarListado(){}
  async function urlDeFoto(){ return null } function abrirVisor(){}
  var turnoResumen = 0

  var estado = {
    miEmpleadoId: 'emp-1', miRolApp: 'usuario',
    misTareas: new Set(['cobranzas:cargar', 'cobranzas:ver_todo', 'cobranzas:procesar', 'cobranzas:editar_anular']),
    bancos: new Map([['007', 'BANCO DE GALICIA Y BUENOS AIRES S.A.U.']]),
    cobranzas: [], hayMas: false, cobranzaSeleccionadaId: null, linkDirecto: null,
    filtros: { texto: '', desde: '', hasta: '', estado: '', repartidor: '' },
    resumen: { cargando: true, etiqueta: 'Total del mes' },
    detalle: null,
  }
`

const FUNCIONES = [
  'escCob', 'formatearImporte', 'esFechaIso', 'formatearFechaCob', 'momentoArgentina', 'fechaDeMomentoAr',
  'normalizarCliente', 'nombreBanco', 'nombreBancoDe', 'tieneTarea', 'diasEntre',
  // estados
  'renderizarChipsEstado', 'htmlFilaCobranza', 'htmlDetalle', 'htmlAccionesDetalle', 'htmlHistorial',
  'htmlChequeDetalle', 'htmlDatosCheque', 'textoDiasHastaPago', 'textoSalidaCheque', 'textoHistorialCheque',
  'resumirCambios', 'htmlLinkChequeEnCartera', 'conectarDetalle', 'accionSimple',
  // cabecera
  'parametrosResumen', 'cargarResumen', 'pintarResumen', 'numeroDeResumen', 'htmlResumen',
  'cargarCobranzas', 'refrescarListado',
  // tarjeta
  'htmlTarjetaCheque', 'escribirImporteEnCampo', 'estadoRenglon', 'erroresDeCheque', 'chequeParaBase', 'dvBcra',
  'textoOpcional', 'origenDatosDe',
]
const CONSTANTES = [
  'ZONA_AR', 'ACENTOS_COB', 'SIN_ACENTOS_COB', 'ETIQUETA_ESTADO_COBRANZA', 'ESTADOS_COBRANZA', 'PAGINA',
  'ETIQUETA_ESTADO_CHEQUE', 'DIAS_MAXIMO_DIFERIDO', 'puedeCargar', 'puedeVerTodo', 'puedeProcesar', 'puedeEditarAnular', 'esPropia',
  'puedeVerCartera',
]

function sandbox() {
  return construirCon(ARCHIVO, {
    preludio: PRELUDIO, funciones: FUNCIONES, constantes: CONSTANTES,
    retorno: `estado, __els, __llamadas,
      __rpcs(){ return __rpcs }, __limpiarRpcs(){ __rpcs = [] },
      __setRpc(f){ __rpcImpl = f }, __consultas(){ return __consultas },
      __segmentos(){ return __segmentos }, __setHoy(h){ __hoy = h }`,
  })
}

const esperar = () => new Promise(r => setTimeout(r, 0))
function diferida() { let resolver; const p = new Promise(r => { resolver = r }); return { p, resolver } }
const htmlDe = (S, id) => (S.__els.get(id) || { innerHTML: '' }).innerHTML

// El texto que una persona VE o que un lector de pantalla LEE: el contenido
// fuera de las etiquetas y los atributos aria-label / title / placeholder /
// alt. NO los class ni los data-*: ahí "registrada" es un valor de la base.
function textoVisible(html) {
  const attrs = [...html.matchAll(/\s(?:aria-label|title|placeholder|alt)="([^"]*)"/g)].map(m => m[1])
  const texto = html.replace(/<[^>]*>/g, ' ')
  return (texto + ' ' + attrs.join(' ')).replace(/\s+/g, ' ')
}
const PALABRAS_VIEJAS = /registrad|procesad|procesar/i

async function pruebas() {
  // ══ 1. NOMBRES DE LOS ESTADOS ═════════════════════════════════════════════
  {
    const S = sandbox()
    S.renderizarChipsEstado()
    const seg = htmlDe(S, 'cob-chips-estado')
    const opciones = [...seg.matchAll(/data-estado="([^"]*)">([^<]*)</g)].map(m => [m[1], m[2]])
    chk('segmentado: Por controlar / Asentadas / Anuladas / Todas, en ese orden',
      opciones.map(o => o[1]).join('|') === 'Por controlar|Asentadas|Anuladas|Todas', JSON.stringify(opciones))
    chk('segmentado: los valores que viajan son los de la BASE (registrada / procesada / anulada / vacío)',
      opciones.map(o => o[0]).join('|') === 'registrada|procesada|anulada|', JSON.stringify(opciones))
    chk('segmentado: ningún texto dice registrada/procesada', !PALABRAS_VIEJAS.test(textoVisible(seg)), textoVisible(seg))

    const base = { id: 'c1', empleado_id: 'emp-1', cliente: 'Cliente', fecha: '2026-09-17', total: 1500, efectivo: 500,
      cantidad_cheques: 2, total_cheques: 1000, created_at: '2026-09-17T12:00:00Z', cargada_por_nombre: 'X' }
    const etiqueta = (h) => (h.match(/cob-fila__estado--[a-z]+">([^<]*)</) || [])[1]
    chk('fila: registrada se lee "Por controlar"', etiqueta(S.htmlFilaCobranza({ ...base, estado: 'registrada' })) === 'Por controlar')
    chk('fila: procesada se lee "Asentada"', etiqueta(S.htmlFilaCobranza({ ...base, estado: 'procesada' })) === 'Asentada')
    chk('fila: anulada se lee "Anulada"', etiqueta(S.htmlFilaCobranza({ ...base, estado: 'anulada' })) === 'Anulada')
    chk('fila: la CLASE sigue siendo el valor de la base (la franja sale de ahí)',
      /cob-fila--registrada/.test(S.htmlFilaCobranza({ ...base, estado: 'registrada' })) &&
      /cob-fila--procesada/.test(S.htmlFilaCobranza({ ...base, estado: 'procesada' })))

    const hist = [
      { accion: 'alta', empleado_id: 'e1', created_at: '2026-09-17T13:00:00Z' },
      { accion: 'procesada', empleado_id: 'e1', created_at: '2026-09-18T13:00:00Z' },
      { accion: 'reabierta', empleado_id: 'e1', created_at: '2026-09-19T13:00:00Z', motivo: 'faltaba un cheque' },
      { accion: 'anulada', empleado_id: 'e1', created_at: '2026-09-20T13:00:00Z', motivo: 'duplicada' },
    ]
    const nombres = new Map([['e1', 'Mariano']])
    const htmlHist = S.htmlHistorial(hist, nombres)
    chk('historial: la acción "procesada" se lee "Asentada · <nombre> · <fecha>"',
      /<div class="cob-hist__linea">Asentada · Mariano · 18\/9 /.test(htmlHist), htmlHist.slice(0, 600))
    chk('historial: "reabierta" se lee "Reabierta"', /<div class="cob-hist__linea">Reabierta · Mariano/.test(htmlHist))

    for (const est of ['registrada', 'procesada', 'anulada']) {
      const d = {
        cabecera: { ...base, estado: est, procesada_por_nombre: est === 'procesada' ? 'Emanuel' : null, anulada_por_nombre: est === 'anulada' ? 'Franco' : null, motivo_anulacion: est === 'anulada' ? 'duplicada' : null },
        cheques: [], fotos: [], historial: hist, nombres,
      }
      const h = S.htmlDetalle(d)
      chk(`detalle ${est}: ningún texto visible dice registrada/procesada/procesar`,
        !PALABRAS_VIEJAS.test(textoVisible(h)), (textoVisible(h).match(/.{0,40}(registrad|procesad|procesar).{0,40}/i) || [])[0])
    }
    const dAsentada = S.htmlDetalle({ cabecera: { ...base, estado: 'procesada', procesada_por_nombre: 'Emanuel' }, cheques: [], fotos: [], historial: [], nombres })
    chk('detalle: el chip dice "Asentada" y el dato "Asentada por"',
      /class="cob-estado cob-estado--procesada">Asentada</.test(dAsentada) &&
      /cob-dato__k">Asentada por<\/span>\s*<span class="cob-dato__v">Emanuel/.test(dAsentada))

    const acciones = S.htmlAccionesDetalle({ ...base, estado: 'registrada' })
    chk('acciones: el botón dice "Controlada, asentar" y conserva su id',
      /<button type="button" class="cob-btn cob-btn--primario" id="cob-btn-procesar">Controlada, asentar<\/button>/.test(acciones), acciones)

    // Tocar "Controlada, asentar" llama a la RPC de la BASE con el id, y el
    // mensaje de éxito habla de asentar.
    S.estado.detalle = { cabecera: { ...base, estado: 'registrada' }, cheques: [], fotos: [], historial: [], nombres }
    S.conectarDetalle()
    const btn = S.__els.get('cob-btn-procesar')
    chk('acciones: el botón tiene su listener', btn && btn.__clicks.length === 1)
    S.__limpiarRpcs()
    await btn.__clicks[0]()
    await esperar()
    const rpcAsentar = S.__rpcs().find(r => r.nombre !== 'resumen_cobranzas')
    chk('asentar: llama a marcar_cobranza_procesada (la base no conoce "asentada") con p_id',
      rpcAsentar && rpcAsentar.nombre === 'marcar_cobranza_procesada' && rpcAsentar.params.p_id === 'c1', JSON.stringify(S.__rpcs()))
    chk('asentar: el mensaje dice "Cobranza asentada."', S.__llamadas.exitos.includes('Cobranza asentada.'), JSON.stringify(S.__llamadas.exitos))
    chk('asentar: después se recalculan las cifras de cabecera',
      S.__rpcs().some(r => r.nombre === 'resumen_cobranzas'), JSON.stringify(S.__rpcs().map(r => r.nombre)))

    // "Dar salida" y "Volver a cartera" se mudaron a cheques.html
    // (22/09/2026): ni una cobranza asentada con un cheque en cartera tiene
    // acá un botón de salida.
    const conCheque = S.htmlDetalle({ cabecera: { ...base, estado: 'procesada' }, nombres, fotos: [], historial: [],
      cheques: [{ id: 'k1', estado: 'en_cartera', banco_codigo: '007', numero: '00000001', tipo: 'comun', fecha_emision: '2026-09-17', importe: 1 }] })
    chk('detalle asentado con un cheque en cartera: sin botón de salida (se da en Cheques)',
      !/data-salio|data-dar-salida|data-volver-cartera/.test(conCheque) && /Ver en Cheques/.test(conCheque))
  }

  // ══ 1b. NINGÚN TEXTO DE PANTALLA DEL FUENTE DICE LAS PALABRAS VIEJAS ══════
  // Los strings y templates del <script> (no los comentarios) y el HTML
  // estático (sin <style> ni comentarios). Se permiten SOLO los valores de la
  // base y los nombres técnicos, exactos y con su motivo.
  {
    const PERMITIDOS = new Map([
      ['registrada', 'valor de la base: estado de la cobranza'],
      ['procesada', 'valor de la base: estado y acción del historial'],
      ['procesar', 'clave de la tarea cobranzas:procesar'],
      ['marcar_cobranza_procesada', 'nombre de la RPC'],
      ['cob-btn-procesar', 'id del botón (no se ve); el control test exige que no cambie'],
    ])
    // Un string o template que arma HTML se mira por su texto VISIBLE: el id
    // "cob-btn-procesar" de un botón no es algo que alguien lea.
    const visible = (s) => s.includes('<') ? textoVisible(s) : s
    const malos = []
    const bloques = bloquesScript(FUENTE)
    for (const b of bloques) {
      const r = analizar(b.codigo, b.ini, FUENTE)
      for (const [a, z] of r.rangos) {
        const q = b.codigo[a]
        if (q !== "'" && q !== '"') continue
        const s = b.codigo.slice(a + 1, z - 1)
        if (PALABRAS_VIEJAS.test(visible(s)) && !PERMITIDOS.has(s)) malos.push(s)
      }
      for (const t of r.templates) {
        const s = t.partes.join(' ')
        if (PALABRAS_VIEJAS.test(visible(s)) && !PERMITIDOS.has(s)) malos.push(s.slice(0, 80))
      }
    }
    let estatico = ''
    let desde = 0
    for (const b of bloques) { estatico += FUENTE.slice(desde, b.ini) + '\n'; desde = b.fin }
    estatico += FUENTE.slice(desde)
    estatico = estatico.replace(/<style>[\s\S]*?<\/style>/, '').replace(/<!--[\s\S]*?-->/g, '')
    const enEstatico = textoVisible(estatico).match(/.{0,30}(registrad|procesad|procesar).{0,30}/gi) || []
    chk('fuente: ningún string ni template del script dice registrada/procesada/procesar (salvo valores de la base)',
      malos.length === 0, malos.join(' | '))
    chk('fuente: el HTML estático tampoco', enEstatico.length === 0, enEstatico.join(' | '))
  }

  // ══ 2. CIFRAS DE CABECERA ═════════════════════════════════════════════════
  // Parámetros: los MISMOS filtros del listado, por nombre, con la clave
  // normalizada igual que el listado y el estado en su valor de la base.
  {
    const S = sandbox()
    const p = S.parametrosResumen({ texto: '  Don Pépe! ', desde: '', hasta: '', estado: 'procesada', repartidor: 'emp-9' }, '2026-09-21')
    chk('params: sin fecha, "por controlar" va SIN fechas (todas las fechas)',
      JSON.stringify(p.base) === JSON.stringify({ p_clave: 'donpepe', p_desde: null, p_hasta: null, p_estado: 'procesada', p_repartidor: 'emp-9' }), JSON.stringify(p.base))
    chk('params: sin fecha, el total va del 1º del mes a hoy',
      p.total && p.total.p_desde === '2026-09-01' && p.total.p_hasta === '2026-09-21' && p.total.p_clave === 'donpepe' &&
      p.total.p_estado === 'procesada' && p.total.p_repartidor === 'emp-9', JSON.stringify(p.total))
    chk('params: sin fecha, la etiqueta dice "Total del mes"', p.etiqueta === 'Total del mes')
    const q = S.parametrosResumen({ texto: '', desde: '2026-08-01', hasta: '2026-08-31', estado: '', repartidor: '' }, '2026-09-21')
    chk('params: con fecha, UNA sola consulta con esas fechas y "Total del período"',
      q.total === null && q.base.p_desde === '2026-08-01' && q.base.p_hasta === '2026-08-31' && q.etiqueta === 'Total del período')
    chk('params: vacíos van null (la función los ignora), nunca ""',
      q.base.p_clave === null && q.base.p_estado === null && q.base.p_repartidor === null)
    const solo = S.parametrosResumen({ texto: '', desde: '2026-08-01', hasta: 'basura', estado: '', repartidor: '' }, '2026-09-21')
    chk('params: una fecha inválida no viaja (igual que el listado, que filtra solo con esFechaIso)',
      solo.base.p_hasta === null && solo.base.p_desde === '2026-08-01')
  }

  // El listado y el resumen filtran IGUAL: mismos filtros → mismo like que el
  // position() de la función (la clave es [a-z0-9], sin comodines).
  {
    const S = sandbox()
    S.estado.filtros = { texto: 'Don Pépe', desde: '2026-09-01', hasta: '2026-09-10', estado: 'registrada', repartidor: 'emp-2' }
    await S.cargarCobranzas({ reiniciar: true })
    await esperar()
    const listado = S.__consultas().find(c => c.tabla === 'v_cobranzas').ops
    const r = S.__rpcs().filter(x => x.nombre === 'resumen_cobranzas')
    chk('filtros: el listado filtra por la misma clave, fechas, estado y repartidor que viajan al resumen',
      r.length === 1 &&
      listado.some(o => o[0] === 'like' && o[1] === 'cliente_normalizado' && o[2] === `%${r[0].params.p_clave}%`) &&
      listado.some(o => o[0] === 'gte' && o[2] === r[0].params.p_desde) &&
      listado.some(o => o[0] === 'lte' && o[2] === r[0].params.p_hasta) &&
      listado.some(o => o[0] === 'eq' && o[1] === 'estado' && o[2] === r[0].params.p_estado) &&
      listado.some(o => o[0] === 'eq' && o[1] === 'empleado_id' && o[2] === r[0].params.p_repartidor),
      JSON.stringify({ listado, r }))
    chk('filtros: los parámetros van POR NOMBRE (un objeto con p_*)',
      r[0] && Object.keys(r[0].params).sort().join() === 'p_clave,p_desde,p_estado,p_hasta,p_repartidor')
  }

  // Tocar un segmento recalcula con el valor de la BASE.
  {
    const S = sandbox()
    S.renderizarChipsEstado()
    const asentadas = S.__segmentos().find(b => b.dataset.estado === 'procesada')
    chk('segmento: existe la opción con el valor procesada', !!asentadas)
    S.__limpiarRpcs()
    if (asentadas) asentadas.__clicks[0]()
    await esperar()
    const r = S.__rpcs().filter(x => x.nombre === 'resumen_cobranzas')
    chk('segmento: tocar "Asentadas" recalcula con p_estado = procesada', r.length >= 1 && r.every(x => x.params.p_estado === 'procesada'), JSON.stringify(r))
    chk('segmento: y el listado filtra por procesada',
      S.__consultas().some(c => c.tabla === 'v_cobranzas' && c.ops.some(o => o[0] === 'eq' && o[1] === 'estado' && o[2] === 'procesada')))
  }

  // Sin fecha: dos llamadas; "por controlar" sale de la SIN fechas.
  {
    const S = sandbox()
    S.__setRpc(async (n, p) => p.p_desde
      ? { data: [{ por_controlar: 1, cantidad: 4, total: 12345.5 }], error: null }
      : { data: [{ por_controlar: 9, cantidad: 40, total: 999999 }], error: null })
    await S.cargarResumen()
    const h = htmlDe(S, 'cob-resumen')
    const r = S.__rpcs().filter(x => x.nombre === 'resumen_cobranzas')
    chk('resumen sin fecha: dos llamadas (todas las fechas y el mes)', r.length === 2 && r.some(x => x.params.p_desde === null) && r.some(x => x.params.p_desde === '2026-09-01'))
    chk('resumen sin fecha: "Por controlar" es el de TODAS las fechas (9), no el del mes',
      /cob-resumen__k">Por controlar<\/div>\s*<div class="cob-resumen__v cob-resumen__v--pendientes">9</.test(h), h)
    chk('resumen sin fecha: el total es el del MES, con su etiqueta y su aclaración',
      /cob-resumen__k">Total del mes<\/div>\s*<div class="cob-resumen__v">\$\s12\.345,50</.test(h) &&
      /4 cobranzas del 01\/09 a hoy, sin las anuladas/.test(h), h)
    chk('resumen: nunca se suman filas del listado (no hay estado.cobranzas en juego)', !/999\.999/.test(h))
  }

  // Con filtro "Anuladas": no se muestra "$ 0,00" como si fuera un total.
  {
    const S = sandbox()
    S.estado.filtros.estado = 'anulada'
    S.__setRpc(async () => ({ data: [{ por_controlar: 3, cantidad: 0, total: 0 }], error: null }))
    await S.cargarResumen()
    const h = htmlDe(S, 'cob-resumen')
    chk('anuladas: el total dice "Las anuladas no suman" y no "$ 0,00"', /Las anuladas no suman/.test(h) && !/\$\s0,00/.test(h), h)
  }

  // Fallo: "No se pudo calcular", nunca $0.
  {
    const S = sandbox()
    S.__setRpc(async () => ({ data: null, error: { message: 'sin señal' } }))
    await S.cargarResumen()
    const h = htmlDe(S, 'cob-resumen')
    chk('fallo: las dos cifras dicen "No se pudo calcular"', (h.match(/No se pudo calcular/g) || []).length === 2, h)
    chk('fallo: ningún "$ 0,00" ni "0" como cifra', !/\$/.test(h) && !/cob-resumen__v[^"]*">0</.test(h), h)
    const S2 = sandbox()
    S2.__setRpc(async () => { throw new Error('red') })
    await S2.cargarResumen()
    chk('fallo por excepción: también "No se pudo calcular"', (htmlDe(S2, 'cob-resumen').match(/No se pudo calcular/g) || []).length === 2)
    const S3 = sandbox()
    S3.__setRpc(async () => ({ data: [], error: null }))
    await S3.cargarResumen()
    chk('sin filas: "No se pudo calcular", no $0', /No se pudo calcular/.test(htmlDe(S3, 'cob-resumen')) && !/\$/.test(htmlDe(S3, 'cob-resumen')))
  }

  // Un total null (o que no es número) no termina en "$ 0,00".
  {
    const S = sandbox()
    // Desde el 21/09/2026 formatearImporte(null) ya da "—" y no "$ 0,00", así
    // que "no aparece $" dejó de distinguir el guard de htmlResumen: se exige
    // además el texto, que es lo que el guard garantiza.
    const hNull = S.htmlResumen({ etiqueta: 'Total del mes', desdeMes: '2026-09-01', porControlar: 2, cantidad: 3, total: null, estadoFiltro: null })
    chk('total null: "No se pudo calcular", nunca "$ 0,00"',
      !/\$/.test(hNull) && /Total del mes<\/div>\s*<div class="cob-resumen__v cob-resumen__v--texto">No se pudo calcular/.test(hNull))
    chk('total "": tampoco', !/\$/.test(S.htmlResumen({ etiqueta: 'Total del mes', porControlar: 2, cantidad: 3, total: '', estadoFiltro: null })))
    chk('por_controlar null: "No se pudo calcular", no 0',
      /Por controlar<\/div>\s*<div class="cob-resumen__v cob-resumen__v--texto">No se pudo calcular/.test(
        S.htmlResumen({ etiqueta: 'Total del mes', porControlar: null, cantidad: 3, total: 5, estadoFiltro: null })))
    chk('numeroDeResumen: null / undefined / "" son null (Number(null) sería 0)',
      S.numeroDeResumen(null) === null && S.numeroDeResumen(undefined) === null && S.numeroDeResumen('') === null &&
      S.numeroDeResumen('12.5') === 12.5 && S.numeroDeResumen(0) === 0)
    const conFiltro = S.htmlResumen({ etiqueta: 'Total del período', desdeMes: null, porControlar: 0, cantidad: 1, total: 100, estadoFiltro: 'procesada' })
    chk('con filtro de estado: "1 cobranza asentada" y "en el período"', /1 cobranza asentada</.test(conFiltro) && /en el período/.test(conFiltro), conFiltro)
    chk('con cero por controlar, el número sale sin el color de pendiente', /cob-resumen__v">0</.test(conFiltro))
  }

  // Mientras carga: nunca el número viejo. Y una respuesta vieja no pisa.
  {
    const S = sandbox()
    S.__setRpc(async () => ({ data: [{ por_controlar: 5, cantidad: 7, total: 777 }], error: null }))
    await S.cargarResumen()
    chk('carga: la primera respuesta se muestra', /\$\s777,00/.test(htmlDe(S, 'cob-resumen')))
    const lenta = diferida()
    S.__setRpc(() => lenta.p)
    const p = S.cargarResumen()
    const durante = htmlDe(S, 'cob-resumen')
    chk('carga: mientras carga NO queda el número viejo, se muestra "…"', !/777/.test(durante) && !/>5</.test(durante) && /…/.test(durante), durante)
    lenta.resolver({ data: [{ por_controlar: 1, cantidad: 1, total: 111 }], error: null })
    await p

    const vieja = diferida()
    S.__setRpc(() => vieja.p)
    const pv = S.cargarResumen()
    S.__setRpc(async () => ({ data: [{ por_controlar: 2, cantidad: 2, total: 222 }], error: null }))
    await S.cargarResumen()
    vieja.resolver({ data: [{ por_controlar: 8, cantidad: 8, total: 888 }], error: null })
    await pv
    await esperar()
    const final = htmlDe(S, 'cob-resumen')
    chk('turno: la respuesta vieja no pisa a la nueva', /\$\s222,00/.test(final) && !/888/.test(final), final)

    // Y un fallo viejo tampoco pisa un resultado nuevo.
    const falla = diferida()
    S.__setRpc(() => falla.p)
    const pf = S.cargarResumen()
    S.__setRpc(async () => ({ data: [{ por_controlar: 3, cantidad: 3, total: 333 }], error: null }))
    await S.cargarResumen()
    falla.resolver({ data: null, error: { message: 'x' } })
    await pf
    chk('turno: un error viejo no pisa el resultado nuevo', /\$\s333,00/.test(htmlDe(S, 'cob-resumen')) && !/No se pudo/.test(htmlDe(S, 'cob-resumen')))
  }

  // Cuándo se recalcula: cada filtro (cargarCobranzas con reiniciar) y cada
  // escritura (refrescarListado). "Cargar más" no.
  {
    const S = sandbox()
    await S.cargarCobranzas({ reiniciar: true })
    const n1 = S.__rpcs().length
    chk('recalcula: un filtro nuevo (listado desde cero) llama a resumen_cobranzas', n1 >= 1)
    await S.cargarCobranzas()
    chk('recalcula: "Cargar más" NO la vuelve a llamar', S.__rpcs().length === n1)
    await S.refrescarListado()
    chk('recalcula: después de guardar / reabrir / anular (refrescarListado) sí', S.__rpcs().length > n1)
    for (const [rpc, params, msg] of [
      ['reabrir_cobranza', { p_id: 'c1', p_motivo: 'x' }, 'Cobranza reabierta.'],
      ['anular_cobranza', { p_id: 'c1', p_motivo: 'x' }, 'Cobranza anulada.'],
    ]) {
      S.__limpiarRpcs()
      await S.accionSimple(rpc, params, msg)
      chk(`recalcula: después de ${rpc}`, S.__rpcs().some(r => r.nombre === 'resumen_cobranzas'))
    }
  }

  // ══ 3. TARJETA PLEGADA COMPACTA ═══════════════════════════════════════════
  {
    const S = sandbox()
    const base = { id: 'k1', foto_id: 'f1', banco_codigo: '007', sucursal_codigo: '386', codigo_postal: '3218', numero: '00000353',
      cuenta: '09420314667', tipo: 'diferido', fecha_emision: '2026-09-15', fecha_pago: '2026-10-02', importe: '427.256,86',
      confirmado: true, abierto: false, titulares: [] }
    const f = { id: 'form', fotos: [{ id: 'f1' }], cheques: [] }
    const dif = base, com = { ...base, id: 'k2', tipo: 'comun', fecha_pago: null }
    const raro = { ...base, id: 'k3', banco_codigo: '<b>9' }
    f.cheques = [dif, com, raro]
    const hD = S.htmlTarjetaCheque(dif, f), hC = S.htmlTarjetaCheque(com, f), hR = S.htmlTarjetaCheque(raro, f)
    chk('compacta: es una fila (cob-cheque--fila) y sigue marcada como confirmada',
      /class="cob-cheque cob-cheque--confirmado cob-cheque--fila" data-cheque="k1"/.test(hD))
    chk('compacta: arriba el importe', /<span class="cob-cheque-fila__monto">\$\s427\.256,86<\/span>/.test(hD))
    chk('compacta: "Nº 00000353 · paga 02/10" en un diferido', /<span class="cob-cheque-fila__sub">Nº 00000353 · paga 02\/10<\/span>/.test(hD), hD)
    chk('compacta: "a la vista" en un común', /<span class="cob-cheque-fila__sub">Nº 00000353 · a la vista<\/span>/.test(hC))
    chk('compacta: el banco en su línea, con el nombre COMPLETO (y la cuenta) en el title',
      /<span class="cob-cheque-fila__banco" title="BANCO DE GALICIA Y BUENOS AIRES S\.A\.U\. · cuenta 09420314667">BANCO DE GALICIA Y BUENOS AIRES S\.A\.U\.<\/span>/.test(hD), hD)
    chk('compacta: el title va escapado', /title="Banco &lt;b&gt;9 \(no está en el catálogo\) · cuenta 09420314667"/.test(hR) && !/title="[^"]*<b>/.test(hR), hR)
    chk('compacta: "Ver la foto" no se pierde: el cheque entero es el botón, con el mismo data-mini',
      /<button type="button" class="cob-cheque-fila__info" data-mini="k1" aria-label="[^"]*Tocá para ver la foto\.">/.test(hD))
    chk('compacta: el lector de pantalla oye que está confirmado, el importe y el banco',
      /aria-label="Cheque confirmado de \$\s427\.256,86, Nº 00000353, paga 02\/10, BANCO DE GALICIA/.test(hD))
    chk('compacta: Editar y Quitar con sus data-* de siempre, a la derecha',
      /<div class="cob-cheque-fila__acciones">\s*<button[^>]*data-editar-cheque="k1">Editar<\/button>\s*<button[^>]*data-quitar-cheque="k1">Quitar<\/button>/.test(hD))
    chk('compacta: sin miniatura ni los tres datos grandes', !/<img/.test(hD) && !/cob-cheque__datos/.test(hD))
    const abierta = S.htmlTarjetaCheque({ ...base, abierto: true }, f)
    chk('la tarjeta ABIERTA no es la fila compacta', !/cob-cheque--fila/.test(abierta) && /data-confirmar-cheque/.test(abierta))

    const css = FUENTE.slice(FUENTE.indexOf('<style>'), FUENTE.indexOf('</style>'))
    const regla = (sel) => { const i = css.indexOf('\n    ' + sel + ' {'); return i === -1 ? '' : css.slice(i, css.indexOf('}', i)) }
    chk('css compacta: la fila mide 72px de alto mínimo', /min-height:\s*72px/.test(regla('.cob-cheque--fila')))
    chk('css compacta: la fila va DESPUÉS de .cob-cheque (misma especificidad, decide el orden)',
      css.indexOf('\n    .cob-cheque--fila {') > css.indexOf('\n    .cob-cheque {') && css.indexOf('\n    .cob-cheque {') !== -1)
    chk('css compacta: Editar y Quitar de 44px', /\.cob-cheque-fila__acciones \.cob-btn \{ min-height: 44px; min-width: 44px;/.test(css))
    const iBanco = css.indexOf('    .cob-cheque-fila__banco {\n')
    const reglaTexto = css.slice(css.indexOf('    .cob-cheque-fila__monto,\n'), css.indexOf('}', css.indexOf('    .cob-cheque-fila__monto,\n')))
    chk('css compacta: el banco se corta con puntos suspensivos (overflow hidden, nowrap, min-width 0)',
      iBanco !== -1 && /\.cob-cheque-fila__banco \{/.test(reglaTexto) &&
      /overflow:\s*hidden/.test(reglaTexto) && /text-overflow:\s*ellipsis/.test(reglaTexto) &&
      /white-space:\s*nowrap/.test(reglaTexto) && /min-width:\s*0/.test(reglaTexto))
  }
}

pruebas().then(() => {
  for (const f of fallas) console.log('  ✗ ' + f)
  const total = ok + fallas.length
  console.log(`${ok}/${total} ${fallas.length ? 'ROJO' : 'verde'}`)
  process.exit(fallas.length ? 1 : 0)
}).catch(e => {
  console.log('EXCEPCIÓN: ' + (e && e.stack || e))
  console.log('ROJO')
  process.exit(1)
})
