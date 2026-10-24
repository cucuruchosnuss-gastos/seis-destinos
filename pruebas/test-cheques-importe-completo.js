// Cheques: IMPORTE COMPLETO (24/10/2026, Tanda B, tarea 2).
//
// La base cambió el 24/10/2026 (leído con pg_get_functiondef ese día):
// _cheques_salida_banco (vender_cheques / depositar_cheques) y
// acreditar_cheques meten SIEMPRE el importe completo del cheque en la cuenta
// y ya NO cargan el gasto de intereses; lo que se mande como neto o
// "acreditado" se ignora. La categoría de los intereses de la venta de cheques
// se llama ahora "Gastos bancarios y comisiones" (mismo id,
// 7041825a-5a0c-484b-be07-17f9978a0d97) y ahí se cargan a mano los gastos del
// banco. Esta suite mira:
//  - la cartera (Administración): vender y acreditar sin el campo de lo
//    acreditado; el resumen "Entran $ X a <cuenta>. Los gastos o intereses del
//    banco se cargan aparte en Gastos, categoría 'Gastos bancarios y
//    comisiones'." con el botón que lleva a Gastos con la categoría elegida;
//    lo que viaja a la base;
//  - Gastos: el ícono landmark de la categoría nueva y el deep link
//    gastos.html?nuevo=1&categoria=<id o nombre>&unidad=<id> que abre el
//    wizard con la categoría (y la fábrica) ya elegidas;
//  - que el nombre viejo no quede en ninguna pantalla ni en la maqueta.
//
//   node pruebas/test-cheques-importe-completo.js
//   ARCHIVO_TEST=<administracion.html> ARCHIVO_GASTOS_TEST=<gastos.html> node pruebas/test-cheques-importe-completo.js

const fs = require('fs')
const path = require('path')
const { construirCheques } = require('./sandbox-cheques')
const { ARCHIVO_CHEQUES, leerCheques } = require('./fuente-cheques')
const { construirCon, scriptModulo } = require('./sandbox')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || ARCHIVO_CHEQUES
const FUENTE = leerCheques(ARCHIVO)
const JS = FUENTE.slice(FUENTE.lastIndexOf('<script type="module">'))
const ARCHIVO_GASTOS = process.env.ARCHIVO_GASTOS_TEST || path.join(RAIZ, 'modulos', 'gastos.html')
const GASTOS = fs.readFileSync(ARCHIVO_GASTOS, 'utf8')
console.log(`ARCHIVO ${ARCHIVO_GASTOS} (${GASTOS.length} bytes)`)

let ok = 0
const fallas = []
const esperas = []
function chk(nombre, cond, detalle) { if (cond) ok++; else fallas.push(nombre + (detalle !== undefined ? ` — ${detalle}` : '')) }
const marca = (campo) => `"><b data-xss="${campo}">`
const cruda = (campo) => `<b data-xss="${campo}">`
const escapada = (campo) => `&lt;b data-xss=&quot;${campo}&quot;&gt;`
// formatearImporte usa Intl: entre "$" y el número va un espacio duro.
const N = (s) => String(s ?? '').replace(/\s/g, ' ')

const ID_BANCARIOS = '7041825a-5a0c-484b-be07-17f9978a0d97'
const TEXTO_APARTE = "Los gastos o intereses del banco se cargan aparte en Gastos, categoría &#39;Gastos bancarios y comisiones&#39;."

// ═════════════════════════════════════════════════════════════════════════
// 1. LA CARTERA (Administración)
// ═════════════════════════════════════════════════════════════════════════

const PRELUDIO_BOTONES = `
  var __botonesTipo = [nuevoEl('tipo-dep'), nuevoEl('tipo-ven'), nuevoEl('tipo-end')]
  __botonesTipo[0].dataset.salidaTipo = 'depositado'
  __botonesTipo[1].dataset.salidaTipo = 'vendido'
  __botonesTipo[2].dataset.salidaTipo = 'endosado'
  document.querySelectorAll = (sel) => sel === '[data-salida-tipo]' ? __botonesTipo : []
`
const U_NUSS = 'u-nuss', U_DOLCE = 'u-dolce', U_PRUEBA = 'u-prueba'
const CUENTAS = [
  { id: 'k-macro', nombre: 'Macro Paz Mirta', medio: 'banco', moneda: 'ARS', activa: true, unidad_negocio_id: U_NUSS, empleado_id: 'emp' },
  { id: 'k-dolce', nombre: 'Macro Dolce', medio: 'banco', moneda: 'ARS', activa: true, unidad_negocio_id: U_DOLCE, empleado_id: 'emp' },
  { id: 'k-suelta', nombre: 'Banco sin fábrica', medio: 'banco', moneda: 'ARS', activa: true, unidad_negocio_id: null, empleado_id: 'emp' },
]

