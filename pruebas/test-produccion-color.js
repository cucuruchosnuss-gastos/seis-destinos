// "Terminar la tablet", parte 1 (25/09/2026): el color de modulos/produccion.html.
//
// Lo que se probó en un navegador de verdad el 24/09 y se corrigió:
//  - La tablet usaba un acento AZUL propio y el handoff de diseño decía que no
//    hubiera azules. El acento es el de la app: NARANJA para lo que se toca, y
//    los grises de texto y borde para lo que solo se lee.
//  - Lo ELEGIDO adentro de un modo (máquina, Simple/Doble, turno, persona,
//    chip, casilla) va en naranja, no en el amarillo fuerte de la Sala de masa.
//  - "Cerrar planilla" tiene su propio peso y va separado de "Parada" y
//    "Máquinas": termina el turno.
//  - La cabecera decía "Producción • Producción" y otra vez "Producción".
//  - Las grillas quedaban pegadas a la izquierda con media pantalla vacía.
//
// Y lo que más importa hacia adelante: que el azul NO VUELVA. Ni el token
// (--azul, --azul-suave, --azul-oscuro) ni ninguno de sus hex conocidos.
//
//   node pruebas/test-produccion-color.js
// Overrides: ARCHIVO_TEST (el produccion.html bajo prueba).

const fs = require('fs')
const path = require('path')
const { arnes, leer } = require('./circuito-comun')
const { construirProduccion } = require('./sandbox-produccion')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/produccion.html')
const FUENTE = leer(ARCHIVO)
const MAIN = fs.readFileSync(path.join(RAIZ, 'css/main.css'), 'utf8')
const { chk, fin } = arnes()

const CSS = (FUENTE.match(/<style>([\s\S]*?)<\/style>/) || [])[1] || ''
chk('se encontró el <style> del módulo', CSS.length > 20000, CSS.length)

// El cuerpo de la ÚLTIMA regla con ese selector exacto (la que manda cuando
// hay dos con la misma especificidad), y su posición. Anclada al principio del
// renglón y con su sangría: la misma regla adentro de un @media va más
// sangrada y es OTRA regla (la de pantallas angostas).
function regla(selector) {
  const aguja = '\n' + selector + ' {'
  const i = CSS.lastIndexOf(aguja)
  if (i === -1) return { i: -1, cuerpo: '' }
  const j = CSS.indexOf('}', i)
  return { i, cuerpo: CSS.slice(i + aguja.length, j) }
}

