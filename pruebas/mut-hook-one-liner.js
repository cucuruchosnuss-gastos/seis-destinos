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
    { nombre: 'el mensaje no remite a la skill', de: 'Seguí la skill editar-archivos: escribí', a: 'Seguí las reglas: escribí' },
    { nombre: 'no mira los heredocs', de: '!(ONE_LINER.test(comando) || HEREDOC.test(comando))', a: '!ONE_LINER.test(comando)' },
    { nombre: 'un heredoc de cualquier programa cuenta', de: '(?:node|python3?|py)(?:\\.exe)?(?:\\s+-)?\\s*<<', a: '\\w+(?:\\.exe)?(?:\\s+-)?\\s*<<' },
    { nombre: 'no mira sed', de: '  const s = motivoSed(comando)\n  if (s) return s\n', a: '' },
    { nombre: 'sed -i combinado no cuenta', de: '(?:-[a-zA-Z]*i\\S*|--in-place\\b)', a: '(?:-i\\b|--in-place\\b)' },
    { nombre: 'no mira --in-place', de: '|--in-place\\b)', a: ')' },
    { nombre: 'no mira perl', de: '|perl(?:\\.exe)?\\s+(?:[^\\n|;&]*?\\s)?-[a-zA-Z]*i[a-zA-Z]*\\b)', a: ')' },
    { nombre: 'no mira el reemplazo a un archivo', de: ' || (SED_A_ARCHIVO.test(afuera) && EXPRESION_DE_REEMPLAZO.test(comando))', a: '' },
    { nombre: 'mira también adentro de las comillas', de: 'const edita = SED_EN_EL_LUGAR.test(afuera)', a: 'const edita = SED_EN_EL_LUGAR.test(comando)' },
    { nombre: 'un sed a archivo sin reemplazo cuenta', de: ' && EXPRESION_DE_REEMPLAZO.test(comando))', a: ')' },
    { nombre: '/dev/null cuenta como archivo', de: '(?!\\/dev\\/null\\b)', a: '' },
    { nombre: 'el mensaje del sed no remite a la skill', de: "'Seguí la skill editar-archivos: la herramienta Edit", a: "'Seguí las reglas: la herramienta Edit" },
    { nombre: 'una entrada rota traba la sesión', de: 'try { j = JSON.parse(entrada) } catch { process.exit(0) }', a: 'try { j = JSON.parse(entrada) } catch { process.exit(2) }' },
  ],
})
