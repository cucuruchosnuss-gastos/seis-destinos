// Suite del circuito en modulos/materia-prima.html (Ingreso).
//
// Cubre lo NUEVO del circuito con Gastos y Cuentas Corrientes: el resultado de
// registrar_factura_de_ingreso en palabras, el detalle con su reintento, la
// lista "Pagado sin ingresar", el aviso previo al confirmar y las reglas de
// qué se llama y con qué. Los renders se EJECUTAN con un document falso.
//
//   node pruebas/test-materia-prima-circuito.js
//   ARCHIVO_TEST=otra-copia.html node pruebas/test-materia-prima-circuito.js

const path = require('path')
const { construirCon } = require('./sandbox')
const { arnes, marca, chequearMarcas, estaticoAcotado, leer } = require('./circuito-comun')
const { extraerFn } = require('./extraer')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/materia-prima.html')
const FUENTE = leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

const PRELUDIO = `
  function nuevoEl(id) {
    return {
      id, innerHTML: '', textContent: '', value: '', hidden: false, checked: false, disabled: false,
      dataset: {}, querySelector: () => null, querySelectorAll: () => [], addEventListener(){}, focus(){},
      classList: { add(){}, remove(){}, toggle(){} },
    }
  }
  var __els = new Map()
  var document = { getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) } }
  var __llamadas = { rpc: [], errores: [], exitos: [], ingresar: [], replace: [], elegido: [] }
  var __rpc = async () => ({ data: null, error: null })
  var supabase = { rpc: (n, p) => { __llamadas.rpc.push([n, p]); return __rpc(n, p) } }
  function mostrarError(m) { __llamadas.errores.push(m) }
  function mostrarExito(m) { __llamadas.exitos.push(m) }
  function formatearFecha(f) { const [a, m, d] = String(f).split('-'); return d + '/' + m + '/' + a }
  var location = { search: '', pathname: '/modulos/materia-prima.html' }
  var history = { replaceState(a, b, c) { __llamadas.replace.push(c) } }
  async function ingresarDesdeGasto(f) { __llamadas.ingresar.push(f) }
  function elegirProveedorParecido(id) { __llamadas.elegido.push(id); estado.wizard.proveedorId = id }
  function renderizarAvisoNumeroCorto() {}
  var estado = {
    miRolApp: 'usuario', misTareas: new Set(['materia_prima:cargar']),
    unidades: [{ id: 'u1', nombre: 'Cucuruchos Nuss' }],
    proveedores: [], pagadoSinIngresar: [], errorPagadoSinIngresar: null,
    descarte: { gastoId: null, texto: '', error: null },
    fechaInicioCircuito: '2026-10-01', wizard: null,
  }
`

const FUNCIONES = [
  'esc', 'formatearImporteDuplicado', 'importeConMoneda', 'textoImporteInput', 'parseImporte',
  'llevaCircuito', 'esFactura', 'pideTotalFactura', 'textoTotalFactura', 'avisoCircuitoPrevio',
  'renderizarBloquesCircuito', 'validarCircuitoAntesDeGuardar', 'resultadoCircuito', 'errorCircuito',
  'pasarAlCircuito', 'htmlResultadoCircuito', 'htmlCircuitoDetalle', 'htmlPagadoSinIngresar',
  'renderizarPagadoSinIngresar', 'cargarPagadoSinIngresar', 'rutaComprobanteGasto',
  'renderizarAvisoDesdeGasto', 'aplicarDatosDelGasto', 'confirmarDescarte', 'abrirGastoDeLaUrl',
  'tieneTarea', 'nombreUnidad',
]
const CONSTANTES = ['TIPOS_CON_CIRCUITO', 'NIVELES_CIRCUITO', 'TIPOS_DOC', 'puedePasarAlCircuito', 'puedeDescartarIngreso']

const S = construirCon(ARCHIVO, {
  preludio: PRELUDIO, funciones: FUNCIONES, constantes: CONSTANTES,
  retorno: 'estado, __els, __llamadas, __setRpc(f){ __rpc = f }, location',
})
const el = (id) => S.__els.get(id) || { innerHTML: '', textContent: '', hidden: true }

// ══════════════════════════════════════════════════════════════════════════
// 1. RENDERS CON TEXTO MALICIOSO
// ══════════════════════════════════════════════════════════════════════════

