// Unidad de negocio de cada cobranza — modulos/cobranzas.html (22/09/2026).
//
// El repartidor no sabe de qué unidad es la plata: se decide AL ASENTAR.
// "Controlada, asentar" abre un diálogo propio que pide la unidad y llama a
// marcar_cobranza_asentada; en una asentada, "Asignar unidad" / "Cambiar"
// llama a asignar_unidad_cobranza (que deja historial 'unidad_asignada').
//
// Se EJECUTAN las funciones reales —htmlDetalle, htmlHistorial,
// htmlFilaCobranza, conectarDetalle, conectarDialogos, abrirDialogo,
// elegirUnidadConDialogo, asentarConUnidad, asignarUnidad, accionSimple,
// asegurarUnidades— con un document falso que sigue el foco y un supabase
// falso que anota cada llamada. Lo que se afirma:
//  - el detalle muestra la unidad escapada; "Sin unidad" en una asentada sin
//    unidad; el botón "Asignar unidad" / "Cambiar" solo con cobranzas:procesar
//    y solo en una asentada;
//  - el historial 'unidad_asignada' nombra la unidad nueva, resuelta contra el
//    catálogo ("unidad desconocida" si no está), escapada;
//  - asentar llama a marcar_cobranza_asentada con p_id y p_unidad_negocio_id,
//    y NUNCA a marcar_cobranza_procesada; cancelar o Escape no llaman nada;
//  - el diálogo: sin preselección, confirmar deshabilitado hasta elegir, solo
//    unidades activas (más la actual aunque esté inactiva), una sola se elige
//    sola, foco adentro y de vuelta al botón;
//  - el error de la RPC se muestra TAL CUAL.
//
// Archivo bajo prueba: ARCHIVO_TEST, o modulos/cobranzas.html.

