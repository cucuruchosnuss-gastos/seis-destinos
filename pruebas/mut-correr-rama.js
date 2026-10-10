// Mutaciones de test-correr-rama.js: mutan correr-rama.js y parecido.js. Ver mutar.js.
//
//   node pruebas/mut-correr-rama.js

const path = require('path')
const { correrMutacionesEnVarios } = require('./mutar')

const suite = path.join(__dirname, 'test-correr-rama.js')
correrMutacionesEnVarios([
  {
    suite, original: path.join(__dirname, 'correr-rama.js'), funciones: [], variable: 'ARCHIVO_TEST',
    manuales: [
      { nombre: 'una pantalla depende de pruebas/', de: "    if (!quien.startsWith('pruebas/')) return false\n", a: '' },
      { nombre: 'un comentario cuenta como dependencia', de: "    return new RegExp(`require\\\\(\\\\s*['\"]\\\\./${esc(sin)}(\\\\.js)?['\"]`).test(texto) || entreComillas.test(texto)", a: "    return texto.includes(sin)" },
      { nombre: 'sin require no cuenta', de: "    return new RegExp(`require\\\\(\\\\s*['\"]\\\\./${esc(sin)}(\\\\.js)?['\"]`).test(texto) || entreComillas.test(texto)", a: '    return entreComillas.test(texto)' },
      { nombre: 'las genéricas cuentan', de: '  if (GENERICAS.includes(quien)) return false\n', a: '' },
      { nombre: 'desde pruebas/ cualquier mención cuenta', de: "  if (quien.startsWith('pruebas/')) return entreComillas.test(texto)", a: "  if (quien.startsWith('pruebas/')) return texto.includes(base)" },
      { nombre: 'un link a otra pantalla cuenta como import', de: "  if (archivo.endsWith('.js')) return new RegExp(`(?:src=|from\\\\s*|import\\\\s*\\\\(\\\\s*)${ruta}`).test(texto)", a: "  if (archivo.endsWith('.js')) return texto.includes(base)" },
      { nombre: 'un js/ no se alcanza por su import', de: "  if (archivo.endsWith('.js')) return new RegExp(`(?:src=|from\\\\s*|import\\\\s*\\\\(\\\\s*)${ruta}`).test(texto)", a: "  if (archivo.endsWith('.js')) return false" },
      { nombre: 'una pantalla depende de otra pantalla', de: "  if (archivo.endsWith('.css')) return new RegExp(`href=${ruta}`).test(texto)\n  return false", a: "  if (archivo.endsWith('.css')) return new RegExp(`href=${ruta}`).test(texto)\n  return texto.includes(base)" },
      { nombre: 'el cierre se queda en un paso', de: '    nuevos = siguiente\n', a: '    nuevos = []\n' },
      { nombre: 'el motivo no dice quién', de: "porque.set(f, `nombra a ${quien}`)", a: "porque.set(f, 'alcanzado')" },
    ],
  },
  {
    suite, original: path.join(__dirname, 'parecido.js'), funciones: [], variable: 'ARCHIVO_PARECIDO',
    manuales: [
      { nombre: 'parecido sin el 2×', de: '  return (2 * comun) / (a.length - 1 + b.length - 1)', a: '  return comun / (a.length - 1 + b.length - 1)' },
      { nombre: 'iguales no da 1', de: '  if (a === b) return 1\n', a: '' },
      { nombre: 'la línea más parecida se queda con la primera', de: '    if (!mejor || p > mejor.parecido) mejor', a: '    if (!mejor) mejor' },
      { nombre: 'el número de línea arranca en 0', de: 'mejor = { numero: i + 1, texto: t, parecido: p }', a: 'mejor = { numero: i, texto: t, parecido: p }' },
      { nombre: 'la parte que falta es la primera, falte o no', de: '  const falta = partes.find(p => !lineasArchivo.has(p) && !texto.includes(p))', a: '  const falta = partes[0]' },
      { nombre: 'sin desplazamiento de la región', de: "lo más parecido (línea ${m.numero + desplazamiento},", a: "lo más parecido (línea ${m.numero}," },
      { nombre: 'muestra cualquier cosa aunque no se parezca', de: '  if (m && m.parecido >= 0.35) out.push', a: '  if (m) out.push' },
      { nombre: 'repetido: no dice las líneas', de: "    return `      está en las líneas ${ls.join(', ')}", a: "    return `      está repetido" },
    ],
  },
  {
    suite, original: path.join(__dirname, 'mutar.js'), funciones: [], variable: 'ARCHIVO_MUTAR',
    manuales: [
      { nombre: 'mutar.js sin la pista', de: " en ${path.basename(original)}\\n${pistaDeAncla(zona, m.de, lineasAntes)}`)", a: "`)" },
      { nombre: 'mutar.js no aborta con un ancla que falta', de: '    console.log(\'ABORTADO: mutaciones sin ancla única (mutarían el renglón equivocado):\')\n    for (const a of ambiguas) console.log(\'  \' + a)\n    process.exit(2)', a: "    console.log('ABORTADO: mutaciones sin ancla única (mutarían el renglón equivocado):')\n    for (const a of ambiguas) console.log('  ' + a)" },
    ],
  },
])
