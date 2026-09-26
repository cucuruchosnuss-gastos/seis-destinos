// Parte 1 del rediseño de Producción (22/09/2026): el PIN, el acceso maestro y
// "Dar acceso por hoy".
//
// Todo lo que se verifica acá sale del CUERPO de las RPCs, leído con
// pg_get_functiondef el 22/09/2026:
//  - verificar_pin_produccion DEVUELVE el rechazo como jsonb con su motivo
//    (sin_puesto, sin_pin, pin_vencido, bloqueado, pin_incorrecto); no lo
//    lanza. Bloquea A LOS 5 ERRORES por 5 minutos, y en el quinto devuelve
//    todavía pin_incorrecto con intentos_restantes en 0 —el bloqueado_hasta
//    llega recién en el intento siguiente—.
//  - verificar_pin_maestro: PIN de 8 números, bloqueo a los 3 por 15 minutos.
//  - cambiar_pin_produccion pide el PIN ACTUAL, devuelve pin_repetido si el
//    nuevo es igual, y LANZA si el nuevo no es válido.
//  - otorgar_puesto_temporal acepta p_maestro_id + p_maestro_pin y devuelve
//    pin_temporal en NULL si esa persona ya tenía PIN.
//
// Y la regla que no se negocia: EL PIN NO QUEDA EN NINGÚN LADO — ni el común,
// ni el maestro, ni el pin_temporal— fuera de la memoria.
//
//   node pruebas/test-produccion-pin.js

const path = require('path')
const { arnes, leer, marca, chequearMarcas } = require('./circuito-comun')
const { construirProduccion } = require('./sandbox-produccion')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/produccion.html')
const FUENTE = leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

const PERSONAL = [
  { id: 'e-fede', nombre: 'Federico Silva', misma_unidad: true, puestos: ['encargado'], puestos_temporales: [], es_maestro: false },
  { id: 'e-jefa', nombre: 'Marta Jefa', misma_unidad: true, puestos: ['encargado'], puestos_temporales: [], es_maestro: true },
  { id: 'e-op', nombre: 'Operario Uno', misma_unidad: true, puestos: ['operario'], puestos_temporales: [], es_maestro: false },
]

// El PIN no puede quedar en NINGUNA parte observable: ni en un storage, ni en
// el innerHTML, el textContent, el value, un data-* o un atributo del DOM.
function rastro(S) {
  const partes = []
  for (const [, el] of S.__els) {
    partes.push(el.innerHTML, el.textContent, el.value, el.className, el.title,
      JSON.stringify(el.dataset), JSON.stringify(el.atributos))
  }
  partes.push(JSON.stringify([...S.__ls]), JSON.stringify([...S.__ss]))
  return partes.join('\u0001')
}

function armar(respuestas = {}) {
  const S = construirProduccion(ARCHIVO)
  S.estado.modo = 'produccion'
  S.estado.personal = PERSONAL
  S.__setRpc(async (nombre, params) => {
    if (nombre === 'personal_produccion') return { data: PERSONAL, error: null }
    const r = respuestas[nombre]
    if (typeof r === 'function') return r(params)
    return { data: r ?? null, error: null }
  })
  return S
}

// Tipea un PIN entero y toca Entrar.
async function tipear(S, pin) {
  for (const d of String(pin)) S.teclaPin(d)
  return S.teclaPin('entrar')
}

