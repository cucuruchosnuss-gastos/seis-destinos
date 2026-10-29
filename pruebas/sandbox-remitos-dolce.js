// Arma un sandbox con las funciones REALES de modulos/remitos-dolce.html
// (Remitos Dolce, 28/10/2026: Subir y Revisar los remitos de Rosario) y de lo
// que importa de js/ (remitos-comun.js, retiros-comun.js: los pega
// fuente-cobranzas.js). Se EJECUTAN.
//
// El DOM es falso pero guarda lo que se le escribe, y supabase es un doble que:
//  - devuelve lo que la suite ponga en __tablas[tabla] (array, o función que
//    recibe los filtros y devuelve { data, error });
//  - anota cada consulta en __llamadas.consultas y cada rpc en __llamadas.rpc,
//    y responde las rpc con __rpc(nombre, parámetros) (__setRpc()).
// Storage y las Edge Functions las pone cada suite (preludioExtra).

const { construirCon } = require('./sandbox')
const { fuenteNumeros } = require('./numeros-comun')

// Lo propio del módulo: helpers, permisos, vistas y el arranque.
const FUNCIONES_BASE = [
  'esc', 'normalizar', 'limpio', 'hoyArgentina', 'esFechaIso', 'fechaCorta',
  'nuevoUuid', 'leerPreferencia', 'guardarPreferencia', 'esErrorDeRed',
  'claveBusquedaCliente', 'clientesParaAsentar', 'apodoMostrarRet', 'momentoAr', 'leerClientes', 'insumoDe',
  'asegurarDatosEmpresa', 'leerPrincipales', 'textoTambienEn', 'clienteDe', 'leerAcopios', 'estadoAcopio', 'cajasAcopio', 'leerCatalogo',
  'puedeEn', 'empresasDeCarga', 'empresasDeRevision', 'sinControlStockEmpresa',
  'mostrarVista', 'pestanasVisibles', 'pintarPestanas', 'elegirPestana',
  // Abajo de Revisar: las órdenes por N° de remito
  'cargarOrdenesRemito', 'estadoOrdenRemito', 'htmlFilaOrdenRemito', 'htmlListaOrdenesRemito', 'pintarOrdenesRemito',
  'htmlFabricaRevisar', 'elegirFabricaRevisar', 'mostrarRevisar',
  'sinAcceso', 'cargarPermisos', 'cargarFabricas',
  // de js/remitos-comun.js
  'limpioRc', 'normalizarRc', 'talonarioDe', 'textoNumeroRemito', 'presentacionRemito', 'productoDePresentacionRemito', 'insumoRemito',
  'nombreRenglonRemito', 'ordenCategoriaRemito', 'opcionesRemito', 'gruposRemito',
  // de js/retiros-comun.js
  'escHoja', 'enteroHoja', 'decimalesDeUnidad', 'unidadHoja',
  // SUBIR
  'fabricasRemitos', 'puedeSubirRemitos', 'datosRemitos', 'fabricaRemitos', 'elegirFabricaRemitos', 'abrirSubirRemitos',
  'rutaFotoRemito', 'medidasAchicadas', 'cargarImagenRemito', 'achicarFoto', 'urlLocalDeFoto',
  'itemColaRemito', 'guardarColaRemitos', 'leerColaRemitos', 'fotosElegidas', 'encolarFotos', 'procesarCola',
  'yaEstabaSubida', 'textoErrorRemito', 'procesarRemito', 'lanzarLectura', 'seguirLecturas', 'leerRemitoConIa',
  'reintentarRemito', 'quitarRemitoDeCola', 'leerMisRemitos', 'pedirMiniaturas', 'urlMiniaturaSegura',
  'fechaHoraRemito', 'numeroLeido', 'estadoRemitoSubido', 'estadoRemitoEnCola', 'remitosParaMostrar',
  'htmlRemitoSubido', 'htmlMisRemitos', 'htmlFabricaRemitos', 'textoColaRemitos', 'pintarRemitos',
  'hayRemitosLeyendo', 'programarSondeo',
  // REVISAR
  'htmlSelloAcopio', 'numeroRemitoN', 'ordenarPorRemito', 'ordenesVisibles', 'htmlTalonariosOrdenes', 'elegirTalonarioOrdenes',
  'remitosPorRevisar', 'leerRemitosPrecarga', 'leerRemito', 'cargarRemitosPrecarga', 'amarillosDe', 'nombreClienteRemito',
  'htmlTarjetaRemito', 'htmlRemitosPrecarga', 'pintarRemitosPrecarga', 'quitarRemitoDeLaLista',
  'cajasLoteRemito', 'normalizarLoteRemito', 'renglonDesdeItem', 'renglonRemitoNuevo', 'formDesdeRemito',
  'lotesRemitoParaBase', 'itemRemitoParaBase', 'parametrosActualizarRemito', 'asignacionRemito', 'htmlResumenLotesRemito', 'puedeAceptarSugerencia',
  'textoResumenRemito', 'htmlOpcionesRemito', 'htmlSelectorRemito', 'htmlMarcasRemito', 'htmlConoRemito', 'filasLotesRemito', 'htmlLotesRemito',
  'htmlRenglonRemito', 'htmlClientesRemito', 'htmlClienteRemito', 'htmlEncabezadoRemito', 'urlFotoSegura', 'htmlFotoRemito', 'htmlAccionesRemito',
  'pintarTituloRemito', 'pintarFotoRemito', 'ponerSrcFotoRemito', 'pintarRemito', 'renglonRemito', 'marcarSucioRemito', 'elegirProductoRemito',
  'elegirInsumoRemito', 'elegirMarcaRemito', 'cambiarProductoRemito', 'aceptarSugerenciaRemito', 'omitirRenglonRemito', 'quitarRenglonRemito',
  'agregarRenglonRemito', 'agregarLoteRemito', 'quitarLoteRemito', 'pintarPieLotesRemito', 'elegirTalonarioRemito', 'elegirClienteRemito',
  'cambiarClienteRemito', 'buscarClienteLeidoRemito', 'zoomFotoRemito', 'alEscribirRemito', 'alTocarRemito', 'accionRemito', 'abrirRemito',
  'cargarFotoRemito', 'aplicarFilaRemito', 'confirmarRemito', 'mensajeDeFuncion', 'volverALeerRemito',
  'descartarRemito', 'volverDeRemito',
  // El autoguardado (29/10/2026)
  'estadoGuardadoRemito', 'htmlGuardadoRemito', 'pintarGuardadoRemito', 'autoguardarRemito', 'guardarYaRemito', 'esperarGuardadoRemito',
  'frenarAutoguardadoRemito', 'seguirAutoguardadoRemito', 'puedeGuardarRemito', 'pendienteRemito',
  // El saldo del acopio al revisar uno de talonario Acopio
  'claveAcopio', 'cargarAcopiosRemito', 'saldoAcopioRemito', 'htmlSaldoAcopioRemito', 'pintarAcopiosRemito',
]

