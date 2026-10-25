// Ingreso de producto terminado (14/10/2026, pedido del 14/10): en la gestión
// de Producción, "Cargar ingreso" en el stock terminado. Lo que se prueba:
// el armado del pedido a ingresar_producto_terminado (proveedor O otra
// fábrica, nunca los dos; el precio solo de un proveedor; el cono solo con
// cono), lo que falta antes de mandar, el mismo client_uuid en los
// reintentos, un solo envío con dos toques, el error de la base tal cual, el
// lote vigente y el permiso (materia_prima:cargar o stock:ajustar_inventario
// con alcance, como la base). Las funciones se EJECUTAN.
//
//   node pruebas/test-produccion-ingreso.js
//   ARCHIVO_TEST=<copia de modulos/produccion-gestion.html> node pruebas/test-produccion-ingreso.js
'use strict'

const path = require('path')
const fs = require('fs')
const { construirCon } = require('./sandbox')
const { arnes, leer } = require('./circuito-comun')
const { fuenteNumeros } = require('./numeros-comun')

const ARCHIVO = process.env.ARCHIVO_GESTION || process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos', 'produccion-gestion.html')
leer(ARCHIVO)
const HTML = fs.readFileSync(ARCHIVO, 'utf8')
const { chk, fin } = arnes()

const PRELUDIO = `
  var console = { log(){}, warn(){}, error(){} }
  ${fuenteNumeros()}
  var __rpc = []
  var __respuesta = () => ({ data: { ingreso_id: 'ing-1', renglones: 1, cajas: 12, importe: 0 }, error: null })
  var __exitos = [], __errores = [], __pintados = 0, __stock = 0
  var supabase = { rpc(n, p) { __rpc.push([n, p]); return new Promise(r => setTimeout(() => r(__respuesta(n, p)), 0)) } }
  function mostrarExito(m) { __exitos.push(m) }
  function mostrarError(m) { __errores.push(m) }
  function pintarIngreso() { __pintados++ }
  async function mostrarStockTerminado() { __stock++ }
  var document = { getElementById: () => null }
  var estado = { miRolApp: 'usuario', unidades: new Map([['u-n', 'Nuss'], ['u-d', 'Dolce Pasta'], ['u-m', 'Mengui']]) }
`
const FUNCIONES = ['esc', 'textoPlano', 'normalizarBusqueda', 'puedeIngresarEn', 'unidadesDeIngreso', 'nuevoRenglonIngreso', 'nuevoIngreso',
  'elegirOrigenIngreso', 'soltarLoteDeOrigen', 'origenParaBase', 'presentacionDe', 'itemsParaBase', 'faltaIngreso', 'parametrosIngreso', 'normalizarLoteIngreso', 'modoLoteIngreso', 'loteDeRenglon', 'htmlLoteIngreso', 'contestarLoteIngreso',
  'textoListoIngreso', 'proveedoresQueCoinciden', 'opcionesIngreso', 'htmlRenglonIngreso', 'mostrarErrorIngreso', 'guardarIngreso']

function sandbox() {
  return construirCon(ARCHIVO, {
    preludio: PRELUDIO, funciones: FUNCIONES, constantes: ['TAREAS_INGRESO', 'LARGO_MAXIMO_LOTE', 'ORIGENES_INGRESO'],
    retorno: `TAREAS_INGRESO, estado, __rpc, __exitos, __errores, __stock: () => __stock, __setRespuesta(f){ __respuesta = f }`,
  })
}

const CAT = {
  productos: [{ id: 'p1', nombre: 'Capelina' }, { id: 'p2', nombre: 'Mini' }],
  presentaciones: [
    { id: 'pr1', producto_id: 'p1', nombre: 'Caja x 100', con_cono: false },
    { id: 'pr2', producto_id: 'p2', nombre: 'Con cono x 600', con_cono: true },
  ],
  marcas: [{ id: 'm1', nombre: 'LOLO' }],
  vigentes: new Map([['p1', 'L-77']]),
}
const esperar = () => new Promise(r => setTimeout(r, 5))

