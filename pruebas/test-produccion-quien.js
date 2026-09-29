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

// ── LA BARRA LATERAL Y EL BOTÓN AL OTRO MODO (la planta con dos modos) ────
{
  const S = armar()
  S.estado.modo = 'produccion'
  S.estado.persona = { id: 'e-fede', nombre: 'Federico Silva', puesto: 'encargado' }

  // Sin saber todavía si hay máquinas abiertas: NO se deshabilita.
  S.estado.abiertasConocido = false
  S.estado.hayTurnoAbierto = false
  chk('sin haberlo medido, SALA DE MASA no se deshabilita', S.salaDeshabilitada() === false)
  const sinMedir = S.htmlBotonOtroModo()
  chk('… y el botón no va apagado', !/disabled/.test(sinMedir) && !/sin máquinas abiertas/.test(sinMedir), sinMedir)

  // Medido y sin ninguna abierta: apagado, con la leyenda adentro.
  S.estado.abiertasConocido = true
  chk('sin máquinas abiertas: SALA DE MASA deshabilitada', S.salaDeshabilitada() === true)
  const off = S.htmlBotonOtroModo()
  chk('… el botón al otro modo va disabled', /data-modo="masa" disabled/.test(off), off)
  chk('… con la leyenda adentro del mismo botón', /<span class="pr-lat__otro-nota">sin máquinas abiertas<\/span>/.test(off))

  // Con una abierta: se habilita sola.
  S.marcarAbiertas(true)
  chk('con una máquina abierta se habilita', S.salaDeshabilitada() === false)
  const on = S.htmlBotonOtroModo()
  chk('… sin disabled', !/disabled/.test(on))
  chk('… lleva a Sala de masa y dice que pide el PIN del masero', /Ir a Sala de masa/.test(on) && /PIN del masero/.test(on))
  chk('… con el tono de SALA DE MASA (el modo al que lleva)', /pr-lat__otro--masa/.test(on))
  // En un sandbox NUEVO: si el dato ya viniera puesto, esta assertion no
  // estaría mirando lo que marcarAbiertas() hace.
  const N = armar()
  chk('marcarAbiertas arranca sin saber', N.estado.abiertasConocido === false)
  N.marcarAbiertas(true)
  chk('marcarAbiertas deja el dato como conocido', N.estado.abiertasConocido === true && N.estado.hayTurnoAbierto === true)

  // El modo en el que se está NO se repite: el botón lleva adonde no estás.
  chk('en Producción hay UN solo botón de modo y es el de Sala de masa',
    (on.match(/data-modo=/g) || []).length === 1 && /data-modo="masa"/.test(on))
  S.estado.modo = 'masa'
  const aProd = S.htmlBotonOtroModo()
  chk('en Sala de masa lleva a Producción, con su tono y el PIN del encargado',
    /data-modo="produccion"/.test(aProd) && /pr-lat__otro--produccion/.test(aProd) && /Ir a Producción/.test(aProd) && /PIN del encargado/.test(aProd))
  chk('… y nunca va apagado (Producción no depende de las máquinas)', !/disabled/.test(aProd))

  // Quién está adentro, con su puesto y la unidad, y los dos botones del pie.
  S.estado.persona = { id: 'e-masero', nombre: 'Juan Masero', puesto: 'masero' }
  const lat = S.htmlLateral()
  chk('la barra dice el modo y quién está', /Sala de masa/.test(lat) && /Juan Masero/.test(lat))
  // Planta v2: la unidad ya no va en la barra (va en la cabecera).
  chk('… y el puesto', /<span class="pr-lat__puesto">Masero<\/span>/.test(lat), lat)
  chk('… "Cambiar de persona" y "Salir"', /id="pr-lat-cambiar"/.test(lat) && /id="pr-btn-salir"/.test(lat))
  S.estado.modo = 'produccion'
  S.estado.persona = { id: 'e-fede', nombre: 'Federico Silva', puesto: 'encargado' }
  chk('el puesto sale del modo', /<span class="pr-lat__puesto">Encargado<\/span>/.test(S.htmlLateral()))

  // Si la persona tiene TAMBIÉN el puesto del otro modo, pasa sin PIN.
  S.estado.personal = [{ id: 'e-fede', nombre: 'Federico Silva', puestos: ['encargado', 'masero'], puestos_temporales: [] }]
  chk('el encargado que también es masero pasa sin PIN', S.puedeCambiarSinPin('masa') === true &&
    /sin volver a poner el PIN/.test(S.htmlBotonOtroModo()))
  S.estado.personal = [{ id: 'e-fede', nombre: 'Federico Silva', puestos: ['encargado'], puestos_temporales: [] }]
  chk('… y el que no, pone el PIN del masero', S.puedeCambiarSinPin('masa') === false)
  S.estado.personal = []
  chk('… sin saber sus puestos, tampoco se saltea el PIN', S.puedeCambiarSinPin('masa') === false)
}

