// Tarea A2 del módulo Cheques (22/09/2026): la unidad de negocio de cada
// cheque, que es la de SU COBRANZA (v_cobranzas.unidad_negocio_id y
// unidad_negocio_nombre; cobranzas.unidad_negocio_id se decide al asentarla y
// puede faltar).
//
//   - la columna "Unidad", ordenable, con "Sin unidad" en gris y lo sin dato
//     al final en los dos sentidos;
//   - (el filtro por unidad se fue el 28/09/2026: lo decide la barra de
//     unidad de arriba y lo prueba test-cheques-barra-unidad.js);
//   - en la barra de la selección, el desglose por unidad si los elegidos son
//     de más de una, o solo el nombre si son de una;
//   - en el celular, la unidad va en el title de la tarjeta y como texto
//     oculto (en el renglón no entra: ver el comentario en el HTML).
//
// Todo se EJECUTA con el sandbox, con nombres de unidad con HTML malicioso.
//
//   node pruebas/test-cheques-unidad.js

const fs = require('fs')
const path = require('path')
const { construirCheques } = require('./sandbox-cheques')
const { ARCHIVO_CHEQUES, leerCheques } = require('./fuente-cheques')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || ARCHIVO_CHEQUES
// La cartera vive en una región de administracion.html: FUENTE es esa región.
const FUENTE = leerCheques(ARCHIVO)
const CSS = FUENTE.slice(FUENTE.indexOf('<style>'), FUENTE.indexOf('</style>'))

let ok = 0
const fallas = []
const esperas = []
function chk(nombre, cond, detalle) { if (cond) ok++; else fallas.push(nombre + (detalle !== undefined ? ` — ${detalle}` : '')) }
const marca = (campo) => `"><b data-xss="${campo}">`
const escapada = (campo) => `&lt;b data-xss=&quot;${campo}&quot;&gt;`

// Los listeners de los elementos quedan anotados, para disparar el "change"
// del selector de unidad con el código REAL de conectarTodo().
const PRELUDIO_LISTENERS = `
  var __getOrig = document.getElementById
  document.getElementById = function (id) {
    const el = __getOrig(id)
    if (!el.__l) { el.__l = {}; el.addEventListener = (t, f) => { (el.__l[t] = el.__l[t] || []).push(f) } }
    return el
  }
  document.body.style = { __v: {}, setProperty(k, v) { this.__v[k] = v } }
`
const nuevo = (extra = {}) => construirCheques(ARCHIVO, { preludioExtra: PRELUDIO_LISTENERS, ...extra })

const U1 = '11111111-1111-4111-8111-111111111111'
const U2 = '22222222-2222-4222-8222-222222222222'
const UX = '33333333-3333-4333-8333-333333333333'
const cobs = new Map([
  ['c1', { id: 'c1', cliente: 'A', estado: 'procesada', fecha: '2026-09-01', unidad_negocio_id: U1, unidad_negocio_nombre: 'Dolce Pasta' }],
  ['c2', { id: 'c2', cliente: 'B', estado: 'procesada', fecha: '2026-09-01', unidad_negocio_id: U2, unidad_negocio_nombre: 'Cucuruchos Nuss' }],
  ['c3', { id: 'c3', cliente: 'C', estado: 'procesada', fecha: '2026-09-01', unidad_negocio_id: null, unidad_negocio_nombre: null }],
  ['cx', { id: 'cx', cliente: 'X', estado: 'procesada', fecha: '2026-09-01', unidad_negocio_id: UX, unidad_negocio_nombre: marca('unidad_nombre') }],
])
const base = { banco_codigo: '007', tipo: 'comun', estado: 'en_cartera' }
const filas = [
  { ...base, id: 'a', cobranza_id: 'c1', numero: '1', fecha_emision: '2026-09-01', importe: 0.1 },
  { ...base, id: 'b', cobranza_id: 'c3', numero: '2', fecha_emision: '2026-09-02', importe: 0.2 },
  { ...base, id: 'c', cobranza_id: 'c2', numero: '3', fecha_emision: '2026-09-03', importe: 100 },
  // Su cobranza no se ve (RLS): cuenta como sin unidad, nunca "undefined".
  { ...base, id: 'd', cobranza_id: 'c-invisible', numero: '4', fecha_emision: '2026-09-04', importe: 5 },
  { ...base, id: 'e', cobranza_id: 'c1', numero: '5', fecha_emision: '2026-09-05', importe: 1000 },
]

