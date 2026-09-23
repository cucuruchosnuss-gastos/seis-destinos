// Barrido de escapado de modulos/stock.html — el archivo ENTERO.
//
// Mismo método que test-materia-prima-xss.js, en DOS MITADES que no se
// reemplazan entre sí:
//  1. EJECUTA los renders con un document falso y una MARCA DISTINTA POR CAMPO
//     (`"><b data-xss="campo">`), con datos que imitan lo que devuelve la base.
//     Es lo único que prueba que esc() existe, que se llama y que escapa el
//     argumento correcto.
//  2. CHEQUEO ESTÁTICO sobre TODO el <script>: cada ${...} de una plantilla que
//     arma HTML, cada asignación a innerHTML (la expresión ENTERA, no la
//     primera línea) y cada plantilla sin HTML propio que termina adentro de un
//     innerHTML tiene que estar escapada o figurar en la lista de seguras CON SU
//     MOTIVO. La lista es POR FUNCIÓN y una entrada que no se usa es rojo.
//
// Las funciones del sandbox se juntan por CLAUSURA desde los renders: se
// ejecuta el código real de cada helper, no una copia.
//
//   node pruebas/test-stock-xss.js
//   ARCHIVO_TEST=otra-copia.html node pruebas/test-stock-xss.js
//   SOLO=render | SOLO=estatico

const path = require('path')
const { construirCon, scriptModulo } = require('./sandbox')
const { arnes, marca, chequearMarcas, leer } = require('./circuito-comun')
const { interpolaciones, analizar } = require('./escaner-interpolaciones')
const { clasificar, partirTopLevel } = require('./clasificar')
const { extraerFn, cuerpoDesde } = require('./extraer')
const { fuenteNumeros } = require('./numeros-comun')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/stock.html')
const SOLO = process.env.SOLO || ''
const FUENTE = leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

// ══════════════════════════════════════════════════════════════════════════
// 1. RENDERS EJECUTADOS
// ══════════════════════════════════════════════════════════════════════════

// Lo que define el preludio y NO se extrae: red, historial del navegador y
// cableados que acá no aportan nada al escapado.
const STUBS = new Set([
  'formatearFecha', 'mostrarError', 'mostrarExito', 'abrirConHistorial', 'asegurarCatalogo',
  'guardarConteoAhora', 'actualizarContadorRec', 'renderizarClaseRecuento', 'mostrarVista',
  'verificarSesion', 'mostrarBannerVersion',
  // De una sola línea: extraerFn las rechaza por sospechosas. Copia literal.
  'puedeDarBaja',
])
const CONSTANTES_EXCLUIDAS = new Set([])

const RENDERS = [
  'esc', 'renderizarUnidadesSugeridas', 'renderizarChips', 'renderizarLista', 'abrirDetalleInsumo',
  'poblarSelectorVista', 'poblarSelectorCategoria', 'confirmarImportacion',
  'renderizarChipsUnidadStock', 'renderizarStock', 'abrirLotes',
  'renderizarChipsUnidadRecuento', 'renderizarMetaRecuento', 'renderizarChipsFiltroRec',
  'renderizarItemsRecuento', 'renderizarSugerenciasCatalogo', 'renderizarPresentacionesAgregar',
  'abrirModalCerrar', 'renderizarChipsUnidadHistorial', 'renderizarHistorial',
  'renderizarCabeceraRecuento', 'renderizarDetalleRecuento', 'renderizarAjustesRecuento',
  'renderizarAlias', 'htmlFilaAlias', 'abrirModalAlias', 'abrirBorradoAlias', 'renderizarSugerenciasAlias',
  'abrirModalMovimiento', 'poblarSelectorMotivoTipo', 'renderizarUnidadMov', 'renderizarSugerenciasMov',
  'elegirInsumoMov', 'cargarLotesMov', 'renderizarPresentacionesMov', 'actualizarSaldoMov',
  'renderizarChipsUnidadMerma', 'renderizarChipsOrigenMerma', 'renderizarMermas',
  'renderizarOrigenTransf', 'renderizarDestinoTransf', 'renderizarItemsTransf', 'renderizarSugerenciasTi',
  'elegirInsumoTi', 'renderizarLotesTi', 'renderizarPresentacionesTi', 'actualizarSaldoTi',
  'renderizarTransito', 'renderizarTransfHistorial', 'renderizarCabeceraTransf', 'renderizarItemsTransfDetalle',
]

function clausura(src) {
  const nombresFn = new Set([...src.matchAll(/(?:^|\n)\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g)].map(m => m[1]))
  // `const puedeAjustar   = () => …`: hay constantes alineadas con espacios
  // antes del '='.
  const posConst = new Map([...src.matchAll(/\n {4}const ([A-Za-z_$][\w$]*)\s*=/g)].map(m => [m[1], m.index + 1]))
  for (const c of CONSTANTES_EXCLUIDAS) posConst.delete(c)
  const fns = new Set(), consts = []
  const cola = [...RENDERS]
  const mirar = (texto) => {
    for (const m of texto.matchAll(/[A-Za-z_$][\w$]*/g)) {
      const id = m[0]
      if (nombresFn.has(id) && !fns.has(id) && !STUBS.has(id)) cola.push(id)
      if (posConst.has(id) && !consts.includes(id)) {
        consts.push(id)
        // Lo que nombra la constante (una flecha que llama a una función,
        // un Set armado con otra constante) también entra.
        const resto = src.slice(posConst.get(id))
        const fin = resto.slice(1).search(/\n {4}(?:const|let|function|async function|\/\/)/)
        mirar(resto.slice(0, fin === -1 ? 400 : fin + 1))
      }
    }
  }
  while (cola.length) {
    const n = cola.shift()
    if (fns.has(n) || STUBS.has(n)) continue
    let texto
    try { texto = extraerFn(src, n) } catch (e) { chk(`existe la función ${n}`, false, e.message); continue }
    fns.add(n)
    mirar(texto)
  }
  // Las constantes se declaran en el orden del archivo: una puede usar a otra.
  consts.sort((a, b) => posConst.get(a) - posConst.get(b))
  return { funciones: [...fns], constantes: consts }
}

