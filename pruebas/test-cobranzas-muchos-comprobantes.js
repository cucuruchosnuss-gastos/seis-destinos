// VARIOS COMPROBANTES EN UNA COBRANZA, AGRUPADOS Y SIN REPETIDOS (pedido de
// Facu del 30/10/2026), en modulos/cobranzas.html:
//  - Yanina elige 6, 7 o más comprobantes de una vez: se leen de a uno con el
//    lector de siempre (ocr-cobranza-comprobantes) y se dice "Leyendo 3 de 7…";
//    una foto con dos operaciones da dos tarjetas;
//  - arriba de las tarjetas, el resumen agrupado por medio y por banco, con el
//    total; cada tarjeta con su renglón (banco · quién · fecha · importe · Op. N°);
//  - la HUELLA SHA-256 de cada archivo viaja en p_fotos como "sha256";
//  - comprobantes_ya_cargados(p_items, p_cobranza_id) al terminar de leer y al
//    cambiar un número o un importe (con retardo y con turno): ROJO con los
//    datos y "Sacar" si ya está cargado (mismo número y mismo importe, o la
//    misma foto), y también el segundo con el mismo número en la tanda;
//    "revisalo" (amarillo, no bloquea) si coincide el número con otro importe;
//  - con algún rojo, Guardar queda deshabilitado con "Sacá los comprobantes
//    repetidos."; el error de la base se muestra tal cual.
// Se EJECUTAN las funciones reales del módulo, con un DOM falso.
//
//   node pruebas/test-cobranzas-muchos-comprobantes.js
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
  }
  var navigator = { onLine: true }
  // crypto.subtle es el de verdad (Node): la huella se calcula de verdad.
  var crypto = { subtle: globalThis.crypto.subtle, randomUUID: (() => { let n = 0; return () => '00000000-0000-4000-8000-' + String(++n).padStart(12, '0') })() }
  var window = { open(){} }
  function setImmediate(f){ return Promise.resolve().then(f) }
  // Los temporizadores los corre la prueba (el retardo al tipear).
  var __timers = []
  function setTimeout(f, ms){ __timers.push({ f, ms }); return __timers.length }
  function clearTimeout(id){ if (id && __timers[id - 1]) __timers[id - 1].f = null }
  function __correrTimers(){ const t = __timers; __timers = []; let n = 0; for (const x of t) if (x.f) { n++; x.f() } return n }

  var __rpcs = []
  var __rpcImpl = async () => ({ data: { id: 'x', ya_existia: false }, error: null })
  var __invocaciones = []
  var __invokeImpl = async () => ({ data: null, error: new Error('sin lector') })
  var supabase = {
    from: () => { const q = {}; for (const op of ['select','eq','in','order','range','like','gte','lte','or','maybeSingle']) q[op] = () => q; q.then = (r) => Promise.resolve({ data: [], error: null }).then(r); return q },
    rpc: (n, p) => { __rpcs.push({ nombre: n, params: JSON.parse(JSON.stringify(p)) }); return __rpcImpl(n, p) },
    storage: { from: () => ({
      upload: async () => ({ error: null }),
      createSignedUrl: async () => ({ data: { signedUrl: 'https://firmada/x' }, error: null }),
    }) },
    functions: { invoke: (nombre, op) => { __invocaciones.push({ nombre, body: op?.body }); return __invokeImpl(nombre, op) } },
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
  function hoyArgentina(){ return '2026-10-30' }
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
const CBU_PAZ = '2850324830094103159311'
const CUENTAS = [{ id: 'cta-paz', nombre: 'Macro Paz Mirta', unidad_negocio_id: 'u-nuss', cbu: CBU_PAZ }]
const ADMIN = ['cargar', 'ver_todo', 'procesar']

function sandbox() {
  const S = construirCon(ARCHIVO, {
    preludio: PRELUDIO, funciones: FUNCIONES, constantes: CONSTANTES,
    retorno: `estado, __els, __llamadas, __porSelector, __correrTimers,
      __timers(){ return __timers },
      __rpcs(){ return __rpcs }, __setRpc(f){ __rpcImpl = f },
      __invocaciones(){ return __invocaciones }, __setInvoke(f){ __invokeImpl = f }`,
  })
  S.estado.misTareas = new Set(ADMIN.map(t => 'cobranzas:' + t))
  S.estado.unidades = [NUSS]
  S.estado.cuentasBancoLista = CUENTAS
  S.estado.cuentasBanco = new Map(CUENTAS.map(c => [c.id, c]))
  S.__setRpc(async () => ({ data: [], error: null }))
  S.abrirFormularioNuevo()
  S.estado.form.unidad_id = 'u-nuss'
  S.estado.form.cliente_id = 'c-duolate'
  S.estado.form.cliente = 'DUOLATE'
  return S
}
const el = (S, id) => S.__els.get(id) ?? { hidden: undefined, innerHTML: '', textContent: '' }
const esperar = async (n = 12) => { for (let i = 0; i < n; i++) await new Promise(r => setImmediate(r)) }
const texto = (html) => String(html ?? '').replace(/<[^>]*>/g, '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim()
// Un archivo con bytes propios (su nombre), para que cada uno tenga su huella.
const archivo = (nombre) => ({ type: 'image/jpeg', size: 1024, name: nombre, arrayBuffer: async () => new TextEncoder().encode('contenido de ' + nombre).buffer })
const huellaDe = async (nombre) => Buffer.from(await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode('contenido de ' + nombre))).toString('hex')

const op = (banco, importe, referencia, extra = {}) => ({ medio: 'transferencia', importe, fecha: '2026-10-30', banco_origen: banco,
  ordenante: 'GODOY JUAN', cuit_ordenante: null, referencia, destinatario: 'PAZ MIRTA', cbu_destino: CBU_PAZ, notas: null, ...extra })
const dep = (importe, referencia) => op('Macro', importe, referencia, { medio: 'deposito_efectivo', ordenante: null })
const leido = (propuestos) => ({ data: { ok: true, modelo: 'm', crudo: { comprobantes: propuestos }, propuestos }, error: null })

// La tanda del pedido: Mercado Pago 3 · $ 450.000 — Banco Nación 2 · $ 300.000,
// Depósitos en efectivo: Macro 2 · $ 280.000. Total: $ 1.030.000.
const TANDA = [
  [op('Mercado Pago', 150000, '274845028')], [op('Banco Nación', 100000, '55500011')], [op('Mercado Pago', 200000, '274845999')],
  [dep(140000, '4471')], [op('Banco Nación', 200000, '55500022')], [op('mercado  pago', 100000, '274846000')], [dep(140000, '4472')],
]

// La coincidencia que devuelve la base, como la arma comprobantes_ya_cargados.
const YA = (clave, extra = {}) => ({ clave, motivo: 'mismo_numero', cobranza_id: 'cob-vieja', cliente: 'DUOLATE', fecha: '2026-10-30',
  importe: 928559.01, referencia: '274845028', cargada_por: 'Godoy Yanina', cargada_en: '2026-10-30T13:00:00Z', estado: 'registrada', ...extra })

// Un formulario con UNA transferencia leída (número 274845028 y el importe dado).
async function conUna(importe = 928559.01, referencia = '274845028') {
  const S = sandbox()
  S.__setInvoke(async () => leido([op('Mercado Pago', importe, referencia)]))
  await S.agregarFotos([archivo('mp.jpg')], 'transferencia')
  await esperar()
  return S
}

async function pruebas() {
  // ══ 1. LA HUELLA SHA-256 ══════════════════════════════════════════════════
  {
    const S = sandbox()
    const abc = await S.huellaSha256(new TextEncoder().encode('abc'))
    chk('huella de "abc": el SHA-256 conocido, en hex minúsculas', abc === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad', abc)
    chk('huella de un archivo sin bytes legibles: null (se sube igual)', await S.huellaDeArchivo({ name: 'x' }) === null && await S.huellaDeArchivo(null) === null)
    chk('huella de un archivo que falla al leer: null, sin tirar', await S.huellaDeArchivo({ arrayBuffer: async () => { throw new Error('no') } }) === null)
    S.__setInvoke(async () => leido([op('Mercado Pago', 1000, '274845028')]))
    await S.agregarFotos([archivo('mp.jpg')], 'transferencia')
    await esperar()
    const f = S.estado.form
    chk('la foto guarda la huella del archivo ORIGINAL', f.fotos[0].sha256 === await huellaDe('mp.jpg'), f.fotos[0].sha256)
    const filas = S.fotosParaBase(f)
    chk('el sha256 viaja en p_fotos (fotosParaBase)', filas.length === 1 && filas[0].sha256 === await huellaDe('mp.jpg') && filas[0].tipo === 'transferencia', JSON.stringify(filas))
    await S.subirCobranza(f)
    const ll = S.__rpcs().find(x => x.nombre === 'cargar_cobranza_asentada')
    chk('…y llega a la RPC que guarda (cargar_cobranza_asentada.p_fotos[0].sha256)', ll?.params.p_fotos?.[0]?.sha256 === await huellaDe('mp.jpg'), JSON.stringify(ll?.params.p_fotos))
    // Una foto que ya está en la base no lleva huella (la base no la vuelve a insertar).
    const enBase = S.fotosParaBase({ fotos: [{ id: 'fb', storage_path: 'p', tipo: 'transferencia', enBase: true, sha256: 'abc' }], transferencias: [{ foto_id: 'fb' }], cheques: [] })
    chk('una foto que ya está en la base viaja sin sha256 (ni tipo ni mime)', enBase.length === 1 && !('sha256' in enBase[0]) && !('tipo' in enBase[0]), JSON.stringify(enBase))
    const sinHuella = S.fotosParaBase({ fotos: [{ id: 'fn', storage_path: 'p', tipo: 'transferencia', sha256: null }], transferencias: [{ foto_id: 'fn' }], cheques: [] })
    chk('sin huella no viaja la clave sha256', sinHuella.length === 1 && !('sha256' in sinHuella[0]), JSON.stringify(sinHuella))
    // Los cheques del chofer también llevan su huella.
    const C = sandbox()
    C.estado.misTareas = new Set(['cobranzas:cargar'])
    C.__setInvoke(async () => ({ data: { ok: true, modelo: 'm', crudo: {}, cheques: [] }, error: null }))
    await C.agregarFotos([archivo('cheque.jpg')], 'cheque')
    await esperar()
    chk('la foto de un cheque también guarda su huella', C.estado.form.fotos[0]?.sha256 === await huellaDe('cheque.jpg'))
  }

  // ══ 2. TANDA DE 7: AVANCE, RESUMEN AGRUPADO Y TOTAL ═══════════════════════
  {
    const S = sandbox()
    const f = S.estado.form
    const pendientes = []
    S.__setInvoke(() => new Promise(r => pendientes.push(r)))
    await S.agregarFotos(['1', '2', '3', '4', '5', '6', '7'].map(n => archivo(n + '.jpg')), 'transferencia')
    await esperar()
    const avance = () => texto(S.htmlComprobantes(f, 'transferencia').match(/data-avance-lector="transferencia"[^>]*>([^<]*)</)?.[1])
    chk('siete de una vez: siete comprobantes y el lector tiene UNO', f.fotos.length === 7 && S.__invocaciones().length === 1, `${f.fotos.length} / ${S.__invocaciones().length}`)
    chk('el avance arranca en "Leyendo 1 de 7…"', avance() === 'Leyendo 1 de 7…', avance())
    pendientes[0](leido(TANDA[0])); await esperar()
    pendientes[1](leido(TANDA[1])); await esperar()
    chk('leídos dos: "Leyendo 3 de 7…"', avance() === 'Leyendo 3 de 7…', avance())
    chk('el avance se pinta en la sección de transferencias', /Leyendo 3 de 7…/.test(el(S, 'cob-comprobantes-transferencia').innerHTML))
    chk('el avance avisa a los lectores de pantalla (role="status")', /data-avance-lector="transferencia" role="status"/.test(S.htmlComprobantes(f, 'transferencia')))
    for (let i = 2; i < 7; i++) { pendientes[i](leido(TANDA[i])); await esperar() }
    chk('las siete leídas: siete tarjetas', f.transferencias.length === 7, f.transferencias.length)
    chk('terminada la tanda: "Listo: se leyeron los 7 comprobantes…"', /^Listo: se leyeron los 7 comprobantes/.test(avance()), avance())
    const r = texto(el(S, 'cob-resumen-transferencias').innerHTML)
    chk('resumen: "Transferencias: Mercado Pago 3 · $ 450.000,00 — Banco Nación 2 · $ 300.000,00"',
      r.includes('Transferencias: Mercado Pago 3 · $ 450.000,00 — Banco Nación 2 · $ 300.000,00'), r)
    chk('resumen: "Depósitos en efectivo: Macro 2 · $ 280.000,00"', r.includes('Depósitos en efectivo: Macro 2 · $ 280.000,00'), r)
    chk('resumen: "Total: $ 1.030.000,00"', r.includes('Total: $ 1.030.000,00'), r)
    chk('resumen: se ve (no hidden)', el(S, 'cob-resumen-transferencias').hidden === false)
    const g = S.gruposDeTransferencias(f.transferencias)
    chk('grupos: "mercado  pago" cuenta con "Mercado Pago" y queda el nombre del primero', g.transferencias[0].banco === 'Mercado Pago' && g.transferencias[0].cantidad === 3, JSON.stringify(g))
    chk('grupos: en el orden en que aparecen', g.transferencias.map(x => x.banco).join('|') === 'Mercado Pago|Banco Nación', JSON.stringify(g))
    chk('grupos: el total en centavos exactos (0,1 + 0,2 = 0,30)', S.gruposDeTransferencias([{ importe: 0.1, banco_origen: 'A' }, { importe: 0.2, banco_origen: 'A' }]).total === 0.3)
    chk('grupos: sin banco dice "Sin banco"', S.gruposDeTransferencias([{ importe: 1, banco_origen: '  ' }]).transferencias[0].banco === 'Sin banco')
    chk('resumen: con una sola transferencia no se muestra', S.htmlResumenTransferencias([f.transferencias[0]]) === '' && S.htmlResumenTransferencias([]) === '')
    // El renglón de cada comprobante.
    const h = S.htmlTransferenciaForm(f.transferencias[0], 0, true)
    chk('renglón: banco · quién · fecha · importe · "Op. N° 274845028"',
      texto(h.match(/data-transf-linea="[^"]+"[^>]*>([^<]*)</)?.[1]) === 'Mercado Pago · GODOY JUAN · 30/10/2026 · $ 150.000,00 · Op. N° 274845028', h.slice(0, 900))
    chk('renglón: todo sigue editable (importe, fecha, banco, quién, número)',
      ['importe', 'fecha', 'banco_origen', 'ordenante', 'referencia'].every(c => h.includes(`data-transf-campo="${c}"`)))
    // Cambiar el importe a mano actualiza el resumen y el renglón (en el lugar).
    const linea = { dataset: { transfLinea: f.transferencias[0].id }, hidden: true, textContent: '' }
    S.__porSelector['[data-transf-linea]'] = [linea]
    S.actualizarTransferencia(f.transferencias[0].id, 'importe', '250.000,00')
    chk('cambiar un importe actualiza el renglón en el lugar', texto(linea.textContent) === 'Mercado Pago · GODOY JUAN · 30/10/2026 · $ 250.000,00 · Op. N° 274845028' && linea.hidden === false, linea.textContent)
    chk('cambiar un importe actualiza el total del resumen', texto(el(S, 'cob-resumen-transferencias').innerHTML).includes('Total: $ 1.130.000,00'), texto(el(S, 'cob-resumen-transferencias').innerHTML))
    // Una tanda nueva de uno solo no dice avance.
    S.__setInvoke(async () => leido([op('Brubank', 5, '99990000')]))
    await S.agregarFotos([archivo('8.jpg')], 'transferencia')
    await esperar()
    chk('una elección de UN comprobante no dice avance', avance() === '', avance())
    // Sin señal en el medio.
    const N = sandbox()
    const pend = []
    N.__setInvoke(() => new Promise(r => pend.push(r)))
    await N.agregarFotos([archivo('a.jpg'), archivo('b.jpg')], 'transferencia')
    await esperar()
    N.estado.form.fotos[1].errorRed = true
    chk('sin señal: "van 0 de 2 leídos; el resto se lee cuando vuelva"', /^Sin señal: van 0 de 2 leídos/.test(N.textoAvanceLector(N.estado.form, 'transferencia')), N.textoAvanceLector(N.estado.form, 'transferencia'))
    // Un archivo que no se pudo preparar baja el total.
    const P = sandbox()
    P.__setInvoke(() => new Promise(() => {}))
    await P.agregarFotos([archivo('a.jpg'), { type: 'application/pdf', name: 'grande.pdf', size: 11 * 1024 * 1024 }, archivo('c.jpg')], 'transferencia')
    await esperar()
    chk('un PDF de 11 MB no entra y el avance dice "de 2"', P.textoAvanceLector(P.estado.form, 'transferencia') === 'Leyendo 1 de 2…', P.textoAvanceLector(P.estado.form, 'transferencia'))
    // La tanda de otra cobranza no se mezcla.
    chk('la tanda de otra cobranza no dice nada', P.textoAvanceLector({ id: 'otra', fotos: [] }, 'transferencia') === '')
  }

  // ══ 3. UNA FOTO CON DOS OPERACIONES → DOS RENGLONES ═══════════════════════
  {
    const S = sandbox()
    S.__setInvoke(async () => leido([op('Banco Nación', 100, '11112222'), op('Banco Nación', 200, '33334444')]))
    await S.agregarFotos([archivo('dos.jpg')], 'transferencia')
    await esperar()
    const f = S.estado.form
    chk('una foto con dos operaciones: dos tarjetas con el mismo comprobante', f.transferencias.length === 2 &&
      f.transferencias.every(t => t.foto_id === f.fotos[0].id) && f.transferencias[1].referencia === '33334444', JSON.stringify(f.transferencias.map(t => [t.foto_id, t.referencia])))
    chk('…y ninguna se marca como repetida de la otra (misma foto, distinto número)', f.transferencias.every((t, i) => S.repetidoDeTransferencia(f, t, i).nivel === null))
  }

  // ══ 4. LA PREGUNTA A LA BASE: QUÉ, CUÁNDO, RETARDO Y TURNO ════════════════
  {
    const S = await conUna(150000)
    const f = S.estado.form
    const t = f.transferencias[0]
    chk('apenas termina la lectura queda programada la revisión', S.__timers().some(x => x.f), S.__timers().length)
    S.__correrTimers(); await esperar()
    const ll = S.__rpcs().filter(x => x.nombre === 'comprobantes_ya_cargados')
    chk('se llama a comprobantes_ya_cargados', ll.length === 1, ll.length)
    const it = ll[0]?.params.p_items?.[0]
    chk('p_items: [{clave (el id local), referencia, importe, sha256}]', it && it.clave === t.id && it.referencia === '274845028' && it.importe === 150000 &&
      it.sha256 === f.fotos[0].sha256 && Object.keys(it).sort().join(',') === 'clave,importe,referencia,sha256', JSON.stringify(it))
    chk('p_cobranza_id: null en una cobranza nueva', ll[0]?.params.p_cobranza_id === null)
    // Ya revisada una vez: un comprobante nuevo leído vuelve a preguntar, enseguida.
    S.__setInvoke(async () => leido([op('Brubank', 700, '70007000')]))
    await S.agregarFotos([archivo('otro.jpg')], 'transferencia')
    await esperar()
    chk('otro comprobante leído después: se vuelve a preguntar sin retardo', S.__timers().some(x => x.f && x.ms === 0), JSON.stringify(S.__timers().map(x => [!!x.f, x.ms])))
    S.__correrTimers(); await esperar()
    chk('…con las dos tarjetas', S.__rpcs().filter(x => x.nombre === 'comprobantes_ya_cargados').pop().params.p_items.length === 2)
    f.transferencias.pop()
    f.modo = 'edicion'
    await S.revisarRepetidos()
    chk('p_cobranza_id: el id de la cobranza que se edita', S.__rpcs().filter(x => x.nombre === 'comprobantes_ya_cargados').pop().params.p_cobranza_id === f.id)
    f.modo = 'nueva'
    // Con retardo al tipear: tres cambios seguidos, UNA pregunta.
    const antes = S.__rpcs().length
    S.actualizarTransferencia(t.id, 'referencia', '27')
    S.actualizarTransferencia(t.id, 'referencia', '2748')
    S.actualizarTransferencia(t.id, 'referencia', '274845')
    chk('al tipear, el retardo es de 400 ms', S.__timers().filter(x => x.f).length === 1 && S.__timers().filter(x => x.f)[0].ms === 400, JSON.stringify(S.__timers().map(x => [!!x.f, x.ms])))
    S.__correrTimers(); await esperar()
    const nuevas = S.__rpcs().slice(antes).filter(x => x.nombre === 'comprobantes_ya_cargados')
    chk('tres cambios seguidos: UNA sola pregunta, con el último número', nuevas.length === 1 && nuevas[0].params.p_items[0].referencia === '274845', JSON.stringify(nuevas.map(x => x.params.p_items)))
    S.actualizarTransferencia(t.id, 'importe', '1.000,00')
    chk('cambiar el importe también vuelve a preguntar', S.__timers().filter(x => x.f).length === 1)
    S.__correrTimers(); await esperar()
    S.actualizarTransferencia(t.id, 'ordenante', 'OTRO')
    chk('cambiar quién pagó no pregunta', S.__timers().filter(x => x.f).length === 0)
    // Un número corto y sin foto: no va (la base no compara menos de 4).
    chk('referenciaNormalizada: como la base (mayúsculas, solo letras y números, desde 4)',
      S.referenciaNormalizada('27-4845 028') === '274845028' && S.referenciaNormalizada('ab-12') === 'AB12' && S.referenciaNormalizada('a.1') === '' && S.referenciaNormalizada(null) === '')
    chk('itemsParaRevisar: sin número ni huella no va', S.itemsParaRevisar({ fotos: [], transferencias: [{ id: 'z', referencia: '12', importe: 5, foto_id: null }] }).length === 0)
    // Una respuesta vieja no pisa una nueva.
    const T = await conUna(928559.01)
    const tf = T.estado.form
    const resp = []
    T.__setRpc((n) => n === 'comprobantes_ya_cargados' ? new Promise(r => resp.push(r)) : Promise.resolve({ data: null, error: null }))
    const p1 = T.revisarRepetidos()
    const p2 = T.revisarRepetidos()
    resp[1]({ data: [], error: null }); await p2
    resp[0]({ data: [YA(tf.transferencias[0].id)], error: null }); await p1
    chk('turno: la respuesta VIEJA (con coincidencia) no pisa a la nueva (sin)', T.repetidoDeTransferencia(tf, tf.transferencias[0], 0).nivel === null)
    // Y si cambió el formulario, tampoco.
    const resp2 = []
    T.__setRpc(() => new Promise(r => resp2.push(r)))
    const p3 = T.revisarRepetidos()
    T.estado.form = Object.assign({}, tf)
    resp2[0]({ data: [YA(tf.transferencias[0].id)], error: null }); await p3
    chk('una respuesta para otro formulario no se aplica', T.estado.repetidos?.porClave?.size === 0, T.estado.repetidos?.porClave?.size)
  }

  // ══ 5. YA CARGADA: ROJO CON LOS DATOS Y "SACAR" ═══════════════════════════
  {
    const S = await conUna(928559.01)
    const f = S.estado.form
    const t = f.transferencias[0]
    S.__setRpc(async (n, p) => n === 'comprobantes_ya_cargados' ? { data: [YA(p.p_items[0].clave)], error: null } : { data: null, error: null })
    // La tarjeta ya está en pantalla: la respuesta la pinta EN EL LUGAR.
    const caja = { dataset: { transfRepetido: t.id }, className: 'cob-aviso', hidden: true, innerHTML: '' }
    const clases = new Set()
    const tarjeta = { dataset: { transf: t.id }, classList: { toggle(c, si) { if (si) clases.add(c); else clases.delete(c) } } }
    S.__porSelector['[data-transf-repetido]'] = [caja]
    S.__porSelector['[data-transf]'] = [tarjeta]
    S.__correrTimers(); await esperar()
    const rep = S.repetidoDeTransferencia(f, t, 0)
    chk('mismo número y mismo importe: ROJO', rep.nivel === 'rojo', JSON.stringify(rep))
    chk('la respuesta pinta en el lugar el aviso de la tarjeta (bordó, visible, con "Sacar")', caja.hidden === false &&
      caja.className === 'cob-aviso cob-aviso--grave' && /^Ya cargada: cobranza de DUOLATE/.test(caja.innerHTML) && /data-sacar-transf=/.test(caja.innerHTML), JSON.stringify(caja))
    chk('…y marca la tarjeta', clases.has('cob-transferencia--repetida'))
    chk('…y deshabilita Guardar sin esperar otro repintado', el(S, 'cob-btn-guardar').disabled === true)
    const h = S.htmlTransferenciaForm(t, 0, true)
    const aviso = texto(h.match(/data-transf-repetido="[^"]+"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/)?.[1])
    chk('el texto: "Ya cargada: cobranza de DUOLATE del 30/10/2026, la cargó Godoy Yanina (op. 274845028, $ 928.559,01)"',
      aviso.startsWith('Ya cargada: cobranza de DUOLATE del 30/10/2026, la cargó Godoy Yanina (op. 274845028, $ 928.559,01).'), aviso)
    chk('el aviso es grave (bordó) y la tarjeta queda marcada', /class="cob-aviso cob-aviso--grave" data-transf-repetido/.test(h) && /cob-transferencia--repetida/.test(h), h.slice(0, 700))
    chk('el aviso se lee como alerta (role="alert")', /data-transf-repetido="[^"]+" role="alert">/.test(h))
    chk('con un botón "Sacar"', /<button type="button" class="cob-btn cob-btn--chico cob-btn--alerta" data-sacar-transf="[^"]+">Sacar<\/button>/.test(h))
    S.pintarFormasNuevas()
    chk('repintada la sección, la tarjeta sigue en rojo', /Ya cargada: cobranza de DUOLATE/.test(el(S, 'cob-lista-transferencias').innerHTML))
    // Guardar bloqueado.
    S.pintarTotalYGuardado()
    chk('con un rojo, Guardar queda deshabilitado', el(S, 'cob-btn-guardar').disabled === true)
    chk('…y dice "Sacá los comprobantes repetidos."', el(S, 'cob-form-pendientes').innerHTML.includes('Sacá los comprobantes repetidos.') &&
      S.motivosParaNoGuardar().includes('Sacá los comprobantes repetidos.'), el(S, 'cob-form-pendientes').innerHTML)
    // Cambiar el número saca el rojo EN EL MOMENTO (la respuesta era para el otro número).
    S.actualizarTransferencia(t.id, 'referencia', '999988887')
    chk('cambiar el número: la coincidencia vieja ya no aplica (antes de la nueva respuesta)', S.repetidoDeTransferencia(f, t, 0).nivel === null)
    chk('…y el aviso de la tarjeta se va en el lugar', caja.hidden === true && !clases.has('cob-transferencia--repetida'))
    S.actualizarTransferencia(t.id, 'referencia', '274845028')
    chk('volver al número: vuelve el rojo', S.repetidoDeTransferencia(f, t, 0).nivel === 'rojo')
    // Sacar.
    S.alTocarEnFormas({ target: { closest: () => ({ dataset: { sacarTransf: t.id } }) } })
    chk('"Sacar" lo quita de esta cobranza', f.transferencias.length === 0, f.transferencias.length)
    chk('sin el repetido, ya no está el motivo', !S.motivosParaNoGuardar().includes('Sacá los comprobantes repetidos.'))
    chk('el comprobante que quedó sin tarjeta se descarta al guardar', S.fotosParaBase(f).length === 0)
  }

  // ══ 6. LA MISMA FOTO OTRA VEZ → ROJO ══════════════════════════════════════
  {
    const S = await conUna(5000, '12121212')
    const f = S.estado.form
    const t = f.transferencias[0]
    S.__setRpc(async (n, p) => n === 'comprobantes_ya_cargados'
      ? { data: [YA(p.p_items[0].clave, { motivo: 'misma_foto', importe: null, referencia: null, cliente: 'J&M' })], error: null } : { data: null, error: null })
    S.__correrTimers(); await esperar()
    const rep = S.repetidoDeTransferencia(f, t, 0)
    chk('misma foto en otra cobranza: ROJO aunque el número y el importe sean otros', rep.nivel === 'rojo', JSON.stringify(rep))
    chk('…con el texto de la misma foto', rep.textos[0] === 'Ya cargada: cobranza de J&M del 30/10/2026, la cargó Godoy Yanina (es la misma foto del comprobante).', rep.textos[0])
    chk('…escapado en la tarjeta (J&amp;M)', S.htmlTransferenciaForm(t, 0, true).includes('cobranza de J&amp;M del'))
    // Si el comprobante de la tarjeta cambió, esa respuesta no le corresponde.
    f.fotos[0].sha256 = 'otra'
    chk('la respuesta era para otra huella: no aplica', S.repetidoDeTransferencia(f, t, 0).nivel === null)
    // El mismo archivo elegido dos veces en la misma cobranza.
    const D = sandbox()
    let n = 0
    D.__setInvoke(async () => leido([op('Brubank', 100, n++ ? '' : '')]))
    await D.agregarFotos([archivo('igual.jpg'), archivo('igual.jpg')], 'transferencia')
    await esperar()
    const df = D.estado.form
    chk('el mismo archivo dos veces: la segunda en rojo (sin número)', df.transferencias.length === 2 &&
      D.repetidoDeTransferencia(df, df.transferencias[0], 0).nivel === null && D.repetidoDeTransferencia(df, df.transferencias[1], 1).nivel === 'rojo',
      JSON.stringify(df.transferencias.map((t, i) => D.repetidoDeTransferencia(df, t, i))))
    chk('…y dice que lo elegiste dos veces', /lo elegiste dos veces/.test(D.repetidoDeTransferencia(df, df.transferencias[1], 1).textos[0] ?? ''))
  }

  // ══ 7. EL MISMO NÚMERO DOS VECES EN LA TANDA → ROJO EN EL SEGUNDO ═════════
  {
    const S = sandbox()
    let n = 0
    const resp = [[op('Mercado Pago', 100, '274845028')], [op('Banco Nación', 300, '0001')], [op('Mercado Pago', 200, '274.845.028')]]
    S.__setInvoke(async () => leido(resp[n++]))
    await S.agregarFotos([archivo('a.jpg'), archivo('b.jpg'), archivo('c.jpg')], 'transferencia')
    await esperar()
    const f = S.estado.form
    const reps = f.transferencias.map((t, i) => S.repetidoDeTransferencia(f, t, i))
    chk('mismo número en la tanda: el primero queda, el TERCERO (con puntos) en rojo', reps[0].nivel === null && reps[1].nivel === null && reps[2].nivel === 'rojo', JSON.stringify(reps))
    chk('…con el texto "Mismo número de operación que la transferencia 1 de esta cobranza"', /^Mismo número de operación que la transferencia 1 de esta cobranza \(op\. 274\.845\.028\)/.test(reps[2].textos[0] ?? ''), reps[2].textos[0])
    S.pintarTotalYGuardado()
    chk('…y bloquea Guardar', el(S, 'cob-btn-guardar').disabled === true && S.motivosParaNoGuardar().includes('Sacá los comprobantes repetidos.'))
    chk('…se pinta en la lista de tarjetas', (el(S, 'cob-lista-transferencias').innerHTML.match(/cob-transferencia--repetida/g) || []).length === 1)
    S.actualizarTransferencia(f.transferencias[2].id, 'referencia', '274845029')
    chk('corregir el número saca el rojo', S.repetidoDeTransferencia(f, f.transferencias[2], 2).nivel === null && !S.motivosParaNoGuardar().includes('Sacá los comprobantes repetidos.'))
    chk('dos números cortos iguales (menos de 4) no chocan, igual que en la base',
      S.repetidoDeTransferencia({ fotos: [], transferencias: [{ id: 'a', referencia: '12' }, { id: 'b', referencia: '12' }] }, { id: 'b', referencia: '12' }, 1).nivel === null)
  }

  // ══ 8. MISMO NÚMERO CON OTRO IMPORTE → AMARILLO, NO BLOQUEA ════════════════
  {
    const S = await conUna(100000)
    const f = S.estado.form
    const t = f.transferencias[0]
    S.__setRpc(async (n, p) => n === 'comprobantes_ya_cargados' ? { data: [YA(p.p_items[0].clave)], error: null } : { data: { id: 'x', asentada: true }, error: null })
    S.__correrTimers(); await esperar()
    const rep = S.repetidoDeTransferencia(f, t, 0)
    chk('mismo número, otro importe: "revisar" (amarillo), no rojo', rep.nivel === 'revisar', JSON.stringify(rep))
    chk('…con el texto "Mismo número de operación que una cobranza de DUOLATE del 30/10/2026 con otro importe … revisalo."',
      texto(rep.textos[0]) === 'Mismo número de operación que una cobranza de DUOLATE del 30/10/2026 con otro importe (op. 274845028, $ 928.559,01): revisalo.', rep.textos[0])
    const h = S.htmlTransferenciaForm(t, 0, true)
    chk('…en amarillo (cob-aviso--revisar), sin "Sacar" y sin marcar la tarjeta', /class="cob-aviso cob-aviso--revisar" data-transf-repetido/.test(h) &&
      !/data-sacar-transf/.test(h) && !/cob-transferencia--repetida/.test(h))
    chk('…NO bloquea Guardar', !S.motivosParaNoGuardar().includes('Sacá los comprobantes repetidos.'), JSON.stringify(S.motivosParaNoGuardar()))
    const r = await S.subirCobranza(f)
    chk('…y se puede guardar', r.ok === true, JSON.stringify(r))
    // Corregir el importe al de la otra: pasa a rojo.
    S.actualizarTransferencia(t.id, 'importe', '928.559,01')
    chk('con el MISMO importe pasa a rojo', S.repetidoDeTransferencia(f, t, 0).nivel === 'rojo')
    S.actualizarTransferencia(t.id, 'importe', '')
    chk('sin importe todavía: revisar (no se sabe), no rojo', S.repetidoDeTransferencia(f, t, 0).nivel === 'revisar')
    chk('mismoImporte compara en centavos', S.mismoImporte('928.559,01', 928559.01) && !S.mismoImporte('928.559,02', 928559.01) && !S.mismoImporte('1', null) && !S.mismoImporte('', 0))
  }

  // ══ 9. EL ERROR DE LA BASE, TAL CUAL; LA RPC QUE FALLA NO BLOQUEA ═════════
  {
    const S = await conUna(928559.01)
    const f = S.estado.form
    const MSJ = 'Esa transferencia ya está cargada en la cobranza de DUOLATE del 30/10/2026 (operación 274845028, $ 928.559,01). No se carga dos veces.'
    S.__setRpc(async (n) => n === 'cargar_cobranza_asentada' ? { data: null, error: { message: MSJ, code: 'P0001' } } : { data: [], error: null })
    await S.guardarCobranza()
    chk('el rechazo de la base se muestra TAL CUAL', el(S, 'cob-error-guardar').textContent === MSJ && el(S, 'cob-error-guardar').hidden === false, el(S, 'cob-error-guardar').textContent)
    const MSJ2 = 'Esa foto ya está cargada en otra cobranza (DUOLATE del 30/10/2026). Sacala o anulá la otra.'
    S.__setRpc(async (n) => n === 'cargar_cobranza_asentada' ? { data: null, error: { message: MSJ2, code: 'P0001' } } : { data: [], error: null })
    await S.guardarCobranza()
    chk('el de la misma foto también, tal cual', el(S, 'cob-error-guardar').textContent === MSJ2)
    chk('la cobranza queda abierta para corregirla', S.estado.form === f && f.estadoLocal === 'borrador')
    // La pregunta falla: se avisa neutro y no bloquea.
    S.__setRpc(async (n) => n === 'comprobantes_ya_cargados' ? { data: null, error: { message: 'boom' } } : { data: [], error: null })
    await S.revisarRepetidos()
    chk('si la pregunta falla: aviso neutro "No se pudo revisar…" y la base igual lo controla', el(S, 'cob-repetidos-aviso').hidden === false &&
      /^No se pudo revisar si estos comprobantes ya estaban cargados\. Al guardar, la base igual lo controla\.$/.test(el(S, 'cob-repetidos-aviso').textContent), el(S, 'cob-repetidos-aviso').textContent)
    chk('…y no bloquea Guardar', !S.motivosParaNoGuardar().includes('Sacá los comprobantes repetidos.'))
    S.__setRpc(async (n) => n === 'comprobantes_ya_cargados' ? { data: [], error: null } : { data: [], error: null })
    await S.revisarRepetidos()
    chk('la próxima que anda saca el aviso', el(S, 'cob-repetidos-aviso').hidden === true)
    // Lo que se sabía no se pierde si la siguiente falla.
    S.__setRpc(async (n, p) => n === 'comprobantes_ya_cargados' ? { data: [YA(p.p_items[0].clave)], error: null } : { data: [], error: null })
    await S.revisarRepetidos()
    S.__setRpc(async () => { throw new Error('Failed to fetch') })
    await S.revisarRepetidos()
    chk('una falla no borra el rojo que ya se sabía', S.repetidoDeTransferencia(f, f.transferencias[0], 0).nivel === 'rojo')
    chk('…y la falla de red se dice como "Sin señal"', /^Sin señal: no se pudo revisar/.test(el(S, 'cob-repetidos-aviso').textContent), el(S, 'cob-repetidos-aviso').textContent)
    // Una coincidencia de una clave que no se preguntó se ignora.
    S.__setRpc(async () => ({ data: [YA('clave-ajena')], error: null }))
    await S.revisarRepetidos()
    chk('una clave que no se preguntó no marca nada', S.repetidoDeTransferencia(f, f.transferencias[0], 0).nivel === null)
  }

  // ══ 10. TODO LO QUE VIENE DE LA BASE O DEL LECTOR VA ESCAPADO ═════════════
  {
    const S = await conUna(928559.01)
    const f = S.estado.form
    const t = f.transferencias[0]
    const MAL = '<img src=x onerror=alert(1)>'
    S.__setRpc(async (n, p) => n === 'comprobantes_ya_cargados'
      ? { data: [YA(p.p_items[0].clave, { cliente: MAL, cargada_por: MAL, referencia: MAL })], error: null } : { data: null, error: null })
    S.__correrTimers(); await esperar()
    const h = S.htmlTransferenciaForm(t, 0, true)
    chk('XSS: el cliente, quién la cargó y el número de la base van escapados', !h.includes(MAL) && h.includes('&lt;img src=x onerror=alert(1)&gt;'), h.slice(0, 900))
    t.banco_origen = MAL; t.ordenante = MAL; t.referencia = MAL
    const h2 = S.htmlTransferenciaForm(t, 0, true)
    chk('XSS: el renglón (banco, quién, número del lector) va escapado', !h2.includes(MAL))
    const rs = S.htmlResumenTransferencias([t, { ...t, id: 'otra', medio: 'deposito_efectivo' }])
    chk('XSS: el banco en el resumen va escapado', !rs.includes(MAL) && rs.includes('&lt;img'), rs)
    f.transferencias.push({ ...t, id: 'x"><b>' })
    const h3 = S.htmlTransferenciaForm(f.transferencias[1], 1, true)
    chk('XSS: el id de la tarjeta va escapado en "Sacar" y en el aviso', !h3.includes('x"><b>') && h3.includes('x&quot;&gt;&lt;b&gt;'))
  }

  // ══ 11. EL CHOFER NO PREGUNTA (no carga transferencias) ═══════════════════
  {
    const S = sandbox()
    S.estado.misTareas = new Set(['cobranzas:cargar'])
    S.programarRevisionRepetidos(0)
    chk('sin cobranzas:procesar no se programa la pregunta', S.__timers().length === 0)
    await S.revisarRepetidos()
    chk('…ni se hace', !S.__rpcs().some(x => x.nombre === 'comprobantes_ya_cargados'))
  }

  // ══ 12. FUENTE: REUSA EL FLUJO DE HOY (NO HAY OTRO LECTOR NI OTRO INPUT) ══
  {
    chk('fuente: un solo lector de comprobantes (ocr-cobranza-comprobantes, una llamada)', (FUENTE.match(/functions\.invoke\('ocr-cobranza-comprobantes'/g) || []).length === 1)
    chk('fuente: los mismos inputs con "multiple" (galería y archivo)', /id="cob-file-comprobante-galeria" accept="image\/\*" multiple/.test(FUENTE) &&
      /id="cob-file-comprobante-archivo" accept="[^"]*application\/pdf" multiple/.test(FUENTE))
    chk('fuente: la huella con crypto.subtle.digest(\'SHA-256\', …)', /sutil\.digest\('SHA-256', bytes\)/.test(FUENTE))
    chk('fuente: el resumen y el aviso viven en la sección de transferencias, arriba de la lista',
      FUENTE.indexOf('id="cob-resumen-transferencias"') > FUENTE.indexOf('id="cob-comprobantes-transferencia"') &&
      FUENTE.indexOf('id="cob-resumen-transferencias"') < FUENTE.indexOf('id="cob-lista-transferencias"'))
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
