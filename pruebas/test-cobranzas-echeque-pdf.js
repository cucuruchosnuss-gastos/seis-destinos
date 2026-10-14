// E-CHEQUE DESDE UN PDF (pedido de Facu del 14/10/2026). Caso real: cobranza
// f47dadf1… (Dolce, BERSANO), comprobante PDF de un ECHEQ del Macro subido por
// Yanina. En la tarjeta "solo apareció el importe" y el resto se tipeó a mano.
//
// Lo que se exige, ejecutando las funciones REALES de modulos/cobranzas.html
// con el crudo REAL de esa foto (cobranza_fotos 25582a7d…, leído de la base el
// 14/10/2026) pasado por el normalizador REAL de la Edge Function
// (supabase/functions/ocr-cobranza-comprobantes/normalizar.js):
//  - al subir el comprobante, la tarjeta aparece EN EL MOMENTO (o se usa la
//    tarjeta vacía que ya estaba abierta) y dice "Leyendo el comprobante…";
//  - cuando el lector responde, se completan ESA tarjeta: banco, número,
//    emisor, CUIT, fecha de pago e importe, sin agregar otra;
//  - lo que la persona escribió mientras el lector no respondía NO se pisa;
//  - sin fecha de emisión en el comprobante: la de hoy, con la leyenda
//    "No figura en el comprobante: revisala" (y eso no cuenta como corrección);
//  - si el lector falla, queda la misma tarjeta con el comprobante (no dos).
//
//   node pruebas/test-cobranzas-echeque-pdf.js
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
  else fallas.push(nombre + (detalle !== undefined ? ` — ${String(detalle).slice(0, 400)}` : ''))
}

// El ocr_crudo REAL de la foto 25582a7d-90c5-4893-a937-dd049fc4529f (14/10/2026).
const CRUDO = { comprobantes: [{
  cmc7: null,
  notas: "Comprobante de pago Macro; 'numero' tomado de 'Nro. de Instrumento de Pago' (78013718). No figura CMC7. Cta de origen informada: 379200002792208 (15 dígitos, no 11). Beneficiario: DOLCE PASTA SRL, CUIT 33709335419. Medio de pago: ECHEQ DIFERIDO, estado ENTREGADA.",
  cuenta: null, emisor: 'BERSANO SRL', numero: '78013718', importe: 9400228.77, id_echeq: null, fecha_pago: '2026-11-16',
  cuit_emisor: '30690839691', banco_codigo: '285', banco_nombre: 'Banco Macro', codigo_postal: null, fecha_emision: null, sucursal_codigo: null,
}] }
const HOY = '2026-10-14'

