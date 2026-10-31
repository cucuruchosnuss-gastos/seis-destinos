// CUENTAS CORRIENTES — ARREGLOS DEL DETALLE DEL PAGO (31/10/2026, arreglos
// de la auditoría del 30/10, punto 4).
//
// Pedido de Facu (textual):
//  a) Después de "Sacar del pago" o "Agregar cheque", volvé a llamar a
//     cargarAccionesDetallePago (lo que queda a cuenta + Anular), y si el
//     pago quedó anulado, sacá "Anular".
//  b) Leé los cheques del pago con coalesce(pago_gasto_id, salida_gasto_id)
//     = gasto y estado = 'endosado', igual que la base. Lo mismo en la vista
//     previa de Anular.
//  c) Si el pago es con cheques y la lectura de cobranza_cheques vuelve
//     vacía, mostrá "No se pueden ver los cheques de este pago con tu
//     usuario". La RLS filtra sin dar error.
//  d) La vista previa de Anular, con efectivo o transferencia, tiene que
//     decir siempre que la plata vuelve a la caja (la base ahora la devuelve
//     aunque el gasto no tenga cuenta).
//
// La base, leída con pg_get_functiondef el 31/10/2026: sacar_cheque_de_pago
// y anular_gasto toman los cheques del pago con
// coalesce(pago_gasto_id, salida_gasto_id) = el gasto y estado = 'endosado';
// anular_gasto con efectivo/transferencia devuelve la plata con cuenta_id (a
// esa cuenta) y sin ella (da vuelta cada egreso_gasto del gasto).
//
// Se EJECUTA el código real del módulo (abrirModalDetallePago, el panel de
// acciones, sacar y agregar cheques) con un document falso y una base falsa
// que repite lo que hacen sacar_cheque_de_pago y agregar_cheques_a_pago. La
// suite da ROJO sobre 1c20f98 (el origin/main del que salió la rama).
//
//   node pruebas/test-cuentas-corrientes-arreglos-detalle-pago.js
'use strict'

const fs = require('fs')
const path = require('path')
const { construirCon } = require('./sandbox')
const { arnes, leer } = require('./circuito-comun')
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
  var __datos = {}, __consultas = [], __falla = {}, __rpcs = [], __rpc = null
  function __consulta(tabla) {
    const filtros = [], registro = { tabla, select: null, eq: [], in: [] }
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
  function formatearFecha(f) { if (!f) return '—'; const [a, m, d] = String(f).slice(0, 10).split('-'); return d + '/' + m + '/' + a }
  function etiquetaPagoDeGasto(g) { return g?.medio_pago === 'cheque' ? 'Cheques de la cartera ' + (/\\(([^)]*)\\)/.exec(g.descripcion ?? '')?.[1] ?? '') : null }
  function nombreUnidad(id) { return ({ 'u-n': 'Cucuruchos Nuss', 'u-d': 'Dolce Pasta' })[id] ?? '—' }
  function nombreFactura(n) { return 'Factura ' + (n || '—') }
  function numeroTextoOrden(u, n) { return 'N-OP-' + String(n).padStart(5, '0') }
  function sinUnidadesDePrueba(lista) { return lista }
  async function cargarSaldos() {} async function cargarFichaSaldos() {} async function cargarFichaMovimientos() {} async function cargarFichaCreditos() {}
  function renderizarFichaBanner() {}
  async function recargarFichaDespuesDePago() {}
  function cerrarModalDetallePago() {}
  var MEDIOS_PAGO_LABEL = { efectivo: 'Efectivo', transferencia: 'Transferencia / QR', cheque: 'Cheque' }
  var bancosBcra = null
  var accionesPago = null, turnoAccionesPago = 0, aplicarPago = null, turnoAplicarPago = 0
  var estado = { miRolApp: 'usuario', miEmpleadoId: 'emp-yo', misTareas: new Set(['cuentas_corrientes:registrar_pago', 'cobranzas:procesar']), fabrica: null, ficha: null, detallePago: null }
