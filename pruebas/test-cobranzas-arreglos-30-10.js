// ARREGLOS DE LA AUDITORÍA DEL 30/10/2026 en modulos/cobranzas.html
// (puntos 3 y 5a del pedido de Facu):
//  3) comprobantes_ya_cargados recibe SIEMPRE p_cobranza_id = el id del
//     formulario, también en una cobranza nueva. El id lo genera el celular y
//     es la clave de idempotencia del alta: si la base ya guardó la cobranza
//     (se cortó la señal antes de la respuesta) y el borrador se vuelve a
//     abrir, sus propias transferencias NO pueden salir en rojo ("Ya
//     cargada…") ni trabar Guardar. Con un id que la base todavía no tiene,
//     `c.id <> p_cobranza_id` es verdadero para todas: no cambia nada
//     (pg_get_functiondef del 31/10/2026).
//  5a) En "Por medio de pago", un medio en el que ya no se cobró nada (se
//     borró el efectivo, se sacó el cheque) desaparece de la pantalla: lo que
//     se había escrito en ese bloque ya no cuenta ni traba Guardar ni viaja
//     a aplicar_credito_cliente.
// Se EJECUTAN las funciones reales del módulo, con un DOM falso.
//
//   node pruebas/test-cobranzas-arreglos-30-10.js
// Archivo bajo prueba: ARCHIVO_TEST, o modulos/cobranzas.html.

const fs = require('fs')
const path = require('path')
const { construirCon, FUNCIONES_ASENTAR, CONSTANTES_ASENTAR } = require('./sandbox')
const { fuenteNumeros } = require('./numeros-comun')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/cobranzas.html')
const FUENTE = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${FUENTE.length} bytes)`)

let ok = 0
const fallas = []
function chk(nombre, condicion, detalle) {
  if (condicion) ok++
  else fallas.push(nombre + (detalle !== undefined ? ` — ${String(detalle).slice(0, 500)}` : ''))
}

const PRELUDIO = `
  ${fuenteNumeros()}
  var console = { error(){}, log(){}, warn(){} }
  function nuevoEl(id, dataset = {}) {
    const atributos = {}
    return {
      id, innerHTML: '', textContent: '', value: '', className: '', hidden: false,
      disabled: false, dataset, src: '', max: '',
      querySelectorAll: () => [], querySelector: () => null,
      addEventListener(){}, focus(){}, click(){},
      setAttribute(k, v){ atributos[k] = String(v) }, getAttribute(k){ return atributos[k] ?? null },
      classList: { add(){}, remove(){}, toggle(){} },
    }
  }
  var __els = new Map()
  var __porSelector = {
    '[data-abrir-forma]': ['efectivo', 'cheque', 'echeque', 'transferencia'].map(f => nuevoEl('btn-' + f, { abrirForma: f })),
    '[data-cerrar-forma]': ['efectivo', 'cheque', 'echeque', 'transferencia'].map(f => nuevoEl('cerrar-' + f, { cerrarForma: f })),
    '[data-acciones-comprobante]': ['echeque', 'transferencia'].map(f => nuevoEl('acc-' + f, { accionesComprobante: f })),
    '[data-ayuda-comprobante]': ['echeque', 'transferencia'].map(f => nuevoEl('ayu-' + f, { ayudaComprobante: f })),
  }
  var document = {
    activeElement: null,
    getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) },
    querySelectorAll: (sel) => __porSelector[sel] ?? [],
    querySelector: () => null,
    documentElement: { classList: { add(){}, remove(){} } },
  }
  var navigator = { onLine: true }
  var crypto = { subtle: globalThis.crypto.subtle, randomUUID: (() => { let n = 0; return () => '00000000-0000-4000-8000-' + String(++n).padStart(12, '0') })() }
  var window = { open(){}, print(){}, addEventListener(){}, removeEventListener(){} }
  function setImmediate(f){ return Promise.resolve().then(f) }
  var __timers = []
  function setTimeout(f, ms){ __timers.push({ f, ms }); return __timers.length }
  function clearTimeout(id){ if (id && __timers[id - 1]) __timers[id - 1].f = null }
  function __correrTimers(){ const t = __timers; __timers = []; let n = 0; for (const x of t) if (x.f) { n++; x.f() } return n }

  var __rpcs = []
  var __rpcImpl = async () => ({ data: null, error: null })
  var supabase = {
    from: () => { const q = {}; for (const op of ['select','eq','in','order','range','like','gte','lte','or','maybeSingle']) q[op] = () => q; q.then = (r) => Promise.resolve({ data: [], error: null }).then(r); return q },
    rpc: (n, p) => { __rpcs.push({ nombre: n, params: JSON.parse(JSON.stringify(p)) }); return __rpcImpl(n, p) },
    storage: { from: () => ({
      upload: async () => ({ error: null }),
      createSignedUrl: async () => ({ data: { signedUrl: 'https://firmada/x' }, error: null }),
    }) },
    functions: { invoke: async () => ({ data: null, error: new Error('sin lector') }) },
  }

  // El borrador guardado en el celular (IndexedDB).
  var __borradores = new Map()
  async function dbLeer(store, id){ return __borradores.get(id) ?? null }

  var __llamadas = { exitos: [], errores: [], vistas: [] }
  function mostrarExito(m){ __llamadas.exitos.push(m) } function mostrarError(m){ __llamadas.errores.push(m) }
  function mostrarVistaCob(v){ __llamadas.vistas.push(v) }
  function guardarBorrador(){}
  function pintarCheques(){} function iniciarReintentosFotos(){} function asegurarContadorLecturas(){}
  function escribirImporteEnCampo(){}
  async function dbBorrar(){} async function refrescarListado(){} async function refrescarLocales(){}
  async function urlDeFoto(foto){ return foto ? 'https://firmada/' + foto.id : null }
  function abrirVisor(){}
  function hoyArgentina(){ return '2026-10-31' }
  var STORE_BORRADORES = 'borradores'
  function pasarBarraAUnidad(){ return true }
  async function comprimirFoto(){ return { size: 300 * 1024, type: 'image/jpeg' } }

  var estado = {
    sesion: { user: { id: 'uid' } },
    miEmpleadoId: 'emp-1', miRolApp: 'usuario',
    misTareas: new Set(['cobranzas:cargar']),
    bancos: new Map([['007', 'Galicia'], ['285', 'Macro']]), unidades: [], form: null, detalle: null,
    unidadElegida: null, fabrica: FABRICA_SIN_DATOS, fabricaLista: true, asentar: null,
    cuentasBancoLista: [], cuentasBanco: new Map(),
  }