function armado(S, cambios = {}) {
  const ing = S.nuevoIngreso('u-n', '2026-10-14')
  ing.catalogo = CAT
  Object.assign(ing.renglones[0], { productoId: 'p1', presentacionId: 'pr1', cajas: 12, lote: 'L-77', loteVigente: 'L-77', loteResp: 'si' })
  Object.assign(ing, cambios)
  return ing
}

;(async () => {
  // ── Proveedor O otra fábrica, nunca los dos ─────────────────────────────
  {
    const S = sandbox()
    const ing = armado(S)
    S.elegirOrigenIngreso(ing, 'proveedor'); ing.proveedorId = 'prov-1'; ing.proveedorNombre = 'Rodrigo'
    let o = S.origenParaBase(ing)
    chk('proveedor: va el proveedor y la fábrica en null', o.p_proveedor_id === 'prov-1' && o.p_unidad_origen_id === null, JSON.stringify(o))
    S.elegirOrigenIngreso(ing, 'fabrica')
    chk('pasar a otra fábrica SUELTA el proveedor', ing.proveedorId === null && ing.proveedorNombre === '')
    ing.unidadOrigenId = 'u-m'
    o = S.origenParaBase(ing)
    chk('otra fábrica: va la fábrica y el proveedor en null', o.p_proveedor_id === null && o.p_unidad_origen_id === 'u-m', JSON.stringify(o))
    S.elegirOrigenIngreso(ing, 'proveedor')
    chk('volver a proveedor SUELTA la fábrica', ing.unidadOrigenId === '' && S.origenParaBase(ing).p_unidad_origen_id === null)
    S.elegirOrigenIngreso(ing, 'cualquier cosa')
    chk('un origen que no existe no cambia nada', ing.origen === 'proveedor')
    // Aunque el estado quedara con los dos cargados, a la base va uno solo.
    const sucio = { origen: 'proveedor', proveedorId: 'prov-1', unidadOrigenId: 'u-m' }
    o = S.origenParaBase(sucio)
    chk('con los dos cargados y origen proveedor: solo el proveedor', o.p_proveedor_id === 'prov-1' && o.p_unidad_origen_id === null, JSON.stringify(o))
    sucio.origen = 'fabrica'
    o = S.origenParaBase(sucio)
    chk('con los dos cargados y origen fábrica: solo la fábrica', o.p_proveedor_id === null && o.p_unidad_origen_id === 'u-m', JSON.stringify(o))
    const sin = S.origenParaBase(S.nuevoIngreso('u-n', '2026-10-14'))
    chk('sin elegir, los dos en null (y faltaIngreso lo frena)', sin.p_proveedor_id === null && sin.p_unidad_origen_id === null)
  }

  // ── El armado del pedido ───────────────────────────────────────────────
  {
    const S = sandbox()
    const ing = armado(S, { remito: '  R-0001-123 ', observaciones: '  ', origen: 'proveedor', proveedorId: 'prov-1' })
    ing.renglones[0].precio = 1500
    ing.renglones.push({ ...S.nuevoRenglonIngreso(), productoId: 'p2', presentacionId: 'pr2', marcaId: 'm1', cajas: 3, lote: '  ' })
    ing.renglones.push(S.nuevoRenglonIngreso())   // un renglón vacío no viaja
    const p = S.parametrosIngreso(ing, CAT)
    chk('las claves exactas de la base', JSON.stringify(Object.keys(p).sort()) === JSON.stringify(['p_client_uuid', 'p_fecha', 'p_items', 'p_observaciones', 'p_proveedor_id', 'p_remito', 'p_unidad_negocio_id', 'p_unidad_origen_id'].sort()), Object.keys(p).join(','))
    chk('la fábrica que recibe y la fecha', p.p_unidad_negocio_id === 'u-n' && p.p_fecha === '2026-10-14')
    chk('el remito sin espacios en los bordes; observaciones vacías = null', p.p_remito === 'R-0001-123' && p.p_observaciones === null)
    chk('el client_uuid es un uuid', /^[0-9a-f-]{36}$/.test(p.p_client_uuid), p.p_client_uuid)
    chk('dos renglones (el vacío no viaja)', p.p_items.length === 2, p.p_items.length)
    const [a, b] = p.p_items
    chk('renglón 1: presentación, sin cono, cajas, lote y precio', JSON.stringify(a) === JSON.stringify({ presentacion_id: 'pr1', marca_id: null, cajas: 12, lote: 'L-77', precio_caja: 1500 }), JSON.stringify(a))
    chk('renglón 2: el cono de una presentación con cono; lote vacío = null', b.marca_id === 'm1' && b.lote === null && b.precio_caja === null, JSON.stringify(b))
    chk('las claves de cada renglón', JSON.stringify(Object.keys(a)) === JSON.stringify(['presentacion_id', 'marca_id', 'cajas', 'lote', 'precio_caja']))
  }
  {
    const S = sandbox()
    const ing = armado(S, { origen: 'fabrica', unidadOrigenId: 'u-m' })
    ing.renglones[0].precio = 1500
    const p = S.parametrosIngreso(ing, CAT)
    chk('de otra fábrica el precio NO viaja (aunque haya quedado escrito)', p.p_items[0].precio_caja === null)
    chk('… y el proveedor tampoco', p.p_proveedor_id === null && p.p_unidad_origen_id === 'u-m')
  }
  {
    const S = sandbox()
    const ing = armado(S, { origen: 'proveedor', proveedorId: 'prov-1' })
    Object.assign(ing.renglones[0], { presentacionId: 'pr1', marcaId: 'm1' })
    chk('un cono en una presentación SIN cono no viaja', S.itemsParaBase(ing, CAT)[0].marca_id === null)
  }

  // ── Lo que falta ───────────────────────────────────────────────────────
  {
    const S = sandbox()
    const f = (c, r) => { const ing = armado(S, c); if (r) Object.assign(ing.renglones[0], r); return S.faltaIngreso(ing, CAT) }
    chk('sin origen', f({}) === 'Elegí de dónde viene: producción propia, un proveedor o una fábrica del grupo.', f({}))
    chk('proveedor sin elegir', f({ origen: 'proveedor' }) === 'Elegí el proveedor.')
    chk('fábrica sin elegir', f({ origen: 'fabrica' }) === 'Elegí la fábrica de donde viene.')
    chk('la fábrica de origen igual a la que recibe', f({ origen: 'fabrica', unidadOrigenId: 'u-n' }) === 'La fábrica de origen tiene que ser otra.')
    chk('todo bien: nada falta', f({ origen: 'proveedor', proveedorId: 'prov-1' }) === null)
    chk('sin cajas', /las cajas tienen que ser un número entero mayor que cero/.test(f({ origen: 'proveedor', proveedorId: 'p' }, { cajas: null }) ?? ''))
    chk('cero cajas', /mayor que cero/.test(f({ origen: 'proveedor', proveedorId: 'p' }, { cajas: 0 }) ?? ''))
    chk('cajas con decimales', /entero/.test(f({ origen: 'proveedor', proveedorId: 'p' }, { cajas: 2.5 }) ?? ''))
    chk('con cono y sin cono elegido', /elegí el cono/.test(f({ origen: 'proveedor', proveedorId: 'p' }, { productoId: 'p2', presentacionId: 'pr2', marcaId: '' }) ?? ''))
    chk('producto sin presentación', /elegí el producto y la presentación/.test(f({ origen: 'proveedor', proveedorId: 'p' }, { presentacionId: '' }) ?? ''))
    chk('precio negativo de un proveedor', /el precio no puede ser negativo/.test(f({ origen: 'proveedor', proveedorId: 'p' }, { precio: -1 }) ?? ''))
    chk('precio negativo que quedó de otra fábrica no frena (no viaja)', f({ origen: 'fabrica', unidadOrigenId: 'u-m' }, { precio: -1 }) === null)
    const vacio = S.nuevoIngreso('u-n', '2026-10-14'); vacio.origen = 'proveedor'; vacio.proveedorId = 'p'
    chk('sin ningún renglón usado', S.faltaIngreso(vacio, CAT) === 'Cargá al menos un producto.')
  }

  // ── Guardar: un envío, el mismo uuid, el error tal cual ─────────────────
  {
    const S = sandbox()
    const ing = armado(S, { origen: 'proveedor', proveedorId: 'prov-1' })
    S.estado.ing = ing
    const p1 = S.guardarIngreso(), p2 = S.guardarIngreso()
    await Promise.all([p1, p2]); await esperar()
    const llamadas = S.__rpc.filter(x => x[0] === 'ingresar_producto_terminado')
    chk('dos toques en Guardar: UNA sola llamada', llamadas.length === 1, llamadas.length)
    chk('"Listo: entraron 12 cajas."', S.__exitos[0] === 'Listo: entraron 12 cajas.', S.__exitos[0])
    chk('después vuelve al stock terminado (refrescado)', S.__stock() === 1 && S.estado.ing === null)
    chk('… de la fábrica que recibió', S.estado.stockUnidad === 'u-n')
  }
  {
    const S = sandbox()
    const ing = armado(S, { origen: 'proveedor', proveedorId: 'prov-1' })
    S.estado.ing = ing
    S.__setRespuesta(() => ({ data: null, error: { message: 'Renglón 1: ese producto es de otra fábrica.', code: 'P0001' } }))
    await S.guardarIngreso()
    chk('el error de la base tal cual, sin código', ing.error === 'Renglón 1: ese producto es de otra fábrica.', ing.error)
    chk('… y el formulario sigue (no vuelve al stock)', S.__stock() === 0 && S.estado.ing === ing && ing.enviando === false)
    S.__setRespuesta(() => ({ data: null, error: { message: 'TypeError: Failed to fetch' } }))
    await S.guardarIngreso()
    chk('sin conexión: lo dice y que se puede volver a tocar sin duplicar', /revisá la conexión/.test(ing.error) && /no se carga dos veces/.test(ing.error), ing.error)
    S.__setRespuesta(() => ({ data: { ingreso_id: 'ing-1', reintento: true }, error: null }))
    await S.guardarIngreso()
    const uuids = S.__rpc.filter(x => x[0] === 'ingresar_producto_terminado').map(x => x[1].p_client_uuid)
    chk('los reintentos mandan el MISMO client_uuid', uuids.length === 3 && new Set(uuids).size === 1, JSON.stringify(uuids))
    chk('un reintento que ya estaba cargado lo dice', /ya estaba cargado/.test(S.__exitos[0] ?? ''), S.__exitos[0])
  }
  {
    const S = sandbox()
    const ing = armado(S, {})
    S.estado.ing = ing
    await S.guardarIngreso()
    chk('con algo faltante NO llama a la base y dice qué falta', S.__rpc.length === 0 && /Elegí de dónde viene/.test(ing.error))
    const a = S.nuevoIngreso('u-n', '2026-10-14'), b = S.nuevoIngreso('u-n', '2026-10-14')
    chk('cada formulario nuevo tiene su propio uuid', a.clientUuid !== b.clientUuid)
  }

  // ── El lote: "¿Sigue siendo este?" (21/10/2026) ─────────────────────────
  {
    const S = sandbox()
    const r = { ...S.nuevoRenglonIngreso() }
    chk('sin producto: sin-producto', S.modoLoteIngreso(r) === 'sin-producto')
    Object.assign(r, { productoId: 'p1', loteVigente: 'L-77' })
    chk('con vigente y sin contestar: pregunta', S.modoLoteIngreso(r) === 'pregunta')
    const hp = S.htmlLoteIngreso(r)
    chk('la pregunta dice el último lote', /Último lote: <strong>L-77<\/strong>\. ¿Sigue siendo este\?/.test(hp), hp)
    chk('… con los botones Sí y "No, es otro"', /data-ing-lote="si"[^>]*>Sí</.test(hp) && /data-ing-lote="otro"[^>]*>No, es otro</.test(hp))
    chk('… y sin el campo hasta contestar', !/data-ing-campo="lote"/.test(hp))
    r.loteResp = 'si'
    chk('Sí: el lote es el vigente', S.modoLoteIngreso(r) === 'si' && S.loteDeRenglon(r) === 'L-77')
    const hs = S.htmlLoteIngreso(r)
    chk('Sí: el campo de solo lectura con el vigente', /data-ing-campo="lote"[^>]*value="L-77"[^>]* readonly/.test(hs), hs)
    chk('Sí: el botón Sí queda marcado', /data-ing-lote="si" aria-pressed="true"/.test(hs) && /data-ing-lote="otro" aria-pressed="false"/.test(hs))
    r.loteResp = 'otro'; r.lote = ''
    const ho = S.htmlLoteIngreso(r)
    chk('No, es otro: el campo editable, obligatorio y vacío', /data-ing-campo="lote"[^>]*value=""[^>]* required/.test(ho) && !/readonly/.test(ho), ho)
    chk('… con largo máximo 40', /maxlength="40"/.test(ho))
    chk('"No, es otro" queda marcado', /data-ing-lote="otro" aria-pressed="true"/.test(ho))
    r.loteVigente = ''; r.loteResp = ''
    chk('sin vigente: se escribe directamente', S.modoLoteIngreso(r) === 'otro')
    const hv = S.htmlLoteIngreso(r)
    chk('sin vigente: sin pregunta y con el campo obligatorio', !/Último lote/.test(hv) && /required/.test(hv))
    const hn = S.htmlLoteIngreso({ ...S.nuevoRenglonIngreso() })
    chk('sin producto: el campo apagado', /disabled/.test(hn) && /Primero el producto/.test(hn))
    const ing = armado(S)
    Object.assign(ing.renglones[0], { loteResp: '' })
    chk('el renglón dibuja la pregunta del lote', /¿Sigue siendo este\?/.test(S.htmlRenglonIngreso(ing.renglones[0], 0, ing)))
  }
  {
    const S = sandbox()
    const ing = armado(S, { origen: 'proveedor', proveedorId: 'prov-1' })
    const r = ing.renglones[0]
    S.contestarLoteIngreso(ing, r, 'otro')
    chk('contestar "No, es otro" vacía el lote', r.loteResp === 'otro' && r.lote === '')
    chk('"No, es otro" y sin escribir NO se puede guardar', S.faltaIngreso(ing, CAT) === 'Renglón 1: escribí el lote.', S.faltaIngreso(ing, CAT))
    r.lote = '   '
    chk('… solo espacios tampoco', S.faltaIngreso(ing, CAT) === 'Renglón 1: escribí el lote.')
    r.lote = '  l-90 b '
    chk('escrito: se puede guardar', S.faltaIngreso(ing, CAT) === null)
    chk('el lote viaja en mayúsculas y sin espacios en los bordes', S.itemsParaBase(ing, CAT)[0].lote === 'L-90 B', S.itemsParaBase(ing, CAT)[0].lote)
    r.lote = 'x'.repeat(41)
    chk('más de 40 caracteres no se guarda', /40 caracteres como mucho/.test(S.faltaIngreso(ing, CAT) ?? ''), S.faltaIngreso(ing, CAT))
    r.lote = 'x'.repeat(40)
    chk('40 caracteres sí', S.faltaIngreso(ing, CAT) === null)
    r.lote = '  ' + 'x'.repeat(40) + '  '
    chk('40 caracteres con espacios en los bordes también (se recortan)', S.faltaIngreso(ing, CAT) === null)
    S.contestarLoteIngreso(ing, r, 'si')
    chk('contestar Sí pone el vigente', r.loteResp === 'si' && r.lote === 'L-77' && S.itemsParaBase(ing, CAT)[0].lote === 'L-77')
    S.contestarLoteIngreso(ing, r, 'cualquiera')
    chk('una respuesta que no existe no cambia nada', r.loteResp === 'si')
    // Sí con algo escrito antes: viaja el vigente, no lo escrito.
    r.lote = 'OTRO'
    chk('con Sí viaja el vigente aunque quede algo escrito', S.itemsParaBase(ing, CAT)[0].lote === 'L-77')
    r.loteResp = ''
    chk('con vigente y sin contestar NO se puede guardar', S.faltaIngreso(ing, CAT) === 'Renglón 1: contestá si el lote sigue siendo L-77.', S.faltaIngreso(ing, CAT))
    // Sin vigente: el lote es obligatorio directamente.
    Object.assign(r, { loteVigente: '', loteResp: '', lote: '' })
    chk('sin vigente y sin lote NO se puede guardar', S.faltaIngreso(ing, CAT) === 'Renglón 1: escribí el lote.')
    S.contestarLoteIngreso(ing, r, 'si')
    chk('sin vigente, "Sí" no hace nada', r.loteResp === '')
    // El segundo renglón también se controla.
    Object.assign(r, { lote: 'A1' })
    ing.renglones.push({ ...S.nuevoRenglonIngreso(), productoId: 'p1', presentacionId: 'pr1', cajas: 2, loteVigente: 'L-77' })
    chk('cada renglón tiene su pregunta', S.faltaIngreso(ing, CAT) === 'Renglón 2: contestá si el lote sigue siendo L-77.', S.faltaIngreso(ing, CAT))
  }
  {
    // Guardar: una sola llamada (ingresar_producto_terminado) y NUNCA
    // guardar_lote_vigente: el vigente lo guarda la base sola.
    const S = sandbox()
    const ing = armado(S, { origen: 'proveedor', proveedorId: 'prov-1' })
    Object.assign(ing.renglones[0], { loteResp: 'otro', lote: 'l-90' })
    S.estado.ing = ing
    await S.guardarIngreso()
    chk('ya no se llama a guardar_lote_vigente', !S.__rpc.some(x => x[0] === 'guardar_lote_vigente'), JSON.stringify(S.__rpc.map(x => x[0])))
    chk('una sola llamada a la base', S.__rpc.length === 1 && S.__rpc[0][0] === 'ingresar_producto_terminado')
    chk('el lote nuevo viaja en el renglón', S.__rpc[0][1].p_items[0].lote === 'L-90')
    chk('"Listo" sin hablar del lote vigente', S.__exitos.length === 1 && !/lote vigente/.test(S.__exitos[0]) && S.__errores.length === 0)
    const S2 = sandbox()
    const ing2 = armado(S2, { origen: 'proveedor', proveedorId: 'prov-1' })
    ing2.renglones[0].loteResp = ''
    S2.estado.ing = ing2
    await S2.guardarIngreso()
    chk('sin contestar la pregunta no llama a la base', S2.__rpc.length === 0 && /contestá si el lote/.test(ing2.error))
  }
  chk('el HTML ya no tiene el tilde "Guardar como lote vigente"', !/Guardar como lote vigente/.test(HTML) && !/data-ing-tilde/.test(HTML) && !/guardarVigente/.test(HTML))
  chk('el HTML ya no llama a guardar_lote_vigente', !/rpc\('guardar_lote_vigente'/.test(HTML))
  chk('ni el mensaje "no se pudo guardar el lote vigente"', !/no se pudo guardar el lote vigente/i.test(HTML))
  chk('al elegir producto el lote se pregunta de nuevo', /r\.lote = ''; r\.loteResp = ''/.test(HTML))
  chk('el lote se pasa a mayúsculas al escribir', /const may = String\(t\.value\)\.toUpperCase\(\)/.test(HTML))

  // ── El permiso ─────────────────────────────────────────────────────────
  {
    const S = sandbox()
    S.estado.ingresoAlcances = new Map([['materia_prima:cargar', { unidades: ['u-n'] }]])
    chk('materia_prima:cargar en Nuss: solo Nuss', JSON.stringify(S.unidadesDeIngreso()) === '["u-n"]')
    S.estado.ingresoAlcances = new Map([['stock:ajustar_inventario', { todas: true }]])
    chk('stock:ajustar_inventario en todas: todas (la base acepta las dos)', S.unidadesDeIngreso().length === 3)
    S.estado.ingresoAlcances = new Map()
    chk('sin ninguna: ninguna (el botón no aparece)', S.unidadesDeIngreso().length === 0)
    S.estado.ingresoAlcances = undefined
    chk('sin poder leer el permiso: ninguna', S.unidadesDeIngreso().length === 0)
    S.estado.miRolApp = 'super_admin'
    chk('super_admin: todas', S.unidadesDeIngreso().length === 3)
    chk('las dos tareas que acepta la base', JSON.stringify(S.TAREAS_INGRESO) === '["materia_prima:cargar","stock:ajustar_inventario"]')
  }

  // ── Proveedores y escapado ─────────────────────────────────────────────
  {
    const S = sandbox()
    const provs = [{ id: 'a', razon_social: 'RODRIGO CAPELINAS SRL', cuit: '30712345678' }, { id: 'b', razon_social: 'Panadería Ñandú', nombre_fantasia: 'Ñandú' }]
    chk('busca sin acentos ni mayúsculas', S.proveedoresQueCoinciden(provs, 'panaderia').length === 1)
    chk('busca por CUIT', S.proveedoresQueCoinciden(provs, '3071234').length === 1)
    chk('sin escribir no lista nada', S.proveedoresQueCoinciden(provs, '  ').length === 0)
    const malo = '<img src=x onerror=alert(1)>'
    const ing = armado(S, { origen: 'proveedor', proveedorId: 'p' })
    ing.catalogo = { ...CAT, productos: [{ id: 'p1', nombre: malo }], presentaciones: [{ id: 'pr1', producto_id: 'p1', nombre: malo, con_cono: true }], marcas: [{ id: 'm1', nombre: malo }, { id: '"><img src=x>', nombre: 'Otro' }] }
    Object.assign(ing.renglones[0], { lote: '"><b>', loteVigente: malo, presentacionId: 'pr1' })
    const h = S.htmlRenglonIngreso(ing.renglones[0], 0, ing)
    chk('el renglón escapa nombres, cono, lote y lote vigente', !h.includes('<img') && !h.includes('"><b>') && h.includes('&lt;img'), h.slice(0, 200))
    chk('el precio se ve solo de un proveedor', /data-ing-campo="precio"/.test(h))
    ing.origen = 'fabrica'
    chk('… y de otra fábrica no', !/data-ing-campo="precio"/.test(S.htmlRenglonIngreso(ing.renglones[0], 0, ing)))
  }

  // ── El HTML ────────────────────────────────────────────────────────────
  chk('el botón "Cargar ingreso" en el stock terminado, escondido de entrada', /<button type="button" class="pr-btn pr-btn--primario pr-ing__abrir" id="pr-stock-ingresar" hidden>Cargar ingreso<\/button>/.test(HTML))
  chk('la sección del ingreso es una vista', /const VISTAS = \[[^\]]*'pr-ingreso'/.test(HTML) && /<section id="pr-ingreso" class="pr-of pr-ing" hidden>/.test(HTML))
  chk('el botón se pinta al mostrar el stock', /pintarSelectorUnidad\('pr-stock-unidad', unidades, estado\.stockUnidad\)\s*pintarBotonIngreso\(\)/.test(HTML))
  chk('el permiso se lee al entrar', /await cargarPermisoRetiros\(\)\s*await cargarPermisoIngreso\(\)/.test(HTML))
  chk('los campos del ingreso en 16 px (sin zoom en el celular)', /\.pr-ing \.pr-input, \.pr-ing \.pr-select, \.pr-ing \.pr-textarea \{ font-size: 16px;/.test(HTML))
  chk('las cajas se leen como entero', /enlazarCampoNumero\(cajas, \{ decimales: 0 \}\)/.test(HTML))
  chk('la tablet no se tocó (produccion.html no tiene el ingreso)', !/ingresar_producto_terminado/.test(fs.readFileSync(path.join(__dirname, '..', 'modulos', 'produccion.html'), 'utf8')))

  fin()
})().catch(e => { console.error(e); process.exit(1) })
