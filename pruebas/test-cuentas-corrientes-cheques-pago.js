// CUENTAS CORRIENTES: CLIENTES Y LOS CHEQUES EN UN PAGO (05/10/2026).
//
// Pedido de Facu (tarea A, rama ci-prueba/cc-proveedores-clientes-cheques):
//  1. DOS PESTAÑAS de primer nivel: Proveedores (lo de siempre) y Clientes,
//     que es la MISMA pantalla de Administración → Clientes abierta adentro
//     (administracion.html?seccion=clientes&embebido=cc), sin copiar código.
//     Se ve con retiros:ver.
//  2. "Registrar pago" con TRES medios: efectivo y transferencia como
//     siempre, y "Cheques de la cartera" (pagar_proveedor_con_cheques_cartera:
//     el monto es la suma de los tildados y NO mueve caja). "Cheque" ya no va
//     por registrar_pago_proveedor (ahí no movía ni la caja ni la cartera).
//     El cuarto, "Cheque / e-cheque propio" (pagar_proveedor_con_cheque_propio),
//     se SACÓ el 11/10/2026: la empresa no emite cheques propios. Esta suite
//     exige que no vuelva (da rojo con el archivo de antes).
//  3. La etiqueta de esos pagos en la cuenta del proveedor.
//  4. Administración embebida: sin encabezado, sin portada, sin irse al
//     dashboard.
// Se EJECUTAN las funciones reales del módulo con un document y una base
// falsos; lo que viaja a la base se mira en los parámetros de la RPC.
//
//   node pruebas/test-cuentas-corrientes-cheques-pago.js
'use strict'

const path = require('path')
const fs = require('fs')
const { construirCon } = require('./sandbox')
const { arnes, leer, marca, chequearMarcas } = require('./circuito-comun')
const { fuenteNumeros } = require('./numeros-comun')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/cuentas-corrientes.html')
const ADMIN = process.env.ARCHIVO_ADMIN || path.join(RAIZ, 'modulos/administracion.html')
const FUENTE = leer(ARCHIVO)
const FUENTE_ADMIN = fs.readFileSync(ADMIN, 'utf8')
console.log(`COMUN ${ADMIN} (${FUENTE_ADMIN.length} bytes)`)
const { chk, esperas, fin } = arnes()

const HOY = '2026-10-05'

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
      getBoundingClientRect() { return { top: 120 } }, addEventListener() {}, focus() {}, __atributos: atributos }
  }
  var __els = new Map()
  var __secciones = [nuevoEl('b-prov'), nuevoEl('b-cli')]
  __secciones[0].dataset.ccSeccion = 'proveedores'
  __secciones[1].dataset.ccSeccion = 'clientes'
  var document = {
    getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) },
    querySelectorAll(sel) { return sel === '[data-cc-seccion]' ? __secciones : [] },
    querySelector: () => null,
    createElement() { return { value: '', textContent: '' } },
  }
  var location = { pathname: '/modulos/cuentas-corrientes.html', search: '' }
  var __historial = []
  var history = { replaceState(a, b, u) { __historial.push(u) } }
  var window = { scrollY: 0, innerHeight: 800 }
  // La base falsa: anota cada RPC y cada consulta.
  var __rpc = [], __rpcError = null, __consultas = []
  var supabase = {
    rpc: async (nombre, params) => { __rpc.push({ nombre, params: JSON.parse(JSON.stringify(params)) }); return { data: 'g-nuevo', error: __rpcError } },
    from(t) { __consultas.push(t); const q = { select: () => q, eq: () => q, in: () => q, order: () => q, then(r) { return Promise.resolve({ data: [], error: null }).then(r) } }; return q },
  }
  var __errores = [], __exitos = []
  function mostrarError(m) { __errores.push(m) } function mostrarExito(m) { __exitos.push(m) }
  function formatearFecha(f) { if (!f) return '—'; const [a, m, d] = String(f).split('-'); return d + '/' + m + '/' + a }
  // Lo que no es de esta suite.
  var __monto = null, __puesto = []
  function montoDeCampo() { return __monto }
  function ponerNumero(el, n) { __puesto.push(n); el.value = n == null ? '' : String(n) }
  function hoyCC() { return '${HOY}' }
  var __sugerencias = 0
  function programarActualizarSugerenciasPago() { __sugerencias++ }
  function actualizarSelectorCuentaPago() {}
  function cerrarModalPago() {} async function cargarFichaSaldos() {} async function cargarFichaMovimientos() {}
  async function cargarFichaCreditos() {} function renderizarFichaBanner() {} function cargarSaldos() {}
  function ajustarMarcoClientes() {}
  async function cargarFichaOrdenesPago() {} async function abrirOrdenPago() {}
  var estadoPago = null
  var medioPagoSeleccionado = null, carteraPago = [], facturasParaPago = [], bancosBcra = null, turnoCartera = 0
  var estado = { miRolApp: 'usuario', miEmpleadoId: 'yo', misTareas: new Set(['cuentas_corrientes:registrar_pago']),
    ficha: { proveedorId: 'p1', unidadId: 'u-n', nombre: 'DIMAFLO S.A.' },
    maestros: { unidades: [{ id: 'u-n', nombre: 'Cucuruchos Nuss' }, { id: 'u-dolce', nombre: 'Dolce Pasta' }] } }
