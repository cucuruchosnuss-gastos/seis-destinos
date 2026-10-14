// ADMINISTRACIÓN — ENTRE EMPRESAS (13/10/2026).
//
// movimientos_entre_empresas(p_desde, p_hasta) devuelve lo que pasó de una
// empresa del grupo a otra (cheques, pagos, cobros, traspasos de plata,
// producto terminado, insumos y deudas cargadas). "De A a B" = el valor salió
// de A y lo recibió B → B le debe a A. Esta suite EJECUTA la pantalla y fija:
//  - EL PRODUCTO TERMINADO EN DOS MITADES: la base lo devuelve partido (la
//    salida con la empresa que entrega, la entrada con la que recibe y las
//    cajas); la pantalla las junta y busca el precio con la presentación de
//    ORIGEN.
//  - EL RESUMEN por par de empresas, por tipo y por moneda (pesos y dólares
//    nunca se suman), y el NETO en las dos direcciones, en centavos.
//  - LA VALORIZACIÓN con una lista de la empresa que entrega: precio_venta()
//    para el producto (presentación de origen, sin cono, fecha), y
//    precios_insumos_lista() para los insumos; lo que no tiene precio se dice;
//    sin el permiso de precios, se dice; nunca se cuenta dos veces un traspaso
//    que ya tiene su deuda cargada.
//  - LOS PARÁMETROS de la RPC, el error de la base TAL CUAL con Reintentar, el
//    período sin movimientos con palabras, la respuesta vieja que no pisa.
//  - EL PERMISO (gastos:gastos_empresa), la fábrica de pruebas afuera y XSS.
//
//   node pruebas/test-administracion-entre-empresas.js

