// Parte 7 del módulo Cheques (22/09/2026): selección con resumen.
//
// "Seleccionar" pone una casilla en cada cheque; tocar el cheque lo marca o lo
// desmarca (Shift + clic marca el tramo). Abajo, una barra fija dice
// "N cheques · $ TOTAL · plazo X días (ponderado Y)" y "Vencen pronto: M".
// Días de cada cheque = máx(0, fecha de pago − hoy); simple = promedio;
// ponderado = Σ(días × importe) / Σ importe; los dos redondeados.
//
//   node pruebas/test-cheques-seleccion.js

const fs = require('fs')
const path = require('path')
const { construirCheques } = require('./sandbox-cheques')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/cheques.html')
const FUENTE = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${FUENTE.length} bytes)`)
const CSS = FUENTE.slice(FUENTE.indexOf('<style>'), FUENTE.indexOf('</style>'))
const SCRIPT = FUENTE.slice(FUENTE.indexOf('<script type="module">'))

let ok = 0
const fallas = []
function chk(nombre, cond, detalle) { if (cond) ok++; else fallas.push(nombre + (detalle !== undefined ? ` — ${detalle}` : '')) }

const hoy = '2026-09-22'
const mas = (d, base = hoy) => { const x = new Date(base + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + d); return x.toISOString().slice(0, 10) }
const dif = (id, importe, dias, extra = {}) => ({ id, cobranza_id: 'c', numero: id, banco_codigo: '007', tipo: 'diferido',
  fecha_emision: mas(-100), fecha_pago: mas(dias), importe, estado: 'en_cartera', ...extra })

// ── Las cuentas ─────────────────────────────────────────────────────────
{
  const S = construirCheques(ARCHIVO)
  const r1 = S.resumenSeleccion([dif('a', 100000, 0), dif('b', 4000000, 60)], hoy)
  chk('$100.000 a 0 días y $4.000.000 a 60: simple 30', r1.simple === 30, r1.simple)
  chk('… y ponderado 59', r1.ponderado === 59, r1.ponderado)
  chk('… total $4.100.000', r1.total === 4100000 && r1.cantidad === 2)
  const r2 = S.resumenSeleccion([dif('a', 500, 0), dif('b', 500, 8)], hoy)
  chk('mismo importe a 0 y a 8: simple 4 y ponderado 4', r2.simple === 4 && r2.ponderado === 4, JSON.stringify(r2))
  const r3 = S.resumenSeleccion([dif('a', 1000, -10), dif('b', 1000, 10)], hoy)
  chk('uno con la fecha de pago PASADA cuenta 0, no -10 (simple 5, no 0)', r3.simple === 5 && r3.ponderado === 5, JSON.stringify(r3))
  chk('diasHastaCobro: uno vencido da 0', S.diasHastaCobro(dif('x', 1, -30), hoy) === 0)
  chk('diasHastaCobro: uno común (a la vista) da 0', S.diasHastaCobro({ tipo: 'comun', fecha_emision: mas(-3), fecha_pago: mas(20) }, hoy) === 0)
  chk('diasHastaCobro: un diferido sin fecha de pago da 0 (no NaN)', S.diasHastaCobro({ tipo: 'diferido', fecha_pago: null }, hoy) === 0)
  const r4 = S.resumenSeleccion([dif('a', 1.1, 1), dif('b', 2.2, 1), dif('c', 0.29, 1)], hoy)
  chk('el total se suma en centavos (3,59 exacto)', r4.total === 3.59, r4.total)
  const r5 = S.resumenSeleccion([], hoy)
  chk('sin nada elegido: cero cheques, sin plazo inventado', r5.cantidad === 0 && r5.simple === null && r5.ponderado === null)
  const rRed = S.resumenSeleccion([dif('a', 100, 0), dif('b', 100, 5)], hoy)
  chk('redondeado a días enteros (2,5 → 3)', rRed.simple === 3 && rRed.ponderado === 3, JSON.stringify(rRed))
  const r6 = S.resumenSeleccion([dif('a', 0, 5)], hoy)
  chk('sin importe no hay con qué ponderar: "—", no un cero', r6.ponderado === null && r6.simple === 5)
  // Vencen pronto: el plazo es pago + 30. Pago hace 25 días → vence en 5.
  const r7 = S.resumenSeleccion([dif('a', 1, -25), dif('b', 1, 40), dif('c', 1, -25, { estado: 'depositado' })], hoy)
  chk('cuenta los que vencen pronto (solo en cartera)', r7.vencenPronto === 1, r7.vencenPronto)

  chk('texto: "2 cheques · $ 4.100.000,00 · plazo 30 días (ponderado 59)"',
    S.textoResumenSeleccion(r1) === '2 cheques · $ 4.100.000,00 · plazo 30 días (ponderado 59)', S.textoResumenSeleccion(r1))
  chk('texto: singular y un día', S.textoResumenSeleccion({ cantidad: 1, total: 5, simple: 1, ponderado: 1 }) === '1 cheque · $ 5,00 · plazo 1 día (ponderado 1)')
  chk('texto: sin ponderado dice —', /\(ponderado —\)/.test(S.textoResumenSeleccion(r6)))
}

// ── Marcar, desmarcar y el tramo con Shift ───────────────────────────────
function elementoFalso(id, tag = 'TR') {
  const clases = new Set(), attrs = {}, handlers = {}
  const casilla = { checked: false, matches: (s) => s === '[data-elegir-cheque]' }
  return {
    tagName: tag, dataset: { chequeFila: id, chequeCobranza: 'cob-' + id }, casilla, handlers,
    classList: { toggle(c, f) { if (f) clases.add(c); else clases.delete(c) }, contains: (c) => clases.has(c) },
    setAttribute(k, v) { attrs[k] = v }, attrs,
    querySelector: (s) => s === '[data-elegir-cheque]' ? casilla : null,
    addEventListener(t, f) { handlers[t] = f },
  }
}
{
  const S = construirCheques(ARCHIVO)
  S.estado.filas = ['a', 'b', 'c', 'd', 'e'].map((x, i) => dif(x, (i + 1) * 100, i * 10))
  S.estado.cobranzas = new Map([['c', { id: 'c', cliente: 'A', estado: 'procesada', fecha: mas(-100) }]])
  const els = S.estado.filas.map(ch => elementoFalso(ch.id))
  S.__doc.querySelectorAll = (sel) => sel === '[data-cheque-fila]' ? els : []

  S.activarSeleccion()
  chk('Seleccionar: la selección queda activa y vacía', S.estado.seleccion.activa === true && S.estado.seleccion.ids.size === 0)
  chk('Seleccionar: la barra de abajo aparece', S.__doc.getElementById('chq-barra-seleccion').hidden === false)
  chk('Seleccionar: el botón dice que está activo', S.__doc.getElementById('chq-btn-seleccionar').getAttribute('aria-pressed') === 'true')
  chk('Seleccionar: sin nada elegido, la barra lo dice', S.__doc.getElementById('chq-sel-resumen').textContent === 'Tocá los cheques para elegirlos.')
  const tabla = S.__doc.getElementById('chq-tabla').innerHTML
  chk('Seleccionar: una casilla por cheque en la tabla', (tabla.match(/data-elegir-cheque=/g) || []).length === 5)
  chk('Seleccionar: y en las tarjetas del celular', (S.__doc.getElementById('chq-lista').innerHTML.match(/data-elegir-cheque=/g) || []).length === 5)
  chk('Seleccionar: la casilla dice qué cheque es', /aria-label="Elegir el cheque Nº b"/.test(tabla))

  S.tocarParaElegir('b', false)
  chk('tocar: marca', S.estado.seleccion.ids.has('b'))
  chk('tocar: la fila marcada lleva la clase y la casilla tildada, sin redibujar',
    els[1].classList.contains('chq-tabla__fila--elegida') && els[1].casilla.checked === true && els[1].attrs['aria-selected'] === 'true')
  S.tocarParaElegir('d', true)
  chk('Shift + clic: marca el TRAMO desde el último tocado (b..d)', ['b', 'c', 'd'].every(x => S.estado.seleccion.ids.has(x)) && S.estado.seleccion.ids.size === 3,
    [...S.estado.seleccion.ids].join())
  S.tocarParaElegir('c', false)
  chk('tocar otra vez: desmarca', !S.estado.seleccion.ids.has('c') && S.estado.seleccion.ids.size === 2)
  chk('la barra resume lo elegido (b y d)', S.__doc.getElementById('chq-sel-resumen').textContent.startsWith('2 cheques · $ 600,00'),
    S.__doc.getElementById('chq-sel-resumen').textContent)

  // Reordenar mantiene la selección.
  S.aplicarOrden({ campo: 'importe', sentido: 'desc' })
  chk('reordenar mantiene la selección', S.estado.seleccion.ids.size === 2 && S.estado.seleccion.ids.has('b') && S.estado.seleccion.ids.has('d'))
  chk('y la lista redibujada sigue marcada', /class="chq-tabla__fila--elegida" data-cheque-fila="d"/.test(S.__doc.getElementById('chq-tabla').innerHTML))

  // Un filtro la limpia, con un aviso chico.
  S.__doc.getElementById('chq-aviso-seleccion').hidden = true
  S.soltarSeleccionPorFiltro()
  chk('cambiar un filtro limpia la selección', S.estado.seleccion.ids.size === 0 && S.estado.seleccion.activa === true)
  chk('… con un aviso chico', S.__doc.getElementById('chq-aviso-seleccion').hidden === false &&
    /Se limpió la selección porque cambiaste un filtro/.test(S.__doc.getElementById('chq-aviso-seleccion').textContent))
  const avisoAntes = S.__doc.getElementById('chq-aviso-seleccion')
  avisoAntes.hidden = true
  S.soltarSeleccionPorFiltro()
  chk('sin nada elegido no hay aviso', avisoAntes.hidden === true)

  S.tocarParaElegir('a', false)
  S.cancelarSeleccion()
  chk('Cancelar: limpia y cierra la barra', S.estado.seleccion.activa === false && S.estado.seleccion.ids.size === 0 &&
    S.__doc.getElementById('chq-barra-seleccion').hidden === true)
  chk('Cancelar: sin casillas', !/data-elegir-cheque/.test(S.__doc.getElementById('chq-tabla').innerHTML))
  S.tocarParaElegir('a', false)
  chk('sin la selección activa, tocar no elige', S.estado.seleccion.ids.size === 0)
}

// ── La casilla, escapada ──────────────────────────────────────────────────
{
  const S = construirCheques(ARCHIVO)
  const marca = (c) => `"><b data-xss="${c}">`
  S.estado.seleccion = { activa: true, ids: new Set(), ultimo: null }
  const h = S.htmlCasillaElegir({ id: marca('sel_id'), numero: marca('sel_num') })
  chk('casilla: ninguna marca cruda', !/<b data-xss=/.test(h), h)
  chk('casilla: el id y el número escapados', h.includes('&lt;b data-xss=&quot;sel_id&quot;&gt;') && h.includes('&lt;b data-xss=&quot;sel_num&quot;&gt;'))
}

