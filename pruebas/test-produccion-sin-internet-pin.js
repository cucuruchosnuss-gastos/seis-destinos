// LA TABLET SIN INTERNET CON EL WIFI CONECTADO (27/10/2026).
//
// El caso real: se cortó internet con el wifi conectado (navigator.onLine
// seguía en true), la tablet volvió por inactividad a "¿Quién sos?" y el
// masero no pudo poner el PIN (verificar_pin_produccion necesita red), así
// que no pudo cargar la masa hasta que volvió internet.
//
// Dos partes:
//  A. js/sin-internet.js, el módulo real (importado de una copia .mjs):
//     chequearRed (el chequeo contra Supabase, con tiempo máximo), y el hash
//     del PIN (PBKDF2, sal por tablet + persona, 7 días, 5 errores lo
//     bloquean, debe_cambiar no entra).
//  B. La planta (pruebas/sandbox-produccion.js, con chequearRed falso: __red):
//     el teclado del PIN con y sin red, el "modo sin internet" en la barra,
//     el cierre por inactividad que NO cierra con la red caída, volver a
//     poner el PIN cuando vuelve la red, y la cola que no espera a la red.
//
// Contrato con la base (pg_get_functiondef, 27/10/2026):
// verificar_pin_produccion(p_empleado_id, p_unidad_negocio_id, p_puesto,
// p_pin) → { ok: true, debe_cambiar } | { ok: false, motivo: sin_puesto |
// sin_pin | pin_vencido | bloqueado (bloqueado_hasta) | pin_incorrecto
// (intentos_restantes) }; 5 errores seguidos bloquean 5 minutos.
//
//   node pruebas/test-produccion-sin-internet-pin.js
//   ARCHIVO_TEST=<copia de modulos/produccion.html>
//   ARCHIVO_JS_SIN_INTERNET=<copia de js/sin-internet.js>
'use strict'
const fs = require('fs')
const path = require('path')
const { pathToFileURL } = require('url')
const { arnes, leer } = require('./circuito-comun')
const { construirProduccion } = require('./sandbox-produccion')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/produccion.html')
// leer() anuncia "ARCHIVO <ruta> (N bytes)": el runner de mutaciones lo usa
// para confirmar que la suite leyó la copia mutada.
leer(ARCHIVO)
const ARCHIVO_JS = process.env.ARCHIVO_JS_SIN_INTERNET || path.join(__dirname, '..', 'js', 'sin-internet.js')
const FUENTE_JS = fs.readFileSync(ARCHIVO_JS, 'utf8')
const TMP = path.join(__dirname, '..', 'js', `.tmp-sin-internet-pin-${process.pid}.mjs`)
fs.writeFileSync(TMP, FUENTE_JS)
process.on('exit', () => { try { fs.unlinkSync(TMP) } catch { /* nada */ } })

const { chk, esperas, fin } = arnes()
const RED = { message: 'TypeError: Failed to fetch', code: '' }
const DIA = 24 * 3600 * 1000
const tick = () => new Promise(r => setImmediate(r))
// Espera, con tope, a que algo pase: el hash es async (WebCrypto) y con la
// máquina cargada tarda más que unas vueltas (contar vueltas fallaba 1 de 4).
async function esperar(cond, ms = 5000) {
  const hasta = Date.now() + ms
  while (Date.now() < hasta) {
    if (await cond()) return true
    await new Promise(r => setTimeout(r, 5))
  }
  return false
}
const hayHash = (S, clave) => esperar(async () => !!(await (await S.almacenPines()).leer(clave))?.hash)