`

const FUNCIONES = [
  'escCob', 'formatearImporte', 'esFechaIso', 'diasEntre', 'formatearFechaCob', 'nombreBanco', 'nombreBancoDe',
  'tieneTarea', 'textoOpcional', 'chequeParaBase', 'origenDatosDe', 'chequeVacio', 'chequeDesdeBase', 'renglonComoImpreso',
  'formularioVacio', 'pintarFormulario', 'pintarBotonChequeMano', 'abrirFormularioNuevo', 'abrirFormularioLocal', 'guardarCobranza',
  'htmlEtiquetaForma', 'erroresDeEcheque', 'echequeParaBase', 'echequeDesdeBase', 'erroresDeCheque', 'dvBcra',
  'erroresDeTransferencia', 'transferenciaParaBase', 'transferenciaDesdeBase', 'nombresDeCuentas',
  'sumaImportes', 'totalesPorForma', 'usaCobranzaCompleta', 'cuentasParaElegir', 'htmlDatosCheque', 'textoDiasHastaPago',
  'nombreUnidadCob', 'htmlOpcionesCuentas', 'htmlEcheckForm', 'htmlTransferenciaForm', 'pintarFormasNuevas', 'htmlTransferenciaDetalle',
  'pintarResumenFormas', 'htmlResumenFormas', 'echeckDelForm', 'transfDelForm', 'agregarEcheck', 'agregarTransferencia',
  'quitarEcheck', 'quitarTransferencia', 'actualizarEcheck', 'actualizarTransferencia', 'pintarErroresForma',
  'alEscribirEnFormas', 'alTocarEnFormas',
  'totalDelFormulario', 'efectivoDelFormulario', 'motivosParaNoGuardar', 'pintarTotalYGuardado',
  'subirCobranza', 'esErrorDeRed', 'normalizarCliente', 'momentoArgentina',
  'agregarFotos', 'procesarFoto', 'marcarFotoEnMemoria', 'mensajeDelLector', 'pintarEstadoFotos', 'htmlAvisoFoto',
  'fotoLeidaSinProblemas', 'fotoSinSenal', 'textoLecturaFoto', 'textoChequesLeidos', 'chequeDesdeOcr', 'aplicarRenglones',
  // Las dos funciones nuevas de estos arreglos solo se piden si están: así,
  // sobre el código de antes (el baseline de las mutaciones) la suite corre y
  // da rojo por lo que hace, no por no poder armar el sandbox.
  ...FUNCIONES_ASENTAR.filter(n => !['idParaRevisarRepetidos', 'mediosConCobro', 'cancelarSugerenciaTodo'].includes(n) || FUENTE.includes(`function ${n}(`)),
]
const CONSTANTES = [
  'ZONA_AR', 'ACENTOS_COB', 'SIN_ACENTOS_COB', 'DIAS_MAXIMO_DIFERIDO', 'ETIQUETA_ESTADO_COBRANZA', 'ETIQUETA_ESTADO_CHEQUE',
  'puedeCargar', 'puedeVerTodo', 'puedeProcesar', 'puedeEditarAnular', 'TEXTO_BOTON_CHEQUE_MANO', 'SEGUNDOS_LECTURA_LENTA',
  'MAX_INTENTOS_LECTOR',
  ...CONSTANTES_ASENTAR,
]

const NUSS = { id: 'u-nuss', nombre: 'Cucuruchos Nuss', activo: true, prefijo: 'N', logo_url: null }
const CUENTAS = [{ id: 'cta-paz', nombre: 'Macro Paz Mirta', unidad_negocio_id: 'u-nuss', cbu: null }]
const ADMIN = ['cargar', 'ver_todo', 'procesar']

// ── La base de mentira, que responde comprobantes_ya_cargados IGUAL que la
// real (pg_get_functiondef del 31/10/2026): el número normalizado desde 4
// caracteres, la huella, sin las anuladas y sin la cobranza p_cobranza_id.
const normRef = (r) => String(r ?? '').toUpperCase().replace(/[^0-9A-Z]/g, '')
function comoLaBase(transferenciasEnBase, fotosEnBase = []) {
  return (p) => {
    const r = []
    for (const x of p.p_items ?? []) {
      const ref = normRef(x.referencia)
      const sha = String(x.sha256 ?? '').trim().toLowerCase()
      const m = []
      for (const t of transferenciasEnBase) if (ref.length >= 4 && normRef(t.referencia) === ref) m.push({ motivo: 'mismo_numero', ...t })
      for (const f of fotosEnBase) if (sha && f.sha256 === sha) m.push({ motivo: 'misma_foto', ...f, importe: null, referencia: null })
      for (const z of m) {
        if (z.estado === 'anulada') continue
        if (p.p_cobranza_id !== null && p.p_cobranza_id !== undefined && z.cobranza_id === p.p_cobranza_id) continue
        r.push({ clave: x.clave, motivo: z.motivo, cobranza_id: z.cobranza_id, cliente: z.cliente, fecha: z.fecha, importe: z.importe,
          referencia: z.referencia, cargada_por: 'Godoy Yanina', cargada_en: '2026-10-30T13:00:00Z', estado: z.estado ?? 'procesada' })
      }
    }
    return r
  }
}

function sandbox({ tareas = ADMIN } = {}) {
  const S = construirCon(ARCHIVO, {
    preludio: PRELUDIO, funciones: FUNCIONES, constantes: CONSTANTES,
    retorno: `estado, __els, __llamadas, __correrTimers, __borradores,
      __timers(){ return __timers },
      __rpcs(){ return __rpcs }, __setRpc(f){ __rpcImpl = f }`,
  })
  S.estado.misTareas = new Set(tareas.map(t => 'cobranzas:' + t))
  S.estado.unidades = [NUSS]
  S.estado.cuentasBancoLista = CUENTAS
  S.estado.cuentasBanco = new Map(CUENTAS.map(c => [c.id, c]))
  return S
}
const el = (S, id) => S.__els.get(id) ?? { hidden: undefined, innerHTML: '', textContent: '', disabled: undefined }
const esperar = async (n = 12) => { for (let i = 0; i < n; i++) await new Promise(r => setImmediate(r)) }
const rpcs = (S, n) => S.__rpcs().filter(x => x.nombre === n)
const texto = (html) => String(html ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

// ── Punto 5a: la cuenta del cliente, como la arma cliente_pendientes.
const D = (doc_tipo, doc_id, parte, etiqueta, fecha, monto) => ({ doc_tipo, doc_id, parte, etiqueta, fecha, monto, aplicado: 0, pendiente: monto, orden_id: null })
const DOCS = [
  D('corte', 'c-1', 'total', 'Saldo de corte 02/11/2026', '2026-11-02', 50000),
  D('orden', 'o-42', 'N1', 'N1-0042', '2026-11-03', 100000),
  D('orden', 'o-42', 'N2', 'N2-0042', '2026-11-03', 80000),
]
const PENDIENTES = { activo: true, imputa_desde: '2026-11-02T03:00:00Z', saldo_cuenta: 230000, docs: DOCS, creditos: [] }
const claveDoc = (d) => `${d.doc_tipo}|${d.doc_id}|${d.parte}`

function sandboxAplicar() {
  const S = sandbox()
  S.__setRpc(async (n, p) => {
    if (n === 'cliente_pendientes') return { data: PENDIENTES, error: null }
    if (n === 'sugerir_aplicacion') return { data: { items: [], sobra: p.p_monto }, error: null }
    if (n === 'aplicar_credito_cliente') return { data: { aplicado: p.p_items.reduce((s, x) => s + x.monto, 0), a_cuenta: 0 }, error: null }
    if (n === 'cargar_cobranza_asentada') return { data: { id: p.p_id, importe: 0, saldo_cliente: 0, asentada: true }, error: null }
    if (n === 'comprobantes_ya_cargados') return { data: [], error: null }
    return { data: null, error: null }
  })
  S.abrirFormularioNuevo()
  return S
}

// Asentada a DUOLATE con efectivo, una transferencia y (si toca) un cheque,
// y la sección en "Por medio de pago".
async function porMedio(S, { efectivo = '20.000,00', transf = 100000, cheque = 0 } = {}) {
  const f = S.estado.form
  f.unidad_id = 'u-nuss'
  f.efectivo = efectivo
  f.transferencias = transf ? [Object.assign(S.transferenciaVacia('2026-10-31'), { cuenta_id: 'cta-paz', importe: transf, referencia: 'OP-0001' })] : []
  if (cheque) f.cheques = [{ id: 'ch-1', confirmado: true, importe: cheque, foto_id: null }]
  S.estado.asentar = Object.assign(S.estadoAsentarVacio(), { clientes: [{ cliente_id: 'c-duo', nombre: 'DUOLATE', saldo: 0 }] })
  S.elegirClienteAsentar('c-duo')
  await esperar()
  S.__correrTimers(); await esperar()
  S.alTocarEnAplicar({ target: { closest: () => ({ dataset: { aplicarModo: 'medio' } }) } })
  return f
}

async function pruebas() {
  // ══ 3.1 COBRANZA NUEVA: p_cobranza_id = EL ID DEL FORMULARIO ══════════════
  {
    const S = sandbox()
    S.__setRpc(async (n, p) => n === 'comprobantes_ya_cargados' ? { data: comoLaBase([])(p), error: null } : { data: null, error: null })
    S.abrirFormularioNuevo()
    const f = S.estado.form
    chk('una cobranza nueva arranca en modo "nueva" con un id del celular', f.modo === 'nueva' && /^[0-9a-f-]{36}$/.test(f.id), JSON.stringify([f.modo, f.id]))
    f.transferencias = [Object.assign(S.transferenciaVacia('2026-10-31'), { cuenta_id: 'cta-paz', importe: 150000, referencia: '274845028' })]
    await S.revisarRepetidos()
    const ll = rpcs(S, 'comprobantes_ya_cargados')
    chk('nueva: se pregunta a comprobantes_ya_cargados', ll.length === 1, ll.length)
    chk('nueva: p_cobranza_id = el id del formulario (no null)', ll[0]?.params.p_cobranza_id === f.id, JSON.stringify(ll[0]?.params))
    chk('nueva: la base no la tiene, así que no hay nada en rojo', S.repetidoDeTransferencia(f, f.transferencias[0], 0).nivel === null)
    // Edición: también el id (como antes).
    f.modo = 'edicion'
    await S.revisarRepetidos()
    chk('edición: p_cobranza_id = el id de la cobranza que se edita', rpcs(S, 'comprobantes_ya_cargados').at(-1)?.params.p_cobranza_id === f.id)
    // Un formulario sin id (no debería existir): null, no undefined.
    f.modo = 'nueva'
    f.id = undefined
    await S.revisarRepetidos()
    chk('sin id: p_cobranza_id viaja null (nunca se omite)', rpcs(S, 'comprobantes_ya_cargados').at(-1)?.params.p_cobranza_id === null, JSON.stringify(rpcs(S, 'comprobantes_ya_cargados').at(-1)?.params))
  }

  // ══ 3.2 EL BORRADOR QUE LA BASE YA GUARDÓ, REABIERTO: SIN ROJO ═══════════
  // Se cortó la señal después de que la base guardó y antes de la respuesta:
  // el borrador sigue en el celular en modo "nueva", con el MISMO id, y la base
  // ya tiene sus transferencias (y la huella de su foto).
  {
    const S = sandbox()
    const ID = '0000abcd-0000-4000-8000-00000000c0b1'
    const SHA = 'ab'.repeat(32)
    const borrador = Object.assign(S.formularioVacio(ID), {
      estadoLocal: 'lista_para_subir', asentar: true, unidad_id: 'u-nuss', cliente: 'DUOLATE',
      fotos: [{ id: 'foto-1', storage_path: `uid/${ID}/foto-1.jpg`, tipo: 'transferencia', mime: 'image/jpeg', subida: true, leida: true, sha256: SHA }],
      transferencias: [
        Object.assign(S.transferenciaVacia('2026-10-30'), { id: 't-1', cuenta_id: 'cta-paz', importe: 928559.01, referencia: '274845028', foto_id: 'foto-1' }),
        Object.assign(S.transferenciaVacia('2026-10-30'), { id: 't-2', cuenta_id: 'cta-paz', importe: 300000, referencia: '55500011' }),
      ],
    })
    S.__borradores.set(ID, borrador)
    const enBase = [
      { cobranza_id: ID, cliente: 'DUOLATE', fecha: '2026-10-30', importe: 928559.01, referencia: '274845028' },
      { cobranza_id: ID, cliente: 'DUOLATE', fecha: '2026-10-30', importe: 300000, referencia: '55500011' },
    ]
    S.__setRpc(async (n, p) => n === 'comprobantes_ya_cargados' ? { data: comoLaBase(enBase, [{ cobranza_id: ID, cliente: 'DUOLATE', fecha: '2026-10-30', sha256: SHA }])(p), error: null } : { data: null, error: null })
    await S.abrirFormularioLocal(ID)
    const f = S.estado.form
    chk('el borrador se abre tal cual, en modo "nueva"', f === borrador && f.modo === 'nueva')
    chk('al abrirlo con transferencias se programa la revisión enseguida', S.__timers().some(x => x.f && x.ms === 0), JSON.stringify(S.__timers().map(x => [!!x.f, x.ms])))
    S.__correrTimers(); await esperar()
    const ll = rpcs(S, 'comprobantes_ya_cargados')
    chk('borrador reabierto: p_cobranza_id = su propio id', ll.length === 1 && ll[0].params.p_cobranza_id === ID, JSON.stringify(ll.map(x => x.params.p_cobranza_id)))
    chk('borrador reabierto: sus propias transferencias NO salen en rojo (ni amarillo)',
      f.transferencias.every((t, i) => S.repetidoDeTransferencia(f, t, i).nivel === null), JSON.stringify(f.transferencias.map((t, i) => S.repetidoDeTransferencia(f, t, i))))
    chk('borrador reabierto: no hay comprobantes repetidos en rojo', S.hayRepetidosRojos(f) === false)
    chk('borrador reabierto: "Sacá los comprobantes repetidos." no frena Guardar', !S.motivosParaNoGuardar().includes(S.TEXTO_SACAR_REPETIDOS ?? 'Sacá los comprobantes repetidos.'), S.motivosParaNoGuardar().join(' | '))
    const html = el(S, 'cob-lista-transferencias').innerHTML + el(S, 'cob-seccion-formas').innerHTML
    chk('borrador reabierto: ninguna tarjeta pintada en rojo', !/cob-transferencia--repetida/.test(html) && !/Ya cargada/.test(texto(html)))
    // La misma operación cargada en OTRA cobranza sí sigue en rojo.
    enBase.push({ cobranza_id: 'cob-otra', cliente: 'HELADOS SUR', fecha: '2026-10-29', importe: 300000, referencia: '555-000-11' })
    await S.revisarRepetidos()
    const r2 = S.repetidoDeTransferencia(f, f.transferencias[1], 1)
    chk('la misma operación en OTRA cobranza sigue en rojo, con sus datos', r2.nivel === 'rojo' && r2.textos.some(x => /HELADOS SUR/.test(x)), JSON.stringify(r2))
    chk('…y la primera (que solo está en la propia) sigue sin rojo', S.repetidoDeTransferencia(f, f.transferencias[0], 0).nivel === null)
    chk('…y eso sí frena Guardar', S.motivosParaNoGuardar().includes('Sacá los comprobantes repetidos.'), S.motivosParaNoGuardar().join(' | '))
  }

  // ══ 5a.1 EL TRABA: UN MEDIO CON MONTO, SE BORRA LO COBRADO CON ÉL ════════
  {
    const S = sandboxAplicar()
    const f = await porMedio(S, { efectivo: '20.000,00', transf: 100000 })
    chk('por medio: hay bloque de efectivo y de transferencias', /data-aplicar-bloque="efectivo"/.test(el(S, 'cob-aplicar-cuerpo').innerHTML) && /data-aplicar-bloque="transferencia"/.test(el(S, 'cob-aplicar-cuerpo').innerHTML))
    S.actualizarMontoAplicar(claveDoc(DOCS[0]), 'efectivo', '20.000,00')
    S.actualizarMontoAplicar(claveDoc(DOCS[1]), 'transferencia', '100.000,00')
    chk('con los dos medios repartidos, se puede guardar', S.motivosParaNoGuardar().length === 0, S.motivosParaNoGuardar().join(' | '))
    // Se borra el efectivo: el bloque desaparece…
    f.efectivo = ''
    S.pintarTotalYGuardado()
    const cuerpo = el(S, 'cob-aplicar-cuerpo').innerHTML
    chk('sin efectivo cobrado, el bloque de efectivo ya no está en pantalla', !/data-aplicar-bloque="efectivo"/.test(cuerpo) && /data-aplicar-bloque="transferencia"/.test(cuerpo), texto(cuerpo).slice(0, 300))
    // …y lo escrito ahí no traba Guardar.
    const m = S.motivosParaNoGuardar()
    chk('lo escrito en el bloque que desapareció NO traba Guardar', m.length === 0, m.join(' | '))
    chk('el botón Guardar queda habilitado', el(S, 'cob-btn-guardar').disabled === false)
    chk('ni aparece el error bordó de la sección', el(S, 'cob-aplicar-errores').hidden === true, el(S, 'cob-aplicar-errores').innerHTML)
    const items = S.itemsDeAplicacion(f, S.estado.aplicar.datos)
    chk('los items: solo los del medio cobrado (sin el efectivo)', items.length === 1 && items[0].medio === 'transferencia' && items[0].monto === 100000, JSON.stringify(items))
    const r = S.resumenAplicacion(f, S.estado.aplicar.datos)
    chk('las cifras: cobrado 100.000, aplicado 100.000, a cuenta 0', r.cobrado === 100000 && r.aplicado === 100000 && r.aCuenta === 0 && r.aplicadoPorMedio.efectivo === 0, JSON.stringify(r))
    // Guardar: a aplicar_credito_cliente no va el efectivo fantasma.
    await S.guardarCobranza()
    const ap = rpcs(S, 'aplicar_credito_cliente')
    chk('se asienta y se aplica', rpcs(S, 'cargar_cobranza_asentada').length === 1 && ap.length === 1, S.__rpcs().map(x => x.nombre).join(','))
    chk('aplicar_credito_cliente NO recibe el medio sin cobro', ap[0]?.params.p_items.length === 1 && ap[0].params.p_items.every(x => x.medio === 'transferencia'), JSON.stringify(ap[0]?.params.p_items))
  }

  // ══ 5a.2 UN CHEQUE QUE SE SACA, Y QUE VUELVE ═════════════════════════════
  {
    const S = sandboxAplicar()
    const f = await porMedio(S, { efectivo: '', transf: 100000, cheque: 80000 })
    S.alTocarEnAplicar({ target: { closest: () => ({ dataset: { aplicarSugerir: 'cheque', aplicarParte: 'N2' } }) } })
    S.actualizarMontoAplicar(claveDoc(DOCS[1]), 'transferencia', '100.000,00')
    chk('cheque al N2 y transferencia al N1: se puede guardar', S.motivosParaNoGuardar().length === 0, S.motivosParaNoGuardar().join(' | '))
    // Se saca el cheque.
    f.cheques = []
    S.pintarTotalYGuardado()
    chk('sin cheques cobrados, el bloque de cheques ya no está', !/data-aplicar-bloque="cheque"/.test(el(S, 'cob-aplicar-cuerpo').innerHTML))
    chk('sin el cheque, Guardar no queda trabado por lo que tenía', S.motivosParaNoGuardar().length === 0, S.motivosParaNoGuardar().join(' | '))
    chk('sin el cheque, "Aplicado" cuenta solo la transferencia', S.resumenAplicacion(f, S.estado.aplicar.datos).aplicado === 100000)
    // Un medio que sigue cobrado pero menos que lo escrito: eso SÍ frena (está a la vista).
    f.cheques = [{ id: 'ch-2', confirmado: true, importe: 50000, foto_id: null }]
    S.pintarTotalYGuardado()
    chk('el cheque vuelve con menos: su bloque está a la vista', /data-aplicar-bloque="cheque"/.test(el(S, 'cob-aplicar-cuerpo').innerHTML))
    const m = S.motivosParaNoGuardar()
    chk('…y lo escrito de más en un bloque VISIBLE sigue frenando', m.some(x => /^Con cheques aplicás \$\s80\.000,00 y se cobró \$\s50\.000,00\.$/.test(x)), m.join(' | '))
    // En "Aplicar todo" no cambia nada.
    f.aplicacion.modo = 'todo'
    chk('en "Aplicar todo" los items siguen sin medio', S.itemsDeAplicacion(f, S.estado.aplicar.datos).every(x => x.medio === null))
  }

  // ══ 5b. "POR MEDIO DE PAGO" CON UNA SUGERENCIA DE "APLICAR TODO" PENDIENTE ═
  // Se cambia lo cobrado (queda el retardo de 400 ms o la respuesta en camino)
  // y se toca "Por medio de pago": la pantalla NO vuelve sola a "Aplicar todo".
  {
    // (a) El retardo de 400 ms todavía no venció.
    const S = sandboxAplicar()
    const f = S.estado.form
    f.unidad_id = 'u-nuss'
    f.efectivo = '20.000,00'
    f.transferencias = [Object.assign(S.transferenciaVacia('2026-10-31'), { cuenta_id: 'cta-paz', importe: 100000, referencia: 'OP-0001' })]
    S.estado.asentar = Object.assign(S.estadoAsentarVacio(), { clientes: [{ cliente_id: 'c-duo', nombre: 'DUOLATE', saldo: 0 }] })
    S.elegirClienteAsentar('c-duo')
    await esperar()
    S.__correrTimers(); await esperar()
    chk('(a) arranca en "Aplicar todo", ya sugerido', f.aplicacion?.modo === 'todo' && rpcs(S, 'sugerir_aplicacion').length >= 1)
    f.efectivo = '40.000,00'
    S.pintarTotalYGuardado()
    chk('(a) cambió lo cobrado: queda el retardo de 400 ms', S.__timers().some(x => x.f && x.ms === 400))
    const pedidas = rpcs(S, 'sugerir_aplicacion').length
    S.alTocarEnAplicar({ target: { closest: () => ({ dataset: { aplicarModo: 'medio' } }) } })
    chk('(a) al tocar "Por medio de pago" el retardo se cancela', !S.__timers().some(x => x.f && x.ms === 400), JSON.stringify(S.__timers().map(x => [!!x.f, x.ms])))
    S.__correrTimers(); await esperar()
    chk('(a) pasado el retardo, sigue en "Por medio de pago"', f.aplicacion.modo === 'medio')
    chk('(a) …con los bloques por medio en pantalla', /data-aplicar-bloque="efectivo"/.test(el(S, 'cob-aplicar-cuerpo').innerHTML) && /aria-pressed="true" data-aplicar-modo="medio"/.test(el(S, 'cob-aplicar-cuerpo').innerHTML))
    chk('(a) y no se pidió otra sugerencia del total', rpcs(S, 'sugerir_aplicacion').length === pedidas)
    // En "Por medio de pago", nada que la llame cambia el modo.
    await S.sugerirAplicarTodo(null)
    chk('(a) sugerirAplicarTodo en "Por medio de pago": no pide nada ni cambia el modo', f.aplicacion.modo === 'medio' && rpcs(S, 'sugerir_aplicacion').length === pedidas)
    // Volver a "Aplicar todo" sin haber tocado: sugiere con el total nuevo.
    S.alTocarEnAplicar({ target: { closest: () => ({ dataset: { aplicarModo: 'todo' } }) } })
    await esperar()
    chk('(a) volver a "Aplicar todo" sin tocar: sugiere con el total nuevo', f.aplicacion.modo === 'todo' && rpcs(S, 'sugerir_aplicacion').at(-1)?.params.p_monto === 140000, JSON.stringify(rpcs(S, 'sugerir_aplicacion').at(-1)?.params))
  }
  {
    // (b) La respuesta de la base está en camino.
    const S = sandboxAplicar()
    const f = S.estado.form
    f.unidad_id = 'u-nuss'
    f.efectivo = '20.000,00'
    f.transferencias = [Object.assign(S.transferenciaVacia('2026-10-31'), { cuenta_id: 'cta-paz', importe: 100000, referencia: 'OP-0001' })]
    S.estado.asentar = Object.assign(S.estadoAsentarVacio(), { clientes: [{ cliente_id: 'c-duo', nombre: 'DUOLATE', saldo: 0 }] })
    S.elegirClienteAsentar('c-duo')
    await esperar()
    S.__correrTimers(); await esperar()
    const enCamino = []
    const respuesta = { items: [{ doc_tipo: 'corte', doc_id: 'c-1', parte: 'total', etiqueta: 'x', monto: 50000 }, { doc_tipo: 'orden', doc_id: 'o-42', parte: 'N1', etiqueta: 'y', monto: 90000 }], sobra: 0 }
    S.__setRpc(async (n, p) => {
      if (n === 'sugerir_aplicacion') return new Promise(r => enCamino.push(() => r({ data: respuesta, error: null })))
      if (n === 'cliente_pendientes') return { data: PENDIENTES, error: null }
      return { data: null, error: null }
    })
    f.efectivo = '40.000,00'
    S.pintarTotalYGuardado()
    S.__correrTimers(); await esperar()
    chk('(b) la sugerencia del total quedó en camino', enCamino.length === 1)
    S.alTocarEnAplicar({ target: { closest: () => ({ dataset: { aplicarModo: 'medio' } }) } })
    enCamino[0]?.(); await esperar()
    chk('(b) llega la respuesta vieja: sigue en "Por medio de pago"', f.aplicacion.modo === 'medio')
    chk('(b) …y la pantalla muestra los bloques por medio', /data-aplicar-bloque=/.test(el(S, 'cob-aplicar-cuerpo').innerHTML))
    // Tocó a mano en "Por medio de pago" y volvió a "Aplicar todo" (no se
    // vuelve a sugerir porque tocó): una respuesta vieja no pisa nada.
    S.__setRpc(async (n) => n === 'sugerir_aplicacion' ? new Promise(r => enCamino.push(() => r({ data: respuesta, error: null }))) : { data: PENDIENTES, error: null })
    S.alTocarEnAplicar({ target: { closest: () => ({ dataset: { aplicarModo: 'todo' } }) } })
    await esperar()
    chk('(b) de vuelta en "Aplicar todo" sin tocar: se pide una sugerencia nueva', enCamino.length === 2)
    S.alTocarEnAplicar({ target: { closest: () => ({ dataset: { aplicarModo: 'medio' } }) } })
    S.actualizarMontoAplicar(claveDoc(DOCS[1]), 'transferencia', '100.000,00')
    S.alTocarEnAplicar({ target: { closest: () => ({ dataset: { aplicarModo: 'todo' } }) } })
    const antesMontos = JSON.stringify(f.aplicacion.montos)
    // (Sobre el código de antes no hay segunda pedida: la respuesta vieja ya
    // había devuelto la pantalla a "Aplicar todo".)
    for (const soltar of enCamino.slice(1)) soltar()
    await esperar()
    chk('(b) la respuesta que estaba en camino no pisa lo elegido ni lo marca como no tocado',
      f.aplicacion.modo === 'todo' && f.aplicacion.tocado === true && JSON.stringify(f.aplicacion.montos) === antesMontos, JSON.stringify(f.aplicacion))
  }

  // ══ FUENTE ════════════════════════════════════════════════════════════════
  {
    chk('fuente: la llamada a comprobantes_ya_cargados ya no depende del modo',
      !/comprobantes_ya_cargados'[^\n]*f\.modo === 'edicion'/.test(FUENTE))
  }
}

pruebas().then(() => {
  console.log(`\n${ok}/${ok + fallas.length} verde`)
  if (fallas.length) {
    console.log('\nFALLAS:')
    for (const f of fallas) console.log('  ✗ ' + f)
    process.exit(1)
  }
}).catch(err => { console.log('ERROR:', err?.stack ?? err); process.exit(1) })
