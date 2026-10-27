// SUBIR REMITOS ROSARIO (27/10/2026, rama ci-prueba/remitos-rosario-subir).
// En Rosario (Dolce Pasta) el remito se hace a mano y se le saca una foto en
// la Carga; la IA (ocr-remito) lo lee y Administración revisa la precarga. Lo
// que se prueba, con las funciones REALES de modulos/retiros.html:
//  - quién ve el botón: retiros:cargar (con alcance) en una fábrica con
//    controla_stock_terminado = false; sin eso (o en Nuss/Mengui) no aparece;
//    con varias, se elige cuál; la fábrica de pruebas no cuenta;
//  - la foto: achicada a 1600 px en JPEG 0,82 y subida a
//    comprobantes/<auth.uid>/remitos/<uuid>.jpg;
//  - crear_remito_precarga con un client_uuid por foto que se REUSA en cada
//    reintento (también después de recargar la página);
//  - ocr-remito sin esperar: la cola sigue con la próxima foto, de a dos
//    lecturas a la vez;
//  - "Mis remitos subidos": lo que se lee, el orden, cada estado (y el sello
//    "Acopio"), Reintentar, el sondeo y el escape de lo que viene de la base.
//
//   node pruebas/test-retiros-subir-remitos.js
//   ARCHIVO_TEST=<copia de modulos/retiros.html> node pruebas/test-retiros-subir-remitos.js
'use strict'

const path = require('path')
const { construirRetiros } = require('./sandbox-retiros')
const { arnes, leer, marca, escapada } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/retiros.html')
const FUENTE = leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

const FUNCIONES = [
  'datosRemitos', 'fabricaRemitos', 'elegirFabricaRemitos', 'abrirSubirRemitos', 'volverDeRemitos',
  'rutaFotoRemito', 'medidasAchicadas', 'cargarImagenRemito', 'achicarFoto', 'urlLocalDeFoto',
  'itemColaRemito', 'guardarColaRemitos', 'leerColaRemitos', 'fotosElegidas', 'encolarFotos', 'procesarCola',
  'yaEstabaSubida', 'textoErrorRemito', 'procesarRemito', 'lanzarLectura', 'seguirLecturas', 'leerRemitoConIa',
  'reintentarRemito', 'quitarRemitoDeCola', 'leerMisRemitos', 'pedirMiniaturas', 'urlMiniaturaSegura',
  'fechaHoraRemito', 'numeroLeido', 'estadoRemitoSubido', 'estadoRemitoEnCola', 'remitosParaMostrar',
  'htmlRemitoSubido', 'htmlMisRemitos', 'htmlFabricaRemitos', 'textoColaRemitos', 'pintarRemitos',
  'hayRemitosLeyendo', 'programarSondeo',
]
const CONSTANTES = [
  'LADO_MAXIMO_FOTO', 'CALIDAD_FOTO', 'DIAS_MIS_REMITOS', 'SONDEO_REMITOS_MS', 'LECTURAS_A_LA_VEZ', 'LECTURA_TRABADA_MS',
  'SEGUNDOS_MINIATURA', 'CLAVE_REMITOS_COLA', 'CLAVE_REMITOS_FABRICA', 'TEXTO_FOTO_PERDIDA', 'ICONO_REMITO',
]

// Storage, Edge Functions, el lienzo y createImageBitmap: dobles que anotan.
// Se manejan desde la suite con __llamadas.ctl (el sandbox devuelve __llamadas).
const EXTRA = `
  __llamadas.subidas = []; __llamadas.firmas = []; __llamadas.invocaciones = []; __llamadas.jpeg = []
  var __subir = () => ({ data: { path: 'ok' }, error: null })
  var __firmar = (p) => ({ data: { signedUrl: 'https://xtor.supabase.co/storage/v1/object/sign/comprobantes/' + p + '?token=t' }, error: null })
  var __invocar = () => Promise.resolve({ data: { ok: true }, error: null })
  supabase.storage = { from(bucket) { return {
    upload(ruta, blob, op) { __llamadas.subidas.push([bucket, ruta, blob, op]); return Promise.resolve(__subir(bucket, ruta, blob, op)) },
    createSignedUrl(p, s) { __llamadas.firmas.push([bucket, p, s]); return Promise.resolve(__firmar(p)) },
  } } }
  supabase.functions = { invoke(n, op) { __llamadas.invocaciones.push([n, JSON.parse(JSON.stringify(op))]); return __invocar(n, op) } }
  var __bitmapFalla = false
  var createImageBitmap = async (a) => { if (__bitmapFalla || !a || !a.ancho) throw new Error('no se puede abrir'); return { width: a.ancho, height: a.alto, close() {} } }
  class URL extends globalThis.URL {}
  URL.createObjectURL = (b) => 'blob:http://localhost/' + ((b && b.nombre) || 'foto')
  URL.revokeObjectURL = () => {}
  var __crearEl = document.createElement
  document.createElement = (tag) => tag !== 'canvas' ? __crearEl(tag) : {
    width: 0, height: 0,
    getContext() { return { drawImage() {} } },
    toBlob(cb, tipo, calidad) { __llamadas.jpeg.push([this.width, this.height, tipo, calidad]); cb({ type: tipo, size: 1000, ancho: this.width, alto: this.height, nombre: 'achicada' }) },
  }
  var __timers = []
  function setTimeout(f, ms) { __timers.push([f, ms]); return __timers.length }
  __llamadas.ctl = {
    subir(f) { __subir = f }, firmar(f) { __firmar = f }, invocar(f) { __invocar = f },
    bitmapFalla(v) { __bitmapFalla = v }, timers: __timers,
  }
`

