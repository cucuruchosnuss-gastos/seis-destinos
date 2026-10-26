// Producto terminado desde el Ingreso de materia prima (26/10/2026, rama
// ci-prueba/ingreso-terminado-desde-mp). Rodrigo Arrascaeta trae 44 cajas de
// Capelina Grande y no había cómo cargarlas en Ingreso. Lo que se prueba, con
// las funciones REALES de modulos/materia-prima.html y de
// js/ingreso-terminado.js (las de la gestión de Producción) y una base falsa:
//  - qué se ofrece: los productos terminados del proveedor (origen_proveedor_id)
//    en la fábrica que recibe, con presentación activa; el buscador y el papel
//    también los encuentran; nada al completar un ingreso ni ya grabado;
//  - el renglón: presentación (sola si hay una), cajas, "Último lote: X.
//    ¿Sigue siendo este?" (Sí / No, es otro, en mayúsculas, 40 como mucho), el
//    cono solo con cono y el remito (el número del remito, si lo es);
//  - lo que falta, en castellano, antes de seguir;
//  - los parámetros EXACTOS de ingresar_producto_terminado;
//  - al confirmar: solo producto terminado = una RPC y ningún insert; con
//    insumos, PRIMERO el producto terminado y después los insumos (se graban
//    por separado y el resumen muestra las dos partes); el error de la base
//    tal cual; el reintento con el MISMO p_client_uuid; si fallan los insumos
//    el producto terminado no se vuelve a mandar; dos toques no mandan dos.
//
//   node pruebas/test-materia-prima-terminado.js
//   ARCHIVO_TEST=<copia de modulos/materia-prima.html>   ARCHIVO_JS_INGRESO_TERMINADO=<copia del común>
'use strict'

const path = require('path')
const { construirCon } = require('./sandbox')
const { arnes, leer } = require('./circuito-comun')
const { fuenteNumeros } = require('./numeros-comun')
const DATOS = require('./datos-maqueta/ingreso-terminado-mp')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos', 'materia-prima.html')
leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

const PRELUDIO = `
  var console = { log(){}, warn(){}, error(){} }
  ${fuenteNumeros()}
  // ── El DOM falso: guarda lo que se le escribe ──────────────────────────
  var __els = new Map()
  function __el(id) {
    if (!__els.has(id)) __els.set(id, { id, innerHTML: '', textContent: '', hidden: true, disabled: false, value: '',
      querySelector: () => null, querySelectorAll: () => [], contains: () => false, scrollIntoView() {}, addEventListener() {} })
    return __els.get(id)
  }
  var document = { getElementById: __el, querySelector: () => null, querySelectorAll: () => [], activeElement: null }
  var window = { scrollTo() {} }
  // ── La base falsa: anota cada rpc, consulta e insert ───────────────────
  var __tablas = {}
  var __log = []
  var __rpc = () => ({ data: { ingreso_id: 'ing-pt-1', renglones: 1, cajas: 44, importe: 0 }, error: null })
  var __errorItems = null
  function __consulta(tabla) {
    const filtros = []
    const q = {
      _tabla: tabla, _select: '',
      select(c) { q._select = c ?? ''; return q }, order() { return q },
      eq(a, b) { filtros.push(r => r[a] === b); return q }, in(a, b) { filtros.push(r => b.includes(r[a])); return q },
      single() { q._uno = true; return q }, maybeSingle() { q._uno = true; return q },
      insert(filas) { __log.push(['insert', tabla, filas]); q._insert = filas; return q },
      delete() { __log.push(['delete', tabla]); q._borrar = true; return q },
      then(res, rej) {
        if (q._insert !== undefined) {
          if (tabla === 'materia_prima_items' && __errorItems) return Promise.resolve({ data: null, error: __errorItems }).then(res, rej)
          return Promise.resolve({ data: q._uno ? { id: 'mp-1' } : null, error: null }).then(res, rej)
        }
        if (q._borrar) return Promise.resolve({ data: null, error: null }).then(res, rej)
        __log.push(['select', tabla, q._select])
        const filas = (__tablas[tabla] ?? []).filter(r => filtros.every(f => f(r)))
        return Promise.resolve({ data: filas, error: null }).then(res, rej)
      },
    }
    return q
  }
  var supabase = {
    from: __consulta,
    rpc(n, p) { __log.push(['rpc', n, p]); return new Promise(r => setTimeout(() => r(__rpc(n, p)), 0)) },
  }
  // ── Lo de alrededor, de mentira (no es lo que se prueba acá) ───────────
  var __exitos = [], __errores = [], __renderItems = 0, __pasos = [], __cerrado = 0, __validarItems = true
  function mostrarExito(m) { __exitos.push(m) }
  function mostrarError(m) { __errores.push(m) }
  function renderizarItems() { __renderItems++ }
  function irAPasoWz(p) { __pasos.push(p); if (estado.wizard) estado.wizard.paso = p }
  function validarItems() { return __validarItems }
  function validarCircuitoAntesDeGuardar() { return null }
  function datosParaCircuito() { return {} }
  async function crearInsumosNuevos() { return new Map() }
  async function crearProveedorSiHaceFalta() { return { id: estado.wizard?.proveedorId ?? null, aviso: null } }
  function filasItemParaBase(item, ingresoId) { return [{ ingreso_id: ingresoId, insumo_id: item.insumoId }] }
  function mensajeErrorItems(e) { return e.message }
  async function guardarAliasNuevos() { return null }
  async function pasarAlCircuito() { return null }
  function cerrarWizard() { __cerrado++; estado.wizard = null }
  async function cargarIngresos() {}
  async function cargarPagadoSinIngresar() {}
  function buscarEntrega() { return null }
  async function abrirDetalleIngreso() {}
  async function confirmarCompletarIngreso() {}
  function ingresoNoSumaStock() { return false }
  function textoCantidad(i) { return '10 un' }
  function nombreUnidad(id) { return ({ 'u-n': 'Cucuruchos Nuss', 'u-d': 'Dolce Pasta' })[id] ?? '' }
  var estado = { wizard: null, catalogoInsumos: [], resumenGuardado: null }
`

