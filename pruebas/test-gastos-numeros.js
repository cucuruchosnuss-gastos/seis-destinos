// Números de modulos/gastos.html: los IMPORTES (wizard, edición del gasto,
// edición de la factura pendiente, monto del interés), la TASA del interés (un
// porcentaje, 2 decimales) y el KILOMETRAJE (cantidad ENTERA, en el wizard y
// en la edición) pasan por las funciones compartidas de js/utils.js desde el
// 21/09/2026.
//
// Se EJECUTA el código real de los dos archivos: las funciones del módulo se
// extraen del <script> y las de números salen del utils.js real
// (fuenteNumeros). Los campos son inputFalso(), que tipea, borra y pega como el
// navegador, y el número se verifica EN LO QUE VIAJA (insert/update/rpc),
// capturado con un supabase mockeado o con la función que arma el payload:
// siempre sale del campo enlazado, nunca de una constante.
//
// Qué se prueba:
//  1. Wizard: importe y kilometraje tipeados / pegados → armarGasto() y
//     armarFacturaPendiente() exactos; las validaciones de salida del paso
//     Datos (incluida "Enviar a pendiente", con el bloque REAL del archivo).
//  2. OCR (número) y "Cargar gasto" desde un ingreso → ponerNumero.
//  3. Edición del gasto y de la factura: el campo abre con el número de la
//     base (null → vacío, nunca "0,00") y lo que viaja al update / a la RPC.
//  4. Interés: monto y tasa → p_monto y p_tasa_pct de agregar_interes_factura.
//  5. formatearImporte / formatearImporteDuplicado: IGUAL que antes (contra el
//     baseline fijo) para todo valor presente, "—" para un importe ausente.
//  6. Estático: no quedan parseImporte / formatearImporteEnVivo /
//     type="number", y ningún IDENTIFICADOR se enlaza.
//
// Archivo bajo prueba: ARCHIVO_TEST, o modulos/gastos.html.
// Baseline (el archivo antes de la migración): commit d79765b, FIJO.

