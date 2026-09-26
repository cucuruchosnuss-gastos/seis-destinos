// "Terminar la tablet", parte 2 (25/09/2026): la sesión de cada modo.
//
// Lo que rompió la prueba en la fábrica el 24/09: al pasar de Sala de masa a
// Producción se borró la persona de LOS DOS modos, porque había UNA sola clave
// en sessionStorage y cambiar de modo la borraba. Ahora:
//  - cada modo guarda su persona (produccion.persona.produccion / .masa) y
//    cambiar de modo NO pisa la del otro;
//  - volver a un modo que ya tiene persona muestra "Masero: Juan Masero" y
//    solo el PIN (sin lista); "Soy otra persona" vuelve a la lista;
//  - el encargado verificado o el acceso maestro pueden "Sacar al masero";
//  - cerrar la planilla de una máquina la saca de Sala de masa, y si era la
//    última el modo se apaga y el masero queda afuera (medido, nunca supuesto);
//  - una sola máquina abierta entra derecho; con dos se elige;
//  - la sala nunca queda muda: si la barra dice que hay abiertas y no llegan,
//    se vuelve a pedir, y si igual no llegan, "Volver a intentar";
//  - "Tocá para entrar" en vez de "Nadie adentro";
//  - una sola unidad no pregunta la fábrica.
//
//   node pruebas/test-produccion-sesion.js

process.env.TZ = 'UTC'

const path = require('path')
const { arnes, leer, marca, chequearMarcas } = require('./circuito-comun')
const { construirProduccion } = require('./sandbox-produccion')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/produccion.html')
const FUENTE = leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

const PERSONAL = [
  { id: 'e-fede', nombre: 'Federico Silva', misma_unidad: true, puestos: ['encargado'], puestos_temporales: [], es_maestro: false },
  { id: 'e-masero', nombre: 'Juan Masero', misma_unidad: true, puestos: ['masero'], puestos_temporales: [], es_maestro: false },
  { id: 'e-hoy', nombre: 'Carla Ríos', misma_unidad: true, puestos: [], puestos_temporales: ['masero'], es_maestro: false },
]
const FEDE = { id: 'e-fede', nombre: 'Federico Silva', puesto: 'encargado' }
const JUAN = { id: 'e-masero', nombre: 'Juan Masero', puesto: 'masero' }
const MAQUINAS = [{ id: 'm1', nombre: 'Máquina 1', orden: 1 }, { id: 'm2', nombre: 'Máquina 2', orden: 2 }]
const turno = (id, maquina, lote) => ({ id, lote, maquina_id: maquina, fecha: '2026-09-25', turno: 'Mañana', encargado_id: 'e-fede', abierto_en: '2026-09-25T09:00:00Z' })

// turnos: un array fijo, o una función que devuelve el array de ESA llamada
// (para simular una lectura que no trae nada y la siguiente que sí).
function armar({ turnos = [turno('t1', 'm1', 7023), turno('t2', 'm2', 7024)] } = {}) {
  const S = construirProduccion(ARCHIVO)
  S.estado.unidades = new Map([['u-cn', 'Cucuruchos Nuss']])
  S.estado.unidadId = 'u-cn'
  S.estado.unidadesPosibles = ['u-cn']
  S.estado.misTareas = new Map([['cargar', { todas: true }]])
  let lecturas = 0
  Object.assign(S.__tablas, {
    maquinas: MAQUINAS,
    turnos_produccion: () => { lecturas++; return { data: typeof turnos === 'function' ? turnos(lecturas) : turnos, error: null } },
    masas: [], paradas_produccion: [], produccion_items: [], recetas: [{ tipo_masa: 'Común' }], ingredientes: [],
  })
  S.__lecturasTurnos = () => lecturas
  S.__setRpc(async (n) => {
    if (n === 'personal_produccion') return { data: PERSONAL, error: null }
    if (n === 'datos_para_masa') return { data: { original: { receta_id: 'r1', version: 1, items: [] }, anterior: null, insumos: [] }, error: null }
    return { data: null, error: null }
  })
  return S
}
const guardada = (S, modo) => S.sessionStorage.getItem('produccion.persona.' + modo)
const botones = (html) => [...html.matchAll(/data-persona="([^"]+)"/g)].map(m => m[1])

