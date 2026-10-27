// EL PRECIO DE COMPRA EN EL INGRESO DE MATERIA PRIMA (27/10/2026, rama
// ci-prueba/precios-compra). materia_prima_items.precio_unitario es el precio
// SIN IVA por unidad de medida del insumo y alicuota_iva el % de IVA (0 = vino
// sin IVA); precios_compra() arma con eso la lista de Stock (leídas con
// pg_get_functiondef el 27/10/2026). Lo que se prueba, con las funciones REALES
// de modulos/materia-prima.html:
//  - del OCR: el precio por bulto o por unidad según cierre con el total de la
//    línea, y el IVA del renglón (uno raro va en "Otro");
//  - "$ 17.500 la bolsa = $ 700 el kg" y el precio final con IVA;
//  - Factura X, remito o sin comprobante = IVA 0, sin elegir;
//  - lo que se guarda: por unidad de medida, 4 decimales, con su alícuota; sin
//    precio, los dos en null; en mixto, en cada fila;
//  - lo que no deja seguir (por bulto sin contenido, factura A sin IVA) y el
//    aviso amarillo de la factura A sin precio (que no frena);
//  - el bloque de la tarjeta (escapado) y sus campos.
//
//   node pruebas/test-materia-prima-precios.js
//   ARCHIVO_TEST=<copia de modulos/materia-prima.html> node pruebas/test-materia-prima-precios.js
'use strict'

const path = require('path')
const fs = require('fs')
const { construirCon } = require('./sandbox')
const { arnes, leer, marca, escapada } = require('./circuito-comun')
const { fuenteNumeros, inputFalso } = require('./numeros-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos', 'materia-prima.html')
leer(ARCHIVO)
const HTML = fs.readFileSync(ARCHIVO, 'utf8')
const { chk, fin } = arnes()

// textoResultadoVivo, textoBultoIncompleto y resultadoNoCierra vivían ADENTRO
// de htmlItemAbierto (01/09/2026): actualizarTotalEnVivo no las veía, cada
// tecla en una cantidad "en bultos" tiraba ReferenceError y el precio (y la
// diferencia) no se refrescaban. Tienen que estar afuera.
{
  const ini = HTML.indexOf('    function htmlItemAbierto(item) {')
  const fin1 = HTML.indexOf('\n    }\n', ini)
  const cuerpo = HTML.slice(ini, fin1)
  for (const f of ['textoResultadoVivo', 'textoBultoIncompleto', 'resultadoNoCierra']) {
    chk(`${f} está afuera de htmlItemAbierto (la ve actualizarTotalEnVivo)`, ini > 0 && !cuerpo.includes(`function ${f}(`) && HTML.includes(`\n    function ${f}(`))
  }
}

const PRELUDIO = `
  var console = { log(){}, warn(){}, error(){} }
  ${fuenteNumeros()}
  var estado = { wizard: { encabezado: { tipoDoc: 'factura_a' }, items: [] }, catalogoInsumos: [] }
  var __renders = 0
  var renderizarItems = function () { __renders++ }
  // Lo de alrededor de itemDesdeOcr, de mentira.
  var nuevoUid = function () { return 'u-1' }
  var aliasDe = function () { return null }
  var buscarEnCatalogo = function () { return estado.__match ?? null }
  var tipoSugeridoValido = function (t) { return t ?? null }
  var normalizarUnidad = function (u) { return u ?? null }
`
const FUNCIONES = ['esc', 'numeroDesdeOcr', 'esUnidadEntera', 'formatearCantidad', 'formatearNumero', 'esFactura',
  'ivaVaEnCero', 'contenidoParaPrecio', 'nombreBultoDe', 'laDelBulto', 'laUnidadDePrecio', 'precioPorUnidadItem',
  'ivaDelItem', 'conIva', 'plataPrecio', 'textoEquivalePrecio', 'textoFinalPrecio', 'faltaPrecioFacturaA',
  'errorPrecioItem', 'precioDesdeOcr', 'ivaDesdeOcr', 'precioParaBase', 'textoPorBulto', 'htmlPrecioItem',
  'refrescarPrecioEnVivo', 'cablearPrecioItem',
  'itemDesdeOcr', 'hayDiferenciaReal', 'filaItemParaBase', 'filasItemParaBase']

