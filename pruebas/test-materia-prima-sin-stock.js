// "Mercadería que ya estaba" en modulos/materia-prima.html (Ingreso), parte
// 10c (22/09/2026): con la casilla marcada —solo en facturas— el ingreso no
// suma stock y el LOTE DE LOS RENGLONES ES OPCIONAL. La base ya lo acompaña:
// fn_validar_item_materia_prima no pide lote cuando la cabecera tiene
// sin_stock_motivo (mismo criterio que fn_espejar_stock_ingreso).
//
// Se EJECUTA el código real: validarItems, las dos tarjetas (cerrada y
// abierta), el payload de ítems (filasItemParaBase) y el render del bloque
// de la casilla, que se mudó del paso Confirmar al paso Datos.
//
// Archivo bajo prueba: ARCHIVO_TEST, o modulos/materia-prima.html.

const path = require('path')
const { construirCon } = require('./sandbox')
const { extraerFn } = require('./extraer')
const { leer } = require('./circuito-comun')
const { fuenteNumeros } = require('./numeros-comun')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/materia-prima.html')
const FUENTE = leer(ARCHIVO)
console.log(`LEIDO:${FUENTE.length}`)

let ok = 0
const fallas = []
function chk(nombre, condicion, detalle) {
  if (condicion) ok++
  else fallas.push(nombre + (detalle !== undefined ? ` — ${typeof detalle === 'string' ? detalle : JSON.stringify(detalle)}` : ''))
}

const PRELUDIO = `
  ${fuenteNumeros()}
  var __els = new Map()
  var __errores = []
  function __el(id) {
    if (!__els.has(id)) __els.set(id, { id, hidden: true, checked: false, value: '', innerHTML: '', textContent: '' })
    return __els.get(id)
  }
  var document = { getElementById: __el, querySelectorAll: () => [] }
  function mostrarError(m) { __errores.push(m) }
  function renderizarItems() {}
  function hayCampoIlegible() { return false }
  function categoriasConocidas() { return [] }
  function htmlCategoriaNueva() { return '' }
  function htmlSugerenciasCatalogo() { return '' }
  function sugerenciasPorParecido() { return [] }
  function chipsPresentacion() { return '' }
  function avisoTotalOcr() { return '' }
  function presentacionesQueDividen() { return [] }
  function presentacionFavorita() { return null }
  function hayQueElegir() { return false }
  function textoResultadoVivo() { return '' }
  function textoBultoIncompleto() { return '' }
  function desgloseIncompleto() { return '' }
  function resultadoNoCierra() { return false }
  function textoDiferencia() { return '' }
  function textoCantidadDocumento() { return '' }
  function textoCantidad() { return '100 kg' }
  function conSufijo(t) { return t }
  var __pasos = []
  function leerEncabezadoDelForm() {}
  async function asegurarAliasProveedor() {}
  async function buscarComprobanteYaCargado() {}
  async function asegurarRemitosVinculables() {}
  function irAPasoWz(id) { __pasos.push(id) }
  var estado = { wizard: null }
`

const FUNCIONES = [
  'esc', 'esFactura', 'ingresoNoSumaStock', 'renderizarBloqueSinStock', 'validarItems', 'continuarDesdeDatos',
  'htmlItemCerrado', 'htmlItemAbierto', 'etiquetaTipo', 'chipTipoInsumo',
  'filasItemParaBase', 'filaItemParaBase', 'itemProduceFilaIncoherente', 'filaIncoherente', 'derivarCantidades',
  'hayDiferenciaReal', 'diferenciaDe', 'dividirExacto', 'bultosEnteros', 'lineasCierran',
  'sumaDeControl', 'totalDeLineas', 'formatearCantidad', 'formatearNumero',
]
const CONSTANTES = ['TOLERANCIA_CANTIDAD']

const S = construirCon(ARCHIVO, {
  preludio: PRELUDIO, funciones: FUNCIONES, constantes: CONSTANTES,
  retorno: 'estado, __els, __errores, __pasos',
})

