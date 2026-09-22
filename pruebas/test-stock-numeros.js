// Números de modulos/stock.html: las SEIS cantidades que se tipean —la
// contada del recuento, la del movimiento (ajuste con signo y baja siempre
// positiva), el contenido por bulto "Otra…" del recuento y del movimiento, la
// cantidad a enviar de una transferencia— y la tolerancia de merma % del
// catálogo pasan por las funciones compartidas de js/utils.js desde el
// 21/09/2026.
//
// Se EJECUTA el código real de los dos archivos: las funciones del módulo se
// extraen del <script>, el bloque de enlaces del top-level se extrae tal cual,
// y las funciones de números salen del utils.js real (fuenteNumeros). Los
// campos son inputFalso(), que tipea, borra y pega como el navegador, y el
// número se verifica EN LO QUE VIAJA, con un supabase mockeado:
// guardar_conteo, registrar_ajuste_stock, registrar_baja_stock,
// agregar_item_recuento, crear_transferencia_stock, crear_insumo y
// editar_insumo.
//
// Archivo bajo prueba: ARCHIVO_TEST, o modulos/stock.html.
// Baseline (el archivo antes de la migración): commit 5c1f0e1, FIJO.

const path = require('path')
const { execFileSync } = require('child_process')
const { construirCon, scriptModulo } = require('./sandbox')
const { fuenteNumeros, inputFalso } = require('./numeros-comun')
const { extraerFn } = require('./extraer')
const { leer } = require('./circuito-comun')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/stock.html')
const FUENTE = leer(ARCHIVO)
const SCRIPT = scriptModulo(ARCHIVO)
const BASELINE = '5c1f0e1'
const FUENTE_BASE = execFileSync('git', ['show', `${BASELINE}:modulos/stock.html`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
if (FUENTE_BASE.length < 100000) throw new Error('no se pudo leer el baseline ' + BASELINE)

let ok = 0
const fallas = []
function chk(nombre, condicion, detalle) {
  if (condicion) ok++
  else fallas.push(nombre + (detalle !== undefined ? ` — ${typeof detalle === 'string' ? detalle : JSON.stringify(detalle)}` : ''))
}

// El bloque de enlaces del top-level, tal cual está en el archivo. Se mete
// dentro de una función del preludio para correrlo DESPUÉS de que las
// constantes extraídas tengan valor.
function bloqueEnlaces() {
  const ini = SCRIPT.indexOf('    // LOS CAMPOS DE NÚMERO SE ENLAZAN ANTES DE SUS LISTENERS')
  if (ini === -1) throw new Error('no está el bloque de enlaces del top-level')
  const marca = '    prepararCantidadTi()\n'
  const fin = SCRIPT.indexOf(marca, ini)
  if (fin === -1) throw new Error('el bloque de enlaces no termina donde se esperaba')
  return SCRIPT.slice(ini, fin + marca.length)
}

const PRELUDIO = `
  ${fuenteNumeros()}
  var __inputFalso = ${inputFalso.toString()}
  var console = { log(){}, warn(){}, error(){} }
  var CSS = { escape: (s) => s }

  // --- DOM falso -----------------------------------------------------------
  var __els = new Map()
  function elemento(id, extra = {}) {
    const el = __inputFalso('')
    Object.assign(el, {
      id, dataset: {}, hidden: false, disabled: false, innerHTML: '', textContent: '', style: {},
      classList: { add(){}, remove(){}, toggle(){}, contains(){ return false } },
      querySelectorAll: () => [], querySelector: () => null,
      focus() { document.activeElement = el },
      cloneNode() { const n = elemento(id); n.disabled = el.disabled; n.hidden = el.hidden; return n },
      replaceWith(n) { el.reemplazado = true; __els.set(id, n) },
    }, extra)
    return el
  }
  // La lista del recuento: su innerHTML crea los inputs, como el navegador.
  var __listaRec = elemento('rec-lista')
  __listaRec.inputs = []
  Object.defineProperty(__listaRec, 'innerHTML', {
    get() { return this._html || '' },
    set(h) {
      this._html = h
      this.inputs = [...String(h).matchAll(/class="rec-input"[\\s\\S]*?data-cantidad="([^"]+)"/g)].map(m => {
        const e = elemento('rec-input-' + m[1]); e.dataset = { cantidad: m[1] }; return e
      })
    },
  })
  __listaRec.querySelectorAll = (sel) => sel === '[data-cantidad]' ? __listaRec.inputs : []
  __els.set('rec-lista', __listaRec)
  var document = {
    activeElement: null,
    getElementById(id) { if (!__els.has(id)) __els.set(id, elemento(id)); return __els.get(id) },
    querySelectorAll: () => [],
    querySelector: () => null,
  }

  // --- stubs ---------------------------------------------------------------
  var __llamadas = { rpc: [], errores: [], exitos: [], saldosMov: 0, saldosTi: 0, marcados: [] }
  var __rpc = async () => ({ data: null, error: null })
  var __datos = {}
  function __consulta(tabla) {
    const q = { select: () => q, eq: () => q, order: () => q, then: (r) => r({ data: __datos[tabla] ?? [], error: null }) }
    return q
  }
  var supabase = { rpc: (n, p) => { __llamadas.rpc.push([n, p]); return __rpc(n, p) }, from: (t) => __consulta(t) }
  function mostrarError(m) { __llamadas.errores.push(m) }
  function mostrarExito(m) { __llamadas.exitos.push(m) }
  function marcarError(id, m) { __llamadas.marcados.push([id, m]) }
  function actualizarSaldoMov() { __llamadas.saldosMov++ }
  function actualizarSaldoTi() { __llamadas.saldosTi++ }
  function itemsRecVisibles() { return estado.itemsRec }
  function actualizarContadorRec() {}
  function renderizarChipsFiltroRec() {}
  function marcarGuardado(e) { estado.guardado = e }
  function programarGuardado() {}
  function refrescarFilaRec() {}
  function htmlAclaracion() { return '' }
  function limpiarErroresMov() {}
  function limpiarErroresAgregar() {}
  function limpiarErroresTi() {}
  function limpiarErroresTransf() {}
  function limpiarErroresModal() {}
  function presentacionesDelLote() { return { conocidas: [] } }
  function presentacionesDelInsumoRec() { return [] }
  function cerrarModalMovimiento() {}
  function cerrarModalTransfItem() {}
  function cerrarModalTransferencia() {}
  function cerrarModalInsumo() {}
  function mostrarPasoConfirmacion() {}
  function mostrarPasoFormulario() {}
  function renderizarItemsTransf() {}
  function renderizarLotesTi() {}
  function renderizarSugerenciasCatalogo() {}
  function renderizarUnidadMov() {}
  function poblarSelectorMotivoTipo() {}
  function poblarSelectorCategoria() {}
  function poblarSelectorVista() {}
  function unidadesDelModo() { return [] }
  async function cargarLotesMov() {}
  async function cargarStock() {}
  async function cargarInsumos() {}
  function puedeVerStock() { return false }
  function puedeGestionar() { return true }
  function esPendiente() { return false }
  function nombreUnidad() { return 'X' }
  var EXPLICACION_MODO = { ajuste: '', baja: '' }
  var MINIMO_MOTIVO_OTRO = 10

  var estado = {
    itemsRec: [], saldos: new Map(), sucios: new Set(), guardando: false, recuento: { id: 'rec-1' },
    mov: null, ti: null, transf: null, insumos: [], editando: null,
    insumoAgregar: null, presentacionAgregar: undefined, agregados: 0,
  }
  function __enlazarTopLevel() {
    ${bloqueEnlaces()}
  }
`

const FUNCIONES = [
  'esc', 'normalizar', 'formatearCantidadStock', 'esUnidadEntera', 'decimalesCantidad', 'parsearCantidad',
  'ponerCantidadEnCampo', 'prepararCampoCantidad', 'mensajeCantidadInvalida',
  'equivalenteEnBultos', 'cabezaBultos', 'textoBultos', 'textoPresentacion', 'claveSaldo', 'saldoDe',
  'textoDelta',
  // recuento
  'renderizarItemsRecuento', 'anotarCantidad', 'huellaItem', 'guardarConteoAhora',
  'contenidoAgregar', 'avisoRenglonSinPresentacion', 'confirmarAgregarItem', 'cargarItemsRecuento', 'ordenarItemsRec',
  // movimiento
  'prepararCantidadMov', 'aplicarModoMov', 'elegirInsumoMov', 'quitarInsumoMov', 'contenidoMov',
  'cantidadMov', 'confirmarMovimiento',
  // transferencia
  'prepararCantidadTi', 'abrirModalTransfItem', 'elegirInsumoTi', 'quitarInsumoTi', 'contenidoTi',
  'cantidadTi', 'confirmarTransfItem', 'confirmarTransferencia',
  // catálogo
  'abrirModalInsumo', 'leerFormularioInsumo', 'pideConfirmacionDeTipo', 'guardarInsumo',
  'parsearTolerancia',
]
const CONSTANTES = ['DECIMALES_CANTIDAD', 'UNIDADES_ENTERAS', 'FRACCIONES', '_reglaCampoCantidad', 'limpiarTexto']

const S = construirCon(ARCHIVO, {
  preludio: PRELUDIO, funciones: FUNCIONES, constantes: CONSTANTES,
  retorno: '__setDatos(d){ __datos = d }, estado, __els, __llamadas, __setRpc(f){ __rpc = f }, document, __listaRec, __enlazarTopLevel, elemento',
})
S.__enlazarTopLevel()
const el = (id) => S.document.getElementById(id)
const pendientes = []
const ultimaRpc = (nombre) => [...S.__llamadas.rpc].reverse().find(r => r[0] === nombre)?.[1]

// ══════════════════════════════════════════════════════════════════════════
// 1. FORMATEADORES Y PARSER
// ══════════════════════════════════════════════════════════════════════════
{
  const f = S.formatearCantidadStock
  chk('formatear: null dice "—" (antes "0 kg")', f(null, 'kg') === '—', f(null, 'kg'))
  chk('formatear: undefined dice "—"', f(undefined, 'kg') === '—')
  chk('formatear: "" dice "—"', f('', 'kg') === '—')
  chk('formatear: NaN dice "—" (antes "NaN kg")', f(NaN, 'un') === '—', f(NaN, 'un'))
  chk('formatear: un cero REAL sigue siendo "0 kg"', f(0, 'kg') === '0 kg', f(0, 'kg'))
  chk('formatear: 1500,5 kg', f(1500.5, 'kg') === '1.500,5 kg', f(1500.5, 'kg'))
  chk('formatear: 0,3 kg sin ceros de relleno', f(0.3, 'kg') === '0,3 kg', f(0.3, 'kg'))
  chk('formatear: 3 decimales', f(8.555, 'kg') === '8,555 kg', f(8.555, 'kg'))
  chk('formatear: negativo', f(-1234, 'un') === '-1.234 un', f(-1234, 'un'))
  chk('formatear: sin unidad', f(47000, '') === '47.000', f(47000, ''))

  // Se ve IGUAL que antes para todo valor presente: se compara contra la
  // función del baseline, ejecutada.
  const viejo = new Function(`${extraerFn(FUENTE_BASE, 'formatearCantidadStock')}; return formatearCantidadStock`)()
  const casos = [[0, 'kg'], [1, 'un'], [1500, 'un'], [1500.5, 'kg'], [0.3, 'kg'], [8.555, 'lt'], [-1234.25, 'kg'], [2000000, 'un'], [12.3456, 'kg'], ['1500', 'kg'], [0.0004, 'kg']]
  const distintos = casos.filter(([n, u]) => viejo(n, u) !== f(n, u)).map(([n, u]) => [n, viejo(n, u), f(n, u)])
  chk('formatear: los valores presentes se ven igual que en el baseline', distintos.length === 0, distintos)

  chk('bultos: "1.500 bultos" con el separador de miles', S.cabezaBultos(37500, 25) === '1.500 bultos', S.cabezaBultos(37500, 25))
  chk('bultos: sin dato no hay bultos', S.cabezaBultos(null, 25) === null)
  chk('bultos: "de 25 kg" en la cola', S.textoBultos(250, 25, 'kg') === '10 bultos de 25 kg', S.textoBultos(250, 25, 'kg'))

  const p = S.parsearCantidad
  chk('parser kg: "8,5" = 8.5', p('8,5', { unidad: 'kg' }) === 8.5)
  chk('parser kg: "0,300" = 0.3', p('0,300', { unidad: 'kg' }) === 0.3)
  chk('parser kg: "1.500" = 1500 (cambio de semántica: antes 1,5)', p('1.500', { unidad: 'kg' }) === 1500)
  chk('parser kg: "1.234,5" se lee (antes se rechazaba)', p('1.234,5', { unidad: 'kg' }) === 1234.5)
  chk('parser kg: "1.5" pegado sigue siendo 1,5', p('1.5', { unidad: 'kg' }) === 1.5)
  chk('parser kg: más de 3 decimales no se adivina', p('1,2345', { unidad: 'kg' }) === null)
  chk('parser: "8 5" no es 85', p('8 5', { unidad: 'kg' }) === null)
  chk('parser: vacío es null, nunca cero', p('', { unidad: 'kg' }) === null && p('  ', { unidad: 'kg' }) === null)
  chk('parser un: "1.500" = 1500', p('1.500', { unidad: 'un' }) === 1500)
  chk('parser un: "1,5" no se acepta', p('1,5', { unidad: 'un' }) === null)
  chk('parser: negativo rechazado por defecto', p('-3', { unidad: 'kg' }) === null)
  chk('parser: negativo con permitirNegativos', p('-3', { permitirNegativos: true, unidad: 'kg' }) === -3)
  chk('parser: sin unidad (contenido) admite 3 decimales', p('12,125') === 12.125)
}

// ══════════════════════════════════════════════════════════════════════════
// 2. RECUENTO: guardar_conteo
// ══════════════════════════════════════════════════════════════════════════
function itemRec(id, unidad, extra = {}) {
  return { id, insumo_id: 'ins-' + id, lote: null, contenido_por_bulto: null, cantidad_contada: null,
    observacion: '', errorCantidad: null, nombre: 'Insumo ' + id, marca: '', unidad_medida: unidad,
    tipo: 'insumo', aclaracion: null, textoCantidad: null, ...extra }
}
const inputRec = (id) => S.__listaRec.inputs.find(i => i.dataset.cantidad === id)
{
  S.estado.itemsRec = [
    itemRec('a', 'kg'), itemRec('b', 'kg'), itemRec('c', 'un'), itemRec('d', 'kg', { observacion: 'rota' }),
    itemRec('e', 'kg', { cantidad_contada: 1234.5 }), itemRec('f', 'un', { cantidad_contada: 1.5 }),
  ]
  S.estado.sucios = new Set()
  S.renderizarItemsRecuento()
  chk('recuento: la plantilla ya no trae value (el número entra por ponerNumero)',
    !/class="rec-input"[^>]*value=/.test(S.__listaRec.innerHTML))
  chk('recuento: el campo queda enlazado', inputRec('a').type === 'text' && inputRec('a').atributos.inputmode === 'decimal')
  chk('recuento un: inputmode numeric (0 decimales)', inputRec('c').atributos.inputmode === 'numeric')
  chk('recuento: lo guardado se repinta CON miles ("1.234,50")', inputRec('e').value === '1.234,50', inputRec('e').value)
  chk('recuento: lo guardado que no entra en un campo de "un" se muestra tal cual, sin redondear', inputRec('f').value === '1,5', inputRec('f').value)
  chk('recuento: sin contar queda vacío (el guion)', inputRec('a').value === '')

  inputRec('a').teclear('0,300')
  inputRec('b').pegar('2.000')
  inputRec('c').teclear('1500')
  inputRec('d').teclear('8,5')
  chk('recuento kg: tipear "0,300" deja 0.3', S.estado.itemsRec[0].cantidad_contada === 0.3, S.estado.itemsRec[0].cantidad_contada)
  chk('recuento kg: pegar "2.000" da 2000', S.estado.itemsRec[1].cantidad_contada === 2000, S.estado.itemsRec[1].cantidad_contada)
  chk('recuento un: tipear 1500 muestra "1.500"', inputRec('c').value === '1.500', inputRec('c').value)
  inputRec('c').teclear(',')
  chk('recuento un: la coma no entra en un campo de "un"', inputRec('c').value === '1.500' && S.estado.itemsRec[2].cantidad_contada === 1500, inputRec('c').value)

  S.__llamadas.rpc = []
  S.guardarConteoAhora()
  const p = ultimaRpc('guardar_conteo')?.p_items ?? []
  const por = (id) => p.find(x => x.item_id === id)
  chk('guardar_conteo: "0,300" kg viaja como 0.3', por('a')?.cantidad_contada === '0.3', por('a'))
  chk('guardar_conteo: "2.000" kg viaja como 2000', por('b')?.cantidad_contada === '2000', por('b'))
  chk('guardar_conteo: "1.500" un viaja como 1500', por('c')?.cantidad_contada === '1500', por('c'))
  chk('guardar_conteo: "8,5" viaja como 8.5 (no 85)', por('d')?.cantidad_contada === '8.5', por('d'))
  chk('guardar_conteo: el payload lleva SIEMPRE observacion (no la pisa)', p.length === 4 && p.every(x => 'observacion' in x) && por('d')?.observacion === 'rota', p)

  // Re-render: ningún campo cambia, y el que tenía el foco lo recupera.
  const antes = ['a', 'b', 'c', 'd', 'e', 'f'].map(id => inputRec(id).value)
  S.document.activeElement = inputRec('a')
  const viejoA = inputRec('a')
  S.renderizarItemsRecuento()
  const despues = ['a', 'b', 'c', 'd', 'e', 'f'].map(id => inputRec(id).value)
  chk('recuento: re-renderizar no cambia NINGÚN campo', JSON.stringify(antes) === JSON.stringify(despues), [antes, despues])
  chk('recuento: "0,300" sigue diciendo "0,300" (no "0,30")', inputRec('a').value === '0,300', inputRec('a').value)
  chk('recuento: el campo re-creado con foco lo recupera', inputRec('a') !== viejoA && S.document.activeElement === inputRec('a'))
  inputRec('a').teclear('5')
  chk('recuento: el campo re-creado sigue enlazado (el 4º decimal no entra)', inputRec('a').value === '0,300' && S.estado.itemsRec[0].cantidad_contada === 0.3, inputRec('a').value)
  inputRec('b').borrar(10); inputRec('b').teclear('3')
  chk('recuento: después del re-render se sigue escribiendo (3)', S.estado.itemsRec[1].cantidad_contada === 3, S.estado.itemsRec[1].cantidad_contada)
  inputRec('b').borrar(5)
  chk('recuento: borrar todo vuelve al guion (null)', S.estado.itemsRec[1].cantidad_contada === null && inputRec('b').value === '')

  // Un texto que no se puede leer (llega sin pasar por el enlace) se dice.
  S.anotarCantidad('c', '1,5')
  chk('recuento un: "1,5" no se lee y la fila lo dice', S.estado.itemsRec[2].cantidad_contada === null &&
    /unidades enteras/.test(S.estado.itemsRec[2].errorCantidad || ''), S.estado.itemsRec[2].errorCantidad)
  S.anotarCantidad('a', '1,2345')
  chk('recuento kg: 4 decimales no se leen y la fila lo dice', S.estado.itemsRec[0].cantidad_contada === null &&
    /hasta 3 decimales/.test(S.estado.itemsRec[0].errorCantidad || ''), S.estado.itemsRec[0].errorCantidad)
  S.renderizarItemsRecuento()
  chk('recuento: un texto ilegible NO se borra al re-renderizar', inputRec('a').value === '1,2345', inputRec('a').value)
}
{
  // Agregar un ítem RECARGA la lista del servidor: lo tipeado sobrevive si el
  // servidor devuelve el mismo número, y lo que viene del servidor se repinta
  // con ponerNumero (con miles).
  pendientes.push(async () => {
    S.estado.itemsRec = [itemRec('a', 'kg')]
    S.renderizarItemsRecuento()
    inputRec('a').teclear('0,300')
    const fila = (id, cant, u) => ({ id, insumo_id: 'ins-' + id, lote: null, contenido_por_bulto: null, cantidad_contada: cant,
    observacion: null, insumos: { nombre: 'Insumo ' + id, marca: '', unidad_medida: u, tipo: 'insumo', aclaracion: null } })
    S.__setDatos({ stock_recuento_items: [fila('a', 0.3, 'kg'), fila('g', 2000, 'kg')], v_stock_por_lote: [] })
    await S.cargarItemsRecuento()
    S.renderizarItemsRecuento()
    chk('recarga: lo tipeado ("0,300") sobrevive', inputRec('a').value === '0,300', inputRec('a').value)
    chk('recarga: lo del servidor se repinta con miles ("2.000")', inputRec('g').value === '2.000', inputRec('g').value)
  })
}

// ══════════════════════════════════════════════════════════════════════════
// 3. AGREGAR ÍTEM AL RECUENTO: p_contenido_por_bulto ("Otra…")
// ══════════════════════════════════════════════════════════════════════════
{
  const c = el('rec-contenido')
  chk('rec-contenido: enlazado con 3 decimales', c.type === 'text' && c.atributos.inputmode === 'decimal')
  S.estado.itemsRec = []
  S.estado.insumoAgregar = { id: 'ins-z', tipo: 'insumo', unidad_medida: 'kg' }
  S.estado.presentacionAgregar = NaN
  c.teclear('12,5')
  S.__llamadas.rpc = []
  S.confirmarAgregarItem()
  chk('agregar_item_recuento: "12,5" viaja como 12.5', ultimaRpc('agregar_item_recuento')?.p_contenido_por_bulto === 12.5, ultimaRpc('agregar_item_recuento'))
  ponerVacio(c)
  c.pegar('1.500')
  S.estado.insumoAgregar = { id: 'ins-y', tipo: 'insumo', unidad_medida: 'un' }
  S.estado.presentacionAgregar = NaN
  S.__llamadas.rpc = []
  S.confirmarAgregarItem()
  chk('agregar_item_recuento: "1.500" pegado viaja como 1500', ultimaRpc('agregar_item_recuento')?.p_contenido_por_bulto === 1500, ultimaRpc('agregar_item_recuento'))
}
function ponerVacio(x) { x.escribirCrudo('') }

// ══════════════════════════════════════════════════════════════════════════
// 4. MOVIMIENTO: registrar_ajuste_stock / registrar_baja_stock
// ══════════════════════════════════════════════════════════════════════════
const KG = { id: 'i-kg', nombre: 'Harina', marca: '', tipo: 'insumo', unidad_medida: 'kg' }
const UN = { id: 'i-un', nombre: 'Caja', marca: '', tipo: 'insumo', unidad_medida: 'un' }
S.estado.insumos = [KG, UN]
function prepararMov(modo, insumo) {
  S.estado.mov = { modo, signo: 0, unidadId: 'u-1', insumo: null, presentacion: null, recuento: null }
  S.aplicarModoMov(modo)
  S.estado.mov.unidadId = 'u-1'   // unidadesDelModo() del stub no ofrece ninguna
  if (insumo) S.elegirInsumoMov(insumo.id)
  S.estado.mov.presentacion = null
  ponerVacio(el('mov-cantidad'))
  el('mov-motivo').value = 'se contó de nuevo el depósito'
  el('mov-motivo-tipo').value = modo === 'baja' ? 'rotura' : 'faltante_recuento'
  S.__llamadas.rpc = []
  S.__llamadas.marcados = []
}
{
  prepararMov('ajuste', KG)
  el('mov-cantidad').pegar('2.000')
  S.estado.mov.signo = -1
  S.confirmarMovimiento()
  chk('ajuste kg: "2.000" con "Falta" viaja como -2000', ultimaRpc('registrar_ajuste_stock')?.p_cantidad === -2000, [ultimaRpc('registrar_ajuste_stock'), S.__llamadas.marcados, el('mov-cantidad').value])

  prepararMov('ajuste', KG)
  el('mov-cantidad').teclear('8,5')
  S.estado.mov.signo = 1
  S.confirmarMovimiento()
  chk('ajuste kg: "8,5" con "Apareció" viaja como 8.5', ultimaRpc('registrar_ajuste_stock')?.p_cantidad === 8.5, ultimaRpc('registrar_ajuste_stock'))

  prepararMov('ajuste', KG)
  el('mov-cantidad').teclear('-12')
  chk('ajuste: el "-" tipeado desde el escritorio se mantiene', el('mov-cantidad').value === '-12', el('mov-cantidad').value)
  S.estado.mov.signo = 1
  S.confirmarMovimiento()
  chk('ajuste: "-12" tipeado manda -12 (el signo no se aplica dos veces)', ultimaRpc('registrar_ajuste_stock')?.p_cantidad === -12, ultimaRpc('registrar_ajuste_stock'))

  prepararMov('baja', KG)
  el('mov-cantidad').teclear('-3')
  chk('baja: el "-" no entra', el('mov-cantidad').value === '3', el('mov-cantidad').value)
  el('mov-cantidad').escribirCrudo('')
  el('mov-cantidad').pegar('-3')
  chk('baja: pegar "-3" no pega nada', el('mov-cantidad').value === '', el('mov-cantidad').value)
  el('mov-cantidad').teclear('1.250,5')
  S.confirmarMovimiento()
  chk('baja kg: tipeado "1.250,5" (el punto tipeado es coma) viaja 1.25 y positiva', ultimaRpc('registrar_baja_stock')?.p_cantidad === 1.25, ultimaRpc('registrar_baja_stock'))
  prepararMov('baja', KG)
  el('mov-cantidad').pegar('1.250,5')
  S.confirmarMovimiento()
  chk('baja kg: pegado "1.250,5" viaja 1250.5, positiva', ultimaRpc('registrar_baja_stock')?.p_cantidad === 1250.5, ultimaRpc('registrar_baja_stock'))

  prepararMov('baja', UN)
  chk('baja un: el campo es de enteros', el('mov-cantidad').atributos.inputmode === 'numeric')
  el('mov-cantidad').teclear('1.500')
  chk('baja un: tipear "1.500" deja 1.500 (el punto no es decimal)', el('mov-cantidad').value === '1.500', el('mov-cantidad').value)
  S.confirmarMovimiento()
  chk('baja un: viaja 1500', ultimaRpc('registrar_baja_stock')?.p_cantidad === 1500, ultimaRpc('registrar_baja_stock'))

  // Cambiar de insumo: el campo se re-crea con la regla nueva y conserva lo
  // que tenía si entra; si no entra, lo muestra y el confirmar lo frena.
  prepararMov('ajuste', KG)
  const campoKg = el('mov-cantidad')
  campoKg.teclear('1,5')
  S.elegirInsumoMov(UN.id)
  const campoUn = el('mov-cantidad')
  chk('cambiar a "un": el campo se re-crea', campoUn !== campoKg && campoKg.reemplazado === true)
  chk('cambiar a "un": el 1,5 no se redondea en silencio', campoUn.value === '1,5', campoUn.value)
  S.estado.mov.signo = 1
  S.confirmarMovimiento()
  chk('cambiar a "un": el 1,5 no se manda y se dice por qué',
    !ultimaRpc('registrar_ajuste_stock') && S.__llamadas.marcados.some(([id, m]) => id === 'mov-error-cantidad' && /unidades enteras/.test(m)), S.__llamadas.marcados)
  const antesSaldo = S.__llamadas.saldosMov
  campoUn.escribirCrudo(''); campoUn.teclear('7')
  chk('el campo re-creado conserva su listener (recalcula el saldo)', S.__llamadas.saldosMov > antesSaldo)
  S.elegirInsumoMov(KG.id)
  chk('volver a kg: el 7 se conserva', el('mov-cantidad').value === '7' && el('mov-cantidad').atributos.inputmode === 'decimal', el('mov-cantidad').value)
  S.aplicarModoMov('baja')
  chk('pasar a baja: el 7 se conserva', el('mov-cantidad').value === '7', el('mov-cantidad').value)
  el('mov-cantidad').escribirCrudo('')
  el('mov-cantidad').teclear('-5')
  chk('pasar a baja: el campo se re-crea sin negativos', el('mov-cantidad').value === '5', el('mov-cantidad').value)
  S.aplicarModoMov('ajuste')
  el('mov-cantidad').escribirCrudo('')
  el('mov-cantidad').teclear('-5')
  chk('volver a ajuste: el "-" vuelve a entrar', el('mov-cantidad').value === '-5', el('mov-cantidad').value)

  // Contenido por bulto "Otra…" del movimiento.
  chk('mov-contenido: enlazado', el('mov-contenido').type === 'text' && el('mov-contenido').atributos.inputmode === 'decimal')
  prepararMov('ajuste', KG)
  S.estado.mov.presentacion = NaN
  el('mov-contenido').teclear('0,5')
  el('mov-cantidad').teclear('10')
  S.estado.mov.signo = 1
  S.confirmarMovimiento()
  chk('mov-contenido: "0,5" viaja como p_contenido_por_bulto 0.5', ultimaRpc('registrar_ajuste_stock')?.p_contenido_por_bulto === 0.5, ultimaRpc('registrar_ajuste_stock'))
  prepararMov('baja', KG)
  S.estado.mov.presentacion = NaN
  el('mov-contenido').escribirCrudo(''); el('mov-contenido').pegar('1.500')
  el('mov-cantidad').teclear('3')
  S.confirmarMovimiento()
  chk('mov-contenido: "1.500" pegado viaja como 1500', ultimaRpc('registrar_baja_stock')?.p_contenido_por_bulto === 1500, ultimaRpc('registrar_baja_stock'))
}

// ══════════════════════════════════════════════════════════════════════════
// 5. TRANSFERENCIA: crear_transferencia_stock
// ══════════════════════════════════════════════════════════════════════════
{
  S.estado.transf = { origenId: 'u-1', destinoId: 'u-2', items: [] }
  S.abrirModalTransfItem()
  S.elegirInsumoTi(KG.id)
  S.estado.ti.lote = null; S.estado.ti.presentacion = null
  el('ti-cantidad').pegar('2.000')
  S.confirmarTransfItem()
  S.abrirModalTransfItem()
  S.elegirInsumoTi(UN.id)
  S.estado.ti.lote = null; S.estado.ti.presentacion = 12
  chk('ti un: el campo es de enteros', el('ti-cantidad').atributos.inputmode === 'numeric')
  el('ti-cantidad').teclear('1500')
  S.confirmarTransfItem()
  S.abrirModalTransfItem()
  S.elegirInsumoTi(KG.id)
  S.estado.ti.lote = 'L-1'; S.estado.ti.presentacion = null
  el('ti-cantidad').teclear('0,300')
  S.confirmarTransfItem()
  S.__llamadas.rpc = []
  S.confirmarTransferencia()
  const it = ultimaRpc('crear_transferencia_stock')?.p_items ?? []
  chk('transferencia: "2.000" kg viaja 2000', it[0]?.cantidad === 2000, it)
  chk('transferencia: "1.500" un viaja 1500', it[1]?.cantidad === 1500, it)
  chk('transferencia: "0,300" kg viaja 0.3', it[2]?.cantidad === 0.3, it)
  chk('transferencia: tres ítems', it.length === 3, it.length)

  S.abrirModalTransfItem()
  S.elegirInsumoTi(KG.id)
  S.estado.ti.lote = null; S.estado.ti.presentacion = null
  el('ti-cantidad').teclear('-5')
  chk('transferencia: el "-" no entra', el('ti-cantidad').value === '5', el('ti-cantidad').value)
}

// ══════════════════════════════════════════════════════════════════════════
// 6. TOLERANCIA DE MERMA: crear_insumo / editar_insumo y el Excel
// ══════════════════════════════════════════════════════════════════════════
{
  const t = el('campo-tolerancia')
  chk('tolerancia: enlazada', t.type === 'text' && t.atributos.inputmode === 'decimal')
  const INS = { id: 'x1', nombre: 'Lecitina', marca: 'M', aclaracion: null, unidad_medida: 'kg', tipo: 'materia_prima',
    tolerancia_merma_pct: 0.5, categoria: 'Aditivos', vista_preferida: 'bulto' }
  S.estado.insumos = [INS]
  S.abrirModalInsumo('x1')
  chk('tolerancia: se precarga con coma ("0,50", no "0.5")', t.value === '0,50', t.value)
  el('campo-categoria').value = 'Aditivos'; el('campo-vista').value = 'bulto'
  S.__llamadas.rpc = []
  S.guardarInsumo()
  const e = ultimaRpc('editar_insumo')
  chk('editar_insumo: la tolerancia precargada viaja como 0.5', e?.p_tolerancia_merma_pct === 0.5, e)
  chk('editar_insumo: los parámetros con default van SIEMPRE', e && ['p_aclaracion', 'p_categoria', 'p_vista_preferida', 'p_estado_alta'].every(k => k in e), e)

  S.abrirModalInsumo('x1')
  t.escribirCrudo(''); t.teclear('12,5')
  S.__llamadas.rpc = []
  S.guardarInsumo()
  chk('editar_insumo: "12,5" viaja 12.5', ultimaRpc('editar_insumo')?.p_tolerancia_merma_pct === 12.5, ultimaRpc('editar_insumo'))

  t.escribirCrudo(''); t.teclear('150')
  chk('tolerancia: pasarse de 100 no escribe', t.value === '15', t.value)
  t.escribirCrudo(''); t.teclear('1,555')
  chk('tolerancia: hasta 2 decimales', t.value === '1,55', t.value)

  S.abrirModalInsumo(null)
  chk('alta: la tolerancia arranca vacía', t.value === '', t.value)
  el('campo-nombre').value = 'Nuevo'; el('campo-unidad').value = 'kg'; el('campo-tipo').value = 'insumo'
  t.teclear('3')
  S.__llamadas.rpc = []
  S.guardarInsumo()
  const c = ultimaRpc('crear_insumo')
  chk('crear_insumo: "3" viaja 3', c?.p_tolerancia_merma_pct === 3, c)
  chk('crear_insumo: los parámetros con default van SIEMPRE', c && ['p_aclaracion', 'p_categoria'].every(k => k in c), c)
  S.abrirModalInsumo(null)
  el('campo-nombre').value = 'Nuevo'; el('campo-unidad').value = 'kg'
  S.__llamadas.rpc = []
  S.guardarInsumo()
  chk('crear_insumo: vacía viaja null (control estricto)', ultimaRpc('crear_insumo')?.p_tolerancia_merma_pct === null, ultimaRpc('crear_insumo'))

  // Un valor guardado que no entra en 2 decimales no se redondea en silencio.
  S.estado.insumos = [{ ...INS, tolerancia_merma_pct: 0.125 }]
  S.abrirModalInsumo('x1')
  chk('tolerancia 0,125 guardada: se muestra tal cual', t.value === '0,125', t.value)
  S.__llamadas.rpc = []; S.__llamadas.marcados = []
  S.guardarInsumo()
  chk('tolerancia 0,125: no se manda redondeada y se pide corregir', !ultimaRpc('editar_insumo') && S.__llamadas.marcados.some(([id]) => id === 'error-tolerancia'), S.__llamadas.marcados)

  const pt = S.parsearTolerancia
  chk('Excel: celda numérica 0.5', pt(0.5).ok && pt(0.5).valor === 0.5)
  chk('Excel: texto "0,5"', pt('0,5').valor === 0.5)
  chk('Excel: texto "12.5" sigue siendo 12,5', pt('12.5').valor === 12.5)
  chk('Excel: texto "1.500" = 1500 → fuera de rango (cambio: antes 1,5)', !pt('1.500').ok && /rango/.test(pt('1.500').motivo), pt('1.500'))
  chk('Excel: texto "-1" → fuera de rango', !pt('-1').ok && /rango/.test(pt('-1').motivo), pt('-1'))
  chk('Excel: número -1 → fuera de rango', !pt(-1).ok && /rango/.test(pt(-1).motivo), pt(-1))
  chk('Excel: "abc" no es un número', !pt('abc').ok && /no es un número/.test(pt('abc').motivo))
  chk('Excel: vacío = null válido', pt('').ok && pt('').valor === null && pt(null).valor === null)
  chk('Excel: 100 entra, 100,01 no', pt('100').ok && !pt('100,01').ok)
}

// ══════════════════════════════════════════════════════════════════════════
// 7. FUENTE: no quedan lecturas viejas
// ══════════════════════════════════════════════════════════════════════════
{
  const sinComentarios = SCRIPT.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n')
  chk('no queda textoParaInput', !/textoParaInput\(/.test(sinComentarios))
  chk('no queda Number(x.replace(",", "."))', !/Number\([^)]*\.replace\(',', '\.'\)\)/.test(sinComentarios))
  chk('no queda parseFloat', !/parseFloat\(/.test(sinComentarios))
  chk('no queda toLocaleString sobre números (solo la fecha)', (sinComentarios.match(/toLocaleString\(/g) || []).length === 1)
  chk('la tolerancia se muestra con formatearNumeroAr (dos lugares)', (sinComentarios.match(/formatearNumeroAr\(i\.tolerancia_merma_pct/g) || []).length === 2)
  chk('mov-cantidad y ti-cantidad ya no tienen listener suelto en el top-level',
    !/getElementById\('mov-cantidad'\)\.addEventListener/.test(sinComentarios) && !/getElementById\('ti-cantidad'\)\.addEventListener/.test(sinComentarios))
}

;(async () => {
  for (const f of pendientes) await f()
  console.log(`${ok}/${ok + fallas.length}`)
  if (fallas.length) { console.log('FALLAS:\n  ' + fallas.join('\n  ')); process.exit(1) }
})()