function armar(tipoDoc = 'factura_a') {
  const S = construirCon(ARCHIVO, {
    preludio: PRELUDIO, funciones: FUNCIONES,
    constantes: ['UNIDADES_ENTERAS', 'ALICUOTAS_IVA', 'DECIMALES_PRECIO', 'TOLERANCIA_CANTIDAD'],
    retorno: 'estado, __renders: () => __renders',
  })
  S.estado.wizard.encabezado.tipoDoc = tipoDoc
  S.estado.catalogoInsumos = [{ id: 'i-harina', nombre: 'Harina 000', unidad_medida: 'kg', nombre_bulto: 'bolsa' }]
  return S
}

// Un renglón de 20 bolsas de 25 kg de harina.
function bolsas(extra = {}) {
  return { insumoId: 'i-harina', unidadMedida: 'kg', interpretacion: 'bultos', bultos: 20, contenido: 25,
    cantidad: 500, lineas: null, precio: 17500, precioPorBulto: true, iva: 21, ivaOtro: false, ...extra }
}

// ═══ Del OCR ══════════════════════════════════════════════════════════════
{
  const S = armar()
  const p = (c) => JSON.stringify(S.precioDesdeOcr(c, c.cantidad_bultos ?? null, c.contenido_por_bulto ?? null))
  chk('bolsas: el precio cierra con el total por bolsa → por bulto',
    p({ cantidad_bultos: 20, contenido_por_bulto: 25, cantidad_total: 500, precio_unitario: 17500, precio_total: 350000 }) === '{"precio":17500,"porBulto":true}')
  chk('bolsas: el precio cierra con el total por kg → por unidad',
    p({ cantidad_bultos: 20, contenido_por_bulto: 25, cantidad_total: 500, precio_unitario: 700, precio_total: 350000 }) === '{"precio":700,"porBulto":false}')
  chk('bolsas sin total: manda la línea (contó bultos) → por bulto',
    p({ cantidad_bultos: 20, contenido_por_bulto: 25, cantidad_total: 500, precio_unitario: 17500 }) === '{"precio":17500,"porBulto":true}')
  chk('sin bultos: por unidad', p({ cantidad_total: 500, precio_unitario: 700 }) === '{"precio":700,"porBulto":false}')
  chk('solo el total, con bultos: total ÷ bultos, por bulto',
    p({ cantidad_bultos: 20, contenido_por_bulto: 25, cantidad_total: 500, precio_total: 350000 }) === '{"precio":17500,"porBulto":true}')
  chk('solo el total, sin bultos: total ÷ cantidad', p({ cantidad_total: 500, precio_total: 350000 }) === '{"precio":700,"porBulto":false}')
  chk('bulto de 1: por unidad', p({ cantidad_bultos: 8, contenido_por_bulto: 1, cantidad_total: 8, precio_unitario: 90 }) === '{"precio":90,"porBulto":false}')
  chk('sin precio: null', p({ cantidad_total: 500 }) === '{"precio":null,"porBulto":false}')
  chk('el IVA del renglón', S.ivaDesdeOcr({ alicuota_iva: 10.5 }) === 10.5 && S.ivaDesdeOcr({ alicuota_iva: '21' }) === 21)
  chk('un IVA imposible no entra', S.ivaDesdeOcr({ alicuota_iva: 150 }) === null && S.ivaDesdeOcr({}) === null)

  const it = S.itemDesdeOcr({ descripcion: 'Harina 000', cantidad_bultos: 20, contenido_por_bulto: 25, cantidad_total: 500,
    unidad_medida: 'kg', precio_unitario: 17500, precio_total: 350000, alicuota_iva: 21 })
  chk('itemDesdeOcr trae el precio, por bulto, marcado como leído de la foto, con el IVA',
    it.precio === 17500 && it.precioPorBulto === true && it.precioDeOcr === true && it.iva === 21 && it.ivaOtro === false, JSON.stringify(it))
  const raro = S.itemDesdeOcr({ descripcion: 'x', cantidad_total: 5, unidad_medida: 'kg', precio_unitario: 10, alicuota_iva: 2.5 })
  chk('un IVA fuera de la lista va en "Otro"', raro.iva === 2.5 && raro.ivaOtro === true)
  const sin = S.itemDesdeOcr({ descripcion: 'x', cantidad_total: 5, unidad_medida: 'kg' })
  chk('sin precio en el papel: vacío y sin marca', sin.precio === null && sin.precioDeOcr === false && sin.iva === null)
}

