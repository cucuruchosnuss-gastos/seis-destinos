// CUENTAS CORRIENTES — EL DETALLE DEL PAGO CON SUS CHEQUES (30/10/2026, rama
// ci-prueba/detalle-pago-cheques).
//
// El modal "Detalle del pago" en dos columnas: "Con qué se pagó" (el total,
// la fecha, las observaciones del gasto, la LISTA de cheques de terceros con
// banco, N°, importe, fecha de pago, titulares y cliente, y el crédito que
// sobró) y "Facturas que paga". Con cuentas_corrientes:registrar_pago Y
// cobranzas:procesar, cada cheque tiene "Sacar del pago" (motivo, vista
// previa, sacar_cheque_de_pago) y el pago con cheques "Agregar cheque" (la
// cartera con buscador, varios tildados, vista previa, motivo opcional,
// agregar_cheques_a_pago). Las dos funciones verificadas con
// pg_get_functiondef el 30/10/2026; la base no tiene una función para
// simular, así que la vista previa repite su orden en el navegador.
//
// Se EJECUTA el código real con un document falso y una base falsa que
// aplica las dos funciones con la MISMA lógica que el SQL leído (para el
// reemplazo: sacar + agregar, y para exigir que la vista previa diga lo
// mismo que después hace la base). Exige:
//  - un pago con 5 cheques: la lista con sus importes, sin el texto corrido;
//  - "Sacar del pago": sin motivo no llama; la vista previa; una llamada
//    con los parámetros exactos; se relee el detalle y la cuenta;
//  - con un solo cheque: avisa que el pago quedó anulado;
//  - sin cualquiera de los dos permisos no aparecen los botones;
//  - "Agregar cheque": la cartera (en cartera, asentada, en pesos), el
//    buscador, la vista previa (completa la factura, el resto a favor);
//  - el reemplazo (sacar + agregar) deja el pago y la factura bien;
//  - los errores de la base tal cual, un doble toque manda una vez, todo
//    escapado, y nada de lo que había se perdió (baseline FIJO e6e0c74).
//
//   node pruebas/test-cuentas-corrientes-detalle-pago-cheques.js
'use strict'

const fs = require('fs')
const path = require('path')
const { construirCon } = require('./sandbox')
const { arnes, leer, marca, chequearMarcas } = require('./circuito-comun')
const { fuenteNumeros } = require('./numeros-comun')
const { FUNCIONES_DETALLE_PAGO, CONSTANTES_DETALLE_PAGO } = require('./detalle-pago-comun')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/cuentas-corrientes.html')
const FUENTE = leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

const PRELUDIO = `
  ${fuenteNumeros()}
  var console = { log(){}, warn(){}, error(){} }
  var __els = new Map()
  function nuevoEl(id) { return { id, innerHTML: '', textContent: '', hidden: true, removeAttribute(k){ if (k === 'hidden') this.hidden = false }, querySelector: () => null, focus(){} } }
  var document = {
    getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) },
    querySelector: () => null,
  }
  var __datos = {}, __consultas = [], __falla = {}, __rpcs = [], __rpc = null, __recargas = []
  function __consulta(tabla) {
    const filtros = [], registro = { tabla, eq: [], in: [] }
    __consultas.push(registro)
    let uno = false
    const q = {
      select(c) { registro.select = c; return q }, order() { return q },
      eq(c, v) { registro.eq.push([c, v]); filtros.push(r => r[c] === v); return q },
      in(c, vs) { registro.in.push([c, vs]); filtros.push(r => vs.includes(r[c])); return q },
      maybeSingle() { uno = true; return q },
      then(res, rej) {
        if (__falla[tabla]) return Promise.resolve({ data: null, error: { message: 'sin permiso: ' + tabla } }).then(res, rej)
        const filas = (__datos[tabla] ?? []).filter(r => filtros.every(f => f(r))).map(r => JSON.parse(JSON.stringify(r)))
        return Promise.resolve({ data: uno ? (filas[0] ?? null) : filas, error: null }).then(res, rej)
      },
    }
    return q
  }
  var supabase = {
    from: (t) => __consulta(t),
    rpc(nombre, params) { __rpcs.push({ nombre, params: JSON.parse(JSON.stringify(params)) }); return __rpc ? __rpc(nombre, params) : Promise.resolve({ data: null, error: null }) },
  }
  var __exitos = [], __errores = []
  function mostrarExito(m) { __exitos.push(m) } function mostrarError(m) { __errores.push(m) }
  function formatearFecha(f) { if (!f) return '—'; const [a, m, d] = String(f).split('-'); return d + '/' + m + '/' + a }
  function etiquetaPagoDeGasto(g) { return g?.medio_pago === 'cheque' ? 'Cheques de la cartera ' + (/\\(([^)]*)\\)/.exec(g.descripcion ?? '')?.[1] ?? '') : null }
  function nombreUnidad(id) { return ({ 'u-n': 'Cucuruchos Nuss', 'u-d': 'Dolce Pasta' })[id] ?? '—' }
  function nombreFactura(n) { return 'Factura ' + (n || '—') }
  function sinUnidadesDePrueba(lista) { return lista }
  async function cargarSaldos() { __recargas.push('saldos') }
  async function cargarFichaSaldos() { __recargas.push('fichaSaldos') }
  async function cargarFichaMovimientos() { __recargas.push('fichaMovimientos') }
  async function cargarFichaCreditos() { __recargas.push('fichaCreditos') }
  function renderizarFichaBanner() { __recargas.push('banner') }
  var MEDIOS_PAGO_LABEL = { efectivo: 'Efectivo', transferencia: 'Transferencia / QR', cheque: 'Cheque' }
  var bancosBcra = null
  var estado = { miRolApp: 'usuario', misTareas: new Set(['cuentas_corrientes:registrar_pago', 'cobranzas:procesar']), fabrica: null, ficha: null, detallePago: null }
`
const FUNCIONES = ['tieneTarea', 'esc', 'formatearImporte', ...FUNCIONES_DETALLE_PAGO]

function sandbox() {
  return construirCon(ARCHIVO, {
    preludio: PRELUDIO, funciones: FUNCIONES, constantes: CONSTANTES_DETALLE_PAGO,
    retorno: `estado, __els, __consultas, __rpcs, __exitos, __errores, __recargas, __datos, __setRpc(f){ __rpc = f }, __fallar(t){ __falla[t] = true }`,
  })
}

