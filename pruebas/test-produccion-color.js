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
// Planta v2 (28/09/2026): el <style> se reemplazó por el del handoff (tokens
// --p-*). Siguen valiendo: sin azules, el acento es EL naranja de la app
// (--p-acento = --naranja), lo elegido en naranja y nunca en el color de un
// modo, la cabecera de la gestión y los contrastes. Cambiaron por diseño: la
// planilla ya no tiene botonera propia (Cerrar planilla es una sección de la
// barra lateral), la app llena la tablet (100dvh, sin 1280 centrado) y el
// tablero es una grilla de 6 columnas repartida por spanTablero().
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
// Planta v2 (28/09/2026): el <style> entero se reemplazó por el del handoff
// "Planta v2" (tokens --p-*). El acento es --p-acento, que tiene que ser el
// MISMO hex que el --naranja de main.css.
function regla(selector) {
  const aguja = '\n' + selector + ' {'
  const i = CSS.lastIndexOf(aguja)
  if (i === -1) return { i: -1, cuerpo: '' }
  const j = CSS.indexOf('}', i)
  return { i, cuerpo: CSS.slice(i + aguja.length, j) }
}
const hexDe = (fuente, v) => { const m = fuente.match(new RegExp(`--${v}:\\s*(#[0-9A-Fa-f]{6})\\s*;`)); return m && m[1].toUpperCase() }

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
  // El acento de la planta es EL naranja de la app: el mismo hex, no uno parecido.
  const acento = hexDe(CSS, 'p-acento'), naranja = hexDe(MAIN, 'naranja')
  chk('--p-acento es el --naranja de main.css (#C2410C)', !!acento && acento === naranja && acento === '#C2410C', [acento, naranja])
  chk('--p-acento-suave es el --naranja-suave de main.css', !!hexDe(CSS, 'p-acento-suave') && hexDe(CSS, 'p-acento-suave') === hexDe(MAIN, 'naranja-suave'))
  chk('--p-acento-osc es el --naranja-oscuro de main.css', !!hexDe(CSS, 'p-acento-osc') && hexDe(CSS, 'p-acento-osc') === hexDe(MAIN, 'naranja-oscuro'))
  // La acción de la pantalla va llena de naranja con letra blanca.
  for (const sel of ['    .pr-btn--accion', '    .pr-btn--grande', '    .pr-tecla--accion', '    .pr-receta__registrar', '    .pr-sala-card__nueva']) {
    const c = regla(sel).cuerpo
    chk(`${sel.trim()}: llena de naranja con letra blanca`, /background: var\(--p-acento\)/.test(c) && /color: #fff/.test(c), c)
  }
  // El secundario, en cambio, blanco con la tinta de lectura: nada de naranja.
  const btn = regla('    .pr-btn').cuerpo
  chk('el botón base (secundario) es blanco y se lee en tinta, sin naranja', /background: var\(--p-tarjeta\)/.test(btn) &&
    /color: var\(--p-tinta-2\)/.test(btn) && !/--p-acento/.test(btn), btn)
  chk('el foco (focus-visible) es naranja', /\n    :focus-visible \{ outline: 3px solid var\(--p-acento\)/.test(CSS))
  chk('el foco de un campo es naranja', /\.pr-input:focus, \.pr-textarea:focus \{ outline: none; border-color: var\(--p-acento\)/.test(CSS))
  // El lote del historial se lee en tinta, no en un acento: nada lo pinta.
  chk('el lote del historial se lee en tinta, no en un acento', /\.pr-hm__ing-marca \{[^}]*color: var\(--p-tinta-2\)/.test(CSS) &&
    !/\.pr-hm__ing-lote[^{]*\{[^}]*--p-acento/.test(CSS))
}

// ── 3. Lo ELEGIDO va en naranja en los dos modos, nunca en el amarillo ──
{
  // Planta v2 (28/09/2026): los selectores del diseño nuevo. Los chips de
  // filtro (.pr-chip, las marcas de la ventana de lotes) van en TINTA por
  // diseño: son filtros, no lo elegido de la pantalla.
  const elegidos = [
    ['    .pr-sala-card[aria-pressed="true"]', 'la máquina elegida en la Sala de masa'],
    ['    .pr-seg-rec__op[aria-pressed="true"], .pr-como[aria-pressed="true"]', 'Simple / Doble y Original / Anterior / Modificar'],
    ['    .pr-segmento__opcion[aria-pressed="true"]', 'un segmentado (el turno al abrir)'],
    ['    .pr-abrir-maq[aria-pressed="true"]', 'la máquina elegida al abrir el turno'],
    ['    .pr-abrir-maq[aria-pressed="true"] .pr-abrir-maq__casilla', 'la casilla de la máquina elegida'],
    ['    .pr-op-tag[aria-pressed="true"]', 'el operario elegido'],
    ['    .pr-op-tag[aria-pressed="true"] .pr-op-tag__casilla', 'la casilla del operario elegido'],
    ['    .pr-persona[aria-pressed="true"]', 'la persona elegida'],
    ['    .pr-lp__tarjeta[aria-pressed="true"]', 'el lote marcado en la ventana'],
    ['    .pr-hm__masa[aria-pressed="true"]', 'la masa elegida en el historial'],
    ['    .pr-motivo[aria-pressed="true"]', 'el motivo de parada elegido'],
    ['    .pr-puesto-card[aria-pressed="true"]', 'el puesto elegido (acceso maestro)'],
    ['    .pr-opcion[aria-pressed="true"]', 'una opción'],
  ]
  for (const [sel, que] of elegidos) {
    const r = regla(sel)
    chk(`${que}: en naranja`, r.i !== -1 && /var\(--p-acento(?:-suave|-osc)?\)/.test(r.cuerpo), sel)
    chk(`${que}: sin el amarillo ni el gris de modo`, r.i !== -1 && !/--p-masa|--p-prod/.test(r.cuerpo), r.cuerpo)
  }
  // El color del modo vive en lo que DICE el modo: el botón al otro modo de
  // la barra lateral y la banda de "¿Quién sos?". El fondo de la pantalla ya
  // no cambia con el modo (diseño Planta v2: #F5F3EF siempre).
  chk('el botón al otro modo SIGUE con los colores de modo',
    /\n    \.pr-lat__otro--masa \{[^}]*var\(--p-masa\)/.test(CSS) &&
    /\n    \.pr-lat__otro--produccion \{[^}]*var\(--p-prod\)/.test(CSS))
  chk('la banda de "¿Quién sos?" lleva el color del modo',
    /\n    \.pr-banda-modo--produccion \{[^}]*background: var\(--p-prod\)/.test(CSS) &&
    /\n    \.pr-banda-modo--masa \{[^}]*background: var\(--p-masa\)/.test(CSS))
  chk('el color de modo NUNCA es el naranja', !/--p-(?:masa|prod):\s*#C2410C/i.test(CSS))
}

// ── 4. "Cerrar planilla" con su propio lugar ─────────────────────────────
// Planta v2 (28/09/2026): los botones de la cabecera de la planilla (Parada,
// separador, Cerrar planilla) se fueron; se navega con la barra lateral, donde
// "Cerrar planilla" es su propia sección, separada de "Paradas".
{
  const secs = (FUENTE.match(/const SECCIONES_PRODUCCION = \[([\s\S]*?)\n    \]/) || [])[1] || ''
  const iParadas = secs.indexOf("id: 'paradas'"), iCierre = secs.indexOf("id: 'cierre'")
  chk('Paradas y Cerrar planilla son dos secciones distintas de la barra', iParadas !== -1 && iCierre !== -1 && iParadas < iCierre, secs)
  chk('la sección de cierre dice "Cerrar planilla"', /id: 'cierre', texto: 'Cerrar planilla'/.test(secs))
  chk('Paradas lleva el tono bordó; Cerrar planilla no', /id: 'paradas'[^}]*tono: 'bordo'/.test(secs) && !/id: 'cierre'[^}]*tono: 'bordo'/.test(secs))
  chk('ya no queda el botón viejo de la cabecera', !/id="pr-btn-cerrar-planilla"/.test(FUENTE))
}

// ── 5. La cabecera: el nombre del módulo una sola vez ───────────────────
// Desde el 25/09/2026 la cabecera vive SOLO en la gestión: la planta es toda
// tablet y manda la barra de modos.
{
  const { GESTION } = require('./sandbox-produccion')
  const ARCHIVO_G = process.env.ARCHIVO_GESTION || GESTION
  const FUENTE_G = leer(ARCHIVO_G)
  chk('la planta no tiene cabecera de oficina', !/<header class="pr-header"/.test(FUENTE))
  // La cabecera lleva además la clase del diseño de la gestión (pg-cab).
  const header = (FUENTE_G.match(/<header class="pr-header[ "][\s\S]*?<\/header>/) || [''])[0]
  const veces = (header.match(/Producción/g) ?? []).length
  chk('la cabecera de la gestión dice "Producción" UNA vez', veces === 1, veces)
  // Desde el diseño de la gestión (26/09/2026) la pantalla de inicio no tiene
  // título propio: arranca con el día y los indicadores.
  const inicio = (FUENTE_G.match(/<section id="pr-inicio">[\s\S]*?<\/section>/) || [''])[0]
  chk('el título de la pantalla de inicio no repite "Producción"', inicio !== '' && !/Producción/.test(inicio) && /id="pr-indicadores"/.test(inicio))
  chk('ya no hay sección que repita el modo', !/pr-header-seccion/.test(FUENTE) && !/pr-header-seccion/.test(FUENTE_G))

  const S = construirProduccion(ARCHIVO_G)
  S.estado.unidades = new Map([['u-cn', 'Cucuruchos Nuss']])
  S.estado.unidadId = 'u-cn'
  S.pintarCabecera()
  const ctx = S.__doc.getElementById('pr-header-contexto').textContent
  chk('gestión: al lado, la unidad', ctx === 'Cucuruchos Nuss', ctx)
  chk('… y no el nombre del modo', !/Producción/.test(ctx), ctx)
  chk('… la cabecera se ve', S.__doc.getElementById('pr-header').hidden === false)
  const T = construirProduccion(ARCHIVO_G)
  T.estado.unidadId = null
  T.pintarCabecera()
  chk('gestión sin unidad elegida: nada al lado', T.__doc.getElementById('pr-header-contexto').textContent === '')
}

// ── 6. La planta llena la tablet sin scroll ─────────────────────────────
// Planta v2 (28/09/2026): ya no hay ancho máximo de 1280 ni grillas auto-fit
// centradas; la app ocupa la pantalla entera (100dvh) y el tablero es una
// grilla de 6 columnas donde cada tarjeta ocupa lo que le toca (spanTablero).
{
  const body = regla('    body, body.pagina-modulo').cuerpo
  chk('la página no scrollea: body con overflow hidden', /overflow: hidden/.test(body), body)
  chk('la app ocupa la pantalla entera (100dvh) sin scroll propio', /\.pr-app \{ height: 100dvh;[^}]*overflow: hidden/.test(CSS))
  const tablero = regla('    .pr-tablero').cuerpo
  chk('el tablero es una grilla de 6 columnas', /grid-template-columns: repeat\(6, minmax\(0, 1fr\)\)/.test(tablero), tablero)
  chk('cada tarjeta toma su ancho de --span-h', /grid-column: span var\(--span-h, 2\)/.test(CSS))
  // Cada fila del tablero llena las 6 columnas: ninguna tarjeta queda
  // pegada a la izquierda con media fila vacía.
  const S = construirProduccion(ARCHIVO)
  let filasLlenas = true
  const detalle = []
  for (let n = 1; n <= 8; n++) {
    const porFila = new Map()
    for (let i = 0; i < n; i++) {
      const h = Number((/--span-h: ([\d.]+)/.exec(S.spanTablero(i, n)) || [])[1])
      const fila = Math.floor(i / 3)
      porFila.set(fila, (porFila.get(fila) ?? 0) + h)
    }
    for (const [fila, total] of porFila) if (total !== 6) { filasLlenas = false; detalle.push({ n, fila, total }) }
  }
  chk('spanTablero: cada fila suma las 6 columnas (de 1 a 8 máquinas)', filasLlenas, detalle)
}

// ── 7. Contrastes, recalculados de los hex reales ───────────────────────
{
  const lum = h => {
    const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(x => x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
  }
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }
  const C = {
    blanco: '#FFFFFF',
    acento: hexDe(CSS, 'p-acento'), suave: hexDe(CSS, 'p-acento-suave'), oscuro: hexDe(CSS, 'p-acento-osc'),
    tinta: hexDe(CSS, 'p-tinta'), tinta2: hexDe(CSS, 'p-tinta-2'), fondo: hexDe(CSS, 'p-fondo'),
    prod: hexDe(CSS, 'p-prod'), masa: hexDe(CSS, 'p-masa'), masaTxt: hexDe(CSS, 'p-masa-txt'),
  }
  chk('se leyeron todos los hex', Object.values(C).every(Boolean), C)
  const pares = [
    ['blanco', 'acento', 4.5, 'letra blanca sobre un botón naranja'],
    ['oscuro', 'suave', 4.5, 'naranja oscuro sobre naranja suave (lo elegido)'],
    ['tinta', 'suave', 4.5, 'tinta sobre naranja suave'],
    ['tinta2', 'blanco', 4.5, 'tinta del botón secundario sobre blanco'],
    ['oscuro', 'fondo', 4.5, 'naranja oscuro sobre el fondo de la planta'],
    ['acento', 'blanco', 3, 'borde naranja sobre blanco'],
    ['acento', 'suave', 3, 'borde naranja sobre naranja suave'],
    ['acento', 'fondo', 3, 'foco naranja sobre el fondo de la planta'],
    ['blanco', 'prod', 4.5, 'letra blanca sobre el color de Producción'],
    ['masaTxt', 'masa', 4.5, 'letra de Sala de masa sobre su amarillo'],
  ]
  for (const [a, b, min, que] of pares) {
    if (!C[a] || !C[b]) { chk(`${que}: falta un hex`, false, [a, b]); continue }
    const r = ratio(C[a], C[b])
    chk(`${que}: ${r.toFixed(2)}:1 >= ${min}:1`, r >= min, r)
  }
}

fin()