// ═══ Cuentas y textos ═════════════════════════════════════════════════════
{
  const S = armar('factura_a')
  chk('por bulto: $ 17.500 la bolsa de 25 kg = 700 el kg', S.precioPorUnidadItem(bolsas()) === 700)
  chk('por unidad: tal cual', S.precioPorUnidadItem(bolsas({ precio: 700, precioPorBulto: false })) === 700)
  chk('por bulto sin contenido: no se puede pasar (null)', S.precioPorUnidadItem(bolsas({ contenido: null })) === null)
  chk('por bulto en mixto: tampoco', S.precioPorUnidadItem(bolsas({ lineas: [{ bultos: 1, contenido: 25 }] })) === null)
  chk('por bulto a granel: tampoco', S.precioPorUnidadItem(bolsas({ interpretacion: 'granel' })) === null)
  chk('las dos cosas: "$ 17.500,00 la bolsa = $ 700,00 el kg"',
    S.textoEquivalePrecio(bolsas()) === '$ 17.500,00 la bolsa = $ 700,00 el kg', S.textoEquivalePrecio(bolsas()))
  chk('por unidad no repite la equivalencia', S.textoEquivalePrecio(bolsas({ precio: 700, precioPorBulto: false })) === '')
  chk('el final con IVA 21: la bolsa y el kg',
    S.textoFinalPrecio(bolsas(), 'factura_a') === 'Precio final con IVA: $ 21.175,00 la bolsa · $ 847,00 el kg', S.textoFinalPrecio(bolsas(), 'factura_a'))
  chk('por unidad: solo el kg', S.textoFinalPrecio(bolsas({ precio: 700, precioPorBulto: false }), 'factura_a') === 'Precio final con IVA: $ 847,00 el kg')
  chk('factura A sin IVA elegido: no hay final', S.textoFinalPrecio(bolsas({ iva: null }), 'factura_a') === '')
  chk('IVA 10,5', S.textoFinalPrecio(bolsas({ precio: 1000, precioPorBulto: false, iva: 10.5 }), 'factura_a') === 'Precio final con IVA: $ 1.105,00 el kg')
  chk('sin nombre de bulto: "el bulto"', (() => { S.estado.catalogoInsumos = []; const t = S.textoEquivalePrecio(bolsas()); S.estado.catalogoInsumos = [{ id: 'i-harina', nombre_bulto: 'bolsa' }]; return t === '$ 17.500,00 el bulto = $ 700,00 el kg' })())
  chk('unidades y litros', S.laUnidadDePrecio('un') === 'la unidad' && S.laUnidadDePrecio('lt') === 'el litro' && S.laUnidadDePrecio('kg') === 'el kg')
  chk('los precios chicos con 4 decimales', S.plataPrecio(0.3456) === '$ 0,3456' && S.plataPrecio(700) === '$ 700,00')
  for (const t of ['factura_x', 'remito', 'sin_comprobante']) {
    chk(`${t}: IVA 0 sin elegir`, S.ivaDelItem(bolsas({ iva: 21 }), t) === 0 &&
      S.textoFinalPrecio(bolsas({ iva: null }), t) === 'Precio final con IVA: $ 17.500,00 la bolsa · $ 700,00 el kg')
  }
  chk('factura A: el elegido', S.ivaDelItem(bolsas({ iva: 27 }), 'factura_a') === 27)
}

