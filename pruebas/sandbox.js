// Arma un sandbox con las funciones REALES de modulos/cobranzas.html.
// Se EJECUTAN: una assertion sobre el call site no dice nada del callee, y el
// único test que prueba que un helper existe es correr el código.

const fs = require('fs')
const { extraerFn, extraerConst } = require('./extraer')
// Las funciones de números de js/utils.js (leerNumeroAr, ponerNumero…),
// con su código REAL: el módulo las importa desde el 21/09/2026.
const { fuenteNumeros } = require('./numeros-comun')
const { fuenteConComun } = require('./fuente-cobranzas')
// Los helpers de la fábrica de pruebas de js/utils.js (FABRICA_SIN_DATOS,
// sinUnidadesDePrueba, sinPersonasDePrueba…) llegan con fuenteNumeros(), que
// carga utils.js desde la sección de números hasta el final (26/09/2026).

// La cobranza ya asentada (01/10/2026), y lo que usa de js/barra-unidad.js.
// Exportadas: toda suite que arme el formulario de Cobranzas las necesita
// (motivosParaNoGuardar, subirCobranza y pintarFormulario las llaman).
// ¿Cómo pagó? (02/10/2026): los cuatro botones, las secciones, los
// comprobantes de e-cheques y transferencias y el lector nuevo. Van dentro de
// FUNCIONES_ASENTAR porque pintarFormulario / subirCobranza las llaman.
const FUNCIONES_PAGO = [
  'tipoFoto', 'fotosDeTipo', 'formasOfrecidas', 'formaTieneDatos', 'formaAbierta', 'formaVisible', 'abrirForma', 'cerrarForma',
  'pintarFormasPago', 'alTocarFormasPago', 'alTocarCerrarForma', 'elegirArchivoComprobante', 'agregarPropuestos', 'leerComprobante',
  'htmlAvisoComprobante', 'htmlComprobantes', 'abrirComprobante', 'pintarComprobantes', 'comprobantesSinUso', 'fotosParaBase',
  'htmlBancosOrigen', 'textoOrigenComprobante', 'htmlBotonComprobante', 'echequeVacio', 'echequeDesdeOcr', 'digitosONull', 'avisoCuit',
  'camposEcheque', 'origenDatosEcheque', 'transferenciaVacia', 'transferenciaDesdeOcr', 'camposTransferencia', 'origenDatosTransferencia',
  'esPdf', 'textoMb', 'prepararArchivo', 'cuitValidoCob',
]
const CONSTANTES_PAGO = [
  'FORMAS_PAGO', 'SECCION_FORMA', 'TEXTO_OTRO_COMPROBANTE', 'TEXTO_PRIMER_COMPROBANTE', 'TIPOS_COMPROBANTE', 'BANCOS_ORIGEN',
  'BYTES_MAXIMO_ARCHIVO', 'TEXTO_BOTON_CHEQUE_MANO_ADMIN',
]

const FUNCIONES_ASENTAR = [
  'estadoAsentarVacio', 'esFormAsentado', 'empresasParaAsentar', 'unidadDelForm', 'esTaller',
  'htmlMarcaEmpresa', 'htmlEmpresas', 'textoSaldoCliente', 'htmlOpcionClienteAsentar', 'htmlClientesAsentar',
  'clientesDeLaEmpresa', 'buscarClientesAsentar', 'alEscribirClienteAsentar', 'soltarClienteAsentar', 'elegirEmpresa',
  'elegirClienteAsentar', 'cambiarClienteAsentar', 'proyectosDelClienteCob', 'htmlProyectoAsentar', 'faltaProyectoAsentar',
  'proyectoParaBase', 'cargarProyectosAsentar', 'ponerLogosEmpresas', 'pintarAsentar', 'alTocarEnAsentar', 'alElegirProyecto',
  'textoCobranzaAsentada', 'subirCobranzaAsentada',
  // El apodo que coincidió (02/10/2026)
  'normalizarApodo', 'apodoQueCoincide',
  'ordenarUnidades', 'logoUnidad', 'nombreCorto', 'inicialesDe',
  ...FUNCIONES_PAGO,
]
const CONSTANTES_ASENTAR = [
  'MS_BUSCAR_CLIENTE', 'MIN_LETRAS_CLIENTE', 'TOPE_CLIENTES_BUSCADOS', 'ETIQUETA_ESTADO_PROYECTO_COB',
  'MARCA_FABRICA', 'NOMBRE_CORTO', 'ORDEN_PREFIJO',
  ...CONSTANTES_PAGO,
]