// ── 1. El azul no vuelve ─────────────────────────────────────────────────
{
  const tokens = FUENTE.match(/--azul(?:-suave|-oscuro)?\b/g) ?? []
  chk('ningún token --azul / --azul-suave / --azul-oscuro en el archivo', tokens.length === 0, tokens)
  for (const hex of ['#1F5FAD', '#E7EFFA', '#164680']) {
    const re = new RegExp(hex, 'i')
    chk(`ningún ${hex} (sin importar mayúsculas)`, !re.test(FUENTE))
  }
  // Y que la prueba sepa encontrarlos: si el detector no detecta, el verde de
  // arriba no dice nada.
  const trampa = 'a { color: var(--azul-oscuro); background: #1f5fad; }'
  chk('el detector encuentra el token', /--azul(?:-suave|-oscuro)?\b/.test(trampa))
  chk('el detector encuentra el hex en minúsculas', /#1F5FAD/i.test(trampa))
}

// ── 2. Lo que se toca es naranja; lo que se lee, gris ───────────────────
{
  const btn = regla('    .pr-btn').cuerpo
  chk('el botón base es naranja (fondo y borde)', /border: 2px solid var\(--naranja\)/.test(btn) && /background: var\(--naranja\)/.test(btn), btn)
  const sec = regla('    .pr-btn--secundario').cuerpo
  chk('el secundario: blanco, borde gris con 3:1 y texto de lectura', /background: var\(--color-fondo\)/.test(sec) &&
    /border-color: var\(--pr-borde-boton\)/.test(sec) && /color: var\(--color-texto\)/.test(sec), sec)
  chk('el foco de botones y opciones es naranja',
    /\.pr-opcion:focus-visible, \.pr-btn:focus-visible \{ outline: 3px solid var\(--naranja\)/.test(CSS))
  chk('el foco de un campo es naranja', /\.pr-input:focus, \.pr-select:focus, \.pr-textarea:focus \{ outline: none; border-color: var\(--naranja\)/.test(CSS))
  chk('el lote del historial se lee en tinta, no en un acento', /\.pr-lote \{[^}]*color: var\(--color-texto\)/.test(CSS))
}

// ── 3. Lo ELEGIDO va en naranja en los dos modos, nunca en el amarillo ──
{
  const elegidos = [
    ['    .pr-sala-maq[aria-pressed="true"]', 'la máquina elegida en la Sala de masa'],
    ['    .pr-sala__tamano .pr-segmento__opcion[aria-pressed="true"]', 'Simple / Doble'],
    ['    .pr-segmento__opcion[aria-pressed="true"]', 'un segmentado'],
    ['    .pr-segmento--columna .pr-segmento__opcion[aria-pressed="true"]', 'el turno al abrir'],
    ['    .pr-chip[aria-pressed="true"]', 'un chip'],
    ['    .pr-quien__nombres .pr-opcion[aria-pressed="true"]', 'la persona elegida'],
    ['    .pr-casilla:checked', 'una casilla marcada'],
  ]
  for (const [sel, que] of elegidos) {
    const r = regla(sel)
    chk(`${que}: en naranja`, r.i !== -1 && /var\(--naranja\)/.test(r.cuerpo), sel)
    chk(`${que}: sin el amarillo ni el gris de modo`, r.i !== -1 && !/--pr-masa-|--pr-prod-/.test(r.cuerpo), r.cuerpo)
  }
  chk('la barra de modos SIGUE con los colores de modo (el fondo se mantiene)',
    /var\(--pr-masa-activo\)/.test(regla('    .pr-modo--masa[aria-pressed="true"]').cuerpo) &&
    /var\(--pr-prod-activo\)/.test(regla('    .pr-modo[aria-pressed="true"]').cuerpo))
  chk('el fondo de pantalla sigue siendo el del modo',
    /body\.pr-modo-produccion \{ background-color: var\(--pr-prod-fondo\); \}/.test(CSS) &&
    /body\.pr-modo-masa\s+\{ background-color: var\(--pr-masa-fondo\); \}/.test(CSS))
}

// ── 4. "Cerrar planilla" con su propio peso ──────────────────────────────
{
  const cab = (FUENTE.match(/<div class="pr-planilla-cab__botones">([\s\S]*?)<\/div>/) || [])[1] || ''
  const iParada = cab.indexOf('id="pr-btn-parada"')
  const iSep = cab.indexOf('class="pr-planilla-cab__sep"')
  const iCerrar = cab.indexOf('id="pr-btn-cerrar-planilla"')
  chk('los tres botones y el separador están', iParada !== -1 && iSep !== -1 && iCerrar !== -1, cab)
  chk('el separador va ENTRE Parada y Cerrar planilla', iParada < iSep && iSep < iCerrar)
  chk('Cerrar planilla lleva su clase propia', /class="[^"]*pr-planilla-cab__cerrar[^"]*" id="pr-btn-cerrar-planilla"/.test(cab))
  chk('Parada NO la lleva', !/pr-planilla-cab__cerrar[^"]*" id="pr-btn-parada"/.test(cab))
  const generica = regla('    .pr-planilla-cab .pr-btn--accion')
  const cerrar = regla('    .pr-planilla-cab .pr-planilla-cab__cerrar')
  chk('la regla de Cerrar planilla va DESPUÉS de la genérica blanca (misma especificidad)',
    generica.i !== -1 && cerrar.i > generica.i, [generica.i, cerrar.i])
  chk('Cerrar planilla: lleno en naranja con letra blanca', /background: var\(--naranja\)/.test(cerrar.cuerpo) &&
    /border-color: var\(--naranja\)/.test(cerrar.cuerpo) && /color: #fff/.test(cerrar.cuerpo), cerrar.cuerpo)
  chk('Cerrar planilla: más ancho que los otros', /min-width: 16rem/.test(cerrar.cuerpo))
  chk('el separador se ve (borde gris con 3:1)', /\.pr-planilla-cab__sep \{[^}]*width: 2px[^}]*background: var\(--pr-borde-boton\)/.test(CSS))
}

// ── 5. La cabecera: el nombre del módulo una sola vez ───────────────────
{
  const header = (FUENTE.match(/<header class="pr-header"[\s\S]*?<\/header>/) || [''])[0]
  const veces = (header.match(/Producción/g) ?? []).length
  chk('la cabecera dice "Producción" UNA vez', veces === 1, veces)
  chk('ya no hay sección que repita el modo', !/pr-header-seccion/.test(FUENTE))
  chk('el título de la pantalla de oficina no repite "Producción"',
    !/<section class="pr-tarjeta" id="pr-inicio">\s*<h1 class="pr-titulo">Producción<\/h1>/.test(FUENTE))

  const S = construirProduccion(ARCHIVO)
  S.estado.unidades = new Map([['u-cn', 'Cucuruchos Nuss']])
  S.estado.unidadId = 'u-cn'
  S.estado.modo = 'produccion'
  S.estado.persona = { id: 'p1', nombre: 'Federico Silva', puesto: 'encargado' }
  S.pintarCabecera()
  const ctx = S.__doc.getElementById('pr-header-contexto').textContent
  chk('al lado: la unidad y la persona activa', ctx === 'Cucuruchos Nuss · Federico Silva', ctx)
  chk('… y no el nombre del modo', !/Producción/.test(ctx), ctx)

  const T = construirProduccion(ARCHIVO)
  T.estado.unidades = new Map([['u-cn', 'Cucuruchos Nuss']])
  T.estado.unidadId = 'u-cn'
  T.estado.modo = 'masa'
  T.estado.persona = null
  T.pintarCabecera()
  const ctx2 = T.__doc.getElementById('pr-header-contexto').textContent
  chk('sin nadie adentro: solo la unidad', ctx2 === 'Cucuruchos Nuss', ctx2)
}

// ── 6. Las grillas se centran y aprovechan el ancho ─────────────────────
{
  const tablero = regla('    .pr-tablero').cuerpo
  chk('el tablero usa auto-fit (las columnas vacías colapsan)', /repeat\(auto-fit, /.test(tablero) && !/auto-fill/.test(tablero), tablero)
  chk('una sola tarjeta se centra con un ancho razonable',
    /\.pr-tablero:not\(:has\(> :nth-child\(2\)\)\) \{ max-width: 36rem; margin-inline: auto; \}/.test(CSS))
  const grilla = regla('    .pr-grilla').cuerpo
  chk('las grillas de opciones: auto-fit con ancho máximo y centradas',
    /repeat\(auto-fit, minmax\(min\(100%, 15rem\), 22rem\)\)/.test(grilla) && /justify-content: center/.test(grilla), grilla)
  chk('el ancho de la app sigue en 1280 centrado', /\.pr-app \{\s*max-width: 1280px;\s*margin: 0 auto;/.test(CSS))
}

// ── 7. Contrastes, recalculados de los hex reales ───────────────────────
{
  const hexDe = (fuente, v) => { const m = fuente.match(new RegExp(`--${v}:\\s*(#[0-9A-Fa-f]{6})`)); return m && m[1] }
  const lum = h => {
    const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(x => x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
  }
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }
  const C = {
    blanco: '#FFFFFF',
    naranja: hexDe(MAIN, 'naranja'), suave: hexDe(MAIN, 'naranja-suave'), oscuro: hexDe(MAIN, 'naranja-oscuro'),
    texto: hexDe(MAIN, 'color-texto'),
    borde: hexDe(CSS, 'pr-borde-boton'), prodFondo: hexDe(CSS, 'pr-prod-fondo'), masaFondo: hexDe(CSS, 'pr-masa-fondo'),
  }
  chk('se leyeron todos los hex', Object.values(C).every(Boolean), C)
  const pares = [
    ['blanco', 'naranja', 4.5, 'letra blanca sobre un botón naranja'],
    ['oscuro', 'suave', 4.5, 'naranja oscuro sobre naranja suave (lo elegido)'],
    ['texto', 'suave', 4.5, 'tinta sobre naranja suave'],
    ['texto', 'blanco', 4.5, 'tinta sobre el botón secundario'],
    ['oscuro', 'masaFondo', 4.5, 'naranja oscuro sobre el fondo de Sala de masa'],
    ['oscuro', 'prodFondo', 4.5, 'naranja oscuro sobre el fondo de Producción'],
    ['naranja', 'blanco', 3, 'borde naranja sobre blanco'],
    ['naranja', 'suave', 3, 'borde naranja sobre naranja suave'],
    ['naranja', 'prodFondo', 3, 'foco naranja sobre el fondo de Producción'],
    ['naranja', 'masaFondo', 3, 'foco naranja sobre el fondo de Sala de masa'],
    ['borde', 'blanco', 3, 'borde del secundario sobre blanco'],
    ['borde', 'prodFondo', 3, 'borde del secundario sobre el fondo de Producción'],
    ['borde', 'masaFondo', 3, 'borde del secundario sobre el fondo de Sala de masa'],
  ]
  for (const [a, b, min, que] of pares) {
    if (!C[a] || !C[b]) { chk(`${que}: falta un hex`, false, [a, b]); continue }
    const r = ratio(C[a], C[b])
    chk(`${que}: ${r.toFixed(2)}:1 >= ${min}:1`, r >= min, r)
  }
}

fin()
