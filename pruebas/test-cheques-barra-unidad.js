// La cartera de cheques y la BARRA DE UNIDAD de arriba (28/09/2026).
//
// La unidad ya no se elige adentro de Cheques: la decide la barra de toda la
// app (js/barra-unidad.js). Un cheque es de la unidad de SU COBRANZA
// (v_cobranzas.unidad_negocio_id). Lo que se exige, EJECUTANDO los renders:
//
//   - "Todas" (elegida null) muestra todo, y el total lleva el detalle por
//     unidad cuando hay más de un grupo;
//   - una unidad muestra solo lo suyo y los cheques SIN unidad (que no
//     desaparecen: se ven siempre, marcados), el total es SOLO el de la
//     unidad y los sin unidad se dicen aparte; "vencen esta semana" cuenta lo
//     que la lista muestra al tocarlo;
//   - antes de que lleguen las cobranzas, el total de una unidad dice
//     "calculando" (nunca el de todas como si fuera el de la unidad);
//   - cambiar la barra repinta SIN volver a consultar y limpia la selección;
//   - el selector "Unidad" propio ya no está (medido contra un commit fijo);
//   - la unidad no es un filtro de la pantalla ("Limpiar filtros" no la toca
//     y una unidad guardada por la versión vieja se ignora);
//   - el init lee la barra ANTES de la primera consulta y se suscribe.
//   - Cheques no tiene ninguna operación que necesite UNA unidad (dar salida
//     no depende de la unidad): se verifica que con Todas se puede igual.
//
//   node pruebas/test-cheques-barra-unidad.js

const path = require('path')
const { execFileSync } = require('child_process')
const { construirCheques } = require('./sandbox-cheques')
const { ARCHIVO_CHEQUES, leerCheques, regionCheques } = require('./fuente-cheques')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || ARCHIVO_CHEQUES
const FUENTE = leerCheques(ARCHIVO)
const CSS = FUENTE.slice(FUENTE.indexOf('<style>'), FUENTE.indexOf('</style>'))
// El commit FIJO de antes de este cambio (la barra ya existía, el selector
// de Cheques también). Nunca HEAD.
const BASE = '5592f5a'

let ok = 0
const fallas = []
const esperas = []
function chk(nombre, cond, detalle) { if (cond) ok++; else fallas.push(nombre + (detalle !== undefined ? ` — ${detalle}` : '')) }
const marca = (campo) => `"><b data-xss="${campo}">`

const PRELUDIO_LISTENERS = `
  var __getOrig = document.getElementById
  document.getElementById = function (id) {
    const el = __getOrig(id)
    if (!el.__l) { el.__l = {}; el.addEventListener = (t, f) => { (el.__l[t] = el.__l[t] || []).push(f) } }
    return el
  }
  document.body.style = { __v: {}, setProperty(k, v) { this.__v[k] = v } }
`
const nuevo = () => construirCheques(ARCHIVO, { preludioExtra: PRELUDIO_LISTENERS })

const U1 = '11111111-1111-4111-8111-111111111111'
const U2 = '22222222-2222-4222-8222-222222222222'
const cobs = new Map([
  ['c1', { id: 'c1', cliente: 'A', estado: 'procesada', fecha: '2026-09-01', unidad_negocio_id: U1, unidad_negocio_nombre: 'Dolce Pasta' }],
  ['c2', { id: 'c2', cliente: 'B', estado: 'procesada', fecha: '2026-09-01', unidad_negocio_id: U2, unidad_negocio_nombre: marca('unidad') }],
  ['c3', { id: 'c3', cliente: 'C', estado: 'registrada', fecha: '2026-09-01', unidad_negocio_id: null, unidad_negocio_nombre: null }],
])
const base = { banco_codigo: '007', tipo: 'comun', estado: 'en_cartera' }
const filas = [
  { ...base, id: 'a', cobranza_id: 'c1', numero: '1', fecha_emision: '2026-09-01', importe: 0.1 },
  { ...base, id: 'b', cobranza_id: 'c3', numero: '2', fecha_emision: '2026-09-02', importe: 0.2 },
  { ...base, id: 'c', cobranza_id: 'c2', numero: '3', fecha_emision: '2026-09-03', importe: 100 },
  { ...base, id: 'e', cobranza_id: 'c1', numero: '5', fecha_emision: '2026-09-05', importe: 1000 },
  { ...base, id: 's', cobranza_id: 'c1', numero: '6', fecha_emision: '2026-09-05', importe: 7, estado: 'depositado' },
]
const barraUnidades = [{ id: U1, nombre: 'Dolce Pasta', prefijo: 'D' }, { id: U2, nombre: 'Cucuruchos Nuss', prefijo: 'N' }]
function cargado(S, elegida) {
  S.estado.filas = filas
  S.estado.cobranzas = cobs
  S.estado.filasResumen = filas
  S.estado.cobranzasListas = true
  S.aplicarEleccionBarra({ elegida, unidades: barraUnidades })
  S.recalcularResumen()
  return S
}
const ids = (S) => S.filasVisibles().map(x => x.id).join('')