// ── a) Cambiar de modo NO borra la persona del otro modo ────────────────
esperas.push((async () => {
  const S = armar()
  S.estado.modo = 'masa'
  S.marcarAbiertas(true)
  await S.entrar(JUAN)
  chk('el masero queda guardado en SU clave', /e-masero/.test(guardada(S, 'masa') ?? ''))
  chk('… y no en la del otro modo', guardada(S, 'produccion') === null)
  chk('la clave vieja, sin modo, no se usa', S.sessionStorage.getItem('produccion.persona') === null)

  await S.tocarModo('produccion')
  chk('pasar a Producción NO borra al masero', /e-masero/.test(guardada(S, 'masa') ?? ''))
  chk('… la pantalla pide quién es en Producción', S.estado.modo === 'produccion' && S.estado.persona === null &&
    S.__doc.getElementById('pr-quien').hidden === false)
  await S.entrar(FEDE)
  chk('el encargado entra y queda en su clave', /e-fede/.test(guardada(S, 'produccion') ?? ''))
  chk('… el masero sigue guardado', /e-masero/.test(guardada(S, 'masa') ?? ''))

  // b) Volver a Sala de masa: el masero YA está, solo el PIN.
  const personalAntes = S.__llamadas.rpc.filter(([n]) => n === 'personal_produccion').length
  await S.tocarModo('masa')
  chk('volver a Sala de masa no borra al encargado', /e-fede/.test(guardada(S, 'produccion') ?? ''))
  chk('… muestra "Masero: Juan Masero"', S.__doc.getElementById('pr-quien-fija').hidden === false &&
    S.__doc.getElementById('pr-quien-fija-texto').textContent === 'Masero: Juan Masero',
    S.__doc.getElementById('pr-quien-fija-texto').textContent)
  chk('… SIN la lista ni el buscador', S.__doc.getElementById('pr-quien-lista').hidden === true &&
    S.__doc.getElementById('pr-quien-buscar').hidden === true && S.__doc.getElementById('pr-quien-lista').innerHTML === '')
  chk('… sin pedir el personal (no hace falta la lista)', S.__llamadas.rpc.filter(([n]) => n === 'personal_produccion').length === personalAntes)
  chk('… con el teclado del PIN abierto para ESA persona y SU puesto', S.__doc.getElementById('pr-pin').hidden === false &&
    S.estado.pin?.personaId === 'e-masero' && S.estado.pin?.puesto === 'masero')
  chk('… pero todavía NO está adentro: hay que poner el PIN', S.estado.persona === null)

  // El PIN se verifica con la MISMA RPC de siempre, para esa persona.
  S.__setRpc(async (n, p) => {
    if (n === 'verificar_pin_produccion') return { data: { ok: true }, error: null }
    if (n === 'datos_para_masa') return { data: { original: { receta_id: 'r1', version: 1, items: [] }, anterior: null, insumos: [] }, error: null }
    return { data: null, error: null }
  })
  for (const t of ['1', '3', '5', '7']) S.teclaPin(t)
  await S.teclaPin('entrar')
  const v = S.__llamadas.rpc.filter(([n]) => n === 'verificar_pin_produccion').pop()
  chk('verificar_pin_produccion con la persona guardada y el puesto del modo',
    v && v[1].p_empleado_id === 'e-masero' && v[1].p_puesto === 'masero' && v[1].p_unidad_negocio_id === 'u-cn', JSON.stringify(v))
  chk('… y entra', S.estado.persona?.id === 'e-masero')

  // Soy otra persona: vuelve a la lista.
  const T = armar()
  T.estado.modo = 'masa'
  T.marcarAbiertas(true)
  T.sessionStorage.setItem('produccion.persona.masa', JSON.stringify(JUAN))
  await T.mostrarQuien()
  chk('con persona guardada no se ve la lista', T.__doc.getElementById('pr-quien-lista').hidden === true)
  await T.soyOtraPersona()
  chk('"Soy otra persona" vuelve a la lista', T.__doc.getElementById('pr-quien-lista').hidden === false &&
    JSON.stringify(botones(T.__doc.getElementById('pr-quien-lista').innerHTML)) === '["e-masero","e-hoy"]')
  chk('… sin el cartel de la persona fija', T.__doc.getElementById('pr-quien-fija').hidden === true)
  chk('… y sin el PIN abierto de nadie', T.estado.pin === null)
  chk('el botón está en el HTML', /id="pr-btn-otra-persona">Soy otra persona</.test(FUENTE))
  // Elegir otra persona de la lista y entrar la reemplaza en SU clave.
  T.elegirPersona('e-hoy')
  chk('… elegir a otra abre SU PIN', T.estado.pin?.personaId === 'e-hoy')

  // Salir saca solo a la persona de ESE modo.
  const U = armar()
  U.estado.modo = 'produccion'
  U.sessionStorage.setItem('produccion.persona.masa', JSON.stringify(JUAN))
  await U.entrar(FEDE)
  await U.salir()
  chk('Salir en Producción saca al encargado', guardada(U, 'produccion') === null && U.estado.persona === null)
  chk('… y NO al masero', /e-masero/.test(guardada(U, 'masa') ?? ''))
  chk('… y vuelve a la lista (no a su PIN)', U.__doc.getElementById('pr-quien-lista').hidden === false)
})())

