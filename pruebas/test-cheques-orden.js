// Parte 3 del módulo Cheques (22/09/2026): ordenar por columna.
//
// Se EJECUTAN las funciones reales de modulos/cheques.html: el orden de cada
// columna y en los dos sentidos, lo sin dato siempre al final, el encabezado
// con ▲/▼ y aria-sort, el selector del celular, y que el orden sobreviva a
// filtrar y a la ida y vuelta a Cobranzas.
//
//   node pruebas/test-cheques-orden.js
//   ARCHIVO_TEST=/otra/copia.html node pruebas/test-cheques-orden.js

const fs = require('fs')
const path = require('path')
const { construirCheques } = require('./sandbox-cheques')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/cheques.html')
const FUENTE = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${FUENTE.length} bytes)`)

let ok = 0
const fallas = []
const esperas = []
function chk(nombre, cond, detalle) { if (cond) ok++; else fallas.push(nombre + (detalle !== undefined ? ` — ${detalle}` : '')) }

const cobs = new Map([
  ['c1', { id: 'c1', cliente: 'Zapata', estado: 'procesada', fecha: '2026-09-01' }],
  ['c2', { id: 'c2', cliente: 'álvarez', estado: 'procesada', fecha: '2026-09-01' }],
  ['c3', { id: 'c3', cliente: 'Molino', estado: 'registrada', fecha: '2026-09-01' }],
])
// importe como número y como texto (PostgREST devuelve numeric como número,
// pero un 9 contra un 100 tiene que compararse por monto y no por texto).
const filas = [
  { id: 'a', cobranza_id: 'c1', numero: '00000300', banco_codigo: '011', tipo: 'diferido', fecha_emision: '2026-08-01', fecha_pago: '2026-10-20', importe: 9, estado: 'en_cartera' },
  { id: 'b', cobranza_id: 'c2', numero: '00000100', banco_codigo: '007', tipo: 'comun', fecha_emision: '2026-09-05', fecha_pago: null, importe: 100, estado: 'depositado' },
  { id: 'c', cobranza_id: 'c3', numero: '00000200', banco_codigo: '285', tipo: 'diferido', fecha_emision: '2026-07-01', fecha_pago: '2026-09-30', importe: 1500.5, estado: 'endosado' },
  { id: 'd', cobranza_id: 'no-visible', numero: '00000400', banco_codigo: null, tipo: 'diferido', fecha_emision: null, fecha_pago: null, importe: null, estado: 'en_cartera' },
]
const bancos = new Map([['007', 'Zeta Banco'], ['011', 'Alfa Banco'], ['285', 'Medio Banco']])

{
  const S = construirCheques(ARCHIVO)
  S.estado.bancos = bancos
  const orden = (campo, sentido = 'asc') => S.ordenarCheques(filas, { campo, sentido }, cobs).map(x => x.id).join('')

  chk('por defecto: pago ascendente, y un común usa su emisión (b = 05/09 < c = 30/09 < a = 20/10)',
    S.ordenarCheques(filas, undefined, cobs).map(x => x.id).join('') === 'bcad', S.ordenarCheques(filas, undefined, cobs).map(x => x.id).join(''))
  chk('ORDEN_DEFECTO es pago ascendente', S.ORDEN_DEFECTO.campo === 'pago' && S.ORDEN_DEFECTO.sentido === 'asc')
  chk('pago descendente: lo sin fecha sigue AL FINAL', orden('pago', 'desc') === 'acbd', orden('pago', 'desc'))
  chk('número ascendente', orden('numero') === 'bcad', orden('numero'))
  chk('número descendente', orden('numero', 'desc') === 'dacb', orden('numero', 'desc'))
  chk('banco: por NOMBRE (Alfa < Medio < Zeta; por código el 007 iría primero), sin banco al final',
    orden('banco') === 'acbd', orden('banco'))
  chk('emisión: por fecha', orden('emision') === 'cabd', orden('emision'))
  chk('importe: por MONTO (9 < 100 < 1500,5), no por texto; sin importe al final', orden('importe') === 'abcd', orden('importe'))
  chk('importe descendente, sin importe al final igual', orden('importe', 'desc') === 'cbad', orden('importe', 'desc'))
  chk('cliente: localeCompare en castellano, "álvarez" antes que "Molino" y "Zapata"; sin cobranza visible al final',
    orden('cliente') === 'bcad', orden('cliente'))
  chk('estado: por la ETIQUETA (Depositado < En cartera < Endosado)', orden('estado') === 'bdac' || orden('estado') === 'badc',
    orden('estado'))
  chk('estado: a igual etiqueta desempata por fecha de cobro (a antes que d: d no tiene fecha)', orden('estado').indexOf('a') < orden('estado').indexOf('d'))
  chk('no muta el array de entrada', filas.map(x => x.id).join('') === 'abcd')
  chk('un campo desconocido cae al orden por defecto', S.ordenarCheques(filas, { campo: 'x', sentido: 'asc' }, cobs).map(x => x.id).join('') === 'bcad')

  // Mayúsculas y acentos no cuentan: "ÁLVAREZ" = "alvarez" y desempata por fecha.
  const iguales = S.ordenarCheques([
    { id: 'p', cobranza_id: 'x1', numero: '2', tipo: 'comun', fecha_emision: '2026-09-02' },
    { id: 'q', cobranza_id: 'x2', numero: '1', tipo: 'comun', fecha_emision: '2026-09-01' },
  ], { campo: 'cliente', sentido: 'asc' }, new Map([['x1', { cliente: 'ÁLVAREZ' }], ['x2', { cliente: 'alvarez' }]])).map(x => x.id).join('')
  chk('cliente: sin distinguir mayúsculas ni acentos (empate → fecha de cobro)', iguales === 'qp', iguales)

  // siguienteOrden
  chk('tocar la misma columna invierte', JSON.stringify(S.siguienteOrden({ campo: 'pago', sentido: 'asc' }, 'pago')) === '{"campo":"pago","sentido":"desc"}')
  chk('tocarla otra vez vuelve a ascendente', JSON.stringify(S.siguienteOrden({ campo: 'pago', sentido: 'desc' }, 'pago')) === '{"campo":"pago","sentido":"asc"}')
  chk('tocar otra columna la reemplaza, ascendente', JSON.stringify(S.siguienteOrden({ campo: 'pago', sentido: 'desc' }, 'importe')) === '{"campo":"importe","sentido":"asc"}')
}

// ── El encabezado ────────────────────────────────────────────────────────
{
  const S = construirCheques(ARCHIVO)
  S.estado.orden = { campo: 'importe', sentido: 'desc' }
  const html = S.htmlTablaCheques([], new Map())
  const ths = [...html.matchAll(/<th\b[^>]*>[\s\S]*?<\/th>/g)].map(m => m[0])
  const conOrden = ths.filter(t => /data-orden=/.test(t))
  chk('ocho columnas ordenables (sin contar Salida)', conOrden.length === 8, conOrden.length)
  const campos = conOrden.map(t => (t.match(/data-orden="([a-z]+)"/) || [])[1])
  chk('las columnas ordenables son las pedidas', JSON.stringify(campos) === JSON.stringify(['numero', 'banco', 'emision', 'pago', 'importe', 'cliente', 'cargo', 'estado']), JSON.stringify(campos))
  chk('Salida NO se ordena', /<th scope="col">Salida<\/th>/.test(html))
  const imp = conOrden.find(t => /data-orden="importe"/.test(t))
  chk('la columna activa lleva aria-sort="descending" y ▼', /aria-sort="descending"/.test(imp) && />▼</.test(imp), imp)
  chk('la activa se marca', /chq-th-orden--activo/.test(imp))
  const pago = conOrden.find(t => /data-orden="pago"/.test(t))
  chk('las otras llevan aria-sort="none" y sin flecha', /aria-sort="none"/.test(pago) && /aria-hidden="true"><\/span>/.test(pago), pago)
  S.estado.orden = { campo: 'pago', sentido: 'asc' }
  chk('ascendente: aria-sort="ascending" y ▲', /aria-sort="ascending"[^>]*><button[^>]*data-orden="pago">Pago<span[^>]*>▲</.test(S.htmlTablaCheques([], new Map())))
  chk('el título del número conserva el ° (HTML constante)', /N&deg; de cheque<span/.test(html))
  // htmlEncabezadoOrden recibe SOLO literales: el rótulo va sin escapar porque
  // lleva &deg;, y eso es seguro únicamente si nunca es un dato.
  const llamadas = [...FUENTE.matchAll(/htmlEncabezadoOrden\(([^)]*)\)/g)].map(m => m[1]).filter(a => !/^campo, rotulo/.test(a))
  chk('htmlEncabezadoOrden se llama solo con literales entre comillas simples',
    llamadas.length === 8 && llamadas.every(a => /^'[a-z]+', '[^'$`]*'(, '[a-z_-]*')?$/.test(a)), JSON.stringify(llamadas))
}

