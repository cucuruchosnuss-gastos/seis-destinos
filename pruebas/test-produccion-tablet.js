// Arreglos de la planta después de probarla en la tablet real (Samsung
// Galaxy Tab A11, en Nuss, 28/09/2026) — parte A, los errores:
//  1. la planilla mostraba "—" en vez de los operarios y "No hay operarios
//     para agregar": el personal solo se leía en la lista de "¿Quién sos?", y
//     la tablet entra sin esa lista cuando la persona ya está guardada;
//  2. al cerrar una planilla, la máquina seguía elegida en la barra y
//     "Cerrar planilla" la volvía a ofrecer; el título decía "Cerrar Máquina"
//     sin el número;
//  3. el tiempo real: las cinco tablas publicadas, filtradas por los turnos
//     de ESTA fábrica (dos veces: en la suscripción y al recibir), el canal
//     que reconecta solo y el redibujo de lo que se está viendo;
//  4. el evento 'pantalla', una vez por sesión.
// Se EJECUTAN las funciones reales con el sandbox (canal de tiempo real
// simulado incluido), más HTML malicioso en lo que se dibuja.
//
//   node pruebas/test-produccion-tablet.js

const path = require('path')
const { arnes, leer } = require('./circuito-comun')
const { construirProduccion } = require('./sandbox-produccion')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/produccion.html')
const FUENTE = leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

const XSS = '<img src=x onerror=alert(1)>'
const PERSONAL = [
  { id: 'e-fede', nombre: 'Federico Silva', misma_unidad: true, puestos: ['encargado'], puestos_temporales: [] },
  { id: 'e-vill', nombre: 'Villagra Fabián', misma_unidad: true, puestos: ['operario'], puestos_temporales: [] },
  { id: 'e-tiss', nombre: 'Tissera Franco', misma_unidad: true, puestos: ['operario'], puestos_temporales: [] },
  { id: 'e-otro', nombre: 'Otro Operario ' + XSS, misma_unidad: true, puestos: ['operario'], puestos_temporales: [] },
]
const TURNO = { id: 't37', lote: 7037, maquina_id: 'm1', fecha: '2026-09-28', turno: 'Mañana', encargado_id: 'e-fede',
  abierto_en: '2026-09-28T09:00:00Z', estado: 'abierto' }

function armar({ personal = () => ({ data: PERSONAL, error: null }), tablas = {} } = {}) {
  const S = construirProduccion(ARCHIVO)
  S.estado.unidades = new Map([['u-cn', 'Cucuruchos Nuss']])
  S.estado.unidadId = 'u-cn'
  S.estado.unidadesPosibles = ['u-cn']
  S.estado.modo = 'produccion'
  S.estado.persona = { id: 'e-fede', nombre: 'Federico Silva', puesto: 'encargado' }
  S.estado.personal = []
  S.estado.sesionPlanta = { empleado_id: 'emp-tablet', unidad_negocio_id: 'u-cn', es_dispositivo: true }
  S.__setRpc(async (nombre) => {
    if (nombre === 'personal_produccion') return personal()
    return { data: null, error: null }
  })
  Object.assign(S.__tablas, {
    turnos_produccion: (f) => {
      if (f.some(x => x[0] === 'single')) return { data: [TURNO], error: null }
      return { data: [{ id: 't37' }, { id: 't38' }], error: null }
    },
    turno_operarios: [{ empleado_id: 'e-vill', desde: '2026-09-28T09:00:00Z', hasta: null },
      { empleado_id: 'e-tiss', desde: '2026-09-28T09:00:00Z', hasta: null }],
    masas: [], paradas_produccion: [], produccion_items: [],
    maquinas: (f) => ({ data: f.some(x => x[0] === 'single') ? [{ nombre: 'Máquina 1' }] : [], error: null }),
  }, tablas)
  return S
}

