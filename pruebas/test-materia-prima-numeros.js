// Números de modulos/materia-prima.html (Ingreso): los DOS importes —"Total de
// la factura" del wizard y el del reintento del circuito en el detalle— y las
// CANTIDADES de la tarjeta de un ítem (número del papel, contenido por bulto,
// bultos del papel, lo recibido, las líneas de presentación mixta) y de la
// recepción de transferencias (bultos y cantidad directa) pasan por las
// funciones compartidas de js/utils.js desde el 21/09/2026.
//
// Se EJECUTA el código real de los dos archivos: las funciones del módulo se
// extraen del <script> (cablearItems entero, con sus listeners), el enlace del
// campo del total se extrae tal cual del top-level, y las funciones de números
// salen del utils.js real (fuenteNumeros). Los campos son inputFalso(), que
// tipea, borra y pega como el navegador, y el número se verifica EN LO QUE
// VIAJA: las filas de materia_prima_items (filasItemParaBase, la que usa el
// insert), p_importe de registrar_factura_de_ingreso y cantidad_recibida de
// responder_transferencia_stock, con un supabase mockeado.
//
// Archivo bajo prueba: ARCHIVO_TEST, o modulos/materia-prima.html.
// Baseline (el archivo antes de la migración): commit a4c17a2, FIJO.

