// El COLOR DE CADA ESTADO en la vista Cheques (22/09/2026).
//
// El problema: un cheque que ya salió se veía en gris y parecía DESHABILITADO
// —medido, el texto atenuado daba 2,68:1 sobre blanco: ni siquiera pasaba AA—
// y los demás estados no se distinguían de un vistazo. Ahora cada fila (y cada
// tarjeta del celular) lleva un fondo suave según su estado, con el texto a
// pleno contraste, y el chip NOMBRA ese estado: el color solo no dice nada.
//
// La precedencia de los fondos, que es lo que no se puede romper:
//   selección (--naranja-suave)  >  estado (verde/bordó)  >  blanco
//   franja bordó de "no sale"    >  franja naranja de "cobranza por controlar"
//
//   node pruebas/test-cheques-colores.js

const fs = require('fs')
const path = require('path')
const { construirCheques } = require('./sandbox-cheques')
const { ARCHIVO_CHEQUES, leerCheques } = require('./fuente-cheques')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || ARCHIVO_CHEQUES
// La cartera vive en una región de administracion.html: FUENTE es esa región.
const FUENTE = leerCheques(ARCHIVO)
const CSS = FUENTE.slice(FUENTE.indexOf('<style>'), FUENTE.indexOf('</style>'))
// Sin comentarios: una regla se verifica sobre el CSS, no sobre lo que dice el
// comentario que la explica.
const CSS_SIN = CSS.replace(/\/\*[\s\S]*?\*\//g, '')
const MAIN = fs.readFileSync(path.join(RAIZ, 'css/main.css'), 'utf8')

let ok = 0
const fallas = []
function chk(nombre, cond, detalle) { if (cond) ok++; else fallas.push(nombre + (detalle !== undefined ? ` — ${detalle}` : '')) }
const regla = (sel) => { const m = new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' \\{([^}]*)\\}').exec(CSS_SIN); return m ? m[1] : '' }

// ── Los datos de prueba ──────────────────────────────────────────────────
const S = construirCheques(ARCHIVO)
// Contra un archivo anterior a este cambio las funciones nuevas no existen: se
// DICE y se corta, en vez de reventar con un TypeError a mitad de camino.
const FALTAN = ['esPorControlar', 'clavesEstadoCheque', 'leyendaDeCheques', 'htmlLeyendaEstados', 'pintarLeyendaEstados']
  .filter(n => typeof S[n] !== 'function')
