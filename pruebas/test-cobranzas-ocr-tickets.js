// Comprobantes de Cobranzas con la v2 del lector (27/10/2026), en
// modulos/cobranzas.html:
//  - DEPÓSITO EN EFECTIVO: si el lector dice medio = 'deposito_efectivo', la
//    tarjeta dice "Depósito en efectivo", sin ordenante obligatorio; viaja en
//    cobranza_transferencias.medio y vuelve de ahí (una fila vieja con la nota
//    en banco_origen se separa: respaldo); el detalle lo dice;
//  - el CBU del comprobante PRESELECCIONA la cuenta propia si coincide con UNA
//    de las que se pueden elegir (la persona la cambia);
//  - lo crudo del lector se archiva también cuando la lectura falla;
//  - varios comprobantes de una vez: uno por uno contra el lector, cada uno
//    con su propuesta; los que esperan dicen "en espera";
//  - quien pagó puede no ser el cliente: no bloquea ni elige el cliente.
// Se EJECUTAN las funciones reales del módulo, con un DOM falso.
//
//   node pruebas/test-cobranzas-ocr-tickets.js
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
  var crypto = { randomUUID: (() => { let n = 0; return () => '00000000-0000-4000-8000-' + String(++n).padStart(12, '0') })() }
  var window = { open(){} }
  function setImmediate(f){ return Promise.resolve().then(f) }

  var __rpcs = []
  var __rpcImpl = async () => ({ data: { id: 'x', ya_existia: false }, error: null })
  var __invocaciones = []
  var __invokeImpl = async () => ({ data: null, error: new Error('sin lector') })
  var supabase = {
    from: () => { const q = {}; for (const op of ['select','eq','in','order','range','like','gte','lte','or','maybeSingle']) q[op] = () => q; q.then = (r) => Promise.resolve({ data: [], error: null }).then(r); return q },
    rpc: (n, p) => { __rpcs.push({ nombre: n, params: p }); return __rpcImpl(n, p) },
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
  function hoyArgentina(){ return '2026-10-27' }
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
const DOLCE = { id: 'u-dolce', nombre: 'Dolce Pasta', activo: true, prefijo: 'D', logo_url: null }
const CBU_PAZ = '2850324830094103159311'
const CUENTAS = [
  { id: 'cta-paz', nombre: 'Macro Paz Mirta', unidad_negocio_id: 'u-nuss', cbu: CBU_PAZ },
  { id: 'cta-nacion', nombre: 'Nación Paz Mirta', unidad_negocio_id: 'u-nuss', cbu: '0110000000000000005242' },
  { id: 'cta-sin-cbu', nombre: 'Macro Seis Destinos', unidad_negocio_id: 'u-nuss', cbu: null },
  { id: 'cta-dolce', nombre: 'Macro Dolce', unidad_negocio_id: 'u-dolce', cbu: '2850000000000000000291' },
]
const ADMIN = ['cargar', 'ver_todo', 'procesar']

function sandbox({ cuentas = CUENTAS } = {}) {
  const S = construirCon(ARCHIVO, {
    preludio: PRELUDIO, funciones: FUNCIONES, constantes: CONSTANTES,
    retorno: `estado, __els, __llamadas, __porSelector,
      __rpcs(){ return __rpcs }, __setRpc(f){ __rpcImpl = f },
      __invocaciones(){ return __invocaciones }, __setInvoke(f){ __invokeImpl = f }`,
  })
  S.estado.misTareas = new Set(ADMIN.map(t => 'cobranzas:' + t))
  S.estado.unidades = [NUSS, DOLCE]
  S.estado.cuentasBancoLista = cuentas
  S.estado.cuentasBanco = new Map(cuentas.map(c => [c.id, c]))
  S.__setRpc(async (n, p) => n === 'buscar_clientes'
    ? { data: [{ cliente_id: 'c-richard', nombre: 'RICHARD', unidad_negocio_id: p.p_unidad_negocio_id, activo: true, saldo: 0 }], error: null }
    : { data: { id: 'x', ya_existia: false, asentada: true }, error: null })
  S.abrirFormularioNuevo()
  S.estado.form.unidad_id = 'u-nuss'
  return S
}
const el = (S, id) => S.__els.get(id) ?? { hidden: undefined, innerHTML: '', textContent: '' }
const esperar = async (n = 10) => { for (let i = 0; i < n; i++) await new Promise(r => setImmediate(r)) }
const leido = (propuestos, extra = {}) => async () => ({ data: { ok: true, modelo: 'm', crudo: { comprobantes: propuestos }, propuestos, ...extra }, error: null })
const archivo = (nombre = 'a.jpg') => ({ type: 'image/jpeg', size: 1024, name: nombre })

// El ticket de Macro: "DEPÓSITO EFECTIVO EN CUENTA", sin ordenante.
const TICKET = { medio: 'deposito_efectivo', importe: 500000, fecha: '2026-10-27', banco_origen: 'Banco Macro', ordenante: null,
  cuit_ordenante: null, referencia: '4471', destinatario: 'PAZ MIRTA', cbu_destino: CBU_PAZ, notas: null }
// La captura de BNA+ de un tercero (no el cliente) a PAZ MIRTA.
const BNA = { medio: 'transferencia', importe: 813174.25, fecha: '2026-10-27', banco_origen: 'BNA+', ordenante: 'FERNANDEZ RICARDO',
  cuit_ordenante: '20111111112', referencia: '000987', destinatario: 'PAZ MIRTA', cbu_destino: CBU_PAZ, notas: null }

async function pruebas() {
  // ══ 1. DEPÓSITO EN EFECTIVO ═══════════════════════════════════════════════
  {
    const S = sandbox()
    const f = S.estado.form
    S.__setInvoke(leido([TICKET]))
    await S.agregarFotos([archivo('ticket.jpg')], 'transferencia')
    await esperar()
    const t = f.transferencias[0]
    chk('depósito: la propuesta queda con medio "deposito_efectivo"', t && t.medio === 'deposito_efectivo', JSON.stringify(t))
    const h = S.htmlTransferenciaForm(t, 0, true)
    chk('depósito: la tarjeta dice "Depósito en efectivo" en el título', /Depósito en efectivo 1<\/div>/.test(h), h.slice(0, 600))
    chk('depósito: el botón "Depósito en efectivo" aparece elegido', /cob-chip cob-chip--activo" data-transf-medio="deposito_efectivo"/.test(h) && /cob-chip " data-transf-medio="transferencia"/.test(h))
    chk('depósito: "Quién depositó (opcional)" y "Banco donde se depositó"', /Quién depositó \(opcional\)/.test(h) && /Banco donde se depositó/.test(h) && /CUIT de quien depositó \(opcional\)/.test(h))
    chk('depósito: sin ordenante NO hay error', S.erroresDeTransferencia(Object.assign({}, t, { tocado: true })).length === 0, JSON.stringify(S.erroresDeTransferencia(t)))
    const b = S.transferenciaParaBase(t)
    chk('depósito para la base: medio "deposito_efectivo" y el banco tal cual (sin nota)', b.medio === 'deposito_efectivo' && b.banco_origen === 'Banco Macro' && b.ordenante === null, JSON.stringify(b))
    chk('depósito sin tocar: "ocr"', b.origen_datos === 'ocr', b.origen_datos)
    chk('depósito: el medio leído queda en ocr_propuesto', b.ocr_propuesto?.medio === 'deposito_efectivo')
    chk('una transferencia viaja con medio "transferencia"', S.transferenciaParaBase(Object.assign(S.transferenciaVacia(), { banco_origen: 'BNA+' })).medio === 'transferencia' &&
      S.transferenciaParaBase(Object.assign(S.transferenciaVacia(), { medio: undefined })).medio === 'transferencia')
    chk('el banco del depósito tiene sus 80 letras', /data-transf-campo="banco_origen"/.test(h) && !/maxlength="57"/.test(h) && /maxlength="80" autocomplete="off" list="cob-bancos-origen"/.test(h))
    // Vuelve de la base: manda la columna medio.
    const fila = { id: 'tb', cuenta_id: 'cta-paz', importe: 500000, fecha: '2026-10-27', banco_origen: 'Banco Macro', medio: 'deposito_efectivo',
      ordenante: null, cuit_ordenante: null, referencia: '4471', foto_id: b.foto_id, ocr_propuesto: b.ocr_propuesto, origen_datos: 'ocr' }
    const vuelta = S.transferenciaDesdeBase(fila, S.estado.cuentasBanco)
    chk('de la base: la columna medio', vuelta.medio === 'deposito_efectivo' && vuelta.banco_origen === 'Banco Macro', JSON.stringify(vuelta))
    chk('de la base y vuelta: lo mismo, y sigue "ocr"', JSON.stringify(S.transferenciaParaBase(vuelta)) === JSON.stringify(b), JSON.stringify(S.transferenciaParaBase(vuelta)))
    chk('de la base: medio "transferencia" o sin medio → transferencia', S.transferenciaDesdeBase({ ...fila, medio: 'transferencia' }).medio === 'transferencia' &&
      S.transferenciaDesdeBase({ ...fila, medio: undefined }).medio === 'transferencia')
    // Respaldo: una fila vieja con la nota en banco_origen (el 27/10 no había ninguna).
    const vieja = S.transferenciaDesdeBase({ ...fila, medio: 'transferencia', banco_origen: 'Depósito en efectivo · Banco Macro' })
    chk('respaldo: la nota vieja se separa y es depósito', vieja.medio === 'deposito_efectivo' && vieja.banco_origen === 'Banco Macro', JSON.stringify(vieja))
    chk('respaldo: guardada de nuevo, sin la nota y con la columna', S.transferenciaParaBase(vieja).banco_origen === 'Banco Macro' && S.transferenciaParaBase(vieja).medio === 'deposito_efectivo')
    chk('respaldo: un banco que no empieza con la nota es transferencia', S.separarNotaDeposito('Depósito en efectivos SA').medio === 'transferencia' &&
      S.separarNotaDeposito(null).medio === 'transferencia' && S.separarNotaDeposito('Depósito en efectivo').banco_origen === '')
    chk('fuente: los dos select de cobranza_transferencias traen medio',
      (FUENTE.match(/from\('cobranza_transferencias'\)\.select\('id, cuenta_id, [^']*\bmedio'\)/g) || []).length === 2)
    // La cobranza ya guardada (el detalle).
    const det = S.htmlTransferenciaDetalle(fila, S.estado.cuentasBanco)
    chk('detalle: el depósito dice "Depósito en efectivo"', /<div class="cob-cheque__titulo">Depósito en efectivo<\/div>/.test(det) && /Desde Banco Macro/.test(det), det)
    chk('detalle: una transferencia no lo dice', !/Depósito en efectivo/.test(S.htmlTransferenciaDetalle({ ...fila, medio: 'transferencia' }, S.estado.cuentasBanco)))
    // Cambiar el medio a mano.
    S.alTocarEnFormas({ target: { closest: () => ({ dataset: { transfMedio: 'transferencia', transfId: t.id } }) } })
    chk('tocar "Transferencia" cambia el medio', t.medio === 'transferencia')
    chk('cambiar el medio leído: "ocr_corregido"', S.transferenciaParaBase(t).origen_datos === 'ocr_corregido' && S.transferenciaParaBase(t).medio === 'transferencia')
    chk('cambiar el medio repinta la tarjeta', /Transferencia 1<\/div>/.test(el(S, 'cob-lista-transferencias').innerHTML))
    S.actualizarTransferencia(t.id, 'medio', 'cheque')
    chk('un medio que no existe no se acepta', t.medio === 'transferencia')
    S.actualizarTransferencia(t.id, 'medio', 'deposito_efectivo')
    chk('volver al medio leído: "ocr" otra vez', S.transferenciaParaBase(t).origen_datos === 'ocr')
    // A mano.
    const m = S.transferenciaVacia('2026-10-27')
    chk('a mano: arranca como transferencia', m.medio === 'transferencia' && /Transferencia 1<\/div>/.test(S.htmlTransferenciaForm(m, 0, true)))
    chk('una propuesta vieja sin medio es transferencia y queda "ocr"', (() => {
      const v = S.transferenciaDesdeOcr({ importe: 10, fecha: '2026-10-27', banco_origen: 'Galicia', ordenante: null, cuit_ordenante: null, referencia: null }, null, '2026-10-27')
      v.cuenta_id = 'cta-paz'
      return v.medio === 'transferencia' && S.transferenciaParaBase(v).origen_datos === 'ocr'
    })())
    chk('de solo lectura: "Desde Depósito en efectivo · Banco Macro"', /Desde Depósito en efectivo · Banco Macro/.test(S.htmlTransferenciaForm(t, 0, false)))
  }

  // ══ 2. EL CBU PRESELECCIONA LA CUENTA ══════════════════════════════════════
  {
    const S = sandbox()
    const f = S.estado.form
    S.__setInvoke(leido([BNA]))
    await S.agregarFotos([archivo('bna.jpg')], 'transferencia')
    await esperar()
    const t = f.transferencias[0]
    chk('CBU que coincide: la cuenta viene elegida', t.cuenta_id === 'cta-paz' && t.cuenta_nombre === 'Macro Paz Mirta', JSON.stringify(t))
    const h = S.htmlTransferenciaForm(t, 0, true)
    chk('…y el select la muestra elegida', /<option value="cta-paz" selected>/.test(h))
    chk('…con el aviso "Elegida por el CBU del comprobante"', /data-transf-aviso-cbu="[^"]+">Elegida por el CBU del comprobante: cambiala si no es\./.test(h))
    chk('elegida por el CBU no cuenta como corrección: "ocr"', S.transferenciaParaBase(t).origen_datos === 'ocr' && S.transferenciaParaBase(t).cuenta_id === 'cta-paz')
    S.actualizarTransferencia(t.id, 'cuenta_id', 'cta-nacion')
    chk('la persona la cambia: queda la suya y se va el aviso', t.cuenta_id === 'cta-nacion' && t.cuentaPorCbu === false &&
      /data-transf-aviso-cbu="[^"]+" hidden>Elegida por el CBU/.test(S.htmlTransferenciaForm(t, 0, true)))
    chk('cambiarla tampoco es corrección', S.transferenciaParaBase(t).origen_datos === 'ocr')
    chk('CBU con espacios: igual coincide', S.cuentaPorCbu('2850 3248 3009 4103 1593 11')?.id === 'cta-paz')
    chk('CBU que no es de ninguna cuenta: nada', S.cuentaPorCbu('9999999999999999999999') === null)
    chk('CBU sin los 22 números: nada', S.cuentaPorCbu('285032483009410315931') === null && S.cuentaPorCbu(null) === null && S.cuentaPorCbu('') === null)
    chk('una cuenta sin CBU no coincide con nada', S.cuentaPorCbu('0000000000000000000000') === null)
    chk('sin cbu_destino: la cuenta se elige', S.transferenciaDesdeOcr({ importe: 5 }, null, '2026-10-27').cuenta_id === '')
    // La cuenta de OTRA empresa no se preselecciona.
    chk('el CBU de una cuenta de otra empresa: nada', S.cuentaPorCbu('2850000000000000000291') === null)
    f.unidad_id = null
    chk('sin empresa elegida: nada (no hay cuentas para elegir)', S.cuentaPorCbu(CBU_PAZ) === null)
    const D = sandbox({ cuentas: [...CUENTAS, { id: 'cta-paz-2', nombre: 'Macro Paz Mirta (otra)', unidad_negocio_id: 'u-nuss', cbu: CBU_PAZ }] })
    chk('dos cuentas con el mismo CBU: no adivina', D.cuentaPorCbu(CBU_PAZ) === null)
    chk('fuente: las cuentas se leen con su cbu', /from\('cuentas_caja'\)\.select\('id, nombre, medio, moneda, unidad_negocio_id, empleado_id, activa, cbu'\)/.test(FUENTE))
  }

  // ══ 3. LO CRUDO SE ARCHIVA TAMBIÉN SI LA LECTURA FALLA ═════════════════════
  {
    const S = sandbox()
    const f = S.estado.form
    S.__setInvoke(async () => ({ data: { ok: false, modelo: 'm-v2', crudo: { comprobantes: [{ medio: 'transferencia' }] }, propuestos: [], mensaje: 'No se encontraron datos en el comprobante. Cargalo a mano.' }, error: null }))
    await S.agregarFotos([archivo()], 'transferencia')
    await esperar()
    const foto = f.fotos[0]
    chk('ok:false con crudo: se archiva lo crudo y el modelo', foto.ocr_crudo?.comprobantes?.[0]?.medio === 'transferencia' && foto.ocr_modelo === 'm-v2', JSON.stringify(foto.ocr_crudo))
    chk('ok:false: queda la tarjeta vacía con el comprobante y el aviso', f.transferencias.length === 1 && f.transferencias[0].foto_id === foto.id && /No se encontraron datos/.test(foto.error ?? ''))
    chk('ok:false: "Cargalo a mano" no se repite', foto.error === 'No se encontraron datos en el comprobante. Cargalo a mano: el comprobante queda adjunto.', foto.error)
    f.transferencias[0].cuenta_id = 'cta-paz'; f.transferencias[0].importe = '100,00'
    f.cliente_id = 'c-richard'; f.cliente = 'RICHARD'
    await S.subirCobranza(f)
    const ll = S.__rpcs().find(x => x.nombre === 'cargar_cobranza_asentada')
    chk('ok:false: lo crudo viaja a cobranza_fotos.ocr_crudo', ll?.params.p_fotos?.[0]?.ocr_crudo?.comprobantes?.length === 1 && ll.params.p_fotos[0].ocr_modelo === 'm-v2', JSON.stringify(ll?.params.p_fotos))

    const E = sandbox()
    E.__setInvoke(async () => ({ data: null, error: Object.assign(new Error('Edge Function returned a non-2xx status code'), {
      context: { json: async () => ({ ok: false, modelo: 'm-err', crudo: { comprobantes: [] }, mensaje: 'El servicio de lectura devolvió un error' }) } }) }))
    await E.agregarFotos([archivo()], 'transferencia')
    await esperar()
    const fe = E.estado.form.fotos[0]
    chk('error con cuerpo: el mensaje del lector en el aviso', /El lector no pudo leer el comprobante \(El servicio de lectura devolvió un error\)/.test(fe.error ?? ''), fe.error)
    chk('error con cuerpo que trae crudo: se archiva', fe.ocr_crudo && Array.isArray(fe.ocr_crudo.comprobantes) && fe.ocr_modelo === 'm-err', JSON.stringify(fe))
    const N = sandbox()
    N.__setInvoke(async () => ({ data: null, error: new Error('Function not found') }))
    await N.agregarFotos([archivo()], 'transferencia')
    await esperar()
    chk('error sin cuerpo: crudo null y el mensaje del error', N.estado.form.fotos[0].ocr_crudo === null && /Function not found/.test(N.estado.form.fotos[0].error ?? ''))
  }

  // ══ 4. VARIOS COMPROBANTES DE UNA VEZ: DE A UNO CONTRA EL LECTOR ═══════════
  {
    const S = sandbox()
    const f = S.estado.form
    const pendientes = []
    S.__setInvoke(() => new Promise(r => pendientes.push(r)))
    await S.agregarFotos([archivo('1.jpg'), archivo('2.jpg'), archivo('3.jpg')], 'transferencia')
    await esperar()
    chk('tres elegidos de una vez: tres comprobantes subidos', f.fotos.length === 3 && f.fotos.every(x => x.subida))
    chk('el lector recibe UNO por vez', S.__invocaciones().length === 1 && S.__invocaciones()[0].body.storage_path === f.fotos[0].storage_path, S.__invocaciones().length)
    chk('los otros dicen "en espera"', f.fotos[1].fase === 'en_espera' && f.fotos[2].fase === 'en_espera' && f.fotos[0].fase === 'leyendo')
    chk('el aviso de espera se pinta en la sección', /Comprobante 2: en espera: se lee cuando termine el anterior\./.test(el(S, 'cob-comprobantes-transferencia').innerHTML))
    pendientes[0]({ data: { ok: true, modelo: 'm', crudo: {}, propuestos: [TICKET] }, error: null })
    await esperar()
    chk('termina el primero: su propuesta y recién ahí va el segundo', f.transferencias.length === 1 && S.__invocaciones().length === 2 &&
      S.__invocaciones()[1].body.storage_path === f.fotos[1].storage_path && f.fotos[1].fase === 'leyendo')
    pendientes[1]({ data: null, error: new Error('Function not found') })
    await esperar()
    chk('una falla en el medio no traba la fila: va el tercero', S.__invocaciones().length === 3 && f.transferencias.length === 2)
    pendientes[2]({ data: { ok: true, modelo: 'm', crudo: {}, propuestos: [BNA, { ...BNA, importe: 100, referencia: '2' }] }, error: null })
    await esperar()
    chk('cada comprobante con su propuesta y su comprobante', f.transferencias.length === 4 &&
      f.transferencias[0].foto_id === f.fotos[0].id && f.transferencias[1].foto_id === f.fotos[1].id &&
      f.transferencias[2].foto_id === f.fotos[2].id && f.transferencias[3].foto_id === f.fotos[2].id, JSON.stringify(f.transferencias.map(t => t.foto_id)))
    chk('la fila queda libre al terminar', S.estado.lecturasComprobantes === 0)
    chk('cada uno fue al lector UNA sola vez', new Set(S.__invocaciones().map(i => i.body.storage_path)).size === 3 && S.__invocaciones().length === 3)
    chk('el HTML ofrece varios en Galería y Archivo (no en la cámara)', /id="cob-file-comprobante-galeria" accept="image\/\*" multiple/.test(FUENTE) &&
      /id="cob-file-comprobante-archivo" accept="[^"]*application\/pdf" multiple/.test(FUENTE) && !/id="cob-file-comprobante-camara"[^>]*multiple/.test(FUENTE))
    chk('la ayuda lo dice', /En Galería y Archivo podés elegir varios de una vez/.test(FUENTE))
    // Un comprobante solo no espera.
    const U = sandbox()
    U.__setInvoke(leido([BNA]))
    await U.agregarFotos([archivo()], 'transferencia')
    await esperar()
    chk('uno solo: va directo y nunca dice "en espera"', U.__invocaciones().length === 1 && U.estado.form.transferencias.length === 1 && U.estado.lecturasComprobantes === 0)
  }

  // ══ 5. QUIEN PAGÓ NO ES EL CLIENTE ═════════════════════════════════════════
  {
    const S = sandbox()
    const f = S.estado.form
    S.__setInvoke(leido([BNA]))
    await S.agregarFotos([archivo()], 'transferencia')
    await esperar()
    chk('el ordenante NO elige el cliente', f.cliente_id == null || f.cliente_id === '' , f.cliente_id)
    f.cliente_id = 'c-richard'; f.cliente = 'RICHARD'
    const t = f.transferencias[0]
    chk('ordenante distinto del cliente: sin errores', S.erroresDeTransferencia(t).length === 0)
    chk('…y no frena el guardado', !S.motivosParaNoGuardar().some(m => /ordenante|quién transfirió|cliente/i.test(m)), JSON.stringify(S.motivosParaNoGuardar()))
    const r = await S.subirCobranza(f)
    const ll = S.__rpcs().find(x => x.nombre === 'cargar_cobranza_asentada')
    chk('…se guarda con el cliente elegido y el ordenante leído', r.ok && ll?.params.p_cliente_id === 'c-richard' && ll.params.p_transferencias[0].ordenante === 'FERNANDEZ RICARDO', JSON.stringify(ll?.params))
    chk('fuente: el ordenante nunca se compara con el cliente', !/ordenante[^\n]*cliente|cliente[^\n]*\.ordenante/.test(FUENTE.replace(/\/\/[^\n]*/g, '')))
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