function armar({ tareas, sinControl = ['u-d'], empresas = null, rol = 'usuario', ls = null } = {}) {
  const S = construirRetiros(ARCHIVO, { funciones: FUNCIONES, constantes: CONSTANTES, preludioExtra: EXTRA })
  S.estado.miRolApp = rol
  S.estado.misTareas = new Map(tareas ?? [['retiros:cargar', { todas: true }]])
  if (empresas) S.estado.empresas = empresas
  S.estado.sinControlIds = new Set(sinControl)
  if (ls) for (const [k, v] of ls) S.__ls.set(k, v)
  return S
}
const ctl = (S) => S.__llamadas.ctl
const asentar = async () => { for (let i = 0; i < 60; i++) await new Promise(r => setImmediate(r)) }
const foto = (nombre = 'r.jpg', ancho = 4000, alto = 3000) => ({ type: 'image/jpeg', ancho, alto, nombre })
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}'
const hace = (min) => new Date(Date.now() - min * 60000).toISOString()
const crearLlamadas = (S) => S.__llamadas.rpc.filter(r => r[0] === 'crear_remito_precarga')
const nunca = () => new Promise(() => {})

const DOLCE = { id: 'u-d', nombre: 'Dolce Pasta', prefijo: 'D' }
const NUSS = { id: 'u-n', nombre: 'Cucuruchos Nuss', prefijo: 'N' }
const DOLCE2 = { id: 'u-d2', nombre: 'Dolce Pasta Centro', prefijo: 'E' }
const PRUEBA = { id: 'u-p', nombre: 'Fábrica de pruebas', prefijo: 'P' }

// ═══ Quién ve el botón ═════════════════════════════════════════════════════
{
  const S = armar()
  chk('con retiros:cargar en todas y Dolce sin control: el botón es de Dolce', S.fabricasRemitos().map(e => e.id).join() === 'u-d' && S.puedeSubirRemitos())
}
{
  const S = armar({ tareas: [['retiros:cargar', { unidades: ['u-n'] }]] })
  chk('cargar solo en Nuss (Dolce sin control, pero no carga ahí): no hay botón', !S.puedeSubirRemitos())
}
{
  const S = armar({ tareas: [['retiros:cargar', { unidades: ['u-d'] }]] })
  chk('cargar con alcance en Dolce: hay botón', S.puedeSubirRemitos())
}
{
  const S = armar({ tareas: [['retiros:ver', { todas: true }]] })
  chk('solo retiros:ver: no hay botón', !S.puedeSubirRemitos())
}
{
  const S = armar({ tareas: [], rol: 'super_admin' })
  chk('super_admin (como tiene_tarea_alcance): hay botón', S.puedeSubirRemitos())
}
{
  const S = armar({ sinControl: [] })
  chk('todas con control (Nuss, Mengui): no hay botón', !S.puedeSubirRemitos())
  S.estado.sinControlIds = null
  chk('sin saber todavía qué fábricas controlan: no hay botón', !S.puedeSubirRemitos())
}
{
  const S = armar({ sinControl: ['u-p'], empresas: [NUSS, PRUEBA] })
  S.estado.fabrica = { ok: true, unidades: new Set(['u-p']), personas: new Set(), soyDePrueba: false }
  chk('la fábrica de pruebas no cuenta para una cuenta real', !S.puedeSubirRemitos())
}

// leerFabricasSinControl: controla_stock_terminado de las fábricas donde carga.
for (const [filas, error, esperado, nombre] of [
  [[{ id: 'u-n', controla_stock_terminado: true }, { id: 'u-d', controla_stock_terminado: false }], null, 'u-d', 'false → sin control'],
  [[{ id: 'u-d', controla_stock_terminado: null }], null, '', 'null → con control'],
  [[{ id: 'u-x', controla_stock_terminado: false }], null, '', 'una fábrica donde no carga no cuenta'],
  [null, { message: 'x' }, '', 'si no se puede leer → ninguna'],
]) {
  esperas.push((async () => {
    const S = armar({ sinControl: [] })
    S.__tablas.unidades_negocio = () => ({ data: filas, error })
    await S.leerFabricasSinControl()
    chk(`leerFabricasSinControl: ${nombre}`, [...S.estado.sinControlIds].join() === esperado, [...S.estado.sinControlIds].join())
    const q = S.__llamadas.consultas.find(c => c[0] === 'unidades_negocio')
    chk(`leerFabricasSinControl (${nombre}): pide controla_stock_terminado de las fábricas donde carga`,
      !!q && q[1].some(f => f[0] === 'select' && /controla_stock_terminado/.test(f[1])) && q[1].some(f => f[0] === 'in' && f[1] === 'id' && f[2].join() === 'u-n,u-d'))
  })())
}

