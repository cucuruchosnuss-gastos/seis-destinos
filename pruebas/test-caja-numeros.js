// Números de modulos/caja.html: los TRES campos de monto (movimiento —ingreso
// externo, ingreso propio, egreso y retiro—, traspaso "sale" y traspaso
// "entra" entre monedas) pasan por las funciones compartidas de js/utils.js
// desde el 21/09/2026.
//
// Se EJECUTA el código real de los dos archivos: las funciones del módulo se
// extraen del <script> y las de números salen del utils.js real
// (fuenteNumeros). Los campos son inputFalso(), que tipea, borra y pega como el
// navegador, y el número se verifica EN LO QUE VIAJA a la RPC, capturado con un
// supabase mockeado: siempre sale del campo enlazado, nunca de una constante.
//
// Qué se prueba:
//  1. guardarMovimiento() REAL: p_monto de registrar_ingreso_externo_caja,
//     crear_solicitud_movimiento_caja (ingreso propio y egreso) y
//     registrar_retiro_caja; y que un monto inválido frena sin llamar.
//  2. guardarTraspaso() REAL: p_monto_origen y p_monto_destino, con la misma
//     moneda (destino = origen) y entre monedas (el campo de destino).
//  3. Abrir los modales limpia los campos (y su estado de enlace).
//  4. formatearImporte / importeHtml / formatearImporteCentavosSuaves: IGUAL
//     que antes (contra el baseline fijo) para todo valor presente, "—" para
//     un importe ausente; la moneda sigue escapada.
//  5. Estático: no quedan parseImporte / formatearImporteEnVivo /
//     type="number"; se enlazan exactamente los 3 montos y ningún
//     identificador (CBU, alias, número de cuenta).
//
// Archivo bajo prueba: ARCHIVO_TEST, o modulos/caja.html.
// Baseline (el archivo antes de la migración): commit b97b44c, FIJO.

