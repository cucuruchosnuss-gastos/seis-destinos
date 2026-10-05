// CUENTAS CORRIENTES: CLIENTES Y LOS CHEQUES EN UN PAGO (05/10/2026).
//
// Pedido de Facu (tarea A, rama ci-prueba/cc-proveedores-clientes-cheques):
//  1. DOS PESTAÑAS de primer nivel: Proveedores (lo de siempre) y Clientes,
//     que es la MISMA pantalla de Administración → Clientes abierta adentro
//     (administracion.html?seccion=clientes&embebido=cc), sin copiar código.
//     Se ve con retiros:ver.
//  2. "Registrar pago" con CUATRO medios: efectivo y transferencia como
//     siempre; "Cheques de la cartera" (pagar_proveedor_con_cheques_cartera:
//     el monto es la suma de los tildados y NO mueve caja) y "Cheque /
//     e-cheque propio" (pagar_proveedor_con_cheque_propio: el banco se debita
//     el DÍA DE PAGO, nunca antes). "Cheque" ya no va por
//     registrar_pago_proveedor (ahí no movía ni la caja ni la cartera).
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
  var __tipos = [nuevoEl('t-ch'), nuevoEl('t-ech')]
  __tipos[0].dataset.tipoPropio = 'cheque'
  __tipos[1].dataset.tipoPropio = 'echeque'
  var document = {
    getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) },
    querySelectorAll(sel) { return sel === '[data-cc-seccion]' ? __secciones : sel === '[data-tipo-propio]' ? __tipos : [] },
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
  var medioPagoSeleccionado = null, carteraPago = [], tipoPropio = 'cheque', facturasParaPago = [], bancosBcra = null, turnoCartera = 0, cuentasPropio = []
  var estado = { miRolApp: 'usuario', miEmpleadoId: 'yo', misTareas: new Set(['cuentas_corrientes:registrar_pago']),
    ficha: { proveedorId: 'p1', unidadId: 'u-n', nombre: 'DIMAFLO S.A.' } }
