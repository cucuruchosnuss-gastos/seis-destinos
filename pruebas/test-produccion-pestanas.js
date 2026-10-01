// LAS PESTAÑAS DE LAS MÁQUINAS (01/10/2026).
//
// Arriba de Planilla, Lo producido, Paradas y Cerrar planilla (y de la receta
// en Sala de masa), una fila de pestañas con las máquinas abiertas del turno
// ("M1 · 7033"). Tocar otra cambia de máquina y se queda en la MISMA sección;
// con algo a medio cargar pregunta "¿Dejar esto sin guardar?". Se EJECUTA el
// código de la planta con su sandbox. Lo que se mide en un navegador (una
// fila, sin cortar, con 2 y 5 máquinas a 1000 × 540) está en
// e2e/17-planta-pestanas.spec.js.
//
//   node pruebas/test-produccion-pestanas.js
//   ARCHIVO_TEST=<copia de modulos/produccion.html>

process.env.TZ = 'UTC'
const path = require('path')
const { arnes, leer, marca, chequearMarcas } = require('./circuito-comun')
const { construirProduccion } = require('./sandbox-produccion')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/produccion.html')
const FUENTE = leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

const turno = (id, lote, maquina) => ({ id, lote, maquina_id: maquina, fecha: '2026-10-01', turno: 'Mañana', abierto_en: '2026-10-01T09:00:00Z', estado: 'abierto', unidad_negocio_id: 'u1', encargado_id: 'e-fede' })
const TURNOS = [turno('t1', 7033, 'm1'), turno('t2', 7034, 'm2'), turno('t4', 7035, 'm4')]
const TABLERO = [
  { maquina: { id: 'm1', nombre: 'Máquina 1' }, turno: { id: 't1', lote: 7033 }, parada: null, masas: 3 },
  { maquina: { id: 'm2', nombre: 'Máquina 2' }, turno: { id: 't2', lote: 7034 }, parada: { id: 'pa' }, masas: 0 },
  { maquina: { id: 'm3', nombre: 'Máquina 3' }, turno: null },
  { maquina: { id: 'm4', nombre: 'Máquina 4' }, turno: { id: 't4', lote: 7035 }, parada: null, masas: 1 },
]

function armar({ vista = 'pr-planilla' } = {}) {
  const S = construirProduccion(ARCHIVO)
  Object.assign(S.__tablas, {
    turnos_produccion: filtros => {
      const id = filtros.find(f => f[1] === 'id')?.[2]
      if (filtros.some(f => f[1] === 'estado' && f[2] === 'pendiente_completar')) return { data: [], error: null }
      return { data: id ? TURNOS.filter(t => t.id === id) : TURNOS, error: null }
    },
    turno_operarios: [], masas: [], produccion_items: [], paradas_produccion: [],
    maquinas: [{ id: 'm1', nombre: 'Máquina 1', orden: 1 }, { id: 'm2', nombre: 'Máquina 2', orden: 2 }, { id: 'm4', nombre: 'Máquina 4', orden: 4 }],
  })
  S.estado.modo = 'produccion'
  S.estado.persona = { id: 'e-fede', nombre: 'Federico Silva' }
  S.estado.personal = [{ id: 'e-fede', nombre: 'Federico Silva', puestos: ['encargado'] }]
  S.estado.tablero = JSON.parse(JSON.stringify(TABLERO))
  S.estado.vista = vista
  return S
}
const conPlanilla = (S, turnoId = 't1', paradas = []) => {
  const t = TURNOS.find(x => x.id === turnoId)
  S.estado.planilla = { turno: t, paradas, masas: [], items: [], operarios: [], maquinaNombre: TABLERO.find(e => e.turno?.id === turnoId).maquina.nombre }
  return S
}
const tic = () => new Promise(r => setImmediate(r))

