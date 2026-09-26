// "Asignar PIN" desde la PLANTA, con el acceso maestro activo (26/09/2026).
//
// Sale del CUERPO de asignar_pin_con_maestro, leído con pg_get_functiondef el
// 26/09/2026:
//  - verifica el PIN maestro con verificar_pin_maestro y, si no vale, DEVUELVE
//    ese jsonb ({ok:false, motivo, ...}) sin lanzar: se trata con mensajeDePin;
//  - LANZA 'La persona no existe o no está activa.' y 'El PIN tiene que ser de
//    4 números y no tan obvio (…)': esos mensajes se muestran tal cual;
//  - deja el PIN con debe_cambiar = true y devuelve {ok:true}.
//
// Y la regla que no se negocia: EL PIN NUEVO NO QUEDA EN NINGÚN LADO fuera de
// la memoria —ni en localStorage, ni en sessionStorage, ni en el DOM—.
//
//   node pruebas/test-produccion-asignar-pin.js

const path = require('path')
const { arnes, leer, marca, chequearMarcas } = require('./circuito-comun')
const { construirProduccion } = require('./sandbox-produccion')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/produccion.html')
const FUENTE = leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

const PIN = '5832'
const PIN_MAESTRO = '90817263'

const PERSONAL = [
  { id: 'e-sin', nombre: 'Ana Sinpin', misma_unidad: true, puestos: ['operario'], puestos_temporales: [], tiene_pin: false, pin_temporal: false, debe_cambiar_pin: false, es_maestro: false },
  { id: 'e-dia', nombre: 'Beto Undia', misma_unidad: true, puestos: ['masero'], puestos_temporales: ['masero'], tiene_pin: true, pin_temporal: true, debe_cambiar_pin: true, es_maestro: false },
  { id: 'e-pend', nombre: 'Carla Pendiente', misma_unidad: true, puestos: ['encargado'], puestos_temporales: [], tiene_pin: true, pin_temporal: false, debe_cambiar_pin: true, es_maestro: false },
  { id: 'e-prop', nombre: 'Dani Propio', misma_unidad: true, puestos: ['encargado'], puestos_temporales: [], tiene_pin: true, pin_temporal: false, debe_cambiar_pin: false, es_maestro: true },
  { id: 'e-otra', nombre: 'Eva Otrafabrica', misma_unidad: false, puestos: [], puestos_temporales: [], tiene_pin: false, pin_temporal: false, debe_cambiar_pin: false, es_maestro: false },
]

// Lo observable: storages y cada propiedad de cada elemento del DOM falso.
function rastro(S) {
  const partes = []
  for (const [, el] of S.__els) {
    partes.push(el.innerHTML, el.textContent, el.value, el.className, el.title,
      JSON.stringify(el.dataset), JSON.stringify(el.atributos))
  }
  partes.push(JSON.stringify([...S.__ls]), JSON.stringify([...S.__ss]))
  return partes.join('\u0001')
}
function sinPin(S, momento) {
  chk(`el PIN nuevo no aparece en el DOM ni en ningún storage (${momento})`, !rastro(S).includes(PIN))
}

function armar({ asignar, personalDespues } = {}) {
  const S = construirProduccion(ARCHIVO)
  S.estado.modo = 'produccion'
  S.estado.personal = PERSONAL.map(p => ({ ...p }))
  S.estado.maestro = { id: 'e-prop', nombre: 'Dani Propio' }
  S.estado.persona = { id: 'e-prop', nombre: 'Dani Propio', puesto: 'encargado' }
  S.__setRpc(async (nombre, params) => {
    if (nombre === 'personal_produccion') return { data: personalDespues ?? PERSONAL, error: null }
    if (nombre === 'asignar_pin_con_maestro') return asignar ? asignar(params) : { data: { ok: true }, error: null }
    return { data: null, error: null }
  })
  return S
}
const el = (S, id) => S.__doc.getElementById(id)
const llamadas = (S, n) => S.__llamadas.rpc.filter(([x]) => x === n)
function tipear(S, pin) { for (const d of String(pin)) S.teclaAsignar(d) }

