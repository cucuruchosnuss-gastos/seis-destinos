// LOS ACOPIOS EN ADMINISTRACIÓN (27/10/2026, rama ci-prueba/acopios). La
// sección "Acopios" (solo en una fábrica con algún acopio o SIN control de
// stock, con retiros:ver o precios): activos arriba con "Quedan N de M cajas"
// y su barra, terminados abajo, anulados al final cerrados, el filtro por
// cliente; el detalle con cada retiro (fecha, orden, N° de acopio, cajas) y
// Anular con motivo (solo sin retiros); "Nuevo acopio" (retiros:precios) con
// el buscador de clientes, el catálogo de la Carga sin insumos, el cono,
// cajas, fecha, remito, factura y el precio opcional. En la cuenta del
// cliente, sus acopios activos y la "Cuenta en el grupo"
// (cuenta_cliente_consolidada); "(también en Nuss)" en los buscadores; los
// tipos 'acopio' / 'anulacion_acopio'; y en la revisión de un remito de
// talonario Acopio, el saldo al lado de cada renglón (en amarillo si no hay o
// no alcanza). Se EJECUTAN las funciones reales, con texto malicioso donde va
// algo de la base.
//
//   node pruebas/test-administracion-acopios.js
'use strict'

const path = require('path')
const { construirAdministracion } = require('./sandbox-administracion')
const { arnes, leer, marca, chequearMarcas } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/administracion.html')
const src = leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

// Lo de la revisión de remitos que usa el saldo del acopio.
const FUNCIONES_REMITO = [
  'renglonDesdeItem', 'formDesdeRemito', 'htmlRenglonRemito', 'htmlSelectorRemito', 'htmlOpcionesRemito', 'htmlMarcasRemito', 'htmlConoRemito',
  'filasLotesRemito', 'htmlLotesRemito', 'htmlResumenLotesRemito', 'asignacionRemito', 'cajasLoteRemito', 'puedeAceptarSugerencia', 'htmlClientesRemito',
  'elegirClienteRemito', 'elegirTalonarioRemito', 'marcarSucioRemito', 'pintarRemito', 'pintarTituloRemito', 'htmlEncabezadoRemito', 'htmlClienteRemito',
  'htmlFotoRemito', 'urlFotoSegura', 'ponerSrcFotoRemito', 'htmlAccionesRemito', 'textoResumenRemito', 'momentoAr',
  'alEscribirRemito', 'renglonRemito', 'pintarPieLotesRemito',
]
const nuevo = () => construirAdministracion(ARCHIVO, { funciones: FUNCIONES_REMITO, constantes: ['ZOOM_FOTO_REMITO', 'LARGO_LOTE_REMITO'] })

const CAT = {
  productos: [
    { id: 'p-tall', nombre: 'Tallarín al huevo', categoria: 'pasta', activo: true },
    { id: 'p-cono', nombre: 'Cono dulce 48', categoria: null, activo: true },
    { id: 'p-viejo', nombre: 'Producto apagado', categoria: null, activo: false },
  ],
  presentaciones: [
    { id: 'pr-tall', producto_id: 'p-tall', nombre: 'Caja x 10', con_cono: false, unidades_por_caja: 10, activa: true },
    { id: 'pr-cono', producto_id: 'p-cono', nombre: 'Caja x 48 con cono', con_cono: true, unidades_por_caja: 48, activa: true },
    { id: 'pr-vieja', producto_id: 'p-tall', nombre: 'Caja vieja', con_cono: false, activa: false },
  ],
  marcas: [{ id: 'm-lel', nombre: 'LELONA' }, { id: 'm-ler', nombre: 'LEROMA' }],
  insumos: [{ id: 'ins-h', nombre: 'Harina 000', marca: 'Wali', unidad_medida: 'kg', activo: true }],
}
const CLIENTES = [
  { id: 'c-ros', nombre: 'Almacén Rosario', razon_social: 'ROSARIO SA', apodos: ['La Rosa'], localidad: 'Rosario', activo: true },
  { id: 'c-fer', nombre: 'FERNANDEZ RICARDO', apodos: [], activo: true, cliente_principal_id: 'c-n-fer' },
  { id: 'c-off', nombre: 'Almacén Cerrado', activo: false },
]
const A = (x) => ({ marca_id: null, cono: null, numero_remito: null, numero_factura: null, precio_caja: null, observaciones: null, ultimo_retiro: null, retiradas: 0, ...x })
const ACOPIOS = [
  A({ id: 'a1', cliente_id: 'c-ros', cliente: 'Almacén Rosario', presentacion_id: 'pr-tall', producto: 'Tallarín al huevo', unidades_por_caja: 10, cajas: 100, retiradas: 30, saldo: 70,
    estado: 'activo', fecha: '2026-10-01', numero_remito: '3021', numero_factura: 'A-0001-00001234', precio_caja: 5400, ultimo_retiro: '2026-10-23' }),
  A({ id: 'a2', cliente_id: 'c-ros', cliente: 'Almacén Rosario', presentacion_id: 'pr-cono', producto: 'Cono dulce 48', unidades_por_caja: 48, marca_id: 'm-ler', cono: 'LEROMA',
    cajas: 20, saldo: 20, estado: 'activo', fecha: '2026-10-12' }),
  A({ id: 'a5', cliente_id: 'c-ros', cliente: 'Almacén Rosario', presentacion_id: 'pr-tall', producto: 'Tallarín al huevo', unidades_por_caja: 10, cajas: 10, saldo: 10,
    estado: 'activo', fecha: '2026-10-15' }),
  A({ id: 'a3', cliente_id: 'c-fer', cliente: 'FERNANDEZ RICARDO', presentacion_id: 'pr-tall', producto: 'Tallarín al huevo', unidades_por_caja: 10, cajas: 40, retiradas: 40, saldo: 0,
    estado: 'terminado', fecha: '2026-09-15' }),
  A({ id: 'a4', cliente_id: 'c-ros', cliente: 'Almacén Rosario', presentacion_id: 'pr-cono', producto: 'Cono dulce 48', unidades_por_caja: 48, marca_id: 'm-lel', cono: 'LELONA',
    cajas: 10, saldo: 10, estado: 'anulado', fecha: '2026-10-05' }),
]

