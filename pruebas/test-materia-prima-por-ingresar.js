// "Facturas por ingresar" en modulos/materia-prima.html (24/09/2026): el
// circuito Ingreso ↔ Gastos ↔ Cuentas Corrientes en el OTRO sentido. Una
// factura de insumos que se cargó por Gastos o por Cuentas Corrientes y cuya
// mercadería nunca entró al stock:
//   · facturas_sin_ingreso() la lista (SECURITY DEFINER, por materia_prima:cargar);
//   · "Cargar lo que entró" llama a crear_ingreso_desde_comprobante({p_origen,
//     p_id}), que crea SOLO la cabecera ya vinculada;
//   · el wizard se abre en el modo "completar ingreso existente": la foto a la
//     vista, el OCR de materia prima sobre ESA foto, y al confirmar se insertan
//     SOLO los renglones con el ingreso_id de esa cabecera.
//   · un ingreso con 0 renglones y destino contable dice "Faltan los renglones".
//
// Se EJECUTA el código real (sandbox con supabase, storage, OCR y DOM falsos).
//
//   node pruebas/test-materia-prima-por-ingresar.js
//   ARCHIVO_TEST=otra-copia.html node pruebas/test-materia-prima-por-ingresar.js

const path = require('path')
const { construirCon, scriptModulo } = require('./sandbox')
const { arnes, marca, chequearMarcas, estaticoAcotado, leer } = require('./circuito-comun')
const { extraerFn } = require('./extraer')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/materia-prima.html')
const FUENTE = leer(ARCHIVO)
const SCRIPT = scriptModulo(ARCHIVO)
const { chk, esperas, fin } = arnes()

const AVISO = 'Estas son facturas de insumos que todavía no tienen ingreso. Si la mercadería ya está contada en el inventario, no la cargues: quedaría contada dos veces.'

const PRELUDIO = `
  function nuevoEl(id) {
    return {
      id, innerHTML: '', textContent: '', value: '', hidden: true, disabled: false, dataset: {},
      __img: null,
      querySelector(sel) {
        if (sel === 'img' && this.innerHTML.includes('<img')) return (this.__img = this.__img || { src: '' })
        return null
      },
      querySelectorAll: () => __tarjetas,
      removeAttribute(k) { if (k === 'hidden') this.hidden = false },
      addEventListener() {}, classList: { add(){}, remove(){}, toggle(){} },
    }
  }
  var __els = new Map()
  var __tarjetas = []
  var document = { getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) } }
  var window = { scrollTo(){} }
  var console = { error() {}, log() {}, warn() {} }
  var File = function (partes, nombre, op) { this.partes = partes; this.name = nombre; this.type = op && op.type }
  var URL = { createObjectURL: (a) => 'blob:local/' + a.name }
  var __log = { rpc: [], from: [], inserts: [], descargas: [], invocaciones: [], pasos: [], errores: [], exitos: [],
    cargas: { ingresos: 0, pagado: 0 }, detalle: [], completar: [], cerrar: 0, avisos: [], items: 0, historial: 0 }
  var __rpc = {}          // nombre -> (args) => { data, error }
  var __cabecera = null   // fila de materia_prima_ingresos del select
  var __descarga = null   // (ruta) => { data, error }
  var __ocr = null        // () => { data, error }
  var __insertItems = null
  var supabase = {
    async rpc(nombre, args) {
      __log.rpc.push({ nombre, args })
      const f = __rpc[nombre]
      return f ? f(args) : { data: null, error: null }
    },
    from(tabla) {
      __log.from.push(tabla)
      const q = {
        select: () => q, eq: () => q, in: () => q, order: () => q,
        async maybeSingle() { return { data: __cabecera, error: null } },
        insert(filas) {
          __log.inserts.push({ tabla, filas })
          const r = tabla === 'materia_prima_items' && __insertItems ? __insertItems() : { data: null, error: null }
          const p = Promise.resolve(r)
          p.select = () => ({ then: (res) => Promise.resolve({ data: (filas || []).map((f, i) => ({ id: 'nuevo-' + i, nombre: f.nombre, marca: f.marca })), error: null }).then(res) })
          return p
        },
        then(res) { return Promise.resolve({ data: [], error: null }).then(res) },
      }
      return q
    },
    storage: { from(bucket) { return { async download(ruta) {
      __log.descargas.push({ bucket, ruta })
      return __descarga ? __descarga(ruta) : { data: { type: 'image/jpeg', marca: 'BLOB:' + ruta }, error: null }
    } } } },
    functions: { async invoke(nombre, opts) {
      __log.invocaciones.push({ nombre, opts })
      return __ocr ? __ocr() : { data: { ok: true, datos: { items: [{ descripcion: 'Harina 000' }, { descripcion: 'Caja' }] }, crudo: {} }, error: null }
    } },
  }
  function mostrarError(m) { __log.errores.push(m) }
  function mostrarExito(m) { __log.exitos.push(m) }
  function formatearFecha(fecha) { const [anio, mes, dia] = fecha.split('-'); return dia + '/' + mes + '/' + anio }
  async function fileABase64(archivo) { return 'B64<' + (archivo.partes && archivo.partes[0] && archivo.partes[0].marca) + '>' }
  async function cargarCatalogoInsumos() {}
  async function cargarProveedores() {}
  async function asegurarAliasProveedor() {}
  async function cargarIngresos() { __log.cargas.ingresos++ }
  async function cargarPagadoSinIngresar() { __log.cargas.pagado++ }
  async function abrirDetalleIngreso(id) { __log.detalle.push(id) }
  function buscarEntrega(id) { return { id } }
  function cerrarWizard() { __log.cerrar++; estado.wizard = null }
  function irAPasoWz(id) { __log.pasos.push(id); estado.wizard.paso = id; renderizarCompletar() }
  function renderizarItems() { __log.items++ }
  function cargarHistorialYProponer() { __log.historial++ }
  var __uid = 0
  function itemDesdeOcr(crudo) { return { uid: 'o' + (++__uid), textoOriginal: crudo.descripcion, insumoId: 'ins-' + __uid, esNuevo: false, creando: false,
    nombre: crudo.descripcion, marca: '', tipo: 'insumo', cantidad: 5, bultos: null, contenido: null, lote: '', loteIlegible: false } }
  function validarItems() { return true }
  function mensajeErrorItems(e) { return 'No se pudieron guardar los ítems: ' + e.message }
  async function guardarAliasNuevos() { return null }
  var estado = {
    sesion: { user: { id: 'uid-yo' } }, miEmpleadoId: 'emp-1', miRolApp: 'usuario',
    misTareas: new Set(['materia_prima:cargar']), wizard: null, porIngresar: [], errorPorIngresar: null,
    cargandoPorIngresar: false, porIngresarError: null, pagadoSinIngresar: [], listaIngresos: [], entregas: [],
    facturasConRemito: new Set(), proveedores: [{ id: 'prov-1', razon_social: 'Molino SA', cuenta_corriente: true }],
    unidades: [], filtros: { ingresos: { busqueda: '', unidadId: '', vinculo: '' } }, remitosFacturados: new Set(),
  }
`