if (FALTAN.length) {
  console.log(`  ✗ faltan las funciones del color por estado: ${FALTAN.join(', ')}`)
  console.log('0/1  ROJO')
  process.exit(1)
}
const HOY = S.hoyArgentina()
const mas = (d) => { const x = new Date(HOY + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + d); return x.toISOString().slice(0, 10) }
// Las cobranzas: una asentada y una por controlar.
const COBS = new Map([
  ['ok', { id: 'ok', cliente: 'JyM', estado: 'procesada', fecha: mas(-100) }],
  ['sin', { id: 'sin', cliente: 'Don Pepe', estado: 'registrada', fecha: mas(-100) }],
])
// Un diferido con el pago LEJOS: plazo = pago + 30, así ninguno se marca por
// vencimiento salvo los que lo piden a propósito.
const base = { banco_codigo: '007', tipo: 'diferido', fecha_emision: mas(-10), fecha_pago: mas(120), importe: 1000 }
const CH = {
  cartera:   { ...base, id: 'c1', numero: '11111111', cobranza_id: 'ok', estado: 'en_cartera' },
  control:   { ...base, id: 'c2', numero: '22222222', cobranza_id: 'sin', estado: 'en_cartera' },
  deposito:  { ...base, id: 'c3', numero: '33333333', cobranza_id: 'ok', estado: 'depositado', salida_fecha: mas(-3) },
  endoso:    { ...base, id: 'c4', numero: '44444444', cobranza_id: 'ok', estado: 'endosado', salida_fecha: mas(-3), salida_destino: 'Molino Sur' },
  anulado:   { ...base, id: 'c5', numero: '55555555', cobranza_id: 'ok', estado: 'anulado' },
  vence:     { ...base, id: 'c6', numero: '66666666', cobranza_id: 'ok', estado: 'en_cartera', fecha_pago: mas(-27) },
  vencido:   { ...base, id: 'c7', numero: '77777777', cobranza_id: 'ok', estado: 'en_cartera', fecha_pago: mas(-40) },
}
const fila = (ch) => S.htmlFilaCheque(ch, COBS.get(ch.cobranza_id))
const tarjeta = (ch) => S.htmlTarjetaCheque(ch, COBS.get(ch.cobranza_id))
const clasesDe = (html) => ((html.match(/class="([^"]*)"/) || [])[1] || '').split(/\s+/).filter(Boolean)

// ── 1. Cada estado lleva su marca, en la tabla y en el celular ───────────
{
  chk('en cartera + cobranza asentada: sin ninguna marca (fondo blanco)',
    clasesDe(fila(CH.cartera).trim()).length === 0, clasesDe(fila(CH.cartera).trim()).join())
  chk('en cartera + cobranza POR CONTROLAR: la franja naranja',
    clasesDe(fila(CH.control).trim()).join() === 'chq-tabla__fila--por-controlar', fila(CH.control).slice(0, 120))
  chk('depositado: la marca de salido', clasesDe(fila(CH.deposito).trim()).join() === 'chq-tabla__fila--salido')
  chk('endosado: la misma marca', clasesDe(fila(CH.endoso).trim()).join() === 'chq-tabla__fila--salido')
  chk('anulado: la suya', clasesDe(fila(CH.anulado).trim()).join() === 'chq-tabla__fila--anulado')
  chk('por vencer y vencido siguen con la suya',
    clasesDe(fila(CH.vence).trim()).join() === 'chq-tabla__fila--vence' && clasesDe(fila(CH.vencido).trim()).join() === 'chq-tabla__fila--vencido')
  chk('celular: la tarjeta por controlar, con su marca',
    clasesDe(tarjeta(CH.control).trim()).join() === 'chq-tarjeta,chq-tarjeta--por-controlar', tarjeta(CH.control).slice(0, 140))
  chk('celular: la asentada, sin marca', clasesDe(tarjeta(CH.cartera).trim()).join() === 'chq-tarjeta')
  chk('celular: salido y anulado', clasesDe(tarjeta(CH.deposito).trim()).join() === 'chq-tarjeta,chq-tarjeta--salido' &&
    clasesDe(tarjeta(CH.anulado).trim()).join() === 'chq-tarjeta,chq-tarjeta--anulado')
  // "Por controlar" es el estado de la COBRANZA, no un permiso: sin
  // cobranzas:procesar la fila se marca igual (lo que cambia es la columna
  // Salida, que es la acción).
  const S2 = construirCheques(ARCHIVO)
  S2.estado.misTareas = new Set(['cobranzas:ver_todo'])
  chk('la franja no depende del permiso: sin `procesar` se marca igual',
    S2.htmlFilaCheque(CH.control, COBS.get('sin')).includes('chq-tabla__fila--por-controlar'))
  chk('esPorControlar: un cheque que ya salió de una cobranza por controlar NO se marca',
    S.esPorControlar({ estado: 'endosado' }, COBS.get('sin')) === false)
  chk('esPorControlar: sin la cobranza a la vista, tampoco', S.esPorControlar(CH.control, undefined) === false)
}

// ── 2. El chip NOMBRA el estado: nunca el color solo ─────────────────────
{
  for (const [clave, texto] of [['deposito', 'Depositado'], ['endoso', 'Endosado'], ['anulado', 'Anulado'], ['cartera', 'En cartera']]) {
    chk(`la fila ${clave} lleva su chip con texto`, new RegExp(`<span class="chq-estado chq-estado--[a-z_]+">${texto}</span>`).test(fila(CH[clave])), fila(CH[clave]))
    chk(`la tarjeta ${clave} también`, tarjeta(CH[clave]).includes(`chq-tarjeta__estado">${texto}</span>`))
  }
  chk('css: el chip de un salido, en --verde-oscuro sobre blanco',
    /color: var\(--verde-oscuro\)/.test(regla('.chq-estado--endosado')) && /background: var\(--color-fondo\)/.test(regla('.chq-estado--endosado')))
  chk('css: y el depositado usa la MISMA regla', /\.chq-estado--depositado,\s*\n\s*\.chq-estado--endosado \{/.test(CSS_SIN))
  chk('css: el chip del anulado, en --bordo-oscuro sobre blanco',
    /color: var\(--bordo-oscuro\)/.test(regla('.chq-estado--anulado')) && /background: var\(--color-fondo\)/.test(regla('.chq-estado--anulado')))
  chk('css: y en mayúsculas, que es lo que grita "esto no vale"', /text-transform: uppercase/.test(regla('.chq-estado--anulado')))
  // El chip va sobre BLANCO y no sobre el tinte de su propio estado: encima de
  // una fila ya tintada del mismo color desaparecería.
  chk('css: el chip del anulado NO se pinta del fondo de su fila', !/var\(--bordo-suave\)/.test(regla('.chq-estado--anulado')))
}

// ── 3. Los fondos, con las variables de main.css y sin ningún hex ────────
{
  chk('css: salido → --verde-suave (tabla)', /background: var\(--verde-suave\)/.test(regla('.chq-tabla__fila--salido td')))
  chk('css: salido → --verde-suave (celular)', /background: var\(--verde-suave\)/.test(regla('.chq-tarjeta--salido')))
  chk('css: anulado → --bordo-suave (tabla y celular)', /background: var\(--bordo-suave\)/.test(regla('.chq-tabla__fila--anulado td')) &&
    /background: var\(--bordo-suave\)/.test(regla('.chq-tarjeta--anulado')))
  chk('css: la franja de "por controlar" es NARANJA, el color del módulo',
    /box-shadow: inset 4px 0 0 var\(--naranja\)/.test(regla('.chq-tabla__fila--por-controlar td:first-child')) &&
    /box-shadow: inset 4px 0 0 var\(--naranja\)/.test(regla('.chq-tarjeta--por-controlar')))
  // Las tres variables existen del lado de main.css (que este módulo no toca).
  for (const v of ['--verde-suave', '--verde-oscuro', '--bordo-suave', '--bordo-oscuro', '--naranja', '--naranja-suave'])
    chk(`${v} existe en main.css`, new RegExp(`${v}:`).test(MAIN))
  const reglasEstado = CSS_SIN.split('\n').filter(l => /--salido|--anulado|--por-controlar|--salidos|chq-estado--|chq-leyenda__muestra/.test(l)).join('\n')
  chk('css: ningún hex suelto en las reglas de estado', !/#[0-9a-fA-F]{3,6}\b/.test(reglasEstado), reglasEstado)
}

// ── 4. NINGÚN SALIDO ATENUADO: ni opacity ni texto gris ─────────────────
{
  for (const sel of ['.chq-tabla__fila--salido td', '.chq-tarjeta--salido', '.chq-tabla__fila--anulado td', '.chq-tarjeta--anulado']) {
    chk(`css: ${sel} sin opacity (y una celda sticky con opacity se vuelve transparente)`, !/opacity/.test(regla(sel)), regla(sel))
    chk(`css: ${sel} sin el texto en gris`, !/--color-texto-suave/.test(regla(sel)), regla(sel))
  }
  chk('css: el importe de un salido tampoco va en gris',
    !/--color-texto-suave/.test(regla('.chq-tarjeta--salido .chq-tarjeta__importe')) &&
    !/\.chq-tarjeta--salido \.chq-tarjeta__pago \{[^}]*--color-texto-suave/.test(CSS_SIN), regla('.chq-tarjeta--salido .chq-tarjeta__importe'))
  // Contraste medido de lo que quedó (AA pide 4,5:1 para texto normal).
  const hex = (v) => (new RegExp(`${v}:\\s*(#[0-9a-fA-F]{6})`).exec(MAIN) || [])[1]
  const lum = (h) => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] }
  const contraste = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }
  const texto = hex('--color-texto'), suave = hex('--color-texto-suave')
  chk('el texto normal sobre --verde-suave pasa AA', contraste(texto, hex('--verde-suave')) >= 4.5, contraste(texto, hex('--verde-suave')).toFixed(2))
  chk('y sobre --bordo-suave también', contraste(texto, hex('--bordo-suave')) >= 4.5, contraste(texto, hex('--bordo-suave')).toFixed(2))
  chk('el gris de antes NO lo pasaba (por eso se fue)', contraste(suave, hex('--verde-suave')) < 4.5, contraste(suave, hex('--verde-suave')).toFixed(2))
  chk('el chip del salido sobre blanco pasa AA', contraste(hex('--verde-oscuro'), hex('--color-fondo')) >= 4.5)
  chk('el chip del anulado sobre blanco pasa AA', contraste(hex('--bordo-oscuro'), hex('--color-fondo')) >= 4.5)
}

