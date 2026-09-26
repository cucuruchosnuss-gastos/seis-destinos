// Chequeo estático de escapado de TODO modulos/administracion.html
// (26/09/2026). La hoja (js/retiros-comun.js) la cubre test-retiros-xss.js.
//
// Cada `${...}` de una plantilla que arma HTML tiene que estar escapado (esc()
// en la pantalla, escHoja() en la hoja) o figurar en las hojas seguras con su
// motivo. Y ninguna cae en un atributo sin comillas, en un on*= ni en un
// href/src sin validar. Los renders se EJECUTAN con HTML malicioso en
// test-administracion-*.js.
//
//   node pruebas/test-administracion-xss.js

const path = require('path')
const { arnes, leer, estaticoAcotado } = require('./circuito-comun')
const { SEGURAS_ADMINISTRACION, SEGURAS_REGEX_ADMINISTRACION } = require('./seguras-administracion')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/administracion.html')
// Sin la región de la cartera de cheques: la revisa test-cheques-vista.js.
const { sinCheques } = require('./fuente-cheques')
const FUENTE = sinCheques(leer(ARCHIVO))
const { chk, fin } = arnes()

function funcionesDe(texto) {
  return [...new Set([...texto.matchAll(/^\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_]+)\s*\(/gm)].map(m => m[1]))]
}

const script = FUENTE.slice(FUENTE.indexOf('<script type="module">'))
const nombres = funcionesDe(script)
chk('se encontraron las funciones de la pantalla', nombres.length > 30, nombres.length)
estaticoAcotado(chk, ARCHIVO, FUENTE, nombres, { escape: 'esc', seguras: SEGURAS_ADMINISTRACION, segurasRegex: SEGURAS_REGEX_ADMINISTRACION })

fin()
