// La GESTIÓN de Producción, parte 2 (25/09/2026): la pantalla principal son
// los INDICADORES de indicadores_produccion(unidad), una tarjeta por bloque, y
// arriba el selector de unidad.
//
// Lo que devuelve la RPC salió de su cuerpo (pg_get_functiondef, 25/09/2026):
// { fecha, ahora: [{ maquina, lote, turno, estado, encargado, abierto_en,
// masas, cajas, parada_en_curso: { motivo, desde } | null }],
// cajas_por_producto: [{ producto, hoy, semana_pasada }] (cualquiera null),
// semana: { desde, hasta, turnos, cajas, unidades, masas, masas_modificadas,
// masas_chocolate, scrap_kg, masa_kg, minutos_parada, motivo_parada_mas_comun },
// rendimiento_harina: [{ lote, kg_harina, unidades, unidades_por_kg }],
// pendientes: { planillas_por_completar, turnos_abiertos_de_otro_dia,
// conos_por_revisar } }.
//
// Se EJECUTAN los renders: cada tarjeta con datos, vacía y con error SIN
// romper a las otras; el selector de unidad y su recuerdo; HTML malicioso en
// cada render.
//
//   node pruebas/test-produccion-gestion.js

const path = require('path')
const { arnes, leer, marca, chequearMarcas } = require('./circuito-comun')
const { construirProduccion, GESTION } = require('./sandbox-produccion')

const ARCHIVO = process.env.ARCHIVO_GESTION || process.env.ARCHIVO_TEST || GESTION
const FUENTE = leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

const DESDE = '2026-09-25T13:00:00Z'
const DATOS = {
  fecha: '2026-09-25',
  ahora: [
    { maquina: 'Máquina 1', lote: 7021, turno: 'Mañana', estado: 'abierto', encargado: 'Federico Silva', abierto_en: '2026-09-25T09:00:00Z', masas: 4, cajas: 120, parada_en_curso: null },
    { maquina: 'Máquina 2', lote: 7022, turno: 'Mañana', estado: 'abierto', encargado: 'Agustín Barrera', abierto_en: '2026-09-25T09:00:00Z', masas: 1, cajas: 1, parada_en_curso: { motivo: 'Se trabó la cinta', desde: DESDE } },
    { maquina: 'Máquina 3', lote: 7001, turno: 'Tarde', estado: 'pendiente_completar', encargado: null, abierto_en: '2026-09-24T15:00:00Z', masas: 0, cajas: 0, parada_en_curso: null },
  ],
  cajas_por_producto: [
    { producto: 'Mini', hoy: 50, semana_pasada: 48 },
    { producto: 'Chico', hoy: 10, semana_pasada: 11 },
    { producto: 'Grande', hoy: 7, semana_pasada: 7 },
    { producto: 'Soft', hoy: 5, semana_pasada: null },
    { producto: 'Vaso', hoy: null, semana_pasada: 3 },
  ],
  semana: { desde: '2026-09-19', hasta: '2026-09-25', turnos: 12, cajas: 1500, unidades: 480000, masas: 80, masas_modificadas: 6, masas_chocolate: 9,
    scrap_kg: 25, masa_kg: 2000, minutos_parada: 135, motivo_parada_mas_comun: 'Se trabó la cinta' },
  rendimiento_harina: [
    { lote: 'H-10', kg_harina: 500, unidades: 150000, unidades_por_kg: 300 },
    { lote: 'H-11', kg_harina: 250, unidades: 60000, unidades_por_kg: 240 },
    { lote: 'H-12', kg_harina: 0, unidades: 0, unidades_por_kg: null },
    { lote: 'H-13', kg_harina: 300, unidades: 96000, unidades_por_kg: 320 },
  ],
  pendientes: { planillas_por_completar: 2, turnos_abiertos_de_otro_dia: 1, conos_por_revisar: 3 },
}