// ── El cierre por inactividad saca SOLO a la persona de Producción ───────
{
  const S = armar()
  S.estado.modo = 'masa'
  S.estado.persona = JUAN
  S.sessionStorage.setItem('produccion.persona.masa', JSON.stringify(JUAN))
  S.sessionStorage.setItem('produccion.persona.produccion', JSON.stringify(FEDE))
  S.estado.ultimoToque = 1000
  S.revisarInactividad(1000 + 16 * 60000)
  chk('inactividad en Sala de masa: el encargado guardado se olvida', guardada(S, 'produccion') === null)
  chk('… el masero sigue adentro y guardado', S.estado.persona?.id === 'e-masero' && /e-masero/.test(guardada(S, 'masa') ?? ''))

  const T = armar()
  T.estado.modo = 'produccion'
  T.sessionStorage.setItem('produccion.persona.masa', JSON.stringify(JUAN))
  T.estado.persona = FEDE
  T.sessionStorage.setItem('produccion.persona.produccion', JSON.stringify(FEDE))
  T.estado.ultimoToque = 1000
  chk('inactividad en Producción: se cierra', T.revisarInactividad(1000 + 16 * 60000) === true)
  chk('… saca al encargado', T.estado.persona === null && guardada(T, 'produccion') === null)
  chk('… y NO al masero', /e-masero/.test(guardada(T, 'masa') ?? ''))
}

