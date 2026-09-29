// 4h · El historial de una máquina en Sala de masa (la planta con dos modos,
// 28/09/2026). Se abre tocando una máquina en la barra: en el centro las
// masas de ESE turno (botones de 72 px) y a la derecha el detalle de la
// elegida —número y hora, tamaño, quién la hizo, las pastillas, el motivo y
// cada ingrediente con su marca, cantidad y lote—. Solo se anula la ÚLTIMA.
// Planta v2 (28/09/2026): la más nueva arriba, el origen en el title, las
// cantidades como SALIERON (una doble dice el doble) y "marca · lote".
//
// Contra la base (verificado el 28/09/2026 con information_schema y
// pg_constraint):
//  - masas: id, turno_id, nro, hora, doble, origen, es_chocolate, anulada,
//    anulada_motivo, masero_id, motivo, receta_id.
//  - masa_items: ingrediente_id, insumo_id, lote, cantidad_simple_kg,
//    ingrediente_libre; una sola FK a ingredientes y otra a insumos, así que
//    los embeds ingredientes(...) e insumos(...) no son ambiguos.
//  - receta_items: receta_id, ingrediente_id, cantidad_kg.
//  - anular_masa(p_masa_id, p_motivo).
//
//   node pruebas/test-produccion-historial-maquina.js

process.env.TZ = 'UTC'

const path = require('path')
const { arnes, leer, marca, chequearMarcas } = require('./circuito-comun')
const { construirProduccion } = require('./sandbox-produccion')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/produccion.html')
leer(ARCHIVO)
const FUENTE = require('fs').readFileSync(ARCHIVO, 'utf8')
const { chk, esperas, fin } = arnes()

const MAQUINAS = [{ id: 'm1', nombre: 'Máquina 1', orden: 1 }, { id: 'm3', nombre: 'Máquina 3', orden: 2 }]
const TURNOS = [
  { id: 't1', lote: 7033, maquina_id: 'm1', fecha: '2026-09-28', turno: 'Mañana', encargado_id: 'e1', abierto_en: null },
  { id: 't3', lote: 7034, maquina_id: 'm3', fecha: '2026-09-28', turno: 'Mañana', encargado_id: 'e1', abierto_en: null },
]
const MASAS = [
  { id: 'ma1', turno_id: 't1', nro: 1, hora: '2026-09-28T10:05:00Z', tipo_masa: 'Común', doble: false, origen: 'original', es_chocolate: false, anulada: false, masero_id: 'e-mas', motivo: null, receta_id: 'r1' },
  { id: 'ma2', turno_id: 't1', nro: 2, hora: '2026-09-28T10:40:00Z', tipo_masa: 'Común', doble: true, origen: 'modificada', es_chocolate: true, anulada: false, masero_id: 'e-mas', motivo: 'Pidieron de chocolate', receta_id: 'r1' },
  { id: 'ma3', turno_id: 't1', nro: 3, hora: '2026-09-28T11:10:00Z', tipo_masa: 'Común', doble: false, origen: 'anterior', es_chocolate: true, anulada: true, anulada_motivo: 'Se volcó', masero_id: 'e-mas', motivo: null, receta_id: 'r1' },
  { id: 'mx', turno_id: 't3', nro: 1, hora: '2026-09-28T10:00:00Z', tipo_masa: 'Común', doble: false, origen: 'original', es_chocolate: false, anulada: false, masero_id: null, motivo: null, receta_id: 'r1' },
]
const ITEMS = {
  ma2: [
    { ingrediente_id: 'i-agua', insumo_id: null, lote: null, cantidad_simple_kg: 10, ingrediente_libre: null, ingredientes: { nombre: 'Agua', orden: 1 }, insumos: null },
    { ingrediente_id: 'i-harina', insumo_id: 'ins-h2', lote: 'W-9', cantidad_simple_kg: 25, ingrediente_libre: null, ingredientes: { nombre: 'Harina', orden: 2 }, insumos: { nombre: 'Harina 000', marca: 'Wali' } },
    { ingrediente_id: 'i-azucar', insumo_id: 'ins-az', lote: '3391', cantidad_simple_kg: 2.7, ingrediente_libre: null, ingredientes: { nombre: 'Azúcar', orden: 3 }, insumos: { nombre: 'Azúcar', marca: 'Ledesma' } },
    { ingrediente_id: 'i-cacao', insumo_id: 'ins-cac', lote: 'C-1', cantidad_simple_kg: 0.65, ingrediente_libre: null, ingredientes: { nombre: 'Cacao', orden: 7 }, insumos: { nombre: 'Cacao', marca: 'Fénix' } },
    { ingrediente_id: 'i-bica', insumo_id: null, lote: null, cantidad_simple_kg: 0, ingrediente_libre: null, ingredientes: { nombre: 'Bicarbonato', orden: 8 }, insumos: null },
    { ingrediente_id: null, insumo_id: null, lote: null, cantidad_simple_kg: 0.05, ingrediente_libre: 'Gluten', ingredientes: null, insumos: null },
  ],
  ma1: [
    { ingrediente_id: 'i-harina', insumo_id: 'ins-h2', lote: 'W-9', cantidad_simple_kg: 25, ingrediente_libre: null, ingredientes: { nombre: 'Harina', orden: 2 }, insumos: { nombre: 'Harina 000', marca: 'Wali' } },
  ],
}
const RECETA = [
  { receta_id: 'r1', ingrediente_id: 'i-agua', cantidad_kg: 10 },
  { receta_id: 'r1', ingrediente_id: 'i-harina', cantidad_kg: 25 },
  { receta_id: 'r1', ingrediente_id: 'i-azucar', cantidad_kg: 2.5 },
  { receta_id: 'r1', ingrediente_id: 'i-cacao', cantidad_kg: 0 },
  { receta_id: 'r1', ingrediente_id: 'i-bica', cantidad_kg: 0 },
]
const copia = (x) => JSON.parse(JSON.stringify(x))
const eqDe = (f, col) => (f.find(x => x[0] === 'eq' && x[1] === col) ?? [])[2]