// ═══ Lo que no deja seguir, y el aviso amarillo ═══════════════════════════
{
  const S = armar()
  chk('sin precio: nada que frenar', S.errorPrecioItem(bolsas({ precio: null, iva: null }), 'factura_a') === null)
  chk('por bulto sin contenido: se dice', /El precio es por bolsa: cargá cuánto trae cada uno, o pasalo a precio por kg\./.test(S.errorPrecioItem(bolsas({ contenido: null }), 'factura_a') || ''))
  chk('factura A con precio y sin IVA: se pide', S.errorPrecioItem(bolsas({ iva: null }), 'factura_a') === 'Elegí el IVA del precio.')
  chk('un IVA de más de 100: se dice', S.errorPrecioItem(bolsas({ iva: 150 }), 'factura_a') === 'El IVA va de 0 a 100 %.')
  chk('remito con precio y sin IVA: no frena (es 0)', S.errorPrecioItem(bolsas({ iva: null }), 'remito') === null)
  chk('completo: nada', S.errorPrecioItem(bolsas(), 'factura_a') === null)
  chk('aviso amarillo: factura A sin precio', S.faltaPrecioFacturaA(bolsas({ precio: null }), 'factura_a') === true)
  chk('… no en un remito ni en factura X', !S.faltaPrecioFacturaA(bolsas({ precio: null }), 'remito') && !S.faltaPrecioFacturaA(bolsas({ precio: null }), 'factura_x'))
  chk('… ni con precio', !S.faltaPrecioFacturaA(bolsas(), 'factura_a'))
  chk('validarItems lo usa después de los demás controles',
    /\n\s*\}\n\s*if \(!item\.error\) item\.error = errorPrecioItem\(item, w\.encabezado\.tipoDoc\)\n\s*if \(item\.error && !primeroConError\)/.test(HTML))
}

// ═══ Lo que se guarda ═════════════════════════════════════════════════════
{
  const S = armar('factura_a')
  const f = S.filaItemParaBase(bolsas(), 'ing-1')
  chk('se guarda por kg y sin IVA, con su alícuota', f.precio_unitario === 700 && f.alicuota_iva === 21, JSON.stringify(f))
  chk('… y el resto de la fila sigue igual', f.cantidad === 500 && f.cantidad_bultos === 20 && f.contenido_por_bulto === 25 && f.insumo_id === 'i-harina')
  chk('4 decimales', S.filaItemParaBase(bolsas({ precio: 10, precioPorBulto: false, cantidad: 3, bultos: null, interpretacion: 'granel' }), 'x').precio_unitario === 10 &&
    S.filaItemParaBase(bolsas({ precio: 1000, contenido: 3, cantidad: 60 }), 'x').precio_unitario === 333.3333)
  const sin = S.filaItemParaBase(bolsas({ precio: null }), 'x')
  chk('sin precio: los dos en null', sin.precio_unitario === null && sin.alicuota_iva === null)
  S.estado.wizard.encabezado.tipoDoc = 'factura_x'
  chk('factura X: alícuota 0 aunque haya quedado otra', S.filaItemParaBase(bolsas({ iva: 21 }), 'x').alicuota_iva === 0)
  S.estado.wizard.encabezado.tipoDoc = 'remito'
  chk('remito: alícuota 0', S.filaItemParaBase(bolsas({ iva: null }), 'x').alicuota_iva === 0)
  S.estado.wizard.encabezado.tipoDoc = 'factura_a'
  const mix = S.filasItemParaBase(bolsas({ precio: 700, precioPorBulto: false, bultos: null, contenido: null,
    lineas: [{ bultos: 10, contenido: 25 }, { bultos: 5, contenido: 50 }] }), 'x')
  chk('en mixto, el precio en cada fila', mix.length === 2 && mix.every(r => r.precio_unitario === 700 && r.alicuota_iva === 21), JSON.stringify(mix))
  chk('los dos caminos de guardar pasan por filasItemParaBase',
    (HTML.match(/const filas = w\.items\.flatMap\(item => filasItemParaBase\(item, ingresoId\)\)/g) || []).length === 2)
  chk('el catálogo trae el nombre del bulto', /\.select\('id, nombre, marca, unidad_medida, tipo, estado_alta, categoria, nombre_bulto'\)/.test(HTML))
}

