// CUENTAS CORRIENTES · PROVEEDORES (29/09/2026, Parte 3 de la tanda).
//
// Pedido de Facu: "El módulo es solo de proveedores pero el nombre no lo dice,
// y mezcla naranja y verde sin criterio". Esta suite fija:
//  - EL NOMBRE: "Cuentas corrientes · Proveedores" en la pestaña, la cabecera
//    y el catálogo (js/modulos.js: la barra lateral, el tablero, los accesos
//    directos de Administración); y el link a las cuentas de los CLIENTES
//    (Administración → Clientes) solo para quien las puede ver (retiros:ver).
//  - LOS COLORES del sistema 2026: naranja SOLO para lo que se toca y lo
//    elegido; verde lo que está a favor; la deuda en tinta neutra (la base no
//    sabe si está vencida: facturas_pendientes no tiene vencimiento); bordó lo
//    que falta (descargas sin importe) y el interés por mora. Sin turquesa.
//  - EL CHEQUE ENDOSADO: endosar_cheque_a_proveedor registra el endoso como
//    un pago (gasto con medio_pago 'cheque' y descripción
//    'Cheque endosado <banco>-<número> — <razón social>'). La vista trae
//    'Pago a proveedor' fijo: en la ficha, el historial, su Excel y el detalle
//    del pago tiene que decir "Cheque endosado 072-43300023".
// Se EJECUTAN las funciones reales del módulo con un document y una base
// falsos, y con HTML malicioso en lo que viene de la base.
//
//   node pruebas/test-cuentas-corrientes-proveedores.js
'use strict'

const path = require('path')
const fs = require('fs')
const { construirCon } = require('./sandbox')
const { arnes, leer, marca, chequearMarcas } = require('./circuito-comun')
const { fuenteNumeros } = require('./numeros-comun')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/cuentas-corrientes.html')
const MODULOS = process.env.ARCHIVO_MODULOS_JS || path.join(RAIZ, 'js/modulos.js')
const FUENTE = leer(ARCHIVO)
const FUENTE_MODULOS = fs.readFileSync(MODULOS, 'utf8')
// El runner de mutaciones confirma con esta línea que leyó el archivo mutado.
console.log(`ARCHIVO ${MODULOS} (${FUENTE_MODULOS.length} bytes)`)
const { chk, fin } = arnes()

const PRELUDIO = `
  ${fuenteNumeros()}
  var console = { log(){}, warn(){}, error(){} }
  function nuevoEl(id) {
    const el = { id, innerHTML: '', textContent: '', value: '', hidden: false, disabled: false, dataset: {}, style: {},
      classList: { add(){}, remove(){}, toggle(){} },
      querySelectorAll: () => [], querySelector: () => null, addEventListener(){}, focus(){}, removeAttribute(k){ if (k === 'hidden') el.hidden = false } }
    return el
  }
  var __els = new Map()
  var document = {
    getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) },
    querySelectorAll: () => [], querySelector: (s) => document.getElementById('qs:' + s), body: nuevoEl('body'),
  }
  var location = { href: 'https://x.test/modulos/cuentas-corrientes.html', pathname: '/modulos/cuentas-corrientes.html', search: '' }
  var history = { pushState() {}, replaceState() {} }
  // La base falsa: filtra por eq/in como PostgREST, maybeSingle devuelve una
  // fila, y anota cada consulta.
  var __datos = {}, __consultas = [], __falla = {}
  function __consulta(tabla) {
    const filtros = [], registro = { tabla, in: [] }
    let uno = false
    __consultas.push(registro)
    const q = {
      select: () => q, order: () => q, limit: () => q, gte: () => q, lte: () => q,
      maybeSingle() { uno = true; return q },
      eq(c, v) { filtros.push(r => r[c] === v); return q },
      in(c, vs) { registro.in.push(vs.length); filtros.push(r => vs.includes(r[c])); return q },
      then(res, rej) {
        if (__falla[tabla]) return Promise.resolve({ data: null, error: { message: 'falló ' + tabla } }).then(res, rej)
        const filas = (__datos[tabla] ?? []).filter(r => filtros.every(f => f(r)))
        return Promise.resolve({ data: uno ? (filas[0] ?? null) : filas, error: null }).then(res, rej)
      },
    }
    return q
  }
  var supabase = { from: (t) => __consulta(t), rpc: async () => ({ data: [], error: null }) }
  var __errores = []
  function mostrarError(m) { __errores.push(m) } function mostrarExito() {}
  function formatearFecha(f) { if (!f) return '—'; const [a, m, d] = String(f).split('-'); return d + '/' + m + '/' + a }
  function eliminarFactura() { return false }
  function abrirModalPago() {} function abrirModalAplicarCreditoDesdeFicha() {}
  var __hojas = []
  var XLSX = { utils: { json_to_sheet(f) { __hojas.push(f); return {} }, book_new() { return {} }, book_append_sheet() {} }, writeFile() {} }
  var estado = {
    miRolApp: 'usuario', miEmpleadoId: 'yo',
    misTareas: new Set(['cuentas_corrientes:ver_todo', 'cuentas_corrientes:registrar_pago', 'cuentas_corrientes:aplicar_credito']),
    unidadElegida: null,
    maestros: { unidades: [{ id: 'u-n', nombre: 'Cucuruchos Nuss' }], proveedores: [{ id: 'p1', razon_social: 'DIMAFLO S.A.' }] },
    fabrica: FABRICA_SIN_DATOS,
    filtros: { proveedores: { busqueda: '' }, historial: { busqueda: '', fechaDesde: '', fechaHasta: '', rangoRapido: null }, padron: { busqueda: '' } },
    historialCrudo: [], listaHistorial: [], estadoPorFacturaHistorial: {}, etiquetasPagoHistorial: new Map(),
    ficha: null, sinImporte: [], fichaSaldos: [], fichaCreditos: [],
  }
  var turnoHistorial = 0
`