// ══ A · js/sin-internet.js ═══════════════════════════════════════════════
esperas.push((async () => {
  const M = await import(pathToFileURL(TMP).href)

  // ── El chequeo contra Supabase ──
  const pedidos = []
  const responde = (status) => async (url, init) => { pedidos.push([url, init]); return { status } }
  chk('el chequeo: 200 es "hay red"', await M.chequearRed({ base: 'https://x.supabase.co', clave: 'k', fetchBase: responde(200), nav: { onLine: true } }) === true)
  chk('… pregunta a la salud de Auth, con la key en la URL (sin preflight)', pedidos[0]?.[0] === 'https://x.supabase.co/auth/v1/health?apikey=k' && pedidos[0][1].method === 'GET', pedidos[0]?.[0])
  chk('… sin cookies ni caché', pedidos[0]?.[1].credentials === 'omit' && pedidos[0][1].cache === 'no-store')
  chk('… un 401 también es "hay red" (Supabase contestó)', await M.chequearRed({ base: 'https://x.supabase.co', fetchBase: responde(401), nav: { onLine: true } }) === true)
  chk('… un 503 es "sin red"', await M.chequearRed({ base: 'https://x.supabase.co', fetchBase: responde(503), nav: { onLine: true } }) === false)
  chk('… un fetch que falla es "sin red" (no tira)', await M.chequearRed({ base: 'https://x.supabase.co', fetchBase: async () => { throw new TypeError('Failed to fetch') }, nav: { onLine: true } }) === false)
  let abortado = false
  const cuelga = (url, init) => new Promise(() => { init.signal?.addEventListener('abort', () => { abortado = true }) })
  const t0 = Date.now()
  const colgado = await M.chequearRed({ base: 'https://x.supabase.co', fetchBase: cuelga, nav: { onLine: true }, espera: 60 })
  chk('… una red colgada (el wifi conectado sin internet) es "sin red" al vencer el tiempo', colgado === false && Date.now() - t0 < 2000)
  chk('… y corta el pedido colgado', abortado === true)
  chk('… el tiempo máximo es de 5 s', M.ESPERA_CHEQUEO_MS === 5000)
  chk('… cada 30 s', M.CADA_CHEQUEO_MS === 30000)
  let pregunto = false
  chk('… con el navegador sin red ni pregunta', await M.chequearRed({ base: 'https://x.supabase.co', fetchBase: async () => { pregunto = true; return { status: 200 } }, nav: { onLine: false } }) === false && !pregunto)

  // ── El hash del PIN ──
  // (No un texto hexadecimal: test-baselines.js lo tomaría por un commit.)
  const SAL = 'sal-de-prueba-16'
  const sal = Buffer.from(SAL).toString('base64')
  const h1 = await M.hashPin('4821', sal, 'u|p|masero', 1000)
  chk('el hash: mismo PIN y sal, mismo hash', h1 === await M.hashPin('4821', sal, 'u|p|masero', 1000))
  chk('… 32 bytes en base64', Buffer.from(h1, 'base64').length === 32)
  chk('… otro PIN, otro hash', h1 !== await M.hashPin('4822', sal, 'u|p|masero', 1000))
  chk('… otra persona (misma sal), otro hash', h1 !== await M.hashPin('4821', sal, 'u|otra|masero', 1000))
  chk('… otras vueltas, otro hash', h1 !== await M.hashPin('4821', sal, 'u|p|masero', 1001))
  chk('… es PBKDF2-SHA-256 de verdad (el de Node da lo mismo)',
    h1 === require('crypto').pbkdf2Sync('4821', Buffer.concat([Buffer.from(SAL),Buffer.from('|u|p|masero')]), 1000, 32, 'sha256').toString('base64'))
  chk('las vueltas: 600.000', M.ITERACIONES_PIN === 600000)
  chk('vale 7 días', M.VIDA_PIN_SIN_RED_MS === 7 * DIA)
  chk('5 errores lo bloquean 5 minutos (como la base)', M.FALLOS_PIN_SIN_RED === 5 && M.BLOQUEO_PIN_SIN_RED_MS === 5 * 60000)

  // ── Guardar y verificar ──
  let reloj = 1_000_000_000_000
  const ahora = () => reloj
  const alm = M.almacenPinesMemoria()
  const quien = { almacen: alm, personaId: 'e-juan', unidadId: 'u-cn', puesto: 'masero', ahora }
  const reg = await M.guardarPinSinRed({ ...quien, pin: '4821', iteraciones: 1000 })
  chk('se guarda por fábrica + persona + puesto', reg.clave === 'u-cn|e-juan|masero')
  chk('… NUNCA el PIN en claro', !Object.values(reg).some(v => String(v).includes('4821')), JSON.stringify(reg))
  chk('… con su sal al azar de 16 bytes y la fecha', Buffer.from(reg.sal, 'base64').length === 16 && reg.guardado === reloj)
  const reg2 = await M.guardarPinSinRed({ ...quien, almacen: M.almacenPinesMemoria(), pin: '4821', iteraciones: 1000 })
  chk('… otra tablet (otra sal), otro hash para el mismo PIN', reg2.sal !== reg.sal && reg2.hash !== reg.hash)
  chk('sin red, el PIN correcto entra', (await M.verificarPinSinRed({ ...quien, pin: '4821' })).ok === true)
  chk('… y lo dice (sin_red)', (await M.verificarPinSinRed({ ...quien, pin: '4821' })).sin_red === true)
  chk('… con debe_cambiar en false', (await M.verificarPinSinRed({ ...quien, pin: '4821' })).debe_cambiar === false)
  const mal = await M.verificarPinSinRed({ ...quien, pin: '1111' })
  chk('… el incorrecto no entra, como la base: pin_incorrecto y 4 intentos', mal.ok === false && mal.motivo === 'pin_incorrecto' && mal.intentos_restantes === 4, JSON.stringify(mal))
  chk('… un acierto vuelve a contar desde cero', (await M.verificarPinSinRed({ ...quien, pin: '4821' })).ok && (await alm.leer('u-cn|e-juan|masero')).fallos === 0)
  for (let i = 0; i < 4; i++) await M.verificarPinSinRed({ ...quien, pin: '1111' })
  const quinto = await M.verificarPinSinRed({ ...quien, pin: '1111' })
  chk('… el quinto error lo bloquea', quinto.intentos_restantes === 0)
  const bloq = await M.verificarPinSinRed({ ...quien, pin: '4821' })
  chk('… bloqueado, ni el correcto entra, con la hora', bloq.ok === false && bloq.motivo === 'bloqueado' && new Date(bloq.bloqueado_hasta).getTime() === reloj + 5 * 60000, JSON.stringify(bloq))
  reloj += 5 * 60000
  chk('… a los 5 minutos se destraba', (await M.verificarPinSinRed({ ...quien, pin: '4821' })).ok === true)
  chk('… para otro puesto no sirve', (await M.verificarPinSinRed({ ...quien, puesto: 'encargado', pin: '4821' })).motivo === 'sin_red_sin_pin')
  chk('… ni en otra fábrica', (await M.verificarPinSinRed({ ...quien, unidadId: 'u-otra', pin: '4821' })).motivo === 'sin_red_sin_pin')
  chk('… ni para otra persona', (await M.verificarPinSinRed({ ...quien, personaId: 'e-otro', pin: '4821' })).motivo === 'sin_red_sin_pin')

  // ── El vencimiento ──
  const desde = (await alm.leer('u-cn|e-juan|masero')).guardado
  reloj = desde + 7 * DIA - 1
  chk('a los 7 días menos un instante, entra', (await M.verificarPinSinRed({ ...quien, pin: '4821' })).ok === true)
  reloj = desde + 7 * DIA
  chk('a los 7 días, no: tiene que entrar con internet', (await M.verificarPinSinRed({ ...quien, pin: '4821' })).motivo === 'sin_red_sin_pin')
  reloj = desde + 30 * DIA
  chk('… ni a los 30', (await M.verificarPinSinRed({ ...quien, pin: '4821' })).motivo === 'sin_red_sin_pin')

  // ── debe_cambiar ──
  await M.guardarPinSinRed({ ...quien, pin: '4821', iteraciones: 1000 })
  await M.guardarPinSinRed({ ...quien, pin: '4821', debeCambiar: true })
  const dc = await alm.leer('u-cn|e-juan|masero')
  chk('debe_cambiar pisa el hash con una marca sin hash', dc.debe_cambiar === true && !dc.hash)
  chk('… y ese PIN no entra sin red, ni siendo el correcto', (await M.verificarPinSinRed({ ...quien, pin: '4821' })).motivo === 'sin_red_debe_cambiar')
  await M.guardarPinSinRed({ ...quien, pin: '7395', iteraciones: 1000 })
  chk('… el PIN nuevo (después de cambiarlo con red) sí entra', (await M.verificarPinSinRed({ ...quien, pin: '7395' })).ok === true)
  chk('… y el viejo ya no', (await M.verificarPinSinRed({ ...quien, pin: '4821' })).motivo === 'pin_incorrecto')
  await M.olvidarPinSinRed(quien)
  chk('olvidar (la base dijo sin_pin / sin_puesto / vencido): sin red no entra', (await M.verificarPinSinRed({ ...quien, pin: '7395' })).motivo === 'sin_red_sin_pin')
  // Las vueltas por defecto (las de verdad): una sola vez, tarda.
  const def = await M.guardarPinSinRed({ ...quien, pin: '7395' })
  chk('por defecto, 600.000 vueltas, y se verifica con las que se guardaron', def.iteraciones === 600000 && (await M.verificarPinSinRed({ ...quien, pin: '7395' })).ok === true)
  // Sin IndexedDB: en memoria, sin trabar.
  const mem = await M.abrirPinesIdb('x', undefined)
  chk('sin IndexedDB, el almacén queda en memoria', mem.tipo === 'memoria')
})())

