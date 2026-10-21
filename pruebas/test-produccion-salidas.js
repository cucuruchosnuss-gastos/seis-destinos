// Salidas entre fábricas (21/10/2026, pedido de Facu): en la gestión de
// Producción, desde el stock terminado, la vista de solo lectura que lee
// v_salidas_entre_fabricas (lo que una fábrica del grupo le mandó a otra;
// Mengui no lleva stock de producto terminado: es su registro de salidas).
// Lo que se prueba, EJECUTANDO el código real: el origen de entrada (Mengui),
// el mes actual de entrada, la consulta (columnas, origen, fechas, orden),
// el filtro de producto, los totales por producto (un dato ausente es "—",
// nunca 0), la tabla con las 7 columnas, el escape, el turno (una respuesta
// vieja no pisa la nueva), el error, el Excel (dos hojas, números como
// números) y que solo lee.
//
//   node pruebas/test-produccion-salidas.js
//   ARCHIVO_TEST=<copia de modulos/produccion-gestion.html> node pruebas/test-produccion-salidas.js
'use strict'

const path = require('path')
const fs = require('fs')
const { construirCon } = require('./sandbox')
const { arnes, leer } = require('./circuito-comun')
const { fuenteNumeros } = require('./numeros-comun')

const ARCHIVO = process.env.ARCHIVO_GESTION || process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos', 'produccion-gestion.html')
leer(ARCHIVO)
const HTML = fs.readFileSync(ARCHIVO, 'utf8')
const { chk, fin } = arnes()

const PRELUDIO = `
  var console = { log(){}, warn(){}, error(){} }
  ${fuenteNumeros()}
  var __consultas = []
  var __respuestas = []
  var __els = {}
  function __el(id) { return __els[id] ?? (__els[id] = { id, innerHTML: '', value: '', hidden: false, textContent: '', __on: {}, addEventListener(ev, fn) { this.__on[ev] = fn } }) }
  var __periodos = []
  function crearPeriodo(o) { __periodos.push(o) }
  function mostrarStockTerminado() { __vista = 'pr-stock' }
  var document = { getElementById: __el, createElement: () => ({}), head: { appendChild(){} } }
  var window = { XLSX: null }
  var __vista = null
  function mostrarVista(v) { __vista = v }
  // Un Supabase falso: anota cada consulta (tabla, columnas y filtros) y
  // contesta con la respuesta que le toque (una promesa que se resuelve sola).
  var supabase = {
    from(tabla) {
      const q = { tabla, select: null, filtros: [], orden: [] }
      __consultas.push(q)
      const r = __respuestas.shift() ?? { data: [], error: null }
      const p = (r instanceof Promise) ? r : Promise.resolve(r)
      const c = {
        select(cols) { q.select = cols; return c },
        eq(k, v) { q.filtros.push(['eq', k, v]); return c },
        gte(k, v) { q.filtros.push(['gte', k, v]); return c },
        lte(k, v) { q.filtros.push(['lte', k, v]); return c },
        order(k, o) { q.orden.push([k, o?.ascending]); return c },
        insert() { q.escribe = true; return c }, update() { q.escribe = true; return c }, delete() { q.escribe = true; return c },
        then(ok, mal) { return p.then(ok, mal) },
      }
      return c
    },
    rpc(n) { __consultas.push({ rpc: n }); return Promise.resolve({ data: null, error: null }) },
  }
  var estado = { unidades: new Map([['u-n', 'Cucuruchos Nuss'], ['u-d', 'Dolce Pasta'], ['u-m', 'Mengui']]) }
`
const FUNCIONES = ['esc', 'textoPlano', 'normalizarBusqueda','sumarMedido', 'textoEntero', 'fechaCorta', 'fechaDelDia', 'hoyArgentina',
  'origenesSalidas', 'origenPorDefectoSalidas', 'periodoMesSalidas', 'nuevasSalidas', 'productosDeSalidas', 'filtrarSalidas',
  'totalesSalidas', 'detalleSalida', 'htmlTotalesSalidas', 'htmlSalidas', 'abrirSalidas', 'pintarFiltrosSalidas',
  'pintarProductosSalidas', 'cargarSalidas', 'pintarSalidas', 'filasExcelSalidas', 'filasExcelTotalesSalidas',
  'nombreArchivoSalidas', 'cargarXlsxSalidas', 'exportarSalidas', 'conectarSalidas']

