// LA FÁBRICA SIN CONTROL DE STOCK EN LA CARGA (26/10/2026, rama
// ci-prueba/orden-sin-stock-rosario). Dolce Pasta todavía no carga su
// producción (unidades_negocio.controla_stock_terminado = false) y
// registrar_orden_retiro, ahí, no mira el stock del producto: los lotes los
// escribe quien carga. Lo que se prueba, con las funciones REALES de
// modulos/retiros.html:
//  - el catálogo: sin control, TODOS los productos, sin "sin stock" ni pedir
//    búsqueda; con control (Nuss, Mengui), como siempre;
//  - el renglón: lotes escritos a mano ("+ Agregar lote"), "Asignado X de Y
//    · faltan Z", la suma tiene que dar el total, sin ningún lote "Va sin
//    lote"; sin "¿De dónde salen?", "Completar con los más viejos" ni "Que
//    salga sola…"; no se leen lotes con stock;
//  - lo que viaja a registrar_orden_retiro (los lotes escritos, en mayúsculas,
//    o sin "lotes");
//  - los insumos y las fábricas con control, sin cambios; y el escapado.
//
//   node pruebas/test-retiros-sin-control.js
//   ARCHIVO_TEST=<copia de modulos/retiros.html> node pruebas/test-retiros-sin-control.js
'use strict'

const path = require('path')
const { construirRetiros } = require('./sandbox-retiros')
const { arnes, leer, marca, escapada } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/retiros.html')
leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

const cat = (sinControl) => ({
  sinControl,
  productos: [
    { id: 'p-cap', nombre: 'Capelina Grande', categoria: 'barquillos' },
    { id: 'p-cuc', nombre: 'Cucurucho grande', categoria: 'cucuruchones' },
  ],
  presentaciones: [
    { id: 'pr-cap', producto_id: 'p-cap', nombre: 'Caja', con_cono: false, unidades_por_caja: 100, stock_cajas: 0 },
    { id: 'pr-cuc-con', producto_id: 'p-cuc', nombre: 'Caja con cono', con_cono: true, unidades_por_caja: 100, stock_cajas: 0 },
  ],
  marcas: [{ id: 'm-lolo', nombre: 'LOLO', estado_alta: 'aprobada' }],
  insumos: [{ id: 'i-har', nombre: 'Harina 000', marca: 'Molino', categoria: 'Harinas', unidad_medida: 'kg', stock: 250 }],
  conos: new Map(),
})

function armar(sinControl = true) {
  const S = construirRetiros(ARCHIVO)
  S.estado.empresaId = sinControl ? 'u-d' : 'u-n'
  S.estado.catalogo = cat(sinControl)
  S.estado.catalogoEmpresa = S.estado.empresaId
  S.estado.clientes = [{ id: 'c1', nombre: 'PAZ, MIRTA', apodos: [], activo: true }]
  S.estado.form = S.formVacio()
  S.estado.form.clienteId = 'c1'
  return S
}
const tecla = (renglon, campo, k, value) => ({
  dataset: { [campo === 'lote' ? 'rLmLote' : 'rLmCajas']: String(renglon), k: String(k) }, value,
  selectionStart: 0, selectionEnd: 0, setSelectionRange() {},
})

// ═══ El catálogo ═══════════════════════════════════════════════════════════
{
  const S = armar(true)
  const grupos = S.gruposCatalogo(S.estado.catalogo, '')
  const sin = grupos.find(g => g.tipo === 'sin_cono')?.lista ?? []
  const con = grupos.find(g => g.tipo === 'con_cono')?.lista ?? []
  chk('sin control: sin buscar, también lo que tiene stock 0', sin.some(o => o.presentacionId === 'pr-cap'))
  chk('sin control: sin "cuánto hay" (stock no se sabe)', sin.every(o => o.stock === null) && S.textoStockOpcion(sin[0]) === '')
  chk('sin control: con cono, una opción y el cono se elige después', con.length === 1 && con[0].marcaId === undefined && con[0].stock === null)
  const html = S.htmlProductosRenglon(0, S.estado.catalogo, '')
  chk('sin control: ninguno al 55 % ni "sin stock"', !/rt-opcion--sin-stock|rt-opcion__sin-stock/.test(html) && /Capelina Grande/.test(html))
  chk('sin control: la pista habla de los insumos', /Escribí para buscar también los insumos sin stock\./.test(html))
  chk('sin control: los insumos siguen con su stock', (grupos.find(g => g.tipo === 'insumos')?.lista ?? [])[0]?.stock === 250)
}
{
  const S = armar(false)
  const grupos = S.gruposCatalogo(S.estado.catalogo, '')
  chk('con control: sin buscar, lo que no tiene stock no aparece (como siempre)', !grupos.some(g => g.lista.some(o => o.presentacionId === 'pr-cap')))
  const buscado = S.gruposCatalogo(S.estado.catalogo, 'capelina').flatMap(g => g.lista)
  chk('con control: al buscar aparece "sin stock"', buscado.length === 1 && S.textoStockOpcion(buscado[0]) === 'sin stock')
  chk('con control: la pista de siempre', /Escribí para buscar también lo que no tiene stock\./.test(S.htmlProductosRenglon(0, S.estado.catalogo, '')))
}

