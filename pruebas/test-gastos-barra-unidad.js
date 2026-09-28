// Suite: la BARRA DE UNIDAD en Gastos (28/09/2026).
//
// La unidad se elige UNA vez arriba (js/barra-unidad.js) y Gastos muestra solo
// lo de esa unidad. Se EJECUTA el código real del módulo (y pasaFiltroUnidad
// real de js/barra-unidad.js, que extraer.js encuentra por el import) con un
// document falso:
//  - "Todas" muestra todo, con la suma y el DETALLE POR UNIDAD,
//  - una unidad muestra solo lo suyo, y lo SIN UNIDAD se ve siempre, marcado,
//  - las cifras (Gastos de hoy/mes y Registros) cuentan lo que se ve,
//  - el Excel exporta lo que se ve,
//  - cambiar la elección repinta SIN volver a consultar,
//  - "Facturas ingresadas sin gasto" también se filtra (y dice cuántas quedan
//    en otras unidades),
//  - el wizard viene con la unidad de la barra puesta (la grilla queda) y con
//    "Todas" la pide ahí mismo,
//  - la consulta NO filtra por unidad (se filtra donde se arma la lista),
//  - y el filtro "Unidad" viejo NO está.
//
//   node pruebas/test-gastos-barra-unidad.js
//   ARCHIVO_TEST=otra-copia.html node pruebas/test-gastos-barra-unidad.js

const path = require('path')
const { construirCon, scriptModulo } = require('./sandbox')
const { arnes, leer } = require('./circuito-comun')
const { extraerFn } = require('./extraer')
const { fuenteNumeros } = require('./numeros-comun')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/gastos.html')
const FUENTE = leer(ARCHIVO)
const SCRIPT = scriptModulo(ARCHIVO)
const { chk, esperas, fin } = arnes()

const NUSS = 'u-n', TALLER = 'u-t', DOLCE = 'u-d'

// El cableado REAL del arranque: alCambiarUnidad + unidadesDeLaBarra.
const iBarra = SCRIPT.indexOf('    alCambiarUnidad(({ elegida, unidades, mostrar }) => {')
const fBarraTxt = ".catch(e => console.error('barra de unidad:', e))"
const fBarra = SCRIPT.indexOf(fBarraTxt, iBarra)
chk('el arranque engancha la barra (alCambiarUnidad + unidadesDeLaBarra)', iBarra > 0 && fBarra > iBarra)
const BLOQUE_BARRA = iBarra > 0 && fBarra > iBarra ? SCRIPT.slice(iBarra, fBarra + fBarraTxt.length) : ''

