// LA NOTA DE CRÉDITO DE UN PROVEEDOR (20/10/2026).
//
// Pedido: "Cargar nota de crédito" en la ficha del proveedor: tipo y número,
// fecha, importe total, a qué facturas se aplica (en parte, si hace falta; lo
// que sobra queda a favor) y, si devuelve mercadería o corrige cantidades,
// un ajuste de stock por insumo. TODO en UNA llamada a
// registrar_nota_credito_proveedor, que la base TODAVÍA NO TIENE: la
// pantalla se arma contra la firma propuesta (ver el traspaso) y NO inserta
// nada a mano.
//
// Esta suite fija:
//  - EL BOTÓN: en la ficha, con cuentas_corrientes:aplicar_credito (bypass de
//    super_admin); deshabilitado con "Todas las unidades".
//  - LAS FACTURAS: las pendientes en pesos de esa fábrica; "Aplicar a las
//    más viejas"; tildar propone lo que falta; nunca más que el saldo.
//  - LO QUE FALTA: cada caso dice qué, y no llama a la base.
//  - LO QUE VIAJA: los siete parámetros exactos (comprobante "tipo número",
//    las aplicaciones tildadas, los ajustes con signo).
//  - EL ERROR: "la función no existe" en castellano; cualquier otro, tal
//    cual; un doble toque manda una vez; al terminar, el éxito y la ficha.
//  - EL ESCAPE del número de factura y del insumo.
// Se EJECUTAN las funciones reales del módulo con un document y una base
// falsos.
//
//   node pruebas/test-cuentas-corrientes-nota-credito.js
'use strict'

const path = require('path')
const { construirCon } = require('./sandbox')
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
    const atr = {}
    const el = { id, innerHTML: '', textContent: '', value: '', hidden: id === 'modal-nota-credito', disabled: false, dataset: {}, style: {}, className: '', checked: false,
      classList: { add(){}, remove(){}, toggle(){} },
      querySelectorAll: () => [], querySelector: () => null, addEventListener(){}, setAttribute(k, v){ atr[k] = String(v) }, getAttribute(k){ return atr[k] ?? null }, focus(){},
      removeAttribute(k){ if (k === 'hidden') el.hidden = false } }
    return el
  }
  var __els = new Map()
  var document = {
    getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) },
    querySelectorAll: () => [], querySelector: (s) => document.getElementById('qs:' + s), body: nuevoEl('body'),
  }
  var location = { href: 'https://x.test/modulos/cuentas-corrientes.html', pathname: '/modulos/cuentas-corrientes.html', search: '' }
  var history = { pushState() {}, replaceState() {} }
  var __datos = {}, __consultas = [], __falla = {}
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
        if (__falla[tabla]) return Promise.resolve({ data: null, error: { message: 'falló ' + tabla } }).then(res, rej)
        const filas = (__datos[tabla] ?? []).filter(r => filtros.every(f => f(r)))
        return Promise.resolve({ data: uno ? (filas[0] ?? null) : filas, error: null }).then(res, rej)
      },
    }
    return q
  }
  var __rpcs = [], __rpcRes = { data: { credito_id: 'cr-1', aplicado: 150000, a_favor: 30000 }, error: null }, __rpcEsperar = false, __resolver = []
  var supabase = {
    from: (t) => __consulta(t),
    rpc(nombre, params) {
      __rpcs.push({ nombre, params: JSON.parse(JSON.stringify(params)) })
      if (__rpcEsperar) return new Promise(r => { __resolver.push(() => r(__rpcRes)) })
      return typeof __rpcRes === 'function' ? __rpcRes() : Promise.resolve(__rpcRes)
    },
  }
  var __errores = [], __exitos = []
  function mostrarError(m) { __errores.push(m) } function mostrarExito(m) { __exitos.push(m) }
  function formatearFecha(f) { if (!f) return '—'; const [a, m, d] = String(f).split('-'); return d + '/' + m + '/' + a }
  function abrirModalPago() {} function abrirModalAplicarCreditoDesdeFicha() {} function abrirModalSaldoInicial() {}
  var __refrescos = []
  async function cargarFichaSaldos() { __refrescos.push('ficha-saldos') }
  async function cargarFichaMovimientos() { __refrescos.push('ficha-movimientos') }
  async function cargarFichaCreditos() { __refrescos.push('ficha-creditos') }
  function renderizarFichaBanner__real() {}
  var estado = {
    miRolApp: 'usuario', miEmpleadoId: 'yo',
    misTareas: new Set(['cuentas_corrientes:ver_todo', 'cuentas_corrientes:aplicar_credito']),
    unidadElegida: null,
    maestros: {
      unidades: [{ id: 'u-n', nombre: 'Cucuruchos Nuss' }, { id: 'u-d', nombre: 'Dolce Pasta' }],
      proveedores: [{ id: 'p1', razon_social: 'DIMAFLO S.A.', cuit: '30111111118', direccion: null }],
    },
    fabrica: { ok: true, unidades: new Set(), personas: new Set(), soyDePrueba: false },
    ficha: null, sinImporte: [], fichaSaldos: [], fichaCreditos: [],
  }