const PRELUDIO = `
  ${fuenteNumeros()}
  function nuevoEl(id) {
    const el = {
      id, innerHTML: '', textContent: '', value: '', className: '', hidden: false, checked: false, disabled: false,
      dataset: {}, style: {}, querySelector: () => null, querySelectorAll: () => [], addEventListener(){}, focus(){},
      removeAttribute(){}, setAttribute(){}, closest: () => nuevoEl('closest'), setSelectionRange(){},
      classList: { add(){}, remove(){}, toggle(){}, contains: () => false },
    }
    return el
  }
  var __els = new Map()
  var document = {
    activeElement: null,
    getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) },
    querySelectorAll: () => [], querySelector: () => null, addEventListener(){},
  }
  var window = { scrollTo(){}, addEventListener(){}, removeEventListener(){} }
  var history = { pushState(){}, back(){} }
  var CSS = { escape: (s) => s }
  var confirm = () => true
  var __llamadas = { errores: [], exitos: [] }
  var __datos = {}
  var __rpc = {}
  function __consulta(tabla) {
    const q = {}
    for (const k of ['select', 'eq', 'neq', 'in', 'is', 'order', 'gte', 'lte', 'limit', 'range', 'not', 'or']) q[k] = () => q
    q.maybeSingle = () => q
    q.single = () => q
    q.then = (res, rej) => Promise.resolve({ data: __datos[tabla] ?? [], error: null }).then(res, rej)
    return q
  }
  var supabase = {
    from: (t) => __consulta(t),
    rpc: async (n) => (__rpc[n] ?? { data: null, error: null }),
  }
  function mostrarError(m) { __llamadas.errores.push(m) }
  function mostrarExito(m) { __llamadas.exitos.push(m) }
  // formatearFecha de js/utils.js, con su cuerpo real.
  function formatearFecha(fecha) { const [anio, mes, dia] = fecha.split('-'); return dia + '/' + mes + '/' + anio }
  function abrirConHistorial() {}
  async function asegurarCatalogo() {}
  async function guardarConteoAhora() {}
  function actualizarContadorRec() {}
  function renderizarClaseRecuento() {}
  function mostrarVista() {}
  function puedeDarBaja() { return tieneTarea('stock', 'dar_baja') }
`

const RETORNO = 'estado, __els, __el(id){ return document.getElementById(id) }, __llamadas, __setDatos(t, d){ __datos[t] = d }, __setRpc(n, r){ __rpc[n] = r }'

if (SOLO !== 'estatico') {
  let S
  try {
    const { funciones, constantes } = clausura(scriptModulo(ARCHIVO))
    S = construirCon(ARCHIVO, { preludio: PRELUDIO, funciones, constantes, retorno: RETORNO })
  } catch (e) {
    chk('el sandbox se arma con las funciones reales del archivo', false, String(e && e.stack || e))
  }
  if (S) esperas.push(correrRenders(S))
}