// ── Los mensajes, uno por motivo ──────────────────────────────────────────
{
  const S = armar()
  chk('sin_pin lo dice y a quién pedírselo',
    /Todavía no tenés PIN/.test(S.mensajeDePin({ motivo: 'sin_pin' }).texto) &&
    /configura producción/.test(S.mensajeDePin({ motivo: 'sin_pin' }).texto))
  chk('sin_puesto tiene mensaje propio y dice cómo se arregla',
    /No figurás en este puesto/.test(S.mensajeDePin({ motivo: 'sin_puesto' }).texto) &&
    /Configuración → Personal/.test(S.mensajeDePin({ motivo: 'sin_puesto' }).texto))
  chk('pin_vencido lo dice', /Tu PIN temporal venció/.test(S.mensajeDePin({ motivo: 'pin_vencido' }).texto))
  chk('pin_repetido: elegí uno distinto', /Elegí uno distinto al que te dieron/.test(S.mensajeDePin({ motivo: 'pin_repetido' }).texto))

  const b = S.mensajeDePin({ motivo: 'bloqueado', bloqueado_hasta: '2026-09-22T13:42:00Z' })
  chk('bloqueado dice a qué hora se puede volver a probar', /Probá de nuevo a las 10:42/.test(b.texto), b.texto)
  chk('… la hora es la de Argentina, no la del servidor', !/13:42/.test(b.texto))
  chk('… y arrastra el bloqueado_hasta para la cuenta regresiva', b.bloqueadoHasta === '2026-09-22T13:42:00Z')

  chk('pin_incorrecto con 3: plural', S.mensajeDePin({ motivo: 'pin_incorrecto', intentos_restantes: 3 }).texto === 'PIN incorrecto · te quedan 3 intentos')
  chk('pin_incorrecto con 1: singular', S.mensajeDePin({ motivo: 'pin_incorrecto', intentos_restantes: 1 }).texto === 'PIN incorrecto · te queda 1 intento')
  // El quinto error devuelve intentos_restantes 0 y NO trae bloqueado_hasta:
  // no se inventa la hora, se dice que quedó bloqueado.
  chk('pin_incorrecto con 0: dice que quedó bloqueado, sin inventar la hora',
    /quedó bloqueado unos minutos/.test(S.textoIntentos(0)) && !/\d\d:\d\d/.test(S.textoIntentos(0)))
  chk('un motivo desconocido no se calla', /No se pudo verificar/.test(S.mensajeDePin({ motivo: 'lo-que-sea' }).texto))
  chk('sin respuesta tampoco', /No se pudo verificar/.test(S.mensajeDePin(null).texto))

  // NUNCA se distingue si falló el nombre o el PIN: el mensaje del PIN
  // equivocado habla solo del PIN y no nombra a nadie.
  for (const n of [4, 1, 0]) {
    const t = S.mensajeDePin({ motivo: 'pin_incorrecto', intentos_restantes: n }).texto
    chk(`el mensaje de PIN incorrecto (${n}) no nombra a la persona`, !/Federico|Silva|nombre|no sos/i.test(t), t)
  }
}

// ── La cuenta regresiva ───────────────────────────────────────────────────
{
  const S = armar()
  const base = new Date('2026-09-22T10:00:00Z')
  chk('faltan 5 minutos', S.cuentaRegresiva('2026-09-22T10:05:00Z', base) === '5:00')
  chk('faltan 4:32', S.cuentaRegresiva('2026-09-22T10:04:32Z', base) === '4:32')
  chk('los segundos van con dos dígitos', S.cuentaRegresiva('2026-09-22T10:00:07Z', base) === '0:07')
  chk('ya pasó: null, el panel se destraba solo', S.cuentaRegresiva('2026-09-22T09:59:00Z', base) === null)
  chk('justo ahora: null', S.cuentaRegresiva('2026-09-22T10:00:00Z', base) === null)
  chk('una fecha ilegible no da NaN: da null', S.cuentaRegresiva('cualquier cosa', base) === null)
}

// ── El mensaje del PIN se escapa ─────────────────────────────────────────
// El texto puede venir de la base: cambiar_pin_produccion LANZA, y ese
// err.message se muestra tal cual porque ya está escrito para una persona.
{
  const S = armar()
  const p = S.nuevoPanelPin('persona', { id: 'e-fede', nombre: marca('nombrePin') }, 'encargado')
  p.mensaje = { texto: marca('mensajePin') }
  chequearMarcas(chk, 'mensaje del PIN', S.htmlMensajePin(p, null), ['mensajePin'])

  p.bloqueadoHasta = '2026-09-22T13:42:00Z'
  p.mensaje = { texto: marca('mensajeBloqueo') }
  chequearMarcas(chk, 'PIN bloqueado', S.htmlMensajePin(p, marca('reloj')), ['mensajeBloqueo', 'reloj'])

  // Y el saludo, que lleva el nombre, va por textContent y no por innerHTML.
  S.estado.pin = p
  S.pintarPin()
  chk('el saludo del PIN no arma HTML con el nombre',
    S.__doc.getElementById('pr-pin-saludo').innerHTML === '' &&
    S.__doc.getElementById('pr-pin-saludo').textContent.includes('<b data-xss='))
}

