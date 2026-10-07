// LA CUENTA ÚNICA DE ALGUIEN QUE ES CLIENTE Y PROVEEDOR (06/10/2026).
//
// Un mismo tercero nos compra (es cliente en una empresa) y nos vende (es
// proveedor en Cuentas corrientes). Con `clientes.proveedor_id` las dos fichas
// quedan vinculadas, y cuenta_unificada() junta las dos cuentas en una lista:
// lo que nos debe como cliente y lo que le debemos como proveedor, con el neto.
// Y compensar_cuentas() cancela una deuda contra la otra.
//
// La cuenta se ve en DOS pantallas —Administración → Clientes (la cuenta del
// cliente, también embebida en Cuentas corrientes → Clientes) y Cuentas
// corrientes → Proveedores (la ficha del proveedor)— y tiene que verse IGUAL
// en las dos: copiada serían dos cuentas que divergen en silencio (el neto con
// otro signo en una, un tope de compensación distinto en la otra). Por eso
// vive acá, una sola vez: UNDÉCIMA excepción consciente a la regla de
// duplicar helpers (ver CLAUDE.md). El escape de lo que se arma acá es escCu.
//
// La base (verificada con pg_get_functiondef el 06/10/2026):
//  - cuenta_unificada(p_cliente_id, p_proveedor_id, p_unidad_negocio_id) →
//    fecha, orden, lado, etiqueta, detalle, moneda, te_debe, le_debes,
//    te_debe_acum, le_debes_acum, neto_acum, … Es SECURITY INVOKER: cada lado
//    se lee con los permisos de quien mira (cliente_movimientos pide
//    retiros:ver; el lado del proveedor, los de facturas y gastos).
//  - compensar_cuentas(p_cliente_id, p_monto, p_fecha, p_observacion,
//    p_aplicaciones) → uuid del gasto. Pide cobranzas:procesar Y
//    cuentas_corrientes:registrar_pago; solo pesos; nunca más de lo que se
//    deben uno al otro (te_debe = la suma de cliente_movimientos en ARS;
//    le_debes = la deuda pendiente de v_saldo_proveedor en esa empresa).
//  - Las facturas a las que se aplica salen de sugerir_facturas_fifo()
//    (SECURITY DEFINER, pide registrar_pago): con un monto enorme devuelve
//    TODAS las abiertas del proveedor en esa empresa, de la más vieja a la más
//    nueva, sin depender de cuentas_corrientes:ver_todo.

import { formatearNumeroAr, enlazarCampoNumero, leerCampoNumero, ponerNumero } from './utils.js'

// El monto que se le pasa a sugerir_facturas_fifo para que devuelva TODAS las
// facturas abiertas (corta cuando el monto se acaba).
export const TOPE_FACTURAS_CU = 999999999999

