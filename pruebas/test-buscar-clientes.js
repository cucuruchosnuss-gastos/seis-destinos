// EL BUSCADOR DE CLIENTES (29/09/2026) — el mismo contrato en las tres
// pantallas que eligen un cliente: Administración → Cobranzas por asentar,
// la carga de Órdenes de retiro y la carga de Pedidos.
//
// Pedido de Facu: "al asentar no aparecía el cliente (el chofer escribe
// 'JyM')". buscar_clientes(p_busqueda, p_unidad_negocio_id) busca en la base
// por nombre, razón social, CUIT, apodo o parecido, desde 2 letras. Un mismo
// cliente existe en Nuss y en Dolce Pasta con cuentas separadas: cada
// resultado muestra SIEMPRE su empresa. Lo que se prueba acá, en los tres
// archivos (el código está duplicado a propósito, como el resto de los
// helpers de cada módulo, y esta suite es la que impide que diverja):
// - desde 2 letras, con una espera corta antes de consultar (debounce), y una
//   respuesta vieja no pisa la nueva (turno);
// - Administración busca en TODAS las empresas, con el saldo; Retiros y
//   Pedidos con la empresa de la orden / la unidad del pedido, SIN saldo;
// - si la base devuelve null (sin permiso): Administración lo dice y busca en
//   la lista local; Retiros y Pedidos quedan en la búsqueda local, sin error
//   a la vista, y no vuelven a preguntar;
// - la clave de _clave_nombre() ("JyM" → "jm") también en la búsqueda local;
// - los tres primeros sugeridos como botones y el resto como lista inicial;
// - la fábrica de pruebas nunca pregunta a la base (la función no la trae);
// - HTML malicioso en cada render nuevo.
//
//   node pruebas/test-buscar-clientes.js
process.env.TZ = 'UTC'
const path = require('path')
const fs = require('fs')
const { construirAdministracion } = require('./sandbox-administracion')
const { construirRetiros } = require('./sandbox-retiros')
const { construirPedidos } = require('./sandbox-pedidos')
const { arnes, marca, chequearMarcas } = require('./circuito-comun')
const { servidorBuscarClientes, clave } = require('./buscar-clientes-comun')
const DATOS = require('./datos-maqueta/administracion')

const ADMIN = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/administracion.html')
const RETIROS = process.env.ARCHIVO_RETIROS || path.join(__dirname, '..', 'modulos/retiros.html')
const PEDIDOS = process.env.ARCHIVO_PEDIDOS || path.join(__dirname, '..', 'modulos/pedidos.html')
for (const f of [ADMIN, RETIROS, PEDIDOS]) console.log(`ARCHIVO ${f} (${fs.readFileSync(f, 'utf8').length} bytes)`)
const { chk, esperas, fin } = arnes()
const esperar = async () => { for (let i = 0; i < 20; i++) await new Promise(r => setImmediate(r)) }

// Los setTimeout de la pantalla quedan anotados: la suite decide cuándo corren.
const PRELUDIO_TIMERS = `
  var __tm = globalThis.__timersBuscar = []
  setTimeout = function (f, ms) { __tm.push({ f, ms, cancelado: false }); return __tm.length }
  clearTimeout = function (id) { if (id && __tm[id - 1]) __tm[id - 1].cancelado = true }
`
const timers = () => globalThis.__timersBuscar
const vivos = () => timers().filter(t => !t.cancelado)
async function correrTimers() { for (const t of vivos()) { t.cancelado = true; await t.f() } await esperar() }
// Una promesa que se resuelve a mano.
function diferida() { let resolver; const p = new Promise(r => { resolver = r }); return { p, resolver } }
const rpcs = (S, n = 'buscar_clientes') => S.__llamadas.rpc.filter(r => r[0] === n)

// ═══ 0. LA CLAVE DE _clave_nombre(), IGUAL EN LOS TRES ════════════════════════
{
  const A = construirAdministracion(ADMIN), R = construirRetiros(RETIROS), P = construirPedidos(PEDIDOS)
  const casos = ['JyM', 'J&M DISTRIBUCIONES Y SERVICI', 'jym', 'J y M', 'Ángel Ñandú S.A.', 'AyB', 'Juan y María', '', null]
  chk('"JyM" da "jm"', A.claveBusquedaCliente('JyM') === 'jm')
  chk('"J&M DISTRIBUCIONES..." empieza con "jm"', A.claveBusquedaCliente('J&M DISTRIBUCIONES Y SERVICI').startsWith('jm'))
  chk('la "y" solo se saca entre dos letras sueltas ("Juan y María" no)', A.claveBusquedaCliente('Juan y María') === 'juanymaria')
  for (const c of casos) {
    const a = A.claveBusquedaCliente(c), r = R.claveBusquedaCliente(c), p = P.claveBusquedaCliente(c)
    chk(`la clave de «${c}» es la misma en los tres archivos (${a})`, a === r && r === p, `${a} / ${r} / ${p}`)
    chk(`la clave de «${c}» es la de la réplica de la base`, a === clave(c ?? ''), `${a} / ${clave(c ?? '')}`)
  }
  chk('las tres pantallas esperan lo mismo antes de consultar', A.ESPERA_BUSCAR_MS === R.ESPERA_BUSCAR_MS && R.ESPERA_BUSCAR_MS === P.ESPERA_BUSCAR_MS)
  chk('la espera es corta (entre 150 y 500 ms)', A.ESPERA_BUSCAR_MS >= 150 && A.ESPERA_BUSCAR_MS <= 500)
  chk('las tres buscan desde 2 letras', A.MIN_LETRAS_BUSCAR === 2 && R.MIN_LETRAS_BUSCAR === 2 && P.MIN_LETRAS_BUSCAR === 2)
}