const FUNCIONES = [
  'esc', 'normalizarBusquedaCat', 'buscarCatalogo', 'htmlSugerenciasCatalogo', 'wizardVacio', 'llevaCircuito', 'avisoGuardado',
  'ofrecerTerminados', 'terminadosCargables', 'terminadosDelProveedor', 'buscarTerminados', 'terminadosParecidos',
  'productoTerminadoDe', 'htmlSugerenciaTerminado', 'asegurarCatalogoTerminado', 'nuevoRenglonTerminado', 'agregarTerminado',
  'pasarATerminado', 'ingresoTerminado', 'remitoTerminado', 'soloTerminado', 'faltaTerminado', 'validarTerminados',
  'guardarTerminado', 'cajasTerminado', 'textoCajas', 'textoCuentaTerminado', 'textoGuardado', 'resumenGuardado',
  'htmlResumenGuardado', 'mostrarResumenGuardado', 'avisoSoloTerminado', 'htmlConfirmacionTerminados', 'pintarTerminados',
  'htmlTerminados', 'htmlTerminadoGrabado', 'htmlRenglonTerminado', 'htmlLoteTerminado', 'renglonTerminado',
  'alEscribirTerminado', 'alCambiarTerminado', 'contestarLoteTerminado', 'alTocarTerminado', 'continuarDesdeItems',
  'confirmarIngreso',
  // De js/ingreso-terminado.js (por el import: el código REAL de la gestión).
  'normalizarLoteIngreso', 'modoLoteIngreso', 'loteDeRenglon', 'origenParaBase', 'presentacionDe', 'itemsParaBase',
  'faltaIngreso', 'parametrosIngreso', 'leerCatalogoIngresoTerminado',
]

function sandbox() {
  return construirCon(ARCHIVO, {
    preludio: PRELUDIO, funciones: FUNCIONES, constantes: ['LARGO_MAXIMO_LOTE', 'ORIGENES_INGRESO', 'TIPOS_CON_CIRCUITO'],
    retorno: `estado, __el, __log, __exitos, __errores, __pasos, __cerrado: () => __cerrado, __renders: () => __renderItems,
      __setTablas(t){ __tablas = t }, __setRpc(f){ __rpc = f }, __setErrorItems(e){ __errorItems = e }, __setValidarItems(v){ __validarItems = v }`,
  })
}

const esperar = () => new Promise(r => setTimeout(r, 5))
const RODRIGO = 'prov-rodrigo'

// Un wizard en el paso Ítems, de Rodrigo a Cucuruchos Nuss, con el catálogo leído.
async function armar({ tipoDoc = 'remito', numeroDoc = '0001-00000123', proveedorId = RODRIGO, unidadId = 'u-n' } = {}) {
  const S = sandbox()
  S.__setTablas(JSON.parse(JSON.stringify(DATOS.tablas)))
  const w = S.wizardVacio()
  Object.assign(w.encabezado, { tipoDoc, numeroDoc, fecha: '2026-10-26', unidadId, razonSocial: '' })
  w.proveedorId = proveedorId
  w.proveedorMatch = proveedorId ? { id: proveedorId, razon_social: 'RODRIGO ARRASCAETA' } : null
  w.paso = 'items'
  S.estado.wizard = w
  await S.asegurarCatalogoTerminado()
  return { S, w }
}