export function escCu(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// ── Plata ──────────────────────────────────────────────────────────────────

// Un importe a centavos enteros; un dato ausente es null (nunca un cero).
export function centavosCu(v) {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? Math.round(n * 100) : null
}

// "$ 1.234,50", "−$ 300,00", "US$ 20,00". Un dato ausente es "—".
export function plataCu(n, moneda = 'ARS') {
  if (n === null || n === undefined || n === '' || !Number.isFinite(Number(n))) return '—'
  const v = Number(n)
  const simbolo = moneda === 'USD' ? 'US$ ' : (moneda && moneda !== 'ARS' ? moneda + ' ' : '$ ')
  return (v < 0 && Math.round(Math.abs(v) * 100) ? '−' : '') + simbolo + formatearNumeroAr(Math.abs(v))
}

// ── Las etiquetas (las que devuelve cuenta_unificada) y su color ──────────
export const ETIQUETAS_CU = [
  ['Venta', 'venta'], ['Venta anulada', 'anulada'], ['Cobranza', 'cobranza'], ['Saldo inicial', 'inicial'],
  ['Ajuste', 'ajuste'], ['Proyecto', 'proyecto'], ['Comisión', 'comision'], ['Compensación', 'compensacion'],
  ['Compra', 'compra'], ['Pago', 'pago'], ['Crédito aplicado', 'credito'], ['Interés', 'interes'],
]

// La clase del chip: una etiqueta desconocida va en gris, nunca con una clase
// armada con el texto de la base.
export function claseEtiquetaCu(etiqueta) {
  const e = ETIQUETAS_CU.find(([t]) => t === etiqueta)
  return 'cu-chip cu-chip--' + (e ? e[1] : 'otra')
}

// Las etiquetas que hay en la cuenta, en el orden de ETIQUETAS_CU (las
// desconocidas, al final).
export function etiquetasPresentes(filas) {
  const hay = new Set((filas ?? []).map(f => f.etiqueta).filter(Boolean))
  const conocidas = ETIQUETAS_CU.map(([t]) => t).filter(t => hay.has(t))
  const otras = [...hay].filter(t => !ETIQUETAS_CU.some(([c]) => c === t)).sort()
  return [...conocidas, ...otras]
}

export function filasFiltradas(filas, etiqueta) {
  const lista = filas ?? []
  return etiqueta ? lista.filter(f => f.etiqueta === etiqueta) : lista
}

// ── El neto ────────────────────────────────────────────────────────────────
// Por moneda: lo que nos debe (te_debe) MENOS lo que le debemos (le_debes),
// sumando en centavos. Pesos primero. Una moneda sin ningún importe conocido
// no aparece (nunca un "Están en cero" inventado).
export function netoPorMoneda(filas) {
  const porMoneda = new Map()
  for (const f of filas ?? []) {
    const moneda = f.moneda || 'ARS'
    const te = centavosCu(f.te_debe), le = centavosCu(f.le_debes)
    if (te === null && le === null) continue
    const acum = porMoneda.get(moneda) ?? { te: 0, le: 0 }
    acum.te += te ?? 0
    acum.le += le ?? 0
    porMoneda.set(moneda, acum)
  }
  return [...porMoneda.entries()]
    .sort(([a], [b]) => (a === 'ARS' ? -1 : b === 'ARS' ? 1 : a.localeCompare(b)))
    .map(([moneda, s]) => ({ moneda, teDebe: s.te / 100, leDebes: s.le / 100, neto: (s.te - s.le) / 100 }))
}

// "Te debe $ X" / "Le debés $ X" / "Están en cero"; sin dato, "—".
export function textoNeto(neto, moneda = 'ARS') {
  const c = centavosCu(neto)
  if (c === null) return '—'
  if (c > 0) return 'Te debe ' + plataCu(c / 100, moneda)
  if (c < 0) return 'Le debés ' + plataCu(-c / 100, moneda)
  return 'Están en cero'
}

// Lo que se puede compensar se mira EN PESOS: lo que nos debe como cliente y
// lo que le debemos como proveedor (las dos columnas, sumadas).
export function saldosCompensables(filas) {
  const ars = netoPorMoneda(filas).find(s => s.moneda === 'ARS')
  return { teDebe: ars ? ars.teDebe : 0, leDebes: ars ? ars.leDebes : 0 }
}

export function puedeOfrecerCompensar(saldos, permitido) {
  return !!permitido && centavosCu(saldos?.teDebe) > 0 && centavosCu(saldos?.leDebes) > 0
}

// Lo máximo que se compensa: el MENOR de los dos saldos.
export function maximoCompensable(teDebe, leDebes) {
  const a = centavosCu(teDebe), b = centavosCu(leDebes)
  if (a === null || b === null) return null
  return Math.max(0, Math.min(a, b)) / 100
}

// El reparto entre las facturas, de la más vieja a la más nueva (como
// "Registrar pago"): a cada una, lo que queda o su saldo, lo que sea menor.
export function repartoFifoCu(monto, facturas) {
  let resta = Math.max(0, centavosCu(monto) ?? 0)
  return (facturas ?? []).map(f => {
    const saldo = Math.max(0, centavosCu(f.saldo) ?? 0)
    const toca = Math.min(resta, saldo)
    resta -= toca
    return { ...f, checked: toca > 0, monto: toca / 100 }
  })
}

export function aplicadoCu(facturas) {
  return (facturas ?? []).filter(f => f.checked).reduce((a, f) => a + Math.max(0, centavosCu(f.monto) ?? 0), 0) / 100
}

// Lo que dice el panel antes de confirmar.
export function textoDespues({ teDebe, leDebes }, monto) {
  const m = centavosCu(monto) ?? 0
  return `El cliente queda debiendo ${plataCu((centavosCu(teDebe) - m) / 100)} · Le debés ${plataCu((centavosCu(leDebes) - m) / 100)}`
}

// Lo que impide compensar, en palabras; null si se puede mandar.
export function validarCompensacion({ monto, maximo, facturas, fecha, hoy }) {
  const m = centavosCu(monto)
  if (m === null || m <= 0) return 'Escribí cuánto se compensa.'
  const tope = centavosCu(maximo)
  if (tope === null || tope <= 0) return 'No hay nada que compensar: hace falta que te deba y que le debas.'
  if (m > tope) return `No se puede compensar más de ${plataCu(tope / 100)}: es lo menor entre lo que te debe y lo que le debés.`
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(fecha ?? ''))) return 'Poné la fecha.'
  if (hoy && fecha > hoy) return 'La fecha no puede ser futura.'
  const tildadas = (facturas ?? []).filter(f => f.checked && (centavosCu(f.monto) ?? 0) > 0)
  if (!tildadas.length) return 'Elegí a qué facturas del proveedor se aplica.'
  const pasada = tildadas.find(f => (centavosCu(f.monto) ?? 0) > (centavosCu(f.saldo) ?? 0))
  if (pasada) return `A la factura${pasada.numero ? ' ' + pasada.numero : ''} le aplicás más que su saldo (${plataCu(pasada.saldo)}).`
  if (Math.round(aplicadoCu(facturas) * 100) !== m) return `Lo aplicado a las facturas (${plataCu(aplicadoCu(facturas))}) tiene que ser igual a lo que se compensa (${plataCu(m / 100)}).`
  return null
}

