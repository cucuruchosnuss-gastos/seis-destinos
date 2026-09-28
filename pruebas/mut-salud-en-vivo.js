// Mutaciones de test-salud-en-vivo.js. Ver mutar.js. De a una.
//
//   node pruebas/mut-salud-en-vivo.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-salud-en-vivo.js'),
  original: path.join(__dirname, 'salud-en-vivo.js'),
  funciones: [],
  manuales: [
    { nombre: 'cualquier status de página vale', de: "  if (status !== 200) return `respondió ${status ?? 'nada'}`\n  const titulo", a: '  const titulo' },
    { nombre: 'no mira que sea la app', de: "  if (!titulo.includes(marca)) return `no parece la app (título «${titulo || 'sin título'}»)`\n", a: '' },
    { nombre: 'Auth: cualquier status vale', de: "  if (status !== 200) return `respondió ${status ?? 'nada'}`\n  try", a: '  try' },
    { nombre: 'la base: cualquier 401 vale', de: "  if (status === 401 && json?.code === '42501') return null", a: '  if (status === 401) return null' },
    { nombre: 'la base: una tabla abierta sin sesión no alarma', de: "  if (status === 200) return 'una tabla se pudo leer SIN sesión (debería dar permiso denegado)'\n", a: "  if (status === 200) return null\n" },
    { nombre: 'la base caída pasa', de: '  return `respondió ${status ?? \'nada\'}`\n}\n\n// ── La red', a: '  return null\n}\n\n// ── La red' },
    { nombre: 'no mira la planta', de: "  ['modulos/produccion.html', 'Planta'],\n", a: '' },
  ],
})