// ══ B · La planta ═══════════════════════════════════════════════════════
const JUAN = { id: 'e-juan', nombre: 'Masero Juan', puesto: 'masero' }
const FEDE = { id: 'e-fede', nombre: 'Silva Federico', puesto: 'encargado' }

function armar({ modo = 'masa', persona = JUAN } = {}) {
  const S = construirProduccion(ARCHIVO)
  S.estado.unidades = new Map([['u-cn', 'Cucuruchos Nuss']])
  S.estado.unidadId = 'u-cn'
  S.estado.unidadesPosibles = ['u-cn']
  S.estado.misTareas = new Map([['cargar', { todas: true }]])
  // Una máquina abierta: sin ninguna, Sala de masa saca al masero.
  Object.assign(S.__tablas, {
    maquinas: [{ id: 'm1', nombre: 'Máquina 1', orden: 1 }],
    turnos_produccion: [{ id: 't1', lote: 7023, maquina_id: 'm1', fecha: '2026-10-27', turno: 'Mañana', encargado_id: 'e-fede', abierto_en: '2026-10-27T09:00:00Z' }],
    masas: [], paradas_produccion: [], produccion_items: [], recetas: [{ tipo_masa: 'Común' }], ingredientes: [],
  })
  S.marcarAbiertas(true)
  S.estado.modo = modo
  S.estado.personal = [{ ...JUAN, puestos: ['masero'], misma_unidad: true }, { ...FEDE, puestos: ['encargado'], misma_unidad: true }]
  const base = { pin: { 'e-juan': '4821', 'e-fede': '1357' }, debeCambiar: new Set(), sinPuesto: new Set(), colgada: false, verifica: 0, masas: [] }
  S.__setRpc(async (op, params) => {
    if (op === 'verificar_pin_produccion') {
      base.verifica++
      if (base.colgada) return new Promise(() => {})
      if (S.__red.hay === false || S.__nav.onLine === false) return { data: null, error: RED }
      if (base.sinPuesto.has(params.p_empleado_id)) return { data: { ok: false, motivo: 'sin_puesto' }, error: null }
      if (base.pin[params.p_empleado_id] !== params.p_pin) return { data: { ok: false, motivo: 'pin_incorrecto', intentos_restantes: 4 }, error: null }
      return { data: { ok: true, debe_cambiar: base.debeCambiar.has(params.p_empleado_id) }, error: null }
    }
    if (op === 'datos_para_masa' && base.datosParaMasa) return base.datosParaMasa()
    if (op === 'registrar_masa') {
      if (S.__red.hay === false) return { data: null, error: RED }
      if (!base.masas.some(m => m.p_client_uuid === params.p_client_uuid)) base.masas.push(params)
      return { data: { masa_id: 'ma-1', nro: 1 }, error: null }
    }
    return { data: op === 'personal_produccion' ? S.estado.personal : null, error: null }
  })
  if (persona) S.sessionStorage.setItem('produccion.persona.' + modo, JSON.stringify(persona))
  return { S, base }
}