const PRELUDIO = `
  ${fuenteNumeros()}
  var console = { error(){}, log(){}, warn(){} }
  function nuevoEl(id, dataset = {}) {
    const atributos = {}
    return {
      id, innerHTML: '', textContent: '', value: '', className: '', hidden: false,
      disabled: false, dataset, src: '', max: '', __clicks: 0,
      querySelectorAll: () => [], querySelector: () => null,
      addEventListener(){}, focus(){ __foco.push(id) }, click(){ this.__clicks++ },
      setSelectionRange(){}, setAttribute(k, v){ atributos[k] = String(v) }, getAttribute(k){ return atributos[k] ?? null },
      classList: { add(){}, remove(){}, toggle(){} },
    }
  }
  var __foco = []
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
  var crypto = { randomUUID: (() => { let n = 0; return () => '00000000-0000-4000-8000-' + String(++n).padStart(12, '0') })() }
  var window = { open(){} }
  function setImmediate(f){ return Promise.resolve().then(f) }

  var __rpcs = []
  var __subidas = []
  var __invocaciones = []
  var __invokeImpl = async () => ({ data: null, error: new Error('sin lector') })
  var supabase = {
    from: () => { const q = {}; for (const op of ['select','eq','in','order','range','like','gte','lte','or','maybeSingle']) q[op] = () => q; q.then = (r) => Promise.resolve({ data: [], error: null }).then(r); return q },
    rpc: (n, p) => { __rpcs.push({ nombre: n, params: p }); return Promise.resolve({ data: null, error: null }) },
    storage: { from: (b) => ({
      upload: async (ruta, blob, op) => { __subidas.push({ bucket: b, ruta, tipo: op?.contentType }); return { error: null } },
      createSignedUrl: async () => ({ data: { signedUrl: 'https://firmada/x' }, error: null }),
    }) },
    functions: { invoke: (nombre, op) => { __invocaciones.push({ nombre, body: op?.body }); return __invokeImpl(nombre, op) } },
  }

  var __llamadas = { exitos: [], errores: [], vistas: [] }
  function mostrarExito(m){ __llamadas.exitos.push(m) } function mostrarError(m){ __llamadas.errores.push(m) }
  function mostrarVistaCob(v){ __llamadas.vistas.push(v) }
  async function guardarBorrador(){}
  function pintarCheques(){} function iniciarReintentosFotos(){} function asegurarContadorLecturas(){}
  function escribirImporteEnCampo(){}
  async function dbBorrar(){} async function refrescarListado(){} async function refrescarLocales(){}
  async function urlDeFoto(foto){ return foto ? 'https://firmada/' + foto.id : null }
  function abrirVisor(){}
  function hoyArgentina(){ return '${HOY}' }
  var STORE_BORRADORES = 'borradores'
  function pasarBarraAUnidad(){ return true }
  async function comprimirFoto(){ return { size: 300 * 1024, type: 'image/jpeg' } }

  var estado = {
    sesion: { user: { id: 'uid' } },
    miEmpleadoId: 'emp-1', miRolApp: 'usuario',
    misTareas: new Set(['cobranzas:cargar', 'cobranzas:ver_todo', 'cobranzas:procesar']),
    bancos: new Map([['007', 'Galicia'], ['285', 'Macro']]), unidades: [], form: null, detalle: null,
    unidadElegida: null, fabrica: FABRICA_SIN_DATOS, fabricaLista: true, asentar: null,
    cuentasBancoLista: [], cuentasBanco: new Map(),
  }
`

// Las funciones de siempre del módulo, más las que trae el arreglo (si el
// archivo no las tiene, la suite igual corre y da ROJO por comportamiento, que
// es lo que muestra que la prueba falla ANTES del arreglo).
const FUNCIONES_BASE = [
  'escCob', 'formatearImporte', 'esFechaIso', 'diasEntre', 'formatearFechaCob', 'nombreBanco', 'nombreBancoDe',
  'tieneTarea', 'textoOpcional', 'chequeParaBase', 'origenDatosDe', 'chequeVacio', 'chequeDesdeBase', 'renglonComoImpreso',
  'formularioVacio', 'pintarFormulario', 'pintarBotonChequeMano', 'abrirFormularioNuevo',
  'htmlEtiquetaForma', 'erroresDeEcheque', 'echequeParaBase', 'echequeDesdeBase', 'erroresDeCheque', 'dvBcra',
  'erroresDeTransferencia', 'transferenciaParaBase', 'transferenciaDesdeBase', 'nombresDeCuentas',
  'sumaImportes', 'totalesPorForma', 'usaCobranzaCompleta', 'cuentasParaElegir', 'htmlDatosCheque', 'textoDiasHastaPago',
  'nombreUnidadCob', 'htmlOpcionesCuentas', 'htmlEcheckForm', 'htmlTransferenciaForm', 'pintarFormasNuevas',
  'pintarResumenFormas', 'htmlResumenFormas', 'echeckDelForm', 'transfDelForm', 'agregarEcheck', 'agregarTransferencia',
  'quitarEcheck', 'quitarTransferencia', 'actualizarEcheck', 'actualizarTransferencia', 'pintarErroresForma',
  'alEscribirEnFormas', 'alTocarEnFormas',
  'totalDelFormulario', 'efectivoDelFormulario', 'motivosParaNoGuardar', 'pintarTotalYGuardado',
  'esErrorDeRed', 'normalizarCliente', 'momentoArgentina',
  'agregarFotos', 'procesarFoto', 'marcarFotoEnMemoria', 'mensajeDelLector', 'pintarEstadoFotos', 'htmlAvisoFoto',
  'fotoLeidaSinProblemas', 'fotoSinSenal', 'textoLecturaFoto', 'textoChequesLeidos', 'chequeDesdeOcr', 'aplicarRenglones',
  ...FUNCIONES_ASENTAR,
]
const DEL_ARREGLO = ['escritoPorPersona', 'echequeSinDatos', 'completarEcheque', 'tarjetaParaComprobante', 'textoLecturaEcheque', 'restaurarFoco']
const existe = (n) => new RegExp(`\\n\\s*(?:async\\s+)?function ${n}\\(`).test(FUENTE)
const FUNCIONES = [...new Set([...FUNCIONES_BASE, ...DEL_ARREGLO.filter(existe)])]
const CONSTANTES = [
  'ZONA_AR', 'ACENTOS_COB', 'SIN_ACENTOS_COB', 'DIAS_MAXIMO_DIFERIDO', 'ETIQUETA_ESTADO_COBRANZA', 'ETIQUETA_ESTADO_CHEQUE',
  'puedeCargar', 'puedeVerTodo', 'puedeProcesar', 'puedeEditarAnular', 'TEXTO_BOTON_CHEQUE_MANO', 'SEGUNDOS_LECTURA_LENTA',
  'MAX_INTENTOS_LECTOR',
  ...CONSTANTES_ASENTAR,
]