// Dolce: sin control de stock; Nuss: con control.
function enDolce(S, { tareas = [['retiros:ver', { todas: true }], ['retiros:precios', { unidades: ['u-d'] }], ['retiros:cargar', { unidades: ['u-d'] }]] } = {}) {
  S.estado.empresaId = 'u-d'
  S.estado.misTareas = new Map(tareas)
  S.estado.sinControl = new Map([['u-d', true], ['u-n', false]])
  S.estado.hayAcopios = new Map()
  S.estado.principales = new Map([['c-n-fer', 'u-n']])
  S.estado.clientes = CLIENTES
  S.estado.catalogo = CAT
  S.estado.catalogoEmpresa = 'u-d'
}
function rpcAcopios(S, { filas = ACOPIOS, extra = {} } = {}) {
  S.__setRpc(async (n, p) => {
    if (Object.prototype.hasOwnProperty.call(extra, n)) return typeof extra[n] === 'function' ? extra[n](p) : extra[n]
    if (n === 'acopios_lista') return { data: JSON.parse(JSON.stringify(p.p_cliente_id ? filas.filter(a => a.cliente_id === p.p_cliente_id) : filas)), error: null }
    return { data: null, error: null }
  })
}
const rpcDe = (S, n) => S.__llamadas.rpc.filter(r => r[0] === n)
// La plata lleva un espacio duro después del "$": se compara con uno común.
const nb = (t) => String(t ?? '').replace(/ /g, ' ')
const sinEtiquetas = (h) => nb(String(h).replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' '))
const cuerpoAcopios = (S) => S.__els.get('ad-acopios-cuerpo')?.innerHTML ?? ''
const cuerpoAcopio = (S) => S.__els.get('ad-acopio-cuerpo')?.innerHTML ?? ''

// ── La sección: dónde y para quién ───────────────────────────────────────────
{
  const S = nuevo()
  enDolce(S)
  const s = S.SECCIONES.find(x => x.id === 'acopios')
  chk('existe la sección Acopios', !!s && s.titulo === 'Acopios')
  chk('en Dolce (sin control de stock) se ve con retiros:ver', S.seccionesVisibles('u-d').some(x => x.id === 'acopios'))
  S.estado.misTareas = new Map([['retiros:precios', { unidades: ['u-d'] }]])
  chk('y solo con retiros:precios también', S.seccionesVisibles('u-d').some(x => x.id === 'acopios'))
  S.estado.misTareas = new Map([['retiros:cargar', { todas: true }]])
  chk('solo con retiros:cargar (el depósito) no', !S.seccionesVisibles('u-d').some(x => x.id === 'acopios'))
  S.estado.misTareas = new Map([['retiros:ver', { todas: true }]])
  chk('en Nuss (con control y sin acopios) no se ve', !S.seccionesVisibles('u-n').some(x => x.id === 'acopios'))
  S.estado.hayAcopios = new Map([['u-n', true]])
  chk('en Nuss con algún acopio, sí', S.seccionesVisibles('u-n').some(x => x.id === 'acopios'))
  S.estado.sinControl = new Map()
  S.estado.hayAcopios = new Map()
  chk('si no se pudo leer si controla el stock, es una fábrica de siempre (no se ve)', !S.seccionesVisibles('u-d').some(x => x.id === 'acopios'))
  chk('la pestaña Acopios va después de Órdenes', /\['ordenes', 'Órdenes'\], \['acopios', 'Acopios'\]/.test(src))
  chk('las dos vistas están en VISTAS', S.VISTAS.includes('ad-vista-acopios') && S.VISTAS.includes('ad-vista-acopio'))
  chk('el HTML tiene las dos vistas', /<section id="ad-vista-acopios" hidden>/.test(src) && /<section id="ad-vista-acopio" hidden>/.test(src))
}
{
  // ¿Tiene acopios? Solo se pregunta en una fábrica con control, y una vez.
  const S = nuevo()
  enDolce(S)
  S.estado.sinControl = new Map([['u-d', true]])
  S.__tablas.unidades_negocio = [{ controla_stock_terminado: true }]
  S.__tablas.acopios = [{ id: 'x1' }]
  esperas.push((async () => {
    await S.asegurarAcopiosEmpresa('u-d')
    chk('en Dolce no se consulta la tabla acopios (ya va la sección)', !S.__llamadas.consultas.some(c => c[0] === 'acopios'))
    await S.asegurarAcopiosEmpresa('u-n')
    const q = S.__llamadas.consultas.filter(c => c[0] === 'acopios')
    chk('en Nuss se pregunta por UN acopio de esa fábrica', q.length === 1 && q[0][1].some(f => f[0] === 'eq' && f[1] === 'unidad_negocio_id' && f[2] === 'u-n'))
    chk('y con uno, la sección aparece', S.acopiosEnEmpresa('u-n') === true)
    await S.asegurarAcopiosEmpresa('u-n')
    chk('no se vuelve a preguntar', S.__llamadas.consultas.filter(c => c[0] === 'acopios').length === 1)
  })())
}
{
  // La tarjeta de la portada.
  const S = nuevo()
  const c = S.contenidoSeccionAcopios({ acopios: ACOPIOS })
  chk('portada: cuántos activos', c.numero === 3 && c.unidad === 'acopios activos')
  chk('portada: cuántas cajas quedan por retirar', sinEtiquetas(JSON.stringify(c.lineas)).includes('Quedan 100 cajas por retirar'), JSON.stringify(c.lineas))
  chk('portada: mientras carga, "Contando…"', S.contenidoSeccionAcopios({}).carga === true)
  chk('portada: si falla, lo dice', S.contenidoSeccionAcopios({ errorAcopios: 'No se pudo contar.' }).error === 'No se pudo contar.')
}