// Pone el PIN en el teclado de la ventana y espera a que termine.
async function ponerPin(S, pin) {
  for (const t of pin) S.teclaPin(t)
  await esperar(() => !S.estado.pin?.enviando)
  for (let i = 0; i < 5; i++) await tick()
}

// Con red, entra y deja el hash; sin red (el chequeo dice que no, con el
// wifi "conectado"), entra con el hash.
esperas.push((async () => {
  const { S, base } = armar()
  await S.mostrarQuien()
  chk('Sala de masa: el masero guardado con el teclado abierto', S.estado.pin?.personaId === 'e-juan' && S.estado.pin.puesto === 'masero')
  await ponerPin(S, '4821')
  chk('con red entra por la base', S.estado.persona?.id === 'e-juan' && base.verifica === 1)
  chk('… sin la marca de sin internet', S.estado.persona?.sinRed === undefined)
  await hayHash(S, 'u-cn|e-juan|masero')
  const reg = await (await S.almacenPines()).leer('u-cn|e-juan|masero')
  chk('… y la tablet guardó el hash (no el PIN)', !!reg?.hash && !Object.values(reg).some(v => String(v).includes('4821')), JSON.stringify(reg))

  // Se corta internet con el wifi conectado.
  S.__red.hay = false
  await S.chequearRedPlanta()
  chk('el chequeo marca "sin red" aunque el navegador diga en línea', S.__nav.onLine === true && S.sinInternet() === true)
  const c = S.pintarCartelCola()
  chk('… y el cartel de la cola dice Sin internet', c?.texto === 'Sin internet' && c.tono === 'sin-red', JSON.stringify(c))
  S.estado.persona = null
  await S.mostrarQuien()
  const antes = base.verifica
  await ponerPin(S, '4821')
  chk('sin red, el masero entra con el PIN guardado', S.estado.persona?.id === 'e-juan')
  chk('… sin preguntarle a la base', base.verifica === antes)
  chk('… en "modo sin internet"', S.estado.persona?.sinRed === true)
  chk('… que se ve en la barra', /Modo sin internet/.test(S.htmlLatPersona()), S.htmlLatPersona())
  chk('… y queda guardado (recargar no lo borra)', S.personaGuardada('masa')?.sinRed === true)

  // El incorrecto, sin red.
  S.estado.persona = null
  await S.mostrarQuien()
  await ponerPin(S, '1111')
  chk('sin red, el PIN incorrecto no entra', S.estado.persona === null && S.estado.pin?.mensaje?.texto === 'PIN incorrecto · te quedan 4 intentos', S.estado.pin?.mensaje?.texto)

  // Otra persona que nunca entró con red en esta tablet.
  S.estado.pin = S.nuevoPanelPin('persona', FEDE, 'encargado')
  S.estado.modo = 'produccion'
  await ponerPin(S, '1357')
  chk('sin red, quien no entró con red en los últimos 7 días: el mensaje', S.estado.pin?.mensaje?.texto === 'Sin internet. Esta persona tiene que haber entrado con internet en los últimos 7 días.', S.estado.pin?.mensaje?.texto)
  chk('… y no entra', S.estado.persona === null)

  // Vuelve la red: a la primera pausa, el PIN de nuevo (con la base).
  S.estado.modo = 'masa'
  S.estado.persona = { ...JUAN, sinRed: true }
  S.estado.pin = null
  S.estado.vista = 'pr-sala'
  chk('con la red todavía caída no se le pide nada', S.revalidarSiVolvioLaRed() === false && S.estado.persona?.id === 'e-juan')
  S.__red.hay = true
  await S.chequearRedPlanta()
  chk('vuelve la red: el chequeo lo anota', S.sinInternet() === false)
  S.estado.vista = 'pr-receta'
  S.estado.masa = { tipo: 'Común', doble: false, cambiada: false, como: 'anterior', motivo: '' }
  chk('… con una masa a medio cargar (ya eligió el tamaño), espera', S.revalidarSiVolvioLaRed() === false && S.estado.persona?.id === 'e-juan')
  S.estado.masa = { tipo: 'Común', doble: null, cambiada: true, como: 'anterior', motivo: '' }
  chk('… (o le cambió algo), espera', S.revalidarSiVolvioLaRed() === false && S.estado.persona?.id === 'e-juan')
  S.estado.masa = null
  // Registrando una masa, o leyendo la siguiente de la base, tampoco es una
  // pausa: al terminar, la receta se pintaba encima del PIN (28/10, el ensayo).
  S.estado.enviandoMasa = true
  chk('… registrando una masa, espera', S.revalidarSiVolvioLaRed() === false && S.estado.persona?.id === 'e-juan')
  S.estado.enviandoMasa = false
  let soltar
  const lectura = S.leyendoMasa(() => new Promise(r => { soltar = r }))
  chk('… leyendo la masa siguiente, espera', S.revalidarSiVolvioLaRed() === false && S.estado.persona?.id === 'e-juan')
  soltar()
  await lectura
  chk('… y al terminar de leer ya no cuenta', S.estado.leyendoMasa === 0)
  let fallo = null
  await S.leyendoMasa(async () => { throw new Error('sin red') }).catch(e => { fallo = e })
  chk('… aunque la lectura falle', fallo?.message === 'sin red' && S.estado.leyendoMasa === 0)
  // El caso del ensayo: registrada la masa, la siguiente se lee de la base.
  let soltarDatos
  base.datosParaMasa = () => { base.datosParaMasa = null; return new Promise(r => { soltarDatos = r }) }
  S.estado.vista = 'pr-receta'
  S.estado.salaTurno = { id: 't1', lote: 7023, maquinaId: 'm1', maquinaNombre: 'Máquina 1', nro: 3 }
  S.estado.tipoMasa = 'Común'
  const siguiente = S.siguienteMasa({ turnoId: 't1', nro: 3, como: 'original' }, { nro: 3 })
  chk('… registrada la masa, mientras se lee la siguiente no pide el PIN', S.estado.leyendoMasa === 1 && S.revalidarSiVolvioLaRed() === false && S.estado.persona?.id === 'e-juan')
  soltarDatos({ data: null, error: RED })
  await siguiente
  chk('… y leída, sí', S.estado.leyendoMasa === 0)
  S.estado.vista = 'pr-sala'
  // La masa que se abre sola después de registrar, sin tocar: no frena.
  chk('una masa sin tocar no cuenta como empezada', S.masaEmpezada({ tipo: 'Común', doble: null, cambiada: false, como: 'anterior', motivo: '' }) === false)
  chk('… con motivo escrito sí', S.masaEmpezada({ doble: null, cambiada: false, como: 'anterior', motivo: 'más agua' }) === true)
  chk('… y con Modificar también', S.masaEmpezada({ doble: null, cambiada: false, como: 'modificar', motivo: '' }) === true)
  chk('… en la primera pausa, vuelve a poner el PIN', S.revalidarSiVolvioLaRed() === true && S.estado.persona === null && S.estado.pin?.personaId === 'e-juan')
  chk('… y se le dice por qué', /Volvió internet/.test(S.estado.pin?.mensaje?.texto ?? ''), S.estado.pin?.mensaje?.texto)
  const n = base.verifica
  await ponerPin(S, '4821')
  chk('… lo verifica la base, como siempre', base.verifica === n + 1 && S.estado.persona?.id === 'e-juan' && S.estado.persona.sinRed === undefined)
})())

