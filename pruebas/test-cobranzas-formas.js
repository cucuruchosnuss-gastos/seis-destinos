// Cobranzas con TODAS las formas de pago — modulos/cobranzas.html (30/09/2026).
//
// Pedido de Facu: además del efectivo y los cheques de papel con foto, una
// cobranza puede traer E-CHEQUES (sin papel, sin foto) y TRANSFERENCIAS a una
// cuenta de banco de la Empresa. Las carga Administración (cobranzas:procesar);
// el chofer (solo cobranzas:cargar) ve su formulario de siempre.
//
// Se EJECUTAN las funciones reales con un DOM y un supabase falsos. Lo que se
// afirma:
//  - EL CHOFER: sin la sección ni el resumen; guarda con guardar_cobranza /
//    editar_cobranza con los 8 parámetros de siempre (sin p_transferencias);
//    al editar una cobranza que ya trae un e-cheque, el e-cheque VIAJA en
//    p_cheques (editar_cobranza reemplaza todos los cheques: si no, se
//    borraría) y se ve sin poder tocarlo;
//  - ADMINISTRACIÓN: agrega e-cheques y transferencias, los valida igual que
//    la base (banco 3 dígitos, número 8, fechas, importe > 0, cuenta), y
//    guarda con guardar_cobranza_completa y la lista ENTERA de transferencias
//    (también vacía si se sacó la última); un e-cheque viaja sin foto, sin
//    chequera y con origen 'manual'; los identificadores conservan los ceros;
//  - el HUECO de la base: una cobranza solo con transferencias no se deja
//    guardar (la base la rechaza) y se dice por qué;
//  - si las transferencias de una cobranza no se pudieron leer,
//    Administración no puede guardarla (las borraría);
//  - las cuentas de banco: de la Empresa, en pesos, sin la fábrica de
//    pruebas y de la unidad de la barra (conservando la ya elegida);
//  - el detalle: e-cheques sin "Ver la foto", las transferencias con su cuenta,
//    y el total SUMA las transferencias (v_cobranzas no lo hace); un total
//    ausente sigue siendo "—";
//  - todo texto de la base va escapado (marcas en cada campo);
//  - el celeste de las etiquetas llega a AA (se recalcula con los hex de
//    css/main.css).
//
// Archivo bajo prueba: ARCHIVO_TEST, o modulos/cobranzas.html.

const fs = require('fs')
const path = require('path')
const { construirCon } = require('./sandbox')
const { fuenteNumeros } = require('./numeros-comun')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/cobranzas.html')
const FUENTE = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${FUENTE.length} bytes)`)
const CSS = fs.readFileSync(path.join(RAIZ, 'css/main.css'), 'utf8')

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
      id, innerHTML: '', textContent: '', value: '', className: '', hidden: false,
      disabled: false, dataset: {}, src: '',
      querySelectorAll: () => [], querySelector: () => null,
      addEventListener(){}, focus(){}, classList: { add(){}, remove(){}, toggle(){} },
    }
  }
  var __els = new Map()
  var document = {
    getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) },
    querySelectorAll: () => [], querySelector: () => null,
  }
  var navigator = { onLine: true }
  var crypto = { randomUUID: (() => { let n = 0; return () => '00000000-0000-4000-8000-' + String(++n).padStart(12, '0') })() }

  // --- supabase falso: tablas y rpc controladas desde la prueba -------------
  var __rpcs = []
  var __rpcImpl = async () => ({ data: { id: 'x', ya_existia: false }, error: null })
  var __tablas = {}
  var __consultas = []
  function __consulta(tabla) {
    const filtros = []
    const q = {}
    for (const op of ['select', 'eq', 'in', 'order', 'range', 'like', 'gte', 'lte', 'or']) {
      q[op] = (...a) => { filtros.push([op, ...a]); return q }
    }
    q.maybeSingle = () => { filtros.push(['maybeSingle']); return q }
    q.then = (res, rej) => {
      __consultas.push({ tabla, filtros })
      const r = typeof __tablas[tabla] === 'function' ? __tablas[tabla](filtros) : (__tablas[tabla] ?? { data: [], error: null })
      return Promise.resolve(r).then(res, rej)
    }
    return q
  }
  var supabase = {
    from: (t) => __consulta(t),
    rpc: (n, p) => { __rpcs.push({ nombre: n, params: p }); return __rpcImpl(n, p) },
    storage: { from: () => ({ upload: async () => ({ error: null }) }) },
  }

  // --- lo que estas funciones llaman y acá no importa -------------------------
  var __llamadas = { exitos: [], errores: [], vistas: [] }
  function mostrarExito(m){ __llamadas.exitos.push(m) } function mostrarError(m){ __llamadas.errores.push(m) }
  function mostrarVistaCob(v){ __llamadas.vistas.push(v) }
  function guardarBorrador(){}
  function pintarEstadoFotos(){} function pintarCheques(){} function iniciarReintentosFotos(){}
  function escribirImporteEnCampo(){}
  var turnoListado = 0
  var __repintadas = 0
  function renderizarListado(){ __repintadas++ }
  function hoyArgentina(){ return '2026-09-30' }
  async function urlDeFoto(){ return null }
  var promesaFabrica = null
  function asegurarFabrica() { return Promise.resolve(estado.fabrica) }

  var estado = {
    sesion: { user: { id: 'uid' } },
    miEmpleadoId: 'emp-chofer', miRolApp: 'usuario',
    misTareas: new Set(['cobranzas:cargar']),
    bancos: new Map([['007', 'Galicia']]), unidades: [], form: null, detalle: null,
    unidadElegida: null, fabrica: FABRICA_SIN_DATOS,
  }
`