// ── El listado ──────────────────────────────────────────────────────────────
{
  const S = nuevo()
  enDolce(S)
  rpcAcopios(S)
  esperas.push(S.mostrarAcopios().then(() => {
    const h = cuerpoAcopios(S)
    const llamada = rpcDe(S, 'acopios_lista')[0]
    chk('lee acopios_lista de la fábrica, de todos los clientes', llamada && llamada[1].p_unidad_negocio_id === 'u-d' && llamada[1].p_cliente_id === null)
    chk('se abre la vista de Acopios', S.estado.vista === 'ad-vista-acopios')
    const ia1 = h.indexOf('data-acopio="a1"'), ia3 = h.indexOf('data-acopio="a3"'), ia4 = h.indexOf('data-acopio="a4"')
    chk('activos arriba, terminados abajo, anulados al final', ia1 > -1 && ia1 < ia3 && ia3 < ia4)
    chk('"Quedan 70 de 100 cajas"', sinEtiquetas(h).includes('Quedan 70 de 100 cajas'))
    chk('la barra de avance (30 % retirado)', /data-acopio="a1"[\s\S]*?class="ad-acopio__barra"[^>]*aria-valuenow="30"><span style="width: 30%">/.test(h))
    chk('los anulados van cerrados en un <details>', /<details class="ad-acopios-anulados" data-acopios-anulados><summary>Anulados \(1\)<\/summary>[\s\S]*data-acopio="a4"[\s\S]*<\/details>/.test(h) && !/<details[^>]* open/.test(h))
    chk('un anulado no dice cuánto queda', !/data-acopio="a4"[^]*?Quedan[^]*?<\/button>/.test(h.slice(h.indexOf('data-acopio="a4"'))))
    chk('el terminado lleva su sello', /data-acopio="a3"[\s\S]*?Terminado/.test(h))
    chk('producto, unidades y cono', sinEtiquetas(h).includes('Cono dulce 48 · ×48 · cono LEROMA'))
    chk('fecha, remito, factura y último retiro', sinEtiquetas(h).includes('01/10/2026 · Remito 3021 · Factura A-0001-00001234 · último retiro 23/10/2026'))
    chk('con retiros:precios, "+ Nuevo acopio"', /data-ac-accion="nuevo"/.test(h))
    // El filtro por cliente.
    chk('el filtro tiene los clientes con acopios, una vez cada uno', (h.match(/<option value="c-ros"/g) || []).length === 1 && /<option value="c-fer"/.test(h) && /Todos los clientes/.test(h))
    S.alCambiarAcopios({ target: { dataset: { acFiltro: '' }, value: 'c-fer' } })
    const f = S.__els.get('ad-acopios-lista').innerHTML
    chk('filtrar por cliente deja solo los suyos', /data-acopio="a3"/.test(f) && !/data-acopio="a1"/.test(f))
    chk('y dice si no tiene activos', /Ninguno activo/.test(f))
  }))
}
{
  const S = nuevo()
  enDolce(S, { tareas: [['retiros:ver', { todas: true }]] })
  rpcAcopios(S)
  esperas.push(S.mostrarAcopios().then(() => {
    chk('sin retiros:precios no se ofrece "Nuevo acopio"', !/data-ac-accion="nuevo"/.test(cuerpoAcopios(S)))
  }))
}
{
  const S = nuevo()
  enDolce(S)
  rpcAcopios(S, { filas: [] })
  esperas.push(S.mostrarAcopios().then(() => chk('sin acopios, lo dice', /Todavía no hay acopios en esta fábrica/.test(cuerpoAcopios(S)))))
}
{
  const S = nuevo()
  enDolce(S)
  rpcAcopios(S, { extra: { acopios_lista: { data: null, error: { message: 'sin red' } } } })
  esperas.push(S.mostrarAcopios().then(() => chk('si falla la lectura, lo dice', /No se pudieron leer los acopios/.test(cuerpoAcopios(S)))))
}
{
  // Sin permiso en la fábrica: vuelve a la portada, no lee nada.
  const S = nuevo()
  enDolce(S, { tareas: [['retiros:cargar', { todas: true }]] })
  rpcAcopios(S)
  esperas.push(S.mostrarAcopios().then(() => chk('sin retiros:ver ni precios no se leen los acopios', !rpcDe(S, 'acopios_lista').length)))
}

// ── Nuevo acopio ─────────────────────────────────────────────────────────────
{
  const S = nuevo()
  enDolce(S)
  rpcAcopios(S)
  esperas.push(S.mostrarAcopios().then(async () => {
    await S.abrirNuevoAcopio()
    const n = S.estado.acopios.nuevo
    chk('Nuevo acopio abre el panel con la fecha de hoy', !!n && n.fecha === S.hoyArgentina())
    let h = cuerpoAcopios(S)
    chk('el texto del precio: si ponés precio se le carga en la cuenta', /si ponés precio se le carga en la cuenta/i.test(sinEtiquetas(h)))
    chk('campos: cliente, producto, cajas, fecha, remito, factura, precio, observaciones',
      ['ad-ac-cliente-buscar', 'ad-ac-buscar', 'ad-ac-cajas', 'ad-ac-fecha', 'ad-ac-remito', 'ad-ac-factura', 'ad-ac-precio', 'ad-ac-observaciones'].every(id => h.includes(`id="${id}"`)))
    chk('la fecha no puede ser futura (max = hoy)', new RegExp(`id="ad-ac-fecha"[^>]*max="${S.hoyArgentina()}"`).test(h))
    chk('los números no van en un value (se enlazan después)', !/data-ac-numero="(cajas|precio)"[^>]*value=/.test(h))
    // El buscador de clientes: activos de la fábrica, con "(también en Nuss)".
    S.alEscribirAcopios({ target: { dataset: { acClienteBuscar: '' }, value: 'fern' } })
    const ops = S.__els.get('ad-ac-clientes').innerHTML
    chk('el buscador encuentra el cliente', /data-ac-cliente="c-fer"/.test(ops))
    chk('el vinculado: "FERNANDEZ RICARDO (también en Nuss)"', sinEtiquetas(ops).includes('FERNANDEZ RICARDO (también en Nuss)'))
    S.alEscribirAcopios({ target: { dataset: { acClienteBuscar: '' }, value: 'almac' } })
    chk('un cliente apagado no aparece', !/c-off/.test(S.__els.get('ad-ac-clientes').innerHTML))
    // El catálogo de la Carga, SIN insumos ni productos apagados.
    S.alEscribirAcopios({ target: { dataset: { acBuscar: '' }, value: 'harina' } })
    chk('los insumos no se ofrecen (aunque se busquen)', !/ins-h|Harina/.test(S.__els.get('ad-ac-opciones').innerHTML))
    S.alEscribirAcopios({ target: { dataset: { acBuscar: '' }, value: '' } })
    const prods = S.__els.get('ad-ac-opciones').innerHTML
    chk('los productos en los grupos de la Carga (SIN CONO / CON CONO)', /SIN CONO[\s\S]*data-ac-producto="pr-tall"[\s\S]*CON CONO[\s\S]*data-ac-producto="pr-cono"/.test(prods))
    chk('ni presentaciones ni productos apagados', !/pr-vieja/.test(prods))
    // Guardar sin lo obligatorio: lo dice y no llama a la base.
    await S.guardarNuevoAcopio()
    chk('sin cliente: "Elegí el cliente."', n.error === 'Elegí el cliente.' && !rpcDe(S, 'crear_acopio').length)
    S.elegirClienteAcopio('c-off')
    chk('un apagado no se elige', n.clienteId === null)
    S.elegirClienteAcopio('c-fer')
    await S.guardarNuevoAcopio()
    chk('sin producto: "Elegí el producto."', n.error === 'Elegí el producto.')
    S.elegirProductoAcopio('pr-cono')
    await S.guardarNuevoAcopio()
    chk('con cono y sin elegirlo: "Elegí el cono."', n.error === 'Elegí el cono.')
    S.elegirMarcaAcopio('m-lel')
    h = cuerpoAcopios(S)
    chk('el elegido se ve con su cono', sinEtiquetas(h).includes('Cono dulce 48 · Caja x 48 con cono · LELONA'))
    await S.guardarNuevoAcopio()
    chk('sin cajas: lo dice', /Poné las cajas/.test(n.error))
    S.alEscribirAcopios({ target: { dataset: { acNumero: 'cajas' }, value: '12,5' } })
    await S.guardarNuevoAcopio()
    chk('cajas con decimales: no', /Poné las cajas/.test(n.error) && !rpcDe(S, 'crear_acopio').length)
    S.alEscribirAcopios({ target: { dataset: { acNumero: 'cajas' }, value: '12' } })
    n.fecha = '2999-01-01'
    await S.guardarNuevoAcopio()
    chk('fecha futura: no', n.error === 'La fecha no puede ser futura.')
    S.alEscribirAcopios({ target: { dataset: { acCampo: 'fecha' }, value: '2026-10-20' } })
    S.alEscribirAcopios({ target: { dataset: { acNumero: 'precio' }, value: '1.500,50' } })
    chk('el total que se le carga: cajas × precio', nb(S.__els.get('ad-ac-total').textContent) === 'Se le carga $ 18.006,00 en la cuenta del cliente.', S.__els.get('ad-ac-total').textContent)
    S.alEscribirAcopios({ target: { dataset: { acCampo: 'numeroRemito' }, value: '  3050 ' } })
    S.alEscribirAcopios({ target: { dataset: { acCampo: 'numeroFactura' }, value: ' A-0001-77 ' } })
    S.alEscribirAcopios({ target: { dataset: { acCampo: 'observaciones' }, value: '' } })
    S.alEscribirAcopios({ target: { dataset: { acCampo: 'otra' }, value: 'x' } })
    chk('un campo que no es del formulario no se escribe', n.otra === undefined)
    // La base responde un error: TAL CUAL.
    rpcAcopios(S, { extra: { crear_acopio: { data: null, error: { message: 'El cliente no es de esta fábrica o no está activo.' } } } })
    await S.guardarNuevoAcopio()
    chk('el error de la base, tal cual', n.error === 'El cliente no es de esta fábrica o no está activo.' && /id="ad-ac-error"/.test(cuerpoAcopios(S)))
    const p = rpcDe(S, 'crear_acopio')[0][1]
    chk('crear_acopio con todo lo del formulario', p.p_unidad_negocio_id === 'u-d' && p.p_cliente_id === 'c-fer' && p.p_presentacion_id === 'pr-cono' && p.p_marca_id === 'm-lel' &&
      p.p_cajas === 12 && p.p_fecha === '2026-10-20' && p.p_numero_remito === '3050' && p.p_numero_factura === 'A-0001-77' && p.p_precio_caja === 1500.5 && p.p_observaciones === null, JSON.stringify(p))
    rpcAcopios(S, { extra: { crear_acopio: { data: 'nuevo-id', error: null } } })
    await S.guardarNuevoAcopio()
    chk('guardado: el panel se cierra', S.estado.acopios.nuevo === null)
    chk('y avisa lo cargado, con lo que se le cargó en la cuenta', /Acopio cargado: 12 cajas de Cono dulce 48 · Caja x 48 con cono · LELONA para FERNANDEZ RICARDO · se le cargó \$ 18\.006,00 en la cuenta\./.test(nb(S.estado.acopios.aviso)), S.estado.acopios.aviso)
    chk('y vuelve a leer la lista', rpcDe(S, 'acopios_lista').length === 2)
  }))
}
{
  // Sin cono y sin precio: p_marca_id y p_precio_caja van null.
  const S = nuevo()
  enDolce(S)
  S.estado.acopios = S.acopiosVacio('u-d')
  S.estado.acopios.nuevo = { ...S.nuevoAcopioVacio(), clienteId: 'c-ros', presentacionId: 'pr-tall', marcaId: 'm-lel', cajas: 5, numeroRemito: '', numeroFactura: '' }
  const p = S.parametrosCrearAcopio(S.estado.acopios.nuevo, 'u-d')
  chk('sin cono, el cono no viaja', p.p_marca_id === null)
  chk('sin precio, null (no se carga nada en la cuenta)', p.p_precio_caja === null && p.p_numero_remito === null && p.p_numero_factura === null)
  chk('sin precio, lo dice', S.textoTotalAcopio(S.estado.acopios.nuevo) === 'Sin precio: no se carga nada en la cuenta del cliente.')
  chk('precio 0 vale (no carga nada)', S.errorNuevoAcopio({ ...S.estado.acopios.nuevo, precio: 0 }) === null)
  chk('precio negativo, no', S.errorNuevoAcopio({ ...S.estado.acopios.nuevo, precio: -1 }) === 'El precio no puede ser negativo.')
}
{
  // Sin retiros:precios no se abre ni se guarda.
  const S = nuevo()
  enDolce(S, { tareas: [['retiros:ver', { todas: true }]] })
  S.estado.acopios = S.acopiosVacio('u-d')
  esperas.push(S.abrirNuevoAcopio().then(() => chk('sin retiros:precios, Nuevo acopio no abre', S.estado.acopios.nuevo === null)))
}

