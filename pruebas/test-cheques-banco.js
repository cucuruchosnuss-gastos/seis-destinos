// Cheques: DEPOSITAR Y VENDER AL BANCO (13/10/2026, pedido 3 del 13/10).
// EN DOS PASOS desde la tarde del 13/10: "Mandar al banco" no mueve plata
// (enviar_cheques_al_banco) y lo acreditado se carga en «En el banco»
// (acreditar_cheques) o vuelve a la cartera (cancelar_envio_cheques). Lo de
// abajo es el camino de UN paso, que queda para "Ya se acreditó".
//
// Antes "Depositado" solo marcaba el estado del cheque: la plata no entraba a
// ninguna cuenta. Ahora "Depositar" y "Vender al banco" van por la base en UNA
// llamada, todo o nada (verificado con pg_get_functiondef el 13/10/2026,
// _cheques_salida_banco):
//   depositar_cheques(p_cheque_ids, p_cuenta_id, p_fecha)
//   vender_cheques(p_cheque_ids, p_cuenta_id, p_fecha, p_neto, p_detalle)
//     → { cheques, bruto, neto, descuento, caja_movimiento_id, gasto_id }
// Las dos meten un ingreso por el total en la cuenta (cualquier banco de la
// Empresa en pesos); vender carga además un gasto "Intereses-Venta de cheques"
// por (total − acreditado) y deja el cheque 'vendido'. El descuento se carga de
// UNA de tres maneras (Acreditó $ / Descuento $ / Tasa %) y las otras dos se
// calculan. Si la cuenta es de otra fábrica que el cheque, se avisa que queda
// como movimiento entre empresas. En la lista: "Vendido el dd/mm · cuenta ·
// acreditó $X ($Y de interés)" con "Ver el gasto", y "Depositado el dd/mm ·
// cuenta". Filtro "Vendidos". Volver a cartera dice que la plata sale de la
// cuenta.
//
//   node pruebas/test-cheques-banco.js

const fs = require('fs')
const path = require('path')
const { construirCheques } = require('./sandbox-cheques')
const { ARCHIVO_CHEQUES, leerCheques } = require('./fuente-cheques')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || ARCHIVO_CHEQUES
const FUENTE = leerCheques(ARCHIVO)
const JS = FUENTE.slice(FUENTE.lastIndexOf('<script type="module">'))
const ARCHIVO_COMUN = process.env.ARCHIVO_COMUN_TEST || path.join(RAIZ, 'js', 'cobranzas-comun.js')
const COMUN = fs.readFileSync(ARCHIVO_COMUN, 'utf8')
const ARCHIVO_COB = process.env.ARCHIVO_COB_TEST || path.join(RAIZ, 'modulos', 'cobranzas.html')
const COBRANZAS = fs.readFileSync(ARCHIVO_COB, 'utf8')
const ARCHIVO_GASTOS = process.env.ARCHIVO_GASTOS_TEST || path.join(RAIZ, 'modulos', 'gastos.html')
const GASTOS = fs.readFileSync(ARCHIVO_GASTOS, 'utf8')
console.log(`ARCHIVO ${ARCHIVO_COMUN} (${COMUN.length} bytes)`)
console.log(`ARCHIVO ${ARCHIVO_COB} (${COBRANZAS.length} bytes)`)
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

// Los tres botones de tipo del diálogo (el doble de querySelectorAll devuelve []).
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
  { id: 'k-nacion', nombre: 'Nación Paz Mirta', medio: 'banco', moneda: 'ARS', activa: true, unidad_negocio_id: U_NUSS, empleado_id: 'emp' },
  { id: 'k-dolce', nombre: 'Macro Dolce', medio: 'banco', moneda: 'ARS', activa: true, unidad_negocio_id: U_DOLCE, empleado_id: 'emp' },
]
const NOMBRES = new Map([[U_NUSS, 'Cucuruchos Nuss'], [U_DOLCE, 'Dolce Pasta'], [U_PRUEBA, 'Pruebas (robot)']])

function armar({ tareas = ['cobranzas:ver_todo', 'cobranzas:procesar'] } = {}) {
  const S = construirCheques(ARCHIVO, { preludioExtra: PRELUDIO_BOTONES })
  S.estado.misTareas = new Set(tareas)
  S.estado.fabrica = { ok: true, unidades: new Set([U_PRUEBA]), personas: new Set(), soyDePrueba: false }
  S.estado.cuentasBanco = { porId: new Map(CUENTAS.map(c => [c.id, c])), ofrecidas: CUENTAS }
  S.estado.nombresUnidades = NOMBRES
  S.estado.cobranzas = new Map([
    ['cn', { id: 'cn', cliente: 'Molino', estado: 'procesada', fecha: '2026-09-01', unidad_negocio_id: U_NUSS, unidad_negocio_nombre: 'Cucuruchos Nuss' }],
    ['cd', { id: 'cd', cliente: 'Kiosco', estado: 'procesada', fecha: '2026-09-10', unidad_negocio_id: U_DOLCE, unidad_negocio_nombre: 'Dolce Pasta' }],
  ])
  const base = { banco_codigo: '072', tipo: 'comun', fecha_emision: '2026-09-01', fecha_pago: null, estado: 'en_cartera' }
  S.estado.filas = [
    { ...base, id: 'n1', cobranza_id: 'cn', numero: '43300023', importe: 600000 },
    { ...base, id: 'n2', cobranza_id: 'cn', numero: '43300024', importe: 400000 },
    { ...base, id: 'd1', cobranza_id: 'cd', numero: '43300025', importe: 250000.5 },
  ]
  S.estado.seleccion = { activa: true, ids: new Set(), ultimo: null, noPueden: new Set() }
  return S
}

// ── El cálculo de la venta (tres vías) ───────────────────────────────────
{
  const S = armar()
  const v1 = S.calcularVenta(100000000, 'neto', 950000)
  chk('acreditó $950.000 de $1.000.000: descuento $50.000 y tasa 5 %', v1 && v1.netoCent === 95000000 && v1.descCent === 5000000 && v1.tasa === 5, JSON.stringify(v1))
  const v2 = S.calcularVenta(100000000, 'descuento', 50000)
  chk('descuento $50.000: acreditó $950.000 y tasa 5 %', v2 && v2.netoCent === 95000000 && v2.tasa === 5)
  const v3 = S.calcularVenta(100000000, 'tasa', 5)
  chk('tasa 5 %: descuento $50.000 y acreditó $950.000', v3 && v3.descCent === 5000000 && v3.netoCent === 95000000)
  // Redondeo a centavos, como la base.
  const v4 = S.calcularVenta(100050, 'tasa', 3.33)
  chk('tasa 3,33 % de $1.000,50: el descuento redondea a centavos ($33,32)', v4 && v4.descCent === 3332 && v4.netoCent === 96718, JSON.stringify(v4))
  chk('… y la tasa que se muestra sale de los centavos (2 decimales)', v4.tasa === 3.33)
  const v5 = S.calcularVenta(100000, 'neto', 1000)
  chk('acreditó todo: descuento 0 y tasa 0', v5.descCent === 0 && v5.tasa === 0)
  chk('sin número: null (no inventa un cero)', S.calcularVenta(100000, 'neto', null) === null && S.calcularVenta(100000, 'tasa', '') === null)
  chk('sin total: null', S.calcularVenta(0, 'neto', 10) === null)
  chk('una vía que no existe: null', S.calcularVenta(100000, 'otra', 10) === null)
  chk('el descuento más grande que el total deja lo acreditado negativo (lo frena la validación)', S.calcularVenta(100000, 'descuento', 2000).netoCent < 0)
  chk('centavosDe suma en enteros (sin el error del punto flotante)', S.centavosDe([{ importe: 0.1 }, { importe: 0.2 }]) === 30)
}