// ── aplicarOrden: reordena lo cargado, sin consultar, y lo guarda ─────────
{
  const S = construirCheques(ARCHIVO)
  S.estado.bancos = bancos
  S.estado.filas = [...filas]
  S.estado.cobranzas = cobs
  const antes = S.__llamadas.cargarCheques
  S.aplicarOrden({ campo: 'importe', sentido: 'desc' })
  chk('aplicarOrden: reordena la lista', S.estado.filas.map(x => x.id).join('') === 'cbad', S.estado.filas.map(x => x.id).join(''))
  chk('aplicarOrden: NO vuelve a consultar', S.__llamadas.cargarCheques === antes)
  chk('aplicarOrden: queda en el estado', S.estado.orden.campo === 'importe' && S.estado.orden.sentido === 'desc')
  chk('aplicarOrden: se guarda para la vuelta desde Cobranzas', JSON.parse(S.__almacen.get('cheques-preferencias')).orden.campo === 'importe')
  chk('aplicarOrden: la tabla se redibuja con el orden nuevo', /aria-sort="descending"[^>]*><button[^>]*data-orden="importe"/.test(S.__doc.getElementById('chq-tabla').innerHTML))
  S.aplicarOrden({ campo: '"><b>', sentido: 'asc' })
  chk('aplicarOrden: un campo inventado no se aplica', S.estado.orden.campo === 'importe')
  S.aplicarOrden({ campo: 'banco', sentido: 'loquesea' })
  chk('aplicarOrden: un sentido raro queda ascendente', S.estado.orden.sentido === 'asc')

  // El selector del celular.
  S.estado.orden = { campo: 'cliente', sentido: 'desc' }
  S.pintarOrdenMovil()
  const sel = S.__doc.getElementById('chq-orden-campo')
  chk('celular: el select tiene las mismas ocho opciones', (sel.innerHTML.match(/<option /g) || []).length === 8)
  chk('celular: marca la columna activa', sel.value === 'cliente')
  chk('celular: el botón dice el sentido', S.__doc.getElementById('chq-orden-sentido').textContent === '▼ Descendente')
  S.estado.orden.sentido = 'asc'; S.pintarOrdenMovil()
  chk('celular: ascendente', S.__doc.getElementById('chq-orden-sentido').textContent === '▲ Ascendente')
}

