// "Ampliar" en las cinco pantallas (06/10/2026). La ventana es UNA pieza
// (js/ampliar.js, probada por test-ampliar.js); esta suite verifica que cada
// pantalla la USA y la conecta bien:
//   Cobranzas ............ modulos/cobranzas.html        #cob-btn-ampliar
//   Gastos ............... modulos/gastos.html           #btn-ampliar-gasto (y #btn-ampliar-factura)
//   Cheques .............. modulos/administracion.html   #ad-cobranza-ampliar (la cobranza de un cheque)
//   Órdenes de retiro .... modulos/administracion.html   #ad-orden-ampliar
//   Cuentas corrientes ... modulos/cuentas-corrientes.html #btn-ampliar-pago
// Por cada una: importa crearAmpliar de ../js/ampliar.js; el botón está en el
// HTML, es único, dice "Ampliar" y nace `hidden` (si el script falla no queda
// un botón muerto); hay un crearAmpliar({ boton: <ese botón> }) que se llega a
// llamar; observa el panel que contiene al botón; pasa disponible, titulo,
// resumen, grilla y acciones; las acciones que nombra existen en el archivo; y
// el corte es el del panel (1100 px, el mismo de la lista | detalle).
// Y el CSS de main.css: la ventana arriba de los modales de los módulos, el
// fondo oscuro, la grilla y el botón.
// Lo que hace en un navegador lo mira e2e/27-ampliar.spec.js.
//
//   ARCHIVO_COBRANZAS / ARCHIVO_GASTOS / ARCHIVO_ADMINISTRACION / ARCHIVO_CC / ARCHIVO_CSS
'use strict'

const fs = require('fs')
const path = require('path')
const { arnes } = require('./circuito-comun')
const { cuerpoDesde } = require('./extraer')

const R = path.join(__dirname, '..')
function leer(variable, rel) {
  const ruta = process.env[variable] || path.join(R, rel)
  const t = fs.readFileSync(ruta, 'utf8')
  console.log(`ARCHIVO ${ruta} (${t.length} bytes)`)
  return t
}
const ARCH = {
  cobranzas: leer('ARCHIVO_COBRANZAS', 'modulos/cobranzas.html'),
  gastos: leer('ARCHIVO_GASTOS', 'modulos/gastos.html'),
  administracion: leer('ARCHIVO_ADMINISTRACION', 'modulos/administracion.html'),
  cc: leer('ARCHIVO_CC', 'modulos/cuentas-corrientes.html'),
}
const CSS = leer('ARCHIVO_CSS', 'css/main.css')
const { chk, fin } = arnes()

// Las llamadas a crearAmpliar({ ... }) de un archivo, con su texto.
function llamadas(src) {
  const out = []
  let d = 0, k
  while ((k = src.indexOf('crearAmpliar({', d)) !== -1) {
    d = k + 1
    const linea = src.lastIndexOf('\n', k)
    const sangria = src.slice(linea + 1, k).match(/^\s*/)[0].length
    try { out.push({ texto: cuerpoDesde(src, k + 'crearAmpliar('.length), en: k, sangria }) } catch { out.push({ texto: '', en: k, sangria }) }
  }
  return out
}

// ¿En qué función está la posición `en`? (la más cercana que la contiene)
function funcionQueContiene(src, en) {
  const re = /\n {4}(?:async )?function ([\w$]+)\s*\(/g
  let m, mejor = null
  while ((m = re.exec(src)) && m.index < en) {
    const llave = src.indexOf('{', src.indexOf(')', m.index))
    try { const c = cuerpoDesde(src, llave); if (llave + c.length > en) mejor = m[1] } catch { /* nada */ }
  }
  return mejor
}

// El elemento del HTML que abre con id="x": su posición y dónde cierra
// (contando los <div>/<section> que abren y cierran después).
function rangoDeElemento(src, id) {
  const re = new RegExp(`<(div|section)\\b[^>]*\\bid="${id}"[^>]*>`)
  const m = src.match(re)
  if (!m) return null
  const tag = m[1]
  let i = m.index + m[0].length, nivel = 1
  const t = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'g')
  t.lastIndex = i
  let x
  while ((x = t.exec(src))) { nivel += x[1] ? -1 : 1; if (nivel === 0) return { ini: m.index, fin: x.index } }
  return null
}