// ── Las secciones de Producción ───────────────────────────────────────────
{
  const S = armar()
  S.estado.modo = 'produccion'
  S.estado.persona = { id: 'e-fede', nombre: 'Federico Silva', puesto: 'encargado' }
  S.estado.vista = 'pr-produccion'
  const sinMaq = S.htmlLatSecciones()
  // Planta v2: "Lo producido" pasó a ser la "Planilla" (resumen + lo producido).
  chk('las cinco secciones, en orden', /Inicio[\s\S]*Abrir turno[\s\S]*Planilla[\s\S]*Paradas[\s\S]*Cerrar planilla/.test(sinMaq))
  chk('Inicio marcada en el tablero', /data-seccion="inicio" aria-current="page"/.test(sinMaq))
  chk('sin máquina elegida las tres de máquina van apagadas',
    /data-seccion="planilla" disabled/.test(sinMaq) && /data-seccion="paradas" disabled/.test(sinMaq) && /data-seccion="cierre" disabled/.test(sinMaq))
  chk('… y Abrir turno no', !/data-seccion="abrir"[^>]*disabled/.test(sinMaq))
  // Planta v2: htmlLatMaquina se fue; la máquina elegida va en la cabecera
  // de la pantalla (cabeceraDeVista, "Lote 7033 · Máquina 1").
  S.estado.vista = 'pr-planilla'
  chk('sin máquina elegida la cabecera no inventa un lote', S.cabeceraDeVista()?.ctx === '', JSON.stringify(S.cabeceraDeVista()))
  S.estado.planilla = { turno: { id: 't1', lote: 7033, turno: 'Mañana' }, maquinaNombre: 'Máquina 1', paradas: [] }
  S.estado.vista = 'pr-planilla'
  const conMaq = S.htmlLatSecciones()
  chk('con máquina, las de máquina se prenden', !/disabled/.test(conMaq))
  chk('la planilla marca Planilla', /data-seccion="planilla" aria-current="page"/.test(conMaq))
  S.estado.vista = 'pr-paradas'
  chk('la pantalla de paradas marca Paradas', /data-seccion="paradas" aria-current="page"/.test(S.htmlLatSecciones()))
  S.estado.vista = 'pr-planilla'
  chk('la máquina elegida con su lote, en la cabecera', S.cabeceraDeVista()?.ctx === 'Lote 7033 · Máquina 1', JSON.stringify(S.cabeceraDeVista()))
  S.estado.planilla.paradas = [{ id: 'p', inicio: '2026-09-28T10:00:00Z', fin: null, motivo: 'x' }]
  chk('parada: Paradas dice "en curso", en bordó',
    /<span class="pr-lat__sub pr-lat__sub--mal">en curso<\/span>/.test(S.htmlLatSecciones()))
}

// ── Sala de masa: las máquinas abiertas en la barra ───────────────────────
{
  const S = armar()
  S.estado.modo = 'masa'
  S.estado.vista = 'pr-sala'
  S.estado.tablero = [
    { maquina: { id: 'm1', nombre: 'Máquina 1' }, turno: { id: 't1', lote: 7033 }, masas: 4, parada: null },
    { maquina: { id: 'm2', nombre: 'Máquina 2' }, turno: { id: 't2', lote: 7034 }, masas: 1, parada: { id: 'p' } },
    { maquina: { id: 'm3', nombre: 'Máquina 3' }, turno: null, masas: 0, parada: null },
  ]
  const sala = S.htmlLatSala()
  chk('Inicio primero, marcado en el inicio de la sala', /data-seccion="sala-inicio" aria-current="page"/.test(sala))
  chk('una fila por máquina ABIERTA', /data-lateral-turno="t1"/.test(sala) && /data-lateral-turno="t2"/.test(sala) && !/Máquina 3/.test(sala))
  chk('con su lote y cuántas masas lleva', /Lote 7033/.test(sala) && /aria-label="4 masas">4</.test(sala))
  chk('la parada dice "Parada" en vez del lote', /pr-lat__item--parada" data-lateral-turno="t2"/.test(sala) &&
    /<span class="pr-lat__sub pr-lat__sub--mal">Parada<\/span>/.test(sala) && !/Lote 7034/.test(sala), sala)
  S.estado.vista = 'pr-receta'
  S.estado.salaTurno = { id: 't1' }
  chk('la máquina con la que se trabaja queda marcada', /data-lateral-turno="t1" aria-current="true"/.test(S.htmlLatSala()))
  S.estado.tablero = []
  chk('sin máquinas abiertas lo dice', /Sin máquinas abiertas/.test(S.htmlLatSala()))
}