// debe_cambiar: con red entra a cambiarlo; sin red, no entra.
esperas.push((async () => {
  const { S, base } = armar()
  await S.mostrarQuien()
  await ponerPin(S, '4821')
  await hayHash(S, 'u-cn|e-juan|masero')
  base.debeCambiar.add('e-juan')
  S.estado.persona = null
  await S.mostrarQuien()
  await ponerPin(S, '4821')
  chk('con red, debe_cambiar pide el PIN nuevo', S.estado.pin?.fase === 'nuevo' && S.estado.persona === null)
  await esperar(async () => (await (await S.almacenPines()).leer('u-cn|e-juan|masero'))?.debe_cambiar === true)
  S.__red.hay = false
  await S.chequearRedPlanta()
  await S.mostrarQuien()
  await ponerPin(S, '4821')
  chk('sin red, un PIN marcado debe_cambiar no entra', S.estado.persona === null && S.estado.pin?.mensaje?.texto === 'Sin internet. Este PIN hay que cambiarlo primero, y eso necesita internet.', S.estado.pin?.mensaje?.texto)
  // Con red, lo cambia: el PIN nuevo sí vale sin red.
  S.__red.hay = true
  await S.chequearRedPlanta()
  base.debeCambiar.delete('e-juan')
  S.__setRpc(async (op) => {
    if (op === 'verificar_pin_produccion') return { data: { ok: true, debe_cambiar: true }, error: null }
    if (op === 'cambiar_pin_produccion') return { data: { ok: true }, error: null }
    return { data: op === 'personal_produccion' ? S.estado.personal : null, error: null }
  })
  await S.mostrarQuien()
  await ponerPin(S, '4821')
  await ponerPin(S, '7395')
  await ponerPin(S, '7395')
  chk('con red, cambia el PIN y entra', S.estado.persona?.id === 'e-juan')
  await hayHash(S, 'u-cn|e-juan|masero')
  S.__red.hay = false
  await S.chequearRedPlanta()
  S.estado.persona = null
  await S.mostrarQuien()
  await ponerPin(S, '7395')
  chk('… y sin red entra con el PIN NUEVO', S.estado.persona?.id === 'e-juan' && S.estado.persona.sinRed === true, S.estado.pin?.mensaje?.texto)
})())