// El botón de entrada, con la llamada real de pintarEncabezado().
{
  const S = armar()
  const entrada = () => S.__els.get('rt-remitos-entrada')
  for (const [vista, paso, visible] of [
    ['rt-vista-empresa', null, true], ['rt-vista-mis', null, true], ['rt-vista-form', 'cliente', true],
    ['rt-vista-form', 'orden', false], ['rt-vista-form', 'productos', false], ['rt-vista-resumen', null, false],
    ['rt-vista-hecho', null, false], ['rt-vista-remitos', null, false],
  ]) {
    S.pintarEntradaRemitos(vista, paso)
    chk(`la entrada en ${vista}${paso ? ' · ' + paso : ''}: ${visible ? 'se ve' : 'no se ve'}`, entrada().hidden === !visible)
  }
  S.estado.vista = 'rt-vista-mis'
  S.pintarEncabezado()
  chk('pintarEncabezado() prende la entrada', entrada().hidden === false)
  S.estado.sinControlIds = new Set()
  S.pintarEncabezado()
  chk('pintarEncabezado() sin fábrica sin control la apaga', entrada().hidden === true)
  S.estado.vista = 'rt-vista-remitos'
  S.estado.sinControlIds = new Set(['u-d'])
  S.pintarEncabezado()
  chk('en la pantalla de remitos, la flecha vuelve a la carga (no al inicio)', S.__els.get('rt-remitos-volver').hidden === false && S.__els.get('rt-atras-inicio').hidden === true)
  chk('el título de la pantalla', S.__els.get('rt-subtitulo').textContent === 'Subir remitos')
}
esperas.push((async () => {
  // abrirSubirRemitos: solo con una fábrica sin control.
  const S = armar({ sinControl: [] })
  S.abrirSubirRemitos()
  chk('sin fábrica sin control, abrirSubirRemitos no abre nada', S.estado.vista !== 'rt-vista-remitos')
  S.estado.sinControlIds = new Set(['u-d'])
  S.__tablas.remitos_precarga = []
  S.abrirSubirRemitos()
  await asentar()
  chk('con Dolce sin control, abre la pantalla y lee mis remitos', S.estado.vista === 'rt-vista-remitos' && S.__llamadas.consultas.some(c => c[0] === 'remitos_precarga'))
  chk('una sola fábrica: lo dice, sin preguntar', /Los remitos van a <strong>Dolce Pasta<\/strong>/.test(S.__els.get('rt-remitos-fabrica').innerHTML) && S.__els.get('rt-remitos-camara').disabled === false)
})())

// Varias fábricas sin control: se elige.
{
  const S = armar({ sinControl: ['u-d', 'u-d2'], empresas: [NUSS, DOLCE, DOLCE2] })
  chk('con dos fábricas sin control y ninguna elegida, no hay fábrica', S.fabricaRemitos() === null)
  const html = S.htmlFabricaRemitos()
  chk('se pregunta de qué fábrica son, con un botón por fábrica', /¿De qué fábrica son los remitos\?/.test(html) && html.includes('data-remito-fabrica="u-d"') && html.includes('data-remito-fabrica="u-d2"') && !html.includes('data-remito-fabrica="u-n"'))
  chk('sin elegir: ningún botón marcado y la pista', !html.includes('aria-pressed="true"') && /Elegí la fábrica antes de sacar la foto/.test(html))
  chk('sin elegir no se encola ninguna foto', S.encolarFotos([foto()]) === 0 && S.__llamadas.errores.some(e => /Elegí de qué fábrica/.test(e)) && S.datosRemitos().cola.length === 0)
  S.estado.vista = 'rt-vista-remitos'
  S.pintarRemitos()
  chk('sin elegir, la cámara y la galería quedan apagadas', S.__els.get('rt-remitos-camara').disabled === true && S.__els.get('rt-remitos-galeria').disabled === true)
  S.elegirFabricaRemitos('u-n')
  chk('una fábrica con control no se puede elegir', S.fabricaRemitos() === null)
  S.elegirFabricaRemitos('u-d2')
  chk('elegida Dolce Centro: queda esa y se recuerda', S.fabricaRemitos()?.id === 'u-d2' && S.__ls.get(S.CLAVE_REMITOS_FABRICA) === 'u-d2')
  chk('la elegida queda marcada', S.htmlFabricaRemitos().includes('data-remito-fabrica="u-d2" aria-pressed="true"'))
  chk('elegida, la cámara se prende', S.__els.get('rt-remitos-camara').disabled === false)
}
{
  const S = armar({ sinControl: ['u-d', 'u-d2'], empresas: [NUSS, DOLCE, DOLCE2] })
  S.estado.unidadBarra = 'u-d2'
  chk('con dos, la de la barra de arriba', S.fabricaRemitos()?.id === 'u-d2')
}
{
  const S = armar({ sinControl: ['u-d', 'u-d2'], empresas: [NUSS, DOLCE, DOLCE2], ls: [['retiros.remitos.fabrica', 'u-d']] })
  chk('con dos, la última que se usó', S.fabricaRemitos()?.id === 'u-d')
}

