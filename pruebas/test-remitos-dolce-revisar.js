// REMITOS DOLCE → REVISAR (28/10/2026, rama ci-prueba/modulo-remitos-dolce;
// antes en Administración → Órdenes, 27/10/2026, y esta suite era
// test-administracion-remitos-precarga.js). En modulos/remitos-dolce.html,
// pestaña Revisar: "Remitos precargados · por revisar" (precargada, error,
// leyendo; el más nuevo arriba), el remito abierto con la foto firmada, el
// encabezado con el talonario Oficial / Acopio, los renglones en AMARILLO con
// lo leído y la nota, "Aceptar sugerencia", elegir el producto saca el
// amarillo, "No va en la orden" (omitir), los lotes ("Asignado X de Y · faltan
// Z"), lo que se manda a actualizar_remito_precarga, Confirmar (guarda antes;
// el error de la base TAL CUAL; "Descartar (ya ingresado)"), Descartar con
// motivo y Volver a leer. Abajo, las órdenes por N° de remito (las sin número
// al final) en solapas Oficial / Acopio, de solo lectura (se valorizan en
// Administración). Se EJECUTAN las funciones reales, con texto malicioso
// donde va algo de la base. Lo que quedó en Administración (la ficha con
// "Remito N° X", Órdenes sin cambios) lo prueba
// test-administracion-link-remitos.js.
//
//   node pruebas/test-remitos-dolce-revisar.js
'use strict'

const path = require('path')
const fs = require('fs')
const { construirRemitosDolce } = require('./sandbox-remitos-dolce')
const { arnes, leer, marca, chequearMarcas, escapada } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/remitos-dolce.html')
leer(ARCHIVO)
// El runner de mutaciones también muta js/remitos-comun.js (lo pega
// fuente-cobranzas.js): necesita saber cuántos bytes leyó de ESE archivo
// (29/10/2026: sin este renglón, sus 6 mutaciones daban "error del test").
const COMUN_REMITOS = process.env.ARCHIVO_COMUN_REMITOS || path.join(__dirname, '..', 'js', 'remitos-comun.js')
console.log(`COMUN ${COMUN_REMITOS} (${fs.readFileSync(COMUN_REMITOS, 'utf8').length} bytes)`)
const { chk, esperas, fin } = arnes()

const FUNCIONES = [
  'leerRemito', 'quitarRemitoDeLaLista', 'cajasLoteRemito', 'normalizarLoteRemito', 'renglonDesdeItem', 'renglonRemitoNuevo', 'formDesdeRemito',
  'lotesRemitoParaBase', 'itemRemitoParaBase', 'parametrosActualizarRemito', 'asignacionRemito', 'htmlResumenLotesRemito', 'puedeAceptarSugerencia',
  'textoResumenRemito', 'presentacionRemito', 'productoDePresentacionRemito', 'nombreRenglonRemito', 'ordenCategoriaRemito', 'opcionesRemito',
  'gruposRemito', 'htmlOpcionesRemito', 'htmlSelectorRemito', 'htmlMarcasRemito', 'htmlConoRemito', 'filasLotesRemito', 'htmlLotesRemito',
  'htmlRenglonRemito', 'htmlClientesRemito', 'htmlClienteRemito', 'htmlEncabezadoRemito', 'urlFotoSegura', 'htmlFotoRemito', 'htmlAccionesRemito',
  'pintarTituloRemito', 'pintarFotoRemito', 'ponerSrcFotoRemito', 'pintarRemito', 'renglonRemito', 'marcarSucioRemito', 'elegirProductoRemito',
  'elegirInsumoRemito', 'elegirMarcaRemito', 'cambiarProductoRemito', 'aceptarSugerenciaRemito', 'omitirRenglonRemito', 'quitarRenglonRemito',
  'agregarRenglonRemito', 'agregarLoteRemito', 'quitarLoteRemito', 'pintarPieLotesRemito', 'elegirTalonarioRemito', 'elegirClienteRemito',
  'cambiarClienteRemito', 'buscarClienteLeidoRemito', 'zoomFotoRemito', 'alEscribirRemito', 'alTocarRemito', 'accionRemito', 'abrirRemito',
  'cargarFotoRemito', 'aplicarFilaRemito', 'confirmarRemito', 'mensajeDeFuncion', 'volverALeerRemito',
  'descartarRemito', 'volverDeRemito', 'clientesParaAsentar', 'apodoMostrarRet', 'momentoAr',
]
const CONSTANTES = ['ZOOM_FOTO_REMITO', 'LARGO_LOTE_REMITO', 'LARGO_MINIMO_MOTIVO_REMITO', 'RE_YA_INGRESADO', 'GRUPOS_REMITO']
// La Edge Function: el doble anota cada llamada y responde lo que diga window.__fn.
const PRELUDIO = `
  supabase.functions = { invoke(n, op) { __llamadas.rpc.push(['fn:' + n, JSON.parse(JSON.stringify(op ?? null))]); return Promise.resolve(window.__fn ? window.__fn(n, op) : { data: null, error: null }) } }
`
const nuevo = () => construirRemitosDolce(ARCHIVO, { funciones: FUNCIONES, constantes: CONSTANTES, preludioExtra: PRELUDIO })

const CAT = {
  productos: [
    { id: 'p-cono', nombre: 'Cono dulce 48', categoria: null, activo: true },
    { id: 'p-cap', nombre: 'Capelina Grande', categoria: 'pasta', activo: true },
    { id: 'p-viejo', nombre: 'Producto apagado', categoria: null, activo: false },
  ],
  presentaciones: [
    { id: 'pr-cono', producto_id: 'p-cono', nombre: 'Caja x 48 con cono', con_cono: true, unidades_por_caja: 48, activa: true },
    { id: 'pr-cap', producto_id: 'p-cap', nombre: 'Caja x 12', con_cono: false, unidades_por_caja: 12, activa: true },
    { id: 'pr-cap-vieja', producto_id: 'p-cap', nombre: 'Caja vieja', con_cono: false, activa: false },
    { id: 'pr-apagado', producto_id: 'p-viejo', nombre: 'Caja', con_cono: false, activa: true },
  ],
  marcas: [{ id: 'm-lel', nombre: 'LELONA' }, { id: 'm-ler', nombre: 'LEROMA' }],
  insumos: [{ id: 'ins-h', nombre: 'Harina 000', marca: 'Wali', unidad_medida: 'kg', activo: true }],
}
const CLIENTES = [
  { id: 'c-alm', nombre: 'Almacén Rosario', razon_social: 'ROSARIO SA', apodos: ['La Rosa'], localidad: 'Rosario', activo: true },
  { id: 'c-off', nombre: 'Almacén Cerrado', activo: false },
]
const ITEMS_R1 = [
  { texto_leido: 'Cono dulce 48 con cono Lelona', cantidad: 10, presentacion_id: 'pr-cono', marca_id: 'm-lel', insumo_id: null, lotes: [], revisar: true, omitir: false, nota: 'leí Lelona, ¿LEROMA?' },
  { texto_leido: 'Capelinas grandes', cantidad: 84, presentacion_id: null, marca_id: null, insumo_id: null, lotes: [], revisar: true, omitir: false, nota: 'no encontré el producto' },
  { texto_leido: 'Harina 000 x 25', cantidad: 25, presentacion_id: null, marca_id: null, insumo_id: 'ins-h', lotes: [], revisar: false, omitir: false, nota: '' },
  { texto_leido: 'Envases térmicos', cantidad: 5, presentacion_id: null, marca_id: null, insumo_id: null, lotes: [], revisar: true, omitir: false, nota: '¿de terceros?' },
]
const R1 = { id: 'r1', unidad_negocio_id: 'u-d', foto_path: 'u-d/remitos/r1.jpg', subido_en: '2026-10-27T12:00:00+00:00', estado: 'precargada', talonario: 'oficial',
  numero_remito: '0001-00003100', numero_remito_n: 100003100, fecha: '2026-10-26', cliente_id: null, cliente_leido: 'Almacen Rosar', transporte: null, observaciones: null, items: ITEMS_R1 }
