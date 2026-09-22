// Mutaciones de test-numeros.js sobre js/utils.js. Mismos guards que mutar.js:
// suite verde sobre el limpio, ancla ÚNICA, la mutación tiene que cambiar el
// archivo, y el sub-proceso tiene que haber leído el mutado. De a una.
//
//   node pruebas/mut-numeros.js

const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const SUITE = path.join(__dirname, 'test-numeros.js')
const ORIGINAL = process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'js', 'utils.js')
const TMP = path.join(__dirname, 'mut-tmp-utils.js')

// EQUIVALENTES, declaradas y fuera de la cuenta (verificado a mano):
//  - "if (comas > 1)" → "> 2": con dos comas el texto cae en la rama sin coma,
//    Number("1,2,3") es NaN y da null igual. El guard es defensa en profundidad.
//  - sacar "n === null" de formatearNumeroAr: Number(String(null)) es NaN y el
//    isFinite lo devuelve como "—" igual.
const MUTACIONES = [
  ['el punto con 3 dígitos pasa a ser decimal', "/^\\d+\\.\\d{1,2}$/.test(s)", "/^\\d+\\.\\d{1,3}$/.test(s)"],
  ['el punto pegado deja de ser decimal', "else if (puntos === 1 && /^\\d+\\.\\d{1,2}$/.test(s)) [entero, decimal] = s.split('.')\n", ''],
  ['no se validan los grupos de miles', "const GRUPOS = /^\\d{1,3}(\\.\\d{3})+$/", "const GRUPOS = /^[\\d.]+$/"],
  ['no se limita la cantidad de decimales', 'if (decimal.length > decimales) return null', ''],
  ['el espacio interno se come', "let s = String(texto).trim()", "let s = String(texto).replace(/\\s/g, '')"],
  ['leer vuelve a parseFloat', "const n = Number(entero + (decimal ? '.' + decimal : ''))", "const n = parseFloat(String(texto).replace(',', '.'))"],
  ['el vacío da 0', "if (s === '') return null", "if (s === '') return 0"],
  ['negativos sin permiso', "    if (!negativos) return null\n    signo = -1", "    signo = -1"],
  ['formatear NaN no da —', "if (!Number.isFinite(v)) return '—'", ''],
  ['formatear sin puntos de miles', "  entero = entero.replace(/\\B(?=(\\d{3})+(?!\\d))/g, '.')\n  const texto", "  const texto"],
  ['formatear con punto decimal', "const texto = entero + (dec ? ',' + dec : '')", "const texto = entero + (dec ? '.' + dec : '')"],
  ['al campo sin mínimo de 2 decimales', 'minimos: entero ? 0 : Math.min(2, decimales)', 'minimos: 0'],
  ['el campo no agrupa mientras se escribe', "  const agrupado = entero.replace(/\\B(?=(\\d{3})+(?!\\d))/g, '.')", "  const agrupado = entero"],
  ['el campo deja decimales de más', 'if (decimal.length < decimales) decimal += c', 'decimal += c'],
  ['el campo deja coma sin decimales', "else if (c === ',' && decimales > 0 && !vioComa) vioComa = true", "else if (c === ',' && !vioComa) vioComa = true"],
  ['el punto tipeado no es coma', "if (e.inputType === 'insertText' && (e.data === '.' || e.data === ',')) {", "if (e.inputType === 'insertText' && (e.data === ',')) {"],
  ['borrar un punto no salta el dígito', "e.inputType === 'deleteContentBackward' && ini > 0 && v[ini - 1] === '.'", "e.inputType === 'deleteContentBackward' && ini > 0 && v[ini - 1] === '#'"],
  ['suprimir un punto no salta el dígito', "e.inputType === 'deleteContentForward' && v[ini] === '.'", "e.inputType === 'deleteContentForward' && v[ini] === '#'"],
  ['el cursor no se reubica', "  const p = _posicionTrasSignificativos(nuevo, Math.max(0, k - cerosAntes + ceroAgregado))", "  const p = nuevo.length"],
  ['los ceros sacados corren el cursor', 'Math.max(0, k - cerosAntes + ceroAgregado)', 'Math.max(0, k + ceroAgregado)'],
  ['el cero agregado delante de la coma no se cuenta', 'Math.max(0, k - cerosAntes + ceroAgregado)', 'Math.max(0, k - cerosAntes)'],
  ['el máximo no se respeta', "    if (v !== null && v > cfg.max) {", "    if (false) {"],
  ['pegar algo ilegible lo deja pasar', "    if (n === null) return\n    if (max != null && n > max) return", "    if (max != null && n > max) return"],
  ['pegar no avisa a los listeners', "    ponerNumero(input, n)\n    input.dispatchEvent(_eventoFormateado())", "    ponerNumero(input, n)"],
  ['enlazar no pasa a texto', "  input.type = 'text'\n", ''],
  ['enlazar no cambia el inputmode', "    input.setAttribute('inputmode', decimales > 0 ? 'decimal' : 'numeric')", "    input.setAttribute('inputmode', 'decimal')"],
  ['enlazar no formatea el valor previo', '    input.value = n === null ? \'\' : _textoParaCampo(n, decimales)\n  }\n  cfg.ultimo', "  }\n  cfg.ultimo"],
  ['enlazar dos veces reconfigura', "if (!input || _configCampoNumero.has(input)) return input", "if (!input) return input"],
  ['ponerNumero pone texto crudo', "  input.value = v === null ? '' : _textoParaCampo(v, cfg.decimales)\n  if (_config", "  input.value = v === null ? '' : String(v)\n  if (_config"],
  ['ponerNumero lee strings con Number', "const v = typeof n === 'number' ? (Number.isFinite(n) ? n : null) : leerNumeroAr(n, cfg)", "const v = n == null ? null : Number(n)"],
]