export function parametrosCompensar({ clienteId, monto, fecha, observacion, facturas }) {
  const obs = String(observacion ?? '').trim()
  return {
    p_cliente_id: clienteId,
    p_monto: monto,
    p_fecha: fecha,
    p_observacion: obs || null,
    p_aplicaciones: (facturas ?? []).filter(f => f.checked && (centavosCu(f.monto) ?? 0) > 0)
      .map(f => ({ factura_pendiente_id: f.id, monto_aplicado: f.monto })),
  }
}

// ── La clasificación: Cliente / Proveedor / Cliente y proveedor ────────────
export const CLASIFICACIONES = [['cliente', 'Cliente'], ['proveedor', 'Proveedor'], ['ambos', 'Cliente y proveedor']]

// `propio` es lo que la ficha ES (la de un cliente siempre es cliente; la de
// un proveedor, proveedor): esa opción sola se puede elegir para separar, y
// la otra sola no tiene sentido desde acá.
export function htmlClasificacion({ valor, propio, puede = true, ocupado = false }) {
  const otro = propio === 'cliente' ? 'proveedor' : 'cliente'
  return '<div class="cu-clasif" role="group" aria-label="Clasificación">' + CLASIFICACIONES.map(([clave, texto]) => {
    const elegido = clave === valor
    const apagado = !puede || ocupado || clave === otro
    const titulo = clave === otro ? `Esta es la ficha de un ${propio}: no puede dejar de serlo desde acá.` : ''
    return `<button type="button" class="cu-clasif__opcion${elegido ? ' cu-clasif__opcion--elegida' : ''}" data-clasificacion="${escCu(clave)}" aria-pressed="${elegido ? 'true' : 'false'}"` +
      `${apagado ? ' disabled' : ''}${titulo ? ` title="${escCu(titulo)}"` : ''}>${escCu(texto)}</button>`
  }).join('') + '</div>'
}

// Qué decir después de vincular. `conocidos` es lo que se pudo leer ANTES de
// vincular con los mismos permisos (un Set de ids); si no se pudo, null: ahí
// no se afirma que se creó.
export function textoVinculado({ id, conocidos, nombre, lado, donde }) {
  const quien = String(nombre ?? '').trim()
  const que = lado === 'proveedor' ? 'el proveedor' : 'el cliente'
  if (!quien) return lado === 'proveedor' ? 'Quedó vinculado con su ficha de proveedor.' : `Quedó vinculado como cliente${donde ? ' de ' + donde : ''}.`
  if (conocidos && id && !conocidos.has(id)) {
    return lado === 'proveedor'
      ? `Se creó el proveedor ${quien} en Cuentas corrientes.`
      : `Se creó el cliente ${quien} en Administración → Clientes${donde ? ' (' + donde + ')' : ''}.`
  }
  return `Quedó vinculado con ${que} ${quien}${lado !== 'proveedor' && donde ? ' de ' + donde : ''}.`
}

// ── La cuenta: estado, lectura y HTML ──────────────────────────────────────

