// Parte 1 del rediseño de Producción (22/09/2026): la barra de modos y
// "¿Quién sos?" con PIN.
//
// - La BARRA DE MODOS reemplazó a la pantalla "¿Para qué se usa esta tablet?".
//   SALA DE MASA está deshabilitada —con borde punteado y la leyenda— mientras
//   no haya ninguna máquina abierta en la unidad, y se habilita sola al abrir
//   la primera. Si todavía NO SE PUDO SABER, queda habilitada: negarla sin
//   haberlo medido sería afirmar algo que no sabemos.
// - "¿Quién sos?" muestra a quien tenga ESE puesto, fijo o temporal (con la
//   etiqueta "hoy" en los temporales), con la MISMA regla que la base:
//   unidad_restringe_puesto() mira los puestos FIJOS de la unidad y
//   tiene_puesto_produccion() acepta fijo o temporal vigente (las dos leídas
//   con pg_get_functiondef el 22/09/2026).
// - Elegir un nombre NO entra: abre el PIN.
// - Nombres con HTML malicioso, escapados.
//
//   node pruebas/test-produccion-quien.js

const path = require('path')
const { arnes, leer, marca, chequearMarcas } = require('./circuito-comun')
const { construirProduccion } = require('./sandbox-produccion')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/produccion.html')
const FUENTE = leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

const PERSONAL = [
  { id: 'e-fede', nombre: 'Federico Silva', misma_unidad: true, puestos: ['encargado'], puestos_temporales: [], es_maestro: false },
  { id: 'e-agus', nombre: 'Agustín Barrera', misma_unidad: true, puestos: ['encargado', 'operario'], puestos_temporales: [], es_maestro: false },
  // Tiene el puesto FIJO y además uno temporal vigente: sigue sin ser "de hoy".
  { id: 'e-masero', nombre: 'Juan Masero', misma_unidad: true, puestos: ['masero'], puestos_temporales: ['masero'], es_maestro: false },
  { id: 'e-hoy', nombre: 'Carla Ríos', misma_unidad: true, puestos: [], puestos_temporales: ['masero'], es_maestro: false },
  { id: 'e-op', nombre: 'Operario Uno', misma_unidad: true, puestos: ['operario'], puestos_temporales: [], es_maestro: false },
  { id: 'e-nada', nombre: 'Sin Puesto', misma_unidad: false, puestos: [], puestos_temporales: [], es_maestro: false },
]

function armar() {
  const S = construirProduccion(ARCHIVO)
  S.__setRpc(async (nombre) => nombre === 'personal_produccion' ? { data: PERSONAL, error: null } : { data: null, error: null })
  return S
}
const botones = (html) => [...html.matchAll(/data-persona="([^"]+)"/g)].map(m => m[1])

