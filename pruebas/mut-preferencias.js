// Mutaciones de test-preferencias.js. Ver mutar.js. De a una.
//
//   node pruebas/mut-preferencias.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-preferencias.js'),
  original: path.join(__dirname, '..', 'js', 'preferencias.js'),
  funciones: [],
  manuales: [
    { nombre: 'una lectura por llamada (no se comparte)', de: '  if (ESTADO_PREFS.cargas.has(empleadoId)) return ESTADO_PREFS.cargas.get(empleadoId)\n', a: '' },
    { nombre: 'la primera vez no se sube lo del dispositivo', de: '      if (!sonDeFabrica(copia)) await subirPrefs(empleadoId, copia)\n', a: '' },
    { nombre: 'la primera vez se sube aunque no haya nada', de: '      if (!sonDeFabrica(copia)) await subirPrefs(empleadoId, copia)', a: '      await subirPrefs(empleadoId, copia)' },
    { nombre: 'lo guardado mientras espera se pierde', de: "  if (ESTADO_PREFS.donde.get(empleadoId) === 'cargando') ESTADO_PREFS.pendiente.add(empleadoId)\n  else ", a: '  ' },
    { nombre: 'sin la marca v', de: '  const datos = { ...normalizarPrefs(prefs), v: VERSION_PREFS }', a: '  const datos = { ...normalizarPrefs(prefs) }' },
    { nombre: 'guardar no sube a la cuenta', de: '  else if (ESTADO_PREFS.base.has(empleadoId)) subirPrefs(empleadoId, p)\n', a: '' },
    { nombre: 'la cuenta no se copia al dispositivo', de: '    escribirCopia(empleadoId, p, ls)\n    return normalizarPrefs(p)', a: '    return normalizarPrefs(p)' },
    { nombre: 'un error de guardar no se dice', de: "      console.warn('preferencias: no se pudieron guardar en la cuenta', e)\n      ESTADO_PREFS.donde.set(empleadoId, 'dispositivo')", a: "      console.warn('preferencias: no se pudieron guardar en la cuenta', e)" },
    { nombre: 'un error de lectura se toma como cuenta', de: "      console.warn('preferencias: no se pudieron leer de la cuenta', e)\n      ESTADO_PREFS.donde.set(empleadoId, 'dispositivo')", a: "      console.warn('preferencias: no se pudieron leer de la cuenta', e)\n      ESTADO_PREFS.donde.set(empleadoId, 'cuenta')" },
    { nombre: 'un arreglo se toma como preferencias', de: "      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error", a: "      if (!data || typeof data !== 'object') throw new Error" },
    { nombre: 'leerPrefs ignora la memoria', de: '  if (ESTADO_PREFS.memoria.has(empleadoId)) return normalizarPrefs(ESTADO_PREFS.memoria.get(empleadoId))\n', a: '' },
    { nombre: 'las subidas no van en orden', de: '  const antes = ESTADO_PREFS.cola.get(empleadoId) ?? Promise.resolve()', a: '  const antes = Promise.resolve()' },
    { nombre: 'el uso guarda 200 por módulo', de: 'const TOPE_USO = 100', a: 'const TOPE_USO = 200' },
    { nombre: 'sin persona se consulta igual', de: '  if (!empleadoId) return Promise.resolve(prefsVacias())\n', a: '' },
  ],
})