// ── Todas ────────────────────────────────────────────────────────────────
{
  const S = cargado(nuevo(), null)
  chk('Todas: se ven todos los cheques', ids(S) === 'abces', ids(S))
  chk('Todas: el total en cartera es la suma de TODO (en cartera, en centavos)', S.estado.cartera.cantidad === 4 && S.estado.cartera.total === 1100.3, JSON.stringify(S.estado.cartera))
  const d = S.estado.carteraDetalle?.desglose || []
  chk('Todas: el detalle por unidad (tres grupos: dos unidades y sin unidad)', d.length === 3, JSON.stringify(d))
  chk('Todas: el desglose deja "Sin unidad" al final', d.at(-1)?.nombre === 'Sin unidad')
  S.pintarCartera()
  const html = S.__doc.getElementById('chq-cartera').innerHTML
  chk('Todas: el título es "En cartera", sin unidad', /<div class="chq-cartera__k">En cartera<\/div>/.test(html), html)
  chk('Todas: el renglón del detalle nombra cada unidad con su total', /Dolce Pasta \$\s1\.000,10/.test(html.replace(/ /g, ' ')), html)
  chk('Todas: el nombre de la unidad va ESCAPADO', html.includes(S.esc(marca('unidad'))) && !/<b data-xss=/.test(html))
  // Sin las cobranzas todavía, no hay detalle (no se sabe de quién es cada uno).
  const S2 = nuevo()
  S2.estado.filasResumen = filas
  S2.recalcularResumen()
  chk('Todas sin cobranzas: el total igual, sin desglose inventado', S2.estado.cartera.total === 1100.3 && S2.estado.carteraDetalle === null)
  // Un solo grupo: el desglose no aporta nada y no se dibuja.
  const S3 = nuevo()
  S3.estado.cobranzas = cobs
  S3.estado.cobranzasListas = true
  S3.estado.filasResumen = [filas[0], filas[3]]
  S3.recalcularResumen()
  chk('Todas con una sola unidad presente: sin desglose', S3.estado.carteraDetalle === null)
}

