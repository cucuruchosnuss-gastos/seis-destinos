// Mutaciones del hook de one-liners (ver test-hook-one-liner.js).
const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-hook-one-liner.js'),
  original: path.join(__dirname, '..', '.claude', 'hooks', 'sin-one-liners-de-edicion.js'),
  funciones: [],
  manuales: [
    { nombre: 'no bloquea (sale con 0)', de: "process.stderr.write(m + '\\n'); process.exit(2)", a: "process.stderr.write(m + '\\n'); process.exit(0)" },
    { nombre: 'se olvida de writeFileSync', de: '/\\bwriteFileSync\\b/, ', a: '' },
    { nombre: 'se olvida de open(..., w) de python', de: "/\\bopen\\s*\\([^)]*,\\s*\\\\?['\"](?:w|a|r\\+|w\\+|a\\+|wb|ab)\\\\?['\"]/,", a: '' },
    { nombre: 'bloquea también lo de solo lectura', de: "  if (!hit) return null\n", a: '' },
    { nombre: 'no reconoce python -c', de: '|(?:python3?|py)(?:\\.exe)?\\s+(?:[^\\n]*?\\s)?-c\\b', a: '' },
    { nombre: 'el mensaje no remite a la skill', de: 'Seguí la skill editar-archivos', a: 'Seguí las reglas' },
    { nombre: 'una entrada rota traba la sesión', de: 'try { j = JSON.parse(entrada) } catch { process.exit(0) }', a: 'try { j = JSON.parse(entrada) } catch { process.exit(2) }' },
  ],
})
