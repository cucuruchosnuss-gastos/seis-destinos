// Unidad de negocio de cada cobranza — modulos/cobranzas.html (22/09/2026).
//
// El repartidor no sabe de qué unidad es la plata. Desde el 27/09/2026 la
// unidad sale del CLIENTE que se elige al asentar, y asentar vive en
// Administración (Cobranzas por asentar, asentar_cobranza): acá la unidad
// SOLO SE MUESTRA. Ya no hay diálogo de la unidad, ni "Controlada, asentar",
// ni "Asignar unidad" / "Cambiar".
//
// Se EJECUTAN las funciones reales —htmlDetalle, htmlAccionesDetalle,
// htmlHistorial, htmlFilaCobranza, conectarDetalle— con un document falso y
// un supabase falso que anota cada llamada. Lo que se afirma:
//  - el detalle muestra la unidad escapada; "Sin unidad" en una asentada sin
//    unidad; NINGÚN botón para cambiarla, con o sin permiso;
//  - el historial 'unidad_asignada' (de antes) nombra la unidad nueva,
//    resuelta contra el catálogo ("unidad desconocida" si no está), escapada;
//  - la fila de una asentada muestra la unidad;
//  - el fuente no llama a marcar_cobranza_asentada ni a asignar_unidad_cobranza,
//    ni tiene el diálogo de la unidad.
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
  // Sin el diálogo de la unidad (se fue con el asentado a Administración).
  function __prepararDom() {}

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
  'htmlFilaCobranza', 'unidadDeCobranza', 'htmlDetalle', 'htmlAccionesDetalle', 'htmlHistorial',
  'htmlChequeDetalle', 'htmlDatosCheque', 'textoDiasHastaPago', 'textoSalidaCheque', 'textoHistorialCheque',
  'resumirCambios', 'htmlLinkChequeEnCartera', 'conectarDetalle', 'accionSimple',
  // unidad (el catálogo, para nombrarla en el historial)
  'cargarUnidades', 'asegurarUnidades',
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
    chk('detalle asentada con unidad y procesar: SIN botón "Cambiar" (la unidad sale del cliente, en Administración)', !/cob-btn-unidad|>Cambiar</.test(hDp))
    chk('detalle asentada con unidad: no dice "Sin unidad"', !/Sin unidad/.test(hDp))

    const hSin = S.htmlDetalle(detalleDe({ ...base, estado: 'procesada', unidad_negocio_id: null, unidad_negocio_nombre: null }))
    chk('asentada sin unidad: "Sin unidad" en gris', /<span style="color:var\(--color-texto-suave\)[^"]*" data-sin-unidad>Sin unidad<\/span>/.test(hSin), hSin)
    chk('asentada sin unidad con procesar: SIN botón "Asignar unidad"', !/cob-btn-unidad|Asignar unidad/.test(hSin))
    chk('asentada con procesar: "Reabrir en Administración" es un link', /id="cob-link-reabrir" href="administracion\.html\?seccion=cobranzas&amp;cobranza=c1"/.test(hSin))

    const hReg = S.htmlDetalle(detalleDe({ ...base, estado: 'registrada', unidad_negocio_id: null }))
    chk('por controlar sin unidad: no muestra la fila de la unidad', !/Unidad de negocio/.test(hReg) && !/Sin unidad/.test(hReg))
    chk('por controlar: sin botón de unidad (se elige al asentar)', !/cob-btn-unidad/.test(hReg))
    chk('por controlar: "Asentar en Administración" es un link', /id="cob-link-asentar" href="administracion\.html\?seccion=cobranzas&amp;cobranza=c1">Asentar en Administración/.test(hReg))

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
    const hSa = S.htmlDetalle(detalleDe({ ...base, estado: 'procesada', unidad_negocio_id: null }))
    chk('super_admin sin la fila: tampoco hay botón de unidad, y sí el link a Administración (tiene_tarea con bypass)',
      !/cob-btn-unidad/.test(hSa) && /cob-link-reabrir/.test(hSa))
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
    let viejas = false
    for (const b of bloquesScript(FUENTE)) {
      const r = analizar(b.codigo, b.ini, FUENTE)
      for (const [a, z] of r.rangos) if (["'", '"', '`'].includes(b.codigo[a]) && /marcar_cobranza_asentada|asignar_unidad_cobranza/.test(b.codigo.slice(a, z))) viejas = true
    }
    chk('fuente: ningún string llama a marcar_cobranza_asentada ni a asignar_unidad_cobranza (asentar es en Administración)', !viejas)
    chk('fuente: ya no está el diálogo de la unidad', !/cob-dialogo-unidad|cob-dlg-unidad/.test(FUENTE))
    chk('fuente: las unidades se cargan en el init (para el historial)', /asegurarUnidades\(\)\.then\(/.test(FUENTE))
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