// ── La columna en la tabla ───────────────────────────────────────────────
{
  const S = nuevo()
  const html = S.htmlTablaCheques([...filas, { ...base, id: 'x', cobranza_id: 'cx', numero: '9', fecha_emision: '2026-09-09', importe: 1 }], cobs)
  const ths = [...html.matchAll(/<th\b[^>]*>[\s\S]*?<\/th>/g)].map(m => m[0])
  const i = ths.findIndex(t => /data-orden="unidad"/.test(t))
  chk('hay columna "Unidad", ordenable (botón con data-orden)', i >= 0 && /<button[^>]*data-orden="unidad">Unidad</.test(ths[i]), ths[i])
  chk('va después de Importe', i > 0 && /data-orden="importe"/.test(ths[i - 1]))
  chk('sin orden por unidad: aria-sort="none"', /aria-sort="none"/.test(ths[i] || ''))
  const celdas = (id) => {
    const k = html.indexOf(`data-cheque-fila="${id}"`)
    const tr = html.slice(k, html.indexOf('</tr>', k))
    return [...tr.matchAll(/<td\b([^>]*)>([\s\S]*?)<\/td>/g)].map(x => ({ attrs: x[1], cont: x[2] }))
  }
  chk('la celda dice el nombre, entero en title', celdas('a')[i]?.cont === 'Dolce Pasta' && /title="Dolce Pasta"/.test(celdas('a')[i]?.attrs), JSON.stringify(celdas('a')[i]))
  chk('sin unidad: "Sin unidad" en gris (span propio)', celdas('b')[i]?.cont === '<span class="chq-sin-unidad">Sin unidad</span>', celdas('b')[i]?.cont)
  chk('cobranza que no se ve: "Sin unidad", nunca undefined/null', celdas('d')[i]?.cont === '<span class="chq-sin-unidad">Sin unidad</span>' && !/undefined|null/.test(html))
  chk('el nombre va ESCAPADO en la celda', celdas('x')[i]?.cont === S.esc(marca('unidad_nombre')), celdas('x')[i]?.cont)
  chk('y en el title', html.includes(`title="${S.esc(marca('unidad_nombre'))}"`))
  chk('tabla: ninguna marca cruda', !/<b data-xss=/.test(html))
  const sinNombre = S.htmlCeldaUnidad({ cobranza_id: 'cn' }, { id: 'cn', unidad_negocio_id: U1, unidad_negocio_nombre: null })
  chk('una unidad sin nombre (dato raro) no dice "null" ni "Sin unidad"', /Unidad sin nombre/.test(sinNombre) && !/null|Sin unidad/.test(sinNombre), sinNombre)
  const reglaSin = (CSS.match(/\.chq-sin-unidad \{([^}]*)\}/) || [])[1] || ''
  chk('css: "Sin unidad" en gris', /color: var\(--color-texto-suave\)/.test(reglaSin), reglaSin)
  const reglaCelda = (CSS.match(/\.chq-tabla__unidad \{([^}]*)\}/) || [])[1] || ''
  chk('css: la celda en UN renglón, cortada con puntos suspensivos (todas las filas miden lo mismo)',
    /white-space: nowrap/.test(reglaCelda) && /text-overflow: ellipsis/.test(reglaCelda) && /max-width/.test(reglaCelda), reglaCelda)
  S.estado.orden = { campo: 'unidad', sentido: 'desc' }
  const th = [...S.htmlTablaCheques([], cobs).matchAll(/<th\b[^>]*>[\s\S]*?<\/th>/g)].map(m => m[0]).find(t => /data-orden="unidad"/.test(t))
  chk('ordenada por unidad descendente: aria-sort="descending" y ▼', /aria-sort="descending"/.test(th) && />▼</.test(th), th)
}

// ── El orden: por nombre, lo sin unidad al final en los dos sentidos ──────
{
  const S = nuevo()
  const orden = (sentido) => S.ordenarCheques(filas, { campo: 'unidad', sentido }, cobs).map(x => x.id).join('')
  // Cucuruchos (c) < Dolce (a, e); sin unidad (b, d) al final, desempatados
  // por fecha de cobro.
  chk('ascendente: Cucuruchos, Dolce, y los sin unidad al final', orden('asc') === 'caebd', orden('asc'))
  chk('descendente: Dolce, Cucuruchos, y los sin unidad SIGUEN al final', orden('desc') === 'aecbd', orden('desc'))
  chk('"Unidad" está entre las opciones del celular, en los dos sentidos', S.COLUMNAS_ORDEN.some(c => c.id === 'unidad' && c.nombre === 'Unidad' && c.tipo === 'texto'))
  S.pintarOrdenMovil()
  const sel = S.__doc.getElementById('chq-orden-campo').innerHTML
  chk('el select del celular la ofrece A → Z y Z → A', /value="unidad:asc">Unidad ▲ A → Z</.test(sel) && /value="unidad:desc">Unidad ▼ Z → A</.test(sel), sel)
  chk('valorDeOrden: sin unidad es null (el dato falta), no el texto "Sin unidad"', S.valorDeOrden(filas[1], 'unidad', cobs) === null)
}