const FUNCIONES = [
  'esc', 'tieneTarea', 'wizardVacio', 'normalizarRazonSocial', 'inicialesEmpresa', 'formatearImporteDuplicado', 'importeConMoneda',
  'claveNumeroDocMp', 'nombresPorIngresar', 'nombresIngreso', 'marcasPorIngresar', 'filasPorIngresarVisibles',
  'cargarFacturasPorIngresar', 'renderizarAccesoPorIngresar', 'htmlPorIngresar', 'renderizarPorIngresar',
  'abrirPorIngresar', 'cerrarPorIngresar', 'mensajeErrorCrearIngreso', 'cargarLoQueEntro',
  'abrirCompletarIngreso', 'bajarComprobanteMp', 'leerComprobanteParaCompletar', 'htmlFotoCompletar',
  'textoOcrCompletar', 'renderizarCompletar', 'avisoCircuitoCompletar', 'confirmarCompletarIngreso', 'confirmarIngreso',
  'avisoGuardado', 'crearInsumosNuevos', 'claveInsumo', 'filasItemParaBase', 'filaItemParaBase', 'hayDiferenciaReal',
  'diferenciaDe', 'esFactura', 'rutaFotoMp', 'pideTotalFactura', 'avisoCircuitoPrevio',
  'faltanRenglones', 'htmlFaltanRenglones', 'renderizarListaIngresos', 'nombreUnidad', 'entregaPasaVinculo',
  'entregaCoincide', 'ordenarEntregasParaFiltro', 'textoAntiguedad', 'diasDesde', 'chipTipoDoc', 'volverAtrasWizard',
]
const CONSTANTES = ['AVISO_POR_INGRESAR', 'ETIQUETA_ORIGEN_POR_INGRESAR', 'puedeCargarMp', 'BUCKET_FOTOS_MP',
  'TIPOS_DOC', 'DIAS_REMITO_VIEJO', 'VACIO_POR_VINCULO']

function nuevo() {
  return construirCon(ARCHIVO, {
    preludio: PRELUDIO, funciones: FUNCIONES, constantes: CONSTANTES,
    retorno: `estado, __log, __els, __el(id){ return document.getElementById(id) },
      __setRpc(n, f){ __rpc[n] = f }, __setCabecera(c){ __cabecera = c }, __setDescarga(f){ __descarga = f },
      __setOcr(f){ __ocr = f }, __setInsertItems(f){ __insertItems = f }, __setTarjetas(t){ __tarjetas = t }, AVISO_POR_INGRESAR`,
  })
}

let S0
try { S0 = nuevo() } catch (e) {
  chk('el sandbox se arma con las funciones reales del archivo', false, String(e && e.stack || e))
  fin()
  return
}

const FILA_F = { origen: 'factura', id: 'fac-1', fecha: '2026-09-10', proveedor: 'Molino SA', razon_social: 'MOLINO S.A.', tipo_doc: 'Factura A',
  numero_doc: '0003-00012345', importe: 387300.5, moneda: 'ARS', unidad_negocio_id: 'u1', unidad: 'Cucuruchos Nuss', foto_url: 'uid-otro/1.jpg' }