// ═══ La ruta y el achicado ═════════════════════════════════════════════════
{
  const S = armar()
  chk('la ruta: <uid>/remitos/<uuid>.jpg', S.rutaFotoRemito('uid-1', 'abc') === 'uid-1/remitos/abc.jpg')
  const it = S.itemColaRemito(foto(), 'u-d', 'uid-1')
  chk('cada foto: la ruta con un uuid nuevo, como la exige crear_remito_precarga', new RegExp(`^uid-1/remitos/${UUID}\\.jpg$`).test(it.ruta) && /^uid-1\/remitos\/[^/]+$/.test(it.ruta) && !/\.\./.test(it.ruta), it.ruta)
  chk('cada foto: su client_uuid (distinto del archivo)', new RegExp(`^${UUID}$`).test(it.clientUuid) && !it.ruta.includes(it.clientUuid))
  const otra = S.itemColaRemito(foto(), 'u-d', 'uid-1')
  chk('dos fotos: dos client_uuid y dos rutas', otra.clientUuid !== it.clientUuid && otra.ruta !== it.ruta)
  const m = (a, b) => JSON.stringify(S.medidasAchicadas(a, b))
  chk('achicar: 4000×3000 → 1600×1200', m(4000, 3000) === '{"ancho":1600,"alto":1200}')
  chk('achicar: 3000×4000 (parada) → 1200×1600', m(3000, 4000) === '{"ancho":1200,"alto":1600}')
  chk('achicar: 1601×900 → 1600×899', m(1601, 900) === '{"ancho":1600,"alto":899}')
  chk('achicar: una más chica queda como está', m(1200, 900) === '{"ancho":1200,"alto":900}' && m(1600, 1600) === '{"ancho":1600,"alto":1600}')
  chk('achicar: sin medidas → null', S.medidasAchicadas(0, 900) === null && S.medidasAchicadas(800, null) === null)
  chk('el tope es 1600 y la calidad 0,82', S.LADO_MAXIMO_FOTO === 1600 && S.CALIDAD_FOTO === 0.82)
}
esperas.push((async () => {
  const S = armar()
  const b = await S.achicarFoto(foto('grande.jpg', 4032, 3024))
  chk('achicarFoto: arma un JPEG de 1600×1200 con calidad 0,82', JSON.stringify(S.__llamadas.jpeg[0]) === '[1600,1200,"image/jpeg",0.82]' && b.type === 'image/jpeg' && b.ancho === 1600, JSON.stringify(S.__llamadas.jpeg))
  const original = foto('raro.heic', 0, 0)
  const igual = await S.achicarFoto(original)
  chk('achicarFoto: si no se puede abrir, va la foto como vino', igual === original)
})())

// ═══ La cola: subir, registrar, leer ═══════════════════════════════════════
esperas.push((async () => {
  const S = armar()
  S.estado.vista = 'rt-vista-remitos'
  S.__setRpc(async (n) => n === 'crear_remito_precarga' ? { data: 'rp-1', error: null } : { data: null, error: null })
  S.encolarFotos([foto('a.jpg')])
  const item = S.datosRemitos().cola[0]
  await asentar()
  const sub = S.__llamadas.subidas[0]
  chk('sube al bucket comprobantes, en la ruta de la foto', sub && sub[0] === 'comprobantes' && sub[1] === item.ruta && new RegExp(`^uid-1/remitos/${UUID}\\.jpg$`).test(sub[1]))
  chk('sube la foto ACHICADA, como JPEG y sin pisar', sub && sub[2].ancho === 1600 && sub[3].contentType === 'image/jpeg' && sub[3].upsert === false)
  const c = crearLlamadas(S)
  chk('crear_remito_precarga con la fábrica, la ruta y el client_uuid de la foto', c.length === 1 &&
    JSON.stringify(c[0][1]) === JSON.stringify({ p_unidad_negocio_id: 'u-d', p_foto_path: item.ruta, p_client_uuid: item.clientUuid }))
  chk('después pide la lectura a ocr-remito con el id', JSON.stringify(S.__llamadas.invocaciones[0]) === JSON.stringify(['ocr-remito', { body: { remito_id: 'rp-1' } }]))
  chk('al volver la lectura, se vuelve a leer la lista', S.__llamadas.consultas.filter(q => q[0] === 'remitos_precarga').length >= 1)
  chk('la fábrica usada queda recordada', S.__ls.get(S.CLAVE_REMITOS_FABRICA) === 'u-d')
})())

// ocr-remito NO se espera: la cola sigue, de a dos lecturas a la vez.
esperas.push((async () => {
  const S = armar()
  let n = 0
  S.__setRpc(async (nombre) => nombre === 'crear_remito_precarga' ? { data: `rp-${++n}`, error: null } : { data: null, error: null })
  const pendientes = []
  ctl(S).invocar(() => new Promise(res => pendientes.push(res)))
  S.encolarFotos([foto('1.jpg'), foto('2.jpg'), foto('3.jpg')])
  chk('encolar no espera nada: vuelve enseguida con las tres en la cola', S.datosRemitos().cola.length === 3)
  await asentar()
  chk('con la IA leyendo (sin responder), igual se suben y se registran las tres', S.__llamadas.subidas.length === 3 && crearLlamadas(S).length === 3)
  chk('de a dos lecturas a la vez: la tercera espera', S.__llamadas.invocaciones.length === 2 && S.datosRemitos().lecturas.length === 1)
  chk('"Subiendo…" ya no; "La IA está leyendo 3 remitos"', /La IA está leyendo 3 remitos\. Podés seguir sacando fotos\./.test(S.textoColaRemitos()), S.textoColaRemitos())
  pendientes[0]({ data: { ok: true }, error: null })
  await asentar()
  chk('cuando vuelve una lectura, arranca la que esperaba', S.__llamadas.invocaciones.length === 3 && S.__llamadas.invocaciones[2][1].body.remito_id === 'rp-3')
})())
esperas.push((async () => {
  // Con una lectura que nunca vuelve, una foto nueva igual se sube.
  const S = armar()
  S.__setRpc(async () => ({ data: 'rp-x', error: null }))
  ctl(S).invocar(nunca)
  S.encolarFotos([foto('1.jpg')])
  await asentar()
  S.encolarFotos([foto('2.jpg')])
  await asentar()
  chk('una lectura colgada no traba la próxima foto', S.__llamadas.subidas.length === 2 && crearLlamadas(S).length === 2)
})())