const ids = (lista) => lista.map(p => p.id).join(',')
// Un <input> falso para los listeners delegados.
function campo(renglonId, ptCampo, value) {
  return {
    dataset: { ptCampo }, value, readOnly: false, selectionStart: 0, selectionEnd: 0, setSelectionRange() {},
    closest: (s) => s === '[data-pt-renglon]' && renglonId ? { dataset: { ptRenglon: renglonId } } : null,
  }
}
function boton(renglonId, dataset) {
  const b = { dataset, closest: (s) => s === 'button' ? b : (s === '[data-pt-renglon]' && renglonId ? { dataset: { ptRenglon: renglonId } } : null) }
  return { target: b }
}

// ═══ 1. Qué se ofrece ═══════════════════════════════════════════════════
esperas.push((async () => {
  const { S, w } = await armar()
  const lectura = S.__log.find(l => l[0] === 'select' && l[1] === 'productos_terminados')
  chk('el catálogo pide de qué proveedor viene cada producto', /origen_proveedor_id/.test(lectura?.[2] ?? ''), lectura?.[2])
  chk('el catálogo es el de la fábrica que recibe', ids(w.terminadoCat.cat.productos) === 'pt-capelina,pt-cono,pt-viejo', ids(w.terminadoCat.cat.productos))
  chk('los lotes vigentes son los de la fábrica que recibe', [...w.terminadoCat.cat.vigentes.keys()].join() === 'pt-capelina')
  chk('Rodrigo ofrece SOLO la Capelina Grande (la Chica no tiene presentación activa; el Cono no es suyo)', ids(S.terminadosDelProveedor(w)) === 'pt-capelina', ids(S.terminadosDelProveedor(w)))
  const html = S.htmlTerminados(w)
  chk('la oferta nombra al proveedor y al producto', html.includes('RODRIGO ARRASCAETA</strong> también trae producto terminado') && html.includes('data-pt-agregar="pt-capelina"'))
  chk('la oferta no muestra la Capelina Chica', !html.includes('pt-viejo'))
  w.proveedorId = 'prov-molino'
  chk('otro proveedor no ofrece nada', S.terminadosDelProveedor(w).length === 0 && S.htmlTerminados(w) === '')
  w.proveedorId = null
  chk('sin proveedor no se ofrece nada', S.terminadosDelProveedor(w).length === 0)
  w.proveedorId = RODRIGO
  // El buscador y el papel.
  chk('el buscador encuentra "CAPELÍNA" (sin acentos ni mayúsculas)', ids(S.buscarTerminados(w, 'CAPELÍNA')) === 'pt-capelina', ids(S.buscarTerminados(w, 'CAPELÍNA')))
  chk('el buscador con nada no devuelve nada', S.buscarTerminados(w, '  ').length === 0)
  chk('el buscador encuentra también lo que no es del proveedor (el Cono)', ids(S.buscarTerminados(w, 'cono')) === 'pt-cono')
  chk('el papel que nombra el producto entero lo propone', ids(S.terminadosParecidos(w, 'CAPELINA GRANDE X 44 CAJAS')) === 'pt-capelina')
  chk('el papel con medio nombre no propone nada', S.terminadosParecidos(w, 'CAPELINA').length === 0)
  const sug = S.htmlSugerenciasCatalogo('capel')
  chk('las sugerencias del catálogo traen el producto terminado, marcado', sug.includes('data-terminado="pt-capelina"') && sug.includes('<span class="chip-terminado">Producto terminado</span>'))
  chk('con un producto terminado no dice "Nada en el catálogo"', !sug.includes('Nada en el catálogo'))
  chk('sin nada, dice "Nada en el catálogo"', S.htmlSugerenciasCatalogo('zzz').includes('Nada en el catálogo'))
  S.estado.catalogoInsumos = DATOS.tablas.insumos
  const harina = S.htmlSugerenciasCatalogo('harina')
  chk('buscar un insumo trae el insumo y ningún producto terminado', harina.includes('data-insumo="ins-harina"') && !harina.includes('data-terminado'))
  // Nada al completar un ingreso existente, ni ya grabado.
  w.completar = { ingresoId: 'x' }
  chk('al completar un ingreso existente no se ofrece', S.terminadosDelProveedor(w).length === 0 && S.buscarTerminados(w, 'capel').length === 0 && S.htmlTerminados(w) === '')
  w.completar = null
  w.terminadoRes = { cajas: 1 }
  chk('ya grabado no se ofrece más', S.buscarTerminados(w, 'capel').length === 0)
  chk('ya grabado se muestra y no se edita', S.htmlTerminados(w).includes('Ya quedó cargado') && !S.htmlTerminados(w).includes('data-pt-campo'))
})())

