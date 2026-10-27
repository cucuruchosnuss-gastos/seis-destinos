// LA HOJA NUEVA DE LA ORDEN (26/10/2026, rama ci-prueba/hoja-orden-nueva,
// aprobada por Facu con un ejemplo): las columnas CANT. | PRODUCTO |
// DESCRIPCIÓN | TOTAL | LOTE (con precios, además P. UNIT. e IMPORTE), un
// renglón por producto, y la fila "TOTAL · N cajas de producto + B bultos + U
// un." con los kilos de los insumos. Se EJECUTA htmlHoja de js/retiros-comun.js
// (la misma de la impresión y del PDF) con los casos del pedido: Cucuruchón
// Grande ×240 en 2 lotes, ×224 con cono DUOMO, Mini ×160, Chico ×128, Harina
// Wali en 2 lotes, Colorante Nico bidón de 25 kg, Caja media altura sin
// impresión por unidad, y las órdenes reales N-0031 (Rodrigo, solo insumos) y
// N-0032 (Richard), leídas de la base el 26/10/2026.
//
//   node pruebas/test-retiros-hoja-nueva.js
// Overrides: ARCHIVO_TEST (retiros.html), ARCHIVO_COMUN_RETIROS (el común).
'use strict'

const path = require('path')
const { construirRetiros } = require('./sandbox-retiros')
const { arnes, leer, marca, escapada } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/retiros.html')
const ADM = process.env.ARCHIVO_ADMIN || path.join(__dirname, '..', 'modulos/administracion.html')
// Las mutaciones confirman qué archivo leyó la suite por estas líneas.
leer(ARCHIVO)
leer(ADM)
const { chk, fin } = arnes()
const S = construirRetiros(ARCHIVO)

const EMPRESA = { id: 'u-n', nombre: 'Cucuruchos Nuss', logo_url: 'logo-cucuruchos-nuss.png' }
const orden = (renglones, extra = {}) => ({
  codigo: 'N-0099', estado: 'confirmada', fecha: '2026-10-26', cargadaPor: 'Emanuel Romero', empresa: EMPRESA,
  cliente: { nombre: 'FERNANDEZ RICARDO' }, renglones, ...extra,
})
const pt = (producto, presentacion, porCaja, cajas, lotes = [], extra = {}) =>
  ({ producto, presentacion, cono: 'Sin cono', cajas, unidades: porCaja * cajas, lotes, ...extra })
const ins = (producto, marca, cantidad, unidad, contenido, nombreBulto, lotes = []) =>
  ({ esInsumo: true, producto, marca, cantidad, unidad, contenido, nombreBulto, lotes })

// Las filas de la tabla, como [celdas en HTML].
function filas(h) {
  const t = h.slice(h.indexOf('<table'), h.indexOf('</table>'))
  // (Sin el <span class="rh-lote__uno"> que junta cada lote con su cantidad: se mira aparte.)
  return [...t.matchAll(/<tr[^>]*>(.*?)<\/tr>/g)].map(m => [...m[1].matchAll(/<t[dh][^>]*>(.*?)<\/t[dh]>/g)].map(c => c[1].replace(/<span class="rh-lote__uno">(.*?<\/span>)<\/span>/g, '$1')))
}
const sinEtiquetas = (x) => String(x).replace(/<[^>]+>/g, '')
const hoja = (o, op = {}) => S.htmlHoja(o, { copias: ['ORIGINAL'], ...op })

const CUC_240 = pt('Cucuruchón Grande', 'Caja sin cono', 240, 42, [{ lote: '6262-1', cajas: 30 }, { lote: '6263-2', cajas: 12 }])
const CUC_224 = pt('Cucuruchón Grande', 'Caja con cono', 224, 5, [{ lote: '6270', cajas: 5 }], { cono: 'DUOMO', conoNombre: 'DUOMO' })
const MINI = pt('Cucuruchón Mini', 'Media caja', 160, 3, [], { porCaja: 160, unidades: null })
const CHICO = pt('Cucuruchón Chico', 'Caja N°2 media altura doble bolsa', 128, 10, [{ lote: '6250', cajas: 10 }])
const WALI = ins('Harina 000', 'Wali', 125, 'kg', 25, 'bolsa', [{ lote: 'W-0910', cantidad: 75 }, { lote: 'W-0915', cantidad: 50 }])
const NICO = ins('Colorante', 'Nico', 25, 'kg', 25, 'bidón')
const CAJA_MA = ins('Caja media altura', 'Sin impresión', 80, 'un', null, null)