// Reintentar: el MISMO client_uuid.
esperas.push((async () => {
  const S = armar()
  S.estado.vista = 'rt-vista-remitos'
  let falla = true
  S.__setRpc(async (n) => n !== 'crear_remito_precarga' ? { data: null, error: null }
    : falla ? { data: null, error: { message: 'TypeError: Failed to fetch' } } : { data: 'rp-9', error: null })
  S.encolarFotos([foto('a.jpg')])
  await asentar()
  const item = S.datosRemitos().cola[0]
  chk('si crear_remito_precarga falla: la foto queda con su error y "Reintentar"', !!item.error && item.paso === 'crear' &&
    S.estadoRemitoEnCola(item).reintentar === true && S.estadoRemitoEnCola(item).texto === 'No se pudo registrar')
  chk('sin señal lo dice así', /Sin señal/.test(item.error))
  const html = S.__els.get('rt-remitos-lista').innerHTML
  chk('la lista muestra "No se pudo registrar" con Reintentar', /No se pudo registrar/.test(html) && html.includes(`data-remito-reintentar="${item.clientUuid}"`))
  const guardada = JSON.parse(S.__ls.get(S.CLAVE_REMITOS_COLA))
  chk('la foto subida queda guardada para una recarga, con su client_uuid', guardada.length === 1 && guardada[0].clientUuid === item.clientUuid && guardada[0].paso === 'crear' && guardada[0].ruta === item.ruta)
  falla = false
  S.reintentarRemito(item.clientUuid)
  await asentar()
  const c = crearLlamadas(S)
  chk('el reintento usa el MISMO client_uuid y la misma ruta', c.length === 2 && c[1][1].p_client_uuid === c[0][1].p_client_uuid && c[1][1].p_foto_path === c[0][1].p_foto_path)
  chk('el reintento no vuelve a subir la foto', S.__llamadas.subidas.length === 1)
  chk('registrado: se pide la lectura y la cola guardada se vacía', S.__llamadas.invocaciones.some(i => i[1].body.remito_id === 'rp-9') && !S.__ls.has(S.CLAVE_REMITOS_COLA))
})())
esperas.push((async () => {
  const S = armar()
  let falla = true
  ctl(S).subir(() => falla ? { data: null, error: { message: 'Failed to fetch' } } : { data: { path: 'ok' }, error: null })
  S.__setRpc(async () => ({ data: 'rp-2', error: null }))
  S.encolarFotos([foto('a.jpg')])
  await asentar()
  const item = S.datosRemitos().cola[0]
  chk('si falla la subida: "No se pudo subir" y no se registra', item.paso === 'subir' && S.estadoRemitoEnCola(item).texto === 'No se pudo subir' && crearLlamadas(S).length === 0)
  falla = false
  S.reintentarRemito(item.clientUuid)
  await asentar()
  chk('el reintento de la subida: la MISMA ruta y después el client_uuid de la foto', S.__llamadas.subidas.length === 2 && S.__llamadas.subidas[1][1] === S.__llamadas.subidas[0][1] &&
    crearLlamadas(S).length === 1 && crearLlamadas(S)[0][1].p_client_uuid === item.clientUuid)
})())
esperas.push((async () => {
  // Una foto que SÍ había llegado (se cortó la respuesta): la base dice que ya existe.
  const S = armar()
  ctl(S).subir(() => ({ data: null, error: { statusCode: '409', message: 'The resource already exists' } }))
  S.__setRpc(async () => ({ data: 'rp-3', error: null }))
  S.encolarFotos([foto()])
  await asentar()
  chk('"ya existe" al subir cuenta como subida', crearLlamadas(S).length === 1)
  chk('yaEstabaSubida: solo el 409 o "already exists"', S.yaEstabaSubida({ statusCode: 409 }) && S.yaEstabaSubida({ message: 'Duplicate' }) && !S.yaEstabaSubida({ statusCode: 403, message: 'new row violates row-level security policy' }))
})())
esperas.push((async () => {
  // Después de recargar la página: lo que ya estaba subido se registra con el MISMO client_uuid.
  const guardada = JSON.stringify([
    { clientUuid: 'cu-1', unidadId: 'u-d', ruta: 'uid-1/remitos/f1.jpg', paso: 'crear', error: 'Sin señal', creadoEn: hace(2) },
    { clientUuid: 'cu-2', unidadId: 'u-d', ruta: 'uid-1/remitos/f2.jpg', paso: 'subir', error: null, creadoEn: hace(2) },
  ])
  const S = armar({ ls: [['retiros.remitos.cola', guardada]] })
  const cola = S.datosRemitos().cola
  chk('recargada: la subida vuelve a "registrar"', cola[0].paso === 'crear' && cola[0].clientUuid === 'cu-1')
  chk('recargada: la que no llegó a subirse se perdió y se puede quitar', cola[1].paso === 'perdida' && cola[1].error === S.TEXTO_FOTO_PERDIDA &&
    S.estadoRemitoEnCola(cola[1]).quitar === true && !S.estadoRemitoEnCola(cola[1]).reintentar)
  S.__setRpc(async () => ({ data: 'rp-4', error: null }))
  cola[0].error = null
  await S.procesarCola()
  await asentar()
  chk('recargada: crear_remito_precarga con el client_uuid guardado', crearLlamadas(S).length === 1 && crearLlamadas(S)[0][1].p_client_uuid === 'cu-1' && crearLlamadas(S)[0][1].p_foto_path === 'uid-1/remitos/f1.jpg')
  chk('recargada: la perdida no se intenta', S.__llamadas.subidas.length === 0)
  S.reintentarRemito('cu-2')
  chk('la perdida no tiene reintento', crearLlamadas(S).length === 1)
  S.quitarRemitoDeCola('cu-2')
  chk('"Quitar" la saca de la cola', !S.datosRemitos().cola.some(i => i.clientUuid === 'cu-2'))
  const S2 = armar({ ls: [['retiros.remitos.cola', '{roto']] })
  chk('una cola guardada rota no rompe nada', S2.datosRemitos().cola.length === 0)
})())

