// ADMINISTRACIÓN — la portada y las Órdenes de retiro (26/09/2026).
//
// La portada con una tarjeta por sección y su número (órdenes sin valorizar),
// y los accesos directos a Cheques, Cuentas Corrientes y Cobranzas. Las
// órdenes con sus filtros; el detalle con renglones y lotes; Valorizar con
// los precios de la lista del cliente, corregibles, con el total y el aviso
// de límite de crédito; Corregir valorización; Anular con motivo; la hoja CON
// precios. Cada sección solo con su permiso, y la fábrica de pruebas oculta.
//
//   node pruebas/test-administracion-ordenes.js

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
  { id: 'c1', nombre: 'Distribuidora Anatolia', razon_social: 'ANATOLIA SRL', cuit: '30712345678', email: 'compras@anatolia.com', lista_precio_id: 'l1', limite_credito: 100000, activo: true },
  { id: 'c2', nombre: 'Kiosco Pepe', razon_social: null, lista_precio_id: null, limite_credito: null, activo: true },
]
const CAT = {
  productos: [{ id: 'p1', nombre: 'Cucurucho grande' }],
  presentaciones: [
    { id: 'pr1', producto_id: 'p1', nombre: 'Caja x 100', con_cono: false, unidades_por_caja: 100 },
    { id: 'pr2', producto_id: 'p1', nombre: 'Caja x 100 con cono', con_cono: true, unidades_por_caja: 100 },
  ],
  marcas: [{ id: 'm1', nombre: 'LOLO' }],
}
const ORDEN = { id: 'o1', numero: 12, codigo: 'N-0012', unidad_negocio_id: 'u-n', fecha: '2026-09-20', estado: 'confirmada', estado_valorizacion: 'pendiente',
  total: 0, moneda: 'ARS', cliente_id: 'c1', cargada_por: 'emp-9', cargada_en: '2026-09-20T15:00:00Z', transporte: 'Expreso Norte', observaciones: null }
const ITEMS = [
  { id: 'i1', orden: 1, presentacion_id: 'pr1', marca_id: null, cajas: 10, unidades: 1000, precio_caja: null, subtotal: null, lote: null },
  { id: 'i2', orden: 2, presentacion_id: 'pr2', marca_id: 'm1', cajas: 4, unidades: 400, precio_caja: null, subtotal: null, lote: null },
]
const LISTA = [
  { presentacion_id: 'pr1', precio_caja: 2500, vigente_desde: '2026-09-01' },
  { presentacion_id: 'pr1', precio_caja: 3000, vigente_desde: '2026-09-15' },
  { presentacion_id: 'pr1', precio_caja: 9999, vigente_desde: '2026-09-25' },   // posterior al retiro: no vale
  { presentacion_id: 'pr2', precio_caja: 4000, vigente_desde: '2026-08-01' },
]

function preparar(S, { orden = ORDEN, items = ITEMS, movs = [{ importe: 80000 }], lotes = null } = {}) {
  S.estado.clientes = CLIENTES
  S.estado.catalogo = CAT
  S.estado.catalogoEmpresa = 'u-n'
  S.__tablas.ordenes_retiro = [orden]
  S.__tablas.orden_retiro_items = items
  S.__tablas.lista_precios_items = LISTA
  S.__tablas.cliente_movimientos = movs
  S.__tablas.v_empleados_publico = [{ id: 'emp-9', nombre: 'Emanuel Romero' }]
  if (lotes) S.__tablas.stock_terminado_movimientos = lotes
}