function armar() {
  const S = construirCheques(ARCHIVO, { preludioExtra: PRELUDIO_BOTONES })
  S.estado.misTareas = new Set(['cobranzas:ver_todo', 'cobranzas:procesar'])
  S.estado.fabrica = { ok: true, unidades: new Set([U_PRUEBA]), personas: new Set(), soyDePrueba: false }
  S.estado.cuentasBanco = { porId: new Map(CUENTAS.map(c => [c.id, c])), ofrecidas: CUENTAS }
  S.estado.nombresUnidades = new Map([[U_NUSS, 'Cucuruchos Nuss'], [U_DOLCE, 'Dolce Pasta']])
  S.estado.cobranzas = new Map([
    ['cn', { id: 'cn', cliente: 'Molino', estado: 'procesada', fecha: '2026-09-01', unidad_negocio_id: U_NUSS, unidad_negocio_nombre: 'Cucuruchos Nuss' }],
    ['cd', { id: 'cd', cliente: 'Kiosco', estado: 'procesada', fecha: '2026-09-10', unidad_negocio_id: U_DOLCE, unidad_negocio_nombre: 'Dolce Pasta' }],
  ])
  const base = { banco_codigo: '072', tipo: 'comun', fecha_emision: '2026-09-01', fecha_pago: null, estado: 'en_cartera' }
  S.estado.filas = [
    { ...base, id: 'n1', cobranza_id: 'cn', numero: '43300023', importe: 600000 },
    { ...base, id: 'n2', cobranza_id: 'cn', numero: '43300024', importe: 400000.5 },
  ]
  S.estado.seleccion = { activa: true, ids: new Set(), ultimo: null, noPueden: new Set() }
  return S
}

// ── La categoría y el botón ─────────────────────────────────────────────
{
  const S = armar()
  chk('la categoría de los gastos del banco: su id REAL (leído el 24/10/2026) y su nombre nuevo',
    S.CATEGORIA_GASTOS_BANCARIOS?.id === ID_BANCARIOS && S.CATEGORIA_GASTOS_BANCARIOS?.nombre === 'Gastos bancarios y comisiones')
  const h = N(S.htmlGastosBanco([{ cuenta: 'Macro Paz Mirta', centavos: 100000050 }], U_NUSS))
  chk('el texto exacto: "Entran $ X a <cuenta>. Los gastos o intereses del banco se cargan aparte…"',
    h.includes(`<span>Entran $ 1.000.000,50 a Macro Paz Mirta. ${TEXTO_APARTE}</span>`), h)
  chk('el botón lleva a Gastos con la categoría y la fábrica (y abre en la misma pestaña por defecto)',
    h.includes(`<a class="chq-btn chq-btn--chico chq-gastos-banco__ir" data-gastos-banco href="gastos.html?nuevo=1&amp;categoria=${ID_BANCARIOS}&amp;unidad=${U_NUSS}">Cargar el gasto del banco</a>`), h)
  chk('con nuevaPestana: target="_blank" rel="noopener"', /data-gastos-banco href="[^"]*" target="_blank" rel="noopener">/.test(S.htmlGastosBanco([], U_NUSS, { nuevaPestana: true })))
  const sinFab = S.htmlGastosBanco([], null)
  chk('sin fábrica: la unidad vacía (Gastos la ignora) y solo la frase de los gastos aparte',
    sinFab.includes(`&amp;unidad="`) && N(sinFab).includes(`<span>${TEXTO_APARTE}</span>`), sinFab)
  const dos = N(S.htmlGastosBanco([{ cuenta: 'A', centavos: 100 }, { cuenta: 'B', centavos: 250 }], null))
  chk('dos cuentas: un "Entran" por cuenta', dos.includes('Entran $ 1,00 a A. Entran $ 2,50 a B. Los gastos'), dos)
  const malo = S.htmlGastosBanco([{ cuenta: marca('cuenta'), centavos: 1 }], marca('fab'))
  chk('el nombre de la cuenta va escapado', !malo.includes(cruda('cuenta')) && malo.includes(escapada('cuenta')))
  chk('la fábrica viaja con encodeURIComponent (no rompe el href)', malo.includes('&amp;unidad=%22%3E%3Cb%20data-xss%3D%22fab%22%3E"'), malo)
}

