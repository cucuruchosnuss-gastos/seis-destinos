// Mutaciones de test-sin-internet.js (06/10/2026). Ver mutar.js.
//
//   node pruebas/mut-sin-internet.js
//
// UN RUNNER POR VEZ: dos corridas en paralelo se pisan el archivo temporal.
const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-sin-internet.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'js', 'sin-internet.js'),
  funciones: [],
  manuales: [
    // ── ¿Red o base? ──
    { nombre: 'un raise de la base cuenta como red (se reintentaría para siempre)', de: "  if (codigo !== '') return false\n", a: '' },
    { nombre: '"No se pudo identificar" queda como error de la base', de: "  if (/No se pudo identificar tu usuario/i.test(texto)) return true\n", a: '' },
    { nombre: 'el token vencido queda como error de la base', de: "  if (/^PGRST3/.test(codigo) || /JWT/i.test(texto)) return true\n", a: '' },
    { nombre: 'un 503 no cuenta como red', de: "  if (typeof err.status === 'number' && err.status >= 500) return true\n", a: '' },
    // ── La copia ──
    { nombre: 'las escrituras también se copian', de: "  if (rpc) return m === 'POST' && lecturas.has(rpc[1])", a: "  if (rpc) return m === 'POST'" },
    { nombre: 'un POST a una tabla se copia', de: "  return m === 'GET' && /^\\/rest\\/v1\\/[a-z_0-9]+$/.test(u.pathname)", a: "  return /^\\/rest\\/v1\\/[a-z_0-9]+$/.test(u.pathname)" },
    { nombre: 'la clave no lleva el cuerpo (otra RPC contesta con la copia de otra)', de: "  return `${String(metodo || 'GET').toUpperCase()} ${url}${cuerpo ? ' ' + cuerpo : ''}`", a: "  return `${String(metodo || 'GET').toUpperCase()} ${url}`" },
    { nombre: 'la copia no se guarda', de: "        await a.guardar('copias', { clave, cuerpo: texto, estado: resp.status, encabezados, guardado: ahora() })", a: '        void a' },
    { nombre: 'sin red no se usa la copia', de: '      return desdeCopia(err)\n    }', a: '      throw err\n    }' },
    { nombre: 'la copia vieja se usa igual', de: '  if (!copia || ahora() - Number(copia.guardado) > VIDA_COPIA_MS) throw errorRed', a: '  if (!copia) throw errorRed' },
    { nombre: 'no avisa que es la copia', de: '      alUsarCopia(Number(copia.guardado), clave)\n', a: '' },
    { nombre: 'la copia avisa la hora de AHORA', de: '      alUsarCopia(Number(copia.guardado), clave)', a: '      alUsarCopia(ahora(), clave)' },
    { nombre: 'con el navegador sin red, intenta la red igual', de: "    if (nav && nav.onLine === false) return desdeCopia(new TypeError('Failed to fetch (sin internet)'))\n", a: '' },
    { nombre: 'la red colgada espera para siempre', de: '      resp = await conTiempo(fetchBase(input, init), esperaLectura)', a: '      resp = await fetchBase(input, init)' },
    { nombre: 'la base caída no cae a la copia', de: "      try { return await desdeCopia(new Error('HTTP ' + resp.status)) } catch { return resp }", a: '      return resp' },
    { nombre: 'sin content-range en la copia', de: "const ENCABEZADOS_COPIA = ['content-type', 'content-range', 'preference-applied']", a: "const ENCABEZADOS_COPIA = ['content-type']" },
    // ── La cola ──
    { nombre: 'un error de la base frena TODAS las planillas', de: "              await guardar(it); r.errores++; alCambiar()\n              break\n            }\n            it.estado = 'enviado'", a: "              await guardar(it); r.errores++; alCambiar()\n              break afuera\n            }\n            it.estado = 'enviado'" },
    { nombre: 'un error de la base no frena su planilla', de: "            if (it.estado === 'error') break // frena SOLO esta planilla", a: "            if (it.estado === 'error') continue" },
    { nombre: 'un error de red marca error', de: "              if (esRed(res.error)) {", a: '              if (false) {' },
    { nombre: 'sin red sigue intentando las demás', de: '                break afuera\n              }\n              it.estado = \'error\'', a: '                break\n              }\n              it.estado = \'error\'' },
    { nombre: 'lo enviado se vuelve a mandar', de: "          if (it.estado === 'enviado') continue\n", a: '' },
    { nombre: 'el orden se da vuelta', de: 'const ORDEN = (a, b) => (Number(a.orden) - Number(b.orden))', a: 'const ORDEN = (a, b) => (Number(b.orden) - Number(a.orden))' },
    { nombre: 'la misma clave se agrega dos veces', de: '    if (existente) return existente\n', a: '' },
    { nombre: 'no se guarda el resultado', de: "            it.resultado = res?.data && typeof res.data === 'object' ? res.data : { valor: res?.data ?? null }", a: '            it.resultado = null' },
    { nombre: 'las referencias no se resuelven', de: "        return otro.resultado[v.campo] ?? null", a: '        return null' },
    { nombre: 'una referencia sin resultado no espera', de: "        if (!otro || otro.estado !== 'enviado' || !otro.resultado) { espera = espera ?? v.$ref; return null }", a: '        if (!otro) return null' },
    { nombre: 'la que depende de una con error se manda igual', de: "              if (!dep || dep.estado === 'error') {", a: '              if (false) {' },
    { nombre: 'lo enviado nunca se borra', de: "          if (it.estado === 'enviado' && ahora() - Number(it.enviado_en) > GUARDAR_ENVIADOS_MS) await a.borrar('cola', it.id)", a: '          void it' },
    { nombre: 'rechazo en el momento queda en la cola', de: "        await (await tomar()).borrar('cola', despues.id)\n        alCambiar()\n      }", a: '      }' },
    { nombre: 'no se distingue la bloqueada', de: "      return { resultado: 'bloqueada', item: despues }", a: "      return { resultado: 'red', item: despues }" },
    { nombre: 'reintentar no destraba', de: "    it.estado = 'pendiente'; it.error = null\n    await guardar(it); alCambiar()\n    await procesar()", a: '    await procesar()' },
    { nombre: 'descartar no borra', de: "  async function descartar(id) {\n    await (await tomar()).borrar('cola', id)", a: '  async function descartar(id) {\n    void id' },
    // ── El cartel ──
    { nombre: 'el cartel sin internet no dice cuántas', de: "    return { texto: n ? `Sin internet · ${cargas} · se mandan solas${datos}` : `Sin internet${datos}`, tono: 'sin-red' }", a: "    return { texto: `Sin internet${datos}`, tono: 'sin-red' }" },
    { nombre: 'sin "Datos de las HH:MM"', de: "  const datos = copiaDesde ? ` · Datos de las ${horaDeCopia(copiaDesde)}` : ''", a: "  const datos = ''" },
    { nombre: 'la hora de los datos en UTC', de: "    return new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit', hour12: false }).format(d)", a: '    return d.toISOString().slice(11, 16)' },
    { nombre: 'sin "Todo enviado ✓"', de: "  if (recienEnviado) return { texto: 'Todo enviado ✓', tono: 'ok' }\n", a: '' },
    { nombre: 'los errores no se dicen primero', de: '  if (errores > 0) {', a: '  if (false) {' },
    // ── La sesión ──
    { nombre: 'una sesión sin refresh token sirve', de: '    if (s && s.user?.id && s.refresh_token) return s', a: '    if (s && s.user?.id) return s' },
  ],
})
