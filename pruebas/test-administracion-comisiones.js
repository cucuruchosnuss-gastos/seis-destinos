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
// DESDE EL 28/10/2026 LA COMISIÓN COMÚN SALIÓ DEL FLUJO (las comisiones van
// por vendedor en el N1, ver test-administracion-valorizar-con-division.js):
// ni "Comisión: sin cargar", ni "Cargar / Cambiar comisión", ni el panel, ni
// el filtro ni el sello del listado. Una orden que YA tenía una cargada la
// sigue mostrando (Subtotal, Comisión y Total). El cálculo y las reglas
// (las funciones quedan, sin uso) se siguen fijando.
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
    chk('la fila ya NO dice "Comisión sin cargar" (28/10/2026)', !/Comisión sin cargar/.test(S.__els.get('ad-ordenes-lista').innerHTML))
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
  chk('el filtro "Con comisión sin cargar" ya no está en la pantalla (28/10/2026)', !/id="ad-filtro-comision"/.test(src) && !/> Con comisión sin cargar</.test(src))
  S.estado.filtros.sinComision = true
  el('ad-filtro-sin-valorizar').checked = true
  S.leerFiltros('ad-filtro-sin-valorizar')
  chk('leerFiltros lo deja siempre apagado', S.estado.filtros.sinComision === false && S.estado.filtros.sinValorizar === true)
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
    chk('sin cargar: el total, SIN "Comisión: sin cargar" (28/10/2026)', /Total \$\s642\.410,00/.test(h) && !/sin cargar/.test(h) && !/Comisión/.test(h))
    chk('con retiros:precios: SIN "Cargar comisión" (salió del flujo)', !/ad-btn-comision/.test(h) && !/Cargar comisión/.test(h))
  }))
}
{
  const S = nuevo()
  preparar(S)
  S.estado.misTareas = new Map([['retiros:ver', { unidades: ['u-n'] }]])
  esperas.push(S.abrirOrden('o1').then(() => {
    chk('solo con ver: el total, sin "Comisión" ni el botón', /Total \$\s642\.410,00/.test(cuerpo(S)) && !/Comisión/.test(cuerpo(S)) && !/ad-btn-comision/.test(cuerpo(S)))
  }))
}
{
  const S = nuevo()
  preparar(S)
  S.estado.misTareas = new Map([['retiros:ver', { unidades: ['u-n'] }], ['cobranzas:procesar', null]])
  esperas.push(S.abrirOrden('o1').then(() => chk('con cobranzas:procesar tampoco aparece el botón (28/10/2026)', !/ad-btn-comision/.test(cuerpo(S)))))
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
    chk('una ya cargada se sigue viendo, pero sin "Cambiar comisión"', !/ad-btn-comision/.test(h) && !/Cambiar comisión/.test(h))
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
  esperas.push(S.abrirOrden('o1').then(() => chk('"sin comisión" ya decidido: solo el total', /Total \$\s642\.410,00/.test(cuerpo(S)) && !/Comisión/.test(cuerpo(S)))))
}
{
  const S = nuevo()
  // Se corrigió la valorización después: el 5 % ya no da lo guardado.
  preparar(S, { orden: { ...ORDEN, total: 700000, comision_modo: 'porcentaje', comision_valor: 5, comision_importe: 32120.5 } })
  esperas.push(S.abrirOrden('o1').then(() => chk('un porcentaje que ya no cierra con el total: sin el aviso de volver a cargarla (ya no se carga)', !/La valorización cambió después de cargar la comisión/.test(cuerpo(S)) && /Subtotal/.test(cuerpo(S)))))
  chk('comisionDesactualizada: monto fijo nunca', S.comisionDesactualizada({ total: 1, comision_modo: 'monto', comision_valor: 5, comision_importe: 5 }) === false)
}

