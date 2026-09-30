// La receta que CAMBIA en medio del turno (30/09/2026). Caso real: la receta
// de la Máquina 1 pasó a v2 con bicarbonato (0,015 kg), la masa anterior era
// de la v1 (bicarbonato en 0) y "Anterior" / "Modificar" —que arrancan de la
// masa anterior— lo traían en 0: no se veía ni pedía lote.
//
// La regla: la lista de ingredientes es SIEMPRE la de la receta vigente, más
// lo que la masa anterior tenga de extra (lo escrito a mano). Un ingrediente
// nuevo en la receta entra con la cantidad de la receta, marcado "nuevo en la
// receta". Si la receta cambió desde la masa anterior, un aviso arriba:
// "La receta cambió (v1 → v2) desde la masa anterior".
//
// Y la reventa: leerCatalogoProductos() saca los productos con
// origen_producto_id (la base ya se los esconde a las tablets, con
// _soy_dispositivo() en la policy de productos_terminados; esto cubre a quien
// entra con su cuenta personal).
//
// Contrato con la base (pg_get_functiondef, 30/09/2026): datos_para_masa NO
// dice con qué receta se hizo la anterior; se lee masas.receta_id, y de esa
// receta recetas.version y receta_items. registrar_masa exige EXACTAMENTE los
// ingredientes de la receta vigente, más los "otro" sin ingrediente_id.
//
//   node pruebas/test-produccion-receta-cambio.js

process.env.TZ = 'UTC'

const path = require('path')
const { arnes, leer } = require('./circuito-comun')
const { construirProduccion } = require('./sandbox-produccion')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/produccion.html')
leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

const copia = (x) => JSON.parse(JSON.stringify(x))

// La receta VIGENTE, v2: con bicarbonato. El colorante ya no está.
const V2 = { receta_id: 'r2', version: 2, items: [
  { ingrediente_id: 'i-agua', ingrediente: 'Agua', orden: 1, descuenta_stock: false, cantidad_kg: 10, insumo_preferido_id: null },
  { ingrediente_id: 'i-harina', ingrediente: 'Harina', orden: 2, descuenta_stock: true, cantidad_kg: 25, insumo_preferido_id: null },
  { ingrediente_id: 'i-sal', ingrediente: 'Sal', orden: 3, descuenta_stock: true, cantidad_kg: 0.1, insumo_preferido_id: null },
  { ingrediente_id: 'i-bicarb', ingrediente: 'Bicarbonato', orden: 4, descuenta_stock: true, cantidad_kg: 0.015, insumo_preferido_id: null },
  { ingrediente_id: 'i-cacao', ingrediente: 'Cacao', orden: 5, descuenta_stock: true, cantidad_kg: 0, insumo_preferido_id: null },
] }
// La receta que usó la anterior, v1: bicarbonato en 0 y colorante.
const V1_ITEMS = [
  { ingrediente_id: 'i-agua', cantidad_kg: 10 }, { ingrediente_id: 'i-harina', cantidad_kg: 25 },
  { ingrediente_id: 'i-sal', cantidad_kg: 0.1 }, { ingrediente_id: 'i-bicarb', cantidad_kg: 0 },
  { ingrediente_id: 'i-cacao', cantidad_kg: 0 }, { ingrediente_id: 'i-color', cantidad_kg: 0.05 },
]
const INSUMOS = [
  { ingrediente_id: 'i-harina', insumo_id: 'ins-h', nombre: 'Harina 000', marca: 'Wali', tipo: 'materia_prima', lotes: [{ lote: 'W-9', stock: 100 }] },
  { ingrediente_id: 'i-sal', insumo_id: 'ins-sal', nombre: 'Sal fina', marca: 'Celusal', tipo: 'materia_prima', lotes: [{ lote: 'S-2', stock: 30 }] },
  { ingrediente_id: 'i-bicarb', insumo_id: 'ins-bic', nombre: 'Bicarbonato', marca: 'Dos Anclas', tipo: 'materia_prima', lotes: [{ lote: 'B-1', stock: 5 }] },
  { ingrediente_id: 'i-cacao', insumo_id: 'ins-cac', nombre: 'Cacao', marca: 'Fénix', tipo: 'materia_prima', lotes: [{ lote: 'C-1', stock: 50 }] },
]
// La masa anterior, de hoy, hecha con la v1: bicarbonato en 0, colorante,
// 200 g de más de sal y un "otro" escrito a mano.
const ANTERIOR = {
  masa_id: 'mA', lote: 7022, nro: 9, hora: '2026-09-30T13:05:00Z', doble: false,
  fecha_turno: '2026-09-30', es_de_hoy: true, es_chocolate: false,
  items: [
    { ingrediente_id: 'i-agua', insumo_id: null, lote: null, cantidad_simple_kg: 10 },
    { ingrediente_id: 'i-harina', insumo_id: 'ins-h', lote: 'W-9', cantidad_simple_kg: 25 },
    { ingrediente_id: 'i-sal', insumo_id: 'ins-sal', lote: 'S-2', cantidad_simple_kg: 0.3 },
    { ingrediente_id: 'i-bicarb', insumo_id: null, lote: null, cantidad_simple_kg: 0 },
    { ingrediente_id: 'i-cacao', insumo_id: null, lote: null, cantidad_simple_kg: 0 },
    { ingrediente_id: 'i-color', insumo_id: null, lote: null, cantidad_simple_kg: 0.05 },
    { ingrediente_id: null, ingrediente_libre: 'Gluten <b data-xss="libre">', insumo_id: null, lote: null, cantidad_simple_kg: 0.2 },
  ],
}
const DATOS = { original: V2, anterior: ANTERIOR, insumos: INSUMOS }
const STOCK = INSUMOS.map(i => ({ insumo_id: i.insumo_id, nombre: i.nombre, marca: i.marca, lotes: i.lotes.map(l => ({ lote: l.lote, queda: l.stock, desde: '2026-09-01' })) }))