// htmlCircuitoDetalle: los cuatro estados de un comprobante.
{
  const base = {
    tipo_doc: 'factura_a', fecha: '2026-10-05', numero_doc: marca('numero_doc'),
    razon_social: marca('razon_social'), proveedor_id: 'p1', importe_ocr: marca('importe_ocr'),
    sin_stock_motivo: marca('sin_stock_motivo'),
  }
  const entrega = {
    comprobantes: [
      { ...base, id: marca('id'), proveedores: { razon_social: marca('prov_cc'), cuenta_corriente: true } },
      { ...base, id: 'b', proveedores: { razon_social: marca('prov_ocasional'), cuenta_corriente: false } },
      { ...base, id: 'c', factura_pendiente_id: 'f', proveedores: { razon_social: marca('prov_en_cc'), cuenta_corriente: true } },
      { ...base, id: 'd', gasto_id: 'g', proveedores: { razon_social: 'X', cuenta_corriente: false } },
    ],
  }
  const html = S.htmlCircuitoDetalle(entrega, {
    fechaInicio: '2026-10-01', puedeReintentar: true,
    resultado: { ingresoId: 'b', nivel: 'error', lineas: [marca('error_rpc')] },
  })
  chequearMarcas(chk, 'htmlCircuitoDetalle', html,
    ['numero_doc', 'sin_stock_motivo', 'id', 'prov_cc', 'prov_ocasional', 'prov_en_cc', 'error_rpc'])
  chk('detalle: el que tiene CC y no se vinculó ofrece «Pasar a cuenta corriente»', html.includes('Pasar a cuenta corriente'))
  chk('detalle: el ocasional ofrece buscar el gasto, no pasar a CC', html.includes('Buscar el gasto de nuevo'))
  chk('detalle: el ocasional dice que falta el gasto', html.includes('no tiene cuenta corriente: falta que quien la pagó cargue el gasto'))
  chk('detalle: el vinculado a CC lo dice', html.includes('En la cuenta corriente de'))
  chk('detalle: el vinculado a un gasto lo dice', html.includes('Vinculada a un gasto ya cargado.'))
  chk('detalle: con cuenta corriente pide el total (y solo una vez)', (html.match(/campo-reintento-total/g) || []).length === 1)
  chk('detalle: el resultado reciente se muestra (nivel error)', html.includes('circuito-mp--error'))
  // Un importe_ocr que no es número NO se escapa: se descarta y el campo queda
  // vacío. Es más fuerte que escaparlo: no hay texto del OCR en el atributo.
  chk('detalle: un importe_ocr que no es número deja el campo vacío', /class="campo-reintento-total"[^>]*value=""/.test(html) && !html.includes('importe_ocr'))

  const sinPermiso = S.htmlCircuitoDetalle(entrega, { fechaInicio: '2026-10-01', puedeReintentar: false })
  chk('detalle: sin permiso no hay botón de reintento', !/btn-reintento-circuito/.test(sinPermiso))
  const viejo = S.htmlCircuitoDetalle({ comprobantes: [{ ...entrega.comprobantes[0], fecha: '2026-09-30', sin_stock_motivo: null }] },
    { fechaInicio: '2026-10-01', puedeReintentar: true })
  chk('detalle: un ingreso anterior al inicio del circuito no muestra nada', viejo === '', viejo)
  const sinFecha = S.htmlCircuitoDetalle({ comprobantes: [{ ...entrega.comprobantes[0], sin_stock_motivo: null }] },
    { fechaInicio: null, puedeReintentar: true })
  chk('detalle: sin fecha de inicio (no se pudo leer) no ofrece reintentos', !/btn-reintento-circuito/.test(sinFecha))
  const remito = S.htmlCircuitoDetalle({ comprobantes: [{ ...entrega.comprobantes[0], tipo_doc: 'remito', sin_stock_motivo: null }] },
    { fechaInicio: '2026-10-01', puedeReintentar: true })
  chk('detalle: un remito no entra al circuito', remito === '', remito)
  const sinProv = S.htmlCircuitoDetalle({ comprobantes: [{ ...base, id: 'e', proveedor_id: null, sin_stock_motivo: null }] },
    { fechaInicio: '2026-10-01', puedeReintentar: true })
  chk('detalle: sin proveedor lo dice y no ofrece botón', sinProv.includes('Sin proveedor') && !/btn-reintento/.test(sinProv))
  const sinCompr = S.htmlCircuitoDetalle({ comprobantes: [{ ...entrega.comprobantes[0], tipo_doc: 'sin_comprobante', sin_stock_motivo: null }] },
    { fechaInicio: '2026-10-01', puedeReintentar: true })
  chk('detalle: sin comprobante no pide total', !/campo-reintento-total/.test(sinCompr) && /btn-reintento-circuito/.test(sinCompr))
  const nuloOcr = S.htmlCircuitoDetalle({ comprobantes: [{ ...entrega.comprobantes[0], importe_ocr: null, sin_stock_motivo: null }] },
    { fechaInicio: '2026-10-01', puedeReintentar: true })
  chk('detalle: sin importe del OCR el campo queda vacío, no en 0', /value=""/.test(nuloOcr), nuloOcr.match(/value="[^"]*"/)?.[0])
}

// htmlPagadoSinIngresar y su render.
{
  S.estado.unidades.push({ id: 'u-x', nombre: marca('unidad') })
  const filas = [{
    gasto_id: marca('gasto_id'), razon_social: marca('razon_social'), numero_doc: marca('numero_doc'),
    importe: 1500, moneda: marca('moneda'), fecha: '2026-10-02', unidad_negocio_id: 'u-x',
  }]
  const html = S.htmlPagadoSinIngresar(filas, { puedeDescartar: true })
  chequearMarcas(chk, 'htmlPagadoSinIngresar', html, ['gasto_id', 'razon_social', 'numero_doc', 'moneda', 'unidad'])
  chk('pagado: ofrece Ingresar', html.includes('btn-pendiente-ingresar'))
  chk('pagado: con permiso ofrece «No lleva ingreso»', html.includes('btn-pendiente-descartar'))
  chk('pagado: sin permiso no lo ofrece', !S.htmlPagadoSinIngresar(filas, { puedeDescartar: false }).includes('btn-pendiente-descartar'))

  const conDescarte = S.htmlPagadoSinIngresar(filas, {
    puedeDescartar: true, descarte: { gastoId: filas[0].gasto_id, texto: marca('texto_descarte'), error: marca('error_descarte') },
  })
  chequearMarcas(chk, 'htmlPagadoSinIngresar (descartando)', conDescarte, ['texto_descarte', 'error_descarte'])
  chk('pagado: descartando muestra el motivo y la confirmación', conDescarte.includes('btn-pendiente-confirmar-descarte'))

  const sinImporte = S.htmlPagadoSinIngresar([{ ...filas[0], importe: null, moneda: 'ARS' }], {})
  chk('pagado: un importe null no se muestra como $0', !/\$0\b/.test(sinImporte), sinImporte)

  S.estado.pagadoSinIngresar = []
  S.estado.errorPagadoSinIngresar = marca('error_lista')
  S.renderizarPagadoSinIngresar()
  chequearMarcas(chk, 'renderizarPagadoSinIngresar (error)', el('lista-pagado-sin-ingresar').innerHTML, ['error_lista'])
  chk('pagado: el error de la RPC se muestra (la sección no se esconde)', el('seccion-pagado-sin-ingresar').hidden === false)
  S.estado.errorPagadoSinIngresar = null
  S.renderizarPagadoSinIngresar()
  chk('pagado: sin filas la sección no se dibuja', el('seccion-pagado-sin-ingresar').hidden === true)
}

// htmlResultadoCircuito: un nivel raro no entra a la clase.
{
  const h = S.htmlResultadoCircuito({ nivel: '"><b data-xss="nivel">', lineas: [marca('linea')] })
  chequearMarcas(chk, 'htmlResultadoCircuito', h, ['linea'])
  chk('resultado: un nivel desconocido cae a neutro', h.includes('circuito-mp--neutro') && !h.includes('data-xss="nivel"'))
}

// ══════════════════════════════════════════════════════════════════════════
// 2. EL RESULTADO DE LA RPC EN PALABRAS
// ══════════════════════════════════════════════════════════════════════════
{
  const r = (data, imp) => S.resultadoCircuito(data, 'DIMAFLO', imp)
  chk('creada', r({ accion: 'creada' }).lineas[0] === 'Cargada en la cuenta corriente de DIMAFLO.' && r({ accion: 'creada' }).nivel === 'ok')
  chk('creada_sin_importe', r({ accion: 'creada_sin_importe' }).lineas[0] === 'Quedó en la cuenta de DIMAFLO como descarga sin importe: un administrador tiene que cargar el precio.')
  chk('vinculado_cc igual', r({ accion: 'vinculado_cc', importe_distinto: false }).nivel === 'ok'
    && r({ accion: 'vinculado_cc' }).lineas[0] === 'Esta factura ya estaba en la cuenta corriente, quedó vinculada.')
  const dist = r({ accion: 'vinculado_cc', importe_distinto: true, importe_cc: 1000 }, 1200)
  chk('vinculado_cc distinto va en ámbar con los dos importes', dist.nivel === 'ambar' && dist.lineas[1].includes('$1.000') && dist.lineas[1].includes('$1.200'), JSON.stringify(dist))
  const ccNulo = r({ accion: 'vinculado_cc', importe_distinto: true, importe_cc: null }, 1200)
  chk('vinculado_cc con importe_cc null no dice $0', !ccNulo.lineas.join(' ').includes('$0') && ccNulo.lineas[1].includes('todavía no tiene importe'), JSON.stringify(ccNulo))
  chk('falta_gasto', r({ accion: 'falta_gasto' }).lineas[0] === 'DIMAFLO no tiene cuenta corriente: quien la pagó tiene que cargar el gasto.')
  chk('vinculado_gasto', r({ accion: 'vinculado_gasto' }).lineas[0] === 'Vinculada al gasto ya cargado.')
  chk('remito muestra el mensaje de la base', r({ accion: 'remito', mensaje: 'M' }).lineas[0] === 'M')
  const raro = r({ accion: 'otra' })
  chk('una acción desconocida no se calla', raro.nivel === 'error')
  chk('sin nombre de proveedor no dice "undefined"', !S.resultadoCircuito({ accion: 'creada' }, '', null).lineas[0].includes('undefined'))
}

// ══════════════════════════════════════════════════════════════════════════
// 3. QUÉ SE LLAMA, Y QUE NUNCA TIRA
// ══════════════════════════════════════════════════════════════════════════
esperas.push((async () => {
  const L = S.__llamadas
  L.rpc.length = 0
  S.__setRpc(async () => ({ data: { accion: 'creada' }, error: null }))
  await S.pasarAlCircuito('i1', { tipoDoc: 'factura_a', importe: 1234.5, nombre: 'X' })
  chk('factura: llama a registrar_factura_de_ingreso con el importe y ARS',
    L.rpc[0]?.[0] === 'registrar_factura_de_ingreso' && L.rpc[0][1].p_importe === 1234.5 && L.rpc[0][1].p_moneda === 'ARS' && L.rpc[0][1].p_ingreso_id === 'i1',
    JSON.stringify(L.rpc[0]))

  L.rpc.length = 0
  await S.pasarAlCircuito('i2', { tipoDoc: 'sin_comprobante', importe: 999, nombre: 'X' })
  chk('sin comprobante: manda p_importe null', L.rpc[0]?.[1].p_importe === null, JSON.stringify(L.rpc[0]))

  L.rpc.length = 0
  const rem = await S.pasarAlCircuito('i3', { tipoDoc: 'remito' })
  chk('remito: no llama a nada y devuelve null', rem === null && L.rpc.length === 0)

  L.rpc.length = 0
  S.__setRpc(async () => ({ data: null, error: null }))
  const vg = await S.pasarAlCircuito('i4', { tipoDoc: 'factura_a', gastoId: 'g9', importe: 5 })
  chk('desde un gasto: llama a vincular_ingreso_a_gasto y NO a registrar_factura_de_ingreso',
    L.rpc.length === 1 && L.rpc[0][0] === 'vincular_ingreso_a_gasto' && L.rpc[0][1].p_gasto_id === 'g9' && vg.nivel === 'ok',
    JSON.stringify(L.rpc))

  S.__setRpc(async () => ({ data: null, error: { message: 'La factura 0001-1 ya está vinculada a otro ingreso.' } }))
  const e1 = await S.pasarAlCircuito('i5', { tipoDoc: 'factura_a', importe: 5 })
  chk('error de la RPC: se muestra TAL CUAL', e1.nivel === 'error' && e1.lineas[0] === 'La factura 0001-1 ya está vinculada a otro ingreso.')
  chk('error: dice que el ingreso quedó guardado', e1.lineas[1].includes('quedó guardado'))

  S.__setRpc(async () => { throw new Error('sin señal') })
  let tiro = false, e2
  try { e2 = await S.pasarAlCircuito('i6', { tipoDoc: 'factura_a', importe: 5 }) } catch { tiro = true }
  chk('pasarAlCircuito NUNCA tira (si tirara, confirmarIngreso borraría el ingreso)', !tiro && e2?.nivel === 'error')

  // Pagado sin ingresar: error de la RPC y descarte.
  S.__setRpc(async () => ({ data: null, error: { message: 'No tenés permiso X.' } }))
  await S.cargarPagadoSinIngresar()
  chk('gastos_sin_ingreso con error: queda el mensaje tal cual', S.estado.errorPagadoSinIngresar === 'No tenés permiso X.')

  S.estado.descarte = { gastoId: 'g1', texto: 'ab', error: null }
  L.rpc.length = 0
  await S.confirmarDescarte({ disabled: false })
  chk('descarte: con menos de 3 letras no llama a la RPC', L.rpc.length === 0 && S.estado.descarte.error)
  S.estado.descarte = { gastoId: 'g1', texto: '  era un servicio  ', error: null }
  S.__setRpc(async () => ({ data: null, error: { message: 'Ese gasto ya tiene su ingreso.' } }))
  await S.confirmarDescarte({ disabled: false })
  chk('descarte: manda el motivo recortado', L.rpc[0]?.[0] === 'descartar_ingreso_de_gasto' && L.rpc[0][1].p_motivo === 'era un servicio', JSON.stringify(L.rpc[0]))
  chk('descarte: el error de la base se muestra tal cual', S.estado.descarte.error === 'Ese gasto ya tiene su ingreso.')

  // Deep link.
  // Una fila cuyo id coincide con el texto inválido: si no se validara el
  // uuid, se abriría el flujo. Y el mensaje tiene que ser el específico.
  S.estado.pagadoSinIngresar = [{ gasto_id: 'no-es-uuid' }]
  S.location.search = '?desde_gasto=no-es-uuid'
  L.errores.length = 0
  L.ingresar.length = 0
  await S.abrirGastoDeLaUrl()
  chk('?desde_gasto= inválido: avisa con su mensaje, limpia la URL y no abre nada',
    L.errores[0] === 'El enlace no apunta a un gasto válido.' && L.replace.length >= 1 && L.ingresar.length === 0, JSON.stringify(L.errores))
  const id = '11111111-2222-3333-4444-555555555555'
  S.estado.pagadoSinIngresar = [{ gasto_id: id }]
  S.location.search = `?desde_gasto=${id}`
  L.ingresar.length = 0
  await S.abrirGastoDeLaUrl()
  chk('?desde_gasto= válido y pendiente: abre el mismo flujo que "Ingresar"', L.ingresar.length === 1 && L.ingresar[0].gasto_id === id)
  S.estado.pagadoSinIngresar = []
  L.errores.length = 0
  await (S.location.search = `?desde_gasto=${id}`, S.abrirGastoDeLaUrl())
  chk('?desde_gasto= que no está pendiente: lo dice, con la fecha de inicio', L.errores[0]?.includes('01/10/2026'), L.errores[0])
})())

// ══════════════════════════════════════════════════════════════════════════
// 4. EL WIZARD: CUÁNDO SE PIDE EL TOTAL, EL AVISO, LA VALIDACIÓN
// ══════════════════════════════════════════════════════════════════════════
{
  const w = (extra = {}) => ({
    encabezado: { tipoDoc: 'factura_a', razonSocial: 'Papel SA', numeroDoc: '', fecha: '' },
    proveedorMatch: { id: 'p', razon_social: 'DIMAFLO', cuenta_corriente: true },
    desdeGasto: null, importeOcr: null, totalFactura: null, sinStock: false, sinStockMotivo: '', ...extra,
  })
  chk('total: se pide con factura + proveedor con CC', S.pideTotalFactura(w()) === true)
  chk('total: NO con proveedor ocasional', S.pideTotalFactura(w({ proveedorMatch: { cuenta_corriente: false } })) === false)
  chk('total: NO con proveedor nuevo (nace sin CC)', S.pideTotalFactura(w({ proveedorMatch: null })) === false)
  chk('total: NO si viene de un gasto', S.pideTotalFactura(w({ desdeGasto: { gasto_id: 'g' } })) === false)
  chk('total: NO en un remito', S.pideTotalFactura(w({ encabezado: { tipoDoc: 'remito' } })) === false)
  chk('total: NO sin comprobante', S.pideTotalFactura(w({ encabezado: { tipoDoc: 'sin_comprobante' } })) === false)

  chk('validar: con CC y sin total, no deja guardar', !!S.validarCircuitoAntesDeGuardar(w()))
  chk('validar: el total del OCR alcanza', S.validarCircuitoAntesDeGuardar(w({ importeOcr: 1500.5 })) === null)
  chk('validar: el total tipeado "1.234,50" alcanza', S.validarCircuitoAntesDeGuardar(w({ totalFactura: '1.234,50' })) === null)
  chk('validar: un total en 0 no alcanza', !!S.validarCircuitoAntesDeGuardar(w({ totalFactura: '0' })))
  chk('validar: "no suma stock" sin motivo no deja guardar', !!S.validarCircuitoAntesDeGuardar(w({ importeOcr: 1, sinStock: true, sinStockMotivo: '  ' })))
  chk('validar: "no suma stock" con motivo deja guardar', S.validarCircuitoAntesDeGuardar(w({ importeOcr: 1, sinStock: true, sinStockMotivo: 'se contó el 1/10' })) === null)
  chk('validar: el motivo de más de 300 no pasa', !!S.validarCircuitoAntesDeGuardar(w({ importeOcr: 1, sinStock: true, sinStockMotivo: 'x'.repeat(301) })))

  chk('parseImporte "1.234,50"', S.parseImporte('1.234,50') === 1234.5)
  chk('parseImporte vacío es null, no 0', S.parseImporte('') === null && S.parseImporte(null) === null)
  chk('textoImporteInput(null) es vacío, no "0"', S.textoImporteInput(null) === '' && S.textoImporteInput('') === '')
  chk('textoImporteInput(1234.5) es "1.234,5"', S.textoImporteInput(1234.5) === '1.234,5', S.textoImporteInput(1234.5))
  chk('ida y vuelta: parseImporte(textoImporteInput(x)) === x', S.parseImporte(S.textoImporteInput(98765.43)) === 98765.43)

  chk('aviso: ocasional dice que espera el gasto', S.avisoCircuitoPrevio(w({ proveedorMatch: { razon_social: 'DARIO', cuenta_corriente: false } })) === 'DARIO no tiene cuenta corriente: la factura queda esperando el gasto de quien la pagó.')
  chk('aviso: sin comprobante con CC dice descarga sin importe', S.avisoCircuitoPrevio(w({ encabezado: { tipoDoc: 'sin_comprobante' } })).includes('descarga sin importe'))
  chk('aviso: factura con CC no agrega aviso (el total lo explica)', S.avisoCircuitoPrevio(w()) === null)
  chk('aviso: remito no dice nada', S.avisoCircuitoPrevio(w({ encabezado: { tipoDoc: 'remito' } })) === null)
  chk('aviso: desde un gasto lo dice, sin $0 con importe null',
    /vinculado al gasto ya pagado/.test(S.avisoCircuitoPrevio(w({ desdeGasto: { importe: null, numero_doc: '1-2' } }))) &&
    !/\$0/.test(S.avisoCircuitoPrevio(w({ desdeGasto: { importe: null, numero_doc: '1-2' } }))))

  // El render del paso de confirmación: textContent (no sink) + los bloques.
  S.renderizarBloquesCircuito(w({ proveedorMatch: { razon_social: marca('aviso'), cuenta_corriente: false } }))
  chk('confirmar: el aviso va por textContent', el('wz-aviso-circuito').textContent.includes('data-xss="aviso"') && el('wz-aviso-circuito').innerHTML === '')
  chk('confirmar: con ocasional el total no se muestra', el('wz-bloque-total').hidden === true)
  S.renderizarBloquesCircuito(w({ importeOcr: 1500 }))
  chk('confirmar: con CC el total se muestra y viene del OCR', el('wz-bloque-total').hidden === false && el('campo-total-factura').value === '1.500')
  chk('confirmar: "no suma stock" se ofrece en facturas', el('wz-bloque-sin-stock').hidden === false)
  S.renderizarBloquesCircuito(w({ encabezado: { tipoDoc: 'sin_comprobante' } }))
  chk('confirmar: "no suma stock" NO se ofrece sin comprobante', el('wz-bloque-sin-stock').hidden === true)

  // Datos del gasto: solo llenan lo vacío y vinculan su proveedor.
  S.estado.proveedores = [{ id: 'pg' }]
  S.estado.wizard = { encabezado: { numeroDoc: '0001-99', razonSocial: '', fecha: '' }, proveedorId: 'otro',
    desdeGasto: { numero_doc: '0005-1', razon_social: 'DEL GASTO', fecha: '2026-10-02', proveedor_id: 'pg' } }
  S.aplicarDatosDelGasto()
  chk('gasto: no pisa el número que leyó el OCR', S.estado.wizard.encabezado.numeroDoc === '0001-99')
  chk('gasto: llena la razón social vacía', S.estado.wizard.encabezado.razonSocial === 'DEL GASTO')
  chk('gasto: vincula el proveedor del gasto', S.__llamadas.elegido.includes('pg'))

  chk('ruta de gasto: una ruta queda igual', S.rutaComprobanteGasto('uid/123.jpg') === 'uid/123.jpg')
  chk('ruta de gasto: de una URL firmada vieja saca la ruta',
    S.rutaComprobanteGasto('https://x.supabase.co/storage/v1/object/sign/comprobantes/uid/1%202.jpg?token=abc') === 'uid/1 2.jpg')
  chk('ruta de gasto: vacío es null', S.rutaComprobanteGasto('') === null && S.rutaComprobanteGasto(null) === null)
}

// ══════════════════════════════════════════════════════════════════════════
// 5. EL GUARDADO: ORDEN Y CONTRATO (sobre el fuente, anclado a la condición)
// ══════════════════════════════════════════════════════════════════════════
{
  const conf = extraerFn(FUENTE, 'confirmarIngreso')
  const iInsertItems = conf.indexOf(".from('materia_prima_items').insert(")
  const iCircuito = conf.indexOf('await pasarAlCircuito(ingresoId, circuito)')
  const iCatch = conf.indexOf('} catch (e) {')
  chk('guardado: existen el insert de ítems, la llamada al circuito y el catch', iInsertItems > 0 && iCircuito > 0 && iCatch > 0)
  chk('guardado: el circuito corre DESPUÉS de guardar los ítems', iInsertItems > 0 && iCircuito > iInsertItems)
  chk('guardado: sin_stock_motivo va al insert, solo en facturas',
    /sin_stock_motivo: \(esFactura\(e\.tipoDoc\) && w\.sinStock\) \? w\.sinStockMotivo\.trim\(\) : null/.test(conf))
  chk('guardado: se valida el circuito ANTES de marcar guardando',
    conf.indexOf('validarCircuitoAntesDeGuardar(w)') > 0 && conf.indexOf('validarCircuitoAntesDeGuardar(w)') < conf.indexOf('w.guardando = true'))
  chk('guardado: Ingreso nunca inserta en gastos', !/from\('gastos'\)/.test(FUENTE))
  chk('guardado: el wizard reiniciado conserva el gasto de origen',
    /estado\.wizard\.desdeGasto = previo\.desdeGasto/.test(extraerFn(FUENTE, 'reiniciarLecturaWizard')))
}

// ══════════════════════════════════════════════════════════════════════════
// 6. ESTÁTICO, ACOTADO A LAS FUNCIONES NUEVAS
// ══════════════════════════════════════════════════════════════════════════
estaticoAcotado(chk, ARCHIVO, FUENTE,
  ['htmlCircuitoDetalle', 'htmlPagadoSinIngresar', 'htmlResultadoCircuito', 'renderizarPagadoSinIngresar'],
  {
    escape: 'esc',
    seguras: [
      ['nivel', 'clase CSS: solo pasa si está en NIVELES_CIRCUITO, si no cae a neutro'],
      ['lineas', 'HTML ya escapado: se arma arriba con esc(l) de cada línea'],
    ],
    segurasRegex: [
      [/^htmlPagadoSinIngresar\(filas, /s, 'HTML armado por htmlPagadoSinIngresar(), que escapa adentro'],
    ],
  })

fin()