const FUNCIONES = [
  'escCob', 'formatearImporte', 'esFechaIso', 'diasEntre', 'formatearFechaCob', 'nombreBanco', 'nombreBancoDe',
  'tieneTarea', 'textoOpcional', 'chequeParaBase', 'origenDatosDe', 'chequeDesdeBase', 'chequeVacio', 'renglonComoImpreso',
  'formularioVacio', 'pintarFormulario', 'pintarBotonChequeMano', 'abrirFormularioEdicion',
  'htmlEtiquetaForma', 'echequeVacio', 'echequeDesdeBase', 'erroresDeEcheque', 'echequeParaBase',
  'transferenciaVacia', 'transferenciaDesdeBase', 'erroresDeTransferencia', 'transferenciaParaBase',
  'sumaImportes', 'totalesPorForma', 'usaCobranzaCompleta', 'nombresDeCuentas', 'formasPresentes', 'htmlLineaFormas', 'cargarFormasDe', 'formasDeFila', 'sumaDeImportes',
  'totalConTransferencias', 'htmlTransferenciasDetalle', 'htmlTransferenciaDetalle', 'cuentasParaElegir',
  'nombreUnidadCob', 'htmlOpcionesCuentas', 'htmlEcheckForm', 'htmlTransferenciaForm', 'pintarFormasNuevas',
  'pintarResumenFormas', 'htmlResumenFormas', 'echeckDelForm', 'transfDelForm', 'agregarEcheck',
  'agregarTransferencia', 'quitarEcheck', 'quitarTransferencia', 'actualizarEcheck', 'actualizarTransferencia',
  'pintarErroresForma', 'alEscribirEnFormas', 'alTocarEnFormas', 'cargarCuentasBanco',
  'totalDelFormulario', 'efectivoDelFormulario', 'motivosParaNoGuardar', 'pintarTotalYGuardado',
  'subirCobranza', 'esErrorDeRed', 'htmlDetalle', 'htmlChequeDetalle', 'htmlDatosCheque', 'textoDiasHastaPago',
  'htmlAccionesDetalle', 'htmlHistorial', 'textoHistorialCheque', 'resumirCambios', 'htmlLinkChequeEnCartera',
  'textoSalidaCheque', 'normalizarCliente', 'momentoArgentina',
]
const CONSTANTES = [
  'ZONA_AR', 'ACENTOS_COB', 'SIN_ACENTOS_COB', 'DIAS_MAXIMO_DIFERIDO', 'ETIQUETA_ESTADO_COBRANZA', 'ETIQUETA_ESTADO_CHEQUE',
  'puedeCargar', 'puedeVerTodo', 'puedeProcesar', 'puedeEditarAnular', 'esPropia', 'puedeVerCartera', 'TEXTO_BOTON_CHEQUE_MANO',
]

function sandbox({ tareas = ['cargar'], rol = 'usuario' } = {}) {
  const S = construirCon(ARCHIVO, {
    preludio: PRELUDIO, funciones: FUNCIONES, constantes: CONSTANTES,
    retorno: `estado, __els, __llamadas, __rpcs(){ return __rpcs }, __setRpc(f){ __rpcImpl = f },
      __setTablas(t){ __tablas = t }, __consultas(){ return __consultas }, __repintadas(){ return __repintadas }, __turno(n){ turnoListado = n }`,
  })
  S.estado.misTareas = new Set(tareas.map(t => 'cobranzas:' + t))
  S.estado.miRolApp = rol
  return S
}
const CHOFER = { tareas: ['cargar'] }
const ADMIN = { tareas: ['cargar', 'ver_todo', 'procesar'] }

const el = (S, id) => S.__els.get(id) ?? { hidden: undefined, innerHTML: '' }
const esperar = async (n = 6) => { for (let i = 0; i < n; i++) await new Promise(r => setImmediate(r)) }

// Un formulario lleno con un cheque de papel confirmado (para guardar).
function formConCheque(S, extra = {}) {
  const f = S.formularioVacio('11111111-1111-4111-8111-111111111111')
  f.cliente = 'Don Pepe'
  f.fotos = [{ id: 'f1', storage_path: 'uid/c/f1.jpg', subida: true, leida: true }]
  const ch = S.chequeVacio('f1')
  Object.assign(ch, {
    banco_codigo: '007', sucursal_codigo: '386', codigo_postal: '3218', dv_ruta: 6,
    numero: '66259862', dv_numero: 8, cuenta: '09420314667', dv_cuenta: 0,
    tipo: 'comun', fecha_emision: '2026-09-20', importe: '1.000,00', confirmado: true,
  })
  f.cheques = [ch]
  Object.assign(f, extra)
  S.estado.form = f
  return f
}

function echequeValido(S, extra = {}) {
  return Object.assign(S.echequeVacio(), {
    banco_codigo: '007', numero: '00012345', tipo: 'diferido',
    fecha_emision: '2026-09-20', fecha_pago: '2026-10-20', importe: '2.500,50',
  }, extra)
}

const CUENTAS = [
  { id: 'cta-nuss', nombre: 'Macro Pablo U', medio: 'banco', moneda: 'ARS', unidad_negocio_id: 'u-nuss', empleado_id: 'emp-empresa', activa: true },
  { id: 'cta-dolce', nombre: 'Macro Dolce', medio: 'banco', moneda: 'ARS', unidad_negocio_id: 'u-dolce', empleado_id: 'emp-empresa', activa: true },
  { id: 'cta-usd', nombre: 'Macro USD', medio: 'banco', moneda: 'USD', unidad_negocio_id: 'u-nuss', empleado_id: 'emp-empresa', activa: true },
  { id: 'cta-persona', nombre: 'Cuenta de Pablo', medio: 'banco', moneda: 'ARS', unidad_negocio_id: 'u-nuss', empleado_id: 'emp-pablo', activa: true },
  { id: 'cta-prueba', nombre: 'Banco robot', medio: 'banco', moneda: 'ARS', unidad_negocio_id: 'u-prueba', empleado_id: 'emp-empresa', activa: true },
]

const MAL = '"><b data-xss="forma">'
const MAL_ESC = '&quot;&gt;&lt;b data-xss=&quot;forma&quot;&gt;'

