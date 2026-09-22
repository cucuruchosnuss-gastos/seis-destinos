// B5 del módulo Producción (22/09/2026): la sala de masa.
//
// Contrato con la base (pg_get_functiondef, 22/09/2026):
//  - datos_para_masa(p_turno_id, p_tipo_masa) → { original: {receta_id,
//    version, items:[{ingrediente_id, ingrediente, descuenta_stock,
//    cantidad_kg, insumo_preferido_id}]}, anterior: {lote, nro, hora, items:
//    [{ingrediente_id, insumo_id, lote, cantidad_simple_kg}]} | null, insumos:
//    [{ingrediente_id, insumo_id, nombre, marca, tipo, lotes:[{lote, stock}]}] }
//  - registrar_masa(p_turno_id, p_tipo_masa, p_doble, p_masero_id, p_items,
//    p_client_uuid): se manda UNA masa simple (la doble es ×2 en la base), con
//    TODOS los ingredientes de la original. Si el client_uuid ya existe, la
//    base devuelve esa masa sin tocar nada (reintento).
//  - anular_masa(p_masa_id, p_motivo): motivo de 3 letras o más.
//
// LA REGLA DEL UUID, que es lo que más importa de esta suite: un uuid NUEVO
// por masa, el MISMO en cada reintento (también después de recargar la
// tablet), y uno nuevo recién en la masa siguiente.
//
//   node pruebas/test-produccion-masa.js

process.env.TZ = 'UTC'

const path = require('path')
const { arnes, leer, marca, chequearMarcas } = require('./circuito-comun')
const { construirProduccion } = require('./sandbox-produccion')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/produccion.html')
leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

const ORIGINAL = { receta_id: 'r1', version: 1, items: [
  { ingrediente_id: 'i-agua', ingrediente: 'Agua', orden: 1, descuenta_stock: false, cantidad_kg: 10, insumo_preferido_id: null },
  { ingrediente_id: 'i-harina', ingrediente: 'Harina', orden: 2, descuenta_stock: true, cantidad_kg: 25, insumo_preferido_id: 'ins-h1' },
  { ingrediente_id: 'i-azucar', ingrediente: 'Azúcar', orden: 3, descuenta_stock: true, cantidad_kg: 5, insumo_preferido_id: null },
  { ingrediente_id: 'i-grasa', ingrediente: 'Grasa', orden: 4, descuenta_stock: true, cantidad_kg: 2, insumo_preferido_id: null },
  { ingrediente_id: 'i-lecitina', ingrediente: 'Lecitina', orden: 5, descuenta_stock: true, cantidad_kg: 0.15, insumo_preferido_id: null },
  { ingrediente_id: 'i-cacao', ingrediente: 'Cacao', orden: 6, descuenta_stock: true, cantidad_kg: 0, insumo_preferido_id: null },
] }
const INSUMOS = [
  { ingrediente_id: 'i-harina', insumo_id: 'ins-h1', nombre: 'Harina 000', marca: 'Jupiter', tipo: 'materia_prima', lotes: [{ lote: 'L-100', stock: 500 }, { lote: 'L-101', stock: 250.5 }] },
  { ingrediente_id: 'i-harina', insumo_id: 'ins-h2', nombre: 'Harina 000', marca: 'Wali', tipo: 'materia_prima', lotes: [{ lote: 'W-9', stock: 100 }] },
  { ingrediente_id: 'i-azucar', insumo_id: 'ins-az', nombre: 'Azúcar', marca: null, tipo: 'materia_prima', lotes: [{ lote: 'A1', stock: 40 }] },
  { ingrediente_id: 'i-lecitina', insumo_id: 'ins-lec', nombre: 'Lecitina', marca: null, tipo: 'insumo', lotes: [] },
  { ingrediente_id: 'i-cacao', insumo_id: 'ins-cac', nombre: 'Cacao', marca: null, tipo: 'materia_prima', lotes: [] },
]
const ANTERIOR = { masa_id: 'mA', lote: 7022, nro: 4, hora: '2026-09-22T11:30:00Z', doble: false, items: [
  { ingrediente_id: 'i-agua', insumo_id: null, lote: null, cantidad_simple_kg: 10 },
  { ingrediente_id: 'i-harina', insumo_id: 'ins-h2', lote: 'W-9', cantidad_simple_kg: 25.2 },
  { ingrediente_id: 'i-azucar', insumo_id: 'ins-az', lote: 'A1', cantidad_simple_kg: 5 },
  { ingrediente_id: 'i-grasa', insumo_id: null, lote: null, cantidad_simple_kg: 2 },
  { ingrediente_id: 'i-lecitina', insumo_id: 'ins-lec', lote: null, cantidad_simple_kg: 0.15 },
] }
const DATOS = { original: ORIGINAL, anterior: ANTERIOR, insumos: INSUMOS }
const copia = (x) => JSON.parse(JSON.stringify(x))
const ERROR_RED = { message: 'TypeError: Failed to fetch', code: '' }

