// A QUÉ SE APLICA LA COBRANZA Y EL RECIBO (pedido de Facu del 30/10/2026), en
// modulos/cobranzas.html (la parte de Cuentas corrientes va por traspaso):
//  - al asentar (cobranzas:procesar) a un cliente CON CORTE: los renglones
//    pendientes, "Aplicar todo" con sugerir_aplicacion (el último queda
//    parcial), "Solo N1" / "Solo N2", "Por medio de pago" (cada medio a los
//    renglones que se elijan), Total cobrado / Aplicado / Queda a cuenta, y lo
//    que está mal frena Guardar;
//  - guardar asienta como siempre y después aplicar_credito_cliente('cobranza',
//    id, items); sus errores se muestran tal cual; "Ver / enviar recibo";
//  - el recibo de recibo_cobranza en una hoja (con los tres medios o uno, a
//    cuenta, saldo, sin "N1" para un cliente solo N2);
//  - un cliente SIN corte no ve nada nuevo.
// Se EJECUTAN las funciones reales del módulo, con un DOM falso.
//
//   node pruebas/test-cobranzas-aplicar.js
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
  var __clasesRaiz = new Set()
  var document = {
    activeElement: null,
    getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) },
    querySelectorAll: (sel) => __porSelector[sel] ?? [],
    querySelector: () => null,
    documentElement: { classList: { add(c){ __clasesRaiz.add(c) }, remove(c){ __clasesRaiz.delete(c) } } },
  }
  var navigator = { onLine: true }
  var crypto = { subtle: globalThis.crypto.subtle, randomUUID: (() => { let n = 0; return () => '00000000-0000-4000-8000-' + String(++n).padStart(12, '0') })() }
  var __impresiones = 0
  var window = { open(){}, print(){ __impresiones++ }, addEventListener(){}, removeEventListener(){} }
  function setImmediate(f){ return Promise.resolve().then(f) }
  var __timers = []
  function setTimeout(f, ms){ __timers.push({ f, ms }); return __timers.length }
  function clearTimeout(id){ if (id && __timers[id - 1]) __timers[id - 1].f = null }
  function __correrTimers(){ const t = __timers; __timers = []; let n = 0; for (const x of t) if (x.f) { n++; x.f() } return n }

  var __rpcs = []
  var __rpcImpl = async () => ({ data: null, error: null })
  var __invokeImpl = async () => ({ data: null, error: new Error('sin lector') })
  var supabase = {
    from: () => { const q = {}; for (const op of ['select','eq','in','order','range','like','gte','lte','or','maybeSingle']) q[op] = () => q; q.then = (r) => Promise.resolve({ data: [], error: null }).then(r); return q },
    rpc: (n, p) => { __rpcs.push({ nombre: n, params: JSON.parse(JSON.stringify(p)) }); return __rpcImpl(n, p) },
    storage: { from: () => ({
      upload: async () => ({ error: null }),
      createSignedUrl: async () => ({ data: { signedUrl: 'https://firmada/x' }, error: null }),
    }) },
    functions: { invoke: (nombre, op) => __invokeImpl(nombre, op) },
  }

  var __llamadas = { exitos: [], errores: [], vistas: [] }
  function mostrarExito(m){ __llamadas.exitos.push(m) } function mostrarError(m){ __llamadas.errores.push(m) }
  function mostrarVistaCob(v){ __llamadas.vistas.push(v) }
  function guardarBorrador(){}
  function pintarCheques(){} function iniciarReintentosFotos(){} function asegurarContadorLecturas(){}
  function escribirImporteEnCampo(){}
  async function dbBorrar(){} async function refrescarListado(){} async function refrescarLocales(){}
  async function urlDeFoto(foto){ return foto ? 'https://firmada/' + foto.id : null }
  function abrirVisor(){}
  function hoyArgentina(){ return '2026-11-05' }
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
  'formularioVacio', 'pintarFormulario', 'pintarBotonChequeMano', 'abrirFormularioNuevo', 'guardarCobranza',
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
  ...FUNCIONES_ASENTAR,
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

// Lo que debe el cliente, como lo arma cliente_pendientes (del más viejo al
// más nuevo). Uno ya pagado no se ofrece.
const D = (doc_tipo, doc_id, parte, etiqueta, fecha, monto, aplicado = 0) => ({ doc_tipo, doc_id, parte, etiqueta, fecha, monto, aplicado, pendiente: monto - aplicado, orden_id: null })
const DOCS = [
  D('corte', 'c-1', 'total', 'Saldo de corte 02/11/2026', '2026-11-02', 50000),
  D('orden', 'o-41', 'total', 'Orden N-0041', '2026-11-02', 10000, 10000),
  D('orden', 'o-42', 'N1', 'N1-0042', '2026-11-03', 100000),
  D('orden', 'o-42', 'N2', 'N2-0042', '2026-11-03', 80000),
  D('nota_debito', 'nd-1', 'total', 'Nota de débito N-ND-0001', '2026-11-04', 30000),
]
const PENDIENTES = { activo: true, imputa_desde: '2026-11-02T03:00:00Z', saldo_cuenta: 260000, docs: DOCS, creditos: [] }

// sugerir_aplicacion, igual que la base (pg_get_functiondef del 30/10/2026).
function sugerirComoLaBase(p) {
  let resta = p.p_monto
  const items = []
  for (const d of DOCS) {
    if (resta <= 0) break
    if (!(d.pendiente > 0) || (p.p_parte && d.parte !== p.p_parte)) continue
    const toma = Math.min(resta, d.pendiente)
    items.push({ doc_tipo: d.doc_tipo, doc_id: d.doc_id, parte: d.parte, etiqueta: d.etiqueta, monto: Math.round(toma * 100) / 100 })
    resta -= toma
  }
  return { items, sobra: Math.max(Math.round(resta * 100) / 100, 0) }
}