// ── El botón vive en la franja del acceso maestro ──────────────────────────
{
  const i = FUENTE.indexOf('id="pr-maestro"')
  const j = FUENTE.indexOf('id="pr-btn-cerrar-maestro"')
  const k = FUENTE.indexOf('id="pr-btn-asignar-pin"')
  chk('el botón "Asignar PIN" existe', k > 0)
  chk('… y está en la franja del acceso maestro', i > 0 && j > 0 && k > i && k < j)
  chk('… con el texto "Asignar PIN"', /id="pr-btn-asignar-pin">Asignar PIN</.test(FUENTE))
  chk('la vista pr-asignar existe y nace escondida', /<section class="pr-tarjeta" id="pr-asignar" hidden>/.test(FUENTE))
  chk('pr-asignar está en VISTAS', /const VISTAS = \[[^\]]*'pr-asignar'/.test(FUENTE))
  chk('el PIN nuevo no usa ningún <input> dentro de la vista',
    !/id="pr-asignar"[\s\S]*?<\/section>/.exec(FUENTE)[0].replace(/<input type="search" id="pr-asignar-buscar"[^>]*>/, '').includes('<input'))

  const S = armar()
  S.estado.maestro = null
  S.pintarMaestro()
  chk('sin maestro la franja (y el botón) se esconde', el(S, 'pr-maestro').hidden === true)
  S.abrirAsignarPin()
  chk('sin maestro, abrir no hace nada', !S.estado.asignar && S.estado.vista !== 'pr-asignar')
  S.estado.maestro = { id: 'e-prop', nombre: 'Dani Propio' }
  S.pintarMaestro()
  chk('con maestro la franja se ve', el(S, 'pr-maestro').hidden === false)
}

// ── Los cuatro estados del PIN ────────────────────────────────────────────
{
  const S = armar()
  chk('tiene_pin false → "Sin PIN"', S.estadoPinPlanta(PERSONAL[0]) === 'Sin PIN')
  chk('pin_temporal → "PIN de un día" (aunque también deba cambiarlo)', S.estadoPinPlanta(PERSONAL[1]) === 'PIN de un día')
  chk('debe_cambiar_pin → "Pendiente de cambiar"', S.estadoPinPlanta(PERSONAL[2]) === 'Pendiente de cambiar')
  chk('los demás → "PIN propio"', S.estadoPinPlanta(PERSONAL[3]) === 'PIN propio')
  chk('una fila vacía no revienta', S.estadoPinPlanta(null) === 'Sin PIN')
}

// ── La lista: solo esta fábrica, con su estado y su acción ─────────────────
{
  const S = armar()
  S.abrirAsignarPin()
  chk('abre la vista pr-asignar', S.estado.vista === 'pr-asignar' && el(S, 'pr-asignar').hidden === false)
  chk('arranca en la lista, sin panel', el(S, 'pr-asignar-lista').hidden === false && el(S, 'pr-asignar-panel').hidden === true)
  const h = el(S, 'pr-asignar-personas').innerHTML
  for (const p of PERSONAL.filter(x => x.misma_unidad)) {
    chk(`la lista trae a ${p.nombre}`, h.includes(`data-asignar-persona="${p.id}"`) && h.includes(p.nombre))
  }
  chk('la lista NO trae a quien es de otra fábrica', !h.includes('e-otra') && !h.includes('Otrafabrica'))
  chk('la lista dice los cuatro estados',
    ['Sin PIN', 'PIN de un día', 'Pendiente de cambiar', 'PIN propio'].every(t => h.includes(t)))
  const fila = id => (h.match(new RegExp(`data-asignar-persona="${id}"[\\s\\S]*?</button>`)) || [''])[0]
  chk('sin PIN el botón dice "Asignar"', /Asignar/.test(fila('e-sin')) && !/Resetear/.test(fila('e-sin')))
  chk('con PIN el botón dice "Resetear"', /Resetear/.test(fila('e-prop')) && /Resetear/.test(fila('e-dia')))

  S.estado.asignar.busqueda = 'carla'
  S.pintarAsignarPin()
  const f = el(S, 'pr-asignar-personas').innerHTML
  chk('el buscador filtra por nombre', f.includes('e-pend') && !f.includes('e-sin'))
  S.estado.asignar.busqueda = 'zzz'
  S.pintarAsignarPin()
  chk('sin coincidencias lo dice', /Ningún nombre coincide/.test(el(S, 'pr-asignar-personas').innerHTML))

  S.elegirPersonaAsignar('e-otra')
  chk('no se puede elegir a alguien de otra fábrica', S.estado.asignar.personaId === null)
  S.elegirPersonaAsignar('e-sin')
  chk('elegir abre el panel', el(S, 'pr-asignar-panel').hidden === false && el(S, 'pr-asignar-lista').hidden === true)
  chk('el título dice "Asignar PIN a" sin PIN', el(S, 'pr-asignar-titulo').textContent === 'Asignar PIN a Ana Sinpin')
  chk('el aviso del PIN de un solo uso está', /El PIN nuevo es de un solo uso: la primera vez que entre va a tener que elegir uno propio\./.test(FUENTE))
  S.volverAsignarPin()
  S.elegirPersonaAsignar('e-prop')
  chk('el título dice "Resetear el PIN de" con PIN', el(S, 'pr-asignar-titulo').textContent === 'Resetear el PIN de Dani Propio')
}

