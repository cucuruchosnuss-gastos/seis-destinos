// Números de modulos/cobranzas.html: los dos IMPORTES del formulario (el
// efectivo y el importe de cada cheque) pasan por las funciones compartidas de
// js/utils.js desde el 21/09/2026.
//
// Se EJECUTA el código real de los dos archivos: las funciones del módulo se
// extraen del <script> y las de números salen del utils.js real
// (fuenteNumeros). Los campos son inputFalso(), que tipea, borra y pega como
// el navegador, y el número se verifica EN LO QUE VIAJA a guardar_cobranza,
// capturado con un supabase mockeado: el número sale del campo enlazado, no
// de una constante.
//
// Qué se prueba:
//  1. Tipear / pegar en el efectivo y en el importe de un cheque → p_efectivo y
//     p_cheques[].importe exactos.
//  2. Un BORRADOR guardado en el celular con strings mixtos ("387300",
//     "387300.5", "12.500,50") abre bien: lo que muestra el campo y lo que
//     viaja al guardar.
//  3. El OCR (número) y la edición (lo que vino de la base) entran al campo
//     por ponerNumero.
//  4. formatearImporte: igual que antes para todo valor presente, "—" para un
//     importe ausente (nunca "$ 0,00"), también en el cheque del detalle y en
//     las cifras de cabecera. (La tabla de Cheques se mudó a cheques.html el
//     22/09/2026: la prueba allá es de pruebas/test-cheques-*.js.)
//  5. Los IDENTIFICADORES (renglones de la banda, CUIT) no se tocan.
//
// Archivo bajo prueba: ARCHIVO_TEST, o modulos/cobranzas.html.

const fs = require('fs')
const path = require('path')
const { construirCon } = require('./sandbox')
const { fuenteNumeros, inputFalso } = require('./numeros-comun')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/cobranzas.html')
const FUENTE = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${FUENTE.length} bytes)`)
require('./mutar-cobranzas-comun').informarComun()

let ok = 0
const fallas = []
function chk(nombre, condicion, detalle) {
  if (condicion) ok++
  else fallas.push(nombre + (detalle !== undefined ? ` — ${typeof detalle === 'string' ? detalle : JSON.stringify(detalle)}` : ''))
}
const NB = '\u00a0'

const PRELUDIO = `
  ${fuenteNumeros()}
  var __inputFalso = ${inputFalso.toString()}

  // --- DOM falso -------------------------------------------------------
  function nuevoEl(id) {
    return {
      id, _html: '', textContent: '', value: '', className: '', hidden: false,
      disabled: false, max: '', dataset: {}, src: '', style: {},
      get innerHTML() { return this._html },
      set innerHTML(h) { this._html = String(h); if (id === 'cob-lista-cheques') __regenerarImportes(this._html) },
      querySelectorAll: () => [], querySelector: () => null,
      addEventListener: () => {}, focus: () => {}, click: () => {},
      setAttribute: () => {}, removeAttribute: () => {},
      classList: { add(){}, remove(){}, toggle(){}, contains(){ return false } },
    }
  }
  var __els = new Map()
  // El efectivo es un input que se comporta como el del navegador.
  __els.set('cob-efectivo', Object.assign(__inputFalso(''), { id: 'cob-efectivo', dataset: {} }))
  // Cada vez que se dibujan las tarjetas, sus campos de importe son inputs
  // NUEVOS (como en el DOM real): uno por cada data-importe="…" del HTML.
  var __importes = []
  function __regenerarImportes(html) {
    __importes = [...html.matchAll(/data-importe="([^"]*)"/g)].map(m => {
      const inp = __inputFalso('')
      inp.dataset = { importe: m[1] }
      return inp
    })
  }
  var document = {
    getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) },
    querySelectorAll(sel) { return sel === '[data-importe]' ? __importes : [] },
    querySelector: () => null,
    createElement: () => nuevoEl('creado'),
    addEventListener: () => {},
  }
  var window = { scrollTo(){}, addEventListener(){} }
  var navigator = { onLine: true }

  // --- dependencias externas, stubeadas --------------------------------
  var __rpcs = []
  var supabase = {
    rpc: async (nombre, params) => { __rpcs.push({ nombre, params: JSON.parse(JSON.stringify(params)) }); return { data: { id: params.p_id, ya_existia: false }, error: null } },
    storage: { from: () => ({ upload: async () => ({ error: null }) }) },
  }
  async function guardarBorrador(){}
  function pintarEstadoFotos(){} function iniciarReintentosFotos(){}
  async function chequearDuplicado(){} function enfocar(){}

  var estado = {
    sesion: { user: { id: 'uid' } }, miEmpleadoId: 'emp-1', miRolApp: 'usuario',
    misTareas: new Set(['cobranzas:cargar']),
    bancos: new Map([['007', 'BANCO DE GALICIA Y BUENOS AIRES S.A.U.']]),
    form: null, filtros: { texto: '', desde: '', hasta: '', estado: '', repartidor: '' },
  }
