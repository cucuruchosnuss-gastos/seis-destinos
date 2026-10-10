// Mutaciones de test-claude-md-excepciones.js: mutan CLAUDE.md. Ver mutar.js.
//
//   node pruebas/mut-claude-md-excepciones.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-claude-md-excepciones.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'CLAUDE.md'),
  funciones: [],
  manuales: [
    { nombre: 'dos octavas (el caso del 06/10/2026)', de: '- **El control de período — novena excepción', a: '- **El control de período — octava excepción' },
    { nombre: 'se saltea un número', de: '- **Los gráficos — décima excepción', a: '- **Los gráficos — undécima excepción' },
    { nombre: 'la primera sin número', de: '- **Contraseñas — primera excepción', a: '- **Contraseñas — excepción' },
    { nombre: 'un ordinal mal escrito', de: '- **El tablero de resúmenes — séptima excepción', a: '- **El tablero de resúmenes — setima excepción' },
    { nombre: 'la de js/cantidades.js con otro número que su archivo', de: '- **Cómo se dice una cantidad de un insumo — octava excepción', a: '- **Cómo se dice una cantidad de un insumo — novena excepción' },
  ],
})