// ── c) Sacar al masero ────────────────────────────────────────────────────
{
  const S = armar()
  S.estado.modo = 'produccion'
  S.estado.persona = FEDE
  S.sessionStorage.setItem('produccion.persona.masa', JSON.stringify(JUAN))
  const html = S.htmlMaseroAdentro()
  chk('el encargado verificado ve quién está en Sala de masa', /Juan Masero/.test(html) && /id="pr-btn-sacar-masero">Sacar al masero</.test(html), html)
  chk('sacarlo lo borra', S.sacarMasero() === true && guardada(S, 'masa') === null)
  chk('… lo dice', S.__llamadas.exitos.some(m => /Juan Masero salió de Sala de masa/.test(m)))
  chk('… y el cartel desaparece', S.htmlMaseroAdentro() === '')
  chk('… el encargado sigue adentro', S.estado.persona?.id === 'e-fede')

  const M = armar()
  M.estado.modo = 'masa'
  M.estado.maestro = { id: 'e-jefa', nombre: 'Marta Jefa' }
  M.estado.persona = { id: 'e-jefa', nombre: 'Marta Jefa', puesto: 'masero' }
  M.sessionStorage.setItem('produccion.persona.masa', JSON.stringify(JUAN))
  chk('el acceso maestro también puede', /Sacar al masero/.test(M.htmlMaseroAdentro()) && M.sacarMasero() === true && guardada(M, 'masa') === null)

  const N = armar()
  N.estado.modo = 'produccion'
  N.estado.persona = null
  N.sessionStorage.setItem('produccion.persona.masa', JSON.stringify(JUAN))
  chk('sin encargado ni maestro la acción no aparece', N.htmlMaseroAdentro() === '')
  chk('… y aunque se la llame, no saca a nadie', N.sacarMasero() === false && /e-masero/.test(guardada(N, 'masa') ?? ''))

  const O = armar()
  O.estado.modo = 'masa'
  O.estado.persona = JUAN
  O.sessionStorage.setItem('produccion.persona.masa', JSON.stringify(JUAN))
  chk('el masero adentro de Sala de masa no se saca a sí mismo por acá', O.htmlMaseroAdentro() === '' && O.sacarMasero() === false)

  const P = armar()
  P.estado.modo = 'produccion'
  P.estado.persona = FEDE
  chk('sin masero guardado no hay cartel', P.htmlMaseroAdentro() === '')

  // HTML malicioso en el nombre del masero.
  const X = armar()
  X.estado.modo = 'produccion'
  X.estado.persona = FEDE
  X.sessionStorage.setItem('produccion.persona.masa', JSON.stringify({ id: 'e', nombre: marca('masero'), puesto: 'masero' }))
  chequearMarcas(chk, 'masero adentro', X.htmlMaseroAdentro(), ['masero'])

  // El tablero lo pinta.
  chk('el tablero tiene dónde decirlo', /<div id="pr-tablero-masero"><\/div>/.test(FUENTE))
  chk('mostrarTablero lo pinta', /marcarAbiertas\(estado\.tablero\.some\(e => e\.turno\)\)\n\s*pintarMaseroAdentro\(\)/.test(FUENTE))
}

