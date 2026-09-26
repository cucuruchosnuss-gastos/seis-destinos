// La fuente de un módulo de la pareja Cobranzas / Cheques, TAL COMO LA VE EL
// NAVEGADOR: el <script type="module"> del HTML más las funciones que importa
// de js/cobranzas-comun.js (22/09/2026).
//
// Las suites extraen funciones del texto con extraer.js. Desde que los
// helpers compartidos se mudaron a js/cobranzas-comun.js, buscar solo en el
// HTML daría "NO EXISTE la función hoyArgentina". Esto pega detrás del script
// cada declaración del archivo común (sin el `export`) que el HTML NO declare
// por su cuenta: así no hay duplicados y se prueba el código REAL que corre.
//
// ARCHIVO_COMUN reemplaza la ruta del archivo común (para mutarlo).

const fs = require('fs')
const path = require('path')

const RUTA_COMUN = process.env.ARCHIVO_COMUN || path.join(__dirname, '..', 'js', 'cobranzas-comun.js')
// La hoja de las órdenes de retiro (26/09/2026): la comparten la Carga
// (retiros.html) y Administración (administracion.html). Se pega SOLO si el
// script la importa. ARCHIVO_COMUN_RETIROS la reemplaza (para mutarla).
const RUTA_COMUN_RETIROS = process.env.ARCHIVO_COMUN_RETIROS || path.join(__dirname, '..', 'js', 'retiros-comun.js')

// Un archivo común sin imports y sin la palabra `export`.
function fuenteComun(ruta = RUTA_COMUN) {
  return fs.readFileSync(ruta, 'utf8')
    .replace(/^import .*$/gm, '')
    .replace(/^export (?=(async )?function |const )/gm, '')
}

function nombresDeclarados(src) {
  const out = new Set()
  for (const m of src.matchAll(/(?:^|\n)\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g)) out.add(m[1])
  for (const m of src.matchAll(/(?:^|\n)\s*const\s+([A-Za-z_$][\w$]*)\s*=/g)) out.add(m[1])
  return out
}

// Cada declaración top-level del común, con su nombre y su texto.
function declaracionesComun(ruta = RUTA_COMUN) {
  const src = fuenteComun(ruta)
  const lineas = src.split('\n')
  const out = []
  let actual = null
  for (const l of lineas) {
    const m = /^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)|^const\s+([A-Za-z_$][\w$]*)/.exec(l)
    if (m) { if (actual) out.push(actual); actual = { nombre: m[1] || m[2], texto: l + '\n' }; continue }
    if (actual) actual.texto += l + '\n'
  }
  if (actual) out.push(actual)
  return out
}

function scriptDe(html) {
  const ini = html.indexOf('<script type="module">')
  const fin = html.indexOf('</script>', ini)
  if (ini === -1 || fin === -1) throw new Error('no se encontró el <script type="module">')
  return html.slice(ini, fin)
}

// El script del HTML + lo del común que el HTML no declara.
function fuenteConComun(htmlOScript) {
  const script = htmlOScript.includes('</script>') ? scriptDe(htmlOScript) : htmlOScript
  const propios = nombresDeclarados(script)
  const agregados = declaracionesComun().filter(d => !propios.has(d.nombre))
  let fuente = script + '\n// ── js/cobranzas-comun.js ──\n' + agregados.map(d => d.texto).join('\n')
  if (script.includes("from '../js/retiros-comun.js'")) {
    const deRetiros = declaracionesComun(RUTA_COMUN_RETIROS)
      .filter(d => !propios.has(d.nombre) && !agregados.some(a => a.nombre === d.nombre))
    fuente += '\n// ── js/retiros-comun.js ──\n' + deRetiros.map(d => d.texto).join('\n')
  }
  return fuente
}

module.exports = { fuenteComun, fuenteConComun, declaracionesComun, RUTA_COMUN, RUTA_COMUN_RETIROS }
