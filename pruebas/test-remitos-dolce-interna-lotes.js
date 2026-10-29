// REMITOS DOLCE → REVISAR: LA ORDEN INTERNA Y LOS LOTES DE CADA RENGLÓN
// (29/10/2026, rama ci-prueba/recibir-entre-empresas).
//  - ORDEN INTERNA: si el cliente ES otra empresa del grupo
//    (clientes.unidad_grupo_id), antes de confirmar dice "Es una orden
//    interna: la mercadería va en tránsito hasta que <empresa> la reciba." y
//    el aviso de confirmada lo repite (la base, _orden_grupo_espejar, arma la
//    recepción en tránsito; se recibe en Stock).
//  - VARIOS LOTES POR RENGLÓN: lo leído por la IA (items[].lotes = [{lote,
//    cajas}]) viene precargado; "+ Agregar lote" y quitar; "Lotes: 25 de 31
//    cajas" en vivo, en amarillo mientras no suman (confirmar_remito_precarga
//    lo rechaza); a actualizar_remito_precarga van en mayúsculas y hasta 40
//    letras (_remito_items_normalizar, pg_get_functiondef el 29/10/2026).
// Se EJECUTAN las funciones reales.
//
//   node pruebas/test-remitos-dolce-interna-lotes.js
'use strict'

const path = require('path')
const { construirRemitosDolce } = require('./sandbox-remitos-dolce')
const { arnes, leer, marca, chequearMarcas } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/remitos-dolce.html')
leer(ARCHIVO)
const { chk, esperas, fin } = arnes()
const nuevo = () => construirRemitosDolce(ARCHIVO, {})

const CAT = {
  productos: [{ id: 'p-bar', nombre: 'Barquillo 45 x4', categoria: null, activo: true }],
  presentaciones: [{ id: 'pr-bar', producto_id: 'p-bar', nombre: 'Caja con cono', con_cono: true, unidades_por_caja: 216, activa: true }],
  marcas: [{ id: 'm-gl', nombre: 'GLACE' }],
  insumos: [{ id: 'ins-h', nombre: 'Harina 000', marca: 'Wali', unidad_medida: 'kg', activo: true }],
}
const CLIENTES = [
  { id: 'c-paz', nombre: 'Paz Mirta', apodos: [], activo: true, unidad_grupo_id: 'u-n' },
  { id: 'c-com', nombre: 'Almacén Rosario', apodos: [], activo: true, unidad_grupo_id: null },
  { id: 'c-mis', nombre: 'Dolce mismo', apodos: [], activo: true, unidad_grupo_id: 'u-d' },
  { id: 'c-rara', nombre: 'Empresa rara', apodos: [], activo: true, unidad_grupo_id: 'u-zz' },
]
const ITEMS = [
  { texto_leido: 'Barquillo 45 x4 GLACE 31 cajas: A 10, B 15, C 6', cantidad: 31, presentacion_id: 'pr-bar', marca_id: 'm-gl', insumo_id: null,
    lotes: [{ lote: 'A', cajas: 10 }, { lote: 'B', cajas: 15 }], revisar: false, omitir: false, nota: '' },
  { texto_leido: 'Harina', cantidad: 25, presentacion_id: null, marca_id: null, insumo_id: 'ins-h', lotes: [], revisar: false, omitir: false, nota: '' },
]
const R1 = { id: 'r1', unidad_negocio_id: 'u-d', foto_path: 'u-d/remitos/r1.jpg', subido_en: '2026-10-29T12:00:00+00:00', estado: 'precargada', talonario: 'oficial',
  numero_remito: '0001-00004000', numero_remito_n: 100004000, fecha: '2026-10-29', cliente_id: 'c-paz', items: ITEMS }

function enDolce(S, { cargar = true, cliente = 'c-paz' } = {}) {
  S.estado.empresaId = 'u-d'
  S.estado.misTareas = new Map([['retiros:ver', { todas: true }], ...(cargar ? [['retiros:cargar', { unidades: ['u-d'] }]] : [])])
  S.estado.sinControl = new Map([['u-d', true], ['u-n', false]])
  S.estado.remitosResueltos = new Set()
  S.estado.clientes = CLIENTES
  S.estado.catalogo = CAT
  S.estado.catalogoEmpresa = 'u-d'
  S.__tablas.remitos_precarga = [{ ...JSON.parse(JSON.stringify(R1)), cliente_id: cliente }]
  S.__tablas.ordenes_retiro = []
  S.__tablas.unidades_negocio = [{ id: 'u-d', controla_stock_terminado: false }]
  S.estado.remitos = { empresaId: 'u-d', filas: [{ ...JSON.parse(JSON.stringify(R1)), cliente_id: cliente }], error: null }
}
const cuerpo = (S) => S.__els.get('ad-remito-cuerpo')?.innerHTML ?? ''
const vuelta = () => new Promise(r => setImmediate(r))
const sinEtiquetas = (h) => String(h).replace(/<[^>]+>/g, '')