const R2 = { id: 'r2', unidad_negocio_id: 'u-d', foto_path: 'u-d/remitos/r2.jpg', subido_en: '2026-10-27T13:00:00+00:00', estado: 'error', talonario: 'oficial', numero_remito: null, items: [], error: 'La foto está borrosa' }
const R3 = { id: 'r3', unidad_negocio_id: 'u-d', foto_path: 'u-d/remitos/r3.jpg', subido_en: '2026-10-27T09:00:00+00:00', estado: 'leyendo', talonario: 'oficial', items: [] }
const R4 = { id: 'r4', unidad_negocio_id: 'u-d', foto_path: 'x', subido_en: '2026-10-27T14:00:00+00:00', estado: 'confirmada', items: [] }
const R5 = { id: 'r5', unidad_negocio_id: 'u-d', foto_path: 'x', subido_en: '2026-10-27T15:00:00+00:00', estado: 'descartada', items: [] }
const R6 = { id: 'r6', unidad_negocio_id: 'u-d', foto_path: 'u-d/remitos/r6.jpg', subido_en: '2026-10-27T11:00:00+00:00', estado: 'precargada', talonario: 'acopio',
  numero_remito: '977492', numero_remito_n: 977492, fecha: '2026-10-25', cliente_id: 'c-alm', items: [] }
const ORDENES = [
  { id: 'o1', codigo: 'D-0001', fecha: '2026-10-20', estado: 'confirmada', estado_valorizacion: 'valorizada', total: 50000, moneda: 'ARS', cliente_id: 'c-alm', numero_remito: '0001-00003050', numero_remito_n: 100003050, talonario: null },
  { id: 'o2', codigo: 'D-0002', fecha: '2026-10-21', estado: 'confirmada', estado_valorizacion: 'pendiente', total: 0, moneda: 'ARS', cliente_id: 'c-alm', numero_remito: null, numero_remito_n: null, talonario: null },
  { id: 'o3', codigo: 'D-0003', fecha: '2026-10-22', estado: 'confirmada', estado_valorizacion: 'pendiente', total: 0, moneda: 'ARS', cliente_id: 'c-alm', numero_remito: '0001-00003099', numero_remito_n: 100003099, talonario: 'oficial' },
  { id: 'o4', codigo: 'D-0004', fecha: '2026-10-23', estado: 'confirmada', estado_valorizacion: 'valorizada', total: 12000, moneda: 'ARS', cliente_id: 'c-alm', numero_remito: '977490', numero_remito_n: 977490, talonario: 'acopio' },
  { id: 'o5', codigo: 'D-0005', fecha: '2026-10-24', estado: 'confirmada', estado_valorizacion: 'pendiente', total: 0, moneda: 'ARS', cliente_id: 'c-alm', numero_remito: null, numero_remito_n: null, talonario: null },
]

function enDolce(S, { cargar = true } = {}) {
  S.estado.empresaId = 'u-d'
  S.estado.empresas = [...S.estado.empresas]
  S.estado.misTareas = new Map([['retiros:ver', { todas: true }], ['retiros:cargar', { unidades: ['u-d'] }], ...(cargar ? [] : [])])
  if (!cargar) S.estado.misTareas.delete('retiros:cargar')
  S.estado.sinControl = new Map([['u-d', true], ['u-n', false]])
  S.estado.remitosResueltos = new Set()
  S.estado.talonarioOrdenes = 'oficial'
  S.estado.clientes = CLIENTES
  S.estado.catalogo = CAT
  S.estado.catalogoEmpresa = 'u-d'
  S.__tablas.remitos_precarga = (filtros) => {
    const id = filtros.find(f => f[0] === 'eq' && f[1] === 'id')
    const todas = JSON.parse(JSON.stringify([R1, R2, R3, R4, R5, R6]))
    return { data: id ? todas.filter(r => r.id === id[2]) : todas, error: null }
  }
  S.__tablas.ordenes_retiro = JSON.parse(JSON.stringify(ORDENES))
  S.__tablas.orden_retiro_items = []
}
const cuerpo = (S) => S.__els.get('ad-remito-cuerpo')?.innerHTML ?? ''
const sinEtiquetas = (h) => String(h).replace(/<[^>]+>/g, '')
const renglonHtml = (h, i) => {
  const ini = h.indexOf(`data-rm-renglon="${i}"`)
  const fin = h.indexOf('data-rm-renglon="', ini + 10)
  return h.slice(h.lastIndexOf('<div', ini), fin === -1 ? undefined : h.lastIndexOf('<div', fin))
}

// ═══ La lista: qué estados entran y en qué orden ══════════════════════════
{
  const S = nuevo()
  S.estado.remitosResueltos = new Set()
  const ids = S.remitosPorRevisar([R1, R2, R3, R4, R5, R6]).map(r => r.id)
  chk('por revisar: precargada, error y leyendo (ni confirmada ni descartada)', !ids.includes('r4') && !ids.includes('r5') && ids.length === 4, ids.join())
  chk('el más nuevo arriba (subido_en)', ids.join() === 'r2,r1,r6,r3', ids.join())
  S.estado.remitosResueltos = new Set(['r1'])
  chk('uno ya confirmado en esta visita no vuelve aunque la lectura lo traiga', !S.remitosPorRevisar([R1, R2]).some(r => r.id === 'r1'))
  chk('los estados de la lista son los tres de revisar', JSON.stringify(S.ESTADOS_REMITO_POR_REVISAR) === JSON.stringify(['precargada', 'error', 'leyendo']))
  chk('amarillos: revisar y no omitido', S.amarillosDe(ITEMS_R1) === 3 && S.amarillosDe([{ revisar: true, omitir: true }, { revisar: false }]) === 0)
}

