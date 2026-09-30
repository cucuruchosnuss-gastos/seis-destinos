// LA PLANTA SIN ZOOM (30/09/2026, urgente). En la tablet, deslizar para
// recargar a veces dejaba la pantalla agrandada y sin forma de volver.
// Esta suite fija, sobre el fuente de modulos/produccion.html:
//  - el viewport: maximum-scale=1 y user-scalable=no;
//  - html y body con touch-action: manipulation y overscroll-behavior-y: none;
//  - ninguna regla de un campo (input, textarea, select, .pr-input,
//    .pr-textarea) con letra de menos de 16 px;
//  - "Recargar" en la barra lateral, que pregunta solo si hay algo a medio
//    cargar (se EJECUTAN las funciones reales).
// El recorrido en el navegador es e2e/16-planta-sin-zoom.spec.js.
//
//   node pruebas/test-produccion-sin-zoom.js
const path = require('path')
const fs = require('fs')
const { arnes } = require('./circuito-comun')
const { extraerFn, extraerConst } = require('./extraer')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/produccion.html')
const src = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${src.length} bytes)`)
const { chk, fin } = arnes()

// ── El viewport ──────────────────────────────────────────────────────────────
const meta = /<meta name="viewport" content="([^"]*)">/.exec(src)?.[1] ?? ''
chk('el viewport no deja agrandar (maximum-scale=1)', /(^|,\s*)maximum-scale=1(\s*,|$)/.test(meta), meta)
chk('ni hacer zoom con los dedos (user-scalable=no)', /(^|,\s*)user-scalable=no(\s*,|$)/.test(meta), meta)
chk('sigue con width=device-width, initial-scale=1 y viewport-fit=cover', /width=device-width/.test(meta) && /initial-scale=1(\s*,|$)/.test(meta) && /viewport-fit=cover/.test(meta), meta)

// ── El CSS de html y body ────────────────────────────────────────────────────
const css = src.slice(src.indexOf('<style>'), src.indexOf('</style>'))
const reglaHB = /\n\s*html, body \{ touch-action: manipulation; overscroll-behavior-y: none; \}/.test(css)
chk('html y body: sin zoom por doble toque y sin "deslizar para recargar"', reglaHB)
chk('ninguna regla posterior le vuelve a dar overscroll a html o body', !/(html|body)[^{]*\{[^}]*overscroll-behavior(-y)?:\s*(auto|contain)/.test(css))

// ── Los campos: letra de 16 px o más ─────────────────────────────────────────
const chicos = []
const reglas = css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^}]*)\}/g)
for (const [, sel, cuerpo] of reglas) {
  if (!/\b(input|textarea|select)\b|\.pr-input\b|\.pr-textarea\b/.test(sel)) continue
  const m = /font-size:\s*([\d.]+)px/.exec(cuerpo)
  if (m && Number(m[1]) < 16) chicos.push(`${sel.trim()} → ${m[1]}px`)
}
chk('ningún campo con letra de menos de 16 px (Chrome hace zoom al tocarlo)', chicos.length === 0, chicos.join(' | '))

// ── Recargar ─────────────────────────────────────────────────────────────────
const VISTAS = extraerConst(src, 'VISTAS_A_MEDIO_CARGAR')
const fns = ['hayAlgoAMedioCargar', 'htmlConfirmaRecargar', 'pedirRecargar', 'recargarPantalla'].map(n => extraerFn(src, n)).join('\n')
function sandbox(vista) {
  const s = { recargas: 0, pintadas: 0 }
  const f = new Function('s', `
    var estado = { vista: ${JSON.stringify(vista)}, recargarPide: false }
    var window = { location: { reload() { s.recargas++ } } }
    function pintarLateral() { s.pintadas++ }
    ${VISTAS.replace(/^const /, 'var ')}
    ${fns}
    return { estado, hayAlgoAMedioCargar, htmlConfirmaRecargar, pedirRecargar, recargarPantalla }`)
  return Object.assign(f(s), { s })
}
{
  const S = sandbox('pr-produccion')
  S.pedirRecargar()
  chk('sin nada a medio cargar, "Recargar" recarga sin preguntar', S.s.recargas === 1 && S.estado.recargarPide === false)
}
for (const v of ['pr-abrir', 'pr-agregar-prod', 'pr-paradas', 'pr-cierre', 'pr-receta', 'pr-asignar']) {
  const S = sandbox(v)
  S.pedirRecargar()
  chk(`en ${v} pregunta antes de recargar`, S.s.recargas === 0 && S.estado.recargarPide === true && S.s.pintadas === 1)
  const h = S.htmlConfirmaRecargar()
  chk(`en ${v} la pregunta dice lo que se pierde`, /role="alertdialog"/.test(h) && /Se pierde lo que estás cargando/.test(h) && /id="pr-recargar-si"/.test(h) && /id="pr-recargar-no"/.test(h))
  S.recargarPantalla()
  chk(`en ${v}, "Sí, recargar" recarga`, S.s.recargas === 1 && S.estado.recargarPide === false)
}
{
  const S = sandbox('pr-produccion')
  chk('sin pedir, no se dibuja la pregunta', S.htmlConfirmaRecargar() === '')
}
chk('la barra lateral dibuja "Recargar" y la pregunta', /id="pr-btn-recargar" aria-label="Recargar">/.test(src) && /\+\n\s+htmlConfirmaRecargar\(\)\n\s+\}/.test(src))
chk('el clic de "Recargar" pide recargar', /if \(ev\.target\.closest\('#pr-btn-recargar'\)\) \{ tocar\(\); pedirRecargar\(\); return \}/.test(src))
chk('"Sí, recargar" recarga y "No, seguir" cierra la pregunta', /if \(ev\.target\.closest\('#pr-recargar-si'\)\) \{ recargarPantalla\(\); return \}/.test(src) &&
  /if \(ev\.target\.closest\('#pr-recargar-no'\)\) \{ estado\.recargarPide = false; pintarLateral\(\); return \}/.test(src))

fin()
