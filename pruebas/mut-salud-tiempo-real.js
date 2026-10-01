// Mutaciones de test-salud-tiempo-real.js (30/09/2026). Ver mutar.js.
//
//   node pruebas/mut-salud-tiempo-real.js
const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-salud-tiempo-real.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'js', 'salud.js'),
  funciones: [],
  manuales: [
    { nombre: 'se registra cada corte en el momento', de: '  const caida = { estado, timer: null }\n', a: "  registrar({ evento, mensaje: 'Tiempo real: ' + estado })\n  const caida = { estado, timer: null }\n" },
    { nombre: 'una espera vieja registra un corte ya terminado', de: '    if (caidaTiempoReal !== caida) return\n', a: '' },
    { nombre: 'la espera no es de 2 minutos', de: 'export const ESPERA_TIEMPO_REAL_MS = 2 * 60 * 1000', a: 'export const ESPERA_TIEMPO_REAL_MS = 30 * 1000' },
    { nombre: 'cada aviso del mismo corte programa otra espera', de: '  if (caidaTiempoReal) { caidaTiempoReal.estado = estado; return }\n', a: '' },
    { nombre: 'sin el último estado', de: '  if (caidaTiempoReal) { caidaTiempoReal.estado = estado; return }', a: '  if (caidaTiempoReal) { return }' },
    { nombre: 'reconectar no cancela la espera', de: '  try { cancelar(caidaTiempoReal.timer) } catch { /* nada */ }\n', a: '' },
    { nombre: 'reconectar no termina el corte', de: '  try { cancelar(caidaTiempoReal.timer) } catch { /* nada */ }\n  caidaTiempoReal = null', a: '  try { cancelar(caidaTiempoReal.timer) } catch { /* nada */ }' },
    { nombre: 'el mensaje sin el patrón de errores_conocidos', de: "mensaje: 'Tiempo real: ' + caida.estado + ' (no se pudo reconectar en 2 minutos)'", a: "mensaje: 'Conexión en vivo: ' + caida.estado" },
  ],
})