// leerCatalogo lee controla_stock_terminado de unidades_negocio.
for (const [fila, error, esperado, nombre] of [
  [{ controla_stock_terminado: false }, null, true, 'false → sin control'],
  [{ controla_stock_terminado: true }, null, false, 'true → con control'],
  [null, null, false, 'sin fila → con control'],
  [null, { message: 'x' }, false, 'si no se puede leer → con control (lo de siempre)'],
]) {
  esperas.push((async () => {
    const S = construirRetiros(ARCHIVO)
    S.__setRpc((n) => n === 'catalogo_para_retiro' ? { data: { productos: [], conos: [], insumos: [] }, error: null } : { data: null, error: null })
    S.__tablas.unidades_negocio = () => ({ data: fila ? [fila] : [], error })
    const c = await S.leerCatalogo('u-d')
    chk(`leerCatalogo: ${nombre}`, c.sinControl === esperado)
    const consulta = S.__llamadas.consultas.find(x => x[0] === 'unidades_negocio')
    chk(`leerCatalogo (${nombre}): pide controla_stock_terminado de ESA fábrica`, !!consulta && consulta[1].some(f => f[0] === 'select' && f[1] === 'controla_stock_terminado') && consulta[1].some(f => f[0] === 'eq' && f[1] === 'id' && f[2] === 'u-d'))
  })())
}

