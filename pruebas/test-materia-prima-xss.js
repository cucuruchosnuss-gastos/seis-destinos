// Barrido de escapado de modulos/materia-prima.html (Ingreso) — el archivo
// ENTERO, no solo las funciones del circuito.
//
// DOS MITADES, y ninguna reemplaza a la otra (mismo método que
// test-cobranzas-xss.js):
//  1. EJECUTA los renders con un document falso y una MARCA DISTINTA POR CAMPO
//     (`"><b data-xss="campo">`). Es lo único que prueba que esc() existe y
//     que escapa el argumento correcto.
//  2. CHEQUEO ESTÁTICO sobre TODO el <script>: cada ${...} de una plantilla
//     que arma HTML —y cada asignación a innerHTML— tiene que estar escapada o
//     figurar en la lista de seguras CON SU MOTIVO. La lista es POR FUNCIÓN: un
//     `${texto}` seguro en renderizarListaIngresos no justifica un `${texto}`
//     en otra función. Una interpolación nueva sin escapar pone esto en rojo
//     nombrando la expresión, la función y la línea.
//
// Las funciones del sandbox se juntan por CLAUSURA: se arranca de los renders
// y se suman todas las funciones y constantes del archivo que nombran, así que
// se ejecuta el código real de cada helper y no una copia.
//
//   node pruebas/test-materia-prima-xss.js
//   ARCHIVO_TEST=otra-copia.html node pruebas/test-materia-prima-xss.js
//   SOLO=render | SOLO=estatico

const path = require('path')
const { construirCon, scriptModulo } = require('./sandbox')
const { arnes, marca, escapada, chequearMarcas, leer } = require('./circuito-comun')
const { interpolaciones, analizar } = require('./escaner-interpolaciones')
const { clasificar, partirTopLevel } = require('./clasificar')
const { extraerFn, cuerpoDesde } = require('./extraer')
const { fuenteNumeros } = require('./numeros-comun')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/materia-prima.html')
const SOLO = process.env.SOLO || ''
const FUENTE = leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

// ══════════════════════════════════════════════════════════════════════════
// 1. RENDERS EJECUTADOS
// ══════════════════════════════════════════════════════════════════════════

// Lo que el preludio define: NO se extrae del archivo aunque exista (son
// llamadas a la red, al DOM real o a cableados de eventos, que acá no aportan).
const STUBS = new Set([
  'asegurarEmpleados', 'enlazarReintentosCircuito', 'cablearItems', 'cablearItemsInternos',
  'actualizarPendientesInternos', 'renderizarBloquesCircuito', 'abrirDetalleInterno',
  'formatearFecha', 'mostrarError', 'mostrarExito',
  // De una sola línea: extraerFn las rechaza por sospechosas. Copia literal.
  'nuevoUid',
])
const CONSTANTES_EXCLUIDAS = new Set(['estado', 'campoTotal', 'listaPagado'])

const RENDERS = [
  'chipTipoDoc', 'renderizarChipsUnidadIngresos', 'renderizarChipsVinculoIngresos',
  'renderizarListaIngresos', 'abrirDetalleTransferenciaRecibida', 'abrirDetalleIngreso',
  'renderizarSugerenciasProveedor', 'renderizarProveedorParecidos', 'renderizarProveedorDetectado',
  'renderizarAvisoDuplicado', 'renderizarRemitos', 'htmlSugerenciasCatalogo', 'htmlCategoriaNueva',
  'htmlItemCerrado', 'htmlItemAbierto', 'renderizarConfirmacion', 'renderizarInternos',
  'htmlFilaInterno', 'renderizarResumenInterno', 'renderizarItemsInternos',
  'actualizarSumaMixtaEnVivo', 'htmlResultadoCircuito', 'rutaFotoMp', 'esc', 'itemVacio',
  'renderizarProgresoWz', 'renderizarTogglesTipoDoc', 'poblarSelectUnidades',
]

function clausura(src) {
  const nombresFn = new Set([...src.matchAll(/(?:^|\n)\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g)].map(m => m[1]))
  const nombresConst = new Set([...src.matchAll(/\n {4}const ([A-Za-z_$][\w$]*) = /g)].map(m => m[1]))
  for (const c of CONSTANTES_EXCLUIDAS) nombresConst.delete(c)
  const fns = new Set(), consts = new Set()
  const cola = [...RENDERS]
  while (cola.length) {
    const n = cola.shift()
    if (fns.has(n) || STUBS.has(n)) continue
    let texto
    try { texto = extraerFn(src, n) } catch (e) { chk(`existe la función ${n}`, false, e.message); continue }
    fns.add(n)
    for (const m of texto.matchAll(/[A-Za-z_$][\w$]*/g)) {
      const id = m[0]
      if (nombresFn.has(id) && !fns.has(id) && !STUBS.has(id)) cola.push(id)
      if (nombresConst.has(id) && !consts.has(id)) {
        consts.add(id)
        // Las constantes que son flechas (puedePasarAlCircuito…) nombran
        // funciones: también entran.
        const def = src.slice(src.indexOf(`\n    const ${id} = `), src.indexOf(`\n    const ${id} = `) + 600)
        for (const k of def.split('\n')[1].matchAll(/[A-Za-z_$][\w$]*/g)) if (nombresFn.has(k[0])) cola.push(k[0])
      }
    }
  }
  return { funciones: [...fns], constantes: [...consts] }
}