const FUNCIONES = [
  'pasaFiltroUnidad', 'veUnidad', 'etiquetaUnidad', 'esc', 'importeHtml', 'formatearImporte', 'formatearImporteCentavosSuaves',
  'badgeEstadoFactura', 'tieneTarea', 'nombreUnidad', 'nombreProveedor', 'contarSinImporte', 'contarSinImporteVisible', 'htmlSinImporte',
  'esSinImporte', 'htmlFilaSinImporte', 'decimalesImporteSin', 'enlazarCampoImporteSin', 'cargarEstadosDeFacturas', 'cargarCantidadesSinImporte',
  'productoUnicoConCantidad', 'textoCantidadInsumo', 'totalImporteFormulario', 'resumenCantidades',
  'saldosFichaVisibles', 'creditosFichaDeUnidad', 'renderizarFichaBanner', 'cargarFichaMovimientos', 'renderizarFichaMovimientos',
  'cargarHistorial', 'armarHistorial', 'renderizarListaHistorial', 'exportarExcelHistorial', 'abrirModalDetallePago',
  // lo nuevo
  'etiquetaPagoDeGasto', 'cargarEtiquetasDePagos', 'referenciaMovimiento',
  // el saldo inicial de un proveedor (30/09/2026)
  'esSaldoInicial', 'nombreFactura', 'numeroParaMostrar', 'etiquetaTipoMovimiento', 'cargarObservacionesSaldoInicial', 'puedeCargarSaldoInicial',
]
const CONSTANTES = ['ESTADO_FACTURA_LABEL', 'TIPO_MOVIMIENTO_LABEL', 'MEDIOS_PAGO_LABEL', 'TANDA_GASTOS_PAGO', 'NUMERO_SALDO_INICIAL']

function sandbox() {
  return construirCon(ARCHIVO, {
    preludio: PRELUDIO, funciones: FUNCIONES, constantes: CONSTANTES,
    retorno: `estado, __els, __errores, __consultas, __hojas, __setDatos(t, d){ __datos[t] = d }, __fallar(t){ __falla[t] = true }`,
  })
}
const html = (S, id) => S.__els.get(id)?.innerHTML ?? ''