// ── El filtro por unidad ─────────────────────────────────────────────────
// Desde el 28/09/2026 lo decide la barra de unidad de arriba: el selector de
// acá se retiró. Lo que estas pruebas exigían del filtro (en la pantalla, sin
// volver a consultar, lo sin unidad, limpiar la selección) lo exige ahora
// pruebas/test-cheques-barra-unidad.js, con la barra.

// ── La consulta ──────────────────────────────────────────────────────────
{
  const S = construirCheques(ARCHIVO, { funciones: ['cargarCheques'], stubs: [] , preludioExtra: PRELUDIO_LISTENERS })
  S.__set((tabla) => tabla === 'cobranza_cheques' ? filas : [...cobs.values()])
  esperas.push(S.cargarCheques().then(() => {
    const q = S.__consultas.find(c => c.tabla === 'v_cobranzas')
    const sel = q && q.llamadas.find(l => l[0] === 'select')
    chk('v_cobranzas trae unidad_negocio_id y unidad_negocio_nombre', sel && /\bunidad_negocio_id\b/.test(sel[1]) && /\bunidad_negocio_nombre\b/.test(sel[1]), sel && sel[1])
    chk('sin embed (la vista resuelve el nombre)', sel && !/\(/.test(sel[1]))
    chk('la unidad llega a la tabla', /title="Dolce Pasta">Dolce Pasta</.test(S.__doc.getElementById('chq-tabla').innerHTML))
  }))
  const R = nuevo()
  R.__set(filas)
  esperas.push(R.cargarResumenCheques().then(() => {
    const q = R.__consultas.find(c => c.tabla === 'cobranza_cheques')
    const sel = q && q.llamadas.find(l => l[0] === 'select')
    chk('el resumen (TODOS los cheques) trae cobranza_id', sel && /\bcobranza_id\b/.test(sel[1]), sel && sel[1])
    chk('y guarda las filas para calcular el total con la unidad de la barra', Array.isArray(R.estado.filasResumen) && R.estado.filasResumen.length === filas.length)
  }))
}

// ── El resumen de la selección ───────────────────────────────────────────
{
  const S = nuevo()
  S.estado.filas = [...filas, { ...base, id: 'x', cobranza_id: 'cx', numero: '9', fecha_emision: '2026-09-09', importe: 7 }]
  S.estado.cobranzas = cobs
  S.__doc.getElementById('chq-barra-seleccion').offsetHeight = 150
  S.estado.seleccion = { activa: true, ids: new Set(['a', 'b', 'c', 'd', 'e']), ultimo: null, noPueden: new Set() }
  S.pintarSeleccion()
  const el = S.__doc.getElementById('chq-sel-unidades')
  // formatearImporte separa "$" del número con un espacio duro: se compara
  // con espacios comunes.
  const lineas = el.textContent.replace(/ /g, ' ').split('\n')
  chk('más de una unidad: una línea por unidad', lineas.length === 3, el.textContent)
  chk('"nombre · N cheques · $ total", en centavos (0,10 + 1.000 = 1.000,10)', lineas.includes('Dolce Pasta · 2 cheques · $ 1.000,10'), el.textContent)
  chk('singular: "1 cheque"', lineas.includes('Cucuruchos Nuss · 1 cheque · $ 100,00'), el.textContent)
  chk('"Sin unidad" cuenta como una unidad (y va al final)', lineas.at(-1) === 'Sin unidad · 2 cheques · $ 5,20', el.textContent)
  chk('las unidades por nombre', lineas[0].startsWith('Cucuruchos Nuss') && lineas[1].startsWith('Dolce Pasta'))
  chk('se muestra', el.hidden === false)
  chk('va por textContent, nunca innerHTML', el.innerHTML === '')
  chk('la barra deja su alto para que no tape la lista', S.__doc.body.style.__v['--chq-alto-barra'] === '150px', JSON.stringify(S.__doc.body.style.__v))

  S.estado.seleccion.ids = new Set(['a', 'e'])
  S.pintarSeleccion()
  chk('una sola unidad: solo su nombre, sin desglose', el.textContent === 'Dolce Pasta', el.textContent)
  S.estado.seleccion.ids = new Set(['b', 'd'])
  S.pintarSeleccion()
  chk('todos sin unidad: "Sin unidad"', el.textContent === 'Sin unidad', el.textContent)
  S.estado.seleccion.ids = new Set(['x', 'a'])
  S.pintarSeleccion()
  chk('un nombre con HTML va tal cual por textContent (el navegador no lo interpreta)',
    el.textContent.split('\n').some(l => l.startsWith(marca('unidad_nombre') + ' · 1 cheque')) && el.innerHTML === '', el.textContent)
  S.estado.seleccion.ids = new Set()
  S.pintarSeleccion()
  chk('sin nada elegido: escondido y vacío', el.hidden === true && el.textContent === '')
  // 0,07 × 100 da 7,000000000000001 en punto flotante: se suma en centavos.
  const d = S.desgloseUnidades([{ cobranza_id: 'c1', importe: 0.07 }, { cobranza_id: 'c1', importe: 0.14 }], cobs)
  chk('desgloseUnidades suma en centavos exactos (0,07 + 0,14 = 0,21)', d.length === 1 && d[0].total === 0.21, JSON.stringify(d))
  // "Sin unidad" va al final aunque haya una unidad que venga después por el
  // alfabeto ("Taller" > "Sin unidad").
  const cobsT = new Map([...cobs, ['ct', { id: 'ct', unidad_negocio_id: 'ut', unidad_negocio_nombre: 'Taller' }]])
  const dT = S.desgloseUnidades([{ cobranza_id: 'c3', importe: 1 }, { cobranza_id: 'ct', importe: 1 }], cobsT).map(g => g.nombre)
  chk('desglose: "Sin unidad" siempre al final, también después de "Taller"', JSON.stringify(dT) === JSON.stringify(['Taller', 'Sin unidad']), JSON.stringify(dT))
  const regla = (CSS.match(/body\.chq-con-barra \.chq-contenedor \{ padding-bottom: max\(([^}]*)\}/) || [])[1] || ''
  chk('css: el espacio de abajo sigue el alto real de la barra', /var\(--chq-alto-barra/.test(regla), regla)
  chk('css: el desglose respeta los saltos de línea', /white-space: pre-line/.test((CSS.match(/\.chq-barra__unidades \{([^}]*)\}/) || [])[1] || ''))
}

// ── La tarjeta del celular ───────────────────────────────────────────────
{
  const S = nuevo()
  const t = S.htmlTarjetaCheque({ ...base, id: 'x', cobranza_id: 'cx', numero: '9', fecha_emision: '2026-09-09', importe: 1 }, cobs.get('cx'))
  chk('tarjeta: la unidad en el title, escapada', t.includes(`title="${S.esc('Unidad: ' + marca('unidad_nombre'))}"`), t.slice(0, 300))
  chk('tarjeta: y como texto oculto para el lector de pantalla', t.includes(`<span class="chq-oculto">${S.esc('Unidad: ' + marca('unidad_nombre'))}</span>`))
  chk('tarjeta: ninguna marca cruda', !/<b data-xss=/.test(t))
  const sin = S.htmlTarjetaCheque({ ...base, id: 'y', cobranza_id: 'c3', numero: '9', fecha_emision: '2026-09-09', importe: 1 }, cobs.get('c3'))
  chk('tarjeta sin unidad: "Unidad: Sin unidad"', /title="Unidad: Sin unidad"/.test(sin) && /<span class="chq-oculto">Unidad: Sin unidad<\/span>/.test(sin))
  chk('tarjeta: la unidad NO se suma al renglón de abajo (no entra a 390px)', !/Unidad/.test((sin.match(/<div class="chq-tarjeta__l2">([\s\S]*?)<\/div>/) || [])[1] || ''))
}

Promise.all(esperas.map(p => p.catch(err => chk('rama async sin excepción', false, String(err && err.stack || err))))).then(() => {
  for (const f of fallas) console.log('  ✗ ' + f)
  console.log(`${ok}/${ok + fallas.length}${fallas.length ? '  ROJO' : '  verde'}`)
  process.exit(fallas.length ? 1 : 0)
})
