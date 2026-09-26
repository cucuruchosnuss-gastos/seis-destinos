// ADMINISTRACIÓN — Clientes (26/09/2026).
//
// La lista con clientes_con_saldo (saldo, lista, retiros del mes, "también
// proveedor"), los que pasan su límite en bordó; la cuenta corriente con
// cuenta_cliente y el CÓDIGO de cada orden; con retiros:precios la ficha
// completa que manda SOLO lo que cambió, el saldo inicial (una vez) y el
// ajuste con motivo; y el alta (guardar_cliente pide pedidos:configurar).
//
//   node pruebas/test-administracion-clientes.js

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
  { id: 'c1', nombre: 'Distribuidora Anatolia', razon_social: 'ANATOLIA SRL', cuit: '30712345678', lista_precio_id: 'l1', limite_credito: 100000, activo: true },
  { id: 'c2', nombre: 'Kiosco Pepe', razon_social: null, cuit: null, lista_precio_id: null, limite_credito: null, activo: true },
  { id: 'c3', nombre: 'Mayorista Sur', razon_social: 'SUR SA', cuit: '30999888777', lista_precio_id: 'l1', limite_credito: 50000, activo: true },
]
const SALDOS = [
  { cliente_id: 'c1', nombre: 'Distribuidora Anatolia', razon_social: 'ANATOLIA SRL', cuit: '30712345678', lista: 'Mayoristas', saldo: 126000, ultimo_movimiento: '2026-09-20', retiros_mes: 3, es_tambien_proveedor: true },
  { cliente_id: 'c3', nombre: 'Mayorista Sur', razon_social: 'SUR SA', cuit: '30999888777', lista: 'Mayoristas', saldo: 40000, ultimo_movimiento: '2026-09-18', retiros_mes: 1, es_tambien_proveedor: false },
  { cliente_id: 'c2', nombre: 'Kiosco Pepe', razon_social: null, cuit: null, lista: null, saldo: 0, ultimo_movimiento: null, retiros_mes: 0, es_tambien_proveedor: false },
]
const CUENTA = [
  { fecha: '2026-09-01', tipo: 'saldo_inicial', detalle: null, importe: 80000, saldo: 80000, orden_retiro_id: null },
  { fecha: '2026-09-20', tipo: 'retiro', detalle: 'Orden de retiro N° 12', importe: 46000, saldo: 126000, orden_retiro_id: 'o1' },
  { fecha: '2026-09-21', tipo: 'ajuste', detalle: 'Orden de retiro N° 12 · Corrección de la valorización de la orden N-0012', importe: 1000, saldo: 127000, orden_retiro_id: 'o1' },
]

function preparar(S) {
  S.estado.clientes = CLIENTES
  S.estado.catalogo = { productos: [], presentaciones: [], marcas: [] }
  S.estado.catalogoEmpresa = 'u-n'
  S.__setRpc(async (n, p) => {
    if (n === 'clientes_con_saldo') return { data: SALDOS, error: null }
    if (n === 'cuenta_cliente') return { data: CUENTA, error: null }
    return { data: null, error: null }
  })
  S.__tablas.ordenes_retiro = [{ id: 'o1', codigo: 'N-0012' }]
}

// ── Permisos ───────────────────────────────────────────────────────────────
{
  const S = nuevo()
  chk('con retiros:ver se ve la sección Clientes', S.seccionesVisibles().some(s => s.id === 'clientes'))
  S.estado.misTareas = new Map([['retiros:precios', { unidades: ['u-n'] }]])
  chk('sin retiros:ver no', !S.seccionesVisibles().some(s => s.id === 'clientes'))
}

