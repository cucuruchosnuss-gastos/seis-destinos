// ADMINISTRACIÓN — CORREGIR UNA ORDEN (29/10/2026, rama ci-prueba/corregir-orden;
// pedido de Facu: "Corregir orden" en el detalle, al lado de Valorizar y
// Anular, también en las valorizadas).
// La base (pg_get_functiondef el 29/10/2026): orden_para_corregir(p_orden_id)
// (retiros:precios) devuelve la orden con no_se_puede, items con sus lotes y
// correcciones; corregir_orden_retiro(p_orden_id, p_items, p_motivo, p_fecha,
// p_transporte, p_observaciones) (retiros:precios Y retiros:cargar) la rehace
// con registrar_orden_retiro (p_items en su formato, más 'precio') y devuelve
// { codigo, total_antes, total_despues, valorizada, stock_insuficiente[] }.
// El historial se lee de orden_correcciones (retiros:ver).
// Se EJECUTAN las funciones reales del módulo: el botón según permiso y
// estado, el aviso no_se_puede, los lotes (falta repartir / de más /
// completo), la fecha bloqueada, el resumen con la diferencia (cuenta
// corriente o entre empresas), el p_items que viaja, los errores de la base
// tal cual, el doble toque, stock_insuficiente, "Corregida N veces" y el
// escape de todo lo que viene de la base.
//
//   node pruebas/test-administracion-corregir-orden.js
'use strict'

