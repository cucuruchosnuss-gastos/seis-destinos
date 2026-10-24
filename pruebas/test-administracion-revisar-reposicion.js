// ADMINISTRACIÓN — Retiros por revisar: la REPOSICIÓN (24/10/2026).
//
// retiros_por_revisar(p_unidad) devuelve el 'tipo' de cada renglón (el de
// orden_retiro_items: 'retiro' | 'devolucion' | 'reposicion'; verificado con
// pg_get_functiondef el 24/10/2026). Lo que se le repone al cliente también
// sale del stock: si no estaba, queda por revisar y la tarjeta dice
// "Reposición" para que no se lea como una venta. Un retiro (o una fila sin
// 'tipo', como antes de que la base lo mandara) sigue igual que siempre.
//
//   node pruebas/test-administracion-revisar-reposicion.js
process.env.TZ = 'UTC'
const path = require('path')
const fs = require('fs')
const { construirAdministracion } = require('./sandbox-administracion')
const { arnes, marca, chequearMarcas } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/administracion.html')
const src = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${src.length} bytes)`)
const { chk, fin } = arnes()
const esperar = async () => { for (let i = 0; i < 6; i++) await new Promise(r => setImmediate(r)) }

const FILAS = [
  { item_id: 'it-1', orden_id: 'o1', codigo: 'N-0042', fecha: '2026-09-27', cliente: 'Distribuidora Anatolia', que: 'Cucurucho Mini · Caja x 600', pedidas: 42, faltante: 5, unidad: 'cajas', cargada_por: 'Emanuel', presentacion_id: 'pr1', marca_id: null, tipo: 'retiro' },
  { item_id: 'it-2', orden_id: 'o1', codigo: 'N-0042', fecha: '2026-09-27', cliente: 'Distribuidora Anatolia', que: 'Cucurucho chico · Caja x 320', pedidas: 2, faltante: 2, unidad: 'cajas', cargada_por: 'Emanuel', presentacion_id: 'pr2', marca_id: null, tipo: 'reposicion' },
  { item_id: 'it-3', orden_id: 'o2', codigo: 'N-0043', fecha: '2026-09-28', cliente: 'Kiosco Pepe', que: 'Cucurucho grande · Caja x 100', pedidas: 3, faltante: 1, unidad: 'cajas', cargada_por: null, presentacion_id: 'pr3', marca_id: null },
  { item_id: 'it-4', orden_id: 'o2', codigo: 'N-0043', fecha: '2026-09-28', cliente: 'Kiosco Pepe', que: 'Cucurucho grande · Caja x 100', pedidas: 3, faltante: 1, unidad: 'cajas', cargada_por: null, presentacion_id: 'pr3', marca_id: null, tipo: 'devolucion' },
]

function nuevo(filas = FILAS) {
  const S = construirAdministracion(ARCHIVO)
  S.__setRpc(async (n) => {
    if (n === 'retiros_por_revisar') return { data: filas.map(f => ({ ...f })), error: null }
    return { data: null, error: null }
  })
  return S
}
const html = (S) => S.__els.get('ad-revisar-lista')?.innerHTML ?? ''
// La tarjeta de un renglón (desde su data-revisar hasta la siguiente).
function tarjeta(h, id) {
  const i = h.indexOf(`data-revisar="${id}"`)
  if (i < 0) return ''
  const j = h.indexOf('data-revisar="', i + 10)
  return h.slice(i, j < 0 ? h.length : j)
}

async function pruebas() {
  // ── El ayudante ───────────────────────────────────────────────────────────
  {
    const S = nuevo()
    chk('esReposicionRevisar: reposicion → sí', S.esReposicionRevisar({ tipo: 'reposicion' }) === true)
    chk('esReposicionRevisar: retiro → no', S.esReposicionRevisar({ tipo: 'retiro' }) === false)
    chk('esReposicionRevisar: devolucion → no', S.esReposicionRevisar({ tipo: 'devolucion' }) === false)
    chk('esReposicionRevisar: sin tipo (la base vieja) → no', S.esReposicionRevisar({}) === false)
    chk('esReposicionRevisar: sin fila → no (no explota)', S.esReposicionRevisar(null) === false && S.esReposicionRevisar(undefined) === false)
    chk('esReposicionRevisar: mayúsculas no se inventan', S.esReposicionRevisar({ tipo: 'Reposicion' }) === false)
  }

  // ── La lista ──────────────────────────────────────────────────────────────
  {
    const S = nuevo()
    S.mostrarRevisar()
    await esperar()
    const h = html(S)
    const rep = tarjeta(h, 'it-2')
    chk('la reposición dice "Reposición"', /<span class="ad-sello ad-sello--dev">Reposición<\/span>/.test(rep))
    chk('el sello va antes de qué se llevó, en la misma línea', /ad-error-app__mensaje"><span class="ad-sello ad-sello--dev">Reposición<\/span> Cucurucho chico · Caja x 320<\/div>/.test(rep))
    chk('y sigue diciendo "Sin stock", el código y cuánto faltaba', /N-0042/.test(rep) && /Sin stock/.test(rep) && /Se llevó 2 cajas · faltaban 2 cajas en stock/.test(rep))
    chk('con sus botones de siempre', /data-revisar-produccion="it-2"/.test(rep) && /data-revisar-otro="it-2"/.test(rep) && /data-revisar-aceptar="it-2"/.test(rep))
    chk('un retiro NO dice "Reposición"', !/Reposición/.test(tarjeta(h, 'it-1')) && /Cucurucho Mini/.test(tarjeta(h, 'it-1')))
    chk('una fila sin tipo (la base vieja) NO dice "Reposición"', !/Reposición/.test(tarjeta(h, 'it-3')) && /Cucurucho grande/.test(tarjeta(h, 'it-3')))
    chk('una devolución tampoco (no sale del stock)', !/Reposición/.test(tarjeta(h, 'it-4')))
    chk('UN solo sello de reposición en toda la lista', (h.match(/>Reposición</g) || []).length === 1)
    chk('la cuenta incluye la reposición', S.__els.get('ad-revisar-cuenta').textContent === '4 renglones por revisar')
  }

  // ── Abierta la reposición, sigue marcada ──────────────────────────────────
  {
    const S = nuevo()
    S.mostrarRevisar()
    await esperar()
    S.abrirAceptarRevisar('it-2')
    const rep = tarjeta(html(S), 'it-2')
    chk('con el motivo abierto sigue diciendo "Reposición"', /id="ad-revisar-motivo"/.test(rep) && />Reposición</.test(rep))
  }

  // ── HTML malicioso ────────────────────────────────────────────────────────
  {
    const S = nuevo()
    const malas = [{ item_id: marca('item'), codigo: marca('codigo'), fecha: '2026-09-27', cliente: marca('cliente'), que: marca('que'), pedidas: 3, faltante: 1, unidad: marca('unidad'), cargada_por: marca('cargo'), tipo: 'reposicion', revision_motivo: marca('motivo-base') }]
    S.estado.revisar = { filas: malas, error: null, aceptando: { itemId: malas[0].item_id, motivo: marca('motivo'), error: marca('error'), enviando: false }, falt: null, hechos: [] }
    S.pintarRevisar()
    const h = html(S)
    chequearMarcas(chk, 'reposición por revisar', h, ['item', 'codigo', 'cliente', 'que', 'unidad', 'cargo', 'motivo-base', 'motivo', 'error'])
    chk('con texto malicioso igual dice "Reposición"', />Reposición</.test(h))
    const T = nuevo()
    T.estado.revisar = { filas: [{ ...malas[0], tipo: '<b data-xss="tipo">reposicion' }], error: null, aceptando: null, falt: null, hechos: [] }
    T.pintarRevisar()
    chk('un tipo raro no se pinta ni se toma por reposición', !/data-xss="tipo"/.test(html(T)) && !/>Reposición</.test(html(T)))
  }
}

pruebas().then(fin, (e) => { chk('las pruebas corren sin excepción', false, String(e && e.stack || e)); fin() })