const path = require('path')
const { execFileSync } = require('child_process')
const { construirCon } = require('./sandbox')
const { fuenteNumeros, inputFalso } = require('./numeros-comun')
const { extraerFn } = require('./extraer')
const { leer } = require('./circuito-comun')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/caja.html')
const FUENTE = leer(ARCHIVO)
const BASELINE = 'b97b44c'
const FUENTE_BASE = execFileSync('git', ['show', `${BASELINE}:modulos/caja.html`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
if (FUENTE_BASE.length < 100000) throw new Error('no se pudo leer el baseline ' + BASELINE)

let ok = 0
const fallas = []
function chk(nombre, condicion, detalle) {
  if (condicion) ok++
  else fallas.push(nombre + (detalle !== undefined ? ` — ${typeof detalle === 'string' ? detalle : JSON.stringify(detalle)}` : ''))
}

const PRELUDIO = `
  ${fuenteNumeros()}
  var __inputFalso = ${inputFalso.toString()}
  var console = { log(){}, warn(){}, error: globalThis.console.error }

  // --- DOM falso: cada elemento es un inputFalso --------------------------
  function nuevoEl(id, valor) {
    const el = __inputFalso(valor || '')
    Object.assign(el, {
      id, hidden: false, disabled: false, textContent: '', innerHTML: '', style: {}, dataset: {},
      classList: { add(){}, remove(){}, toggle(){}, contains(){ return false } },
      querySelectorAll: () => [], querySelector: () => null, focus(){},
    })
    return el
  }
  var __els = new Map()
  var document = {
    getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) },
    querySelector: () => null, querySelectorAll: () => [],
  }

  // --- dependencias externas, stubeadas ----------------------------------
  var __llamadas = []
  var __respuestaSolicitud = 'pendiente'
  var supabase = {
    rpc: async (nombre, params) => {
      __llamadas.push({ nombre, params: JSON.parse(JSON.stringify(params)) })
      return { data: nombre === 'crear_solicitud_movimiento_caja' ? __respuestaSolicitud : null, error: null }
    },
  }
  var __errores = []
  function mostrarError(m) { __errores.push(m) } function mostrarExito() {}
  async function cargarCuentasDe() {} function poblarSelectorCuentaUnica() {}
  async function poblarSelectorContraparte() {} async function poblarSelectorCuentaPropia() {}
  function poblarSelectoresTraspaso() {}
  async function refrescarSaldosDeFicha() {} async function cargarMovimientos() {}
  async function cargarSolicitudesPendientes() {} async function actualizarBadgePendientesListado() {}
  function tieneTarea() { return true }
  var traspasoEmpleadoId = null
  var estado = {
    miEmpleado: { id: 'yo' }, idEmpresa: 'empresa', origenFicha: 'directo', personaAbierta: null,
    nombresEmpleados: { otro: 'Otra Persona', empresa: 'Empresa' },
    cuentasPorId: {
      c1: { id: 'c1', moneda: 'ARS' }, c2: { id: 'c2', moneda: 'ARS' }, c3: { id: 'c3', moneda: 'USD' },
    },
    wizardMovimiento: null,
  }
`

const FUNCIONES = [
  'esc', 'formatearImporte', 'importeHtml', 'formatearImporteCentavosSuaves',
  'enlazarCamposMonto', 'montoDeCampo', 'fechaISO',
  'abrirModalMovimiento', 'cerrarModalMovimiento', 'guardarMovimiento',
  'abrirModalTraspaso', 'cerrarModalTraspaso', 'guardarTraspaso',
]

function sandbox() {
  const S = construirCon(ARCHIVO, {
    preludio: PRELUDIO, funciones: FUNCIONES, constantes: ['IDS_CAMPOS_MONTO'],
    retorno: `estado, __els, __errores, __llamadas(){ return __llamadas }, __limpiar(){ __llamadas = []; __errores.length = 0 },
      __respuesta(r){ __respuestaSolicitud = r }, __doc: document, IDS_CAMPOS_MONTO`,
  })
  S.enlazarCamposMonto()
  return S
}

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

// Cada tipo de movimiento, con la RPC que tiene que llamar.
const MOVIMIENTOS = [
  ['ingreso externo', 'ingreso', 'externo', 'registrar_ingreso_externo_caja'],
  ['ingreso propio', 'ingreso', 'propio', 'crear_solicitud_movimiento_caja'],
  ['egreso', 'egreso', 'propio', 'crear_solicitud_movimiento_caja'],
  ['retiro', 'retiro', 'propio', 'registrar_retiro_caja'],
]

async function main() {
  // ══ 1. guardarMovimiento ═════════════════════════════════════════════════
  for (const [nombreMov, tipo, subtipo, rpc] of MOVIMIENTOS) {
    for (const [nombre, accion, visto, numero] of CASOS) {
      const S = sandbox()
      await S.abrirModalMovimiento(tipo, 'yo', subtipo)
      const el = S.__els.get('movimiento-monto')
      chk('movimiento-monto queda type=text con teclado decimal', el.type === 'text' && el.atributos.inputmode === 'decimal', [el.type, el.atributos])
      accion(el)
      chk(`${nombreMov} (${nombre}): el campo muestra ${visto}`, el.value === visto, el.value)
      setSelects(S)
      S.__limpiar()
      await S.guardarMovimiento()
      const ll = S.__llamadas()
      chk(`${nombreMov} (${nombre}): llama a ${rpc} una vez`, ll.length === 1 && ll[0].nombre === rpc, ll)
      chk(`${nombreMov} (${nombre}): p_monto = ${numero}`, ll[0] && ll[0].params.p_monto === numero, ll[0] && ll[0].params)
      chk(`${nombreMov} (${nombre}): sin errores`, S.__errores.length === 0, S.__errores)
    }
    // Un monto inválido o vacío frena sin llamar a nada.
    for (const texto of ['', '0', '0,00']) {
      const S = sandbox()
      await S.abrirModalMovimiento(tipo, 'yo', subtipo)
      S.__els.get('movimiento-monto').escribirCrudo(texto)
      setSelects(S)
      S.__limpiar()
      await S.guardarMovimiento()
      chk(`${nombreMov} con monto "${texto}": no llama a ninguna RPC`, S.__llamadas().length === 0, S.__llamadas())
      chk(`${nombreMov} con monto "${texto}": avisa "Ingresá un monto válido."`, S.__errores.includes('Ingresá un monto válido.'), S.__errores)
    }
  }

  // Abrir el modal limpia lo que quedó de antes (y el estado del enlace).
  {
    const S = sandbox()
    await S.abrirModalMovimiento('retiro', 'yo')
    S.__els.get('movimiento-monto').teclear('12345')
    await S.abrirModalMovimiento('retiro', 'yo')
    const el = S.__els.get('movimiento-monto')
    chk('reabrir el modal de movimiento deja el monto vacío', el.value === '', el.value)
    el.teclear('7')
    chk('después de reabrir, tipear "7" da "7" (el enlace no arrastra lo anterior)', el.value === '7', el.value)
    setSelects(S)
    S.__limpiar()
    await S.guardarMovimiento()
    chk('después de reabrir, p_monto = 7', S.__llamadas()[0] && S.__llamadas()[0].params.p_monto === 7, S.__llamadas())
  }

  // ══ 2. guardarTraspaso ═══════════════════════════════════════════════════
  async function traspaso(origen, destino, accionOrigen, accionDestino) {
    const S = sandbox()
    await S.abrirModalTraspaso('yo')
    S.__doc.getElementById('traspaso-cuenta-origen').value = origen
    S.__doc.getElementById('traspaso-cuenta-destino').value = destino
    const o = S.__els.get('traspaso-monto'), d = S.__els.get('traspaso-monto-destino')
    accionOrigen(o)
    if (accionDestino) accionDestino(d)
    S.__limpiar()
    await S.guardarTraspaso()
    return { S, o, d, ll: S.__llamadas() }
  }
  for (const [nombre, accion, visto, numero] of CASOS) {
    // Misma moneda: el destino es el mismo número.
    {
      const { S, o, ll } = await traspaso('c1', 'c2', accion)
      chk('traspaso-monto queda type=text con teclado decimal', o.type === 'text' && o.atributos.inputmode === 'decimal')
      chk(`traspaso misma moneda (${nombre}): el campo muestra ${visto}`, o.value === visto, o.value)
      chk(`traspaso misma moneda (${nombre}): llama a registrar_traspaso_cuenta_caja`, ll.length === 1 && ll[0].nombre === 'registrar_traspaso_cuenta_caja', ll)
      chk(`traspaso misma moneda (${nombre}): p_monto_origen = p_monto_destino = ${numero}`, ll[0] && ll[0].params.p_monto_origen === numero && ll[0].params.p_monto_destino === numero, ll[0] && ll[0].params)
      chk(`traspaso misma moneda (${nombre}): sin errores`, S.__errores.length === 0, S.__errores)
    }
    // Entre monedas: el destino sale de SU campo (y el origen, del suyo).
    {
      const { S, d, ll } = await traspaso('c1', 'c3', (el) => el.escribirCrudo('1.000.000'), accion)
      chk('traspaso-monto-destino queda type=text con teclado decimal', d.type === 'text' && d.atributos.inputmode === 'decimal')
      chk(`traspaso entre monedas (${nombre}): el campo de destino muestra ${visto}`, d.value === visto, d.value)
      chk(`traspaso entre monedas (${nombre}): p_monto_destino = ${numero}`, ll[0] && ll[0].params.p_monto_destino === numero, ll[0] && ll[0].params)
      chk(`traspaso entre monedas (${nombre}): p_monto_origen = 1000000`, ll[0] && ll[0].params.p_monto_origen === 1000000, ll[0] && ll[0].params)
      chk(`traspaso entre monedas (${nombre}): sin errores`, S.__errores.length === 0, S.__errores)
    }
  }
  for (const texto of ['', '0']) {
    const { S, ll } = await traspaso('c1', 'c2', (el) => el.escribirCrudo(texto))
    chk(`traspaso con monto "${texto}": no llama y avisa`, ll.length === 0 && S.__errores.includes('Ingresá un monto válido.'), [ll, S.__errores])
    const r = await traspaso('c1', 'c3', (el) => el.escribirCrudo('100'), (el) => el.escribirCrudo(texto))
    chk(`traspaso entre monedas con destino "${texto}": no llama y avisa`, r.ll.length === 0 && r.S.__errores.includes('Ingresá el monto que entra.'), [r.ll, r.S.__errores])
  }
  {
    const S = sandbox()
    await S.abrirModalTraspaso('yo')
    S.__els.get('traspaso-monto').teclear('555')
    S.__els.get('traspaso-monto-destino').teclear('666')
    await S.abrirModalTraspaso('yo')
    chk('reabrir el traspaso deja los dos montos vacíos',
      S.__els.get('traspaso-monto').value === '' && S.__els.get('traspaso-monto-destino').value === '',
      [S.__els.get('traspaso-monto').value, S.__els.get('traspaso-monto-destino').value])
  }

  // ══ 4. Formateadores ═════════════════════════════════════════════════════
  {
    const S = sandbox()
    const viejo = new Function(extraerFn(FUENTE_BASE, 'formatearImporte') + '\nreturn formatearImporte')()
    const viejoSuaves = new Function(extraerFn(FUENTE_BASE, 'esc') + '\n' + extraerFn(FUENTE_BASE, 'formatearImporteCentavosSuaves') + '\nreturn formatearImporteCentavosSuaves')()
    const valores = [0, 1, 1.5, 10, 999.99, 1000, 1500, 387300.5, 2000000, 1349799.77, -1234.5, -0.5, 0.01, 123456789.12, '1500', '-2500.75', 1234.567]
    for (const v of valores) {
      for (const moneda of ['ARS', 'USD']) {
        chk(`formatearImporte(${JSON.stringify(v)}, ${moneda}) igual que antes`, S.formatearImporte(v, moneda) === viejo(v, moneda), [S.formatearImporte(v, moneda), viejo(v, moneda)])
        chk(`formatearImporteCentavosSuaves(${JSON.stringify(v)}, ${moneda}) igual que antes`, S.formatearImporteCentavosSuaves(v, moneda) === viejoSuaves(v, moneda), [S.formatearImporteCentavosSuaves(v, moneda), viejoSuaves(v, moneda)])
      }
    }
    for (const v of [null, undefined, '', NaN, 'abc']) {
      chk(`formatearImporte(${String(v)}) = "—"`, S.formatearImporte(v) === '—', S.formatearImporte(v))
      chk(`formatearImporte(${String(v)}, USD) = "—"`, S.formatearImporte(v, 'USD') === '—', S.formatearImporte(v, 'USD'))
      chk(`importeHtml(${String(v)}) = "—"`, S.importeHtml(v, 'ARS') === '—', S.importeHtml(v, 'ARS'))
      chk(`formatearImporteCentavosSuaves(${String(v)}) = "—"`, S.formatearImporteCentavosSuaves(v) === '—', S.formatearImporteCentavosSuaves(v))
    }
    chk('el viejo formatearImporteCentavosSuaves daba "$ 0,00" con null (lo que se arregló)', /^\$ 0<span/.test(viejoSuaves(null)))
    chk('el viejo formatearImporte daba "$ 0,00" con \'\' (lo que se arregló)', viejo('') === '$ 0,00')
    chk('formatearImporte(387300.5) = "$ 387.300,50"', S.formatearImporte(387300.5) === '$ 387.300,50')
    chk('formatearImporte sigue siendo TEXTO PLANO (no escapa la moneda)', S.formatearImporte(1, 'A&B') === 'A&B 1,00')
    chk('importeHtml escapa la moneda', S.importeHtml(1, '<b>') === '&lt;b&gt; 1,00', S.importeHtml(1, '<b>'))
    chk('formatearImporteCentavosSuaves escapa la moneda', S.formatearImporteCentavosSuaves(1, '<b>') === '&lt;b&gt; 1<span class="stat-card-caja__centavos">,00</span>', S.formatearImporteCentavosSuaves(1, '<b>'))
  }

  // ══ 5. Estático ══════════════════════════════════════════════════════════
  {
    const script = FUENTE.slice(FUENTE.indexOf('<script type="module">'))
    const codigo = script.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n')
    chk('no queda parseImporte', !/parseImporte\s*\(/.test(codigo))
    chk('no queda formatearImporteEnVivo', !/formatearImporteEnVivo\s*\(/.test(codigo))
    chk('no queda parseFloat', !/parseFloat\s*\(/.test(codigo))
    chk('no queda toLocaleString sobre un importe', !/toLocaleString\(/.test(codigo))
    chk('no queda ningún type="number"', !/type="number"/.test(FUENTE))
    chk('ningún .value de un monto se asigna a mano', !/getElementById\('(movimiento-monto|traspaso-monto|traspaso-monto-destino)'\)\.value\s*=/.test(codigo))
    chk('ningún .value de un monto se lee a mano', !/getElementById\('(movimiento-monto|traspaso-monto|traspaso-monto-destino)'\)\.value/.test(codigo))
    const enlaces = [...codigo.matchAll(/enlazarCampoNumero\(/g)].length
    chk('hay un solo enlazarCampoNumero (el bucle de los montos)', enlaces === 1, enlaces)
    const S = sandbox()
    chk('IDS_CAMPOS_MONTO son exactamente los 3 montos', JSON.stringify([...S.IDS_CAMPOS_MONTO].sort()) === JSON.stringify(['movimiento-monto', 'traspaso-monto', 'traspaso-monto-destino']), S.IDS_CAMPOS_MONTO)
    chk('enlazarCamposMonto enlaza los 3 (type=text)', S.IDS_CAMPOS_MONTO.every(id => S.__els.get(id).type === 'text'))
    chk('los montos se enlazan con 2 decimales', /enlazarCampoNumero\(document\.getElementById\(id\), \{ decimales: 2 \}\)/.test(codigo))
    chk('los identificadores bancarios NO se enlazan', !/enlazarCampoNumero\([^)]*(cbu|alias|numero)/i.test(codigo) && !/IDS_CAMPOS_MONTO = \[[^\]]*(cbu|alias|numero)/.test(codigo))
    chk('el enlace corre al iniciar', /\n    enlazarCamposMonto\(\)\n/.test(codigo))
  }

  const total = ok + fallas.length
  for (const f of fallas) console.log('  ✗ ' + f)
  console.log(`${ok}/${total}${fallas.length ? '  ROJO' : '  verde'}`)
  process.exit(fallas.length ? 1 : 0)
}

// Los selectores que guardarMovimiento() lee: contraparte, las dos cuentas del
// movimiento entre personas y la cuenta única del externo y el retiro.
function setSelects(S) {
  for (const [id, v] of [['contraparte-select', 'otro'], ['cuenta-propia-select', 'c1'], ['cuenta-contraparte-select', 'c2'], ['cuenta-select', 'c1'], ['movimiento-fecha', '2026-09-21']]) {
    S.__doc.getElementById(id).value = v
  }
}

main().catch(e => { console.log('EXCEPCIÓN', e && e.stack || e); process.exit(1) })
