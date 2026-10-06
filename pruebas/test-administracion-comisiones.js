// ADMINISTRACIÓN — la COMISIÓN de una orden de retiro (06/10/2026).
//
// Una orden valorizada puede llevar una comisión: un porcentaje del total
// (sugiere la comisión habitual del cliente), un monto fijo o "sin comisión".
// La carga cargar_comision_orden(p_orden_id, p_modo, p_valor): la base
// calcula el importe y la orden pasa a mostrar Subtotal, Comisión y Total.
// Esta suite fija:
//  - EL CÁLCULO, igual que la base: round(total * p / 100, 2) o round(monto, 2);
//    el total es subtotal + comisión; "Sin comisión" manda 'ninguna' y valor null.
//  - LAS REGLAS de la base, con sus textos (0 < % <= 100, monto > 0), antes de mandar.
//  - EL PERMISO: retiros:precios en la empresa de la orden O cobranzas:procesar.
//  - EL ERROR de la base TAL CUAL, pegado al botón; un doble toque manda UNA vez.
//  - EL FILTRO "Con comisión sin cargar": solo las valorizadas, sin comisión,
//    de clientes con comisión habitual; y no convive con "sin valorizar".
//  - LA FICHA: "Comisión habitual (%)", y que si la base no la guarda
//    (guardar_ficha_cliente ignora la clave) se DICE, nunca "Ficha guardada".
//  - LA HOJA impresa NO la muestra (dato interno).
//  - XSS de lo nuevo.
//
//   node pruebas/test-administracion-comisiones.js

