// Chequeo estático de escapado de TODO modulos/produccion.html (22/09/2026).
//
// Cada `${...}` de una plantilla que arma HTML, en cualquier función del
// archivo, tiene que estar escapado con esc() o figurar en SEGURAS_PRODUCCION
// con su motivo. Y ninguna cae en un atributo sin comillas, en un on*= ni en
// un href/src. Los renders se EJECUTAN con HTML malicioso en las suites de
// cada sub-parte (test-produccion-*.js); esto es la otra mitad: una
// interpolación nueva sin escapar pone esta suite en rojo nombrándola.
//
//   node pruebas/test-produccion-xss.js

const path = require('path')
const { arnes, leer, estaticoAcotado } = require('./circuito-comun')
const { SEGURAS_PRODUCCION, SEGURAS_REGEX_PRODUCCION } = require('./seguras-produccion')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/produccion.html')
const FUENTE = leer(ARCHIVO)
const { chk, fin } = arnes()

const script = FUENTE.slice(FUENTE.indexOf('<script type="module">'))
const nombres = [...new Set([...script.matchAll(/^\s*(?:async\s+)?function\s+([A-Za-z0-9_]+)\s*\(/gm)].map(m => m[1]))]
chk('se encontraron las funciones del archivo', nombres.length > 10, nombres.length)
estaticoAcotado(chk, ARCHIVO, FUENTE, nombres, { escape: 'esc', seguras: SEGURAS_PRODUCCION, segurasRegex: SEGURAS_REGEX_PRODUCCION })

fin()
