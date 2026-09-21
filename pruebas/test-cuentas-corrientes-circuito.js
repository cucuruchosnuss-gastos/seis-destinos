// Suite del circuito en modulos/cuentas-corrientes.html.
//
// Cubre lo NUEVO: las descargas sin importe (el movimiento en rojo, sus
// cantidades, "Cargar importe" con total o precio por unidad), el aviso de
// saldo incompleto en la lista, el resumen, el padrón y el banner de la
// ficha, los remitos sin facturar y que ningún null termine en "$ 0,00" o NaN.
// Los renders se EJECUTAN con un document falso.
//
//   node pruebas/test-cuentas-corrientes-circuito.js
//   ARCHIVO_TEST=otra-copia.html node pruebas/test-cuentas-corrientes-circuito.js

const path = require('path')
const { construirCon } = require('./sandbox')
const { arnes, marca, chequearMarcas, estaticoAcotado, leer } = require('./circuito-comun')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/cuentas-corrientes.html')
const FUENTE = leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

const PRELUDIO = `
  function nuevoEl(id) {
    return { id, innerHTML: '', textContent: '', value: '', hidden: false, dataset: {},
      addEventListener(){}, querySelectorAll: () => [], querySelector: () => null }
  }
  var __els = new Map()
  var document = {
    getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) },
    querySelector: () => nuevoEl('q'),
  }
  var __llamadas = { rpc: [], errores: [], exitos: [], movimientos: 0, recargas: 0 }
  var __rpc = async () => ({ data: null, error: null })
  var __from = { data: [], error: null }
  var supabase = {
    rpc: (n, p) => { __llamadas.rpc.push([n, p]); return __rpc(n, p) },
    from() {
      const q = { select: () => q, eq: () => q, in: () => q, order: () => q,
        then(res) { return Promise.resolve(__from).then(res) } }
      return q
    },
  }
  function mostrarError(m) { __llamadas.errores.push(m) }
  function mostrarExito(m) { __llamadas.exitos.push(m) }
  function formatearFecha(f) { const [a, m, d] = String(f).split('-'); return d + '/' + m + '/' + a }
  function renderizarFichaMovimientos() { __llamadas.movimientos++ }
  async function recargarTrasImporte() { __llamadas.recargas++ }
  function abrirModalPago(){} function abrirModalAplicarCreditoDesdeFicha(){}
  function abrirModalEditarProveedor(){} function abrirFichaDesdePadron(){} function abrirFicha(){}
  var estado = {
    miRolApp: 'usuario', misTareas: new Set(['cuentas_corrientes:ver_todo', 'cuentas_corrientes:registrar_pago']),
    maestros: { unidades: [{ id: 'u1', nombre: 'Cucuruchos Nuss' }], proveedores: [] },
    filtros: { proveedores: { busqueda: '', unidadId: '' }, padron: { busqueda: '' } },
    padronSaldos: new Map(), listaSaldos: [], listaHistorial: [], estadoPorFacturaHistorial: {},
    sinImporte: [], ficha: null, fichaSaldos: [], fichaCreditos: [],
  }
`

const FUNCIONES = [
  'esc', 'formatearImporte', 'formatearImporteCentavosSuaves', 'importeHtml', 'parseImporte', 'tieneTarea',
  'nombreUnidad', 'badgeEstadoFactura', 'inicialesEmpresa', 'colorAvatar', 'filtrarPadron',
  'contarSinImporte', 'htmlSinImporte', 'esSinImporte', 'resumenCantidades', 'textoCantidadInsumo',
  'totalImporteFormulario', 'htmlFilaSinImporte', 'htmlRemitosSinFacturar', 'renderizarFichaRemitos',
  'confirmarImporteSinImporte', 'cargarSinImporte', 'cargarFichaRemitos', 'renderizarListaSaldos',
  'renderizarResumenCC', 'renderizarPadron', 'renderizarFichaBanner', 'renderizarListaHistorial',
]
const CONSTANTES = ['ESTADO_FACTURA_LABEL', 'TIPO_MOVIMIENTO_LABEL', 'PALETA_AVATAR']

const S = construirCon(ARCHIVO, {
  preludio: PRELUDIO, funciones: FUNCIONES, constantes: CONSTANTES,
  retorno: 'estado, __els, __llamadas, __setRpc(f){ __rpc = f }, __setFrom(r){ __from = r }',
})
const el = (id) => S.__els.get(id) || { innerHTML: '', textContent: '', hidden: true }
const sinCeroNiNaN = (html) => !/\$\s*0,00/.test(html) && !/NaN/.test(html)