// La base dice que ese PIN ya no sirve (sin_puesto): sin red tampoco.
esperas.push((async () => {
  const { S, base } = armar()
  await S.mostrarQuien()
  await ponerPin(S, '4821')
  await hayHash(S, 'u-cn|e-juan|masero')
  base.sinPuesto.add('e-juan')
  S.estado.persona = null
  await S.mostrarQuien()
  await ponerPin(S, '4821')
  await esperar(async () => !(await (await S.almacenPines()).leer('u-cn|e-juan|masero')))
  S.__red.hay = false
  await S.chequearRedPlanta()
  await S.mostrarQuien()
  await ponerPin(S, '4821')
  chk('sin_puesto con red borra el hash: sin red ya no entra', S.estado.persona === null && /últimos 7 días/.test(S.estado.pin?.mensaje?.texto ?? ''), S.estado.pin?.mensaje?.texto)
})())

// La base no contesta (wifi conectado, internet cortado a mitad del PIN):
// el chequeo dice que no y entra con el hash, sin esperar los 20 s.
esperas.push((async () => {
  const { S, base } = armar()
  await S.mostrarQuien()
  await ponerPin(S, '4821')
  await hayHash(S, 'u-cn|e-juan|masero')
  S.estado.persona = null
  await S.mostrarQuien()
  // El navegador y la planta todavía creen que hay red: la RPC cuelga y el
  // chequeo (que en la tablet tiene 5 s como máximo) dice que no.
  base.colgada = true
  S.__red.hay = false
  chk('(antes del PIN, la planta cree que hay red)', S.sinInternet() === false)
  const p = S.estado.pin
  for (const t of '482') S.teclaPin(t)
  const envio = S.teclaPin('1')
  await Promise.race([envio, new Promise(r => setTimeout(r, 2000))])
  await esperar(() => !!S.estado.persona)
  chk('la RPC colgada no deja esperando: el chequeo dice "sin red" y entra con el hash', S.estado.persona?.id === 'e-juan' && S.estado.persona.sinRed === true, JSON.stringify({ persona: S.estado.persona, mensaje: p.mensaje }))
  chk('… y queda anotado "sin red"', S.sinInternet() === true)
})())