`

const FUNCIONES = [
  'esc', 'formatearImporte', 'importeHtml', 'tieneTarea',
  'puedeVerClientes', 'renderizarPrimerNivel', 'mostrarSeccionCC', 'abrirMarcoClientes',
  'esMedioCheque', 'puedeUsarCartera', 'fechaCobroCheque', 'libradorDe', 'sumaCheques', 'sumarDiasIso', 'esFechaIsoCC',
  'chequesParaPagar', 'htmlFilaCartera', 'renderizarCarteraPago', 'pintarTotalCartera', 'tildarChequeCartera',
  'cuentasDeBancoDeLaEmpresa', 'elegirTipoPropio', 'textoDebitoPropio', 'pintarAvisoDebito', 'validarChequePropio',
  'parametrosPagoCartera', 'parametrosPagoPropio', 'asegurarMonedaPesos', 'pintarAvisoPesos', 'confirmarPago',
  'etiquetaPagoDeGasto',
]
const CONSTANTES = ['MEDIOS_CHEQUE', 'URL_CLIENTES']

function sandbox() {
  return construirCon(ARCHIVO, {
    preludio: PRELUDIO, funciones: FUNCIONES, constantes: CONSTANTES,
    retorno: `estado, __els, __historial, __rpc, __errores, __exitos, __consultas, __puesto, __secciones, __tipos,
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

  // ══ 2. LOS CUATRO MEDIOS ═══════════════════════════════════════════════════
  chk('cuatro medios: efectivo, transferencia, cartera y propio',
    ['efectivo', 'transferencia', 'cartera', 'propio'].every(v => FUENTE.includes(`data-valor="${v}"`)))
  chk('"Cheque" suelto ya no se ofrece (iba por registrar_pago_proveedor y no movía nada)', !/data-valor="cheque"/.test(FUENTE))
  chk('"Cheques de la cartera" nace escondido', /data-valor="cartera" id="btn-medio-cartera" hidden>/.test(FUENTE))
  {
    const S = sandbox()
    chk('la cartera pide cobranzas:procesar', S.puedeUsarCartera() === false)
    S.estado.misTareas.add('cobranzas:procesar')
    chk('con cobranzas:procesar, sí', S.puedeUsarCartera() === true)
  }
  chk('al abrir el modal, el botón de la cartera sigue al permiso', /document\.getElementById\('btn-medio-cartera'\)\.hidden = !puedeUsarCartera\(\)/.test(FUENTE))

  // ══ 3. LOS CHEQUES DE LA CARTERA ═══════════════════════════════════════════
  {
    const S = sandbox()
    const bancos = new Map([['007', 'GALICIA']])
    const lista = S.chequesParaPagar(CHEQUES, COBRANZAS, 'u-n', bancos)
    chk('solo los en cartera, asentados, de ESTA empresa y en pesos', JSON.stringify(lista.map(c => c.id)) === '["c2","c1"]', JSON.stringify(lista.map(c => c.id)))
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
    chk('sin tildar, no hay total ni monto', el(S, 'total-cartera-pago').hidden === true && S.__puesto.at(-1) === null)
    S.tildarChequeCartera(0, true)
    S.tildarChequeCartera(1, true)
    chk('el monto del pago es la SUMA de los tildados', S.__puesto.at(-1) === 150000.3, S.__puesto.at(-1))
    chk('el total se ve con la cantidad', el(S, 'total-cartera-pago').hidden === false && el(S, 'total-cartera-pago').textContent === '2 cheques tildados · total $ 150.000,30', el(S, 'total-cartera-pago').textContent)
    chk('cambiar lo tildado recalcula la sugerencia de facturas', S.__sugerencias() >= 2)
    S.tildarChequeCartera(0, false)
    chk('destildar resta', S.__puesto.at(-1) === 100000.1 && el(S, 'total-cartera-pago').textContent === '1 cheque tildado · total $ 100.000,10')
    S.__setVar('carteraPago', [])
    S.renderizarCarteraPago()
    chk('sin cheques en cartera, se dice', /No hay cheques en cartera de esta empresa/.test(el(S, 'lista-cartera-pago').innerHTML))

    // Lo que viene de la base, escapado.
    S.__setVar('carteraPago', [{ id: 'x', numero: marca('num'), banco: marca('banco'), librador: marca('lib'), cobra: HOY, comun: false, importe: 1, tildado: false }])
    S.renderizarCarteraPago()
    chequearMarcas(chk, 'lista de la cartera', el(S, 'lista-cartera-pago').innerHTML, ['num', 'banco', 'lib'])
  }

  // Confirmar con cheques de la cartera.
  {
    const S = sandbox()
    S.__setVar('carteraPago', S.chequesParaPagar(CHEQUES, COBRANZAS, 'u-n', new Map()).map(c => ({ ...c, tildado: true })))
    S.__setVar('facturasParaPago', [{ id: 'f1', checked: true, monto: 100000 }, { id: 'f2', checked: false, monto: 5 }])
    await confirmar(S, { medio: 'cartera', monto: 150000.3 })
    const ll = S.__rpc
    chk('cartera: llama a pagar_proveedor_con_cheques_cartera, y a nada más', ll.length === 1 && ll[0].nombre === 'pagar_proveedor_con_cheques_cartera', JSON.stringify(ll.map(x => x.nombre)))
    const p = ll[0]?.params ?? {}
    chk('cartera: los ids de los tildados', JSON.stringify(p.p_cheque_ids) === '["c2","c1"]', JSON.stringify(p.p_cheque_ids))
    chk('cartera: proveedor, empresa, fecha y aplicaciones', p.p_proveedor_id === 'p1' && p.p_unidad_negocio_id === 'u-n' && p.p_fecha === HOY &&
      JSON.stringify(p.p_aplicaciones) === '[{"factura_pendiente_id":"f1","monto_aplicado":100000}]', JSON.stringify(p))
    chk('cartera: NO MUEVE CAJA — no viaja ninguna cuenta ni medio de pago', !('p_cuenta_id' in p) && !('p_medio_pago' in p) && !('p_monto' in p), Object.keys(p).join(','))
    chk('cartera: el aviso de éxito dice a quién quedaron endosados', S.__exitos.at(-1) === '¡Pago registrado! Los cheques quedaron endosados a DIMAFLO S.A.', S.__exitos.at(-1))
    chk('cartera: el modal no lee ni escribe la caja', !S.__consultas.includes('caja_movimientos') && !S.__consultas.includes('cuentas_caja'))
  }
  {
    const S = sandbox()
    S.__setVar('carteraPago', S.chequesParaPagar(CHEQUES, COBRANZAS, 'u-n', new Map()))
    await confirmar(S, { medio: 'cartera', monto: 5 })
    chk('cartera sin tildar: no llama y avisa', S.__rpc.length === 0 && S.__errores.includes('Tildá al menos un cheque de la cartera.'), JSON.stringify(S.__errores))
    S.__getVar('carteraPago')[0].tildado = true
    await confirmar(S, { medio: 'cartera', monto: 5, fecha: '2026-10-06' })
    chk('cartera con fecha futura: no llama y avisa', S.__rpc.length === 0 && S.__errores.includes('La fecha del pago no puede ser futura.'))
    await confirmar(S, { medio: 'cartera', monto: 5, moneda: 'USD' })
    chk('cartera en dólares: no llama y avisa', S.__rpc.length === 0 && S.__errores.includes('Los cheques son solo en pesos: elegí ARS.'))
    S.__rpcFalla({ message: 'El cheque N° 00000111 no está en cartera (está endosado).' })
    await confirmar(S, { medio: 'cartera', monto: 5 })
    chk('cartera: el error de la base, tal cual', S.__errores.at(-1) === 'Error al registrar el pago: El cheque N° 00000111 no está en cartera (está endosado).', S.__errores.at(-1))
  }

  // ══ 4. EL CHEQUE / E-CHEQUE PROPIO ═════════════════════════════════════════
  {
    const S = sandbox()
    chk('debito: un cheque con fecha de pago futura se debita ESE día, no antes',
      S.textoDebitoPropio('2026-11-15', HOY) === 'El banco se debita el 15/11.')
    chk('debito: con la fecha de pago hoy o pasada, se debita al registrar',
      S.textoDebitoPropio(HOY, HOY) === 'La fecha de pago ya llegó: el banco se debita el 05/10, al registrar el pago.' &&
      S.textoDebitoPropio('2026-10-01', HOY).startsWith('La fecha de pago ya llegó'))
    chk('debito: sin fecha, nada', S.textoDebitoPropio('', HOY) === null)
    const doc = S.__getVar('document')
    doc.getElementById('campo-emision-propio').value = '2026-10-01'
    doc.getElementById('campo-fechapago-propio').value = '2026-11-15'
    S.pintarAvisoDebito()
    chk('el aviso del formulario sale de la FECHA DE PAGO, no de la emisión',
      el(S, 'aviso-debito-propio').hidden === false && el(S, 'aviso-debito-propio').textContent === 'El banco se debita el 15/11.', el(S, 'aviso-debito-propio').textContent)
    doc.getElementById('campo-fechapago-propio').value = ''
    S.pintarAvisoDebito()
    chk('sin fecha de pago, el aviso no se ve', el(S, 'aviso-debito-propio').hidden === true)

    const bien = { cuentaId: 'cta', numero: ' 123 ', emision: HOY, pago: '2026-12-01', importe: 500 }
    chk('validar: con todo, nada que decir', S.validarChequePropio(bien, HOY) === null)
    const casos = [
      [{ cuentaId: null }, 'Elegí la cuenta de banco de donde sale el cheque.'],
      [{ numero: '  ' }, 'Falta el número del cheque.'],
      [{ pago: '' }, 'Faltan las fechas del cheque.'],
      [{ emision: '2026-10-06', pago: '2026-10-07' }, 'La fecha de emisión no puede ser futura.'],
      [{ pago: '2026-10-04' }, 'La fecha de pago tiene que estar entre la emisión y 360 días después.'],
      [{ pago: '2027-09-31' }, 'La fecha de pago tiene que estar entre la emisión y 360 días después.'],
      [{ importe: 0 }, 'El importe tiene que ser mayor a cero.'],
    ]
    for (const [cambio, texto] of casos) chk(`validar: ${texto}`, S.validarChequePropio({ ...bien, ...cambio }, HOY) === texto, S.validarChequePropio({ ...bien, ...cambio }, HOY))
    chk('validar: justo 360 días después, vale', S.validarChequePropio({ ...bien, pago: S.sumarDiasIso(HOY, 360) }, HOY) === null && S.sumarDiasIso(HOY, 360) === '2027-09-30')

    S.estado.misTareas = new Set(['cuentas_corrientes:registrar_pago'])
    S.__setVar('tipoPropio', 'echeque')
    S.__setVar('facturasParaPago', [{ id: 'f1', checked: true, monto: 500 }])
    await confirmar(S, { medio: 'propio', monto: 500, fecha: '2026-01-01', campos: {
      'campo-cuenta-propio': 'cta-macro', 'campo-numero-propio': ' 00012345 ', 'campo-emision-propio': '2026-10-01', 'campo-fechapago-propio': '2026-11-15' } })
    const ll = S.__rpc
    chk('propio: llama a pagar_proveedor_con_cheque_propio, y a nada más', ll.length === 1 && ll[0].nombre === 'pagar_proveedor_con_cheque_propio', JSON.stringify(ll.map(x => x.nombre)))
    const p = ll[0]?.params ?? {}
    chk('propio: la cuenta, el tipo y el número (sin espacios)', p.p_cuenta_id === 'cta-macro' && p.p_tipo === 'echeque' && p.p_numero === '00012345', JSON.stringify(p))
    chk('propio: la EMISIÓN y el PAGO, cada una en su lugar (el banco se debita el día de pago)',
      p.p_fecha_emision === '2026-10-01' && p.p_fecha_pago === '2026-11-15', JSON.stringify(p))
    chk('propio: el importe y las aplicaciones', p.p_importe === 500 && JSON.stringify(p.p_aplicaciones) === '[{"factura_pendiente_id":"f1","monto_aplicado":500}]')
    chk('propio: no viaja la fecha general del modal', !Object.values(p).includes('2026-01-01'))
    chk('propio: el aviso de éxito dice cuándo se debita', S.__exitos.at(-1) === '¡Pago registrado! El banco se debita el 15/11.', S.__exitos.at(-1))
    chk('propio: no toca la caja desde la pantalla', !S.__consultas.includes('caja_movimientos'))

    await confirmar(S, { medio: 'propio', monto: 500, campos: { 'campo-fechapago-propio': '2026-09-30' } })
    chk('propio con el pago antes de la emisión: no llama y avisa', S.__rpc.length === 1 && S.__errores.at(-1) === 'La fecha de pago tiene que estar entre la emisión y 360 días después.', S.__errores.at(-1))
  }
  {
    const S = sandbox()
    chk('cuentas: solo las de banco, de ESTA empresa, en pesos y activas',
      JSON.stringify(S.cuentasDeBancoDeLaEmpresa([
        { id: 'a', nombre: 'Macro Seis Destinos', medio: 'banco', moneda: 'ARS', unidad_negocio_id: 'u-n', activa: true },
        { id: 'b', nombre: 'Macro USD', medio: 'banco', moneda: 'USD', unidad_negocio_id: 'u-n', activa: true },
        { id: 'c', nombre: 'Caja', medio: 'efectivo', moneda: 'ARS', unidad_negocio_id: 'u-n', activa: true },
        { id: 'd', nombre: 'Macro Dolce', medio: 'banco', moneda: 'ARS', unidad_negocio_id: 'u-dolce', activa: true },
        { id: 'e', nombre: 'Banco Nación', medio: 'banco', moneda: 'ARS', unidad_negocio_id: 'u-n', activa: true },
        { id: 'f', nombre: 'Vieja', medio: 'banco', moneda: 'ARS', unidad_negocio_id: 'u-n', activa: false },
      ], 'u-n').map(c => c.id)) === '["e","a"]')
    S.elegirTipoPropio('echeque')
    chk('el tipo e-cheque se marca', S.__getVar('tipoPropio') === 'echeque' && S.__tipos[1].getAttribute('aria-pressed') === 'true' && S.__tipos[0].getAttribute('aria-pressed') === 'false')
    S.elegirTipoPropio('cualquier cosa')
    chk('un tipo desconocido es cheque', S.__getVar('tipoPropio') === 'cheque')
    const p = S.parametrosPagoPropio({ proveedorId: 'p', unidadId: 'u', cuentaId: 'c', tipo: 'x', numero: ' 9 ', emision: 'e', pago: 'g', importe: 1, aplicaciones: [] })
    chk('los parámetros del cheque propio son los de la función de la base',
      JSON.stringify(Object.keys(p).sort()) === JSON.stringify(['p_aplicaciones', 'p_cuenta_id', 'p_fecha_emision', 'p_fecha_pago', 'p_importe', 'p_numero', 'p_proveedor_id', 'p_tipo', 'p_unidad_negocio_id']) && p.p_tipo === 'cheque')
    const c = S.parametrosPagoCartera({ proveedorId: 'p', unidadId: 'u', chequeIds: ['a'], fecha: 'f', aplicaciones: [] })
    chk('los parámetros de la cartera son los de la función de la base',
      JSON.stringify(Object.keys(c).sort()) === JSON.stringify(['p_aplicaciones', 'p_cheque_ids', 'p_fecha', 'p_proveedor_id', 'p_unidad_negocio_id']))
  }

  // Los cheques son solo en pesos.
  {
    const S = sandbox()
    const doc = S.__getVar('document')
    const sel = doc.getElementById('campo-moneda-pago')
    sel.options = [{ value: 'USD' }]
    sel.value = 'USD'
    S.__setVar('medioPagoSeleccionado', 'propio')
    S.asegurarMonedaPesos()
    chk('al elegir un cheque, la moneda pasa a ARS (y se agrega si no estaba)', sel.value === 'ARS' && sel.options.some(o => o.value === 'ARS'))
    sel.value = 'USD'
    S.pintarAvisoPesos()
    chk('con otra moneda y un cheque, se avisa', el(S, 'aviso-medio-pesos').hidden === false && el(S, 'aviso-medio-pesos').textContent === 'Los cheques son solo en pesos: elegí ARS.')
    S.__setVar('medioPagoSeleccionado', 'efectivo')
    S.pintarAvisoPesos()
    chk('en efectivo, no', el(S, 'aviso-medio-pesos').hidden === true)
  }

  // Efectivo y transferencia, como siempre.
  {
    const S = sandbox()
    await confirmar(S, { medio: 'transferencia', monto: 10, campos: { 'campo-cuenta-pago-cc': 'cta-1' } })
    chk('transferencia: sigue por registrar_pago_proveedor con su cuenta',
      S.__rpc.length === 1 && S.__rpc[0].nombre === 'registrar_pago_proveedor' && S.__rpc[0].params.p_cuenta_id === 'cta-1' && S.__rpc[0].params.p_medio_pago === 'transferencia')
  }

  // ══ 5. LA ETIQUETA DEL PAGO EN LA CUENTA ═══════════════════════════════════
  {
    const S = sandbox()
    chk('etiqueta: cheques de la cartera', S.etiquetaPagoDeGasto({ medio_pago: 'cheque', descripcion: 'Pago con cheques de terceros (N° 00000111, N° 00000222) — DIMAFLO' }) === 'Cheques de la cartera N° 00000111, N° 00000222')
    chk('etiqueta: e-cheque propio', S.etiquetaPagoDeGasto({ medio_pago: 'cheque', descripcion: 'Pago con e-cheque propio N° 55 (Macro, se debita el 15/11/2026) — DIMAFLO' }) === 'E-cheque propio N° 55')
    chk('etiqueta: cheque propio', S.etiquetaPagoDeGasto({ medio_pago: 'cheque', descripcion: 'Pago con cheque propio N° 9 (Macro, se debita el 15/11/2026) — X' }) === 'Cheque propio N° 9')
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
