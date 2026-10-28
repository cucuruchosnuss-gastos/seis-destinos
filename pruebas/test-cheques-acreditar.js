// Cheques: ACREDITAR VENTA Y DEPÓSITO (28/10/2026, pedido de Facu: sin pasos
// de más, el gasto del banco se crea SOLO al acreditar).
//
// La base (leída con pg_get_functiondef el 28/10/2026):
//   acreditar_cheques(p_items jsonb, p_fecha date), p_items un array de
//     { cheque_id, acreditado }  en un cheque mandado a VENDER (el banco
//       acredita el neto; 0 < acreditado <= importe; sin él, el importe)
//     { cheque_id, gastos }      en uno mandado a DEPOSITAR (entra el importe
//       completo; 0 <= gastos < importe; sin él, 0)
//   → un renglón por cuenta y modo: { cuenta, modo, cheques, bruto,
//     acreditado, gastos, caja_movimiento_id, gasto_id } (gasto_id null sin
//     gasto). Crea sola el gasto ("Gastos bancarios y comisiones"), uno por
//     cuenta y modo. El cheque queda 'vendido' o 'depositado', con
//     venta_gasto_id en los dos si hubo gasto.
//
// Esta suite mira, EJECUTANDO la región de Cheques de administracion.html:
//  - «En el banco» en dos bloques ("Vendidos · esperando acreditación" y
//    "Depositados · esperando acreditación"), cada uno con su total;
//  - el campo de cada cheque al acreditar: "Monto acreditado" (venta, viene
//    el importe) o "Gastos del banco" (depósito, viene 0), leído con el parser
//    argentino (leerNumeroAr de js/utils.js), y lo que se dice en vivo;
//  - las validaciones (las mismas reglas que la base), el armado de p_items
//    (venta con y sin acreditado, depósito con y sin gastos, mezcla), el
//    resumen, el resultado y el aviso con los gastos que creó la base;
//  - "Ver el gasto" también en un depositado;
//  - que no quede el botón "Cargar el gasto del banco" (data-gastos-banco);
//  - que los botones del envío digan "Depositar" y "Vender".
//
//   node pruebas/test-cheques-acreditar.js
//   ARCHIVO_TEST=<administracion.html> node pruebas/test-cheques-acreditar.js