// ═══ 1. ADMINISTRACIÓN — COBRANZAS POR ASENTAR ═════════════════════════════════
const PRUEBA = 'u-robot'
const CLIENTES_AD = [...DATOS.tablas.clientes, { id: 'c-robot', nombre: 'JyM Robot', razon_social: null, apodos: [], unidad_negocio_id: PRUEBA, activo: true }]
const EMPRESAS_AD = { 'u-n': 'Cucuruchos Nuss', 'u-d': 'Dolce Pasta' }
const SERVIDOR_AD = servidorBuscarClientes({ clientes: CLIENTES_AD, empresas: EMPRESAS_AD, pruebas: new Set([PRUEBA]), saldos: { 'c-jm-n': 185000, 'c-jm-d': -12500 } })
const POR_ASENTAR = DATOS.rpc.cobranzas_por_asentar
const COB_CASERATO = POR_ASENTAR[0].cobranza_id
const COB_JYM = POR_ASENTAR.find(c => c.cliente_escrito === 'JyM').cobranza_id

function tabla(filas) {
  return (fl) => {
    let r = filas
    for (const f of fl) if (f[0] === 'eq') r = r.filter(x => x[f[1]] === f[2])
    return { data: r, error: null }
  }
}
function admin({ buscar = async (p) => ({ data: SERVIDOR_AD(p), error: null }), soyDePrueba = false } = {}) {
  const S = construirAdministracion(ADMIN, { preludioExtra: PRELUDIO_TIMERS })
  S.estado.misTareas = new Map([['cobranzas:procesar', null], ['cobranzas:ver_todo', null], ['retiros:ver', { todas: true }]])
  S.estado.empresas = [...DATOS.tablas.unidades_negocio, { id: PRUEBA, nombre: 'Pruebas (robot)', es_prueba: true }]
  S.estado.fabrica = { ok: true, unidades: new Set([PRUEBA]), personas: new Set(), soyDePrueba }
  S.__tablas.clientes = tabla(CLIENTES_AD)
  S.__tablas.cobranza_cheques = []
  S.__tablas.cobranza_fotos = []
  S.__tablas.bancos_bcra = []
  S.__setRpc(async (n, p) => {
    if (n === 'cobranzas_por_asentar') return { data: POR_ASENTAR, error: null }
    if (n === 'buscar_clientes') return buscar(p)
    if (n === 'asentar_cobranza') return { data: { importe: 80000, saldo_cliente: 1000 }, error: null }
    return { data: null, error: null }
  })
  return S
}
const htmlAd = (S) => S.__els.get('ad-cobranzas-lista')?.innerHTML ?? ''
const resAd = (S) => S.__els.get('ad-asentar-resultados')?.innerHTML ?? ''

