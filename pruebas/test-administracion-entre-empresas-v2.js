// ADMINISTRACIÓN — ENTRE EMPRESAS v2 (30/10/2026).
//
// La convención (verificada en la base el 30/10/2026): en
// movimientos_entre_empresas, de_unidad = la que TIENE QUE COBRAR y a_unidad
// = la que DEBE. Esta suite EJECUTA la pantalla y fija:
//  - EL SALDO NETO POR PAR (desde siempre: los últimos 800 días, el tope de
//    la base), con el caso real del 30/10/2026: un pago de Nuss por un gasto
//    de Dolce suma a "Dolce le debe a Nuss"; con los cheques endosados queda
//    "Nuss le debe a Dolce Pasta $ 11.687.409,88". Pesos y dólares aparte.
//  - TOCAR LA TARJETA FILTRA la lista a ese par (y de nuevo, todos).
//  - LA MERCADERÍA SIN VALORIZAR (con_precio false): por orden, con el
//    producto y las cajas, y "Valorizar la orden" que abre la orden.
//  - LA FILA: el sello del tipo, quién le debe a quién y el link a la orden,
//    el gasto, la cobranza o el cheque (solo si esa sección se ve).
//  - EL AJUSTE: registrar_movimiento_entre_empresas con sus parámetros, lo
//    que valida la pantalla con las palabras de la base, el error tal cual y
//    el permiso (gastos:gastos_empresa).
//  - LAS LISTAS INTERNAS: el % ("−5 % sobre la lista más barata…") editable
//    con guardar_lista_interna, la tabla de precios_lista_interna, los
//    productos sin precio en gris y el permiso de la base.
//  - XSS de todo lo nuevo.
//
//   node pruebas/test-administracion-entre-empresas-v2.js

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
const TAREAS = [['gastos:gastos_empresa', null], ['retiros:ver', { unidades: ['u-n', 'u-d'] }], ['retiros:precios', { unidades: ['u-n', 'u-d'] }]]
function nuevo({ tareas = TAREAS, rol = 'usuario' } = {}) {
  const S = construirAdministracion(ARCHIVO)
  S.estado.miRolApp = rol
  S.estado.misTareas = new Map(tareas)
  S.estado.empresas = [
    { id: 'u-n', nombre: 'Cucuruchos Nuss', prefijo: 'N' },
    { id: 'u-d', nombre: 'Dolce Pasta', prefijo: 'D' },
    { id: 'u-m', nombre: 'Mengui', prefijo: 'M' },
    { id: PRUEBAS, nombre: 'Pruebas (robot)', prefijo: 'X' },
  ]
  S.estado.fabrica = { ok: true, unidades: new Set([PRUEBAS]), personas: new Set(), soyDePrueba: false }
  S.__doc.getElementById('ad-entre-desde').value = '2026-10-01'
  S.__doc.getElementById('ad-entre-hasta').value = '2026-10-31'
  return S
}
const html = (S, id) => S.__els.get(id)?.innerHTML ?? ''
const cuantas = (h, re) => (h.match(re) || []).length
const dormir = (ms = 20) => new Promise(r => setTimeout(r, ms))
// En la tarjeta del saldo el importe va pegado a su "$" (espacio duro).
const duro = (t) => t.replace(/(US\$|\$) /g, '$1\u00a0')

// La forma real de la RPC (con marca_id y con_precio, 30/10/2026).
const F = (o) => ({ fecha: '2026-10-15', tipo: 'otro', de_unidad_id: null, de_unidad: null, a_unidad_id: null, a_unidad: null, detalle: '', moneda: null,
  importe: null, cantidad: null, unidad_medida: null, presentacion_id: null, insumo_id: null, referencia_tipo: null, referencia_id: null,
  marca_id: null, con_precio: null, ...o })
const N = { id: 'u-n', nombre: 'Cucuruchos Nuss' }, D = { id: 'u-d', nombre: 'Dolce Pasta' }, M = { id: 'u-m', nombre: 'Mengui' }
const de = (u) => ({ de_unidad_id: u.id, de_unidad: u.nombre }), a = (u) => ({ a_unidad_id: u.id, a_unidad: u.nombre })

// El caso real del 30/10/2026 (datos de nuss-central): 4 gastos de Dolce
// pagados desde cuentas de Nuss y 3 cheques de Nuss endosados o usados por Dolce.
const REAL = [
  F({ tipo: 'pago', fecha: '2026-10-29', ...de(N), ...a(D), detalle: 'Combustible · Axion · pagado desde Efectivo Nuss', moneda: 'ARS', importe: '563000.07', referencia_tipo: 'gasto', referencia_id: 'g-1' }),
  F({ tipo: 'otro', fecha: '2026-10-15', ...de(D), ...a(N), detalle: 'Cheque 191-85815389 endosado a DIMAFLO S.A.', moneda: 'ARS', importe: '650181.18', referencia_tipo: 'movimiento_entre_unidades', referencia_id: 'mu-1' }),
  F({ tipo: 'otro', fecha: '2026-10-16', ...de(D), ...a(N), detalle: 'Cheque 285-78013718 endosado a CORRUGADORA CENTRO S.A.', moneda: 'ARS', importe: '9400228.77', referencia_tipo: 'movimiento_entre_unidades', referencia_id: 'mu-2' }),
  F({ tipo: 'otro', fecha: '2026-10-30', ...de(D), ...a(N), detalle: 'Cheque 191-62294736 usado para pagar a BADIC S.A.S.', moneda: 'ARS', importe: '2200000.00', referencia_tipo: 'movimiento_entre_unidades', referencia_id: 'mu-3' }),
]
// La mercadería de una orden interna sin valorizar (D-I-0002: Dolce → Nuss).
const MERC = [
  F({ tipo: 'mercaderia', fecha: '2026-10-30', ...de(D), ...a(N), detalle: 'Barquillo 40 x4 · Caja sin cono · lote L7 · orden D-I-0002', cantidad: '10', unidad_medida: 'cajas', presentacion_id: 'p1', referencia_tipo: 'orden_retiro', referencia_id: 'o-d2', con_precio: false }),
  F({ tipo: 'mercaderia', fecha: '2026-10-30', ...de(D), ...a(N), detalle: 'Barquillo 35 x4 · Caja con cono · lote L8 · orden D-I-0002', cantidad: '4', unidad_medida: 'cajas', presentacion_id: 'p2', referencia_tipo: 'orden_retiro', referencia_id: 'o-d2', con_precio: false }),
  // Un ingreso de otra empresa, sin orden.
  F({ tipo: 'mercaderia', fecha: '2026-10-23', ...de(N), ...a(D), detalle: 'Vaso 125 · Caja media altura · lote 33 · remito 0001-123', cantidad: '18', unidad_medida: 'cajas', presentacion_id: 'p3', referencia_tipo: 'ingreso_externo', referencia_id: 'ie-1', con_precio: false }),
  // Ya valorizada: su importe está en un 'otro'.
  F({ tipo: 'mercaderia', fecha: '2026-10-20', ...de(N), ...a(D), detalle: 'Cucuruchón Chico · Caja · lote 9 · orden N-I-0001', cantidad: '31', unidad_medida: 'cajas', presentacion_id: 'p4', referencia_tipo: 'orden_retiro', referencia_id: 'o-n1', con_precio: true }),
  // La misma empresa de los dos lados (un dato raro de la base): no es deuda.
  F({ tipo: 'mercaderia', fecha: '2026-10-27', ...de(D), ...a(D), detalle: 'Conos de papel sueltos · Por cono · lote 1', cantidad: '720', unidad_medida: 'cajas', referencia_tipo: 'ingreso_externo', referencia_id: 'ie-2', con_precio: false }),
]