const fs = require('fs')
const path = require('path')
const { construirCon } = require('./sandbox')
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

  // --- DOM falso que sigue el foco -------------------------------------------
  var __listenersDoc = new Map()
  function nuevoEl(id) {
    const el = {
      id, innerHTML: '', textContent: '', hidden: false, disabled: false, dataset: {}, src: '',
      __listeners: new Map(), __valor: '',
      addEventListener(t, f) { if (!el.__listeners.has(t)) el.__listeners.set(t, []); el.__listeners.get(t).push(f) },
      __disparar(t) { for (const f of el.__listeners.get(t) ?? []) f({ stopPropagation(){} }) },
      click() { if (!el.disabled) el.__disparar('click') },
      focus() { document.activeElement = el },
      querySelectorAll: () => [],
      querySelector: () => null,
      classList: { add(){}, remove(){}, toggle(){} },
    }
    // Un <select> de verdad: asignar un value que no está entre sus opciones
    // no engancha (queda vacío). Así se prueba que se puebla ANTES.
    Object.defineProperty(el, 'value', {
      get() { return el.__valor },
      set(v) {
        v = String(v ?? '')
        if (el.id === 'cob-dlg-unidad-select') {
          const hay = [...el.innerHTML.matchAll(/<option value="([^"]*)"/g)].some(m => m[1] === v)
          el.__valor = hay ? v : ''
        } else el.__valor = v
      },
    })
    return el
  }
  var __els = new Map()
  var document = {
    activeElement: null,
    getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) },
    querySelectorAll: () => [],
    addEventListener(t, f) { if (!__listenersDoc.has(t)) __listenersDoc.set(t, new Set()); __listenersDoc.get(t).add(f) },
    removeEventListener(t, f) { __listenersDoc.get(t)?.delete(f) },
  }
  function __tecla(key, shiftKey = false) {
    const ev = { key, shiftKey, prevenido: false, preventDefault() { ev.prevenido = true } }
    for (const f of [...(__listenersDoc.get('keydown') ?? [])]) f(ev)
    return ev
  }
  function __prepararDom() {
    document.getElementById('cob-dialogo-unidad').querySelectorAll = () =>
      ['cob-dlg-unidad-select', 'cob-dlg-unidad-cancelar', 'cob-dlg-unidad-si']
        .map(id => document.getElementById(id)).filter(x => !x.disabled)
    for (const id of ['cob-dialogo-unidad', 'cob-dialogo-foto', 'cob-dialogo-confirmar']) document.getElementById(id).hidden = true
    conectarDialogos()
  }

  // --- supabase falso --------------------------------------------------------
  var __rpcs = []
  var __rpcImpl = async () => ({ data: null, error: null })
  var __unidadesFalsas = []
  var __errorUnidades = null
  var __consultasUnidades = 0
  var supabase = {
    rpc(nombre, params) { __rpcs.push({ nombre, params }); return __rpcImpl(nombre, params) },
    from(tabla) {
      const q = {}
      for (const op of ['select', 'order', 'eq', 'in', 'maybeSingle']) q[op] = () => q
      q.then = (res) => {
        if (tabla === 'unidades_negocio') __consultasUnidades++
        const r = tabla === 'unidades_negocio'
          ? { data: __errorUnidades ? null : __unidadesFalsas, error: __errorUnidades }
          : { data: [], error: null }
        return Promise.resolve(r).then(res)
      }
      return q
    },
  }

  // --- lo que estas funciones llaman y acá no importa ------------------------
  var __llamadas = { exitos: [], errores: [], abrirDetalle: [], refrescar: 0 }
  function mostrarExito(m){ __llamadas.exitos.push(m) } function mostrarError(m){ __llamadas.errores.push(m) }
  function cerrarModalMotivo(){} function abrirModalMotivo(){} function abrirFormularioEdicion(){}
  async function abrirDetalle(id){ __llamadas.abrirDetalle.push(id) }
  async function refrescarListado(){ __llamadas.refrescar++ }
  async function urlDeFoto(){ return null } function abrirVisor(){}
  function hoyArgentina(){ return '2026-09-22' }
  var dialogoAbierto = null
  var promesaUnidades = null
  // La fábrica de pruebas ya resuelta y vacía: esta suite prueba la unidad,
  // no el filtro (ese es test-cobranzas-fabrica-pruebas.js).
  var promesaFabrica = Promise.resolve(FABRICA_SIN_DATOS)

  var estado = {
    miEmpleadoId: 'emp-1', miRolApp: 'usuario',
    misTareas: new Set(['cobranzas:cargar', 'cobranzas:ver_todo', 'cobranzas:procesar']),
    bancos: new Map(), unidades: [], detalle: null, cobranzaSeleccionadaId: null,
  }