// ═══ La tarjeta ═══════════════════════════════════════════════════════════
{
  const S = armar('factura_a')
  let h = S.htmlPrecioItem(bolsas())
  chk('el bloque dice "Precio unitario sin IVA"', h.includes('Precio unitario sin IVA') && h.includes('data-precio="precio"'))
  chk('IVA %: 0 / 10,5 / 21 / 27 y Otro', h.includes('>0 %</option>') && h.includes('>10,5 %</option>') && h.includes('>21 %</option>') && h.includes('>27 %</option>') && h.includes('value="otro"'), h)
  chk('… con el elegido marcado', /<option value="21" selected>21 %<\/option>/.test(h))
  chk('por bolsa de 25 kg / por kg', h.includes('data-accion="precio-por-bulto"') && h.includes('por bolsa de 25 kg') && h.includes('data-accion="precio-por-unidad"') && h.includes('>por kg</button>'))
  chk('las dos cosas y el final ya dibujados', h.includes('$ 17.500,00 la bolsa = $ 700,00 el kg') && h.includes('Precio final con IVA: $ 21.175,00 la bolsa · $ 847,00 el kg'))
  chk('el aviso amarillo escondido con precio', /data-precio-falta hidden>/.test(h))
  h = S.htmlPrecioItem(bolsas({ precio: null }))
  chk('factura A sin precio: el aviso a la vista', /data-precio-falta >⚠ Es factura A y este renglón no tiene precio/.test(h), h)
  h = S.htmlPrecioItem(bolsas({ precio: 700, precioPorBulto: false, interpretacion: 'granel', bultos: null, contenido: null }))
  chk('a granel no ofrece "por bulto"', !h.includes('data-accion="precio-por-bulto"'))
  h = S.htmlPrecioItem(bolsas({ precio: null, precioPorBulto: false, contenido: null }))
  chk('en bultos, aunque falte el contenido, ya ofrece "por bolsa"', h.includes('data-accion="precio-por-bulto"') && h.includes('>por bolsa</button>'), h)
  h = S.htmlPrecioItem(bolsas({ precio: null, precioPorBulto: false, lineas: [{ bultos: 1, contenido: 25 }] }))
  chk('en mixto no ofrece "por bulto"', !h.includes('data-accion="precio-por-bulto"'))
  h = S.htmlPrecioItem(bolsas({ ivaOtro: true, iva: 2.5 }))
  chk('"Otro": el campo para escribirlo', /<option value="otro" selected>Otro<\/option>/.test(h) && h.includes('data-precio="ivaOtro"'))
  S.estado.wizard.encabezado.tipoDoc = 'remito'
  h = S.htmlPrecioItem(bolsas())
  chk('remito: IVA 0 sin elegir', !h.includes('data-precio="iva"') && h.includes('IVA 0 %') && h.includes('(remito: va sin IVA)'))
  S.estado.wizard.encabezado.tipoDoc = 'factura_x'
  chk('factura X: IVA 0 sin elegir', S.htmlPrecioItem(bolsas()).includes('(Factura X: va sin IVA)'))
  S.estado.wizard.encabezado.tipoDoc = 'factura_a'
  S.estado.catalogoInsumos = [{ id: 'i-harina', nombre_bulto: marca('bulto') }]
  h = S.htmlPrecioItem(bolsas())
  chk('el nombre del bulto, escapado', !/<b data-xss=/.test(h) && h.includes(escapada('bulto')), h)
  chk('la tarjeta abierta lo dibuja después del lote', /\$\{loteHtml\}\n\n\s*\$\{htmlPrecioItem\(item\)\}/.test(HTML))
}