// ═══ Abajo: las órdenes por N° de remito, por talonario ═══════════════════
{
  const S = nuevo()
  enDolce(S)
  const orden = S.ordenarPorRemito(ORDENES).map(o => o.id)
  chk('por N° de remito, mayor a menor; las sin número al final en el orden en que vinieron', orden.join() === 'o3,o1,o4,o2,o5', orden.join())
  chk('el número que viene como texto también ordena', S.ordenarPorRemito([{ id: 'a', numero_remito_n: '5' }, { id: 'b', numero_remito_n: '12' }]).map(o => o.id).join() === 'b,a')
  S.estado.ordenes = JSON.parse(JSON.stringify(ORDENES))
  chk('solapa Oficial: las oficiales (null = oficial) por número', S.ordenesVisibles().map(o => o.id).join() === 'o3,o1,o2,o5', S.ordenesVisibles().map(o => o.id).join())
  S.elegirTalonarioOrdenes('acopio')
  chk('solapa Acopio: solo las de acopio', S.ordenesVisibles().map(o => o.id).join() === 'o4')
  S.elegirTalonarioOrdenes('raro')
  chk('un talonario que no existe no cambia nada', S.estado.talonarioOrdenes === 'acopio')
  S.estado.talonarioOrdenes = 'oficial'
  S.pintarOrdenesRemito()
  const lista = S.__els.get('rd-ordenes-lista').innerHTML
  const sol = S.__els.get('rd-ordenes-talonario').innerHTML
  chk('las solapas dicen cuántas hay en cada talonario', /Oficial · 4/.test(sol) && /Acopio · 1/.test(sol) && /data-talonario-ordenes="oficial" aria-pressed="true"/.test(sol))
  chk('la fila: "Remito N° X" grande', /<span class="ad-rm-numero">Remito N° 0001-00003099<\/span>/.test(lista))
  chk('la fila sin número: "Sin N° de remito"', /ad-rm-numero--sin">Sin N° de remito</.test(lista))
  chk('la fila dice Valorizada / Por valorizar', /ad-sello--orden-valorizada">Valorizada/.test(lista) && /ad-sello--orden-pendiente">Por valorizar/.test(lista))
  chk('la que falta valorizar, marcada', /ad-fila--atencion" data-orden="o3"/.test(lista) && !/ad-fila--atencion" data-orden="o1"/.test(lista))
  chk('sin plata en esta pantalla (se valoriza en Administración)', !/\$/.test(lista))
  chk('la fila lleva cliente, fecha y la orden', /Almacén Rosario · 20\/10\/2026 · Orden D-0001/.test(lista))
  chk('el orden en la pantalla es el del número', lista.indexOf('data-orden="o3"') < lista.indexOf('data-orden="o1"') && lista.indexOf('data-orden="o1"') < lista.indexOf('data-orden="o2"'))
  chk('las filas son de solo lectura (no son botones)', (lista.match(/data-orden="/g) || []).length === 4 && !/<button/.test(lista))
  chk('sin retiros:precios no se ofrece "Valorizar en Administración"', S.__els.get('rd-link-admin').hidden === true)
  S.estado.misTareas.set('retiros:precios', { unidades: ['u-d'] })
  S.pintarOrdenesRemito()
  chk('con retiros:precios, el link a Administración', S.__els.get('rd-link-admin').hidden === false)
  S.estado.talonarioOrdenes = 'acopio'
  S.pintarOrdenesRemito()
  chk('la de acopio: "Acopio N° …" y el sello Acopio', /Acopio N° 977490/.test(S.__els.get('rd-ordenes-lista').innerHTML) && /ad-sello--acopio">Acopio/.test(S.__els.get('rd-ordenes-lista').innerHTML))
  S.estado.ordenes = [{ id: 'o-an', estado: 'anulada', estado_valorizacion: 'valorizada', numero_remito: '977400', talonario: 'acopio', cliente_id: 'c-alm', fecha: '2026-10-01' }]
  S.pintarOrdenesRemito()
  chk('una anulada dice "Anulada" (aunque estuviera valorizada)', /ad-fila--anulada/.test(S.__els.get('rd-ordenes-lista').innerHTML) && /ad-sello--orden-anulada">Anulada/.test(S.__els.get('rd-ordenes-lista').innerHTML))
  S.estado.ordenes = null
  S.estado.errorOrdenes = 'No se pudieron leer las órdenes. Revisá la conexión y volvé a entrar.'
  S.pintarOrdenesRemito()
  chk('si no se pudieron leer, lo dice', /ad-aviso--grave">No se pudieron leer las órdenes/.test(S.__els.get('rd-ordenes-lista').innerHTML))
}
// La red: una fábrica CON control (no debería llegar acá: cargarFabricas solo
// trae las sin control) no muestra precargados ni solapas, y no ordena.
{
  const S = nuevo()
  enDolce(S)
  S.estado.empresaId = 'u-n'
  S.estado.ordenes = JSON.parse(JSON.stringify(ORDENES))
  S.estado.remitos = { empresaId: 'u-n', filas: [R1], error: null }
  chk('con control: no es "sin control"', S.sinControlStockEmpresa('u-n') === false && S.sinControlStockEmpresa('u-d') === true && S.sinControlStockEmpresa('u-x') === false)
  chk('con control: sin la sección de precargados', S.htmlRemitosPrecarga() === '')
  chk('con control: sin solapas', S.htmlTalonariosOrdenes() === '')
  chk('con control: la lista como vino (sin ordenar por remito)', S.ordenesVisibles().map(o => o.id).join() === 'o1,o2,o3,o4,o5')
}
esperas.push((async () => {
  const S = nuevo()
  enDolce(S)
  await S.cargarOrdenesRemito()
  const q = S.__llamadas.consultas.find(c => c[0] === 'ordenes_retiro')[1]
  chk('las órdenes: de la fábrica, con N° de remito y talonario', q.some(f => f[0] === 'eq' && f[1] === 'unidad_negocio_id' && f[2] === 'u-d') &&
    q.some(f => f[0] === 'select' && /numero_remito, numero_remito_n, talonario/.test(f[1]) && /estado_valorizacion/.test(f[1])))
  const desde = q.find(f => f[0] === 'gte' && f[1] === 'fecha')?.[2]
  const dias = desde ? Math.round((Date.now() - Date.parse(desde + 'T12:00:00Z')) / 86400000) : null
  chk('…de los últimos 120 días, con tope', dias !== null && Math.abs(dias - 120) <= 1 && q.some(f => f[0] === 'limit' && f[1] === 400), String(dias))
  chk('…quedan en el estado', Array.isArray(S.estado.ordenes) && S.estado.ordenes.length === 5)
  const T = nuevo()
  enDolce(T)
  T.__tablas.ordenes_retiro = () => ({ data: null, error: { message: 'sin red' } })
  await T.cargarOrdenesRemito()
  chk('si falla, el error y ninguna orden', T.estado.ordenes === null && /No se pudieron leer las órdenes/.test(T.estado.errorOrdenes))
})())

// ═══ Dolce: la sección de arriba ═════════════════════════════════════════
{
  const S = nuevo()
  enDolce(S)
  esperas.push(S.mostrarRevisar().then(() => {
    const c = S.__llamadas.consultas.find(x => x[0] === 'remitos_precarga')
    chk('Dolce: se leen los remitos de la fábrica, por revisar', c && c[1].some(f => f[0] === 'eq' && f[1] === 'unidad_negocio_id' && f[2] === 'u-d') &&
      c[1].some(f => f[0] === 'in' && f[1] === 'estado' && JSON.stringify(f[2]) === '["precargada","error","leyendo"]'))
    const h = S.__els.get('ad-remitos').innerHTML
    chk('el título y el contador (29/10/2026: "Sin terminar · para cargar lotes")', /Sin terminar · para cargar lotes <span class="ad-rm-contador" data-remitos-cuenta>4<\/span>/.test(h))
    chk('las cuatro, en orden: r2, r1, r6, r3', [...h.matchAll(/data-remito="([^"]+)"/g)].map(m => m[1]).join() === 'r2,r1,r6,r3')
    chk('el estado de cada una', /Listo para cargar lotes/.test(h) && /No se pudo leer/.test(h) && /Leyendo…/.test(h))
    chk('la que no se pudo leer dice por qué', /La foto está borrosa/.test(h))
    chk('cuántos en amarillo', /3 en amarillo/.test(h))
    chk('la de acopio con su sello y "Acopio N°"', /Acopio N° 977492/.test(h) && /ad-sello--acopio/.test(h))
    chk('el cliente leído como ayuda si no se eligió', /«Almacen Rosar» \(leído\)/.test(h))
    chk('abajo, las solapas de talonario', /Oficial · 4/.test(S.__els.get('rd-ordenes-talonario').innerHTML))
    chk('se abre la pestaña Revisar', S.estado.vista === 'rd-vista-revisar' && S.estado.pestana === 'revisar')
  }))
}

// ═══ Abrir uno: la foto, los amarillos, el selector ═══════════════════════
{
  const S = nuevo()
  enDolce(S)
  S.estado.remitos = { empresaId: 'u-d', filas: S.remitosPorRevisar(JSON.parse(JSON.stringify([R1, R2, R3, R6]))), error: null }
  esperas.push(S.abrirRemito('r1').then(() => {
    chk('se abre la vista del remito', S.estado.vista === 'ad-vista-remito')
    chk('la foto se firma del bucket comprobantes', S.__urlsFirmadas().some(([b, r]) => b === 'comprobantes' && r === 'u-d/remitos/r1.jpg'))
    chk('la foto quedó con su link', S.estado.remito.foto.url === 'https://firmada/u-d/remitos/r1.jpg')
    chk('el título: "Remito N° 0001-00003100"', S.__els.get('ad-remito-titulo').textContent === 'Remito N° 0001-00003100')
    const h = cuerpo(S)
    const foto = S.__els.get('ad-rm-foto-caja').innerHTML
    chk('la foto va sin src interpolado (se pone por la propiedad)', /<img class="ad-rm-foto__img" data-rm-foto alt="Foto del remito"/.test(foto) && !/src="/.test(foto + h))
    chk('el zoom arranca en 100 %', /100 %/.test(h) && /data-rm-zoom="-1" aria-label="Achicar la foto" disabled/.test(h))
    const r0 = renglonHtml(h, 0), r1 = renglonHtml(h, 1), r2 = renglonHtml(h, 2)
    chk('el renglón marcado va en AMARILLO', /ad-rm-renglon ad-rm-renglon--revisar/.test(r0) && /ad-rm-renglon ad-rm-renglon--revisar/.test(r1))
    chk('el que no está marcado, no', !/ad-rm-renglon--revisar/.test(r2))
    chk('lo leído y la nota', /Leído: «Cono dulce 48 con cono Lelona»/.test(r0) && /leí Lelona, ¿LEROMA\?/.test(r0))
    chk('"Aceptar sugerencia" donde la IA reconoció producto y cantidad', /data-rm-aceptar="0"/.test(r0))
    chk('sin producto no hay "Aceptar sugerencia", hay el selector', !/data-rm-aceptar="1"/.test(r1) && /data-rm-buscar="1"/.test(r1))
    chk('el selector: los dos grupos de producto terminado', /Producto terminado · SIN CONO/.test(r1) && /Producto terminado · CON CONO/.test(r1))
    chk('…sin una presentación apagada ni un producto apagado', !/pr-cap-vieja/.test(r1) && !/pr-apagado/.test(r1))
    chk('…los insumos, al buscar', !/data-rm-insumo/.test(r1) && /Escribí para buscar también los insumos/.test(r1))
    chk('el producto elegido con su cono (el leído, con la lista cerrada y "Cambiar")', /Cono dulce 48 · Caja x 48 con cono · LELONA/.test(r0) && /data-rm-cono-elegido="0"><span class="ad-rm-cono-elegido__nombre">LELONA<\/span><button type="button" class="ad-link" data-rm-cono-cambiar="0">Cambiar<\/button>/.test(r0) && !/data-rm-marca=/.test(r0))
    chk('el insumo con su unidad', /Cantidad \(kg\)/.test(r2) && /Harina 000 · Wali/.test(r2))
    chk('los lotes, solo para producto', /data-rm-lote-agregar="0"/.test(r0) && !/data-rm-lote-agregar="2"/.test(r2))
    chk('el resumen de renglones', /4 renglones · 3 en amarillo/.test(h))
    chk('el cliente leído como ayuda, con "Buscar así"', /Leído en la foto: «Almacen Rosar»/.test(h) && /data-rm-cliente-leido/.test(h))
    chk('el talonario Oficial elegido', /data-rm-talonario="oficial" aria-pressed="true"/.test(h))
    chk('los tres botones: Confirmar, Volver a leer y Descartar', ['confirmar', 'leer', 'descartar'].every(a => h.includes(`data-rm-accion="${a}"`)))
    chk('…sin "Guardar" (se guarda solo, 29/10/2026)', !/data-rm-accion="guardar"/.test(h) && !/>Guardar</.test(h))
    chk('…y al lado de Confirmar, el estado chico', /data-rm-accion="confirmar"[^>]*>Confirmar<\/button><span class="ad-rm-guardado" id="ad-rm-guardado" role="status" aria-live="polite">Los cambios se guardan solos\.<\/span>/.test(h))

    const grupos = S.gruposRemito(CAT, 'harina')
    chk('buscar "harina" trae el insumo', grupos.length === 1 && grupos[0].tipo === 'insumos' && grupos[0].lista[0].insumoId === 'ins-h')
    chk('buscar sin acentos ni mayúsculas', S.gruposRemito(CAT, 'CAPELINA').some(g => g.lista.some(o => o.presentacionId === 'pr-cap')))
    chk('nada coincide', /Nada coincide con «zzz»/.test(S.htmlOpcionesRemito(1, CAT, 'zzz')))

    // Aceptar sugerencia: saca el amarillo sin cambiar nada más.
    const antes = JSON.stringify({ ...S.estado.remito.form.renglones[0], revisar: null })
    S.aceptarSugerenciaRemito(0)
    chk('Aceptar sugerencia: revisar = false', S.estado.remito.form.renglones[0].revisar === false)
    chk('…y no cambia nada más', JSON.stringify({ ...S.estado.remito.form.renglones[0], revisar: null }) === antes)
    chk('…deja de ser amarillo', !/ad-rm-renglon--revisar/.test(renglonHtml(cuerpo(S), 0)))
    chk('…el remito quedó con cambios', S.estado.remito.sucio === true)
    S.aceptarSugerenciaRemito(1)
    chk('sin producto, Aceptar sugerencia no hace nada', S.estado.remito.form.renglones[1].revisar === true)

    // Elegir el producto: deja de ser amarillo.
    S.elegirProductoRemito(1, 'pr-cap')
    const rr1 = S.estado.remito.form.renglones[1]
    chk('elegir el producto: revisar = false y la presentación', rr1.revisar === false && rr1.presentacionId === 'pr-cap' && rr1.insumoId === null)
    chk('…deja de ser amarillo y muestra el elegido', !/ad-rm-renglon--revisar/.test(renglonHtml(cuerpo(S), 1)) && /Capelina Grande · Caja x 12/.test(renglonHtml(cuerpo(S), 1)))
    S.elegirProductoRemito(1, 'no-existe')
    chk('una presentación que no está en el catálogo no se elige', S.estado.remito.form.renglones[1].presentacionId === 'pr-cap')

    // "No va en la orden".
    S.omitirRenglonRemito(3, true)
    const h3 = renglonHtml(cuerpo(S), 3)
    chk('omitir: tachado en gris, sin amarillo, con "Va en la orden"', /ad-rm-renglon--omitido/.test(h3) && !/ad-rm-renglon--revisar/.test(h3) && /data-rm-omitir="3" data-valor="no"/.test(h3))
    chk('el omitido no cuenta en los amarillos', /4 renglones · 1 no va en la orden/.test(cuerpo(S)) && !/en amarillo/.test(S.textoResumenRemito(S.estado.remito.form.renglones)))
    S.omitirRenglonRemito(3, false)
    chk('deshacer: vuelve a ser amarillo', /ad-rm-renglon--revisar/.test(renglonHtml(cuerpo(S), 3)))
    S.omitirRenglonRemito(3, true)

    // Los lotes del renglón 1: 84 cajas.
    const r = S.estado.remito.form.renglones[1]
    r.lotes = [{ lote: '10430', cajas: 30 }, { lote: ' 10433 ', cajas: 39 }]
    chk('"Lotes: 69 de 84 cajas · falta repartir 15 cajas"', sinEtiquetas(S.htmlResumenLotesRemito(r)) === 'Lotes: 69 de 84 cajas · falta repartir 15 cajas', sinEtiquetas(S.htmlResumenLotesRemito(r)))
    r.lotes.push({ lote: '10440', cajas: 15 })
    chk('completo: "✓ Asignado completo"', /✓ Asignado completo/.test(S.htmlResumenLotesRemito(r)))
    r.lotes.push({ lote: 'X', cajas: 1 })
    chk('de más: "1 de más"', /1 de más/.test(S.htmlResumenLotesRemito(r)))
    r.lotes.pop()
    chk('sin lotes: "Va sin lote"', /Va sin lote/.test(S.htmlResumenLotesRemito({ cantidad: 12, lotes: [] })))
    chk('sin cantidad: pide las cajas', /Poné las cajas/.test(S.htmlResumenLotesRemito({ cantidad: null, lotes: [] })))
    chk('los lotes que viajan: en mayúsculas, sin bordes, con cajas', JSON.stringify(S.lotesRemitoParaBase({ lotes: [{ lote: ' l-1 ', cajas: 3 }, { lote: '', cajas: 2 }, { lote: 'L-2', cajas: 0 }, { lote: 'L-3', cajas: 1.5 }] })) === '[{"lote":"L-1","cajas":3}]')

    // El cliente.
    S.elegirClienteRemito('c-off')
    chk('un cliente apagado no se elige', S.estado.remito.form.clienteId === null)
    S.estado.remito.form.clienteBusqueda = 'rosa'
    const res = S.htmlClientesRemito(S.estado.remito)
    chk('el buscador: por apodo', /data-rm-cliente="c-alm"/.test(res))
    S.estado.remito.form.clienteBusqueda = 'almac'
    const res2 = S.htmlClientesRemito(S.estado.remito)
    chk('el buscador: por nombre, solo los activos', /data-rm-cliente="c-alm"/.test(res2) && !/c-off/.test(res2))
    chk('menos de 2 letras pide escribir', /Escribí al menos 2 letras/.test(S.htmlClientesRemito({ form: { clienteBusqueda: 'r' } })))
    S.buscarClienteLeidoRemito()
    chk('"Buscar así" busca con lo leído', S.estado.remito.form.clienteBusqueda === 'Almacen Rosar')
    S.elegirClienteRemito('c-alm')
    chk('elegir el cliente', S.estado.remito.form.clienteId === 'c-alm' && /Almacén Rosario/.test(cuerpo(S)) && /data-rm-cliente-cambiar/.test(cuerpo(S)))

    // Lo que se escribe (sin redibujar).
    const ev = (dataset, value) => S.alEscribirRemito({ target: { dataset, value } })
    ev({ rmCampo: 'transporte' }, 'Expreso Rosario')
    ev({ rmCampo: 'observaciones' }, 'Frágil')
    ev({ rmCampo: 'numero' }, '0001-00003101')
    ev({ rmCampo: 'otra' }, 'x')
    chk('los campos del encabezado se anotan', S.estado.remito.form.transporte === 'Expreso Rosario' && S.estado.remito.form.observaciones === 'Frágil' && S.estado.remito.form.numero === '0001-00003101' && S.estado.remito.form.otra === undefined)
    chk('el título sigue al número', S.__els.get('ad-remito-titulo').textContent === 'Remito N° 0001-00003101')

    // El autoguardado: lo que va a actualizar_remito_precarga (lo escrito
    // espera el retardo; guardarYaRemito lo manda sin esperar).
    chk('lo escrito espera el retardo: "Guardando…"', S.estado.remito.temporizador !== null && S.estadoGuardadoRemito(S.estado.remito).texto === 'Guardando…')
    let params = null
    S.__setRpc(async (n, p) => { if (n === 'actualizar_remito_precarga') { params = p; return { data: { ...R1, ...p, id: 'r1', items: p.p_items, estado: 'precargada' }, error: null } } return { data: null, error: null } })
    return S.esperarGuardadoRemito(S.estado.remito).then(() => {
      chk('se guarda solo con actualizar_remito_precarga', !!params)
      chk('…con el encabezado', params.p_id === 'r1' && params.p_numero_remito === '0001-00003101' && params.p_fecha === '2026-10-26' && params.p_cliente_id === 'c-alm' &&
        params.p_transporte === 'Expreso Rosario' && params.p_observaciones === 'Frágil', JSON.stringify(params))
      chk('…y SIEMPRE el talonario elegido', params.p_talonario === 'oficial')
      chk('…y los renglones como los pide la base', JSON.stringify(params.p_items) === JSON.stringify([
        { texto_leido: 'Cono dulce 48 con cono Lelona', cantidad: 10, presentacion_id: 'pr-cono', marca_id: 'm-lel', insumo_id: null, lotes: [], revisar: false, omitir: false, nota: 'leí Lelona, ¿LEROMA?' },
        { texto_leido: 'Capelinas grandes', cantidad: 84, presentacion_id: 'pr-cap', marca_id: null, insumo_id: null, lotes: [{ lote: '10430', cajas: 30 }, { lote: '10433', cajas: 39 }, { lote: '10440', cajas: 15 }], revisar: false, omitir: false, nota: 'no encontré el producto' },
        { texto_leido: 'Harina 000 x 25', cantidad: 25, presentacion_id: null, marca_id: null, insumo_id: 'ins-h', lotes: [], revisar: false, omitir: false, nota: '' },
        { texto_leido: 'Envases térmicos', cantidad: 5, presentacion_id: null, marca_id: null, insumo_id: null, lotes: [], revisar: false, omitir: true, nota: '¿de terceros?' },
      ]), JSON.stringify(params.p_items))
      chk('guardado: sin cambios pendientes y el estado dice "Guardado"', S.estado.remito.sucio === false && S.__els.get('ad-rm-guardado').textContent === 'Guardado' && S.estadoGuardadoRemito(S.estado.remito).texto === 'Guardado')
    })
  }))
}

// ═══ El talonario y los parámetros vacíos ═══════════════════════════════
{
  const S = nuevo()
  enDolce(S)
  S.estado.remito = { id: 'r9', fila: { unidad_negocio_id: 'u-d' }, form: S.formDesdeRemito({ talonario: 'oficial', items: [] }), foto: { cargando: true }, zoom: 0 }
  S.elegirTalonarioRemito('acopio')
  const p = S.parametrosActualizarRemito(S.estado.remito)
  chk('Acopio: p_talonario = acopio', p.p_talonario === 'acopio' && S.estado.remito.sucio === true)
  chk('vacíos van en null (número, fecha, cliente, transporte, observaciones)', p.p_numero_remito === null && p.p_fecha === null && p.p_cliente_id === null && p.p_transporte === null && p.p_observaciones === null)
  chk('la ayuda del talonario de acopio', /talonario celeste/.test(S.htmlEncabezadoRemito(S.estado.remito)))
  S.elegirTalonarioRemito('otro')
  chk('un talonario que no existe no se elige', S.estado.remito.form.talonario === 'acopio')
  chk('un renglón nuevo arranca eligiendo, sin amarillo', S.renglonRemitoNuevo().eligiendo === true && S.renglonRemitoNuevo().revisar === false)
  S.agregarRenglonRemito()
  chk('"+ Agregar renglón"', S.estado.remito.form.renglones.length === 1)
  S.quitarRenglonRemito(0)
  chk('"Quitar el renglón"', S.estado.remito.form.renglones.length === 0)
  chk('el renglón desde la base: lo inválido se descarta', JSON.stringify(S.renglonDesdeItem({ presentacion_id: '', insumo_id: 'ins-h', cantidad: -2, revisar: 'si', lotes: [{ lote: 'A', cajas: 2 }] })) ===
    JSON.stringify({ texto_leido: '', nota: '', revisar: false, omitir: false, cantidad: null, presentacionId: null, marcaId: null, insumoId: 'ins-h', lotes: [], eligiendo: false, busqueda: '', marcaBusqueda: '', cambiandoCono: false }))
  chk('un insumo nunca viaja con cono', S.itemRemitoParaBase({ insumoId: 'ins-h', marcaId: 'm-lel', cantidad: 3 }).marca_id === null &&
    S.itemRemitoParaBase({ presentacionId: 'pr-cono', marcaId: 'm-lel', cantidad: 3 }).marca_id === 'm-lel')
  chk('el talonario de la fila: solo "acopio" es acopio', S.talonarioDe({ talonario: 'acopio' }) === 'acopio' && S.talonarioDe({ talonario: null }) === 'oficial' && S.talonarioDe({ talonario: 'x' }) === 'oficial')
  chk('la foto: solo https, blob o data:image', S.urlFotoSegura('https://a/b') === 'https://a/b' && S.urlFotoSegura('javascript:alert(1)') === null && S.urlFotoSegura('data:text/html,x') === null && S.urlFotoSegura('data:image/png;base64,AA') !== null)
  S.zoomFotoRemito(1); S.zoomFotoRemito(1); S.zoomFotoRemito(1); S.zoomFotoRemito(1)
  chk('el zoom llega a 300 % y no más', S.estado.remito.zoom === 3 && /300 %/.test(S.htmlFotoRemito(S.estado.remito)))
  S.zoomFotoRemito(-1)
  chk('…y vuelve', S.estado.remito.zoom === 2)
  S.estado.remito.foto = { url: 'https://firmada/x.jpg' }
  chk('la foto con zoom: el ancho', /style="width: 200%"/.test(S.htmlFotoRemito(S.estado.remito)))
  S.estado.remito.foto = { error: 'Este remito no tiene foto.' }
  chk('sin foto, lo dice', /Este remito no tiene foto/.test(S.htmlFotoRemito(S.estado.remito)))
}

// ═══ Confirmar: guarda primero, el error TAL CUAL, "ya ingresado" ═════════
{
  const S = nuevo()
  enDolce(S)
  S.estado.remitos = { empresaId: 'u-d', filas: S.remitosPorRevisar(JSON.parse(JSON.stringify([R1, R2]))), error: null }
  const ERROR = 'El remito 0001-00003100 ya entró como ingreso en la otra empresa. No lo confirmes: descartalo con el motivo "ya ingresado".'
  esperas.push(S.abrirRemito('r1').then(async () => {
    const orden = []
    S.__setRpc(async (n, p) => {
      orden.push(n)
      if (n === 'actualizar_remito_precarga') return { data: { ...R1, items: p.p_items }, error: null }
      if (n === 'confirmar_remito_precarga') return { data: null, error: { message: ERROR } }
      if (n === 'descartar_remito_precarga') return { data: null, error: null }
      return { data: null, error: null }
    })
    S.aceptarSugerenciaRemito(0)
    await S.confirmarRemito()
    chk('Confirmar con cambios: primero el guardado, después confirma', orden.join() === 'actualizar_remito_precarga,confirmar_remito_precarga', orden.join())
    chk('el error de la base TAL CUAL (escapado)', cuerpo(S).includes(S.esc(ERROR)) && /role="alert"/.test(cuerpo(S)))
    chk('"ya entró como ingreso" → el botón "Descartar (ya ingresado)"', /data-rm-accion="ya-ingresado"[^>]*>Descartar \(ya ingresado\)/.test(cuerpo(S)))
    chk('el remito sigue en la lista', S.estado.remitos.filas.some(r => r.id === 'r1'))
    orden.length = 0
    await S.confirmarRemito()
    chk('sin cambios, Confirmar no vuelve a guardar', orden.join() === 'confirmar_remito_precarga')
    S.accionRemito('ya-ingresado')
    await Promise.resolve(); await new Promise(r => setImmediate(r))
    const llamada = S.__llamadas.rpc.find(x => x[0] === 'descartar_remito_precarga')
    chk('"Descartar (ya ingresado)" descarta con ese motivo', llamada && llamada[1].p_id === 'r1' && llamada[1].p_motivo === 'ya ingresado', JSON.stringify(llamada))
    chk('…y lo saca de la lista', !S.estado.remitos.filas.some(r => r.id === 'r1'))
  }))
}
{
  // Otro error: sin el botón de ya ingresado. Y luego OK.
  const S = nuevo()
  enDolce(S)
  S.estado.remitos = { empresaId: 'u-d', filas: S.remitosPorRevisar(JSON.parse(JSON.stringify([R1, R2]))), error: null }
  S.__tablas.unidades_negocio = [{ id: 'u-d', controla_stock_terminado: false }]
  esperas.push(S.abrirRemito('r1').then(async () => {
    S.__setRpc(async (n) => n === 'confirmar_remito_precarga' ? { data: null, error: { message: 'El renglón 1 está en amarillo: revisalo antes de confirmar.' } } : { data: null, error: null })
    await S.confirmarRemito()
    chk('otro error: tal cual, sin "Descartar (ya ingresado)"', /El renglón 1 está en amarillo: revisalo antes de confirmar\./.test(cuerpo(S)) && !/ya-ingresado/.test(cuerpo(S)))
    S.__setRpc(async (n) => n === 'confirmar_remito_precarga' ? { data: { orden_id: 'o9', codigo: 'D-0009', numero_remito: '0001-00003100', talonario: 'oficial' }, error: null } : { data: null, error: null })
    await S.confirmarRemito()
    chk('confirmado: avisa la orden creada', S.__llamadas.exitos.some(x => x === 'Remito N° 0001-00003100 confirmado: es la orden D-0009. Ya se puede valorizar en Administración.'), S.__llamadas.exitos.join(' | '))
    chk('…lo saca de la lista y vuelve a Revisar', !S.estado.remitos.filas?.some?.(r => r.id === 'r1') && S.estado.remito === null && S.estado.vista === 'rd-vista-revisar')
    chk('…aunque la base lo vuelva a traer, no aparece', !/data-remito="r1"/.test(S.__els.get('ad-remitos').innerHTML) && /data-remito="r2"/.test(S.__els.get('ad-remitos').innerHTML))
  }))
}
{
  // Acopio: el aviso dice "Acopio N°".
  const S = nuevo()
  enDolce(S)
  S.estado.remitos = { empresaId: 'u-d', filas: [JSON.parse(JSON.stringify(R6))], error: null }
  esperas.push(S.abrirRemito('r6').then(async () => {
    S.__setRpc(async (n) => n === 'confirmar_remito_precarga' ? { data: { orden_id: 'o8', codigo: 'D-0008', numero_remito: '977492', talonario: 'acopio' }, error: null } : { data: null, error: null })
    await S.confirmarRemito()
    chk('confirmado de acopio: "Acopio N° 977492 confirmado"', S.__llamadas.exitos.some(x => /^Acopio N° 977492 confirmado: es la orden D-0008/.test(x)))
  }))
}

// ═══ Descartar con motivo ══════════════════════════════════════════════
{
  const S = nuevo()
  enDolce(S)
  S.estado.remitos = { empresaId: 'u-d', filas: S.remitosPorRevisar(JSON.parse(JSON.stringify([R1, R2]))), error: null }
  esperas.push(S.abrirRemito('r2').then(async () => {
    S.accionRemito('descartar')
    chk('Descartar abre el panel del motivo', /id="ad-rm-panel-descartar"/.test(cuerpo(S)))
    S.alEscribirRemito({ target: { dataset: { rmMotivo: '' }, value: 'no' } })
    S.accionRemito('descartar-si')
    chk('motivo de menos de 3 letras: no se manda', !S.__llamadas.rpc.some(x => x[0] === 'descartar_remito_precarga') && /al menos 3 letras/.test(cuerpo(S)))
    S.__setRpc(async (n) => n === 'descartar_remito_precarga' ? { data: null, error: { message: 'Ese remito ya es una orden: anulá la orden.' } } : { data: null, error: null })
    S.alEscribirRemito({ target: { dataset: { rmMotivo: '' }, value: 'foto repetida' } })
    await S.descartarRemito(S.estado.remito.descartar.motivo)
    chk('el error de la base, tal cual, en el panel', /Ese remito ya es una orden: anulá la orden\./.test(cuerpo(S)))
    S.__setRpc(async () => ({ data: null, error: null }))
    await S.descartarRemito('  foto repetida ')
    const ll = S.__llamadas.rpc.filter(x => x[0] === 'descartar_remito_precarga').pop()
    chk('se descarta con el motivo sin bordes', ll[1].p_id === 'r2' && ll[1].p_motivo === 'foto repetida')
    chk('…sale de la lista y avisa', !S.estado.remitos.filas.some(r => r.id === 'r2') && S.__llamadas.exitos.some(x => /se descartó \(foto repetida\)/.test(x)))
  }))
}

// ═══ Volver a leer ══════════════════════════════════════════════════════
{
  const S = nuevo()
  enDolce(S)
  S.estado.remitos = { empresaId: 'u-d', filas: S.remitosPorRevisar(JSON.parse(JSON.stringify([R1, R2]))), error: null }
  esperas.push(S.abrirRemito('r2').then(async () => {
    S.estado.remito.form.transporte = 'algo sin guardar'
    S.marcarSucioRemito()
    S.accionRemito('leer')
    chk('Volver a leer avisa que pisa lo corregido', /pisa todo lo de este remito, también lo que ya corregiste\./.test(cuerpo(S)))
    S.accionRemito('leer-no')
    chk('Cancelar no llama a nada', !S.__llamadas.rpc.some(x => x[0] === 'fn:ocr-remito'))
    S.__win.__fn = () => ({ data: { ...R2, estado: 'precargada', error: null, numero_remito: '0001-00003200', items: [ITEMS_R1[0]] }, error: null })
    S.accionRemito('leer')
    await S.volverALeerRemito()
    const ll = S.__llamadas.rpc.find(x => x[0] === 'fn:ocr-remito')
    chk('llama a ocr-remito con { remito_id }', ll && JSON.stringify(ll[1]) === '{"body":{"remito_id":"r2"}}', JSON.stringify(ll))
    chk('…y el formulario queda con lo leído (pisa lo no guardado)', S.estado.remito.form.numero === '0001-00003200' && S.estado.remito.form.transporte === '' && S.estado.remito.sucio === false && S.estado.remito.form.renglones.length === 1)
    S.__win.__fn = () => ({ data: { error: 'No se pudo leer la foto: está borrosa.' }, error: null })
    await S.volverALeerRemito()
    chk('el error de la lectura, tal cual', /No se pudo leer la foto: está borrosa\./.test(cuerpo(S)))
    S.__win.__fn = () => ({ data: null, error: { message: 'Edge Function returned a non-2xx status code', context: { json: async () => ({ error: 'Falta la clave de la IA.' }) } } })
    await S.volverALeerRemito()
    chk('el error del cuerpo de la función, no el genérico', /Falta la clave de la IA\./.test(cuerpo(S)))
  }))
}

// ═══ Sin retiros:cargar, solo mirar ═════════════════════════════════════
{
  const S = nuevo()
  enDolce(S, { cargar: false })
  S.estado.remitos = { empresaId: 'u-d', filas: [JSON.parse(JSON.stringify(R1))], error: null }
  esperas.push(S.abrirRemito('r1').then(() => {
    chk('sin retiros:cargar: sin botones y lo dice', !/data-rm-accion="confirmar"/.test(cuerpo(S)) && /no corregirlo ni confirmarlo/.test(cuerpo(S)))
  }))
}

// ═══ "‹ Revisar" con un cambio sin mandar: se manda y sale ═══════════════
// (el detalle —la respuesta que tarda, el error— en test-remitos-dolce-autoguardado.js)
{
  const S = nuevo()
  enDolce(S)
  S.estado.remitos = { empresaId: 'u-d', filas: [JSON.parse(JSON.stringify(R1))], error: null }
  S.__tablas.unidades_negocio = [{ id: 'u-d', controla_stock_terminado: false }]
  esperas.push(S.abrirRemito('r1').then(async () => {
    S.alEscribirRemito({ target: { dataset: { rmCampo: 'transporte' }, value: 'Expreso' } })
    chk('lo escrito todavía no se mandó', !S.__llamadas.rpc.some(x => x[0] === 'actualizar_remito_precarga'))
    await S.volverDeRemito()
    const ll = S.__llamadas.rpc.filter(x => x[0] === 'actualizar_remito_precarga')
    chk('al salir se manda igual', ll.length === 1 && ll[0][1].p_transporte === 'Expreso', JSON.stringify(ll))
    await new Promise(r => setImmediate(r))
    chk('…y sale a Revisar sin preguntar', S.estado.vista === 'rd-vista-revisar' && S.estado.remito === null)
  }))
}

// ═══ Escape: todo lo de la base con texto malicioso ════════════════════
{
  const S = nuevo()
  enDolce(S)
  const malo = {
    ...R1, id: 'r-xss', numero_remito: marca('numero'), cliente_leido: marca('clienteLeido'), transporte: marca('transporte'), observaciones: marca('observaciones'),
    error: marca('error'), estado: 'error',
    items: [{ texto_leido: marca('textoLeido'), nota: marca('nota'), cantidad: 1, presentacion_id: 'pr-x', marca_id: null, insumo_id: null, lotes: [{ lote: marca('lote'), cajas: 1 }], revisar: true }],
  }
  S.estado.catalogo = {
    productos: [{ id: 'p-x', nombre: marca('producto'), activo: true }],
    presentaciones: [{ id: 'pr-x', producto_id: 'p-x', nombre: marca('presentacion'), con_cono: true, activa: true }],
    marcas: [{ id: 'm-x', nombre: marca('cono') }],
    insumos: [{ id: 'i-x', nombre: marca('insumo'), marca: marca('marcaInsumo'), unidad_medida: 'kg', activo: true }],
  }
  S.estado.clientes = [{ id: 'c-x', nombre: marca('cliente'), razon_social: marca('razon'), localidad: marca('localidad'), apodos: [], activo: true }]
  S.estado.remitos = { empresaId: 'u-d', filas: [malo], error: null }
  chequearMarcas(chk, 'la tarjeta', S.htmlTarjetaRemito(malo), ['numero', 'clienteLeido', 'error'])
  esperas.push(S.abrirRemito('r-xss').then(() => {
    S.estado.remito.mensaje = marca('mensaje')
    S.estado.remito.aviso = marca('aviso')
    S.estado.remito.descartar = { motivo: marca('motivo'), error: marca('errorDescartar') }
    S.pintarRemito()
    chequearMarcas(chk, 'el remito', cuerpo(S), ['clienteLeido', 'transporte', 'observaciones', 'error', 'textoLeido', 'nota', 'lote', 'producto', 'presentacion', 'mensaje', 'aviso', 'motivo', 'errorDescartar'])
    // Los conos, recién al buscar (29/10/2026).
    S.estado.remito.form.renglones[0].marcaBusqueda = 'data-xss'
    chequearMarcas(chk, 'el buscador del cono', S.htmlConoRemito(S.estado.remito.form.renglones[0], 0, S.estado.catalogo), ['cono'])
    chequearMarcas(chk, 'el selector', S.htmlOpcionesRemito(0, S.estado.catalogo, '"><b data-xss='), ['producto', 'presentacion', 'insumo', 'marcaInsumo'])
    S.estado.remito.form.clienteBusqueda = 'data-xss'
    chequearMarcas(chk, 'los clientes', S.htmlClientesRemito(S.estado.remito), ['cliente', 'razon', 'localidad'])
    S.estado.remito.form.clienteBusqueda = marca('clienteBusqueda')
    chequearMarcas(chk, 'el buscador del cliente', S.htmlClienteRemito(S.estado.remito), ['clienteBusqueda'])
    S.elegirClienteRemito('c-x')
    chequearMarcas(chk, 'el cliente elegido', S.htmlClienteRemito(S.estado.remito), ['cliente'])
    S.estado.remito.form.renglones[0].eligiendo = true
    S.estado.remito.form.renglones[0].busqueda = marca('busqueda')
    chequearMarcas(chk, 'el buscador del renglón', S.htmlRenglonRemito(S.estado.remito.form.renglones[0], 0, S.estado.catalogo), ['busqueda'])
    S.estado.remito.form.renglones[0].omitir = true
    chequearMarcas(chk, 'el renglón omitido', S.htmlRenglonRemito(S.estado.remito.form.renglones[0], 0, S.estado.catalogo), ['textoLeido', 'nota', 'producto'])
    const fila = S.htmlFilaOrdenRemito({ id: 'o-x', codigo: marca('codigo'), fecha: '2026-10-20', estado: 'confirmada', estado_valorizacion: 'pendiente', cliente_id: 'c-x', numero_remito: marca('numeroOrden') })
    chequearMarcas(chk, 'la fila de la orden', fila, ['codigo', 'numeroOrden', 'cliente'])
    chk('el título va por textContent', S.__els.get('ad-remito-titulo').textContent.includes('"><b data-xss='))
    chk('escapada() es lo que se busca', escapada('x') === '&lt;b data-xss=&quot;x&quot;&gt;')
  }))
}

fin()