function armar({ tareas = [['ver', { todas: true }], ['configurar', { todas: true }]], rpc = null } = {}) {
  const S = construirProduccion(ARCHIVO)
  S.estado.miRolApp = 'usuario'
  S.estado.misTareas = new Map(tareas)
  S.estado.unidades = new Map([['u-cn', 'Cucuruchos Nuss'], ['u-dp', 'Dolce Pasta'], ['u-ta', 'Taller']])
  S.estado.unidadId = 'u-cn'
  S.__setRpc(rpc ?? (async () => ({ data: DATOS, error: null })))
  return S
}
const tarjeta = (html, id) => {
  const i = html.indexOf(`id="pr-ind-${id}"`)
  return i === -1 ? '' : html.slice(i, html.indexOf('</section>', i))
}

// ── Cada tarjeta, con datos ──────────────────────────────────────────────
esperas.push((async () => {
  const S = armar()
  await S.cargarIndicadores()
  const html = S.__doc.getElementById('pr-indicadores').innerHTML
  chk('se pide indicadores_produccion con la unidad elegida', JSON.stringify(S.__llamadas.rpc.find(l => l[0] === 'indicadores_produccion')?.[1]) === '{"p_unidad_negocio_id":"u-cn"}')
  chk('una tarjeta por cada entrada de TARJETAS_INDICADORES', (html.match(/<section class="pr-tarjeta pr-ind"/g) || []).length === S.TARJETAS_INDICADORES.length && S.TARJETAS_INDICADORES.length === 5)
  chk('en el orden del arreglo', S.TARJETAS_INDICADORES.map(t => html.indexOf(`id="pr-ind-${t.id}"`)).every((x, i, a) => x >= 0 && (i === 0 || x > a[i - 1])))

  const ahora = tarjeta(html, 'ahora')
  chk('Ahora: cada máquina con su lote', /Máquina 1 · lote 7021/.test(ahora) && /Máquina 2 · lote 7022/.test(ahora))
  chk('… el encargado, las masas y las cajas', /Federico Silva · 4 masas · 120 cajas/.test(ahora) && /1 masa · 1 caja</.test(ahora), ahora)
  const hora = S.horaArgentina(DESDE)
  chk('… la parada en curso, en bordó, con su motivo y desde cuándo (hora de Argentina)',
    new RegExp(`<div class="pr-ind-parada">Parada desde las ${hora} \\(hace [^)]+\\) · Se trabó la cinta</div>`).test(ahora) && /pr-ind-maq--parada/.test(ahora), ahora)
  chk('… la hora es la de Argentina (10:00 con el reloj en UTC)', hora === '10:00', hora)
  chk('… la pendiente de completar, marcada', /pr-ind-maq--pendiente/.test(ahora) && /Máquina 3 · lote 7001<span class="pr-ind-chip">Pendiente de completar<\/span>/.test(ahora))
  chk('… sin encargado no inventa uno', !/null/.test(ahora))

  const hoy = tarjeta(html, 'hoy')
  const fila = p => (hoy.match(new RegExp(`<tr><td>${p}</td>(.*?)</tr>`)) || [])[1] ?? ''
  chk('Hoy: más que la semana pasada, con +', fila('Mini') === '<td>50</td><td>48</td><td class="pr-ind-mas">+2</td>', fila('Mini'))
  chk('… menos, con −', fila('Chico') === '<td>10</td><td>11</td><td class="pr-ind-menos">−1</td>', fila('Chico'))
  chk('… igual, 0', fila('Grande') === '<td>7</td><td>7</td><td>0</td>', fila('Grande'))
  chk('… sin dato de la semana pasada: "—", nunca un cero inventado', fila('Soft') === '<td>5</td><td>—</td><td>—</td>', fila('Soft'))
  chk('… sin dato de hoy: "—"', fila('Vaso') === '<td>—</td><td>3</td><td>—</td>', fila('Vaso'))

  const sem = tarjeta(html, 'semana')
  chk('Semana: cajas y unidades con formato argentino', /<dt>Cajas<\/dt><dd>1\.500<\/dd>/.test(sem) && /<dt>Unidades<\/dt><dd>480\.000<\/dd>/.test(sem), sem)
  chk('… las masas, con modificadas y de chocolate', /<dt>Masas<\/dt><dd>80<span class="pr-ind-dato__nota">6 modificadas · 9 de chocolate<\/span>/.test(sem))
  chk('… el scrap en kg y en % de la masa', /<dt>Scrap<\/dt><dd>25,0 kg<span class="pr-ind-dato__nota">1,3 % de la masa<\/span>/.test(sem), sem)
  chk('… los minutos de parada en h y min, y el motivo más común', /<dt>Paradas<\/dt><dd>2 h 15 min<span class="pr-ind-dato__nota">La más común: Se trabó la cinta<\/span>/.test(sem))

  const ren = tarjeta(html, 'rendimiento')
  const lotes = [...ren.matchAll(/<tr[^>]*><td>(H-\d+)<\/td>/g)].map(m => m[1])
  chk('Rendimiento: del peor al mejor, los sin dato al final', JSON.stringify(lotes) === '["H-11","H-10","H-13","H-12"]', lotes.join(','))
  chk('… el peor en bordó', /<tr class="pr-ind--peor"><td>H-11<\/td>/.test(ren) && (ren.match(/pr-ind--peor/g) || []).length === 1)
  chk('… con las unidades por kg', /<td>240,0<\/td>/.test(ren) && /<td>H-12<\/td><td>0<\/td><td>0<\/td><td>—<\/td>/.test(ren), ren)

  const pen = tarjeta(html, 'pendientes')
  chk('Pendientes: los tres números', /pr-ind-pend__n pr-ind-pend__n--hay">2</.test(pen) && /--hay">1</.test(pen) && /--hay">3</.test(pen))
  chk('… cada uno con su botón', /data-ind-ir="pendientes"/.test(pen) && /data-ind-ir="abiertos"/.test(pen) && /data-ind-ir="conos"/.test(pen))
  chk('… no hay ningún botón que lleve a la planta', !/produccion\.html/.test(pen))
})())

// ── Vacías: un texto propio por tarjeta ──────────────────────────────────
{
  const S = armar()
  const v = { ahora: [], cajas_por_producto: [], semana: { turnos: 0, cajas: 0, unidades: 0, masas: 0, masas_modificadas: 0, masas_chocolate: 0, scrap_kg: 0, masa_kg: 0, minutos_parada: 0, motivo_parada_mas_comun: null },
    rendimiento_harina: [], pendientes: { planillas_por_completar: 0, turnos_abiertos_de_otro_dia: 0, conos_por_revisar: 0 } }
  const html = S.htmlIndicadores(v, null)
  chk('Ahora vacío', /No hay ninguna máquina abierta ahora/.test(tarjeta(html, 'ahora')))
  chk('Hoy vacío', /Ni hoy ni el mismo día de la semana pasada/.test(tarjeta(html, 'hoy')))
  chk('Semana en cero: la masa en 0 da "—" en el %, nunca una división', /<dd>0,0 kg<span class="pr-ind-dato__nota">— de la masa/.test(tarjeta(html, 'semana')), tarjeta(html, 'semana'))
  chk('… sin motivo que se repita, lo dice', /Sin un motivo que se repita/.test(tarjeta(html, 'semana')))
  chk('Rendimiento vacío', /Todavía no hay turnos cerrados con harina/.test(tarjeta(html, 'rendimiento')))
  chk('Pendientes en cero: sin botones', !/data-ind-ir/.test(tarjeta(html, 'pendientes')))
  chk('ninguna vacía dice "No se pudo leer"', !/No se pudo leer/.test(html))
  // Datos que faltan dentro de un bloque: "—", no 0.
  const s2 = S.renderSemana({ semana: { turnos: null, cajas: null, unidades: undefined, masas: null, scrap_kg: null, masa_kg: 10, minutos_parada: null } })
  chk('semana con nulls: "—" en cada uno, ningún 0 inventado', !/<dd>0/.test(s2) && (s2.match(/<dd>—/g) || []).length >= 5, s2)
}

// ── Una tarjeta mal no rompe a las otras ─────────────────────────────────
{
  const S = armar()
  const html = S.htmlIndicadores({ ...DATOS, ahora: 'no es una lista', semana: null, pendientes: [1, 2] }, null)
  chk('ahora malformado: esa tarjeta dice "No se pudo leer"', /No se pudo leer/.test(tarjeta(html, 'ahora')))
  const h3 = S.htmlIndicadores({ ...DATOS, ahora: {}, semana: 'texto' }, null)
  chk('ahora como objeto: "No se pudo leer", no "no hay máquinas"', /No se pudo leer/.test(tarjeta(h3, 'ahora')) && !/No hay ninguna/.test(tarjeta(h3, 'ahora')))
  chk('semana como texto: "No se pudo leer", no una fila de rayas', /No se pudo leer/.test(tarjeta(h3, 'semana')))
  chk('semana null: "No se pudo leer"', /No se pudo leer/.test(tarjeta(html, 'semana')))
  chk('pendientes que no es un objeto: "No se pudo leer"', /No se pudo leer/.test(tarjeta(html, 'pendientes')))
  chk('… y las otras se ven bien', /Mini/.test(tarjeta(html, 'hoy')) && /H-11/.test(tarjeta(html, 'rendimiento')) && !/No se pudo leer/.test(tarjeta(html, 'hoy')))
  // Un render que TIRA tampoco rompe: se ataja por tarjeta.
  const T = S.TARJETAS_INDICADORES
  const viejo = T[1].render
  T[1].render = () => { throw new Error('boom') }
  const h2 = S.htmlIndicadores(DATOS, null)
  T[1].render = viejo
  chk('un render que tira: esa tarjeta dice "No se pudo leer" y las otras se ven', /No se pudo leer/.test(tarjeta(h2, 'hoy')) && /Máquina 1/.test(tarjeta(h2, 'ahora')))
  chk('sin datos (null): todas dicen "No se pudo leer", sin romper', (S.htmlIndicadores(null, null).match(/No se pudo leer/g) || []).length === 5)
}

// ── Si la RPC entera falla: cada tarjeta dice el error ───────────────────
esperas.push((async () => {
  const S = armar({ rpc: async () => ({ data: null, error: { message: 'No tenés permiso para ver los indicadores de esta unidad.' } }) })
  await S.cargarIndicadores()
  const html = S.__doc.getElementById('pr-indicadores').innerHTML
  chk('RPC con error: las cinco tarjetas lo dicen', (html.match(/No tenés permiso para ver los indicadores de esta unidad\./g) || []).length === 5)
  chk('… y la página sigue: las tarjetas están', (html.match(/pr-tarjeta pr-ind"/g) || []).length === 5)
  const T = armar({ rpc: async () => { throw new Error('') } })
  await T.cargarIndicadores()
  chk('la llamada tira sin mensaje: un texto propio', /No se pudieron leer los indicadores/.test(T.__doc.getElementById('pr-indicadores').innerHTML))
  // Una respuesta vieja no pisa la nueva.
  let soltar
  const vieja = new Promise(r => { soltar = r })
  let n = 0
  const V = armar({ rpc: async () => (++n === 1 ? vieja : { data: DATOS, error: null }) })
  const p1 = V.cargarIndicadores()
  V.estado.unidadId = 'u-dp'
  await V.cargarIndicadores()
  soltar({ data: { ...DATOS, ahora: [{ maquina: 'VIEJA', lote: 1 }] }, error: null })
  await p1
  chk('la respuesta que llega tarde no pisa la nueva', !/VIEJA/.test(V.__doc.getElementById('pr-indicadores').innerHTML))
  // Sin unidad no se pide nada.
  const U = armar()
  U.estado.unidadId = null
  await U.cargarIndicadores()
  chk('sin unidad no se pide nada', U.__llamadas.rpc.length === 0)
})())

// ── El selector de unidad y su recuerdo ──────────────────────────────────
esperas.push((async () => {
  const S = armar({ tareas: [['ver', { unidades: ['u-cn'] }], ['configurar', { unidades: ['u-dp'] }]] })
  chk('las unidades: las de ver y las de configurar', JSON.stringify(S.unidadesDeGestion()) === '["u-cn","u-dp"]', JSON.stringify(S.unidadesDeGestion()))
  S.pintarSelectorGestion()
  chk('con dos, el selector se ve', S.__doc.getElementById('pr-gestion-unidad-campo').hidden === false &&
    (S.__doc.getElementById('pr-gestion-unidad').innerHTML.match(/<option /g) || []).length === 2)
  S.estado.vista = 'pr-inicio'
  chk('elegir una unidad posible', S.elegirUnidadGestion('u-dp') === true && S.estado.unidadId === 'u-dp')
  chk('… se recuerda en localStorage', S.localStorage.getItem('produccion.gestion.unidad') === 'u-dp')
  await new Promise(r => setImmediate(r))
  chk('… y se vuelven a pedir los indicadores de ESA unidad', S.__llamadas.rpc.some(l => l[0] === 'indicadores_produccion' && l[1].p_unidad_negocio_id === 'u-dp'))
  chk('una unidad que no es posible no se elige', S.elegirUnidadGestion('u-ta') === false && S.estado.unidadId === 'u-dp')
  chk('la guardada, si todavía se puede', S.unidadGestionInicial(['u-cn', 'u-dp'], 'u-dp') === 'u-dp')
  chk('la guardada que ya no se puede: la primera', S.unidadGestionInicial(['u-cn', 'u-dp'], 'u-ta') === 'u-cn')
  chk('sin guardada: la primera', S.unidadGestionInicial(['u-cn'], null) === 'u-cn')
  chk('sin unidades: null', S.unidadGestionInicial([], 'u-cn') === null)
  const U = armar({ tareas: [['ver', { unidades: ['u-cn'] }]] })
  U.pintarSelectorGestion()
  chk('con una sola unidad, el selector no se ve', U.__doc.getElementById('pr-gestion-unidad-campo').hidden === true)
  const L = armar()
  L.localStorage.setItem = () => { throw new Error('bloqueado') }
  let tiro = false
  try { L.elegirUnidadGestion('u-dp') } catch { tiro = true }
  chk('localStorage bloqueado: elegir no tira', !tiro && L.estado.unidadId === 'u-dp')
  chk('el arranque toma la guardada con leerPreferencia (try/catch)', /estado\.unidadId = unidadGestionInicial\(unidadesDeGestion\(\), leerPreferencia\(CLAVE_UNIDAD_GESTION\)\)/.test(FUENTE))
  // La unidad elegida manda en lo que se abre después.
  const H = armar()
  H.estado.historial = { unidadId: 'u-cn' }
  H.elegirUnidadGestion('u-ta')
  chk('el historial abre en la unidad elegida', H.estado.historial.unidadId === 'u-ta' && H.estado.stockUnidad === 'u-ta')
})())

// ── A dónde llevan los pendientes ───────────────────────────────────────
esperas.push((async () => {
  const S = armar()
  S.__tablas.maquinas = []
  S.__tablas.turnos_produccion = []
  await S.irDesdeIndicador('pendientes')
  chk('planillas pendientes → el historial filtrado por pendientes de completar', S.estado.vista === 'pr-historial' && S.estado.historial.estado === 'pendiente_completar')
  chk('… de la unidad elegida', S.estado.historial.unidadId === 'u-cn')
  await S.irDesdeIndicador('abiertos')
  chk('turnos abiertos de otro día → el historial con los abiertos', S.estado.historial.estado === 'abierto')
  S.__tablas.marcas_personalizadas = []
  await S.irDesdeIndicador('conos')
  chk('conos → Configuración, en Marcas / Conos', S.estado.vista === 'pr-config' && S.estado.config.tab === 'marcas')
  const V = armar({ tareas: [['ver', { todas: true }]] })
  chk('sin configurar, el botón de conos no está: dice quién los revisa', !/data-ind-ir="conos"/.test(V.renderPendientes(DATOS)) && /Los revisa quien configura/.test(V.renderPendientes(DATOS)))
})())

// ── HTML malicioso en cada render ────────────────────────────────────────
{
  const S = armar()
  const d = {
    ahora: [{ maquina: marca('maquina'), lote: marca('lote'), turno: marca('turno'), estado: 'pendiente_completar', encargado: marca('encargado'), masas: 1, cajas: 2,
      parada_en_curso: { motivo: marca('motivo'), desde: DESDE } }],
    cajas_por_producto: [{ producto: marca('producto'), hoy: 1, semana_pasada: 2 }],
    semana: { turnos: 1, cajas: 1, unidades: 1, masas: 1, masas_modificadas: 0, masas_chocolate: 0, scrap_kg: 1, masa_kg: 2, minutos_parada: 3, motivo_parada_mas_comun: marca('motivoComun') },
    rendimiento_harina: [{ lote: marca('loteHarina'), kg_harina: 1, unidades: 2, unidades_por_kg: 2 }],
    pendientes: { planillas_por_completar: 1, turnos_abiertos_de_otro_dia: 1, conos_por_revisar: 1 },
  }
  const html = S.htmlIndicadores(d, null)
  chequearMarcas(chk, 'indicadores', html, ['maquina', 'lote', 'turno', 'encargado', 'motivo', 'producto', 'motivoComun', 'loteHarina'])
  chequearMarcas(chk, 'error de la RPC', S.htmlIndicadores(null, marca('error')), ['error'])
  S.estado.unidades = new Map([[marca('unidadId'), marca('unidadNombre')], ['u-2', 'Otra']])
  S.estado.misTareas = new Map([['ver', { todas: true }]])
  S.estado.unidadId = null
  S.pintarSelectorGestion()
  chequearMarcas(chk, 'selector de unidad', S.__doc.getElementById('pr-gestion-unidad').innerHTML, ['unidadId', 'unidadNombre'])
}

// ── La pantalla ──────────────────────────────────────────────────────────
{
  chk('la gestión no tiene nada de la tablet', !/id="pr-barra"|id="pr-quien"|id="pr-planilla"|id="pr-sala"|id="pr-receta"/.test(FUENTE))
  chk('"‹ Volver" al inicio de la app, arriba', /<a href="\.\.\/dashboard\.html" class="pr-header__volver" id="pr-gestion-volver"/.test(FUENTE))
  for (const tab of ['personal', 'recetas', 'ingredientes', 'productos', 'empaque', 'marcas']) {
    chk(`acceso directo a Configuración → ${tab}`, new RegExp(`data-ir-config="${tab}"`).test(FUENTE))
  }
  chk('acceso a las planillas pendientes', /data-ir-pendientes id="pr-btn-ir-pendientes"/.test(FUENTE))
  chk('los accesos de configuración, solo con configurar', /for \(const b of document\.querySelectorAll\('\[data-ir-config\]'\)\) b\.hidden = !tieneTarea\('configurar'\)/.test(FUENTE))
  const css = FUENTE.slice(FUENTE.indexOf('<style>'), FUENTE.indexOf('</style>'))
  const ini = css.indexOf('/* ── LA GESTIÓN: TAMAÑOS DE LA APP')
  chk('tamaños de la app, al final del <style>', ini > 0 && /body \{ --pr-alto-boton: 44px; font-size: 15px; \}/.test(css.slice(ini)))
  chk('las tarjetas de indicadores en grilla que se acomoda al celular', /\.pr-indicadores \{[^}]*repeat\(auto-fit, minmax\(min\(100%, 22rem\), 1fr\)\)/.test(css.slice(ini)))
  chk('los números van con formatearNumeroAr', /formatearNumeroAr\(numeroInd\(v\), \{ decimales: 0 \}\)/.test(FUENTE))
}

fin()