function sandbox({ pendientes = PENDIENTES, tareas = ADMIN, aplicar = null } = {}) {
  const S = construirCon(ARCHIVO, {
    preludio: PRELUDIO, funciones: FUNCIONES, constantes: CONSTANTES,
    retorno: `estado, __els, __llamadas, __porSelector, __correrTimers, __clasesRaiz,
      __impresiones(){ return __impresiones },
      __timers(){ return __timers },
      __rpcs(){ return __rpcs }, __setRpc(f){ __rpcImpl = f }`,
  })
  S.estado.misTareas = new Set(tareas.map(t => 'cobranzas:' + t))
  S.estado.unidades = [NUSS]
  S.estado.cuentasBancoLista = CUENTAS
  S.estado.cuentasBanco = new Map(CUENTAS.map(c => [c.id, c]))
  S.__setRpc(async (n, p) => {
    if (n === 'cliente_pendientes') return { data: pendientes, error: null }
    if (n === 'sugerir_aplicacion') return { data: sugerirComoLaBase(p), error: null }
    if (n === 'aplicar_credito_cliente') return aplicar ? aplicar(p) : { data: { aplicado: p.p_items.reduce((s, x) => s + x.monto, 0), a_cuenta: 0 }, error: null }
    if (n === 'cargar_cobranza_asentada') return { data: { id: p.p_id, importe: 120000, saldo_cliente: 140000, asentada: true }, error: null }
    return { data: null, error: null }
  })
  S.abrirFormularioNuevo()
  return S
}
const el = (S, id) => S.__els.get(id) ?? { hidden: undefined, innerHTML: '', textContent: '' }
const esperar = async (n = 12) => { for (let i = 0; i < n; i++) await new Promise(r => setImmediate(r)) }
const texto = (html) => String(html ?? '').replace(/<[^>]*>/g, ' ').replace(/ /g, ' ').replace(/\s+/g, ' ').trim()
const rpcs = (S, n) => S.__rpcs().filter(x => x.nombre === n)
const clave = (d) => `${d.doc_tipo}|${d.doc_id}|${d.parte}`

// Un formulario asentado a DUOLATE con efectivo y una transferencia, la cuenta
// del cliente leída y (si toca) la primera sugerencia hecha.
async function conCliente(S, { efectivo = '20.000,00', transf = 100000, cheques = 0 } = {}) {
  const f = S.estado.form
  f.unidad_id = 'u-nuss'
  f.efectivo = efectivo
  f.transferencias = transf ? [Object.assign(S.transferenciaVacia('2026-11-05'), { cuenta_id: 'cta-paz', importe: transf, referencia: '0001' })] : []
  // Un cheque de papel confirmado (solo cuenta su importe para estos totales).
  if (cheques) f.cheques = [{ id: 'ch-1', confirmado: true, importe: cheques, foto_id: null }]
  S.estado.asentar = Object.assign(S.estadoAsentarVacio(), { clientes: [{ cliente_id: 'c-duo', nombre: 'DUOLATE', saldo: 0 }] })
  S.elegirClienteAsentar('c-duo')
  await esperar()
  S.__correrTimers(); await esperar()
  return f
}

