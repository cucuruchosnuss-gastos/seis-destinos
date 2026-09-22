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
const { fuenteNumeros } = require('./numeros-comun')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/cuentas-corrientes.html')
const FUENTE = leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

const PRELUDIO = `
  ${fuenteNumeros()}
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
  'esc', 'formatearImporte', 'formatearImporteCentavosSuaves', 'importeHtml', 'tieneTarea',
  'nombreUnidad', 'badgeEstadoFactura', 'inicialesEmpresa', 'colorAvatar', 'filtrarPadron',
  'contarSinImporte', 'htmlSinImporte', 'esSinImporte', 'resumenCantidades', 'textoCantidadInsumo', 'productoUnicoConCantidad', 'cargarCantidadesSinImporte',
  'decimalesImporteSin', 'totalImporteFormulario', 'htmlFilaSinImporte', 'htmlRemitosSinFacturar', 'renderizarFichaRemitos',
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
  const sinVer = S.htmlFilaSinImporte(m, { cantidades: null, puedeCargar: false, puedeVerCantidades: false })
  chk('sin importe: sin ver_todo ni registrar_pago dice qué permiso hace falta', sinVer.includes('se ven con permiso para ver todas las cuentas corrientes o para registrar pagos'))
  chk('sin importe: el aviso viejo de materia prima ya no está', !S.htmlFilaSinImporte(m, { cantidades: null, puedeCargar: true }).includes('ingresos de materia prima'))

  const form = { facturaId: m.factura_pendiente_id, modo: 'total', importe: null, error: marca('error_rpc'), enCurso: false }
  const conForm = S.htmlFilaSinImporte(m, { cantidades, puedeCargar: true, form })
  chequearMarcas(chk, 'htmlFilaSinImporte (formulario)', conForm, ['factura_id', 'error_rpc', 'insumo', 'unidad'])
  chk('formulario: el campo de importe se dibuja SIN value (lo escribe ponerNumero)', /<input[^>]*campo-importe-sin[^>]*>/.test(conForm) && !/<input[^>]*campo-importe-sin[^>]*value=/.test(conForm))
  chk('formulario: con un producto ofrece precio por unidad', conForm.includes('value="unidad"'))
  chk('formulario: sin importe no inventa un total', conForm.includes('Escribí un importe mayor a cero.') && sinCeroNiNaN(conForm))
  const varios = S.htmlFilaSinImporte(m, { cantidades: [...cantidades, { insumoId: 'i2', nombre: 'B', unidad: 'kg', cantidad: 3 }], puedeCargar: true, form: { ...form, error: null, importe: null } })
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
  chk('total: modo total toma el número', S.totalImporteFormulario({ modo: 'total', importe: 1234.5 }, una) === 1234.5)
  chk('total: por unidad multiplica por la cantidad', S.totalImporteFormulario({ modo: 'unidad', importe: 1200.1 }, una) === 300025)
  chk('total: por unidad redondea al centavo', S.totalImporteFormulario({ modo: 'unidad', importe: 0.333 }, [{ cantidad: 3 }]) === 1)
  chk('total: por unidad con varios productos no da número', S.totalImporteFormulario({ modo: 'unidad', importe: 10 }, [...una, { cantidad: 1 }]) === null)
  chk('total: por unidad sin cantidades no da número', S.totalImporteFormulario({ modo: 'unidad', importe: 10 }, null) === null)
  chk('total: vacío o cero es null (no 0)', S.totalImporteFormulario({ modo: 'total', importe: null }, una) === null && S.totalImporteFormulario({ modo: 'total', importe: 0 }, una) === null)
  // Las filas tienen la forma EXACTA que devuelve items_de_factura_pendiente.
  const r = S.resumenCantidades([
    { insumo: 'Harina', marca: 'Jupiter', unidad_medida: 'kg', cantidad: '100', cantidad_bultos: 4, contenido_por_bulto: 25 },
    { insumo: 'Harina', marca: 'Jupiter', unidad_medida: 'kg', cantidad: 150, cantidad_bultos: 6, contenido_por_bulto: 25 },
    { insumo: 'Nada', marca: null, unidad_medida: 'un', cantidad: null, cantidad_bultos: null, contenido_por_bulto: null },
  ])
  chk('cantidades: agrupa por producto y suma', r.length === 2 && r[0].cantidad === 250 && r[0].bultos === 10 && r[0].contenido === 25, JSON.stringify(r))
  chk('cantidades: un null NO se cuenta como 0', r[1].cantidad === null, JSON.stringify(r))
  chk('texto: cantidad null dice "—", nunca 0', S.textoCantidadInsumo(r[1]) === '— un de Nada', S.textoCantidadInsumo(r[1]))
  chk('texto: con marca y bultos', S.textoCantidadInsumo(r[0]) === '250 kg de Harina (Jupiter) · 10 bultos de 25 kg', S.textoCantidadInsumo(r[0]))
  const mezcla = S.resumenCantidades([
    { insumo: 'Film', marca: null, unidad_medida: 'kg', cantidad: 10, cantidad_bultos: 2, contenido_por_bulto: 5 },
    { insumo: 'Film', marca: null, unidad_medida: 'kg', cantidad: 3, cantidad_bultos: null, contenido_por_bulto: null },
  ])
  chk('cantidades: presentaciones distintas no inventan bultos', mezcla.length === 1 && mezcla[0].cantidad === 13 && mezcla[0].bultos === null && !S.textoCantidadInsumo(mezcla[0]).includes('bulto'), JSON.stringify(mezcla))
  const dosPres = S.resumenCantidades([
    { insumo: 'Lecitina', marca: null, unidad_medida: 'kg', cantidad: 100, cantidad_bultos: 4, contenido_por_bulto: 25 },
    { insumo: 'Lecitina', marca: null, unidad_medida: 'kg', cantidad: 100, cantidad_bultos: 2, contenido_por_bulto: 50 },
  ])
  chk('cantidades: dos presentaciones con bultos tampoco suman bultos', dosPres.length === 1 && dosPres[0].cantidad === 200 && dosPres[0].bultos === null && !S.textoCantidadInsumo(dosPres[0]).includes('bulto'), JSON.stringify(dosPres))
  chk('precio por unidad: un producto con cantidad null no lo habilita', S.totalImporteFormulario({ modo: 'unidad', importe: 10 }, [r[1]]) === null)
}

// ══════════════════════════════════════════════════════════════════════════
// 2b. LA MERCADERÍA SALE DE items_de_factura_pendiente (no de materia_prima_*)
// ══════════════════════════════════════════════════════════════════════════
const ramaRpcItems = async () => {
  const m = { tipo: 'factura', monto: null, factura_pendiente_id: 'f9', referencia: 'X', fecha: '2026-10-02', moneda: 'ARS', unidad_negocio_id: 'u1' }
  const fila = (o) => ({ insumo: 'Harina 000', marca: 'Jupiter', unidad_medida: 'kg', cantidad: 2000, cantidad_bultos: 80, contenido_por_bulto: 25, ...o })
  const cargar = async (rpc, tareas = ['cuentas_corrientes:registrar_pago']) => {
    S.estado.misTareas = new Set(tareas)
    S.__setRpc(rpc)
    const n0 = S.__llamadas.rpc.length
    const mapa = await S.cargarCantidadesSinImporte(['f9'])
    S.estado.misTareas = new Set(['cuentas_corrientes:ver_todo', 'cuentas_corrientes:registrar_pago'])
    return { mapa, llamadas: S.__llamadas.rpc.slice(n0) }
  }
  const form = (o) => ({ facturaId: 'f9', modo: 'total', importe: null, error: null, enCurso: false, ...o })

  // UN producto: se ofrece precio por unidad y 2.000 kg x "1.234,50" manda 2469000.
  {
    const { mapa, llamadas } = await cargar(async () => ({ data: [fila({})], error: null }))
    chk('rpc: llama a items_de_factura_pendiente con p_factura_id', llamadas.length === 1 && llamadas[0][0] === 'items_de_factura_pendiente' && llamadas[0][1].p_factura_id === 'f9', JSON.stringify(llamadas))
    const cant = mapa.get('f9')
    const html = S.htmlFilaSinImporte(m, { cantidades: cant, puedeCargar: true, form: form({}) })
    chk('un producto: muestra la mercadería con marca y bultos', html.includes('2.000 kg de Harina 000 (Jupiter) · 80 bultos de 25 kg'), html)
    chk('un producto: ofrece precio por unidad', html.includes('value="unidad"') && html.includes('Precio por kg'))
    chk('un producto: sin aviso de permiso ni de error', !html.includes('permiso') && !html.includes('No se pudieron'))
    S.estado.ficha = { proveedorId: 'p', unidadId: 'u1', cantidadesSinImporte: mapa, movimientosRaw: [m], formImporte: form({ modo: 'unidad', importe: '1.234,50' }) }
    S.__setRpc(async () => ({ data: null, error: null }))
    const n0 = S.__llamadas.rpc.length
    await S.confirmarImporteSinImporte('f9')
    const ult = S.__llamadas.rpc.slice(n0).find(l => l[0] === 'completar_importe_factura')
    chk('un producto: 2.000 kg x "1.234,50" manda p_importe = 2469000 exacto', ult && ult[1].p_importe === 2469000 && ult[1].p_factura_id === 'f9', JSON.stringify(ult))
  }
  // VARIOS productos: solo total.
  {
    const { mapa } = await cargar(async () => ({ data: [fila({}), fila({ insumo: 'Azúcar', marca: null, cantidad: 50, cantidad_bultos: null, contenido_por_bulto: null })], error: null }))
    const html = S.htmlFilaSinImporte(m, { cantidades: mapa.get('f9'), puedeCargar: true, form: form({}) })
    chk('varios: NO ofrece precio por unidad', !html.includes('value="unidad"') && html.includes('Son varios productos'), html)
    chk('varios: muestra los dos productos', html.includes('Harina 000') && html.includes('50 kg de Azúcar'))
    chk('varios: el modo unidad no da total', S.totalImporteFormulario(form({ modo: 'unidad', importe: '10' }), mapa.get('f9')) === null)
  }
  // ERROR de la RPC: solo total + aviso honesto, sin trabar.
  {
    const { mapa } = await cargar(async () => ({ data: null, error: { message: 'boom' } }))
    chk('error: la descarga queda marcada como fallida (null)', mapa.has('f9') && mapa.get('f9') === null)
    const html = S.htmlFilaSinImporte(m, { cantidades: mapa.get('f9'), puedeCargar: true, form: form({}) })
    chk('error: avisa que no se pudieron traer y que se puede cargar el total', html.includes('No se pudieron traer los productos') && html.includes('cargar el total'))
    chk('error: no ofrece precio por unidad pero sí el campo y Guardar', !html.includes('value="unidad"') && html.includes('campo-importe-sin') && html.includes('btn-confirmar-importe'))
    const { mapa: m2 } = await cargar(async () => { throw new Error('red') })
    chk('error: una excepción de red también degrada a null', m2.get('f9') === null)
  }
  // VACÍO.
  {
    const { mapa } = await cargar(async () => ({ data: [], error: null }))
    const html = S.htmlFilaSinImporte(m, { cantidades: mapa.get('f9'), puedeCargar: true, form: form({}) })
    chk('vacío: lo dice y deja cargar el total', html.includes('No se encontraron los productos') && !html.includes('value="unidad"') && html.includes('campo-importe-sin'))
    chk('vacío: nada de $0 ni NaN', sinCeroNiNaN(html))
  }
  // SIN PERMISO: ni se llama a la RPC.
  {
    const { mapa, llamadas } = await cargar(async () => ({ data: [fila({})], error: null }), [])
    chk('sin ver_todo ni registrar_pago no se llama a la RPC', llamadas.length === 0 && mapa.size === 0)
    const { llamadas: l2 } = await cargar(async () => ({ data: [], error: null }), ['cuentas_corrientes:ver_todo'])
    chk('con solo ver_todo sí se llama (lo acepta la RPC)', l2.length === 1)
  }
  // TEXTO MALICIOSO en insumo / marca / unidad.
  {
    const { mapa } = await cargar(async () => ({ data: [fila({ insumo: marca('rpc_insumo'), marca: marca('rpc_marca'), unidad_medida: marca('rpc_unidad') })], error: null }))
    const html = S.htmlFilaSinImporte(m, { cantidades: mapa.get('f9'), puedeCargar: true, form: form({}) })
    chequearMarcas(chk, 'htmlFilaSinImporte (datos de la RPC)', html, ['rpc_insumo', 'rpc_marca', 'rpc_unidad'])
  }
}

// Corre DESPUÉS de los bloques síncronos (ver el final): comparte
// estado.ficha con ellos, y arrancarla acá los haría pisarse mientras espera.
const ramaAsync = async () => {
  // Confirmar: el total va a completar_importe_factura y el error se muestra tal cual.
  S.estado.ficha = { proveedorId: 'p', unidadId: 'u1', cantidadesSinImporte: new Map([['f1', [{ cantidad: 250 }]]]),
    formImporte: { facturaId: 'f1', modo: 'unidad', importe: 100, error: null, enCurso: false }, movimientosRaw: [] }
  S.__setRpc(async () => ({ data: null, error: { message: 'Este movimiento ya tiene importe.' } }))
  await S.confirmarImporteSinImporte('f1')
  const ult = S.__llamadas.rpc.at(-1)
  chk('cargar importe: llama a completar_importe_factura con el TOTAL', ult?.[0] === 'completar_importe_factura' && ult[1].p_factura_id === 'f1' && ult[1].p_importe === 25000, JSON.stringify(ult))
  chk('cargar importe: el error de la RPC queda tal cual', S.estado.ficha.formImporte.error === 'Este movimiento ya tiene importe.')
  S.estado.ficha.formImporte = { facturaId: 'f1', modo: 'total', importe: null, error: null, enCurso: false }
  const antes = S.__llamadas.rpc.length
  await S.confirmarImporteSinImporte('f1')
  chk('cargar importe: sin importe válido no llama a la RPC', S.__llamadas.rpc.length === antes && !!S.estado.ficha.formImporte.error)
  S.estado.ficha.formImporte = { facturaId: 'f1', modo: 'total', importe: 5000, error: null, enCurso: false }
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
  const cc = extraerFn(FUENTE, 'cargarCantidadesSinImporte')
  chk('mercadería: sale de la RPC items_de_factura_pendiente', /supabase\.rpc\('items_de_factura_pendiente', \{ p_factura_id: id \}\)/.test(cc))
  chk('mercadería: el archivo ya no lee materia_prima_ingresos ni materia_prima_items', !/from\('materia_prima_ingresos'\)|from\('materia_prima_items'\)|materia_prima_items\(/.test(FUENTE))
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

esperas.push(ramaAsync().then(ramaRpcItems))
fin()