// ── Una unidad ──────────────────────────────────────────────────────────
{
  const S = cargado(nuevo(), U1)
  chk('una unidad: solo lo suyo y los SIN unidad (no desaparecen)', ids(S) === 'abes', ids(S))
  chk('una unidad: el total en cartera es SOLO el de la unidad', S.estado.cartera.cantidad === 2 && S.estado.cartera.total === 1000.1, JSON.stringify(S.estado.cartera))
  chk('una unidad: los sin unidad aparte', S.estado.carteraDetalle?.sinUnidad?.cantidad === 1 && S.estado.carteraDetalle.sinUnidad.total === 0.2)
  chk('una unidad: el nombre de la unidad sale de la barra', S.estado.carteraDetalle?.unidad === 'Dolce Pasta')
  S.pintarCartera()
  const html = S.__doc.getElementById('chq-cartera').innerHTML.replace(/ /g, ' ')
  chk('una unidad: el título nombra la unidad', /<div class="chq-cartera__k">En cartera · Dolce Pasta<\/div>/.test(html), html)
  chk('una unidad: la línea de los sin unidad dice cuántos, cuánto y que no suman', /Además se ve 1 cheque sin unidad \(\$ 0,20\), que no suma acá/.test(html), html)
  chk('una unidad: sin el desglose de Todas', !/Cucuruchos|data-xss/.test(html))
  // La otra unidad: el nombre de la base (con HTML) va escapado en el título.
  const S2 = cargado(nuevo(), U2)
  S2.aplicarEleccionBarra({ elegida: U2, unidades: [] })   // no está en la barra: sale de las cobranzas
  S2.recalcularResumen()
  S2.pintarCartera()
  const h2 = S2.__doc.getElementById('chq-cartera').innerHTML
  chk('el nombre que sale de la cobranza va ESCAPADO en el título', h2.includes('En cartera · ' + S2.esc(marca('unidad'))) && !/<b data-xss=/.test(h2), h2)
  chk('una unidad que no aparece en ningún lado: "la unidad elegida"', (() => { const x = nuevo(); x.aplicarEleccionBarra({ elegida: 'otra', unidades: [] }); return x.nombreDeLaElegida() })() === 'la unidad elegida')
}

// ── Vencen esta semana ──────────────────────────────────────────────────
{
  const S = nuevo()
  const v1 = { ...base, id: 'v1', cobranza_id: 'c1', numero: '7', fecha_emision: '2026-01-01', importe: 10 }
  const v2 = { ...base, id: 'v2', cobranza_id: 'c2', numero: '8', fecha_emision: '2026-01-01', importe: 20 }
  const v3 = { ...base, id: 'v3', cobranza_id: 'c3', numero: '9', fecha_emision: '2026-01-01', importe: 30 }
  S.estado.cobranzas = cobs
  S.estado.cobranzasListas = true
  S.estado.filasResumen = [v1, v2, v3]
  S.recalcularResumen()
  chk('Todas: vencen los tres', S.estado.vencimientos.cantidad === 3 && S.estado.vencimientos.total === 60 && !S.estado.vencimientos.sinUnidad)
  S.aplicarEleccionBarra({ elegida: U1, unidades: barraUnidades })
  S.recalcularResumen()
  chk('una unidad: los suyos y los sin unidad (lo que muestra la lista al tocarlo)', S.estado.vencimientos.cantidad === 2 && S.estado.vencimientos.total === 40, JSON.stringify(S.estado.vencimientos))
  chk('y cuántos de esos son sin unidad', S.estado.vencimientos.sinUnidad === 1)
  const aviso = S.htmlAvisoVencimientos(S.estado.vencimientos, false).replace(/ /g, ' ')
  chk('el aviso lo dice: "· 1 sin unidad"', /2 cheques vencen esta semana \(2 ya vencidos\) · 1 sin unidad · \$ 40,00/.test(aviso), aviso)
  S.estado.filas = [v1, v2, v3]
  S.estado.filtros.soloVencen = true
  chk('tocarlo muestra esos mismos dos', ids(S) === 'v1v3', ids(S))
}

// ── Antes de que lleguen las cobranzas, y si fallan ──────────────────────
{
  const S = nuevo()
  S.aplicarEleccionBarra({ elegida: U1, unidades: barraUnidades })
  S.estado.filasResumen = filas
  S.recalcularResumen()
  chk('una unidad sin cobranzas todavía: "calculando", sin total ni vencimientos', S.estado.cartera === null && S.estado.vencimientos === null && S.estado.carteraDetalle?.cargando === true)
  const html = S.htmlCartera(S.estado.cartera, false, false, S.estado.carteraDetalle)
  chk('dice "Calculando el total de la unidad…" (y NUNCA el total de todas)', /Calculando el total de la unidad/.test(html) && !/1\.100/.test(html), html)
  S.estado.error = 'No se pudieron cargar los cheques. Revisá la señal.'
  S.recalcularResumen()
  const h2 = S.htmlCartera(S.estado.cartera, false, false, S.estado.carteraDetalle)
  chk('si la carga falló: "No se pudo calcular", no "calculando" para siempre', /No se pudo calcular/.test(h2) && !/Calculando/.test(h2), h2)
  const S2 = nuevo()
  S2.aplicarEleccionBarra({ elegida: U1, unidades: barraUnidades })
  S2.estado.filasResumen = null
  S2.recalcularResumen()
  chk('resumen que no se pudo cargar: todo en null, nunca un cero', S2.estado.cartera === null && S2.estado.vencimientos === null && S2.estado.carteraDetalle === null)
}