const MAQUINAS = [{ id: 'm1', nombre: 'Máquina 1', orden: 1 }]
const TURNOS = [{ id: 't1', lote: 7023, maquina_id: 'm1', fecha: '2026-09-30', turno: 'Tarde', encargado_id: 'e1', abierto_en: null }]

const tiene = (f, tipo, col, val) => f.some(x => x[0] === tipo && x[1] === col && (val === undefined || x[2] === val))
const seleccion = (f) => (f.find(x => x[0] === 'select') ?? [])[1] ?? ''

function armar({ datos = DATOS, recetaAnterior = 'r1', masasError = null } = {}) {
  const S = construirProduccion(ARCHIVO)
  S.estado.modo = 'masa'
  S.estado.persona = { id: 'e-mas', nombre: 'Agustín Barrera', puesto: 'masero' }
  Object.assign(S.__tablas, {
    maquinas: MAQUINAS,
    turnos_produccion: TURNOS,
    paradas_produccion: [],
    produccion_items: [],
    masas: (f) => {
      if (tiene(f, 'eq', 'id')) return masasError ? { data: null, error: masasError } : { data: [{ id: 'mA', receta_id: recetaAnterior }], error: null }
      return { data: [{ turno_id: 't1', hora: '2026-09-30T13:05:00Z', anulada: false }], error: null }
    },
    recetas: (f) => seleccion(f).includes('version')
      ? { data: tiene(f, 'eq', 'id', 'r1') ? [{ version: 1 }] : [], error: null }
      : { data: [{ tipo_masa: 'Común' }], error: null },
    receta_items: (f) => ({ data: tiene(f, 'eq', 'receta_id', 'r1') ? V1_ITEMS : [], error: null }),
    ingredientes: (f) => tiene(f, 'in', 'id')
      ? { data: [{ id: 'i-color', nombre: 'Colorante' }], error: null }
      : { data: V2.items.map(it => ({ id: it.ingrediente_id, define_chocolate: it.ingrediente_id === 'i-cacao' })), error: null },
  })
  S.__setRpc(async (n) => {
    if (n === 'stock_para_masa') return { data: copia(STOCK), error: null }
    if (n === 'datos_para_masa') return { data: copia(datos), error: null }
    return { data: null, error: null }
  })
  return S
}

