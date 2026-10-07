// Producción · la planilla de una máquina, lo producido y el cierre.
// Rediseño parte 3 (23/09/2026): lo producido se carga DURANTE el turno.
//
// Contrato con la base (pg_get_functiondef, 23/09/2026):
//  - registrar_produccion_item(p_turno_id, p_presentacion_id, p_marca_id,
//    p_cajas) → { produccion_item_id, sublote, orden, unidades }. Solo con el
//    turno NO cerrado, y SUMA EL STOCK TERMINADO YA: el sublote que devuelve
//    es el definitivo, no hay provisorios.
//  - corregir_produccion_item(p_item_id, p_cajas, p_motivo) y
//    anular_produccion_item(p_item_id, p_motivo): motivo de 3 caracteres o
//    más. Anular NO borra la fila: le pone `anulado`.
//  - cerrar_turno(p_turno_id, p_hora_apagado, p_scrap_kg, p_observaciones,
//    p_productos, p_hora_fin, p_motivo_cierre) → { lote, sublotes,
//    cierre_anticipado } (05/10/2026: p_hora_apagado es "terminó de
//    producir"; el cierre anticipado lo prueba test-produccion-paradas-simple.js). PRIMERO cierra la parada que quedó
//    abierta con hasta_fin_de_turno = true y recién después valida hora y
//    scrap: cerrar con una parada en curso SE PUEDE. p_productos puede ir
//    vacío, y los sublotes que agregue continúan la numeración.
//  - forzar_cierre_turno(p_turno_id, p_persona_id, p_motivo): solo sobre
//    'abierto', deja 'pendiente_completar' y NO crea produccion_items ni
//    stock. cerrar_turno después funciona sobre ese estado.
//  - proponer_marca(p_nombre) → { marca_id, ya_existia }: nombre en
//    MAYÚSCULAS, 'pendiente_revision' con solo `cargar`, y LANZA si ese
//    nombre ya está rechazado.
//
//   node pruebas/test-produccion-cierre.js

process.env.TZ = 'UTC'

const path = require('path')
const { arnes, leer, marca, chequearMarcas } = require('./circuito-comun')
const { construirProduccion } = require('./sandbox-produccion')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/produccion.html')
const FUENTE = leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

const CATALOGO = {
  productos_terminados: [
    { id: 'p-mini', nombre: 'Cucuruchón Mini', tipo_masa: 'Común', orden: 1 },
    { id: 'p-gde', nombre: 'Cucuruchón Grande', tipo_masa: 'Común', orden: 2 },
    { id: 'p-choco', nombre: 'Cucuruchón Mini Chocolate', tipo_masa: 'Chocolate', orden: 3 },
  ],
  producto_presentaciones: [
    { id: 'pr-mini-600', producto_id: 'p-mini', nombre: 'Caja x600', con_cono: true, media_caja: false, empaque: 'bolsa individual 15x60', unidades_por_caja: 600, orden: 1 },
    { id: 'pr-mini-300', producto_id: 'p-mini', nombre: 'Media caja x300', con_cono: false, media_caja: true, empaque: null, unidades_por_caja: 300, orden: 2 },
    { id: 'pr-gde-200', producto_id: 'p-gde', nombre: 'Caja x200', con_cono: false, media_caja: true, empaque: null, unidades_por_caja: 200, orden: 1 },
    { id: 'pr-choco-500', producto_id: 'p-choco', nombre: 'Caja x500', con_cono: true, media_caja: false, empaque: null, unidades_por_caja: 500, orden: 1 },
  ],
  marcas_personalizadas: [
    { id: 'mk-caserato', nombre: 'CASERATO', estado_alta: 'aprobada' },
    { id: 'mk-grido', nombre: 'GRIDO', estado_alta: 'aprobada' },
    { id: 'mk-casona', nombre: 'HELADERÍA LA CASONA', estado_alta: 'aprobada' },
  ],
}
const cat = () => ({ productos: CATALOGO.productos_terminados, presentaciones: CATALOGO.producto_presentaciones, marcas: CATALOGO.marcas_personalizadas })

const TURNO = { id: 't1', lote: 7023, maquina_id: 'm1', fecha: '2026-09-22', turno: 'Mañana', encargado_id: 'e-fede', abierto_en: '2026-09-22T09:02:00Z', estado: 'abierto', forzado_por: null, forzado_en: null, forzado_motivo: null }
const MASAS = [
  { id: 'm-11', nro: 11, hora: '2026-09-22T12:51:00Z', doble: false, origen: 'anterior' },
  { id: 'm-12', nro: 12, hora: '2026-09-22T13:18:00Z', doble: true, origen: 'modificada' },
]
const ITEMS = [
  { id: 'it-1', orden: 1, sublote: '7023-1', presentacion_id: 'pr-mini-600', marca_id: 'mk-caserato', cajas: 35, unidades_por_caja: 600, unidades: 21000, anulado: false },
  { id: 'it-2', orden: 2, sublote: '7023-2', presentacion_id: 'pr-gde-200', marca_id: null, cajas: 20, unidades_por_caja: 200, unidades: 4000, anulado: false },
]
const PLANILLA = { turno: TURNO, operarios: [{ empleado_id: 'e-op1', desde: '2026-09-22T09:02:00Z', hasta: null }], masas: MASAS, paradas: [], items: ITEMS, maquinaNombre: 'Máquina 1' }

// El doble de supabase indexa por tabla, y turnos_produccion la consultan DOS
// cosas distintas (la planilla y los pendientes de completar): se separan por
// el filtro de estado, igual que en la app.
function tablasDe({ turno = TURNO, masas = MASAS, paradas = [], items = ITEMS, pendientes = [] } = {}) {
  return {
    ...CATALOGO,
    turnos_produccion: filtros => filtros.some(f => f[1] === 'estado' && f[2] === 'pendiente_completar')
      ? { data: pendientes, error: null }
      : { data: [turno], error: null },
    turno_operarios: [{ empleado_id: 'e-op1', desde: '2026-09-22T09:02:00Z', hasta: null }],
    masas,
    paradas_produccion: paradas,
    produccion_items: items,
    maquinas: [{ id: 'm1', nombre: 'Máquina 1', orden: 1 }],
  }
}

function armar(opciones = {}) {
  const S = construirProduccion(ARCHIVO)
  Object.assign(S.__tablas, tablasDe(opciones))
  S.estado.modo = 'produccion'
  S.estado.persona = { id: 'e-fede', nombre: 'Federico Silva' }
  S.estado.personal = [
    { id: 'e-fede', nombre: 'Federico Silva', puestos: ['encargado'] },
    { id: 'e-op1', nombre: 'Ramón Díaz', puestos: ['operario'] },
  ]
  S.estado.tablero = [{ maquina: { id: 'm1', nombre: 'Máquina 1' }, turno: { id: 't1' } }]
  return S
}

const html = (S, id) => S.__doc.getElementById(id).innerHTML
const rpcs = (S, n) => S.__llamadas.rpc.filter(([x]) => x === n)
const tic = () => new Promise(r => setImmediate(r))