// ── Cambiar la barra con la pantalla abierta ─────────────────────────────
{
  const S = cargado(nuevo(), null)
  S.renderizarCheques()
  chk('Todas: la tabla dibuja el de la otra unidad', /data-cheque-fila="c"/.test(S.__doc.getElementById('chq-tabla').innerHTML))
  S.estado.seleccion = { activa: true, ids: new Set(['a', 'c']), ultimo: 'c', noPueden: new Set() }
  const consultas = S.__consultas.length, cargas = S.__llamadas.cargarCheques, refrescos = S.__llamadas.refrescar
  S.alCambiarLaBarra({ elegida: U1, unidades: barraUnidades })
  const tabla = S.__doc.getElementById('chq-tabla').innerHTML
  chk('cambiar la barra repinta: el de la otra unidad se va', !/data-cheque-fila="c"/.test(tabla) && /data-cheque-fila="a"/.test(tabla))
  chk('… y el sin unidad sigue', /data-cheque-fila="b"/.test(tabla))
  chk('la lista del celular también', !/data-cheque-fila="c"/.test(S.__doc.getElementById('chq-lista').innerHTML) && /data-cheque-fila="b"/.test(S.__doc.getElementById('chq-lista').innerHTML))
  chk('el total pasa a ser el de la unidad', /En cartera · Dolce Pasta/.test(S.__doc.getElementById('chq-cartera').innerHTML) && S.estado.cartera.total === 1000.1)
  chk('NO vuelve a consultar (la unidad se filtra en la pantalla)', S.__consultas.length === consultas && S.__llamadas.cargarCheques === cargas && S.__llamadas.refrescar === refrescos)
  chk('limpia la selección, con su aviso', S.estado.seleccion.ids.size === 0 && /Se limpió la selección/.test(S.__doc.getElementById('chq-aviso-seleccion').textContent))
  chk('la unidad no aparece como filtro ("Limpiar filtros" escondido)', S.__doc.getElementById('chq-btn-limpiar').hidden === true)
  // La misma elección otra vez: nada.
  S.estado.seleccion = { activa: true, ids: new Set(['a']), ultimo: 'a', noPueden: new Set() }
  S.alCambiarLaBarra({ elegida: U1, unidades: barraUnidades })
  chk('la misma unidad otra vez no limpia nada', S.estado.seleccion.ids.size === 1)
  S.alCambiarLaBarra({ elegida: null, unidades: barraUnidades })
  chk('volver a Todas: vuelve el de la otra unidad', /data-cheque-fila="c"/.test(S.__doc.getElementById('chq-tabla').innerHTML) && S.estado.unidadElegida === null)
  // Por el oyente de la barra (el mismo camino que usa la página).
  const S2 = cargado(nuevo(), null)
  S2.__oyentesBarra.push(S2.alCambiarLaBarra)
  S2.__barra.unidades = barraUnidades
  S2.__elegirEnBarra(U2)
  chk('el aviso de la barra llega y repinta', S2.estado.unidadElegida === U2 && !/data-cheque-fila="a"/.test(S2.__doc.getElementById('chq-tabla').innerHTML))
}

