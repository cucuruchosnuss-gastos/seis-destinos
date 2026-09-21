// Arma un sandbox con las funciones REALES de modulos/cobranzas.html.
// Se EJECUTAN: una assertion sobre el call site no dice nada del callee, y el
// único test que prueba que un helper existe es correr el código.

const fs = require('fs')
const { extraerFn, extraerConst } = require('./extraer')

const FUNCIONES = [
  'escCob', 'dvBcra', 'parseImporteCobranza', 'milesValidos', 'formatearImporte',
  'normalizarCliente', 'hoyArgentina', 'esFechaIso', 'diasEntre', 'formatearFechaCob',
  'momentoArgentina', 'fechaDeMomentoAr', 'erroresDeCheque', 'nombreBanco', 'tieneTarea',
  'htmlFilaCobranza', 'htmlDetalle', 'htmlChequeDetalle', 'htmlAccionesDetalle',
  'htmlHistorial', 'resumirCambios', 'htmlTarjetaCheque', 'chequeParaBase',
  'textoOpcional', 'origenDatosDe', 'estadoRenglon', 'aplicarRenglones', 'chequeVacio',
  'pintarEstadoFotos', 'pintarBannerLocal', 'renderizarChipsEstado', 'cargarRepartidores',
  'pintarTotalYGuardado', 'motivosParaNoGuardar', 'efectivoDelFormulario', 'totalDelFormulario',
  'renglonComoImpreso', 'chequeDesdeBase', 'chequeDesdeOcr',
  // Vista de cheques
  'filtroNumeroCheque', 'aplicarFiltrosCheques', 'hayFiltrosCheques', 'fechaDeCobroCheque',
  'ordenarCheques', 'resumenCartera', 'htmlCartera', 'htmlTablaCheques', 'htmlFilaCheque',
  'pintarSelectorBancos', 'pintarFiltrosCheques', 'limpiarFiltrosCheques', 'pintarCartera',
  'renderizarCheques', 'cargarResumenCheques',
  // Salida de cheques
  'htmlAccionCheque', 'textoSalidaCheque', 'textoHistorialCheque', 'erroresSalida', 'parametrosSalida',
  'abrirModalSalida', 'cerrarModalSalida', 'pintarModalSalida', 'confirmarSalida', 'abrirVolverACartera',
  'abrirModalMotivo', 'cerrarModalMotivo',
  // Los caminos del error de la base, que se tienen que mostrar TAL CUAL
  'subirCobranza', 'guardarCobranza', 'esErrorDeRed', 'accionSimple',
]

const CONSTANTES = [
  'ACENTOS_COB', 'SIN_ACENTOS_COB', 'ZONA_AR', 'DIAS_MAXIMO_DIFERIDO', 'ESTADOS_COBRANZA',
  'puedeCargar', 'puedeVerTodo', 'puedeProcesar', 'puedeEditarAnular', 'esPropia',
  'TOPE_FILAS_POSTGREST', 'FILTROS_CHEQUES_DEFECTO', 'ESTADOS_FILTRO_CHEQUES', 'ETIQUETA_ESTADO_CHEQUE',
  'LARGO_MAXIMO_DESTINO',
]

const PRELUDIO = `
  // --- DOM falso -------------------------------------------------------
  function nuevoEl(id) {
    return {
      id, innerHTML: '', textContent: '', value: '', className: '', hidden: false,
      disabled: false, max: '', dataset: {}, src: '',
      querySelectorAll: () => [],
      querySelector: () => null,
      addEventListener: () => {}, focus: () => {},
      classList: { add(){}, remove(){}, toggle(){} },
    }
  }
  var __els = new Map()
  var document = {
    getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) },
    querySelectorAll: () => [],
    querySelector: () => null,
    createElement: () => nuevoEl('creado'),
  }
  var window = { scrollTo(){}, confirm: () => true, prompt: () => null }
  var navigator = { onLine: true }

  // --- dependencias externas, stubeadas --------------------------------
  var __repartidoresFalsos = []
  var __errorFalso = null
  var __rpc = async () => ({ data: null, error: null })
  var accionDelModal = null
  var supabase = {
    from() {
      const q = {
        select: () => q, eq: () => q, in: () => q, order: () => q, range: () => q,
        like: () => q, gte: () => q, lte: () => q, maybeSingle: () => q,
        then(res) { return Promise.resolve({ data: __errorFalso ? null : __repartidoresFalsos, error: __errorFalso }).then(res) },
      }
      return q
    },
    rpc: (...a) => __rpc(...a),
    storage: { from: () => ({ createSignedUrl: async () => ({ data: null, error: new Error('sin red') }) }) },
    functions: { invoke: async () => ({ data: null, error: new Error('sin red') }) },
  }
  function mostrarError(m){ __llamadas.errores.push(m) } function mostrarExito(m){ __llamadas.exitos.push(m) }
  function mostrarVistaCob(){} async function refrescarListado(){ __llamadas.refrescar++ }
  function guardarBorrador(){} function conectarTarjetasCheque(){}
  function cargarCobranzas(){} function conectarDetalle(){}
  async function urlDeFoto(){ return null } function abrirVisor(){}
  function abrirFormularioLocal(){} function refrescarLocales(){}
  function dbBorrar(){} function hayFiltrosPuestos(){ return false }
  // La vista de cheques: la carga va stubeada y CUENTA sus llamadas, así se
  // puede afirmar que limpiar los filtros vuelve a consultar.
  var __llamadas = { cargarCheques: 0, abrirDetalle: [], errores: [], exitos: [], refrescar: 0 }
  function cargarCheques(){ __llamadas.cargarCheques++ }
  function abrirDetalle(id, op){ __llamadas.abrirDetalle.push([id, op]) }

  var estado = {
    sesion: { user: { id: 'uid-de-prueba' } },
    miEmpleadoId: 'emp-1', miRolApp: 'usuario',
    misTareas: new Set(['cobranzas:cargar', 'cobranzas:ver_todo', 'cobranzas:procesar']),
    bancos: new Map(), repartidores: [], cobranzas: [], hayMas: false,
    filtros: { texto: '', desde: '', hasta: '', estado: '', repartidor: '' },
    detalle: null, form: null, locales: [], urlsFirmadas: new Map(), sincronizando: false,
    cheques: {
      filtros: { estado: 'en_cartera', numero: '', banco: '' },
      filas: [], cobranzas: new Map(), cartera: null, tope: false, topeResumen: false, error: null,
    },
    bancosDeCheques: [], detalleOrigen: 'listado',
  }
`

function construir(rutaHtml) {
  const html = fs.readFileSync(rutaHtml, 'utf8')
  const ini = html.indexOf('<script type="module">')
  const fin = html.indexOf('</script>', ini)
  if (ini === -1 || fin === -1) throw new Error('no se encontró el <script type="module">')
  const src = html.slice(ini, fin)

  let codigo = PRELUDIO
  for (const c of CONSTANTES) codigo += extraerConst(src, c) + '\n'
  for (const f of FUNCIONES) codigo += extraerFn(src, f) + '\n\n'
  codigo += `return { ${FUNCIONES.join(', ')}, estado, __els, __doc: document, __llamadas, __set(r){ __repartidoresFalsos = r }, __setError(e){ __errorFalso = e }, __setRpc(f){ __rpc = f }, __accion(){ return accionDelModal } }`

  // Ejecutar el sandbox es lo que prueba que ningún helper falte: un escCob()
  // sin definir tira ReferenceError acá, no en producción.
  return new Function(codigo)()
}

module.exports = { construir, FUNCIONES, CONSTANTES }
