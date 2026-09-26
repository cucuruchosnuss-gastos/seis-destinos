// La GESTIÓN de Producción: la pantalla principal son los INDICADORES de
// indicadores_produccion(unidad, fecha), una tarjeta por bloque, con el
// diseño "Producción · Gestión" (26/09/2026).
//
// Lo que devuelve la RPC salió de su cuerpo (pg_get_functiondef, 26/09/2026):
// { fecha, ahora: [{ maquina, lote, turno, estado, encargado, abierto_en,
// masas, cajas, parada_en_curso: { motivo, desde } | null }],
// cajas_por_producto: [{ producto, hoy, semana_pasada }] — un null ahí es
// `sum(...) filter (where ...)` sin renglones: ese día ese producto no salió,
// semana: { desde, hasta, turnos, cajas, unidades, masas, masas_modificadas,
// masas_chocolate, scrap_kg, masa_kg, minutos_parada, motivo_parada_mas_comun },
// rendimiento_harina: [{ producto, lote, kg_harina, unidades, unidades_por_kg,
// promedio_del_producto, diferencia_pct }] (por producto),
// scrap_por_lote: [{ lote, scrap_pct }],
// pendientes: { planillas_por_completar, turnos_abiertos_de_otro_dia,
// conos_por_revisar } }.
//
// Se EJECUTAN los renders: cada tarjeta con datos, vacía y con error SIN
// romper a las otras; la regla del 10 % del rendimiento; el orden de las
// tarjetas (el del celular); el día; el selector de unidad y su recuerdo; los
// números del menú; HTML malicioso en cada render.
//
//   node pruebas/test-produccion-gestion.js

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
    { producto: 'Mini', lote: 'H-10', kg_harina: 500, unidades: 150000, unidades_por_kg: 300, promedio_del_producto: 286.7, diferencia_pct: 4.6 },
    { producto: 'Mini', lote: 'H-11', kg_harina: 250, unidades: 60000, unidades_por_kg: 240, promedio_del_producto: 286.7, diferencia_pct: -16.3 },
    { producto: 'Mini', lote: 'H-12', kg_harina: 0, unidades: 0, unidades_por_kg: null, promedio_del_producto: 286.7, diferencia_pct: null },
    { producto: 'Mini', lote: 'H-13', kg_harina: 300, unidades: 96000, unidades_por_kg: 320, promedio_del_producto: 286.7, diferencia_pct: 11.6 },
    { producto: 'Grande', lote: 'H-20', kg_harina: 100, unidades: 15000, unidades_por_kg: 150, promedio_del_producto: 160, diferencia_pct: -6.3 },
    { producto: 'Grande', lote: 'H-21', kg_harina: 100, unidades: 17000, unidades_por_kg: 170, promedio_del_producto: 160, diferencia_pct: 6.3 },
  ],
  scrap_por_lote: [{ lote: 'H-10', scrap_pct: 12.4 }, { lote: 'H-11', scrap_pct: null }, { lote: 'H-13', scrap_pct: 5.1 }],
  pendientes: { planillas_por_completar: 2, turnos_abiertos_de_otro_dia: 1, conos_por_revisar: 3 },
}

// EL ORDEN DEL CELULAR (decisión de Facu, 26/09/2026): Ahora · Hoy ·
// Pendientes · Semana · Rendimiento, y después el scrap.
const ORDEN = ['ahora', 'hoy', 'pendientes', 'semana', 'rendimiento', 'scrap']

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
const NO_CARGO = /Esta tarjeta no se pudo cargar\. Las demás están bien\./