const FILA_G = { origen: 'gasto', id: 'gas-1', fecha: '2026-09-11', proveedor: null, razon_social: 'Ferreteria KM', tipo_doc: 'Factura X',
  numero_doc: '12', importe: null, moneda: 'ARS', unidad_negocio_id: 'u1', unidad: 'Cucuruchos Nuss', foto_url: 'uid-otro/2.jpg' }
const CABECERA = { id: 'ing-9', fecha: '2026-09-10', tipo_doc: 'factura_a', numero_doc: '0003-00012345', razon_social: 'MOLINO S.A.',
  nombre_fantasia: null, proveedor_id: 'prov-1', unidad_negocio_id: 'u1', foto_url: 'uid-otro/1.jpg', gasto_id: null,
  factura_pendiente_id: 'fac-1', sin_stock_motivo: null }

esperas.push((async () => {
  // ══ 1. La lista: el aviso, el importe, el acceso, el permiso ══════════════
  {
    const S = nuevo()
    chk('el aviso es EXACTAMENTE el pedido', S.AVISO_POR_INGRESAR === AVISO, S.AVISO_POR_INGRESAR)
    S.__setRpc('facturas_sin_ingreso', () => ({ data: [FILA_F, FILA_G], error: null }))
    await S.cargarFacturasPorIngresar()
    chk('la lista se pide a facturas_sin_ingreso', S.__log.rpc.some(r => r.nombre === 'facturas_sin_ingreso'))
    const aviso = S.__el('aviso-por-ingresar')
    chk('con filas, el aviso se ve y dice el texto exacto', aviso.hidden === false && aviso.textContent === AVISO, aviso.textContent)
    const html = S.__el('lista-por-ingresar').innerHTML
    chk('la fila con proveedor muestra el proveedor', html.includes('Molino SA'))
    chk('la fila sin proveedor cae a la razón social', html.includes('Ferreteria KM'))
    chk('el importe se muestra con formato', html.includes('$387.300,5'))
    chk('un importe null dice "—" y nunca "$0"', /por-ingresar__importe">—</.test(html) && !/\$\s?0([^.,\d]|$)/.test(html), html.match(/por-ingresar__importe">[^<]*/g))
    chk('muestra la unidad', html.includes('Cucuruchos Nuss'))
    chk('muestra el número', html.includes('N° 0003-00012345'))
    chk('cada fila tiene "Cargar lo que entró"', (html.match(/btn-cargar-lo-que-entro/g) || []).length === 2)
    const btn = S.__el('btn-abrir-por-ingresar')
    chk('el acceso de la pantalla principal dice la cantidad', btn.hidden === false && btn.textContent === 'Facturas por ingresar (2)', btn.textContent)
    chk('la lista vacía no se muestra', S.__el('por-ingresar-vacio').hidden === true)

    // Vacía: sin aviso, sin acceso.
    S.__setRpc('facturas_sin_ingreso', () => ({ data: [], error: null }))
    await S.cargarFacturasPorIngresar()
    chk('con la lista vacía el aviso NO aparece', S.__el('aviso-por-ingresar').hidden === true && S.__el('aviso-por-ingresar').textContent === '')
    chk('con la lista vacía el acceso NO aparece', S.__el('btn-abrir-por-ingresar').hidden === true)
    chk('con la lista vacía se dice que no hay nada', S.__el('por-ingresar-vacio').hidden === false)

    // Error: se dice y el acceso queda para verlo.
    S.__setRpc('facturas_sin_ingreso', () => ({ data: null, error: { message: 'x' } }))
    await S.cargarFacturasPorIngresar()
    chk('si la lista no se pudo leer, se dice', S.__el('por-ingresar-error').hidden === false)
    chk('si la lista no se pudo leer, el aviso de las viejas no aparece', S.__el('aviso-por-ingresar').hidden === true)
  }
  {
    // Sin materia_prima:cargar: ni la consulta ni el acceso.
    const S = nuevo()
    S.estado.misTareas = new Set(['materia_prima:ver_todo', 'stock:ver'])
    S.__setRpc('facturas_sin_ingreso', () => ({ data: [FILA_F], error: null }))
    await S.cargarFacturasPorIngresar()
    chk('sin materia_prima:cargar no se consulta la lista', !S.__log.rpc.some(r => r.nombre === 'facturas_sin_ingreso'))
    chk('sin materia_prima:cargar el acceso no aparece', S.__el('btn-abrir-por-ingresar').hidden === true)
    // Con filas ya en memoria (por ejemplo, las trajo otra sesión con el
    // permiso): el acceso igual no aparece.
    S.estado.porIngresar = [FILA_F]
    S.renderizarAccesoPorIngresar()
    chk('sin materia_prima:cargar el acceso no aparece aunque haya filas', S.__el('btn-abrir-por-ingresar').hidden === true)
    const S2 = nuevo()
    S2.estado.misTareas = new Set()
    S2.estado.miRolApp = 'super_admin'
    S2.__setRpc('facturas_sin_ingreso', () => ({ data: [FILA_F], error: null }))
    await S2.cargarFacturasPorIngresar()
    chk('super_admin (bypass) sí la ve', S2.__el('btn-abrir-por-ingresar').hidden === false)
  }
  {
    // Un gasto que ya está en "Pagado sin ingresar" no aparece dos veces.
    const S = nuevo()
    S.estado.pagadoSinIngresar = [{ gasto_id: 'gas-1' }]
    S.__setRpc('facturas_sin_ingreso', () => ({ data: [FILA_F, FILA_G], error: null }))
    await S.cargarFacturasPorIngresar()
    const html = S.__el('lista-por-ingresar').innerHTML
    chk('un gasto que está en "Pagado sin ingresar" sale de esta lista', !html.includes('Ferreteria KM') && html.includes('Molino SA'))
    chk('y la cantidad del acceso lo descuenta', S.__el('btn-abrir-por-ingresar').textContent === 'Facturas por ingresar (1)')
  }
  {
    // El mismo papel dos veces (gasto + su factura espejo), y ya ingresado.
    const S = nuevo()
    const gemela = { ...FILA_G, id: 'gas-2', proveedor: 'Molino SA', razon_social: 'MOLINO S.A.', numero_doc: '3-12345' }
    const m = S.marcasPorIngresar([FILA_F, gemela, FILA_G], [{ numero_doc: '12', razon_social: 'FERRETERIA KM' }])
    chk('dos filas del mismo proveedor con el mismo número normalizado son gemelas', m.get('fac-1').gemela && m.get('gas-2').gemela)
    chk('una fila sin gemela no se marca', !m.get('gas-1').gemela)
    chk('ya hay un ingreso con ese número del mismo proveedor → se avisa', m.get('gas-1').yaIngresado === true && m.get('fac-1').yaIngresado === false)
    const html = S.htmlPorIngresar([FILA_F, gemela], { marcas: m })
    chk('la gemela lo dice en la fila', html.includes('aparece dos veces'))
    chk('claveNumeroDocMp = normalizar_numero_doc', S.claveNumeroDocMp('0003-00012345') === '3-12345' && S.claveNumeroDocMp('000300012345') === '3-12345'
      && S.claveNumeroDocMp('0012') === '-12' && S.claveNumeroDocMp('abc') === null && S.claveNumeroDocMp('0-0') === '0-0')
  }

  // ══ 2. "Cargar lo que entró": el payload y el modo completar ══════════════
  for (const fila of [FILA_F, FILA_G]) {
    const S = nuevo()
    S.__setRpc('facturas_sin_ingreso', () => ({ data: [fila], error: null }))
    await S.cargarFacturasPorIngresar()
    let quedan = [fila]
    S.__setRpc('crear_ingreso_desde_comprobante', () => { quedan = []; return { data: { ingreso_id: 'ing-9' }, error: null } })
    S.__setRpc('facturas_sin_ingreso', () => ({ data: quedan, error: null }))
    S.__setCabecera({ ...CABECERA, gasto_id: fila.origen === 'gasto' ? 'gas-1' : null, factura_pendiente_id: fila.origen === 'factura' ? 'fac-1' : null })
    const btn = { dataset: { comprobante: fila.id }, disabled: false, textContent: '' }
    await S.cargarLoQueEntro(btn)
    const llamada = S.__log.rpc.find(r => r.nombre === 'crear_ingreso_desde_comprobante')
    chk(`origen ${fila.origen}: payload EXACTO {p_origen, p_id}`, llamada && JSON.stringify(Object.keys(llamada.args).sort()) === '["p_id","p_origen"]'
      && llamada.args.p_origen === fila.origen && llamada.args.p_id === fila.id, JSON.stringify(llamada && llamada.args))
    chk(`origen ${fila.origen}: el botón queda trabado mientras manda`, btn.disabled === true)
    chk(`origen ${fila.origen}: la lista se recarga y el comprobante ya no aparece`,
      S.__log.rpc.filter(r => r.nombre === 'facturas_sin_ingreso').length === 2 && !S.__el('lista-por-ingresar').innerHTML.includes(fila.id))
    chk(`origen ${fila.origen}: se abre el wizard en modo completar con ese ingreso`, S.estado.wizard && S.estado.wizard.completar && S.estado.wizard.completar.ingresoId === 'ing-9')
    chk(`origen ${fila.origen}: directo a los ítems`, S.__log.pasos[0] === 'items')
    chk(`origen ${fila.origen}: el título dice "Cargar lo que entró"`, S.__el('wz-header-titulo').textContent === 'Cargar lo que entró')
  }

  // ══ 3. La foto a la vista y el OCR con ESA foto ═══════════════════════════
  {
    const S = nuevo()
    S.__setCabecera(CABECERA)
    await S.abrirCompletarIngreso('ing-9')
    const w = S.estado.wizard
    chk('la foto se baja del bucket comprobantes, por la ruta de la cabecera', S.__log.descargas.length === 1
      && S.__log.descargas[0].bucket === 'comprobantes' && S.__log.descargas[0].ruta === 'uid-otro/1.jpg', JSON.stringify(S.__log.descargas))
    const inv = S.__log.invocaciones[0]
    chk('el OCR que corre es el de materia prima', inv && inv.nombre === 'ocr-materia-prima')
    chk('el OCR recibe EL blob bajado de esa ruta', inv && inv.opts.body.imagen_base64 === 'B64<BLOB:uid-otro/1.jpg>', inv && inv.opts.body.imagen_base64)
    chk('el OCR recibe el tipo del archivo', inv && inv.opts.body.mime_type === 'image/jpeg')
    chk('los renglones leídos se PROPONEN en el paso de ítems', w.items.length === 2 && w.items[0].textoOriginal === 'Harina 000')
    const fotoEl = S.__el('wz-completar-foto')
    chk('la foto se ve en el paso de ítems (render ejecutado)', fotoEl.hidden === false && fotoEl.innerHTML.includes('<img'))
    chk('la miniatura sale del archivo bajado (blob local), puesta por propiedad', fotoEl.__img && fotoEl.__img.src === 'blob:local/1.jpg')
    chk('"Ver foto →" firma al tocar, con la ruta', fotoEl.innerHTML.includes('data-ruta-foto="uid-otro/1.jpg"'))
    chk('ningún href/src interpolado en el HTML de la foto', !/(href|src)=/.test(fotoEl.innerHTML))
    chk('se dice cuántos renglones se leyeron', /leyeron 2 renglones/.test(S.__el('wz-completar-ocr').textContent))
    chk('la cabecera se lee de materia_prima_ingresos', S.__log.from.includes('materia_prima_ingresos'))
    chk('el encabezado sale de la cabecera', w.encabezado.tipoDoc === 'factura_a' && w.encabezado.unidadId === 'u1' && w.proveedorId === 'prov-1')
  }
  {
    // Una URL firmada vieja: se baja por SU ruta.
    const S = nuevo()
    S.__setCabecera({ ...CABECERA, foto_url: 'https://xtorxouhzuizdvawqakb.supabase.co/storage/v1/object/sign/comprobantes/uid-otro/viejo.jpg?token=X' })
    await S.abrirCompletarIngreso('ing-9')
    chk('una URL firmada vieja se baja por su ruta', S.__log.descargas[0] && S.__log.descargas[0].ruta === 'uid-otro/viejo.jpg')
  }
  {
    // javascript: en foto_url no llega a ningún lado.
    const S = nuevo()
    S.__setCabecera({ ...CABECERA, foto_url: 'javascript:alert(1)//a/b' })
    await S.abrirCompletarIngreso('ing-9')
    const html = S.__el('wz-completar-foto').innerHTML
    chk('javascript: en foto_url: no se baja nada', S.__log.descargas.length === 0)
    chk('javascript: en foto_url: no llega al HTML (ni href, ni src, ni data-ruta)', !html.includes('javascript') && !/(href|src|data-ruta-foto)=/.test(html), html)
    chk('javascript: en foto_url: no se corre el OCR y se cargan a mano', S.__log.invocaciones.length === 0 && S.estado.wizard.items.length === 0)
  }
  {
    // Sin permiso para bajar la foto: se dice y se carga a mano.
    const S = nuevo()
    S.__setCabecera(CABECERA)
    S.__setDescarga(() => ({ data: null, error: { message: 'Object not found' } }))
    await S.abrirCompletarIngreso('ing-9')
    chk('foto que no se puede bajar: se dice', /No se pudo abrir la foto/.test(S.__el('wz-completar-foto').innerHTML))
    chk('foto que no se puede bajar: no se corre el OCR', S.__log.invocaciones.length === 0)
  }
  {
    // El OCR falla: se dice, sin romper.
    const S = nuevo()
    S.__setCabecera(CABECERA)
    S.__setOcr(() => ({ data: { ok: false, mensaje: 'Demasiados renglones' }, error: null }))
    await S.abrirCompletarIngreso('ing-9')
    chk('OCR que falla: se dice con su motivo', /No se pudo leer el comprobante \(Demasiados renglones\)/.test(S.__el('wz-completar-ocr').textContent))
    chk('OCR que falla: no inventa renglones', S.estado.wizard.items.length === 0)
  }
  {
    // Un PDF va al OCR como PDF, y no se dibuja una <img>.
    const S = nuevo()
    S.__setCabecera({ ...CABECERA, foto_url: 'uid-otro/f.pdf' })
    S.__setDescarga((ruta) => ({ data: { type: '', marca: 'BLOB:' + ruta }, error: null }))
    await S.abrirCompletarIngreso('ing-9')
    const inv = S.__log.invocaciones[0]
    chk('un PDF va al OCR con mime application/pdf', inv && inv.opts.body.mime_type === 'application/pdf')
    chk('un PDF no dibuja <img>', !S.__el('wz-completar-foto').innerHTML.includes('<img'))
  }

  // ══ 4. Confirmar en modo completar: SOLO los renglones ═════════════════════
  {
    const S = nuevo()
    S.__setCabecera(CABECERA)
    await S.abrirCompletarIngreso('ing-9')
    const w = S.estado.wizard
    w.items.push({ uid: 'n1', esNuevo: true, creando: true, insumoId: null, nombre: 'Film nuevo', marca: '', unidadMedida: 'kg',
      tipo: 'insumo', categoria: 'Bolsas', cantidad: 3, bultos: null, contenido: null, lote: '', loteIlegible: false })
    S.__log.rpc.length = 0
    await S.confirmarIngreso()
    const tablas = S.__log.inserts.map(i => i.tabla)
    chk('confirmar NO inserta otra cabecera', !tablas.includes('materia_prima_ingresos'), tablas.join(','))
    chk('confirmar NO llama a registrar_factura_de_ingreso ni a vincular_ingreso_a_gasto',
      !S.__log.rpc.some(r => r.nombre === 'registrar_factura_de_ingreso' || r.nombre === 'vincular_ingreso_a_gasto'), JSON.stringify(S.__log.rpc.map(r => r.nombre)))
    const ins = S.__log.inserts.find(i => i.tabla === 'materia_prima_items')
    chk('los renglones van en UN insert', S.__log.inserts.filter(i => i.tabla === 'materia_prima_items').length === 1)
    chk('todos los renglones llevan el ingreso_id de la cabecera', ins && ins.filas.length === 3 && ins.filas.every(f => f.ingreso_id === 'ing-9'))
    chk('el producto nuevo se crea y su id viaja', tablas[0] === 'insumos' && ins.filas[2].insumo_id === 'nuevo-0', JSON.stringify(ins && ins.filas[2]))
    chk('al terminar: se cierra, se recargan las listas y se abre el detalle', S.__log.cerrar === 1 && S.__log.cargas.ingresos === 1
      && S.__log.rpc.some(r => r.nombre === 'facturas_sin_ingreso') && S.__log.detalle[0] === 'ing-9')
  }
  {
    // El insert falla: NO se borra la cabecera, se dice, y se puede reintentar
    // sin volver a crear los productos nuevos.
    const S = nuevo()
    S.__setCabecera(CABECERA)
    await S.abrirCompletarIngreso('ing-9')
    const w = S.estado.wizard
    w.items.push({ uid: 'n1', esNuevo: true, creando: true, insumoId: null, nombre: 'Film nuevo', marca: '', unidadMedida: 'kg',
      tipo: 'insumo', categoria: 'Bolsas', cantidad: 3, bultos: null, contenido: null, lote: '', loteIlegible: false })
    S.__setInsertItems(() => ({ data: null, error: { message: 'boom' } }))
    await S.confirmarIngreso()
    chk('insert fallido: no se borra nada', !S.__log.from.some((t, i) => t === 'materia_prima_ingresos' && i > 1) && S.__log.cerrar === 0)
    const aviso = S.__el('wz-error-guardado')
    chk('insert fallido: se dice que el ingreso sigue creado', aviso.hidden === false && /sigue creado y vinculado/.test(aviso.textContent), aviso.textContent)
    chk('insert fallido: el botón se destraba para reintentar', S.__el('btn-confirmar-ingreso').disabled === false && w.guardando === false)
    S.__setInsertItems(null)
    await S.confirmarIngreso()
    chk('reintento: el producto nuevo NO se vuelve a crear', S.__log.inserts.filter(i => i.tabla === 'insumos').length === 1)
    chk('reintento: entra', S.__log.cerrar === 1)
  }
  {
    // En modo completar no se pide el total ni se dice lo del circuito normal.
    const S = nuevo()
    const w = S.wizardVacio()
    w.completar = { cabecera: CABECERA }
    w.encabezado.tipoDoc = 'factura_a'
    w.proveedorMatch = { cuenta_corriente: true }
    chk('modo completar: no pide el total de la factura', S.pideTotalFactura(w) === false)
    chk('modo completar: el aviso dice que ya está vinculado', /ya está vinculado a su factura de la cuenta corriente/.test(S.avisoCircuitoPrevio(w)))
    w.completar = null
    chk('modo normal: sigue pidiendo el total', S.pideTotalFactura(w) === true)
  }
  {
    // Volver desde los ítems en modo completar sale del wizard y recarga.
    const S = nuevo()
    S.estado.wizard = S.wizardVacio()
    S.estado.wizard.completar = { cabecera: CABECERA }
    S.estado.wizard.paso = 'items'
    S.volverAtrasWizard()
    chk('volver desde los ítems en modo completar sale del wizard', S.__log.cerrar === 1 && S.__log.pasos.length === 0)
    chk('y recarga el listado (el ingreso vacío se ve)', S.__log.cargas.ingresos === 1)
  }

  // ══ 5. Errores de crear_ingreso_desde_comprobante ═════════════════════════
  {
    const S = nuevo()
    const crudo = S.mensajeErrorCrearIngreso({ code: '23514', message: 'new row for relation "materia_prima_ingresos" violates check constraint "materia_prima_ingresos_tipo_doc_check"' })
    chk('error de CHECK → texto para una persona', crudo === 'No se pudo crear el ingreso: la base rechazó el tipo de comprobante. Avisale a administración.', crudo)
    chk('error de CHECK sin código pero con "check constraint" → texto para una persona',
      /base rechazó el tipo/.test(S.mensajeErrorCrearIngreso({ message: 'violates check constraint "x"' })))
    chk('un mensaje propio de la RPC va TAL CUAL', S.mensajeErrorCrearIngreso({ message: 'Esa factura ya tiene un ingreso cargado.' }) === 'Esa factura ya tiene un ingreso cargado.')
    // Por la pantalla: el error queda pegado a su fila y el botón se destraba.
    S.__setRpc('facturas_sin_ingreso', () => ({ data: [FILA_F], error: null }))
    await S.cargarFacturasPorIngresar()
    S.__setRpc('crear_ingreso_desde_comprobante', () => ({ data: null, error: { code: '23514', message: 'violates check constraint "materia_prima_ingresos_tipo_doc_check"' } }))
    await S.cargarLoQueEntro({ dataset: { comprobante: 'fac-1' }, disabled: false, textContent: '' })
    const html = S.__el('lista-por-ingresar').innerHTML
    chk('el error de CHECK se ve en la fila, para una persona', html.includes('la base rechazó el tipo de comprobante') && !html.includes('violates'))
    chk('con el error NO se abre el wizard', S.estado.wizard === null)
    chk('con el error no se sigue: ni se recarga la lista ni se busca una cabecera',
      S.__log.rpc.filter(r => r.nombre === 'facturas_sin_ingreso').length === 1 && !S.__log.from.includes('materia_prima_ingresos'))
  }

  // ══ 6. "Faltan los renglones" ═════════════════════════════════════════════
  {
    const S = nuevo()
    const vacio = { id: 'ing-9', tipo_doc: 'factura_a', cantidadItems: 0, factura_pendiente_id: 'fac-1', gasto_id: null }
    chk('0 renglones + factura_pendiente_id → faltan', S.faltanRenglones(vacio) === true)
    chk('0 renglones + gasto_id → faltan', S.faltanRenglones({ ...vacio, factura_pendiente_id: null, gasto_id: 'g' }) === true)
    chk('con renglones → no', S.faltanRenglones({ ...vacio, cantidadItems: 2 }) === false)
    chk('sin destino contable → no', S.faltanRenglones({ ...vacio, factura_pendiente_id: null }) === false)
    chk('un remito → no', S.faltanRenglones({ ...vacio, tipo_doc: 'remito' }) === false)
    S.estado.facturasConRemito = new Set(['ing-9'])
    chk('una factura vinculada a un remito (0 renglones a propósito) → no', S.faltanRenglones(vacio) === false)
    chk('la columna vieja remito_vinculado_id también cuenta', S.faltanRenglones({ ...vacio, id: 'otro', remito_vinculado_id: 'r' }) === false)
    S.estado.facturasConRemito = new Set()

    const entrega = { base: vacio, comprobantes: [vacio], cantidadItems: 0 }
    const h = S.htmlFaltanRenglones(entrega)
    chk('el render dice "Faltan los renglones" y ofrece el botón', h.includes('Faltan los renglones') && h.includes('data-completar="ing-9"') && h.includes('Cargar lo que entró'))
    S.estado.misTareas = new Set(['materia_prima:ver_todo'])
    chk('sin materia_prima:cargar: el aviso sí, el botón no', S.htmlFaltanRenglones(entrega).includes('Faltan') && !S.htmlFaltanRenglones(entrega).includes('data-completar'))
    S.estado.misTareas = new Set(['materia_prima:cargar'])
    chk('una transferencia nunca', S.htmlFaltanRenglones({ ...entrega, esTransferencia: true }) === '')

    // El listado (render ejecutado): la tarjeta lo muestra y el botón abre el
    // modo completar, NO el detalle.
    S.estado.entregas = [{ ...entrega, base: { ...vacio, razon_social: 'Molino', fecha: '2026-09-10', unidad_negocio_id: 'u1' }, remitosVinculados: [] }]
    let manejador = null
    S.__setTarjetas([{ dataset: { ingreso: 'ing-9' }, addEventListener(ev, f) { manejador = f } }])
    S.renderizarListaIngresos()
    chk('el listado muestra "Faltan los renglones"', S.__el('lista-ingresos').innerHTML.includes('Faltan los renglones'))
    S.__setCabecera(CABECERA)
    manejador({ target: { closest: (sel) => sel === '[data-completar]' ? { dataset: { completar: 'ing-9' } } : null } })
    await new Promise(r => setTimeout(r, 0))
    chk('tocar "Cargar lo que entró" en la tarjeta abre el modo completar y NO el detalle',
      S.estado.wizard && S.estado.wizard.completar && S.estado.wizard.completar.ingresoId === 'ing-9' && S.__log.detalle.length === 0)
    manejador({ target: { closest: () => null } })
    chk('tocar la tarjeta en otro lado abre el detalle', S.__log.detalle[0] === 'ing-9')

    // El detalle: sin renglones, el mismo aviso.
    const det = extraerFn(SCRIPT, 'abrirDetalleIngreso')
    chk('el detalle sin renglones muestra htmlFaltanRenglones', /\.join\(''\) \|\| htmlFaltanRenglones\(entrega\) \|\|/.test(det))
    chk('el detalle tiene su listener para el botón', /getElementById\('detalle-items'\)\.addEventListener\('click'[\s\S]{0,200}abrirCompletarIngreso\(btn\.dataset\.completar\)/.test(SCRIPT))
  }

  // ══ 7. XSS: HTML malicioso en cada campo de los renders nuevos ═════════════
  {
    const S = nuevo()
    const mala = { origen: 'factura', id: marca('id'), fecha: '2026-09-10', proveedor: marca('proveedor'), razon_social: marca('razon_social'),
      tipo_doc: marca('tipo_doc'), numero_doc: marca('numero_doc'), importe: null, moneda: 'ARS', unidad: marca('unidad'), foto_url: marca('foto_url') }
    const html = S.htmlPorIngresar([mala], { error: { id: mala.id, texto: marca('error') } })
    chequearMarcas(chk, 'htmlPorIngresar', html, ['id', 'proveedor', 'razon_social', 'tipo_doc', 'numero_doc', 'unidad', 'error'])
    chk('htmlPorIngresar: foto_url no se dibuja en la lista', !html.includes('foto_url'))

    const f = S.htmlFotoCompletar({ foto: { estado: 'lista', ruta: marca('ruta'), esPdf: false } })
    chequearMarcas(chk, 'htmlFotoCompletar', f, ['ruta'])
    const falt = S.htmlFaltanRenglones({ comprobantes: [{ id: marca('ingreso'), tipo_doc: 'factura_a', cantidadItems: 0, gasto_id: 'g' }] })
    chequearMarcas(chk, 'htmlFaltanRenglones', falt, ['ingreso'])
  }
})())