// ── d) Cerrar la planilla saca la máquina de Sala de masa ────────────────
esperas.push((async () => {
  // Quedan dos: se cierra una, la otra sigue; el masero sigue adentro.
  let abiertas = [turno('t1', 'm1', 7023), turno('t2', 'm2', 7024)]
  const S = armar({ turnos: () => abiertas })
  S.estado.modo = 'produccion'
  S.estado.persona = FEDE
  S.sessionStorage.setItem('produccion.persona.masa', JSON.stringify(JUAN))
  await S.mostrarTablero()
  S.estado.salaTurno = { id: 't1' }
  abiertas = [turno('t2', 'm2', 7024)]
  await S.maquinaCerrada('t1')
  chk('la máquina cerrada sale de la sala', !S.maquinasAbiertas().some(e => e.turno.id === 't1'), S.maquinasAbiertas().map(e => e.turno.id))
  chk('… si era la elegida, se suelta', S.estado.salaTurno === null)
  chk('… quedando otra, Sala de masa sigue habilitada', S.salaDeshabilitada() === false)
  chk('… y el masero sigue adentro', /e-masero/.test(guardada(S, 'masa') ?? ''))

  // Era la última: se apaga el modo y el masero queda afuera.
  abiertas = []
  await S.maquinaCerrada('t2')
  chk('la última: Sala de masa se apaga', S.salaDeshabilitada() === true)
  chk('… y el masero queda afuera', guardada(S, 'masa') === null)
  chk('… el encargado sigue adentro', S.estado.persona?.id === 'e-fede')

  // Tercer estado: si no se pudo MEDIR, no se apaga ni se saca a nadie.
  const T = armar()
  T.estado.modo = 'produccion'
  T.estado.persona = FEDE
  T.marcarAbiertas(true)
  T.sessionStorage.setItem('produccion.persona.masa', JSON.stringify(JUAN))
  T.__tablas.maquinas = () => ({ data: null, error: { message: 'sin red' } })
  await T.maquinaCerrada('t1')
  chk('sin poder medir no se deshabilita', T.salaDeshabilitada() === false)
  chk('… ni se saca al masero', /e-masero/.test(guardada(T, 'masa') ?? ''))

  // Los dos caminos de cierre lo llaman.
  chk('cerrar_turno llama a maquinaCerrada', /mostrarExito\('Planilla cerrada\.'\)\n\s*await maquinaCerrada\(turnoId\)/.test(FUENTE))
  chk('forzar_cierre_turno también', /await maquinaCerrada\(p\.turno\.id\)\n\s*await mostrarTablero\(\)/.test(FUENTE))

  // Si la tablet está EN Sala de masa cuando se apaga, el masero sale de la
  // pantalla; el acceso maestro no, porque no es el masero.
  const U = armar()
  U.estado.modo = 'masa'
  U.estado.persona = JUAN
  U.sessionStorage.setItem('produccion.persona.masa', JSON.stringify(JUAN))
  U.marcarAbiertas(false)
  chk('en Sala de masa, sin abiertas, el masero sale de la pantalla', U.estado.persona === null)
  const V = armar()
  V.estado.modo = 'masa'
  V.estado.maestro = { id: 'e-jefa', nombre: 'Marta Jefa' }
  V.estado.persona = { id: 'e-jefa', nombre: 'Marta Jefa', puesto: 'masero' }
  V.marcarAbiertas(false)
  chk('… el acceso maestro sigue adentro', V.estado.persona?.id === 'e-jefa')
})())

// ── e) Una sola máquina abierta entra derecho; dos se eligen ─────────────
esperas.push((async () => {
  const S = armar({ turnos: [turno('t1', 'm1', 7023)] })
  S.estado.modo = 'masa'
  S.estado.persona = JUAN
  await S.mostrarSala()
  chk('una sola abierta: queda elegida sin tocar nada', S.estado.salaTurno?.id === 't1')
  chk('… y la derecha ya dice la máquina', /Máquina 1/.test(S.__doc.getElementById('pr-sala-panel').innerHTML))
  chk('… pidió los datos de la masa', S.__llamadas.rpc.some(([n]) => n === 'datos_para_masa'))

  const T = armar()
  T.estado.modo = 'masa'
  T.estado.persona = JUAN
  await T.mostrarSala()
  chk('dos abiertas: no se elige ninguna', T.estado.salaTurno == null)
  chk('… y se muestran las dos para elegir', (T.__doc.getElementById('pr-sala-maquinas').innerHTML.match(/data-sala-turno=/g) || []).length === 2)
})())