// ── Permisos: cada sección solo con su permiso ──────────────────────────────
{
  const S = nuevo()
  chk('con retiros:ver se ve la sección Órdenes', S.seccionesVisibles().some(s => s.id === 'ordenes'))
  S.estado.misTareas = new Map([['retiros:precios', { unidades: ['u-n'] }]])
  chk('sin retiros:ver NO se ve la sección Órdenes', !S.seccionesVisibles().some(s => s.id === 'ordenes'))
  chk('pero la empresa sigue siendo de Administración (precios)', S.empresasDeAdministracion().some(e => e.id === 'u-n'))
  S.estado.misTareas = new Map([['retiros:cargar', { todas: true }]])
  chk('solo con cargar (el depósito) NO hay Administración', S.empresasDeAdministracion().length === 0)
  S.estado.misTareas = new Map([['retiros:ver', { unidades: ['u-d'] }]])
  chk('el alcance manda: ver en Dolce Pasta no abre Cucuruchos', !S.puedeEn('retiros', 'ver', 'u-n') && S.puedeEn('retiros', 'ver', 'u-d'))
  S.estado.miRolApp = 'super_admin'
  chk('super_admin ve todo', S.seccionesVisibles('u-n').length === S.SECCIONES.length)
}
{
  const S = nuevo()
  S.estado.miRolApp = 'super_admin'
  S.estado.empresas = [...S.estado.empresas, { id: 'u-x', nombre: 'Pruebas (robot)' }]
  S.estado.fabrica = { ok: true, unidades: new Set(['u-x']), personas: new Set(), soyDePrueba: false }
  chk('la fábrica de pruebas no aparece para una cuenta real', !S.empresasDeAdministracion().some(e => e.id === 'u-x'))
  chk('ni en el selector de empresas', !/Pruebas \(robot\)/.test(S.htmlEmpresas()))
  S.estado.fabrica = { ...S.estado.fabrica, soyDePrueba: true }
  chk('una cuenta de prueba sí la ve', S.empresasDeAdministracion().some(e => e.id === 'u-x'))
}
{
  const S = nuevo()
  chk('con una sola empresa no se dibuja el selector', S.htmlEmpresas() === '')
  S.estado.misTareas.set('retiros:ver', { todas: true })
  chk('con varias, el selector', /data-empresa="u-n"/.test(S.htmlEmpresas()) && /data-empresa="u-d"/.test(S.htmlEmpresas()))
  chk('la empresa recordada se usa si todavía se puede', S.empresaInicial(S.empresasDeAdministracion(), 'u-d') === 'u-d' && S.empresaInicial(S.empresasDeAdministracion(), 'zzz') === 'u-n')
}

// ── Los accesos directos ────────────────────────────────────────────────────
{
  const S = nuevo()
  chk('sin esos módulos no hay accesos directos', S.linksVisibles().length === 0)
  S.estado.misModulos = new Set(['cobranzas', 'cuentas-corrientes'])
  let l = S.linksVisibles().map(x => x.clave)
  chk('con cobranzas y cuentas corrientes: esos dos (Cheques pide además una tarea)', l.join() === 'cuentas-corrientes,cobranzas')
  S.estado.misTareas.set('cobranzas:procesar', null)
  l = S.linksVisibles().map(x => x.clave)
  chk('con cobranzas:procesar aparece Cheques', l.includes('cheques'))
  chk('los links van a las pantallas que ya existen, sin moverlas', S.LINKS.every(x => fs.existsSync(path.join(__dirname, '..', 'modulos', x.url))))
  const h = S.htmlLink(S.LINKS[0])
  chk('un link es un <a> con su url', /<a class="ad-seccion ad-seccion--link" href="cheques\.html"/.test(h))
}