function sandbox() {
  return construirCon(ARCHIVO, {
    preludio: PRELUDIO, funciones: FUNCIONES, constantes: CONSTANTES,
    retorno: `estado, __els, __porSelector, __foco, __doc: document, nuevoEl, __llamadas,
      __invocaciones(){ return __invocaciones }, __setInvoke(f){ __invokeImpl = f }, __subidas(){ return __subidas }`,
  })
}
// La leyenda de la fecha de emisión está siempre en la tarjeta: se mira si se VE.
const leyendaVisible = (h) => /data-echeck-aviso-fecha="[^"]*">No figura en el comprobante: revisala</.test(h)
const esperar = async (n = 10) => { for (let i = 0; i < n; i++) await new Promise(r => setImmediate(r)) }
const PDF = { type: 'application/pdf', size: 180 * 1024, name: 'ECHEQ BERSANO.pdf' }

// Un lector que NO responde hasta que la prueba lo suelta: el PDF tarda
// 20-40 s de verdad, y en ese rato la persona escribe.
function lectorDemorado(S, respuesta) {
  let soltar
  const pendiente = new Promise(r => { soltar = r })
  S.__setInvoke(async () => { await pendiente; return { data: respuesta, error: null } })
  return () => soltar()
}

// Un formulario nuevo de quien controla, con la sección E-cheque abierta.
function formularioConEcheque() {
  const S = sandbox()
  S.abrirFormularioNuevo()
  S.abrirForma('echeque')
  return S
}