// ── El panel ya no aparece (28/10/2026) ────────────────────────────────────
{
  const S = nuevo()
  preparar(S)
  esperas.push(S.abrirOrden('o1').then(() => {
    // Aunque algo deje el panel "abierto", la orden no lo dibuja.
    S.estado.orden.comision = { modo: 'porcentaje', valor: 5, habitual: 5, error: null, enviando: false }
    S.pintarOrden()
    const h = cuerpo(S)
    chk('el panel de la comisión no se dibuja', !/ad-comision-panel/.test(h) && !/data-comision-modo/.test(h) && !/ad-comision-guardar/.test(h))
    chk('ni se escucha el botón en el detalle', !/'#ad-btn-comision'/.test(src) && !/'#ad-comision-guardar'/.test(src))
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
  // La orden interna (27/10/2026): código N-I-0007.
  const ri = S.detalleMovimiento({ orden_retiro_id: 'o1', detalle: 'Orden de retiro N-I-0007' }, new Map([['o1', 'N-I-0007']]))
  chk('con el código de una orden interna, el código sale UNA vez', ri === 'Orden de retiro N-I-0007', ri)
}

// ── La ficha: "Comisión habitual (%)" ──────────────────────────────────────
{
  const S = nuevo()
  chk('la ficha tiene la comisión habitual como porcentaje', S.CAMPOS_FICHA.some(([c, t]) => c === 'comision_habitual' && t === 'porcentaje'))
  chk('el campo está en el HTML con su rótulo', /<label for="ad-f-comision_habitual">Comisión habitual \(%\)<\/label><input type="text" class="ad-input" id="ad-f-comision_habitual" data-ficha="comision_habitual"/.test(src))
  chk('cambiarla manda solo esa clave', JSON.stringify(S.cambiosFicha({ comision_habitual: 5 }, { comision_habitual: 7.5 })) === JSON.stringify({ comision_habitual: '7.5' }))
  chk('borrarla manda ""', JSON.stringify(S.cambiosFicha({ comision_habitual: 5 }, { comision_habitual: null })) === JSON.stringify({ comision_habitual: '' }))
  chk('5 y 5,00 son lo mismo', JSON.stringify(S.cambiosFicha({ comision_habitual: '5.00' }, { comision_habitual: 5 })) === '{}')
  chk('el porcentaje que viaja: un vacío es null (la borra)', S.porcentajeComision('7.5') === 7.5 && S.porcentajeComision('') === null && S.porcentajeComision(null) === null)
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
  // Desde el 06/10/2026 va por guardar_comision_habitual (y NUNCA por
  // guardar_ficha_cliente, que no la conoce).
  const S = nuevo()
  prepararFicha(S, null)
  S.__doc.getElementById('ad-f-comision_habitual').value = '5'
  esperas.push(S.guardarFicha().then(() => {
    const r = S.__llamadas.rpc.find(x => x[0] === 'guardar_comision_habitual')
    chk('la comisión habitual va por guardar_comision_habitual', r && r[1].p_cliente_id === 'c1' && r[1].p_porcentaje === 5, JSON.stringify(r?.[1]))
    chk('… y sola no llama a guardar_ficha_cliente', !S.__llamadas.rpc.some(x => x[0] === 'guardar_ficha_cliente'))
    chk('… y dice "Ficha guardada."', S.__llamadas.exitos.includes('Ficha guardada.'))
  }))
}
{
  const S = nuevo()
  prepararFicha(S, null)
  S.estado.ficha.original.comision_habitual = 5
  S.__doc.getElementById('ad-f-comision_habitual').value = ''
  esperas.push(S.guardarFicha().then(() => {
    const r = S.__llamadas.rpc.find(x => x[0] === 'guardar_comision_habitual')
    chk('borrarla manda null', r && r[1].p_porcentaje === null, JSON.stringify(r?.[1]))
  }))
}
{
  const S = nuevo()
  prepararFicha(S, null)
  S.__doc.getElementById('ad-f-comision_habitual').value = '5'
  S.__doc.getElementById('ad-f-localidad').value = 'Córdoba'
  esperas.push(S.guardarFicha().then(() => {
    const f = S.__llamadas.rpc.find(x => x[0] === 'guardar_ficha_cliente')
    chk('con otros datos: la ficha va SIN la comisión', f && f[1].p_datos.localidad === 'Córdoba' && !('comision_habitual' in f[1].p_datos), JSON.stringify(f?.[1]))
    chk('… y la comisión por su función', S.__llamadas.rpc.some(x => x[0] === 'guardar_comision_habitual'))
  }))
}
{
  // La ficha quedó y la comisión no: se dice con el mensaje de la base.
  const S = nuevo()
  prepararFicha(S, null)
  S.__setRpc((n) => n === 'guardar_comision_habitual' ? { data: null, error: { message: 'No tenés permiso sobre ese cliente.' } } : { data: null, error: null })
  S.__doc.getElementById('ad-f-comision_habitual').value = '5'
  S.__doc.getElementById('ad-f-localidad').value = 'Córdoba'
  esperas.push(S.guardarFicha().then(() => {
    chk('si la comisión no se guardó, NO dice "Ficha guardada"', !S.__llamadas.exitos.includes('Ficha guardada.'))
    chk('… dice "Se guardó la ficha, MENOS la comisión habitual" con el mensaje de la base', S.estado.ficha.error === 'Se guardó la ficha, MENOS la comisión habitual: No tenés permiso sobre ese cliente.', S.estado.ficha.error)
  }))
}
{
  // Solo la comisión, y la base dice que no: el mensaje tal cual.
  const S = nuevo()
  prepararFicha(S, null)
  S.__setRpc((n) => n === 'guardar_comision_habitual' ? { data: null, error: { message: 'La comisión va de 0 a 100%.' } } : { data: null, error: null })
  S.__doc.getElementById('ad-f-comision_habitual').value = '5'
  esperas.push(S.guardarFicha().then(() => chk('solo la comisión y la base dice que no: el mensaje tal cual', S.estado.ficha.error === 'La comisión va de 0 a 100%.', S.estado.ficha.error)))
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
  const S2 = nuevo()
  S2.estado.clientes = [{ ...CLIENTES[0], comision_habitual: marca('habitual') }]
  const h2 = S2.htmlComisionOrden({ orden: ORDEN, items: [], comision: null })
  chk('una comisión habitual con HTML no entra cruda', !/<b data-xss=/.test(h2))
  const h3 = S2.htmlFilaOrden({ ...ORDEN, cajas: 1, insumos: 0, codigo: marca('codigo-com'), comision_modo: 'porcentaje', comision_importe: 5 })
  chequearMarcas(chk, 'fila de orden con comisión', h3, ['codigo-com'])
}

fin()