// ── La unidad no es un filtro de esta pantalla ───────────────────────────
{
  const S = cargado(nuevo(), U1)
  chk('hayFiltrosCheques no cuenta la unidad de la barra', S.hayFiltrosCheques() === false)
  S.estado.filtros.banco = '007'
  S.limpiarFiltrosCheques()
  chk('"Limpiar filtros" no toca la unidad de la barra', S.estado.unidadElegida === U1 && !('unidad' in S.estado.filtros))
  chk('los filtros por defecto no traen unidad', !('unidad' in S.FILTROS_CHEQUES_DEFECTO))
  S.guardarPreferencias()
  chk('las preferencias guardadas no llevan unidad', !('unidad' in JSON.parse(S.__almacen.get('cheques-preferencias')).filtros))
  const S2 = nuevo()
  S2.__almacen.set('cheques-preferencias', JSON.stringify({ filtros: { estado: 'todos', unidad: U2 } }))
  S2.leerPreferencias()
  chk('una unidad guardada por la versión vieja se ignora', !('unidad' in S2.estado.filtros) && S2.estado.unidadElegida === null && S2.estado.filtros.estado === 'todos')
}

// ── Lo sin unidad, marcado ───────────────────────────────────────────────
{
  const S = cargado(nuevo(), U1)
  const t = S.htmlTarjetaCheque(filas[1], cobs.get('c3'))
  const l2 = (t.match(/<div class="chq-tarjeta__l2">([\s\S]*?)<\/div>/) || [])[1] || ''
  chk('celular, con una unidad: el sin unidad lleva "Sin unidad" a la vista, primero', /^<span class="chq-tarjeta__dato chq-tarjeta__sin-unidad">Sin unidad<\/span>/.test(l2), l2)
  const suya = S.htmlTarjetaCheque(filas[0], cobs.get('c1'))
  chk('celular: uno de la unidad NO lleva la marca', !/chq-tarjeta__sin-unidad/.test(suya))
  const S2 = cargado(nuevo(), null)
  chk('celular, con Todas: sin la marca (como antes)', !/chq-tarjeta__sin-unidad/.test(S2.htmlTarjetaCheque(filas[1], cobs.get('c3'))))
  const regla = (CSS.match(/\.chq-tarjeta__sin-unidad \{([^}]*)\}/) || [])[1] || ''
  chk('css: la marca no se corta', /flex-shrink: 0/.test(regla), regla)
  const iDato = CSS.indexOf('.chq-tarjeta__dato {'), iMarca = CSS.indexOf('.chq-tarjeta__sin-unidad {')
  chk('css: la regla de la marca va DESPUÉS de la de .chq-tarjeta__dato', iDato >= 0 && iMarca > iDato)
  S.renderizarCheques()
  chk('tabla, con una unidad: el sin unidad se ve con su "Sin unidad" gris', /<span class="chq-sin-unidad">Sin unidad<\/span>/.test(S.__doc.getElementById('chq-tabla').innerHTML))
}

// ── Vacío y el cheque pedido de otra unidad ──────────────────────────────
{
  const S = nuevo()
  S.estado.cobranzas = cobs
  S.estado.cobranzasListas = true
  S.estado.filas = [filas[2]]
  S.aplicarEleccionBarra({ elegida: U1, unidades: barraUnidades })
  S.renderizarCheques()
  const v = S.__doc.getElementById('chq-vacio')
  chk('vacío con una unidad: lo dice y ofrece «Todas»', v.hidden === false && /No hay cheques en cartera\. Arriba está elegida Dolce Pasta: con «Todas» se ven los de todas las unidades\./.test(v.textContent), v.textContent)
  S.aplicarEleccionBarra({ elegida: null, unidades: barraUnidades })
  S.estado.filas = []
  S.renderizarCheques()
  chk('vacío con Todas: el texto de siempre', v.textContent === 'No hay cheques en cartera.', v.textContent)

  const D = cargado(nuevo(), U2)
  D.estado.destacado = 'a'
  D.renderizarCheques()
  chk('el cheque pedido (?cheque=) de otra unidad se muestra igual', /data-cheque-fila="a"/.test(D.__doc.getElementById('chq-tabla').innerHTML))
  const av = D.__doc.getElementById('chq-aviso')
  chk('… y se dice por qué está ahí', av.hidden === false && /El cheque que abriste es de Dolce Pasta: se muestra aunque arriba esté elegida Cucuruchos Nuss\./.test(av.textContent), av.textContent)
  chk('va por textContent', av.innerHTML === '')
  chk('los demás de esa unidad siguen afuera', !/data-cheque-fila="e"/.test(D.__doc.getElementById('chq-tabla').innerHTML))
  chk('el total sigue siendo el de la unidad elegida (el pedido no suma)', D.estado.cartera.total === 100)
  const D2 = cargado(nuevo(), U1)
  D2.estado.destacado = 'a'
  chk('pedido de la misma unidad: sin aviso', D2.avisoDestacadoOtraUnidad() === '')
}