// ══════════════════════════════════════════════════════════════════════════
// 1. LA FILA DE UNA DESCARGA SIN IMPORTE
// ══════════════════════════════════════════════════════════════════════════
{
  const m = { tipo: 'factura', monto: null, factura_pendiente_id: marca('factura_id'), referencia: marca('referencia'),
    fecha: '2026-10-02', moneda: 'ARS', unidad_negocio_id: 'u1' }
  const cantidades = [{ insumoId: 'i1', nombre: marca('insumo'), unidad: marca('unidad'), cantidad: 250 }]
  const html = S.htmlFilaSinImporte(m, { cantidades, puedeCargar: true, form: null, todas: false })
  chequearMarcas(chk, 'htmlFilaSinImporte', html, ['factura_id', 'referencia', 'insumo', 'unidad'])
  chk('sin importe: dice "Falta importe" en rojo', html.includes('fila-movimiento__monto--falta') && html.includes('Falta importe'))
  chk('sin importe: nada de $0 ni NaN', sinCeroNiNaN(html), html)
  chk('sin importe: muestra las cantidades del ingreso', html.includes('250 '))
  chk('sin importe: con registrar_pago ofrece "Cargar importe"', html.includes('btn-cargar-importe'))
  chk('sin importe: sin registrar_pago no lo ofrece', !S.htmlFilaSinImporte(m, { cantidades, puedeCargar: false }).includes('btn-cargar-importe'))
  const sinVer = S.htmlFilaSinImporte(m, { cantidades: null, puedeCargar: true })
  chk('sin importe: si el RLS no deja ver el ingreso, lo dice', sinVer.includes('No se pueden ver las cantidades'))

  const form = { facturaId: m.factura_pendiente_id, modo: 'total', texto: marca('texto'), error: marca('error_rpc'), enCurso: false }
  const conForm = S.htmlFilaSinImporte(m, { cantidades, puedeCargar: true, form })
  chequearMarcas(chk, 'htmlFilaSinImporte (formulario)', conForm, ['factura_id', 'texto', 'error_rpc', 'insumo', 'unidad'])
  chk('formulario: con un producto ofrece precio por unidad', conForm.includes('value="unidad"'))
  chk('formulario: con texto inválido no inventa un total', conForm.includes('Escribí un importe mayor a cero.') && sinCeroNiNaN(conForm))
  const varios = S.htmlFilaSinImporte(m, { cantidades: [...cantidades, { insumoId: 'i2', nombre: 'B', unidad: 'kg', cantidad: 3 }], puedeCargar: true, form: { ...form, error: null, texto: '' } })
  chk('formulario: con varios productos NO ofrece precio por unidad', !varios.includes('value="unidad"') && varios.includes('Son varios productos'))

  chk('esSinImporte: monto null en una factura', S.esSinImporte({ tipo: 'factura', monto: null, factura_pendiente_id: 'f' }, {}))
  chk('esSinImporte: por el estado aunque traiga monto', S.esSinImporte({ tipo: 'factura', monto: 0, factura_pendiente_id: 'f' }, { f: 'sin_importe' }))
  chk('esSinImporte: un pago no', !S.esSinImporte({ tipo: 'pago', monto: null, factura_pendiente_id: null }, {}))
  chk('esSinImporte: una factura con importe no', !S.esSinImporte({ tipo: 'factura', monto: 100, factura_pendiente_id: 'f' }, { f: 'pendiente' }))
  chk('badge: sin_importe dice "Falta importe"', S.badgeEstadoFactura('sin_importe').includes('Falta importe'))
}