// fotosElegidas: solo imágenes, y el campo queda listo para la siguiente.
{
  const S = armar()
  S.__setRpc(async () => ({ data: null, error: null }))
  ctl(S).invocar(nunca)
  const input = { files: [foto('a.jpg'), { type: 'application/pdf', nombre: 'x.pdf' }], value: 'C:\\fakepath\\a.jpg' }
  const n = S.fotosElegidas(input)
  chk('de lo elegido, solo las fotos', n === 1 && S.datosRemitos().cola.length === 1)
  chk('el campo se vacía (se puede sacar otra igual)', input.value === '')
}

// ═══ La lectura que falla y Reintentar ═════════════════════════════════════
esperas.push((async () => {
  const S = armar()
  S.estado.vista = 'rt-vista-remitos'
  S.__tablas.remitos_precarga = () => ({ data: [{ id: 'rp-5', estado: 'leyendo', subido_en: hace(1), foto_path: 'uid-1/remitos/5.jpg' }], error: null })
  ctl(S).invocar(async () => ({ data: null, error: { message: 'Edge Function returned a non-2xx status code' } }))
  S.lanzarLectura('rp-5')
  await asentar()
  const f = S.datosRemitos().filas[0]
  const e = S.estadoRemitoSubido(f)
  chk('si ocr-remito falla y la base sigue en "leyendo": "No se pudo leer" con Reintentar', e.tipo === 'error' && e.texto === 'No se pudo leer' && e.reintentar === true && /non-2xx/.test(e.detalle))
  ctl(S).invocar(nunca)
  S.reintentarRemito('rp-5')
  chk('Reintentar vuelve a llamar a ocr-remito con el mismo remito', S.__llamadas.invocaciones.length === 2 && S.__llamadas.invocaciones[1][1].body.remito_id === 'rp-5')
  chk('mientras relee: "Leyendo…"', S.estadoRemitoSubido(f).texto === 'Leyendo…')
  const ok = armar()
  ctl(ok).invocar(async () => ({ data: { error: 'No se ve el número' }, error: null }))
  ok.__tablas.remitos_precarga = []
  await ok.leerRemitoConIa('rp-6')
  chk('una respuesta con "error" también es una lectura fallida', ok.datosRemitos().lecturaFallida.get('rp-6') === 'No se ve el número')
})())

