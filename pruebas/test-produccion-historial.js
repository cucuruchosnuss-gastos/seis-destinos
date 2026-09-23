// B7 del módulo Producción + rediseño parte 7 (23/09/2026): historial de
// turnos y stock de producto terminado (produccion:ver o :configurar). Se
// miran en la COMPU, no en la tablet, así que van densos (.pr-of). Solo
// lectura: ni una escritura sale de estas dos pantallas.
//
// El detalle de un turno: encargado, OPERARIOS CON SUS HORAS (quitar no borra
// la fila, le pone `hasta`), masas con sus ingredientes, sus lotes, la
// diferencia contra SU receta y el CHIP DE CHOCOLATE (masas.es_chocolate),
// paradas con su duración y marcando LA QUE NO VOLVIÓ (hasta_fin_de_turno),
// scrap, los SUBLOTES CON SUS CORRECCIONES —un anulado se sigue viendo y NO
// suma— y lo consumido por insumo y lote (solo masas NO anuladas;
// masa_items.cantidad_kg ya es la doble ×2).
//
// El stock terminado sale de stock_terminado_movimientos, sumado por
// producto · presentación · marca · sublote.
//
// Y en las dos: UN DATO AUSENTE NUNCA SE MUESTRA COMO UN NÚMERO. Number(null)
// es 0 y es finito, así que el total pasa a null y se muestra una raya.
//
//   node pruebas/test-produccion-historial.js

process.env.TZ = 'UTC'

const path = require('path')
const { arnes, leer, marca, chequearMarcas } = require('./circuito-comun')
const { construirProduccion } = require('./sandbox-produccion')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/produccion.html')
leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

function armar(tareas = [['ver', { unidades: ['u-cn'] }]]) {
  const S = construirProduccion(ARCHIVO)
  S.estado.misTareas = new Map(tareas)
  S.estado.unidades = new Map([['u-cn', 'Cucuruchos Nuss'], ['u-dp', 'Dolce Pasta'], ['u-ta', 'Taller']])
  return S
}

