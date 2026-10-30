// REMITOS DOLCE: LOTES EN LOS RENGLONES DE INSUMO (29/10/2026, rama
// ci-prueba/corregir-orden). La base ya acepta lotes en un renglón de insumo
// (materia prima e insumos que van de Rosario a Córdoba): {lote, cantidad} en
// la unidad del insumo, con decimales (_remito_items_normalizar y
// confirmar_remito_precarga, pg_get_functiondef el 29/10/2026: confirmar
// exige que sumen el renglón; sin lotes, registrar_orden_retiro lo saca de
// los lotes más viejos con stock). En el editor: lote + cantidad en su unidad
// (kg con decimales, un sin), "Lotes: 20,5 de 25 kg · falta repartir 4,5 kg"
// en amarillo mientras no suman, y a actualizar_remito_precarga como
// {lote, cantidad}. Se EJECUTAN las funciones reales.
//
//   node pruebas/test-remitos-dolce-lotes-insumo.js
'use strict'

const path = require('path')
const { construirRemitosDolce } = require('./sandbox-remitos-dolce')
const { arnes, leer, marca, chequearMarcas } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/remitos-dolce.html')
leer(ARCHIVO)
const { chk, esperas, fin } = arnes()
const nuevo = () => construirRemitosDolce(ARCHIVO, {})

const CAT = {
  productos: [{ id: 'p-cap', nombre: 'Capelina Grande', categoria: 'pasta', activo: true }],
  presentaciones: [{ id: 'pr-cap', producto_id: 'p-cap', nombre: 'Caja x 12', con_cono: false, unidades_por_caja: 12, activa: true }],
  marcas: [],
  insumos: [
    { id: 'ins-h', nombre: 'Harina 000', marca: 'Wali', unidad_medida: 'kg', activo: true },
    { id: 'ins-b', nombre: 'Bolsa', marca: null, unidad_medida: 'un', activo: true },
  ],
}
const ITEMS = [
  { texto_leido: 'Harina 25 kg: lote H-1 10,5 y H-2 10', cantidad: 25, presentacion_id: null, marca_id: null, insumo_id: 'ins-h',
    lotes: [{ lote: 'h-1', cantidad: 10.5 }, { lote: 'H-2', cantidad: 10 }], revisar: false, omitir: false, nota: '' },
  { texto_leido: 'Bolsas 100', cantidad: 100, presentacion_id: null, marca_id: null, insumo_id: 'ins-b', lotes: [], revisar: false, omitir: false, nota: '' },
  { texto_leido: 'Capelina 12', cantidad: 12, presentacion_id: 'pr-cap', marca_id: null, insumo_id: null, lotes: [{ lote: 'C-1', cajas: 12 }], revisar: false, omitir: false, nota: '' },
]
const R1 = { id: 'r1', unidad_negocio_id: 'u-d', foto_path: 'u-d/remitos/r1.jpg', subido_en: '2026-10-29T12:00:00+00:00', estado: 'precargada', talonario: 'oficial',
  numero_remito: '0001-00004100', numero_remito_n: 100004100, fecha: '2026-10-29', cliente_id: null, items: ITEMS }

function enDolce(S) {
  S.estado.empresaId = 'u-d'
  S.estado.misTareas = new Map([['retiros:ver', { todas: true }], ['retiros:cargar', { unidades: ['u-d'] }]])
  S.estado.sinControl = new Map([['u-d', true], ['u-n', false]])
  S.estado.remitosResueltos = new Set()
  S.estado.clientes = []
  S.estado.catalogo = CAT
  S.estado.catalogoEmpresa = 'u-d'
  S.__tablas.remitos_precarga = [JSON.parse(JSON.stringify(R1))]
  S.__tablas.ordenes_retiro = []
  S.estado.remitos = { empresaId: 'u-d', filas: [JSON.parse(JSON.stringify(R1))], error: null }
}
const cuerpo = (S) => S.__els.get('ad-remito-cuerpo')?.innerHTML ?? ''
const renglonHtml = (h, i) => {
  const ini = h.indexOf(`data-rm-renglon="${i}"`)
  const fin = h.indexOf('data-rm-renglon="', ini + 10)
  return h.slice(h.lastIndexOf('<div', ini), fin === -1 ? undefined : h.lastIndexOf('<div', fin))
}
const sinEtiquetas = (h) => String(h).replace(/<[^>]+>/g, '')
const vuelta = () => new Promise(r => setImmediate(r))

