// CUENTAS CORRIENTES: LA NOTA DE DÉBITO DE UN PROVEEDOR (24/10/2026, pedido
// de Facu; rama ci-prueba/cheque-rechazado).
//
//  - "+ Nota de débito" en la ficha del proveedor (con
//    cuentas_corrientes:registrar_pago; apagado en "todas las unidades"):
//    comprobante, fecha, renglones concepto + importe, observaciones y PDF
//    opcional (al bucket comprobantes, en la carpeta del usuario) → UNA
//    llamada a registrar_nota_debito_proveedor con los parámetros exactos.
//  - En la cuenta del proveedor queda como comprobante pendiente ("Nota de
//    débito <n°>", lo arma la base): la fila dice "Nota de débito", NO se
//    elimina como una factura y, entera y con permiso, lleva "Anular" →
//    anular_nota_debito con motivo (el error de la base, tal cual).
// Firmas verificadas con pg_get_functiondef el 24/10/2026.
//
//   node pruebas/test-cuentas-corrientes-nota-debito.js
'use strict'

const path = require('path')
const { construirCon } = require('./sandbox')
const { arnes, leer, marca, chequearMarcas } = require('./circuito-comun')
const { fuenteNumeros } = require('./numeros-comun')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/cuentas-corrientes.html')
const FUENTE = leer(ARCHIVO)
const { chk, esperas, fin } = arnes()
const N = (s) => String(s ?? '').replace(/ /g, ' ')

const PRELUDIO = `
  ${fuenteNumeros()}
  var console = { log(){}, warn(){}, error(){} }
  var CSS = { escape: (s) => String(s) }
  function nuevoEl(id) {
    const el = { id, innerHTML: '', textContent: '', value: '', hidden: false, disabled: false, dataset: {}, style: {}, max: '', files: null,
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
  var __datos = {}, __consultas = []
  function __consulta(tabla) {
    const filtros = [], registro = { tabla, eq: [], in: [] }
    let uno = false
    __consultas.push(registro)
    const q = {
      select: (c) => { registro.select = c; return q }, order: () => q, limit: () => q, gte: () => q, lte: () => q,
      maybeSingle() { uno = true; return q },
      eq(c, v) { registro.eq.push([c, v]); filtros.push(r => r[c] === v); return q },
      in(c, vs) { registro.in.push([c, vs]); filtros.push(r => vs.includes(r[c])); return q },
      then(res, rej) {
        const filas = (__datos[tabla] ?? []).filter(r => filtros.every(f => f(r)))
        return Promise.resolve({ data: uno ? (filas[0] ?? null) : filas, error: null }).then(res, rej)
      },
    }
    return q
  }
  var __rpcs = [], __rpcRes = { data: { nota_debito_id: 'nd-1', total: 2500 }, error: null }, __rpcEsperar = false, __resolver = []
  var __subidas = [], __errorSubida = null
  var supabase = {
    from: (t) => __consulta(t),
    rpc(nombre, params) {
      __rpcs.push({ nombre, params: JSON.parse(JSON.stringify(params)) })
      if (__rpcEsperar) return new Promise(r => { __resolver.push(() => r(__rpcRes)) })
      return Promise.resolve(__rpcRes)
    },
    storage: { from: (b) => ({ upload: async (ruta, archivo, op) => { __subidas.push({ b, ruta, op }); return { data: null, error: __errorSubida } } }) },
  }
  var __errores = [], __exitos = []
  function mostrarError(m) { __errores.push(m) } function mostrarExito(m) { __exitos.push(m) }
  function formatearFecha(f) { if (!f) return '—'; const [a, m, d] = String(f).split('-'); return d + '/' + m + '/' + a }
  function eliminarFactura() { return false }
  function abrirModalPago() {} function abrirModalAplicarCreditoDesdeFicha() {} function abrirModalSaldoInicial() {} function abrirModalNotaCredito() {}
  function abrirModalDetallePago() {}
  var __refrescos = []
  async function cargarFichaSaldos() { __refrescos.push('saldos') }
  async function cargarFichaCreditos() { __refrescos.push('creditos') }
  function cargarSaldos() { __refrescos.push('lista') }
  var estado = {
    sesion: { user: { id: 'uid-1' } },
    miRolApp: 'usuario', miEmpleadoId: 'yo',
    misTareas: new Set(['cuentas_corrientes:ver_todo', 'cuentas_corrientes:registrar_pago', 'cuentas_corrientes:anular_factura']),
    unidadElegida: null,
    maestros: { unidades: [{ id: 'u-n', nombre: 'Cucuruchos Nuss' }], proveedores: [{ id: 'p1', razon_social: 'DIMAFLO S.A.' }] },
    fabrica: FABRICA_SIN_DATOS,
    ficha: null, sinImporte: [], fichaSaldos: [], fichaCreditos: [],
  }
  var notaDebitoProv = null
  var claveRenglonNd = 0
  var anularNd = null
`