// ══════════════════════════════════════════════════════════════════════════
// 2. EL TOTAL A CARGAR
// ══════════════════════════════════════════════════════════════════════════
{
  const una = [{ insumoId: 'i', nombre: 'Harina', unidad: 'kg', cantidad: 250 }]
  chk('total: modo total toma el número', S.totalImporteFormulario({ modo: 'total', texto: '1.234,50' }, una) === 1234.5)
  chk('total: por unidad multiplica por la cantidad', S.totalImporteFormulario({ modo: 'unidad', texto: '1.200,10' }, una) === 300025)
  chk('total: por unidad redondea al centavo', S.totalImporteFormulario({ modo: 'unidad', texto: '0,333' }, [{ cantidad: 3 }]) === 1)
  chk('total: por unidad con varios productos no da número', S.totalImporteFormulario({ modo: 'unidad', texto: '10' }, [...una, { cantidad: 1 }]) === null)
  chk('total: por unidad sin cantidades no da número', S.totalImporteFormulario({ modo: 'unidad', texto: '10' }, null) === null)
  chk('total: vacío o cero es null (no 0)', S.totalImporteFormulario({ modo: 'total', texto: '' }, una) === null && S.totalImporteFormulario({ modo: 'total', texto: '0' }, una) === null)
  const r = S.resumenCantidades([
    { insumo_id: 'a', cantidad: '100', insumos: { nombre: 'Harina', unidad_medida: 'kg' } },
    { insumo_id: 'a', cantidad: 150, insumos: { nombre: 'Harina', unidad_medida: 'kg' } },
    { insumo_id: 'b', cantidad: null, insumos: { nombre: 'Nada', unidad_medida: 'un' } },
  ])
  chk('cantidades: suma por insumo y descarta el null (no lo cuenta como 0)', r.length === 1 && r[0].cantidad === 250, JSON.stringify(r))
}

// Corre DESPUÉS de los bloques síncronos (ver el final): comparte
// estado.ficha con ellos, y arrancarla acá los haría pisarse mientras espera.
const ramaAsync = async () => {
  // Confirmar: el total va a completar_importe_factura y el error se muestra tal cual.
  S.estado.ficha = { proveedorId: 'p', unidadId: 'u1', cantidadesSinImporte: new Map([['f1', [{ cantidad: 250 }]]]),
    formImporte: { facturaId: 'f1', modo: 'unidad', texto: '100', error: null, enCurso: false }, movimientosRaw: [] }
  S.__setRpc(async () => ({ data: null, error: { message: 'Este movimiento ya tiene importe.' } }))
  await S.confirmarImporteSinImporte('f1')
  const ult = S.__llamadas.rpc.at(-1)
  chk('cargar importe: llama a completar_importe_factura con el TOTAL', ult?.[0] === 'completar_importe_factura' && ult[1].p_factura_id === 'f1' && ult[1].p_importe === 25000, JSON.stringify(ult))
  chk('cargar importe: el error de la RPC queda tal cual', S.estado.ficha.formImporte.error === 'Este movimiento ya tiene importe.')
  S.estado.ficha.formImporte = { facturaId: 'f1', modo: 'total', texto: '', error: null, enCurso: false }
  const antes = S.__llamadas.rpc.length
  await S.confirmarImporteSinImporte('f1')
  chk('cargar importe: sin importe válido no llama a la RPC', S.__llamadas.rpc.length === antes && !!S.estado.ficha.formImporte.error)
  S.estado.ficha.formImporte = { facturaId: 'f1', modo: 'total', texto: '5.000', error: null, enCurso: false }
  S.__setRpc(async () => ({ data: null, error: null }))
  await S.confirmarImporteSinImporte('f1')
  chk('cargar importe: al terminar recarga saldos y movimientos', S.__llamadas.recargas === 1 && S.estado.ficha.formImporte === null)

  // Descargas sin importe: error de la consulta se dice.
  S.__setFrom({ data: null, error: { message: 'permiso X' } })
  await S.cargarSinImporte()
  chk('descargas sin importe: si la consulta falla, lo dice (el saldo puede estar incompleto)', S.__llamadas.errores.at(-1)?.includes('permiso X'))
  S.__setFrom({ data: [], error: null })

  // Remitos: sin permiso no consulta; con error, se muestra tal cual.
  S.estado.misTareas = new Set()
  const n0 = S.__llamadas.rpc.length
  S.estado.ficha = { proveedorId: 'p', unidadId: null }
  await S.cargarFichaRemitos()
  chk('remitos: sin ver_todo ni registrar_pago no consulta', S.__llamadas.rpc.length === n0)
  S.estado.misTareas = new Set(['cuentas_corrientes:registrar_pago'])
  S.__setRpc(async () => ({ data: null, error: { message: marca('error_remitos') } }))
  await S.cargarFichaRemitos()
  chequearMarcas(chk, 'remitos (error)', el('ficha-remitos-sin-facturar').innerHTML, ['error_remitos'])
  S.estado.misTareas = new Set(['cuentas_corrientes:ver_todo', 'cuentas_corrientes:registrar_pago'])
}

