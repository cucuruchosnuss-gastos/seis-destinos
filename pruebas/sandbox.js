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
]

const CONSTANTES = [
  'ACENTOS_COB', 'SIN_ACENTOS_COB', 'ZONA_AR', 'DIAS_MAXIMO_DIFERIDO', 'ESTADOS_COBRANZA',
  'puedeCargar', 'puedeVerTodo', 'puedeProcesar', 'puedeEditarAnular', 'esPropia',
]

const PRELUDIO = `
  // --- DOM falso -------------------------------------------------------
  function nuevoEl(id) {
    return {
      id, innerHTML: '', textContent: '', value: '', className: '', hidden: false,
      disabled: false, max: '', dataset: {}, src: '',
      querySelectorAll: () => [],
      querySelector: () => null,
      addEventListener: () => {},
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
  var supabase = {
    from() {
      const q = {
        select: () => q, eq: () => q, in: () => q, order: () => q, range: () => q,
        like: () => q, gte: () => q, lte: () => q, maybeSingle: () => q,
        then(res) { return Promise.resolve({ data: __repartidoresFalsos, error: null }).then(res) },
      }
      return q
    },
    rpc: async () => ({ data: null, error: null }),
    storage: { from: () => ({ createSignedUrl: async () => ({ data: null, error: new Error('sin red') }) }) },
    functions: { invoke: async () => ({ data: null, error: new Error('sin red') }) },
  }
  function mostrarError(){} function mostrarExito(){}
  function guardarBorrador(){} function conectarTarjetasCheque(){}
  function cargarCobranzas(){} function conectarDetalle(){}
  async function urlDeFoto(){ return null } function abrirVisor(){}
  function abrirFormularioLocal(){} function refrescarLocales(){}
  function dbBorrar(){} function hayFiltrosPuestos(){ return false }

  var estado = {
    sesion: { user: { id: 'uid-de-prueba' } },
    miEmpleadoId: 'emp-1', miRolApp: 'usuario',
    misTareas: new Set(['cobranzas:cargar', 'cobranzas:ver_todo', 'cobranzas:procesar']),
    bancos: new Map(), repartidores: [], cobranzas: [], hayMas: false,
    filtros: { texto: '', desde: '', hasta: '', estado: '', repartidor: '' },
    detalle: null, form: null, locales: [], urlsFirmadas: new Map(), sincronizando: false,
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
  codigo += `return { ${FUNCIONES.join(', ')}, estado, __els, __set(r){ __repartidoresFalsos = r } }`

  // Ejecutar el sandbox es lo que prueba que ningún helper falte: un escCob()
  // sin definir tira ReferenceError acá, no en producción.
  return new Function(codigo)()
}

module.exports = { construir, FUNCIONES, CONSTANTES }