function armar({ masas = MASAS, items = ITEMS, receta = RECETA, errorItems = false, rpc } = {}) {
  const S = construirProduccion(ARCHIVO)
  S.estado.modo = 'masa'
  S.estado.persona = { id: 'e-mas', nombre: 'Agustín Barrera', puesto: 'masero' }
  S.estado.personal = [{ id: 'e-mas', nombre: 'Agustín Barrera', puestos: ['masero'] }]
  Object.assign(S.__tablas, {
    maquinas: MAQUINAS,
    turnos_produccion: TURNOS,
    masas: (f) => {
      let out = copia(masas)
      if (f.some(x => x[0] === 'eq' && x[1] === 'anulada')) out = out.filter(m => !m.anulada)
      const dentro = f.find(x => x[0] === 'in' && x[1] === 'turno_id')
      if (dentro) out = out.filter(m => dentro[2].includes(m.turno_id))
      return { data: out, error: null }
    },
    masa_items: (f) => errorItems ? { data: null, error: { message: 'sin red' } } : { data: copia(items[eqDe(f, 'masa_id')] ?? []), error: null },
    receta_items: (f) => ({ data: copia(receta.filter(r => r.receta_id === eqDe(f, 'receta_id'))), error: null }),
    paradas_produccion: [],
    produccion_items: [],
    recetas: [{ tipo_masa: 'Común' }],
    ingredientes: [],
  })
  S.__setRpc(rpc ?? (async () => ({ data: null, error: null })))
  return S
}
const det = (S) => S.__doc.getElementById('pr-hm-detalle').innerHTML
const lista = (S) => S.__doc.getElementById('pr-hm-lista').innerHTML