// ── Las cuentas: agrupadas por fábrica, escapadas, y la que viene elegida ──
{
  const S = armar()
  const grupos = S.gruposDeCuentas(CUENTAS, NOMBRES)
  chk('dos grupos (Cucuruchos Nuss y Dolce Pasta), en orden alfabético', grupos.length === 2 && grupos[0].nombre === 'Cucuruchos Nuss' && grupos[1].nombre === 'Dolce Pasta')
  chk('las cuentas de cada fábrica en orden alfabético', grupos[0].cuentas.map(c => c.nombre).join() === 'Macro Paz Mirta,Nación Paz Mirta')
  const sinFab = S.gruposDeCuentas([...CUENTAS, { id: 'k-x', nombre: 'Suelta', unidad_negocio_id: null }], NOMBRES)
  chk('una cuenta sin fábrica va al final, en "Sin fábrica"', sinFab[sinFab.length - 1].nombre === 'Sin fábrica')
  const html = S.htmlOpcionesCuentas([{ id: marca('idcuenta'), nombre: marca('cuenta'), unidad_negocio_id: 'ux' }], new Map([['ux', marca('fabrica')]]))
  chk('el selector: un <optgroup> por fábrica', /<optgroup label=/.test(html) && /^<option value="">Elegí la cuenta<\/option>/.test(html))
  chk('el nombre de la cuenta y de la fábrica van escapados', !html.includes(cruda('cuenta')) && !html.includes(cruda('fabrica')) && html.includes(escapada('cuenta')) && html.includes(escapada('fabrica')))
  chk('… y el id de la cuenta (el value)', !html.includes(cruda('idcuenta')) && html.includes(escapada('idcuenta')))
  const cheqNuss = S.estado.filas.filter(ch => ch.cobranza_id === 'cn')
  chk('cheques de Nuss: viene elegida la primera cuenta de Nuss', S.cuentaDefecto(cheqNuss, S.estado.cobranzas, CUENTAS) === 'k-macro')
  chk('cheques de Dolce: la de Dolce', S.cuentaDefecto([S.estado.filas[2]], S.estado.cobranzas, CUENTAS) === 'k-dolce')
  chk('cheques de dos fábricas: no viene ninguna (se elige)', S.cuentaDefecto(S.estado.filas, S.estado.cobranzas, CUENTAS) === null)
  chk('una fábrica sin banco: no viene ninguna', S.cuentaDefecto(cheqNuss, S.estado.cobranzas, CUENTAS.filter(c => c.unidad_negocio_id !== U_NUSS)) === null)
}

// ── "Queda como movimiento entre empresas" ───────────────────────────────
{
  const S = armar()
  const dolce = [S.estado.filas[2]]
  const t = S.textoEntreEmpresasBanco(dolce, S.estado.cobranzas, CUENTAS[0], NOMBRES)
  chk('un cheque de Dolce en un banco de Nuss: lo avisa', /El cheque es de otra fábrica \(\$ 250\.000,50 de Dolce Pasta\) y la cuenta es de Cucuruchos Nuss: queda como movimiento entre empresas\./.test(N(t)), N(t))
  chk('… y en un banco de Dolce, nada', S.textoEntreEmpresasBanco(dolce, S.estado.cobranzas, CUENTAS[2], NOMBRES) === '')
  const varios = S.textoEntreEmpresasBanco(S.estado.filas, S.estado.cobranzas, CUENTAS[2], NOMBRES)
  chk('varios: "Hay cheques de otra fábrica" con lo de cada una', /^Hay cheques de otra fábrica \(\$ 1\.000\.000,00 de Cucuruchos Nuss\)/.test(N(varios)), N(varios))
  chk('sin cuenta elegida: nada', S.textoEntreEmpresasBanco(dolce, S.estado.cobranzas, null, NOMBRES) === '')
  S.estado.cobranzas.set('cs', { id: 'cs', cliente: 'X', estado: 'procesada', fecha: '2026-09-01' })
  chk('un cheque sin fábrica no avisa (no se sabe de quién es)', S.textoEntreEmpresasBanco([{ cobranza_id: 'cs', importe: 5 }], S.estado.cobranzas, CUENTAS[0], NOMBRES) === '')
}

// ── El diálogo: depositar uno ────────────────────────────────────────────
{
  const S = armar()
  const doc = S.__doc
  S.abrirModalSalida('d1', 'depositado')
  // "Ya se acreditó": el camino de un solo paso (mandar al banco, más abajo).
  S.estado.salida.ya = true
  S.pintarModalSalida()
  chk('abrir con "Depositar": la cuenta a la vista y viene la de su fábrica', doc.getElementById('chq-salida-campo-cuenta').hidden === false && S.estado.salida.cuentaId === 'k-dolce')
  chk('… el selector con las cuentas', /Macro Dolce/.test(doc.getElementById('chq-salida-cuenta').innerHTML) && doc.getElementById('chq-salida-cuenta').value === 'k-dolce')
  chk('… el botón marcado y con aria-pressed', doc.querySelectorAll('[data-salida-tipo]')[0].__clases.has('chq-btn--elegido') && doc.querySelectorAll('[data-salida-tipo]')[0].getAttribute('aria-pressed') === 'true')
  chk('… sin la venta', doc.getElementById('chq-venta').hidden === true)
  const res = doc.getElementById('chq-salida-resumen')
  chk('… el resumen: el total y a qué cuenta entra', res.hidden === false && /Total del cheque/.test(res.innerHTML) && /Entran \$ 250\.000,50 a Macro Dolce\./.test(N(res.innerHTML)), N(res.innerHTML))
  chk('… sin aviso entre empresas', doc.getElementById('chq-salida-aviso-empresas').hidden === true)
  // Elegir una cuenta de otra fábrica: avisa.
  S.estado.salida.cuentaId = 'k-macro'
  S.pintarBanco()
  chk('elegir un banco de Nuss para un cheque de Dolce: avisa "entre empresas"', doc.getElementById('chq-salida-aviso-empresas').hidden === false &&
    /queda como movimiento entre empresas/.test(doc.getElementById('chq-salida-aviso-empresas').textContent))
  const llamadas = []
  esperas.push((async () => {
    S.__setRpc(async (...a) => { llamadas.push(a); return { data: { cheques: 1, bruto: 250000.5, neto: 250000.5, descuento: 0, caja_movimiento_id: 'm1', gasto_id: null }, error: null } })
    await S.confirmarSalida()
    chk('depositar: UNA llamada a depositar_cheques con el payload exacto', llamadas.length === 1 && llamadas[0][0] === 'depositar_cheques' &&
      JSON.stringify(llamadas[0][1]) === JSON.stringify({ p_cheque_ids: ['d1'], p_cuenta_id: 'k-macro', p_fecha: S.hoyArgentina() }), JSON.stringify(llamadas))
    chk('… dice qué entró y dónde', N(S.__llamadas.exitos.at(-1)) === 'Se depositó 1 cheque en Macro Paz Mirta: entraron $ 250.000,50.', S.__llamadas.exitos.at(-1))
    chk('… cierra y recarga', S.estado.salida === null && S.__llamadas.refrescar === 1)
  })())
}