const path = require('path')
const { execFileSync } = require('child_process')
const { construirCon } = require('./sandbox')
const { fuenteNumeros, inputFalso } = require('./numeros-comun')
const { extraerFn } = require('./extraer')
const { leer } = require('./circuito-comun')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/gastos.html')
const FUENTE = leer(ARCHIVO)
const BASELINE = 'd79765b'
const FUENTE_BASE = execFileSync('git', ['show', `${BASELINE}:modulos/gastos.html`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
if (FUENTE_BASE.length < 100000) throw new Error('no se pudo leer el baseline ' + BASELINE)

let ok = 0
const fallas = []
function chk(nombre, condicion, detalle) {
  if (condicion) ok++
  else fallas.push(nombre + (detalle !== undefined ? ` — ${typeof detalle === 'string' ? detalle : JSON.stringify(detalle)}` : ''))
}

// El bloque REAL del listener de "Enviar a pendiente" (top-level del módulo):
// se mete en el sandbox para que corra con sus funciones.
function bloqueEnviarPendiente() {
  const ini = FUENTE.indexOf("    document.getElementById('btn-enviar-pendiente').addEventListener('click'")
  const fin = FUENTE.indexOf('\n    })\n', ini)
  if (ini === -1 || fin === -1) throw new Error('no se encontró el listener de btn-enviar-pendiente')
  return FUENTE.slice(ini, fin + 7)
}

const PRELUDIO = `
  ${fuenteNumeros()}
  var __inputFalso = ${inputFalso.toString()}
  var console = { log(){}, warn(){}, error: globalThis.console.error }

  // --- DOM falso -------------------------------------------------------
  // Cada elemento es un inputFalso (tipea, borra y pega como el navegador),
  // con lo que el módulo le pide a un nodo. Al asignar innerHTML, cada id de
  // la plantilla pasa a ser un elemento NUEVO, con el value="" que la
  // plantilla le haya puesto: así una plantilla que vuelva a escribir el
  // número en value="" se ve igual que en el navegador.
  var __clases = []
  function nuevoEl(id, valor) {
    const el = __inputFalso(valor || '')
    const agregar = el.addEventListener
    el.__l = {}
    el.addEventListener = (t, f) => { (el.__l[t] = el.__l[t] || []).push(f); agregar(t, f) }
    el.clic = async (target) => { for (const f of el.__l.click || []) await f({ type: 'click', target: target || el }) }
    Object.assign(el, {
      id, hidden: false, disabled: false, textContent: '', style: {}, dataset: {}, className: '',
      options: { length: 0 }, focus(){}, click(){},
      classList: { add(c){ __clases.push([id, c]) }, remove(){}, toggle(){}, contains(){ return false } },
      closest: () => ({ classList: { add(c){ __clases.push([id, c]) }, remove(){} } }),
      querySelectorAll: () => [], querySelector: () => null,
    })
    let html = ''
    Object.defineProperty(el, 'innerHTML', {
      get() { return html },
      set(h) {
        html = String(h)
        for (const m of html.matchAll(/<[a-z]+\\b[^>]*\\bid="([^"]+)"[^>]*>/g)) {
          const v = /\\bvalue="([^"]*)"/.exec(m[0])
          const valor = v ? v[1].replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&') : ''
          __els.set(m[1], nuevoEl(m[1], valor))
        }
      },
    })
    return el
  }
  var __els = new Map()
  var document = {
    getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) },
    querySelector(sel) { return sel.startsWith('#') ? document.getElementById(sel.slice(1)) : null },
    querySelectorAll: () => [],
    createElement: () => nuevoEl('creado'),
  }

  // --- dependencias externas, stubeadas --------------------------------
  var __llamadas = []
  var supabase = {
    from(tabla) {
      return {
        update(c) { __llamadas.push({ tipo: 'update', tabla, datos: JSON.parse(JSON.stringify(c)) }); return { eq: async () => ({ error: null }) } },
        insert(f) { __llamadas.push({ tipo: 'insert', tabla, datos: JSON.parse(JSON.stringify(f)) }); return { select: () => ({ single: async () => ({ data: { id: 'nuevo' }, error: null }) }) } },
      }
    },
    rpc: async (nombre, params) => { __llamadas.push({ tipo: 'rpc', nombre, params: JSON.parse(JSON.stringify(params)) }); return { data: null, error: null } },
  }
  var __errores = []
  function mostrarError(m) { __errores.push(m) } function mostrarExito() {}
  function seleccionarTipoDoc() {} function seleccionarProveedor(p) { proveedorSeleccionado = p.id }
  async function abrirWizard() {} function renderizarGrillaDestino() {} function renderizarGrillaCategorias() {}
  function renderizarAvisoDesdeIngreso() {} async function archivoDeIngreso() { return null }
  async function prepararArchivoComprobante(a) { return a }
  function detectarDuplicadoEdicion() {} function abrirDuplicadoEnPestana() {}
  function poblarSelectMoneda(id, v) { document.getElementById(id).value = v }
  function actualizarSelectorCuentaEdicion() {} function mostrarDetalleGasto() {}
  function cerrarDetalleGasto() {} function cargarLista() {}
  function mostrarDetalleFactura() {} function renderizarSugerenciasProveedorEn() {}
  function filtrarProveedores() { return [] } function seleccionarProveedorEdicion() {}
  async function buscarComprobanteYaCargado() {} function irASubpaso(p) { __subpaso = p }
  var __subpaso = null
  var BYTES_MAXIMO_COMPROBANTE = 10 * 1024 * 1024
  var CATEGORIA_MATERIA_PRIMA = 'Insumos - Materia Prima'
  var MEDIOS_PAGO_LABEL = { efectivo: 'Efectivo', transferencia: 'Transferencia / QR', cheque: 'Cheque' }

  // Variables de módulo que leen armarGasto() y validarSubpaso().
  var categoriaSeleccionada = 'cat-1', tipDocSeleccionado = 'factura_a', medioPagoSeleccionado = 'cheque'
  var unidadSeleccionada = 'u1', vehiculoSeleccionado = null, viaVehiculos = false, proveedorSeleccionado = null
  var detectorEdicionFactura = null, contextoProveedorNuevo = 'wizard'

  var estado = {
    wizard: { camposOcr: new Set(), esPendiente: false, fotoUrl: null, desdeIngreso: null },
    listaGastos: [], facturaDetalleActual: null,
    fabrica: FABRICA_SIN_DATOS, // de utils.js, que fuenteNumeros() ya trae entero
    maestros: {
      unidades: [{ id: 'u1', nombre: 'Cucuruchos Nuss' }], vehiculos: [], empleados: [{ id: 'e1', nombre: 'Ana' }],
      categorias: [{ id: 'cat-1', nombre: 'Insumos - Materia Prima' }], proyectos: [],
      proveedores: [{ id: 'p1', razon_social: 'PROV SA' }],
    },
  }

  // El listener REAL de "Enviar a pendiente".
  ${bloqueEnviarPendiente()}
`

const FUNCIONES = [
  'esc', 'formatearImporte', 'formatearImporteDuplicado', 'fechaAPeriodo', 'opcionesProyectoEdicion', 'diasEntre',
  'enlazarCamposNumeroWizard', 'importeDelWizard', 'kilometrajeDelWizard',
  'validarSubpaso', 'armarGasto', 'armarFacturaPendiente', 'prellenarPaso2', 'importeDeOcr', 'cargarGastoDesdeIngreso',
  'esCuentaDeTablet', 'personasNoTablet', 'personasElegibles', 'personasParaEditar', 'unidadesElegibles', 'unidadesParaEditar',
  'mostrarFormularioEdicionGasto', 'mostrarFormularioEdicionFactura', 'mostrarFormularioInteres',
]

function sandbox() {
  return construirCon(ARCHIVO, {
    preludio: PRELUDIO, funciones: FUNCIONES,
    retorno: `estado, __els, __errores, __clases, __llamadas(){ return __llamadas }, __limpiar(){ __llamadas = []; __errores.length = 0 },
      __doc: document, __set(k, v){ eval(k + ' = v') }, __subpaso(){ return __subpaso }`,
  })
}

async function main() {
  // ══ 1. Wizard ═══════════════════════════════════════════════════════════
  const casosImporte = [
    ['teclear 2000000', (el) => el.teclear('2000000'), '2.000.000', 2000000],
    ['escribir crudo "2.000.000"', (el) => el.escribirCrudo('2.000.000'), '2.000.000', 2000000],
    ['escribir crudo "387.300,50"', (el) => el.escribirCrudo('387.300,50'), '387.300,50', 387300.5],
    ['teclear 387300,50', (el) => el.teclear('387300,50'), '387.300,50', 387300.5],
    ['teclear 387300.50 (el punto del teclado es la coma)', (el) => el.teclear('387300.50'), '387.300,50', 387300.5],
    ['pegar "387300.50" (el parser viejo daba 38.730.050)', (el) => el.pegar('387300.50'), '387.300,50', 387300.5],
    ['pegar "1.500"', (el) => el.pegar('1.500'), '1.500', 1500],
    ['teclear 0,50', (el) => el.teclear('0,50'), '0,50', 0.5],
  ]
  for (const [nombre, accion, visto, numero] of casosImporte) {
    const S = sandbox()
    S.enlazarCamposNumeroWizard()
    const imp = S.__els.get('campo-importe')
    chk('wizard: campo-importe queda type=text con teclado decimal', imp.type === 'text' && imp.atributos.inputmode === 'decimal')
    accion(imp)
    chk(`wizard importe (${nombre}): el campo muestra ${visto}`, imp.value === visto, imp.value)
    chk(`wizard importe (${nombre}): armarGasto().importe = ${numero}`, S.armarGasto().importe === numero, S.armarGasto().importe)
    chk(`wizard importe (${nombre}): armarFacturaPendiente().importe = ${numero}`, S.armarFacturaPendiente().importe === numero, S.armarFacturaPendiente().importe)
  }

  // Validación de salida del paso Datos (validarSubpaso) y "Enviar a pendiente".
  {
    const armar = (texto) => {
      const S = sandbox()
      S.enlazarCamposNumeroWizard()
      S.__els.get('campo-importe').escribirCrudo(texto)
      return S
    }
    for (const [texto, esperado] of [['2.000.000', true], ['0,50', true], ['387.300,50', true], ['', false], ['0', false]]) {
      const S = armar(texto)
      S.__doc.getElementById('campo-fecha').value = '2026-10-05'
      S.__doc.getElementById('campo-fecha-pago').value = '2026-10-06'
      S.__doc.getElementById('campo-razon-social').value = 'PROV SA'
      chk(`validarSubpaso('datos') con importe "${texto}" → ${esperado}`, S.validarSubpaso('datos') === esperado, S.__errores)

      // Enviar a pendiente: el listener real, con el mismo campo.
      S.__limpiar()
      const btn = S.__els.get('btn-enviar-pendiente')
      await btn.clic({ disabled: false })
      const paso = S.__subpaso()
      chk(`"Enviar a pendiente" con importe "${texto}" → ${esperado ? 'avanza' : 'frena'}`,
        esperado ? paso === 'destino' : (paso === null && S.__errores.some(e => /importe/.test(e))), { paso, errores: S.__errores })
    }
  }

  // Kilometraje: ENTERO.
  {
    const casosKm = [
      ['teclear 85000', (el) => el.teclear('85000'), '85.000', 85000],
      ['teclear "85.000" (el punto no es decimal en un entero)', (el) => el.teclear('85.000'), '85.000', 85000],
      ['escribir crudo "85.000"', (el) => el.escribirCrudo('85.000'), '85.000', 85000],
      ['pegar "85.000"', (el) => el.pegar('85.000'), '85.000', 85000],
      ['pegar "1.234.567"', (el) => el.pegar('1.234.567'), '1.234.567', 1234567],
      ['teclear 85000,5 (la coma no entra)', (el) => el.teclear('85000,5'), '850.005', 850005],
    ]
    for (const [nombre, accion, visto, numero] of casosKm) {
      const S = sandbox()
      S.enlazarCamposNumeroWizard()
      const km = S.__els.get('campo-kilometraje')
      chk('wizard: kilometraje queda type=text con teclado numérico', km.type === 'text' && km.atributos.inputmode === 'numeric', [km.type, km.atributos])
      accion(km)
      chk(`kilometraje (${nombre}): el campo muestra ${visto}`, km.value === visto, km.value)
      chk(`kilometraje (${nombre}): armarGasto().kilometraje = ${numero}`, S.armarGasto().kilometraje === numero, S.armarGasto().kilometraje)
      chk(`kilometraje (${nombre}): armarFacturaPendiente().kilometraje = ${numero}`, S.armarFacturaPendiente().kilometraje === numero)
    }
    // Pegar un kilometraje con decimales no se pega (no se adivina).
    const S = sandbox()
    S.enlazarCamposNumeroWizard()
    const km = S.__els.get('campo-kilometraje')
    km.pegar('85000,5')
    chk('kilometraje: pegar "85000,5" no pega nada', km.value === '' && S.armarGasto().kilometraje === null, km.value)
    // Vía vehículos, sin kilometraje → no avanza; con kilometraje → avanza.
    S.__set('viaVehiculos', true)
    S.__doc.getElementById('campo-empleado').value = 'e1'
    chk('validarSubpaso(detalles): vía vehículos sin kilometraje frena', S.validarSubpaso('detalles') === false)
    km.teclear('120000')
    chk('validarSubpaso(detalles): vía vehículos con "120.000" avanza', S.validarSubpaso('detalles') === true, S.__errores)
  }

  // ══ 2. OCR y "Cargar gasto" desde un ingreso ═════════════════════════════
  for (const [dato, visto, numero] of [[387300.5, '387.300,50', 387300.5], [2000000, '2.000.000', 2000000], ['15400.50', '15.400,50', 15400.5], [1500, '1.500', 1500]]) {
    const S = sandbox()
    S.enlazarCamposNumeroWizard()
    S.prellenarPaso2({ importe: dato })
    const imp = S.__els.get('campo-importe')
    chk(`OCR importe ${JSON.stringify(dato)}: el campo muestra ${visto}`, imp.value === visto, imp.value)
    chk(`OCR importe ${JSON.stringify(dato)}: armarGasto().importe = ${numero}`, S.armarGasto().importe === numero, S.armarGasto().importe)
    chk(`OCR importe ${JSON.stringify(dato)}: se marca como leído de la foto`, S.estado.wizard.camposOcr.has('importe'))
  }
  {
    const S = sandbox()
    S.enlazarCamposNumeroWizard()
    S.prellenarPaso2({ importe: 'no se leyó' })
    const imp = S.__els.get('campo-importe')
    chk('OCR importe ilegible: el campo queda vacío (no "NaN")', imp.value === '', imp.value)
    chk('OCR importe ilegible: NO se marca como leído de la foto', !S.estado.wizard.camposOcr.has('importe'))
  }
  for (const [texto, visto, numero] of [['522261.82', '522.261,82', 522261.82], ['4418400', '4.418.400', 4418400], ['1936886.1', '1.936.886,10', 1936886.1]]) {
    const S = sandbox()
    S.enlazarCamposNumeroWizard()
    await S.cargarGastoDesdeIngreso({ importe_ocr: texto, numero_doc: '0001-00000123', razon_social: 'PROV SA', fecha: '2026-10-05', proveedor_id: 'p1', unidad_negocio_id: 'u1', foto_url: null })
    const imp = S.__els.get('campo-importe')
    chk(`"Cargar gasto" con importe_ocr "${texto}": el campo muestra ${visto}`, imp.value === visto, imp.value)
    chk(`"Cargar gasto" con importe_ocr "${texto}": armarGasto().importe = ${numero}`, S.armarGasto().importe === numero, S.armarGasto().importe)
  }
  chk('importeDeOcr: un número JSON como texto con punto decimal ("150.5") es 150,5', sandbox().importeDeOcr('150.5') === 150.5)

  // ══ 3. Edición del gasto ═════════════════════════════════════════════════
  async function editarGasto(g, accion) {
    const S = sandbox()
    S.estado.listaGastos = [g]
    S.mostrarFormularioEdicionGasto(g.id)
    const imp = S.__els.get('edit-importe'), km = S.__els.get('edit-kilometraje')
    const abierto = { imp: imp.value, km: km.value, tipoImp: imp.type, tipoKm: km.type, modoKm: km.atributos.inputmode }
    S.__els.get('edit-empleado').value = 'e1'
    S.__els.get('edit-categoria').value = 'cat-1'
    S.__els.get('edit-unidad').value = 'u1'
    S.__els.get('edit-medio-pago').value = 'cheque'
    S.__els.get('edit-fecha-pago').value = '2026-10-06'
    if (accion) accion(imp, km)
    S.__limpiar()
    await S.__els.get('btn-guardar-edicion').clic()
    const up = S.__llamadas().find(l => l.tipo === 'update' && l.tabla === 'gastos')
    const sync = S.__llamadas().find(l => l.tipo === 'rpc' && l.nombre === 'sincronizar_pago_directo_proveedor')
    return { abierto, up: up && up.datos, sync: sync && sync.params, errores: S.__errores.slice() }
  }
  const gBase = { id: 'g1', importe: 387300.5, moneda: 'ARS', kilometraje: 85000, medio_pago: 'cheque', fecha: '2026-10-05', fecha_pago: '2026-10-06' }
  {
    const r = await editarGasto(gBase)
    chk('edición gasto: el importe abre con "387.300,50"', r.abierto.imp === '387.300,50', r.abierto.imp)
    chk('edición gasto: el kilometraje abre con "85.000"', r.abierto.km === '85.000', r.abierto.km)
    chk('edición gasto: importe type=text, kilometraje type=text numérico', r.abierto.tipoImp === 'text' && r.abierto.tipoKm === 'text' && r.abierto.modoKm === 'numeric', r.abierto)
    chk('edición gasto sin tocar: el update lleva importe 387300.5', r.up && r.up.importe === 387300.5, r.up)
    chk('edición gasto sin tocar: el update lleva kilometraje 85000', r.up && r.up.kilometraje === 85000, r.up)
    chk('edición gasto sin tocar: sincronizar lleva p_importe 387300.5', r.sync && r.sync.p_importe === 387300.5, r.sync)
  }
  for (const [nombre, texto, numero] of [['"2.000.000"', '2.000.000', 2000000], ['"387.300,50"', '387.300,50', 387300.5]]) {
    const r = await editarGasto(gBase, (imp, km) => { imp.escribirCrudo(texto); km.escribirCrudo(''); km.teclear('120000') })
    chk(`edición gasto con ${nombre}: update importe = ${numero}`, r.up && r.up.importe === numero, r.up)
    chk(`edición gasto con ${nombre}: sincronizar p_importe = ${numero}`, r.sync && r.sync.p_importe === numero, r.sync)
    chk(`edición gasto: kilometraje retipeado 120000 → 120000`, r.up && r.up.kilometraje === 120000, r.up)
  }
  {
    const r = await editarGasto({ ...gBase, importe: null, kilometraje: null })
    chk('edición gasto con importe null: el campo abre VACÍO (no "0,00")', r.abierto.imp === '', r.abierto.imp)
    chk('edición gasto con kilometraje null: el campo abre vacío', r.abierto.km === '', r.abierto.km)
    chk('edición gasto con kilometraje null: el update lleva null', r.up && r.up.kilometraje === null, r.up)
  }
  {
    const r = await editarGasto({ ...gBase, importe: 1500 }, (imp) => imp.teclear('5'))
    chk('edición gasto: tipear al final de "1.500" da 15.005', r.up && r.up.importe === 15005, r.up)
  }

  // ══ 3b. Edición de la factura pendiente ══════════════════════════════════
  async function editarFactura(f, accion) {
    const S = sandbox()
    S.estado.facturaDetalleActual = f
    S.mostrarFormularioEdicionFactura(f.id)
    const imp = S.__els.get('edit-factura-importe')
    const abierto = { imp: imp.value, tipo: imp.type }
    if (accion) accion(imp)
    S.__limpiar()
    await S.__els.get('btn-guardar-edicion-factura').clic()
    const rpc = S.__llamadas().find(l => l.tipo === 'rpc' && l.nombre === 'editar_factura_pendiente')
    return { abierto, p: rpc && rpc.params, errores: S.__errores.slice() }
  }
  const fBase = { id: 'f1', importe: 1500, moneda: 'ARS', fecha_factura: '2026-10-05', razon_social: 'PROV SA', numero_comprobante: '0001-00000123', proveedor_id: 'p1', proveedores: { razon_social: 'PROV SA' }, estado: 'pendiente' }
  {
    const r = await editarFactura(fBase)
    chk('edición factura: el importe abre con "1.500"', r.abierto.imp === '1.500', r.abierto)
    chk('edición factura sin tocar: p_importe = 1500', r.p && r.p.p_importe === 1500, r)
  }
  for (const [texto, numero] of [['2.000.000', 2000000], ['387.300,50', 387300.5]]) {
    const r = await editarFactura(fBase, (imp) => imp.escribirCrudo(texto))
    chk(`edición factura con "${texto}": p_importe = ${numero}`, r.p && r.p.p_importe === numero, r)
  }
  {
    const r = await editarFactura({ ...fBase, importe: null })
    chk('edición factura con importe null: el campo abre VACÍO (no "0,00")', r.abierto.imp === '', r.abierto)
    chk('edición factura con importe vacío: no se guarda', !r.p && r.errores.some(e => /importe/.test(e)), r)
  }

  // ══ 4. Interés ═══════════════════════════════════════════════════════════
  const fInt = { id: 'f2', importe: 100000, saldo_pendiente: 100000, moneda: 'ARS', fecha_factura: '2026-08-01' }
  async function interes(configurar) {
    const S = sandbox()
    S.estado.facturaDetalleActual = fInt
    S.mostrarFormularioInteres(fInt.id)
    await configurar(S)
    S.__limpiar()
    await S.__els.get('btn-confirmar-interes').clic()
    const rpc = S.__llamadas().find(l => l.tipo === 'rpc' && l.nombre === 'agregar_interes_factura')
    return { S, p: rpc && rpc.params }
  }
  for (const [nombre, accion, numero] of [
    ['teclear 2000000', (el) => el.teclear('2000000'), 2000000],
    ['escribir crudo "387.300,50"', (el) => el.escribirCrudo('387.300,50'), 387300.5],
    ['pegar "1250.5"', (el) => el.pegar('1250.5'), 1250.5],
  ]) {
    const { S, p } = await interes(async (S) => {
      const m = S.__els.get('campo-interes-monto')
      chk('interés: el monto queda type=text', m.type === 'text')
      accion(m)
    })
    chk(`interés monto (${nombre}): p_monto = ${numero}`, p && p.p_monto === numero, p)
    chk(`interés monto (${nombre}): p_tasa_pct = null`, p && p.p_tasa_pct === null, p)
  }
  {
    // La info "≈ X% anual" sale del monto leído del campo.
    const S = sandbox()
    S.estado.facturaDetalleActual = fInt
    S.mostrarFormularioInteres(fInt.id)
    S.__els.get('campo-interes-monto').escribirCrudo('2.000.000')
    const txt = S.__els.get('interes-tasa-info').textContent
    const dias = S.diasEntre('2026-08-01', new Date().toISOString().slice(0, 10))
    const esperado = `≈ ${((2000000 / 100000) / (dias / 365) * 100).toFixed(2)}% anual`
    chk('interés: la tasa anual informada sale del monto 2.000.000', txt === esperado, [txt, esperado])
  }
  for (const [texto, tasa] of [['3,5', 3.5], ['12,25', 12.25], ['1.250,5', 1250.5]]) {
    const { S, p } = await interes(async (S) => {
      await S.__els.get('grilla-modo-interes').clic({ closest: () => ({ dataset: { modo: 'tasa' } }) })
      S.__els.get('campo-interes-fecha').value = '2026-08-31'
      const t = S.__els.get('campo-interes-tasa')
      chk('interés: la tasa queda type=text', t.type === 'text')
      t.escribirCrudo(texto)
    })
    const esperadoMonto = 100000 * (tasa / 100) * (30 / 30)
    chk(`interés tasa "${texto}": p_tasa_pct = ${tasa}`, p && p.p_tasa_pct === tasa, p)
    chk(`interés tasa "${texto}": p_monto = base × tasa × días/30 = ${esperadoMonto}`, p && Math.abs(p.p_monto - esperadoMonto) < 1e-9, p)
    chk(`interés tasa "${texto}": se muestra el monto calculado`, S.__els.get('interes-monto-calculado').textContent === `Monto calculado: ${S.formatearImporte(esperadoMonto, 'ARS')}`, S.__els.get('interes-monto-calculado').textContent)
  }

  // ══ 5. Formateadores ═════════════════════════════════════════════════════
  {
    const S = sandbox()
    const viejo = new Function(extraerFn(FUENTE_BASE, 'formatearImporte') + '\nreturn formatearImporte')()
    const viejoDup = new Function(extraerFn(FUENTE_BASE, 'formatearImporteDuplicado') + '\nreturn formatearImporteDuplicado')()
    const valores = [0, 1, 1.5, 10, 999.99, 1000, 1500, 387300.5, 2000000, 1349799.77, -1234.5, 0.01, 123456789.12, '1500', 1234.567]
    for (const v of valores) {
      for (const moneda of ['ARS', 'USD']) {
        chk(`formatearImporte(${JSON.stringify(v)}, ${moneda}) igual que antes`, S.formatearImporte(v, moneda) === viejo(v, moneda), [S.formatearImporte(v, moneda), viejo(v, moneda)])
      }
      chk(`formatearImporteDuplicado(${JSON.stringify(v)}) igual que antes`, S.formatearImporteDuplicado(v) === viejoDup(v), [S.formatearImporteDuplicado(v), viejoDup(v)])
    }
    for (const v of [null, undefined, '', NaN, 'abc']) {
      chk(`formatearImporte(${String(v)}) = "—"`, S.formatearImporte(v) === '—', S.formatearImporte(v))
      chk(`formatearImporte(${String(v)}, USD) = "—"`, S.formatearImporte(v, 'USD') === '—')
      chk(`formatearImporteDuplicado(${String(v)}) = null`, S.formatearImporteDuplicado(v) === null)
    }
    chk('el viejo daba "$ 0,00" con \'\' (lo que se arregló)', viejo('') === '$ 0,00')
    chk('formatearImporte(387300.5) = "$ 387.300,50"', S.formatearImporte(387300.5) === '$ 387.300,50')
  }

  // ══ 6. Estático ══════════════════════════════════════════════════════════
  {
    const script = FUENTE.slice(FUENTE.indexOf('<script type="module">'))
    const codigo = script.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n')
    chk('no queda parseImporte', !/parseImporte\s*\(/.test(codigo))
    chk('no queda formatearImporteEnVivo', !/formatearImporteEnVivo\s*\(/.test(codigo))
    chk('no queda ningún type="number" en el archivo (fuera de comentarios)', !/type="number"/.test(FUENTE.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n')))
    chk('no queda toLocaleString sobre un importe', !/importe\)?\.toLocaleString|Number\([a-z]+\.importe\)\.toLocaleString/.test(codigo))
    chk('ninguna plantilla pone un número en value="${Number(', !/value="\$\{Number\(/.test(codigo))
    const enlaces = [...codigo.matchAll(/enlazarCampoNumero\(([^,)]+)/g)].map(m => m[1].trim())
    const permitidos = new Set([
      "document.getElementById('campo-importe'", "document.getElementById('campo-kilometraje'",
      'campoEditImporte', 'campoEditKm', 'campoEditFacturaImporte',
      "document.getElementById('campo-interes-monto'", "document.getElementById('campo-interes-tasa'",
    ])
    chk('se enlazan exactamente los 7 campos de importe / tasa / kilometraje', enlaces.length === 7 && enlaces.every(e => permitidos.has(e)), enlaces)
    chk('los identificadores NO se enlazan (número de comprobante, CUIT)', !/enlazarCampoNumero\([^)]*(numero|cuit)/i.test(codigo))
    const importes = /enlazarCampoNumero\(document\.getElementById\('campo-importe'\), \{ decimales: 2 \}\)/.test(codigo) &&
      /enlazarCampoNumero\(campoEditImporte, \{ decimales: 2 \}\)/.test(codigo) &&
      /enlazarCampoNumero\(campoEditFacturaImporte, \{ decimales: 2 \}\)/.test(codigo)
    chk('los importes se enlazan con 2 decimales', importes)
    chk('el kilometraje se enlaza con 0 decimales en los dos lugares',
      /enlazarCampoNumero\(document\.getElementById\('campo-kilometraje'\), \{ decimales: 0 \}\)/.test(codigo) &&
      /enlazarCampoNumero\(campoEditKm, \{ decimales: 0 \}\)/.test(codigo))
  }

  const total = ok + fallas.length
  for (const f of fallas) console.log('  ✗ ' + f)
  console.log(`${ok}/${total}${fallas.length ? '  ROJO' : '  verde'}`)
  process.exit(fallas.length ? 1 : 0)
}

main().catch(e => { console.log('EXCEPCIÓN', e && e.stack || e); process.exit(1) })
