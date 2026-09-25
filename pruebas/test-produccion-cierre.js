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
//    p_productos) → { lote, sublotes }. PRIMERO cierra la parada que quedó
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

  chk('planilla: el lote, grande y solo', /pr-planilla-cab__numero">7023</.test(html(S, 'pr-planilla-lote')))
  chk('… la máquina, el turno y la hora de apertura', /Máquina 1/.test(html(S, 'pr-planilla-que')) &&
    /Turno Mañana · abierta 06:02/.test(html(S, 'pr-planilla-que')), html(S, 'pr-planilla-que'))
  chk('… el operario, en su bloque', /Ramón Díaz/.test(html(S, 'pr-planilla-operarios')))
  chk('… y las masas se piden SIN las anuladas',
    S.__llamadas.consultas.some(([t, f]) => t === 'masas' && JSON.stringify(f).includes('["eq","anulada",false]')))

  const masas = html(S, 'pr-planilla-masas')
  chk('masas: la cantidad en grande', /pr-masas__numero">2</.test(masas), masas)
  chk('… y la hora de la última', /última 10:18/.test(masas), masas)
  chk('… las dos últimas, de la más nueva a la más vieja, con hora y tamaño', masas.indexOf('>12<') < masas.indexOf('>11<') &&
    /<strong>12<\/strong> · 10:18 · <span class="pr-masa-tam">DOBLE<\/span>/.test(masas) && /<strong>11<\/strong> · 09:51 · <span class="pr-masa-tam">SIMPLE<\/span>/.test(masas), masas)
  // Terminar la tablet, parte 5: chip SOLO para la modificada (en bordó); la anterior no lleva.
  chk('… "Modificada" solo en la que lo es, y ningún chip de origen', (masas.match(/pr-chip-modificada">Modificada</g) ?? []).length === 1 &&
    !/Anterior|pr-chip-origen/.test(masas), masas)
  // Las carga el masero: desde la planilla NO se editan.
  chk('… y NINGÚN control para editarlas', !/<button|<input|<select/.test(masas), masas)
  chk('sin masas todavía, se dice', /Todavía no hay masas/.test(S.htmlMasasPlanilla([])))
  chk('con una sola masa dice "masa", no "masas"', /pr-masas__ultima">masa ·/.test(S.htmlMasasPlanilla([MASAS[0]])))

  chk('paradas: la terminada con su rango y su duración',
    /<strong>08:00–08:35<\/strong> · Cambio de molde/.test(html(S, 'pr-planilla-paradas')) &&
    /35 min/.test(html(S, 'pr-planilla-paradas')), html(S, 'pr-planilla-paradas'))
  chk('sin parada en curso: "Parada" a la vista', S.__doc.getElementById('pr-btn-parada').hidden === false)
  chk('… y ninguna franja', S.__doc.getElementById('pr-parada-activa').hidden === true)
  chk('… y "Cerrar planilla" se puede tocar', S.__doc.getElementById('pr-btn-cerrar-planilla').disabled === false)

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
  chk('con parada en curso: la franja fija', S.__doc.getElementById('pr-parada-activa').hidden === false &&
    S.__doc.getElementById('pr-parada-activa-texto').textContent === 'desde 10:32 · pulpo')
  chk('… con el tiempo transcurrido', /^hace \d/.test(S.__doc.getElementById('pr-parada-activa-hace').textContent))
  chk('… "Parada" desaparece (la base rechaza una segunda)', S.__doc.getElementById('pr-btn-parada').hidden === true)
  // LO QUE CAMBIÓ: cerrar_turno cierra sola la parada abierta y la marca como
  // que la máquina no volvió. Antes la pantalla lo bloqueaba.
  chk('… pero "Cerrar planilla" SIGUE pudiendo tocarse', S.__doc.getElementById('pr-btn-cerrar-planilla').disabled === false)
  chk('la parada en curso va PRIMERA y en bordó', (() => {
    const h = S.htmlParadas([
      { id: 'a', inicio: '2026-09-22T11:00:00Z', fin: '2026-09-22T11:20:00Z', motivo: 'vieja' },
      { id: 'b', inicio: '2026-09-22T13:00:00Z', fin: null, motivo: 'ahora' },
    ])
    return h.indexOf('ahora') < h.indexOf('vieja') && /pr-renglon--curso[\s\S]*ahora/.test(h) && /en curso/.test(h)
  })())

  await S.mostrarCierre()
  chk('el cierre SE ABRE con una parada en curso', S.__doc.getElementById('pr-cierre').hidden === false)
  S.__doc.getElementById('pr-cierre-hora').value = '14:05'
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
  chk('lo producido sale de produccion_items, con SU sublote',
    /pr-producido__sublote">7023-1</.test(prod) && /pr-producido__sublote">7023-2</.test(prod))
  chk('… en el orden de la base (orden 1, 2)', prod.indexOf('7023-1') < prod.indexOf('7023-2'))
  chk('… se pide por turno y ordenado por orden',
    S.__llamadas.consultas.some(([t, f]) => t === 'produccion_items' && JSON.stringify(f).includes('["eq","turno_id","t1"]')))
  chk('… el renglón dice producto, cono, caja, cajas y unidades',
    /Cucuruchón Mini/.test(prod) && /pr-producido__detalle">con cono · CASERATO · caja x600</.test(prod) &&
    /35 cajas/.test(prod) && /21\.000 u/.test(prod), prod)
  chk('… sin cono no nombra ningún cono', !/Común/.test(prod) && /pr-producido__detalle">caja x200</.test(prod), prod)
  chk('… y cada uno se puede corregir y borrar', /data-corregir="it-1"/.test(prod) && /data-borrar="it-1"/.test(prod))
  chk('el total del turno suma cajas y unidades',
    /55 cajas · 25\.000 u/.test(html(S, 'pr-planilla-total')), html(S, 'pr-planilla-total'))
  chk('sin nada cargado, se dice', /Todavía no cargaste nada producido/.test(S.htmlLoProducido([], cat())))

  // Un ANULADO se sigue viendo: ese sublote existió y su stock entró y salió.
  const A = armar({ items: [...ITEMS, { id: 'it-3', orden: 3, sublote: '7023-3', presentacion_id: 'pr-mini-600', marca_id: null, cajas: 5, unidades_por_caja: 600, unidades: 3000, anulado: true }] })
  await A.abrirPlanilla('t1')
  const pa = html(A, 'pr-planilla-producido')
  chk('un sublote anulado NO se esconde', /7023-3/.test(pa))
  chk('… se muestra anulado', /pr-producido--anulado[\s\S]*7023-3/.test(pa) && /Anulado/.test(pa), pa)
  chk('… sin botones de corregir ni borrar', !/data-corregir="it-3"/.test(pa) && !/data-borrar="it-3"/.test(pa))
  chk('… y NO suma al total', /55 cajas · 25\.000 u/.test(html(A, 'pr-planilla-total')), html(A, 'pr-planilla-total'))
  chk('itemsVivos deja afuera los anulados', A.itemsVivos([{ anulado: true }, { anulado: false }]).length === 1)
  chk('las unidades del total salen de la fila de la base, no del catálogo de hoy',
    A.totalesProducido([{ cajas: 2, unidades: 999, anulado: false }]).unidades === 999)

  // Corregir un renglón DURANTE el turno.
  const C = armar()
  await C.abrirPlanilla('t1')
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
  chk('… los de chocolate van abajo, con su línea', p1.indexOf('Cucuruchón Mini<') < p1.indexOf('pr-ag__corte') &&
    p1.indexOf('pr-ag__corte') < p1.indexOf('Chocolate</button>'), p1)
  chk('… y la palabra "Chocolate" separa las dos grillas', /pr-ag__corte-texto">Chocolate</.test(p1))
  chk('el tipo de masa es lo que decide, no el nombre',
    S.esProductoChocolate({ tipo_masa: 'Chocolate' }) && S.esProductoChocolate({ tipo_masa: 'chocolate' }) &&
    !S.esProductoChocolate({ tipo_masa: 'Común', nombre: 'Cono de chocolate' }))
  chk('sin productos de chocolate no se dibuja ninguna línea',
    !/pr-ag__corte/.test(S.htmlPasoProducto({ productos: [{ id: 'a', nombre: 'X', tipo_masa: 'Común' }], presentaciones: [], marcas: [] })))
  chk('sin productos, se dice dónde se cargan', /Configuración → Productos/.test(S.htmlPasoProducto({ productos: [], presentaciones: [], marcas: [] })))

  // Los pasos de la izquierda.
  let pasos = S.pasosAgregar(S.estado.agregar, cat())
  chk('pasos: son 6 y el primero es el actual', pasos.length === 6 && pasos[0].estado === 'actual' && pasos[0].n === 1)
  chk('… los que faltan están apagados', pasos.slice(1).every(x => x.estado === 'falta'))
  chk('… y un paso que falta NO muestra ningún valor',
    !/Elegí uno/.test(S.htmlPasosAgregar([{ n: 2, titulo: 'Presentación', valor: '', estado: 'falta' }])))

  S.elegirProductoAgregar('p-mini')
  chk('elegir el producto lleva al paso 2', S.estado.agregar.paso === 'cono_si_no')
  const p2 = html(S, 'pr-agregar-panel')
  chk('paso 2: con cono y sin cono, cada uno con cuántas presentaciones tiene',
    /data-ag-cono="1"/.test(p2) && /data-ag-cono="0"/.test(p2) && /1 presentación/.test(p2), p2)
  chk('… la opción sin presentaciones queda apagada y dice por qué', (() => {
    const h = S.htmlPasoConoSiNo({ productoId: 'p-gde', conCono: null }, cat())
    return /data-ag-cono="1" disabled/.test(h) && /no hay presentaciones/.test(h)
  })())

  S.elegirConoSiNo(true)
  const p3 = html(S, 'pr-agregar-panel')
  chk('paso 3: solo las presentaciones CON cono de ese producto',
    /data-ag-presentacion="pr-mini-600"/.test(p3) && !/pr-mini-300/.test(p3) && !/pr-gde-200/.test(p3), p3)
  chk('… con sus unidades por caja', /600 por caja/.test(p3))

  S.elegirPresentacionAgregar('pr-mini-600')
  chk('con cono, el paso siguiente es el cono', S.estado.agregar.paso === 'cono')
  chk('… y el cono y las cajas comparten pantalla', S.__doc.getElementById('pr-agregar-cono').hidden === false &&
    S.__doc.getElementById('pr-agregar-cajas-panel').hidden === false &&
    S.__doc.getElementById('pr-agregar-panel').hidden === true)
  chk('… con la grilla de tres columnas', S.__doc.getElementById('pr-ag-grilla').className === 'pr-ag pr-ag--cono-cajas')

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

  S.elegirCono('mk-caserato')
  chk('elegir el cono lleva a las cajas', S.estado.agregar.paso === 'cajas' && S.estado.agregar.marcaId === 'mk-caserato')
  chk('… y el cono sigue a la vista para cambiarlo', S.__doc.getElementById('pr-agregar-cono').hidden === false)
  pasos = S.pasosAgregar(S.estado.agregar, cat())
  chk('los pasos hechos se pueden tocar para volver', /data-paso-ag="producto"/.test(S.htmlPasosAgregar(pasos)))
  chk('… mostrando lo elegido', pasos[0].valor === 'Cucuruchón Mini' && pasos[3].valor === 'CASERATO')

  S.cambiarCajas(1)
  chk('las cajas suben de a una', S.estado.agregar.cajas === 1)
  S.ponerNumero(S.__doc.getElementById('pr-agregar-cajas'), 35)
  S.estado.agregar.cajas = 35
  S.pintarAgregar()
  chk('el cálculo dice cajas × por caja', S.__doc.getElementById('pr-agregar-cuenta').textContent === '35 × 600 por caja')
  chk('… y el total en unidades, con puntos de miles', S.__doc.getElementById('pr-agregar-unidades').textContent === '21.000 u')
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

  // Sin cono: el paso del cono no existe y la numeración se corre sola.
  const N = armar()
  await N.abrirPlanilla('t1')
  N.abrirAgregar()
  N.elegirProductoAgregar('p-gde')
  N.elegirConoSiNo(false)
  N.elegirPresentacionAgregar('pr-gde-200')
  chk('sin cono se va derecho a las cajas', N.estado.agregar.paso === 'cajas')
  chk('… el panel del cono no aparece', N.__doc.getElementById('pr-agregar-cono').hidden === true)
  chk('… y las cajas quedan en el centro', N.__doc.getElementById('pr-ag-grilla').className === 'pr-ag')
  const pn = N.pasosAgregar(N.estado.agregar, cat())
  chk('… los pasos son 5 y Cajas es el 5', pn.length === 5 && pn[4].clave === 'cajas' && pn[4].n === 5)
  N.estado.agregar.cajas = 7
  await N.confirmarAgregar()
  chk('sin cono, el cono viaja en null', rpcs(N, 'registrar_produccion_item')[0]?.[1].p_marca_id === null)

  // Volver atrás invalida lo de abajo.
  const V = armar()
  await V.abrirPlanilla('t1')
  V.abrirAgregar()
  V.elegirProductoAgregar('p-mini')
  V.elegirConoSiNo(true)
  V.elegirPresentacionAgregar('pr-mini-600')
  V.elegirCono('mk-grido')
  V.irAPasoAgregar('producto')
  V.elegirProductoAgregar('p-choco')
  chk('elegir OTRO producto borra la presentación y el cono del anterior',
    V.estado.agregar.presentacionId === '' && V.estado.agregar.marcaId === null && V.estado.agregar.conCono === null)
  V.elegirConoSiNo(true)
  V.elegirPresentacionAgregar('pr-choco-500')
  V.irAPasoAgregar('cono_si_no')
  V.elegirConoSiNo(true)
  chk('volver al mismo paso y contestar lo mismo NO borra lo de abajo', V.estado.agregar.presentacionId === 'pr-choco-500')

  // Sin cajas no se manda.
  const Z = armar()
  await Z.abrirPlanilla('t1')
  Z.abrirAgregar()
  Z.elegirProductoAgregar('p-mini')
  Z.elegirConoSiNo(true)
  Z.elegirPresentacionAgregar('pr-mini-600')
  Z.elegirCono('')
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
  chk('el cierre abre con la hora de ahora', /^\d{2}:\d{2}$/.test(S.estado.cierre.hora))
  chk('sin borrador no dice que se recuperó', S.__doc.getElementById('pr-cierre-borrador').hidden === true)
  chk('el resumen trae masas, paradas y lo producido',
    /Masas<\/span><strong>2</.test(html(S, 'pr-cierre-resumen')) &&
    /2 sublotes/.test(html(S, 'pr-cierre-resumen')) &&
    /55 cj · 25\.000 u/.test(html(S, 'pr-cierre-resumen')), html(S, 'pr-cierre-resumen'))

  // Nada se marca hasta que se intenta: señalar en rojo un formulario que
  // nadie terminó de llenar es ruido.
  chk('al abrir, ningún campo está marcado aunque falte el scrap',
    !/pr-campo--mal/.test(S.__doc.getElementById('pr-cierre-campo-scrap').className) &&
    S.__doc.getElementById('pr-cierre-error').hidden === true)

  // Lo que falta: el error PEGADO al botón, y el campo marcado.
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

  // "Se rompió y no volvió".
  S.alternarRota()
  chk('la casilla cambia la etiqueta de la hora',
    S.__doc.getElementById('pr-cierre-hora-rotulo').textContent === 'Hora en que se rompió')
  chk('… y hace obligatorio contar qué pasó',
    /obligatorio/.test(html(S, 'pr-cierre-obs-rotulo')) &&
    S.faltanParaCerrar({ hora: '14:05', scrap: 0, obs: '', rota: true })[0].campo === 'obs')
  chk('… la casilla queda marcada', S.__doc.getElementById('pr-cierre-rota').getAttribute('aria-pressed') === 'true')
  S.intentarCerrar()
  await tic()
  chk('… sin contar qué pasó no se manda, con el campo marcado',
    rpcs(S, 'cerrar_turno').length === 0 && /pr-campo--mal/.test(S.__doc.getElementById('pr-cierre-campo-obs').className) &&
    S.__doc.getElementById('pr-cierre-obs-nota').hidden === false)
  S.alternarRota()
  chk('sin marcar, las observaciones vuelven a ser opcionales',
    S.faltanParaCerrar({ hora: '14:05', scrap: 0, obs: '', rota: false }).length === 0 &&
    S.__doc.getElementById('pr-cierre-obs-rotulo').innerHTML === 'Observaciones')

  // La hora, de a 5 minutos.
  chk('la hora se normaliza', S.normalizarHora('9:05') === '09:05' && S.normalizarHora('  14:5 ') === '' && S.normalizarHora('24:00') === '')
  chk('de a 5 minutos', S.horaConPaso('11:40', 5) === '11:45' && S.horaConPaso('11:40', -5) === '11:35')
  chk('… dando la vuelta en medianoche', S.horaConPaso('23:58', 5) === '00:03' && S.horaConPaso('00:02', -5) === '23:57')
  chk('… y con una hora ilegible no inventa nada', S.horaConPaso('basura', 5) === '')
  S.__doc.getElementById('pr-cierre-hora').value = '11:40'
  S.cambiarHoraCierre(5)
  chk('el botón + mueve la hora del campo', S.__doc.getElementById('pr-cierre-hora').value === '11:45')
  chk('… y los botones de la pantalla mueven DE A 5 MINUTOS',
    /data-hora-paso="5"/.test(FUENTE) && /data-hora-paso="-5"/.test(FUENTE))
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
})())

// ── El borrador del cierre sobrevive a recargar la tablet ────────────────
esperas.push((async () => {
  const S = armar()
  await S.abrirPlanilla('t1')
  await S.mostrarCierre()
  S.ponerNumero(S.__doc.getElementById('pr-cierre-scrap'), 2.5)
  S.__doc.getElementById('pr-cierre-obs').value = 'Se trabó la cinta'
  S.cambioEnCierre()
  S.alternarRota()
  chk('cada cambio ya queda guardado en la tablet, por turno', (() => {
    const b = JSON.parse(S.localStorage.getItem('produccion.cierre.t1') || '{}')
    return b.scrap === 2.5 && b.obs === 'Se trabó la cinta' && b.rota === true
  })())

  // "Recargar": otra instancia de la página con el mismo localStorage.
  const R = armar()
  for (const [k, v] of S.__ls) R.__ls.set(k, v)
  await R.abrirPlanilla('t1')
  await R.mostrarCierre()
  chk('al volver se recupera todo', R.estado.cierre.scrap === 2.5 && R.estado.cierre.obs === 'Se trabó la cinta' && R.estado.cierre.rota === true)
  chk('… lo dice', R.__doc.getElementById('pr-cierre-borrador').hidden === false)
  chk('… y el scrap vuelve al campo con coma y se lee igual',
    /^2,50*$/.test(R.__doc.getElementById('pr-cierre-scrap').value) &&
    R.leerCampoNumero(R.__doc.getElementById('pr-cierre-scrap')) === 2.5, R.__doc.getElementById('pr-cierre-scrap').value)
  chk('un borrador que no es JSON no rompe', (() => { R.__ls.set('produccion.cierre.x', '{roto'); return R.leerBorradorCierre('x') === null })())
  R.__ls.set('produccion.cierre.y', JSON.stringify({ hora: 5, scrap: 'mucho', obs: null, rota: 'sí' }))
  const y = R.leerBorradorCierre('y')
  chk('un borrador con datos raros se limpia', y.hora === '' && y.scrap === null && y.obs === '' && y.rota === false)

  // Enviar, y el borrador se borra RECIÉN después.
  R.__doc.getElementById('pr-cierre-hora').value = '14:05'
  R.cambioEnCierre()
  R.__setRpc(async n => n === 'cerrar_turno' ? { data: { lote: 7023, sublotes: [] }, error: null } : { data: null, error: null })
  R.intentarCerrar()
  await tic()
  chk('con lo producido cargado y sin paradas, se manda sin preguntar', rpcs(R, 'cerrar_turno').length === 1)
  chk('después de cerrar se borra el borrador', R.localStorage.getItem('produccion.cierre.t1') === null)
  chk('y se muestran los sublotes del turno', /7023-1<\/span> 35 cajas · 21\.000 unidades/.test(html(R, 'pr-cerrado-lista')) &&
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
  E.__doc.getElementById('pr-cierre-hora').value = '14:05'
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
  const T = armar({ pendientes: [{ id: 't1', lote: 7023, maquina_id: 'm1', fecha: '2026-09-21', turno: 'Mañana' }] })
  T.__tablas.turnos_produccion = filtros => filtros.some(f => f[1] === 'estado' && f[2] === 'pendiente_completar')
    ? { data: [{ id: 't1', lote: 7023, maquina_id: 'm1', fecha: '2026-09-21', turno: 'Mañana' }], error: null }
    : { data: [], error: null }
  await T.mostrarTablero()
  await tic()
  chk('el tablero avisa de las planillas pendientes de completar',
    /pendiente de completar/.test(html(T, 'pr-tablero-aviso')), html(T, 'pr-tablero-aviso'))
  chk('… con la máquina, el lote y un botón para abrirla',
    /Máquina 1 · lote 7023/.test(html(T, 'pr-tablero-aviso')) && /data-planilla="t1"/.test(html(T, 'pr-tablero-aviso')))
  chk('… y sin ninguna pendiente no se dibuja nada', T.htmlPendientesCompletar([], []) === '')
  chk('… una sola se dice en singular', /1 planilla quedó pendiente/.test(T.htmlPendientesCompletar([{ id: 'a', lote: 1, maquina_id: 'm1' }], [{ id: 'm1', nombre: 'M' }])))

  // Completarla después es el MISMO cierre.
  const P = armar({ turno: { ...AYER, estado: 'pendiente_completar', forzado_por: 'e-fede', forzado_motivo: 'Nadie anotó' }, items: [] })
  await P.abrirPlanilla('t1')
  chk('una pendiente de completar lo dice, con quién y por qué',
    /Pendiente de completar/.test(html(P, 'pr-planilla-estado')) &&
    /Federico Silva/.test(html(P, 'pr-planilla-estado')) && /Nadie anotó/.test(html(P, 'pr-planilla-estado')),
    html(P, 'pr-planilla-estado'))
  chk('… avisando que lo producido todavía no está en el stock', /todavía no está en el stock/.test(html(P, 'pr-planilla-estado')))
  chk('… y el botón dice "Completar la planilla"', P.__doc.getElementById('pr-btn-cerrar-planilla').textContent === 'Completar la planilla')
  chk('… se le puede seguir cargando lo producido', P.__doc.getElementById('pr-btn-agregar-producto').disabled === false)
  await P.mostrarCierre()
  chk('… y el cierre lo dice también', /^Completar /.test(P.__doc.getElementById('pr-cierre-titulo').textContent))
  P.__doc.getElementById('pr-cierre-hora').value = '14:05'
  P.ponerNumero(P.__doc.getElementById('pr-cierre-scrap'), 0)
  P.cambioEnCierre()
  P.estado.cierre.confirmado = true
  P.__setRpc(async () => ({ data: { lote: 7023, sublotes: [] }, error: null }))
  P.intentarCerrar()
  await tic()
  chk('completarla es el MISMO cerrar_turno', rpcs(P, 'cerrar_turno').length === 1 &&
    rpcs(P, 'cerrar_turno')[0][1].p_turno_id === 't1')
})())

// ── Paradas: iniciar y reanudar ──────────────────────────────────────────
esperas.push((async () => {
  const S = armar()
  await S.abrirPlanilla('t1')
  S.__tablas.paradas_produccion = [
    { motivo: 'Cambio de molde' }, { motivo: 'cambio de  molde ' }, { motivo: 'Falta masa' }, { motivo: '' },
  ]
  await S.mostrarFormParada()
  const sug = html(S, 'pr-parada-sugerencias')
  chk('sugiere los motivos usados antes, sin repetir', (sug.match(/data-sugerencia=/g) || []).length === 2 && /Falta masa/.test(sug))
  S.__doc.getElementById('pr-parada-motivo').value = 'x'
  await S.confirmarParada()
  chk('motivo de una letra: no se manda', rpcs(S, 'iniciar_parada').length === 0)
  S.__doc.getElementById('pr-parada-motivo').value = '  Se cortó la luz  '
  S.__tablas.paradas_produccion = [{ id: 'pa2', inicio: '2026-09-22T12:00:00Z', fin: null, motivo: 'Se cortó la luz' }]
  await S.confirmarParada()
  chk('iniciar_parada con el turno y el motivo recortado',
    JSON.stringify(rpcs(S, 'iniciar_parada')[0]?.[1]) === '{"p_turno_id":"t1","p_motivo":"Se cortó la luz"}')
  chk('… y aparece la franja', S.__doc.getElementById('pr-parada-activa').hidden === false)
  // Con una parada vieja ADELANTE en la lista: reanudar tiene que terminar la
  // EN CURSO, no la primera que encuentre.
  S.estado.planilla.paradas = [
    { id: 'pa1', inicio: '2026-09-22T10:00:00Z', fin: '2026-09-22T10:20:00Z', motivo: 'vieja' },
    { id: 'pa2', inicio: '2026-09-22T12:00:00Z', fin: null, motivo: 'Se cortó la luz' },
  ]
  S.__tablas.paradas_produccion = [{ id: 'pa2', inicio: '2026-09-22T12:00:00Z', fin: '2026-09-22T12:10:00Z', motivo: 'Se cortó la luz' }]
  await S.reanudar()
  chk('"Reanudar" termina ESA parada, no la primera de la lista',
    JSON.stringify(rpcs(S, 'terminar_parada')[0]?.[1]) === '{"p_parada_id":"pa2"}', JSON.stringify(rpcs(S, 'terminar_parada')[0]))
  chk('… y la franja se va', S.__doc.getElementById('pr-parada-activa').hidden === true)
})())

// ── Sin catálogo: los renglones se siguen viendo, pero no se agrega ──────
esperas.push((async () => {
  const S = armar()
  S.__tablas.productos_terminados = () => ({ data: null, error: { message: 'sin red' } })
  await S.abrirPlanilla('t1')
  chk('sin catálogo, los sublotes se siguen viendo con sus cajas',
    /7023-1/.test(html(S, 'pr-planilla-producido')) && /35 cajas/.test(html(S, 'pr-planilla-producido')))
  chk('… y se dice que el nombre no se puede mostrar', /No se pudo leer el catálogo/.test(html(S, 'pr-planilla-producido')))
  chk('… "+ Agregar producto" queda trabado', S.__doc.getElementById('pr-btn-agregar-producto').disabled === true)
  chk('… y abrirlo no hace nada', (() => { S.abrirAgregar(); return S.__doc.getElementById('pr-agregar-prod').hidden === true })())
  chk('un producto que ya no está en el catálogo se dice distinto',
    /ya no está en el catálogo/.test(S.htmlProducido({ id: 'x', sublote: '7023-9', presentacion_id: 'vieja', cajas: 1, unidades: 1 }, cat())))
})())

// ── HTML malicioso en todo lo que se dibuja ──────────────────────────────
esperas.push((async () => {
  const X = armar()
  X.estado.personal = [{ id: 'e-x', nombre: marca('quien') }]
  chequearMarcas(chk, 'lote de la planilla', X.htmlLotePlanilla({ turno: { lote: marca('lote') } }), ['lote'])
  chequearMarcas(chk, 'cabecera de la planilla',
    X.htmlQuePlanilla({ turno: { turno: marca('turno'), abierto_en: null }, maquinaNombre: marca('maquina') }), ['turno', 'maquina'])
  chequearMarcas(chk, 'estado de la planilla',
    X.htmlEstadoPlanilla({ turno: { estado: 'pendiente_completar', fecha: '2026-09-21', forzado_por: 'e-x', forzado_motivo: marca('motivoForzado') } }, '2026-09-22'),
    ['quien', 'motivoForzado'])
  chequearMarcas(chk, 'masas de la planilla',
    X.htmlMasasPlanilla([{ nro: marca('nro'), hora: null, doble: false, origen: 'modificada', es_chocolate: true }]), ['nro'])
  chequearMarcas(chk, 'paradas',
    X.htmlParadas([{ motivo: marca('motivoParada'), inicio: null, fin: null }, { motivo: marca('motivoVieja'), inicio: null, fin: '2026-09-22T10:00:00Z' }]),
    ['motivoParada', 'motivoVieja'])

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
  chequearMarcas(chk, 'paso del producto', X.htmlPasoProducto(catMalo), ['prodId', 'producto'])
  chequearMarcas(chk, 'paso de la presentación',
    X.htmlPasoPresentacion({ productoId: marca('prodId'), conCono: true }, catMalo), ['presId', 'presentacion', 'empaque'])
  chequearMarcas(chk, 'lista de conos',
    X.htmlMarcas(catMalo.marcas, '', { marcaId: null, marcaElegida: false }, { marcaId: marca('marcaId'), sublote: marca('subAnterior') }) +
    X.htmlMarcas(catMalo.marcas, marca('busqueda') + 'zz', {}, null),
    ['marcaId', 'cono', 'subAnterior', 'busqueda'])
  chequearMarcas(chk, 'avisos del cierre', X.htmlAvisosCierre([marca('aviso')]), ['aviso'])
  chequearMarcas(chk, 'resumen del cierre',
    X.htmlResumenCierre({ masas: [], paradas: [], items: [itemMalo] }, catMalo), ['sublote', 'producto'])
  chequearMarcas(chk, 'sublotes definitivos',
    X.htmlSublotesDefinitivos({ lote: marca('loteRes'), sublotes: [{ sublote: marca('subRes'), cajas: 1, unidades: 1 }] }, []), ['loteRes', 'subRes'])
  chequearMarcas(chk, 'pendientes de completar',
    X.htmlPendientesCompletar([{ id: marca('turnoId'), lote: marca('lotePend'), maquina_id: 'm1' }], [{ id: 'm1', nombre: marca('maquinaPend') }]),
    ['turnoId', 'lotePend', 'maquinaPend'])
  X.__tablas.paradas_produccion = [{ motivo: marca('sugerida') }]
  await X.mostrarFormParada()
  chequearMarcas(chk, 'motivos sugeridos', html(X, 'pr-parada-sugerencias'), ['sugerida'])
})())

fin()