// ── El diálogo: vender varios ────────────────────────────────────────────
{
  const S = armar()
  const doc = S.__doc
  S.estado.seleccion.ids = new Set(['n1', 'n2'])
  S.abrirModalSalidaLote('vendido')
  S.estado.salida.ya = true
  S.pintarModalSalida()
  chk('"Vender al banco" desde la selección: el diálogo del lote, con la venta a la vista', S.estado.salida.lote === true && doc.getElementById('chq-venta').hidden === false)
  chk('… viene elegida la cuenta de Nuss (los dos son de Nuss)', S.estado.salida.cuentaId === 'k-macro')
  chk('… el título con la cantidad y el total', N(doc.getElementById('chq-salida-titulo').textContent) === 'Dar salida a 2 cheques · $ 1.000.000,00')
  chk('… sin nada escrito, el resumen pide el dato', /Escribí cuánto acreditó el banco, el descuento o la tasa\./.test(doc.getElementById('chq-salida-resumen').innerHTML))
  // Escribir "Acreditó": se calculan el descuento y la tasa, no se toca lo escrito.
  doc.getElementById('chq-venta-neto').value = '950.000'
  S.alEscribirVenta('neto')
  chk('escribir "Acreditó $ 950.000": el descuento pasa a 50.000', doc.getElementById('chq-venta-descuento').value === '50.000', doc.getElementById('chq-venta-descuento').value)
  chk('… y la tasa a 5', doc.getElementById('chq-venta-tasa').value === '5', doc.getElementById('chq-venta-tasa').value)
  chk('… lo escrito no se toca', doc.getElementById('chq-venta-neto').value === '950.000')
  const r = N(doc.getElementById('chq-salida-resumen').innerHTML)
  chk('… el resumen: total, descuento con el %, acreditado', /Total de los 2 cheques/.test(r) && /\$ 50\.000,00 \(5,00 %\)/.test(r) && /\$ 950\.000,00/.test(r), r)
  chk('… y que entra el total y se carga el gasto del interés', /Entran \$ 1\.000\.000,00 a Macro Paz Mirta y se carga un gasto de \$ 50\.000,00 de interés \(Intereses-Venta de cheques\)\./.test(r), r)
  // Escribir la tasa: se calculan los otros dos.
  doc.getElementById('chq-venta-tasa').value = '2,5'
  S.alEscribirVenta('tasa')
  chk('… la tasa escrita no se pisa ("2,5" sigue "2,5")', doc.getElementById('chq-venta-tasa').value === '2,5', doc.getElementById('chq-venta-tasa').value)
  chk('escribir "Tasa 2,5 %": descuento 25.000 y acreditó 975.000', doc.getElementById('chq-venta-descuento').value === '25.000' && doc.getElementById('chq-venta-neto').value === '975.000',
    doc.getElementById('chq-venta-descuento').value + ' / ' + doc.getElementById('chq-venta-neto').value)
  doc.getElementById('chq-venta-descuento').value = '30.000,50'
  S.alEscribirVenta('descuento')
  chk('escribir "Descuento 30.000,50": acreditó 969.999,50', doc.getElementById('chq-venta-neto').value === '969.999,50', doc.getElementById('chq-venta-neto').value)
  // Borrar: se vacían los otros dos (nunca un cero inventado).
  doc.getElementById('chq-venta-descuento').value = ''
  S.alEscribirVenta('descuento')
  chk('borrar el descuento: vacía los otros dos', doc.getElementById('chq-venta-neto').value === '' && doc.getElementById('chq-venta-tasa').value === '' && S.estado.salida.venta === null)
  const llamadas = []
  esperas.push((async () => {
    S.__setRpc(async (...a) => { llamadas.push(a); return { data: null, error: null } })
    await S.confirmarSalida()
    chk('vender sin lo acreditado: no llama y lo dice (el texto de la base)', llamadas.length === 0 && /Poné lo que acreditó el banco\./.test(doc.getElementById('chq-salida-error').textContent))
    doc.getElementById('chq-venta-neto').value = '1.000.000,01'
    S.alEscribirVenta('neto')
    await S.confirmarSalida()
    chk('vender más de lo que valen: no llama', llamadas.length === 0 && /no puede ser más que el total/.test(doc.getElementById('chq-salida-error').textContent))
    doc.getElementById('chq-venta-neto').value = '950.000'
    S.alEscribirVenta('neto')
    doc.getElementById('chq-venta-detalle').value = '  operación ' + marca('detalle') + ' '
    // Un doble toque: dos confirmar seguidos, UNA llamada.
    const soltar = []
    S.__setRpc(async (...a) => { llamadas.push(a); await new Promise(r => { soltar.push(r) }); return { data: { cheques: 2, bruto: 1000000, neto: 950000, descuento: 50000, caja_movimiento_id: 'm', gasto_id: 'g' }, error: null } })
    const p1 = S.confirmarSalida()
    const p2 = S.confirmarSalida()
    await new Promise(r => setTimeout(r, 0))
    for (const r of soltar) r()
    await Promise.all([p1, p2])
    chk('un doble toque manda UNA sola vez', llamadas.length === 1, llamadas.length)
    chk('vender: llama a vender_cheques con el payload exacto (en pesos y el detalle limpio)', llamadas[0] && llamadas[0][0] === 'vender_cheques' &&
      JSON.stringify(llamadas[0][1]) === JSON.stringify({ p_cheque_ids: ['n1', 'n2'], p_cuenta_id: 'k-macro', p_fecha: S.hoyArgentina(), p_neto: 950000, p_detalle: 'operación ' + marca('detalle') }),
      JSON.stringify(llamadas[0]))
    chk('… dice que entró el total y que se cargó el gasto del interés', N(S.__llamadas.exitos.at(-1)) === 'Se vendieron 2 cheques: entraron $ 1.000.000,00 en Macro Paz Mirta y se cargó un gasto de $ 50.000,00 de interés.', S.__llamadas.exitos.at(-1))
    chk('… y limpia la selección', S.estado.seleccion.activa === false)
  })())
}
{
  // El error de la base, TAL CUAL; el diálogo sigue abierto.
  const S = armar()
  const doc = S.__doc
  S.abrirModalSalida('n1', 'depositado')
  const MSG = 'La cuenta tiene que ser un banco de la Empresa, en pesos.'
  esperas.push((async () => {
    S.__setRpc(async () => ({ data: null, error: { message: MSG } }))
    await S.confirmarSalida()
    chk('el error de la base, entero y pegado al botón', doc.getElementById('chq-salida-error').textContent === MSG && doc.getElementById('chq-salida-error').hidden === false)
    chk('… el diálogo sigue abierto y se puede reintentar', S.estado.salida !== null && S.estado.salida.enviando === false && doc.getElementById('chq-salida-confirmar').disabled === false)
  })())
}
{
  // Cheques de dos fábricas: no viene ninguna cuenta y sin elegirla no se manda.
  const S = armar()
  const doc = S.__doc
  S.estado.seleccion.ids = new Set(['n1', 'd1'])
  S.abrirModalSalidaLote('depositado')
  const llamadas = []
  esperas.push((async () => {
    S.__setRpc(async (...a) => { llamadas.push(a); return { data: null, error: null } })
    await S.confirmarSalida()
    chk('sin cuenta elegida: no llama y dice "Elegí la cuenta del banco."', llamadas.length === 0 && /Elegí la cuenta del banco\./.test(doc.getElementById('chq-salida-error').textContent))
  })())
  // El nombre de la cuenta, escapado en el resumen.
  const S2 = armar()
  S2.estado.cuentasBanco = { porId: new Map(), ofrecidas: [{ id: 'kx', nombre: marca('cta'), medio: 'banco', moneda: 'ARS', activa: true, unidad_negocio_id: U_NUSS }] }
  S2.abrirModalSalida('n1', 'depositado')
  const h = S2.__doc.getElementById('chq-salida-resumen').innerHTML
  chk('el nombre de la cuenta va escapado en el resumen', !h.includes(cruda('cta')) && h.includes(escapada('cta')))
  S2.estado.salida.tipo = 'vendido'
  S2.estado.salida.ya = true
  S2.__doc.getElementById('chq-venta-neto').value = '500.000'
  S2.alEscribirVenta('neto')
  const h2 = S2.__doc.getElementById('chq-salida-resumen').innerHTML
  chk('… también en el de la venta', !h2.includes(cruda('cta')) && h2.includes(escapada('cta')))
  S2.estado.salida.tipo = 'depositado'
  S2.pintarBanco()
  const h3 = S2.__doc.getElementById('chq-salida-resumen').innerHTML
  chk('… y en el del depósito ya acreditado', /Entran/.test(h3) && !h3.includes(cruda('cta')) && h3.includes(escapada('cta')))
}
{
  // Sin cuentas leídas / sin cuentas / error al leer: se dice.
  const S = armar()
  const doc = S.__doc
  S.estado.cuentasBanco = null
  S.abrirModalSalida('n1', 'depositado')
  chk('mientras se leen las cuentas: "Cargando las cuentas…"', doc.getElementById('chq-salida-ayuda-cuenta').textContent === 'Cargando las cuentas…')
  S.estado.cuentasBanco = { porId: new Map(), ofrecidas: [] }
  S.pintarBanco()
  chk('sin cuentas: lo dice', /No hay ninguna cuenta de banco de la Empresa en pesos\./.test(doc.getElementById('chq-salida-ayuda-cuenta').textContent))
  S.estado.cuentasBancoError = true
  S.pintarBanco()
  chk('si no se pudieron leer: lo dice', /No se pudieron leer las cuentas de banco/.test(doc.getElementById('chq-salida-ayuda-cuenta').textContent))
}

// ── Leer las cuentas: solo bancos de la Empresa, activos, en pesos, sin la fábrica de pruebas ──
{
  const S = armar()
  S.estado.cuentasBanco = null
  S.__set((tabla) => {
    if (tabla === 'v_empleados_publico') return [{ id: 'emp' }]
    if (tabla === 'unidades_negocio') return [{ id: U_NUSS, nombre: 'Cucuruchos Nuss' }]
    if (tabla === 'cuentas_caja') return [
      ...CUENTAS,
      { id: 'k-usd', nombre: 'Macro USD', medio: 'banco', moneda: 'USD', activa: true, unidad_negocio_id: U_NUSS, empleado_id: 'emp' },
      { id: 'k-vieja', nombre: 'Vieja', medio: 'banco', moneda: 'ARS', activa: false, unidad_negocio_id: U_NUSS, empleado_id: 'emp' },
      { id: 'k-persona', nombre: 'De una persona', medio: 'banco', moneda: 'ARS', activa: true, unidad_negocio_id: U_NUSS, empleado_id: 'otra' },
      { id: 'k-prueba', nombre: 'Banco robot', medio: 'banco', moneda: 'ARS', activa: true, unidad_negocio_id: U_PRUEBA, empleado_id: 'emp' },
    ]
    return []
  })
  esperas.push(S.cargarCuentasBanco().then(() => {
    const ids = S.estado.cuentasBanco.ofrecidas.map(c => c.id).sort().join()
    chk('se ofrecen solo los bancos de la Empresa, activos, en pesos, sin la fábrica de pruebas', ids === 'k-dolce,k-macro,k-nacion', ids)
    chk('… pero se conocen TODAS las de la Empresa (para nombrar la de un cheque que ya salió)', S.estado.cuentasBanco.porId.has('k-vieja') && S.estado.cuentasBanco.porId.has('k-usd') && !S.estado.cuentasBanco.porId.has('k-persona'))
    chk('… y los nombres de las fábricas', S.estado.nombresUnidades.get(U_NUSS) === 'Cucuruchos Nuss')
    const c = S.__consultas.find(x => x.tabla === 'cuentas_caja')
    chk('la consulta pide solo bancos (medio = banco)', c && c.llamadas.some(l => l[0] === 'eq' && l[1] === 'medio' && l[2] === 'banco'))
  }))
  const S2 = armar()
  S2.estado.cuentasBanco = null
  S2.__setError({ message: 'caída' })
  esperas.push(S2.cargarCuentasBanco().then(() => {
    chk('si falla: no tira, deja la marca de error y ninguna cuenta', S2.estado.cuentasBancoError === true && S2.estado.cuentasBanco.ofrecidas.length === 0)
  }))
}