// ── Vender: sin el campo de lo acreditado ────────────────────────────────
{
  const S = armar()
  const doc = S.__doc
  chk('el diálogo ya no tiene Acreditó / Descuento / Tasa', !/id="chq-venta"|id="chq-venta-neto"|id="chq-venta-descuento"|id="chq-venta-tasa"/.test(FUENTE))
  chk('… ni el cálculo atado ni sus escuchas', !/function calcularVenta|function alEscribirVenta|alEscribirVenta\(/.test(JS))
  S.estado.seleccion.ids = new Set(['n1', 'n2'])
  S.abrirModalSalidaLote('vendido')
  S.estado.salida.ya = true
  S.pintarModalSalida()
  const r = N(doc.getElementById('chq-salida-resumen').innerHTML)
  chk('vender (ya acreditado): el resumen con el total y la frase exacta', /Total de los 2 cheques/.test(r) &&
    r.includes(`Entran $ 1.000.000,50 a Macro Paz Mirta. ${TEXTO_APARTE}`), r)
  chk('… con el botón a Gastos (la fábrica de la cuenta), en otra pestaña para no perder el diálogo',
    r.includes(`href="gastos.html?nuevo=1&amp;categoria=${ID_BANCARIOS}&amp;unidad=${U_NUSS}" target="_blank" rel="noopener">Cargar el gasto del banco</a>`), r)
  chk('… sin ningún "se carga un gasto de interés"', !/se carga un gasto|de interés/.test(r))
  S.estado.salida.cuentaId = 'k-dolce'
  S.pintarBanco()
  chk('cambiar la cuenta: el resumen y el botón siguen a la cuenta nueva', N(doc.getElementById('chq-salida-resumen').innerHTML).includes('a Macro Dolce.') &&
    doc.getElementById('chq-salida-resumen').innerHTML.includes(`&amp;unidad=${U_DOLCE}"`))
  S.estado.salida.tipo = 'depositado'
  S.pintarBanco()
  chk('depositar (ya acreditado): la misma frase y el botón (el banco también cobra comisiones)',
    N(doc.getElementById('chq-salida-resumen').innerHTML).includes(`Entran $ 1.000.000,50 a Macro Dolce. ${TEXTO_APARTE}`) &&
    doc.getElementById('chq-salida-resumen').innerHTML.includes(`&amp;unidad=${U_DOLCE}" target="_blank" rel="noopener">Cargar el gasto del banco</a>`))
  S.estado.salida.ya = false
  S.pintarBanco()
  chk('mandar al banco (sin acreditar): no se mueve plata, sin la frase ni el botón',
    /La plata no se mueve todavía/.test(doc.getElementById('chq-salida-resumen').innerHTML) && !/data-gastos-banco/.test(doc.getElementById('chq-salida-resumen').innerHTML))
  S.estado.salida.ya = true
  chk('vender no pide lo acreditado (erroresSalida)', S.erroresSalida({ tipo: 'vendido', fecha: S.hoyArgentina(), cuentaId: 'k-macro', ya: true }, '2026-09-01', S.hoyArgentina()).length === 0)
  chk('parametrosBanco: vender manda p_neto = el IMPORTE COMPLETO (en pesos)',
    JSON.stringify(S.parametrosBanco(['n1', 'n2'], { tipo: 'vendido', cuentaId: 'k-macro', fecha: '2026-10-24', brutoCent: 100000050, detalle: '' })) ===
    JSON.stringify({ p_cheque_ids: ['n1', 'n2'], p_cuenta_id: 'k-macro', p_fecha: '2026-10-24', p_neto: 1000000.5, p_detalle: null }))
  chk('… depositar no manda neto', JSON.stringify(S.parametrosBanco(['n1'], { tipo: 'depositado', cuentaId: 'k', fecha: '2026-10-24', brutoCent: 5 })) === JSON.stringify({ p_cheque_ids: ['n1'], p_cuenta_id: 'k', p_fecha: '2026-10-24' }))
  chk('el aviso al terminar la venta: entró el total y los gastos del banco van aparte',
    N(S.textoResultadoBanco({ cheques: 1, bruto: 600000, neto: 600000, descuento: 0 }, 'vendido', 'Macro Paz Mirta')) === 'Se vendió 1 cheque: entraron $ 600.000,00 en Macro Paz Mirta. Los gastos del banco se cargan aparte en Gastos.')
  const llamadas = []
  esperas.push((async () => {
    S.estado.salida.tipo = 'vendido'
    S.estado.salida.cuentaId = 'k-macro'
    S.pintarModalSalida()
    S.__setRpc(async (...a) => { llamadas.push(a); return { data: { cheques: 2, bruto: 1000000.5, neto: 1000000.5, descuento: 0, caja_movimiento_id: 'm', gasto_id: null }, error: null } })
    await S.confirmarSalida()
    chk('confirmar vender: UNA llamada a vender_cheques con p_neto = el total', llamadas.length === 1 && llamadas[0][0] === 'vender_cheques' && llamadas[0][1].p_neto === 1000000.5, JSON.stringify(llamadas))
  })())
}

// ── La lista: una venta por el importe completo ──────────────────────────
{
  const S = armar()
  const nueva = { id: 'v1', estado: 'vendido', salida_fecha: '2026-10-24', salida_cuenta_id: 'k-macro', importe: 500000, venta_neto: 500000, venta_gasto_id: null }
  chk('una venta nueva (venta_neto = importe): "Vendido el 24/10 · Macro Paz Mirta", sin "acreditó"', S.textoSalidaBanco(nueva) === 'Vendido el 24/10 · Macro Paz Mirta', S.textoSalidaBanco(nueva))
  const vieja = { ...nueva, venta_neto: 480000, venta_gasto_id: 'g-1' }
  chk('una venta de antes con interés lo sigue diciendo', N(S.textoSalidaBanco(vieja)) === 'Vendido el 24/10 · Macro Paz Mirta · acreditó $ 480.000,00 ($ 20.000,00 de interés)', N(S.textoSalidaBanco(vieja)))
  chk('… y su "Ver el gasto"', /href="gastos\.html\?gasto=g-1"/.test(S.htmlLinkGastoVenta(vieja)) && S.htmlLinkGastoVenta(nueva) === '')
}

// ── Acreditar: sin el campo de lo acreditado ─────────────────────────────
function armarBanco() {
  const S = armar()
  const base = { banco_codigo: '072', tipo: 'comun', fecha_emision: '2026-09-01', fecha_pago: null, estado: 'en_banco' }
  S.estado.filas = [
    { ...base, id: 'b1', cobranza_id: 'cn', numero: '00000001', importe: 300000, salida_cuenta_id: 'k-macro', salida_modo: 'venta', envio_fecha: '2026-10-20', salida_destino: 'Macro Paz Mirta' },
    { ...base, id: 'b2', cobranza_id: 'cn', numero: '00000002', importe: 200000, salida_cuenta_id: 'k-macro', salida_modo: 'deposito', envio_fecha: '2026-10-21', salida_destino: 'Macro Paz Mirta' },
    { ...base, id: 'b3', cobranza_id: 'cd', numero: '00000003', importe: 50000.5, salida_cuenta_id: 'k-dolce', salida_modo: 'venta', envio_fecha: '2026-10-21', salida_destino: 'Macro Dolce' },
  ]
  S.estado.filtros.estado = 'en_banco'
  S.estado.seleccion = { activa: false, ids: new Set(), ultimo: null, noPueden: new Set() }
  S.bancoUI.ids = new Set()
  S.bancoUI.panel = null
  S.bancoUI.resultado = ''
  return S
}
{
  chk('el panel ya no tiene "Total acreditado" ni "tasa" ni un "Acreditó $" por cheque',
    !/id="chq-acr-reparto"|id="chq-acr-total"|id="chq-acr-tasa"|data-acr-cheque/.test(FUENTE) && !/function repartoPorTotal|function repartoPorTasa|function alRepartir/.test(JS))
  const S = armarBanco()
  const doc = S.__doc
  S.renderizarCheques()
  S.elegirEnBanco('b1', true)
  S.elegirEnBanco('b2', true)
  S.abrirAcreditar()
  const res = N(doc.getElementById('chq-acr-resumen').innerHTML)
  chk('acreditar dos de la misma cuenta: el total y la frase exacta', /Total de los 2 cheques/.test(res) && res.includes(`Entran $ 500.000,00 a Macro Paz Mirta. ${TEXTO_APARTE}`), res)
  chk('… el botón con la fábrica de la cuenta, en otra pestaña', res.includes(`&amp;unidad=${U_NUSS}" target="_blank" rel="noopener">Cargar el gasto del banco</a>`), res)
  chk('… sin campos que escribir', !/<input/.test(doc.getElementById('chq-acr-lista').innerHTML))
  S.elegirEnBanco('b3', true)
  const res2 = N(doc.getElementById('chq-acr-resumen').innerHTML)
  chk('con una cuenta de otra fábrica: un "Entran" por cuenta y el botón sin fábrica', res2.includes('Entran $ 500.000,00 a Macro Paz Mirta. Entran $ 50.000,50 a Macro Dolce. Los gastos') &&
    res2.includes('&amp;unidad="'), res2)
  chk('sin respuesta de la base, el resultado no dice nada (ni el botón)', S.htmlResultadoAcreditar(null, [], new Map(), new Map(), new Map()) === '')
  chk('parametrosAcreditar: solo cheque_id (lo "acreditado" ya no viaja)', JSON.stringify(S.parametrosAcreditar([{ id: 'b1', importe: 1 }], '2026-10-24')) === JSON.stringify({ p_items: [{ cheque_id: 'b1' }], p_fecha: '2026-10-24' }))
  const llamadas = []
  esperas.push((async () => {
    S.__setRpc(async (...a) => { llamadas.push(a); return { data: [
      { cuenta: 'Macro Paz Mirta', cheques: 2, bruto: 500000, acreditado: 500000, descuento: 0, caja_movimiento_id: 'm1', gasto_id: null },
      { cuenta: 'Macro Dolce', cheques: 1, bruto: 50000.5, acreditado: 50000.5, descuento: 0, caja_movimiento_id: 'm2', gasto_id: null },
    ], error: null } })
    await S.confirmarAcreditar()
    const p = llamadas[0]?.[1]
    chk('confirmar: acreditar_cheques con los tres cheques y nada más', llamadas.length === 1 && llamadas[0][0] === 'acreditar_cheques' &&
      p.p_items.every(x => JSON.stringify(Object.keys(x)) === '["cheque_id"]') && p.p_items.map(x => x.cheque_id).sort().join() === 'b1,b2,b3', JSON.stringify(llamadas))
    const html = N(doc.getElementById('chq-banco-resultado-texto').innerHTML)
    chk('el resultado: lo que entró en cada cuenta, sin gasto de intereses', html.includes('Entró $ 500.000,00 en Macro Paz Mirta') && html.includes('Entró $ 50.000,50 en Macro Dolce') && !/gasto de intereses|Ver el gasto/.test(html), html)
    chk('… y el botón para cargar los gastos del banco (en la misma pestaña)', html.includes(TEXTO_APARTE) && /data-gastos-banco href="gastos\.html\?nuevo=1&amp;categoria=[^"]*">Cargar el gasto del banco/.test(html), html)
  })())
}

// ═════════════════════════════════════════════════════════════════════════
// 2. GASTOS
// ═════════════════════════════════════════════════════════════════════════

const PRELUDIO_GASTOS = `
  var __els = new Map()
  var document = { getElementById(id) { if (!__els.has(id)) __els.set(id, { id, hidden: false }); return __els.get(id) } }
  var __abrio = 0, __grillas = []
  async function abrirWizard() { __abrio++ }
  function renderizarGrillaDestino() { __grillas.push('destino') }
  function renderizarGrillaCategorias() { __grillas.push('categorias:' + categoriaSeleccionada) }
  var __elegibles = [{ id: 'u-n' }, { id: 'u-t' }]
  function unidadesElegibles() { return __elegibles }
  var categoriaSeleccionada = null, unidadSeleccionada = null, viaVehiculos = true
  var estado = { maestros: { categorias: [
    { id: 'c-rep', nombre: 'Repuestos' },
    { id: '${ID_BANCARIOS}', nombre: 'Gastos bancarios y comisiones' },
  ] } }
`
function sandboxGastos() {
  return construirCon(ARCHIVO_GASTOS, {
    preludio: PRELUDIO_GASTOS,
    funciones: ['categoriaDeURL', 'abrirWizardConCategoria', 'iconoCategoriaHtml'],
    constantes: ['ICONOS_CATEGORIA'],
    retorno: `estado, ICONOS_CATEGORIA, __doc: document, __estado() { return { categoriaSeleccionada, unidadSeleccionada, viaVehiculos, abrio: __abrio, grillas: __grillas } }, __reset() { categoriaSeleccionada = null; unidadSeleccionada = null; viaVehiculos = true; __abrio = 0; __grillas = [] }`,
  })
}

// ── El ícono ─────────────────────────────────────────────────────────────
{
  const G = sandboxGastos()
  chk("Gastos: 'Gastos bancarios y comisiones' con el ícono landmark", G.ICONOS_CATEGORIA['Gastos bancarios y comisiones'] === 'landmark' &&
    G.iconoCategoriaHtml('Gastos bancarios y comisiones') === '<i data-lucide="landmark" class=""></i>')
  chk('… y el nombre viejo ya no está en el mapa', !Object.keys(G.ICONOS_CATEGORIA).some(k => /Intereses-Venta/.test(k)))
  chk('… el filtro de categorías sale de las categorías activas (la nueva entra sola)',
    /idBase: 'ms-categoria',\s*\n\s*opciones: \[\.\.\.catsEmpresa, \.\.\.catsVehiculo\]\.map\(c => \(\{ value: c\.id, label: c\.nombre \}\)\)/.test(GASTOS) &&
    /query = query\.in\('categoria_id', estado\.filtros\.categoria_ids\)/.test(GASTOS))
}

// ── El deep link ?nuevo=1&categoria=… ────────────────────────────────────
{
  const G = sandboxGastos()
  const cats = G.estado.maestros.categorias
  chk('categoriaDeURL: por id', G.categoriaDeURL(cats, ID_BANCARIOS)?.id === ID_BANCARIOS)
  chk('… por nombre, sin importar mayúsculas ni espacios en los bordes', G.categoriaDeURL(cats, '  gastos BANCARIOS y comisiones ')?.id === ID_BANCARIOS)
  chk('… una que no existe, vacía o null: null', G.categoriaDeURL(cats, 'Intereses-Venta de cheques') === null && G.categoriaDeURL(cats, '') === null && G.categoriaDeURL(cats, null) === null)
  chk('… sin categorías cargadas: null (no tira)', G.categoriaDeURL(null, ID_BANCARIOS) === null)
  esperas.push((async () => {
    await G.abrirWizardConCategoria(ID_BANCARIOS, 'u-n')
    let e = G.__estado()
    chk('abrirWizardConCategoria: abre el wizard con la categoría y la fábrica elegidas', e.abrio === 1 && e.categoriaSeleccionada === ID_BANCARIOS && e.unidadSeleccionada === 'u-n' && e.viaVehiculos === false, JSON.stringify(e))
    chk('… y repinta las grillas con lo elegido', e.grillas.join() === `destino,categorias:${ID_BANCARIOS}`, e.grillas.join())
    G.__reset()
    await G.abrirWizardConCategoria(ID_BANCARIOS, 'u-que-no-esta')
    e = G.__estado()
    chk('… una fábrica que no ofrece la grilla (o vacía) se ignora', e.categoriaSeleccionada === ID_BANCARIOS && e.unidadSeleccionada === null)
    G.__reset()
    await G.abrirWizardConCategoria('no-existe', '')
    e = G.__estado()
    chk('… una categoría que no está: el wizard como siempre (sin categoría)', e.abrio === 1 && e.categoriaSeleccionada === null)
    G.__reset()
    G.__doc.getElementById('vista-wizard').hidden = true
    await G.abrirWizardConCategoria(ID_BANCARIOS, 'u-n')
    e = G.__estado()
    chk('… si el wizard no pudo abrir (sin maestros), no toca nada', e.categoriaSeleccionada === null && e.grillas.length === 0)
  })())
  const SCRIPT = scriptModulo(ARCHIVO_GASTOS)
  chk('el arranque: ?nuevo=1 (sin ?gasto ni ?factura) abre el wizard con la categoría y la fábrica de la URL',
    /if \(paramsNuevoURL\.get\('nuevo'\) === '1' && !idGastoURL && !idFacturaURL\) \{\n\s+abrirWizardConCategoria\(paramsNuevoURL\.get\('categoria'\), paramsNuevoURL\.get\('unidad'\)\)\n\s+\.catch\(/.test(SCRIPT))
  chk('… después de leer ?gasto y ?factura (que mandan)', SCRIPT.indexOf("const paramsNuevoURL") > SCRIPT.indexOf("const idFacturaURL"))
  // Llamado antes de que el script declare lo que usa el wizard, tiraba
  // "Cannot access 'turnoFoto' before initialization" (maqueta, 24/10/2026).
  chk('… al FINAL del script (después de declarar turnoFoto y de enganchar los botones del wizard)',
    SCRIPT.indexOf('const paramsNuevoURL') > SCRIPT.indexOf('let turnoFoto') &&
    SCRIPT.indexOf('const paramsNuevoURL') > SCRIPT.indexOf("getElementById('btn-sin-foto').addEventListener") &&
    SCRIPT.indexOf('const paramsNuevoURL') > SCRIPT.indexOf("getElementById('lista-ingresos-sin-gasto').addEventListener"))
}

// ═════════════════════════════════════════════════════════════════════════
// 3. EL NOMBRE VIEJO NO QUEDA EN NINGÚN LADO
// ═════════════════════════════════════════════════════════════════════════
{
  const donde = []
  const mirar = (dir, filtro) => {
    for (const f of fs.readdirSync(path.join(RAIZ, dir))) {
      if (!filtro.test(f)) continue
      const t = fs.readFileSync(path.join(RAIZ, dir, f), 'utf8')
      if (/Intereses-Venta/.test(t)) donde.push(`${dir}/${f}`)
    }
  }
  mirar('modulos', /\.html$/)
  mirar('js', /\.js$/)
  mirar('e2e/maqueta/datos', /\.json$/)
  mirar('pruebas/datos-maqueta', /\.js$/)
  chk('"Intereses-Venta" no aparece en ninguna pantalla, en js/ ni en la maqueta', donde.length === 0, donde.join(', '))
  const maq = JSON.parse(fs.readFileSync(path.join(RAIZ, 'e2e/maqueta/datos/gastos-bancarios.json'), 'utf8'))
  chk('la maqueta gastos-bancarios tiene la categoría con el MISMO id que manda la cartera',
    maq.tablas.categorias.some(c => c.id === ID_BANCARIOS && c.nombre === 'Gastos bancarios y comisiones' && c.activo === true))
  const banco = JSON.parse(fs.readFileSync(path.join(RAIZ, 'e2e/maqueta/datos/cheques-banco.json'), 'utf8'))
  chk('la maqueta cheques-banco responde como la base nueva (sin descuento ni gasto)',
    banco.rpc.acreditar_cheques.every(r => r.descuento === 0 && r.gasto_id === null && r.acreditado === r.bruto) &&
    banco.rpc.vender_cheques.descuento === 0 && banco.rpc.vender_cheques.gasto_id === null && banco.rpc.vender_cheques.neto === banco.rpc.vender_cheques.bruto)
}

Promise.all(esperas.map(p => p.catch(err => chk('rama async sin excepción', false, String(err && err.stack || err))))).then(() => {
  for (const f of fallas) console.log('  ✗ ' + f)
  console.log(`${ok}/${ok + fallas.length}${fallas.length ? '  ROJO' : '  verde'}`)
  process.exit(fallas.length ? 1 : 0)
})
