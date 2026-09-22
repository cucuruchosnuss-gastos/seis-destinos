// La regla global [hidden] de css/main.css, y que ningún elemento con el
// atributo hidden se muestre pisándolo con style.display (con la regla
// global, ese elemento quedaría oculto para siempre).
//
//   node pruebas/test-css-hidden.js

const fs = require('fs')
const path = require('path')
const RAIZ = path.join(__dirname, '..')
const css = fs.readFileSync(process.env.ARCHIVO_TEST || path.join(RAIZ, 'css/main.css'), 'utf8')
console.log(`ARCHIVO main.css (${css.length} bytes)`)

let ok = 0
const fallas = []
const chk = (n, c, d) => { if (c) ok++; else fallas.push(n + (d ? ` — ${d}` : '')) }

const sinComentarios = css.replace(/\/\*[\s\S]*?\*\//g, '')
chk('main.css tiene [hidden] { display: none !important; }', /(^|\n)\s*\[hidden\]\s*\{\s*display:\s*none\s*!important;?\s*\}/.test(sinComentarios))

// Ningún id con el atributo hidden en el HTML se muestra con style.display.
const htmls = ['dashboard.html', 'registro.html', 'login.html', 'mfa.html', 'index.html',
  'recuperar-contrasena.html', 'restablecer-contrasena.html',
  ...fs.readdirSync(path.join(RAIZ, 'modulos')).filter(f => f.endsWith('.html')).map(f => 'modulos/' + f)]
  .filter(f => fs.existsSync(path.join(RAIZ, f)))
for (const f of htmls) {
  const h = fs.readFileSync(path.join(RAIZ, f), 'utf8')
  const ocultos = [...h.matchAll(/<[a-z0-9]+\b[^>]*\bid="([\w-]+)"[^>]*\shidden[\s>]/g)].map(m => m[1])
  for (const id of ocultos) {
    const re = new RegExp(`getElementById\('${id}'\)\.style\.display\s*=\s*'(?!none)`)
    chk(`${f}: #${id} (hidden) no se muestra con style.display`, !re.test(h))
  }
}

console.log(fallas.map(f => '  ✗ ' + f).join('\n'))
console.log(`${ok}/${ok + fallas.length} ${fallas.length ? 'ROJO' : 'verde'}`)
process.exit(fallas.length ? 1 : 0)