export function estadoCuentaUnica({ clienteId = null, proveedorId = null, unidadId = null } = {}) {
  return { clienteId, proveedorId, unidadId, filas: null, error: null, filtro: '', comp: null }
}

export function parametrosCuentaUnica(cu) {
  return cu.clienteId
    ? { p_cliente_id: cu.clienteId, p_proveedor_id: null, p_unidad_negocio_id: null }
    : { p_cliente_id: null, p_proveedor_id: cu.proveedorId, p_unidad_negocio_id: cu.unidadId }
}

export async function cargarCuentaUnica(sb, cu) {
  cu.error = null
  try {
    const { data, error } = await sb.rpc('cuenta_unificada', parametrosCuentaUnica(cu))
    if (error) throw error
    cu.filas = Array.isArray(data) ? data : []
    const f = cu.filas[0]
    if (f) {
      cu.proveedorId = cu.proveedorId ?? f.proveedor_id ?? null
      cu.unidadId = cu.unidadId ?? f.unidad_negocio_id ?? null
      cu.clienteId = cu.clienteId ?? f.cliente_id ?? null
    }
  } catch (err) {
    console.error('No se pudo leer la cuenta única:', err)
    cu.filas = null
    cu.error = 'No se pudo leer la cuenta de cliente y proveedor. Revisá la conexión y volvé a entrar.'
  }
  return cu
}

function fechaCu(f) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(f ?? ''))
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '—'
}

// Un importe de una columna: vacío si es cero (la otra columna es la que
// cuenta), "—" si no vino.
function columnaCu(v, moneda) {
  const c = centavosCu(v)
  if (c === null) return '—'
  return c === 0 ? '' : plataCu(c / 100, moneda)
}

export function htmlFilaCu(f) {
  const moneda = f.moneda || 'ARS'
  const neto = centavosCu(f.neto_acum)
  const netoTexto = neto === null ? '—' : neto > 0 ? 'te debe ' + plataCu(neto / 100, moneda) : neto < 0 ? 'le debés ' + plataCu(-neto / 100, moneda) : 'en cero'
  return '<div class="cu-fila">' +
    `<div class="cu-fila__que"><span class="${claseEtiquetaCu(f.etiqueta)}">${escCu(f.etiqueta || 'Movimiento')}</span>` +
    `<span class="cu-fila__fecha">${escCu(fechaCu(f.fecha))}</span>` +
    `<span class="cu-fila__detalle">${escCu(f.detalle || '')}</span></div>` +
    `<div class="cu-fila__te" data-col="Te debe">${escCu(columnaCu(f.te_debe, moneda))}</div>` +
    `<div class="cu-fila__le" data-col="Le debés">${escCu(columnaCu(f.le_debes, moneda))}</div>` +
    `<div class="cu-fila__neto" data-col="Neto">${escCu(netoTexto)}</div></div>`
}

export function htmlCompensar(cu, { hoy } = {}) {
  const c = cu.comp
  if (!c) return ''
  if (c.cargando) return '<div class="cu-panel" data-cu-panel><p class="cu-suave">Leyendo las facturas del proveedor…</p></div>'
  if (c.errorLectura) {
    return `<div class="cu-panel" data-cu-panel><div class="cu-aviso cu-aviso--grave">${escCu(c.errorLectura)}</div>` +
      '<div class="cu-panel__acciones"><button type="button" class="cu-btn cu-btn--suave" data-cu-cancelar>Cerrar</button></div></div>'
  }
  return '<div class="cu-panel" data-cu-panel>' +
    '<h3 class="cu-panel__titulo">Compensar las dos cuentas</h3>' +
    `<p class="cu-suave">${escCu(`Te debe ${plataCu(c.saldos.teDebe)} como cliente y le debés ${plataCu(c.saldos.leDebes)} como proveedor. Se puede compensar hasta ${plataCu(c.maximo)}: lo menor de los dos.`)}</p>` +
    '<div class="cu-campos">' +
    '<label class="cu-campo"><span>Cuánto se compensa</span><input type="text" class="cu-input" data-cu-monto inputmode="decimal" autocomplete="off"></label>' +
    `<label class="cu-campo"><span>Fecha</span><input type="date" class="cu-input" data-cu-fecha max="${escCu(hoy ?? '')}" value="${escCu(c.fecha ?? '')}"></label>` +
    `<label class="cu-campo cu-campo--ancho"><span>Observación (opcional)</span><input type="text" class="cu-input" data-cu-obs maxlength="200" autocomplete="off" value="${escCu(c.obs ?? '')}"></label>` +
    '</div>' +
    '<div class="cu-subtitulo">Se aplica a estas facturas del proveedor, de la más vieja a la más nueva</div>' +
    `<div data-cu-facturas>${htmlFacturasCu(c)}</div>` +
    `<div class="cu-resumen" data-cu-resumen>${htmlResumenCu(c)}</div>` +
    `<p class="cu-error" data-cu-error${c.error ? '' : ' hidden'}>${escCu(c.error ?? '')}</p>` +
    '<div class="cu-panel__acciones">' +
    `<button type="button" class="cu-btn" data-cu-confirmar${c.enviando ? ' disabled' : ''}>${escCu(c.enviando ? 'Compensando…' : 'Compensar ' + plataCu(c.monto))}</button>` +
    `<button type="button" class="cu-btn cu-btn--suave" data-cu-cancelar${c.enviando ? ' disabled' : ''}>Cancelar</button>` +
    '</div></div>'
}