// Un renglón de materia prima completo y válido, SIN lote.
function item(extra = {}) {
  return {
    uid: 'u1', insumoId: 'ins-1', esNuevo: false, creando: false, nombre: 'Harina 000', marca: '',
    tipo: 'materia_prima', unidadMedida: 'kg', interpretacion: 'granel', numeroPapel: 100, lineas: null,
    bultosPapel: null, contenidoPapel: null, bultos: null, contenido: null, cantidad: 100,
    cantidadOcrOriginal: null, yaRecibido: false, difiere: false, cantidadDocumento: null,
    motivoDiferencia: '', recibido: null, recibidoEnUnidades: false, lote: '', loteIlegible: false,
    fichaTecnicaUrl: null, fotoLoteUrl: null, error: null,
    ...extra,
  }
}
function wizard(tipoDoc, sinStock, it) {
  return { items: [it], encabezado: { tipoDoc }, sinStock, sinStockMotivo: sinStock ? 'ya se contó' : '', itemAbierto: null }
}
function validar(tipoDoc, sinStock, it) {
  S.estado.wizard = wizard(tipoDoc, sinStock, it)
  S.__errores.length = 0
  const r = S.validarItems()
  return { r, error: it.error }
}

// ══ 1. validarItems ═══════════════════════════════════════════════════════
{
  const a = validar('factura_a', false, item())
  chk('factura, casilla desmarcada, materia prima sin lote → error de lote', a.r === false && /lote/i.test(a.error || ''), a)
  const b = validar('factura_a', true, item())
  chk('factura, casilla marcada, materia prima sin lote → sin error', b.r === true && b.error === null, b)
  const bx = validar('factura_x', true, item())
  chk('factura X, casilla marcada → sin error', bx.r === true && bx.error === null, bx)
  const c = validar('remito', true, item())
  chk('remito (la casilla no aplica aunque sinStock quede en true) → error de lote', c.r === false && /lote/i.test(c.error || ''), c)
  const d = validar('sin_comprobante', true, item())
  chk('sin comprobante con sinStock en true → error de lote', d.r === false && /lote/i.test(d.error || ''), d)
  const e = validar('factura_a', true, item({ lote: 'L-1' }))
  chk('casilla marcada con lote cargado → sin error', e.r === true && e.error === null, e)
  const f = validar('factura_a', false, item({ loteIlegible: true }))
  chk('sin casilla, lote ilegible sigue alcanzando', f.r === true && f.error === null, f)
  // Al desmarcar la casilla, la misma validación vuelve a exigir lote.
  const it = item()
  S.estado.wizard = wizard('factura_a', true, it)
  S.validarItems()
  S.estado.wizard.sinStock = false
  chk('desmarcar la casilla vuelve a exigir lote', S.validarItems() === false && /lote/i.test(it.error || ''), it.error)
}

// ══ 2. Payload de ítems: no se inventa nada ═══════════════════════════════
{
  const it = item()
  S.estado.wizard = wizard('factura_a', true, it)
  const filas = S.filasItemParaBase(it, 'ing-1')
  chk('payload con casilla y sin lote: una fila', filas.length === 1, filas)
  chk('payload: lote null (no inventado)', filas[0].lote === null, filas[0])
  chk('payload: lote_ilegible false (nada lo marca solo)', filas[0].lote_ilegible === false, filas[0])
  const conLote = S.filasItemParaBase(item({ lote: ' L-9 ' }), 'ing-1')
  chk('payload: un lote tipeado viaja recortado', conLote[0].lote === 'L-9', conLote[0])
}