async function hastaLaReceta(S, como) {
  await S.mostrarSala()
  await S.elegirMaquinaSala('t1')
  if (como) S.elegirComo(como)
  return S
}
const filas = (S) => S.__doc.getElementById('pr-receta-filas').innerHTML
const aviso = (S) => S.__doc.getElementById('pr-receta-cambio')
const filaDe = (html, nombre) => (html.split('<div class="pr-rec').find(p => p.includes(`>${nombre}`)) ?? '')

esperas.push((async () => {
  // ── Anterior: el bicarbonato nuevo entra con la cantidad de la receta ──
  const S = await hastaLaReceta(armar())
  const b = S.estado.masa
  chk('arranca en Anterior (hay masa anterior de hoy)', b.como === 'anterior' && b.partida === 'anterior', b.como)
  chk('bicarbonato: la cantidad de la receta v2, no el 0 de la anterior', b.cantidades['i-bicarb'] === 0.015, b.cantidades['i-bicarb'])
  chk('bicarbonato marcado nuevo', (b.nuevos ?? []).includes('i-bicarb'), b.nuevos)
  chk('lo demás sigue saliendo de la anterior (sal 0,3, no la 0,1 de la receta)', b.cantidades['i-sal'] === 0.3, b.cantidades['i-sal'])
  chk('el cacao en 0 (la receta vigente no lo lleva) no es nuevo', !(b.nuevos ?? []).includes('i-cacao') && b.cantidades['i-cacao'] === 0)
  const h = filas(S)
  const fb = filaDe(h, 'Bicarbonato')
  chk('el renglón del bicarbonato se ve', !!fb, h)
  chk('con la marca "nuevo en la receta"', /pr-rec__nuevo">nuevo en la receta</.test(fb), fb)
  chk('y pide su lote', /data-lote="i-bicarb"/.test(fb) && S.faltanParaRegistrar(b, S.estado.datosMasa).some(t => /lote de bicarbonato/.test(t)))
  chk('el aviso de arriba se ve', aviso(S).hidden === false)
  chk('dice "La receta cambió (v1 → v2) desde la masa anterior."', aviso(S).textContent.startsWith('La receta cambió (v1 → v2) desde la masa anterior.'), aviso(S).textContent)
  chk('nombra lo nuevo', /Nuevo en la receta: bicarbonato\./.test(aviso(S).textContent), aviso(S).textContent)
  chk('y lo que la receta vigente ya no tiene', /Ya no está en la receta: colorante\./.test(aviso(S).textContent), aviso(S).textContent)
  // Lo que la anterior tenía de extra: el "otro" viaja.
  chk('el "otro" de la anterior viene', b.otros.length === 1 && b.otros[0].kg === 0.2 && b.otros[0].deAnterior === true, b.otros)
  chk('con Anterior el "otro" se ve y no se toca', !/data-cant-otro/.test(h) && !/data-quitar-otro/.test(h) && /de la masa anterior/.test(h))
  chk('el nombre del "otro" va escapado', !/<b data-xss="libre">/.test(h) && /&lt;b data-xss=&quot;libre&quot;&gt;/.test(h), h)
  // El envío: exactamente los de la receta vigente, el bicarbonato con su
  // cantidad y lote, sin el colorante; el "otro" sin ingrediente_id.
  S.elegirOpcionLote('i-bicarb', String(S.opcionesLote(S.estado.datosMasa, 'i-bicarb').findIndex(o => o.lote === 'B-1')))
  const p = S.parametrosRegistrarMasa(S.estado.masa, S.estado.datosMasa, 'e-mas')
  const ids = p.p_items.filter(x => x.ingrediente_id).map(x => x.ingrediente_id).sort()
  chk('viajan exactamente los de la receta vigente', JSON.stringify(ids) === JSON.stringify(V2.items.map(i => i.ingrediente_id).sort()), ids)
  const bic = p.p_items.find(x => x.ingrediente_id === 'i-bicarb')
  chk('el bicarbonato viaja con 0,015 y su lote', bic?.cantidad_simple_kg === 0.015 && bic?.lote === 'B-1' && bic?.insumo_id === 'ins-bic', bic)
  chk('el colorante no viaja (la base lo rechazaría)', !p.p_items.some(x => x.ingrediente_id === 'i-color'))
  chk('el "otro" viaja sin ingrediente_id', p.p_items.some(x => x.ingrediente_id === null && x.cantidad_simple_kg === 0.2 && /^Gluten/.test(x.ingrediente_libre)))

  // ── Modificar arranca de la anterior: también trae el bicarbonato ──────
  S.elegirComo('modificar')
  const m = S.estado.masa
  chk('Modificar: bicarbonato 0,015 y marcado nuevo', m.cantidades['i-bicarb'] === 0.015 && m.nuevos.includes('i-bicarb'))
  chk('Modificar: el "otro" se puede tocar', /data-cant-otro/.test(filas(S)))
  chk('Modificar: el nombre del "otro" va escapado', !/<b data-xss="libre">/.test(filas(S)) && /&lt;b data-xss=&quot;libre&quot;&gt;/.test(filas(S)))
  chk('Modificar: el aviso sigue', aviso(S).hidden === false)

  // ── Original: la receta tal cual, sin marca y sin "otro" ───────────────
  S.elegirComo('original')
  const o = S.estado.masa
  chk('Original: bicarbonato de la receta, sin marca de nuevo', o.cantidades['i-bicarb'] === 0.015 && o.nuevos.length === 0)
  chk('Original: sin el "otro" de la anterior', o.otros.length === 0)
  chk('Original: el aviso de que la receta cambió se ve igual', aviso(S).hidden === false && /v1 → v2/.test(aviso(S).textContent))
  chk('Original: no hay chip de nuevo', !/pr-rec__nuevo/.test(filas(S)))

  // ── Misma receta: un 0 que puso el masero se respeta, sin aviso ────────
  const mismo = copia(DATOS)
  mismo.original.items.find(i => i.ingrediente_id === 'i-bicarb').cantidad_kg = 0.015
  const R = await hastaLaReceta(armar({ datos: mismo, recetaAnterior: 'r2' }))
  chk('misma receta: el bicarbonato en 0 de la anterior se respeta', R.estado.masa.cantidades['i-bicarb'] === 0 && R.estado.masa.nuevos.length === 0, R.estado.masa.cantidades)
  chk('misma receta: sin aviso', aviso(R).hidden === true && aviso(R).textContent === '')

  // ── La receta cambió, pero la sal ya estaba en la v1 y el masero la sacó
  // (0 en la anterior): ese 0 se respeta, no es "nuevo en la receta".
  const sinSal = copia(DATOS)
  sinSal.anterior.items.find(x => x.ingrediente_id === 'i-sal').cantidad_simple_kg = 0
  const T = await hastaLaReceta(armar({ datos: sinSal }))
  chk('cambió la receta: un 0 que puso el masero en algo que la v1 llevaba se respeta', T.estado.masa.cantidades['i-sal'] === 0 && !T.estado.masa.nuevos.includes('i-sal'), T.estado.masa.nuevos)
  chk('y el bicarbonato sigue siendo nuevo', T.estado.masa.nuevos.includes('i-bicarb') && !/Nuevo en la receta: [^.]*sal/.test(aviso(T).textContent))

  // ── La anterior directamente no tiene el renglón: nuevo aunque no se sepa la receta
  const sin = copia(DATOS)
  sin.anterior.items = sin.anterior.items.filter(x => x.ingrediente_id !== 'i-bicarb')
  const F = await hastaLaReceta(armar({ datos: sin, masasError: { message: 'TypeError: Failed to fetch', code: '' } }))
  chk('si no se puede leer la receta de la anterior, la masa se arma igual', F.estado.masa?.como === 'anterior' && F.estado.datosMasa.anterior.receta === null)
  chk('y un renglón que la anterior no tiene entra con la receta, marcado', F.estado.masa.cantidades['i-bicarb'] === 0.015 && F.estado.masa.nuevos.includes('i-bicarb'))
  chk('el aviso no inventa versiones', /Nuevo en la receta: bicarbonato\./.test(aviso(F).textContent) && !/v1|→/.test(aviso(F).textContent), aviso(F).textContent)
  const G = await hastaLaReceta(armar({ masasError: { message: 'TypeError: Failed to fetch', code: '' } }))
  chk('sin la receta de la anterior, el 0 de la anterior no se toca (no se adivina)', G.estado.masa.cantidades['i-bicarb'] === 0 && aviso(G).hidden === true)

  // ── Las funciones puras ────────────────────────────────────────────────
  const d = copia(DATOS); d.anterior.receta = { receta_id: 'r1', version: 1, items: V1_ITEMS, quitados: [] }
  chk('recetaCambioDesdeAnterior: v1 → v2', JSON.stringify(S.recetaCambioDesdeAnterior(d)) === '{"desde":1,"hasta":2}')
  chk('nuevosEnReceta: solo el bicarbonato', JSON.stringify([...S.nuevosEnReceta(d)]) === '["i-bicarb"]')
  chk('cantidadesDesde con la partida original no mira la anterior', S.cantidadesDesde('original', d.original, d.anterior)['i-sal'] === 0.1)
  chk('sin anterior no hay nuevos ni aviso', S.nuevosEnReceta({ original: V2, anterior: null }).size === 0 && S.textoCambioReceta({ original: V2, anterior: null }) === '')

  // ── La reventa no se ofrece para producir ─────────────────────────────
  const P = construirProduccion(ARCHIVO)
  Object.assign(P.__tablas, {
    productos_terminados: [
      { id: 'p1', nombre: 'Cucuruchón Mini', tipo_masa: 'Común', orden: 1, color: null, origen_producto_id: null },
      { id: 'p2', nombre: 'Conos dulces', tipo_masa: 'Común', orden: 2, color: null, origen_producto_id: 'px' },
      { id: 'p3', nombre: 'Cucuruchón Grande', tipo_masa: 'Común', orden: 3, color: null },
    ],
    producto_presentaciones: (f) => ({ data: [{ id: 'pr1', producto_id: 'p1' }, { id: 'pr2', producto_id: 'p2' }].filter(x => (f.find(y => y[0] === 'in')?.[2] ?? []).includes(x.producto_id)), error: null }),
    marcas_personalizadas: [], presentacion_cajas: [], presentacion_empaque: [], unidades_negocio: [{ id: 'u1', caja_predeterminada_id: null }], insumos: [],
  })
  const cat = await P.leerCatalogoProductos('u1')
  chk('la reventa (origen_producto_id) no está en el catálogo', !cat.productos.some(p => p.id === 'p2'), cat.productos.map(p => p.id))
  chk('los propios sí, también sin la columna', cat.productos.map(p => p.id).join() === 'p1,p3')
  chk('sus presentaciones tampoco se piden', !cat.presentaciones.some(x => x.producto_id === 'p2'))
  const sel = P.__llamadas.consultas.find(([t]) => t === 'productos_terminados')?.[1]
  chk('la consulta trae origen_producto_id y no filtra por él (se saca al armar la lista)', /origen_producto_id/.test(seleccion(sel)) && !sel.some(x => x[1] === 'origen_producto_id' && x[0] !== 'select'))
})())

fin()
