// "¿CÓMO PAGÓ?" — los cuatro botones de Cobranzas (02/10/2026), en
// modulos/cobranzas.html:
//  - la EMPRESA no viene marcada aunque la barra de arriba tenga una, y al
//    tocarla la barra pasa a esa (pasarBarraAUnidad, stubeada);
//  - cuatro botones grandes: Efectivo, Cheque, E-cheque y Transferencia; el
//    chofer ve solo Efectivo y Cheque; tocar uno abre su sección, se pueden
//    abrir varias y una vacía se cierra; al editar, las que tienen datos
//    vienen abiertas;
//  - el chofer NO ve "Cargar a mano" en cheques; quien controla sí, y carga
//    un cheque sin foto;
//  - transferencias con banco de origen, quién transfirió, CUIT (se avisa si
//    no cierra), número de operación y la cuenta de ESA empresa;
//  - comprobantes (foto, galería, archivo; imagen o PDF) que lee el lector
//    nuevo: lo leído se PROPONE, 'ocr' si no se tocó y 'ocr_corregido' si se
//    cambió algo; si el lector falla, una tarjeta vacía con el comprobante;
//  - un PDF de más de 10 MB avisa y no se sube; las imágenes se comprimen a
//    JPEG (el PNG también);
//  - dos transferencias y tres cheques en una misma cobranza viajan enteros.
// Se EJECUTAN las funciones reales del módulo, con un DOM falso que sí
// devuelve los elementos de los querySelectorAll.
//
//   node pruebas/test-cobranzas-cuatro-botones.js
// Archivo bajo prueba: ARCHIVO_TEST, o modulos/cobranzas.html.

const fs = require('fs')
const path = require('path')
const { construirCon, FUNCIONES_ASENTAR, CONSTANTES_ASENTAR } = require('./sandbox')
const { fuenteNumeros } = require('./numeros-comun')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/cobranzas.html')
const FUENTE = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${FUENTE.length} bytes)`)

let ok = 0
const fallas = []
function chk(nombre, condicion, detalle) {
  if (condicion) ok++
  else fallas.push(nombre + (detalle !== undefined ? ` — ${String(detalle).slice(0, 400)}` : ''))
}

const PRELUDIO = `
  ${fuenteNumeros()}
  var console = { error(){}, log(){}, warn(){} }
  function nuevoEl(id, dataset = {}) {
    const atributos = {}
    return {
      id, innerHTML: '', textContent: '', value: '', className: '', hidden: false,
      disabled: false, dataset, src: '', max: '', __clicks: 0,
      querySelectorAll: () => [], querySelector: () => null,
      addEventListener(){}, focus(){ __foco.push(id) }, click(){ this.__clicks++ },
      setAttribute(k, v){ atributos[k] = String(v) }, getAttribute(k){ return atributos[k] ?? null },
      classList: { add(){}, remove(){}, toggle(){} },
    }
  }
  var __foco = []
  var __els = new Map()
  // Los elementos con data-* del HTML que los querySelectorAll tienen que ver.
  var __porSelector = {
    '[data-abrir-forma]': ['efectivo', 'cheque', 'echeque', 'transferencia'].map(f => nuevoEl('btn-' + f, { abrirForma: f })),
    '[data-cerrar-forma]': ['efectivo', 'cheque', 'echeque', 'transferencia'].map(f => nuevoEl('cerrar-' + f, { cerrarForma: f })),
    '[data-acciones-comprobante]': ['echeque', 'transferencia'].map(f => nuevoEl('acc-' + f, { accionesComprobante: f })),
    '[data-ayuda-comprobante]': ['echeque', 'transferencia'].map(f => nuevoEl('ayu-' + f, { ayudaComprobante: f })),
  }
  var document = {
    getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) },
    querySelectorAll: (sel) => __porSelector[sel] ?? [],
    querySelector: () => null,
  }
  var navigator = { onLine: true }
  var crypto = { randomUUID: (() => { let n = 0; return () => '00000000-0000-4000-8000-' + String(++n).padStart(12, '0') })() }
  var window = { open(u, t, o){ __abiertas.push([u, t, o]) } }
  var __abiertas = []
  function setImmediate(f){ return Promise.resolve().then(f) }

  var __rpcs = []
  var __rpcImpl = async () => ({ data: { id: 'x', ya_existia: false }, error: null })
  var __subidas = []
  var __invocaciones = []
  var __invokeImpl = async () => ({ data: null, error: new Error('sin lector') })
  var supabase = {
    from: () => { const q = {}; for (const op of ['select','eq','in','order','range','like','gte','lte','or','maybeSingle']) q[op] = () => q; q.then = (r) => Promise.resolve({ data: [], error: null }).then(r); return q },
    rpc: (n, p) => { __rpcs.push({ nombre: n, params: p }); return __rpcImpl(n, p) },
    storage: { from: (b) => ({
      upload: async (ruta, blob, op) => { __subidas.push({ bucket: b, ruta, tipo: op?.contentType, tam: blob?.size }); return { error: null } },
      createSignedUrl: async () => ({ data: { signedUrl: 'https://firmada/x' }, error: null }),
    }) },
    functions: { invoke: (nombre, op) => { __invocaciones.push({ nombre, body: op?.body }); return __invokeImpl(nombre, op) } },
  }

  var __llamadas = { exitos: [], errores: [], vistas: [], subtitulos: [], visor: [] }
  function mostrarExito(m){ __llamadas.exitos.push(m) } function mostrarError(m){ __llamadas.errores.push(m) }
  function mostrarVistaCob(v, o){ __llamadas.vistas.push(v); __llamadas.subtitulos.push(o?.subtitulo ?? null) }
  function guardarBorrador(){}
  function pintarCheques(){} function iniciarReintentosFotos(){} function asegurarContadorLecturas(){}
  function escribirImporteEnCampo(){}
  async function dbBorrar(){} async function refrescarListado(){} async function refrescarLocales(){}
  async function urlDeFoto(foto){ return foto ? 'https://firmada/' + foto.id : null }
  function abrirVisor(foto, t){ __llamadas.visor.push([foto?.id, t]) }
  function hoyArgentina(){ return '2026-10-02' }
  var STORE_BORRADORES = 'borradores'
  // js/barra-unidad.js tiene su propio estado: se stubea y se anota.
  var __barra = []
  function pasarBarraAUnidad(id){ __barra.push(id); return true }
  // La compresión necesita un canvas: se stubea (devuelve un JPEG de 300 KB).
  var __comprimidas = []
  async function comprimirFoto(a){ __comprimidas.push(a.type); return { size: 300 * 1024, type: 'image/jpeg' } }
  function procesarFotoReal(){}

  var estado = {
    sesion: { user: { id: 'uid' } },
    miEmpleadoId: 'emp-1', miRolApp: 'usuario',
    misTareas: new Set(['cobranzas:cargar']),
    bancos: new Map([['007', 'Galicia'], ['285', 'Macro']]), unidades: [], form: null, detalle: null,
    unidadElegida: null, fabrica: FABRICA_SIN_DATOS, fabricaLista: true, asentar: null,
    cuentasBancoLista: [], cuentasBanco: new Map(),
  }
