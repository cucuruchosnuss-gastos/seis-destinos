// PLANTA (la tablet) — "¿Quisiste decir…?" al crear un cono (21/10/2026,
// .claude/pedidos/2026-10-21-conos-parecidos.md).
//
// En producción crearon "CASERATTO" cuando ya existía "CASERATO". La base
// ahora tiene conos_parecidos(p_nombre) y proponer_marca(p_nombre, p_es_otro):
// con un cono "igual" (mismo nombre salvo letras repetidas, tildes o espacios)
// rechaza con "Ya existe el cono X: elegí ese. Si de verdad es otro cono,
// confirmalo." Esta suite EJECUTA el código real de modulos/produccion.html:
//  - mientras se escribe (3 letras o más, a los 300 ms) se piden los
//    parecidos y se muestran como botones grandes arriba del botón;
//  - tocar uno ELIGE ese cono: no se llama a proponer_marca;
//  - con uno "igual", el botón dice "Es otro cono, crearlo igual", pide
//    confirmación ("¿Seguro que no es CASERATO?") y recién ahí manda
//    p_es_otro = true; "No" elige el que ya existe;
//  - el error de la base "Ya existe el cono X…" va tal cual y ofrece elegir ese;
//  - sin internet no se piden parecidos y crear anda como antes;
//  - una respuesta vieja no pisa a una nueva; XSS de lo que viene de la base.
//
//   node pruebas/test-produccion-conos-parecidos.js

const path = require('path')
const { arnes, leer, marca, chequearMarcas } = require('./circuito-comun')
const { construirProduccion } = require('./sandbox-produccion')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/produccion.html')
const FUENTE = leer(ARCHIVO)
console.log(`ARCHIVO ${ARCHIVO} (${FUENTE.length} bytes)`)
const { chk, esperas, fin } = arnes()

const CAT = {
  productos: [{ id: 'p-mini', nombre: 'Cucuruchón Mini', tipo_masa: 'Común' }],
  presentaciones: [{ id: 'pr-con', producto_id: 'p-mini', nombre: 'Caja con cono', con_cono: true, media_caja: false, unidades_por_caja: 320 }],
  marcas: [
    { id: 'mk-caserato', nombre: 'CASERATO', estado_alta: 'aprobada' },
    { id: 'mk-cassis', nombre: 'CASSIS', estado_alta: 'aprobada' },
  ],
  insumos: [],
}
const PARECIDOS = [
  { marca_id: 'mk-caserato', nombre: 'CASERATO', igual: true, similitud: 0.8 },
  { marca_id: 'mk-cassis', nombre: 'CASSIS', igual: false, similitud: 0.46 },
]
const YA_EXISTE = 'Ya existe el cono CASERATO: elegí ese. Si de verdad es otro cono, confirmalo.'

function armar() {
  const S = construirProduccion(ARCHIVO)
  S.estado.unidades = new Map([['u', 'Cucuruchos Nuss']])
  S.estado.unidadId = 'u'
  S.estado.misTareas = new Map([['cargar', { todas: true }]])
  S.estado.catalogo = { ...CAT, marcas: CAT.marcas.map(m => ({ ...m })) }
  S.estado.planilla = { items: [], turno: { id: 't' } }
  S.estado.agregar = { busqueda: '', marcaElegida: false, paso: 'cono' }
  S.__doc.getElementById('pr-agregar-cono-form').hidden = false
  return S
}
const el = (S, id) => S.__doc.getElementById(id)
const rpcs = (S, n) => S.__llamadas.rpc.filter(r => r[0] === n)
const json = (x) => JSON.stringify(x)
// La base falsa: conos_parecidos según lo escrito y proponer_marca que crea.
function base(S, { parecidos = PARECIDOS, proponer = { data: { marca_id: 'mk-nuevo', ya_existia: false }, error: null } } = {}) {
  S.__setRpc(async (n, p) => {
    if (n === 'conos_parecidos') return { data: String(p.p_nombre).trim().length >= 3 ? parecidos : [], error: null }
    if (n === 'proponer_marca') return typeof proponer === 'function' ? proponer(p) : proponer
    return { data: null, error: null }
  })
}
async function escribir(S, texto) {
  el(S, 'pr-agregar-cono-nombre').value = texto
  S.programarParecidos()
  await S.buscarParecidos()
}

