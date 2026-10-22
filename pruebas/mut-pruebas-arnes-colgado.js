// Mutaciones de test-pruebas-arnes-colgado.js (el arnés de las suites da rojo
// si una rama queda colgada, 21/10/2026). Ver mutar.js.
//
//   node pruebas/mut-pruebas-arnes-colgado.js
//
// UN RUNNER POR VEZ.

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-pruebas-arnes-colgado.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, 'circuito-comun.js'),
  funciones: [],
  manuales: [
    { nombre: 'sin la guarda de beforeExit (como antes)', de: "  process.on('beforeExit', () => {", a: "  ;(() => {" },
    { nombre: 'la guarda no marca la falla', de: "suite cierra: ninguna rama async quedó colgada esperando una promesa que nunca se resuelve, y se llamó a fin()', false)", a: "suite cierra: ninguna rama async quedó colgada esperando una promesa que nunca se resuelve, y se llamó a fin()', true)" },
    { nombre: 'la guarda no cierra (no imprime ni sale)', de: '    cerrar()\n  })', a: '  })' },
    { nombre: 'cerrar sale con 0 aunque haya fallas', de: '    process.exit(fallas.length ? 1 : 0)', a: '    process.exit(0)' },
  ],
})
