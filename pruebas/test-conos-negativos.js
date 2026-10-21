// Suite: Conos de papel — por ahora NO se muestra el stock negativo
// (21/10/2026, pedido de Facu: "no mostrar negativos hasta terminar de armar
// los conos"). Lo controla UNA constante, MOSTRAR_NEGATIVOS_CONOS:
//   - en false (hoy): un negativo se ve 0 y sin el bordó (en Stock, en
//     "Todos los conos" y en el conteo), no hay aviso de "Stock negativo",
//     no cuenta como "pocos" y su "Alcanza" dice "—" sin rojo;
//   - en true: vuelve lo de antes (se prueba con una copia con la constante en true).
// Se EJECUTA el código real de modulos/conos.html.
//
//   node pruebas/test-conos-negativos.js
//   ARCHIVO_TEST=otra-copia.html node pruebas/test-conos-negativos.js
'use strict'

const path = require('path')
const fs = require('fs')
const { construirCon } = require('./sandbox')
const { arnes } = require('./circuito-comun')
const { fuenteNumeros } = require('./numeros-comun')
const DATOS = require('./datos-maqueta/conos')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/conos.html')
const FUENTE = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${FUENTE.length} bytes)`)
const { chk, fin } = arnes()

const PRELUDIO = `
  ${fuenteNumeros()}
  var __els = {}
  var document = { getElementById(id) { return __els[id] ?? (__els[id] = { innerHTML: '', hidden: false }) } }
  var estado = { conos: [], stockTodos: false, buscarStock: '', perm: { ver: true, pedir: true }, conoPorId: new Map() }
  var __modal = null
  function abrirModal(titulo, html) { __modal = { titulo, html } }
  function nombreCono(id) { return estado.conoPorId.get(id)?.cono ?? '' }
