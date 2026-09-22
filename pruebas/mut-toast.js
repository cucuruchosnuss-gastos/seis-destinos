// Mutaciones de test-toast.js (Parte 9 del trabajo de Cheques, 22/09/2026):
// el cartel de error de toda la app no se sale del borde. Ver mutar.js: el
// runner es genérico y muta el archivo que se le pase (acá, css/main.css).
//
//   node pruebas/mut-toast.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

const RAIZ = path.join(__dirname, '..')

correrMutaciones({
  suite: path.join(__dirname, 'test-toast.js'),
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'css/main.css'),
  funciones: [],
  manuales: [
    { nombre: 'vuelve el nowrap', de: '  white-space: normal;\n  overflow-wrap: anywhere;\n  z-index: 9999;', a: '  white-space: nowrap;\n  overflow-wrap: anywhere;\n  z-index: 9999;' },
    { nombre: 'sin ancho máximo', de: '  max-width: calc(100vw - 2rem - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px));\n', a: '' },
    { nombre: 'el ancho máximo no resta el safe-area', de: 'max-width: calc(100vw - 2rem - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px));', a: 'max-width: calc(100vw - 2rem);' },
    { nombre: 'sin border-box', de: '  box-sizing: border-box;\n  width: max-content;', a: '  width: max-content;' },
    { nombre: 'el borde de abajo no respeta la barra de gestos', de: '  bottom: calc(1.5rem + env(safe-area-inset-bottom, 0px));', a: '  bottom: 1.5rem;' },
    { nombre: 'vuelve la píldora', de: '  border-radius: 1rem;\n  font-size: 0.875rem;\n  font-weight: 500;\n  line-height: 1.4;', a: '  border-radius: 999px;\n  font-size: 0.875rem;\n  font-weight: 500;\n  line-height: 1.4;' },
    { nombre: 'una palabra larga no se parte', de: '  overflow-wrap: anywhere;\n  z-index: 9999;', a: '  z-index: 9999;' },
  ],
})