// ── 5. El anulado se tacha SOLO EL IMPORTE ───────────────────────────────
{
  chk('css: el tachado va en el importe (tabla)', /text-decoration: line-through/.test(regla('.chq-tabla__fila--anulado .chq-tabla__num')))
  chk('css: y en el de la tarjeta', /text-decoration: line-through/.test(regla('.chq-tarjeta--anulado .chq-tarjeta__importe')))
  // La fila entera tachada tachaba también el chip "ANULADO", que es justo lo
  // que tiene que leerse — y es lo único que lo distingue del fondo del plazo,
  // que es el mismo --bordo-suave.
  chk('css: la fila entera NO va tachada', !/text-decoration/.test(regla('.chq-tabla__fila--anulado td')), regla('.chq-tabla__fila--anulado td'))
  chk('css: la tarjeta entera tampoco', !/text-decoration/.test(regla('.chq-tarjeta--anulado')), regla('.chq-tarjeta--anulado'))
  chk('el importe de un anulado vive en la celda que se tacha', /<td class="chq-tabla__num">\$\{esc\(formatearImporte\(ch\.importe\)\)\}<\/td>/.test(FUENTE))
  // Y en los DATOS no se pueden confundir: estadoVencimiento() solo mira los
  // que están en cartera, así que un anulado nunca lleva la marca del plazo.
  chk('un anulado nunca lleva además la marca del plazo', S.estadoVencimiento({ ...CH.anulado, fecha_pago: mas(-40) }, HOY) === null)
  chk('… ni un salido', S.estadoVencimiento({ ...CH.deposito, fecha_pago: mas(-40) }, HOY) === null)
}