// ── Operar con Todas: dar salida no pide unidad ──────────────────────────
{
  const S = cargado(nuevo(), null)
  S.estado.seleccion = { activa: true, ids: new Set(['a', 'c']), ultimo: null, noPueden: new Set() }
  chk('con Todas, se puede dar salida a cheques de dos unidades (no necesita una)', S.validarSalidaLote(S.chequesElegidos()).puede === true)
  chk('y "Dar salida" está en cada fila en cartera', S.accionSalida(filas[0], cobs.get('c1')) === 'dar' && S.accionSalida(filas[2], cobs.get('c2')) === 'dar')
}

// ── El selector viejo ya no está ─────────────────────────────────────────
{
  const antes = regionCheques(execFileSync('git', ['show', `${BASE}:modulos/administracion.html`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 << 20 }))
  chk(`en ${BASE} Cheques tenía su selector "Unidad" (si no, esta prueba no mide nada)`, /id="chq-filtro-unidad"/.test(antes))
  chk('hoy no está: ni el select, ni su caja, ni el código que lo pinta', !/chq-filtro-unidad|chq-campo-unidad|pintarSelectorUnidades/.test(FUENTE))
  chk('la región importa de la barra lo que usa', /import \{ unidadesDeLaBarra, alCambiarUnidad, pasaFiltroUnidad \} from '\.\.\/js\/barra-unidad\.js'/.test(FUENTE))
  chk('filtra con la regla de la barra (pasaFiltroUnidad), no con una copia', /pasaFiltroUnidad\(unidadDeCheque\(ch, cobranzas\)\?\.id \?\? null, elegida\)/.test(FUENTE))
}

// ── El init: lee la barra antes de consultar y se suscribe ───────────────
{
  const S = construirCheques(ARCHIVO, {
    funciones: ['init', 'conectarTodo', 'cargarBancos'],
    preludioExtra: PRELUDIO_LISTENERS + `
      async function verificarSesion() { return { user: { id: 'uid' } } }
      refrescarTodo = async function () { __llamadas.unidadAlRefrescar = estado.unidadElegida; __llamadas.refrescar++ }
    `,
    constantes: ['UUID'],
  })
  S.__barra.elegida = U1
  S.__barra.unidades = barraUnidades
  S.__set((tabla) => tabla === 'empleados' ? { id: 'emp-1', rol_app: 'usuario' }
    : tabla === 'empleado_tareas' ? [{ modulo: 'cobranzas', tarea: 'ver_todo' }] : [])
  esperas.push(S.init().then(() => {
    chk('init: la unidad de la barra queda aplicada', S.estado.unidadElegida === U1)
    chk('init: la primera carga ya sale con la unidad (nada de un instante con todas)', S.__llamadas.refrescar === 1 && S.__llamadas.unidadAlRefrescar === U1, S.__llamadas.unidadAlRefrescar)
    chk('init: se suscribe a los cambios de la barra', S.__oyentesBarra.length === 1)
  }))
}

Promise.all(esperas.map(p => p.catch(err => chk('rama async sin excepción', false, String(err && err.stack || err))))).then(() => {
  for (const f of fallas) console.log('  ✗ ' + f)
  console.log(`${ok}/${ok + fallas.length}${fallas.length ? '  ROJO' : '  verde'}`)
  process.exit(fallas.length ? 1 : 0)
})