// ── El nombre corto ─────────────────────────────────────────────────────
{
  const S = armar()
  chk('"Máquina 1" → "M1"', S.nombreCortoMaquina('Máquina 1') === 'M1')
  chk('"Maquina 12" (sin acento) → "M12"', S.nombreCortoMaquina('Maquina 12') === 'M12')
  chk('un nombre que no termina en número queda entero', S.nombreCortoMaquina('Máquina robot') === 'Robot', S.nombreCortoMaquina('Máquina robot'))
  chk('un nombre sin "Máquina" queda como está', S.nombreCortoMaquina('Laminadora') === 'Laminadora')
  chk('sin nombre, "Máq."', S.nombreCortoMaquina('') === 'Máq.' && S.nombreCortoMaquina(null) === 'Máq.')
}

// ── Qué pestañas hay ────────────────────────────────────────────────────
{
  const S = conPlanilla(armar())
  const p = S.pestanasMaquinas()
  chk('en la planilla, una pestaña por máquina ABIERTA (la libre no)', p?.length === 3 && p.map(x => x.turnoId).join() === 't1,t2,t4', JSON.stringify(p))
  chk('la activa es la de la planilla', p?.filter(x => x.activa).map(x => x.turnoId).join() === 't1')
  chk('la parada del tablero se marca', p?.find(x => x.turnoId === 't2')?.parada === true && p?.find(x => x.turnoId === 't4')?.parada === false)
  for (const v of ['pr-agregar-prod', 'pr-paradas', 'pr-cierre']) {
    S.estado.vista = v
    chk(`también en ${v}`, S.pestanasMaquinas()?.length === 3)
  }
  for (const v of ['pr-produccion', 'pr-abrir', 'pr-sala', 'pr-hist-maq', 'pr-cerrado']) {
    S.estado.vista = v
    chk(`en ${v} no hay pestañas`, S.pestanasMaquinas() === null)
  }
}
{
  // La activa en Producción mira su planilla (más al día que el tablero).
  const S = conPlanilla(armar(), 't1', [{ id: 'px', inicio: '2026-10-01T10:00:00Z', fin: null, motivo: 'Corte de luz' }])
  chk('la activa parada según su planilla, aunque el tablero no lo sepa', S.pestanasMaquinas().find(x => x.activa).parada === true)
  const T = conPlanilla(armar(), 't2', [])
  chk('y la activa que ya volvió a andar no lleva el punto', T.pestanasMaquinas().find(x => x.activa).parada === false)
}
{
  // Con UNA sola máquina abierta, la pestaña igual se ve.
  const S = conPlanilla(armar())
  S.estado.tablero = [TABLERO[0]]
  chk('con una sola máquina, una pestaña (dice en cuál se está)', S.pestanasMaquinas()?.length === 1 && S.pestanasMaquinas()[0].activa)
}
{
  // Una planilla que no está entre las abiertas (pendiente de completar).
  const S = armar()
  S.estado.planilla = { turno: { id: 'tp', lote: 7001, estado: 'pendiente_completar' }, paradas: [], masas: [], items: [], operarios: [], maquinaNombre: 'Máquina 3' }
  const p = S.pestanasMaquinas()
  chk('una planilla pendiente igual tiene su pestaña, primera y activa', p?.[0]?.turnoId === 'tp' && p[0].activa && p.length === 4, JSON.stringify(p))
}
{
  // Mientras carga la planilla pedida.
  const S = armar()
  S.estado.planilla = null
  S.estado.planillaPedida = 't4'
  chk('mientras carga, la activa es la pedida', S.pestanasMaquinas()?.find(x => x.activa)?.turnoId === 't4')
  S.estado.planillaPedida = null
  chk('sin planilla ni pedido, no hay pestañas', S.pestanasMaquinas() === null)
}
{
  // Sala de masa: la máquina de la receta.
  const S = armar({ vista: 'pr-receta' })
  S.estado.modo = 'masa'
  S.estado.salaTurno = { id: 't4', lote: 7035, maquinaNombre: 'Máquina 4' }
  const p = S.pestanasMaquinas()
  chk('en la receta, las abiertas con la de la receta activa', p?.length === 3 && p.find(x => x.activa)?.turnoId === 't4')
}