const PANTALLAS = [
  { nombre: 'Cobranzas', archivo: 'cobranzas', boton: 'cob-btn-ampliar', observa: 'cob-vista-detalle', corte: 'MQ_ESCRITORIO', conecta: 'conectarAmpliarCob',
    acciones: ['cob-btn-editar', 'cob-link-asentar', 'cob-link-reabrir', 'cob-btn-anular'] },
  { nombre: 'Gastos', archivo: 'gastos', boton: 'btn-ampliar-gasto', observa: 'modal-detalle-gasto', corte: null, conecta: null,
    acciones: ['btn-editar-gasto', 'btn-anular-gasto'] },
  { nombre: 'Gastos (factura)', archivo: 'gastos', boton: 'btn-ampliar-factura', observa: 'modal-detalle-factura', corte: null, conecta: null,
    acciones: ['btn-editar-factura'] },
  { nombre: 'Cheques (la cobranza de un cheque)', archivo: 'administracion', boton: 'ad-cobranza-ampliar', observa: 'ad-vista-cobranza', corte: 'MQ_LISTA_DETALLE', conecta: 'conectarAmpliarAd',
    acciones: ['ad-cobranza-reabrir'] },
  { nombre: 'Órdenes de retiro', archivo: 'administracion', boton: 'ad-orden-ampliar', observa: 'ad-vista-orden', corte: 'MQ_LISTA_DETALLE', conecta: 'conectarAmpliarAd',
    acciones: ['ad-orden-acciones'] },
  { nombre: 'Cuentas corrientes', archivo: 'cc', boton: 'btn-ampliar-pago', observa: 'modal-detalle-pago', corte: null, conecta: null, acciones: [] },
]