// ── El teclado es propio: el número no entra al DOM ──────────────────────
esperas.push((async () => {
  const S = armar()
  S.elegirPersona('e-fede')
  for (const d of '4729') S.teclaPin(d)
  chk('los dígitos viven en memoria', S.estado.pin.digitos === '4729')
  chk('el PIN NO está en el DOM ni en ningún storage', !rastro(S).includes('4729'), 'apareció el PIN')
  const puntos = S.__doc.getElementById('pr-pin-puntos').innerHTML
  chk('los puntos son formas, no números', !/4|7|2|9/.test(puntos.replace(/pr-pin__punto/g, '')), puntos)
  chk('… cuatro puntos, los cuatro llenos', (puntos.match(/<span class="pr-pin__punto/g) || []).length === 4 &&
    (puntos.match(/pr-pin__punto--lleno/g) || []).length === 4)
  S.teclaPin('borrar')
  chk('Borrar saca el último', S.estado.pin.digitos === '472')
  chk('… y el punto se vacía', (S.__doc.getElementById('pr-pin-puntos').innerHTML.match(/pr-pin__punto--lleno/g) || []).length === 3)
  S.teclaPin('5'); S.teclaPin('6')
  chk('no entra un quinto número', S.estado.pin.digitos === '4725')
  chk('el teclado tiene 1–9, Borrar, 0 y Entrar',
    (S.__doc.getElementById('pr-pin-teclado').innerHTML.match(/data-tecla=/g) || []).length === 12)
  chk('ningún campo del PIN es un <input>: no se levanta el teclado del sistema',
    !/id="pr-pin-[a-z]*"[^>]*<input/.test(FUENTE) && !/<input[^>]*pr-pin/.test(FUENTE))
})())

// ── Entrar bien, y los rechazos ──────────────────────────────────────────
esperas.push((async () => {
  const S = armar({ verificar_pin_produccion: { ok: true, debe_cambiar: false } })
  S.elegirPersona('e-fede')
  await tipear(S, '4729')
  const llamada = S.__llamadas.rpc.find(l => l[0] === 'verificar_pin_produccion')
  chk('se llama a verificar_pin_produccion con los cuatro parámetros',
    JSON.stringify(llamada[1]) === JSON.stringify({ p_empleado_id: 'e-fede', p_unidad_negocio_id: 'u-cn', p_puesto: 'encargado', p_pin: '4729' }),
    JSON.stringify(llamada[1]))
  chk('con ok entra', S.estado.persona?.id === 'e-fede')
  chk('… y el panel del PIN se cierra', S.estado.pin === null)
  chk('el PIN no quedó en ningún lado después de entrar', !rastro(S).includes('4729'))

  // PIN incorrecto: se limpia y se avisa, sin echar a nadie de la lista.
  const T = armar({ verificar_pin_produccion: { ok: false, motivo: 'pin_incorrecto', intentos_restantes: 4 } })
  T.elegirPersona('e-fede')
  await tipear(T, '1111')
  chk('PIN incorrecto: no entra', T.estado.persona === null)
  chk('… se borra lo tipeado', T.estado.pin.digitos === '')
  chk('… los puntos quedan en bordó', T.estado.pin.mal === true &&
    /pr-pin__punto--mal/.test(T.__doc.getElementById('pr-pin-puntos').innerHTML))
  chk('… con el aviso entre los puntos y el teclado',
    /te quedan 4 intentos/.test(T.__doc.getElementById('pr-pin-mensaje').innerHTML))
  chk('… y la persona sigue elegida, para reintentar', T.estado.pin.personaId === 'e-fede')

  // sin_pin / sin_puesto / pin_vencido: cada uno con su mensaje.
  for (const [motivo, texto] of [['sin_pin', 'Todavía no tenés PIN'], ['sin_puesto', 'No figurás en este puesto'], ['pin_vencido', 'Tu PIN temporal venció']]) {
    const U = armar({ verificar_pin_produccion: { ok: false, motivo } })
    U.elegirPersona('e-fede')
    await tipear(U, '4729')
    chk(`${motivo}: no entra y lo dice`, U.estado.persona === null &&
      new RegExp(texto).test(U.__doc.getElementById('pr-pin-mensaje').innerHTML),
      U.__doc.getElementById('pr-pin-mensaje').innerHTML)
  }

  // Bloqueado: cuenta regresiva grande, teclado apagado y salida.
  const dentroDe5 = new Date(Date.now() + 5 * 60000).toISOString()
  const V = armar({ verificar_pin_produccion: { ok: false, motivo: 'bloqueado', bloqueado_hasta: dentroDe5 } })
  V.elegirPersona('e-fede')
  await tipear(V, '4729')
  chk('bloqueado: la cuenta regresiva a la vista', /pr-pin__reloj/.test(V.__doc.getElementById('pr-pin-mensaje').innerHTML))
  chk('… con la hora a la que se puede volver a probar', /Probá de nuevo a las/.test(V.__doc.getElementById('pr-pin-mensaje').innerHTML))
  chk('… el teclado deshabilitado', /data-tecla="1" disabled/.test(V.__doc.getElementById('pr-pin-teclado').innerHTML))
  chk('… y atenuado', /pr-pin__teclado--off/.test(V.__doc.getElementById('pr-pin-teclado').className))
  chk('… con "Elegir otra persona"', V.__doc.getElementById('pr-pin-otra').hidden === false &&
    V.__doc.getElementById('pr-pin-otra').textContent === 'Elegir otra persona')
  const antesDeTeclear = V.estado.pin.digitos
  V.teclaPin('7')
  chk('bloqueado: las teclas no hacen nada', V.estado.pin.digitos === antesDeTeclear)
  V.cerrarPin()
  chk('"Elegir otra persona" cierra el panel sin entrar', V.estado.pin === null && V.estado.persona === null)

  // Un error de red no entra y no deja el botón trabado.
  const W = armar({ verificar_pin_produccion: () => { throw new Error('sin red') } })
  W.elegirPersona('e-fede')
  await tipear(W, '4729')
  chk('sin red: no entra, lo dice y se puede reintentar',
    W.estado.persona === null && W.estado.pin.enviando === false &&
    /Revisá la conexión/.test(W.__doc.getElementById('pr-pin-mensaje').innerHTML))

  // Un PIN incompleto no se manda.
  const X = armar({ verificar_pin_produccion: { ok: true, debe_cambiar: false } })
  X.elegirPersona('e-fede')
  X.teclaPin('4'); X.teclaPin('7')
  await X.teclaPin('entrar')
  chk('un PIN incompleto no se manda', !X.__llamadas.rpc.some(l => l[0] === 'verificar_pin_produccion'))
  chk('… y lo dice', /Faltan números/.test(X.__doc.getElementById('pr-pin-mensaje').innerHTML))
})())

// ── EL CAMBIO OBLIGATORIO: no se puede saltear ───────────────────────────
esperas.push((async () => {
  const cambios = []
  const S = armar({
    verificar_pin_produccion: { ok: true, debe_cambiar: true },
    cambiar_pin_produccion: (p) => { cambios.push(p); return { data: { ok: true }, error: null } },
  })
  S.elegirPersona('e-fede')
  await tipear(S, '4729')
  chk('con debe_cambiar NO entra', S.estado.persona === null)
  chk('… pasa a elegir un PIN nuevo', S.estado.pin.fase === 'nuevo')
  chk('… guarda el actual en memoria para poder cambiarlo', S.estado.pin.pinActual === '4729')
  chk('… el actual NO quedó en el DOM ni en un storage', !rastro(S).includes('4729'))
  chk('… con la barra de dos tramos',
    (S.__doc.getElementById('pr-pin-progreso').innerHTML.match(/class="pr-pin__tramo[ "]/g) || []).length === 2,
    S.__doc.getElementById('pr-pin-progreso').innerHTML)
  chk('… el primer tramo hecho y el segundo no',
    (S.__doc.getElementById('pr-pin-progreso').innerHTML.match(/pr-pin__tramo--hecho/g) || []).length === 1)
  chk('… la tecla de acción dice "Seguir"', /data-tecla="entrar"[^>]*>Seguir</.test(S.__doc.getElementById('pr-pin-teclado').innerHTML))
  chk('… y el saludo lo explica', /Es tu primera vez/.test(S.__doc.getElementById('pr-pin-saludo').textContent))
  chk('en el paso del PIN de siempre NO hay barra de progreso',
    S.htmlProgresoPin('pin') === '' && S.htmlProgresoPin('nuevo') !== '')

  await tipear(S, '8613')
  chk('el PIN nuevo pide repetirlo', S.estado.pin.fase === 'repetir')
  chk('… los dos tramos hechos', (S.__doc.getElementById('pr-pin-progreso').innerHTML.match(/pr-pin__tramo--hecho/g) || []).length === 2)
  chk('… y todavía no se llamó a cambiar_pin_produccion', cambios.length === 0)
  chk('… la tecla vuelve a decir "Entrar"', /data-tecla="entrar"[^>]*>Entrar</.test(S.__doc.getElementById('pr-pin-teclado').innerHTML))

  await tipear(S, '8613')
  chk('se llama a cambiar_pin_produccion con el actual y el nuevo',
    JSON.stringify(cambios[0]) === JSON.stringify({ p_empleado_id: 'e-fede', p_unidad_negocio_id: 'u-cn', p_pin_actual: '4729', p_pin_nuevo: '8613' }),
    JSON.stringify(cambios[0]))
  chk('recién ahí entra', S.estado.persona?.id === 'e-fede')
  chk('ningún PIN quedó en el DOM ni en un storage', !rastro(S).includes('4729') && !rastro(S).includes('8613'))

  // Repetir mal: se vuelve al primer paso, sin llamar a nadie.
  const T = armar({
    verificar_pin_produccion: { ok: true, debe_cambiar: true },
    cambiar_pin_produccion: () => { throw new Error('no debería llamarse') },
  })
  T.elegirPersona('e-fede')
  await tipear(T, '4729')
  await tipear(T, '8613')
  await tipear(T, '8614')
  chk('si los dos no coinciden se empieza de nuevo', T.estado.pin.fase === 'nuevo' && T.estado.pin.pinNuevo === null)
  chk('… y lo dice', /no coinciden/.test(T.__doc.getElementById('pr-pin-mensaje').innerHTML))
  chk('… sin entrar', T.estado.persona === null)

  // pin_repetido: el mensaje del pedido, y se queda en el paso del PIN nuevo.
  const U = armar({
    verificar_pin_produccion: { ok: true, debe_cambiar: true },
    cambiar_pin_produccion: { ok: false, motivo: 'pin_repetido' },
  })
  U.elegirPersona('e-fede')
  await tipear(U, '4729')
  await tipear(U, '4729')
  await tipear(U, '4729')
  chk('pin_repetido: no entra', U.estado.persona === null)
  chk('… dice que elija otro', /Elegí uno distinto al que te dieron/.test(U.__doc.getElementById('pr-pin-mensaje').innerHTML))
  chk('… y se queda eligiendo el nuevo', U.estado.pin.fase === 'nuevo')

  // Un PIN nuevo inválido lo LANZA la base: se muestra su mensaje tal cual.
  const V = armar({
    verificar_pin_produccion: { ok: true, debe_cambiar: true },
    cambiar_pin_produccion: () => { throw new Error('El PIN nuevo tiene que ser de 4 números y no tan obvio.') },
  })
  V.elegirPersona('e-fede')
  await tipear(V, '4729')
  await tipear(V, '1234')
  await tipear(V, '1234')
  chk('un PIN nuevo inválido no entra', V.estado.persona === null)
  chk('… y se muestra el mensaje de la base, que ya está escrito para una persona',
    /no tan obvio/.test(V.__doc.getElementById('pr-pin-mensaje').innerHTML))
  chk('… volviendo a pedir el nuevo', V.estado.pin.fase === 'nuevo')

  // No hay forma de llegar al modo salteando el cambio.
  chk('el único camino que entra pasa antes por debe_cambiar',
    /if \(res\.debe_cambiar\) \{[\s\S]{0,400}?return entrar\(\{ id: p\.personaId/.test(FUENTE))
})())

// ── ACCESO MAESTRO ───────────────────────────────────────────────────────
esperas.push((async () => {
  const S = armar({ verificar_pin_maestro: { ok: true } })
  S.abrirMaestro()
  chk('el acceso maestro abre su panel', S.estado.pin?.modo === 'maestro')
  chk('… pide 8 números', S.estado.pin.largo === 8 && S.LARGO_PIN_MAESTRO === 8)
  chk('… con 8 puntos', (S.__doc.getElementById('pr-pin-puntos').innerHTML.match(/pr-pin__punto\b/g) || []).length === 8)
  chk('… el panel va en gris, no compite con el naranja', /pr-pin--maestro/.test(S.__doc.getElementById('pr-pin').className))
  chk('… y tiene salida propia', S.__doc.getElementById('pr-pin-otra').hidden === false &&
    S.__doc.getElementById('pr-pin-otra').textContent === 'Cancelar')

  // Con UN solo maestro posible se elige solo: pedir el nombre cuando no hay
  // nada que elegir es un toque de más.
  await tipear(S, '48271936')
  chk('con un solo maestro posible se elige solo', S.estado.maestro?.id === 'e-jefa')

  // Con dos o más hay que elegir el nombre en la lista de la izquierda.
  const M = armar({ verificar_pin_maestro: { ok: true } })
  M.estado.personal = PERSONAL.map(p => ({ ...p, es_maestro: true }))
  M.abrirMaestro()
  await tipear(M, '48271936')
  chk('con varios maestros hay que elegir el nombre primero', M.estado.maestro === null)
  chk('… y se pide sin mandar nada', !M.__llamadas.rpc.some(l => l[0] === 'verificar_pin_maestro') &&
    /Tocá primero tu nombre/.test(M.__doc.getElementById('pr-pin-mensaje').innerHTML))

  const T = armar({ verificar_pin_maestro: { ok: true } })
  T.abrirMaestro()
  T.estado.pin.personaId = 'e-jefa'
  T.estado.pin.personaNombre = 'Marta Jefa'
  await tipear(T, '48271936')
  const l = T.__llamadas.rpc.find(x => x[0] === 'verificar_pin_maestro')
  chk('se llama a verificar_pin_maestro con el empleado y el PIN',
    JSON.stringify(l[1]) === JSON.stringify({ p_empleado_id: 'e-jefa', p_pin: '48271936' }), JSON.stringify(l[1]))
  chk('el maestro queda activo', T.estado.maestro?.id === 'e-jefa')
  chk('… y entra al modo', T.estado.persona?.id === 'e-jefa')
  chk('TODO lo que haga queda a SU nombre', T.estado.persona?.nombre === 'Marta Jefa')
  chk('el PIN maestro NO queda en el DOM ni en ningún storage', !rastro(T).includes('48271936'))
  chk('… pero sí en memoria, que es lo que otorgar_puesto_temporal pide', T.__pinMaestro() === '48271936')

  // El cartel fijo lo dice mientras está activo.
  T.pintarMaestro()
  chk('el cartel del maestro está a la vista', T.__doc.getElementById('pr-maestro').hidden === false)
  chk('… y dice que lo que se haga queda a su nombre',
    /Marta Jefa/.test(T.__doc.getElementById('pr-maestro-texto').textContent) &&
    /queda a tu nombre/.test(T.__doc.getElementById('pr-maestro-texto').textContent))

  // Con el maestro activo se entra a cualquier modo sin volver a poner el PIN.
  T.marcarAbiertas(true)
  const rpcAntes = T.__llamadas.rpc.length
  await T.tocarModo('masa')
  chk('con el maestro activo se cambia de modo sin volver a poner el PIN',
    T.estado.modo === 'masa' && T.estado.persona?.id === 'e-jefa')
  chk('… sin pedirle el PIN a nadie', !T.__llamadas.rpc.slice(rpcAntes).some(x => x[0].startsWith('verificar_pin')))
  chk('… y con el puesto del modo nuevo', T.estado.persona?.puesto === 'masero')

  // Cerrarlo borra todo.
  T.cerrarMaestro()
  chk('cerrar el maestro lo apaga', T.estado.maestro === null)
  chk('… borra su PIN de la memoria', T.__pinMaestro() === null)
  chk('… y echa a la persona', T.estado.persona === null)

  // NO se guarda en sessionStorage: su PIN vive en memoria y la sesión dura lo
  // mismo. Recargar la tablet la cierra, que es lo correcto para un acceso de
  // excepción.
  chk('el maestro no se guarda en ningún storage', !JSON.stringify([...T.__ss]).includes('maestro'))

  // Bloqueo del maestro: 3 errores, 15 minutos (lo aplica la base).
  const dentroDe15 = new Date(Date.now() + 15 * 60000).toISOString()
  const U = armar({ verificar_pin_maestro: { ok: false, motivo: 'bloqueado', bloqueado_hasta: dentroDe15 } })
  U.abrirMaestro()
  U.estado.pin.personaId = 'e-jefa'
  await tipear(U, '11111111')
  chk('el maestro bloqueado no entra', U.estado.maestro === null)
  chk('… con su cuenta regresiva', /pr-pin__reloj/.test(U.__doc.getElementById('pr-pin-mensaje').innerHTML))

  const V = armar({ verificar_pin_maestro: { ok: false, motivo: 'pin_incorrecto', intentos_restantes: 2 } })
  V.abrirMaestro()
  V.estado.pin.personaId = 'e-jefa'
  await tipear(V, '11111111')
  chk('el maestro con PIN incorrecto lo dice', /te quedan 2 intentos/.test(V.__doc.getElementById('pr-pin-mensaje').innerHTML))
  chk('… y no queda activo', V.estado.maestro === null)
})())

// ── DAR ACCESO POR HOY ───────────────────────────────────────────────────
esperas.push((async () => {
  const hoy = construirProduccion(ARCHIVO).hoyArgentina()
  const S = armar()
  chk('hasta hoy: se manda null y la base pone la medianoche argentina', S.hastaDesdeFecha(hoy, hoy) === null)
  chk('sin fecha: también null', S.hastaDesdeFecha('', hoy) === null)
  chk('otro día: el comienzo del día siguiente, con el huso fijo de Argentina',
    S.hastaDesdeFecha('2026-09-25', '2026-09-22') === '2026-09-26T00:00:00-03:00')

  chk('sin persona no se puede dar el acceso', S.faltanParaAcceso({ personaId: null, puesto: 'masero', hasta: hoy }, hoy).length === 1)
  chk('sin puesto tampoco', S.faltanParaAcceso({ personaId: 'x', puesto: null, hasta: hoy }, hoy).length === 1)
  chk('con los dos, se puede', S.faltanParaAcceso({ personaId: 'x', puesto: 'masero', hasta: hoy }, hoy).length === 0)
  chk('una fecha que ya pasó no vale', S.faltanParaAcceso({ personaId: 'x', puesto: 'masero', hasta: '2020-01-01' }, hoy).length === 1)
  chk('más de 7 días tampoco: la base lo rechaza',
    S.faltanParaAcceso({ personaId: 'x', puesto: 'masero', hasta: S.sumarDias(hoy, 8) }, hoy).length === 1)

  // Con PIN temporal: se muestra UNA vez y se borra al cerrar.
  const T = armar({ otorgar_puesto_temporal: { ok: true, hasta: '2026-09-23T03:00:00Z', pin_temporal: '7315' } })
  T.estado.maestro = { id: 'e-jefa', nombre: 'Marta Jefa' }
  T.abrirMaestro()
  T.estado.pin.personaId = 'e-jefa'
  T.__setRpc(async (n, p) => {
    if (n === 'personal_produccion') return { data: PERSONAL, error: null }
    if (n === 'verificar_pin_maestro') return { data: { ok: true }, error: null }
    if (n === 'otorgar_puesto_temporal') { T.__ultimo = p; return { data: { ok: true, pin_temporal: '7315' }, error: null } }
    return { data: null, error: null }
  })
  await tipear(T, '48271936')
  T.abrirDarAcceso()
  chk('el formulario arranca sin nada elegido', T.estado.acceso.personaId === null && T.estado.acceso.puesto === null)
  chk('… con el botón trabado hasta que se elige', T.__doc.getElementById('pr-acceso-confirmar').disabled === true)
  chk('… y con los tres puestos', (T.__doc.getElementById('pr-acceso-puestos').innerHTML.match(/data-acceso-puesto=/g) || []).length === 3)
  T.estado.acceso.personaId = 'e-op'
  T.estado.acceso.puesto = 'masero'
  T.pintarDarAcceso()
  chk('con persona y puesto el botón se destraba', T.__doc.getElementById('pr-acceso-confirmar').disabled === false)
  await T.confirmarDarAcceso()
  chk('se llama a otorgar_puesto_temporal con el maestro y su PIN',
    T.__ultimo.p_maestro_id === 'e-jefa' && T.__ultimo.p_maestro_pin === '48271936', JSON.stringify(T.__ultimo))
  chk('… con la persona, la unidad y el puesto',
    T.__ultimo.p_empleado_id === 'e-op' && T.__ultimo.p_unidad_negocio_id === 'u-cn' && T.__ultimo.p_puesto === 'masero')
  chk('… y p_hasta en null para que la base ponga la medianoche argentina', T.__ultimo.p_hasta === null)
  chk('el PIN temporal se muestra', T.__doc.getElementById('pr-acceso-pin').hidden === false &&
    T.__doc.getElementById('pr-acceso-pin-numero').textContent === '7315')
  chk('… diciendo que no se vuelve a mostrar y a quién pasárselo',
    /No se va a volver a mostrar/.test(T.__doc.getElementById('pr-acceso-pin-texto').textContent) &&
    /Operario Uno/.test(T.__doc.getElementById('pr-acceso-pin-texto').textContent))
  T.cerrarDarAcceso()
  chk('al cerrar se suelta el formulario entero: ahí se va el PIN de la memoria', T.estado.acceso === null)
  chk('… y se borra de la pantalla',
    T.__doc.getElementById('pr-acceso-pin-numero').textContent === '' &&
    T.__doc.getElementById('pr-acceso-pin').hidden === true && !rastro(T).includes('7315'))

  // pin_temporal NULL: esa persona ya tenía PIN, y no se inventa ninguno.
  const U = armar({ otorgar_puesto_temporal: { ok: true, pin_temporal: null } })
  U.estado.maestro = { id: 'e-jefa', nombre: 'Marta Jefa' }
  U.abrirDarAcceso()
  U.estado.acceso.personaId = 'e-op'
  U.estado.acceso.puesto = 'masero'
  await U.confirmarDarAcceso()
  chk('sin pin_temporal no se muestra ningún número', U.__doc.getElementById('pr-acceso-pin').hidden === true)
  chk('… y se dice que entra con el suyo de siempre', U.__llamadas.exitos.some(t => /PIN de siempre/.test(t)))

  // Si el maestro dejó de valer, la base devuelve SU rechazo.
  const V = armar({ otorgar_puesto_temporal: { ok: false, motivo: 'bloqueado', bloqueado_hasta: new Date(Date.now() + 60000).toISOString() } })
  V.estado.maestro = { id: 'e-jefa', nombre: 'Marta Jefa' }
  V.abrirDarAcceso()
  V.estado.acceso.personaId = 'e-op'
  V.estado.acceso.puesto = 'masero'
  await V.confirmarDarAcceso()
  chk('el rechazo del maestro se dice en el error del formulario',
    V.__doc.getElementById('pr-acceso-error').hidden === false &&
    /Probá de nuevo a las/.test(V.__doc.getElementById('pr-acceso-error').textContent))

  // HTML malicioso en el nombre de la persona a la que se le da el acceso.
  const W = construirProduccion(ARCHIVO)
  W.estado.personal = [{ id: marca('accId'), nombre: marca('accNombre'), misma_unidad: true, puestos: [], puestos_temporales: [] }]
  W.estado.maestro = { id: 'm', nombre: 'M' }
  W.abrirDarAcceso()
  chequearMarcas(chk, 'dar acceso', W.__doc.getElementById('pr-acceso-personas').innerHTML, ['accId', 'accNombre'])
})())

// ── Lo que queda escrito: medidas y colores del panel ────────────────────
{
  const css = FUENTE.slice(FUENTE.indexOf('<style>'), FUENTE.indexOf('</style>'))
  chk('las teclas del PIN son de 84 px', /\.pr-tecla\s*\{[^}]*min-height: 84px/.test(css))
  chk('la cuenta regresiva es de 72 px (4.5rem) y en bordó',
    /\.pr-pin__reloj\s*\{[^}]*font-size: 4\.5rem/.test(css) && /\.pr-pin__bloqueo\s*\{[^}]*var\(--bordo\)/.test(css))
  chk('los puntos del PIN común son de 30 px', /\.pr-pin__punto\s*\{[^}]*width: 30px/.test(css))
  chk('los del maestro, de 22 px', /\.pr-pin--maestro \.pr-pin__punto\s*\{[^}]*width: 22px/.test(css))
  chk('el panel del maestro va en gris', /\.pr-pin--maestro\s*\{\s*background: var\(--pr-panel-gris\)/.test(css))
  chk('y su tecla de acción NO es naranja', /\.pr-pin--maestro \.pr-tecla--accion\s*\{\s*background: var\(--pr-prod-activo\)/.test(css))
  chk('la tecla de acción común SÍ es naranja', /\.pr-tecla--accion\s*\{[^}]*background: var\(--naranja\)/.test(css))
  chk('"Acceso maestro" es un texto subrayado en un objetivo de 56 px',
    /\.pr-link\s*\{[^}]*min-height: var\(--pr-alto-boton\)[^}]*text-decoration: underline/s.test(css))
}

fin()