// ── El detalle: sus retiros y Anular ────────────────────────────────────────
const MOVS = [
  { id: 'm1', orden_retiro_id: 'o4', cajas: -30, fecha: '2026-10-23', motivo: null },
  { id: 'm2', orden_retiro_id: 'o2', cajas: -5, fecha: '2026-10-21', motivo: null },
  { id: 'm3', orden_retiro_id: 'o2', cajas: 5, fecha: '2026-10-22', motivo: null },
]
const ORDENES = [
  { id: 'o4', codigo: 'D-0004', numero_remito: '977490', talonario: 'acopio' },
  { id: 'o2', codigo: 'D-0002', numero_remito: '0001-00003099', talonario: 'oficial' },
]
{
  const S = nuevo()
  enDolce(S)
  rpcAcopios(S)
  S.__tablas.acopio_movimientos = MOVS
  S.__tablas.ordenes_retiro = ORDENES
  esperas.push(S.mostrarAcopios().then(async () => {
    await S.abrirAcopio('a1')
    const h = cuerpoAcopio(S)
    const q = S.__llamadas.consultas.find(c => c[0] === 'acopio_movimientos')
    chk('lee los movimientos de ESE acopio', q && q[1].some(f => f[0] === 'eq' && f[1] === 'acopio_id' && f[2] === 'a1'))
    const qo = S.__llamadas.consultas.find(c => c[0] === 'ordenes_retiro')
    chk('y sus órdenes, una vez cada una', qo && JSON.stringify(qo[1].find(f => f[0] === 'in')?.[2]) === JSON.stringify(['o4', 'o2']))
    chk('se abre la vista del acopio', S.estado.vista === 'ad-vista-acopio')
    chk('cada retiro: fecha, orden, N° de acopio celeste y cajas', /23\/10\/2026[\s\S]*?data-ac-orden="o4">Orden D-0004<\/button><span class="ad-sello ad-sello--acopio">Acopio N° 977490<\/span>[\s\S]*?−30 cajas/.test(h))
    chk('la orden oficial no lleva N° de acopio', !/Acopio N° 0001-00003099/.test(h))
    chk('lo devuelto por la anulación de la orden, en positivo', /\+5 cajas/.test(h) && /Devuelto \(se anuló la orden\)/.test(h))
    chk('arriba: quedan, precio y total', sinEtiquetas(h).includes('Quedan 70 de 100 cajas') && sinEtiquetas(h).includes('$ 5.400,00 · total $ 540.000,00'))
    chk('con retiros no se ofrece Anular, y dice por qué', !/data-ac-det="anular"/.test(h) && /anulá primero las órdenes de acopio/.test(h))
    chk('el título', S.__els.get('ad-acopio-titulo').textContent === 'Acopio · Almacén Rosario')
  }))
}
{
  const S = nuevo()
  enDolce(S)
  rpcAcopios(S)
  S.__tablas.acopio_movimientos = []
  esperas.push(S.mostrarAcopios().then(async () => {
    await S.abrirAcopio('a2')
    let h = cuerpoAcopio(S)
    chk('sin retiros: "Todavía no tiene retiros." y Anular', /Todavía no tiene retiros/.test(h) && /data-ac-det="anular"/.test(h))
    S.alTocarAcopio({ target: { closest: () => ({ disabled: false, dataset: { acDet: 'anular' } }) } })
    h = cuerpoAcopio(S)
    chk('Anular pide el motivo', /id="ad-ac-motivo"/.test(h))
    S.alEscribirAcopio({ target: { dataset: { acMotivo: '' }, value: ' no ' } })
    await S.confirmarAnularAcopio()
    chk('motivo corto: lo dice y no llama a la base', /Poné el motivo/.test(S.estado.acopio.anular.error) && !rpcDe(S, 'anular_acopio').length)
    S.alEscribirAcopio({ target: { dataset: { acMotivo: '' }, value: '  Se cargó dos veces  ' } })
    rpcAcopios(S, { extra: { anular_acopio: { data: null, error: { message: 'Ese acopio ya tiene retiros: anulá primero las órdenes de acopio.' } } } })
    await S.confirmarAnularAcopio()
    chk('el error de la base, tal cual', S.estado.acopio.anular.error === 'Ese acopio ya tiene retiros: anulá primero las órdenes de acopio.' && /id="ad-ac-anular-error"/.test(cuerpoAcopio(S)))
    chk('anular_acopio con el id y el motivo limpio', JSON.stringify(rpcDe(S, 'anular_acopio')[0][1]) === JSON.stringify({ p_id: 'a2', p_motivo: 'Se cargó dos veces' }))
    rpcAcopios(S, { extra: { anular_acopio: { data: null, error: null } } })
    await S.confirmarAnularAcopio()
    h = cuerpoAcopio(S)
    chk('anulado: lo dice con el motivo y sin Anular', /Acopio anulado\./.test(h) && /Anulado: Se cargó dos veces/.test(h) && !/data-ac-det="anular"/.test(h))
    chk('y la lista ya lo tiene como anulado', S.estado.acopios.filas.find(a => a.id === 'a2').estado === 'anulado')
  }))
}
{
  // Anular pide retiros:precios.
  const S = nuevo()
  enDolce(S, { tareas: [['retiros:ver', { todas: true }]] })
  rpcAcopios(S)
  S.__tablas.acopio_movimientos = []
  esperas.push(S.mostrarAcopios().then(() => S.abrirAcopio('a2')).then(() => chk('sin retiros:precios no hay Anular (ni el texto de los retiros)',
    !/data-ac-det="anular"/.test(cuerpoAcopio(S)) && !/anulá primero/.test(cuerpoAcopio(S)))))
}
{
  // La pestaña abre la sección, y la portada la cuenta.
  const S = nuevo()
  enDolce(S)
  rpcAcopios(S)
  S.__tablas.unidades_negocio = [{ controla_stock_terminado: false }]
  S.abrirSeccion('acopios')
  esperas.push((async () => {
    for (let i = 0; i < 10; i++) await Promise.resolve()
    chk('la pestaña Acopios abre la sección', S.estado.vista === 'ad-vista-acopios')
    const T = nuevo()
    enDolce(T)
    rpcAcopios(T)
    T.__tablas.unidades_negocio = [{ controla_stock_terminado: false }]
    await T.contarPortada()
    for (let i = 0; i < 20; i++) await Promise.resolve()
    chk('la portada cuenta los acopios de la fábrica', Array.isArray(T.estado.portada?.acopios) && T.estado.portada.acopios.length === ACOPIOS.length && rpcDe(T, 'acopios_lista').some(r => r[1].p_unidad_negocio_id === 'u-d'))
  })())
}

