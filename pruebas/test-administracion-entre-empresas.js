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
//  - LA MERCADERÍA CON PRECIO (con_precio de la base, 30/10/2026) nunca se
//    cuenta dos veces: su importe llega aparte como 'otro'. (La cuenta "≈"
//    con una lista de precios salió con la v2; lo nuevo de la v2 —el saldo
//    por par, el ajuste y las listas internas— está en
//    test-administracion-entre-empresas-v2.js.)
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
  F({ tipo: 'mercaderia', fecha: '2026-10-02', ...DE_N, detalle: 'Cucurucho grande · Caja x 100', unidad_medida: 'cajas', presentacion_id: 'pr-o', referencia_tipo: 'traspaso_terminado', referencia_id: 't1', con_precio: false }),
  F({ tipo: 'mercaderia', fecha: '2026-10-02', ...A_D, detalle: 'Cucurucho grande · Caja x 100', cantidad: 10, unidad_medida: 'cajas', presentacion_id: 'pr-d', referencia_tipo: 'traspaso_terminado', referencia_id: 't1', con_precio: false }),
  F({ tipo: 'insumos', fecha: '2026-10-01', ...DE_N, ...A_D, detalle: 'Azúcar Ledesma · lote L1', cantidad: 50, unidad_medida: 'kg', insumo_id: 'i1', referencia_tipo: 'transferencia_stock', referencia_id: 's1' }),
  // Producto terminado CON precio: la deuda ya está cargada como 'otro'.
  F({ tipo: 'mercaderia', fecha: '2026-10-06', ...DE_D, detalle: 'Cono dulce · Caja x 50', unidad_medida: 'cajas', presentacion_id: 'pr-o2', referencia_tipo: 'traspaso_terminado', referencia_id: 't2', con_precio: true }),
  F({ tipo: 'mercaderia', fecha: '2026-10-06', ...A_N, detalle: 'Cono dulce · Caja x 50', cantidad: 5, unidad_medida: 'cajas', presentacion_id: 'pr-d2', referencia_tipo: 'traspaso_terminado', referencia_id: 't2', con_precio: true }),
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
  chk('la mercadería con con_precio ya tiene su deuda (no se cuenta dos veces)', S.yaTienePrecio(filas.find(f => f.referencia_id === 't2')))
  chk('la de con_precio false no', !S.yaTienePrecio(filas.find(f => f.referencia_id === 't1')))
  chk('un cheque no es mercadería con precio', !S.yaTienePrecio(filas.find(f => f.tipo === 'cheque')))
  const r = S.resumenEntre(filas)
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
  // En cero.
  const cero = S.resumenEntre([F({ tipo: 'pago', ...DE_N, ...A_D, moneda: 'ARS', importe: 10, _id: 'a' }), F({ tipo: 'cobro', ...DE_D, ...A_N, moneda: 'ARS', importe: 10, _id: 'b' })])
  chk('las dos direcciones iguales: "Están en cero"', S.textosNetoEntre(cero.pares[0])[0] === 'Están en cero')
  // La dirección contraria sola.
  const solo = S.resumenEntre([F({ tipo: 'pago', ...DE_N, ...A_D, moneda: 'ARS', importe: 10, _id: 'a' })])
  chk('solo Nuss → Dolce: Dolce Pasta le debe a Nuss', S.textosNetoEntre(solo.pares[0])[0] === 'Dolce Pasta le debe a Nuss $ 10,00')
  // Una fila sin las dos empresas no entra al resumen.
  const suelta = S.resumenEntre([F({ tipo: 'mercaderia', ...DE_N, _id: 'z' })])
  chk('una fila sin las dos empresas va aparte', suelta.pares.length === 0 && suelta.sueltas.length === 1)
}

// ── Los filtros ────────────────────────────────────────────────────────────
{
  const S = nuevo()
  const filas = S.normalizarEntre(FILAS)
  const par = S.claveParEntre('u-n', 'u-d')
  chk('filtro par (en cualquier dirección)', S.filtrarEntre(filas, { par }).length === filas.length)
  chk('filtro par de otro par: nada', S.filtrarEntre(filas, { par: 'u-n|u-x' }).length === 0)
  chk('filtro tipo', S.filtrarEntre(filas, { tipo: 'pago' }).length === 2)
  chk('par y tipo juntos', S.filtrarEntre(filas, { par, tipo: 'insumos' }).length === 1)
  chk('sin filtros, todas', S.filtrarEntre(filas, {}).length === filas.length)
}