function sandbox() {
  return construirCon(ARCHIVO, {
    preludio: PRELUDIO, funciones: FUNCIONES, constantes: ['ZONA_AR', 'COLUMNAS_SALIDAS', 'LIBRERIA_XLSX_SALIDAS', 'TOPE_FILAS'],
    retorno: `COLUMNAS_SALIDAS, LIBRERIA_XLSX_SALIDAS, estado, window, __consultas, __respuestas, __els, __periodos, __vista: () => __vista`,
  })
}
const esperar = () => new Promise(r => setTimeout(r, 5))

const FILAS = [
  { id: 's1', fecha: '2026-10-20', created_at: '2026-10-20T15:00:00Z', unidad_origen_id: 'u-m', origen: 'Mengui', destino_id: 'u-d', destino: 'Dolce Pasta',
    producto: 'Cucurucho Mini', presentacion: 'Caja x 600', marca: 'LOLO', lote: 'M-77', cajas: 10, unidades: 6000, remito: 'R-0001-12', ingreso_id: 'i1', motivo: null },
  { id: 's2', fecha: '2026-10-18', created_at: '2026-10-18T15:00:00Z', unidad_origen_id: 'u-m', origen: 'Mengui', destino_id: 'u-n', destino: 'Cucuruchos Nuss',
    producto: 'Cucurucho Mini', presentacion: 'Caja x 600', marca: null, lote: 'M-76', cajas: 4, unidades: 2400, remito: null, ingreso_id: 'i2', motivo: null },
  { id: 's3', fecha: '2026-10-05', created_at: '2026-10-05T15:00:00Z', unidad_origen_id: 'u-m', origen: 'Mengui', destino_id: 'u-d', destino: 'Dolce Pasta',
    producto: 'Barquillo', presentacion: 'Caja x 100', marca: null, lote: 'B-1', cajas: 3, unidades: 300, remito: '  ', ingreso_id: 'i3', motivo: 'Pedido de Dolce' },
]