const PRELUDIO = `
  ${fuenteNumeros()}
  function nuevoEl(id) {
    return {
      id, innerHTML: '', textContent: '', value: '', className: '', hidden: false, checked: false, disabled: false,
      dataset: {}, querySelector: (s) => (__qs[s] || null), querySelectorAll: () => [], addEventListener(){}, focus(){},
      removeAttribute(k) { if (k === 'hidden') this.hidden = false },
      classList: { add(){}, remove(){}, toggle(){} },
    }
  }
  var __qs = {}
  var __els = new Map()
  var document = {
    getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) },
    querySelectorAll: () => [], querySelector: () => null,
  }
  var window = { scrollTo(){} }
  var __llamadas = { errores: [], exitos: [] }
  var __itemsDetalle = []
  var supabase = {
    from() {
      const q = { select: () => q, eq: () => q, in: () => q, order: () => q,
        then(res) { return Promise.resolve({ data: __itemsDetalle, error: null }).then(res) } }
      return q
    },
    rpc: async () => ({ data: null, error: null }),
  }
  function mostrarError(m) { __llamadas.errores.push(m) }
  function mostrarExito(m) { __llamadas.exitos.push(m) }
  // formatearFecha de js/utils.js, con su cuerpo real (dos líneas).
  function formatearFecha(fecha) { const [anio, mes, dia] = fecha.split('-'); return dia + '/' + mes + '/' + anio }
  async function asegurarEmpleados() {}
  function enlazarReintentosCircuito() {}
  function cablearItems() {}
  function cablearItemsInternos() {}
  function actualizarPendientesInternos() {}
  function renderizarBloquesCircuito() {}
  function abrirDetalleInterno() {}
  var contadorUid = 0
  function nuevoUid() { return 'it' + (++contadorUid) }
  var estado = {
    miRolApp: 'usuario', misTareas: new Set(['materia_prima:cargar']),
    unidades: [], proveedores: [], empleados: [], entregas: [], catalogoInsumos: [],
    filtros: { ingresos: { busqueda: '', unidadId: '', vinculo: '' } },
    remitosFacturados: new Set(), fechaInicioCircuito: '2026-10-01', resultadoCircuito: null,
    transito: [], unidadesRecepcion: [], recepcion: null, wizard: null,
  }
`

const RETORNO = 'estado, __els, __el(id){ return document.getElementById(id) }, __llamadas, __setItems(x){ __itemsDetalle = x }, __setQs(x){ __qs = x }'

if (SOLO !== 'estatico') {
  let S
  try {
    const { funciones, constantes } = clausura(scriptModulo(ARCHIVO))
    S = construirCon(ARCHIVO, { preludio: PRELUDIO, funciones, constantes, retorno: RETORNO })
  } catch (e) {
    chk('el sandbox se arma con las funciones reales del archivo', false, String(e && e.stack || e))
  }
  if (S) correrRenders(S)
}

