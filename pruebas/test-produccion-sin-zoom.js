// LA PLANTA SIN ZOOM (30/09/2026, urgente) Y CON "DESLIZAR PARA RECARGAR"
// (01/10/2026). En la tablet, deslizar para recargar a veces dejaba la
// pantalla agrandada y sin forma de volver: lo que la dejaba así era el
// ZOOM. El 30/09 se sacó además el deslizar y se puso un botón "Recargar";
// el 01/10 Facu pidió volver a deslizar y sacar el botón (ocupaba lugar y
// hacía scrollear la barra lateral).
// Esta suite fija, sobre el fuente de modulos/produccion.html:
//  - el viewport: maximum-scale=1 y user-scalable=no;
//  - html y body con touch-action: manipulation y SIN overscroll-behavior
//    none (deslizar para recargar anda);
//  - ninguna regla de un campo (input, textarea, select, .pr-input,
//    .pr-textarea) con letra de menos de 16 px;
//  - que "Recargar" se fue;
//  - que un producto o una parada a medio cargar se guardan al irse la
//    página y se recuperan al volver a esa sección de ESA máquina (se
//    EJECUTA el código real con el sandbox de la planta).
// El recorrido en el navegador es e2e/16-planta-sin-zoom.spec.js.
//
//   node pruebas/test-produccion-sin-zoom.js
process.env.TZ = 'UTC'
const path = require('path')
const fs = require('fs')
const { arnes } = require('./circuito-comun')
const { construirProduccion } = require('./sandbox-produccion')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/produccion.html')
const src = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${src.length} bytes)`)
const { chk, esperas, fin } = arnes()

// ── El viewport ──────────────────────────────────────────────────────────────
const meta = /<meta name="viewport" content="([^"]*)">/.exec(src)?.[1] ?? ''
chk('el viewport no deja agrandar (maximum-scale=1)', /(^|,\s*)maximum-scale=1(\s*,|$)/.test(meta), meta)
chk('ni hacer zoom con los dedos (user-scalable=no)', /(^|,\s*)user-scalable=no(\s*,|$)/.test(meta), meta)
chk('sigue con width=device-width, initial-scale=1 y viewport-fit=cover', /width=device-width/.test(meta) && /initial-scale=1(\s*,|$)/.test(meta) && /viewport-fit=cover/.test(meta), meta)

// ── El CSS de html y body ────────────────────────────────────────────────────
const css = src.slice(src.indexOf('<style>'), src.indexOf('</style>'))
const cssSinComentarios = css.replace(/\/\*[\s\S]*?\*\//g, '')
chk('html y body: sin zoom por doble toque', /\n\s*html, body \{ touch-action: manipulation; \}/.test(cssSinComentarios))
chk('deslizar para recargar anda: ninguna regla le pone overscroll none a html o body',
  !/(^|[\s,}])(html|body)\b[^{]*\{[^}]*overscroll-behavior(-y)?:\s*none/.test(cssSinComentarios))

// ── Los campos: letra de 16 px o más ─────────────────────────────────────────
const chicos = []
for (const [, sel, cuerpo] of cssSinComentarios.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
  if (!/\b(input|textarea|select)\b|\.pr-input\b|\.pr-textarea\b/.test(sel)) continue
  const m = /font-size:\s*([\d.]+)px/.exec(cuerpo)
  if (m && Number(m[1]) < 16) chicos.push(`${sel.trim()} → ${m[1]}px`)
}
chk('ningún campo con letra de menos de 16 px (Chrome hace zoom al tocarlo)', chicos.length === 0, chicos.join(' | '))

// ── "Recargar" se fue ────────────────────────────────────────────────────────
chk('la barra lateral ya no tiene "Recargar"', !/id="pr-btn-recargar"/.test(src) && !/pr-lat__recargar/.test(src))
chk('ni su pregunta ni sus funciones', !/function (pedirRecargar|recargarPantalla|htmlConfirmaRecargar|hayAlgoAMedioCargar)\b/.test(src) && !/recargarPide/.test(src))
chk('parada, la barra de arriba no reserva la columna de "Recargar"', /grid-template-areas: "otro quien reloj salir" "nav nav nav nav";/.test(css))
chk('al irse la página se guarda lo que está a medio cargar', /window\.addEventListener\('pagehide', guardarCargaAMedias\)/.test(src))

// ── Lo que queda a medio cargar al recargar ─────────────────────────────────
const TURNO = { id: 't1', lote: 7033, maquina_id: 'm1', fecha: '2026-10-01', turno: 'Mañana', abierto_en: '2026-10-01T09:00:00Z', estado: 'abierto' }
function armar() {
  const S = construirProduccion(ARCHIVO)
  S.estado.modo = 'produccion'
  S.estado.persona = { id: 'e-fede', nombre: 'Federico Silva' }
  S.estado.planilla = { turno: TURNO, paradas: [], masas: [], items: [], operarios: [], maquinaNombre: 'Máquina 1' }
  S.estado.catalogo = { productos: [], presentaciones: [], marcas: [] }
  return S
}

{
  // Un producto a medio cargar.
  const S = armar()
  S.estado.vista = 'pr-agregar-prod'
  S.estado.agregar = { paso: 'cajas', productoId: 'p-mini', conCono: true, presentacionId: 'pp-1', marcaId: 'mc-2', marcaElegida: true,
    cajaId: 'caja-1', cajaElegida: true, embolsado: 'grande', chocoSinMasa: false, guardando: true, stock: { algo: 1 } }
  S.ponerNumero(S.__doc.getElementById('pr-agregar-cajas'), 12)
  S.guardarCargaAMedias()
  const g = JSON.parse(S.sessionStorage.getItem('produccion.aMedias.agregar') ?? 'null')
  chk('el producto a medio cargar se guarda con su máquina', g?.turnoId === 't1' && g?.campos?.productoId === 'p-mini' && g?.campos?.marcaId === 'mc-2' && g?.campos?.paso === 'cajas', JSON.stringify(g))
  chk('… con las cajas escritas', g?.cajas === 12, JSON.stringify(g))
  chk('… y sin lo que no es del formulario (guardando, stock)', g && !('guardando' in g.campos) && !('stock' in g.campos))

  // Al volver a abrir Lo producido de esa máquina (después de recargar).
  const T = armar()
  T.sessionStorage.setItem('produccion.aMedias.agregar', JSON.stringify(g))
  T.abrirAgregar()
  chk('al volver a Lo producido de esa máquina, se recupera', T.estado.agregar?.productoId === 'p-mini' && T.estado.agregar?.paso === 'cajas' && T.estado.agregar?.cajaId === 'caja-1', JSON.stringify(T.estado.agregar))
  chk('… con sus cajas', T.leerCampoNumero(T.__doc.getElementById('pr-agregar-cajas')) === 12)
  chk('… y se recupera una sola vez', T.sessionStorage.getItem('produccion.aMedias.agregar') == null)

  // En otra máquina no.
  const O = armar()
  O.estado.planilla.turno = { ...TURNO, id: 't2', lote: 7034 }
  O.sessionStorage.setItem('produccion.aMedias.agregar', JSON.stringify(g))
  O.abrirAgregar()
  chk('en otra máquina no se recupera (arranca de cero)', O.estado.agregar?.productoId === '' && O.sessionStorage.getItem('produccion.aMedias.agregar') != null)
}
{
  // Sin nada elegido, o corrigiendo un sublote, no se guarda nada.
  const S = armar()
  S.estado.vista = 'pr-agregar-prod'
  S.estado.agregar = { paso: 'producto', productoId: '' }
  S.sessionStorage.setItem('produccion.aMedias.agregar', '{"viejo":1}')
  S.guardarCargaAMedias()
  chk('sin producto elegido no se guarda (y se borra lo viejo)', S.sessionStorage.getItem('produccion.aMedias.agregar') == null)
  S.estado.agregar = { paso: 'cajas', productoId: 'p', corrige: { sublote: '7033-1' } }
  S.guardarCargaAMedias()
  chk('corrigiendo un sublote no se guarda', S.sessionStorage.getItem('produccion.aMedias.agregar') == null)
  S.estado.vista = 'pr-planilla'
  S.estado.agregar = { paso: 'cajas', productoId: 'p' }
  S.guardarCargaAMedias()
  chk('fuera de Lo producido no se guarda', S.sessionStorage.getItem('produccion.aMedias.agregar') == null)
}
{
  // Una parada a medio anotar.
  const S = armar()
  S.estado.vista = 'pr-paradas'
  S.prepararParadaNueva()
  Object.assign(S.estado.paradaNueva, { motivoId: 'mo-cadena', detalle: 'la de abajo', inicio: '10:15', duracion: 30, enviando: true, errorBase: 'x' })
  S.guardarCargaAMedias()
  const g = JSON.parse(S.sessionStorage.getItem('produccion.aMedias.parada') ?? 'null')
  chk('la parada a medio anotar se guarda con su máquina', g?.turnoId === 't1' && g?.motivoId === 'mo-cadena' && g?.inicio === '10:15' && g?.duracion === 30, JSON.stringify(g))
  chk('… sin "mandando" ni el error de la base', g?.enviando === false && g?.errorBase === '')

  const T = armar()
  T.sessionStorage.setItem('produccion.aMedias.parada', JSON.stringify(g))
  T.estado.paradaNueva = null
  const f = T.prepararParadaNueva()
  chk('al volver a Paradas de esa máquina, se recupera', f?.motivoId === 'mo-cadena' && f?.detalle === 'la de abajo' && f?.inicio === '10:15' && f?.duracion === 30, JSON.stringify(f))
  chk('… una sola vez', T.sessionStorage.getItem('produccion.aMedias.parada') == null)

  const V = armar()
  V.estado.vista = 'pr-paradas'
  V.prepararParadaNueva()
  V.sessionStorage.setItem('produccion.aMedias.parada', '{"viejo":1}')
  V.guardarCargaAMedias()
  chk('una parada sin empezar no se guarda (y se borra lo viejo)', V.sessionStorage.getItem('produccion.aMedias.parada') == null)
}
{
  // Algo roto en la memoria no traba nada.
  const S = armar()
  S.sessionStorage.setItem('produccion.aMedias.parada', '{roto')
  S.estado.paradaNueva = null
  const f = S.prepararParadaNueva()
  chk('un guardado roto se ignora: parada nueva vacía', f?.turnoId === 't1' && !f.motivoId)
}

fin()