function armar({ datos = DATOS, rpc } = {}) {
  const S = construirProduccion(ARCHIVO)
  S.estado.modo = 'masa'
  S.estado.persona = { id: 'e-mas', nombre: 'Juan Masero' }
  S.estado.salaTurno = { id: 't1', lote: 7023, maquinaId: 'm1', maquinaNombre: 'Máquina 1' }
  S.__tablas.recetas = [{ tipo_masa: 'Común' }, { tipo_masa: 'Chocolate' }, { tipo_masa: 'Común' }]
  S.__setRpc(rpc ?? (async (n) => n === 'datos_para_masa' ? { data: copia(datos), error: null } : { data: null, error: null }))
  return S
}
const llamadasMasa = (S) => S.__llamadas.rpc.filter(([n]) => n === 'registrar_masa').map(([, p]) => p)

// ── Cantidades, pasos y diferencias ──────────────────────────────────────
{
  const S = armar()
  chk('paso de 100 g en Harina, Agua, Azúcar (con tilde) y Grasa', ['Harina', 'Agua', 'Azúcar', 'Grasa'].every(n => S.pasoDe(n) === 0.1))
  chk('paso de 10 g en los demás', S.pasoDe('Lecitina') === 0.01 && S.pasoDe('Bicarbonato') === 0.01)
  const orig = S.cantidadesDesde('original', ORIGINAL, ANTERIOR)
  chk('desde la original: las cantidades de la receta', orig['i-harina'] === 25 && orig['i-lecitina'] === 0.15 && orig['i-cacao'] === 0)
  const ant = S.cantidadesDesde('anterior', ORIGINAL, ANTERIOR)
  chk('desde la anterior: las de la anterior', ant['i-harina'] === 25.2)
  chk('un ingrediente que la anterior no tenía toma el de la original', ant['i-cacao'] === 0 && S.cantidadesDesde('anterior', ORIGINAL, { items: [] })['i-harina'] === 25)
  const difs = S.diferencias(ant, ORIGINAL)
  chk('la diferencia contra la original, en gramos', difs.length === 1 && difs[0].gramos === 200 && difs[0].nombre === 'Harina')
  chk('texto de la diferencia', S.textoDiferencias(difs) === '+200 g Harina', S.textoDiferencias(difs))
  chk('igual a la original', S.textoDiferencias(S.diferencias(orig, ORIGINAL)) === 'Igual a la original')
  chk('una resta se escribe con signo menos', S.textoGramos(-50) === '−50 g')
  chk('miles con punto', S.textoGramos(1500) === '+1.500 g')
  chk('la diferencia corta se recorta', S.textoDiferencias([{ nombre: 'A', gramos: 1 }, { nombre: 'B', gramos: 2 }, { nombre: 'C', gramos: 3 }], 2) === '+1 g A · +2 g B · …')
  chk('sin ruido de coma flotante', S.redondearKg(0.1 + 0.2) === 0.3)
}