// ══ 3. Tarjeta cerrada: sin chip "Sin lote" con la casilla ═════════════════
{
  S.estado.wizard = wizard('factura_a', true, item())
  const conCasilla = S.htmlItemCerrado(item())
  chk('cerrada, casilla marcada, sin lote: no dice "Sin lote"', !conCasilla.includes('Sin lote'), conCasilla)
  S.estado.wizard = wizard('factura_a', false, item())
  const sinCasilla = S.htmlItemCerrado(item())
  chk('cerrada, casilla desmarcada, sin lote: dice "Sin lote"', sinCasilla.includes('Sin lote'), sinCasilla)
  S.estado.wizard = wizard('remito', true, item())
  chk('cerrada, remito con sinStock en true: dice "Sin lote"', S.htmlItemCerrado(item()).includes('Sin lote'))
  S.estado.wizard = wizard('factura_a', true, item())
  chk('cerrada, casilla marcada con lote: muestra el lote', S.htmlItemCerrado(item({ lote: 'L-7' })).includes('L-7'))
  chk('cerrada, casilla marcada, ilegible: dice Ilegible', S.htmlItemCerrado(item({ loteIlegible: true })).includes('Ilegible'))
}

// ══ 4. Tarjeta abierta: OPCIONAL en vez de OBLIGATORIO ═════════════════════
{
  S.estado.wizard = wizard('factura_a', true, item())
  const abierta = S.htmlItemAbierto(item())
  chk('abierta, casilla marcada: el lote dice OPCIONAL', abierta.includes('OPCIONAL') && !abierta.includes('OBLIGATORIO'), abierta.slice(0, 300))
  chk('abierta, casilla marcada: el campo de lote se sigue dibujando', /data-campo="lote"/.test(abierta))
  chk('abierta, casilla marcada: el hint lo explica', abierta.includes('No suma stock: el lote es opcional'))
  chk('abierta, casilla marcada: "Lote ilegible" sigue disponible y sin marcar',
    abierta.includes('data-accion="lote-ilegible"') && !abierta.includes('btn-item-secundario--activo" data-accion="lote-ilegible"'))
  S.estado.wizard = wizard('factura_a', false, item())
  const obligatoria = S.htmlItemAbierto(item())
  chk('abierta, casilla desmarcada: el lote dice OBLIGATORIO', obligatoria.includes('OBLIGATORIO') && !obligatoria.includes('OPCIONAL'))
  S.estado.wizard = wizard('remito', true, item())
  chk('abierta, remito con sinStock en true: OBLIGATORIO', S.htmlItemAbierto(item()).includes('OBLIGATORIO'))
}

// ══ 5. La casilla vive en el paso Datos ═══════════════════════════════════
{
  const iDatos = FUENTE.indexOf('id="wz-paso-datos"')
  const iVinculo = FUENTE.indexOf('id="wz-paso-vinculo"')
  const iConfirmar = FUENTE.indexOf('id="wz-paso-confirmar"')
  const iBloque = FUENTE.indexOf('id="wz-bloque-sin-stock"')
  chk('existen los pasos y el bloque', iDatos > 0 && iVinculo > 0 && iConfirmar > 0 && iBloque > 0, [iDatos, iVinculo, iConfirmar, iBloque])
  chk('el bloque "no suma stock" está DENTRO del paso Datos', iBloque > iDatos && iBloque < iVinculo, [iDatos, iBloque, iVinculo])
  chk('el bloque ya no está en Confirmar', FUENTE.indexOf('id="wz-bloque-sin-stock"', iConfirmar) === -1)
  chk('un solo bloque', FUENTE.split('id="wz-bloque-sin-stock"').length === 2)

  S.estado.wizard = { encabezado: { tipoDoc: 'factura_a' }, sinStock: true, sinStockMotivo: 'se contó' }
  S.renderizarBloqueSinStock()
  const el = (id) => S.__els.get(id)
  chk('render: factura muestra la casilla, marcada, con el motivo', el('wz-bloque-sin-stock').hidden === false &&
    el('campo-sin-stock').checked === true && el('wz-sin-stock-detalle').hidden === false && el('campo-sin-stock-motivo').value === 'se contó')
  S.estado.wizard = { encabezado: { tipoDoc: 'remito' }, sinStock: false, sinStockMotivo: '' }
  S.renderizarBloqueSinStock()
  chk('render: remito oculta la casilla', el('wz-bloque-sin-stock').hidden === true)

  // Anclado a las condiciones, no a la presencia de las llamadas.
  const sel = extraerFn(FUENTE, 'seleccionarTipoDocWz')
  chk('cambiar el tipo de documento redibuja la casilla', /renderizarBloqueSinStock\(\)/.test(sel))
  const ir = extraerFn(FUENTE, 'irAPasoWz')
  chk('entrar al paso Datos dibuja la casilla', /if \(id === 'datos'\)\s*\{[^}]*renderizarBloqueSinStock\(\)/.test(ir))
  const cont = extraerFn(FUENTE, 'continuarDesdeDatos')
  chk('salir de Datos: el motivo se revisa antes de avanzar', cont.indexOf('ingresoNoSumaStock(w)') > 0 &&
    cont.indexOf('ingresoNoSumaStock(w)') < cont.indexOf("irAPasoWz('items')"))
  chk('el listener de la casilla redibuja las tarjetas', /estado\.wizard\.sinStock = ev\.target\.checked[\s\S]{0,400}renderizarItems\(\)/.test(FUENTE))
}