// ═══ El renglón: los lotes escritos ═══════════════════════════════════════
esperas.push((async () => {
  const S = armar(true)
  S.elegirProductoRenglon(0, 'p-cap', 'pr-cap', '')
  const r = S.estado.form.renglones[0]
  chk('sin control: el producto lleva los lotes a mano', S.lotesAMano(r) === true && S.renglonConLotes(r) === false)
  await new Promise(res => setImmediate(res))
  chk('sin control: no se leen los lotes con stock', !S.__llamadas.rpc.some(x => x[0] === 'lotes_para_retiro'))
  r.cajas = 84
  let html = S.htmlRenglon(r, 0, S.estado.catalogo, true)
  chk('el renglón: "+ Agregar lote" y los campos de lote y cajas', html.includes('data-r-lm-agregar="0"') && html.includes('data-r-lm-lote="0"') && html.includes('data-r-lm-cajas="0"'))
  chk('el renglón: sin "Completar con los más viejos" ni "Que salga sola"', !/Completar con los más viejos|Que salga sola/.test(html))
  chk('el renglón: sin "¿De dónde salen?" ni el faltante', !/De dónde salen|data-r-faltante-caja|rt-faltante/.test(html))
  chk('el renglón: el lote con tope de 40', /data-r-lm-lote="0"[^>]*maxlength="40"/.test(html))
  chk('sin lotes escritos: "Va sin lote"', /Va sin lote/.test(S.htmlResumenLotesMano(r)) && S.faltanRenglon(r) === null)
  chk('sin lotes escritos: viaja sin "lotes"', JSON.stringify(S.itemParaBase(r)) === JSON.stringify({ presentacion_id: 'pr-cap', marca_id: null, cajas: 84 }))
  // 84 cajas → 10430: 30
  const t1 = tecla(0, 'lote', 0, 'l-10430')
  S.escribirLoteMano(t1)
  chk('el lote pasa a mayúsculas mientras se escribe', t1.value === 'L-10430' && S.filasLotesMano(r)[0].lote === 'L-10430')
  S.escribirLoteMano(tecla(0, 'lote', 0, '10430'))
  S.escribirLoteMano(tecla(0, 'cajas', 0, '30'))
  chk('las cajas del lote se leen del campo', S.filasLotesMano(r)[0].cajas === 30)
  const pie = S.htmlResumenLotesMano(r)
  chk('"Asignado 30 de 84 · faltan 54 cajas"', /Asignado<\/small><span>30 <em>de 84<\/em>/.test(pie) && /faltan 54 cajas/.test(pie))
  chk('para confirmar, la suma tiene que dar el total', S.faltanRenglon(r) === 'faltan asignar 54 cajas a los lotes')
  S.agregarLoteMano(0)
  chk('"+ Agregar lote" suma una fila vacía', S.filasLotesMano(r).length === 2 && S.filasLotesMano(r)[1].lote === '' && S.filasLotesMano(r)[1].cajas === null)
  S.escribirLoteMano(tecla(0, 'lote', 1, '10433'))
  S.escribirLoteMano(tecla(0, 'cajas', 1, '39'))
  chk('10433: 39 → faltan 15', S.faltanRenglon(r) === 'faltan asignar 15 cajas a los lotes' && /faltan 15 cajas/.test(S.htmlResumenLotesMano(r)))
  S.agregarLoteMano(0)
  S.escribirLoteMano(tecla(0, 'lote', 2, '10440'))
  S.escribirLoteMano(tecla(0, 'cajas', 2, '20'))
  chk('de más: lo dice', S.faltanRenglon(r) === 'asignaste 5 cajas de más a los lotes' && /5 cajas de más/.test(S.htmlResumenLotesMano(r)))
  S.escribirLoteMano(tecla(0, 'cajas', 2, '15'))
  chk('justo: ✓ y no falta nada', S.faltanRenglon(r) === null && /✓ Asignado completo/.test(S.htmlResumenLotesMano(r)))
  chk('viajan los lotes escritos', JSON.stringify(S.itemParaBase(r)) === JSON.stringify({ presentacion_id: 'pr-cap', marca_id: null, cajas: 84,
    lotes: [{ lote: '10430', cajas: 30 }, { lote: '10433', cajas: 39 }, { lote: '10440', cajas: 15 }] }))
  chk('nunca hay faltante de producto ni pregunta de origen', S.faltanteProducto(r) === 0 && S.faltaOrigen(r) === false)
  const tarjeta = S.htmlTarjetaRenglon(r, 0, S.estado.catalogo, true)
  chk('la tarjeta muestra los lotes escritos', /10430 ×30/.test(tarjeta) && /10433 ×39/.test(tarjeta) && !/faltan/.test(tarjeta))
  const resumen = S.htmlResumen(S.estado.form, S.estado.catalogo)
  chk('el resumen muestra los lotes escritos', /Lote 10430: 30 cajas · Lote 10433: 39 cajas · Lote 10440: 15 cajas/.test(resumen))
  // Quitar una fila.
  S.quitarLoteMano(0, 1)
  chk('quitar un lote', S.filasLotesMano(r).map(f => f.lote).join() === '10430,10440')
  // Los errores de cada fila.
  S.escribirLoteMano(tecla(0, 'cajas', 1, ''))
  chk('un lote sin cajas', S.faltanRenglon(r) === 'poné las cajas del lote 10440')
  S.escribirLoteMano(tecla(0, 'lote', 1, ''))
  S.escribirLoteMano(tecla(0, 'cajas', 1, '54'))
  chk('cajas sin lote', S.faltanRenglon(r) === 'escribí el lote de las 54 cajas')
  S.escribirLoteMano(tecla(0, 'lote', 1, 'X'.repeat(41)))
  chk('un lote de más de 40', /es muy largo \(40 letras como mucho\)$/.test(S.faltanRenglon(r)))
  S.escribirLoteMano(tecla(0, 'lote', 1, '  10441 '))
  chk('el lote viaja sin espacios en los bordes', S.itemParaBase(r).lotes[1].lote === '10441')
  // Otro producto: los lotes escritos eran del anterior.
  S.elegirProductoRenglon(0, 'p-cuc', 'pr-cuc-con', 'elegir')
  chk('otro producto: los lotes vuelven a estar vacíos', S.filasLotesMano(S.estado.form.renglones[0]).length === 1 && S.filasLotesMano(S.estado.form.renglones[0])[0].lote === '')
})())

