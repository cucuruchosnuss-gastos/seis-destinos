// LOTES NO REGISTRADOS Y LA CAJA DOLCE PASTA (23/10/2026) — la tablet,
// modulos/produccion.html.
//
// a) Pedido de Facu: cuando el masero usa un lote que no está cargado
//    (masa_items.lote_fuera_de_stock), lo tenía que escribir en la primera
//    masa de cada día. Ahora la tablet recuerda, POR MÁQUINA y POR INSUMO, el
//    último lote no registrado que se usó (localStorage, la clave
//    produccion.lotes-no-registrados; no toca la base) y:
//     - lo pone solo cuando el ingrediente queda sin lote (la primera masa
//       del día, que antes llegaba vacía);
//     - en rojo: "Lote no registrado por administración", y se registra igual;
//     - en la ventana de lotes aparece arriba, en rojo, y se elige de un toque;
//     - uno que administración ya cargó (figura con stock) no se propone más;
//     - "Se terminó" lo olvida; usar un lote registrado del mismo insumo
//       también (el último usado ya es otro);
//     - la masa anterior de HOY manda sobre la memoria.
// c) El 21/10 el sublote 6254-2 quedó con la Caja N°1 Nuss y bolsitas
//    individuales, queriendo la Dolce Pasta: las tres "Caja N°1" decían lo
//    mismo en grande. Ahora dicen nombre y marca, con qué bolsa va cada una,
//    y si la bolsa no es la de la caja: "La caja sigue siendo la …".
//
// Se EJECUTAN las funciones reales (sandbox-produccion.js).
//
//   node pruebas/test-produccion-lotes-no-registrados.js

process.env.TZ = 'UTC'

const path = require('path')
const { arnes, leer } = require('./circuito-comun')
const { construirProduccion } = require('./sandbox-produccion')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/produccion.html')
// Primero: el runner de mutaciones confirma con este renglón que se leyó el mutado.
leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

const CLAVE = 'produccion.lotes-no-registrados'
const TEXTO = 'Lote no registrado por administración'

const ORIGINAL = { receta_id: 'r1', version: 3, items: [
  { ingrediente_id: 'i-harina', ingrediente: 'Harina', orden: 1, descuenta_stock: true, cantidad_kg: 25, insumo_preferido_id: null },
  { ingrediente_id: 'i-azucar', ingrediente: 'Azúcar', orden: 2, descuenta_stock: true, cantidad_kg: 2.5, insumo_preferido_id: null },
  { ingrediente_id: 'i-col', ingrediente: 'Colorante', orden: 3, descuenta_stock: true, cantidad_kg: 0.05, insumo_preferido_id: null },
] }
// El colorante (como en la base del 21/10/2026) NO tiene ingreso cargado: sus
// dos insumos sin lotes con stock.
function insumos({ colorante1 = [], azucar = [{ lote: 'AZ-1', stock: 50 }] } = {}) {
  return [
    { ingrediente_id: 'i-harina', insumo_id: 'ins-h1', nombre: 'Harina 000', marca: 'Júpiter', tipo: 'materia_prima', lotes: [{ lote: '24518', stock: 200 }] },
    { ingrediente_id: 'i-azucar', insumo_id: 'ins-az', nombre: 'Azúcar', marca: 'Ledesma', tipo: 'materia_prima', lotes: azucar },
    { ingrediente_id: 'i-col', insumo_id: 'ins-col1', nombre: 'Colorante', marca: 'Fleibor', tipo: 'insumo', lotes: colorante1 },
    { ingrediente_id: 'i-col', insumo_id: 'ins-col2', nombre: 'Colorante', marca: 'Duas Rodas', tipo: 'insumo', lotes: [] },
  ]
}
const itemsAnt = (col = '35349771', az = 'AZ-1') => [
  { ingrediente_id: 'i-harina', insumo_id: 'ins-h1', lote: '24518', cantidad_simple_kg: 25 },
  { ingrediente_id: 'i-azucar', insumo_id: 'ins-az', lote: az, cantidad_simple_kg: 2.5 },
  { ingrediente_id: 'i-col', insumo_id: 'ins-col1', lote: col, cantidad_simple_kg: 0.05 },
]
// La de AYER: la primera masa del día llega sin lotes.
const AYER = { masa_id: 'mA', lote: 6252, nro: 6, hora: '2026-10-20T01:03:00Z', doble: false, fecha_turno: '2026-10-20', es_de_hoy: false, es_chocolate: false, items: itemsAnt() }
const HOY = (col, az) => ({ masa_id: 'mH', lote: 6254, nro: 2, hora: '2026-10-21T10:43:00Z', doble: false, fecha_turno: '2026-10-21', es_de_hoy: true, es_chocolate: false, items: itemsAnt(col, az) })
const copia = (x) => JSON.parse(JSON.stringify(x))

