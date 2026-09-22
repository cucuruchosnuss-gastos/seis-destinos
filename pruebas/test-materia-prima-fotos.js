// Fase 2 de las fotos de Ingreso (modulos/materia-prima.html): se guarda la
// RUTA en Storage y se firma AL MIRAR, a 300 segundos. Mismo criterio que
// Gastos (21289ef) y Cobranzas.
//
// Se EJECUTA el código real del archivo (sandbox con storage, auth y
// window.open falsos), no se lo lee por regex:
//  - subirArchivoMp devuelve la ruta '{uid}/mp/...' y NO firma nada.
//  - leerConIA deja esa ruta en w.foto.url, que es lo que viaja a foto_url;
//    filaItemParaBase manda la ruta de los adjuntos en ficha_tecnica_url /
//    foto_lote_url.
//  - rutaFotoMp: ruta nueva tal cual; URL firmada vieja → su ruta; cualquier
//    otra cosa (javascript:, otro dominio, `..`) → null.
//  - abrirFotoMp firma (ruta, 300), abre solo la URL que devolvió la firma, y
//    ante un error avisa sin romperse; un token vencido reintenta una vez.
//  - el detalle (la plantilla real de abrirDetalleIngreso) dibuja un botón con
//    la RUTA y ningún href: el token viejo no aparece en la página.
//
//   node pruebas/test-materia-prima-fotos.js
//   ARCHIVO_TEST=otra-copia.html node pruebas/test-materia-prima-fotos.js

const path = require('path')
const { construirCon, scriptModulo } = require('./sandbox')
const { arnes, leer } = require('./circuito-comun')
const { extraerFn } = require('./extraer')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/materia-prima.html')
const FUENTE = leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

const UID = '11111111-2222-3333-4444-555555555555'
const DIEZ_ANIOS = 60 * 60 * 24 * 365 * 10

const PRELUDIO = `
  var __log = { subidas: [], firmas: [], refrescos: 0, errores: [], ventanas: [], invocaciones: [] }
  var __firma = null          // función (ruta, seg) -> { data, error }
  var __ventanaBloqueada = false
  function nuevoEl(id) { return { id, innerHTML: '', textContent: '', hidden: false, disabled: false } }
  var __els = new Map()
  var document = { getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) } }
  var window = {
    open(url, destino) {
      if (__ventanaBloqueada) return null
      const v = { url, destino, opener: 'x', cerrada: false, location: { href: '' }, close() { this.cerrada = true } }
      __log.ventanas.push(v)
      return v
    },
  }
  var console = { error() {}, log() {} }
  var supabase = {
    storage: {
      from(bucket) {
        return {
          async upload(ruta, archivo, opciones) { __log.subidas.push({ bucket, ruta, opciones }); return { data: { path: ruta }, error: null } },
          async createSignedUrl(ruta, seg) {
            __log.firmas.push({ bucket, ruta, seg })
            return __firma ? __firma(ruta, seg) : { data: { signedUrl: 'https://proyecto.supabase.co/firmada/' + ruta + '?token=CORTO' }, error: null }
          },
        }
      },
    },
    auth: { async refreshSession() { __log.refrescos++; return { error: null } } },
    functions: { async invoke(nombre, opts) { __log.invocaciones.push({ nombre, opts }); return { data: { ok: true, datos: {}, crudo: null }, error: null } } },
  }
  function mostrarError(m) { __log.errores.push(m) }
  async function fileABase64() { return 'BASE64' }
  function prellenarDesdeOcr() {}
  function irAPasoWz() {}
  var estado = { sesion: { user: { id: '${UID}' } }, wizard: null }
`

let S
try {
  S = construirCon(ARCHIVO, {
    preludio: PRELUDIO,
    constantes: ['BUCKET_FOTOS_MP', 'SEGUNDOS_FIRMA_FOTO_MP', 'MENSAJES_FOTO_MP'],
    funciones: ['esc', 'rutaFotoMp', 'clasificarErrorFirmaMp', 'firmarFotoMp', 'abrirFotoMp', 'manejarClickFotoMp',
      'subirArchivoMp', 'avisoOcr', 'leerConIA', 'filaItemParaBase', 'hayDiferenciaReal', 'diferenciaDe', 'esFactura'],
    retorno: `estado, __log, __setFirma(f){ __firma = f }, __bloquear(b){ __ventanaBloqueada = b }, BUCKET_FOTOS_MP, SEGUNDOS_FIRMA_FOTO_MP, MENSAJES_FOTO_MP`,
  })
} catch (e) {
  chk('el sandbox se arma con las funciones reales del archivo', false, String(e && e.stack || e))
  fin()
  return
}