const DETALLE = {
  turnos_produccion: [{ id: 't1', lote: 7023, maquina_id: 'm1', fecha: '2026-09-22', turno: 'Mañana', encargado_id: 'e-fede', estado: 'cerrado',
    abierto_en: '2026-09-22T09:02:00Z', cerrado_en: '2026-09-22T19:00:00Z', hora_inicio: '06:02:00', hora_apagado: '16:10:00', scrap_kg: 3.5, observaciones: 'Se cortó la luz',
    forzado_por: null, forzado_en: null, forzado_motivo: null, completado_por: null, completado_en: null }],
  // Ramón sigue adentro; Marcos se fue 2 h 38 min después (08:40 en hora argentina).
  turno_operarios: [
    { empleado_id: 'e-op', desde: '2026-09-22T09:02:00Z', hasta: null },
    { empleado_id: 'e-op2', desde: '2026-09-22T09:02:00Z', hasta: '2026-09-22T11:40:00Z' },
  ],
  masas: [
    { id: 'ma1', nro: 1, hora: '2026-09-22T09:30:00Z', tipo_masa: 'Común', doble: true, origen: 'modificada', receta_id: 'r1', masero_id: 'e-mas', anulada: false, es_chocolate: true },
    { id: 'ma2', nro: 2, hora: '2026-09-22T10:30:00Z', tipo_masa: 'Común', doble: false, origen: 'original', receta_id: 'r1', masero_id: 'e-mas', anulada: false, es_chocolate: false },
    { id: 'ma3', nro: 3, hora: '2026-09-22T11:30:00Z', tipo_masa: 'Común', doble: false, origen: 'original', receta_id: 'r1', masero_id: 'e-mas', anulada: true, anulada_motivo: 'Se volcó', es_chocolate: false },
  ],
  masa_items: [
    { masa_id: 'ma1', ingrediente_id: 'i-harina', ingrediente_libre: null, insumo_id: 'ins-h1', lote: 'L-100', lote_fuera_de_stock: false, cantidad_simple_kg: 25.2, cantidad_kg: 50.4 },
    { masa_id: 'ma1', ingrediente_id: 'i-grasa', ingrediente_libre: null, insumo_id: null, lote: null, lote_fuera_de_stock: false, cantidad_simple_kg: 2, cantidad_kg: 4 },
    // El "+ Otro" de la sala: sin ingrediente del catálogo, con su nombre a mano.
    { masa_id: 'ma1', ingrediente_id: null, ingrediente_libre: 'Esencia de vainilla', insumo_id: null, lote: null, lote_fuera_de_stock: false, cantidad_simple_kg: 0.05, cantidad_kg: 0.1 },
    { masa_id: 'ma2', ingrediente_id: 'i-harina', ingrediente_libre: null, insumo_id: 'ins-h1', lote: 'L-100', lote_fuera_de_stock: false, cantidad_simple_kg: 25, cantidad_kg: 25 },
    { masa_id: 'ma2', ingrediente_id: 'i-azucar', ingrediente_libre: null, insumo_id: 'ins-az', lote: 'A-X', lote_fuera_de_stock: true, cantidad_simple_kg: 5, cantidad_kg: 5 },
    { masa_id: 'ma3', ingrediente_id: 'i-harina', ingrediente_libre: null, insumo_id: 'ins-h1', lote: 'L-100', lote_fuera_de_stock: false, cantidad_simple_kg: 25, cantidad_kg: 25 },
    { masa_id: 'ma2', ingrediente_id: 'i-lecitina', ingrediente_libre: null, insumo_id: 'ins-h1', lote: 'L-200', lote_fuera_de_stock: false, cantidad_simple_kg: 1, cantidad_kg: 1 },
  ],
  receta_items: [{ receta_id: 'r1', ingrediente_id: 'i-harina', cantidad_kg: 25 }, { receta_id: 'r1', ingrediente_id: 'i-grasa', cantidad_kg: 2 }],
  ingredientes: [{ id: 'i-harina', nombre: 'Harina', orden: 1 }, { id: 'i-grasa', nombre: 'Grasa', orden: 2 }, { id: 'i-azucar', nombre: 'Azúcar', orden: 3 }],
  insumos: [{ id: 'ins-h1', nombre: 'Harina 000', marca: 'Jupiter' }, { id: 'ins-az', nombre: 'Azúcar', marca: null }],
  paradas_produccion: [
    { id: 'p1', inicio: '2026-09-22T12:00:00Z', fin: '2026-09-22T12:45:00Z', motivo: 'Cambio de molde', hasta_fin_de_turno: false },
    // La que quedó abierta al cerrar: la máquina no volvió en todo el turno.
    { id: 'p2', inicio: '2026-09-22T15:00:00Z', fin: '2026-09-22T19:00:00Z', motivo: 'Se rompió el pulpo', hasta_fin_de_turno: true },
  ],
  produccion_items: [
    { id: 'pi1', orden: 1, sublote: '7023-1', presentacion_id: 'pr1', marca_id: null, cajas: 12, unidades_por_caja: 600, unidades: 7200, anulado: false },
    { id: 'pi2', orden: 2, sublote: '7023-2', presentacion_id: 'pr1', marca_id: 'mk1', cajas: 3, unidades_por_caja: 600, unidades: 1800, anulado: true },
  ],
  produccion_correcciones: [
    { produccion_item_id: 'pi1', tipo: 'cajas', cajas_antes: 15, cajas_despues: 12, motivo: 'Se contaron mal', hecha_por: 'e-adm', hecha_en: '2026-09-22T14:00:00Z' },
    { produccion_item_id: 'pi2', tipo: 'anulado', cajas_antes: 3, cajas_despues: null, motivo: 'Se cargó dos veces', hecha_por: 'e-adm', hecha_en: '2026-09-22T15:00:00Z' },
  ],
  producto_presentaciones: [{ id: 'pr1', producto_id: 'p1', nombre: 'Caja x600' }],
  productos_terminados: [{ id: 'p1', nombre: 'Cucuruchón Mini' }],
  marcas_personalizadas: [{ id: 'mk1', nombre: 'GRIDO' }],
  v_empleados_publico: [{ id: 'e-fede', nombre: 'Federico Silva' }, { id: 'e-op', nombre: 'Ramón Díaz' },
    { id: 'e-op2', nombre: 'Marcos Vera' }, { id: 'e-mas', nombre: 'Juan Masero' }, { id: 'e-adm', nombre: 'Ana Admin' }],
}

