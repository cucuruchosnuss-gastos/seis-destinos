// Mutaciones de test-borde-boton.js. Ver mutar.js (mismos guards). De a una.
//
//   node pruebas/mut-borde-boton.js

const path = require('path')
const { correrMutacionesEnVarios } = require('./mutar')

const suite = path.join(__dirname, 'test-borde-boton.js')
const RAIZ = path.join(__dirname, '..')

correrMutacionesEnVarios([
  {
    suite, original: path.join(RAIZ, 'css', 'main.css'), funciones: [], variable: 'ARCHIVO_CSS',
    manuales: [
      { nombre: 'vuelve el borde de tarjeta (1,25:1)', de: '  --color-borde-boton:    #9A9287;', a: '  --color-borde-boton:    #E7E3DC;' },
      { nombre: 'un gris azulado', de: '  --color-borde-boton:    #9A9287;', a: '  --color-borde-boton:    #737C8D;' },
      { nombre: 'un gris que no es de la paleta', de: '  --color-borde-boton:    #9A9287;', a: '  --color-borde-boton:    #8E877C;' },
      { nombre: '.btn--secundario con el borde de tarjeta', de: '  border: 1px solid var(--color-borde-boton);\n}', a: '  border: 1px solid var(--color-borde);\n}' },
    ],
  },
  {
    suite, original: path.join(RAIZ, 'modulos', 'produccion.html'), funciones: [], variable: 'ARCHIVO_PLANTA',
    manuales: [
      { nombre: 'la planta con otro gris', de: '      --p-borde-boton: #9A9287;', a: '      --p-borde-boton: #B8B0A4;' },
      { nombre: '.pr-btn con el borde de tarjeta', de: '      border: 1px solid var(--p-borde-boton); background: var(--p-tarjeta);', a: '      border: 1px solid var(--p-borde); background: var(--p-tarjeta);' },
    ],
  },
  {
    suite, original: path.join(RAIZ, 'modulos', 'produccion-gestion.html'), funciones: [], variable: 'ARCHIVO_GESTION',
    manuales: [
      { nombre: 'la gestión vuelve al gris azulado', de: '      --pr-borde-boton:         var(--color-borde-boton);', a: '      --pr-borde-boton:         #737C8D;' },
    ],
  },
  {
    suite, original: path.join(RAIZ, 'dashboard.html'), funciones: [], variable: 'ARCHIVO_DASH',
    manuales: [
      { nombre: '"Volver a como venía" con el borde de tarjeta', de: '    .tb-boton-borde { height: 40px; padding: 0 14px; border-radius: 12px; border: 1px solid var(--color-borde-boton);', a: '    .tb-boton-borde { height: 40px; padding: 0 14px; border-radius: 12px; border: 1px solid var(--color-borde);' },
      { nombre: 'Fijar con el borde de tarjeta', de: "      background: #FFFFFF; color: var(--color-texto-2); border: 1px solid var(--color-borde-boton); cursor: pointer; flex-shrink: 0; }", a: "      background: #FFFFFF; color: var(--color-texto-2); border: 1px solid var(--color-borde); cursor: pointer; flex-shrink: 0; }" },
      { nombre: 'Volver (Personalizar) con el borde de tarjeta', de: '    .pz-volver { height: 38px; padding: 0 14px; border-radius: 12px; border: 1px solid var(--color-borde-boton);', a: '    .pz-volver { height: 38px; padding: 0 14px; border-radius: 12px; border: 1px solid var(--color-borde);' },
    ],
  },
])