async function bloque1() {
  // Los TRES primeros sugeridos como botones, en su orden; el resto de lista inicial.
  {
    const S = admin()
    await S.mostrarCobranzas(); await esperar()
    await S.abrirAsentar(COB_JYM); await esperar()
    const h = htmlAd(S)
    const botones = [...h.matchAll(/class="ad-opcion-cliente ad-opcion-cliente--sugerido" data-asentar-cliente="([^"]+)"/g)].map(m => m[1])
    chk('los tres primeros sugeridos van como botones, en el orden que vienen', JSON.stringify(botones) === JSON.stringify(['c-jm-n', 'c-jm-d', 'c-jmv']), JSON.stringify(botones))
    chk('J&M aparece dos veces, una por empresa, y cada botón dice su empresa',
      /data-asentar-cliente="c-jm-n"[\s\S]*?J&amp;M DISTRIBUCIONES Y SERVICI[\s\S]*?Cucuruchos Nuss/.test(h) &&
      /data-asentar-cliente="c-jm-d"[\s\S]*?J&amp;M DISTRIBUCIONES Y SERVICI[\s\S]*?Dolce Pasta/.test(h))
    const res = resAd(S) || h
    chk('el cuarto sugerido va en el buscador, antes de escribir, y no destacado',
      /Otro parecido a lo que escribió el chofer:/.test(res) && /class="ad-opcion-cliente" data-asentar-cliente="c-juanma"[\s\S]*?Juan Manuel Kiosco[\s\S]*?Dolce Pasta/.test(res))
    chk('abrir el panel no consulta la base (los sugeridos ya vienen)', rpcs(S).length === 0)

    // Una letra: nada. Dos: espera y recién ahí consulta.
    S.buscarClienteAsentar('J')
    chk('con 1 letra no se consulta ni se programa nada', rpcs(S).length === 0 && vivos().length === 0)
    chk('con 1 letra sigue la lista inicial', /c-juanma/.test(resAd(S)))
    S.buscarClienteAsentar('Jy')
    S.buscarClienteAsentar('JyM')
    chk('mientras se escribe no se consulta (espera)', rpcs(S).length === 0)
    chk('queda UNA consulta programada (la anterior se cancela)', vivos().length === 1 && timers().length === 2 && timers()[0].cancelado)
    chk('con la espera de ESPERA_BUSCAR_MS', vivos()[0]?.ms === S.ESPERA_BUSCAR_MS)
    chk('mientras tanto dice "Buscando…"', /Buscando…/.test(resAd(S)))
    chk('buscar NO redibuja la tarjeta (no se pierde el foco)', htmlAd(S) === h)
    await correrTimers()
    const r = rpcs(S)
    chk('consulta buscar_clientes UNA vez, con el texto y SIN fábrica', r.length === 1 && JSON.stringify(r[0][1]) === JSON.stringify({ p_busqueda: 'JyM', p_unidad_negocio_id: null }), JSON.stringify(r))
    chk('lo que coincide y ya está en los botones no se repite', /Solo coinciden los sugeridos de arriba\./.test(resAd(S)))
  }
  // Desde otra cobranza (Caserato): "JyM" encuentra J&M en las dos empresas, con su saldo.
  {
    const S = admin()
    await S.mostrarCobranzas(); await esperar()
    await S.abrirAsentar(COB_CASERATO); await esperar()
    S.buscarClienteAsentar('JyM'); await correrTimers()
    const res = resAd(S)
    chk('"JyM" encuentra J&M de Nuss con su empresa y su saldo', /data-asentar-cliente="c-jm-n"[\s\S]*?J&amp;M DISTRIBUCIONES Y SERVICI<\/span><span class="ad-opcion-cliente__detalle">Cucuruchos Nuss · Debe \$\s185\.000,00/.test(res), res.slice(0, 800))
    chk('y J&M de Dolce Pasta, con su saldo a favor', /data-asentar-cliente="c-jm-d"[\s\S]*?Dolce Pasta · A favor \$\s12\.500,00/.test(res))
    chk('un saldo en cero dice "Cuenta en cero"', /JM Viandas[\s\S]*?Cucuruchos Nuss · Cuenta en cero/.test(res))
    chk('la fábrica de pruebas NO aparece (la base no la trae)', !/JyM Robot/.test(res))
    S.elegirClienteAsentar('c-jm-d')
    chk('elegir el de Dolce Pasta dice en qué cuenta se asienta', /Se va a asentar en la cuenta de J&amp;M DISTRIBUCIONES Y SERVICI \(Dolce Pasta\)/.test(htmlAd(S)))
    await S.confirmarAsentar(); await esperar()
    const a = rpcs(S, 'asentar_cobranza')
    chk('asienta en ESE cliente (la empresa sale del cliente)', a.length === 1 && a[0][1].p_cliente_id === 'c-jm-d' && a[0][1].p_id === COB_CASERATO, JSON.stringify(a))
  }
  // Un cliente que trae la base y no está en la lista local (la policy de
  // clientes no se lo deja ver): se elige igual, con su empresa.
  {
    const S = admin({ buscar: async () => ({ data: [{ cliente_id: 'c-solo-base', nombre: 'Solo En La Base', empresa: 'Dolce Pasta', unidad_negocio_id: 'u-d', saldo: 0 }], error: null }) })
    await S.mostrarCobranzas(); await esperar()
    await S.abrirAsentar(COB_CASERATO); await esperar()
    S.buscarClienteAsentar('solo'); await correrTimers()
    S.elegirClienteAsentar('c-solo-base')
    chk('se elige un cliente que solo trajo la base, con su empresa', S.estado.cobranzas.asentando?.cliente?.id === 'c-solo-base' &&
      /Se va a asentar en la cuenta de Solo En La Base \(Dolce Pasta\)/.test(htmlAd(S)))
  }
  // El turno: una respuesta vieja no pisa la nueva.
  {
    const lenta = diferida()
    let n = 0
    const S = admin({ buscar: async () => (++n === 1 ? lenta.p : { data: [{ cliente_id: 'c-nueva', nombre: 'Respuesta nueva', empresa: 'Dolce Pasta', unidad_negocio_id: 'u-d', saldo: 0 }], error: null }) })
    await S.mostrarCobranzas(); await esperar()
    await S.abrirAsentar(COB_CASERATO); await esperar()
    const a = S.estado.cobranzas.asentando
    S.buscarClienteAsentar('JyM')
    const p1 = S.consultarClientesAsentar(a)
    const p2 = S.consultarClientesAsentar(a)
    await p2
    lenta.resolver({ data: [{ cliente_id: 'c-vieja', nombre: 'Respuesta vieja', empresa: 'Cucuruchos Nuss', unidad_negocio_id: 'u-n', saldo: 0 }], error: null })
    await p1; await esperar()
    chk('la respuesta vieja no pisa la nueva (mismo texto)', /Respuesta nueva/.test(resAd(S)) && !/Respuesta vieja/.test(resAd(S)), resAd(S).slice(0, 300))
    const lenta2 = diferida()
    const S2 = admin({ buscar: async (p) => (p.p_busqueda === 'JyM' ? lenta2.p : { data: SERVIDOR_AD(p), error: null }) })
    await S2.mostrarCobranzas(); await esperar()
    await S2.abrirAsentar(COB_CASERATO); await esperar()
    S2.buscarClienteAsentar('JyM')
    const q1 = S2.consultarClientesAsentar(S2.estado.cobranzas.asentando)
    S2.buscarClienteAsentar('pepe de la'); await correrTimers()
    lenta2.resolver({ data: SERVIDOR_AD({ p_busqueda: 'JyM' }), error: null })
    await q1; await esperar()
    chk('la respuesta de un texto anterior no pisa la del actual', /Kiosco Pepe/.test(resAd(S2)) && !/J&amp;M/.test(resAd(S2)))
    // Mismo turno, pero ya se escribió otra cosa (su consulta todavía no salió).
    const lenta3 = diferida()
    const S3 = admin({ buscar: async () => lenta3.p })
    await S3.mostrarCobranzas(); await esperar()
    await S3.abrirAsentar(COB_CASERATO); await esperar()
    S3.buscarClienteAsentar('JyM')
    const r1 = S3.consultarClientesAsentar(S3.estado.cobranzas.asentando)
    S3.buscarClienteAsentar('pepe de la')
    lenta3.resolver({ data: SERVIDOR_AD({ p_busqueda: 'JyM' }), error: null })
    await r1; await esperar()
    chk('la respuesta de un texto que ya no está escrito no se muestra (aunque sea del mismo turno)', /Buscando…/.test(resAd(S3)) && !/J&amp;M/.test(resAd(S3)))
    chk('y no pisa lo que queda por buscar', S3.estado.cobranzas.asentando?.remoto?.texto === 'pepe de la')
    S3.cancelarAsentar()
    chk('cancelar el panel cancela la consulta programada', vivos().length === 0)
    S3.buscarClienteAsentar('xx')
    chk('sin panel abierto, buscar no hace nada', vivos().length === 0)
  }
  // Sin permiso (null) y con error: se DICE y queda la búsqueda local.
  {
    const S = admin({ buscar: async () => ({ data: null, error: null }) })
    await S.mostrarCobranzas(); await esperar()
    await S.abrirAsentar(COB_CASERATO); await esperar()
    S.buscarClienteAsentar('JyM'); await correrTimers()
    const res = resAd(S)
    chk('null: lo dice (no "no hay resultados")', /Con tu usuario no se puede buscar entre todos los clientes/.test(res) && !/Ningún cliente coincide/.test(res))
    chk('null: la búsqueda local encuentra J&M por la clave ("JyM" → "jm")', /data-asentar-cliente="c-jm-n"/.test(res) && /data-asentar-cliente="c-jm-d"/.test(res))
    chk('null: la local tampoco trae la fábrica de pruebas', !/JyM Robot/.test(res))
    const S2 = admin({ buscar: async () => ({ data: null, error: { message: 'Failed to fetch' } }) })
    await S2.mostrarCobranzas(); await esperar()
    await S2.abrirAsentar(COB_CASERATO); await esperar()
    S2.buscarClienteAsentar('JyM'); await correrTimers()
    const res2 = resAd(S2)
    chk('error: lo dice en bordó', /ad-aviso ad-aviso--grave">No se pudo buscar en la base: revisá la conexión/.test(res2))
    chk('error: y ofrece la búsqueda local', /data-asentar-cliente="c-jm-n"/.test(res2))
    S2.elegirClienteAsentar('c-jm-d')
    chk('error: se elige de la lista local con su empresa', /Se va a asentar en la cuenta de J&amp;M DISTRIBUCIONES Y SERVICI \(Dolce Pasta\)/.test(htmlAd(S2)))
  }
  // Una cuenta de la fábrica de pruebas busca en la lista local (la base no trae la suya).
  {
    const S = admin({ soyDePrueba: true })
    await S.mostrarCobranzas(); await esperar()
    await S.abrirAsentar(COB_CASERATO); await esperar()
    S.buscarClienteAsentar('JyM')
    chk('cuenta de prueba: no programa ninguna consulta', vivos().length === 0 && rpcs(S).length === 0)
    chk('cuenta de prueba: ve su cliente de prueba en la lista local', /JyM Robot/.test(resAd(S)))
  }
  // HTML malicioso en los renders nuevos de Administración.
  {
    const S = admin()
    const a = { id: 'x', sugeridos: [1, 2, 3, 4].map(i => ({ cliente_id: marca('s-id' + i), nombre: marca('s-nombre' + i), empresa: marca('s-emp' + i) })), busqueda: '', cliente: null, error: null }
    chequearMarcas(chk, 'admin: lista inicial', S.htmlResultadosAsentar(a), ['s-id4', 's-nombre4', 's-emp4'])
    a.busqueda = 'ab'
    a.remoto = { texto: 'ab', filas: [{ cliente_id: marca('r-id'), nombre: marca('r-nombre'), razon_social: marca('r-razon'), empresa: marca('r-emp'), saldo: 10 }], error: null }
    chequearMarcas(chk, 'admin: resultados de la base', S.htmlResultadosAsentar(a), ['r-id', 'r-nombre', 'r-razon', 'r-emp'])
    a.remoto.filas = []
    a.busqueda = marca('r-busca')
    a.remoto.texto = S.limpio(a.busqueda)
    chequearMarcas(chk, 'admin: sin resultados', S.htmlResultadosAsentar(a), ['r-busca'])
    S.estado.cobranzas.clientes = [{ id: 'x1', nombre: 'Nada Que Ver', razon_social: null, apodos: [], unidad_negocio_id: 'u-n' }]
    chequearMarcas(chk, 'admin: sin resultados en la lista local', S.htmlResultadosLocales(a, new Set()), ['r-busca'])
  }
}

// ═══ 2. ÓRDENES DE RETIRO (la carga del depósito) ═════════════════════════════
const CLIENTES_RT = [
  { id: 'c1', nombre: 'Distribuidora Anatolia', razon_social: 'ANATOLIA SRL', apodos: ['el Turco'], localidad: 'Córdoba', transporte_habitual: 'Expreso Norte', activo: true },
  { id: 'c-jm-n', nombre: 'J&M DISTRIBUCIONES Y SERVICI', razon_social: 'J&M DISTRIBUCIONES Y SERVICI', apodos: [], localidad: 'Córdoba', activo: true },
]
const FILAS_RT = [
  { cliente_id: 'c-jm-n', nombre: 'J&M DISTRIBUCIONES Y SERVICI', razon_social: 'J&M DISTRIBUCIONES Y SERVICI', localidad: 'Córdoba', empresa: 'Cucuruchos Nuss', unidad_negocio_id: 'u-n', activo: true, saldo: 185000, parecido: 0.9 },
  { cliente_id: 'c-lejano', nombre: 'JM Lejano', razon_social: null, localidad: 'Salta', empresa: 'Cucuruchos Nuss', unidad_negocio_id: 'u-n', activo: true, saldo: 999999, parecido: 0.4 },
  { cliente_id: 'c-otra', nombre: 'J&M de otra empresa', empresa: 'Dolce Pasta', unidad_negocio_id: 'u-d', activo: true, saldo: 5, parecido: 0.9 },
]
function retiros({ buscar = async () => ({ data: FILAS_RT, error: null }), fabricaU = null } = {}) {
  const S = construirRetiros(RETIROS, { preludioExtra: PRELUDIO_TIMERS })
  S.estado.empresaId = 'u-n'
  S.estado.clientes = CLIENTES_RT.map(c => ({ ...c }))
  if (fabricaU) S.estado.fabrica = { ok: true, unidades: new Set([fabricaU]), personas: new Set(), soyDePrueba: false }
  S.estado.form = S.formVacio()
  S.__setRpc(async (n, p) => (n === 'buscar_clientes' ? buscar(p) : { data: null, error: null }))
  return S
}
const resRt = (S) => S.__els.get('rt-clientes-resultados')?.innerHTML ?? ''

async function bloque2() {
  {
    const S = retiros()
    S.buscarClienteRetiro('JyM')
    let res = resRt(S)
    chk('retiros: al escribir "JyM" la lista local ya encuentra J&M (la clave)', /data-cliente="c-jm-n"/.test(res))
    chk('retiros: cada resultado dice la empresa (aunque sea una sola)', /J&amp;M DISTRIBUCIONES Y SERVICI<\/span><span class="rt-resultado__detalle">[^<]*Cucuruchos Nuss</.test(res), res.slice(0, 400))
    chk('retiros: espera antes de consultar', rpcs(S).length === 0 && vivos().length === 1 && vivos()[0].ms === S.ESPERA_BUSCAR_MS)
    await correrTimers()
    const r = rpcs(S)
    chk('retiros: buscar_clientes con la empresa de la orden', r.length === 1 && JSON.stringify(r[0][1]) === JSON.stringify({ p_busqueda: 'JyM', p_unidad_negocio_id: 'u-n' }), JSON.stringify(r))
    res = resRt(S)
    chk('retiros: muestra lo que devolvió la base (también lo que no estaba en la lista local)', /data-cliente="c-lejano"/.test(res) && /JM Lejano/.test(res))
    chk('retiros: nunca un cliente de otra empresa', !/c-otra/.test(res))
    chk('retiros: NUNCA el saldo (no es una pantalla de plata)', !/\$|185|999|Debe|A favor|saldo/i.test(res), res)
    chk('retiros: el de la base también con su empresa', /JM Lejano<\/span><span class="rt-resultado__detalle">Salta · Cucuruchos Nuss</.test(res))
    S.elegirCliente('c-lejano')
    chk('retiros: elegir uno que solo trajo la base lo suma y lo elige', S.estado.form.clienteId === 'c-lejano' && S.estado.clientes.some(c => c.id === 'c-lejano' && c.nombre === 'JM Lejano'))
    S.cambiarCliente()
    S.buscarClienteRetiro('J')
    chk('retiros: con 1 letra no consulta', vivos().length === 0)
    S.buscarClienteRetiro('JyM')
    chk('retiros: el mismo texto ya contestado no se vuelve a pedir', vivos().length === 0)
  }
  {
    // Sin permiso (el depósito con solo retiros:cargar): local, sin error, y no vuelve a preguntar.
    const S = retiros({ buscar: async () => ({ data: null, error: null }) })
    S.buscarClienteRetiro('JyM'); await correrTimers()
    const res = resRt(S)
    chk('retiros null: queda la lista local', /data-cliente="c-jm-n"/.test(res) && !/c-lejano/.test(res))
    chk('retiros null: sin ningún error a la vista', !/rt-aviso/.test(res))
    chk('retiros null: se anota que la base no deja', S.estado.buscarClientesSinPermiso === true)
    S.buscarClienteRetiro('turco')
    chk('retiros null: no vuelve a preguntar', vivos().length === 0)
    chk('retiros null: la local busca por apodo', /Distribuidora Anatolia/.test(resRt(S)))
    const S2 = retiros({ buscar: async () => ({ data: null, error: { message: 'Failed to fetch' } }) })
    S2.buscarClienteRetiro('JyM'); await correrTimers()
    chk('retiros error: queda la lista local, sin error a la vista', /data-cliente="c-jm-n"/.test(resRt(S2)) && !/rt-aviso/.test(resRt(S2)))
    chk('retiros error: sí vuelve a intentar con otro texto', (S2.buscarClienteRetiro('turco'), vivos().length === 1))
  }
  {
    // El turno, y otra empresa.
    const lenta = diferida()
    let n = 0
    const S = retiros({ buscar: async () => (++n === 1 ? lenta.p : { data: [FILAS_RT[1]], error: null }) })
    S.estado.form.clienteBusqueda = 'JyM'
    const p1 = S.consultarClientesRetiro('JyM', 'u-n')
    await S.consultarClientesRetiro('JyM', 'u-n')
    lenta.resolver({ data: [FILAS_RT[0]], error: null })
    await p1
    chk('retiros: una respuesta vieja no pisa la nueva', S.estado.buscarClientes?.filas?.length === 1 && S.estado.buscarClientes.filas[0].cliente_id === 'c-lejano')
    S.estado.buscarClientes = null
    S.estado.form.clienteBusqueda = 'otra cosa'
    await S.consultarClientesRetiro('JyM', 'u-n')
    chk('retiros: la respuesta de un texto que ya no está escrito no se usa', S.estado.buscarClientes === null)
    S.estado.form.clienteBusqueda = 'JyM'
    S.estado.empresaId = 'u-d'
    await S.consultarClientesRetiro('JyM', 'u-n')
    chk('retiros: la respuesta de otra empresa no se usa', S.estado.buscarClientes === null)
  }
  {
    const S = retiros({ fabricaU: 'u-n' })
    S.buscarClienteRetiro('JyM')
    chk('retiros: una empresa de la fábrica de pruebas no le pregunta a la base', vivos().length === 0)
  }
  {
    const S = retiros()
    S.estado.buscarClientes = { texto: 'ab', empresaId: 'u-n', filas: [{ cliente_id: marca('rt-id'), nombre: marca('rt-nombre'), razon_social: marca('rt-razon'), localidad: marca('rt-loc'), empresa: marca('rt-emp'), unidad_negocio_id: 'u-n', saldo: 1 }] }
    chequearMarcas(chk, 'retiros: resultados de la base', S.htmlResultadosClientes('ab'), ['rt-id', 'rt-nombre', 'rt-razon', 'rt-loc', 'rt-emp'])
    S.estado.buscarClientes.filas = []
    const busca = marca('rt-busca')
    S.estado.buscarClientes.texto = S.limpio(busca)
    chequearMarcas(chk, 'retiros: sin resultados de la base', S.htmlResultadosClientes(busca), ['rt-busca'])
    S.estado.buscarClientes = null
    S.estado.clientes = [{ id: marca('rl-id'), nombre: marca('rl-nombre'), razon_social: marca('rl-razon'), localidad: marca('rl-loc'), apodos: [marca('rl-apodo')], activo: true }]
    chequearMarcas(chk, 'retiros: resultados locales', S.htmlResultadosClientes('razon') + S.htmlResultadosClientes('xss'), ['rl-id', 'rl-nombre', 'rl-razon', 'rl-loc', 'rl-apodo'])
    chequearMarcas(chk, 'retiros: sin resultados locales', S.htmlResultadosClientes(marca('rl-busca')), ['rl-busca'])
    chk('retiros: las iniciales del cliente van escapadas', /rt-resultado__ini" aria-hidden="true">&lt;&lt;</.test(S.htmlResultadoCliente({ id: 'x', nombre: '<b <i', apodos: [] }, 'E', '')))
  }
}

// ═══ 3. PEDIDOS ═══════════════════════════════════════════════════════════════
const CLIENTES_PE = [
  { id: 'c1', nombre: 'Distribuidora Anatolia', apodos: ['el Turco'], localidad: 'Córdoba', activo: true, unidad_negocio_id: 'u-cn' },
  { id: 'c-jm-n', nombre: 'J&M DISTRIBUCIONES Y SERVICI', apodos: [], localidad: 'Córdoba', activo: true, unidad_negocio_id: 'u-cn' },
]
const FILAS_PE = [
  { cliente_id: 'c-jm-n', nombre: 'J&M DISTRIBUCIONES Y SERVICI', localidad: 'Córdoba', empresa: 'Cucuruchos Nuss', unidad_negocio_id: 'u-cn', activo: true, saldo: 185000, parecido: 0.9 },
  { cliente_id: 'c-lejano', nombre: 'JM Lejano', localidad: 'Salta', empresa: 'Cucuruchos Nuss', unidad_negocio_id: 'u-cn', activo: true, saldo: 999999, parecido: 0.4 },
  { cliente_id: 'c-otra', nombre: 'J&M de otra empresa', empresa: 'Dolce Pasta', unidad_negocio_id: 'u-dp', activo: true, saldo: 5, parecido: 0.9 },
]
function pedidos({ buscar = async () => ({ data: FILAS_PE, error: null }), fabricaU = null } = {}) {
  const S = construirPedidos(PEDIDOS, { preludioExtra: PRELUDIO_TIMERS })
  S.estado.clientes = CLIENTES_PE.map(c => ({ ...c }))
  S.estado.clientesDe = 'u-cn'
  if (fabricaU) S.estado.fabrica = { ok: true, unidades: new Set([fabricaU]), personas: new Set(), soyDePrueba: false }
  S.estado.form = S.formPedidoVacio('u-cn')
  S.__setRpc(async (n, p) => (n === 'buscar_clientes' ? buscar(p) : { data: null, error: null }))
  return S
}
const resPe = (S) => S.__els.get('pe-form-clientes-resultados')?.innerHTML ?? ''

async function bloque3() {
  {
    const S = pedidos()
    S.buscarClienteForm('J')
    chk('pedidos: con 1 letra no consulta', vivos().length === 0 && rpcs(S).length === 0)
    S.buscarClienteForm('JyM')
    let res = resPe(S)
    chk('pedidos: al escribir "JyM" la lista local ya encuentra J&M (la clave)', /data-form-cliente="c-jm-n"/.test(res))
    chk('pedidos: cada resultado dice la empresa', /J&amp;M DISTRIBUCIONES Y SERVICI<\/span><span class="pe-resultado__meta">Cucuruchos Nuss · Córdoba/.test(res), res.slice(0, 400))
    chk('pedidos: espera antes de consultar', rpcs(S).length === 0 && vivos().length === 1 && vivos()[0].ms === S.ESPERA_BUSCAR_MS)
    await correrTimers()
    const r = rpcs(S)
    chk('pedidos: buscar_clientes con la unidad del pedido', r.length === 1 && JSON.stringify(r[0][1]) === JSON.stringify({ p_busqueda: 'JyM', p_unidad_negocio_id: 'u-cn' }), JSON.stringify(r))
    res = resPe(S)
    chk('pedidos: muestra lo que devolvió la base', /data-form-cliente="c-lejano"/.test(res))
    chk('pedidos: nunca un cliente de otra unidad', !/c-otra/.test(res))
    chk('pedidos: NUNCA el saldo', !/\$|185|999|Debe|A favor|saldo/i.test(res), res)
    S.elegirClienteForm('c-lejano')
    chk('pedidos: elegir uno que solo trajo la base lo suma (activo, de la unidad) y lo elige',
      S.estado.form.clienteId === 'c-lejano' && S.estado.clientes.some(c => c.id === 'c-lejano' && c.activo === true && c.unidad_negocio_id === 'u-cn'))
    S.elegirClienteForm('no-existe')
    chk('pedidos: un id que no está en ningún lado no se elige', S.estado.form.clienteId === 'c-lejano')
  }
  {
    const S = pedidos({ buscar: async () => ({ data: null, error: null }) })
    S.buscarClienteForm('JyM'); await correrTimers()
    chk('pedidos null: queda la lista local, sin error', /data-form-cliente="c-jm-n"/.test(resPe(S)) && !/pe-aviso/.test(resPe(S)))
    S.buscarClienteForm('turco')
    chk('pedidos null: no vuelve a preguntar', vivos().length === 0 && S.estado.buscarClientesSinPermiso === true)
    const S2 = pedidos({ buscar: async () => ({ data: null, error: { message: 'x' } }) })
    S2.buscarClienteForm('JyM'); await correrTimers()
    chk('pedidos error: queda la lista local, sin error a la vista', /data-form-cliente="c-jm-n"/.test(resPe(S2)) && !/pe-aviso/.test(resPe(S2)))
  }
  {
    const lenta = diferida()
    let n = 0
    const S = pedidos({ buscar: async () => (++n === 1 ? lenta.p : { data: [FILAS_PE[1]], error: null }) })
    S.estado.form.clienteBusqueda = 'JyM'
    const p1 = S.consultarClientesForm('JyM', 'u-cn')
    await S.consultarClientesForm('JyM', 'u-cn')
    lenta.resolver({ data: [FILAS_PE[0]], error: null })
    await p1
    chk('pedidos: una respuesta vieja no pisa la nueva', S.estado.buscarClientes?.filas?.[0]?.cliente_id === 'c-lejano' && S.estado.buscarClientes.filas.length === 1)
    S.estado.buscarClientes = null
    S.estado.form.unidadId = 'u-dp'
    await S.consultarClientesForm('JyM', 'u-cn')
    chk('pedidos: la respuesta de otra unidad no se usa', S.estado.buscarClientes === null)
    S.estado.form.unidadId = 'u-cn'
    S.estado.form.clienteBusqueda = 'otra'
    await S.consultarClientesForm('JyM', 'u-cn')
    chk('pedidos: la respuesta de un texto que ya no está escrito no se usa', S.estado.buscarClientes === null)
  }
  {
    const S = pedidos({ fabricaU: 'u-cn' })
    S.buscarClienteForm('JyM')
    chk('pedidos: una unidad de la fábrica de pruebas no le pregunta a la base', vivos().length === 0)
    S.estado.form.unidadId = null
    S.estado.fabrica = { ok: true, unidades: new Set(), personas: new Set(), soyDePrueba: false }
    S.buscarClienteForm('JyM')
    chk('pedidos: sin unidad no le pregunta a la base', vivos().length === 0)
  }
  {
    const S = pedidos()
    S.estado.buscarClientes = { texto: 'ab', unidadId: 'u-cn', filas: [{ cliente_id: marca('pe-id'), nombre: marca('pe-nombre'), localidad: marca('pe-loc'), empresa: marca('pe-emp'), unidad_negocio_id: 'u-cn', saldo: 1 }] }
    chequearMarcas(chk, 'pedidos: resultados de la base', S.htmlResultadosClientes('ab'), ['pe-id', 'pe-nombre', 'pe-loc', 'pe-emp'])
    const busca = marca('pe-busca')
    S.estado.buscarClientes = { texto: S.limpio(busca), unidadId: 'u-cn', filas: [] }
    chequearMarcas(chk, 'pedidos: sin resultados de la base', S.htmlResultadosClientes(busca), ['pe-busca'])
    S.estado.buscarClientes = null
    S.estado.clientes = [{ id: marca('pl-id'), nombre: marca('pl-nombre'), apodos: [marca('pl-apodo')], localidad: marca('pl-loc'), activo: true, unidad_negocio_id: 'u-cn' }]
    chequearMarcas(chk, 'pedidos: resultados locales', S.htmlResultadosClientes(''), ['pl-id', 'pl-nombre', 'pl-apodo', 'pl-loc'])
    chequearMarcas(chk, 'pedidos: sin resultados locales', S.htmlResultadosClientes(marca('pl-busca')), ['pl-busca'])
  }
}

// Uno detrás de otro: comparten los timers de globalThis.
esperas.push(bloque1().then(bloque2).then(bloque3))
fin()
