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
      { nombre: 'una mitad rara no es un error', de: 'if (!Number.isInteger(n) || n < 1 || n > MITADES) {', a: 'if (false) {' },
      { nombre: 'sin E2E_MITAD corre solo la mitad 1', de: "if (valor === undefined || valor === null || valor === '') return {}", a: "if (valor === undefined || valor === null || valor === '') return { testMatch: [reMitad1()] }" },
      { nombre: 'tres mitades', de: 'const MITADES = 2', a: 'const MITADES = 3' },
      // El reparto automático (28/10/2026).
      { nombre: 'TIEMPOS con un spec que ya no existe', de: "'tiempos-navegador.json'), 'utf8')).segundos", a: "'tiempos-navegador.json'), 'utf8')).segundos; TIEMPOS['viejo.spec.js'] = 5" },
      { nombre: 'el robot no va en bloque', de: 'const robot = specs.filter(s => ROBOT.test(textoDe(s)))', a: 'const robot = []' },
      { nombre: 'el más corto primero', de: 'b.segundos - a.segundos ||', a: 'a.segundos - b.segundos ||' },
      { nombre: 'todo a la mitad más pesada', de: 'mitades[0].segundos <= mitades[1].segundos ? mitades[0] : mitades[1]', a: 'mitades[0].segundos <= mitades[1].segundos ? mitades[1] : mitades[0]' },
      { nombre: 'los empates sin orden por nombre', de: ' || (a.specs[0] < b.specs[0] ? -1 : 1))', a: ')' },
      { nombre: 'las mitades sin ordenar', de: '  for (const m of mitades) m.specs.sort()\n', a: '' },
      { nombre: 'un spec sin medir no cuenta', de: 'const TIEMPO_SIN_MEDIR = 20', a: 'const TIEMPO_SIN_MEDIR = 0' },
      { nombre: 'el tiempo por la ruta entera', de: 'TIEMPOS[path.posix.basename(nombre)]', a: 'TIEMPOS[nombre]' },
      { nombre: 'la mitad 1 es la otra', de: '{ textoDe: textoDeSpec })[0].specs', a: '{ textoDe: textoDeSpec })[1].specs' },
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
      { nombre: 'sin WebKit', de: 'run: npx playwright install chromium webkit', a: 'run: npx playwright install chromium' },
      // La imagen de Playwright (26/10/2026).
      { nombre: 'vuelve a instalar con apt', de: 'run: npx playwright install chromium webkit', a: 'run: npx playwright install --with-deps chromium webkit' },
      { nombre: 'la imagen de otra versión', de: 'image: mcr.microsoft.com/playwright:v1.63.0-noble', a: 'image: mcr.microsoft.com/playwright:v1.62.0-noble' },
      { nombre: 'sin la imagen', de: '    container:\n      image: mcr.microsoft.com/playwright:v1.63.0-noble\n      options: --ipc=host\n', a: '' },
      { nombre: 'sin --ipc=host', de: '      options: --ipc=host\n', a: '' },
      { nombre: 'sin bash (el contenedor usa sh)', de: '    defaults:\n      run:\n        shell: bash\n', a: '' },
      { nombre: 'vuelve a ubuntu-latest', de: '    runs-on: ubuntu-24.04', a: '    runs-on: ubuntu-latest' },
      { nombre: 'el paso de los navegadores sin su tope', de: '        timeout-minutes: 8\n', a: '' },
      { nombre: 'el paso de los navegadores con el tope del trabajo', de: '        timeout-minutes: 8\n', a: '        timeout-minutes: 30\n' },
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
      { nombre: 'sin los tiempos en CI', de: ", [`${__dirname}/reporter-tiempos.js`]]", a: "]" },
      { nombre: 'las dos mitades del ensayo en la misma carpeta', de: 'outputDir: `${__dirname}/resultados${SALIDA}`', a: 'outputDir: `${__dirname}/resultados`' },
    ],
  },
  {
    suite, original: path.join(RAIZ, 'e2e', 'reporter-tiempos.js'), funciones: [], variable: 'ARCHIVO_REPORTER',
    manuales: [
      { nombre: 'el aviso sin límite de largo', de: 'actual.length + p.length + 1 > LARGO', a: 'false' },
      { nombre: 'un spec puede quedar en 0 segundos', de: 'Math.max(1, Math.round(s))', a: 'Math.round(s)' },
      { nombre: 'el aviso sin la mitad', de: "const sufijo = mitad ? ` mitad ${mitad}` : ''", a: "const sufijo = ''" },
      { nombre: 'el aviso de otro tipo', de: '::notice title=tiempos-navegador', a: '::warning title=tiempos-navegador' },
    ],
  },
  {
    suite, original: path.join(__dirname, 'tiempos-navegador.js'), funciones: [], variable: 'ARCHIVO_TIEMPOS',
    manuales: [
      { nombre: 'toma cualquier aviso', de: "    if (!/^tiempos-navegador\\b/.test(a.title || '')) continue\n", a: '' },
      { nombre: 'combinar olvida lo no medido', de: '[...Object.entries(viejos)].filter(([s]) => existe.has(s))', a: '[]' },
      { nombre: 'combinar deja lo que no existe', de: 'for (const [s, seg] of medidos) if (existe.has(s)) todos.set(s, seg)', a: 'for (const [s, seg] of medidos) todos.set(s, seg)' },
      { nombre: 'combinar sin ordenar', de: '[...todos].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))', a: '[...todos]' },
    ],
  },
])