`

const FUNCIONES = [
  'escCob', 'formatearImporte', 'esFechaIso', 'formatearFechaCob', 'momentoArgentina', 'fechaDeMomentoAr',
  'normalizarCliente', 'nombreBanco', 'nombreBancoDe', 'tieneTarea', 'diasEntre',
  'htmlFilaCobranza', 'htmlDetalle', 'htmlAccionesDetalle', 'htmlHistorial',
  'htmlChequeDetalle', 'htmlDatosCheque', 'textoDiasHastaPago', 'textoSalidaCheque', 'textoHistorialCheque',
  'resumirCambios', 'htmlLinkChequeEnCartera', 'conectarDetalle', 'accionSimple',
  // diálogos
  'enfocablesDe', 'teclaEnDialogo', 'abrirDialogo', 'cerrarDialogo', 'conectarDialogos', 'pintarBotonUnidad',
  // unidad
  'cargarUnidades', 'asegurarUnidades', 'asegurarFabrica', 'unidadesParaElegir', 'elegirUnidadConDialogo',
  'asentarConUnidad', 'asignarUnidad',
]
const CONSTANTES = [
  'ZONA_AR', 'ACENTOS_COB', 'SIN_ACENTOS_COB', 'ETIQUETA_ESTADO_COBRANZA', 'ETIQUETA_ESTADO_CHEQUE',
  'puedeCargar', 'puedeVerTodo', 'puedeProcesar', 'puedeEditarAnular', 'esPropia', 'puedeVerCartera',
]

const UNIDADES = [
  { id: 'u-cn', nombre: 'Cucuruchos Nuss', activo: true },
  { id: 'u-dp', nombre: 'Dolce Pasta', activo: true },
  { id: 'u-ta', nombre: 'Taller', activo: true },
  { id: 'u-me', nombre: 'Mengui', activo: true },
  { id: 'u-vieja', nombre: 'Unidad dada de baja', activo: false },
]

function sandbox({ tareas, unidades = UNIDADES } = {}) {
  const S = construirCon(ARCHIVO, {
    preludio: PRELUDIO, funciones: FUNCIONES, constantes: CONSTANTES,
    retorno: `estado, __els, __doc: document, __llamadas, __tecla, __prepararDom,
      __rpcs(){ return __rpcs }, __setRpc(f){ __rpcImpl = f },
      __setUnidades(u){ __unidadesFalsas = u }, __setErrorUnidades(e){ __errorUnidades = e },
      __consultasUnidades(){ return __consultasUnidades }, __abierto(){ return dialogoAbierto }`,
  })
  if (tareas) S.estado.misTareas = new Set(tareas.map(t => 'cobranzas:' + t))
  S.__setUnidades(unidades)
  S.__prepararDom()
  return S
}

const esperar = async (n = 4) => { for (let i = 0; i < n; i++) await new Promise(r => setImmediate(r)) }
const MAL = '"><b data-xss="unidad">'
const MAL_ESC = '&quot;&gt;&lt;b data-xss=&quot;unidad&quot;&gt;'
const base = {
  id: 'c1', empleado_id: 'emp-9', cliente: 'Cliente', fecha: '2026-09-17', total: 1500, efectivo: 1500,
  cantidad_cheques: 0, total_cheques: 0, created_at: '2026-09-17T12:00:00Z', cargada_por_nombre: 'X',
}
const detalleDe = (c, historial = []) => ({ cabecera: c, cheques: [], fotos: [], historial, nombres: new Map([['e1', 'Mariano']]) })
const opcionesDe = (S) => [...S.__els.get('cob-dlg-unidad-select').innerHTML.matchAll(/<option value="([^"]*)">([^<]*)</g)].map(m => [m[1], m[2]])

async function pruebas() {
  // ══ 1. DETALLE ═════════════════════════════════════════════════════════════
  {
    const S = sandbox()
    const h = S.htmlDetalle(detalleDe({ ...base, estado: 'procesada', unidad_negocio_id: 'u-dp', unidad_negocio_nombre: MAL }))
    chk('detalle con unidad: el nombre va escapado', h.includes(MAL_ESC) && !h.includes(MAL), h.slice(0, 200))
    chk('detalle con unidad: dice "Unidad de negocio"', /cob-dato__k">Unidad de negocio<\/span>/.test(h))
    const hDp = S.htmlDetalle(detalleDe({ ...base, estado: 'procesada', unidad_negocio_id: 'u-dp', unidad_negocio_nombre: 'Dolce Pasta' }))
    chk('detalle con unidad: "Unidad de negocio · Dolce Pasta"',
      /cob-dato__k">Unidad de negocio<\/span>\s*<span class="cob-dato__v">Dolce Pasta/.test(hDp), hDp)
    chk('detalle asentada con unidad y permiso: botón "Cambiar"', /id="cob-btn-unidad"[^>]*>Cambiar<\/button>/.test(hDp))
    chk('detalle asentada con unidad: no dice "Sin unidad"', !/Sin unidad/.test(hDp))
    chk('el botón de la unidad mide 44px', /id="cob-btn-unidad" style="min-height:44px/.test(hDp))

    const hSin = S.htmlDetalle(detalleDe({ ...base, estado: 'procesada', unidad_negocio_id: null, unidad_negocio_nombre: null }))
    chk('asentada sin unidad: "Sin unidad" en gris', /<span style="color:var\(--color-texto-suave\)[^"]*" data-sin-unidad>Sin unidad<\/span>/.test(hSin), hSin)
    chk('asentada sin unidad con permiso: botón "Asignar unidad"', /id="cob-btn-unidad"[^>]*>Asignar unidad<\/button>/.test(hSin))

    const hReg = S.htmlDetalle(detalleDe({ ...base, estado: 'registrada', unidad_negocio_id: null }))
    chk('por controlar sin unidad: no muestra la fila de la unidad', !/Unidad de negocio/.test(hReg) && !/Sin unidad/.test(hReg))
    chk('por controlar: sin botón de unidad (se elige al asentar)', !/cob-btn-unidad/.test(hReg))
    chk('por controlar: el botón "Controlada, asentar" conserva su id', /id="cob-btn-procesar">Controlada, asentar<\/button>/.test(hReg))

    const hAnu = S.htmlDetalle(detalleDe({ ...base, estado: 'anulada', unidad_negocio_id: 'u-dp', unidad_negocio_nombre: 'Dolce Pasta' }))
    chk('anulada con unidad: se ve la unidad', /Dolce Pasta/.test(hAnu))
    chk('anulada: sin botón de unidad (la base solo deja sobre una asentada)', !/cob-btn-unidad/.test(hAnu))

    const hIdSinNombre = S.htmlDetalle(detalleDe({ ...base, estado: 'procesada', unidad_negocio_id: 'u-x', unidad_negocio_nombre: null }))
    chk('unidad con id y sin nombre: "unidad desconocida", nunca vacío', /cob-dato__v">unidad desconocida/.test(hIdSinNombre))
  }
  {
    const S = sandbox({ tareas: ['cargar', 'ver_todo', 'editar_anular'] })
    const hSin = S.htmlDetalle(detalleDe({ ...base, estado: 'procesada', unidad_negocio_id: null }))
    chk('sin procesar: "Sin unidad" se ve igual', /Sin unidad/.test(hSin))
    chk('sin procesar: NO hay botón "Asignar unidad"', !/cob-btn-unidad/.test(hSin) && !/Asignar unidad/.test(hSin))
    const hCon = S.htmlDetalle(detalleDe({ ...base, estado: 'procesada', unidad_negocio_id: 'u-dp', unidad_negocio_nombre: 'Dolce Pasta' }))
    chk('sin procesar: NO hay botón "Cambiar"', !/cob-btn-unidad/.test(hCon) && !/>Cambiar</.test(hCon))
  }
  {
    const S = sandbox({ tareas: [] })
    S.estado.miRolApp = 'super_admin'
    chk('super_admin sin la fila: tiene el botón (tiene_tarea con bypass)',
      /cob-btn-unidad/.test(S.htmlDetalle(detalleDe({ ...base, estado: 'procesada', unidad_negocio_id: null }))))
  }

  // ══ 2. HISTORIAL ═══════════════════════════════════════════════════════════
  {
    const S = sandbox()
    S.estado.unidades = [...UNIDADES, { id: 'u-mal', nombre: MAL, activo: true }]
    const hist = [
      { accion: 'procesada', empleado_id: 'e1', created_at: '2026-09-18T13:00:00Z' },
      { accion: 'unidad_asignada', empleado_id: 'e1', created_at: '2026-09-19T13:00:00Z', antes: { unidad_negocio_id: 'u-cn' }, despues: { unidad_negocio_id: 'u-dp' } },
      { accion: 'unidad_asignada', empleado_id: 'e1', created_at: '2026-09-20T13:00:00Z', antes: { unidad_negocio_id: 'u-dp' }, despues: { unidad_negocio_id: 'u-nada' } },
      { accion: 'unidad_asignada', empleado_id: 'e1', created_at: '2026-09-21T13:00:00Z', antes: {}, despues: null },
      { accion: 'unidad_asignada', empleado_id: 'e1', created_at: '2026-09-21T14:00:00Z', antes: {}, despues: { unidad_negocio_id: 'u-mal' } },
    ]
    const h = S.htmlHistorial(hist, new Map([['e1', 'Mariano']]))
    chk('historial: "Unidad asignada: Dolce Pasta · Mariano · <fecha>" (la NUEVA, no la vieja)',
      /<div class="cob-hist__linea">Unidad asignada: Dolce Pasta · Mariano · 19\/0?9 /.test(h), h)
    chk('historial: id que no está en el catálogo → "unidad desconocida"',
      /<div class="cob-hist__linea">Unidad asignada: unidad desconocida · Mariano · 20\/0?9 /.test(h))
    chk('historial: sin "despues" → "unidad desconocida", sin romperse',
      /<div class="cob-hist__linea">Unidad asignada: unidad desconocida · Mariano · 21\/0?9 /.test(h))
    chk('historial: el nombre de la unidad va escapado', h.includes('Unidad asignada: ' + MAL_ESC) && !h.includes(MAL))
    chk('historial: la asentada sigue diciendo "Asentada"', /<div class="cob-hist__linea">Asentada · Mariano/.test(h))
    chk('historial: nunca el valor crudo "unidad_asignada" en pantalla', !/unidad_asignada/.test(h))
  }

  // ══ 3. LISTADO ═════════════════════════════════════════════════════════════
  {
    const S = sandbox()
    const f = S.htmlFilaCobranza({ ...base, estado: 'procesada', unidad_negocio_id: 'u-dp', unidad_negocio_nombre: MAL })
    chk('fila asentada con unidad: la unidad en la línea chica, escapada',
      /cob-fila__detalle">[^\n]*<span class="cob-fila__unidad">/.test(f) && f.includes(MAL_ESC) && !f.includes(MAL), f)
    const fReg = S.htmlFilaCobranza({ ...base, estado: 'registrada', unidad_negocio_id: 'u-dp', unidad_negocio_nombre: 'Dolce Pasta' })
    chk('fila por controlar: no muestra unidad', !/Dolce Pasta/.test(fReg))
    const fSin = S.htmlFilaCobranza({ ...base, estado: 'procesada', unidad_negocio_id: null, unidad_negocio_nombre: null })
    chk('fila asentada sin unidad: nada de más', !/cob-fila__unidad/.test(fSin))
    chk('fila: la tabla de escritorio no tiene columna nueva (7 celdas)',
      (f.match(/class="cob-celda/g) || []).length === 7)
  }

  // ══ 4. ASENTAR ═════════════════════════════════════════════════════════════
  async function abrirAsentar(S, extra = {}) {
    const c = { ...base, estado: 'registrada', unidad_negocio_id: null, ...extra }
    S.estado.detalle = detalleDe(c)
    S.conectarDetalle()
    const btn = S.__els.get('cob-btn-procesar')
    btn.focus()
    const p = btn.__disparar('click')
    await esperar()
    return { btn, c }
  }
  {
    const S = sandbox()
    const { btn } = await abrirAsentar(S)
    const dlg = S.__els.get('cob-dialogo-unidad')
    const sel = S.__els.get('cob-dlg-unidad-select')
    const si = S.__els.get('cob-dlg-unidad-si')
    chk('asentar: se abre el diálogo de la unidad', dlg.hidden === false && S.__abierto() !== null)
    chk('asentar: todavía no se llamó a ninguna RPC', S.__rpcs().length === 0, JSON.stringify(S.__rpcs()))
    const ops = opcionesDe(S)
    chk('asentar: placeholder + las 4 activas (la inactiva no se ofrece)',
      ops.map(o => o[0]).join('|') === '|u-cn|u-dp|u-ta|u-me', JSON.stringify(ops))
    chk('asentar: SIN preselección', sel.value === '')
    chk('asentar: confirmar deshabilitado hasta elegir', si.disabled === true)
    chk('asentar: el botón dice "Asentar"', si.textContent === 'Asentar')
    chk('asentar: el foco va al select', S.__doc.activeElement === sel)
    chk('asentar: Tab desde el último vuelve al primero (foco atrapado)', (() => {
      S.__els.get('cob-dlg-unidad-cancelar').focus(); return S.__tecla('Tab').prevenido && S.__doc.activeElement === sel
    })())
    si.click()
    await esperar()
    chk('asentar: con el botón deshabilitado el clic no hace nada', S.__rpcs().length === 0 && S.__abierto() !== null)
    // La red detrás del disabled: aunque el clic llegara con el select vacío,
    // no se resuelve nada.
    si.disabled = false
    si.click()
    await esperar()
    chk('asentar: confirmar con el select vacío no resuelve (guarda)', S.__rpcs().length === 0 && S.__abierto() !== null)
    si.disabled = true
    sel.value = 'u-dp'
    sel.__disparar('change')
    chk('asentar: al elegir se habilita confirmar', si.disabled === false)
    si.click()
    await esperar()
    const r = S.__rpcs()
    chk('asentar: llama UNA vez a marcar_cobranza_asentada con p_id y p_unidad_negocio_id',
      r.length === 1 && r[0].nombre === 'marcar_cobranza_asentada' && r[0].params.p_id === 'c1' &&
      r[0].params.p_unidad_negocio_id === 'u-dp' && Object.keys(r[0].params).length === 2, JSON.stringify(r))
    chk('asentar: NUNCA marcar_cobranza_procesada', !r.some(x => x.nombre === 'marcar_cobranza_procesada'))
    chk('asentar: "Cobranza asentada." y se recarga', S.__llamadas.exitos.includes('Cobranza asentada.') &&
      S.__llamadas.abrirDetalle.includes('c1') && S.__llamadas.refrescar === 1)
    chk('asentar: el diálogo se cierra y el foco vuelve al botón', dlg.hidden === true && S.__doc.activeElement === btn)
  }
  for (const como of ['cancelar', 'escape']) {
    const S = sandbox()
    const { btn } = await abrirAsentar(S)
    S.__els.get('cob-dlg-unidad-select').value = 'u-dp'
    if (como === 'cancelar') S.__els.get('cob-dlg-unidad-cancelar').click()
    else chk('escape: se consume la tecla', S.__tecla('Escape').prevenido)
    await esperar()
    chk(`${como}: no se llama a ninguna RPC`, S.__rpcs().length === 0, JSON.stringify(S.__rpcs()))
    chk(`${como}: el diálogo se cierra y el foco vuelve al botón`, S.__els.get('cob-dialogo-unidad').hidden === true && S.__doc.activeElement === btn)
    chk(`${como}: sin mensajes`, !S.__llamadas.errores.length && !S.__llamadas.exitos.length)
  }
  {
    const S = sandbox({ unidades: [{ id: 'u-sola', nombre: 'Única', activo: true }, { id: 'u-baja', nombre: 'Baja', activo: false }] })
    await abrirAsentar(S)
    chk('una sola activa: se elige sola, sin placeholder', S.__els.get('cob-dlg-unidad-select').value === 'u-sola' &&
      opcionesDe(S).length === 1, JSON.stringify(opcionesDe(S)))
    chk('una sola activa: confirmar habilitado', S.__els.get('cob-dlg-unidad-si').disabled === false)
    S.__els.get('cob-dlg-unidad-si').click()
    await esperar()
    chk('una sola activa: asienta con esa', S.__rpcs()[0]?.params?.p_unidad_negocio_id === 'u-sola')
  }
  {
    const S = sandbox()
    S.__setRpc(async () => ({ data: null, error: { message: 'Elegí a qué unidad de negocio pertenece esta cobranza.' } }))
    await abrirAsentar(S)
    S.__els.get('cob-dlg-unidad-select').value = 'u-cn'
    S.__els.get('cob-dlg-unidad-select').__disparar('change')
    S.__els.get('cob-dlg-unidad-si').click()
    await esperar()
    chk('error de la RPC: se muestra TAL CUAL', S.__llamadas.errores[0] === 'Elegí a qué unidad de negocio pertenece esta cobranza.', JSON.stringify(S.__llamadas.errores))
    chk('error de la RPC: sin mensaje de éxito', !S.__llamadas.exitos.length)
  }
  {
    const S = sandbox()
    S.__setErrorUnidades(new Error('sin red'))
    await abrirAsentar(S)
    chk('sin unidades (falló la carga): no se abre el diálogo', S.__abierto() === null && S.__els.get('cob-dialogo-unidad').hidden === true)
    chk('sin unidades: se avisa', /No se pudo cargar la lista de unidades/.test(S.__llamadas.errores[0] ?? ''), JSON.stringify(S.__llamadas.errores))
    chk('sin unidades: no se llama a ninguna RPC', S.__rpcs().length === 0)
    S.__setErrorUnidades(null)
    const antes = S.__consultasUnidades()
    await abrirAsentar(S)
    chk('sin unidades: el siguiente intento vuelve a consultar', S.__consultasUnidades() === antes + 1 && S.__abierto() !== null)
    S.__tecla('Escape'); await esperar()
    await abrirAsentar(S)
    chk('con unidades ya cargadas: no se vuelve a consultar', S.__consultasUnidades() === antes + 1)
    S.__tecla('Escape'); await esperar()
  }

  // ══ 5. ASIGNAR / CAMBIAR ════════════════════════════════════════════════════
  async function abrirUnidad(S, c) {
    S.estado.detalle = detalleDe(c)
    S.conectarDetalle()
    const btn = S.__els.get('cob-btn-unidad')
    btn.focus()
    btn.__disparar('click')
    await esperar()
    return btn
  }
  {
    const S = sandbox()
    await abrirUnidad(S, { ...base, estado: 'procesada', unidad_negocio_id: null })
    chk('asignar: sin preselección y confirmar deshabilitado', S.__els.get('cob-dlg-unidad-select').value === '' && S.__els.get('cob-dlg-unidad-si').disabled === true)
    S.__els.get('cob-dlg-unidad-select').value = 'u-me'
    S.__els.get('cob-dlg-unidad-select').__disparar('change')
    S.__els.get('cob-dlg-unidad-si').click()
    await esperar()
    const r = S.__rpcs()
    chk('asignar: llama a asignar_unidad_cobranza con p_id y p_unidad_negocio_id',
      r.length === 1 && r[0].nombre === 'asignar_unidad_cobranza' && r[0].params.p_id === 'c1' && r[0].params.p_unidad_negocio_id === 'u-me', JSON.stringify(r))
    chk('asignar: nunca a las de asentar', !r.some(x => /marcar_cobranza/.test(x.nombre)))
  }
  {
    const S = sandbox()
    await abrirUnidad(S, { ...base, estado: 'procesada', unidad_negocio_id: 'u-dp', unidad_negocio_nombre: 'Dolce Pasta' })
    chk('cambiar: la actual viene preseleccionada', S.__els.get('cob-dlg-unidad-select').value === 'u-dp' && S.__els.get('cob-dlg-unidad-si').disabled === false)
    S.__els.get('cob-dlg-unidad-si').click()
    await esperar()
    chk('cambiar a la misma: no se llama a nada', S.__rpcs().length === 0, JSON.stringify(S.__rpcs()))
  }
  {
    const S = sandbox()
    await abrirUnidad(S, { ...base, estado: 'procesada', unidad_negocio_id: 'u-dp', unidad_negocio_nombre: 'Dolce Pasta' })
    S.__els.get('cob-dlg-unidad-select').value = 'u-ta'
    S.__els.get('cob-dlg-unidad-select').__disparar('change')
    S.__els.get('cob-dlg-unidad-si').click()
    await esperar()
    chk('cambiar a otra: asignar_unidad_cobranza con la nueva', S.__rpcs()[0]?.nombre === 'asignar_unidad_cobranza' && S.__rpcs()[0]?.params?.p_unidad_negocio_id === 'u-ta', JSON.stringify(S.__rpcs()))
  }
  {
    const S = sandbox()
    await abrirUnidad(S, { ...base, estado: 'procesada', unidad_negocio_id: 'u-vieja', unidad_negocio_nombre: 'Unidad dada de baja' })
    const ids = opcionesDe(S).map(o => o[0])
    chk('cambiar desde una unidad dada de baja: se ofrece también la actual', ids.includes('u-vieja') && S.__els.get('cob-dlg-unidad-select').value === 'u-vieja', JSON.stringify(ids))
    S.__tecla('Escape'); await esperar()
  }
  {
    const S = sandbox({ unidades: [...UNIDADES, { id: 'u-mal', nombre: MAL, activo: true }] })
    await abrirUnidad(S, { ...base, estado: 'procesada', unidad_negocio_id: null })
    const html = S.__els.get('cob-dlg-unidad-select').innerHTML
    chk('diálogo: el nombre de la unidad va escapado en la opción', html.includes(MAL_ESC) && !html.includes(MAL))
    S.__tecla('Escape'); await esperar()
  }

  // ══ 6. EL FUENTE ═══════════════════════════════════════════════════════════
  {
    // Ningún string del <script> (no los comentarios: los rangos de analizar()
    // los incluyen, así que se miran solo los que empiezan con comilla) nombra
    // la RPC vieja.
    let hay = false
    for (const b of bloquesScript(FUENTE)) {
      const r = analizar(b.codigo, b.ini, FUENTE)
      for (const [a, z] of r.rangos) if (["'", '"', '`'].includes(b.codigo[a]) && /marcar_cobranza_procesada/.test(b.codigo.slice(a, z))) hay = true
    }
    chk('fuente: ningún string llama a marcar_cobranza_procesada', !hay)
    const froms = [...FUENTE.matchAll(/\.from\('v_cobranzas'\)\s*\.select\(([^)]*)\)/g)].map(m => m[1])
    chk('fuente: TODO .select de v_cobranzas trae la unidad (* o las dos columnas)',
      froms.length >= 3 && froms.every(s => s === "'*'" || (/unidad_negocio_id/.test(s) && /unidad_negocio_nombre/.test(s))), JSON.stringify(froms))
    chk('fuente: el diálogo de la unidad es un role="dialog" aria-modal',
      /<div class="cob-modal" id="cob-dialogo-unidad" hidden role="dialog" aria-modal="true" aria-labelledby="cob-dlg-unidad-titulo">/.test(FUENTE))
    chk('fuente: el disabled del confirmar NO es atributo del HTML (va desde JS)',
      /<button type="button" class="cob-btn cob-btn--primario" id="cob-dlg-unidad-si">/.test(FUENTE))
    chk('fuente: las unidades se cargan en el init', /asegurarUnidades\(\)\.then\(/.test(FUENTE))
  }
}

pruebas().then(() => {
  const total = ok + fallas.length
  for (const f of fallas) console.log('  ✗', f)
  console.log(`${ok}/${total} ${fallas.length ? 'ROJO' : 'verde'}`)
  process.exit(fallas.length ? 1 : 0)
}).catch(err => {
  console.log('EXCEPCIÓN:', err && err.stack || err)
  console.log('ROJO')
  process.exit(1)
})
