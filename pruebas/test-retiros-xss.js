// Chequeo estático de escapado de TODO modulos/retiros.html y de
// js/retiros-comun.js (la hoja) (26/09/2026).
//
// Cada `${...}` de una plantilla que arma HTML tiene que estar escapado (esc()
// en la pantalla, escHoja() en la hoja) o figurar en las hojas seguras con su
// motivo. Y ninguna cae en un atributo sin comillas, en un on*= ni en un
// href/src sin validar. Los renders se EJECUTAN con HTML malicioso en
// test-retiros-carga.js, test-retiros-mis.js y test-retiros-hoja.js.
//
//   node pruebas/test-retiros-xss.js

const fs = require('fs')
const os = require('os')
const path = require('path')
const { arnes, leer, estaticoAcotado } = require('./circuito-comun')
const { SEGURAS_RETIROS, SEGURAS_REGEX_RETIROS, SEGURAS_HOJA } = require('./seguras-retiros')
const { RUTA_COMUN_RETIROS } = require('./fuente-cobranzas')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/retiros.html')
const FUENTE = leer(ARCHIVO)
const { chk, fin } = arnes()

function funcionesDe(texto) {
  return [...new Set([...texto.matchAll(/^\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_]+)\s*\(/gm)].map(m => m[1]))]
}

const script = FUENTE.slice(FUENTE.indexOf('<script type="module">'))
const nombres = funcionesDe(script)
chk('se encontraron las funciones de la pantalla', nombres.length > 40, nombres.length)
estaticoAcotado(chk, ARCHIVO, FUENTE, nombres, { escape: 'esc', seguras: SEGURAS_RETIROS, segurasRegex: SEGURAS_REGEX_RETIROS })

// La hoja: el archivo común, envuelto en un <script> para el escáner.
const comun = fs.readFileSync(RUTA_COMUN_RETIROS, 'utf8')
console.log(`ARCHIVO ${RUTA_COMUN_RETIROS} (${comun.length} bytes)`)
const tmp = path.join(os.tmpdir(), `retiros-comun-xss-${process.pid}.html`)
const envuelto = '<script type="module">\n' + comun.replace(/^export /gm, '') + '\n</script>\n'
fs.writeFileSync(tmp, envuelto)
try {
  const nombresHoja = funcionesDe(comun)
  chk('se encontraron las funciones de la hoja', nombresHoja.length > 15, nombresHoja.length)
  estaticoAcotado(chk, tmp, envuelto, nombresHoja, { escape: 'escHoja', seguras: SEGURAS_HOJA })
} finally {
  try { fs.unlinkSync(tmp) } catch { /* nada */ }
}

fin()