esperas.push((async () => {
  const S = armar()
  await S.mostrarSala()
  await S.mostrarHistorialMaquina('t1')
  chk('tocar la máquina en la barra abre su historial', S.estado.vista === 'pr-hist-maq' && S.estado.histMaq?.turnoId === 't1')
  chk('el título: máquina · turno · lote · masas (sin la anulada)',
    S.__doc.getElementById('pr-hm-titulo').textContent === 'Máquina 1 · Turno mañana · lote 7033 · 2 masas', S.__doc.getElementById('pr-hm-titulo').textContent)
  const l = lista(S)
  // Planta v2 (28/09/2026): la más nueva arriba.
  chk('solo las masas de ESE turno, la más nueva arriba', /data-hm-masa="ma3"[\s\S]*data-hm-masa="ma2"[\s\S]*data-hm-masa="ma1"/.test(l) && !/data-hm-masa="mx"/.test(l), l)
  // El renglón: "Masa 2" y "Doble · 07:40"; el origen va en el title y lo
  // que no es lo normal (Modificada, Chocolate) en sus pastillas.
  chk('cada masa: "Masa 2" y "Doble · 07:40", el origen en el title y sus pastillas', /pr-hm__masa-l1">Masa 2</.test(l) && /pr-hm__masa-l2">Doble · 07:40</.test(l) &&
    /data-hm-masa="ma2" aria-pressed="true" title="Modificada"/.test(l) &&
    /pr-chip-modificada">Modificada/.test(l) && /pr-chip-choco">Chocolate/.test(l))
  chk('la anulada lo dice', /pr-hm__masa pr-hm__masa--anulada" data-hm-masa="ma3"/.test(l) && /pr-rm__anulada">Anulada/.test(l))
  chk('arranca elegida la última que se puede anular (la 2), con borde naranja', /data-hm-masa="ma2" aria-pressed="true"/.test(l) && S.estado.histMaq.elegida === 'ma2')
  chk('"Solo se puede anular la última masa (la 2)."', S.__doc.getElementById('pr-hm-nota').textContent === 'Solo se puede anular la última masa (la 2).' &&
    S.__doc.getElementById('pr-hm-nota').hidden === false)
  chk('la acción principal: "+ Nueva masa para Máquina 1"', S.__doc.getElementById('pr-hm-nueva').textContent === '+ Nueva masa para Máquina 1')
  chk('la barra marca la máquina que se mira', /data-lateral-turno="t1" aria-current="true"/.test(S.htmlLatSala()) && !/data-lateral-turno="t3" aria-current/.test(S.htmlLatSala()))

  // El detalle a la derecha.
  const d = det(S)
  chk('detalle: número y tamaño', /pr-hm__det-titulo">Masa 2 · Doble</.test(d), d.slice(0, 300))
  chk('… hora y quién la hizo', /pr-hm__det-sub">07:40 · la hizo Agustín Barrera/.test(d))
  chk('… las pastillas y el motivo', /pr-chip-modificada/.test(d) && /· “Pidieron de chocolate”<\/p>/.test(d))
  // Planta v2: las cantidades como SALIERON (una doble, ×2) y "marca · lote".
  chk('… cada ingrediente con su marca, cantidad y lote', /Harina<\/span><span class="pr-hm__ing-cant">50 kg<\/span><span class="pr-hm__ing-marca">Wali · <span class="pr-hm__ing-lote">W-9<\/span>/.test(d), d)
  chk('… lo agregado dice "agregado"', /Cacao <span class="pr-rec__agregado">agregado<\/span>/.test(d))
  chk('… lo que cambió muestra la diferencia en bordó (en lo que salió: ×2)', /Azúcar <span class="pr-rec__dif pr-rec__dif--aleja">\+400 g/.test(d))
  chk('… lo que no cambió no dice nada', /Harina<\/span>/.test(d) && !/Harina <span/.test(d))
  chk('… lo escrito a mano, con su cantidad', /Gluten<\/span><span class="pr-hm__ing-cant">100 g<\/span><span class="pr-hm__ing-marca">escrito a mano · /.test(d))
  chk('… lo que la receta tiene en 0 y no se usó no aparece', !/Bicarbonato/.test(d))
  chk('… el agua (sin insumo) dice "no lleva lote", sin marca', /Agua<\/span><span class="pr-hm__ing-cant">20 kg<\/span><span class="pr-hm__ing-marca"><span class="pr-hm__ing-lote">no lleva lote/.test(d))
  chk('… y las cantidades son las que salieron: la doble dice el doble', /50 kg/.test(d) && !/>25 kg</.test(d) && !/2,7 kg/.test(d))
  chk('masa_items con los embeds de ingrediente e insumo', S.__llamadas.consultas.some(([t, f]) => t === 'masa_items' &&
    /ingredientes\(nombre, orden\)/.test(JSON.stringify(f)) && /insumos\(nombre, marca\)/.test(JSON.stringify(f))))
  chk('la lectura de masas trae masero, motivo y receta', /masero_id, motivo, receta_id/.test(FUENTE))
  chk('"Anular esta masa" en la última', /id="pr-hm-anular">Anular esta masa/.test(d))

  // Tocar otra masa.
  await S.elegirMasaHist('ma1')
  const d1 = det(S)
  chk('tocar otra masa cambia el detalle', /pr-hm__det-titulo">Masa 1 · Simple</.test(d1) && /pr-hm__det-sub">07:05/.test(d1) && /data-hm-masa="ma1" aria-pressed="true"/.test(lista(S)))
  chk('… una simple dice la cantidad de una simple', /Harina<\/span><span class="pr-hm__ing-cant">25 kg</.test(d1))
  chk('… y en una que no es la última no se ofrece anular', !/pr-hm-anular/.test(d1))
  chk('… sin motivo no muestra ningún motivo entre comillas', !/[“”]/.test(d1))
  await S.elegirMasaHist('ma3')
  chk('la anulada dice por qué se anuló', /Se anuló:<\/span> Se volcó/.test(det(S)) && !/pr-hm-anular/.test(det(S)))
  await S.elegirMasaHist('no-existe')
  chk('una masa que no está no cambia nada', S.estado.histMaq.elegida === 'ma3')

  // Una respuesta que llega tarde no pisa el detalle de la masa elegida.
  const LV = armar()
  await LV.mostrarSala(); await LV.mostrarHistorialMaquina('t1')
  const itemsOrig = LV.__tablas.masa_items
  let soltar
  LV.__tablas.masa_items = (f) => eqDe(f, 'masa_id') === 'ma1' ? new Promise(res => { soltar = () => res(itemsOrig(f)) }) : itemsOrig(f)
  const lenta = LV.elegirMasaHist('ma1')
  await LV.elegirMasaHist('ma2')
  soltar(); await lenta
  LV.__tablas.masa_items = itemsOrig
  chk('una respuesta vieja no pisa el detalle de la masa elegida', LV.estado.histMaq.detalle.masaId === 'ma2' && /Cacao/.test(det(LV)))
  // Tocar otra masa cierra el "Anular" abierto.
  LV.pedirAnularHist()
  await LV.elegirMasaHist('ma1'); await LV.elegirMasaHist('ma2')
  chk('tocar otra masa cierra el "Anular" que estaba abierto', LV.estado.histMaq.anular === null)
  chk('tocar una masa de la lista la elige, y la barra abre el historial',
    /if \(m\) \{ elegirMasaHist\(m\.dataset\.hmMasa\); return \}/.test(FUENTE) && /if \(t\) \{ mostrarHistorialMaquina\(t\.dataset\.lateralTurno\); return \}/.test(FUENTE))

  // Anular la última.
  await S.elegirMasaHist('ma2')
  S.pedirAnularHist()
  chk('Anular: "Anular la masa 2 · Doble · 07:40" y ¿Por qué?', /Anular la masa 2 · Doble · 07:40/.test(det(S)) && /¿Por qué\?/.test(det(S)) &&
    /pr-btn--peligro" id="pr-hm-anular-confirmar">Anular masa 2</.test(det(S)))
  await S.confirmarAnularHist()
  chk('sin motivo no se manda y lo dice', !S.__llamadas.rpc.some(([n]) => n === 'anular_masa') && /Escribí por qué/.test(det(S)))
  S.cancelarAnularHist()
  chk('Cancelar cierra el formulario', S.estado.histMaq.anular === null && /id="pr-hm-anular">/.test(det(S)))
  S.pedirAnularHist()
  S.estado.histMaq.anular.motivo = '  Se quemó  '
  await S.confirmarAnularHist()
  chk('anular_masa con la ÚLTIMA y el motivo recortado', JSON.stringify(S.__llamadas.rpc.find(([n]) => n === 'anular_masa')?.[1]) === '{"p_masa_id":"ma2","p_motivo":"Se quemó"}')
  chk('… avisa que devolvió lo descontado y relee', S.__llamadas.exitos.some(m => /devolvió al stock/.test(m)) && S.estado.vista === 'pr-hist-maq')

  // No se puede anular una que no es la última, ni sin produccion:cargar.
  const N = armar()
  await N.mostrarSala(); await N.mostrarHistorialMaquina('t1')
  await N.elegirMasaHist('ma1')
  N.pedirAnularHist()
  chk('pedir anular una que no es la última no abre nada', N.estado.histMaq.anular === null)
  await N.elegirMasaHist('ma2')
  N.estado.misTareas = new Map([['ver', { todas: true }]])
  N.pintarHistMaq()
  chk('sin produccion:cargar no aparece "Anular esta masa"', !/pr-hm-anular/.test(det(N)))
  N.pedirAnularHist()
  chk('… ni se puede pedir', N.estado.histMaq.anular === null)

  // Una masa que todavía no se mandó es la más nueva de todas: va ARRIBA, como
  // en la lista de la receta.
  const P = armar()
  await P.mostrarSala(); await P.mostrarHistorialMaquina('t1')
  P.__ls.set('produccion.masa.u-pend', JSON.stringify({ client_uuid: 'u-pend', turnoId: 't1', pendiente: true, payload: {}, nro: 9, doble: false }))
  P.pintarHistMaq()
  const listaP = P.__els.get('pr-hm-lista')?.innerHTML ?? ''
  chk('la masa sin mandar va primera en el historial', listaP.indexOf('esperando conexión') > -1 && listaP.indexOf('esperando conexión') < listaP.indexOf('data-hm-masa'), listaP)

  // La base dice que no.
  const R = armar({ rpc: async (n) => n === 'anular_masa' ? { data: null, error: { message: 'El turno ya está cerrado.', code: 'P0001' } } : { data: null, error: null } })
  await R.mostrarSala(); await R.mostrarHistorialMaquina('t1')
  R.pedirAnularHist(); R.estado.histMaq.anular.motivo = 'Se volcó'
  await R.confirmarAnularHist()
  chk('el error de la base se muestra tal cual, pegado', /El turno ya está cerrado\./.test(det(R)) && R.estado.histMaq.anular !== null)

  // El detalle que no se puede leer.
  const E = armar({ errorItems: true })
  await E.mostrarSala(); await E.mostrarHistorialMaquina('t1')
  chk('si el detalle no se lee, lo dice (no inventa ingredientes)', /No se pudo leer el detalle de esta masa/.test(det(E)) && !/pr-hm__ing"/.test(det(E)))
  // Sin receta conocida no se compara.
  const SR = armar({ masas: MASAS.map(m => ({ ...m, receta_id: null })) })
  await SR.mostrarSala(); await SR.mostrarHistorialMaquina('t1')
  chk('sin receta no se inventan diferencias ni "agregado"', !/pr-rec__agregado|pr-rec__dif/.test(det(SR)) && /Cacao/.test(det(SR)))

  // Sin masas.
  const V = armar({ masas: [] })
  await V.mostrarSala(); await V.mostrarHistorialMaquina('t1')
  chk('sin masas: lo dice, sin nota de anular', /Todavía no hay masas en este turno/.test(lista(V)) && V.__doc.getElementById('pr-hm-nota').hidden === true &&
    /Tocá una masa/.test(det(V)))
  // Una máquina que no está abierta vuelve al inicio.
  const X = armar()
  await X.mostrarSala()
  await X.mostrarHistorialMaquina('t1')
  await X.mostrarHistorialMaquina('t-cerrado')
  chk('una máquina que ya no está abierta vuelve al inicio de la sala', X.estado.vista !== 'pr-hist-maq')

  // "+ Nueva masa para Máquina 1".
  const NM = armar({ rpc: async (n) => n === 'datos_para_masa'
    ? { data: { original: { receta_id: 'r1', version: 1, items: [{ ingrediente_id: 'i-agua', ingrediente: 'Agua', orden: 1, descuenta_stock: false, cantidad_kg: 10 }] }, anterior: null, insumos: [] }, error: null }
    : n === 'stock_para_masa' ? { data: [], error: null } : { data: null, error: null } })
  await NM.mostrarSala(); await NM.mostrarHistorialMaquina('t1')
  await NM.nuevaMasaDesdeHist()
  chk('"+ Nueva masa" abre la masa nueva de ESA máquina', NM.estado.vista === 'pr-receta' && NM.estado.salaTurno?.id === 't1' && NM.estado.histMaq === null)

  // HTML malicioso.
  const M = armar()
  const mm = { id: marca('hmId'), nro: marca('hmNro'), hora: null, doble: false, origen: marca('hmOrigen'), anulada: false }
  chequearMarcas(chk, 'masa del historial', M.htmlMasaHist(mm, false), ['hmId', 'hmNro', 'hmOrigen'])
  const dd = { masaId: 'x', receta: new Map([[marca('ingHm'), 1]]), items: [
    { ingrediente_id: marca('ingHm'), lote: marca('loteHm'), cantidad_simple_kg: 2, ingredientes: { nombre: marca('nomHm'), orden: 1 }, insumos: { nombre: 'x', marca: marca('marcaHm') } },
    { ingrediente_id: null, lote: null, cantidad_simple_kg: 1, ingrediente_libre: marca('libreHm') },
  ] }
  chequearMarcas(chk, 'ingredientes del historial', M.htmlIngredientesHist(dd, { doble: false }), ['loteHm', 'nomHm', 'marcaHm', 'libreHm'])
  chequearMarcas(chk, 'anular en el historial', M.htmlAnularHist({ nro: marca('anHm'), doble: false, hora: null }, { error: marca('errHm') }), ['anHm', 'errHm'])
  M.estado.personal = [{ id: 'p1', nombre: marca('quienHm') }]
  chequearMarcas(chk, 'detalle del historial', M.htmlDetalleHist({ elegida: 'z', masas: [{ id: 'z', nro: marca('detNro'), hora: null, doble: true, masero_id: 'p1',
    motivo: marca('motHm'), anulada: true, anulada_motivo: marca('anMot') }], detalle: null }), ['detNro', 'quienHm', 'motHm', 'anMot'])
})())

fin()
