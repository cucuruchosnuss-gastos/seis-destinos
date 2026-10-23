// CONOS DE PAPEL — "¿Quisiste decir…?" al crear un cono (21/10/2026,
// .claude/pedidos/2026-10-21-conos-parecidos.md).
//
// En producción crearon "CASERATTO" cuando ya existía "CASERATO". Los dos
// buscadores de modulos/conos.html que ofrecen "+ Cono nuevo" (Anotar para
// pedir y Agregar cono al pliego) piden ahora a la base los parecidos
// (conos_parecidos) y proponer_marca acepta p_es_otro. Esta suite EJECUTA el
// código real de la pantalla:
//  - mientras se escribe (3 letras o más, a los 300 ms, y solo si se ofrece
//    "+ Cono nuevo") se piden los parecidos y van arriba del botón;
//  - tocar uno lo ELIGE (mismo atributo que un resultado): no se crea nada;
//  - con uno "igual", el botón dice "Es otro cono, crearlo igual", pide
//    confirmación ("¿Seguro que no es CASERATO?") y recién ahí manda p_es_otro;
//  - el error "Ya existe el cono X…" va tal cual y ofrece elegir ese;
//  - sin internet, sin parecidos; una respuesta vieja no pisa a una nueva; XSS.
//
//   node pruebas/test-conos-parecidos.js

const fs = require('fs')
const path = require('path')
const { construirCon } = require('./sandbox')
const { arnes, marca, chequearMarcas } = require('./circuito-comun')
const { fuenteNumeros } = require('./numeros-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/conos.html')
const FUENTE = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${FUENTE.length} bytes)`)
const { chk, esperas, fin } = arnes()

const PRELUDIO = `
  ${fuenteNumeros()}
  function nuevoEl(id) {
    return { id, innerHTML: '', textContent: '', value: '', hidden: false, disabled: false, isConnected: true, dataset: {},
      focus() {}, querySelector: () => null, querySelectorAll: () => [], addEventListener() {} }
  }
  var __els = new Map()
  var document = { activeElement: null, getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) } }
  var navigator = { onLine: true }
  var __timeouts = []
  function setTimeout(f, ms) { __timeouts.push([f, ms]); return __timeouts.length } function clearTimeout() {}
  var __rpcs = []
  var __rpc = async () => ({ data: null, error: null })
  var supabase = { rpc(n, p) { __rpcs.push([n, JSON.parse(JSON.stringify(p ?? null))]); return Promise.resolve(__rpc(n, p)) } }
  var __exitos = []
  function mostrarExito(m) { __exitos.push(m) } function mostrarError(m) { __exitos.push('ERROR ' + m) }
  var accionModal = null, focoAntes = null
  var __pintadas = []
  async function cargarStock() {} async function cargarCatalogo() {}
  async function elegirConoAnotar(id) { estado.anotar.marcaId = id }
  function pintarAgregar() { __pintadas.push('agregar') }
  var estado = {
    perm: { ver: true, pedir: true, precios: false, recibir: false, configurar: false, cargar: false, produccion: false },
    conos: [
      { marca_id: 'mk-caserato', cono: 'CASERATO', activa: true },
      { marca_id: 'mk-cassis', cono: 'CASSIS', activa: true },
      { marca_id: 'mk-aspen', cono: 'ASPEN', activa: true },
    ],
    conoPorId: new Map(), anotar: { marcaId: null, sugerido: false }, agregar: { abierto: true, marcaId: null, buscar: '' },
    enviando: false, proponiendo: false,
  }
  for (const c of estado.conos) estado.conoPorId.set(c.marca_id, c)
