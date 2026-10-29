// Suite: Buscar → "Precios" (modulos/buscar.html, 28/10/2026).
//
// precios_compra(p_unidad_negocio_id, p_hasta) es la misma de Stock →
// "Precios de compra" (leída con pg_get_functiondef el 28/10/2026; pide
// stock:ver_costos o retiros:precios en la fábrica). Se prueba:
//  - que las funciones de formato son COPIA IGUAL a las de stock.html (cada
//    módulo duplica sus helpers: si una cambia allá y no acá, rojo) y que dan
//    lo mismo con los datos de la maqueta;
//  - el buscador que filtra mientras se escribe (nombre y marca, sin acentos
//    ni mayúsculas, cada palabra);
//  - la fila (sin IVA, IVA, final, por bulto con IVA, de dónde salió) y el
//    historial (las compras de ESA fábrica y los cargados a mano), con esc();
//  - de qué fábrica se piden (la barra; con "Todas", los chips), sin permiso
//    en la fábrica, y una respuesta vieja que no pisa a la nueva.
//
//   node pruebas/test-buscar-precios.js
//   ARCHIVO_TEST=otra-copia.html node pruebas/test-buscar-precios.js

const fs = require('fs')
const path = require('path')
const { construirCon, scriptModulo } = require('./sandbox')
const { arnes, marca, chequearMarcas } = require('./circuito-comun')
const { fuenteNumeros } = require('./numeros-comun')
const { extraerFn, extraerConst } = require('./extraer')
const DATOS = require('./datos-maqueta/buscar')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/buscar.html')
const STOCK = process.env.ARCHIVO_STOCK || path.join(__dirname, '..', 'modulos/stock.html')
const FUENTE = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${FUENTE.length} bytes)`)
const { chk, esperas, fin } = arnes()

const PRELUDIO = fuenteNumeros() + `
  var __els = {}
  function __el(id) {
    if (!__els[id]) __els[id] = { id, innerHTML: '', textContent: '', hidden: false, disabled: false, value: '', oyentes: {},
      addEventListener(t, f) { (this.oyentes[t] = this.oyentes[t] || []).push(f) }, focus() {} }
    return __els[id]
  }
  var document = { getElementById: __el }
  var __llamadas = []
  var __rpc = async () => ({ data: [], error: null })
  var __tablas = {}
  function __consulta(tabla) {
    const filtros = []
    const q = {
      select() { return q }, order() { return q }, not() { return q },
      eq(a, b) { filtros.push(r => r[a] === b); return q },
      then(res, rej) {
        __llamadas.push(['from', tabla])
        const t = __tablas[tabla]
        const r = typeof t === 'string' ? { data: null, error: { message: t } } : { data: (t || []).filter(f => filtros.every(x => x(f))), error: null }
        return Promise.resolve(r).then(res, rej)
      },
    }
    return q
  }
  var supabase = { rpc(n, p) { __llamadas.push([n, p]); return __rpc(n, p) }, from: __consulta }
  var console = { error() {}, log() {}, warn() {} }