const PRELUDIO = `
  ${fuenteNumeros()}
  var console = { log(){}, warn(){}, error(){} }
  function nuevoEl(id) {
    const el = {
      id, innerHTML: '', textContent: '', value: '', hidden: false, disabled: false, style: {}, dataset: {},
      addEventListener(){}, removeAttribute(){}, setAttribute(){}, focus(){}, querySelectorAll: () => [],
      classList: { add(){}, remove(){}, toggle(){}, contains: () => false },
    }
    return el
  }
  var __els = new Map()
  var document = {
    getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) },
    querySelector(s) { return nuevoEl(s) },
    querySelectorAll: () => [],
  }
  var lucide = { createIcons(){} }
  var __errores = [], __consultas = [], __excel = null, __gastosDeLaBase = []
  function mostrarError(m) { __errores.push(m) }
  function mostrarExito() {}
  function formatearFecha(f) { if (!f) return ''; const [a, m, d] = f.split('-'); return d + '/' + m + '/' + a }
  var supabase = {
    from(tabla) {
      const q = { llamadas: [] }
      __consultas.push({ tabla, q })
      for (const k of ['select', 'eq', 'neq', 'in', 'or', 'not', 'is', 'gte', 'lte', 'order']) q[k] = (...a) => { q.llamadas.push([k, ...a]); return q }
      q.then = (res, rej) => Promise.resolve({ data: __gastosDeLaBase, error: null }).then(res, rej)
      return q
    },
    rpc: async () => ({ data: null, error: null }),
  }
  var XLSX = { utils: { json_to_sheet(f) { __excel = f; return {} }, book_new() { return {} }, book_append_sheet() {} }, writeFile() {} }
  function mostrarDetalleGasto() {} function seleccionarDestino() {} function irASubpaso(p) { __subpaso = p }
  var __subpaso = null
  // Lo que resetearWizard() toca y no hace a la unidad.
  function limpiarMatchProveedor() {} function actualizarBotonPedirAlta() {} function seleccionarTipoDoc() {}
  function seleccionarMedioPago() {} function resetearZonaFoto() {}
  var cargaListaId = 0
  var categoriaSeleccionada = null, tipDocSeleccionado = null, medioPagoSeleccionado = null
  var unidadSeleccionada = null, vehiculoSeleccionado = null, vehiculoFueElegido = false, viaVehiculos = false
  var proveedorSeleccionado = null, proveedorSeleccionadoEsAuto = false
  var estado = {
    miRolApp: 'super_admin', miEmpleadoId: 'e1', misTareas: new Set(),
    fabrica: FABRICA_SIN_DATOS,
    unidadBarra: { elegida: null, unidades: [], mostrar: false },
    filtros: { periodos: [], categoria_ids: [], vehiculo_ids: [], medios_pago: [], busqueda: '', orden: 'fecha_desc', rangoRapido: 'hoy' },
    wizard: { camposOcr: new Set() },
    ingresosSinGasto: [], errorIngresosSinGasto: null,
    maestros: {
      unidades: [
        { id: '${NUSS}', nombre: 'Cucuruchos Nuss', prefijo: 'N' },
        { id: '${TALLER}', nombre: 'Taller', prefijo: 'T' },
        { id: '${DOLCE}', nombre: 'Dolce Pasta', prefijo: 'D' },
      ],
      categorias: [], vehiculos: [], empleados: [], proyectos: [],
    },
  }
  // La barra: la elección inicial y el aviso de cambio.
  var __cbCambio = null
  var __barraInicial = { elegida: null, unidades: [], mostrar: true }
  function alCambiarUnidad(f) { __cbCambio = f }
  function unidadesDeLaBarra() { return Promise.resolve(__barraInicial) }
  ${BLOQUE_BARRA}
`
const FUNCIONES = [
  'esc', 'tieneTarea', 'formatearImporte', 'renderizarCardGasto', 'iconoCategoriaHtml', 'colorAvatar', 'inicialesEmpresa',
  'renderizarTotalGastos', 'aplicarBusquedaLocal', 'gastosVisibles', 'unidadDeGasto', 'nombreUnidadDe', 'totalesPorUnidad',
  'htmlTotalesPorUnidad', 'repintarPorUnidad', 'renderizarIngresosSinGasto', 'htmlIngresosSinGasto', 'importeDeOcr',
  'exportarExcel', 'cargarLista', 'unidadDeLaBarraParaWizard', 'unidadesElegibles', 'renderizarGrillaDestino', 'configEmpresa',
  'actualizarBotonDestinoSiguiente', 'avanzarDesdeDestino', 'resetearWizard', 'mostrarErrorProyecto', 'fechaISO',
  'pasaFiltroUnidad', 'esUnidadTaller', 'etiquetaProyectoGasto',
]
const CONSTANTES = ['ICONOS_CATEGORIA', 'PALETA_AVATAR', 'LOGOS_EMPRESA', 'LOGO_VEHICULOS', 'MEDIOS_PAGO_LABEL', 'OPCIONES_ORDEN',
  'COLUMNAS_PROYECTO', 'TEXTO_GASTO_GENERAL']
const RETORNO = `estado, __el(id){ return document.getElementById(id) }, __consultas, __errores, __excel(){ return __excel },
  __cambio(e){ __cbCambio(e) }, __hayCambio(){ return typeof __cbCambio === 'function' }, __base(l){ __gastosDeLaBase = l },
  __get(k){ return eval(k) }, __set(k, v){ eval(k + ' = v') }, __subpaso(){ return __subpaso }`

function sandbox() {
  return construirCon(ARCHIVO, { preludio: PRELUDIO, funciones: FUNCIONES, constantes: CONSTANTES, retorno: RETORNO })
}