// ═══ La orden interna ════════════════════════════════════════════════════
{
  const S = nuevo()
  enDolce(S)
  esperas.push(S.abrirRemito('r1').then(async () => {
    const h = cuerpo(S)
    chk('cliente del grupo: el aviso antes de confirmar', /<p class="ad-aviso ad-rm-interna" id="ad-rm-interna" role="note">Es una orden interna: la mercadería va en tránsito hasta que Cucuruchos Nuss la reciba\.<\/p>/.test(h), h.slice(h.indexOf('ad-rm-acciones'), h.indexOf('ad-rm-acciones') + 400))
    chk('…arriba de la barra de Confirmar (no adentro)', h.indexOf('id="ad-rm-interna"') > 0 && h.indexOf('id="ad-rm-interna"') < h.indexOf('class="ad-barra-acciones"'))
    chk('empresaGrupoRemito: el nombre de la que recibe', S.empresaGrupoRemito(S.estado.remito) === 'Cucuruchos Nuss')
    S.__setRpc(async (n) => n === 'confirmar_remito_precarga' ? { data: { orden_id: 'o1', codigo: 'D-I-0003', numero_remito: '0001-00004000', talonario: 'oficial' }, error: null } : { data: null, error: null })
    await S.confirmarRemito()
    chk('confirmada: el aviso dice que va en tránsito', S.__llamadas.exitos.some(x => x === 'Remito N° 0001-00004000 confirmado: es la orden D-I-0003. Va en tránsito hasta que Cucuruchos Nuss la reciba. Ya se puede valorizar en Administración.'), S.__llamadas.exitos.join(' | '))
  }))
}
{
  const S = nuevo()
  enDolce(S, { cliente: 'c-com' })
  esperas.push(S.abrirRemito('r1').then(async () => {
    chk('cliente común: sin el aviso', !/ad-rm-interna/.test(cuerpo(S)) && S.empresaGrupoRemito(S.estado.remito) === null)
    S.__setRpc(async (n, p) => n === 'actualizar_remito_precarga' ? { data: null, error: null } : { data: null, error: null })
    S.elegirClienteRemito('c-paz')
    chk('al elegir un cliente del grupo, aparece', /id="ad-rm-interna"/.test(cuerpo(S)))
    S.cambiarClienteRemito()
    chk('al sacar el cliente, se va', !/id="ad-rm-interna"/.test(cuerpo(S)))
    S.__setRpc(async (n) => n === 'confirmar_remito_precarga' ? { data: { codigo: 'D-0004', numero_remito: '0001-00004000', talonario: 'oficial' }, error: null } : { data: null, error: null })
    S.estado.remito.form.clienteId = 'c-com'
    await S.confirmarRemito()
    chk('confirmada a un cliente común: sin "en tránsito"', S.__llamadas.exitos.some(x => /es la orden D-0004\. Ya se puede valorizar/.test(x)) && !S.__llamadas.exitos.some(x => /tránsito/.test(x)))
  }))
}
{
  const S = nuevo()
  enDolce(S)
  chk('la misma fábrica no es "otra empresa"', S.empresaGrupoRemito({ fila: { unidad_negocio_id: 'u-d' }, form: { clienteId: 'c-mis' } }) === null)
  chk('una empresa que no se conoce no se inventa', S.empresaGrupoRemito({ fila: { unidad_negocio_id: 'u-d' }, form: { clienteId: 'c-rara' } }) === 'la otra empresa del grupo')
  chk('sin remito no rompe', S.empresaGrupoRemito(null) === null)
  chk('el texto', S.textoOrdenInterna('Dolce Pasta') === 'Es una orden interna: la mercadería va en tránsito hasta que Dolce Pasta la reciba.')
  S.estado.unidades = [{ id: 'u-n', nombre: marca('empresa') }, { id: 'u-d', nombre: 'Dolce Pasta' }]
  chequearMarcas(chk, 'el aviso de orden interna', S.htmlAccionesRemito({ fila: { unidad_negocio_id: 'u-d' }, form: { clienteId: 'c-paz' } }), ['empresa'])
  enDolce(S, { cargar: false })
  chk('sin Retiros · cargar (solo mira): sin el aviso', !/ad-rm-interna/.test(S.htmlAccionesRemito({ fila: { unidad_negocio_id: 'u-d' }, form: { clienteId: 'c-paz' } })))
}