function correr(archivo) {
  try {
    const salida = execFileSync(process.execPath, [SUITE], { encoding: 'utf8', env: { ...process.env, UTILS_TEST: archivo }, stdio: ['ignore', 'pipe', 'pipe'] })
    return { rojo: false, salida }
  } catch (err) { return { rojo: true, salida: (err.stdout || '') + (err.stderr || '') } }
}

const src = fs.readFileSync(ORIGINAL, 'utf8')
const limpio = correr(ORIGINAL)
if (limpio.rojo) { console.log('ABORTADO: la suite no está verde sobre el limpio.\n' + limpio.salida); process.exit(2) }
console.log('Suite sobre el limpio:', limpio.salida.trim().split('\n').pop())

let detectadas = 0
const escapadas = []
try {
  for (const [nombre, de, a] of MUTACIONES) {
    const primera = src.indexOf(de)
    if (primera === -1) { console.log(`ABORTADO: «${nombre}» NO EXISTE`); process.exit(2) }
    if (src.indexOf(de, primera + 1) !== -1) { console.log(`ABORTADO: «${nombre}» AMBIGUA`); process.exit(2) }
    const mutado = src.slice(0, primera) + a + src.slice(primera + de.length)
    if (mutado === src) { console.log(`ABORTADO: «${nombre}» no cambia nada`); process.exit(2) }
    fs.writeFileSync(TMP, mutado)
    const r = correr(TMP)
    const leido = (r.salida.match(/LEIDO:(\d+)/) || [])[1]
    if (Number(leido) !== mutado.length) { console.log(`ABORTADO: «${nombre}»: el sub-proceso leyó ${leido}, se escribieron ${mutado.length}`); process.exit(2) }
    if (r.rojo) detectadas++
    else escapadas.push(nombre)
  }
} finally { try { fs.unlinkSync(TMP) } catch {} }

for (const e of escapadas) console.log('  ESCAPÓ: ' + e)
console.log(`${detectadas}/${MUTACIONES.length} mutaciones detectadas`)
process.exit(escapadas.length ? 1 : 0)
