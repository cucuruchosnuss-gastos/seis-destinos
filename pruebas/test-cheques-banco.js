// Cheques: DEPOSITAR Y VENDER AL BANCO (13/10/2026, pedido 3 del 13/10).
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
  S2.__doc.getElementById('chq-venta-neto').value = '500.000'
  S2.alEscribirVenta('neto')
  const h2 = S2.__doc.getElementById('chq-salida-resumen').innerHTML
  chk('… también en el de la venta', !h2.includes(cruda('cta')) && h2.includes(escapada('cta')))
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
  chk('cobranzas.html: un vendido cuenta como salido (no deja editar la cobranza)', /d\.cheques\.some\(ch => ESTADOS_SALIDOS\.includes\(ch\.estado\)\)/.test(COBRANZAS) &&
    /const salido = ESTADOS_SALIDOS\.includes\(ch\.estado\)/.test(COBRANZAS))
  chk('cobranzas.html: el chip de un vendido tiene su estilo', /\.cob-estado--vendido \{/.test(COBRANZAS))
  chk('la lista trae la cuenta, lo acreditado y el gasto de la venta', /salida_cuenta_id, venta_neto, venta_gasto_id'/.test(JS))
}

// ── La barra de la selección: Depositar, Vender al banco, Endosar ────────
{
  const S = armar()
  S.pintarSalidaLote()
  chk('sin nada elegido: los tres botones escondidos', ['chq-sel-depositar', 'chq-sel-vender', 'chq-sel-dar-salida'].every(id => S.__doc.getElementById(id).hidden === true))
  S.estado.seleccion.ids = new Set(['n1', 'n2'])
  S.pintarSalidaLote()
  chk('con dos elegidos: los tres botones a la vista', ['chq-sel-depositar', 'chq-sel-vender', 'chq-sel-dar-salida'].every(id => S.__doc.getElementById(id).hidden === false))
  chk('el HTML: "Depositar", "Vender al banco" y "Endosar", escondidos hasta que el JS los habilite',
    /id="chq-sel-depositar" hidden>Depositar</.test(FUENTE) && /id="chq-sel-vender" hidden>Vender al banco</.test(FUENTE) && /id="chq-sel-dar-salida" hidden>Endosar</.test(FUENTE))
  chk('cada botón abre el diálogo con su tipo', /'chq-sel-depositar'\)\.addEventListener\('click', \(\) => abrirModalSalidaLote\('depositado'\)\)/.test(JS) &&
    /'chq-sel-vender'\)\.addEventListener\('click', \(\) => abrirModalSalidaLote\('vendido'\)\)/.test(JS) &&
    /'chq-sel-dar-salida'\)\.addEventListener\('click', \(\) => abrirModalSalidaLote\('endosado'\)\)/.test(JS))
  chk('el diálogo: Depositar, Vender al banco, Endosar a un proveedor',
    /data-salida-tipo="depositado">Depositar</.test(FUENTE) && /data-salida-tipo="vendido">Vender al banco</.test(FUENTE) && /data-salida-tipo="endosado">Endosar a un proveedor</.test(FUENTE))
  chk('ya no hay ningún "marcar como depositado" sin plata (marcar_salida_cheque)', !/marcar_salida_cheque/.test(JS.replace(/\/\/[^\n]*/g, '')))
  chk('los tres campos de la venta con el formato argentino (la tasa hasta 100)',
    /enlazarCampoNumero\(document\.getElementById\('chq-venta-tasa'\), \{ decimales: 2, max: 100 \}\)/.test(JS) &&
    /enlazarCampoNumero\(document\.getElementById\('chq-venta-neto'\), \{ decimales: 2 \}\)/.test(JS))
}

// ── Gastos: los íconos de las categorías nuevas ──────────────────────────
{
  chk("Gastos: 'Intereses-Venta de cheques' con el ícono percent", /'Intereses-Venta de cheques':\s*'percent'/.test(GASTOS))
  chk("Gastos: 'Librería-Impresiones' con printer", /'Librería-Impresiones':\s*'printer'/.test(GASTOS))
  chk("Gastos: 'Comisiones' con handshake", /'Comisiones':\s*'handshake'/.test(GASTOS))
}

Promise.all(esperas.map(p => p.catch(err => chk('rama async sin excepción', false, String(err && err.stack || err))))).then(() => {
  for (const f of fallas) console.log('  ✗ ' + f)
  console.log(`${ok}/${ok + fallas.length}${fallas.length ? '  ROJO' : '  verde'}`)
  process.exit(fallas.length ? 1 : 0)
})