// ═══ Los campos ═══════════════════════════════════════════════════════════
{
  const S = armar('factura_a')
  const item = bolsas({ precio: null, iva: null })
  const precio = inputFalso(), iva = { value: '', oy: {}, addEventListener(t, f) { this.oy[t] = f } }
  const lineas = { '[data-precio-equivale]': { textContent: '' }, '[data-precio-final]': { textContent: '' }, '[data-precio-falta]': { hidden: false } }
  const tarjeta = { querySelector: (s) => s === '[data-precio="precio"]' ? precio : s === '[data-precio="iva"]' ? iva : lineas[s] ?? null }
  S.cablearPrecioItem(tarjeta, item)
  precio.teclear('17500')
  chk('tipear el precio lo guarda en el renglón', item.precio === 17500 && item.precioDeOcr === false, String(item.precio))
  chk('… refresca la equivalencia y saca el aviso amarillo, sin re-dibujar',
    lineas['[data-precio-equivale]'].textContent === '$ 17.500,00 la bolsa = $ 700,00 el kg' && lineas['[data-precio-falta]'].hidden === true && S.__renders() === 0)
  iva.value = '10.5'; iva.oy.change()
  chk('elegir el IVA: 10,5 y el final', item.iva === 10.5 && lineas['[data-precio-final]'].textContent === 'Precio final con IVA: $ 19.337,50 la bolsa · $ 773,50 el kg', lineas['[data-precio-final]'].textContent)
  iva.value = 'otro'; iva.oy.change()
  chk('"Otro" re-dibuja para mostrar el campo', item.ivaOtro === true && item.iva === null && S.__renders() === 1)
  iva.value = '21'; iva.oy.change()
  chk('volver de "Otro" re-dibuja', item.ivaOtro === false && item.iva === 21 && S.__renders() === 2)
  chk('cablearItems engancha el precio', /enlazarCantidadesItem\(tarjeta, item\)\n\s*cablearPrecioItem\(tarjeta, item\)/.test(HTML))
  chk('tipear una cantidad refresca el precio', /actualizarDiferenciaEnVivo\(tarjeta, item\)\n\s*\/\/[^\n]*\n\s*refrescarPrecioEnVivo\(tarjeta, item\)/.test(HTML))
  // El contenido llega después: el rótulo y la equivalencia se ponen solos.
  const it2 = bolsas({ contenido: null })
  const boton = { textContent: 'por bolsa' }
  const eq = { textContent: '' }
  const t2 = { querySelector: (s) => s === '[data-accion="precio-por-bulto"]' ? boton : s === '[data-precio-equivale]' ? eq : null }
  it2.contenido = 25
  S.refrescarPrecioEnVivo(t2, it2)
  chk('escribir el contenido pone "por bolsa de 25 kg" y la equivalencia', boton.textContent === 'por bolsa de 25 kg' && eq.textContent === '$ 17.500,00 la bolsa = $ 700,00 el kg', boton.textContent + ' | ' + eq.textContent)
  chk('los botones por bulto / por unidad', /if \(accion === 'precio-por-bulto' \|\| accion === 'precio-por-unidad'\) \{\n\s*item\.precioPorBulto = accion === 'precio-por-bulto'\n\s*renderizarItems\(\)/.test(HTML))
}

fin()