;(async () => {
  // ── Los valores de entrada ────────────────────────────────────────────
  {
    const S = sandbox()
    chk('el origen de entrada es Mengui (por su nombre)', S.origenPorDefectoSalidas(S.origenesSalidas()) === 'u-m')
    chk('sin Mengui: la primera fábrica', S.origenPorDefectoSalidas([{ id: 'u-n', nombre: 'Nuss' }, { id: 'u-d', nombre: 'Dolce' }]) === 'u-n')
    chk('sin ninguna fábrica: vacío', S.origenPorDefectoSalidas([]) === '')
    chk('Mengui se reconoce sin acentos ni mayúsculas', S.origenPorDefectoSalidas([{ id: 'a', nombre: 'Nuss' }, { id: 'b', nombre: 'Heladitos MENGUI' }]) === 'b')
    const p = S.periodoMesSalidas('2026-10-21')
    chk('el período de entrada es el mes actual (del 1º a hoy)', p.desde === '2026-10-01' && p.hasta === '2026-10-21', JSON.stringify(p))
    const n = S.nuevasSalidas('2026-02-14')
    chk('nuevasSalidas: Mengui, febrero del 1º al 14 y todos los productos', n.origenId === 'u-m' && n.desde === '2026-02-01' && n.hasta === '2026-02-14' && n.producto === '')
  }

  // ── La consulta ───────────────────────────────────────────────────────
  {
    const S = sandbox()
    S.__respuestas.push({ data: FILAS, error: null })
    await S.abrirSalidas()
    chk('abre la vista pr-salidas', S.__vista() === 'pr-salidas')
    const q = S.__consultas.find(c => c.tabla === 'v_salidas_entre_fabricas')
    chk('lee la vista v_salidas_entre_fabricas', !!q)
    chk('pide las columnas de la vista', q.select === S.COLUMNAS_SALIDAS && /\bremito\b/.test(q.select) && /\blote\b/.test(q.select) && /\bdestino\b/.test(q.select) && /\bmarca\b/.test(q.select))
    const hoy = S.hoyArgentina()
    chk('filtra por el origen elegido (Mengui) y por las fechas del mes', JSON.stringify(q.filtros) === JSON.stringify([['eq', 'unidad_origen_id', 'u-m'], ['gte', 'fecha', hoy.slice(0, 8) + '01'], ['lte', 'fecha', hoy]]), JSON.stringify(q.filtros))
    chk('lo más nuevo primero', JSON.stringify(q.orden) === JSON.stringify([['fecha', false], ['created_at', false]]))
    chk('es solo lectura: ninguna escritura ni RPC', S.__consultas.every(c => !c.escribe && !c.rpc))
    chk('el selector de origen con las fábricas y Mengui elegida', /<option value="u-m" selected>Mengui<\/option>/.test(S.__els['pr-sal-origen'].innerHTML))
    chk('las fechas puestas en los campos', S.__els['pr-sal-desde'].value === hoy.slice(0, 8) + '01' && S.__els['pr-sal-hasta'].value === hoy)
    chk('el selector de producto con "Todos" y los productos leídos', /<option value="">Todos los productos<\/option><option value="Barquillo">Barquillo<\/option><option value="Cucurucho Mini">Cucurucho Mini<\/option>/.test(S.__els['pr-sal-producto'].innerHTML), S.__els['pr-sal-producto'].innerHTML)

    // La tabla.
    const lista = S.__els['pr-sal-lista'].innerHTML
    chk('una fila por salida', (lista.match(/data-salida=/g) ?? []).length === 3)
    chk('las 7 columnas de la cabecera', /<span>Fecha<\/span><span>Producto<\/span><span>Lote<\/span><span class="pr-of-num">Cajas<\/span><span class="pr-of-num">Unidades<\/span><span>Destino<\/span><span>Remito<\/span>/.test(lista))
    const f1 = lista.split('data-salida=').find(x => x.startsWith('"s1"')) ?? ''
    chk('fila: fecha dd/mm/aaaa', /20\/10\/2026/.test(f1))
    chk('fila: producto con presentación y cono', /<strong>Cucurucho Mini<\/strong><span class="pr-texto-suave"> · Caja x 600 · LOLO<\/span>/.test(f1), f1.slice(0, 400))
    chk('fila: lote, cajas, unidades con punto de miles, destino y remito', /M-77/.test(f1) && />10</.test(f1) && />6\.000</.test(f1) && /Dolce Pasta/.test(f1) && /R-0001-12/.test(f1))
    const f3 = lista.split('data-salida=').find(x => x.startsWith('"s3"')) ?? ''
    chk('un remito vacío (o con espacios) dice "—"', /Remito<\/small>—</.test(f3), f3.slice(-200))
    const f2 = lista.split('data-salida=').find(x => x.startsWith('"s2"')) ?? ''
    chk('sin cono: solo la presentación', /<strong>Cucurucho Mini<\/strong><span class="pr-texto-suave"> · Caja x 600<\/span>/.test(f2))

    // Los totales por producto.
    const tot = S.__els['pr-sal-totales'].innerHTML
    chk('totales del período: 17 cajas · 8.700 unidades', /Totales del período<\/h2><span class="pr-of-grupo__total">17 cajas · 8\.700 unidades/.test(tot), tot.slice(0, 300))
    chk('por producto: Cucurucho Mini 14 cajas y 8.400 unidades', /data-sal-total="Cucurucho Mini"[\s\S]*?>14<\/span>[\s\S]*?>8\.400<\/span>/.test(tot))
    chk('por producto: Barquillo 3 cajas y 300 unidades', /data-sal-total="Barquillo"[\s\S]*?>3<\/span>[\s\S]*?>300<\/span>/.test(tot))
    chk('los productos en orden alfabético', tot.indexOf('data-sal-total="Barquillo"') < tot.indexOf('data-sal-total="Cucurucho Mini"'))

    // El filtro de producto: en la pantalla, sin volver a pedir.
    const antes = S.__consultas.length
    S.estado.salidas.producto = 'Barquillo'
    S.pintarSalidas()
    chk('filtrar por producto no vuelve a consultar', S.__consultas.length === antes)
    chk('… y muestra solo ese producto', (S.__els['pr-sal-lista'].innerHTML.match(/data-salida=/g) ?? []).length === 1 && /Barquillo/.test(S.__els['pr-sal-lista'].innerHTML))
    chk('… con sus totales', /3 cajas · 300 unidades/.test(S.__els['pr-sal-totales'].innerHTML) && !/Cucurucho Mini/.test(S.__els['pr-sal-totales'].innerHTML))
  }

  // ── Totales: un dato ausente no es 0 ──────────────────────────────────
  {
    const S = sandbox()
    const t = S.totalesSalidas([{ producto: 'A', cajas: 2, unidades: null }, { producto: 'A', cajas: 3, unidades: 10 }])
    chk('una cantidad ausente deja el total en null ("—"), nunca 0', t[0].cajas === 5 && t[0].unidades === null)
    chk('… y se ve "—"', /—<\/span><\/div>/.test(S.htmlTotalesSalidas(t)))
    chk('sin filas: sin totales', S.htmlTotalesSalidas([]) === '')
    chk('sin filas: "No hay salidas en este período."', /No hay salidas en este período\./.test(S.htmlSalidas([])))
    chk('filtrar sin producto devuelve todo', S.filtrarSalidas(FILAS, '').length === 3)
  }

  // ── El turno, el error y lo recortado ─────────────────────────────────
  {
    const S = sandbox()
    S.estado.salidas = S.nuevasSalidas('2026-10-21')
    let soltarVieja
    S.__respuestas.push(new Promise(r => { soltarVieja = () => r({ data: [FILAS[2]], error: null }) }))
    S.__respuestas.push({ data: FILAS, error: null })
    const vieja = S.cargarSalidas()
    S.estado.salidas.origenId = 'u-d'
    await S.cargarSalidas()
    soltarVieja(); await vieja; await esperar()
    chk('una respuesta vieja no pisa la nueva', S.estado.salidas.filas.length === 3)
    chk('la segunda consulta va con el origen nuevo', JSON.stringify(S.__consultas[1].filtros[0]) === JSON.stringify(['eq', 'unidad_origen_id', 'u-d']))
  }
  {
    const S = sandbox()
    S.estado.salidas = S.nuevasSalidas('2026-10-21')
    S.__respuestas.push({ data: null, error: { message: 'boom' } })
    await S.cargarSalidas()
    chk('si falla: lo dice (y no "No hay salidas")', /No se pudieron leer las salidas/.test(S.__els['pr-sal-aviso'].innerHTML) && S.__els['pr-sal-lista'].innerHTML === '')
    S.__respuestas.push({ data: Array.from({ length: 1000 }, (_, i) => ({ ...FILAS[0], id: 'x' + i })), error: null })
    await S.cargarSalidas()
    chk('con 1000 filas avisa que puede faltar', /más de 1000 salidas/.test(S.__els['pr-sal-aviso'].innerHTML))
  }
  {
    const S = sandbox()
    S.estado.salidas = { ...S.nuevasSalidas('2026-10-21'), filas: FILAS, producto: 'Ya no está' }
    S.pintarProductosSalidas()
    chk('un producto elegido que ya no está en lo leído se suelta', S.estado.salidas.producto === '')
  }

  // ── El escape ─────────────────────────────────────────────────────────
  {
    const S = sandbox()
    const malo = '<img src=x onerror=alert(1)>'
    const h = S.htmlSalidas([{ id: '"><b>', fecha: '2026-10-01', producto: malo, presentacion: malo, marca: malo, lote: malo, cajas: 1, unidades: 1, destino: malo, remito: malo }])
    chk('la tabla escapa todo texto de la base', !h.includes('<img') && !h.includes('"><b>') && h.includes('&lt;img'))
    const t = S.htmlTotalesSalidas(S.totalesSalidas([{ producto: malo, cajas: 1, unidades: 1 }]))
    chk('los totales también', !t.includes('<img') && t.includes('&lt;img'))
    S.estado.unidades = new Map([['u-x', malo]])
    S.estado.salidas = S.nuevasSalidas('2026-10-21')
    S.pintarFiltrosSalidas()
    chk('el selector de origen también', !S.__els['pr-sal-origen'].innerHTML.includes('<img'))
    S.estado.unidades = new Map([['"><img src=x>', 'Mengui']])
    S.estado.salidas = S.nuevasSalidas('2026-10-21')
    S.pintarFiltrosSalidas()
    chk('… también el id de la fábrica', !S.__els['pr-sal-origen'].innerHTML.includes('"><img'))
    S.estado.salidas.filas = [{ producto: malo }, { producto: '"><b>x' }]
    S.pintarProductosSalidas()
    chk('el selector de producto escapa el nombre (texto y valor)', !S.__els['pr-sal-producto'].innerHTML.includes('<img') && !S.__els['pr-sal-producto'].innerHTML.includes('"><b>'), S.__els['pr-sal-producto'].innerHTML)
  }

  // ── Los filtros de la pantalla (conectarSalidas) ──────────────────────
  {
    const S = sandbox()
    S.__respuestas.push({ data: FILAS, error: null })
    await S.abrirSalidas()
    S.conectarSalidas()
    chk('las fechas con el control de período, obligatorias', S.__periodos.length === 1 && S.__periodos[0].obligatorias === true && S.__periodos[0].desde === S.__els['pr-sal-desde'])
    const n = S.__consultas.length
    S.__els['pr-sal-producto'].__on.change({ target: { value: 'Barquillo' } })
    chk('elegir un producto NO vuelve a consultar', S.__consultas.length === n && S.estado.salidas.producto === 'Barquillo')
    chk('… y la tabla queda con ese producto', (S.__els['pr-sal-lista'].innerHTML.match(/data-salida=/g) ?? []).length === 1)
    S.__respuestas.push({ data: [], error: null })
    S.__els['pr-sal-origen'].__on.change({ target: { value: 'u-n' } })
    await esperar()
    chk('cambiar la fábrica de origen SÍ vuelve a consultar, con la nueva', S.__consultas.length === n + 1 && JSON.stringify(S.__consultas.at(-1).filtros[0]) === JSON.stringify(['eq', 'unidad_origen_id', 'u-n']))
    S.__respuestas.push({ data: [], error: null })
    S.__els['pr-sal-desde'].__on.change({ target: { value: '2026-09-01' } })
    await esperar()
    chk('cambiar la fecha también', JSON.stringify(S.__consultas.at(-1).filtros[1]) === JSON.stringify(['gte', 'fecha', '2026-09-01']))
    S.__els['pr-sal-volver'].__on.click()
    chk('"‹ Stock terminado" vuelve al stock', S.__vista() === 'pr-stock')
  }

  // ── El Excel ──────────────────────────────────────────────────────────
  {
    const S = sandbox()
    const filas = S.filasExcelSalidas(FILAS)
    chk('la hoja: la cabecera', JSON.stringify(filas[0]) === JSON.stringify(['Fecha', 'Origen', 'Destino', 'Producto', 'Presentación', 'Cono', 'Lote', 'Cajas', 'Unidades', 'Remito', 'Motivo']))
    chk('cada salida, con las cajas y unidades como NÚMEROS', JSON.stringify(filas[1]) === JSON.stringify(['20/10/2026', 'Mengui', 'Dolce Pasta', 'Cucurucho Mini', 'Caja x 600', 'LOLO', 'M-77', 10, 6000, 'R-0001-12', '']), JSON.stringify(filas[1]))
    chk('un número ausente queda vacío (no 0)', S.filasExcelSalidas([{ cajas: null, unidades: undefined }])[1][7] === '' && S.filasExcelSalidas([{ cajas: null }])[1][8] === '')
    const tot = S.filasExcelTotalesSalidas(S.totalesSalidas(FILAS))
    chk('la hoja de totales', JSON.stringify(tot) === JSON.stringify([['Producto', 'Cajas', 'Unidades'], ['Barquillo', 3, 300], ['Cucurucho Mini', 14, 8400]]), JSON.stringify(tot))
    S.estado.salidas = S.nuevasSalidas('2026-10-21')
    chk('el nombre del archivo', S.nombreArchivoSalidas(S.estado.salidas) === 'Salidas entre fábricas - Mengui 01-10-2026 a 21-10-2026.xlsx', S.nombreArchivoSalidas(S.estado.salidas))
    chk('SheetJS de cdnjs, con versión fija', /^https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/xlsx\/\d+\.\d+\.\d+\/xlsx\.full\.min\.js$/.test(S.LIBRERIA_XLSX_SALIDAS))

    // Exportar con un SheetJS falso.
    const libro = { hojas: [] }
    let escrito = null
    S.window.XLSX = {
      utils: { book_new: () => libro, aoa_to_sheet: a => ({ a }), book_append_sheet: (l, h, n) => l.hojas.push([n, h.a]) },
      writeFile: (l, n) => { escrito = n },
    }
    S.estado.salidas.filas = null
    await S.exportarSalidas()
    chk('sin leer todavía: lo dice', /Todavía no se leyeron/.test(S.estado.salidas.exportarError))
    S.estado.salidas.filas = []
    await S.exportarSalidas()
    chk('sin salidas: lo dice y no arma nada', /No hay salidas en este período para exportar/.test(S.estado.salidas.exportarError) && escrito === null)
    S.estado.salidas.filas = FILAS
    S.estado.salidas.producto = 'Cucurucho Mini'
    await S.exportarSalidas()
    chk('exporta dos hojas: Salidas y Totales por producto', JSON.stringify(libro.hojas.map(h => h[0])) === '["Salidas","Totales por producto"]')
    chk('exporta lo filtrado (solo el producto elegido)', libro.hojas[0][1].length === 3 && libro.hojas[1][1].length === 2)
    chk('… con el nombre del archivo', escrito === 'Salidas entre fábricas - Mengui 01-10-2026 a 21-10-2026.xlsx' && S.estado.salidas.exportarError === '')
  }

  // ── El HTML ───────────────────────────────────────────────────────────
  chk('el botón en el stock terminado', /<button type="button" class="pr-btn pr-btn--secundario pr-sal__abrir" id="pr-stock-salidas">Salidas entre fábricas<\/button>/.test(HTML))
  chk('la sección es una vista', /const VISTAS = \[[^\]]*'pr-salidas'/.test(HTML) && /<section id="pr-salidas" class="pr-of pr-sal" hidden>/.test(HTML))
  chk('en el menú cuenta como el stock', /estado\.vista === 'pr-salidas'\) return 'stock'/.test(HTML))
  chk('los cuatro filtros y el botón de exportar', ['pr-sal-origen', 'pr-sal-desde', 'pr-sal-hasta', 'pr-sal-producto', 'pr-sal-exportar'].every(id => HTML.includes(`id="${id}"`)))
  chk('las fechas con el control de período (obligatorias)', /crearPeriodo\(\{ desde: d, hasta: h, obligatorias: true \}\)\n    \}\n/.test(HTML))
  chk('se conecta con el stock terminado', /conectarIngreso\(\)\n      conectarSalidas\(\)/.test(HTML))
  chk('los campos a 16 px (sin zoom en el celular)', /\.pr-sal \.pr-input, \.pr-sal \.pr-select \{ font-size: 16px;/.test(HTML))
  chk('la tabla se acomoda al ancho de la SECCIÓN (container query), no al de la pantalla', /\.pr-sal \{ container-type: inline-size; \}/.test(HTML))
  chk('angosta: sin cabecera, en dos columnas y cada dato con su rótulo', /\.pr-sal \.pr-of-cab \{ display: none; \}\n    \.pr-of-salida, \.pr-of-sal-total \{ grid-template-columns: minmax\(0, 1fr\) minmax\(0, 1fr\);[\s\S]{0,400}\.pr-sal__rot \{ display: block;/.test(HTML))
  chk('desde 900 px de sección: la cabecera y las 7 columnas, sin rótulos', /@container \(min-width: 900px\) \{\n      \.pr-sal \.pr-of-cab \{ display: grid; \}\n      \.pr-of-salida \{ grid-template-columns: 6rem minmax\(0, 2fr\) minmax\(0, 1fr\) 4\.5rem 6rem minmax\(0, 1fr\) minmax\(0, 1fr\);[\s\S]{0,500}\.pr-sal__rot \{ display: none; \}/.test(HTML))

  fin()
})().catch(e => { console.error(e); process.exit(1) })
