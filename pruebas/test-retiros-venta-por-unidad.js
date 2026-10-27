// LA VENTA POR UNIDAD (27/10/2026, rama ci-prueba/venta-por-unidad).
// "Conos de papel sueltos · Por cono" (Nuss y Dolce): producto_presentaciones.
// sin_stock = true y 1 unidad por caja (leído con information_schema el
// 27/10/2026). registrar_orden_retiro (pg_get_functiondef, 27/10/2026) no mira
// el stock de esa presentación: sin "lotes" va 'SIN LOTE' y nunca hay
// faltante. Lo que se prueba, con las funciones REALES de modulos/retiros.html,
// js/retiros-comun.js y modulos/administracion.html:
//  - la Carga: la presentación sin stock aparece SIEMPRE, sin "sin stock"; no
//    pide lotes ni pregunta "¿De dónde salen?"; "¿Cuántos conos se lleva?",
//    "720 conos", nunca "cajas"; a la base van las cajas (= conos) sin lotes;
//  - la hoja: CANT. 720, PRODUCTO "Conos de papel sueltos", DESCRIPCIÓN "con
//    cono GIOVANI" (sin "×1"), TOTAL "720 un.", y la fila TOTAL "TOTAL · 3
//    cajas de producto + 720 un." (la N-0035 de Turi imprimía "723 cajas");
//  - Mis retiros y la ficha: "720 conos"; Administración: la lista "3 cajas +
//    720 un.", la ficha "720 conos" y "Precio x cono".
//
//   node pruebas/test-retiros-venta-por-unidad.js
'use strict'

const path = require('path')
const fs = require('fs')
const { construirRetiros } = require('./sandbox-retiros')
const { construirAdministracion } = require('./sandbox-administracion')
const { arnes, leer, marca, escapada } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/retiros.html')
const ADM = process.env.ARCHIVO_ADMIN || path.join(__dirname, '..', 'modulos/administracion.html')
leer(ARCHIVO)
leer(ADM)
const SRC = fs.readFileSync(ARCHIVO, 'utf8')
const SRC_ADM = fs.readFileSync(ADM, 'utf8')
const { chk, esperas, fin } = arnes()

// El catálogo de Nuss (controla el stock): el Cucuruchón Grande y los conos
// sueltos (con cono, 1 por caja, sin stock y en 0).
const CAT = () => ({
  productos: [
    { id: 'p-cuc', nombre: 'Cucuruchón Grande', categoria: 'cucuruchones' },
    { id: 'p-conos', nombre: 'Conos de papel sueltos', categoria: 'especiales' },
  ],
  presentaciones: [
    { id: 'pr-cuc', producto_id: 'p-cuc', nombre: 'Caja sin cono', con_cono: false, unidades_por_caja: 240, stock_cajas: 40 },
    { id: 'pr-conos', producto_id: 'p-conos', nombre: 'Por cono', con_cono: true, unidades_por_caja: 1, stock_cajas: 0, sin_stock: true },
  ],
  marcas: [{ id: 'm-giovani', nombre: 'GIOVANI', estado_alta: 'aprobada' }],
  insumos: [],
  conos: new Map(),
})

function conCarga(S, cat = CAT()) {
  S.estado.empresaId = 'u-n'
  S.estado.catalogo = cat
  S.estado.catalogoEmpresa = 'u-n'
  S.estado.clientes = [{ id: 'c-turi', nombre: 'TURI', razon_social: null, apodos: [], activo: true }]
  S.estado.form = S.formVacio()
  return S.estado.form
}
const CONOS = (cajas = 720) => ({ productoId: 'p-conos', presentacionId: 'pr-conos', conCono: true, marcaId: 'm-giovani', cajas })
const CUC = (cajas = 3) => ({ productoId: 'p-cuc', presentacionId: 'pr-cuc', conCono: false, marcaId: null, cajas })