const GASTOS = [
  { id: 'g-n1', unidad_negocio_id: NUSS, unidades_negocio: { id: NUSS, nombre: 'Cucuruchos Nuss' }, importe: 100, moneda: 'ARS', estado: 'registrado', fecha_pago: '2026-09-27', razon_social: 'Proveedor A', categorias: null, proyectos: null },
  { id: 'g-n2', unidad_negocio_id: NUSS, unidades_negocio: { id: NUSS, nombre: 'Cucuruchos Nuss' }, importe: 999, moneda: 'ARS', estado: 'anulado', fecha_pago: '2026-09-27', razon_social: 'Anulado', categorias: null, proyectos: null },
  { id: 'g-t1', unidad_negocio_id: TALLER, unidades_negocio: { id: TALLER, nombre: 'Taller' }, importe: 50, moneda: 'ARS', estado: 'registrado', fecha_pago: '2026-09-27', razon_social: 'Ferretería', categorias: null, proyectos: null },
  { id: 'g-v1', unidad_negocio_id: null, unidades_negocio: null, vehiculos: { nombre: 'Kangoo', patente: 'AB123' }, importe: 7, moneda: 'ARS', estado: 'registrado', fecha_pago: '2026-09-27', razon_social: 'YPF', categorias: null, proyectos: null },
]
const cartas = (S) => S.__el('lista-gastos').innerHTML
const tieneCarta = (S, id) => cartas(S).includes(`data-id="${id}"`)
const total = (S) => S.__el('total-gastos').innerHTML

function conGastos(S) {
  S.estado.listaGastos = GASTOS.map(g => ({ ...g }))
}

// ── Todas ───────────────────────────────────────────────────────────────────
{
  const S = sandbox()
  conGastos(S)
  S.estado.unidadBarra = { elegida: null, unidades: [], mostrar: true }
  S.aplicarBusquedaLocal()
  chk('Todas: se ven todos los gastos', GASTOS.every(g => tieneCarta(S, g.id)), cartas(S).slice(0, 100))
  chk('Todas: el total suma todo lo no anulado (100 + 50 + 7)', total(S).includes('$ 157,00'), total(S).slice(0, 400))
  chk('Todas: Registros cuenta todos (anulados incluidos)', />\s*4 <span/.test(total(S)))
  chk('Todas: hay detalle por unidad', total(S).includes('id="totales-por-unidad"'))
  const t = total(S)
  chk('Todas: el detalle nombra cada unidad', t.includes('Cucuruchos Nuss') && t.includes('Taller') && t.includes('Sin unidad'))
  chk('Todas: el detalle da el total de cada unidad', /Cucuruchos Nuss<\/span>\s*<span class="totales-unidad__cifra">\$ 100,00/.test(t) && /Taller<\/span>\s*<span class="totales-unidad__cifra">\$ 50,00/.test(t))
  chk('Todas: el detalle cuenta los registros de cada unidad', /Cucuruchos Nuss[\s\S]*?· 2 gastos/.test(t) && /Taller[\s\S]*?· 1 gasto</.test(t))
  chk('Todas: "Sin unidad" va última', t.lastIndexOf('Sin unidad') > t.lastIndexOf('Taller') && t.lastIndexOf('Sin unidad') > t.lastIndexOf('Cucuruchos Nuss'))
  chk('Todas: una unidad sin gastos no aparece en el detalle', !t.includes('Dolce Pasta'))
  chk('Todas: sin la marca "Sin unidad" en las tarjetas (no hay unidad elegida)', !cartas(S).includes('gasto__sin-unidad'))
  const filas = S.totalesPorUnidad(S.estado.listaGastos)
  chk('totalesPorUnidad: el anulado cuenta como registro pero no suma', filas.find(f => f.id === NUSS)?.total === 100 && filas.find(f => f.id === NUSS)?.registros === 2)
}