function correrRenders(S) {
  const el = (id) => S.__el(id)
  const E = S.estado

  // ── esc y rutaFotoMp ────────────────────────────────────────────────────────
  for (const [crudo, esperado] of [['&', '&amp;'], ['<', '&lt;'], ['>', '&gt;'], ['"', '&quot;'], ["'", '&#39;']]) {
    chk(`esc escapa ${crudo}`, S.esc(crudo) === esperado, S.esc(crudo))
  }
  chk('esc no convierte null en la palabra null', S.esc(null) === '' && S.esc(undefined) === '')
  // Desde la fase 2 de las fotos ningún valor de la base va a un href: el
  // detalle dibuja un botón con la RUTA (escapada) y la URL se firma al tocar.
  // rutaFotoMp() es la que decide qué es una ruta del bucket; la suite
  // test-materia-prima-fotos.js la prueba entera, acá solo lo que toca al XSS.
  if (!S.rutaFotoMp) { chk('existe rutaFotoMp()', false); S.rutaFotoMp = () => null }
  for (const malo of ['javascript:alert(1)', ' JavaScript:alert(1)', 'data:text/html,<b>', 'http://x/y', '//x/y', 'https://x/"onmouseover=1', 'https://x/<b>', 'uid/mp/"onmouseover=1', '', null]) {
    chk(`rutaFotoMp rechaza ${JSON.stringify(malo)}`, S.rutaFotoMp(malo) === null, S.rutaFotoMp(malo))
  }
  const buena = 'https://xtorxouhzuizdvawqakb.supabase.co/storage/v1/object/sign/comprobantes/u1/mp/a.jpg?token=SECRETO&y=1'
  chk('rutaFotoMp extrae la ruta de una URL firmada vieja', S.rutaFotoMp(buena) === 'u1/mp/a.jpg', S.rutaFotoMp(buena))

  // ── chipTipoDoc con un tipo que no está en TIPOS_DOC ─────────────────────
  chequearMarcas(chk, 'chipTipoDoc (tipo desconocido)', S.chipTipoDoc(marca('tipo_doc')), ['tipo_doc'])

  // ── Chips de unidad del listado ──────────────────────────────────────────
  E.unidades = [{ id: marca('unidad_id'), nombre: marca('unidad_nombre') }, { id: 'u-dest', nombre: marca('unidad_destino') }]
  S.renderizarChipsUnidadIngresos()
  chequearMarcas(chk, 'renderizarChipsUnidadIngresos', el('chips-unidad-ingresos').innerHTML, ['unidad_id', 'unidad_nombre'])

  // ── Listado ──────────────────────────────────────────────────────────────
  E.entregas = [
    {
      base: { id: 'i1', fecha: '2026-10-02', razon_social: marca('razon_social'), unidad_negocio_id: marca('unidad_id'), itemsQueSuman: 1 },
      comprobantes: [{ id: 'i1', tipo_doc: marca('tipo_doc_listado') }], remitosVinculados: [], cantidadItems: 2,
      esTransferencia: false, tieneDiferencias: true,
    },
    {
      base: { id: 't1', fecha: '2026-10-03', razon_social: marca('origen_transf'), unidad_negocio_id: 'u-dest' },
      comprobantes: [], remitosVinculados: [], cantidadItems: 1, esTransferencia: true,
    },
  ]
  S.renderizarListaIngresos()
  chequearMarcas(chk, 'renderizarListaIngresos', el('lista-ingresos').innerHTML,
    ['razon_social', 'tipo_doc_listado', 'origen_transf', 'unidad_destino', 'unidad_nombre'])

  // ── Detalle de una transferencia recibida ────────────────────────────────
  E.empleados = [{ id: 'e1', nombre: marca('recibido_por') }, { id: 'e2', nombre: marca('cargado_por') }, { id: 'e3', nombre: marca('editado_por') }]
  esperas.push((async () => {
    await S.abrirDetalleTransferenciaRecibida({
      base: { id: 't1', fecha: '2026-10-03', respondido_por: 'e1' }, origenId: marca('unidad_id'), destinoId: 'u-dest',
      observaciones: marca('observaciones'),
      items: [{
        insumos: { nombre: marca('insumo_nombre'), marca: marca('insumo_marca'), aclaracion: marca('aclaracion'), unidad_medida: marca('unidad_medida') },
        lote: marca('lote'), contenido_por_bulto: 5, cantidad_enviada: 10, cantidad_recibida: 8, motivo_diferencia: marca('motivo'),
      }],
    })
    chequearMarcas(chk, 'detalle de transferencia (cabecera)', el('detalle-meta').innerHTML, ['unidad_nombre', 'recibido_por', 'observaciones'])
    chequearMarcas(chk, 'detalle de transferencia (renglones)', el('detalle-items').innerHTML,
      ['insumo_nombre', 'insumo_marca', 'aclaracion', 'unidad_medida', 'lote', 'motivo'])

    // ── Detalle de un ingreso con comprobantes ─────────────────────────────
    E.entregas.push({
      base: { id: 'i9', fecha: '2026-10-02', razon_social: 'X', nombre_fantasia: marca('fantasia'), unidad_negocio_id: marca('unidad_id') },
      comprobantes: [
        { id: 'i9', tipo_doc: marca('tipo_doc_detalle'), numero_doc: marca('numero_doc'), fecha: '2026-10-02', empleado_id: 'e2',
          editado_por: 'e3', editado_en: '2026-10-02T10:00:00Z', foto_url: 'javascript:alert(document.cookie)' },
        { id: 'i8', tipo_doc: 'remito', numero_doc: '1', fecha: '2026-10-01', empleado_id: 'e2', foto_url: buena },
      ],
      remitosVinculados: [], cantidadItems: 1, esTransferencia: false,
    })
    S.__setItems([
      { id: 'x1', cantidad: 8, lote: marca('lote_detalle'), lote_ilegible: false, cantidad_bultos: 2, contenido_por_bulto: 4,
        cantidad_documento: 10, motivo_diferencia: marca('motivo_detalle'), ya_recibido_con_remito: false,
        insumos: { nombre: marca('insumo_detalle'), marca: marca('marca_detalle'), unidad_medida: marca('unidad_detalle'), tipo: 'materia_prima' } },
      { id: 'x2', cantidad: 7, lote: null, lote_ilegible: false, cantidad_bultos: null, contenido_por_bulto: null, contenido_documento: 2,
        ya_recibido_con_remito: false, insumos: { nombre: 'Y', unidad_medida: marca('unidad_incompleto'), tipo: 'insumo' } },
    ])
    await S.abrirDetalleIngreso('i9')
    chequearMarcas(chk, 'detalle de ingreso (cabecera)', el('detalle-meta').innerHTML, ['fantasia', 'unidad_nombre'])
    const comp = el('detalle-comprobantes').innerHTML
    chequearMarcas(chk, 'detalle de ingreso (comprobantes)', comp, ['tipo_doc_detalle', 'numero_doc', 'cargado_por', 'editado_por'])
    chk('detalle de ingreso: una foto_url javascript: NO se enlaza', !/javascript/i.test(comp) && comp.includes('Foto no disponible'))
    chk('detalle de ingreso: la foto vieja va como botón con su RUTA, sin href', comp.includes('data-ruta-foto="u1/mp/a.jpg"') && !/href=/i.test(comp))
    chk('detalle de ingreso: el token de la URL vieja NO aparece en la página', !comp.includes('SECRETO'))
    chequearMarcas(chk, 'detalle de ingreso (renglones)', el('detalle-items').innerHTML,
      ['lote_detalle', 'motivo_detalle', 'insumo_detalle', 'marca_detalle', 'unidad_detalle', 'unidad_incompleto'])
  })())

  // ── Proveedor: buscador del padrón, parecidos y el aviso ─────────────────
  const prov = { id: marca('prov_id'), razon_social: 'acme ' + marca('prov_razon'), nombre_fantasia: marca('prov_fant'), cuit: marca('prov_cuit') }
  E.proveedores = [prov]
  E.wizard = { proveedorParecidos: [prov], proveedorMatch: null, cuitOcr: null,
    encabezado: { tipoDoc: 'factura_a', numeroDoc: marca('wz_numero'), razonSocial: marca('wz_razon'), fecha: '2026-10-02', unidadId: marca('unidad_id') },
    remitosVinculadosIds: [], items: [], duplicados: [], histPresentaciones: new Map() }
  el('campo-buscar-proveedor').value = 'acme'
  S.renderizarSugerenciasProveedor()
  chequearMarcas(chk, 'buscador de proveedor (resultados)', el('wz-sugerencias-proveedor').innerHTML, ['prov_id', 'prov_razon', 'prov_fant', 'prov_cuit'])
  el('campo-buscar-proveedor').value = marca('termino_proveedor')
  S.renderizarSugerenciasProveedor()
  chequearMarcas(chk, 'buscador de proveedor (sin resultados)', el('wz-sugerencias-proveedor').innerHTML, ['termino_proveedor'])

  S.renderizarProveedorParecidos()
  chequearMarcas(chk, 'parecidos de proveedor', el('wz-proveedor-parecidos').innerHTML, ['prov_id', 'prov_razon', 'prov_fant', 'prov_cuit'])

  el('campo-razon-social').value = 'algo'
  E.wizard.proveedorParecidos = []
  E.wizard.proveedorMatch = { razon_social: marca('prov_match') }
  S.renderizarProveedorDetectado()
  chequearMarcas(chk, 'proveedor identificado', el('wz-proveedor-detectado').innerHTML, ['prov_match'])
  E.wizard.proveedorMatch = null
  E.wizard.cuitOcr = marca('cuit_ocr')
  S.renderizarProveedorDetectado()
  chequearMarcas(chk, 'proveedor nuevo con CUIT leído', el('wz-proveedor-detectado').innerHTML, ['cuit_ocr'])

  // ── Duplicados ───────────────────────────────────────────────────────────
  E.wizard.duplicados = [
    { modulo: marca('modulo'), numero_doc: marca('dup_numero'), razon_social: marca('dup_razon'), fecha: '2026-10-01', unidad_negocio_id: marca('unidad_id'), importe: null },
    { modulo: 'gastos', numero_doc: 'N', razon_social: 'R', fecha: '2026-10-01', unidad_negocio_id: 'u-dest', importe: 1500 },
  ]
  S.renderizarAvisoDuplicado()
  chequearMarcas(chk, 'aviso de duplicados', el('wz-duplicado').innerHTML, ['dup_numero', 'dup_razon', 'unidad_nombre', 'unidad_destino'])
  chk('aviso de duplicados: el módulo desconocido NO se imprime', !el('wz-duplicado').innerHTML.includes('data-xss=&quot;modulo'))

  // ── Remitos vinculables ──────────────────────────────────────────────────
  S.renderizarRemitos([{ id: marca('remito_id'), fecha: '2026-10-01', numero_doc: marca('remito_numero'), razon_social: marca('remito_razon'),
    items: [{ nombre: marca('remito_item'), marca: marca('remito_marca'), cantidad: 5, unidad: marca('remito_unidad') }] }])
  chequearMarcas(chk, 'remitos vinculables', el('wz-lista-remitos').innerHTML,
    ['remito_id', 'remito_numero', 'remito_razon', 'remito_item', 'remito_marca', 'remito_unidad'])

  // ── Catálogo: sugerencias y categorías ───────────────────────────────────
  E.catalogoInsumos = [{ id: marca('insumo_id'), nombre: 'caja ' + marca('cat_nombre'), marca: marca('cat_marca'), unidad_medida: marca('cat_unidad'),
    tipo: 'insumo', categoria: marca('cat_categoria'), activo: true, estado_alta: 'activo' }]
  chequearMarcas(chk, 'sugerencias de catálogo', S.htmlSugerenciasCatalogo('caja'), ['insumo_id', 'cat_nombre', 'cat_marca', 'cat_unidad'])
  chequearMarcas(chk, 'categoría del producto nuevo', S.htmlCategoriaNueva({ categoria: null }), ['cat_categoria'])

  // ── Tarjetas de ítem ─────────────────────────────────────────────────────
  const base = S.itemVacio()
  const nuevo = Object.assign(S.itemVacio(), {
    esNuevo: true, creando: true, nombre: marca('item_nombre'), marca: marca('item_marca'), unidadMedida: marca('item_unidad'),
    textoOriginal: marca('item_papel'), busquedaCatalogo: marca('item_busqueda'), tipo: 'materia_prima', lote: marca('item_lote'),
    difiere: true, motivoDiferencia: marca('item_motivo'), interpretacion: 'granel', numeroPapel: 10, cantidad: 8, cantidadDocumento: 10,
    cantidadOcrOriginal: 12, fichaTecnicaUrl: 'x', nombreFicha: marca('item_ficha'), fotoLoteUrl: 'y', nombreFotoLote: marca('item_foto_lote'),
  })
  chequearMarcas(chk, 'tarjeta cerrada', S.htmlItemCerrado(nuevo), ['item_nombre', 'item_marca', 'item_lote', 'item_unidad'])
  const abierto = S.htmlItemAbierto(nuevo)
  chequearMarcas(chk, 'tarjeta abierta (producto nuevo)', abierto,
    ['item_nombre', 'item_marca', 'item_unidad', 'item_papel', 'item_busqueda', 'item_lote', 'item_motivo', 'item_ficha', 'item_foto_lote', 'cat_categoria'])

  const alias = Object.assign(S.itemVacio(), {
    esNuevo: false, creando: false, insumoId: 'ins-1', porAlias: true, textoOriginal: marca('alias_papel'), nombre: marca('alias_nombre'),
    marca: marca('alias_marca'), unidadMedida: marca('alias_unidad'), pendienteRevision: true, tipo: 'insumo',
    interpretacion: 'bultos', numeroPapel: 10, contenido: 25, cantidad: 250, difiere: true, cantidadDocumento: 250, recibidoEnUnidades: false,
  })
  E.wizard.histPresentaciones = new Map([['ins-1', { interpretacion: 'bultos', presentaciones: [{ contenido: 25, veces: 3 }, { contenido: 50, veces: 1 }] }]])
  chequearMarcas(chk, 'tarjeta abierta (resuelta por alias, en bultos)', S.htmlItemAbierto(alias),
    ['alias_papel', 'alias_nombre', 'alias_marca', 'alias_unidad'])
  alias.recibidoEnUnidades = true
  chequearMarcas(chk, 'tarjeta abierta (recibido en unidades)', S.htmlItemAbierto(alias), ['alias_unidad'])

  const mixto = Object.assign(S.itemVacio(), {
    esNuevo: false, insumoId: 'ins-2', nombre: 'M', unidadMedida: marca('mixto_unidad'), tipo: 'insumo',
    interpretacion: 'unidades', numeroPapel: 300, lineas: [{ bultos: 2, contenido: 100 }, { bultos: 1, contenido: 100 }],
  })
  chequearMarcas(chk, 'tarjeta abierta (presentación mixta)', S.htmlItemAbierto(mixto), ['mixto_unidad'])
  const unidades = Object.assign(S.itemVacio(), {
    esNuevo: false, insumoId: 'ins-1', nombre: 'U', unidadMedida: marca('unid_unidad'), tipo: 'insumo',
    interpretacion: 'unidades', numeroPapel: 7, bultosPapel: 2, cantidad: 7,
  })
  chequearMarcas(chk, 'tarjeta abierta (unidades que no reparten)', S.htmlItemAbierto(unidades), ['unid_unidad'])

  // La suma en vivo de la presentación mixta.
  const caja = { innerHTML: '', classList: { toggle(){} } }
  S.actualizarSumaMixtaEnVivo({ querySelector: () => caja }, mixto)
  chequearMarcas(chk, 'suma mixta en vivo', caja.innerHTML, ['mixto_unidad'])

  // ── Confirmación ─────────────────────────────────────────────────────────
  E.wizard.items = [nuevo]
  E.wizard.remitosVinculadosIds = []
  S.renderizarConfirmacion()
  chequearMarcas(chk, 'confirmación (resumen)', el('wz-resumen').innerHTML, ['wz_numero', 'wz_razon', 'unidad_nombre'])
  chequearMarcas(chk, 'confirmación (ítems)', el('wz-detalle-items').innerHTML, ['item_nombre', 'item_marca', 'item_lote', 'item_unidad'])

  // ── Recepción de transferencias ──────────────────────────────────────────
  E.unidadesRecepcion = [{ id: 'a' }, { id: 'b' }]
  E.transito = [{ id: marca('transito_id'), origen_nombre: marca('transito_origen'), destino_nombre: marca('transito_destino'),
    fecha: marca('transito_fecha'), items: 2, dias_en_transito: 3, unidad_destino_id: 'a' }]
  S.renderizarInternos()
  chequearMarcas(chk, 'recepción (lista)', el('lista-internos').innerHTML, ['transito_id', 'transito_origen', 'transito_destino', 'transito_fecha'])
  E.recepcion = {
    cabecera: E.transito[0],
    items: [
      { id: 'r1', nombre: marca('rec_nombre'), marca: marca('rec_marca'), aclaracion: marca('rec_aclaracion'), unidad: marca('rec_unidad'),
        lote: marca('rec_lote'), contenido: null, enviada: 5, bultos: null, fraccion: 0, cantidadBase: 3, motivo: marca('rec_motivo'), error: null },
      { id: 'r2', nombre: 'Z', marca: '', aclaracion: null, unidad: 'kg', lote: null, contenido: 5, enviada: 10, bultos: null, fraccion: 0,
        cantidadBase: null, motivo: '', error: marca('rec_error') },
    ],
  }
  S.renderizarResumenInterno()
  chequearMarcas(chk, 'recepción (cabecera)', el('internos-resumen').innerHTML, ['transito_origen', 'transito_destino', 'transito_fecha'])
  S.renderizarItemsInternos()
  chequearMarcas(chk, 'recepción (renglones)', el('internos-items').innerHTML,
    ['rec_nombre', 'rec_marca', 'rec_aclaracion', 'rec_unidad', 'rec_lote', 'rec_motivo', 'rec_error'])

  // ── Resultado del circuito ───────────────────────────────────────────────
  const res = S.htmlResultadoCircuito({ nivel: marca('nivel'), lineas: [marca('linea_circuito')] })
  chequearMarcas(chk, 'resultado del circuito', res, ['linea_circuito'])
  chk('resultado del circuito: un nivel desconocido cae a neutro', res.includes('circuito-mp--neutro') && !res.includes('nivel'))

  // ── Selector de unidades del wizard ──────────────────────────────────────
  S.poblarSelectUnidades()
  chequearMarcas(chk, 'selector de unidades del wizard', el('campo-unidad-negocio').innerHTML, ['unidad_id', 'unidad_nombre'])
}