// Sin ningún lote escrito: la tarjeta y el resumen dicen "va sin lote".
{
  const S = armar(true)
  S.elegirProductoRenglon(0, 'p-cap', 'pr-cap', '')
  const r = S.estado.form.renglones[0]
  r.cajas = 12
  chk('tarjeta: "va sin lote"', /va sin lote/.test(S.htmlTarjetaRenglon(r, 0, S.estado.catalogo, true)))
  chk('resumen: "Va sin lote"', /Va sin lote/.test(S.htmlResumen(S.estado.form, S.estado.catalogo)))
  chk('la orden se puede confirmar', S.faltanOrden(S.estado.form).length === 0, JSON.stringify(S.faltanOrden(S.estado.form)))
  chk('una sola llamada con el renglón sin "lotes"', JSON.stringify(S.parametrosRegistrar(S.estado.form).p_items) === JSON.stringify([{ presentacion_id: 'pr-cap', marca_id: null, cajas: 12 }]))
}

// Una devolución no lleva lotes; una reposición, sí (escritos).
{
  const S = armar(true)
  S.elegirProductoRenglon(0, 'p-cap', 'pr-cap', '')
  const r = S.estado.form.renglones[0]
  r.dev = { trato: 'descuenta', motivo: 'Rotura', motivoTexto: '', lote: '', destino: 'descarte' }
  r.tipo = 'devolucion'
  chk('una devolución no escribe lotes', S.lotesAMano(r) === S.saleDelStock(r) && S.saleDelStock(r) === false)
}

// Los insumos de la fábrica sin control: como siempre (Dolce sí lleva el stock de insumos).
esperas.push((async () => {
  const S = armar(true)
  S.elegirInsumoRenglon(0, 'i-har')
  const r = S.estado.form.renglones[0]
  chk('el insumo no lleva lotes a mano', S.lotesAMano(r) === false && S.renglonConLotes(r) === true)
  await new Promise(res => setImmediate(res))
  chk('el insumo lee sus lotes con stock', S.__llamadas.rpc.some(x => x[0] === 'lotes_insumo_para_retiro'))
})())

// Con control (Nuss): nada cambia.
esperas.push((async () => {
  const S = armar(false)
  S.elegirProductoRenglon(0, 'p-cap', 'pr-cap', '')
  const r = S.estado.form.renglones[0]
  chk('con control: el producto NO escribe lotes', S.lotesAMano(r) === false && S.renglonConLotes(r) === true)
  await new Promise(res => setImmediate(res))
  chk('con control: lee los lotes con stock', S.__llamadas.rpc.some(x => x[0] === 'lotes_para_retiro'))
  r.cajas = 5
  const html = S.htmlRenglon(r, 0, S.estado.catalogo, true)
  chk('con control: sin "+ Agregar lote"', !/data-r-lm-agregar/.test(html))
  chk('con control: sin lotes, "de los lotes más viejos"', /de los lotes más viejos/.test(S.htmlTarjetaRenglon(r, 0, S.estado.catalogo, true)))
  // Si lo que se escribe a mano quedara de antes, no viaja.
  r.lotesMano = { clave: S.claveLotesRenglon(r), filas: [{ lote: 'X', cajas: 5 }] }
  chk('con control: lo escrito a mano no viaja', S.itemParaBase(r).lotes === undefined)
})())

// El escapado: lo que se escribe vuelve escapado.
{
  const S = armar(true)
  S.elegirProductoRenglon(0, 'p-cap', 'pr-cap', '')
  const r = S.estado.form.renglones[0]
  r.cajas = 3
  r.lotesMano = { clave: S.claveLotesRenglon(r), filas: [{ lote: marca('lote_mano'), cajas: 3 }] }
  const html = S.htmlLotesMano(r, 0)
  chk('el lote escrito va escapado en su campo', html.includes(escapada('lote_mano')) && !/<b data-xss=/i.test(html))
  const tarjeta = S.htmlTarjetaRenglon(r, 0, S.estado.catalogo, true)
  chk('y en la tarjeta (en mayúsculas)', !/<b data-xss=/i.test(tarjeta) && tarjeta.includes('&lt;B DATA-XSS=&quot;LOTE_MANO&quot;&gt;'))
}

fin()