const FUNCIONES = [
  'escCob', 'dvBcra', 'escribirImporteEnCampo', 'formatearImporte',
  'normalizarCliente', 'hoyArgentina', 'esFechaIso', 'diasEntre', 'formatearFechaCob',
  'momentoArgentina', 'fechaDeMomentoAr', 'erroresDeCheque', 'nombreBanco', 'nombreBancoDe', 'tieneTarea',
  'htmlFilaCobranza', 'unidadDeCobranza', 'htmlDetalle', 'htmlChequeDetalle', 'htmlAccionesDetalle',
  'htmlHistorial', 'resumirCambios', 'htmlTarjetaCheque', 'chequeParaBase',
  'textoDiasHastaPago', 'htmlDatosCheque',
  'textoOpcional', 'origenDatosDe', 'estadoRenglon', 'aplicarRenglones', 'chequeVacio',
  'pintarEstadoFotos', 'pintarBotonChequeMano', 'htmlAvisoFoto', 'fotoLeidaSinProblemas', 'fotoSinSenal', 'textoLecturaFoto',
  'textoChequesLeidos', 'hayFotosLeyendo', 'asegurarContadorLecturas', 'detenerContadorLecturas', 'tickLecturas',
  'pintarBannerLocal', 'renderizarChipsEstado', 'cargarRepartidores', 'pintarRepartidores',
  'pintarTotalYGuardado', 'motivosParaNoGuardar', 'efectivoDelFormulario', 'totalDelFormulario',
  'renglonComoImpreso', 'chequeDesdeBase', 'chequeDesdeOcr',
  // La cartera de cheques se mudó a modulos/cheques.html (22/09/2026): acá
  // quedan los accesos y el link directo que usa Cheques para volver.
  'textoSalidaCheque', 'textoHistorialCheque',
  'pintarAccesoCheques', 'htmlLinkChequeEnCartera', 'destinoVolver', 'textoVolver',
  'leerLinkDirecto', 'urlSinLinkDirecto', 'abrirLinkDirecto', 'volverDelDetalle',
  'pintarBotonVolver', 'irAtrasDelDetalle',
  'abrirModalMotivo', 'cerrarModalMotivo',
  // Los caminos del error de la base, que se tienen que mostrar TAL CUAL
  'subirCobranza', 'guardarCobranza', 'esErrorDeRed', 'accionSimple',
  // Cifras de cabecera del listado
  'numeroDeResumen', 'htmlResumen', 'parametrosResumen',
  // E-cheques y transferencias (30/09/2026)
  'sumaDeImportes', 'totalConTransferencias', 'htmlTransferenciasDetalle', 'htmlEtiquetaForma', 'totalesPorForma', 'sumaImportes', 'erroresDeEcheque', 'erroresDeTransferencia', 'pintarResumenFormas', 'htmlResumenFormas', 'usaCobranzaCompleta', 'echequeParaBase', 'transferenciaParaBase', 'pintarFormasNuevas', 'htmlEcheckForm', 'htmlTransferenciaForm', 'cuentasParaElegir', 'htmlOpcionesCuentas', 'nombreUnidadCob', 'echequeDesdeBase', 'transferenciaDesdeBase', 'nombresDeCuentas', 'formasPresentes', 'htmlLineaFormas', 'cargarFormasDe', 'formasDeFila',
  ...FUNCIONES_ASENTAR,
]

const CONSTANTES = [
  'ACENTOS_COB', 'SIN_ACENTOS_COB', 'ZONA_AR', 'DIAS_MAXIMO_DIFERIDO', 'ETIQUETA_ESTADO_COBRANZA', 'ESTADOS_COBRANZA',
  'puedeCargar', 'puedeVerTodo', 'puedeProcesar', 'puedeEditarAnular', 'esPropia', 'puedeVerCartera',
  'ETIQUETA_ESTADO_CHEQUE', 'UUID_COB', 'SEGUNDOS_LECTURA_LENTA', 'TEXTO_BOTON_CHEQUE_MANO',
  ...CONSTANTES_ASENTAR,
]

const PRELUDIO = `
  ${fuenteNumeros()}
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
  // La URL de la página y el historial, para el link directo. irAtrasDelDetalle
  // navega con window.location.href: queda en location.href.
  var location = {
    href: 'https://cucuruchosnuss-gastos.github.io/seis-destinos/modulos/cobranzas.html',
    search: '', origin: 'https://cucuruchosnuss-gastos.github.io',
  }
  var history = { state: null, replaceState(st, t, u) { __llamadas.replace.push(u); __llamadas.orden.push('replace') } }
  var window = { scrollTo(){}, confirm: () => true, prompt: () => null, location }
  var navigator = { onLine: true }
  // El contador de la lectura de fotos es un let del módulo: extraerConst
  // solo toma const, así que se declara acá.
  var contadorLecturas = null

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
  function mostrarVistaCob(v){ __llamadas.vistas.push(v) } async function refrescarListado(){ __llamadas.refrescar++ }
  function guardarBorrador(){} function conectarTarjetasCheque(){}
  function cargarCobranzas(){} function conectarDetalle(){}
  async function urlDeFoto(){ return null } function abrirVisor(){}
  function abrirFormularioLocal(){} function refrescarLocales(){}
  function dbBorrar(){} function hayFiltrosPuestos(){ return false }
  // Lo que se llamó, para afirmarlo: abrirDetalle, la vista pedida, los
  // toasts, los refrescos y el replaceState del link directo.
  var __llamadas = { abrirDetalle: [], vistas: [], errores: [], exitos: [], refrescar: 0, replace: [], orden: [] }
  function abrirDetalle(id, op){ __llamadas.abrirDetalle.push([id, op]); __llamadas.orden.push('abrir') }
  // js/barra-unidad.js tiene su propio estado: se stubea.
  var __barra = []
  function pasarBarraAUnidad(id){ __barra.push(id); return true }

  var estado = {
    sesion: { user: { id: 'uid-de-prueba' } },
    miEmpleadoId: 'emp-1', miRolApp: 'usuario',
    misTareas: new Set(['cobranzas:cargar', 'cobranzas:ver_todo', 'cobranzas:procesar']),
    bancos: new Map(), repartidores: [], cobranzas: [], hayMas: false,
    filtros: { texto: '', desde: '', hasta: '', estado: '', repartidor: '' },
    detalle: null, form: null, locales: [], urlsFirmadas: new Map(), sincronizando: false,
    linkDirecto: null, cobranzaSeleccionadaId: null,
    fabrica: FABRICA_SIN_DATOS,
  }
`

