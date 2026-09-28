// ADMINISTRACIÓN — Retiros por revisar (28/09/2026), con retiros:precios.
//
// Los renglones de órdenes de retiro que salieron sin estar en stock
// (registrar_orden_retiro los deja 'pendiente'): se listan con
// retiros_por_revisar(p_unidad), con su número en la portada, y "Aceptar"
// pide el motivo y llama a resolver_faltante_retiro(p_item_id, p_motivo).
//
//   node pruebas/test-administracion-revisar.js
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
  { item_id: 'it-1', orden_id: 'o1', codigo: 'N-0042', fecha: '2026-09-27', cliente: 'Distribuidora Anatolia', que: 'Cucurucho Mini · Caja x 600 · LOLO', pedidas: 42, faltante: 5, unidad: 'cajas', cargada_por: 'Emanuel Romero' },
  { item_id: 'it-2', orden_id: 'o2', codigo: 'N-0043', fecha: '2026-09-28', cliente: 'Kiosco Pepe', que: 'Harina 000 Molino', pedidas: 30.5, faltante: 10.5, unidad: 'kg', cargada_por: 'Franco' },
]

function nuevo({ filas = FILAS, resolver = null } = {}) {
  const S = construirAdministracion(ARCHIVO)
  S.__setRpc(async (n, p) => {
    if (n === 'retiros_por_revisar') return typeof filas === 'function' ? filas(p) : { data: filas, error: null }
    if (n === 'resolver_faltante_retiro') return resolver ? resolver(p) : { data: null, error: null }
    return { data: null, error: null }
  })
  return S
}
const html = (S, id) => S.__els.get(id)?.innerHTML ?? ''

