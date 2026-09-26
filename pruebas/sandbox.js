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

const FUNCIONES = [
  'escCob', 'dvBcra', 'escribirImporteEnCampo', 'formatearImporte',
  'normalizarCliente', 'hoyArgentina', 'esFechaIso', 'diasEntre', 'formatearFechaCob',
  'momentoArgentina', 'fechaDeMomentoAr', 'erroresDeCheque', 'nombreBanco', 'nombreBancoDe', 'tieneTarea',
  'htmlFilaCobranza', 'htmlDetalle', 'htmlChequeDetalle', 'htmlAccionesDetalle',
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
]

const CONSTANTES = [
  'ACENTOS_COB', 'SIN_ACENTOS_COB', 'ZONA_AR', 'DIAS_MAXIMO_DIFERIDO', 'ETIQUETA_ESTADO_COBRANZA', 'ESTADOS_COBRANZA',
  'puedeCargar', 'puedeVerTodo', 'puedeProcesar', 'puedeEditarAnular', 'esPropia', 'puedeVerCartera',
  'ETIQUETA_ESTADO_CHEQUE', 'UUID_COB', 'SEGUNDOS_LECTURA_LENTA', 'TEXTO_BOTON_CHEQUE_MANO',
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

function scriptModulo(rutaHtml) {
  return fuenteConComun(scriptDe(fs.readFileSync(rutaHtml, 'utf8')))
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
function construirCon(rutaHtml, { preludio, funciones, constantes = [], retorno = '' }) {
  const contenido = fs.readFileSync(rutaHtml, 'utf8')
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

module.exports = { construir, construirCon, scriptModulo, FUNCIONES, CONSTANTES }
