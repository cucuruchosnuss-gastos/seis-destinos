// CUENTAS CORRIENTES: PAGO A PROVEEDORES EN LOS DOS SENTIDOS Y ORDEN DE PAGO
// (20/10/2026, rama ci-prueba/pago-mixto; antes, 15/10/2026: los cheques de
// cualquier empresa y el pago mixto en dos llamadas).
//
// Pedido de Facu (20/10/2026):
//  1. "Registrar pago" en pesos es UNA pantalla con dos bloques que se llenan
//     en cualquier orden: las FACTURAS (tilde + cuánto se aplica, por defecto
//     su saldo, se puede pagar una parte) y los VALORES (cheques de la cartera
//     de cualquier empresa + efectivo / transferencia / QR con su cuenta).
//     Abajo: "Facturas $ X · Valores $ Y · Diferencia $ Z".
//  2. "Completar con efectivo/transferencia" (pone la diferencia) y "Aplicar a
//     las facturas más viejas" (tilda de la más vieja a la más nueva, la
//     última parcial). Facturas > Valores no deja confirmar; Valores >
//     Facturas avisa lo que queda a favor; sin facturas, pago a cuenta.
//  3. Confirmar: UNA llamada a pagar_proveedor_mixto (la base reparte), con
//     el error de la base tal cual y sin orden si falla.
//  4. La ORDEN DE PAGO (datos_orden_pago), imprimible, sin la empresa del
//     cheque ni la cuenta, con el total en letras con centavos; y (desde el
//     30/10/2026) la orden de cada pago en su renglón de la cuenta, para
//     reimprimirla (se fue el recuadro "Órdenes de pago (N)" de la ficha).
// Se EJECUTAN las funciones reales del módulo con un document y una base
// falsos; lo que viaja a la base se mira en los parámetros de cada RPC.
//
//   node pruebas/test-cuentas-corrientes-pago-mixto.js
'use strict'

const path = require('path')
const { construirCon, scriptModulo } = require('./sandbox')
const { arnes, leer, marca, chequearMarcas } = require('./circuito-comun')
const { fuenteNumeros } = require('./numeros-comun')
const { FUNCIONES_PAGO_APLICAR } = require('./pago-aplicar-comun')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/cuentas-corrientes.html')
const FUENTE = leer(ARCHIVO)
const SCRIPT = scriptModulo(ARCHIVO)
const { chk, esperas, fin } = arnes()

const HOY = '2026-10-20'

const PRELUDIO = `
  ${fuenteNumeros()}
  var console = { log(){}, warn(){}, error(){} }
  function nuevoEl(id) {
    const atributos = {}
    const clases = new Set()
    return { id, value: '', innerHTML: '', textContent: '', hidden: false, disabled: false, readOnly: false, style: {}, dataset: {},
      options: [],
      setAttribute(k, v) { atributos[k] = String(v) }, getAttribute(k) { return k in atributos ? atributos[k] : null },
      appendChild(o) { this.options.push(o) },
      classList: { add(c) { clases.add(c) }, remove(c) { clases.delete(c) }, toggle(c, si) { if (si === undefined) si = !clases.has(c); if (si) clases.add(c); else clases.delete(c) }, contains(c) { return clases.has(c) } },
      addEventListener() {}, focus() {}, querySelectorAll: () => [], querySelector: () => null, closest: () => null, __atributos: atributos }
  }
  var __els = new Map()
  // Los botones de los medios.
  var __medios = ['efectivo', 'transferencia', 'qr'].map(v => { const b = nuevoEl('m-' + v); b.dataset.valor = v; return b })
  var document = {
    getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) },
    querySelectorAll(sel) {
      if (sel === '#grilla-medio-pago-cc .btn-tipo-doc') return __medios
      return []
    },
    querySelector: () => null,
    createElement() { return { value: '', textContent: '' } },
    documentElement: nuevoEl('html'),
  }
  var __impresiones = 0
  var window = { scrollY: 0, innerHeight: 800, print() { __impresiones++ }, addEventListener() {}, removeEventListener() {} }
  // La base falsa: anota cada RPC; cada una responde lo que diga __respuestas
  // (una lista se consume en orden). Las tablas responden __tablas, filtradas
  // por eq/in como PostgREST, y se anota cada consulta con sus filtros.
  var __rpc = [], __respuestas = {}, __consultas = [], __espera = null
  var supabase = {
    rpc: async (nombre, params) => {
      __rpc.push({ nombre, params: JSON.parse(JSON.stringify(params)) })
      if (__espera) await __espera
      let r = __respuestas[nombre]
      if (Array.isArray(r)) r = r.shift()
      if (r && r.lanzar) throw new Error(r.lanzar)
      return r ?? { data: null, error: null }
    },
    from(t) {
      const filtros = [], reg = { t, sel: null, eq: [], orden: null }
      const q = { select: (c) => { reg.sel = c; return q },
        eq: (c, v) => { reg.eq.push([c, v]); filtros.push(r => r[c] === v); return q },
        in: (c, vs) => { filtros.push(r => vs.includes(r[c])); return q },
        order: (c, o) => { reg.orden = [c, o]; return q },
        then(r, rej) { __consultas.push(reg); return Promise.resolve({ data: (__tablas[t] ?? []).filter(x => filtros.every(f => f(x))), error: __fallaTabla[t] ?? null }).then(r, rej) } }
      return q
    },
  }
  var __tablas = {}, __fallaTabla = {}
  var turnoCartera = 0, bancosBcra = null, turnoFacturasPago = 0, errorFacturasPago = null, turnoOrdenPago = 0
  var __errores = [], __exitos = [], __recargas = 0
  function mostrarError(m) { __errores.push(m) } function mostrarExito(m) { __exitos.push(m) }
  function formatearFecha(f) { if (!f) return '—'; const [a, m, d] = String(f).split('-'); return d + '/' + m + '/' + a }
  // Los montos de los campos, por id (lo que leería leerCampoNumero).
  var __montos = {}
  function montoDeCampo(id) { return __montos[id] ?? null }
  function ponerNumero(el, n) { __montos[el.id] = n; el.value = n == null ? '' : String(n) }
  function leerCampoNumero(el) { return __montos[el.id] ?? null }
  function enlazarCampoNumero() {}
  function hoyCC() { return '${HOY}' }
  function fechaISO() { return '${HOY}' }
  async function cargarFichaSaldos() { __recargas++ } async function cargarFichaMovimientos() {}
  async function cargarFichaCreditos() {} function renderizarFichaBanner() {} function cargarSaldos() {}
  async function cargarCuentasParaPago() {}
  function saldosFichaDeUnidad() { return [{ unidad_negocio_id: 'u-n', moneda: 'ARS', deuda_pendiente: 1 }] }
  function poblarSelect() {}
  var medioPagoSeleccionado = null, carteraPago = [], facturasParaPago = []
  var estado = { miRolApp: 'usuario', miEmpleadoId: 'yo', misTareas: new Set(['cuentas_corrientes:registrar_pago', 'cobranzas:procesar']),
    ficha: { proveedorId: 'p1', unidadId: 'u-n', nombre: 'ANATOLIA SRL' },
    maestros: { unidades: [{ id: 'u-n', nombre: 'Cucuruchos Nuss', prefijo: 'N' }, { id: 'u-d', nombre: 'Dolce Pasta', prefijo: 'D' }, { id: 'u-t', nombre: 'Taller', prefijo: 'T' }] },
    cuentasPago: { propias: [{ id: 'cta-ef', nombre: 'Efectivo', medio: 'efectivo', moneda: 'ARS' }, { id: 'cta-bco', nombre: 'Macro', medio: 'banco', moneda: 'ARS' }], empresa: [] },
    fabrica: null, pagoCheques: false, pagoError: null, pagoEnviando: false }
`