// ── En la cuenta del cliente: acopios activos y la cuenta en el grupo ───────
const GRUPO = [
  { cliente_id: 'c-n-fer', unidad_negocio_id: 'u-n', empresa: 'Cucuruchos Nuss', cliente: 'FERNANDEZ RICARDO', saldo: 350000 },
  { cliente_id: 'c-fer', unidad_negocio_id: 'u-d', empresa: 'Dolce Pasta', cliente: 'FERNANDEZ RICARDO', saldo: 120000.5 },
]
{
  const S = nuevo()
  enDolce(S)
  rpcAcopios(S, { extra: { cuenta_cliente: { data: [{ fecha: '2026-10-01', tipo: 'acopio', detalle: 'Acopio 100 cajas Tallarín al huevo · ×10', importe: 540000, saldo: 540000, orden_retiro_id: null },
    { fecha: '2026-10-02', tipo: 'anulacion_acopio', detalle: 'Anulación del acopio: repetido', importe: -540000, saldo: 0, orden_retiro_id: null }], error: null },
  cuenta_cliente_consolidada: { data: [GRUPO[1]], error: null } } })
  S.__tablas.unidades_negocio = [{ controla_stock_terminado: false }]
  esperas.push(S.abrirCliente('c-ros').then(() => {
    const h = S.__els.get('ad-cliente-cuerpo').innerHTML
    const ll = rpcDe(S, 'acopios_lista').find(r => r[1].p_cliente_id === 'c-ros')
    chk('la cuenta lee los acopios del cliente', ll && ll[1].p_unidad_negocio_id === 'u-d')
    chk('muestra sus acopios activos con el saldo', /data-acopios-cliente[\s\S]*Acopios activos[\s\S]*data-cliente-acopio="a1"[\s\S]*Quedan 70 de 100 cajas/.test(h))
    chk('solo los activos', !/data-cliente-acopio="a4"/.test(h))
    chk('"Acopio" y "Anulación de acopio" en la cuenta', /Acopio 100 cajas Tallarín al huevo · ×10[\s\S]*?01\/10\/2026 · Acopio</.test(h) && /02\/10\/2026 · Anulación de acopio/.test(h))
    chk('una sola cuenta y sin vincular: no hay "Cuenta en el grupo"', !/data-cuenta-grupo/.test(h))
    chk('lee cuenta_cliente_consolidada del cliente', JSON.stringify(rpcDe(S, 'cuenta_cliente_consolidada')[0]?.[1]) === JSON.stringify({ p_cliente_id: 'c-ros' }))
  }))
}
{
  const S = nuevo()
  enDolce(S)
  rpcAcopios(S, { extra: { cuenta_cliente: { data: [], error: null }, cuenta_cliente_consolidada: { data: GRUPO, error: null } } })
  S.__tablas.unidades_negocio = [{ controla_stock_terminado: false }]
  esperas.push(S.abrirCliente('c-fer').then(() => {
    const h = nb(S.__els.get('ad-cliente-cuerpo').innerHTML)
    chk('"Cuenta en el grupo" con el total', /data-cuenta-grupo[\s\S]*Cuenta en el grupo[\s\S]*\$ 470\.000,50/.test(h))
    chk('y cada empresa: "Nuss $ X · Dolce Pasta $ Y"', /Nuss \$ 350\.000,00<\/button><span aria-hidden="true">·<\/span><strong>Dolce Pasta \$ 120\.000,50<\/strong>/.test(h), h.slice(h.indexOf('data-cuenta-grupo'), h.indexOf('data-cuenta-grupo') + 600))
    chk('con link a la otra cuenta', /data-otra-cuenta="c-n-fer" data-otra-unidad="u-n"/.test(h))
    chk('el acopio terminado no va en la cuenta', !/data-acopios-cliente/.test(h))
  }))
}
{
  // "También es cliente de…" no repite las cuentas del grupo.
  const S = nuevo()
  const c = { id: 'c-fer', otras: { filas: [{ cliente_id: 'c-n-fer', unidad_negocio_id: 'u-n', saldo: 350000 }, { cliente_id: 'c-otra', unidad_negocio_id: 'u-n', saldo: 1 }], error: null } }
  S.__setRpc(async () => ({ data: GRUPO, error: null }))
  esperas.push(S.cargarCuentaGrupo(c).then(() => {
    chk('"También es cliente de…" sin las del grupo', c.otras.filas.length === 1 && c.otras.filas[0].cliente_id === 'c-otra')
  }))
}
{
  const S = nuevo()
  enDolce(S)
  const vinc = { cliente_principal_id: 'c-n-fer' }
  chk('vinculado y una sola cuenta visible: se muestra igual', /data-cuenta-grupo/.test(S.htmlCuentaGrupo({ id: 'c-fer', grupo: { filas: [GRUPO[1]], error: null } }, vinc)))
  chk('si falla, al vinculado se le dice', /No se pudo leer la cuenta en el grupo/.test(S.htmlCuentaGrupo({ id: 'c-fer', grupo: { filas: [], error: 'No se pudo leer la cuenta en el grupo.' } }, vinc)))
  chk('a uno sin vincular no', S.htmlCuentaGrupo({ id: 'c-ros', grupo: { filas: [], error: 'No se pudo leer la cuenta en el grupo.' } }, {}) === '')
  S.estado.unidadBarra = 'u-d'
  chk('con Dolce en la barra de arriba, la cuenta de Nuss no se abre desde acá', !/data-otra-cuenta/.test(S.htmlCuentaGrupo({ id: 'c-fer', grupo: { filas: GRUPO, error: null } }, vinc)))
  S.estado.unidadBarra = null
  const xss = S.htmlCuentaGrupo({ id: 'c-fer', grupo: { filas: [{ ...GRUPO[0], cliente_id: marca('id'), unidad_negocio_id: 'u-x', empresa: marca('empresa') }, GRUPO[1]], error: null } }, vinc)
  chequearMarcas(chk, 'htmlCuentaGrupo', xss, ['empresa'])
}
{
  // En Nuss sin acopios, la cuenta no los busca.
  const S = nuevo()
  enDolce(S)
  S.estado.empresaId = 'u-n'
  S.estado.sinControl = new Map([['u-n', false]])
  S.__tablas.acopios = []
  rpcAcopios(S)
  const c = { id: 'c1' }
  esperas.push(S.cargarAcopiosCliente(c).then(() => chk('en una fábrica sin acopios, la cuenta no llama a acopios_lista', c.acopios === null && !rpcDe(S, 'acopios_lista').length)))
}