// ══════════════════════════════════════════════════════════════════════════
// 3. SALDOS INCOMPLETOS: LISTA, RESUMEN, PADRÓN, BANNER, HISTORIAL
// ══════════════════════════════════════════════════════════════════════════
{
  S.estado.sinImporte = [
    { id: 'a', proveedor_id: 'p1', unidad_negocio_id: 'u1', moneda: 'ARS' },
    { id: 'b', proveedor_id: 'p1', unidad_negocio_id: 'u1', moneda: 'ARS' },
    { id: 'c', proveedor_id: 'p1', unidad_negocio_id: 'u2', moneda: 'ARS' },
  ]
  chk('contar: por proveedor y unidad', S.contarSinImporte('p1', 'u1') === 2 && S.contarSinImporte('p1', 'u2') === 1)
  chk('contar: sin unidad cuenta todas', S.contarSinImporte('p1') === 3 && S.contarSinImporte('p2') === 0)
  chk('aviso: "+ 2 descargas sin importe"', S.htmlSinImporte(2).includes('+ 2 descargas sin importe') && S.htmlSinImporte(1).includes('+ 1 descarga sin importe'))
  chk('aviso: con 0 no dibuja nada', S.htmlSinImporte(0) === '')

  // Lista: un proveedor SOLO con descargas sin importe (sin saldo) no dice $0.
  S.estado.listaSaldos = [{ proveedor_id: 'p1', unidad_negocio_id: 'u1', saldos: [], proveedor: { razon_social: marca('razon_lista') } }]
  S.renderizarListaSaldos()
  const lista = el('lista-proveedores').innerHTML
  chequearMarcas(chk, 'renderizarListaSaldos', lista, ['razon_lista'])
  chk('lista: sin saldo conocido no dice $0,00', sinCeroNiNaN(lista), lista)
  chk('lista: dice las descargas sin importe', lista.includes('+ 2 descargas sin importe'))

  S.renderizarResumenCC()
  chk('resumen: dice las descargas sin importe al lado del total', el('resumen-cc-deuda').innerHTML.includes('+ 2 descargas sin importe'))

  // Padrón.
  S.estado.maestros.proveedores = [{ id: 'p1', razon_social: marca('razon_padron'), cuit: marca('cuit'), direccion: null }]
  S.estado.padronSaldos = new Map()
  S.renderizarPadron()
  const padron = el('lista-padron').innerHTML
  chequearMarcas(chk, 'renderizarPadron', padron, ['razon_padron', 'cuit'])
  chk('padrón: sin saldo conocido y con descargas no dice $0,00', sinCeroNiNaN(padron))
  chk('padrón: cuenta las descargas de todas las unidades', padron.includes('+ 3 descargas sin importe'))

  // Banner de la ficha.
  S.estado.ficha = { proveedorId: 'p1', unidadId: 'u1' }
  S.estado.fichaSaldos = []
  S.estado.fichaCreditos = []
  S.renderizarFichaBanner()
  const banner = el('ficha-banner').innerHTML
  chk('banner: sin saldo y con descargas no dice $0,00', sinCeroNiNaN(banner), banner)
  chk('banner: dice que el saldo está incompleto', banner.includes('+ 2 descargas sin importe') && banner.includes('incompleto'))
  S.estado.fichaSaldos = [{ unidad_negocio_id: 'u1', moneda: 'ARS', deuda_pendiente: 1000, credito_disponible: 0 }]
  S.renderizarFichaBanner()
  chk('banner: con saldo también avisa las descargas', el('ficha-banner').innerHTML.includes('+ 2 descargas sin importe'))
  S.estado.sinImporte = []
  S.estado.fichaSaldos = []
  S.renderizarFichaBanner()
  chk('banner: sin descargas y sin saldo sigue diciendo $ 0,00 (es un cero real)', el('ficha-banner').innerHTML.includes('$ 0,00'))

  // Historial.
  S.estado.listaHistorial = [{ tipo: 'factura', monto: null, factura_pendiente_id: 'f', proveedorNombre: marca('prov_hist'), referencia: marca('ref_hist'), moneda: 'ARS', fecha: '2026-10-02' }]
  S.estado.estadoPorFacturaHistorial = { f: 'sin_importe' }
  S.renderizarListaHistorial()
  const hist = el('lista-historial').innerHTML
  chequearMarcas(chk, 'renderizarListaHistorial', hist, ['prov_hist', 'ref_hist'])
  chk('historial: un monto null dice "Falta importe", no $0', hist.includes('Falta importe') && sinCeroNiNaN(hist))
}