`
const FUNCIONES = ['esc', 'miles', 'normalizarBusqueda', 'permisosDe', 'diasAlcanza', 'textoAlcanza', 'stockVisible', 'stockEnRojo',
  'alcanzaDeFila', 'alertasStock', 'conoEnUso', 'puedeTocar', 'porQueNoSePuede', 'textoGuardado', 'mensajeDe', 'htmlFilaTodos',
  'pintarStock', 'abrirConteoAjuste']
const CONSTANTES = ['DIAS_AVISO', 'MOSTRAR_NEGATIVOS_CONOS', 'ETIQUETA_ALTA', 'INTERRUPTORES']
const ANCLA = 'const MOSTRAR_NEGATIVOS_CONOS = false'

function sandbox(mostrar) {
  return construirCon(ARCHIVO, {
    preludio: PRELUDIO, funciones: FUNCIONES, constantes: CONSTANTES,
    retorno: `MOSTRAR_NEGATIVOS_CONOS, estado, __els, __modal: () => __modal`,
    recortar: mostrar ? (t => t.replace(ANCLA, 'const MOSTRAR_NEGATIVOS_CONOS = true')) : null,
  })
}

chk('la constante existe una sola vez y hoy está en false', FUENTE.split(ANCLA).length === 2)
chk('con el comentario TEMPORAL del pedido de Facu', /TEMPORAL \(21\/10\/2026, pedido de Facu\): no mostrar negativos hasta\s*\/\/ terminar de armar los conos/.test(FUENTE))

const CONOS = DATOS.rpc.conos_stock.map(f => ({ ...f }))
const fibro = CONOS.find(f => f.cono === 'FIBRO')
chk('en los datos FIBRO tiene stock negativo (-2.000)', Number(fibro?.stock) === -2000)

// ── Hoy (false): no se muestran ─────────────────────────────────────────────
{
  const S = sandbox(false)
  chk('la constante en false', S.MOSTRAR_NEGATIVOS_CONOS === false)
  chk('un negativo se ve 0', S.stockVisible(-2000) === 0 && S.stockVisible('-5') === 0)
  chk('… un positivo, un cero y un dato ausente no cambian', S.stockVisible(42000) === 42000 && S.stockVisible(0) === 0 && S.stockVisible(null) === null)
  chk('ningún stock va en bordó', S.stockEnRojo(-2000) === false)
  const { negativos, pocos } = S.alertasStock(CONOS)
  chk('sin aviso de negativos', negativos.length === 0)
  chk('un negativo NO cuenta como "pocos" (queda CASERATO)', pocos.map(f => f.cono).join() === 'CASERATO', pocos.map(f => f.cono).join())
  const a = S.alcanzaDeFila(fibro)
  chk('"Alcanza" con negativo: "—" y sin rojo', a.texto === '—' && a.bajo === false, JSON.stringify(a))
  const cas = S.alcanzaDeFila(CONOS.find(f => f.cono === 'CASERATO'))
  chk('un cono con pocos días sigue en rojo', cas.bajo === true && /20 días/.test(cas.texto), JSON.stringify(cas))
  const sinConsumo = S.alcanzaDeFila({ stock: 10000, consumo_30d: 0 })
  chk('sin consumo: "sin consumo" y sin rojo', sinConsumo.texto === 'sin consumo' && sinConsumo.bajo === false)
  const cero = S.alcanzaDeFila({ stock: 0, consumo_30d: 4000 })
  chk('stock en cero con consumo: "no alcanza" y en rojo', cero.texto === 'no alcanza' && cero.bajo === true)

  // La pantalla de Stock entera.
  S.estado.conos = CONOS
  S.pintarStock()
  const alertas = S.__els['cn-stock-alertas'].innerHTML
  chk('Stock: no aparece el aviso "Stock negativo"', !/Stock negativo/.test(alertas), alertas)
  chk('Stock: el aviso de "pocos" sigue (CASERATO), sin FIBRO', /Alcanzan para menos de 30 días: CASERATO \(~20 días\)/.test(alertas) && !/FIBRO/.test(alertas), alertas)
  const lista = S.__els['cn-stock-lista'].innerHTML
  const filaFibro = lista.split('<div class="cn-stock-fila"').find(x => x.includes('FIBRO')) ?? ''
  chk('Stock: FIBRO se ve con 0', /<small>Stock<\/small>0<\/span>/.test(filaFibro), filaFibro.slice(0, 400))
  chk('Stock: sin "-2.000" en ningún lado', !/-2\.000/.test(lista))
  chk('Stock: FIBRO sin bordó (ni el stock ni "Alcanza")', !/cn-negativo/.test(filaFibro), filaFibro)
  chk('Stock: el "Alcanza" de FIBRO dice "—"', /<small>Alcanza<\/small>—<\/span>/.test(filaFibro))
  const filaCas = lista.split('<div class="cn-stock-fila"').find(x => x.includes('CASERATO')) ?? ''
  chk('Stock: CASERATO sigue con su "Alcanza" en rojo', /cn-num cn-negativo"><small>Alcanza<\/small>~20 días/.test(filaCas), filaCas)

  // "Todos los conos" (el catálogo con el stock).
  const h = S.htmlFilaTodos({ marca_id: 'm1', cono: 'FIBRO', activa: true, stock: -2000 }, { ver: true })
  chk('Todos los conos: un negativo se ve 0, sin bordó', /class="cn-cat-stock"><small>Stock<\/small>0</.test(h) && !/cn-negativo/.test(h), h.slice(0, 300))
  chk('Todos los conos: un ausente sigue siendo "—"', />Stock<\/small>—</.test(S.htmlFilaTodos({ marca_id: 'm1', cono: 'X', activa: true, stock: null }, { ver: true })))

  // El conteo / ajuste: "Stock según el sistema".
  S.estado.conoPorId = new Map([['m-f', { cono: 'FIBRO', stock: -2000 }]])
  S.abrirConteoAjuste('m-f', 'conteo')
  chk('el conteo dice "Stock según el sistema: 0"', /Stock según el sistema: <b>0<\/b>/.test(S.__modal()?.html ?? ''), S.__modal()?.html?.slice(0, 120))
}

// ── Con la constante en true: vuelve lo de antes ────────────────────────────
{
  const S = sandbox(true)
  chk('(copia) la constante en true', S.MOSTRAR_NEGATIVOS_CONOS === true)
  chk('true: el negativo se ve tal cual', S.stockVisible(-2000) === -2000 && S.stockEnRojo(-2000) === true)
  const { negativos, pocos } = S.alertasStock(CONOS)
  chk('true: FIBRO en negativos', negativos.map(f => f.cono).join() === 'FIBRO')
  chk('true: CASERATO en pocos (el negativo no se repite ahí)', pocos.map(f => f.cono).join() === 'CASERATO')
  chk('true: "Alcanza" con negativo "no alcanza" en rojo', JSON.stringify(S.alcanzaDeFila(fibro)) === JSON.stringify({ texto: 'no alcanza', bajo: true }))
  S.estado.conos = CONOS
  S.pintarStock()
  chk('true: vuelve el aviso "Stock negativo: FIBRO (-2.000)"', /Stock negativo: FIBRO \(-2\.000\)/.test(S.__els['cn-stock-alertas'].innerHTML))
  const filaFibro = S.__els['cn-stock-lista'].innerHTML.split('<div class="cn-stock-fila"').find(x => x.includes('FIBRO')) ?? ''
  chk('true: FIBRO con -2.000 en bordó', /cn-num cn-negativo"><small>Stock<\/small>-2\.000/.test(filaFibro), filaFibro.slice(0, 300))
  chk('true: Todos los conos en bordó', /cn-cat-stock cn-negativo"><small>Stock<\/small>-2\.000/.test(S.htmlFilaTodos({ marca_id: 'm1', cono: 'FIBRO', activa: true, stock: -2000 }, { ver: true })))
  S.estado.conoPorId = new Map([['m-f', { cono: 'FIBRO', stock: -2000 }]])
  S.abrirConteoAjuste('m-f', 'conteo')
  chk('true: el conteo dice -2.000', /Stock según el sistema: <b>-2\.000<\/b>/.test(S.__modal()?.html ?? ''))
}

fin()
