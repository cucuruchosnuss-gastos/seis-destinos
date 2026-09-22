// Números de modulos/cuentas-corrientes.html: los CUATRO campos de importe
// —monto del pago, los montos por factura de la sugerencia FIFO editable, el
// monto a aplicar de un crédito y "Cargar importe" de una descarga sin
// importe (total o precio por unidad)— pasan por las funciones compartidas de
// js/utils.js desde el 21/09/2026.
//
// Se EJECUTA el código real de los dos archivos: las funciones del módulo se
// extraen del <script>, los listeners que viven sueltos en el top-level
// (el del cambio de factura del crédito y los tres delegados de "Cargar
// importe") se extraen tal cual y se registran contra el DOM falso, y las
// funciones de números salen del utils.js real (fuenteNumeros). Los campos son
// inputFalso(), que tipea, borra y pega como el navegador, y el número se
// verifica EN LO QUE VIAJA a la RPC, capturado con un supabase mockeado.
//
// Qué se prueba:
//  1. Pago: p_monto de registrar_pago_proveedor y de sugerir_facturas_fifo.
//  2. FIFO: los montos por factura se escriben con ponerNumero (sugerencia y
//     tildar), y lo que se tipea viaja en p_aplicaciones[].monto_aplicado.
//  3. Crédito: el prefill sale del NÚMERO de la factura (no del texto de la
//     <option>), y lo tipeado viaja en p_monto de aplicar_credito_a_factura.
//  4. Cargar importe: el campo se dibuja SIN value, se enlaza al insertar,
//     sobrevive a un redibujado, y p_importe de completar_importe_factura es
//     el TOTAL (también con precio por unidad × cantidad).
//  5. Formateadores: IGUAL que antes (baseline fijo) para todo valor presente,
//     "—" para un importe ausente; la moneda sigue escapada en importeHtml.
//  6. Estático.
//
// Archivo bajo prueba: ARCHIVO_TEST, o modulos/cuentas-corrientes.html.
// Baseline (el archivo antes de la migración): commit d8372ff, FIJO.