// ── La banda de "¿Quién sos?" ─────────────────────────────────────────────
{
  const S = armar()
  S.estado.modo = 'produccion'
  S.estado.abiertasConocido = true
  S.estado.hayTurnoAbierto = true
  const b = S.htmlBandaQuien()
  chk('Producción: la banda grafito con su nombre', /pr-banda-modo--produccion/.test(b) && /<span class="pr-banda-modo__nombre">Producción<\/span>/.test(b), b)
  chk('… y "Ir a Sala de masa" (el masero no necesita al encargado)', /id="pr-quien-ir-masa"/.test(b) && !/id="pr-quien-ir-masa" disabled/.test(b))
  S.estado.hayTurnoAbierto = false
  chk('sin máquinas abiertas, "Ir a Sala de masa" va apagado con la leyenda',
    /id="pr-quien-ir-masa" disabled/.test(S.htmlBandaQuien()) && /<span class="pr-banda-modo__nota">sin máquinas abiertas<\/span>/.test(S.htmlBandaQuien()))
  S.estado.abiertasConocido = false
  chk('sin haberlo medido, va prendido', !/disabled/.test(S.htmlBandaQuien()))
  S.estado.modo = 'masa'
  const m = S.htmlBandaQuien()
  chk('Sala de masa: la banda amarilla con "Cancelar"', /pr-banda-modo--masa/.test(m) && /<span class="pr-banda-modo__nombre">Sala de masa<\/span>/.test(m) && /id="pr-quien-cancelar"/.test(m))
  // Planta v2: el acceso maestro es una PANTALLA propia con su banda
  // (#pr-maestro-banda) y su salida, ya no una banda de "¿Quién sos?".
  chk('el acceso maestro trae su banda con su salida', /<header class="pr-banda-maestro" id="pr-maestro-banda" hidden>/.test(FUENTE) &&
    /<span class="pr-banda-maestro__titulo">Acceso maestro<\/span>/.test(FUENTE) && /id="pr-maestro-salir">Salir del acceso maestro</.test(FUENTE))
}