// ── Tocar la fila: elige (no abre la cobranza) con la selección activa ────
{
  const S = construirCheques(ARCHIVO, { stubs: [] })
  S.estado.filas = [dif('a', 1, 1)]
  const el = elementoFalso('a')
  const cont = { querySelectorAll: (s) => s === '[data-cheque-fila]' ? [el] : [] }
  S.__doc.querySelectorAll = () => [el]
  S.conectarFilas(cont)
  el.handlers.click({ shiftKey: false, target: {}, preventDefault() {} })
  chk('sin selección, tocar la fila abre la cobranza', S.__llamadas.abrirCobranza === 'cob-a')
  S.__llamadas.abrirCobranza = null
  S.estado.seleccion = { activa: true, ids: new Set(), ultimo: null }
  el.handlers.click({ shiftKey: false, target: {}, preventDefault() {} })
  chk('con selección, tocar la fila la ELIGE y no abre la cobranza', S.estado.seleccion.ids.has('a') && S.__llamadas.abrirCobranza === null)
  let prevenido = false
  el.handlers.click({ shiftKey: false, target: el.casilla, preventDefault() { prevenido = true } })
  chk('tocar la casilla misma: decide la fila (desmarca) y no se cambia dos veces', !S.estado.seleccion.ids.has('a') && prevenido)
}

