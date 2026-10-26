// IMPRIMIR EN EL IPHONE Y EL PDF CON LAS DOS COPIAS (26/10/2026, rama
// ci-prueba/imprimir-iphone). Safari del iPhone ignora window.print() si no se
// llama pegado al toque, y la Carga y Administración hacían `await armarHoja`
// (hasta 3 s) ANTES de imprimir. Lo que se prueba:
//  1. js/retiros-comun.js (las funciones REALES, con un armarHoja de mentira
//     que se termina cuando la prueba quiere): prepararHoja arma la hoja en
//     segundo plano una vez por orden y una vieja nunca pisa a la nueva;
//     imprimirHoja imprime en el MISMO tick si la hoja de esa orden está lista,
//     y si no, en el iPhone muestra "Listo, imprimir" (que imprime en su
//     toque) y en los demás imprime al terminar; esIos.
//  2. La Carga (modulos/retiros.html) y Administración: la hoja se arma al
//     mostrar la orden y el click imprime sin ningún await (ejecutado con el
//     sandbox de cada pantalla); la división, después de guardar, en el iPhone
//     pide "Listo, imprimir"; la nota de débito imprime en el toque.
//  3. El PDF: original Y duplicado, como la impresión (media hoja: una página
//     con las dos copias y la línea de corte; hojas enteras: cada copia en sus
//     hojas), con el generarPdf real y un html2canvas/jsPDF de mentira.
//
//   node pruebas/test-retiros-imprimir-iphone.js
//   ARCHIVO_COMUN_RETIROS=<copia del común>  ARCHIVO_TEST=<copia de retiros.html>  ARCHIVO_ADMIN=<copia de administracion.html>
'use strict'

const fs = require('fs')
const path = require('path')
const { extraerFn, extraerConst } = require('./extraer')
const { RUTA_COMUN_RETIROS } = require('./fuente-cobranzas')
const { construirRetiros } = require('./sandbox-retiros')
const { arnes } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos', 'retiros.html')
const ADMIN = process.env.ARCHIVO_ADMIN || path.join(__dirname, '..', 'modulos', 'administracion.html')
const COMUN = fs.readFileSync(RUTA_COMUN_RETIROS, 'utf8')
console.log(`ARCHIVO ${RUTA_COMUN_RETIROS} (${COMUN.length} bytes)`)
console.log(`ARCHIVO ${ARCHIVO} (${fs.readFileSync(ARCHIVO, 'utf8').length} bytes)`)
console.log(`ARCHIVO ${ADMIN} (${fs.readFileSync(ADMIN, 'utf8').length} bytes)`)
const { chk, esperas, fin } = arnes()

// ═══ 1. El común, con un armarHoja de mentira ═══════════════════════════════
const FUNCIONES_COMUN = ['escHoja', 'nuevaImpresion', 'claveHoja', 'hojaLista', 'olvidarHoja', 'prepararHoja', 'esIos', 'imprimirHoja',
  'mostrarListoParaImprimir', 'asegurarEstilosListo']