// ── La base falsa: las tablas y las dos funciones con la lógica del SQL ────
const c = (v) => Math.round(Number(v) * 100)
function datos({ unCheque = false } = {}) {
  const fp1 = { id: 'fp-1', numero_comprobante: '0003-00001201', razon_social: 'ANATOLIA SRL', fecha_factura: '2026-08-20', created_at: '2026-08-21T10:00:00Z', importe: 250000, saldo_pendiente: 0, estado: 'pagada', categoria: 'Materia prima' }
  const fp2 = { id: 'fp-2', numero_comprobante: '0003-00001245', razon_social: 'ANATOLIA SRL', fecha_factura: '2026-09-05', created_at: '2026-09-06T10:00:00Z', importe: 400000, saldo_pendiente: 200000, estado: 'parcial', categoria: 'Materia prima' }
  const cheque = (id, cobranza, banco, numero, importe, tipo, pago, titulares = null, gasto = 'g-p5') =>
    ({ id, cobranza_id: cobranza, banco_codigo: banco, numero, tipo, fecha_emision: '2026-10-01', fecha_pago: pago, importe, titulares, estado: 'endosado', pago_gasto_id: gasto, salida_gasto_id: null })
  const base = {
    facturas: [fp1, fp2],
    gastos: [
      { id: 'g-p5', proveedor_id: 'pv1', unidad_negocio_id: 'u-n', fecha_pago: '2026-10-20', medio_pago: 'cheque', importe: 500000, moneda: 'ARS', estado: 'pagado',
        descripcion: 'Pago con cheques de terceros (N° 16603539, N° 21000001, N° 32000002, N° 43000003, N° 55555555) — ANATOLIA SRL', observaciones: null },
      { id: 'g-1', proveedor_id: 'pv1', unidad_negocio_id: 'u-n', fecha_pago: '2026-10-04', medio_pago: 'cheque', importe: 90000, moneda: 'ARS', estado: 'pagado', descripcion: 'Pago con cheques de terceros (N° 77777777) — ANATOLIA SRL', observaciones: null },
      { id: 'g-ef', proveedor_id: 'pv1', unidad_negocio_id: 'u-n', fecha_pago: '2026-10-05', medio_pago: 'efectivo', importe: 1000, moneda: 'ARS', estado: 'pagado', descripcion: 'Pago a proveedor', observaciones: null },
    ],
    aplicaciones: [
      { id: 'ap-1', gasto_id: 'g-p5', factura_pendiente_id: 'fp-1', monto_aplicado: 250000, created_at: '2026-10-20T10:00:00Z' },
      { id: 'ap-2', gasto_id: 'g-p5', factura_pendiente_id: 'fp-2', monto_aplicado: 200000, created_at: '2026-10-20T10:00:00Z' },
    ],
    creditos: [
      { id: 'cr-p5', origen_gasto_id: 'g-p5', monto_original: 50000, monto_disponible: 50000, moneda: 'ARS', estado: 'disponible', created_at: '2026-10-20T10:00:01Z', aplicaciones_credito: [] },
      { id: 'cr-1', origen_gasto_id: 'g-1', monto_original: 90000, monto_disponible: 90000, moneda: 'ARS', estado: 'disponible', created_at: '2026-10-04T10:00:01Z', aplicaciones_credito: [] },
    ],
    // A propósito fuera de orden: la pantalla los ordena por número.
    cheques: [
      cheque('chq-3', 'cob-2', '285', '32000002', 80000, 'comun', null),
      cheque('chq-1', 'cob-1', '007', '16603539', 100000, 'diferido', '2026-11-10', [{ nombre: 'PEREZ JUAN CARLOS', cuit: '20123456789' }]),
      cheque('chq-2', 'cob-1', '011', '21000001', 120000, 'diferido', '2026-11-15'),
      cheque('chq-4', 'cob-2', '007', '43000003', 150000, 'diferido', '2026-12-01', [{ nombre: 'GOMEZ SRL' }, { nombre: 'RUIZ ANA' }]),
      cheque('chq-5', 'cob-1', '011', '55555555', 50000, 'diferido', '2026-11-30'),
      cheque('chq-solo', 'cob-1', '007', '77777777', 90000, 'comun', null, null, 'g-1'),
      // La cartera.
      { ...cheque('chq-c1', 'cob-1', '007', '66259862', 387300.5, 'diferido', '2026-09-28', null, null), estado: 'en_cartera' },
      { ...cheque('chq-c2', 'cob-1', '011', '12345678', 150000, 'comun', null, null, null), estado: 'en_cartera' },
      { ...cheque('chq-c3', 'cob-3', '285', '99990000', 70000, 'comun', null, null, null), estado: 'en_cartera' },   // de Dolce Pasta
      { ...cheque('chq-c4', 'cob-reg', '285', '88880000', 5000, 'comun', null, null, null), estado: 'en_cartera' }, // cobranza sin asentar: no se ofrece
    ],
    cobranzas: [
      { id: 'cob-1', cliente: 'Distribuidora Anatolia', estado: 'procesada', unidad_negocio_id: 'u-n', unidad_negocio_nombre: 'Cucuruchos Nuss', moneda: 'ARS' },
      { id: 'cob-2', cliente: 'Anatolia', estado: 'procesada', unidad_negocio_id: 'u-n', unidad_negocio_nombre: 'Cucuruchos Nuss', moneda: 'ARS' },
      { id: 'cob-3', cliente: 'Heladería Sol', estado: 'procesada', unidad_negocio_id: 'u-d', unidad_negocio_nombre: 'Dolce Pasta', moneda: 'ARS' },
      { id: 'cob-reg', cliente: 'Kiosco Pepe', estado: 'registrada', unidad_negocio_id: 'u-n', unidad_negocio_nombre: 'Cucuruchos Nuss', moneda: 'ARS' },
    ],
    bancos: [{ codigo: '007', denominacion: 'BANCO DE GALICIA Y BUENOS AIRES S.A.' }, { codigo: '011', denominacion: 'BANCO DE LA NACION ARGENTINA' }, { codigo: '285', denominacion: 'BANCO MACRO S.A.' }],
  }
  if (unCheque) base.cheques = base.cheques.filter(x => x.id !== 'chq-1')
  return base
}
// Las tablas como las ve la pantalla (con los embeds que pide el select).
function publicar(S, b) {
  const fpEmbed = (id) => { const f = b.facturas.find(x => x.id === id); return f && { numero_comprobante: f.numero_comprobante, razon_social: f.razon_social, fecha_factura: f.fecha_factura, created_at: f.created_at, saldo_pendiente: f.saldo_pendiente, estado: f.estado, categorias: { nombre: f.categoria } } }
  S.__datos.gastos = b.gastos
  S.__datos.aplicaciones_pago = b.aplicaciones.map(a => ({ ...a, facturas_pendientes: fpEmbed(a.factura_pendiente_id) }))
  S.__datos.creditos_proveedor = b.creditos
  S.__datos.cobranza_cheques = b.cheques
  S.__datos.v_cobranzas = b.cobranzas
  S.__datos.bancos_bcra = b.bancos
}
const fmt = (v) => '$ ' + Number(v).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
// sacar_cheque_de_pago y agregar_cheques_a_pago con la lógica del SQL del 30/10/2026.
function baseFalsa(S, b) {
  S.__setRpc(async (nombre, p) => {
    const err = (m) => ({ data: null, error: { message: m, code: 'P0001' } })
    if (nombre === 'sacar_cheque_de_pago') {
      if (String(p.p_motivo ?? '').trim().length < 3) return err('Poné el motivo (ej. "el proveedor no lo aceptó: tiene rechazos").')
      const ch = b.cheques.find(x => x.id === p.p_cheque_id)
      if (!ch || ch.estado !== 'endosado') return err('Ese cheque no está entregado en un pago a proveedor (está ' + (ch?.estado ?? '?') + ').')
      const g = b.gastos.find(x => x.id === (ch.pago_gasto_id ?? ch.salida_gasto_id))
      let resta = c(ch.importe), cred = 0, apl = 0
      for (const cr of b.creditos.filter(x => x.origen_gasto_id === g.id && x.estado === 'disponible' && c(x.monto_disponible) > 0).sort((x, y) => y.created_at.localeCompare(x.created_at))) {
        if (resta <= 0) break
        const toma = Math.min(resta, c(cr.monto_disponible))
        cr.monto_disponible = (c(cr.monto_disponible) - toma) / 100; cr.monto_original = (c(cr.monto_original) - toma) / 100
        if (c(cr.monto_disponible) === 0) cr.estado = cr.monto_original > 0 ? 'agotado' : 'anulado'
        resta -= toma; cred += toma
      }
      for (const a of b.aplicaciones.filter(x => x.gasto_id === g.id).sort((x, y) => y.created_at.localeCompare(x.created_at) || c(x.monto_aplicado) - c(y.monto_aplicado))) {
        if (resta <= 0) break
        const toma = Math.min(resta, c(a.monto_aplicado))
        a.monto_aplicado = (c(a.monto_aplicado) - toma) / 100
        if (a.monto_aplicado === 0) b.aplicaciones.splice(b.aplicaciones.indexOf(a), 1)
        const f = b.facturas.find(x => x.id === a.factura_pendiente_id)
        f.saldo_pendiente = (c(f.saldo_pendiente) + toma) / 100
        f.estado = c(f.saldo_pendiente) >= c(f.importe) ? 'pendiente' : 'parcial'
        resta -= toma; apl += toma
      }
      if (resta > 0) return err('El pago no alcanza para sacar ese cheque (faltan $ ' + (resta / 100) + '). Revisalo a mano.')
      const antes = g.importe
      const nuevo = c(g.importe) - c(ch.importe)
      if (nuevo > 0) { g.importe = nuevo / 100; g.observaciones = [g.observaciones, '30/10/2026: se sacó el cheque N° ' + ch.numero + ' (' + fmt(ch.importe) + ') — ' + p.p_motivo.trim()].filter(Boolean).join(' · ') }
      else g.estado = 'anulado'
      Object.assign(ch, { estado: 'en_cartera', pago_gasto_id: null, salida_gasto_id: null })
      publicar(S, b)
      return { data: { pago_antes: antes, pago_despues: Math.max(nuevo, 0) / 100, del_credito: cred / 100, vuelve_a_facturas: apl / 100, pago_anulado: nuevo <= 0 }, error: null }
    }
    if (nombre === 'agregar_cheques_a_pago') {
      if (!p.p_cheque_ids?.length) return err('Elegí al menos un cheque de la cartera.')
      const g = b.gastos.find(x => x.id === p.p_gasto_id)
      if (g.estado === 'anulado') return err('Ese pago está anulado.')
      let total = 0
      for (const id of p.p_cheque_ids) {
        const ch = b.cheques.find(x => x.id === id)
        if (ch.estado !== 'en_cartera') return err('El cheque N° ' + ch.numero + ' no está en cartera (está ' + ch.estado + ').')
        total += c(ch.importe)
        Object.assign(ch, { estado: 'endosado', pago_gasto_id: g.id })
      }
      let resta = total, apl = 0, cred = 0
      const cubiertas = b.facturas.filter(f => c(f.saldo_pendiente) > 0 && ['pendiente', 'parcial'].includes(f.estado) && b.aplicaciones.some(a => a.gasto_id === g.id && a.factura_pendiente_id === f.id))
        .sort((x, y) => x.fecha_factura.localeCompare(y.fecha_factura) || x.created_at.localeCompare(y.created_at))
      for (const f of cubiertas) {
        if (resta <= 0) break
        const toma = Math.min(resta, c(f.saldo_pendiente))
        const a = b.aplicaciones.find(x => x.gasto_id === g.id && x.factura_pendiente_id === f.id)
        a.monto_aplicado = (c(a.monto_aplicado) + toma) / 100
        f.saldo_pendiente = (c(f.saldo_pendiente) - toma) / 100
        f.estado = c(f.saldo_pendiente) <= 0 ? 'pagada' : 'parcial'
        resta -= toma; apl += toma
      }
      if (resta > 0) { b.creditos.push({ id: 'cr-nuevo-' + b.creditos.length, origen_gasto_id: g.id, monto_original: resta / 100, monto_disponible: resta / 100, moneda: 'ARS', estado: 'disponible', created_at: '2026-10-30T12:00:00Z', aplicaciones_credito: [] }); cred = resta }
      const antes = g.importe
      g.importe = (c(g.importe) + total) / 100
      g.observaciones = [g.observaciones, '30/10/2026: se agregó ' + p.p_cheque_ids.length + ' cheque(s)' + (p.p_motivo ? ' — ' + p.p_motivo : '')].filter(Boolean).join(' · ')
      publicar(S, b)
      return { data: { pago_antes: antes, pago_despues: g.importe, a_facturas: apl / 100, credito_a_favor: cred / 100 }, error: null }
    }
    return { data: null, error: null }
  })
}