// ═══ Mis remitos subidos ═══════════════════════════════════════════════════
esperas.push((async () => {
  const S = armar()
  S.estado.vista = 'rt-vista-remitos'
  S.__tablas.remitos_precarga = () => ({ data: [
    { id: 'r-viejo', estado: 'precargada', subido_en: hace(300), numero_remito: '0001-00003100', talonario: 'oficial', foto_path: 'uid-1/remitos/v.jpg' },
    { id: 'r-nuevo', estado: 'leyendo', subido_en: hace(1), foto_path: 'uid-1/remitos/n.jpg' },
    { id: 'r-medio', estado: 'confirmada', subido_en: hace(60), numero_remito: '977492', talonario: 'acopio', orden_id: 'o-1', orden: { codigo: 'D-0012' }, foto_path: 'uid-1/remitos/m.jpg' },
  ], error: null })
  await S.leerMisRemitos()
  const q = S.__llamadas.consultas.find(c => c[0] === 'remitos_precarga')[1]
  chk('lee SOLO los míos (subido_por = mi empleado)', q.some(f => f[0] === 'eq' && f[1] === 'subido_por' && f[2] === 'emp-1'))
  const desde = q.find(f => f[0] === 'gte' && f[1] === 'subido_en')
  const dias = desde ? (Date.now() - Date.parse(desde[2])) / 86400000 : null
  chk('de los últimos 7 días', dias !== null && Math.abs(dias - 7) < 0.01, String(dias))
  const sel = q.find(f => f[0] === 'select')?.[1] ?? ''
  chk('trae el estado, el N° leído, el talonario, el error y el motivo', ['estado', 'numero_remito', 'talonario', 'error', 'descartado_motivo', 'foto_path', 'subido_en'].every(c => new RegExp(`\\b${c}\\b`).test(sel)))
  chk('el código de la orden, embebido por la FK orden_id (nombrada: hay dos caminos)', /ordenes_retiro!remitos_precarga_orden_id_fkey\(codigo\)/.test(sel))
  chk('más nuevo primero', S.datosRemitos().filas.map(f => f.id).join() === 'r-nuevo,r-medio,r-viejo')
  const html = S.__els.get('rt-remitos-lista').innerHTML
  chk('la lista en ese orden', html.indexOf('data-remito="r-nuevo"') < html.indexOf('data-remito="r-medio"') && html.indexOf('data-remito="r-medio"') < html.indexOf('data-remito="r-viejo"'))
  chk('la cuenta', S.__els.get('rt-remitos-cuenta').textContent === '3')
  chk('pide una miniatura firmada por foto, por una hora', S.__llamadas.firmas.length === 3 && S.__llamadas.firmas.every(f => f[0] === 'comprobantes' && f[2] === 3600) && S.__llamadas.firmas.some(f => f[1] === 'uid-1/remitos/n.jpg'))
  await asentar()
  // La miniatura va por el DOM, nunca en el HTML.
  const img = { dataset: { remitoMiniatura: 'r-nuevo' }, src: '' }
  S.__els.get('rt-remitos-lista').querySelectorAll = (sel2) => sel2 === 'img[data-remito-miniatura]' ? [img] : []
  S.pintarRemitos()
  const html2 = S.__els.get('rt-remitos-lista').innerHTML
  chk('con miniatura: una <img> sin src en el HTML', html2.includes('<img class="rt-remito__foto" data-remito-miniatura="r-nuevo"') && !/src=/.test(html2))
  chk('el src se lo pone pintarRemitos() con el link firmado', img.src === 'https://xtor.supabase.co/storage/v1/object/sign/comprobantes/uid-1/remitos/n.jpg?token=t')
  chk('una vez pedida, la miniatura no se vuelve a pedir', (await S.leerMisRemitos(), S.__llamadas.firmas.length === 3))
  chk('hay "Leyendo…": se programa el sondeo de 6 segundos', ctl(S).timers.some(t => t[1] === 6000))
})())
esperas.push((async () => {
  const S = armar()
  S.estado.vista = 'rt-vista-remitos'
  S.__tablas.remitos_precarga = () => ({ data: null, error: { message: 'x' } })
  await S.leerMisRemitos()
  chk('si no se puede leer: lo dice', /No se pudieron leer tus remitos subidos/.test(S.__els.get('rt-remitos-lista').innerHTML))
  S.__tablas.remitos_precarga = []
  await S.leerMisRemitos()
  chk('sin remitos: lo dice', /Todavía no subiste remitos en los últimos 7 días/.test(S.__els.get('rt-remitos-lista').innerHTML))
  chk('sin nada leyéndose, no hay sondeo', !ctl(S).timers.some(t => t[1] === 6000))
})())
esperas.push((async () => {
  // La foto recién registrada sale de la cola cuando la lista ya la trae.
  const S = armar()
  S.estado.vista = 'rt-vista-remitos'
  S.__setRpc(async () => ({ data: 'rp-7', error: null }))
  ctl(S).invocar(nunca)
  S.__tablas.remitos_precarga = []
  S.encolarFotos([foto('a.jpg')])
  await asentar()
  chk('registrada pero sin estar en la lista: sigue en la cola como "Leyendo…"', S.datosRemitos().cola.length === 1 && S.remitosParaMostrar()[0].estado.texto === 'Leyendo…')
  chk('su miniatura es la foto local (blob:)', /^blob:/.test(S.remitosParaMostrar()[0].miniatura))
  S.__tablas.remitos_precarga = [{ id: 'rp-7', estado: 'leyendo', subido_en: hace(0), foto_path: S.datosRemitos().cola[0].ruta }]
  await S.leerMisRemitos()
  chk('cuando la lista la trae, sale de la cola (no aparece dos veces)', S.datosRemitos().cola.length === 0 && S.remitosParaMostrar().length === 1)
})())
esperas.push((async () => {
  // El sondeo: vuelve a pedir la lista, solo en esta pantalla.
  const S = armar()
  S.estado.vista = 'rt-vista-remitos'
  S.__tablas.remitos_precarga = [{ id: 'r1', estado: 'leyendo', subido_en: hace(1) }]
  await S.leerMisRemitos()
  const t = ctl(S).timers.find(x => x[1] === 6000)
  const antes = S.__llamadas.consultas.filter(c => c[0] === 'remitos_precarga').length
  t[0]()
  await asentar()
  chk('el sondeo vuelve a leer la lista', S.__llamadas.consultas.filter(c => c[0] === 'remitos_precarga').length === antes + 1)
  S.estado.vista = 'rt-vista-form'
  const t2 = ctl(S).timers.filter(x => x[1] === 6000).pop()
  t2[0]()
  await asentar()
  chk('fuera de la pantalla, el sondeo no lee', S.__llamadas.consultas.filter(c => c[0] === 'remitos_precarga').length === antes + 1)
  chk('hayRemitosLeyendo: solo con algo leyéndose', S.hayRemitosLeyendo() && (() => { S.datosRemitos().filas = [{ id: 'r', estado: 'precargada' }]; return !S.hayRemitosLeyendo() })())
})())