// ── personasParaPuesto: fijo o temporal, con la regla de la base ──────────
{
  const S = armar()
  const enc = S.personasParaPuesto(PERSONAL, 'encargado')
  chk('encargados: solo los que tienen el puesto', JSON.stringify(enc.personas.map(p => p.id)) === '["e-fede","e-agus"]')
  chk('… y sin aviso', enc.sinConfigurar === false)

  const mas = S.personasParaPuesto(PERSONAL, 'masero')
  chk('maseros: el fijo Y el temporal', JSON.stringify(mas.personas.map(p => p.id)) === '["e-masero","e-hoy"]', JSON.stringify(mas.personas.map(p => p.id)))
  chk('el temporal se marca como temporal', S.esTemporal(PERSONAL[3], 'masero') === true)
  chk('el fijo NO se marca como temporal', S.esTemporal(PERSONAL[2], 'masero') === false)
  chk('tienePuesto acepta fijo', S.tienePuesto(PERSONAL[2], 'masero') === true)
  chk('tienePuesto acepta temporal', S.tienePuesto(PERSONAL[3], 'masero') === true)
  chk('tienePuesto rechaza al que no lo tiene', S.tienePuesto(PERSONAL[4], 'masero') === false)

  // Lo que restringe es el puesto FIJO: con SOLO un temporal la unidad no
  // restringe nada y aparece todo el personal, igual que en la base.
  const soloTemp = PERSONAL.map(p => ({ ...p, puestos: p.puestos.filter(x => x !== 'masero') }))
  const st = S.personasParaPuesto(soloTemp, 'masero')
  chk('con el puesto SOLO temporal la unidad no restringe: todos', st.personas.length === 6 && st.sinConfigurar === true)

  const sin = S.personasParaPuesto(PERSONAL.map(p => ({ ...p, puestos: [], puestos_temporales: [] })), 'encargado')
  chk('sin puestos configurados: todo el personal', sin.personas.length === 6 && sin.sinConfigurar === true)
  chk('puestos null no rompe', S.personasParaPuesto([{ id: 'x', nombre: 'X', puestos: null }], 'masero').personas.length === 1)
  chk('personal null no rompe', S.personasParaPuesto(null, 'masero').personas.length === 0)
  chk('el aviso aparece solo sin configurar', S.htmlAvisoPuestos(true, 'masero').includes('maseros') && S.htmlAvisoPuestos(false, 'masero') === '')
}

// ── El buscador de nombres ────────────────────────────────────────────────
{
  const S = armar()
  chk('sin búsqueda: todos', S.personasFiltradas(PERSONAL, '').length === 6)
  chk('busca desde la primera letra', S.personasFiltradas(PERSONAL, 'f').map(p => p.id).join() === 'e-fede')
  chk('ignora acentos en los dos lados', S.personasFiltradas(PERSONAL, 'agustin').map(p => p.id).join() === 'e-agus')
  chk('ignora mayúsculas', S.personasFiltradas(PERSONAL, 'CARLA').map(p => p.id).join() === 'e-hoy')
  chk('lo que no coincide no aparece', S.personasFiltradas(PERSONAL, 'zzz').length === 0)
}

// ── LA BARRA DE MODOS ─────────────────────────────────────────────────────
{
  const S = armar()
  S.estado.modo = 'produccion'

  // Sin saber todavía si hay máquinas abiertas: NO se deshabilita.
  S.estado.abiertasConocido = false
  S.estado.hayTurnoAbierto = false
  chk('sin haberlo medido, SALA DE MASA no se deshabilita', S.salaDeshabilitada() === false)
  chk('… y el botón no dice que falta abrir el turno', !/El encargado tiene que abrir el turno/.test(S.htmlBarraModos()))

  // Medido y sin ninguna abierta: deshabilitada, con la leyenda.
  S.estado.abiertasConocido = true
  chk('sin máquinas abiertas: SALA DE MASA deshabilitada', S.salaDeshabilitada() === true)
  const off = S.htmlBarraModos()
  chk('… el botón va disabled', /data-modo="masa"[^>]*disabled/.test(off), off)
  chk('… con la leyenda adentro del mismo botón', /El encargado tiene que abrir el turno/.test(off))
  chk('… y PRODUCCIÓN sigue habilitada', /data-modo="produccion"[^>]*>PRODUCCIÓN/.test(off) && !/data-modo="produccion"[^>]*disabled/.test(off))

  // Con una abierta: se habilita sola.
  S.marcarAbiertas(true)
  chk('con una máquina abierta se habilita', S.salaDeshabilitada() === false)
  const on = S.htmlBarraModos()
  chk('… sin disabled', !/data-modo="masa"[^>]*disabled/.test(on))
  chk('… y sin la leyenda', !/El encargado tiene que abrir el turno/.test(on))
  // En un sandbox NUEVO: si el dato ya viniera puesto, esta assertion no
  // estaría mirando lo que marcarAbiertas() hace.
  const N = armar()
  chk('marcarAbiertas arranca sin saber', N.estado.abiertasConocido === false)
  N.marcarAbiertas(true)
  chk('marcarAbiertas deja el dato como conocido', N.estado.abiertasConocido === true && N.estado.hayTurnoAbierto === true)

  // El modo activo se marca con aria-pressed, no solo con color.
  chk('PRODUCCIÓN activo: aria-pressed true', /data-modo="produccion" aria-pressed="true"/.test(on))
  chk('SALA DE MASA apagado: aria-pressed false', /data-modo="masa" aria-pressed="false"/.test(on))
  S.estado.modo = 'masa'
  chk('cambia el marcado con el modo', /data-modo="masa" aria-pressed="true"/.test(S.htmlBarraModos()))

  // Sin nadie adentro no hay Salir: hay una invitación a entrar, tocable
  // (terminar la tablet, parte 2: "Nadie adentro" no invitaba a nada).
  S.estado.persona = null
  chk('sin nadie adentro: "Tocá para entrar", tocable, y sin Salir',
    /<button type="button" class="pr-barra__entrar" id="pr-btn-entrar">Tocá para entrar<\/button>/.test(S.htmlBarraModos()) &&
    !/Nadie adentro/.test(S.htmlBarraModos()) && !/pr-btn-salir/.test(S.htmlBarraModos()))
  S.estado.persona = { id: 'e-masero', nombre: 'Juan Masero', puesto: 'masero' }
  const conNadie = S.htmlBarraModos()
  chk('con alguien adentro: el rol y el nombre', /Masero:/.test(conNadie) && /Juan Masero/.test(conNadie))
  chk('… la unidad debajo', /Cucuruchos Nuss/.test(conNadie))
  chk('… y el botón Salir', /id="pr-btn-salir"/.test(conNadie))
  S.estado.modo = 'produccion'
  chk('el rol sale del modo', /Encargado:/.test(S.htmlBarraModos()))
}