const FUNCIONES = [
  'pasaFiltroUnidad', 'veUnidad', 'etiquetaUnidad', 'esc', 'importeHtml', 'formatearImporte', 'badgeEstadoFactura', 'tieneTarea', 'nombreUnidad',
  'contarSinImporte', 'contarSinImporteVisible', 'htmlSinImporte', 'esSinImporte', 'htmlFilaSinImporte', 'decimalesImporteSin', 'enlazarCampoImporteSin',
  'cargarCantidadesSinImporte', 'productoUnicoConCantidad', 'textoCantidadInsumo', 'totalImporteFormulario', 'resumenCantidades',
  'saldosFichaVisibles', 'creditosFichaDeUnidad', 'renderizarFichaBanner', 'cargarFichaMovimientos', 'renderizarFichaMovimientos',
  'etiquetaPagoDeGasto', 'cargarEtiquetasDePagos', 'referenciaMovimiento',
  'esSaldoInicial', 'nombreFactura', 'numeroParaMostrar', 'etiquetaTipoMovimiento', 'cargarObservacionesSaldoInicial', 'puedeCargarSaldoInicial',
  'htmlFilaComision', 'cargarCodigosComision', 'fechaISO',
  // la nota de débito (24/10/2026)
  'puedeCargarNotaDebito', 'renglonNd', 'centavosNd', 'itemsNd', 'totalNd', 'htmlRenglonesNd', 'validarNotaDebito', 'parametrosNotaDebito',
  'rutaPdfNd', 'subirPdfNd', 'abrirModalNotaDebito', 'cerrarModalNotaDebito', 'pintarRenglonesNd', 'pintarPieNd', 'escribirNotaDebito',
  'accionNotaDebito', 'agregarRenglonNd', 'confirmarNotaDebito', 'cargarNotasDebitoFicha', 'abrirAnularNd', 'cerrarAnularNd', 'pintarAnularNd',
  'confirmarAnularNd',
]
const CONSTANTES = ['ESTADO_FACTURA_LABEL', 'TIPO_MOVIMIENTO_LABEL', 'MEDIOS_PAGO_LABEL', 'TANDA_GASTOS_PAGO', 'NUMERO_SALDO_INICIAL', 'TOPE_PDF_ND', 'DECIMALES_ND']