// ═══ Varios lotes por renglón ════════════════════════════════════════════
{
  const S = nuevo()
  enDolce(S)
  esperas.push(S.abrirRemito('r1').then(async () => {
    const r = S.estado.remito.form.renglones[0]
    chk('lo leído por la IA viene precargado', JSON.stringify(r.lotes) === JSON.stringify([{ lote: 'A', cajas: 10 }, { lote: 'B', cajas: 15 }]))
    const h0 = S.htmlResumenLotesRemito(r)
    chk('"Lotes: 25 de 31 cajas · falta repartir 6 cajas" (29/10/2026)', sinEtiquetas(h0) === 'Lotes: 25 de 31 cajas · falta repartir 6 cajas', sinEtiquetas(h0))
    chk('…en amarillo mientras no suman', /ad-rm-lotes__asignado ad-rm-lotes__asignado--falta/.test(h0))
    chk('en la pantalla, el pie del renglón', /data-rm-lotes-pie="0"[^>]*>[\s\S]*Lotes: 25 de 31 cajas/.test(cuerpo(S)))
    const guardados = []
    S.__setRpc(async (n, p) => { if (n === 'actualizar_remito_precarga') guardados.push(p); return { data: null, error: null } })
    S.agregarLoteRemito(0)
    chk('"+ Agregar lote": una fila vacía más', S.estado.remito.form.renglones[0].lotes.length === 3 && S.estado.remito.form.renglones[0].lotes[2].lote === '')
    S.alEscribirRemito({ target: { dataset: { rmLote: '0', k: '2' }, value: 'c' } })
    S.alEscribirRemito({ target: { dataset: { rmLoteCajas: '0', k: '2' }, value: '6' } })
    const h1 = S.htmlResumenLotesRemito(S.estado.remito.form.renglones[0])
    chk('suman: "Lotes: 31 de 31 cajas · ✓ Asignado completo", sin amarillo', sinEtiquetas(h1) === 'Lotes: 31 de 31 cajas · ✓ Asignado completo' && !/--falta/.test(h1), sinEtiquetas(h1))
    S.guardarYaRemito()
    await vuelta(); await vuelta()
    const p = guardados.pop()
    chk('los tres lotes van a actualizar_remito_precarga, en mayúsculas', JSON.stringify(p?.p_items?.[0]?.lotes) === '[{"lote":"A","cajas":10},{"lote":"B","cajas":15},{"lote":"C","cajas":6}]', JSON.stringify(p?.p_items?.[0]))
    S.alEscribirRemito({ target: { dataset: { rmLoteCajas: '0', k: '2' }, value: '7' } })
    const h2 = S.htmlResumenLotesRemito(S.estado.remito.form.renglones[0])
    chk('de más: "1 de más", en amarillo', /1 de más/.test(h2) && /--falta/.test(h2) && /Lotes: 32 de 31 cajas/.test(sinEtiquetas(h2)))
    S.quitarLoteRemito(0, 1)
    chk('quitar un lote', JSON.stringify(S.estado.remito.form.renglones[0].lotes.map(l => l.lote)) === '["A","C"]')
    await vuelta(); await vuelta()
    chk('…y se guarda sin ese lote', JSON.stringify(guardados.pop()?.p_items?.[0]?.lotes) === '[{"lote":"A","cajas":10},{"lote":"C","cajas":7}]')
    chk('un insumo no lleva lotes de cajas', !/data-rm-lote-agregar="1"/.test(cuerpo(S)))
  }))
}
{
  const S = nuevo()
  chk('el lote se recorta a 40 letras y va en mayúsculas', JSON.stringify(S.lotesRemitoParaBase({ lotes: [{ lote: ' ' + 'x'.repeat(45) + ' ', cajas: 2 }] })) === JSON.stringify([{ lote: 'X'.repeat(40), cajas: 2 }]))
  chk('lotes vacíos o sin cajas no viajan', JSON.stringify(S.lotesRemitoParaBase({ lotes: [{ lote: '', cajas: 3 }, { lote: 'B', cajas: 0 }, { lote: 'C', cajas: null }] })) === '[]')
  chk('cajas no enteras no viajan', JSON.stringify(S.lotesRemitoParaBase({ lotes: [{ lote: 'A', cajas: 2.5 }] })) === '[]')
  chk('sin cantidad: pide las cajas', /Poné las cajas/.test(S.htmlResumenLotesRemito({ cantidad: null, lotes: [] })))
  chk('sin lotes escritos: "Va sin lote"', /Va sin lote/.test(S.htmlResumenLotesRemito({ cantidad: 31, lotes: [] })))
  chk('lo leído con cajas inválidas no se precarga como número', S.renglonDesdeItem({ presentacion_id: 'pr-bar', cantidad: 5, lotes: [{ lote: 'A', cajas: 'diez' }] }).lotes[0].cajas === null)
  chk('lo leído de un insumo no trae lotes de cajas', S.renglonDesdeItem({ insumo_id: 'ins-h', cantidad: 5, lotes: [{ lote: 'A', cajas: 2 }] }).lotes.length === 0)
}

fin()