for (const p of PANTALLAS) {
  const src = ARCH[p.archivo]
  const n = p.nombre
  chk(`${n}: importa crearAmpliar de ../js/ampliar.js`, /import \{ crearAmpliar \} from '\.\.\/js\/ampliar\.js'/.test(src))

  // El botón en el HTML (fuera del <script>).
  const html = src.slice(0, src.indexOf('<script type="module">\n    import'))
  const reBoton = new RegExp(`<button\\b[^>]*\\bid="${p.boton}"[^>]*>([^<]*)</button>`, 'g')
  const botones = [...html.matchAll(reBoton)]
  chk(`${n}: el botón #${p.boton} está una sola vez en el HTML`, botones.length === 1, String(botones.length))
  const b = botones[0]
  chk(`${n}: el botón dice "Ampliar"`, b?.[1].trim() === 'Ampliar')
  chk(`${n}: el botón nace hidden`, / hidden[ >]/.test(b?.[0] ?? ''))
  chk(`${n}: el botón es type="button" con la clase amp-boton`, /type="button"/.test(b?.[0] ?? '') && /class="amp-boton"/.test(b?.[0] ?? ''))
  chk(`${n}: el id del botón no se repite en el archivo`, (src.match(new RegExp(`id="${p.boton}"`, 'g')) || []).length === 1)

  // El panel observado contiene al botón.
  const rango = rangoDeElemento(html, p.observa)
  chk(`${n}: el botón está ADENTRO del panel #${p.observa} (arriba del detalle)`, !!rango && b && b.index > rango.ini && b.index < rango.fin)

  // La llamada.
  const ll = llamadas(src).find(c => c.texto.includes(`boton: document.getElementById('${p.boton}')`))
  chk(`${n}: hay un crearAmpliar({ boton: #${p.boton} })`, !!ll)
  const t = ll?.texto ?? ''
  chk(`${n}: observa #${p.observa}`, t.includes(`observar: document.getElementById('${p.observa}')`))
  for (const clave of ['disponible:', 'titulo:', 'resumen:', 'grilla:', 'acciones:']) chk(`${n}: pasa ${clave.slice(0, -1)}`, t.includes(clave))
  if (p.corte) {
    chk(`${n}: el corte es el del panel (${p.corte})`, t.includes(`corte: ${p.corte},`))
    chk(`${n}: ${p.corte} es 1100 px`, new RegExp(`const ${p.corte} = '\\(min-width: 1100px\\)'`).test(src))
  } else {
    chk(`${n}: usa el corte por defecto (1100 px)`, !/corte:/.test(t))
  }
  for (const a of p.acciones) chk(`${n}: la acción #${a} existe en el archivo y la ventana la toma`, src.includes(`id="${a}"`) && t.includes(a))

  // Que se llegue a llamar: en el nivel del script, o en una función que init llama.
  if (p.conecta) {
    chk(`${n}: la llamada vive en ${p.conecta}()`, funcionQueContiene(src, ll?.en ?? -1) === p.conecta)
    const init = (() => { const k = src.search(/\n {4}async function init\(\) \{/); return k < 0 ? '' : cuerpoDesde(src, src.indexOf('{', k + 5)) })()
    chk(`${n}: init() llama a ${p.conecta}() después de conectarTodo()`, new RegExp(`conectarTodo\\(\\)\\s*\\n\\s*${p.conecta}\\(\\)`).test(init))
  } else {
    chk(`${n}: la llamada está en el nivel del script (corre al cargar)`, ll?.sangria === 4 && funcionQueContiene(src, ll?.en ?? -1) === null)
  }
}

// Cuántas veces se usa en cada archivo: ninguna pantalla se queda sin la suya.
chk('Cobranzas: una ventana', llamadas(ARCH.cobranzas).length === 1)
chk('Gastos: dos (el gasto y la factura)', llamadas(ARCH.gastos).length === 2)
chk('Administración: dos (la orden y la cobranza de un cheque)', llamadas(ARCH.administracion).length === 2)
chk('Cuentas corrientes: una (el pago)', llamadas(ARCH.cc).length === 1)

// Una cobranza y un gasto (lo que ya es una tarjeta) van sin otro marco.
chk('Cobranzas: los cheques sin marco doble', llamadas(ARCH.cobranzas)[0]?.texto.includes('marcoCelda: false'))
chk('Gastos: las secciones sin marco doble', llamadas(ARCH.gastos).every(c => c.texto.includes('marcoCelda: false')))
// Cobranzas: el desplegable de titulares deja la ventana abierta; la foto se toca.
chk('Cobranzas: los titulares se despliegan sin cerrar', llamadas(ARCH.cobranzas)[0]?.texto.includes("quedarse: '[data-plegar-titulares]'"))
chk('Cobranzas: la foto del detalle se puede tocar', llamadas(ARCH.cobranzas)[0]?.texto.includes("tocables: 'img[data-foto-detalle]'"))
// Mientras se valoriza, se anula o se asienta, no se ofrece (es un formulario).
const adm = llamadas(ARCH.administracion)
chk('Órdenes: no se ofrece mientras se valoriza o se anula', adm.some(c => c.texto.includes("'ad-orden-ampliar'") && c.texto.includes('!estado.orden.valorizar') && c.texto.includes('!estado.orden.anular')))
chk('Cheques: no se ofrece mientras se asienta o se reabre', adm.some(c => c.texto.includes("'ad-cobranza-ampliar'") && c.texto.includes('!estado.cobranzas.asentando') && c.texto.includes('!estado.cobranza.reabriendo')))
// Cobranzas: el panel tiene scroll propio; el botón queda a la vista.
chk('Cobranzas: el botón queda a la vista al recorrer el panel', /<div class="amp-barra amp-barra--fija"><button[^>]*id="cob-btn-ampliar"/.test(ARCH.cobranzas))
chk('CSS: la barra fija se pega arriba del panel', /\.amp-barra--fija \{ position: sticky; top: 0;/.test(CSS))
// Cobranzas: solo con la cobranza elegida ya dibujada.
chk('Cobranzas: solo con la cobranza elegida dibujada', llamadas(ARCH.cobranzas)[0]?.texto.includes('estado.detalle.cabecera?.id === estado.cobranzaSeleccionadaId'))

// ── El CSS de main.css ───────────────────────────────────────────────────
const regla = (sel) => { const k = CSS.indexOf('\n' + sel + ' {'); return k < 0 ? '' : CSS.slice(k, CSS.indexOf('}', k)) }
const fondo = regla('.amp-fondo')
const z = Number((fondo.match(/z-index:\s*(\d+)/) || [])[1])
chk('la ventana va fija, sobre toda la pantalla', /position: fixed/.test(fondo) && /inset: 0/.test(fondo))
chk('la ventana tapa los modales de los módulos (z-index > 60)', z > 60, String(z))
chk('y queda debajo de los avisos (z-index < 900)', z < 900, String(z))
chk('el fondo es oscuro (rgba con alfa ≥ 0,4)', Number((fondo.match(/background: rgba\(\s*\d+,\s*\d+,\s*\d+,\s*([\d.]+)\)/) || [])[1]) >= 0.4)
const amp = regla('.amp')
chk('la ventana es casi toda la pantalla (≥ 90 de ancho y de alto)', /width: min\(\d+px, (9\d)vw\)/.test(amp) && /height: (9\d)vh/.test(amp))
chk('resumen a la izquierda y grilla a la derecha', /grid-template-columns: minmax\(\d+px, 1fr\) minmax\(0, 2fr\)/.test(regla('.amp__cuerpo')))
chk('cada parte con su scroll', /overflow-y: auto/.test(regla('.amp__resumen')) && /overflow-y: auto/.test(regla('.amp__lado')))
chk('lo que en el panel va cortado, en la ventana se lee entero', /\.amp__resumen-cuerpo \*, \.amp__celda \* \{ white-space: normal !important; text-overflow: clip !important;/.test(CSS))
chk('la página de atrás no scrollea', /html\.amp-abierta \{ overflow: hidden; \}/.test(CSS))
chk('no se imprime', /@media print \{ \.amp-fondo, \.amp-boton \{ display: none !important; \} \}/.test(CSS))
chk('la X mide 44 px', /width: 44px; height: 44px/.test(regla('.amp__cerrar')))
chk('el botón Ampliar tiene su estilo', /border: 1px solid var\(--color-borde-boton\)/.test(regla('.amp-boton')))

fin()