function sandbox(tareas) {
  const S = construirCon(ARCHIVO, {
    preludio: PRELUDIO, funciones: FUNCIONES, constantes: CONSTANTES,
    retorno: `estado, __els, __errores, __exitos, __consultas, __rpcs, __refrescos, __subidas,
      __nd(){ return notaDebitoProv }, __an(){ return anularNd }, __setDatos(t, d){ __datos[t] = d },
      __rpcResponde(r){ __rpcRes = r }, __rpcEspera(v){ __rpcEsperar = v }, __soltar(){ const r = __resolver.splice(0); r.forEach(f => f()) },
      __setErrorSubida(e){ __errorSubida = e }`,
  })
  if (tareas) S.estado.misTareas = new Set(tareas)
  return S
}
function abrirFicha(S, unidadId = 'u-n') {
  S.estado.ficha = { proveedorId: 'p1', unidadId, nombre: 'DIMAFLO S.A.', unidades: [], movimientosRaw: [], estadoPorFactura: {},
    filtros: { rangoRapido: null, fechaDesde: '', fechaHasta: '', tipo: 'todos', orden: 'fecha_desc' } }
}
const vacia = () => new Promise(r => setImmediate(r))
const HOY = (() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') })()

// ── El botón ──────────────────────────────────────────────────────────────
{
  const S = sandbox()
  abrirFicha(S)
  S.renderizarFichaBanner()
  const h = S.__els.get('ficha-banner').innerHTML
  chk('botón: "+ Nota de débito" en la ficha con registrar_pago', /id="btn-nota-debito-ficha"\s*>\+ Nota de débito</.test(h), h.slice(0, 400))
  abrirFicha(S, null)
  S.renderizarFichaBanner()
  chk('botón: en "todas las unidades" se ve apagado (es de una fábrica)', /id="btn-nota-debito-ficha" disabled>\+ Nota de débito</.test(S.__els.get('ficha-banner').innerHTML))
  const S2 = sandbox(['cuentas_corrientes:ver_todo'])
  abrirFicha(S2)
  S2.renderizarFichaBanner()
  chk('botón: sin registrar_pago no se ofrece', !/btn-nota-debito-ficha/.test(S2.__els.get('ficha-banner').innerHTML))
  chk('markup: el modal con comprobante, fecha, renglones, observaciones y PDF',
    ['campo-nd-comprobante', 'campo-nd-fecha', 'nota-debito-renglones', 'campo-nd-obs', 'campo-nd-pdf', 'btn-confirmar-nota-debito'].every(id => FUENTE.includes(`id="${id}"`)) &&
    /id="campo-nd-pdf" accept="application\/pdf"/.test(FUENTE))
}

// ── Validar y lo que viaja ────────────────────────────────────────────────
{
  const S = sandbox()
  abrirFicha(S)
  S.abrirModalNotaDebito()
  const n = S.__nd()
  chk('abrir: el modal se muestra, con un renglón vacío y la fecha de hoy', S.__els.get('modal-nota-debito').hidden === false && n.renglones.length === 1 && n.fecha === HOY)
  chk('abrir: dice el proveedor y la fábrica', S.__els.get('nota-debito-proveedor').textContent === 'DIMAFLO S.A. · Cucuruchos Nuss')
  chk('abrir: la fecha no puede ser futura', S.__els.get('campo-nd-fecha').max === HOY)
  const H = '2026-10-24'
  n.fecha = '2026-10-20'
  chk('validar: sin comprobante', S.validarNotaDebito(n, H) === 'Poné el número de comprobante.')
  n.comprobante = '0001-00004567'
  chk('validar: sin importe', S.validarNotaDebito(n, H) === 'Escribí al menos un renglón con su importe.')
  n.renglones[0].importe = 2500
  chk('validar: un renglón con importe lleva concepto', S.validarNotaDebito(n, H) === 'Cada renglón lleva su concepto.')
  n.renglones[0].concepto = 'Gastos de cheque rechazado'
  n.renglones.push({ clave: 99, concepto: 'nada', importe: null }, { clave: 98, concepto: ' Comisión ', importe: 120.555 })
  chk('validar: completo', S.validarNotaDebito(n, H) === null)
  chk('validar: la fecha no futura', S.validarNotaDebito({ ...n, fecha: '2026-10-25' }, H) === 'La fecha no puede ser futura.')
  chk('validar: sin fábrica', S.validarNotaDebito({ ...n, unidadId: null }, H) === 'Elegí la fábrica de la nota de débito.')
  chk('validar: el archivo tiene que ser PDF', S.validarNotaDebito({ ...n, archivo: { name: 'a.png', type: 'image/png', size: 1 } }, H) === 'El archivo tiene que ser un PDF.')
  chk('validar: el PDF hasta 10 MB', S.validarNotaDebito({ ...n, archivo: { name: 'a.pdf', type: 'application/pdf', size: 11 * 1024 * 1024 } }, H) === 'El PDF pesa más de 10 MB.')
  n.observaciones = '  '
  chk('viaja: los parámetros exactos de registrar_nota_debito_proveedor',
    JSON.stringify(S.parametrosNotaDebito(n, null)) === JSON.stringify({ p_proveedor_id: 'p1', p_unidad_negocio_id: 'u-n', p_fecha: '2026-10-20', p_comprobante: '0001-00004567',
      p_items: [{ concepto: 'Gastos de cheque rechazado', importe: 2500 }, { concepto: 'Comisión', importe: 120.56 }], p_observaciones: null, p_archivo_url: null }),
    JSON.stringify(S.parametrosNotaDebito(n, null)))
  chk('el total', S.totalNd(n.renglones) === 2620.56)
  S.pintarPieNd()
  chk('el pie dice el total', N(S.__els.get('nota-debito-total').textContent) === 'Total de la nota: $ 2.620,56')
  chk('ruta del PDF: en la carpeta del usuario', S.rutaPdfNd('uid-1', 'p1', '2026-10-20', 5) === 'uid-1/notas-debito/p1/2026/5.pdf')
  chequearMarcas(chk, 'los renglones', S.htmlRenglonesNd([{ clave: marca('clave'), concepto: marca('concepto') }]), ['clave', 'concepto'])
  // Sin fábrica no abre.
  const S2 = sandbox()
  abrirFicha(S2, null)
  S2.abrirModalNotaDebito()
  chk('abrir: en "todas las unidades" no abre y pide la fábrica', S2.__nd() === null && S2.__errores.includes('Elegí la fábrica para cargar una nota de débito.'))
}

// ── Confirmar ─────────────────────────────────────────────────────────────
esperas.push((async () => {
  const S = sandbox()
  abrirFicha(S)
  S.abrirModalNotaDebito()
  const n = S.__nd()
  S.__els.get('campo-nd-comprobante').value = ' 0001-4567 '
  S.__els.get('campo-nd-fecha').value = '2026-10-20'
  S.__els.get('campo-nd-obs').value = 'Por el cheque 43300024'
  n.renglones[0].concepto = 'Gastos'
  n.renglones[0].importe = 2500
  n.archivo = { name: 'nota.pdf', type: 'application/pdf', size: 1000 }
  S.__rpcEspera(true)
  const una = S.confirmarNotaDebito()
  const otra = S.confirmarNotaDebito()
  await vacia(); await vacia()
  chk('confirmar: el botón se traba mientras manda', S.__els.get('btn-confirmar-nota-debito').disabled === true && S.__els.get('btn-confirmar-nota-debito').textContent === 'Cargando…')
  S.__soltar()
  await Promise.all([una, otra])
  await vacia()
  const llam = S.__rpcs.filter(r => r.nombre === 'registrar_nota_debito_proveedor')
  chk('confirmar: un doble toque manda UNA vez', llam.length === 1, llam.length)
  const sub = S.__subidas[0]
  chk('confirmar: primero sube el PDF a comprobantes, en la carpeta del usuario', sub?.b === 'comprobantes' && /^uid-1\/notas-debito\/p1\/2026\/\d+\.pdf$/.test(sub.ruta) && sub.op?.upsert === false)
  chk('confirmar: viaja la ruta del PDF y lo escrito', llam[0]?.params.p_archivo_url === sub?.ruta && llam[0]?.params.p_comprobante === '0001-4567' && llam[0]?.params.p_observaciones === 'Por el cheque 43300024')
  chk('confirmar: el aviso dice que quedó como comprobante pendiente', N(S.__exitos.at(-1)) === 'Nota de débito cargada por $ 2.500,00: quedó como comprobante pendiente en su cuenta.')
  chk('confirmar: el modal se cierra y se relee la ficha', S.__nd() === null && S.__els.get('modal-nota-debito').hidden === true && S.__refrescos.includes('saldos') && S.__refrescos.includes('lista'))
  // El error de la base, tal cual.
  const S2 = sandbox()
  abrirFicha(S2)
  S2.abrirModalNotaDebito()
  S2.__els.get('campo-nd-comprobante').value = '1'
  S2.__els.get('campo-nd-fecha').value = '2026-10-20'
  S2.__nd().renglones[0].concepto = 'x'
  S2.__nd().renglones[0].importe = 1
  S2.__rpcResponde({ data: null, error: { message: 'No tenés permiso para cargar notas de débito de proveedores.' } })
  await S2.confirmarNotaDebito()
  chk('error: el mensaje de la base tal cual, y el modal sigue abierto', S2.__els.get('nota-debito-error').textContent === 'No tenés permiso para cargar notas de débito de proveedores.' && S2.__nd() !== null)
  // Lo que falta no llama.
  const S3 = sandbox()
  abrirFicha(S3)
  S3.abrirModalNotaDebito()
  await S3.confirmarNotaDebito()
  chk('falta el comprobante: lo dice y no llama a la base', S3.__rpcs.length === 0 && S3.__els.get('nota-debito-error').textContent === 'Poné el número de comprobante.')
})())

// ── En la cuenta del proveedor: comprobante pendiente, con "Anular" ───────
esperas.push((async () => {
  const S = sandbox()
  abrirFicha(S)
  S.__setDatos('v_cuenta_corriente_movimientos', [
    { proveedor_id: 'p1', unidad_negocio_id: 'u-n', moneda: 'ARS', fecha: '2026-10-20', tipo: 'factura', monto: 82500, factura_pendiente_id: 'fp-nd', referencia: 'Nota de débito 0001-4567', saldo_acumulado: 82500, orden_desempate: 2 },
    { proveedor_id: 'p1', unidad_negocio_id: 'u-n', moneda: 'ARS', fecha: '2026-10-19', tipo: 'factura', monto: 1000, factura_pendiente_id: 'fp-1', referencia: '0001-0001', saldo_acumulado: 1000, orden_desempate: 1 },
    { proveedor_id: 'p1', unidad_negocio_id: 'u-n', moneda: 'ARS', fecha: '2026-10-21', tipo: 'factura', monto: 500, factura_pendiente_id: 'fp-nd2', referencia: 'Nota de débito 0002', saldo_acumulado: 83000, orden_desempate: 3 },
  ])
  S.__setDatos('facturas_pendientes', [
    { id: 'fp-nd', estado: 'pendiente', saldo_pendiente: 82500, modulo_origen: 'nota_debito', observaciones: null },
    { id: 'fp-1', estado: 'pendiente', saldo_pendiente: 1000, modulo_origen: 'gastos', observaciones: null },
    { id: 'fp-nd2', estado: 'parcial', saldo_pendiente: 100, modulo_origen: 'nota_debito', observaciones: null },
  ])
  S.__setDatos('notas_debito', [{ id: 'nd-9', factura_pendiente_id: 'fp-nd', comprobante: '0001-4567', estado: 'vigente' }, { id: 'nd-10', factura_pendiente_id: 'fp-nd2', comprobante: '0002', estado: 'vigente' }])
  await S.cargarFichaMovimientos()
  const q = S.__consultas.find(c => c.tabla === 'notas_debito')
  chk('cuenta: lee las notas de débito de las facturas que son notas', q && JSON.stringify(q.in) === JSON.stringify([['factura_pendiente_id', ['fp-nd', 'fp-nd2']]]), JSON.stringify(q?.in))
  const h = S.__els.get('lista-movimientos-ficha').innerHTML
  const filas = h.split('tarjeta-lista fila-movimiento').slice(1)
  const nd = filas.find(f => f.includes('Nota de débito 0001-4567'))
  const fac = filas.find(f => f.includes('0001-0001'))
  const parcial = filas.find(f => f.includes('Nota de débito 0002'))
  chk('cuenta: la nota dice "Nota de débito" como tipo', /fila-movimiento__tipo">Nota de débito</.test(nd ?? ''))
  chk('cuenta: la nota entera lleva "Anular" con el id de la nota', /data-anular-nd="nd-9">Anular</.test(nd ?? ''), nd)
  chk('cuenta: la nota NO se elimina como una factura', !/btn-icono-eliminar/.test(nd ?? ''))
  chk('cuenta: una factura común sigue con su ✕', /btn-icono-eliminar/.test(fac ?? '') && !/data-anular-nd/.test(fac ?? ''))
  chk('cuenta: una nota con pagos aplicados no ofrece Anular', !/data-anular-nd/.test(parcial ?? ''))
  // Sin registrar_pago no se ofrece.
  const S2 = sandbox(['cuentas_corrientes:ver_todo'])
  abrirFicha(S2)
  S2.estado.ficha.movimientosRaw = [{ proveedor_id: 'p1', unidad_negocio_id: 'u-n', moneda: 'ARS', fecha: '2026-10-20', tipo: 'factura', monto: 1, factura_pendiente_id: 'fp-nd', referencia: 'Nota de débito 1', saldo_acumulado: 1 }]
  S2.estado.ficha.estadoPorFactura = { 'fp-nd': 'pendiente' }
  S2.estado.ficha.infoFactura = { 'fp-nd': { id: 'fp-nd', estado: 'pendiente', modulo_origen: 'nota_debito' } }
  S2.estado.ficha.notasDebito = new Map([['fp-nd', { id: marca('nd-id'), estado: 'vigente' }]])
  S2.renderizarFichaMovimientos()
  chk('cuenta: sin registrar_pago no se ofrece Anular', !/data-anular-nd/.test(S2.__els.get('lista-movimientos-ficha').innerHTML))
  S2.estado.misTareas.add('cuentas_corrientes:registrar_pago')
  S2.renderizarFichaMovimientos()
  chequearMarcas(chk, 'el botón Anular', S2.__els.get('lista-movimientos-ficha').innerHTML, ['nd-id'])

  // Anular: sin motivo no llama; con motivo, anular_nota_debito.
  S.abrirAnularNd('nd-9')
  chk('anular: el modal dice qué nota es', S.__els.get('modal-anular-nd').hidden === false && /Nota de débito 0001-4567/.test(S.__els.get('anular-nd-texto').textContent))
  S.__els.get('campo-anular-nd-motivo').value = 'x'
  await S.confirmarAnularNd()
  chk('anular: sin motivo lo dice y no llama', !S.__rpcs.some(r => r.nombre === 'anular_nota_debito') && S.__els.get('anular-nd-error').textContent === 'Poné el motivo de la anulación.')
  S.__els.get('campo-anular-nd-motivo').value = ' La cargué dos veces '
  S.__rpcResponde({ data: null, error: null })
  await S.confirmarAnularNd()
  const an = S.__rpcs.filter(r => r.nombre === 'anular_nota_debito')
  chk('anular: UNA llamada con el id de la nota y el motivo', an.length === 1 && JSON.stringify(an[0].params) === '{"p_id":"nd-9","p_motivo":"La cargué dos veces"}', JSON.stringify(an))
  chk('anular: el aviso y se cierra', S.__exitos.includes('Nota de débito anulada: salió de la cuenta del proveedor.') && S.__an() === null)
  // El error de la base, tal cual (la que ya tiene pagos).
  S.abrirAnularNd('nd-9')
  S.__els.get('campo-anular-nd-motivo').value = 'motivo bueno'
  S.__rpcResponde({ data: null, error: { message: 'Esa nota de débito ya tiene pagos aplicados: primero anulá los pagos.' } })
  await S.confirmarAnularNd()
  chk('anular: el error de la base tal cual', S.__els.get('anular-nd-error').textContent === 'Esa nota de débito ya tiene pagos aplicados: primero anulá los pagos.' && S.__an() !== null)
})())

fin()