async function correrRenders(S) {
  const el = (id) => S.__el(id)
  const html = (id) => el(id).innerHTML
  const E = S.estado
  const T = '2026-09-10T12:00:00Z'

  // ── esc ──────────────────────────────────────────────────────────────────
  for (const [crudo, esperado] of [['&', '&amp;'], ['<', '&lt;'], ['>', '&gt;'], ['"', '&quot;'], ["'", '&#39;']]) {
    chk(`esc escapa ${crudo}`, S.esc(crudo) === esperado, S.esc(crudo))
  }
  chk('esc no convierte null en la palabra null', S.esc(null) === '' && S.esc(undefined) === '')

  E.miRolApp = 'super_admin'
  E.miEmpleadoId = 'e-yo'

  // ── Catálogo ─────────────────────────────────────────────────────────────
  // Dos insumos con el MISMO nombre: la marca sube al lado del nombre
  // (htmlMarca). Un tercero con la marca en la línea gris.
  const insumo = {
    id: marca('ins_id'), nombre: 'Harina ' + marca('ins_nombre'), marca: marca('ins_marca'), unidad_medida: marca('ins_unidad'),
    tipo: 'materia_prima', categoria: 'Harinas', aclaracion: marca('ins_aclaracion'), activo: true,
    estado_alta: 'pendiente_revision', tolerancia_merma_pct: 1, vista_preferida: 'base',
  }
  E.insumos = [
    insumo,
    { ...insumo, id: 'i2', marca: marca('ins_marca2'), aclaracion: null, estado_alta: 'activo' },
    { ...insumo, id: 'i3', nombre: 'Harina otra', marca: marca('ins_marca_meta'), aclaracion: null, estado_alta: 'activo' },
    { ...insumo, id: 'i4', nombre: 'Caja vieja', marca: null, activo: false, tipo: 'insumo', categoria: null },
    // tipo y categoría tienen CHECK en la base, así que esto no es alcanzable
    // con datos reales; está para que el render no dependa de eso.
    { ...insumo, id: 'i5', nombre: 'Rara', marca: null, aclaracion: null, estado_alta: 'activo', tipo: marca('ins_tipo'), categoria: marca('ins_categoria') },
  ]
  S.renderizarUnidadesSugeridas()
  chequearMarcas(chk, 'unidades sugeridas (datalist)', html('unidades-existentes'), ['ins_unidad'])
  S.renderizarChips()
  chequearMarcas(chk, 'chips de filtro del catálogo', html('chips-filtro'), [])
  E.filtro = 'todos'; E.busqueda = ''
  S.renderizarLista()
  chequearMarcas(chk, 'listado del catálogo', html('lista-insumos'),
    ['ins_id', 'ins_nombre', 'ins_marca', 'ins_marca2', 'ins_marca_meta', 'ins_aclaracion', 'ins_unidad', 'ins_tipo', 'ins_categoria'])
  S.abrirDetalleInsumo(insumo.id)
  chequearMarcas(chk, 'detalle del insumo', html('detalle-insumo-filas'), ['ins_unidad'])
  S.poblarSelectorVista(marca('vista_unidad'))
  chequearMarcas(chk, 'selector de vista preferida (unidad desconocida)', html('campo-vista'), ['vista_unidad'])
  S.poblarSelectorCategoria()
  chequearMarcas(chk, 'selector de categoría', html('campo-categoria'), [])
  S.__setRpc('importar_insumos_excel', {
    data: { creados: 0, omitidos: 0, errores: [{ fila: 1, nombre: marca('imp_nombre'), marca: marca('imp_marca'), motivo: marca('imp_motivo') }] },
    error: null,
  })
  E.filasImport = [{ nombre: 'x' }]
  await S.confirmarImportacion()
  chequearMarcas(chk, 'errores de la importación de Excel', html('lista-errores-import'), ['imp_nombre', 'imp_marca', 'imp_motivo'])

  // ── Stock ────────────────────────────────────────────────────────────────
  E.unidadesStock = [{ id: marca('uni_id'), nombre: marca('uni_nombre') }, { id: 'u2', nombre: 'Otra' }]
  S.renderizarChipsUnidadStock()
  chequearMarcas(chk, 'chips de unidad del stock', html('chips-unidad-stock'), ['uni_id', 'uni_nombre'])
  const filaStock = {
    insumo_id: marca('st_insumo'), unidad_negocio_id: marca('uni_id'), insumo_nombre: marca('st_nombre'), marca: marca('st_marca'),
    unidad_medida: marca('st_unidad'), tipo: 'insumo', categoria: null, aclaracion: marca('st_aclaracion'),
    cantidad_total: 260, lotes_distintos: 2, presentaciones: 1, contenido_unico: 25, kilos_sueltos: 10, vista_preferida: 'bulto',
  }
  E.stock = [filaStock, { ...filaStock, insumo_id: 's2', marca: marca('st_marca2'), aclaracion: null, vista_preferida: 'base', cantidad_total: -3, presentaciones: 0 },
    { ...filaStock, insumo_id: 's3', insumo_nombre: 'Rara', marca: null, aclaracion: null, tipo: marca('st_tipo'), categoria: marca('st_categoria') }]
  E.unidadStock = ''; E.busquedaStock = ''
  S.renderizarStock()
  chequearMarcas(chk, 'listado de stock', html('lista-stock'),
    ['st_insumo', 'uni_id', 'st_nombre', 'st_marca', 'st_marca2', 'st_aclaracion', 'st_unidad', 'st_tipo', 'st_categoria'])

  S.__setDatos('v_stock_por_lote', [
    { lote: marca('lote'), contenido_por_bulto: 25, saldo: 50, desde: '2026-09-01' },
    { lote: 'L2', contenido_por_bulto: null, saldo: -5, desde: null },
    { lote: null, contenido_por_bulto: 25, saldo: 5, desde: null },
  ])
  await S.abrirLotes(filaStock.insumo_id, filaStock.unidad_negocio_id)
  chequearMarcas(chk, 'detalle por lote (título)', html('lotes-nombre'), ['st_nombre', 'st_aclaracion'])
  chequearMarcas(chk, 'detalle por lote (tabla)', html('lotes-tabla'), ['lote', 'st_unidad'])

  // ── Recuento abierto ─────────────────────────────────────────────────────
  E.unidadesAjuste = [{ id: marca('uni_id'), nombre: marca('uni_ajuste') }, { id: 'u2', nombre: 'Otra' }]
  S.renderizarChipsUnidadRecuento()
  chequearMarcas(chk, 'chips de unidad del recuento', html('chips-unidad-recuento'), ['uni_id', 'uni_ajuste'])
  E.recuento = { id: 'r1', estado: 'abierto', unidad_negocio_id: 'u1', abierto_en: T,
    abierto_por_nombre: marca('rec_quien'), unidad_nombre: marca('rec_unidad') }
  S.renderizarMetaRecuento()
  chequearMarcas(chk, 'cabecera del recuento abierto', html('rec-meta'), ['rec_quien', 'rec_unidad'])
  E.itemsRec = [{
    id: marca('item_id'), insumo_id: 'i1', nombre: marca('item_nombre'), marca: marca('item_marca'), aclaracion: marca('item_aclaracion'),
    lote: marca('item_lote'), contenido_por_bulto: 25, unidad_medida: marca('item_unidad'), tipo: 'materia_prima',
    cantidad_contada: 10, observacion: marca('item_obs'), errorCantidad: marca('item_error'),
  }]
  E.saldos = new Map()
  E.filtroRec = 'todos'; E.busquedaRec = ''
  S.renderizarChipsFiltroRec()
  chequearMarcas(chk, 'chips de filtro del recuento', html('rec-chips-filtro'), [])
  S.renderizarItemsRecuento()
  chequearMarcas(chk, 'renglones del recuento', html('rec-lista'),
    ['item_id', 'item_nombre', 'item_marca', 'item_aclaracion', 'item_lote', 'item_unidad', 'item_obs', 'item_error'])
  el('rec-buscar-catalogo').value = 'harina'
  S.renderizarSugerenciasCatalogo()
  chequearMarcas(chk, 'buscador de catálogo del recuento', html('rec-sugerencias'),
    ['ins_id', 'ins_nombre', 'ins_aclaracion', 'ins_marca', 'ins_unidad'])
  E.itemsRec.push({ id: 'r2', insumo_id: insumo.id, nombre: 'H', lote: null, contenido_por_bulto: 50, unidad_medida: insumo.unidad_medida, cantidad_contada: null, observacion: '' })
  E.insumoAgregar = insumo
  E.presentacionAgregar = undefined
  S.renderizarPresentacionesAgregar()
  chequearMarcas(chk, 'presentaciones al agregar un ítem', html('rec-chips-presentacion'), ['ins_unidad'])
  E.itemsRec.pop()
  E.sucios = new Set()
  S.__setDatos('v_stock_por_lote', [])
  await S.abrirModalCerrar()
  chequearMarcas(chk, 'resumen de diferencias antes de cerrar', html('cierre-lista-difs'), ['item_nombre', 'item_lote', 'item_unidad'])

  // ── Historial de recuentos ───────────────────────────────────────────────
  S.renderizarChipsUnidadHistorial()
  chequearMarcas(chk, 'chips de unidad del historial', html('chips-unidad-historial'), ['uni_id', 'uni_nombre'])
  const cerrado = { id: marca('hist_id'), estado: 'cerrado', unidad_negocio_id: 'u1', unidad_nombre: marca('hist_unidad'),
    abierto_por_nombre: marca('hist_abrio'), cerrado_por_nombre: marca('hist_cerro'), abierto_en: T, cerrado_en: T, items: 3, con_diferencia: 1 }
  const anulado = { ...cerrado, id: 'h2', estado: 'anulado', motivo_anulacion: marca('hist_motivo'), cerrado_en: null }
  E.recuentos = [cerrado, anulado]; E.unidadHist = ''
  S.renderizarHistorial()
  chequearMarcas(chk, 'historial de recuentos', html('lista-historial'),
    ['hist_id', 'hist_unidad', 'hist_abrio', 'hist_cerro', 'hist_motivo'])
  E.recuentoDetalle = anulado
  S.renderizarCabeceraRecuento()
  chequearMarcas(chk, 'cabecera del recuento (anulado)', html('hist-detalle-cabecera'), ['hist_unidad', 'hist_abrio'])
  chequearMarcas(chk, 'aviso del recuento anulado', html('hist-aviso-estado'), ['hist_motivo'])
  E.recuentoDetalle = cerrado
  S.renderizarCabeceraRecuento()
  chequearMarcas(chk, 'cabecera del recuento (cerrado)', html('hist-detalle-cabecera'), ['hist_unidad', 'hist_abrio', 'hist_cerro'])
  const insDet = { nombre: marca('det_nombre'), marca: marca('det_marca'), unidad_medida: marca('det_unidad'), aclaracion: marca('det_aclaracion') }
  E.itemsDetalle = [{ insumos: insDet, lote: marca('det_lote'), contenido_por_bulto: 5, cantidad_contada: 3, cantidad_sistema: 4, diferencia: -1, observacion: marca('det_obs') }]
  S.renderizarDetalleRecuento()
  chequearMarcas(chk, 'detalle del recuento', html('hist-detalle-items'),
    ['det_nombre', 'det_marca', 'det_unidad', 'det_aclaracion', 'det_lote', 'det_obs'])
  const insAj = { nombre: marca('aj_nombre'), marca: marca('aj_marca'), unidad_medida: marca('aj_unidad'), aclaracion: marca('aj_aclaracion') }
  E.ajustesDetalle = [
    { insumos: insAj, lote: marca('aj_lote'), cantidad: -2, motivo: marca('aj_motivo'), empleado_id: 'e1', created_at: T, contenido_por_bulto: 5 },
    { insumos: insAj, lote: null, cantidad: 4, motivo: marca('aj_motivo2'), empleado_id: 'e1', created_at: '2026-09-11T12:00:00Z', contenido_por_bulto: null },
  ]
  E.nombresAjuste = new Map([['e1', marca('aj_quien')]])
  S.renderizarAjustesRecuento()
  chequearMarcas(chk, 'ajustes del recuento', html('hist-lista-ajustes'),
    ['aj_nombre', 'aj_marca', 'aj_unidad', 'aj_aclaracion', 'aj_lote', 'aj_motivo', 'aj_motivo2', 'aj_quien'])

  // ── Alias de proveedor ───────────────────────────────────────────────────
  E.alias = [{
    id: marca('alias_id'), texto_proveedor: marca('alias_texto'), proveedores: { razon_social: marca('alias_prov') },
    insumos: { nombre: marca('alias_insumo'), marca: marca('alias_marca'), unidad_medida: marca('alias_unidad'), aclaracion: marca('alias_aclaracion'), activo: false },
    creado_por: 'e1', created_at: T, insumo_id: 'i1', proveedor_id: 'p1',
  }]
  E.nombresAlias = new Map([['e1', marca('alias_quien')]])
  E.busquedaAlias = ''
  S.renderizarAlias()
  chequearMarcas(chk, 'listado de alias', html('lista-alias'),
    ['alias_id', 'alias_texto', 'alias_prov', 'alias_insumo', 'alias_marca', 'alias_unidad', 'alias_aclaracion', 'alias_quien'])
  S.abrirModalAlias(E.alias[0].id)
  chequearMarcas(chk, 'modal de alias (a qué apunta hoy)', html('alias-actual-apunta'), ['alias_insumo'])
  S.abrirBorradoAlias(E.alias[0].id)
  chequearMarcas(chk, 'confirmación de borrado de alias', html('alias-borrar-proveedor'), ['alias_prov', 'alias_texto'])
  el('alias-buscar-catalogo').value = 'harina'
  S.renderizarSugerenciasAlias()
  chequearMarcas(chk, 'buscador de catálogo del alias', html('alias-sugerencias'),
    ['ins_id', 'ins_nombre', 'ins_aclaracion', 'ins_marca', 'ins_unidad'])

  // ── Movimiento puntual ───────────────────────────────────────────────────
  E.misTareas = new Set(['stock:ver', 'stock:ajustar_inventario', 'stock:dar_baja', 'stock:enviar_transferencia', 'stock:gestionar_catalogo'])
  E.unidadesBaja = E.unidadesAjuste
  await S.abrirModalMovimiento({ recuento: { unidad_nombre: marca('mov_rec_unidad'), cerrado_en: T, unidad_negocio_id: marca('uni_id') }, unidadId: marca('uni_id') })
  chequearMarcas(chk, 'vínculo del ajuste con el recuento', html('mov-vinculo'), ['mov_rec_unidad'])
  E.mov = { modo: 'ajuste', unidadId: '', unidadFija: false, insumo: null, signo: 0, recuento: null, presentacion: undefined }
  S.renderizarUnidadMov()
  chequearMarcas(chk, 'chips de unidad del movimiento', html('mov-chips-unidad'), ['uni_id', 'uni_ajuste'])
  S.poblarSelectorMotivoTipo('ajuste')
  chequearMarcas(chk, 'selector de motivo', html('mov-motivo-tipo'), [])
  el('mov-buscar-insumo').value = 'harina'
  S.renderizarSugerenciasMov()
  chequearMarcas(chk, 'buscador de insumo del movimiento', html('mov-sugerencias'),
    ['ins_id', 'ins_nombre', 'ins_aclaracion', 'ins_marca', 'ins_unidad'])
  E.mov.unidadId = 'u1'
  S.__setDatos('v_stock_por_lote', [{ lote: marca('mov_lote'), contenido_por_bulto: 25, saldo: 100 }])
  el('mov-lote').value = marca('mov_lote')
  await S.elegirInsumoMov(insumo.id, { conservarLote: true })
  chequearMarcas(chk, 'insumo elegido en el movimiento', html('mov-insumo-elegido'), ['ins_nombre', 'ins_marca'])
  chequearMarcas(chk, 'lotes sugeridos del movimiento', html('mov-lotes-existentes'), ['mov_lote'])
  chequearMarcas(chk, 'presentaciones del movimiento', html('mov-chips-presentacion'), ['ins_unidad'])
  E.mov.presentacion = 25
  S.actualizarSaldoMov()
  chequearMarcas(chk, 'saldo del movimiento', html('mov-saldo'), ['ins_unidad'])
  chk('saldo del movimiento: se dibujó (si no, el chequeo no mira nada)', /Saldo actual/.test(html('mov-saldo')))

  // ── Mermas ───────────────────────────────────────────────────────────────
  S.renderizarChipsUnidadMerma()
  chequearMarcas(chk, 'chips de unidad de mermas', html('chips-unidad-mermas'), ['uni_id', 'uni_nombre'])
  S.renderizarChipsOrigenMerma()
  chequearMarcas(chk, 'chips de origen de mermas', html('chips-origen-mermas'), [])
  const merma = { unidad_negocio_id: 'u1', unidad_nombre: marca('mer_unidad'), fecha: '2026-09-10', mes: '2026-09-01',
    insumo_nombre: marca('mer_nombre'), marca: marca('mer_marca'), unidad_medida: marca('mer_um'), lote: marca('mer_lote'),
    cantidad: 5, origen: 'baja', motivo_tipo: 'rotura', motivo_texto: marca('mer_texto') }
  E.mermas = [merma, { ...merma, marca: marca('mer_marca2'), origen: marca('mer_origen'), lote: null, motivo_texto: null }]
  E.unidadMerma = ''; E.origenMerma = ''
  S.renderizarMermas()
  chequearMarcas(chk, 'tablero de mermas', html('lista-mermas'),
    ['mer_unidad', 'mer_nombre', 'mer_marca', 'mer_marca2', 'mer_um', 'mer_lote', 'mer_texto', 'mer_origen'])

  // ── Transferencias ───────────────────────────────────────────────────────
  E.unidadesEnvio = [{ id: 'u1', nombre: marca('env_nombre') }, { id: marca('env_id'), nombre: 'B' }]
  E.destinos = [{ id: 'u1', nombre: 'A' }, { id: marca('dest_id'), nombre: marca('dest_nombre') }]
  E.transf = { origenId: 'u1', destinoId: '', fecha: '2026-09-10', items: [] }
  S.renderizarOrigenTransf()
  chequearMarcas(chk, 'chips de origen de la transferencia', html('transf-chips-origen'), ['env_nombre', 'env_id'])
  S.renderizarDestinoTransf()
  chequearMarcas(chk, 'chips de destino de la transferencia', html('transf-chips-destino'), ['dest_id', 'dest_nombre'])
  E.transf.items = [{ insumo: { nombre: marca('ti_nombre'), marca: marca('ti_marca'), unidad_medida: marca('ti_um'), aclaracion: marca('ti_acl'), tipo: 'materia_prima' },
    lote: marca('ti_lote'), contenido: 5, cantidad: 10 }]
  S.renderizarItemsTransf()
  chequearMarcas(chk, 'renglones de la transferencia a enviar', html('transf-lista-items'), ['ti_nombre', 'ti_marca', 'ti_um', 'ti_acl', 'ti_lote'])
  E.ti = { insumo: null, lote: undefined, presentacion: undefined }
  el('ti-buscar-insumo').value = 'harina'
  S.renderizarSugerenciasTi()
  chequearMarcas(chk, 'buscador de insumo de la transferencia', html('ti-sugerencias'),
    ['ins_id', 'ins_nombre', 'ins_aclaracion', 'ins_marca', 'ins_unidad'])
  S.__setDatos('v_stock_por_lote', [{ lote: marca('til_lote'), contenido_por_bulto: 25, saldo: 50 }])
  await S.elegirInsumoTi(insumo.id)
  chequearMarcas(chk, 'insumo elegido en la transferencia', html('ti-insumo-elegido'), ['ins_nombre', 'ins_marca'])
  chequearMarcas(chk, 'lotes de la transferencia', html('ti-chips-lote'), ['til_lote'])
  chequearMarcas(chk, 'presentaciones de la transferencia', html('ti-chips-presentacion'), ['ins_unidad'])
  chequearMarcas(chk, 'saldo disponible de la transferencia', html('ti-saldo'), ['ins_unidad'])
  chk('saldo de la transferencia: se dibujó (si no, el chequeo no mira nada)', /Disponible en el origen/.test(html('ti-saldo')))
  E.lotesTi = []
  E.destinos = [{ id: 'u1', nombre: marca('ti_origen_nombre') }]
  S.renderizarLotesTi()
  chequearMarcas(chk, 'sin saldo en el origen', html('ti-saldo'), ['ti_origen_nombre'])

  E.transito = [{ id: marca('tr_id'), origen_nombre: marca('tr_origen'), destino_nombre: marca('tr_destino'), fecha: '2026-09-10', items: 2, dias_en_transito: 3 }]
  S.renderizarTransito()
  chequearMarcas(chk, 'mercadería en tránsito', html('lista-transito'), ['tr_id', 'tr_origen', 'tr_destino'])
  const rechazada = { id: marca('th_id'), estado: 'rechazada', origen_nombre: marca('th_origen'), destino_nombre: marca('th_destino'),
    fecha: '2026-09-10', items: 1, creado_por_nombre: marca('th_envio'), respondido_por_nombre: marca('th_resp'), motivo_rechazo: marca('th_motivo') }
  E.transferencias = [rechazada, { ...rechazada, id: 't2', estado: 'aceptada', items_con_diferencia: 1 }]
  S.renderizarTransfHistorial()
  chequearMarcas(chk, 'historial de transferencias', html('lista-transf-historial'),
    ['th_id', 'th_origen', 'th_destino', 'th_envio', 'th_resp', 'th_motivo'])
  E.transfDetalle = { ...rechazada, pendiente: false }
  S.renderizarCabeceraTransf()
  chequearMarcas(chk, 'cabecera de la transferencia', html('transito-detalle-cabecera'), ['th_origen', 'th_destino', 'th_envio', 'th_resp'])
  chequearMarcas(chk, 'aviso de rechazo', html('transito-aviso-rechazo'), ['th_motivo'])
  E.itemsTransfDetalle = [{ insumos: { nombre: marca('td_nombre'), marca: marca('td_marca'), unidad_medida: marca('td_um'), aclaracion: marca('td_acl') },
    lote: marca('td_lote'), contenido_por_bulto: 5, cantidad_enviada: 10, cantidad_recibida: 8, motivo_diferencia: marca('td_motivo') }]
  S.renderizarItemsTransfDetalle()
  chequearMarcas(chk, 'renglones de la transferencia', html('transito-detalle-items'),
    ['td_nombre', 'td_marca', 'td_um', 'td_acl', 'td_lote', 'td_motivo'])

}