// ── Escape, filtros y CSS ────────────────────────────────────────────────
{
  chk('Escape limpia la selección cuando no hay un diálogo abierto',
    /else if \(estado\.seleccion\.activa\) cancelarSeleccion\(\)/.test(SCRIPT))
  const llamadas = (SCRIPT.match(/soltarSeleccionPorFiltro\(\)/g) || []).length
  chk('cada cambio de filtro limpia la selección (estado, número, banco, unidad, limpiar, vencen)', llamadas === 7, llamadas)
  chk('reordenar NO la limpia', !/function aplicarOrden\([^)]*\) \{[^}]*soltarSeleccionPorFiltro/.test(SCRIPT))
  const posVence = CSS.indexOf('.chq-tabla__fila--vence td {')
  const posElegida = CSS.indexOf('.chq-tabla__fila--elegida td {')
  chk('css: la selección va DESPUÉS de la marca de vencimiento (le gana el fondo)', posVence > 0 && posElegida > posVence)
  chk('css: lo elegido con --naranja-suave', /\.chq-tabla__fila--elegida td \{ background: var\(--naranja-suave\); \}/.test(CSS))
  chk('css: la tarjeta elegida también, y después de la de vencimiento',
    CSS.indexOf('.chq-tarjeta--elegida {') > CSS.indexOf('.chq-tarjeta--vence {') && /\.chq-tarjeta--elegida \{ background: var\(--naranja-suave\); \}/.test(CSS))
  const barra = (CSS.match(/\.chq-barra \{([^}]*)\}/) || [])[1] || ''
  chk('css: la barra está fija abajo', /position: fixed/.test(barra) && /bottom: 0/.test(barra))
  chk('css: y respeta el safe-area', /env\(safe-area-inset-bottom/.test(barra))
  chk('css: la lista no queda tapada por la barra', /body\.chq-con-barra \.chq-contenedor \{ padding-bottom: calc\(/.test(CSS))
  chk('css: los botones de la barra miden 44px', /\.chq-barra__acciones \.chq-btn \{ min-height: 44px; \}/.test(CSS))
}

for (const f of fallas) console.log('  ✗ ' + f)
console.log(`${ok}/${ok + fallas.length}${fallas.length ? '  ROJO' : '  verde'}`)
process.exit(fallas.length ? 1 : 0)