// ══ 8. Estático, acotado a las funciones nuevas ═══════════════════════════
estaticoAcotado(chk, ARCHIVO, FUENTE,
  ['htmlPorIngresar', 'renderizarPorIngresar', 'htmlFotoCompletar', 'renderizarCompletar', 'htmlFaltanRenglones', 'renderizarAccesoPorIngresar'],
  { escape: 'esc' })
{
  chk('el aviso vive en una constante y el render la usa', /aviso\.textContent = filas\.length \? AVISO_POR_INGRESAR : ''/.test(extraerFn(SCRIPT, 'renderizarPorIngresar')))
  chk('la sección se carga en init DESPUÉS de "Pagado sin ingresar"',
    /await cargarPagadoSinIngresar\(\)[\s\S]{0,200}await cargarFacturasPorIngresar\(\)/.test(extraerFn(SCRIPT, 'init')))
  chk('el botón de la lista está cableado', /getElementById\('lista-por-ingresar'\)\.addEventListener\('click'[\s\S]{0,150}cargarLoQueEntro\(btn\)/.test(SCRIPT))
  chk('confirmarIngreso deriva al modo completar ANTES de cualquier insert',
    (() => { const t = extraerFn(SCRIPT, 'confirmarIngreso'); const a = t.indexOf('if (w.completar) return confirmarCompletarIngreso()'); const b = t.indexOf(".from('materia_prima_ingresos')"); return a > 0 && b > 0 && a < b })())
  chk('confirmarCompletarIngreso no borra la cabecera', !/\.delete\(/.test(extraerFn(SCRIPT, 'confirmarCompletarIngreso')))
  chk('el modo completar no dibuja la casilla "no suma stock" (va directo a ítems, sin pasar por Datos)',
    !/irAPasoWz\('datos'\)|renderizarBloqueSinStock/.test(extraerFn(SCRIPT, 'abrirCompletarIngreso')))
}

// ══ 9. Invariantes contra un baseline FIJO (fb3be49), nunca HEAD ═══════════
// El modo completar usa el MISMO payload de renglones, la misma creación de
// productos y el mismo OCR→renglón que el camino normal: esas funciones no se
// tocaron. Y la fusión del listado tampoco. Anclado a un commit fijo: contra
// HEAD, el día que esto se commitee las dos mitades serían idénticas.
{
  const { execFileSync } = require('child_process')
  const BASELINE = 'fb3be49'
  let viejo = ''
  try { viejo = execFileSync('git', ['show', `${BASELINE}:modulos/materia-prima.html`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }) } catch { viejo = '' }
  chk(`se pudo leer el baseline ${BASELINE}`, viejo.length > 100000)
  if (viejo.length > 100000) {
    for (const fn of ['filasItemParaBase', 'filaItemParaBase', 'crearInsumosNuevos', 'fusionarEntregas', 'guardarAliasNuevos', 'itemDesdeOcr']) {
      chk(`${fn} quedó idéntica al baseline`, extraerFn(viejo, fn) === extraerFn(FUENTE, fn))
    }
  }
}

fin()