// ── "(también en Nuss)" ─────────────────────────────────────────────────────
{
  const S = nuevo()
  enDolce(S)
  chk('el vinculado dice dónde más está', S.textoTambienEn(CLIENTES[1]) === ' (también en Nuss)')
  chk('uno sin vincular, nada', S.textoTambienEn(CLIENTES[0]) === '')
  S.estado.principales = new Map([['c-n-fer', null]])
  chk('si no se pudo leer la empresa del principal: "otra empresa del grupo"', S.textoTambienEn(CLIENTES[1]) === ' (también en otra empresa del grupo)')
  S.estado.principales = new Map([['c-n-fer', 'u-d']])
  chk('el principal en la misma empresa no es "otra" cuenta', S.textoTambienEn(CLIENTES[1]) === '')
  S.estado.principales = new Map([['c-n-fer', 'u-n']])
  const fila = S.htmlFilaCliente({ cliente_id: 'c-fer', nombre: 'FERNANDEZ RICARDO', saldo: 0, lista: null, retiros_mes: 0 })
  chk('la lista de Clientes: "FERNANDEZ RICARDO (también en Nuss)"', /FERNANDEZ RICARDO \(también en Nuss\)/.test(fila))
  const rm = { form: { clienteBusqueda: 'fern', clienteId: null } }
  chk('el buscador del remito también', /FERNANDEZ RICARDO \(también en Nuss\)/.test(S.htmlClientesRemito(rm)))
  chk('leerClientes pide cliente_principal_id', /from\('clientes'\)\s*\n\s*\.select\('[^']*\bcliente_principal_id\b[^']*'\)\s*\n\s*\.eq\('unidad_negocio_id', unidadId\)/.test(src))
}
{
  const S = nuevo()
  S.estado.principales = new Map()
  S.__tablas.clientes = [{ id: 'c-n-fer', unidad_negocio_id: 'u-n' }]
  esperas.push((async () => {
    await S.leerPrincipales(CLIENTES)
    const q = S.__llamadas.consultas.filter(c => c[0] === 'clientes')
    chk('lee la empresa de los principales, solo de esos', q.length === 1 && JSON.stringify(q[0][1].find(f => f[0] === 'in')?.[2]) === JSON.stringify(['c-n-fer']))
    chk('y la guarda', S.estado.principales.get('c-n-fer') === 'u-n')
    await S.leerPrincipales(CLIENTES)
    chk('no la vuelve a pedir', S.__llamadas.consultas.filter(c => c[0] === 'clientes').length === 1)
    await S.leerPrincipales([{ id: 'x' }])
    chk('sin vinculados no consulta nada', S.__llamadas.consultas.filter(c => c[0] === 'clientes').length === 1)
  })())
}
chk('las etiquetas de la cuenta: Acopio y Anulación de acopio', /acopio: 'Acopio', anulacion_acopio: 'Anulación de acopio'/.test(src))