// ═══ La Carga ═══════════════════════════════════════════════════════════════
esperas.push((async () => {
  // El catálogo marca las presentaciones sin_stock (catalogo_para_retiro no lo trae).
  const S = construirRetiros(ARCHIVO)
  S.__setRpc(async (n) => n === 'catalogo_para_retiro' ? { data: {
    productos: [
      { presentacion_id: 'pr-cuc', producto: 'Cucuruchón Grande', presentacion: 'Caja sin cono', categoria: 'cucuruchones', con_cono: false, unidades_por_caja: 240, stock_cajas: 40 },
      { presentacion_id: 'pr-conos', producto: 'Conos de papel sueltos', presentacion: 'Por cono', categoria: 'especiales', con_cono: true, unidades_por_caja: 1, stock_cajas: 0 },
    ], conos: [], insumos: [] }, error: null } : { data: [], error: null })
  let pidio = null
  S.__tablas.producto_presentaciones = (f) => { pidio = f; return { data: [{ id: 'pr-conos' }], error: null } }
  S.__tablas.unidades_negocio = [{ controla_stock_terminado: true }]
  const cat = await S.leerCatalogo('u-n')
  chk('el catálogo pide las presentaciones con sin_stock', JSON.stringify(pidio) === '[["select","id"],["eq","sin_stock",true]]', JSON.stringify(pidio))
  chk('… y las marca', cat.presentaciones.find(p => p.id === 'pr-conos')?.sin_stock === true && !cat.presentaciones.find(p => p.id === 'pr-cuc')?.sin_stock)
  S.__tablas.producto_presentaciones = () => ({ data: null, error: { message: 'x' } })
  const cat2 = await S.leerCatalogo('u-n')
  chk('si no se puede leer, el catálogo sigue (sin marcar nada)', cat2.presentaciones.every(p => !p.sin_stock))
})())

{
  const S = construirRetiros(ARCHIVO)
  const cat = CAT()
  const o = S.opcionesCatalogo(cat)
  const conos = o.con_cono.filter(x => x.presentacionId === 'pr-conos')
  chk('en una fábrica que controla el stock, los conos sueltos están igual', conos.length === 1)
  chk('… sin cuánto hay (no es "sin stock")', conos[0]?.stock === null && conos[0]?.marcaId === undefined, JSON.stringify(conos))
  chk('… y el texto de stock no dice "sin stock"', S.textoStockOpcion(conos[0]) !== 'sin stock', S.textoStockOpcion(conos[0]))
  chk('el Cucuruchón sigue con su stock', o.sin_cono.find(x => x.presentacionId === 'pr-cuc')?.stock === 40)
}