// ── La barra se ve SOLO con alguien adentro, y el fondo es el común ───────
{
  const S = armar()
  S.estado.modo = 'produccion'
  S.estado.vista = 'pr-quien'
  S.pintarLateral()
  chk('en "¿Quién sos?" no hay barra (es pantalla completa)', S.__doc.getElementById('pr-barra').hidden === true)
  chk('… y la página no se corre', !S.__body.classList.contains('pr-con-lateral'))
  chk('modo Producción: el body toma su clase',
    S.__body.classList.contains('pr-modo-produccion') && !S.__body.classList.contains('pr-modo-masa'))
  S.estado.vista = 'pr-produccion'
  S.pintarLateral()
  chk('sin nadie adentro no hay barra, aunque sea una pantalla del modo', S.__doc.getElementById('pr-barra').hidden === true)
  S.estado.persona = { id: 'e-fede', nombre: 'Federico Silva', puesto: 'encargado' }
  S.estado.vista = 'pr-quien'
  S.pintarLateral()
  chk('con alguien guardado pero en "¿Quién sos?", tampoco', S.__doc.getElementById('pr-barra').hidden === true)
  S.estado.vista = 'pr-produccion'
  S.pintarLateral()
  chk('con alguien adentro la barra se ve', S.__doc.getElementById('pr-barra').hidden === false)
  chk('… y la página se corre', S.__body.classList.contains('pr-con-lateral'))
  S.estado.modo = 'masa'
  S.pintarLateral()
  chk('modo Sala de masa: el body toma la otra',
    S.__body.classList.contains('pr-modo-masa') && !S.__body.classList.contains('pr-modo-produccion'))
  S.estado.unidadId = null
  S.pintarLateral()
  chk('sin fábrica no hay barra ni clase de modo',
    S.__doc.getElementById('pr-barra').hidden === true &&
    !S.__body.classList.contains('pr-modo-masa') && !S.__body.classList.contains('pr-modo-produccion'))

  const css = FUENTE.slice(FUENTE.indexOf('<style>'), FUENTE.indexOf('</style>'))
  // Planta v2: los colores del handoff son tokens --p-* del :root.
  chk('los colores de modo son tokens', /--p-prod:\s*#2B2723/.test(css) && /--p-masa:\s*#F3D774/.test(css))
  chk('el fondo es el COMÚN de la planta en los dos modos (el tono va en la banda y el botón)',
    /body, body\.pagina-modulo \{[^}]*background: var\(--p-fondo\)/.test(css) && !/pr-modo-(produccion|masa)[^{]*\{[^}]*background/.test(css))
  chk('el botón apagado va PUNTEADO, no solo de otro color', /\.pr-lat__otro:disabled \{[^}]*dashed/.test(css) && /\.pr-banda-modo__ir:disabled \{[^}]*dashed/.test(css))
  // Planta v2: la barra mide 200 px al costado y la página es un flex de
  // fila (la barra corre el contenido sin margin a mano).
  chk('la barra mide 200 px y la página se corre (flex de fila)', /\.pr-lateral \{[^}]*width: 200px/.test(css) &&
    /\.pr-app \{[^}]*display: flex; flex-direction: row/.test(css))
  chk('los ítems de la barra miden 44 px (56 con la tablet parada)', /\.pr-lat__item \{[^}]*min-height: 44px/.test(css) &&
    /@media \(orientation: portrait\) \{[\s\S]*?\.pr-lat__item \{[^}]*min-height: 56px/.test(css))
  chk('cada color se escribe UNA vez, como token del :root (nunca el hex repetido)',
    ['#FDEEE4', '#7A2E42', '#C2410C', '#8F2F08', '#2B2723'].every(h => (css.match(new RegExp(h, 'gi')) || []).length === 1))
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
  chk('… el temporal lleva la etiqueta "hoy"', /Carla Ríos<\/span><span class="pr-persona__rol">hoy<\/span>/.test(htmlMasa), htmlMasa)
  chk('… y el fijo no la lleva', /Juan Masero<\/span><span class="pr-persona__rol">Masero<\/span>/.test(htmlMasa))

  // El buscador filtra sin volver a pedir nada.
  // Planta v2: el buscador es "Buscar a otra persona" (busca en todo el personal).
  const pedidos = T.__llamadas.rpc.length
  T.estado.quienBuscar = true
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
  // Planta v2: la grilla es SOLO de esta fábrica (5 de los 6); el de otra
  // unidad se encuentra con "Buscar a otra persona", y ahí lo dice.
  chk('sin puestos: todos los de esta fábrica, con aviso para configurarlos',
    JSON.stringify(botones(U.__doc.getElementById('pr-quien-lista').innerHTML)) === '["e-fede","e-agus","e-masero","e-hoy","e-op"]' &&
    /Configuración → Personal/.test(U.__doc.getElementById('pr-quien-aviso').innerHTML))
  U.alternarBuscarOtra()
  chk('… la persona de otra unidad aparece al buscar y lo dice',
    /data-persona="e-nada"[\s\S]*?<span class="pr-persona__rol">de otra unidad<\/span>/.test(U.__doc.getElementById('pr-quien-lista').innerHTML))

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
  // Planta v2: la tarjeta de la persona lleva sus iniciales y su puesto. Un
  // puesto que no está en PUESTOS se muestra tal cual viene de la base, y las
  // iniciales son un pedazo del nombre ("<x yz" da "<Y"): los dos se escapan.
  const WP = construirProduccion(ARCHIVO)
  WP.estado.modo = 'masa'
  const tarjeta = WP.htmlBotonPersona({ id: 'e', nombre: '<x yz', misma_unidad: true, puestos: ['masero', marca('puestoraro')], puestos_temporales: [] }, 'masero', null)
  // (en minúsculas: el segundo puesto se muestra con toLocaleLowerCase)
  chequearMarcas(chk, 'tarjeta de persona', tarjeta, ['puestoraro'])
  chk('tarjeta de persona: las iniciales van escapadas', /pr-persona__ini--masa" aria-hidden="true">&lt;Y</.test(tarjeta), tarjeta)

  // HTML malicioso en el nombre de la unidad, que va a la barra.
  const X = construirProduccion(ARCHIVO)
  X.estado.unidades = new Map([['u-cn', marca('unidadNombre')]])
  X.estado.modo = 'produccion'
  X.estado.persona = { id: 'e', nombre: marca('personaNombre'), puesto: 'encargado' }
  // Planta v2: la unidad ya no va en la barra, va en el título de la
  // cabecera ("Máquinas de …"), escrito con textContent.
  chequearMarcas(chk, 'barra lateral', X.htmlLateral(), ['personaNombre'])
  // Las iniciales también son un pedazo del dato: "<x yz" da "<Y".
  const Z = construirProduccion(ARCHIVO)
  Z.estado.modo = 'produccion'
  Z.estado.persona = { id: 'e', nombre: '<x yz', puesto: 'encargado' }
  chk('barra: las iniciales van escapadas', /pr-lat__ini--produccion" aria-hidden="true">&lt;Y</.test(Z.htmlLateral()), Z.htmlLateral())
  X.estado.vista = 'pr-produccion'
  chk('la unidad va en el título de la cabecera (texto)', (X.cabeceraDeVista()?.titulo ?? '').includes(marca('unidadNombre')))
  // … y el nombre de una máquina y su lote, en la barra de Producción y en la de Sala de masa.
  X.estado.planilla = { turno: { id: marca('turnoId'), lote: marca('lote'), turno: marca('turno') }, maquinaNombre: marca('maquina'), paradas: [] }
  X.estado.vista = 'pr-planilla'
  chk('la máquina elegida y su lote van en la cabecera (texto)',
    (X.cabeceraDeVista()?.ctx ?? '').includes(marca('maquina')) && (X.cabeceraDeVista()?.ctx ?? '').includes(marca('lote')))
  chk('… y la cabecera se escribe con textContent, nunca innerHTML',
    /getElementById\('pr-cab-ctx'\)\.textContent = c\.ctx/.test(FUENTE) && /t\.textContent = c\.titulo/.test(FUENTE) &&
    !/function pintarCabeceraVista\(\) \{[^}]*innerHTML/.test(FUENTE))
  X.estado.modo = 'masa'
  X.estado.tablero = [{ maquina: { id: 'm', nombre: marca('maqSala') }, turno: { id: marca('idSala'), lote: marca('loteSala') }, masas: 2, parada: null }]
  chequearMarcas(chk, 'barra: las máquinas de la sala', X.htmlLatSala(), ['maqSala', 'idSala', 'loteSala'])

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
// Decisión de Facu (28/09/2026): 10 minutos, y Producción OLVIDA a la persona
// pero la deja elegida (vuelve a "¿Quién sos?" con su nombre puesto, solo el
// PIN). Sala de masa no se cierra nunca: si a los 10 minutos la tablet está en
// Sala de masa, no se toca nada.
esperas.push((async () => {
  const S = armar()
  chk('el corte son 10 minutos', S.MINUTOS_INACTIVIDAD === 10)
  chk('recién tocada no vence', S.vencioPorInactividad(Date.now()) === false)
  chk('a los 9 minutos no vence', S.vencioPorInactividad(1000000, 1000000 + 9 * 60000) === false)
  chk('a los 10 vence', S.vencioPorInactividad(1000000, 1000000 + 10 * 60000) === true)
  chk('sin ningún toque registrado no vence', S.vencioPorInactividad(null) === false)

  const fede = { id: 'e-fede', nombre: 'Federico Silva', puesto: 'encargado' }
  const juan = { id: 'e-masero', nombre: 'Juan Masero', puesto: 'masero' }
  S.estado.modo = 'produccion'
  S.guardarSesion(S.clavePersona('produccion'), JSON.stringify(fede))
  S.guardarSesion(S.clavePersona('masa'), JSON.stringify(juan))
  S.estado.persona = fede
  S.estado.vista = 'pr-produccion'
  S.estado.ultimoToque = 1000
  chk('a los 9 minutos Producción NO se cierra', S.revisarInactividad(1000 + 9 * 60000) === false && S.estado.persona?.id === 'e-fede')
  chk('Producción se cierra sola a los 10', S.revisarInactividad(1000 + 10 * 60000) === true)
  chk('… y echa a la persona', S.estado.persona === null)
  await new Promise(r => setTimeout(r, 0))
  chk('… vuelve a "¿Quién sos?" de Producción', S.estado.vista === 'pr-quien' && S.estado.modo === 'produccion')
  chk('… con la persona YA ELEGIDA: solo pone el PIN', S.estado.quienFija?.id === 'e-fede' && S.estado.pin?.personaId === 'e-fede')
  // Planta v2: la grilla no se esconde: la persona queda marcada y la
  // ventana del PIN se abre sola para ella.
  chk('… con la ventana del PIN abierta y su nombre marcado en la grilla', S.__doc.getElementById('pr-pin').hidden === false &&
    /data-persona="e-fede" aria-pressed="true"/.test(S.__doc.getElementById('pr-quien-lista').innerHTML))
  chk('… la persona de Producción NO se borra de la tablet', S.personaGuardada('produccion')?.id === 'e-fede')
  chk('… y el masero de Sala de masa tampoco', S.personaGuardada('masa')?.id === 'e-masero')

  const T = armar()
  T.estado.modo = 'masa'
  T.guardarSesion(T.clavePersona('produccion'), JSON.stringify(fede))
  T.guardarSesion(T.clavePersona('masa'), JSON.stringify(juan))
  T.estado.persona = juan
  T.estado.vista = 'pr-receta'
  T.estado.ultimoToque = 1000
  const rpcAntes = T.__llamadas.rpc.length
  chk('Sala de masa NO se cierra sola', T.revisarInactividad(1000 + 60 * 60000) === false)
  chk('… el masero sigue adentro', T.estado.persona?.id === 'e-masero')
  chk('… la pantalla no cambia', T.estado.vista === 'pr-receta')
  chk('… no se toca a NADIE: ni el masero ni el encargado guardado',
    T.personaGuardada('masa')?.id === 'e-masero' && T.personaGuardada('produccion')?.id === 'e-fede')
  chk('… y no se consulta nada', T.__llamadas.rpc.length === rpcAntes)

  // El maestro sí se cierra, esté en el modo que esté: es una llave de
  // administración con su PIN en memoria.
  const U = armar()
  U.estado.modo = 'masa'
  U.guardarSesion(U.clavePersona('masa'), JSON.stringify(juan))
  U.estado.maestro = { id: 'e-jefe', nombre: 'Jefa' }
  U.estado.persona = { id: 'e-jefe', nombre: 'Jefa', puesto: 'masero' }
  U.estado.ultimoToque = 1000
  chk('el acceso maestro se cierra a los 10 minutos, también en Sala de masa', U.revisarInactividad(1000 + 10 * 60000) === true)
  chk('… y deja de estar activo', U.estado.maestro === null)
  chk('… el masero guardado sigue guardado', U.personaGuardada('masa')?.id === 'e-masero')
  chk('… y la tablet sigue en Sala de masa', U.estado.modo === 'masa')

  const W = armar()
  W.estado.modo = 'produccion'
  W.estado.maestro = { id: 'e-jefe', nombre: 'Jefa' }
  W.estado.persona = { id: 'e-jefe', nombre: 'Jefa', puesto: 'encargado' }
  W.estado.ultimoToque = 1000
  chk('en Producción el acceso maestro también se cierra', W.revisarInactividad(1000 + 10 * 60000) === true && W.estado.maestro === null)
})())

// ── Lo que queda escrito en el archivo ────────────────────────────────────
{
  chk('los DOS modos son alcanzables: el botón de la barra va al otro', /data-modo="\$\{modoDestino\}"/.test(FUENTE) &&
    /const OTRO_MODO = \{ produccion: 'masa', masa: 'produccion' \}/.test(FUENTE))
  chk('la barra de modos de arriba no existe más', !/htmlBarraModos|pintarBarra\(/.test(FUENTE) && !/id="pr-btn-entrar"/.test(FUENTE))
  chk('el acceso maestro está en UN solo lugar: el pie de "¿Quién sos?"',
    (FUENTE.match(/abrirMaestro\)|abrirMaestro\(\)/g) || []).length >= 1 && !/pr-btn-barra-maestro/.test(FUENTE))
  chk('ya no hay pantalla de "¿Para qué se usa esta tablet?"', !/pr-elegir-modo/.test(FUENTE))
  chk('ya no hay "Cambiar el modo de esta tablet"', !/Cambiar el modo de esta tablet/.test(FUENTE))
  chk('ya no hay "‹ Volver" a la cabecera', !/pr-volver-dashboard/.test(FUENTE))
  chk('leerHayAbiertas mira los turnos abiertos de la unidad',
    /\.from\('turnos_produccion'\)\s*\n?\s*\.select\('id'\)\.eq\('estado', 'abierto'\)\.in\('maquina_id', ids\)/.test(FUENTE))
}

fin()
