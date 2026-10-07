// DOS PLANILLAS ABIERTAS EN LA MISMA TABLET (07/10/2026) y BORRAR UNA PARADA.
//
// El caso real (06/10/2026, tarde): Facu vio en la planilla de la Máquina 2
// (lote 6222) una parada de 12 minutos —Limpieza de tachos, 15:58 a 16:10—
// que en la base SIEMPRE fue de la Máquina 1 (lote 6221). En la base cada
// planilla tenía la suya (la de la 2 era de 15:40 a 16:12): lo que falló fue
// la PANTALLA.
//
// La causa: recargarPlanilla() (la dispara el tiempo real con cualquier cambio
// de la fábrica, y también guardar una parada) leía la planilla abierta y, al
// volver la respuesta, la ponía en pantalla SIN mirar si mientras tanto se
// había tocado otra máquina. La respuesta de la 1 llegaba después de abrir la
// 2 y la pisaba: la pantalla de la 2 mostraba los datos de la 1, y lo que se
// cargara ahí iba a la 1. Lo mismo en repintarConCola() y en el tiempo real de
// Agregar y Cierre. Ahora una respuesta vieja se tira (planillaSigue).
//
// Y BORRAR: cada parada de la lista de la planilla tiene "Borrar", que abre la
// confirmación (el editor en modo borrar) y manda borrar_parada con p_motivo
// null (la planilla está abierta). En la gestión, Corregir y Borrar a la vista.
//
//   node pruebas/test-produccion-dos-planillas.js
//   ARCHIVO_TEST=<copia de modulos/produccion.html>  ARCHIVO_GESTION=<copia de la gestión>

process.env.TZ = 'UTC'
const path = require('path')
const { arnes, leer } = require('./circuito-comun')
const { construirProduccion, GESTION } = require('./sandbox-produccion')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/produccion.html')
const ARCHIVO_G = process.env.ARCHIVO_GESTION || GESTION
const FUENTE = leer(ARCHIVO)
const FUENTE_G = leer(ARCHIVO_G)
const { chk, esperas, fin } = arnes()

const base = {
  fecha: '2026-10-06', turno: 'Tarde', encargado_id: 'e-fede', abierto_en: '2026-10-06T18:00:00Z', estado: 'abierto',
  forzado_por: null, forzado_en: null, forzado_motivo: null, hora_inicio: '15:00:00', hora_fin: null, hora_largada: null,
}
const TURNOS = {
  t1: { ...base, id: 't1', lote: 6221, maquina_id: 'm1' },
  t2: { ...base, id: 't2', lote: 6222, maquina_id: 'm2' },
}
const PARADAS = [
  { id: 'pa-m1', turno_id: 't1', inicio: '2026-10-06T18:58:00Z', fin: '2026-10-06T19:10:00Z', motivo: 'Limpieza de tachos', categoria: 'programada' },
  { id: 'pa-m2', turno_id: 't2', inicio: '2026-10-06T18:40:00Z', fin: '2026-10-06T19:12:00Z', motivo: 'Limpieza de tachos', categoria: 'programada' },
]

// `demorar` = la lectura de paradas de ese turno queda esperando hasta soltar().
function armar() {
  const S = construirProduccion(ARCHIVO)
  const espera = {}
  S.demorar = (turnoId) => { let soltar; const p = new Promise(r => { soltar = r }); espera[turnoId] = p; return () => soltar() }
  Object.assign(S.__tablas, {
    turnos_produccion: filtros => {
      if (filtros.some(f => f[1] === 'estado')) return { data: [], error: null }
      const id = filtros.find(f => f[0] === 'eq' && f[1] === 'id')?.[2]
      return { data: id && TURNOS[id] ? [TURNOS[id]] : [], error: null }
    },
    turno_operarios: [], masas: [], produccion_items: [],
    paradas_produccion: filtros => {
      const id = filtros.find(f => f[0] === 'eq' && f[1] === 'turno_id')?.[2]
      // La foto se saca al pedir (una lectura demorada vuelve con datos viejos)
      // y la demora vale para la PRÓXIMA lectura de ese turno, no para todas.
      const r = { data: PARADAS.filter(p => p.turno_id === id).map(p => ({ ...p })), error: null }
      const e = espera[id]
      if (!e) return r
      delete espera[id]
      return e.then(() => r)
    },
    maquinas: filtros => {
      const id = filtros.find(f => f[0] === 'eq' && f[1] === 'id')?.[2]
      return { data: [{ id: 'm1', nombre: 'Máquina 1', orden: 1 }, { id: 'm2', nombre: 'Máquina 2', orden: 2 }].filter(m => !id || m.id === id), error: null }
    },
    motivos_parada: [{ id: 'mo-tachos', nombre: 'Limpieza de tachos', categoria: 'programada', pide_detalle: false, orden: 2 }],
    horarios_turno: [{ turno: 'Tarde', hora_inicio: '15:00:00', hora_fin: '23:00:00', activo: true }],
  })
  S.__setRpc(async () => ({ data: null, error: null }))
  S.estado.modo = 'produccion'
  S.estado.persona = { id: 'e-fede', nombre: 'Federico Silva' }
  S.estado.personal = [{ id: 'e-fede', nombre: 'Federico Silva', puestos: ['encargado'] }]
  S.estado.tablero = [{ maquina: { id: 'm1', nombre: 'Máquina 1' }, turno: { id: 't1' } }, { maquina: { id: 'm2', nombre: 'Máquina 2' }, turno: { id: 't2' } }]
  return S
}
const el = (S, id) => S.__doc.getElementById(id)
const html = (S, id) => el(S, id).innerHTML
const tic = () => new Promise(r => setImmediate(r))
const rpcs = (S, n) => S.__llamadas.rpc.filter(([x]) => x === n)