async function pruebas() {
  // ── Quién la ve ────────────────────────────────────────────────────────────
  {
    const S = nuevo()
    chk('con retiros:precios en la empresa se ve la sección', S.seccionesVisibles().some(s => s.id === 'revisar'))
    S.estado.misTareas = new Map([['retiros:ver', { todas: true }]])
    chk('con solo retiros:ver NO se ve', !S.seccionesVisibles().some(s => s.id === 'revisar'))
    S.estado.misTareas = new Map([['retiros:precios', { unidades: ['u-d'] }]])
    chk('con precios en OTRA empresa no se ve en ésta', !S.seccionesVisibles('u-n').some(s => s.id === 'revisar') && S.seccionesVisibles('u-d').some(s => s.id === 'revisar'))
    S.estado.miRolApp = 'super_admin'
    S.estado.misTareas = new Map()
    chk('super_admin la ve', S.seccionesVisibles().some(s => s.id === 'revisar'))
    const T = nuevo()
    T.estado.misTareas = new Map([['retiros:ver', { todas: true }]])
    T.mostrarRevisar()
    await esperar()
    chk('sin permiso, abrirla vuelve a la portada y no llama a la base', T.estado.vista === 'ad-vista-inicio' && !T.__llamadas.rpc.some(r => r[0] === 'retiros_por_revisar'))
  }

  // ── La portada: su número ──────────────────────────────────────────────────
  {
    const S = nuevo()
    await S.mostrarInicio()
    await esperar()
    const h = html(S, 'ad-secciones')
    const llamada = S.__llamadas.rpc.find(r => r[0] === 'retiros_por_revisar')
    chk('la portada cuenta los retiros por revisar de la empresa', !!llamada && llamada[1].p_unidad_negocio_id === 'u-n')
    chk('y muestra el número en la tarjeta, destacado', /data-seccion="revisar"[\s\S]*?ad-seccion__numero ad-seccion__numero--atencion">2</.test(h) && /renglones salieron sin estar en stock/.test(h))
    const U = nuevo({ filas: () => ({ data: null, error: { message: 'x' } }) })
    await U.mostrarInicio()
    await esperar()
    chk('si no se puede contar lo dice, nunca un 0', /data-seccion="revisar"[\s\S]*?ad-seccion__numero">—<[\s\S]*?No se pudo contar/.test(html(U, 'ad-secciones')))
    const V = nuevo({ filas: [] })
    await V.mostrarInicio()
    await esperar()
    chk('sin pendientes, 0 sin destacar', /data-seccion="revisar"[\s\S]*?ad-seccion__numero">0</.test(html(V, 'ad-secciones')))
  }

  // ── La lista ───────────────────────────────────────────────────────────────
  {
    const S = nuevo()
    S.abrirSeccion('revisar')
    chk('abre la vista', S.estado.vista === 'ad-vista-revisar')
    chk('mientras carga lo dice', /Cargando/.test(html(S, 'ad-revisar-lista')))
    await esperar()
    const h = html(S, 'ad-revisar-lista')
    chk('cada renglón con el CÓDIGO de la orden (nunca el número)', /N-0042/.test(h) && /N-0043/.test(h))
    chk('el cliente, la fecha y quién la cargó', /27\/09\/2026 · Distribuidora Anatolia · cargó Emanuel Romero/.test(h))
    chk('qué se llevó', /Cucurucho Mini · Caja x 600 · LOLO/.test(h))
    chk('cuánto se llevó y cuánto faltaba, en cajas', /Se llevó 42 cajas · faltaban 5 cajas en stock/.test(h))
    chk('y un insumo en su unidad', /Se llevó 30,5 kg · faltaban 10,5 kg en stock/.test(h))
    chk('un botón "Aceptar" por renglón', (h.match(/data-revisar-aceptar="/g) || []).length === 2)
    chk('la cuenta', S.__els.get('ad-revisar-cuenta').textContent === '2 renglones por revisar')
    const V = nuevo({ filas: [] })
    V.mostrarRevisar()
    await esperar()
    chk('sin nada por revisar lo dice', /No hay nada por revisar/.test(html(V, 'ad-revisar-lista')))
    const E = nuevo({ filas: () => ({ data: null, error: { message: 'x' } }) })
    E.mostrarRevisar()
    await esperar()
    chk('un error se dice en bordó', /ad-aviso--grave/.test(html(E, 'ad-revisar-lista')))
  }

  // ── Aceptar con el motivo ────────────────────────────────────────────────
  {
    let pedido = null
    const S = nuevo({ resolver: (p) => { pedido = p; return { data: null, error: null } } })
    S.mostrarRevisar()
    await esperar()
    S.abrirAceptarRevisar('it-1')
    let h = html(S, 'ad-revisar-lista')
    chk('"Aceptar" abre el motivo en ESE renglón', /id="ad-revisar-motivo"/.test(h) && h.indexOf('ad-revisar-motivo') > h.indexOf('N-0042') && h.indexOf('ad-revisar-motivo') < h.indexOf('N-0043'))
    chk('con el ejemplo del motivo', /se compró y no se cargó el ingreso/.test(h))
    S.abrirAceptarRevisar('no-existe')
    chk('un renglón que no está no se abre', S.estado.revisar.aceptando.itemId === 'it-1')
    S.__els.get('ad-revisar-motivo').value = '  no '
    await S.confirmarAceptarRevisar()
    chk('sin motivo (menos de 3 letras) NO llama a la base', pedido === null)
    chk('y lo dice pegado al botón', /ad-error-pegado">Escribí qué pasó/.test(html(S, 'ad-revisar-lista')))
    S.__els.get('ad-revisar-motivo').value = '  se compró y no se cargó el ingreso  '
    await S.confirmarAceptarRevisar()
    chk('con el motivo llama a resolver_faltante_retiro con el renglón y el motivo limpio', pedido && pedido.p_item_id === 'it-1' && pedido.p_motivo === 'se compró y no se cargó el ingreso')
    h = html(S, 'ad-revisar-lista')
    chk('el renglón aceptado sale de la lista', !/N-0042 ?</.test(h) && !/data-revisar="it-1"/.test(h) && /data-revisar="it-2"/.test(h))
    chk('y se dice que quedó aceptado', /Aceptado: N-0042/.test(h) && S.__llamadas.exitos.includes('Renglón aceptado.'))
    chk('la cuenta baja', S.__els.get('ad-revisar-cuenta').textContent === '1 renglón por revisar')
  }
  {
    const S = nuevo({ resolver: () => ({ data: null, error: { code: 'P0001', message: 'Ese renglón no tiene nada pendiente.' } }) })
    S.mostrarRevisar()
    await esperar()
    S.abrirAceptarRevisar('it-1')
    S.__els.get('ad-revisar-motivo').value = 'se compró'
    await S.confirmarAceptarRevisar()
    const h = html(S, 'ad-revisar-lista')
    chk('el error de la base va TAL CUAL, pegado al botón', /ad-error-pegado">Ese renglón no tiene nada pendiente\.</.test(h))
    chk('el renglón sigue en la lista y el botón se puede volver a tocar', /data-revisar="it-1"/.test(h) && !/id="ad-revisar-si" disabled/.test(h))
    S.cancelarAceptarRevisar()
    chk('"Cancelar" cierra el motivo', !/ad-revisar-motivo/.test(html(S, 'ad-revisar-lista')))
  }
  {
    // Un doble toque no manda dos veces.
    let veces = 0
    // TODOS los que esperan se sueltan: si un segundo envío pisara al primero,
    // la prueba se colgaría en vez de fallar.
    const esperando = []
    const soltar = () => esperando.splice(0).forEach(r => r({ data: null, error: null }))
    const S = nuevo({ resolver: () => { veces++; return new Promise(r => { esperando.push(r) }) } })
    S.mostrarRevisar()
    await esperar()
    S.abrirAceptarRevisar('it-2')
    S.__els.get('ad-revisar-motivo').value = 'se produjo y no se cargó'
    const p1 = S.confirmarAceptarRevisar()
    const p2 = S.confirmarAceptarRevisar()
    chk('mientras manda, el botón queda trabado', /id="ad-revisar-si" disabled/.test(html(S, 'ad-revisar-lista')))
    soltar(); await p1; await p2
    chk('un doble toque manda UNA sola vez', veces === 1)
  }

  {
    // Una respuesta vieja no pisa la nueva (se tocó "Actualizar" dos veces).
    const esperando = []
    let vez = 0
    const S = nuevo({ filas: () => { vez++; const mia = vez; return new Promise(r => esperando.push(() => r({ data: mia === 1 ? [FILAS[0]] : [FILAS[1]], error: null }))) } })
    S.mostrarRevisar()
    S.mostrarRevisar()
    esperando[1]()
    await esperar()
    esperando[0]()
    await esperar()
    chk('la respuesta vieja no pisa la nueva', S.estado.revisar.filas.length === 1 && S.estado.revisar.filas[0].item_id === 'it-2')
  }

  // ── El motivo no se pierde al tipear ──────────────────────────────────────
  chk('el motivo se guarda al tipear sin redibujar', /e\.target\.id === 'ad-revisar-motivo' && estado\.revisar\.aceptando\) estado\.revisar\.aceptando\.motivo = e\.target\.value/.test(src))

  // ── HTML malicioso ────────────────────────────────────────────────────────
  {
    const S = nuevo()
    const malas = [{ item_id: marca('item'), codigo: marca('codigo'), fecha: '2026-09-27', cliente: marca('cliente'), que: marca('que'), pedidas: 3, faltante: 1, unidad: marca('unidad'), cargada_por: marca('cargo') },
      { item_id: marca('item-2'), codigo: 'N-1', fecha: '2026-09-27', cliente: 'x', que: 'y', pedidas: 1, faltante: 1, unidad: 'cajas', cargada_por: null }]
    S.estado.revisar = { filas: malas, error: null, aceptando: { itemId: malas[0].item_id, motivo: marca('motivo'), error: marca('error'), enviando: false }, hechos: [marca('hecho')] }
    S.pintarRevisar()
    chequearMarcas(chk, 'retiros por revisar', html(S, 'ad-revisar-lista'), ['item', 'item-2', 'codigo', 'cliente', 'que', 'unidad', 'cargo', 'motivo', 'error', 'hecho'])
    chk('el botón "Aceptar" del otro renglón lleva su id escapado', html(S, 'ad-revisar-lista').includes('data-revisar-aceptar="&quot;&gt;&lt;b data-xss=&quot;item-2&quot;&gt;"'))
  }
}

pruebas().then(fin, (e) => { chk('las pruebas corren sin excepción', false, String(e && e.stack || e)); fin() })