// ── f) La sala nunca queda muda ──────────────────────────────────────────
esperas.push((async () => {
  // La barra dice que hay abiertas y la primera lectura no trae ninguna: se
  // vuelve a pedir, y la segunda sí.
  const S = armar({ turnos: (n) => n === 1 ? [] : [turno('t1', 'm1', 7023), turno('t2', 'm2', 7024)] })
  S.estado.modo = 'masa'
  S.estado.persona = JUAN
  S.marcarAbiertas(true)
  await S.mostrarSala()
  chk('vacía con abiertas en la barra: vuelve a pedir', S.__lecturasTurnos() === 2, S.__lecturasTurnos())
  chk('… y muestra las máquinas', (S.__doc.getElementById('pr-sala-maquinas').innerHTML.match(/data-sala-turno=/g) || []).length === 2)

  // Siempre vacía, y la base dice que SÍ hay abiertas: mensaje con reintentar.
  const T = armar({ turnos: [] })
  T.__tablas.turnos_produccion = (f) => {
    // leerHayAbiertas pide solo 'id' por maquina_id; el tablero pide por unidad.
    const porMaquina = f.some(x => x[0] === 'in' && x[1] === 'maquina_id')
    return { data: porMaquina ? [{ id: 't1' }] : [], error: null }
  }
  T.estado.modo = 'masa'
  T.estado.persona = JUAN
  T.marcarAbiertas(true)
  await T.mostrarSala()
  const aviso = T.__doc.getElementById('pr-sala-aviso').innerHTML
  chk('si igual no llegan: un mensaje, nunca una lista muda', /no llegaron/.test(aviso) && /id="pr-sala-volver-intentar">Volver a intentar</.test(aviso), aviso)
  chk('… y no apaga Sala de masa (la base dice que hay)', T.salaDeshabilitada() === false)
  chk('… ni saca al masero', T.estado.persona?.id === 'e-masero')

  // Siempre vacía y la base confirma que NO hay: el aviso de siempre, también
  // con "Volver a intentar".
  const U = armar({ turnos: [] })
  U.estado.modo = 'masa'
  U.estado.persona = JUAN
  U.marcarAbiertas(true)
  await U.mostrarSala()
  const avisoU = U.__doc.getElementById('pr-sala-aviso').innerHTML
  chk('la base confirma que no hay: lo dice, con reintentar', /el encargado tiene que abrir el turno/.test(avisoU) && /Volver a intentar/.test(avisoU))
  chk('… y ahí sí se apaga', U.salaDeshabilitada() === true)

  // Sin saber si había abiertas, no se reintenta de más.
  const W = armar({ turnos: [] })
  W.estado.modo = 'masa'
  await W.mostrarSala()
  chk('sin dato de la barra: una sola lectura', W.__lecturasTurnos() === 1)

  // El error de lectura también ofrece "Volver a intentar".
  const E = armar()
  E.__tablas.maquinas = () => ({ data: null, error: { message: 'sin red' } })
  E.estado.modo = 'masa'
  await E.mostrarSala()
  chk('si falla la lectura: aviso con "Volver a intentar"', /Volver a intentar/.test(E.__doc.getElementById('pr-sala-aviso').innerHTML))

  // Turno: un pedido viejo que llega tarde no pisa al nuevo.
  let soltar
  const V = armar()
  V.estado.modo = 'masa'
  V.estado.persona = JUAN
  const lento = new Promise(r => { soltar = r })
  let primera = true
  V.__tablas.turnos_produccion = async () => {
    if (primera) { primera = false; await lento; return { data: [], error: null } }
    return { data: [turno('t1', 'm1', 7023), turno('t2', 'm2', 7024)], error: null }
  }
  const viejo = V.mostrarSala()
  await V.mostrarSala()
  soltar()
  await viejo
  chk('el pedido viejo no pisa al nuevo', (V.__doc.getElementById('pr-sala-maquinas').innerHTML.match(/data-sala-turno=/g) || []).length === 2)

  // El botón se escucha.
  chk('"Volver a intentar" vuelve a pedir', /closest\('#pr-sala-volver-intentar'\)\) mostrarSala\(\)/.test(FUENTE))
})())

