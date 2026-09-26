// LA CARGA de órdenes de retiro (modulos/retiros.html, 26/09/2026): el
// depósito, desde el celular, SIN NADA DE PLATA.
//
// Empresa primero (una no pregunta, varias sí, y cambiar con la orden a medio
// cargar pide confirmación y la vacía), cliente por nombre / razón social /
// apodo, renglones producto → cono → presentación → cajas → lote opcional,
// resumen sin precios, una sola llamada a registrar_orden_retiro con el MISMO
// uuid en cada reintento, y el aviso de stock que no bloquea.
//
//   node pruebas/test-retiros-carga.js

const path = require('path')
const fs = require('fs')
const { construirRetiros } = require('./sandbox-retiros')
const { arnes, marca, chequearMarcas } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/retiros.html')
const src = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${src.length} bytes)`)
const { chk, esperas, fin } = arnes()
const nuevo = () => construirRetiros(ARCHIVO)

const CAT = {
  productos: [
    { id: 'p-cuc', nombre: 'Cucurucho grande', tipo_masa: 'Común', orden: 1 },
    { id: 'p-cho', nombre: 'Cucurucho choco', tipo_masa: 'Chocolate', orden: 2 },
    { id: 'p-cap', nombre: 'Capelina', tipo_masa: 'Común', orden: 3 },
  ],
  presentaciones: [
    { id: 'pr-cuc-sin', producto_id: 'p-cuc', nombre: 'Caja x 100', con_cono: false, unidades_por_caja: 100 },
    { id: 'pr-cuc-con', producto_id: 'p-cuc', nombre: 'Caja x 100 con cono', con_cono: true, unidades_por_caja: 100 },
    { id: 'pr-cho-sin', producto_id: 'p-cho', nombre: 'Caja x 50', con_cono: false, unidades_por_caja: 50 },
    { id: 'pr-cap-a', producto_id: 'p-cap', nombre: 'Caja x 200', con_cono: false, unidades_por_caja: 200 },
    { id: 'pr-cap-b', producto_id: 'p-cap', nombre: 'Media caja', con_cono: false, unidades_por_caja: 100 },
  ],
  marcas: [{ id: 'm-lolo', nombre: 'LOLO', estado_alta: 'aprobada' }],
}
const CLIENTES = [
  { id: 'c1', nombre: 'Distribuidora Anatolia', razon_social: 'ANATOLIA SRL', apodos: ['el Turco'], cuit: '30712345678', domicilio: 'Av. Siempreviva 742', localidad: 'Córdoba', email: 'compras@anatolia.com', transporte_habitual: 'Expreso Norte', activo: true },
  { id: 'c2', nombre: 'Kiosco Pepe', razon_social: null, apodos: [], cuit: null, domicilio: null, localidad: null, email: null, transporte_habitual: null, activo: true },
]

function conEmpresa(S, id = 'u-n') {
  S.estado.empresaId = id
  S.estado.catalogo = CAT
  S.estado.catalogoEmpresa = id
  S.estado.clientes = CLIENTES
  S.estado.form = S.formVacio()
  return S.estado.form
}

// Un renglón completo: Cucurucho grande sin cono, 10 cajas.
function cargarRenglon(S, i = 0, cajas = 10) {
  S.elegirProductoRenglon(i, 'p-cuc')
  S.estado.form.renglones[i].cajas = cajas
}

// ── La empresa primero ──────────────────────────────────────────────────────
{
  const S = nuevo()
  S.estado.misTareas = new Map([['retiros:cargar', { unidades: ['u-n'] }]])
  chk('con retiros:cargar en una sola empresa, esa es la única', JSON.stringify(S.empresasDeCarga().map(e => e.id)) === '["u-n"]')
  S.empezarOrden()
  chk('UNA empresa NO pregunta: va derecho a cargar', S.estado.vista === 'rt-vista-form' && S.estado.empresaId === 'u-n')
  chk('y la empresa se ve arriba', S.__els.get('rt-empresa-actual').hidden === false && /Cucuruchos Nuss/.test(S.__els.get('rt-empresa-actual').innerHTML))
  chk('con una sola empresa no hay "Cambiar"', !/rt-btn-cambiar-empresa/.test(S.htmlEmpresaActual()))
}
{
  const S = nuevo()
  S.estado.misTareas = new Map([['retiros:cargar', { todas: true }]])
  S.empezarOrden()
  chk('VARIAS empresas preguntan primero', S.estado.vista === 'rt-vista-empresa' && S.estado.empresaId === null)
  const h = S.__els.get('rt-empresas').innerHTML
  chk('la pregunta ofrece las dos empresas', /data-empresa="u-n"/.test(h) && /data-empresa="u-d"/.test(h))
  chk('con el logo de cada una', /src="\.\.\/logo-cucuruchos-nuss\.png"/.test(h) && /src="\.\.\/logo-dolce-pasta\.png"/.test(h))
  S.elegirEmpresa('u-d')
  chk('elegir una empresa abre la carga de esa empresa', S.estado.vista === 'rt-vista-form' && S.estado.empresaId === 'u-d')
  chk('se recuerda la última', S.__ls.get(S.CLAVE_EMPRESA) === 'u-d')
  chk('con varias hay "Cambiar" arriba', /rt-btn-cambiar-empresa/.test(S.htmlEmpresaActual()))
  // La próxima orden vuelve a preguntar, con la última marcada y primera.
  S.estado.form = null
  S.empezarOrden()
  const h2 = S.__els.get('rt-empresas').innerHTML
  chk('una orden nueva vuelve a preguntar', S.estado.vista === 'rt-vista-empresa')
  chk('la última usada va primera', h2.indexOf('data-empresa="u-d"') < h2.indexOf('data-empresa="u-n"'))
  chk('y marcada como la última', /data-empresa="u-d" aria-pressed="true"/.test(h2) && /la última que usaste/.test(h2))
  chk('una empresa que no está en la lista no se elige', (S.elegirEmpresa('u-zzz'), S.estado.empresaId === null))
}
{
  const S = nuevo()
  S.estado.misTareas = new Map([['retiros:cargar', { unidades: ['u-n'] }], ['retiros:ver', { todas: true }]])
  chk('solo cuentan las empresas donde CARGA (ver no alcanza)', JSON.stringify(S.empresasDeCarga().map(e => e.id)) === '["u-n"]')
  S.estado.miRolApp = 'super_admin'
  S.estado.misTareas = new Map()
  chk('super_admin carga en todas', S.empresasDeCarga().length === 2)
}

// ── Cambiar de empresa con la orden a medio cargar ─────────────────────────
{
  const S = nuevo()
  S.estado.misTareas = new Map([['retiros:cargar', { todas: true }]])
  const f = conEmpresa(S, 'u-n')
  chk('una orden vacía no tiene datos', S.formTieneDatos(f) === false)
  S.elegirCliente('c1')
  chk('con cliente elegido ya tiene datos', S.formTieneDatos(f) === true)
  S.elegirEmpresa('u-d')
  chk('cambiar con la orden a medio cargar NO cambia: pide confirmación', S.estado.empresaId === 'u-n' && S.estado.empresaPendiente === 'u-d')
  chk('el panel de confirmación se ve', S.__els.get('rt-panel-cambiar').hidden === false)
  chk('la orden sigue intacta mientras tanto', S.estado.form === f && f.clienteId === 'c1')
  S.cancelarCambioEmpresa()
  chk('cancelar deja todo como estaba', S.estado.empresaId === 'u-n' && S.estado.empresaPendiente === null && S.estado.form === f)
  chk('y esconde el panel', S.__els.get('rt-panel-cambiar').hidden === true)
  S.elegirEmpresa('u-d')
  S.confirmarCambioEmpresa()
  chk('confirmar cambia de empresa', S.estado.empresaId === 'u-d')
  chk('y VACÍA la orden', S.estado.form && S.estado.form !== f && S.estado.form.clienteId === null && S.estado.form.renglones.length === 1 && !S.estado.form.renglones[0].productoId)
  chk('con un uuid nuevo', S.estado.form.uuid !== f.uuid)
  chk('y se olvida el catálogo, los clientes y los lotes de la otra empresa', S.estado.catalogoEmpresa !== 'u-d' || S.estado.catalogo === null)
}
{
  const S = nuevo()
  S.estado.misTareas = new Map([['retiros:cargar', { todas: true }]])
  const f = conEmpresa(S, 'u-n')
  S.elegirEmpresa('u-d')
  chk('sin datos cargados, cambiar de empresa no pregunta', S.estado.empresaId === 'u-d' && S.estado.empresaPendiente === null)
  chk('la orden vacía se reemplaza por una de la empresa nueva', S.estado.form !== f)
}

// ── El cliente ─────────────────────────────────────────────────────────────
{
  const S = nuevo()
  conEmpresa(S)
  chk('busca por nombre', S.clientesFiltrados(CLIENTES, 'anatolia').map(c => c.id).join() === 'c1')
  chk('busca por razón social', S.clientesFiltrados(CLIENTES, 'srl').map(c => c.id).join() === 'c1')
  chk('busca por apodo, sin acentos ni mayúsculas', S.clientesFiltrados(CLIENTES, 'TURCO').map(c => c.id).join() === 'c1')
  chk('un cliente que no coincide lo dice', /Ningún cliente coincide/.test(S.htmlResultadosClientes('zzz')))
  S.elegirCliente('c1')
  const f = S.estado.form
  chk('elegir el cliente trae su transporte habitual', f.transporte === 'Expreso Norte' && S.__els.get('rt-transporte').value === 'Expreso Norte')
  S.cambiarCliente()
  f.transporte = 'Mi flete'
  S.elegirCliente('c1')
  chk('un transporte escrito a mano no se pisa', f.transporte === 'Mi flete')
  const T = nuevo()
  let sel = ''
  T.__tablas.clientes = (fl) => { sel = (fl.find(x => x[0] === 'select') || [])[1] || ''; return { data: [], error: null } }
  esperas.push(T.leerClientes('u-n').then(() => chk('los clientes se leen SIN nada de plata (ni límite, ni lista)',
    !!sel && !/limite|lista_precio|saldo|precio|credito|plazo/i.test(sel) && /transporte_habitual/.test(sel) && /email/.test(sel), sel)))
}

// ── Los renglones ──────────────────────────────────────────────────────────
{
  const S = nuevo()
  const f = conEmpresa(S)
  const r = f.renglones[0]
  chk('arranca con un renglón SIN CONO', r.conCono === false && r.productoId === null)
  S.elegirProductoRenglon(0, 'p-cuc')
  chk('con una sola presentación sin cono, se elige sola', r.presentacionId === 'pr-cuc-sin')
  let h = S.htmlRenglon(r, 0, CAT, false)
  chk('sin cono no hay buscador de conos', !/data-r-cono-buscar/.test(h))
  S.elegirConoRenglon(0, true)
  h = S.htmlRenglon(r, 0, CAT, false)
  chk('con cono aparece el buscador de conos a un toque', /data-r-cono-buscar="0"/.test(h) && /Cono común/.test(h))
  chk('con cono cambia la presentación', r.presentacionId === 'pr-cuc-con')
  S.elegirMarcaRenglon(0, 'm-lolo')
  chk('elegir un cono', r.marcaId === 'm-lolo')
  chk('el cono se nombra', S.textoCono(CAT, true, 'm-lolo') === 'LOLO' && S.textoCono(CAT, true, null) === 'Común' && S.textoCono(CAT, false, 'm-lolo') === 'Sin cono')
  S.elegirConoRenglon(0, false)
  chk('volver a sin cono olvida el cono', r.marcaId === null)
  const hp = S.htmlProductosRenglon(0, CAT)
  chk('el chocolate va abajo, separado por una línea', hp.indexOf('p-cho') > hp.indexOf('rt-separador') && hp.indexOf('rt-separador') > hp.indexOf('p-cap'))
  chk('lo decide el tipo de masa', S.esProductoChocolate({ tipo_masa: 'Chocolate' }) && !S.esProductoChocolate({ nombre: 'Chocolatoso', tipo_masa: 'Común' }))
  S.elegirProductoRenglon(0, 'p-cap')
  chk('con dos presentaciones no se elige sola', r.presentacionId === null)
  S.elegirPresentacionRenglon(0, 'pr-cuc-sin')
  chk('una presentación de otro producto no se elige', r.presentacionId === null)
  S.elegirPresentacionRenglon(0, 'pr-cap-b')
  chk('elegir la presentación', r.presentacionId === 'pr-cap-b')
}
{
  const S = nuevo()
  chk('las cajas son ENTERAS', S.DECIMALES_CAJAS === 0)
  const f = conEmpresa(S)
  cargarRenglon(S)
  f.renglones[0].cajas = 2.5
  chk('media caja no pasa', S.faltanRenglon(f.renglones[0]) === 'poné las cajas')
  f.renglones[0].cajas = 0
  chk('cero cajas no pasa', S.faltanRenglon(f.renglones[0]) === 'poné las cajas')
  f.renglones[0].cajas = 10
  chk('diez cajas pasan', S.faltanRenglon(f.renglones[0]) === null)
  chk('sin cliente falta el cliente', S.faltanOrden(f).includes('Elegí el cliente.'))
  S.agregarRenglon()
  chk('agregar suma un renglón nuevo, sin cono', f.renglones.length === 2 && f.renglones[1].conCono === false)
  chk('el renglón incompleto se nombra', S.faltanOrden(f).some(x => /Renglón 2: elegí el producto/.test(x)))
  S.quitarRenglon(1)
  chk('quitar lo saca', f.renglones.length === 1)
}

// ── Los lotes: opcionales, los más viejos primero ───────────────────────────
{
  const S = nuevo()
  const movs = [
    { lote: '7030-1', cajas: 20, fecha: '2026-09-20', created_at: '2026-09-20T10:00:00Z' },
    { lote: '7030-1', cajas: -5, fecha: '2026-09-21', created_at: '2026-09-21T10:00:00Z' },
    { lote: '7010-2', cajas: 8, fecha: '2026-09-10', created_at: '2026-09-10T10:00:00Z' },
    { lote: '7001-1', cajas: 4, fecha: '2026-09-01', created_at: '2026-09-01T10:00:00Z' },
    { lote: '7001-1', cajas: -4, fecha: '2026-09-02', created_at: '2026-09-02T10:00:00Z' },
    { lote: 'SIN STOCK', cajas: -3, fecha: '2026-09-22', created_at: '2026-09-22T10:00:00Z' },
    // Aunque quedara con saldo (una anulación que devuelve), no es un lote.
    { lote: 'SIN STOCK', cajas: 5, fecha: '2026-09-23', created_at: '2026-09-23T10:00:00Z' },
  ]
  const l = S.lotesConStock(movs)
  chk('solo los lotes con stock (sin el agotado)', l.map(x => x.lote).join() === '7010-2,7030-1')
  chk('los más viejos primero', l[0].lote === '7010-2')
  chk('con su saldo', l.find(x => x.lote === '7030-1').saldo === 15)
  chk('"SIN STOCK" no es un lote para elegir', !l.some(x => x.lote === 'SIN STOCK'))
}
{
  const S = nuevo()
  S.estado.misTareas = new Map([['retiros:cargar', { unidades: ['u-n'] }], ['stock:ver', { unidades: ['u-n'] }]])
  const f = conEmpresa(S)
  cargarRenglon(S)
  let filtros = null
  S.__tablas.stock_terminado_movimientos = (fl) => { filtros = fl; return { data: [
    { lote: '7010-2', cajas: 8, fecha: '2026-09-10', created_at: '2026-09-10T10:00:00Z' },
    { lote: '7030-1', cajas: 15, fecha: '2026-09-20', created_at: '2026-09-20T10:00:00Z' }], error: null } }
  chk('con stock:ver se pueden ver los lotes', S.puedeVerLotes() === true)
  S.abrirLotes(0)
  esperas.push(new Promise(r => setTimeout(r, 0)).then(() => {
    chk('los lotes se leen de esa empresa, presentación y cono (sin cono = marca null)', filtros &&
      filtros.some(x => x[0] === 'eq' && x[1] === 'unidad_negocio_id' && x[2] === 'u-n') &&
      filtros.some(x => x[0] === 'eq' && x[1] === 'presentacion_id' && x[2] === 'pr-cuc-sin') &&
      filtros.some(x => x[0] === 'is' && x[1] === 'marca_id' && x[2] === null))
    const h = S.htmlLoteRenglon(f.renglones[0], 0)
    chk('se ofrecen los lotes con su saldo', /data-lote="7010-2"/.test(h) && /data-lote="7030-1"/.test(h) && /15 cajas/.test(h))
    S.elegirLote(0, 'no-existe')
    chk('un lote que no está en la lista no se elige', f.renglones[0].lote === null)
    S.elegirLote(0, '7030-1')
    chk('elegir un lote', f.renglones[0].lote === '7030-1' && f.renglones[0].eligiendoLote === false)
    chk('el payload lleva el lote elegido', JSON.stringify(S.itemParaBase(f.renglones[0])) === '{"presentacion_id":"pr-cuc-sin","marca_id":null,"cajas":10,"lote":"7030-1"}')
    S.quitarLote(0)
    chk('"Usar los más viejos" lo suelta', f.renglones[0].lote === null)
    chk('sin lote el payload NO lleva la clave lote', JSON.stringify(S.itemParaBase(f.renglones[0])) === '{"presentacion_id":"pr-cuc-sin","marca_id":null,"cajas":10}')
    S.elegirLote(0, '7010-2')
    S.elegirConoRenglon(0, true)
    chk('pasar a "con cono" suelta el lote (es stock de otro cono)', f.renglones[0].lote === null)
    f.renglones[0].lote = '7010-2'
    S.elegirMarcaRenglon(0, 'm-lolo')
    chk('cambiar de cono suelta el lote', f.renglones[0].lote === null)
  }))
}
{
  const S = nuevo()
  S.estado.misTareas = new Map([['retiros:cargar', { unidades: ['u-n'] }]])
  const f = conEmpresa(S)
  cargarRenglon(S)
  chk('solo con retiros:cargar NO se pueden ver los lotes', S.puedeVerLotes() === false)
  S.abrirLotes(0)
  chk('y "Elegir lote" lo dice en vez de mostrar una lista vacía', /no se pueden ver los lotes/.test(S.htmlLoteRenglon(f.renglones[0], 0)))
  esperas.push(new Promise(r => setTimeout(r, 0)).then(() =>
    chk('sin consultar la tabla (las filas no llegarían y se leería "no hay")', !S.__llamadas.consultas.some(c => c[0] === 'stock_terminado_movimientos'))))
  S.estado.misTareas = new Map([['retiros:cargar', { unidades: ['u-n'] }], ['produccion:ver', null]])
  chk('con una tarea de Producción sí', S.puedeVerLotes() === true)
}

// ── El payload, SIN PLATA, y el mismo uuid en cada reintento ─────────────────
{
  const S = nuevo()
  const f = conEmpresa(S)
  S.elegirCliente('c1')
  cargarRenglon(S, 0, 10)
  S.agregarRenglon()
  S.elegirProductoRenglon(1, 'p-cuc')
  S.elegirConoRenglon(1, true)
  S.elegirMarcaRenglon(1, 'm-lolo')
  f.renglones[1].cajas = 4
  f.observaciones = 'Paga en la entrega'
  const p = S.parametrosRegistrar(f)
  chk('una sola llamada con todos los renglones', p.p_items.length === 2)
  chk('el cliente', p.p_cliente_id === 'c1')
  chk('la fecha es hoy en Argentina', p.p_fecha === S.hoyArgentina())
  chk('el transporte del cliente', p.p_transporte === 'Expreso Norte')
  chk('el uuid de la orden', p.p_client_uuid === f.uuid && /^[0-9a-f-]{36}$/.test(f.uuid))
  chk('el renglón con cono lleva la marca', p.p_items[1].marca_id === 'm-lolo' && p.p_items[1].cajas === 4)
  chk('el renglón sin cono lleva marca null', p.p_items[0].marca_id === null)
  chk('sin cono la marca va null aunque haya quedado una elegida', S.itemParaBase({ presentacionId: 'x', conCono: false, marcaId: 'm-lolo', cajas: 1 }).marca_id === null)
  chk('la fecha usa la zona de Argentina', /timeZone: ZONA_AR/.test(src) && S.ZONA_AR === 'America/Argentina/Buenos_Aires')
  const texto = JSON.stringify(p)
  chk('NINGÚN dato de plata en el payload', !/precio|importe|total|saldo|subtotal|credito|lista/i.test(texto))
  chk('las claves del renglón son solo producto, cono, cajas (y lote si se eligió)', p.p_items.every(x => Object.keys(x).every(k => ['presentacion_id', 'marca_id', 'cajas', 'lote'].includes(k))))
}
{
  const S = nuevo()
  const f = conEmpresa(S)
  S.elegirCliente('c1')
  cargarRenglon(S, 0, 10)
  let vez = 0
  S.__setRpc(async (n) => {
    if (n === 'registrar_orden_retiro') {
      vez++
      if (vez === 1) return { data: null, error: { message: 'TypeError: Failed to fetch' } }
      return { data: { orden_id: 'o-1', numero: 12, codigo: 'N-0012', stock_insuficiente: [] }, error: null }
    }
    if (n === 'mis_ordenes_retiro') return { data: [], error: null }
    return { data: null, error: null }
  })
  const uuid = f.uuid
  esperas.push(S.confirmar().then(async () => {
    const err = S.__els.get('rt-confirmar-error')
    chk('si se corta la conexión, lo dice y no se pierde la orden', err.hidden === false && /se cortó la conexión/.test(err.textContent) && S.estado.form === f)
    chk('y dice que reintentar no duplica', /no se duplica/.test(err.textContent))
    chk('el botón vuelve a quedar habilitado', S.__els.get('rt-confirmar').disabled === false)
    await S.confirmar()
    const llamadas = S.__llamadas.rpc.filter(x => x[0] === 'registrar_orden_retiro')
    chk('el reintento manda el MISMO uuid', llamadas.length === 2 && llamadas[0][1].p_client_uuid === uuid && llamadas[1][1].p_client_uuid === uuid)
    chk('confirmada, se muestra el código grande', S.estado.vista === 'rt-vista-hecho' && /rt-codigo-grande">N-0012</.test(S.__els.get('rt-hecho').innerHTML))
    chk('el código, nunca el número pelado', !/Nº\s*12|N°\s*12/.test(S.__els.get('rt-hecho').innerHTML) && S.__llamadas.exitos.some(x => /N-0012/.test(x)))
    chk('la orden y su borrador se limpian', S.estado.form === null && !S.__ls.has(S.CLAVE_BORRADOR))
    // Una orden nueva, un uuid nuevo.
    S.estado.empresaId = 'u-n'
    S.aplicarEmpresa('u-n')
    chk('la orden siguiente tiene OTRO uuid', S.estado.form.uuid !== uuid)
  }))
}
{
  const S = nuevo()
  const f = conEmpresa(S)
  S.elegirCliente('c1')
  cargarRenglon(S, 0, 10)
  S.__setRpc(async () => ({ data: null, error: { code: 'P0001', message: 'Poné las cajas del renglón 1.' } }))
  esperas.push(S.confirmar().then(() => {
    const err = S.__els.get('rt-confirmar-error')
    chk('un error de la base se muestra TAL CUAL, pegado al botón', err.textContent === 'Poné las cajas del renglón 1.' && err.hidden === false)
    chk('y la orden sigue', S.estado.form === f)
  }))
}

// ── El aviso de stock, que NO bloquea ───────────────────────────────────────
{
  const S = nuevo()
  conEmpresa(S)
  S.elegirCliente('c1')
  cargarRenglon(S, 0, 10)
  S.__setRpc(async (n) => n === 'registrar_orden_retiro'
    ? { data: { orden_id: 'o-2', numero: 13, codigo: 'N-0013', stock_insuficiente: [{ renglon: 1, producto: 'Cucurucho grande', presentacion: 'Caja x 100', pedidas: 10, faltaron: 3 }] }, error: null }
    : { data: [], error: null })
  esperas.push(S.confirmar().then(() => {
    const h = S.__els.get('rt-hecho').innerHTML
    chk('con stock insuficiente la orden SALE IGUAL (vista de hecho, con código)', S.estado.vista === 'rt-vista-hecho' && /N-0013/.test(h))
    chk('lo que faltó se dice en bordó', /rt-aviso--grave/.test(h) && /faltaron 3 de 10 cajas/.test(h) && /salió igual/.test(h))
  }))
}
{
  const S = nuevo()
  chk('sin faltantes no hay aviso', S.htmlFaltantes([]) === '' && S.htmlFaltantes(null) === '')
  const o = { renglones: [{ producto: 'A', presentacion: 'B', cajas: 5, lotes: [{ lote: '7001-1', cajas: 2 }, { lote: 'SIN STOCK', cajas: 3 }] }] }
  chk('en un reintento lo que faltó se deduce del lote "SIN STOCK"', JSON.stringify(S.faltantesDeLotes(o)) === JSON.stringify([{ renglon: 1, producto: 'A', presentacion: 'B', pedidas: 5, faltaron: 3 }]))
}

// ── El resumen, SIN PRECIOS, y nada de plata en ninguna pantalla ─────────────
{
  const S = nuevo()
  const f = conEmpresa(S)
  S.elegirCliente('c1')
  cargarRenglon(S, 0, 10)
  S.revisar()
  chk('revisar con todo completo muestra el resumen', S.estado.vista === 'rt-vista-resumen')
  const h = S.__els.get('rt-resumen').innerHTML
  chk('el resumen dice el cliente, el transporte y las cajas', /Distribuidora Anatolia/.test(h) && /Expreso Norte/.test(h) && /10 cajas/.test(h))
  chk('y que sale de los lotes más viejos', /De los lotes más viejos/.test(h))
  const todo = [...S.__els.values()].map(e => `${e.innerHTML} ${e.textContent}`).join(' ') + S.htmlRenglon(f.renglones[0], 0, CAT, true)
  chk('NINGUNA pantalla de la carga dice precio, saldo, importe o $', !/precio|saldo|importe|subtotal|\$\s?\d|crédito|lista de precios/i.test(todo))
}
{
  const S = nuevo()
  chk('el HTML de la carga no tiene ningún campo de plata', !/(precio|importe|saldo|subtotal)/i.test(src.slice(src.indexOf('<body'), src.indexOf('<script type="module">')).replace(/<!--[\s\S]*?-->/g, '')))
  chk('la carga nunca llama a valorizar ni lee listas de precios', !/valorizar_orden_retiro|lista_precios|cliente_movimientos|clientes_con_saldo|cuenta_cliente/.test(src))
  chk('la hoja de la carga se arma con conPrecios: false', /htmlHoja\(ordenParaHoja\(o, \{ cliente \}\), \{ conPrecios: false/.test(src) && !/conPrecios: true/.test(src))
}
{
  const S = nuevo()
  conEmpresa(S)
  S.estado.form.intentado = true
  S.revisar()
  chk('con lo que falta, revisar NO avanza', S.estado.vista !== 'rt-vista-resumen')
  chk('y dice qué falta pegado al botón', S.__els.get('rt-form-error').hidden === false && /Elegí el cliente/.test(S.__els.get('rt-form-error').textContent))
  chk('el botón de revisar no se deshabilita por lo que falta', !/rt-revisar'\)\.disabled/.test(src))
}

{
  const S = nuevo()
  const f = conEmpresa(S)
  esperas.push(S.confirmar().then(() => {
    chk('confirmar con algo que falta NO llama a la base', !S.__llamadas.rpc.some(x => x[0] === 'registrar_orden_retiro'))
    chk('y vuelve a la carga', S.estado.vista === 'rt-vista-form' && S.estado.form === f)
  }))
}

// ── El borrador ─────────────────────────────────────────────────────────────
{
  const S = nuevo()
  const f = conEmpresa(S)
  S.elegirCliente('c1')
  cargarRenglon(S, 0, 7)
  S.guardarBorrador()
  const b = S.leerBorrador()
  chk('el borrador guarda la empresa, el cliente y el uuid', b && b.empresaId === 'u-n' && b.form.clienteId === 'c1' && b.form.uuid === f.uuid)
  const T = nuevo()
  T.__ls.set(T.CLAVE_BORRADOR, S.__ls.get(S.CLAVE_BORRADOR))
  chk('al volver a abrir, se retoma con el MISMO uuid', T.retomarBorrador() === true && T.estado.form.uuid === f.uuid && T.estado.empresaId === 'u-n')
  const U = nuevo()
  U.__ls.set(U.CLAVE_BORRADOR, '{roto')
  chk('un borrador roto no rompe nada', U.leerBorrador() === null && U.retomarBorrador() === false)
  const V = nuevo()
  V.__ls.set(V.CLAVE_BORRADOR, JSON.stringify({ empresaId: 'u-d', form: { uuid: 'x', renglones: [] } }))
  chk('un borrador de una empresa donde ya no carga no se retoma', V.retomarBorrador() === false)
}

// ── La fábrica de pruebas ──────────────────────────────────────────────────
{
  const S = nuevo()
  S.estado.miRolApp = 'super_admin'
  S.estado.empresas = [...S.estado.empresas, { id: 'u-x', nombre: 'Pruebas (robot)', prefijo: 'X', logo_url: null }]
  S.estado.fabrica = { ok: true, unidades: new Set(['u-x']), personas: new Set(), soyDePrueba: false }
  chk('la fábrica de pruebas NO aparece para una cuenta real (tampoco super_admin)', !S.empresasDeCarga().some(e => e.id === 'u-x'))
  S.estado.fabrica = { ok: true, unidades: new Set(['u-x']), personas: new Set(), soyDePrueba: true }
  chk('una cuenta de la fábrica de pruebas sí la ve', S.empresasDeCarga().some(e => e.id === 'u-x'))
}

// ── HTML malicioso en cada render ──────────────────────────────────────────
{
  const S = nuevo()
  S.estado.misTareas = new Map([['retiros:cargar', { todas: true }], ['stock:ver', null]])
  S.estado.empresas = [{ id: 'u-n', nombre: marca('empresa'), logo_url: marca('logo') }, { id: 'u-d', nombre: 'Otra', logo_url: null }]
  S.estado.empresaId = 'u-n'
  const malos = [{ id: 'c1', nombre: marca('cliente'), razon_social: marca('razon'), apodos: [marca('apodo')], localidad: marca('localidad'), transporte_habitual: 'x', activo: true }]
  S.estado.clientes = malos
  const cat = {
    productos: [{ id: 'p1', nombre: marca('producto'), tipo_masa: 'Común' }, { id: 'p2', nombre: marca('producto-choco'), tipo_masa: 'Chocolate' }],
    presentaciones: [{ id: 'pr1', producto_id: 'p1', nombre: marca('presentacion'), con_cono: true, unidades_por_caja: 10 }],
    marcas: [{ id: 'm1', nombre: marca('cono') }],
  }
  S.estado.catalogo = cat
  S.estado.form = S.formVacio()
  const h1 = S.htmlEmpresas() + S.htmlEmpresaActual()
  chequearMarcas(chk, 'empresas', h1, ['empresa'])
  chk('un logo_url malicioso no llega a un src', !/data-xss="logo"/.test(h1) && !/src="\.\.\/"/.test(h1))
  const h2 = S.htmlResultadosClientes('') + S.htmlResultadosClientes(marca('busqueda'))
  chequearMarcas(chk, 'resultados de clientes', h2, ['cliente', 'razon', 'apodo', 'localidad', 'busqueda'])
  S.estado.form.clienteId = 'c1'
  chequearMarcas(chk, 'cliente elegido', S.htmlClienteElegido(S.estado.form), ['cliente', 'razon'])
  const r = S.estado.form.renglones[0]
  chequearMarcas(chk, 'productos', S.htmlProductosRenglon(0, cat), ['producto', 'producto-choco'])
  r.productoId = 'p1'; r.conCono = true; r.presentacionId = 'pr1'; r.marcaBusqueda = marca('cono-buscado')
  chequearMarcas(chk, 'renglón con cono', S.htmlRenglon(r, 0, cat, true), ['producto', 'presentacion', 'cono-buscado'])
  r.marcaBusqueda = ''
  chequearMarcas(chk, 'conos', S.htmlMarcasRenglon(r, 0, cat), ['cono'])
  S.estado.lotes.set(S.claveLotes('pr1', null), { cargando: false, error: null, lista: [{ lote: marca('lote'), saldo: 3, desde: '2026-09-01' }] })
  r.eligiendoLote = true
  chequearMarcas(chk, 'lotes', S.htmlLoteRenglon(r, 0), ['lote'])
  r.eligiendoLote = false; r.lote = marca('lote-elegido')
  chequearMarcas(chk, 'lote elegido', S.htmlLoteRenglon(r, 0), ['lote-elegido'])
  S.estado.form.transporte = marca('transporte'); S.estado.form.observaciones = marca('obs')
  r.marcaId = 'm1'
  chequearMarcas(chk, 'resumen', S.htmlResumen(S.estado.form, cat), ['empresa', 'cliente', 'transporte', 'obs', 'producto', 'presentacion', 'cono', 'lote-elegido'])
  chequearMarcas(chk, 'faltantes', S.htmlFaltantes([{ renglon: 1, producto: marca('f-prod'), presentacion: marca('f-pres'), pedidas: 3, faltaron: 1 }]), ['f-prod', 'f-pres'])
  chequearMarcas(chk, 'hecho', S.htmlHecho({ codigo: marca('codigo'), cliente: { nombre: marca('h-cliente') }, faltantes: [] }), ['codigo', 'h-cliente'])
  S.estado.errorClientes = marca('error-clientes')
  chequearMarcas(chk, 'error de clientes', S.htmlResultadosClientes(''), ['error-clientes'])
}

fin()
