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
      { nombre: 'el tope corta solo al hijo (no al navegador, que es nieto)',
        de: "  if (process.platform === 'win32') {\n    try { spawnSync('taskkill', ['/PID', String(hijo.pid), '/T', '/F'], { stdio: 'ignore' }) } catch {}\n    return\n  }\n  for (const p of descendientes(hijo.pid)) try { process.kill(p, 'SIGKILL') } catch {}\n  try { process.kill(-hijo.pid, 'SIGKILL') } catch {}\n",
        a: "" },
      { nombre: 'el tope no corta nada (espera para siempre)', de: '      matarArbol(hijo)\n', a: '' },
      { nombre: 'Playwright sin --global-timeout',
        de: "'e2e/playwright.config.js', `--global-timeout=${globalTimeoutMs(topeMin)}`, ", a: "'e2e/playwright.config.js', " },
      { nombre: 'un paso colgado que después sale en 0 da verde', de: "hijo.on('exit', (codigo) => fin(!colgado && codigo === 0))", a: "hijo.on('exit', (codigo) => fin(codigo === 0 || colgado))" },
      { nombre: 'el require sin .js no cuenta', de: "require\\(\\s*['\"]\\.\\/([a-z0-9-]+)(?:\\.js)?['\"]\\s*\\)", a: "require\\(\\s*['\"]\\.\\/([a-z0-9-]+)\\.js['\"]\\s*\\)" },
      // Los topes medidos, las dos mitades y --limpiar con marcas (28/10/2026).
      { nombre: 'sin margen', de: 'const MARGEN = 1.3', a: 'const MARGEN = 1' },
      { nombre: 'las suites sin mínimo ni máximo', de: 'return entre(TOPE_PRUEBAS.minimo, Math.ceil(seg * MARGEN / 60), TOPE_PRUEBAS.maximo)', a: 'return Math.ceil(seg * MARGEN / 60)' },
      { nombre: 'un corte nunca cuenta', de: '  if (corte && (!verde || corte.fecha > verde.fecha)) m = Math.max(m ?? 0, corte.valor)\n', a: '' },
      { nombre: 'cuenta cualquier corte, aunque sea viejo', de: '(!verde || corte.fecha > verde.fecha)', a: 'true' },
      { nombre: 'un corte achica el tope', de: 'Math.max(m ?? 0, corte.valor)', a: 'corte.valor' },
      { nombre: 'el navegador sin el factor', de: 'estimadoSeg * factor * MARGEN', a: 'estimadoSeg * MARGEN' },
      { nombre: 'el navegador sin mínimo', de: 'entre(TOPE_NAVEGADOR.minimo, ', a: 'entre(0, ' },
      { nombre: 'el navegador sin datos sin factor', de: '?? TOPE_NAVEGADOR.factorSinDatos', a: '?? 1' },
      { nombre: 'anotar se olvida lo anterior', de: 'const r = { ...(registro || {}) }', a: 'const r = {}' },
      { nombre: 'guardar sin releer (pisa lo de otros pasos)', de: '  const todo = leerDuraciones(archivo)\n  todo[paso]', a: '  const todo = {}\n  todo[paso]' },
      { nombre: 'una roja sin cortarse anota verde', de: 'if (hechas.length && hechas.every(c => c.ok))', a: 'if (hechas.length)' },
      { nombre: 'el factor más bajo', de: 'return { verde: Math.max(...hechas.map(c => factor(c.segundos, c))) }', a: 'return { verde: Math.min(...hechas.map(c => factor(c.segundos, c))) }' },
      { nombre: 'una cortada no anota', de: '  if (cortadas.length) return { corte: Math.max(...cortadas.map(c => factor(c.tope * 60, c))) }\n', a: '' },
      { nombre: 'las dos mitades corren todo', de: 'specs.filter(s => mitadDe(s) === n)', a: 'specs' },
      { nombre: 'con prefijo se pierde el último renglón', de: "  stream.on('end', () => { if (resto) process.stdout.write(prefijo + resto + '\\n') })\n", a: '' },
      { nombre: 'los errores sin prefijo (se pierden)', de: '; conPrefijo(hijo.stderr, prefijo) }', a: ' }' },
      { nombre: 'un solo puerto', de: 'for (let i = 0; i < n; i++)', a: 'for (let i = 0; i < 1; i++)' },
      { nombre: 'el PID no importa (todo lo marcado vive)', de: '(marca.compu !== compu || vivo(marca.pid))', a: 'true' },
      { nombre: 'otra compu se mira como si fuera esta', de: 'marca.compu !== compu || vivo(marca.pid)', a: 'vivo(marca.pid)' },
      { nombre: 'un PID viejo vale para siempre', de: 'ahora - inicio < VIDA_MAXIMA_H * HORA_MS && ', a: '' },
      { nombre: 'uno que terminó sigue vivo', de: 'if (marca && !marca.fin && ', a: 'if (marca && ' },
      { nombre: 'abandonado enseguida', de: "  if (ahora - desde < ABANDONO_H * HORA_MS) return 'reciente'\n", a: '' },
      { nombre: 'se cuenta desde el inicio aunque haya terminado', de: 'Date.parse(marca.fin || marca.inicio)', a: 'Date.parse(marca.inicio)' },
      { nombre: 'una marca rota no se borra nunca', de: '  if (!Number.isFinite(desde)) desde = mtimeMs\n', a: '' },
      { nombre: 'cualquier PID vive', de: "try { process.kill(pid, 0); return true } catch (e) { return e.code === 'EPERM' }", a: 'return true' },
      { nombre: '--limpiar borra los que siguen corriendo', de: "    if (estado === 'vivo') {", a: '    if (false) {' },
      { nombre: '--limpiar borra los recientes', de: "    if (estado === 'reciente' && !nombre) {", a: '    if (false) {' },
      { nombre: 'borrar deja la marca', de: '  if (borrada) try { fs.unlinkSync(marcaDe(dir)) } catch {}\n', a: '' },
      { nombre: 'si git no puede borrar, queda (sin el respaldo de node)', de: '    try { fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3 }) } catch {}\n', a: '' },
      { nombre: 'no mira las marcas sin carpeta', de: 'if (!m || fs.existsSync(path.join(CARPETA_ENSAYOS, m[1]))) continue', a: 'continue' },
      { nombre: 'borra marcas de ensayos vivos sin carpeta', de: "if (estadoDe({ marca: leerMarca(dir), mtimeMs: 0, ahora }) !== 'vivo') try", a: 'try' },
    ],
  },
])