// ── La planilla: la cabecera, las masas y las paradas ─────────────────────
esperas.push((async () => {
  const S = armar({ paradas: [{ id: 'pa1', inicio: '2026-09-22T11:00:00Z', fin: '2026-09-22T11:35:00Z', motivo: 'Cambio de molde' }] })
  await S.abrirPlanilla('t1')

  // Planta v2: el lote y la máquina van en la cabecera de la pantalla (pr-cab,
  // con textContent). El turno y la hora de apertura ya no se muestran en la
  // planilla (se retiraron con el diseño; el cierre dice "desde … a …").
  const cab = S.cabeceraDeVista()
  chk('planilla: el lote y la máquina, en la cabecera', S.estado.vista === 'pr-planilla' && cab?.ctx === 'Lote 7023 · Máquina 1' && cab?.titulo === 'Planilla', JSON.stringify(cab))
  chk('… el operario, en su bloque', /Ramón Díaz/.test(html(S, 'pr-planilla-operarios')))
  chk('… y las masas se piden SIN las anuladas',
    S.__llamadas.consultas.some(([t, f]) => t === 'masas' && JSON.stringify(f).includes('["eq","anulada",false]')))

  // Planta v2: las masas van en un resumen (htmlMasasResumen): cuántas, si
  // alguna fue de chocolate y la última. El detalle de cada masa (tamaño,
  // "Modificada") está en el historial de la máquina, en Sala de masa.
  const masas = html(S, 'pr-planilla-masas')
  chk('masas: la cantidad en grande', /pr-res__num">2</.test(masas), masas)
  chk('… y la hora de la última', /Última a las 10:18/.test(masas), masas)
  chk('… sin chocolate: "todas comunes"', /pr-res__sub">todas comunes</.test(masas), masas)
  chk('… con chocolate lo dice', /pr-res__sub">1 de chocolate</.test(S.htmlMasasResumen([MASAS[0], { ...MASAS[1], es_chocolate: true }])))
  // Las carga el masero: desde la planilla NO se editan.
  chk('… y NINGÚN control para editarlas', !/<button|<input|<select/.test(masas) &&
    /<div class="pr-res pr-res--masas" id="pr-planilla-masas"><\/div>/.test(FUENTE), masas)
  chk('sin masas todavía, se dice', /todavía ninguna/.test(S.htmlMasasResumen([])) && /Las carga el masero/.test(S.htmlMasasResumen([])))
  chk('con una sola masa dice "común", no "todas comunes"', /pr-res__sub">común</.test(S.htmlMasasResumen([MASAS[0]])))

  // 05/10/2026: cada parada se ve "08:00 a 08:35 · 35 min · Cambio de molde".
  chk('paradas: la terminada con su rango, su duración y el motivo',
    /<span class="pr-parada-item__horas">08:00 a 08:35 · 35 min · <span class="pr-parada-item__que">Cambio de molde<\/span><\/span>/.test(html(S, 'pr-planilla-paradas')), html(S, 'pr-planilla-paradas'))
  chk('… y en la acción "Paró" de arriba, cuántas y cuánto tiempo', /PARÓ<\/span><span class="pr-acc__dato">1 parada · 35 min</.test(html(S, 'pr-planilla-paradas-resumen')), html(S, 'pr-planilla-paradas-resumen'))
  chk('sin parada en curso: "Todavía está parada" se puede marcar', /data-parada-sigue="1" aria-pressed="false">/.test(html(S, 'pr-parada-hora')), html(S, 'pr-parada-hora'))
  chk('… y ninguna franja', S.__doc.getElementById('pr-parada-activa').hidden === true)
  // Planta v2: a "Cerrar planilla" se llega por la barra lateral.
  chk('… y "Cerrar planilla" se puede tocar', /data-seccion="cierre"(?![^>]*disabled)[^>]*>/.test(S.htmlLatSecciones()), S.htmlLatSecciones())

  chk('duración de una hora y pico', S.duracionTexto('2026-09-22T10:00:00Z', '2026-09-22T11:05:00Z') === '1 h 05 min')
  chk('duración ilegible: vacía', S.duracionTexto('basura', null) === '')
  chk('el total parado suma las terminadas y la en curso', S.minutosParadas([
    { inicio: '2026-09-22T10:00:00Z', fin: '2026-09-22T10:35:00Z' },
    { inicio: '2026-09-22T11:00:00Z', fin: null },
  ], new Date('2026-09-22T11:48:00Z')) === 83)
  chk('… y saltea la que no se puede calcular', S.minutosParadas([{ inicio: 'basura', fin: null }]) === 0)
})())

// ── La parada en curso: franja fija, y el cierre NO se bloquea ────────────
esperas.push((async () => {
  const S = armar({ paradas: [{ id: 'pa2', inicio: '2026-09-22T13:32:00Z', fin: null, motivo: 'pulpo' }] })
  await S.abrirPlanilla('t1')
  // 6b · "desde 10:32 · hace 14 min" y "¿Por qué paró?".
  // Planta v2 (6b): la franja en bordó "PARADA · desde las 10:32 · hace …",
  // y el motivo marcado en la grilla de "¿Por qué paró?".
  chk('con parada en curso: la franja fija, desde cuándo y hace cuánto', S.__doc.getElementById('pr-parada-activa').hidden === false &&
    S.__doc.getElementById('pr-parada-activa-texto').textContent === ' · desde las 10:32' &&
    S.__doc.getElementById('pr-parada-activa-motivo').textContent === 'pulpo' &&
    /^ · hace \d/.test(S.__doc.getElementById('pr-parada-activa-hace').textContent), S.__doc.getElementById('pr-parada-activa-hace').textContent)
  chk('… y por qué paró', /<span class="pr-pa-paso__n">1<\/span>¿Por qué paró\?/.test(FUENTE) &&
    /PARADA desde las 10:32<\/span><span class="pr-acc__sub">pulpo/.test(html(S, 'pr-planilla-paradas-resumen')), html(S, 'pr-planilla-paradas-resumen'))
  chk('… con "Volvió a las…"', /id="pr-btn-reanudar"[^>]*>Volvió a las…</.test(FUENTE) && S.__doc.getElementById('pr-btn-reanudar').hidden === false)
  chk('… "Todavía está parada" se apaga (la base rechaza una segunda)', /data-parada-sigue="1" aria-pressed="false" disabled>/.test(html(S, 'pr-parada-hora')), html(S, 'pr-parada-hora'))
  // LO QUE CAMBIÓ: cerrar_turno cierra sola la parada abierta y la marca como
  // que la máquina no volvió. Antes la pantalla lo bloqueaba.
  chk('… pero "Cerrar planilla" SIGUE pudiendo tocarse', /data-seccion="cierre"(?![^>]*disabled)[^>]*>/.test(S.htmlLatSecciones()))
  chk('la parada en curso va PRIMERA y en bordó', (() => {
    // La terminada empezó DESPUÉS que la en curso: la en curso va primera
    // igual (no es un orden por hora).
    const h = S.htmlParadasTurno([
      { id: 'a', inicio: '2026-09-22T14:00:00Z', fin: '2026-09-22T14:20:00Z', motivo: 'vieja' },
      { id: 'b', inicio: '2026-09-22T13:00:00Z', fin: null, motivo: 'ahora' },
    ])
    return h.indexOf('ahora') < h.indexOf('vieja') && /pr-parada-item--curso" data-parada-editar="b"/.test(h) && /10:00 · sigue parada/.test(h) &&
      /\.pr-parada-item--curso \{ background: var\(--p-mal-suave\);/.test(FUENTE)
  })())

  await S.mostrarCierre()
  chk('el cierre SE ABRE con una parada en curso', S.__doc.getElementById('pr-cierre').hidden === false)
  S.estado.cierre.hora = '14:05'
  S.ponerNumero(S.__doc.getElementById('pr-cierre-scrap'), 0)
  S.cambioEnCierre()
  S.intentarCerrar()
  await tic()
  chk('… pero antes de mandar se avisa y se pide confirmar', S.__doc.getElementById('pr-cierre-confirmar').hidden === false &&
    /parada sin terminar/.test(html(S, 'pr-cierre-confirmar-texto')) &&
    /no volvió en todo el turno/.test(html(S, 'pr-cierre-confirmar-texto')), html(S, 'pr-cierre-confirmar-texto'))
  chk('… y todavía no se mandó nada', rpcs(S, 'cerrar_turno').length === 0)
  S.__setRpc(async () => ({ data: { lote: 7023, sublotes: [] }, error: null }))
  S.estado.cierre.confirmado = true
  S.intentarCerrar()
  await tic()
  chk('confirmado: se cierra igual, con la parada abierta', rpcs(S, 'cerrar_turno').length === 1)
  chk('… y el aviso nombra el motivo y la hora de la parada', (() => {
    const a = S.avisosDeCierre({ paradas: [{ inicio: '2026-09-22T13:32:00Z', fin: null, motivo: 'pulpo' }], items: ITEMS })
    return a.length === 1 && a[0].includes('"pulpo"') && a[0].includes('10:32')
  })())
  chk('sin nada producido, el aviso es el otro', (() => {
    const a = S.avisosDeCierre({ paradas: [], items: [] })
    return a.length === 1 && /no produjo/.test(a[0])
  })())
  chk('los dos a la vez, juntos en una sola pregunta',
    S.avisosDeCierre({ paradas: [{ inicio: '2026-09-22T13:32:00Z', fin: null, motivo: 'x' }], items: [] }).length === 2)
  chk('sin nada que avisar, no se pregunta', S.avisosDeCierre({ paradas: [], items: ITEMS }).length === 0)
})())

// ── Lo producido: orden, anulados, corregir y anular ──────────────────────
esperas.push((async () => {
  const S = armar()
  await S.abrirPlanilla('t1')
  const prod = html(S, 'pr-planilla-producido')
  // Planta v2: cada renglón es una fila de la tabla (pr-fila-prod).
  const fila = sub => { const i = prod.indexOf(`>${sub}</span>`); return prod.slice(prod.lastIndexOf('<div class="pr-fila-prod', i), prod.indexOf('<span class="pr-fp__botones', i)) }
  chk('lo producido sale de produccion_items, con SU sublote',
    /pr-fp__sub">7023-1</.test(prod) && /pr-fp__sub">7023-2</.test(prod))
  chk('… en el orden de la base (orden 1, 2)', prod.indexOf('7023-1') < prod.indexOf('7023-2'))
  chk('… se pide por turno y ordenado por orden',
    S.__llamadas.consultas.some(([t, f]) => t === 'produccion_items' && JSON.stringify(f).includes('["eq","turno_id","t1"]')))
  const f1 = fila('7023-1'), f2 = fila('7023-2')
  chk('… el renglón dice producto, cono, caja, cajas y unidades',
    /Cucuruchón Mini<\/span>/.test(f1) && /<span class="pr-cono-chip"[^>]*>CASERATO<\/span>/.test(f1) && /pr-fp__caja">Caja x600</.test(f1) &&
    /pr-fp__cajas">35</.test(f1) && /pr-fp__uni">21\.000</.test(f1), f1)
  chk('… con el texto entero en el title', /title="Cucuruchón Mini · con cono · CASERATO · caja x600"/.test(f1), f1)
  // (El Grande de este catálogo no tiene ninguna presentación con cono: la
  // columna queda vacía, como su title, sin decir "sin cono".)
  chk('… sin cono no nombra ningún cono', !/pr-cono-chip|Común|sin cono/.test(f2) && /pr-fp__cono"><\/span>/.test(f2) && /pr-fp__caja">Caja x200</.test(f2), f2)
  chk('… y cada uno se puede corregir y borrar', /data-corregir="it-1"/.test(prod) && /data-borrar="it-1"/.test(prod))
  chk('el total del turno suma cajas y unidades',
    /pr-total__valor">55 cajas</.test(html(S, 'pr-planilla-total')) && /pr-total__uni">25\.000 unidades</.test(html(S, 'pr-planilla-total')), html(S, 'pr-planilla-total'))
  chk('… y cuántos renglones', S.__doc.getElementById('pr-planilla-renglones').textContent === '2 renglones')
  // Planta v2: sin nada cargado, el lugar libre es el botón grande "+ Agregar
  // el próximo producto" (también con pocos renglones).
  const V0 = armar({ items: [] })
  await V0.abrirPlanilla('t1')
  chk('sin nada cargado, se dice', html(V0, 'pr-planilla-producido') === '' && V0.__doc.getElementById('pr-agregar-proximo').hidden === false &&
    V0.__doc.getElementById('pr-planilla-renglones').textContent === '0 renglones' &&
    /id="pr-agregar-proximo" hidden>\s*<span class="pr-prod__proximo-titulo">\+ Agregar el próximo producto<\/span>/.test(FUENTE))

  // Un ANULADO se sigue viendo: ese sublote existió y su stock entró y salió.
  const A = armar({ items: [...ITEMS, { id: 'it-3', orden: 3, sublote: '7023-3', presentacion_id: 'pr-mini-600', marca_id: null, cajas: 5, unidades_por_caja: 600, unidades: 3000, anulado: true }] })
  await A.abrirPlanilla('t1')
  const pa = html(A, 'pr-planilla-producido')
  chk('un sublote anulado NO se esconde', /7023-3/.test(pa))
  chk('… se muestra anulado', /class="pr-fila-prod pr-fila-prod--anulado"[^>]*><span class="pr-fp__l1"><span class="pr-fp__sub">7023-3</.test(pa) &&
    /pr-fp__anulado">Anulado</.test(pa) && /\.pr-fila-prod--anulado \.pr-fp__l1, \.pr-fila-prod--anulado \.pr-fp__num \{ text-decoration: line-through; \}/.test(FUENTE), pa)
  chk('… sin botones de corregir ni borrar', !/data-corregir="it-3"/.test(pa) && !/data-borrar="it-3"/.test(pa))
  chk('… y NO suma al total', /pr-total__valor">55 cajas</.test(html(A, 'pr-planilla-total')) && /25\.000 unidades/.test(html(A, 'pr-planilla-total')), html(A, 'pr-planilla-total'))
  chk('itemsVivos deja afuera los anulados', A.itemsVivos([{ anulado: true }, { anulado: false }]).length === 1)
  chk('las unidades del total salen de la fila de la base, no del catálogo de hoy',
    A.totalesProducido([{ cajas: 2, unidades: 999, anulado: false }]).unidades === 999)

  // Corregir un renglón DURANTE el turno. (28/09/2026) Con el catálogo
  // leído, abre los mismos PASOS de la carga (ver test-produccion-tablet.js);
  // el panel de solo las cajas queda para cuando el catálogo no se pudo leer.
  const C = armar()
  await C.abrirPlanilla('t1')
  C.estado.catalogo = null
  C.abrirCorregir('it-1', 'corregir')
  chk('corregir: se abre con el sublote y sus cajas',
    /7023-1/.test(C.__doc.getElementById('pr-corregir-titulo').textContent) &&
    C.leerCampoNumero(C.__doc.getElementById('pr-corregir-cajas')) === 35)
  chk('… con el campo de cajas a la vista', C.__doc.getElementById('pr-corregir-campo-cajas').hidden === false)
  await C.confirmarCorregir()
  chk('… sin motivo no se manda', rpcs(C, 'corregir_produccion_item').length === 0 &&
    C.__doc.getElementById('pr-corregir-error').hidden === false)
  C.__doc.getElementById('pr-corregir-motivo').value = 'ok'
  await C.confirmarCorregir()
  chk('… con un motivo de dos letras tampoco (la base pide tres)', rpcs(C, 'corregir_produccion_item').length === 0)
  C.__doc.getElementById('pr-corregir-motivo').value = '  Se contaron mal  '
  C.ponerNumero(C.__doc.getElementById('pr-corregir-cajas'), 0)
  await C.confirmarCorregir()
  chk('… con cero cajas tampoco: para sacarlo, se borra', rpcs(C, 'corregir_produccion_item').length === 0 &&
    /borralo/.test(C.__doc.getElementById('pr-corregir-error').textContent))
  C.ponerNumero(C.__doc.getElementById('pr-corregir-cajas'), 32)
  await C.confirmarCorregir()
  chk('corregir manda el item, las cajas y el motivo recortado',
    JSON.stringify(rpcs(C, 'corregir_produccion_item')[0]?.[1]) === '{"p_item_id":"it-1","p_cajas":32,"p_motivo":"Se contaron mal"}',
    JSON.stringify(rpcs(C, 'corregir_produccion_item')[0]))
  chk('… y el panel se cierra', C.__doc.getElementById('pr-corregir').hidden === true)

  // Borrar = ANULAR: no hay DELETE.
  C.abrirCorregir('it-2', 'anular')
  chk('borrar: no pide cajas', C.__doc.getElementById('pr-corregir-campo-cajas').hidden === true)
  C.__doc.getElementById('pr-corregir-motivo').value = 'Se mojaron'
  await C.confirmarCorregir()
  chk('borrar llama a anular_produccion_item con motivo',
    JSON.stringify(rpcs(C, 'anular_produccion_item')[0]?.[1]) === '{"p_item_id":"it-2","p_motivo":"Se mojaron"}')
  chk('… y NUNCA borra la fila', !C.__llamadas.rpc.some(([n]) => /delete|borrar_produccion/.test(n)))

  // El error de la base se muestra tal cual.
  const E = armar()
  await E.abrirPlanilla('t1')
  E.__setRpc(async () => ({ data: null, error: { message: 'Ese sublote ya está anulado.' } }))
  E.abrirCorregir('it-1', 'anular')
  E.__doc.getElementById('pr-corregir-motivo').value = 'Se mojaron'
  await E.confirmarCorregir()
  chk('el mensaje de la base se muestra tal cual', E.__doc.getElementById('pr-corregir-error').textContent === 'Ese sublote ya está anulado.')
  chk('… y el panel queda abierto para corregirlo', E.__doc.getElementById('pr-corregir').hidden === false)

  // La RPC anda pero la RELECTURA falla: el cambio YA está en la base. Cerrar
  // el panel en silencio ahí haría creer que no pasó nada y llevaría a
  // hacerlo dos veces.
  const G = armar()
  await G.abrirPlanilla('t1')
  G.abrirCorregir('it-1', 'anular')
  G.__doc.getElementById('pr-corregir-motivo').value = 'Se mojaron'
  G.__tablas.turnos_produccion = () => ({ data: null, error: { message: 'sin red' } })
  await G.confirmarCorregir()
  chk('si falla la relectura, se dice que el cambio SÍ se guardó',
    /El cambio se guardó/.test(G.__doc.getElementById('pr-corregir-error').textContent),
    G.__doc.getElementById('pr-corregir-error').textContent)
  chk('… y el panel NO se cierra como si no hubiera pasado nada', G.__doc.getElementById('pr-corregir').hidden === false)
})())

// ── Agregar producto, paso por paso ──────────────────────────────────────
esperas.push((async () => {
  const S = armar()
  await S.abrirPlanilla('t1')
  S.abrirAgregar()
  chk('agregar abre su propia pantalla', S.__doc.getElementById('pr-agregar-prod').hidden === false)
  // A "Agregar producto" y a "Corregir" se llega SIN pasar por el cierre: sus
  // campos de número tienen que quedar enlazados al abrir la planilla, o no
  // abren el teclado numérico ni ponen los puntos de miles.
  chk('los campos de cajas quedan enlazados al abrir la planilla, sin pasar por el cierre',
    S.__doc.getElementById('pr-agregar-cajas').getAttribute('inputmode') === 'numeric' &&
    S.__doc.getElementById('pr-corregir-cajas').getAttribute('inputmode') === 'numeric')
  chk('… y el scrap, en kilos', S.__doc.getElementById('pr-cierre-scrap').getAttribute('inputmode') === 'decimal')
  chk('… diciendo a qué lote va', /Lote 7023 · Máquina 1/.test(S.__doc.getElementById('pr-agregar-lote').textContent))

  // Paso 1: los de chocolate SEPARADOS y abajo.
  const p1 = html(S, 'pr-agregar-panel')
  chk('paso 1: cada producto es un botón', /data-ag-producto="p-mini"/.test(p1) && /data-ag-producto="p-choco"/.test(p1))
  // Planta v2: "COMUNES" arriba y "DE CHOCOLATE", en su propia grilla, abajo.
  const rotChoco = '<span class="pr-ag__rotulo">DE CHOCOLATE</span>'
  chk('… los de chocolate van abajo, en su grupo', p1.indexOf('data-ag-producto="p-mini"') < p1.indexOf(rotChoco) &&
    p1.indexOf(rotChoco) < p1.indexOf('data-ag-producto="p-choco"'), p1)
  chk('… la familia chica arriba y el tamaño grande', /data-ag-producto="p-mini"[^>]*><span class="pr-ag__muestra"[^>]*><\/span><span class="pr-ag__familia">Cucuruchón<\/span><span class="pr-ag__tamano">Mini<\/span>/.test(p1), p1)
  chk('… y la etiqueta ENTERA del de chocolate en marrón', /class="pr-ag__producto pr-ag__producto--choco" data-ag-producto="p-choco"/.test(p1) &&
    !/pr-ag__producto--choco" data-ag-producto="p-mini"/.test(p1), p1)
  chk('… y el grupo "De chocolate" separa las dos grillas', p1.includes(`${rotChoco}<div class="pr-ag__productos pr-ag__productos--choco">`))
  chk('el tipo de masa es lo que decide, no el nombre',
    S.esProductoChocolate({ tipo_masa: 'Chocolate' }) && S.esProductoChocolate({ tipo_masa: 'chocolate' }) &&
    !S.esProductoChocolate({ tipo_masa: 'Común', nombre: 'Cono de chocolate' }))
  chk('sin productos de chocolate no se dibuja ese grupo',
    !/DE CHOCOLATE/.test(S.htmlPasoProducto({ productos: [{ id: 'a', nombre: 'X', tipo_masa: 'Común' }], presentaciones: [], marcas: [] })))
  chk('sin productos, se dice dónde se cargan', /Configuración → Productos/.test(S.htmlPasoProducto({ productos: [], presentaciones: [], marcas: [] })))

  // Los pasos de la izquierda. Planta v2: Producto → Cono → Presentación →
  // (Caja) → Cajas. La caja aparece solo si hay que elegirla.
  let pasos = S.pasosAgregar(S.estado.agregar, cat())
  chk('pasos: son 4 y el primero es el actual', pasos.length === 4 && pasos.map(x => x.clave).join(',') === 'producto,cono,presentacion,cajas' &&
    pasos[0].estado === 'actual' && pasos[0].n === 1, pasos.map(x => x.clave).join(','))
  chk('… los que faltan están apagados', pasos.slice(1).every(x => x.estado === 'falta'))
  chk('… y un paso que falta NO muestra ningún valor',
    !/Elegí uno/.test(S.htmlPasosAgregar([{ n: 2, titulo: 'Presentación', valor: '', estado: 'falta' }])) &&
    !/Caja x600/.test(S.htmlPasosAgregar([{ n: 3, titulo: 'Presentación', valor: 'Caja x600', estado: 'falta' }])) &&
    /pr-paso__v">—</.test(S.htmlPasosAgregar([{ n: 3, titulo: 'Presentación', valor: 'Caja x600', estado: 'falta' }])))

  S.elegirProductoAgregar('p-mini')
  chk('elegir el producto lleva al paso 2, el cono', S.estado.agregar.paso === 'cono')
  // (28/09/2026) Tres columnas: la barra, los pasos y las opciones del paso
  // actual. El cono y las cajas ya NO comparten: el cono ocupa la columna.
  chk('… y el cono ocupa la columna de las opciones, solo', S.__doc.getElementById('pr-agregar-cono').hidden === false &&
    S.__doc.getElementById('pr-agregar-cajas-panel').hidden === true &&
    S.__doc.getElementById('pr-agregar-panel').hidden === true)
  chk('… la grilla es siempre la misma (pasos + opciones)', S.__doc.getElementById('pr-ag-grilla').className === 'pr-ag')
  chk('… y la lista de conos scrollea en su recuadro', /id="pr-agregar-marcas" data-scroll-propio/.test(FUENTE))
  chk('paso 2: "Sin cono" se puede elegir si el producto tiene presentaciones sin cono', S.__doc.getElementById('pr-agregar-sin-cono').disabled === false)
  chk('… y el rótulo dice cuántos conos activos hay', S.__doc.getElementById('pr-agregar-conos-rotulo').textContent === 'CON CONO · 3 ACTIVOS',
    S.__doc.getElementById('pr-agregar-conos-rotulo').textContent)
  chk('… un producto que SOLO tiene presentaciones con cono deja "Sin cono" apagado', (() => {
    const T = armar()
    T.estado.catalogo = { ...cat(), cajas: [], empaque: [], insumos: [] }
    T.estado.planilla = { ...PLANILLA, masas: [{ ...MASAS[0], es_chocolate: true }] }
    T.abrirAgregar()
    T.elegirProductoAgregar('p-choco')
    return T.estado.agregar.paso === 'cono' && T.__doc.getElementById('pr-agregar-sin-cono').disabled === true
  })())
  chk('… y uno SIN presentaciones con cono va derecho a la presentación, sin cono', (() => {
    const T = armar()
    T.estado.catalogo = { ...cat(), cajas: [], empaque: [], insumos: [] }
    T.estado.planilla = PLANILLA
    T.abrirAgregar()
    T.elegirProductoAgregar('p-gde')
    return T.estado.agregar.paso === 'presentacion' && T.estado.agregar.conCono === false && T.estado.agregar.marcaElegida === true
  })())

  const conos = html(S, 'pr-agregar-marcas')
  chk('conos: "Común" primero, y es una opción de verdad', conos.indexOf('data-marca=""') === conos.indexOf('data-marca'))
  chk('… el del sublote anterior se dice', /el de 7023-1/.test(conos), conos)
  chk('conoAnterior toma el último sublote VIVO con cono', (() => {
    const c = S.conoAnterior([
      { marca_id: 'mk-grido', sublote: '7023-1', anulado: false },
      { marca_id: 'mk-caserato', sublote: '7023-2', anulado: false },
      { marca_id: 'mk-casona', sublote: '7023-3', anulado: true },
    ])
    return c.marcaId === 'mk-caserato' && c.sublote === '7023-2'
  })())
  chk('… sin ninguno con cono, no se propone nada', S.conoAnterior([{ marca_id: null, anulado: false }]) === null)

  S.estado.agregar.busqueda = 'cas'
  S.__doc.getElementById('pr-agregar-marcas').innerHTML = S.htmlMarcas(cat().marcas, 'cas', S.estado.agregar, S.conoAnterior(ITEMS))
  const filtrados = html(S, 'pr-agregar-marcas')
  chk('el buscador filtra sin acentos ni mayúsculas', /CAS<\/strong>ERATO/.test(filtrados) && /HELADERÍA LA/.test(filtrados) && !/GRIDO/.test(filtrados))
  chk('… con la coincidencia en negrita', /<strong>CAS<\/strong>ERATO/.test(filtrados), filtrados)
  chk('… y sin resultados lo dice, con qué hacer', /Ningún cono coincide con "zzz"/.test(S.htmlMarcas(cat().marcas, 'zzz', S.estado.agregar, null)))
  // Escrito SIN acento encuentra el que SÍ lo tiene: en la tablet nadie va a
  // buscar "heladería" con la tilde puesta.
  chk('… buscando sin acento encuentra el que lo tiene',
    /HELADER<strong>ÍA<\/strong>/.test(S.htmlMarcas(cat().marcas, 'ia', S.estado.agregar, null)) &&
    /HELADERÍA LA CASONA/.test(S.htmlMarcas(cat().marcas, 'heladeria', S.estado.agregar, null).replace(/<\/?strong>/g, '')),
    S.htmlMarcas(cat().marcas, 'heladeria', S.estado.agregar, null))
  S.estado.agregar.busqueda = ''

  S.elegirCono('mk-caserato')
  chk('elegir el cono lleva a la presentación', S.estado.agregar.paso === 'presentacion' && S.estado.agregar.marcaId === 'mk-caserato' &&
    S.__doc.getElementById('pr-agregar-cono').hidden === true && S.__doc.getElementById('pr-agregar-panel').hidden === false)
  const p3 = html(S, 'pr-agregar-panel')
  chk('paso 3: solo las presentaciones CON cono de ese producto',
    /data-ag-presentacion="pr-mini-600"/.test(p3) && !/pr-mini-300/.test(p3) && !/pr-gde-200/.test(p3), p3)
  chk('… con sus unidades por caja', /pr-ag__pres-u"[^>]*>600<\/span><span class="pr-ag__pres-nota">unidades por caja</.test(p3), p3)

  // Sin cajas configuradas para la presentación (este catálogo no tiene
  // empaque), la caja queda resuelta sin caja: derecho a las cajas.
  S.elegirPresentacionAgregar('pr-mini-600')
  chk('elegir la presentación lleva a las cajas', S.estado.agregar.paso === 'cajas')
  chk('… y ahí las cajas ocupan la columna (el cono se cambia tocando su paso)',
    S.__doc.getElementById('pr-agregar-cono').hidden === true && S.__doc.getElementById('pr-agregar-cajas-panel').hidden === false)
  pasos = S.pasosAgregar(S.estado.agregar, cat())
  chk('los pasos hechos se pueden tocar para volver', /data-paso-ag="producto"/.test(S.htmlPasosAgregar(pasos)) && /data-paso-ag="cono"/.test(S.htmlPasosAgregar(pasos)))
  chk('… mostrando lo elegido', pasos[0].valor === 'Cucuruchón Mini' && pasos[1].valor === 'CASERATO' && pasos[2].valor === 'Caja x600 · 600',
    JSON.stringify(pasos.map(x => x.valor)))

  S.cambiarCajas(1)
  chk('las cajas suben de a una', S.estado.agregar.cajas === 1)
  chk('… con una, "caja ="', S.__doc.getElementById('pr-agregar-cuenta').textContent === 'caja =')
  S.ponerNumero(S.__doc.getElementById('pr-agregar-cajas'), 35)
  S.estado.agregar.cajas = 35
  S.pintarAgregar()
  // Planta v2: "35 [cajas =] 21.000 unidades" (el número va en el campo).
  chk('el cálculo dice cajas = unidades', S.__doc.getElementById('pr-agregar-cuenta').textContent === 'cajas =')
  chk('… y el total en unidades, con puntos de miles', S.__doc.getElementById('pr-agregar-unidades').textContent === '21.000 unidades')
  chk('… el botón dice cuántas cajas agrega', S.__doc.getElementById('pr-agregar-confirmar').textContent === 'Agregar 35 cajas a lo producido')
  S.cambiarCajas(-1)
  chk('y bajan de a una', S.estado.agregar.cajas === 34)
  S.cambiarCajas(-99)
  chk('… sin pasar de cero', S.estado.agregar.cajas === 0)

  S.estado.agregar.cajas = 35
  S.ponerNumero(S.__doc.getElementById('pr-agregar-cajas'), 35)
  S.__setRpc(async n => n === 'registrar_produccion_item'
    ? { data: { produccion_item_id: 'it-9', sublote: '7023-3', orden: 3, unidades: 21000 }, error: null }
    : { data: null, error: null })
  await S.confirmarAgregar()
  chk('registrar_produccion_item con el turno, la presentación, el cono y las cajas',
    JSON.stringify(rpcs(S, 'registrar_produccion_item')[0]?.[1]) ===
    '{"p_turno_id":"t1","p_presentacion_id":"pr-mini-600","p_marca_id":"mk-caserato","p_cajas":35,"p_caja_insumo_id":null,"p_embolsado":"ninguno"}',
    JSON.stringify(rpcs(S, 'registrar_produccion_item')[0]))
  chk('… y se vuelve a la planilla, diciendo el sublote que devolvió la base',
    S.__doc.getElementById('pr-planilla').hidden === false && S.__llamadas.exitos.some(t => /7023-3/.test(t)))

  // Sin cono: el paso del cono queda hecho con "Sin cono".
  const N = armar()
  await N.abrirPlanilla('t1')
  N.abrirAgregar()
  N.elegirProductoAgregar('p-gde')
  N.elegirPresentacionAgregar('pr-gde-200')
  chk('sin cono se va derecho a las cajas', N.estado.agregar.paso === 'cajas')
  chk('… el panel del cono no aparece', N.__doc.getElementById('pr-agregar-cono').hidden === true)
  chk('… y las cajas quedan en el centro', N.__doc.getElementById('pr-ag-grilla').className === 'pr-ag')
  const pn = N.pasosAgregar(N.estado.agregar, cat())
  chk('… los pasos son 4, el cono dice "Sin cono" y Cajas es el 4', pn.length === 4 && pn[1].valor === 'Sin cono' && pn[3].clave === 'cajas' && pn[3].n === 4,
    JSON.stringify(pn))
  N.estado.agregar.cajas = 7
  await N.confirmarAgregar()
  chk('sin cono, el cono viaja en null', rpcs(N, 'registrar_produccion_item')[0]?.[1].p_marca_id === null)

  // Volver atrás invalida lo de abajo. (Con una masa de chocolate en el
  // turno: si no, el de chocolate se frena en el paso del producto.)
  const V = armar({ masas: [...MASAS, { id: 'm-13', nro: 13, hora: '2026-09-22T13:40:00Z', doble: false, origen: 'original', es_chocolate: true }] })
  await V.abrirPlanilla('t1')
  V.abrirAgregar()
  V.elegirProductoAgregar('p-mini')
  V.elegirCono('mk-grido')
  V.elegirPresentacionAgregar('pr-mini-600')
  V.irAPasoAgregar('producto')
  V.elegirProductoAgregar('p-choco')
  chk('elegir OTRO producto borra la presentación y el cono del anterior',
    V.estado.agregar.presentacionId === '' && V.estado.agregar.marcaId === null && V.estado.agregar.conCono === null)
  V.elegirCono('mk-caserato')
  V.elegirPresentacionAgregar('pr-choco-500')
  V.irAPasoAgregar('cono')
  V.elegirCono('mk-grido')
  chk('volver al cono y elegir otro cono NO borra la presentación', V.estado.agregar.presentacionId === 'pr-choco-500' && V.estado.agregar.marcaId === 'mk-grido')
  V.irAPasoAgregar('presentacion')
  V.elegirPresentacionAgregar('pr-choco-500')
  chk('volver a la presentación y elegir la misma NO borra lo de abajo', V.estado.agregar.presentacionId === 'pr-choco-500' && V.estado.agregar.paso === 'cajas')

  // 5b · Un producto de chocolate sin masa de chocolate en el turno: se dice
  // en el mismo paso, con "Ir a Sala de masa", y no avanza.
  const K = armar()
  await K.abrirPlanilla('t1')
  K.abrirAgregar()
  K.elegirProductoAgregar('p-choco')
  chk('chocolate sin masa de chocolate: se queda en el producto y lo dice', K.estado.agregar.paso === 'producto' &&
    /En este turno no hay masa de chocolate/.test(html(K, 'pr-agregar-panel')) && /data-ag-ir-sala="1"/.test(html(K, 'pr-agregar-panel')), html(K, 'pr-agregar-panel'))

  // Sin cajas no se manda.
  const Z = armar()
  await Z.abrirPlanilla('t1')
  Z.abrirAgregar()
  Z.elegirProductoAgregar('p-mini')
  Z.elegirCono('')
  Z.elegirPresentacionAgregar('pr-mini-600')
  chk('"Común" también es elegir un cono', Z.estado.agregar.marcaElegida === true && Z.estado.agregar.marcaId === null)
  await Z.confirmarAgregar()
  chk('sin cajas no se manda nada', rpcs(Z, 'registrar_produccion_item').length === 0 &&
    Z.__doc.getElementById('pr-agregar-error').hidden === false)
})())

// ── Un cono nuevo: queda pendiente y se puede usar igual ─────────────────
esperas.push((async () => {
  const S = armar()
  await S.abrirPlanilla('t1')
  S.abrirAgregar()
  S.elegirProductoAgregar('p-mini')
  S.elegirConoSiNo(true)
  S.elegirPresentacionAgregar('pr-mini-600')
  S.__doc.getElementById('pr-agregar-cono-nombre').value = '  heladería del sol  '
  S.__setRpc(async n => n === 'proponer_marca' ? { data: { marca_id: 'mk-nueva', ya_existia: false }, error: null } : { data: null, error: null })
  await S.crearConoNuevo()
  chk('proponer_marca recibe el nombre recortado', rpcs(S, 'proponer_marca')[0]?.[1].p_nombre === 'heladería del sol')
  chk('… el cono nuevo queda elegido', S.estado.agregar.marcaId === 'mk-nueva' && S.estado.agregar.marcaElegida === true)
  chk('… y se puede usar igual', S.estado.agregar.paso === 'cajas')
  S.irAPasoAgregar('cono')
  const conos = html(S, 'pr-agregar-marcas')
  chk('… pero la lista dice que está a revisar', /pr-cono__pendiente">nuevo, a revisar</.test(conos), conos)
  chk('… guardado en MAYÚSCULAS, como lo guarda la base', /HELADERÍA DEL SOL/.test(conos))
  S.estado.agregar.cajas = 3
  await S.confirmarAgregar()
  chk('… y viaja como cualquier otro cono', rpcs(S, 'registrar_produccion_item')[0]?.[1].p_marca_id === 'mk-nueva')

  // Uno que YA existía: no se afirma en qué estado está.
  const Y = armar()
  await Y.abrirPlanilla('t1')
  Y.abrirAgregar()
  Y.__doc.getElementById('pr-agregar-cono-nombre').value = 'Grido'
  Y.__setRpc(async () => ({ data: { marca_id: 'mk-otro', ya_existia: true }, error: null }))
  await Y.crearConoNuevo()
  // Terminar la tablet, parte 5: si ya existía y no está en el catálogo
  // (que trae todos los activos), está dado de baja y no se ofrece.
  chk('un cono que ya existía y no está activo no se agrega: se dice',
    !Y.estado.catalogo.marcas.some(m => m.id === 'mk-otro') && /dado de baja/.test(Y.__doc.getElementById('pr-agregar-cono-error').textContent))

  // Un nombre ya rechazado: la base LANZA y el mensaje ya está escrito.
  const R = armar()
  await R.abrirPlanilla('t1')
  R.abrirAgregar()
  R.__doc.getElementById('pr-agregar-cono-nombre').value = 'Prohibido'
  R.__setRpc(async () => ({ data: null, error: { message: 'Ese cono está marcado como rechazado. Habláló con quien configura producción.' } }))
  await R.crearConoNuevo()
  chk('un cono rechazado: el mensaje de la base, tal cual',
    R.__doc.getElementById('pr-agregar-cono-error').textContent === 'Ese cono está marcado como rechazado. Habláló con quien configura producción.')
  chk('… y no queda ningún cono elegido', R.estado.agregar.marcaElegida === false)
  R.__doc.getElementById('pr-agregar-cono-nombre').value = '   '
  await R.crearConoNuevo()
  chk('sin nombre no se llama a la base', rpcs(R, 'proponer_marca').length === 1)
})())

// ── El cierre ─────────────────────────────────────────────────────────────
esperas.push((async () => {
  const S = armar()
  await S.abrirPlanilla('t1')
  await S.mostrarCierre()
  // 05/10/2026: la hora en que terminó de producir se PREGUNTA (sin ± 5 ni
  // una hora puesta de antemano).
  chk('el cierre abre SIN hora: se pregunta', S.estado.cierre.hora === '' &&
    S.__doc.getElementById('pr-cierre-hora').textContent === 'Tocá para poner la hora', S.estado.cierre.hora)
  chk('sin borrador no dice que se recuperó', S.__doc.getElementById('pr-cierre-borrador').hidden === true)
  // El cierre simple (07/10/2026): LO PRODUCIDO, una línea por producto (con
  // sus cajas y unidades) y el total. Ya no los casilleros del turno.
  const filas = [...html(S, 'pr-cierre-resumen').matchAll(/<span class="pr-cierre-prod__que">([^<]*)<\/span><span class="pr-cierre-prod__cuanto">([^<]*)<\/span>/g)].map(m => m[1] + '|' + m[2])
  chk('lo producido: una línea por producto, con cajas y unidades',
    filas.length === 2 && filas.includes('Cucuruchón Mini|35 cajas · 21.000 u') && filas.includes('Cucuruchón Grande|20 cajas · 4.000 u'), html(S, 'pr-cierre-resumen'))
  chk('… y el total de todo', /<div class="pr-cierre-prod__total"><span>Total<\/span><span>55 cajas · 25\.000 u<\/span><\/div>/.test(html(S, 'pr-cierre-resumen')), html(S, 'pr-cierre-resumen'))
  chk('… dos sublotes del mismo producto van en UNA línea', (() => {
    const h = S.htmlResumenCierre({ items: [
      { id: 'a', sublote: '1-1', presentacion_id: ITEMS[0].presentacion_id, cajas: 2, unidades: 10 },
      { id: 'b', sublote: '1-2', presentacion_id: ITEMS[0].presentacion_id, cajas: 3, unidades: 15 },
      { id: 'c', sublote: '1-3', presentacion_id: ITEMS[0].presentacion_id, cajas: 9, unidades: 45, anulado: true },
    ] }, S.estado.catalogo)
    return (h.match(/pr-cierre-prod__fila/g) || []).length === 1 && /<span class="pr-cierre-prod__cuanto">5 cajas · 25 u<\/span>/.test(h)
  })())
  chk('… sin nada cargado, lo dice', /No se cargó nada producido/.test(S.htmlResumenCierre({ items: [] }, null)))
  chk('… y el título dice desde cuándo', /^LO PRODUCIDO · 06:02 A —$/.test(S.__doc.getElementById('pr-cierre-resumen-titulo').textContent),
    S.__doc.getElementById('pr-cierre-resumen-titulo').textContent)

  // Nada se marca hasta que se intenta: señalar en rojo un formulario que
  // nadie terminó de llenar es ruido.
  chk('al abrir, ningún campo está marcado aunque falte el scrap',
    !/pr-campo--mal/.test(S.__doc.getElementById('pr-cierre-campo-scrap').className) &&
    S.__doc.getElementById('pr-cierre-error').hidden === true)

  // Lo que falta: el error PEGADO al botón, y el campo marcado.
  S.estado.cierre.hora = '14:05'
  S.intentarCerrar()
  await tic()
  chk('sin scrap no se manda', rpcs(S, 'cerrar_turno').length === 0)
  chk('… el error va pegado al botón y dice qué hacer',
    S.__doc.getElementById('pr-cierre-error').hidden === false &&
    S.__doc.getElementById('pr-cierre-error').textContent === 'Falta el scrap. Si no hubo, poné 0.')
  chk('… el campo del scrap se marca', /pr-campo--mal/.test(S.__doc.getElementById('pr-cierre-campo-scrap').className))
  chk('… y los otros NO', !/pr-campo--mal/.test(S.__doc.getElementById('pr-cierre-campo-hora').className))
  // Si el botón se deshabilitara, el error pegado a él no aparecería NUNCA.
  chk('… el botón sigue pudiéndose tocar', S.__doc.getElementById('pr-cierre-enviar').disabled === false)
  S.ponerNumero(S.__doc.getElementById('pr-cierre-scrap'), 0)
  S.cambioEnCierre()
  chk('scrap 0 es un dato: el error se va', S.__doc.getElementById('pr-cierre-error').hidden === true &&
    !/pr-campo--mal/.test(S.__doc.getElementById('pr-cierre-campo-scrap').className))
  chk('faltanParaCerrar: scrap 0 no falta', S.faltanParaCerrar({ hora: '14:05', scrap: 0, obs: '', rota: false }).length === 0)
  chk('… sin scrap, falta', S.faltanParaCerrar({ hora: '14:05', scrap: null, obs: '', rota: false })[0].campo === 'scrap')
  chk('… scrap negativo, también', S.faltanParaCerrar({ hora: '14:05', scrap: -2, obs: '', rota: false })[0].campo === 'scrap')
  chk('… sin hora, falta', S.faltanParaCerrar({ hora: '', scrap: 0, obs: '', rota: false })[0].campo === 'hora')
  chk('… una hora imposible no es una hora', S.faltanParaCerrar({ hora: '25:00', scrap: 0, obs: '', rota: false }).length === 1)

  // 05/10/2026: "La máquina se rompió y no volvió" y el ± 5 de la hora se
  // fueron: si terminó antes, se pregunta "¿Por qué paró antes?".
  chk('sin "La máquina se rompió" ni ± 5 en el cierre', !/pr-cierre-rota/.test(FUENTE) && !/data-hora-paso="5"/.test(FUENTE) && !/pr-cierre-ahora/.test(FUENTE))
  chk('la hora se normaliza', S.normalizarHora('9:05') === '09:05' && S.normalizarHora('  14:5 ') === '' && S.normalizarHora('24:00') === '')
  chk('de a 5 minutos (el editor de paradas)', S.horaConPaso('11:40', 5) === '11:45' && S.horaConPaso('11:40', -5) === '11:35')
  chk('… dando la vuelta en medianoche', S.horaConPaso('23:58', 5) === '00:03' && S.horaConPaso('00:02', -5) === '23:57')
  chk('… y con una hora ilegible no inventa nada', S.horaConPaso('basura', 5) === '')
  S.ponerHoraCierre('11:40')
  chk('la hora de la ventana queda en el cierre y en el botón', S.estado.cierre.hora === '11:40' && S.__doc.getElementById('pr-cierre-hora').textContent === '11:40')
  S.cambiarScrapCierre(1)
  chk('el botón + del scrap suma un kilo', S.leerCampoNumero(S.__doc.getElementById('pr-cierre-scrap')) === 1)
  S.cambiarScrapCierre(-5)
  chk('… y no baja de cero', S.leerCampoNumero(S.__doc.getElementById('pr-cierre-scrap')) === 0)

  // El payload.
  const p = S.parametrosCerrarTurno('t1', { hora: '9:05', scrap: 2.5, obs: '  Se cortó la luz  ', rota: false })
  chk('el payload lleva la hora normalizada, el scrap y las observaciones recortadas',
    p.p_hora_apagado === '09:05' && p.p_scrap_kg === 2.5 && p.p_observaciones === 'Se cortó la luz')
  chk('… observaciones vacías viajan en null', S.parametrosCerrarTurno('t1', { hora: '09:05', scrap: 0, obs: '   ' }).p_observaciones === null)
  // Lo producido ya está cargado sublote por sublote: el cierre no manda nada.
  chk('… y p_productos va VACÍO', Array.isArray(p.p_productos) && p.p_productos.length === 0)
  // TODOS los parámetros de cerrar_turno, siempre (05/10/2026).
  chk('… con p_hora_fin en null y p_motivo_cierre en null si no paró antes', 'p_hora_fin' in p && p.p_hora_fin === null && 'p_motivo_cierre' in p && p.p_motivo_cierre === null, JSON.stringify(p))
})())

// ── El borrador del cierre sobrevive a recargar la tablet ────────────────
esperas.push((async () => {
  const S = armar()
  await S.abrirPlanilla('t1')
  await S.mostrarCierre()
  S.ponerNumero(S.__doc.getElementById('pr-cierre-scrap'), 2.5)
  S.__doc.getElementById('pr-cierre-obs').value = 'Se trabó la cinta'
  S.cambioEnCierre()
  S.ponerHoraCierre('13:40')
  chk('cada cambio ya queda guardado en la tablet, por turno', (() => {
    const b = JSON.parse(S.localStorage.getItem('produccion.cierre.t1') || '{}')
    return b.scrap === 2.5 && b.obs === 'Se trabó la cinta' && b.hora === '13:40'
  })())

  // "Recargar": otra instancia de la página con el mismo localStorage.
  const R = armar()
  for (const [k, v] of S.__ls) R.__ls.set(k, v)
  await R.abrirPlanilla('t1')
  await R.mostrarCierre()
  chk('al volver se recupera todo', R.estado.cierre.scrap === 2.5 && R.estado.cierre.obs === 'Se trabó la cinta' && R.estado.cierre.hora === '13:40')
  chk('… lo dice', R.__doc.getElementById('pr-cierre-borrador').hidden === false)
  chk('… y el scrap vuelve al campo con coma y se lee igual',
    /^2,50*$/.test(R.__doc.getElementById('pr-cierre-scrap').value) &&
    R.leerCampoNumero(R.__doc.getElementById('pr-cierre-scrap')) === 2.5, R.__doc.getElementById('pr-cierre-scrap').value)
  chk('un borrador que no es JSON no rompe', (() => { R.__ls.set('produccion.cierre.x', '{roto'); return R.leerBorradorCierre('x') === null })())
  R.__ls.set('produccion.cierre.y', JSON.stringify({ hora: 5, scrap: 'mucho', obs: null, motivoId: 7, motivoDetalle: null }))
  const y = R.leerBorradorCierre('y')
  chk('un borrador con datos raros se limpia', y.hora === '' && y.scrap === null && y.obs === '' && y.motivoId === null && y.motivoDetalle === '')

  // Enviar, y el borrador se borra RECIÉN después.
  R.estado.cierre.hora = '14:05'
  R.cambioEnCierre()
  R.__setRpc(async n => n === 'cerrar_turno' ? { data: { lote: 7023, sublotes: [] }, error: null } : { data: null, error: null })
  R.intentarCerrar()
  await tic()
  chk('con lo producido cargado y sin paradas, se manda sin preguntar', rpcs(R, 'cerrar_turno').length === 1)
  chk('después de cerrar se borra el borrador', R.localStorage.getItem('produccion.cierre.t1') === null)
  chk('y se muestran los sublotes del turno', /7023-1<\/span> <span>35 cajas · 21\.000 unidades<\/span>/.test(html(R, 'pr-cerrado-lista')) &&
    R.__doc.getElementById('pr-cerrado').hidden === false, html(R, 'pr-cerrado-lista'))
  chk('… los anulados no entran a esa lista', !/7023-9/.test(R.htmlSublotesDefinitivos({ lote: 7023, sublotes: [] },
    [{ sublote: '7023-9', cajas: 1, unidades: 1, anulado: true }])))
  chk('… y los que agregue el cierre van después de los de antes', (() => {
    const h = R.htmlSublotesDefinitivos({ lote: 7023, sublotes: [{ sublote: '7023-8', cajas: 2, unidades: 4 }] },
      [{ sublote: '7023-7', cajas: 1, unidades: 2, anulado: false }])
    return h.indexOf('7023-7') < h.indexOf('7023-8')
  })())

  // Error de la base: el mensaje se ve, y el borrador queda.
  const E = armar()
  await E.abrirPlanilla('t1')
  await E.mostrarCierre()
  E.estado.cierre.hora = '14:05'
  E.ponerNumero(E.__doc.getElementById('pr-cierre-scrap'), 0)
  E.cambioEnCierre()
  E.__setRpc(async () => ({ data: null, error: { message: 'El turno ya está cerrado.' } }))
  E.intentarCerrar()
  await tic()
  chk('si la base rechaza: el mensaje TAL CUAL', E.__doc.getElementById('pr-cierre-error').textContent === 'El turno ya está cerrado.')
  // Se ve de verdad: el repintado posterior no lo puede tapar.
  chk('… y se VE (el repintado no lo tapa)', E.__doc.getElementById('pr-cierre-error').hidden === false)
  chk('… el borrador sigue en la tablet', !!E.localStorage.getItem('produccion.cierre.t1'))
  chk('… y el botón vuelve a quedar usable', E.estado.cerrando === false && E.__doc.getElementById('pr-cierre-enviar').disabled === false)
  E.cambioEnCierre()
  chk('… tocar un campo limpia el error de la base', E.__doc.getElementById('pr-cierre-error').hidden === true)
})())

// ── Cerrar a la fuerza, y completar después ──────────────────────────────
esperas.push((async () => {
  const AYER = { ...TURNO, fecha: '2026-09-21' }
  const S = armar({ turno: AYER })
  await S.abrirPlanilla('t1')
  const est = html(S, 'pr-planilla-estado')
  chk('una planilla de otro día lo dice', /quedó abierta de otro día/.test(est), est)
  chk('… y ofrece cerrarla a la fuerza', /data-forzar/.test(est))
  chk('… diciendo qué implica', /pendiente de completar/.test(est))
  chk('una planilla de HOY no dice nada de eso',
    S.htmlEstadoPlanilla({ turno: { ...TURNO, fecha: S.hoyArgentina() } }, S.hoyArgentina()) === '')

  S.abrirForzar()
  await S.confirmarForzar()
  chk('sin motivo no se fuerza nada', rpcs(S, 'forzar_cierre_turno').length === 0 &&
    S.__doc.getElementById('pr-forzar-error').hidden === false)
  S.__doc.getElementById('pr-forzar-motivo').value = 'na'
  await S.confirmarForzar()
  chk('… con dos letras tampoco (la base pide tres)', rpcs(S, 'forzar_cierre_turno').length === 0)
  S.__doc.getElementById('pr-forzar-motivo').value = '  Nadie anotó lo que produjo  '
  await S.confirmarForzar()
  chk('forzar_cierre_turno manda el turno, la persona de la tablet y el motivo',
    JSON.stringify(rpcs(S, 'forzar_cierre_turno')[0]?.[1]) ===
    '{"p_turno_id":"t1","p_persona_id":"e-fede","p_motivo":"Nadie anotó lo que produjo"}',
    JSON.stringify(rpcs(S, 'forzar_cierre_turno')[0]))
  // NO suma stock: no se cierra el turno ni se carga ningún sublote.
  chk('… y NO se cierra el turno ni se carga nada producido',
    rpcs(S, 'cerrar_turno').length === 0 && rpcs(S, 'registrar_produccion_item').length === 0)
  chk('… se vuelve al tablero (la máquina quedó libre)', S.__doc.getElementById('pr-produccion').hidden === false)

  // El tablero avisa de las que quedaron pendientes: el tablero solo muestra
  // los turnos ABIERTOS, así que sin este aviso serían inalcanzables.
  const T = armar({ pendientes: [{ id: 't1', lote: 7023, maquina_id: 'm1', fecha: '2026-09-21', turno: 'Mañana', forzado_por: 'e-fede' }] })
  T.__tablas.turnos_produccion = filtros => filtros.some(f => f[1] === 'estado' && f[2] === 'pendiente_completar')
    ? { data: [{ id: 't1', lote: 7023, maquina_id: 'm1', fecha: '2026-09-21', turno: 'Mañana', forzado_por: 'e-fede' }], error: null }
    : { data: [], error: null }
  await T.mostrarTablero()
  await tic()
  chk('el tablero avisa de las planillas pendientes de completar',
    /pendiente de completar/.test(html(T, 'pr-tablero-aviso')), html(T, 'pr-tablero-aviso'))
  chk('… con la máquina, el lote y un botón para abrirla',
    /Máquina 1 · lote 7023/.test(html(T, 'pr-tablero-aviso')) && /data-planilla="t1"/.test(html(T, 'pr-tablero-aviso')))
  chk('… y sin ninguna pendiente no se dibuja nada', T.htmlPendientesCompletar([], []) === '')
  chk('… una sola se dice en singular', /1 planilla quedó pendiente/.test(T.htmlPendientesCompletar([{ id: 'a', lote: 1, maquina_id: 'm1', forzado_por: 'e' }], [{ id: 'm1', nombre: 'M' }])))
  chk('… la que dejó "Volvió con lote nuevo" (sin forzado_por) dice que falta completar',
    /1 planilla falta completar \(productos y scrap\)/.test(T.htmlPendientesCompletar([{ id: 'a', lote: 1, maquina_id: 'm1', forzado_por: null }], [{ id: 'm1', nombre: 'M' }])))

  // Completarla después es el MISMO cierre.
  const P = armar({ turno: { ...AYER, estado: 'pendiente_completar', forzado_por: 'e-fede', forzado_motivo: 'Nadie anotó' }, items: [] })
  await P.abrirPlanilla('t1')
  chk('una pendiente de completar lo dice, con quién y por qué',
    /Pendiente de completar/.test(html(P, 'pr-planilla-estado')) &&
    /Federico Silva/.test(html(P, 'pr-planilla-estado')) && /Nadie anotó/.test(html(P, 'pr-planilla-estado')),
    html(P, 'pr-planilla-estado'))
  chk('… avisando que lo producido todavía no está en el stock', /todavía no está en el stock/.test(html(P, 'pr-planilla-estado')))
  chk('… se le puede seguir cargando lo producido', P.__doc.getElementById('pr-btn-agregar-producto').disabled === false)
  chk('… la cabecera de la planilla lo dice', P.cabeceraDeVista()?.titulo === 'Planilla · pendiente de completar')
  await P.mostrarCierre()
  // Planta v2: el título va en la cabecera y el botón dice qué hace.
  chk('… y el botón dice "Completar la planilla"', P.__doc.getElementById('pr-cierre-enviar').textContent === 'Completar la planilla')
  chk('… y el cierre lo dice también', P.cabeceraDeVista()?.titulo === 'Completar la planilla')
  P.estado.cierre.hora = '14:05'
  P.ponerNumero(P.__doc.getElementById('pr-cierre-scrap'), 0)
  P.cambioEnCierre()
  P.estado.cierre.confirmado = true
  P.__setRpc(async () => ({ data: { lote: 7023, sublotes: [] }, error: null }))
  P.intentarCerrar()
  await tic()
  chk('completarla es el MISMO cerrar_turno', rpcs(P, 'cerrar_turno').length === 1 &&
    rpcs(P, 'cerrar_turno')[0][1].p_turno_id === 't1')
})())

// ── Paradas: "Paró ahora" y "Volvió a andar" se fueron el 05/10/2026 ──────
// El formulario de Paró (motivo, DESDE, HASTA o "Todavía está parada") y
// "Volvió a las…" los prueba test-produccion-paradas-simple.js.

// ── Sin catálogo: los renglones se siguen viendo, pero no se agrega ──────
esperas.push((async () => {
  const S = armar()
  S.__tablas.productos_terminados = () => ({ data: null, error: { message: 'sin red' } })
  await S.abrirPlanilla('t1')
  chk('sin catálogo, los sublotes se siguen viendo con sus cajas',
    /pr-fp__sub">7023-1</.test(html(S, 'pr-planilla-producido')) && /pr-fp__cajas">35</.test(html(S, 'pr-planilla-producido')))
  // Planta v2: sin catálogo el renglón dice "Producto" (nunca un nombre
  // inventado) y el botón de agregar, trabado, lo explica en su title.
  chk('… y el nombre no se inventa', /<span class="pr-prod-nombre">Producto<\/span>/.test(html(S, 'pr-planilla-producido')) &&
    S.__doc.getElementById('pr-btn-agregar-producto').title === 'No se pudo leer el catálogo de productos', html(S, 'pr-planilla-producido'))
  chk('… "+ Agregar producto" queda trabado', S.__doc.getElementById('pr-btn-agregar-producto').disabled === true &&
    S.__doc.getElementById('pr-agregar-proximo').disabled === true)
  chk('… y abrirlo no hace nada', (() => { S.abrirAgregar(); return S.__doc.getElementById('pr-agregar-prod').hidden === true })())
  chk('un producto que ya no está en el catálogo se dice distinto',
    /ya no está en el catálogo/.test(S.htmlProducido({ id: 'x', sublote: '7023-9', presentacion_id: 'vieja', cajas: 1, unidades: 1 }, cat())))
})())

// ── HTML malicioso en todo lo que se dibuja ──────────────────────────────
esperas.push((async () => {
  const X = armar()
  X.estado.personal = [{ id: 'e-x', nombre: marca('quien') }]
  // Planta v2: el lote y la máquina van en la cabecera (pr-cab), que se
  // escribe con textContent: el contexto se arma sin escapar y va como texto.
  chk('cabecera de la planilla: se escribe con textContent',
    /getElementById\('pr-cab-ctx'\)\.textContent = c\.ctx/.test(FUENTE) && /t\.textContent = c\.titulo/.test(FUENTE) &&
    !/pr-cab-(ctx|titulo)'\)\.innerHTML/.test(FUENTE))
  X.estado.planilla = { turno: { id: 't', lote: marca('lote'), estado: 'abierto' }, maquinaNombre: marca('maquina'), paradas: [], items: [], masas: [], operarios: [] }
  X.estado.vista = 'pr-planilla'
  chk('… el contexto trae el lote y la máquina tal cual (van como texto)', X.cabeceraDeVista().ctx === `Lote ${marca('lote')} · ${marca('maquina')}`)
  chequearMarcas(chk, 'estado de la planilla',
    X.htmlEstadoPlanilla({ turno: { estado: 'pendiente_completar', fecha: '2026-09-21', forzado_por: 'e-x', forzado_motivo: marca('motivoForzado') } }, '2026-09-22'),
    ['quien', 'motivoForzado'])
  // Planta v2: los tres resúmenes de arriba (operarios, masas, paradas) y la
  // lista de paradas del turno. (El resumen de paradas pasa el motivo a
  // minúsculas: las marcas van en minúsculas para que se reconozcan.)
  X.estado.personal = [{ id: 'e-x', nombre: marca('quien') }, { id: 'e-y', nombre: marca('operario') }]
  chequearMarcas(chk, 'resumen de operarios',
    X.htmlOpsResumen({ turno: { encargado_id: 'e-x' }, operarios: [{ empleado_id: 'e-y', hasta: null }] }), ['quien', 'operario'])
  // (El pie nombra al masero por su primera palabra: de la marca queda
  // '"><b', que tampoco puede aparecer crudo.)
  const resMasas = X.htmlMasasResumen([{ nro: 1, hora: null, doble: false, origen: 'modificada', es_chocolate: true, masero_id: 'e-x' }])
  chequearMarcas(chk, 'resumen de masas', resMasas, [])
  chk('resumen de masas: el masero escapado', !resMasas.includes('"><b') && resMasas.includes('&quot;&gt;&lt;b'), resMasas)
  chequearMarcas(chk, 'acción Paró (la que sigue)',
    X.htmlAccionParo([{ motivo: marca('motivoparada'), inicio: '2026-09-22T09:00:00Z', fin: null }]), ['motivoparada'])
  chequearMarcas(chk, 'acción Paró (terminadas)',
    X.htmlAccionParo([{ motivo: marca('motivovieja'), inicio: '2026-09-22T09:00:00Z', fin: '2026-09-22T10:00:00Z' }]), [])
  chequearMarcas(chk, 'paradas del turno',
    X.htmlParadasTurno([{ id: marca('paradaid'), motivo: marca('motivoParada'), inicio: null, fin: null }, { id: 'p2', motivo: marca('motivoVieja'), inicio: null, fin: '2026-09-22T10:00:00Z' }]),
    ['paradaid', 'motivoParada', 'motivoVieja'])

  const catMalo = {
    productos: [{ id: marca('prodId'), nombre: marca('producto'), tipo_masa: 'Común' }],
    presentaciones: [{ id: marca('presId'), producto_id: marca('prodId'), nombre: marca('presentacion'), con_cono: true, empaque: marca('empaque'), unidades_por_caja: 1 }],
    marcas: [{ id: marca('marcaId'), nombre: marca('cono'), estado_alta: 'pendiente_revision' }],
  }
  const itemMalo = { id: marca('itemId'), sublote: marca('sublote'), presentacion_id: marca('presId'), marca_id: marca('marcaId'), cajas: 1, unidades: 1, embolsado: marca('embolsado') }
  chequearMarcas(chk, 'renglón producido', X.htmlProducido(itemMalo, catMalo),
    ['itemId', 'sublote', 'producto', 'presentacion', 'cono', 'embolsado'])
  chequearMarcas(chk, 'renglón que ya no está',
    X.htmlProducido({ id: marca('idViejo'), sublote: marca('subViejo'), presentacion_id: 'nada', cajas: 1, unidades: 1 }, catMalo), ['subViejo'])
  chequearMarcas(chk, 'pasos de agregar',
    X.htmlPasosAgregar(X.pasosAgregar({ paso: 'cajas', productoId: marca('prodId'), conCono: true, presentacionId: marca('presId'), marcaId: marca('marcaId'), marcaElegida: true, cajas: 1 }, catMalo)),
    ['producto', 'presentacion', 'cono'])
  // (28/09/2026) El nombre del producto se parte en familia (chica) y tamaño
  // (grande): las dos mitades van escapadas, y juntas dicen el nombre.
  chequearMarcas(chk, 'paso del producto', X.htmlPasoProducto(catMalo).replace(/<\/span><span class="pr-ag__tamano">/g, ' '), ['prodId', 'producto'])
  // El de chocolate tiene su propio botón, y el aviso de "no hay masa de
  // chocolate" nombra el producto.
  const catChoco = { ...catMalo, productos: [{ id: marca('chocoId'), nombre: `Cucuruchón ${marca('chocoTam')} Chocolate`, tipo_masa: 'Chocolate' }] }
  chequearMarcas(chk, 'paso del producto (chocolate, sin masa)',
    X.htmlPasoProducto(catChoco, { productoId: marca('chocoId'), chocoSinMasa: true }), ['chocoId', 'chocoTam'])
  // Un chocolate con su color ELEGIDO (productos_terminados.color) tiene otra
  // rama del botón: también escapada.
  const catChocoColor = { ...catMalo, productos: [{ id: marca('chocoColId'), nombre: `Cucuruchón ${marca('chocoColTam')} Chocolate`, tipo_masa: 'Chocolate', color: 'rosa' }] }
  chequearMarcas(chk, 'paso del producto (chocolate con color elegido)',
    X.htmlPasoProducto(catChocoColor, { productoId: marca('chocoColId') }), ['chocoColId', 'chocoColTam'])
  // Planta v2: la presentación ya no muestra su empaque (texto de la base).
  const pasoPres = X.htmlPasoPresentacion({ productoId: marca('prodId'), conCono: true }, catMalo)
  chequearMarcas(chk, 'paso de la presentación', pasoPres, ['presId', 'presentacion'])
  chk('paso de la presentación: sin el empaque', !pasoPres.includes('empaque'), pasoPres)
  chequearMarcas(chk, 'lista de conos',
    X.htmlMarcas(catMalo.marcas, '', { marcaId: null, marcaElegida: false }, { marcaId: marca('marcaId'), sublote: marca('subAnterior') }) +
    X.htmlMarcas(catMalo.marcas, marca('busqueda') + 'zz', {}, null),
    ['marcaId', 'cono', 'subAnterior', 'busqueda'])
  chequearMarcas(chk, 'avisos del cierre', X.htmlAvisosCierre([marca('aviso')]), ['aviso'])
  // El cierre simple: lo producido nombra el producto; uno que ya no está en
  // el catálogo, por su sublote.
  chequearMarcas(chk, 'lo producido del cierre', X.htmlResumenCierre({ items: [itemMalo] }, catMalo), ['producto'])
  chequearMarcas(chk, 'lo producido del cierre (sin catálogo)', X.htmlResumenCierre({ items: [itemMalo] }, null), ['sublote'])
  chequearMarcas(chk, 'lo que falta para cerrar (lo que dice la base)',
    X.htmlFaltaCierre({ intentado: false }, { items: [itemMalo] }, { falta: [
      { nivel: 'bloquea', clave: marca('clave'), texto: marca('bloquea'), accion: marca('accion') },
      { nivel: 'aviso', clave: 'parada_abierta', texto: marca('avisobase') },
    ] }), ['bloquea', 'accion', 'avisobase'])
  chequearMarcas(chk, 'sublotes definitivos',
    X.htmlSublotesDefinitivos({ lote: marca('loteRes'), sublotes: [{ sublote: marca('subRes'), cajas: 1, unidades: 1 }] }, []), ['loteRes', 'subRes'])
  chequearMarcas(chk, 'pendientes de completar',
    X.htmlPendientesCompletar([{ id: marca('turnoId'), lote: marca('lotePend'), maquina_id: 'm1' }], [{ id: 'm1', nombre: marca('maquinaPend') }]),
    ['turnoId', 'lotePend', 'maquinaPend'])
  // Planta v2: la grilla de motivos es fija; lo que viene de la base (el
  // motivo de las paradas) se dibuja en la lista del turno.
  X.estado.planilla = { turno: { id: 't', lote: 1, estado: 'abierto' }, paradas: [{ id: 'p', motivo: marca('sugerida'), inicio: '2026-09-22T09:00:00Z', fin: null }], items: [] }
  X.pintarParadas()
  chequearMarcas(chk, 'paradas pintadas', html(X, 'pr-planilla-paradas'), ['sugerida'])
})())

// ── 7 · Lo que falta, a la derecha y con cómo resolverlo ───────────────────
esperas.push((async () => {
  const S = armar({ paradas: [{ id: 'pa9', inicio: '2026-09-22T13:32:00Z', fin: null, motivo: 'pulpo' }], items: [] })
  await S.abrirPlanilla('t1')
  await S.mostrarCierre()
  S.estado.cierre.hora = ''
  S.ponerNumero(S.__doc.getElementById('pr-cierre-scrap'), null)
  S.cambioEnCierre()
  // Planta v2: "LO QUE FALTA" a la derecha. Lo del formulario (hora, scrap)
  // se dice al tocar "Cerrar planilla" (antes sería señalar en rojo algo que
  // nadie terminó de llenar); lo demás sale de que_falta_para_cerrar (la
  // base) y de lo que la pantalla sabe (nada producido, scrap alto).
  const falta = html(S, 'pr-cierre-falta')
  chk('"Lo que falta" se ve a la derecha', /<span class="pr-cierre-caja__rotulo">LO QUE FALTA<\/span>\s*<div class="pr-cierre__falta" id="pr-cierre-falta"/.test(FUENTE))
  chk('… sin intentar, lo del formulario no se dice todavía', !/Falta la hora|Falta el scrap/.test(falta), falta)
  chk('… nada producido, con "Ir a Lo producido"', /No cargaste nada producido/.test(falta) && /data-cierre-ir="producido">Ir a Lo producido</.test(falta))
  chk('… sin intentar, nada en bordó', !/pr-falta__item--mal/.test(falta))
  chk('que_falta_para_cerrar y scrap_de_referencia se piden con el turno',
    JSON.stringify(rpcs(S, 'que_falta_para_cerrar')[0]?.[1]) === '{"p_turno_id":"t1"}' && JSON.stringify(rpcs(S, 'scrap_de_referencia')[0]?.[1]) === '{"p_turno_id":"t1"}')
  S.intentarCerrar()
  await tic()
  const falta2 = html(S, 'pr-cierre-falta')
  chk('después de intentar, lo del formulario va en bordó (y lo de otra sección no)',
    (falta2.match(/pr-falta__item pr-falta__item--mal/g) || []).length === 2 &&
    /Falta a qué hora terminó de producir\./.test(falta2) && /Falta el scrap\. Si no hubo, poné 0\./.test(falta2) &&
    /<div class="pr-falta__item"><span class="pr-falta__chip">AVISO<\/span><span class="pr-falta__texto">No cargaste nada producido\./.test(falta2), falta2)
  chk('el listener lleva a la sección', /const b = ev\.target\.closest\('\[data-cierre-ir\]'\); if \(b\) irDesdeCierre\(b\.dataset\.cierreIr\)/.test(FUENTE))
  // Lo que dice la base: un AVISO de parada, con "Ir a Paradas".
  S.estado.cierreBase = { falta: [{ nivel: 'aviso', clave: 'parada_sin_terminar', texto: 'Hay una parada sin terminar: si cerrás, queda como que no volvió.' }], errorFalta: false, scrapRef: null }
  S.pintarCierre()
  const falta3 = html(S, 'pr-cierre-falta')
  chk('… la parada sin terminar (de la base), con "Ir a Paradas"', /si cerrás, queda como que no volvió/.test(falta3) && /data-cierre-ir="paradas">Ir a Paradas</.test(falta3), falta3)
  chk('… un aviso NO traba el botón', S.__doc.getElementById('pr-cierre-enviar').disabled === false && S.__doc.getElementById('pr-cierre-bloquea').hidden === true)
  const QF = armar()
  QF.__setRpc(async (n) => n === 'que_falta_para_cerrar' ? { data: null, error: { message: 'sin red' } } : { data: null, error: null })
  await QF.abrirPlanilla('t1')
  await QF.mostrarCierre()
  chk('… si que_falta_para_cerrar falla, el cierre lo dice (no "no falta nada")', QF.estado.cierreBase.errorFalta === true &&
    /No se pudo saber si falta algo: la base lo revisa igual al cerrar\./.test(html(QF, 'pr-cierre-falta')) &&
    !/No falta nada/.test(html(QF, 'pr-cierre-falta')) && QF.__doc.getElementById('pr-cierre-enviar').disabled === false, html(QF, 'pr-cierre-falta'))
  chk('… si no se pudo leer, se dice y no se bloquea',
    /No se pudo saber si falta algo/.test(S.htmlFaltaCierre({}, S.estado.planilla, { falta: null, errorFalta: true })) && S.bloqueosCierre({ falta: null, errorFalta: true }) === 0)

  // LO QUE LA BASE DICE QUE NO DEJA CERRAR: "Enviar" se traba (a propósito)
  // y se dice cuántas cosas faltan; lo del formulario sigue sin trabarlo.
  const B = armar()
  B.__setRpc(async (n) => n === 'que_falta_para_cerrar'
    ? { data: [{ nivel: 'bloquea', clave: 'chocolate_sin_masa', texto: 'Hay chocolate sin masa de chocolate', accion: 'Cargá la masa o corregí el producto.' }], error: null }
    : { data: null, error: null })
  await B.abrirPlanilla('t1')
  await B.mostrarCierre()
  const fb = html(B, 'pr-cierre-falta')
  chk('un bloqueo de la base: "NO DEJA CERRAR" con qué hacer', /pr-falta__sello">NO DEJA CERRAR</.test(fb) && /Cargá la masa o corregí el producto\./.test(fb) &&
    /data-cierre-ir="sala">Ir a Sala de masa</.test(fb), fb)
  chk('… "Cerrar planilla" se traba', B.__doc.getElementById('pr-cierre-enviar').disabled === true)
  chk('… y arriba del botón se dice cuántas cosas faltan', B.__doc.getElementById('pr-cierre-bloquea').hidden === false &&
    B.__doc.getElementById('pr-cierre-bloquea').textContent === 'Falta resolver 1 cosa para poder cerrar')
  B.estado.cierre.hora = '14:05'
  B.ponerNumero(B.__doc.getElementById('pr-cierre-scrap'), 0)
  B.cambioEnCierre()
  B.estado.cierre.confirmado = true
  B.intentarCerrar()
  await tic()
  chk('… y aunque se intente, no se manda', rpcs(B, 'cerrar_turno').length === 0)
  chk('bloqueosCierre cuenta solo los que bloquean', B.bloqueosCierre({ falta: [{ nivel: 'bloquea' }, { nivel: 'aviso' }, { nivel: 'bloquea' }] }) === 2 &&
    B.bloqueosCierre({ falta: null }) === 0)

  // El scrap alto: el doble del promedio o más, con 5 turnos o más.
  chk('scrap alto: el doble del promedio con 5 turnos', B.scrapAlto(8, { promedio_kg: 4, turnos: 5 }) === true && B.scrapAlto(7.9, { promedio_kg: 4, turnos: 5 }) === false)
  chk('… con menos de 5 turnos no se compara', B.scrapAlto(100, { promedio_kg: 4, turnos: 4 }) === false)
  chk('… sin scrap o sin promedio, tampoco', B.scrapAlto(null, { promedio_kg: 4, turnos: 9 }) === false && B.scrapAlto(8, null) === false &&
    B.scrapAlto(8, { promedio_kg: 0, turnos: 9 }) === false)
  chk('… y se avisa, con "Revisar"', /Scrap: el doble del promedio<\/span><button type="button" class="pr-falta__link" data-cierre-ir="scrap">Revisar</.test(
    B.htmlFaltaCierre({ scrap: 9 }, { items: ITEMS }, { falta: [], scrapRef: { promedio_kg: 4, turnos: 5 } })))

  const C = armar()
  await C.abrirPlanilla('t1')
  await C.mostrarCierre()
  C.estado.cierre.hora = '14:05'
  C.ponerNumero(C.__doc.getElementById('pr-cierre-scrap'), 0)
  C.cambioEnCierre()
  chk('con todo completo: "No falta nada"', /No falta nada: se puede cerrar\./.test(html(C, 'pr-cierre-falta')), html(C, 'pr-cierre-falta'))
  const sinHora = C.htmlFaltaCierre({ hora: '', scrap: 1, obs: '', intentado: true }, C.estado.planilla)
  chk('sin la hora en que terminó de producir: lo pide', /Falta a qué hora terminó de producir/.test(sinHora), sinHora)
})())

fin()