export function htmlFacturasCu(c) {
  if (!c.facturas.length) return '<p class="cu-suave">El proveedor no tiene facturas abiertas en esta empresa: no hay a qué aplicar la compensación.</p>'
  return c.facturas.map((f, i) => '<div class="cu-factura">' +
    `<input type="checkbox" class="cu-factura__check" data-cu-fac-check="${i}"${f.checked ? ' checked' : ''} aria-label="${escCu('Aplicar a la factura ' + (f.numero || ''))}">` +
    `<div class="cu-factura__info"><div class="cu-factura__numero">${escCu((f.numero || 'Sin número') + ' · ' + fechaCu(f.fecha))}</div>` +
    `<div class="cu-suave">${escCu('Saldo ' + plataCu(f.saldo))}</div></div>` +
    `<input type="text" class="cu-input cu-factura__monto" data-cu-fac-monto="${i}" inputmode="decimal" autocomplete="off" aria-label="${escCu('Monto para la factura ' + (f.numero || ''))}">` +
    '</div>').join('')
}

export function htmlResumenCu(c) {
  const sobre = centavosCu(c.monto) !== null && centavosCu(c.maximo) !== null && centavosCu(c.monto) > centavosCu(c.maximo)
  return `<div>${escCu('Aplicado ' + plataCu(aplicadoCu(c.facturas)) + ' de ' + plataCu(c.monto))}</div>` +
    (sobre ? `<div class="cu-error">${escCu(`No se puede compensar más de ${plataCu(c.maximo)}.`)}</div>`
      : `<div class="cu-resumen__despues">${escCu(textoDespues(c.saldos, c.monto))}</div>`)
}

export function htmlCuentaUnica(cu, { puedeCompensar = false, hoy = null } = {}) {
  if (cu.error) return `<div class="cu-caja"><div class="cu-aviso cu-aviso--grave">${escCu(cu.error)}</div></div>`
  if (!cu.filas) return '<div class="cu-caja"><p class="cu-suave">Cargando la cuenta de cliente y proveedor…</p></div>'
  const netos = netoPorMoneda(cu.filas)
  const saldos = saldosCompensables(cu.filas)
  const cabeza = netos.length ? netos.map((s, i) => {
    const signo = centavosCu(s.neto) > 0 ? 'positivo' : centavosCu(s.neto) < 0 ? 'negativo' : 'cero'
    return `<div class="cu-neto${i ? ' cu-neto--secundario' : ''}">` +
      `<strong class="cu-neto__monto cu-neto__monto--${signo}">${escCu(textoNeto(s.neto, s.moneda))}</strong>` +
      `<span class="cu-suave">${escCu(`Como cliente te debe ${plataCu(s.teDebe, s.moneda)} · como proveedor le debés ${plataCu(s.leDebes, s.moneda)}`)}</span></div>`
  }).join('') : '<div class="cu-neto"><strong class="cu-neto__monto cu-neto__monto--cero">—</strong><span class="cu-suave">Todavía no hay movimientos en ninguna de las dos cuentas.</span></div>'
  const ofrece = puedeOfrecerCompensar(saldos, puedeCompensar) && !cu.comp
  const etiquetas = etiquetasPresentes(cu.filas)
  const filtro = etiquetas.length
    ? '<label class="cu-filtro"><span>Ver</span><select class="cu-input" data-cu-filtro><option value="">Todo</option>' +
      etiquetas.map(e => `<option value="${escCu(e)}"${e === cu.filtro ? ' selected' : ''}>${escCu(e)}</option>`).join('') + '</select></label>'
    : ''
  const filas = [...filasFiltradas(cu.filas, cu.filtro)].reverse()
  const lista = filas.length
    ? '<div class="cu-lista"><div class="cu-encabezado" aria-hidden="true"><span>Movimiento</span><span>Te debe</span><span>Le debés</span><span>Neto</span></div>' + filas.map(htmlFilaCu).join('') + '</div>'
    : (cu.filas.length ? `<p class="cu-suave">${escCu('Ningún movimiento de «' + cu.filtro + '».')}</p>` : '')
  return '<div class="cu-caja">' +
    '<div class="cu-cabeza"><span class="cu-rotulo">Cuenta de cliente y proveedor</span>' + cabeza +
    (ofrece ? '<button type="button" class="cu-btn" data-cu-compensar>Compensar</button>' : '') + '</div>' +
    htmlCompensar(cu, { hoy }) + filtro + lista + '</div>'
}