// Otra fábrica: el catálogo es el suyo, y lo cargado de la anterior se va.
esperas.push((async () => {
  const { S, w } = await armar()
  S.agregarTerminado('pt-capelina')
  chk('un producto de la fábrica se agrega', w.terminados.length === 1)
  chk('un producto de otra fábrica no se agrega', S.agregarTerminado('pt-d-capelina') === null && w.terminados.length === 1)
  chk('un producto sin presentación activa no se agrega', S.agregarTerminado('pt-viejo') === null)
  w.encabezado.unidadId = 'u-d'
  await S.asegurarCatalogoTerminado()
  chk('al cambiar la fábrica se saca lo de la otra', w.terminados.length === 0)
  chk('y se lee el catálogo de la nueva', ids(w.terminadoCat.cat.productos) === 'pt-d-capelina' && w.terminadoCat.cat.vigentes.get('pt-d-capelina') === 'D-999')
  const lecturas = S.__log.filter(l => l[0] === 'select' && l[1] === 'productos_terminados').length
  await S.asegurarCatalogoTerminado()
  chk('la misma fábrica no se vuelve a leer', S.__log.filter(l => l[0] === 'select' && l[1] === 'productos_terminados').length === lecturas)
})())

// ═══ 2. El renglón y lo que falta ═══════════════════════════════════════
esperas.push((async () => {
  const { S, w } = await armar()
  const r = S.agregarTerminado('pt-capelina')
  chk('con una sola presentación viene elegida', r.presentacionId === 'pr-capelina-caja')
  chk('trae el lote vigente para preguntar', r.loteVigente === '310476' && r.loteResp === '' && r.lote === '')
  const html = S.htmlTerminados(w)
  chk('el renglón dice "Producto terminado"', html.includes('<span class="chip-terminado">Producto terminado</span>'))
  chk('la pregunta del lote, como en la gestión', html.includes('Último lote: <strong>310476</strong>. ¿Sigue siendo este?') && html.includes('data-pt-lote="si"') && html.includes('data-pt-lote="otro"'))
  chk('sin contestar no hay campo de lote', !html.includes('data-pt-campo="lote"'))
  chk('el remito propone el número del remito', html.includes('value="0001-00000123"'))
  chk('sin cono no hay campo de cono', !html.includes('data-pt-campo="marcaId"'))

  chk('falta: las cajas', S.faltaTerminado(w) === 'Renglón 1: las cajas tienen que ser un número entero mayor que cero.', S.faltaTerminado(w))
  r.cajas = 4.5
  chk('falta: cajas enteras', S.faltaTerminado(w) === 'Renglón 1: las cajas tienen que ser un número entero mayor que cero.')
  S.alEscribirTerminado({ target: campo(r.id, 'cajas', '44') })
  chk('las cajas se leen del campo', r.cajas === 44, r.cajas)
  chk('falta: contestar el lote', S.faltaTerminado(w) === 'Renglón 1: contestá si el lote sigue siendo 310476.', S.faltaTerminado(w))
  chk('validarTerminados lo dice en la sección y en el aviso', S.validarTerminados() === false && w.terminadoError === 'Renglón 1: contestá si el lote sigue siendo 310476.' && S.__errores.at(-1) === 'Producto terminado: Renglón 1: contestá si el lote sigue siendo 310476.')

  S.alTocarTerminado(boton(r.id, { ptLote: 'si' }))
  chk('Sí: el lote es el vigente', r.loteResp === 'si' && r.lote === '310476' && w.terminadoError === '')
  const conSi = S.htmlTerminados(w)
  chk('Sí: el campo con el vigente, de solo lectura', /data-pt-campo="lote"[^>]*value="310476"[^>]* readonly aria-readonly="true"/.test(conSi))
  chk('Sí: el botón marcado', /data-pt-lote="si" aria-pressed="true"/.test(conSi))
  chk('Sí: ya no falta nada', S.faltaTerminado(w) === null && S.validarTerminados() === true)
  S.alEscribirTerminado({ target: Object.assign(campo(r.id, 'lote', 'OTRO'), { readOnly: true }) })
  chk('Sí: lo escrito en el campo de solo lectura no cambia nada', r.lote === '310476')

  S.alTocarTerminado(boton(r.id, { ptLote: 'otro' }))
  chk('"No, es otro": el campo vacío', r.loteResp === 'otro' && r.lote === '')
  const conOtro = S.htmlTerminados(w)
  chk('"No, es otro": obligatorio y con tope de 40', /data-pt-campo="lote"[^>]*maxlength="40"[^>]*value=""[^>]*placeholder="Escribí el lote" required aria-required="true"/.test(conOtro))
  chk('"No, es otro": falta escribirlo', S.faltaTerminado(w) === 'Renglón 1: escribí el lote.')
  const input = campo(r.id, 'lote', 'l-2610')
  S.alEscribirTerminado({ target: input })
  chk('el lote pasa a mayúsculas mientras se escribe', input.value === 'L-2610' && r.lote === 'L-2610')
  r.lote = 'x'.repeat(41)
  chk('más de 40 no', S.faltaTerminado(w) === 'Renglón 1: el lote puede tener 40 caracteres como mucho.')
  r.lote = '  l-1 '
  chk('viaja sin espacios en los bordes y en mayúsculas', S.parametrosIngreso(S.ingresoTerminado(w), w.terminadoCat.cat).p_items[0].lote === 'L-1')
  S.contestarLoteTerminado(w, r, 'cualquiera')
  chk('una respuesta que no es Sí ni "No, es otro" no cambia nada', r.loteResp === 'otro')

  // Sin vigente: el campo obligatorio de entrada, sin pregunta.
  const r2 = S.agregarTerminado('pt-cono')
  chk('con dos presentaciones no se elige ninguna', r2.presentacionId === '')
  chk('sin vigente no hay pregunta: el campo obligatorio', S.modoLoteIngreso(r2, S.ingresoTerminado(w)) === 'otro' && !S.htmlRenglonTerminado(w, r2).includes('¿Sigue siendo este?'))
  S.contestarLoteTerminado(w, r2, 'si')
  chk('sin vigente, "Sí" no hace nada', r2.loteResp === '')
  chk('falta: la presentación (renglón 2)', S.faltaTerminado(w) === 'Renglón 2: elegí el producto y la presentación.', S.faltaTerminado(w))
  S.alCambiarTerminado({ target: Object.assign(campo(r2.id, 'presentacionId', 'pr-cono-marca'), {}) })
  chk('la presentación con cono pide el cono', S.htmlRenglonTerminado(w, r2).includes('data-pt-campo="marcaId"'))
  Object.assign(r2, { cajas: 2, lote: 'C-1' })
  chk('falta: el cono', S.faltaTerminado(w) === 'Renglón 2: elegí el cono (si es común, elegí la presentación sin cono).', S.faltaTerminado(w))
  S.alCambiarTerminado({ target: campo(r2.id, 'marcaId', 'm-lolo') })
  chk('con el cono ya no falta', S.faltaTerminado(w) === null)
  S.alCambiarTerminado({ target: campo(r2.id, 'presentacionId', 'pr-cono-comun') })
  chk('pasar a una sin cono suelta el cono', r2.marcaId === '')
  S.alTocarTerminado(boton(null, { ptQuitar: r2.id }))
  chk('Quitar saca el renglón', w.terminados.length === 1 && w.terminados[0].id === r.id)
  S.alTocarTerminado(boton(null, { ptAgregar: 'pt-capelina' }))
  chk('tocar la oferta agrega un renglón', w.terminados.length === 2 && w.terminados[1].productoId === 'pt-capelina')
})())