`

const FUNCIONES = [
  'escCob', 'dvBcra', 'formatearImporte', 'escribirImporteEnCampo', 'hoyArgentina', 'esFechaIso', 'diasEntre',
  'formatearFechaCob', 'nombreBanco', 'nombreBancoDe', 'estadoRenglon', 'erroresDeCheque', 'chequeParaBase', 'textoOpcional',
  'origenDatosDe', 'htmlTarjetaCheque', 'textoDiasHastaPago', 'htmlDatosCheque',
  'chequeVacio', 'chequeDesdeOcr', 'chequeDesdeBase', 'renglonComoImpreso', 'aplicarRenglones', 'formularioVacio',
  'pintarFormulario', 'pintarCheques', 'conectarTarjetasCheque',
  'pintarTotalYGuardado', 'motivosParaNoGuardar', 'totalDelFormulario', 'efectivoDelFormulario',
  'subirCobranza', 'esErrorDeRed',
  // Para mostrar
  'numeroDeResumen', 'htmlResumen', 'tieneTarea',
  'htmlChequeDetalle', 'normalizarCliente', 'textoSalidaCheque', 'htmlLinkChequeEnCartera',
]
const CONSTANTES = [
  'ZONA_AR', 'DIAS_MAXIMO_DIFERIDO', 'ETIQUETA_ESTADO_CHEQUE', 'ESTADOS_COBRANZA', 'ETIQUETA_ESTADO_COBRANZA', 'puedeProcesar',
  'puedeVerTodo', 'puedeVerCartera', 'ACENTOS_COB', 'SIN_ACENTOS_COB',
]

function sandbox() {
  return construirCon(ARCHIVO, {
    preludio: PRELUDIO, funciones: FUNCIONES, constantes: CONSTANTES,
    retorno: `estado, __els, __rpcs(){ return __rpcs }, __limpiar(){ __rpcs = [] }, __importes(){ return __importes },
      enlazarCampoNumero, leerNumeroAr`,
  })
}

// El listener del efectivo, igual que el de conectarTodo(): se enlaza PRIMERO
// y después se conecta el que copia el valor al estado. Se extrae el bloque
// real del archivo para no reescribirlo acá.
function bloqueEfectivo() {
  const ini = FUENTE.indexOf("      enlazarCampoNumero(document.getElementById('cob-efectivo')")
  const fin = FUENTE.indexOf('      document.getElementById(\'cob-btn-camara\')', ini)
  if (ini === -1 || fin === -1) return null
  return FUENTE.slice(ini, fin)
}

// Un cheque abierto (con su campo de importe a la vista) y válido.
function chequeBase(S, extra = {}) {
  return {
    ...S.chequeVacio('f1'), id: 'q' + Math.random().toString(36).slice(2, 8),
    r1: '007 010 1000 5', banco_codigo: '007', sucursal_codigo: '010', codigo_postal: '1000', dv_ruta: 5,
    numero: '12345678', dv_numero: 1, cuenta: '09420314667', dv_cuenta: 2,
    tipo: 'comun', fecha_emision: '2026-09-15', confirmado: true, abierto: true,
    ...extra,
  }
}

function formulario(S, extra = {}) {
  return {
    ...S.formularioVacio('cob-1'), cliente: 'Don Pepe', fecha: '2026-09-15',
    fotos: [{ id: 'f1', storage_path: 'uid/cob-1/f1.jpg', subida: true, leida: true }],
    ...extra,
  }
}

// Monta el formulario como la pantalla: conecta el efectivo (bloque real de
// conectarTodo) y dibuja el formulario.
function montar(S, f) {
  S.estado.form = f
  const bloque = bloqueEfectivo()
  if (!bloque) throw new Error('no se encontró el bloque del efectivo en conectarTodo')
  new Function('document', 'estado', 'enlazarCampoNumero', 'guardarBorrador', 'pintarTotalYGuardado', `
    const campos = [['cob-efectivo', 'efectivo']]
    ${bloque}
  `)({ getElementById: (id) => S.__els.get(id) }, S.estado, S.enlazarCampoNumero, async () => {}, S.pintarTotalYGuardado)
  S.pintarFormulario()
}

async function payload(S) {
  S.__limpiar()
  const r = await S.subirCobranza(S.estado.form)
  const rpc = S.__rpcs()[0]
  return { r, p: rpc?.params ?? null }
}

async function main() {
  // ══ 1. El efectivo, tipeado ══════════════════════════════════════════════
  {
    const casos = [
      ['teclear 2000000', (el) => el.teclear('2000000'), '2.000.000', 2000000],
      ['escribir crudo "2.000.000"', (el) => el.escribirCrudo('2.000.000'), '2.000.000', 2000000],
      ['escribir crudo "387.300,50"', (el) => el.escribirCrudo('387.300,50'), '387.300,50', 387300.5],
      ['teclear 387300,50', (el) => el.teclear('387300,50'), '387.300,50', 387300.5],
      ['teclear 387300.50 (el punto del teclado es la coma)', (el) => el.teclear('387300.50'), '387.300,50', 387300.5],
      ['pegar "387300.50"', (el) => el.pegar('387300.50'), '387.300,50', 387300.5],
      ['pegar "$ 1.250,5"', (el) => el.pegar('$ 1.250,5'), '1.250,50', 1250.5],
    ]
    for (const [nombre, accion, visto, numero] of casos) {
      const S = sandbox()
      montar(S, formulario(S, { cheques: [chequeBase(S, { importe: 10 })] }))
      const el = S.__els.get('cob-efectivo')
      chk(`efectivo: el campo queda type=text con teclado decimal`, el.type === 'text' && el.atributos.inputmode === 'decimal')
      accion(el)
      chk(`efectivo (${nombre}): el campo muestra ${visto}`, el.value === visto, el.value)
      const { p } = await payload(S)
      chk(`efectivo (${nombre}): p_efectivo = ${numero}`, p && p.p_efectivo === numero, p && p.p_efectivo)
      chk(`efectivo (${nombre}): el total del formulario lo suma`,
        S.__els.get('cob-total').textContent === S.formatearImporte(numero + 10), S.__els.get('cob-total').textContent)
    }
    // Vacío = sin efectivo = 0 (la base espera un número).
    {
      const S = sandbox()
      montar(S, formulario(S, { cheques: [chequeBase(S, { importe: 10 })] }))
      const el = S.__els.get('cob-efectivo')
      el.teclear('12').borrar(2)
      chk('efectivo borrado: el campo queda vacío', el.value === '', el.value)
      const { p } = await payload(S)
      chk('efectivo vacío: p_efectivo = 0', p && p.p_efectivo === 0, p && p.p_efectivo)
    }
  }

  // ══ 2. El importe de cada cheque, tipeado ════════════════════════════════
  {
    const casos = [
      ['teclear 2000000', (el) => el.teclear('2000000'), '2.000.000', 2000000],
      ['escribir crudo "2.000.000"', (el) => el.escribirCrudo('2.000.000'), '2.000.000', 2000000],
      ['escribir crudo "387.300,50"', (el) => el.escribirCrudo('387.300,50'), '387.300,50', 387300.5],
      ['teclear 427256,86', (el) => el.teclear('427256,86'), '427.256,86', 427256.86],
      ['pegar "387300.50"', (el) => el.pegar('387300.50'), '387.300,50', 387300.5],
    ]
    for (const [nombre, accion, visto, numero] of casos) {
      const S = sandbox()
      const ch = chequeBase(S)
      montar(S, formulario(S, { cheques: [ch] }))
      const inp = S.__importes().find(i => i.dataset.importe === ch.id)
      chk(`cheque (${nombre}): la tarjeta tiene su campo de importe`, !!inp)
      if (!inp) continue
      chk(`cheque: el campo de importe queda enlazado (type=text, decimal)`, inp.type === 'text' && inp.atributos.inputmode === 'decimal')
      accion(inp)
      chk(`cheque (${nombre}): el campo muestra ${visto}`, inp.value === visto, inp.value)
      // El estado guarda el texto YA formateado, no el crudo de la tecla.
      chk(`cheque (${nombre}): el estado guarda lo que muestra el campo`, S.estado.form.cheques[0].importe === inp.value, S.estado.form.cheques[0].importe)
      const { p } = await payload(S)
      const imp = p?.p_cheques?.[0]?.importe
      chk(`cheque (${nombre}): p_cheques[0].importe = ${numero}`, imp === numero, imp)
      chk(`cheque (${nombre}): p_efectivo sigue en 0`, p && p.p_efectivo === 0, p && p.p_efectivo)
    }
    // Re-dibujar la tarjeta (al salir del campo) no cambia lo tipeado.
    {
      const S = sandbox()
      const ch = chequeBase(S)
      montar(S, formulario(S, { cheques: [ch] }))
      S.__importes()[0].teclear('1500000,5')
      S.pintarCheques()
      const inp = S.__importes()[0]
      chk('cheque re-dibujado: el campo nuevo muestra lo tipeado', inp.value === '1.500.000,50', inp.value)
      chk('cheque re-dibujado: la ayuda muestra el importe leído',
        /\$ 1\.500\.000,50/.test(S.__els.get('cob-lista-cheques').innerHTML))
      const { p } = await payload(S)
      chk('cheque re-dibujado: viaja 1500000.5', p?.p_cheques?.[0]?.importe === 1500000.5, p?.p_cheques?.[0]?.importe)
    }
  }

  // ══ 3. Un BORRADOR del celular con strings mixtos ════════════════════════
  // Así quedaban hasta hoy: lo tipeado tal cual, y String(n) —punto decimal—
  // para lo que vino del OCR o de la base.
  {
    const casos = [
      ['"387300"', '387300', '387.300', 387300],
      ['"387300.5"', '387300.5', '387.300,50', 387300.5],
      ['"12.500,50"', '12.500,50', '12.500,50', 12500.5],
      ['"387.300" (tipeado con punto de miles)', '387.300', '387.300', 387300],
      ['un número 387300.5 (borrador nuevo)', 387300.5, '387.300,50', 387300.5],
    ]
    for (const [nombre, guardado, visto, numero] of casos) {
      const S = sandbox()
      const ch = chequeBase(S, { importe: guardado })
      montar(S, formulario(S, { efectivo: guardado, cheques: [ch] }))
      const ef = S.__els.get('cob-efectivo')
      const inp = S.__importes()[0]
      chk(`borrador ${nombre}: el efectivo muestra ${visto}`, ef.value === visto, ef.value)
      chk(`borrador ${nombre}: el importe del cheque muestra ${visto}`, inp && inp.value === visto, inp && inp.value)
      chk(`borrador ${nombre}: sin motivos para no guardar`, S.motivosParaNoGuardar().length === 0, S.motivosParaNoGuardar())
      const { p } = await payload(S)
      chk(`borrador ${nombre}: p_efectivo = ${numero}`, p && p.p_efectivo === numero, p && p.p_efectivo)
      chk(`borrador ${nombre}: p_cheques[0].importe = ${numero}`, p?.p_cheques?.[0]?.importe === numero, p?.p_cheques?.[0]?.importe)
      // Tocar el campo después de abrir sigue leyendo bien.
      ef.cursor(ef.value.length).teclear('0')
      const { p: p2 } = await payload(S)
      chk(`borrador ${nombre}: sumarle un 0 al final multiplica por 10 (o agrega el decimal)`,
        p2 && (p2.p_efectivo === numero * 10 || Math.abs(p2.p_efectivo - numero) < 0.001), p2 && p2.p_efectivo)
    }
    // Un borrador VIEJO con un texto que no se puede leer: se muestra tal cual
    // y la pantalla dice que no se entiende (no se vacía en silencio).
    {
      const S = sandbox()
      montar(S, formulario(S, { efectivo: '12,500.50', cheques: [chequeBase(S, { importe: 10 })] }))
      const ef = S.__els.get('cob-efectivo')
      chk('borrador ilegible: el campo muestra el texto tal cual', ef.value === '12,500.50', ef.value)
      chk('borrador ilegible: "El efectivo no se entiende"', S.motivosParaNoGuardar().some(m => /no se entiende/.test(m)), S.motivosParaNoGuardar())
      chk('borrador ilegible: el botón de guardar queda deshabilitado', S.__els.get('cob-btn-guardar').disabled === true)
    }
  }

  // ══ 4. OCR y edición ═════════════════════════════════════════════════════
  {
    const S = sandbox()
    const p = { banco_codigo: '007', sucursal_codigo: '010', codigo_postal: '1000', dv_ruta: 5,
      numero: '12345678', dv_numero: 1, cuenta: '09420314667', dv_cuenta: 2,
      tipo: 'comun', fecha_emision: '2026-09-15', importe: 387300.5 }
    const ch = { ...S.chequeDesdeOcr(p, 'f1'), confirmado: true, abierto: true }
    chk('OCR: el importe queda como NÚMERO en el estado', ch.importe === 387300.5, ch.importe)
    montar(S, formulario(S, { cheques: [ch] }))
    const inp = S.__importes()[0]
    chk('OCR: el campo muestra 387.300,50', inp && inp.value === '387.300,50', inp && inp.value)
    const { p: pay } = await payload(S)
    chk('OCR: viaja 387300.5', pay?.p_cheques?.[0]?.importe === 387300.5, pay?.p_cheques?.[0]?.importe)
    chk('OCR sin tocar: origen_datos = "ocr"', pay?.p_cheques?.[0]?.origen_datos === 'ocr', pay?.p_cheques?.[0]?.origen_datos)
    // Reescribir el mismo importe con otro formato sigue siendo "ocr".
    inp.escribirCrudo('387.300,50')
    const { p: pay2 } = await payload(S)
    chk('OCR reescrito igual ("387.300,50"): sigue siendo "ocr"', pay2?.p_cheques?.[0]?.origen_datos === 'ocr', pay2?.p_cheques?.[0]?.origen_datos)
    inp.escribirCrudo('387.300,51')
    const { p: pay3 } = await payload(S)
    chk('OCR corregido: "ocr_corregido"', pay3?.p_cheques?.[0]?.origen_datos === 'ocr_corregido', pay3?.p_cheques?.[0]?.origen_datos)
  }
  {
    // Un importe del OCR con tres decimales no puede terminar en un campo vacío
    // (ni, como con el parser anterior, en 1.234.567).
    const S = sandbox()
    const ch = { ...S.chequeDesdeOcr({ importe: 1234.567, tipo: 'comun' }, 'f1'), confirmado: false, abierto: true }
    montar(S, formulario(S, { cheques: [ch] }))
    chk('OCR con 3 decimales: el campo muestra 1.234,57', S.__importes()[0]?.value === '1.234,57', S.__importes()[0]?.value)
    const sinImporte = S.chequeDesdeOcr({ importe: null, tipo: 'comun' }, 'f1')
    chk('OCR sin importe: queda vacío (no 0)', sinImporte.importe === '', sinImporte.importe)
  }
  {
    // Edición: lo que vuelve de la base (número o texto con punto decimal).
    const S = sandbox()
    const base = { id: 'q1', foto_id: 'f1', banco_codigo: '007', sucursal_codigo: '010', codigo_postal: '1000', dv_ruta: 5,
      numero: '12345678', dv_numero: 1, cuenta: '09420314667', dv_cuenta: 2, tipo: 'comun', fecha_emision: '2026-09-15' }
    for (const [desc, valor, visto, numero] of [['número', 2000000, '2.000.000', 2000000], ['texto "387300.50"', '387300.50', '387.300,50', 387300.5]]) {
      const ch = { ...S.chequeDesdeBase({ ...base, importe: valor }), abierto: true }
      montar(S, formulario(S, { modo: 'edicion', efectivo: valor, cheques: [ch] }))
      chk(`edición (${desc}): el efectivo muestra ${visto}`, S.__els.get('cob-efectivo').value === visto, S.__els.get('cob-efectivo').value)
      chk(`edición (${desc}): el importe muestra ${visto}`, S.__importes()[0]?.value === visto, S.__importes()[0]?.value)
      const { p } = await payload(S)
      chk(`edición (${desc}): va a editar_cobranza`, S.__rpcs()[0]?.nombre === 'editar_cobranza')
      chk(`edición (${desc}): p_efectivo = ${numero} y el cheque ${numero}`, p?.p_efectivo === numero && p?.p_cheques?.[0]?.importe === numero, p && [p.p_efectivo, p.p_cheques?.[0]?.importe])
    }
  }

  // ══ 5. formatearImporte ══════════════════════════════════════════════════
  {
    const S = sandbox()
    const viejo = (n) => Number(n).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 })
    for (const v of [0, 1, 1234.5, 387300.5, 2000000, 427256.86, 1e9, 0.29, -3, -1250.75, '1500.5', '387300.50']) {
      chk(`formatearImporte(${JSON.stringify(v)}) se ve igual que antes`, S.formatearImporte(v) === viejo(v), `${S.formatearImporte(v)} vs ${viejo(v)}`)
    }
    for (const v of [null, undefined, '', NaN, 'abc']) {
      chk(`formatearImporte(${String(v)}) = "—" (nunca "$ 0,00")`, S.formatearImporte(v) === '—', S.formatearImporte(v))
    }
    chk('formatearImporte: el $ va con espacio que no corta', S.formatearImporte(5) === `$${NB}5,00`, S.formatearImporte(5))
    // El cheque del detalle con un importe ausente no dice "$ 0,00".
    const chDet = { id: 'z', numero: '12345678', banco_codigo: '007', cuenta: '09420314667', estado: 'en_cartera', tipo: 'comun', fecha_emision: '2026-09-01', titulares: [] }
    const fila = S.htmlChequeDetalle({ ...chDet, importe: null }, new Map())
    chk('cheque del detalle: un importe null no dice "$ 0,00"', !/\$\s?0,00/.test(fila) && /cob-cheque__monto">—</.test(fila), fila.slice(0, 200))
    const fila2 = S.htmlChequeDetalle({ ...chDet, importe: 387300.5 }, new Map())
    chk('cheque del detalle: 387300.5 se ve $ 387.300,50', fila2.includes(`$${NB}387.300,50`))
    // Cifras de cabecera: un total null dice "No se pudo calcular", nunca $ 0,00.
    for (const total of [null, undefined, '']) {
      const h = S.htmlResumen({ etiqueta: 'Total del mes', porControlar: 3, cantidad: 2, total, desdeMes: '2026-09-01' })
      chk(`cabecera con total ${JSON.stringify(total)}: sin "$ 0,00"`, !/\$/.test(h) && /No se pudo calcular/.test(h), h.replace(/\s+/g, ' ').slice(0, 200))
    }
    const hOk = S.htmlResumen({ etiqueta: 'Total del mes', porControlar: 0, cantidad: 2, total: '2000000.5', desdeMes: '2026-09-01' })
    chk('cabecera: un total "2000000.5" de la base se ve $ 2.000.000,50', hOk.includes(`$${NB}2.000.000,50`), hOk.replace(/\s+/g, ' ').slice(0, 300))
  }

  // ══ 6. Los IDENTIFICADORES no se tocan ═══════════════════════════════════
  {
    const S = sandbox()
    const ch = chequeBase(S, { r1: '285 386 3218 6', r2: '00123456 7', r3: '09420314667 2',
      titulares: [{ nombre: 'Pepe', cuit: '20-12345678-3' }], importe: 10 })
    S.aplicarRenglones(ch)
    const b = S.chequeParaBase(ch)
    chk('identificadores: el número de cheque conserva los ceros', b.numero === '00123456', b.numero)
    chk('identificadores: la cuenta conserva los ceros', b.cuenta === '09420314667', b.cuenta)
    chk('identificadores: el CUIT va en dígitos, sin puntos', b.titulares[0].cuit === '20123456783', b.titulares[0].cuit)
    chk('identificadores: los renglones de la banda no se enlazan como número',
      !/enlazarCampoNumero\([^)]*data-r[123]/.test(FUENTE) && !/data-r[123][^>]*placeholder="0,00"/.test(FUENTE))
    // Solo dos campos se enlazan: el efectivo y el importe del cheque.
    const enlaces = [...FUENTE.matchAll(/enlazarCampoNumero\(([^,)]+)/g)].map(m => m[1].trim())
    chk('solo se enlazan el efectivo y el importe del cheque', enlaces.length === 2 &&
      enlaces.some(e => e.includes("'cob-efectivo'")) && enlaces.some(e => e === 'inp'), enlaces)
  }

  // ══ 7. Estático: no queda un parser propio ni una lectura con Number/parseFloat
  {
    const script = FUENTE.slice(FUENTE.indexOf('<script type="module">'))
    chk('no queda parseImporteCobranza', !/function parseImporteCobranza|parseImporteCobranza\(/.test(script))
    chk('ningún parseFloat en el módulo', !/parseFloat\(/.test(script))
    chk('el import trae las funciones de números de utils.js',
      /import \{[^}]*leerNumeroAr[^}]*\} from '\.\.\/js\/utils\.js'/.test(script) &&
      /import \{[^}]*enlazarCampoNumero[^}]*ponerNumero[^}]*\} from '\.\.\/js\/utils\.js'/.test(script))
    chk('la plantilla del importe ya no lleva value=""', !/data-importe="\$\{escCob\(ch\.id\)\}"[^>]*value=/.test(script))
  }

  for (const f of fallas) console.log('  ✗ ' + f)
  const total = ok + fallas.length
  console.log(`${ok}/${total} ${fallas.length ? 'ROJO' : 'verde'}`)
  process.exit(fallas.length ? 1 : 0)
}

main().catch(err => { console.error(err); console.log('ROJO (excepción)'); process.exit(1) })