// ══════════════════════════════════════════════════════════════════════════
// 2. CHEQUEO ESTÁTICO — TODO el <script>
// ══════════════════════════════════════════════════════════════════════════

const HTML_PROPIO = 'HTML armado más arriba en la misma función, con esc() de cada dato'
const DENTRO_DE_ESC = 'plantilla anidada ADENTRO de un esc([...].join(...)): lo que imprime sale escapado por el esc() de afuera'
const H_ACL = 'HTML de htmlAclaracion(), que escapa adentro (ejecutado arriba con la marca «…_aclaracion»)'
const H_MARCA = 'HTML de htmlMarca(), que escapa adentro (ejecutado arriba con la marca «…_marca2»)'
const NUM = 'número: largo de un array o conteo calculado en el código'
const SEGURAS = {
  htmlAgrupado: {
    'c.filas.length': NUM,
    "c.filas.map(htmlDeFila).join('')": 'HTML del callback que recibe htmlAgrupado: sus plantillas tienen HTML propio y el escáner las revisa en renderizarLista / renderizarStock',
  },
  renderizarChips: {
    pendientes: 'número: contarPendientes() es un .length',
    'f.id': 'constante FILTROS', 'f.label': 'constante FILTROS', contador: HTML_PROPIO,
  },
  renderizarLista: {
    'rescatados.length': NUM,
    clases: 'clases CSS literales unidas con join',
    'htmlMarca(i.marca, marcaArriba)': H_MARCA, 'htmlAclaracion(i.aclaracion)': H_ACL,
    badgePendiente: 'HTML constante', badgeInactivo: 'HTML constante',
  },
  renderizarStock: {
    'htmlMarca(f.marca, marcaArriba)': H_MARCA, 'htmlAclaracion(f.aclaracion)': H_ACL,
  },
  abrirLotes: {
    'htmlBultos(l)': 'HTML de la flecha htmlBultos de esta función, que hace esc(txt)',
    'htmlSaldo(l.saldo)': 'HTML de la flecha htmlSaldo de esta función, que hace esc(formatearCantidadStock(...))',
    'htmlAclaracion(fila.aclaracion)': H_ACL,
  },
  renderizarChipsFiltroRec: {
    faltan: 'número: un .length', 'f.id': 'constante FILTROS_REC', 'f.label': 'constante FILTROS_REC', contador: HTML_PROPIO,
  },
  renderizarItemsRecuento: { 'htmlAclaracion(i.aclaracion)': H_ACL },
  renderizarSugerenciasCatalogo: { 'htmlAclaracion(i.aclaracion)': H_ACL },
  abrirModalCerrar: { 'difs.length - TOPE_DIFS_RESUMEN': 'número: resta de un .length y una constante numérica' },
  renderizarHistorial: {
    'badge.clase': "clase CSS de la constante BADGE_RECUENTO, o '' si el estado no está (stock_recuentos.estado tiene CHECK de 3 valores)",
    'r.items': 'número: v_recuentos.items es bigint (verificado el 22/09/2026)',
  },
  renderizarCabeceraRecuento: {
    'badge.clase': "clase CSS de la constante BADGE_RECUENTO, o ''",
    'r.items': 'número: v_recuentos.items es bigint (verificado)',
    'r.con_diferencia': 'número: v_recuentos.con_diferencia es bigint (verificado)',
  },
  renderizarDetalleRecuento: {
    'htmlAclaracion(i.insumos?.aclaracion)': H_ACL, 'i.lote': DENTRO_DE_ESC,
    claseDif: 'clase CSS literal',
  },
  renderizarAjustesRecuento: {
    'htmlAclaracion(a.insumos?.aclaracion)': H_ACL, 'a.lote': DENTRO_DE_ESC,
    'delCierre.length': NUM, 'posteriores.length': NUM,
    "delCierre.map(a => fila(a, false)).join('')": 'HTML de la flecha fila() de esta función, cuyas interpolaciones revisa el escáner',
    "posteriores.map(a => fila(a, true)).join('')": 'HTML de la flecha fila() de esta función, cuyas interpolaciones revisa el escáner',
  },
  renderizarAlias: {
    'items.length': NUM,
    "items.map(htmlFilaAlias).join('')": 'HTML de htmlFilaAlias(), que escapa adentro',
  },
  htmlFilaAlias: { 'htmlAclaracion(i.aclaracion)': H_ACL },
  renderizarSugerenciasAlias: { 'htmlAclaracion(i.aclaracion)': H_ACL },
  renderizarSugerenciasMov: { 'htmlAclaracion(i.aclaracion)': H_ACL },
  actualizarSaldoMov: {
    'enBultos(saldo)': 'HTML de la flecha enBultos de esta función, que hace esc(txt)',
    'enBultos(saldo + aplicado)': 'HTML de la flecha enBultos de esta función, que hace esc(txt)',
  },
  renderizarMermas: {
    'htmlMarca(f.marca, marcaArriba)': H_MARCA,
    'o.clase': "clase CSS de la constante ORIGEN_MERMA, o '' si el origen no está",
    meta: 'armado arriba con .filter(Boolean).map(esc)',
    'r.eventos': 'número: resumenDelMes() devuelve filas.length',
    cuerpo: HTML_PROPIO,
  },
  poblarSelectorCategoria: { SIN_CATEGORIA: 'constante literal', c: 'constante CATEGORIAS' },
  renderizarItemsTransf: { 'htmlAclaracion(it.insumo.aclaracion)': H_ACL, idx: 'número: índice del .map()' },
  renderizarSugerenciasTi: { 'htmlAclaracion(i.aclaracion)': H_ACL },
  actualizarSaldoTi: { 'bultos(saldo)': 'HTML de la flecha bultos de esta función, que hace esc(txt)' },
  renderizarTransito: { 'x.items': 'número: v_stock_en_transito.items es bigint (verificado)' },
  renderizarTransfHistorial: {
    'badge.clase': "clase CSS de la constante BADGE_TRANSF, o '' (stock_transferencias.estado tiene CHECK de 4 valores)",
    'x.items': 'número: v_transferencias.items es bigint (verificado)',
  },
  renderizarCabeceraTransf: {
    'badge.clase': "clase CSS literal o de la constante BADGE_TRANSF",
    'd.dias_en_transito': 'número: v_stock_en_transito.dias_en_transito es integer (verificado)',
  },
  renderizarItemsTransfDetalle: { 'htmlAclaracion(it.insumos.aclaracion)': H_ACL, dif: HTML_PROPIO },
}
// Por función y con regex, para las asignaciones largas cuyo texto completo
// no tiene sentido copiar: el callback que recibe htmlAgrupado().
const SEGURAS_REGEX = {
  renderizarLista: [[/^htmlAgrupado\(agruparPorTipoYCategoria\(filas, i => i\.nombre\), i => \{/,
    'HTML de htmlAgrupado() (escapa tipo y categoría adentro) con un callback cuyas plantillas tienen HTML propio y revisa el escáner']],
  renderizarStock: [[/^htmlAgrupado\(agruparPorTipoYCategoria\(filas, f => f\.insumo_nombre\), f => \{/,
    'HTML de htmlAgrupado() (escapa tipo y categoría adentro) con un callback cuyas plantillas tienen HTML propio y revisa el escáner']],
  // El recuento pasa el callback por NOMBRE (htmlDeFila) y no inline, pero es
  // una const de la misma función: sus plantillas las revisa el escáner igual.
  renderizarItemsRecuento: [[/^htmlAgrupado\(agruparPorTipoYCategoria\(filas, \(i\) => i\.nombre\), htmlDeFila\)$/,
    'HTML de htmlAgrupado() (escapa tipo y categoría adentro) con el callback htmlDeFila, cuyas plantillas tienen HTML propio y revisa el escáner']],
}

const norm = (s) => s.replace(/\s+/g, ' ').trim()

function esMapDePlantilla(expr) {
  const e = norm(expr)
  if (!/\.join\((''|"")\)$/.test(e)) return false
  return /\.map\(\s*\(?[\w\s,[\]{}]*\)?\s*=>\s*`/.test(e) ||
         /\.map\(\s*\(?[\w\s,[\]{}]*\)?\s*=>\s*\{.*return\s*`/.test(e)
}

// posicionesDeValor() de clasificar.js, pero desenvolviendo SOLO paréntesis
// que envuelven la expresión ENTERA (ver el traspaso de Ingreso, punto 5).
function hojas(expr) {
  const e = norm(expr.split('\n').map(l => l.replace(/^\s*\/\/.*$/, '')).join('\n'))
  if (!e) return []
  if (e.startsWith('(')) {
    let cierre = null
    try { cierre = cuerpoDesde(e, 0) } catch { cierre = null }
    if (cierre && cierre.length === e.length) return hojas(e.slice(1, -1))
  }
  for (const op of ['?', '||', '??', '&&', '+']) {
    const partes = partirTopLevel(e, op)
    if (partes.length > 1) {
      if (op === '?') return partirTopLevel(partes.slice(1).join('?'), ':').flatMap(hojas)
      if (op === '&&') return hojas(partes[partes.length - 1])
      return partes.flatMap(hojas)
    }
  }
  return [e]
}

const USADAS = new Set()
function motivoHoja(hoja, fn) {
  const c = clasificar(hoja, { escape: 'esc', seguras: [], segurasRegex: [] })
  if (c.ok) return c.motivos[0]
  if (esMapDePlantilla(hoja)) return 'plantilla anidada devuelta por un map: sus interpolaciones se verifican aparte'
  const tabla = SEGURAS[fn] || {}
  for (const [k, v] of Object.entries(tabla)) if (norm(k) === norm(hoja)) { USADAS.add(fn + '::' + norm(k)); return v }
  for (const [re, v] of (SEGURAS_REGEX[fn] || [])) if (re.test(norm(hoja))) { USADAS.add(fn + '::' + re); return v }
  return null
}

function expresionCompleta(linea) {
  const lineas = FUENTE.split('\n')
  const off = lineas.slice(0, linea - 1).join('\n').length + (linea > 1 ? 1 : 0)
  const m = /\.(innerHTML|outerHTML)\s*=(?!=)/.exec(FUENTE.slice(off))
  if (!m) return null
  const desde = off + m.index + m[0].length
  for (let k = desde; k < Math.min(FUENTE.length, desde + 20000); k++) {
    const c = FUENTE[k]
    if (c !== ';' && c !== '}' && c !== '\n') continue
    const txt = FUENTE.slice(desde, k)
    if (!txt.trim()) continue
    try { new Function(`return (${txt})`) } catch { continue }
    if (c === '\n') {
      const resto = FUENTE.slice(k + 1).replace(/^\s*(\/\/[^\n]*\n\s*)*/, '')
      if (/^[.?:+|&)\]]/.test(resto)) continue
    }
    return txt
  }
  return null
}

// Las plantillas SIN HTML propio cuyo valor TERMINA en un innerHTML: las que
// devuelve una flecha o un return, y las que son una hoja de la asignación
// (`x.innerHTML = cond ? `${a}` : ''`). El escáner no las marca "en HTML",
// porque no tienen un '<' propio, pero lo que imprimen llega a la página igual.
// Una plantilla guardada en una variable NO entra acá: esa variable aparece
// como hoja donde se usa y se clasifica ahí.
const esHtmlT = (x) => { for (let c = x; c; c = c.padre) if (c.esHtmlPropio) return true; return false }
function plantillasSinHtml(expr) {
  const out = []
  let t
  try { t = analizar(expr, 0, expr).templates } catch { t = [] }
  for (const x of t) {
    if (esHtmlT(x)) continue
    if (/(=>|return)\s*$/.test(expr.slice(0, x.inicio))) out.push(x)
  }
  for (const h of hojas(expr)) {
    if (!/^`/.test(h)) continue
    let th
    try { th = analizar(h, 0, h).templates } catch { continue }
    const raiz = th.find(x => x.inicio === 0)
    if (raiz && !esHtmlT(raiz)) out.push(raiz)
  }
  return out
}

if (SOLO !== 'render') {
  const r = interpolaciones(ARCHIVO)
  const rangos = []
  for (const m of FUENTE.matchAll(/(?:^|\n)(\s*)(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g)) {
    const nombre = m[2]
    const ini = m.index + m[0].indexOf('function')
    const abre = FUENTE.indexOf('(', ini)
    const params = cuerpoDesde(FUENTE, abre)
    const llave = FUENTE.indexOf('{', abre + params.length)
    const cuerpo = cuerpoDesde(FUENTE, llave)
    const desde = FUENTE.slice(0, ini).split('\n').length
    rangos.push({ nombre, desde, hasta: desde + FUENTE.slice(ini, llave + cuerpo.length).split('\n').length - 1 })
  }
  const funcionDe = (linea) => {
    let mejor = null
    for (const g of rangos) if (linea >= g.desde && linea <= g.hasta && (!mejor || g.hasta - g.desde < mejor.hasta - mejor.desde)) mejor = g
    return mejor ? mejor.nombre : '(top-level)'
  }

  const enHtml = r.interpolaciones.filter(i => i.html)
  const malas = []
  for (const x of enHtml) {
    const fn = funcionDe(x.linea)
    for (const h of hojas(x.expr)) if (!motivoHoja(h, fn)) malas.push(`línea ${x.linea} (${fn}): ${norm(h).slice(0, 120)}`)
  }
  chk('estático: ninguna interpolación de HTML queda sin escapar ni justificar', malas.length === 0, '\n      ' + malas.join('\n      '))

  const malasAsig = []
  const asignaciones = r.asignaciones.map(a => ({ ...a, expr: expresionCompleta(a.linea) ?? a.expr }))
  for (const a of asignaciones) {
    const fn = funcionDe(a.linea)
    for (const h of hojas(a.expr)) if (!motivoHoja(h, fn)) malasAsig.push(`línea ${a.linea} (${fn}): ${norm(h).slice(0, 120)}`)
  }
  chk('estático: ninguna asignación a innerHTML queda sin escapar ni justificar', malasAsig.length === 0, '\n      ' + malasAsig.join('\n      '))

  const malasSinHtml = []
  for (const a of asignaciones) {
    const fn = funcionDe(a.linea)
    for (const x of plantillasSinHtml(a.expr)) {
      for (const it of x.interpolaciones) {
        for (const h of hojas(it.expr)) if (!motivoHoja(h, fn)) malasSinHtml.push(`línea ${a.linea} (${fn}): ${norm(h).slice(0, 120)}`)
      }
    }
  }
  chk('estático: las plantillas SIN HTML propio que terminan en un innerHTML están escapadas o justificadas',
    malasSinHtml.length === 0, '\n      ' + malasSinHtml.join('\n      '))
  // Control del control: sobre una asignación inventada, el chequeo de arriba
  // tiene que encontrar la hoja cruda. Si no la encuentra, no está mirando.
  const prueba1 = plantillasSinHtml("items.map(i => `${i.crudo}`).join('')")
  const prueba2 = plantillasSinHtml("cond ? `Hola ${x.crudo}` : ''")
  chk('estático: el chequeo de plantillas sin HTML propio encuentra la hoja cruda de un map de prueba',
    prueba1.length === 1 && prueba1[0].interpolaciones.some(it => it.expr.trim() === 'i.crudo'))
  chk('estático: el chequeo de plantillas sin HTML propio encuentra la hoja cruda de una asignación directa de prueba',
    prueba2.length === 1 && prueba2[0].interpolaciones.some(it => it.expr.trim() === 'x.crudo'))

  chk('estático: el escáner encontró interpolaciones en HTML', enHtml.length > 250, `solo ${enHtml.length}`)
  chk('estático: el escáner encontró las asignaciones a innerHTML', r.asignaciones.length >= 60, `solo ${r.asignaciones.length}`)
  chk('estático: hay escapes de verdad, no todo justificado por lista', enHtml.filter(i => /^esc\(/.test(i.expr.trim())).length > 150)
  const huerfanas = [
    ...Object.entries(SEGURAS).flatMap(([fn, t]) => Object.keys(t).map(k => fn + '::' + norm(k))),
    ...Object.entries(SEGURAS_REGEX).flatMap(([fn, t]) => t.map(([re]) => fn + '::' + re)),
  ].filter(k => !USADAS.has(k))
  chk('estático: ninguna hoja de la lista de seguras quedó huérfana', huerfanas.length === 0, huerfanas.join(' | '))

  // ── Contexto ─────────────────────────────────────────────────────────────
  const sinComillas = [], enEvento = [], enUrl = [], enStyle = []
  for (const x of enHtml) {
    const ultimaEtiqueta = x.antes.lastIndexOf('<')
    if (ultimaEtiqueta < x.antes.lastIndexOf('>')) continue
    const tramo = x.antes.slice(ultimaEtiqueta)
    const dentroDeAtributo = (tramo.match(/"/g) || []).length % 2 === 1
    if (!dentroDeAtributo && /[\w-]+\s*=\s*$/.test(tramo)) sinComillas.push(x.linea)
    if (!dentroDeAtributo) continue
    const attr = (tramo.match(/([\w-]+)\s*=\s*"[^"]*$/) || [])[1] || ''
    const e = x.expr.trim()
    if (/^on/i.test(attr)) enEvento.push(`${x.linea} (${attr})`)
    if (/^(href|src|action|formaction|xlink:href)$/i.test(attr) && !/^encodeURIComponent\(/.test(e)) enUrl.push(`${x.linea} (${attr}: ${e})`)
    if (/^style$/i.test(attr)) enStyle.push(`${x.linea}: ${e}`)
  }
  chk('estático: ninguna interpolación cae en un atributo SIN comillas', sinComillas.length === 0, sinComillas.join(', '))
  chk('estático: ninguna interpolación cae dentro de un on*=', enEvento.length === 0, enEvento.join(', '))
  chk('estático: ninguna interpolación cae en un href/src sin encodeURIComponent', enUrl.length === 0, enUrl.join(', '))
  chk('estático: ninguna interpolación cae en un style', enStyle.length === 0, enStyle.join(', '))

  // Otros sinks que el escáner no mira.
  const script = scriptModulo(ARCHIVO)
  chk('estático: no hay insertAdjacentHTML, outerHTML, document.write ni innerHTML +=',
    !/insertAdjacentHTML|\.outerHTML\s*=|document\.write|innerHTML\s*\+=|createContextualFragment/.test(script))

  const utils = require('fs').readFileSync(path.join(RAIZ, 'js/utils.js'), 'utf8')
  chk('control: los toasts de js/utils.js usan textContent y no innerHTML',
    /toast\.textContent\s*=/.test(utils) && !/toast\.innerHTML\s*=/.test(utils))

  if (process.env.INFORME) {
    console.log(`INFORME: ${r.interpolaciones.length} interpolaciones, ${enHtml.length} en HTML, ${r.asignaciones.length} asignaciones a innerHTML`)
  }
}

fin()