// ── utilidades de CSS: el cuerpo de la regla con ese selector exacto ────────
const CSS = FUENTE.slice(FUENTE.indexOf('<style>'), FUENTE.indexOf('</style>'))
const CSS_SIN_COMENTARIOS = CSS.replace(/\/\*[\s\S]*?\*\//g, '')
function regla(selector) {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const m = new RegExp('(^|\\n)\\s*' + esc + '\\s*\\{([^}]*)\\}').exec(CSS_SIN_COMENTARIOS)
  return m ? m[2] : null
}
const NEUTROS = /var\(--color-(texto|texto-2|texto-menu|texto-suave|superficie|fondo|borde)\)/

// ── los datos de los movimientos ───────────────────────────────────────────
const MOVS = [
  { proveedor_id: 'p1', unidad_negocio_id: 'u-n', moneda: 'ARS', fecha: '2026-09-29', tipo: 'pago', monto: -550000, gasto_id: 'g-cheque', referencia: 'Pago a proveedor', saldo_acumulado: 0, orden_desempate: 3 },
  { proveedor_id: 'p1', unidad_negocio_id: 'u-n', moneda: 'ARS', fecha: '2026-09-28', tipo: 'pago', monto: -1000, gasto_id: 'g-efectivo', referencia: 'Pago a proveedor', saldo_acumulado: 550000, orden_desempate: 2 },
  { proveedor_id: 'p1', unidad_negocio_id: 'u-n', moneda: 'ARS', fecha: '2026-09-27', tipo: 'factura', monto: 551000, factura_pendiente_id: 'f1', referencia: '0001-00001234', saldo_acumulado: 551000, orden_desempate: 1 },
]
const GASTOS = [
  { id: 'g-cheque', medio_pago: 'cheque', descripcion: 'Cheque endosado 072-43300023 — DIMAFLO S.A.', fecha_pago: '2026-09-29', importe: 550000, moneda: 'ARS' },
  { id: 'g-efectivo', medio_pago: 'efectivo', descripcion: 'Pago a cuenta corriente — DIMAFLO S.A.', fecha_pago: '2026-09-28', importe: 1000, moneda: 'ARS' },
]
function preparar() {
  const S = sandbox()
  S.__setDatos('v_cuenta_corriente_movimientos', MOVS)
  S.__setDatos('gastos', GASTOS)
  S.__setDatos('facturas_pendientes', [{ id: 'f1', estado: 'pendiente' }])
  return S
}
function abrirFicha(S) {
  S.estado.ficha = { proveedorId: 'p1', unidadId: 'u-n', nombre: 'DIMAFLO S.A.', unidades: [], movimientosRaw: [], estadoPorFactura: {},
    filtros: { rangoRapido: null, fechaDesde: '', fechaHasta: '', tipo: 'todos', orden: 'fecha_desc' } }
}

async function main() {
  // ══ 1. EL NOMBRE ═══════════════════════════════════════════════════════════
  // Desde el 05/10/2026 el módulo tiene DOS pestañas de primer nivel
  // (Proveedores y Clientes) y vuelve a llamarse "Cuentas corrientes". Lo de
  // las pestañas lo fija test-cuentas-corrientes-cheques-pago.js.
  chk('la pestaña se llama "Cuentas corrientes"', /<title>Cuentas corrientes — Seis Destinos<\/title>/.test(FUENTE))
  chk('la cabecera dice "Cuentas corrientes"', /<span class="cc-header__titulo">Cuentas corrientes<\/span>/.test(FUENTE))
  chk('el catálogo (barra lateral, tablero, accesos directos) dice el nombre nuevo',
    /clave: 'cuentas-corrientes',[\s\S]{0,400}?nombre: 'Cuentas corrientes',/.test(FUENTE_MODULOS))
  chk('y su descripción dice proveedores y clientes', /descripcion: 'Cuentas corrientes de proveedores y clientes'/.test(FUENTE_MODULOS))
  chk('el link viejo a Administración → Clientes ya no está (lo reemplaza la pestaña)', !/id="cc-link-clientes"/.test(FUENTE))
  chk('las tareas que se leen incluyen retiros (la pestaña Clientes) y cobranzas (la cartera)',
    /\.in\('modulo', \['cuentas_corrientes', 'facturas_pendientes', 'gastos', 'retiros', 'cobranzas'\]\)/.test(FUENTE))
  chk('las pestañas se pintan al leer las tareas', /estado\.misTareas = new Set\(\(tareas \?\? \[\]\)\.map\(t => `\$\{t\.modulo\}:\$\{t\.tarea\}`\)\)\n\s+renderizarPrimerNivel\(\)/.test(FUENTE))

  // ══ 2. LOS COLORES ═════════════════════════════════════════════════════════
  chk('no queda ningún turquesa en el CSS ni en el HTML', !/var\(--turquesa|--turquesa\s*:/.test(FUENTE.replace(/\/\*[\s\S]*?\*\//g, '')))
  chk('no queda la clase btn-cc-turquesa', !/btn-cc-turquesa/.test(FUENTE))
  // Lo que se toca y lo elegido: naranja.
  for (const [sel, qué] of [
    ['.tabs-cc__opcion--activa', 'la pestaña elegida'], ['.segmented-rango__opcion--activa', 'Hoy / En el mes elegido'],
    ['.btn-tipo-doc--seleccionado', 'el tipo elegido'], ['.btn-ver-cuenta', 'Ver cuenta'], ['.btn-cc-accion', 'los botones de confirmar'],
    ['.banner-ficha-cc__btn--primario', 'Registrar pago'],
  ]) chk(`naranja en ${qué} (${sel})`, /background(-color)?:\s*var\(--color-acento\)/.test(regla(sel) ?? ''), regla(sel))
  chk('naranja en el borde de los botones de la barra de filtros', /border:\s*1\.5px solid var\(--color-acento\)/.test(regla('.btn-filtro-cc') ?? ''))
  chk('naranja en "Aplicar crédito" (secundario: borde naranja)', /var\(--color-acento\)/.test(regla('.banner-ficha-cc__btn--secundario') ?? ''))
  chk('naranja en el chip para elegir la unidad de la ficha', /var\(--color-acento\)/.test(regla('.ficha-unidad-cc__chip') ?? ''))
  // Los datos: NO naranja.
  chk('"Saldo total a pagar" ya no es una tarjeta naranja (es un dato)', !/acento|naranja/.test(regla('.resumen-cc-card--navy') ?? 'acento') && /var\(--color-fondo\)/.test(regla('.resumen-cc-card--navy') ?? ''))
  chk('su número va en tinta neutra', /color:\s*var\(--color-texto\)/.test(regla('.resumen-cc-card--navy .resumen-cc-card__monto') ?? ''))
  chk('el banner de la ficha es una tarjeta blanca (sin degradé)', /background:\s*var\(--color-fondo\)/.test(regla('.banner-ficha-cc') ?? '') && !/gradient/.test(regla('.banner-ficha-cc') ?? 'gradient'))
  chk('la deuda del banner, en tinta neutra', /color:\s*var\(--color-texto\)/.test(regla('.banner-ficha-cc__monto') ?? ''))
  chk('la fecha de cada movimiento ya no es naranja', !/acento/.test(regla('.fila-movimiento__fecha') ?? 'acento') && NEUTROS.test(regla('.fila-movimiento__fecha') ?? ''))
  chk('el punto de una factura ya no es naranja', !/acento/.test(regla('.punto-tipo-mov--factura') ?? 'acento'))
  chk('el chip "Pago" ya no es naranja', !/acento|naranja/.test(regla('.chip-tipo-mov--pago') ?? 'acento'))
  // Lo que se debe: neutro (no se sabe si está vencido).
  chk('una factura "Pendiente" ya no es roja (no se sabe si está vencida)', !/rojo|bordo/.test(regla('.badge-estado-factura--pendiente') ?? 'rojo') && NEUTROS.test(regla('.badge-estado-factura--pendiente') ?? ''))
  chk('"Parcial" tampoco es ámbar', !/amarillo|rojo|bordo/.test(regla('.badge-estado-factura--parcial') ?? 'amarillo'))
  chk('el chip "Factura" del historial, neutro', !/rojo|bordo|acento/.test(regla('.chip-tipo-mov--factura') ?? 'rojo') && NEUTROS.test(regla('.chip-tipo-mov--factura') ?? ''))
  chk('el monto que suma deuda, en tinta neutra', /color:\s*var\(--color-texto\)/.test(regla('.fila-movimiento__monto--deuda') ?? ''))
  chk('el "Debe" de la lista, en tinta neutra', /color:\s*var\(--color-texto\)/.test(regla('.proveedor-cc__monto') ?? ''))
  // Lo que está a favor: verde.
  for (const [sel, qué] of [
    ['.proveedor-cc__monto--favor', 'el crédito a favor de la lista'], ['.resumen-cc-card__monto--favor', 'el crédito a favor del resumen'],
    ['.fila-movimiento__monto--reduce', 'lo que baja la deuda'], ['.resumen-aplicacion__excedente', 'el sobrante que queda a favor'],
  ]) chk(`verde en ${qué}`, /var\(--verde(-oscuro)?\)/.test(regla(sel) ?? ''), regla(sel))
  chk('verde en el saldo a favor del banner', /var\(--verde-oscuro\)/.test(regla('.banner-ficha-cc--favor .banner-ficha-cc__monto') ?? '') ||
    /\.banner-ficha-cc--favor \.banner-ficha-cc__monto \{ color: var\(--verde-oscuro\); \}/.test(CSS_SIN_COMENTARIOS))
  chk('verde en "Pagada"', /var\(--verde/.test(regla('.badge-estado-factura--pagada') ?? ''))
  chk('verde en el pago y el crédito aplicado del historial', /var\(--verde/.test(regla('.chip-tipo-mov--pago') ?? '') && /var\(--verde/.test(regla('.chip-tipo-mov--credito_aplicado') ?? ''))
  chk('verde en el crédito que dejó un sobrepago (detalle del pago)', /var\(--verde-suave\)/.test(regla('.detalle-pago-credito') ?? ''))
  // Lo que falta: bordó.
  chk('las descargas sin importe siguen marcadas, ahora en bordó', /var\(--bordo\)/.test(regla('.sin-importe-cc') ?? '') && /var\(--bordo\)/.test(regla('.fila-movimiento__monto--falta') ?? '') &&
    /var\(--bordo\)/.test(regla('.badge-estado-factura--sin_importe') ?? ''))
  chk('el interés por mora, en bordó', /var\(--bordo/.test(regla('.chip-tipo-mov--interes') ?? '') && /var\(--bordo/.test(regla('.punto-tipo-mov--interes') ?? ''))
  chk('ningún hex rojo suelto (#B91C1C) en el módulo', !/#B91C1C/i.test(CSS_SIN_COMENTARIOS))
  chk('el ícono de la cabecera usa el color del módulo (PALETA_MODULO)', /oklch\(0\.50 0\.15 322\)/.test(regla('.cc-header__logo') ?? '') &&
    /'cuentas-corrientes': \[0\.50, 0\.15, 322\]/.test(FUENTE_MODULOS))
  chk('los avatares ya no usan azul ni lavanda', !/#E3F0FF|#F1E7FC/i.test(FUENTE))

  // El banner: el saldo a favor lleva la clase verde; la deuda no.
  {
    const S = sandbox()
    abrirFicha(S)
    S.estado.fichaSaldos = [{ proveedor_id: 'p1', unidad_negocio_id: 'u-n', moneda: 'ARS', deuda_pendiente: 0, credito_disponible: 700 }]
    S.renderizarFichaBanner()
    const b = html(S, 'ficha-banner')
    chk('un saldo a favor pinta el banner en verde (banner-ficha-cc--favor)', /class="banner-ficha-cc banner-ficha-cc--favor"/.test(b) && /Saldo a favor/.test(b), b.slice(0, 200))
    S.estado.fichaSaldos = [{ proveedor_id: 'p1', unidad_negocio_id: 'u-n', moneda: 'ARS', deuda_pendiente: 900, credito_disponible: 50 }]
    S.renderizarFichaBanner()
    const d = html(S, 'ficha-banner')
    chk('una deuda NO lleva la clase verde (tinta neutra)', !/banner-ficha-cc--favor/.test(d) && /A pagar/.test(d), d.slice(0, 200))
  }

  // ══ 3. EL CHEQUE ENDOSADO ═════════════════════════════════════════════════
  {
    const S = sandbox()
    chk('etiqueta de un cheque endosado', S.etiquetaPagoDeGasto({ medio_pago: 'cheque', descripcion: 'Cheque endosado 072-43300023 — DIMAFLO S.A.' }) === 'Cheque endosado 072-43300023')
    chk('un pago en efectivo no es un cheque endosado', S.etiquetaPagoDeGasto({ medio_pago: 'efectivo', descripcion: 'Cheque endosado 072-43300023 — X' }) === null)
    chk('un cheque con otra descripción queda como vino', S.etiquetaPagoDeGasto({ medio_pago: 'cheque', descripcion: 'Pago a cuenta corriente — X' }) === null)
    chk('sin gasto, nada', S.etiquetaPagoDeGasto(null) === null && S.etiquetaPagoDeGasto(undefined) === null)
    chk('un número de otro largo no se toma (los CHECK de cobranza_cheques piden 3 y 8 dígitos)',
      S.etiquetaPagoDeGasto({ medio_pago: 'cheque', descripcion: 'Cheque endosado 72-43300023 — X' }) === null &&
      S.etiquetaPagoDeGasto({ medio_pago: 'cheque', descripcion: 'Cheque endosado 072-433000231 — X' }) === null)
    chk('solo se toman dígitos: HTML en la razón social no pasa a la etiqueta',
      S.etiquetaPagoDeGasto({ medio_pago: 'cheque', descripcion: 'Cheque endosado 285-68435161 — "><img src=x onerror=alert(1)>' }) === 'Cheque endosado 285-68435161')
    const refs = new Map([['g1', 'Cheque endosado 285-68806281']])
    chk('la referencia de un pago endosado es la del cheque', S.referenciaMovimiento({ tipo: 'pago', gasto_id: 'g1', referencia: 'Pago a proveedor' }, refs) === 'Cheque endosado 285-68806281')
    chk('la de otro pago, la de la vista', S.referenciaMovimiento({ tipo: 'pago', gasto_id: 'g2', referencia: 'Pago a proveedor' }, refs) === 'Pago a proveedor')
    chk('una factura con el mismo gasto_id no se toca', S.referenciaMovimiento({ tipo: 'factura', gasto_id: 'g1', referencia: '0001-1' }, refs) === '0001-1')
    chk('sin mapa, la de la vista', S.referenciaMovimiento({ tipo: 'pago', gasto_id: 'g1', referencia: 'Pago a proveedor' }, undefined) === 'Pago a proveedor')
  }
  {
    // Cargar las etiquetas: solo los gastos de los PAGOS, en tandas.
    const S = preparar()
    const m = await S.cargarEtiquetasDePagos(MOVS)
    chk('cargarEtiquetasDePagos: el cheque endosado, y nada más', m.size === 1 && m.get('g-cheque') === 'Cheque endosado 072-43300023', JSON.stringify([...m]))
    const q = S.__consultas.filter(c => c.tabla === 'gastos')
    chk('una sola consulta a gastos para dos pagos', q.length === 1 && q[0].in[0] === 2, JSON.stringify(q))
    const T = preparar()
    const muchos = Array.from({ length: 450 }, (_, i) => ({ tipo: 'pago', gasto_id: 'g' + i }))
    await T.cargarEtiquetasDePagos(muchos)
    const qt = T.__consultas.filter(c => c.tabla === 'gastos')
    chk('con muchos pagos, en tandas de TANDA_GASTOS_PAGO', qt.length === 3 && qt.every(c => c.in[0] <= 200), JSON.stringify(qt.map(c => c.in)))
    const U = preparar()
    await U.cargarEtiquetasDePagos([{ tipo: 'factura', gasto_id: null }])
    chk('sin pagos, no consulta', U.__consultas.length === 0)
    const V = preparar()
    V.__fallar('gastos')
    const mv = await V.cargarEtiquetasDePagos(MOVS)
    chk('si la lectura falla, no se inventa nada (mapa vacío)', mv.size === 0)
  }
  {
    // La ficha: el pago del cheque dice "Cheque endosado 072-43300023".
    const S = preparar()
    abrirFicha(S)
    await S.cargarFichaMovimientos()
    const h = html(S, 'lista-movimientos-ficha')
    chk('ficha: el pago del cheque endosado dice "Cheque endosado 072-43300023"', /fila-movimiento__referencia">Cheque endosado 072-43300023</.test(h), h.slice(0, 600))
    chk('ficha: el otro pago sigue diciendo "Pago a proveedor"', /fila-movimiento__referencia">Pago a proveedor</.test(h))
    chk('ficha: la factura, su número', /0001-00001234/.test(h))
    chk('ficha: el pago del cheque sigue siendo un Pago, en verde', /Pago<\/div>\s*<div class="fila-movimiento__referencia">Cheque endosado/.test(h) && /fila-movimiento__monto--reduce/.test(h))
    const T = preparar()
    abrirFicha(T)
    T.__fallar('gastos')
    await T.cargarFichaMovimientos()
    chk('ficha: si no se pueden leer los pagos, se ve igual con "Pago a proveedor"', /fila-movimiento__referencia">Pago a proveedor</.test(html(T, 'lista-movimientos-ficha')) && !/Cheque endosado/.test(html(T, 'lista-movimientos-ficha')))
  }
  {
    // El historial y su Excel.
    const S = preparar()
    await S.cargarHistorial()
    const h = html(S, 'lista-historial')
    chk('historial: "DIMAFLO S.A. — Cheque endosado 072-43300023"', /DIMAFLO S\.A\. — Cheque endosado 072-43300023/.test(h), h.slice(0, 500))
    chk('historial: el otro pago, "Pago a proveedor"', /DIMAFLO S\.A\. — Pago a proveedor/.test(h))
    S.exportarExcelHistorial()
    const filas = S.__hojas[0] ?? []
    chk('el Excel del historial también dice "Cheque endosado 072-43300023"', filas.some(f => f.Referencia === 'Cheque endosado 072-43300023') && filas.some(f => f.Referencia === 'Pago a proveedor'), JSON.stringify(filas))
  }
  {
    // El detalle del pago.
    const S = preparar()
    S.__setDatos('aplicaciones_pago', [])
    S.__setDatos('creditos_proveedor', [])
    await S.abrirModalDetallePago('g-cheque')
    const h = html(S, 'detalle-pago-contenido')
    chk('el detalle del pago dice "Cheque endosado 072-43300023" en vez de solo "Cheque"', /detalle-pago-hero__meta">[^<]*· Cheque endosado 072-43300023</.test(h), h.slice(0, 400))
    const T = preparar()
    T.__setDatos('aplicaciones_pago', [])
    T.__setDatos('creditos_proveedor', [])
    await T.abrirModalDetallePago('g-efectivo')
    chk('un pago en efectivo sigue diciendo "Efectivo"', /detalle-pago-hero__meta">[^<]*· Efectivo</.test(html(T, 'detalle-pago-contenido')))
    // El doble de la base devuelve todas las columnas sin mirar el select: la
    // columna se exige en el TEXTO de la consulta.
    chk('el detalle del pago lee la descripción del gasto', /from\('gastos'\)\.select\('fecha_pago, medio_pago, importe, moneda, descripcion'\)/.test(FUENTE))
    chk('las etiquetas leen medio_pago y descripcion', /from\('gastos'\)\.select\('id, medio_pago, descripcion'\)/.test(FUENTE))
  }

  // ══ 4. XSS ═════════════════════════════════════════════════════════════════
  {
    const S = sandbox()
    S.__setDatos('v_cuenta_corriente_movimientos', [
      { proveedor_id: 'p1', unidad_negocio_id: 'u-n', moneda: 'ARS', fecha: '2026-09-29', tipo: 'pago', monto: -5, gasto_id: 'gx', referencia: marca('referencia'), saldo_acumulado: 0, orden_desempate: 1 },
    ])
    S.__setDatos('gastos', [{ id: 'gx', medio_pago: 'cheque', descripcion: marca('descripcion') }])
    S.estado.maestros.proveedores = [{ id: 'p1', razon_social: marca('proveedor') }]
    abrirFicha(S)
    await S.cargarFichaMovimientos()
    chequearMarcas(chk, 'la ficha con una referencia maliciosa', html(S, 'lista-movimientos-ficha'), ['referencia'])
    chk('una descripción maliciosa no se muestra nunca (no es un cheque endosado)', !/data-xss="descripcion"/.test(html(S, 'lista-movimientos-ficha')) && !/descripcion/.test(html(S, 'lista-movimientos-ficha')))
    await S.cargarHistorial()
    chequearMarcas(chk, 'el historial con referencia y proveedor maliciosos', html(S, 'lista-historial'), ['referencia', 'proveedor'])
  }
}

main().then(() => fin()).catch(e => { chk('las pruebas corren sin excepción', false, e.stack); fin() })
