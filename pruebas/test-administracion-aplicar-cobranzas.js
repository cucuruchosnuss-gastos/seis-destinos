// ADMINISTRACIÓN → LA CUENTA DEL CLIENTE: PENDIENTES DESDE EL CORTE, APLICAR
// Y EL RECIBO (30/10/2026, rama ci-prueba/aplicar-cobranzas, parte B).
//
// Pedido de Facu: aplicar DESPUÉS, desde la cuenta del cliente, lo que quedó
// a cuenta (la cobranza que cargó un cobrador y el saldo a favor del corte),
// y el recibo de cada cobranza. Va en modulos/administracion.html, en
// #ad-cliente-cuerpo: Cuentas corrientes → Clientes la ve igual (embebida).
//  - "Pendientes desde el corte" solo si cliente_pendientes().activo; sin
//    corte, nada nuevo.
//  - Los docs con pendiente y los créditos con libre; "Aplicar" solo con
//    cobranzas:procesar; en los que no son cobranza, solo sin nada aplicado
//    (hueco de la base).
//  - aplicar_credito_cliente REEMPLAZA: se manda lo que ya tenía (de
//    recibo_cobranza().aplicaciones) MÁS lo nuevo. El error de la base, tal
//    cual; después se vuelven a leer cliente_pendientes y la cuenta.
//  - "Recibo" en la línea de la cobranza y en Pendientes: UNA hoja A4.
// Se EJECUTAN las funciones reales del módulo (sandbox-administracion.js).
//
//   node pruebas/test-administracion-aplicar-cobranzas.js
process.env.TZ = 'UTC'
const path = require('path')
const fs = require('fs')
const { construirAdministracion } = require('./sandbox-administracion')
const { arnes, marca, chequearMarcas } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/administracion.html')
const src = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${src.length} bytes)`)
const { chk, esperas, fin } = arnes()
const esperar = async () => { for (let i = 0; i < 25; i++) await new Promise(r => setImmediate(r)) }
const copia = (x) => JSON.parse(JSON.stringify(x))
const N = (s) => String(s ?? '').replace(/[  ]/g, ' ')
const texto = (h) => N(String(h ?? '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim())

const TODAS = ['retiros:ver', 'retiros:precios', 'cobranzas:procesar']

// La cuenta de J&M: el saldo a favor del corte, la orden N-0042 y una
// cobranza que cargó el cobrador (cb-1).
const CUENTA = [
  { fecha: '2026-11-01', tipo: 'saldo_inicial', detalle: 'Saldo al corte', importe: -20000, saldo: -20000, orden_retiro_id: null },
  { fecha: '2026-11-03', tipo: 'retiro', detalle: 'Orden de retiro N-0042', importe: 180000, saldo: 160000, orden_retiro_id: 'o-42' },
  { fecha: '2026-11-05', tipo: 'cobranza', detalle: 'Cobranza del 05/11/2026', importe: -120000, saldo: 40000, orden_retiro_id: null },
]
const MOVS = [
  { fecha: '2026-11-01', tipo: 'saldo_inicial', importe: -20000, cobranza_id: null, cargado_en: '2026-11-01T12:00:00Z' },
  { fecha: '2026-11-03', tipo: 'retiro', importe: 180000, cobranza_id: null, cargado_en: '2026-11-03T12:00:00Z' },
  { fecha: '2026-11-05', tipo: 'cobranza', importe: -120000, cobranza_id: 'cb-1', cargado_en: '2026-11-05T12:00:00Z' },
]
const D = (doc_tipo, doc_id, parte, etiqueta, fecha, monto, aplicado = 0) => ({ doc_tipo, doc_id, parte, etiqueta, fecha, orden_id: null, monto, aplicado, pendiente: monto - aplicado })
const DOCS = [
  D('orden', 'o-42', 'N1', 'N1-0042', '2026-11-03', 100000, 30000),
  D('orden', 'o-42', 'N2', 'N2-0042', '2026-11-03', 80000),
  D('nota_debito', 'nd-1', 'total', 'Nota de débito N-ND-0001', '2026-11-04', 30000),
  D('orden', 'o-40', 'total', 'Orden N-0040', '2026-11-02', 10000, 10000),
]
const K = (credito_tipo, credito_id, etiqueta, fecha, monto, aplicado, medios = null, apm = null) => ({ credito_tipo, credito_id, etiqueta, fecha, monto, aplicado, libre: monto - aplicado, medios, aplicado_por_medio: apm })
const CREDITOS = [
  K('corte', 'cli-1', 'Saldo a favor al corte', '2026-11-01', 20000, 0),
  K('cobranza', 'cb-1', 'Cobranza del 05/11/2026', '2026-11-05', 120000, 0, { cheque: 0, transferencia: 100000, efectivo: 20000 }, null),
  K('cobranza', 'cb-2', 'Cobranza del 06/11/2026', '2026-11-06', 50000, 30000, { cheque: 50000, transferencia: 0, efectivo: 0 }, { cheque: 30000 }),
  K('movimiento', 'mv-9', 'Ajuste a favor', '2026-11-07', 5000, 1000),
  K('cobranza', 'cb-0', 'Cobranza del 02/11/2026', '2026-11-02', 10000, 10000, { cheque: 0, transferencia: 0, efectivo: 10000 }, { efectivo: 10000 }),
]
const RECIBO_CB2 = {
  empresa: { nombre: 'Cucuruchos Nuss', razon_social: 'CUCURUCHOS NUSS SRL', cuit: '30712345671', domicilio: 'Av. Siempre Viva 123', logo_url: 'logo-cucuruchos-nuss.png' },
  cliente: { id: 'cli-1', nombre: 'J&M', razon_social: 'J Y M SA', cuit: '30999999993', solo_n2: false },
  fecha: '2026-11-06', estado: 'procesada',
  cheques: [{ banco: 'BANCO DE GALICIA Y BUENOS AIRES S.A.U.', banco_codigo: '007', numero: '66259862', tipo: 'diferido', emision: '2026-11-01', pago: '2026-12-15', importe: 50000, echeq: false }],
  transferencias: [], efectivo: 0, medios: { cheque: 50000, transferencia: 0, efectivo: 0 }, total: 50000,
  aplicaciones: [{ etiqueta: 'N1-0042', parte: 'N1', doc_tipo: 'orden', doc_id: 'o-42', fecha: '2026-11-03', monto_doc: 100000, aplicado: 30000, medios: { cheque: 30000 } }],
  a_cuenta: 20000, saldo_cuenta: 40000,
}

function sugerir(docs, p) {
  let resta = Math.round(p.p_monto * 100)
  const items = []
  for (const d of docs) {
    if (resta <= 0) break
    const pend = Math.round(d.pendiente * 100)
    if (!(pend > 0) || (p.p_parte && d.parte !== p.p_parte)) continue
    const toma = Math.min(resta, pend)
    items.push({ doc_tipo: d.doc_tipo, doc_id: d.doc_id, parte: d.parte, etiqueta: d.etiqueta, monto: toma / 100 })
    resta -= toma
  }
  return { items, sobra: Math.max(resta, 0) / 100 }
}

// corte: si cliente_pendientes dice activo. rpc: respuestas que pisan las de siempre.
function nuevo({ tareas = TODAS, corte = true, docs = DOCS, creditos = CREDITOS, rpc = {}, movs = MOVS } = {}) {
  const S = construirAdministracion(ARCHIVO)
  S.estado.misTareas = new Map(tareas.map(t => [t, { todas: true }]))
  S.estado.unidadBarra = 'u-n'
  S.__tablas.clientes = [{ id: 'cli-1', nombre: 'J&M', razon_social: 'J Y M SA', cuit: '30999999993', activo: true, unidad_negocio_id: 'u-n' }]
  S.__tablas.cliente_movimientos = copia(movs)
  S.__tablas.ordenes_retiro = [{ id: 'o-42', codigo: 'N-0042' }]
  S.__setRpc(async (n, p) => {
    if (Object.prototype.hasOwnProperty.call(rpc, n)) return typeof rpc[n] === 'function' ? rpc[n](p) : rpc[n]
    if (n === 'cuenta_cliente') return { data: copia(CUENTA), error: null }
    if (n === 'cliente_pendientes') return { data: { activo: corte, imputa_desde: corte ? '2026-11-01T03:00:00+00:00' : null, saldo_cuenta: 40000, docs: corte ? copia(docs) : [], creditos: corte ? copia(creditos) : [] }, error: null }
    if (n === 'sugerir_aplicacion') return { data: sugerir(docs, p), error: null }
    if (n === 'aplicar_credito_cliente') {
      const k = creditos.find(x => x.credito_tipo === p.p_credito_tipo && x.credito_id === p.p_credito_id)
      const aplicado = p.p_items.reduce((s, x) => s + Math.round(x.monto * 100), 0) / 100
      return { data: { aplicado, a_cuenta: (k?.monto ?? 0) - aplicado }, error: null }
    }
    if (n === 'recibo_cobranza') return { data: copia({ ...RECIBO_CB2, _id: p.p_cobranza_id }), error: null }
    if (n === 'cuenta_cliente_consolidada') return { data: [], error: null }
    return { data: null, error: null }
  })
  return S
}
const cuerpo = (S) => S.__els.get('ad-cliente-cuerpo')?.innerHTML ?? ''
const rpcs = (S, nombre) => S.__llamadas.rpc.filter(r => r[0] === nombre)
// Un toque sobre un elemento con estos data-* (como lo ve alTocarPendientesAd).
const toque = (dataset) => ({ target: { closest: () => ({ dataset }) } })

esperas.push((async () => {
  // ── Un cliente SIN corte no ve nada nuevo ─────────────────────────────────
  {
    const S = nuevo({ corte: false })
    await S.abrirCliente('cli-1')
    await esperar()
    const h = cuerpo(S)
    chk('sin corte: se pregunta una vez si tiene corte (cliente_pendientes)', rpcs(S, 'cliente_pendientes').length === 1 && rpcs(S, 'cliente_pendientes')[0][1].p_cliente_id === 'cli-1')
    chk('sin corte: no aparece la sección', !/ad-pend|Pendientes desde el corte/.test(h))
    chk('sin corte: la cobranza de la cuenta no tiene "Recibo"', !/data-ad-recibo|>Recibo</.test(h))
    chk('sin corte: ningún botón ni atributo nuevo', !/data-ad-/.test(h))
    const conPend = S.htmlCuenta(S.estado.cliente)
    const sinPend = S.htmlCuenta({ ...S.estado.cliente, pend: undefined })
    chk('sin corte: la cuenta es EXACTAMENTE la de antes', conPend === sinPend)
    chk('sin corte: no se sugiere, ni se lee un recibo, ni se aplica', !rpcs(S, 'sugerir_aplicacion').length && !rpcs(S, 'recibo_cobranza').length && !rpcs(S, 'aplicar_credito_cliente').length)
    // Sin permiso para leer las imputaciones: ni se pregunta.
    const S2 = nuevo({ tareas: ['retiros:ver'] })
    await S2.abrirCliente('cli-1')
    await esperar()
    chk('sin cobranzas:procesar ni retiros:precios: no se llama a cliente_pendientes', !rpcs(S2, 'cliente_pendientes').length)
    chk('sin cobranzas:procesar ni retiros:precios: nada nuevo', !/data-ad-|ad-pend/.test(cuerpo(S2)))
    // Sin datos (la respuesta vacía): nada.
    const S3 = nuevo({ rpc: { cliente_pendientes: { data: null, error: null } } })
    await S3.abrirCliente('cli-1')
    await esperar()
    chk('respuesta vacía: nada nuevo', !/data-ad-|ad-pend/.test(cuerpo(S3)))
  }

  // ── Con corte: la sección ─────────────────────────────────────────────────
  {
    const S = nuevo()
    await S.abrirCliente('cli-1')
    await esperar()
    const h = cuerpo(S)
    const t = texto(h)
    chk('con corte: la sección "Pendientes desde el corte"', /id="ad-pend"/.test(h) && t.includes('Pendientes desde el corte'))
    chk('con corte: la sección va antes de los movimientos', h.indexOf('id="ad-pend"') < h.indexOf('Orden de retiro N-0042'))
    const docsEn = [...h.matchAll(/data-ad-pend-doc="([^"]*)"/g)].map(m => m[1])
    chk('los docs con pendiente > 0, en orden (el ya pagado no)', docsEn.join() === 'orden|o-42|N1,orden|o-42|N2,nota_debito|nd-1|total', docsEn.join())
    chk('cada doc: etiqueta, fecha, monto y pendiente', t.includes('N1-0042 03/11/2026 · Monto $ 100.000,00 Pendiente $ 70.000,00'), t)
    const credEn = [...h.matchAll(/data-ad-pend-credito="([^"]*)"/g)].map(m => m[1])
    chk('los créditos con libre > 0 (el ya aplicado entero no)', credEn.join() === 'corte|cli-1,cobranza|cb-1,cobranza|cb-2,movimiento|mv-9', credEn.join())
    chk('cada crédito: etiqueta, fecha, monto, aplicado y libre', t.includes('Cobranza del 06/11/2026 06/11/2026 · Monto $ 50.000,00 · Aplicado $ 30.000,00 Libre $ 20.000,00'), t)
    const aplicar = [...h.matchAll(/data-ad-aplicar="([^"]*)"/g)].map(m => m[1])
    chk('"Aplicar" en el corte y en las cobranzas (aunque una tenga algo aplicado)', aplicar.join() === 'corte|cli-1,cobranza|cb-1,cobranza|cb-2', aplicar.join())
    chk('el hueco de la base: un crédito que no es cobranza con algo aplicado dice el texto y no ofrece "Aplicar"',
      t.includes('Ajuste a favor') && h.includes('Este crédito ya tiene una parte aplicada: para seguir aplicando falta una función de la base') && !aplicar.includes('movimiento|mv-9'))
    chk('el texto del hueco aparece UNA vez (solo en ese crédito)', h.split('falta una función de la base').length - 1 === 1)
    const recibos = [...h.matchAll(/data-ad-recibo="([^"]*)"/g)].map(m => m[1])
    chk('"Recibo" en las cobranzas de Pendientes y en la línea de la cobranza de la cuenta', recibos.join() === 'cb-1,cb-2,cb-1', recibos.join())
    chk('la línea de la cobranza (la que tiene cobranza_id) lleva su "Recibo" justo después', /data-cuenta-cobranza="cb-1"[\s\S]*?<\/button><div class="ad-rc-linea"><button type="button" class="ad-btn ad-btn--suave" data-ad-recibo="cb-1">Recibo<\/button><\/div>/.test(h))
    chk('las otras líneas no llevan "Recibo"', h.split('class="ad-rc-linea"').length - 1 === 1)
    // Solo con retiros:precios: se ve, pero sin "Aplicar" ni el texto del hueco.
    const S2 = nuevo({ tareas: ['retiros:ver', 'retiros:precios'] })
    await S2.abrirCliente('cli-1')
    await esperar()
    const h2 = cuerpo(S2)
    chk('sin cobranzas:procesar: la sección se ve', /id="ad-pend"/.test(h2))
    chk('sin cobranzas:procesar: no se ofrece "Aplicar" ni el texto del hueco', !/data-ad-aplicar/.test(h2) && !h2.includes('falta una función de la base'))
    chk('sin cobranzas:procesar: el recibo sí', /data-ad-recibo="cb-1"/.test(h2))
    S2.estado.cliente.aplicar = null
    await S2.abrirAplicarAd('cobranza|cb-1')
    chk('sin cobranzas:procesar: abrir el selector no hace nada', !S2.estado.cliente.aplicar)
    // Nada pendiente.
    const S3 = nuevo({ docs: [], creditos: [] })
    await S3.abrirCliente('cli-1')
    await esperar()
    chk('con corte y nada pendiente: lo dice', texto(cuerpo(S3)).includes('Nada pendiente: lo de después del corte está todo aplicado.'))
    // La lectura falla: un aviso con "Volver a intentar".
    let veces = 0
    const S4 = nuevo({ rpc: { cliente_pendientes: () => (++veces === 1 ? { data: null, error: { message: 'sin red' } } : { data: { activo: true, docs: copia(DOCS), creditos: copia(CREDITOS) }, error: null }) } })
    await S4.abrirCliente('cli-1')
    await esperar()
    chk('si falla la lectura: lo dice, con "Volver a intentar"', texto(cuerpo(S4)).includes('No se pudo ver si el cliente tiene cobranzas para aplicar (sin red).') && /data-ad-pend-reintentar/.test(cuerpo(S4)))
    chk('si falla la lectura: el aviso se ve (no está escondido)', cuerpo(S4).includes('<div class="ad-aviso" id="ad-pend">No se pudo ver'))
    S4.alTocarPendientesAd(toque({ adPendReintentar: '' }))
    await esperar()
    chk('"Volver a intentar" vuelve a leer y muestra la sección', veces === 2 && /id="ad-pend"/.test(cuerpo(S4)))
  }

  // ── Aplicar la cobranza de un cobrador (nada aplicado) ────────────────────
  {
    const S = nuevo()
    await S.abrirCliente('cli-1')
    await esperar()
    const antesPend = rpcs(S, 'cliente_pendientes').length
    const antesCuenta = rpcs(S, 'cuenta_cliente').length
    S.alTocarPendientesAd(toque({ adAplicar: 'cobranza|cb-1' }))
    await esperar()
    const c = S.estado.cliente
    chk('cobrador: se abre el selector debajo de su crédito', c.aplicar?.clave === 'cobranza|cb-1' && /data-ad-pend-credito="cobranza\|cb-1"[\s\S]*id="ad-apl"/.test(cuerpo(S)))
    chk('cobrador: sin nada aplicado no hace falta leer el recibo', !rpcs(S, 'recibo_cobranza').length)
    const sug = rpcs(S, 'sugerir_aplicacion')
    chk('cobrador: "Aplicar todo" sugiere con lo libre (sugerir_aplicacion)', sug.length === 1 && JSON.stringify(sug[0][1]) === JSON.stringify({ p_cliente_id: 'cli-1', p_monto: 120000, p_parte: null }), JSON.stringify(sug[0]?.[1]))
    chk('cobrador: lo sugerido queda elegido (del más viejo al más nuevo, el último parcial)', JSON.stringify(c.aplicar.montos) === JSON.stringify({ 'orden|o-42|N1': 70000, 'orden|o-42|N2': 50000 }), JSON.stringify(c.aplicar.montos))
    chk('cobrador: el selector, abierto, ya no ofrece "Aplicar" en ese crédito', !/data-ad-aplicar="cobranza\|cb-1"/.test(cuerpo(S)))
    chk('cobrador: las cifras Libre / Aplicado ahora / Queda a cuenta', texto(S.__els.get('ad-apl-cifras').innerHTML) === 'Libre para aplicar $ 120.000,00 Aplicado ahora $ 120.000,00 Queda a cuenta $ 0,00', texto(S.__els.get('ad-apl-cifras').innerHTML))
    chk('cobrador: el botón Aplicar habilitado', S.__els.get('ad-apl-confirmar').disabled === false)
    chk('cobrador: con medios, se ofrece "Por medio de pago"', /data-ad-apl-modo="medio"/.test(cuerpo(S)))
    chk('cobrador: "Solo N1" y "Solo N2" (hay renglones de las dos partes)', /data-ad-apl-parte="N1"/.test(cuerpo(S)) && /data-ad-apl-parte="N2"/.test(cuerpo(S)))
    // Solo N2.
    S.alTocarPendientesAd(toque({ adAplSugerir: 'todo', adAplParte: 'N2' }))
    await esperar()
    chk('"Solo N2" pide sugerir solo esa parte', rpcs(S, 'sugerir_aplicacion').pop()[1].p_parte === 'N2' && JSON.stringify(c.aplicar.montos) === JSON.stringify({ 'orden|o-42|N2': 80000 }))
    chk('"Solo N2": lo que sobra queda a cuenta', texto(S.__els.get('ad-apl-cifras').innerHTML).includes('Queda a cuenta $ 40.000,00'))
    S.alTocarPendientesAd(toque({ adAplSugerir: 'todo', adAplParte: '' }))
    await esperar()
    S.alTocarPendientesAd(toque({ adAplConfirmar: '' }))
    await esperar()
    const ap = rpcs(S, 'aplicar_credito_cliente')
    chk('cobrador: aplicar_credito_cliente UNA vez con la cobranza', ap.length === 1 && ap[0][1].p_cliente_id === 'cli-1' && ap[0][1].p_credito_tipo === 'cobranza' && ap[0][1].p_credito_id === 'cb-1')
    chk('cobrador: los renglones exactos (sin medio en "Aplicar todo")', JSON.stringify(ap[0]?.[1].p_items) === JSON.stringify([
      { doc_tipo: 'orden', doc_id: 'o-42', parte: 'N1', monto: 70000, medio: null }, { doc_tipo: 'orden', doc_id: 'o-42', parte: 'N2', monto: 50000, medio: null }]), JSON.stringify(ap[0]?.[1].p_items))
    chk('cobrador: el aviso con lo aplicado y lo que queda a cuenta', N(S.__llamadas.exitos.pop()) === 'Aplicado $ 120.000,00 · Queda a cuenta $ 0,00')
    chk('cobrador: después se vuelven a leer cliente_pendientes y la cuenta', rpcs(S, 'cliente_pendientes').length === antesPend + 1 && rpcs(S, 'cuenta_cliente').length === antesCuenta + 1)
    chk('cobrador: el selector se cierra', !S.estado.cliente.aplicar && !/id="ad-apl"/.test(cuerpo(S)))
  }

  // ── Por medio de pago ─────────────────────────────────────────────────────
  {
    const S = nuevo()
    await S.abrirCliente('cli-1')
    await esperar()
    await S.abrirAplicarAd('cobranza|cb-1')
    S.alTocarPendientesAd(toque({ adAplModo: 'medio' }))
    const c = S.estado.cliente
    chk('por medio: cambia el modo', c.aplicar.modo === 'medio')
    const h = cuerpo(S)
    const bloques = [...h.matchAll(/data-ad-apl-bloque="([^"]*)"/g)].map(m => m[1])
    chk('por medio: un bloque por medio cobrado (sin cheques)', bloques.join() === 'transferencia,efectivo', bloques.join())
    chk('por medio: cada bloque dice cuánto queda de ese medio', texto(h).includes('Transferencias $ 100.000,00') && texto(h).includes('Efectivo $ 20.000,00'))
    S.alTocarPendientesAd(toque({ adAplSugerir: 'transferencia', adAplParte: '' }))
    S.alTocarPendientesAd(toque({ adAplSugerir: 'efectivo', adAplParte: '' }))
    chk('por medio: la transferencia del más viejo al más nuevo', JSON.stringify(c.aplicar.medios.transferencia.montos) === JSON.stringify({ 'orden|o-42|N1': 70000, 'orden|o-42|N2': 30000 }), JSON.stringify(c.aplicar.medios.transferencia.montos))
    chk('por medio: el efectivo sigue donde la transferencia no llegó', JSON.stringify(c.aplicar.medios.efectivo.montos) === JSON.stringify({ 'orden|o-42|N2': 20000 }), JSON.stringify(c.aplicar.medios.efectivo.montos))
    chk('por medio: no se llama a la base para repartir un medio', rpcs(S, 'sugerir_aplicacion').length === 1)
    await S.confirmarAplicarAd()
    const ap = rpcs(S, 'aplicar_credito_cliente')
    chk('por medio: cada renglón con su medio', JSON.stringify(ap[0]?.[1].p_items) === JSON.stringify([
      { doc_tipo: 'orden', doc_id: 'o-42', parte: 'N1', monto: 70000, medio: 'transferencia' }, { doc_tipo: 'orden', doc_id: 'o-42', parte: 'N2', monto: 30000, medio: 'transferencia' },
      { doc_tipo: 'orden', doc_id: 'o-42', parte: 'N2', monto: 20000, medio: 'efectivo' }]), JSON.stringify(ap[0]?.[1].p_items))
    // Un medio pasado: lo dice, el botón no se habilita y no se llama.
    const S2 = nuevo()
    await S2.abrirCliente('cli-1')
    await esperar()
    await S2.abrirAplicarAd('cobranza|cb-1')
    S2.cambiarModoAd('medio')
    S2.alEscribirPendientesAd({ target: { dataset: { adAplDoc: 'nota_debito|nd-1|total', adAplMedio: 'efectivo' }, value: '25.000' } })
    const err = S2.__els.get('ad-apl-errores')
    chk('medio pasado: lo dice', err.hidden === false && N(err.innerHTML).includes('Con efectivo aplicás $ 25.000,00 y quedan $ 20.000,00 sin aplicar.'), err.innerHTML)
    chk('medio pasado: el botón Aplicar no se habilita', S2.__els.get('ad-apl-confirmar').disabled === true)
    await S2.confirmarAplicarAd()
    chk('medio pasado: no se llama a la base', !rpcs(S2, 'aplicar_credito_cliente').length)
    // Un renglón con más que su pendiente.
    S2.cambiarModoAd('todo')
    S2.alEscribirPendientesAd({ target: { dataset: { adAplDoc: 'nota_debito|nd-1|total', adAplMedio: '' }, value: '35.000' } })
    chk('renglón pasado: lo dice', N(S2.__els.get('ad-apl-errores').innerHTML).includes('Nota de débito N-ND-0001: le querés aplicar $ 35.000,00 y tiene $ 30.000,00 pendientes.'))
    chk('renglón pasado: el botón no se habilita', S2.__els.get('ad-apl-confirmar').disabled === true)
    // Un crédito sin medios (el corte) no ofrece "Por medio de pago".
    await S2.abrirAplicarAd('corte|cli-1')
    chk('el corte: no ofrece "Por medio de pago" y no se puede cambiar a ese modo', !/data-ad-apl-modo/.test(cuerpo(S2)) && (S2.cambiarModoAd('medio'), S2.estado.cliente.aplicar.modo === 'todo'))
  }

  // ── Aplicar el saldo a favor del corte ────────────────────────────────────
  {
    const S = nuevo()
    await S.abrirCliente('cli-1')
    await esperar()
    S.alTocarPendientesAd(toque({ adAplicar: 'corte|cli-1' }))
    await esperar()
    chk('corte: no se lee ningún recibo', !rpcs(S, 'recibo_cobranza').length)
    chk('corte: se sugiere con lo libre del corte', rpcs(S, 'sugerir_aplicacion')[0]?.[1].p_monto === 20000)
    chk('corte: las cifras', texto(S.__els.get('ad-apl-cifras').innerHTML) === 'Libre para aplicar $ 20.000,00 Aplicado ahora $ 20.000,00 Queda a cuenta $ 0,00')
    await S.confirmarAplicarAd()
    const ap = rpcs(S, 'aplicar_credito_cliente')
    chk('corte: aplicar_credito_cliente con el crédito "corte" y el id del cliente', ap.length === 1 && JSON.stringify(ap[0][1]) === JSON.stringify({
      p_cliente_id: 'cli-1', p_credito_tipo: 'corte', p_credito_id: 'cli-1', p_items: [{ doc_tipo: 'orden', doc_id: 'o-42', parte: 'N1', monto: 20000, medio: null }] }), JSON.stringify(ap[0]?.[1]))
    chk('corte: el aviso', N(S.__llamadas.exitos.pop()) === 'Aplicado $ 20.000,00 · Queda a cuenta $ 0,00')
    // Un ajuste a favor sin nada aplicado sí se ofrece; con algo aplicado, no se abre.
    const S2 = nuevo({ creditos: [K('movimiento', 'mv-9', 'Ajuste a favor', '2026-11-07', 5000, 0)] })
    await S2.abrirCliente('cli-1')
    await esperar()
    chk('otro crédito sin nada aplicado: "Aplicar" se ofrece', /data-ad-aplicar="movimiento\|mv-9"/.test(cuerpo(S2)) && !cuerpo(S2).includes('falta una función de la base'))
    const S3 = nuevo()
    await S3.abrirCliente('cli-1')
    await esperar()
    await S3.abrirAplicarAd('movimiento|mv-9')
    chk('el hueco: un crédito que no es cobranza con algo aplicado no abre el selector', !S3.estado.cliente.aplicar && !rpcs(S3, 'sugerir_aplicacion').length)
    await S3.abrirAplicarAd('cobranza|cb-0')
    chk('un crédito sin nada libre no abre el selector', !S3.estado.cliente.aplicar)
    chk('creditoAplicableAd: sin libre, no; cobranza con algo aplicado, sí; otro con algo aplicado, no',
      S3.creditoAplicableAd(CREDITOS[4]) === false && S3.creditoAplicableAd(CREDITOS[2]) === true && S3.creditoAplicableAd(CREDITOS[3]) === false && S3.creditoAplicableAd(CREDITOS[0]) === true)
    // Dos lecturas superpuestas: la vieja (que llega después) no pisa a la nueva.
    let soltar
    let n = 0
    const S5 = nuevo({ rpc: { cliente_pendientes: () => (++n === 1 ? new Promise(r => { soltar = () => r({ data: { activo: false }, error: null }) }) : { data: { activo: true, docs: copia(DOCS), creditos: copia(CREDITOS) }, error: null }) } })
    const c5 = { id: 'cli-1' }
    const vieja = S5.cargarPendientesAd(c5)
    await S5.cargarPendientesAd(c5)
    soltar()
    await vieja
    chk('una lectura vieja no pisa a la nueva', c5.pend?.datos?.activo === true)
  }

  // ── Una cobranza con una parte aplicada: lo que ya tenía MÁS lo nuevo ─────
  {
    const S = nuevo()
    await S.abrirCliente('cli-1')
    await esperar()
    S.alTocarPendientesAd(toque({ adAplicar: 'cobranza|cb-2' }))
    await esperar()
    const c = S.estado.cliente
    const rec = rpcs(S, 'recibo_cobranza')
    chk('con algo aplicado: se lee lo que ya tenía (recibo_cobranza)', rec.length === 1 && rec[0][1].p_cobranza_id === 'cb-2')
    chk('lo que ya tenía, como renglones con su medio', JSON.stringify(c.aplicar.previas) === JSON.stringify([{ doc_tipo: 'orden', doc_id: 'o-42', parte: 'N1', monto: 30000, medio: 'cheque' }]), JSON.stringify(c.aplicar.previas))
    chk('lo dice: "Ya tenía aplicado"', texto(cuerpo(S)).includes('Ya tenía aplicado $ 30.000,00: se mantiene y se le suma lo de abajo.'))
    chk('se sugiere solo con lo libre', rpcs(S, 'sugerir_aplicacion')[0]?.[1].p_monto === 20000)
    await S.confirmarAplicarAd()
    const ap = rpcs(S, 'aplicar_credito_cliente')
    chk('se manda lo que ya tenía MÁS lo nuevo (la base reemplaza)', JSON.stringify(ap[0]?.[1].p_items) === JSON.stringify([
      { doc_tipo: 'orden', doc_id: 'o-42', parte: 'N1', monto: 30000, medio: 'cheque' }, { doc_tipo: 'orden', doc_id: 'o-42', parte: 'N1', monto: 20000, medio: null }]), JSON.stringify(ap[0]?.[1].p_items))
    chk('el aviso con el total del crédito', N(S.__llamadas.exitos.pop()) === 'Aplicado $ 50.000,00 · Queda a cuenta $ 0,00')
    // Por medio, el mismo renglón y el mismo medio se suman en uno.
    const S2 = nuevo()
    await S2.abrirCliente('cli-1')
    await esperar()
    await S2.abrirAplicarAd('cobranza|cb-2')
    S2.cambiarModoAd('medio')
    chk('por medio: el cheque ofrece lo que queda sin aplicar con cheques', texto(cuerpo(S2)).includes('Cheques $ 20.000,00'))
    S2.sugerirMedioAd('cheque')
    await S2.confirmarAplicarAd()
    chk('por medio: mismo renglón y mismo medio van sumados', JSON.stringify(rpcs(S2, 'aplicar_credito_cliente')[0]?.[1].p_items) === JSON.stringify([
      { doc_tipo: 'orden', doc_id: 'o-42', parte: 'N1', monto: 50000, medio: 'cheque' }]), JSON.stringify(rpcs(S2, 'aplicar_credito_cliente')[0]?.[1].p_items))
    // Si no se puede leer lo que ya tenía, no se aplica (se borraría).
    const S3 = nuevo({ rpc: { recibo_cobranza: { data: null, error: { message: 'sin red' } } } })
    await S3.abrirCliente('cli-1')
    await esperar()
    await S3.abrirAplicarAd('cobranza|cb-2')
    const h3 = cuerpo(S3)
    chk('sin lo que ya tenía: lo dice', texto(h3).includes('No se pudo leer lo que esta cobranza ya tenía aplicado (sin red). Sin eso no se puede aplicar: se borraría.'))
    chk('sin lo que ya tenía: no hay botón Aplicar ni se sugiere', !/data-ad-apl-confirmar/.test(h3) && !rpcs(S3, 'sugerir_aplicacion').length)
    await S3.confirmarAplicarAd()
    chk('sin lo que ya tenía: no se llama a aplicar', !rpcs(S3, 'aplicar_credito_cliente').length)
    // Aunque se escriba un monto o se pida sugerir: nada.
    S3.actualizarMontoAd('orden|o-42|N1', null, '1.000')
    await S3.sugerirTodoAd(null)
    S3.sugerirMedioAd('cheque')
    await S3.confirmarAplicarAd()
    chk('sin lo que ya tenía: ni escribir, ni sugerir, ni aplicar', !rpcs(S3, 'aplicar_credito_cliente').length && !rpcs(S3, 'sugerir_aplicacion').length && JSON.stringify(S3.estado.cliente.aplicar.montos) === '{}')
    // Si lo que ya tenía no coincide con la cuenta, tampoco.
    const S4 = nuevo({ rpc: { recibo_cobranza: { data: { ...copia(RECIBO_CB2), aplicaciones: [{ ...RECIBO_CB2.aplicaciones[0], aplicado: 25000, medios: { cheque: 25000 } }] }, error: null } } })
    await S4.abrirCliente('cli-1')
    await esperar()
    await S4.abrirAplicarAd('cobranza|cb-2')
    chk('lo que ya tenía no coincide: lo dice y no deja aplicar', texto(cuerpo(S4)).includes('Lo que esta cobranza ya tenía aplicado ($ 25.000,00) no coincide con la cuenta ($ 30.000,00).') && !/data-ad-apl-confirmar/.test(cuerpo(S4)))
    S4.cerrarAplicarAd()
    chk('Cancelar cierra el selector', !S4.estado.cliente.aplicar && !/id="ad-apl"/.test(cuerpo(S4)))
  }

  // ── El error de la base, tal cual ─────────────────────────────────────────
  {
    const msg = 'Estás aplicando $ 130.000,00 y el pago es de $ 120.000,00.'
    const S = nuevo({ rpc: { aplicar_credito_cliente: { data: null, error: { message: msg } } } })
    await S.abrirCliente('cli-1')
    await esperar()
    await S.abrirAplicarAd('cobranza|cb-1')
    const antesPend = rpcs(S, 'cliente_pendientes').length
    await S.confirmarAplicarAd()
    const c = S.estado.cliente
    chk('error de la base: se muestra tal cual', c.aplicar?.error === msg && cuerpo(S).includes('<p class="ad-error-pegado" id="ad-apl-error" role="alert">Estás aplicando $ 130.000,00 y el pago es de $ 120.000,00.</p>'))
    chk('error de la base: el selector sigue abierto y no se relee', c.aplicar?.enviando === false && rpcs(S, 'cliente_pendientes').length === antesPend && !S.__llamadas.exitos.length)
    // Doble toque: una sola llamada.
    const S2 = nuevo()
    await S2.abrirCliente('cli-1')
    await esperar()
    await S2.abrirAplicarAd('corte|cli-1')
    const p1 = S2.confirmarAplicarAd()
    const p2 = S2.confirmarAplicarAd()
    chk('mientras aplica: el botón dice "Aplicando…"', cuerpo(S2).includes('>Aplicando…</button>'))
    await Promise.all([p1, p2])
    chk('doble toque: UNA sola llamada', rpcs(S2, 'aplicar_credito_cliente').length === 1)
  }

  // ── El repintado deja los montos en los campos ────────────────────────────
  {
    const S = nuevo()
    await S.abrirCliente('cli-1')
    await esperar()
    await S.abrirAplicarAd('cobranza|cb-1')
    const campo = S.__doc.createElement('input')
    campo.dataset = { adAplDoc: 'orden|o-42|N1', adAplMedio: '' }
    let enfocado = false
    campo.focus = () => { enfocado = true }
    S.__els.get('ad-apl').querySelectorAll = () => [campo]
    S.alEscribirPendientesAd({ target: { dataset: { adAplDoc: 'orden|o-42|N1', adAplMedio: '' }, value: '12.345,5' } })
    S.pintarCliente()
    chk('repintar: el monto escrito vuelve al campo con formato', N(campo.value) === '12.345,50', campo.value)
    chk('repintar: el foco vuelve al campo donde se escribía', enfocado)
  }

  // ── El recibo ─────────────────────────────────────────────────────────────
  {
    const S = nuevo()
    await S.abrirCliente('cli-1')
    await esperar()
    S.alTocarPendientesAd(toque({ adRecibo: 'cb-1' }))
    await esperar()
    chk('recibo: recibo_cobranza con el id de la cobranza', rpcs(S, 'recibo_cobranza').pop()?.[1].p_cobranza_id === 'cb-1')
    chk('recibo: la ventana se abre', S.__els.get('ad-rc').hidden === false)
    const hoja = S.__els.get('ad-rc-hoja').innerHTML
    const t = texto(hoja)
    chk('recibo: empresa con CUIT con guiones y la fecha', t.includes('CUCURUCHOS NUSS SRL CUIT 30-71234567-1 Av. Siempre Viva 123 Fecha 06/11/2026'), t.slice(0, 200))
    chk('recibo: el logo', /<img class="ad-rc-cab__logo" src="\.\.\/logo-cucuruchos-nuss\.png" alt="">/.test(hoja))
    chk('recibo: "RECIBO" y el cliente', t.includes('RECIBO Cliente J Y M SA · J&amp;M CUIT 30-99999999-3'), t)
    chk('recibo: el cheque con el banco corto y las fechas', t.includes('GALICIA Y BUENOS AIRES 66259862 Diferido 01/11/2026 15/12/2026 $ 50.000,00') && !t.includes('BANCO DE GALICIA'), t)
    chk('el banco corto: sin "Banco de la" ni "S.A."', S.bancoCortoAd('Banco de la Nación Argentina') === 'Nación Argentina' && S.bancoCortoAd('BANCO MACRO S.A.') === 'MACRO' && S.bancoCortoAd('') === '—')
    chk('recibo: qué cancela', t.includes('Qué cancela Renglón Monto Aplicado N1-0042 $ 100.000,00 $ 30.000,00'), t)
    chk('recibo: los totales', /data-ad-rc-total="cobrado">\$ 50\.000,00</.test(N(hoja)) && /data-ad-rc-total="aplicado">\$ 30\.000,00</.test(N(hoja)))
    chk('recibo: lo que queda a cuenta y el saldo', t.includes('Queda a cuenta del cliente $ 20.000,00') && t.includes('Saldo de la cuenta: $ 40.000,00 a pagar'))
    chk('recibo: Enviar e Imprimir habilitados', S.__els.get('ad-rc-enviar').disabled === false && S.__els.get('ad-rc-imprimir').disabled === false)
    chk('recibo: hoja normal con pocos renglones', S.__els.get('ad-rc-hoja').className === 'ad-rc-hoja')
    // Imprimir: UNA hoja A4 en #ad-impresion, y la hoja de la orden que había
    // ahí queda olvidada (si no, imprimir la orden después saldría con el recibo).
    S.estado.impresion = { clave: 'orden-1', lista: true }
    S.imprimirReciboAd()
    chk('imprimir: olvida la hoja de la orden que estaba lista', S.estado.impresion.clave === null && S.estado.impresion.lista === false)
    const imp = S.__els.get('ad-impresion').innerHTML
    chk('imprimir: A4 vertical', imp.startsWith('<style>@media print { @page { size: A4 portrait; margin: 8mm; } }</style>'))
    chk('imprimir: la hoja de papel, una sola', imp.split('class="ad-rc-hoja').length - 1 === 1 && /class="ad-rc-hoja ad-rc-hoja--papel"/.test(imp) && S.__impresiones() === 1)
    // Muchos renglones: compacta (sigue en UNA hoja).
    const muchas = { ...RECIBO_CB2, aplicaciones: Array.from({ length: 15 }, (_, i) => ({ ...RECIBO_CB2.aplicaciones[0], etiqueta: 'N1-00' + (10 + i) })) }
    chk('más de 14 renglones: la hoja compacta', S.claseHojaReciboAd(muchas) === 'ad-rc-hoja ad-rc-hoja--compacta' && S.claseHojaReciboAd(RECIBO_CB2) === 'ad-rc-hoja')
    chk('solo N2: un renglón N1 se dice "Orden"', texto(S.htmlReciboAd({ ...RECIBO_CB2, cliente: { ...RECIBO_CB2.cliente, solo_n2: true } })).includes('Orden 0042 $ 100.000,00'))
    chk('sin nada aplicado: "Nada: todo queda a cuenta."', texto(S.htmlReciboAd({ ...RECIBO_CB2, aplicaciones: [] })).includes('Nada: todo queda a cuenta.'))
    chk('el saldo a favor', N(S.textoSaldoCuentaAd(-1500)) === '$ 1.500,00 a favor del cliente' && S.textoSaldoCuentaAd(0) === 'en cero' && S.textoSaldoCuentaAd(null) === '—')
    chk('un logo que no es un archivo de la raíz no se dibuja', !/<img/.test(S.htmlReciboAd({ ...RECIBO_CB2, empresa: { ...RECIBO_CB2.empresa, logo_url: 'javascript:alert(1)' } })))
    chk('el nombre del PDF', S.nombreArchivoReciboAd(RECIBO_CB2) === 'Recibo - J&M - 06-11-2026.pdf' && S.nombreArchivoReciboAd({ cliente: { nombre: 'A/B:C' }, fecha: null }) === 'Recibo - A B C - sin-fecha.pdf')
    // Enviar: sin compartir archivos, se descarga.
    S.__win.html2canvas = async () => ({ width: 1000, height: 2000, toDataURL: () => 'data:image/jpeg;base64,AA==' })
    const agregadas = []
    S.__win.jspdf = { jsPDF: function () { this.addImage = (...a) => agregadas.push(a); this.output = () => new Blob(['%PDF-1.4'], { type: 'application/pdf' }) } }
    S.__setNav({})
    await S.enviarReciboAd()
    const descarga = S.__llamadas.clicks.find(el => el.download)
    chk('enviar: descarga "Recibo - J&M - 06-11-2026.pdf"', descarga?.download === 'Recibo - J&M - 06-11-2026.pdf', descarga?.download)
    chk('enviar: UNA página, achicada para entrar en A4', agregadas.length === 1 && Math.abs(agregadas[0][5] - 277) < 0.01 && Math.abs(agregadas[0][4] - 138.5) < 0.01, JSON.stringify(agregadas[0]?.slice(2)))
    chk('enviar: el aviso', N(S.__llamadas.exitos.pop()) === 'Se descargó el recibo: Recibo - J&M - 06-11-2026.pdf')
    S.cerrarReciboAd()
    chk('cerrar: la ventana se cierra', S.__els.get('ad-rc').hidden === true && S.estado.reciboAd === null)
    // El error de la base.
    const S2 = nuevo({ rpc: { recibo_cobranza: { data: null, error: { message: 'La cobranza todavía no está asentada en un cliente.' } } } })
    await S2.abrirReciboAd('cb-9')
    chk('recibo: el error de la base tal cual', S2.__els.get('ad-rc-error').textContent === 'No se pudo leer el recibo: La cobranza todavía no está asentada en un cliente.' && S2.__els.get('ad-rc-error').hidden === false, S2.__els.get('ad-rc-error').textContent)
    chk('recibo con error: Enviar e Imprimir apagados', S2.__els.get('ad-rc-enviar').disabled === true && S2.__els.get('ad-rc-imprimir').disabled === true)
    // La línea: solo la cobranza con cobranza_id y con corte.
    const c = S.estado.cliente
    chk('la línea: cobranza con cobranza_id y corte → "Recibo"', S.htmlReciboLineaAd({ tipo: 'cobranza', cobranza_id: 'cb-1' }, c).includes('data-ad-recibo="cb-1"'))
    chk('la línea: sin cobranza_id (no se apareó) → nada (no se adivina)', S.htmlReciboLineaAd({ tipo: 'cobranza' }, c) === '')
    chk('la línea: otro tipo → nada', S.htmlReciboLineaAd({ tipo: 'retiro', cobranza_id: 'cb-1' }, c) === '')
    chk('la línea: sin corte → nada', S.htmlReciboLineaAd({ tipo: 'cobranza', cobranza_id: 'cb-1' }, { pend: { datos: { activo: false } } }) === '')
    // Si las listas no se aparean, la línea no tiene id: el recibo queda en Pendientes.
    const S3 = nuevo({ movs: MOVS.slice(1) })
    await S3.abrirCliente('cli-1')
    await esperar()
    const recibos3 = [...cuerpo(S3).matchAll(/data-ad-recibo="([^"]*)"/g)].map(m => m[1])
    chk('sin aparear: la línea sin "Recibo"; en Pendientes, sí', recibos3.join() === 'cb-1,cb-2' && !/ad-rc-linea/.test(cuerpo(S3)), recibos3.join())
  }

  // ── Escapado: lo que viene de la base ─────────────────────────────────────
  {
    const S = nuevo({
      docs: [{ ...DOCS[0], etiqueta: marca('doc'), doc_id: marca('doc-id') }],
      creditos: [{ ...CREDITOS[1], etiqueta: marca('cred'), credito_id: marca('cred-id') }, { ...CREDITOS[3], etiqueta: marca('cred-hueco') }],
    })
    await S.abrirCliente('cli-1')
    await esperar()
    chequearMarcas(chk, 'la sección Pendientes', cuerpo(S), ['doc', 'doc-id', 'cred', 'cred-id', 'cred-hueco'])
    S.estado.cliente.aplicar = { ...S.aplicacionVaciaAd(S.estado.cliente.pend.datos.creditos[0]), error: marca('error-base'), errorSugerir: marca('error-sug') }
    chequearMarcas(chk, 'el selector', S.htmlAplicarAd(S.estado.cliente), ['cred', 'doc', 'doc-id', 'error-base', 'error-sug'])
    chequearMarcas(chk, 'el selector sin lo que ya tenía', S.htmlAplicarAd({ ...S.estado.cliente, aplicar: { ...S.estado.cliente.aplicar, errorPrevias: marca('previas') } }), ['previas'])
    S.estado.cliente.pend = { datos: null, error: marca('error-leer') }
    chequearMarcas(chk, 'el aviso de la lectura', S.htmlPendientesAd(S.estado.cliente), ['error-leer'])
    chequearMarcas(chk, 'la línea', S.htmlReciboLineaAd({ tipo: 'cobranza', cobranza_id: marca('cob-id') }, { pend: { datos: { activo: true } } }), ['cob-id'])
    const malo = {
      ...RECIBO_CB2,
      empresa: { ...RECIBO_CB2.empresa, razon_social: marca('emp'), cuit: marca('emp-cuit'), domicilio: marca('emp-dom') },
      cliente: { ...RECIBO_CB2.cliente, razon_social: marca('cli'), nombre: marca('cli-nombre'), cuit: marca('cli-cuit') },
      cheques: [{ ...RECIBO_CB2.cheques[0], banco: marca('banco'), numero: marca('numero') }],
      transferencias: [{ medio: 'transferencia', cuenta: marca('cuenta'), banco_origen: marca('origen'), referencia: marca('ref'), fecha: '2026-11-06', importe: 1 }],
      aplicaciones: [{ ...RECIBO_CB2.aplicaciones[0], etiqueta: marca('renglon') }],
    }
    chequearMarcas(chk, 'el recibo', S.htmlReciboAd(malo), ['emp', 'emp-cuit', 'emp-dom', 'cli', 'cli-nombre', 'cli-cuit', 'banco', 'numero', 'cuenta', 'origen', 'ref', 'renglon'])
    const S2 = nuevo({ rpc: { recibo_cobranza: { data: null, error: { message: marca('err-recibo') } } } })
    await S2.abrirReciboAd('cb-1')
    chequearMarcas(chk, 'el error del recibo', S2.__els.get('ad-rc-hoja').innerHTML + S2.__els.get('ad-rc-error').innerHTML, [])
  }

  // ── En la página: dónde se engancha ───────────────────────────────────────
  chk('los eventos se enlazan al arrancar (una vez)', (src.match(/\benlazarPendientesAd\(\)/g) || []).length === 2)
  chk('la sección va en la cuenta del cliente (htmlCuenta)', /\+ htmlAcopiosCliente\(c\) \+ htmlPendientesAd\(c\)/.test(src))
  chk('se lee al abrir la cuenta, junto con los acopios', /cargarAcopiosCliente\(cl\), cargarCuentaGrupo\(cl\), cargarPendientesAd\(cl\)/.test(src))
  chk('el recibo es una ventana propia, hijo directo de <body>', /\n  <div class="ad-rc" id="ad-rc" hidden role="dialog"/.test(src))
  chk('nada de esto en js/ compartido', !/from '\.\.\/js\/[^']*aplicar[^']*'/.test(src))
})())

fin()