// ═══ Las columnas ═════════════════════════════════════════════════════════
{
  const h = hoja(orden([CUC_240]))
  const [cab, f1] = filas(h)
  chk('las columnas: CANT. | PRODUCTO | DESCRIPCIÓN | TOTAL | LOTE', JSON.stringify(cab) === JSON.stringify(['CANT.', 'PRODUCTO', 'DESCRIPCIÓN', 'TOTAL', 'LOTE']), JSON.stringify(cab))
  chk('sin precios: ni P. UNIT. ni IMPORTE', !/P\. UNIT\.|IMPORTE|\$/.test(h))
  chk('Cucuruchón Grande ×240: CANT. son las cajas', f1[0] === '42')
  chk('… PRODUCTO, el nombre en negrita', f1[1] === 'Cucuruchón Grande' && /<td class="rh-producto">Cucuruchón Grande<\/td>/.test(h))
  chk('… DESCRIPCIÓN, solo "×240"', f1[2] === '×240', f1[2])
  chk('… TOTAL, cajas × unidades por caja en "un."', f1[3] === '10.080 un.', f1[3])
  chk('… LOTE: los dos, con la cantidad entre paréntesis más chica', f1[4] === '6262-1 <span class="rh-lote__cant">(30)</span> · 6263-2 <span class="rh-lote__cant">(12)</span>', f1[4])
  chk('el producto en negrita (CSS)', /\.rh-producto \{ font-weight: 800; \}/.test(S.ESTILOS_HOJA))
  chk('la cantidad del lote, más chica (CSS)', /\.rh-lote__cant \{ font-size: 11px; \}/.test(S.ESTILOS_HOJA))
  chk('cada lote con su cantidad va junto (la línea se corta entre lotes)', h.includes('<span class="rh-lote__uno">6262-1 <span class="rh-lote__cant">(30)</span></span> · <span class="rh-lote__uno">6263-2') &&
    /\.rh-lote__uno \{ display: inline-block; max-width: 100%; \}/.test(S.ESTILOS_HOJA))
  chk('la tabla tiene las cinco columnas a lo ancho', /<colgroup><col class="rh-col-cant"><col class="rh-col-producto"><col class="rh-col-desc"><col class="rh-col-tot"><col class="rh-col-lote"><\/colgroup>/.test(h))
}

// ═══ Producto terminado: la descripción ═══════════════════════════════════
{
  const h = hoja(orden([CUC_224, MINI, CHICO]))
  const [, c224, mini, chico] = filas(h)
  chk('×224 con cono DUOMO (el cono en negrita)', c224[2] === '×224 · con cono <strong class="rh-cono">DUOMO</strong>', c224[2])
  chk('… un solo lote, sin la cantidad', c224[4] === '6270')
  chk('Mini ×160 (las unidades por caja que manda la pantalla)', mini[2] === '×160' && mini[3] === '480 un.', JSON.stringify(mini))
  chk('… sin lote: "—"', mini[4] === '—')
  chk('Chico ×128', chico[2] === '×128' && chico[3] === '1.280 un.')
  // NUNCA el nombre de la presentación, ni "sin cono", ni doble bolsa, ni media caja.
  const todo = hoja(orden([CUC_240, CUC_224, MINI, CHICO]))
  for (const nunca of ['sin cono', 'doble bolsa', 'media caja', 'media altura', 'Caja N°2', 'Caja con cono', 'Caja sin cono'])
    chk(`la hoja nunca dice "${nunca}"`, !todo.toLowerCase().includes(nunca.toLowerCase()))
  chk('sin unidades por caja conocidas: sin "×"', S.descripcionCortaHoja({ producto: 'X', cajas: 3 }) === '')
  chk('las unidades por caja salen de unidades ÷ cajas', S.porCajaHoja({ cajas: 4, unidades: 400 }) === 100 && S.porCajaHoja({ cajas: 3, unidades: 400 }) === null)
  chk('un cono sin nombre ("—", "Falta el cono") no se dice', S.nombreConoHoja({ cono: '—' }) === '' && S.nombreConoHoja({ cono: 'Falta el cono' }) === '' && S.nombreConoHoja({ cono: 'Cono que no se pudo leer' }) === '')
  chk('el nombre del cono gana sobre el de la pantalla', S.nombreConoHoja({ cono: 'Sin cono', conoNombre: 'LOLO' }) === 'LOLO')
}