// El <script type="module"> del HTML MÁS lo que importa de
// js/cobranzas-comun.js y no declara por su cuenta (22/09/2026): las funciones
// compartidas entre Cobranzas y Cheques ya no están en el HTML, y el sandbox
// tiene que cargar el código REAL que corre en el navegador.
function scriptDe(html) {
  const ini = html.indexOf('<script type="module">')
  const fin = html.indexOf('</script>', ini)
  if (ini === -1 || fin === -1) throw new Error('no se encontró el <script type="module">')
  return html.slice(ini, fin)
}

// `recortar` (opcional): una función que achica el archivo antes de buscar el
// script. La cartera de cheques vive en una REGIÓN de administracion.html
// (fuente-cheques.js): su script es el que está adentro de la región.
function scriptModulo(rutaHtml, recortar = null) {
  const contenido = fs.readFileSync(rutaHtml, 'utf8')
  return fuenteConComun(scriptDe(recortar ? recortar(contenido) : contenido))
}

// Extraer las funciones de un HTML de miles de líneas y compilarlas cuesta, y
// una suite arma DIEZ o VEINTE sandboxes del mismo archivo para no compartir
// estado entre casos. Lo que se cachea es la FUNCIÓN COMPILADA, no el sandbox:
// cada llamada a `new Function(...)` ya compilada crea un scope nuevo, así que
// los sandboxes siguen siendo independientes y nada se comparte entre casos.
//
// LA CLAVE ES EL CONTENIDO DEL ARCHIVO, no su ruta ni su fecha. El runner de
// mutaciones escribe un archivo distinto por mutación y a veces en el mismo
// milisegundo: con una clave por ruta o por mtime, una mutación se probaría
// contra el código de la anterior y "no se detectaría" sin que nada avise —
// que es exactamente la clase de falla que este andamio existe para encontrar.
const _compiladas = new Map()

function _clave(contenido, config) {
  return require('crypto').createHash('sha1').update(contenido).update('\u0000').update(config).digest('hex')
}

// La variante GENÉRICA, para cualquier módulo: el preludio (el document falso y
// los stubs), las funciones y las constantes las pone cada suite. `retorno` se
// suma al objeto que devuelve el sandbox, además de las funciones.
function construirCon(rutaHtml, { preludio, funciones, constantes = [], retorno = '', recortar = null }) {
  const leido = fs.readFileSync(rutaHtml, 'utf8')
  const contenido = recortar ? recortar(leido) : leido
  const config = JSON.stringify([preludio, funciones, constantes, retorno])
  const clave = _clave(contenido, config)
  let compilada = _compiladas.get(clave)
  if (!compilada) {
    const src = fuenteConComun(scriptDe(contenido))
    let codigo = preludio
    for (const c of constantes) codigo += extraerConst(src, c) + '\n'
    for (const f of funciones) codigo += extraerFn(src, f) + '\n\n'
    codigo += `return { ${funciones.join(', ')}${retorno ? ', ' + retorno : ''} }`
    compilada = new Function(codigo)
    _compiladas.set(clave, compilada)
  }
  // Ejecutar el sandbox es lo que prueba que ningún helper falte: una función
  // sin definir tira ReferenceError acá, no en producción. Corre en CADA
  // construcción, también cuando la función ya venía compilada.
  return compilada()
}

function construir(rutaHtml) {
  return construirCon(rutaHtml, {
    preludio: PRELUDIO, funciones: FUNCIONES, constantes: CONSTANTES,
    retorno: `estado, __els, __doc: document, __llamadas, __location: location, __set(r){ __repartidoresFalsos = r }, __setError(e){ __errorFalso = e }, __setRpc(f){ __rpc = f }, __accion(){ return accionDelModal }`,
  })
}

module.exports = { construir, construirCon, scriptModulo, FUNCIONES, CONSTANTES, FUNCIONES_ASENTAR, CONSTANTES_ASENTAR, FUNCIONES_PAGO, CONSTANTES_PAGO }