// ── La pantalla: cargar, la RPC, el error, el vacío, el turno ─────────────
{
  const S = nuevo()
  S.__setRpc((n) => n === 'movimientos_entre_empresas' ? { data: FILAS, error: null } : { data: null, error: null })
  esperas.push(S.cargarEntre().then(() => {
    const llamada = S.__llamadas.rpc.find(x => x[0] === 'movimientos_entre_empresas')
    chk('la RPC con p_desde y p_hasta del período', JSON.stringify(llamada?.[1]) === JSON.stringify({ p_desde: '2026-10-01', p_hasta: '2026-10-13' }), JSON.stringify(llamada?.[1]))
    chk('la lista: una tarjeta por movimiento', (html(S, 'ad-entre-lista').match(/data-entre="/g) || []).length === 8)
    chk('la cuenta', S.__els.get('ad-entre-cuenta').textContent === '8 movimientos')
    chk('la mercadería muestra las cajas', html(S, 'ad-entre-lista').includes('10 cajas'))
    chk('los insumos, los kilos', html(S, 'ad-entre-lista').includes('50 kg'))
    chk('el tipo con su sello', html(S, 'ad-entre-lista').includes('>Cheque</span>') && html(S, 'ad-entre-lista').includes('>Mercadería</span>'))
    chk('el traspaso con precio lo dice', html(S, 'ad-entre-lista').includes('Ya valorizada: su importe está en la deuda cargada'))
    chk('lo que falta valorizar dice "Sin valorizar"', html(S, 'ad-entre-lista').includes('Sin valorizar: todavía no tiene precio'))
    chk('ya no se leen listas de precios para valorizar', !S.__llamadas.consultas.some(c => c[0] === 'listas_precios'))
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
    chk('sin "$ 0" en un período vacío', !html(S, 'ad-entre-lista').includes('$ 0'))
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
    chk('el filtro de par no ofrece la fábrica de pruebas', !html(S, 'ad-entre-par').includes(PRUEBAS) && html(S, 'ad-entre-par').includes('u-n'))
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
  S.__setRpc((n, p) => { ll.push([n, p]); return n === 'movimientos_entre_empresas' ? { data: FILAS, error: null } : { data: null, error: null } })
  esperas.push(S.contarEntrePortada().then(r => {
    const mes = ll.filter(x => x[0] === 'movimientos_entre_empresas').pop()
    chk('la portada cuenta el mes, juntando las mitades', r.movimientos === 8 && r.pares === 1, JSON.stringify(r))
    chk('la portada pide del 1º del mes a hoy', /^\d{4}-\d{2}-01$/.test(mes?.[1]?.p_desde) && mes?.[1]?.p_hasta === S.hoyArgentina())
  }))
}

// ── XSS ───────────────────────────────────────────────────────────────────
{
  const S = nuevo()
  const f = F({ tipo: 'pago', de_unidad_id: 'u-z1', de_unidad: marca('de-unidad'), a_unidad_id: 'u-z2', a_unidad: marca('a-unidad'), detalle: marca('detalle'), moneda: 'ARS', importe: 5, _id: 'x1' })
  chequearMarcas(chk, 'fila', S.htmlFilaEntre(f), ['de-unidad', 'a-unidad', 'detalle'])
  const tipoRaro = S.htmlFilaEntre(F({ tipo: marca('tipo'), _id: 'x2' }))
  chequearMarcas(chk, 'fila con un tipo desconocido', tipoRaro, ['tipo'])
  S.estado.entre = S.entreVacio()
  S.estado.entre.error = marca('error-base')
  S.pintarEntre()
  chequearMarcas(chk, 'error de la base', html(S, 'ad-entre-lista'), ['error-base'])
  estaticoAcotado(chk, ARCHIVO, src, ['htmlFilaEntre', 'htmlOpcionesEntre', 'pintarEntre'],
    { escape: 'esc', seguras: SEGURAS_ADMINISTRACION, segurasRegex: SEGURAS_REGEX_ADMINISTRACION })
}

fin()