async function pruebas() {
  // ══ 1. SIN CORTE: NADA NUEVO ══════════════════════════════════════════════
  {
    const S = sandbox({ pendientes: { activo: false, docs: [], creditos: [], saldo_cuenta: 0 } })
    const f = await conCliente(S)
    chk('sin corte: la sección no aparece', el(S, 'cob-aplicar').hidden === true)
    chk('sin corte: la barra de abajo no dice nada nuevo', el(S, 'cob-barra-aplicar').hidden === true)
    chk('sin corte: no se pide ninguna sugerencia', rpcs(S, 'sugerir_aplicacion').length === 0)
    chk('sin corte: nada nuevo frena el guardado', S.motivosParaNoGuardar().length === 0, S.motivosParaNoGuardar().join(' | '))
    await S.guardarCobranza()
    chk('sin corte: se asienta como hoy (cargar_cobranza_asentada) y NO se aplica', rpcs(S, 'cargar_cobranza_asentada').length === 1 && rpcs(S, 'aplicar_credito_cliente').length === 0)
    chk('sin corte: no hay cartel de recién asentada ni recibo', !S.estado.recienAsentada && el(S, 'cob-recien-asentada').hidden !== false)
    chk('sin corte: se lee la cuenta UNA vez', rpcs(S, 'cliente_pendientes').length === 1 && rpcs(S, 'cliente_pendientes')[0].params.p_cliente_id === 'c-duo')
    void f
    // El chofer (sin procesar) ni siquiera lee la cuenta.
    const C = sandbox({ tareas: ['cargar'] })
    C.estado.form.cliente = 'DUOLATE'
    C.estado.form.efectivo = '1.000,00'
    C.pintarTotalYGuardado(); await esperar()
    chk('el chofer no lee la cuenta del cliente ni ve la sección', rpcs(C, 'cliente_pendientes').length === 0 && el(C, 'cob-aplicar').hidden === true)
    // Una edición nunca se asienta sola: tampoco aplica.
    const E = sandbox()
    E.estado.form.modo = 'edicion'
    E.estado.form.cliente_id = 'c-duo'
    E.pintarTotalYGuardado(); await esperar()
    chk('una edición no lee la cuenta ni muestra la sección', rpcs(E, 'cliente_pendientes').length === 0 && el(E, 'cob-aplicar').hidden === true)
  }

  // ══ 2. APLICAR TODO: DEL MÁS VIEJO AL MÁS NUEVO, EL ÚLTIMO PARCIAL ═════════
  {
    const S = sandbox()
    const f = await conCliente(S)
    chk('con corte: la sección aparece', el(S, 'cob-aplicar').hidden === false)
    const sug = rpcs(S, 'sugerir_aplicacion')
    chk('"Aplicar todo" por defecto: sugerir_aplicacion con el total y sin parte', sug.length === 1 && sug[0].params.p_monto === 120000 && sug[0].params.p_parte === null && sug[0].params.p_cliente_id === 'c-duo', JSON.stringify(sug.map(x => x.params)))
    const items = S.itemsDeAplicacion(f, S.estado.aplicar.datos)
    chk('reparte: el corte entero y el N1 PARCIAL (el último)', items.length === 2 && items[0].doc_tipo === 'corte' && items[0].monto === 50000 &&
      items[1].parte === 'N1' && items[1].monto === 70000, JSON.stringify(items))
    chk('en "Aplicar todo" los items van sin medio', items.every(x => x.medio === null))
    const cifras = texto(el(S, 'cob-aplicar-cifras').innerHTML)
    chk('arriba: Total cobrado / Aplicado / Queda a cuenta', cifras === 'Total cobrado $ 120.000,00 Aplicado $ 120.000,00 Queda a cuenta $ 0,00', cifras)
    chk('y siempre a la vista en la barra de abajo, junto al total', el(S, 'cob-barra-aplicar').hidden === false && texto(el(S, 'cob-barra-aplicar').textContent) === 'Aplicado $ 120.000,00 · Queda a cuenta $ 0,00', el(S, 'cob-barra-aplicar').textContent)
    const cuerpo = el(S, 'cob-aplicar-cuerpo').innerHTML
    chk('la lista: solo lo PENDIENTE (la orden ya pagada no está)', !/Orden N-0041/.test(cuerpo) && /Saldo de corte 02\/11\/2026/.test(cuerpo) && /N1-0042/.test(cuerpo) && /N2-0042/.test(cuerpo) && /Nota de débito N-ND-0001/.test(cuerpo), cuerpo.slice(0, 600))
    chk('cada renglón: etiqueta, fecha, monto, pendiente y "Aplicar"', /N1-0042 03\/11\/2026 · Monto \$ 100\.000,00 · Pendiente \$ 100\.000,00/.test(texto(cuerpo)) && (cuerpo.match(/data-aplicar-doc=/g) || []).length === 4, cuerpo.slice(0, 900))
    chk('los botones "Solo N1" y "Solo N2" (hay renglones de las dos partes)', /data-aplicar-parte="N1">Solo N1</.test(cuerpo) && /data-aplicar-parte="N2">Solo N2</.test(cuerpo))
    chk('el modo "Aplicar todo" marcado', /cob-segmento__opcion--activo" aria-pressed="true" data-aplicar-modo="todo"/.test(cuerpo))
    chk('nada mal: Guardar no se frena', S.motivosParaNoGuardar().length === 0, S.motivosParaNoGuardar().join(' | '))
    // Solo N2.
    S.alTocarEnAplicar({ target: { closest: () => ({ dataset: { aplicarSugerir: 'todo', aplicarParte: 'N2' } }) } })
    await esperar()
    chk('"Solo N2": sugerir_aplicacion con p_parte N2', rpcs(S, 'sugerir_aplicacion').at(-1).params.p_parte === 'N2')
    const r2 = S.resumenAplicacion(f, S.estado.aplicar.datos)
    chk('"Solo N2": va solo al N2 y el resto queda a cuenta', r2.aplicado === 80000 && r2.aCuenta === 40000 && S.itemsDeAplicacion(f, S.estado.aplicar.datos).every(x => x.parte === 'N2'), JSON.stringify(r2))
    S.alTocarEnAplicar({ target: { closest: () => ({ dataset: { aplicarSugerir: 'todo', aplicarParte: 'N1' } }) } })
    await esperar()
    chk('"Solo N1": todo el N1 y 20.000 a cuenta', S.resumenAplicacion(f, S.estado.aplicar.datos).aplicado === 100000 && S.resumenAplicacion(f, S.estado.aplicar.datos).aCuenta === 20000)
    // Cambia lo cobrado: sin tocar a mano, se vuelve a sugerir (con retardo).
    S.alTocarEnAplicar({ target: { closest: () => ({ dataset: { aplicarSugerir: 'todo', aplicarParte: '' } }) } })
    await esperar()
    f.efectivo = '40.000,00'
    S.pintarTotalYGuardado()
    chk('cambió lo cobrado: se programa otra sugerencia con retardo (400 ms)', S.__timers().some(x => x.f && x.ms === 400))
    S.__correrTimers(); await esperar()
    chk('…con el total nuevo', rpcs(S, 'sugerir_aplicacion').at(-1).params.p_monto === 140000)
    // Tocado a mano: ya no se pisa.
    S.actualizarMontoAplicar(clave(DOCS[0]), null, '10.000,00')
    f.efectivo = '50.000,00'
    S.pintarTotalYGuardado()
    chk('tocado a mano: un total nuevo NO vuelve a sugerir', !S.__timers().some(x => x.f && x.ms === 400))
    chk('lo escrito a mano cuenta', S.resumenAplicacion(f, S.estado.aplicar.datos).aplicado === 10000 + 90000, JSON.stringify(S.resumenAplicacion(f, S.estado.aplicar.datos)))
    // Más que el pendiente: se frena.
    S.actualizarMontoAplicar(clave(DOCS[0]), null, '60.000,00')
    const m = S.motivosParaNoGuardar()
    chk('un renglón con más que su pendiente frena Guardar', m.some(x => /^Saldo de corte 02\/11\/2026: le querés aplicar \$\s60\.000,00 y tiene \$\s50\.000,00 pendientes\.$/.test(x)), m.join(' | '))
    chk('…y se dice en la sección (bordó)', el(S, 'cob-aplicar-errores').hidden === false && /le querés aplicar/.test(el(S, 'cob-aplicar-errores').innerHTML))
    S.actualizarMontoAplicar(clave(DOCS[4]), null, '30.000,00')
    S.actualizarMontoAplicar(clave(DOCS[3]), null, '80.000,00')
    chk('más aplicado que cobrado también frena', S.motivosParaNoGuardar().some(x => /^Aplicás \$\s260\.000,00 y se cobró \$\s150\.000,00\.$/.test(x)), S.motivosParaNoGuardar().join(' | '))
  }

  // ══ 3. QUEDA A CUENTA ═════════════════════════════════════════════════════
  {
    const S = sandbox()
    const f = await conCliente(S, { efectivo: '200.000,00', transf: 100000 })
    const r = S.resumenAplicacion(f, S.estado.aplicar.datos)
    chk('cobra más de lo que debe: aplica los 260.000 pendientes y 40.000 quedan a cuenta', r.cobrado === 300000 && r.aplicado === 260000 && r.aCuenta === 40000, JSON.stringify(r))
    chk('…a cuenta en la cabecera', /Queda a cuenta \$\s40\.000,00/.test(texto(el(S, 'cob-aplicar-cifras').innerHTML)))
    // Sin nada pendiente.
    const V = sandbox({ pendientes: { ...PENDIENTES, docs: [DOCS[1]] } })
    await conCliente(V)
    chk('sin nada pendiente: "todo queda a cuenta"', /El cliente no tiene nada pendiente: todo queda a cuenta\./.test(el(V, 'cob-aplicar-cuerpo').innerHTML))
  }

  // ══ 4. POR MEDIO DE PAGO: CHEQUES A N2, TRANSFERENCIA A N1 ════════════════
  {
    const S = sandbox()
    const f = await conCliente(S, { efectivo: '', transf: 100000, cheques: 150000 })
    S.alTocarEnAplicar({ target: { closest: () => ({ dataset: { aplicarModo: 'medio' } }) } })
    const cuerpo = el(S, 'cob-aplicar-cuerpo').innerHTML
    chk('por medio: un bloque por medio cobrado (cheques y transferencias, sin efectivo)', /data-aplicar-bloque="cheque"/.test(cuerpo) && /data-aplicar-bloque="transferencia"/.test(cuerpo) && !/data-aplicar-bloque="efectivo"/.test(cuerpo))
    chk('…con lo cobrado por medio', /Cheques \$\s150\.000,00/.test(cuerpo) && /Transferencias \$\s100\.000,00/.test(cuerpo), texto(cuerpo).slice(0, 300))
    S.alTocarEnAplicar({ target: { closest: () => ({ dataset: { aplicarSugerir: 'cheque', aplicarParte: 'N2' } }) } })
    S.alTocarEnAplicar({ target: { closest: () => ({ dataset: { aplicarSugerir: 'transferencia', aplicarParte: 'N1' } }) } })
    const items = S.itemsDeAplicacion(f, S.estado.aplicar.datos)
    chk('cheques al N2 (80.000) y la transferencia al N1 (100.000), cada uno con su medio',
      items.length === 2 && items.some(x => x.medio === 'cheque' && x.parte === 'N2' && x.monto === 80000) && items.some(x => x.medio === 'transferencia' && x.parte === 'N1' && x.monto === 100000), JSON.stringify(items))
    const r = S.resumenAplicacion(f, S.estado.aplicar.datos)
    chk('cabecera: 250.000 cobrados, 180.000 aplicados, 70.000 a cuenta', r.cobrado === 250000 && r.aplicado === 180000 && r.aCuenta === 70000, JSON.stringify(r))
    chk('nada mal: se puede guardar', S.motivosParaNoGuardar().length === 0, S.motivosParaNoGuardar().join(' | '))
    // Lo que tomó un medio no lo vuelve a tomar otro.
    S.alTocarEnAplicar({ target: { closest: () => ({ dataset: { aplicarSugerir: 'cheque', aplicarParte: '' } }) } })
    const it2 = S.itemsDeAplicacion(f, S.estado.aplicar.datos).filter(x => x.medio === 'cheque')
    chk('sugerir cheques sin parte: corte, N2 y la nota, SIN el N1 que ya tomó la transferencia',
      it2.map(x => `${x.doc_tipo}:${x.parte}:${x.monto}`).join(',') === 'corte:total:50000,orden:N2:80000,nota_debito:total:20000', JSON.stringify(it2))
    // Medio excedido.
    S.actualizarMontoAplicar(clave(DOCS[2]), 'transferencia', '100.000,00')
    S.actualizarMontoAplicar(clave(DOCS[4]), 'transferencia', '10.000,00')
    const m = S.motivosParaNoGuardar()
    chk('con un medio más que lo cobrado: se dice y frena Guardar', m.some(x => /^Con transferencias aplicás \$\s110\.000,00 y se cobró \$\s100\.000,00\.$/.test(x)), m.join(' | '))
    chk('el mismo renglón por dos medios suma contra su pendiente', m.some(x => /^Nota de débito N-ND-0001: le querés aplicar \$\s30\.000,00 y tiene \$\s30\.000,00/.test(x)) === false && !m.some(x => /N-ND-0001/.test(x)), m.join(' | '))
    S.actualizarMontoAplicar(clave(DOCS[4]), 'transferencia', '20.000,00')
    chk('…y si pasa el pendiente entre los dos medios, se frena', S.motivosParaNoGuardar().some(x => /^Nota de débito N-ND-0001: le querés aplicar \$\s40\.000,00 y tiene \$\s30\.000,00 pendientes\.$/.test(x)), S.motivosParaNoGuardar().join(' | '))
    // Volver a "Aplicar todo" sin haber tocado a mano en ese modo: no pisa lo de por medio.
    chk('en "Aplicar todo" no cuentan los límites por medio', (() => { f.aplicacion.modo = 'todo'; return !S.motivosParaNoGuardar().some(x => /^Con /.test(x)) })())
  }

  // ══ 5. GUARDAR: ASIENTA Y DESPUÉS APLICA; EL ERROR DE LA BASE, TAL CUAL ═══
  {
    const S = sandbox()
    const f = await conCliente(S)
    const id = f.id
    await S.guardarCobranza()
    const orden = S.__rpcs().map(x => x.nombre).filter(n => n === 'cargar_cobranza_asentada' || n === 'aplicar_credito_cliente')
    chk('primero asienta (como hoy) y DESPUÉS aplica', orden.join(',') === 'cargar_cobranza_asentada,aplicar_credito_cliente', orden.join(','))
    const ap = rpcs(S, 'aplicar_credito_cliente')[0]?.params
    chk('aplicar_credito_cliente(cliente, "cobranza", el id de la cobranza, items)', ap && ap.p_cliente_id === 'c-duo' && ap.p_credito_tipo === 'cobranza' && ap.p_credito_id === id &&
      ap.p_items.length === 2 && ap.p_items[0].doc_tipo === 'corte' && ap.p_items[1].monto === 70000 && 'medio' in ap.p_items[0], JSON.stringify(ap))
    chk('se cierra el formulario y vuelve al listado', S.estado.form === null && S.__llamadas.vistas.at(-1) === 'listado')
    const cartel = el(S, 'cob-recien-asentada')
    chk('arriba del listado: lo asentado, lo aplicado y "Ver / enviar recibo"', cartel.hidden === false && /Cobranza asentada · DUOLATE/.test(texto(cartel.innerHTML)) &&
      /Aplicado \$\s120\.000,00 · Queda a cuenta \$\s0,00/.test(texto(cartel.innerHTML)) && /data-recien-recibo>Ver \/ enviar recibo</.test(cartel.innerHTML), cartel.innerHTML)
    // "Cerrar".
    await S.alTocarRecienAsentada({ target: { closest: () => ({ dataset: { recienCerrar: '' }, disabled: false }) } })
    chk('"Cerrar" saca el cartel', cartel.hidden === true && S.estado.recienAsentada === null)

    // El error de la base, tal cual, y "Volver a intentar aplicar".
    const MSJ = 'Lo aplicado con un medio de pago supera lo que se cobró con ese medio (cheques $ 0,00, transferencias $ 100.000,00, efectivo $ 20.000,00).'
    let veces = 0
    const E = sandbox({ aplicar: () => (++veces === 1 ? { data: null, error: { message: MSJ } } : { data: { aplicado: 120000, a_cuenta: 0 }, error: null }) })
    await conCliente(E)
    await E.guardarCobranza()
    const c2 = el(E, 'cob-recien-asentada')
    chk('la base no deja aplicar: su mensaje TAL CUAL', c2.hidden === false && c2.innerHTML.includes('No se pudo aplicar: ' + MSJ.replace(/&/g, '&amp;')), c2.innerHTML)
    chk('…la cobranza igual quedó asentada (el formulario se cerró)', E.estado.form === null && rpcs(E, 'cargar_cobranza_asentada').length === 1)
    chk('…con "Volver a intentar aplicar" y el recibo', /data-recien-reintentar>Volver a intentar aplicar</.test(c2.innerHTML) && /data-recien-recibo/.test(c2.innerHTML))
    await E.alTocarRecienAsentada({ target: { closest: () => ({ dataset: { recienReintentar: '' }, disabled: false }) } })
    chk('"Volver a intentar aplicar": la misma llamada otra vez, y ahora anda', rpcs(E, 'aplicar_credito_cliente').length === 2 &&
      JSON.stringify(rpcs(E, 'aplicar_credito_cliente')[1].params) === JSON.stringify(rpcs(E, 'aplicar_credito_cliente')[0].params) && /Aplicado \$\s120\.000,00/.test(texto(c2.innerHTML)), c2.innerHTML)

    // Un renglón pasado: la base lo frena con su texto (si llegara).
    const MSJ2 = 'N1-0042 tiene $ 100.000,00 pendientes y le querés aplicar $ 120.000,00.'
    const P = sandbox({ aplicar: () => ({ data: null, error: { message: MSJ2 } }) })
    await conCliente(P)
    await P.guardarCobranza()
    chk('el mensaje de un renglón pasado, tal cual', el(P, 'cob-recien-asentada').innerHTML.includes('No se pudo aplicar: ' + MSJ2))

    // Sin señal: queda en el celular y lo elegido no se aplica.
    const R = sandbox()
    await conCliente(R)
    R.__setRpc(async (n) => n === 'cargar_cobranza_asentada' ? { data: null, error: { message: 'Failed to fetch' } } : { data: null, error: null })
    await R.guardarCobranza()
    chk('sin señal: se guarda en el celular, avisa que lo elegido queda a cuenta y NO aplica', /Lo que elegiste aplicar no se guarda sin señal: queda a cuenta del cliente\./.test(R.__llamadas.exitos.at(-1) ?? '') && rpcs(R, 'aplicar_credito_cliente').length === 0, R.__llamadas.exitos.at(-1))

    // Guardar mientras todavía se lee la cuenta: espera; con corte, frena para que la revise.
    const L = sandbox()
    let soltar
    L.__setRpc(async (n, p) => n === 'cliente_pendientes' ? new Promise(r => { soltar = () => r({ data: PENDIENTES, error: null }) }) : (n === 'sugerir_aplicacion' ? { data: sugerirComoLaBase(p), error: null } : { data: { id: 'x', asentada: true }, error: null }))
    const lf = L.estado.form
    lf.unidad_id = 'u-nuss'; lf.efectivo = '20.000,00'; lf.transferencias = []
    L.estado.asentar = Object.assign(L.estadoAsentarVacio(), { clientes: [{ cliente_id: 'c-duo', nombre: 'DUOLATE' }] })
    L.elegirClienteAsentar('c-duo')
    chk('mientras lee la cuenta, la sección no muestra nada (ni "Leyendo")', el(L, 'cob-aplicar').hidden === true)
    const g = L.guardarCobranza()
    await esperar()
    chk('Guardar espera la lectura (todavía no asentó)', rpcs(L, 'cargar_cobranza_asentada').length === 0)
    soltar(); await g
    chk('con corte: no guarda y pide revisar a qué se aplica', rpcs(L, 'cargar_cobranza_asentada').length === 0 && el(L, 'cob-error-guardar').textContent === 'Revisá a qué se aplica la cobranza y volvé a tocar Guardar.' && el(L, 'cob-btn-guardar').disabled === false, el(L, 'cob-error-guardar').textContent)

    // Una sugerencia pendiente (se tipeó el efectivo y se tocó Guardar enseguida) se termina antes.
    const T = sandbox()
    const tf = await conCliente(T)
    tf.efectivo = '50.000,00'
    T.pintarTotalYGuardado()
    await T.guardarCobranza()
    const it = rpcs(T, 'aplicar_credito_cliente')[0]?.params.p_items ?? []
    chk('Guardar con una sugerencia pendiente: aplica con el total NUEVO', it.reduce((s, x) => s + x.monto, 0) === 150000, JSON.stringify(it))

    // Otro cliente: la cuenta leída del anterior no sirve.
    const O = sandbox()
    const of = await conCliente(O)
    O.estado.asentar.clientes.push({ cliente_id: 'c-otro', nombre: 'OTRO' })
    O.elegirClienteAsentar('c-otro')
    chk('cambiar de cliente suelta lo elegido y vuelve a leer la cuenta', of.aplicacion === null || !of.aplicacion?.tocado)
    await esperar()
    chk('…con el cliente nuevo', rpcs(O, 'cliente_pendientes').at(-1).params.p_cliente_id === 'c-otro')
    // Una respuesta vieja (del cliente anterior) no se usa.
    const V = sandbox()
    const resp = []
    V.__setRpc(async (n) => n === 'cliente_pendientes' ? new Promise(r => resp.push(r)) : { data: null, error: null })
    const vf = V.estado.form
    vf.unidad_id = 'u-nuss'
    V.estado.asentar = Object.assign(V.estadoAsentarVacio(), { clientes: [{ cliente_id: 'c-1', nombre: 'UNO' }, { cliente_id: 'c-2', nombre: 'DOS' }] })
    V.elegirClienteAsentar('c-1'); await esperar()
    V.elegirClienteAsentar('c-2'); await esperar()
    resp[0]({ data: PENDIENTES, error: null }); await esperar()
    chk('la cuenta del cliente ANTERIOR no se aplica al nuevo', !(V.estado.aplicar?.clienteId === 'c-2' && V.estado.aplicar?.datos))
    // La lectura falla: se dice y no frena.
    const F = sandbox()
    F.__setRpc(async (n) => n === 'cliente_pendientes' ? { data: null, error: { message: 'boom' } } : { data: null, error: null })
    await conCliente(F)
    chk('la cuenta no se pudo leer: se dice (con "Volver a intentar") y no frena', el(F, 'cob-aplicar').hidden === false &&
      /No se pudo leer lo que debe el cliente \(boom\)\. Si guardás así, toda la cobranza queda a cuenta\./.test(el(F, 'cob-aplicar-cuerpo').innerHTML) &&
      /data-aplicar-reintentar/.test(el(F, 'cob-aplicar-cuerpo').innerHTML) && F.motivosParaNoGuardar().length === 0)
  }

  // ══ 6. EL RECIBO ══════════════════════════════════════════════════════════
  {
    const S = sandbox()
    const RECIBO = {
      empresa: { nombre: 'Cucuruchos Nuss', razon_social: 'NUSS SRL', cuit: '30712345671', domicilio: 'Córdoba', logo_url: 'logo-nuss.png' },
      cliente: { id: 'c-duo', nombre: 'DUOLATE', razon_social: 'DUOLATE SA', cuit: '30999999993', solo_n2: false },
      fecha: '2026-11-05', estado: 'procesada',
      cheques: [{ banco: 'BANCO DE LA NACION ARGENTINA', banco_codigo: '011', numero: '12345678', tipo: 'diferido', emision: '2026-11-01', pago: '2026-12-01', importe: 150000, echeq: false }],
      transferencias: [{ medio: 'transferencia', cuenta: 'Macro Paz Mirta', banco_origen: 'Mercado Pago', referencia: '274845028', fecha: '2026-11-05', importe: 100000 }],
      efectivo: 20000, medios: { cheque: 150000, transferencia: 100000, efectivo: 20000 }, total: 270000,
      aplicaciones: [
        { etiqueta: 'Saldo de corte 02/11/2026', parte: 'total', monto_doc: 50000, aplicado: 50000, medios: { sin_medio: 50000 } },
        { etiqueta: 'N1-0042', parte: 'N1', monto_doc: 100000, aplicado: 100000, medios: { sin_medio: 100000 } },
        { etiqueta: 'N2-0042', parte: 'N2', monto_doc: 80000, aplicado: 80000, medios: { sin_medio: 80000 } },
      ],
      a_cuenta: 40000, saldo_cuenta: 30000,
    }
    const h = S.htmlRecibo(RECIBO)
    const t = texto(h)
    chk('recibo: los datos de la empresa y el título RECIBO', /NUSS SRL CUIT 30-71234567-1 Córdoba/.test(t) && /<div class="rc-titulo">RECIBO<\/div>/.test(h), t.slice(0, 200))
    chk('recibo: el logo va SIN src en la plantilla (se pone por propiedad)', /<img class="rc-cab__logo" data-recibo-logo alt="">/.test(h) && !/src=/.test(h))
    chk('recibo: cliente, CUIT y fecha', /Cliente DUOLATE SA · DUOLATE CUIT 30-99999999-3/.test(t) && /Fecha 05\/11\/2026/.test(t), t.slice(0, 300))
    chk('recibo: "Con qué pagó" con los TRES medios', /Con qué pagó/.test(t) && /<caption>Cheques<\/caption>/.test(h) && /<caption>Transferencias<\/caption>/.test(h) && /<caption>Efectivo<\/caption>/.test(h))
    chk('recibo: el cheque con banco corto, N°, tipo, emisión, vence e importe', /NACION ARGENTINA 12345678 Diferido 01\/11\/2026 01\/12\/2026 \$ 150\.000,00/.test(t), t)
    chk('recibo: la transferencia con cuenta, banco de origen, N° operación, fecha e importe', /Macro Paz Mirta Mercado Pago 274845028 05\/11\/2026 \$ 100\.000,00/.test(t))
    chk('recibo: "Qué cancela" con la etiqueta, el monto del renglón y lo aplicado', /Qué cancela Renglón Monto Aplicado Saldo de corte 02\/11\/2026 \$ 50\.000,00 \$ 50\.000,00 N1-0042 \$ 100\.000,00 \$ 100\.000,00 N2-0042/.test(t), t)
    chk('recibo: subtotales por medio y TOTAL COBRADO; TOTAL APLICADO aparte', /Cheques \$ 150\.000,00 Transferencias \$ 100\.000,00 Efectivo \$ 20\.000,00 TOTAL COBRADO \$ 270\.000,00 TOTAL APLICADO \$ 230\.000,00/.test(t), t)
    chk('recibo: las dos cajas de totales lado a lado', /<div class="rc-totales">\s*<div class="rc-caja">/.test(h) && (h.match(/class="rc-caja"/g) || []).length === 2)
    chk('recibo: "Queda a cuenta del cliente $ 40.000,00"', /Queda a cuenta del cliente \$ 40\.000,00/.test(t))
    chk('recibo: al pie "Saldo de la cuenta: $ 30.000,00 a pagar"', /<div class="rc-pie">Saldo de la cuenta: \$\s30\.000,00 a pagar<\/div>/.test(h.replace(/ /g, ' ')), h.slice(-200))
    chk('recibo: saldo negativo = "a favor del cliente"; cero = "en cero"', S.textoSaldoCuenta(-5000).replace(/ /g, ' ') === '$ 5.000,00 a favor del cliente' && S.textoSaldoCuenta(0) === 'en cero')
    // Un solo medio.
    const uno = { ...RECIBO, cheques: [], efectivo: 0, medios: { cheque: 0, transferencia: 100000, efectivo: 0 }, total: 100000, a_cuenta: 0, aplicaciones: [RECIBO.aplicaciones[0]] }
    const h1 = S.htmlRecibo(uno), t1 = texto(h1)
    chk('recibo con un solo medio: solo la tabla de transferencias', /<caption>Transferencias<\/caption>/.test(h1) && !/<caption>Cheques<\/caption>/.test(h1) && !/<caption>Efectivo<\/caption>/.test(h1))
    chk('…y su subtotal solo', /Transferencias \$ 100\.000,00 TOTAL COBRADO \$ 100\.000,00/.test(t1) && !/Cheques \$/.test(t1), t1)
    chk('…sin franja de a cuenta si no sobra', !/Queda a cuenta del cliente/.test(t1))
    chk('recibo sin aplicaciones: "Nada: todo queda a cuenta."', /Nada: todo queda a cuenta\./.test(S.htmlRecibo({ ...RECIBO, aplicaciones: [] })))
    // Solo N2: nada dice N1.
    const n2 = S.htmlRecibo({ ...RECIBO, cliente: { ...RECIBO.cliente, solo_n2: true } })
    chk('cliente solo N2: el recibo no dice "N1" en ningún lado', !/N1/.test(n2) && /N2-0042/.test(n2), texto(n2))
    chk('…el renglón que la base marcó N1 se ve como "Orden 0042"', /Orden 0042/.test(n2))
    // E-cheque y depósito.
    const h3 = texto(S.htmlRecibo({ ...RECIBO, cheques: [{ ...RECIBO.cheques[0], tipo: 'comun', pago: null, echeq: true }], transferencias: [{ ...RECIBO.transferencias[0], medio: 'deposito_efectivo', banco_origen: 'Macro' }] }))
    chk('un e-cheque común dice "A la vista · eCheq" y vence "A la vista"', /A la vista · eCheq 01\/11\/2026 A la vista/.test(h3), h3)
    chk('un depósito en efectivo lo dice', /Macro \(depósito en efectivo\)/.test(h3))
    // Escape.
    const MAL = '<img src=x onerror=alert(1)>'
    const hx = S.htmlRecibo({ ...RECIBO, empresa: { ...RECIBO.empresa, razon_social: MAL, domicilio: MAL }, cliente: { ...RECIBO.cliente, razon_social: MAL, nombre: MAL }, cheques: [{ ...RECIBO.cheques[0], banco: MAL, numero: MAL }],
      transferencias: [{ ...RECIBO.transferencias[0], cuenta: MAL, banco_origen: MAL, referencia: MAL }], aplicaciones: [{ ...RECIBO.aplicaciones[0], etiqueta: MAL }] })
    chk('XSS: todo lo que viene de la base va escapado en el recibo', !hx.includes(MAL) && (hx.match(/&lt;img src=x onerror=alert\(1\)&gt;/g) || []).length >= 8, (hx.match(/&lt;img/g) || []).length)
    chk('XSS: un logo que no es un archivo de la raíz no se usa', !/data-recibo-logo/.test(S.htmlRecibo({ ...RECIBO, empresa: { ...RECIBO.empresa, logo_url: 'javascript:alert(1)' } })))
    chk('banco corto', S.bancoCorto('BANCO DE GALICIA Y BUENOS AIRES S.A.U.') === 'GALICIA Y BUENOS AIRES' && S.bancoCorto('Banco Macro S.A.') === 'Macro' && S.bancoCorto('Brubank') === 'Brubank' && S.bancoCorto(null) === '—')
    chk('el archivo: "Recibo - DUOLATE - 05-11-2026.pdf"', S.nombreArchivoRecibo(RECIBO) === 'Recibo - DUOLATE - 05-11-2026.pdf')
    chk('el archivo sin caracteres prohibidos', S.nombreArchivoRecibo({ ...RECIBO, cliente: { nombre: 'J/M: "La" <Casa>' } }) === 'Recibo - J M La Casa - 05-11-2026.pdf', S.nombreArchivoRecibo({ ...RECIBO, cliente: { nombre: 'J/M: "La" <Casa>' } }))
    // Abrir el recibo: recibo_cobranza con el id.
    S.__setRpc(async (n) => n === 'recibo_cobranza' ? { data: RECIBO, error: null } : { data: null, error: null })
    await S.abrirRecibo('cob-1')
    chk('abrir el recibo: recibo_cobranza(p_cobranza_id)', rpcs(S, 'recibo_cobranza').at(-1)?.params.p_cobranza_id === 'cob-1')
    chk('…se ve la hoja y se habilitan Enviar e Imprimir', el(S, 'cob-modal-recibo').hidden === false && /RECIBO/.test(el(S, 'cob-recibo-hoja').innerHTML) &&
      el(S, 'cob-recibo-enviar').disabled === false && el(S, 'cob-recibo-imprimir').disabled === false)
    chk('…una hoja normal con pocos renglones', el(S, 'cob-recibo-hoja').className === 'rc-hoja')
    const muchos = { ...RECIBO, aplicaciones: Array.from({ length: 16 }, (_, i) => ({ ...RECIBO.aplicaciones[0], etiqueta: 'R' + i })) }
    S.__setRpc(async () => ({ data: muchos, error: null }))
    await S.abrirRecibo('cob-1')
    chk('con muchos renglones la hoja se compacta (entra en UNA)', el(S, 'cob-recibo-hoja').className === 'rc-hoja rc-hoja--compacta')
    S.imprimirRecibo()
    chk('Imprimir: marca la página para imprimir solo el recibo', S.__clasesRaiz.has('rc-imprimiendo') && S.__impresiones() === 1)
    S.cerrarRecibo()
    chk('Cerrar: se oculta y se saca la marca', el(S, 'cob-modal-recibo').hidden === true && !S.__clasesRaiz.has('rc-imprimiendo'))
    S.__setRpc(async () => ({ data: null, error: { message: 'La cobranza todavía no está asentada en un cliente.' } }))
    await S.abrirRecibo('cob-2')
    chk('el error de la base al leer el recibo, tal cual', /No se pudo leer el recibo: La cobranza todavía no está asentada en un cliente\./.test(el(S, 'cob-recibo-hoja').innerHTML) && el(S, 'cob-recibo-enviar').disabled === true)
    // Una respuesta vieja no pisa el recibo nuevo.
    const resp = []
    S.__setRpc(() => new Promise(r => resp.push(r)))
    const p1 = S.abrirRecibo('viejo'), p2 = S.abrirRecibo('nuevo')
    resp[1]({ data: uno, error: null }); await p2
    resp[0]({ data: RECIBO, error: null }); await p1
    chk('turno: el recibo viejo no pisa al nuevo', S.estado.recibo === uno)
    // "Ver / enviar recibo" desde el cartel.
    S.estado.recienAsentada = { cobranzaId: 'cob-9', aplicar: { clienteId: 'c', items: [] }, texto: 'x', resultado: { ok: true, aplicado: 0, a_cuenta: 0 } }
    S.__setRpc(async () => ({ data: RECIBO, error: null }))
    await S.alTocarRecienAsentada({ target: { closest: () => ({ dataset: { recienRecibo: '' }, disabled: false }) } })
    await esperar()
    chk('"Ver / enviar recibo" abre el recibo de ESA cobranza', rpcs(S, 'recibo_cobranza').at(-1)?.params.p_cobranza_id === 'cob-9')
  }

  // ══ 7. BORDES (lo que las mutaciones pidieron mirar) ═══════════════════════
  {
    // Un borrador asentado de un chofer (perdió el permiso): no lee la cuenta.
    const C = sandbox({ tareas: ['cargar'] })
    Object.assign(C.estado.form, { asentar: true, unidad_id: 'u-nuss', cliente_id: 'c-duo', cliente: 'DUOLATE' })
    C.pintarTotalYGuardado(); await esperar()
    chk('sin cobranzas:procesar, aunque el borrador diga "asentada", no lee la cuenta', rpcs(C, 'cliente_pendientes').length === 0 && el(C, 'cob-aplicar').hidden === true)
    // Un repintado mientras lee: sigue sin mostrar nada.
    const L = sandbox()
    L.__setRpc(async (n) => n === 'cliente_pendientes' ? new Promise(() => {}) : { data: null, error: null })
    Object.assign(L.estado.form, { unidad_id: 'u-nuss', cliente_id: 'c-duo', cliente: 'DUOLATE', efectivo: '1.000,00' })
    L.pintarTotalYGuardado(); await esperar()
    L.pintarTotalYGuardado(); await esperar()
    chk('repintar mientras lee la cuenta no muestra la sección', el(L, 'cob-aplicar').hidden === true && rpcs(L, 'cliente_pendientes').length === 1)
    // Un borrador nuevo del MISMO cliente (sin pasar por la lista) vuelve a leer.
    const B = sandbox()
    await conCliente(B)
    const antes = rpcs(B, 'cliente_pendientes').length
    B.estado.form = Object.assign(B.formularioVacio('00000000-0000-4000-8000-0000000000aa'), { asentar: true, unidad_id: 'u-nuss', cliente_id: 'c-duo', cliente: 'DUOLATE', efectivo: '5.000,00' })
    B.pintarTotalYGuardado(); await esperar()
    chk('otra cobranza del mismo cliente vuelve a leer su cuenta (lo pendiente cambió)', rpcs(B, 'cliente_pendientes').length === antes + 1)
    // Cambiar de cliente después de tocar a mano: el nuevo arranca con su sugerencia.
    const O = sandbox()
    await conCliente(O)
    O.actualizarMontoAplicar(clave(DOCS[0]), null, '1.000,00')
    O.estado.asentar.clientes = [{ cliente_id: 'c-otro', nombre: 'OTRO' }]
    O.elegirClienteAsentar('c-otro'); await esperar()
    O.__correrTimers(); await esperar()
    chk('otro cliente: lo tocado a mano del anterior no frena su sugerencia', rpcs(O, 'sugerir_aplicacion').at(-1)?.params.p_cliente_id === 'c-otro', JSON.stringify(rpcs(O, 'sugerir_aplicacion').map(x => x.params.p_cliente_id)))
    // Sin renglones N1: no hay "Solo N1".
    const N = sandbox({ pendientes: { ...PENDIENTES, docs: [DOCS[0], DOCS[3], DOCS[4]] } })
    await conCliente(N)
    const cn = el(N, 'cob-aplicar-cuerpo').innerHTML
    chk('sin renglones N1 no se ofrece "Solo N1" (sí "Solo N2")', !/Solo N1/.test(cn) && /Solo N2/.test(cn))
    // Los e-cheques cuentan como cheques (como _cobranza_medios).
    const E = sandbox()
    const ef = await conCliente(E, { efectivo: '', transf: 0, cheques: 10000 })
    ef.echecks = [{ id: 'e1', importe: 5000 }]
    chk('los e-cheques cuentan como cheques', E.cobradoPorMedio(ef).cheque === 15000, JSON.stringify(E.cobradoPorMedio(ef)))
    // XSS en los renglones y en el cartel.
    const MAL = '<img src=x onerror=alert(1)>'
    const X = sandbox({ pendientes: { ...PENDIENTES, docs: [D('orden', 'x"><b>', 'total', MAL, '2026-11-03', 100)] } })
    await conCliente(X)
    const hx = el(X, 'cob-aplicar-cuerpo').innerHTML
    chk('XSS: la etiqueta y el id del renglón van escapados (contenido, aria-label y data-)', !hx.includes(MAL) && !hx.includes('x"><b>') &&
      (hx.match(/&lt;img src=x onerror=alert\(1\)&gt;/g) || []).length >= 2 && (hx.match(/x&quot;&gt;&lt;b&gt;/g) || []).length >= 2, hx)
    const hr = X.htmlRecienAsentada({ texto: MAL, resultado: { ok: false, mensaje: MAL } })
    chk('XSS: el texto y el mensaje de la base en el cartel van escapados', !hr.includes(MAL) && (hr.match(/&lt;img/g) || []).length === 2)
    const hc = X.htmlRecibo({ empresa: { razon_social: 'E', cuit: MAL }, cliente: { razon_social: 'R', nombre: MAL, cuit: MAL }, fecha: '2026-11-05', cheques: [], transferencias: [], efectivo: 0, medios: {}, total: 0, aplicaciones: [], a_cuenta: 0, saldo_cuenta: 0 })
    chk('XSS: los CUIT raros y el nombre del cliente van escapados en el recibo', !hc.includes(MAL) && (hc.match(/&lt;img/g) || []).length === 3, hc)
  }

  // ══ 8. FUENTE ═════════════════════════════════════════════════════════════
  {
    chk('fuente: la sección vive en el formulario, después de las formas de pago y antes de "Datos del pago"',
      FUENTE.indexOf('id="cob-aplicar"') > FUENTE.indexOf('id="cob-seccion-formas"') && FUENTE.indexOf('id="cob-aplicar"') < FUENTE.indexOf('Datos del pago</div>'))
    chk('fuente: el recibo es hijo directo de <body>, después de los diálogos y antes del script (al imprimir se ve solo él)',
      FUENTE.indexOf('id="cob-modal-recibo"') > FUENTE.indexOf('id="cob-dialogo-foto"') && FUENTE.indexOf('id="cob-modal-recibo"') < FUENTE.indexOf('<script type="module">\n    import { verificarSesion }'))
    chk('fuente: A4 vertical al imprimir', /@page \{ size: A4 portrait; margin: 8mm; \}/.test(FUENTE))
    chk('fuente: el PDF con html2canvas + jsPDF de cdnjs, versiones fijas', FUENTE.includes("'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'") && FUENTE.includes("'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'"))
    chk('fuente: el PDF se achica hasta entrar en UNA hoja A4', /Math\.min\(190 \/ canvas\.width, 277 \/ canvas\.height\)/.test(FUENTE))
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