const path = require('path')
const fs = require('fs')
const { construirAdministracion } = require('./sandbox-administracion')
const { arnes, marca, chequearMarcas } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/administracion.html')
const src = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${src.length} bytes)`)
const { chk, esperas, fin } = arnes()
const nuevo = () => construirAdministracion(ARCHIVO)

const CLIENTES = [
  { id: 'c1', nombre: 'Distribuidora Anatolia', razon_social: 'ANATOLIA SRL', lista_precio_id: 'l1', limite_credito: 100000, activo: true, comision_habitual: 5 },
  { id: 'c2', nombre: 'Kiosco Pepe', razon_social: null, lista_precio_id: null, limite_credito: null, activo: true, comision_habitual: null },
  { id: 'c3', nombre: 'Heladería Cero', razon_social: null, lista_precio_id: null, limite_credito: null, activo: true, comision_habitual: 0 },
]
const CAT = {
  productos: [{ id: 'p1', nombre: 'Cucurucho grande' }],
  presentaciones: [{ id: 'pr1', producto_id: 'p1', nombre: 'Caja x 100', con_cono: false, unidades_por_caja: 100 }],
  marcas: [], insumos: [],
}
const ORDEN = { id: 'o1', numero: 13, codigo: 'N-0013', unidad_negocio_id: 'u-n', fecha: '2026-09-26', estado: 'confirmada', estado_valorizacion: 'valorizada',
  total: 642410, moneda: 'ARS', cliente_id: 'c1', cargada_por: 'emp-9', cargada_en: '2026-09-26T17:32:00Z', transporte: null, observaciones: null,
  comision_modo: null, comision_valor: null, comision_importe: null, comision_factura_id: null }
const ITEMS = [{ id: 'i1', orden: 1, presentacion_id: 'pr1', marca_id: null, cajas: 10, unidades: 1000, precio_caja: 64241, subtotal: 642410, lote: null }]

function preparar(S, { orden = ORDEN, items = ITEMS } = {}) {
  S.estado.clientes = CLIENTES
  S.estado.catalogo = CAT
  S.estado.catalogoEmpresa = 'u-n'
  S.__tablas.ordenes_retiro = [orden]
  S.__tablas.orden_retiro_items = items
  S.__tablas.v_empleados_publico = [{ id: 'emp-9', nombre: 'Emanuel Romero' }]
}
const cuerpo = (S) => S.__els.get('ad-orden-cuerpo').innerHTML

// ── El cálculo: el mismo de la base ─────────────────────────────────────────
{
  const S = nuevo()
  chk('5 % de 642.410 = 32.120,50', S.importeComision(642410, 'porcentaje', 5) === 32120.5)
  chk('5,5 % de 100.000,10 redondea como la base (5.500,01)', S.importeComision(100000.10, 'porcentaje', 5.5) === 5500.01)
  chk('1,005 % de 1.000 = 10,05 (sin error de coma flotante)', S.importeComision(1000, 'porcentaje', 1.005) === 10.05)
  chk('100 % se acepta', S.importeComision(1000, 'porcentaje', 100) === 1000)
  chk('más de 100 % no sirve', S.importeComision(1000, 'porcentaje', 100.01) === null)
  chk('0 % no sirve (la base exige > 0)', S.importeComision(1000, 'porcentaje', 0) === null)
  chk('un porcentaje negativo no sirve', S.importeComision(1000, 'porcentaje', -5) === null)
  chk('un porcentaje vacío no sirve (no es 0)', S.importeComision(1000, 'porcentaje', null) === null && S.importeComision(1000, 'porcentaje', '') === null)
  chk('sin total no hay porcentaje (nunca "$\u00a00")', S.importeComision(null, 'porcentaje', 5) === null)
  chk('monto fijo: redondeado a 2 decimales', S.importeComision(642410, 'monto', 1234.567) === 1234.57)
  chk('monto fijo no depende del total', S.importeComision(null, 'monto', 2500) === 2500)
  chk('monto 0 no sirve', S.importeComision(1000, 'monto', 0) === null)
  chk('sin comisión = 0', S.importeComision(642410, 'ninguna', 5) === 0)
  chk('un modo que no existe no calcula', S.importeComision(1000, 'otro', 5) === null)
  chk('el total con comisión es subtotal + comisión', S.totalConComision(642410, 32120.5) === 674530.5)
  chk('el total con comisión, en centavos (0,1 + 0,2)', S.totalConComision(0.1, 0.2) === 0.3)
  chk('sin comisión el total no cambia', S.totalConComision(642410, 0) === 642410)
  chk('un dato ausente no inventa un total', S.totalConComision(null, 5) === null && S.totalConComision(5, null) === null)
}

// ── Las reglas, con los textos de la base ──────────────────────────────────
{
  const S = nuevo()
  chk('sin modo: el texto de la base', S.validarComision(null, 5) === 'Elegí porcentaje, monto o sin comisión.')
  chk('porcentaje fuera de rango: el texto de la base', S.validarComision('porcentaje', 101) === 'El porcentaje va de 0 a 100.' && S.validarComision('porcentaje', null) === 'El porcentaje va de 0 a 100.')
  chk('monto 0: el texto de la base', S.validarComision('monto', 0) === 'El monto tiene que ser mayor a cero.')
  chk('lo que sirve no tiene error', S.validarComision('porcentaje', 5) === null && S.validarComision('monto', 10) === null && S.validarComision('ninguna', null) === null)
}

// ── El texto del cálculo, ANTES de guardar ─────────────────────────────────
{
  const S = nuevo()
  chk('porcentaje: dice el cálculo y el total', S.textoCalculoComision(642410, 'porcentaje', 5) === '5 % de $\u00a0642.410,00 = $\u00a032.120,50 · Total con comisión $\u00a0674.530,50',
    S.textoCalculoComision(642410, 'porcentaje', 5))
  chk('monto: dice la comisión y el total', S.textoCalculoComision(642410, 'monto', 1000) === 'Comisión $\u00a01.000,00 · Total con comisión $\u00a0643.410,00')
  chk('sin comisión: el total queda igual', S.textoCalculoComision(642410, 'ninguna', null) === 'Sin comisión: el total queda en $\u00a0642.410,00.')
  chk('un porcentaje que no sirve lo pide', S.textoCalculoComision(642410, 'porcentaje', 200) === 'Escribí un porcentaje mayor a 0 y hasta 100.')
  chk('sin modo lo pide', S.textoCalculoComision(642410, null, null) === 'Elegí cómo se calcula la comisión.')
}

// ── Lo que va a la base ─────────────────────────────────────────────────────
{
  const S = nuevo()
  chk('porcentaje: p_modo y p_valor', JSON.stringify(S.parametrosComision({ orden: ORDEN, comision: { modo: 'porcentaje', valor: 5 } })) === JSON.stringify({ p_orden_id: 'o1', p_modo: 'porcentaje', p_valor: 5 }))
  chk('"Sin comisión" manda ninguna con el valor en null (aunque haya quedado uno escrito)',
    JSON.stringify(S.parametrosComision({ orden: ORDEN, comision: { modo: 'ninguna', valor: 7 } })) === JSON.stringify({ p_orden_id: 'o1', p_modo: 'ninguna', p_valor: null }))
}

// ── El filtro "Con comisión sin cargar" ─────────────────────────────────────
const ORDENES_FILTRO = [
  { ...ORDEN, id: 'a', cliente_id: 'c1' },                                              // sí
  { ...ORDEN, id: 'b', cliente_id: 'c2' },                                              // sin habitual
  { ...ORDEN, id: 'c', cliente_id: 'c3' },                                              // habitual 0
  { ...ORDEN, id: 'd', cliente_id: 'c1', comision_modo: 'porcentaje', comision_importe: 1 }, // ya cargada
  { ...ORDEN, id: 'e', cliente_id: 'c1', comision_modo: 'ninguna', comision_importe: 0 },    // "sin comisión" ya decidido
  { ...ORDEN, id: 'f', cliente_id: 'c1', estado_valorizacion: 'pendiente' },            // sin valorizar
  { ...ORDEN, id: 'g', cliente_id: 'c1', estado: 'anulada' },                           // anulada
  { ...ORDEN, id: 'h', cliente_id: 'cx' },                                              // cliente que no está
]
{
  const S = nuevo()
  const ids = S.ordenesComisionSinCargar(ORDENES_FILTRO, CLIENTES).map(o => o.id)
  chk('el filtro trae SOLO las valorizadas, sin comisión, de clientes con habitual', JSON.stringify(ids) === '["a"]', JSON.stringify(ids))
  chk('la comisión habitual: un número > 0 o null', S.comisionHabitualDe(CLIENTES[0]) === 5 && S.comisionHabitualDe(CLIENTES[1]) === null && S.comisionHabitualDe(CLIENTES[2]) === null && S.comisionHabitualDe(null) === null)
}
{
  const S = nuevo()
  preparar(S)
  S.__tablas.ordenes_retiro = ORDENES_FILTRO
  S.__tablas.orden_retiro_items = []
  S.estado.filtros.sinComision = true
  esperas.push(S.cargarOrdenes().then(() => {
    const q = S.__llamadas.consultas.find(c => c[0] === 'ordenes_retiro')
    const f = q[1]
    chk('la consulta pide las valorizadas y confirmadas', f.some(x => x[0] === 'eq' && x[1] === 'estado_valorizacion' && x[2] === 'valorizada') && f.some(x => x[0] === 'eq' && x[1] === 'estado' && x[2] === 'confirmada'))
    chk('y las que no tienen comisión (is null)', f.some(x => x[0] === 'is' && x[1] === 'comision_modo' && x[2] === null))
    chk('el select trae la comisión', f.some(x => x[0] === 'select' && /comision_modo/.test(x[1]) && /comision_importe/.test(x[1])))
    chk('la lista queda con las que corresponden', JSON.stringify(S.estado.ordenes.map(o => o.id)) === '["a"]', JSON.stringify(S.estado.ordenes.map(o => o.id)))
    chk('la fila dice "Comisión sin cargar"', /Comisión sin cargar/.test(S.__els.get('ad-ordenes-lista').innerHTML))
  }))
}
{
  const S = nuevo()
  preparar(S)
  S.estado.clientes = null
  S.estado.filtros.sinComision = true
  esperas.push(S.leerOrdenes('u-n', S.estado.filtros, null).then(() => chk('sin la lista de clientes el filtro no inventa', false), () => chk('sin la lista de clientes el filtro no inventa: falla', true)))
}
{
  const S = nuevo()
  preparar(S)
  S.__tablas.ordenes_retiro = ORDENES_FILTRO
  const el = (id) => S.__doc.getElementById(id)
  el('ad-filtro-sin-valorizar').checked = true
  el('ad-filtro-comision').checked = true
  S.leerFiltros('ad-filtro-comision')
  chk('tildar "Con comisión sin cargar" saca "sin valorizar"', S.estado.filtros.sinComision === true && S.estado.filtros.sinValorizar === false && el('ad-filtro-sin-valorizar').checked === false)
  el('ad-filtro-sin-valorizar').checked = true
  S.leerFiltros('ad-filtro-sin-valorizar')
  chk('y al revés', S.estado.filtros.sinValorizar === true && S.estado.filtros.sinComision === false)
}
{
  const S = nuevo()
  preparar(S)
  const fila = S.htmlFilaOrden({ ...ORDEN, cajas: 10, insumos: 0, comision_modo: 'porcentaje', comision_importe: 32120.5 })
  chk('con la comisión cargada, la fila dice el total con comisión', /\$\s674\.530,50/.test(fila) && !/Comisión sin cargar/.test(fila))
  const anulada = S.htmlFilaOrden({ ...ORDEN, estado: 'anulada', cajas: 10, insumos: 0, comision_modo: 'porcentaje', comision_importe: 32120.5 })
  chk('una anulada no suma la comisión (la base la saca)', /\$\s642\.410,00/.test(anulada))
}

// ── El detalle de la orden ─────────────────────────────────────────────────
{
  const S = nuevo()
  preparar(S)
  esperas.push(S.abrirOrden('o1').then(() => {
    const h = cuerpo(S)
    chk('el select de la orden trae la comisión', S.__llamadas.consultas.some(c => c[0] === 'ordenes_retiro' && c[1].some(x => x[0] === 'select' && /comision_valor/.test(x[1]) && /comision_factura_id/.test(x[1]))))
    chk('sin cargar: el total y "Comisión: sin cargar" con la habitual', /Total \$\s642\.410,00/.test(h) && /Comisión: sin cargar \(la habitual de este cliente es 5 %\)/.test(h))
    chk('con retiros:precios: "Cargar comisión"', /id="ad-btn-comision">Cargar comisión</.test(h))
  }))
}
{
  const S = nuevo()
  preparar(S)
  S.estado.misTareas = new Map([['retiros:ver', { unidades: ['u-n'] }]])
  esperas.push(S.abrirOrden('o1').then(() => {
    chk('solo con ver: se ve la comisión pero no el botón', /Comisión: sin cargar/.test(cuerpo(S)) && !/ad-btn-comision/.test(cuerpo(S)))
  }))
}
{
  const S = nuevo()
  preparar(S)
  S.estado.misTareas = new Map([['retiros:ver', { unidades: ['u-n'] }], ['cobranzas:procesar', null]])
  esperas.push(S.abrirOrden('o1').then(() => chk('con cobranzas:procesar también se carga (la regla de la base)', /ad-btn-comision/.test(cuerpo(S)))))
}
{
  const S = nuevo()
  preparar(S)
  S.estado.misTareas = new Map([['retiros:ver', { todas: true }], ['retiros:precios', { unidades: ['u-d'] }]])
  esperas.push(S.abrirOrden('o1').then(() => chk('con precios en OTRA empresa, no', !/ad-btn-comision/.test(cuerpo(S)))))
}
{
  const S = nuevo()
  preparar(S, { orden: { ...ORDEN, estado_valorizacion: 'pendiente', total: 0 } })
  esperas.push(S.abrirOrden('o1').then(() => chk('sin valorizar no hay comisión', !/Comisión/.test(cuerpo(S)))))
}
{
  const S = nuevo()
  preparar(S, { orden: { ...ORDEN, estado: 'anulada', comision_modo: 'porcentaje', comision_valor: 5, comision_importe: 32120.5 } })
  esperas.push(S.abrirOrden('o1').then(() => chk('anulada: el total a secas y sin botón', /Total \$\s642\.410,00/.test(cuerpo(S)) && !/ad-btn-comision/.test(cuerpo(S)) && !/Subtotal/.test(cuerpo(S)))))
}
{
  const S = nuevo()
  preparar(S, { orden: { ...ORDEN, comision_modo: 'porcentaje', comision_valor: 5, comision_importe: 32120.5 } })
  esperas.push(S.abrirOrden('o1').then(() => {
    const h = cuerpo(S)
    chk('cargada: Subtotal, Comisión 5 % y Total', /Subtotal<\/span><span>\$\s642\.410,00/.test(h) && /Comisión 5 %<\/span><span>\$\s32\.120,50/.test(h) && /Total \$\s674\.530,50/.test(h))
    chk('y el botón dice "Cambiar comisión"', /id="ad-btn-comision">Cambiar comisión</.test(h))
    chk('al día: sin aviso de recalcular', !/La valorización cambió/.test(h))
  }))
}
{
  const S = nuevo()
  preparar(S, { orden: { ...ORDEN, comision_modo: 'monto', comision_valor: 1000, comision_importe: 1000 } })
  esperas.push(S.abrirOrden('o1').then(() => chk('monto fijo: "Comisión (monto fijo)"', /Comisión \(monto fijo\)<\/span><span>\$\s1\.000,00/.test(cuerpo(S)) && /Total \$\s643\.410,00/.test(cuerpo(S)))))
}
{
  const S = nuevo()
  preparar(S, { orden: { ...ORDEN, comision_modo: 'ninguna', comision_valor: null, comision_importe: 0 } })
  esperas.push(S.abrirOrden('o1').then(() => chk('"sin comisión" ya decidido lo dice', /Comisión: sin comisión/.test(cuerpo(S)) && /Cambiar comisión/.test(cuerpo(S)))))
}
{
  const S = nuevo()
  // Se corrigió la valorización después: el 5 % ya no da lo guardado.
  preparar(S, { orden: { ...ORDEN, total: 700000, comision_modo: 'porcentaje', comision_valor: 5, comision_importe: 32120.5 } })
  esperas.push(S.abrirOrden('o1').then(() => chk('un porcentaje que ya no cierra con el total avisa', /La valorización cambió después de cargar la comisión/.test(cuerpo(S)))))
  chk('comisionDesactualizada: monto fijo nunca', S.comisionDesactualizada({ total: 1, comision_modo: 'monto', comision_valor: 5, comision_importe: 5 }) === false)
}

// ── El panel: abrir, elegir, guardar ───────────────────────────────────────
{
  const S = nuevo()
  preparar(S)
  esperas.push(S.abrirOrden('o1').then(() => {
    S.abrirComision()
    const c = S.estado.orden.comision
    chk('abre con el porcentaje habitual del cliente', c.modo === 'porcentaje' && c.valor === 5)
    const h = cuerpo(S)
    chk('el panel muestra el cálculo antes de guardar', /5 % de \$\s642\.410,00 = \$\s32\.120,50 · Total con comisión \$\s674\.530,50/.test(h))
    chk('el segmento con el modo elegido', /data-comision-modo="porcentaje" aria-pressed="true"/.test(h) && /data-comision-modo="monto" aria-pressed="false"/.test(h))
    chk('mientras está abierto, el botón de abrir no está', !/id="ad-btn-comision"/.test(h))
    S.elegirModoComision('monto')
    chk('cambiar a monto VACÍA el valor (un 5 % no pasa a ser $\u00a05)', c.modo === 'monto' && c.valor === null)
    S.elegirModoComision('porcentaje')
    chk('volver a porcentaje propone la habitual', c.valor === 5)
    S.cambiarValorComision(10)
    chk('tipear recalcula la línea sin redibujar', S.__els.get('ad-comision-calculo').textContent === '10 % de $\u00a0642.410,00 = $\u00a064.241,00 · Total con comisión $\u00a0706.651,00')
    S.cancelarComision()
    chk('cancelar cierra el panel', S.estado.orden.comision === null)
  }))
}
{
  const S = nuevo()
  preparar(S, { orden: { ...ORDEN, cliente_id: 'c2' } })
  esperas.push(S.abrirOrden('o1').then(() => {
    S.abrirComision()
    chk('sin habitual NO se elige nada solo', S.estado.orden.comision.modo === null && S.estado.orden.comision.valor === null)
  }))
}
{
  const S = nuevo()
  preparar(S, { orden: { ...ORDEN, comision_modo: 'monto', comision_valor: 1500, comision_importe: 1500 } })
  esperas.push(S.abrirOrden('o1').then(() => {
    S.abrirComision()
    chk('cambiar arranca de lo que tenía la orden', S.estado.orden.comision.modo === 'monto' && S.estado.orden.comision.valor === 1500)
  }))
}
{
  // Guardar: una sola llamada aunque se toque dos veces.
  const S = nuevo()
  preparar(S)
  // TODOS los que esperan se sueltan (con uno solo, una segunda llamada dejaría
  // la primera colgada y la suite terminaría sin decir nada).
  const esperando = []
  S.__setRpc((n) => n === 'cargar_comision_orden'
    ? new Promise(r => { esperando.push(() => r({ data: { comision_importe: 32120.5, total_con_comision: 674530.5, factura_pendiente_id: 'f1' }, error: null })) })
    : { data: null, error: null })
  esperas.push(S.abrirOrden('o1').then(async () => {
    S.abrirComision()
    const p1 = S.guardarComision()
    const p2 = S.guardarComision()
    chk('mientras manda: "Guardando…" y el botón trabado', /id="ad-comision-guardar" disabled>Guardando…/.test(cuerpo(S)))
    for (const s of esperando) s()
    await Promise.race([Promise.all([p1, p2]), new Promise((_, no) => setTimeout(() => no(new Error('guardarComision quedó colgada')), 3000))])
    const llamadas = S.__llamadas.rpc.filter(r => r[0] === 'cargar_comision_orden')
    chk('doble toque: UNA sola llamada', llamadas.length === 1, llamadas.length)
    chk('con los parámetros de la base', JSON.stringify(llamadas[0][1]) === JSON.stringify({ p_orden_id: 'o1', p_modo: 'porcentaje', p_valor: 5 }))
    chk('el aviso dice la comisión y el total', S.__llamadas.exitos.includes('Comisión de la orden N-0013: $\u00a032.120,50. Total $\u00a0674.530,50.'), JSON.stringify(S.__llamadas.exitos))
    chk('y la orden se vuelve a leer', S.__llamadas.consultas.filter(c => c[0] === 'ordenes_retiro').length >= 2 && S.estado.orden.comision === null)
  }))
}
{
  const S = nuevo()
  preparar(S)
  esperas.push(S.abrirOrden('o1').then(async () => {
    S.abrirComision()
    S.elegirModoComision('ninguna')
    await S.guardarComision()
    const r = S.__llamadas.rpc.find(x => x[0] === 'cargar_comision_orden')
    chk('"Sin comisión" manda ninguna y null', r && r[1].p_modo === 'ninguna' && r[1].p_valor === null)
    chk('y lo dice', S.__llamadas.exitos.includes('Orden N-0013: sin comisión.'))
  }))
}
{
  const S = nuevo()
  preparar(S, { orden: { ...ORDEN, cliente_id: 'c2' } })
  esperas.push(S.abrirOrden('o1').then(async () => {
    S.abrirComision()
    await S.guardarComision()
    chk('sin modo no se manda nada y se dice', !S.__llamadas.rpc.some(x => x[0] === 'cargar_comision_orden') && /Elegí porcentaje, monto o sin comisión\./.test(cuerpo(S)))
    S.elegirModoComision('porcentaje')
    S.cambiarValorComision(150)
    await S.guardarComision()
    chk('un porcentaje de más no se manda', !S.__llamadas.rpc.some(x => x[0] === 'cargar_comision_orden') && /El porcentaje va de 0 a 100\./.test(cuerpo(S)))
  }))
}
{
  const S = nuevo()
  preparar(S, { orden: { ...ORDEN, comision_modo: 'porcentaje', comision_valor: 5, comision_importe: 32120.5, comision_factura_id: 'f1' } })
  S.__setRpc((n) => n === 'cargar_comision_orden' ? { data: null, error: { message: 'La comisión de esta orden ya tiene pagos: no se puede cambiar.' } } : { data: null, error: null })
  esperas.push(S.abrirOrden('o1').then(async () => {
    S.abrirComision()
    S.cambiarValorComision(7)
    await S.guardarComision()
    const h = cuerpo(S)
    chk('el error de la base va TAL CUAL, pegado al botón', /<p class="ad-error-pegado" id="ad-comision-error">La comisión de esta orden ya tiene pagos: no se puede cambiar\.<\/p>/.test(h))
    chk('y el panel sigue abierto, el botón se puede volver a tocar', S.estado.orden.comision && !S.estado.orden.comision.enviando && S.estado.trabajando === false)
  }))
}

// ── La hoja impresa NO muestra la comisión ─────────────────────────────────
{
  const S = nuevo()
  preparar(S, { orden: { ...ORDEN, comision_modo: 'porcentaje', comision_valor: 5, comision_importe: 32120.5 } })
  esperas.push(S.abrirOrden('o1').then(() => {
    const hoja = S.htmlHoja(S.ordenParaHoja(S.estado.orden), { conPrecios: true })
    chk('la hoja con precios no dice "Comisión" ni el total con comisión', !/omisi/.test(hoja) && !/674\.530/.test(hoja) && /642\.410/.test(hoja))
    chk('el texto para compartir tampoco', !/omisi/.test(S.textoOrden(S.ordenParaHoja(S.estado.orden))))
  }))
}

// ── La cuenta del cliente ──────────────────────────────────────────────────
{
  const S = nuevo()
  chk('el movimiento "comision" se llama "Comisión"', S.ETIQUETA_MOVIMIENTO.comision === 'Comisión')
  const d = S.detalleMovimiento({ orden_retiro_id: 'o1', detalle: 'Orden de retiro N-0013 · Comisión orden N° 13 (5%)' }, new Map([['o1', 'N-0013']]))
  chk('el detalle de la comisión dice el código y no el número', d === 'Orden de retiro N-0013 · Comisión (5%)', d)
  const r = S.detalleMovimiento({ orden_retiro_id: 'o1', detalle: 'Orden de retiro N-0013' }, new Map([['o1', 'N-0013']]))
  chk('con el código que ya manda la base, el código sale UNA vez', r === 'Orden de retiro N-0013', r)
}

// ── La ficha: "Comisión habitual (%)" ──────────────────────────────────────
{
  const S = nuevo()
  chk('la ficha tiene la comisión habitual como porcentaje', S.CAMPOS_FICHA.some(([c, t]) => c === 'comision_habitual' && t === 'porcentaje'))
  chk('el campo está en el HTML con su rótulo', /<label for="ad-f-comision_habitual">Comisión habitual \(%\)<\/label><input type="text" class="ad-input" id="ad-f-comision_habitual" data-ficha="comision_habitual"/.test(src))
  chk('cambiarla manda solo esa clave', JSON.stringify(S.cambiosFicha({ comision_habitual: 5 }, { comision_habitual: 7.5 })) === JSON.stringify({ comision_habitual: '7.5' }))
  chk('borrarla manda ""', JSON.stringify(S.cambiosFicha({ comision_habitual: 5 }, { comision_habitual: null })) === JSON.stringify({ comision_habitual: '' }))
  chk('5 y 5,00 son lo mismo', JSON.stringify(S.cambiosFicha({ comision_habitual: '5.00' }, { comision_habitual: 5 })) === '{}')
  chk('guardada: igual al centavo', S.comisionHabitualGuardada('7.5', 7.5) && S.comisionHabitualGuardada('', null) && !S.comisionHabitualGuardada('7.5', null) && !S.comisionHabitualGuardada('', 5))
}
function prepararFicha(S, guardada) {
  S.estado.empresaId = 'u-n'
  S.estado.listas = { unidad: 'u-n', filas: [] }
  S.estado.proveedores = []
  const original = { id: 'c1', nombre: 'Distribuidora Anatolia', comision_habitual: null, unidad_negocio_id: 'u-n', apodos: [] }
  S.estado.ficha = { id: 'c1', original, proveedorId: null, busquedaProveedor: '', error: null }
  for (const [clave, tipo] of S.CAMPOS_FICHA) {
    const v = original[clave]
    S.__doc.getElementById('ad-f-' + clave).value = v === null || v === undefined ? '' : String(v)
  }
  S.__tablas.clientes = [{ ...original, comision_habitual: guardada }]
}
{
  // La base de hoy IGNORA la clave: se dice, no "Ficha guardada".
  const S = nuevo()
  prepararFicha(S, null)
  S.__doc.getElementById('ad-f-comision_habitual').value = '5'
  esperas.push(S.guardarFicha().then(() => {
    const r = S.__llamadas.rpc.find(x => x[0] === 'guardar_ficha_cliente')
    chk('manda comision_habitual a guardar_ficha_cliente', r && r[1].p_datos.comision_habitual === '5', JSON.stringify(r?.[1]))
    chk('si la base no la guardó, NO dice "Ficha guardada"', !S.__llamadas.exitos.includes('Ficha guardada.'))
    chk('y lo dice pegado al botón', S.estado.ficha.error === 'La comisión habitual NO se guardó: la base todavía no la guarda. Avisale a administración.' && S.__els.get('ad-ficha-error').hidden === false)
    chk('el campo vuelve a lo que tiene la base', S.__els.get('ad-f-comision_habitual').value === '' && S.estado.trabajando === false)
  }))
}
{
  const S = nuevo()
  prepararFicha(S, null)
  S.__doc.getElementById('ad-f-comision_habitual').value = '5'
  S.__doc.getElementById('ad-f-localidad').value = 'Córdoba'
  esperas.push(S.guardarFicha().then(() => chk('con otros datos: "Se guardó la ficha, MENOS la comisión habitual"', /^Se guardó la ficha, MENOS la comisión habitual/.test(S.estado.ficha.error ?? ''))))
}
{
  // Cuando la base la guarde, anda sola.
  const S = nuevo()
  prepararFicha(S, 5)
  S.__doc.getElementById('ad-f-comision_habitual').value = '5'
  esperas.push(S.guardarFicha().then(() => chk('si la base la guardó: "Ficha guardada."', S.__llamadas.exitos.includes('Ficha guardada.'))))
}
{
  const S = nuevo()
  prepararFicha(S, null)
  S.__doc.getElementById('ad-f-comision_habitual').value = '120'
  esperas.push(S.guardarFicha().then(() => chk('más de 100 % no se manda', !S.__llamadas.rpc.some(x => x[0] === 'guardar_ficha_cliente') && S.estado.ficha.error === 'La comisión habitual va de 0 a 100 %.')))
}

// ── XSS de lo nuevo ────────────────────────────────────────────────────────
{
  const S = nuevo()
  S.estado.clientes = CLIENTES
  const d = { orden: { ...ORDEN, moneda: marca('moneda') }, items: [], comision: { modo: 'porcentaje', valor: 5, habitual: 5, error: marca('error-comision'), enviando: false } }
  chequearMarcas(chk, 'panel de la comisión', S.htmlComisionOrden(d), ['error-comision'])
  const S2 = nuevo()
  S2.estado.clientes = [{ ...CLIENTES[0], comision_habitual: marca('habitual') }]
  const h2 = S2.htmlComisionOrden({ orden: ORDEN, items: [], comision: null })
  chk('una comisión habitual con HTML no entra cruda', !/<b data-xss=/.test(h2))
  const h3 = S2.htmlFilaOrden({ ...ORDEN, cajas: 1, insumos: 0, codigo: marca('codigo-com'), comision_modo: 'porcentaje', comision_importe: 5 })
  chequearMarcas(chk, 'fila de orden con comisión', h3, ['codigo-com'])
}

fin()