async function pruebas() {
  async function bloque(nombre, fn) {
    try { await fn() } catch (err) { chk(nombre + ': corre sin excepción', false, err && err.message) }
  }
  const { normalizarRespuesta } = await import('data:text/javascript;charset=utf-8,' + encodeURIComponent(fs.readFileSync(path.join(RAIZ, 'supabase/functions/ocr-cobranza-comprobantes/normalizar.js'), 'utf8')))
  const PROPUESTOS = normalizarRespuesta('echeque', CRUDO, new Date(HOY + 'T12:00:00Z'))
  const RESPUESTA = { ok: true, modelo: 'claude-opus-5', tipo: 'echeque', crudo: CRUDO, propuestos: PROPUESTOS }

  // ══ 0. LO QUE LE LLEGA A LA PANTALLA ═══════════════════════════════════════
  await bloque('bloque 1', async () => {
    const p = PROPUESTOS[0] ?? {}
    chk('el normalizador de la Edge Function, con el crudo real: banco, número, emisor, CUIT, fecha de pago e importe',
      PROPUESTOS.length === 1 && p.banco_codigo === '285' && p.numero === '78013718' && p.emisor === 'BERSANO SRL' &&
      p.cuit_emisor === '30690839691' && p.fecha_pago === '2026-11-16' && p.importe === 9400228.77 && p.fecha_emision === null, JSON.stringify(p))
    for (const n of DEL_ARREGLO) chk(`el arreglo: existe ${n}()`, existe(n))
  })

  // ══ 1. SIN TARJETA ABIERTA: LA TARJETA APARECE AL SUBIR Y SE COMPLETA ══════
  await bloque('bloque 2', async () => {
    const S = formularioConEcheque()
    const f = S.estado.form
    const soltar = lectorDemorado(S, RESPUESTA)
    await S.agregarFotos([PDF], 'echeque')
    await esperar()
    const foto = f.fotos[0]
    chk('sin tarjeta: el PDF se sube tal cual y va al lector nuevo como e-cheque',
      foto?.mime === 'application/pdf' && S.__invocaciones().some(i => i.nombre === 'ocr-cobranza-comprobantes' && i.body.tipo === 'echeque'))
    chk('sin tarjeta: mientras lee, YA hay una tarjeta con el comprobante adjunto', (f.echecks ?? []).length === 1 && f.echecks[0].foto_id === foto?.id, JSON.stringify(f.echecks))
    const e = f.echecks?.[0]
    const h = e ? S.htmlEcheckForm(e, 0, true) : ''
    chk('mientras lee, la tarjeta dice "Leyendo el comprobante…"', /Leyendo el comprobante…/.test(h) && /data-echeck-leyendo=/.test(h), h.slice(0, 600))
    // El aviso de la tarjeta se actualiza EN EL LUGAR (sin repintar: no le
    // saca el foco a quien está escribiendo).
    const linea = S.nuevoEl('leyendo', { echeckLeyendo: e?.id })
    linea.hidden = true
    S.__porSelector['[data-echeck-leyendo]'] = [linea]
    S.pintarEstadoFotos()
    chk('el aviso "Leyendo el comprobante…" se pone en el lugar, sin repintar la tarjeta', linea.hidden === false && /^Leyendo el comprobante…/.test(linea.textContent), linea.textContent)
    soltar()
    await esperar()
    chk('respondió: sigue habiendo UNA tarjeta (la misma)', f.echecks.length === 1 && f.echecks[0].id === e?.id)
    chk('respondió: banco 285 y número 78013718', e?.banco_codigo === '285' && e?.numero === '78013718', JSON.stringify(e))
    chk('respondió: emisor y CUIT del emisor', e?.emisor === 'BERSANO SRL' && e?.cuit_emisor === '30690839691', JSON.stringify(e))
    chk('respondió: diferido con su fecha de pago', e?.tipo === 'diferido' && e?.fecha_pago === '2026-11-16')
    chk('respondió: el importe', e?.importe === 9400228.77)
    chk('sin fecha de emisión en el comprobante: queda la de hoy', e?.fecha_emision === HOY, e?.fecha_emision)
    const h2 = e ? S.htmlEcheckForm(e, 0, true) : ''
    chk('…con la leyenda "No figura en el comprobante: revisala"', leyendaVisible(h2))
    chk('ya leído, la tarjeta no dice "Leyendo"', !/Leyendo el comprobante/.test(h2))
    chk('ya leído, el aviso en el lugar se esconde', linea.hidden === true)
    chk('la tarjeta dice que se leyó del comprobante (la fecha de hoy puesta por el sistema no es una corrección)',
      /Leído del comprobante: revisalo antes de guardar\./.test(h2))
    const b = e ? S.echequeParaBase(e) : {}
    chk('para la base: "ocr", con el comprobante y lo que propuso el lector tal cual', b.origen_datos === 'ocr' && b.foto_id === foto?.id &&
      b.ocr_propuesto?.fecha_emision === null && b.ocr_propuesto?.banco_codigo === '285', JSON.stringify(b))
    chk('para la base: el emisor y su CUIT en titulares, y la fecha de emisión de hoy', JSON.stringify(b.titulares) === '[{"nombre":"BERSANO SRL","cuit":"30690839691"}]' && b.fecha_emision === HOY)
    chk('sin nada más que completar: el e-cheque no frena el guardado', !S.motivosParaNoGuardar().some(m => /^E-cheque/.test(m)), S.motivosParaNoGuardar().join(' | '))
    S.actualizarEcheck(e?.id, 'fecha_emision', '2026-10-10')
    chk('cambiar la fecha de emisión saca la leyenda', !leyendaVisible(S.htmlEcheckForm(e, 0, true)))
    chk('…y eso sí es una corrección ("ocr_corregido")', S.echequeParaBase(e).origen_datos === 'ocr_corregido')
  })

  // ══ 2. CON UNA TARJETA VACÍA YA ABIERTA: SE COMPLETA ESA ═══════════════════
  await bloque('bloque 3', async () => {
    const S = formularioConEcheque()
    const f = S.estado.form
    S.agregarEcheck()
    const id = f.echecks[0].id
    const soltar = lectorDemorado(S, RESPUESTA)
    await S.agregarFotos([PDF], 'echeque')
    await esperar()
    chk('con tarjeta vacía: el comprobante se le adjunta a ESA tarjeta (no aparece otra)', f.echecks.length === 1 && f.echecks[0].id === id && f.echecks[0].foto_id === f.fotos[0].id, JSON.stringify(f.echecks))
    soltar()
    await esperar()
    const e = f.echecks[0]
    chk('con tarjeta vacía: respondió y completó ESA tarjeta', f.echecks.length === 1 && e.id === id && e.banco_codigo === '285' && e.numero === '78013718' &&
      e.emisor === 'BERSANO SRL' && e.cuit_emisor === '30690839691' && e.fecha_pago === '2026-11-16' && e.importe === 9400228.77, JSON.stringify(f.echecks))
    chk('con tarjeta vacía: la fecha de emisión de hoy, con su leyenda', e.fecha_emision === HOY && leyendaVisible(S.htmlEcheckForm(e, 0, true)))
  })

  // ══ 3. ESCRIBIENDO MIENTRAS EL LECTOR NO RESPONDIÓ ═════════════════════════
  for (const conTarjeta of [false, true]) await bloque('bloque 4 (' + conTarjeta + ')', async () => {
    const S = formularioConEcheque()
    const f = S.estado.form
    if (conTarjeta) S.agregarEcheck()
    const soltar = lectorDemorado(S, RESPUESTA)
    await S.agregarFotos([PDF], 'echeque')
    await esperar()
    const e = f.echecks?.[0]
    const cual = conTarjeta ? 'con tarjeta abierta' : 'sin tarjeta'
    if (!e) { chk(`escribiendo (${cual}): hay una tarjeta para escribir mientras lee`, false); return }
    S.actualizarEcheck(e.id, 'emisor', 'Bersano Hnos')
    S.actualizarEcheck(e.id, 'importe', '9.400.000,00')
    S.actualizarEcheck(e.id, 'numero', '123')
    S.actualizarEcheck(e.id, 'numero', '')
    S.actualizarEcheck(e.id, 'fecha_emision', '2026-10-01')
    soltar()
    await esperar()
    chk(`escribiendo (${cual}): sigue habiendo una sola tarjeta`, f.echecks.length === 1 && f.echecks[0].id === e.id, f.echecks.length)
    chk(`escribiendo (${cual}): lo escrito NO se pisa (emisor, importe y fecha de emisión)`, e.emisor === 'Bersano Hnos' && e.importe === '9.400.000,00' && e.fecha_emision === '2026-10-01', JSON.stringify(e))
    chk(`escribiendo (${cual}): lo vacío se completa (banco, CUIT, fecha de pago)`, e.banco_codigo === '285' && e.cuit_emisor === '30690839691' && e.fecha_pago === '2026-11-16' && e.tipo === 'diferido', JSON.stringify(e))
    chk(`escribiendo (${cual}): un campo escrito y borrado quedó vacío, así que se completa`, e.numero === '78013718', e.numero)
    chk(`escribiendo (${cual}): con fecha de emisión escrita no va la leyenda`, !leyendaVisible(S.htmlEcheckForm(e, 0, true)))
    chk(`escribiendo (${cual}): queda "ocr_corregido" (difiere de lo leído)`, S.echequeParaBase(e).origen_datos === 'ocr_corregido')
  })
  // Elegir "A la vista" mientras lee: no se vuelve diferido ni se le pone la
  // fecha de pago escondida.
  await bloque('bloque 5', async () => {
    const S = formularioConEcheque()
    const f = S.estado.form
    const soltar = lectorDemorado(S, RESPUESTA)
    await S.agregarFotos([PDF], 'echeque')
    await esperar()
    const e = f.echecks?.[0]
    if (e) S.actualizarEcheck(e.id, 'tipo', 'comun')
    soltar()
    await esperar()
    chk('eligió "A la vista" mientras leía: queda a la vista y sin fecha de pago', e?.tipo === 'comun' && e?.fecha_pago === '', JSON.stringify(e))
    chk('…y lo demás se completa igual', e?.banco_codigo === '285' && e?.importe === 9400228.77)
  })

  // Elegir "Diferido" mientras lee, y el comprobante sin fecha de pago: la
  // elección de la persona manda (no se vuelve "a la vista").
  await bloque('diferido elegido', async () => {
    const S = formularioConEcheque()
    const f = S.estado.form
    const soltar = lectorDemorado(S, { ...RESPUESTA, propuestos: [{ ...PROPUESTOS[0], fecha_pago: null }] })
    await S.agregarFotos([PDF], 'echeque')
    await esperar()
    const e = f.echecks?.[0]
    if (e) S.actualizarEcheck(e.id, 'tipo', 'diferido')
    soltar()
    await esperar()
    chk('eligió "Diferido" mientras leía y el comprobante no trae fecha de pago: sigue diferido', e?.tipo === 'diferido' && e?.fecha_pago === '', JSON.stringify(e))
    const g = formularioConEcheque()
    const soltar2 = lectorDemorado(g, { ...RESPUESTA, propuestos: [{ ...PROPUESTOS[0], fecha_pago: null }] })
    await g.agregarFotos([PDF], 'echeque')
    await esperar()
    soltar2()
    await esperar()
    chk('sin elegir nada y sin fecha de pago en el comprobante: a la vista', g.estado.form.echecks[0]?.tipo === 'comun')
  })

  // ══ 4. UNA TARJETA A MANO CON DATOS NO SE MEZCLA CON EL COMPROBANTE ═══════
  await bloque('bloque 6', async () => {
    const S = formularioConEcheque()
    const f = S.estado.form
    S.agregarEcheck()
    const manual = f.echecks[0]
    S.actualizarEcheck(manual.id, 'banco_codigo', '007')
    const soltar = lectorDemorado(S, RESPUESTA)
    await S.agregarFotos([PDF], 'echeque')
    await esperar()
    soltar()
    await esperar()
    chk('una tarjeta a mano con datos no se adopta: el comprobante va en otra', f.echecks.length === 2 && manual.foto_id === null && manual.banco_codigo === '007' && manual.numero === '', JSON.stringify(f.echecks))
    chk('…y la otra se completa con lo leído', f.echecks[1]?.banco_codigo === '285' && f.echecks[1]?.foto_id === f.fotos[0].id)
  })

  // ══ 5. DOS PDF SEGUIDOS CON UNA TARJETA VACÍA ══════════════════════════════
  await bloque('bloque 7', async () => {
    const S = formularioConEcheque()
    const f = S.estado.form
    S.agregarEcheck()
    const soltar = lectorDemorado(S, RESPUESTA)
    await S.agregarFotos([PDF, { ...PDF, name: 'otro.pdf' }], 'echeque')
    await esperar()
    chk('dos PDF: el primero usa la tarjeta vacía y el segundo trae la suya', f.echecks.length === 2 && f.echecks[0].foto_id === f.fotos[0]?.id && f.echecks[1].foto_id === f.fotos[1]?.id, JSON.stringify(f.echecks.map(e => e.foto_id)))
    soltar()
    await esperar()
    chk('dos PDF: cada uno completó la suya (no hay una tercera)', f.echecks.length === 2 && f.echecks.every(e => e.numero === '78013718'))
  })

  // ══ 6. DOS E-CHEQUES EN UN MISMO PDF ═══════════════════════════════════════
  await bloque('bloque 8', async () => {
    const S = formularioConEcheque()
    const f = S.estado.form
    const segundo = { ...PROPUESTOS[0], numero: '78013719', importe: 1000, fecha_emision: '2026-10-05' }
    const soltar = lectorDemorado(S, { ...RESPUESTA, propuestos: [PROPUESTOS[0], segundo] })
    await S.agregarFotos([PDF], 'echeque')
    await esperar()
    soltar()
    await esperar()
    chk('dos e-cheques en un PDF: el primero completa la tarjeta y el segundo trae otra con el mismo comprobante',
      f.echecks.length === 2 && f.echecks[0].numero === '78013718' && f.echecks[1].numero === '78013719' && f.echecks.every(e => e.foto_id === f.fotos[0].id), JSON.stringify(f.echecks))
    chk('el que trae fecha de emisión la usa, sin leyenda', f.echecks[1]?.fecha_emision === '2026-10-05' && !leyendaVisible(S.htmlEcheckForm(f.echecks[1], 1, true)))
  })

  // ══ 7. EL LECTOR FALLA O NO ENCUENTRA NADA: LA MISMA TARJETA ═══════════════
  await bloque('bloque 9', async () => {
    const S = formularioConEcheque()
    const f = S.estado.form
    S.__setInvoke(async () => ({ data: null, error: Object.assign(new Error('Function failed'), { context: { json: async () => ({ mensaje: 'se cayó' }) } }) }))
    await S.agregarFotos([PDF], 'echeque')
    await esperar()
    chk('lector caído: queda UNA tarjeta, con el comprobante, para cargar a mano', f.echecks.length === 1 && f.echecks[0].foto_id === f.fotos[0].id && f.echecks[0].banco_codigo === '', JSON.stringify(f.echecks))
    chk('lector caído: se avisa', /El lector no pudo leer el comprobante/.test(f.fotos[0].error ?? ''))
    chk('lector caído: la tarjeta no queda diciendo "Leyendo"', !/Leyendo el comprobante/.test(S.htmlEcheckForm(f.echecks[0], 0, true)))
    const B = formularioConEcheque()
    B.agregarEcheck()
    B.__setInvoke(async () => ({ data: { ok: false, modelo: 'm', crudo: {}, propuestos: [], mensaje: 'No se encontraron datos en el comprobante. Cargalo a mano.' }, error: null }))
    await B.agregarFotos([PDF], 'echeque')
    await esperar()
    chk('nada leído (con tarjeta abierta): sigue UNA tarjeta, con el comprobante', B.estado.form.echecks.length === 1 && B.estado.form.echecks[0].foto_id === B.estado.form.fotos[0].id)
  })

  // ══ 8. LA QUITARON MIENTRAS LEÍA: EL COMPROBANTE NO SE PIERDE ══════════════
  await bloque('bloque 10', async () => {
    const S = formularioConEcheque()
    const f = S.estado.form
    const soltar = lectorDemorado(S, RESPUESTA)
    await S.agregarFotos([PDF], 'echeque')
    await esperar()
    if (f.echecks[0]) S.quitarEcheck(f.echecks[0].id)
    soltar()
    await esperar()
    chk('quitada mientras leía: lo leído vuelve como tarjeta nueva con su comprobante', f.echecks.length === 1 && f.echecks[0].banco_codigo === '285' && f.echecks[0].foto_id === f.fotos[0].id)
  })

  // ══ 9. EL FOCO NO SE PIERDE AL COMPLETARSE LA TARJETA ══════════════════════
  await bloque('bloque 11', async () => {
    const S = formularioConEcheque()
    const f = S.estado.form
    S.agregarEcheck()
    const id = f.echecks[0].id
    // La tarjeta que dibuja el repintado: un campo por cada dato.
    const campos = ['banco_codigo', 'numero', 'emisor', 'cuit_emisor', 'fecha_emision', 'fecha_pago', 'importe']
      .map(c => S.nuevoEl('campo-' + c, { echeckId: id, echeckCampo: c }))
    S.__porSelector['[data-echeck-campo]'] = campos
    S.__doc.activeElement = S.nuevoEl('viejo-emisor', { echeckId: id, echeckCampo: 'emisor' })
    S.__foco.length = 0
    S.pintarFormasNuevas()
    chk('repintar las tarjetas devuelve el foco al campo donde se estaba escribiendo', S.__foco.includes('campo-emisor'), JSON.stringify(S.__foco))
    S.__doc.activeElement = null
    S.__foco.length = 0
    S.pintarFormasNuevas()
    chk('sin un campo con el foco, repintar no le da el foco a nada', S.__foco.length === 0)
  })

  // ══ 10. LAS TRES FORMAS DE ELEGIR EL ARCHIVO LLEVAN AL MISMO CAMINO ════════
  chk('fuente: cámara, galería y archivo de comprobantes van a agregarFotos con el tipo elegido',
    /\['cob-file-comprobante-camara', 'cob-file-comprobante-galeria', 'cob-file-comprobante-archivo'\]\.forEach/.test(FUENTE) &&
    /if \(archivos\.length && TIPOS_COMPROBANTE\.includes\(tipo\)\) await agregarFotos\(archivos, tipo\)/.test(FUENTE))

  for (const f of fallas) console.log('  ✗ ' + f)
  const total = ok + fallas.length
  console.log(`${ok}/${total} ${fallas.length ? 'ROJO' : 'verde'}`)
  process.exit(fallas.length ? 1 : 0)
}

pruebas().catch(e => { console.log('EXCEPCIÓN: ' + (e && e.stack || e)); console.log('ROJO'); process.exit(1) })
