// Mutaciones de test-salud.js (27/09/2026). Ver mutar.js.
//
//   node pruebas/mut-salud.js
const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-salud.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'js', 'salud.js'),
  funciones: [],
  manuales: [
    // ── Nada sensible ──
    { nombre: 'la URL va con su # (el token de la recuperación)', de: "try { return String(loc.origin ?? '') + String(loc.pathname ?? '') } catch { return '' }", a: "try { return String(loc.href ?? '') } catch { return '' }" },
    { nombre: 'no se tapan los números largos', de: "(m.replace(/\\D/g, '').length >= 4 ? '#' : m)", a: '(m)' },
    { nombre: 'se tapan también los números cortos', de: "(m.replace(/\\D/g, '').length >= 4 ? '#' : m)", a: "('#')" },
    { nombre: 'no se tapa "contraseña: …"', de: "    .replace(/(contrase(ñ|n)a|password|pin|token)\\s*[:=]\\s*\\S+/gi, '$1: #')\n", a: '' },
    { nombre: 'el mensaje de la RPC lleva sus parámetros', de: "mensaje: `${fn}: ${e.code ?? ''} ${e.message ?? ''}`.trim()", a: "mensaje: `${fn}: ${e.code ?? ''} ${e.message ?? ''} ${JSON.stringify(args)}`.trim()" },
    { nombre: 'el archivo del error va con su ?', de: "ev?.filename ? String(ev.filename).split('?')[0] : null", a: 'ev?.filename' },
    { nombre: 'el mensaje del error sin limpiar', de: "    p_mensaje: limpiarTexto(mensaje || '(sin mensaje)').slice(0, 1000),", a: "    p_mensaje: String(mensaje || '(sin mensaje)').slice(0, 1000)," },
    // ── Qué se registra ──
    { nombre: 'los mensajes de negocio también se registran', de: "const CODIGOS_DE_NEGOCIO = new Set(['P0001'])", a: 'const CODIGOS_DE_NEGOCIO = new Set([])' },
    { nombre: 'las RPC que fallan no se registran', de: "        else if (!CODIGOS_DE_NEGOCIO.has(e.code)) registrarError(", a: "        else if (false) registrarError(" },
    { nombre: 'sin deduplicar', de: "    if (recientes.has(clave) && ahora - recientes.get(clave) < REPETIDO_MS) return\n", a: '' },
    { nombre: 'window.onerror no se escucha', de: "  win.addEventListener?.('error', (ev) => {", a: "  win.addEventListener?.('error-no', (ev) => {" },
    { nombre: 'las promesas rechazadas no se escuchan', de: "  win.addEventListener?.('unhandledrejection', (ev) => {", a: "  win.addEventListener?.('unhandledrejection-no', (ev) => {" },
    { nombre: 'la pantalla recibe el resultado cambiado', de: "      return r\n    }).then(ok, mal)", a: "      return e ? { ...r, error: null } : r\n    }).then(ok, mal)" },
    // ── La cola ──
    { nombre: 'sin cola: lo que no se manda se pierde', de: "    if (!(await mandar(params))) guardarCola([...leerCola(), params])", a: '    await mandar(params)' },
    { nombre: 'la cola sin tope', de: "JSON.stringify(cola.slice(-MAX_COLA))", a: 'JSON.stringify(cola)' },
    { nombre: 'vaciar la cola no la vacía', de: '  guardarCola([])\n  const quedan = []', a: '  const quedan = []' },
    { nombre: 'el registro que falla tira', de: "  } catch { /* el registro nunca rompe nada */ }", a: '  } catch (e) { throw e }' },
    { nombre: 'mandar no ataja el rechazo', de: "  try {\n    const { error } = await rpcOriginal('registrar_error_app', params)\n    return !error\n  } catch { return false }", a: "  const { error } = await rpcOriginal('registrar_error_app', params)\n  return !error" },
    // ── La clase de error ──
    { nombre: 'un corte de red cuenta como sesión inválida', de: "  if (!err || esErrorDeRed(err)) return false\n  const t = `${err.code", a: "  if (!err) return false\n  const t = `${err.code" },
    { nombre: 'Failed to fetch no es de red', de: "/Failed to fetch|NetworkError", a: '/Fallo que no existe|NetworkError' },
    // ── Al volver ──
    { nombre: 'al volver no avisa app:reanudada', de: "      globalThis.dispatchEvent?.(new CustomEvent('app:reanudada', { detail: { origen } }))\n", a: '' },
    { nombre: 'no se renueva el token por vencer', de: '      if (Number(s.expires_at) * 1000 - Date.now() < 60 * 1000) {', a: '      if (false) {' },
    { nombre: 'sin red va al login', de: "      intentos++\n      mostrarSinConexion()", a: "      intentos++\n      await sesionCortada('x')\n      mostrarSinConexion()" },
    { nombre: 'sin red no muestra el aviso', de: "      intentos++\n      mostrarSinConexion()", a: '      intentos++' },
    { nombre: 'sin red no reintenta', de: "      reintento = setTimeout(() => revisarAlVolver('reintento'), Math.min(30000, 3000 * 2 ** Math.min(intentos - 1, 4)))\n", a: '' },
    { nombre: 'sin red no se registra', de: "      if (intentos === 1) registrarError({ evento: 'reanudar'", a: "      if (false) registrarError({ evento: 'reanudar'" },
    { nombre: 'la sesión que desaparece no corta', de: "        if (teniaSesion) { await sesionCortada('al volver, la sesión ya no estaba'); return 'cortada' }\n", a: '' },
    { nombre: 'sin sesión nunca también corta', de: "  try { supabase.auth.onAuthStateChange((_ev, ses) => { if (ses) teniaSesion = true }) } catch { /* nada */ }", a: '  teniaSesion = true' },
    { nombre: 'el refresco inválido no corta', de: "        if (r.error && esSesionInvalida(r.error)) { await sesionCortada('al volver: ' + (r.error.code || r.error.message)); return 'cortada' }\n", a: '' },
    { nombre: 'escucha menos eventos', de: "  win.document?.addEventListener?.('resume', () => alVolver('resume'))\n", a: '' },
    // ── El corte ──
    { nombre: 'el corte no deja el aviso', de: "  try { globalThis.localStorage?.setItem(CLAVE_AVISO_LOGIN, MENSAJE_SESION_CERRADA) } catch { /* nada */ }\n", a: '' },
    { nombre: 'el corte no cierra la sesión local', de: "  try { await cliente?.auth.signOut({ scope: 'local' }) } catch { /* nada */ }\n", a: '' },
    { nombre: 'el aviso del login no se borra', de: "if (m) ls.removeItem(CLAVE_AVISO_LOGIN); return m || null", a: 'return m || null' },
    { nombre: 'la planta no usa su login', de: "  const meta = doc?.querySelector?.('meta[name=\"sd-login\"]')?.getAttribute('content')\n  if (!meta) return LOGIN_POR_DEFECTO", a: '  return LOGIN_POR_DEFECTO' },
    { nombre: 'un sd-login de otro sitio se sigue', de: 'return u.origin === new URL(loc.href).origin ? u.href : LOGIN_POR_DEFECTO', a: 'return u.href' },
    { nombre: 'usuario no identificado: no se revisa', de: '        if (esUsuarioNoIdentificado(e)) verificarCorte()', a: '        if (false) verificarCorte()' },
    { nombre: 'usuario no identificado sin red corta igual', de: "    if (r.error) { if (esSesionInvalida(r.error)) await sesionCortada('la base no identifica al usuario y la sesión no se renueva'); return }", a: "    if (r.error) { await sesionCortada('x'); return }" },
  ],
})