`

const FUNCIONES = [
  'pasaFiltroUnidad', 'veUnidad', 'etiquetaUnidad', 'esc', 'importeHtml', 'formatearImporte', 'tieneTarea', 'nombreUnidad',
  'contarSinImporte', 'contarSinImporteVisible', 'htmlSinImporte', 'esSinImporte', 'saldosFichaVisibles', 'creditosFichaDeUnidad',
  'renderizarFichaBanner', 'puedeCargarSaldoInicial', 'montoDeCampo', 'fechaISO', 'numeroParaMostrar', 'unidadesParaElegir',
  // la nota de crédito
  'puedeCargarNotaCredito', 'comprobanteNota', 'totalesNota', 'aplicarNotaAViejas', 'validarNota', 'parametrosNota',
  'mensajeErrorNota', 'textoExitoNota', 'htmlFacturasNota', 'htmlTotalesNota', 'htmlResultadosInsumoNota', 'htmlAjustesNota',
  'renderizarNotaCredito', 'pintarPieNota', 'abrirModalNotaCredito', 'cerrarModalNotaCredito', 'asegurarInsumosNota', 'accionNota',
  'escribirNota', 'aplicarNotaAViejasDesdeBoton', 'alternarAjusteNota', 'confirmarNotaCredito',
]
const CONSTANTES = ['TIPOS_NOTA_CREDITO', 'centavosNota', 'NUMERO_SALDO_INICIAL']

function sandbox() {
  return construirCon(ARCHIVO, {
    preludio: PRELUDIO + '\n  var notaCredito = null\n  var claveAjusteNota = 0\n  var importeNotaEnlazado = false\n',
    funciones: [...FUNCIONES, ...FUNCIONES_CP_CC], constantes: [...CONSTANTES, ...CONSTANTES_CP_CC],
    retorno: `estado, __els, __errores, __exitos, __consultas, __rpcs, __refrescos,
      __nc(){ return notaCredito }, __el(id){ return document.getElementById(id) }, __setDatos(t, d){ __datos[t] = d }, __fallar(t){ __falla[t] = true },
      __rpcResponde(r){ __rpcRes = r }, __rpcEspera(v){ __rpcEsperar = v }, __soltar(){ const r = __resolver.splice(0); r.forEach(f => f()) }`,
  })
}
const html = (S, id) => S.__el(id).innerHTML ?? ''
const vacia = () => new Promise(r => setTimeout(r, 0))
function abrirFicha(S, unidadId = 'u-n') {
  S.estado.ficha = { proveedorId: 'p1', unidadId, nombre: 'DIMAFLO S.A.', unidades: [] }
}
const FACTURAS = [
  { id: 'f-2', proveedor_id: 'p1', unidad_negocio_id: 'u-n', moneda: 'ARS', estado: 'parcial', numero_comprobante: '0001-00000200', fecha_factura: '2026-10-05', saldo_pendiente: 80000 },
  { id: 'f-1', proveedor_id: 'p1', unidad_negocio_id: 'u-n', moneda: 'ARS', estado: 'pendiente', numero_comprobante: '0001-00000100', fecha_factura: '2026-09-20', saldo_pendiente: 100000 },
  { id: 'f-usd', proveedor_id: 'p1', unidad_negocio_id: 'u-n', moneda: 'USD', estado: 'pendiente', numero_comprobante: 'USD-1', fecha_factura: '2026-09-01', saldo_pendiente: 500 },
  { id: 'f-d', proveedor_id: 'p1', unidad_negocio_id: 'u-d', moneda: 'ARS', estado: 'pendiente', numero_comprobante: 'D-1', fecha_factura: '2026-09-01', saldo_pendiente: 1000 },
  { id: 'f-pag', proveedor_id: 'p1', unidad_negocio_id: 'u-n', moneda: 'ARS', estado: 'pagada', numero_comprobante: 'PAG', fecha_factura: '2026-09-01', saldo_pendiente: 0 },
  { id: 'f-cero', proveedor_id: 'p1', unidad_negocio_id: 'u-n', moneda: 'ARS', estado: 'parcial', numero_comprobante: 'CERO', fecha_factura: '2026-09-02', saldo_pendiente: 0 },
]
const INSUMOS = [
  { id: 'i-har', nombre: 'Harina 000', marca: 'Molino', unidad_medida: 'kg', tipo: 'materia_prima', activo: true },
  { id: 'i-caja', nombre: 'Caja N°1', marca: 'Nuss', unidad_medida: 'un', tipo: 'insumo', activo: true },
  { id: 'i-vieja', nombre: 'Caja vieja', marca: null, unidad_medida: 'un', tipo: 'insumo', activo: false },
]
async function abierto(S) {
  S.__setDatos('facturas_pendientes', FACTURAS)
  S.__setDatos('insumos', INSUMOS)
  abrirFicha(S)
  await S.abrirModalNotaCredito()
  return S.__nc()
}
// Lo que tipearía una persona.
function completar(S, { numero = '0001-00001234', fecha = '2026-10-15', importe = '180.000,00', tipo = 'Nota de crédito A' } = {}) {
  S.__el('campo-nota-numero').value = numero
  S.__el('campo-nota-fecha').value = fecha
  S.__el('campo-nota-importe').value = importe
  S.__el('campo-nota-tipo').value = tipo
  S.__nc().numero = numero
}
const tocar = (sel) => ({ target: { closest: () => sel } })

async function main() {
  // ══ 1. EL MARCADO ══════════════════════════════════════════════════════════
  chk('el modal existe y nace escondido', /<div class="modal-cc" id="modal-nota-credito" hidden>/.test(FUENTE))
  for (const id of ['campo-nota-tipo', 'campo-nota-numero', 'campo-nota-fecha', 'campo-nota-importe', 'nota-credito-facturas', 'nota-credito-totales',
    'btn-nota-viejas', 'btn-nota-ajuste', 'nota-credito-ajustes', 'nota-credito-error', 'btn-confirmar-nota-credito', 'btn-cancelar-nota-credito', 'btn-cerrar-nota-credito']) {
    chk(`el modal tiene #${id}`, FUENTE.includes(`id="${id}"`))
  }
  chk('el importe es texto con teclado decimal (nunca type=number)', /<input type="text" id="campo-nota-importe" placeholder="0,00" inputmode="decimal" autocomplete="off">/.test(FUENTE))
  chk('el número es un IDENTIFICADOR: texto, sin formato de número', /<input type="text" id="campo-nota-numero"[^>]*inputmode="text">/.test(FUENTE))
  chk('el botón de confirmar NO nace deshabilitado', /<button type="button" class="btn btn-cc-accion" id="btn-confirmar-nota-credito">Cargar nota de crédito<\/button>/.test(FUENTE))
  chk('el gate es aplicar_credito', /function puedeCargarNotaCredito\(\) \{\s*return tieneTarea\('cuentas_corrientes', 'aplicar_credito'\)\s*\}/.test(FUENTE))
  chk('NO se inserta nada a mano en creditos_proveedor', !/from\('creditos_proveedor'\)\.(insert|update|upsert)/.test(FUENTE) && !/from\('aplicaciones_credito'\)/.test(FUENTE))
  chk('una sola llamada: registrar_nota_credito_proveedor', (FUENTE.match(/rpc\('registrar_nota_credito_proveedor'/g) ?? []).length === 1)
  chk('confirmar está conectado', /getElementById\('btn-confirmar-nota-credito'\)\.addEventListener\('click', confirmarNotaCredito\)/.test(FUENTE))

  // ══ 2. EL BOTÓN ════════════════════════════════════════════════════════════
  {
    const S = sandbox()
    abrirFicha(S)
    S.renderizarFichaBanner()
    chk('con aplicar_credito, la ficha tiene "Cargar nota de crédito"', /id="btn-nota-credito-ficha" >Cargar nota de crédito</.test(html(S, 'ficha-banner')), html(S, 'ficha-banner').slice(0, 600))
    S.estado.ficha.unidadId = null
    S.renderizarFichaBanner()
    chk('con "Todas las unidades" queda deshabilitado (es de una fábrica)', /id="btn-nota-credito-ficha" disabled>/.test(html(S, 'ficha-banner')))
    const T = sandbox()
    T.estado.misTareas = new Set(['cuentas_corrientes:ver_todo', 'cuentas_corrientes:registrar_pago'])
    abrirFicha(T)
    T.renderizarFichaBanner()
    chk('sin aplicar_credito NO está', !/btn-nota-credito-ficha/.test(html(T, 'ficha-banner')))
    await T.abrirModalNotaCredito()
    chk('sin aplicar_credito el modal no se abre aunque se lo llame', T.__el('modal-nota-credito').hidden === true && T.__nc() === null)
    const U = sandbox()
    U.estado.miRolApp = 'super_admin'
    U.estado.misTareas = new Set()
    abrirFicha(U)
    U.renderizarFichaBanner()
    chk('un super_admin lo ve (bypass)', /btn-nota-credito-ficha/.test(html(U, 'ficha-banner')))
    const V = sandbox()
    abrirFicha(V, null)
    await V.abrirModalNotaCredito()
    chk('sin fábrica en la ficha no abre y lo dice', V.__nc() === null && V.__errores.some(e => /Elegí la fábrica/.test(e)))
  }

  // ══ 3. LAS FACTURAS ═══════════════════════════════════════════════════════
  {
    const S = sandbox()
    const n = await abierto(S)
    chk('abre el modal', S.__el('modal-nota-credito').hidden === false)
    const c = S.__consultas.find(x => x.tabla === 'facturas_pendientes')
    chk('lee las facturas del proveedor, de ESA fábrica, en pesos, pendientes o parciales',
      JSON.stringify(c.eq) === JSON.stringify([['proveedor_id', 'p1'], ['unidad_negocio_id', 'u-n'], ['moneda', 'ARS']]) &&
      JSON.stringify(c.in) === JSON.stringify([['estado', ['pendiente', 'parcial']]]))
    chk('solo las de pesos y con saldo (sin la de dólares, la de otra fábrica, la pagada ni una parcial en cero)', n.facturas.map(f => f.id).sort().join() === 'f-1,f-2')
    chk('arranca sin ninguna tildada', n.facturas.every(f => !f.tildada && f.monto === null))
    const h = html(S, 'nota-credito-facturas')
    chk('cada factura con su tilde, su número, su fecha y su saldo', /data-nc-tilde="f-1"/.test(h) && /0001-00000100/.test(h) && /20\/09\/2026 · saldo \$ 100\.000,00/.test(h) && /data-nc-monto="f-1"/.test(h))
    chk('el proveedor y la fábrica arriba, como texto', S.__el('nota-credito-proveedor').textContent === 'DIMAFLO S.A. · Cucuruchos Nuss')
    chk('el tipo arranca en "Nota de crédito A" y hay cuatro', S.__el('campo-nota-tipo').value === 'Nota de crédito A' && (html(S, 'campo-nota-tipo').match(/<option /g) ?? []).length === 4)
    chk('la fecha arranca en hoy y el importe vacío (nunca un cero)', /^\d{4}-\d{2}-\d{2}$/.test(S.__el('campo-nota-fecha').value) && S.__el('campo-nota-importe').value === '')
    // Aplicar a las más viejas.
    completar(S, { importe: '150.000,00' })
    S.aplicarNotaAViejasDesdeBoton()
    const f1 = n.facturas.find(f => f.id === 'f-1'), f2 = n.facturas.find(f => f.id === 'f-2')
    chk('"Aplicar a las más viejas": la más vieja entera y la siguiente en parte', f1.tildada && f1.monto === 100000 && f2.tildada && f2.monto === 50000)
    chk('el pie dice lo aplicado y lo que queda a favor', S.__el('nota-credito-totales').textContent === 'Nota $ 150.000,00 · Aplicado $ 150.000,00 · Queda a favor $ 0,00')
    completar(S, { importe: '200.000,00' })
    S.aplicarNotaAViejasDesdeBoton()
    chk('con más importe que deuda, las dos enteras y el resto a favor', f1.monto === 100000 && f2.monto === 80000 &&
      S.__el('nota-credito-totales').textContent === 'Nota $ 200.000,00 · Aplicado $ 180.000,00 · Queda a favor $ 20.000,00')
    // Tildar a mano propone lo que falta, hasta su saldo.
    f1.tildada = false; f1.monto = null; f2.tildada = false; f2.monto = null
    completar(S, { importe: '90.000,00' })
    S.escribirNota({ dataset: { ncTilde: 'f-2' }, checked: true })
    chk('tildar una factura propone lo que falta del importe, hasta su saldo', f2.tildada && f2.monto === 80000)
    S.escribirNota({ dataset: { ncTilde: 'f-1' }, checked: true })
    chk('la segunda, lo que queda', f1.tildada && f1.monto === 10000)
    S.escribirNota({ dataset: { ncTilde: 'f-1' }, checked: false })
    chk('destildar la saca', !f1.tildada && f1.monto === null)
    // Sin importe, "aplicar a las más viejas" lo pide.
    completar(S, { importe: '' })
    S.aplicarNotaAViejasDesdeBoton()
    chk('sin importe, "Aplicar a las más viejas" lo pide', /Escribí primero el importe total/.test(S.__el('nota-credito-error').textContent) && S.__el('nota-credito-error').hidden === false)
    // Sin facturas: queda todo a favor.
    const T = sandbox()
    T.__setDatos('facturas_pendientes', [])
    abrirFicha(T)
    await T.abrirModalNotaCredito()
    chk('sin facturas lo dice: queda todo a favor', /No hay facturas pendientes en pesos en esta fábrica: la nota queda toda a favor\./.test(html(T, 'nota-credito-facturas')))
    const F = sandbox()
    F.__fallar('facturas_pendientes')
    abrirFicha(F)
    await F.abrirModalNotaCredito()
    chk('si no se pueden leer, lo dice (sin inventar)', /No se pudieron leer las facturas/.test(html(F, 'nota-credito-facturas')))
    const G = sandbox()
    G.estado.misTareas = new Set(['cuentas_corrientes:aplicar_credito'])
    await abierto(G)
    chk('sin «ver todo» avisa que ve solo las suyas', /Sin «ver todo» se ven solo las facturas que cargaste vos\./.test(html(G, 'nota-credito-facturas')))
  }

  // ══ 4. LO QUE FALTA ═══════════════════════════════════════════════════════
  {
    const S = sandbox()
    const n = await abierto(S)
    const prueba = async (nombre, prep, re) => {
      S.__rpcs.length = 0
      completar(S)
      prep()
      await S.confirmarNotaCredito()
      chk(nombre, S.__rpcs.length === 0 && re.test(S.__el('nota-credito-error').textContent), S.__el('nota-credito-error').textContent)
    }
    await prueba('sin número', () => { S.__el('campo-nota-numero').value = '' }, /Escribí el número de la nota de crédito\./)
    await prueba('un número sin dígitos', () => { S.__el('campo-nota-numero').value = 'abc' }, /tiene que tener algún número/)
    await prueba('una fecha futura', () => { S.__el('campo-nota-fecha').value = '2999-01-01' }, /La fecha no puede ser futura\./)
    await prueba('sin importe', () => { S.__el('campo-nota-importe').value = '' }, /Escribí el importe total de la nota\./)
    await prueba('importe cero', () => { S.__el('campo-nota-importe').value = '0' }, /El importe tiene que ser mayor a cero\./)
    await prueba('una factura tildada sin monto', () => { n.facturas[0].tildada = true; n.facturas[0].monto = null }, /Poné cuánto se aplica a la factura/)
    await prueba('más que el saldo de una factura', () => { const f = n.facturas.find(x => x.id === 'f-2'); f.tildada = true; f.monto = 90000; n.facturas.find(x => x.id === 'f-1').tildada = false }, /se le aplica más que su saldo \(\$ 80\.000,00\)/)
    await prueba('lo aplicado pasa del importe', () => {
      S.__el('campo-nota-importe').value = '50.000,00'
      for (const f of n.facturas) { f.tildada = true; f.monto = f.saldo }
    }, /Lo aplicado a las facturas \(\$ 180\.000,00\) pasa del importe de la nota \(\$ 50\.000,00\)\./)
    for (const f of n.facturas) { f.tildada = false; f.monto = null }
    n.conAjuste = true
    n.ajustes = [{ insumoId: null, nombre: '', sentido: 'resta', cantidad: 5 }]
    await prueba('un ajuste sin insumo', () => {}, /Ajuste 1: elegí el insumo\./)
    n.ajustes = [{ insumoId: 'i-caja', nombre: 'Caja N°1 · Nuss', tipo: 'insumo', sentido: 'resta', cantidad: null }]
    await prueba('un ajuste sin cantidad', () => {}, /Ajuste 1: poné la cantidad\./)
    n.ajustes = [{ insumoId: 'i-har', nombre: 'Harina 000 · Molino', tipo: 'materia_prima', sentido: 'resta', cantidad: 25, lote: '' }]
    await prueba('materia prima sin lote', () => {}, /Ajuste 1: Harina 000 · Molino es materia prima: escribí el lote\./)
    chk('lo que falta no traba el botón (solo mientras manda)', S.__el('btn-confirmar-nota-credito').disabled === false)
    n.conAjuste = false
    await prueba('con el ajuste apagado, no lo valida', () => { S.__el('campo-nota-numero').value = '' }, /Escribí el número/)
  }

  // ══ 5. LO QUE VIAJA ═══════════════════════════════════════════════════════
  {
    const S = sandbox()
    const n = await abierto(S)
    completar(S, { importe: '180.000,50', tipo: 'Nota de crédito B', numero: '  0003-00000042 ' })
    S.escribirNota({ id: 'campo-nota-tipo', value: 'Nota de crédito B', dataset: {} })
    S.aplicarNotaAViejasDesdeBoton()
    S.alternarAjusteNota()
    await vacia()
    chk('"¿Devuelve mercadería…?" abre los ajustes con un renglón y lee los insumos activos', n.conAjuste && n.ajustes.length === 1 && n.insumos.map(i => i.id).join() === 'i-har,i-caja' &&
      S.__el('nota-credito-ajustes').hidden === false && S.__el('btn-nota-ajuste').getAttribute('aria-expanded') === 'true')
    S.escribirNota({ dataset: { ncBuscar: '0' }, value: 'har' })
    chk('buscar desde 2 letras ofrece el insumo', /data-nc-insumo="0" data-id="i-har">Harina 000 · Molino</.test(S.htmlResultadosInsumoNota(n, n.ajustes[0], 0)))
    chk('con 1 letra no busca', /Escribí al menos 2 letras/.test(S.htmlResultadosInsumoNota(n, { busqueda: 'h' }, 0)))
    S.accionNota(tocar({ dataset: { ncInsumo: '0', id: 'i-har' } }))
    chk('elegido el insumo', n.ajustes[0].insumoId === 'i-har' && n.ajustes[0].tipo === 'materia_prima' && n.ajustes[0].unidad === 'kg')
    S.escribirNota({ dataset: { ncCantidad: '0' }, value: '25,5' })
    S.escribirNota({ dataset: { ncLote: '0' }, value: 'L-77' })
    S.accionNota(tocar({ dataset: { ncAgregar: '' } }))
    S.accionNota(tocar({ dataset: { ncInsumo: '1', id: 'i-caja' } }))
    S.accionNota(tocar({ dataset: { ncSentido: '1', ncValor: 'suma' } }))
    S.escribirNota({ dataset: { ncCantidad: '1' }, value: '10' })
    chk('los dos sentidos se dibujan', /data-nc-sentido="1" data-nc-valor="suma" aria-pressed="true">Entra al stock/.test(S.htmlAjustesNota(n)) && /data-nc-sentido="0" data-nc-valor="resta" aria-pressed="true">Sale del stock/.test(S.htmlAjustesNota(n)))
    await S.confirmarNotaCredito()
    chk('UNA sola llamada', S.__rpcs.length === 1 && S.__rpcs[0].nombre === 'registrar_nota_credito_proveedor')
    const p = S.__rpcs[0].params
    chk('los siete parámetros exactos', JSON.stringify(p) === JSON.stringify({
      p_proveedor_id: 'p1', p_unidad_negocio_id: 'u-n', p_comprobante: 'Nota de crédito B 0003-00000042', p_fecha: '2026-10-15', p_importe: 180000.5,
      p_aplicaciones: [{ factura_pendiente_id: 'f-2', monto_aplicado: 80000 }, { factura_pendiente_id: 'f-1', monto_aplicado: 100000 }],
      p_ajustes_stock: [{ insumo_id: 'i-har', lote: 'L-77', cantidad: -25.5 }, { insumo_id: 'i-caja', lote: null, cantidad: 10 }],
    }), JSON.stringify(p))
    chk('el éxito dice lo aplicado y lo que queda a favor', S.__exitos.includes('Nota de crédito cargada: aplicada $ 150.000,00 · queda a favor $ 30.000,00.'))
    chk('cierra el modal', S.__el('modal-nota-credito').hidden === true && S.__nc() === null)
    await vacia()
    chk('y vuelve a leer la ficha (saldos, movimientos, créditos)', ['ficha-saldos', 'ficha-movimientos', 'ficha-creditos'].every(x => S.__refrescos.includes(x)))
    // Sin facturas tildadas ni ajuste: las listas vacías.
    const T = sandbox()
    await abierto(T)
    completar(T, { importe: '1.000,00' })
    // Una factura con monto pero destildada no viaja; un ajuste con el bloque apagado, tampoco.
    const nt = T.__nc()
    nt.facturas[0].monto = 500
    nt.facturas[0].tildada = false
    nt.ajustes = [{ insumoId: 'i-caja', nombre: 'Caja', tipo: 'insumo', sentido: 'resta', cantidad: 3, lote: '' }]
    nt.conAjuste = false
    await T.confirmarNotaCredito()
    chk('sin aplicar nada: aplicaciones y ajustes vacíos (todo a favor)', JSON.stringify(T.__rpcs[0].params.p_aplicaciones) === '[]' && JSON.stringify(T.__rpcs[0].params.p_ajustes_stock) === '[]')
    chk('el éxito con un dato ausente dice "—", nunca "$ 0,00"', T.textoExitoNota({}) === 'Nota de crédito cargada: aplicada — · queda a favor —.')
  }

  // ══ 6. EL ERROR ═══════════════════════════════════════════════════════════
  {
    const S = sandbox()
    await abierto(S)
    completar(S)
    S.__rpcResponde({ data: null, error: { code: 'PGRST202', message: 'Could not find the function public.registrar_nota_credito_proveedor(...) in the schema cache' } })
    await S.confirmarNotaCredito()
    chk('sin la función en la base: lo dice en castellano', S.__el('nota-credito-error').textContent === 'Todavía no se puede cargar: la base no tiene la función registrar_nota_credito_proveedor. Avisale al chat de la base.')
    chk('y el modal sigue abierto', S.__el('modal-nota-credito').hidden === false)
    S.__rpcResponde({ data: null, error: { code: 'P0001', message: 'La factura no está pendiente de pago "><b data-xss="e">' } })
    await S.confirmarNotaCredito()
    chk('cualquier otro error, TAL CUAL', S.__el('nota-credito-error').textContent === 'La factura no está pendiente de pago "><b data-xss="e">')
    chk('el error va por textContent (no se interpreta)', !(S.__el('nota-credito-error').innerHTML || '').includes('data-xss'))
    S.__rpcResponde(() => Promise.reject(new Error('Failed to fetch')))
    await S.confirmarNotaCredito()
    chk('sin conexión lo dice', /No hay conexión: la nota de crédito no se cargó/.test(S.__el('nota-credito-error').textContent))
    // Doble toque.
    S.__rpcs.length = 0
    S.__rpcResponde({ data: { aplicado: 0, a_favor: 180000 }, error: null })
    S.__rpcEspera(true)
    const a = S.confirmarNotaCredito()
    const b = S.confirmarNotaCredito()
    chk('mientras manda, el botón se traba y dice "Cargando…"', S.__el('btn-confirmar-nota-credito').disabled === true && S.__el('btn-confirmar-nota-credito').textContent === 'Cargando…')
    S.cerrarModalNotaCredito()
    chk('mientras manda no se cierra', S.__el('modal-nota-credito').hidden === false)
    S.__soltar()
    await Promise.all([a, b])
    chk('un doble toque manda UNA vez', S.__rpcs.length === 1)
  }

  // ══ 7. EL ESCAPE ══════════════════════════════════════════════════════════
  {
    const S = sandbox()
    S.__setDatos('facturas_pendientes', [{ id: marca('fid'), proveedor_id: 'p1', unidad_negocio_id: 'u-n', moneda: 'ARS', estado: 'pendiente', numero_comprobante: marca('num'), fecha_factura: '2026-09-01', saldo_pendiente: 10 }])
    S.__setDatos('insumos', [{ id: marca('iid'), nombre: marca('inom') + 'zz', marca: marca('imar'), unidad_medida: marca('iuni'), tipo: 'insumo', activo: true }])
    abrirFicha(S)
    await S.abrirModalNotaCredito()
    chequearMarcas(chk, 'las facturas', html(S, 'nota-credito-facturas'), ['fid', 'num'])
    const n = S.__nc()
    S.alternarAjusteNota()
    await vacia()
    n.ajustes[0].busqueda = 'zz'
    chequearMarcas(chk, 'los insumos buscados', S.htmlResultadosInsumoNota(n, n.ajustes[0], 0), ['iid', 'inom', 'imar'])
    n.ajustes[0].busqueda = marca('busca')
    chequearMarcas(chk, 'lo buscado en el campo', S.htmlAjustesNota(n), ['busca'])
    n.ajustes[0].busqueda = 'zz'
    S.accionNota(tocar({ dataset: { ncInsumo: '0', id: marca('iid') } }))
    n.ajustes[0].lote = marca('lote')
    chequearMarcas(chk, 'el insumo elegido, su unidad y el lote', S.htmlAjustesNota(n), ['inom', 'iuni', 'lote'])
  }
}

main().then(() => fin()).catch(e => { chk('las pruebas corren sin excepción', false, e.stack); fin() })
