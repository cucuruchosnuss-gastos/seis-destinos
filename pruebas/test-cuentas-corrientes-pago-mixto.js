// CUENTAS CORRIENTES: PAGO CON CHEQUES DE CUALQUIER EMPRESA Y PAGO MIXTO
// (15/10/2026, rama ci-prueba/pago-mixto).
//
// Pedido de Facu:
//  1. "Cheques de la cartera" lista los cheques EN CARTERA de TODAS las
//     empresas, agrupados por empresa (la del proveedor primero). Los de otra
//     dicen "de Dolce Pasta" y, al tildarlos, avisan que quedan como deuda
//     entre empresas (lo anota la base: pagar_proveedor_con_cheques_cartera
//     inserta en movimientos_entre_unidades).
//  2. Pago mixto: los cheques más efectivo o transferencia por el resto. Dos
//     pagos en la base, en orden: primero los cheques (cubren las facturas más
//     viejas), después registrar_pago_proveedor por el resto. Si el segundo
//     falla, se avisa que los cheques ya quedaron pagados y el formulario
//     queda para registrar SOLO el resto (no se re-mandan los cheques).
//  3. El resumen antes de confirmar.
// Se EJECUTAN las funciones reales del módulo con un document y una base
// falsos; lo que viaja a la base se mira en los parámetros de cada RPC.
//
//   node pruebas/test-cuentas-corrientes-pago-mixto.js
'use strict'

const path = require('path')
const { construirCon } = require('./sandbox')
const { arnes, leer, marca, chequearMarcas } = require('./circuito-comun')
const { fuenteNumeros } = require('./numeros-comun')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/cuentas-corrientes.html')
const FUENTE = leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

const HOY = '2026-10-15'

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
      classList: { add(c) { clases.add(c) }, remove(c) { clases.delete(c) }, toggle(c, si) { if (si) clases.add(c); else clases.delete(c) }, contains(c) { return clases.has(c) } },
      addEventListener() {}, focus() {}, __atributos: atributos }
  }
  var __els = new Map()
  // Los botones de los medios y de "Completar con".
  var __medios = ['efectivo', 'transferencia', 'cartera'].map(v => { const b = nuevoEl('m-' + v); b.dataset.valor = v; return b })
  var __completar = ['', 'efectivo', 'transferencia'].map(v => { const b = nuevoEl('c-' + v); b.dataset.completar = v; return b })
  var document = {
    getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) },
    querySelectorAll(sel) {
      if (sel === '#grilla-completar-pago [data-completar]') return __completar
      if (sel === '#grilla-medio-pago-cc .btn-tipo-doc, #grilla-completar-pago .btn-tipo-doc') return [...__medios, ...__completar]
      if (sel === '#grilla-medio-pago-cc .btn-tipo-doc') return __medios
      return []
    },
    querySelector: () => null,
    createElement() { return { value: '', textContent: '' } },
  }
  var window = { scrollY: 0, innerHeight: 800 }
  // La base falsa: anota cada RPC; cada una responde lo que diga __respuestas
  // (una lista se consume en orden: la primera llamada, la segunda...).
  var __rpc = [], __respuestas = {}, __consultas = []
  var supabase = {
    rpc: async (nombre, params) => {
      __rpc.push({ nombre, params: JSON.parse(JSON.stringify(params)) })
      let r = __respuestas[nombre]
      if (Array.isArray(r)) r = r.shift()
      if (r && r.lanzar) throw new Error(r.lanzar)
      return r ?? { data: 'g-' + nombre, error: null }
    },
    // Las tablas responden lo que diga __tablas (sin filtrar: la pantalla
    // filtra con chequesParaPagar, que es lo que se prueba).
    from(t) { const q = { _sel: null, select: (c) => { q._sel = c; return q }, eq: () => q, in: () => q, order: () => q,
      then(r) { __consultas.push({ t, sel: q._sel }); return Promise.resolve({ data: __tablas[t] ?? [], error: null }).then(r) } }; return q },
  }
  var __tablas = {}
  var turnoCartera = 0, bancosBcra = null
  var __errores = [], __exitos = [], __recargas = 0
  function mostrarError(m) { __errores.push(m) } function mostrarExito(m) { __exitos.push(m) }
  function formatearFecha(f) { if (!f) return '—'; const [a, m, d] = String(f).split('-'); return d + '/' + m + '/' + a }
  // Los montos de los campos, por id (lo que leería leerCampoNumero).
  var __montos = {}
  function montoDeCampo(id) { return __montos[id] ?? null }
  function ponerNumero(el, n) { __montos[el.id] = n; el.value = n == null ? '' : String(n) }
  function hoyCC() { return '${HOY}' }
  var __sugerencias = 0
  function programarActualizarSugerenciasPago() { __sugerencias++ }
  async function cargarFichaSaldos() { __recargas++ } async function cargarFichaMovimientos() {}
  async function cargarFichaCreditos() {} function renderizarFichaBanner() {} function cargarSaldos() {}
  var medioPagoSeleccionado = null, carteraPago = [], facturasParaPago = []
  var estado = { miRolApp: 'usuario', miEmpleadoId: 'yo', misTareas: new Set(['cuentas_corrientes:registrar_pago', 'cobranzas:procesar']),
    ficha: { proveedorId: 'p1', unidadId: 'u-n', nombre: 'ANATOLIA SRL' },
    maestros: { unidades: [{ id: 'u-n', nombre: 'Cucuruchos Nuss' }, { id: 'u-d', nombre: 'Dolce Pasta' }, { id: 'u-t', nombre: 'Taller' }] },
    cuentasPago: { propias: [{ id: 'cta-ef', nombre: 'Efectivo', medio: 'efectivo', moneda: 'ARS' }, { id: 'cta-bco', nombre: 'Macro', medio: 'banco', moneda: 'ARS' }], empresa: [] },
    fabrica: null }