`
// Las funciones que agrega este arreglo, si están: sobre 1c20f98 no existen
// y la suite tiene que dar ROJO por lo que HACE la pantalla, no por un
// nombre que falta.
const FUNCIONES = [...new Set(['tieneTarea', 'esc', 'formatearImporte', 'importeHtml', ...FUNCIONES_DETALLE_PAGO])]
  .filter(n => FUENTE.includes(`function ${n}(`))
const CONSTANTES = [...CONSTANTES_DETALLE_PAGO, 'NUMERO_SALDO_INICIAL', 'NOMBRE_MEDIO_ORDEN']

function sandbox() {
  return construirCon(ARCHIVO, {
    preludio: PRELUDIO, funciones: FUNCIONES, constantes: CONSTANTES,
    retorno: `estado, __els, __consultas, __rpcs, __exitos, __datos, __setRpc(f){ __rpc = f }, __fallar(t){ __falla[t] = true }, __getVar(k){ return eval(k) }`,
  })
}
const tic = () => new Promise(r => setTimeout(r, 0))
async function asentar() { for (let i = 0; i < 6; i++) await tic() }
const htmlDet = (S) => S.__els.get('detalle-pago-contenido')?.innerHTML ?? ''
const htmlAcc = (S) => S.__els.get('detalle-pago-acciones')?.innerHTML ?? ''
// Las lecturas del gasto que hace el panel de acciones (pide empleado_id).
const lecturasAcciones = (S, id) => S.__consultas.filter(q => q.tabla === 'gastos' && /empleado_id/.test(q.select ?? '') && q.eq.some(([c, v]) => c === 'id' && v === id)).length

// ── Los datos: los pagos de ANATOLIA SRL en Nuss ───────────────────────────
const c = (v) => Math.round(Number(v) * 100)
function datos() {
  const cheque = (id, numero, importe, estado, pago, salida) =>
    ({ id, cobranza_id: 'cob-1', banco_codigo: '007', numero, tipo: 'comun', fecha_emision: '2026-10-01', fecha_pago: null, importe, titulares: null, estado, pago_gasto_id: pago, salida_gasto_id: salida })
  const gasto = (id, medio, importe, descripcion, extra = {}) =>
    ({ id, proveedor_id: 'pv1', unidad_negocio_id: 'u-n', fecha_pago: '2026-10-20', medio_pago: medio, importe, moneda: 'ARS', estado: 'pagado',
      descripcion, observaciones: null, empleado_id: 'emp-yo', cuenta_id: null, orden_pago_id: null, motivo_anulacion: null, ...extra })
  return {
    gastos: [
      gasto('g-2ch', 'cheque', 300000, 'Pago con cheques de terceros (N° 11111111, N° 22222222) — ANATOLIA SRL'),
      gasto('g-1ch', 'cheque', 90000, 'Pago con cheques de terceros (N° 66666666) — ANATOLIA SRL'),
      gasto('g-sinver', 'cheque', 70000, 'Pago con cheques de terceros (N° 77777777) — ANATOLIA SRL'),
      gasto('g-endoso', 'cheque', 40000, 'Cheque endosado 285-88888888 — ANATOLIA SRL'),
      gasto('g-viejo', 'cheque', 2000000, 'Pago a cuenta corriente — NICCO S.R.L.'),
      gasto('g-anul', 'cheque', 50000, 'Pago con cheques de terceros (N° 99999999) — ANATOLIA SRL', { estado: 'anulado', motivo_anulacion: 'Se sacó el único cheque' }),
      gasto('g-ef', 'efectivo', 1500.5, 'Pago a proveedor'),
      gasto('g-tr', 'transferencia', 2500, 'Pago a proveedor', { cuenta_id: 'cta-1' }),
    ],
    aplicaciones_pago: [
      { id: 'ap-1', gasto_id: 'g-2ch', factura_pendiente_id: 'fp-1', monto_aplicado: 100000, created_at: '2026-10-20T10:00:00Z',
        facturas_pendientes: { numero_comprobante: '0003-00001201', razon_social: 'ANATOLIA SRL', fecha_factura: '2026-10-01', created_at: '2026-10-01T10:00:00Z', saldo_pendiente: 0, estado: 'pagada', origen_gasto_id: null, categorias: { nombre: 'Materia prima' } } },
    ],
    creditos_proveedor: [
      { id: 'cr-2ch', origen_gasto_id: 'g-2ch', monto_original: 200000, monto_disponible: 200000, moneda: 'ARS', estado: 'disponible', created_at: '2026-10-20T10:00:01Z', aplicaciones_credito: [] },
      { id: 'cr-1ch', origen_gasto_id: 'g-1ch', monto_original: 90000, monto_disponible: 90000, moneda: 'ARS', estado: 'disponible', created_at: '2026-10-20T10:00:01Z', aplicaciones_credito: [] },
    ],
    cobranza_cheques: [
      cheque('q-111', '11111111', 100000, 'endosado', 'g-2ch', null),       // cuenta: por pago_gasto_id
      cheque('q-222', '22222222', 200000, 'endosado', null, 'g-2ch'),       // cuenta: por salida_gasto_id (pago_gasto_id null)
      cheque('q-333', '33333333', 50000, 'rechazado', 'g-2ch', null),       // NO cuenta: no está endosado
      cheque('q-444', '44444444', 60000, 'endosado', 'g-otro', 'g-2ch'),    // NO cuenta: coalesce = g-otro
      cheque('q-666', '66666666', 90000, 'endosado', 'g-1ch', null),
      cheque('q-555', '55555555', 70000, 'en_cartera', null, null),         // la cartera, para agregar
    ],
    v_cobranzas: [{ id: 'cob-1', cliente: 'Distribuidora Anatolia', estado: 'procesada', unidad_negocio_id: 'u-n', unidad_negocio_nombre: 'Cucuruchos Nuss', moneda: 'ARS' }],
    bancos_bcra: [{ codigo: '007', denominacion: 'BANCO DE GALICIA Y BUENOS AIRES S.A.' }],
  }
}
// sacar_cheque_de_pago y agregar_cheques_a_pago con la lógica del SQL del
// 31/10/2026 (lo que importa acá: el crédito a cuenta, el importe del pago,
// la anulación con el único cheque y el cheque que vuelve a la cartera).
function baseFalsa(S, b) {
  S.__setRpc(async (nombre, p) => {
    const err = (m) => ({ data: null, error: { message: m } })
    if (nombre === 'sacar_cheque_de_pago') {
      const ch = b.cobranza_cheques.find(x => x.id === p.p_cheque_id)
      if (!ch || ch.estado !== 'endosado') return err('Ese cheque no está entregado en un pago a proveedor.')
      const g = b.gastos.find(x => x.id === (ch.pago_gasto_id ?? ch.salida_gasto_id))
      let resta = c(ch.importe), cred = 0
      for (const cr of b.creditos_proveedor.filter(x => x.origen_gasto_id === g.id && x.estado === 'disponible')) {
        if (resta <= 0) break
        const toma = Math.min(resta, c(cr.monto_disponible))
        cr.monto_disponible = (c(cr.monto_disponible) - toma) / 100; cr.monto_original = (c(cr.monto_original) - toma) / 100
        if (c(cr.monto_disponible) === 0) cr.estado = 'agotado'
        resta -= toma; cred += toma
      }
      if (resta > 0) return err('El pago no alcanza para sacar ese cheque.')
      const antes = g.importe, nuevo = c(g.importe) - c(ch.importe)
      if (nuevo > 0) g.importe = nuevo / 100
      else Object.assign(g, { estado: 'anulado', motivo_anulacion: 'Se sacó el único cheque N° ' + ch.numero + ': ' + p.p_motivo.trim() })
      Object.assign(ch, { estado: 'en_cartera', pago_gasto_id: null, salida_gasto_id: null })
      return { data: { pago_antes: antes, pago_despues: Math.max(nuevo, 0) / 100, del_credito: cred / 100, vuelve_a_facturas: 0, pago_anulado: nuevo <= 0 }, error: null }
    }
    if (nombre === 'agregar_cheques_a_pago') {
      const g = b.gastos.find(x => x.id === p.p_gasto_id)
      let total = 0
      for (const id of p.p_cheque_ids) {
        const ch = b.cobranza_cheques.find(x => x.id === id)
        Object.assign(ch, { estado: 'endosado', pago_gasto_id: g.id })
        total += c(ch.importe)
      }
      b.creditos_proveedor.push({ id: 'cr-nuevo', origen_gasto_id: g.id, monto_original: total / 100, monto_disponible: total / 100, moneda: 'ARS', estado: 'disponible', created_at: '2026-10-31T10:00:00Z', aplicaciones_credito: [] })
      const antes = g.importe
      g.importe = (c(g.importe) + total) / 100
      return { data: { pago_antes: antes, pago_despues: g.importe, a_facturas: 0, credito_a_favor: total / 100 }, error: null }
    }
    return { data: null, error: null }
  })
}
function armar() {
  const S = sandbox()
  const b = datos()
  Object.assign(S.__datos, b)   // las mismas filas: la base falsa las cambia y la pantalla las relee
  baseFalsa(S, b)
  return S
}

async function main() {
  // ── b) Solo los cheques endosados con coalesce(pago_gasto_id, salida_gasto_id) ──
  {
    const S = armar()
    if (S.chequesDeEstePagoCC) {
      const filas = datos().cobranza_cheques
      const porPago = filas.filter(x => x.pago_gasto_id === 'g-2ch'), porSalida = filas.filter(x => x.salida_gasto_id === 'g-2ch')
      chk('b) puro: de las dos lecturas quedan los endosados con coalesce = el pago', JSON.stringify(S.chequesDeEstePagoCC(porPago, porSalida, 'g-2ch').map(x => x.id)) === '["q-111","q-222"]',
        JSON.stringify(S.chequesDeEstePagoCC(porPago, porSalida, 'g-2ch').map(x => x.id)))
      chk('b) puro: sin lecturas, nada', S.chequesDeEstePagoCC(null, undefined, 'g-2ch').length === 0)
    } else chk('b) existe chequesDeEstePagoCC (los cheques de este pago como la base)', false)

    await S.abrirModalDetallePago('g-2ch')
    await asentar()
    const dp = S.estado.detallePago
    chk('b) el detalle: los cheques del pago son el 11111111 (por pago) y el 22222222 (por salida, pago null)',
      JSON.stringify(dp.cheques.map(x => x.numero)) === '["11111111","22222222"]', JSON.stringify(dp.cheques.map(x => x.numero)))
    const h = htmlDet(S)
    chk('b) el detalle dice "Cheques de terceros (2)"', /Cheques de terceros \(2\)/.test(h), (h.match(/Cheques de terceros \(\d+\)/) || [''])[0])
    chk('b) el detalle no muestra el cheque rechazado (33333333)', !/33333333/.test(h))
    chk('b) el detalle no muestra el cheque de otro pago (44444444: pago_gasto_id de otro)', !/44444444/.test(h))
    chk('b) la lectura trae pago_gasto_id y salida_gasto_id (para el coalesce)',
      S.__consultas.filter(q => q.tabla === 'cobranza_cheques' && q.eq.some(([k]) => k === 'pago_gasto_id' || k === 'salida_gasto_id')).every(q => /pago_gasto_id/.test(q.select) && /salida_gasto_id/.test(q.select)))

    // La vista previa de Anular, con lo mismo.
    const a = S.__getVar('accionesPago')
    chk('b) Anular: los cheques del pago son los mismos dos', JSON.stringify((a?.cheques ?? []).map(x => x.numero)) === '["11111111","22222222"]', JSON.stringify((a?.cheques ?? []).map(x => x.numero)))
    S.alTocarAccionesPago({ target: { closest: (sel) => sel === '[data-anular-pago]' ? {} : null } })
    const p = htmlAcc(S)
    chk('b) Anular: "Vuelven a la cartera: N° 11111111 ($ 100.000,00), N° 22222222 ($ 200.000,00)"', p.includes('Vuelven a la cartera: N° 11111111 ($ 100.000,00), N° 22222222 ($ 200.000,00)'), (p.match(/Vuelven a la cartera[^<]*/) || [''])[0])
    chk('b) Anular: no nombra el rechazado ni el de otro pago', !/33333333|44444444/.test(p))
  }

  // ── a) Sacar y agregar releen lo de a cuenta y "Anular" ──────────────────
  {
    const S = armar()
    await S.abrirModalDetallePago('g-2ch')
    await asentar()
    chk('a) al abrir: "A cuenta $ 200.000,00" y "Anular el pago"', htmlAcc(S).includes('A cuenta $ 200.000,00') && htmlAcc(S).includes('data-anular-pago'), htmlAcc(S).slice(0, 300))
    const antes = lecturasAcciones(S, 'g-2ch')
    const dp = S.estado.detallePago
    dp.sacar = { chequeId: 'q-111', motivo: 'el proveedor no lo aceptó', error: null, enviando: false }
    await S.confirmarSacarChequeDP()
    await asentar()
    chk('a) se sacó el cheque con la base', S.__rpcs.some(r => r.nombre === 'sacar_cheque_de_pago' && r.params.p_cheque_id === 'q-111'))
    chk('a) después de "Sacar del pago" se vuelve a leer el panel de acciones', lecturasAcciones(S, 'g-2ch') > antes, `${antes} → ${lecturasAcciones(S, 'g-2ch')}`)
    chk('a) … y dice lo que queda a cuenta ahora: "A cuenta $ 100.000,00"', htmlAcc(S).includes('A cuenta $ 100.000,00'), htmlAcc(S).slice(0, 300))
    chk('a) … y el pago sigue: "Anular el pago" sigue', htmlAcc(S).includes('data-anular-pago'))

    // Agregar el 55555555 de la cartera ($ 70.000, todo a cuenta).
    const antes2 = lecturasAcciones(S, 'g-2ch')
    await S.abrirAgregarChequeDP()
    const ag = S.estado.detallePago.agregar
    chk('a) la cartera ofrece el 55555555', (ag?.cartera ?? []).some(x => x.id === 'q-555'))
    ag.tildados.add('q-555')
    await S.confirmarAgregarChequesDP()
    await asentar()
    chk('a) se agregó el cheque con la base', S.__rpcs.some(r => r.nombre === 'agregar_cheques_a_pago' && JSON.stringify(r.params.p_cheque_ids) === '["q-555"]'))
    chk('a) después de "Agregar cheque" se vuelve a leer el panel de acciones', lecturasAcciones(S, 'g-2ch') > antes2, `${antes2} → ${lecturasAcciones(S, 'g-2ch')}`)
    chk('a) … y dice "A cuenta $ 170.000,00"', htmlAcc(S).includes('A cuenta $ 170.000,00'), htmlAcc(S).slice(0, 300))
  }
  {
    // El único cheque: el pago queda anulado y "Anular" se va.
    const S = armar()
    await S.abrirModalDetallePago('g-1ch')
    await asentar()
    chk('a) el pago de un cheque: al abrir ofrece "Anular el pago"', htmlAcc(S).includes('data-anular-pago'))
    // Con el panel de anular abierto, para ver que no queda colgado.
    S.alTocarAccionesPago({ target: { closest: (sel) => sel === '[data-anular-pago]' ? {} : null } })
    const dp = S.estado.detallePago
    dp.sacar = { chequeId: 'q-666', motivo: 'tiene rechazos', error: null, enviando: false }
    await S.confirmarSacarChequeDP()
    await asentar()
    chk('a) la base dice que el pago quedó anulado', S.__exitos.includes('El pago quedó anulado'))
    chk('a) pago anulado: "Anular el pago" desaparece', !htmlAcc(S).includes('data-anular-pago') && !htmlAcc(S).includes('data-confirmar-anular-pago'), htmlAcc(S).slice(0, 300))
    chk('a) pago anulado: dice "Pago anulado" con el motivo de la base', htmlAcc(S).includes('Pago anulado') && htmlAcc(S).includes('Se sacó el único cheque N° 66666666'), htmlAcc(S).slice(0, 300))
    chk('a) pago anulado: ya no ofrece aplicar lo que había a cuenta', !htmlAcc(S).includes('data-aplicar-pago'))
  }
  {
    // Un detalle que se cerró (u otro abierto) antes de terminar: no relee
    // las acciones de un pago que ya no se mira.
    const S = armar()
    await S.abrirModalDetallePago('g-2ch')
    await asentar()
    if (S.releerAccionesTrasCambioChequesDP) {
      const dp = S.estado.detallePago
      S.estado.detallePago = null
      const antes = lecturasAcciones(S, 'g-2ch')
      S.releerAccionesTrasCambioChequesDP(dp)
      await asentar()
      chk('a) con el detalle cerrado no se relee nada', lecturasAcciones(S, 'g-2ch') === antes)
    } else chk('a) existe releerAccionesTrasCambioChequesDP', false)
  }

  // ── c) La lectura vacía en un pago con cheques: el aviso ─────────────────
  const AVISO = 'No se pueden ver los cheques de este pago con tu usuario'
  {
    const S = armar()
    await S.abrirModalDetallePago('g-sinver')
    await asentar()
    chk('c) pago con cheques de la cartera y la lectura vacía (la RLS no da error): el aviso', htmlDet(S).includes(AVISO), htmlDet(S).slice(0, 600))
    chk('c) … y queda la etiqueta del pago', /Cheques de la cartera N° 77777777/.test(htmlDet(S)))
    S.alTocarAccionesPago({ target: { closest: (sel) => sel === '[data-anular-pago]' ? {} : null } })
    chk('c) Anular: dice que vuelven a la cartera sin poder ver cuáles', htmlAcc(S).includes('Los cheques de este pago vuelven a la cartera (con tu usuario no se ve cuáles son)'))
  }
  {
    const S = armar()
    await S.abrirModalDetallePago('g-endoso')
    await asentar()
    chk('c) un cheque endosado ("Cheque endosado …") sin cheques visibles: el aviso', htmlDet(S).includes(AVISO))
  }
  {
    const S = armar()
    S.__fallar('cobranza_cheques')
    await S.abrirModalDetallePago('g-2ch')
    await asentar()
    chk('c) con error al leer: el aviso', htmlDet(S).includes(AVISO))
    // Con error no se sabe nada: el aviso va aunque la descripción no diga cartera.
    const V = armar()
    V.__fallar('cobranza_cheques')
    await V.abrirModalDetallePago('g-viejo')
    await asentar()
    chk('c) con error al leer, también en un pago "con cheque" que no dice cartera', htmlDet(V).includes(AVISO))
    const base = { gasto: { id: 'g', medio_pago: 'cheque', cuenta_id: null, importe: 10, moneda: 'ARS', unidad_negocio_id: 'u-n', descripcion: 'Pago a cuenta corriente — NICCO S.R.L.' }, cheques: null, aplicaciones: [], aCuenta: 0, otrosOrden: [], ordenTexto: null }
    chk('c) Anular sin poder leer los cheques (error): lo dice aunque la descripción no diga cartera', V.lineasPreviaAnularPago(base)[0] === 'Los cheques de este pago vuelven a la cartera (con tu usuario no se ve cuáles son)')
  }
  {
    const S = armar()
    await S.abrirModalDetallePago('g-viejo')
    await asentar()
    chk('c) un pago "con cheque" viejo, cargado a mano (no de la cartera): sin aviso', !htmlDet(S).includes(AVISO) && !/no se pueden ver/i.test(htmlDet(S)))
    S.alTocarAccionesPago({ target: { closest: (sel) => sel === '[data-anular-pago]' ? {} : null } })
    chk('c) … y Anular no promete cheques que vuelvan a la cartera', !/cartera/.test(htmlAcc(S)), htmlAcc(S).slice(0, 400))
  }
  {
    const S = armar()
    await S.abrirModalDetallePago('g-anul')
    await asentar()
    chk('c) un pago anulado (sus cheques ya volvieron a la cartera): sin aviso', !htmlDet(S).includes(AVISO))
  }
  {
    const S = armar()
    await S.abrirModalDetallePago('g-2ch')
    await asentar()
    chk('c) con cheques visibles: sin aviso', !htmlDet(S).includes(AVISO))
    // El aviso, solo: htmlDetallePago lo pone en lugar de la lista, pero la
    // función tiene que decir lo mismo sola (la puede llamar otro lugar).
    if (S.noSeVenChequesDP) chk('c) puro: con cheques visibles, noSeVenChequesDP es false', S.noSeVenChequesDP(S.estado.detallePago) === false)
    else chk('c) existe noSeVenChequesDP', false)
  }

  // ── d) Anular con efectivo o transferencia: la plata vuelve a la caja ─────
  {
    const S = armar()
    const base = { gasto: { id: 'g', medio_pago: 'efectivo', cuenta_id: null, importe: 1500.5, moneda: 'ARS', unidad_negocio_id: 'u-n' }, cheques: [], aplicaciones: [], aCuenta: 0, otrosOrden: [], ordenTexto: null }
    const caja = (l) => l.filter(x => /a la caja/.test(x))
    chk('d) efectivo SIN cuenta: "Vuelven $ 1.500,50 a la caja (a la cuenta de la que salieron)"', S.lineasPreviaAnularPago(base).includes('Vuelven $ 1.500,50 a la caja (a la cuenta de la que salieron)'), JSON.stringify(S.lineasPreviaAnularPago(base)))
    chk('d) efectivo con cuenta: lo mismo', S.lineasPreviaAnularPago({ ...base, gasto: { ...base.gasto, cuenta_id: 'cta' } }).includes('Vuelven $ 1.500,50 a la caja (a la cuenta de la que salieron)'))
    chk('d) transferencia sin cuenta: lo mismo', S.lineasPreviaAnularPago({ ...base, gasto: { ...base.gasto, medio_pago: 'transferencia' } }).includes('Vuelven $ 1.500,50 a la caja (a la cuenta de la que salieron)'))
    chk('d) en dólares: con su moneda', S.lineasPreviaAnularPago({ ...base, gasto: { ...base.gasto, moneda: 'USD' } }).some(l => /^Vuelven USD 1\.500,50 a la caja/.test(l)), JSON.stringify(S.lineasPreviaAnularPago({ ...base, gasto: { ...base.gasto, moneda: 'USD' } })))
    chk('d) QR: no promete plata (la base no mueve caja con QR)', caja(S.lineasPreviaAnularPago({ ...base, gasto: { ...base.gasto, medio_pago: 'qr' } })).length === 0)
    chk('d) cheques: no promete plata en la caja', caja(S.lineasPreviaAnularPago({ ...base, gasto: { ...base.gasto, medio_pago: 'cheque', descripcion: 'Pago con cheques de terceros (N° 1) — X' } })).length === 0)
    chk('d) una sola línea de caja', caja(S.lineasPreviaAnularPago(base)).length === 1)
  }
  {
    // Con la pantalla entera: el pago en efectivo sin cuenta de la base.
    const S = armar()
    await S.abrirModalDetallePago('g-ef')
    await asentar()
    S.alTocarAccionesPago({ target: { closest: (sel) => sel === '[data-anular-pago]' ? {} : null } })
    chk('d) el panel de Anular de un pago en efectivo sin cuenta dice que vuelve a la caja', htmlAcc(S).includes('Vuelven $ 1.500,50 a la caja (a la cuenta de la que salieron)'), htmlAcc(S).slice(0, 500))
    const T = armar()
    await T.abrirModalDetallePago('g-tr')
    await asentar()
    T.alTocarAccionesPago({ target: { closest: (sel) => sel === '[data-anular-pago]' ? {} : null } })
    chk('d) … y uno por transferencia con cuenta', htmlAcc(T).includes('Vuelven $ 2.500,00 a la caja (a la cuenta de la que salieron)'))
  }

  // ── Estático acotado: lo que no se ve ejecutando ─────────────────────────
  chk('no se lee cobranza_cheques con un .or() (el coalesce se arma con dos lecturas)', !/from\('cobranza_cheques'\)[^\n]*\.or\(/.test(FUENTE))
  chk('el texto viejo del aviso ya no está', !FUENTE.includes('Con tu usuario no se pueden ver los cheques de este pago (hace falta poder ver sus cobranzas)'))

  // ── Nada de lo que había se perdió (baseline FIJO 1c20f98, nunca HEAD) ────
  {
    const BASE_COMMIT = '1c20f98'
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
      const faltan = [...marcas(antes)].filter(m => !ahora.has(m))
      chk(`ningún id ni data-* de ${BASE_COMMIT} se perdió`, faltan.length === 0, faltan.join(', '))
      chk(`en ${BASE_COMMIT} los cheques del pago no se filtraban como la base (lo que este cambio agrega)`, !/chequesDeEstePagoCC/.test(antes))
    }
  }
}

esperas.push(main())
fin()