const { construirCheques } = require('./sandbox-cheques')
const { ARCHIVO_CHEQUES, leerCheques } = require('./fuente-cheques')
const { inputFalso } = require('./numeros-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || ARCHIVO_CHEQUES
const FUENTE = leerCheques(ARCHIVO)
// El PRIMER <script type="module"> de la región (más abajo hay un comentario
// que nombra la etiqueta: con lastIndexOf se perderían los import).
const JS = FUENTE.slice(FUENTE.indexOf('<script type="module">'))
const CSS_REGION = FUENTE.slice(0, FUENTE.indexOf('<script type="module">'))

let ok = 0
const fallas = []
const esperas = []
function chk(nombre, cond, detalle) { if (cond) ok++; else fallas.push(nombre + (detalle !== undefined ? ` — ${detalle}` : '')) }
const marca = (campo) => `"><b data-xss="${campo}">`
const cruda = (campo) => `<b data-xss="${campo}">`
const escapada = (campo) => `&lt;b data-xss=&quot;${campo}&quot;&gt;`
// formatearImporte usa Intl: entre "$" y el número va un espacio duro.
const N = (s) => String(s ?? '').replace(/\s/g, ' ')

const U_NUSS = 'u-nuss', U_DOLCE = 'u-dolce'
const CUENTAS = [
  { id: 'k-macro', nombre: 'Macro Paz Mirta', medio: 'banco', moneda: 'ARS', activa: true, unidad_negocio_id: U_NUSS, empleado_id: 'emp' },
  { id: 'k-dolce', nombre: 'Macro Dolce', medio: 'banco', moneda: 'ARS', activa: true, unidad_negocio_id: U_DOLCE, empleado_id: 'emp' },
]

function armar() {
  const S = construirCheques(ARCHIVO)
  S.estado.misTareas = new Set(['cobranzas:ver_todo', 'cobranzas:procesar'])
  S.estado.fabrica = { ok: true, unidades: new Set(), personas: new Set(), soyDePrueba: false }
  S.estado.cuentasBanco = { porId: new Map(CUENTAS.map(c => [c.id, c])), ofrecidas: CUENTAS }
  S.estado.nombresUnidades = new Map([[U_NUSS, 'Cucuruchos Nuss'], [U_DOLCE, 'Dolce Pasta']])
  S.estado.cobranzas = new Map([
    ['cn', { id: 'cn', cliente: 'Molino', estado: 'procesada', fecha: '2026-09-01', unidad_negocio_id: U_NUSS, unidad_negocio_nombre: 'Cucuruchos Nuss' }],
    ['cd', { id: 'cd', cliente: 'Kiosco', estado: 'procesada', fecha: '2026-09-10', unidad_negocio_id: U_DOLCE, unidad_negocio_nombre: 'Dolce Pasta' }],
  ])
  const base = { banco_codigo: '072', tipo: 'comun', fecha_emision: '2026-09-01', fecha_pago: null, estado: 'en_banco' }
  S.estado.filas = [
    { ...base, id: 'v1', cobranza_id: 'cn', numero: '00000001', importe: 1000000, salida_cuenta_id: 'k-macro', salida_modo: 'venta', envio_fecha: '2026-10-20', salida_destino: 'Macro Paz Mirta' },
    { ...base, id: 'v2', cobranza_id: 'cn', numero: '00000002', importe: 250000.5, salida_cuenta_id: 'k-macro', salida_modo: 'venta', envio_fecha: '2026-10-21', salida_destino: 'Macro Paz Mirta' },
    { ...base, id: 'd1', cobranza_id: 'cn', numero: '00000003', importe: 200000, salida_cuenta_id: 'k-macro', salida_modo: 'deposito', envio_fecha: '2026-10-21', salida_destino: 'Macro Paz Mirta' },
    { ...base, id: 'd2', cobranza_id: 'cd', numero: '00000004', importe: 50000, salida_cuenta_id: 'k-dolce', salida_modo: 'deposito', envio_fecha: '2026-10-22', salida_destino: 'Macro Dolce' },
  ]
  S.estado.filtros.estado = 'en_banco'
  S.estado.seleccion = { activa: false, ids: new Set(), ultimo: null, noPueden: new Set() }
  S.bancoUI.ids = new Set()
  S.bancoUI.panel = null
  S.bancoUI.resultado = ''
  S.bancoUI.valores = new Map()
  return S
}
const ch = (S, id) => S.estado.filas.find(x => x.id === id)

// ═════════════════════════════════════════════════════════════════════════
// 1. «EN EL BANCO»: DOS BLOQUES CON SU TOTAL
// ═════════════════════════════════════════════════════════════════════════
{
  const S = armar()
  const bloques = S.bloquesEnBanco(S.estado.filas, S.estado.cuentasBanco.porId)
  chk('dos bloques: primero los vendidos, después los depositados', bloques.map(b => b.modo).join() === 'venta,deposito', bloques.map(b => b.modo).join())
  chk('… con los títulos exactos', bloques[0].titulo === 'Vendidos · esperando acreditación' && bloques[1].titulo === 'Depositados · esperando acreditación')
  chk('… cada uno con SUS cheques', bloques[0].cheques.map(c => c.id).join() === 'v1,v2' && bloques[1].cheques.map(c => c.id).join() === 'd1,d2')
  chk('… y su total en centavos (sin el error del punto flotante)', bloques[0].centavos === 125000050 && bloques[1].centavos === 25000000, `${bloques[0].centavos} / ${bloques[1].centavos}`)
  chk('… adentro, por cuenta y fecha de envío (la venta del 20 y la del 21 aparte)', bloques[0].grupos.length === 2 && bloques[0].grupos[0].fecha === '2026-10-20' && bloques[1].grupos.length === 2)
  chk('una venta y un depósito de la misma cuenta y día: grupos distintos (la clave lleva el modo)',
    new Set(S.gruposEnBanco(S.estado.filas, S.estado.cuentasBanco.porId).map(g => g.clave)).size === 4 &&
    S.gruposEnBanco([ch(S, 'v2'), ch(S, 'd1')], S.estado.cuentasBanco.porId).length === 2)
  chk('solo depósitos: un solo bloque', S.bloquesEnBanco([ch(S, 'd1')], new Map()).map(b => b.modo).join() === 'deposito')
  chk('nada: ningún bloque', S.bloquesEnBanco([], new Map()).length === 0)
  chk('un modo raro se acredita como depósito (igual que la base)', S.modoEnBanco({ salida_modo: 'otro' }) === 'deposito' && S.modoEnBanco({ salida_modo: 'venta' }) === 'venta' && S.modoEnBanco(null) === 'deposito')
  const html = N(S.htmlBloquesEnBanco(bloques, new Set(), true, S.estado.cobranzas, '2026-10-28'))
  chk('el HTML: los dos títulos', /<h2 class="chq-banco-bloque__titulo">Vendidos · esperando acreditación<\/h2>/.test(html) && /<h2 class="chq-banco-bloque__titulo">Depositados · esperando acreditación<\/h2>/.test(html), html.slice(0, 400))
  chk('… con su total: "2 cheques · $ 1.250.000,50" y "2 cheques · $ 250.000,00"',
    html.includes('<div class="chq-banco-bloque__total">2 cheques · $ 1.250.000,50</div>') && html.includes('<div class="chq-banco-bloque__total">2 cheques · $ 250.000,00</div>'), html)
  chk('… los vendidos arriba', html.indexOf('Vendidos ·') < html.indexOf('Depositados ·'))
  chk('… y adentro los grupos de siempre (cuenta, "mandados el", casillas)', (html.match(/chq-banco-grupo"/g) || []).length === 4 && /data-banco-cheque="v1"/.test(html) && /mandados el 20\/10\/2026/.test(html))
  const uno = N(S.htmlBloquesEnBanco(S.bloquesEnBanco([ch(S, 'd2')], new Map()), new Set(), true, S.estado.cobranzas, '2026-10-28'))
  // El total del BLOQUE (el del grupo de adentro dice lo mismo: no alcanza
  // con buscar el texto suelto).
  chk('un solo cheque: el bloque dice "1 cheque · $ 50.000,00"', uno.includes('<div class="chq-banco-bloque__total">1 cheque · $ 50.000,00</div>'), uno)
  const malo = S.htmlBloquesEnBanco([{ modo: marca('modo'), titulo: marca('titulo'), cheques: [{}], centavos: 1, grupos: [] }], new Set(), true, new Map(), '2026-10-28')
  chk('el modo y el título van escapados', !malo.includes(cruda('modo')) && !malo.includes(cruda('titulo')) && malo.includes(escapada('titulo')), malo)
  // La vista entera
  S.renderizarCheques()
  const lista = N(S.__doc.getElementById('chq-banco-lista').innerHTML)
  chk('la vista «En el banco» pinta los dos bloques', /data-banco-bloque="venta"/.test(lista) && /data-banco-bloque="deposito"/.test(lista), lista.slice(0, 300))
  S.elegirGrupoEnBanco(S.gruposEnBanco(S.estado.filas, S.estado.cuentasBanco.porId).find(g => g.cheques[0].id === 'd1').clave)
  chk('"Elegir" el grupo del depósito del 21 NO elige la venta del mismo día y cuenta', S.bancoUI.ids.size === 1 && S.bancoUI.ids.has('d1'), [...S.bancoUI.ids].join())
  chk('el CSS de los bloques', /\.chq-banco-bloque \{/.test(CSS_REGION) && /\.chq-banco-bloque__total \{/.test(CSS_REGION))
}

// ═════════════════════════════════════════════════════════════════════════
// 2. EL CAMPO DE CADA CHEQUE: LO QUE VIENE, LA CUENTA Y LAS VALIDACIONES
// ═════════════════════════════════════════════════════════════════════════
{
  const S = armar()
  const [v1, v2, d1] = ['v1', 'v2', 'd1'].map(id => ch(S, id))
  chk('lo que viene: en la venta, el importe con formato argentino', S.textoInicialAcreditar(v1) === '1.000.000' && S.textoInicialAcreditar(v2) === '250.000,50', `${S.textoInicialAcreditar(v1)} / ${S.textoInicialAcreditar(v2)}`)
  chk('… en el depósito, 0', S.textoInicialAcreditar(d1) === '0')

  const c = (x, t) => S.cuentaAcreditar(x, t)
  let r = c(v1, '980.000')
  chk('venta 1.000.000 → acreditó 980.000: gasto 20.000 (en centavos)', !r.error && r.venta && r.acreditadoCent === 98000000 && r.gastoCent === 2000000, JSON.stringify(r))
  r = c(v1, '1.000.000')
  chk('venta: lo acreditado igual al importe → sin gasto', !r.error && r.gastoCent === 0)
  r = c(v2, '245.000,25')
  chk('venta con centavos: 250.000,50 − 245.000,25 = 5.000,25', !r.error && r.gastoCent === 500025, JSON.stringify(r))
  chk('venta: pegado con punto decimal ("980000.5") se lee', c(v1, '980000.5').acreditadoCent === 98000050)
  chk('venta: "$ 980.000" (con el signo) se lee', c(v1, '$ 980.000').acreditadoCent === 98000000)
  chk('venta: cero → "tiene que ser mayor a cero"', c(v1, '0').error === 'Cheque Nº 00000001: lo acreditado tiene que ser mayor a cero.', c(v1, '0').error)
  chk('venta: 0,00 también', /mayor a cero/.test(c(v1, '0,00').error))
  chk('venta: negativo → "tiene que ser mayor a cero"', /mayor a cero/.test(c(v1, '-5').error))
  chk('venta: más que el importe → "no puede ser más que el importe ($ 1.000.000,00)"', N(c(v1, '1.000.000,01').error) === 'Cheque Nº 00000001: lo acreditado no puede ser más que el importe ($ 1.000.000,00).', N(c(v1, '1.000.000,01').error))
  chk('venta: vacío → "escribí el monto acreditado"', c(v1, '').error === 'Cheque Nº 00000001: escribí el monto acreditado.' && /escribí/.test(c(v1, '   ').error))
  chk('venta: texto inválido → "no es un monto válido"', c(v1, 'abc').error === 'Cheque Nº 00000001: «abc» no es un monto válido.', c(v1, 'abc').error)
  chk('venta: tres decimales o miles mal armados → inválido', /no es un monto válido/.test(c(v1, '1,005').error) && /no es un monto válido/.test(c(v1, '1.00.000').error))
  chk('venta: con error, sin centavos', c(v1, 'x').acreditadoCent === null && c(v1, 'x').gastoCent === null)

  r = c(d1, '1.500')
  chk('depósito 200.000 con gastos 1.500: acredita el importe y gasto 1.500', !r.error && !r.venta && r.acreditadoCent === 20000000 && r.gastoCent === 150000, JSON.stringify(r))
  r = c(d1, '0')
  chk('depósito con 0: sin gasto', !r.error && r.gastoCent === 0 && r.acreditadoCent === 20000000)
  r = c(d1, '')
  chk('depósito vacío = 0 (como la base sin "gastos")', !r.error && r.gastoCent === 0)
  chk('depósito: negativo → "no pueden ser negativos"', c(d1, '-1').error === 'Cheque Nº 00000003: los gastos no pueden ser negativos.', c(d1, '-1').error)
  chk('depósito: gastos iguales al importe → "tienen que ser menos que el importe"', N(c(d1, '200.000').error) === 'Cheque Nº 00000003: los gastos tienen que ser menos que el importe ($ 200.000,00).', N(c(d1, '200.000').error))
  chk('depósito: más que el importe, también', /menos que el importe/.test(c(d1, '300.000').error))
  chk('depósito: uno menos que el importe entra', !c(d1, '199.999,99').error && c(d1, '199.999,99').gastoCent === 19999999)
  chk('depósito: texto inválido', c(d1, '1,5,0').error === 'Cheque Nº 00000003: «1,5,0» no es un monto válido.', c(d1, '1,5,0').error)
  const malo = c({ id: 'z', numero: marca('num'), importe: 10, salida_modo: 'venta' }, '')
  chk('el número del cheque viaja en el texto tal cual (se escapa al pintar)', malo.error.includes(marca('num')))

  // La regla de la base, escrita aparte en centavos, contra la de la pantalla.
  const base = (x, cent, venta) => venta ? (cent > 0 && cent <= Math.round(x.importe * 100)) : (cent >= 0 && cent < Math.round(x.importe * 100))
  let distintas = []
  for (const x of [v1, v2, d1]) {
    const imp = Math.round(x.importe * 100)
    for (const cent of [1, 100, imp - 1, imp, imp + 1, 0, Math.floor(imp / 2)]) {
      const texto = (cent / 100).toFixed(2).replace('.', ',')
      const pantalla = !c(x, texto).error
      if (pantalla !== base(x, cent, x.salida_modo === 'venta')) distintas.push(`${x.id} ${texto}`)
    }
  }
  chk('la validación de la pantalla es la MISMA que la de la base (en los bordes)', distintas.length === 0, distintas.join(', '))
}

// ═════════════════════════════════════════════════════════════════════════
// 3. LO QUE SE DICE EN VIVO
// ═════════════════════════════════════════════════════════════════════════
{
  const S = armar()
  const [v1, v2, d1] = ['v1', 'v2', 'd1'].map(id => ch(S, id))
  const v = (x, t) => { const r = S.vivoAcreditar(x, t); return { texto: N(r.texto), error: r.error } }
  chk('venta 1.000.000 → 980.000: "Diferencia $ 20.000,00 (2 %) → se carga como gasto"', v(v1, '980.000').texto === 'Diferencia $ 20.000,00 (2 %) → se carga como gasto' && v(v1, '980.000').error === false, v(v1, '980.000').texto)
  chk('… con decimales en el %: 985.500 → "(1,45 %)"', v(v1, '985.500').texto === 'Diferencia $ 14.500,00 (1,45 %) → se carga como gasto', v(v1, '985.500').texto)
  chk('… el % redondeado a dos decimales', v(v2, '245.000').texto === 'Diferencia $ 5.000,50 (2 %) → se carga como gasto', v(v2, '245.000').texto)
  chk('venta sin diferencia: "Sin diferencia: no se carga gasto."', v(v1, '1.000.000').texto === 'Sin diferencia: no se carga gasto.')
  chk('depósito con gastos: "Se acredita $ 200.000,00 · gasto $ 1.500,00"', v(d1, '1.500').texto === 'Se acredita $ 200.000,00 · gasto $ 1.500,00', v(d1, '1.500').texto)
  chk('depósito sin gastos: "Se acredita $ 200.000,00 · sin gasto"', v(d1, '0').texto === 'Se acredita $ 200.000,00 · sin gasto')
  chk('con un error, el error (y marcado)', v(v1, '0').error === true && /mayor a cero/.test(v(v1, '0').texto) && v(d1, '-3').error === true)
}

// ═════════════════════════════════════════════════════════════════════════
// 4. LO QUE VIAJA: parametrosAcreditar Y erroresAcreditar
// ═════════════════════════════════════════════════════════════════════════
{
  const S = armar()
  const [v1, v2, d1, d2] = ['v1', 'v2', 'd1', 'd2'].map(id => ch(S, id))
  const P = (cheques, valores) => JSON.stringify(S.parametrosAcreditar(cheques, '2026-10-28', valores))
  chk('venta CON lo acreditado: { cheque_id, acreditado } en pesos', P([v1], new Map([['v1', '980.000']])) === JSON.stringify({ p_items: [{ cheque_id: 'v1', acreditado: 980000 }], p_fecha: '2026-10-28' }))
  chk('venta con centavos: 245.000,25 → 245000.25 (desde los centavos, sin error del punto flotante)', P([v2], new Map([['v2', '245.000,25']])) === JSON.stringify({ p_items: [{ cheque_id: 'v2', acreditado: 245000.25 }], p_fecha: '2026-10-28' }))
  chk('venta SIN nada escrito: solo el id (la base usa el importe completo)', P([v1], new Map()) === JSON.stringify({ p_items: [{ cheque_id: 'v1' }], p_fecha: '2026-10-28' }))
  chk('depósito CON gastos: { cheque_id, gastos }', P([d1], new Map([['d1', '1.500,50']])) === JSON.stringify({ p_items: [{ cheque_id: 'd1', gastos: 1500.5 }], p_fecha: '2026-10-28' }))
  chk('depósito con 0 o vacío: gastos 0', P([d1], new Map([['d1', '0']])) === JSON.stringify({ p_items: [{ cheque_id: 'd1', gastos: 0 }], p_fecha: '2026-10-28' }) &&
    P([d1], new Map([['d1', '']])) === JSON.stringify({ p_items: [{ cheque_id: 'd1', gastos: 0 }], p_fecha: '2026-10-28' }))
  chk('depósito SIN nada escrito: solo el id (la base usa 0)', P([d1], undefined) === JSON.stringify({ p_items: [{ cheque_id: 'd1' }], p_fecha: '2026-10-28' }))
  chk('la venta nunca manda "gastos" ni el depósito "acreditado"', !P([v1], new Map([['v1', '1']])).includes('gastos') && !P([d1], new Map([['d1', '1']])).includes('acreditado'))
  chk('mezcla: cada cheque con lo suyo, en el orden elegido',
    P([v1, d1, v2, d2], new Map([['v1', '990.000'], ['d1', '2.000'], ['d2', '0']])) ===
      JSON.stringify({ p_items: [{ cheque_id: 'v1', acreditado: 990000 }, { cheque_id: 'd1', gastos: 2000 }, { cheque_id: 'v2' }, { cheque_id: 'd2', gastos: 0 }], p_fecha: '2026-10-28' }))
  chk('uno mal escrito viaja solo con su id (erroresAcreditar frena antes)', P([v1], new Map([['v1', 'abc']])) === JSON.stringify({ p_items: [{ cheque_id: 'v1' }], p_fecha: '2026-10-28' }))

  const E = (cheques, valores) => S.erroresAcreditar(cheques, '2026-10-28', '2026-10-28', valores)
  chk('errores: todo bien escrito, ninguno', E([v1, d1], new Map([['v1', '980.000'], ['d1', '1.500']])).length === 0)
  const e = E([v1, v2, d1, d2], new Map([['v1', '0'], ['v2', '300.000'], ['d1', '200.000'], ['d2', '-1']]))
  chk('errores: uno por cheque mal escrito, cada uno con su número', e.length === 4 && /00000001.*mayor a cero/.test(e[0]) && /00000002.*más que el importe/.test(e[1]) &&
    /00000003.*menos que el importe/.test(e[2]) && /00000004.*negativos/.test(e[3]), e.join(' | '))
  chk('… sumados a los de la fecha', S.erroresAcreditar([v1], '2026-10-19', '2026-10-28', new Map([['v1', '']])).length === 2)
}

// ═════════════════════════════════════════════════════════════════════════
// 5. LA PANTALLA: ABRIR, ESCRIBIR, EL RESUMEN Y CONFIRMAR
// ═════════════════════════════════════════════════════════════════════════
// Los campos y los textos en vivo: la lista falsa devuelve un <input> que se
// porta como el del navegador (inputFalso) y un <div> por cheque.
function conCampos(S) {
  const lista = S.__doc.getElementById('chq-acr-lista')
  const inputs = new Map()
  const vivos = new Map()
  lista.querySelector = (sel) => {
    let m = /^\[data-acr-monto="(.+)"\]$/.exec(sel)
    if (m) {
      if (!inputs.has(m[1])) {
        // El valor que pintó el HTML (value="…"), como lo levanta el navegador.
        const v = new RegExp(`data-acr-monto="${m[1]}"[^>]*value="([^"]*)"`).exec(lista.innerHTML)
        inputs.set(m[1], inputFalso(v ? v[1] : ''))
      }
      return inputs.get(m[1])
    }
    m = /^\[data-acr-vivo="(.+)"\]$/.exec(sel)
    if (m) {
      if (!vivos.has(m[1])) {
        const el = { textContent: '', __clases: new Set(), classList: { toggle(c, f) { if (f) el.__clases.add(c); else el.__clases.delete(c) } } }
        vivos.set(m[1], el)
      }
      return vivos.get(m[1])
    }
    return null
  }
  return { inputs, vivos, nuevaTanda() { inputs.clear(); vivos.clear() } }
}
{
  const S = armar()
  const doc = S.__doc
  const campos = conCampos(S)
  S.renderizarCheques()
  for (const id of ['v1', 'v2', 'd1', 'd2']) S.elegirEnBanco(id, true)
  // Lo escrito en una vez anterior (y cancelada) no vuelve al abrir.
  S.bancoUI.valores = new Map([['v1', '1'], ['d1', '5']])
  S.abrirAcreditar()
  chk('abrir: el panel a la vista', doc.getElementById('chq-acreditar').hidden === false && S.bancoUI.panel === 'acreditar')
  chk('… lo que viene escrito: el importe en las ventas, 0 en los depósitos', S.bancoUI.valores.get('v1') === '1.000.000' && S.bancoUI.valores.get('v2') === '250.000,50' &&
    S.bancoUI.valores.get('d1') === '0' && S.bancoUI.valores.get('d2') === '0', JSON.stringify([...S.bancoUI.valores]))
  const lista = N(doc.getElementById('chq-acr-lista').innerHTML)
  chk('cada venta con "Monto acreditado" y cada depósito con "Gastos del banco"', (lista.match(/>Monto acreditado</g) || []).length === 2 && (lista.match(/>Gastos del banco</g) || []).length === 2, lista)
  chk('… el campo con su label (for = id), teclado numérico y el valor que viene',
    /<label for="chq-acr-monto-v1">Monto acreditado<\/label>\s*<input type="text" id="chq-acr-monto-v1" class="chq-acr-monto" data-acr-monto="v1" data-acr-modo="venta" inputmode="decimal" autocomplete="off" placeholder="\$ 0" value="1\.000\.000">/.test(lista) &&
    /<label for="chq-acr-monto-d1">Gastos del banco<\/label>\s*<input type="text" id="chq-acr-monto-d1"[^>]*data-acr-modo="deposito"[^>]*value="0">/.test(lista), lista)
  chk('… y abajo lo que se dice en vivo', /data-acr-vivo="v1" aria-live="polite">Sin diferencia: no se carga gasto\.</.test(lista) && /data-acr-vivo="d1" aria-live="polite">Se acredita \$ 200\.000,00 · sin gasto</.test(lista), lista)
  chk('los campos quedan enlazados como número argentino (teclado decimal)', campos.inputs.get('v1')?.atributos?.inputmode === 'decimal' && campos.inputs.get('v1').type === 'text')
  let res = N(doc.getElementById('chq-acr-resumen').innerHTML)
  chk('el resumen como viene: total, gasto $ 0, queda todo, "Entran" por cuenta y "No se carga ningún gasto."',
    res.includes('<span>Total de los 4 cheques</span><strong>$ 1.500.000,50</strong>') && res.includes('<span>Gasto del banco</span><strong>$ 0,00</strong>') &&
    res.includes('<span>Queda en las cuentas</span><strong>$ 1.500.000,50</strong>') &&
    res.includes('Entran $ 1.450.000,50 a Macro Paz Mirta. Entran $ 50.000,00 a Macro Dolce. No se carga ningún gasto.'), res)
  chk('… sin el botón a Gastos', !/data-gastos-banco|Cargar el gasto del banco|<a /.test(res))

  // Escribir en el campo de la venta, tecla por tecla, como en el navegador.
  const i1 = campos.inputs.get('v1')
  i1.value = ''
  i1.teclear('980000')
  chk('al tipear "980000" el campo pone los puntos de miles: "980.000"', i1.value === '980.000', i1.value)
  doc.getElementById('chq-acr-error').hidden = false
  S.alEscribirAcreditar('v1', i1.value)
  chk('escribir anota lo escrito', S.bancoUI.valores.get('v1') === '980.000')
  chk('… dice en vivo la diferencia y el %', N(campos.vivos.get('v1').textContent) === 'Diferencia $ 20.000,00 (2 %) → se carga como gasto', campos.vivos.get('v1').textContent)
  chk('… saca el error de antes', doc.getElementById('chq-acr-error').hidden === true)
  S.alEscribirAcreditar('d1', '1.500')
  chk('los gastos del depósito, en vivo', N(campos.vivos.get('d1').textContent) === 'Se acredita $ 200.000,00 · gasto $ 1.500,00')
  res = N(doc.getElementById('chq-acr-resumen').innerHTML)
  chk('el resumen suma los gastos ($ 21.500) y dice lo que queda en las cuentas',
    res.includes('<span>Gasto del banco</span><strong>$ 21.500,00</strong>') && res.includes('<span>Queda en las cuentas</span><strong>$ 1.478.500,50</strong>') &&
    res.includes("El gasto se carga solo en Gastos, categoría &#39;Gastos bancarios y comisiones&#39;."), res)
  S.alEscribirAcreditar('v2', '300.000')
  chk('un monto mal: en vivo el error, marcado en rojo', /no puede ser más que el importe/.test(campos.vivos.get('v2').textContent) && campos.vivos.get('v2').__clases.has('chq-acr-fila__vivo--error'))
  res = N(doc.getElementById('chq-acr-resumen').innerHTML)
  chk('… el resumen avisa "Hay un monto para corregir." (y no suma el mal escrito)', res.includes('Hay un monto para corregir.') && res.includes('<strong>$ 21.500,00</strong>'), res)
  S.alEscribirAcreditar('v2', '250.000,50')
  chk('corregido: se va la marca', !campos.vivos.get('v2').__clases.has('chq-acr-fila__vivo--error') && !N(doc.getElementById('chq-acr-resumen').innerHTML).includes('para corregir'))
  S.alEscribirAcreditar('no-elegido', '5')
  chk('escribir en un cheque que no está elegido no anota nada', !S.bancoUI.valores.has('no-elegido'))

  // Soltar y volver a elegir: lo escrito se conserva.
  campos.nuevaTanda()
  S.elegirEnBanco('d2', false)
  S.elegirEnBanco('d2', true)
  chk('elegir o soltar otro no borra lo escrito', S.bancoUI.valores.get('v1') === '980.000' && S.bancoUI.valores.get('d1') === '1.500' && /value="980\.000"/.test(doc.getElementById('chq-acr-lista').innerHTML))

  // Confirmar con un error: no llama y lo dice.
  const llamadas = []
  esperas.push((async () => {
    S.alEscribirAcreditar('d2', '50.000')
    S.__setRpc(async (...a) => { llamadas.push(a); return { data: [], error: null } })
    await S.confirmarAcreditar()
    chk('confirmar con los gastos iguales al importe: NO llama y lo dice', llamadas.length === 0 && doc.getElementById('chq-acr-error').hidden === false &&
      N(doc.getElementById('chq-acr-error').textContent) === 'Cheque Nº 00000004: los gastos tienen que ser menos que el importe ($ 50.000,00).', doc.getElementById('chq-acr-error').textContent)
    S.alEscribirAcreditar('d2', '')
    const DATA = [
      { cuenta: 'Macro Paz Mirta', modo: 'venta', cheques: 2, bruto: 1250000.5, acreditado: 1230000.5, gastos: 20000, caja_movimiento_id: 'm1', gasto_id: 'g-v"1' },
      { cuenta: 'Macro Paz Mirta', modo: 'deposito', cheques: 1, bruto: 200000, acreditado: 200000, gastos: 1500, caja_movimiento_id: 'm1', gasto_id: 'g-d1' },
      { cuenta: 'Macro Dolce', modo: 'deposito', cheques: 1, bruto: 50000, acreditado: 50000, gastos: 0, caja_movimiento_id: 'm2', gasto_id: null },
    ]
    S.__setRpc(async (...a) => { llamadas.push(a); return { data: DATA, error: null } })
    await S.confirmarAcreditar()
    chk('confirmar: UNA llamada a acreditar_cheques con cada cheque y lo suyo', llamadas.length === 1 && llamadas[0][0] === 'acreditar_cheques' &&
      JSON.stringify(llamadas[0][1].p_items) === JSON.stringify([
        { cheque_id: 'v1', acreditado: 980000 }, { cheque_id: 'v2', acreditado: 250000.5 }, { cheque_id: 'd1', gastos: 1500 }, { cheque_id: 'd2', gastos: 0 },
      ]) && llamadas[0][1].p_fecha === S.hoyArgentina(), JSON.stringify(llamadas[0]))
    chk('… el aviso dice qué gastos creó la base (por cuenta y modo)', N(S.__llamadas.exitos.at(-1)) ===
      'Se acreditaron 4 cheques. Gastos del banco cargados: $ 20.000,00 (Macro Paz Mirta · venta), $ 1.500,00 (Macro Paz Mirta · depósito).', S.__llamadas.exitos.at(-1))
    const html = N(doc.getElementById('chq-banco-resultado-texto').innerHTML)
    chk('el resultado: lo que entró en cada cuenta (una línea por cuenta)', html.includes('<div>Entró $ 1.450.000,50 en Macro Paz Mirta</div>') && html.includes('<div>Entró $ 50.000,00 en Macro Dolce</div>'), html)
    chk('… cada gasto con su "Ver el gasto" (el id con encodeURIComponent)',
      html.includes('<div>Gasto del banco $ 20.000,00 · Macro Paz Mirta · venta <a class="chq-link-gasto" href="gastos.html?gasto=g-v%221">Ver el gasto</a></div>') &&
      html.includes('<div>Gasto del banco $ 1.500,00 · Macro Paz Mirta · depósito <a class="chq-link-gasto" href="gastos.html?gasto=g-d1">Ver el gasto</a></div>'), html)
    chk('… el renglón sin gasto no dice gasto', !/Macro Dolce · depósito/.test(html) && !/No se cargó ningún gasto/.test(html))
    chk('… el cheque de Dolce en un banco de Dolce: sin "Entre empresas"', !/Entre empresas/.test(html))
    chk('se cierra el panel, se sueltan los elegidos y se olvida lo escrito', S.bancoUI.panel === null && S.bancoUI.ids.size === 0 && S.bancoUI.valores.size === 0)
  })())
}
{
  // Sin gastos: el aviso lo dice corto.
  const S = armar()
  S.renderizarCheques()
  S.elegirEnBanco('v1', true)
  S.abrirAcreditar()
  esperas.push((async () => {
    S.__setRpc(async () => ({ data: [{ cuenta: 'Macro Paz Mirta', modo: 'venta', cheques: 1, bruto: 1000000, acreditado: 1000000, gastos: 0, caja_movimiento_id: 'm', gasto_id: null }], error: null }))
    await S.confirmarAcreditar()
    chk('sin gastos: "Se acreditó 1 cheque. No se cargó ningún gasto del banco."', N(S.__llamadas.exitos.at(-1)) === 'Se acreditó 1 cheque. No se cargó ningún gasto del banco.', S.__llamadas.exitos.at(-1))
    chk('… y el resultado también', N(S.__doc.getElementById('chq-banco-resultado-texto').innerHTML).includes('<div>No se cargó ningún gasto del banco.</div>'))
  })())
}

// ═════════════════════════════════════════════════════════════════════════
// 6. EL TEXTO DE LOS GASTOS Y EL RESULTADO, ESCAPADOS
// ═════════════════════════════════════════════════════════════════════════
{
  const S = armar()
  chk('textoGastosAcreditar sin respuesta: nada', S.textoGastosAcreditar(null) === '' && S.textoGastosAcreditar(undefined) === '')
  chk('… sin renglones o todos en 0: "No se cargó ningún gasto del banco."', S.textoGastosAcreditar([]) === 'No se cargó ningún gasto del banco.' &&
    S.textoGastosAcreditar([{ cuenta: 'A', modo: 'venta', gastos: 0 }]) === 'No se cargó ningún gasto del banco.')
  chk('… un gasto: "Gastos del banco cargados: $ 1,50 (A · depósito)."', N(S.textoGastosAcreditar([{ cuenta: 'A', modo: 'deposito', gastos: 1.5 }])) === 'Gastos del banco cargados: $ 1,50 (A · depósito).')
  const malo = S.htmlResultadoAcreditar([{ cuenta: marca('cuenta'), modo: marca('modo'), bruto: 10, gastos: 1, gasto_id: marca('gid') }], [], new Map(), new Map(), new Map())
  chk('el resultado: la cuenta escapada y el id del gasto con encodeURIComponent', !malo.includes(cruda('cuenta')) && malo.includes(escapada('cuenta')) &&
    malo.includes('href="gastos.html?gasto=%22%3E%3Cb%20data-xss%3D%22gid%22%3E"') && !malo.includes(cruda('gid')), malo)
  chk('… un modo raro se dice "depósito" (no se pinta lo que vino)', N(malo).includes('· depósito') && !malo.includes('data-xss="modo"'))
  chk('sin respuesta de la base: no dice nada', S.htmlResultadoAcreditar(null, [], new Map(), new Map(), new Map()) === '')
  const conOtra = N(S.htmlResultadoAcreditar([{ cuenta: 'Macro Paz Mirta', modo: 'deposito', bruto: 50000, gastos: 0, gasto_id: null }],
    [ch(S, 'd2')].map(x => ({ ...x, salida_cuenta_id: 'k-macro' })), S.estado.cobranzas, S.estado.cuentasBanco.porId, S.estado.nombresUnidades))
  chk('un cheque de Dolce en un banco de Nuss: "quedan en «Entre empresas»"', conOtra.includes('Los cheques de Dolce Pasta ($ 50.000,00) entraron en un banco de otra fábrica: quedan en «Entre empresas».'), conOtra)
  const fabMala = S.htmlResultadoAcreditar([{ cuenta: 'A', modo: 'deposito', bruto: 1, gastos: 0, gasto_id: null }],
    [{ cobranza_id: 'cx', salida_cuenta_id: 'k-macro', importe: 5 }], new Map([['cx', { unidad_negocio_id: U_DOLCE, unidad_negocio_nombre: marca('fab') }]]), S.estado.cuentasBanco.porId, new Map())
  chk('… el nombre de la fábrica va escapado', !fabMala.includes(cruda('fab')) && fabMala.includes(escapada('fab')), fabMala)
  S.estado.bancos = new Map([['072', marca('banco')]])
  const vivoMalo = S.htmlFilaAcreditar({ id: marca('id'), numero: marca('num'), banco_codigo: '072', importe: 5, salida_modo: 'venta' }, marca('texto'))
  chk('el renglón del campo: el id, el número, el banco y lo escrito van escapados', !['id', 'num', 'texto', 'banco'].some(k => vivoMalo.includes(cruda(k))) &&
    vivoMalo.includes(`value="&quot;&gt;${escapada('texto')}"`) && vivoMalo.includes(escapada('banco')), vivoMalo)
  S.estado.bancos = new Map()
}

// ═════════════════════════════════════════════════════════════════════════
// 7. "VER EL GASTO" TAMBIÉN EN UN DEPOSITADO
// ═════════════════════════════════════════════════════════════════════════
{
  const S = armar()
  const dep = { id: 'x', estado: 'depositado', salida_fecha: '2026-10-28', salida_cuenta_id: 'k-macro', importe: 200000, venta_neto: null, venta_gasto_id: 'g-dep' }
  chk('un depositado con gasto del banco: "Ver el gasto"', S.htmlLinkGastoVenta(dep) === '<a class="chq-link-gasto" href="gastos.html?gasto=g-dep">Ver el gasto</a>', S.htmlLinkGastoVenta(dep))
  chk('… sin gasto: nada', S.htmlLinkGastoVenta({ ...dep, venta_gasto_id: null }) === '')
  chk('un vendido con gasto: también', /gastos\.html\?gasto=g-v/.test(S.htmlLinkGastoVenta({ ...dep, estado: 'vendido', venta_gasto_id: 'g-v' })))
  chk('en el banco, endosado o rechazado: nunca (aunque traiga un id)', ['en_banco', 'endosado', 'rechazado', 'en_cartera'].every(e => S.htmlLinkGastoVenta({ ...dep, estado: e }) === ''))
  const fila = S.htmlSalidaCheque(dep, S.estado.cobranzas.get('cn'))
  chk('… y la lista lo pinta en la salida del depositado', /Depositado el 28\/10 · Macro Paz Mirta/.test(fila) && /href="gastos\.html\?gasto=g-dep">Ver el gasto/.test(fila), fila)
}

// ═════════════════════════════════════════════════════════════════════════
// 8. LO QUE SE FUE Y LOS BOTONES DEL ENVÍO
// ═════════════════════════════════════════════════════════════════════════
{
  chk('no queda el botón "Cargar el gasto del banco" (data-gastos-banco) ni su CSS', !/data-gastos-banco|Cargar el gasto del banco|chq-gastos-banco/.test(FUENTE))
  chk('… ni las funciones que lo armaban', !/function htmlGastosBanco|function unidadUnicaDe|CATEGORIA_GASTOS_BANCARIOS/.test(JS))
  chk('los botones del envío dicen "Depositar" y "Vender"', /data-salida-tipo="depositado">Depositar<\/button>/.test(FUENTE) && /data-salida-tipo="vendido">Vender[^<]*<\/button>/.test(FUENTE))
  chk('el campo se escucha en la lista (input) y llama a alEscribirAcreditar con el id y lo escrito',
    /getElementById\('chq-acr-lista'\)\.addEventListener\('input', \(ev\) => \{\n\s+const t = ev\.target\?\.closest\?\.\('\[data-acr-monto\]'\)\n\s+if \(t\) alEscribirAcreditar\(t\.dataset\.acrMonto, t\.value\)/.test(JS))
  chk('confirmar manda lo escrito (bancoUI.valores) y avisa los gastos', /supabase\.rpc\('acreditar_cheques', parametrosAcreditar\(cheques, fecha, bancoUI\.valores\)\)/.test(JS) &&
    /erroresAcreditar\(cheques, fecha, hoyArgentina\(\), bancoUI\.valores\)/.test(JS) && /mostrarExito\(`\$\{acreditados\} \$\{textoGastosAcreditar\(data\)\}`\.trim\(\)\)/.test(JS))
  chk('los montos se leen con el parser argentino de js/utils.js (leerNumeroAr importado, ningún parseFloat)',
    /import \{[^}]*\bleerNumeroAr\b[^}]*\} from '\.\.\/js\/utils\.js'/.test(JS) && !/parseFloat|Number\(t\)|Number\(texto\)/.test(JS.slice(JS.indexOf('function cuentaAcreditar'), JS.indexOf('function vivoAcreditar'))))
}

Promise.all(esperas.map(p => p.catch(err => chk('rama async sin excepción', false, String(err && err.stack || err))))).then(() => {
  for (const f of fallas) console.log('  ✗ ' + f)
  console.log(`${ok}/${ok + fallas.length}${fallas.length ? '  ROJO' : '  verde'}`)
  process.exit(fallas.length ? 1 : 0)
})