// ── Lo que hace la pantalla (las dos pantallas llaman a lo mismo) ─────────
// ctx = { sb, cu, contenedor, hoy, puedeCompensar, alCompensado(gastoId) }

export function pintarCuentaUnica(ctx) {
  if (!ctx?.contenedor) return
  ctx.contenedor.innerHTML = htmlCuentaUnica(ctx.cu, { puedeCompensar: ctx.puedeCompensar, hoy: ctx.hoy })
  enlazarCamposCu(ctx)
}

// Los campos de plata se dibujan SIN value: se enlazan y se escriben con
// ponerNumero (la regla de los números).
function enlazarCamposCu(ctx) {
  const c = ctx.cu.comp
  if (!c || c.cargando || c.errorLectura || !ctx.contenedor.querySelector) return
  const monto = ctx.contenedor.querySelector('[data-cu-monto]')
  if (monto) { enlazarCampoNumero(monto, { decimales: 2 }); ponerNumero(monto, c.monto) }
  enlazarFacturasCu(ctx)
}

function enlazarFacturasCu(ctx) {
  const c = ctx.cu.comp
  for (const inp of ctx.contenedor.querySelectorAll?.('[data-cu-fac-monto]') ?? []) {
    enlazarCampoNumero(inp, { decimales: 2 })
    const f = c.facturas[Number(inp.dataset.cuFacMonto)]
    ponerNumero(inp, f && f.checked ? f.monto : null)
  }
}

function repintarParteCu(ctx, { facturas = false } = {}) {
  const c = ctx.cu.comp
  const q = (s) => ctx.contenedor.querySelector?.(s)
  if (facturas) { const el = q('[data-cu-facturas]'); if (el) { el.innerHTML = htmlFacturasCu(c); enlazarFacturasCu(ctx) } }
  const r = q('[data-cu-resumen]'); if (r) r.innerHTML = htmlResumenCu(c)
  const b = q('[data-cu-confirmar]'); if (b) b.textContent = 'Compensar ' + plataCu(c.monto)
  const e = q('[data-cu-error]'); if (e) { e.textContent = c.error ?? ''; e.hidden = !c.error }
}

export async function abrirCompensar(ctx) {
  const cu = ctx.cu
  if (cu.comp || !cu.filas) return
  const saldos = saldosCompensables(cu.filas)
  if (!puedeOfrecerCompensar(saldos, ctx.puedeCompensar)) return
  cu.comp = { cargando: true, facturas: [], saldos, maximo: null, monto: null, fecha: ctx.hoy, obs: '', error: null, enviando: false }
  pintarCuentaUnica(ctx)
  const comp = cu.comp
  try {
    const { data, error } = await ctx.sb.rpc('sugerir_facturas_fifo', {
      p_proveedor_id: cu.proveedorId, p_unidad_negocio_id: cu.unidadId, p_moneda: 'ARS', p_monto: TOPE_FACTURAS_CU,
    })
    if (error) throw error
    if (cu.comp !== comp) return
    const facturas = (Array.isArray(data) ? data : [])
      .map(f => ({ id: f.factura_pendiente_id, numero: f.numero_comprobante, fecha: f.fecha_factura, saldo: Number(f.saldo_pendiente) || 0 }))
    // Lo que le debemos, para el tope: lo que de verdad está abierto en las
    // facturas (la base compara contra la deuda pendiente, no contra la suma
    // de la columna, que también cuenta créditos).
    const deuda = facturas.reduce((a, f) => a + (centavosCu(f.saldo) ?? 0), 0) / 100
    comp.saldos = { teDebe: saldos.teDebe, leDebes: deuda }
    comp.maximo = maximoCompensable(saldos.teDebe, deuda)
    comp.monto = comp.maximo
    comp.facturas = repartoFifoCu(comp.monto, facturas)
    comp.cargando = false
  } catch (err) {
    if (cu.comp !== comp) return
    console.error('No se pudieron leer las facturas del proveedor:', err)
    comp.cargando = false
    comp.errorLectura = err?.message ? 'No se pudieron leer las facturas del proveedor: ' + err.message : 'No se pudieron leer las facturas del proveedor. Revisá la conexión.'
  }
  pintarCuentaUnica(ctx)
}