// ── La portada: los que pasan su límite ─────────────────────────────────────
{
  const S = nuevo()
  preparar(S)
  S.__tablas.ordenes_retiro = []
  esperas.push(S.mostrarInicio().then(() => {
    const h = S.__els.get('ad-secciones').innerHTML
    chk('la portada tiene la tarjeta de Clientes', /data-seccion="clientes"/.test(h))
    chk('con cuántos pasan su límite (solo Anatolia: 126.000 > 100.000)', /ad-seccion__numero--atencion">1</.test(h) && /cliente pasa su límite/.test(h))
    chk('sin límite cargado no cuenta como que lo pasa', S.pasaLimite(5, null) === false && S.pasaLimite(5, '') === false)
    chk('igual al límite no lo pasa', S.pasaLimite(100, 100) === false && S.pasaLimite(100.01, 100) === true)
  }))
}

// ── La lista ───────────────────────────────────────────────────────────────
{
  const S = nuevo()
  preparar(S)
  esperas.push(S.mostrarClientes().then(() => {
    const llamada = S.__llamadas.rpc.find(x => x[0] === 'clientes_con_saldo')
    chk('usa clientes_con_saldo de la empresa elegida', llamada && llamada[1].p_unidad_negocio_id === 'u-n')
    const h = S.__els.get('ad-clientes-lista').innerHTML
    chk('en el orden de la base (por saldo)', h.indexOf('data-cliente="c1"') < h.indexOf('data-cliente="c3"') && h.indexOf('data-cliente="c3"') < h.indexOf('data-cliente="c2"'))
    chk('con el saldo', /\$ 126\.000,00/.test(h) && /\$ 40\.000,00/.test(h))
    chk('con la lista y los retiros del mes', /Lista Mayoristas · 3 retiros este mes/.test(h) && /Sin lista · 0 retiros este mes/.test(h))
    chk('el que pasa su límite, en bordó y dicho', /data-cliente="c1"[^>]*/.test(h) && /ad-fila ad-fila--atencion" data-cliente="c1"/.test(h) && /Pasa su límite/.test(h))
    chk('el que no lo pasa, sin marca', !/ad-fila--atencion" data-cliente="c3"/.test(h))
    chk('el chip "también proveedor"', /ad-sello--proveedor">También proveedor</.test(h) && (h.match(/También proveedor/g) || []).length === 1)
    chk('la cuenta', S.__els.get('ad-clientes-cuenta').textContent === '3 clientes')
  }))
  chk('busca por nombre', S.clientesFiltrados(SALDOS, 'pepe').map(c => c.cliente_id).join() === 'c2')
  chk('por razón social', S.clientesFiltrados(SALDOS, 'sur sa').map(c => c.cliente_id).join() === 'c3')
  chk('por CUIT, con o sin guiones', S.clientesFiltrados(SALDOS, '30-71234').map(c => c.cliente_id).join() === 'c1')
}

// ── La cuenta corriente ────────────────────────────────────────────────────
{
  const S = nuevo()
  preparar(S)
  esperas.push(S.abrirCliente('c1').then(() => {
    const h = S.__els.get('ad-cliente-cuerpo').innerHTML
    chk('usa cuenta_cliente', S.__llamadas.rpc.some(x => x[0] === 'cuenta_cliente' && x[1].p_cliente_id === 'c1'))
    chk('el detalle dice el CÓDIGO de la orden, nunca el número pelado', /Orden de retiro N-0012/.test(h) && !/N°\s*12/.test(h))
    chk('y conserva lo que sigue (el motivo del ajuste)', /Orden de retiro N-0012 · Corrección de la valorización/.test(h))
    chk('con fecha, importe y saldo acumulado', /21\/09\/2026 · Ajuste/.test(h) && /saldo \$ 127\.000,00/.test(h))
    chk('el más nuevo arriba', h.indexOf('Ajuste') < h.indexOf('Saldo inicial</div>') || h.indexOf('21/09/2026') < h.indexOf('01/09/2026'))
    chk('el saldo final y el límite', /\$ 127\.000,00/.test(h) && /Límite de crédito \$ 100\.000,00/.test(h) && /Pasa su límite/.test(h))
    chk('los códigos se leen por id de la orden', S.__llamadas.consultas.some(c => c[0] === 'ordenes_retiro' && c[1].some(f => f[0] === 'in' && f[2].includes('o1'))))
    chk('con precios: Ficha y Ajuste', S.__els.get('ad-btn-ficha').hidden === false && S.__els.get('ad-btn-ajuste').hidden === false)
    chk('YA tiene saldo inicial: el botón no aparece', S.__els.get('ad-btn-saldo-inicial').hidden === true)
    S.abrirPanelCliente('saldo')
    chk('y tampoco se puede abrir el panel', S.estado.cliente.panel === null)
  }))
  chk('sin código conocido lo dice, sin inventar el número', S.detalleMovimiento({ orden_retiro_id: 'x', detalle: 'Orden de retiro N° 5' }, new Map()) === 'Orden de retiro (sin código)')
  chk('un movimiento sin orden usa su detalle o el tipo', S.detalleMovimiento({ tipo: 'saldo_inicial', detalle: null }, new Map()) === 'Saldo inicial')
}
{
  const S = nuevo()
  preparar(S)
  S.estado.misTareas = new Map([['retiros:ver', { unidades: ['u-n'] }]])
  esperas.push(S.abrirCliente('c1').then(() => {
    chk('solo con ver: ni Ficha, ni Saldo inicial, ni Ajuste', ['ad-btn-ficha', 'ad-btn-saldo-inicial', 'ad-btn-ajuste'].every(id => S.__els.get(id).hidden === true))
    S.abrirPanelCliente('ajuste')
    chk('y no se abre el panel', S.estado.cliente.panel === null)
  }))
}

// ── Saldo inicial (una vez) y ajuste (con motivo) ───────────────────────────
{
  const S = nuevo()
  preparar(S)
  S.__setRpc(async (n, p) => {
    if (n === 'cuenta_cliente') return { data: [], error: null }
    return { data: null, error: null }
  })
  esperas.push(S.abrirCliente('c2').then(async () => {
    chk('sin saldo inicial, el botón aparece', S.__els.get('ad-btn-saldo-inicial').hidden === false)
    S.abrirPanelCliente('saldo')
    chk('abre el panel con la fecha de hoy', S.estado.cliente.panel === 'saldo' && S.__els.get('ad-saldo-fecha').value === S.hoyArgentina())
    await S.guardarPanelCliente()
    chk('sin importe no se manda', !S.__llamadas.rpc.some(x => x[0] === 'registrar_saldo_inicial_cliente') && /distinto de cero/.test(S.estado.cliente.errorPanel))
    S.ponerNumero(S.__els.get('ad-saldo-importe'), -1500.5)
    S.__els.get('ad-saldo-obs').value = ' Saldo a favor de agosto '
    await S.guardarPanelCliente()
    const p = S.__llamadas.rpc.find(x => x[0] === 'registrar_saldo_inicial_cliente')?.[1]
    chk('registrar_saldo_inicial_cliente con importe (negativo = a favor), fecha y observación', p && p.p_cliente_id === 'c2' && p.p_importe === -1500.5 && p.p_fecha === S.hoyArgentina() && p.p_observacion === 'Saldo a favor de agosto')
  }))
}
{
  const S = nuevo()
  preparar(S)
  esperas.push(S.abrirCliente('c1').then(async () => {
    S.abrirPanelCliente('ajuste')
    S.ponerNumero(S.__els.get('ad-ajuste-importe'), -2000)
    S.__els.get('ad-ajuste-motivo').value = 'x'
    await S.guardarPanelCliente()
    chk('un ajuste sin motivo no se manda', !S.__llamadas.rpc.some(x => x[0] === 'ajustar_cuenta_cliente') && /lleva motivo/.test(S.estado.cliente.errorPanel))
    S.__els.get('ad-ajuste-motivo').value = 'Nota de crédito 0001-00000123'
    S.__setRpc(async (n) => n === 'ajustar_cuenta_cliente' ? { data: null, error: { message: 'No tenés permiso.' } } : { data: CUENTA, error: null })
    await S.guardarPanelCliente()
    const p = S.__llamadas.rpc.find(x => x[0] === 'ajustar_cuenta_cliente')?.[1]
    chk('ajustar_cuenta_cliente con el importe y el motivo', p && p.p_importe === -2000 && p.p_observacion === 'Nota de crédito 0001-00000123')
    chk('el error de la base va tal cual, pegado', S.estado.cliente.errorPanel === 'No tenés permiso.')
  }))
}

// ── La ficha: SOLO lo que cambió ────────────────────────────────────────────
{
  const S = nuevo()
  const original = { nombre: 'Kiosco Pepe', razon_social: null, cuit: '20111222333', condicion_iva: null, domicilio: 'Calle 1', localidad: null, provincia: null, codigo_postal: null,
    telefono: null, email: null, contacto_nombre: null, contacto_telefono: null, transporte_habitual: 'Flete Juan', banco: null, cbu: null, alias_cbu: null,
    lista_precio_id: null, limite_credito: 50000, plazo_pago_dias: 30, observaciones: null, proveedor_id: null }
  const igual = { ...original }
  chk('sin cambios no hay nada que mandar', Object.keys(S.cambiosFicha(original, igual)).length === 0)
  chk('los espacios de más no son un cambio', Object.keys(S.cambiosFicha(original, { ...original, domicilio: '  Calle   1 ' })).length === 0)
  const d = S.cambiosFicha(original, { ...original, razon_social: 'PEPE SRL', transporte_habitual: '', limite_credito: 75000.5, plazo_pago_dias: 30, cuit: '20111222333', proveedor_id: 'pv1' })
  chk('manda solo lo que cambió', JSON.stringify(Object.keys(d).sort()) === JSON.stringify(['limite_credito', 'proveedor_id', 'razon_social', 'transporte_habitual']))
  chk('"" borra el dato', d.transporte_habitual === '')
  chk('los importes van como texto del número', d.limite_credito === '75000.5')
  chk('el CUIT va tal cual, sin puntos', S.cambiosFicha(original, { ...original, cuit: '30712345678' }).cuit === '30712345678')
  chk('borrar el límite manda ""', S.cambiosFicha(original, { ...original, limite_credito: null }).limite_credito === '')
  chk('quitar el proveedor manda ""', S.cambiosFicha({ ...original, proveedor_id: 'pv1' }, { ...original, proveedor_id: null }).proveedor_id === '')
}
{
  const S = nuevo()
  preparar(S)
  const fila = { id: 'c2', nombre: 'Kiosco Pepe', razon_social: null, cuit: null, condicion_iva: null, domicilio: null, localidad: null, provincia: null, codigo_postal: null,
    telefono: null, email: null, contacto_nombre: null, contacto_telefono: null, transporte_habitual: null, banco: null, cbu: null, alias_cbu: null,
    lista_precio_id: null, limite_credito: null, plazo_pago_dias: null, proveedor_id: null, observaciones: null, unidad_negocio_id: 'u-n' }
  S.__tablas.clientes = [fila]
  S.__tablas.listas_precios = [{ id: 'l1', nombre: 'Mayoristas', moneda: 'ARS', activa: true }]
  S.__tablas.proveedores = [{ id: 'pv1', razon_social: 'KIOSCO PEPE SRL', nombre_fantasia: null, cuit: '30123456789', estado_alta: 'activo', activo: true }]
  esperas.push(S.abrirFicha('c2').then(async () => {
    chk('la ficha se abre con sus datos', S.estado.vista === 'ad-vista-ficha' && S.estado.ficha.original?.id === 'c2')
    chk('la lista de precios ofrece las de la empresa', /value="l1">Mayoristas</.test(S.__els.get('ad-f-lista_precio_id').innerHTML))
    await S.guardarFicha()
    chk('sin cambios no llama a la base y lo dice', !S.__llamadas.rpc.some(x => x[0] === 'guardar_ficha_cliente') && S.estado.ficha.error === 'No cambiaste nada.')
    S.__els.get('ad-f-cuit').value = '30-71234567-8'
    S.__els.get('ad-f-email').value = 'pepe@kiosco.com'
    S.__els.get('ad-f-lista_precio_id').value = 'l1'
    S.ponerNumero(S.__els.get('ad-f-limite_credito'), 90000)
    S.estado.ficha.busquedaProveedor = 'kiosco'
    chk('el buscador de proveedores encuentra por razón social', /data-proveedor="pv1"/.test(S.htmlResultadosProveedores('kiosco')))
    chk('y por CUIT', /data-proveedor="pv1"/.test(S.htmlResultadosProveedores('30123')))
    S.elegirProveedorFicha('pv1')
    chk('elegir el proveedor', S.estado.ficha.proveedorId === 'pv1' && /KIOSCO PEPE SRL · CUIT 30123456789/.test(S.htmlProveedorElegido('pv1')))
    S.elegirProveedorFicha('no-existe')
    chk('un proveedor que no está en el padrón no se elige', S.estado.ficha.proveedorId === 'pv1')
    let params = null
    S.__setRpc(async (n, p) => { if (n === 'guardar_ficha_cliente') { params = p; return { data: null, error: null } } if (n === 'cuenta_cliente') return { data: [], error: null }; return { data: null, error: null } })
    await S.guardarFicha()
    chk('guardar_ficha_cliente con SOLO lo que cambió', params && params.p_cliente_id === 'c2' &&
      JSON.stringify(Object.keys(params.p_datos).sort()) === JSON.stringify(['cuit', 'email', 'limite_credito', 'lista_precio_id', 'proveedor_id']))
    chk('el CUIT viaja como se escribió (la base saca los guiones)', params.p_datos.cuit === '30-71234567-8')
    chk('después vuelve a la cuenta', S.estado.vista === 'ad-vista-cliente')
  }))
}
{
  const S = nuevo()
  preparar(S)
  S.__tablas.clientes = [{ id: 'c2', nombre: 'Kiosco Pepe', unidad_negocio_id: 'u-n' }]
  S.__tablas.listas_precios = []
  S.__tablas.proveedores = []
  esperas.push(S.abrirFicha('c2').then(async () => {
    S.__els.get('ad-f-cbu').value = '123'
    S.__setRpc(async () => ({ data: null, error: { message: 'El CBU tiene que tener 22 números.' } }))
    await S.guardarFicha()
    chk('el error de la base va tal cual, pegado al botón', S.estado.ficha.error === 'El CBU tiene que tener 22 números.' && S.__els.get('ad-ficha-error').hidden === false)
    S.__els.get('ad-f-nombre').value = ' '
    await S.guardarFicha()
    chk('el nombre no puede quedar vacío', S.estado.ficha.error === 'El nombre no puede quedar vacío.')
  }))
  const T = nuevo()
  T.estado.misTareas = new Map([['retiros:ver', { unidades: ['u-n'] }]])
  esperas.push(T.abrirFicha('c2').then(() => chk('sin retiros:precios la ficha no se abre', T.estado.ficha === null && T.estado.vista !== 'ad-vista-ficha')))
}

// ── El alta ────────────────────────────────────────────────────────────────
{
  const S = nuevo()
  preparar(S)
  esperas.push(S.mostrarClientes().then(() => {
    chk('con retiros:precios SÍ hay alta (guardar_cliente la acepta desde el 26/09/2026)', S.__els.get('ad-btn-cliente-nuevo').hidden === false && S.__els.get('ad-clientes-alta-aviso').hidden === true)
    S.abrirAlta()
    chk('y se abre', S.estado.alta !== null)
  }))
  const V = nuevo()
  preparar(V)
  V.estado.misTareas = new Map([['retiros:ver', { unidades: ['u-n'] }]])
  esperas.push(V.mostrarClientes().then(() => {
    chk('solo con retiros:ver NO hay alta', V.__els.get('ad-btn-cliente-nuevo').hidden === true)
    V.abrirAlta()
    chk('y no se abre', V.estado.alta === null)
  }))
  const W = nuevo()
  W.estado.misTareas = new Map([['retiros:precios', { unidades: ['u-d'] }]])
  chk('precios en OTRA empresa no alcanza para el alta (alcance)', W.puedeDarAlta('u-n') === false && W.puedeDarAlta('u-d') === true)
  const T = nuevo()
  preparar(T)
  T.estado.misTareas.set('pedidos:configurar', { unidades: ['u-n'] })
  T.__tablas.clientes = [{ id: 'c9', nombre: 'Nuevo', unidad_negocio_id: 'u-n' }]
  esperas.push(T.mostrarClientes().then(async () => {
    chk('con pedidos:configurar, "+ Cliente nuevo"', T.__els.get('ad-btn-cliente-nuevo').hidden === false && T.__els.get('ad-clientes-alta-aviso').hidden === true)
    T.abrirAlta()
    T.__els.get('ad-alta-nombre').value = ' '
    await T.guardarAlta()
    chk('sin nombre no se manda', !T.__llamadas.rpc.some(x => x[0] === 'guardar_cliente') && /Poné el nombre/.test(T.estado.alta.error))
    T.__els.get('ad-alta-nombre').value = '  Nuevo   Cliente '
    T.__els.get('ad-alta-localidad').value = 'Rosario'
    T.__setRpc(async (n) => n === 'guardar_cliente' ? { data: 'c9', error: null } : { data: [], error: null })
    await T.guardarAlta()
    const p = T.__llamadas.rpc.find(x => x[0] === 'guardar_cliente')?.[1]
    chk('guardar_cliente con la empresa, el nombre limpio y sin apodos', p && p.p_id === null && p.p_unidad_negocio_id === 'u-n' && p.p_nombre === 'Nuevo Cliente' && Array.isArray(p.p_apodos) && p.p_localidad === 'Rosario')
    chk('y abre la ficha para completarla', T.estado.vista === 'ad-vista-ficha' && T.estado.ficha?.id === 'c9')
  }))
}

// ── HTML malicioso ─────────────────────────────────────────────────────────
{
  const S = nuevo()
  S.estado.clientes = [{ id: 'c1', nombre: marca('nombre'), limite_credito: 1 }]
  const fila = { cliente_id: 'c1', nombre: marca('nombre'), razon_social: marca('razon'), lista: marca('lista'), saldo: 5, retiros_mes: 1, es_tambien_proveedor: true }
  chequearMarcas(chk, 'fila de cliente', S.htmlFilaCliente(fila), ['nombre', 'razon', 'lista'])
  chequearMarcas(chk, 'cuenta', S.htmlCuenta({ id: 'c1', cuenta: [{ fecha: '2026-09-01', tipo: marca('tipo'), detalle: marca('detalle'), importe: 1, saldo: 1, orden_retiro_id: null }], codigos: new Map() }), ['tipo', 'detalle'])
  chequearMarcas(chk, 'cuenta con código', S.htmlCuenta({ id: 'c1', cuenta: [{ fecha: '2026-09-01', tipo: 'retiro', detalle: 'Orden de retiro N° 1', importe: 1, saldo: 1, orden_retiro_id: 'o' }], codigos: new Map([['o', marca('codigo')]]) }), ['codigo'])
  S.estado.proveedores = [{ id: 'p1', razon_social: marca('prov'), nombre_fantasia: marca('fantasia'), cuit: marca('cuit') }]
  chequearMarcas(chk, 'proveedores', S.htmlResultadosProveedores('x') + S.htmlProveedorElegido('p1'), ['prov', 'fantasia', 'cuit'])
  chequearMarcas(chk, 'proveedor buscado sin resultados', S.htmlResultadosProveedores(marca('prov-buscado') + 'zzqq'), ['prov-buscado'])
  chequearMarcas(chk, 'listas', S.htmlOpcionesListas([{ id: 'l', nombre: marca('lista-n'), moneda: marca('moneda') }]), ['lista-n', 'moneda'])
  S.estado.saldos = []
  S.estado.busquedaClientes = marca('busqueda')
  S.estado.saldos = [fila]
  chequearMarcas(chk, 'búsqueda sin resultados', S.htmlListaClientes(), ['busqueda'])
}

fin()