// ═══ Insumos ══════════════════════════════════════════════════════════════
{
  const h = hoja(orden([WALI, NICO, CAJA_MA]))
  const [, wali, nico, caja] = filas(h)
  chk('Harina Wali: CANT. son los bultos', wali[0] === '5')
  chk('… la descripción: la marca y "bolsa de 25 kg"', wali[2] === 'Wali · bolsa de 25 kg', wali[2])
  chk('… TOTAL en su unidad', wali[3] === '125 kg')
  chk('… los dos lotes, con los kilos', wali[4] === 'W-0910 <span class="rh-lote__cant">(75 kg)</span> · W-0915 <span class="rh-lote__cant">(50 kg)</span>', wali[4])
  chk('Colorante Nico bidón de 25 kg', nico[0] === '1' && nico[1] === 'Colorante' && nico[2] === 'Nico · bidón de 25 kg' && nico[3] === '25 kg', JSON.stringify(nico))
  chk('Caja media altura sin impresión por unidad (la marca de la caja SÍ va)', caja[0] === '80' && caja[2] === 'Sin impresión · por unidad' && caja[3] === '80 un.', JSON.stringify(caja))
  chk('sin nombre del bulto: "bulto"', S.bultoInsumoHoja({ contenido: 25, unidad: 'kg', nombreBulto: null }) === 'bulto de 25 kg')
  chk('sin bulto, en kg: "por kg"', S.bultoInsumoHoja({ unidad: 'kg' }) === 'por kg')
  chk('sin marca, la descripción arranca en mayúscula', S.descripcionCortaHoja(ins('Azúcar', null, 150, 'kg', 50, 'bolsa')) === 'Bolsa de 50 kg')
  chk('un insumo por kg, sin bulto: CANT. es su cantidad', S.cantidadColHoja(ins('Harina', null, 12.5, 'kg', null, null)) === '12,5')
  chk('el renglón entero en una línea (para el faltante)', S.descripcionHoja(WALI) === 'Harina 000 · Wali · bolsa de 25 kg' && S.descripcionHoja(CUC_224) === 'Cucuruchón Grande ×224 · con cono DUOMO')
}