// ── En la revisión de un remito de talonario ACOPIO ─────────────────────────
function remito(S, { talonario = 'acopio', clienteId = 'c-ros', items } = {}) {
  const f = S.formDesdeRemito({ numero_remito: '977492', fecha: '2026-10-25', talonario, cliente_id: clienteId, items })
  const rm = { id: 'r1', fila: { id: 'r1', unidad_negocio_id: 'u-d', estado: 'precargada' }, form: f, foto: { cargando: true }, zoom: 0 }
  S.estado.remito = rm
  return rm
}
const IT = (x) => ({ texto_leido: '', cantidad: null, presentacion_id: null, marca_id: null, insumo_id: null, lotes: [], revisar: false, omitir: false, nota: '', ...x })
{
  const S = nuevo()
  enDolce(S)
  rpcAcopios(S)
  const rm = remito(S, { items: [IT({ cantidad: 30, presentacion_id: 'pr-tall' }), IT({ cantidad: 25, presentacion_id: 'pr-cono', marca_id: 'm-ler' }),
    IT({ cantidad: 5, presentacion_id: 'pr-cono', marca_id: 'm-lel' }), IT({ cantidad: 3, presentacion_id: 'pr-tall', omitir: true }), IT({ cantidad: 2, insumo_id: 'ins-h' })] })
  const r = rm.form.renglones
  chk('mientras lee el acopio: "Buscando el acopio del cliente…"', /Buscando el acopio del cliente…/.test(S.htmlSaldoAcopioRemito(rm, r[0], 0)))
  esperas.push(S.cargarAcopiosRemito(rm).then(() => {
    const ll = rpcDe(S, 'acopios_lista')[0]
    chk('lee los acopios del cliente del remito, en su fábrica', ll && ll[1].p_unidad_negocio_id === 'u-d' && ll[1].p_cliente_id === 'c-ros')
    const h0 = S.htmlSaldoAcopioRemito(rm, r[0], 0)
    chk('alcanza: suma los activos del mismo producto (70 + 10)', /class="ad-rm-acopio" data-rm-acopio="0">Acopio: quedan 80 cajas; después de este remito, 50\.<\/p>/.test(h0), h0)
    const h1 = S.htmlSaldoAcopioRemito(rm, r[1], 1)
    chk('no alcanza: en amarillo', /ad-rm-acopio--falta/.test(h1) && /No hay acopio de esto para el cliente: quedan 20 cajas y el remito pide 25\./.test(h1), h1)
    const h2 = S.htmlSaldoAcopioRemito(rm, r[2], 2)
    chk('otro cono (el de LELONA está anulado): "No hay acopio de esto para el cliente."', /ad-rm-acopio--falta/.test(h2) && />No hay acopio de esto para el cliente\.<\/p>/.test(h2), h2)
    chk('el omitido no lleva saldo', S.htmlSaldoAcopioRemito(rm, r[3], 3) === '')
    chk('un insumo no lleva saldo', S.htmlSaldoAcopioRemito(rm, r[4], 4) === '')
    const t = S.saldoAcopioRemito(rm, { ...r[0], cantidad: 60 })
    chk('el terminado no cuenta', t.saldo === 80)
    // Cambiar las cajas actualiza el saldo sin redibujar el remito.
    const el = { dataset: { rmAcopio: '1' }, outerHTML: '' }
    S.__els.get('ad-remito-cuerpo').querySelectorAll = (sel) => sel === '[data-rm-acopio]' ? [el] : []
    S.alEscribirRemito({ target: { dataset: { rmCantidad: '1' }, value: '20' } })
    chk('cambiar las cajas actualiza el saldo (20 de 20 alcanza justo)', /class="ad-rm-acopio" data-rm-acopio="1">Acopio: quedan 20 cajas; después de este remito, 0\.<\/p>/.test(el.outerHTML), el.outerHTML)
    S.__els.get('ad-remito-cuerpo').querySelectorAll = () => []
    // Dos renglones del mismo producto suman lo que piden.
    rm.form.renglones.push(S.renglonDesdeItem(IT({ cantidad: 60, presentacion_id: 'pr-tall' })))
    chk('dos renglones del mismo producto: suma lo que piden (90 de 80)', S.saldoAcopioRemito(rm, rm.form.renglones[0]).alcanza === false)
    const html = S.htmlRenglonRemito(rm.form.renglones[1], 1, CAT, rm)
    chk('el saldo va en el renglón, antes de los lotes', /data-rm-acopio="1"[\s\S]*¿De qué lotes\?/.test(html))
    rm.form.talonario = 'oficial'
    chk('con talonario Oficial, nada', S.htmlSaldoAcopioRemito(rm, r[0], 0) === '' && !/data-rm-acopio/.test(S.htmlRenglonRemito(r[0], 0, CAT, rm)))
    rm.form.talonario = 'acopio'
    rm.form.clienteId = null
    chk('sin cliente, nada', S.htmlSaldoAcopioRemito(rm, r[0], 0) === '')
  }))
}
{
  // Elegir el cliente o el talonario Acopio lee el acopio; si falla, lo dice (sin amarillo).
  const S = nuevo()
  enDolce(S)
  rpcAcopios(S, { extra: { acopios_lista: { data: null, error: { message: 'sin red' } } } })
  const rm = remito(S, { clienteId: null, items: [IT({ cantidad: 3, presentacion_id: 'pr-tall' })] })
  S.elegirClienteRemito('c-ros')
  esperas.push((async () => {
    for (let i = 0; i < 10; i++) await Promise.resolve()
    chk('elegir el cliente lee su acopio', rpcDe(S, 'acopios_lista').some(r => r[1].p_cliente_id === 'c-ros'))
    const h = S.htmlSaldoAcopioRemito(rm, rm.form.renglones[0], 0)
    chk('si falla, lo dice sin amarillo', /No se pudo leer el acopio del cliente/.test(h) && !/--falta/.test(h))
    const S2 = nuevo()
    enDolce(S2)
    rpcAcopios(S2)
    remito(S2, { talonario: 'oficial', items: [IT({ cantidad: 3, presentacion_id: 'pr-tall' })] })
    S2.elegirTalonarioRemito('acopio')
    for (let i = 0; i < 10; i++) await Promise.resolve()
    chk('pasar a talonario Acopio lee el acopio', rpcDe(S2, 'acopios_lista').length === 1)
  })())
}