const path = require('path')
const { execFileSync } = require('child_process')
const { construirCon, scriptModulo } = require('./sandbox')
const { fuenteNumeros, inputFalso } = require('./numeros-comun')
const { extraerFn, cuerpoDesde } = require('./extraer')
const { leer } = require('./circuito-comun')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/cuentas-corrientes.html')
const FUENTE = leer(ARCHIVO)
const SCRIPT = scriptModulo(ARCHIVO)
const BASELINE = 'd8372ff'
const FUENTE_BASE = execFileSync('git', ['show', `${BASELINE}:modulos/cuentas-corrientes.html`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
if (FUENTE_BASE.length < 100000) throw new Error('no se pudo leer el baseline ' + BASELINE)

let ok = 0
const fallas = []
function chk(nombre, condicion, detalle) {
  if (condicion) ok++
  else fallas.push(nombre + (detalle !== undefined ? ` — ${typeof detalle === 'string' ? detalle : JSON.stringify(detalle)}` : ''))
}

// Un listener suelto del top-level, tal cual está en el archivo: desde
// `inicio` hasta el paréntesis que cierra su addEventListener.
function bloqueListener(inicio) {
  const i = SCRIPT.indexOf(inicio)
  if (i === -1) throw new Error('no está el listener: ' + inicio)
  const paren = i + inicio.lastIndexOf('addEventListener(') + 'addEventListener'.length
  return SCRIPT.slice(i, paren) + cuerpoDesde(SCRIPT, paren)
}
const LISTENERS = [
  "listaMovFicha.addEventListener('click'",
  "listaMovFicha.addEventListener('change'",
  "listaMovFicha.addEventListener('input'",
  "document.getElementById('campo-factura-credito').addEventListener('change'",
].map(bloqueListener).join('\n')

const PRELUDIO = `
  ${fuenteNumeros()}
  var __inputFalso = ${inputFalso.toString()}
  var console = { log(){}, warn(){}, error(){} }
  var location = { href: 'https://x/cc.html' }

  // --- DOM falso -----------------------------------------------------------
  // Los listeners reciben ev.target (inputFalso no lo pone).
  function conTarget(el) {
    const add = el.addEventListener
    el.addEventListener = (t, f) => add(t, (ev) => { if (ev && !ev.target) ev.target = el; return f(ev) })
  }
  function nuevoEl(id, valor) {
    const el = __inputFalso(valor || '')
    Object.assign(el, {
      id, hidden: false, disabled: false, textContent: '', style: {}, dataset: {}, checked: false,
      classList: { add(){}, remove(){}, toggle(){}, contains(){ return false } },
      querySelectorAll: () => [], querySelector: () => null, focus(){}, closest: () => null,
      selectedOptions: [],
    })
    conTarget(el)
    return el
  }
  function attr(a, k) { const m = new RegExp(k + '="([^"]*)"').exec(a); return m ? m[1] : null }
  // Un contenedor que "parsea" su innerHTML: crea un elemento por <input>,
  // con sus clases, data-index y value (si la plantilla trajera uno).
  function contenedor(id) {
    const c = nuevoEl(id)
    let html = ''
    c.hijos = []
    c.total = null
    const oy = {}
    c.addEventListener = (t, f) => { (oy[t] = oy[t] || []).push(f) }
    c.__disparar = (t, ev) => { for (const f of oy[t] || []) f(ev) }
    Object.defineProperty(c, 'innerHTML', {
      get() { return html },
      set(v) {
        html = String(v)
        c.hijos = []
        const total = nuevoEl('total')
        total.innerHTML = ''
        c.total = total
        for (const m of html.matchAll(/<input([^>]*)>/g)) {
          const a = m[1]
          const el = nuevoEl('hijo', attr(a, 'value') || '')
          el.clases = (attr(a, 'class') || '').split(/\\s+/)
          el.type = attr(a, 'type') || 'text'
          el.atributos.valueEnPlantilla = attr(a, 'value')
          el.checked = /\\schecked/.test(a)
          if (attr(a, 'data-index') != null) el.dataset.index = attr(a, 'data-index')
          el.closest = (sel) => {
            if (sel.startsWith('.') && el.clases.includes(sel.slice(1))) return el
            if (sel === '.cargar-importe-cc') return { querySelector: () => total }
            return null
          }
          // Burbujeo: DESPUÉS de los listeners del propio campo, como en el navegador.
          for (const k of ['teclear', 'borrar', 'pegar', 'escribirCrudo']) {
            const orig = el[k]
            el[k] = (...args) => { orig(...args); c.__disparar('input', { target: el }); return el }
          }
          const disp = el.dispatchEvent
          el.dispatchEvent = (ev) => { disp(ev); if (ev.type === 'input') c.__disparar('input', { target: el }); return true }
          c.hijos.push(el)
        }
      },
    })
    c.querySelectorAll = (sel) => {
      const clase = sel.slice(1)
      return c.hijos.filter(h => h.clases.includes(clase))
    }
    c.querySelector = (sel) => {
      const m = /^\\.([\\w-]+)(?:\\[data-index="(\\d+)"\\])?$/.exec(sel)
      if (!m) return null
      return c.hijos.find(h => h.clases.includes(m[1]) && (m[2] == null || h.dataset.index === m[2])) || null
    }
    return c
  }
  var CONTENEDORES = ['lista-fifo', 'lista-movimientos-ficha']
  var __els = new Map()
  var document = {
    getElementById(id) {
      if (!__els.has(id)) __els.set(id, CONTENEDORES.includes(id) ? contenedor(id) : nuevoEl(id))
      return __els.get(id)
    },
    querySelector: () => null, querySelectorAll: () => [],
  }

  // --- dependencias externas, stubeadas ------------------------------------
  var __llamadas = []
  var __rpcData = {}
  var __from = { data: [], error: null }
  var supabase = {
    rpc: async (nombre, params) => {
      __llamadas.push({ nombre, params: JSON.parse(JSON.stringify(params)) })
      return { data: __rpcData[nombre] ?? null, error: null }
    },
    from() {
      const q = { select: () => q, eq: () => q, in: () => q, order: () => q,
        then(res) { return Promise.resolve(__from).then(res) } }
      return q
    },
  }
  var __errores = []
  function mostrarError(m) { __errores.push(m) } function mostrarExito() {}
  function formatearFecha(f) { return String(f) }
  var __opciones = null
  function poblarSelect(id, items, mapFn) { __opciones = items.map(mapFn) }
  async function cargarFichaSaldos() {} async function cargarFichaMovimientos() {} async function cargarFichaCreditos() {}
  function renderizarFichaBanner() {} function cargarSaldos() {} function cerrarModalPago() {}
  async function recargarTrasImporte() {} async function cargarCuentasParaPago() {}
  function seleccionarMedioPagoCC(v) { medioPagoSeleccionado = v } function abrirModalDetallePago() {} async function eliminarFactura() {}

  // Los let del módulo que estas funciones usan.
  var creditoAAplicar = null
  var facturasParaCredito = []
  var medioPagoSeleccionado = 'cheque'
  var facturasParaPago = []
  var estado = {
    miRolApp: 'usuario', miEmpleadoId: 'yo',
    misTareas: new Set(['cuentas_corrientes:registrar_pago', 'cuentas_corrientes:ver_todo']),
    maestros: { unidades: [{ id: 'u1', nombre: 'Cucuruchos Nuss' }] },
    ficha: null, fichaSaldos: [{ moneda: 'ARS', deuda_pendiente: 100 }],
  }
  var listaMovFicha = document.getElementById('lista-movimientos-ficha')
  ${LISTENERS}
`

const FUNCIONES = [
  'esc', 'formatearImporte', 'importeHtml', 'formatearImporteCentavosSuaves', 'enlazarCamposMonto', 'montoDeCampo',
  'tieneTarea', 'nombreUnidad', 'badgeEstadoFactura', 'esSinImporte', 'textoCantidadInsumo', 'totalImporteFormulario',
  'htmlFilaSinImporte', 'renderizarFichaMovimientos', 'enlazarCampoImporteSin', 'confirmarImporteSinImporte',
  'actualizarSugerenciasPago', 'renderizarFilasFifo', 'actualizarResumenAplicacion', 'confirmarPago',
  'abrirModalPago', 'fechaISO', 'seleccionarCreditoParaAplicar', 'cerrarModalAplicarCredito', 'confirmarAplicarCredito',
]

function sandbox() {
  const S = construirCon(ARCHIVO, {
    preludio: PRELUDIO, funciones: FUNCIONES, constantes: ['IDS_CAMPOS_MONTO', 'ESTADO_FACTURA_LABEL', 'TIPO_MOVIMIENTO_LABEL'],
    retorno: `estado, __els, __errores, __doc: document, IDS_CAMPOS_MONTO,
      __llamadas(){ return __llamadas }, __limpiar(){ __llamadas = []; __errores.length = 0 },
      __setFrom(r){ __from = r }, __setRpc(n, d){ __rpcData[n] = d }, __opciones(){ return __opciones },
      __fifo(){ return facturasParaPago }, __medio(v){ medioPagoSeleccionado = v }, __credito(){ return creditoAAplicar }`,
  })
  S.enlazarCamposMonto()
  return S
}
const rpc = (S, nombre) => S.__llamadas().filter(l => l.nombre === nombre)

// Cómo se escribe cada caso en el campo, qué tiene que verse y qué tiene que viajar.
const CASOS = [
  ['teclear 2000000', (el) => el.teclear('2000000'), '2.000.000', 2000000],
  ['escribir crudo "2.000.000"', (el) => el.escribirCrudo('2.000.000'), '2.000.000', 2000000],
  ['escribir crudo "387.300,50"', (el) => el.escribirCrudo('387.300,50'), '387.300,50', 387300.5],
  ['teclear 387300,50', (el) => el.teclear('387300,50'), '387.300,50', 387300.5],
  ['teclear 387300.50 (el punto del teclado es la coma)', (el) => el.teclear('387300.50'), '387.300,50', 387300.5],
  ['pegar "387300.50" (el parser viejo daba 38.730.050)', (el) => el.pegar('387300.50'), '387.300,50', 387300.5],
  ['pegar "1.500"', (el) => el.pegar('1.500'), '1.500', 1500],
  ['teclear 0,50', (el) => el.teclear('0,50'), '0,50', 0.5],
]

function fichaBase(S) {
  S.estado.ficha = { proveedorId: 'p1', unidadId: 'u1', formImporte: null, filtros: { tipo: '', orden: '' },
    estadoPorFactura: {}, movimientosRaw: [], cantidadesSinImporte: new Map() }
}

async function main() {
  // ══ 1. Pago: p_monto ═════════════════════════════════════════════════════
  for (const [nombre, accion, visto, numero] of CASOS) {
    const S = sandbox()
    fichaBase(S)
    const el = S.__els.get('campo-monto-pago')
    chk('campo-monto-pago queda type=text con teclado decimal', el.type === 'text' && el.atributos.inputmode === 'decimal', [el.type, el.atributos])
    accion(el)
    chk(`pago (${nombre}): el campo muestra ${visto}`, el.value === visto, el.value)
    S.__doc.getElementById('campo-moneda-pago').value = 'ARS'
    S.__doc.getElementById('campo-fecha-pago-cc').value = '2026-09-21'
    S.__setFrom({ data: [], error: null })
    S.__setRpc('sugerir_facturas_fifo', [])
    await S.actualizarSugerenciasPago()
    const sug = rpc(S, 'sugerir_facturas_fifo')
    chk(`pago (${nombre}): sugerir_facturas_fifo recibe p_monto = ${numero}`, sug.length === 1 && sug[0].params.p_monto === numero, sug)
    S.__limpiar()
    await S.confirmarPago()
    const ll = rpc(S, 'registrar_pago_proveedor')
    chk(`pago (${nombre}): registrar_pago_proveedor con p_monto = ${numero}`, ll.length === 1 && ll[0].params.p_monto === numero, ll)
    chk(`pago (${nombre}): sin errores`, S.__errores.length === 0, S.__errores)
  }
  for (const texto of ['', '0', '0,00']) {
    const S = sandbox()
    fichaBase(S)
    S.__els.get('campo-monto-pago').escribirCrudo(texto)
    S.__doc.getElementById('campo-moneda-pago').value = 'ARS'
    S.__doc.getElementById('campo-fecha-pago-cc').value = '2026-09-21'
    S.__limpiar()
    await S.confirmarPago()
    chk(`pago con monto "${texto}": no llama y avisa`, S.__llamadas().length === 0 && S.__errores.includes('Ingresá un monto válido.'), [S.__llamadas(), S.__errores])
  }

  // Abrir el modal de pago limpia el monto (y el estado del enlace).
  {
    const S = sandbox()
    fichaBase(S)
    const el = S.__els.get('campo-monto-pago')
    el.teclear('12345')
    await S.abrirModalPago()
    chk('abrir el modal de pago deja el monto vacío', el.value === '', el.value)
    el.teclear('7')
    chk('después de abrir, tipear "7" da "7" (el enlace no arrastra lo anterior)', el.value === '7', el.value)
    S.__medio('cheque')
    S.__doc.getElementById('campo-moneda-pago').value = 'ARS'
    S.__limpiar()
    await S.confirmarPago()
    chk('después de abrir, p_monto = 7', rpc(S, 'registrar_pago_proveedor')[0]?.params.p_monto === 7, S.__llamadas())
  }

  // ══ 2. FIFO ══════════════════════════════════════════════════════════════
  async function prepararFifo(textoPago) {
    const S = sandbox()
    fichaBase(S)
    S.__els.get('campo-monto-pago').escribirCrudo(textoPago)
    S.__doc.getElementById('campo-moneda-pago').value = 'ARS'
    S.__doc.getElementById('campo-fecha-pago-cc').value = '2026-09-21'
    S.__setFrom({ data: [
      { id: 'f1', numero_comprobante: '0001-1', fecha_factura: '2026-09-01', saldo_pendiente: 500000 },
      { id: 'f2', numero_comprobante: '0001-2', fecha_factura: '2026-09-02', saldo_pendiente: 1234.5 },
    ], error: null })
    S.__setRpc('sugerir_facturas_fifo', [{ factura_pendiente_id: 'f1', monto_a_aplicar: 500000 }])
    await S.actualizarSugerenciasPago()
    const cont = S.__els.get('lista-fifo')
    const monto = (i) => cont.querySelector(`.monto-fifo[data-index="${i}"]`)
    const check = (i) => cont.querySelectorAll('.check-fifo').find(c => c.dataset.index === String(i))
    return { S, cont, monto, check }
  }
  {
    const { S, cont, monto, check } = await prepararFifo('2.000.000')
    chk('FIFO: la plantilla de los montos NO lleva value (lo escribe ponerNumero)', cont.hijos.filter(h => h.clases.includes('monto-fifo')).every(h => h.atributos.valueEnPlantilla == null), cont.innerHTML)
    chk('FIFO: los montos quedan enlazados (type=text, decimal)', cont.querySelectorAll('.monto-fifo').every(h => h.type === 'text' && h.atributos.inputmode === 'decimal'))
    chk('FIFO: la sugerida muestra 500.000', monto(0).value === '500.000', monto(0).value)
    chk('FIFO: la no sugerida queda vacía (0 = vacío)', monto(1).value === '', monto(1).value)
    S.__limpiar()
    await S.confirmarPago()
    let ll = rpc(S, 'registrar_pago_proveedor')
    chk('FIFO: sin tocar, viaja la sugerida', ll[0] && JSON.stringify(ll[0].params.p_aplicaciones) === JSON.stringify([{ factura_pendiente_id: 'f1', monto_aplicado: 500000 }]), ll[0] && ll[0].params)
    // tildar la otra: se escribe su saldo con ponerNumero
    const c2 = check(1)
    c2.checked = true
    c2.dispatchEvent({ type: 'change', target: c2 })
    chk('FIFO: tildar escribe el saldo con coma decimal (1.234,50)', monto(1).value === '1.234,50', monto(1).value)
    S.__limpiar()
    await S.confirmarPago()
    ll = rpc(S, 'registrar_pago_proveedor')
    chk('FIFO: tildada, viaja 1234.5', ll[0] && ll[0].params.p_aplicaciones.some(a => a.factura_pendiente_id === 'f2' && a.monto_aplicado === 1234.5), ll[0] && ll[0].params)
  }
  for (const [nombre, accion, visto, numero] of CASOS) {
    const { S, monto } = await prepararFifo('9.999.999')
    const el = monto(0)
    el.escribirCrudo('')
    accion(el)
    chk(`FIFO (${nombre}): el campo muestra ${visto}`, el.value === visto, el.value)
    chk(`FIFO (${nombre}): el estado de la factura queda en ${numero}`, S.__fifo()[0].monto === numero, S.__fifo()[0])
    S.__limpiar()
    await S.confirmarPago()
    const ll = rpc(S, 'registrar_pago_proveedor')
    chk(`FIFO (${nombre}): p_aplicaciones[0].monto_aplicado = ${numero}`, ll[0] && ll[0].params.p_aplicaciones[0] && ll[0].params.p_aplicaciones[0].monto_aplicado === numero && ll[0].params.p_aplicaciones[0].factura_pendiente_id === 'f1', ll[0] && ll[0].params)
    chk(`FIFO (${nombre}): p_monto = 9999999`, ll[0] && ll[0].params.p_monto === 9999999, ll[0] && ll[0].params)
  }
  {
    const { S, monto } = await prepararFifo('2.000.000')
    monto(0).escribirCrudo('')
    chk('FIFO: borrar el monto lo deja en 0 (no null ni NaN)', S.__fifo()[0].monto === 0, S.__fifo()[0])
    S.__limpiar()
    await S.confirmarPago()
    const ll = rpc(S, 'registrar_pago_proveedor')
    chk('FIFO: un monto vacío no viaja como aplicación', ll[0] && ll[0].params.p_aplicaciones.length === 0, ll[0] && ll[0].params)
    const S2 = (await prepararFifo('100')).S
    S2.__fifo()[0].monto = 500000
    S2.__limpiar()
    await S2.confirmarPago()
    chk('FIFO: aplicar más que el pago frena', S2.__errores.includes('La suma aplicada no puede superar el monto a pagar.') && rpc(S2, 'registrar_pago_proveedor').length === 0, S2.__errores)
  }

  // ══ 3. Crédito ═══════════════════════════════════════════════════════════
  async function prepararCredito(saldo, disponible) {
    const S = sandbox()
    fichaBase(S)
    const campo = S.__els.get('campo-monto-credito')
    campo.teclear('777')
    S.__setFrom({ data: [{ id: 'f9', numero_comprobante: '0001-9', fecha_factura: '2026-09-01', saldo_pendiente: saldo }], error: null })
    await S.seleccionarCreditoParaAplicar({ id: 'c1', moneda: 'ARS', monto_disponible: disponible })
    chk('crédito: elegir el crédito vacía el monto', campo.value === '', campo.value)
    const sel = S.__doc.getElementById('campo-factura-credito')
    sel.value = 'f9'
    // El texto de la opción ya NO se usa: se deja uno que el parser viejo
    // habría leído distinto, para que la prueba falle si vuelve a leerlo.
    sel.selectedOptions = [{ textContent: 'saldo $ 1,00' }]
    sel.dispatchEvent({ type: 'change', target: sel })
    return { S, campo }
  }
  {
    const { S, campo } = await prepararCredito(387300.5, 1000000)
    chk('crédito: el campo queda enlazado', campo.type === 'text' && campo.atributos.inputmode === 'decimal')
    chk('crédito: prefill con el saldo de la factura (387.300,50)', campo.value === '387.300,50', campo.value)
    S.__limpiar()
    await S.confirmarAplicarCredito()
    const ll = rpc(S, 'aplicar_credito_a_factura')
    chk('crédito: el prefill viaja como p_monto = 387300.5', ll.length === 1 && ll[0].params.p_monto === 387300.5 && ll[0].params.p_factura_pendiente_id === 'f9' && ll[0].params.p_credito_id === 'c1', ll)
  }
  {
    const { S, campo } = await prepararCredito(2500000, 1000000.25)
    chk('crédito: prefill con lo que alcanza primero (el disponible, 1.000.000,25)', campo.value === '1.000.000,25', campo.value)
    S.__limpiar()
    await S.confirmarAplicarCredito()
    chk('crédito: p_monto = 1000000.25', rpc(S, 'aplicar_credito_a_factura')[0]?.params.p_monto === 1000000.25, S.__llamadas())
  }
  {
    const { campo } = await prepararCredito(null, 5000)
    chk('crédito: sin saldo de factura, el prefill es el disponible (5.000)', campo.value === '5.000', campo.value)
  }
  for (const [nombre, accion, visto, numero] of CASOS) {
    const { S, campo } = await prepararCredito(9999999, 9999999)
    campo.escribirCrudo('')
    accion(campo)
    chk(`crédito (${nombre}): el campo muestra ${visto}`, campo.value === visto, campo.value)
    S.__limpiar()
    await S.confirmarAplicarCredito()
    const ll = rpc(S, 'aplicar_credito_a_factura')
    chk(`crédito (${nombre}): p_monto = ${numero}`, ll.length === 1 && ll[0].params.p_monto === numero, ll)
  }
  for (const texto of ['', '0']) {
    const { S, campo } = await prepararCredito(100, 100)
    campo.escribirCrudo(texto)
    S.__limpiar()
    await S.confirmarAplicarCredito()
    chk(`crédito con monto "${texto}": no llama y avisa`, S.__llamadas().length === 0 && S.__errores.includes('Ingresá un monto válido.'), [S.__llamadas(), S.__errores])
  }

  // ══ 4. Cargar importe de una descarga sin importe ════════════════════════
  function prepararSinImporte(cantidades) {
    const S = sandbox()
    fichaBase(S)
    S.estado.ficha.movimientosRaw = [{ tipo: 'factura', monto: null, factura_pendiente_id: 'f1', referencia: 'Sin número',
      fecha: '2026-10-02', moneda: 'ARS', unidad_negocio_id: 'u1' }]
    S.estado.ficha.estadoPorFactura = { f1: 'sin_importe' }
    S.estado.ficha.cantidadesSinImporte = new Map([['f1', cantidades]])
    const lista = S.__els.get('lista-movimientos-ficha')
    const click = (clase, dataset) => lista.__disparar('click', { target: { closest: (sel) => sel === clase ? { dataset } : null } })
    click('.btn-cargar-importe', { id: 'f1' })
    const campo = () => lista.querySelector('.campo-importe-sin')
    return { S, lista, click, campo }
  }
  const HARINA = [{ insumoId: 'i1', nombre: 'Harina', unidad: 'kg', cantidad: 250 }]
  {
    const { S, lista, campo } = prepararSinImporte(HARINA)
    chk('cargar importe: el formulario abre con importe null (no texto)', S.estado.ficha.formImporte && S.estado.ficha.formImporte.importe === null && !('texto' in S.estado.ficha.formImporte), S.estado.ficha.formImporte)
    chk('cargar importe: hay un campo y va SIN value en la plantilla', campo() && campo().atributos.valueEnPlantilla == null, lista.innerHTML)
    chk('cargar importe: el campo queda enlazado al insertarlo', campo().type === 'text' && campo().atributos.inputmode === 'decimal')
  }
  for (const [nombre, accion, visto, numero] of CASOS) {
    const { S, lista, click, campo } = prepararSinImporte(HARINA)
    accion(campo())
    chk(`cargar importe (${nombre}): el campo muestra ${visto}`, campo().value === visto, campo().value)
    chk(`cargar importe (${nombre}): el formulario guarda el NÚMERO ${numero}`, S.estado.ficha.formImporte.importe === numero, S.estado.ficha.formImporte)
    chk(`cargar importe (${nombre}): la línea del total lo dice`, lista.total.innerHTML.includes('Total a cargar: $ ' + visto + (visto.includes(',') ? '' : ',00')), lista.total.innerHTML)
    click('.btn-confirmar-importe', { id: 'f1' })
    await new Promise(r => setImmediate(r))
    const ll = rpc(S, 'completar_importe_factura')
    chk(`cargar importe (${nombre}): p_importe = ${numero}`, ll.length === 1 && ll[0].params.p_importe === numero && ll[0].params.p_factura_id === 'f1', ll)
  }
  {
    // Precio por unidad: 1.200,10 × 250 kg = 300.025 (el TOTAL viaja).
    const { S, lista, click, campo } = prepararSinImporte(HARINA)
    campo().escribirCrudo('1.200,10')
    const radio = { value: 'unidad', closest: (sel) => sel === '.modo-importe' ? radio : null }
    lista.__disparar('change', { target: radio })
    chk('cargar importe: cambiar de modo redibuja y el campo conserva el número (1.200,10)', campo().value === '1.200,10', campo().value)
    chk('cargar importe: el campo redibujado vuelve a quedar enlazado', campo().type === 'text')
    campo().escribirCrudo('')
    campo().teclear('1200,10')
    click('.btn-confirmar-importe', { id: 'f1' })
    await new Promise(r => setImmediate(r))
    const ll = rpc(S, 'completar_importe_factura')
    chk('cargar importe por unidad: p_importe = 300025 (el total, no el precio)', ll.length === 1 && ll[0].params.p_importe === 300025, ll)
  }
  {
    // El precio por unidad es un importe: 2 decimales. "0,333" queda "0,33".
    const { S, click, campo } = prepararSinImporte([{ insumoId: 'i', nombre: 'Film', unidad: 'kg', cantidad: 3 }])
    S.estado.ficha.formImporte.modo = 'unidad'
    campo().teclear('0,333')
    chk('cargar importe por unidad: el campo admite 2 decimales ("0,333" → "0,33")', campo().value === '0,33', campo().value)
    click('.btn-confirmar-importe', { id: 'f1' })
    await new Promise(r => setImmediate(r))
    chk('cargar importe por unidad: 0,33 × 3 = 0.99', rpc(S, 'completar_importe_factura')[0]?.params.p_importe === 0.99, S.__llamadas())
  }
  {
    const { S, lista, click, campo } = prepararSinImporte(HARINA)
    campo().escribirCrudo('')
    chk('cargar importe vacío: la línea no inventa un total', lista.total.innerHTML === 'Escribí un importe mayor a cero.', lista.total.innerHTML)
    click('.btn-confirmar-importe', { id: 'f1' })
    await new Promise(r => setImmediate(r))
    chk('cargar importe vacío: no llama a la RPC', rpc(S, 'completar_importe_factura').length === 0)
  }

  // ══ 5. Formateadores ═════════════════════════════════════════════════════
  {
    const S = sandbox()
    const viejo = new Function(extraerFn(FUENTE_BASE, 'formatearImporte') + '\nreturn formatearImporte')()
    const viejoSuaves = new Function(extraerFn(FUENTE_BASE, 'esc') + '\n' + extraerFn(FUENTE_BASE, 'formatearImporteCentavosSuaves') + '\nreturn formatearImporteCentavosSuaves')()
    const viejoCant = new Function(extraerFn(FUENTE_BASE, 'textoCantidadInsumo') + '\nreturn textoCantidadInsumo')()
    const valores = [0, 1, 1.5, 10, 999.99, 1000, 1500, 387300.5, 2000000, 1349799.77, -1234.5, -0.5, 0.01, 123456789.12, '1500', '-2500.75', 1234.567]
    for (const v of valores) {
      for (const moneda of ['ARS', 'USD']) {
        chk(`formatearImporte(${JSON.stringify(v)}, ${moneda}) igual que antes`, S.formatearImporte(v, moneda) === viejo(v, moneda), [S.formatearImporte(v, moneda), viejo(v, moneda)])
        chk(`formatearImporteCentavosSuaves(${JSON.stringify(v)}, ${moneda}) igual que antes`, S.formatearImporteCentavosSuaves(v, moneda) === viejoSuaves(v, moneda), [S.formatearImporteCentavosSuaves(v, moneda), viejoSuaves(v, moneda)])
      }
    }
    for (const cant of [250, 1500, 1.5, 0.333, 12500.25, 1000000, 0.1]) {
      const c = { cantidad: cant, unidad: 'kg', nombre: 'Harina' }
      chk(`textoCantidadInsumo(${cant}) igual que antes`, S.textoCantidadInsumo(c) === viejoCant(c), [S.textoCantidadInsumo(c), viejoCant(c)])
    }
    for (const v of [null, undefined, '', NaN, 'abc']) {
      chk(`formatearImporte(${String(v)}) = "—"`, S.formatearImporte(v) === '—', S.formatearImporte(v))
      chk(`formatearImporte(${String(v)}, USD) = "—"`, S.formatearImporte(v, 'USD') === '—', S.formatearImporte(v, 'USD'))
      chk(`importeHtml(${String(v)}) = "—"`, S.importeHtml(v, 'ARS') === '—', S.importeHtml(v, 'ARS'))
      chk(`formatearImporteCentavosSuaves(${String(v)}) = "—"`, S.formatearImporteCentavosSuaves(v) === '—', S.formatearImporteCentavosSuaves(v))
    }
    chk('el viejo formatearImporteCentavosSuaves daba "$ 0,00" con null (lo que se arregló)', /^\$ 0<span/.test(viejoSuaves(null)))
    chk('el viejo formatearImporte daba "$ 0,00" con \'\' (lo que se arregló)', viejo('') === '$ 0,00')
    chk('formatearImporte sigue siendo TEXTO PLANO (no escapa la moneda)', S.formatearImporte(1, 'A&B') === 'A&B 1,00')
    chk('importeHtml escapa la moneda', S.importeHtml(1, '<b>') === '&lt;b&gt; 1,00', S.importeHtml(1, '<b>'))
    chk('formatearImporteCentavosSuaves escapa la moneda', S.formatearImporteCentavosSuaves(1, '<b>') === '&lt;b&gt; 1<span class="cc-centavos">,00</span>', S.formatearImporteCentavosSuaves(1, '<b>'))
    chk('el resumen sin saldos sigue diciendo $ 0,00 (0 explícito, no ausente)', S.formatearImporteCentavosSuaves(0) === '$ 0<span class="cc-centavos">,00</span>')
  }

  // ══ 6. Estático ══════════════════════════════════════════════════════════
  {
    const codigo = SCRIPT.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n')
    chk('no queda parseImporte', !/parseImporte\s*\(/.test(codigo))
    chk('no queda formatearImporteEnVivo', !/formatearImporteEnVivo\s*\(/.test(codigo))
    chk('no queda formatearNumeroEditable', !/formatearNumeroEditable\s*\(/.test(codigo))
    chk('no queda parseFloat', !/parseFloat\s*\(/.test(codigo))
    chk('no queda toLocaleString', !/toLocaleString\(/.test(codigo))
    chk('no queda ningún type="number"', !/type="number"/.test(FUENTE))
    chk('el prefill del crédito ya no re-lee el texto de la <option>', !/selectedOptions/.test(codigo) && !/match\(\/saldo/.test(codigo))
    chk('ningún .value de un monto se asigna o se lee a mano', !/getElementById\('(campo-monto-pago|campo-monto-credito)'\)\.value/.test(codigo))
    chk('el formulario de "Cargar importe" no guarda texto', !/form\.texto|texto: ''/.test(codigo))
    chk('ninguna plantilla de monto-fifo / campo-importe-sin lleva value=', !/(monto-fifo|campo-importe-sin)[^>]*value=/.test(codigo))
    chk('IDS_CAMPOS_MONTO son exactamente pago y crédito', /const IDS_CAMPOS_MONTO = \['campo-monto-pago', 'campo-monto-credito'\]/.test(codigo))
    chk('los montos se enlazan con 2 decimales', /enlazarCampoNumero\(document\.getElementById\(id\), \{ decimales: 2 \}\)/.test(codigo))
    const enlaces = codigo.split('\n').filter(l => /enlazarCampoNumero\(/.test(l)).map(l => l.trim())
    chk('hay exactamente 3 enlazarCampoNumero (fijos, FIFO, cargar importe), todos con 2 decimales', enlaces.length === 3 && enlaces.every(a => /decimales: 2/.test(a)), enlaces)
    chk('los CUIT NO se enlazan', !/enlazarCampoNumero\([^)]*cuit/i.test(codigo) && !/IDS_CAMPOS_MONTO = \[[^\]]*cuit/.test(codigo))
    const iEnlace = codigo.indexOf('\n    enlazarCamposMonto()\n'), iListener = codigo.indexOf("document.getElementById('campo-monto-pago').addEventListener('input'")
    chk('el enlace corre al iniciar, ANTES del listener de sugerencias', iEnlace !== -1 && iListener !== -1 && iEnlace < iListener, [iEnlace, iListener])
    const S = sandbox()
    chk('enlazarCamposMonto enlaza los 2 (type=text)', S.IDS_CAMPOS_MONTO.every(id => S.__els.get(id).type === 'text'))
  }

  const total = ok + fallas.length
  for (const f of fallas) console.log('  ✗ ' + f)
  console.log(`${ok}/${total}${fallas.length ? '  ROJO' : '  verde'}`)
  process.exit(fallas.length ? 1 : 0)
}

main().catch(e => { console.log('EXCEPCIÓN', e && e.stack || e); process.exit(1) })