// ═══ La fila TOTAL ════════════════════════════════════════════════════════
// N-0031 (Rodrigo Arrascaeta, solo insumos; de la base el 26/10/2026).
const N0031 = orden([
  ins('Azúcar', null, 150, 'kg', 50, 'bolsa'),
  ins('Harina 000', 'Júpiter', 250, 'kg', 25, 'bolsa'),
  ins('Harina 000', 'Wali', 125, 'kg', 25, 'bolsa'),
  ins('Óleo margarina', 'Cordobesa', 40, 'kg', 20, 'caja'),
  ins('Caja capelina', 'Sin impresión', 80, 'un', null, null),
  ins('Bolsa 100x80', null, 80, 'un', null, null),
], { codigo: 'N-0031', cliente: { nombre: 'RODRIGO ARRASCAETA' } })
{
  const f = filas(hoja(N0031))
  const total = f[f.length - 1]
  chk('N-0031: "TOTAL · 20 bultos + 160 un." (sin cajas de producto)', sinEtiquetas(total[0]) === 'TOTAL · 20 bultos + 160 un.', total[0])
  chk('… y en la columna TOTAL, los kilos de los insumos', total[1] === '565 kg', total[1])
  chk('… nunca "0 cajas"', !/0 cajas/.test(total[0]))
  chk('N-0031: Azúcar 3 bolsas de 50 kg', JSON.stringify(f[1].slice(0, 4)) === JSON.stringify(['3', 'Azúcar', 'Bolsa de 50 kg', '150 kg']), JSON.stringify(f[1]))
  chk('N-0031: Óleo margarina 2 cajas de 20 kg', JSON.stringify(f[4].slice(0, 4)) === JSON.stringify(['2', 'Óleo margarina', 'Cordobesa · caja de 20 kg', '40 kg']), JSON.stringify(f[4]))
  chk('N-0031: Bolsa 100x80 por unidad', JSON.stringify(f[6].slice(0, 4)) === JSON.stringify(['80', 'Bolsa 100x80', 'Por unidad', '80 un.']), JSON.stringify(f[6]))
}
// N-0032 (Fernández Ricardo: 42 cajas de Cucuruchón Grande sin cono).
const N0032 = orden([pt('Cucuruchón Grande', 'Caja sin cono', 240, 42, [{ lote: '6262-1', cajas: 42 }])], { codigo: 'N-0032' })
{
  const f = filas(hoja(N0032))
  const total = f[f.length - 1]
  chk('N-0032: el renglón', JSON.stringify(f[1]) === JSON.stringify(['42', 'Cucuruchón Grande', '×240', '10.080 un.', '6262-1']), JSON.stringify(f[1]))
  chk('N-0032: "TOTAL · 42 cajas de producto", sin bultos ni un.', sinEtiquetas(total[0]) === 'TOTAL · 42 cajas de producto', total[0])
  chk('… sin kilos: la columna TOTAL vacía', total[1] === '')
}
{
  const o = orden([CUC_240, { ...CUC_240, cajas: 1, unidades: 240 }, WALI, CAJA_MA, ins('Bolsa', null, 1, 'un', null, null)])
  chk('mezclado: cajas + bultos + un., con el singular', S.rotuloTotalHoja(o) === 'TOTAL · 43 cajas de producto + 5 bultos + 81 un.', S.rotuloTotalHoja(o))
  chk('una caja: "1 caja de producto"', S.rotuloTotalHoja(orden([{ ...CUC_240, cajas: 1 }])) === 'TOTAL · 1 caja de producto')
  chk('un bulto: "1 bulto"', S.rotuloTotalHoja(orden([NICO])) === 'TOTAL · 1 bulto')
  const porKg = orden([ins('Harina 000', null, 12.5, 'kg', null, null), CAJA_MA])
  chk('un insumo por kg (sin bulto) no cuenta como un.: va en los kilos', S.rotuloTotalHoja(porKg) === 'TOTAL · 80 un.' && S.totalPesoHoja(porKg) === '12,5 kg', S.rotuloTotalHoja(porKg))
  chk('los litros aparte de los kilos', S.totalPesoHoja(orden([WALI, ins('Aceite', null, 3, 'lt', null, null)])) === '125 kg + 3 lt')
}

// ═══ Con precios (Administración) ═════════════════════════════════════════
{
  const o = orden([{ ...CUC_240, precio: 18500, subtotal: 777000 }, { ...WALI, precio: 700, subtotal: 87500 }], { total: 864500 })
  const h = hoja(o, { conPrecios: true })
  const f = filas(h)
  chk('con precios: P. UNIT. e IMPORTE al final', JSON.stringify(f[0]) === JSON.stringify(['CANT.', 'PRODUCTO', 'DESCRIPCIÓN', 'TOTAL', 'LOTE', 'P. UNIT.', 'IMPORTE']), JSON.stringify(f[0]))
  chk('… con la misma descripción', f[1][2] === '×240' && f[2][2] === 'Wali · bolsa de 25 kg')
  chk('… el precio por caja y el importe', /18\.500,00/.test(f[1][5]) && /777\.000,00/.test(f[1][6]))
  chk('… el insumo por bulto: el precio del bulto', /\/ bulto/.test(f[2][5]), f[2][5])
  chk('… y el total en la fila TOTAL', /864\.500,00/.test(f[3][f[3].length - 1]))
  chk('… la tabla de precios, más apretada', /<table class="rh-tabla rh-tabla--precios">/.test(h) && /\.rh-tabla--precios \.rh-col-desc \{ width: 134px; \}/.test(S.ESTILOS_HOJA) &&
    // LOTE de 120 como antes: "RODRIGOA-2110" entra en una línea (e2e/54, 8 renglones con 10 mm de margen).
    /\.rh-tabla--precios \.rh-col-lote \{ width: 120px; \}/.test(S.ESTILOS_HOJA))
}