// ── La portada ─────────────────────────────────────────────────────────────
{
  const S = nuevo()
  let filtros = null
  S.__tablas.ordenes_retiro = (f) => { filtros = f; return { data: [{ id: 'a' }, { id: 'b' }, { id: 'c' }], error: null } }
  esperas.push(S.mostrarInicio().then(() => {
    const h = S.__els.get('ad-secciones').innerHTML
    chk('la portada tiene la tarjeta de Órdenes', /data-seccion="ordenes"/.test(h))
    chk('con el número de órdenes sin valorizar, en bordó', /ad-seccion__numero--atencion">3</.test(h) && /órdenes sin valorizar/.test(h))
    chk('cuenta las confirmadas pendientes de la empresa', filtros.some(x => x[1] === 'unidad_negocio_id' && x[2] === 'u-n') &&
      filtros.some(x => x[1] === 'estado' && x[2] === 'confirmada') && filtros.some(x => x[1] === 'estado_valorizacion' && x[2] === 'pendiente'))
  }))
  const T = nuevo()
  T.__tablas.ordenes_retiro = () => ({ data: null, error: { message: 'x' } })
  esperas.push(T.mostrarInicio().then(() => chk('si no se puede contar, lo dice (nunca un 0)', /No se pudo contar/.test(T.__els.get('ad-secciones').innerHTML) && !/numero[^>]*>0</.test(T.__els.get('ad-secciones').innerHTML))))
  const U = nuevo()
  U.estado.misTareas = new Map([['retiros:precios', { unidades: ['u-n'] }]])
  esperas.push(U.mostrarInicio().then(() => chk('sin retiros:ver no se consulta nada de órdenes', !U.__llamadas.consultas.some(c => c[0] === 'ordenes_retiro'))))
}

// ── La lista de órdenes y sus filtros ──────────────────────────────────────
{
  const S = nuevo()
  preparar(S)
  let filtros = null
  S.__tablas.ordenes_retiro = (f) => { filtros = f; return { data: [ORDEN, { ...ORDEN, id: 'o2', codigo: 'N-0011', estado_valorizacion: 'valorizada', total: 45000 }, { ...ORDEN, id: 'o3', codigo: 'N-0010', estado: 'anulada' }], error: null } }
  S.__tablas.orden_retiro_items = [{ orden_id: 'o1', cajas: 10 }, { orden_id: 'o1', cajas: 4 }, { orden_id: 'o2', cajas: 3 }]
  S.estado.filtros = { desde: '2026-09-01', hasta: '2026-09-30', clienteId: 'c1', estado: 'confirmada', sinValorizar: true }
  esperas.push(S.cargarOrdenes().then(() => {
    chk('filtra por fecha', filtros.some(x => x[0] === 'gte' && x[1] === 'fecha' && x[2] === '2026-09-01') && filtros.some(x => x[0] === 'lte' && x[2] === '2026-09-30'))
    chk('por cliente', filtros.some(x => x[1] === 'cliente_id' && x[2] === 'c1'))
    chk('y "solo sin valorizar"', filtros.some(x => x[1] === 'estado_valorizacion' && x[2] === 'pendiente'))
    chk('por la empresa elegida', filtros.some(x => x[1] === 'unidad_negocio_id' && x[2] === 'u-n'))
    const h = S.__els.get('ad-ordenes-lista').innerHTML
    chk('cada orden con su CÓDIGO', /N-0012/.test(h) && /N-0011/.test(h))
    chk('con fecha, cliente y cajas', /20\/09\/2026 · Distribuidora Anatolia · 14 cajas/.test(h))
    chk('"sin valorizar" en bordó', /ad-fila__importe ad-fila__importe--pendiente">sin valorizar</.test(h) && /ad-sello--pendiente">Sin valorizar/.test(h))
    chk('una valorizada con su total', /\$ 45\.000,00/.test(h) && /Valorizada/.test(h))
    chk('una anulada lo dice', /ad-fila--anulada/.test(h) && />Anulada</.test(h))
    chk('la cuenta', S.__els.get('ad-ordenes-cuenta').textContent === '3 órdenes')
  }))
}
{
  const S = nuevo()
  preparar(S)
  S.__tablas.ordenes_retiro = () => ({ data: null, error: { message: 'x' } })
  esperas.push(S.cargarOrdenes().then(() => chk('si falla, lo dice', /No se pudieron leer las órdenes/.test(S.__els.get('ad-ordenes-lista').innerHTML))))
}

// ── El detalle, los lotes ──────────────────────────────────────────────────
{
  const S = nuevo()
  preparar(S, {
    items: [...ITEMS, { id: 'i3', orden: 3, presentacion_id: 'pr2', marca_id: null, cajas: 2, unidades: 200, precio_caja: null, subtotal: null, lote: null }],
    lotes: [{ presentacion_id: 'pr1', marca_id: null, lote: '7030-1', cajas: -6 }, { presentacion_id: 'pr1', marca_id: null, lote: '7031-2', cajas: -4 },
      { presentacion_id: 'pr2', marca_id: 'm1', lote: '7032-1', cajas: -4 }, { presentacion_id: 'pr2', marca_id: null, lote: '7039-9', cajas: -2 }] })
  S.estado.misTareas.set('stock:ver', null)
  esperas.push(S.abrirOrden('o1').then(() => {
    const h = S.__els.get('ad-orden-cuerpo').innerHTML
    chk('el detalle muestra cada renglón con cono y presentación', /10 cajas · Cucurucho grande · Caja x 100 · Sin cono/.test(h) && /4 cajas · Cucurucho grande · Caja x 100 con cono · LOLO/.test(h))
    chk('y los lotes de cada renglón', /lotes 7030-1 \(6\) · 7031-2 \(4\)/.test(h) && /lotes 7032-1 \(4\)</.test(h))
    chk('el lote de un cono no se mezcla con el del cono común de la misma presentación', /Común<\/div><div class="ad-renglon__lotes">200 unidades · lotes 7039-9 \(2\)</.test(h))
    chk('quién la cargó (por v_empleados_publico, sin embed)', /Emanuel Romero/.test(h) && S.__llamadas.consultas.some(c => c[0] === 'v_empleados_publico'))
    chk('el título dice el código', S.__els.get('ad-orden-titulo').textContent === 'Orden N-0012')
    chk('con precios: "Valorizar" visible', S.__els.get('ad-btn-valorizar').hidden === false && S.__els.get('ad-btn-corregir-valor').hidden === true)
    chk('con anular: "Anular" visible', S.__els.get('ad-btn-anular').hidden === false)
  }))
}
{
  const S = nuevo()
  preparar(S)
  S.estado.misTareas = new Map([['retiros:ver', { unidades: ['u-n'] }]])
  esperas.push(S.abrirOrden('o1').then(() => {
    const h = S.__els.get('ad-orden-cuerpo').innerHTML
    chk('sin permiso de ver lotes, NO se consulta el stock y se dice', !S.__llamadas.consultas.some(c => c[0] === 'stock_terminado_movimientos') && /no se pueden ver los lotes/.test(h))
    chk('solo con ver: ni Valorizar ni Anular', S.__els.get('ad-btn-valorizar').hidden === true && S.__els.get('ad-btn-anular').hidden === true)
    chk('pero sí imprimir', S.__els.get('ad-btn-imprimir').hidden === false)
  }))
}

// ── Valorizar con la lista del cliente ──────────────────────────────────────
{
  const S = nuevo()
  chk('los precios vigentes a la fecha del retiro: el más nuevo que no sea posterior', (() => {
    const m = S.preciosVigentes(LISTA, '2026-09-20')
    return m.get('pr1') === 3000 && m.get('pr2') === 4000
  })())
  chk('un precio que empieza después del retiro no vale', S.preciosVigentes(LISTA, '2026-09-10').get('pr1') === 2500)
}
{
  const S = nuevo()
  preparar(S)
  esperas.push(S.abrirOrden('o1').then(() => S.abrirValorizar()).then(() => {
    const d = S.estado.orden
    chk('Valorizar trae los precios de la lista del cliente', d.valorizar.precios.i1 === 3000 && d.valorizar.precios.i2 === 4000)
    chk('muestra el total', S.totalValorizar(d) === 46000 && /Total \$ 46\.000,00/.test(S.__els.get('ad-orden-cuerpo').innerHTML))
    chk('saldo 80.000 + 46.000 pasa el límite de 100.000: lo AVISA', S.saldoProyectado(d) === 126000 && /pasa su límite de crédito/.test(S.__els.get('ad-orden-cuerpo').innerHTML))
    S.cambiarPrecio('i1', 1000)
    chk('corregir un precio recalcula el total', S.totalValorizar(d) === 26000)
    chk('y el aviso del límite (80.000 + 26.000 sigue pasando)', /pasa su límite/.test(S.avisoLimite(S.saldoProyectado(d), 100000, 'ARS')))
    S.cambiarPrecio('i1', 100)
    chk('con 80.000 + 17.000 ya no pasa: no avisa', S.avisoLimite(S.saldoProyectado(d), 100000, 'ARS') === null)
    let params = null
    S.__setRpc(async (n, p) => { if (n === 'valorizar_orden_retiro') { params = p; return { data: { total: 17000, moneda: 'ARS', saldo_cliente: 97000, limite_credito: 100000, supera_limite: false }, error: null } } return { data: null, error: null } })
    return S.guardarValorizacion().then(() => {
      chk('valorizar manda la orden y el precio de CADA renglón (los de la lista y los corregidos)', params && params.p_orden_id === 'o1' && params.p_precios.i1 === 100 && params.p_precios.i2 === 4000)
      chk('y avisa el total', S.__llamadas.exitos.some(x => /N-0012 valorizada: \$ 17\.000,00/.test(x)))
    })
  }))
}
{
  const S = nuevo()
  preparar(S)
  esperas.push(S.abrirOrden('o1').then(() => S.abrirValorizar()).then(async () => {
    S.__setRpc(async () => ({ data: { total: 46000, moneda: 'ARS', saldo_cliente: 126000, limite_credito: 100000, supera_limite: true }, error: null }))
    await S.guardarValorizacion()
    chk('si la base dice que supera el límite, se avisa después de valorizar', /pasa su límite de crédito: quedaría debiendo \$ 126\.000,00 y su límite es \$ 100\.000,00/.test(S.estado.orden?.aviso || ''))
  }))
}
{
  const S = nuevo()
  preparar(S)
  S.estado.clientes = [{ ...CLIENTES[1], id: 'c1' }]   // sin lista
  esperas.push(S.abrirOrden('o1').then(() => S.abrirValorizar()).then(async () => {
    const d = S.estado.orden
    chk('sin lista, los precios vienen vacíos y se dice', d.valorizar.precios.i1 === null && /no tiene una lista de precios/.test(S.__els.get('ad-orden-cuerpo').innerHTML))
    await S.guardarValorizacion()
    chk('faltando precios NO se llama a la base', !S.__llamadas.rpc.some(x => x[0] === 'valorizar_orden_retiro'))
    chk('y dice cuántos faltan, pegado al botón', /Faltan precios en 2 renglones/.test(d.valorizar.errorGuardar))
    S.cambiarPrecio('i1', -5); S.cambiarPrecio('i2', 10)
    await S.guardarValorizacion()
    chk('un precio negativo no se manda', !S.__llamadas.rpc.some(x => x[0] === 'valorizar_orden_retiro') && /negativo/.test(d.valorizar.errorGuardar))
    S.cambiarPrecio('i1', 10)
    S.__setRpc(async () => ({ data: null, error: { message: 'Faltan precios en 1 renglón(es): cargalos o asignale una lista con esos productos al cliente.' } }))
    await S.guardarValorizacion()
    chk('el error de la base va tal cual', /cargalos o asignale una lista/.test(d.valorizar.errorGuardar))
  }))
}
// Corregir una valorización: parte de los precios que ya tenía.
{
  const S = nuevo()
  preparar(S, { orden: { ...ORDEN, estado_valorizacion: 'valorizada', total: 46000 }, items: ITEMS.map(i => ({ ...i, precio_caja: i.id === 'i1' ? 3100 : 4000, subtotal: i.id === 'i1' ? 31000 : 16000 })), movs: [{ importe: 80000 }, { importe: 47000 }] })
  esperas.push(S.abrirOrden('o1').then(() => {
    chk('valorizada: "Corregir valorización" y no "Valorizar"', S.__els.get('ad-btn-corregir-valor').hidden === false && S.__els.get('ad-btn-valorizar').hidden === true)
    chk('muestra el precio y el subtotal de cada renglón y el total', /\$ 3\.100,00 x caja/.test(S.__els.get('ad-orden-cuerpo').innerHTML) && /Total \$ 46\.000,00/.test(S.__els.get('ad-orden-cuerpo').innerHTML))
    return S.abrirValorizar()
  }).then(() => {
    const d = S.estado.orden
    chk('corregir arranca con los precios que ya tenía (no los de la lista)', d.valorizar.precios.i1 === 3100)
    chk('la corrección entra por la diferencia: saldo 127.000 − 46.000 + 47.000', S.saldoProyectado(d) === 128000)
  }))
}

// ── Anular ─────────────────────────────────────────────────────────────────
{
  const S = nuevo()
  preparar(S)
  esperas.push(S.abrirOrden('o1').then(async () => {
    S.pedirAnular()
    chk('anular abre el panel del motivo', S.__els.get('ad-panel-anular').hidden === false)
    S.__els.get('ad-anular-motivo').value = 'x'
    await S.confirmarAnular()
    chk('sin motivo no se anula', !S.__llamadas.rpc.some(x => x[0] === 'anular_orden_retiro') && /Escribí por qué/.test(S.__els.get('ad-anular-error').textContent))
    S.__els.get('ad-anular-motivo').value = '  Se cargó dos veces  '
    let p = null
    S.__setRpc(async (n, q) => { if (n === 'anular_orden_retiro') p = q; return { data: null, error: null } })
    await S.confirmarAnular()
    chk('con motivo, anular_orden_retiro con el motivo limpio', p && p.p_orden_id === 'o1' && p.p_motivo === 'Se cargó dos veces')
  }))
  const T = nuevo()
  preparar(T)
  T.estado.misTareas.delete('retiros:anular')
  esperas.push(T.abrirOrden('o1').then(() => {
    T.pedirAnular()
    chk('sin retiros:anular no se puede ni pedir', !T.estado.orden.anular && T.__els.get('ad-btn-anular').hidden === true)
  }))
  const U = nuevo()
  preparar(U, { orden: { ...ORDEN, estado: 'anulada', anulada_motivo: 'error' } })
  esperas.push(U.abrirOrden('o1').then(() => {
    chk('una anulada no se valoriza ni se anula de nuevo', U.__els.get('ad-btn-valorizar').hidden === true && U.__els.get('ad-btn-anular').hidden === true)
    chk('y dice el motivo', /Anulada\. Motivo: error/.test(U.__els.get('ad-orden-cuerpo').innerHTML))
  }))
}

// ── La hoja CON precios ────────────────────────────────────────────────────
{
  const S = nuevo()
  preparar(S, { orden: { ...ORDEN, estado_valorizacion: 'valorizada', total: 46000 }, items: ITEMS.map(i => ({ ...i, precio_caja: i.id === 'i1' ? 3000 : 4000, subtotal: i.id === 'i1' ? 30000 : 16000 })) })
  esperas.push(S.abrirOrden('o1').then(() => {
    S.imprimirOrden()
    const h = S.__els.get('ad-impresion').innerHTML
    chk('imprimir desde Administración lleva PRECIOS', S.__impresiones() === 1 && /Precio x caja/.test(h) && /\$ 30\.000,00/.test(h) && /rh-total">\$ 46\.000,00/.test(h))
    chk('con la misma hoja: dos copias y la leyenda', (h.match(/<section class="rh-copia/g) || []).length === 2 && /No válido como factura/.test(h))
    chk('con el logo de la empresa de la orden', /logo-cucuruchos-nuss\.png/.test(h) && /NUSS SRL/.test(h))
    chk('y quién la cargó', /Cargó<\/span> Emanuel Romero/.test(h))
  }))
  const T = nuevo()
  preparar(T)
  esperas.push(T.abrirOrden('o1').then(() => {
    T.imprimirOrden()
    const h = T.__els.get('ad-impresion').innerHTML
    chk('sin valorizar, la hoja con precios dice "—" (nunca $ 0,00)', /Precio x caja/.test(h) && !/0,00/.test(h))
  }))
}
{
  const S = nuevo()
  preparar(S)
  S.__win.html2canvas = async () => ({ width: 1000, height: 700, toDataURL: () => 'data:,' })
  S.__win.jspdf = { jsPDF: function () { this.addImage = () => {}; this.output = () => new Blob(['%PDF']) } }
  S.__doc.querySelector = (sel) => /data-lib=/.test(sel) ? {} : null
  S.__setNav({})
  esperas.push(S.abrirOrden('o1').then(() => S.enviarOrdenAd()).then(() => {
    chk('enviar abre el mail al cliente', /^mailto:compras%40anatolia\.com/.test(S.__win.location.href))
    chk('y lo dice pegado a los botones', /Adjuntá el PDF/.test(S.__els.get('ad-orden-hoja-aviso').textContent))
  }))
  chk('Enviar desde Administración va con precios', /enviarOrden\(hoja, \{ conPrecios: true/.test(src))
}

// ── HTML malicioso ─────────────────────────────────────────────────────────
{
  const S = nuevo()
  S.estado.clientes = [{ id: 'c1', nombre: marca('cliente'), razon_social: marca('razon'), lista_precio_id: null }]
  S.estado.catalogo = { productos: [{ id: 'p1', nombre: marca('producto') }], presentaciones: [{ id: 'pr1', producto_id: 'p1', nombre: marca('presentacion'), con_cono: true }], marcas: [{ id: 'm1', nombre: marca('cono') }] }
  S.estado.nombres.set('emp-9', marca('cargo'))
  const o = { ...ORDEN, codigo: marca('codigo'), transporte: marca('transporte'), observaciones: marca('obs'), estado: 'anulada', anulada_motivo: marca('motivo'), estado_valorizacion: 'valorizada', total: 1 }
  const d = { orden: o, items: [{ id: marca('item'), presentacion_id: 'pr1', marca_id: 'm1', cajas: 1, unidades: 1, precio_caja: 1, subtotal: 1 }], lotes: [{ presentacion_id: 'pr1', marca_id: 'm1', lote: marca('lote'), cajas: -1 }], valorizar: null }
  chequearMarcas(chk, 'detalle de la orden', S.htmlDetalleOrden(d, S.estado.catalogo), ['cliente', 'razon', 'producto', 'presentacion', 'cono', 'lote', 'cargo', 'transporte', 'obs', 'motivo'])
  chequearMarcas(chk, 'fila de orden', S.htmlFilaOrden({ ...o, cliente_id: 'c1', cajas: 1 }), ['codigo', 'cliente'])
  chequearMarcas(chk, 'filtro de clientes', S.htmlOpcionesClientes(S.estado.clientes, ''), ['cliente'])
  S.estado.empresas = [{ id: 'u-n', nombre: marca('empresa') }, { id: 'u-d', nombre: 'Otra' }]
  S.estado.misTareas.set('retiros:ver', { todas: true })
  chequearMarcas(chk, 'selector de empresas', S.htmlEmpresas(), ['empresa'])
  d.valorizar = { precios: {}, desdeLista: new Set(), sinLista: false, saldo: 0, limite: null, cargando: false, error: marca('error-v'), errorGuardar: marca('error-g') }
  chequearMarcas(chk, 'valorizar', S.htmlValorizar(d), ['error-v', 'error-g'])
}

fin()