esperas.push((async () => {
  // ── Unidades y acceso ─────────────────────────────────────────────────
  const U = armar([['ver', { unidades: ['u-dp'] }], ['configurar', { unidades: ['u-cn'] }]])
  chk('unidades del historial: las de ver y las de configurar', JSON.stringify(U.unidadesDeHistorial().sort()) === '["u-cn","u-dp"]')
  const Nada = armar([['cargar', { unidades: ['u-cn'] }]])
  chk('solo con cargar no hay historial', Nada.unidadesDeHistorial().length === 0)
  Nada.pintarAccesosOficina()
  chk('… ni botones de historial y stock', Nada.__doc.getElementById('pr-btn-ir-historial').hidden === true && Nada.__doc.getElementById('pr-btn-ir-stock').hidden === true)
  U.pintarAccesosOficina()
  chk('con ver: los botones aparecen', U.__doc.getElementById('pr-btn-ir-historial').hidden === false && U.__doc.getElementById('pr-menu-stock').hidden === false)
  chk('sumarDias cruza de mes', U.sumarDias('2026-10-02', -7) === '2026-09-25')

  // ── Un dato ausente NO se muestra como un número ───────────────────────
  const N = armar()
  chk('sumarMedido suma lo que se puede leer', N.sumarMedido(3, 4) === 7 && N.sumarMedido(0, '2.5') === 2.5)
  chk('… y con un dato ausente devuelve null, no cero', N.sumarMedido(3, null) === null && N.sumarMedido(3, undefined) === null && N.sumarMedido(3, '') === null && N.sumarMedido(3, 'x') === null)
  chk('… y una vez en null no vuelve a ser un número', N.sumarMedido(null, 5) === null)
  chk('textoEntero de un null es una raya y no un 0', N.textoEntero(null) === '—' && N.textoEntero(undefined) === '—' && N.textoEntero(0) === '0' && N.textoEntero(7200) === '7.200')

  // ── Listado ───────────────────────────────────────────────────────────
  const S = armar()
  Object.assign(S.__tablas, {
    maquinas: [{ id: 'm1', nombre: 'Máquina 1' }],
    turnos_produccion: [{ id: 't1', lote: 7023, maquina_id: 'm1', fecha: '2026-09-22', turno: 'Mañana', encargado_id: 'e-fede', estado: 'cerrado' },
      { id: 't2', lote: 7024, maquina_id: 'm1', fecha: '2026-09-22', turno: 'Tarde', encargado_id: 'e-x', estado: 'abierto' },
      { id: 't3', lote: 7025, maquina_id: 'm1', fecha: '2026-09-21', turno: 'Noche', encargado_id: 'e-fede', estado: 'pendiente_completar' }],
    v_empleados_publico: [{ id: 'e-fede', nombre: 'Federico Silva' }],
  })
  await S.mostrarHistorial()
  chk('arranca en los últimos 7 días', S.estado.historial.hasta === S.hoyArgentina() && S.estado.historial.desde === S.sumarDias(S.hoyArgentina(), -7))
  const q = S.__llamadas.consultas.find(([t]) => t === 'turnos_produccion')?.[1] ?? []
  chk('filtra por unidad y fechas', JSON.stringify(q).includes('["eq","unidad_negocio_id","u-cn"]') && JSON.stringify(q).includes('["gte","fecha"') && JSON.stringify(q).includes('["lte","fecha"'))
  chk('sin máquina ni estado elegidos no los filtra', !JSON.stringify(q).includes('["eq","maquina_id"') && !JSON.stringify(q).includes('["eq","estado"'))
  const hl = S.__doc.getElementById('pr-historial-lista').innerHTML
  chk('la lista es una tabla con su cabecera', /pr-of-cab pr-of-turnos[\s\S]*Lote<\/span>[\s\S]*Encargado<\/span>/.test(hl))
  chk('cada turno con lote, fecha, turno, máquina y encargado', /pr-of-lote">7023<\/span><span>22\/09\/2026<\/span><span>Mañana<\/span><span>Máquina 1<\/span><span>Federico Silva<\/span>/.test(hl), hl.slice(0, 900))
  chk('un encargado sin nombre: raya', /<span>Tarde<\/span><span>Máquina 1<\/span><span>—<\/span>/.test(hl))
  chk('el cerrado va en verde, sin franja', /pr-of-chip--cerrado">Cerrado/.test(hl) && !/pr-of-fila--abierto[^>]*7023/.test(hl))
  chk('el abierto lleva franja naranja y su chip', /pr-of-fila--abierto/.test(hl) && /pr-of-chip--abierto">Abierto/.test(hl))
  chk('el pendiente de completar lleva franja bordó y lo dice', /pr-of-fila--pendiente/.test(hl) && /pr-of-chip--pendiente">Pendiente de completar/.test(hl))
  chk('un estado que la pantalla no conoce se muestra igual, sin inventar', /Raro/.test(S.htmlEstadoTurno('Raro')))
  S.estado.historial.maquina = 'm1'
  S.estado.historial.estado = 'pendiente_completar'
  S.__llamadas.consultas.length = 0
  await S.cargarHistorial()
  const q2 = S.__llamadas.consultas.find(([t]) => t === 'turnos_produccion')?.[1] ?? []
  chk('con máquina y estado, los filtra', JSON.stringify(q2).includes('["eq","maquina_id","m1"]') && JSON.stringify(q2).includes('["eq","estado","pendiente_completar"]'))
  S.estado.historial.desde = '2026-09-30'
  S.estado.historial.hasta = '2026-09-01'
  S.__llamadas.consultas.length = 0
  await S.cargarHistorial()
  chk('"desde" después de "hasta": lo dice y no consulta', /no sea posterior/.test(S.__doc.getElementById('pr-historial-aviso').innerHTML) && !S.__llamadas.consultas.some(([t]) => t === 'turnos_produccion'))
  chk('sin turnos, lo dice', /No hay turnos con esos filtros/.test(S.htmlTablaTurnos({ turnos: [], maquinas: [], nombres: new Map() })))
  const T = armar()
  Object.assign(T.__tablas, { maquinas: [], turnos_produccion: Array.from({ length: 1000 }, (_, i) => ({ id: 't' + i, lote: i, maquina_id: 'm', fecha: '2026-09-22', turno: 'Mañana', estado: 'cerrado' })) })
  await T.mostrarHistorial()
  chk('si llega al tope de 1000, lo avisa', /primeros 1000 turnos/.test(T.__doc.getElementById('pr-historial-aviso').innerHTML))

  // ── Detalle ───────────────────────────────────────────────────────────
  const D = armar()
  Object.assign(D.__tablas, DETALLE)
  const d = await D.leerDetalleTurno('t1')
  chk('los nombres salen de v_empleados_publico, nunca de un embed a empleados',
    D.__llamadas.consultas.some(([t]) => t === 'v_empleados_publico') && !D.__llamadas.consultas.some(([t]) => t === 'empleados'))
  chk('las correcciones se piden por los ids de los sublotes', D.__llamadas.consultas.some(([t, f]) =>
    t === 'produccion_correcciones' && JSON.stringify(f).includes('["in","produccion_item_id",["pi1","pi2"]]')))
  chk('el que corrigió entra en la búsqueda de nombres', D.__llamadas.consultas.some(([t, f]) =>
    t === 'v_empleados_publico' && JSON.stringify(f).includes('e-adm')))
  // El doble de supabase devuelve la tabla entera sin mirar el .select(), así
  // que sacarle una columna a una consulta no cambia nada acá aunque en
  // producción deje el dato en undefined — la trampa de "la columna no llega".
  // La única forma de medirlo es afirmar sobre el texto del select.
  const selDe = (tabla) => ((D.__llamadas.consultas.find(([t]) => t === tabla)?.[1] ?? []).find(x => x[0] === 'select')?.[1] ?? '').split(/,\s*/)
  chk('los operarios se piden con sus horas', selDe('turno_operarios').includes('desde') && selDe('turno_operarios').includes('hasta'), selDe('turno_operarios').join('|'))
  chk('las masas se piden con es_chocolate', selDe('masas').includes('es_chocolate'), selDe('masas').join('|'))
  chk('los renglones de masa se piden con ingrediente_libre', selDe('masa_items').includes('ingrediente_libre'), selDe('masa_items').join('|'))
  chk('las paradas se piden con hasta_fin_de_turno', selDe('paradas_produccion').includes('hasta_fin_de_turno'), selDe('paradas_produccion').join('|'))
  chk('los sublotes se piden con su id y con anulado', selDe('produccion_items').includes('anulado') && selDe('produccion_items').includes('id'), selDe('produccion_items').join('|'))
  const tot = D.totalesConsumidos(d)
  chk('consumido: suma por insumo y lote, con la doble', tot.find(x => x.insumo_id === 'ins-h1' && x.lote === 'L-100')?.kg === 75.4, JSON.stringify(tot))
  chk('… sin las masas anuladas ni los ingredientes sin insumo', tot.length === 3 && !tot.some(x => x.insumo_id === null))
  chk('… el mismo insumo con otro lote va aparte', tot.find(x => x.insumo_id === 'ins-h1' && x.lote === 'L-200')?.kg === 1)
  const roto = D.totalesConsumidos({
    masas: [{ id: 'ma1', anulada: false }],
    items: [{ masa_id: 'ma1', insumo_id: 'ins-h1', lote: 'L-100', cantidad_kg: 5 }, { masa_id: 'ma1', insumo_id: 'ins-h1', lote: 'L-100', cantidad_kg: null }],
  })
  chk('… y un consumo que no se puede leer deja el total en null, no en un número', roto[0].kg === null, JSON.stringify(roto))
  chk('detalleIncompleto avisa recién al llegar al tope',
    D.detalleIncompleto({ items: [], correcciones: [] }) === false &&
    D.detalleIncompleto({ items: Array.from({ length: 1000 }), correcciones: [] }) === true &&
    D.detalleIncompleto({ items: [], correcciones: Array.from({ length: 1000 }) }) === true)

  await D.abrirDetalleHistorial('t1')
  const hd = D.__doc.getElementById('pr-historial-detalle-cuerpo').innerHTML
  chk('detalle: lote, encargado y horario', /class="pr-lote">7023</.test(hd) && /Federico Silva/.test(hd) && /06:02 a 16:10/.test(hd))
  chk('… el estado del turno, con su chip', /pr-of-chip--cerrado">Cerrado/.test(hd))
  chk('… scrap y observaciones', /3,5 kg/.test(hd) && /Se cortó la luz/.test(hd))
  chk('… los operarios con sus horas', /Ramón Díaz<\/span><span class="pr-renglon__dato">desde 06:02 · sigue/.test(hd), hd.slice(hd.indexOf('Ramón') - 60, hd.indexOf('Ramón') + 200))
  chk('… y el que se fue sigue en la lista, con su rango y su duración', /Marcos Vera<\/span><span class="pr-renglon__dato">06:02 → 08:40 · 2 h 38 min/.test(hd))
  chk('… cada masa con su masero y su origen', /Masa 1<\/strong> · 06:30 · Común · Doble/.test(hd) && /masero Juan Masero/.test(hd) && /pr-chip-origen--modificada/.test(hd))
  chk('… el chip de chocolate solo en la masa que lo es', (hd.match(/pr-chip-choco/g) ?? []).length === 1 &&
    hd.indexOf('pr-chip-choco') > hd.indexOf('Masa 1') && hd.indexOf('pr-chip-choco') < hd.indexOf('Masa 2'))
  chk('… con ingredientes, insumo y lote', /Harina 50,4 kg \(Harina 000 · Jupiter, lote L-100\)/.test(hd))
  chk('… un "otro" se muestra con el nombre que le pusieron, no como "Ingrediente"', /Esencia de vainilla 0,1 kg/.test(hd) && !/Ingrediente 0,1/.test(hd))
  chk('… el lote fuera de stock se marca', /lote A-X, lote fuera de stock/.test(hd))
  chk('… la diferencia contra su receta', /\+200 g Harina/.test(hd))
  chk('… la anulada, con su motivo', /Anulada:<\/strong> Se volcó/.test(hd))
  // htmlParadas() es la MISMA de la planilla (rediseño parte 3): la hora
  // primero, en tabular, y el motivo después.
  chk('… las paradas con su duración', /09:00–09:45<\/strong> · Cambio de molde[\s\S]*45 min/.test(hd), hd.slice(hd.indexOf('Cambio de molde') - 200, hd.indexOf('Cambio de molde') + 80))
  chk('… y la que no volvió, marcada', /pr-renglon--novolvio[\s\S]*Se rompió el pulpo[\s\S]*4 h 00 min · no volvió en todo el turno/.test(hd),
    hd.slice(hd.indexOf('pulpo') - 220, hd.indexOf('pulpo') + 180))
  chk('… los sublotes producidos con cajas y unidades', /7023-1<\/span> Cucuruchón Mini · Caja x600 · Común · 12 cajas × 600 = 7\.200 unidades/.test(hd))
  chk('… el anulado se sigue viendo, tachado y diciendo que no suma', /pr-of-anulado[\s\S]*7023-2[\s\S]*anulado, no suma/.test(hd))
  chk('… con sus correcciones, con motivo, quién y cuándo', /Cajas 15 → 12 · Se contaron mal · Ana Admin · 22\/09\/2026 11:00/.test(hd) &&
    /Anulado · Se cargó dos veces · Ana Admin/.test(hd), hd.slice(hd.indexOf('Se contaron mal') - 200, hd.indexOf('Se contaron mal') + 120))
  chk('… y cada corrección va SOLO en su sublote', (hd.match(/Se contaron mal/g) ?? []).length === 1 && (hd.match(/Se cargó dos veces/g) ?? []).length === 1 &&
    hd.indexOf('Se contaron mal') < hd.indexOf('7023-2') && hd.indexOf('Se cargó dos veces') > hd.indexOf('7023-2'))
  chk('… y el total del turno NO suma el anulado', /Total del turno: 12 cajas · 7\.200 unidades/.test(hd))
  chk('… y lo consumido por insumo y lote', /Harina 000 · Jupiter · lote L-100: <strong>75,4 kg/.test(hd))
  chk('… sin el aviso del tope cuando no se llegó', !/los totales pueden estar incompletos/.test(hd))
  chk('totalSublotes con una caja ilegible no devuelve un número', D.totalSublotes({ producido: [{ cajas: 5, unidades: 10 }, { cajas: null, unidades: 10 }] }).cajas === null)
  // El consumo ilegible, ya en la PANTALLA y no solo en el total: una raya.
  const R = armar()
  Object.assign(R.__tablas, DETALLE)
  R.__tablas.masa_items = [{ masa_id: 'ma1', ingrediente_id: 'i-harina', ingrediente_libre: null, insumo_id: 'ins-h1', lote: 'L-100', lote_fuera_de_stock: false, cantidad_simple_kg: 25, cantidad_kg: null }]
  await R.abrirDetalleHistorial('t1')
  const hr = R.__doc.getElementById('pr-historial-detalle-cuerpo').innerHTML
  chk('un consumo que no se puede leer se muestra como una raya, nunca como 0 kg',
    /lote L-100: <strong>—<\/strong>/.test(hr) && !/lote L-100: <strong>0 kg/.test(hr), hr.slice(hr.indexOf('L-100') - 120, hr.indexOf('L-100') + 120))

  // Un turno forzado, pendiente de completar.
  const F = armar()
  Object.assign(F.__tablas, DETALLE)
  F.__tablas.turnos_produccion = [{ ...DETALLE.turnos_produccion[0], estado: 'pendiente_completar',
    hora_apagado: null, forzado_por: 'e-fede', forzado_en: '2026-09-23T10:00:00Z', forzado_motivo: 'Quedó abierta de ayer' }]
  await F.abrirDetalleHistorial('t1')
  const hf = F.__doc.getElementById('pr-historial-detalle-cuerpo').innerHTML
  chk('un turno forzado lo dice, con quién, cuándo y por qué', /se cerró a la fuerza · Federico Silva · 23\/09\/2026: Quedó abierta de ayer/.test(hf), hf.slice(0, 500))
  chk('… y avisa que lo que produjo no está en el stock', /todavía no está en el stock/.test(hf))
  const V = armar()
  V.__tablas.turnos_produccion = () => ({ data: null, error: { message: 'x' } })
  await V.abrirDetalleHistorial('t1')
  chk('si el detalle falla, lo dice y no deja nada a medias', /No se pudo leer el turno/.test(V.__doc.getElementById('pr-historial-detalle-cuerpo').innerHTML))

  // ── Stock terminado ───────────────────────────────────────────────────
  const K = armar()
  const movs = [
    { presentacion_id: 'pr1', marca_id: null, lote: '7023-1', cajas: 12, unidades: 7200 },
    { presentacion_id: 'pr1', marca_id: null, lote: '7023-1', cajas: -2, unidades: -1200 },
    { presentacion_id: 'pr1', marca_id: 'mk1', lote: '7023-2', cajas: 3, unidades: 1800 },
    { presentacion_id: 'pr1', marca_id: null, lote: '7020-1', cajas: 5, unidades: 3000 },
    { presentacion_id: 'pr1', marca_id: null, lote: '7019-1', cajas: 4, unidades: 2400 },
    { presentacion_id: 'pr1', marca_id: null, lote: '7019-1', cajas: -4, unidades: -2400 },
    { presentacion_id: 'pr1', marca_id: 'mk1', lote: '7020-1', cajas: 1, unidades: 600 },
  ]
  const g = K.agruparStockTerminado(movs)
  chk('suma por presentación, marca y sublote', g.find(x => x.lote === '7023-1').cajas === 10 && g.find(x => x.lote === '7023-1').unidades === 6000)
  chk('un sublote despachado entero no se lista', !g.some(x => x.lote === '7019-1'))
  chk('la misma presentación con marca va aparte, aunque sea el mismo sublote', g.filter(x => x.presentacion_id === 'pr1').length === 4 &&
    g.find(x => x.lote === '7020-1' && x.marca_id === null).cajas === 5 && g.find(x => x.lote === '7020-1' && x.marca_id === 'mk1').cajas === 1)
  const gRoto = K.agruparStockTerminado([{ presentacion_id: 'pr1', marca_id: null, lote: '7030-1', cajas: 4, unidades: 2400 },
    { presentacion_id: 'pr1', marca_id: null, lote: '7030-1', cajas: null, unidades: 600 }])
  chk('un movimiento ilegible deja el total en null, y la fila NO desaparece', gRoto.length === 1 && gRoto[0].cajas === null && gRoto[0].unidades === 3000)
  const hRoto = K.htmlStockTerminado(gRoto, { productos: [{ id: 'p1', nombre: 'X' }], presentaciones: [{ id: 'pr1', producto_id: 'p1', nombre: 'Y' }], marcas: [] })
  chk('… y se muestra como una raya, nunca como un 0', /pr-of-num">—<\/span>/.test(hRoto))
  chk('… y el total del grupo tampoco inventa un número', /pr-of-grupo__total">— cajas · 3\.000 unidades/.test(hRoto), hRoto.slice(0, 400))
  Object.assign(K.__tablas, { stock_terminado_movimientos: movs, productos_terminados: DETALLE.productos_terminados, producto_presentaciones: DETALLE.producto_presentaciones, marcas_personalizadas: DETALLE.marcas_personalizadas })
  await K.mostrarStockTerminado()
  const hk = K.__doc.getElementById('pr-stock-lista').innerHTML
  chk('agrupa por producto · presentación · marca', /Cucuruchón Mini · Caja x600 · Común/.test(hk) && /Cucuruchón Mini · Caja x600 · GRIDO/.test(hk))
  chk('con el total del grupo', /15 cajas · 9\.000 unidades/.test(hk))
  chk('cada grupo con su cabecera de columnas', /pr-of-cab pr-of-stock[\s\S]*Sublote<\/span>[\s\S]*Cajas<\/span>[\s\S]*Unidades<\/span>/.test(hk))
  chk('y cada sublote, en orden', /7020-1<\/span>[\s\S]*5<\/span>[\s\S]*3\.000[\s\S]*7023-1<\/span>/.test(hk), hk.slice(0, 1200))
  chk('lee el stock de la unidad', K.__llamadas.consultas.some(([t, f]) => t === 'stock_terminado_movimientos' && JSON.stringify(f).includes('["eq","unidad_negocio_id","u-cn"]')))
  chk('vacío: lo dice', /No hay producto terminado/.test(K.htmlStockTerminado([], { productos: [], presentaciones: [], marcas: [] })))
  const W = armar()
  W.__tablas.stock_terminado_movimientos = () => ({ data: null, error: { message: 'x' } })
  await W.mostrarStockTerminado()
  chk('si falla, aviso y nada viejo', /No se pudo leer el stock terminado/.test(W.__doc.getElementById('pr-stock-aviso').innerHTML) && W.__doc.getElementById('pr-stock-lista').innerHTML === '')
  const Z = armar()
  Object.assign(Z.__tablas, { stock_terminado_movimientos: Array.from({ length: 1000 }, (_, i) => ({ presentacion_id: 'pr1', marca_id: null, lote: 'L' + i, cajas: 1, unidades: 1 })) })
  await Z.mostrarStockTerminado()
  chk('si el stock llega al tope de 1000, dice que los totales pueden estar incompletos', /pueden estar incompletos/.test(Z.__doc.getElementById('pr-stock-aviso').innerHTML))

  // ── Solo lectura ──────────────────────────────────────────────────────
  // Estas dos pantallas MIRAN: si alguna vez escribieran, tendría que ser por
  // una RPC y no por un insert suelto — y hoy no escriben nada.
  chk('el historial y el stock no llaman a ninguna RPC', D.__llamadas.rpc.length === 0 && K.__llamadas.rpc.length === 0)

  // ── HTML malicioso ────────────────────────────────────────────────────
  const X = armar()
  const h = { maquinas: [{ id: 'm', nombre: marca('maquina') }], nombres: new Map([['e', marca('encargado')]]) }
  const filaX = { id: marca('turnoId'), lote: marca('lote'), maquina_id: 'm', fecha: '2026-09-22', turno: marca('turno'), encargado_id: 'e', estado: 'cerrado' }
  chequearMarcas(chk, 'fila del historial', X.htmlFilaHistorial(filaX, h), ['maquina', 'encargado', 'turnoId', 'lote', 'turno'])
  chequearMarcas(chk, 'tabla de turnos', X.htmlTablaTurnos({ ...h, turnos: [filaX] }), ['maquina', 'encargado', 'turnoId', 'lote', 'turno'])
  chequearMarcas(chk, 'chip de estado desconocido', X.htmlEstadoTurno(marca('estadoRaro')), ['estadoRaro'])
  const dm = {
    turno: { lote: marca('loteT'), fecha: '2026-09-22', turno: marca('turnoT'), encargado_id: 'e', estado: 'cerrado', hora_inicio: '<i>x', hora_apagado: '<u>y', scrap_kg: 1, observaciones: marca('obs'),
      forzado_por: 'e', forzado_en: '2026-09-23T10:00:00Z', forzado_motivo: marca('forzado') },
    operarios: [{ empleado_id: 'e', desde: '2026-09-22T09:00:00Z', hasta: null }], nombres: new Map([['e', marca('persona')]]),
    masas: [{ id: 'm1', nro: marca('nro'), hora: null, tipo_masa: marca('tipo'), doble: false, origen: marca('origen'), receta_id: 'r', masero_id: 'e', anulada: false, es_chocolate: true },
      { id: 'm2', nro: 2, hora: null, tipo_masa: 'x', doble: false, origen: 'original', receta_id: 'r', masero_id: 'e', anulada: true, anulada_motivo: marca('motivo') }],
    items: [{ masa_id: 'm1', ingrediente_id: 'i', insumo_id: 'ins', lote: marca('loteIns'), cantidad_kg: 1 },
      { masa_id: 'm1', ingrediente_id: null, ingrediente_libre: marca('libre'), insumo_id: null, cantidad_kg: 2 }],
    recItems: [], ingredientes: [{ id: 'i', nombre: marca('ingrediente') }], insumos: [{ id: 'ins', nombre: marca('insumo'), marca: marca('marcaIns') }],
    paradas: [{ motivo: marca('parada'), inicio: null, fin: null }],
    producido: [{ id: 'pi', sublote: marca('sublote'), presentacion_id: 'pr', marca_id: 'mk', cajas: 1, unidades_por_caja: 1, unidades: 1, anulado: false }],
    correcciones: [{ produccion_item_id: 'pi', tipo: marca('tipoCorr'), cajas_antes: 1, cajas_despues: 2, motivo: marca('motivoCorr'), hecha_por: 'e', hecha_en: '2026-09-22T14:00:00Z' }],
    presentaciones: [{ id: 'pr', producto_id: 'p', nombre: marca('presentacion') }], productos: [{ id: 'p', nombre: marca('producto') }], marcas: [{ id: 'mk', nombre: marca('marcaProd') }],
  }
  chequearMarcas(chk, 'detalle del turno', X.htmlDetalleTurno(dm), ['loteT', 'turnoT', 'persona', 'obs', 'forzado', 'nro', 'tipo', 'origen', 'motivo', 'loteIns', 'libre',
    'ingrediente', 'insumo', 'marcaIns', 'parada', 'sublote', 'presentacion', 'producto', 'marcaProd', 'tipoCorr', 'motivoCorr'])
  const hh = X.htmlDetalleTurno(dm)
  chk('las horas se recortan a HH:MM y salen escapadas', hh.includes('&lt;i&gt;x') && hh.includes('&lt;u&gt;y') && !hh.includes('<i>x') && !hh.includes('<u>y'))
  chequearMarcas(chk, 'stock terminado', X.htmlStockTerminado([{ presentacion_id: 'pr', marca_id: 'mk', lote: marca('loteStock'), cajas: 1, unidades: 1 }],
    { productos: [{ id: 'p', nombre: marca('prodStock') }], presentaciones: [{ id: 'pr', producto_id: 'p', nombre: marca('presStock') }], marcas: [{ id: 'mk', nombre: marca('marcaStock') }] }),
    ['loteStock', 'prodStock', 'presStock', 'marcaStock'])
  X.__tablas.maquinas = [{ id: marca('maqId'), nombre: marca('maqSel') }]
  X.__tablas.turnos_produccion = []
  await X.mostrarHistorial()
  chequearMarcas(chk, 'selector de máquina', X.__doc.getElementById('pr-historial-maquina').innerHTML, ['maqId', 'maqSel'])
})())

fin()
