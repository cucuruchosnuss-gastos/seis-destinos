// Mutaciones de test-navegador-en-dos.js: mutan e2e/mitades.js, el workflow
// navegador.yml y e2e/playwright.config.js. Ver mutar.js.
//
//   node pruebas/mut-navegador-en-dos.js

const path = require('path')
const { correrMutacionesEnVarios } = require('./mutar')

const RAIZ = path.join(__dirname, '..')
const suite = path.join(__dirname, 'test-navegador-en-dos.js')
const r = String.raw

correrMutacionesEnVarios([
  {
    suite, original: path.join(RAIZ, 'e2e', 'mitades.js'), funciones: [], variable: 'ARCHIVO_MITADES',
    manuales: [
      { nombre: 'la mitad 2 no ignora la 1 (corren dos veces)', de: r`return { testIgnore: [/[\\/]node_modules[\\/]/, reMitad1()] }`, a: r`return { testIgnore: [/[\\/]node_modules[\\/]/] }` },
      { nombre: 'la mitad 1 no corre nada (quedan sin correr)', de: 'if (n === 1) return { testMatch: [reMitad1()] }', a: 'if (n === 1) return { testMatch: [/^$/] }' },
      { nombre: 'el final del nombre alcanza (16-planta-reanudar es 6-planta-reanudar)', de: r`(^|[\\\\/])(?:`, a: '(?:' },
      { nombre: 'un spec de la mitad 1 que no existe', de: "  '61-cheques-importe-completo.spec.js',\n]", a: "  '61-cheques-importe-completo.spec.js',\n  'no-existe.spec.js',\n]" },
      { nombre: 'un spec repetido en la mitad 1', de: "  '61-cheques-importe-completo.spec.js',\n]", a: "  '61-cheques-importe-completo.spec.js',\n  'filtros-dispositivos.spec.js',\n]" },
      { nombre: 'una mitad rara no es un error', de: 'if (!Number.isInteger(n) || n < 1 || n > MITADES) {', a: 'if (false) {' },
      { nombre: 'sin E2E_MITAD corre solo la mitad 1', de: "if (valor === undefined || valor === null || valor === '') return {}", a: "if (valor === undefined || valor === null || valor === '') return { testMatch: [reMitad1()] }" },
      { nombre: 'el robot partido en las dos mitades', de: "  '61-cheques-importe-completo.spec.js',\n]", a: "  '61-cheques-importe-completo.spec.js',\n  '1-planta.spec.js',\n]" },
      { nombre: 'las mitades disparejas', de: "  '61-cheques-importe-completo.spec.js',\n]", a: "  '61-cheques-importe-completo.spec.js',\n  '0-humo.spec.js',\n  '5-maqueta.spec.js',\n  '8-planta-tamanos.spec.js',\n]" },
      { nombre: 'tres mitades', de: 'const MITADES = 2', a: 'const MITADES = 3' },
      { nombre: 'TIEMPOS con un spec que ya no existe', de: "  '35-prestamos.spec.js': 11,", a: "  '35-prestamos.spec.js': 11,\n  'viejo.spec.js': 5," },
      { nombre: 'listarSpecs se saltea specs', de: r`else if (/\.spec\.js$/.test(e.name))`, a: r`else if (/^\d.*\.spec\.js$/.test(e.name))` },
    ],
  },
  {
    suite, original: path.join(RAIZ, '.github', 'workflows', 'navegador.yml'), funciones: [], variable: 'ARCHIVO_WORKFLOW',
    manuales: [
      { nombre: 'un solo trabajo (la mitad 2 no corre)', de: 'mitad: [1, 2]', a: 'mitad: [1]' },
      { nombre: 'fail-fast', de: 'fail-fast: false', a: 'fail-fast: true' },
      { nombre: 'sin E2E_MITAD (las dos corren todo)', de: '      E2E_MITAD: ${{ matrix.mitad }}\n', a: '' },
      { nombre: 'el mismo artefacto para las dos', de: 'name: capturas-${{ matrix.mitad }}', a: 'name: capturas' },
      { nombre: 'la fila de antes (una rama cancela la espera de main)', de: 'group: navegador-${{ github.ref }}', a: 'group: navegador' },
      { nombre: 'cortar la corrida empezada', de: '  cancel-in-progress: false\n\njobs:', a: '  cancel-in-progress: true\n\njobs:' },
      { nombre: 'la clave del robot llega a las ramas', de: "E2E_SERVICE_ROLE_KEY: ${{ github.ref == 'refs/heads/main' && secrets.E2E_SERVICE_ROLE_KEY || '' }}", a: 'E2E_SERVICE_ROLE_KEY: ${{ secrets.E2E_SERVICE_ROLE_KEY }}' },
      { nombre: 'tope de 60 minutos', de: 'timeout-minutes: 30', a: 'timeout-minutes: 60' },
      { nombre: 'sin WebKit', de: 'chromium webkit', a: 'chromium' },
      { nombre: 'otro nombre de workflow', de: 'name: Navegador\n\non:', a: 'name: Navegador en dos\n\non:' },
      { nombre: 'sin las ramas ci-prueba', de: "branches: [main, 'ci-prueba/**']", a: 'branches: [main]' },
      { nombre: 'sin la noche', de: "    - cron: '0 8 * * *'\n", a: '' },
      { nombre: 'el trabajo no dice su mitad', de: '    name: Navegador ${{ matrix.mitad }}/2', a: '    name: Navegador' },
      { nombre: 'sin Playwright', de: '        run: npm run e2e', a: '        run: echo nada' },
    ],
  },
  {
    suite, original: path.join(RAIZ, 'e2e', 'playwright.config.js'), funciones: [], variable: 'ARCHIVO_CONFIG',
    manuales: [
      { nombre: 'la config no usa las mitades', de: '  ...opcionesDeMitad(process.env.E2E_MITAD),\n', a: '' },
      { nombre: 'la config no lee E2E_MITAD', de: '...opcionesDeMitad(process.env.E2E_MITAD)', a: '...opcionesDeMitad(undefined)' },
      { nombre: 'la mitad ANTES de testMatch (la 1 correría todo)', de: "  testMatch: /.*\\.spec\\.js$/,\n  // DESPUÉS de testMatch: la mitad 1 lo reemplaza por su lista.\n  ...opcionesDeMitad(process.env.E2E_MITAD),\n", a: "  ...opcionesDeMitad(process.env.E2E_MITAD),\n  testMatch: /.*\\.spec\\.js$/,\n" },
    ],
  },
])
