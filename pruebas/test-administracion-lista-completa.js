// ADMINISTRACIÓN — La grilla COMPLETA de una lista de precios (30/09/2026).
//
// lista_completa(p_lista_id, p_fecha) → jsonb (SECURITY DEFINER, retiros:precios
// en la fábrica de la lista; leída con pg_get_functiondef el 01/10/2026):
//   { lista, productos: [{producto_id, producto, tipo_masa, reventa,
//       sin_cono: precio_venta(...) | null, con_cono: precio_venta(...) | null}],
//     conito: {comun_suelto, comun_colocado, ilustracion_suelto, ilustracion_colocado} }
//
// Un producto es UNA fila con dos columnas, como el Excel de Facu: SIN cono
// (lo que se guarda con guardar_precios, en la presentación sin cono que no es
// media caja) y CON cono (calculado: solo lectura). Al pie, los cuatro precios
// del conito, en solo lectura: ninguna RPC guarda precios_conito. Una lista
// que sale de otra (base_id) no edita sus precios sin cono. "Aumentar todo" y
// el importador siguen la misma regla.
//
//   node pruebas/test-administracion-lista-completa.js

const path = require('path')
const fs = require('fs')
const { construirAdministracion } = require('./sandbox-administracion')
const { arnes, marca, chequearMarcas } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/administracion.html')
const src = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${src.length} bytes)`)
const { chk, esperas, fin } = arnes()
const nuevo = () => construirAdministracion(ARCHIVO)

const CAT = {
  productos: [
    { id: 'p1', nombre: 'Cucurucho grande', tipo_masa: 'Común', categoria: 'cucuruchones' },
    { id: 'p2', nombre: 'Cucurucho chico', tipo_masa: 'Común', categoria: 'cucuruchones' },
    { id: 'p4', nombre: 'Solo con cono', tipo_masa: 'Común', categoria: 'cucuruchones' },
  ],
  presentaciones: [
    // La media caja sin cono va PRIMERA a propósito: no tiene que ser la del precio.
    { id: 'pr1m', producto_id: 'p1', nombre: 'Media caja', con_cono: false, media_caja: true, unidades_por_caja: 50, activa: true, orden: 0 },
    { id: 'pr1', producto_id: 'p1', nombre: 'Caja x 100', con_cono: false, media_caja: false, unidades_por_caja: 100, activa: true, orden: 1 },
    { id: 'pr1cm', producto_id: 'p1', nombre: 'Media con cono', con_cono: true, media_caja: true, unidades_por_caja: 50, activa: true, orden: 2 },
    { id: 'pr1c', producto_id: 'p1', nombre: 'Caja x 100 con cono', con_cono: true, media_caja: false, unidades_por_caja: 100, activa: true, orden: 3 },
    { id: 'pr2', producto_id: 'p2', nombre: 'Caja x 320', con_cono: false, media_caja: false, unidades_por_caja: 320, activa: true, orden: 1 },
    { id: 'pr4c', producto_id: 'p4', nombre: 'Caja con cono', con_cono: true, media_caja: false, unidades_por_caja: 60, activa: true, orden: 1 },
  ],
  marcas: [],
  insumos: [{ id: 'i1', nombre: 'Harina 000', marca: 'Molino', unidad_medida: 'kg', activo: true }],
}
const PRECIOS = [
  { presentacion_id: 'pr1', precio_caja: 3000, precio_unitario: 30, vigente_desde: '2026-09-01', cargado_en: '2026-09-01T10:00:00Z' },
  { presentacion_id: null, insumo_id: 'i1', precio_caja: 120, vigente_desde: '2026-09-01', cargado_en: '2026-09-01T10:00:00Z' },
]
const COMPLETA = {
  lista: 'Mayoristas',
  productos: [
    { producto_id: 'p1', producto: 'Cucurucho grande', tipo_masa: 'Común', reventa: false,
      sin_cono: { precio_unitario: 30, precio_caja: 3000, unidades_por_caja: 100, producto_unitario: 30, conito_unitario: 0, sin_precio: false },
      con_cono: { precio_unitario: 38.5, precio_caja: 3850, unidades_por_caja: 100, producto_unitario: 30, conito_unitario: 8.5, papel_conito: 'comun', sin_precio: false } },
    { producto_id: 'p2', producto: 'Cucurucho chico', tipo_masa: 'Común', reventa: false,
      sin_cono: { sin_precio: true, motivo: 'El producto no tiene precio en la lista base.' }, con_cono: null },
  ],
  conito: { comun_suelto: 7.25, comun_colocado: 8.5, ilustracion_suelto: 11.5, ilustracion_colocado: null },
}
const LISTAS = [
  { id: 'l1', nombre: 'Mayoristas', moneda: 'ARS', activa: true, es_base: true },
  { id: 'l2', nombre: 'Minoristas', moneda: 'ARS', activa: true, base_id: 'l1', recargo_pct: 10 },
]

function preparar(S, { completa = COMPLETA, error = null } = {}) {
  S.estado.clientes = []
  S.estado.catalogo = CAT
  S.estado.catalogoEmpresa = 'u-n'
  S.__tablas.listas_precios = LISTAS
  S.__tablas.lista_precios_items = PRECIOS
  S.__setRpc(async (n) => n === 'lista_completa'
    ? (error ? { data: null, error: { message: error } } : { data: completa, error: null })
    : { data: null, error: null })
}
const grilla = (S) => S.__els.get('ad-lista-grilla').innerHTML
const fila = (h, clave) => {
  const i = h.indexOf(`data-fila-precio="${clave}"`)
  if (i < 0) return ''
  const j = h.indexOf('data-fila-precio="', i + 10)
  return h.slice(i, j < 0 ? undefined : j)
}

// ── Las filas: una por producto ────────────────────────────────────────────
{
  const S = nuevo()
  const filas = S.filasGrilla(CAT)
  chk('una fila por producto con su presentación SIN cono que no es media caja', filas[0].clave === 'pr1' && filas[0].presentacionId === 'pr1' && filas[0].upcSin === 100, filas[0])
  chk('la columna con cono es la caja entera con cono, no la media', filas[0].conCono?.nombre === 'Caja x 100 con cono', filas[0].conCono)
  chk('un producto sin presentación sin cono no se pierde: clave "prod:" y sin presentación', filas.some(f => f.clave === 'prod:p4' && f.presentacionId === null && f.conCono?.nombre === 'Caja con cono'))
  chk('las cajas con cono y la media caja no son filas', !filas.some(f => ['pr1c', 'pr1m', 'pr1cm', 'pr4c'].includes(f.clave)))
  chk('el insumo sigue al final', filas[filas.length - 1].clave === 'ins:i1')
}

// ── lista_completa: con cono y conito ──────────────────────────────────────
{
  const S = nuevo()
  preparar(S)
  esperas.push(S.abrirLista('l1').then(() => {
    const p = S.__llamadas.rpc.find(x => x[0] === 'lista_completa')?.[1]
    chk('se pide lista_completa con la lista y sin fecha (la de hoy)', p && p.p_lista_id === 'l1' && p.p_fecha === null, p)
    const h = grilla(S)
    const f1 = fila(h, 'pr1')
    chk('la fila dice "Sin cono" y "Con cono · <presentación>"', /Sin cono</.test(f1) && /Con cono · Caja x 100 con cono/.test(f1))
    chk('sin cono: la caja vigente con su fecha y el precio por unidad', /\$\s3\.000,00 la caja desde 01\/09\/2026 · \$ 30,00 c\/u/.test(f1), f1)
    chk('con cono: la caja de lista_completa', /\$\s3\.850,00 la caja · \$ 38,50 c\/u/.test(f1), f1)
    chk('y de dónde sale: producto + conito', /producto \$ 30,00 \+ conito \$ 8,50/.test(f1), f1)
    chk('la fila sin cono es editable', /data-precio-lista="pr1"/.test(f1) && /data-historial="pr1"/.test(f1))
    chk('NINGUNA caja con cono tiene campo (se calcula)', !/data-precio-lista="pr1c"/.test(h))
    const f2 = fila(h, 'pr2')
    chk('un producto sin con cono lo dice', /No se vende con cono\./.test(f2))
    const f4 = fila(h, 'prod:p4')
    chk('un producto sin presentación sin cono: no se le puede poner precio, y sin campo', /no se le puede poner precio/.test(f4) && !/data-precio-lista/.test(f4), f4)
    chk('si lista_completa no trae el producto, el con cono es "—"', /Con cono · Caja con cono<\/span><span class="ad-precio__valor">—</.test(f4), f4)
    chk('al pie, el conito con sus cuatro precios por unidad', /Conito \(por unidad\)/.test(h) && /Común suelto/.test(h) && /\$ 7,25/.test(h) && /Común colocado/.test(h) && /\$ 8,50/.test(h) && /Con ilustración suelto/.test(h) && /\$ 11,50/.test(h))
    chk('un conito sin precio es "—", nunca "$ 0"', /Con ilustración colocado<\/span><span class="ad-precio__valor">—</.test(h), h.slice(h.indexOf('Con ilustración colocado'), h.indexOf('Con ilustración colocado') + 120))
    chk('y dice que el conito no se puede cambiar desde acá', /El conito todavía no se puede cambiar desde acá/.test(h))
    chk('el conito no tiene campos', !/data-precio-lista="[^"]*conito/.test(h))
    chk('ningún "$ 0" inventado en la grilla', !/\$\s0,00/.test(h))
  }))
}
{
  const S = nuevo()
  preparar(S)
  esperas.push(S.abrirLista('l1').then(() => {
    const l = S.estado.lista
    chk('sin precio nuevo, la línea del con cono nuevo está vacía y escondida', S.textoConConoNuevo(l.filas[0], l) === '' && /data-con-nuevo="pr1" hidden/.test(fila(grilla(S), 'pr1')))
    S.cambiarPrecioLista('pr1', 3300)
    chk('con un precio sin cono nuevo, dice cómo queda la caja con cono', /^Con el precio nuevo: \$\s4\.150,00 la caja$/.test(S.textoConConoNuevo(l.filas[0], l)), S.textoConConoNuevo(l.filas[0], l))
    const f1 = fila(S.htmlGrilla(l, S.hoyArgentina()), 'pr1')
    chk('y la fila redibujada lo muestra', /data-con-nuevo="pr1">Con el precio nuevo: \$\s4\.150,00 la caja</.test(f1), f1)
    // Mientras se escribe, la línea se actualiza en su lugar (sin redibujar la grilla).
    const span = { dataset: { conNuevo: 'pr1' }, textContent: '', hidden: true }
    S.pintarConConoNuevo({ querySelectorAll: () => [span] }, l)
    chk('pintarConConoNuevo la escribe en su lugar y la muestra', /4\.150,00/.test(span.textContent) && span.hidden === false, span)
    S.cambiarPrecioLista('pr1', null)
    S.pintarConConoNuevo({ querySelectorAll: () => [span] }, l)
    chk('y al borrar el precio la vacía y la esconde', span.textContent === '' && span.hidden === true)
    chk('pintarLista la actualiza en cada repintado (también al escribir)', /\n      pintarConConoNuevo\(grilla, l\)\n/.test(src))
    S.cambiarPrecioLista('pr1', 3300)
    chk('la cuenta: 3300/100 + 8,5 por 100', S.conConoConPrecioNuevo(S.estado.lista.filas[0], LISTAS[0], COMPLETA.productos[0].con_cono, 3300) === 4150)
    chk('con recargo, la cuenta lo suma al producto (no al conito)', S.conConoConPrecioNuevo({ upcSin: 100 }, { recargo_pct: 10 }, { unidades_por_caja: 100, conito_unitario: 8.5 }, 3000) === 4150)
    chk('sin conito conocido no se calcula (null, no un número inventado)', S.conConoConPrecioNuevo({ upcSin: 100 }, LISTAS[0], { unidades_por_caja: 100, conito_unitario: null }, 3000) === null)
    chk('sin unidades por caja tampoco', S.conConoConPrecioNuevo({ upcSin: null }, LISTAS[0], { unidades_por_caja: 100, conito_unitario: 8.5 }, 3000) === null)
  }))
}

// ── Sin lista_completa: lo sin cono se carga igual ─────────────────────────
{
  const S = nuevo()
  preparar(S, { error: 'No tenés permiso para ver precios.' })
  esperas.push(S.abrirLista('l1').then(() => {
    const h = grilla(S)
    chk('si lista_completa falla, se dice con el mensaje de la base', /No se pudo leer la lista completa \(los precios con cono y el conito\): No tenés permiso para ver precios\./.test(h), h.slice(0, 400))
    chk('y lo sin cono se puede cargar igual', /data-precio-lista="pr1"/.test(h) && /data-precio-lista="ins:i1"/.test(h))
    chk('la grilla no queda en "Cargando…"', !/Cargando…/.test(h) && !S.estado.lista.error)
    chk('el conito no se dibuja (no se sabe)', !/Conito \(por unidad\)/.test(h))
  }))
}

// ── Una lista que sale de otra ─────────────────────────────────────────────
{
  const S = nuevo()
  preparar(S, { completa: { ...COMPLETA, productos: [{ ...COMPLETA.productos[0],
    sin_cono: { precio_unitario: 33, precio_caja: 3300, unidades_por_caja: 100, producto_unitario: 33, conito_unitario: 0, sin_precio: false } }] } })
  esperas.push(S.abrirLista('l2').then(() => {
    const h = grilla(S)
    chk('una lista que sale de otra lo dice, con su base y su recargo', /Esta lista sale de «Mayoristas» con un recargo de 10 %/.test(h), h.slice(0, 300))
    chk('sus precios sin cono se ven con el recargo (de lista_completa)', /\$\s3\.300,00 la caja · \$ 33,00 c\/u/.test(fila(h, 'pr1')), fila(h, 'pr1'))
    chk('y no tienen campo', !/data-precio-lista="pr1"/.test(h) && !/data-precio-lista="pr2"/.test(h))
    chk('los insumos sí', /data-precio-lista="ins:i1"/.test(h))
    chk('un producto que lista_completa no trae: "—"', /Sin cono<\/span><span class="ad-precio__valor">—</.test(fila(h, 'pr2')), fila(h, 'pr2'))
    S.cambiarPrecioLista('pr1', 5000)
    S.cambiarPrecioLista('ins:i1', 130)
    chk('un precio de producto escrito igual NO se guarda en una lista derivada', JSON.stringify(S.preciosAGuardar(S.estado.lista, S.hoyArgentina())) === JSON.stringify([{ insumo_id: 'i1', precio_caja: 130 }]))
    const nuevos = S.calcularAumento(S.estado.lista, 10, S.hoyArgentina())
    chk('"Aumentar todo" en una lista derivada solo sube los insumos', nuevos.get('ins:i1') === 132 && nuevos.get('pr1') === 5000 && !nuevos.has('pr2'))
    chk('en una fila de solo lectura no aparece "Con el precio nuevo"', S.textoConConoNuevo(S.estado.lista.filas[0], S.estado.lista) === '')
  }))
}
{
  // precio_venta() lee el precio de coalesce(base_id, id) SIN mirar es_base:
  // con base_id es derivada aunque diga es_base (que solo pone el recargo en 0).
  const S = nuevo()
  chk('con base_id es derivada aunque es_base diga true', S.listaDerivada({ id: 'l5', base_id: 'l1', es_base: true }) === true)
  chk('sin base_id no es derivada', S.listaDerivada({ id: 'l1', es_base: false, recargo_pct: 10 }) === false)
  chk('un base_id que apunta a sí misma no es derivada', S.listaDerivada({ id: 'l1', base_id: 'l1' }) === false)
  chk('el recargo de una lista base es 0', S.recargoDeLista({ es_base: true, recargo_pct: 10 }) === 0 && S.recargoDeLista({ es_base: false, recargo_pct: 10 }) === 10 && S.recargoDeLista({}) === 0)
  S.estado.listas = { unidad: 'u-n', filas: [...LISTAS, { id: 'l5', nombre: 'Rara', moneda: 'ARS', activa: true, base_id: 'l1', es_base: true, recargo_pct: 7 }] }
  const h = S.htmlGrilla({ id: 'l5', precios: [], filas: S.filasGrilla(CAT), pendientes: new Map(), completa: null }, '2026-09-26')
  chk('el aviso dice el recargo que aplica la base (0 si es_base)', /sale de «Mayoristas» con un recargo de 0 %/.test(h), h.slice(0, 300))
}

// ── Aumentar todo en la lista base ─────────────────────────────────────────
{
  const S = nuevo()
  preparar(S)
  esperas.push(S.abrirLista('l1').then(() => {
    const nuevos = S.calcularAumento(S.estado.lista, 10, S.hoyArgentina())
    chk('"Aumentar todo" sube el sin cono de cada producto y los insumos', nuevos.get('pr1') === 3300 && nuevos.get('ins:i1') === 132)
    chk('y nunca una caja con cono ni un producto sin presentación sin cono', !nuevos.has('pr1c') && !nuevos.has('prod:p4'))
    S.estado.lista.pendientes = nuevos
    chk('el con cono se recalcula en la grilla', /Con el precio nuevo: \$\s4\.150,00 la caja/.test(fila(S.htmlGrilla(S.estado.lista, S.hoyArgentina()), 'pr1')))
  }))
}

// ── La misma fecha: la base no lo corrige ──────────────────────────────────
{
  const S = nuevo()
  preparar(S)
  esperas.push(S.abrirLista('l1').then(async () => {
    S.cambiarPrecioLista('pr1', 3300)
    S.__els.get('ad-lista-desde').value = '2026-09-01'
    S.pedirGuardarPrecios()
    chk('guardar con la MISMA fecha de un precio por unidad cargado se frena antes de mandar', S.estado.lista.confirmar === null && /Ya hay un precio cargado desde el 01\/09\/2026 para Cucurucho grande/.test(S.estado.lista.errorPorcentaje ?? ''), S.estado.lista.errorPorcentaje)
    chk('y no llama a guardar_precios', !S.__llamadas.rpc.some(x => x[0] === 'guardar_precios'))
    S.__els.get('ad-lista-desde').value = '2026-10-01'
    S.pedirGuardarPrecios()
    chk('con otra fecha sí pide confirmar', S.estado.lista.confirmar && S.estado.lista.confirmar.desde === '2026-10-01')
    chk('un precio de la misma fecha SIN precio por unidad no choca', S.chocanMismaFecha([{ presentacion_id: 'pr1', vigente_desde: '2026-09-01', precio_unitario: null }], [{ presentacion_id: 'pr1', precio_caja: 1 }], '2026-09-01', () => 'x').length === 0)
    chk('un insumo nunca choca (no tiene precio por unidad)', S.chocanMismaFecha(PRECIOS, [{ insumo_id: 'i1', precio_caja: 1 }], '2026-09-01', () => 'x').length === 0)
    chk('el texto corta en cuatro nombres', /a, b, c, d y 2 más/.test(S.textoChoqueMismaFecha(['a', 'b', 'c', 'd', 'e', 'f'], '2026-09-01')))
  }))
}

// ── El importador de precios ───────────────────────────────────────────────
{
  const S = nuevo()
  const filasG = S.filasGrilla(CAT)
  const pl = S.plantillaPrecios(filasG, PRECIOS, '2026-09-26', COMPLETA)
  chk('la plantilla trae el con cono de hoy, de referencia', pl[1][0] === 'pr1' && pl[1][6] === 3850, pl[1])
  chk('un producto sin con cono deja esa columna vacía', pl.find(f => f[0] === 'pr2')[6] === '')
  chk('un producto sin presentación sin cono no va a la plantilla', !pl.some(f => f[0] === 'prod:p4'))
  chk('sin lista_completa, la columna va vacía (nunca 0)', S.plantillaPrecios(filasG, PRECIOS, '2026-09-26', null)[1][6] === '')
  const hc = S.plantillaConito(COMPLETA)
  chk('la hoja del conito: los cuatro, por unidad, y dice que no se importa', hc[0][0] === 'Conito, por unidad (no se importa)' && hc.length === 5 && hc[1][0] === 'Común suelto' && hc[1][1] === 7.25 && hc[4][1] === '')
  const enc = pl[0]
  const r = S.validarPrecios([enc, ['pr1', '', '', '', '', '', '', '3300'], ['ins:i1', '', '', '', '', '', '', '130'], ['prod:p4', '', '', '', '', '', '', '10']],
    { filas: filasG, precios: PRECIOS, hoy: '2026-09-26', derivada: true })
  const f = (c) => r.filas.find(x => x.codigo === c)
  chk('en una lista derivada, el precio de un producto es un error', f('pr1').estado === 'error' && f('pr1').errores.some(e => /sale de otra con un recargo/.test(e)), f('pr1').errores)
  chk('el de un insumo no', f('ins:i1').estado === 'ok')
  chk('un código "prod:" no es una fila que se pueda guardar', f('prod:p4').estado === 'error')
  const r2 = S.validarPrecios([enc, ['pr1', '', '', '', '', '', '3850', '3300']], { filas: filasG, precios: PRECIOS, hoy: '2026-09-26', derivada: false })
  chk('en la lista base el producto se importa, y la columna con cono se ignora', r2.filas[0].estado === 'ok' && r2.filas[0].datos?.presentacion_id === 'pr1' && r2.filas[0].datos?.precio_caja === 3300, r2.filas[0])
}

// ── El importador, de punta a punta ────────────────────────────────────────
{
  const S = nuevo()
  preparar(S)
  S.estado.misTareas = new Map([['retiros:ver', { unidades: ['u-n'] }], ['retiros:precios', { unidades: ['u-n'] }]])
  S.estado.listas = { unidad: 'u-n', filas: LISTAS }
  const enc = S.plantillaPrecios(S.filasGrilla(CAT), PRECIOS, '2026-09-26', null)[0]
  S.estado.importar = { ...S.importarVacio('precios'), listaId: 'l2', desde: '2026-10-01' }
  esperas.push(S.procesarFilasImportar([enc, ['pr1', '', '', '', '', '', '', '3.300'], ['ins:i1', '', '', '', '', '', '', '130']], 'p.xlsx').then(async () => {
    const im = S.estado.importar
    const f = (c) => (im.filas ?? []).find(x => x.codigo === c)
    chk('importando en una lista derivada, el producto da error y el insumo no', f('pr1')?.estado === 'error' && f('ins:i1')?.estado === 'ok', im.filas)
    // En la lista base, con un precio por unidad ya cargado el 01/09: la misma fecha se frena.
    S.estado.importar = { ...S.importarVacio('precios'), listaId: 'l1', desde: '2026-09-01' }
    await S.procesarFilasImportar([enc, ['pr1', '', '', '', '', '', '', '3.300']], 'p.xlsx')
    S.pedirGuardarImportacion()
    chk('importar con la misma fecha de un precio por unidad cargado se frena antes de confirmar', S.estado.importar.confirmar !== true && /Ya hay un precio cargado desde el 01\/09\/2026 para Cucurucho grande/.test(S.estado.importar.error ?? ''), S.estado.importar.error)
    S.estado.importar.desde = '2026-10-01'
    S.estado.importar.error = null
    S.pedirGuardarImportacion()
    chk('con otra fecha pide confirmar', S.estado.importar.confirmar === true)
  }))
}

// ── HTML malicioso ─────────────────────────────────────────────────────────
{
  const S = nuevo()
  S.estado.listas = { unidad: 'u-n', filas: [{ id: 'l1', nombre: 'L', moneda: 'ARS', activa: true, es_base: true }] }
  const f = { clave: 'x', productoId: 'p1', presentacionId: 'x', producto: marca('prod'), presentacion: marca('pres'), upcSin: 100, conCono: { nombre: marca('concono') }, grupo: 'Cucuruchones' }
  const comp = { productos: [{ producto_id: 'p1', sin_cono: null, con_cono: { sin_precio: true, motivo: marca('motivo') } }], conito: {} }
  const l = { id: 'l1', precios: [], filas: [f], pendientes: new Map(), completa: comp }
  chequearMarcas(chk, 'fila de producto', S.htmlFilaProducto(f, l, '2026-09-26'), ['prod', 'pres', 'concono', 'motivo'])
  S.estado.listas.filas.push({ id: 'l9', nombre: marca('base'), moneda: 'ARS', activa: true, es_base: true })
  S.estado.listas.filas[0] = { id: 'l1', nombre: 'L', moneda: 'ARS', activa: true, base_id: 'l9', recargo_pct: 5 }
  chequearMarcas(chk, 'aviso de lista derivada y error de lista_completa', S.htmlGrilla({ ...l, errorCompleta: marca('errcomp') }, '2026-09-26'), ['base', 'errcomp'])
}

fin()