// Sin proveedor del padrón no se puede (la base pide su id).
esperas.push((async () => {
  const { S, w } = await armar({ proveedorId: null })
  w.terminadoCat = (await armar()).w.terminadoCat
  w.terminados.push(S.nuevoRenglonTerminado(w, 'pt-capelina', 44))
  chk('sin proveedor: lo dice', S.faltaTerminado(w) === 'El producto terminado tiene que venir de un proveedor del padrón: volvé a «Datos» y elegilo en el buscador.', S.faltaTerminado(w))
})())

// Un renglón del papel que es producto terminado.
esperas.push((async () => {
  const { S, w } = await armar()
  w.items = [{ uid: 'it1', numeroPapel: 44 }, { uid: 'it2', numeroPapel: 7 }]
  w.itemAbierto = 'it1'
  const antes = S.__renders()
  S.pasarATerminado(w.items[0], 'pt-capelina')
  chk('sale de los insumos', w.items.map(i => i.uid).join() === 'it2' && w.itemAbierto === null && S.__renders() > antes)
  chk('es un renglón de producto terminado, con el número del papel como cajas', w.terminados.length === 1 && w.terminados[0].cajas === 44)
  S.pasarATerminado(Object.assign(w.items[0], { numeroPapel: 4.5 }), 'pt-capelina')
  chk('un número con decimales no se toma como cajas', w.terminados[1].cajas === null && w.items.length === 0)
  w.items = [{ uid: 'it3', numeroPapel: 1 }]
  S.pasarATerminado(w.items[0], 'pt-d-capelina')
  chk('un producto de otra fábrica no saca el renglón', w.items.length === 1)
})())

