// El borde de los botones secundarios (29/09/2026): un gris cálido de la paleta
// que llega a 3:1 sobre blanco. El de las tarjetas (#E7E3DC) da 1,25:1 y el
// botón no se veía como botón.
//
//   node pruebas/test-borde-boton.js
//   ARCHIVO_CSS=<copia de css/main.css>  ARCHIVO_PLANTA=<copia de modulos/produccion.html>
//   ARCHIVO_GESTION=<copia de modulos/produccion-gestion.html>  ARCHIVO_DASH=<copia de dashboard.html>

const fs = require('fs')
const path = require('path')
const RAIZ = path.join(__dirname, '..')
const leer = (variable, rel) => {
  const ruta = process.env[variable] || path.join(RAIZ, rel)
  const s = fs.readFileSync(ruta, 'utf8')
  console.log(`ARCHIVO ${ruta} (${s.length} bytes)`)
  return s
}
const css = leer('ARCHIVO_CSS', 'css/main.css')
const planta = leer('ARCHIVO_PLANTA', 'modulos/produccion.html')
const gestion = leer('ARCHIVO_GESTION', 'modulos/produccion-gestion.html')
const dash = leer('ARCHIVO_DASH', 'dashboard.html')

let ok = 0, total = 0
const chk = (nombre, cond, detalle = '') => { total++; if (cond) ok++; else console.log(`FALLA  ${nombre}${detalle ? ' — ' + detalle : ''}`) }

const lin = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
const lum = hex => { const n = parseInt(hex.slice(1), 16); return 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255) }
const contraste = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
const rgb = hex => { const n = parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255] }
const cortar = (s, sel) => { const i = s.indexOf(sel); return i < 0 ? '' : s.slice(i, s.indexOf('}', i) + 1) }

// El token, en main.css.
const m = css.match(/--color-borde-boton:\s*(#[0-9A-Fa-f]{6})/)
chk('main.css define --color-borde-boton', !!m)
const hex = m ? m[1] : '#FFFFFF'
chk('llega a 3:1 sobre blanco', contraste(hex, '#FFFFFF') >= 3, contraste(hex, '#FFFFFF').toFixed(2))
const [r, g, b] = rgb(hex)
chk('es un gris CÁLIDO (rojo >= verde >= azul, sin azules)', r >= g && g >= b && r - b <= 40, hex)
const paleta = [...css.matchAll(/--color-[a-z0-9-]+:\s*(#[0-9A-Fa-f]{6})/g)].map(x => x[1].toUpperCase())
chk('es un color de la paleta (el mismo hex que otro token de main.css)', paleta.filter(x => x === hex.toUpperCase()).length >= 2, hex)
chk('.btn--secundario usa el borde de botón', /border:\s*1px solid var\(--color-borde-boton\)/.test(cortar(css, '.btn--secundario {')))

// La planta.
const p = planta.match(/--p-borde-boton:\s*(#[0-9A-Fa-f]{6})/)
chk('la planta define --p-borde-boton con el MISMO gris', !!p && p[1].toUpperCase() === hex.toUpperCase(), p?.[1])
const prBtn = cortar(planta, '    .pr-btn {')
chk('.pr-btn (los secundarios de la planta) usa --p-borde-boton', /border:\s*1px solid var\(--p-borde-boton\)/.test(prBtn))
chk('.pr-btn--accion y --peligro siguen con su propio borde', /\.pr-btn--accion \{[^}]*border-color: var\(--p-acento\)/.test(planta) && /\.pr-btn--peligro \{[^}]*border-color: var\(--p-mal\)/.test(planta))

// La gestión: sin el gris azulado de antes.
chk('la gestión toma el token de main.css', /--pr-borde-boton:\s*var\(--color-borde-boton\)/.test(gestion))
chk('la gestión ya no tiene #737C8D', !/#737C8D/i.test(gestion))

// El tablero y Personalizar.
for (const sel of ['.tb-boton-borde {', '.tb-esconder {', '.pz-fijar {', '.pz-volver {']) {
  chk(`${sel.slice(0, -2)} usa el borde de botón`, /border:\s*1px solid var\(--color-borde-boton\)/.test(cortar(dash, sel)))
}
chk('.pz-fijar--si conserva su borde naranja', /\.pz-fijar--si \{[^}]*border-color: #F6D3BD/.test(dash))

console.log(`\n${ok}/${total}  ${ok === total ? 'verde' : 'ROJO'}`)
process.exit(ok === total ? 0 : 1)