`

const FUNCIONES = [
  'esc', 'formatearImporte', 'importeHtml', 'tieneTarea',
  'puedeVerClientes', 'renderizarPrimerNivel', 'mostrarSeccionCC', 'abrirMarcoClientes',
  'esMedioCheque', 'puedeUsarCartera', 'fechaCobroCheque', 'libradorDe', 'sumaCheques',
  'chequesParaPagar', 'htmlFilaCartera', 'renderizarCarteraPago', 'pintarTotalCartera', 'tildarChequeCartera',
  'htmlListaCartera', 'agruparChequesPorEmpresa', 'avisosOtraEmpresa', 'textoAvisoOtraEmpresa', 'nombreUnidad',
  // El pago en los dos sentidos (20/10/2026): el pie y la confirmación.
  'monedaPago', 'esPagoEnPesos', 'centavosDe', 'totalesPago', 'totalesPagoActuales', 'estadoDiferencia', 'htmlBarraPago',
  'textoResumenPago', 'pintarPiePago', 'refrescarPago', 'aplicacionesPago', 'validarPago', 'parametrosPagoMixto',
  'textoExitoPago', 'recargarFichaDespuesDePago', 'pintarMedioPorMoneda', 'pintarCarteraPago', 'confirmarPago',
  'etiquetaPagoDeGasto',
]
const CONSTANTES = ['MEDIOS_CHEQUE', 'URL_CLIENTES', 'NOMBRE_MEDIO']

function sandbox() {
  return construirCon(ARCHIVO, {
    preludio: PRELUDIO, funciones: FUNCIONES, constantes: CONSTANTES,
    retorno: `estado, __els, __historial, __rpc, __errores, __exitos, __consultas, __puesto, __secciones,
      __setVar(k, v){ eval(k + ' = v') }, __getVar(k){ return eval(k) }, __monto(v){ __monto = v }, __rpcFalla(e){ __rpcError = e },
      __sugerencias(){ return __sugerencias }`,
  })
}
const el = (S, id) => S.__els.get(id) ?? { value: '', hidden: undefined, innerHTML: '' }
function preparar(S, { medio, moneda = 'ARS', fecha = HOY, monto = null }) {
  S.__setVar('medioPagoSeleccionado', medio)
  S.__els.get = S.__els.get.bind(S.__els)
  const m = S.__els.has('campo-moneda-pago') ? S.__els.get('campo-moneda-pago') : null
  // Se crean pidiéndolos por getElementById (lo hace el propio código), así
  // que alcanza con ponerles el valor después de la primera vez.
  return { moneda, fecha, monto, m }
}
async function confirmar(S, { medio, moneda = 'ARS', fecha = HOY, monto = null, campos = {} }) {
  S.__setVar('medioPagoSeleccionado', medio)
  S.__monto(monto)
  const doc = S.__getVar('document')
  doc.getElementById('campo-moneda-pago').value = moneda
  doc.getElementById('campo-fecha-pago-cc').value = fecha
  for (const [id, v] of Object.entries(campos)) doc.getElementById(id).value = v
  await S.confirmarPago()
}

const CHEQUES = [
  { id: 'c1', cobranza_id: 'cob-a', banco_codigo: '007', numero: '00000222', tipo: 'diferido', fecha_emision: '2026-09-01', fecha_pago: '2026-11-10', importe: 100000.1, titulares: [{ nombre: 'PEREZ JUAN' }, { nombre: 'GOMEZ ANA' }], estado: 'en_cartera' },
  { id: 'c2', cobranza_id: 'cob-a', banco_codigo: '999', numero: '00000111', tipo: 'comun', fecha_emision: '2026-10-01', fecha_pago: null, importe: 50000.2, titulares: [], estado: 'en_cartera' },
  { id: 'c3', cobranza_id: 'cob-b', banco_codigo: '007', numero: '00000333', tipo: 'diferido', fecha_emision: '2026-09-01', fecha_pago: '2026-10-20', importe: 1, titulares: [], estado: 'en_cartera' },
  { id: 'c4', cobranza_id: 'cob-c', banco_codigo: '007', numero: '00000444', tipo: 'diferido', fecha_emision: '2026-09-01', fecha_pago: '2026-10-20', importe: 1, titulares: [], estado: 'en_cartera' },
  { id: 'c5', cobranza_id: 'cob-d', banco_codigo: '007', numero: '00000555', tipo: 'diferido', fecha_emision: '2026-09-01', fecha_pago: '2026-10-20', importe: 1, titulares: [], estado: 'en_cartera' },
  { id: 'c6', cobranza_id: 'cob-a', banco_codigo: '007', numero: '00000666', tipo: 'diferido', fecha_emision: '2026-09-01', fecha_pago: '2026-10-20', importe: 1, titulares: [], estado: 'endosado' },
]
const COBRANZAS = new Map([
  ['cob-a', { id: 'cob-a', estado: 'procesada', unidad_negocio_id: 'u-n', moneda: 'ARS', cliente: 'JyM' }],
  ['cob-b', { id: 'cob-b', estado: 'registrada', unidad_negocio_id: 'u-n', moneda: 'ARS', cliente: 'X' }],   // sin asentar
  ['cob-c', { id: 'cob-c', estado: 'procesada', unidad_negocio_id: 'u-dolce', moneda: 'ARS', cliente: 'X' }], // otra empresa
  ['cob-d', { id: 'cob-d', estado: 'procesada', unidad_negocio_id: 'u-n', moneda: 'USD', cliente: 'X' }],      // dólares
])

async function main() {
  // ══ 1. LAS DOS PESTAÑAS ════════════════════════════════════════════════════
  chk('el marcado tiene las dos pestañas (Proveedores y Clientes) y nace escondido',
    /<nav class="cc-primer" id="cc-primer"[^>]*hidden>/.test(FUENTE) && /data-cc-seccion="proveedores"/.test(FUENTE) && /data-cc-seccion="clientes"/.test(FUENTE))
  chk('Clientes es un iframe del mismo sitio, sin src hasta abrirla', /<iframe class="cc-clientes-marco" id="cc-clientes-marco" title="[^"]+"><\/iframe>/.test(FUENTE))
  chk('lo de proveedores está envuelto (se esconde entero en Clientes)',
    FUENTE.indexOf('<div id="cc-seccion-proveedores">') < FUENTE.indexOf('<div class="grilla-resumen-cc">') &&
    FUENTE.indexOf('</div><!-- /cc-seccion-proveedores -->') > FUENTE.indexOf('id="tab-pendientes"'))
  {
    const S = sandbox()
    S.renderizarPrimerNivel()
    chk('sin retiros:ver, no hay pestañas', el(S, 'cc-primer').hidden === true)
    S.mostrarSeccionCC('clientes')
    chk('sin retiros:ver, pedir Clientes deja Proveedores', S.estado.seccion === 'proveedores' && el(S, 'cc-seccion-clientes').hidden === true && el(S, 'cc-seccion-proveedores').hidden === false)
    chk('sin retiros:ver, el marco no se carga', !el(S, 'cc-clientes-marco').getAttribute?.('src'))
    S.estado.misTareas.add('retiros:ver')
    S.renderizarPrimerNivel()
    chk('con retiros:ver, hay pestañas', el(S, 'cc-primer').hidden === false)
    S.mostrarSeccionCC('clientes')
    chk('Clientes: se ve el marco y se esconde lo de proveedores', el(S, 'cc-seccion-clientes').hidden === false && el(S, 'cc-seccion-proveedores').hidden === true)
    chk('Clientes: el marco abre Administración → Clientes embebida',
      el(S, 'cc-clientes-marco').getAttribute('src') === 'administracion.html?seccion=clientes&embebido=cc', el(S, 'cc-clientes-marco').getAttribute('src'))
    chk('Clientes: la pestaña elegida se marca (aria-pressed)', S.__secciones[1].getAttribute('aria-pressed') === 'true' && S.__secciones[0].getAttribute('aria-pressed') === 'false')
    chk('Clientes: la dirección dice ?pestana=clientes', S.__historial.at(-1) === '/modulos/cuentas-corrientes.html?pestana=clientes')
    S.mostrarSeccionCC('proveedores')
    chk('volver a Proveedores: la dirección queda limpia', S.__historial.at(-1) === '/modulos/cuentas-corrientes.html' && el(S, 'cc-seccion-proveedores').hidden === false)
    const T = sandbox()
    T.estado.miRolApp = 'super_admin'
    T.renderizarPrimerNivel()
    chk('un super_admin ve las pestañas (bypass)', el(T, 'cc-primer').hidden === false)
  }
  chk('?pestana=clientes abre la pestaña al entrar', /if \(params\.get\('pestana'\) === 'clientes'\) mostrarSeccionCC\('clientes'\)/.test(FUENTE))
  chk('?pago= solo con un id que parece uuid', /if \(pagoURL && \/\^\[0-9a-f-\]\{36\}\$\/i\.test\(pagoURL\)\) await abrirPagoDesdeLink\(pagoURL\)/.test(FUENTE))

  // ══ 2. LOS TRES MEDIOS ═════════════════════════════════════════════════════
  const medios = [...FUENTE.matchAll(/<div class="grilla-medio-pago" id="grilla-medio-pago-cc">([\s\S]*?)<\/div>/g)][0]?.[1] ?? ''
  // 20/10/2026: la grilla es efectivo, transferencia y QR; los cheques de la
  // cartera tienen su propio botón (abre la lista).
  chk('tres medios en la grilla: efectivo, transferencia y QR (y nada más)',
    JSON.stringify([...medios.matchAll(/data-valor="([^"]+)"/g)].map(m => m[1])) === '["efectivo","transferencia","qr"]',
    JSON.stringify([...medios.matchAll(/data-valor="([^"]+)"/g)].map(m => m[1])))
  // 11/10/2026: la empresa NO emite cheques propios. Que no vuelva nada de eso.
  chk('sin cheque propio: no vuelve el medio "propio"', !/data-valor="propio"/.test(FUENTE))
  chk('sin cheque propio: no vuelve la llamada a pagar_proveedor_con_cheque_propio',
    !/rpc\(\s*['"]pagar_proveedor_con_cheque_propio['"]/.test(FUENTE))
  chk('sin cheque propio: no vuelve su formulario (cuenta de banco, número, fechas, débito)',
    !/id="(grupo-propio-pago|campo-cuenta-propio|campo-numero-propio|campo-emision-propio|campo-fechapago-propio|aviso-debito-propio|tipo-propio)"/.test(FUENTE) &&
    !/data-tipo-propio/.test(FUENTE))
  chk('sin cheque propio: no vuelve su lógica',
    !/function (validarChequePropio|cargarCuentasPropio|textoDebitoPropio|parametrosPagoPropio|elegirTipoPropio|pintarAvisoDebito)\b/.test(FUENTE))
  chk('MEDIOS_CHEQUE es solo la cartera', /const MEDIOS_CHEQUE = \['cartera'\]/.test(FUENTE))
  chk('la grilla en tres columnas (en otra moneda, sin QR, dos) y la cartera a todo el ancho',
    /#grilla-medio-pago-cc \{ grid-template-columns: repeat\(3, 1fr\); \}/.test(FUENTE) &&
    /#grilla-medio-pago-cc\.grilla-medio-pago--dos \{ grid-template-columns: repeat\(2, 1fr\); \}/.test(FUENTE) &&
    /\.btn-cartera-pago \{ display: block; width: 100%;/.test(FUENTE))
  chk('"Cheque" suelto ya no se ofrece (iba por registrar_pago_proveedor y no movía nada)', !/data-valor="cheque"/.test(FUENTE))
  chk('"Cheques de la cartera" nace escondido', /data-valor="cartera" id="btn-medio-cartera" aria-pressed="false" hidden>/.test(FUENTE))
  {
    const S = sandbox()
    chk('la cartera pide cobranzas:procesar', S.puedeUsarCartera() === false)
    S.estado.misTareas.add('cobranzas:procesar')
    chk('con cobranzas:procesar, sí', S.puedeUsarCartera() === true)
  }
  chk('el botón de la cartera sigue al permiso (y solo en pesos)', /document\.getElementById\('btn-medio-cartera'\)\.hidden = !\(puedeUsarCartera\(\) && enPesos\)/.test(FUENTE))

  // ══ 3. LOS CHEQUES DE LA CARTERA ═══════════════════════════════════════════
  {
    const S = sandbox()
    const bancos = new Map([['007', 'GALICIA']])
    // Desde el 15/10/2026 se ofrecen los de TODAS las empresas (c4 es de
    // Dolce): las reglas de cartera, asentada y pesos siguen. Lo de la lista
    // agrupada por empresa está en test-cuentas-corrientes-pago-mixto.js.
    const todos = S.chequesParaPagar(CHEQUES, COBRANZAS, 'u-n', bancos)
    chk('solo los en cartera, asentados y en pesos, de cualquier empresa', JSON.stringify(todos.map(c => c.id)) === '["c2","c4","c1"]', JSON.stringify(todos.map(c => c.id)))
    chk('el de otra empresa va marcado; los propios no', todos.find(c => c.id === 'c4').otraEmpresa === true && todos.filter(c => c.id !== 'c4').every(c => c.otraEmpresa === false))
    const lista = todos.filter(c => !c.otraEmpresa)
    chk('el que se cobra primero va arriba (un común cobra en su emisión)', lista[0].id === 'c2' && lista[0].cobra === '2026-10-01' && lista[0].comun === true)
    chk('el diferido cobra en su fecha de pago', lista[1].cobra === '2026-11-10' && lista[1].comun === false)
    chk('el banco por su nombre; sin catálogo, por su código', lista[1].banco === 'GALICIA' && lista[0].banco === 'Banco 999')
    chk('el librador son los titulares; sin titulares, el cliente', lista[1].librador === 'PEREZ JUAN y GOMEZ ANA' && lista[0].librador === 'JyM')
    chk('nada viene tildado', lista.every(c => c.tildado === false))
    chk('sin cobranza conocida, no se ofrece', S.chequesParaPagar(CHEQUES, new Map(), 'u-n', bancos).length === 0)

    chk('la suma va en centavos (0,1 + 0,2 = 0,3)', S.sumaCheques([{ importe: 0.1, tildado: true }, { importe: 0.2, tildado: true }, { importe: 5, tildado: false }]) === 0.3)

    S.__setVar('medioPagoSeleccionado', 'cartera')
    S.__setVar('carteraPago', lista)
    S.renderizarCarteraPago()
    const h = el(S, 'lista-cartera-pago').innerHTML
    chk('la lista dice número, cuándo se cobra, banco, librador e importe',
      h.includes('N° 00000111 · a la vista · 01/10/2026') && h.includes('N° 00000222 · paga 10/11/2026') && h.includes('GALICIA · PEREZ JUAN y GOMEZ ANA') && h.includes('$ 100.000,10'), h)
    chk('una casilla por cheque', (h.match(/data-cheque-cartera="/g) || []).length === 2)
    S.estado.pagoCheques = true
    chk('sin tildar, no hay total', el(S, 'total-cartera-pago').hidden === true)
    S.tildarChequeCartera(0, true)
    S.tildarChequeCartera(1, true)
    chk('los cheques NO escriben el monto (el monto es el de efectivo / transferencia / QR)', S.__puesto.length === 0, JSON.stringify(S.__puesto))
    chk('el total se ve con la cantidad', el(S, 'total-cartera-pago').hidden === false && el(S, 'total-cartera-pago').textContent === '2 cheques tildados · total $ 150.000,30', el(S, 'total-cartera-pago').textContent)
    chk('la barra cuenta los cheques tildados como valores', /Valores <strong>\$ 150\.000,30<\/strong>/.test(el(S, 'resumen-aplicacion').innerHTML), el(S, 'resumen-aplicacion').innerHTML)
    S.tildarChequeCartera(0, false)
    chk('destildar resta', el(S, 'total-cartera-pago').textContent === '1 cheque tildado · total $ 100.000,10' && /Valores <strong>\$ 100\.000,10<\/strong>/.test(el(S, 'resumen-aplicacion').innerHTML))
    S.__setVar('carteraPago', [])
    S.renderizarCarteraPago()
    chk('sin cheques en cartera, se dice', /No hay cheques en cartera de ninguna empresa/.test(el(S, 'lista-cartera-pago').innerHTML))

    // Lo que viene de la base, escapado.
    S.__setVar('carteraPago', [{ id: 'x', numero: marca('num'), banco: marca('banco'), librador: marca('lib'), cobra: HOY, comun: false, importe: 1, tildado: false,
      unidadId: 'u-dolce', unidadNombre: marca('emp'), otraEmpresa: true }])
    S.renderizarCarteraPago()
    chequearMarcas(chk, 'lista de la cartera', el(S, 'lista-cartera-pago').innerHTML, ['num', 'banco', 'lib', 'emp'])
  }

  // Confirmar con cheques de la cartera: desde el 20/10/2026 va por
  // pagar_proveedor_mixto (UNA llamada, atómica, con su orden de pago).
  {
    const S = sandbox()
    S.estado.pagoCheques = true
    S.__setVar('carteraPago', S.chequesParaPagar(CHEQUES, COBRANZAS, 'u-n', new Map()).map(c => ({ ...c, tildado: true })))
    S.__setVar('facturasParaPago', [{ id: 'f1', numero: 'A-1', saldo: 100000, checked: true, monto: 100000 }, { id: 'f2', numero: 'A-2', saldo: 5, checked: false, monto: 5 }])
    await confirmar(S, { medio: null, monto: null })
    const ll = S.__rpc
    chk('cartera: llama a pagar_proveedor_mixto, y a nada más', ll.length === 1 && ll[0].nombre === 'pagar_proveedor_mixto', JSON.stringify(ll.map(x => x.nombre)))
    const p = ll[0]?.params ?? {}
    chk('cartera: los ids de los tildados (también el de otra empresa)', JSON.stringify(p.p_cheque_ids) === '["c2","c4","c1"]', JSON.stringify(p.p_cheque_ids))
    chk('cartera: proveedor, empresa, fecha y aplicaciones', p.p_proveedor_id === 'p1' && p.p_unidad_negocio_id === 'u-n' && p.p_fecha === HOY &&
      JSON.stringify(p.p_aplicaciones) === '[{"factura_pendiente_id":"f1","monto_aplicado":100000}]', JSON.stringify(p))
    chk('cartera sola: NO MUEVE CAJA — sin resto, sin medio y sin cuenta', p.p_monto_resto === 0 && p.p_medio_resto === null && p.p_cuenta_resto === null, JSON.stringify(p))
    chk('cartera: el aviso de éxito', S.__exitos.at(-1) === '¡Pago registrado!', S.__exitos.at(-1))
    chk('cartera: el modal no lee ni escribe la caja', !S.__consultas.includes('caja_movimientos') && !S.__consultas.includes('cuentas_caja'))
  }
  {
    const S = sandbox()
    S.estado.pagoCheques = true
    S.__setVar('carteraPago', S.chequesParaPagar(CHEQUES, COBRANZAS, 'u-n', new Map()))
    const error = () => el(S, 'error-confirmar-pago').textContent
    await confirmar(S, { medio: null, monto: null })
    chk('cartera sin tildar: no llama y lo dice pegado al botón', S.__rpc.length === 0 && error() === 'Elegí con qué se paga: cheques de la cartera, efectivo, transferencia o QR.', error())
    S.__getVar('carteraPago')[0].tildado = true
    await confirmar(S, { medio: null, monto: null, fecha: '2026-10-06' })
    chk('cartera con fecha futura: no llama y avisa', S.__rpc.length === 0 && error() === 'La fecha del pago no puede ser futura.', error())
    await confirmar(S, { medio: null, monto: null, moneda: 'USD' })
    chk('cartera en dólares: no llama y avisa', S.__rpc.length === 0 && error() === 'Los cheques son solo en pesos: elegí ARS.', error())
    S.__rpcFalla({ message: 'El cheque N° 00000111 no está en cartera (está endosado).' })
    await confirmar(S, { medio: null, monto: null })
    chk('cartera: viajan solo los tildados', JSON.stringify(S.__rpc.at(-1)?.params?.p_cheque_ids) === JSON.stringify([S.__getVar('carteraPago')[0].id]), JSON.stringify(S.__rpc.at(-1)?.params?.p_cheque_ids))
    chk('cartera: el error de la base, tal cual (pegado y en el aviso)', error() === 'El cheque N° 00000111 no está en cartera (está endosado).' &&
      S.__errores.at(-1) === 'El cheque N° 00000111 no está en cartera (está endosado).', S.__errores.at(-1))
  }

  // ══ 4. LOS PARÁMETROS DE LA BASE ═══════════════════════════════════════════
  // (El cheque / e-cheque propio se sacó el 11/10/2026: ver la sección 2.)
  {
    const S = sandbox()
    const c = S.parametrosPagoMixto({ proveedorId: 'p', unidadId: 'u', chequeIds: ['a'], fecha: 'f', t: { cResto: 0 }, facturas: [] })
    chk('los parámetros son los de pagar_proveedor_mixto (verificada el 20/10/2026)',
      JSON.stringify(Object.keys(c).sort()) === JSON.stringify(['p_aplicaciones', 'p_cheque_ids', 'p_cuenta_resto', 'p_fecha', 'p_medio_resto', 'p_monto_resto', 'p_observaciones', 'p_proveedor_id', 'p_unidad_negocio_id']))
  }

  // Los cheques y el QR son solo en pesos.
  {
    const S = sandbox()
    S.estado.misTareas.add('cobranzas:procesar')
    const doc = S.__getVar('document')
    const sel = doc.getElementById('campo-moneda-pago')
    sel.value = 'USD'
    S.__setVar('medioPagoSeleccionado', 'qr')
    S.estado.pagoCheques = true
    S.pintarMedioPorMoneda()
    chk('en otra moneda se avisa, sin QR ni cartera', el(S, 'aviso-medio-pesos').hidden === false && /los cheques de la cartera y el QR son solo en pesos/.test(el(S, 'aviso-medio-pesos').textContent) &&
      el(S, 'btn-medio-qr').hidden === true && el(S, 'btn-medio-cartera').hidden === true && S.__getVar('medioPagoSeleccionado') === null && S.estado.pagoCheques === false)
    sel.value = 'ARS'
    S.pintarMedioPorMoneda()
    chk('en pesos, no', el(S, 'aviso-medio-pesos').hidden === true && el(S, 'btn-medio-qr').hidden === false && el(S, 'btn-medio-cartera').hidden === false)
  }

  // Efectivo, transferencia y QR.
  {
    const S = sandbox()
    await confirmar(S, { medio: 'transferencia', monto: 10, campos: { 'campo-cuenta-pago-cc': 'cta-1' } })
    chk('transferencia en pesos: por pagar_proveedor_mixto, con su cuenta',
      S.__rpc.length === 1 && S.__rpc[0].nombre === 'pagar_proveedor_mixto' && S.__rpc[0].params.p_cuenta_resto === 'cta-1' &&
      S.__rpc[0].params.p_medio_resto === 'transferencia' && S.__rpc[0].params.p_monto_resto === 10 && JSON.stringify(S.__rpc[0].params.p_cheque_ids) === '[]', JSON.stringify(S.__rpc))
    const T = sandbox()
    await confirmar(T, { medio: 'transferencia', moneda: 'USD', monto: 10, campos: { 'campo-cuenta-pago-cc': 'cta-usd' } })
    chk('en dólares sigue el pago simple (registrar_pago_proveedor), sin orden',
      T.__rpc.length === 1 && T.__rpc[0].nombre === 'registrar_pago_proveedor' && T.__rpc[0].params.p_cuenta_id === 'cta-usd' &&
      T.__rpc[0].params.p_medio_pago === 'transferencia' && T.__rpc[0].params.p_moneda === 'USD' && T.__rpc[0].params.p_monto === 10, JSON.stringify(T.__rpc))
  }

  // ══ 5. LA ETIQUETA DEL PAGO EN LA CUENTA ═══════════════════════════════════
  {
    const S = sandbox()
    chk('etiqueta: cheques de la cartera', S.etiquetaPagoDeGasto({ medio_pago: 'cheque', descripcion: 'Pago con cheques de terceros (N° 00000111, N° 00000222) — DIMAFLO' }) === 'Cheques de la cartera N° 00000111, N° 00000222')
    // 11/10/2026: el "Cheque propio N° X" se sacó (nunca se registró ninguno).
    chk('etiqueta: ya no hay "Cheque propio"', S.etiquetaPagoDeGasto({ medio_pago: 'cheque', descripcion: 'Pago con cheque propio N° 9 (Macro, se debita el 15/11/2026) — X' }) === null)
    chk('etiqueta: el endoso sigue igual', S.etiquetaPagoDeGasto({ medio_pago: 'cheque', descripcion: 'Cheque endosado 072-43300023 — X' }) === 'Cheque endosado 072-43300023')
    chk('etiqueta: otro texto, nada', S.etiquetaPagoDeGasto({ medio_pago: 'cheque', descripcion: 'Pago a cuenta corriente' }) === null && S.etiquetaPagoDeGasto({ medio_pago: 'efectivo', descripcion: 'Pago con cheque propio N° 9' }) === null)
  }

  // ══ 6. ADMINISTRACIÓN EMBEBIDA ═════════════════════════════════════════════
  const head = FUENTE_ADMIN.slice(0, FUENTE_ADMIN.indexOf('</head>'))
  const iScript = head.indexOf("document.documentElement.dataset.embebido = 'cc'")
  chk('admin: el <head> marca <html data-embebido> con ?embebido=cc', iScript > 0 && /if \(\/\[\?&\]embebido=cc\(&\|\$\)\/\.test\(location\.search\)\)/.test(head))
  chk('admin: la marca va ANTES de las barras (y apaga la lateral)', iScript < head.indexOf('../js/barra-lateral.js') && iScript < head.indexOf('../js/barra-unidad.js') && /window\.__sinBarraLateral = true/.test(head))
  chk('admin: embebida esconde el encabezado y el "‹ Portada" de Clientes', /html\[data-embebido\] \.ad-header,\s*html\[data-embebido\] #ad-clientes-volver \{ display: none !important; \}/.test(FUENTE_ADMIN))
  chk('admin: embebida no hay portada: se vuelve a Clientes', /if \(EMBEBIDA\) \{\s*if \(!volviendoAClientes && seccionesVisibles\(\)\.some\(s => s\.id === 'clientes'\)\) \{/.test(FUENTE_ADMIN))
  chk('admin: embebida sin permiso de Clientes lo dice (sin bucle)', /volviendoAClientes = true\s*const yendo = mostrarClientes\(\)\s*volviendoAClientes = false/.test(FUENTE_ADMIN) && /'No tenés permiso para ver los clientes de esta empresa\.'/.test(FUENTE_ADMIN))
  chk('admin: embebida no se va al dashboard (lo cargaría adentro)', /if \(!EMBEBIDA\) setTimeout\(\(\) => \{ window\.location\.href = '\.\.\/dashboard\.html' \}, 2500\)/.test(FUENTE_ADMIN))
}

esperas.push(main())
fin()
