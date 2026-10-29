// ADMINISTRACIÓN — LA ORDEN INTERNA EN TRÁNSITO / RECIBIDA (29/10/2026, rama
// ci-prueba/recibir-entre-empresas; pedido de Facu: toda orden entre empresas
// del grupo queda EN TRÁNSITO hasta que la empresa que recibe la acepta).
// La base (pg_get_functiondef el 29/10/2026): _orden_grupo_espejar arma una
// recepción en tránsito; recepciones_grupo(p_unidad_negocio_id, p_estado)
// la devuelve (p_estado null = todas) solo a quien tiene stock:ver o
// stock:recibir_transferencia en la que recibe; recibir_orden_grupo la pasa
// a 'recibida'; anular_orden_retiro la cancela si seguía en tránsito.
// En el detalle de la orden: "En tránsito a <empresa>" / "Recibida por
// <nombre> el dd/mm" con las diferencias / anulada / sin datos / error. Se
// EJECUTA leerOrden + htmlDetalleOrden, con texto malicioso donde va algo de
// la base.
//
//   node pruebas/test-administracion-orden-recepcion.js
'use strict'

const path = require('path')
const fs = require('fs')
const { construirAdministracion } = require('./sandbox-administracion')
const { arnes, marca, chequearMarcas } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/administracion.html')
const src = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${src.length} bytes)`)
const { chk, esperas, fin } = arnes()
const nuevo = () => construirAdministracion(ARCHIVO)

const DOLCE = 'u-d'
const CLIENTES = [
  { id: 'c-dp', nombre: 'DOLCE PASTA SRL', razon_social: 'DOLCE PASTA SRL', lista_precio_id: 'l-int', activo: true, unidad_grupo_id: DOLCE },
  { id: 'c1', nombre: 'Distribuidora Anatolia', razon_social: 'ANATOLIA SRL', lista_precio_id: 'l1', activo: true, unidad_grupo_id: null },
]
const CAT = {
  productos: [{ id: 'p1', nombre: 'Cucurucho grande' }],
  presentaciones: [{ id: 'pr1', producto_id: 'p1', nombre: 'Caja x 100', con_cono: false, unidades_por_caja: 100 }],
  marcas: [], insumos: [],
}
const ORDEN = { id: 'o1', numero: 42, codigo: 'N-I-0042', unidad_negocio_id: 'u-n', fecha: '2026-10-29', estado: 'confirmada', estado_valorizacion: 'pendiente',
  total: null, moneda: 'ARS', cliente_id: 'c-dp', cargada_por: 'emp-9', cargada_en: '2026-10-29T13:00:00Z', transporte: null, observaciones: null, division_pct_a: null }
const ITEMS = [{ id: 'i1', orden: 1, presentacion_id: 'pr1', marca_id: null, cajas: 10, unidades: 1000, precio_caja: null, subtotal: null, lote: null, tipo: 'retiro' }]
const EN_TRANSITO = { id: 'rec-1', estado: 'en_transito', creada_en: '2026-10-29T13:00:00Z', recibida_en: null, recibida_por: null, orden_id: 'o1', codigo: 'N-I-0042',
  origen: 'Cucuruchos Nuss', destino: 'Dolce Pasta', destino_id: DOLCE,
  items: [{ item_id: 'ri1', tipo: 'producto', descripcion: 'Cucurucho grande · Caja x 100', unidad: 'cajas', lote: 'L-7', cantidad_enviada: 10, cantidad_recibida: null, motivo_diferencia: null }] }
const RECIBIDA = { ...EN_TRANSITO, estado: 'recibida', recibida_en: '2026-10-31T01:30:00Z', recibida_por: 'Emma Gómez',
  items: [
    { item_id: 'ri1', tipo: 'producto', descripcion: 'Cucurucho grande · Caja x 100', unidad: 'cajas', lote: 'L-7', cantidad_enviada: 10, cantidad_recibida: 8, motivo_diferencia: 'Dos cajas rotas' },
    { item_id: 'ri2', tipo: 'insumo', descripcion: 'Harina 000 · Wali', unidad: 'kg', lote: null, cantidad_enviada: 50, cantidad_recibida: 50, motivo_diferencia: null },
    { item_id: 'ri3', tipo: 'insumo', descripcion: 'Azúcar', unidad: 'kg', lote: 'A-1', cantidad_enviada: 25.5, cantidad_recibida: 20.25, motivo_diferencia: 'Bolsa rota' },
  ] }

function preparar(S, { orden = ORDEN, recepciones = [EN_TRANSITO], error = null } = {}) {
  S.estado.clientes = CLIENTES
  S.estado.catalogo = CAT
  S.estado.catalogoEmpresa = 'u-n'
  S.__tablas.ordenes_retiro = [orden]
  S.__tablas.orden_retiro_items = ITEMS
  S.__tablas.v_empleados_publico = [{ id: 'emp-9', nombre: 'Emanuel Romero' }]
  S.__setRpc(async (n) => n === 'recepciones_grupo' ? (error ? { data: null, error } : { data: recepciones, error: null }) : { data: null, error: null })
}
const cuerpo = (S) => S.__els.get('ad-orden-cuerpo').innerHTML
const recepcionHtml = (h) => (h.match(/<div class="ad-recepcion[\s\S]*?<\/div>/) || [''])[0]

// ── En tránsito ────────────────────────────────────────────────────────────
{
  const S = nuevo()
  preparar(S)
  esperas.push(S.abrirOrden('o1').then(() => {
    const ll = S.__llamadas.rpc.filter(([n]) => n === 'recepciones_grupo')
    chk('lee recepciones_grupo de la empresa que recibe, todas (p_estado null)', ll.length === 1 && ll[0][1].p_unidad_negocio_id === DOLCE && ll[0][1].p_estado === null, JSON.stringify(ll))
    const h = recepcionHtml(cuerpo(S))
    chk('"En tránsito a Dolce Pasta"', /En tránsito a Dolce Pasta: entra a su stock cuando la reciban\./.test(h), h)
    chk('…en amarillo (en tránsito)', /ad-recepcion ad-recepcion--transito/.test(h) && /data-recepcion-estado="en_transito"/.test(h))
    chk('…con el rótulo "Orden interna"', /<span class="ad-dato__rotulo">Orden interna<\/span>/.test(h))
    chk('…sin diferencias', !/ad-recepcion__difs/.test(h))
    chk('ya no dice que entró a su stock', !/entró a su stock/.test(cuerpo(S)))
  }))
}

// ── Recibida, con diferencias ──────────────────────────────────────────────
{
  const S = nuevo()
  preparar(S, { recepciones: [{ ...EN_TRANSITO, id: 'otra', orden_id: 'o-otra' }, RECIBIDA] })
  esperas.push(S.abrirOrden('o1').then(() => {
    const h = recepcionHtml(cuerpo(S))
    chk('busca la de ESTA orden entre las que vienen', S.estado.orden.recepcion?.id === 'rec-1')
    chk('"Recibida por Emma Gómez el 30/10" (hora de Argentina)', /Recibida por Emma Gómez el 30\/10\./.test(h), h)
    chk('…en verde', /ad-recepcion ad-recepcion--recibida/.test(h))
    chk('la diferencia en cajas, con lote y motivo', /<li>Cucurucho grande · Caja x 100 · Lote L-7: se mandaron 10 cajas, llegaron 8 cajas \(Dos cajas rotas\)<\/li>/.test(h), h)
    chk('la diferencia de un insumo, con decimales y su unidad', /<li>Azúcar · Lote A-1: se mandaron 25,5 kg, llegaron 20,25 kg \(Bolsa rota\)<\/li>/.test(h), h)
    chk('lo que llegó igual no se lista', !/Harina 000/.test(h))
    chk('las diferencias van en una lista con su nombre', /<ul class="ad-recepcion__difs" aria-label="Diferencias al recibir">/.test(h))
  }))
}
{
  // Recibida sin el nombre; recibida sin diferencias.
  const S = nuevo()
  chk('sin quién: "alguien de Dolce Pasta"', S.textoRecepcionOrden({ ...RECIBIDA, recibida_por: null }, 'Dolce Pasta') === 'Recibida por alguien de Dolce Pasta el 30/10.')
  chk('una caja en singular', S.cantidadRecepcion(1, 'cajas') === '1 caja' && S.cantidadRecepcion(3, 'cajas') === '3 cajas')
  chk('recibida igual: sin diferencias', S.diferenciasRecepcion({ ...RECIBIDA, items: [RECIBIDA.items[1]] }).length === 0)
  chk('en tránsito: sin diferencias aunque falte lo recibido', S.diferenciasRecepcion(EN_TRANSITO).length === 0)
  chk('…ni aunque un renglón ya tenga un número (solo una recibida tiene diferencias)', S.diferenciasRecepcion({ ...EN_TRANSITO, items: [{ ...EN_TRANSITO.items[0], cantidad_recibida: 3 }] }).length === 0)
  chk('un renglón sin recibir (null) no es una diferencia', S.diferenciasRecepcion({ ...RECIBIDA, items: [{ ...RECIBIDA.items[0], cantidad_recibida: null }] }).length === 0)
  chk('sin motivo, sin paréntesis', /llegaron 8 cajas$/.test(S.diferenciasRecepcion({ ...RECIBIDA, items: [{ ...RECIBIDA.items[0], motivo_diferencia: '  ' }] })[0]))
}

// ── Anulada, sin datos, error, orden común ─────────────────────────────────
{
  const S = nuevo()
  preparar(S, { recepciones: [{ ...EN_TRANSITO, estado: 'anulada' }] })
  esperas.push(S.abrirOrden('o1').then(() => {
    chk('anulada: "se anuló: no entró nada a su stock"', /La recepción en Dolce Pasta se anuló: no entró nada a su stock\./.test(recepcionHtml(cuerpo(S))))
  }))
}
{
  const S = nuevo()
  preparar(S, { recepciones: [] })
  esperas.push(S.abrirOrden('o1').then(() => {
    const h = recepcionHtml(cuerpo(S))
    chk('sin la recepción a la vista: dice quién es y que con su usuario no se ve', /Es Dolce Pasta, otra empresa del grupo\. Con tu usuario no se ve si ya la recibieron/.test(h), h)
    chk('…sin color de estado', !/ad-recepcion--/.test(h))
  }))
}
{
  const S = nuevo()
  preparar(S, { error: { message: 'sin red' } })
  esperas.push(S.abrirOrden('o1').then(() => {
    chk('si falla la lectura: "No se pudo saber si ya la recibieron" (y la orden se ve igual)', /No se pudo saber si ya la recibieron\./.test(cuerpo(S)) && /Cucurucho grande/.test(cuerpo(S)))
  }))
}
{
  const S = nuevo()
  preparar(S, { orden: { ...ORDEN, cliente_id: 'c1', codigo: 'N-0042' } })
  esperas.push(S.abrirOrden('o1').then(() => {
    chk('una orden común no lee recepciones ni muestra nada', !S.__llamadas.rpc.some(([n]) => n === 'recepciones_grupo') && !/ad-recepcion/.test(cuerpo(S)) && S.estado.orden.recepcion === null)
  }))
}

// ── Escape: todo lo que viene de la base ───────────────────────────────────
{
  const S = nuevo()
  const malo = { ...RECIBIDA, destino: marca('destino'), recibida_por: marca('recibio'),
    items: [{ item_id: 'x', tipo: 'insumo', descripcion: marca('descripcion'), unidad: 'kg', lote: marca('lote'), cantidad_enviada: 5, cantidad_recibida: 4, motivo_diferencia: marca('motivo') }] }
  const h = S.htmlRecepcionOrden({ recepcion: malo }, marca('recibe'))
  chequearMarcas(chk, 'la recepción recibida', h, ['recibio', 'descripcion', 'lote', 'motivo'])
  chequearMarcas(chk, 'la recepción en tránsito', S.htmlRecepcionOrden({ recepcion: { ...malo, estado: 'en_transito' } }, 'x'), ['destino'])
  chequearMarcas(chk, 'sin datos', S.htmlRecepcionOrden({ recepcion: { sinDato: true } }, marca('recibe')), ['recibe'])
  chequearMarcas(chk, 'el estado en el atributo', S.htmlRecepcionOrden({ recepcion: { ...malo, estado: marca('estado') } }, 'x'), ['estado'])
}

fin()