// ── El HTML ─────────────────────────────────────────────────────────────
{
  const S = conPlanilla(armar())
  const h = S.htmlPestanasMaquinas(S.pestanasMaquinas())
  chk('cada pestaña dice "M1 · 7033"', /pr-pest__maq">M1<\/span><span class="pr-pest__sep" aria-hidden="true">·<\/span><span class="pr-pest__lote">7033</.test(h), h)
  chk('la activa marcada (clase y aria-current)', /class="pr-pest pr-pest--activa" data-pestana-turno="t1" aria-current="page"/.test(h))
  chk('solo una marcada', (h.match(/aria-current/g) ?? []).length === 1)
  chk('un puntito solo en la parada', (h.match(/pr-pest__punto/g) ?? []).length === 1 && /data-pestana-turno="t2"[^>]*><span class="pr-pest__punto"/.test(h))
  chk('se lee el nombre entero y si está parada', /aria-label="Máquina 2, lote 7034, parada"/.test(h) && /aria-label="Máquina 1, lote 7033"/.test(h))
  chequearMarcas(chk, 'pestañas', S.htmlPestanasMaquinas([{ turnoId: marca('id'), nombre: marca('nombre'), lote: marca('lote'), parada: true, activa: true }]), ['id', 'nombre', 'lote'])
}

// ── La cabecera: con pestañas, el contexto lo dice la pestaña ───────────
{
  chk('la cabecera tiene su fila de pestañas', /<nav class="pr-cab__maquinas" id="pr-cab-maquinas" aria-label="Máquinas abiertas" hidden><\/nav>/.test(FUENTE))
  chk('con pestañas se esconde el "Lote · Máquina" de texto', /document\.getElementById\('pr-cab-ctx'\)\.hidden = conPestanas \|\| !c\.ctx/.test(FUENTE) && /document\.getElementById\('pr-cab-sep'\)\.hidden = conPestanas \|\| !c\.ctx/.test(FUENTE))
  chk('con tres o más, la cabecera se aprieta; con seis, más', /toggle\('pr-cab--apretada', n >= 3\)/.test(FUENTE) && /toggle\('pr-cab--muy-apretada', n >= 6\)/.test(FUENTE))
  chk('apretada, el reloj muestra solo la hora', /\.pr-cab--apretada \.pr-cab__reloj \{ display: none; \}/.test(FUENTE) && /\.pr-cab--apretada \.pr-cab__reloj--hora \{ display: inline; \}/.test(FUENTE))
  chk('las pestañas nunca bajan a otra fila', /\.pr-cab__maquinas \{ display: flex;[^}]*\}/.test(FUENTE) && !/\.pr-cab__maquinas \{[^}]*flex-wrap: wrap/.test(FUENTE) && /\.pr-pest \{[^}]*white-space: nowrap/.test(FUENTE))
  chk('la activa en el naranja de lo elegido', /\.pr-pest--activa \{ border: 2px solid var\(--p-acento\); background: var\(--p-acento-suave\)/.test(FUENTE))
  chk('el puntito en el bordó de "parada"', /\.pr-pest__punto \{[^}]*background: var\(--p-mal\)/.test(FUENTE))
  chk('se escuchan por delegación', /getElementById\('pr-cab-maquinas'\)\.addEventListener\('click'/.test(FUENTE) && /cambiarDeMaquina\(b\.dataset\.pestanaTurno\)/.test(FUENTE))
}

// ── Cambiar de máquina: la misma sección ────────────────────────────────
esperas.push((async () => {
  const S = armar()
  await S.abrirPlanilla('t1')
  chk('la planilla de M1 abierta', S.estado.planilla?.turno?.id === 't1' && S.estado.vista === 'pr-planilla')
  const nav = S.__doc.getElementById('pr-cab-maquinas')
  S.pintarCabeceraVista()
  chk('pintar la cabecera pinta las pestañas', nav.hidden === false && /data-pestana-turno="t2"/.test(nav.innerHTML), `${nav.hidden} ${nav.innerHTML.slice(0, 80)}`)
  chk('… y la cabecera queda apretada con tres', S.__doc.getElementById('pr-cab').classList.contains('pr-cab--apretada'))
  chk('la misma máquina no hace nada', await S.cambiarDeMaquina('t1') === 'misma')
  chk('en la planilla, tocar M2 abre la planilla de M2', await S.cambiarDeMaquina('t2') === 'cambio' && S.estado.vista === 'pr-planilla' && S.estado.planilla?.turno?.id === 't2')

  S.estado.vista = 'pr-paradas'
  chk('en Paradas de M2, tocar M4 deja en Paradas de M4', await S.cambiarDeMaquina('t4') === 'cambio' && S.estado.vista === 'pr-paradas' && S.estado.planilla?.turno?.id === 't4')
  chk('… y la parada nueva es de M4', S.estado.paradaNueva?.turnoId === 't4', JSON.stringify(S.estado.paradaNueva))

  // El cierre: queda en el cierre de la otra.
  S.mostrarVista('pr-cierre')
  await S.cambiarDeMaquina('t1')
  await tic()
  chk('en Cerrar planilla de M4, tocar M1 deja en Cerrar planilla de M1', S.estado.vista === 'pr-cierre' && S.estado.planilla?.turno?.id === 't1', `${S.estado.vista} ${S.estado.planilla?.turno?.id}`)
})())

esperas.push((async () => {
  // A medio cargar: pregunta antes, y sin "Sí" no cambia.
  const S = armar()
  await S.abrirPlanilla('t1')
  S.mostrarVista('pr-agregar-prod')
  S.estado.agregar = { paso: 'cono', productoId: 'p1' }
  chk('con un producto a medio cargar, pregunta', await S.cambiarDeMaquina('t2') === 'pregunta' && S.estado.confirma?.titulo === '¿Dejar esto sin guardar?')
  chk('… y todavía no cambió', S.estado.planilla?.turno?.id === 't1')
  S.responderConfirma(false)
  chk('con "No" se queda en M1', S.estado.planilla?.turno?.id === 't1' && S.estado.vista === 'pr-agregar-prod')
  await S.cambiarDeMaquina('t2')
  await S.responderConfirma(true)
  await tic()
  chk('con "Sí" pasa a Lo producido de M2', S.estado.planilla?.turno?.id === 't2' && S.estado.vista === 'pr-agregar-prod', `${S.estado.planilla?.turno?.id} ${S.estado.vista}`)

  // Una parada empezada también pregunta.
  S.mostrarVista('pr-paradas')
  S.prepararParadaNueva()
  S.estado.paradaNueva.motivoId = 'mo-x'
  S.estado.paradaNueva.textoLibre = 'algo'
  const r = await S.cambiarDeMaquina('t1')
  chk('con una parada empezada, pregunta', r === 'pregunta' && S.paradaNuevaEmpezada(S.estado.paradaNueva), r)
})())

esperas.push((async () => {
  // Una respuesta vieja no pisa la planilla de la máquina elegida después.
  const S = armar()
  const lento = S.__tablas.turnos_produccion
  let soltar
  const espera = new Promise(r => { soltar = r })
  S.__tablas.turnos_produccion = filtros => {
    const id = filtros.find(f => f[1] === 'id')?.[2]
    if (id === 't1') return espera.then(() => lento(filtros))
    return lento(filtros)
  }
  const a = S.abrirPlanilla('t1')
  await tic()
  await S.abrirPlanilla('t2')
  soltar()
  await a
  await tic()
  chk('la última pestaña tocada gana aunque la anterior conteste después', S.estado.planilla?.turno?.id === 't2', S.estado.planilla?.turno?.id)
})())

esperas.push((async () => {
  // Sala de masa: cambia de máquina sin preguntar (la masa queda guardada).
  const S = armar({ vista: 'pr-receta' })
  S.estado.modo = 'masa'
  S.estado.salaTurno = { id: 't1', lote: 7033, maquinaNombre: 'Máquina 1' }
  const r = await S.cambiarDeMaquina('t4')
  chk('en la receta, cambia de máquina por elegirMaquinaSala, sin preguntar', r === 'sala' && !S.estado.confirma)
  chk('… y la receta pasa a esa máquina', S.estado.salaTurno?.id === 't4', S.estado.salaTurno?.id)
  chk('fuera de una pantalla con pestañas no hace nada', await (async () => { S.estado.vista = 'pr-sala'; return S.cambiarDeMaquina('t2') })() === 'nada')
})())

fin()