async function pruebas() {
  // ══ 1. EL CHOFER ═══════════════════════════════════════════════════════════
  {
    const S = sandbox(CHOFER)
    const f = S.formularioVacio('id-1')
    chk('formulario nuevo: trae e-cheques y transferencias vacíos', Array.isArray(f.echecks) && !f.echecks.length &&
      Array.isArray(f.transferencias) && !f.transferencias.length && f.teniaTransferencias === false)
    S.estado.form = f
    S.pintarFormasNuevas()
    chk('chofer: la sección de e-cheques y transferencias queda oculta', el(S, 'cob-seccion-formas').hidden === true)
    chk('chofer: sin botones de agregar', el(S, 'cob-formas-acciones').hidden === true)
    chk('chofer: sin el resumen de las cuatro formas', el(S, 'cob-resumen-formas').hidden === true && el(S, 'cob-resumen-formas').innerHTML === '')
    S.agregarEcheck(); S.agregarTransferencia()
    chk('chofer: agregarEcheck / agregarTransferencia no hacen nada', f.echecks.length === 0 && f.transferencias.length === 0)

    formConCheque(S)
    const r = await S.subirCobranza(S.estado.form)
    const llamada = S.__rpcs()[0]
    chk('chofer: guarda con guardar_cobranza, como siempre', r.ok && llamada?.nombre === 'guardar_cobranza', JSON.stringify(llamada?.nombre))
    chk('chofer: los 8 parámetros de siempre, sin p_transferencias',
      llamada && Object.keys(llamada.params).sort().join(',') === 'p_cheques,p_cliente,p_comprobante_referencia,p_efectivo,p_fecha,p_fotos,p_id,p_observaciones',
      Object.keys(llamada?.params ?? {}).join(','))
    chk('chofer: el cheque de papel viaja como siempre (sin es_echeck)', llamada?.params.p_cheques.length === 1 && !('es_echeck' in llamada.params.p_cheques[0]))
  }
  {
    // El chofer EDITA una cobranza que Administración completó con un
    // e-cheque y una transferencia.
    const S = sandbox(CHOFER)
    const f = formConCheque(S, { modo: 'edicion', echecks: [echequeValido(S)], teniaTransferencias: true,
      transferencias: [{ id: 't1', cuenta_id: 'cta-nuss', cuenta_nombre: MAL, importe: 500, fecha: '2026-09-30', referencia: MAL }] })
    S.pintarFormasNuevas()
    chk('chofer con formas ajenas: la sección se ve', el(S, 'cob-seccion-formas').hidden === false)
    chk('chofer con formas ajenas: el aviso "Los cargó Administración" se ve', el(S, 'cob-formas-aviso').hidden === false)
    chk('chofer con formas ajenas: sin botones de agregar', el(S, 'cob-formas-acciones').hidden === true)
    const htmlE = el(S, 'cob-lista-echecks').innerHTML, htmlT = el(S, 'cob-lista-transferencias').innerHTML
    chk('chofer con formas ajenas: el e-cheque se ve sin campos ni "Quitar"', /E-cheque 1/.test(htmlE) && !/data-echeck-campo|data-quitar-echeck|<input/.test(htmlE), htmlE.slice(0, 300))
    chk('chofer con formas ajenas: la transferencia se ve sin campos ni "Quitar"', /Transferencia 1/.test(htmlT) && !/data-transf-campo|data-quitar-transf|<select|<input/.test(htmlT))
    chk('chofer con formas ajenas: la cuenta y la referencia van escapadas', htmlT.includes(MAL_ESC) && !htmlT.includes(MAL))
    chk('chofer con formas ajenas: el resumen de las cuatro formas se ve', el(S, 'cob-resumen-formas').hidden === false)
    S.quitarEcheck(f.echecks[0].id); S.actualizarEcheck(f.echecks[0].id, 'importe', '1')
    chk('chofer: no puede sacar ni cambiar un e-cheque', f.echecks.length === 1 && f.echecks[0].importe === '2.500,50')
    const r = await S.subirCobranza(f)
    const ll = S.__rpcs()[0]
    chk('chofer editando: editar_cobranza, no guardar_cobranza_completa', r.ok && ll?.nombre === 'editar_cobranza', ll?.nombre)
    chk('chofer editando: sin p_transferencias (editar_cobranza no las toca)', ll && !('p_transferencias' in ll.params))
    const eche = ll?.params.p_cheques.find(c => c.es_echeck)
    chk('chofer editando: el e-cheque VIAJA en p_cheques (si no, editar_cobranza lo borraría)', ll?.params.p_cheques.length === 2 && !!eche, JSON.stringify(ll?.params.p_cheques))
    chk('chofer editando: el total cuenta las cuatro formas', S.totalDelFormulario() === 1000 + 2500.5 + 500, S.totalDelFormulario())
  }

  // ══ 2. ADMINISTRACIÓN: agregar, validar y guardar ═══════════════════════════
  {
    const S = sandbox(ADMIN)
    const f = formConCheque(S)
    S.pintarFormasNuevas()
    chk('admin: la sección se ve con los botones de agregar', el(S, 'cob-seccion-formas').hidden === false && el(S, 'cob-formas-acciones').hidden === false)
    chk('admin: sin el aviso de "Los cargó Administración"', el(S, 'cob-formas-aviso').hidden === true)
    chk('admin: el resumen de las cuatro formas se ve aunque no haya nada', el(S, 'cob-resumen-formas').hidden === false)
    const res = el(S, 'cob-resumen-formas').innerHTML
    chk('resumen: las cuatro etiquetas y el total', /forma-pago--efectivo/.test(res) && /forma-pago--cheque/.test(res) &&
      /forma-pago--echeck/.test(res) && /forma-pago--transferencia/.test(res) && /Total de la cobranza/.test(res), res.slice(0, 300))

    S.agregarEcheck()
    chk('admin: agregarEcheck suma un e-cheque vacío', f.echecks.length === 1 && f.echecks[0].banco_codigo === '' && f.echecks[0].tipo === 'diferido')
    const motivos = S.motivosParaNoGuardar()
    chk('admin: un e-cheque vacío no deja guardar y dice qué falta', motivos.some(m => /^E-cheque 1: El código del banco/.test(m)) &&
      motivos.some(m => /^E-cheque 1: El número del e-cheque/.test(m)) && motivos.some(m => /^E-cheque 1: El importe/.test(m)), motivos.join(' | '))
    const htmlVacio = el(S, 'cob-lista-echecks').innerHTML
    chk('admin: la tarjeta recién agregada no muestra errores hasta tocarla', /data-echeck-errores="[^"]*" hidden/.test(htmlVacio))
    chk('admin: la tarjeta tiene banco, número, tipo, fechas e importe', ['banco_codigo', 'numero', 'fecha_emision', 'fecha_pago', 'importe']
      .every(c => htmlVacio.includes(`data-echeck-campo="${c}"`)) && /data-echeck-tipo="comun"/.test(htmlVacio) && /data-echeck-tipo="diferido"/.test(htmlVacio))
    chk('admin: el importe del e-cheque NO va en un value= de la plantilla (ponerNumero)', /data-echeck-campo="importe" data-importe-forma placeholder/.test(htmlVacio))
    const id = f.echecks[0].id
    S.actualizarEcheck(id, 'banco_codigo', '007')
    S.actualizarEcheck(id, 'numero', '00012345')
    S.actualizarEcheck(id, 'fecha_pago', '2026-10-30')
    S.actualizarEcheck(id, 'importe', '2.500,50')
    chk('admin: un e-cheque completo ya no frena', !S.motivosParaNoGuardar().some(m => /^E-cheque/.test(m)), S.motivosParaNoGuardar().join(' | '))
    S.actualizarEcheck(id, 'tipo', 'comun')
    chk('admin: pasar a "a la vista" borra la fecha de pago', f.echecks[0].tipo === 'comun' && f.echecks[0].fecha_pago === '')

    S.agregarTransferencia()
    const t = f.transferencias[0]
    chk('admin: agregarTransferencia suma una con la fecha de la cobranza', f.transferencias.length === 1 && t.fecha === f.fecha && t.cuenta_id === '')
    chk('admin: una transferencia sin cuenta ni importe no deja guardar', S.motivosParaNoGuardar().some(m => /^Transferencia 1: Elegí la cuenta/.test(m)) &&
      S.motivosParaNoGuardar().some(m => /^Transferencia 1: El importe/.test(m)))
    S.estado.cuentasBancoLista = [CUENTAS[0], CUENTAS[1]]
    S.estado.cuentasBanco = new Map([[CUENTAS[0].id, CUENTAS[0]], [CUENTAS[1].id, CUENTAS[1]]])
    S.actualizarTransferencia(t.id, 'cuenta_id', 'cta-dolce')
    S.actualizarTransferencia(t.id, 'importe', '10.000,00')
    S.actualizarTransferencia(t.id, 'referencia', '  op 123  ')
    chk('admin: elegir la cuenta guarda su nombre (para verla sin señal)', t.cuenta_nombre === 'Macro Dolce')
    chk('admin: una transferencia completa ya no frena', !S.motivosParaNoGuardar().length, S.motivosParaNoGuardar().join(' | '))
    const tot = S.totalesPorForma(f)
    chk('admin: los totales por forma', tot.efectivo === 0 && tot.cheques === 1000 && tot.echecks === 2500.5 && tot.transferencias === 10000 && tot.total === 13500.5, JSON.stringify(tot))

    const r = await S.subirCobranza(f)
    const ll = S.__rpcs()[0]
    chk('admin: guarda con guardar_cobranza_completa', r.ok && ll?.nombre === 'guardar_cobranza_completa', ll?.nombre)
    chk('admin: p_transferencias con cuenta, importe NÚMERO, fecha y referencia sin espacios',
      JSON.stringify(ll?.params.p_transferencias) === JSON.stringify([{ cuenta_id: 'cta-dolce', importe: 10000, fecha: '2026-09-30', referencia: 'op 123' }]),
      JSON.stringify(ll?.params.p_transferencias))
    const e = ll?.params.p_cheques.find(c => c.es_echeck)
    chk('e-cheque en p_cheques: sin foto, sin chequera, origen manual', e && e.foto_id === null && e.sucursal_codigo === null &&
      e.cuenta === null && e.dv_ruta === null && e.dv_numero === null && e.dv_cuenta === null && e.origen_datos === 'manual', JSON.stringify(e))
    chk('e-cheque en p_cheques: identificadores con sus ceros, importe número', e?.banco_codigo === '007' && e?.numero === '00012345' && e?.importe === 2500.5)
    chk('e-cheque "a la vista" viaja sin fecha de pago', e?.tipo === 'comun' && e?.fecha_pago === null && e?.fecha_emision === '2026-09-30')
    chk('e-cheque nuevo: la emisión arranca en hoy (Argentina)', S.echequeVacio().fecha_emision === '2026-09-30')
    chk('admin: el cheque de papel sigue viajando igual', ll?.params.p_cheques.filter(c => !c.es_echeck).length === 1)
  }
  {
    // Admin sin e-cheques ni transferencias: el camino de siempre.
    const S = sandbox(ADMIN)
    const f = formConCheque(S)
    await S.subirCobranza(f)
    chk('admin sin formas nuevas: guardar_cobranza de siempre', S.__rpcs()[0]?.nombre === 'guardar_cobranza' && !('p_transferencias' in S.__rpcs()[0].params))
  }
  {
    // Admin saca la ÚLTIMA transferencia de una cobranza que tenía.
    const S = sandbox(ADMIN)
    const f = formConCheque(S, { modo: 'edicion', teniaTransferencias: true,
      transferencias: [{ id: 't1', cuenta_id: 'cta-nuss', importe: 500, fecha: '2026-09-30', referencia: '' }] })
    S.quitarTransferencia('t1')
    await S.subirCobranza(f)
    const ll = S.__rpcs()[0]
    chk('admin saca la última transferencia: igual guardar_cobranza_completa con la lista vacía (si no, quedaría)',
      ll?.nombre === 'guardar_cobranza_completa' && Array.isArray(ll.params.p_transferencias) && ll.params.p_transferencias.length === 0, JSON.stringify(ll))
  }
  {
    // EL HUECO DE LA BASE: solo transferencias.
    const S = sandbox(ADMIN)
    const f = S.formularioVacio('id-solo'); f.cliente = 'X'
    f.transferencias = [{ id: 't1', cuenta_id: 'cta-nuss', importe: '500', fecha: '2026-09-30', referencia: '' }]
    S.estado.form = f
    const m = S.motivosParaNoGuardar()
    chk('solo transferencias: no se deja guardar y se dice por qué (la base lo rechaza)', m.some(x => /solo con transferencias todavía no se puede guardar/.test(x)), m.join(' | '))
    f.efectivo = '100'
    chk('transferencias + efectivo: ya se puede', !S.motivosParaNoGuardar().length, S.motivosParaNoGuardar().join(' | '))
    f.efectivo = ''; f.echecks = [echequeValido(S)]
    chk('transferencias + e-cheque: ya se puede', !S.motivosParaNoGuardar().length, S.motivosParaNoGuardar().join(' | '))
    f.echecks = []
    chk('sin nada: el mensaje de siempre', S.formularioVacio('z') && (() => { S.estado.form = S.formularioVacio('z'); S.estado.form.cliente = 'X'; return S.motivosParaNoGuardar().includes('Cargá al menos un cheque o un importe en efectivo.') })())
  }
  {
    // Las transferencias no se pudieron leer.
    const S = sandbox(ADMIN)
    formConCheque(S, { modo: 'edicion', transferenciasError: true })
    chk('admin: sin poder leer las transferencias no se puede guardar', S.motivosParaNoGuardar().some(m => /No se pudieron leer las transferencias/.test(m)))
    const C = sandbox(CHOFER)
    formConCheque(C, { modo: 'edicion', transferenciasError: true })
    chk('chofer: ese error no le frena (editar_cobranza no toca las transferencias)', !C.motivosParaNoGuardar().length, C.motivosParaNoGuardar().join(' | '))
  }

  // ══ 3. REGLAS DE UN E-CHEQUE Y DE UNA TRANSFERENCIA ════════════════════════
  {
    const S = sandbox(ADMIN)
    const err = (x) => S.erroresDeEcheque(echequeValido(S, x))
    chk('e-cheque válido: sin errores', err({}).length === 0, err({}).join(' | '))
    chk('e-cheque: banco de 1 dígito no', err({ banco_codigo: '7' }).some(e => /banco/.test(e)))
    chk('e-cheque: número de 7 dígitos no', err({ numero: '1234567' }).some(e => /número/.test(e)))
    chk('e-cheque: número con letras no', err({ numero: '1234567a' }).some(e => /número/.test(e)))
    chk('e-cheque: diferido sin fecha de pago no', err({ fecha_pago: '' }).some(e => /fecha de pago/.test(e)))
    chk('e-cheque: pago antes de la emisión no', err({ fecha_pago: '2026-09-01' }).some(e => /anterior/.test(e)))
    chk('e-cheque: más de 360 días no', err({ fecha_pago: '2027-09-20' }).some(e => /360/.test(e)))
    chk('e-cheque: justo 360 días sí', err({ fecha_emision: '2026-01-01', fecha_pago: '2026-12-27' }).length === 0)
    chk('e-cheque: a la vista sin fecha de pago sí', err({ tipo: 'comun', fecha_pago: '' }).length === 0)
    chk('e-cheque: importe 0 no', err({ importe: '0' }).some(e => /importe/.test(e)))
    chk('e-cheque: importe ilegible no', err({ importe: '1,2,3' }).some(e => /importe/.test(e)))
    chk('e-cheque: sin emisión no', err({ fecha_emision: '' }).some(e => /emisión/.test(e)))
    chk('e-cheque: tipo raro no', err({ tipo: 'x' }).some(e => /a la vista o diferido/.test(e)))
    const terr = (x) => S.erroresDeTransferencia(Object.assign({ cuenta_id: 'c', importe: '10', fecha: '2026-09-30', referencia: '' }, x))
    chk('transferencia válida: sin errores', terr({}).length === 0, terr({}).join(' | '))
    chk('transferencia: fecha futura no', terr({ fecha: '2026-10-01' }).some(e => /posterior/.test(e)))
    chk('transferencia: referencia de más de 100 no', terr({ referencia: 'x'.repeat(101) }).some(e => /100/.test(e)))
    chk('transferencia: sin cuenta no', terr({ cuenta_id: '' }).some(e => /cuenta/.test(e)))
    chk('transferencia: importe negativo no', terr({ importe: '-5' }).some(e => /importe/.test(e)))
    const vista = S.echequeParaBase(echequeValido(S, { tipo: 'comun', fecha_pago: '2026-10-20' }))
    chk('e-cheque a la vista con una fecha de pago vieja: viaja sin ella (CHECK de fechas)', vista.fecha_pago === null && vista.tipo === 'comun')
    const dif = S.echequeParaBase(echequeValido(S))
    chk('e-cheque diferido: viaja con su fecha de pago', dif.fecha_pago === '2026-10-20')
    const f2 = S.formularioVacio('t2')
    const sinConf = S.chequeVacio('f1'); sinConf.importe = '999'; sinConf.confirmado = false
    f2.cheques = [sinConf]; f2.efectivo = '10'
    S.estado.form = f2
    chk('totales: un cheque sin confirmar no suma', S.totalesPorForma(f2).cheques === 0 && S.totalesPorForma(f2).total === 10, JSON.stringify(S.totalesPorForma(f2)))
    const base = S.transferenciaParaBase({ cuenta_id: 'c', importe: '1.234,5', fecha: '', referencia: '' })
    chk('transferencia sin fecha: viaja null (la base pone la de la cobranza); referencia vacía null', base.fecha === null && base.referencia === null && base.importe === 1234.5, JSON.stringify(base))
  }

  // ══ 4. LAS CUENTAS DE BANCO ════════════════════════════════════════════════
  {
    const S = sandbox(ADMIN)
    S.estado.fabrica = { ok: true, unidades: new Set(['u-prueba']), personas: new Set(), soyDePrueba: false }
    S.__setTablas({
      v_empleados_publico: { data: [{ id: 'emp-empresa' }], error: null },
      cuentas_caja: { data: CUENTAS, error: null },
    })
    await S.cargarCuentasBanco()
    const ids = (S.estado.cuentasBancoLista ?? []).map(c => c.id)
    chk('cuentas: solo de la Empresa, en pesos, sin la fábrica de pruebas', ids.join(',') === 'cta-nuss,cta-dolce', ids.join(','))
    const cons = S.__consultas().find(c => c.tabla === 'cuentas_caja')
    chk('cuentas: la consulta pide banco y activas', cons && cons.filtros.some(f => f[0] === 'eq' && f[1] === 'medio' && f[2] === 'banco') &&
      cons.filtros.some(f => f[0] === 'eq' && f[1] === 'activa' && f[2] === true))
    chk('cuentas: la de la Empresa sale de v_empleados_publico tipo empresa', S.__consultas().some(c => c.tabla === 'v_empleados_publico' && c.filtros.some(f => f[0] === 'eq' && f[1] === 'tipo' && f[2] === 'empresa')))
    S.estado.unidadElegida = 'u-dolce'
    chk('cuentas: con una unidad en la barra, solo las de esa unidad', S.cuentasParaElegir('').map(c => c.id).join(',') === 'cta-dolce')
    chk('cuentas: la ya elegida se conserva aunque la barra la deje afuera', S.cuentasParaElegir('cta-nuss').map(c => c.id).join(',') === 'cta-nuss,cta-dolce')
    S.estado.unidadElegida = null
    chk('cuentas: con "Todas", todas', S.cuentasParaElegir('').length === 2)
    S.estado.unidades = [{ id: 'u-nuss', nombre: MAL }]
    const op = S.htmlOpcionesCuentas({ cuenta_id: 'cta-nuss' })
    chk('cuentas: la opción dice cuenta y unidad, escapadas, y queda elegida', /value="cta-nuss" selected/.test(op) && op.includes('Macro Pablo U · ' + MAL_ESC) && !op.includes(MAL), op)
    const op2 = S.htmlOpcionesCuentas({ cuenta_id: 'cta-vieja', cuenta_nombre: MAL })
    chk('cuentas: una cuenta que ya no está se ofrece con su nombre guardado (escapado)', /value="cta-vieja" selected/.test(op2) && op2.includes(MAL_ESC) && !op2.includes(MAL))
  }
  {
    const S = sandbox(ADMIN)
    S.__setTablas({ v_empleados_publico: { data: null, error: { message: 'sin red' } }, cuentas_caja: { data: [], error: null } })
    await S.cargarCuentasBanco()
    chk('cuentas: si no se pudieron leer, queda marcado', S.estado.cuentasBancoError === true && S.estado.cuentasBancoLista.length === 0)
    const h = S.htmlTransferenciaForm({ id: 't', cuenta_id: '', importe: '', fecha: '2026-09-30', referencia: '' }, 0, true)
    chk('cuentas: la tarjeta lo dice', /No se pudieron leer las cuentas de banco/.test(h))
    const C = sandbox(CHOFER)
    C.__setTablas({ cuentas_caja: () => { throw new Error('no debería consultar') } })
    await C.cargarCuentasBanco()
    chk('cuentas: el chofer no las pide', !C.__consultas().length)
  }

  // ══ 5. EDITAR: separar e-cheques y leer las transferencias ═════════════════
  {
    const S = sandbox(ADMIN)
    S.__setTablas({
      v_cobranzas: { data: { id: 'c1', cliente: 'Don Pepe', fecha: '2026-09-29', efectivo: 0, comprobante_referencia: null, observaciones: null }, error: null },
      cobranza_cheques: { data: [
        { id: 'p1', foto_id: 'f1', es_echeck: false, banco_codigo: '007', sucursal_codigo: '386', codigo_postal: '3218', dv_ruta: 6, numero: '66259862', dv_numero: 8, cuenta: '09420314667', dv_cuenta: 0, tipo: 'comun', fecha_emision: '2026-09-20', importe: 1000 },
        { id: 'e1', foto_id: null, es_echeck: true, banco_codigo: '011', numero: '00000042', tipo: 'diferido', fecha_emision: '2026-09-20', fecha_pago: '2026-10-20', importe: 700 },
      ], error: null },
      cobranza_fotos: { data: [{ id: 'f1', storage_path: 'x' }], error: null },
      cobranza_transferencias: { data: [{ id: 't1', cuenta_id: 'cta-nuss', importe: 300, fecha: '2026-09-29', referencia: 'op' }], error: null },
      cuentas_caja: { data: [{ id: 'cta-nuss', nombre: 'Macro Pablo U' }], error: null },
    })
    await S.abrirFormularioEdicion('c1')
    const f = S.estado.form
    chk('editar: los cheques de papel van a cheques', f?.cheques?.length === 1 && f.cheques[0].id === 'p1')
    chk('editar: los e-cheques van a echecks', f?.echecks?.length === 1 && f.echecks[0].id === 'e1' && f.echecks[0].banco_codigo === '011' && f.echecks[0].numero === '00000042')
    chk('editar: las transferencias, con el nombre de su cuenta', f?.transferencias?.length === 1 && f.transferencias[0].cuenta_nombre === 'Macro Pablo U' && f.teniaTransferencias === true)
    chk('editar: el total de las cuatro formas', S.totalDelFormulario() === 1000 + 700 + 300, S.totalDelFormulario())
  }
  {
    const S = sandbox(ADMIN)
    S.__setTablas({
      v_cobranzas: { data: { id: 'c1', cliente: 'X', fecha: '2026-09-29', efectivo: 100 }, error: null },
      cobranza_cheques: { data: [], error: null }, cobranza_fotos: { data: [], error: null },
      cobranza_transferencias: { data: null, error: { message: 'permiso' } },
    })
    await S.abrirFormularioEdicion('c1')
    chk('editar: si las transferencias no se leyeron, queda marcado (y no se guarda)', S.estado.form?.transferenciasError === true &&
      S.motivosParaNoGuardar().some(m => /No se pudieron leer las transferencias/.test(m)))
  }

  // ══ 6. EL DETALLE ══════════════════════════════════════════════════════════
  {
    const S = sandbox(ADMIN)
    const base = { id: 'c1', empleado_id: 'emp-x', cliente: 'Don Pepe', fecha: '2026-09-29', estado: 'registrada', efectivo: 100,
      cantidad_cheques: 2, total_cheques: 1700, total: 1800, created_at: '2026-09-29T12:00:00Z' }
    const cheques = [
      { id: 'p1', foto_id: 'f1', es_echeck: false, banco_codigo: '007', numero: '66259862', cuenta: '09420314667', tipo: 'comun', fecha_emision: '2026-09-20', importe: 1000, estado: 'en_cartera', titulares: [] },
      { id: 'e1', foto_id: null, es_echeck: true, banco_codigo: '011', numero: '00000042', cuenta: '00000000000', tipo: 'diferido', fecha_emision: '2026-09-20', fecha_pago: '2026-10-20', importe: 700, estado: 'en_cartera', titulares: [] },
    ]
    const transferencias = [{ id: 't1', cuenta_id: 'cta-nuss', importe: 300, fecha: '2026-09-29', referencia: MAL }]
    const cuentas = new Map([['cta-nuss', { nombre: MAL }]])
    const d = { cabecera: base, cheques, fotos: [], historial: [], nombres: new Map(), transferencias, cuentas }
    const h = S.htmlDetalle(d)
    chk('detalle: el total SUMA las transferencias (v_cobranzas no lo hace)', /Total<\/span>\s*<span class="cob-dato__v">\$\s2\.100,00/.test(h), h.match(/Total<\/span>[^<]*<span[^>]*>[^<]*/)?.[0])
    chk('detalle: filas de cheques, e-cheques y transferencias', /Cheques<\/span>\s*<span class="cob-dato__v">1 · \$\s1\.000,00/.test(h) &&
      /E-cheques<\/span>\s*<span class="cob-dato__v">1 · \$\s700,00/.test(h) && /Transferencias<\/span>\s*<span class="cob-dato__v">1 · \$\s300,00/.test(h))
    const tarjetaE = h.slice(h.indexOf('e-cheque, sin papel') - 1200, h.indexOf('e-cheque, sin papel') + 400)
    chk('detalle: el e-cheque dice "sin papel" y no ofrece "Ver la foto"', h.includes('e-cheque, sin papel') && (h.match(/data-ver-foto=/g) || []).length === 1, tarjetaE.length)
    chk('detalle: la transferencia con su cuenta y referencia, escapadas', /Entró en/.test(h) && h.includes(MAL_ESC) && !h.includes(MAL))
    chk('detalle: la transferencia lleva su etiqueta', /cob-transferencia[\s\S]*forma-pago--transferencia/.test(h))
    const lineaDet = (h.match(/<div class="cob-formas-linea">([\s\S]*?)<\/div>/) || [])[1] || ''
    chk('detalle: arriba, la línea con las cuatro formas', ['efectivo', 'cheque', 'echeck', 'transferencia'].every(f => lineaDet.includes('forma-pago--' + f)), lineaDet)
    chk('detalle: cada cheque con su etiqueta (papel naranja, e-cheque celeste)', /cob-cheque__tipo"><span class="forma-pago forma-pago--cheque">/.test(h) && /cob-cheque__tipo"><span class="forma-pago forma-pago--echeck">/.test(h))
    const hSin = S.htmlDetalle({ ...d, cheques: cheques.slice(0, 1), transferencias: [] })
    chk('detalle sin e-cheques ni transferencias: la fila de cheques de siempre', /Cheques<\/span>\s*<span class="cob-dato__v">2 · \$\s1\.700,00/.test(hSin) && !/E-cheques|Transferencias/.test(hSin))
    chk('detalle sin transferencias: el total de v_cobranzas', /Total<\/span>\s*<span class="cob-dato__v">\$\s1\.800,00/.test(hSin))
    const hNull = S.htmlDetalle({ ...d, cabecera: { ...base, total: null } })
    chk('detalle: un total ausente sigue siendo "—", nunca "$ 0,00" ni la suma de las transferencias', /Total<\/span>\s*<span class="cob-dato__v">—/.test(hNull))
    const hErr = S.htmlDetalle({ ...d, transferencias: [], transferenciasError: true })
    chk('detalle: si las transferencias no se leyeron, se dice', /No se pudieron leer las transferencias de esta cobranza/.test(hErr))
    const hSoloT = S.htmlDetalle({ ...d, cheques: [], transferencias })
    chk('detalle sin cheques pero con transferencias: no dice "fue todo en efectivo"', !/fue todo en efectivo/.test(hSoloT) && /no tiene cheques/.test(hSoloT))
    chk('totalConTransferencias: null sigue null', S.totalConTransferencias({ total: null }, transferencias) === null && S.totalConTransferencias({ total: 10 }, []) === 10)
    chk('sumaDeImportes: un importe ausente no suma', S.sumaDeImportes([{ importe: null }, { importe: '' }, { importe: 5 }, { importe: 'x' }]) === 5)
  }

  // ══ 6b. EL LISTADO: las etiquetas de cada fila y el total ═════════════════
  {
    const S = sandbox(CHOFER)
    chk('formasPresentes: el orden fijo y sin las que están en cero',
      JSON.stringify(S.formasPresentes({ efectivo: 5, papel: 1, echecks: 2, transferencias: 1 })) === '["efectivo","cheque","echeck","transferencia"]' &&
      JSON.stringify(S.formasPresentes({ efectivo: 0, papel: 0, echecks: 1 })) === '["echeck"]')
    chk('htmlLineaFormas: sin formas no dibuja nada', S.htmlLineaFormas([]) === '' && S.htmlLineaFormas(null) === '')
    chk('htmlLineaFormas: una etiqueta por forma, en su línea',
      /^<div class="cob-formas-linea"><span class="forma-pago forma-pago--efectivo">Efectivo<\/span><span class="forma-pago forma-pago--transferencia"><svg/.test(S.htmlLineaFormas(['efectivo', 'transferencia'])))
    const c = { id: 'c1', efectivo: 100, cantidad_cheques: 2, total: 1800 }
    const sin = S.formasDeFila(c)
    chk('formasDeFila sin lo leído aparte: lo que dice la vista', JSON.stringify(sin.formas) === '["efectivo","cheque"]' && sin.total === 1800)
    S.__setTablas({
      cobranza_cheques: { data: [{ cobranza_id: 'c1', es_echeck: false }, { cobranza_id: 'c1', es_echeck: true }], error: null },
      cobranza_transferencias: { data: [{ cobranza_id: 'c1', importe: 300 }], error: null },
    })
    await S.cargarFormasDe(['c1', 'c2'], 0)
    const con = S.formasDeFila(c)
    chk('cargarFormasDe: separa el e-cheque del de papel y suma la transferencia',
      JSON.stringify(con.formas) === '["efectivo","cheque","echeck","transferencia"]' && con.total === 2100, con)
    chk('cargarFormasDe: una cobranza sin nada aparte queda con cero', JSON.stringify(S.formasDeFila({ id: 'c2', efectivo: 5, cantidad_cheques: 0, total: 5 }).formas) === '["efectivo"]')
    chk('cargarFormasDe: repinta el listado', S.__repintadas() === 1)
    chk('cargarFormasDe: lee es_echeck y el importe de la transferencia, en UNA consulta por tabla, con .in()',
      S.__consultas().filter(q => q.tabla === 'cobranza_cheques').length === 1 &&
      S.__consultas().some(q => q.tabla === 'cobranza_cheques' && q.filtros.some(f => f[0] === 'select' && /es_echeck/.test(f[1])) && q.filtros.some(f => f[0] === 'in')) &&
      S.__consultas().some(q => q.tabla === 'cobranza_transferencias' && q.filtros.some(f => f[0] === 'select' && /importe/.test(f[1]))))
    chk('formasDeFila: un total ausente sigue ausente aunque haya transferencias', S.formasDeFila({ ...c, total: null }).total === null)
    // Una respuesta de un listado viejo no pisa el nuevo.
    const S2 = sandbox(CHOFER)
    S2.__setTablas({
      cobranza_cheques: { data: [{ cobranza_id: 'c1', es_echeck: true }], error: null },
      cobranza_transferencias: { data: [], error: null },
    })
    S2.__turno(3)
    await S2.cargarFormasDe(['c1'], 2)
    chk('cargarFormasDe: con otro turno no guarda ni repinta', S2.__repintadas() === 0 && S2.formasDeFila(c).formas.includes('cheque') && !S2.formasDeFila(c).formas.includes('echeck'))
    const S3 = sandbox(CHOFER)
    S3.__setTablas({ cobranza_cheques: { data: null, error: { message: 'x' } }, cobranza_transferencias: { data: [], error: null } })
    await S3.cargarFormasDe(['c1'], 0)
    chk('cargarFormasDe: si falla no tira, no repinta y la fila queda con lo de la vista', S3.__repintadas() === 0 && S3.formasDeFila(c).total === 1800)
  }
  {
    const fuente = fs.readFileSync(ARCHIVO, 'utf8')
    chk('el listado pide las formas de cada página después de pintarla', /renderizarListado\(\)\n\s*\/\/[^\n]*\n[^\n]*\n\s*cargarFormasDe\(filas\.map\(x => x\.id\), turno\)/.test(fuente))
    chk('la fila usa el total con las transferencias en las dos vistas',
      (fuente.match(/escCob\(formatearImporte\(total\)\)/g) || []).length === 2 && !/formatearImporte\(c\.total\)/.test(fuente.slice(fuente.indexOf('function htmlFilaCobranza'), fuente.indexOf('async function refrescarListado'))))
    chk('la fila dibuja la línea de etiquetas y la tabla también', /\$\{htmlLineaFormas\(formas\)\}/.test(fuente) && /cob-formas-tabla">\$\{formas\.map\(htmlEtiquetaForma\)/.test(fuente))
    chk('en la compu la línea del celular se esconde', /\.cob-maestro--activo \.cob-fila > \.cob-formas-linea \{ display: none; \}/.test(fuente))
  }

  // ══ 7. XSS: todo texto de la base escapado en las tarjetas del formulario ═
  {
    const S = sandbox(ADMIN)
    const e = { id: MAL, banco_codigo: MAL, numero: MAL, tipo: 'diferido', fecha_emision: MAL, fecha_pago: MAL, importe: '', tocado: true }
    const h = S.htmlEcheckForm(e, 0, true)
    chk('xss: tarjeta de e-cheque editable sin marcas crudas', !h.includes(MAL) && h.includes(MAL_ESC))
    const hl = S.htmlEcheckForm(e, 0, false)
    chk('xss: tarjeta de e-cheque de solo lectura sin marcas crudas', !hl.includes(MAL))
    const t = { id: MAL, cuenta_id: MAL, cuenta_nombre: MAL, importe: '', fecha: MAL, referencia: MAL, tocado: true }
    S.estado.cuentasBancoLista = [{ id: MAL, nombre: MAL, unidad_negocio_id: null }]
    const ht = S.htmlTransferenciaForm(t, 0, true)
    chk('xss: tarjeta de transferencia editable sin marcas crudas', !ht.includes(MAL) && ht.includes(MAL_ESC))
    const htl = S.htmlTransferenciaForm(t, 0, false)
    chk('xss: tarjeta de transferencia de solo lectura sin marcas crudas', !htl.includes(MAL) && htl.includes(MAL_ESC))
    S.estado.unidadElegida = 'u-x'; S.estado.unidades = [{ id: 'u-x', nombre: MAL }]; S.estado.cuentasBancoLista = []
    const hu = S.htmlTransferenciaForm({ id: 't', cuenta_id: '', importe: '', fecha: '', referencia: '' }, 0, true)
    chk('xss: el aviso de "sin cuentas en <unidad>" escapa la unidad', hu.includes(MAL_ESC) && !hu.includes(MAL), hu.slice(0, 200))
  }

  // ══ 8. EL FUENTE, EL CSS Y EL CONTRASTE ════════════════════════════════════
  {
    chk('fuente: la sección de formas arranca oculta en el HTML', /<div class="cob-seccion" id="cob-seccion-formas" hidden>/.test(FUENTE))
    chk('fuente: el resumen arranca oculto en el HTML', /<div class="cob-resumen-formas" id="cob-resumen-formas" hidden><\/div>/.test(FUENTE))
    chk('fuente: los botones "+ Agregar e-cheque" y "+ Agregar transferencia"', /id="cob-btn-echeck">\+ Agregar e-cheque</.test(FUENTE) && /id="cob-btn-transferencia">\+ Agregar transferencia</.test(FUENTE))
    chk('fuente: las cuentas de banco se cargan en el init', /\n\s+cargarCuentasBanco\(\)\n/.test(FUENTE))
    chk('fuente: los listeners delegados de la sección', /seccionFormas\.addEventListener\('input', alEscribirEnFormas\)/.test(FUENTE) &&
      /seccionFormas\.addEventListener\('click', alTocarEnFormas\)/.test(FUENTE))
    chk('fuente: la edición lee cobranza_transferencias', /abrirFormularioEdicion[\s\S]*?from\('cobranza_transferencias'\)/.test(FUENTE))
    chk('fuente: el detalle lee cobranza_transferencias', /async function abrirDetalle[\s\S]*?from\('cobranza_transferencias'\)/.test(FUENTE))
    const hex = (n) => (CSS.match(new RegExp(`--${n}:\\s*(#[0-9A-Fa-f]{6})`)) || [])[1]
    const lum = (h) => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] }
    const contraste = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
    const os = hex('celeste-oscuro'), su = hex('celeste-suave')
    chk('css: los tokens celestes existen', !!os && !!su && !!hex('celeste'))
    chk('css: la letra celeste sobre su fondo llega a AA (4,5:1)', os && su && contraste(os, su) >= 4.5, os && su && contraste(os, su).toFixed(2))
    chk('css: la letra verde y la naranja sobre su fondo llegan a AA', contraste(hex('verde-oscuro'), hex('verde-suave')) >= 4.5 && contraste(hex('naranja-oscuro'), hex('naranja-suave')) >= 4.5)
    chk('css: efectivo verde, cheque naranja, e-cheque y transferencia celeste',
      /\.forma-pago--efectivo\s*\{[^}]*var\(--verde-suave\)[^}]*var\(--verde-oscuro\)/.test(CSS) &&
      /\.forma-pago--cheque\s*\{[^}]*var\(--naranja-suave\)[^}]*var\(--naranja-oscuro\)/.test(CSS) &&
      /\.forma-pago--echeck,\s*\.forma-pago--transferencia\s*\{[^}]*var\(--celeste-suave\)[^}]*var\(--celeste-oscuro\)/.test(CSS))
    const S = sandbox(ADMIN)
    chk('etiqueta: la transferencia tiene su ícono, las otras no', /<svg/.test(S.htmlEtiquetaForma('transferencia')) &&
      !/<svg/.test(S.htmlEtiquetaForma('echeck') + S.htmlEtiquetaForma('cheque') + S.htmlEtiquetaForma('efectivo')))
    chk('etiqueta: el texto dice la forma (el color no va solo)', /Efectivo<\/span>$/.test(S.htmlEtiquetaForma('efectivo')) && /Cheque<\/span>$/.test(S.htmlEtiquetaForma('cheque')) &&
      /E-cheque<\/span>$/.test(S.htmlEtiquetaForma('echeck')) && /Transferencia<\/span>$/.test(S.htmlEtiquetaForma('transferencia')))
    chk('etiqueta: una forma desconocida no inventa nada', S.htmlEtiquetaForma('otra') === '')
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