// ── Lo puro ─────────────────────────────────────────────────────────────────
{
  const S = armar()
  chk('los parecidos de la base, limpios', json(S.listaParecidos(PARECIDOS)) === json([{ marca_id: 'mk-caserato', nombre: 'CASERATO', igual: true }, { marca_id: 'mk-cassis', nombre: 'CASSIS', igual: false }]))
  chk('sin datos o con basura: ninguno', json(S.listaParecidos(null)) === '[]' && json(S.listaParecidos([{ nombre: 'X' }, null])) === '[]')
  chk('el "igual" es el que tiene igual = true', S.parecidoIgual(S.listaParecidos(PARECIDOS)).nombre === 'CASERATO' && S.parecidoIgual([{ marca_id: 'a', nombre: 'A', igual: false }]) === null && S.parecidoIgual(null) === null)
  chk('del error de la base sale el nombre del cono que ya existe', S.conoQueYaExiste(YA_EXISTE) === 'CASERATO')
  chk('un nombre con dos puntos también', S.conoQueYaExiste('Ya existe el cono LA: ROSA: elegí ese. Si de verdad es otro cono, confirmalo.') === 'LA: ROSA')
  chk('otro error no es "ya existe"', S.conoQueYaExiste('Ese cono está marcado como rechazado. Hablalo con quien configura producción.') === null && S.conoQueYaExiste(null) === null)
  const h = S.htmlParecidos(S.listaParecidos(PARECIDOS))
  chk('"¿Quisiste decir…?" con un botón por parecido', /¿Quisiste decir…\?/.test(h) && /data-parecido="mk-caserato">CASERATO</.test(h) && /data-parecido="mk-cassis">CASSIS</.test(h))
  chk('sin parecidos, nada', S.htmlParecidos([]) === '' && S.htmlParecidos(null) === '')
  const y = S.htmlParecidos([], { nombre: 'CASERATO', marcaId: 'mk-caserato' })
  chk('después de "ya existe": "Elegir CASERATO" y "Es otro cono, crearlo igual"', /data-parecido="mk-caserato">Elegir CASERATO</.test(y) && /data-cono-es-otro>Es otro cono, crearlo igual</.test(y))
  chk('si no se sabe su id, solo "crearlo igual"', !/data-parecido/.test(S.htmlParecidos([], { nombre: 'X', marcaId: null })))
  chk('los botones son grandes, para el dedo (56 px)', /\.pr-ag__parecido \{ min-height: 56px;/.test(FUENTE))
  chk('espera 300 ms y pide 3 letras', S.ESPERA_PARECIDOS_MS === 300 && S.MIN_LETRAS_PARECIDOS === 3)
}

// ── Al escribir ─────────────────────────────────────────────────────────────
esperas.push((async () => {
  const S = armar()
  base(S)
  el(S, 'pr-agregar-cono-nombre').value = 'CASERATTO'
  S.programarParecidos()
  const t = S.__timeouts[S.__timeouts.length - 1]
  chk('escribir programa la búsqueda a los 300 ms (no llama en cada tecla)', t && t[1] === 300 && !rpcs(S, 'conos_parecidos').length)
  await t[0]()
  chk('a los 300 ms pide conos_parecidos con lo escrito', json(rpcs(S, 'conos_parecidos')[0]?.[1]) === json({ p_nombre: 'CASERATTO' }))
  const caja = el(S, 'pr-agregar-cono-parecidos')
  chk('muestra "¿Quisiste decir…?" con los parecidos', caja.hidden === false && /¿Quisiste decir…\?/.test(caja.innerHTML) && /CASERATO/.test(caja.innerHTML) && /CASSIS/.test(caja.innerHTML))
  chk('con uno igual, el botón dice "Es otro cono, crearlo igual"', el(S, 'pr-agregar-cono-confirmar').textContent === 'Es otro cono, crearlo igual')
  await escribir(S, 'ca')
  chk('con menos de 3 letras no llama y no muestra nada', rpcs(S, 'conos_parecidos').length === 1 && caja.hidden === true && caja.innerHTML === '')
  chk('y el botón vuelve a "Agregarlo"', el(S, 'pr-agregar-cono-confirmar').textContent === 'Agregarlo')
})())
esperas.push((async () => {
  const S = armar()
  base(S, { parecidos: [PARECIDOS[1]] })
  await escribir(S, 'CASSA')
  chk('solo parecidos (ninguno igual): el botón sigue "Agregarlo"', el(S, 'pr-agregar-cono-confirmar').textContent === 'Agregarlo' && /CASSIS/.test(el(S, 'pr-agregar-cono-parecidos').innerHTML))
  await S.crearConoNuevo()
  const r = rpcs(S, 'proponer_marca')
  chk('… y crear manda proponer_marca sin p_es_otro', r.length === 1 && json(r[0][1]) === json({ p_nombre: 'CASSA' }))
  chk('… y el cono nuevo queda elegido', S.estado.agregar.marcaId === 'mk-nuevo')
  chk('… y los parecidos se limpian', el(S, 'pr-agregar-cono-parecidos').hidden === true && el(S, 'pr-agregar-cono-form').hidden === true)
})())

// ── Elegir un parecido no crea nada ─────────────────────────────────────────
esperas.push((async () => {
  const S = armar()
  base(S)
  await escribir(S, 'CASERATTO')
  S.elegirParecido('mk-caserato')
  chk('tocar un parecido ELIGE ese cono', S.estado.agregar.marcaId === 'mk-caserato' && S.estado.agregar.marcaElegida === true)
  chk('… sin llamar a proponer_marca', !rpcs(S, 'proponer_marca').length)
  chk('… y cierra el formulario de cono nuevo, vacío', el(S, 'pr-agregar-cono-form').hidden === true && el(S, 'pr-agregar-cono-nombre').value === '')
})())
esperas.push((async () => {
  const S = armar()
  base(S, { parecidos: [{ marca_id: 'mk-viejo', nombre: 'CASERATO VIEJO', igual: false }] })
  await escribir(S, 'CASERATO V')
  S.elegirParecido('mk-viejo')
  chk('un parecido que no está en la tablet (dado de baja) no se elige: se dice', S.estado.agregar.marcaElegida === false &&
    /dado de baja/.test(el(S, 'pr-agregar-cono-error').textContent) && el(S, 'pr-agregar-cono-error').hidden === false)
})())

// ── "Igual" exige confirmación y manda p_es_otro ────────────────────────────
esperas.push((async () => {
  const S = armar()
  base(S, { proponer: { data: { marca_id: 'mk-caseratto', ya_existia: false }, error: null } })
  await escribir(S, 'CASERATTO')
  await S.crearConoNuevo()
  chk('con uno igual, crear NO llama a la base: pregunta', !rpcs(S, 'proponer_marca').length && !!S.estado.confirma)
  chk('"¿Seguro que no es CASERATO?"', S.estado.confirma.titulo === '¿Seguro que no es CASERATO?' && /Ya existe el cono CASERATO/.test(S.estado.confirma.texto))
  chk('con "Sí, es otro cono" y "No, elegir CASERATO"', S.estado.confirma.si === 'Sí, es otro cono' && S.estado.confirma.no === 'No, elegir CASERATO')
  await S.responderConfirma(true)
  const r = rpcs(S, 'proponer_marca')
  chk('al confirmar, manda p_es_otro = true', r.length === 1 && json(r[0][1]) === json({ p_nombre: 'CASERATTO', p_es_otro: true }), json(r))
  chk('… y el cono nuevo queda elegido', S.estado.agregar.marcaId === 'mk-caseratto')
})())
esperas.push((async () => {
  const S = armar()
  base(S)
  await escribir(S, 'CASERATTO')
  await S.crearConoNuevo()
  await S.responderConfirma(false)
  chk('"No, elegir CASERATO" elige el que ya existe, sin crear', S.estado.agregar.marcaId === 'mk-caserato' && !rpcs(S, 'proponer_marca').length)
})())
esperas.push((async () => {
  const S = armar()
  base(S)
  await escribir(S, 'CASERATTO')
  await S.crearConoNuevo()
  await S.responderConfirma(false, true)
  chk('tocar afuera solo cierra: ni crea ni elige', !rpcs(S, 'proponer_marca').length && S.estado.agregar.marcaElegida === false)
})())

// ── El error de la base, tal cual, y elegir ese ─────────────────────────────
esperas.push((async () => {
  const S = armar()
  // Sin internet al escribir: no hubo parecidos; la base frena al crear.
  base(S, { proponer: { data: null, error: { message: YA_EXISTE, code: 'P0001' } } })
  el(S, 'pr-agregar-cono-nombre').value = 'CASERATTO'
  await S.crearConoNuevo()
  chk('el error de la base TAL CUAL', el(S, 'pr-agregar-cono-error').textContent === YA_EXISTE && el(S, 'pr-agregar-cono-error').hidden === false)
  const caja = el(S, 'pr-agregar-cono-parecidos')
  chk('… y ofrece "Elegir CASERATO"', /data-parecido="mk-caserato">Elegir CASERATO</.test(caja.innerHTML) && caja.hidden === false)
  chk('… y "Es otro cono, crearlo igual"', /data-cono-es-otro/.test(caja.innerHTML))
  chk('… y el botón no queda trabado', el(S, 'pr-agregar-cono-confirmar').disabled === false)
  S.confirmarEsOtroCono(S.estadoParecidos().yaExiste.nombre, S.estadoParecidos().yaExiste.marcaId)
  chk('"crearlo igual" también pregunta', S.estado.confirma?.titulo === '¿Seguro que no es CASERATO?')
  S.__setRpc(async () => ({ data: { marca_id: 'mk-2', ya_existia: false }, error: null }))
  await S.responderConfirma(true)
  chk('… y confirmado manda p_es_otro', json(rpcs(S, 'proponer_marca').pop()[1]) === json({ p_nombre: 'CASERATTO', p_es_otro: true }))
})())
esperas.push((async () => {
  const S = armar()
  base(S, { proponer: { data: null, error: { message: YA_EXISTE, code: 'P0001' } } })
  el(S, 'pr-agregar-cono-nombre').value = 'CASERATTO'
  await S.crearConoNuevo()
  S.elegirParecido(S.estadoParecidos().yaExiste.marcaId)
  chk('"Elegir CASERATO" lo elige, sin crear nada', S.estado.agregar.marcaId === 'mk-caserato' && rpcs(S, 'proponer_marca').length === 1)
})())
esperas.push((async () => {
  const S = armar()
  base(S, { proponer: { data: null, error: { message: 'Ese cono está marcado como rechazado. Hablalo con quien configura producción.', code: 'P0001' } } })
  el(S, 'pr-agregar-cono-nombre').value = 'PROHIBIDO'
  await S.crearConoNuevo()
  chk('otro error de la base: tal cual y sin "Elegir"', /rechazado/.test(el(S, 'pr-agregar-cono-error').textContent) && !/Elegir/.test(el(S, 'pr-agregar-cono-parecidos').innerHTML))
})())

// ── Sin internet ────────────────────────────────────────────────────────────
esperas.push((async () => {
  const S = armar()
  base(S)
  S.__nav.onLine = false
  await escribir(S, 'CASERATTO')
  chk('sin internet no se piden parecidos', !rpcs(S, 'conos_parecidos').length && el(S, 'pr-agregar-cono-parecidos').hidden === true)
  chk('… y el botón dice lo de siempre', el(S, 'pr-agregar-cono-confirmar').textContent === 'Agregarlo')
  await S.crearConoNuevo()
  chk('… y crear se comporta como antes (sin preguntar, sin p_es_otro)', !S.estado.confirma && json(rpcs(S, 'proponer_marca')[0]?.[1]) === json({ p_nombre: 'CASERATTO' }))
})())
esperas.push((async () => {
  const S = armar()
  S.__setRpc(async (n) => n === 'conos_parecidos' ? { data: null, error: { message: 'Failed to fetch' } } : { data: { marca_id: 'mk-x', ya_existia: false }, error: null })
  await escribir(S, 'CASERATTO')
  chk('si la base no contesta los parecidos, no hay sugerencias', el(S, 'pr-agregar-cono-parecidos').hidden === true)
  await S.crearConoNuevo()
  chk('… y crear anda igual', rpcs(S, 'proponer_marca').length === 1 && S.estado.agregar.marcaId === 'mk-x')
})())

// ── Una respuesta vieja no pisa a una nueva ─────────────────────────────────
esperas.push((async () => {
  const S = armar()
  const pendientes = []
  S.__setRpc((n, p) => new Promise(r => pendientes.push(() => r({ data: p.p_nombre === 'CASERATTO' ? PARECIDOS : [PARECIDOS[1]], error: null }))))
  el(S, 'pr-agregar-cono-nombre').value = 'CASERATTO'
  const v1 = S.buscarParecidos()
  el(S, 'pr-agregar-cono-nombre').value = 'CASSA'
  const v2 = S.buscarParecidos()
  pendientes[1]()
  await v2
  pendientes[0]()
  await v1
  chk('la respuesta vieja (CASERATTO) no pisa la nueva (CASSA)', !/CASERATO/.test(el(S, 'pr-agregar-cono-parecidos').innerHTML) && /CASSIS/.test(el(S, 'pr-agregar-cono-parecidos').innerHTML))
})())

// ── Las conexiones ─────────────────────────────────────────────────────────
chk('escribir el nombre programa la búsqueda', /getElementById\('pr-agregar-cono-nombre'\)\.addEventListener\('input', \(\) => programarParecidos\(\)\)/.test(FUENTE))
chk('tocar un parecido lo elige', /const b = ev\.target\.closest\('\[data-parecido\]'\); if \(b\) return elegirParecido\(b\.dataset\.parecido\)/.test(FUENTE))
chk('el botón de crear no recibe el evento como opciones', /getElementById\('pr-agregar-cono-confirmar'\)\.addEventListener\('click', \(\) => crearConoNuevo\(\)\)/.test(FUENTE))

// ── XSS ────────────────────────────────────────────────────────────────────
{
  const S = armar()
  const h = S.htmlParecidos([{ marca_id: marca('id'), nombre: marca('nombre'), igual: true }], { nombre: marca('ya'), marcaId: marca('id-ya') })
  chequearMarcas(chk, 'los parecidos', h, ['id', 'nombre', 'ya', 'id-ya'])
}

fin()