// ── El orden sobrevive a filtrar (cargarCheques real) ─────────────────────
{
  const S = construirCheques(ARCHIVO, { funciones: ['cargarCheques'] })
  S.estado.bancos = bancos
  S.estado.orden = { campo: 'importe', sentido: 'asc' }
  S.__set((tabla) => tabla === 'cobranza_cheques' ? filas : [...cobs.values()])
  esperas.push(S.cargarCheques().then(() => {
    chk('filtrar: la lista nueva viene con el orden elegido, no con el de defecto',
      S.estado.filas.map(x => x.id).join('') === 'abcd', S.estado.filas.map(x => x.id).join(''))
    chk('filtrar: el orden elegido no se pierde', S.estado.orden.campo === 'importe')
  }))
}

// ── Preferencias ─────────────────────────────────────────────────────────
{
  const S = construirCheques(ARCHIVO)
  S.__almacen.set('cheques-preferencias', JSON.stringify({ orden: { campo: 'banco', sentido: 'desc' } }))
  S.leerPreferencias()
  chk('preferencias: el orden vuelve', S.estado.orden.campo === 'banco' && S.estado.orden.sentido === 'desc')
  const S2 = construirCheques(ARCHIVO)
  S2.__almacen.set('cheques-preferencias', JSON.stringify({ orden: { campo: 'inventado', sentido: 'desc' } }))
  S2.leerPreferencias()
  chk('preferencias: un campo que no existe no entra', S2.estado.orden.campo === 'pago' && S2.estado.orden.sentido === 'asc')
}

// ── El tope: el orden es parcial y se dice ───────────────────────────────
{
  const S = construirCheques(ARCHIVO)
  S.estado.filas = [...filas]
  S.estado.tope = true
  S.renderizarCheques()
  chk('con 1000 filas se dice que el orden es solo sobre esas', /El orden es solo sobre esas/.test(S.__doc.getElementById('chq-aviso').textContent))
}

// ── CSS ──────────────────────────────────────────────────────────────────
{
  const css = FUENTE.slice(FUENTE.indexOf('<style>'), FUENTE.indexOf('</style>'))
  chk('css: el selector de orden del celular no se dibuja en escritorio',
    /@media \(min-width: 900px\) \{\s*\.chq-orden-movil \{ display: none; \}/.test(css))
  chk('css: el botón del sentido tiene 44px', /\.chq-orden-movil__sentido \{[^}]*min-height: 44px/.test(css))
}

Promise.all(esperas.map(p => p.catch(err => chk('rama async sin excepción', false, String(err && err.stack || err))))).then(() => {
  for (const f of fallas) console.log('  ✗ ' + f)
  console.log(`${ok}/${ok + fallas.length}${fallas.length ? '  ROJO' : '  verde'}`)
  process.exit(fallas.length ? 1 : 0)
})