// ── El fondo de toda la pantalla cambia con el modo ───────────────────────
{
  const S = armar()
  S.estado.modo = 'produccion'
  S.estado.vista = 'pr-quien'
  S.pintarBarra()
  chk('modo Producción: el body toma su clase',
    S.__body.classList.contains('pr-modo-produccion') && !S.__body.classList.contains('pr-modo-masa'))
  S.estado.modo = 'masa'
  S.pintarBarra()
  chk('modo Sala de masa: el body toma la otra',
    S.__body.classList.contains('pr-modo-masa') && !S.__body.classList.contains('pr-modo-produccion'))
  chk('la barra se ve en la tablet', S.__doc.getElementById('pr-barra').hidden === false)
  // Las pantallas de oficina se fueron a la gestión (25/09/2026). En la
  // planta, sin fábrica no hay tablet: ni barra ni color de modo.
  S.estado.unidadId = null
  S.pintarBarra()
  chk('sin fábrica no hay barra ni color de modo',
    S.__doc.getElementById('pr-barra').hidden === true &&
    !S.__body.classList.contains('pr-modo-masa') && !S.__body.classList.contains('pr-modo-produccion'))

  // Los dos colores de modo viven como variables del módulo, no como hex sueltos.
  const css = FUENTE.slice(FUENTE.indexOf('<style>'), FUENTE.indexOf('</style>'))
  chk('los colores de modo son variables del body', /--pr-prod-activo:\s*#3F4655/.test(css) && /--pr-masa-activo:\s*#F3D774/.test(css))
  chk('el fondo de pantalla de cada modo es una variable', /--pr-prod-fondo:\s*#E4E7EC/.test(css) && /--pr-masa-fondo:\s*#FBF4D9/.test(css))
  chk('el fondo del body cambia con la clase de modo',
    /body\.pr-modo-produccion\s*\{\s*background-color: var\(--pr-prod-fondo\)/.test(css) &&
    /body\.pr-modo-masa\s*\{\s*background-color: var\(--pr-masa-fondo\)/.test(css))
  chk('el deshabilitado va PUNTEADO, no solo de otro color', /\.pr-modo:disabled\s*\{[^}]*dashed var\(--pr-off-borde\)/.test(css))
  chk('donde el hex ya tiene nombre se usa la variable de main.css',
    /--pr-prod-letra:\s*var\(--color-fondo\)/.test(css) && !/#FDEEE4/.test(css) && !/#7A2E42/.test(css))
}

// ── Tocar un modo pide el PIN ─────────────────────────────────────────────
esperas.push((async () => {
  const S = armar()
  S.estado.modo = 'produccion'
  S.estado.persona = { id: 'e-fede', nombre: 'Federico Silva', puesto: 'encargado' }
  S.marcarAbiertas(true)
  await S.tocarModo('masa')
  chk('tocar el modo apagado cambia de modo', S.estado.modo === 'masa')
  chk('… y echa a quien estaba adentro', S.estado.persona === null)
  chk('… lleva a "¿Quién sos?"', S.__doc.getElementById('pr-quien').hidden === false)
  chk('… con los maseros', JSON.stringify(botones(S.__doc.getElementById('pr-quien-lista').innerHTML)) === '["e-masero","e-hoy"]')
  chk('… y guarda el modo', S.localStorage.getItem('produccion.modo') === 'masa')

  // El modo activo con alguien adentro no hace nada.
  S.estado.persona = { id: 'e-masero', nombre: 'Juan Masero', puesto: 'masero' }
  const antes = S.__llamadas.rpc.length
  await S.tocarModo('masa')
  chk('tocar el modo ACTIVO no echa a nadie', S.estado.persona?.id === 'e-masero' && S.__llamadas.rpc.length === antes)

  // Deshabilitada: tocarla no hace nada.
  const T = armar()
  T.estado.modo = 'produccion'
  T.marcarAbiertas(false)
  await T.tocarModo('masa')
  chk('SALA DE MASA deshabilitada no se puede tocar', T.estado.modo === 'produccion')

  const U = armar()
  U.estado.modo = 'produccion'
  await U.tocarModo('inventado')
  chk('un modo que no existe no se elige', U.estado.modo === 'produccion')
})())

// ── mostrarQuien y elegir un nombre ───────────────────────────────────────
esperas.push((async () => {
  const S = armar()
  S.estado.modo = 'produccion'
  await S.mostrarQuien()
  const html = S.__doc.getElementById('pr-quien-lista').innerHTML
  chk('pide personal_produccion con la unidad', JSON.stringify(S.__llamadas.rpc[0]) === '["personal_produccion",{"p_unidad_negocio_id":"u-cn"}]', JSON.stringify(S.__llamadas.rpc[0]))
  chk('modo Producción: los encargados', JSON.stringify(botones(html)) === '["e-fede","e-agus"]', JSON.stringify(botones(html)))
  chk('modo Producción: sin aviso', S.__doc.getElementById('pr-quien-aviso').innerHTML === '')
  chk('la vista visible es "¿Quién sos?"', S.__doc.getElementById('pr-quien').hidden === false && S.__doc.getElementById('pr-inicio').hidden === true)
  chk('el panel del PIN arranca escondido', S.__doc.getElementById('pr-pin').hidden === true)

  const T = armar()
  T.estado.modo = 'masa'
  await T.mostrarQuien()
  const htmlMasa = T.__doc.getElementById('pr-quien-lista').innerHTML
  chk('modo Sala de masa: el masero fijo y el de hoy', JSON.stringify(botones(htmlMasa)) === '["e-masero","e-hoy"]')
  chk('… el temporal lleva la etiqueta "hoy"', /Carla Ríos<span class="pr-quien__hoy">hoy<\/span>/.test(htmlMasa), htmlMasa)
  chk('… y el fijo no la lleva', /Juan Masero<\/span>/.test(htmlMasa))

  // El buscador filtra sin volver a pedir nada.
  const pedidos = T.__llamadas.rpc.length
  T.estado.quienBusqueda = 'carla'
  T.pintarQuien()
  chk('el buscador filtra la lista', JSON.stringify(botones(T.__doc.getElementById('pr-quien-lista').innerHTML)) === '["e-hoy"]')
  chk('… sin volver a consultar', T.__llamadas.rpc.length === pedidos)
  T.estado.quienBusqueda = 'zzz'
  T.pintarQuien()
  chk('sin coincidencias lo dice, y no dice que no hay personal',
    /Ningún nombre coincide/.test(T.__doc.getElementById('pr-quien-lista').innerHTML))

  const U = construirProduccion(ARCHIVO)
  U.__setRpc(async () => ({ data: PERSONAL.map(p => ({ ...p, puestos: [], puestos_temporales: [] })), error: null }))
  U.estado.modo = 'masa'
  await U.mostrarQuien()
  chk('sin puestos: todos, con aviso para configurarlos', botones(U.__doc.getElementById('pr-quien-lista').innerHTML).length === 6 &&
    /Configuración → Personal/.test(U.__doc.getElementById('pr-quien-aviso').innerHTML))
  chk('… la persona de otra unidad lo dice', /De otra unidad/.test(U.__doc.getElementById('pr-quien-lista').innerHTML))

  const V = construirProduccion(ARCHIVO)
  V.__setRpc(async () => ({ data: null, error: { message: 'sin red' } }))
  V.estado.modo = 'masa'
  await V.mostrarQuien()
  chk('si falla: aviso y botón de reintentar, sin lista vieja', /Reintentar/.test(V.__doc.getElementById('pr-quien-lista').innerHTML) &&
    !/data-persona/.test(V.__doc.getElementById('pr-quien-lista').innerHTML))

  // HTML malicioso en el nombre y en el id.
  const W = construirProduccion(ARCHIVO)
  W.__setRpc(async () => ({ data: [{ id: marca('id'), nombre: marca('nombre'), misma_unidad: true, puestos: ['masero'], puestos_temporales: [] }], error: null }))
  W.estado.modo = 'masa'
  await W.mostrarQuien()
  chequearMarcas(chk, '¿Quién sos?', W.__doc.getElementById('pr-quien-lista').innerHTML, ['id', 'nombre'])

  // HTML malicioso en el nombre de la unidad, que va a la barra.
  const X = construirProduccion(ARCHIVO)
  X.estado.unidades = new Map([['u-cn', marca('unidadNombre')]])
  X.estado.modo = 'produccion'
  X.estado.persona = { id: 'e', nombre: marca('personaNombre'), puesto: 'encargado' }
  chequearMarcas(chk, 'barra de modos', X.htmlBarraModos(), ['unidadNombre', 'personaNombre'])

  // "¿En qué fábrica está esta tablet?" no existe más (25/09/2026): la cuenta
  // del dispositivo trae SU fábrica.
  chk('la planta no tiene la pantalla de elegir fábrica', !/id="pr-elegir-unidad"/.test(FUENTE) && !/data-unidad=/.test(FUENTE))

  // ELEGIR UN NOMBRE NO ENTRA: abre el PIN.
  S.elegirPersona('e-agus')
  chk('elegir un nombre NO deja a nadie adentro', S.estado.persona === null)
  chk('… abre el panel del PIN de esa persona', S.estado.pin?.personaId === 'e-agus' && S.__doc.getElementById('pr-pin').hidden === false)
  chk('… con el puesto del modo', S.estado.pin?.puesto === 'encargado')
  chk('… y el nombre queda marcado en la lista', /data-persona="e-agus" aria-pressed="true"/.test(S.__doc.getElementById('pr-quien-lista').innerHTML))
  S.elegirPersona('no-existe')
  chk('un id que no está en la lista no cambia nada', S.estado.pin?.personaId === 'e-agus')
})())

// ── Modo y unidad recordados ──────────────────────────────────────────────
{
  const S = armar()
  chk('sin modo guardado: null', S.modoGuardado() === null)
  S.localStorage.setItem('produccion.modo', 'cualquiera')
  chk('un modo inválido no se acepta', S.modoGuardado() === null)
  S.localStorage.setItem('produccion.modo', 'toString')
  chk('una clave del prototipo no se acepta', S.modoGuardado() === null)

  // La fábrica la trae la cuenta del dispositivo: sin ella no se pregunta
  // nada, se dice.
  S.estado.unidadesPosibles = []
  S.estado.unidadId = null
  S.estado.modo = null
  S.siguientePaso()
  chk('sin fábrica: se dice, sin pantalla de elegir', S.estado.vista === 'pr-inicio' &&
    /no tiene una fábrica asignada/.test(S.__doc.getElementById('pr-inicio-texto').textContent))

  // SIN pantalla de modo: una tablet sin modo guardado arranca en Producción.
  const T = armar()
  T.estado.modo = null
  T.estado.persona = null
  T.siguientePaso()
  chk('sin modo guardado arranca en Producción', T.estado.modo === 'produccion')
  chk('… y va derecho a "¿Quién sos?"', T.__doc.getElementById('pr-quien').hidden === false)

  // localStorage que tira: no rompe.
  const U = armar()
  U.localStorage.getItem = () => { throw new Error('bloqueado') }
  U.localStorage.setItem = () => { throw new Error('bloqueado') }
  chk('localStorage bloqueado: leer da null', U.leerPreferencia('produccion.modo') === null)
  let tiro = false
  try { U.guardarPreferencia('produccion.modo', 'masa') } catch { tiro = true }
  chk('localStorage bloqueado: guardar no tira', !tiro)

  // sessionStorage que tira: tampoco.
  const V = armar()
  V.sessionStorage.getItem = () => { throw new Error('bloqueado') }
  V.sessionStorage.setItem = () => { throw new Error('bloqueado') }
  chk('sessionStorage bloqueado: leer da null', V.leerSesion('produccion.persona') === null)
  let tiro2 = false
  try { V.guardarSesion('produccion.persona', '{}') } catch { tiro2 = true }
  chk('sessionStorage bloqueado: guardar no tira', !tiro2)

  // Unidades de carga: ya no existen (25/09/2026). La tablet está en UNA
  // fábrica, la de su cuenta de dispositivo.
  chk('no queda unidadesDeCarga en la planta', !/function unidadesDeCarga/.test(FUENTE))
}

// ── Quién queda adentro: en sessionStorage, y atado a SU puesto ───────────
esperas.push((async () => {
  const S = armar()
  S.estado.modo = 'produccion'
  S.__setRpc(async () => ({ data: [], error: null }))
  await S.entrar({ id: 'e-fede', nombre: 'Federico Silva', puesto: 'encargado' })
  chk('entrar deja a la persona adentro', S.estado.persona?.id === 'e-fede')
  chk('… y la guarda en sessionStorage, en la clave de SU modo', /e-fede/.test(S.sessionStorage.getItem('produccion.persona.produccion') ?? '') &&
    S.sessionStorage.getItem('produccion.persona.masa') === null)
  chk('… NO en localStorage', !JSON.stringify([...S.__ls]).includes('e-fede'))
  chk('la guardada vuelve para SU modo', S.personaGuardada('produccion')?.id === 'e-fede')
  chk('… y NO para el otro modo: el puesto es lo que la base valida', S.personaGuardada('masa') === null)
  S.__ss.set('produccion.persona.produccion', 'no es json')
  chk('un sessionStorage corrupto no rompe', S.personaGuardada('produccion') === null)
  // JSON VÁLIDO pero con otra forma: acá el try/catch no ataja nada, la forma
  // tiene que validarse. Es el caso que separa las dos defensas.
  S.__ss.set('produccion.persona.produccion', '{"id":123,"puesto":"encargado"}')
  chk('un id que no es texto no se acepta', S.personaGuardada('produccion') === null)
  S.__ss.set('produccion.persona.produccion', '"encargado"')
  chk('un JSON que no es un objeto tampoco', S.personaGuardada('produccion') === null)
  // Cada modo tiene su clave, y el puesto se sigue validando: un encargado
  // escrito en la clave de Sala de masa no entra como masero.
  S.__ss.set('produccion.persona.masa', '{"id":"e-fede","nombre":"Federico Silva","puesto":"encargado"}')
  chk('una persona con el puesto de OTRO modo no se acepta', S.personaGuardada('masa') === null)

  await S.salir()
  chk('Salir deja la tablet sin nadie', S.estado.persona === null)
  chk('… lo borra de sessionStorage', S.sessionStorage.getItem('produccion.persona.produccion') === null)
  chk('… y vuelve a preguntar', S.__doc.getElementById('pr-quien').hidden === false)
})())

// ── Se cierra sola por inactividad: Producción sí, Sala de masa NO ───────
esperas.push((async () => {
  const S = armar()
  chk('el corte son 15 minutos', S.MINUTOS_INACTIVIDAD === 15)
  chk('recién tocada no vence', S.vencioPorInactividad(Date.now()) === false)
  chk('a los 14 minutos no vence', S.vencioPorInactividad(1000000, 1000000 + 14 * 60000) === false)
  chk('a los 15 vence', S.vencioPorInactividad(1000000, 1000000 + 15 * 60000) === true)
  chk('sin ningún toque registrado no vence', S.vencioPorInactividad(null) === false)

  S.estado.modo = 'produccion'
  S.estado.persona = { id: 'e-fede', nombre: 'F', puesto: 'encargado' }
  S.estado.ultimoToque = 1000
  chk('Producción se cierra sola', S.revisarInactividad(1000 + 16 * 60000) === true)
  chk('… y echa a la persona', S.estado.persona === null)

  const T = armar()
  T.estado.modo = 'masa'
  T.estado.persona = { id: 'e-masero', nombre: 'J', puesto: 'masero' }
  T.estado.ultimoToque = 1000
  chk('Sala de masa NO se cierra sola', T.revisarInactividad(1000 + 60 * 60000) === false)
  chk('… la persona sigue adentro', T.estado.persona?.id === 'e-masero')

  // El maestro sí se cierra, esté en el modo que esté.
  const U = armar()
  U.estado.modo = 'masa'
  U.estado.maestro = { id: 'e-jefe', nombre: 'Jefa' }
  U.estado.persona = { id: 'e-jefe', nombre: 'Jefa', puesto: 'masero' }
  U.estado.ultimoToque = 1000
  chk('el acceso maestro se cierra a los 15 minutos', U.revisarInactividad(1000 + 16 * 60000) === true)
  chk('… y deja de estar activo', U.estado.maestro === null)
})())

// ── Lo que queda escrito en el archivo ────────────────────────────────────
{
  chk('la barra tiene los DOS modos como botones', /data-modo="produccion"/.test(FUENTE) && /data-modo="masa"/.test(FUENTE))
  chk('ya no hay pantalla de "¿Para qué se usa esta tablet?"', !/pr-elegir-modo/.test(FUENTE))
  chk('ya no hay "Cambiar el modo de esta tablet"', !/Cambiar el modo de esta tablet/.test(FUENTE))
  chk('ya no hay "‹ Volver" a la cabecera', !/pr-volver-dashboard/.test(FUENTE))
  chk('leerHayAbiertas mira los turnos abiertos de la unidad',
    /\.from\('turnos_produccion'\)\s*\n?\s*\.select\('id'\)\.eq\('estado', 'abierto'\)\.in\('maquina_id', ids\)/.test(FUENTE))
}

fin()