// ── La convención de signos con el caso real ──────────────────────────────
{
  const S = nuevo()
  const solo = S.saldosEntre(S.normalizarEntre([REAL[0]]))
  chk('un pago de Nuss por un gasto de Dolce: "Dolce Pasta le debe a Nuss"', solo[0]?.monedas[0]?.texto === 'Dolce Pasta le debe a Nuss $ 563.000,07', solo[0]?.monedas[0]?.texto)
  const s = S.saldosEntre(S.normalizarEntre(REAL))
  chk('un solo par', s.length === 1 && s[0].clave === 'u-d|u-n', s.map(x => x.clave).join())
  chk('el caso real: "Nuss le debe a Dolce Pasta $ 11.687.409,88"', s[0].monedas[0].texto === 'Nuss le debe a Dolce Pasta $ 11.687.409,88', s[0].monedas[0].texto)
  chk('los dos lados chicos', s[0].monedas[0].lados === 'Dolce Pasta debe $ 563.000,07 · Nuss debe $ 12.250.409,95', s[0].monedas[0].lados)
  // x = Dolce Pasta, y = Nuss (por nombre): positivo = Nuss le debe a Dolce.
  chk('el neto en centavos (sin error de coma)', s[0].monedas[0].cent === 1225040995 - 56300007, s[0].monedas[0].cent)
  const h = S.htmlSaldoEntre(s[0], false)
  chk('la tarjeta: el neto grande, sin cortar el importe', h.includes(duro('Nuss le debe a Dolce Pasta $ 11.687.409,88')) && h.includes('ad-entre-saldo__neto'))
  chk('la tarjeta: los dos lados', h.includes(duro('Dolce Pasta debe $ 563.000,07 · Nuss debe $ 12.250.409,95')))
  chk('la tarjeta es un botón con el par', /<button type="button" class="ad-tarjeta ad-entre-saldo" data-entre-saldo="u-d\|u-n" aria-pressed="false">/.test(h), h.slice(0, 200))
  chk('con la etiqueta de color de cada empresa', cuantas(h, /ad-sello--empresa/g) === 2)
  chk('elegida: marcada', /ad-entre-saldo--activo" data-entre-saldo="u-d\|u-n" aria-pressed="true"/.test(S.htmlSaldoEntre(s[0], true)))
}

// ── Tres pares, pesos y dólares, lo que no tiene precio ───────────────────
{
  const S = nuevo()
  const filas = S.normalizarEntre([
    ...REAL,
    F({ tipo: 'cobro', ...de(N), ...a(M), detalle: 'Transferencia de Anatolia a Banco Mengui', moneda: 'ARS', importe: 1000, referencia_tipo: 'cobranza', referencia_id: 'k1' }),
    F({ tipo: 'traspaso_dinero', ...de(M), ...a(D), detalle: 'Traspaso de Caja Mengui a Banco DP', moneda: 'ARS', importe: 250.5, referencia_tipo: 'caja_movimiento', referencia_id: 'cm1' }),
    F({ tipo: 'pago', ...de(D), ...a(N), detalle: 'Repuesto en dólares', moneda: 'USD', importe: 200, referencia_tipo: 'gasto', referencia_id: 'g-u' }),
    ...MERC,
  ])
  const s = S.saldosEntre(filas)
  chk('una tarjeta por par con movimientos (3)', s.length === 3, s.map(x => x.clave).join())
  const nd = s.find(x => x.clave === 'u-d|u-n'), nm = s.find(x => x.clave === 'u-m|u-n'), dm = s.find(x => x.clave === 'u-d|u-m')
  chk('Nuss ↔ Mengui: Mengui le debe a Nuss', nm?.monedas[0]?.texto === 'Mengui le debe a Nuss $ 1.000,00', nm?.monedas[0]?.texto)
  chk('Dolce ↔ Mengui: Dolce Pasta le debe a Mengui', dm?.monedas[0]?.texto === 'Dolce Pasta le debe a Mengui $ 250,50', dm?.monedas[0]?.texto)
  chk('pesos y dólares nunca se suman: dos líneas', nd.monedas.length === 2 && nd.monedas[0].moneda === 'ARS' && nd.monedas[1].moneda === 'USD')
  chk('los pesos no cambian por los dólares', nd.monedas[0].texto === 'Nuss le debe a Dolce Pasta $ 11.687.409,88')
  chk('los dólares aparte', nd.monedas[1].texto === 'Nuss le debe a Dolce Pasta US$ 200,00' && nd.monedas[1].lados === 'Dolce Pasta debe US$ 0,00 · Nuss debe US$ 200,00', nd.monedas[1].lados)
  chk('la mercadería sin valorizar no entra al saldo, pero se cuenta', nd.sinValor === 3, nd.sinValor)
  chk('la ya valorizada no se cuenta como sin valor (su importe es otro renglón)', !s.some(x => x.sinValor > 3))
  chk('la misma empresa de los dos lados no arma un par', !s.some(x => x.x === x.y))
  chk('la tarjeta lo avisa', S.htmlSaldoEntre(nd, false).includes('3 movimientos de mercadería o insumos sin valor: no están en el saldo.'))
  chk('un par solo con mercadería sin precio lo dice', S.htmlSaldoEntre(S.saldosEntre(S.normalizarEntre([MERC[0]]))[0], false).includes('Sin plata cargada entre Dolce Pasta y Nuss'))
}

// ── El saldo: la carga desde siempre, la tarjeta filtra ───────────────────
{
  chk('desde siempre = 800 días (el tope de la base)', nuevo().desdeSaldosEntre('2026-10-30') === '2024-08-21', nuevo().desdeSaldosEntre('2026-10-30'))
  const S = nuevo()
  const ll = []
  S.__setRpc((n, p) => { ll.push([n, p]); return n === 'movimientos_entre_empresas' ? { data: [...REAL, ...MERC, F({ tipo: 'cobro', ...de(N), ...a(M), detalle: 'Cobro', moneda: 'ARS', importe: 1000, referencia_tipo: 'cobranza', referencia_id: 'k1' })], error: null } : { data: null, error: null } })
  S.__tablas.ordenes_retiro = [{ id: 'o-d2', codigo: 'D-I-0002', unidad_negocio_id: 'u-d' }, { id: 'o-n1', codigo: 'N-I-0001', unidad_negocio_id: 'u-n' }]
  esperas.push(Promise.all([S.cargarSaldosEntre(), S.cargarEntre()]).then(() => dormir()).then(() => {
    const pedidos = ll.filter(x => x[0] === 'movimientos_entre_empresas').map(x => x[1])
    const hoy = S.hoyArgentina()
    chk('el saldo pide desde hace 800 días hasta hoy', pedidos.some(p => p.p_hasta === hoy && p.p_desde === S.desdeSaldosEntre(hoy)), JSON.stringify(pedidos))
    chk('y la lista, el período', pedidos.some(p => p.p_desde === '2026-10-01' && p.p_hasta === '2026-10-31'))
    const sal = html(S, 'ad-entre-saldos')
    chk('arriba de todo, el título', sal.includes('Saldo entre empresas (desde siempre)'))
    chk('dos tarjetas', cuantas(sal, /data-entre-saldo="/g) === 2)
    chk('el neto del par Dolce–Nuss', sal.includes(duro('Nuss le debe a Dolce Pasta $ 11.687.409,88')))
    chk('ninguna elegida', !sal.includes('aria-pressed="true"'))
    const todas = cuantas(html(S, 'ad-entre-lista'), /data-entre="/g)
    chk('la lista con todo el período', todas === 10, todas)
    // Tocar la tarjeta de Nuss ↔ Mengui.
    S.elegirParEntre('u-m|u-n')
    chk('la tarjeta filtra la lista a ese par', cuantas(html(S, 'ad-entre-lista'), /data-entre="/g) === 1 && html(S, 'ad-entre-lista').includes('Cobro'))
    chk('la tarjeta queda marcada', /data-entre-saldo="u-m\|u-n" aria-pressed="true"/.test(html(S, 'ad-entre-saldos')))
    chk('el selector de par también', /<option value="u-m\|u-n" selected>Mengui ↔ Nuss<\/option>/.test(html(S, 'ad-entre-par')), html(S, 'ad-entre-par'))
    chk('lo dice', html(S, 'ad-entre-saldos').includes('Abajo, solo Mengui ↔ Nuss. Tocá la tarjeta de nuevo para ver todos.'))
    chk('la mercadería sin valorizar de otro par no se muestra', html(S, 'ad-entre-sin-valorizar') === '')
    S.elegirParEntre('u-m|u-n')
    chk('tocarla de nuevo: todos', cuantas(html(S, 'ad-entre-lista'), /data-entre="/g) === todas && S.estado.entre.filtros.par === '')
    // El par Dolce–Nuss, y el tipo.
    S.elegirParEntre('u-d|u-n')
    // Los 4 de plata y 4 de mercadería (la de Dolce con Dolce no es de ningún par).
    chk('par Dolce–Nuss: sus 8 movimientos', cuantas(html(S, 'ad-entre-lista'), /data-entre="/g) === 8)
    S.estado.entre.filtros.tipo = 'pago'
    S.pintarEntre()
    chk('par y tipo juntos', cuantas(html(S, 'ad-entre-lista'), /data-entre="/g) === 1)
    S.estado.entre.filtros.tipo = 'cheque'
    S.pintarEntre()
    chk('con filtros sin nada, con palabras', html(S, 'ad-entre-lista').includes('Con estos filtros no hay movimientos en el período.'))
  }))
}
{
  // El saldo: el error tal cual con Reintentar, el vacío, la respuesta vieja.
  const S = nuevo()
  S.__setRpc(() => ({ data: null, error: { message: 'No tenés permiso para ver los movimientos entre empresas.' } }))
  esperas.push(S.cargarSaldosEntre().then(() => {
    const h = html(S, 'ad-entre-saldos')
    chk('el error del saldo tal cual', h.includes('No tenés permiso para ver los movimientos entre empresas.'))
    chk('con Reintentar', h.includes('data-entre-saldos-reintentar'))
    chk('sin mercadería sin valorizar con error', html(S, 'ad-entre-sin-valorizar') === '')
  }))
  const S2 = nuevo()
  S2.__setRpc(() => ({ data: [], error: null }))
  esperas.push(S2.cargarSaldosEntre().then(() => chk('sin movimientos: con palabras', html(S2, 'ad-entre-saldos').includes('Ninguna empresa le debe nada a otra.'))))
  const S3 = nuevo()
  S3.estado.entre = S3.entreVacio()
  S3.pintarEntre()
  chk('mientras carga: "Calculando los saldos…"', html(S3, 'ad-entre-saldos').includes('Calculando los saldos…'))
  const S4 = nuevo()
  let soltar, n = 0
  S4.__setRpc(() => (++n === 1 ? new Promise(r => { soltar = () => r({ data: REAL, error: null }) }) : { data: [], error: null }))
  const primera = S4.cargarSaldosEntre()
  esperas.push(S4.cargarSaldosEntre().then(() => { soltar(); return primera }).then(() => {
    chk('la respuesta vieja del saldo no pisa la nueva', html(S4, 'ad-entre-saldos').includes('Ninguna empresa le debe nada a otra.'))
  }))
  // La fábrica de pruebas no entra al saldo.
  const S5 = nuevo()
  S5.__setRpc(() => ({ data: [F({ tipo: 'pago', ...de(N), a_unidad_id: PRUEBAS, a_unidad: 'Pruebas (robot)', moneda: 'ARS', importe: 9 }), REAL[0]], error: null }))
  esperas.push(S5.cargarSaldosEntre().then(() => chk('la fábrica de pruebas no arma una tarjeta', cuantas(html(S5, 'ad-entre-saldos'), /data-entre-saldo="/g) === 1 && !html(S5, 'ad-entre-saldos').includes(PRUEBAS))))
}

// ── La mercadería sin valorizar ───────────────────────────────────────────
{
  const S = nuevo()
  const filas = S.normalizarEntre([...REAL, ...MERC])
  const g = S.sinValorizarEntre(filas)
  chk('dos grupos: la orden y el ingreso (no la valorizada, no la de la misma empresa)', g.length === 2, g.map(x => x.clave).join())
  const o = g.find(x => x.referencia_tipo === 'orden_retiro')
  chk('la orden: sus dos renglones y 14 cajas', o?.renglones.length === 2 && o.cajas === 14)
  chk('el código sale del detalle', o.codigo === 'D-I-0002')
  chk('el más nuevo arriba', g[0].referencia_tipo === 'orden_retiro')
  chk('con un par, solo ese par', S.sinValorizarEntre(filas, 'u-m|u-n').length === 0 && S.sinValorizarEntre(filas, 'u-d|u-n').length === 2)
  chk('el producto sin el código de la orden', S.productoMercaderiaEntre(MERC[0]) === 'Barquillo 40 x4 · Caja sin cono · lote L7')
  chk('el código de la orden', S.codigoMercaderiaEntre(MERC[0]) === 'D-I-0002' && S.codigoMercaderiaEntre(MERC[2]) === null)
  // Antes de saber de qué empresa es la orden: el código, sin botón.
  let h = S.htmlGrupoSinValorizarEntre(o)
  chk('el título con la orden', h.includes('<strong>Orden D-I-0002</strong>'))
  chk('el producto y las cajas', h.includes('Barquillo 40 x4 · Caja sin cono · lote L7') && h.includes('10 cajas') && h.includes('4 cajas'))
  chk('el total sin precio', h.includes('Total: 14 cajas sin precio'))
  chk('quién le debe a quién: Nuss le debe a Dolce', /data-sello-empresa="u-n".*le debe a.*data-sello-empresa="u-d"/.test(h))
  chk('sin la orden leída, sin botón', !h.includes('data-entre-orden='))
  // Con la orden leída (su empresa) y retiros:precios ahí: "Valorizar la orden".
  o.orden = { id: 'o-d2', codigo: 'D-I-0002', unidad: 'u-d' }
  h = S.htmlGrupoSinValorizarEntre(o)
  chk('"Valorizar la orden" con el id', /<button type="button" class="ad-btn ad-btn--suave" data-entre-orden="o-d2">Valorizar la orden<\/button>/.test(h), h)
  const S2 = nuevo({ tareas: [['gastos:gastos_empresa', null], ['retiros:ver', { unidades: ['u-d'] }]] })
  chk('solo con retiros:ver: "Ver la orden"', S2.htmlGrupoSinValorizarEntre(o).includes('>Ver la orden</button>'))
  const S3 = nuevo({ tareas: [['gastos:gastos_empresa', null]] })
  const h3 = S3.htmlGrupoSinValorizarEntre(o)
  chk('sin permiso en esa empresa: sin botón y lo dice', !h3.includes('data-entre-orden=') && h3.includes('La valoriza quien tiene el permiso de precios de Órdenes de retiro en Dolce Pasta.'))
  const ie = S.htmlGrupoSinValorizarEntre(g.find(x => x.referencia_tipo === 'ingreso_externo'))
  chk('el ingreso sin orden: de dónde vino, sin botón', ie.includes('Ingreso de producto de otra empresa') && !ie.includes('data-entre-orden=') && ie.includes('18 cajas'))
}
{
  // En la pantalla: el bloque arriba de la lista, con el link a la orden.
  const S = nuevo()
  S.__setRpc((n) => n === 'movimientos_entre_empresas' ? { data: [...REAL, ...MERC], error: null } : { data: null, error: null })
  S.__tablas.ordenes_retiro = [{ id: 'o-d2', codigo: 'D-I-0002', unidad_negocio_id: 'u-d' }, { id: 'o-n1', codigo: 'N-I-0001', unidad_negocio_id: 'u-n' }]
  esperas.push(S.cargarSaldosEntre().then(() => {
    const h = html(S, 'ad-entre-sin-valorizar')
    chk('el bloque "Mercadería sin valorizar"', h.includes('Mercadería sin valorizar') && h.includes('Es deuda que todavía no tiene precio'))
    chk('la orden leída: "Valorizar la orden"', h.includes('data-entre-orden="o-d2">Valorizar la orden'))
    chk('dos grupos', cuantas(h, /data-entre-sv="/g) === 2)
    chk('el link busca la orden también en el saldo', S.abrirOrdenEntre('o-x') === undefined && S.estado.entre.saldos.filas.some(f => f.orden?.id === 'o-d2'))
    S.estado.miRolApp = 'super_admin'
    S.estado.empresaId = 'u-n'
    const r = S.abrirOrdenEntre('o-d2')
    chk('"Valorizar la orden" cambia a la empresa de la orden y la abre', S.estado.empresaId === 'u-d' && r !== undefined)
    return Promise.resolve(r).catch(() => {})
  }))
}

// ── La fila: el sello, quién le debe a quién, los links ───────────────────
{
  const S = nuevo()
  const [f] = S.normalizarEntre([REAL[0]])
  const h = S.htmlFilaEntre(f)
  chk('la fecha', h.includes('29/10/2026'))
  chk('el sello del tipo', h.includes('ad-entre-sello--pago') && h.includes('>Pago</span>'))
  chk('el detalle', h.includes('Combustible · Axion · pagado desde Efectivo Nuss'))
  chk('el importe', h.includes('$ 563.000,07'))
  chk('quién le debe a quién: Dolce Pasta le debe a Nuss', /data-sello-empresa="u-d".*le debe a.*data-sello-empresa="u-n"/.test(h), h)
  chk('el link al gasto (encodeURIComponent, con volver)', h.includes('href="gastos.html?gasto=g-1&amp;volver=' + encodeURIComponent(S.__win.location.href) + '"') && h.includes('Ver el gasto ›'), h)
  const nombres = {}
  for (const t of S.ORDEN_TIPOS_ENTRE) nombres[t] = S.nombreTipoEntre(t)
  chk('los sellos: Cheque, Pago, Cobro, Traspaso, Mercadería, Insumos, Otro', JSON.stringify(Object.values(nombres)) === JSON.stringify(['Cheque', 'Pago', 'Cobro', 'Traspaso', 'Mercadería', 'Insumos', 'Otro']))
  // La cobranza y el cheque: solo si esa sección se ve.
  const cob = F({ tipo: 'cobro', ...de(N), ...a(D), moneda: 'ARS', importe: 5, referencia_tipo: 'cobranza', referencia_id: 'k-1', _id: 'c' })
  const chq = F({ tipo: 'cheque', ...de(N), ...a(D), moneda: 'ARS', importe: 5, referencia_tipo: 'cheque', referencia_id: 'q-1', _id: 'q' })
  chk('sin cobranzas:procesar, la cobranza sin link', !S.htmlFilaEntre(cob).includes('data-entre-link'))
  chk('sin Cheques, el cheque sin link', !S.htmlFilaEntre(chq).includes('data-entre-link'))
  const S2 = nuevo({ tareas: [...TAREAS, ['cobranzas:procesar', null]] })
  chk('con cobranzas:procesar: "Ver la cobranza" en Administración', S2.htmlFilaEntre(cob).includes('href="administracion.html?seccion=cobranzas&amp;cobranza=k-1">Ver la cobranza ›'))
  chk('y el cheque en la cartera', S2.htmlFilaEntre(chq).includes('href="administracion.html?seccion=cheques&amp;cheque=q-1">Ver el cheque ›'))
  chk('un traspaso de plata no tiene link', !S2.htmlFilaEntre(F({ tipo: 'traspaso_dinero', ...de(N), ...a(D), moneda: 'ARS', importe: 1, referencia_tipo: 'caja_movimiento', referencia_id: 'm', _id: 't' })).includes('data-entre-link'))
  // La mercadería de una orden: el código (y el link cuando se leyó la orden).
  const [m] = S.normalizarEntre([MERC[0]])
  chk('la mercadería de una orden dice la orden', /Orden de retiro <strong>D-I-0002<\/strong>/.test(S.htmlFilaEntre(m)))
  m.orden = { id: 'o-d2', codigo: 'D-I-0002', unidad: 'u-d' }
  chk('leída la orden: el link', S.htmlFilaEntre(m).includes('data-entre-orden="o-d2">D-I-0002</button>'))
  chk('y dice que no tiene precio', S.htmlFilaEntre(m).includes('Sin valorizar: todavía no tiene precio y no está en el saldo.') && S.htmlFilaEntre(m).includes('14 cajas') === false && S.htmlFilaEntre(m).includes('10 cajas'))
  const [ya] = S.normalizarEntre([MERC[3]])
  chk('la ya valorizada lo dice', S.htmlFilaEntre(ya).includes('Ya valorizada'))
  const [misma] = S.normalizarEntre([MERC[4]])
  chk('la misma empresa de los dos lados: no es deuda', S.htmlFilaEntre(misma).includes('sin otra empresa: no es deuda entre empresas'))
  chk('los insumos sin importe lo dicen', S.htmlFilaEntre(F({ tipo: 'insumos', ...de(N), ...a(D), cantidad: 5, unidad_medida: 'kg', _id: 'i' })).includes('Sin importe'))
}

// ── Cargar ajuste o compensación ──────────────────────────────────────────
function abrirAjuste(S) {
  S.estado.entre = S.entreVacio()
  S.abrirAjusteEntre()
  const v = (id, x) => { S.__doc.getElementById(id).value = x }
  // El documento falso no lee el value del HTML: la fecha de hoy se pone a mano.
  v('ad-entre-ajuste-fecha', S.hoyArgentina())
  return v
}
{
  const S = nuevo({ tareas: [['retiros:precios', { todas: true }]] })
  S.pintarAjusteEntre()
  chk('sin gastos:gastos_empresa: sin el botón', html(S, 'ad-entre-ajuste') === '')
  S.abrirAjusteEntre()
  chk('y no se abre', html(S, 'ad-entre-ajuste') === '')
  const S2 = nuevo()
  S2.estado.entre = S2.entreVacio()
  S2.pintarAjusteEntre()
  chk('con gastos:gastos_empresa: "Cargar ajuste o compensación"', html(S2, 'ad-entre-ajuste').includes('data-entre-ajuste-abrir>Cargar ajuste o compensación</button>'))
  chk('un super_admin también', (() => { const S3 = nuevo({ tareas: [], rol: 'super_admin' }); S3.pintarAjusteEntre(); return html(S3, 'ad-entre-ajuste').includes('data-entre-ajuste-abrir') })())
  abrirAjuste(S2)
  const h = html(S2, 'ad-entre-ajuste')
  chk('el formulario: quién le debe a quién', h.includes('Empresa que debe') && h.includes('le debe a') && h.includes('Empresa a la que le debe'))
  chk('importe, fecha (hoy) y concepto', h.includes('id="ad-entre-ajuste-importe"') && h.includes(`value="${S2.hoyArgentina()}"`) && h.includes('id="ad-entre-ajuste-concepto"'))
  chk('la ayuda', h.includes('La plata que se pasa de una empresa a otra se carga como traspaso entre cuentas en Caja; esto es para ajustes y compensaciones.'))
  chk('las empresas, sin la fábrica de pruebas', h.includes('value="u-m"') && !h.includes(PRUEBAS))
  S2.cerrarAjusteEntre()
  chk('Cancelar lo cierra', html(S2, 'ad-entre-ajuste').includes('data-entre-ajuste-abrir'))
}
{
  // Lo que valida la pantalla, con las palabras de la base (sin llamar).
  const S = nuevo()
  const v = abrirAjuste(S)
  const err = () => S.__els.get('ad-entre-ajuste-error').textContent
  const llamo = () => S.__llamadas.rpc.some(x => x[0] === 'registrar_movimiento_entre_empresas')
  v('ad-entre-ajuste-deudora', 'u-n'); v('ad-entre-ajuste-acreedora', 'u-n'); v('ad-entre-ajuste-importe', '1.000'); v('ad-entre-ajuste-concepto', 'Compensación')
  esperas.push(S.guardarAjusteEntre().then(() => {
    chk('la misma empresa: "Elegí las dos empresas (distintas)."', err() === 'Elegí las dos empresas (distintas).' && !llamo())
    v('ad-entre-ajuste-acreedora', 'u-d'); v('ad-entre-ajuste-importe', '0')
    return S.guardarAjusteEntre()
  }).then(() => {
    chk('importe cero: "Poné el importe."', err() === 'Poné el importe.' && !llamo())
    v('ad-entre-ajuste-importe', '1.500,50'); v('ad-entre-ajuste-concepto', ' ab ')
    return S.guardarAjusteEntre()
  }).then(() => {
    chk('concepto corto: "Poné el concepto."', err() === 'Poné el concepto.' && !llamo())
  }))
  chk('validar: sin fecha', S.validarAjusteEntre({ deudora: 'u-n', acreedora: 'u-d', importe: 1, fecha: '', concepto: 'abc' }) === 'Poné la fecha.')
  chk('validar: todo bien', S.validarAjusteEntre({ deudora: 'u-n', acreedora: 'u-d', importe: 1, fecha: '2026-10-30', concepto: 'abc' }) === null)
}
{
  // Guardar: los parámetros, y después el saldo y la lista otra vez.
  const S = nuevo()
  const ll = []
  S.__setRpc((n, p) => { ll.push([n, p]); return n === 'registrar_movimiento_entre_empresas' ? { data: 'mu-nuevo', error: null } : { data: [], error: null } })
  const v = abrirAjuste(S)
  v('ad-entre-ajuste-deudora', 'u-n'); v('ad-entre-ajuste-acreedora', 'u-d'); v('ad-entre-ajuste-importe', '1.500,50')
  v('ad-entre-ajuste-fecha', '2026-10-28'); v('ad-entre-ajuste-concepto', '  Compensación nota de crédito 12 ')
  esperas.push(S.guardarAjusteEntre().then(() => dormir()).then(() => {
    const r = ll.find(x => x[0] === 'registrar_movimiento_entre_empresas')
    chk('registrar_movimiento_entre_empresas con acreedora, deudora, importe, fecha y concepto',
      JSON.stringify(r?.[1]) === JSON.stringify({ p_acreedora: 'u-d', p_deudora: 'u-n', p_importe: 1500.5, p_fecha: '2026-10-28', p_concepto: 'Compensación nota de crédito 12' }), JSON.stringify(r?.[1]))
    chk('una sola vez', ll.filter(x => x[0] === 'registrar_movimiento_entre_empresas').length === 1)
    chk('el aviso de listo', html(S, 'ad-entre-ajuste').includes('Listo: se cargó que Nuss le debe a Dolce Pasta $ 1.500,50 (Compensación nota de crédito 12).'))
    chk('el formulario se cierra', html(S, 'ad-entre-ajuste').includes('data-entre-ajuste-abrir') && !html(S, 'ad-entre-ajuste').includes('ad-entre-ajuste-importe'))
    const despues = ll.slice(ll.findIndex(x => x[0] === 'registrar_movimiento_entre_empresas')).filter(x => x[0] === 'movimientos_entre_empresas')
    chk('después se vuelven a leer el saldo y la lista', despues.length === 2, despues.length)
  }))
}
{
  // El error de la base tal cual, sin borrar lo escrito ni cerrar.
  const S = nuevo()
  S.__setRpc((n) => n === 'registrar_movimiento_entre_empresas' ? { data: null, error: { message: 'No tenés permiso para cargar movimientos entre empresas.' } } : { data: [], error: null })
  const v = abrirAjuste(S)
  v('ad-entre-ajuste-deudora', 'u-n'); v('ad-entre-ajuste-acreedora', 'u-d'); v('ad-entre-ajuste-importe', '10'); v('ad-entre-ajuste-concepto', 'Ajuste')
  const antes = html(S, 'ad-entre-ajuste')
  esperas.push(S.guardarAjusteEntre().then(() => {
    chk('el error de la base, tal cual', S.__els.get('ad-entre-ajuste-error').textContent === 'No tenés permiso para cargar movimientos entre empresas.')
    chk('el formulario sigue abierto (no se repinta)', html(S, 'ad-entre-ajuste') === antes && S.estado.entre.ajuste.abierto === true)
    chk('el botón vuelve a "Guardar"', S.__els.get('ad-entre-ajuste-guardar').textContent === 'Guardar' && S.__els.get('ad-entre-ajuste-guardar').disabled === false)
    chk('no se recargó nada', !S.__llamadas.rpc.some(x => x[0] === 'movimientos_entre_empresas'))
  }))
}

// ── Las listas internas ───────────────────────────────────────────────────
const LISTAS = [
  { id: 'l-nd', nombre: 'Nuss → Dolce Pasta (interna)', unidad_negocio_id: 'u-n', recargo_pct: '-5.000', moneda: 'ARS' },
  { id: 'l-dn', nombre: 'Dolce Pasta → Nuss (interna)', unidad_negocio_id: 'u-d', recargo_pct: '0.000', moneda: 'ARS' },
  { id: 'l-x', nombre: 'Prueba (interna)', unidad_negocio_id: PRUEBAS, recargo_pct: 0, moneda: 'ARS' },
]
const PRECIOS = {
  'l-nd': { lista_id: 'l-nd', nombre: 'Nuss → Dolce Pasta (interna)', pct: -5, items: [
    { presentacion_id: 'p1', producto: 'Cucurucho grande', presentacion: 'Caja x 100', unidades_por_caja: 100, precio_interno: '9500.00', precio_propio: null, mas_barata: { lista: 'Mayoristas', precio_caja: 10000 } },
    { presentacion_id: 'p2', producto: 'Capelina', presentacion: 'Caja', unidades_por_caja: 50, precio_interno: '7000.00', precio_propio: 7000, mas_barata: { lista: 'Distribuidores', precio_caja: 8000 } },
    { presentacion_id: 'p3', producto: 'Vaso 125', presentacion: 'Caja media altura', unidades_por_caja: 200, precio_interno: null, precio_propio: null, mas_barata: null },
  ] },
  'l-dn': { lista_id: 'l-dn', nombre: 'Dolce Pasta → Nuss (interna)', pct: 0, items: [] },
}
function rpcInternas(ll, { guardar = (p) => ({ data: { lista_id: p.p_lista_id, pct: p.p_pct }, error: null }) } = {}) {
  return (n, p) => {
    ll.push([n, p])
    if (n === 'precios_lista_interna') return { data: PRECIOS[p.p_lista_id], error: null }
    if (n === 'guardar_lista_interna') return guardar(p)
    return { data: null, error: null }
  }
}
{
  const S = nuevo()
  const ll = []
  S.__setRpc(rpcInternas(ll))
  S.__tablas.listas_precios = LISTAS
  esperas.push(S.cargarInternasEntre().then(() => {
    const c = S.__llamadas.consultas.find(x => x[0] === 'listas_precios')
    chk('lee las listas internas activas', !!c && c[1].some(f => f[0] === 'eq' && f[1] === 'es_interna' && f[2] === true) && c[1].some(f => f[0] === 'eq' && f[1] === 'activa' && f[2] === true))
    chk('precios_lista_interna por lista (sin la de pruebas)', JSON.stringify(ll.filter(x => x[0] === 'precios_lista_interna').map(x => x[1])) === JSON.stringify([{ p_lista_id: 'l-nd' }, { p_lista_id: 'l-dn' }]))
    const h = html(S, 'ad-entre-internas')
    chk('el título y la ayuda', h.includes('Listas internas') && h.includes('Si un producto tiene precio propio en la lista interna, manda ese; si no, el más barato de las listas de venta de esa empresa, con el %.'))
    chk('una tarjeta por lista interna', cuantas(h, /data-entre-interna="/g) === 2 && !h.includes('Prueba (interna)'))
    chk('el nombre', h.includes('Nuss → Dolce Pasta (interna)'))
    chk('el %: "−5 % sobre la lista más barata de cada producto"', h.includes('−5 % sobre la lista más barata de cada producto'))
    chk('el 0 %', h.includes('0 % sobre la lista más barata de cada producto'))
    chk('el campo con el % de la lista', /id="ad-entre-interna-pct-l-nd" data-entre-interna-pct="l-nd"[^>]*value="-5"/.test(h), (h.match(/<input[^>]*l-nd[^>]*>/) || [''])[0])
    chk('el precio interno', h.includes('$ 9.500,00'))
    chk('la lista más barata, nombre y precio', h.includes('Más barata: Mayoristas $ 10.000,00'))
    chk('el precio propio si lo tiene', h.includes('Precio propio: $ 7.000,00'))
    chk('sin precio: en gris y con palabras', /ad-entre-interna__item ad-entre-interna__item--sin" data-entre-interna-item="p3"/.test(h) && h.includes('<span class="ad-entre-interna__precio">sin precio en ninguna lista</span>'))
    chk('cuántos sin precio', h.includes('1 producto sin precio en ninguna lista.'))
    chk('una lista sin productos lo dice', h.includes('Esta empresa no tiene productos activos para la lista.'))
  }))
}
{
  // Guardar el %: guardar_lista_interna y la tabla otra vez.
  const S = nuevo()
  const ll = []
  S.__setRpc(rpcInternas(ll))
  S.__tablas.listas_precios = LISTAS
  esperas.push(S.cargarInternasEntre().then(() => {
    S.__doc.getElementById('ad-entre-interna-pct-l-nd').value = '-7,5'
    return S.guardarInternaEntre('l-nd')
  }).then(() => dormir()).then(() => {
    const g = ll.find(x => x[0] === 'guardar_lista_interna')
    chk('guardar_lista_interna con la lista y el % (−7,5)', JSON.stringify(g?.[1]) === JSON.stringify({ p_lista_id: 'l-nd', p_pct: -7.5 }), JSON.stringify(g?.[1]))
    const h = html(S, 'ad-entre-internas')
    chk('el aviso de guardado', h.includes('Guardado: −7,5 % sobre la lista más barata de cada producto.'))
    chk('después, los precios otra vez', ll.filter(x => x[0] === 'precios_lista_interna' && x[1].p_lista_id === 'l-nd').length === 2)
  }))
  const S2 = nuevo()
  const ll2 = []
  S2.__setRpc(rpcInternas(ll2, { guardar: () => ({ data: null, error: { message: 'El porcentaje va de −50 a 50 (ej. −5 = 5 % menos que la lista más barata).' } }) }))
  S2.__tablas.listas_precios = LISTAS
  esperas.push(S2.cargarInternasEntre().then(() => {
    S2.__doc.getElementById('ad-entre-interna-pct-l-nd').value = ''
    return S2.guardarInternaEntre('l-nd')
  }).then(() => {
    chk('sin %: lo dice y no llama', html(S2, 'ad-entre-internas').includes('Poné el porcentaje') && !ll2.some(x => x[0] === 'guardar_lista_interna'))
    S2.__doc.getElementById('ad-entre-interna-pct-l-nd').value = '-60'
    return S2.guardarInternaEntre('l-nd')
  }).then(() => {
    chk('el error de la base tal cual', html(S2, 'ad-entre-internas').includes('El porcentaje va de −50 a 50 (ej. −5 = 5 % menos que la lista más barata).'))
    chk('lo escrito queda en el campo', /data-entre-interna-pct="l-nd"[^>]*value="-60"/.test(html(S2, 'ad-entre-internas')))
    chk('con error no se releen los precios', ll2.filter(x => x[0] === 'precios_lista_interna' && x[1].p_lista_id === 'l-nd').length === 1)
  }))
}
{
  // El permiso de la base: gastos:gastos_empresa o retiros:precios en la empresa de la lista.
  const S = nuevo({ tareas: [['retiros:precios', { unidades: ['u-n'] }]] })
  chk('con retiros:precios en Nuss: cambia la de Nuss', S.puedeCambiarInternaEntre(LISTAS[0]))
  chk('… y no la de Dolce', !S.puedeCambiarInternaEntre(LISTAS[1]))
  chk('con gastos:gastos_empresa: las dos', nuevo({ tareas: [['gastos:gastos_empresa', null]] }).puedeCambiarInternaEntre(LISTAS[1]))
  const S2 = nuevo({ tareas: [['retiros:ver', { todas: true }]] })
  const i = S2.internasVacioEntre()
  i.listas = [LISTAS[1]]
  i.precios.set('l-dn', { data: PRECIOS['l-dn'] })
  chk('sin permiso: sin el campo ni Guardar', !S2.htmlInternaEntre(LISTAS[1], i).includes('data-entre-interna-guardar'))
  esperas.push((async () => { await S2.guardarInternaEntre('l-dn'); chk('y guardar no llama', !S2.__llamadas.rpc.some(x => x[0] === 'guardar_lista_interna')) })())
  // Estados.
  const S3 = nuevo()
  S3.__tablas.listas_precios = () => ({ data: null, error: { message: 'permission denied for table listas_precios' } })
  esperas.push(S3.cargarInternasEntre().then(() => chk('el error de las listas tal cual, con Reintentar', html(S3, 'ad-entre-internas').includes('permission denied for table listas_precios') && html(S3, 'ad-entre-internas').includes('data-entre-internas-reintentar'))))
  const S4 = nuevo()
  S4.__tablas.listas_precios = []
  esperas.push(S4.cargarInternasEntre().then(() => chk('sin listas que ver, lo dice', html(S4, 'ad-entre-internas').includes('No hay listas internas que puedas ver'))))
  const S5 = nuevo()
  S5.__tablas.listas_precios = [LISTAS[0]]
  S5.__setRpc(() => ({ data: null, error: { message: 'No tenés permiso para ver las listas internas.' } }))
  esperas.push(S5.cargarInternasEntre().then(() => chk('el error de los precios tal cual, con Reintentar', html(S5, 'ad-entre-internas').includes('No tenés permiso para ver las listas internas.') && html(S5, 'ad-entre-internas').includes('data-entre-interna-reintentar="l-nd"'))))
  chk('el texto del %', S.textoPctInternaEntre(-5) === '−5 % sobre la lista más barata de cada producto' && S.textoPctInternaEntre('2.5') === '+2,5 % sobre la lista más barata de cada producto')
  chk('el campo del %', S.campoPctEntre('-5.000') === '-5' && S.campoPctEntre(null) === '')
}

// ── mostrarEntre arma todo ─────────────────────────────────────────────────
{
  const S = nuevo()
  S.__setRpc(rpcInternas([]))
  S.__tablas.listas_precios = LISTAS
  S.mostrarEntre()
  esperas.push(dormir(30).then(() => {
    chk('mostrarEntre: dos lecturas de movimientos (período y saldo)', S.__llamadas.rpc.filter(x => x[0] === 'movimientos_entre_empresas').length === 2)
    chk('mostrarEntre: el botón del ajuste', html(S, 'ad-entre-ajuste').includes('data-entre-ajuste-abrir'))
    chk('mostrarEntre: las listas internas', S.__llamadas.rpc.some(x => x[0] === 'precios_lista_interna'))
  }))
}

// ── XSS ───────────────────────────────────────────────────────────────────
{
  const S = nuevo()
  const raro = (o) => F({ de_unidad_id: 'u-z1', de_unidad: marca('de-unidad'), a_unidad_id: 'u-z2', a_unidad: marca('a-unidad'), ...o })
  const s = S.saldosEntre([raro({ tipo: 'pago', moneda: 'ARS', importe: 5 })])
  chequearMarcas(chk, 'tarjeta del saldo', S.htmlSaldoEntre(s[0], true), ['de-unidad', 'a-unidad'])
  const e = S.entreVacio()
  e.saldos.error = marca('error-saldo')
  chequearMarcas(chk, 'error del saldo', S.htmlSaldosEntre(e), ['error-saldo'])
  const g = S.sinValorizarEntre([raro({ tipo: 'mercaderia', con_precio: false, cantidad: 2, unidad_medida: 'cajas', detalle: marca('producto') + ' · orden N-I-0009', referencia_tipo: 'orden_retiro', referencia_id: 'o', _id: 'm' })])
  g[0].orden = { id: marca('id-orden'), codigo: marca('codigo'), unidad: 'u-n' }
  g[0].codigo = marca('codigo')
  chequearMarcas(chk, 'mercadería sin valorizar', S.htmlGrupoSinValorizarEntre(g[0]), ['de-unidad', 'a-unidad', 'producto', 'id-orden', 'codigo'])
  const S2 = nuevo({ tareas: [...TAREAS, ['cobranzas:procesar', null]] })
  const fl = S2.htmlFilaEntre(raro({ tipo: 'cobro', moneda: 'ARS', importe: 1, detalle: marca('detalle'), referencia_tipo: 'cobranza', referencia_id: '"><b data-xss=1>', _id: 'x' }))
  chequearMarcas(chk, 'fila con link', fl, ['de-unidad', 'a-unidad', 'detalle'])
  chk('fila con link: el id va con encodeURIComponent', fl.includes('cobranza=%22%3E%3Cb%20data-xss%3D1%3E"'))
  const i = S.internasVacioEntre()
  const l = { id: 'l1', nombre: marca('lista'), unidad_negocio_id: 'u-n', recargo_pct: 0 }
  i.listas = [l]
  i.precios.set('l1', { data: { nombre: marca('nombre-rpc'), items: [{ presentacion_id: marca('pres-id'), producto: marca('prod'), presentacion: marca('pres'), precio_interno: 1, precio_propio: 2, mas_barata: { lista: marca('barata'), precio_caja: 3 } }] } })
  i.errores.set('l1', marca('error-guardar'))
  i.pct.set('l1', marca('pct'))
  chequearMarcas(chk, 'lista interna', S.htmlInternaEntre(l, i), ['nombre-rpc', 'pres-id', 'prod', 'pres', 'barata', 'error-guardar', 'pct'])
  const i2 = S.internasVacioEntre()
  i2.error = marca('error-listas')
  chequearMarcas(chk, 'error de las listas internas', S.htmlInternasEntre(i2), ['error-listas'])
  const i3 = S.internasVacioEntre()
  i3.precios.set('l1', { error: marca('error-precios') })
  chequearMarcas(chk, 'error de los precios', S.htmlInternaEntre({ ...l, nombre: 'L' }, i3), ['error-precios'])
  S.estado.empresas = [{ id: 'u-n', nombre: marca('empresa'), prefijo: 'N' }]
  chequearMarcas(chk, 'el formulario del ajuste', S.htmlAjusteEntre({ abierto: true }), [])
  chequearMarcas(chk, 'el aviso del ajuste', S.htmlAjusteEntre({ abierto: false, hecho: marca('hecho') }), ['hecho'])
  estaticoAcotado(chk, ARCHIVO, src, ['htmlSaldoEntre', 'htmlSaldosEntre', 'htmlQuienEntre', 'htmlGrupoSinValorizarEntre', 'htmlSinValorizarEntre',
    'htmlLinkEntre', 'htmlFilaEntre', 'htmlAjusteEntre', 'htmlItemInternaEntre', 'htmlInternaEntre', 'htmlInternasEntre'],
  { escape: 'esc', seguras: SEGURAS_ADMINISTRACION, segurasRegex: SEGURAS_REGEX_ADMINISTRACION })
}

fin(esperas)