const L = S.__log
const reset = () => { L.subidas.length = 0; L.firmas.length = 0; L.refrescos = 0; L.errores.length = 0; L.ventanas.length = 0; L.invocaciones.length = 0; S.__setFirma(null); S.__bloquear(false) }

chk('la firma al mirar es de 300 segundos', S.SEGUNDOS_FIRMA_FOTO_MP === 300, String(S.SEGUNDOS_FIRMA_FOTO_MP))
chk('el bucket es comprobantes', S.BUCKET_FOTOS_MP === 'comprobantes')

esperas.push((async () => {
  // ── subirArchivoMp: ruta, sin firma ──────────────────────────────────────
  reset()
  const ruta = await S.subirArchivoMp({ name: 'Remito Nº 1.JPG', type: 'image/jpeg' })
  chk('subirArchivoMp devuelve la RUTA {uid}/mp/{archivo}', new RegExp(`^${UID}/mp/\\d+-[a-z0-9]+\\.jpg$`).test(ruta), ruta)
  chk('subirArchivoMp NO pide ninguna firma (ni a 10 años ni a ninguna)', L.firmas.length === 0, JSON.stringify(L.firmas))
  chk('subirArchivoMp sube al bucket comprobantes', L.subidas.length === 1 && L.subidas[0].bucket === 'comprobantes' && L.subidas[0].ruta === ruta)
  chk('la ruta subida la reconoce rutaFotoMp tal cual', S.rutaFotoMp(ruta) === ruta)
  const raro = await S.subirArchivoMp({ name: 'foto sin punto "<x>', type: 'image/jpeg' })
  chk('una extensión con caracteres raros se limpia y la ruta sigue siendo válida', S.rutaFotoMp(raro) === raro, raro)
  const sinExt = await S.subirArchivoMp({ name: '.', type: 'image/jpeg' })
  chk('sin extensión cae a jpg', /\.jpg$/.test(sinExt), sinExt)

  // ── leerConIA: la ruta queda en w.foto.url (lo que viaja a foto_url) ─────
  reset()
  S.estado.wizard = { foto: { archivo: { name: 'a.pdf', type: 'application/pdf' }, url: null }, encabezado: { tipoDoc: 'remito' } }
  await S.leerConIA()
  chk('leerConIA guarda la RUTA en w.foto.url', S.rutaFotoMp(S.estado.wizard.foto.url) === S.estado.wizard.foto.url
    && S.estado.wizard.foto.url.startsWith(`${UID}/mp/`), S.estado.wizard.foto.url)
  chk('leerConIA no firma nada', L.firmas.length === 0)
  chk('el OCR sigue recibiendo el archivo en base64, no la ruta', L.invocaciones.length === 1
    && L.invocaciones[0].opts.body.imagen_base64 === 'BASE64')

  // ── El insert lleva la ruta ──────────────────────────────────────────────
  const fila = S.filaItemParaBase({ insumoId: 'i', cantidad: 5, bultos: null, contenido: null, lote: 'L1',
    fichaTecnicaUrl: `${UID}/mp/1-a.pdf`, fotoLoteUrl: `${UID}/mp/2-b.jpg` }, 'ing')
  chk('filaItemParaBase manda la ruta de la ficha técnica', fila.ficha_tecnica_url === `${UID}/mp/1-a.pdf`)
  chk('filaItemParaBase manda la ruta de la foto de lote', fila.foto_lote_url === `${UID}/mp/2-b.jpg`)
  const confirmar = extraerFn(scriptModulo(ARCHIVO), 'confirmarIngreso')
  chk('el insert del ingreso manda foto_url: w.foto.url (la ruta que dejó leerConIA)', /\bfoto_url: w\.foto\.url,/.test(confirmar))
  chk('en el módulo no queda ninguna firma a 10 años', !/60 \* 60 \* 24 \* 365/.test(scriptModulo(ARCHIVO)))

  // ── rutaFotoMp ───────────────────────────────────────────────────────────
  const vieja = 'https://xtorxouhzuizdvawqakb.supabase.co/storage/v1/object/sign/comprobantes/abc-1/mp/1757-xy.jpg?token=VIEJO10ANIOS'
  chk('una URL firmada vieja da su ruta', S.rutaFotoMp(vieja) === 'abc-1/mp/1757-xy.jpg', S.rutaFotoMp(vieja))
  chk('una URL vieja con la ruta codificada se decodifica', S.rutaFotoMp(vieja.replace('/mp/', '%2Fmp%2F')) === 'abc-1/mp/1757-xy.jpg')
  for (const malo of ['javascript:alert(1)', 'JAVASCRIPT:alert(1)//x/y', 'data:text/html,<b>x</b>', 'http://xtorxouhzuizdvawqakb.supabase.co/storage/v1/object/sign/comprobantes/a/mp/b.jpg',
    'https://otro.com/malo.jpg', 'https://otro.com/x', '//otro.com/a/b', 'a/../b', 'a//b', '/a/b', 'solo-un-segmento',
    'a/mp/x"onmouseover=1', 'a/mp/<b>', 'a b/mp/c', '', null, undefined]) {
    chk(`rutaFotoMp rechaza ${JSON.stringify(malo)}`, S.rutaFotoMp(malo) === null, String(S.rutaFotoMp(malo)))
  }

  // ── abrirFotoMp con una ruta nueva ───────────────────────────────────────
  reset()
  await S.abrirFotoMp(`${UID}/mp/1-a.jpg`)
  chk('abrir una ruta nueva pide createSignedUrl(ruta, 300)', L.firmas.length === 1 && L.firmas[0].ruta === `${UID}/mp/1-a.jpg`
    && L.firmas[0].seg === 300 && L.firmas[0].bucket === 'comprobantes', JSON.stringify(L.firmas))
  chk('la pestaña se abre en blanco y va a la URL que devolvió la firma', L.ventanas.length === 1 && L.ventanas[0].url === ''
    && L.ventanas[0].location.href === `https://proyecto.supabase.co/firmada/${UID}/mp/1-a.jpg?token=CORTO` && L.ventanas[0].opener === null)
  chk('sin errores', L.errores.length === 0, L.errores.join(' | '))

  // ── Click en el botón del detalle con una URL vieja ──────────────────────
  reset()
  const rutaVieja = S.rutaFotoMp(vieja)
  const boton = { dataset: { rutaFoto: rutaVieja } }
  S.manejarClickFotoMp({ target: { closest: (sel) => (sel === '[data-ruta-foto]' ? boton : null) } })
  await new Promise(r => setTimeout(r, 0))
  chk('una foto vieja se firma por su RUTA a 300, no se usa la URL vieja', L.firmas.length === 1 && L.firmas[0].ruta === 'abc-1/mp/1757-xy.jpg' && L.firmas[0].seg === 300)
  chk('el token viejo no llega a la pestaña', L.ventanas.length === 1 && !L.ventanas[0].location.href.includes('VIEJO10ANIOS'))
  reset()
  S.manejarClickFotoMp({ target: { closest: () => null } })
  chk('un click fuera del botón no hace nada', L.firmas.length === 0 && L.ventanas.length === 0)

  // ── El detalle: plantilla real de abrirDetalleIngreso ────────────────────
  const detalle = extraerFn(scriptModulo(ARCHIVO), 'abrirDetalleIngreso')
  const ini = detalle.indexOf('${!c.foto_url')
  const fin_ = detalle.indexOf("'<span class=\"comprobante-mp__sin-foto\">Foto no disponible</span>'}", ini)
  chk('existe la plantilla de la foto en el detalle', ini >= 0 && fin_ > ini)
  if (ini >= 0 && fin_ > ini) {
    const expr = detalle.slice(ini + 2, fin_ + "'<span class=\"comprobante-mp__sin-foto\">Foto no disponible</span>'".length)
    const pintar = new Function('rutaFotoMp', 'esc', 'c', 'return `${' + expr + '}`')
    const html = (v) => pintar(S.rutaFotoMp, S.esc, { foto_url: v })
    const h1 = html(vieja)
    chk('detalle: la foto vieja va como botón con su ruta', h1.includes('data-ruta-foto="abc-1/mp/1757-xy.jpg"'), h1)
    chk('detalle: el token viejo NO aparece en la página', !h1.includes('VIEJO10ANIOS') && !h1.includes('token='))
    chk('detalle: ningún href ni src', !/\b(href|src)\s*=/i.test(h1))
    const h2 = html(`${UID}/mp/1-a.jpg`)
    chk('detalle: la ruta nueva va como botón', h2.includes(`data-ruta-foto="${UID}/mp/1-a.jpg"`) && !/\bhref=/i.test(h2))
    for (const malo of ['javascript:alert(1)', 'https://otro.com/x.jpg', 'a/mp/x"onclick=1']) {
      const h = html(malo)
      chk(`detalle: ${malo} no se enlaza y dice "Foto no disponible"`, h.includes('Foto no disponible') && !h.includes('data-ruta-foto') && !/\bhref=/i.test(h), h)
    }
    chk('detalle: sin foto dice "Sin foto"', html(null).includes('Sin foto'))
  }

  // ── Errores de firma ─────────────────────────────────────────────────────
  reset()
  S.__setFirma(() => ({ data: null, error: { code: 'NoSuchKey', statusCode: '404' } }))
  await S.abrirFotoMp(`${UID}/mp/1-a.jpg`)
  chk('propia y no existe → "no se encontró", la pestaña se cierra', L.errores[0] === S.MENSAJES_FOTO_MP.no_encontrado && L.ventanas[0].cerrada)
  reset()
  S.__setFirma(() => ({ data: null, error: { code: 'NoSuchKey', statusCode: '404' } }))
  await S.abrirFotoMp('otra-persona/mp/1-a.jpg')
  chk('de otra persona y 404 → no afirma que no existe (puede ser permiso)', L.errores[0] === S.MENSAJES_FOTO_MP.no_se_sabe, L.errores[0])
  reset()
  let intentos = 0
  S.__setFirma(() => (++intentos === 1 ? { data: null, error: { code: 'AccessDenied', statusCode: '403' } } : { data: { signedUrl: 'https://p/ok' }, error: null }))
  await S.abrirFotoMp(`${UID}/mp/1-a.jpg`)
  chk('token vencido → refresca la sesión y reintenta UNA vez', L.refrescos === 1 && L.firmas.length === 2 && L.ventanas[0].location.href === 'https://p/ok' && !L.errores.length)
  reset()
  S.__setFirma(() => ({ data: null, error: { code: 'AccessDenied', statusCode: '403' } }))
  await S.abrirFotoMp(`${UID}/mp/1-a.jpg`)
  chk('token inválido dos veces → mensaje de sesión, sin tercer intento', L.firmas.length === 2 && L.errores[0] === S.MENSAJES_FOTO_MP.sesion)
  reset()
  S.__setFirma(() => { throw new Error('red caída') })
  let tiro = false
  try { await S.abrirFotoMp(`${UID}/mp/1-a.jpg`) } catch { tiro = true }
  chk('una excepción de red no rompe: avisa y cierra la pestaña', !tiro && L.errores[0] === S.MENSAJES_FOTO_MP.otro && L.ventanas[0].cerrada)
  reset()
  S.__setFirma(() => ({ data: { signedUrl: null }, error: null }))
  await S.abrirFotoMp(`${UID}/mp/1-a.jpg`)
  chk('firma sin URL → mensaje genérico', L.errores[0] === S.MENSAJES_FOTO_MP.otro)
  reset()
  S.__bloquear(true)
  await S.abrirFotoMp(`${UID}/mp/1-a.jpg`)
  chk('pestaña bloqueada → lo dice', L.errores[0] === S.MENSAJES_FOTO_MP.bloqueada)
  reset()
  await S.abrirFotoMp('')
  chk('sin ruta → mensaje de ruta, sin firmar ni abrir nada', L.errores[0] === S.MENSAJES_FOTO_MP.ruta && !L.firmas.length && !L.ventanas.length)
})())

fin()