// ── 6. La leyenda: solo los estados que están en la lista ────────────────
{
  const entradas = (filas) => S.leyendaDeCheques(filas, COBS, HOY).map(e => e.clave)
  chk('todo en cartera y asentado: NO hay leyenda (no hay ningún color que explicar)',
    entradas([CH.cartera]).length === 0, entradas([CH.cartera]).join())
  chk('con una cobranza por controlar sí, y nombra las dos',
    entradas([CH.cartera, CH.control]).join() === 'por_controlar,en_cartera', entradas([CH.cartera, CH.control]).join())
  chk('solo salidos: una sola entrada', entradas([CH.deposito, CH.endoso]).join() === 'salido')
  chk('depositado y endosado son la MISMA entrada (el mismo verde)', S.leyendaDeCheques([CH.deposito, CH.endoso], COBS, HOY).length === 1)
  chk('un anulado nombra el suyo', entradas([CH.anulado]).join() === 'anulado')
  chk('el plazo también entra en la leyenda', entradas([CH.vence, CH.vencido]).join() === 'vence,vencido')
  chk('uno marcado por el plazo NO aporta además "En cartera" (su fondo no es blanco)', !entradas([CH.vence]).includes('en_cartera'))
  chk('un cheque puede aportar DOS: la franja y el fondo del plazo',
    S.clavesEstadoCheque({ ...CH.control, fecha_pago: mas(-27) }, COBS.get('sin'), HOY).join() === 'por_controlar,vence')
  chk('el orden es el de LEYENDA_ESTADOS, no el de la lista',
    entradas([CH.anulado, CH.deposito, CH.vencido, CH.control, CH.cartera]).join() === 'por_controlar,en_cartera,vencido,salido,anulado')
  chk('LEYENDA_ESTADOS: las seis, cada una con su nombre',
    S.LEYENDA_ESTADOS.length === 6 && S.LEYENDA_ESTADOS.every(e => typeof e.clave === 'string' && typeof e.nombre === 'string' && e.nombre.length > 2))
  const lista = S.leyendaDeCheques([CH.control, CH.anulado], COBS, HOY)
  const html = S.htmlLeyendaEstados(lista)
  chk('cada entrada: una muestrita y su NOMBRE (nunca el color solo)',
    /<span class="chq-leyenda__muestra chq-leyenda__muestra--por_controlar" aria-hidden="true"><\/span>Cobranza por controlar</.test(html), html)
  chk('una muestrita por entrada, y decorativa para el lector de pantalla',
    (html.match(/aria-hidden="true"/g) || []).length === lista.length && lista.length === 3, lista.map(e => e.clave).join())
  chk('el nombre de cada entrada está en el HTML', lista.every(e => html.includes('</span>' + e.nombre + '</span>')), html)
  chk('css: la muestra del anulado lleva su TACHADO (los dos fondos son --bordo-suave)',
    /\.chq-leyenda__muestra--anulado::after \{/.test(CSS_SIN) && /background: var\(--bordo-oscuro\)/.test(regla('.chq-leyenda__muestra--anulado::after')))
  chk('css: la muestra del salido, en --verde-suave', /background: var\(--verde-suave\)/.test(regla('.chq-leyenda__muestra--salido')))
  chk('css: la de "por controlar", con la franja naranja', /box-shadow: inset 4px 0 0 var\(--naranja\)/.test(regla('.chq-leyenda__muestra--por_controlar')))
}

// ── 7. La leyenda en pantalla, y la caja verde del filtro "Salidos" ──────
{
  const S3 = construirCheques(ARCHIVO)
  S3.estado.cobranzas = COBS
  S3.estado.filas = [CH.cartera, CH.control]
  S3.renderizarCheques()
  const ley = S3.__doc.getElementById('chq-leyenda')
  chk('se dibuja arriba de la lista', ley.hidden === false && ley.innerHTML.includes('Cobranza por controlar'))
  chk('y va en el HTML de la página, escapada', /id="chq-leyenda" hidden/.test(FUENTE))

  S3.estado.filas = [CH.cartera]
  S3.renderizarCheques()
  chk('sin nada que explicar se esconde (y no deja el texto viejo abajo)', ley.hidden === true && ley.innerHTML === '')

  // Se vuelve a llenar y recién ahí se vacía la lista: si no, este chequeo
  // pasaría igual con la leyenda sin limpiar (ya venía vacía del paso anterior).
  S3.estado.filas = [CH.cartera, CH.control]
  S3.renderizarCheques()
  chk('con algo que explicar vuelve a aparecer', ley.hidden === false && ley.innerHTML !== '')
  S3.estado.filas = []
  S3.renderizarCheques()
  chk('con la lista vacía no queda la leyenda de lo anterior', ley.hidden === true && ley.innerHTML === '', ley.innerHTML)

  // La caja entera, con el filtro "Salidos".
  const caja = S3.__doc.getElementById('chq-tabla-caja')
  const lista = S3.__doc.getElementById('chq-lista')
  S3.estado.filas = [CH.deposito, CH.endoso]
  S3.estado.filtros.estado = 'salidos'
  S3.renderizarCheques()
  chk('filtro "Salidos": la caja de la tabla toma el verde leve', caja.classList.contains('chq-tabla-scroll--salidos'))
  chk('… y la lista del celular también', lista.classList.contains('chq-lista--salidos'))
  S3.estado.filtros.estado = 'en_cartera'
  S3.estado.filas = [CH.cartera, CH.control]
  S3.renderizarCheques()
  chk('con "En cartera" la caja vuelve a ser la de siempre', !caja.classList.contains('chq-tabla-scroll--salidos') && !lista.classList.contains('chq-lista--salidos'))
  S3.estado.filtros.estado = 'todos'
  S3.estado.filas = [CH.cartera, CH.deposito, CH.anulado]
  S3.renderizarCheques()
  chk('con "Todos" tampoco: ahí cada fila va con su color', !caja.classList.contains('chq-tabla-scroll--salidos'))
  chk('… y la leyenda nombra los tres', ['En cartera', 'Salió de cartera', 'Anulado'].every(t => ley.innerHTML.includes(t)), ley.innerHTML)
  chk('css: el verde de la caja sale de una variable, no de un hex',
    /--chq-salidos-caja: color-mix\(in srgb, var\(--verde\) \d+%, var\(--color-fondo\)\)/.test(CSS_SIN) &&
    /background: var\(--chq-salidos-caja\)/.test(regla('.chq-lista--salidos')))
  chk('css: y el encabezado de la tabla lo toma (si no, de la caja solo se vería el borde)',
    /\.chq-tabla-scroll--salidos \.chq-tabla th,/.test(CSS_SIN))
}

// ── 8. La precedencia de los fondos ──────────────────────────────────────
{
  // La SELECCIÓN le gana a cualquier fondo de estado: misma especificidad, así
  // que decide el orden en el archivo. Se mira la ÚLTIMA aparición de cada
  // fondo de estado: una copia agregada más abajo ganaría.
  const elegida = CSS.indexOf('.chq-tabla__fila--elegida td {')
  const elegidaT = CSS.indexOf('.chq-tarjeta--elegida {')
  chk('css: la selección está en el archivo', elegida > 0 && elegidaT > 0)
  for (const sel of ['.chq-tabla__fila--salido td {', '.chq-tabla__fila--anulado td {']) {
    chk(`css: ${sel} va ANTES de la selección (que le gana el fondo)`, CSS.lastIndexOf(sel) > 0 && CSS.lastIndexOf(sel) < elegida, `${CSS.lastIndexOf(sel)} vs ${elegida}`)
  }
  for (const sel of ['.chq-tarjeta--salido {', '.chq-tarjeta--anulado {']) {
    chk(`css: ${sel} va ANTES de la selección`, CSS.lastIndexOf(sel) > 0 && CSS.lastIndexOf(sel) < elegidaT, `${CSS.lastIndexOf(sel)} vs ${elegidaT}`)
  }
  // Y la franja BORDÓ de "no sale" le gana a la naranja de "por controlar":
  // responde por qué ese cheque elegido no puede salir, que es más urgente que
  // repetir el estado de su cobranza.
  const noSale = CSS.indexOf('.chq-tabla__fila--no-sale td:first-child {')
  const noSaleT = CSS.indexOf('.chq-tarjeta--no-sale {')
  chk('css: la franja de "no sale" está en el archivo', noSale > 0 && noSaleT > 0)
  chk('css: "por controlar" va ANTES de "no sale" (que le gana la franja)',
    CSS.lastIndexOf('.chq-tabla__fila--por-controlar td:first-child {') < noSale &&
    CSS.lastIndexOf('.chq-tarjeta--por-controlar {') < noSaleT)
  // Y el fondo de estado le gana al blanco de la celda: después de la base.
  chk('css: el fondo de estado va DESPUÉS de la regla base de td',
    CSS.indexOf('.chq-tabla td {') > 0 && CSS.indexOf('.chq-tabla td {') < CSS.indexOf('.chq-tabla__fila--salido td {'))
}

for (const f of fallas) console.log('  ✗ ' + f)
console.log(`${ok}/${ok + fallas.length}${fallas.length ? '  ROJO' : '  verde'}`)
process.exit(fallas.length ? 1 : 0)
