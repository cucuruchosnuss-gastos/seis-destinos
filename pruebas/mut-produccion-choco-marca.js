// Mutaciones de test-produccion-choco-marca.js. Ver mutar.js. De a una.
//
//   node pruebas/mut-produccion-choco-marca.js

const path = require('path')
const { correrMutacionesEnVarios } = require('./mutar')

const suite = path.join(__dirname, 'test-produccion-choco-marca.js')
const RAIZ = path.join(__dirname, '..')

correrMutacionesEnVarios([
  {
    suite, original: path.join(RAIZ, 'modulos', 'produccion.html'), funciones: [], variable: 'ARCHIVO_TEST',
    manuales: [
      { nombre: 'con color elegido deja de ser chocolate', de: '        return { choco: esProductoChocolate(p ?? {}), elegido: true,', a: '        return { choco: false, elegido: true,' },
      { nombre: 'el nombre pierde la palabra Chocolate', de: "        (col.choco ? '<span class=\"pr-chip-choco pr-chip-choco--prod\">Chocolate</span>' : '')", a: "        ''" },
      { nombre: 'el nombre elegido vuelve a la pastilla (se pierde el color)', de: "      if (col.choco && !col.elegido) return `<span class=\"pr-prod-nombre pr-prod-nombre--choco\"", a: "      if (col.choco) return `<span class=\"pr-prod-nombre pr-prod-nombre--choco\"" },
      { nombre: 'el botón elegido sin borde marrón', de: 'class="pr-ag__producto pr-ag__producto--choco-elegido" data-ag-producto', a: 'class="pr-ag__producto" data-ag-producto' },
      { nombre: 'el botón elegido sin la palabra', de: '`<span class="pr-ag__familia pr-ag__familia--choco">Chocolate</span><span class="pr-ag__tamano">${esc(tamano)}</span></button>`\n        }', a: '`<span class="pr-ag__tamano">${esc(tamano)}</span></button>`\n        }' },
      { nombre: 'el botón elegido sin escapar', de: '`<span class="pr-ag__familia pr-ag__familia--choco">Chocolate</span><span class="pr-ag__tamano">${esc(tamano)}</span>', a: '`<span class="pr-ag__familia pr-ag__familia--choco">Chocolate</span><span class="pr-ag__tamano">${tamano}</span>' },
      { nombre: 'CSS sin borde marrón', de: '    .pr-ag__producto--choco-elegido { border-color: var(--p-choco); }\n', a: '' },
    ],
  },
])