`
const FUNCIONES = ['esc', 'normalizarBusqueda', 'puedeProponer', 'textoConoNuevo', 'conoNuevoOfrecido', 'ofrecerConoNuevo', 'buscarConos',
  'htmlResultados', 'listaParecidos', 'igualDe', 'conoQueYaExiste', 'estadoParecidos', 'pintarResultados', 'pintarResultadosAgregar',
  'pintarResultadosAnotar', 'programarParecidos', 'buscarParecidos', 'idDeConoPorNombre', 'asegurarCono', 'limpiarParecidos',
  'confirmarEsOtroCono', 'proponerCono', 'mensajeDe', 'rpc', 'abrirModal', 'cerrarModal', 'errorModal', 'ejecutarModal']
const CONSTANTES = ['ESPERA_PARECIDOS_MS', 'MIN_LETRAS_PARECIDOS']
const nuevo = () => construirCon(ARCHIVO, {
  preludio: PRELUDIO, funciones: FUNCIONES, constantes: CONSTANTES,
  retorno: `${CONSTANTES.join(', ')}, estado, __els, __doc: document, __nav: navigator, __timeouts, __exitos, __pintadas,
    __rpcs(){ return __rpcs }, __setRpc(f){ __rpc = f }`,
})

const PARECIDOS = [
  { marca_id: 'mk-caserato', nombre: 'CASERATO', igual: true, similitud: 0.8 },
  { marca_id: 'mk-cassis', nombre: 'CASSIS', igual: false, similitud: 0.46 },
]
const YA_EXISTE = 'Ya existe el cono CASERATO: elegí ese. Si de verdad es otro cono, confirmalo.'
const el = (S, id) => S.__doc.getElementById(id)
const rpcs = (S, n) => S.__rpcs().filter(r => r[0] === n)
const json = (x) => JSON.stringify(x)
function base(S, { parecidos = PARECIDOS, proponer = { data: { marca_id: 'mk-nuevo', ya_existia: false }, error: null } } = {}) {
  S.__setRpc(async (n, p) => {
    if (n === 'conos_parecidos') return { data: parecidos, error: null }
    if (n === 'proponer_marca') return typeof proponer === 'function' ? proponer(p) : proponer
    return { data: null, error: null }
  })
}
// Escribir en un buscador ('anotar' o 'agregar') y dejar pasar los 300 ms.
async function escribir(S, destino, texto) {
  if (destino === 'anotar') el(S, 'cn-anotar-buscar').value = texto
  else S.estado.agregar.buscar = texto
  S.programarParecidos(destino, texto)
  S.pintarResultados(destino)
  const t = S.__timeouts[S.__timeouts.length - 1]
  if (t) await t[0]()
}
const resultados = (S, destino) => el(S, destino === 'anotar' ? 'cn-anotar-resultados' : 'cn-agr-resultados').innerHTML

// ── Lo puro ─────────────────────────────────────────────────────────────────
{
  const S = nuevo()
  chk('espera 300 ms y pide 3 letras', S.ESPERA_PARECIDOS_MS === 300 && S.MIN_LETRAS_PARECIDOS === 3)
  chk('los parecidos de la base, limpios', json(S.listaParecidos(PARECIDOS)) === json([{ marca_id: 'mk-caserato', nombre: 'CASERATO', igual: true }, { marca_id: 'mk-cassis', nombre: 'CASSIS', igual: false }]) &&
    json(S.listaParecidos(null)) === '[]')
  chk('del error de la base sale el nombre', S.conoQueYaExiste(YA_EXISTE) === 'CASERATO' && S.conoQueYaExiste('otra cosa') === null)
  chk('un nombre con dos puntos también', S.conoQueYaExiste('Ya existe el cono LA: ROSA: elegí ese. Si de verdad es otro cono, confirmalo.') === 'LA: ROSA')
  chk('el igual: el parecido igual, o el que nombró la base', S.igualDe({ lista: S.listaParecidos(PARECIDOS) }).nombre === 'CASERATO' &&
    S.igualDe({ lista: [], yaExiste: { nombre: 'X', marca_id: 'x' } }).nombre === 'X' && S.igualDe({ lista: [] }) === null)
  const par = { texto: 'CASERATTO', lista: S.listaParecidos(PARECIDOS), yaExiste: null }
  const h = S.htmlResultados([], 'data-anotar-cono', 'CASERATTO', 'anotar', par)
  chk('"¿Quisiste decir…?" con los parecidos, ANTES del botón de crear', /¿Quisiste decir…\?/.test(h) && h.indexOf('CASSIS') < h.indexOf('data-cono-nuevo'))
  chk('cada parecido con el atributo de un resultado (tocarlo lo elige)', /data-anotar-cono="mk-caserato" data-parecido-nombre="CASERATO">CASERATO</.test(h))
  chk('con uno igual, el botón dice "Es otro cono, crearlo igual"', /data-cono-nuevo="CASERATTO"[^>]*>Es otro cono, crearlo igual: «CASERATTO»</.test(h))
  const h2 = S.htmlResultados([], 'data-agregar-cono', 'CASSA', 'agregar', { texto: 'CASSA', lista: [S.listaParecidos(PARECIDOS)[1]] })
  chk('sin igual, el botón sigue "+ Cono nuevo"', />\+ Cono nuevo: «CASSA»</.test(h2) && /data-agregar-cono="mk-cassis"/.test(h2))
  const h3 = S.htmlResultados([{ marca_id: 'mk-cassis', cono: 'CASSIS' }], 'data-agregar-cono', 'CASS', 'agregar', { texto: 'CASS', lista: S.listaParecidos(PARECIDOS) })
  chk('un parecido que ya está en la lista no se repite', (h3.match(/mk-cassis/g) || []).length === 1)
  const h5 = S.htmlResultados([{ marca_id: 'mk-aspen', cono: 'ASPEN' }], 'data-anotar-cono', 'CASERATTO', 'anotar', par)
  chk('el orden: los resultados, después "¿Quisiste decir…?" con los parecidos, al final el botón de crear',
    h5.indexOf('ASPEN') < h5.indexOf('¿Quisiste') && h5.indexOf('¿Quisiste') < h5.indexOf('>CASERATO<') && h5.indexOf('>CASERATO<') < h5.indexOf('data-cono-nuevo'))
  const h4 = S.htmlResultados([], 'data-anotar-cono', 'OTRO', 'anotar', par)
  chk('los parecidos de OTRO texto no se muestran', !/¿Quisiste decir/.test(h4) && />\+ Cono nuevo: «OTRO»</.test(h4))
  chk('sin parecidos (las llamadas viejas, con 4 parámetros) todo como antes', S.htmlResultados([], 'data-anotar-cono', 'LE CREMME', 'anotar') ===
    '<button type="button" class="cn-resultado" data-cono-nuevo="LE CREMME" data-cono-destino="anotar">+ Cono nuevo: «LE CREMME»</button>')
}

// ── Al escribir, en los dos buscadores ──────────────────────────────────────
for (const destino of ['anotar', 'agregar']) {
  esperas.push((async () => {
    const S = nuevo()
    base(S)
    el(S, 'cn-anotar-buscar').value = 'CASERATTO'
    S.estado.agregar.buscar = 'CASERATTO'
    S.programarParecidos(destino, 'CASERATTO')
    const t = S.__timeouts[S.__timeouts.length - 1]
    chk(`${destino}: escribir programa la búsqueda a los 300 ms`, t && t[1] === 300 && !rpcs(S, 'conos_parecidos').length)
    await t[0]()
    chk(`${destino}: pide conos_parecidos con lo escrito`, json(rpcs(S, 'conos_parecidos')[0]?.[1]) === json({ p_nombre: 'CASERATTO' }))
    chk(`${destino}: los parecidos aparecen en los resultados`, /¿Quisiste decir…\?/.test(resultados(S, destino)) && /CASERATO/.test(resultados(S, destino)))
    chk(`${destino}: y el botón dice "Es otro cono, crearlo igual"`, /Es otro cono, crearlo igual: «CASERATTO»/.test(resultados(S, destino)))
    await escribir(S, destino, 'ca')
    chk(`${destino}: con menos de 3 letras no llama`, rpcs(S, 'conos_parecidos').length === 1 && !/¿Quisiste decir/.test(resultados(S, destino)))
    await escribir(S, destino, 'aspen')
    chk(`${destino}: un nombre que existe exacto no ofrece crear ni pide parecidos`, rpcs(S, 'conos_parecidos').length === 1)
  })())
}
esperas.push((async () => {
  const S = nuevo()
  base(S)
  S.estado.perm = { ver: true, pedir: false, configurar: false, cargar: false }
  await escribir(S, 'anotar', 'CASERATTO')
  chk('quien no puede proponer no pide parecidos', !rpcs(S, 'conos_parecidos').length)
})())

// ── Elegir un parecido no crea nada ─────────────────────────────────────────
chk('tocar un parecido de Anotar lo elige ahí (sin proponer_marca)',
  /if \(\(el = b\('\[data-anotar-cono\]'\)\)\) \{ asegurarCono\(el\.dataset\.anotarCono, el\.dataset\.parecidoNombre\); limpiarParecidos\('anotar'\); elegirConoAnotar\(el\.dataset\.anotarCono\); return \}/.test(FUENTE))
chk('tocar un parecido de Agregar lo elige ahí (sin proponer_marca)',
  /if \(\(el = b\('\[data-agregar-cono\]'\)\)\) \{ asegurarCono\(el\.dataset\.agregarCono, el\.dataset\.parecidoNombre\); limpiarParecidos\('agregar'\); estado\.agregar\.marcaId = el\.dataset\.agregarCono; pintarAgregar\(\); return \}/.test(FUENTE))
{
  const S = nuevo()
  S.asegurarCono('mk-otro', 'CASERATO NUEVO')
  chk('un parecido que la pantalla no tenía se suma para poder nombrarlo', S.estado.conoPorId.get('mk-otro')?.cono === 'CASERATO NUEVO')
  S.asegurarCono('mk-caserato', 'OTRO NOMBRE')
  chk('… y uno que ya tenía no se toca', S.estado.conoPorId.get('mk-caserato').cono === 'CASERATO')
}

// ── "Igual" exige confirmación y manda p_es_otro ────────────────────────────
for (const destino of ['anotar', 'agregar']) {
  esperas.push((async () => {
    const S = nuevo()
    base(S, { proponer: { data: { marca_id: 'mk-caseratto', ya_existia: false }, error: null } })
    await escribir(S, destino, 'CASERATTO')
    await S.proponerCono('CASERATTO', destino)
    chk(`${destino}: con uno igual, crear NO llama: pregunta`, !rpcs(S, 'proponer_marca').length && el(S, 'cn-modal-fondo').hidden === false)
    const m = el(S, 'cn-modal').innerHTML
    chk(`${destino}: "¿Seguro que no es CASERATO?"`, /<h2 id="cn-modal-titulo">¿Seguro que no es CASERATO\?<\/h2>/.test(m) && /Ya existe el cono CASERATO/.test(m))
    const atr = destino === 'anotar' ? 'data-anotar-cono' : 'data-agregar-cono'
    chk(`${destino}: con "No: elegir CASERATO" (que cierra y elige) y "Sí, es otro cono: crearlo"`,
      new RegExp(`data-modal-cerrar ${atr}="mk-caserato"[^>]*>No: elegir CASERATO<`).test(m) && /id="cn-modal-ok">Sí, es otro cono: crearlo</.test(m))
    await S.ejecutarModal()
    const r = rpcs(S, 'proponer_marca')
    chk(`${destino}: al confirmar, manda p_es_otro = true`, r.length === 1 && json(r[0][1]) === json({ p_nombre: 'CASERATTO', p_es_otro: true }), json(r))
    chk(`${destino}: y el cono nuevo queda elegido`, destino === 'anotar' ? S.estado.anotar.marcaId === 'mk-caseratto' : S.estado.agregar.marcaId === 'mk-caseratto')
    chk(`${destino}: y el cartel se cierra`, el(S, 'cn-modal-fondo').hidden === true)
  })())
}
esperas.push((async () => {
  const S = nuevo()
  base(S, { parecidos: [PARECIDOS[1]] })
  await escribir(S, 'anotar', 'CASSA')
  await S.proponerCono('CASSA', 'anotar')
  const r = rpcs(S, 'proponer_marca')
  chk('sin igual, crea directo y sin p_es_otro', r.length === 1 && json(r[0][1]) === json({ p_nombre: 'CASSA' }) && S.estado.anotar.marcaId === 'mk-nuevo')
  chk('… y los parecidos se limpian', S.estadoParecidos('anotar').texto === '' && S.estadoParecidos('anotar').lista.length === 0)
})())

// ── El error de la base, tal cual, y elegir ese ─────────────────────────────
esperas.push((async () => {
  const S = nuevo()
  base(S, { parecidos: [], proponer: { data: null, error: { message: YA_EXISTE, code: 'P0001' } } })
  await escribir(S, 'agregar', 'CASERATTO')
  await S.proponerCono('CASERATTO', 'agregar')
  chk('el error de la base TAL CUAL en el formulario', el(S, 'cn-agr-error').textContent === YA_EXISTE && el(S, 'cn-agr-error').hidden === false)
  const h = resultados(S, 'agregar')
  chk('… y ofrece "Elegir CASERATO" (con el atributo que lo elige)', /data-agregar-cono="mk-caserato" data-parecido-nombre="CASERATO">Elegir CASERATO</.test(h))
  chk('… y el botón pasa a "Es otro cono, crearlo igual"', /Es otro cono, crearlo igual: «CASERATTO»/.test(h))
  chk('… y no queda trabado', S.estado.proponiendo === false)
  S.__setRpc(async () => ({ data: { marca_id: 'mk-2', ya_existia: false }, error: null }))
  await S.proponerCono('CASERATTO', 'agregar')
  chk('crearlo igual pregunta', el(S, 'cn-modal-fondo').hidden === false && /¿Seguro que no es CASERATO\?/.test(el(S, 'cn-modal').innerHTML))
  await S.ejecutarModal()
  chk('… y confirmado manda p_es_otro', json(rpcs(S, 'proponer_marca').pop()[1]) === json({ p_nombre: 'CASERATTO', p_es_otro: true }))
})())
esperas.push((async () => {
  const S = nuevo()
  base(S, { parecidos: [], proponer: { data: null, error: { message: 'Ese cono está marcado como rechazado. Hablalo con quien configura producción.' } } })
  await escribir(S, 'anotar', 'PROHIBIDO')
  await S.proponerCono('PROHIBIDO', 'anotar')
  chk('otro error de la base: tal cual y sin "Elegir"', /rechazado/.test(el(S, 'cn-anotar-error').textContent) && !/Elegir/.test(resultados(S, 'anotar')))
})())

// ── Sin internet ────────────────────────────────────────────────────────────
esperas.push((async () => {
  const S = nuevo()
  base(S)
  S.__nav.onLine = false
  await escribir(S, 'anotar', 'CASERATTO')
  chk('sin internet no se piden parecidos', !rpcs(S, 'conos_parecidos').length && !/¿Quisiste decir/.test(resultados(S, 'anotar')))
  chk('… el botón es el de siempre', />\+ Cono nuevo: «CASERATTO»</.test(resultados(S, 'anotar')))
  await S.proponerCono('CASERATTO', 'anotar')
  chk('… y crear se comporta como antes (sin preguntar)', json(rpcs(S, 'proponer_marca')[0]?.[1]) === json({ p_nombre: 'CASERATTO' }))
})())
esperas.push((async () => {
  const S = nuevo()
  S.__setRpc(async (n) => n === 'conos_parecidos' ? { data: null, error: { message: 'Failed to fetch' } } : { data: { marca_id: 'mk-x' }, error: null })
  await escribir(S, 'anotar', 'CASERATTO')
  chk('si la base no contesta los parecidos, no hay sugerencias', !/¿Quisiste decir/.test(resultados(S, 'anotar')))
})())

// ── Una respuesta vieja no pisa a una nueva ─────────────────────────────────
esperas.push((async () => {
  const S = nuevo()
  const pendientes = []
  S.__setRpc((n, p) => new Promise(r => pendientes.push(() => r({ data: p.p_nombre === 'CASERATTO' ? PARECIDOS : [PARECIDOS[1]], error: null }))))
  el(S, 'cn-anotar-buscar').value = 'CASERATTO'
  S.programarParecidos('anotar', 'CASERATTO')
  const v1 = S.buscarParecidos('anotar')
  el(S, 'cn-anotar-buscar').value = 'CASSA'
  S.programarParecidos('anotar', 'CASSA')
  const v2 = S.buscarParecidos('anotar')
  pendientes[1]()
  await v2
  pendientes[0]()
  await v1
  chk('la respuesta vieja (CASERATTO) no pisa la nueva (CASSA)', !/CASERATO/.test(resultados(S, 'anotar')) && /CASSIS/.test(resultados(S, 'anotar')))
})())

// ── Las conexiones ─────────────────────────────────────────────────────────
chk('Anotar: escribir programa los parecidos', /programarParecidos\('anotar', ev\.target\.value\)/.test(FUENTE))
chk('Agregar: escribir programa los parecidos', /estado\.agregar\.buscar = ev\.target\.value; programarParecidos\('agregar', ev\.target\.value\); pintarResultadosAgregar\(\)/.test(FUENTE))

// ── XSS ────────────────────────────────────────────────────────────────────
{
  const S = nuevo()
  const h = S.htmlResultados([{ marca_id: marca('id-cono'), cono: marca('cono') }], 'data-anotar-cono', 'X' + marca('texto'), 'anotar',
    { texto: 'X' + marca('texto'), lista: [{ marca_id: marca('id'), nombre: marca('nombre'), igual: false }], yaExiste: { nombre: marca('ya'), marca_id: marca('id-ya') } })
  chequearMarcas(chk, 'los parecidos del buscador', h, ['id', 'nombre', 'ya', 'id-ya', 'id-cono', 'cono'])
  // El texto escrito también sale en MAYÚSCULAS: la marca cruda sería "<B DATA-XSS".
  chk('el texto escrito, en mayúsculas, tampoco entra crudo', !/<b data-xss=/i.test(h))
  S.confirmarEsOtroCono('X' + marca('escrito'), 'anotar', { nombre: marca('igual'), marca_id: marca('id-igual') })
  chequearMarcas(chk, 'el cartel de "¿Seguro que no es…?"', S.__doc.getElementById('cn-modal').innerHTML, ['igual', 'id-igual'])
}

fin()