`
// Las que son COPIA de stock.html (texto igual, salvo la sangría).
const COPIAS = ['esc', 'normalizar', 'numeroCobertura', 'numeroCosto', 'plataCosto', 'porUnidadDeMedida', 'plataPrecioCompra',
  'textoIvaPrecio', 'textoComprobante', 'textoOrigenPrecio', 'textoBultoConIva', 'comprasDelHistorial', 'textoPrecioConIva']
const FUNCIONES = [...COPIAS, 'formatearFecha', 'formatearCantidadStock', 'unidadCorta', 'contenidoBultoPrecio', 'puedeEn', 'unidadesCon',
  'entero', 'plural', 'mensajeDe', 'pintarAviso', 'nombreUnidad', 'filasPreciosVisibles', 'textoCuentaPrecios', 'htmlFilaPrecio',
  'htmlHistorialPrecios', 'unidadesPrecios', 'unidadPrecios', 'abrirPrecios', 'cargarPrecios', 'pintarChipsPrecios', 'pintarPrecios',
  'pintarListaPrecios', 'abrirHistorial']
const CONSTANTES = ['NOMBRES_COMPROBANTE', 'TAREAS_PRECIOS', 'DECIMALES_CANTIDAD', 'estado']
const nuevo = () => construirCon(ARCHIVO, {
  preludio: PRELUDIO, funciones: FUNCIONES, constantes: CONSTANTES,
  retorno: `${CONSTANTES.join(', ')}, __el, __llamadas, __setRpc(f) { __rpc = f }, __setTablas(t) { __tablas = t }`,
})
const S = nuevo()

const NUSS = 'u-n', DOLCE = 'u-d'
const NOMBRES = new Map(DATOS.tablas.unidades_negocio.map(u => [u.id, u.nombre]))
const PRECIOS = DATOS.rpc.precios_compra.__segun
const P_NUSS = PRECIOS.find(c => c.si.p_unidad_negocio_id === NUSS).r
const P_DOLCE = PRECIOS.find(c => c.si.p_unidad_negocio_id === DOLCE).r
const copia = x => JSON.parse(JSON.stringify(x))

// ── 1. Copia igual a Stock ─────────────────────────────────────────────────
{
  const mio = scriptModulo(ARCHIVO)
  const deStock = scriptModulo(STOCK)
  const plano = t => t.split('\n').map(l => l.trim()).filter(Boolean).join('\n')
  for (const n of COPIAS) {
    chk(`${n} es igual a la de stock.html`, plano(extraerFn(mio, n)) === plano(extraerFn(deStock, n)), n)
  }
  chk('NOMBRES_COMPROBANTE es igual a la de stock.html', plano(extraerConst(mio, 'NOMBRES_COMPROBANTE')) === plano(extraerConst(deStock, 'NOMBRES_COMPROBANTE')))
  chk('las dos piden la misma rpc con el mismo parámetro', FUENTE.includes("supabase.rpc('precios_compra', { p_unidad_negocio_id: unidad })") &&
    fs.readFileSync(STOCK, 'utf8').includes("supabase.rpc('precios_compra', { p_unidad_negocio_id: unidad })"))
  chk('y el historial lee las compras igual que el modal de Stock', FUENTE.includes(".select('id, precio_unitario, alicuota_iva, created_at, materia_prima_ingresos(fecha, tipo_doc, numero_doc, razon_social, unidad_negocio_id)')"))
}

// ── 2. La fila de un precio ────────────────────────────────────────────────
{
  const harina = P_NUSS.find(f => f.insumo_id === 'i-harina')
  const lecitina = P_NUSS.find(f => f.insumo_id === 'i-lecitina')
  const azucar = P_NUSS.find(f => f.insumo_id === 'i-azucar')
  chk('de dónde salió una compra: proveedor, comprobante y fecha', S.textoOrigenPrecio(harina) === 'Compra · Molino del Sur · Factura A 0001-00004321 · 20/10/2026', S.textoOrigenPrecio(harina))
  chk('de dónde salió uno a mano: la nota y la fecha', S.textoOrigenPrecio(lecitina) === 'Cargado a mano · Lista de septiembre · 15/09/2026')
  chk('un remito dice "Remito"', S.textoOrigenPrecio(azucar) === 'Compra · Distribuidora Norte · Remito R-0001-00000123 · 15/10/2026', S.textoOrigenPrecio(azucar))
  chk('un comprobante que no es de la lista va tal cual', S.textoOrigenPrecio({ origen: 'compra', proveedor: 'X', comprobante: 'ticket 123', fecha: null }) === 'Compra · X · ticket 123')
  chk('el bulto con IVA', S.textoBultoConIva(harina) === 'bolsa de 25 kg con IVA: $ 33.275,00', S.textoBultoConIva(harina))
  chk('sin bulto, nada', S.textoBultoConIva(lecitina) === '')
  const h = S.htmlFilaPrecio(harina, false, '')
  chk('la fila: sin IVA, IVA % y final por kg', h.includes('$ 1.100,00 por kg') && h.includes('>21 %<') && h.includes('$ 1.331,00 por kg'))
  chk('la fila: por bulto con IVA', h.includes('Por bolsa de 25 kg con IVA: $ 33.275,00'))
  chk('cerrada no trae historial', !h.includes('data-historial') && h.includes('aria-expanded="false"'))
  chk('el precio chico con 4 decimales y el IVA con coma', S.htmlFilaPrecio(lecitina, false, '').includes('$ 5.432,12 por kg') && S.htmlFilaPrecio(lecitina, false, '').includes('10,5 %'))
  const abierta = S.htmlFilaPrecio(harina, true, '<i>hist</i>')
  chk('abierta trae el historial', abierta.includes('aria-expanded="true"') && abierta.includes('data-historial="i-harina"><i>hist</i>'))
  const x = copia(harina)
  const CAMPOS = ['insumo', 'marca', 'proveedor', 'comprobante', 'nombre_bulto', 'insumo_id', 'unidad_medida']
  for (const k of CAMPOS) x[k] = marca(k)
  chequearMarcas(chk, 'la fila de un precio', S.htmlFilaPrecio(x, true, ''), CAMPOS)
}

// ── 3. El buscador ─────────────────────────────────────────────────────────
{
  const ids = (b) => S.filasPreciosVisibles(P_NUSS, b).map(f => f.insumo_id).join(',')
  chk('vacío: todos', ids('') === 'i-azucar,i-harina,i-lecitina')
  chk('mientras se escribe: "harin" → la harina', ids('harin') === 'i-harina')
  chk('sin mayúsculas', ids('HARINA') === 'i-harina')
  chk('sin acentos ("azucar" encuentra "Azúcar")', ids('azucar') === 'i-azucar')
  chk('por la marca', ids('ledesma') === 'i-azucar')
  chk('nombre y marca juntos, cada palabra', ids('azucar ledesma') === 'i-azucar' && ids('azucar molino') === '')
  chk('nada que coincida: ninguno', ids('xyz') === '')
  chk('una fila sin insumo_id no se lista', S.filasPreciosVisibles([{ insumo: 'X' }], '').length === 0)
  chk('la cuenta: "3 insumos con precio" y "1 de 3 insumos"', S.textoCuentaPrecios(3, 3) === '3 insumos con precio' && S.textoCuentaPrecios(1, 3) === '1 de 3 insumos' && S.textoCuentaPrecios(0, 0) === '')
}

// ── 4. El historial ────────────────────────────────────────────────────────
{
  const compras = S.comprasDelHistorial(DATOS.tablas.materia_prima_items, NUSS)
  chk('las compras de ESA fábrica (la de Dolce no), la más nueva primero', compras.length === 2 && compras[0].id === 'mpi-2' && compras[1].id === 'mpi-1')
  const h = S.htmlHistorialPrecios({ compras, manuales: DATOS.tablas.insumo_costos, errorCompras: null, errorManual: null }, 'kg')
  chk('compras con su proveedor y comprobante', h.includes('$ 1.000,00 por kg + IVA 21 %') && h.includes('Molino del Sur · Factura A 0001-00004100 · 20/09/2026'))
  chk('los cargados a mano con su fecha y nota', h.includes('$ 980,00 por kg + IVA 21 %') && h.includes('desde 01/09/2026 · Lista de agosto'))
  chk('un anulado se ve tachado', S.htmlHistorialPrecios({ compras: [], manuales: [{ ...DATOS.tablas.insumo_costos[0], anulado: true }] }, 'kg').includes('bu-hist--anulado'))
  chk('sin nada: lo dice', S.htmlHistorialPrecios({ compras: [], manuales: [] }, 'kg').includes('Todavía no hay ningún precio de este insumo en esta fábrica.'))
  chk('cargando', S.htmlHistorialPrecios({ cargando: true }, 'kg').includes('Cargando el historial'))
  chk('si no se pudieron leer las compras, lo dice', S.htmlHistorialPrecios({ compras: [], manuales: [], errorCompras: 'sin permiso' }, 'kg').includes('No se pudieron leer las compras: sin permiso'))
  const hx = S.htmlHistorialPrecios({
    compras: [{ precio: 1, iva: 21, proveedor: marca('proveedor_h'), comprobante: marca('comp_h'), fecha: null }],
    manuales: [{ costo_unitario: 1, alicuota_iva: 0, vigente_desde: null, nota: marca('nota_h'), anulado: false }],
    errorCompras: marca('error_c'), errorManual: marca('error_m'),
  }, marca('unidad_h'))
  chequearMarcas(chk, 'el historial', hx, ['proveedor_h', 'comp_h', 'nota_h', 'error_c', 'error_m', 'unidad_h'])
  const hm = S.htmlHistorialPrecios({ compras: [], manuales: [{ costo_unitario: 1, alicuota_iva: 0, vigente_desde: null, nota: null, anulado: false }] }, marca('unidad_m'))
  chequearMarcas(chk, 'el historial a mano', hm, ['unidad_m'])
}
{
  // Los nombres de las fábricas (unidades_negocio) también vienen de la base.
  const X = nuevo()
  X.estado.permisos = { rol: 'super_admin', alcances: new Map() }
  X.estado.unidades = [{ id: marca('id_a'), nombre: marca('fabrica_a') }, { id: 'u-d', nombre: marca('fabrica_b') }]
  X.pintarChipsPrecios()
  chequearMarcas(chk, 'los chips de fábrica', X.__el('bu-precios-unidades').innerHTML, ['id_a', 'fabrica_a', 'fabrica_b'])
  X.estado.nombres = new Map([['u-d', marca('fabrica_vacia')]])
  X.estado.precios = { ...X.estado.precios, unidad: 'u-d', filas: [] }
  X.pintarListaPrecios()
  chequearMarcas(chk, 'una fábrica sin precios', X.__el('bu-precios-lista').innerHTML, ['fabrica_vacia'])
}

// ── 5. De qué fábrica y el flujo ───────────────────────────────────────────
function preparar({ barra = NUSS, tareas = [['stock:ver_costos', { unidades: [NUSS, DOLCE] }]] } = {}) {
  const X = nuevo()
  X.estado.permisos = { rol: 'usuario', alcances: new Map(tareas) }
  X.estado.unidades = [{ id: NUSS, nombre: 'Cucuruchos Nuss' }, { id: DOLCE, nombre: 'Dolce Pasta' }]
  X.estado.nombres = NOMBRES
  X.estado.unidadBarra = barra
  X.__setRpc(async (n, p) => ({ data: copia(p.p_unidad_negocio_id === NUSS ? P_NUSS : p.p_unidad_negocio_id === DOLCE ? P_DOLCE : []), error: null }))
  X.__setTablas(copia(DATOS.tablas))
  return X
}
const html = (X, id) => X.__el(id).innerHTML

esperas.push((async () => {
  const X = preparar()
  X.abrirPrecios()
  await new Promise(r => setTimeout(r, 0))
  chk('con Nuss en la barra pide los de Nuss', JSON.stringify(X.__llamadas[0]) === JSON.stringify(['precios_compra', { p_unidad_negocio_id: NUSS }]))
  chk('lista los tres y los cuenta', (html(X, 'bu-precios-lista').match(/data-precio="/g) || []).length === 3 && X.__el('bu-precios-cuenta').textContent === '3 insumos con precio')
  chk('sin chips de fábrica (manda la barra)', X.__el('bu-precios-unidades').hidden === true)
  X.estado.precios.busqueda = 'lecitina'
  X.pintarListaPrecios()
  chk('el buscador filtra la lista', (html(X, 'bu-precios-lista').match(/data-precio="/g) || []).length === 1 && html(X, 'bu-precios-lista').includes('Lecitina'))
  X.estado.precios.busqueda = 'nada'
  X.pintarListaPrecios()
  chk('sin coincidencias, lo dice', html(X, 'bu-precios-lista').includes('No se encontró ningún insumo con ese nombre o marca.'))
  X.estado.precios.busqueda = ''
  await X.abrirHistorial('i-harina')
  chk('tocando un insumo: su historial (compras de Nuss y el cargado a mano)', html(X, 'bu-precios-lista').includes('data-historial="i-harina"') &&
    (html(X, 'bu-precios-lista').match(/data-hist="compra"/g) || []).length === 2 && (html(X, 'bu-precios-lista').match(/data-hist="manual"/g) || []).length === 1)
  const lecturas = X.__llamadas.filter(l => l[0] === 'from').length
  await X.abrirHistorial('i-harina')
  chk('tocándolo otra vez se cierra (sin volver a leer)', !html(X, 'bu-precios-lista').includes('data-historial=') && X.__llamadas.filter(l => l[0] === 'from').length === lecturas)
  await X.abrirHistorial('i-harina')
  chk('reabierto: el historial ya leído', html(X, 'bu-precios-lista').includes('data-historial="i-harina"') && X.__llamadas.filter(l => l[0] === 'from').length === lecturas)
})())

esperas.push((async () => {
  const X = preparar({ barra: null })
  X.abrirPrecios()
  chk('con "Todas" y dos fábricas: pide elegir, con chips, y no llama', X.__llamadas.length === 0 && html(X, 'bu-precios-aviso').includes('Elegí de qué fábrica') && X.__el('bu-precios-unidades').hidden === false &&
    html(X, 'bu-precios-unidades').includes('data-unidad-precios="u-d"'))
  X.estado.precios.elegida = DOLCE
  X.abrirPrecios()
  await new Promise(r => setTimeout(r, 0))
  chk('elegida Dolce: pide los de Dolce, sin cambiar la barra', X.__llamadas[0][1].p_unidad_negocio_id === DOLCE && X.estado.unidadBarra === null && html(X, 'bu-precios-lista').includes('Sémola'))
  chk('el chip elegido queda marcado', html(X, 'bu-precios-unidades').includes('data-unidad-precios="u-d" aria-pressed="true"'))
})())

esperas.push((async () => {
  const X = preparar({ barra: null, tareas: [['retiros:precios', { unidades: [NUSS] }]] })
  X.abrirPrecios()
  await new Promise(r => setTimeout(r, 0))
  chk('con "Todas" y una sola fábrica posible: esa, sin preguntar (retiros:precios alcanza)', X.__llamadas[0]?.[1]?.p_unidad_negocio_id === NUSS && X.__el('bu-precios-unidades').hidden === true)
})())

esperas.push((async () => {
  const X = preparar({ barra: DOLCE, tareas: [['stock:ver_costos', { unidades: [NUSS] }]] })
  X.abrirPrecios()
  chk('sin permiso en la fábrica de la barra: lo dice y no llama', X.__llamadas.length === 0 && html(X, 'bu-precios-aviso').includes('No tenés permiso para ver los precios de compra en Dolce Pasta.') && X.__el('bu-precios-caja').hidden === true)
})())

esperas.push((async () => {
  const X = preparar()
  X.__setRpc(async () => ({ data: null, error: { message: 'No tenés permiso <b>x</b>' } }))
  await X.cargarPrecios(NUSS)
  chk('el error de la base, tal cual y escapado', html(X, 'bu-precios-aviso').includes('No se pudieron leer los precios: No tenés permiso &lt;b&gt;x&lt;/b&gt;'))
  X.__setRpc(async () => ({ data: [], error: null }))
  await X.cargarPrecios(NUSS)
  chk('una fábrica sin precios lo dice', html(X, 'bu-precios-lista').includes('Cucuruchos Nuss todavía no tiene precios de compra.'))
})())

esperas.push((async () => {
  // Cambiar de fábrica con una respuesta en camino: la vieja no pisa.
  const X = preparar()
  let soltar
  X.__setRpc((n, p) => p.p_unidad_negocio_id === NUSS
    ? new Promise(r => { soltar = () => r({ data: copia(P_NUSS), error: null }) })
    : Promise.resolve({ data: copia(P_DOLCE), error: null }))
  const vieja = X.cargarPrecios(NUSS)
  chk('mientras carga, lo dice', html(X, 'bu-precios-lista').includes('Cargando los precios'))
  await X.cargarPrecios(DOLCE)
  soltar()
  await vieja
  chk('una respuesta vieja no pisa a la nueva', html(X, 'bu-precios-lista').includes('Sémola') && !html(X, 'bu-precios-lista').includes('Harina'))
})())

fin()