// Un error de red de la RPC (el chequeo todavía no había dicho nada): entra
// con el hash igual.
esperas.push((async () => {
  const { S } = armar({ modo: 'produccion', persona: FEDE })
  await S.mostrarQuien()
  await ponerPin(S, '1357')
  await hayHash(S, 'u-cn|e-fede|encargado')
  S.estado.persona = null
  await S.mostrarQuien()
  // La planta todavía cree que hay red; la RPC falla primero.
  S.__red.hay = false
  chk('(antes del PIN, la planta cree que hay red)', S.sinInternet() === false)
  S.__setRpc(async (op) => op === 'verificar_pin_produccion' ? { data: null, error: RED } : { data: null, error: null })
  await ponerPin(S, '1357')
  chk('la RPC falla por red: entra con el hash del encargado', S.estado.persona?.id === 'e-fede' && S.estado.persona.sinRed === true)
  chk('… y queda anotado "sin red"', S.estado.sinRedChequeo === true)
  S.__setRpc(async (op) => op === 'verificar_pin_produccion' ? { data: null, error: { message: 'Esta tablet no tiene permiso de producción en esa unidad.', code: 'P0001' } } : { data: null, error: null })
  S.estado.sinRedChequeo = false
  S.estado.persona = null
  await S.mostrarQuien()
  await ponerPin(S, '1357')
  chk('un error de la BASE (con código) no entra con el hash', S.estado.persona === null && /No se pudo verificar el PIN/.test(S.estado.pin?.mensaje?.texto ?? ''))
})())