const FUNCIONES = [
  'esc', 'formatearImporte', 'importeHtml', 'tieneTarea', 'nombreUnidad', 'etiquetaUnidad', 'numeroParaMostrar',
  'esMedioCheque', 'puedeUsarCartera', 'fechaCobroCheque', 'libradorDe', 'sumaCheques',
  'chequesParaPagar', 'agruparChequesPorEmpresa', 'textoAvisoOtraEmpresa', 'avisosOtraEmpresa',
  'htmlFilaCartera', 'htmlListaCartera', 'renderizarCarteraPago', 'pintarTotalCartera', 'tildarChequeCartera',
  'cargarCarteraParaPago', 'asegurarBancos', 'pintarCarteraPago', 'alternarCarteraPago',
  'monedaPago', 'esPagoEnPesos', 'seleccionarMedioPagoCC', 'pintarMedioPorMoneda', 'actualizarSelectorCuentaPago',
  'centavosDe', 'totalesPago', 'totalesPagoActuales', 'estadoDiferencia', 'htmlBarraPago', 'aplicarAFacturasViejas',
  'montoParaCompletar', 'aplicacionesPago', 'validarPago', 'parametrosPagoMixto', 'textoResumenPago',
  'pintarPiePago', 'refrescarPago', 'aplicarValoresAFacturas', 'completarDiferencia',
  'abrirModalPago', 'cerrarModalPago', 'actualizarSugerenciasPago', 'programarActualizarSugerenciasPago', 'renderizarFilasFifo',
  'elegirSoloFactura', 'textoExitoPago', 'recargarFichaDespuesDePago', 'confirmarPago',
  'logoSeguroCC', 'cuitConGuiones', 'fechaOrden', 'letrasMenorDeMil', 'letrasMenorDeMillon', 'enteroEnLetras', 'importeEnLetras',
  'htmlOrdenPago', 'lineaSaldoOrdenPago', 'leerSaldoOrdenPago', 'abrirOrdenPago', 'cerrarOrdenPago', 'imprimirOrdenPago',
  'numeroTextoOrden', 'cargarOrdenesDePagos',
  // aplicar un pago a facturas y anular un pago (30/10/2026)
  ...FUNCIONES_PAGO_APLICAR,
]
const CONSTANTES = ['MEDIOS_CHEQUE', 'NOMBRE_MEDIO', 'MEDIO_CUENTA_LABEL', 'MEDIO_PAGO_A_MEDIO_CUENTA', 'NUMERO_SALDO_INICIAL',
  'LETRAS_UNIDAD', 'LETRAS_DECENA', 'LETRAS_CENTENA', 'NOMBRE_MEDIO_ORDEN', 'TANDA_GASTOS_PAGO']

function sandbox() {
  return construirCon(ARCHIVO, {
    preludio: PRELUDIO, funciones: FUNCIONES, constantes: CONSTANTES,
    retorno: `estado, __els, __rpc, __errores, __exitos, __montos, __medios, __consultas, __tablas, __fallaTabla,
      __setVar(k, v){ eval(k + ' = v') }, __getVar(k){ return eval(k) }, __responder(n, r){ __respuestas[n] = r },
      __esperar(p){ __espera = p }, __recargas(){ return __recargas }, __impresiones(){ return __impresiones }`,
  })
}
const el = (S, id) => S.__getVar('document').getElementById(id)

// Las cobranzas: dos de Nuss (la que paga), una de Dolce, una de Taller, una
// sin empresa, una sin asentar de Dolce y una en dólares.
const COBRANZAS = new Map([
  ['cob-n', { id: 'cob-n', estado: 'procesada', unidad_negocio_id: 'u-n', unidad_negocio_nombre: 'Cucuruchos Nuss', moneda: 'ARS', cliente: 'Anatolia' }],
  ['cob-d', { id: 'cob-d', estado: 'procesada', unidad_negocio_id: 'u-d', unidad_negocio_nombre: 'Dolce Pasta', moneda: 'ARS', cliente: 'Sol' }],
  ['cob-t', { id: 'cob-t', estado: 'procesada', unidad_negocio_id: 'u-t', unidad_negocio_nombre: 'Taller', moneda: 'ARS', cliente: 'X' }],
  ['cob-sin', { id: 'cob-sin', estado: 'procesada', unidad_negocio_id: null, unidad_negocio_nombre: null, moneda: 'ARS', cliente: 'X' }],
  ['cob-d-reg', { id: 'cob-d-reg', estado: 'registrada', unidad_negocio_id: 'u-d', unidad_negocio_nombre: 'Dolce Pasta', moneda: 'ARS', cliente: 'X' }],
  ['cob-d-usd', { id: 'cob-d-usd', estado: 'procesada', unidad_negocio_id: 'u-d', unidad_negocio_nombre: 'Dolce Pasta', moneda: 'USD', cliente: 'X' }],
])
const ch = (id, cob, importe, fechaPago, extra = {}) => ({ id, cobranza_id: cob, banco_codigo: '007', numero: id.toUpperCase(), tipo: 'diferido', fecha_emision: '2026-09-01', fecha_pago: fechaPago, importe, titulares: [], estado: 'en_cartera', ...extra })
const CHEQUES = [
  ch('t1', 'cob-t', 1000, '2026-10-02'),
  ch('d1', 'cob-d', 120000, '2026-10-05'),
  ch('n1', 'cob-n', 150000, '2026-10-20'),
  ch('n2', 'cob-n', 0.1, '2026-10-01'),
  ch('sin', 'cob-sin', 5, '2026-10-01'),
  ch('dreg', 'cob-d-reg', 5, '2026-10-01'),
  ch('dusd', 'cob-d-usd', 5, '2026-10-01'),
  ch('dend', 'cob-d', 5, '2026-10-01', { estado: 'endosado' }),
]