esperas.push((async () => {
  // ── El asistente, de punta a punta ──────────────────────────────────────
  const S = armar()
  await S.nuevaMasa()
  chk('"Nueva masa" arranca un borrador con un uuid nuevo', S.estado.masa?.client_uuid === 'uuid-1' && S.__uuids() === 1)
  chk('… guardado en la tablet', JSON.parse(S.localStorage.getItem('produccion.masa.t1')).client_uuid === 'uuid-1')
  chk('los tipos salen de las recetas de la máquina, sin repetir', JSON.stringify(S.estado.tiposMasa) === '["Chocolate","Común"]')
  chk('… leídas de esa máquina', S.__llamadas.consultas.some(([t, f]) => t === 'recetas' && JSON.stringify(f).includes('["eq","maquina_id","m1"]')))
  await S.elegirTipoMasa('Común')
  const dm = S.__llamadas.rpc.find(([n]) => n === 'datos_para_masa')
  chk('datos_para_masa con el turno y el tipo', JSON.stringify(dm?.[1]) === '{"p_turno_id":"t1","p_tipo_masa":"Común"}')
  chk('pasa al paso de la receta', S.estado.masa.paso === 'base')
  const base = S.htmlPasoBase(S.estado.masa, S.estado.datosMasa)
  chk('"Usar la anterior" dice de qué lote, masa y hora es', /Lote 7022 · masa 4 · 08:30/.test(base), base)
  chk('… y su diferencia contra la original', /Contra la original: \+200 g Harina/.test(base))
  chk('"Usar la anterior" habilitado si hay anterior', !/data-base="anterior" disabled/.test(base))

  S.elegirBase('modificar')
  chk('"Modificar" pregunta de dónde parte', S.estado.masa.paso === 'partida' && S.estado.masa.base === 'modificada')
  S.elegirPartida('original')
  chk('parte de la original', S.estado.masa.paso === 'editar' && S.estado.masa.cantidades['i-harina'] === 25)
  S.sumarPaso('i-harina', +1); S.sumarPaso('i-harina', +1)
  chk('+ en harina suma 100 g cada vez', S.estado.masa.cantidades['i-harina'] === 25.2)
  S.sumarPaso('i-lecitina', -1)
  chk('− en lecitina resta 10 g', S.estado.masa.cantidades['i-lecitina'] === 0.14)
  for (let i = 0; i < 30; i++) S.sumarPaso('i-lecitina', -1)
  chk('nunca negativo', S.estado.masa.cantidades['i-lecitina'] === 0)
  S.cambiarCantidad('i-lecitina', 0.15)
  S.cambiarCantidad('i-azucar', -3)
  chk('un número negativo tipeado queda en 0', S.estado.masa.cantidades['i-azucar'] === 0)
  S.cambiarCantidad('i-azucar', 4.95)
  S.cambiarCantidad('i-azucar', null)
  chk('un número ilegible no cambia nada', S.estado.masa.cantidades['i-azucar'] === 4.95)
  const fila = S.htmlFilaIngrediente(ORIGINAL.items[2], 4.95)
  chk('la fila dice la diferencia en vivo, en bordó si se aleja', /pr-ing--cambia/.test(fila) && /−50 g contra la original/.test(fila))
  chk('igual a la original, sin bordó', !/pr-ing--cambia/.test(S.htmlFilaIngrediente(ORIGINAL.items[1], 25)))
  chk('en 0 el "−" se deshabilita', /data-menos="i-cacao"[^>]*disabled/.test(S.htmlFilaIngrediente(ORIGINAL.items[5], 0)))
  chk('el borrador guarda lo tipeado', JSON.parse(S.localStorage.getItem('produccion.masa.t1')).cantidades['i-azucar'] === 4.95)

  // Lotes: la anterior existe, se pregunta.
  S.irAPaso('lotes')
  const lotes0 = S.htmlPasoLotes(S.estado.masa, S.estado.datosMasa)
  chk('con anterior pregunta "¿Mismos lotes que la anterior?"', /Mismos lotes que la anterior/.test(lotes0) && /data-mismos="si"/.test(lotes0))
  chk('los que no tienen insumo en el catálogo no descuentan, y lo dice', /No descuentan stock porque no tienen insumo en el catálogo: Grasa\./.test(lotes0))
  const con = S.ingredientesConLote(S.estado.datosMasa, S.estado.masa.cantidades).map(x => x.ingrediente_id)
  chk('piden lote: descuentan, llevan cantidad y tienen insumo (no agua, no grasa, no cacao en 0)', con.join() === 'i-harina,i-azucar,i-lecitina', con.join())
  S.elegirMismosLotes(true)
  chk('"Sí": copia insumo y lote de la anterior', S.estado.masa.lotes['i-harina'].insumo_id === 'ins-h2' && S.estado.masa.lotes['i-harina'].lote === 'W-9' && S.estado.masa.lotes['i-azucar'].lote === 'A1')
  S.elegirMismosLotes(false)
  chk('"No": el insumo por defecto es el de la anterior', S.estado.masa.lotes['i-harina'].insumo_id === 'ins-h2')
  chk('… y el lote queda por elegir', S.estado.masa.lotes['i-harina'].lote === null)
  chk('sin lote de materia prima: falta', S.faltanLotes(S.estado.masa, S.estado.datosMasa).some(x => x.includes('lote de harina')))
  const html = S.htmlLoteIngrediente(ORIGINAL.items[1], S.estado.masa, S.estado.datosMasa)
  chk('los lotes con stock de ese insumo, con su cantidad', /Lote W-9 · 100 kg/.test(html) && !/L-100/.test(html))
  chk('"El lote no está en la lista" siempre', /__manual__/.test(html))
  chk('materia prima no ofrece "Sin lote"', !/Sin lote/.test(html))
  chk('un insumo que no es materia prima ofrece "Sin lote"', /Sin lote/.test(S.htmlLoteIngrediente(ORIGINAL.items[4], S.estado.masa, S.estado.datosMasa)))
  S.estado.masa.lotes['i-harina'] = { insumo_id: 'ins-h1', lote: 'L-101', manual: false }
  S.estado.masa.lotes['i-azucar'] = { insumo_id: 'ins-az', lote: null, manual: true }
  chk('lote escrito a mano sin escribir: falta', S.faltanLotes(S.estado.masa, S.estado.datosMasa).some(x => x.includes('azúcar')))
  const man = S.htmlLoteIngrediente(ORIGINAL.items[2], S.estado.masa, S.estado.datosMasa)
  chk('lote a mano: campo para escribirlo y aviso de revisión', /data-lote-manual="i-azucar"/.test(man) && /queda marcado para revisar/.test(man))
  S.estado.masa.lotes['i-azucar'].lote = '  A-NUEVO '
  S.estado.masa.lotes['i-lecitina'] = S.aplicarEleccionLote({ insumo_id: 'ins-lec', lote: 'X', manual: true }, '__sin__')
  chk('elegir "Sin lote": lote null, no el texto', S.estado.masa.lotes['i-lecitina'].lote === null && S.estado.masa.lotes['i-lecitina'].sinLote === true && S.estado.masa.lotes['i-lecitina'].manual === false)
  chk('elegir "no está en la lista": abre el campo a mano', S.aplicarEleccionLote({ insumo_id: 'a', lote: 'L-1' }, '__manual__').manual === true)
  chk('elegir un lote de la lista: ese lote, sin "a mano"', (() => { const l = S.aplicarEleccionLote({ insumo_id: 'a', lote: null, manual: true }, 'L-100'); return l.lote === 'L-100' && l.manual === false && l.insumo_id === 'a' })())
  S.estado.masa.lotes['i-grasa'] = { insumo_id: 'ins-inventado', lote: 'G-1', manual: false }
  chk('con todo elegido no falta nada', S.faltanLotes(S.estado.masa, S.estado.datosMasa).length === 0)

  // Resumen con la doble ×2 bien visible.
  S.estado.masa.doble = true
  S.irAPaso('resumen')
  const res = S.htmlPasoResumen(S.estado.masa, S.estado.datosMasa)
  chk('resumen: DOBLE ×2 bien visible', /class="pr-doble">DOBLE ×2</.test(res))
  chk('… cada ingrediente simple y ×2', /Harina<\/td><td class="pr-num">25,2 kg<\/td><td class="pr-num">50,4 kg/.test(res), res.slice(0, 600))
  chk('… la diferencia contra la original', /\+200 g Harina · −50 g Azúcar/.test(res))
  chk('… y el insumo y lote', /Harina 000 · Jupiter · lote L-101/.test(res))
  const simple = S.htmlPasoResumen({ ...S.estado.masa, doble: false }, S.estado.datosMasa)
  chk('simple: sin columna ×2', !/×2 \(total\)/.test(simple) && /Simple/.test(simple))

  // ── El payload: UNA masa simple ───────────────────────────────────────
  const p = S.parametrosRegistrarMasa(S.estado.masa, S.estado.datosMasa, 'e-mas')
  chk('p_doble va aparte y las cantidades son de UNA masa simple (no ×2)', p.p_doble === true && p.p_items.find(x => x.ingrediente_id === 'i-harina').cantidad_simple_kg === 25.2)
  chk('todos los ingredientes de la original, con 0 si no lleva', p.p_items.length === 6 && p.p_items.find(x => x.ingrediente_id === 'i-cacao').cantidad_simple_kg === 0)
  chk('el masero es la persona de "¿Quién sos?"', p.p_masero_id === 'e-mas')
  chk('un ingrediente que no pide lote viaja sin insumo aunque el borrador tenga uno', p.p_items.find(x => x.ingrediente_id === 'i-grasa').insumo_id === null && p.p_items.find(x => x.ingrediente_id === 'i-grasa').lote === null)
  chk('el uuid es el del borrador', p.p_client_uuid === 'uuid-1')
  chk('el lote a mano viaja recortado', p.p_items.find(x => x.ingrediente_id === 'i-azucar').lote === 'A-NUEVO')
  chk('"Sin lote" viaja como null, nunca como texto', p.p_items.find(x => x.ingrediente_id === 'i-lecitina').lote === null && p.p_items.find(x => x.ingrediente_id === 'i-lecitina').insumo_id === 'ins-lec')
  chk('los que no piden lote viajan sin insumo ni lote', ['i-agua', 'i-grasa', 'i-cacao'].every(id => { const x = p.p_items.find(y => y.ingrediente_id === id); return x.insumo_id === null && x.lote === null }))
  chk('no se manda el origen: lo calcula la base', !('p_origen' in p) && Object.keys(p).join() === 'p_turno_id,p_tipo_masa,p_doble,p_masero_id,p_items,p_client_uuid')

  // ── Sin conexión: se guarda y se reintenta con el MISMO uuid ─────────
  let intentos = 0
  S.__setRpc(async (n) => {
    if (n === 'registrar_masa') { intentos++; return intentos < 3 ? { data: null, error: ERROR_RED } : { data: { masa_id: 'm9', nro: 6, origen: 'modificada', lote: 7023 }, error: null } }
    return { data: copia(DATOS), error: null }
  })
  await S.registrarMasa()
  chk('sin conexión: queda pendiente, con el payload guardado', S.estado.masa?.pendiente === true && !!S.estado.masa.payload)
  chk('el envío lleva al masero de "¿Quién sos?"', llamadasMasa(S)[0]?.p_masero_id === 'e-mas')
  // Una vez mandado, el payload queda congelado: lo que se reintenta es
  // exactamente lo que se mandó, aunque el estado cambie.
  S.estado.masa.cantidades['i-harina'] = 99
  S.estado.masa.pendiente = false
  await S.registrarMasa()
  chk('el payload ya mandado no se rehace', llamadasMasa(S)[1]?.p_items.find(x => x.ingrediente_id === 'i-harina').cantidad_simple_kg === 25.2)
  chk('… lo dice y pide no cargarla de nuevo', /No la cargues de nuevo/.test(S.__doc.getElementById('pr-masa-error').textContent))
  chk('… y está en la tablet', JSON.parse(S.localStorage.getItem('produccion.masa.t1')).pendiente === true)
  await S.reintentarPendientes()
  const envios = llamadasMasa(S)
  chk('tres envíos, los tres con el MISMO uuid', envios.length === 3 && envios.every(x => x.p_client_uuid === 'uuid-1'), JSON.stringify(envios.map(x => x.p_client_uuid)))
  chk('… y el mismo contenido', envios.every(x => JSON.stringify(x) === JSON.stringify(envios[0])))
  chk('ningún uuid nuevo al reintentar', S.__uuids() === 1)
  chk('cuando llegó, se borra el borrador', S.localStorage.getItem('produccion.masa.t1') === null && S.estado.masa === null)

  // La siguiente masa: uuid nuevo.
  await S.nuevaMasa()
  chk('la masa siguiente lleva un uuid NUEVO', S.estado.masa.client_uuid === 'uuid-2' && S.__uuids() === 2)

  // ── Recargar la tablet en el medio: sigue el mismo uuid ──────────────
  const A = armar({ rpc: async (n) => n === 'registrar_masa' ? { data: null, error: ERROR_RED } : { data: copia(DATOS), error: null } })
  await A.nuevaMasa()
  await A.elegirTipoMasa('Común')
  A.elegirBase('original')
  A.elegirMismosLotes(true)
  A.estado.masa.lotes['i-harina'] = { insumo_id: 'ins-h1', lote: 'L-100', manual: false }
  await A.registrarMasa()
  const uuidA = A.estado.masa.client_uuid
  const R = armar({ rpc: async (n) => n === 'registrar_masa' ? { data: { masa_id: 'm', nro: 1, origen: 'original', lote: 7023, reintento: true }, error: null } : { data: copia(DATOS), error: null } })
  for (const [k, v] of A.__ls) R.__ls.set(k, v)
  chk('después de recargar, la pendiente está', R.borradoresPendientes().length === 1)
  await R.reintentarPendientes()
  const rEnvios = llamadasMasa(R)
  chk('recargada, reintenta con el uuid que ya tenía', rEnvios.length === 1 && rEnvios[0].p_client_uuid === uuidA)
  chk('… sin generar ninguno', R.__uuids() === 0)
  chk('la respuesta "reintento" de la base cuenta como enviada', R.localStorage.getItem('produccion.masa.t1') === null)
  // "Nueva masa" con una empezada retoma esa.
  const B = armar()
  await B.nuevaMasa()
  await B.nuevaMasa()
  chk('"Nueva masa" con una empezada la retoma (no pisa el uuid)', B.estado.masa.client_uuid === 'uuid-1' && B.__uuids() === 1)
  B.estado.masa.pendiente = true
  B.descartarMasa()
  chk('una masa pendiente de envío no se puede descartar', B.estado.masa !== null)
  B.estado.masa.pendiente = false
  B.descartarMasa()
  chk('una sin enviar sí', B.estado.masa === null && B.localStorage.getItem('produccion.masa.t1') === null)

  // ── La base dice que no: se muestra tal cual y se puede corregir ─────
  const C = armar()
  await C.nuevaMasa()
  await C.elegirTipoMasa('Común')
  C.elegirBase('original')
  C.elegirMismosLotes(true)
  C.estado.masa.lotes['i-harina'] = { insumo_id: 'ins-h1', lote: 'L-100', manual: false }
  C.__setRpc(async () => ({ data: null, error: { message: 'Esa persona no figura como masero de esta unidad.', code: 'P0001' } }))
  await C.registrarMasa()
  chk('rechazo de la base: el mensaje tal cual', C.__doc.getElementById('pr-masa-error').textContent === 'Esa persona no figura como masero de esta unidad.')
  chk('… no queda pendiente (no se guardó nada) y el payload se rehace', C.estado.masa.pendiente === false && C.estado.masa.payload === null)
  C.__setRpc(async () => ({ data: { nro: 1, origen: 'original' }, error: null }))
  await C.registrarMasa()
  chk('al reintentar después de corregir, sigue el mismo uuid', llamadasMasa(C).every(x => x.p_client_uuid === 'uuid-1') && C.__uuids() === 1)
  chk('… y dice el número y el origen que calculó la base', C.__llamadas.exitos.some(m => m === 'Masa 1 registrada (Original).'))

  chk('un error sin código es de red', C.esErrorDeRed({ message: 'Failed to fetch' }) && C.esErrorDeRed(null))
  chk('un error con código es de la base', !C.esErrorDeRed({ message: 'x', code: 'P0001' }))
  chk('… aunque el mensaje hable de conexión', !C.esErrorDeRed({ message: 'Sin conexión con la balanza', code: 'P0001' }))
  C.__ls.set('produccion.masa.t2', JSON.stringify({ client_uuid: 'u', turnoId: 't1' }))
  chk('un borrador guardado bajo otro turno no se toma', C.leerBorradorMasa('t2') === null)

  // ── Faltan lotes: no se manda ─────────────────────────────────────────
  const D = armar()
  await D.nuevaMasa()
  await D.elegirTipoMasa('Común')
  D.elegirBase('original')
  D.elegirMismosLotes(false)
  await D.registrarMasa()
  chk('sin lote de materia prima no se manda', llamadasMasa(D).length === 0 && /lote de harina/.test(D.__doc.getElementById('pr-masa-error').textContent))

  // ── Sin anterior ───────────────────────────────────────────────────────
  const E = armar({ datos: { ...DATOS, anterior: null } })
  await E.nuevaMasa()
  await E.elegirTipoMasa('Común')
  const baseE = E.htmlPasoBase(E.estado.masa, E.estado.datosMasa)
  chk('sin anterior: "Usar la anterior" deshabilitado', /data-base="anterior" disabled/.test(baseE))
  E.elegirBase('anterior')
  chk('… y no hace nada', E.estado.masa.paso === 'base')
  E.elegirBase('original')
  chk('sin anterior no se pregunta por los lotes de la anterior', !/Mismos lotes/.test(E.htmlPasoLotes(E.estado.masa, E.estado.datosMasa)))
  chk('el insumo por defecto es el preferido de la receta', E.insumoPorDefecto(E.estado.datosMasa, 'i-harina') === 'ins-h1')
  const F = armar({ datos: { ...DATOS, anterior: { ...ANTERIOR, items: ORIGINAL.items.map(i => ({ ingrediente_id: i.ingrediente_id, cantidad_simple_kg: i.cantidad_kg })) } } })
  await F.nuevaMasa()
  await F.elegirTipoMasa('Común')
  chk('anterior igual a la original: lo dice', /Es igual a la original/.test(F.htmlPasoBase(F.estado.masa, F.estado.datosMasa)))

  // ── La sala: solo máquinas abiertas ───────────────────────────────────
  const G = armar()
  Object.assign(G.__tablas, { maquinas: [{ id: 'm1', nombre: 'Máquina 1' }, { id: 'm2', nombre: 'Máquina 2' }], turnos_produccion: [], masas: [], paradas_produccion: [] })
  await G.mostrarSala()
  chk('sin máquinas abiertas: lo dice', /el encargado tiene que abrir el turno/.test(G.__doc.getElementById('pr-sala-aviso').innerHTML) && G.__doc.getElementById('pr-sala-maquinas').innerHTML === '')
  G.__tablas.turnos_produccion = [{ id: 't1', lote: 7023, maquina_id: 'm2', abierto_en: null }]
  await G.mostrarSala()
  const sala = G.__doc.getElementById('pr-sala-maquinas').innerHTML
  chk('solo las abiertas, con su lote', (sala.match(/data-sala-turno=/g) || []).length === 1 && /Máquina 2/.test(sala) && /class="pr-lote">7023</.test(sala))

  // ── Las masas del turno y anular ─────────────────────────────────────
  const H = armar()
  Object.assign(H.__tablas, {
    masas: [{ id: 'ma1', nro: 1, hora: '2026-09-22T10:00:00Z', tipo_masa: 'Común', doble: true, origen: 'modificada', receta_id: 'r1', anulada: false },
      { id: 'ma2', nro: 2, hora: '2026-09-22T10:40:00Z', tipo_masa: 'Común', doble: false, origen: 'original', receta_id: 'r1', anulada: true, anulada_motivo: 'Se quemó' }],
    masa_items: [{ masa_id: 'ma1', ingrediente_id: 'i-harina', cantidad_simple_kg: 25.3 }, { masa_id: 'ma1', ingrediente_id: 'i-azucar', cantidad_simple_kg: 4.9 }],
    receta_items: [{ receta_id: 'r1', ingrediente_id: 'i-harina', cantidad_kg: 25 }, { receta_id: 'r1', ingrediente_id: 'i-azucar', cantidad_kg: 5 },
      { receta_id: 'r2', ingrediente_id: 'i-harina', cantidad_kg: 30 }],
    ingredientes: [{ id: 'i-harina', nombre: 'Harina' }, { id: 'i-azucar', nombre: 'Azúcar' }],
  })
  await H.cargarMasasTurno()
  const lista = H.__doc.getElementById('pr-masa-lista').innerHTML
  chk('cada masa: número, hora, tipo, simple o doble y origen', /pr-masa-fila__nro">1</.test(lista) && /07:00 · Común · Doble/.test(lista) && /pr-chip-origen--modificada">Modificada/.test(lista))
  chk('… y la diferencia corta contra SU receta (no contra otra versión)', />\+300 g Harina · −100 g Azúcar<\/span>/.test(lista))
  chk('la anulada se ve anulada, con su motivo y sin "Anular"', /pr-masa-fila--anulada/.test(lista) && /Anulada: Se quemó/.test(lista) && !/data-anular-masa="ma2"/.test(lista))
  chk('la otra se puede anular', /data-anular-masa="ma1"/.test(lista))
  H.pedirAnularMasa('ma1')
  chk('anular pide motivo', H.__doc.getElementById('pr-anular-masa').hidden === false && /masa 1/.test(H.__doc.getElementById('pr-anular-masa-titulo').textContent))
  H.__doc.getElementById('pr-anular-masa-motivo').value = 'no'
  await H.confirmarAnularMasa()
  chk('motivo de menos de 3 letras: no se manda', !H.__llamadas.rpc.some(([n]) => n === 'anular_masa'))
  H.__doc.getElementById('pr-anular-masa-motivo').value = '  Se volcó  '
  await H.confirmarAnularMasa()
  const an = H.__llamadas.rpc.find(([n]) => n === 'anular_masa')
  chk('anular_masa con la masa y el motivo', JSON.stringify(an?.[1]) === '{"p_masa_id":"ma1","p_motivo":"Se volcó"}')
  chk('… y avisa que se devolvió lo descontado', H.__llamadas.exitos.some(m => /devolvió al stock/.test(m)))

  // ── HTML malicioso ────────────────────────────────────────────────────
  const X = armar()
  const datosMalos = {
    original: { version: marca('version'), items: [{ ingrediente_id: marca('ingId'), ingrediente: marca('ingrediente'), descuenta_stock: true, cantidad_kg: 1 }] },
    anterior: { lote: marca('loteAnt'), nro: marca('nroAnt'), hora: null, items: [] },
    insumos: [{ ingrediente_id: marca('ingId'), insumo_id: marca('insId'), nombre: marca('insNombre'), marca: marca('insMarca'), tipo: 'insumo', lotes: [{ lote: marca('lote'), stock: 1 }] }],
  }
  const bm = { tipo: marca('tipo'), doble: true, cantidades: { [marca('ingId')]: 1 }, lotes: { [marca('ingId')]: { insumo_id: marca('insId'), lote: marca('lote'), manual: false } }, mismosLotes: false }
  chequearMarcas(chk, 'paso tipo', X.htmlPasoTipo(bm, [marca('tipo')]), ['tipo'])
  chequearMarcas(chk, 'paso base', X.htmlPasoBase(bm, datosMalos), ['version', 'loteAnt', 'nroAnt'])
  chequearMarcas(chk, 'fila de ingrediente', X.htmlFilaIngrediente(datosMalos.original.items[0], 1), ['ingId', 'ingrediente'])
  chequearMarcas(chk, 'lote del ingrediente', X.htmlLoteIngrediente(datosMalos.original.items[0], bm, datosMalos), ['ingId', 'ingrediente', 'insId', 'insNombre', 'insMarca', 'lote'])
  const bManual = { ...bm, lotes: { [marca('ingId')]: { insumo_id: marca('insId'), lote: null, manual: true } } }
  chequearMarcas(chk, 'lote a mano', X.htmlLoteIngrediente(datosMalos.original.items[0], bManual, datosMalos), ['ingId', 'ingrediente'])
  chk('… con el campo para escribirlo', /data-lote-manual=/.test(X.htmlLoteIngrediente(datosMalos.original.items[0], bManual, datosMalos)))
  chequearMarcas(chk, 'paso lotes', X.htmlPasoLotes({ ...bm, mismosLotes: null }, datosMalos), ['loteAnt', 'nroAnt'])
  chequearMarcas(chk, 'resumen', X.htmlPasoResumen(bm, datosMalos), ['tipo', 'ingrediente', 'insNombre', 'insMarca', 'lote'])
  const dm2 = { items: [], recItems: [], ingredientes: [] }
  chequearMarcas(chk, 'masa del turno', X.htmlMasaFila({ id: marca('masaId'), nro: marca('nro'), tipo_masa: marca('tipoMasa'), origen: marca('origen'), anulada: false, hora: null }, dm2, true) +
    X.htmlMasaFila({ id: 'x', nro: 1, tipo_masa: 'a', origen: 'original', anulada: true, anulada_motivo: marca('motivoAnul') }, dm2, true), ['masaId', 'nro', 'tipoMasa', 'origen', 'motivoAnul'])
  const Y = armar()
  Object.assign(Y.__tablas, { maquinas: [{ id: 'm1', nombre: marca('maqSala') }], turnos_produccion: [{ id: marca('turnoSala'), lote: marca('loteSala'), maquina_id: 'm1', abierto_en: null }], masas: [], paradas_produccion: [] })
  await Y.mostrarSala()
  chequearMarcas(chk, 'sala', Y.__doc.getElementById('pr-sala-maquinas').innerHTML, ['maqSala', 'turnoSala', 'loteSala'])
})())

fin()