// ══ 6. Detalle del ingreso: sin chip "Sin lote" con sin_stock_motivo ═══════
{
  const det = extraerFn(FUENTE, 'abrirDetalleIngreso')
  chk('el detalle pide ingreso_id de los ítems', /\.select\('id, ingreso_id, /.test(det))
  chk('el detalle arma el set de comprobantes sin stock', /const sinStock = new Set\(entrega\.comprobantes\.filter\(c => c\.sin_stock_motivo\)/.test(det))
  chk('el detalle no dibuja "Sin lote" para esos renglones', /: sinStock\.has\(item\.ingreso_id\) \? ''\s*: '<span class="chip-lote chip-lote--ilegible">Sin lote<\/span>'/.test(det))
}

// ══ 7. Salir del paso Datos (ejecutado) ═══════════════════════════════════
;(async () => {
  const w = (extra) => ({
    encabezado: { tipoDoc: 'factura_a', fecha: '2026-10-05', unidadId: 'u1' }, proveedorParecidos: [],
    sinStock: false, sinStockMotivo: '', hayRemitosVinculables: false, items: [], ...extra,
  })
  async function salir(wz) {
    S.estado.wizard = wz; S.__errores.length = 0; S.__pasos.length = 0
    await S.continuarDesdeDatos()
    return { errores: [...S.__errores], pasos: [...S.__pasos] }
  }
  let r = await salir(w({ sinStock: true, sinStockMotivo: '  ' }))
  chk('Datos: casilla marcada sin motivo → no avanza y lo pide', r.pasos.length === 0 && /no suma stock/.test(r.errores[0] || ''), r)
  r = await salir(w({ sinStock: true, sinStockMotivo: 'x'.repeat(301) }))
  chk('Datos: motivo de más de 300 → no avanza', r.pasos.length === 0 && /300/.test(r.errores[0] || ''), r)
  r = await salir(w({ sinStock: true, sinStockMotivo: 'ya se contó' }))
  chk('Datos: casilla con motivo → avanza a ítems', r.pasos[0] === 'items' && r.errores.length === 0, r)
  r = await salir(w({ encabezado: { tipoDoc: 'remito', fecha: '2026-10-05', unidadId: 'u1' }, sinStock: true, sinStockMotivo: '' }))
  chk('Datos: remito con sinStock pegado → avanza (la casilla no aplica)', r.pasos[0] === 'items' && r.errores.length === 0, r)
  r = await salir(w())
  chk('Datos: sin casilla → avanza', r.pasos[0] === 'items' && r.errores.length === 0, r)
  fin()
})()

function fin() {
console.log(fallas.length ? fallas.map(f => '  ✗ ' + f).join('\n') : '')
console.log(`${ok}/${ok + fallas.length} ${fallas.length ? 'ROJO' : 'verde'}`)
process.exit(fallas.length ? 1 : 0)
}