// ── Una unidad ──────────────────────────────────────────────────────────────
{
  const S = sandbox()
  conGastos(S)
  S.estado.unidadBarra = { elegida: TALLER, unidades: [], mostrar: true }
  S.aplicarBusquedaLocal()
  chk('Taller: se ve lo del Taller', tieneCarta(S, 'g-t1'))
  chk('Taller: NO se ve lo de Nuss', !tieneCarta(S, 'g-n1') && !tieneCarta(S, 'g-n2'))
  chk('Taller: lo SIN unidad se ve igual', tieneCarta(S, 'g-v1'))
  chk('Taller: lo sin unidad va marcado "Sin unidad"', /data-id="g-v1"[\s\S]*?gasto__sin-unidad">Sin unidad</.test(cartas(S)))
  chk('Taller: lo del Taller NO lleva la marca', !/data-id="g-t1"[\s\S]*?<\/div>\s*<div class="gasto__meta">[\s\S]*?gasto__sin-unidad/.test(cartas(S).split('data-id="g-v1"')[0]))
  chk('Taller: el total suma solo lo que se ve (50 + 7)', total(S).includes('$ 57,00'), total(S).slice(0, 300))
  chk('Taller: Registros cuenta lo que se ve', />\s*2 <span/.test(total(S)))
  chk('Taller: el detalle separa el Taller de lo sin unidad', total(S).includes('id="totales-por-unidad"') && total(S).includes('Sin unidad'))

  S.estado.listaGastos = GASTOS.filter(g => g.id === 'g-t1').map(g => ({ ...g }))
  S.aplicarBusquedaLocal()
  chk('una sola unidad a la vista: sin detalle por unidad (no dice nada nuevo)', !total(S).includes('totales-por-unidad'))
}

// ── Cambiar la elección repinta sin volver a consultar ─────────────────────
esperas.push((async () => {
  const S = sandbox()
  await Promise.resolve()
  chk('el arranque se suscribe a los cambios de la barra', S.__hayCambio())
  conGastos(S)
  const consultasAntes = S.__consultas.length
  S.__cambio({ elegida: NUSS, unidades: [], mostrar: true })
  chk('cambio a Nuss: la elección queda en el estado', S.estado.unidadBarra.elegida === NUSS)
  chk('cambio a Nuss: repinta con lo de Nuss', tieneCarta(S, 'g-n1') && !tieneCarta(S, 'g-t1'))
  S.__cambio({ elegida: null, unidades: [], mostrar: true })
  chk('cambio a Todas: vuelve a verse todo', GASTOS.every(g => tieneCarta(S, g.id)))
  chk('cambiar la barra NO vuelve a consultar la base', S.__consultas.length === consultasAntes, `${consultasAntes} → ${S.__consultas.length}`)
  // Antes de la primera carga no pinta una lista vacía.
  const S2 = sandbox()
  S2.__cambio({ elegida: NUSS, unidades: [], mostrar: true })
  chk('antes de la primera carga, un cambio no dibuja "Sin gastos" ni rompe', S2.__el('estado-vacio').hidden === false && S2.__el('lista-gastos').innerHTML === '')
})())

// La elección inicial llega por unidadesDeLaBarra(), sin bloquear el arranque.
esperas.push((async () => {
  const S = sandbox()
  await new Promise(r => setTimeout(r, 0))
  chk('la elección inicial de la barra entra al estado', S.estado.unidadBarra && S.estado.unidadBarra.mostrar === true)
  chk('unidadesDeLaBarra() no se espera con await en el arranque', !/await unidadesDeLaBarra\(\)/.test(SCRIPT))
})())

// ── El buscador y la unidad juntos ──────────────────────────────────────────
{
  const S = sandbox()
  conGastos(S)
  S.estado.unidadBarra = { elegida: NUSS, unidades: [], mostrar: true }
  S.estado.filtros.busqueda = 'ypf'
  S.aplicarBusquedaLocal()
  chk('buscador + unidad: se combinan (YPF sin unidad pasa, Nuss no matchea)', tieneCarta(S, 'g-v1') && !tieneCarta(S, 'g-n1'))
}

// ── El Excel exporta lo que se ve ───────────────────────────────────────────
{
  const S = sandbox()
  conGastos(S)
  S.estado.unidadBarra = { elegida: TALLER, unidades: [], mostrar: true }
  S.exportarExcel()
  const x = S.__excel() || []
  chk('Excel: exporta lo que se ve (Taller + sin unidad)', x.length === 2, String(x.length))
  chk('Excel: no exporta lo de otra unidad', !x.some(f => f['Razón social'] === 'Proveedor A'))
  chk('Excel: lo sin unidad dice "Sin unidad"', x.some(f => f['Razón social'] === 'YPF' && f.Empresa === 'Sin unidad'))
  chk('Excel: el gasto del Taller sin proyecto dice "Gasto general del taller"', x.some(f => f['Razón social'] === 'Ferretería' && f.Proyecto === 'Gasto general del taller'))
  S.estado.unidadBarra = { elegida: null, unidades: [], mostrar: true }
  S.exportarExcel()
  chk('Excel con Todas: exporta todo', (S.__excel() || []).length === 4)
  S.estado.unidadBarra = { elegida: DOLCE, unidades: [], mostrar: true }
  S.estado.listaGastos = GASTOS.filter(g => g.unidad_negocio_id === NUSS).map(g => ({ ...g }))
  const antes = S.__errores.length
  S.exportarExcel()
  chk('Excel sin nada a la vista: avisa y no exporta', S.__errores.length === antes + 1)
}

// ── La consulta NO filtra por unidad ────────────────────────────────────────
esperas.push((async () => {
  const S = sandbox()
  // Primero que llegue la elección inicial de la barra (unidadesDeLaBarra).
  await new Promise(r => setTimeout(r, 0))
  S.__base(GASTOS.map(g => ({ ...g })))
  S.estado.unidadBarra = { elegida: TALLER, unidades: [], mostrar: true }
  await S.cargarLista()
  const q = S.__consultas.find(c => c.tabla === 'gastos')?.q
  chk('cargarLista consulta gastos', !!q)
  const llamadas = JSON.stringify(q?.llamadas ?? [])
  chk('la consulta NO filtra por unidad (ni eq, ni in, ni or)', !(q?.llamadas ?? []).some(([k, ...a]) =>
    k !== 'select' && JSON.stringify(a).includes('unidad_negocio_id')), llamadas.slice(0, 300))
  chk('la consulta trae unidad_negocio_id', (q?.llamadas ?? []).some(([k, cols]) => k === 'select' && /unidad_negocio_id/.test(cols)))
  chk('al llegar, pinta filtrado por la barra', tieneCarta(S, 'g-t1') && !tieneCarta(S, 'g-n1') && tieneCarta(S, 'g-v1'))
})())

// ── Facturas ingresadas sin gasto ───────────────────────────────────────────
{
  const S = sandbox()
  S.estado.ingresosSinGasto = [
    { ingreso_id: 'i-n', razon_social: 'Harinera', unidad_negocio_id: NUSS, fecha: '2026-10-02' },
    { ingreso_id: 'i-t', razon_social: 'Ferretería', unidad_negocio_id: TALLER, fecha: '2026-10-02' },
    { ingreso_id: 'i-s', razon_social: 'Sin unidad SA', unidad_negocio_id: null, fecha: '2026-10-02' },
  ]
  S.estado.unidadBarra = { elegida: null, unidades: [], mostrar: true }
  S.renderizarIngresosSinGasto()
  chk('ingresos sin gasto, Todas: se ven las tres', ['i-n', 'i-t', 'i-s'].every(id => S.__el('lista-ingresos-sin-gasto').innerHTML.includes(id)))
  chk('ingresos sin gasto, Todas: el título dice 3', S.__el('ingresos-sin-gasto-titulo').textContent.includes('(3)'))
  chk('ingresos sin gasto, Todas: sin nota de otras unidades', !S.__el('lista-ingresos-sin-gasto').innerHTML.includes('ingresos-sin-gasto-otras'))
  S.estado.unidadBarra = { elegida: TALLER, unidades: [], mostrar: true }
  S.renderizarIngresosSinGasto()
  const h = S.__el('lista-ingresos-sin-gasto').innerHTML
  chk('ingresos sin gasto, Taller: se ve la del Taller', h.includes('i-t'))
  chk('ingresos sin gasto, Taller: no se ve la de Nuss', !h.includes('i-n'))
  chk('ingresos sin gasto, Taller: la sin unidad se ve, marcada', h.includes('i-s') && /Sin unidad SA[\s\S]*?Sin unidad</.test(h))
  chk('ingresos sin gasto, Taller: el título cuenta lo que se ve', S.__el('ingresos-sin-gasto-titulo').textContent.includes('(2)'))
  chk('ingresos sin gasto, Taller: dice cuántas hay en otras unidades', /Hay 1 más de otra unidad/.test(h))
  S.estado.unidadBarra = { elegida: DOLCE, unidades: [], mostrar: true }
  S.estado.ingresosSinGasto = S.estado.ingresosSinGasto.filter(f => f.unidad_negocio_id === NUSS)
  S.renderizarIngresosSinGasto()
  chk('ingresos sin gasto: sin nada de esta unidad, la sección no se dibuja', S.__el('seccion-ingresos-sin-gasto').hidden === true)
}

// ── El wizard: la unidad de la barra viene puesta ──────────────────────────
{
  const S = sandbox()
  S.estado.unidadBarra = { elegida: TALLER, unidades: [], mostrar: true }
  chk('wizard: la unidad de la barra es la del gasto nuevo', S.unidadDeLaBarraParaWizard() === TALLER)
  S.resetearWizard()
  chk('wizard: al abrir (resetear) viene puesta la unidad de la barra', S.__get('unidadSeleccionada') === TALLER)
  S.renderizarGrillaDestino()
  const g = S.__el('grilla-destino').innerHTML
  chk('wizard: la grilla de unidades QUEDA (se puede cambiar)', g.includes(`data-id="${NUSS}"`) && g.includes(`data-id="${DOLCE}"`))
  chk('wizard: la grilla marca la unidad de la barra', new RegExp(`tarjeta-destino seleccionada"[\\s\\S]*?data-id="${TALLER}"`).test(g), g.slice(0, 300))
  chk('wizard: con una unidad puesta aparece "Siguiente"', S.__el('btn-destino-siguiente').hidden === false)
  S.avanzarDesdeDestino()
  chk('wizard: "Siguiente" lleva a la categoría', S.__subpaso() === 'categoria')

  S.estado.unidadBarra = { elegida: null, unidades: [], mostrar: true }
  S.resetearWizard()
  chk('wizard con Todas: no viene ninguna unidad puesta', S.__get('unidadSeleccionada') === null)
  S.renderizarGrillaDestino()
  chk('wizard con Todas: la grilla pide elegir (nada marcado)', !S.__el('grilla-destino').innerHTML.includes('tarjeta-destino seleccionada'))
  chk('wizard con Todas: sin "Siguiente" (hay que tocar una unidad)', S.__el('btn-destino-siguiente').hidden === true)

  S.estado.unidadBarra = { elegida: 'u-que-no-esta', unidades: [], mostrar: true }
  chk('wizard: una unidad que no se ofrece en la grilla no queda puesta', S.unidadDeLaBarraParaWizard() === null)
}
chk('resetearWizard toma la unidad de la barra', /unidadSeleccionada\s*=\s*unidadDeLaBarraParaWizard\(\)/.test(extraerFn(SCRIPT, 'resetearWizard')))
chk('el botón "Siguiente" del destino está cableado', /getElementById\('btn-destino-siguiente'\)\.addEventListener\('click', avanzarDesdeDestino\)/.test(SCRIPT))

// ── El filtro "Unidad" viejo ya no está ─────────────────────────────────────
chk('ya no existe el filtro "Unidad" (ms-unidad)', !/ms-unidad/.test(FUENTE))
chk('ya no existe la opción "🚚 Vehículos" del filtro', !/__vehiculos__/.test(FUENTE))
chk('ya no existe estado.filtros.unidad_negocio_ids', !/unidad_negocio_ids/.test(FUENTE))
chk('renderizarFiltros ya no recibe unidades', /function renderizarFiltros\(\)/.test(SCRIPT))
chk('se importa de js/barra-unidad.js', /import \{[^}]*unidadesDeLaBarra[^}]*alCambiarUnidad[^}]*pasaFiltroUnidad[^}]*\} from '\.\.\/js\/barra-unidad\.js'/.test(SCRIPT))
chk('la barra se carga en el <head>', /<script type="module" src="\.\.\/js\/barra-unidad\.js"><\/script>/.test(FUENTE))

fin()
