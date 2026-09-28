// Mutaciones de test-sesiones.js sobre js/sesiones.js. Ver mutar.js. De a una.
//
//   node pruebas/mut-sesiones.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

// En UTC, para que una hora sin la zona de Argentina se note (la máquina de
// Facu ya está en -03 y la escondería).
process.env.TZ = 'UTC'

correrMutaciones({
  suite: path.join(__dirname, 'test-sesiones.js'),
  original: path.join(__dirname, '..', 'js', 'sesiones.js'),
  funciones: [],
  manuales: [
    { nombre: 'la IP sin escapar', de: 'IP ${escSes(s.ip || \'—\')}', a: 'IP ${s.ip || \'—\'}' },
    // El dispositivo legible NO se muta sin escape: dispositivoLegible() devuelve solo palabras del código (nunca el user agent), así que la página saldría idéntica.
    { nombre: 'el nombre del título sin escapar', de: "`Sesiones de ${escSes(e.nombre)}`", a: '`Sesiones de ${e.nombre}`' },
    { nombre: 'el error de la base sin escapar', de: 'role="alert">${escSes(e.error)}</div>', a: 'role="alert">${e.error}</div>' },
    { nombre: 'el escape no escapa comillas', de: ".replace(/\"/g, '&quot;')", a: '' },
    { nombre: 'Edge se lee como Chrome', de: "  else if (/Edg(A|iOS)?\\//.test(t)) nav = 'Edge'\n", a: '' },
    { nombre: 'Samsung se lee como Chrome', de: "  if (/SamsungBrowser\\//.test(t)) nav = 'Samsung Internet'\n  else if", a: '  if' },
    { nombre: 'un programa cualquiera dice un navegador', de: "  return 'Otro programa'", a: "  return 'Chrome'" },
    { nombre: 'la hora sin la zona de Argentina', de: "{ timeZone: ZONA_AR, year: 'numeric'", a: "{ year: 'numeric'" },
    { nombre: 'una fecha inválida se inventa', de: "  if (!f || Number.isNaN(f.getTime())) return '—'\n", a: '' },
    { nombre: 'el motivo de 1 letra alcanza', de: 'export const LARGO_MINIMO_MOTIVO_SESIONES = 3', a: 'export const LARGO_MINIMO_MOTIVO_SESIONES = 1' },
    { nombre: 'sin motivo igual pide confirmar', de: "  if (!motivoValido(e.motivo)) { e.errorMotivo = 'Poné el motivo (3 letras o más).'; return e }\n", a: '' },
    { nombre: 'cierra sin haber confirmado', de: "  if (e.paso !== 'confirmar' || !motivoValido(e.motivo)) return null", a: '  if (!motivoValido(e.motivo)) return null' },
    { nombre: 'el motivo viaja con espacios', de: 'p_motivo: String(motivo).trim()', a: 'p_motivo: String(motivo)' },
    { nombre: 'a otra persona (sin p_empleado_id)', de: "sb.rpc('cerrar_sesiones', { p_empleado_id: empleadoId,", a: "sb.rpc('cerrar_sesiones', {" },
    { nombre: 'el error de la base se tapa', de: "  if (!r.ok) { e.paso = 'confirmar'; e.errorCierre = r.error; return null }", a: "  if (!r.ok) { e.paso = 'confirmar'; e.errorCierre = 'Hubo un error.'; return null }" },
    { nombre: 'las propias no van al login', de: "  if (e.propia) return 'cortar'\n", a: '' },
    { nombre: 'las propias sin avisar que cierra esta', de: "(e.propia ? '<p class=\"sesiones__nota\">También se cierra esta sesión: vas a tener que volver a entrar.</p>' : '')", a: "''" },
    { nombre: 'confirmar sin decir que cierra esta', de: "? `¿Cerrar ${n}? También se cierra esta: vas a tener que volver a entrar.`", a: '? `¿Cerrar ${n}?`' },
    { nombre: 'cerrando no traba el botón', de: `data-accion="confirmar-cerrar"\${e.paso === 'cerrando' ? ' disabled' : ''}`, a: 'data-accion="confirmar-cerrar"' },
    { nombre: 'no es un diálogo modal', de: "  panel.setAttribute('aria-modal', 'true')\n", a: '' },
    { nombre: 'Escape no cierra', de: "  const teclas = (ev) => { if (ev.key === 'Escape' && e.paso !== 'cerrando') cerrar() }", a: '  const teclas = () => {}' },
    { nombre: 'Escape corta a la mitad del cierre', de: "if (ev.key === 'Escape' && e.paso !== 'cerrando') cerrar()", a: "if (ev.key === 'Escape') cerrar()" },
    { nombre: 'se abren dos paneles', de: '  if (abierto) abierto.cerrar()\n', a: '' },
    { nombre: 'lee las sesiones de otro', de: "sb.rpc('sesiones_de', { p_empleado_id: empleadoId })", a: "sb.rpc('sesiones_de', {})" },
    { nombre: 'un error de lectura inventa una lista vacía', de: "    return { filas: null, error: err?.message || 'No se pudieron leer las sesiones.' }", a: "    return { filas: [], error: null }" },
  ],
})