export function cerrarCompensar(ctx) {
  if (ctx.cu.comp?.enviando) return
  ctx.cu.comp = null
  pintarCuentaUnica(ctx)
}

export async function confirmarCompensacion(ctx) {
  const c = ctx.cu.comp
  if (!c || c.enviando || c.cargando) return
  c.error = validarCompensacion({ monto: c.monto, maximo: c.maximo, facturas: c.facturas, fecha: c.fecha, hoy: ctx.hoy })
  if (c.error) { repintarParteCu(ctx); return }
  c.enviando = true
  pintarCuentaUnica(ctx)
  try {
    const { data, error } = await ctx.sb.rpc('compensar_cuentas', parametrosCompensar({
      clienteId: ctx.cu.clienteId, monto: c.monto, fecha: c.fecha, observacion: c.obs, facturas: c.facturas,
    }))
    if (error) throw error
    ctx.cu.comp = null
    await ctx.alCompensado?.(data)
  } catch (err) {
    console.error('No se pudo compensar:', err)
    // El error de la base va TAL CUAL, pegado al botón.
    c.enviando = false
    c.error = err?.message || 'No se pudo compensar. Probá de nuevo.'
    pintarCuentaUnica(ctx)
  }
}

// Los toques adentro de la cuenta (las dos pantallas delegan acá).
export function alTocarCuentaUnica(e, ctx) {
  const t = e.target
  if (!t?.closest) return
  if (t.closest('[data-cu-compensar]')) { abrirCompensar(ctx); return }
  if (t.closest('[data-cu-cancelar]')) { cerrarCompensar(ctx); return }
  if (t.closest('[data-cu-confirmar]')) { confirmarCompensacion(ctx); return }
}

export function alCambiarCuentaUnica(e, ctx) {
  const t = e.target
  const c = ctx.cu.comp
  if (t?.matches?.('[data-cu-filtro]')) { ctx.cu.filtro = t.value; pintarCuentaUnica(ctx); return }
  if (!c) return
  if (t?.matches?.('[data-cu-monto]')) {
    c.monto = leerCampoNumero(t)
    c.facturas = repartoFifoCu(c.monto, c.facturas)
    c.error = null
    repintarParteCu(ctx, { facturas: true })
    return
  }
  if (t?.matches?.('[data-cu-fac-check]')) {
    const f = c.facturas[Number(t.dataset.cuFacCheck)]
    if (!f) return
    f.checked = !!t.checked
    if (f.checked && !(centavosCu(f.monto) > 0)) {
      const falta = Math.max(0, (centavosCu(c.monto) ?? 0) - Math.round(aplicadoCu(c.facturas) * 100))
      f.monto = Math.min(falta, centavosCu(f.saldo) ?? 0) / 100
    }
    if (!f.checked) f.monto = 0
    c.error = null
    repintarParteCu(ctx, { facturas: true })
    return
  }
  if (t?.matches?.('[data-cu-fac-monto]')) {
    const f = c.facturas[Number(t.dataset.cuFacMonto)]
    if (!f) return
    f.monto = leerCampoNumero(t) ?? 0
    f.checked = (centavosCu(f.monto) ?? 0) > 0
    c.error = null
    repintarParteCu(ctx)
    return
  }
  if (t?.matches?.('[data-cu-fecha]')) { c.fecha = t.value; return }
  if (t?.matches?.('[data-cu-obs]')) { c.obs = t.value }
}
