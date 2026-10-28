// Mutaciones de test-produccion-sin-internet-pin.js (27/10/2026): la tablet
// sin internet con el wifi conectado. Dos archivos: la planta
// (modulos/produccion.html, por ARCHIVO_TEST) y js/sin-internet.js (por
// ARCHIVO_JS_SIN_INTERNET, que la suite lee en sus dos partes). Ver mutar.js.
//
//   node pruebas/mut-produccion-sin-internet-pin.js
//
// UN RUNNER POR VEZ: dos corridas en paralelo se pisan el mut-tmp-*.html.

const path = require('path')
const { correrMutacionesEnVarios } = require('./mutar')

const SUITE = path.join(__dirname, 'test-produccion-sin-internet-pin.js')
const PLANTA = process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/produccion.html')
const JS = process.env.ARCHIVO_BASE_JS || path.join(__dirname, '..', 'js', 'sin-internet.js')

correrMutacionesEnVarios([
  {
    suite: SUITE, original: PLANTA, funciones: [], variable: 'ARCHIVO_TEST',
    manuales: [
      // ── ¿Hay internet de verdad? ──
      { nombre: 'sinInternet no mira el chequeo', de: ' || estado.sinRedChequeo === true\n', a: '\n' },
      { nombre: 'el chequeo no anota "sin red"', de: '      estado.sinRedChequeo = !hay\n', a: '      estado.sinRedChequeo = false\n' },
      { nombre: 'al volver la red la cola no sale', de: '      if (hay && estabaSinRed) {', a: '      if (false) {' },
      { nombre: 'una RPC colgada se espera igual', de: "          if (!listo && !hay) rej(new TypeError('Failed to fetch (sin internet)'))", a: '          void hay' },
      { nombre: 'la cola intenta la red aunque el chequeo dijo que no', de: "      if (estado.sinRedChequeo === true) return { data: null, error: new TypeError('Failed to fetch (sin internet)') }\n", a: '' },
      // ── La inactividad ──
      { nombre: 'la inactividad cierra sin preguntar si hay red', de: '        if (!(await chequearRedPlanta())) return false\n', a: '' },
      { nombre: 'la inactividad pregunta aunque no haya nada que cerrar', de: "      const hayQueCerrar = estado.modo === 'masa' ? !!estado.maestro : (!!estado.maestro || !!estado.persona)", a: '      const hayQueCerrar = true' },
      { nombre: 'la inactividad pregunta cada segundo con la red caída', de: '      if (revisandoInactividad || sinInternet() || !vencioPorInactividad(estado.ultimoToque, ahora)) return false', a: '      if (revisandoInactividad || !vencioPorInactividad(estado.ultimoToque, ahora)) return false' },
      { nombre: 'un toque durante el chequeo no cuenta', de: '        return revisarInactividad(Math.max(ahora, Date.now()))', a: '        estado.ultimoToque = ahora - MINUTOS_INACTIVIDAD * 60000\n        return revisarInactividad(ahora)' },
      // ── El PIN ──
      { nombre: 'sin red pregunta igual a la base', de: '      if (sinInternet()) res = await verificarPinPlantaSinRed(p)\n      else {', a: '      if (false) res = await verificarPinPlantaSinRed(p)\n      else {' },
      { nombre: 'la RPC que falla por red no prueba el hash', de: '          estado.sinRedChequeo = true\n          pintarCartelCola()\n          res = await verificarPinPlantaSinRed(p)\n', a: "          p.enviando = false\n          p.mensaje = { texto: 'No se pudo verificar el PIN.' }\n          p.digitos = ''\n          return pintarPin()\n" },
      { nombre: 'un error de la base prueba el hash', de: '          if (!esErrorDeRedCarga(err)) {\n            p.enviando = false', a: '          if (false) {\n            p.enviando = false' },
      { nombre: 'con red no se guarda el hash', de: '        if (res?.ok === true && !res.sin_red) recordarPinSinRed(p, p.digitos, !!res.debe_cambiar)', a: '        if (false) recordarPinSinRed(p, p.digitos, !!res.debe_cambiar)' },
      { nombre: 'debe_cambiar se guarda como un PIN más', de: '        if (res?.ok === true && !res.sin_red) recordarPinSinRed(p, p.digitos, !!res.debe_cambiar)', a: '        if (res?.ok === true && !res.sin_red) recordarPinSinRed(p, p.digitos, false)' },
      { nombre: 'sin_puesto no borra el hash', de: "    const MOTIVOS_OLVIDAR_PIN = ['sin_pin', 'sin_puesto', 'pin_vencido']", a: "    const MOTIVOS_OLVIDAR_PIN = ['sin_pin', 'pin_vencido']" },
      { nombre: 'el PIN nuevo no vale sin red', de: '      recordarPinSinRed(p, p.pinNuevo)\n', a: '' },
      { nombre: 'entra sin la marca de sin internet', de: ', sinRed: res.sin_red === true })', a: ' })' },
      { nombre: 'recargar borra la marca', de: '        return p.sinRed === true ? { id: p.id, nombre: p.nombre, puesto: p.puesto, sinRed: true } : { id: p.id, nombre: p.nombre, puesto: p.puesto }', a: '        return { id: p.id, nombre: p.nombre, puesto: p.puesto }' },
      { nombre: 'la barra no dice modo sin internet', de: "        (estado.persona?.sinRed ? '<span class=\"pr-lat__sin-red\"", a: "        (false ? '<span class=\"pr-lat__sin-red\"" },
      { nombre: 'sin red con debe_cambiar dice el mensaje genérico', de: "      if (motivo === 'sin_red_debe_cambiar') return { texto: MENSAJE_PIN_SIN_RED_CAMBIAR }\n", a: '' },
      { nombre: 'sin hash dice el mensaje genérico', de: "      if (motivo === 'sin_red_sin_pin') return { texto: MENSAJE_PIN_SIN_RED_SIN_HASH }\n", a: '' },
      // ── Al volver la red ──
      { nombre: 'al volver la red no pide el PIN de nuevo', de: '      if (!per?.sinRed || sinInternet() || estado.maestro) return false', a: '      return false' },
      { nombre: 'pide el PIN con la red todavía caída', de: '      if (!per?.sinRed || sinInternet() || estado.maestro) return false', a: '      if (!per?.sinRed || estado.maestro) return false' },
      { nombre: 'interrumpe una masa a medio cargar', de: "      if (estado.vista === 'pr-receta' && masaEmpezada(estado.masa)) return false\n", a: '' },
      { nombre: 'una masa sin tocar también frena el PIN', de: '      if (!b) return false\n      return tamanoElegido(b.doble) !== null', a: '      if (!b) return false\n      return true || tamanoElegido(b.doble) !== null' },
      { nombre: 'elegir el tamaño no cuenta como empezada', de: '      return tamanoElegido(b.doble) !== null || b.cambiada', a: '      return b.cambiada' },
      { nombre: 'no dice por qué pide el PIN', de: "      if (estado.pin) { estado.pin.mensaje = { texto: 'Volvió internet: poné tu PIN de nuevo para seguir.' }; pintarPin() }", a: '      void 0' },
    ],
  },
  {
    suite: SUITE, original: JS, funciones: [], variable: 'ARCHIVO_JS_SIN_INTERNET',
    manuales: [
      // ── chequearRed ──
      { nombre: 'un 5xx cuenta como red', de: "    return typeof resp?.status === 'number' && resp.status > 0 && resp.status < 500", a: "    return typeof resp?.status === 'number' && resp.status > 0" },
      { nombre: 'el pedido colgado no se corta', de: '{ try { corte?.abort() } catch { /* nada */ } rej(', a: '{ rej(' },
      { nombre: 'el chequeo no tiene tiempo máximo', de: "rej(new Error('tiempo agotado')) }, espera)", a: 'void rej }, espera)' },
      { nombre: 'con el navegador sin red pregunta igual', de: "  if (nav && nav.onLine === false) return false\n  if (!base || !fetchBase) return true\n", a: "  if (!base || !fetchBase) return true\n" },
      { nombre: 'el chequeo sin la key (preflight o 401 siempre)', de: '/auth/v1/health?apikey=${encodeURIComponent(clave)}`', a: '/auth/v1/health`' },
      { nombre: 'el chequeo con cookies', de: "{ method: 'GET', cache: 'no-store', credentials: 'omit', signal: corte?.signal }", a: "{ method: 'GET', signal: corte?.signal }" },
      { nombre: 'espera 20 s', de: 'export const ESPERA_CHEQUEO_MS = 5000', a: 'export const ESPERA_CHEQUEO_MS = 20000' },
      // ── El hash ──
      { nombre: 'la sal no lleva a la persona', de: "  const extra = new TextEncoder().encode('|' + clave)", a: "  const extra = new TextEncoder().encode('')" },
      { nombre: 'pocas vueltas', de: 'export const ITERACIONES_PIN = 600000', a: 'export const ITERACIONES_PIN = 1000' },
      { nombre: 'SHA-1 en vez de SHA-256', de: "{ name: 'PBKDF2', hash: 'SHA-256',", a: "{ name: 'PBKDF2', hash: 'SHA-1'," },
      { nombre: 'la sal siempre igual', de: '  const sal = aBase64(cripto.getRandomValues(new Uint8Array(16)))', a: '  const sal = aBase64(new Uint8Array(16))' },
      { nombre: 'se guarda el PIN en claro', de: '  const reg = { clave, hash, sal, iteraciones,', a: '  const reg = { clave, pin, hash, sal, iteraciones,' },
      { nombre: 'se verifica con las vueltas de hoy y no con las guardadas', de: 'Number(reg.iteraciones) || ITERACIONES_PIN', a: 'ITERACIONES_PIN' },
      { nombre: 'la comparación da siempre igual', de: '  return d === 0\n', a: '  return true\n' },
      // ── Vencimiento, debe_cambiar, bloqueo ──
      { nombre: 'vale 7 días justos', de: '  if (!(t - Number(reg.guardado) < VIDA_PIN_SIN_RED_MS)) return', a: '  if (!(t - Number(reg.guardado) <= VIDA_PIN_SIN_RED_MS)) return' },
      { nombre: 'no vence nunca', de: "  if (!(t - Number(reg.guardado) < VIDA_PIN_SIN_RED_MS)) return { ok: false, motivo: 'sin_red_sin_pin' }\n", a: '' },
      { nombre: 'vale 30 días', de: 'export const VIDA_PIN_SIN_RED_MS = 7 * 24 * 3600 * 1000', a: 'export const VIDA_PIN_SIN_RED_MS = 30 * 24 * 3600 * 1000' },
      { nombre: 'debe_cambiar guarda el hash', de: '  if (debeCambiar) { const marca = { clave, debe_cambiar: true, guardado: ahora() }; await a.guardar(marca); return marca }\n', a: '' },
      { nombre: 'debe_cambiar no se mira al verificar', de: "  if (reg?.debe_cambiar) return { ok: false, motivo: 'sin_red_debe_cambiar' }\n", a: '' },
      { nombre: 'sin bloqueo', de: '  const bloquea = fallos >= FALLOS_PIN_SIN_RED', a: '  const bloquea = false' },
      { nombre: 'bloqueado entra igual', de: '  if (reg.bloqueado_hasta && Number(reg.bloqueado_hasta) > t) {', a: '  if (false) {' },
      { nombre: 'un acierto no vuelve a contar desde cero', de: '    if (reg.fallos || reg.bloqueado_hasta) await a.guardar({ ...reg, fallos: 0, bloqueado_hasta: null })\n', a: '' },
      { nombre: 'olvidar no borra', de: '  await a.borrar(clavePinSinRed({ personaId, unidadId, puesto }))\n', a: '' },
      { nombre: 'la clave no lleva el puesto', de: "  return `${unidadId ?? ''}|${personaId ?? ''}|${puesto ?? ''}`", a: "  return `${unidadId ?? ''}|${personaId ?? ''}`" },
    ],
  },
])