`

const FUNCIONES = [
  'escCob', 'formatearImporte', 'esFechaIso', 'diasEntre', 'formatearFechaCob', 'nombreBanco', 'nombreBancoDe',
  'tieneTarea', 'textoOpcional', 'chequeParaBase', 'origenDatosDe', 'chequeVacio', 'chequeDesdeBase', 'renglonComoImpreso',
  'formularioVacio', 'pintarFormulario', 'pintarBotonChequeMano', 'abrirFormularioNuevo', 'abrirFormularioEdicion', 'guardarCobranza',
  'htmlEtiquetaForma', 'erroresDeEcheque', 'echequeParaBase', 'echequeDesdeBase', 'erroresDeCheque', 'dvBcra',
  'erroresDeTransferencia', 'transferenciaParaBase', 'transferenciaDesdeBase', 'nombresDeCuentas',
  'sumaImportes', 'totalesPorForma', 'usaCobranzaCompleta', 'cuentasParaElegir', 'htmlDatosCheque', 'textoDiasHastaPago',
  'nombreUnidadCob', 'htmlOpcionesCuentas', 'htmlEcheckForm', 'htmlTransferenciaForm', 'pintarFormasNuevas',
  'pintarResumenFormas', 'htmlResumenFormas', 'echeckDelForm', 'transfDelForm', 'agregarEcheck', 'agregarTransferencia',
  'quitarEcheck', 'quitarTransferencia', 'actualizarEcheck', 'actualizarTransferencia', 'pintarErroresForma',
  'alEscribirEnFormas', 'alTocarEnFormas',
  'totalDelFormulario', 'efectivoDelFormulario', 'motivosParaNoGuardar', 'pintarTotalYGuardado',
  'subirCobranza', 'esErrorDeRed', 'normalizarCliente', 'momentoArgentina',
  'agregarFotos', 'procesarFoto', 'marcarFotoEnMemoria', 'mensajeDelLector', 'pintarEstadoFotos', 'htmlAvisoFoto',
  'fotoLeidaSinProblemas', 'fotoSinSenal', 'textoLecturaFoto', 'textoChequesLeidos', 'chequeDesdeOcr', 'aplicarRenglones',
  'agregarChequeAMano',
  ...FUNCIONES_ASENTAR,
]
const CONSTANTES = [
  'ZONA_AR', 'ACENTOS_COB', 'SIN_ACENTOS_COB', 'DIAS_MAXIMO_DIFERIDO', 'ETIQUETA_ESTADO_COBRANZA', 'ETIQUETA_ESTADO_CHEQUE',
  'puedeCargar', 'puedeVerTodo', 'puedeProcesar', 'puedeEditarAnular', 'TEXTO_BOTON_CHEQUE_MANO', 'SEGUNDOS_LECTURA_LENTA',
  'MAX_INTENTOS_LECTOR',
  ...CONSTANTES_ASENTAR,
]

const NUSS = { id: 'u-nuss', nombre: 'Cucuruchos Nuss', activo: true, prefijo: 'N', logo_url: null }
const DOLCE = { id: 'u-dolce', nombre: 'Dolce Pasta', activo: true, prefijo: 'D', logo_url: null }
const CUENTAS = [
  { id: 'cta-nuss', nombre: 'Macro Nuss', unidad_negocio_id: 'u-nuss' },
  { id: 'cta-dolce', nombre: 'Galicia Dolce', unidad_negocio_id: 'u-dolce' },
]
const CHOFER = { tareas: ['cargar'] }
const ADMIN = { tareas: ['cargar', 'ver_todo', 'procesar'] }

function sandbox({ tareas = ['cargar'], barra = null } = {}) {
  const S = construirCon(ARCHIVO, {
    preludio: PRELUDIO, funciones: FUNCIONES, constantes: CONSTANTES,
    retorno: `estado, __els, __llamadas, __porSelector, __foco,
      __rpcs(){ return __rpcs }, __setRpc(f){ __rpcImpl = f }, __subidas(){ return __subidas },
      __invocaciones(){ return __invocaciones }, __setInvoke(f){ __invokeImpl = f },
      __barra(){ return __barra }, __comprimidas(){ return __comprimidas }, __abiertas(){ return __abiertas }`,
  })
  S.estado.misTareas = new Set(tareas.map(t => 'cobranzas:' + t))
  S.estado.unidades = [NUSS, DOLCE]
  S.estado.unidadElegida = barra
  S.estado.cuentasBancoLista = CUENTAS
  S.estado.cuentasBanco = new Map(CUENTAS.map(c => [c.id, c]))
  S.__setRpc(async (n, p) => n === 'buscar_clientes'
    ? { data: [{ cliente_id: 'c-jm', nombre: 'J&M', unidad_negocio_id: p.p_unidad_negocio_id, activo: true, saldo: 0 }], error: null }
    : { data: { id: 'x', ya_existia: false, asentada: true }, error: null })
  return S
}
const el = (S, id) => S.__els.get(id) ?? { hidden: undefined, innerHTML: '', textContent: '' }
const boton = (S, sel, forma) => S.__porSelector[sel].find(b => Object.values(b.dataset)[0] === forma)
const esperar = async (n = 8) => { for (let i = 0; i < n; i++) await new Promise(r => setImmediate(r)) }

// Un cheque de papel válido y confirmado, vinculado a una foto.
function chequePapel(S, fotoId, numero, dv) {
  return Object.assign(S.chequeVacio(fotoId), {
    banco_codigo: '007', sucursal_codigo: '386', codigo_postal: '3218', dv_ruta: 6,
    numero, dv_numero: dv, cuenta: '09420314667', dv_cuenta: 0,
    tipo: 'comun', fecha_emision: '2026-09-20', importe: '1.000,00', confirmado: true,
  })
}

const MAL = '"><b data-xss="pago">'
const MAL_ESC = '&quot;&gt;&lt;b data-xss=&quot;pago&quot;&gt;'

async function pruebas() {
  // ══ 1. LA EMPRESA NO VIENE MARCADA Y ELEGIRLA CAMBIA LA BARRA ══════════════
  {
    const S = sandbox({ ...ADMIN, barra: 'u-dolce' })
    S.abrirFormularioNuevo()
    await esperar()
    chk('empresa: no viene marcada aunque la barra tenga Dolce Pasta', S.estado.form.unidad_id === null)
    chk('empresa: ningún botón aparece apretado', !/aria-pressed="true"/.test(el(S, 'cob-empresas').innerHTML) && /data-empresa="u-dolce" aria-pressed="false"/.test(el(S, 'cob-empresas').innerHTML))
    chk('empresa: no se buscan clientes hasta elegirla', !S.__rpcs().some(r => r.nombre === 'buscar_clientes'))
    chk('empresa: el rótulo pregunta "¿De qué empresa es la cobranza?"', /id="cob-rotulo-empresa">¿De qué empresa es la cobranza\?</.test(FUENTE))
    S.elegirEmpresa('u-nuss')
    await esperar()
    chk('empresa: elegirla cambia la barra de arriba a esa', JSON.stringify(S.__barra()) === '["u-nuss"]', JSON.stringify(S.__barra()))
    chk('empresa: y después vienen sus clientes', S.__rpcs().some(r => r.nombre === 'buscar_clientes' && r.params.p_unidad_negocio_id === 'u-nuss'))
    chk('el chofer no elige empresa: escribe el cliente', (() => { const C = sandbox(CHOFER); C.abrirFormularioNuevo(); return C.estado.form.asentar !== true && el(C, 'cob-asentar').hidden === true && el(C, 'cob-campo-cliente-libre').hidden === false })())
    chk('fuente: elegirEmpresa llama a pasarBarraAUnidad y la importa', /pasarBarraAUnidad\(id\)/.test(FUENTE) && /import \{[^}]*pasarBarraAUnidad[^}]*\} from '\.\.\/js\/barra-unidad\.js'/.test(FUENTE))
  }

  // ══ 2. LOS CUATRO BOTONES ══════════════════════════════════════════════════
  {
    const C = sandbox(CHOFER)
    C.abrirFormularioNuevo()
    chk('chofer: ve Efectivo y Cheque', boton(C, '[data-abrir-forma]', 'efectivo').hidden === false && boton(C, '[data-abrir-forma]', 'cheque').hidden === false)
    chk('chofer: NO ve E-cheque ni Transferencia', boton(C, '[data-abrir-forma]', 'echeque').hidden === true && boton(C, '[data-abrir-forma]', 'transferencia').hidden === true)
    chk('chofer: NO ve "Cargar a mano" en cheques', el(C, 'cob-btn-cheque-mano').textContent === '+ Agregar un cheque que no se leyó' && !/Cargar a mano/.test(el(C, 'cob-btn-cheque-mano').textContent))
    chk('chofer: sin foto, agregar un cheque queda deshabilitado', el(C, 'cob-btn-cheque-mano').disabled === true && el(C, 'cob-ayuda-cheque-mano').hidden === false)
    chk('chofer: sin tocar nada, ninguna sección de pago abierta', ['cob-seccion-efectivo', 'cob-seccion-cheques', 'cob-seccion-echecks', 'cob-seccion-transferencias'].every(id => el(C, id).hidden === true))
    C.abrirForma('echeque'); C.abrirForma('transferencia')
    chk('chofer: abrirForma de E-cheque / Transferencia no hace nada', el(C, 'cob-seccion-echecks').hidden === true && el(C, 'cob-seccion-transferencias').hidden === true && !C.estado.form.abiertas.echeque)
    chk('chofer: las acciones de comprobantes ocultas', C.__porSelector['[data-acciones-comprobante]'].every(b => b.hidden === true))
    C.abrirForma('efectivo')
    chk('tocar Efectivo abre su sección y el botón queda apretado', el(C, 'cob-seccion-efectivo').hidden === false &&
      boton(C, '[data-abrir-forma]', 'efectivo').getAttribute('aria-pressed') === 'true')
    chk('al abrir Efectivo, el foco va al importe', C.__foco.includes('cob-efectivo'))
    C.abrirForma('cheque')
    chk('se pueden abrir varias a la vez', el(C, 'cob-seccion-efectivo').hidden === false && el(C, 'cob-seccion-cheques').hidden === false)
    chk('una abierta y vacía muestra "Cerrar"', boton(C, '[data-cerrar-forma]', 'efectivo').hidden === false)
    C.cerrarForma('efectivo')
    chk('cerrar una vacía la esconde', el(C, 'cob-seccion-efectivo').hidden === true && boton(C, '[data-abrir-forma]', 'efectivo').getAttribute('aria-pressed') === 'false')
    C.abrirForma('cheque')
    chk('tocar el botón de una abierta y vacía la cierra', el(C, 'cob-seccion-cheques').hidden === true)
    C.abrirForma('efectivo')
    C.estado.form.efectivo = '1.500,00'
    C.pintarFormasPago()
    chk('con datos, "Cerrar" desaparece', boton(C, '[data-cerrar-forma]', 'efectivo').hidden === true)
    C.cerrarForma('efectivo'); C.abrirForma('efectivo')
    chk('con datos no se cierra (ni con Cerrar ni con su botón)', el(C, 'cob-seccion-efectivo').hidden === false)
    chk('lo abierto queda en el borrador (f.abiertas)', C.estado.form.abiertas.efectivo === true)
    chk('la elección de alTocarFormasPago llega por data-abrir-forma', (() => {
      const D = sandbox(CHOFER); D.abrirFormularioNuevo()
      D.alTocarFormasPago({ target: { closest: () => ({ dataset: { abrirForma: 'cheque' } }) } })
      D.alTocarCerrarForma({ target: { closest: () => ({ dataset: { cerrarForma: 'cheque' } }) } })
      return D.estado.form.abiertas.cheque === false
    })())

    const A = sandbox(ADMIN)
    A.abrirFormularioNuevo()
    chk('admin: ve los cuatro', A.__porSelector['[data-abrir-forma]'].every(b => b.hidden === false))
    chk('admin: "Cargar a mano" en cheques, habilitado sin foto', /Cargar a mano/.test(el(A, 'cob-btn-cheque-mano').textContent) && el(A, 'cob-btn-cheque-mano').disabled === false && el(A, 'cob-ayuda-cheque-mano').hidden === true)
    A.abrirForma('transferencia')
    chk('admin: abrir Transferencia muestra su sección y el contenedor', el(A, 'cob-seccion-transferencias').hidden === false && el(A, 'cob-seccion-formas').hidden === false && el(A, 'cob-seccion-echecks').hidden === true)
    chk('admin: las acciones de comprobantes se ven', A.__porSelector['[data-acciones-comprobante]'].every(b => b.hidden === false))
    chk('admin: sin el aviso de "Los cargó Administración"', el(A, 'cob-formas-aviso').hidden === true)
    A.agregarTransferencia()
    chk('admin: con una transferencia, la ayuda invita a "+ Otra transferencia"', /^\+ Otra transferencia/.test(boton(A, '[data-ayuda-comprobante]', 'transferencia').textContent))
    chk('admin: sin e-cheques, la ayuda de e-cheques es la primera', /^La captura del banco/.test(boton(A, '[data-ayuda-comprobante]', 'echeque').textContent))
    // Cargar un cheque a mano sin foto (Administración).
    await A.agregarChequeAMano()
    const chA = A.estado.form.cheques[0]
    chk('admin: "Cargar a mano" sin fotos agrega un cheque sin foto', chA && chA.foto_id === null && A.estado.form.abiertas.cheque === true)
    chk('admin: a un cheque sin foto no le falta la foto', !A.erroresDeCheque(A.chequeParaBase(chequePapel(A, null, '66259862', 8))).some(e => /foto/.test(e)))
    chk('chofer: a un cheque sin foto le falta la foto', C.erroresDeCheque(C.chequeParaBase(chequePapel(C, null, '66259862', 8))).some(e => /foto/.test(e)))
    const C2 = sandbox(CHOFER); C2.abrirFormularioNuevo()
    await C2.agregarChequeAMano()
    chk('chofer: sin foto, agregar un cheque a mano no agrega nada y avisa', C2.estado.form.cheques.length === 0 && C2.__llamadas.errores.some(m => /Primero sacá la foto/.test(m)))
  }

  // ══ 3. EDITAR: LAS SECCIONES CON DATOS VIENEN ABIERTAS ═════════════════════
  {
    const A = sandbox(ADMIN)
    const f = A.formularioVacio('e1')
    f.modo = 'edicion'
    f.fotos = [{ id: 'fc', storage_path: 'uid/e1/fc.jpg', tipo: 'cheque', subida: true, leida: true, enBase: true }]
    f.cheques = [chequePapel(A, 'fc', '66259862', 8)]
    f.transferencias = [Object.assign(A.transferenciaVacia('2026-10-01'), { cuenta_id: 'cta-nuss', importe: 500 })]
    A.estado.form = f
    A.pintarFormulario()
    chk('editar: Cheque y Transferencia (con datos) vienen abiertas', el(A, 'cob-seccion-cheques').hidden === false && el(A, 'cob-seccion-transferencias').hidden === false)
    chk('editar: Efectivo y E-cheque (sin datos) cerradas', el(A, 'cob-seccion-efectivo').hidden === true && el(A, 'cob-seccion-echecks').hidden === true)
    chk('editar: sus botones aparecen apretados', boton(A, '[data-abrir-forma]', 'cheque').getAttribute('aria-pressed') === 'true' && boton(A, '[data-abrir-forma]', 'efectivo').getAttribute('aria-pressed') === 'false')
    chk('fuente: la edición lee tipo y mime de las fotos y los datos nuevos de las transferencias',
      /select\('id, storage_path, ocr_crudo, ocr_modelo, tipo, mime'\)/.test(FUENTE) &&
      /select\('id, cuenta_id, importe, fecha, referencia, banco_origen, ordenante, cuit_ordenante, foto_id, origen_datos, ocr_propuesto'\)/.test(FUENTE))
    const C = sandbox(CHOFER)
    const fc = C.formularioVacio('e2')
    fc.modo = 'edicion'
    fc.echecks = [Object.assign(C.echequeVacio(), { banco_codigo: '007', numero: '00012345', importe: 700 })]
    C.estado.form = fc
    C.pintarFormulario()
    chk('chofer editando con un e-cheque de Administración: se ve, con el aviso', el(C, 'cob-seccion-echecks').hidden === false && el(C, 'cob-formas-aviso').hidden === false)
    chk('chofer editando: sin acciones para cargar comprobantes', C.__porSelector['[data-acciones-comprobante]'].every(b => b.hidden === true))
  }

  // ══ 4. TRANSFERENCIAS: LOS CAMPOS NUEVOS ═══════════════════════════════════
  {
    const A = sandbox(ADMIN)
    A.abrirFormularioNuevo()
    A.agregarTransferencia()
    const t = A.estado.form.transferencias[0]
    const h = A.htmlTransferenciaForm(t, 0, true)
    chk('transferencia: importe, fecha, banco de origen, quién transfirió, CUIT, número de operación y cuenta',
      ['importe', 'fecha', 'banco_origen', 'ordenante', 'cuit_ordenante', 'referencia', 'cuenta_id'].every(c => h.includes(`data-transf-campo="${c}"`)), h.slice(0, 200))
    chk('transferencia: el banco de origen sugiere con la lista', /list="cob-bancos-origen" data-transf-id/.test(h))
    chk('transferencia: "Número de operación" va en referencia', /<label>Número de operación<\/label>\s*<input[^>]*data-transf-campo="referencia"/.test(h))
    chk('transferencia: quién transfirió y el CUIT son opcionales', /Quién transfirió \(opcional\)/.test(h) && /CUIT de quien transfirió \(opcional\)/.test(h))
    chk('transferencia: la cuenta es la última y dice "propia"', h.indexOf('data-transf-campo="cuenta_id"') > h.indexOf('data-transf-campo="referencia"') && /Cuenta propia donde entró/.test(h))
    chk('asentada sin empresa: no se ofrece ninguna cuenta y se dice por qué', A.cuentasParaElegir('').length === 0 && /Primero elegí la empresa de la cobranza/.test(h))
    A.estado.form.unidad_id = 'u-dolce'
    chk('asentada: solo las cuentas de ESA empresa', A.cuentasParaElegir('').map(c => c.id).join(',') === 'cta-dolce')
    A.estado.unidadElegida = 'u-nuss'
    chk('asentada: la barra no cambia las cuentas que se ofrecen', A.cuentasParaElegir('').map(c => c.id).join(',') === 'cta-dolce')
    A.actualizarTransferencia(t.id, 'cuit_ordenante', '30-71943477-8')
    chk('CUIT que no cierra: se avisa (no bloquea)', A.avisoCuit(t.cuit_ordenante) !== '' && !A.erroresDeTransferencia(t).some(e => /CUIT/.test(e)))
    chk('CUIT que cierra: sin aviso', A.avisoCuit('30-71943477-7') === '')
    chk('CUIT de 10 números: no deja guardar', A.erroresDeTransferencia({ ...t, cuit_ordenante: '3071943477' }).some(e => /11 números/.test(e)))
    chk('sin CUIT: ni aviso ni error', A.avisoCuit('') === '' && !A.erroresDeTransferencia({ ...t, cuit_ordenante: '' }).some(e => /CUIT/.test(e)))
    Object.assign(t, { cuenta_id: 'cta-dolce', importe: '10.000,00', banco_origen: ' Mercado Pago ', ordenante: 'J&M', cuit_ordenante: '30-71943477-7', referencia: ' 000123 ' })
    const b = A.transferenciaParaBase(t)
    chk('para la base: banco y ordenante sin espacios, CUIT solo dígitos, referencia con sus ceros',
      b.banco_origen === 'Mercado Pago' && b.ordenante === 'J&M' && b.cuit_ordenante === '30719434777' && b.referencia === '000123' && b.importe === 10000, JSON.stringify(b))
    chk('para la base: cargada a mano es "manual", sin comprobante', b.origen_datos === 'manual' && b.foto_id === null && b.ocr_propuesto === null)
    const h2 = A.htmlTransferenciaForm({ ...t, banco_origen: MAL, ordenante: MAL, referencia: MAL, cuit_ordenante: MAL }, 0, true)
    chk('transferencia: todo texto de la persona va escapado', h2.includes(MAL_ESC) && !h2.includes(MAL))
    const h3 = A.htmlTransferenciaForm({ ...t, banco_origen: MAL, ordenante: MAL }, 0, false)
    chk('transferencia de solo lectura: "Desde" escapado', /Desde /.test(h3) && h3.includes(MAL_ESC) && !h3.includes(MAL))
  }

  // ══ 5. EL LECTOR NUEVO: PROPONE, Y 'ocr' / 'ocr_corregido' ═════════════════
  {
    const A = sandbox(ADMIN)
    A.abrirFormularioNuevo()
    const f = A.estado.form
    A.__setInvoke(async (nombre) => nombre === 'ocr-cobranza-comprobantes'
      ? { data: { ok: true, modelo: 'm', crudo: { comprobantes: [{}, {}] }, propuestos: [
        { importe: 150000, fecha: '2026-10-01', banco_origen: 'Mercado Pago', ordenante: 'J&M SRL', cuit_ordenante: '30719434777', referencia: '000123' },
        { importe: 2000, fecha: '2026-10-01', banco_origen: 'Galicia', ordenante: null, cuit_ordenante: null, referencia: '9' },
      ] }, error: null }
      : { data: null, error: new Error('otro') })
    await A.agregarFotos([{ type: 'image/png', size: 2 * 1024 * 1024, name: 'captura.png' }], 'transferencia')
    await esperar()
    const foto = f.fotos[0]
    chk('PNG: se comprime a JPEG', A.__comprimidas().includes('image/png') && foto.mime === 'image/jpeg' && /\.jpg$/.test(foto.storage_path))
    chk('el comprobante se sube al bucket "cobranzas" con su tipo de archivo', A.__subidas().some(s => s.bucket === 'cobranzas' && s.ruta === foto.storage_path && s.tipo === 'image/jpeg'))
    chk('la foto queda con tipo "transferencia"', foto.tipo === 'transferencia')
    const inv = A.__invocaciones().find(i => i.nombre === 'ocr-cobranza-comprobantes')
    chk('va al lector NUEVO con la ruta y el tipo', inv && inv.body.storage_path === foto.storage_path && inv.body.tipo === 'transferencia', JSON.stringify(A.__invocaciones()))
    chk('NO va al lector de cheques', !A.__invocaciones().some(i => i.nombre === 'ocr-cheques'))
    chk('lo leído se PROPONE: dos transferencias con los datos y el comprobante', f.transferencias.length === 2 &&
      f.transferencias[0].importe === 150000 && f.transferencias[0].banco_origen === 'Mercado Pago' && f.transferencias[0].foto_id === foto.id && f.transferencias[1].foto_id === foto.id)
    chk('la cuenta propia NO se propone: se elige', f.transferencias.every(t => t.cuenta_id === ''))
    chk('la sección de transferencias quedó abierta', el(A, 'cob-seccion-transferencias').hidden === false)
    chk('se archiva lo crudo y el modelo', foto.leida === true && foto.ocr_modelo === 'm' && foto.ocr_crudo?.comprobantes?.length === 2)
    f.unidad_id = 'u-nuss'
    f.transferencias.forEach(t => { t.cuenta_id = 'cta-nuss' })
    chk('sin tocar nada: "ocr"', A.transferenciaParaBase(f.transferencias[0]).origen_datos === 'ocr')
    chk('la tarjeta dice que se leyó del comprobante', /Leído del comprobante: revisalo/.test(A.htmlTransferenciaForm(f.transferencias[0], 0, true)))
    A.actualizarTransferencia(f.transferencias[1].id, 'ordenante', 'Kiosco Pepe')
    const b1 = A.transferenciaParaBase(f.transferencias[1])
    chk('leída y CORREGIDA: queda "ocr_corregido"', b1.origen_datos === 'ocr_corregido', b1.origen_datos)
    chk('…y viaja con lo que propuso el lector', b1.ocr_propuesto?.referencia === '9' && b1.foto_id === foto.id)
    chk('elegir la cuenta no cuenta como corrección', A.transferenciaParaBase(f.transferencias[0]).origen_datos === 'ocr')
    A.actualizarTransferencia(f.transferencias[0].id, 'importe', '150.001,00')
    chk('cambiar el importe: "ocr_corregido"', A.transferenciaParaBase(f.transferencias[0]).origen_datos === 'ocr_corregido')
    // Guardar: la foto viaja con su tipo y su mime.
    f.cliente_id = 'c-jm'; f.cliente = 'J&M'
    const r = await A.subirCobranza(f)
    const ll = A.__rpcs().find(x => x.nombre === 'cargar_cobranza_asentada')
    chk('guardar: va con cargar_cobranza_asentada', r.ok && !!ll, JSON.stringify(r))
    chk('guardar: la foto nueva viaja con tipo y mime', ll?.params.p_fotos.length === 1 && ll.params.p_fotos[0].tipo === 'transferencia' && ll.params.p_fotos[0].mime === 'image/jpeg', JSON.stringify(ll?.params.p_fotos))
    chk('guardar: las dos transferencias con su comprobante y su origen', ll?.params.p_transferencias.length === 2 &&
      ll.params.p_transferencias.every(t => t.foto_id === foto.id) && ll.params.p_transferencias[1].origen_datos === 'ocr_corregido')
  }
  // E-cheque leído del comprobante.
  {
    const A = sandbox(ADMIN)
    A.abrirFormularioNuevo()
    const f = A.estado.form
    A.__setInvoke(async () => ({ data: { ok: true, modelo: 'm', crudo: {}, propuestos: [
      { banco_codigo: '285', sucursal_codigo: '386', codigo_postal: '3218', numero: '66259862', cuenta: '09420314667', emisor: 'ANATOLIA SA',
        cuit_emisor: '33709335419', fecha_emision: '2026-09-30', fecha_pago: '2026-11-30', importe: 250000, id_echeq: 'X1' },
    ] }, error: null }))
    await A.agregarFotos([{ type: 'application/pdf', size: 800 * 1024, name: 'echeq.pdf' }], 'echeque')
    await esperar()
    const foto = f.fotos[0]
    chk('PDF de e-cheque: se sube TAL CUAL (no se comprime) como application/pdf', A.__comprimidas().length === 0 && foto.mime === 'application/pdf' && /\.pdf$/.test(foto.storage_path) &&
      A.__subidas().some(s => s.tipo === 'application/pdf'))
    const e = f.echecks[0]
    chk('e-cheque leído: banco, número, emisor, fechas e importe', e && e.banco_codigo === '285' && e.numero === '66259862' && e.emisor === 'ANATOLIA SA' &&
      e.fecha_emision === '2026-09-30' && e.fecha_pago === '2026-11-30' && e.tipo === 'diferido' && e.importe === 250000, JSON.stringify(e))
    const b = A.echequeParaBase(e)
    chk('e-cheque para la base: con su comprobante, la cuenta del CMC-7 y el emisor en titulares', b.foto_id === foto.id && b.cuenta === '09420314667' &&
      b.sucursal_codigo === '386' && b.codigo_postal === '3218' && JSON.stringify(b.titulares) === '[{"nombre":"ANATOLIA SA","cuit":"33709335419"}]', JSON.stringify(b))
    chk('e-cheque sin tocar: "ocr"', b.origen_datos === 'ocr')
    A.actualizarEcheck(e.id, 'numero', '66259863')
    chk('e-cheque corregido: "ocr_corregido"', A.echequeParaBase(e).origen_datos === 'ocr_corregido')
    chk('e-cheque a mano: "manual"', A.echequeParaBase(A.echequeVacio()).origen_datos === 'manual')
    const h = A.htmlEcheckForm(e, 0, true)
    chk('la tarjeta del e-cheque tiene emisor y CUIT, y "Ver el comprobante"', /data-echeck-campo="emisor"/.test(h) && /data-echeck-campo="cuit_emisor"/.test(h) && new RegExp(`data-ver-comprobante="${foto.id}"`).test(h))
    A.abrirComprobante(foto.id)
    await esperar()
    chk('un PDF se abre en una pestaña nueva', A.__abiertas().some(x => x[0] === 'https://firmada/' + foto.id && x[1] === '_blank'))
  }
  // El lector falla o no está publicado.
  {
    const A = sandbox(ADMIN)
    A.abrirFormularioNuevo()
    const f = A.estado.form
    A.__setInvoke(async () => ({ data: null, error: Object.assign(new Error('Function not found'), { context: { json: async () => ({ mensaje: 'no existe' }) } }) }))
    await A.agregarFotos([{ type: 'image/jpeg', size: 1024, name: 'a.jpg' }], 'transferencia')
    await esperar()
    const foto = f.fotos[0]
    chk('lector caído: se avisa', /El lector no pudo leer el comprobante/.test(foto.error ?? '') && /Cargalo a mano/.test(foto.error ?? ''), foto.error)
    chk('lector caído: queda una tarjeta vacía con el comprobante adjunto', f.transferencias.length === 1 && f.transferencias[0].foto_id === foto.id && f.transferencias[0].importe === '')
    chk('lector caído: no se reintenta para siempre (queda leído)', foto.leida === true)
    chk('lector caído: esa tarjeta se carga a mano ("manual")', A.transferenciaParaBase(f.transferencias[0]).origen_datos === 'manual')
    chk('el aviso del comprobante se pinta en su sección', /Comprobante 1: El lector no pudo leer/.test(el(A, 'cob-comprobantes-transferencia').innerHTML))
    const B = sandbox(ADMIN)
    B.abrirFormularioNuevo()
    B.__setInvoke(async () => ({ data: { ok: false, modelo: 'm', crudo: {}, propuestos: [], mensaje: 'No se encontraron datos.' }, error: null }))
    await B.agregarFotos([{ type: 'image/jpeg', size: 1024, name: 'a.jpg' }], 'echeque')
    await esperar()
    chk('nada leído: tarjeta vacía con el comprobante y el mensaje del lector', B.estado.form.echecks.length === 1 && B.estado.form.echecks[0].foto_id === B.estado.form.fotos[0].id &&
      /No se encontraron datos/.test(B.estado.form.fotos[0].error ?? ''))
    const Rd = sandbox(ADMIN)
    Rd.abrirFormularioNuevo()
    Rd.__setInvoke(async () => ({ data: null, error: new Error('Failed to fetch') }))
    await Rd.agregarFotos([{ type: 'image/jpeg', size: 1024, name: 'a.jpg' }], 'transferencia')
    await esperar()
    chk('sin señal: la foto espera (no se da por leída ni agrega tarjetas)', Rd.estado.form.fotos[0].leida === false && Rd.estado.form.transferencias.length === 0)
  }

  // ══ 6. EL PDF DE MÁS DE 10 MB ══════════════════════════════════════════════
  {
    const A = sandbox(ADMIN)
    A.abrirFormularioNuevo()
    await A.agregarFotos([{ type: 'application/pdf', size: 11 * 1024 * 1024, name: 'pesado.pdf' }], 'transferencia')
    await esperar()
    chk('PDF de 11 MB: avisa con el peso y el máximo', A.__llamadas.errores.some(m => /pesado\.pdf/.test(m) && /10 MB/.test(m) && /no se subió/.test(m)), JSON.stringify(A.__llamadas.errores))
    chk('PDF de 11 MB: no se sube ni queda en la cobranza', A.__subidas().length === 0 && A.estado.form.fotos.length === 0)
    await A.agregarFotos([{ type: 'application/pdf', size: 10 * 1024 * 1024, name: 'justo.pdf' }], 'transferencia')
    await esperar()
    chk('PDF de 10 MB justos: entra', A.estado.form.fotos.length === 1)
    const C = sandbox(ADMIN)
    C.abrirFormularioNuevo()
    await C.agregarFotos([{ type: 'application/pdf', size: 1000, name: 'c.pdf' }], 'cheque')
    chk('un PDF como cheque: avisa y no se sube (el lector de cheques lee fotos)', C.estado.form.fotos.length === 0 && C.__llamadas.errores.some(m => /un PDF no se puede leer como cheque/.test(m)))
    const D = sandbox(CHOFER)
    D.abrirFormularioNuevo()
    await D.agregarFotos([{ type: 'image/jpeg', size: 1000, name: 'x.jpg' }], 'transferencia')
    chk('el chofer no puede subir comprobantes de transferencia', D.estado.form.fotos.length === 0)
    chk('fuente: el archivo de comprobantes acepta imágenes y PDF; el de cheques, solo imágenes',
      /id="cob-file-comprobante-archivo" accept="image\/jpeg,image\/png,image\/webp,application\/pdf"/.test(FUENTE) &&
      /id="cob-file-archivo-cheque" accept="image\/jpeg,image\/png,image\/webp"/.test(FUENTE))
  }

  // ══ 7. DOS TRANSFERENCIAS Y TRES CHEQUES EN UNA MISMA COBRANZA ═════════════
  {
    const A = sandbox(ADMIN)
    A.abrirFormularioNuevo()
    A.elegirEmpresa('u-nuss')
    await esperar()
    A.elegirClienteAsentar('c-jm')
    const f = A.estado.form
    f.fotos = [
      { id: 'f1', storage_path: 'uid/c/f1.jpg', tipo: 'cheque', mime: 'image/jpeg', subida: true, leida: true },
      { id: 'f2', storage_path: 'uid/c/f2.jpg', subida: true, leida: true },   // borrador viejo: sin tipo
    ]
    f.cheques = [chequePapel(A, 'f1', '66259862', 8), chequePapel(A, 'f1', '00012345', A.dvBcra('00012345')), chequePapel(A, 'f2', '00054321', A.dvBcra('00054321'))]
    A.agregarTransferencia(); A.agregarTransferencia()
    f.transferencias.forEach((t, i) => Object.assign(t, { cuenta_id: 'cta-nuss', importe: String(1000 * (i + 1)), referencia: 'op' + i }))
    chk('3 cheques + 2 transferencias: nada falta', A.motivosParaNoGuardar().length === 0, A.motivosParaNoGuardar().join(' | '))
    chk('el total suma las dos formas', A.totalDelFormulario() === 3000 + 3000, A.totalDelFormulario())
    await A.guardarCobranza()
    const ll = A.__rpcs().find(x => x.nombre === 'cargar_cobranza_asentada')
    chk('viajan los TRES cheques', ll?.params.p_cheques.filter(c => !c.es_echeck).length === 3)
    chk('viajan las DOS transferencias', ll?.params.p_transferencias.length === 2 && ll.params.p_transferencias.map(t => t.importe).join(',') === '1000,2000')
    chk('viajan las dos fotos; la del borrador viejo como cheque', ll?.params.p_fotos.length === 2 && ll.params.p_fotos.every(x => x.tipo === 'cheque'), JSON.stringify(ll?.params.p_fotos))
    chk('se cierra el formulario', A.estado.form === null)
  }

  // ══ 8. QUÉ FOTOS VIAJAN ════════════════════════════════════════════════════
  {
    const A = sandbox(ADMIN)
    const f = A.formularioVacio('q')
    f.fotos = [
      { id: 'b1', storage_path: 'p/b1', tipo: 'echeque', mime: 'image/jpeg', enBase: true, subida: true, leida: true },
      { id: 'n1', storage_path: 'p/n1', tipo: 'transferencia', mime: 'application/pdf', subida: true, leida: true },
      { id: 'n2', storage_path: 'p/n2', tipo: 'transferencia', mime: 'image/jpeg', subida: true, leida: true },
      { id: 'n3', storage_path: 'p/n3', tipo: 'cheque', mime: 'image/jpeg', subida: true, leida: true },
    ]
    f.echecks = [Object.assign(A.echequeVacio(), { foto_id: 'b1' })]
    f.transferencias = [Object.assign(A.transferenciaVacia(), { foto_id: 'n1' })]
    const fotos = A.fotosParaBase(f)
    chk('viajan los comprobantes usados; no el que quedó sin tarjeta ni la foto de cheque sin cheque', fotos.map(x => x.id).join(',') === 'b1,n1', fotos.map(x => x.id).join(','))
    chk('una foto que ya está en la base viaja SIN tipo ni mime', !('tipo' in fotos[0]) && !('mime' in fotos[0]))
    chk('una nueva viaja con tipo y mime', fotos[1].tipo === 'transferencia' && fotos[1].mime === 'application/pdf')
    chk('el comprobante sin tarjeta se cuenta como descartado', A.comprobantesSinUso(f).map(x => x.id).join(',') === 'n2')
    A.estado.form = f
    A.pintarTotalYGuardado()
    chk('y lo dice al guardar', /1 comprobante quedó sin e-cheque ni transferencia/.test(el(A, 'cob-form-pendientes').innerHTML))
  }

  // ══ 9. ESCAPE Y FUENTE ════════════════════════════════════════════════════
  {
    const A = sandbox(ADMIN)
    const f = A.formularioVacio('x')
    f.fotos = [{ id: MAL, storage_path: 'p/x', tipo: 'transferencia', mime: 'application/pdf', subida: true, leida: true, error: MAL }]
    const h = A.htmlComprobantes(f, 'transferencia')
    chk('comprobantes: el id y el error van escapados', h.includes(MAL_ESC) && !h.includes(MAL))
    chk('un PDF se muestra como botón "PDF" (no como imagen)', /class="cob-comprobante-pdf"/.test(h) && !/<img/.test(h))
    chk('las sugerencias de bancos: bancos y billeteras argentinas', ['Banco Macro', 'Banco de la Nación Argentina', 'Banco Santander', 'Banco Galicia', 'Mercado Pago'].every(b => A.htmlBancosOrigen().includes(`value="${b}"`)))
    chk('fuente: los cuatro botones de "¿Cómo pagó?" con su etiqueta de color',
      ['efectivo', 'cheque', 'echeque', 'transferencia'].every(x => new RegExp(`data-abrir-forma="${x}"`).test(FUENTE)) && /id="cob-rotulo-como-pago">¿Cómo pagó\?</.test(FUENTE))
    chk('fuente: E-cheque y Transferencia arrancan ocultos en el HTML (los muestra el JS solo a quien controla)',
      /data-abrir-forma="echeque"[^>]*hidden>/.test(FUENTE) && /data-abrir-forma="transferencia"[^>]*hidden>/.test(FUENTE))
    chk('fuente: Sacar foto, Galería, Archivo y Cargar a mano en cheques, e-cheques y transferencias',
      /id="cob-btn-camara">&#128247; Sacar foto/.test(FUENTE) && /id="cob-btn-galeria">&#128194; Galería/.test(FUENTE) && /id="cob-btn-archivo-cheque">&#128206; Archivo/.test(FUENTE) &&
      ['echeque', 'transferencia'].every(t => ['camara', 'galeria', 'archivo'].every(o => FUENTE.includes(`data-subir-comprobante="${t}" data-origen="${o}"`))))
    chk('fuente: los comprobantes van al lector nuevo', /functions\.invoke\('ocr-cobranza-comprobantes'/.test(FUENTE))
    chk('fuente: la subida usa el mime de cada archivo (no siempre image/jpeg)', (FUENTE.match(/contentType: foto\.mime \|\| 'image\/jpeg'/g) || []).length === 3)
    chk('fuente: el tope de 10 MB', /const BYTES_MAXIMO_ARCHIVO = 10 \* 1024 \* 1024/.test(FUENTE))
  }

  for (const f of fallas) console.log('  ✗ ' + f)
  const total = ok + fallas.length
  console.log(`${ok}/${total} ${fallas.length ? 'ROJO' : 'verde'}`)
  process.exit(fallas.length ? 1 : 0)
}

pruebas().catch(e => { console.log('EXCEPCIÓN: ' + (e && e.stack || e)); console.log('ROJO'); process.exit(1) })