chk('recargarPlanilla() mira que la planilla siga siendo la misma antes de pisarla',
  /const l = await leerPlanilla\(turnoId\)\s*\n\s*if \(!planillaSigue\(turnoId, pedido\)\) return\s*\n\s*estado\.planilla = /.test(FUENTE))
chk('… y repintarConCola() también', /await refrescarListaCola\(\)\s*\n\s*\/\/[^\n]*\n\s*if \(!planillaSigue\(turnoId, pedido\)\) return/.test(FUENTE))
chk('… y el tiempo real de Agregar y Cierre', /const l = await leerPlanilla\(turnoId\)\s*\n\s*if \(planillaSigue\(turnoId, pedido\)\) estado\.planilla = /.test(FUENTE))

esperas.push((async () => {
  // ═══ LA CARRERA: la relectura de la 1 vuelve después de abrir la 2 ════════
  {
    const S = armar()
    await S.abrirPlanilla('t1')
    chk('abierta la Máquina 1: su parada de 15:58', S.estado.planilla.turno.lote === 6221 && /15:58 a 16:10/.test(html(S, 'pr-planilla-paradas')))
    const soltar = S.demorar('t1')
    const relectura = S.recargarPlanilla()   // el tiempo real, con la 1 abierta
    await tic()
    await S.cambiarDeMaquina('t2')          // se toca la pestaña de la 2
    chk('abierta la Máquina 2: su parada de 15:40', S.estado.planilla.turno.lote === 6222 && /15:40 a 16:12/.test(html(S, 'pr-planilla-paradas')))
    soltar()                                 // y recién ahora vuelve la de la 1
    await relectura
    await tic()
    chk('la respuesta vieja de la 1 NO pisa a la 2', S.estado.planilla.turno.id === 't2' && S.estado.planilla.turno.lote === 6222,
      String(S.estado.planilla?.turno?.lote))
    chk('… la pantalla de la 2 no muestra la parada de 15:58 de la 1', !/15:58/.test(html(S, 'pr-planilla-paradas')) && /15:40 a 16:12/.test(html(S, 'pr-planilla-paradas')),
      html(S, 'pr-planilla-paradas'))
    chk('… y una parada nueva va a la 2', S.estado.planilla.turno.id === 't2')
  }

  // ═══ La 1 se relee mientras la 2 todavía se está abriendo ══════════════════
  {
    const S = armar()
    await S.abrirPlanilla('t1')
    const soltar1 = S.demorar('t1')
    const relectura = S.recargarPlanilla()
    await tic()
    const soltar2 = S.demorar('t2')
    const abrir2 = S.abrirPlanilla('t2')
    await tic()
    soltar1()                                // vuelve la 1 con la 2 a medio abrir
    await relectura
    soltar2()
    await abrir2
    await tic()
    chk('la 1 vuelve con la 2 a medio abrir: queda la 2', S.estado.planilla.turno.id === 't2' && !/15:58/.test(html(S, 'pr-planilla-paradas')),
      String(S.estado.planilla?.turno?.lote))
  }

  // ═══ La MISMA planilla abierta de nuevo: la lectura vieja no la pisa ═══════
  {
    const S = armar()
    await S.abrirPlanilla('t1')
    const soltar = S.demorar('t1')
    const vieja = S.recargarPlanilla()      // lee sin la parada nueva
    await tic()
    PARADAS.push({ id: 'pa-nueva', turno_id: 't1', inicio: '2026-10-06T20:00:00Z', fin: '2026-10-06T20:20:00Z', motivo: 'Corte de luz', categoria: 'falla' })
    await S.abrirPlanilla('t1')             // se vuelve a abrir: ya la trae
    chk('… la reapertura trae la parada nueva', /17:00 a 17:20/.test(html(S, 'pr-planilla-paradas')))
    soltar()                                 // y recién ahora vuelve la vieja
    await vieja
    await tic()
    chk('volver a abrir la misma planilla: la lectura vieja no borra la parada nueva', /17:00 a 17:20/.test(html(S, 'pr-planilla-paradas')),
      html(S, 'pr-planilla-paradas'))
    PARADAS.pop()
  }

  // ═══ BORRAR UNA PARADA ════════════════════════════════════════════════════
  {
    const S = armar()
    await S.abrirPlanilla('t1')
    const lista = html(S, 'pr-planilla-paradas')
    chk('cada parada de la planilla tiene "Borrar"', /<button type="button" class="pr-parada-fila__borrar" data-parada-borrar="pa-m1" aria-label="Borrar la parada de las 15:58">Borrar<\/button>/.test(lista), lista)
    chk('… al lado de la parada, que se sigue tocando para corregirla', /<div class="pr-parada-fila"><button type="button" class="pr-parada-item[^"]*" data-parada-editar="pa-m1">/.test(lista))
    S.abrirEditorDesdePlanilla('borrar', 'pa-m1')
    chk('Borrar pide confirmación: el editor en modo borrar, sin mandar nada todavía',
      el(S, 'pr-parada-editor').hidden === false && S.estado.paradaForm.modo === 'borrar' && rpcs(S, 'borrar_parada').length === 0)
    chk('… con el botón "Borrar la parada"', el(S, 'pr-parada-editor-guardar').textContent === 'Borrar la parada')
    chk('… y con la planilla abierta no pide motivo', el(S, 'pr-parada-editor-campo-motivo').hidden === true)
    await S.guardarParada()
    await tic()
    chk('confirmar manda borrar_parada con p_motivo null (planilla abierta)',
      JSON.stringify(rpcs(S, 'borrar_parada')[0]?.[1]) === '{"p_parada_id":"pa-m1","p_motivo":null}', JSON.stringify(rpcs(S, 'borrar_parada')[0]?.[1]))
    // Cancelar no borra nada.
    const C = armar()
    await C.abrirPlanilla('t1')
    C.abrirEditorDesdePlanilla('borrar', 'pa-m1')
    C.cerrarEditorParada()
    chk('cancelar no borra nada', rpcs(C, 'borrar_parada').length === 0 && el(C, 'pr-parada-editor').hidden === true)
    // Una parada que todavía está en la cola no se borra (no llegó a la base).
    const cola = C.htmlParadasTurno([{ id: 'cola:abc', inicio: '2026-10-06T18:00:00Z', fin: '2026-10-06T18:10:00Z', motivo: 'x', cola: { estado: 'pendiente' } }])
    chk('una parada en la cola no tiene "Borrar"', !/data-parada-borrar/.test(cola))
    chk('el clic en "Borrar" cierra la ventana y abre la confirmación',
      /closest\('\[data-parada-borrar\]'\); if \(b\) \{ cerrarVentanaParadas\(\); return abrirEditorDesdePlanilla\('borrar', b\.dataset\.paradaBorrar\) \}/.test(FUENTE))
  }

  // ═══ La gestión: Corregir y Borrar a la vista ═════════════════════════════
  {
    const { extraerFn } = require('./extraer')
    const f = new Function('esc', extraerFn(FUENTE_G, 'htmlAccionesParada') + '\nreturn htmlAccionesParada')(x => String(x))
    const dos = f({ id: 'p1' }, { editar: true, borrar: true })
    chk('gestión: con los dos permisos, Corregir Y Borrar', /data-parada-editar="p1">Corregir</.test(dos) && /data-parada-borrar="p1">Borrar</.test(dos))
    chk('… solo con borrar, solo Borrar', !/Corregir/.test(f({ id: 'p1' }, { editar: false, borrar: true })) && /Borrar/.test(f({ id: 'p1' }, { editar: false, borrar: true })))
    chk('… sin permisos, nada', f({ id: 'p1' }, { editar: false, borrar: false }) === '')
    chk('en la gestión, borrar una parada de una planilla cerrada pide el motivo',
      /return \['borrar_parada', \{ p_parada_id: f\.paradaId, p_motivo: f\.turno\.estado === 'cerrado' \? motivo : null \}\]/.test(FUENTE_G) &&
      /if \(f\.turno\.estado === 'cerrado' && motivo\.length < 3\) faltan\.push\('Escribí por qué se borra/.test(FUENTE_G))
  }
})())

fin()
