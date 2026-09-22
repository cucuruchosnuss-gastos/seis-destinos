// B2 del módulo Producción (22/09/2026): el modo de la tablet y "¿Quién sos?".
//
// - El modo ("Producción (encargado)" / "Sala de masa (masero)") y la unidad se
//   recuerdan en localStorage; si localStorage tira, la tablet sigue andando.
// - "¿Quién sos?" muestra los encargados en modo Producción y los maseros en
//   Sala de masa, sacados de personal_produccion(p_unidad_negocio_id) y sus
//   puestos. Si la unidad no tiene a nadie con ese puesto, todo el personal
//   activo con un aviso (la base hace la misma distinción: leída con
//   pg_get_functiondef el 22/09/2026 en abrir_turnos y registrar_masa).
// - Nombres con HTML malicioso, escapados.
//
//   node pruebas/test-produccion-quien.js

const path = require('path')
const { arnes, leer, marca, chequearMarcas } = require('./circuito-comun')
const { construirProduccion } = require('./sandbox-produccion')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/produccion.html')
leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

const PERSONAL = [
  { id: 'e-fede', nombre: 'Federico Silva', misma_unidad: true, puestos: ['encargado'] },
  { id: 'e-agus', nombre: 'Agustín Barrera', misma_unidad: true, puestos: ['encargado', 'operario'] },
  { id: 'e-masero', nombre: 'Juan Masero', misma_unidad: true, puestos: ['masero'] },
  { id: 'e-op', nombre: 'Operario Uno', misma_unidad: true, puestos: ['operario'] },
  { id: 'e-nada', nombre: 'Sin Puesto', misma_unidad: false, puestos: [] },
]

function armar() {
  const S = construirProduccion(ARCHIVO)
  S.__setRpc(async (nombre) => nombre === 'personal_produccion' ? { data: PERSONAL, error: null } : { data: null, error: null })
  return S
}
const botones = (html) => [...html.matchAll(/data-persona="([^"]+)"/g)].map(m => m[1])

// ── personasParaPuesto ────────────────────────────────────────────────────
{
  const S = armar()
  const enc = S.personasParaPuesto(PERSONAL, 'encargado')
  chk('encargados: solo los que tienen el puesto', JSON.stringify(enc.personas.map(p => p.id)) === '["e-fede","e-agus"]')
  chk('… y sin aviso', enc.sinConfigurar === false)
  const mas = S.personasParaPuesto(PERSONAL, 'masero')
  chk('maseros: solo el masero', JSON.stringify(mas.personas.map(p => p.id)) === '["e-masero"]')
  const sin = S.personasParaPuesto(PERSONAL.map(p => ({ ...p, puestos: [] })), 'encargado')
  chk('sin puestos configurados: todo el personal', sin.personas.length === 5 && sin.sinConfigurar === true)
  chk('puestos null no rompe', S.personasParaPuesto([{ id: 'x', nombre: 'X', puestos: null }], 'masero').personas.length === 1)
  chk('personal null no rompe', S.personasParaPuesto(null, 'masero').personas.length === 0)
  chk('el aviso aparece solo sin configurar', S.htmlAvisoPuestos(true, 'masero').includes('maseros') && S.htmlAvisoPuestos(false, 'masero') === '')
}