// El cierre por inactividad con la red caída.
esperas.push((async () => {
  const { S } = armar({ modo: 'produccion', persona: FEDE })
  S.estado.persona = { ...FEDE }
  S.estado.vista = 'pr-produccion'
  S.estado.ultimoToque = Date.now() - 11 * 60000
  S.__red.hay = false
  chk('inactividad con el wifi conectado y sin internet: NO cierra', await S.revisarInactividadConRed() === false && S.estado.persona?.id === 'e-fede')
  chk('… le preguntó a Supabase', S.__red.chequeos === 1)
  chk('… y quedó anotado sin red (el cartel lo dice)', S.sinInternet() === true && S.pintarCartelCola()?.texto === 'Sin internet')
  chk('… el reloj no vuelve a preguntar cada segundo', await S.revisarInactividadConRed() === false && S.__red.chequeos === 1)
  S.__red.hay = true
  await S.chequearRedPlanta()
  chk('vuelve la red (el chequeo de cada 30 s): sí cierra', await S.revisarInactividadConRed() === true && S.estado.persona === null)
  // Sin nada que cerrar no se pregunta.
  const { S: T } = armar()
  T.estado.persona = { ...JUAN }
  T.estado.ultimoToque = Date.now() - 60 * 60000
  chk('Sala de masa sin maestro: no se pregunta nada (no hay qué cerrar)', await T.revisarInactividadConRed() === false && T.__red.chequeos === 0)
  // Tocaron la pantalla mientras se preguntaba.
  const { S: U } = armar({ modo: 'produccion', persona: FEDE })
  U.estado.persona = { ...FEDE }
  U.estado.ultimoToque = Date.now() - 11 * 60000
  U.__red.hay = () => { U.estado.ultimoToque = Date.now(); return true }
  chk('si tocaron la pantalla mientras se preguntaba, no cierra', await U.revisarInactividadConRed() === false && U.estado.persona?.id === 'e-fede')
})())

// La cola no espera a una red que el chequeo ya dio por caída; la masa queda
// en la tablet y sale sola, una vez, al volver.
esperas.push((async () => {
  const { S, base } = armar()
  S.estado.sinRedChequeo = true
  S.__red.hay = false
  const b = { client_uuid: 'masa-1', turnoId: 't1', nro: 3, maquinaNombre: 'Máquina 1', lote: 7023, payload: { p_turno_id: 't1', p_tipo_masa: 'Común', p_doble: false, p_masero_id: 'e-juan', p_items: [{ ingrediente_id: 'i1', cantidad_simple_kg: 10, insumo_id: 'ins-1', lote: 'L-55' }], p_client_uuid: 'masa-1', p_motivo: null } }
  const r = await S.enviarMasa(b)
  chk('sin red (chequeo), la masa queda en la tablet', r.resultado === 'red')
  chk('… sin intentar la red', !S.__llamadas.rpc.some(([n]) => n === 'registrar_masa'))
  chk('… esperando en la cola', (await S.colaPlanta().todos()).some(x => x.id === 'masa-1' && x.estado === 'pendiente'))
  S.__red.hay = true
  await S.chequearRedPlanta()
  await esperar(() => base.masas.length > 0)
  chk('vuelve la red: se manda sola, con su p_client_uuid', base.masas.length === 1 && base.masas[0].p_client_uuid === 'masa-1' && base.masas[0].p_items[0].lote === 'L-55')
  await S.procesarColaPlanta()
  chk('… una sola vez', S.__llamadas.rpc.filter(([n]) => n === 'registrar_masa').length === 1)
})())

fin()