// ══════════════════════════════════════════════════════════════════════════
// 2. CHEQUEO ESTÁTICO — TODO el <script>
// ══════════════════════════════════════════════════════════════════════════

// Hojas seguras, POR FUNCIÓN y con su motivo. Cada una verificada leyendo el
// código (y contra la base, las de columnas). Una hoja que no esté acá ni pase
// por regla pone la suite en rojo NOMBRÁNDOLA.
const HTML_PROPIO = 'HTML armado más arriba en la misma función, con esc() de cada dato'
const SEGURAS = {
  chipTipoDoc: {
    't.bg': 'constante: color de TIPOS_DOC o literal del fallback',
    't.fg': 'constante: color de TIPOS_DOC o literal del fallback',
  },
  renderizarChipsVinculoIngresos: {
    'f.id': 'constante FILTROS_VINCULO', 'f.label': 'constante FILTROS_VINCULO',
  },
  renderizarListaIngresos: {
    DIAS_REMITO_VIEJO: 'constante numérica',
    texto: 'textoAntiguedad(): "hoy", "ayer" o "hace N días" con N entero',
    'b.id': 'uuid: materia_prima_ingresos.id / stock_transferencias.id son columnas uuid (verificado)',
    "e.comprobantes.map(c => chipTipoDoc(c.tipo_doc)).join('')": 'HTML de chipTipoDoc(), que escapa adentro',
    'e.remitosVinculados.length': 'número', chipAntiguedad: HTML_PROPIO,
    'e.cantidadItems': 'número: conteo calculado', 'e.base.itemsQueSuman': 'número: conteo calculado',
  },
  cablearItems: {
    'htmlSugerenciasCatalogo(item.busquedaCatalogo)': 'HTML de htmlSugerenciasCatalogo(), que escapa adentro',
  },
  renderizarInternos: {
    "filas.map(htmlFilaInterno).join('')":'HTML de htmlFilaInterno(), que escapa adentro',
  },
  renderizarPagadoSinIngresar: {
    'htmlPagadoSinIngresar(filas, { descarte: estado.descarte, puedeDescartar: puedeDescartarIngreso() })':
      'HTML de htmlPagadoSinIngresar(), que escapa adentro (verificado también en test-materia-prima-circuito.js)',
  },
  abrirDetalleIngreso: {
    'chipTipoDoc(c.tipo_doc)': 'HTML de chipTipoDoc(), que escapa adentro',
    'formatearFecha(c.fecha)': 'fecha: materia_prima_ingresos.fecha es date (verificado), sale dd/mm/aaaa',
    chip: HTML_PROPIO,
    "Number(item.cantidad_bultos).toLocaleString('es-AR')": 'número',
    desglose: HTML_PROPIO, loteHtml: HTML_PROPIO,
    'htmlDiferenciaDetalle(item, insumo)': 'HTML de htmlDiferenciaDetalle(), que escapa adentro',
  },
  htmlDiferenciaDetalle: { etiqueta: 'literal: "Faltaron" / "Sobraron"' },
  renderizarProgresoWz: { clase: 'clase CSS literal', 'p.label': 'constante PASOS_WIZARD' },
  renderizarTogglesTipoDoc: { clave: 'constante TIPOS_DOC_ELEGIBLES', 'TIPOS_DOC[clave].label': 'constante TIPOS_DOC' },
  renderizarProveedorParecidos: { fant: HTML_PROPIO, 'w.proveedorParecidos.length': 'número', opciones: HTML_PROPIO },
  renderizarAvisoDuplicado: {
    'o.chip': 'clase CSS de la constante ORIGENES_DUPLICADO o del literal `desconocido`',
    datos: 'HTML armado arriba con .map(esc)', 'filas.length': 'número', html: HTML_PROPIO,
  },
  htmlCategoriaNueva: { opciones: HTML_PROPIO },
  htmlItemCerrado: {
    'item.uid': 'nuevoUid(): "it" + contador', CHIP_NO_SUMA: 'HTML constante', chipLote: HTML_PROPIO,
  },
  htmlItemAbierto: {
    um: 'constante UNIDADES_MEDIDA', unidadHtml: 'esc(item.unidadMedida), arriba',
    input: 'parámetro de conSufijo: siempre un <input> literal de esta función',
    sufijo: 'parámetro de conSufijo: unidadHtml, etiquetaNumero (escapada) o el literal "bultos"',
    'conSufijo(inputNumero, unidadHtml)': 'HTML de conSufijo con partes seguras',
    'conSufijo(inputNumero, etiquetaNumero)': 'HTML de conSufijo; etiquetaNumero es literal o esc(item.unidadMedida)',
    inputNumero: 'HTML literal', selectorUnidad: 'HTML armado con UNIDADES_MEDIDA o unidadHtml',
    rotulo: 'parámetro de chipsPresentacion: siempre un literal del código',
    'conSufijo(`<input type="text" inputmode="decimal" autocomplete="off" data-campo="contenido" placeholder="0">`, unidadHtml)':
      'HTML de conSufijo: un <input> literal y unidadHtml',
    'conSufijo(`<input type="text" inputmode="decimal" autocomplete="off" data-campo="bultosPapel" placeholder="0">`, \'bultos\')':
      'HTML de conSufijo: un <input> literal y el literal "bultos"',
    n: 'número: índice del .map()', rotuloSuma: 'literal "bultos" o esc(item.unidadMedida)',
    resultadoHtml: HTML_PROPIO,
    "chipsPresentacion(usadas, 'Ya usadas con este proveedor')": 'HTML de chipsPresentacion, que escapa adentro',
    "chipsPresentacion(dividen, 'Presentaciones que reparten exacto')": 'HTML de chipsPresentacion, que escapa adentro',
    avisoFavorita: HTML_PROPIO, 'htmlCategoriaNueva(item)': 'HTML de htmlCategoriaNueva(), que escapa adentro',
    sugerenciasHtml: HTML_PROPIO, 'htmlSugerenciasCatalogo(item.busquedaCatalogo)': 'HTML de htmlSugerenciasCatalogo(), que escapa adentro',
    bloqueCrear: HTML_PROPIO, selectorRecibido: HTML_PROPIO, unidadRecibido: HTML_PROPIO,
    recibidoHtml: HTML_PROPIO, confirmacionApagado: HTML_PROPIO,
    'item.uid': 'nuevoUid(): "it" + contador', 'chipTipoInsumo(item)': 'HTML constante de chipTipoInsumo()',
    CHIP_NO_SUMA: 'HTML constante', marcaAlias: HTML_PROPIO, casillaYaRecibido: HTML_PROPIO,
    identidadHtml: HTML_PROPIO, avisoSinClasificar: 'HTML constante', cambiarProducto: 'HTML constante',
    avisoSinRevisar: HTML_PROPIO, cantidadHtml: HTML_PROPIO, bloqueDiferencia: HTML_PROPIO, loteHtml: HTML_PROPIO,
  },
  htmlResultadoCircuito: { nivel: 'validado contra la constante NIVELES_CIRCUITO', lineas: 'HTML armado arriba con esc() de cada línea' },
  htmlFilaInterno: { 'x.items': 'número: v_stock_en_transito.items es bigint (verificado)' },
  renderizarResumenInterno: { dias: 'número: Number(...) || 0', 'r.items.length': 'número' },
  renderizarItemsInternos: {
    idx: 'número: índice del .map()', 'f.valor': 'constante FRACCIONES_RECEPCION', 'f.texto': 'constante FRACCIONES_RECEPCION',
    entrada: HTML_PROPIO, resultado: HTML_PROPIO, motivo: HTML_PROPIO,
  },
  // Asignaciones directas a innerHTML que llaman a un render que escapa adentro.
  renderizarItems: {
    'w.items.map(item => item.uid === w.itemAbierto ? htmlItemAbierto(item) : htmlItemCerrado(item) ).join(\'\')': 'HTML de htmlItemAbierto/htmlItemCerrado, que escapan adentro',
  },
}
// Asignaciones que llaman a funciones que arman HTML y escapan adentro. Van
// POR FUNCIÓN igual que las hojas.
Object.assign(SEGURAS.abrirDetalleIngreso, {
  'htmlCircuitoDetalle(entrega, { resultado: estado.resultadoCircuito, fechaInicio: estado.fechaInicioCircuito, puedeReintentar: puedePasarAlCircuito(), })':
    'HTML de htmlCircuitoDetalle(), que escapa adentro (verificado también en test-materia-prima-circuito.js)',
})