{
  const S = nuevo()
  enDolce(S)
  esperas.push(S.abrirRemito('r1').then(async () => {
    const h0 = renglonHtml(cuerpo(S), 0)
    chk('el insumo lleva "¿De qué lotes?" con "Cantidad (kg)"', /¿De qué lotes\?/.test(h0) && /<span>Cantidad \(kg\)<\/span><input type="text" class="ad-input" data-rm-lote-cajas="0" data-k="0" inputmode="decimal"/.test(h0), h0.slice(h0.indexOf('ad-rm-lotes'), h0.indexOf('ad-rm-lotes') + 600))
    chk('…con su nombre accesible', /aria-label="Cantidad del lote 1"/.test(h0))
    chk('lo leído viene precargado (también "cantidad")', JSON.stringify(S.estado.remito.form.renglones[0].lotes) === '[{"lote":"h-1","cajas":10.5},{"lote":"H-2","cajas":10}]')
    const p0 = sinEtiquetas(S.htmlResumenLotesRemito(S.estado.remito.form.renglones[0]))
    chk('"Lotes: 20,5 de 25 kg · falta repartir 4,5 kg"', p0 === 'Lotes: 20,5 de 25 kg · falta repartir 4,5 kg', p0)
    chk('…en amarillo mientras no suman', /ad-rm-lotes__asignado--falta/.test(S.htmlResumenLotesRemito(S.estado.remito.form.renglones[0])))
    chk('el producto sigue con "Cajas" e inputmode numérico', /<span>Cajas<\/span><input type="text" class="ad-input" data-rm-lote-cajas="2" data-k="0" inputmode="numeric"/.test(renglonHtml(cuerpo(S), 2)))
    chk('un insumo en unidades: "Cantidad (un.)"', /Cantidad \(un\.\)/.test(renglonHtml(cuerpo(S), 1)) || /Cantidad \(un\)/.test(renglonHtml(cuerpo(S), 1)), renglonHtml(cuerpo(S), 1).match(/Cantidad \([^)]*\)/g)?.join())
    chk('sin lotes escritos: "sale de los lotes más viejos con stock"', /Va sin lote<\/span> <span class="ad-rm-lotes__resumen">Sin lotes escritos sale de los lotes más viejos con stock\.<\/span>/.test(renglonHtml(cuerpo(S), 1)))

    const guardados = []
    S.__setRpc(async (n, p) => { if (n === 'actualizar_remito_precarga') guardados.push(p); return { data: null, error: null } })
    S.agregarLoteRemito(0)
    S.alEscribirRemito({ target: { dataset: { rmLote: '0', k: '2' }, value: 'h-3' } })
    S.alEscribirRemito({ target: { dataset: { rmLoteCajas: '0', k: '2' }, value: '4,5' } })
    const p1 = S.htmlResumenLotesRemito(S.estado.remito.form.renglones[0])
    chk('suman con decimales: "Lotes: 25 de 25 kg · ✓ Asignado completo", sin amarillo', sinEtiquetas(p1) === 'Lotes: 25 de 25 kg · ✓ Asignado completo' && !/--falta/.test(p1), sinEtiquetas(p1))
    S.guardarYaRemito()
    await vuelta(); await vuelta()
    const it = guardados.pop()?.p_items
    chk('a la base: {lote, cantidad}, en mayúsculas', JSON.stringify(it?.[0]?.lotes) === '[{"lote":"H-1","cantidad":10.5},{"lote":"H-2","cantidad":10},{"lote":"H-3","cantidad":4.5}]', JSON.stringify(it?.[0]))
    chk('el producto sigue yendo con {lote, cajas}', JSON.stringify(it?.[2]?.lotes) === '[{"lote":"C-1","cajas":12}]')
    chk('un insumo sin lotes va con la lista vacía', JSON.stringify(it?.[1]?.lotes) === '[]')
    S.alEscribirRemito({ target: { dataset: { rmLoteCajas: '0', k: '2' }, value: '5' } })
    const p2 = S.htmlResumenLotesRemito(S.estado.remito.form.renglones[0])
    chk('de más: "0,5 kg de más", en amarillo', /0,5 kg de más/.test(sinEtiquetas(p2)) && /--falta/.test(p2), sinEtiquetas(p2))
    // Pasar el insumo a un producto: los lotes del insumo no sirven.
    S.elegirProductoRemito(0, 'pr-cap')
    chk('cambiar el insumo por un producto saca sus lotes', S.estado.remito.form.renglones[0].lotes.length === 0 && S.estado.remito.form.renglones[0].insumoId === null)
  }))
}
{
  const S = nuevo()
  enDolce(S)
  const r = { insumoId: 'ins-h', cantidad: 20.3, lotes: [{ lote: 'A', cajas: 10.1 }, { lote: 'B', cajas: 10.2 }] }
  chk('10,1 + 10,2 da 20,3 (sin el error de la coma flotante)', S.asignacionRemito(r).falta === 0 && /✓ Asignado completo/.test(S.htmlResumenLotesRemito(r)))
  chk('una cantidad de lote inválida no suma', S.cantidadLoteInsumo({ cajas: 'diez' }) === 0 && S.cantidadLoteInsumo({ cajas: -2 }) === 0 && S.cantidadLoteInsumo({ cajas: '' }) === 0)
  chk('hasta milésimas', S.cantidadLoteInsumo({ cajas: 1.23456 }) === 1.235)
  chk('lotes vacíos o sin cantidad no viajan', JSON.stringify(S.lotesRemitoParaBase({ insumoId: 'ins-h', lotes: [{ lote: '', cajas: 2 }, { lote: 'B', cajas: 0 }, { lote: 'C', cajas: null }] })) === '[]')
  chk('el lote de un insumo se recorta a 40 letras', S.lotesRemitoParaBase({ insumoId: 'ins-h', lotes: [{ lote: 'y'.repeat(50), cajas: 1.5 }] })[0].lote === 'Y'.repeat(40))
  chk('sin cantidad: "Poné la cantidad y escribí de qué lotes sale."', /Poné la cantidad y escribí de qué lotes sale\./.test(S.htmlResumenLotesRemito({ insumoId: 'ins-h', cantidad: null, lotes: [] })))
  chk('el rótulo: "Cajas" / "Cantidad (kg)"', S.rotuloCantidadLote({ presentacionId: 'pr-cap' }) === 'Cajas' && S.rotuloCantidadLote({ insumoId: 'ins-h' }) === 'Cantidad (kg)')
  chk('un insumo que no está en el catálogo: "Cantidad"', S.rotuloCantidadLote({ insumoId: 'no-esta' }) === 'Cantidad')
  S.estado.catalogo = { ...CAT, insumos: [{ id: 'ins-x', nombre: 'X', unidad_medida: marca('unidad'), activo: true }] }
  chequearMarcas(chk, 'los lotes de un insumo con una unidad rara', S.htmlLotesRemito({ insumoId: 'ins-x', cantidad: 3, lotes: [{ lote: 'A', cajas: 1 }] }, 0), ['unidad'])
}

fin()
