// Los carteles de error y de éxito de toda la app (js/utils.js + css/main.css).
//
// El caso que lo motivó (22/09/2026): en el celular un error largo se cortaba
// a los dos costados y no se podía leer, porque el cartel tenía
// white-space: nowrap y forma de píldora. Se EJECUTA el render con un DOM
// falso y un texto largo, y se lee la regla CSS real.
//
//   node pruebas/test-toast.js
//   ARCHIVO_TEST=/otra/main.css ARCHIVO_UTILS=/otro/utils.js node pruebas/test-toast.js

const fs = require('fs')
const path = require('path')
const { extraerFn } = require('./extraer')

const RAIZ = path.join(__dirname, '..')
const CSS = process.env.ARCHIVO_TEST || path.join(RAIZ, 'css/main.css')
const UTILS = process.env.ARCHIVO_UTILS || path.join(RAIZ, 'js/utils.js')
const css = fs.readFileSync(CSS, 'utf8')
const utils = fs.readFileSync(UTILS, 'utf8').replace(/^export (?=function )/gm, '')
console.log(`ARCHIVO ${CSS} (${css.length} bytes)`)

let ok = 0
const fallas = []
function chk(nombre, cond, detalle) { if (cond) ok++; else fallas.push(nombre + (detalle !== undefined ? ` — ${detalle}` : '')) }

// La regla .toast { ... } tal cual está en el CSS, sin comentarios.
function regla(sel) {
  const limpio = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const re = new RegExp(`(^|\\n)\\s*${sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`)
  const m = re.exec(limpio)
  return m ? m[2] : ''
}
const toast = regla('.toast')
const prop = (bloque, p) => { const m = new RegExp(`(^|[;\\s])${p}\\s*:\\s*([^;]+);`).exec(bloque); return m ? m[2].trim() : null }

chk('hay regla .toast', toast.length > 0)
chk('el texto BAJA de renglón (no nowrap)', prop(toast, 'white-space') === 'normal', prop(toast, 'white-space'))
chk('una palabra larga (un número de cheque, una URL) también se parte', prop(toast, 'overflow-wrap') === 'anywhere')
const maxW = prop(toast, 'max-width') || ''
chk('el ancho máximo es la pantalla menos un margen', /^calc\(100vw - 2rem/.test(maxW), maxW)
chk('el ancho máximo resta el safe-area de los dos costados',
  /env\(safe-area-inset-left/.test(maxW) && /env\(safe-area-inset-right/.test(maxW), maxW)
chk('el padding entra en el ancho (border-box): si no, el cartel se pasa del máximo', prop(toast, 'box-sizing') === 'border-box')
chk('el borde de abajo respeta la barra de gestos', /env\(safe-area-inset-bottom/.test(prop(toast, 'bottom') || ''))
chk('escondido, también baja lo que mide el safe-area (si no, asoma)', /env\(safe-area-inset-bottom/.test(prop(toast, 'transform') || ''))
chk('ya no es una píldora (999px con dos renglones se ve roto)', prop(toast, 'border-radius') !== '999px')
chk('centrado sobre la pantalla', prop(toast, 'left') === '50%' && /translateX\(-50%\)/.test(prop(toast, 'transform') || ''))

// ── El render, EJECUTADO con un texto largo ──────────────────────────────
const creado = []
const codigo = `
  var __el = null
  var __timeout = null
  var document = {
    getElementById: () => __el,
    createElement: () => { __el = { id: '', textContent: '', className: '', attrs: {},
      setAttribute(k, v) { this.attrs[k] = v }, classList: { add(){}, remove(){} } }; return __el },
    body: { appendChild(e) { __creado.push(e) } },
  }
  var requestAnimationFrame = (f) => f()
  var setTimeout = (f, ms) => { __timeout = ms; return 1 }
  var clearTimeout = () => {}
  var toastTimer = null
  ${extraerFn(utils, 'duracionToast')}
  ${extraerFn(utils, '_renderizarToast')}
  return { _renderizarToast, duracionToast, el: () => __el, ms: () => __timeout }
`
const S = new Function('__creado', codigo)(creado)
const largo = 'No salió ninguno. El cheque 007 Nº 12345678 no puede salir: Solo se puede marcar la salida de un cheque de una cobranza asentada. <b>esto no es HTML</b>'
S._renderizarToast(largo, 'error')
chk('el cartel muestra el mensaje ENTERO', S.el().textContent === largo)
chk('el mensaje va por textContent (no es HTML)', !('innerHTML' in S.el()) || S.el().innerHTML === undefined)
chk('el error se anuncia (role="alert")', S.el().attrs.role === 'alert')
chk('un error largo queda más tiempo a la vista que uno corto', S.ms() > 3500, S.ms())
S._renderizarToast('Listo.', 'exito')
chk('el éxito no interrumpe (role="status")', S.el().attrs.role === 'status')
chk('uno corto sigue durando 3,5 s', S.ms() === 3500, S.ms())
chk('la duración tiene tope (12 s)', S.duracionToast('x'.repeat(5000)) === 12000)
chk('la duración no rompe con null', S.duracionToast(null) === 3500)

for (const f of fallas) console.log('  ✗ ' + f)
console.log(`${ok}/${ok + fallas.length}${fallas.length ? '  ROJO' : '  verde'}`)
process.exit(fallas.length ? 1 : 0)