// ── La lista: cómo se lee un cheque depositado o vendido ─────────────────
{
  const S = armar()
  const dep = { id: 'x1', estado: 'depositado', salida_fecha: '2026-10-12', salida_cuenta_id: 'k-macro', salida_destino: 'Macro Paz Mirta', importe: 1000 }
  chk('depositado: "Depositado el 12/10 · Macro Paz Mirta"', S.textoSalidaBanco(dep) === 'Depositado el 12/10 · Macro Paz Mirta', S.textoSalidaBanco(dep))
  const ven = { id: 'x2', estado: 'vendido', salida_fecha: '2026-10-12', salida_cuenta_id: 'k-macro', importe: 1000000, venta_neto: 950000, venta_gasto_id: 'g-1' }
  chk('vendido: "Vendido el 12/10 · Macro Paz Mirta · acreditó $X ($Y de interés)"',
    N(S.textoSalidaBanco(ven)) === 'Vendido el 12/10 · Macro Paz Mirta · acreditó $ 950.000,00 ($ 50.000,00 de interés)', N(S.textoSalidaBanco(ven)))
  chk('la cuenta que no se conoce: el destino que guardó la base', S.textoSalidaBanco({ ...dep, salida_cuenta_id: 'k-otra', salida_destino: 'Banco viejo' }) === 'Depositado el 12/10 · Banco viejo')
  chk('un depósito de antes (sin cuenta) sigue como siempre', S.textoSalidaBanco({ ...dep, salida_cuenta_id: null }) === null &&
    S.textoSalidaCorto({ ...dep, salida_cuenta_id: null, salida_destino: 'Galicia' }) === '12/10/2026 · Galicia')
  const celda = S.htmlSalidaCheque(ven, S.estado.cobranzas.get('cn'))
  chk('la celda: el texto de la venta y "Ver el gasto" a gastos.html?gasto=', /Vendido el 12\/10/.test(celda) && /href="gastos\.html\?gasto=g-1">Ver el gasto<\/a>/.test(celda), celda)
  chk('… y "Volver a cartera" (vendido también vuelve)', /data-volver-cartera="x2"/.test(celda))
  chk('el link del gasto va con encodeURIComponent', /href="gastos\.html\?gasto=a%22b"/.test(S.htmlLinkGastoVenta({ estado: 'vendido', venta_gasto_id: 'a"b' })))
  chk('sin gasto (vendido sin interés): sin link', S.htmlLinkGastoVenta({ estado: 'vendido', venta_gasto_id: null }) === '')
  chk('un vendido "salió de cartera" (fondo y leyenda)', S.esSalido(ven) && S.clavesEstadoCheque(ven, null, '2026-10-13').join() === 'salido')
  const fila = S.htmlFilaCheque({ ...ven, cobranza_id: 'cn', numero: '1', banco_codigo: '072', tipo: 'comun', fecha_emision: '2026-09-01' }, S.estado.cobranzas.get('cn'))
  chk('la fila de un vendido: fondo de salido y el chip "Vendido"', /chq-tabla__fila--salido/.test(fila) && /chq-estado--vendido">Vendido</.test(fila))
  const t = S.htmlTarjetaCheque({ ...ven, cobranza_id: 'cn', numero: '1', banco_codigo: '072', tipo: 'comun', fecha_emision: '2026-09-01' }, S.estado.cobranzas.get('cn'))
  chk('la tarjeta del celular de un vendido: salido y con su texto', /chq-tarjeta--salido/.test(t) && /Vendido el 12\/10/.test(t))
  // Volver a cartera dice que la plata sale de la cuenta.
  chk('volver a cartera un depositado: dice que se sacan de la cuenta', N(S.textoVolverACartera(dep)) === 'Por qué vuelve a cartera (se sacan $ 1.000,00 de Macro Paz Mirta)', N(S.textoVolverACartera(dep)))
  chk('… un vendido: y que vuelve el interés', N(S.textoVolverACartera(ven)) === 'Por qué vuelve a cartera (se sacan $ 1.000.000,00 de Macro Paz Mirta y vuelve el interés de $ 50.000,00)', N(S.textoVolverACartera(ven)))
  chk('… un endosado: lo de siempre', S.textoVolverACartera({ estado: 'endosado' }) === 'Por qué vuelve a cartera')
  S.estado.filas = [{ ...ven, cobranza_id: 'cn', numero: '9' }]
  S.abrirVolverACartera('x2')
  chk('volver a cartera abre el motivo con ese texto', /vuelve el interés/.test(S.__doc.getElementById('chq-motivo-label').textContent))
}

// ── El filtro y la etiqueta ──────────────────────────────────────────────
{
  const S = armar()
  chk('el filtro de estado tiene "Vendidos"', S.ESTADOS_FILTRO_CHEQUES.some(e => e.id === 'vendidos' && e.nombre === 'Vendidos'))
  chk('la etiqueta de "vendido" es "Vendido"', S.ETIQUETA_ESTADO_CHEQUE.vendido === 'Vendido')
  chk('salidos = depositado, endosado y vendido', JSON.stringify(S.ESTADOS_SALIDOS) === JSON.stringify(['depositado', 'endosado', 'vendido']))
  chk('el común: textoSalidaCheque de un vendido', /if \(estadoCheque === 'vendido'\) return `Vendido\$\{cuando\}/.test(COMUN))
  chk('cobranzas.html: un vendido cuenta como salido (no deja editar la cobranza)', /d\.cheques\.some\(ch => ESTADOS_FUERA_DE_CARTERA\.includes\(ch\.estado\)\)/.test(COBRANZAS) &&
    /const salido = ESTADOS_FUERA_DE_CARTERA\.includes\(ch\.estado\)/.test(COBRANZAS) && /export const ESTADOS_FUERA_DE_CARTERA = \['en_banco', \.\.\.ESTADOS_SALIDOS[,\]]/.test(COMUN))
  chk('cobranzas.html: el chip de un vendido tiene su estilo', /\.cob-estado--vendido \{/.test(COBRANZAS))
  chk('la lista trae la cuenta, lo acreditado y el gasto de la venta', /salida_cuenta_id, venta_neto, venta_gasto_id, /.test(JS))
}

// ── La barra de la selección: Mandar al banco y Endosar ─────────────────
{
  const S = armar()
  S.pintarSalidaLote()
  chk('sin nada elegido: los dos botones escondidos', ['chq-sel-banco', 'chq-sel-dar-salida'].every(id => S.__doc.getElementById(id).hidden === true))
  S.estado.seleccion.ids = new Set(['n1', 'n2'])
  S.pintarSalidaLote()
  chk('con dos elegidos: los dos botones a la vista', ['chq-sel-banco', 'chq-sel-dar-salida'].every(id => S.__doc.getElementById(id).hidden === false))
  chk('el HTML: "Mandar al banco" y "Endosar", escondidos hasta que el JS los habilite',
    /id="chq-sel-banco" hidden>Mandar al banco</.test(FUENTE) && /id="chq-sel-dar-salida" hidden>Endosar</.test(FUENTE))
  chk('ya no están "Depositar" y "Vender al banco" sueltos en la barra', !/id="chq-sel-depositar"/.test(FUENTE) && !/id="chq-sel-vender"/.test(FUENTE))
  chk('cada botón abre el diálogo: mandar al banco sin tipo (se elige) y endosar', /'chq-sel-banco'\)\.addEventListener\('click', \(\) => abrirModalSalidaLote\(null, \{ banco: true \}\)\)/.test(JS) &&
    /'chq-sel-dar-salida'\)\.addEventListener\('click', \(\) => abrirModalSalidaLote\('endosado'\)\)/.test(JS))
  chk('el diálogo: Depositar, Vender al banco, Endosar a un proveedor',
    /data-salida-tipo="depositado">Depositar</.test(FUENTE) && /data-salida-tipo="vendido">Vender al banco</.test(FUENTE) && /data-salida-tipo="endosado">Endosar a un proveedor</.test(FUENTE))
  chk('ya no hay ningún "marcar como depositado" sin plata (marcar_salida_cheque)', !/marcar_salida_cheque/.test(JS.replace(/\/\/[^\n]*/g, '')))
  chk('los tres campos de la venta con el formato argentino (la tasa hasta 100)',
    /enlazarCampoNumero\(document\.getElementById\('chq-venta-tasa'\), \{ decimales: 2, max: 100 \}\)/.test(JS) &&
    /enlazarCampoNumero\(document\.getElementById\('chq-venta-neto'\), \{ decimales: 2 \}\)/.test(JS))
  chk('lo acreditado de "En el banco" también (el total y la tasa hasta 100)', /enlazarCampoNumero\(document\.getElementById\('chq-acr-total'\), \{ decimales: 2 \}\)/.test(JS) &&
    /enlazarCampoNumero\(document\.getElementById\('chq-acr-tasa'\), \{ decimales: 2, max: 100 \}\)/.test(JS) && /enlazarCampoNumero\(inp, \{ decimales: 2 \}\)/.test(JS))
}

// ── Gastos: los íconos de las categorías nuevas ──────────────────────────
{
  chk("Gastos: 'Intereses-Venta de cheques' con el ícono percent", /'Intereses-Venta de cheques':\s*'percent'/.test(GASTOS))
  chk("Gastos: 'Librería-Impresiones' con printer", /'Librería-Impresiones':\s*'printer'/.test(GASTOS))
  chk("Gastos: 'Comisiones' con handshake", /'Comisiones':\s*'handshake'/.test(GASTOS))
}

// ═════════════════════════════════════════════════════════════════════════
// EN DOS PASOS (13/10/2026): mandar al banco NO mueve plata
// (enviar_cheques_al_banco); los cheques quedan 'en_banco' y se ven en «En el
// banco». Ahí se carga lo acreditado (acreditar_cheques) o se vuelven a la
// cartera si el banco no los tomó (cancelar_envio_cheques). "Ya se acreditó"
// en el diálogo usa el camino de un solo paso (depositar_ / vender_cheques).
// Verificado con pg_get_functiondef el 13/10/2026.
// ═════════════════════════════════════════════════════════════════════════

// ── "Mandar al banco" desde la selección ─────────────────────────────────
{
  const S = armar()
  const doc = S.__doc
  S.estado.seleccion.ids = new Set(['n1', 'n2'])
  S.abrirModalSalidaLote(null, { banco: true })
  chk('mandar al banco: el título dice "Mandar al banco 2 cheques · $ 1.000.000,00"', N(doc.getElementById('chq-salida-titulo').textContent) === 'Mandar al banco 2 cheques · $ 1.000.000,00', N(doc.getElementById('chq-salida-titulo').textContent))
  chk('… no ofrece endosar (solo depositar o vender)', doc.querySelectorAll('[data-salida-tipo]')[2].hidden === true &&
    doc.querySelectorAll('[data-salida-tipo]')[0].hidden !== true && doc.querySelectorAll('[data-salida-tipo]')[1].hidden !== true)
  const llamadas = []
  esperas.push((async () => {
    S.__setRpc(async (...a) => { llamadas.push(a); return { data: null, error: null } })
    await S.confirmarSalida()
    chk('… sin elegir depositar o vender: no llama y lo pide', llamadas.length === 0 && /Elegí qué hacés con el cheque/.test(doc.getElementById('chq-salida-error').textContent))
    S.estado.salida.tipo = 'vendido'
    S.pintarModalSalida()
    chk('vender sin "Ya se acreditó": la cuenta, el detalle y "Ya se acreditó" a la vista, SIN lo acreditado',
      doc.getElementById('chq-salida-campo-cuenta').hidden === false && doc.getElementById('chq-salida-campo-detalle').hidden === false &&
      doc.getElementById('chq-salida-campo-ya').hidden === false && doc.getElementById('chq-venta').hidden === true)
    chk('… el botón dice "Mandar al banco"', doc.getElementById('chq-salida-confirmar').textContent === 'Mandar al banco')
    const r = N(doc.getElementById('chq-salida-resumen').innerHTML)
    chk('… el resumen dice que la plata no se mueve todavía', /Se mandan a Macro Paz Mirta para vender\. La plata no se mueve todavía: cuando el banco acredite, se carga en «En el banco»\./.test(r), r)
    doc.getElementById('chq-venta-detalle').value = '  boleta ' + marca('det') + ' '
    const soltar = []
    S.__setRpc(async (...a) => { llamadas.push(a); await new Promise(res => { soltar.push(res) }); return { data: { cheques: 2, total: 1000000 }, error: null } })
    const p1 = S.confirmarSalida()
    const p2 = S.confirmarSalida()
    await new Promise(res => setTimeout(res, 0))
    for (const x of soltar) x()
    await Promise.all([p1, p2])
    chk('mandar: un doble toque manda UNA sola vez', llamadas.length === 1, llamadas.length)
    chk('mandar: UNA llamada a enviar_cheques_al_banco con el payload exacto (modo venta, el detalle limpio)', llamadas[0] && llamadas[0][0] === 'enviar_cheques_al_banco' &&
      JSON.stringify(llamadas[0][1]) === JSON.stringify({ p_cheque_ids: ['n1', 'n2'], p_cuenta_id: 'k-macro', p_fecha: S.hoyArgentina(), p_modo: 'venta', p_detalle: 'boleta ' + marca('det') }),
      JSON.stringify(llamadas[0]))
    chk('… NO llama a vender_cheques ni a depositar_cheques (no se mueve plata)', !llamadas.some(l => l[0] === 'vender_cheques' || l[0] === 'depositar_cheques'))
    chk('… dice que quedan en «En el banco»', N(S.__llamadas.exitos.at(-1)) === 'Se mandaron 2 cheques ($ 1.000.000,00) a Macro Paz Mirta para vender. Quedan en «En el banco» hasta que se acrediten.', S.__llamadas.exitos.at(-1))
    chk('… cierra, limpia la selección y recarga', S.estado.salida === null && S.estado.seleccion.activa === false && S.__llamadas.refrescar === 1)
  })())
}
{
  // Depositar uno, sin acreditar: p_modo 'deposito', detalle vacío = null.
  const S = armar()
  S.abrirModalSalida('d1', 'depositado')
  const llamadas = []
  esperas.push((async () => {
    S.__setRpc(async (...a) => { llamadas.push(a); return { data: { cheques: 1, total: 250000.5 }, error: null } })
    await S.confirmarSalida()
    chk('depositar sin acreditar: enviar_cheques_al_banco con modo deposito y el detalle null', llamadas[0] && llamadas[0][0] === 'enviar_cheques_al_banco' &&
      JSON.stringify(llamadas[0][1]) === JSON.stringify({ p_cheque_ids: ['d1'], p_cuenta_id: 'k-dolce', p_fecha: S.hoyArgentina(), p_modo: 'deposito', p_detalle: null }), JSON.stringify(llamadas))
    chk('… "Se mandó 1 cheque (…) a Macro Dolce para depositar…"', N(S.__llamadas.exitos.at(-1)) === 'Se mandó 1 cheque ($ 250.000,50) a Macro Dolce para depositar. Quedan en «En el banco» hasta que se acrediten.', S.__llamadas.exitos.at(-1))
  })())
}
{
  // "Ya se acreditó": vuelve el camino de un solo paso.
  const S = armar()
  const doc = S.__doc
  S.abrirModalSalida('d1', 'vendido')
  chk('sin tildar "Ya se acreditó", vender no pide lo acreditado', doc.getElementById('chq-venta').hidden === true)
  S.estado.salida.ya = true
  S.pintarModalSalida()
  chk('tildado: aparecen Acreditó / Descuento / Tasa y el botón dice "Vender"', doc.getElementById('chq-venta').hidden === false && doc.getElementById('chq-salida-confirmar').textContent === 'Vender')
  S.estado.salida.tipo = 'depositado'
  S.pintarModalSalida()
  chk('depositar ya acreditado: sin el detalle (depositar_cheques no lo recibe) y el botón "Depositar"', doc.getElementById('chq-salida-campo-detalle').hidden === true && doc.getElementById('chq-salida-confirmar').textContent === 'Depositar')
  chk('el JS: "Ya se acreditó" cambia el diálogo (y se guarda)', /getElementById\('chq-salida-ya'\)\.addEventListener\('change', \(ev\) => \{\n\s+if \(!estado\.salida\) return\n\s+estado\.salida\.ya = ev\.target\.checked\n\s+pintarModalSalida\(\)/.test(JS))
  chk('el JS: escribir un cheque a mano vacía el total y la tasa de arriba', /bancoUI\.valores\.set\(id, x == null \? null : Math\.round\(x \* 100\)\)\n(\s*\/\/[^\n]*\n)*\s+ponerNumero\(document\.getElementById\('chq-acr-total'\), null\)\n\s+ponerNumero\(document\.getElementById\('chq-acr-tasa'\), null\)/.test(JS))
  chk('parametrosEnvio: los ids, la cuenta, la fecha, el modo y el detalle', JSON.stringify(S.parametrosEnvio(['a'], { tipo: 'depositado', cuentaId: 'k', fecha: '2026-10-13', detalle: '  ' })) ===
    JSON.stringify({ p_cheque_ids: ['a'], p_cuenta_id: 'k', p_fecha: '2026-10-13', p_modo: 'deposito', p_detalle: null }))
  chk('erroresSalida: sin "Ya se acreditó" la venta NO pide lo acreditado', S.erroresSalida({ tipo: 'vendido', fecha: '2026-10-13', cuentaId: 'k', venta: null, brutoCent: 100, ya: false }, null, '2026-10-13').length === 0)
}

// ── La vista «En el banco» ───────────────────────────────────────────────
function armarBanco() {
  const S = armar()
  const base = { banco_codigo: '072', tipo: 'comun', fecha_emision: '2026-09-01', fecha_pago: null, estado: 'en_banco' }
  S.estado.filas = [
    { ...base, id: 'b1', cobranza_id: 'cn', numero: '00000002', importe: 600000, salida_cuenta_id: 'k-macro', salida_modo: 'venta', envio_fecha: '2026-10-10', salida_destino: 'Macro Paz Mirta' },
    { ...base, id: 'b2', cobranza_id: 'cn', numero: '00000001', importe: 400000, salida_cuenta_id: 'k-macro', salida_modo: 'venta', envio_fecha: '2026-10-10', salida_destino: 'Macro Paz Mirta' },
    { ...base, id: 'b3', cobranza_id: 'cd', numero: '00000003', importe: 250000.5, salida_cuenta_id: 'k-macro', salida_modo: 'deposito', envio_fecha: '2026-10-12', salida_destino: 'Macro Paz Mirta' },
    { ...base, id: 'b4', cobranza_id: 'cd', numero: '00000004', importe: 1000, salida_cuenta_id: 'k-dolce', salida_modo: 'deposito', envio_fecha: '2026-10-08', salida_destino: 'Macro Dolce' },
  ]
  S.estado.filtros.estado = 'en_banco'
  S.estado.seleccion = { activa: false, ids: new Set(), ultimo: null, noPueden: new Set() }
  S.bancoUI.ids = new Set()
  S.bancoUI.panel = null
  S.bancoUI.resultado = ''
  return S
}
{
  const S = armarBanco()
  const grupos = S.gruposEnBanco(S.estado.filas, S.estado.cuentasBanco.porId)
  chk('agrupados por cuenta y fecha de envío, los más viejos primero', grupos.map(g => `${g.cuenta}|${g.fecha}|${g.cheques.length}`).join(' / ') ===
    'Macro Dolce|2026-10-08|1 / Macro Paz Mirta|2026-10-10|2 / Macro Paz Mirta|2026-10-12|1', grupos.map(g => `${g.cuenta}|${g.fecha}|${g.cheques.length}`).join(' / '))
  chk('… adentro, por número', grupos[1].cheques.map(c => c.id).join() === 'b2,b1')
  const conOtro = S.gruposEnBanco([...S.estado.filas, { ...S.estado.filas[3], id: 'b5', envio_fecha: '2026-10-11' }], S.estado.cuentasBanco.porId)
  chk('… primero por FECHA (no por cuenta): Dolce 08, Paz 10, Dolce 11, Paz 12', conOtro.map(g => g.fecha).join() === '2026-10-08,2026-10-10,2026-10-11,2026-10-12', conOtro.map(g => g.fecha).join())
  chk('… el total del grupo en centavos', grupos[1].centavos === 100000000)
  chk('días esperando: 3 desde el 10/10 al 13/10', S.diasEsperando('2026-10-10', '2026-10-13') === 3 && S.textoEsperando(3) === 'hace 3 días')
  chk('… "mandado hoy", "hace 1 día", y nunca negativo', S.textoEsperando(S.diasEsperando('2026-10-13', '2026-10-13')) === 'mandado hoy' && S.textoEsperando(1) === 'hace 1 día' && S.diasEsperando('2026-10-14', '2026-10-13') === 0)
  chk('… sin fecha: nada (no inventa)', S.diasEsperando(null, '2026-10-13') === null && S.textoEsperando(null) === '')
  const html = S.htmlGruposEnBanco(grupos, new Set(['b1']), true, S.estado.cobranzas, '2026-10-13')
  chk('el grupo dice la cuenta y "mandados el 10/10/2026"', /<strong>Macro Paz Mirta<\/strong> · mandados el 10\/10\/2026/.test(html))
  chk('… cada cheque: importe, número, banco, cliente, Venta/Depósito y los días', /Nº 00000001/.test(html) && /Molino/.test(html) && />Venta</.test(html) && />Depósito</.test(html) && /hace 3 días/.test(html))
  chk('… el elegido marcado y con su casilla tildada', /chq-banco-cheque--elegido/.test(html) && /data-banco-cheque="b1"[^>]*checked/.test(html))
  chk('… sin permiso: sin casillas ni "Elegir"', !/data-banco-cheque/.test(S.htmlGruposEnBanco(grupos, new Set(), false, S.estado.cobranzas, '2026-10-13')) &&
    !/data-banco-grupo/.test(S.htmlGruposEnBanco(grupos, new Set(), false, S.estado.cobranzas, '2026-10-13')))
  S.estado.bancos = new Map([['072', marca('banco')]])
  const malo = S.htmlGruposEnBanco(S.gruposEnBanco([{ id: marca('id'), cobranza_id: 'cx', numero: marca('num'), banco_codigo: '072', importe: 5, salida_cuenta_id: marca('kid'), salida_destino: marca('cuenta'), envio_fecha: '2026-10-10', salida_modo: marca('modo') }], new Map()),
    new Set(), true, new Map([['cx', { cliente: marca('cliente') }]]), '2026-10-13')
  chk('todo lo de la base va escapado (cuenta, número, banco, cliente, id, la clave del grupo)', !['id', 'num', 'cuenta', 'cliente', 'modo', 'banco', 'kid'].some(k => malo.includes(cruda(k))) &&
    ['cliente', 'cuenta', 'banco', 'kid', 'num', 'id'].every(k => malo.includes(escapada(k))), malo)
  S.estado.bancos = new Map()
  // La vista
  S.renderizarCheques()
  chk('el filtro "En el banco": se ve la vista agrupada y no la tabla', S.__doc.getElementById('chq-banco').hidden === false && S.__doc.getElementById('chq-tabla-caja').hidden === true && S.__doc.getElementById('chq-lista').hidden === true)
  chk('… sin "Seleccionar" de la cartera (tiene su propia elección)', S.__doc.getElementById('chq-btn-seleccionar').hidden === true)
  chk('… con procesar: las acciones a la vista, apagadas sin nada elegido', S.__doc.getElementById('chq-banco-acciones').hidden === false && S.__doc.getElementById('chq-banco-acreditar').disabled === true && S.__doc.getElementById('chq-banco-no-tomo').disabled === true)
  S.elegirEnBanco('b1', true)
  S.elegirEnBanco('b2', true)
  chk('elegir dos: "2 cheques elegidos · $ 1.000.000,00" y los botones prendidos', N(S.__doc.getElementById('chq-banco-elegidos').textContent) === '2 cheques elegidos · $ 1.000.000,00' && S.__doc.getElementById('chq-banco-acreditar').disabled === false)
  S.elegirGrupoEnBanco(S.gruposEnBanco(S.estado.filas, S.estado.cuentasBanco.porId)[1].clave)
  chk('"Soltar" el grupo entero (los dos estaban elegidos)', S.bancoUI.ids.size === 0)
  S.elegirGrupoEnBanco(S.gruposEnBanco(S.estado.filas, S.estado.cuentasBanco.porId)[1].clave)
  chk('"Elegir los 2" del grupo', S.bancoUI.ids.size === 2 && S.bancoUI.ids.has('b1') && S.bancoUI.ids.has('b2'))
  S.estado.filas = []
  S.renderizarCheques()
  chk('sin nada en el banco: lo dice', /No hay cheques esperando en el banco\./.test(S.__doc.getElementById('chq-banco-lista').innerHTML) && S.__doc.getElementById('chq-banco-acciones').hidden === true)
  chk('… y se sueltan los elegidos que ya no están', S.bancoUI.ids.size === 0)
  S.estado.filtros.estado = 'en_cartera'
  S.renderizarCheques()
  chk('otro filtro: la vista del banco se esconde', S.__doc.getElementById('chq-banco').hidden === true && S.__doc.getElementById('chq-btn-seleccionar').hidden === false)
}
{
  const S = armarBanco()
  chk('el filtro "En el banco" existe y la consulta pide estado = en_banco', S.ESTADOS_FILTRO_CHEQUES.some(e => e.id === 'en_banco' && e.nombre === 'En el banco') &&
    /else if \(f\.estado === 'en_banco'\) q = q\.eq\('estado', 'en_banco'\)/.test(JS))
  S.estado.filasResumen = [{ estado: 'en_banco' }, { estado: 'en_banco' }, { estado: 'en_cartera' }]
  S.pintarFiltrosCheques()
  chk('la pestaña "En el banco" lleva el contador (2)', /data-estado-cheque="en_banco">En el banco <span class="chq-segmento__cuenta">2<\/span>/.test(S.__doc.getElementById('chq-chips-estado').innerHTML), S.__doc.getElementById('chq-chips-estado').innerHTML)
  S.estado.filasResumen = [{ estado: 'en_cartera' }]
  S.pintarFiltrosCheques()
  chk('… sin ninguno, sin contador', /data-estado-cheque="en_banco">En el banco<\/button>/.test(S.__doc.getElementById('chq-chips-estado').innerHTML))
  S.estado.filasResumen = null
  chk('… si no se sabe, sin contador (no inventa un cero)', S.cantidadEnBanco() === null && S.htmlCuentaEnBanco() === '')
  chk('la lista trae el modo, la fecha y el detalle del envío', /salida_modo, envio_fecha, envio_detalle[,']/.test(JS))
  const ch = S.estado.filas[0]
  chk('en "Todos": "En el banco desde el 10/10 · Macro Paz Mirta · para vender", sin botones', S.textoEnBanco(ch) === 'En el banco desde el 10/10 · Macro Paz Mirta · para vender' &&
    !/data-volver-cartera|data-dar-salida/.test(S.htmlSalidaCheque(ch, S.estado.cobranzas.get('cn'))) && /En el banco desde el 10\/10/.test(S.htmlSalidaCheque(ch, S.estado.cobranzas.get('cn'))))
  chk('… su fondo y su entrada en la leyenda', S.clavesEstadoCheque(ch, null, '2026-10-13').join() === 'en_banco' && /chq-tabla__fila--en-banco/.test(S.htmlFilaCheque(ch, S.estado.cobranzas.get('cn'))))
  chk('… NO se puede elegir para salir (no está en cartera)', S.puedeSalir(ch) === false)
  chk('la etiqueta: "En el banco"', S.ETIQUETA_ESTADO_CHEQUE.en_banco === 'En el banco')
}

// ── Repartir lo acreditado ───────────────────────────────────────────────
{
  const S = armarBanco()
  const [b1, b2, b3] = S.estado.filas
  const r = S.repartoPorTotal([b1, b2], 95000000)
  chk('total $ 950.000 de $ 1.000.000: proporcional (570.000 y 380.000)', r && r.get('b1') === 57000000 && r.get('b2') === 38000000, r && JSON.stringify([...r]))
  const r2 = S.repartoPorTotal([b1, b2, b3], 95000000 + 25000050)
  chk('con un depósito: el depósito entra entero y el total se reparte entre las ventas', r2 && r2.get('b3') === 25000050 && r2.get('b1') + r2.get('b2') === 95000000)
  const r3 = S.repartoPorTotal([{ id: 'x', importe: 1, salida_modo: 'venta' }, { id: 'y', importe: 2, salida_modo: 'venta' }], 200)
  chk('los centavos del redondeo van al más grande y la suma da EXACTO el total', r3 && r3.get('x') + r3.get('y') === 200 && r3.get('y') >= r3.get('x'), r3 && JSON.stringify([...r3]))
  chk('un total más grande que los cheques: no se reparte', S.repartoPorTotal([b1, b2], 100000001) === null)
  chk('un total cero o vacío: no se reparte', S.repartoPorTotal([b1, b2], 0) === null && S.repartoPorTotal([b1, b2], NaN) === null)
  const sinVentas = S.repartoPorTotal([b3, S.estado.filas[3]], 25000050)
  chk('sin ninguna venta: se reparte entre todos', sinVentas && sinVentas.get('b3') + sinVentas.get('b4') === 25000050)
  const t = S.repartoPorTasa([b1, b2, b3], 5)
  chk('tasa 5 %: cada venta pierde el 5 % (570.000 y 380.000) y el depósito entra entero', t.get('b1') === 57000000 && t.get('b2') === 38000000 && t.get('b3') === 25000050)
  chk('una tasa de 100 o más, o negativa: no', S.repartoPorTasa([b1], 100) === null && S.repartoPorTasa([b1], -1) === null)
  const res = S.resumenAcreditar([b1, b2], new Map([['b1', 57000000], ['b2', 38000000]]))
  chk('el resumen: total, acreditado, interés y el %', res.brutoCent === 100000000 && res.netoCent === 95000000 && res.descCent === 5000000 && res.tasa === 5 && res.completo === true)
  chk('… con uno sin escribir: incompleto', S.resumenAcreditar([b1, b2], new Map([['b1', 57000000], ['b2', null]])).completo === false)
  const e = S.erroresAcreditar([b1, b2], new Map([['b1', 0], ['b2', 40000001]]), '2026-10-09', '2026-10-13')
  chk('errores: antes del envío, cero y más que su importe', e.some(x => /anterior al envío al banco \(10\/10\/2026\)/.test(x)) &&
    e.some(x => /Nº 00000002: poné cuánto acreditó/.test(x)) && e.some(x => /Nº 00000001: lo acreditado no puede ser más que su importe/.test(x)), e.join(' | '))
  chk('… una fecha futura', S.erroresAcreditar([b1], new Map([['b1', 1]]), '2026-10-14', '2026-10-13').some(x => /posterior a hoy/.test(x)))
  chk('… sin cheques', S.erroresAcreditar([], new Map(), '2026-10-13', '2026-10-13')[0] === 'Elegí al menos un cheque.')
  chk('parametrosAcreditar: lo acreditado en PESOS por cheque, y la fecha', JSON.stringify(S.parametrosAcreditar([b1, b2], new Map([['b1', 57000000], ['b2', 38000050]]), '2026-10-13')) ===
    JSON.stringify({ p_items: [{ cheque_id: 'b1', acreditado: 570000 }, { cheque_id: 'b2', acreditado: 380000.5 }], p_fecha: '2026-10-13' }))
}

// ── Cargar lo acreditado ─────────────────────────────────────────────────
{
  const S = armarBanco()
  const doc = S.__doc
  S.renderizarCheques()
  S.elegirEnBanco('b1', true)
  S.elegirEnBanco('b2', true)
  S.elegirEnBanco('b3', true)
  S.abrirAcreditar()
  chk('"Cargar lo acreditado": el panel a la vista, con la fecha de hoy', doc.getElementById('chq-acreditar').hidden === false && doc.getElementById('chq-acr-fecha').value === S.hoyArgentina())
  chk('… cada cheque prellenado con su importe', S.bancoUI.valores.get('b1') === 60000000 && S.bancoUI.valores.get('b3') === 25000050)
  chk('… la fecha no puede ser antes del envío más nuevo', doc.getElementById('chq-acr-fecha').min === '2026-10-12')
  chk('… hay ventas: la ayuda para repartir a la vista', doc.getElementById('chq-acr-reparto').hidden === false)
  chk('… un campo "Acreditó $" por cheque', (doc.getElementById('chq-acr-lista').innerHTML.match(/data-acr-cheque=/g) || []).length === 3 && /Acreditó \$/.test(doc.getElementById('chq-acr-lista').innerHTML))
  // El total del resumen del banco es el de TODOS los elegidos: el depósito
  // entra entero y el resto se reparte entre las ventas.
  doc.getElementById('chq-acr-total').value = '1.200.000,50'
  S.alRepartir('total')
  chk('escribir el total del banco: se reparte entre las ventas y el depósito entra entero', S.bancoUI.valores.get('b1') === 57000000 && S.bancoUI.valores.get('b2') === 38000000 && S.bancoUI.valores.get('b3') === 25000050,
    JSON.stringify([...S.bancoUI.valores]))
  const res = N(doc.getElementById('chq-acr-resumen').innerHTML)
  chk('… el resumen: total, acreditado e interés con el %', /Total de los 3 cheques/.test(res) && /\$ 1\.250\.000,50/.test(res) && /\$ 1\.200\.000,50/.test(res) && /\$ 50\.000,00 \(4,00 %\)/.test(res), res)
  doc.getElementById('chq-acr-tasa').value = '10'
  S.alRepartir('tasa')
  chk('escribir la tasa: vacía el total y reparte por tasa', doc.getElementById('chq-acr-total').value === '' && S.bancoUI.valores.get('b1') === 54000000)
  doc.getElementById('chq-acr-total').value = '5.000.000'
  S.alRepartir('total')
  chk('un total imposible: lo dice y no toca lo que había', doc.getElementById('chq-acr-ayuda-reparto').hidden === false && S.bancoUI.valores.get('b1') === 54000000)
  doc.getElementById('chq-acr-total').value = '1.200.000,50'
  S.alRepartir('total')
  const llamadas = []
  esperas.push((async () => {
    const soltar = []
    S.__setRpc(async (...a) => { llamadas.push(a); await new Promise(res => { soltar.push(res) }); return { data: [
      { cuenta: 'Macro Paz Mirta', cheques: 3, bruto: 1200000.5, acreditado: 1150000.5, descuento: 50000, caja_movimiento_id: 'm', gasto_id: 'g"1' },
    ], error: null } })
    const p1 = S.confirmarAcreditar()
    const p2 = S.confirmarAcreditar()
    await new Promise(res => setTimeout(res, 0))
    for (const x of soltar) x()
    await Promise.all([p1, p2])
    chk('acreditar: un doble toque manda UNA sola vez', llamadas.length === 1, llamadas.length)
    chk('acreditar: llama a acreditar_cheques con el payload exacto (en pesos)', llamadas[0] && llamadas[0][0] === 'acreditar_cheques' &&
      JSON.stringify(llamadas[0][1]) === JSON.stringify({ p_items: [
        { cheque_id: 'b1', acreditado: 570000 }, { cheque_id: 'b2', acreditado: 380000 }, { cheque_id: 'b3', acreditado: 250000.5 },
      ], p_fecha: S.hoyArgentina() }), JSON.stringify(llamadas[0]))
    const html = N(doc.getElementById('chq-banco-resultado-texto').innerHTML)
    chk('el resultado: "Entró $ X en la cuenta · gasto de intereses $ Y" con "Ver el gasto"', /Entró \$ 1\.150\.000,50 en Macro Paz Mirta · gasto de intereses \$ 50\.000,00/.test(html) &&
      /href="gastos\.html\?gasto=g%221">Ver el gasto<\/a>/.test(html), html)
    chk('… el cheque de Dolce en un banco de Nuss: "queda en Entre empresas"', /Los cheques de Dolce Pasta \(\$ 250\.000,50\) entraron en un banco de otra fábrica: quedan en «Entre empresas»\./.test(html), html)
    chk('… el resultado a la vista, y se cierran el panel y la elección', doc.getElementById('chq-banco-resultado').hidden === false && S.bancoUI.ids.size === 0 && S.bancoUI.panel === null)
    chk('… avisa y recarga', N(S.__llamadas.exitos.at(-1)) === 'Se acreditaron 3 cheques.' && S.__llamadas.refrescar === 1)
  })())
}
{
  const S = armarBanco()
  const doc = S.__doc
  S.renderizarCheques()
  S.elegirEnBanco('b4', true)
  S.abrirAcreditar()
  chk('un solo depósito: sin la ayuda para repartir', doc.getElementById('chq-acr-reparto').hidden === true)
  const MSG = 'El cheque 00000004 no está en el banco esperando acreditación (está depositado).'
  esperas.push((async () => {
    S.__setRpc(async () => ({ data: null, error: { message: MSG } }))
    await S.confirmarAcreditar()
    chk('acreditar: el error de la base TAL CUAL y el panel sigue abierto', doc.getElementById('chq-acr-error').textContent === MSG && doc.getElementById('chq-acr-error').hidden === false && S.bancoUI.panel === 'acreditar')
    S.bancoUI.valores.set('b4', null)
    const llamadas = []
    S.__setRpc(async (...a) => { llamadas.push(a); return { data: [], error: null } })
    await S.confirmarAcreditar()
    chk('acreditar sin lo acreditado: no llama y lo dice', llamadas.length === 0 && /poné cuánto acreditó/.test(doc.getElementById('chq-acr-error').textContent))
  })())
  // El resultado, escapado.
  const h = S.htmlResultadoAcreditar([{ cuenta: marca('cuenta'), acreditado: 1, descuento: 1, gasto_id: 'g' }],
    [{ cobranza_id: 'cx', salida_cuenta_id: 'k-macro', importe: 5 }], new Map([['cx', { unidad_negocio_id: U_DOLCE, unidad_negocio_nombre: marca('fab') }]]), S.estado.cuentasBanco.porId, NOMBRES)
  chk('el nombre de la cuenta y de la fábrica del resultado van escapados', !h.includes(cruda('cuenta')) && h.includes(escapada('cuenta')) && !h.includes(cruda('fab')) && h.includes(escapada('fab')), h)
  chk('sin interés: no habla de gasto', !/gasto/.test(S.htmlResultadoAcreditar([{ cuenta: 'X', acreditado: 1, descuento: 0, gasto_id: null }], [], new Map(), new Map(), new Map())))
}

// ── No lo tomó el banco ──────────────────────────────────────────────────
{
  const S = armarBanco()
  const doc = S.__doc
  S.renderizarCheques()
  S.elegirEnBanco('b1', true)
  S.elegirEnBanco('b2', true)
  S.abrirNoTomo()
  chk('"No lo tomó el banco": el panel dice que vuelven a la cartera sin mover plata', doc.getElementById('chq-no-tomo').hidden === false &&
    N(doc.getElementById('chq-no-tomo-texto').textContent) === 'Vuelven 2 cheques ($ 1.000.000,00) a la cartera. No se mueve plata.')
  const llamadas = []
  esperas.push((async () => {
    S.__setRpc(async (...a) => { llamadas.push(a); return { data: 2, error: null } })
    doc.getElementById('chq-no-tomo-motivo').value = ' x '
    await S.confirmarNoTomo()
    chk('sin motivo (menos de 3 letras): no llama y lo pide con el texto de la base', llamadas.length === 0 && doc.getElementById('chq-no-tomo-error').textContent === S.TEXTO_MOTIVO_NO_TOMO)
    doc.getElementById('chq-no-tomo-motivo').value = '  el banco no lo aceptó '
    await S.confirmarNoTomo()
    chk('con motivo: cancelar_envio_cheques con los ids y el motivo limpio', llamadas[0] && llamadas[0][0] === 'cancelar_envio_cheques' &&
      JSON.stringify(llamadas[0][1]) === JSON.stringify({ p_cheque_ids: ['b1', 'b2'], p_motivo: 'el banco no lo aceptó' }), JSON.stringify(llamadas[0]))
    chk('… "Volvieron 2 cheques a la cartera." y recarga', S.__llamadas.exitos.at(-1) === 'Volvieron 2 cheques a la cartera.' && S.__llamadas.refrescar === 1 && S.bancoUI.ids.size === 0)
    const MSG = 'Ninguno de esos cheques está en el banco esperando acreditación.'
    S.elegirEnBanco('b1', true)
    S.abrirNoTomo()
    doc.getElementById('chq-no-tomo-motivo').value = 'no lo tomó'
    S.__setRpc(async () => ({ data: null, error: { message: MSG } }))
    await S.confirmarNoTomo()
    chk('… el error de la base TAL CUAL', doc.getElementById('chq-no-tomo-error').textContent === MSG)
  })())
}

// ── Cobranzas: un cheque en el banco tampoco deja editar la cobranza ─────
{
  chk('el común: en el banco está fuera de la cartera', /export const ESTADOS_FUERA_DE_CARTERA = \['en_banco', \.\.\.ESTADOS_SALIDOS[,\]]/.test(COMUN) &&
    /en_banco: 'En el banco'/.test(COMUN) && /if \(estadoCheque === 'en_banco'\) return `En el banco/.test(COMUN))
  chk('cobranzas.html usa ESTADOS_FUERA_DE_CARTERA (no deja editar con un cheque en el banco) y tiene su chip',
    /d\.cheques\.some\(ch => ESTADOS_FUERA_DE_CARTERA\.includes\(ch\.estado\)\)/.test(COBRANZAS) && /const salido = ESTADOS_FUERA_DE_CARTERA\.includes\(ch\.estado\)/.test(COBRANZAS) &&
    /\.cob-estado--en_banco \{/.test(COBRANZAS))
}

Promise.all(esperas.map(p => p.catch(err => chk('rama async sin excepción', false, String(err && err.stack || err))))).then(() => {
  for (const f of fallas) console.log('  ✗ ' + f)
  console.log(`${ok}/${ok + fallas.length}${fallas.length ? '  ROJO' : '  verde'}`)
  process.exit(fallas.length ? 1 : 0)
})