const html = (S) => S.__els.get('detalle-pago-contenido')?.innerHTML ?? ''
const texto = (h) => String(h ?? '').replace(/<\/(div|p|li|label|section)>/g, ' ').replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()
const cheques = (S) => html(S).split('<div class="detalle-pago-cheque">').slice(1).map(x => '<div class="detalle-pago-cheque">' + x)
const previa = (h) => [...String(h).matchAll(/<li>([^<]*)<\/li>/g)].map(m => m[1].replace(/&quot;/g, '"'))
// Un toque en algo marcado con un data-*: closest() devuelve el nodo si el selector coincide.
const tocar = (S, atributo, valor = '') => S.alTocarDetallePago({ target: { closest: (sel) => sel === `[${atributo}]` ? { dataset: { [atributo.replace(/^data-/, '').replace(/-([a-z])/g, (_, l) => l.toUpperCase())]: valor } } : null } })
const escribir = (S, atributo, props, type = 'input') => S.alEscribirDetallePago({ type, target: { matches: (sel) => sel === `[${atributo}]`, dataset: {}, ...props } })
const esperar = () => new Promise(r => setImmediate(r))

esperas.push((async () => {
  // ── Un pago con cinco cheques: la lista, en dos columnas ─────────────────
  {
    const S = sandbox()
    const b = datos()
    b.gastos[0].observaciones = '25/10/2026: se agregó N° 55555555 ($ 50.000,00) — Reemplaza al cheque N° 16603538'
    publicar(S, b)
    await S.abrirModalDetallePago('g-p5')
    const h = html(S)
    chk('el modal se muestra', S.__els.get('modal-detalle-pago').hidden === false)
    chk('dos columnas: "Con qué se pagó" y "Facturas que paga"', /<div class="detalle-pago-columnas">\s*<section class="detalle-pago-col">\s*<div class="detalle-pago-seccion-titulo">Con qué se pagó<\/div>/.test(h) && /<section class="detalle-pago-col">\s*<div class="detalle-pago-seccion-titulo">Facturas que paga<\/div>/.test(h), h.slice(0, 300))
    chk('el total y la fecha · "Cheques de terceros (5)"', /detalle-pago-hero__monto">\$ 500\.000,00</.test(h) && /detalle-pago-hero__meta">20\/10\/2026 · Cheques de terceros \(5\)</.test(h))
    chk('el texto corrido de antes ya no está', !/Cheques de la cartera N°/.test(h))
    chk('las observaciones del gasto, debajo del total', /<div class="detalle-pago-obs">25\/10\/2026: se agregó N° 55555555 \(\$ 50\.000,00\) — Reemplaza al cheque N° 16603538<\/div>/.test(h))
    const lista = cheques(S)
    chk('cinco cheques, uno por renglón', lista.length === 5, String(lista.length))
    chk('cada cheque con su importe', ['$ 100.000,00', '$ 120.000,00', '$ 80.000,00', '$ 150.000,00', '$ 50.000,00'].every(i => lista.some(x => x.includes(`detalle-pago-cheque__importe">${i}<`))))
    const c1 = texto(lista.find(x => x.includes('16603539')))
    chk('banco (de bancos_bcra), N°, fecha de pago, a nombre de quién y de qué cliente', c1.startsWith('BANCO DE GALICIA Y BUENOS AIRES S.A. $ 100.000,00 N° 16603539 · paga 10/11/2026 A nombre de PEREZ JUAN CARLOS · De Distribuidora Anatolia'), c1)
    chk('dos titulares: "GOMEZ SRL y RUIZ ANA"', texto(lista.find(x => x.includes('43000003'))).includes('A nombre de GOMEZ SRL y RUIZ ANA · De Anatolia'))
    chk('un cheque común: "a la vista" con la fecha de emisión', texto(lista.find(x => x.includes('32000002'))).includes('N° 32000002 · a la vista · 01/10/2026'))
    chk('ordenados por número', lista.map(x => /N° (\d+)/.exec(texto(x))[1]).join(',') === '16603539,21000001,32000002,43000003,55555555')
    chk('el crédito que sobró, como antes (verde, abajo)', /<div class="detalle-pago-credito"><div>Sobrante: \$ 50\.000,00 — sigue como crédito a favor, sin aplicar todavía\.<\/div><\/div>/.test(h))
    chk('a la derecha, las facturas que paga', (h.match(/class="fila-pago-aplicacion"/g) ?? []).length === 2 && /Factura 0003-00001201[\s\S]*\$ 250\.000,00/.test(h))
    chk('con los dos permisos: "Sacar del pago" en cada cheque y "+ Agregar cheque"', (h.match(/data-sacar-cheque="/g) ?? []).length === 5 && /data-agregar-cheque>\+ Agregar cheque</.test(h))
    const qch = S.__consultas.filter(q => q.tabla === 'cobranza_cheques')
    chk('los cheques se leen por pago_gasto_id Y por salida_gasto_id', qch.some(q => q.eq.some(([k, v]) => k === 'pago_gasto_id' && v === 'g-p5')) && qch.some(q => q.eq.some(([k, v]) => k === 'salida_gasto_id' && v === 'g-p5')))
    chk('los clientes salen de las cobranzas de esos cheques', S.__consultas.some(q => q.tabla === 'v_cobranzas' && q.in.some(([k, v]) => k === 'id' && v.includes('cob-1') && v.includes('cob-2'))))
    chk('el gasto se lee con observaciones, estado y unidad', /observaciones, estado, unidad_negocio_id/.test(S.__consultas.find(q => q.tabla === 'gastos')?.select ?? ''))
  }
  // Un cheque que viene por salida_gasto_id (endosado) también; sin repetir.
  {
    const S = sandbox()
    const b = datos()
    b.cheques[0].salida_gasto_id = 'g-p5'
    b.cheques[1].pago_gasto_id = null; b.cheques[1].salida_gasto_id = 'g-p5'
    publicar(S, b)
    await S.abrirModalDetallePago('g-p5')
    chk('por salida_gasto_id también, y un cheque que está en las dos no se repite', cheques(S).length === 5)
  }
  // Sin poder leer los cheques: se dice, no se inventa.
  {
    const S = sandbox()
    publicar(S, datos())
    S.__fallar('cobranza_cheques')
    await S.abrirModalDetallePago('g-p5')
    chk('sin poder leer los cheques: lo dice y queda la etiqueta de siempre', /No se pueden ver los cheques de este pago con tu usuario/.test(html(S)) && /Cheques de la cartera N° 16603539/.test(html(S)))
    chk('… y el resto del detalle igual', /Facturas que paga/.test(html(S)) && /Sobrante: \$ 50\.000,00/.test(html(S)))
  }
  // Un pago en efectivo: sin cheques ni botones.
  {
    const S = sandbox()
    publicar(S, datos())
    await S.abrirModalDetallePago('g-ef')
    chk('un pago en efectivo: "Efectivo", sin cheques ni "Agregar cheque"', /· Efectivo</.test(html(S)) && !/detalle-pago-cheque|data-agregar-cheque|no se pueden ver los cheques/.test(html(S)))
  }
  // Error del detalle.
  {
    const S = sandbox()
    publicar(S, datos())
    S.__fallar('gastos')
    await S.abrirModalDetallePago('g-p5')
    chk('si el pago no se puede leer: "Error al cargar el detalle del pago."', /Error al cargar el detalle del pago\./.test(html(S)))
  }

  // ── Sin permisos no hay botones ──────────────────────────────────────────
  for (const [nombre, tareas, rol] of [
    ['sin cobranzas:procesar', ['cuentas_corrientes:registrar_pago'], 'usuario'],
    ['sin cuentas_corrientes:registrar_pago', ['cobranzas:procesar'], 'usuario'],
  ]) {
    const S = sandbox()
    S.estado.misTareas = new Set(tareas); S.estado.miRolApp = rol
    publicar(S, datos())
    await S.abrirModalDetallePago('g-p5')
    chk(`${nombre}: ni "Sacar del pago" ni "Agregar cheque" (la lista sí)`, cheques(S).length === 5 && !/data-sacar-cheque|data-agregar-cheque/.test(html(S)))
    tocar(S, 'data-sacar-cheque', 'chq-3')
    await S.abrirAgregarChequeDP()
    chk(`${nombre}: tocar a mano tampoco abre nada`, !S.estado.detallePago.sacar && !S.estado.detallePago.agregar)
  }
  {
    const S = sandbox()
    S.estado.misTareas = new Set(); S.estado.miRolApp = 'super_admin'
    publicar(S, datos())
    await S.abrirModalDetallePago('g-p5')
    chk('super_admin (bypass, como la base): los botones están', /data-sacar-cheque/.test(html(S)) && /data-agregar-cheque/.test(html(S)))
  }
  {
    const S = sandbox()
    const b = datos()
    b.gastos[0].estado = 'anulado'
    publicar(S, b)
    await S.abrirModalDetallePago('g-p5')
    chk('un pago anulado: lo dice y no ofrece sacar ni agregar', /Este pago está anulado\./.test(html(S)) && !/data-sacar-cheque|data-agregar-cheque/.test(html(S)))
  }

  // ── Sacar del pago: vista previa, motivo, una llamada, relee ─────────────
  {
    const S = sandbox()
    const b = datos()
    publicar(S, b)
    baseFalsa(S, b)
    S.estado.ficha = { proveedorId: 'pv1', unidadId: 'u-n' }
    await S.abrirModalDetallePago('g-p5')
    tocar(S, 'data-sacar-cheque', 'chq-3')
    let h = html(S)
    chk('al tocar "Sacar del pago": el motivo, la vista previa y los botones, en ese cheque', /<textarea id="campo-motivo-sacar-cheque" data-sacar-motivo/.test(h) && /data-sacar-confirmar>Sacar el cheque</.test(h) && cheques(S).find(x => x.includes('32000002')).includes('data-sacar-motivo'))
    chk('… el botón de ese cheque se va mientras está abierto', !/data-sacar-cheque="chq-3"/.test(h) && /data-sacar-cheque="chq-1"/.test(h))
    chk('la vista previa: baja de $ X a $ Y, sale del crédito, vuelve a la factura, el cheque a la cartera', JSON.stringify(previa(h)) === JSON.stringify([
      'El pago baja de $ 500.000,00 a $ 420.000,00.',
      'Sale $ 50.000,00 del crédito a favor.',
      '$ 30.000,00 vuelve a deberse en la factura 0003-00001245.',
      'El cheque N° 32000002 vuelve a la cartera.',
    ]), JSON.stringify(previa(h)))
    // Sin motivo: no llama.
    await S.confirmarSacarChequeDP()
    chk('sin motivo no llama a la base y lo dice pegado', S.__rpcs.length === 0 && /data-sacar-error role="alert">Poné el motivo \(ej\. &quot;el proveedor no lo aceptó: tiene rechazos&quot;\)\.</.test(html(S)))
    escribir(S, 'data-sacar-motivo', { value: 'ok' })
    await S.confirmarSacarChequeDP()
    chk('… un motivo de menos de 3 letras tampoco', S.__rpcs.length === 0)
    escribir(S, 'data-sacar-motivo', { value: '  El proveedor no lo aceptó: tiene rechazos  ' })
    chk('escribir el motivo borra el error', S.estado.detallePago.sacar.error === null)
    const va = S.confirmarSacarChequeDP()
    S.confirmarSacarChequeDP()   // doble toque
    tocar(S, 'data-sacar-confirmar')
    await va; await esperar(); await esperar()
    chk('UNA llamada a sacar_cheque_de_pago con el cheque y el motivo sin espacios de más', S.__rpcs.length === 1 && S.__rpcs[0].nombre === 'sacar_cheque_de_pago' &&
      JSON.stringify(S.__rpcs[0].params) === JSON.stringify({ p_cheque_id: 'chq-3', p_motivo: 'El proveedor no lo aceptó: tiene rechazos' }), JSON.stringify(S.__rpcs))
    h = html(S)
    chk('el resultado de la base, tal cual vino', /<div class="detalle-pago-aviso" role="status">\s*<div>Listo: el pago bajó de \$ 500\.000,00 a \$ 420\.000,00\. Salieron \$ 50\.000,00 del crédito a favor\. \$ 30\.000,00 volvieron a deberse en las facturas\. El cheque N° 32000002 volvió a la cartera\.<\/div>/.test(h), texto(h).slice(0, 400))
    chk('la vista previa dijo lo mismo que hizo la base (crédito y facturas)', b.creditos[0].monto_disponible === 0 && b.facturas[1].saldo_pendiente === 230000)
    chk('se releyó la ventana: $ 420.000,00, cuatro cheques y la observación de la base', /detalle-pago-hero__monto">\$ 420\.000,00</.test(h) && cheques(S).length === 4 && /se sacó el cheque N° 32000002/.test(h))
    chk('… y la factura ahora tiene aplicado $ 170.000,00', /Factura 0003-00001245[\s\S]*?\$ 170\.000,00/.test(h))
    chk('ofrece "¿Lo reemplazás por otro de la cartera?"', /detalle-pago-aviso[\s\S]*data-agregar-cheque>¿Lo reemplazás por otro de la cartera\?</.test(h))
    await esperar()
    chk('se relee la cuenta del proveedor (saldos, banner, movimientos y créditos)', ['saldos', 'fichaSaldos', 'fichaMovimientos', 'fichaCreditos', 'banner'].every(x => S.__recargas.includes(x)), S.__recargas.join(','))
    chk('el pago no se anuló: sin "El pago quedó anulado"', !S.__exitos.includes('El pago quedó anulado'))

    // ── El reemplazo: "¿Lo reemplazás?" abre la cartera ──
    tocar(S, 'data-agregar-cheque')
    await esperar(); await esperar()
    const a = S.estado.detallePago.agregar
    chk('la cartera: en cartera, cobranza asentada y en pesos (la sin asentar no)', a && !a.cargando && a.cartera.map(x => x.id).sort().join(',') === 'chq-3,chq-c1,chq-c2,chq-c3', a && a.cartera.map(x => x.id).join(','))
    chk('el aviso ya no ofrece reemplazar mientras la cartera está abierta', !/¿Lo reemplazás/.test(html(S)))
    const fila = html(S).split('detalle-pago-cartera__fila').find(x => x.includes('66259862')) ?? ''
    chk('cada cheque de la cartera: N°, fecha de pago, banco, cliente e importe', /N° 66259862 · paga 28\/09\/2026/.test(fila) && /BANCO DE GALICIA Y BUENOS AIRES S\.A\. · De Distribuidora Anatolia/.test(fila) && /\$ 387\.300,50/.test(fila), fila)
    chk('uno de otra empresa lo dice ("de Dolce Pasta")', /N° 99990000[\s\S]*?de Dolce Pasta/.test(html(S)))
    // El buscador.
    escribir(S, 'data-agregar-buscar', { value: '150.000' })
    chk('buscar "150.000": el de $ 150.000,00', S.carteraFiltradaDP(a.cartera, a.busqueda).map(x => x.numero).join(',') === '12345678')
    chk('buscar "387300,5" y "66259": el N° 66259862', S.carteraFiltradaDP(a.cartera, '387300,5').map(x => x.numero).join(',') === '66259862' && S.carteraFiltradaDP(a.cartera, '66259').map(x => x.numero).join(',') === '66259862')
    chk('buscar algo que no está: lo dice', /Ningún cheque con «zzz»\./.test(S.htmlListaAgregarDP({ agregar: { ...a, busqueda: 'zzz' } })))
    // Sin elegir: no llama.
    await S.confirmarAgregarChequesDP()
    chk('sin elegir ningún cheque no llama y lo dice', S.__rpcs.length === 1 && a.error === 'Elegí al menos un cheque de la cartera.')
    chk('… y la vista previa pide elegir', /Elegí uno o más cheques\./.test(S.htmlPreviaAgregarDP(S.estado.detallePago)))
    escribir(S, 'data-agregar-tildar', { dataset: { agregarTildar: 'chq-c2' }, checked: true }, 'change')
    chk('tildar borra el error', a.error === null && a.tildados.has('chq-c2'))
    escribir(S, 'data-agregar-tildar', { dataset: { agregarTildar: 'chq-c1' }, checked: false }, 'change')
    chk('destildar uno que no estaba no toca el otro', a.tildados.size === 1)
    const p1 = S.htmlPreviaAgregarDP(S.estado.detallePago)
    chk('vista previa con $ 150.000: sube a $ 570.000, va a la factura y sigue debiendo $ 80.000', JSON.stringify(previa(p1)) === JSON.stringify([
      'El pago sube de $ 420.000,00 a $ 570.000,00.',
      '$ 150.000,00 va a la factura 0003-00001245 (sigue debiendo $ 80.000,00).',
    ]), JSON.stringify(previa(p1)))
    escribir(S, 'data-agregar-motivo', { value: 'Reemplaza al cheque N° 32000002' })
    const vb = S.confirmarAgregarChequesDP()
    S.confirmarAgregarChequesDP()
    await vb; await esperar(); await esperar()
    const r = S.__rpcs[1]
    chk('UNA llamada a agregar_cheques_a_pago con el gasto, los ids y el motivo', S.__rpcs.length === 2 && r.nombre === 'agregar_cheques_a_pago' &&
      JSON.stringify(r.params) === JSON.stringify({ p_gasto_id: 'g-p5', p_cheque_ids: ['chq-c2'], p_motivo: 'Reemplaza al cheque N° 32000002' }), JSON.stringify(S.__rpcs))
    h = html(S)
    chk('el resultado de la base', /Listo: el pago subió de \$ 420\.000,00 a \$ 570\.000,00\. \$ 150\.000,00 fueron a las facturas\./.test(h))
    chk('el reemplazo deja el pago bien: $ 570.000,00 con cinco cheques (sale el N° 32000002, entra el N° 12345678)', /detalle-pago-hero__monto">\$ 570\.000,00</.test(h) && cheques(S).length === 5 && cheques(S).some(x => x.includes('12345678')) && !cheques(S).some(x => x.includes('32000002')))
    chk('… y la factura bien: 0003-00001245 con $ 320.000 aplicados y debe $ 80.000', b.facturas[1].saldo_pendiente === 80000 && /Factura 0003-00001245[\s\S]*?\$ 320\.000,00/.test(h))
    chk('… la cartera ya no está abierta', S.estado.detallePago.agregar === null && !/detalle-pago-agregar/.test(h))
  }

  // ── Agregar: completa la factura y el resto queda a favor ────────────────
  {
    const S = sandbox()
    const b = datos()
    publicar(S, b)
    baseFalsa(S, b)
    await S.abrirModalDetallePago('g-p5')
    await S.abrirAgregarChequeDP()
    const a = S.estado.detallePago.agregar
    a.tildados.add('chq-c1')
    const p = S.htmlPreviaAgregarDP(S.estado.detallePago)
    chk('vista previa: sube, completa la factura y el sobrante queda a favor', JSON.stringify(previa(p)) === JSON.stringify([
      'El pago sube de $ 500.000,00 a $ 887.300,50.',
      '$ 200.000,00 completa la factura 0003-00001245.',
      '$ 187.300,50 queda como crédito a favor.',
    ]), JSON.stringify(previa(p)))
    chk('… con "1 cheque tildado · total $ 387.300,50"', /1 cheque tildado · total \$ 387\.300,50/.test(p))
    a.tildados.add('chq-c3')
    chk('uno de otra empresa: avisa la deuda entre empresas', /Este cheque es de Dolce Pasta: queda como deuda de Cucuruchos Nuss con Dolce Pasta \(Entre empresas\)/.test(S.htmlPreviaAgregarDP(S.estado.detallePago)))
    a.tildados.delete('chq-c3')
    await S.confirmarAgregarChequesDP()
    chk('la llamada sin motivo manda p_motivo null', S.__rpcs[0]?.params.p_motivo === null)
    chk('la base hizo lo mismo que la vista previa: factura pagada y $ 187.300,50 a favor', b.facturas[1].estado === 'pagada' && b.creditos.some(x => x.monto_disponible === 187300.5))
    chk('el resultado: completa y queda a favor', /\$ 200\.000,00 fueron a las facturas\. \$ 187\.300,50 quedaron como crédito a favor\./.test(html(S)))
    chk('después de agregar no ofrece reemplazar', !/¿Lo reemplazás/.test(html(S)))
  }

  // ── Un solo cheque: sacarlo anula el pago ────────────────────────────────
  {
    const S = sandbox()
    const b = datos()
    publicar(S, b)
    baseFalsa(S, b)
    await S.abrirModalDetallePago('g-1')
    tocar(S, 'data-sacar-cheque', 'chq-solo')
    chk('vista previa: baja a $ 0,00 y queda anulado', previa(html(S))[0] === 'El pago baja de $ 90.000,00 a $ 0,00: queda anulado (era el único cheque).', previa(html(S))[0])
    escribir(S, 'data-sacar-motivo', { value: 'Rechazado por el banco' })
    await S.confirmarSacarChequeDP()
    await esperar()
    chk('avisa "El pago quedó anulado"', S.__exitos.includes('El pago quedó anulado') && /El pago quedó anulado \(era el único cheque\)\. El cheque N° 77777777 volvió a la cartera\./.test(html(S)))
    chk('… y no queda marcado para ofrecer reemplazo', S.estado.detallePago.ofrecerReemplazo === false)
    chk('el pago anulado ya no ofrece reemplazar ni agregar',!/data-agregar-cheque|data-sacar-cheque/.test(html(S)) && /Este pago está anulado\./.test(html(S)))
  }

  // ── El error de la base tal cual, sin aviso ──────────────────────────────
  {
    const S = sandbox()
    publicar(S, datos())
    S.__setRpc(async () => ({ data: null, error: { message: 'El pago no alcanza para sacar ese cheque (faltan $ 10,00). Revisalo a mano.' } }))
    await S.abrirModalDetallePago('g-p5')
    tocar(S, 'data-sacar-cheque', 'chq-4')
    escribir(S, 'data-sacar-motivo', { value: 'No lo aceptó' })
    await S.confirmarSacarChequeDP()
    chk('el error de sacar, tal cual y pegado al botón, sin aviso ni recargas', /data-sacar-error role="alert">El pago no alcanza para sacar ese cheque \(faltan \$ 10,00\)\. Revisalo a mano\.</.test(html(S)) && !/detalle-pago-aviso/.test(html(S)) && S.__recargas.length === 0)
    chk('… y se puede volver a probar (el botón no quedó trabado)', S.estado.detallePago.sacar.enviando === false && /data-sacar-confirmar>Sacar el cheque</.test(html(S)))
    S.__setRpc(async () => { throw new Error('Failed to fetch') })
    await S.confirmarSacarChequeDP()
    chk('sin conexión: el mensaje tal cual', S.estado.detallePago.sacar.error === 'Failed to fetch')
    tocar(S, 'data-sacar-cancelar')
    chk('Cancelar cierra el panel', S.estado.detallePago.sacar === null && !/data-sacar-motivo/.test(html(S)))
    await S.abrirAgregarChequeDP()
    S.estado.detallePago.agregar.tildados.add('chq-c1')
    S.__setRpc(async () => ({ data: null, error: { message: 'El cheque N° 66259862 no está en cartera (está endosado).' } }))
    await S.confirmarAgregarChequesDP()
    chk('el error de agregar, tal cual y pegado', /data-agregar-error role="alert">El cheque N° 66259862 no está en cartera \(está endosado\)\.</.test(html(S)) && S.estado.detallePago.agregar.enviando === false)
    tocar(S, 'data-agregar-cancelar')
    chk('Cancelar cierra la cartera', S.estado.detallePago.agregar === null)
  }
  // La cartera no se puede leer.
  {
    const S = sandbox()
    publicar(S, datos())
    await S.abrirModalDetallePago('g-p5')
    S.__fallar('v_cobranzas')
    await S.abrirAgregarChequeDP()
    chk('si la cartera no se puede leer, lo dice', /No se pudo leer la cartera de cheques\. Cerrá y probá de nuevo\./.test(html(S)))
  }

  // ── La vista previa: los bordes ──────────────────────────────────────────
  {
    const S = sandbox()
    const det = { gasto: { importe: 300000 }, creditos: [
      { estado: 'disponible', monto_disponible: 20000, created_at: '2026-10-01' },
      { estado: 'disponible', monto_disponible: 10000, created_at: '2026-10-05' },
      { estado: 'agotado', monto_disponible: 99999, created_at: '2026-10-09' },
    ], aplicaciones: [
      { monto_aplicado: 100000, created_at: '2026-10-01T10:00:00Z', facturas_pendientes: { numero_comprobante: 'A' } },
      { monto_aplicado: 50000, created_at: '2026-10-02T10:00:00Z', facturas_pendientes: { numero_comprobante: 'B' } },
    ] }
    const p = S.previaSacarChequeDP(det, { importe: 100000 })
    chk('sacar: primero el crédito disponible (el más nuevo primero, sin los agotados)', p.delCredito === 30000, JSON.stringify(p))
    chk('… después la aplicación más nueva y luego la vieja', JSON.stringify(p.facturas) === JSON.stringify([{ numero: 'B', monto: 50000 }, { numero: 'A', monto: 20000 }]), JSON.stringify(p.facturas))
    const q = S.previaSacarChequeDP({ ...det, gasto: { importe: 100000 }, creditos: [], aplicaciones: [{ monto_aplicado: 40000, created_at: 'x', facturas_pendientes: { numero_comprobante: 'A' } }] }, { importe: 100000 })
    chk('si no alcanza: lo que falta, y la vista previa lo dice', q.falta === 60000 && S.lineasPreviaSacarDP(q, { numero: '1' }).some(l => l === 'Faltan $ 60.000,00: el pago no alcanza para sacar este cheque y la base lo va a frenar.'))
    const r = S.previaAgregarChequesDP({ gasto: { importe: 100 }, aplicaciones: [
      { factura_pendiente_id: 'f2', monto_aplicado: 1, facturas_pendientes: { numero_comprobante: 'NUEVA', fecha_factura: '2026-10-02', created_at: 'b', saldo_pendiente: 50, estado: 'parcial' } },
      { factura_pendiente_id: 'f1', monto_aplicado: 1, facturas_pendientes: { numero_comprobante: 'VIEJA', fecha_factura: '2026-10-01', created_at: 'a', saldo_pendiente: 30, estado: 'pendiente' } },
      { factura_pendiente_id: 'f3', monto_aplicado: 1, facturas_pendientes: { numero_comprobante: 'PAGADA', fecha_factura: '2026-09-01', created_at: 'a', saldo_pendiente: 0, estado: 'pagada' } },
      { factura_pendiente_id: 'f1', monto_aplicado: 1, facturas_pendientes: { numero_comprobante: 'VIEJA', fecha_factura: '2026-10-01', created_at: 'a', saldo_pendiente: 30, estado: 'pendiente' } },
    ] }, 60.5)
    chk('agregar: la factura más vieja primero, sin las pagadas ni repetidas; el resto a favor', JSON.stringify(r.aFacturas) === JSON.stringify([{ numero: 'VIEJA', monto: 30, queda: 0 }, { numero: 'NUEVA', monto: 30.5, queda: 19.5 }]) && r.credito === 0 && r.pagoDespues === 160.5, JSON.stringify(r))
    chk('en centavos: 1,10 + 2,20 da 3,30 (no 3,3000000000000007)', S.previaAgregarChequesDP({ gasto: { importe: 1.1 }, aplicaciones: [] }, 2.2).pagoDespues === 3.3)
  }

  // ── Escape: cada dato de la base ─────────────────────────────────────────
  {
    const S = sandbox()
    const b = datos()
    b.gastos[0].observaciones = marca('obs')
    b.cheques[0].numero = marca('numero')
    b.cheques[0].titulares = [{ nombre: marca('titular') }]
    b.cheques[0].banco_codigo = marca('banco')
    b.cobranzas[0].cliente = marca('cliente')
    b.cheques[0].id = marca('id')
    publicar(S, b)
    await S.abrirModalDetallePago('g-p5')
    chequearMarcas(chk, 'la lista de cheques', html(S), ['obs', 'numero', 'titular', 'banco', 'cliente', 'id'])
    S.__setRpc(async () => ({ data: null, error: { message: marca('error-sacar') } }))
    tocar(S, 'data-sacar-cheque', marca('id'))
    escribir(S, 'data-sacar-motivo', { value: marca('motivo') })
    await S.confirmarSacarChequeDP()
    chequearMarcas(chk, 'sacar: el motivo, el número en la vista previa y el error', html(S), ['motivo', 'numero', 'error-sacar'])
    // Sale bien: el aviso lleva el número del cheque.
    S.__setRpc(async () => ({ data: { pago_antes: 500000, pago_despues: 400000, del_credito: 50000, vuelve_a_facturas: 50000, pago_anulado: false }, error: null }))
    await S.confirmarSacarChequeDP()
    chequearMarcas(chk, 'el aviso de sacar', (html(S).split('detalle-pago-aviso')[1] ?? '').split('</div>')[0], ['numero'])
    b.cheques.find(x => x.id === 'chq-c1').numero = marca('cartera-numero')
    b.cheques.find(x => x.id === 'chq-c1').id = marca('cartera-id')
    b.facturas[1].numero_comprobante = marca('factura')
    publicar(S, b)
    await S.cargarDetallePago(S.estado.detallePago)
    b.cobranzas.find(x => x.id === 'cob-3').unidad_negocio_nombre = marca('empresa')
    await S.abrirAgregarChequeDP()
    const a = S.estado.detallePago.agregar
    a.busqueda = ''
    a.motivo = marca('motivo-agregar')
    S.pintarDetallePago()
    chequearMarcas(chk, 'la cartera y el motivo de agregar', html(S), ['cartera-numero', 'cartera-id', 'cliente', 'empresa', 'motivo-agregar'])
    a.tildados.add(marca('cartera-id'))
    chequearMarcas(chk, 'la vista previa de agregar (la factura)', S.htmlPreviaAgregarDP(S.estado.detallePago), ['factura'])
    a.tildados.clear()
    a.busqueda = marca('buscado')
    S.pintarDetallePago()
    chequearMarcas(chk, 'lo buscado', html(S), ['buscado'])
    a.busqueda = ''
    a.tildados.add('chq-c3')
    S.__setRpc(async () => ({ data: null, error: { message: marca('error-agregar') } }))
    await S.confirmarAgregarChequesDP()
    chequearMarcas(chk, 'agregar: la vista previa y el error', html(S), ['empresa', 'error-agregar'])
  }
  // El medio y la moneda de un pago sin cheques.
  {
    const S = sandbox()
    const b = datos()
    b.gastos[2].medio_pago = marca('medio')
    b.gastos[2].moneda = marca('moneda')
    publicar(S, b)
    await S.abrirModalDetallePago('g-ef')
    chequearMarcas(chk, 'el medio y la moneda del pago', html(S), ['medio', 'moneda'])
  }
})())

// ── El enlace de los eventos y lo que no se ejecuta acá ────────────────────
chk('los toques del detalle se delegan en el contenedor', /const detallePagoCont = document\.getElementById\('detalle-pago-contenido'\)\s*detallePagoCont\.addEventListener\('click', alTocarDetallePago\)\s*for \(const tipo of \['input', 'change'\]\) detallePagoCont\.addEventListener\(tipo, alEscribirDetallePago\)/.test(FUENTE))
chk('el modal tiene lugar para las dos columnas (920 px) y se apilan en el celular', /@media \(min-width: 641px\) \{ #modal-detalle-pago \.modal-cc__panel \{ max-width: 920px; \} \}/.test(FUENTE) &&
  /\.detalle-pago-columnas \{ display: grid; grid-template-columns: minmax\(0, 1fr\); gap: 1rem; \}/.test(FUENTE) && /@media \(min-width: 720px\) \{ \.detalle-pago-columnas \{ grid-template-columns: minmax\(0, 1fr\) minmax\(0, 1fr\);/.test(FUENTE))
chk('"Ampliar" copia también las observaciones y los cheques, y la grilla se llama "Facturas que paga"', /tituloGrilla: 'Facturas que paga'/.test(FUENTE) && /\.detalle-pago-obs, #detalle-pago-contenido \.detalle-pago-cheques, #detalle-pago-contenido \.detalle-pago-credito'/.test(FUENTE))

// ── Nada de lo que había se perdió (baseline FIJO e6e0c74, nunca HEAD) ────
{
  const BASE_COMMIT = 'e6e0c74'
  let antes = null
  if (process.env.ARCHIVO_BASE) antes = fs.readFileSync(process.env.ARCHIVO_BASE, 'utf8')
  else {
    try {
      antes = require('child_process').execFileSync('git', ['show', `${BASE_COMMIT}:modulos/cuentas-corrientes.html`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] })
    } catch { antes = null }
  }
  chk(`se pudo leer el baseline ${BASE_COMMIT}`, !!antes)
  if (antes) {
    const marcas = t => new Set([...t.matchAll(/\b(id="[a-z][\w-]*"|data-[a-z][\w-]*)/g)].map(m => m[1]))
    const ahora = marcas(FUENTE)
    // Retirados a propósito por ci-prueba/cc-proveedor-una-lista (el recuadro
    // "Órdenes de pago" de la ficha y las dos copias de la orden), al unirse.
    const RETIRADOS = new Set(['id="ficha-ordenes-pago"', 'id="nota-copias-orden"', 'data-copia'])
    const faltan = [...marcas(antes)].filter(m => !ahora.has(m) && !RETIRADOS.has(m))
    chk(`ningún id ni data-* de ${BASE_COMMIT} se perdió`, faltan.length === 0, faltan.join(', '))
    chk(`en ${BASE_COMMIT} el detalle no sacaba ni agregaba cheques (lo que este cambio agrega)`, !/sacar_cheque_de_pago|agregar_cheques_a_pago/.test(antes))
  }
}

fin()