// ═══ 3. Los parámetros exactos ══════════════════════════════════════════
esperas.push((async () => {
  const { S, w } = await armar()
  const r = S.agregarTerminado('pt-capelina')
  Object.assign(r, { cajas: 44, loteResp: 'si', lote: '310476' })
  const p = S.parametrosIngreso(S.ingresoTerminado(w), w.terminadoCat.cat)
  chk('los parámetros de ingresar_producto_terminado', JSON.stringify(p) === JSON.stringify({
    p_unidad_negocio_id: 'u-n', p_fecha: '2026-10-26', p_proveedor_id: RODRIGO, p_unidad_origen_id: null, p_remito: '0001-00000123',
    p_items: [{ presentacion_id: 'pr-capelina-caja', marca_id: null, cajas: 44, lote: '310476', precio_caja: null }],
    p_observaciones: null, p_client_uuid: w.terminadoUuid,
  }), JSON.stringify(p))
  chk('el p_client_uuid es un uuid', /^[0-9a-f-]{36}$/.test(w.terminadoUuid))
  r.lote = 'LO-QUE-QUEDÓ'
  chk('con Sí viaja el vigente, aunque haya quedado otra cosa escrita', S.parametrosIngreso(S.ingresoTerminado(w), w.terminadoCat.cat).p_items[0].lote === '310476')
  r.lote = '310476'
  chk('las cajas viajan como número', S.parametrosIngreso(S.ingresoTerminado(w), w.terminadoCat.cat).p_items[0].cajas === 44)
  r.marcaId = 'm-lolo'
  chk('un cono no viaja en una presentación sin cono', S.parametrosIngreso(S.ingresoTerminado(w), w.terminadoCat.cat).p_items[0].marca_id === null)
  r.marcaId = ''
  w.terminadoRemito = ' R-9 '
  chk('el remito escrito manda (recortado)', S.parametrosIngreso(S.ingresoTerminado(w), w.terminadoCat.cat).p_remito === 'R-9')
  w.terminadoRemito = ''
  chk('el remito borrado no viaja', S.parametrosIngreso(S.ingresoTerminado(w), w.terminadoCat.cat).p_remito === null)
  S.alEscribirTerminado({ target: campo(null, 'remito', 'R-10') })
  chk('el remito se lee del campo', w.terminadoRemito === 'R-10')
  const fa = await armar({ tipoDoc: 'factura_a', numeroDoc: '0003-00000001' })
  chk('de una factura no se propone su número como remito', fa.S.remitoTerminado(fa.w) === '')
})())

// ═══ 4. Seguir y confirmar ══════════════════════════════════════════════
esperas.push((async () => {
  const { S, w } = await armar()
  S.continuarDesdeItems()
  chk('sin nada: "Agregá al menos un ítem."', S.__errores.at(-1) === 'Agregá al menos un ítem.' && !S.__pasos.includes('confirmar'))
  const r = S.agregarTerminado('pt-capelina')
  S.continuarDesdeItems()
  chk('con lo que falta no sigue', !S.__pasos.includes('confirmar') && w.terminadoError !== '')
  Object.assign(r, { cajas: 44, loteResp: 'si', lote: '310476' })
  S.continuarDesdeItems()
  chk('solo producto terminado, completo: sigue a confirmar', S.__pasos.at(-1) === 'confirmar')
  const conf = S.htmlConfirmacionTerminados(w)
  chk('la confirmación muestra el producto, las cajas, el lote y el remito', conf.includes('Capelina Grande') && conf.includes('44 cajas') && conf.includes('310476') && conf.includes('0001-00000123'))
  chk('la cuenta del resumen', S.textoCuentaTerminado(w) === '1 producto · 44 cajas')
  chk('solo producto terminado: el aviso', S.soloTerminado(w) && S.avisoSoloTerminado(w).startsWith('Es solo producto terminado: entra al stock terminado de Cucuruchos Nuss'))
})())

