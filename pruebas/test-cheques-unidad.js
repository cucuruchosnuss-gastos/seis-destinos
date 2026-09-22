// Tarea A2 del módulo Cheques (22/09/2026): la unidad de negocio de cada
// cheque, que es la de SU COBRANZA (v_cobranzas.unidad_negocio_id y
// unidad_negocio_nombre; cobranzas.unidad_negocio_id se decide al asentarla y
// puede faltar).
//
//   - la columna "Unidad", ordenable, con "Sin unidad" en gris y lo sin dato
//     al final en los dos sentidos;
//   - el filtro por unidad (Todas / cada unidad / Sin unidad), que se aplica
//     en la pantalla, se guarda en sessionStorage y limpia la selección;
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

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/cheques.html')
const FUENTE = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${FUENTE.length} bytes)`)
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

// ── El filtro: se aplica en la pantalla ───────────────────────────────────
{
  const S = nuevo()
  S.estado.filas = filas
  S.estado.cobranzas = cobs
  const vis = () => S.filasVisibles().map(x => x.id).join('')
  chk('sin filtro: todos', vis() === 'abcde', vis())
  S.estado.filtros.unidad = U1
  chk('una unidad: solo sus cheques', vis() === 'ae', vis())
  S.estado.filtros.unidad = S.SIN_UNIDAD
  chk('"Sin unidad": los sin unidad y los de una cobranza que no se ve', vis() === 'bd', vis())
  chk('con el filtro puesto, cuenta como filtro (aparece "Limpiar filtros")', S.hayFiltrosCheques() === true)
  S.estado.filtros.unidad = U1
  S.estado.filtros.soloVencen = true
  S.estado.filas = [
    { ...base, id: 'v1', cobranza_id: 'c1', numero: '7', fecha_emision: '2026-01-01', importe: 1 },
    { ...base, id: 'v2', cobranza_id: 'c2', numero: '8', fecha_emision: '2026-01-01', importe: 1 },
    { ...base, id: 'n1', cobranza_id: 'c1', numero: '6', fecha_emision: S.hoyArgentina(), importe: 1 },
  ]
  chk('se combina con "solo los que vencen"', vis() === 'v1', vis())
  S.renderizarCheques()
  const tabla = S.__doc.getElementById('chq-tabla').innerHTML
  chk('la tabla dibuja solo lo filtrado', /data-cheque-fila="v1"/.test(tabla) && !/data-cheque-fila="v2"/.test(tabla) && !/data-cheque-fila="n1"/.test(tabla))
  chk('la lista del celular también', /data-cheque-fila="v1"/.test(S.__doc.getElementById('chq-lista').innerHTML) && !/data-cheque-fila="v2"/.test(S.__doc.getElementById('chq-lista').innerHTML))
  S.estado.filtros.soloVencen = false
  S.estado.filtros.unidad = UX
  S.estado.filas = filas
  S.renderizarCheques()
  chk('ninguno de esa unidad: "No hay cheques con esos filtros."', S.__doc.getElementById('chq-vacio').textContent === 'No hay cheques con esos filtros.' && S.__doc.getElementById('chq-vacio').hidden === false)

  // Limpiar filtros: el estado Y el select.
  S.__doc.getElementById('chq-filtro-unidad').value = UX
  S.limpiarFiltrosCheques()
  chk('limpiar filtros saca la unidad, en el estado y en el select', S.estado.filtros.unidad === '' && S.__doc.getElementById('chq-filtro-unidad').value === '')
  chk('y hayFiltrosCheques vuelve a false', S.hayFiltrosCheques() === false)
}

// ── Las opciones del selector: de TODOS los cheques ──────────────────────
{
  const S = nuevo()
  S.estado.cobranzas = cobs
  // Los ids de cobranza vienen del resumen (todos los cheques, sin filtros),
  // NO de estado.filas (lo filtrado).
  S.estado.cobranzaIdsDeCheques = ['c1', 'c2', 'c3', 'cx', 'c1']
  S.estado.filas = [filas[0]]
  S.pintarSelectorUnidades()
  const sel = S.__doc.getElementById('chq-filtro-unidad')
  const opciones = [...sel.innerHTML.matchAll(/<option value="([^"]*)">([^<]*)<\/option>/g)].map(m => [m[1], m[2]])
  chk('primero "Todas las unidades" (valor vacío)', opciones[0] && opciones[0][0] === '' && opciones[0][1] === 'Todas las unidades', JSON.stringify(opciones))
  chk('último "Sin unidad"', opciones.at(-1) && opciones.at(-1)[0] === S.SIN_UNIDAD && opciones.at(-1)[1] === 'Sin unidad')
  const nombres = opciones.slice(1, -1).map(o => o[1])
  chk('una opción por unidad, sin repetir, por nombre, aunque lo filtrado tenga una sola',
    nombres.length === 3 && nombres[1] === 'Cucuruchos Nuss' && nombres[2] === 'Dolce Pasta' && nombres[0] === S.esc(marca('unidad_nombre')), JSON.stringify(nombres))
  chk('el nombre va ESCAPADO en la opción', sel.innerHTML.includes(escapada('unidad_nombre')) && !/<b data-xss=/.test(sel.innerHTML))
  chk('el valor de cada opción es el id de la unidad', opciones.some(o => o[0] === U1 && o[1] === 'Dolce Pasta'))
  // Un id raro (la base lo da como uuid, pero la pantalla no lo supone).
  const Sy = nuevo()
  Sy.estado.cobranzas = new Map([['cy', { id: 'cy', unidad_negocio_id: marca('unidad_id'), unidad_negocio_nombre: 'Y' }], ['c3', cobs.get('c3')]])
  Sy.estado.cobranzaIdsDeCheques = ['cy', 'c3']
  Sy.pintarSelectorUnidades()
  chk('el id de la unidad va ESCAPADO en el value', Sy.__doc.getElementById('chq-filtro-unidad').innerHTML.includes(`value="${Sy.esc(marca('unidad_id'))}"`) &&
    !/<b data-xss=/.test(Sy.__doc.getElementById('chq-filtro-unidad').innerHTML))
  chk('con dos o más grupos, el campo se ve', S.__doc.getElementById('chq-campo-unidad').hidden === false)

  const S2 = nuevo()
  S2.estado.cobranzas = cobs
  S2.estado.cobranzaIdsDeCheques = ['c3']
  S2.pintarSelectorUnidades()
  chk('todos sin unidad (un solo grupo): el campo no se dibuja (no filtra nada)', S2.__doc.getElementById('chq-campo-unidad').hidden === true)
  S2.estado.filtros.unidad = S2.SIN_UNIDAD
  S2.pintarSelectorUnidades()
  chk('pero con el filtro puesto se ve, para poder sacarlo', S2.__doc.getElementById('chq-campo-unidad').hidden === false &&
    S2.__doc.getElementById('chq-filtro-unidad').value === S2.SIN_UNIDAD)
  S2.estado.filtros.unidad = U2
  S2.pintarSelectorUnidades()
  chk('una unidad elegida que ya no tiene cheques sigue como opción, con su nombre', /<option value="22222222-2222-4222-8222-222222222222">Cucuruchos Nuss<\/option>/.test(S2.__doc.getElementById('chq-filtro-unidad').innerHTML) &&
    S2.__doc.getElementById('chq-filtro-unidad').value === U2)
  const S3 = nuevo()
  S3.estado.cobranzaIdsDeCheques = []
  S3.pintarSelectorUnidades()
  chk('sin ningún cheque: el campo no se dibuja', S3.__doc.getElementById('chq-campo-unidad').hidden === true)
}

// ── El cambio del selector: guarda, limpia la selección, no consulta ──────
{
  const S = nuevo({ funciones: ['conectarTodo'] })
  S.estado.filas = filas
  S.estado.cobranzas = cobs
  S.conectarTodo()
  S.estado.seleccion = { activa: true, ids: new Set(['a', 'b']), ultimo: 'b', noPueden: new Set() }
  const antes = S.__llamadas.cargarCheques
  const sel = S.__doc.getElementById('chq-filtro-unidad')
  const handlers = sel.__l?.change || []
  chk('el selector de unidad tiene su "change"', handlers.length === 1, handlers.length)
  handlers.forEach(f => f({ target: { value: U1 } }))
  chk('cambiarlo pone el filtro', S.estado.filtros.unidad === U1)
  chk('y se guarda en sessionStorage', JSON.parse(S.__almacen.get('cheques-preferencias') || '{}').filtros?.unidad === U1)
  chk('limpia la selección', S.estado.seleccion.ids.size === 0)
  chk('con el aviso de que se limpió', S.__doc.getElementById('chq-aviso-seleccion').hidden === false &&
    /Se limpió la selección/.test(S.__doc.getElementById('chq-aviso-seleccion').textContent))
  chk('redibuja con el filtro (no vuelve a consultar)', /data-cheque-fila="a"/.test(S.__doc.getElementById('chq-tabla').innerHTML) &&
    !/data-cheque-fila="c"/.test(S.__doc.getElementById('chq-tabla').innerHTML) && S.__llamadas.cargarCheques === antes)
  chk('aparece "Limpiar filtros"', S.__doc.getElementById('chq-btn-limpiar').hidden === false)
}

// ── Preferencias ─────────────────────────────────────────────────────────
{
  const S = nuevo()
  S.estado.filtros.unidad = U2
  S.guardarPreferencias()
  const S2 = nuevo()
  S2.__almacen.set('cheques-preferencias', S.__almacen.get('cheques-preferencias'))
  S2.leerPreferencias()
  chk('preferencias: la unidad vuelve', S2.estado.filtros.unidad === U2, S2.estado.filtros.unidad)
  const S3 = nuevo()
  S3.__almacen.set('cheques-preferencias', JSON.stringify({ filtros: { estado: 'todos', unidad: S3.SIN_UNIDAD } }))
  S3.leerPreferencias()
  chk('preferencias: "Sin unidad" vuelve', S3.estado.filtros.unidad === S3.SIN_UNIDAD)
  for (const raro of ['"><b>', 'u1', 42, '11111111-1111-4111-8111-11111111111Z']) {
    const S4 = nuevo()
    S4.__almacen.set('cheques-preferencias', JSON.stringify({ filtros: { estado: 'todos', unidad: raro } }))
    S4.leerPreferencias()
    chk(`preferencias: una unidad rara guardada (${JSON.stringify(raro)}) NO entra`, S4.estado.filtros.unidad === '', S4.estado.filtros.unidad)
  }
}

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
    chk('y arma la lista de cobranzas con cheques, sin repetir', JSON.stringify(R.estado.cobranzaIdsDeCheques) === JSON.stringify(['c1', 'c3', 'c2', 'c-invisible']), JSON.stringify(R.estado.cobranzaIdsDeCheques))
    chk('y pinta el selector de unidades', /Todas las unidades/.test(R.__doc.getElementById('chq-filtro-unidad').innerHTML))
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
