// Mutaciones de test-ensayo.js: mutan ensayo.js. Ver mutar.js.
//
//   node pruebas/mut-ensayo.js

const path = require('path')
const { correrMutacionesEnVarios } = require('./mutar')

const suite = path.join(__dirname, 'test-ensayo.js')
correrMutacionesEnVarios([
  {
    suite, original: path.join(__dirname, 'ensayo.js'), funciones: [], variable: 'ARCHIVO_TEST',
    manuales: [
      { nombre: 'el humo no corre siempre', de: "const SIEMPRE_NAVEGADOR = ['0-humo.spec.js']", a: 'const SIEMPRE_NAVEGADOR = []' },
      { nombre: 'una pantalla es el final de otra', de: "return new RegExp(`(?<![a-z0-9_-])${esc(base)}`, 'i').test(texto)", a: "return texto.includes(base)" },
      { nombre: 'los datos: stock es stock-costos', de: 'maqueta=${esc(nombre)}(?![a-z0-9-])', a: 'maqueta=${esc(nombre)}' },
      { nombre: 'las ayudas no siguen de segunda mano', de: '    ayudasDe(r, textos, vistos)\n', a: '' },
      { nombre: 'un spec cambiado no corre', de: "    if (cambiados.includes(`e2e/${s}`)) poner(s, 'cambió')\n", a: '' },
      { nombre: 'una ayuda cambiada no corre nada', de: '    if (ayuda) poner(s, `usa ${ayuda}, que cambió`)\n', a: '' },
      { nombre: 'solo el texto del spec, sin sus ayudas', de: "    const texto = [s, ...ayudas].map(f => textos.get(f) || '').join('\\n')", a: "    const texto = textos.get(s) || ''" },
      { nombre: 'los datos de la maqueta no cuentan', de: '      if (nombre && nombraDatos(texto, nombre)) {', a: '      if (false) {' },
      { nombre: 'el .json generado no cuenta', de: '(?:e2e\\/maqueta\\/datos\\/([^/]+)\\.json|', a: '(?:' },
      { nombre: 'lo de todos no corre todos', de: "    if (deTodos) { poner(s, `cambió ${deTodos} (lo usan todos)`); continue }\n", a: '' },
      { nombre: 'la maqueta no es de todos', de: '|^e2e\\/maqueta\\/[^/]+\\.js$', a: '' },
      { nombre: 'cualquier pantalla alcanzada corre todo', de: '    const pag = paginas.find(p => abrePantalla(texto, p))', a: '    const pag = paginas[0]' },
      { nombre: 'el require sin .js no cuenta', de: "require\\(\\s*['\"]\\.\\/([a-z0-9-]+)(?:\\.js)?['\"]\\s*\\)", a: "require\\(\\s*['\"]\\.\\/([a-z0-9-]+)\\.js['\"]\\s*\\)" },
    ],
  },
])