async function main() {
  // ══ 1. LOS CHEQUES DE TODAS LAS EMPRESAS ═══════════════════════════════════
  {
    const S = sandbox()
    const lista = S.chequesParaPagar(CHEQUES, COBRANZAS, 'u-n', new Map())
    chk('se ofrecen los de TODAS las empresas (en cartera, asentados, en pesos)',
      JSON.stringify(lista.map(c => c.id).sort()) === '["d1","n1","n2","t1"]', JSON.stringify(lista.map(c => c.id)))
    chk('un cheque de una cobranza sin empresa NO se ofrece (no se sabría de quién es)', !lista.some(c => c.id === 'sin'))
    chk('sin asentar, en dólares o ya salido, tampoco', !lista.some(c => ['dreg', 'dusd', 'dend'].includes(c.id)))
    const d1 = lista.find(c => c.id === 'd1'), n1 = lista.find(c => c.id === 'n1')
    chk('cada cheque sabe su empresa y su nombre', d1.unidadId === 'u-d' && d1.unidadNombre === 'Dolce Pasta' && n1.unidadId === 'u-n')
    chk('el de otra empresa va marcado; el de la que paga, no', d1.otraEmpresa === true && n1.otraEmpresa === false && lista.find(c => c.id === 't1').otraEmpresa === true)

    // Agrupados: la que paga primero, después por nombre (Dolce antes que Taller).
    const grupos = S.agruparChequesPorEmpresa(lista, 'u-n')
    chk('agrupados: la empresa que paga primero, después por nombre',
      JSON.stringify(grupos.map(g => g.nombre)) === '["Cucuruchos Nuss","Dolce Pasta","Taller"]', JSON.stringify(grupos.map(g => g.nombre)))
    chk('solo la que paga va como propia', grupos[0].propia === true && grupos.slice(1).every(g => g.propia === false))
    chk('adentro de cada empresa, del que se cobra primero al último', JSON.stringify(grupos[0].cheques.map(c => c.id)) === '["n2","n1"]', JSON.stringify(grupos[0].cheques.map(c => c.id)))
    // La que paga va primero aunque su nombre venga después en el abecedario.
    const otra = S.agruparChequesPorEmpresa(lista, 'u-t')
    chk('la que paga va primero aunque por nombre fuera última', JSON.stringify(otra.map(g => g.nombre)) === '["Taller","Cucuruchos Nuss","Dolce Pasta"]', JSON.stringify(otra.map(g => g.nombre)))
    chk('sin cheques, sin grupos', S.agruparChequesPorEmpresa([], 'u-n').length === 0)

    // La lista dibujada: un título por empresa y "de Dolce Pasta" en los de otra.
    S.__setVar('medioPagoSeleccionado', 'cartera')
    S.__setVar('carteraPago', grupos.flatMap(g => g.cheques))
    S.renderizarCarteraPago()
    const h = el(S, 'lista-cartera-pago').innerHTML
    const titulos = [...h.matchAll(/class="cartera-pago__grupo">([^<]*)</g)].map(m => m[1])
    chk('un título por empresa, en orden', JSON.stringify(titulos) === '["Cucuruchos Nuss","Dolce Pasta","Taller"]', JSON.stringify(titulos))
    // La etiqueta va al principio de la segunda línea (no se recorta con "…").
    chk('"de Dolce Pasta" y "de Taller" en los de otra empresa',
      /N° D1[^<]*<\/span>\s*<span class="cartera-pago__linea2"><span class="cartera-pago__empresa">de Dolce Pasta<\/span>/.test(h) &&
      /N° T1[^<]*<\/span>\s*<span class="cartera-pago__linea2"><span class="cartera-pago__empresa">de Taller<\/span>/.test(h), h)
    chk('los de la empresa que paga no llevan "de …"', (h.match(/cartera-pago__empresa/g) || []).length === 2)
    // Cada casilla es su lugar en carteraPago (el orden agrupado).
    const indices = [...h.matchAll(/data-cheque-cartera="(\d+)"/g)].map(m => Number(m[1]))
    const numeros = [...h.matchAll(/N° ([A-Z0-9]+) ·/g)].map(m => m[1])
    chk('cada casilla apunta a su cheque', JSON.stringify(indices) === '[0,1,2,3]' && JSON.stringify(numeros) === '["N2","N1","D1","T1"]', JSON.stringify([indices, numeros]))
    chk('el título va antes de sus cheques', h.indexOf('>Dolce Pasta<') < h.indexOf('N° D1') && h.indexOf('N° N1') < h.indexOf('>Dolce Pasta<'))
  }

  // La carga real: lee los cheques y sus cobranzas, saca la fábrica de
  // pruebas y deja carteraPago AGRUPADA (las casillas apuntan a ese orden).
  {
    const S = sandbox()
    S.__tablas.cobranza_cheques = CHEQUES
    // v_cobranzas sin el nombre en una: se completa con el de los maestros.
    S.__tablas.v_cobranzas = [...COBRANZAS.values()].map(c => c.id === 'cob-t' ? { ...c, unidad_negocio_nombre: undefined } : c)
    S.__setVar('medioPagoSeleccionado', 'cartera')
    await S.cargarCarteraParaPago('u-n')
    const cp = S.__getVar('carteraPago')
    chk('cargar: carteraPago queda agrupada (la que paga primero, después por nombre)', JSON.stringify(cp.map(c => c.id)) === '["n2","n1","d1","t1"]', JSON.stringify(cp.map(c => c.id)))
    chk('cargar: sin nombre en v_cobranzas, el de los maestros', cp.find(c => c.id === 't1')?.unidadNombre === 'Taller')
    chk('cargar: pide el nombre de la empresa a v_cobranzas', S.__consultas.some(q => q.t === 'v_cobranzas' && /unidad_negocio_nombre/.test(q.sel)))
    const h = el(S, 'lista-cartera-pago').innerHTML
    chk('cargar: la lista dibujada en ese orden', h.indexOf('N° N2') < h.indexOf('N° N1') && h.indexOf('N° N1') < h.indexOf('N° D1') && h.indexOf('N° D1') < h.indexOf('N° T1'))
    // La fábrica de pruebas (Taller, en este caso) no aparece para una cuenta real.
    const T = sandbox()
    T.__tablas.cobranza_cheques = CHEQUES
    T.__tablas.v_cobranzas = [...COBRANZAS.values()]
    T.estado.fabrica = { ok: true, unidades: new Set(['u-t']), personas: new Set(), soyDePrueba: false }
    await T.cargarCarteraParaPago('u-n')
    chk('cargar: sin los cheques de la fábrica de pruebas', JSON.stringify(T.__getVar('carteraPago').map(c => c.id)) === '["n2","n1","d1"]', JSON.stringify(T.__getVar('carteraPago').map(c => c.id)))
    // ...salvo que sea la empresa que paga.
    const U = sandbox()
    U.__tablas.cobranza_cheques = CHEQUES
    U.__tablas.v_cobranzas = [...COBRANZAS.values()]
    U.estado.fabrica = { ok: true, unidades: new Set(['u-t']), personas: new Set(), soyDePrueba: false }
    await U.cargarCarteraParaPago('u-t')
    chk('cargar: los de la fábrica de pruebas sí, si es la que paga', U.__getVar('carteraPago')[0]?.id === 't1', JSON.stringify(U.__getVar('carteraPago').map(c => c.id)))
    chk('cargar: sin cobranzas:ver_todo se avisa que la cartera (de todas las empresas) está incompleta', el(U, 'nota-cartera-pago').hidden === false && /de todas las empresas/.test(el(U, 'nota-cartera-pago').textContent))
    U.estado.misTareas.add('cobranzas:ver_todo')
    await U.cargarCarteraParaPago('u-t')
    chk('cargar: con cobranzas:ver_todo, sin el aviso', el(U, 'nota-cartera-pago').hidden === true)
  }

  // ══ 2. EL AVISO DE OTRA EMPRESA ════════════════════════════════════════════
  {
    const S = sandbox()
    chk('el aviso de un cheque, con el texto del pedido',
      S.textoAvisoOtraEmpresa(1, 'Dolce Pasta', 'Cucuruchos Nuss') === 'Este cheque es de Dolce Pasta: queda como deuda de Cucuruchos Nuss con Dolce Pasta (Entre empresas)')
    chk('el aviso de varios',
      S.textoAvisoOtraEmpresa(2, 'Dolce Pasta', 'Cucuruchos Nuss') === 'Estos 2 cheques son de Dolce Pasta: quedan como deuda de Cucuruchos Nuss con Dolce Pasta (Entre empresas)')
    const lista = S.agruparChequesPorEmpresa(S.chequesParaPagar(CHEQUES, COBRANZAS, 'u-n', new Map()), 'u-n').flatMap(g => g.cheques)
    S.__setVar('medioPagoSeleccionado', 'cartera')
    S.__setVar('carteraPago', lista)
    S.renderizarCarteraPago()
    chk('sin tildar, no hay aviso', el(S, 'aviso-cartera-otra-empresa').hidden === true && el(S, 'aviso-cartera-otra-empresa').innerHTML === '')
    S.tildarChequeCartera(0, true)   // n2, de la que paga
    chk('tildar uno de la que paga: no hay aviso', el(S, 'aviso-cartera-otra-empresa').hidden === true)
    S.tildarChequeCartera(2, true)   // d1, de Dolce
    const av = el(S, 'aviso-cartera-otra-empresa')
    chk('tildar uno de Dolce: el aviso, con los nombres de las dos empresas',
      av.hidden === false && av.innerHTML === '<p class="cartera-pago__aviso">Este cheque es de Dolce Pasta: queda como deuda de Cucuruchos Nuss con Dolce Pasta (Entre empresas)</p>', av.innerHTML)
    S.tildarChequeCartera(3, true)   // t1, de Taller
    chk('uno de Dolce y uno de Taller: un aviso por empresa', (av.innerHTML.match(/cartera-pago__aviso/g) || []).length === 2 && av.innerHTML.includes('Este cheque es de Taller: queda como deuda de Cucuruchos Nuss con Taller'))
    S.tildarChequeCartera(2, false)
    S.tildarChequeCartera(3, false)
    chk('destildarlos saca el aviso', av.hidden === true)
    chk('avisosOtraEmpresa mira solo los tildados', S.avisosOtraEmpresa(lista.map(c => ({ ...c, tildado: true })), 'u-n', 'Cucuruchos Nuss').length === 2 &&
      S.avisosOtraEmpresa(lista, 'u-n', 'Cucuruchos Nuss').length === 0)
    // Los nombres vienen de la base: escapados.
    S.__setVar('carteraPago', [{ id: 'x', numero: '1', importe: 1, tildado: true, unidadId: 'u-x', unidadNombre: marca('emp'), otraEmpresa: true }])
    S.renderizarCarteraPago()
    chequearMarcas(chk, 'aviso de otra empresa', el(S, 'aviso-cartera-otra-empresa').innerHTML, ['emp'])
    chequearMarcas(chk, 'título y "de …" de la lista', el(S, 'lista-cartera-pago').innerHTML, ['emp'])
  }

  // ══ 3. LAS CUENTAS, EN CENTAVOS ════════════════════════════════════════════
  const FV = { id: 'f-vieja', numero: '0003-00001201', fecha: '2026-08-20', saldo: 250000 }
  const FN = { id: 'f-nueva', numero: '0003-00001245', fecha: '2026-09-05', saldo: 400000 }
  const FX = { id: 'f-sinfecha', numero: '0003-9', fecha: null, saldo: 50000 }
  const CHN = { id: 'n1', importe: 150000, tildado: true, unidadId: 'u-n', unidadNombre: 'Cucuruchos Nuss', otraEmpresa: false }
  const CHD = { id: 'd1', importe: 120000, tildado: true, unidadId: 'u-d', unidadNombre: 'Dolce Pasta', otraEmpresa: true }
  {
    const S = sandbox()
    const t = S.totalesPago({
      facturas: [{ ...FV, checked: true, monto: 0.1 }, { ...FN, checked: true, monto: 0.2 }, { ...FX, checked: false, monto: 9 }],
      cheques: [{ importe: 0.1, tildado: true }, { importe: 5, tildado: false }], montoResto: 0.2,
    })
    chk('las cuentas van en centavos (0,1 + 0,2 = 0,30) y solo con lo tildado', t.cFacturas === 30 && t.cCheques === 10 && t.cResto === 20 && t.cValores === 30 && t.cDiferencia === 0, JSON.stringify(t))
    const v = S.totalesPago({ facturas: [], cheques: [], montoResto: null })
    chk('sin nada, todo en cero (un monto vacío no es NaN)', v.cFacturas === 0 && v.cValores === 0 && v.cDiferencia === 0, JSON.stringify(v))
    const n = S.totalesPago({ facturas: [{ checked: true, monto: -5 }], cheques: [], montoResto: -7 })
    chk('un negativo no suma', n.cFacturas === 0 && n.cResto === 0)
    const c = S.totalesPago({ facturas: [{ checked: true, monto: 1.13 }], cheques: [{ importe: 1.13, tildado: true }], montoResto: 1.13 })
    chk('1,13 son 113 centavos (sin el redondeo serían 112,99…)', c.cFacturas === 113 && c.cCheques === 113 && c.cResto === 113, JSON.stringify(c))
    // Con la cartera cerrada, sus cheques no cuentan aunque hayan quedado tildados.
    S.__setVar('carteraPago', [{ importe: 100, tildado: true }])
    S.estado.pagoCheques = false
    chk('la cartera cerrada no suma', S.totalesPagoActuales().cCheques === 0)
    S.estado.pagoCheques = true
    chk('la cartera abierta suma lo tildado', S.totalesPagoActuales().cCheques === 10000)
  }

  // ══ 4. LA DIFERENCIA ═══════════════════════════════════════════════════════
  {
    const S = sandbox()
    const d = (cF, cV) => S.estadoDiferencia({ cFacturas: cF, cValores: cV, cDiferencia: cV - cF })
    chk('nada: sin aviso', d(0, 0).tipo === 'vacio' && !d(0, 0).texto)
    chk('facturas > valores: "Faltan $ Z para cubrir las facturas elegidas"', d(65000000, 27000000).tipo === 'faltan' && d(65000000, 27000000).texto === 'Faltan $ 380.000,00 para cubrir las facturas elegidas', d(65000000, 27000000).texto)
    chk('sin facturas y con valores: pago a cuenta', d(0, 100).tipo === 'a_cuenta' && d(0, 100).texto === 'Pago a cuenta: queda todo a favor')
    chk('valores > facturas: "Quedan $ Z a favor del proveedor"', d(25000000, 30000000).tipo === 'a_favor' && d(25000000, 30000000).texto === 'Quedan $ 50.000,00 a favor del proveedor', d(25000000, 30000000).texto)
    chk('igual: sin aviso', d(100, 100).tipo === 'justo' && !d(100, 100).texto)
    const b = S.htmlBarraPago({ cFacturas: 65000000, cValores: 27000000, cDiferencia: -38000000 })
    chk('la barra: "Facturas $ X · Valores $ Y · Diferencia $ Z"', b.replace(/<[^>]+>/g, '') === 'Facturas $ 650.000,00 · Valores $ 270.000,00 · Diferencia $ 380.000,00', b)
    chk('la barra marca si faltan o sobra', /resumen-aplicacion__dif--falta/.test(b) && /resumen-aplicacion__dif--sobra/.test(S.htmlBarraPago({ cFacturas: 1, cValores: 2, cDiferencia: 1 })))
  }

  // ══ 5. "APLICAR A LAS FACTURAS MÁS VIEJAS" ═════════════════════════════════
  {
    const S = sandbox()
    // La lista viene desordenada: se tilda igual por fecha, la vieja primero.
    const lista = [{ ...FN, checked: true, monto: 1 }, { ...FX, checked: false, monto: 0 }, { ...FV, checked: false, monto: 0 }]
    const r = S.aplicarAFacturasViejas(lista, 42000000)
    const de = (id) => r.find(f => f.id === id)
    chk('tilda la más vieja entera', de('f-vieja').checked && de('f-vieja').monto === 250000)
    chk('la siguiente, por lo que alcanza (parcial)', de('f-nueva').checked && de('f-nueva').monto === 170000, JSON.stringify(de('f-nueva')))
    chk('la que no entra queda sin tildar y en cero (la sin fecha, al final)', de('f-sinfecha').checked === false && de('f-sinfecha').monto === 0)
    chk('no cambia el orden de la lista', JSON.stringify(r.map(f => f.id)) === JSON.stringify(lista.map(f => f.id)))
    chk('no toca la lista que recibió', lista[0].monto === 1 && lista[2].checked === false)
    const todo = S.aplicarAFacturasViejas(lista, 99900000)
    chk('con valores de sobra, todas enteras', todo.every(f => f.checked) && todo.reduce((a, f) => a + f.monto, 0) === 700000)
    chk('con cero, ninguna', S.aplicarAFacturasViejas(lista, 0).every(f => !f.checked && f.monto === 0))
    const centavos = S.aplicarAFacturasViejas([{ ...FV, saldo: 0.3 }, { ...FN, saldo: 1 }], 50)
    chk('en centavos (0,30 entera y 0,20 de la otra)', centavos[0].monto === 0.3 && centavos[1].monto === 0.2, JSON.stringify(centavos))
    chk('una factura con saldo 0 se saltea', S.aplicarAFacturasViejas([{ ...FV, saldo: 0 }, { ...FN }], 100)[0].checked === false)
  }

  // ══ 6. "COMPLETAR CON EFECTIVO/TRANSFERENCIA" ══════════════════════════════
  {
    const S = sandbox()
    chk('pone lo que falta', S.montoParaCompletar({ cFacturas: 65000000, cValores: 12000000 }, null) === 530000)
    chk('se suma a lo que ya había escrito', S.montoParaCompletar({ cFacturas: 65000000, cValores: 22000000 }, 100000) === 530000)
    chk('si no falta nada, no cambia nada', S.montoParaCompletar({ cFacturas: 1, cValores: 1 }, 5) === null && S.montoParaCompletar({ cFacturas: 1, cValores: 9 }, 5) === null)
  }

  // ══ 7. LO QUE FRENA ANTES DE MANDAR ════════════════════════════════════════
  {
    const S = sandbox()
    const base = { moneda: 'ARS', chequeIds: [], medio: 'efectivo', cuentaId: 'cta-ef', fecha: HOY, hoy: HOY, facturas: [] }
    const t = (cF, cCh, cR) => ({ cFacturas: cF, cCheques: cCh, cResto: cR, cValores: cCh + cR, cDiferencia: cCh + cR - cF })
    const v = (o) => S.validarPago({ ...base, ...o })
    chk('sin fecha', v({ fecha: '', t: t(0, 0, 100) }) === 'Completá la fecha de pago.')
    chk('fecha futura', v({ fecha: '2026-10-21', t: t(0, 0, 100) }) === 'La fecha del pago no puede ser futura.')
    chk('sin valores', v({ t: t(0, 0, 0) }) === 'Elegí con qué se paga: cheques de la cartera, efectivo, transferencia o QR.')
    chk('un monto sin medio', v({ medio: null, t: t(0, 0, 100) }) === 'Elegí si el monto es en efectivo, transferencia o QR.')
    chk('un monto sin cuenta', v({ cuentaId: null, t: t(0, 0, 100) }) === 'Seleccioná la cuenta.')
    chk('solo cheques: no pide medio ni cuenta', v({ medio: null, cuentaId: null, chequeIds: ['n1'], t: t(0, 100, 0) }) === null)
    chk('una factura tildada sin monto', v({ t: t(0, 0, 100), facturas: [{ ...FV, checked: true, monto: 0 }] }) === 'Poné cuánto se aplica a la factura 0003-00001201 (o destildala).')
    chk('más que el saldo de una factura', v({ t: t(25000001, 0, 25000001), facturas: [{ ...FV, checked: true, monto: 250000.01 }] }) === 'Lo aplicado a la factura 0003-00001201 supera su saldo pendiente.')
    chk('facturas > valores: no deja confirmar', v({ t: t(65000000, 27000000, 0), chequeIds: ['n1'], medio: null, facturas: [{ ...FV, checked: true, monto: 250000 }, { ...FN, checked: true, monto: 400000 }] }) === 'Faltan $ 380.000,00 para cubrir las facturas elegidas.')
    chk('valores > facturas: deja (queda a favor)', v({ t: t(25000000, 0, 30000000), facturas: [{ ...FV, checked: true, monto: 250000 }] }) === null)
    chk('cheques en otra moneda', v({ moneda: 'USD', chequeIds: ['n1'], t: t(0, 100, 0) }) === 'Los cheques son solo en pesos: elegí ARS.')
    chk('QR en otra moneda', v({ moneda: 'USD', medio: 'qr', t: t(0, 0, 100) }) === 'El QR es solo en pesos.')
    chk('otra moneda sin monto', v({ moneda: 'USD', t: t(0, 0, 0) }) === 'Ingresá el monto y elegí efectivo o transferencia.')
  }

  // ══ 8. LOS PARÁMETROS EXACTOS DE pagar_proveedor_mixto ════════════════════
  {
    const S = sandbox()
    const comun = { proveedorId: 'p1', unidadId: 'u-n', fecha: HOY }
    const facturas = [{ ...FV, checked: true, monto: 250000 }, { ...FN, checked: true, monto: 170000.5 }, { ...FX, checked: false, monto: 5 }]
    const soloCheques = S.parametrosPagoMixto({ ...comun, chequeIds: ['n1', 'd1'], t: { cResto: 0 }, medio: 'efectivo', cuentaId: 'cta-ef', facturas, observaciones: '   ' })
    chk('solo cheques: sin resto, sin medio, sin cuenta; una sola lista de facturas', JSON.stringify(soloCheques) === JSON.stringify({
      p_proveedor_id: 'p1', p_unidad_negocio_id: 'u-n', p_fecha: HOY, p_cheque_ids: ['n1', 'd1'],
      p_monto_resto: 0, p_medio_resto: null, p_cuenta_resto: null,
      p_aplicaciones: [{ factura_pendiente_id: 'f-vieja', monto_aplicado: 250000 }, { factura_pendiente_id: 'f-nueva', monto_aplicado: 170000.5 }],
      p_observaciones: null }), JSON.stringify(soloCheques))
    const mixto = S.parametrosPagoMixto({ ...comun, chequeIds: ['n1'], t: { cResto: 30000000 }, medio: 'efectivo', cuentaId: 'cta-ef', facturas: [], observaciones: '  Entregado en mano ' })
    chk('cheques + efectivo: el resto con su medio y su cuenta, y las observaciones', mixto.p_monto_resto === 300000 && mixto.p_medio_resto === 'efectivo' &&
      mixto.p_cuenta_resto === 'cta-ef' && JSON.stringify(mixto.p_cheque_ids) === '["n1"]' && JSON.stringify(mixto.p_aplicaciones) === '[]' && mixto.p_observaciones === 'Entregado en mano', JSON.stringify(mixto))
    const transf = S.parametrosPagoMixto({ ...comun, chequeIds: [], t: { cResto: 1 }, medio: 'transferencia', cuentaId: 'cta-bco', facturas })
    chk('solo transferencia: sin cheques (lista vacía)', JSON.stringify(transf.p_cheque_ids) === '[]' && transf.p_monto_resto === 0.01 && transf.p_medio_resto === 'transferencia' && transf.p_cuenta_resto === 'cta-bco')
    chk('las aplicaciones NO se reparten en la pantalla (la base reparte)', !/repartirAplicacionesPagoMixto/.test(SCRIPT) && !/p_aplicaciones_cheques|p_aplicaciones_resto/.test(SCRIPT))
  }

  // ══ 9. EL RESUMEN ANTES DE CONFIRMAR ═══════════════════════════════════════
  {
    const S = sandbox()
    const r = (o) => S.textoResumenPago({ unidadPagaId: 'u-n', cheques: [], medio: null, montoResto: null, aplicaciones: [], ...o })
    chk('cheques de dos empresas + efectivo, aplicado a dos facturas', r({ cheques: [CHN, CHD], medio: 'efectivo', montoResto: 380000,
      aplicaciones: [{ numero: '0003-00001201', monto: 250000 }, { numero: '0003-00001245', monto: 400000 }] }) ===
      'Cheques $ 270.000,00 (2 cheques, 1 de Dolce Pasta) + Efectivo $ 380.000,00 = $ 650.000,00, aplicado a facturas 0003-00001201, 0003-00001245.')
    chk('solo QR a una factura', r({ medio: 'qr', montoResto: 100, aplicaciones: [{ numero: 'A-1', monto: 100 }] }) === 'QR $ 100,00, aplicado a la factura A-1.')
    chk('con sobrante', r({ medio: 'transferencia', montoResto: 300000, aplicaciones: [{ numero: 'A-1', monto: 250000 }] }) ===
      'Transferencia $ 300.000,00: $ 250.000,00 aplicado a la factura A-1 y $ 50.000,00 queda a favor.')
    chk('sin facturas: pago a cuenta', r({ cheques: [CHN] }) === 'Cheques $ 150.000,00 (1 cheque), sin aplicar a facturas: pago a cuenta, queda todo a favor.')
    chk('sin valores, nada', r({ aplicaciones: [{ numero: 'A', monto: 1 }] }) === '')
  }

  // ══ 10. EL PIE, EJECUTADO ══════════════════════════════════════════════════
  {
    const S = sandbox()
    S.__setVar('facturasParaPago', [{ ...FV, checked: true, monto: 250000 }, { ...FN, checked: false, monto: 0 }])
    S.pintarPiePago()
    chk('faltan valores: aviso bordó y "Completar con…" a la vista', el(S, 'aviso-diferencia-pago').hidden === false &&
      el(S, 'aviso-diferencia-pago').classList.contains('pago-aviso--falta') && el(S, 'btn-completar-diferencia').hidden === false &&
      el(S, 'btn-aplicar-viejas').hidden === true)
    S.completarDiferencia()
    chk('"Completar" pone la diferencia en el monto', S.__montos['campo-monto-pago'] === 250000)
    chk('cubierto: sin aviso ni botones', el(S, 'aviso-diferencia-pago').hidden === true && el(S, 'btn-completar-diferencia').hidden === true && el(S, 'btn-aplicar-viejas').hidden === true)
    S.__montos['campo-monto-pago'] = 300000
    S.pintarPiePago()
    chk('sobra: aviso amarillo de lo que queda a favor y "Aplicar a las más viejas"', el(S, 'aviso-diferencia-pago').hidden === false &&
      !el(S, 'aviso-diferencia-pago').classList.contains('pago-aviso--falta') && el(S, 'aviso-diferencia-pago').textContent === 'Quedan $ 50.000,00 a favor del proveedor' &&
      el(S, 'btn-aplicar-viejas').hidden === false)
    S.aplicarValoresAFacturas()
    const fp = S.__getVar('facturasParaPago')
    chk('"Aplicar a las más viejas" desde el pie: la vieja entera y la nueva por 50.000', fp[0].checked && fp[0].monto === 250000 && fp[1].checked && fp[1].monto === 50000, JSON.stringify(fp))
    S.estado.pagoError = 'algo'
    S.pintarPiePago()
    chk('el error vive en el estado y se pinta pegado al botón', el(S, 'error-confirmar-pago').hidden === false && el(S, 'error-confirmar-pago').textContent === 'algo')
    S.refrescarPago()
    chk('cualquier cambio borra el error viejo', el(S, 'error-confirmar-pago').hidden === true && S.estado.pagoError === null)
    // El resumen: por textContent, solo con lo tildado.
    S.__setVar('facturasParaPago', [{ ...FV, checked: true, monto: 250000 }, { ...FN, checked: false, monto: 400000 }])
    S.__setVar('carteraPago', [{ ...CHN }, { ...CHD, tildado: false }])
    S.estado.pagoCheques = true
    S.__montos['campo-monto-pago'] = null
    S.pintarPiePago()
    const res = el(S, 'resumen-pago-mixto')
    chk('el resumen va por textContent', res.innerHTML === '' && res.textContent !== '' && res.hidden === false)
    chk('el resumen solo con lo tildado (cheques y facturas)', res.textContent ==='Cheques $ 150.000,00 (1 cheque), aplicado a la factura 0003-00001201.', res.textContent)
    // Sin facturas: pago a cuenta.
    S.__setVar('facturasParaPago', [])
    S.pintarPiePago()
    chk('sin facturas: "Pago a cuenta: queda todo a favor"', el(S, 'aviso-diferencia-pago').textContent === 'Pago a cuenta: queda todo a favor')
  }

  // ══ 11. CONFIRMAR: UNA SOLA LLAMADA ════════════════════════════════════════
  const ORDEN = {
    numero_texto: 'N-OP-00009', fecha: '2026-10-20', total: 650000.5, observaciones: 'Entregado en mano', creada_por: 'Facu',
    emisor: { empresa: 'Cucuruchos Nuss', razon_social: 'PAZ MIRTA', cuit: '20924106795', domicilio: 'Unión 843', logo_url: 'logo-cucuruchos-nuss.png' },
    proveedor: { razon_social: 'ANATOLIA SRL', cuit: '30712345678', direccion: 'Ruta 9' },
    facturas: [{ tipo: 'Factura A', numero: '0003-00001201', fecha: '2026-08-20', importe: 250000, aplicado: 250000, saldo_actual: 0 }],
    cheques: [{ banco: 'GALICIA', numero: '12345678', fecha_pago: '2026-10-25', librador: [{ nombre: 'PEREZ JUAN', cuit: '20111111112' }], es_echeq: true, importe: 120000, de_empresa: 'Dolce Pasta', otra_empresa: true }],
    otros_medios: [{ medio: 'transferencia', cuenta: 'Macro · Nuss', importe: 530000.5 }],
    a_favor: 0.5,
  }
  const RESP = { data: { orden_pago_id: 'op-9', numero: 9, numero_texto: 'N-OP-00009', total: 650000, aplicado: 650000, a_favor: 0 }, error: null }
  function preparar({ facturas = [], cheques = [], medio = null, resto = null, cuenta = '', fecha = HOY, moneda = 'ARS', obs = '' } = {}) {
    const S = sandbox()
    S.__setVar('facturasParaPago', facturas.map(f => ({ ...f })))
    S.__setVar('carteraPago', cheques.map(c => ({ ...c })))
    S.estado.pagoCheques = cheques.length > 0
    S.__setVar('medioPagoSeleccionado', medio)
    S.__montos['campo-monto-pago'] = resto
    el(S, 'campo-cuenta-pago-cc').value = cuenta
    el(S, 'campo-fecha-pago-cc').value = fecha
    el(S, 'campo-moneda-pago').value = moneda
    el(S, 'campo-observaciones-orden').value = obs
    el(S, 'modal-pago').hidden = false
    el(S, 'modal-orden-pago').hidden = true
    S.__responder('pagar_proveedor_mixto', RESP)
    S.__responder('datos_orden_pago', { data: ORDEN, error: null })
    return S
  }
  const pagos = (S) => S.__rpc.filter(r => ['pagar_proveedor_mixto', 'registrar_pago_proveedor', 'pagar_proveedor_con_cheques_cartera'].includes(r.nombre))
  {
    // De las facturas a los valores: facturas tildadas, cheques y el resto completado.
    const S = preparar({ facturas: [{ ...FV, checked: true, monto: 250000 }, { ...FN, checked: true, monto: 400000 }], cheques: [CHD], medio: 'transferencia', resto: 530000, cuenta: 'cta-bco', obs: 'Entregado en mano' })
    await S.confirmarPago()
    const ll = pagos(S)
    chk('cheques + transferencia: UNA sola llamada, a pagar_proveedor_mixto', ll.length === 1 && ll[0].nombre === 'pagar_proveedor_mixto', JSON.stringify(ll.map(x => x.nombre)))
    chk('cheques + transferencia: los parámetros exactos', JSON.stringify(ll[0]?.params) === JSON.stringify({
      p_proveedor_id: 'p1', p_unidad_negocio_id: 'u-n', p_fecha: HOY, p_cheque_ids: ['d1'], p_monto_resto: 530000, p_medio_resto: 'transferencia', p_cuenta_resto: 'cta-bco',
      p_aplicaciones: [{ factura_pendiente_id: 'f-vieja', monto_aplicado: 250000 }, { factura_pendiente_id: 'f-nueva', monto_aplicado: 400000 }],
      p_observaciones: 'Entregado en mano' }), JSON.stringify(ll[0]?.params))
    chk('se cierra el formulario y se recarga la ficha', el(S, 'modal-pago').hidden === true && S.__recargas() === 1)
    chk('el aviso dice el número de la orden', S.__exitos.at(-1) === '¡Pago registrado! Orden de pago N-OP-00009.', S.__exitos.at(-1))
    const datos = S.__rpc.filter(r => r.nombre === 'datos_orden_pago')
    chk('después, la orden: datos_orden_pago con su id', datos.length === 1 && datos[0].params.p_orden_id === 'op-9')
    chk('la orden se abre', el(S, 'modal-orden-pago').hidden === false && /ORDEN DE PAGO/.test(el(S, 'orden-pago-hoja').innerHTML))
    S.imprimirOrdenPago()
    chk('"Imprimir / Guardar PDF" marca el html para imprimir solo la hoja', S.__impresiones() === 1 && S.__getVar('document').documentElement.classList.contains('op-imprimiendo'))
    S.cerrarOrdenPago()
    chk('"Cerrar" la esconde y saca la marca', el(S, 'modal-orden-pago').hidden === true && !S.__getVar('document').documentElement.classList.contains('op-imprimiendo'))
  }
  {
    const S = preparar({ cheques: [CHN, CHD] })
    await S.confirmarPago()
    const p = pagos(S)[0]?.params ?? {}
    chk('solo cheques (pago a cuenta): sin resto ni cuenta', pagos(S).length === 1 && JSON.stringify(p.p_cheque_ids) === '["n1","d1"]' && p.p_monto_resto === 0 && p.p_medio_resto === null && p.p_cuenta_resto === null && JSON.stringify(p.p_aplicaciones) === '[]', JSON.stringify(p))
  }
  {
    const S = preparar({ cheques: [CHN], medio: 'efectivo', resto: 300000, cuenta: 'cta-ef', facturas: [{ ...FV, checked: true, monto: 250000 }, { ...FN, checked: true, monto: 200000 }] })
    await S.confirmarPago()
    const p = pagos(S)[0]?.params ?? {}
    chk('cheques + efectivo: la cuenta de efectivo y la lista tal como se eligió (parcial)', p.p_monto_resto === 300000 && p.p_medio_resto === 'efectivo' && p.p_cuenta_resto === 'cta-ef' &&
      JSON.stringify(p.p_aplicaciones) === '[{"factura_pendiente_id":"f-vieja","monto_aplicado":250000},{"factura_pendiente_id":"f-nueva","monto_aplicado":200000}]', JSON.stringify(p))
  }
  {
    const S = preparar({ medio: 'transferencia', resto: 1000, cuenta: 'cta-bco' })
    await S.confirmarPago()
    const p = pagos(S)[0]?.params ?? {}
    chk('solo transferencia: una llamada sin cheques', pagos(S).length === 1 && JSON.stringify(p.p_cheque_ids) === '[]' && p.p_monto_resto === 1000 && p.p_medio_resto === 'transferencia')
  }
  {
    // Facturas > valores: no se manda nada.
    const S = preparar({ facturas: [{ ...FV, checked: true, monto: 250000 }, { ...FN, checked: true, monto: 400000 }], cheques: [CHD] })
    await S.confirmarPago()
    chk('faltan valores: no llama a la base y lo dice pegado al botón', pagos(S).length === 0 &&
      el(S, 'error-confirmar-pago').hidden === false && el(S, 'error-confirmar-pago').textContent === 'Faltan $ 530.000,00 para cubrir las facturas elegidas.', el(S, 'error-confirmar-pago').textContent)
    chk('faltan valores: el formulario sigue abierto', el(S, 'modal-pago').hidden === false)
  }
  {
    // El error de la base, tal cual, y sin orden.
    const S = preparar({ medio: 'qr', resto: 1000, cuenta: 'cta-bco' })
    S.__responder('pagar_proveedor_mixto', { data: null, error: { message: 'La transferencia / QR tiene que salir de una cuenta de banco.' } })
    await S.confirmarPago()
    chk('el error de la base: tal cual, pegado y en el aviso', el(S, 'error-confirmar-pago').textContent === 'La transferencia / QR tiene que salir de una cuenta de banco.' &&
      S.__errores.at(-1) === 'La transferencia / QR tiene que salir de una cuenta de banco.', JSON.stringify(S.__errores))
    chk('con error: sin orden de pago y el formulario abierto', !S.__rpc.some(r => r.nombre === 'datos_orden_pago') && el(S, 'modal-pago').hidden === false && el(S, 'modal-orden-pago').hidden === true)
    chk('con error: el botón vuelve a andar', el(S, 'btn-confirmar-pago').disabled === false && S.estado.pagoEnviando === false)
    const T = preparar({ medio: 'qr', resto: 1000, cuenta: 'cta-bco' })
    T.__responder('pagar_proveedor_mixto', { lanzar: 'Failed to fetch' })
    await T.confirmarPago()
    chk('sin red: lo dice y no abre la orden', el(T, 'error-confirmar-pago').textContent === 'Failed to fetch' && !T.__rpc.some(r => r.nombre === 'datos_orden_pago'))
  }
  {
    // Un doble toque manda una sola vez.
    const S = preparar({ medio: 'efectivo', resto: 1000, cuenta: 'cta-ef' })
    let soltar
    S.__esperar(new Promise(r => { soltar = r }))
    const a = S.confirmarPago(), b = S.confirmarPago()
    soltar()
    await Promise.all([a, b])
    chk('un doble toque manda una sola vez', pagos(S).length === 1, String(pagos(S).length))
  }
  {
    // Otra moneda: el pago simple de siempre, sin orden de pago.
    const S = preparar({ medio: 'transferencia', resto: 500, cuenta: 'cta-usd', moneda: 'USD', facturas: [{ ...FV, checked: true, monto: 400 }] })
    await S.confirmarPago()
    const ll = pagos(S)
    chk('en dólares: registrar_pago_proveedor como siempre', ll.length === 1 && ll[0].nombre === 'registrar_pago_proveedor' && JSON.stringify(ll[0].params) === JSON.stringify({
      p_proveedor_id: 'p1', p_unidad_negocio_id: 'u-n', p_moneda: 'USD', p_monto: 500, p_medio_pago: 'transferencia', p_cuenta_id: 'cta-usd', p_empleado_id: 'yo',
      p_fecha_pago: HOY, p_aplicaciones: [{ factura_pendiente_id: 'f-vieja', monto_aplicado: 400 }] }), JSON.stringify(ll))
    chk('en dólares: sin orden de pago', !S.__rpc.some(r => r.nombre === 'datos_orden_pago') && S.__exitos.at(-1) === '¡Pago registrado!')
  }

  // ══ 12. LA ORDEN DE PAGO ═══════════════════════════════════════════════════
  {
    const S = sandbox()
    const h = S.htmlOrdenPago(ORDEN)
    const texto = h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
    chk('encabezado: logo, razón social, CUIT con guiones, domicilio, número y fecha', h.includes('src="../logo-cucuruchos-nuss.png"') && texto.includes('PAZ MIRTA') &&
      texto.includes('CUIT 20-92410679-5') && texto.includes('Unión 843') && texto.includes('ORDEN DE PAGO') && texto.includes('N-OP-00009') && texto.includes('Fecha 20/10/2026'))
    chk('el proveedor: razón social, CUIT y dirección', texto.includes('ANATOLIA SRL') && texto.includes('CUIT 30-71234567-8') && texto.includes('Ruta 9'))
    chk('los comprobantes: tipo, número, fecha, importe, aplicado y saldo que queda', texto.includes('Se cancelan los siguientes comprobantes') &&
      texto.includes('Saldo que queda') && texto.includes('Factura A 0003-00001201 20/08/2026 $ 250.000,00 $ 250.000,00 $ 0,00'), texto)
    // 23/10/2026: sin el librador (test-cuentas-corrientes-orden-pago-copias.js).
    chk('los cheques: banco, N°, fecha de pago e importe, con "eCheq"', texto.includes('GALICIA eCheq 12345678 25/10/2026 $ 120.000,00') && !texto.includes('PEREZ JUAN'), texto)
    chk('NO dice de qué empresa venía el cheque', !texto.includes('Dolce Pasta'))
    chk('otros medios sin la cuenta', texto.includes('Transferencia $ 530.000,50') && !texto.includes('Macro · Nuss'))
    chk('el total en número y en letras (con centavos)', texto.includes('$ 650.000,50') && texto.includes('Son SEISCIENTOS CINCUENTA MIL PESOS CON CINCUENTA CENTAVOS'))
    chk('el saldo a favor (solo si hay)', texto.includes('Saldo a favor del proveedor: $ 0,50') && !S.htmlOrdenPago({ ...ORDEN, a_favor: 0 }).includes('Saldo a favor'))
    chk('observaciones, firmas y quién la generó', texto.includes('Entregado en mano') && texto.includes('Recibí conforme (proveedor) — firma y aclaración') && texto.includes('Autorizó') && texto.includes('Generada por Facu'))
    const aCuenta = S.htmlOrdenPago({ ...ORDEN, facturas: [], observaciones: null })
    chk('sin facturas: "Pago a cuenta"; sin observaciones, no hay sección', /Pago a cuenta/.test(aCuenta) && !/Observaciones/.test(aCuenta))
    chk('un logo que no es un archivo de la raíz no se dibuja', !/<img/.test(S.htmlOrdenPago({ ...ORDEN, emisor: { ...ORDEN.emisor, logo_url: 'https://x.com/a.png' } })) &&
      !/<img/.test(S.htmlOrdenPago({ ...ORDEN, emisor: { ...ORDEN.emisor, logo_url: '../secreto.png' } })))
    chk('vacía no se rompe', typeof S.htmlOrdenPago({}) === 'string' && /ORDEN DE PAGO/.test(S.htmlOrdenPago({})))
    const marcas = S.htmlOrdenPago({
      numero_texto: marca('num'), fecha: '2026-10-20', total: 10, observaciones: marca('obs'), creada_por: marca('quien'),
      emisor: { empresa: marca('emp'), razon_social: null, cuit: marca('ecuit'), domicilio: marca('dom'), logo_url: null },
      proveedor: { razon_social: marca('prov'), cuit: marca('cuit'), direccion: marca('dir') },
      facturas: [{ tipo: marca('ftipo'), numero: marca('fnum'), fecha: '2026-10-01', importe: 1, aplicado: 1, saldo_actual: 0 }],
      cheques: [{ banco: marca('banco'), numero: marca('cnum'), fecha_pago: '2026-10-01', librador: [{ nombre: marca('lib'), cuit: marca('lcuit') }], importe: 5 }],
      otros_medios: [{ medio: marca('medio'), importe: 5 }], a_favor: 0,
    })
    chequearMarcas(chk, 'la orden de pago', marcas, ['num', 'obs', 'quien', 'emp', 'ecuit', 'dom', 'prov', 'cuit', 'dir', 'ftipo', 'fnum', 'banco', 'cnum', 'medio'])
    chk('la orden de pago: el librador no se imprime (ni escapado)', !marcas.includes('data-xss=&quot;lib&quot;') && !marcas.includes('data-xss=&quot;lcuit&quot;'))
  }
  {
    const S = sandbox()
    const L = (n) => S.importeEnLetras(n)
    const casos = [
      [0, 'CERO PESOS CON CERO CENTAVOS'], [1, 'UN PESO CON CERO CENTAVOS'], [16, 'DIECISÉIS PESOS CON CERO CENTAVOS'],
      [21, 'VEINTIÚN PESOS CON CERO CENTAVOS'], [31.01, 'TREINTA Y UN PESOS CON UN CENTAVO'], [0.21, 'CERO PESOS CON VEINTIÚN CENTAVOS'],
      [100, 'CIEN PESOS CON CERO CENTAVOS'], [101, 'CIENTO UN PESOS CON CERO CENTAVOS'], [1000, 'MIL PESOS CON CERO CENTAVOS'],
      [1001, 'MIL UN PESOS CON CERO CENTAVOS'], [21000, 'VEINTIÚN MIL PESOS CON CERO CENTAVOS'], [100000, 'CIEN MIL PESOS CON CERO CENTAVOS'],
      [1000000, 'UN MILLÓN DE PESOS CON CERO CENTAVOS'], [2000000, 'DOS MILLONES DE PESOS CON CERO CENTAVOS'],
      [21000000, 'VEINTIÚN MILLONES DE PESOS CON CERO CENTAVOS'], [1500000000, 'MIL QUINIENTOS MILLONES DE PESOS CON CERO CENTAVOS'],
      [1234567.89, 'UN MILLÓN DOSCIENTOS TREINTA Y CUATRO MIL QUINIENTOS SESENTA Y SIETE PESOS CON OCHENTA Y NUEVE CENTAVOS'],
      [650000.5, 'SEISCIENTOS CINCUENTA MIL PESOS CON CINCUENTA CENTAVOS'],
      [999999999.99, 'NOVECIENTOS NOVENTA Y NUEVE MILLONES NOVECIENTOS NOVENTA Y NUEVE MIL NOVECIENTOS NOVENTA Y NUEVE PESOS CON NOVENTA Y NUEVE CENTAVOS'],
      [0.1 + 0.2, 'CERO PESOS CON TREINTA CENTAVOS'],
    ]
    for (const [n, esperado] of casos) chk(`en letras: ${n}`, L(n) === esperado, L(n))
    chk('CUIT con guiones (y uno raro, tal cual)', S.cuitConGuiones('20924106795') === '20-92410679-5' && S.cuitConGuiones('20-92410679-5') === '20-92410679-5' && S.cuitConGuiones('123') === '123')
  }
  {
    // Si datos_orden_pago falla, se dice (y se puede reimprimir después).
    const S = sandbox()
    S.__responder('datos_orden_pago', { data: null, error: { message: 'No tenés permiso para ver órdenes de pago.' } })
    await S.abrirOrdenPago('op-1')
    chk('la orden que no se pudo leer lo dice', /No se pudo leer la orden de pago: No tenés permiso para ver órdenes de pago\./.test(el(S, 'orden-pago-hoja').innerHTML))
  }

  // ══ 13. LA ORDEN DE PAGO DE CADA PAGO (30/10/2026) ═════════════════════════
  // Se fue el recuadro "Órdenes de pago (N)": cada pago de la cuenta trae la
  // suya (gastos.orden_pago_id → ordenes_pago) para el renglón.
  {
    const S = sandbox()
    S.__tablas.gastos = [
      { id: 'g-1', orden_pago_id: 'op-1' }, { id: 'g-2', orden_pago_id: 'op-2' }, { id: 'g-2b', orden_pago_id: 'op-2' },
      { id: 'g-sin', orden_pago_id: null }, { id: 'g-dolce', orden_pago_id: 'op-x' },
    ]
    S.__tablas.ordenes_pago = [
      { id: 'op-1', proveedor_id: 'p1', unidad_negocio_id: 'u-n', numero: 1 },
      { id: 'op-2', proveedor_id: 'p1', unidad_negocio_id: 'u-n', numero: 2 },
      { id: 'op-x', proveedor_id: 'p1', unidad_negocio_id: 'u-d', numero: 7 },
    ]
    const filas = [
      { tipo: 'pago', gasto_id: 'g-1' }, { tipo: 'pago', gasto_id: 'g-2' }, { tipo: 'pago', gasto_id: 'g-2b' }, { tipo: 'pago', gasto_id: 'g-sin' },
      { tipo: 'pago', gasto_id: 'g-dolce' }, { tipo: 'factura', gasto_id: null, factura_pendiente_id: 'f' }, { tipo: 'pago', gasto_id: 'g-1' },
    ]
    const m = await S.cargarOrdenesDePagos(filas)
    chk('cada pago con su orden y el número de su empresa', m.get('g-1')?.id === 'op-1' && m.get('g-1')?.texto === 'N-OP-00001' && m.get('g-2')?.texto === 'N-OP-00002' && m.get('g-2b')?.texto === 'N-OP-00002' && m.get('g-dolce')?.texto === 'D-OP-00007', JSON.stringify([...m]))
    chk('un pago sin orden no trae nada', !m.has('g-sin'))
    // La segunda lectura de gastos es la de "¿se anuló algún pago de la
    // orden?" (30/10/2026, por orden_pago_id, con el estado).
    const qg = S.__consultas.filter(c => c.t === 'gastos' && !/estado/.test(c.sel))
    chk('se leen los gastos de los pagos (orden_pago_id), una sola vez cada uno', qg.length === 1 && /orden_pago_id/.test(qg[0].sel), JSON.stringify(qg))
    chk('y una vez los de las órdenes, para saber si alguna se anuló', S.__consultas.filter(c => c.t === 'gastos' && c.sel === 'id, orden_pago_id, estado').length === 1)
    chk('el número de otra empresa lleva su prefijo', S.numeroTextoOrden('u-d', 7) === 'D-OP-00007' && S.numeroTextoOrden('u-sin', 7) === '-OP-00007')
    S.__responder('datos_orden_pago', { data: ORDEN, error: null })
    await S.abrirOrdenPago('op-1')
    chk('reimprimir: datos_orden_pago con esa orden', S.__rpc.at(-1).nombre === 'datos_orden_pago' && S.__rpc.at(-1).params.p_orden_id === 'op-1' && /N-OP-00009/.test(el(S, 'orden-pago-hoja').innerHTML))
    // Sin permiso no se consulta.
    const T = sandbox()
    T.estado.misTareas = new Set()
    const mt = await T.cargarOrdenesDePagos(filas)
    chk('sin registrar_pago ni ver_todo: no se consulta y no trae nada', mt.size === 0 && !T.__consultas.some(c => c.t === 'ordenes_pago' || c.t === 'gastos'))
    // Si falla la lectura, los pagos quedan como vienen.
    const U = sandbox()
    U.__tablas.gastos = S.__tablas.gastos
    U.__fallaTabla.ordenes_pago = { message: 'x' }
    chk('si falla la lectura, no se inventa ninguna orden', (await U.cargarOrdenesDePagos(filas)).size === 0)
    const V = sandbox()
    chk('sin pagos no consulta nada', (await V.cargarOrdenesDePagos([{ tipo: 'factura' }])).size === 0 && !V.__consultas.some(c => c.t === 'ordenes_pago'))
  }

  // ══ 14. ABRIR EL FORMULARIO ════════════════════════════════════════════════
  {
    const S = sandbox()
    S.__tablas.facturas_pendientes = [
      { id: 'f-vieja', proveedor_id: 'p1', unidad_negocio_id: 'u-n', moneda: 'ARS', estado: 'pendiente', numero_comprobante: '0003-00001201', fecha_factura: '2026-08-20', saldo_pendiente: 250000 },
    ]
    el(S, 'campo-moneda-pago').value = 'ARS'
    await S.abrirModalPago()
    const fp = S.__getVar('facturasParaPago')
    chk('abrir: las facturas del proveedor en la empresa, sin tildar', fp.length === 1 && fp[0].checked === false && fp[0].monto === 0 && fp[0].saldo === 250000)
    const q = S.__consultas.find(c => c.t === 'facturas_pendientes')
    chk('abrir: pendientes o parciales de esa empresa y moneda, la más vieja arriba', q && JSON.stringify(q.eq) === '[["proveedor_id","p1"],["unidad_negocio_id","u-n"],["moneda","ARS"]]' && JSON.stringify(q.orden) === '["fecha_factura",{"ascending":true}]', JSON.stringify(q))
    chk('abrir: ya no se pide sugerir_facturas_fifo (las más viejas las tilda "Aplicar a las más viejas")', !S.__rpc.some(r => r.nombre === 'sugerir_facturas_fifo'))
    chk('abrir: sin medio, sin cheques, sin error', S.__getVar('medioPagoSeleccionado') === null && S.estado.pagoCheques === false && S.estado.pagoError === null && el(S, 'modal-pago').hidden === false)
    chk('abrir: la cartera solo con cobranzas:procesar', el(S, 'btn-medio-cartera').hidden === false)
    S.alternarCarteraPago()
    chk('"Cheques de la cartera" abre la lista', S.estado.pagoCheques === true && el(S, 'grupo-cartera-pago').hidden === false && el(S, 'btn-medio-cartera').getAttribute('aria-pressed') === 'true')
    S.__getVar('carteraPago').push({ id: 'z', importe: 5, tildado: true, unidadId: 'u-n' })
    S.alternarCarteraPago()
    chk('cerrarla destilda todo (lo que no se ve no se paga)', S.estado.pagoCheques === false && S.__getVar('carteraPago').every(c => !c.tildado) && el(S, 'grupo-cartera-pago').hidden === true)
  }
  {
    // La cuenta: efectivo → cajas de efectivo; transferencia y QR → bancos.
    const S = sandbox()
    el(S, 'campo-moneda-pago').value = 'ARS'
    S.seleccionarMedioPagoCC('efectivo')
    chk('efectivo: solo las cajas de efectivo', /cta-ef/.test(el(S, 'campo-cuenta-pago-cc').innerHTML) && !/cta-bco/.test(el(S, 'campo-cuenta-pago-cc').innerHTML))
    S.seleccionarMedioPagoCC('qr')
    chk('QR: solo los bancos', /cta-bco/.test(el(S, 'campo-cuenta-pago-cc').innerHTML) && !/cta-ef/.test(el(S, 'campo-cuenta-pago-cc').innerHTML))
    chk('el monto dice en qué es', el(S, 'etiqueta-monto-pago').textContent === 'Monto en qr')
    S.seleccionarMedioPagoCC('transferencia')
    chk('transferencia: solo los bancos', /cta-bco/.test(el(S, 'campo-cuenta-pago-cc').innerHTML) && !/cta-ef/.test(el(S, 'campo-cuenta-pago-cc').innerHTML))
  }

  // ══ 15. LO DEL FLUJO VIEJO YA NO ESTÁ ══════════════════════════════════════
  chk('no queda el "resto pendiente" ni sus pantallas', !/pagoRestoPendiente|aviso-resto-pendiente|pintarRestoPendiente|registrarRestoPendiente/.test(FUENTE))
  chk('no queda "Completar con" de dos pagos', !/grilla-completar-pago|data-completar|campo-resto-pago|elegirCompletarPago/.test(FUENTE))
  chk('la pantalla no llama a pagar_proveedor_con_cheques_cartera (lo llama la base adentro de pagar_proveedor_mixto)', !/rpc\(\s*'pagar_proveedor_con_cheques_cartera'/.test(SCRIPT))
  chk('en pesos se llama a pagar_proveedor_mixto una sola vez en el archivo', (SCRIPT.match(/rpc\('pagar_proveedor_mixto'/g) || []).length === 1)
  chk('la orden de pago es hija directa del body (para imprimirla sola)', /<\/div><!-- \/modal-pago -->[\s\S]{0,600}<div class="modal-cc modal-orden-pago" id="modal-orden-pago" hidden>/.test(FUENTE))
  chk('el botón elegido con el mouse encima sigue naranja lleno', /\.btn-tipo-doc--seleccionado:hover \{ border-color: var\(--color-acento\); background: var\(--color-acento\); \}/.test(FUENTE))
  chk('las dos líneas de cada cheque en bloque (no se montan sobre el importe)', /\.cartera-pago__linea1 \{ display: block; \}/.test(FUENTE))
  chk('al imprimir, solo la orden', /html\.op-imprimiendo body > \*:not\(#modal-orden-pago\) \{ display: none !important; \}/.test(FUENTE) && /@page \{ size: A4 portrait;/.test(FUENTE))
  chk('los montos de cada factura nunca más que su saldo (max del enlace)', /enlazarCampoNumero\(inp, \{ decimales: 2, max: facturasParaPago\[i\]\.saldo > 0 \? facturasParaPago\[i\]\.saldo : undefined \}\)/.test(SCRIPT))
  chk('la lista saca la fábrica de pruebas (salvo la empresa que paga)', /sinUnidadesDePrueba\(chequesParaPagar\(cheques, cobranzas, unidadId, bancos\), estado\.fabrica, c => c\.unidadId === unidadId \? null : c\.unidadId\)/.test(FUENTE))
}

esperas.push(main())
fin()
