// EL SALDO INICIAL DE UN PROVEEDOR (30/09/2026).
//
// Pedido de Facu: cargar lo que se le debía a cada proveedor al arrancar el
// sistema, por fábrica. La base ya lo tiene:
// registrar_saldo_inicial_proveedor(p_proveedor_id, p_unidad_negocio_id,
// p_importe, p_fecha, p_moneda, p_observacion) → uuid (leída con
// pg_get_functiondef el 30/09/2026): pide tiene_tarea('cuentas_corrientes',
// 'registrar_pago'), un importe mayor a cero y la fábrica; rechaza el segundo
// saldo inicial del mismo proveedor en la misma fábrica y moneda; lo guarda
// como una factura pendiente con número 'SALDO-INICIAL'.
//
// Esta suite fija:
//  - EL BOTÓN: "Cargar saldo inicial" en la ficha (también con "Todas las
//    unidades": el modal pide la fábrica) y "Saldo inicial" en cada proveedor
//    del padrón; solo con cuentas_corrientes:registrar_pago (bypass de
//    super_admin).
//  - LA FÁBRICA: viene la de la ficha o la de la barra; con "Todas" se elige
//    en el modal; la fábrica de pruebas no se ofrece a una cuenta real.
//  - LO QUE VIAJA: los seis parámetros con sus valores; un importe vacío, en
//    cero o sin fábrica NO llama a la base.
//  - EL ERROR DE LA BASE, tal cual y pegado al botón; un doble toque manda
//    una sola vez.
//  - EL RENGLÓN: "Saldo inicial" (con su observación) en la ficha, el
//    historial, su Excel, el detalle de un pago y las listas para pagar o
//    aplicar un crédito; nunca "Factura SALDO-INICIAL".
//  - EL ESCAPE de la observación, del nombre de la fábrica y del error.
// Se EJECUTAN las funciones reales del módulo con un document y una base
// falsos.
//
//   node pruebas/test-cuentas-corrientes-saldo-inicial.js
'use strict'

const path = require('path')
const { construirCon } = require('./sandbox')
// Cliente y proveedor (06/10/2026): el padrón lo llama.
const { FUNCIONES_CP_CC, CONSTANTES_CP_CC } = require('./cuenta-unica-comun')
const { arnes, leer, marca, chequearMarcas } = require('./circuito-comun')
const { fuenteNumeros } = require('./numeros-comun')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/cuentas-corrientes.html')
const FUENTE = leer(ARCHIVO)
const { chk, fin } = arnes()