// ── g) "Tocá para entrar" ────────────────────────────────────────────────
esperas.push((async () => {
  const S = armar()
  S.estado.modo = 'masa'
  S.estado.persona = null
  const barra = S.htmlBarraModos()
  chk('"Tocá para entrar" en vez de "Nadie adentro"', /Tocá para entrar/.test(barra) && !/Nadie adentro/.test(barra))
  chk('… es un botón', /<button type="button" class="pr-barra__entrar" id="pr-btn-entrar">/.test(barra))
  chk('… que abre el "¿Quién sos?" del modo activo', /closest\('#pr-btn-entrar'\)\) \{ tocar\(\); estado\.quienOtra = false; mostrarQuien\(\)/.test(FUENTE))
  // HTML malicioso en la unidad, que va al lado.
  const X = armar()
  X.estado.unidades = new Map([['u-cn', marca('unidad')]])
  X.estado.modo = 'produccion'
  X.estado.persona = null
  chequearMarcas(chk, 'barra sin nadie', X.htmlBarraModos(), ['unidad'])
  const Y = armar()
  Y.estado.unidades = new Map([['u-cn', marca('unidad')]])
  Y.estado.modo = 'masa'
  Y.estado.persona = { id: 'e', nombre: marca('persona'), puesto: 'masero' }
  chequearMarcas(chk, 'barra con alguien adentro', Y.htmlBarraModos(), ['unidad', 'persona'])
})())

// ── h) Una sola unidad no pregunta la fábrica ───────────────────────────
{
  const S = armar()
  S.estado.unidadesPosibles = ['u-cn']
  S.estado.unidadId = null
  S.estado.modo = 'produccion'
  S.siguientePaso()
  chk('sin fábrica no se pregunta: se dice', S.estado.vista === 'pr-inicio')
  // Desde el 25/09/2026 la tablet NO elige fábrica: la trae la cuenta del
  // dispositivo (mi_sesion_produccion). Ni "Cambiar de fábrica" ni "Cambiar
  // de unidad" existen en la planta.
  chk('la planta no tiene "Cambiar de fábrica" ni el menú de la tablet',
    !/pr-btn-cambiar-unidad/.test(FUENTE) && !/pr-menu-unidad/.test(FUENTE) && !/id="pr-menu"/.test(FUENTE))
  chk('el arranque toma la fábrica de la cuenta del dispositivo',
    /estado\.unidadesPosibles = \[String\(estado\.sesionPlanta\.unidad_negocio_id\)\]\s*\n\s*estado\.unidadId = estado\.unidadesPosibles\[0\]/.test(FUENTE))
}

// ── El acceso maestro no se guarda como persona de un modo ───────────────
esperas.push((async () => {
  const S = armar()
  S.estado.modo = 'produccion'
  S.sessionStorage.setItem('produccion.persona.produccion', JSON.stringify(FEDE))
  S.estado.maestro = { id: 'e-jefa', nombre: 'Marta Jefa' }
  await S.entrarComoMaestro('produccion')
  chk('el maestro entra pero no pisa al encargado guardado', /e-fede/.test(guardada(S, 'produccion') ?? '') && S.estado.persona?.id === 'e-jefa')
  S.cerrarMaestro()
  chk('cerrar el maestro no borra al encargado guardado', /e-fede/.test(guardada(S, 'produccion') ?? ''))
  chk('… y deja la tablet sin nadie', S.estado.persona === null)
})())

// ── HTML malicioso en "Masero: …" ───────────────────────────────────────
esperas.push((async () => {
  const S = armar()
  S.estado.modo = 'masa'
  S.sessionStorage.setItem('produccion.persona.masa', JSON.stringify({ id: 'e', nombre: '<img src=x onerror=alert(1)>', puesto: 'masero' }))
  await S.mostrarQuien()
  chk('el nombre fijo va por textContent (no arma HTML)', S.__doc.getElementById('pr-quien-fija-texto').innerHTML === '' &&
    /<img/.test(S.__doc.getElementById('pr-quien-fija-texto').textContent))
  chk('pintarQuienFija no usa innerHTML', !/function pintarQuienFija\(\) \{[^}]*innerHTML/.test(FUENTE))
})())

fin()