// ═══ Lo que ya hacía la hoja, sigue ═══════════════════════════════════════
{
  const o = orden([pt('Cucuruchón Grande', 'Caja sin cono', 240, 50, [{ lote: '6262-1', cajas: 36 }, { lote: 'SIN STOCK', cajas: 14 }])])
  const f = filas(hoja(o))
  chk('lo que no estaba en stock: "faltan 14" en el lote', f[1][4] === '6262-1 <span class="rh-lote__cant">(36)</span> · faltan 14', f[1][4])
  const h = S.htmlHoja(o, { copias: ['ORIGINAL', 'DUPLICADO'], plan: { modo: 'entera', paginas: [[0, 1]] } })
  chk('el modo hoja entera sigue', /rh-hoja--entera/.test(h) && /ORIGINAL · HOJA 1 DE 1/.test(h))
  const dev = orden([CUC_240, { ...pt('Cucuruchón Grande', 'Caja sin cono', 240, 2), movimiento: 'devolucion', motivo: 'Rotura', loteDevuelto: '6249', destino: 'descarte' }])
  const fd = filas(hoja(dev))
  chk('una devolución: la cantidad y el total en negativo, el lote que trajo', fd[2][0] === '−2' && fd[2][3] === '−480 un.' && fd[2][4] === '6249', JSON.stringify(fd[2]))
  chk('… con el motivo debajo de la descripción', /×240<span class="rh-devuelto__motivo">Devolución · Rotura · lote 6249 · se descartan<\/span>/.test(fd[2][2]), fd[2][2])
  chk('… y no suma a las cajas', sinEtiquetas(fd[fd.length - 1][0]).startsWith('TOTAL · 42 cajas de producto'))
}