const path = require('path')
const fs = require('fs')
const { construirAdministracion } = require('./sandbox-administracion')
const { arnes, marca, chequearMarcas, estaticoAcotado } = require('./circuito-comun')
const { SEGURAS_ADMINISTRACION, SEGURAS_REGEX_ADMINISTRACION } = require('./seguras-administracion')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/administracion.html')
const src = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${src.length} bytes)`)
const { chk, esperas, fin } = arnes()

const PRUEBAS = 'u-x'
function nuevo({ tareas = [['gastos:gastos_empresa', null], ['retiros:precios', { unidades: ['u-n', 'u-d'] }]], rol = 'usuario' } = {}) {
  const S = construirAdministracion(ARCHIVO)
  S.estado.miRolApp = rol
  S.estado.misTareas = new Map(tareas)
  S.estado.empresas = [
    { id: 'u-n', nombre: 'Cucuruchos Nuss', prefijo: 'N' },
    { id: 'u-d', nombre: 'Dolce Pasta', prefijo: 'D' },
    { id: PRUEBAS, nombre: 'Pruebas (robot)', prefijo: 'X' },
  ]
  S.estado.fabrica = { ok: true, unidades: new Set([PRUEBAS]), personas: new Set(), soyDePrueba: false }
  S.__doc.getElementById('ad-entre-desde').value = '2026-10-01'
  S.__doc.getElementById('ad-entre-hasta').value = '2026-10-13'
  return S
}
const html = (S, id) => S.__els.get(id)?.innerHTML ?? ''

// Lo que devuelve la base (la forma real de la RPC).
const F = (o) => ({ fecha: '2026-10-05', tipo: 'otro', de_unidad_id: null, de_unidad: null, a_unidad_id: null, a_unidad: null, detalle: '', moneda: null,
  importe: null, cantidad: null, unidad_medida: null, presentacion_id: null, insumo_id: null, referencia_tipo: null, referencia_id: null, ...o })
const DE_D = { de_unidad_id: 'u-d', de_unidad: 'Dolce Pasta' }, A_N = { a_unidad_id: 'u-n', a_unidad: 'Cucuruchos Nuss' }
const DE_N = { de_unidad_id: 'u-n', de_unidad: 'Cucuruchos Nuss' }, A_D = { a_unidad_id: 'u-d', a_unidad: 'Dolce Pasta' }
const FILAS = [
  F({ tipo: 'cheque', ...DE_D, ...A_N, detalle: 'Cheque depositado 007-12345678 en Banco Nuss · de Anatolia', moneda: 'ARS', importe: 100000, referencia_tipo: 'cheque', referencia_id: 'q1' }),
  F({ tipo: 'pago', fecha: '2026-10-04', ...DE_N, ...A_D, detalle: 'Harina · pagado desde Banco Nuss', moneda: 'ARS', importe: 30000, referencia_tipo: 'gasto', referencia_id: 'g1' }),
  F({ tipo: 'pago', fecha: '2026-10-03', ...DE_N, ...A_D, detalle: 'Repuesto · pagado desde Caja USD', moneda: 'USD', importe: 200, referencia_tipo: 'gasto', referencia_id: 'g2' }),
  F({ tipo: 'traspaso_dinero', fecha: '2026-10-04', ...DE_D, ...A_N, detalle: 'Traspaso de Banco DP a Banco Nuss', moneda: 'ARS', importe: 5000.5, referencia_tipo: 'caja_movimiento', referencia_id: 'm1' }),
  // Producto terminado SIN precio: las dos mitades de la base.
  F({ tipo: 'mercaderia', fecha: '2026-10-02', ...DE_N, detalle: 'Cucurucho grande · Caja x 100', unidad_medida: 'cajas', presentacion_id: 'pr-o', referencia_tipo: 'traspaso_terminado', referencia_id: 't1' }),
  F({ tipo: 'mercaderia', fecha: '2026-10-02', ...A_D, detalle: 'Cucurucho grande · Caja x 100', cantidad: 10, unidad_medida: 'cajas', presentacion_id: 'pr-d', referencia_tipo: 'traspaso_terminado', referencia_id: 't1' }),
  F({ tipo: 'insumos', fecha: '2026-10-01', ...DE_N, ...A_D, detalle: 'Azúcar Ledesma · lote L1', cantidad: 50, unidad_medida: 'kg', insumo_id: 'i1', referencia_tipo: 'transferencia_stock', referencia_id: 's1' }),
  // Producto terminado CON precio: la deuda ya está cargada como 'otro'.
  F({ tipo: 'mercaderia', fecha: '2026-10-06', ...DE_D, detalle: 'Cono dulce · Caja x 50', unidad_medida: 'cajas', presentacion_id: 'pr-o2', referencia_tipo: 'traspaso_terminado', referencia_id: 't2' }),
  F({ tipo: 'mercaderia', fecha: '2026-10-06', ...A_N, detalle: 'Cono dulce · Caja x 50', cantidad: 5, unidad_medida: 'cajas', presentacion_id: 'pr-d2', referencia_tipo: 'traspaso_terminado', referencia_id: 't2' }),
  F({ tipo: 'otro', fecha: '2026-10-06', ...DE_D, ...A_N, detalle: 'Traspaso de producto terminado · semana', moneda: 'ARS', importe: 20000, referencia_tipo: 'movimiento_entre_unidades', referencia_id: 'mu1' }),
]

// ── Las dos mitades del producto terminado ────────────────────────────────
{
  const S = nuevo()
  const filas = S.normalizarEntre(FILAS)
  const merc = filas.filter(f => f.tipo === 'mercaderia')
  chk('las mitades se juntan: un renglón por traspaso', merc.length === 2, merc.length)
  const t1 = merc.find(f => f.referencia_id === 't1')
  chk('de la salida: la empresa que entrega', t1?.de_unidad_id === 'u-n' && t1?.de_unidad === 'Cucuruchos Nuss')
  chk('de la entrada: la que recibe y las cajas', t1?.a_unidad_id === 'u-d' && t1?.cantidad === 10)
  chk('el precio se busca con la presentación de ORIGEN', t1?.presentacion_id === 'pr-o' && t1?.presentacion_destino_id === 'pr-d')
  chk('cada fila tiene su id', new Set(filas.map(f => f._id)).size === filas.length && filas.length === FILAS.length - 2)
  chk('ordenadas por fecha, la más nueva arriba', filas[0].fecha === '2026-10-06' && filas[filas.length - 1].fecha === '2026-10-01')
  const completa = F({ tipo: 'mercaderia', ...DE_N, ...A_D, cantidad: 3, presentacion_id: 'p', referencia_id: 'tz' })
  chk('una fila que ya trae las dos empresas no se toca', S.normalizarEntre([completa])[0].cantidad === 3 && S.normalizarEntre([completa])[0].presentacion_id === 'p')
  // Dos productos en el mismo traspaso: se aparean por el detalle.
  const dos = S.normalizarEntre([
    // El orden es a propósito: en orden, "chico" se llevaría la salida de "grande".
    F({ tipo: 'mercaderia', ...DE_N, detalle: 'Cucurucho grande · Caja x 100', presentacion_id: 'o-grande', referencia_id: 't9' }),
    F({ tipo: 'mercaderia', ...DE_N, detalle: 'Cucurucho chico · Caja x 200', presentacion_id: 'o-chico', referencia_id: 't9' }),
    F({ tipo: 'mercaderia', ...A_D, detalle: 'Cucurucho chico · Caja Chica', cantidad: 4, presentacion_id: 'd-chico', referencia_id: 't9' }),
    F({ tipo: 'mercaderia', ...A_D, detalle: 'Cucurucho grande · Caja x 100', cantidad: 7, presentacion_id: 'd-grande', referencia_id: 't9' }),
  ])
  chk('dos productos: el detalle igual se aparea', dos.find(f => f.presentacion_destino_id === 'd-grande')?.presentacion_id === 'o-grande')
  chk('dos productos: con distinta presentación, por el nombre del producto', dos.find(f => f.presentacion_destino_id === 'd-chico')?.presentacion_id === 'o-chico')
  chk('una mitad sola queda (sin inventar la otra empresa)', S.normalizarEntre([F({ tipo: 'mercaderia', ...DE_N, referencia_id: 'tq' })])[0].a_unidad_id === null)
}

// ── Plata y cantidades ─────────────────────────────────────────────────────
{
  const S = nuevo()
  chk('plata en pesos', S.plataEntre(1234.5, 'ARS') === '$ 1.234,50')
  chk('plata en dólares', S.plataEntre(200, 'USD') === 'US$ 200,00')
  chk('un importe ausente es "—", nunca "$ 0"', S.plataEntre(null, 'ARS') === '—' && S.plataEntre('', 'ARS') === '—' && S.plataEntre(undefined) === '—')
  chk('un cero de verdad es $ 0,00', S.plataEntre(0, 'ARS') === '$ 0,00')
  chk('centavos sin error de coma flotante', S.centavosEntre(0.1 + 0.2) === 30 && S.centavosEntre(null) === null)
  chk('cajas', S.cantidadEntre({ cantidad: 1500, unidad_medida: 'cajas' }) === '1.500 cajas' && S.cantidadEntre({ cantidad: 1, unidad_medida: 'cajas' }) === '1 caja')
  chk('kilos con decimales', S.cantidadEntre({ cantidad: 6250.5, unidad_medida: 'kg' }) === '6.250,5 kg')
  chk('unidades', S.cantidadEntre({ cantidad: 300, unidad_medida: 'un' }) === '300 u')
  chk('una cantidad ausente es "—"', S.cantidadEntre({ cantidad: null, unidad_medida: 'kg' }) === '—')
}

// ── El resumen por par y el neto ──────────────────────────────────────────
{
  const S = nuevo()
  const filas = S.normalizarEntre(FILAS)
  const con = S.traspasosConPrecio(filas)
  chk('el traspaso con precio se reconoce por la deuda cargada', con.size === 1)
  chk('su mercadería ya tiene precio (no se valoriza)', S.yaTienePrecio(filas.find(f => f.referencia_id === 't2'), con) && !S.necesitaValor(filas.find(f => f.referencia_id === 't2'), con))
  chk('la otra mercadería sí necesita valor', S.necesitaValor(filas.find(f => f.referencia_id === 't1'), con))
  chk('los insumos también', S.necesitaValor(filas.find(f => f.tipo === 'insumos'), con))
  chk('un cheque no', !S.necesitaValor(filas.find(f => f.tipo === 'cheque'), con))
  const r = S.resumenEntre(filas, new Map(), con)
  chk('un solo par: Dolce Pasta y Nuss', r.pares.length === 1 && r.pares[0].x === 'u-d' && r.pares[0].y === 'u-n', r.pares.map(p => p.x + '|' + p.y).join())
  const p = r.pares[0]
  chk('Dolce → Nuss: cheques', p.dirs.xy.tipos.get('cheque').get('ARS') === 10000000)
  chk('Dolce → Nuss: traspaso de plata con centavos', p.dirs.xy.tipos.get('traspaso_dinero').get('ARS') === 500050)
  chk('Dolce → Nuss: la deuda cargada cuenta', p.dirs.xy.tipos.get('otro').get('ARS') === 2000000)
  chk('el traspaso con precio NO se cuenta dos veces', !p.dirs.xy.tipos.has('mercaderia') && p.dirs.xy.conPrecioEnDeuda === 1)
  chk('Nuss → Dolce: pesos y dólares separados', p.dirs.yx.tipos.get('pago').get('ARS') === 3000000 && p.dirs.yx.tipos.get('pago').get('USD') === 20000)
  chk('lo que no tiene valor se cuenta aparte', p.dirs.yx.sinValor === 2 && p.sinValor === 2)
  chk('neto en pesos: Dolce → Nuss menos Nuss → Dolce', p.neto.get('ARS') === 12500050 - 3000000)
  chk('neto en dólares, aparte', p.neto.get('USD') === -20000)
  const netos = S.textosNetoEntre(p)
  chk('Nuss le debe a Dolce Pasta en pesos', netos[0] === 'Nuss le debe a Dolce Pasta $ 95.000,50', netos[0])
  chk('Dolce Pasta le debe a Nuss en dólares (la otra dirección)', netos[1] === 'Dolce Pasta le debe a Nuss US$ 200,00', netos[1])
  const t = S.textoDireccionEntre(p.dirs.xy)
  chk('el texto de una dirección, por tipo', t.includes('$ 100.000,00 en cheques') && t.includes('$ 5.000,50 en traspasos de plata') && t.includes('$ 20.000,00 en deudas cargadas'), t)
  chk('y dice lo que ya está en la deuda cargada', t.includes('1 traspaso de producto ya incluido en la deuda cargada'), t)
  const t2 = S.textoDireccionEntre(p.dirs.yx)
  chk('pesos y dólares en el mismo tipo: "y"', t2.includes('$ 30.000,00 y US$ 200,00 en pagos'), t2)
  chk('lo sin valor se dice', t2.includes('2 movimientos sin valor'), t2)
  // En cero.
  const cero = S.resumenEntre([F({ tipo: 'pago', ...DE_N, ...A_D, moneda: 'ARS', importe: 10, _id: 'a' }), F({ tipo: 'cobro', ...DE_D, ...A_N, moneda: 'ARS', importe: 10, _id: 'b' })], new Map(), new Set())
  chk('las dos direcciones iguales: "Están en cero"', S.textosNetoEntre(cero.pares[0])[0] === 'Están en cero')
  // La dirección contraria sola.
  const solo = S.resumenEntre([F({ tipo: 'pago', ...DE_N, ...A_D, moneda: 'ARS', importe: 10, _id: 'a' })], new Map(), new Set())
  chk('solo Nuss → Dolce: Dolce Pasta le debe a Nuss', S.textosNetoEntre(solo.pares[0])[0] === 'Dolce Pasta le debe a Nuss $ 10,00')
  // Una fila sin las dos empresas no entra al resumen.
  const suelta = S.resumenEntre([F({ tipo: 'mercaderia', ...DE_N, _id: 'z' })], new Map(), new Set())
  chk('una fila sin las dos empresas va aparte', suelta.pares.length === 0 && suelta.sueltas.length === 1)
  // El HTML del par.
  const h = S.htmlParEntre(p)
  chk('el par dice el neto', h.includes('Neto: Nuss le debe a Dolce Pasta $ 95.000,50'))
  chk('el par dice las dos direcciones', h.includes('Dolce Pasta → Nuss:') && h.includes('Nuss → Dolce Pasta:'))
  chk('el par avisa lo que falta valorizar', h.includes('Faltan valorizar 2 movimientos de mercadería o insumos: no entran en el neto.'))
  chk('con la etiqueta de color de cada fábrica', (h.match(/ad-sello--empresa/g) || []).length === 2)
}

// ── Los filtros ────────────────────────────────────────────────────────────
{
  const S = nuevo()
  const filas = S.normalizarEntre(FILAS)
  chk('filtro origen', S.filtrarEntre(filas, { origen: 'u-n' }).every(f => f.de_unidad_id === 'u-n') && S.filtrarEntre(filas, { origen: 'u-n' }).length === 4)
  chk('filtro destino', S.filtrarEntre(filas, { destino: 'u-n' }).length === 4)
  chk('filtro tipo', S.filtrarEntre(filas, { tipo: 'pago' }).length === 2)
  chk('los tres juntos', S.filtrarEntre(filas, { origen: 'u-n', destino: 'u-d', tipo: 'insumos' }).length === 1)
  chk('sin filtros, todas', S.filtrarEntre(filas, {}).length === filas.length)
}

// ── La pantalla: cargar, la RPC, el error, el vacío, el turno ─────────────
{
  const S = nuevo()
  S.__setRpc((n) => n === 'movimientos_entre_empresas' ? { data: FILAS, error: null } : (n === 'precio_venta' || n === 'precios_insumos_lista') ? { data: null, error: null } : { data: null, error: null })
  S.__tablas.listas_precios = [{ id: 'l-n', nombre: 'Distribuidores', moneda: 'ARS', activa: true }]
  esperas.push(S.cargarEntre().then(() => {
    const llamada = S.__llamadas.rpc.find(x => x[0] === 'movimientos_entre_empresas')
    chk('la RPC con p_desde y p_hasta del período', JSON.stringify(llamada?.[1]) === JSON.stringify({ p_desde: '2026-10-01', p_hasta: '2026-10-13' }), JSON.stringify(llamada?.[1]))
    chk('la lista: una tarjeta por movimiento', (html(S, 'ad-entre-lista').match(/data-entre="/g) || []).length === 8)
    chk('la cuenta', S.__els.get('ad-entre-cuenta').textContent === '8 movimientos')
    chk('el resumen arriba', html(S, 'ad-entre-resumen').includes('Neto: Nuss le debe a Dolce Pasta $ 95.000,50'))
    chk('la mercadería muestra las cajas', html(S, 'ad-entre-lista').includes('10 cajas'))
    chk('los insumos, los kilos', html(S, 'ad-entre-lista').includes('50 kg'))
    chk('el tipo en palabras', html(S, 'ad-entre-lista').includes('Cheque en el banco de otra') && html(S, 'ad-entre-lista').includes('Producto terminado'))
    chk('el traspaso con precio lo dice', html(S, 'ad-entre-lista').includes('Con precio: el importe está en la deuda cargada del mismo día.'))
    chk('lo que falta valorizar dice "Sin valorizar"', html(S, 'ad-entre-lista').includes('Sin valorizar'))
    const consulta = S.__llamadas.consultas.find(c => c[0] === 'listas_precios')
    chk('se leen las listas de la empresa que ENTREGA (Nuss), activas', !!consulta && consulta[1].some(f => f[0] === 'eq' && f[1] === 'unidad_negocio_id' && f[2] === 'u-n') && consulta[1].some(f => f[0] === 'eq' && f[1] === 'activa' && f[2] === true))
    chk('no se leen las de Dolce (su producto ya tiene precio)', !S.__llamadas.consultas.some(c => c[0] === 'listas_precios' && c[1].some(f => f[0] === 'eq' && f[2] === 'u-d')))
  }))
}
{
  // El error de la base TAL CUAL, con Reintentar.
  const S = nuevo()
  S.__setRpc(() => ({ data: null, error: { message: 'No tenés permiso para ver los movimientos entre empresas.' } }))
  esperas.push(S.cargarEntre().then(() => {
    const h = html(S, 'ad-entre-lista')
    chk('el error de la base tal cual', h.includes('No tenés permiso para ver los movimientos entre empresas.'))
    chk('con Reintentar', h.includes('data-entre-reintentar') && h.includes('Reintentar'))
    chk('sin resumen con un error', html(S, 'ad-entre-resumen') === '')
  }))
  const S2 = nuevo()
  S2.__setRpc(() => ({ data: null, error: { message: 'El período no puede pasar de dos años.' } }))
  esperas.push(S2.cargarEntre().then(() => chk('el error del período, tal cual', html(S2, 'ad-entre-lista').includes('El período no puede pasar de dos años.'))))
}
{
  // Un período sin movimientos, con palabras.
  const S = nuevo()
  S.__setRpc(() => ({ data: [], error: null }))
  esperas.push(S.cargarEntre().then(() => {
    chk('período sin movimientos: con palabras', html(S, 'ad-entre-lista').includes('En este período ninguna empresa le pasó nada a otra.'))
    chk('sin "$ 0" en un período vacío', !html(S, 'ad-entre-resumen').includes('$ 0'))
  }))
  // Sin fechas no se llama a la base.
  const S2 = nuevo()
  S2.__doc.getElementById('ad-entre-desde').value = ''
  esperas.push(S2.cargarEntre().then(() => {
    chk('sin período no se consulta', !S2.__llamadas.rpc.some(x => x[0] === 'movimientos_entre_empresas'))
    chk('y lo dice', html(S2, 'ad-entre-lista').includes('Elegí el período.'))
  }))
}
{
  // La respuesta vieja no pisa la nueva.
  const S = nuevo()
  let soltar
  let n = 0
  S.__setRpc(() => (++n === 1 ? new Promise(r => { soltar = () => r({ data: FILAS, error: null }) }) : { data: [], error: null }))
  const primera = S.cargarEntre()
  esperas.push(S.cargarEntre().then(() => { soltar(); return primera }).then(() => {
    chk('la respuesta vieja no pisa la nueva', html(S, 'ad-entre-lista').includes('ninguna empresa le pasó nada'))
  }))
}
{
  // La fábrica de pruebas no aparece.
  const S = nuevo()
  S.__setRpc(() => ({ data: [F({ tipo: 'pago', ...DE_N, a_unidad_id: PRUEBAS, a_unidad: 'Pruebas (robot)', moneda: 'ARS', importe: 1 }), FILAS[0]], error: null }))
  esperas.push(S.cargarEntre().then(() => {
    chk('un movimiento con la fábrica de pruebas no aparece', (html(S, 'ad-entre-lista').match(/data-entre="/g) || []).length === 1)
    S.pintarFiltrosEntre(S.estado.entre)
    chk('los filtros de empresa no ofrecen la fábrica de pruebas', !html(S, 'ad-entre-origen').includes(PRUEBAS) && html(S, 'ad-entre-origen').includes('u-n'))
  }))
}

// ── Valorizar ─────────────────────────────────────────────────────────────
function rpcValorizar(llamadas, { precio = { precio_caja: 1500.25, sin_precio: false }, insumos = [{ insumo_id: 'i1', precio_unitario: 100.5, sin_costo: false }] } = {}) {
  return (n, p) => {
    llamadas.push([n, p])
    if (n === 'movimientos_entre_empresas') return { data: FILAS, error: null }
    if (n === 'precio_venta') return { data: precio, error: null }
    if (n === 'precios_insumos_lista') return { data: insumos, error: null }
    return { data: null, error: null }
  }
}
{
  const S = nuevo()
  const ll = []
  S.__setRpc(rpcValorizar(ll))
  S.__tablas.listas_precios = [{ id: 'l-n', nombre: 'Distribuidores', moneda: 'ARS', activa: true }]
  esperas.push(S.cargarEntre().then(() => S.leerListasEntre('u-n')).then(() => {
    const v = html(S, 'ad-entre-valorizar')
    chk('el selector de listas de la empresa que entrega', v.includes('data-entre-lista="u-n"') && v.includes('Distribuidores') && v.includes('Valorizar lo que entregó Nuss con la lista'))
    chk('un solo selector (Dolce no tiene nada sin valor)', (v.match(/data-entre-lista=/g) || []).length === 1)
    return S.valorizarEntre('u-n', 'l-n')
  }).then(() => {
    const pv = ll.find(x => x[0] === 'precio_venta')
    chk('precio_venta con la lista, la presentación de ORIGEN, sin cono y la fecha', JSON.stringify(pv?.[1]) === JSON.stringify({ p_lista_id: 'l-n', p_presentacion_id: 'pr-o', p_marca_id: null, p_fecha: '2026-10-02' }), JSON.stringify(pv?.[1]))
    chk('el producto con precio de Dolce no se pide (ya tiene su deuda)', !ll.some(x => x[0] === 'precio_venta' && x[1].p_presentacion_id === 'pr-o2'))
    const pi = ll.find(x => x[0] === 'precios_insumos_lista')
    chk('precios_insumos_lista con la lista y la fecha', JSON.stringify(pi?.[1]) === JSON.stringify({ p_lista_id: 'l-n', p_fecha: '2026-10-01' }))
    const e = S.estado.entre
    const t1 = e.filas.find(f => f.referencia_id === 't1'), ins = e.filas.find(f => f.tipo === 'insumos')
    chk('el producto: precio de la caja × las cajas', e.valores.get(t1._id)?.cent === 1500250)
    chk('los insumos: precio × kilos', e.valores.get(ins._id)?.cent === 502500)
    const r = html(S, 'ad-entre-resumen')
    chk('el neto suma lo valorizado', r.includes('Neto: Nuss le debe a Dolce Pasta $ 74.973,00'), r.match(/Neto:[^<]*/g)?.join(' | '))
    chk('marcado como valorizado', r.includes('(valorizado)') && r.includes('≈ $ 15.002,50 en producto terminado (valorizado)'))
    chk('ya no avisa que falta valorizar', !r.includes('Faltan valorizar'))
    chk('la fila dice cuánto vale y con qué lista', html(S, 'ad-entre-lista').includes('≈ $ 15.002,50 con la lista Distribuidores'))
    chk('todo valorizado se dice', html(S, 'ad-entre-valorizar').includes('Todo valorizado con la lista Distribuidores.'))
    // Volver a "Sin valorizar" saca lo valorizado.
    return S.valorizarEntre('u-n', '')
  }).then(() => {
    chk('"Sin valorizar" saca lo valorizado', S.estado.entre.valores.size === 0 && html(S, 'ad-entre-resumen').includes('Neto: Nuss le debe a Dolce Pasta $ 95.000,50'))
  }))
}
{
  // Sin precio: se dice, nunca se inventa.
  const S = nuevo()
  const ll = []
  S.__setRpc(rpcValorizar(ll, { precio: { sin_precio: true, motivo: 'El producto no tiene precio en la lista base.' }, insumos: [{ insumo_id: 'i1', precio_unitario: null, sin_costo: true }] }))
  S.__tablas.listas_precios = [{ id: 'l-n', nombre: 'Distribuidores', moneda: 'ARS', activa: true }]
  esperas.push(S.cargarEntre().then(() => S.leerListasEntre('u-n')).then(() => S.valorizarEntre('u-n', 'l-n')).then(() => {
    chk('"N renglones sin precio en la lista X"', html(S, 'ad-entre-valorizar').includes('2 renglones sin precio en la lista Distribuidores'), html(S, 'ad-entre-valorizar'))
    chk('la fila dice el motivo de la base', html(S, 'ad-entre-lista').includes('Sin precio en la lista Distribuidores: El producto no tiene precio en la lista base.'))
    chk('un insumo a costo sin costo lo dice', html(S, 'ad-entre-lista').includes('falta cargar el costo'))
    chk('lo sin precio NO entra en el neto (nada inventado)', html(S, 'ad-entre-resumen').includes('Neto: Nuss le debe a Dolce Pasta $ 95.000,50'))
    chk('y sigue avisando que falta', html(S, 'ad-entre-resumen').includes('Faltan valorizar 2'))
  }))
  const S2 = nuevo()
  S2.__setRpc(rpcValorizar([], { insumos: [] }))
  S2.__tablas.listas_precios = [{ id: 'l-n', nombre: 'Distribuidores', moneda: 'ARS', activa: true }]
  esperas.push(S2.cargarEntre().then(() => S2.leerListasEntre('u-n')).then(() => S2.valorizarEntre('u-n', 'l-n')).then(() => {
    chk('un insumo que no está en la lista: 1 renglón sin precio', html(S2, 'ad-entre-valorizar').includes('1 renglón sin precio en la lista Distribuidores'))
    chk('y la fila dice que no está en la lista', html(S2, 'ad-entre-lista').includes('no está en la lista'))
  }))
  // Un insumo marcado sin costo no se valoriza aunque traiga un número.
  const S3 = nuevo()
  S3.__setRpc(rpcValorizar([], { insumos: [{ insumo_id: 'i1', precio_unitario: 5, sin_costo: true }] }))
  S3.__tablas.listas_precios = [{ id: 'l-n', nombre: 'Distribuidores', moneda: 'ARS', activa: true }]
  esperas.push(S3.cargarEntre().then(() => S3.leerListasEntre('u-n')).then(() => S3.valorizarEntre('u-n', 'l-n')).then(() => {
    const ins = S3.estado.entre.filas.find(f => f.tipo === 'insumos')
    chk('sin costo: no se valoriza aunque traiga un número', S3.estado.entre.valores.get(ins._id)?.cent === undefined && html(S3, 'ad-entre-lista').includes('falta cargar el costo'))
  }))
}
{
  // Sin retiros:precios: el producto no se valoriza y se dice (los insumos sí, con retiros:ver).
  const S = nuevo({ tareas: [['gastos:gastos_empresa', null], ['retiros:ver', { unidades: ['u-n'] }]] })
  const ll = []
  S.__setRpc(rpcValorizar(ll))
  S.__tablas.listas_precios = [{ id: 'l-n', nombre: 'Distribuidores', moneda: 'ARS', activa: true }]
  esperas.push(S.cargarEntre().then(() => S.leerListasEntre('u-n')).then(() => S.valorizarEntre('u-n', 'l-n')).then(() => {
    chk('sin retiros:precios no se llama a precio_venta', !ll.some(x => x[0] === 'precio_venta'))
    chk('y lo dice, en vez de un cero', html(S, 'ad-entre-valorizar').includes('hace falta el permiso de precios de Órdenes de retiro en Nuss: 1 renglón queda sin valorizar.'), html(S, 'ad-entre-valorizar'))
    chk('los insumos sí se valorizan (precios_insumos_lista acepta retiros:ver)', S.estado.entre.valores.get(S.estado.entre.filas.find(f => f.tipo === 'insumos')._id)?.cent === 502500)
  }))
  // Sin ningún permiso de retiros: no hay selector, se dice.
  const S2 = nuevo({ tareas: [['gastos:gastos_empresa', null]] })
  S2.__setRpc(rpcValorizar([]))
  esperas.push(S2.cargarEntre().then(() => {
    const v = html(S2, 'ad-entre-valorizar')
    chk('sin permiso de retiros: lo dice', v.includes('Para valorizar lo que entregó Nuss hace falta el permiso de precios de Órdenes de retiro en esa empresa.'))
    chk('y no hay selector', !v.includes('data-entre-lista'))
    chk('y no lee las listas', !S2.__llamadas.consultas.some(c => c[0] === 'listas_precios'))
  }))
}
{
  // El error de una valorización, tal cual; y sin listas activas, se dice.
  const S = nuevo()
  S.__setRpc((n) => n === 'movimientos_entre_empresas' ? { data: FILAS, error: null } : { data: null, error: { message: 'No tenés permiso para ver precios.' } })
  S.__tablas.listas_precios = [{ id: 'l-n', nombre: 'Distribuidores', moneda: 'ARS', activa: true }]
  esperas.push(S.cargarEntre().then(() => S.leerListasEntre('u-n')).then(() => S.valorizarEntre('u-n', 'l-n')).then(() => {
    chk('el error de la valorización, tal cual', html(S, 'ad-entre-valorizar').includes('No se pudo valorizar con la lista Distribuidores: No tenés permiso para ver precios.'))
    chk('con error no queda nada valorizado', S.estado.entre.valores.size === 0)
  }))
  const S2 = nuevo()
  S2.__setRpc(rpcValorizar([]))
  S2.__tablas.listas_precios = []
  esperas.push(S2.cargarEntre().then(() => S2.leerListasEntre('u-n')).then(() => {
    chk('sin listas activas, se dice', html(S2, 'ad-entre-valorizar').includes('Nuss no tiene listas de precios activas'))
  }))
}

// ── El permiso, la sección, la portada ────────────────────────────────────
{
  const S = nuevo()
  const s = S.SECCIONES.find(x => x.id === 'entre')
  chk('la sección existe y es global', !!s && s.global === true)
  chk('con gastos:gastos_empresa se ve', S.seccionVisible(s))
  const S2 = nuevo({ tareas: [['retiros:ver', { todas: true }]] })
  chk('sin gastos:gastos_empresa no se ve', !S2.seccionVisible(s))
  const S3 = nuevo({ tareas: [], rol: 'super_admin' })
  chk('un super_admin la ve', S3.seccionVisible(s))
  chk('está en las pestañas', S.PESTANAS.some(([id]) => id === 'entre'))
  chk('la vista es global (sin selector de empresa)', S.VISTAS_GLOBALES.includes('ad-vista-entre') && S.VISTAS.includes('ad-vista-entre'))
  chk('Administración lee las tareas de gastos', /\.in\('modulo', \[[^\]]*'gastos'/.test(src))
  S.mostrarEntre()
  chk('mostrarEntre abre la vista', S.estado.vista === 'ad-vista-entre')
  S2.mostrarEntre()
  chk('sin permiso, mostrarEntre no abre', S2.estado.vista !== 'ad-vista-entre')
  const c = S.contenidoSeccionEntre({ entre: { movimientos: 8, pares: 1 } })
  chk('la portada: movimientos del mes y los pares', c.numero === 8 && c.unidad === 'movimientos este mes' && c.lineas[0] === 'Entre 1 par de empresas')
  chk('la portada cargando', S.contenidoSeccionEntre({}).carga === true)
  chk('la portada con error', S.contenidoSeccionEntre({ errorEntre: 'No se pudo contar.' }).error === 'No se pudo contar.')
  const ll = []
  S.__setRpc(rpcValorizar(ll))
  esperas.push(S.contarEntrePortada().then(r => {
    chk('la portada cuenta el mes, juntando las mitades', r.movimientos === 8 && r.pares === 1, JSON.stringify(r))
    chk('la portada pide del 1º del mes a hoy', /^\d{4}-\d{2}-01$/.test(ll[0]?.[1]?.p_desde) && ll[0]?.[1]?.p_hasta === S.hoyArgentina())
  }))
}

// ── XSS ───────────────────────────────────────────────────────────────────
{
  const S = nuevo()
  const f = F({ tipo: 'pago', de_unidad_id: 'u-z1', de_unidad: marca('de-unidad'), a_unidad_id: 'u-z2', a_unidad: marca('a-unidad'), detalle: marca('detalle'), moneda: 'ARS', importe: 5, _id: 'x1' })
  chequearMarcas(chk, 'fila', S.htmlFilaEntre(f, { conPrecio: new Set(), valores: new Map() }), ['de-unidad', 'a-unidad', 'detalle'])
  const tipoRaro = S.htmlFilaEntre(F({ tipo: marca('tipo'), _id: 'x2' }), {})
  chequearMarcas(chk, 'fila con un tipo desconocido', tipoRaro, ['tipo'])
  const r = S.resumenEntre([f], new Map(), new Set())
  chequearMarcas(chk, 'par', S.htmlParEntre(r.pares[0]), ['de-unidad', 'a-unidad'])
  const merc = F({ tipo: 'mercaderia', ...DE_N, ...A_D, cantidad: 2, unidad_medida: 'cajas', _id: 'x3' })
  const vals = new Map([['x3', { motivo: marca('motivo'), lista: marca('lista') }]])
  chequearMarcas(chk, 'fila sin precio', S.htmlFilaEntre(merc, { conPrecio: new Set(), valores: vals }), ['motivo', 'lista'])
  const e = S.entreVacio()
  e.listas.set('u-n', { filas: [{ id: marca('id-lista'), nombre: marca('nombre-lista') }] })
  e.valorizando.set('u-n', { error: marca('error-val'), lista: 'L' })
  chequearMarcas(chk, 'selector de listas', S.htmlValorizarEntre(e, ['u-n']), ['id-lista', 'nombre-lista', 'error-val'])
  const e2 = S.entreVacio()
  e2.listas.set('u-n', { error: marca('error-listas'), filas: [] })
  chequearMarcas(chk, 'error de las listas', S.htmlValorizarEntre(e2, ['u-n']), ['error-listas'])
  S.estado.entre = S.entreVacio()
  S.estado.entre.error = marca('error-base')
  S.pintarEntre()
  chequearMarcas(chk, 'error de la base', html(S, 'ad-entre-lista'), ['error-base'])
  estaticoAcotado(chk, ARCHIVO, src, ['htmlParEntre', 'htmlFilaEntre', 'htmlValorizarUnidadEntre', 'htmlValorizarEntre', 'htmlOpcionesEntre', 'pintarEntre'],
    { escape: 'esc', seguras: SEGURAS_ADMINISTRACION, segurasRegex: SEGURAS_REGEX_ADMINISTRACION })
}

fin()