// Remitos sin facturar.
{
  const remitos = [
    { ingreso_id: 'r1', fecha: '2026-10-01', numero_doc: marca('numero_remito'), unidad_negocio_id: 'u1', items: 3 },
    { ingreso_id: 'r2', fecha: '2026-10-02', numero_doc: null, unidad_negocio_id: 'u2' }, // sin items: Number(undefined) es NaN
  ]
  S.estado.maestros.unidades.push({ id: 'u2', nombre: marca('unidad_remito') })
  const html = S.htmlRemitosSinFacturar(remitos, {})
  chequearMarcas(chk, 'htmlRemitosSinFacturar', html, ['numero_remito', 'unidad_remito'])
  chk('remitos: dice que no suma al saldo', html.includes('no suma al saldo'))
  chk('remitos: items ausente no da NaN', !/NaN/.test(html) && html.includes('0 ítems'))
  chk('remitos: filtra por la unidad de la ficha', !S.htmlRemitosSinFacturar(remitos, { unidadId: 'u1' }).includes('Sin número'))
  chk('remitos: sin remitos no dibuja nada', S.htmlRemitosSinFacturar([], {}) === '' && S.htmlRemitosSinFacturar(null, {}) === '')
}

// ══════════════════════════════════════════════════════════════════════════
// 4. EL FUENTE: EL LISTADO SUMA LOS PROVEEDORES CON SOLO DESCARGAS
// ══════════════════════════════════════════════════════════════════════════
{
  const { extraerFn } = require('./extraer')
  const cs = extraerFn(FUENTE, 'cargarSaldos')
  chk('lista: los proveedores con SOLO descargas sin importe entran igual',
    /\|\| contarSinImporte\(g\.proveedor_id, g\.unidad_negocio_id\) > 0\)/.test(cs) && /for \(const f of estado\.sinImporte\)/.test(cs))
  chk('lista: respeta el filtro de unidad al sumarlos',
    /if \(estado\.filtros\.proveedores\.unidadId && f\.unidad_negocio_id !== estado\.filtros\.proveedores\.unidadId\) continue/.test(cs))
  const init = extraerFn(FUENTE, 'init')
  chk('init: las descargas se cargan ANTES que los saldos', init.indexOf('await cargarSinImporte()') > 0 && init.indexOf('await cargarSinImporte()') < init.indexOf('cargas.push(cargarSaldos())'))
  const ex = extraerFn(FUENTE, 'exportarExcelHistorial')
  chk('excel: un monto null va vacío, no 0', /'Monto':\s+m\.monto == null \? '' : Number\(m\.monto\)/.test(ex))
}

// ══════════════════════════════════════════════════════════════════════════
// 5. ESTÁTICO, ACOTADO A LAS FUNCIONES NUEVAS
// ══════════════════════════════════════════════════════════════════════════
estaticoAcotado(chk, ARCHIVO, FUENTE,
  ['htmlSinImporte', 'htmlFilaSinImporte', 'htmlRemitosSinFacturar', 'renderizarFichaRemitos'],
  {
    escape: 'esc',
    seguras: [
      ['n', 'número: conteo de descargas (filter().length)'],
      ["n === 1 ? 'descarga' : 'descargas'", 'literal del código'],
      ['cantidadesHtml', 'HTML ya escapado: se arma arriba con esc(textoCantidadInsumo(c))'],
      ['formHtml', 'HTML armado arriba en la misma función, con esc() en cada dato'],
      ['items', 'número: Number(r.items) || 0'],
      ["items === 1 ? 'ítem' : 'ítems'", 'literal del código'],
      ['filas.length', 'número: largo del array'],
      ['badgeEstadoFactura(\'sin_importe\')', 'HTML constante: el label sale de ESTADO_FACTURA_LABEL'],
      ['formatearFecha(m.fecha)', 'fecha de una columna date, formateada a dd/mm/aaaa'],
      ['formatearFecha(r.fecha)', 'fecha de una columna date, formateada a dd/mm/aaaa'],
      ["importeHtml(total, m.moneda)", 'importeHtml() escapa por dentro'],
      ['htmlRemitosSinFacturar(estado.ficha.remitos, { unidadId: estado.ficha.unidadId, error: estado.ficha.errorRemitos })', 'HTML armado por htmlRemitosSinFacturar(), que escapa adentro'],
    ],
    segurasRegex: [
      [/^filas\.map\(r =>/s, 'HTML de una plantilla anidada, verificada aparte'],
      [/^cantidades\.map\(c => esc\(textoCantidadInsumo\(c\)\)\)\.join\('<br>'\)$/s, 'escapada elemento por elemento con esc()'],
    ],
  })

esperas.push(ramaAsync())
fin()