`

const FUNCIONES = [
  'esc', 'formatearImporte', 'importeHtml', 'tieneTarea', 'nombreUnidad',
  'esMedioCheque', 'fechaCobroCheque', 'libradorDe', 'sumaCheques',
  'chequesParaPagar', 'agruparChequesPorEmpresa', 'textoAvisoOtraEmpresa', 'avisosOtraEmpresa',
  'repartirAplicacionesPagoMixto', 'textoResumenPagoMixto', 'textoRestoPendiente', 'parametrosPagoResto',
  'htmlFilaCartera', 'htmlListaCartera', 'renderizarCarteraPago', 'montoTotalCartera', 'pintarTotalCartera', 'tildarChequeCartera',
  'pintarCompletarPago', 'elegirCompletarPago', 'pintarResumenPagoMixto', 'pintarRestoPendiente', 'registrarRestoPendiente',
  'parametrosPagoCartera', 'asegurarMonedaPesos', 'pintarAvisoPesos', 'pintarMedioCheque', 'seleccionarMedioPagoCC',
  'actualizarSelectorCuentaPago', 'cerrarModalPago', 'confirmarPago', 'puedeUsarCartera',
  'cargarCarteraParaPago', 'asegurarBancos',
]
const CONSTANTES = ['MEDIOS_CHEQUE', 'NOMBRE_COMPLETAR', 'MEDIO_CUENTA_LABEL', 'MEDIO_PAGO_A_MEDIO_CUENTA']

function sandbox() {
  return construirCon(ARCHIVO, {
    preludio: PRELUDIO, funciones: FUNCIONES, constantes: CONSTANTES,
    retorno: `estado, __els, __rpc, __errores, __exitos, __montos, __completar, __medios, __consultas,
      __setVar(k, v){ eval(k + ' = v') }, __getVar(k){ return eval(k) }, __responder(n, r){ __respuestas[n] = r },
      __sugerencias(){ return __sugerencias }, __recargas(){ return __recargas }, __tablas`,
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

  // ══ 3. EL REPARTO DE LAS APLICACIONES ENTRE LOS DOS PAGOS ═══════════════════
  {
    const S = sandbox()
    const rep = S.repartirAplicacionesPagoMixto
    // Vienen desordenadas: los cheques cubren primero la MÁS VIEJA.
    const apps = [
      { factura_pendiente_id: 'f2', monto_aplicado: 320000, fecha: '2026-09-05' },
      { factura_pendiente_id: 'f1', monto_aplicado: 250000, fecha: '2026-08-20' },
    ]
    const r = rep(apps, 270000)
    chk('los cheques cubren primero la factura más vieja, y lo que sobra va a la siguiente',
      JSON.stringify(r.cheques) === '[{"factura_pendiente_id":"f1","monto_aplicado":250000},{"factura_pendiente_id":"f2","monto_aplicado":20000}]', JSON.stringify(r.cheques))
    chk('el resto paga lo que quedó de cada factura',
      JSON.stringify(r.resto) === '[{"factura_pendiente_id":"f2","monto_aplicado":300000}]', JSON.stringify(r.resto))
    chk('en las aplicaciones no viaja la fecha (solo factura y monto)', [...r.cheques, ...r.resto].every(a => JSON.stringify(Object.keys(a)) === '["factura_pendiente_id","monto_aplicado"]'))
    // Centavos: 0,1 + 0,2 no arrastra decimales y cada factura recibe lo justo.
    const c = rep([{ factura_pendiente_id: 'a', monto_aplicado: 50.05, fecha: '2026-01-01' }, { factura_pendiente_id: 'b', monto_aplicado: 100.1, fecha: '2026-01-02' }], 100.1)
    chk('centavos: los cheques cubren justo su total', JSON.stringify(c.cheques) === '[{"factura_pendiente_id":"a","monto_aplicado":50.05},{"factura_pendiente_id":"b","monto_aplicado":50.05}]', JSON.stringify(c.cheques))
    chk('centavos: el resto, lo justo', JSON.stringify(c.resto) === '[{"factura_pendiente_id":"b","monto_aplicado":50.05}]', JSON.stringify(c.resto))
    const d = rep([{ factura_pendiente_id: 'a', monto_aplicado: 0.1, fecha: '2026-01-01' }, { factura_pendiente_id: 'b', monto_aplicado: 0.2, fecha: '2026-01-02' }], 0.3)
    chk('centavos: 0,1 + 0,2 con cheques de 0,3 cubren las dos, sin resto', d.cheques.length === 2 && d.cheques[1].monto_aplicado === 0.2 && d.resto.length === 0, JSON.stringify(d))
    // Los cheques alcanzan para todo: el resto no aplica a nada (queda a favor).
    const e = rep(apps, 1000000)
    chk('si los cheques alcanzan, todo va con los cheques', e.cheques.length === 2 && e.resto.length === 0)
    // Sin cheques (no pasa en la pantalla, pero el reparto no se rompe).
    const f = rep(apps, 0)
    chk('con cheques en cero, todo va al resto', f.cheques.length === 0 && f.resto.length === 2 && f.resto[0].factura_pendiente_id === 'f1')
    // Misma fecha: el orden en que vinieron (el de la lista de facturas).
    const g = rep([{ factura_pendiente_id: 'x', monto_aplicado: 10, fecha: '2026-01-01' }, { factura_pendiente_id: 'y', monto_aplicado: 10, fecha: '2026-01-01' }], 15)
    chk('con la misma fecha, en el orden de la lista', g.cheques[0].factura_pendiente_id === 'x' && g.cheques[0].monto_aplicado === 10 && g.cheques[1].monto_aplicado === 5 && g.resto[0].factura_pendiente_id === 'y')
    chk('una aplicación en cero no viaja', rep([{ factura_pendiente_id: 'z', monto_aplicado: 0, fecha: '2026-01-01' }], 5).cheques.length === 0)
    // 1,13 × 100 = 112,99999999999999 en JS: sin redondear, los cheques no
    // alcanzarían para la factura y quedaría un resto de una millonésima.
    const h = rep([{ factura_pendiente_id: 'a', monto_aplicado: 1.13, fecha: '2026-01-01' }], 1.13)
    chk('centavos: cheques de 1,13 cubren justo una factura de 1,13 (sin resto fantasma)', JSON.stringify(h) === '{"cheques":[{"factura_pendiente_id":"a","monto_aplicado":1.13}],"resto":[]}', JSON.stringify(h))
    // Una aplicación que no es un número no rompe el reparto de las demás.
    const k = rep([{ factura_pendiente_id: 'z', monto_aplicado: NaN, fecha: '2026-01-01' }, { factura_pendiente_id: 'y', monto_aplicado: 10, fecha: '2026-01-02' }], 5)
    chk('una aplicación que no es un número no viaja ni rompe las demás', JSON.stringify(k) === '{"cheques":[{"factura_pendiente_id":"y","monto_aplicado":5}],"resto":[{"factura_pendiente_id":"y","monto_aplicado":5}]}', JSON.stringify(k))
    // Propiedad: cada factura recibe entre los dos EXACTAMENTE lo que se le
    // aplicó, y los cheques nunca superan su total.
    let bien = true
    for (let k = 0; k < 300; k++) {
      const n = 1 + (k % 5)
      const lista = Array.from({ length: n }, (_, i) => ({ factura_pendiente_id: 'f' + i, monto_aplicado: Math.round(((k * 7919 + i * 104729) % 100000) + 1) / 100, fecha: '2026-0' + (1 + ((k + i * 3) % 9)) + '-01' }))
      const cheques = Math.round(((k * 31337) % 200000)) / 100
      const s = rep(lista, cheques)
      const cent = (x) => Math.round(x * 100)
      const sumaCh = s.cheques.reduce((a, x) => a + cent(x.monto_aplicado), 0)
      if (sumaCh > cent(cheques)) bien = false
      for (const a of lista) {
        const tot = [...s.cheques, ...s.resto].filter(x => x.factura_pendiente_id === a.factura_pendiente_id).reduce((acc, x) => acc + cent(x.monto_aplicado), 0)
        if (tot !== cent(a.monto_aplicado)) bien = false
      }
      // Los cheques llenan las más viejas antes de tocar una más nueva.
      const orden = [...lista].sort((x, y) => x.fecha.localeCompare(y.fecha))
      const conResto = new Set(s.resto.map(x => x.factura_pendiente_id))
      const ultimaCh = Math.max(-1, ...s.cheques.map(x => orden.findIndex(o => o.factura_pendiente_id === x.factura_pendiente_id)))
      orden.forEach((o, i) => { if (i < ultimaCh && conResto.has(o.factura_pendiente_id)) bien = false })
    }
    chk('propiedad (300 casos): cada factura recibe justo lo aplicado, los cheques no se pasan y cubren las más viejas primero', bien)
  }

  // ══ 4. EL RESUMEN ANTES DE CONFIRMAR ════════════════════════════════════════
  {
    const S = sandbox()
    const cheques = [
      { importe: 150000, tildado: true, unidadId: 'u-n', unidadNombre: 'Cucuruchos Nuss' },
      { importe: 120000, tildado: true, unidadId: 'u-d', unidadNombre: 'Dolce Pasta' },
      { importe: 999, tildado: false, unidadId: 'u-t', unidadNombre: 'Taller' },
    ]
    const aplicaciones = [{ numero: '0003-00001201', monto: 250000 }, { numero: '0003-00001245', monto: 320000 }]
    const t = S.textoResumenPagoMixto({ cheques, unidadPagaId: 'u-n', completar: 'efectivo', montoResto: 300000, aplicaciones })
    chk('el resumen del pedido: cheques (cuántos y de qué empresa) + efectivo = total aplicado a facturas',
      t === 'Cheques $ 270.000,00 (2 cheques, 1 de Dolce Pasta) + Efectivo $ 300.000,00 = $ 570.000,00 aplicado a facturas 0003-00001201, 0003-00001245', t)
    const tr = S.textoResumenPagoMixto({ cheques, unidadPagaId: 'u-n', completar: 'transferencia', montoResto: 300000, aplicaciones })
    chk('con transferencia dice "Transferencia"', tr.includes(' + Transferencia $ 300.000,00 = '), tr)
    const solo = S.textoResumenPagoMixto({ cheques: [cheques[0]], unidadPagaId: 'u-n', completar: null, montoResto: null, aplicaciones: [{ numero: '0003-00001201', monto: 150000 }] })
    chk('solo cheques de la que paga: sin "de …" ni "+"', solo === 'Cheques $ 150.000,00 (1 cheque) = $ 150.000,00 aplicado a la factura 0003-00001201', solo)
    const favor = S.textoResumenPagoMixto({ cheques, unidadPagaId: 'u-n', completar: 'efectivo', montoResto: 300000, aplicaciones: [{ numero: 'A', monto: 500000 }] })
    chk('lo que no se aplica queda a favor', favor === 'Cheques $ 270.000,00 (2 cheques, 1 de Dolce Pasta) + Efectivo $ 300.000,00 = $ 570.000,00: $ 500.000,00 aplicado a la factura A y $ 70.000,00 queda a favor', favor)
    const nada = S.textoResumenPagoMixto({ cheques, unidadPagaId: 'u-n', completar: null, montoResto: 5, aplicaciones: [{ numero: 'A', monto: 0 }] })
    chk('sin facturas: queda a favor (y sin completar el resto no suma)', nada === 'Cheques $ 270.000,00 (2 cheques, 1 de Dolce Pasta) = $ 270.000,00, sin aplicar a facturas: queda a favor.', nada)
    const dos = S.textoResumenPagoMixto({ cheques: [...cheques.slice(0, 2), { importe: 1, tildado: true, unidadId: 'u-t', unidadNombre: 'Taller' }, { importe: 1, tildado: true, unidadId: 'u-d', unidadNombre: 'Dolce Pasta' }], unidadPagaId: 'u-n', completar: null, aplicaciones: [] })
    chk('varias empresas: cuántos de cada una', dos.startsWith('Cheques $ 270.002,00 (4 cheques, 2 de Dolce Pasta, 1 de Taller) = '), dos)
    chk('sin cheques tildados, no hay resumen', S.textoResumenPagoMixto({ cheques: [cheques[2]], unidadPagaId: 'u-n', completar: 'efectivo', montoResto: 5, aplicaciones }) === '')
    chk('centavos: 0,1 + 0,2 de cheques', S.textoResumenPagoMixto({ cheques: [{ importe: 0.1, tildado: true, unidadId: 'u-n' }, { importe: 0.2, tildado: true, unidadId: 'u-n' }], unidadPagaId: 'u-n', completar: 'efectivo', montoResto: 0.1, aplicaciones: [] }).includes('= $ 0,40,'))

    // En la pantalla: va por textContent y solo con la cartera.
    S.__setVar('medioPagoSeleccionado', 'cartera')
    S.__setVar('carteraPago', [{ ...cheques[0], id: 'a' }, { ...cheques[1], id: 'b', unidadNombre: marca('res') }])
    S.__setVar('facturasParaPago', [{ id: 'f1', numero: '0003-00001201', checked: true, monto: 250000 }, { id: 'f2', numero: 'NO', checked: false, monto: 9 }])
    S.estado.pagoCompletar = 'efectivo'
    S.__montos['campo-resto-pago'] = 300000
    S.pintarResumenPagoMixto()
    const r = el(S, 'resumen-pago-mixto')
    chk('el resumen se ve con la cartera, con las facturas tildadas', r.hidden === false && r.textContent.endsWith('= $ 570.000,00: $ 250.000,00 aplicado a la factura 0003-00001201 y $ 320.000,00 queda a favor'), r.textContent)
    chk('el resumen va por textContent (el nombre de la empresa es de la base)', r.innerHTML === '' && r.textContent.includes(marca('res')))
    S.__setVar('medioPagoSeleccionado', 'efectivo')
    S.pintarResumenPagoMixto()
    chk('sin la cartera, no hay resumen', r.hidden === true)
  }

  // ══ 5. "COMPLETAR CON" Y EL MONTO TOTAL ═════════════════════════════════════
  {
    const S = sandbox()
    S.__setVar('medioPagoSeleccionado', 'cartera')
    S.__setVar('carteraPago', [{ id: 'a', importe: 150000.1, tildado: true, unidadId: 'u-n' }, { id: 'b', importe: 120000.2, tildado: true, unidadId: 'u-d', otraEmpresa: true, unidadNombre: 'Dolce Pasta' }])
    el(S, 'campo-moneda-pago').value = 'ARS'   // la cartera pasa la moneda a pesos
    S.pintarCompletarPago()
    chk('con la cartera se ve "Completar con", sin el campo del resto', el(S, 'grupo-completar-pago').hidden === false && el(S, 'grupo-resto-pago').hidden === true)
    chk('"Solo cheques" viene marcado', S.__completar[0].classList.contains('btn-tipo-doc--seleccionado') && S.__completar[0].getAttribute('aria-pressed') === 'true')
    S.pintarTotalCartera()
    chk('solo cheques: el monto es la suma de los cheques', S.__montos['campo-monto-pago'] === 270000.3, S.__montos['campo-monto-pago'])
    S.elegirCompletarPago('efectivo')
    chk('completar con efectivo: aparece el resto', S.estado.pagoCompletar === 'efectivo' && el(S, 'grupo-resto-pago').hidden === false && el(S, 'etiqueta-resto-pago').textContent === 'El resto, en efectivo')
    chk('completar con efectivo: se marca el botón', S.__completar[1].classList.contains('btn-tipo-doc--seleccionado') && !S.__completar[0].classList.contains('btn-tipo-doc--seleccionado'))
    chk('completar con efectivo: aparece la cuenta, con las de efectivo', el(S, 'grupo-cuenta-pago-cc').style.display === 'flex' &&
      el(S, 'campo-cuenta-pago-cc').innerHTML.includes('cta-ef') && !el(S, 'campo-cuenta-pago-cc').innerHTML.includes('cta-bco'), el(S, 'campo-cuenta-pago-cc').innerHTML)
    chk('la etiqueta del monto dice que es el total', el(S, 'etiqueta-monto-pago').textContent === 'Monto total (los cheques tildados más el resto)')
    S.__montos['campo-resto-pago'] = 299999.7
    S.pintarTotalCartera()
    chk('el monto total = cheques + resto, en centavos', S.__montos['campo-monto-pago'] === 570000, S.__montos['campo-monto-pago'])
    chk('cambiar el resto recalcula las facturas', S.__sugerencias() >= 2)
    S.elegirCompletarPago('transferencia')
    chk('con transferencia, las cuentas de banco', el(S, 'campo-cuenta-pago-cc').innerHTML.includes('cta-bco') && !el(S, 'campo-cuenta-pago-cc').innerHTML.includes('cta-ef'))
    S.elegirCompletarPago('')
    chk('volver a "Solo cheques": sin resto ni cuenta, y el monto vuelve a los cheques',
      S.estado.pagoCompletar === null && el(S, 'grupo-resto-pago').hidden === true && el(S, 'grupo-cuenta-pago-cc').style.display === 'none' &&
      S.__montos['campo-resto-pago'] == null && S.__montos['campo-monto-pago'] === 270000.3, JSON.stringify(S.__montos))
    // Un resto que quedó escrito no suma si no se completa.
    S.__montos['campo-resto-pago'] = 999
    S.pintarTotalCartera()
    chk('sin completar, un resto que quedó escrito no suma', S.__montos['campo-monto-pago'] === 270000.3, S.__montos['campo-monto-pago'])
    // Elegir otro medio saca "Completar con".
    S.estado.pagoCompletar = 'efectivo'
    S.seleccionarMedioPagoCC('efectivo')
    chk('otro medio: "Completar con" se esconde y se olvida', el(S, 'grupo-completar-pago').hidden === true && S.estado.pagoCompletar === null)
    chk('en efectivo suelto, la cuenta es la de efectivo (como siempre)', el(S, 'grupo-cuenta-pago-cc').style.display === 'flex' && el(S, 'campo-cuenta-pago-cc').innerHTML.includes('cta-ef'))
  }

  // ══ 6. CONFIRMAR: LOS DOS PAGOS, EN ORDEN ═══════════════════════════════════
  function prepararMixto(S, { resto = 300000, cuenta = 'cta-ef', completar = 'efectivo' } = {}) {
    S.__setVar('medioPagoSeleccionado', 'cartera')
    S.__setVar('carteraPago', [
      { id: 'n1', importe: 150000, tildado: true, unidadId: 'u-n' },
      { id: 'd1', importe: 120000, tildado: true, unidadId: 'u-d', otraEmpresa: true, unidadNombre: 'Dolce Pasta' },
      { id: 'n9', importe: 7, tildado: false, unidadId: 'u-n' },
    ])
    // La lista de facturas, como la arma la pantalla (de la más vieja a la más nueva).
    S.__setVar('facturasParaPago', [
      { id: 'f1', numero: '0003-00001201', fecha: '2026-08-20', saldo: 250000, checked: true, monto: 250000 },
      { id: 'f2', numero: '0003-00001245', fecha: '2026-09-05', saldo: 400000, checked: true, monto: 320000 },
      { id: 'f3', numero: '0003-00001300', fecha: '2026-09-12', saldo: 90000, checked: false, monto: 0 },
    ])
    S.estado.pagoCompletar = completar
    S.__montos['campo-resto-pago'] = resto
    S.__montos['campo-monto-pago'] = 270000 + (resto ?? 0)
    el(S, 'campo-moneda-pago').value = 'ARS'
    el(S, 'campo-fecha-pago-cc').value = HOY
    el(S, 'campo-cuenta-pago-cc').value = cuenta
  }
  {
    const S = sandbox()
    prepararMixto(S)
    S.__responder('pagar_proveedor_con_cheques_cartera', { data: 'a1b2c3d4-gasto-cheques', error: null })
    await S.confirmarPago()
    const ll = S.__rpc
    chk('mixto: dos RPC, en orden: primero los cheques, después el resto',
      JSON.stringify(ll.map(x => x.nombre)) === '["pagar_proveedor_con_cheques_cartera","registrar_pago_proveedor"]', JSON.stringify(ll.map(x => x.nombre)))
    const p1 = ll[0]?.params ?? {}, p2 = ll[1]?.params ?? {}
    chk('mixto: los cheques tildados (también el de otra empresa)', JSON.stringify(p1.p_cheque_ids) === '["n1","d1"]', JSON.stringify(p1.p_cheque_ids))
    chk('mixto: los cheques cubren las facturas más viejas',
      JSON.stringify(p1.p_aplicaciones) === '[{"factura_pendiente_id":"f1","monto_aplicado":250000},{"factura_pendiente_id":"f2","monto_aplicado":20000}]', JSON.stringify(p1.p_aplicaciones))
    chk('mixto: el pago de los cheques sigue sin cuenta de caja', !('p_cuenta_id' in p1) && p1.p_unidad_negocio_id === 'u-n' && p1.p_proveedor_id === 'p1' && p1.p_fecha === HOY)
    chk('mixto: el resto, en efectivo, con su cuenta, su monto y la misma fecha',
      p2.p_medio_pago === 'efectivo' && p2.p_cuenta_id === 'cta-ef' && p2.p_monto === 300000 && p2.p_moneda === 'ARS' && p2.p_fecha_pago === HOY &&
      p2.p_proveedor_id === 'p1' && p2.p_unidad_negocio_id === 'u-n' && p2.p_empleado_id === 'yo', JSON.stringify(p2))
    chk('mixto: el resto se aplica a lo que quedó', JSON.stringify(p2.p_aplicaciones) === '[{"factura_pendiente_id":"f2","monto_aplicado":300000}]', JSON.stringify(p2.p_aplicaciones))
    chk('mixto: el aviso de éxito dice las dos cosas',
      S.__exitos.at(-1) === '¡Pago registrado! Los cheques quedaron endosados a ANATOLIA SRL y el resto ($ 300.000,00) se pagó en efectivo.', S.__exitos.at(-1))
    chk('mixto: sin nada pendiente y la ficha recargada', !S.estado.pagoRestoPendiente && S.__recargas() === 1 && el(S, 'modal-pago').hidden === true)
    chk('mixto: ningún error', S.__errores.length === 0, JSON.stringify(S.__errores))
  }
  {
    // La lista de facturas desordenada: el reparto mira la FECHA de cada una.
    const S = sandbox()
    prepararMixto(S)
    S.__setVar('facturasParaPago', [...S.__getVar('facturasParaPago')].reverse())
    await S.confirmarPago()
    chk('mixto con la lista desordenada: los cheques igual cubren la más vieja',
      JSON.stringify(S.__rpc[0]?.params.p_aplicaciones) === '[{"factura_pendiente_id":"f1","monto_aplicado":250000},{"factura_pendiente_id":"f2","monto_aplicado":20000}]', JSON.stringify(S.__rpc[0]?.params.p_aplicaciones))
  }
  {
    const S = sandbox()
    prepararMixto(S, { completar: 'transferencia', cuenta: 'cta-bco' })
    await S.confirmarPago()
    chk('mixto con transferencia: el resto va como transferencia', S.__rpc[1]?.params.p_medio_pago === 'transferencia' && S.__rpc[1]?.params.p_cuenta_id === 'cta-bco')
  }
  {
    // Solo cheques: una sola RPC con todas las aplicaciones (como antes).
    const S = sandbox()
    prepararMixto(S, { completar: null, resto: null })
    S.__getVar('facturasParaPago')[1].monto = 20000
    await S.confirmarPago()
    chk('solo cheques: una RPC con todas las aplicaciones', S.__rpc.length === 1 && S.__rpc[0].nombre === 'pagar_proveedor_con_cheques_cartera' &&
      JSON.stringify(S.__rpc[0].params.p_aplicaciones) === '[{"factura_pendiente_id":"f1","monto_aplicado":250000},{"factura_pendiente_id":"f2","monto_aplicado":20000}]', JSON.stringify([S.__rpc, S.__errores]))
    chk('solo cheques: el aviso de siempre', S.__exitos.at(-1) === '¡Pago registrado! Los cheques quedaron endosados a ANATOLIA SRL.', S.__exitos.at(-1))
  }

  // ══ 7. SI EL SEGUNDO PAGO FALLA ═════════════════════════════════════════════
  {
    const S = sandbox()
    prepararMixto(S)
    S.__responder('pagar_proveedor_con_cheques_cartera', { data: 'a1b2c3d4-gasto-cheques', error: null })
    S.__responder('registrar_pago_proveedor', [{ data: null, error: { message: 'El monto aplicado a la factura f2 supera su saldo pendiente' } }, { data: 'g-resto', error: null }])
    await S.confirmarPago()
    const aviso = el(S, 'aviso-resto-pendiente')
    const esperado = 'Los cheques ya quedaron pagados (gasto a1b2c3d4). Falta registrar el resto de $ 300.000,00: El monto aplicado a la factura f2 supera su saldo pendiente'
    chk('falla el resto: el aviso en el formulario dice que los cheques ya se pagaron y el error de la base tal cual', aviso.hidden === false && aviso.textContent === esperado, aviso.textContent)
    chk('falla el resto: también como error', S.__errores.at(-1) === esperado, S.__errores.at(-1))
    chk('falla el resto: queda pendiente SOLO el resto', S.estado.pagoRestoPendiente?.monto === 300000 && S.estado.pagoRestoPendiente?.medio === 'efectivo' &&
      JSON.stringify(S.estado.pagoRestoPendiente?.aplicaciones) === '[{"factura_pendiente_id":"f2","monto_aplicado":300000}]')
    chk('falla el resto: el modal sigue abierto y la ficha se recargó (ya muestra los cheques)', el(S, 'modal-pago').hidden !== true && S.__recargas() === 1)
    chk('falla el resto: no se cantó éxito', S.__exitos.length === 0)
    chk('falla el resto: no se tocan más los cheques, el medio ni las facturas',
      el(S, 'grupo-cartera-pago').hidden === true && el(S, 'grupo-facturas-pago').hidden === true &&
      [...S.__medios, ...S.__completar].every(b => b.disabled === true) && el(S, 'campo-resto-pago').readOnly === true)
    chk('falla el resto: el botón dice "Registrar el resto"', el(S, 'btn-confirmar-pago').textContent === 'Registrar el resto' && el(S, 'btn-confirmar-pago').disabled === false)
    chk('falla el resto: no hay resumen de cheques (ya se pagaron)', el(S, 'resumen-pago-mixto').hidden === true)
    // Un repintado sin mensaje no borra el error.
    S.pintarRestoPendiente(null)
    chk('un repintado no borra el error de la base', aviso.textContent === esperado, aviso.textContent)
    // "Completar con" no se puede cambiar con el resto pendiente.
    S.elegirCompletarPago('transferencia')
    chk('con el resto pendiente, "Completar con" no cambia', S.estado.pagoRestoPendiente?.medio === 'efectivo' && S.estado.pagoCompletar === 'efectivo')

    // Reintentar: SOLO el resto, nunca los cheques.
    el(S, 'campo-cuenta-pago-cc').value = 'cta-ef-2'
    await S.confirmarPago()
    const nombres = S.__rpc.map(x => x.nombre)
    chk('reintentar: solo registrar_pago_proveedor (los cheques se mandaron una sola vez)',
      JSON.stringify(nombres) === '["pagar_proveedor_con_cheques_cartera","registrar_pago_proveedor","registrar_pago_proveedor"]', JSON.stringify(nombres))
    chk('reintentar: el mismo resto, con la cuenta elegida ahora', S.__rpc[2].params.p_monto === 300000 && S.__rpc[2].params.p_cuenta_id === 'cta-ef-2' &&
      JSON.stringify(S.__rpc[2].params.p_aplicaciones) === '[{"factura_pendiente_id":"f2","monto_aplicado":300000}]')
    chk('reintentar bien: éxito, nada pendiente, modal cerrado', S.__exitos.at(-1) === '¡Listo! Se registró el resto de $ 300.000,00.' && !S.estado.pagoRestoPendiente && el(S, 'modal-pago').hidden === true, S.__exitos.at(-1))
    chk('reintentar bien: al cerrar no dice que falta el resto', !S.__errores.some(e => e.startsWith('Quedó sin registrar')), JSON.stringify(S.__errores))
  }
  {
    // El segundo pago tira una excepción (sin red): mismo aviso.
    const S = sandbox()
    prepararMixto(S)
    S.__responder('pagar_proveedor_con_cheques_cartera', { data: 'zz', error: null })
    S.__responder('registrar_pago_proveedor', { lanzar: 'Failed to fetch' })
    await S.confirmarPago()
    chk('sin red en el segundo: el mismo aviso (los cheques ya se pagaron)', el(S, 'aviso-resto-pendiente').textContent === 'Los cheques ya quedaron pagados (gasto zz). Falta registrar el resto de $ 300.000,00: Failed to fetch', el(S, 'aviso-resto-pendiente').textContent)
    chk('sin red en el segundo: no dice "Error al registrar el pago" (eso es si fallan los cheques)', !S.__errores.some(e => e.startsWith('Error al registrar el pago')))
    // Cerrar con el resto pendiente: se recuerda lo que falta.
    S.cerrarModalPago()
    chk('cerrar con el resto pendiente: avisa y lo olvida', S.__errores.at(-1) === 'Quedó sin registrar el resto de $ 300.000,00: registralo con "Registrar pago".' && !S.estado.pagoRestoPendiente, S.__errores.at(-1))
  }
  {
    // Fallan los cheques: no se manda el resto.
    const S = sandbox()
    prepararMixto(S)
    S.__responder('pagar_proveedor_con_cheques_cartera', { data: null, error: { message: 'El cheque N° 66259862 no está en cartera (está endosado).' } })
    await S.confirmarPago()
    chk('fallan los cheques: no se manda el resto', S.__rpc.length === 1 && S.__rpc[0].nombre === 'pagar_proveedor_con_cheques_cartera')
    chk('fallan los cheques: el error de la base tal cual', S.__errores.at(-1) === 'Error al registrar el pago: El cheque N° 66259862 no está en cartera (está endosado).', S.__errores.at(-1))
    chk('fallan los cheques: nada pendiente', !S.estado.pagoRestoPendiente && el(S, 'aviso-resto-pendiente').textContent === '' && S.__exitos.length === 0)
  }

  // ══ 8. LO QUE SE FRENA ANTES DEL PRIMER PAGO ════════════════════════════════
  {
    const S = sandbox()
    prepararMixto(S, { resto: null })
    S.__montos['campo-monto-pago'] = 270000
    await S.confirmarPago()
    chk('completar sin el resto: no llama y avisa', S.__rpc.length === 0 && S.__errores.at(-1) === 'Ingresá el resto a pagar en efectivo.', S.__errores.at(-1))
    prepararMixto(S, { cuenta: '' })
    await S.confirmarPago()
    chk('completar sin cuenta: no llama y avisa', S.__rpc.length === 0 && S.__errores.at(-1) === 'Seleccioná la cuenta.', S.__errores.at(-1))
    prepararMixto(S)
    S.__getVar('facturasParaPago')[1].monto = 400000.01
    S.__montos['campo-monto-pago'] = 1000000
    await S.confirmarPago()
    chk('lo aplicado a una factura por encima de su saldo: no llama (el resto fallaría con los cheques ya pagados)',
      S.__rpc.length === 0 && S.__errores.at(-1) === 'Lo aplicado a la factura 0003-00001245 supera su saldo pendiente.', S.__errores.at(-1))
    prepararMixto(S)
    S.__montos['campo-monto-pago'] = 500000
    await S.confirmarPago()
    chk('lo aplicado por encima del total (cheques + resto): no llama', S.__rpc.length === 0 && S.__errores.at(-1) === 'La suma aplicada no puede superar el monto a pagar.', S.__errores.at(-1))
    prepararMixto(S)
    el(S, 'campo-fecha-pago-cc').value = '2026-10-16'
    await S.confirmarPago()
    chk('fecha futura: no llama', S.__rpc.length === 0 && S.__errores.at(-1) === 'La fecha del pago no puede ser futura.')
  }

  // ══ 9. EL MARCADO ═══════════════════════════════════════════════════════════
  chk('"Completar con": Solo cheques, Efectivo y Transferencia / QR',
    /<div class="grilla-medio-pago" id="grilla-completar-pago">\s*<button type="button" class="btn-tipo-doc" data-completar="">Solo cheques<\/button>\s*<button type="button" class="btn-tipo-doc" data-completar="efectivo">Efectivo<\/button>\s*<button type="button" class="btn-tipo-doc" data-completar="transferencia">Transferencia \/ QR<\/button>/.test(FUENTE))
  chk('"Completar con" va entre los cheques y la cuenta', FUENTE.indexOf('id="grupo-cartera-pago"') < FUENTE.indexOf('id="grupo-completar-pago"') && FUENTE.indexOf('id="grupo-completar-pago"') < FUENTE.indexOf('id="grupo-cuenta-pago-cc"'))
  chk('el resto es un campo de número argentino (enlazado como los montos)', /const IDS_CAMPOS_MONTO = \[[^\]]*'campo-resto-pago'[^\]]*\]/.test(FUENTE) && /<input type="text" id="campo-resto-pago" placeholder="0,00" inputmode="decimal">/.test(FUENTE))
  chk('el botón elegido sigue naranja con el mouse encima (el :hover pesaba más)', /\.btn-tipo-doc--seleccionado:hover \{ border-color: var\(--color-acento\); background: var\(--color-acento\); \}/.test(FUENTE) &&
    FUENTE.indexOf('.btn-tipo-doc--seleccionado:hover {') > FUENTE.indexOf('.btn-tipo-doc:hover {'))
  chk('las líneas de cada cheque en bloque (el "…" corre y no se montan sobre el importe)', /\.cartera-pago__linea1 \{ display: block; \}/.test(FUENTE) && /\.cartera-pago__linea2-texto \{ min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; \}/.test(FUENTE))
  chk('el aviso del resto pendiente se anuncia (role=alert)', /<p class="resto-pendiente-pago" id="aviso-resto-pendiente" role="alert" hidden><\/p>/.test(FUENTE))
  chk('al abrir el modal, el pago mixto arranca de cero', /estado\.pagoCompletar = null\s*estado\.pagoRestoPendiente = null\s*ponerNumero\(document\.getElementById\('campo-resto-pago'\), null\)\s*seleccionarMedioPagoCC\(null\)/.test(FUENTE))
  chk('la lista de cheques pide el nombre de la empresa a v_cobranzas', /\.select\('id, estado, unidad_negocio_id, unidad_negocio_nombre, moneda, cliente'\)/.test(FUENTE))
  chk('la lista saca la fábrica de pruebas (salvo la empresa que paga)', /sinUnidadesDePrueba\(chequesParaPagar\(cheques, cobranzas, unidadId, bancos\), estado\.fabrica, c => c\.unidadId === unidadId \? null : c\.unidadId\)/.test(FUENTE))
}

esperas.push(main())
fin()