// Solo producto terminado: una RPC, ningún insert, el resumen.
esperas.push((async () => {
  const { S, w } = await armar()
  Object.assign(S.agregarTerminado('pt-capelina'), { cajas: 44, loteResp: 'si', lote: '310476' })
  const uuid = w.terminadoUuid
  await S.confirmarIngreso()
  const rpcs = S.__log.filter(l => l[0] === 'rpc')
  chk('una sola llamada a ingresar_producto_terminado', rpcs.length === 1 && rpcs[0][1] === 'ingresar_producto_terminado' && rpcs[0][2].p_client_uuid === uuid)
  chk('ningún insert de materia prima', !S.__log.some(l => l[0] === 'insert'))
  chk('el aviso: las cajas de producto terminado', S.__exitos.at(-1) === 'Ingreso cargado: 44 cajas de producto terminado.', S.__exitos.at(-1))
  chk('se cierra el wizard', S.__cerrado() === 1 && S.estado.wizard === null)
  const cartel = S.__el('mp-resumen-guardado')
  chk('el cartel del listado, con el producto terminado', cartel.hidden === false && cartel.innerHTML.includes('Capelina Grande (Caja) · 44 cajas · lote 310476') && !cartel.innerHTML.includes('Insumos y materia prima'))
  const btn = S.__el('btn-confirmar-ingreso')
  chk('el botón vuelve a quedar listo', btn.disabled === false && btn.textContent === 'Confirmar ingreso')
})())

// Con insumos: primero el producto terminado, después los insumos.
esperas.push((async () => {
  const { S, w } = await armar()
  Object.assign(S.agregarTerminado('pt-capelina'), { cajas: 44, loteResp: 'otro', lote: 'L-2610' })
  w.items = [{ uid: 'it1', insumoId: 'ins-caja', nombre: 'Caja corrugada', esNuevo: false }]
  await S.confirmarIngreso()
  const orden = S.__log.filter(l => l[0] === 'rpc' || l[0] === 'insert').map(l => l[1])
  chk('primero el producto terminado, después los insumos', orden.join() === 'ingresar_producto_terminado,materia_prima_ingresos,materia_prima_items', orden.join())
  const items = S.__log.find(l => l[0] === 'insert' && l[1] === 'materia_prima_items')[2]
  chk('los insumos no llevan el producto terminado', items.length === 1 && items[0].insumo_id === 'ins-caja')
  chk('el producto terminado viaja con su lote', S.__log.find(l => l[1] === 'ingresar_producto_terminado')[2].p_items[0].lote === 'L-2610')
  chk('el aviso con las dos partes', S.__exitos.at(-1) === 'Ingreso cargado: 1 insumo y 44 cajas de producto terminado.', S.__exitos.at(-1))
  const cartel = S.__el('mp-resumen-guardado').innerHTML
  chk('el cartel con las dos partes', cartel.includes('Insumos y materia prima') && cartel.includes('Caja corrugada · 10 un') && cartel.includes('Producto terminado · stock de Cucuruchos Nuss') && cartel.includes('lote L-2610'))
})())

// Solo insumos: todo como siempre.
esperas.push((async () => {
  const { S, w } = await armar()
  w.items = [{ uid: 'it1', insumoId: 'ins-caja', nombre: 'Caja corrugada', esNuevo: false }]
  await S.confirmarIngreso()
  chk('solo insumos: ninguna llamada de producto terminado', !S.__log.some(l => l[1] === 'ingresar_producto_terminado'))
  chk('solo insumos: el aviso de siempre y sin cartel', S.__exitos.at(-1) === 'Ingreso cargado.' && S.__el('mp-resumen-guardado').hidden === true)
})())