const path = require('path')
const { execFileSync } = require('child_process')
const { construirCon, scriptModulo } = require('./sandbox')
const { fuenteNumeros, inputFalso } = require('./numeros-comun')
const { extraerFn } = require('./extraer')
const { leer } = require('./circuito-comun')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/materia-prima.html')
const FUENTE = leer(ARCHIVO)
const SCRIPT = scriptModulo(ARCHIVO)
const BASELINE = 'a4c17a2'
const FUENTE_BASE = execFileSync('git', ['show', `${BASELINE}:modulos/materia-prima.html`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
if (FUENTE_BASE.length < 100000) throw new Error('no se pudo leer el baseline ' + BASELINE)

let ok = 0
const fallas = []
function chk(nombre, condicion, detalle) {
  if (condicion) ok++
  else fallas.push(nombre + (detalle !== undefined ? ` — ${typeof detalle === 'string' ? detalle : JSON.stringify(detalle)}` : ''))
}

// El enlace del campo del total, tal cual está en el top-level del archivo.
function bloqueTotal() {
  const ini = SCRIPT.indexOf("const campoTotal = document.getElementById('campo-total-factura')")
  if (ini === -1) throw new Error('no está el bloque del campo del total')
  const fin = SCRIPT.indexOf('\n', SCRIPT.indexOf("campoTotal.addEventListener('input'", ini))
  if (fin === -1) throw new Error('no está el listener del campo del total')
  return SCRIPT.slice(ini, fin)
}

const PRELUDIO = `
  ${fuenteNumeros()}
  var __inputFalso = ${inputFalso.toString()}
  var console = { log(){}, warn(){}, error(){} }

  // --- DOM falso -----------------------------------------------------------
  function contenedor() {
    return {
      hijos: [], appendChild(h) { this.hijos.push(h); h.parentElement = this; return h },
      querySelector(sel) { return sel === '.campo-invalido' ? (this.hijos.find(h => h.className === 'campo-invalido' && !h.quitado) || null) : null },
    }
  }
  function campo(dataset = {}, valor = '') {
    const el = __inputFalso(valor)
    const padre = contenedor()
    Object.assign(el, {
      dataset, textContent: '', hidden: false, disabled: false, style: {},
      classList: { add(){}, remove(){}, toggle(){}, contains(){ return false } },
      closest: (sel) => sel === '[data-linea]' && dataset.__linea !== undefined ? { dataset: { linea: String(dataset.__linea) } } : null,
      focus() { document.activeElement = el },
    })
    padre.appendChild(el)
    return el
  }
  var __els = new Map()
  var document = {
    activeElement: null,
    getElementById(id) { if (!__els.has(id)) __els.set(id, campo({})); return __els.get(id) },
    createElement: () => ({ className: '', textContent: '', remove() { this.quitado = true } }),
    querySelector(sel) {
      const m = /\\[data-rec="(\\w+)"\\]\\[data-idx="(\\d+)"\\]/.exec(sel)
      if (!m) return null
      return (__internos.campos || []).find(e => e.dataset.rec === m[1] && e.dataset.idx === m[2]) || null
    },
  }

  // --- stubs ---------------------------------------------------------------
  var __llamadas = { rpc: [], renders: 0, errores: [], exitos: [], recargas: 0 }
  var __rpc = async () => ({ data: { accion: 'creada' }, error: null })
  var supabase = { rpc: (n, p) => { __llamadas.rpc.push([n, p]); return __rpc(n, p) } }
  function mostrarError(m) { __llamadas.errores.push(m) }
  function mostrarExito(m) { __llamadas.exitos.push(m) }
  function renderizarItems() { __llamadas.renders++ }
  function buscarEnCatalogo() { return null }
  function elegirDelCatalogo() {}
  function htmlSugerenciasCatalogo() { return '' }
  function subirArchivoMp() {}
  function textoCantidad() { return '' }
  function textoCantidadDocumento() { return '' }
  function textoBultoIncompleto() { return '' }
  function textoResultadoVivo() { return '' }
  function resultadoNoCierra() { return false }
  function textoDiferencia() { return '' }
  async function cargarIngresos() { __llamadas.recargas++ }
  async function cargarPagadoSinIngresar() {}
  function buscarEntrega() { return null }
  async function abrirDetalleIngreso() {}
  async function cargarInternos() {}
  function mostrarPasoRecepcion() {}
  function traducirErrorRecepcion(e) { return e.message }
  function actualizarPendientesInternos() {}

  // La recepción: renderizarItemsInternos vuelve a crear los inputs (como el
  // innerHTML real) y llama a la cablearItemsInternos REAL.
  var __internos = { campos: [] }
  var __contInternos = { querySelectorAll(sel) {
    const m = /\\[data-rec="(\\w+)"\\]/.exec(sel)
    return m ? __internos.campos.filter(e => e.dataset.rec === m[1]) : []
  } }
  function renderizarItemsInternos() {
    __internos.campos = []
    estado.recepcion.items.forEach((it, idx) => {
      if (it.contenido != null) __internos.campos.push(campo({ rec: 'bultos', idx: String(idx) }))
      else __internos.campos.push(campo({ rec: 'base', idx: String(idx) }))
    })
    cablearItemsInternos()
  }
  __els.set('internos-items', __contInternos)

  var estado = {
    miRolApp: 'usuario', misTareas: new Set(['materia_prima:cargar']),
    wizard: null, recepcion: null, listaIngresos: [], resultadoCircuito: null,
    unidades: [], proveedores: [],
  }
  ${bloqueTotal()}
`

const FUNCIONES = [
  'esc', 'esUnidadEntera', 'decimalesCantidad', 'ponerCantidadEnCampo', 'campoEsEntero',
  'mensajeCantidadInvalida', 'decimalesCampoItem', 'enlazarCantidadesItem', 'cablearItems', 'itemPorUid',
  'marcarCampoInvalido', 'marcarCampoInvalidoLinea', 'actualizarTotalEnVivo', 'actualizarDiferenciaEnVivo',
  'actualizarSumaMixtaEnVivo', 'derivarCantidades', 'dividirExacto', 'bultosEnteros', 'totalDeLineas',
  'sumaDeControl', 'lineasCierran', 'diferenciaDe', 'hayDiferenciaReal', 'filasItemParaBase',
  'filaItemParaBase', 'esFactura', 'formatearCantidad', 'formatearNumero', 'numeroDesdeOcr',
  // importes
  'totalFacturaDe', 'alEscribirTotalFactura', 'pideTotalFactura', 'datosParaCircuito', 'llevaCircuito',
  'pasarAlCircuito', 'resultadoCircuito', 'errorCircuito', 'importeConMoneda', 'formatearImporteDuplicado',
  'importeOcrDe', 'enlazarReintentosCircuito', 'reintentarCircuito', 'renderizarBloquesCircuito',
  'avisoCircuitoPrevio', 'validarCircuitoAntesDeGuardar',
  // recepción
  'cablearItemsInternos', 'repintarItemInterno', 'redondearRecepcion', 'baseDesdeBultos', 'recibidaDe',
  'recibidaParaRpc', 'difiereDeLoEnviado', 'faltanConfirmarInternos', 'problemasInternos',
  'mostrarErrorInterno', 'confirmarRecepcion',
]
const CONSTANTES = ['UNIDADES_ENTERAS', 'DECIMALES_CANTIDAD', 'CAMPOS_CANTIDAD_ITEM', 'TOLERANCIA_CANTIDAD', 'TIPOS_CON_CIRCUITO']

const S = construirCon(ARCHIVO, {
  preludio: PRELUDIO, funciones: FUNCIONES, constantes: CONSTANTES,
  retorno: 'estado, __els, __llamadas, __setRpc(f){ __rpc = f }, campo, document, __internos',
})

// ── Armado de una tarjeta falsa ────────────────────────────────────────────
function itemBase(extra = {}) {
  return {
    uid: 'u1', insumoId: 'ins-1', esNuevo: false, nombre: 'Harina', marca: '', tipo: 'insumo',
    unidadMedida: 'kg', interpretacion: 'granel', numeroPapel: null, lineas: null, bultosPapel: null,
    contenidoPapel: null, bultos: null, contenido: null, cantidad: null, cantidadOcrOriginal: null,
    yaRecibido: false, difiere: false, cantidadDocumento: null, motivoDiferencia: '', recibido: null,
    recibidoEnUnidades: false, lote: '', loteIlegible: false, fichaTecnicaUrl: null, fotoLoteUrl: null,
    ...extra,
  }
}
// Dibuja la tarjeta: los campos que la plantilla dibujaría para ese ítem.
// Cada llamada crea inputs NUEVOS, como el innerHTML real de renderizarItems.
function tarjeta(item, campos, lineas = 0) {
  const els = campos.map(c => S.campo({ campo: c }))
  const lin = []
  for (let n = 0; n < lineas; n++) {
    lin.push(S.campo({ lineaCampo: 'bultos', __linea: n }), S.campo({ lineaCampo: 'contenido', __linea: n }))
  }
  const t = {
    dataset: { uid: item.uid },
    querySelectorAll(sel) {
      if (sel === '[data-campo]') return els
      if (sel === '[data-linea-campo]') return lin
      return []
    },
    querySelector: () => null,
  }
  S.estado.wizard = { items: [item], encabezado: { tipoDoc: 'factura_a' } }
  S.__els.set('wz-lista-items', { querySelectorAll: (sel) => sel === '.item-mp' ? [t] : [] })
  S.cablearItems()
  const por = (c) => els.find(e => e.dataset.campo === c)
  return { por, lin, els }
}
const fila = (item) => S.filasItemParaBase(item, 'ing-1')

// ══════════════════════════════════════════════════════════════════════════
// 1. CANTIDADES DE LA TARJETA → FILAS DE materia_prima_items
// ══════════════════════════════════════════════════════════════════════════
{
  // A granel, kg: "2.000" tipeado como se escribe en el celular (2000) y pegado.
  const it = itemBase()
  const t = tarjeta(it, ['numeroPapel'])
  const f = t.por('numeroPapel')
  chk('granel kg: el campo queda enlazado (type text, inputmode decimal)', f.type === 'text' && f.atributos.inputmode === 'decimal')
  f.teclear('2000')
  chk('granel kg: tipear 2000 muestra "2.000"', f.value === '2.000', f.value)
  const r = fila(it)[0]
  chk('granel kg: "2.000" viaja como cantidad 2000', r.cantidad === 2000, r)
  chk('granel kg: sin presentación inventada', r.cantidad_bultos === null && r.contenido_por_bulto === null && r.contenido_documento === null, r)

  const it2 = itemBase()
  const f2 = tarjeta(it2, ['numeroPapel']).por('numeroPapel')
  f2.pegar('2.000')
  chk('granel kg: PEGAR "2.000" da 2000 (punto de miles, cambio de semántica)', it2.numeroPapel === 2000 && fila(it2)[0].cantidad === 2000, it2.numeroPapel)

  const it3 = itemBase()
  const f3 = tarjeta(it3, ['numeroPapel']).por('numeroPapel')
  f3.teclear('0,300')
  chk('granel kg: "0,300" viaja como 0.3', fila(it3)[0].cantidad === 0.3, fila(it3)[0].cantidad)

  const it4 = itemBase()
  const f4 = tarjeta(it4, ['numeroPapel']).por('numeroPapel')
  f4.teclear('1.5')
  chk('granel kg: TIPEAR "1.5" da 1,5 (el punto tipeado es la coma decimal)', f4.value === '1,5' && it4.numeroPapel === 1.5, [f4.value, it4.numeroPapel])

  const it5 = itemBase()
  const f5 = tarjeta(it5, ['numeroPapel']).por('numeroPapel')
  f5.teclear('8,5')
  chk('granel kg: "8,5" no se vuelve 85', it5.numeroPapel === 8.5, it5.numeroPapel)
  f5.teclear('555')
  chk('granel kg: kilos admiten hasta 3 decimales', f5.value === '8,555' && it5.numeroPapel === 8.555, [f5.value, it5.numeroPapel])

  const it6 = itemBase()
  const f6 = tarjeta(it6, ['numeroPapel']).por('numeroPapel')
  f6.pegar('387300.50')
  chk('granel kg: pegar "387300.50" (punto decimal pegado) da 387300.5', it6.numeroPapel === 387300.5, it6.numeroPapel)
}
{
  // Modo bultos: "1.500" bultos de 25 kg.
  const it = itemBase({ interpretacion: 'bultos' })
  const t = tarjeta(it, ['numeroPapel', 'contenido'])
  const n = t.por('numeroPapel'), c = t.por('contenido')
  chk('bultos: el número del papel es de enteros (inputmode numeric)', n.atributos.inputmode === 'numeric')
  chk('bultos: el contenido en kg admite decimales', c.atributos.inputmode === 'decimal')
  n.teclear('1.500')
  chk('bultos: tipear "1.500" en un campo de bultos da 1500 (el punto no es decimal)', n.value === '1.500' && it.numeroPapel === 1500, [n.value, it.numeroPapel])
  c.teclear('25')
  const r = fila(it)[0]
  chk('bultos: viajan 1500 bultos de 25 = 37500', r.cantidad === 37500 && r.cantidad_bultos === 1500 && r.contenido_por_bulto === 25 && r.contenido_documento === 25, r)
  const it2 = itemBase({ interpretacion: 'bultos' })
  const n2 = tarjeta(it2, ['numeroPapel', 'contenido']).por('numeroPapel')
  n2.teclear('2,5')
  chk('bultos: "2,5" bultos no se acepta como 2,5 (la coma no entra)', it2.numeroPapel === 25, it2.numeroPapel)
  n2.escribirCrudo('')
  n2.pegar('1,5')
  chk('bultos: pegar "1,5" en bultos no pega nada', n2.value === '' && it2.numeroPapel === null, [n2.value, it2.numeroPapel])
}
{
  // Modo unidades en `un`: 2.000 un en 8 bultos, y recepción parcial de 1.985.
  const it = itemBase({ unidadMedida: 'un', interpretacion: 'unidades' })
  const t = tarjeta(it, ['numeroPapel', 'bultosPapel'])
  t.por('numeroPapel').teclear('2000')
  t.por('bultosPapel').teclear('8')
  const r = fila(it)[0]
  chk('unidades: 2.000 un en 8 bultos = 8 de 250', r.cantidad === 2000 && r.cantidad_bultos === 8 && r.contenido_por_bulto === 250 && r.contenido_documento === 250, r)
  chk('unidades en un: el número del papel es de enteros', t.por('numeroPapel').atributos.inputmode === 'numeric')
  it.difiere = true
  const t2 = tarjeta(it, ['numeroPapel', 'bultosPapel', 'recibido'])
  chk('re-render: el número se vuelve a escribir con ponerNumero ("2.000")', t2.por('numeroPapel').value === '2.000', t2.por('numeroPapel').value)
  chk('re-render: los bultos del papel también ("8")', t2.por('bultosPapel').value === '8', t2.por('bultosPapel').value)
  t2.por('recibido').teclear('1985')
  const r2 = fila(it)[0]
  chk('recepción parcial: recibido 1.985 de 2.000', r2.cantidad === 1985 && r2.cantidad_documento === 2000, r2)
  chk('recepción parcial: no entra en bultos enteros → par en null, contenido_documento 250', r2.cantidad_bultos === null && r2.contenido_por_bulto === null && r2.contenido_documento === 250, r2)
}
{
  // Recibido en bultos (entero) y en unidades (decimal) según la elección.
  const it = itemBase({ interpretacion: 'bultos', numeroPapel: 100, contenido: 25, difiere: true })
  S.derivarCantidades(it)
  const t = tarjeta(it, ['numeroPapel', 'contenido', 'recibido'])
  chk('recibido en bultos: enteros', t.por('recibido').atributos.inputmode === 'numeric')
  t.por('recibido').teclear('98')
  const r = fila(it)[0]
  chk('recibido 98 bultos de 25', r.cantidad === 2450 && r.cantidad_bultos === 98 && r.cantidad_documento === 2500, r)
  it.recibidoEnUnidades = true; it.recibido = null
  const t2 = tarjeta(it, ['numeroPapel', 'contenido', 'recibido'])
  chk('recibido en kg: el mismo campo re-creado admite decimales', t2.por('recibido').atributos.inputmode === 'decimal')
  t2.por('recibido').teclear('2.449,5')
  chk('recibido en kg: TIPEAR "2.449,5" deja 2,449 (el punto tipeado es la coma; los miles los pone el campo)', it.recibido === 2.449, it.recibido)
  t2.por('recibido').escribirCrudo('2.449,5')
  chk('recibido en kg: escrito "2.449,5" da 2449.5', it.recibido === 2449.5 && fila(it)[0].cantidad === 2449.5, it.recibido)
}
{
  // Presentaciones mixtas: 4 bultos de 250 y 2 de 500, en kg.
  const it = itemBase({ interpretacion: 'unidades', numeroPapel: 2000, lineas: [{ bultos: null, contenido: null }, { bultos: null, contenido: null }] })
  const t = tarjeta(it, ['numeroPapel'], 2)
  const [b0, c0, b1, c1] = t.lin
  chk('mixtas: los bultos de una línea son de enteros', b0.atributos.inputmode === 'numeric' && c0.atributos.inputmode === 'decimal')
  b0.teclear('4'); c0.teclear('250'); b1.teclear('2'); c1.teclear('500')
  const filas = fila(it)
  chk('mixtas: dos filas, 1000 + 1000', filas.length === 2 && filas[0].cantidad === 1000 && filas[1].cantidad === 1000 && filas[1].cantidad_bultos === 2 && filas[1].contenido_por_bulto === 500, filas)
  c0.escribirCrudo('0,300')
  chk('mixtas: el contenido de una línea en kg con decimales', it.lineas[0].contenido === 0.3, it.lineas[0].contenido)
  b1.escribirCrudo('1.500')
  chk('mixtas: bultos "1.500" = 1500', it.lineas[1].bultos === 1500, it.lineas[1].bultos)
  const t2 = tarjeta(it, ['numeroPapel'], 2)
  chk('mixtas: re-render vuelve a escribir las líneas', t2.lin[2].value === '1.500' && t2.lin[1].value === '0,30', [t2.lin[2].value, t2.lin[1].value])
}
{
  // LA UNIDAD CAMBIA: el campo se vuelve a crear con los decimales nuevos.
  const it = itemBase({ esNuevo: true })
  let t = tarjeta(it, ['numeroPapel'])
  t.por('numeroPapel').teclear('1,5')
  chk('unidad kg: "1,5" es 1,5', it.numeroPapel === 1.5)
  it.unidadMedida = 'un'
  t = tarjeta(it, ['numeroPapel'])
  chk('unidad un: el 1,5 que había no se redondea en silencio: se muestra y se marca',
    t.por('numeroPapel').value === '1,5' && t.por('numeroPapel').parentElement.hijos.some(h => h.className === 'campo-invalido'), t.por('numeroPapel').value)
  t.por('numeroPapel').escribirCrudo('')
  t.por('numeroPapel').teclear('1,5')
  chk('unidad un: un campo de "un" NO acepta "1,5" (queda 15)', it.numeroPapel === 15 && t.por('numeroPapel').value === '15', [it.numeroPapel, t.por('numeroPapel').value])
  chk('unidad un: al corregirlo se saca la marca', !t.por('numeroPapel').parentElement.hijos.some(h => h.className === 'campo-invalido' && !h.quitado))
  t.por('numeroPapel').pegar('1,5')
  chk('unidad un: pegar "1,5" no cambia nada', it.numeroPapel === 15)
  // El <select> de unidad re-renderiza la tarjeta (renderizarItems), que es
  // lo que vuelve a crear el campo.
  const sel = S.campo({ campo: 'unidadMedida' })
  const tt = { dataset: { uid: it.uid }, querySelectorAll: (s) => s === '[data-campo]' ? [sel] : [], querySelector: () => null }
  S.__els.set('wz-lista-items', { querySelectorAll: (s) => s === '.item-mp' ? [tt] : [] })
  S.cablearItems()
  const antes = S.__llamadas.renders
  sel.value = 'kg'
  sel.dispatchEvent({ type: 'change' })
  chk('cambiar la unidad re-renderiza la tarjeta (y con ella el campo)', S.__llamadas.renders === antes + 1 && it.unidadMedida === 'kg')
  // Un número del OCR que no entra en un campo de enteros (2,5 bultos).
  const it2 = itemBase({ interpretacion: 'bultos', numeroPapel: 2.5 })
  const f2 = tarjeta(it2, ['numeroPapel']).por('numeroPapel')
  chk('OCR 2,5 bultos: se muestra 2,5 (no 3) y queda marcado', f2.value === '2,5' && it2.numeroPapel === 2.5 && f2.parentElement.hijos.some(h => h.className === 'campo-invalido'), f2.value)
  const it3 = itemBase({ numeroPapel: 1234.5 })
  const f3 = tarjeta(it3, ['numeroPapel']).por('numeroPapel')
  chk('OCR 1234,5 kg: se escribe "1.234,50" sin marca', f3.value === '1.234,50' && !f3.parentElement.hijos.some(h => h.className === 'campo-invalido'), f3.value)
  const it4 = itemBase({ numeroPapel: null })
  chk('sin dato: el campo queda vacío, no en 0', tarjeta(it4, ['numeroPapel']).por('numeroPapel').value === '')
}

// ══════════════════════════════════════════════════════════════════════════
// 2. IMPORTES → p_importe de registrar_factura_de_ingreso
// ══════════════════════════════════════════════════════════════════════════
const esperas = []
const ramas = []
function wizardCc(extra = {}) {
  return {
    items: [], encabezado: { tipoDoc: 'factura_a', razonSocial: 'X' },
    proveedorMatch: { id: 'p', razon_social: 'DIMAFLO', cuenta_corriente: true },
    desdeGasto: null, importeOcr: null, totalFactura: null, totalFacturaTocado: false, sinStock: false, sinStockMotivo: '', ...extra,
  }
}
ramas.push(async () => {
  const campoTotal = S.__els.get('campo-total-factura')
  chk('total: el campo está enlazado con 2 decimales', campoTotal.type === 'text' && campoTotal.atributos.inputmode === 'decimal')
  for (const [texto, esperado, modo] of [['2.000.000', 2000000, 'crudo'], ['387.300,50', 387300.5, 'crudo'], ['2000000', 2000000, 'teclear'], ['387300,50', 387300.5, 'teclear'], ['387300.50', 387300.5, 'pegar']]) {
    S.estado.wizard = wizardCc()
    S.renderizarBloquesCircuito(S.estado.wizard)
    if (modo === 'crudo') campoTotal.escribirCrudo(texto)
    else if (modo === 'teclear') campoTotal.teclear(texto)
    else campoTotal.pegar(texto)
    chk(`total ${modo} "${texto}": el wizard guarda el NÚMERO`, S.estado.wizard.totalFactura === esperado && S.estado.wizard.totalFacturaTocado === true, S.estado.wizard.totalFactura)
    S.__llamadas.rpc.length = 0
    await S.pasarAlCircuito('ing-1', S.datosParaCircuito(S.estado.wizard))
    const ult = S.__llamadas.rpc.at(-1)
    chk(`total ${modo} "${texto}": p_importe = ${esperado}`, ult?.[0] === 'registrar_factura_de_ingreso' && ult[1].p_importe === esperado, ult)
  }
  // El del OCR entra con ponerNumero y viaja si no se tocó.
  S.estado.wizard = wizardCc({ importeOcr: 387300.5 })
  S.renderizarBloquesCircuito(S.estado.wizard)
  chk('total del OCR: se escribe "387.300,50" en el campo', campoTotal.value === '387.300,50', campoTotal.value)
  S.__llamadas.rpc.length = 0
  await S.pasarAlCircuito('ing-1', S.datosParaCircuito(S.estado.wizard))
  chk('total del OCR sin tocar: viaja 387300.5', S.__llamadas.rpc.at(-1)[1].p_importe === 387300.5)
  campoTotal.escribirCrudo('')
  chk('total borrado: no vuelve el del OCR (null)', S.totalFacturaDe(S.estado.wizard) === null && S.validarCircuitoAntesDeGuardar(S.estado.wizard) !== null)
  S.renderizarBloquesCircuito(S.estado.wizard)
  chk('total borrado: al volver a dibujar sigue vacío', campoTotal.value === '', campoTotal.value)
  // Ocasional: no se pide, no viaja.
  S.estado.wizard = wizardCc({ proveedorMatch: { cuenta_corriente: false }, importeOcr: 5 })
  chk('ocasional: el importe no viaja', S.datosParaCircuito(S.estado.wizard).importe === null)

  // Reintento del detalle: se dibuja sin value, se enlaza y viaja lo tipeado.
  const input = S.campo({ ingreso: 'ing-9' })
  const cont = { querySelectorAll: (s) => s === '.campo-reintento-total' ? [input] : [] }
  S.enlazarReintentosCircuito(cont, { comprobantes: [{ id: 'ing-9', importe_ocr: '387300.5' }] })
  chk('reintento: el campo se enlaza', input.type === 'text' && input.atributos.inputmode === 'decimal')
  chk('reintento: el importe del OCR (texto JSON) se escribe "387.300,50"', input.value === '387.300,50', input.value)
  const input2 = S.campo({ ingreso: 'ing-8' })
  S.enlazarReintentosCircuito({ querySelectorAll: () => [input2] }, { comprobantes: [{ id: 'ing-8', importe_ocr: '12.345' }] })
  chk('reintento: un JSON con 3 decimales no se lee como miles', input2.value === '12,35', input2.value)
  const input3 = S.campo({ ingreso: 'ing-7' })
  S.enlazarReintentosCircuito({ querySelectorAll: () => [input3] }, { comprobantes: [{ id: 'ing-7', importe_ocr: null }] })
  chk('reintento: sin importe del OCR el campo queda vacío', input3.value === '')
  S.estado.listaIngresos = [{ id: 'ing-9', tipo_doc: 'factura_a', razon_social: 'X', proveedores: { razon_social: 'X' } }]
  const btn = { dataset: { ingreso: 'ing-9' }, disabled: false, textContent: '', closest: () => ({ querySelector: () => input }) }
  for (const [texto, esperado] of [['2.000.000', 2000000], ['387.300,50', 387300.5]]) {
    input.escribirCrudo(texto)
    btn.disabled = false
    S.__llamadas.rpc.length = 0
    await S.reintentarCircuito(btn)
    const ult = S.__llamadas.rpc.at(-1)
    chk(`reintento "${texto}": p_importe = ${esperado}`, ult?.[0] === 'registrar_factura_de_ingreso' && ult[1].p_importe === esperado, ult)
  }
})

// ══════════════════════════════════════════════════════════════════════════
// 3. RECEPCIÓN DE TRANSFERENCIAS → cantidad_recibida
// ══════════════════════════════════════════════════════════════════════════
ramas.push(async () => {
  S.estado.recepcion = {
    cabecera: { id: 'tr-1', destino_nombre: 'Mengui' },
    items: [
      { id: 'a', nombre: 'Harina', unidad: 'kg', contenido: 25, enviada: 40000, bultos: null, fraccion: 0, cantidadBase: null, motivo: 'se mojaron', error: null },
      { id: 'b', nombre: 'Lecitina', unidad: 'kg', contenido: null, enviada: 10, bultos: null, fraccion: 0, cantidadBase: null, motivo: 'derrame', error: null },
      { id: 'c', nombre: 'Bolsas', unidad: 'un', contenido: null, enviada: 2000, bultos: null, fraccion: 0, cantidadBase: null, motivo: 'faltaron', error: null },
    ],
  }
  // renderizarItemsInternos real no se usa: el stub recrea los inputs y llama
  // a la cablearItemsInternos REAL.
  const dibujar = () => { S.__internos.campos = []; S.estado.recepcion.items.forEach((it, idx) => S.__internos.campos.push(S.campo({ rec: it.contenido != null ? 'bultos' : 'base', idx: String(idx) }))); S.cablearItemsInternos() }
  dibujar()
  const campoDe = (idx) => S.__internos.campos.find(e => e.dataset.idx === String(idx))
  chk('recepción: bultos de enteros, kg decimal, un de enteros',
    campoDe(0).atributos.inputmode === 'numeric' && campoDe(1).atributos.inputmode === 'decimal' && campoDe(2).atributos.inputmode === 'numeric')
  // Tipear de a una tecla SOBRE EL CAMPO ACTIVO: cada tecla re-renderiza la
  // lista (repintarItemInterno) y el campo es otro.
  function tipear(idx, texto) {
    campoDe(idx).focus()
    for (const ch of texto) S.document.activeElement.teclear(ch)
  }
  tipear(0, '1.500')
  chk('recepción bultos: tipear "1.500" = 1500 bultos', S.estado.recepcion.items[0].bultos === 1500 && campoDe(0).value === '1.500', [S.estado.recepcion.items[0].bultos, campoDe(0).value])
  tipear(1, '8,05')
  chk('recepción kg: "8,05" sobrevive al re-render por tecla (no termina en 85)', S.estado.recepcion.items[1].cantidadBase === 8.05 && campoDe(1).value === '8,05', [S.estado.recepcion.items[1].cantidadBase, campoDe(1).value])
  tipear(2, '1500')
  chk('recepción un: "1500" = 1500 y se muestra "1.500"', S.estado.recepcion.items[2].cantidadBase === 1500 && campoDe(2).value === '1.500', campoDe(2).value)
  dibujar()
  chk('recepción: al volver a dibujar, los números se escriben con ponerNumero', campoDe(0).value === '1.500' && campoDe(1).value === '8,05' && campoDe(2).value === '1.500', [campoDe(0).value, campoDe(1).value, campoDe(2).value])
  S.__llamadas.rpc.length = 0
  S.__setRpc(async () => ({ data: null, error: null }))
  await S.confirmarRecepcion()
  const ult = S.__llamadas.rpc.at(-1)
  const items = ult?.[1]?.p_items || []
  chk('recepción: llama a responder_transferencia_stock', ult?.[0] === 'responder_transferencia_stock', ult)
  chk('recepción: cantidad_recibida 1500 bultos × 25 = 37500', items[0]?.cantidad_recibida === 37500, items[0])
  chk('recepción: cantidad_recibida 8.05 kg', items[1]?.cantidad_recibida === 8.05, items[1])
  chk('recepción: cantidad_recibida 1500 un', items[2]?.cantidad_recibida === 1500, items[2])
})
// De a una: comparten el supabase mockeado.
esperas.push(ramas.reduce((p, f) => p.then(f), Promise.resolve()))

// ══════════════════════════════════════════════════════════════════════════
// 4. FORMATEADORES: IGUAL QUE ANTES, SALVO LA AUSENCIA
// ══════════════════════════════════════════════════════════════════════════
{
  const viejo = new Function(extraerFn(FUENTE_BASE, 'formatearCantidad') + '\n' + extraerFn(FUENTE_BASE, 'formatearNumero') + '\nreturn { formatearCantidad, formatearNumero }')()
  const valores = [0, 1, 25, 250, 1500, 2000000, 0.3, 1.5, 8.05, 387300.5, 1234.567, 0.004, -3, -1500.25, '250', '1500.5']
  let iguales = 0
  for (const v of valores) {
    if (S.formatearCantidad(v, 'kg') === viejo.formatearCantidad(v, 'kg') && S.formatearNumero(v) === viejo.formatearNumero(v) && S.formatearCantidad(v) === viejo.formatearCantidad(v)) iguales++
    else chk(`formatear ${JSON.stringify(v)} igual que antes`, false, [S.formatearCantidad(v, 'kg'), viejo.formatearCantidad(v, 'kg'), S.formatearNumero(v), viejo.formatearNumero(v)])
  }
  chk(`formateadores: ${valores.length} valores presentes se ven igual que antes`, iguales === valores.length)
  chk('formatearCantidad(null) es "—", no "0 kg"', S.formatearCantidad(null, 'kg') === '—' && viejo.formatearCantidad(null, 'kg') === '0 kg')
  chk('formatearCantidad("", undefined, NaN) es "—"', S.formatearCantidad('', 'kg') === '—' && S.formatearCantidad(undefined, 'un') === '—' && S.formatearCantidad(NaN, 'kg') === '—')
  chk('formatearNumero(null) es "—", no "0"', S.formatearNumero(null) === '—' && S.formatearNumero(undefined) === '—')
  chk('un cero REAL sigue siendo "0 kg"', S.formatearCantidad(0, 'kg') === '0 kg' && S.formatearNumero(0) === '0')
}

// ══════════════════════════════════════════════════════════════════════════
// 5. ESTÁTICO
// ══════════════════════════════════════════════════════════════════════════
{
  const sinComentarios = SCRIPT.replace(/^\s*\/\/.*$/gm, '')
  chk('no queda parsearCantidad, textoParaInput, parseImporte ni formatearImporteEnVivo',
    !/\b(parsearCantidad|textoParaInput|parseImporte|formatearImporteEnVivo|textoImporteInput)\s*\(/.test(sinComentarios))
  const inputs = SCRIPT.match(/<input[^>]*>/g) || []
  const numericos = inputs.filter(i => /data-campo="(numeroPapel|contenido|bultosPapel|recibido)"|data-linea-campo=|data-rec="(bultos|base)"|campo-reintento-total/.test(i))
  chk('los 10 inputs de número de las plantillas están', numericos.length === 10, numericos.length)
  chk('ninguno lleva value= (el número entra con ponerNumero)', numericos.every(i => !/\svalue=/.test(i)), numericos.filter(i => /\svalue=/.test(i)))
  const conf = extraerFn(FUENTE, 'confirmarIngreso')
  chk('el insert de materia_prima_items usa filasItemParaBase', /w\.items\.flatMap\(item => filasItemParaBase\(item, ingresoId\)\)/.test(conf) && conf.includes(".from('materia_prima_items').insert(filas)"))
  chk('confirmarIngreso arma el circuito con datosParaCircuito', conf.includes('const circuito = datosParaCircuito(w)'))
  chk('recepción: el payload usa recibidaParaRpc', /cantidad_recibida: recibidaParaRpc\(it\)/.test(extraerFn(FUENTE, 'confirmarRecepcion')))
  chk('los importes se enlazan con 2 decimales', /enlazarCampoNumero\(campoTotal, \{ decimales: 2 \}\)/.test(SCRIPT) && /enlazarCampoNumero\(input, \{ decimales: 2 \}\)/.test(extraerFn(FUENTE, 'enlazarReintentosCircuito')))
  chk('el detalle enlaza el reintento después de dibujarlo', /innerHTML = htmlCircuitoDetalle\([\s\S]{0,200}\}\)\n\s*enlazarReintentosCircuito\(/.test(SCRIPT))
  chk('cablearItems enlaza ANTES de los listeners', (() => { const c = extraerFn(FUENTE, 'cablearItems'); const a = c.indexOf('enlazarCantidadesItem(tarjeta, item)'); const b = c.indexOf("addEventListener('input'"); return a !== -1 && b !== -1 && a < b })())
  chk('kilos y litros: 3 decimales', /const DECIMALES_CANTIDAD = 3\b/.test(SCRIPT))
}

Promise.all(esperas.map(p => p.catch(e => chk('rama async sin excepción', false, String(e && e.stack || e))))).then(() => {
  const total = ok + fallas.length
  for (const f of fallas) console.log('  ✗ ' + f)
  console.log(`${ok}/${total}${fallas.length ? '  ROJO' : '  verde'}`)
  process.exit(fallas.length ? 1 : 0)
})
