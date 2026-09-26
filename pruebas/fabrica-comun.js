// La fábrica de pruebas de js/utils.js para meter en el preludio de un sandbox:
// el código REAL de sinUnidadesDePrueba / sinPersonasDePrueba y de
// FABRICA_SIN_DATOS (sin el `export`), y cargarFabricaDePruebas como un doble
// que devuelve FABRICA_SIN_DATOS (los dobles de supabase de las suites no
// filtran por .eq(), así que la real marcaría como "de prueba" cualquier unidad).
//
// Lo usan las suites de un módulo que ya filtra la fábrica y que no tratan de
// eso (ver test-<modulo>-fabrica-pruebas.js para las que sí).

const fs = require('fs')
const path = require('path')
const { extraerFn } = require('./extraer')

function preludioFabrica() {
  const utils = fs.readFileSync(path.join(__dirname, '..', 'js', 'utils.js'), 'utf8').replace(/^export /gm, '')
  const m = utils.match(/^const FABRICA_SIN_DATOS = (.+)$/m)
  if (!m) throw new Error('utils.js: no está FABRICA_SIN_DATOS')
  return [
    `var FABRICA_SIN_DATOS = ${m[1]}`,
    extraerFn(utils, 'sinUnidadesDePrueba'),
    extraerFn(utils, 'sinPersonasDePrueba'),
    'async function cargarFabricaDePruebas() { return FABRICA_SIN_DATOS }',
  ].join('\n')
}

module.exports = { preludioFabrica }