// ── Cada tarjeta, con datos ──────────────────────────────────────────────
esperas.push((async () => {
  const S = armar()
  await S.cargarIndicadores()
  const html = S.__doc.getElementById('pr-indicadores').innerHTML
  chk('se pide indicadores_produccion con la unidad elegida y sin fecha (hoy la pone la base)', JSON.stringify(S.__llamadas.rpc.find(l => l[0] === 'indicadores_produccion')?.[1]) === '{"p_unidad_negocio_id":"u-cn"}')
  chk('una tarjeta por cada entrada de TARJETAS_INDICADORES', (html.match(/<section class="pr-tarjeta pr-ind[ "]/g) || []).length === S.TARJETAS_INDICADORES.length && S.TARJETAS_INDICADORES.length === 6)
  chk('el orden del arreglo es el del celular: Ahora · Hoy · Pendientes · Semana · Rendimiento · Scrap', JSON.stringify(S.TARJETAS_INDICADORES.map(t => t.id)) === JSON.stringify(ORDEN), S.TARJETAS_INDICADORES.map(t => t.id).join(','))
  chk('… y se dibujan en ese orden', ORDEN.map(id => html.indexOf(`id="pr-ind-${id}"`)).every((x, i, a) => x >= 0 && (i === 0 || x > a[i - 1])))
  chk('ninguna regla de CSS reordena las tarjetas (el orden es uno solo)', !/\.pr-ind[^{]*\{[^}]*\border\s*:/.test(FUENTE) && !/#pr-ind-[a-z]+[^{]*\{[^}]*\border\s*:/.test(FUENTE))
  chk('rendimiento va a lo ancho', /<section class="pr-tarjeta pr-ind pg-ind--ancha" id="pr-ind-rendimiento"/.test(html))

  const ahora = tarjeta(html, 'ahora')
  chk('Ahora: el contexto dice cuántas', /<span class="pg-ind__ctx">2 máquinas abiertas · 1 pendiente<\/span>/.test(ahora))
  chk('… cada máquina con su lote', /Máquina 1 · lote 7021/.test(ahora) && /Máquina 2 · lote 7022/.test(ahora))
  chk('… las paradas PRIMERO', ahora.indexOf('Máquina 2') < ahora.indexOf('Máquina 1') && ahora.indexOf('Máquina 2') >= 0)
  chk('… el turno, el encargado y las masas; las cajas a la derecha', /Mañana · Federico Silva · 4 masas<\/div>/.test(ahora) && /<span class="pg-maq__cajas">120 cajas<\/span>/.test(ahora), ahora)
  const hora = S.horaArgentina(DESDE)
  chk('… la parada en curso: chip PARADA (el color no va solo), el motivo y desde cuándo (hora de Argentina)',
    new RegExp(`<div class="pr-ind-parada">(Hace [^<·]+ · )?desde las ${hora} · Se trabó la cinta</div>`).test(ahora) &&
    /pr-ind-maq--parada/.test(ahora) && /<span class="pg-chip pg-chip--parada">PARADA<\/span>/.test(ahora), ahora)
  chk('… la hora es la de Argentina (10:00 con el reloj en UTC)', hora === '10:00', hora)
  chk('… una parada dice sus masas y cajas en la línea chica', /Mañana · Agustín Barrera · 1 masa · 1 caja<\/div>/.test(ahora))
  chk('… la pendiente de completar, marcada', /pr-ind-maq--pendiente/.test(ahora) && /Máquina 3 · lote 7001<\/span><span class="pr-ind-chip">Pendiente de completar<\/span>/.test(ahora))
  chk('… sin encargado no inventa uno', !/null|undefined/.test(ahora))

  const hoy = tarjeta(html, 'hoy')
  const fila = p => (hoy.match(new RegExp(`<li class="pg-prod"><span class="pg-prod__nombre">${p}</span>(.*?)</li>`)) || [])[1] ?? ''
  chk('Hoy: el contexto es el mismo día de la semana pasada', /<span class="pg-ind__ctx">vs\. viernes pasado<\/span>/.test(hoy), hoy.slice(0, 200))
  chk('… el total grande con su diferencia (72 contra 69)', /<span class="pg-total__n">72<\/span><span class="pg-total__u">cajas<\/span><span class="pg-dif pr-ind-mas">▲ \+3<\/span>/.test(hoy), hoy.slice(0, 400))
  chk('… más que la semana pasada: ▲ + (la flecha, no solo el color)', fila('Mini') === '<span class="pg-prod__cajas">50<span class="pg-prod__u"> cajas</span></span><span class="pg-dif pr-ind-mas">▲ +2</span>', fila('Mini'))
  chk('… menos: ▼ −', fila('Chico') === '<span class="pg-prod__cajas">10<span class="pg-prod__u"> cajas</span></span><span class="pg-dif pr-ind-menos">▼ −1</span>', fila('Chico'))
  chk('… igual: = 0', fila('Grande') === '<span class="pg-prod__cajas">7<span class="pg-prod__u"> cajas</span></span><span class="pg-dif pr-ind-igual">= 0</span>', fila('Grande'))
  chk('… la semana pasada no salió (null de la suma): se compara contra cero', fila('Soft') === '<span class="pg-prod__cajas">5<span class="pg-prod__u"> cajas</span></span><span class="pg-dif pr-ind-mas">▲ +5</span>', fila('Soft'))
  chk('… hoy no salió: "—" en las cajas (no un 0) y la diferencia se calcula', fila('Vaso') === '<span class="pg-prod__cajas">—</span><span class="pg-dif pr-ind-menos">▼ −3</span>', fila('Vaso'))
  // Un valor que NO es un número sigue siendo "no se sabe": nunca un cero.
  const raro = S.renderHoy({ fecha: '2026-09-25', cajas_por_producto: [{ producto: 'Mini', hoy: 4, semana_pasada: 'x' }] })
  chk('un dato que no es un número: la diferencia y el total dicen "—", nunca un cero inventado',
    /<span class="pg-total__n">4<\/span><span class="pg-total__u">cajas<\/span><span class="pg-dif">—<\/span>/.test(raro) && /Mini<\/span><span class="pg-prod__cajas">4<span class="pg-prod__u"> cajas<\/span><\/span><span class="pg-dif">—<\/span>/.test(raro), raro)

  const sem = tarjeta(html, 'semana')
  chk('Semana: el contexto con los días', /<span class="pg-ind__ctx">sáb 19 – vie 25\/09<\/span>/.test(sem))
  chk('… cajas y unidades grandes, con formato argentino', /<span class="pg-grande__n">1\.500<\/span> cajas/.test(sem) && /<span class="pg-grande__n">480\.000<\/span> unidades/.test(sem), sem)
  chk('… los turnos', /Turnos<\/span><span class="pg-renglon__val"><strong>12<\/strong><\/span>/.test(sem))
  chk('… las masas, con modificadas y de chocolate', /Masas<\/span><span class="pg-renglon__val"><strong>80<\/strong> · 6 modificadas · 9 de chocolate<\/span>/.test(sem), sem)
  chk('… el scrap en kg y en % de la masa', /Scrap<\/span><span class="pg-renglon__val"><strong>25 kg<\/strong> · 1,3 % de la masa<\/span>/.test(sem), sem)
  chk('… los minutos de parada en h y min, y el motivo más común', /Paradas<\/span><span class="pg-renglon__val"><strong>2 h 15 min<\/strong> · más común: Se trabó la cinta<\/span>/.test(sem))

  const ren = tarjeta(html, 'rendimiento')
  const lotes = [...ren.matchAll(/<span class="pg-rend__lote">Lote (H-\d+)<\/span>/g)].map(m => m[1])
  chk('Rendimiento: por producto, y adentro de peor a mejor con los sin dato al final', JSON.stringify(lotes) === '["H-11","H-10","H-13","H-12","H-20","H-21"]', lotes.join(','))
  chk('… cada producto dice su promedio', /<strong>Mini<\/strong><span class="pg-rend__prom">promedio 286,7 u\/kg<\/span>/.test(ren) && /<strong>Grande<\/strong><span class="pg-rend__prom">promedio 160 u\/kg<\/span>/.test(ren), ren.slice(0, 600))
  chk('… el que rinde más de 10 % menos que SU producto, en bordó y con la frase', /<li class="pg-rend pg-rend--bajo"><span class="pg-rend__lote">Lote H-11<\/span>/.test(ren) &&
    /Rinde 16,3 % menos que el promedio de Mini\./.test(ren) && (ren.match(/pg-rend--bajo/g) || []).length === 1)
  chk('… el mejor de cada producto marcado', /pg-rend--mejor"><span class="pg-rend__lote">Lote H-13/.test(ren) && /pg-rend--mejor"><span class="pg-rend__lote">Lote H-21/.test(ren))
  chk('… un −6,3 % NO es "rinde poco"', /pg-rend--medio"><span class="pg-rend__lote">Lote H-20/.test(ren))
  chk('… sin dato: "—", sin barra y nunca 0', /Lote H-12<\/span><span class="pg-rend__barra"><\/span><span class="pg-rend__valor">—<\/span>/.test(ren), ren)
  chk('… con las unidades por kg', /<span class="pg-rend__valor">240 u\/kg<\/span>/.test(ren) && /<span class="pg-rend__valor">320 u\/kg<\/span>/.test(ren))
  chk('… la barra es proporcional al mejor del grupo', /Lote H-13<\/span><span class="pg-rend__barra"><span class="pg-rend__relleno" style="width: 100%">/.test(ren) &&
    /Lote H-11<\/span><span class="pg-rend__barra"><span class="pg-rend__relleno" style="width: 75%">/.test(ren))
  chk('… y explica qué se mide y que más es mejor', /Cuántos cucuruchos salen de cada kilo de harina, por lote\. <strong>Más es mejor\.<\/strong>/.test(ren))

  const scr = tarjeta(html, 'scrap')
  chk('Scrap por lote: cada lote con su % de la masa', /Lote H-10<\/span>[\s\S]*?<span class="pg-rend__valor">12,4 %<\/span>/.test(scr) && /Lote H-13<\/span>[\s\S]*?5,1 %/.test(scr))
  chk('… sin dato: "—", nunca 0 %', /Lote H-11<\/span><span class="pg-rend__barra"><\/span><span class="pg-rend__valor">—<\/span>/.test(scr) && !/>0 %</.test(scr))
  chk('… neutro: sin bordó (no hay un umbral decidido)', !/pg-rend--bajo/.test(scr))

  const pen = tarjeta(html, 'pendientes')
  chk('Pendientes: el turno abierto de otro día PRIMERO y en bordó', /^[^]*?<button type="button" class="pg-pend pg-pend--grave" data-ind-ir="abiertos"><span class="pg-pend__n">1<\/span>/.test(pen) &&
    pen.indexOf('data-ind-ir="abiertos"') < pen.indexOf('data-ind-ir="pendientes"'))
  chk('… las planillas y los conos, cada uno con su botón y su número', /data-ind-ir="pendientes"><span class="pg-pend__n">2<\/span>/.test(pen) && /data-ind-ir="conos"><span class="pg-pend__n">3<\/span>/.test(pen))
  chk('… no hay ningún botón que lleve a la planta', !/produccion\.html/.test(pen))
})())

// ── LA REGLA DEL 10 % (decisión de Facu, 26/09/2026) ─────────────────────
{
  const S = armar()
  chk('el umbral es −10 y nada más', S.UMBRAL_RINDE_POCO === -10)
  chk('−9,9 % NO rinde poco', S.rindePoco({ diferencia_pct: -9.9 }) === false)
  chk('−10 % justo NO rinde poco (es estricto)', S.rindePoco({ diferencia_pct: -10 }) === false)
  chk('−10,1 % SÍ rinde poco', S.rindePoco({ diferencia_pct: -10.1 }) === true)
  chk('null NO se marca', S.rindePoco({ diferencia_pct: null }) === false && S.rindePoco({}) === false && S.rindePoco({ diferencia_pct: '' }) === false && S.rindePoco(null) === false)
  chk('un texto que no es un número tampoco', S.rindePoco({ diferencia_pct: 'x' }) === false)
  const h = S.renderRendimiento({ rendimiento_harina: [
    { producto: 'Mini', lote: 'A', unidades_por_kg: 290, promedio_del_producto: 300, diferencia_pct: -9.9 },
    { producto: 'Mini', lote: 'B', unidades_por_kg: 269, promedio_del_producto: 300, diferencia_pct: -10.1 },
    { producto: 'Mini', lote: 'C', unidades_por_kg: 330, promedio_del_producto: 300, diferencia_pct: null },
  ] })
  chk('en pantalla: el de −10,1 % en bordó', /<li class="pg-rend pg-rend--bajo"><span class="pg-rend__lote">Lote B<\/span>/.test(h))
  chk('… el de −9,9 % no', !/pg-rend--bajo"><span class="pg-rend__lote">Lote A</.test(h) && /pg-rend--medio"><span class="pg-rend__lote">Lote A</.test(h))
  chk('… el de diferencia null no, y no se pinta como 0', !/pg-rend--bajo"><span class="pg-rend__lote">Lote C</.test(h) && !/Rinde 0/.test(h) && !/[^,\d]0 % menos/.test(h), h)
  chk('… un solo bordó', (h.match(/pg-rend--bajo/g) || []).length === 1)
  chk('… la frase con el % en formato argentino', /Rinde 10,1 % menos que el promedio de Mini\./.test(h))
  // Un solo lote con dato: no hay "mejor" contra quién comparar.
  const uno = S.renderRendimiento({ rendimiento_harina: [{ producto: 'Mini', lote: 'A', unidades_por_kg: 300, promedio_del_producto: 300, diferencia_pct: 0 }] })
  chk('con un solo lote no se marca ningún "mejor"', !/pg-rend--mejor/.test(uno))
}

// ── Vacías: un texto propio por tarjeta ──────────────────────────────────
{
  const S = armar()
  const v = { fecha: S.hoyArgentina(), ahora: [], cajas_por_producto: [], semana: { turnos: 0, cajas: 0, unidades: 0, masas: 0, masas_modificadas: 0, masas_chocolate: 0, scrap_kg: 0, masa_kg: 0, minutos_parada: 0, motivo_parada_mas_comun: null },
    rendimiento_harina: [], scrap_por_lote: [], pendientes: { planillas_por_completar: 0, turnos_abiertos_de_otro_dia: 0, conos_por_revisar: 0 } }
  const html = S.htmlIndicadores(v, null)
  chk('Ahora vacío', /<p class="pg-ind-sin__que">Ninguna máquina abierta<\/p>/.test(tarjeta(html, 'ahora')))
  chk('Hoy vacío, en el día de hoy', /<p class="pg-ind-sin__que">Hoy no se produjo<\/p>/.test(tarjeta(html, 'hoy')))
  chk('Semana sin turnos: lo dice, sin una fila de ceros', /Sin producción esta semana/.test(tarjeta(html, 'semana')) && !/pg-grande/.test(tarjeta(html, 'semana')))
  chk('Rendimiento vacío', /Sin turnos cerrados con harina/.test(tarjeta(html, 'rendimiento')) && !/pg-rend__lista/.test(tarjeta(html, 'rendimiento')))
  chk('Scrap vacío', /Sin turnos cerrados con harina/.test(tarjeta(html, 'scrap')))
  chk('Pendientes en cero: "Nada pendiente" en verde, sin botones', /<strong>Nada pendiente<\/strong>/.test(tarjeta(html, 'pendientes')) && !/data-ind-ir/.test(tarjeta(html, 'pendientes')))
  chk('ninguna vacía dice que no se pudo cargar', !NO_CARGO.test(html) && !/Reintentar/.test(html))
  // Hoy no salió nada: se dice qué pasó el mismo día de la semana pasada.
  const hs = S.renderHoy({ fecha: '2026-09-25', cajas_por_producto: [{ producto: 'Mini', hoy: null, semana_pasada: 40 }, { producto: 'Chico', hoy: null, semana_pasada: 2 }] })
  chk('otro día sin producción: "Ese día no se produjo" y cuánto salió el viernes pasado', /Ese día no se produjo/.test(hs) && /El viernes pasado salieron 42 cajas\./.test(hs), hs)
  const hs2 = S.renderHoy({ fecha: '2026-09-25', cajas_por_producto: [{ producto: 'Mini', hoy: null, semana_pasada: null }] })
  chk('… y si la semana pasada tampoco', /El viernes pasado tampoco\./.test(hs2))
  // Datos que faltan dentro de un bloque: "—", no 0.
  const s2 = S.renderSemana({ semana: { turnos: null, cajas: null, unidades: undefined, masas: null, scrap_kg: null, masa_kg: 10, minutos_parada: null } })
  chk('semana con nulls: "—" en cada uno, ningún 0 inventado', !/>0</.test(s2) && (s2.match(/>—</g) || []).length >= 5, s2)
  const s3 = S.renderSemana({ semana: { turnos: 2, cajas: 1, unidades: 1, masas: 1, scrap_kg: 3, masa_kg: 0, minutos_parada: 0 } })
  chk('la masa en 0 da "—" en el %, nunca una división', /— de la masa/.test(s3) && !/Infinity|NaN/.test(s3))
  chk('… sin motivo que se repita, lo dice', /sin un motivo que se repita/.test(s3))
  // Un pendiente que no llegó: se dice que no se sabe, no un 0.
  const p2 = S.renderPendientes({ pendientes: { planillas_por_completar: null, turnos_abiertos_de_otro_dia: 0, conos_por_revisar: 0 } })
  chk('un pendiente null: "—" y sin botón (no se sabe), nunca "Nada pendiente"', /pg-pend pg-pend--nose"><span class="pg-pend__n">—<\/span>/.test(p2) && !/Nada pendiente/.test(p2) && !/data-ind-ir/.test(p2), p2)
}

// ── Una tarjeta mal no rompe a las otras ─────────────────────────────────
{
  const S = armar()
  const html = S.htmlIndicadores({ ...DATOS, ahora: 'no es una lista', semana: null, pendientes: [1, 2], scrap_por_lote: 'x' }, null)
  chk('ahora malformado: esa tarjeta dice que no se pudo cargar, con Reintentar', NO_CARGO.test(tarjeta(html, 'ahora')) && /data-ind-reintentar="1">Reintentar<\/button>/.test(tarjeta(html, 'ahora')))
  chk('… y el porqué, pegado al Reintentar', /role="alert">Vino un dato que la pantalla no entiende\.[^<]*<\/div><button type="button" class="pr-btn pr-btn--secundario" data-ind-reintentar="1">/.test(tarjeta(html, 'ahora')))
  const h3 = S.htmlIndicadores({ ...DATOS, ahora: {}, semana: 'texto' }, null)
  chk('ahora como objeto: no se pudo cargar, no "ninguna máquina"', NO_CARGO.test(tarjeta(h3, 'ahora')) && !/Ninguna máquina/.test(tarjeta(h3, 'ahora')))
  chk('semana como texto: no se pudo cargar, no una fila de rayas', NO_CARGO.test(tarjeta(h3, 'semana')))
  chk('semana null: no se pudo cargar', NO_CARGO.test(tarjeta(html, 'semana')))
  chk('pendientes que no es un objeto: no se pudo cargar', NO_CARGO.test(tarjeta(html, 'pendientes')))
  chk('scrap que no es una lista: no se pudo cargar', NO_CARGO.test(tarjeta(html, 'scrap')))
  chk('… y las otras se ven bien', /Mini/.test(tarjeta(html, 'hoy')) && /H-11/.test(tarjeta(html, 'rendimiento')) && !NO_CARGO.test(tarjeta(html, 'hoy')))
  // Un render que TIRA tampoco rompe: se ataja por tarjeta.
  const T = S.TARJETAS_INDICADORES
  const viejo = T[1].render
  T[1].render = () => { throw new Error('boom') }
  const h2 = S.htmlIndicadores(DATOS, null)
  T[1].render = viejo
  chk('un render que tira: esa tarjeta dice que no se pudo cargar y las otras se ven', NO_CARGO.test(tarjeta(h2, 'hoy')) && /Máquina 1/.test(tarjeta(h2, 'ahora')))
  chk('sin datos (null): todas lo dicen, sin romper', (S.htmlIndicadores(null, null).match(/Esta tarjeta no se pudo cargar/g) || []).length === 6)
  chk('mientras carga: "Cargando…" en cada una, sin ceros', (S.htmlIndicadores(null, null, true).match(/Cargando…/g) || []).length === 6)
}

// ── Si la RPC entera falla: cada tarjeta dice el error ───────────────────
esperas.push((async () => {
  const S = armar({ rpc: async () => ({ data: null, error: { message: 'No tenés permiso para ver los indicadores de esta unidad.' } }) })
  await S.cargarIndicadores()
  const html = S.__doc.getElementById('pr-indicadores').innerHTML
  chk('RPC con error: las seis tarjetas lo dicen', (html.match(/No se pudieron cargar los indicadores\./g) || []).length === 6)
  chk('… con el mensaje de la base, PEGADO a su Reintentar', (html.match(/role="alert">No tenés permiso para ver los indicadores de esta unidad\.[^<]*<\/div><button type="button" class="pr-btn pr-btn--secundario" data-ind-reintentar="1">Reintentar<\/button>/g) || []).length === 6)
  chk('… y la hora del error, en Argentina', new RegExp(`esta unidad\\. \\(\\d{2}:\\d{2}\\)<\\/div>`).test(html))
  chk('… y la página sigue: las tarjetas están', (html.match(/pr-tarjeta pr-ind[ "]/g) || []).length === 6)
  chk('… y el menú no muestra un número viejo de planillas', S.__doc.getElementById('pr-menu-n-pendientes').hidden === true)
  const T = armar({ rpc: async () => { throw new Error('') } })
  await T.cargarIndicadores()
  chk('la llamada tira sin mensaje: un texto propio', /No hubo respuesta del servidor\. Revisá la conexión\./.test(T.__doc.getElementById('pr-indicadores').innerHTML))
  chk('Reintentar vuelve a pedir', /if \(ev\.target\.closest\('\[data-ind-reintentar\]'\)\) return cargarIndicadores\(\)/.test(FUENTE))
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

// ── El día: ‹ uno antes, › uno después, nunca pasado hoy ─────────────────
esperas.push((async () => {
  const S = armar()
  const hoy = S.hoyArgentina()
  S.pintarDiaIndicadores()
  chk('hoy: el texto lo dice y › está apagado', /· hoy$/.test(S.__doc.getElementById('pr-ind-dia-texto').textContent) && S.__doc.getElementById('pr-ind-dia-despues').disabled === true)
  chk('› desde hoy no hace nada', S.cambiarDiaIndicadores(1) === false && S.estado.fechaInd == null && S.__llamadas.rpc.length === 0)
  chk('‹ va al día anterior', S.cambiarDiaIndicadores(-1) === true && S.estado.fechaInd === S.sumarDias(hoy, -1))
  await new Promise(r => setImmediate(r))
  chk('… y pide los indicadores de ESE día (p_fecha)', JSON.stringify(S.__llamadas.rpc.at(-1)?.[1]) === JSON.stringify({ p_unidad_negocio_id: 'u-cn', p_fecha: S.sumarDias(hoy, -1) }))
  chk('… con › prendido', S.__doc.getElementById('pr-ind-dia-despues').disabled === false && !/· hoy$/.test(S.__doc.getElementById('pr-ind-dia-texto').textContent))
  chk('› vuelve a hoy', S.cambiarDiaIndicadores(1) === true && S.estado.fechaInd === null)
  await new Promise(r => setImmediate(r))
  chk('… y hoy se pide SIN p_fecha', JSON.stringify(S.__llamadas.rpc.at(-1)?.[1]) === '{"p_unidad_negocio_id":"u-cn"}')
  chk('textoDiaInd: "Viernes 25/09"', S.textoDiaInd('2026-09-25') === 'Viernes 25/09' && S.textoDiaInd('basura') === '')
})())

// ── Los números del menú ────────────────────────────────────────────────
esperas.push((async () => {
  const S = armar()
  await S.cargarIndicadores()
  const n = S.__doc.getElementById('pr-menu-n-pendientes')
  chk('planillas pendientes: el número de los indicadores, en su renglón del menú', n.hidden === false && n.textContent === '2' && n.getAttribute('aria-label') === '2 planillas por completar')
  S.estado.indicadores = { unidadId: 'u-dp', datos: DATOS, error: null }
  S.pintarNumerosMenu()
  chk('de otra unidad: no se muestra', n.hidden === true && n.textContent === '')
  S.estado.indicadores = { unidadId: 'u-cn', datos: { pendientes: { planillas_por_completar: 0 } }, error: null }
  S.pintarNumerosMenu()
  chk('en cero: no se muestra', n.hidden === true)
  S.estado.indicadores = { unidadId: 'u-cn', datos: { pendientes: { planillas_por_completar: 140 } }, error: null }
  S.pintarNumerosMenu()
  chk('más de 99: "99+"', n.textContent === '99+')
  S.elegirUnidadGestion('u-dp')
  chk('al cambiar de unidad, el número viejo se borra en el acto', n.hidden === true)
})())

// ── El selector de unidad y su recuerdo ──────────────────────────────────
esperas.push((async () => {
  const S = armar({ tareas: [['ver', { unidades: ['u-cn'] }], ['configurar', { unidades: ['u-dp'] }]] })
  chk('las unidades: las de ver y las de configurar', JSON.stringify(S.unidadesDeGestion()) === '["u-cn","u-dp"]', JSON.stringify(S.unidadesDeGestion()))
  S.pintarSelectorGestion()
  chk('con dos, el selector se ve', S.__doc.getElementById('pr-gestion-unidad-campo').hidden === false &&
    (S.__doc.getElementById('pr-gestion-unidad').innerHTML.match(/<option /g) || []).length === 2)
  const seg = S.__doc.getElementById('pr-gestion-unidad-seg').innerHTML
  chk('… y el segmentado de la compu dice lo mismo, con la elegida marcada', (seg.match(/data-gestion-unidad=/g) || []).length === 2 &&
    /data-gestion-unidad="u-cn" aria-pressed="true">Cucuruchos Nuss</.test(seg) && /data-gestion-unidad="u-dp" aria-pressed="false">Dolce Pasta</.test(seg))
  S.estado.vista = 'pr-inicio'
  chk('elegir una unidad posible', S.elegirUnidadGestion('u-dp') === true && S.estado.unidadId === 'u-dp')
  chk('… el segmentado cambia la marcada', /data-gestion-unidad="u-dp" aria-pressed="true"/.test(S.__doc.getElementById('pr-gestion-unidad-seg').innerHTML))
  chk('… se recuerda en localStorage', S.localStorage.getItem('produccion.gestion.unidad') === 'u-dp')
  await new Promise(r => setImmediate(r))
  chk('… y se vuelven a pedir los indicadores de ESA unidad', S.__llamadas.rpc.some(l => l[0] === 'indicadores_produccion' && l[1].p_unidad_negocio_id === 'u-dp'))
  chk('una unidad que no es posible no se elige', S.elegirUnidadGestion('u-ta') === false && S.estado.unidadId === 'u-dp')
  chk('los botones del segmentado eligen la unidad', /const b = ev\.target\.closest\('\[data-gestion-unidad\]'\); if \(b\) elegirUnidadGestion\(b\.dataset\.gestionUnidad\)/.test(FUENTE))
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
  // La fábrica de pruebas no aparece para una cuenta real, tampoco en el segmentado.
  const F = armar()
  F.estado.unidades = F.mapaDeUnidades([{ id: 'u-cn', nombre: 'Cucuruchos Nuss' }, { id: 'u-robot', nombre: 'Pruebas (robot)' }, { id: 'u-dp', nombre: 'Dolce Pasta' }],
    { ok: true, unidades: new Set(['u-robot']), personas: new Set(), soyDePrueba: false })
  F.pintarSelectorGestion()
  chk('la unidad de pruebas no aparece en el segmentado ni en el select', !/robot/i.test(F.__doc.getElementById('pr-gestion-unidad-seg').innerHTML) && !/robot/i.test(F.__doc.getElementById('pr-gestion-unidad').innerHTML) &&
    /Dolce Pasta/.test(F.__doc.getElementById('pr-gestion-unidad-seg').innerHTML))
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
  chk('sin configurar, el botón de conos no está: dice quién los revisa', !/data-ind-ir="conos"/.test(V.renderPendientes(DATOS)) && /los revisa quien configura producción/.test(V.renderPendientes(DATOS)))
})())

// ── HTML malicioso en cada render ────────────────────────────────────────
{
  const S = armar()
  const d = {
    fecha: '2026-09-25',
    ahora: [{ maquina: marca('maquina'), lote: marca('lote'), turno: marca('turno'), estado: 'pendiente_completar', encargado: marca('encargado'), masas: 1, cajas: 2,
      parada_en_curso: { motivo: marca('motivo'), desde: DESDE } }],
    cajas_por_producto: [{ producto: marca('producto'), hoy: 1, semana_pasada: 2 }],
    semana: { desde: '2026-09-19', hasta: '2026-09-25', turnos: 1, cajas: 1, unidades: 1, masas: 1, masas_modificadas: 0, masas_chocolate: 0, scrap_kg: 1, masa_kg: 2, minutos_parada: 3, motivo_parada_mas_comun: marca('motivoComun') },
    rendimiento_harina: [{ producto: marca('productoHarina'), lote: marca('loteHarina'), kg_harina: 1, unidades: 2, unidades_por_kg: 2, promedio_del_producto: 4, diferencia_pct: -50 },
      { producto: marca('productoHarina'), lote: 'otro', unidades_por_kg: 6, promedio_del_producto: 4, diferencia_pct: 50 }],
    scrap_por_lote: [{ lote: marca('loteScrap'), scrap_pct: 3 }],
    pendientes: { planillas_por_completar: 1, turnos_abiertos_de_otro_dia: 1, conos_por_revisar: 1 },
  }
  const html = S.htmlIndicadores(d, null)
  chequearMarcas(chk, 'indicadores', html, ['maquina', 'lote', 'turno', 'encargado', 'motivo', 'producto', 'motivoComun', 'productoHarina', 'loteHarina', 'loteScrap'])
  chequearMarcas(chk, 'error de la RPC', S.htmlIndicadores(null, marca('error')), ['error'])
  // Un pendiente con conos para quien no configura (otra rama del render).
  const V = armar({ tareas: [['ver', { todas: true }]] })
  chequearMarcas(chk, 'hoy sin producción', V.renderHoy({ fecha: '2026-09-25', cajas_por_producto: [{ producto: marca('prodVacio'), hoy: null, semana_pasada: 2 }] }), [])
  S.estado.unidades = new Map([[marca('unidadId'), marca('unidadNombre')], ['u-2', 'Otra']])
  S.estado.misTareas = new Map([['ver', { todas: true }]])
  S.estado.unidadId = null
  S.pintarSelectorGestion()
  chequearMarcas(chk, 'selector de unidad', S.__doc.getElementById('pr-gestion-unidad').innerHTML, ['unidadId', 'unidadNombre'])
  chequearMarcas(chk, 'segmentado de unidad', S.__doc.getElementById('pr-gestion-unidad-seg').innerHTML, ['unidadId', 'unidadNombre'])
}

// ── La pantalla ──────────────────────────────────────────────────────────
{
  chk('la gestión no tiene nada de la tablet', !/id="pr-barra"|id="pr-quien"|id="pr-planilla"|id="pr-sala"|id="pr-receta"/.test(FUENTE))
  chk('"‹ Volver" al inicio de la app, arriba', /<a href="\.\.\/dashboard\.html" class="pr-header__volver" id="pr-gestion-volver"/.test(FUENTE))
  for (const tab of ['maquinas', 'personal', 'recetas', 'ingredientes', 'productos', 'empaque', 'marcas']) {
    chk(`un renglón del menú para Configuración → ${tab}`, new RegExp(`data-ir-config="${tab}"`).test(FUENTE))
  }
  chk('un renglón para las planillas pendientes, con su número', /data-ir-pendientes id="pr-btn-ir-pendientes"[^>]*>[^]*?id="pr-menu-n-pendientes"/.test(FUENTE))
  chk('los renglones de configuración, solo con configurar', /for \(const b of document\.querySelectorAll\('\[data-ir-config\]'\)\) b\.hidden = !tieneTarea\('configurar'\)/.test(FUENTE))
  chk('no hay fila de pestañas ni grilla "Ir a"', !/id="pr-config-tabs"|data-config-tab|id="pr-oficina"/.test(FUENTE))
  const css = FUENTE.slice(FUENTE.indexOf('<style>'), FUENTE.indexOf('</style>'))
  const ini = css.indexOf('/* ── LA GESTIÓN: TAMAÑOS DE LA APP')
  chk('tamaños de la app, al final del <style>', ini > 0 && /body \{ --pr-alto-boton: 44px; font-size: 15px; \}/.test(css.slice(ini)))
  const dis = css.indexOf('LA GESTIÓN · DISEÑO')
  chk('el diseño va DESPUÉS de los tamaños (le gana por orden)', dis > ini)
  chk('en la compu, tres columnas de tarjetas', /\.pg-gestion \.pr-indicadores \{[^}]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/.test(css.slice(dis)))
  chk('en el celular, una sola', /@media \(max-width: 899px\) \{[^]*?\.pg-gestion \.pr-indicadores \{ grid-template-columns: minmax\(0, 1fr\)/.test(css.slice(dis)))
  chk('los números van con formatearNumeroAr', /formatearNumeroAr\(numeroInd\(v\), \{ decimales: 0 \}\)/.test(FUENTE))
  chk('sin azules', !/--azul|#1F5FAD|#E7EFFA|#164680/i.test(FUENTE))
}

fin()