// Cada estado, en palabras.
{
  const S = armar()
  const e = (f) => S.estadoRemitoSubido({ subido_en: hace(1), ...f })
  chk('leyendo: "Leyendo…" sin Reintentar', e({ id: 'a', estado: 'leyendo' }).texto === 'Leyendo…' && !e({ id: 'a', estado: 'leyendo' }).reintentar)
  const trabado = e({ id: 'a', estado: 'leyendo', subido_en: hace(10) })
  chk('leyendo hace más de 3 minutos: se ofrece Reintentar', trabado.reintentar === true && /Tarda más de lo normal/.test(trabado.detalle))
  const pre = e({ id: 'b', estado: 'precargada', numero_remito: '0001-00003100', talonario: 'oficial' })
  chk('precargada: "Precargado" con el N° leído', pre.texto === 'Precargado' && pre.detalle === 'Remito N° 0001-00003100' && pre.acopio === false)
  chk('precargada sin N°: lo dice', /Sin número leído/.test(e({ id: 'b', estado: 'precargada' }).detalle))
  const aco = e({ id: 'b', estado: 'precargada', numero_remito: '977492', talonario: 'acopio' })
  chk('precargada de acopio: el sello', aco.acopio === true && S.htmlRemitoSubido({ clave: 'b', cuando: hace(1), estado: aco }).includes('<span class="rt-remito__sello">Acopio</span>'))
  chk('oficial: sin sello', !S.htmlRemitoSubido({ clave: 'b', cuando: hace(1), estado: pre }).includes('rt-remito__sello'))
  const conf = e({ id: 'c', estado: 'confirmada', orden_id: 'o-1', orden: { codigo: 'D-0012' }, numero_remito: '977492', talonario: 'acopio' })
  chk('confirmada: "Confirmado como orden D-0012"', conf.texto === 'Confirmado como orden D-0012' && conf.detalle === 'Remito N° 977492' && conf.acopio === true)
  chk('confirmada de acopio: el sello', S.htmlRemitoSubido({ clave: 'c', cuando: hace(1), estado: conf }).includes('rt-remito__sello'))
  chk('confirmada sin poder leer la orden (sin retiros:ver)', e({ id: 'c', estado: 'confirmada', orden_id: 'o-1', orden: null }).texto === 'Confirmado: ya es una orden')
  chk('descartada: "Descartado: motivo"', e({ id: 'd', estado: 'descartada', descartado_motivo: 'Foto repetida' }).texto === 'Descartado: Foto repetida')
  chk('descartada de acopio: SIN sello (solo precargado o confirmado)', !e({ id: 'd', estado: 'descartada', numero_remito: '9', talonario: 'acopio' }).acopio)
  const err = e({ id: 'e', estado: 'error', error: 'No se ve la fecha' })
  chk('error: "No se pudo leer" con el motivo y Reintentar', err.texto === 'No se pudo leer' && err.detalle === 'No se ve la fecha' && err.reintentar === true)
  chk('error de acopio: sin sello', !e({ id: 'e', estado: 'error', talonario: 'acopio', numero_remito: '9' }).acopio)
  S.datosRemitos().leyendo.add('b')
  chk('pidiendo la lectura pero la base ya lo tiene leído: "Precargado"', e({ id: 'b', estado: 'precargada', numero_remito: '1' }).texto === 'Precargado')
  S.datosRemitos().leyendo.add('e')
  chk('releyendo uno con error: "Leyendo…"', e({ id: 'e', estado: 'error', error: 'x' }).texto === 'Leyendo…')
  chk('en la cola sin registrar: "Subiendo…"', S.estadoRemitoEnCola({ paso: 'subir', error: null }).texto === 'Subiendo…')
  const h = S.htmlRemitoSubido({ clave: 'e', cuando: '2026-10-27T17:32:00Z', estado: err, reintentarCon: 'e' })
  chk('la fila: fecha y hora de Argentina', /27\/10 · 14:32/.test(h), h)
  chk('la fila con error: el botón Reintentar con el id', h.includes('data-remito-reintentar="e"') && h.includes('rt-remito--error'))
  chk('una fila sin miniatura: el ícono', h.includes('<span class="rt-remito__foto" aria-hidden="true"><svg'))
}

// ═══ El escape de lo que viene de la base ══════════════════════════════════
{
  const S = armar({ sinControl: ['u-d', 'u-d2'], empresas: [NUSS, DOLCE, { ...DOLCE2, nombre: marca('fabrica') }] })
  S.estado.vista = 'rt-vista-remitos'
  const d = S.datosRemitos()
  d.filas = [
    { id: 'x1', estado: 'precargada', numero_remito: marca('numero'), unidad_negocio_id: 'u-d2', subido_en: hace(1) },
    { id: 'x2', estado: 'descartada', descartado_motivo: marca('motivo'), subido_en: hace(2) },
    { id: 'x3', estado: 'error', error: marca('error'), subido_en: hace(3) },
    { id: marca('id'), estado: 'confirmada', orden: { codigo: marca('codigo') }, subido_en: hace(4) },
  ]
  d.lecturaFallida.set('x4', marca('fallo'))
  d.filas.push({ id: 'x4', estado: 'leyendo', subido_en: hace(5) })
  d.miniaturas.set(undefined, 'javascript:alert(1)')
  S.pintarRemitos()
  const html = S.__els.get('rt-remitos-lista').innerHTML + S.__els.get('rt-remitos-fabrica').innerHTML
  chk('ninguna marca cruda en Mis remitos subidos', !/<b data-xss=/.test(html), (html.match(/.{0,60}<b data-xss=[^>]*>/) || [''])[0])
  for (const c of ['numero', 'motivo', 'error', 'id', 'codigo', 'fallo', 'fabrica']) chk(`«${c}» escapado`, html.includes(escapada(c)))
  chk('un link que no es https ni blob: no es miniatura', S.urlMiniaturaSegura('javascript:alert(1)') === null && S.urlMiniaturaSegura('data:image/png;base64,x') === null &&
    S.urlMiniaturaSegura('https://x/y') === 'https://x/y' && S.urlMiniaturaSegura('blob:http://localhost/1') === 'blob:http://localhost/1')
}

// ═══ En la página ══════════════════════════════════════════════════════════
{
  const html = FUENTE
  chk('el campo de la cámara: image/*, la de atrás', /<input type="file" id="rt-remitos-camara"[^>]*accept="image\/\*"[^>]*capture="environment"/.test(html))
  chk('el de la galería: varias fotos', /<input type="file" id="rt-remitos-galeria"[^>]*accept="image\/\*"[^>]*multiple/.test(html))
  chk('el botón grande "Subir remitos Rosario", escondido de entrada', /<div class="rt-remitos-entrada" id="rt-remitos-entrada" hidden>[\s\S]{0,400}Subir remitos Rosario/.test(html))
  chk('al arrancar se lee qué fábricas no controlan el stock, sin esperar', /\n\s+leerFabricasSinControl\(\)\.then\(/.test(html))
}

fin()