{
  const S = construirRetiros(ARCHIVO)
  const f = conCarga(S)
  f.renglones = [CONOS(720)]
  const r = f.renglones[0]
  chk('los conos sueltos son por unidad y sin stock', S.porUnidadRenglon(r) && S.sinStockRenglon(r))
  chk('el Cucuruchón no', !S.porUnidadRenglon(CUC()) && !S.sinStockRenglon(CUC()))
  chk('una presentación de 1 por caja SIN sin_stock también se dice por unidad', (() => {
    const c = CAT(); c.presentaciones[1].sin_stock = false
    S.estado.catalogo = c
    const v = S.porUnidadRenglon(r) && !S.sinStockRenglon(r)
    S.estado.catalogo = CAT()
    return v
  })())
  const a = S.asignacion(r, null)
  chk('sin lotes y sin faltante: todo asignado', a.sinStock === true && a.faltante === 0 && a.falta === 0 && a.porLote.length === 0, JSON.stringify(a))
  chk('no lee lotes', S.renglonConLotes(r) === false && S.listaLotesDe(r) === null)
  chk('ni los escribe a mano (aunque la fábrica no controle)', (() => { S.estado.catalogo.sinControl = true; const v = S.lotesAMano(r); S.estado.catalogo.sinControl = false; return v === false })())
  chk('no hay faltante, así que no hay "¿De dónde salen?"', S.faltanteProducto(r) === 0)
  chk('el lote del renglón: nada', S.htmlLoteRenglon(r, 0) === '')
  chk('a la base: las cajas (= conos), el cono y SIN lotes', JSON.stringify(S.itemParaBase(r)) === '{"presentacion_id":"pr-conos","marca_id":"m-giovani","cajas":720}', JSON.stringify(S.itemParaBase(r)))
  chk('"720 conos", nunca cajas', S.cantidadRenglon(r, 720) === '720 conos' && S.cantidadRenglon(r, 1) === '1 cono')
  chk('el Cucuruchón sigue en cajas', S.cantidadRenglon(CUC(), 3) === '3 cajas')
  chk('"Agregar · 720 conos"', S.textoAgregarRenglon(r) === 'Agregar · 720 conos', S.textoAgregarRenglon(r))
  const ed = S.htmlRenglon(r, 0, S.estado.catalogo, false)
  chk('la pregunta: "¿Cuántos conos se lleva?"', ed.includes('>¿Cuántos conos se lleva?</label>') && !/¿Cuántas cajas/.test(ed), ed.slice(0, 400))
  chk('los botones: "Un cono menos / más"', ed.includes('aria-label="Un cono menos"') && ed.includes('aria-label="Un cono más"'))
  chk('debajo del nombre: "con cono · por unidad", no "caja completa"', /con cono<\/span>|con cono · por unidad/.test(ed) && !ed.includes('caja completa') && ed.includes('por unidad'))
  chk('ni "Buscando los lotes" ni "Completar con los más viejos"', !/Buscando los lotes|Completar con los más viejos|De dónde salen/.test(ed))
  const t = S.htmlTarjetaRenglon(r, 0, S.estado.catalogo, false)
  chk('la tarjeta armada: 720 conos, "va sin lote"', /rt-item__q">720<\/span><span class="rt-item__u">conos</.test(t) && t.includes('va sin lote'), t)
  chk('el cono, como siempre (GIOVANI)', t.includes('GIOVANI'))
}

{
  // Con 1 unidad: "unidades" para otro producto que no son conos.
  const S = construirRetiros(ARCHIVO)
  const c = CAT()
  c.productos[1].nombre = 'Obleas sueltas'
  conCarga(S, c)
  const ed = S.htmlRenglon(CONOS(5), 0, c, false)
  chk('otro producto por unidad: "¿Cuántas unidades se lleva?"', ed.includes('>¿Cuántas unidades se lleva?</label>'), ed.slice(0, 300))
  chk('… "5 unidades"', S.cantidadRenglon(CONOS(5), 5) === '5 unidades')
}

{
  // Los totales del formulario y el resumen: Turi, 3 Cucuruchón + 720 conos.
  const S = construirRetiros(ARCHIVO)
  const f = conCarga(S)
  f.clienteId = 'c-turi'
  f.renglones = [CUC(3), CONOS(720)]
  chk('las cajas del formulario no cuentan los conos', S.totalCajasForm(f) === 3)
  chk('el total: "3 cajas + 720 conos"', S.textoTotalForm(f) === '3 cajas + 720 conos', S.textoTotalForm(f))
  chk('la cuenta: "2 productos · 3 cajas + 720 conos"', S.textoCuentaForm(f) === '2 productos · 3 cajas + 720 conos', S.textoCuentaForm(f))
  f.renglones = [CONOS(720)]
  chk('solo conos: "720 conos" (sin "0 cajas")', S.textoTotalForm(f) === '720 conos', S.textoTotalForm(f))
  f.renglones = [CUC(3), CONOS(720)]
  const h = S.htmlResumen(f, S.estado.catalogo)
  chk('el resumen: "720 conos"', h.includes('720 <small>conos</small>'), h.slice(0, 900))
  chk('… sin "cajas" para los conos', !h.includes('720 <small>cajas</small>') && h.includes('3 <small>cajas</small>'))
  chk('… y "Va sin lote"', h.includes('Va sin lote'))
}

// ═══ La hoja ═══════════════════════════════════════════════════════════════
const S = construirRetiros(ARCHIVO)
const EMPRESA = { id: 'u-n', nombre: 'Cucuruchos Nuss', logo_url: 'logo-cucuruchos-nuss.png' }
const TURI = {
  codigo: 'N-0035', estado: 'confirmada', fecha: '2026-10-27', cargadaPor: 'Emanuel Romero', empresa: EMPRESA, cliente: { nombre: 'TURI' },
  renglones: [
    { producto: 'Cucuruchón Grande', presentacion: 'Caja sin cono', cono: 'Sin cono', cajas: 3, unidades: 720, lotes: [{ lote: '6262-1', cajas: 3 }] },
    { producto: 'Conos de papel sueltos', presentacion: 'Por cono', cono: 'GIOVANI', conoNombre: 'GIOVANI', cajas: 720, unidades: 720, lotes: [{ lote: 'SIN LOTE', cajas: 720 }], sinStock: true },
  ],
}
function filas(h) {
  const t = h.slice(h.indexOf('<table'), h.indexOf('</table>'))
  return [...t.matchAll(/<tr[^>]*>(.*?)<\/tr>/g)].map(m => [...m[1].matchAll(/<t[dh][^>]*>(.*?)<\/t[dh]>/g)].map(c => c[1]))
}
const sinEtiquetas = (x) => String(x).replace(/<[^>]+>/g, '')
{
  const h = S.htmlHoja(TURI, { copias: ['ORIGINAL'] })
  const fs2 = filas(h)
  const conos = fs2.find(f => sinEtiquetas(f[1] ?? '') === 'Conos de papel sueltos')
  chk('la hoja: CANT. = 720 conos', conos && sinEtiquetas(conos[0]) === '720', JSON.stringify(conos))
  chk('… PRODUCTO "Conos de papel sueltos"', !!conos)
  chk('… DESCRIPCIÓN "con cono GIOVANI" (sin "×1")', conos && sinEtiquetas(conos[2]) === 'con cono GIOVANI', conos && conos[2])
  chk('… TOTAL "720 un."', conos && sinEtiquetas(conos[3]) === '720 un.')
  chk('la fila TOTAL: "TOTAL · 3 cajas de producto + 720 un." (no "723 cajas")', h.includes('TOTAL · 3 cajas de producto + 720 un.') && !/723/.test(h), (h.match(/TOTAL · [^<]*/) || [''])[0])
  const cuc = fs2.find(f => sinEtiquetas(f[1] ?? '') === 'Cucuruchón Grande')
  chk('el Cucuruchón sigue igual: ×240 y 720 un.', cuc && sinEtiquetas(cuc[2]) === '×240' && sinEtiquetas(cuc[3]) === '720 un.')
  // Sin la marca sinStock: alcanza con 1 por caja (unidades ÷ cajas = 1).
  const sinMarca = { ...TURI, renglones: TURI.renglones.map(r => ({ ...r, sinStock: undefined })) }
  chk('sin saber sin_stock, 1 por caja alcanza', S.htmlHoja(sinMarca, { copias: ['ORIGINAL'] }).includes('TOTAL · 3 cajas de producto + 720 un.'))
  chk('el rótulo, directo', S.rotuloTotalHoja(TURI) === 'TOTAL · 3 cajas de producto + 720 un.')
  chk('la descripción en texto (notas): "con cono GIOVANI", sin ×1', S.descripcionCortaHoja(TURI.renglones[1]) === 'con cono GIOVANI', S.descripcionCortaHoja(TURI.renglones[1]))
  chk('solo conos: "TOTAL · 720 un."', S.rotuloTotalHoja({ renglones: [TURI.renglones[1]] }) === 'TOTAL · 720 un.')
  chk('las cajas de la orden no cuentan los conos', S.totalCajasOrden(TURI) === 3 && S.totalUnidadesSueltasOrden(TURI) === 720)
  const txt = S.textoOrden(TURI)
  chk('el texto para compartir: "- 720 conos · …" y "Total: 3 cajas + 720 un."', txt.includes('- 720 conos · Conos de papel sueltos') && txt.includes('Total: 3 cajas + 720 un.') && !txt.includes('720 cajas'), txt)
  const solo = S.textoOrden({ ...TURI, renglones: [TURI.renglones[1]] })
  chk('… solo conos: "Total: 720 un."', solo.includes('Total: 720 un.') && !solo.includes('0 cajas'), solo)
  chk('la palabra: conos / unidades', S.palabraUnidadesHoja('Conos de papel sueltos', 2) === 'conos' && S.palabraUnidadesHoja('Cono suelto', 1) === 'cono' &&
    S.palabraUnidadesHoja('Obleas', 3) === 'unidades' && S.palabraUnidadesHoja(null, 1) === 'unidad')
  // Escapado: el producto y el cono de la base.
  const malo = { ...TURI, renglones: [{ ...TURI.renglones[1], producto: marca('producto'), conoNombre: marca('cono'), cono: marca('cono') }] }
  const hm = S.htmlHoja(malo, { copias: ['ORIGINAL'] })
  chk('la hoja escapa el producto y el cono', !/<b data-xss=/.test(hm) && hm.includes(escapada('producto')) && hm.includes(escapada('cono')))
}

// ═══ Mis retiros y la ficha ═════════════════════════════════════════════════
{
  const R = construirRetiros(ARCHIVO)
  conCarga(R)
  const mia = {
    orden_id: 'o-35', codigo: 'N-0035', estado: 'confirmada', fecha: '2026-10-27', cargada_en: '2026-10-27T12:00:00Z', cliente: 'TURI', transporte: null, observaciones: null,
    renglones: [
      { orden: 1, tipo: 'producto', producto: 'Cucuruchón Grande', presentacion: 'Caja sin cono', marca: null, cajas: 3, unidades: 720, presentacion_id: 'pr-cuc', lotes: [{ lote: '6262-1', cajas: 3 }] },
      { orden: 2, tipo: 'producto', producto: 'Conos de papel sueltos', presentacion: 'Por cono', marca: 'GIOVANI', cajas: 720, unidades: 720, presentacion_id: 'pr-conos', marca_id: 'm-giovani', lotes: [{ lote: 'SIN LOTE', cajas: 720 }] },
    ],
  }
  chk('Mis retiros: las cajas sin los conos', R.cajasDeOrden(mia) === 3)
  chk('Mis retiros: "3 cajas + 720 conos"', R.textoCajasOrden(mia) === '3 cajas + 720 conos', R.textoCajasOrden(mia))
  chk('la fila de Mis retiros lo dice', R.htmlFilaMia(mia).includes('3 cajas + 720 conos'))
  chk('solo conos: "720 conos" (sin "0 cajas")', R.textoCajasOrden({ ...mia, renglones: [mia.renglones[1]] }) === '720 conos')
  const d = R.htmlDetalleMio(mia)
  chk('la ficha: "720 conos · Conos de papel sueltos"', d.includes('720 conos · Conos de papel sueltos'), d.slice(0, 600))
  const itemConos = d.slice(d.indexOf('720 conos · Conos de papel sueltos'))
  chk('… sin "720 cajas", y los conos sin repetir las unidades', !d.includes('720 cajas') && !/^[^]*?<\/div><div class="rt-item__lotes-mio">[^<]*unidades/.test(itemConos), itemConos.slice(0, 200))
  chk('… y el TOTAL "3 cajas + 720 conos"', /rt-total__valor">3 cajas \+ 720 conos/.test(d))
  chk('la hoja de la Carga sabe que es sin stock', R.renglonesParaHoja(mia)[1].sinStock === true)
}

// ═══ Administración ═════════════════════════════════════════════════════════
{
  const A = construirAdministracion(ADM)
  chk('Administración lee sin_stock de las presentaciones', /\.select\('id, producto_id, nombre, con_cono, media_caja, unidades_por_caja, activa, orden, sin_stock'\)/.test(SRC_ADM))
  chk('la lista de órdenes lee las unidades de cada renglón', SRC_ADM.includes(".select('orden_id, cajas, unidades, insumo_id, tipo')"))
  chk('… y la fila dice "3 cajas + 720 un."', (() => {
    A.estado.clientes = [{ id: 'c-turi', nombre: 'TURI' }]
    return A.htmlFilaOrden({ id: 'o', codigo: 'N-0035', fecha: '2026-10-27', cliente_id: 'c-turi', estado: 'confirmada', estado_valorizacion: 'pendiente', cajas: 3, sueltas: 720, insumos: 0, devueltas: 0 }).includes('3 cajas + 720 un.')
  })())
  chk('… solo conos: "720 un." (sin "0 cajas")', A.htmlFilaOrden({ id: 'o', codigo: 'N-0036', fecha: '2026-10-27', cliente_id: 'c-turi', estado: 'confirmada', estado_valorizacion: 'pendiente', cajas: 0, sueltas: 720, insumos: 0, devueltas: 0 }).includes(' · 720 un.'))
  chk('el renglón de la base (cajas = unidades) es por unidad', A.esPorUnidadHoja({ cajas: 720, unidades: 720, tipo: 'retiro' }) && !A.esPorUnidadHoja({ cajas: 3, unidades: 720, tipo: 'retiro' }))
  chk('la ficha: "720 conos" y "Precio x cono"', SRC_ADM.includes("(suelto ? cantidadUnidadesHoja(p.producto, it.cajas) : enteroHoja(it.cajas) + ' cajas')") &&
    SRC_ADM.includes("porQue = suelto ? palabraUnidadesHoja(p.producto, 1) : 'caja'"))
}

// Valorizar: precio_venta no encuentra el precio de los conos sueltos (toma la
// presentación SIN cono, y solo hay "Por cono"): se propone el de la lista
// para ESA presentación, $ 27 en la Lista 1.
esperas.push((async () => {
  const A = construirAdministracion(ADM)
  A.estado.catalogo = {
    productos: [{ id: 'p-conos', nombre: 'Conos de papel sueltos' }, { id: 'p-cuc', nombre: 'Cucuruchón Grande' }],
    presentaciones: [
      { id: 'pr-conos', producto_id: 'p-conos', nombre: 'Por cono', con_cono: true, unidades_por_caja: 1, sin_stock: true },
      { id: 'pr-cuc', producto_id: 'p-cuc', nombre: 'Caja sin cono', con_cono: false, unidades_por_caja: 240 },
    ],
    marcas: [{ id: 'm-giovani', nombre: 'GIOVANI' }], insumos: [],
  }
  A.__setRpc(async (n) => n === 'precio_venta' ? { data: { sin_precio: true, motivo: 'El producto no tiene precio en la lista base.' }, error: null } : { data: null, error: null })
  let pidio = null
  A.__tablas.lista_precios_items = (f) => { pidio = f; return { data: [{ precio_caja: '27.00', vigente_desde: '2026-10-27' }], error: null } }
  const r = await A.leerPrecioVenta('l-1', { presentacion_id: 'pr-conos', marca_id: 'm-giovani', cajas: 720, unidades: 720 }, '2026-10-27')
  chk('valorizar: los conos sueltos proponen $ 27 (el de la lista para esa presentación)', r.precio === 27 && r.datos?.propio === true, JSON.stringify(r))
  chk('… leído de esa lista, esa presentación y vigente a la fecha', JSON.stringify(pidio?.filter(x => x[0] !== 'select')) === '[["eq","lista_id","l-1"],["eq","presentacion_id","pr-conos"],["lte","vigente_desde","2026-10-27"],["order","vigente_desde"]]', JSON.stringify(pidio))
  chk('… y dice de dónde: "$ 27,00 por cono"', A.textoOrigenPrecio(r.datos, true) === '$ 27,00 por cono', A.textoOrigenPrecio(r.datos, true))
  pidio = null
  const r2 = await A.leerPrecioVenta('l-1', { presentacion_id: 'pr-cuc', marca_id: null, cajas: 3, unidades: 720 }, '2026-10-27')
  chk('un producto por caja sin precio sigue sin precio (no se inventa)', r2.sinPrecio === true && pidio === null)
  A.__tablas.lista_precios_items = () => ({ data: [], error: null })
  const r3 = await A.leerPrecioVenta('l-1', { presentacion_id: 'pr-conos', marca_id: 'm-giovani', cajas: 720, unidades: 720 }, '2026-10-27')
  chk('los conos sin precio en la lista: sin precio, con el motivo de la base', r3.sinPrecio === true && r3.motivo === 'El producto no tiene precio en la lista base.')
})())

fin(esperas)