function comun() {
  const src = COMUN.replace(/^import .*$/gm, '').replace(/^export (?=(async )?function |const )/gm, '')
  let codigo = `
    var console = { log(){}, warn(){}, error(){} }
    // Un DOM chico: lo que se agrega al body se guarda, y un click sobre un
    // botón del cartel corre el listener de la caja con ese botón de target.
    function nuevoEl(tag) {
      const el = { tag, id: '', className: '', innerHTML: '', textContent: '', atributos: {}, hijos: [], escuchas: [],
        setAttribute(k, v) { this.atributos[k] = String(v) }, focus() { __foco.push(this.id || this.tag) },
        addEventListener(t, f) { this.escuchas.push([t, f]) }, appendChild(h) { this.hijos.push(h); h.padre = this },
        remove() { if (this.padre) this.padre.hijos = this.padre.hijos.filter(x => x !== this) },
        querySelector(s) { return s === '.rh-listo__si' ? { focus() { __foco.push('listo') } } : null },
      }
      return el
    }
    var __foco = []
    var document = { head: nuevoEl('head'), body: nuevoEl('body'), createElement: nuevoEl,
      getElementById(id) { return [...this.head.hijos, ...this.body.hijos].find(x => x.id === id) ?? null } }
    var __impresiones = []
    var window = { print() { __impresiones.push('window.print') } }
    var navigator = { userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/130', platform: 'Win32', maxTouchPoints: 0 }
    var COPIAS_IMPRESION = ['ORIGINAL', 'DUPLICADO']
    // armarHoja de mentira: anota cada llamada y termina cuando la prueba dice.
    var __armadas = []
    function armarHoja(caja, orden, op) {
      return new Promise((resolve, reject) => { __armadas.push({ caja, orden, op, listo: (html) => { caja.innerHTML = html ?? ('hoja de ' + orden.codigo); resolve({ modo: 'media' }) }, falla: reject }) })
    }
  `
  for (const c of ['ESTILOS_LISTO']) codigo += extraerConst(src, c) + '\n'
  for (const f of FUNCIONES_COMUN) codigo += extraerFn(src, f) + '\n\n'
  codigo += `return { ${FUNCIONES_COMUN.join(', ')}, document, window, __impresiones, __armadas, __foco, __setNav(n) { navigator = n } }`
  return new Function(codigo)()
}
const tick = () => new Promise(r => setTimeout(r, 0))
const O1 = { codigo: 'N-0032', cliente: { nombre: 'FERNANDEZ RICARDO' }, renglones: [{ cajas: 42 }] }
const O2 = { codigo: 'N-0033', cliente: { nombre: 'OTRO' }, renglones: [{ cajas: 1 }] }