// ═══ Lo que arman las pantallas para la hoja ══════════════════════════════
// La Carga (modulos/retiros.html): el nombre del bulto sale de
// insumos.nombre_bulto (leída con information_schema el 26/10/2026: text,
// nullable, sin default); el cono, de lo que devuelve mis_ordenes_retiro.
{
  const fs = require('fs')
  const SR = construirRetiros(ARCHIVO)
  const html = fs.readFileSync(ARCHIVO, 'utf8')
  chk('la Carga lee insumos.nombre_bulto', /from\('insumos'\)\.select\('id, nombre, marca, categoria, unidad_medida, vista_preferida, contenido_bulto, nombre_bulto'\)/.test(html))
  const cat = SR.conBultosDeInsumos({ insumos: [{ id: 'h' }, { id: 'l' }] }, [{ id: 'h', vista_preferida: 'bulto', contenido_bulto: 25, nombre_bulto: ' bolsa ' }, { id: 'l', nombre_bulto: '' }], new Map())
  chk('… y la guarda en el catálogo (limpia; vacía = null)', cat.insumos[0].nombre_bulto === 'bolsa' && cat.insumos[1].nombre_bulto === null)
  SR.estado.catalogo = cat
  const rs = SR.renglonesParaHoja({ renglones: [
    { tipo: 'insumo', insumo: 'Harina 000', marca_insumo: 'Wali', cantidad: 125, unidad_medida: 'kg', insumo_id: 'h', lotes: [] },
    { producto: 'Cucuruchón Grande', presentacion: 'Caja con cono', marca: 'DUOMO', cajas: 5, unidades: 1120, lotes: [] },
    { producto: 'Cucuruchón Grande', presentacion: 'Caja sin cono', marca: null, cajas: 42, unidades: 10080, lotes: [] },
  ] })
  chk('el renglón de insumo lleva el nombre del bulto', rs[0].nombreBulto === 'bolsa' && rs[0].contenido === 25)
  chk('el de producto, el nombre del cono (o null)', rs[1].conoNombre === 'DUOMO' && rs[2].conoNombre === null)
  chk('… y en la hoja: "Wali · bolsa de 25 kg", "×224 · con cono DUOMO" y "×240"',
    SR.descripcionCortaHoja(rs[0]) === 'Wali · bolsa de 25 kg' && SR.descripcionCortaHoja(rs[1]) === '×224 · con cono DUOMO' && SR.descripcionCortaHoja(rs[2]) === '×240')
}
// Administración (modulos/administracion.html), con precios.
{
  const fs = require('fs')
  const { construirAdministracion } = require('./sandbox-administracion')
  const SA = construirAdministracion(ADM)
  chk('Administración lee insumos.nombre_bulto', /\.select\('id, nombre, marca, unidad_medida, categoria, activo, vista_preferida, contenido_bulto, nombre_bulto'\)/.test(fs.readFileSync(ADM, 'utf8')))
  const cat = {
    productos: [{ id: 'p1', nombre: 'Cucuruchón Grande' }],
    presentaciones: [{ id: 'pr-con', producto_id: 'p1', nombre: 'Caja con cono', con_cono: true, unidades_por_caja: 224 }, { id: 'pr-sin', producto_id: 'p1', nombre: 'Caja sin cono', con_cono: false, unidades_por_caja: 240 }],
    marcas: [{ id: 'm-duomo', nombre: 'DUOMO' }],
    insumos: [{ id: 'h', nombre: 'Colorante', marca: 'Nico', unidad_medida: 'kg', nombre_bulto: 'bidón' }],
  }
  const con = SA.partesRenglon(cat, { presentacion_id: 'pr-con', marca_id: 'm-duomo' })
  const sin = SA.partesRenglon(cat, { presentacion_id: 'pr-sin', marca_id: null })
  const falta = SA.partesRenglon(cat, { presentacion_id: 'pr-con', marca_id: null })
  chk('el producto lleva las unidades por caja y el nombre del cono', con.porCaja === 224 && con.conoNombre === 'DUOMO' && sin.porCaja === 240 && sin.conoNombre === null)
  chk('una presentación sin cono no lleva cono aunque el renglón traiga uno', SA.partesRenglon(cat, { presentacion_id: 'pr-sin', marca_id: 'm-duomo' }).conoNombre === null)
  chk('… sin cono elegido, sin nombre (nunca "Falta el cono" en la hoja)', falta.conoNombre === null && SA.descripcionCortaHoja({ ...falta, cajas: 1 }) === '×224')
  chk('el insumo lleva el nombre del bulto', SA.partesInsumo(cat, { insumo_id: 'h' }).nombreBulto === 'bidón')
}

// ═══ Escapado ═════════════════════════════════════════════════════════════
{
  const o = orden([
    { producto: marca('producto'), cono: marca('cono'), conoNombre: marca('cono'), cajas: 2, unidades: 200, lotes: [{ lote: marca('lote'), cajas: 1 }, { lote: 'L2', cajas: 1 }] },
    ins(marca('insumo'), marca('marca'), 50, 'kg', 25, marca('bulto'), [{ lote: marca('lote-ins'), cantidad: 50 }]),
  ])
  const h = hoja(o)
  chk('ninguna marca cruda', !/<b data-xss=/.test(h), (h.match(/.{0,40}<b data-xss=[^>]*>/) || [''])[0])
  for (const c of ['producto', 'cono', 'lote', 'insumo', 'marca', 'bulto', 'lote-ins']) chk(`«${c}» escapado`, h.includes(escapada(c)))
}

fin()