const path = require('path')
const fs = require('fs')
const { construirAdministracion } = require('./sandbox-administracion')
const { arnes, marca, chequearMarcas } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/administracion.html')
const src = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${src.length} bytes)`)
const { chk, esperas, fin } = arnes()
// importeHoja pone un espacio duro después del $: las pruebas comparan con uno común.
const sp = (x) => Array.isArray(x) ? x.map(sp) : typeof x === 'string' ? x.replace(/\u00a0/g, ' ') : x
const CON_IMPORTES = ['textoDiferenciaCorregir', 'textoSubtotalCorregir', 'lineasResumenCorregir', 'textoTotalCorregir', 'textoLotesCorregir']
function nuevo() {
  const S = construirAdministracion(ARCHIVO)
  for (const n of CON_IMPORTES) { const f = S[n]; if (typeof f === 'function') S[n] = (...a) => sp(f(...a)) }
  return S
}

const CLIENTES = [
  { id: 'c1', nombre: 'Distribuidora Anatolia', razon_social: 'ANATOLIA SRL', lista_precio_id: 'l1', activo: true, unidad_grupo_id: null },
  { id: 'c-dp', nombre: 'DOLCE PASTA SRL', razon_social: 'DOLCE PASTA SRL', lista_precio_id: 'l-int', activo: true, unidad_grupo_id: 'u-d' },
]
const CAT = {
  productos: [{ id: 'p1', nombre: 'Cucurucho grande', activo: true }, { id: 'p2', nombre: 'Cucurucho chico', activo: true }],
  presentaciones: [
    { id: 'pr1', producto_id: 'p1', nombre: 'Caja x 100', con_cono: false, unidades_por_caja: 100 },
    { id: 'pr1c', producto_id: 'p1', nombre: 'Caja x 100 con cono', con_cono: true, unidades_por_caja: 100 },
    { id: 'pr2', producto_id: 'p2', nombre: 'Caja x 320', con_cono: false, unidades_por_caja: 320 },
  ],
  marcas: [{ id: 'm1', nombre: 'LOLO' }, { id: 'm2', nombre: 'CASERATO' }],
  insumos: [{ id: 'ins-1', nombre: 'Harina 000', marca: null, unidad_medida: 'kg', activo: true }, { id: 'ins-2', nombre: 'Caja N°1', marca: null, unidad_medida: 'un', activo: true }],
}
const ORDEN = { id: 'o1', numero: 42, codigo: 'N-0042', unidad_negocio_id: 'u-n', fecha: '2026-10-20', estado: 'confirmada', estado_valorizacion: 'valorizada',
  total: 42250, moneda: 'ARS', cliente_id: 'c1', cargada_por: 'emp-9', cargada_en: '2026-10-20T13:00:00Z', transporte: 'Expreso Norte', observaciones: 'Frágil' }
const ITEMS = [
  { item_id: 'i1', orden: 1, tipo: 'retiro', presentacion_id: 'pr1', marca_id: null, insumo_id: null, producto: 'Cucurucho grande', presentacion: 'Caja x 100', cono: null,
    cajas: 10, cantidad: null, precio: 3000, subtotal: 30000, lotes: [{ lote: '6240', cajas: 6 }, { lote: '6241', cajas: 4 }] },
  { item_id: 'i2', orden: 2, tipo: 'retiro', presentacion_id: 'pr1c', marca_id: 'm1', insumo_id: null, producto: 'Cucurucho grande', presentacion: 'Caja x 100 con cono', cono: 'LOLO',
    cajas: 4, cantidad: null, precio: 3250, subtotal: 13000, lotes: [{ lote: '6250', cajas: 3 }] },
  { item_id: 'i3', orden: 3, tipo: 'retiro', presentacion_id: null, marca_id: null, insumo_id: 'ins-1', insumo: 'Harina 000', unidad: 'kg',
    cajas: null, cantidad: 12.5, precio: 500, subtotal: 6250, lotes: [{ lote: 'H-1', cantidad: 12.5 }] },
  { item_id: 'i4', orden: 4, tipo: 'devolucion', presentacion_id: 'pr2', marca_id: null, insumo_id: null, producto: 'Cucurucho chico', presentacion: 'Caja x 320', cono: null,
    cajas: 2, cantidad: null, precio: 3500, subtotal: -7000, motivo: 'Rotura', lote_devuelto: '6100', destino: 'descarte', lotes: [] },
]
const DATOS = { orden_id: 'o1', codigo: 'N-0042', unidad_negocio_id: 'u-n', cliente_id: 'c1', cliente: 'Distribuidora Anatolia', entre_empresas: false,
  fecha: '2026-10-20', transporte: 'Expreso Norte', observaciones: 'Frágil', numero_remito: null, talonario: null, estado_valorizacion: 'valorizada',
  total: 42250, moneda: 'ARS', no_se_puede: null, items: ITEMS, correcciones: [] }
const ITEMS_TABLA = [{ id: 'i1', orden: 1, presentacion_id: 'pr1', marca_id: null, cajas: 10, unidades: 1000, precio_caja: 3000, subtotal: 30000, tipo: 'retiro' }]
const copia = (x) => JSON.parse(JSON.stringify(x))

function preparar(S, { orden = ORDEN, datos = DATOS, cargar = true, precios = true, corregir = null, correcciones = [] } = {}) {
  S.estado.clientes = CLIENTES
  S.estado.catalogo = CAT
  S.estado.catalogoEmpresa = 'u-n'
  const t = new Map([['retiros:ver', { unidades: ['u-n'] }], ['retiros:anular', { unidades: ['u-n'] }]])
  if (precios) t.set('retiros:precios', { unidades: ['u-n'] })
  if (cargar) t.set('retiros:cargar', { unidades: ['u-n'] })
  S.estado.misTareas = t
  S.__tablas.ordenes_retiro = [orden]
  S.__tablas.orden_retiro_items = ITEMS_TABLA
  S.__tablas.v_empleados_publico = [{ id: 'emp-9', nombre: 'Emanuel Romero' }, { id: 'emp-7', nombre: 'Lucía Pérez' }]
  S.__tablas.orden_correcciones = correcciones
  S.__setRpc(async (n, p) => {
    if (n === 'orden_para_corregir') return typeof datos === 'function' ? datos(p) : { data: copia(datos), error: null }
    if (n === 'corregir_orden_retiro') return corregir ? corregir(p) : { data: { codigo: 'N-0042', total_antes: 42250, total_despues: 42250, valorizada: true, stock_insuficiente: [] }, error: null }
    return { data: null, error: null }
  })
}
// La orden abierta, sin leerla de la base (para las pruebas del editor).
function conOrden(S, orden = ORDEN) {
  S.estado.orden = { id: orden.id, orden: { ...orden }, items: [], lotes: [], lotesInsumos: [], error: null, valorizar: null, comision: null, anular: null,
    aviso: null, errorHoja: null, corregir: null, faltantesCorreccion: null, correcciones: [] }
}
const cuerpo = (S) => sp(S.__els.get('ad-orden-cuerpo')?.innerHTML ?? '')
const texto = (S, id) => sp(S.__els.get(id)?.textContent)
const boton = (S) => S.__els.get('ad-btn-corregir-orden')?.hidden
const co = (S) => S.estado.orden.corregir
const r = (S, i) => co(S).renglones[i]
// Un campo del editor que se escribe: lo que le llega a alEscribirCorregir.
const escribir = (S, dataset, value) => S.alEscribirCorregir({ target: { dataset, value } })
const llamadas = (S, n) => S.__llamadas.rpc.filter(([x]) => x === n)

// ── El botón: según el permiso y el estado ─────────────────────────────────
{
  const S = nuevo()
  preparar(S)
  conOrden(S)
  S.pintarAccionesOrden()
  chk('valorizada y con retiros:precios: se ve "Corregir orden"', boton(S) === false, String(boton(S)))
  conOrden(S, { ...ORDEN, estado_valorizacion: 'pendiente' })
  S.pintarAccionesOrden()
  chk('sin valorizar también se ve', boton(S) === false)
  conOrden(S, { ...ORDEN, estado: 'anulada' })
  S.pintarAccionesOrden()
  chk('anulada: no se ve', boton(S) === true)
  chk('puedeCorregirOrden(anulada) = false', S.puedeCorregirOrden({ ...ORDEN, estado: 'anulada' }) === false)
  chk('puedeCorregirOrden de otra fábrica (sin alcance) = false', S.puedeCorregirOrden({ ...ORDEN, unidad_negocio_id: 'u-d' }) === false)
}
{
  const S = nuevo()
  preparar(S, { precios: false })
  conOrden(S)
  S.pintarAccionesOrden()
  chk('sin retiros:precios: no se ve (aunque tenga cargar)', boton(S) === true)
}
{
  const S = nuevo()
  preparar(S)
  conOrden(S)
  S.estado.orden.valorizar = { cargando: true }
  S.pintarAccionesOrden()
  chk('mientras se valoriza: no se ve', boton(S) === true)
  S.estado.orden.valorizar = null
  S.estado.orden.corregir = { cargando: true }
  S.pintarAccionesOrden()
  chk('mientras se corrige: no se ve, ni Valorizar / Corregir valorización / Anular',
    boton(S) === true && S.__els.get('ad-btn-corregir-valor').hidden === true && S.__els.get('ad-btn-anular').hidden === true)
}

// ── Abrir: orden_para_corregir y los renglones ─────────────────────────────
{
  const S = nuevo()
  preparar(S)
  conOrden(S)
  esperas.push(S.abrirCorregir().then(() => {
    const ll = llamadas(S, 'orden_para_corregir')
    chk('llama a orden_para_corregir con la orden', ll.length === 1 && ll[0][1].p_orden_id === 'o1', JSON.stringify(ll))
    chk('arma un renglón por item', co(S).renglones.length === 4)
    chk('un lote SIN STOCK que faltaba vuelve como lote sin nombre con lo que falta (3 + 1 = 4)',
      JSON.stringify(r(S, 1).lotes.map(l => [l.lote, l.n])) === JSON.stringify([['6250', 3], ['', 1]]), JSON.stringify(r(S, 1).lotes))
    chk('la devolución no tiene lotes y conserva motivo, lote y destino', r(S, 3).tipo === 'devolucion' && r(S, 3).lotes.length === 0 &&
      r(S, 3).motivo === 'Rotura' && r(S, 3).loteDevuelto === '6100' && r(S, 3).destino === 'descarte')
    const h = cuerpo(S)
    chk('el editor se dibuja en el cuerpo, un renglón por item', (h.match(/data-co-renglon="/g) || []).length === 4)
    chk('los números NO van en value="…" (se ponen con ponerNumero)', !/data-co-cantidad="\d+"[^>]*value=/.test(h) && !/data-co-precio="\d+"[^>]*value=/.test(h))
    chk('valorizada: cada renglón tiene su precio (menos nada: 4 campos)', (h.match(/data-co-precio="/g) || []).length === 4)
    chk('el insumo dice su unidad', /Cantidad \(kg\)/.test(h) && /Precio x kg/.test(h))
    chk('la devolución, "Cajas que trae" y sus datos', /Cajas que trae/.test(h) && /data-co-motivo-dev="/.test(h) && /data-co-destino="/.test(h))
    chk('el total antes → después en pantalla', /Total: \$ 42\.250,00 → \$ 42\.250,00/.test(h), (h.match(/id="ad-co-total">[^<]*/) || [''])[0])
    chk('mientras se corrige, la pantalla de facturar (N1 / N2) no se ve', S.__els.get('ad-orden-facturar').hidden === true)
    chk('el cono del renglón con cono: LOLO elegido', /data-co-marca="[^"]+" data-marca="m1" aria-pressed="true"/.test(h))
  }))
}
{
  // no_se_puede: el aviso y no deja editar.
  const S = nuevo()
  preparar(S, { datos: { ...DATOS, no_se_puede: 'La orden ya tiene una factura emitida: hacé una nota de crédito o débito.' } })
  conOrden(S)
  esperas.push(S.abrirCorregir().then(() => {
    const h = cuerpo(S)
    chk('no_se_puede: el aviso con el texto de la base', /id="ad-co-no-se-puede"[^>]*>No se puede corregir: La orden ya tiene una factura emitida: hacé una nota de crédito o débito\.</.test(h), h.slice(0, 400))
    chk('…sin campos para editar ni "Revisar los cambios"', !/data-co-cantidad=/.test(h) && !/data-co-accion="revisar"/.test(h) && !/data-co-accion="agregar"/.test(h))
    chk('…con "Cerrar"', /data-co-accion="cancelar">Cerrar</.test(h))
    S.agregarRenglonCorregir()
    S.revisarCorregir()
    chk('…y aunque se intente, no agrega renglones ni revisa', co(S).renglones.length === 4 && co(S).paso === 'editar' && co(S).errores.length === 0)
    S.cancelarCorregir()
    chk('Cerrar vuelve al detalle', S.estado.orden.corregir === null)
  }))
}
{
  const S = nuevo()
  preparar(S, { datos: () => ({ data: null, error: { message: 'No tenés permiso para corregir órdenes.' } }) })
  conOrden(S)
  esperas.push(S.abrirCorregir().then(() => {
    chk('si la base no deja leer: su mensaje tal cual', /id="ad-co-no-se-puede"[^>]*>No tenés permiso para corregir órdenes\.</.test(cuerpo(S)))
  }))
}

// ── Los lotes: falta repartir, de más, completo ────────────────────────────
{
  const S = nuevo()
  preparar(S)
  conOrden(S)
  esperas.push(S.abrirCorregir().then(() => {
    const k = String(r(S, 0).clave)
    const estadoLotes = () => S.__els.get('ad-co-lotes-' + k)?.textContent
    chk('al abrir: "Lotes: 10 de 10 cajas · ✓ repartido completo"', S.textoLotesCorregir(r(S, 0)) === 'Lotes: 10 de 10 cajas · ✓ repartido completo', S.textoLotesCorregir(r(S, 0)))
    escribir(S, { coCantidad: k }, '12')
    chk('12 cajas con 10 en lotes: "faltan repartir 2 cajas" (sin redibujar)', estadoLotes() === 'Lotes: 10 de 12 cajas · faltan repartir 2 cajas', estadoLotes())
    chk('…en amarillo', S.__els.get('ad-co-lotes-' + k).classList.contains('ad-co-lotes__estado--falta'))
    const l2 = String(r(S, 0).lotes[1].clave)
    escribir(S, { coLoteN: k, k: l2 }, '7')
    chk('de más: "sobran 1 caja"', estadoLotes() === 'Lotes: 13 de 12 cajas · sobran 1 caja', estadoLotes())
    escribir(S, { coLoteN: k, k: l2 }, '6')
    chk('completo: "✓ repartido completo", sin amarillo', estadoLotes() === 'Lotes: 12 de 12 cajas · ✓ repartido completo' &&
      !S.__els.get('ad-co-lotes-' + k).classList.contains('ad-co-lotes__estado--falta'), estadoLotes())
    // No deja guardar si no suma.
    escribir(S, { coLoteN: k, k: l2 }, '4')
    escribir(S, { coCampo: 'motivo' }, 'Se llevó dos cajas más')
    S.revisarCorregir()
    chk('no suma: no pasa al resumen y dice cuánto falta', co(S).paso === 'editar' && co(S).errores.includes('Renglón 1: faltan repartir 2 cajas entre los lotes.'), JSON.stringify(co(S).errores))
    chk('…y el error se ve', /id="ad-co-errores"[\s\S]*Renglón 1: faltan repartir 2 cajas entre los lotes\./.test(cuerpo(S)))
    S.guardarCorregir()
    chk('…y Guardar no llama a la base', llamadas(S, 'corregir_orden_retiro').length === 0)
    escribir(S, { coLoteN: k, k: l2 }, '9')
    chk('de más tampoco: "los lotes suman 3 cajas de más"', S.erroresCorregir(co(S)).includes('Renglón 1: los lotes suman 3 cajas de más.'))
    escribir(S, { coLoteN: k, k: l2 }, '')
    chk('un lote vacío: "cada lote necesita sus cajas"', S.erroresCorregir(co(S)).includes('Renglón 1: cada lote necesita sus cajas (o sacalo).'))
    S.quitarLoteCorregir(k, l2)
    chk('sacar un lote', r(S, 0).lotes.length === 1)
    S.agregarLoteCorregir(k)
    chk('agregar un lote: se lleva lo que falta (6)', r(S, 0).lotes[1].n === 6)
    S.quitarLoteCorregir(k, r(S, 0).lotes[1].clave)
    S.quitarLoteCorregir(k, r(S, 0).lotes[0].clave)
    chk('sin lotes: "los elige la base"', /^Sin lotes: los elige la base/.test(S.textoLotesCorregir(r(S, 0))) && !S.erroresCorregir(co(S)).some(e => /lote/.test(e)))
    S.agregarLoteCorregir(k)
    chk('el primer lote se lleva todo el renglón (12)', r(S, 0).lotes.length === 1 && r(S, 0).lotes[0].n === 12)
  }))
}
{
  // El insumo: cantidad con decimales en su unidad.
  const S = nuevo()
  preparar(S)
  conOrden(S)
  esperas.push(S.abrirCorregir().then(() => {
    const ins = r(S, 2)
    chk('insumo al abrir: "Lotes: 12,5 de 12,5 kg · ✓ repartido completo"', S.textoLotesCorregir(ins) === 'Lotes: 12,5 de 12,5 kg · ✓ repartido completo', S.textoLotesCorregir(ins))
    chk('insumo en kg: 3 decimales; en un.: enteros; producto: enteros', S.decimalesRenglonCorregir(ins) === 3 && S.decimalesRenglonCorregir({ insumoId: 'x', unidad: 'un' }) === 0 && S.decimalesRenglonCorregir(r(S, 0)) === 0)
    escribir(S, { coLoteN: String(ins.clave), k: String(ins.lotes[0].clave) }, '10')
    chk('insumo: "faltan repartir 2,5 kg"', S.textoLotesCorregir(ins) === 'Lotes: 10 de 12,5 kg · faltan repartir 2,5 kg', S.textoLotesCorregir(ins))
  }))
}

// ── La fecha: bloqueada si está valorizada ─────────────────────────────────
{
  const S = nuevo()
  preparar(S)
  conOrden(S)
  esperas.push(S.abrirCorregir().then(() => {
    const h = cuerpo(S)
    chk('valorizada: la fecha deshabilitada', /<input type="date" class="ad-input" id="ad-co-fecha"[^>]* disabled/.test(h), (h.match(/<input type="date"[^>]*>/) || [''])[0])
    chk('…con la explicación', /La orden ya está valorizada: no se le puede cambiar la fecha\./.test(h))
    escribir(S, { coCampo: 'fecha' }, '2026-10-22')
    chk('…y aunque llegue un cambio, no se toma', co(S).fecha === '2026-10-20')
    chk('…p_fecha viaja null', S.parametrosCorregir(co(S)).p_fecha === null)
    co(S).fecha = '2026-10-22'
    chk('…y aunque la fecha del editor difiera, valorizada viaja null', S.parametrosCorregir(co(S)).p_fecha === null)
    chk('transporte y observaciones sin cambios: viajan null (no cambian)', S.parametrosCorregir(co(S)).p_transporte === null && S.parametrosCorregir(co(S)).p_observaciones === null)
  }))
}
{
  // Una orden de acopio valorizada: la base no la revaloriza; sin precios.
  const S = nuevo()
  preparar(S, { datos: { ...DATOS, talonario: 'acopio' } })
  conOrden(S)
  esperas.push(S.abrirCorregir().then(() => {
    const h = cuerpo(S)
    chk('acopio: sin campos de precio ni total, con el aviso', !/data-co-precio=/.test(h) && !/id="ad-co-total"/.test(h) && /Es una orden de acopio: al corregirla no se tocan los precios\./.test(h))
    chk('acopio: nada de precio en p_items', S.parametrosCorregir(co(S)).p_items.every(i => !('precio' in i)))
    chk('acopio valorizada: la fecha igual bloqueada', /id="ad-co-fecha"[^>]* disabled/.test(h))
  }))
}
{
  const S = nuevo()
  preparar(S, { orden: { ...ORDEN, estado_valorizacion: 'pendiente', total: null }, datos: { ...DATOS, estado_valorizacion: 'pendiente', total: null } })
  conOrden(S, { ...ORDEN, estado_valorizacion: 'pendiente', total: null })
  esperas.push(S.abrirCorregir().then(() => {
    const h = cuerpo(S)
    chk('sin valorizar: la fecha se puede cambiar', /id="ad-co-fecha"/.test(h) && !/id="ad-co-fecha"[^>]* disabled/.test(h))
    chk('…y sin campos de precio', !/data-co-precio=/.test(h) && !/id="ad-co-total"/.test(h))
    escribir(S, { coCampo: 'fecha' }, '2026-10-22')
    chk('…la fecha nueva viaja en p_fecha', S.parametrosCorregir(co(S)).p_fecha === '2026-10-22')
    chk('…y va en el resumen', S.lineasResumenCorregir(co(S)).includes('Fecha: 20/10/2026 → 22/10/2026'), JSON.stringify(S.lineasResumenCorregir(co(S))))
    chk('…sin precios, nada de precio en p_items', S.parametrosCorregir(co(S)).p_items.every(i => !('precio' in i)))
  }))
}

// ── El resumen y la diferencia ─────────────────────────────────────────────
{
  const S = nuevo()
  preparar(S)
  conOrden(S)
  esperas.push(S.abrirCorregir().then(() => {
    const k = String(r(S, 0).clave)
    escribir(S, { coCantidad: k }, '12')
    escribir(S, { coLoteN: k, k: String(r(S, 0).lotes[1].clave) }, '6')
    S.quitarRenglonCorregir(r(S, 3).clave)
    escribir(S, { coCampo: 'transporte' }, 'Expreso Sur')
    escribir(S, { coCampo: 'motivo' }, 'Eran 12 cajas y la devolución no fue')
    S.revisarCorregir()
    chk('pasa al resumen', co(S).paso === 'resumen', JSON.stringify(co(S).errores))
    const h = cuerpo(S)
    const lis = (h.match(/<ul class="ad-co-resumen"[^>]*>([\s\S]*?)<\/ul>/) || ['', ''])[1]
    chk('resumen: lo que se saca', lis.includes('<li>Se saca: Devolución de 2 cajas · Cucurucho chico · Caja x 320</li>'), lis)
    chk('resumen: las cajas que cambian', lis.includes('<li>Cucurucho grande · Caja x 100: 10 cajas → 12 cajas</li>'))
    chk('resumen: los lotes', lis.includes('<li>Cucurucho grande · Caja x 100: lotes 6240 (6 cajas), 6241 (6 cajas)</li>'))
    chk('resumen: el transporte', lis.includes('<li>Transporte: Expreso Norte → Expreso Sur</li>'))
    chk('resumen: lo que no cambió no aparece', !/Harina|LOLO/.test(lis))
    chk('total antes → después (estimado)', /id="ad-co-resumen-total">Total \$ 42\.250,00 → \$ 55\.250,00 \(estimado con los precios de la pantalla\)/.test(h), (h.match(/id="ad-co-resumen-total">[^<]*/) || [''])[0])
    chk('la diferencia va a la cuenta corriente del cliente', /id="ad-co-diferencia">Diferencia \+ \$ 13\.000,00: va a la cuenta corriente de Distribuidora Anatolia\.</.test(h), (h.match(/id="ad-co-diferencia">[^<]*/) || [''])[0])
    chk('el motivo a la vista y "Guardar la corrección"', /Motivo: Eran 12 cajas y la devolución no fue/.test(h) && /id="ad-co-guardar">Guardar la corrección</.test(h))
    S.volverAEditarCorregir()
    chk('"Volver a editar" vuelve con todo como estaba', co(S).paso === 'editar' && r(S, 0).cantidad === 12 && co(S).renglones.length === 3)
    // Un precio que baja: diferencia negativa.
    escribir(S, { coPrecio: k }, '2000')
    const t = S.totalesCorregir(co(S))
    chk('con el precio de la pantalla: 24.000 + 13.000 + 6.250 = 43.250', t.despues === 43250 && t.diferencia === 1000, JSON.stringify(t))
    chk('el subtotal del renglón se actualiza sin redibujar', texto(S, 'ad-co-sub-' + k) === 'Subtotal $ 24.000,00')
    chk('…y el total', texto(S, 'ad-co-total') === 'Total: $ 42.250,00 → $ 43.250,00', texto(S, 'ad-co-total'))
    chk('resumen: el precio que cambia', S.lineasResumenCorregir(co(S)).includes('Cucurucho grande · Caja x 100: precio $ 3.000,00 → $ 2.000,00'))
    escribir(S, { coPrecio: k }, '500')
    chk('diferencia negativa: "− $ …"', S.textoDiferenciaCorregir(co(S), S.totalesCorregir(co(S))) === 'Diferencia − $ 17.000,00: va a la cuenta corriente de Distribuidora Anatolia.',
      S.textoDiferenciaCorregir(co(S), S.totalesCorregir(co(S))))
  }))
}
{
  // Entre empresas: la diferencia va a la deuda entre las dos.
  const S = nuevo()
  const datos = { ...DATOS, entre_empresas: true, cliente_id: 'c-dp', cliente: 'DOLCE PASTA SRL', items: ITEMS.slice(0, 3), total: 49250 }
  preparar(S, { orden: { ...ORDEN, cliente_id: 'c-dp', total: 49250 }, datos })
  conOrden(S, { ...ORDEN, cliente_id: 'c-dp', total: 49250 })
  esperas.push(S.abrirCorregir().then(() => {
    escribir(S, { coCantidad: String(r(S, 2).clave) }, '10')
    S.quitarLoteCorregir(r(S, 2).clave, r(S, 2).lotes[0].clave)
    const txt = S.textoDiferenciaCorregir(co(S), S.totalesCorregir(co(S)))
    chk('entre empresas: va a la deuda entre empresas, no a la cuenta corriente',
      txt === 'Diferencia − $ 1.250,00: va a la deuda entre empresas (de Dolce Pasta con Cucuruchos Nuss), no a la cuenta corriente.', txt)
  }))
}
{
  // Sin diferencia; renglón nuevo sin precio (toma el anterior o la lista).
  const S = nuevo()
  preparar(S)
  conOrden(S)
  esperas.push(S.abrirCorregir().then(() => {
    escribir(S, { coCampo: 'observaciones' }, '')
    chk('sin cambiar plata: "Sin diferencia de plata."', S.textoDiferenciaCorregir(co(S), S.totalesCorregir(co(S))) === 'Sin diferencia de plata.')
    chk('borrar las observaciones va en el resumen', S.lineasResumenCorregir(co(S)).includes('Se borran las observaciones'))
    chk('…y viaja "" (las borra)', S.parametrosCorregir(co(S)).p_observaciones === '')
    S.agregarRenglonCorregir()
    const n = r(S, 4)
    chk('agregar renglón: nuevo, eligiendo el producto', co(S).renglones.length === 5 && n.eligiendo === true && /id="ad-co-buscar-/.test(cuerpo(S)))
    chk('…el catálogo de la Carga (SIN CONO / CON CONO)', /Producto terminado · SIN CONO/.test(cuerpo(S)) && /Producto terminado · CON CONO/.test(cuerpo(S)))
    chk('…al buscar, también los insumos', /data-ins="ins-1"/.test(S.htmlOpcionesCorregir(co(S), { ...n, busqueda: 'harina' })))
    chk('…pero no en una devolución (es solo de producto terminado)', !/data-ins=/.test(S.htmlOpcionesCorregir(co(S), { ...n, tipo: 'devolucion', busqueda: 'harina' })))
    S.elegirProductoCorregir(n.clave, { presentacionId: 'pr1' })
    escribir(S, { coCantidad: String(n.clave) }, '2')
    chk('sin precio, el mismo producto: toma el que tenía ($ 3.000)', S.textoSubtotalCorregir(co(S), n) === 'Sin precio: toma el que tenía ($ 3.000,00).', S.textoSubtotalCorregir(co(S), n))
    chk('…y entra en el total estimado', S.totalesCorregir(co(S)).despues === 48250)
    chk('…pero el precio NO viaja (lo pone la base)', !('precio' in S.parametrosCorregir(co(S)).p_items[4]))
    S.elegirProductoCorregir(n.clave, { insumoId: 'ins-2' })
    chk('un insumo nuevo: sin cantidad (otra unidad) y sin precio anterior', n.cantidad === null && n.insumoId === 'ins-2' && n.unidad === 'un')
    escribir(S, { coCantidad: String(n.clave) }, '30')
    chk('sin precio anterior: "lo toma de la lista al guardar"', S.textoSubtotalCorregir(co(S), n) === 'Sin precio: lo toma de la lista al guardar.')
    const t = S.totalesCorregir(co(S))
    chk('…el total se completa al guardar', t.despues === null && t.faltan === 1 &&
      S.textoDiferenciaCorregir(co(S), t) === 'La diferencia se sabe al guardar: 1 renglón toma el precio de la lista.')
    chk('…resumen: "Se agrega: 30 un. · Caja N°1"', S.lineasResumenCorregir(co(S)).includes('Se agrega: 30 un. · Caja N°1'), JSON.stringify(S.lineasResumenCorregir(co(S))))
    // El precio anterior: solo del mismo tipo (la devolución de pr2 no cuenta para un retiro de pr2).
    S.elegirProductoCorregir(n.clave, { presentacionId: 'pr2' })
    chk('un retiro de un producto que solo estaba devuelto: sin precio anterior', S.precioEstimadoCorregir(co(S), n) === null)
    chk('una reposición se estima en $ 0', S.precioEstimadoCorregir(co(S), { ...n, tipo: 'reposicion' }) === 0)
  }))
}
{
  // El precio anterior: primero el del mismo cono.
  const S = nuevo()
  const otro = { ...ITEMS[1], item_id: 'i0', marca_id: 'm2', cono: 'CASERATO', precio: 3400, lotes: [] }
  preparar(S, { datos: { ...DATOS, items: [otro, ...ITEMS] } })
  conOrden(S)
  esperas.push(S.abrirCorregir().then(() => {
    S.agregarRenglonCorregir()
    const n = co(S).renglones[co(S).renglones.length - 1]
    S.elegirProductoCorregir(n.clave, { presentacionId: 'pr1c' })
    S.elegirMarcaCorregir(n.clave, 'm1')
    chk('sin precio, con cono LOLO: toma el de LOLO ($ 3.250), no el primero (CASERATO)', S.precioEstimadoCorregir(co(S), n) === 3250, String(S.precioEstimadoCorregir(co(S), n)))
  }))
}
{
  // Mientras se valoriza no se corrige, y al revés.
  const S = nuevo()
  preparar(S)
  conOrden(S)
  S.estado.orden.valorizar = { cargando: true }
  esperas.push(S.abrirCorregir().then(async () => {
    chk('valorizando: Corregir no abre', S.estado.orden.corregir === null && llamadas(S, 'orden_para_corregir').length === 0)
    S.estado.orden.valorizar = null
    await S.abrirCorregir()
    await S.abrirValorizar()
    chk('corrigiendo: Valorizar no abre', S.estado.orden.valorizar === null && !!S.estado.orden.corregir)
  }))
}
{
  // Cambiar el producto y el cono; nada cambiado.
  const S = nuevo()
  preparar(S)
  conOrden(S)
  esperas.push(S.abrirCorregir().then(() => {
    escribir(S, { coCampo: 'motivo' }, 'Nada')
    chk('sin cambios: "No cambiaste nada de la orden."', JSON.stringify(S.erroresCorregir(co(S))) === JSON.stringify(['No cambiaste nada de la orden.']))
    const a = r(S, 0)
    S.cambiarProductoCorregir(a.clave, true)
    chk('"Cambiar" abre el buscador con "Dejar …"', /data-co-no-cambiar="/.test(cuerpo(S)) && /Dejar Cucurucho grande · Caja x 100/.test(cuerpo(S)))
    S.elegirProductoCorregir(a.clave, { presentacionId: 'pr1c' })
    chk('otro producto: los lotes se sacan y falta el cono', a.lotes.length === 0 && a.presentacionId === 'pr1c' && S.erroresCorregir(co(S)).includes('Renglón 1: elegí el cono.'))
    S.elegirMarcaCorregir(a.clave, 'm2')
    chk('elegir el cono', a.marcaId === 'm2' && !S.erroresCorregir(co(S)).some(e => /cono/.test(e)))
    chk('resumen: "Cambia … por …"', S.lineasResumenCorregir(co(S)).includes('Cambia Cucurucho grande · Caja x 100 por Cucurucho grande · Caja x 100 con cono · CASERATO'), JSON.stringify(S.lineasResumenCorregir(co(S))))
    S.elegirMarcaCorregir(a.clave, 'no-existe')
    chk('un cono que no existe no se toma', a.marcaId === 'm2')
    escribir(S, { coCampo: 'motivo' }, 'ab')
    chk('motivo de 2 letras: "Poné el motivo de la corrección."', S.erroresCorregir(co(S)).includes('Poné el motivo de la corrección.'))
    S.quitarRenglonCorregir(r(S, 0).clave); S.quitarRenglonCorregir(r(S, 0).clave); S.quitarRenglonCorregir(r(S, 0).clave); S.quitarRenglonCorregir(r(S, 0).clave)
    chk('sin renglones: "al menos un renglón"', S.erroresCorregir(co(S)).includes('La orden tiene que tener al menos un renglón.'))
  }))
}

// ── El p_items que viaja y guardar ─────────────────────────────────────────
{
  const S = nuevo()
  let devolver = null
  preparar(S, { corregir: (p) => {
    S.__tablas.ordenes_retiro = [{ ...ORDEN, total: 55250, transporte: 'Expreso Sur' }]
    return devolver
  } })
  devolver = { data: { codigo: 'N-0042', total_antes: 42250, total_despues: 55250, valorizada: true,
    stock_insuficiente: [{ renglon: 1, producto: 'Cucurucho grande', presentacion: 'Caja x 100', faltaron: 2 }, { renglon: 3, insumo: 'Harina 000', faltaron: 1.5, unidad: 'kg' }] }, error: null }
  conOrden(S)
  S.estado.ordenes = [{ id: 'o1', codigo: 'N-0042', fecha: '2026-10-20', estado: 'confirmada', estado_valorizacion: 'valorizada', total: 42250, moneda: 'ARS', cliente_id: 'c1', cajas: 14 }]
  esperas.push(S.abrirCorregir().then(async () => {
    const k = String(r(S, 0).clave)
    escribir(S, { coCantidad: k }, '12')
    escribir(S, { coLoteN: k, k: String(r(S, 0).lotes[1].clave) }, '6')
    const ins = r(S, 2)
    S.agregarLoteCorregir(ins.clave)
    escribir(S, { coLoteN: String(ins.clave), k: String(ins.lotes[0].clave) }, '10')
    escribir(S, { coLote: String(ins.clave), k: String(ins.lotes[1].clave) }, ' h-2 ')
    escribir(S, { coLoteN: String(ins.clave), k: String(ins.lotes[1].clave) }, '2,5')
    escribir(S, { coMotivoDev: String(r(S, 3).clave) }, 'Rotura en el viaje')
    escribir(S, { coDestino: String(r(S, 3).clave) }, 'stock')
    S.agregarRenglonCorregir()
    S.elegirProductoCorregir(r(S, 4).clave, { presentacionId: 'pr2' })
    escribir(S, { coCantidad: String(r(S, 4).clave) }, '3')
    escribir(S, { coPrecio: String(r(S, 4).clave) }, '3600')
    escribir(S, { coCampo: 'transporte' }, '  Expreso   Sur ')
    escribir(S, { coCampo: 'motivo' }, 'Faltaban cajas')
    S.revisarCorregir()
    chk('todo bien: al resumen', co(S).paso === 'resumen', JSON.stringify(co(S).errores))
    const p1 = S.guardarCorregir()
    const p2 = S.guardarCorregir()
    chk('doble toque: Guardando… y el botón apagado', /id="ad-co-guardar" disabled>Guardando…</.test(cuerpo(S)))
    await Promise.all([p1, p2])
    const ll = llamadas(S, 'corregir_orden_retiro')
    chk('doble toque: UNA sola llamada', ll.length === 1, String(ll.length))
    const p = ll[0][1]
    chk('p_orden_id, p_motivo, p_fecha null (valorizada), p_transporte limpio, p_observaciones null (no cambió)',
      p.p_orden_id === 'o1' && p.p_motivo === 'Faltaban cajas' && p.p_fecha === null && p.p_transporte === 'Expreso Sur' && p.p_observaciones === null, JSON.stringify(p))
    chk('producto con lotes {lote, cajas} y su precio', JSON.stringify(p.p_items[0]) === JSON.stringify({ presentacion_id: 'pr1', marca_id: null, cajas: 12, lotes: [{ lote: '6240', cajas: 6 }, { lote: '6241', cajas: 6 }], precio: 3000 }), JSON.stringify(p.p_items[0]))
    chk('con cono: marca_id y el lote sin nombre que faltaba ("")', JSON.stringify(p.p_items[1]) === JSON.stringify({ presentacion_id: 'pr1c', marca_id: 'm1', cajas: 4, lotes: [{ lote: '6250', cajas: 3 }, { lote: '', cajas: 1 }], precio: 3250 }), JSON.stringify(p.p_items[1]))
    chk('insumo con decimales y lotes {lote, cantidad} (en mayúsculas)', JSON.stringify(p.p_items[2]) === JSON.stringify({ insumo_id: 'ins-1', cantidad: 12.5, lotes: [{ lote: 'H-1', cantidad: 10 }, { lote: 'H-2', cantidad: 2.5 }], precio: 500 }), JSON.stringify(p.p_items[2]))
    chk('devolución: tipo, motivo, lote devuelto, destino, sin lotes', JSON.stringify(p.p_items[3]) === JSON.stringify({ presentacion_id: 'pr2', marca_id: null, cajas: 2, tipo: 'devolucion', motivo: 'Rotura en el viaje', lote_devuelto: '6100', destino: 'stock', precio: 3500 }), JSON.stringify(p.p_items[3]))
    chk('producto nuevo sin lotes, con el precio escrito', JSON.stringify(p.p_items[4]) === JSON.stringify({ presentacion_id: 'pr2', marca_id: null, cajas: 3, precio: 3600 }), JSON.stringify(p.p_items[4]))
    chk('después: "Orden N-0042 corregida. Total … → …"', sp(S.__llamadas.exitos).includes('Orden N-0042 corregida. Total $ 42.250,00 → $ 55.250,00.'), JSON.stringify(S.__llamadas.exitos))
    chk('relee la orden y cierra el editor', S.estado.orden.corregir === null && S.estado.orden.orden?.total === 55250)
    chk('la fila del listado al día (total, transporte y cajas de los renglones releídos)', S.estado.ordenes[0].total === 55250 && S.estado.ordenes[0].transporte === 'Expreso Sur' && S.estado.ordenes[0].cajas === 10, JSON.stringify(S.estado.ordenes[0]))
    const h = cuerpo(S)
    chk('stock_insuficiente: "Lo que no estaba en stock" con cada renglón', /id="ad-co-faltantes"/.test(h) &&
      h.includes('<li>Cucurucho grande · Caja x 100 · faltaban 2 cajas</li>') && h.includes('<li>Harina 000 · faltaban 1,5 kg</li>'), (h.match(/id="ad-co-faltantes"[\s\S]{0,400}/) || [''])[0])
    chk('…y dónde se revisa', /Queda para revisar en «Retiros por revisar»\./.test(h))
    chk('estado.trabajando vuelve a false', S.estado.trabajando === false)
  }))
}
{
  // Sin lotes: el producto va sin 'lotes'.
  const S = nuevo()
  preparar(S)
  conOrden(S)
  esperas.push(S.abrirCorregir().then(() => {
    const a = r(S, 0)
    S.quitarLoteCorregir(a.clave, a.lotes[0].clave)
    S.quitarLoteCorregir(a.clave, a.lotes[0].clave)
    const it = S.itemCorregirParaBase(co(S), a)
    chk('producto sin lotes: sin la clave lotes (la base elige)', JSON.stringify(it) === JSON.stringify({ presentacion_id: 'pr1', marca_id: null, cajas: 10, precio: 3000 }), JSON.stringify(it))
    chk('una reposición no lleva precio (la base la pone en 0)', !('precio' in S.itemCorregirParaBase(co(S), { ...r(S, 3), tipo: 'reposicion' })))
    chk('el resumen dice que los lotes los elige la base', S.lineasResumenCorregir(co(S)).includes('Cucurucho grande · Caja x 100: lotes los elige la base'))
  }))
}

// ── Los errores de la base, tal cual ───────────────────────────────────────
for (const msg of ['Faltan precios en 1 renglón(es): cargalos en la lista del cliente.', 'Poné el motivo de la corrección.']) {
  const S = nuevo()
  preparar(S, { corregir: () => ({ data: null, error: { message: msg } }) })
  conOrden(S)
  esperas.push(S.abrirCorregir().then(async () => {
    escribir(S, { coCampo: 'transporte' }, 'Otro')
    escribir(S, { coCampo: 'motivo' }, 'Cambia el transporte')
    S.revisarCorregir()
    await S.guardarCorregir()
    chk(`error de la base tal cual: «${msg}»`, co(S)?.errorGuardar === msg && cuerpo(S).includes(`id="ad-co-error" role="alert">${msg}<`), co(S)?.errorGuardar)
    chk(`…sigue en el resumen, se puede volver a tocar Guardar (${msg.slice(0, 14)})`, co(S).paso === 'resumen' && co(S).guardando === false && S.estado.trabajando === false &&
      /id="ad-co-guardar">Guardar la corrección</.test(cuerpo(S)))
  }))
}

// ── Sin retiros:cargar: se mira, no se guarda ──────────────────────────────
{
  const S = nuevo()
  preparar(S, { cargar: false })
  conOrden(S)
  esperas.push(S.abrirCorregir().then(async () => {
    chk('sin cargar: el editor se abre con la explicación', /id="ad-co-sin-cargar">Para guardar una corrección también hace falta el permiso para cargar retiros/.test(cuerpo(S)))
    escribir(S, { coCampo: 'transporte' }, 'Otro')
    escribir(S, { coCampo: 'motivo' }, 'Cambia el transporte')
    S.revisarCorregir()
    chk('…el resumen se ve, con Guardar apagado', co(S).paso === 'resumen' && /id="ad-co-guardar" disabled>/.test(cuerpo(S)) && /id="ad-co-sin-cargar"/.test(cuerpo(S)))
    await S.guardarCorregir()
    chk('…y no llama a la base', llamadas(S, 'corregir_orden_retiro').length === 0)
  }))
}

// ── "Corregida N veces" en el detalle ──────────────────────────────────────
{
  const S = nuevo()
  preparar(S, { correcciones: [
    { corregida_en: '2026-10-29T15:05:00Z', corregida_por: 'emp-7', motivo: 'Faltaban 2 cajas', total_antes: '42250', total_despues: '48250' },
    { corregida_en: '2026-10-28T02:30:00Z', corregida_por: 'emp-9', motivo: 'El transporte', total_antes: null, total_despues: null },
  ] })
  // Los nombres, como la base: solo los ids que se piden (.in('id', …)).
  const empleados = [{ id: 'emp-9', nombre: 'Emanuel Romero' }, { id: 'emp-7', nombre: 'Lucía Pérez' }]
  S.__tablas.v_empleados_publico = (f) => ({ data: empleados.filter(e => (f.find(x => x[0] === 'in' && x[1] === 'id')?.[2] ?? []).includes(e.id)), error: null })
  esperas.push(S.abrirOrden('o1').then(() => {
    const q = S.__llamadas.consultas.find(([t]) => t === 'orden_correcciones')
    chk('lee orden_correcciones de la orden, con los totales de antes y después', !!q && q[1].some(f => f[0] === 'eq' && f[1] === 'orden_retiro_id' && f[2] === 'o1') &&
      q[1].some(f => f[0] === 'select' && /total_antes:antes->>total/.test(f[1]) && /total_despues:despues->>total/.test(f[1])), JSON.stringify(q))
    const h = cuerpo(S)
    chk('"Corregida 2 veces"', /<summary>Corregida 2 veces<\/summary>/.test(h), (h.match(/ad-correcciones[\s\S]{0,200}/) || [''])[0])
    chk('fecha y hora de Argentina y quién', h.includes('>29/10/2026 12:05 · Lucía Pérez<') && h.includes('>27/10/2026 23:30 · Emanuel Romero<'))
    chk('el motivo y el total antes → después', h.includes('>Faltaban 2 cajas<') && h.includes('>Total $ 42.250,00 → $ 48.250,00<'))
    chk('sin totales (sin valorizar), sin línea de plata', (h.match(/ad-correcciones__plata/g) || []).length === 1)
  }))
}
{
  const S = nuevo()
  preparar(S, { correcciones: [{ corregida_en: '2026-10-29T15:05:00Z', corregida_por: 'emp-7', motivo: 'Una', total_antes: null, total_despues: null }] })
  esperas.push(S.abrirOrden('o1').then(() => {
    chk('una sola: "Corregida 1 vez"', /<summary>Corregida 1 vez<\/summary>/.test(cuerpo(S)))
  }))
}
{
  const S = nuevo()
  preparar(S)
  S.__tablas.orden_correcciones = () => ({ data: null, error: { message: 'sin red' } })
  esperas.push(S.abrirOrden('o1').then(() => {
    chk('sin correcciones o si no se pueden leer: nada (y la orden se ve igual)', !/ad-correcciones/.test(cuerpo(S)) && /Cucurucho grande/.test(cuerpo(S)) && S.estado.orden.correcciones === null)
  }))
}

// ── Las cajas de la fila, como las cuenta el listado ───────────────────────
{
  const S = nuevo()
  const c = S.conteosFilaOrden([{ cajas: 5, unidades: 500 }, { cajas: 2, unidades: 640, tipo: 'devolucion' }, { insumo_id: 'x', cantidad: 3 }])
  chk('conteosFilaOrden: cajas que salen, insumos y devueltas', c.cajas === 5 && c.insumos === 1 && c.devueltas === 2 && c.sueltas === 0, JSON.stringify(c))
  chk('solo insumos: 0 cajas', S.conteosFilaOrden([{ insumo_id: 'x', cantidad: 3 }]).cajas === 0)
}

// ── Escape: todo lo que viene de la base ───────────────────────────────────
{
  const S = nuevo()
  const malos = {
    ...DATOS, cliente: marca('cliente'), transporte: marca('transporte'), observaciones: marca('observaciones'),
    items: [
      { ...ITEMS[0], presentacion_id: 'pr-x', producto: marca('producto'), presentacion: marca('presentacion'), lotes: [{ lote: marca('lote'), cajas: 10 }] },
      { ...ITEMS[3], presentacion_id: 'pr-y', producto: marca('producto-dev'), cono: null, motivo: marca('motivo-dev'), lote_devuelto: marca('lote-dev') },
      { ...ITEMS[2], insumo_id: 'ins-x', insumo: marca('insumo'), unidad: marca('unidad') },
    ],
  }
  preparar(S, { datos: malos })
  conOrden(S)
  esperas.push(S.abrirCorregir().then(() => {
    escribir(S, { coCampo: 'motivo' }, marca('motivo-editor'))
    S.pintarOrden()
    chequearMarcas(chk, 'el editor', cuerpo(S), ['producto', 'presentacion', 'lote', 'producto-dev', 'motivo-dev', 'lote-dev', 'insumo', 'unidad', 'transporte', 'observaciones', 'motivo-editor'])
    S.quitarRenglonCorregir(r(S, 0).clave)
    escribir(S, { coCampo: 'motivo' }, marca('motivo'))
    escribir(S, { coCampo: 'transporte' }, marca('transporte-nuevo'))
    S.revisarCorregir()
    chequearMarcas(chk, 'el resumen', cuerpo(S), ['producto', 'presentacion', 'motivo', 'transporte', 'transporte-nuevo', 'cliente'])
    co(S).errorGuardar = marca('error')
    S.pintarOrden()
    chequearMarcas(chk, 'el error de la base', cuerpo(S), ['error'])
  }))
}
{
  const S = nuevo()
  preparar(S, { datos: { ...DATOS, no_se_puede: marca('no-se-puede') } })
  conOrden(S)
  esperas.push(S.abrirCorregir().then(() => {
    chequearMarcas(chk, 'el aviso no_se_puede', cuerpo(S), ['no-se-puede'])
  }))
}
{
  const S = nuevo()
  S.estado.nombres.set('emp-x', marca('quien'))
  const d = { orden: ORDEN, correcciones: [{ corregida_en: '2026-10-29T15:05:00Z', corregida_por: 'emp-x', motivo: marca('motivo-hist'), total_antes: 1, total_despues: 2 }],
    faltantesCorreccion: [{ producto: marca('falt-producto'), presentacion: marca('falt-pres'), faltaron: 2 }, { insumo: marca('falt-insumo'), unidad: 'kg', faltaron: 1 }] }
  chequearMarcas(chk, 'el historial', S.htmlCorreccionesOrden(d), ['quien', 'motivo-hist'])
  chequearMarcas(chk, 'lo que faltó en stock', S.htmlFaltantesCorreccion(d), ['falt-producto', 'falt-pres', 'falt-insumo'])
  const c = { cat: { ...CAT, marcas: [{ id: 'mx', nombre: marca('cono') }], productos: [{ id: 'px', nombre: marca('cat-producto') }], presentaciones: [{ id: 'prx', producto_id: 'px', nombre: marca('cat-pres'), con_cono: true }] },
    datos: DATOS, renglones: [] }
  const rx = { clave: 1, tipo: 'retiro', presentacionId: 'prx', marcaId: 'mx', insumoId: null, busqueda: marca('busqueda'), marcaBusqueda: '', lotes: [], eligiendo: true }
  chequearMarcas(chk, 'el buscador del producto', S.htmlProductoCorregir(c, rx), ['busqueda'])
  chequearMarcas(chk, 'el catálogo', S.htmlOpcionesCorregir(c, { ...rx, busqueda: '' }), ['cat-producto', 'cat-pres'])
  chequearMarcas(chk, 'los conos', S.htmlMarcasCorregir(c, rx), ['cono'])
  chequearMarcas(chk, 'el producto elegido', S.htmlProductoCorregir(c, { ...rx, eligiendo: false }), ['cat-producto', 'cat-pres', 'cono'])
  chequearMarcas(chk, 'el buscador del cono', S.htmlProductoCorregir(c, { ...rx, eligiendo: false, marcaBusqueda: marca('cono-busqueda') }), ['cono-busqueda'])
  chk('el buscador del cono: «Ningún cono coincide…» escapado', (S.htmlProductoCorregir(c, { ...rx, eligiendo: false, marcaBusqueda: marca('cono-busqueda') }).match(/data-xss=&quot;cono-busqueda/g) || []).length === 2)
}

fin()