// El error de la base tal cual; el reintento con el mismo uuid; la conexión.
esperas.push((async () => {
  const { S, w } = await armar()
  Object.assign(S.agregarTerminado('pt-capelina'), { cajas: 44, loteResp: 'si', lote: '310476' })
  w.items = [{ uid: 'it1', insumoId: 'ins-caja', nombre: 'Caja corrugada', esNuevo: false }]
  S.__setRpc(() => ({ data: null, error: { message: 'No tenés permiso para ingresar mercadería en esta fábrica.' } }))
  await S.confirmarIngreso()
  chk('el error de la base, tal cual', S.__el('wz-error-guardado').textContent === 'No tenés permiso para ingresar mercadería en esta fábrica.' && S.__el('wz-error-guardado').hidden === false)
  chk('si falla el producto terminado no se graba nada', !S.__log.some(l => l[0] === 'insert') && S.__cerrado() === 0 && w.terminadoRes === null)
  chk('y se puede reintentar', w.guardando === false && S.__el('btn-confirmar-ingreso').disabled === false)
  S.__setRpc(() => ({ data: null, error: { message: 'TypeError: Failed to fetch' } }))
  await S.confirmarIngreso()
  chk('sin conexión: el aviso de la conexión', S.__el('wz-error-guardado').textContent === 'No se pudo guardar el producto terminado: revisá la conexión y tocá «Confirmar ingreso» de nuevo (no se carga dos veces).', S.__el('wz-error-guardado').textContent)
  S.__setRpc(() => ({ data: { ingreso_id: 'ing-pt-1', renglones: 1, cajas: 44, importe: 0 }, error: null }))
  await S.confirmarIngreso()
  const uuids = S.__log.filter(l => l[1] === 'ingresar_producto_terminado').map(l => l[2].p_client_uuid)
  chk('tres intentos con el MISMO p_client_uuid', uuids.length === 3 && new Set(uuids).size === 1)
  chk('el tercero graba todo', S.__log.some(l => l[0] === 'insert' && l[1] === 'materia_prima_items') && S.__cerrado() === 1)
})())

// Si fallan los insumos, el producto terminado ya quedó y no se vuelve a mandar.
esperas.push((async () => {
  const { S, w } = await armar()
  Object.assign(S.agregarTerminado('pt-capelina'), { cajas: 44, loteResp: 'si', lote: '310476' })
  w.items = [{ uid: 'it1', insumoId: 'ins-caja', nombre: 'Caja corrugada', esNuevo: false }]
  S.__setErrorItems({ message: 'No se pudieron guardar los ítems.' })
  await S.confirmarIngreso()
  chk('fallan los insumos: se borra la cabecera de materia prima', S.__log.some(l => l[0] === 'delete' && l[1] === 'materia_prima_ingresos'))
  chk('y se dice que el producto terminado sí quedó', S.__el('wz-error-guardado').textContent.includes('El producto terminado sí quedó cargado: al reintentar no se carga de nuevo.'), S.__el('wz-error-guardado').textContent)
  chk('queda anotado como grabado', w.terminadoRes?.cajas === 44)
  S.__setErrorItems(null)
  await S.confirmarIngreso()
  chk('el reintento NO vuelve a mandar el producto terminado', S.__log.filter(l => l[1] === 'ingresar_producto_terminado').length === 1)
  chk('y graba los insumos', S.__log.filter(l => l[0] === 'insert' && l[1] === 'materia_prima_items').length === 2 && S.__cerrado() === 1)
  chk('el aviso final con las dos partes', S.__exitos.at(-1) === 'Ingreso cargado: 1 insumo y 44 cajas de producto terminado.')
})())

// Dos toques no mandan dos; un reintento que la base reconoce.
esperas.push((async () => {
  const { S, w } = await armar()
  Object.assign(S.agregarTerminado('pt-capelina'), { cajas: 44, loteResp: 'si', lote: '310476' })
  await Promise.all([S.confirmarIngreso(), S.confirmarIngreso()])
  chk('dos toques: una sola llamada', S.__log.filter(l => l[1] === 'ingresar_producto_terminado').length === 1)
  const b = await armar()
  Object.assign(b.S.agregarTerminado('pt-capelina'), { cajas: 44, loteResp: 'si', lote: '310476' })
  b.S.__setRpc(() => ({ data: { ingreso_id: 'ing-pt-1', reintento: true }, error: null }))
  await b.S.confirmarIngreso()
  chk('la base dice que ya estaba: se dice así', b.S.__exitos.at(-1) === 'Ingreso cargado: el producto terminado (ya estaba cargado: no se cargó dos veces).', b.S.__exitos.at(-1))
})())

// Lo que falta frena también al confirmar.
esperas.push((async () => {
  const { S, w } = await armar()
  S.agregarTerminado('pt-capelina')
  await S.confirmarIngreso()
  chk('al confirmar con lo que falta: vuelve a los ítems y no llama a nada', S.__pasos.at(-1) === 'items' && !S.__log.some(l => l[0] === 'rpc'))
  void w
})())

fin()
