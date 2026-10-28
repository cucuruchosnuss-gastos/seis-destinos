// Mutaciones de test-navegador-numeros.js: mutan spec-numero.js. Ver mutar.js.
//
//   node pruebas/mut-navegador-numeros.js

const path = require('path')
const { correrMutacionesEnVarios } = require('./mutar')

const suite = path.join(__dirname, 'test-navegador-numeros.js')
correrMutacionesEnVarios([
  {
    suite, original: path.join(__dirname, 'spec-numero.js'), funciones: [], variable: 'ARCHIVO_TEST',
    manuales: [
      { nombre: 'cualquier número del nombre cuenta', de: "match(/^(\\d+)-[^/]*\\.spec\\.js$/)", a: "match(/(\\d+)/)" },
      { nombre: 'los repetidos incluyen los de un solo spec', de: '.filter(([, l]) => l.length > 1)', a: '' },
      { nombre: 'los sin número se cuentan como repetidos', de: '    if (n === null) continue\n', a: '' },
      { nombre: 'el siguiente es el más alto (no + 1)', de: 'Math.max(...nums) + 1', a: 'Math.max(...nums)' },
      { nombre: 'el siguiente comparando texto', de: 'const nums = specs.map(numeroDe).filter(n => n !== null)', a: 'const nums = specs.map(numeroDe).filter(n => n !== null).map(String).sort().slice(-1)' },
      { nombre: 'sin specs numerados da otro', de: ': 1\n}', a: ': 0\n}' },
      { nombre: 'solo una subcarpeta', de: 'path.posix.basename(spec)', a: 'spec' },
    ],
  },
])
