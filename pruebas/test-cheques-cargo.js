// Parte 4 del módulo Cheques (22/09/2026): la columna "Cargó", con el nombre
// de quien cargó la cobranza, escapado y ordenable.
//
//   node pruebas/test-cheques-cargo.js

const fs = require('fs')
const path = require('path')
const { construirCheques } = require('./sandbox-cheques')
const { ARCHIVO_CHEQUES, leerCheques } = require('./fuente-cheques')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || ARCHIVO_CHEQUES
// La cartera vive en una región de administracion.html: FUENTE es esa región.
const FUENTE = leerCheques(ARCHIVO)

let ok = 0
const fallas = []
const esperas = []
function chk(nombre, cond, detalle) { if (cond) ok++; else fallas.push(nombre + (detalle !== undefined ? ` — ${detalle}` : '')) }
const marca = (campo) => `"><b data-xss="${campo}">`
const escapada = (campo) => `&lt;b data-xss=&quot;${campo}&quot;&gt;`

const cobs = new Map([
  ['c1', { id: 'c1', cliente: 'A', estado: 'procesada', fecha: '2026-09-01', cargada_por_nombre: 'Yanina Godoy' }],
  ['c2', { id: 'c2', cliente: 'B', estado: 'procesada', fecha: '2026-09-01', cargada_por_nombre: 'Álvaro Pérez' }],
  ['c3', { id: 'c3', cliente: 'C', estado: 'procesada', fecha: '2026-09-01', cargada_por_nombre: marca('cargo_nombre') }],
  ['c4', { id: 'c4', cliente: 'D', estado: 'procesada', fecha: '2026-09-01', cargada_por_nombre: null }],
])
const base = { banco_codigo: '007', tipo: 'comun', importe: 10, estado: 'en_cartera' }
const filas = [
  { ...base, id: 'a', cobranza_id: 'c1', numero: '1', fecha_emision: '2026-09-01' },
  { ...base, id: 'b', cobranza_id: 'c2', numero: '2', fecha_emision: '2026-09-02' },
  { ...base, id: 'c', cobranza_id: 'c4', numero: '3', fecha_emision: '2026-09-03' },
  { ...base, id: 'd', cobranza_id: 'c3', numero: '4', fecha_emision: '2026-09-04' },
]

{
  const S = construirCheques(ARCHIVO)
  const html = S.htmlTablaCheques(filas, cobs)
  const ths = [...html.matchAll(/<th\b[^>]*>[\s\S]*?<\/th>/g)].map(m => m[0])
  const i = ths.findIndex(t => /data-orden="cargo"/.test(t))
  chk('hay columna "Cargó", ordenable', i >= 0 && />Cargó</.test(ths[i]))
  chk('va después de Cliente', i > 0 && /data-orden="cliente"/.test(ths[i - 1]))
  const celdas = (id) => {
    const k = html.indexOf(`data-cheque-fila="${id}"`)
    const tr = html.slice(k, html.indexOf('</tr>', k))
    return [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(x => x[1])
  }
  chk('la celda dice el nombre', celdas('a')[i] === 'Yanina Godoy', celdas('a')[i])
  chk('sin nombre dice —, no "null"', celdas('c')[i] === '—', celdas('c')[i])
  chk('el nombre va ESCAPADO en la celda', celdas('d')[i] === S.esc(marca('cargo_nombre')), celdas('d')[i])
  chk('y en el title', html.includes(`title="${S.esc(marca('cargo_nombre'))}"`) && html.includes(escapada('cargo_nombre')))
  chk('ninguna marca cruda', !/<b data-xss=/.test(html))
  chk('una cobranza que no se ve: —', !html.includes('undefined'))

  const orden = (sentido) => S.ordenarCheques(filas, { campo: 'cargo', sentido }, cobs).map(x => x.id).join('')
  // El nombre con la marca empieza con '"': localeCompare lo pone antes que
  // las letras. Álvaro < Yanina sin distinguir acentos; sin nombre al final.
  chk('ordena por quién cargó, en castellano (Álvaro antes que Yanina), sin nombre al final', orden('asc') === 'dbac', orden('asc'))
  chk('descendente: sin nombre sigue al final', orden('desc') === 'abdc', orden('desc'))
  chk('"Cargó" está entre las opciones del celular', S.COLUMNAS_ORDEN.some(c => c.id === 'cargo' && c.nombre === 'Cargó'))
}

// ── La consulta: v_cobranzas con cargada_por_nombre, sin embed ────────────
{
  const S = construirCheques(ARCHIVO, { funciones: ['cargarCheques'] })
  S.__set((tabla) => tabla === 'cobranza_cheques' ? filas : [...cobs.values()])
  esperas.push(S.cargarCheques().then(() => {
    const q = S.__consultas.find(c => c.tabla === 'v_cobranzas')
    const sel = q && q.llamadas.find(l => l[0] === 'select')
    chk('las cobranzas salen de v_cobranzas', !!q)
    chk('y traen cargada_por_nombre', sel && /cargada_por_nombre/.test(sel[1]), sel && sel[1])
    chk('sin embed a empleados (su RLS deja ver solo la fila propia)', sel && !/\(/.test(sel[1]))
    chk('ya no se consulta la tabla cobranzas directo', !S.__consultas.some(c => c.tabla === 'cobranzas'))
    chk('el nombre llega a la tabla', S.estado.cobranzas.get('c1')?.cargada_por_nombre === 'Yanina Godoy')
  }))
}

Promise.all(esperas.map(p => p.catch(err => chk('rama async sin excepción', false, String(err && err.stack || err))))).then(() => {
  for (const f of fallas) console.log('  ✗ ' + f)
  console.log(`${ok}/${ok + fallas.length}${fallas.length ? '  ROJO' : '  verde'}`)
  process.exit(fallas.length ? 1 : 0)
})