const CONSTANTES_BASE = [
  'ZONA_AR', 'MAX_RESULTADOS_CLIENTES', 'MIN_LETRAS_BUSCAR', 'ESTADOS_ACOPIO', 'CATEGORIAS_PRODUCTO', 'VISTAS', 'SUB_DE_VISTA',
  'DIAS_ORDENES_REMITO', 'TOPE_ORDENES_REMITO', 'ETIQUETA_ESTADO_ORDEN', 'CLAVE_PESTANA', 'CLAVE_FABRICA_REVISAR',
  'GRUPOS_REMITO', 'ZONA_HOJA', 'NOMBRE_UNIDAD_HOJA',
  'LADO_MAXIMO_FOTO', 'CALIDAD_FOTO', 'DIAS_MIS_REMITOS', 'SONDEO_REMITOS_MS', 'LECTURAS_A_LA_VEZ', 'LECTURA_TRABADA_MS',
  'SEGUNDOS_MINIATURA', 'CLAVE_REMITOS_COLA', 'CLAVE_REMITOS_FABRICA', 'TEXTO_FOTO_PERDIDA', 'ICONO_REMITO',
  'ESTADOS_REMITO_POR_REVISAR', 'ETIQUETA_ESTADO_REMITO', 'TALONARIOS', 'CAMPOS_REMITO', 'ZOOM_FOTO_REMITO', 'LARGO_LOTE_REMITO',
  'LARGO_MINIMO_MOTIVO_REMITO', 'RE_YA_INGRESADO', 'RETARDO_AUTOGUARDADO_REMITO',
]