// ── mostrarQuien, en los dos modos ───────────────────────────────────────
esperas.push((async () => {
  const S = armar()
  S.estado.modo = 'produccion'
  await S.mostrarQuien()
  const html = S.__doc.getElementById('pr-quien-lista').innerHTML
  chk('modo Producción: pide personal_produccion con la unidad', JSON.stringify(S.__llamadas.rpc[0]) === '["personal_produccion",{"p_unidad_negocio_id":"u-cn"}]', JSON.stringify(S.__llamadas.rpc[0]))
  chk('modo Producción: los encargados', JSON.stringify(botones(html)) === '["e-fede","e-agus"]', JSON.stringify(botones(html)))
  chk('modo Producción: sin aviso', S.__doc.getElementById('pr-quien-aviso').innerHTML === '')
  chk('la vista visible es "¿Quién sos?"', S.__doc.getElementById('pr-quien').hidden === false && S.__doc.getElementById('pr-inicio').hidden === true)

  const T = armar()
  T.estado.modo = 'masa'
  await T.mostrarQuien()
  chk('modo Sala de masa: el masero', JSON.stringify(botones(T.__doc.getElementById('pr-quien-lista').innerHTML)) === '["e-masero"]')

  const U = construirProduccion(ARCHIVO)
  U.__setRpc(async () => ({ data: PERSONAL.map(p => ({ ...p, puestos: [] })), error: null }))
  U.estado.modo = 'masa'
  await U.mostrarQuien()
  chk('sin puestos: todos, con aviso para configurarlos', botones(U.__doc.getElementById('pr-quien-lista').innerHTML).length === 5 &&
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
  W.__setRpc(async () => ({ data: [{ id: marca('id'), nombre: marca('nombre'), misma_unidad: true, puestos: ['masero'] }], error: null }))
  W.estado.modo = 'masa'
  await W.mostrarQuien()
  chequearMarcas(chk, '¿Quién sos?', W.__doc.getElementById('pr-quien-lista').innerHTML, ['id', 'nombre'])

  // HTML malicioso en el nombre y el id de la unidad.
  const X = construirProduccion(ARCHIVO)
  X.estado.unidades = new Map([[marca('unidadId'), marca('unidadNombre')]])
  X.estado.unidadesPosibles = [marca('unidadId')]
  X.mostrarElegirUnidad()
  chequearMarcas(chk, 'elegir unidad', X.__doc.getElementById('pr-unidades').innerHTML, ['unidadId', 'unidadNombre'])

  // Elegir persona: queda a la vista y aparece "Cambiar de persona".
  S.elegirPersona('e-agus')
  chk('elegir: queda la persona', S.estado.persona?.id === 'e-agus' && S.estado.persona?.nombre === 'Agustín Barrera')
  chk('… su nombre en la cabecera', S.__doc.getElementById('pr-persona-actual').textContent === 'Agustín Barrera' && S.__doc.getElementById('pr-persona-actual').hidden === false)
  chk('… y el botón "Cambiar de persona" visible', S.__doc.getElementById('pr-btn-cambiar-persona').hidden === false)
  S.elegirPersona('no-existe')
  chk('un id que no está en la lista no cambia nada', S.estado.persona?.id === 'e-agus')
  S.cambiarDePersona()
  chk('"Cambiar de persona" vuelve a preguntar', S.estado.persona === null && S.__doc.getElementById('pr-quien').hidden === false)
})())

// ── Modo y unidad recordados ──────────────────────────────────────────────
{
  const S = armar()
  chk('sin modo guardado: null', S.modoGuardado() === null)
  S.localStorage.setItem('produccion.modo', 'cualquiera')
  chk('un modo inválido no se acepta', S.modoGuardado() === null)
  S.localStorage.setItem('produccion.modo', 'toString')
  chk('una clave del prototipo no se acepta', S.modoGuardado() === null)
  S.estado.persona = { id: 'e-fede', nombre: 'F' }
  S.elegirModo('masa')
  chk('elegir modo lo guarda', S.localStorage.getItem('produccion.modo') === 'masa' && S.modoGuardado() === 'masa')
  chk('cambiar de modo borra la persona (los que responden son otros)', S.estado.persona === null)
  S.elegirModo('otro')
  chk('un modo inválido no se elige', S.estado.modo === 'masa')

  chk('una sola unidad: esa', S.unidadInicial(['u-cn'], null) === 'u-cn')
  chk('varias y la guardada es posible: la guardada', S.unidadInicial(['u-cn', 'u-dp'], 'u-dp') === 'u-dp')
  chk('varias y la guardada ya no es posible: preguntar', S.unidadInicial(['u-cn', 'u-dp'], 'u-ta') === null)
  chk('varias sin guardada: preguntar', S.unidadInicial(['u-cn', 'u-dp'], null) === null)

  S.estado.unidadesPosibles = ['u-cn', 'u-dp']
  S.estado.unidadId = null
  S.estado.modo = null
  S.siguientePaso()
  chk('sin unidad: se pide la unidad primero', S.__doc.getElementById('pr-elegir-unidad').hidden === false)
  chk('… con un botón por unidad', (S.__doc.getElementById('pr-unidades').innerHTML.match(/data-unidad=/g) || []).length === 2)
  S.elegirUnidad('u-dp')
  chk('elegir unidad la guarda', S.localStorage.getItem('produccion.unidad') === 'u-dp' && S.estado.unidadId === 'u-dp')
  S.elegirUnidad('u-ajena')
  chk('una unidad que no es posible no se elige', S.estado.unidadId === 'u-dp')

  S.estado.modo = null
  S.siguientePaso()
  chk('sin modo: se pide el modo', S.__doc.getElementById('pr-elegir-modo').hidden === false)

  S.estado.modo = 'produccion'; S.estado.persona = { id: 'e-fede', nombre: 'F' }
  S.accionDelMenu('modo')
  chk('menú → cambiar el modo: olvida modo y persona', S.estado.modo === null && S.estado.persona === null && S.localStorage.getItem('produccion.modo') === null)

  // localStorage que tira: no rompe.
  const T = armar()
  T.localStorage.getItem = () => { throw new Error('bloqueado') }
  T.localStorage.setItem = () => { throw new Error('bloqueado') }
  chk('localStorage bloqueado: leer da null', T.leerPreferencia('produccion.modo') === null)
  let tiro = false
  try { T.guardarPreferencia('produccion.modo', 'masa') } catch { tiro = true }
  chk('localStorage bloqueado: guardar no tira', !tiro)

  // Unidades de carga: las que tienen máquinas activas.
  esperas.push((async () => {
    const U = armar()
    U.estado.misTareas = new Map([['cargar', { unidades: ['u-cn', 'u-dp'] }]])
    U.__tablas.maquinas = [{ unidad_negocio_id: 'u-cn' }, { unidad_negocio_id: 'u-cn' }]
    chk('unidades de carga: solo las que tienen máquinas', JSON.stringify(await U.unidadesDeCarga()) === '["u-cn"]')
    U.__tablas.maquinas = []
    chk('ninguna con máquinas: todas las de carga', JSON.stringify(await U.unidadesDeCarga()) === '["u-cn","u-dp"]')
  })())
}

fin()