function armar({ anterior = AYER, ins = insumos(), memoria = undefined, maquina = 'm1' } = {}) {
  const S = construirProduccion(ARCHIVO)
  S.estado.modo = 'masa'
  S.estado.persona = { id: 'e-mas', nombre: 'Agustín', puesto: 'masero' }
  S.estado.stockVer = null
  if (memoria !== undefined) S.__ls.set(CLAVE, typeof memoria === 'string' ? memoria : JSON.stringify(memoria))
  Object.assign(S.__tablas, {
    maquinas: [{ id: maquina, nombre: 'Máquina 1', orden: 1 }],
    turnos_produccion: [{ id: 't1', lote: 6254, maquina_id: maquina, fecha: '2026-10-21', turno: 'Mañana', encargado_id: 'e1', abierto_en: null }],
    masas: [], paradas_produccion: [], produccion_items: [], recetas: [{ tipo_masa: 'Común' }], ingredientes: [],
    v_stock_por_lote: [],
  })
  const datos = { original: ORIGINAL, anterior, insumos: ins }
  S.__setRpc(async (n) => {
    if (n === 'datos_para_masa') return { data: copia(datos), error: null }
    if (n === 'stock_para_masa') return { data: [], error: null }
    return { data: { masa_id: 'm-nueva', nro: 3 }, error: null }
  })
  return S
}
async function hastaLaReceta(S, como = 'original') {
  await S.mostrarSala()
  if (!S.estado.salaTurno) await S.elegirMaquinaSala('t1')
  S.elegirTamano(false)
  S.elegirComo(como)
  return S
}
const filas = (S) => S.__doc.getElementById('pr-receta-filas').innerHTML
function botonLote(S, ing) {
  const h = filas(S)
  const i = h.indexOf(`data-lote="${ing}"`)
  if (i === -1) return ''
  const desde = h.lastIndexOf('<button', i)
  return h.slice(desde, h.indexOf('</button>', i) + 9)
}
const memoria = (S) => { try { return JSON.parse(S.__ls.get(CLAVE) ?? 'null') } catch { return 'ROTA' } }
const masas = (S) => S.__llamadas.rpc.filter(([n]) => n === 'registrar_masa').map(([, p]) => p)
// Elige el lote con stock de harina y azúcar (los registrados no se recuerdan).
function lotesConStock(S) {
  const ops = (ing) => S.opcionesLote(S.estado.datosMasa, ing)
  S.elegirOpcionLote('i-harina', String(ops('i-harina').findIndex(o => o.lote === '24518')))
  S.elegirOpcionLote('i-azucar', String(ops('i-azucar').findIndex(o => o.lote === 'AZ-1')))
}