// ── El teclado ───────────────────────────────────────────────────────────
{
  const S = armar()
  S.abrirAsignarPin()
  S.elegirPersonaAsignar('e-sin')
  const tec = el(S, 'pr-asignar-teclado').innerHTML
  chk('el teclado tiene 0–9 y Borrar',
    [...'0123456789'].every(d => tec.includes(`data-asignar-tecla="${d}"`)) && tec.includes('data-asignar-tecla="borrar"'))
  chk('el teclado no tiene tecla de entrar (confirma el botón)', !/data-asignar-tecla="entrar"/.test(tec))
  tipear(S, '58')
  chk('dos teclas → dos dígitos', S.estado.asignar.digitos === '58')
  S.teclaAsignar('borrar')
  chk('Borrar saca el último', S.estado.asignar.digitos === '5')
  tipear(S, '8329')
  chk('no pasa de 4', S.estado.asignar.digitos === '5832')
  const puntos = el(S, 'pr-asignar-puntos').innerHTML
  chk('4 puntos llenos', (puntos.match(/pr-pin__punto--lleno/g) || []).length === 4)
  chk('los puntos son formas: sin números', !/\d/.test(puntos.replace(/class="[^"]*"/g, '')))
  S.teclaAsignar('x')
  chk('una tecla rara no suma', S.estado.asignar.digitos === '5832')
  sinPin(S, 'tipeado')
  S.volverAsignarPin()
  chk('Volver desde el panel vuelve a la lista y borra lo tipeado',
    S.estado.asignar.personaId === null && S.estado.asignar.digitos === '' && el(S, 'pr-asignar-lista').hidden === false)
  S.teclaAsignar('1')
  chk('sin persona elegida el teclado no escribe', S.estado.asignar.digitos === '')
}

// ── Menos de 4 números: no llama y lo dice ───────────────────────────────
esperas.push((async () => {
  const S = armar()
  S.abrirAsignarPin()
  S.elegirPersonaAsignar('e-sin')
  tipear(S, '58')
  chk('con menos de 4 el botón NO está trabado', el(S, 'pr-asignar-confirmar').disabled === false)
  await S.confirmarAsignarPin()
  chk('con menos de 4 no se llama a la base', llamadas(S, 'asignar_pin_con_maestro').length === 0)
  chk('… y el error se ve pegado al botón', el(S, 'pr-asignar-error').hidden === false && /Faltan números/.test(el(S, 'pr-asignar-error').textContent))
  S.teclaAsignar('3')
  chk('tocar una tecla limpia el error', el(S, 'pr-asignar-error').hidden === true)
})())

// ── La llamada: los cuatro parámetros exactos ────────────────────────────
esperas.push((async () => {
  let enVuelo = null
  const S = armar({ asignar: () => new Promise(r => { enVuelo = r }) })
  S.estado.pin = S.nuevoPanelPin('maestro', { id: 'e-prop', nombre: 'Dani Propio' }, null)
  S.estado.maestro = null
  // pinMaestro se pone por el camino real: enviarPinMaestro con la base OK.
  S.__setRpc(async (n, p) => {
    if (n === 'verificar_pin_maestro') return { data: { ok: true }, error: null }
    if (n === 'personal_produccion') return { data: PERSONAL, error: null }
    if (n === 'asignar_pin_con_maestro') return new Promise(r => { enVuelo = r })
    return { data: null, error: null }
  })
  S.estado.pin.digitos = PIN_MAESTRO
  await S.enviarPinMaestro()
  chk('el maestro quedó activo', S.estado.maestro?.id === 'e-prop' && S.__pinMaestro() === PIN_MAESTRO)
  S.abrirAsignarPin()
  S.elegirPersonaAsignar('e-pend')
  tipear(S, PIN)
  const pendiente = S.confirmarAsignarPin()
  chk('mientras se manda el botón se traba', el(S, 'pr-asignar-confirmar').disabled === true)
  // Con 4 dígitos una tecla más no suma igual: se prueba con Borrar.
  S.teclaAsignar('borrar')
  chk('mientras se manda el teclado no borra ni escribe', S.estado.asignar.digitos === PIN)
  const [[, p]] = llamadas(S, 'asignar_pin_con_maestro')
  chk('se llama UNA vez', llamadas(S, 'asignar_pin_con_maestro').length === 1)
  chk('p_empleado_id es la persona elegida', p.p_empleado_id === 'e-pend')
  chk('p_pin es lo tipeado', p.p_pin === PIN)
  chk('p_maestro_id es el maestro activo', p.p_maestro_id === 'e-prop')
  chk('p_maestro_pin es el PIN del maestro', p.p_maestro_pin === PIN_MAESTRO)
  chk('solo esos cuatro parámetros', Object.keys(p).sort().join(',') === 'p_empleado_id,p_maestro_id,p_maestro_pin,p_pin')
  sinPin(S, 'mandando')
  enVuelo({ data: { ok: true }, error: null })
  await pendiente
  chk('al terminar el botón se destraba', el(S, 'pr-asignar-confirmar').disabled === false)
})())

// ── {ok:false}: el rechazo del PIN maestro, con mensajeDePin ─────────────
for (const res of [
  { ok: false, motivo: 'pin_incorrecto', intentos_restantes: 2 },
  { ok: false, motivo: 'bloqueado', bloqueado_hasta: '2026-09-26T13:42:00Z' },
]) {
  esperas.push((async () => {
    const S = armar({ asignar: () => ({ data: res, error: null }) })
    S.abrirAsignarPin()
    S.elegirPersonaAsignar('e-sin')
    tipear(S, PIN)
    await S.confirmarAsignarPin()
    const t = el(S, 'pr-asignar-error').textContent
    chk(`${res.motivo}: el error es el de mensajeDePin`, t === S.mensajeDePin(res).texto && t.length > 0, t)
    chk(`${res.motivo}: el error se ve`, el(S, 'pr-asignar-error').hidden === false)
    chk(`${res.motivo}: no dice éxito`, S.__llamadas.exitos.length === 0)
    chk(`${res.motivo}: los dígitos se borran`, S.estado.asignar.digitos === '')
    chk(`${res.motivo}: sigue en el panel de esa persona`, S.estado.asignar.personaId === 'e-sin')
    sinPin(S, res.motivo)
  })())
}

// ── Error lanzado: su mensaje tal cual ───────────────────────────────────
esperas.push((async () => {
  const MSJ = 'El PIN tiene que ser de 4 números y no tan obvio (nada de 1234 ni cuatro iguales).'
  const S = armar({ asignar: () => ({ data: null, error: { message: MSJ } }) })
  S.abrirAsignarPin()
  S.elegirPersonaAsignar('e-sin')
  tipear(S, '1234')
  await S.confirmarAsignarPin()
  chk('un 1234 SÍ llega a la base (la lista de obvios vive allá)', llamadas(S, 'asignar_pin_con_maestro').length === 1)
  chk('el mensaje de la base se muestra tal cual', el(S, 'pr-asignar-error').textContent === MSJ)
  chk('… y se ve', el(S, 'pr-asignar-error').hidden === false)
  chk('el botón queda usable', el(S, 'pr-asignar-confirmar').disabled === false)
  chk('los dígitos se borran', S.estado.asignar.digitos === '')
})())

// ── OK: éxito, dígitos borrados, relee el personal ────────────────────────
esperas.push((async () => {
  const despues = PERSONAL.map(p => p.id === 'e-sin' ? { ...p, tiene_pin: true, debe_cambiar_pin: true } : p)
  const S = armar({ personalDespues: despues })
  S.abrirAsignarPin()
  S.elegirPersonaAsignar('e-sin')
  tipear(S, PIN)
  await S.confirmarAsignarPin()
  chk('dice el éxito con el nombre',
    S.__llamadas.exitos[0] === 'PIN guardado para Ana Sinpin. La primera vez que entre va a elegir uno propio.', S.__llamadas.exitos[0])
  chk('los dígitos se borran', S.estado.asignar.digitos === '')
  const nombres = S.__llamadas.rpc.map(([n]) => n)
  chk('relee personal_produccion DESPUÉS de guardar',
    nombres.lastIndexOf('personal_produccion') > nombres.indexOf('asignar_pin_con_maestro'))
  chk('… de esta fábrica', llamadas(S, 'personal_produccion').at(-1)[1].p_unidad_negocio_id === 'u-cn')
  chk('vuelve a la lista', S.estado.asignar.personaId === null && el(S, 'pr-asignar-lista').hidden === false)
  const fila = (el(S, 'pr-asignar-personas').innerHTML.match(/data-asignar-persona="e-sin"[\s\S]*?<\/button>/) || [''])[0]
  chk('la lista muestra el estado nuevo del PIN', /Pendiente de cambiar/.test(fila) && /Resetear/.test(fila), fila)
  sinPin(S, 'después de guardar')
})())

// ── El PIN se va de la memoria al salir, al cerrar el maestro y por inactividad
{
  const S = armar()
  S.abrirAsignarPin(); S.elegirPersonaAsignar('e-sin'); tipear(S, PIN)
  S.cerrarMaestro()
  chk('cerrar el maestro borra el PIN a medio tipear', S.estado.asignar === null)

  const T = armar()
  T.abrirAsignarPin(); T.elegirPersonaAsignar('e-sin'); tipear(T, PIN)
  T.mostrarVista('pr-produccion')
  chk('irse a otra pantalla borra el PIN a medio tipear', T.estado.asignar === null)

  const U = armar()
  U.abrirAsignarPin(); U.elegirPersonaAsignar('e-sin'); tipear(U, PIN)
  U.volverAsignarPin(); U.volverAsignarPin()
  chk('Volver desde la lista sale de la pantalla', U.estado.asignar === null && U.estado.vista !== 'pr-asignar')

  const V = armar()
  V.estado.modo = 'masa'          // sin persona de Producción: solo el maestro
  V.estado.persona = null
  V.abrirAsignarPin(); V.elegirPersonaAsignar('e-sin'); tipear(V, PIN)
  V.estado.ultimoToque = Date.now() - 16 * 60000
  V.revisarInactividad()
  chk('por inactividad se cierra el maestro y el PIN se va', V.estado.maestro === null && V.estado.asignar === null)
  chk('… y la pantalla del maestro no queda abierta', V.estado.vista !== 'pr-asignar')
  sinPin(V, 'inactividad')

  const W = armar()
  W.abrirAsignarPin(); W.elegirPersonaAsignar('e-sin'); tipear(W, PIN)
  W.estado.maestro = null
  esperas.push((async () => {
    await W.confirmarAsignarPin()
    chk('sin maestro no se manda nada', llamadas(W, 'asignar_pin_con_maestro').length === 0)
    chk('… y lo dice', /acceso maestro se cerró/.test(W.estado.asignar.error ?? ''))
  })())
}

// ── Todo nombre se escapa ────────────────────────────────────────────────
{
  const S = armar()
  S.estado.personal = [{ ...PERSONAL[0], id: 'e-x', nombre: marca('nombreAsignar') }]
  S.abrirAsignarPin()
  chequearMarcas(chk, 'lista de Asignar PIN', el(S, 'pr-asignar-personas').innerHTML, ['nombreAsignar'])
  S.elegirPersonaAsignar('e-x')
  chk('el título va por textContent', el(S, 'pr-asignar-titulo').innerHTML === '' && el(S, 'pr-asignar-titulo').textContent.includes('<b data-xss='))
  chk('el id va escapado en el atributo', /esc\(p\.id\)/.test(FUENTE.slice(FUENTE.indexOf('function htmlPersonaAsignar'), FUENTE.indexOf('function htmlTecladoAsignar'))))
}

fin()