const PRELUDIO = `
  ${fuenteNumeros()}
  function nuevoEl(id) {
    const clases = new Set()
    return {
      id, innerHTML: '', textContent: '', value: '', className: '', hidden: false,
      disabled: false, checked: false, dataset: {}, style: {}, title: '', type: 'text', src: '', href: '', download: '',
      atributos: {},
      setAttribute(k, v) { this.atributos[k] = String(v) }, getAttribute(k) { return this.atributos[k] ?? null },
      removeAttribute(k) { delete this.atributos[k] },
      querySelectorAll: () => [], querySelector: () => null,
      addEventListener: () => {}, removeEventListener: () => {}, focus() {}, scrollIntoView: () => {},
      closest: () => null, appendChild() {}, remove() {}, click() { __llamadas.clicks.push(this) },
      classList: { add(c){ clases.add(c) }, remove(c){ clases.delete(c) }, toggle(c, f){ (f ?? !clases.has(c)) ? clases.add(c) : clases.delete(c) }, contains(c){ return clases.has(c) } },
    }
  }
  var __els = new Map()
  var document = {
    body: nuevoEl('body'), head: nuevoEl('head'), hidden: false,
    getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) },
    querySelectorAll: () => [], querySelector: () => null,
    createElement: (tag) => nuevoEl('creado-' + tag),
    addEventListener: () => {},
  }
  var location = { href: 'https://cucuruchosnuss-gastos.github.io/seis-destinos/modulos/remitos-dolce.html', search: '' }
  var __ls = new Map()
  var localStorage = {
    getItem(k) { return __ls.has(k) ? __ls.get(k) : null },
    setItem(k, v) { __ls.set(k, String(v)) },
    removeItem(k) { __ls.delete(k) },
  }
  var window = { location, scrollTo(){}, addEventListener(){}, lucide: null }
  var __uuids = 0
  var crypto = { randomUUID() { __uuids++; return '00000000-0000-4000-8000-' + String(__uuids).padStart(12, '0') } }
  function setTimeout(f) { return 0 } function clearTimeout(){}
  var navigator = {}
  function nombreCorto(e) { return String(e?.nombre ?? '').replace(/^Cucuruchos /, '') }

  var __llamadas = { rpc: [], errores: [], exitos: [], consultas: [], clicks: [] }
  var __tablas = {}
  var __rpc = async () => ({ data: null, error: null })
  var supabase = {
    from(tabla) {
      const filtros = []
      const q = {
        select(c) { filtros.push(['select', c]); return q }, eq(a, b) { filtros.push(['eq', a, b]); return q },
        in(a, b) { filtros.push(['in', a, b]); return q }, order(a, o) { filtros.push(['order', a, o]); return q },
        neq(a, b) { filtros.push(['neq', a, b]); return q }, is(a, b) { filtros.push(['is', a, b]); return q }, limit(n) { filtros.push(['limit', n]); return q },
        gte(a, b) { filtros.push(['gte', a, b]); return q }, lte(a, b) { filtros.push(['lte', a, b]); return q },
        maybeSingle() { filtros.push(['single']); return q },
        then(res, rej) {
          __llamadas.consultas.push([tabla, filtros])
          const t = __tablas[tabla]
          let r = typeof t === 'function' ? t(filtros) : { data: t ?? [], error: null }
          if (filtros.some(f => f[0] === 'single') && Array.isArray(r.data)) r = { ...r, data: r.data[0] ?? null }
          return Promise.resolve(r).then(res, rej)
        },
      }
      return q
    },
    rpc(nombre, params) { __llamadas.rpc.push([nombre, JSON.parse(JSON.stringify(params ?? null))]); return Promise.resolve(__rpc(nombre, params)) },
    // La foto del remito (Revisar); Subir pone su propio doble (preludioExtra).
    storage: { from(b) { return { createSignedUrl(ruta, seg) { __urlsFirmadas.push([b, ruta, seg]); return Promise.resolve({ data: { signedUrl: 'https://firmada/' + ruta }, error: null }) } } } },
  }
  var __urlsFirmadas = []
  function mostrarError(m) { __llamadas.errores.push(m) }
  function mostrarExito(m) { __llamadas.exitos.push(m) }

  var estado = {
    sesion: { user: { id: 'uid-1' } },
    miEmpleadoId: 'emp-1', miRolApp: 'usuario',
    misTareas: new Map([['retiros:cargar', { unidades: ['u-d'] }]]),
    fabrica: FABRICA_SIN_DATOS,
    unidades: [{ id: 'u-n', nombre: 'Cucuruchos Nuss' }, { id: 'u-d', nombre: 'Dolce Pasta' }],
    empresas: [{ id: 'u-d', nombre: 'Dolce Pasta' }],
    sinControlIds: new Set(['u-d']),
    sinControl: new Map([['u-n', false], ['u-d', true]]),
    vista: null, pestana: null, subida: null,
    empresaId: 'u-d', clientes: null, catalogo: null, catalogoEmpresa: null, principales: new Map(),
    remitos: null, remito: null, remitosResueltos: new Set(), turnoRemitos: 0,
    ordenes: null, errorOrdenes: null, turnoOrdenes: 0, talonarioOrdenes: 'oficial',
  }
`

function construirRemitosDolce(ruta, { funciones = [], constantes = [], preludioExtra = '' } = {}) {
  const todasConst = [...new Set([...CONSTANTES_BASE, ...constantes])]
  return construirCon(ruta, {
    preludio: PRELUDIO + preludioExtra,
    funciones: [...new Set([...FUNCIONES_BASE, ...funciones])],
    constantes: todasConst,
    retorno: `${todasConst.join(', ')}, estado, __els, __doc: document, __llamadas, __ls, __tablas, __win: window, __loc: location,
      __setRpc(f){ __rpc = f }, __urlsFirmadas(){ return __urlsFirmadas }, ponerNumero, leerCampoNumero, enlazarCampoNumero, leerNumeroAr, formatearNumeroAr`,
  })
}

module.exports = { construirRemitosDolce, FUNCIONES_BASE, CONSTANTES_BASE }