esperas.push((async () => {
  // ── 1. Sin memoria: como siempre, la primera masa del día llega vacía ──
  {
    const S = await hastaLaReceta(armar())
    chk('sin memoria: el colorante de la primera masa del día llega vacío', /Elegí el lote/.test(botonLote(S, 'i-col')), botonLote(S, 'i-col'))
    chk('… y la harina también (la regla de siempre)', /Elegí el lote/.test(botonLote(S, 'i-harina')))
  }

  // ── 2. Con memoria: el último lote no registrado de ESA máquina viene puesto
  {
    const S = await hastaLaReceta(armar({ memoria: { m1: { 'ins-col1': { lote: '35349771', en: 100 } } } }))
    const b = botonLote(S, 'i-col')
    chk('el lote no registrado de la máquina viene puesto en la primera masa del día', /<span class="pr-rec__lote-texto">35349771<\/span>/.test(b), b)
    chk('… en rojo', /class="pr-rec__lote pr-rec__lote--no-registrado"/.test(b), b)
    chk(`… con "${TEXTO}"`, new RegExp(`pr-rec__lote-nota">${TEXTO}<`).test(b), b)
    chk('… y lo dice el aria-label', /aria-label="Lote de Colorante: 35349771, lote no registrado por administración"/.test(b), b)
    chk('… del insumo que se usó', S.estado.masa.lotes['i-col']?.insumo_id === 'ins-col1' && S.estado.masa.lotes['i-col']?.lote === '35349771')
    chk('los registrados NO se proponen: la harina sigue vacía', /Elegí el lote/.test(botonLote(S, 'i-harina')) && !S.estado.masa.lotes['i-harina'])
    lotesConStock(S)
    chk('con la harina y el azúcar elegidos, nada falta (el no registrado no bloquea)', S.faltanParaRegistrar(S.estado.masa, S.estado.datosMasa).length === 0,
      JSON.stringify(S.faltanParaRegistrar(S.estado.masa, S.estado.datosMasa)))
    await S.registrarMasa()
    const col = masas(S)[0]?.p_items.find(x => x.ingrediente_id === 'i-col')
    chk('… y viaja en registrar_masa con su insumo y su lote', col?.lote === '35349771' && col?.insumo_id === 'ins-col1', JSON.stringify(col))
    chk('… y el uuid de la masa es UNO solo (no se generó otro por esto)', masas(S)[0]?.p_client_uuid === 'uuid-1', masas(S)[0]?.p_client_uuid)
    chk('después de registrar sigue recordado (el último usado)', memoria(S)?.m1?.['ins-col1']?.lote === '35349771', JSON.stringify(memoria(S)))
  }

  // ── 3. Por máquina: lo de otra máquina no aparece ───────────────────────
  {
    const S = await hastaLaReceta(armar({ memoria: { m2: { 'ins-col1': { lote: '35349771', en: 100 } } } }))
    chk('la memoria es por máquina: lo de la M2 no se pone en la M1', /Elegí el lote/.test(botonLote(S, 'i-col')), botonLote(S, 'i-col'))
  }

  // ── 4. Ya registrado por administración: deja de proponerse ────────────
  {
    const S = await hastaLaReceta(armar({ memoria: { m1: { 'ins-col1': { lote: '35349771', en: 100 } } }, ins: insumos({ colorante1: [{ lote: '35349771', stock: 4 }] }) }))
    chk('un lote recordado que ahora figura con stock ya no se propone (es uno más de la lista)', /Elegí el lote/.test(botonLote(S, 'i-col')), botonLote(S, 'i-col'))
  }

  // ── 5. La anterior de HOY manda sobre la memoria ────────────────────────
  {
    const S = await hastaLaReceta(armar({ anterior: HOY('HOY-7'), memoria: { m1: { 'ins-col1': { lote: '35349771', en: 100 } } } }), 'anterior')
    const b = botonLote(S, 'i-col')
    chk('con una masa anterior de hoy, viene su lote y no el recordado', /pr-rec__lote-texto">HOY-7</.test(b) && !/35349771/.test(b), b)
    chk('… también en rojo si no está registrado', /pr-rec__lote--no-registrado/.test(b))
  }

  // ── 6. Dos insumos del mismo ingrediente: el más reciente ───────────────
  {
    const S = await hastaLaReceta(armar({ memoria: { m1: { 'ins-col1': { lote: 'X1', en: 100 }, 'ins-col2': { lote: 'X2', en: 200 } } } }))
    chk('con dos insumos recordados para el ingrediente, viene el más reciente', S.estado.masa.lotes['i-col']?.insumo_id === 'ins-col2' &&
      S.estado.masa.lotes['i-col']?.lote === 'X2', JSON.stringify(S.estado.masa.lotes['i-col']))
    const r = S.lotesNoRegistradosDe(S.estado.datosMasa, 'i-col', 'm1')
    chk('… y lotesNoRegistradosDe los ordena del más nuevo al más viejo', r.map(x => x.lote).join(',') === 'X2,X1', JSON.stringify(r))
    chk('… y sin máquina no hay nada que proponer', S.lotesNoRegistradosDe(S.estado.datosMasa, 'i-col', null).length === 0)
  }

  // ── 7. Lo que se recuerda al registrar ──────────────────────────────────
  {
    const S = await hastaLaReceta(armar({ memoria: { m1: { 'ins-az': { lote: 'AZ-VIEJO', en: 5 } }, m2: { 'ins-col1': { lote: 'DE-LA-M2', en: 5 } } } }))
    lotesConStock(S)
    // Colorante escrito a mano, sin ingreso.
    S.abrirPanelLote('i-col')
    S.estado.panelLote.texto = ' NUEVO-9 '
    S.usarLoteEscrito()
    await S.registrarMasa()
    const m = memoria(S)
    chk('el lote escrito sin ingreso queda recordado para esa máquina e insumo', m?.m1?.['ins-col1']?.lote === 'NUEVO-9' && Number.isFinite(m.m1['ins-col1'].en), JSON.stringify(m))
    chk('el azúcar se usó con un lote REGISTRADO: se olvida el no registrado que había', !('ins-az' in (m?.m1 ?? {})), JSON.stringify(m))
    chk('lo de la otra máquina no se toca', m?.m2?.['ins-col1']?.lote === 'DE-LA-M2', JSON.stringify(m))
    chk('la clave no es la de un borrador de masa (borradoresPendientes no la lee)', !S.CLAVE_LOTES_NO_REGISTRADOS.startsWith(S.PREFIJO_BORRADOR_MASA) &&
      S.borradoresPendientes().every(b => b && b.client_uuid))
  }
  {
    // Un ingrediente en 0 no pide lote: no se recuerda nada de él.
    const S = await hastaLaReceta(armar({ memoria: { m1: { 'ins-col1': { lote: 'C-1', en: 5 } } } }), 'modificar')
    lotesConStock(S)
    S.cambiarCantidad('i-col', 0)
    // Quedó un lote puesto en el renglón en cero, distinto del recordado.
    S.estado.masa.lotes['i-col'] = { insumo_id: 'ins-col1', lote: 'DISTINTO', manual: true, sinLote: false }
    S.estado.masa.motivo = 'Sin colorante hoy'
    S.recordarLotesNoRegistrados(S.estado.masa, S.estado.datosMasa)
    chk('un ingrediente en cero no cambia la memoria', memoria(S)?.m1?.['ins-col1']?.lote === 'C-1', JSON.stringify(memoria(S)))
    S.recordarLotesNoRegistrados(null, S.estado.datosMasa)
    S.recordarLotesNoRegistrados({ lotes: {} }, S.estado.datosMasa)
    chk('sin masa o sin máquina no se escribe nada', memoria(S)?.m1?.['ins-col1']?.lote === 'C-1')
  }

  // ── 8. "Se terminó" lo olvida ───────────────────────────────────────────
  {
    const S = await hastaLaReceta(armar({ memoria: { m1: { 'ins-col1': { lote: '35349771', en: 1 }, 'ins-az': { lote: 'AZ-X', en: 1 } } } }))
    S.marcarLoteTerminado('i-col')
    const m = memoria(S)
    chk('"Se terminó" sobre el recordado lo olvida', !('ins-col1' in (m?.m1 ?? {})), JSON.stringify(m))
    chk('… y deja los otros insumos', m?.m1?.['ins-az']?.lote === 'AZ-X', JSON.stringify(m))
    chk('… y el renglón pide otro', /Se terminó · elegí otro/.test(botonLote(S, 'i-col')))
    S.olvidarLoteNoRegistrado('m1', 'ins-az', 'OTRO-LOTE')
    chk('olvidar con otro lote no borra el recordado', memoria(S)?.m1?.['ins-az']?.lote === 'AZ-X')
    S.olvidarLoteNoRegistrado('m1', 'ins-az', 'AZ-X')
    chk('al quedar vacía la memoria, la clave se borra', !S.__ls.has(CLAVE), String(S.__ls.get(CLAVE)))
  }

  // ── 9. La ventana de lotes ──────────────────────────────────────────────
  {
    // El puesto es un lote CON stock (la anterior de hoy) y hay uno no
    // registrado recordado del mismo insumo.
    const S = await hastaLaReceta(armar({ anterior: HOY('HOY-7', 'AZ-1'), memoria: { m1: { 'ins-az': { lote: 'AZ-VIEJO', en: 9 } } } }), 'anterior')
    S.abrirPanelLote('i-azucar')
    const t = S.__doc.getElementById('pr-lote-panel-tarjetas').innerHTML
    chk('en la ventana aparece el recordado, en rojo', /class="pr-lp__tarjeta pr-lp__fila pr-lp__fila--no-registrado" data-lote-no-reg="0" aria-pressed="false"/.test(t), t)
    chk('… con el lote, la marca y la nota', /<strong>Ledesma<\/strong> lote AZ-VIEJO/.test(t) && new RegExp(`${TEXTO} · el último que se usó en esta máquina`).test(t), t)
    chk('… ARRIBA de los lotes con stock', t.indexOf('data-lote-no-reg') < t.indexOf('data-lote-op'), t)
    chk('… y el puesto (con stock) sigue marcado', /data-lote-op="\d+" aria-pressed="true"/.test(t), t)
    S.elegirLoteNoRegistrado('')
    chk('un índice vacío no elige nada', S.estado.masa.lotes['i-azucar'].lote === 'AZ-1' && S.estado.panelLote)
    S.elegirLoteNoRegistrado('7')
    chk('un índice que no existe no elige nada', S.estado.masa.lotes['i-azucar'].lote === 'AZ-1' && S.estado.panelLote)
    S.elegirLoteNoRegistrado('0')
    chk('tocarlo lo pone (como escrito a mano, con su insumo)', S.estado.masa.lotes['i-azucar'].lote === 'AZ-VIEJO' && S.estado.masa.lotes['i-azucar'].manual === true &&
      S.estado.masa.lotes['i-azucar'].insumo_id === 'ins-az', JSON.stringify(S.estado.masa.lotes['i-azucar']))
    chk('… cierra la ventana', S.estado.panelLote === null && S.__doc.getElementById('pr-lote-panel').hidden === true)
    chk('… y el renglón queda en rojo', /pr-rec__lote--no-registrado/.test(botonLote(S, 'i-azucar')) && /AZ-VIEJO/.test(botonLote(S, 'i-azucar')))
    chk('… y queda en el borrador de la tablet', JSON.parse(S.__ls.get('produccion.masa.' + S.estado.masa.client_uuid)).lotes['i-azucar'].lote === 'AZ-VIEJO')
    S.abrirPanelLote('i-azucar')
    const t2 = S.__doc.getElementById('pr-lote-panel-tarjetas').innerHTML
    chk('al volver a abrir: el puesto no registrado marcado y sin repetirse', (t2.match(/data-lote-no-reg=/g) || []).length === 1 &&
      /data-lote-no-reg="0" aria-pressed="true"/.test(t2) && !new RegExp('el último que se usó').test(t2), t2)
    S.cerrarPanelLote()
  }
  {
    // El único no registrado es el PUESTO y el insumo no tiene lotes con
    // stock: como antes, la ventana abre directo con el campo.
    const S = await hastaLaReceta(armar({ memoria: { m1: { 'ins-col1': { lote: '35349771', en: 1 } } } }))
    S.abrirPanelLote('i-col')
    chk('con solo el puesto no registrado y sin stock, la ventana abre con el campo (como antes)', S.estado.panelLote.escribir === true &&
      /id="pr-lote-panel-escribir"/.test(S.__doc.getElementById('pr-lote-panel-otros').innerHTML), S.__doc.getElementById('pr-lote-panel-otros').innerHTML)
    chk('… y la nota del campo dice cómo queda', new RegExp(`Queda anotado como "${TEXTO}"`).test(S.__doc.getElementById('pr-lote-panel-otros').innerHTML))
    S.cerrarPanelLote()
    // Escribe otro y el recordado sigue a mano.
    S.abrirPanelLote('i-col')
    S.estado.panelLote.texto = 'OTRO'
    S.usarLoteEscrito()
    S.abrirPanelLote('i-col')
    const t = S.__doc.getElementById('pr-lote-panel-tarjetas').innerHTML
    chk('con otro escrito, la ventana NO abre en el campo: muestra los dos no registrados', S.estado.panelLote.escribir === false &&
      (t.match(/data-lote-no-reg=/g) || []).length === 2, t)
    chk('… el puesto primero y marcado, el recordado después', /data-lote-no-reg="0" aria-pressed="true".*lote OTRO/s.test(t) && /data-lote-no-reg="1" aria-pressed="false".*lote 35349771/s.test(t), t)
    S.elegirLoteNoRegistrado('1')
    chk('… y se vuelve al recordado de un toque', S.estado.masa.lotes['i-col'].lote === '35349771')
  }
  {
    // Marcar un lote con stock en la lista desmarca el no registrado puesto.
    const S = await hastaLaReceta(armar({ memoria: { m1: { 'ins-az': { lote: 'AZ-VIEJO', en: 9 } } } }))
    S.abrirPanelLote('i-azucar')
    const t0 = S.__doc.getElementById('pr-lote-panel-tarjetas').innerHTML
    chk('primera masa del día con el azúcar recordado: puesto y marcado en la ventana', /data-lote-no-reg="0" aria-pressed="true"/.test(t0), t0)
    S.elegirTarjetaLote(String(S.opcionesLote(S.estado.datosMasa, 'i-azucar').findIndex(o => o.lote === 'AZ-1')))
    const t1 = S.__doc.getElementById('pr-lote-panel-tarjetas').innerHTML
    chk('tocar un lote con stock lo marca y desmarca el no registrado', /data-lote-no-reg="0" aria-pressed="false"/.test(t1) && /data-lote-op="\d+" aria-pressed="true"/.test(t1), t1)
    S.usarLoteDeLista()
    chk('… y "Usar" pone el de stock', S.estado.masa.lotes['i-azucar'].lote === 'AZ-1' && !/no-registrado/.test(botonLote(S, 'i-azucar')))
  }

  // ── 10. Memoria rota y escape ───────────────────────────────────────────
  {
    const S = await hastaLaReceta(armar({ memoria: '{esto no es json' }))
    chk('una memoria rota no rompe la masa: nada puesto', /Elegí el lote/.test(botonLote(S, 'i-col')) && S.estado.masa)
    chk('… leerLotesNoRegistrados devuelve vacío', JSON.stringify(S.leerLotesNoRegistrados()) === '{}')
    S.__ls.set(CLAVE, '[1,2]')
    chk('… y un array tampoco cuenta', JSON.stringify(S.leerLotesNoRegistrados()) === '{}')
    S.__ls.set(CLAVE, JSON.stringify({ m1: 'x' }))
    chk('… ni una máquina que no es un objeto', S.lotesNoRegistradosDe(S.estado.datosMasa, 'i-col', 'm1').length === 0)
  }
  {
    const MAL = '<img src=x onerror=alert(1)>'
    const S = await hastaLaReceta(armar({ memoria: { m1: { 'ins-col1': { lote: MAL, en: 1 }, 'ins-az': { lote: MAL, en: 1 } } } }))
    chk('el lote recordado va escapado en el renglón', !/<img/.test(filas(S)) && /&lt;img src=x/.test(botonLote(S, 'i-col')), botonLote(S, 'i-col'))
    S.abrirPanelLote('i-azucar')
    const t = S.__doc.getElementById('pr-lote-panel-tarjetas').innerHTML
    chk('… y en la ventana', !/<img/.test(t) && /&lt;img src=x/.test(t), t)
  }
  {
    // La marca del insumo (texto de la base) también.
    const ins = insumos()
    ins[1].marca = '<b>Ledesma</b>'
    const S = await hastaLaReceta(armar({ ins, memoria: { m1: { 'ins-az': { lote: 'AZ-VIEJO', en: 1 } } } }))
    S.abrirPanelLote('i-azucar')
    const t = S.__doc.getElementById('pr-lote-panel-tarjetas').innerHTML
    const fila = t.slice(t.indexOf('data-lote-no-reg'), t.indexOf('</button>', t.indexOf('data-lote-no-reg')))
    chk('la marca de la fila no registrada va escapada', !/<b>/.test(fila) && /&lt;b&gt;Ledesma/.test(fila), fila)
  }
})())

// ── c) La caja ─────────────────────────────────────────────────────────────
const CATALOGO = {
  productos_terminados: [{ id: 'p-mini', nombre: 'Cucuruchón Mini', tipo_masa: 'Común', orden: 1 }],
  producto_presentaciones: [
    { id: 'pr-sin', producto_id: 'p-mini', nombre: 'Caja sin cono', con_cono: false, media_caja: false, empaque: null, unidades_por_caja: 320, orden: 1 },
    { id: 'pr-con', producto_id: 'p-mini', nombre: 'Caja con cono', con_cono: true, media_caja: false, empaque: null, unidades_por_caja: 320, orden: 2 },
  ],
  marcas_personalizadas: [
    { id: 'mk-duomo', nombre: 'DUOMO', estado_alta: 'aprobada', doble_bolsa: false },
    { id: 'mk-norte', nombre: 'HELADOS DEL NORTE', estado_alta: 'aprobada', doble_bolsa: true },
  ],
  // Lo de la base del 23/10/2026 para "Mini · Caja sin cono", en el MISMO
  // orden en que la devuelve la base.
  presentacion_cajas: [
    { presentacion_id: 'pr-sin', insumo_id: 'i-media', embolsado_sugerido: 'doble' },
    { presentacion_id: 'pr-sin', insumo_id: 'i-nuss', embolsado_sugerido: 'grande' },
    { presentacion_id: 'pr-sin', insumo_id: 'i-sinimp', embolsado_sugerido: 'grande' },
    { presentacion_id: 'pr-sin', insumo_id: 'i-dolce', embolsado_sugerido: 'individual' },
    { presentacion_id: 'pr-con', insumo_id: 'i-nuss', embolsado_sugerido: 'grande' },
    { presentacion_id: 'pr-con', insumo_id: 'i-mal', embolsado_sugerido: 'ninguno' },
  ],
  presentacion_empaque: [],
  insumos: [
    { id: 'i-media', nombre: 'Caja media altura', marca: null },
    { id: 'i-nuss', nombre: 'Caja N°1', marca: 'Nuss' },
    { id: 'i-sinimp', nombre: 'Caja N°1', marca: 'Sin impresión' },
    { id: 'i-dolce', nombre: 'Caja N°1', marca: 'Dolce Pasta' },
    { id: 'i-mal', nombre: '<b>Caja</b>', marca: '<i>x</i>' },
  ],
  unidades_negocio: [{ id: 'u-cn', caja_predeterminada_id: 'i-nuss' }],
}
const TURNO = { id: 't1', lote: 6254, maquina_id: 'm1', fecha: '2026-10-21', turno: 'Mañana', encargado_id: 'e-agus', abierto_en: '2026-10-21T09:00:00Z', estado: 'abierto', forzado_por: null, forzado_en: null, forzado_motivo: null }
function armarCaja() {
  const S = construirProduccion(ARCHIVO)
  Object.assign(S.__tablas, {
    ...CATALOGO,
    turnos_produccion: filtros => filtros.some(f => f[1] === 'estado' && f[2] === 'pendiente_completar') ? { data: [], error: null } : { data: [TURNO], error: null },
    turno_operarios: [], masas: [], paradas_produccion: [], produccion_items: [],
    maquinas: [{ id: 'm1', nombre: 'Máquina 1', orden: 1 }],
  })
  S.estado.modo = 'produccion'
  S.estado.persona = { id: 'e-agus', nombre: 'Agustín' }
  S.estado.tablero = [{ maquina: { id: 'm1', nombre: 'Máquina 1' }, turno: { id: 't1' } }]
  return S
}
const panel = (S) => S.__doc.getElementById('pr-agregar-panel').innerHTML
function botonCaja(h, id) {
  const i = h.indexOf(`data-ag-caja="${id}"`)
  if (i === -1) return ''
  return h.slice(h.lastIndexOf('<button', i), h.indexOf('</button>', i) + 9)
}

esperas.push((async () => {
  const S = armarCaja()
  await S.abrirPlanilla('t1')
  S.abrirAgregar()
  S.elegirProductoAgregar('p-mini')
  S.elegirConoSiNo(false)
  S.elegirPresentacionAgregar('pr-sin')
  chk('con la caja de la unidad habilitada, viene puesta y se saltea el paso (como antes)', S.estado.agregar.paso === 'cajas' && S.estado.agregar.cajaId === 'i-nuss')
  S.irAPasoAgregar('caja')
  const h = panel(S)
  const dolce = botonCaja(h, 'i-dolce'), nuss = botonCaja(h, 'i-nuss'), media = botonCaja(h, 'i-media')
  chk('las cajas dicen nombre Y marca en grande: "Caja N°1 Dolce Pasta"', /aria-pressed="false">Caja N°1 Dolce Pasta<span/.test(dolce), dolce)
  chk('… con qué bolsa va cada una', /pr-ag__opcion-nota">con bolsitas individuales</.test(dolce), dolce)
  chk('… y cuál es la de la unidad', /aria-pressed="true">Caja N°1 Nuss<span class="pr-ag__opcion-nota">con bolsa grande · la de la unidad</.test(nuss), nuss)
  chk('… una sin marca dice solo el nombre', /aria-pressed="false">Caja media altura<span class="pr-ag__opcion-nota">con doble bolsa</.test(media), media)
  chk('las cuatro cajas habilitadas están para tocar', (h.match(/data-ag-caja=/g) || []).length === 4, h)
  chk('con la bolsa de la caja, no hay aviso', !/pr-ag__ojo-caja/.test(h))

  // Lo que pasó el 21/10: tocó "Bolsitas individuales" y no la caja.
  S.elegirEmbolsado('individual')
  const h2 = panel(S)
  chk('cambiar la bolsa NO cambia la caja', S.estado.agregar.cajaId === 'i-nuss' && S.estado.agregar.embolsado === 'individual')
  chk('… y se dice: "La caja sigue siendo la Caja N°1 Nuss"', /class="pr-aviso pr-ag__ojo-caja" role="status">La caja sigue siendo la <strong>Caja N°1 Nuss<\/strong>: cambiar la bolsa no cambia la caja\. Si es otra, tocala arriba\.<\/p>/.test(h2), h2)
  chk('… antes de "Seguir con las cajas"', h2.indexOf('pr-ag__ojo-caja') < h2.indexOf('data-ag-seguir'), h2)
  S.elegirCaja('i-dolce')
  chk('tocar la Dolce Pasta la elige con sus bolsitas', S.estado.agregar.cajaId === 'i-dolce' && S.estado.agregar.embolsado === 'individual' && S.estado.agregar.paso === 'cajas')
  S.irAPasoAgregar('caja')
  chk('… y ahí no hay aviso', !/pr-ag__ojo-caja/.test(panel(S)), panel(S))
  chk('htmlOjoCaja sin caja no dice nada', S.htmlOjoCaja({ cajaId: null, cajaElegida: true }, S.estado.catalogo) === '' && S.htmlOjoCaja(null, S.estado.catalogo) === '')

  // Un cono de doble bolsa en la caja Nuss: es lo normal, sin aviso.
  const D = armarCaja()
  await D.abrirPlanilla('t1')
  D.abrirAgregar()
  D.elegirProductoAgregar('p-mini')
  D.elegirCono('mk-norte')
  D.elegirPresentacionAgregar('pr-con')
  D.irAPasoAgregar('caja')
  chk('un cono de doble bolsa con la caja Nuss no avisa (doble bolsa es lo que corresponde)', !/pr-ag__ojo-caja/.test(panel(D)) && D.estado.agregar.cajaId === 'i-nuss', panel(D))
  const mal = botonCaja(panel(D), 'i-mal')
  chk('el nombre y la marca de la caja van escapados', !/<b>|<i>/.test(mal) && /&lt;b&gt;Caja&lt;\/b&gt; &lt;i&gt;x&lt;\/i&gt;/.test(mal), mal)
  chk('una caja que no sugiere bolsa no dice "con sin bolsa"', !/con sin bolsa|con ninguno/.test(mal) && !/pr-ag__opcion-nota/.test(mal), mal)
  const C = armarCaja()
  await C.abrirPlanilla('t1')
  C.abrirAgregar()
  C.elegirProductoAgregar('p-mini')
  C.elegirCono('mk-duomo')
  C.elegirPresentacionAgregar('pr-con')
  C.elegirCaja('i-mal')
  C.irAPasoAgregar('caja')
  C.elegirEmbolsado('grande')
  const hm = panel(C)
  chk('el aviso escapa el nombre de la caja', /pr-ag__ojo-caja/.test(hm) && !/<strong><b>/.test(hm) && /<strong>&lt;b&gt;Caja/.test(hm), hm)
})())

fin()