// ── XSS: lo que viene de la base, escapado ──────────────────────────────────
{
  const S = nuevo()
  enDolce(S)
  const malo = A({ id: marca('id'), cliente_id: 'c-x', cliente: marca('cliente'), presentacion_id: 'pr-tall', producto: marca('producto'), unidades_por_caja: 10, cono: marca('cono'),
    cajas: 10, saldo: 4, retiradas: 6, estado: 'activo', fecha: '2026-10-01', numero_remito: marca('remito'), numero_factura: marca('factura'), observaciones: marca('obs') })
  const ac = { ...S.acopiosVacio('u-d'), filas: [malo, { ...malo, estado: 'anulado' }] }
  chequearMarcas(chk, 'htmlListaAcopios', S.htmlListaAcopios(ac), ['cliente', 'producto', 'cono', 'remito', 'factura'])
  chequearMarcas(chk, 'htmlFiltroAcopios', S.htmlFiltroAcopios(ac), ['cliente'])
  chequearMarcas(chk, 'htmlDetalleAcopio', S.htmlDetalleAcopio({ fila: malo, movs: [{ orden_retiro_id: 'o9', cajas: 3, fecha: '2026-10-02', motivo: marca('motivo') }],
    ordenes: new Map([['o9', { codigo: marca('codigo'), numero_remito: marca('nro'), talonario: 'acopio' }]]), anular: { motivo: marca('motivoEscrito'), error: marca('errorBase') } }),
    ['cliente', 'producto', 'remito', 'factura', 'obs', 'motivo', 'codigo', 'nro'])
  chequearMarcas(chk, 'htmlAcopiosCliente', S.htmlAcopiosCliente({ acopios: { filas: [malo], error: null } }), ['producto', 'remito'])
  S.estado.clientes = [{ id: 'c-x', nombre: marca('nombre'), razon_social: marca('razon'), localidad: marca('localidad'), activo: true, cliente_principal_id: 'p' }]
  S.estado.principales = new Map([['p', null]])
  chequearMarcas(chk, 'htmlClientesAcopio', S.htmlClientesAcopio({ clienteBusqueda: 'b data' }), ['nombre', 'razon', 'localidad'])
  S.estado.catalogo = { productos: [{ id: 'p-x', nombre: marca('prod'), activo: true }], presentaciones: [{ id: 'pr-x', producto_id: 'p-x', nombre: marca('pres'), con_cono: true, activa: true }],
    marcas: [{ id: 'm-x', nombre: marca('marcaCono') }], insumos: [] }
  const n = { ...S.nuevoAcopioVacio(), clienteBusqueda: marca('busqueda'), numeroRemito: marca('nRemito'), numeroFactura: marca('nFactura'), observaciones: marca('nObs'), error: marca('nError') }
  chequearMarcas(chk, 'htmlNuevoAcopio', S.htmlNuevoAcopio(n), ['busqueda', 'nRemito', 'nFactura', 'nObs', 'nError', 'prod', 'pres'])
  chequearMarcas(chk, 'htmlNuevoAcopio (elegido)', S.htmlNuevoAcopio({ ...n, clienteId: 'c-x', presentacionId: 'pr-x', eligiendo: false, marcaBusqueda: '' }), ['nombre', 'prod', 'pres', 'marcaCono'])
  const rm = { form: { talonario: 'acopio', clienteId: 'c-x', renglones: [] }, acopios: { clienteId: 'c-x', filas: [], error: marca('errorLectura') } }
  chequearMarcas(chk, 'htmlSaldoAcopioRemito', S.htmlSaldoAcopioRemito(rm, { presentacionId: 'pr-x', cantidad: 1 }, 0), ['errorLectura'])
}
{
  // Los ids y lo escrito, también escapados.
  const S = nuevo()
  enDolce(S)
  const malo = A({ id: 'a-x', cliente_id: marca('clienteId'), cliente: 'Cliente', presentacion_id: 'pr-tall', producto: 'P', unidades_por_caja: 1, cajas: 5, saldo: 5,
    estado: 'activo', fecha: '2026-10-01' })
  chequearMarcas(chk, 'htmlFiltroAcopios (ids)', S.htmlFiltroAcopios({ ...S.acopiosVacio('u-d'), filas: [malo] }), ['clienteId'])
  S.estado.acopios = { ...S.acopiosVacio('u-d'), filas: [], aviso: marca('aviso') }
  S.pintarAcopios()
  chequearMarcas(chk, 'pintarAcopios (aviso)', cuerpoAcopios(S), ['aviso'])
  S.estado.clientes = [{ id: marca('idCliente'), nombre: 'Bodega', activo: true }]
  chequearMarcas(chk, 'htmlClientesAcopio (id)', S.htmlClientesAcopio({ clienteBusqueda: 'bod' }), ['idCliente'])
  const cat = { productos: [{ id: 'p-x', nombre: 'Pan', activo: true }], presentaciones: [{ id: marca('idPres'), producto_id: 'p-x', nombre: 'Caja', con_cono: false, activa: true }],
    marcas: [{ id: marca('idMarca'), nombre: 'LOLO' }], insumos: [] }
  chequearMarcas(chk, 'htmlOpcionesAcopio (id)', S.htmlOpcionesAcopio(cat, ''), ['idPres'])
  chequearMarcas(chk, 'htmlOpcionesAcopio (lo buscado)', S.htmlOpcionesAcopio(cat, marca('busco')), ['busco'])
  chequearMarcas(chk, 'htmlMarcasAcopio (id)', S.htmlMarcasAcopio({ marcaBusqueda: '' }, cat), ['idMarca'])
  chequearMarcas(chk, 'htmlMarcasAcopio (lo buscado)', S.htmlMarcasAcopio({ marcaBusqueda: marca('buscoCono') }, cat), ['buscoCono'])
  chequearMarcas(chk, 'htmlProductoAcopio (lo buscado)', S.htmlProductoAcopio({ ...S.nuevoAcopioVacio(), busqueda: marca('escrito') }, cat), ['escrito'])
  S.estado.catalogo = { productos: [{ id: 'p-c', nombre: 'Cono', activo: true }], presentaciones: [{ id: 'pr-c', producto_id: 'p-c', nombre: 'Caja', con_cono: true, activa: true }], marcas: [], insumos: [] }
  chequearMarcas(chk, 'htmlProductoAcopio (el cono buscado)', S.htmlProductoAcopio({ ...S.nuevoAcopioVacio(), presentacionId: 'pr-c', eligiendo: false, marcaBusqueda: marca('conoEscrito') }, S.estado.catalogo), ['conoEscrito'])
  const fila = A({ id: 'a-y', cliente_id: 'c', cliente: 'C', presentacion_id: 'pr-tall', producto: 'P', unidades_por_caja: 1, cajas: 5, saldo: 5, estado: 'activo', fecha: '2026-10-01' })
  chequearMarcas(chk, 'htmlDetalleAcopio (la orden y Anular)', S.htmlDetalleAcopio({ fila, movs: [{ orden_retiro_id: marca('idOrden'), cajas: -1, fecha: '2026-10-02' }], ordenes: new Map(),
    anular: { motivo: marca('motivoEscrito'), error: marca('errorBase') } }), ['idOrden', 'motivoEscrito', 'errorBase'])
  chequearMarcas(chk, 'htmlDetalleAcopio (el motivo de la anulación)', S.htmlDetalleAcopio({ fila: { ...fila, estado: 'anulado' }, movs: [], ordenes: new Map(),
    anulacion: { anulado_motivo: marca('motivoBase') } }), ['motivoBase'])
  S.estado.empresas = [...S.estado.empresas, { id: 'u-m', nombre: marca('empresaPropia') }]
  const g = S.htmlCuentaGrupo({ id: 'c-fer', grupo: { filas: [{ cliente_id: 'c-fer', unidad_negocio_id: 'u-m', saldo: 1 }, { cliente_id: marca('idOtra'), unidad_negocio_id: 'u-m', saldo: 2 }], error: null } }, { cliente_principal_id: 'x' })
  chequearMarcas(chk, 'htmlCuentaGrupo (la propia y el link)', g, ['empresaPropia', 'idOtra'])
}

fin()