const norm = (s) => s.replace(/\s+/g, ' ').trim()

// Un .map(... => `...`).join(''): la plantilla que devuelve la flecha se
// verifica aparte. Si arma HTML, sus interpolaciones ya están en la lista "en
// HTML" del escáner; si NO arma HTML (una que empieza con `${cond ? `<div…` :
// ''}`, por ejemplo), la verifica plantillasDevueltas() más abajo, que es la
// que cierra el hueco: sin ella, una plantilla sin '<' propio devuelta por un
// map que termina en innerHTML no la miraba nadie.
function esMapDePlantilla(expr) {
  const e = norm(expr)
  if (!/\.join\((''|"")\)$/.test(e)) return false
  return /\.map\(\s*\(?[\w\s,[\]]*\)?\s*=>\s*`/.test(e) ||
         /\.map\(\s*\(?[\w\s,[\]]*\)?\s*=>\s*\{.*return\s*`/.test(e)
}

// posicionesDeValor() de clasificar.js, con UNA diferencia: solo desenvuelve
// paréntesis que envuelven la expresión ENTERA. La de clasificar.js desenvuelve
// cualquier expresión que empiece con '(' si el interior parsea, y con
// `(items ?? []).map(…).join('') || '…'` el interior —`items ?? []).map(…) ||
// '…'`— parsea igual: la expresión se parte mal y la hoja `items` no significa
// nada. Queda anotado en el traspaso para quien sea dueño de ese helper.
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

// Qué entradas de SEGURAS se usaron: una que no se usa es un permiso huérfano.
const USADAS = new Set()

function motivoHoja(hoja, fn) {
  const c = clasificar(hoja, { escape: 'esc', seguras: [], segurasRegex: [] })
  if (c.ok) return c.motivos[0]
  if (esMapDePlantilla(hoja)) return 'plantilla anidada devuelta por un map: sus interpolaciones se verifican aparte'
  const tabla = SEGURAS[fn] || {}
  for (const [k, v] of Object.entries(tabla)) if (norm(k) === norm(hoja)) { USADAS.add(fn + '::' + norm(k)); return v }
  return null
}

// La expresión ENTERA asignada a un innerHTML. El escáner corta en el primer
// ';' o salto de línea donde lo leído parsea, y en un `filas.map(e => {` de
// varias líneas eso da un pedazo. Acá se corta en ';', '}' o salto de línea,
// y en un salto solo si el renglón siguiente no sigue la expresión (no empieza
// con '.', '?', ':', '+', '|', '&', ')' ni ']').
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

// El arreglo de líneas del detalle: `[a, b, …].filter(Boolean).join('<br>')`.
// Cada elemento es una hoja y se clasifica sola.
function hojasDeAsignacion(expr) {
  const e = norm(expr)
  const m = /^\[(.*)\]\.filter\(Boolean\)\.join\('<br>'\)$/.exec(e)
  if (m) return partirTopLevel(m[1], ',').map(s => s.trim()).filter(Boolean).flatMap(hojas)
  return hojas(expr)
}

if (SOLO !== 'render') {
  const r = interpolaciones(ARCHIVO)
  // Rango de líneas de cada función declarada en el archivo (incluidas las
  // anidadas): una hoja pertenece a la función MÁS CHICA que la contiene.
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
    for (const h of hojas(x.expr)) {
      if (!motivoHoja(h, fn)) malas.push(`línea ${x.linea} (${fn}): ${norm(h).slice(0, 120)}`)
    }
  }
  chk('estático: ninguna interpolación de HTML queda sin escapar ni justificar', malas.length === 0, '\n      ' + malas.join('\n      '))

  const malasAsig = []
  const asignaciones = r.asignaciones.map(a => ({ ...a, sink: true, expr: expresionCompleta(a.linea) ?? a.expr }))
  for (const a of asignaciones) {
    const fn = funcionDe(a.linea)
    for (const h of hojasDeAsignacion(a.expr)) {
      if (!motivoHoja(h, fn)) malasAsig.push(`línea ${a.linea} (${fn}): ${norm(h).slice(0, 120)}`)
    }
  }
  chk('estático: ninguna asignación a innerHTML queda sin escapar ni justificar', malasAsig.length === 0, '\n      ' + malasAsig.join('\n      '))

  // Las plantillas que DEVUELVE una flecha adentro de una asignación a
  // innerHTML y que no arman HTML propio: el escáner no las marca "en HTML",
  // pero lo que imprimen termina en la página igual. Se clasifican acá.
  const malasDevueltas = []
  let devueltas = 0
  for (const a of asignaciones) {
    const fn = funcionDe(a.linea)
    let t
    try { t = analizar(a.expr, 0, a.expr).templates } catch { continue }
    const esHtml = (x) => { for (let c = x; c; c = c.padre) if (c.esHtmlPropio) return true; return false }
    for (const x of t) {
      if (esHtml(x)) continue
      if (!/(=>|return)\s*$/.test(a.expr.slice(0, x.inicio))) continue
      devueltas++
      for (const it of x.interpolaciones) {
        for (const h of hojas(it.expr)) if (!motivoHoja(h, fn)) malasDevueltas.push(`línea ${a.linea} (${fn}): ${norm(h).slice(0, 120)}`)
      }
    }
  }
  chk('estático: las plantillas sin HTML propio que devuelve un map hacia innerHTML están escapadas o justificadas',
    malasDevueltas.length === 0, '\n      ' + malasDevueltas.join('\n      '))
  chk('estático: el chequeo de plantillas devueltas encontró al menos una (si no, no está mirando)', devueltas >= 1, String(devueltas))

  // El escáner tiene que estar VIENDO el archivo entero, no una versión
  // pelada a la que se le comió medio contenido.
  chk('estático: el escáner encontró interpolaciones en HTML', enHtml.length > 250, `solo ${enHtml.length}`)
  chk('estático: el escáner encontró las asignaciones a innerHTML', r.asignaciones.length >= 30, `solo ${r.asignaciones.length}`)
  chk('estático: hay escapes de verdad, no todo justificado por lista', enHtml.filter(i => /^esc\(/.test(i.expr.trim())).length > 100)
  // Toda entrada de la lista de seguras tiene que seguir existiendo: una
  // justificación huérfana es un permiso esperando a un código que no es el que
  // se revisó.
  const huerfanas = Object.entries(SEGURAS).flatMap(([fn, t]) => Object.keys(t).map(k => fn + '::' + norm(k))).filter(k => !USADAS.has(k))
  chk('estático: ninguna hoja de la lista de seguras quedó huérfana', huerfanas.length === 0, huerfanas.join(' | '))

  // ── En qué CONTEXTO del HTML cae cada interpolación ──────────────────────
  // esc alcanza para el contenido y para un atributo ENTRE COMILLAS. No alcanza
  // sin comillas, ni en un on*=, ni en un href/src (un javascript: no tiene
  // nada que esc() toque). En un href solo se acepta encodeURIComponent() o
  // nada más: desde la fase 2 de las fotos ningún valor de la base va a un href. En style, solo hojas de
  // la lista (constantes).
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
    if (/^style$/i.test(attr) && !(SEGURAS[funcionDe(x.linea)] || {})[e]) enStyle.push(`${x.linea}: ${e}`)
  }
  chk('estático: ninguna interpolación cae en un atributo SIN comillas', sinComillas.length === 0, sinComillas.join(', '))
  chk('estático: ninguna interpolación cae dentro de un on*=', enEvento.length === 0, enEvento.join(', '))
  chk('estático: ninguna interpolación cae en un href/src sin encodeURIComponent', enUrl.length === 0, enUrl.join(', '))
  chk('estático: en un style solo entran constantes de la lista', enStyle.length === 0, enStyle.join(', '))

  // Los toasts no son sink: usan textContent.
  const utils = require('fs').readFileSync(path.join(RAIZ, 'js/utils.js'), 'utf8')
  chk('control: los toasts de js/utils.js usan textContent y no innerHTML',
    /toast\.textContent\s*=/.test(utils) && !/toast\.innerHTML\s*=/.test(utils))
}

fin()