// ── 1. Los operarios de la planilla, con la persona ya guardada ──────────
esperas.push((async () => {
  // La tablet entró con la persona guardada (recarga): nunca pasó por la
  // lista de "¿Quién sos?", así que estado.personal está vacío.
  const S = armar()
  await S.abrirPlanilla('t37')
  const ops = S.__doc.getElementById('pr-planilla-operarios').innerHTML
  chk('1. la planilla muestra los nombres de los operarios', /Villagra Fabián/.test(ops) && /Tissera Franco/.test(ops), ops)
  chk('1. … y no un "—" en su lugar', !/>—</.test(ops) && !/data-quitar-op[^>]*>—/.test(ops))
  chk('1. se leyó el personal para la planilla', S.__llamadas.rpc.some(([n]) => n === 'personal_produccion'))
  // Sumar: aparecen los que no están.
  S.estado.opsPlanilla.buscando = true
  S.pintarOperariosPlanilla()
  const sumar = S.__doc.getElementById('pr-planilla-operarios').innerHTML
  chk('1. "+ Sumar" ofrece a los operarios que faltan', /Otro Operario/.test(sumar) && !/No hay operarios para agregar/.test(sumar), sumar)
  chk('1. … con su nombre escapado', !sumar.includes(XSS) && sumar.includes('&lt;img src=x'), sumar)

  // Si el personal no se puede leer, lo dice (no "No hay operarios").
  const F = armar({ personal: () => ({ data: null, error: { message: 'sin red' } }) })
  await F.abrirPlanilla('t37')
  F.estado.opsPlanilla.buscando = true
  F.pintarOperariosPlanilla()
  const sinRed = F.__doc.getElementById('pr-planilla-operarios').innerHTML
  chk('1. sin personal, dice que no se pudo cargar', /No se pudo cargar el personal/.test(sinRed) && !/No hay operarios para agregar/.test(sinRed), sinRed)

  // Abrir turno también lo asegura.
  const A = armar()
  A.estado.tablero = [{ maquina: { id: 'm1', nombre: 'Máquina 1' }, turno: null }]
  await A.mostrarAbrir()
  chk('1. Abrir turno también lee el personal', A.__llamadas.rpc.some(([n]) => n === 'personal_produccion') && (A.estado.operarios ?? []).length === 3,
    A.estado.operarios)
  // Una sola lectura aunque la pidan dos a la vez.
  const D = armar()
  await Promise.all([D.asegurarPersonal(), D.asegurarPersonal()])
  chk('1. dos pedidos a la vez leen UNA vez', D.__llamadas.rpc.filter(([n]) => n === 'personal_produccion').length === 1)
  await D.asegurarPersonal()
  chk('1. con el personal ya leído no se vuelve a leer', D.__llamadas.rpc.filter(([n]) => n === 'personal_produccion').length === 1)
  chk('1. entrar a un modo lo pide (sin esperar)', /function entrarAlModo\(\) \{[\s\S]{0,200}?asegurarPersonal\(\)/.test(FUENTE))
})())

// ── 2. La máquina cerrada deja de estar elegida ──────────────────────────
esperas.push((async () => {
  const S = armar()
  await S.abrirPlanilla('t37')
  chk('2. el nombre de la máquina sale de la base', S.estado.planilla?.maquinaNombre === 'Máquina 1', S.estado.planilla?.maquinaNombre)
  await S.mostrarCierre()
  // Planta v2: el título va en la cabecera (pr-cab): el contexto dice el lote
  // y la máquina con su número, el título "Cerrar planilla".
  const cab = S.cabeceraDeVista()
  chk('2. la cabecera del cierre dice "Lote 7037 · Máquina 1" y "Cerrar planilla"',
    cab?.ctx === 'Lote 7037 · Máquina 1' && cab?.titulo === 'Cerrar planilla', JSON.stringify(cab))
  chk('2. antes de cerrar, la máquina está elegida', !!S.maquinaElegida())
  const latAntes = S.htmlLatSecciones()
  chk('2. antes de cerrar, Planilla, Paradas y Cerrar planilla están prendidas',
    !/data-seccion="(planilla|paradas|cierre)"[^>]*disabled/.test(latAntes), latAntes)
  S.estado.tablero = [{ maquina: { id: 'm1', nombre: 'Máquina 1' }, turno: { id: 't37' } }]
  await S.maquinaCerrada('t37')
  chk('2. al cerrarse, la máquina deja de estar elegida', S.maquinaElegida() === null && S.estado.planilla === null)
  const lat = S.htmlLatSecciones()
  chk('2. … y Planilla, Paradas y Cerrar planilla quedan apagadas',
    /data-seccion="planilla"[^>]*disabled/.test(lat) &&
    /data-seccion="paradas"[^>]*disabled/.test(lat) && /data-seccion="cierre"[^>]*disabled/.test(lat), lat)
  S.estado.vista = 'pr-planilla'
  chk('2. la cabecera ya no muestra el lote', !/Lote 7037/.test(S.cabeceraDeVista()?.ctx ?? ''), JSON.stringify(S.cabeceraDeVista()))
  // Cerrar otra máquina no suelta la elegida.
  const O = armar()
  await O.abrirPlanilla('t37')
  await O.maquinaCerrada('t99')
  chk('2. cerrar OTRA máquina no suelta la elegida', !!O.maquinaElegida())
  // Sin el nombre en la base, el del tablero.
  const T = armar({ tablas: { maquinas: () => ({ data: null, error: { message: 'x' } }) } })
  T.estado.tablero = [{ maquina: { id: 'm1', nombre: 'Máquina 2' }, turno: { id: 't37' } }]
  await T.abrirPlanilla('t37')
  chk('2. si no se puede leer la máquina, usa el tablero', T.estado.planilla?.maquinaNombre === 'Máquina 2')
})())

// ── 3. Tiempo real ───────────────────────────────────────────────────────
esperas.push((async () => {
  const S = armar()
  await S.conectarTiempoReal()
  const c = S.__canales[0]
  chk('3. se abre UN canal', S.__canales.length === 1 && !!c)
  const tablas = (c?.ons ?? []).map(o => o.cfg.table).sort()
  chk('3. escucha las cinco tablas publicadas',
    JSON.stringify(tablas) === JSON.stringify(['masas', 'paradas_produccion', 'produccion_items', 'turno_operarios', 'turnos_produccion']), tablas)
  const filtro = t => (c?.ons ?? []).find(o => o.cfg.table === t)?.cfg.filter
  chk('3. los turnos, filtrados por la fábrica de la tablet', filtro('turnos_produccion') === 'unidad_negocio_id=eq.u-cn', filtro('turnos_produccion'))
  chk('3. el resto, por los turnos de esa fábrica', filtro('masas') === 'turno_id=in.(t37,t38)', filtro('masas'))
  chk('3. todo es postgres_changes de public', (c?.ons ?? []).every(o => o.tipo === 'postgres_changes' && o.cfg.schema === 'public' && o.cfg.event === '*'))

  // Un aviso de OTRA fábrica no se cuela, aunque llegue.
  S.estado.cambiosVivos = []
  const ajena = S.alCambioVivo('masas', { new: { id: 'x', turno_id: 't-de-otra' } })
  const turnoAjeno = S.alCambioVivo('turnos_produccion', { new: { id: 't-otra', unidad_negocio_id: 'u-dp', estado: 'abierto' } })
  chk('3. una masa de un turno de otra fábrica se descarta', ajena === false)
  chk('3. un turno de otra fábrica se descarta', turnoAjeno === false)
  chk('3. … y no queda nada para redibujar', (S.estado.cambiosVivos ?? []).length === 0)
  chk('3. un aviso sin fila no rompe', S.alCambioVivo('masas', {}) === false && S.alCambioVivo('masas', null) === false)
  chk('3. una tabla que no es de las cinco se descarta', S.cambioEsDeMiFabrica('gastos', { turno_id: 't37' }, new Set(['t37']), 'u-cn') === false)

  // Una masa nueva de ESTA fábrica: se redibuja la planilla que se está viendo.
  await S.abrirPlanilla('t37')
  S.__tablas.masas = [{ id: 'mz1', nro: 1, hora: '2026-09-28T10:00:00Z', doble: false, origen: 'original', es_chocolate: false }]
  chk('3. una masa de esta fábrica se acepta', S.alCambioVivo('masas', { new: { id: 'mz1', turno_id: 't37' } }) === true)
  await S.refrescarVivo()
  const masas = S.__doc.getElementById('pr-planilla-masas').innerHTML
  chk('3. la masa nueva aparece en la planilla sin recargar', S.estado.planilla?.masas?.length === 1 && masas.length > 0, masas)

  // Un cierre desde otra tablet saca la máquina.
  S.__tablas.turnos_produccion = (f) => ({ data: f.some(x => x[0] === 'single') ? [{ ...TURNO, estado: 'cerrado' }] : [], error: null })
  chk('3. el cierre de un turno de esta fábrica se acepta',
    S.alCambioVivo('turnos_produccion', { new: { id: 't37', unidad_negocio_id: 'u-cn', estado: 'cerrado' } }) === true)
  S.estado.tablero = []
  await S.refrescarVivo()
  chk('3. un cierre desde otra tablet suelta la máquina', S.estado.planilla === null)
  chk('3. … y lo avisa', S.__llamadas.errores.some(m => /se cerró desde otra tablet/.test(m)), S.__llamadas.errores)

  // El canal que se cae reconecta solo.
  const R = armar()
  await R.conectarTiempoReal()
  const antes = R.__canales.length
  R.__canales[0].estadoCb('CHANNEL_ERROR')
  // (30/09/2026) Cortarse es normal: se avisa a js/salud.js, que lo anota
  // recién si no volvió en 2 minutos (test-salud-tiempo-real.js).
  chk('3. si el canal se cae, se lo avisa a salud (tiempoRealCaido), sin anotarlo en el momento',
    R.__tiempoReal().some(x => x[0] === 'caido' && x[1] === 'CHANNEL_ERROR') && !R.__registros.some(r => /Tiempo real/.test(r.mensaje ?? '')))
  R.__canales[0].estadoCb('SUBSCRIBED')
  chk('3. … y cuando vuelve, tiempoRealConectado', R.__tiempoReal().some(x => x[0] === 'conectado'))
  chk('3. … y programa la reconexión', /function programarReconexionVivo\(\) \{[\s\S]{0,200}?setTimeout\(\(\) => \{[\s\S]{0,120}?claveCanalVivo = ''[\s\S]{0,60}?conectarTiempoReal\(\)/.test(FUENTE))
  // Sin cambios de turnos no se rearma el canal.
  await R.conectarTiempoReal()
  chk('3. con los mismos turnos no se rearma el canal', R.__canales.length === antes)
  R.__tablas.turnos_produccion = () => ({ data: [{ id: 't37' }, { id: 't38' }, { id: 't39' }], error: null })
  await R.conectarTiempoReal()
  chk('3. con un turno nuevo, se rearma y se quita el viejo', R.__canales.length === antes + 1 && R.__canales[0].quitado === true)
  // (30/09/2026) channel() devuelve el canal que existe con ese nombre (el
  // sandbox imita a realtime-js): rearmarlo con el mismo nombre devolvía el
  // viejo, que se estaba cerrando. Cada canal tiene que ser uno NUEVO.
  const nuevo = R.__canales[R.__canales.length - 1], viejo = R.__canales[R.__canales.length - 2]
  chk('3. el canal rearmado es OTRO objeto, con otro nombre (no el que se está cerrando)',
    !!nuevo && !!viejo && nuevo !== viejo && nuevo.nombre !== viejo.nombre && /^planta-u-cn-\d+$/.test(nuevo.nombre), R.__canales.map(c => c.nombre))
  chk('3. … y escucha las cinco tablas otra vez (no se le suman al viejo)', nuevo?.ons?.length === 5 && viejo?.ons?.length === 5, [nuevo?.ons?.length, viejo?.ons?.length])
  chk('3. mientras el nuevo no conecta, el estado dice que no está conectado', R.estado.vivo === 'conectando', R.estado.vivo)
  // Volver del bloqueo con los mismos turnos: también un canal nuevo.
  const V = armar()
  await V.conectarTiempoReal()
  V.__canales[0].estadoCb('SUBSCRIBED')
  V.claveCanalVivo = ''
  await V.alVolverLaRed()
  await new Promise(r => setTimeout(r, 0))
  chk('3. al volver la red se rearma YA, con un canal nuevo', V.__canales.length === 2 && V.__canales[0].quitado === true && V.__canales[1] !== V.__canales[0], V.__canales.map(c => c.nombre))
  chk('3. el aviso de "volvió la red" y la revisión cada 15 s están instalados',
    /addEventListener\('online', alVolverLaRed\)/.test(FUENTE) && /setInterval\(\(\) => \{ revisarVivo\(\) \}, CADA_REVISION_VIVO_MS\)/.test(FUENTE) && V.CADA_REVISION_VIVO_MS === 15000)

  // La red de seguridad: con el canal caído, la pantalla se vuelve a leer.
  const Q = armar()
  Q.estado.sesionPlanta = { empleado_id: 'emp-tablet' }
  await Q.abrirPlanilla('t37')
  const docVisible = { visibilityState: 'visible' }
  Q.estado.vivo = 'SUBSCRIBED'
  chk('3. con el canal conectado, la red de seguridad no lee nada', Q.revisarVivo(Date.now(), docVisible) === false)
  Q.estado.vivo = 'CLOSED'
  Q.estado.ultimoToque = Date.now()
  chk('3. con alguien tocando la pantalla, no se relee', Q.revisarVivo(Date.now(), docVisible) === false)
  Q.estado.ultimoToque = Date.now() - 60000
  chk('3. con la tablet escondida, no se relee', Q.revisarVivo(Date.now(), { visibilityState: 'hidden' }) === false)
  Q.__tablas.masas = [{ id: 'mz9', nro: 1, hora: '2026-09-30T10:00:00Z', doble: false, origen: 'original', es_chocolate: false }]
  chk('3. con el canal caído y la pantalla quieta, se relee', Q.revisarVivo(Date.now(), docVisible) === true)
  await new Promise(r => setTimeout(r, 0)); await new Promise(r => setTimeout(r, 0))
  chk('3. … y la masa que cargó la otra tablet aparece aunque el tiempo real esté caído', Q.estado.planilla?.masas?.some(m => m.id === 'mz9'), Q.estado.planilla?.masas)
  const sinSesion = armar()
  sinSesion.estado.sesionPlanta = null
  chk('3. sin la sesión de la tablet, no se relee', sinSesion.revisarVivo(Date.now(), docVisible) === false)
  chk('3. al volver del bloqueo se rearma el canal', /async function alReanudar\(\) \{[\s\S]{0,1500}?claveCanalVivo = ''\s+conectarTiempoReal\(\)\s+\}\n\n    \/\/ ═══/.test(FUENTE))
  chk('3. init conecta el tiempo real', /siguientePaso\(\)\s+iniciarReloj\(\)\s+registrarPantalla\(\)\s+conectarTiempoReal\(\)/.test(FUENTE))
})())

// ── 4. El evento 'pantalla' ──────────────────────────────────────────────
esperas.push((async () => {
  const S = armar()
  const win = { innerWidth: 1007, innerHeight: 604, devicePixelRatio: 1.3333, screen: { orientation: { type: 'landscape-primary' } },
    matchMedia: () => ({ matches: true }) }
  chk('4. registra la primera vez', S.registrarPantalla(win) === true)
  const r = S.__registros.find(x => x.evento === 'pantalla')
  chk('4. con evento "pantalla"', !!r)
  chk('4. dice ancho, alto, DPR y orientación', r?.mensaje === '1007px × 604px · DPR 1.33 · landscape-primary', r?.mensaje)
  const d = JSON.parse(r?.detalle ?? '{}')
  chk('4. el detalle trae los números y si está instalada', d.ancho === '1007px' && d.alto === '604px' && d.instalada === true && d.dpr === 1.3333, d)
  chk('4. UNA vez por sesión', S.registrarPantalla(win) === false && S.__registros.filter(x => x.evento === 'pantalla').length === 1)
  const V = armar()
  V.registrarPantalla({ innerWidth: 604, innerHeight: 1007, devicePixelRatio: 1 })
  chk('4. sin screen.orientation, la deduce', /portrait/.test(V.__registros[0]?.mensaje ?? ''), V.__registros[0])
  chk('4. usa registrarError de js/salud.js', /import \{[^}]*registrarError[^}]*\} from '\.\.\/js\/salud\.js'/.test(FUENTE))
})())

fin()