// esIos
{
  const C = comun()
  chk('esIos: iPhone', C.esIos({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1' }))
  chk('esIos: iPad', C.esIos({ userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X)' }))
  chk('esIos: el iPad que se presenta como Mac (con pantalla táctil)', C.esIos({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605', platform: 'MacIntel', maxTouchPoints: 5 }))
  chk('esIos: una Mac de verdad, no', !C.esIos({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605', platform: 'MacIntel', maxTouchPoints: 0 }))
  chk('esIos: Android, no', !C.esIos({ userAgent: 'Mozilla/5.0 (Linux; Android 14) Chrome/130 Mobile', platform: 'Linux armv8l', maxTouchPoints: 5 }))
  chk('esIos: sin navegador, no', !C.esIos(null))
}

// prepararHoja: una vez por orden, en una caja aparte, y lista al terminar.
esperas.push((async () => {
  const C = comun()
  const imp = C.nuevaImpresion()
  const cont = { innerHTML: 'vacío' }
  const p = C.prepararHoja(imp, cont, O1, { conPrecios: false, copias: ['ORIGINAL', 'DUPLICADO'], doc: C.document })
  await tick()
  chk('se arma una vez', C.__armadas.length === 1)
  chk('se arma en una caja aparte, no en el contenedor', C.__armadas[0].caja !== cont && cont.innerHTML === 'vacío')
  chk('con las opciones de la hoja', C.__armadas[0].op.conPrecios === false && JSON.stringify(C.__armadas[0].op.copias) === '["ORIGINAL","DUPLICADO"]')
  chk('todavía no está lista', !C.hojaLista(imp, O1, { conPrecios: false }))
  C.prepararHoja(imp, cont, O1, { conPrecios: false, doc: C.document })
  await tick()
  chk('la misma orden no se vuelve a armar mientras se arma', C.__armadas.length === 1)
  C.__armadas[0].listo('HOJA N-0032')
  chk('prepararHoja devuelve true al terminar', (await p) === true)
  chk('al terminar pasa al contenedor', cont.innerHTML === 'HOJA N-0032')
  chk('y queda lista para esa orden', C.hojaLista(imp, O1, { conPrecios: false }) && C.hojaLista(imp, O1))
  chk('no para otra orden, ni con precios', !C.hojaLista(imp, O2) && !C.hojaLista(imp, O1, { conPrecios: true }))
  chk('no para otras copias', !C.hojaLista(imp, O1, { copias: ['ORIGINAL'] }))
  await C.prepararHoja(imp, cont, O1, { doc: C.document })
  chk('ya lista, no se vuelve a armar', C.__armadas.length === 1)
  C.olvidarHoja(imp)
  chk('olvidarHoja: deja de estar lista', !C.hojaLista(imp, O1))
})())

// Una vieja que termina tarde nunca pisa a la nueva; la que ya no se quiere ni se arma.
esperas.push((async () => {
  const C = comun()
  const imp = C.nuevaImpresion()
  const cont = { innerHTML: '' }
  const O3 = { codigo: 'N-0034', renglones: [] }
  const p1 = C.prepararHoja(imp, cont, O1, { doc: C.document })
  await tick()
  const p2 = C.prepararHoja(imp, cont, O2, { doc: C.document })
  const p3 = C.prepararHoja(imp, cont, O3, { doc: C.document })
  await tick()
  chk('van en fila: la siguiente espera a la que se está armando', C.__armadas.length === 1)
  C.__armadas[0].listo('HOJA VIEJA')
  await p1
  chk('la primera, ya superada, termina tarde y NO pasa al contenedor', cont.innerHTML === '' && !C.hojaLista(imp, O1))
  await p2
  chk('la del medio (O2) ya no se quiere: ni se arma', C.__armadas.length === 2 && C.__armadas[1].orden === O3)
  C.__armadas[1].listo('HOJA NUEVA')
  await p3
  chk('queda la última que se pidió', cont.innerHTML === 'HOJA NUEVA' && C.hojaLista(imp, O3) && !C.hojaLista(imp, O2) && !C.hojaLista(imp, O1))
  // Olvidada mientras se arma (la división escribió el contenedor): no se pisa.
  const p4 = C.prepararHoja(imp, cont, O2, { doc: C.document })
  await tick()
  cont.innerHTML = 'LA DIVISIÓN'
  C.olvidarHoja(imp)
  C.__armadas[2].listo('HOJA O2')
  await p4
  chk('olvidada mientras se armaba: no pisa lo que se escribió', cont.innerHTML === 'LA DIVISIÓN' && !C.hojaLista(imp, O2))
  // Si falla, no queda lista.
  const p5 = C.prepararHoja(imp, cont, O1, { doc: C.document })
  await tick()
  C.__armadas[3].falla(new Error('sin letra'))
  chk('si falla, devuelve false', (await p5) === false)
  chk('y no queda lista', !C.hojaLista(imp, O1) && cont.innerHTML === 'LA DIVISIÓN')
})())

// imprimirHoja: lista → en el mismo tick, sin armar nada.
esperas.push((async () => {
  const C = comun()
  const imp = C.nuevaImpresion()
  const cont = { innerHTML: '' }
  const p = C.prepararHoja(imp, cont, O1, { doc: C.document })
  await tick()
  C.__armadas[0].listo()
  await p
  let enElTick = null
  const r = C.imprimirHoja(imp, cont, O1, { doc: C.document, ios: true, imprimir: () => { enElTick = true; C.__impresiones.push('stub') } })
  chk('lista: imprime en el MISMO tick (antes de volver)', enElTick === true && r === 'impreso')
  chk('lista: no vuelve a armar', C.__armadas.length === 1)
  chk('lista: no muestra el cartel', !C.document.getElementById('rh-listo'))
  // Sin `imprimir`: window.print().
  C.imprimirHoja(imp, cont, O1, { doc: C.document, ios: false })
  chk('por defecto llama a window.print()', C.__impresiones.at(-1) === 'window.print')
})())

// No lista, en el iPhone: "Listo, imprimir", que imprime en SU toque.
esperas.push((async () => {
  const C = comun()
  const imp = C.nuevaImpresion()
  const cont = { innerHTML: '' }
  const impresas = []
  const r = C.imprimirHoja(imp, cont, O1, { doc: C.document, ios: true, imprimir: () => impresas.push('print') })
  chk('iPhone sin hoja: devuelve "boton" y no imprime', r === 'boton' && impresas.length === 0)
  await tick()
  chk('se pone a armar la hoja de esa orden', C.__armadas.length === 1 && C.__armadas[0].orden === O1)
  chk('mientras se arma, todavía no hay cartel', !C.document.getElementById('rh-listo'))
  C.__armadas[0].listo()
  await tick(); await tick(); await tick()
  const cartel = C.document.getElementById('rh-listo')
  chk('lista: aparece el cartel "Listo, imprimir"', !!cartel && cartel.innerHTML.includes('>Listo, imprimir</button>') && cartel.innerHTML.includes('La hoja está lista.'))
  chk('el cartel no imprimió solo', impresas.length === 0)
  chk('el botón toma el foco', C.__foco.includes('listo'))
  chk('los estilos del cartel, una vez, y no salen en el papel', !!C.document.getElementById('rh-listo-estilos') && /@media print \{ \.rh-listo \{ display: none !important; \} \}/.test(C.document.getElementById('rh-listo-estilos').textContent))
  const alTocar = cartel.escuchas.find(([t]) => t === 'click')[1]
  let enElToque = false
  const original = impresas.push.bind(impresas)
  impresas.push = (x) => { enElToque = true; return original(x) }
  alTocar({ target: { closest: () => ({ dataset: { rhListo: 'imprimir' } }) } })
  chk('"Listo, imprimir" imprime EN su toque', enElToque && impresas.length === 1)
  chk('y el cartel se va', !C.document.getElementById('rh-listo'))
  // Cancelar no imprime.
  C.mostrarListoParaImprimir({ doc: C.document, imprimir: () => impresas.push('print') })
  const otro = C.document.getElementById('rh-listo')
  otro.escuchas.find(([t]) => t === 'click')[1]({ target: { closest: () => ({ dataset: { rhListo: 'cerrar' } }) } })
  chk('Cancelar no imprime y saca el cartel', impresas.length === 1 && !C.document.getElementById('rh-listo'))
  C.mostrarListoParaImprimir({ doc: C.document, imprimir: () => {} })
  C.mostrarListoParaImprimir({ doc: C.document, imprimir: () => {} })
  chk('un solo cartel por vez', C.document.body.hijos.filter(x => x.id === 'rh-listo').length === 1)
  chk('el texto del cartel va escapado', C.mostrarListoParaImprimir({ doc: C.document, imprimir: () => {}, texto: '<b>x</b>' }).innerHTML.includes('&lt;b&gt;x&lt;/b&gt;'))
})())

// No lista, en la compu o Android: imprime al terminar (como antes), sin cartel.
esperas.push((async () => {
  const C = comun()
  const imp = C.nuevaImpresion()
  const impresas = []
  const r = C.imprimirHoja(imp, { innerHTML: '' }, O1, { doc: C.document, ios: false, imprimir: () => impresas.push('print') })
  chk('fuera del iPhone: devuelve "despues"', r === 'despues' && impresas.length === 0)
  await tick()
  C.__armadas[0].listo()
  await tick(); await tick(); await tick()
  chk('fuera del iPhone: imprime apenas termina de armarse, sin cartel', impresas.length === 1 && !C.document.getElementById('rh-listo'))
  // Si falla el armado, no imprime una hoja vieja.
  const C2 = comun()
  const imp2 = C2.nuevaImpresion()
  const imp2s = []
  C2.imprimirHoja(imp2, { innerHTML: '' }, O1, { doc: C2.document, ios: true, imprimir: () => imp2s.push('print') })
  await tick()
  C2.__armadas[0].falla(new Error('x'))
  await tick(); await tick(); await tick()
  chk('si no se pudo armar: ni imprime ni muestra el cartel', imp2s.length === 0 && !C2.document.getElementById('rh-listo'))
})())

// ═══ 2. Las pantallas: la hoja se arma al mostrar la orden; el click, sin await ═
// Las funciones REALES de la Carga, con el armarHoja real del común (en el
// sandbox no hay DOM: mide "media hoja" y escribe el HTML).
const MIA = {
  orden_id: 'c21a7f9d', codigo: 'N-0032', fecha: '2026-10-26', estado: 'confirmada', cliente: 'FERNANDEZ RICARDO', transporte: null, observaciones: null,
  cargada_en: '2026-10-26T13:00:00Z',
  renglones: [{ orden: 1, tipo: 'producto', producto: 'Cucurucho grande', presentacion: 'Caja x 100', marca: null, cajas: 42, unidades: 4200, movimiento: 'retiro', item_id: 'it-1', lotes: [{ lote: '7030-1', cajas: 42 }] }],
}
const FUNCIONES_CARGA = ['impresionHoja', 'prepararHojaDe']
esperas.push((async () => {
  const S = construirRetiros(ARCHIVO, { funciones: FUNCIONES_CARGA })
  const imprimir = extraerFn(fs.readFileSync(ARCHIVO, 'utf8').slice(fs.readFileSync(ARCHIVO, 'utf8').indexOf('<script type="module">')), 'imprimirOrden')
  chk('Carga: imprimirOrden no es async ni tiene await', !/^async /.test(imprimir) && !/\bawait\b/.test(imprimir))
  S.estado.empresaId = 'u-n'
  S.estado.mis = [MIA]
  S.abrirMia('c21a7f9d')
  for (let i = 0; i < 10; i++) await tick()
  const cont = S.__doc.getElementById('rt-impresion')
  chk('Carga: al abrir la orden, la hoja ya queda armada (antes del toque)', /N-0032/.test(cont.innerHTML) && /ORIGINAL/.test(cont.innerHTML) && /DUPLICADO/.test(cont.innerHTML))
  chk('Carga: original y duplicado en una sola página (media hoja)', /rh-hoja--media/.test(cont.innerHTML) && (cont.innerHTML.match(/class="rh-pagina"/g) || []).length === 1)
  const antes = S.__impresiones()
  S.imprimirDesde('mio')
  chk('Carga: Imprimir con la hoja lista imprime en el MISMO tick', S.__impresiones() === antes + 1)
  // Reimprimir desde la fila de otra orden, sin abrirla: se arma y después imprime (en la compu).
  const OTRA = { ...MIA, orden_id: 'x2', codigo: 'N-0031' }
  S.estado.mis = [MIA, OTRA]
  S.reimprimirMia('x2')
  chk('Carga: una orden sin armar no imprime en el toque (fuera del iPhone, imprime al terminar)', S.__impresiones() === antes + 1)
  for (let i = 0; i < 10; i++) await tick()
  chk('Carga: …y al terminar de armarse, imprime esa', S.__impresiones() === antes + 2 && /N-0031/.test(cont.innerHTML))
})())

esperas.push((async () => {
  const S = construirRetiros(ARCHIVO, { funciones: FUNCIONES_CARGA })
  S.estado.empresaId = 'u-n'
  S.estado.hecho = { ordenId: 'c21a7f9d', codigo: 'N-0032', orden: MIA, cliente: { id: 'c-1', nombre: 'FERNANDEZ RICARDO', localidad: 'Rosario' }, error: null, aviso: null, faltantes: [], resueltos: {} }
  S.pintarHecho()
  for (let i = 0; i < 10; i++) await tick()
  const cont = S.__doc.getElementById('rt-impresion')
  chk('Carga, orden recién hecha: la hoja queda armada al mostrarla (con el cliente de la ficha)', /N-0032/.test(cont.innerHTML) && /Rosario/.test(cont.innerHTML))
  const antes = S.__impresiones()
  S.imprimirDesde('hecho')
  chk('Carga, orden recién hecha: Imprimir imprime en el mismo tick', S.__impresiones() === antes + 1)
})())

// Administración.
esperas.push((async () => {
  const src = fs.readFileSync(ADMIN, 'utf8')
  // Sin los comentarios: "await" en un comentario no cuenta.
  const fn = (n) => extraerFn(src.slice(src.indexOf('<script type="module">')), n).replace(/^\s*\/\/.*$/gm, '')
  chk('Administración: imprimirOrden no es async ni tiene await', !/^async /.test(fn('imprimirOrden')) && !/\bawait\b/.test(fn('imprimirOrden')))
  chk('Administración: imprimirOrden imprime con imprimirHoja (con precios)', /imprimirHoja\(impresionHoja\(\), document\.getElementById\('ad-impresion'\), ordenParaHoja\(d\), \{ conPrecios: true, copias: COPIAS_IMPRESION \}\)/.test(fn('imprimirOrden')))
  chk('Administración: pintarOrden deja armada la hoja', /prepararHojaOrden\(\)/.test(fn('pintarOrden')) && /prepararHoja\(impresionHoja\(\), document\.getElementById\('ad-impresion'\), ordenParaHoja\(d\), \{ conPrecios: true, copias: COPIAS_IMPRESION \}\)/.test(fn('prepararHojaOrden')))
  chk('Administración: la nota de débito imprime sin await y olvida la hoja de la orden', !/\bawait\b/.test(fn('imprimirNotaDebito')) && /olvidarHoja\(impresionHoja\(\)\)/.test(fn('imprimirNotaDebito')))
  chk('Administración: la división olvida la hoja de la orden', /olvidarHoja\(impresionHoja\(\)\)/.test(fn('imprimirDivision')))
  chk('Administración: después de guardar la división, en el iPhone, "Listo, imprimir"',
    /if \(despuesDeGuardar && esIos\(\)\) \{ mostrarListoParaImprimir\(/.test(fn('imprimirDivision')) && /imprimirDivision\(data, \{ despuesDeGuardar: true \}\)/.test(fn('guardarEImprimirDivision')))
})())

// ═══ 3. El PDF: las dos copias ═══════════════════════════════════════════════
esperas.push((async () => {
  chk('COPIAS_PDF: el original y el duplicado', /^export const COPIAS_PDF = \['ORIGINAL', 'DUPLICADO'\]$/m.test(COMUN))
  const S = construirRetiros(ARCHIVO)
  // (generarPdf fotografía cada .rh-pagina: la cuenta de páginas del PDF real,
  // con html2canvas y jsPDF, la mira e2e/66-imprimir-iphone.spec.js.)
  const html = S.htmlHoja({ codigo: 'N-0032', renglones: [{ cajas: 42 }] }, { copias: S.COPIAS_PDF })
  chk('PDF en media hoja: una página con las dos copias y la línea de corte', (html.match(/class="rh-pagina"/g) || []).length === 1 && html.includes('ORIGINAL<') && html.includes('DUPLICADO<') && (html.match(/class="rh-corte"/g) || []).length === 1)
  const entera = S.htmlHoja({ codigo: 'N-0099', renglones: [{ cajas: 1 }, { cajas: 2 }, { cajas: 3 }] }, { copias: S.COPIAS_PDF, plan: { modo: 'entera', paginas: [[0, 2], [2, 3]] } })
  const pags = entera.split('class="rh-pagina"').slice(1)
  chk('PDF en hojas enteras: cada copia en sus hojas (2 copias × 2 hojas)', pags.length === 4 && /ORIGINAL/.test(pags[0]) && /ORIGINAL/.test(pags[1]) && /DUPLICADO/.test(pags[2]) && /DUPLICADO/.test(pags[3]))
  chk('PDF: las páginas son las de la impresión', S.paginasHoja({ modo: 'entera', paginas: [[0, 2], [2, 3]] }, S.COPIAS_PDF) === 4 && S.paginasHoja({ modo: 'media' }, S.COPIAS_PDF) === 1)
})())

fin()