const PRELUDIO = `
  ${fuenteNumeros()}
  var console = { log(){}, warn(){}, error(){} }
  function nuevoEl(id) {
    const el = { id, innerHTML: '', textContent: '', value: '', hidden: id === 'modal-saldo-inicial', disabled: false, dataset: {}, style: {},
      classList: { add(){}, remove(){}, toggle(){} },
      querySelectorAll: () => [], querySelector: () => null, addEventListener(){}, setAttribute(){}, focus(){}, removeAttribute(k){ if (k === 'hidden') el.hidden = false } }
    return el
  }
  var __els = new Map()
  var document = {
    getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) },
    querySelectorAll: () => [], querySelector: (s) => document.getElementById('qs:' + s), body: nuevoEl('body'),
  }
  var location = { href: 'https://x.test/modulos/cuentas-corrientes.html', pathname: '/modulos/cuentas-corrientes.html', search: '' }
  var history = { pushState() {}, replaceState() {} }
  // La base falsa: filtra por eq/in como PostgREST y anota cada consulta.
  var __datos = {}, __consultas = [], __falla = {}
  function __consulta(tabla) {
    const filtros = [], registro = { tabla, in: [] }
    let uno = false
    __consultas.push(registro)
    const q = {
      select: (c) => { registro.select = c; return q }, order: () => q, limit: () => q, gte: () => q, lte: () => q,
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
  // La RPC: anota cada llamada; responde lo que se le diga, o espera.
  var __rpcs = [], __rpcRes = { data: 'si-1', error: null }, __rpcEsperar = false, __resolver = []
  var supabase = {
    from: (t) => __consulta(t),
    rpc(nombre, params) {
      __rpcs.push({ nombre, params })
      if (__rpcEsperar) return new Promise(r => { __resolver.push(() => r(__rpcRes)) })
      return typeof __rpcRes === 'function' ? __rpcRes() : Promise.resolve(__rpcRes)
    },
  }
  var __errores = [], __exitos = []
  function mostrarError(m) { __errores.push(m) } function mostrarExito(m) { __exitos.push(m) }
  function formatearFecha(f) { if (!f) return '—'; const [a, m, d] = String(f).split('-'); return d + '/' + m + '/' + a }
  function eliminarFactura() { return false }
  function abrirModalPago() {} function abrirModalAplicarCreditoDesdeFicha() {}
  // Lo que refresca la pantalla después de cargar: se anota.
  var __refrescos = []
  async function cargarSaldos() { __refrescos.push('saldos') }
  async function cargarPadronSaldos() { __refrescos.push('padron') }
  async function cargarFichaSaldos() { __refrescos.push('ficha-saldos') }
  async function cargarFichaCreditos() { __refrescos.push('ficha-creditos') }
  async function unidadesDelProveedor() { __refrescos.push('ficha-unidades'); return ['u-n'] }
  function unidadesDeFicha(ids) { return ids.map(id => ({ id, nombre: id })) }
  function renderizarFichaUnidad() { __refrescos.push('ficha-unidad') }
  var __hojas = []
  var XLSX = { utils: { json_to_sheet(f) { __hojas.push(f); return {} }, book_new() { return {} }, book_append_sheet() {} }, writeFile() {} }
  var saldoInicial = null
  var estado = {
    miRolApp: 'usuario', miEmpleadoId: 'yo',
    misTareas: new Set(['cuentas_corrientes:ver_todo', 'cuentas_corrientes:registrar_pago', 'cuentas_corrientes:aplicar_credito']),
    unidadElegida: null,
    maestros: {
      unidades: [{ id: 'u-n', nombre: 'Cucuruchos Nuss' }, { id: 'u-d', nombre: 'Dolce Pasta' }, { id: 'u-x', nombre: 'Pruebas (robot)' }],
      proveedores: [{ id: 'p1', razon_social: 'DIMAFLO S.A.', cuit: '30111111118', direccion: null }],
    },
    fabrica: { ok: true, unidades: new Set(['u-x']), personas: new Set(), soyDePrueba: false },
    filtros: { proveedores: { busqueda: '' }, historial: { busqueda: '', fechaDesde: '', fechaHasta: '', rangoRapido: null }, padron: { busqueda: '' } },
    padronSaldos: new Map(), padronSaldosCrudos: [],
    historialCrudo: [], listaHistorial: [], estadoPorFacturaHistorial: {}, etiquetasPagoHistorial: new Map(), obsSaldoInicialHistorial: new Map(),
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
  'etiquetaPagoDeGasto', 'cargarEtiquetasDePagos', 'referenciaMovimiento',
  'filtrarPadron', 'renderizarPadron', 'inicialesEmpresa', 'colorAvatar', 'unidadesParaElegir', 'montoDeCampo', 'fechaISO',
  // lo nuevo
  'esSaldoInicial', 'nombreFactura', 'numeroParaMostrar', 'etiquetaTipoMovimiento', 'cargarObservacionesSaldoInicial',
  'puedeCargarSaldoInicial', 'unidadesSaldoInicial', 'htmlUnidadesSaldoInicial', 'parametrosSaldoInicial', 'renderizarSaldoInicial',
  'abrirModalSaldoInicial', 'cerrarModalSaldoInicial', 'elegirUnidadSaldoInicial', 'confirmarSaldoInicial', 'refrescarTrasSaldoInicial',
]
const CONSTANTES = ['ESTADO_FACTURA_LABEL', 'TIPO_MOVIMIENTO_LABEL', 'MEDIOS_PAGO_LABEL', 'TANDA_GASTOS_PAGO', 'PALETA_AVATAR',
  'NUMERO_SALDO_INICIAL', 'MONEDAS_SALDO_INICIAL']

function sandbox() {
  return construirCon(ARCHIVO, {
    preludio: PRELUDIO, funciones: [...FUNCIONES, ...FUNCIONES_CP_CC], constantes: [...CONSTANTES, ...CONSTANTES_CP_CC],
    retorno: `estado, __els, __errores, __exitos, __consultas, __hojas, __rpcs, __refrescos,
      __si(){ return saldoInicial }, __el(id){ return document.getElementById(id) }, __setDatos(t, d){ __datos[t] = d }, __fallar(t){ __falla[t] = true },
      __rpcResponde(r){ __rpcRes = r }, __rpcEspera(v){ __rpcEsperar = v }, __soltar(){ const r = __resolver.splice(0); r.forEach(f => f()) }`,
  })
}
const html = (S, id) => S.__el(id).innerHTML ?? ''
const vacia = () => new Promise(r => setTimeout(r, 0))

function abrirFicha(S, unidadId = 'u-n') {
  S.estado.ficha = { proveedorId: 'p1', unidadId, nombre: 'DIMAFLO S.A.', unidades: [], movimientosRaw: [], estadoPorFactura: {},
    filtros: { rangoRapido: null, fechaDesde: '', fechaHasta: '', tipo: 'todos', orden: 'fecha_desc' } }
}
// Escribe en los campos del modal lo que tipearía una persona.
function completar(S, { importe = '125.000,50', moneda = 'ARS', fecha = '2026-09-30', obs = '' } = {}) {
  S.__el('campo-saldo-inicial-importe').value = importe
  S.__el('campo-saldo-inicial-moneda').value = moneda
  S.__el('campo-saldo-inicial-fecha').value = fecha
  S.__el('campo-saldo-inicial-observacion').value = obs
}

// Los movimientos con un saldo inicial (el número que guarda la función).
const MOVS = [
  { proveedor_id: 'p1', unidad_negocio_id: 'u-n', moneda: 'ARS', fecha: '2026-10-02', tipo: 'interes', monto: 1000, factura_pendiente_id: 'f-si', referencia: 'SALDO-INICIAL', saldo_acumulado: 501000, orden_desempate: 3 },
  { proveedor_id: 'p1', unidad_negocio_id: 'u-n', moneda: 'ARS', fecha: '2026-10-01', tipo: 'factura', monto: 200000, factura_pendiente_id: 'f-1', referencia: '0001-00001234', saldo_acumulado: 500000, orden_desempate: 2 },
  { proveedor_id: 'p1', unidad_negocio_id: 'u-n', moneda: 'ARS', fecha: '2026-09-30', tipo: 'factura', monto: 300000, factura_pendiente_id: 'f-si', referencia: 'SALDO-INICIAL', saldo_acumulado: 300000, orden_desempate: 1 },
]
const FACTURAS = [
  { id: 'f-si', estado: 'pendiente', observaciones: 'Deuda del sistema viejo' },
  { id: 'f-1', estado: 'pendiente', observaciones: 'Una factura común' },
]
function preparar() {
  const S = sandbox()
  S.__setDatos('v_cuenta_corriente_movimientos', MOVS)
  S.__setDatos('facturas_pendientes', FACTURAS)
  S.__setDatos('gastos', [])
  return S
}

async function main() {
  // ══ 1. EL MARCADO ══════════════════════════════════════════════════════════
  chk('el modal existe y nace escondido', /<div class="modal-cc" id="modal-saldo-inicial" hidden>/.test(FUENTE))
  for (const id of ['saldo-inicial-unidades', 'campo-saldo-inicial-importe', 'campo-saldo-inicial-moneda', 'campo-saldo-inicial-fecha',
    'campo-saldo-inicial-observacion', 'saldo-inicial-error', 'btn-confirmar-saldo-inicial', 'btn-cancelar-saldo-inicial', 'btn-cerrar-saldo-inicial']) {
    chk(`el modal tiene #${id}`, FUENTE.includes(`id="${id}"`))
  }
  chk('el importe es un campo de texto con teclado decimal (nunca type=number)',
    /<input type="text" id="campo-saldo-inicial-importe" placeholder="0,00" inputmode="decimal">/.test(FUENTE))
  chk('el importe se enlaza con los demás montos (2 decimales)', /const IDS_CAMPOS_MONTO = \[[^\]]*'campo-saldo-inicial-importe'\]/.test(FUENTE))
  chk('el botón de confirmar NO nace deshabilitado en el HTML', /<button type="button" class="btn btn-cc-accion" id="btn-confirmar-saldo-inicial">Cargar saldo inicial<\/button>/.test(FUENTE))
  chk('el error va pegado al botón (justo antes de la fila de botones) y se lee como alerta',
    /<p class="saldo-inicial__error" id="saldo-inicial-error" role="alert" hidden><\/p>\s*<div style="display:flex; gap:0\.75rem; padding:1rem 0 0;">\s*<button type="button" class="btn btn--secundario" id="btn-cancelar-saldo-inicial">/.test(FUENTE))
  chk('el gate es la tarea que exige la función (registrar_pago)', /function puedeCargarSaldoInicial\(\) \{\s*return tieneTarea\('cuentas_corrientes', 'registrar_pago'\)\s*\}/.test(FUENTE))
  chk('los chips de la fábrica se tocan por delegación', /getElementById\('saldo-inicial-unidades'\)\.addEventListener\('click'[\s\S]{0,200}?elegirUnidadSaldoInicial\(b\.dataset\.siUnidad\)/.test(FUENTE))
  chk('confirmar está conectado', /getElementById\('btn-confirmar-saldo-inicial'\)\.addEventListener\('click', confirmarSaldoInicial\)/.test(FUENTE))
  chk('el botón del padrón no abre además la ficha (stopPropagation)',
    /querySelectorAll\('\.btn-saldo-inicial-padron'\)\.forEach\(btn => \{\s*btn\.addEventListener\('click', \(e\) => \{\s*e\.stopPropagation\(\)/.test(FUENTE))
  chk('el botón de la ficha abre el modal con la unidad de la ficha',
    /getElementById\('btn-saldo-inicial-ficha'\)\?\.addEventListener\('click', \(\) => \{\s*if \(estado\.ficha\) abrirModalSaldoInicial\(estado\.ficha\.proveedorId, estado\.ficha\.nombre, estado\.ficha\.unidadId\)/.test(FUENTE))
  chk('las monedas son las 12 del CHECK de facturas_pendientes',
    /const MONEDAS_SALDO_INICIAL = \['ARS', 'USD', 'EUR', 'BRL', 'PYG', 'UYU', 'CLP', 'BOB', 'GBP', 'MXN', 'COP', 'PEN'\]/.test(FUENTE))

  // ══ 2. EL BOTÓN, CON Y SIN PERMISO ════════════════════════════════════════
  {
    const S = sandbox()
    abrirFicha(S)
    S.renderizarFichaBanner()
    chk('con registrar_pago, la ficha tiene "Cargar saldo inicial"', /id="btn-saldo-inicial-ficha">Cargar saldo inicial</.test(html(S, 'ficha-banner')))
    S.estado.ficha.unidadId = null
    S.renderizarFichaBanner()
    const b = html(S, 'ficha-banner')
    chk('con "Todas las unidades" el botón está y NO se deshabilita (el modal pide la fábrica)',
      /<button[^>]*id="btn-saldo-inicial-ficha"[^>]*>/.test(b) && !/id="btn-saldo-inicial-ficha"[^>]*disabled/.test(b) && !/disabled[^>]*id="btn-saldo-inicial-ficha"/.test(b), b.slice(0, 900))
    S.renderizarPadron()
    chk('con registrar_pago, cada proveedor del padrón tiene "Saldo inicial"', /class="btn-saldo-inicial-padron" data-id="p1"[^>]*>Saldo inicial</.test(html(S, 'lista-padron')))

    const T = sandbox()
    T.estado.misTareas = new Set(['cuentas_corrientes:ver_todo', 'cuentas_corrientes:aplicar_credito'])
    abrirFicha(T)
    T.renderizarFichaBanner()
    chk('sin registrar_pago, la ficha NO tiene el botón', !/btn-saldo-inicial-ficha/.test(html(T, 'ficha-banner')))
    T.renderizarPadron()
    chk('sin registrar_pago, el padrón NO tiene el botón', !/btn-saldo-inicial-padron/.test(html(T, 'lista-padron')))
    T.abrirModalSaldoInicial('p1', 'DIMAFLO S.A.', 'u-n')
    chk('sin registrar_pago, el modal no se abre aunque se lo llame', T.__el('modal-saldo-inicial').hidden === true && T.__si() === null)

    const U = sandbox()
    U.estado.miRolApp = 'super_admin'
    U.estado.misTareas = new Set()
    abrirFicha(U)
    U.renderizarFichaBanner()
    chk('un super_admin lo ve (bypass, igual que la función)', /btn-saldo-inicial-ficha/.test(html(U, 'ficha-banner')))
  }

  // ══ 3. LA FÁBRICA ══════════════════════════════════════════════════════════
  {
    const S = sandbox()
    S.abrirModalSaldoInicial('p1', 'DIMAFLO S.A.', 'u-n')
    chk('abre el modal', S.__el('modal-saldo-inicial').hidden === false)
    chk('viene puesta la fábrica de la ficha', S.__si().unidadId === 'u-n')
    const chips = html(S, 'saldo-inicial-unidades')
    chk('la elegida va llena y marcada (aria-pressed)', /ficha-unidad-cc__chip ficha-unidad-cc__chip--elegido" data-si-unidad="u-n" aria-pressed="true">Cucuruchos Nuss</.test(chips), chips)
    chk('la otra se ofrece sin marcar', /data-si-unidad="u-d" aria-pressed="false">Dolce Pasta</.test(chips))
    chk('la fábrica de pruebas NO se ofrece a una cuenta real', !/u-x|Pruebas \(robot\)/.test(chips))
    chk('el nombre del proveedor va como texto', S.__el('saldo-inicial-proveedor').textContent === 'DIMAFLO S.A.')
    chk('la moneda arranca en pesos', S.__el('campo-saldo-inicial-moneda').value === 'ARS' &&
      /<option value="ARS" selected>ARS<\/option>/.test(html(S, 'campo-saldo-inicial-moneda')) && /<option value="USD">USD<\/option>/.test(html(S, 'campo-saldo-inicial-moneda')))
    chk('se ofrecen las 12 monedas del CHECK', (html(S, 'campo-saldo-inicial-moneda').match(/<option /g) ?? []).length === 12)
    chk('la fecha arranca en hoy', /^\d{4}-\d{2}-\d{2}$/.test(S.__el('campo-saldo-inicial-fecha').value))
    chk('el importe arranca vacío (nunca un cero)', S.__el('campo-saldo-inicial-importe').value === '')

    // "Todas las unidades": no viene ninguna; se pide y no se llama.
    const T = sandbox()
    T.abrirModalSaldoInicial('p1', 'DIMAFLO S.A.', null)
    chk('con "Todas" (sin unidad en la ficha ni en la barra) no viene ninguna fábrica', T.__si().unidadId === null && !/--elegido/.test(html(T, 'saldo-inicial-unidades')))
    completar(T)
    await T.confirmarSaldoInicial()
    chk('sin fábrica, NO se llama a la base', T.__rpcs.length === 0)
    chk('y se dice "Elegí la fábrica." pegado al botón', T.__el('saldo-inicial-error').textContent === 'Elegí la fábrica.' && T.__el('saldo-inicial-error').hidden === false)
    T.elegirUnidadSaldoInicial('u-d')
    chk('elegir una fábrica la marca y borra el error', /--elegido" data-si-unidad="u-d"/.test(html(T, 'saldo-inicial-unidades')) && T.__el('saldo-inicial-error').hidden === true)
    await T.confirmarSaldoInicial()
    chk('con la fábrica elegida en el modal, viaja esa', T.__rpcs.length === 1 && T.__rpcs[0].params.p_unidad_negocio_id === 'u-d', JSON.stringify(T.__rpcs))

    // Sin unidad en la ficha pero con la barra en una fábrica: esa.
    const U = sandbox()
    U.estado.unidadElegida = 'u-d'
    U.abrirModalSaldoInicial('p1', 'DIMAFLO S.A.', null)
    chk('sin unidad en la ficha, viene la de la barra', U.__si().unidadId === 'u-d')
    // Una unidad que ya no se ofrece no queda elegida.
    const V = sandbox()
    V.abrirModalSaldoInicial('p1', 'DIMAFLO S.A.', 'u-x')
    chk('la fábrica de pruebas no queda elegida aunque venga de la ficha', V.__si().unidadId === null)
    // Con una sola fábrica, esa.
    const W = sandbox()
    W.estado.maestros.unidades = [{ id: 'u-n', nombre: 'Cucuruchos Nuss' }]
    W.abrirModalSaldoInicial('p1', 'DIMAFLO S.A.', null)
    chk('con una sola fábrica, viene esa', W.__si().unidadId === 'u-n')
  }

  // ══ 4. LO QUE VIAJA ════════════════════════════════════════════════════════
  {
    const S = sandbox()
    S.abrirModalSaldoInicial('p1', 'DIMAFLO S.A.', 'u-n')
    completar(S, { importe: '125.000,50', moneda: 'USD', fecha: '2026-09-30', obs: '  Deuda vieja  ' })
    await S.confirmarSaldoInicial()
    chk('llama a registrar_saldo_inicial_proveedor una vez', S.__rpcs.length === 1 && S.__rpcs[0].nombre === 'registrar_saldo_inicial_proveedor')
    const p = S.__rpcs[0]?.params ?? {}
    chk('con los seis parámetros y sus valores', JSON.stringify(p) === JSON.stringify({
      p_proveedor_id: 'p1', p_unidad_negocio_id: 'u-n', p_importe: 125000.5, p_fecha: '2026-09-30', p_moneda: 'USD', p_observacion: 'Deuda vieja',
    }), JSON.stringify(p))
    chk('el importe viaja como número (leído en formato argentino)', typeof p.p_importe === 'number' && p.p_importe === 125000.5)
    chk('al salir bien, se cierra el modal', S.__el('modal-saldo-inicial').hidden === true && S.__si() === null)
    chk('y lo dice, con la fábrica', S.__exitos.some(m => /Saldo inicial cargado en la cuenta de Cucuruchos Nuss/.test(m)), JSON.stringify(S.__exitos))
    chk('y refresca la lista de saldos', S.__refrescos.includes('saldos'))

    const T = sandbox()
    T.abrirModalSaldoInicial('p1', 'DIMAFLO S.A.', 'u-n')
    completar(T, { obs: '   ' })
    await T.confirmarSaldoInicial()
    chk('una observación en blanco viaja null (la base pone la suya)', T.__rpcs[0]?.params.p_observacion === null)

    // Lo que no llama.
    for (const [qué, datos, mensaje] of [
      ['un importe vacío', { importe: '' }, 'Escribí el importe que se le debía.'],
      ['un importe en cero', { importe: '0' }, 'El importe tiene que ser mayor a cero.'],
      ['un importe que no se puede leer', { importe: '12,3,4' }, 'Escribí el importe que se le debía.'],
      ['sin fecha', { fecha: '' }, 'Elegí la fecha.'],
    ]) {
      const X = sandbox()
      X.abrirModalSaldoInicial('p1', 'DIMAFLO S.A.', 'u-n')
      completar(X, datos)
      await X.confirmarSaldoInicial()
      chk(`${qué}: NO se llama a la base`, X.__rpcs.length === 0, JSON.stringify(X.__rpcs))
      chk(`${qué}: se dice "${mensaje}" pegado al botón`, X.__el('saldo-inicial-error').textContent === mensaje && X.__el('saldo-inicial-error').hidden === false,
        X.__el('saldo-inicial-error').textContent)
      chk(`${qué}: el modal sigue abierto`, X.__el('modal-saldo-inicial').hidden === false)
    }
    // parametrosSaldoInicial por su cuenta.
    const P = sandbox()
    chk('parametrosSaldoInicial: sin moneda, pesos', P.parametrosSaldoInicial({ proveedorId: 'p', unidadId: 'u', importe: 5, moneda: '', fecha: '2026-09-30' }).params?.p_moneda === 'ARS')
    chk('parametrosSaldoInicial: un importe negativo no pasa', P.parametrosSaldoInicial({ proveedorId: 'p', unidadId: 'u', importe: -5, fecha: '2026-09-30' }).error === 'El importe tiene que ser mayor a cero.')
    chk('parametrosSaldoInicial: sin proveedor no pasa', !!P.parametrosSaldoInicial({ proveedorId: null, unidadId: 'u', importe: 5, fecha: '2026-09-30' }).error)
  }

  // ══ 5. EL ERROR DE LA BASE Y EL DOBLE TOQUE ════════════════════════════════
  {
    const S = sandbox()
    S.__rpcResponde({ data: null, error: { message: 'Ese proveedor ya tiene cargado un saldo inicial en esta fábrica.' } })
    S.abrirModalSaldoInicial('p1', 'DIMAFLO S.A.', 'u-n')
    completar(S, { obs: 'Nota de antes' })
    await S.confirmarSaldoInicial()
    const err = S.__el('saldo-inicial-error')
    chk('el error de la base se muestra TAL CUAL', err.textContent === 'Ese proveedor ya tiene cargado un saldo inicial en esta fábrica.' && err.hidden === false, err.textContent)
    chk('el modal sigue abierto para corregir', S.__el('modal-saldo-inicial').hidden === false)
    chk('el botón vuelve a poder tocarse', S.__el('btn-confirmar-saldo-inicial').disabled === false && S.__el('btn-confirmar-saldo-inicial').textContent === 'Cargar saldo inicial')
    chk('no se dice que salió bien ni se refresca nada', S.__exitos.length === 0 && S.__refrescos.length === 0)
    // Cerrar y volver a abrir (otro proveedor): nada de lo anterior queda.
    S.cerrarModalSaldoInicial()
    chk('cancelar cierra el modal', S.__el('modal-saldo-inicial').hidden === true && S.__si() === null)
    S.__el('campo-saldo-inicial-moneda').value = 'USD'
    S.abrirModalSaldoInicial('p2', 'OTRO SRL', 'u-d')
    chk('al volver a abrir, el importe está vacío', S.__el('campo-saldo-inicial-importe').value === '')
    chk('al volver a abrir, la observación está vacía y la moneda en pesos', S.__el('campo-saldo-inicial-observacion').value === '' && S.__el('campo-saldo-inicial-moneda').value === 'ARS')
    chk('al volver a abrir, el error de antes no se ve', S.__el('saldo-inicial-error').hidden === true && S.__el('saldo-inicial-error').textContent === '')
    chk('al volver a abrir, es el proveedor nuevo con su fábrica', S.__si().proveedorId === 'p2' && S.__si().unidadId === 'u-d' && S.__el('saldo-inicial-proveedor').textContent === 'OTRO SRL')

    const M = sandbox()
    M.__rpcResponde({ data: null, error: { message: marca('error_base') } })
    M.abrirModalSaldoInicial('p1', 'DIMAFLO S.A.', 'u-n')
    completar(M)
    await M.confirmarSaldoInicial()
    chk('un error con HTML va como TEXTO (textContent, nunca innerHTML)', M.__el('saldo-inicial-error').textContent.includes('data-xss="error_base"') &&
      !(M.__el('saldo-inicial-error').innerHTML || '').includes('data-xss'))

    const T = sandbox()
    T.__rpcEspera(true)
    T.abrirModalSaldoInicial('p1', 'DIMAFLO S.A.', 'u-n')
    completar(T)
    const primera = T.confirmarSaldoInicial()
    chk('mientras se manda, el botón se traba y dice "Cargando…"', T.__el('btn-confirmar-saldo-inicial').disabled === true && T.__el('btn-confirmar-saldo-inicial').textContent === 'Cargando…')
    const segunda = T.confirmarSaldoInicial()
    T.cerrarModalSaldoInicial()
    chk('un doble toque manda UNA sola vez', T.__rpcs.length === 1, String(T.__rpcs.length))
    chk('mientras se manda, el modal no se cierra', T.__el('modal-saldo-inicial').hidden === false)
    T.__soltar()
    await primera; await segunda
    await vacia()
    chk('cuando vuelve bien, se cierra', T.__el('modal-saldo-inicial').hidden === true)

    const C = sandbox()
    C.abrirModalSaldoInicial('p1', 'DIMAFLO S.A.', 'u-n')
    C.__rpcResponde(() => Promise.reject(new Error('Failed to fetch')))
    completar(C)
    await C.confirmarSaldoInicial().catch(() => {})
    chk('sin conexión, lo dice y no queda trabado', /No hay conexión/.test(C.__el('saldo-inicial-error').textContent) && C.__el('btn-confirmar-saldo-inicial').disabled === false,
      C.__el('saldo-inicial-error').textContent)
  }

  // ══ 6. EL REFRESCO ═════════════════════════════════════════════════════════
  {
    const S = preparar()
    abrirFicha(S)
    S.__el('vista-padron').hidden = true
    S.abrirModalSaldoInicial('p1', 'DIMAFLO S.A.', 'u-n')
    completar(S)
    await S.confirmarSaldoInicial()
    chk('con la ficha de ese proveedor abierta, se recargan sus saldos, créditos y unidades',
      ['ficha-saldos', 'ficha-creditos', 'ficha-unidades', 'ficha-unidad'].every(r => S.__refrescos.includes(r)), JSON.stringify(S.__refrescos))
    chk('y sus movimientos (con el saldo inicial nuevo)', S.__consultas.some(c => c.tabla === 'v_cuenta_corriente_movimientos'))
    chk('el padrón escondido no se recarga', !S.__refrescos.includes('padron'))
    const T = sandbox()
    T.__el('vista-padron').hidden = false
    T.abrirModalSaldoInicial('p1', 'DIMAFLO S.A.', 'u-n')
    completar(T)
    await T.confirmarSaldoInicial()
    chk('desde el padrón, se recargan sus saldos (el proveedor pasa a deber)', T.__refrescos.includes('padron'))
    chk('sin la ficha de ese proveedor, no se toca la ficha', !T.__refrescos.includes('ficha-saldos'))
    const U = sandbox()
    abrirFicha(U)
    U.__el('vista-padron').hidden = false
    U.abrirModalSaldoInicial('p9', 'OTRO SRL', 'u-n')
    completar(U)
    await U.confirmarSaldoInicial()
    chk('con la ficha de OTRO proveedor abierta, esa ficha no se recarga', !U.__refrescos.includes('ficha-saldos') && U.__refrescos.includes('padron'), JSON.stringify(U.__refrescos))
  }

  // ══ 7. EL RENGLÓN: "Saldo inicial" ═════════════════════════════════════════
  {
    const S = sandbox()
    chk('esSaldoInicial reconoce el número que guarda la función', S.esSaldoInicial({ referencia: 'SALDO-INICIAL' }) && !S.esSaldoInicial({ referencia: '0001-1' }) && !S.esSaldoInicial(null))
    chk('NUMERO_SALDO_INICIAL es el de la función', S.NUMERO_SALDO_INICIAL === 'SALDO-INICIAL' || /const NUMERO_SALDO_INICIAL = 'SALDO-INICIAL'/.test(FUENTE))
    chk('la factura del saldo inicial se llama "Saldo inicial"', S.etiquetaTipoMovimiento({ tipo: 'factura', referencia: 'SALDO-INICIAL' }) === 'Saldo inicial')
    chk('una factura común sigue siendo "Factura"', S.etiquetaTipoMovimiento({ tipo: 'factura', referencia: '0001-1' }) === 'Factura')
    chk('un interés sobre el saldo inicial sigue siendo "Interés"', S.etiquetaTipoMovimiento({ tipo: 'interes', referencia: 'SALDO-INICIAL' }) === 'Interés')
    const obs = new Map([['f-si', 'Deuda del sistema viejo']])
    chk('la referencia del saldo inicial es su observación', S.referenciaMovimiento({ tipo: 'factura', referencia: 'SALDO-INICIAL', factura_pendiente_id: 'f-si' }, null, obs) === 'Deuda del sistema viejo')
    chk('sin observación, "Saldo inicial" (nunca SALDO-INICIAL)', S.referenciaMovimiento({ tipo: 'factura', referencia: 'SALDO-INICIAL', factura_pendiente_id: 'f-si' }, null, new Map()) === 'Saldo inicial' &&
      S.referenciaMovimiento({ tipo: 'factura', referencia: 'SALDO-INICIAL', factura_pendiente_id: 'f-si' }) === 'Saldo inicial')
    chk('el interés del saldo inicial: referencia "Saldo inicial"', S.referenciaMovimiento({ tipo: 'interes', referencia: 'SALDO-INICIAL', factura_pendiente_id: 'f-si' }, null, obs) === 'Saldo inicial')
    chk('una factura común sigue con su número', S.referenciaMovimiento({ tipo: 'factura', referencia: '0001-1' }, null, obs) === '0001-1')
    chk('nombreFactura: "Saldo inicial" / "Factura 0001-1" / "Factura —"', S.nombreFactura('SALDO-INICIAL') === 'Saldo inicial' && S.nombreFactura('0001-1') === 'Factura 0001-1' && S.nombreFactura(null) === 'Factura —')
    chk('numeroParaMostrar: "Saldo inicial" / el número / "(sin número)"', S.numeroParaMostrar('SALDO-INICIAL') === 'Saldo inicial' && S.numeroParaMostrar('0001-1') === '0001-1' && S.numeroParaMostrar('') === '(sin número)')
  }
  {
    // Las observaciones: una consulta, solo con los ids de los saldos iniciales.
    const S = preparar()
    const m = await S.cargarObservacionesSaldoInicial(MOVS)
    chk('cargarObservacionesSaldoInicial: la del saldo inicial, y nada más', m.size === 1 && m.get('f-si') === 'Deuda del sistema viejo', JSON.stringify([...m]))
    const q = S.__consultas.filter(c => c.tabla === 'facturas_pendientes')
    chk('una sola consulta, con el id del saldo inicial (no el de la factura común)', q.length === 1 && q[0].in[0] === 1 && q[0].select === 'id, observaciones', JSON.stringify(q))
    const T = preparar()
    await T.cargarObservacionesSaldoInicial([{ tipo: 'factura', referencia: '0001-1', factura_pendiente_id: 'f-1' }])
    chk('sin saldos iniciales, no consulta', T.__consultas.length === 0)
    const U = preparar()
    U.__fallar('facturas_pendientes')
    const mu = await U.cargarObservacionesSaldoInicial(MOVS)
    chk('si la lectura falla, queda vacío (se ve "Saldo inicial")', mu.size === 0)
  }
  {
    // La ficha.
    const S = preparar()
    abrirFicha(S)
    await S.cargarFichaMovimientos()
    const h = html(S, 'lista-movimientos-ficha')
    chk('ficha: el renglón dice "Saldo inicial"', /fila-movimiento__tipo">Saldo inicial</.test(h), h.slice(0, 800))
    chk('ficha: con su observación como referencia', /fila-movimiento__referencia">Deuda del sistema viejo</.test(h))
    chk('ficha: nunca "SALDO-INICIAL" ni "Factura SALDO-INICIAL"', !/SALDO-INICIAL/.test(h))
    chk('ficha: el interés sobre el saldo inicial dice "Interés" · "Saldo inicial"', /fila-movimiento__tipo">Interés<\/div>\s*<div class="fila-movimiento__referencia">Saldo inicial</.test(h))
    chk('ficha: la factura común sigue siendo "Factura"', /fila-movimiento__tipo">Factura<\/div>\s*<div class="fila-movimiento__referencia">0001-00001234</.test(h))
    chk('ficha: el saldo inicial se puede ver/editar como factura (sigue siendo una factura pendiente)', /gastos\.html\?factura=f-si/.test(h))
  }
  {
    // El historial y su Excel.
    const S = preparar()
    await S.cargarHistorial()
    const h = html(S, 'lista-historial')
    chk('historial: el chip dice "Saldo inicial"', /chip-tipo-mov chip-tipo-mov--factura">Saldo inicial</.test(h), h.slice(0, 600))
    chk('historial: "DIMAFLO S.A. — Deuda del sistema viejo"', /DIMAFLO S\.A\. — Deuda del sistema viejo/.test(h))
    chk('historial: nunca "SALDO-INICIAL"', !/SALDO-INICIAL/.test(h))
    S.exportarExcelHistorial()
    const filas = S.__hojas[0] ?? []
    chk('Excel: Tipo "Saldo inicial" y Referencia su observación', filas.some(f => f.Tipo === 'Saldo inicial' && f.Referencia === 'Deuda del sistema viejo'), JSON.stringify(filas))
    chk('Excel: el interés del saldo inicial, Referencia "Saldo inicial"', filas.some(f => f.Tipo === 'Interés' && f.Referencia === 'Saldo inicial'))
    chk('Excel: ninguna celda dice "SALDO-INICIAL"', !JSON.stringify(filas).includes('SALDO-INICIAL'))
  }
  {
    // El detalle de un pago que se aplicó al saldo inicial, y la lista para pagar.
    const S = preparar()
    S.__setDatos('gastos', [{ id: 'g1', medio_pago: 'efectivo', descripcion: 'x', fecha_pago: '2026-10-03', importe: 1000, moneda: 'ARS' }])
    S.__setDatos('aplicaciones_pago', [{ gasto_id: 'g1', monto_aplicado: 1000, facturas_pendientes: { numero_comprobante: 'SALDO-INICIAL', razon_social: 'DIMAFLO S.A.', fecha_factura: '2026-09-30', categorias: null } }])
    S.__setDatos('creditos_proveedor', [{ origen_gasto_id: 'g1', monto_original: 50, monto_disponible: 0, moneda: 'ARS',
      aplicaciones_credito: [{ monto_aplicado: 50, facturas_pendientes: { numero_comprobante: 'SALDO-INICIAL' } }] }])
    await S.abrirModalDetallePago('g1')
    const d = html(S, 'detalle-pago-contenido')
    chk('detalle del pago: "Saldo inicial", nunca "Factura SALDO-INICIAL"', /fila-fifo__numero">Saldo inicial</.test(d) && !/SALDO-INICIAL/.test(d), d.slice(0, 600))
    chk('detalle del pago: el crédito "se aplicó a: Saldo inicial"', /se aplicó a: Saldo inicial/.test(d))
    chk('la lista para pagar usa numeroParaMostrar', /numero: numeroParaMostrar\(f\.numero_comprobante\),/.test(FUENTE))
    chk('la lista para aplicar un crédito también', /\$\{formatearFecha\(f\.fecha_factura\)\} — \$\{numeroParaMostrar\(f\.numero_comprobante\)\} — saldo/.test(FUENTE))
  }

  // ══ 8. EL ESCAPE ═══════════════════════════════════════════════════════════
  {
    const S = sandbox()
    S.__setDatos('v_cuenta_corriente_movimientos', [
      { proveedor_id: 'p1', unidad_negocio_id: 'u-n', moneda: 'ARS', fecha: '2026-09-30', tipo: 'factura', monto: 5, factura_pendiente_id: 'f-si', referencia: 'SALDO-INICIAL', saldo_acumulado: 5, orden_desempate: 1 },
    ])
    S.__setDatos('facturas_pendientes', [{ id: 'f-si', estado: 'pendiente', observaciones: marca('obs') }])
    S.__setDatos('gastos', [])
    S.estado.maestros.proveedores = [{ id: 'p1', razon_social: marca('proveedor') }]
    abrirFicha(S)
    await S.cargarFichaMovimientos()
    chequearMarcas(chk, 'la ficha con una observación maliciosa', html(S, 'lista-movimientos-ficha'), ['obs'])
    await S.cargarHistorial()
    chequearMarcas(chk, 'el historial con observación y proveedor maliciosos', html(S, 'lista-historial'), ['obs', 'proveedor'])
    chequearMarcas(chk, 'los chips de la fábrica con id y nombre maliciosos',
      S.htmlUnidadesSaldoInicial([{ id: marca('u_id'), nombre: marca('u_nombre') }], null), ['u_id', 'u_nombre'])
    S.renderizarPadron()
    chequearMarcas(chk, 'el padrón (el botón de saldo inicial lleva el id escapado)', html(S, 'lista-padron'), ['proveedor'])
    const T = sandbox()
    T.abrirModalSaldoInicial('p1', marca('nombre_modal'), 'u-n')
    chk('el nombre del proveedor del modal va por textContent', T.__el('saldo-inicial-proveedor').textContent.includes('data-xss="nombre_modal"') &&
      !(T.__el('saldo-inicial-proveedor').innerHTML || '').includes('data-xss'))
  }
}

main().then(() => fin()).catch(e => { chk('las pruebas corren sin excepción', false, e.stack); fin() })
