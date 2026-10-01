// La cobranza YA ASENTADA (01/10/2026), en modulos/cobranzas.html.
//
// Quien controla las cobranzas (cobranzas:procesar) carga y asienta en un
// solo paso:
//  - PRIMERO la EMPRESA (botones grandes con su logo o su color; si la barra de
//    arriba tiene una sola fábrica elegida, viene marcada esa), sin la fábrica
//    de pruebas;
//  - DESPUÉS un cliente ACTIVO de ESA empresa, de la lista de
//    buscar_clientes(p_busqueda, p_unidad_negocio_id), con buscador;
//  - con el Taller, el proyecto;
//  - al guardar, cargar_cobranza_asentada con los diez parámetros (las
//    transferencias SIEMPRE como lista), y el aviso "Cobranza asentada ·
//    J&M (Dolce Pasta) · $ … · quedó debiendo $ …".
// Los demás (sin procesar) cargan como siempre: el cliente escrito a mano y
// guardar_cobranza (queda por asentar), sin empresa ni lista.
// Se EJECUTAN las funciones reales del módulo.
//
//   node pruebas/test-cobranzas-asentada.js
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
  function nuevoEl(id) {
    return {
      id, innerHTML: '', textContent: '', value: '', className: '', hidden: false,
      disabled: false, dataset: {}, src: '', max: '',
      querySelectorAll: () => [], querySelector: () => null,
      addEventListener(){}, focus(){}, classList: { add(){}, remove(){}, toggle(){} },
    }
  }
  var __els = new Map()
  var document = {
    getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) },
    querySelectorAll: () => [], querySelector: () => null,
  }
  var navigator = { onLine: true }
  var crypto = { randomUUID: (() => { let n = 0; return () => '00000000-0000-4000-8000-' + String(++n).padStart(12, '0') })() }

  var __rpcs = []
  var __rpcImpl = async () => ({ data: null, error: null })
  var supabase = {
    from: () => { const q = {}; for (const op of ['select','eq','in','order','range','like','gte','lte','or','maybeSingle']) q[op] = () => q; q.then = (r) => Promise.resolve({ data: [], error: null }).then(r); return q },
    rpc: (n, p) => { __rpcs.push({ nombre: n, params: p }); return __rpcImpl(n, p) },
    storage: { from: () => ({ upload: async () => ({ error: null }) }) },
  }

  var __llamadas = { exitos: [], errores: [], vistas: [], subtitulos: [] }
  function mostrarExito(m){ __llamadas.exitos.push(m) } function mostrarError(m){ __llamadas.errores.push(m) }
  function mostrarVistaCob(v, o){ __llamadas.vistas.push(v); __llamadas.subtitulos.push(o?.subtitulo ?? null) }
  function guardarBorrador(){}
  function pintarEstadoFotos(){} function pintarCheques(){} function iniciarReintentosFotos(){}
  function escribirImporteEnCampo(){}
  async function dbBorrar(){} async function refrescarListado(){} async function refrescarLocales(){}
  function hoyArgentina(){ return '2026-10-01' }
  var STORE_BORRADORES = 'borradores'

  var estado = {
    sesion: { user: { id: 'uid' } },
    miEmpleadoId: 'emp-yanina', miRolApp: 'usuario',
    misTareas: new Set(['cobranzas:cargar']),
    bancos: new Map([['007', 'Galicia']]), unidades: [], form: null, detalle: null,
    unidadElegida: null, fabrica: FABRICA_SIN_DATOS, fabricaLista: true, asentar: null,
    cuentasBancoLista: [], cuentasBanco: new Map(),
  }
`

const FUNCIONES = [
  'escCob', 'formatearImporte', 'esFechaIso', 'diasEntre', 'formatearFechaCob', 'nombreBanco', 'nombreBancoDe',
  'tieneTarea', 'textoOpcional', 'chequeParaBase', 'origenDatosDe', 'chequeVacio', 'renglonComoImpreso',
  'formularioVacio', 'pintarFormulario', 'pintarBotonChequeMano', 'abrirFormularioNuevo', 'guardarCobranza',
  'htmlEtiquetaForma', 'echequeVacio', 'erroresDeEcheque', 'echequeParaBase',
  'transferenciaVacia', 'erroresDeTransferencia', 'transferenciaParaBase',
  'sumaImportes', 'totalesPorForma', 'usaCobranzaCompleta', 'cuentasParaElegir',
  'nombreUnidadCob', 'htmlOpcionesCuentas', 'htmlEcheckForm', 'htmlTransferenciaForm', 'pintarFormasNuevas',
  'pintarResumenFormas', 'htmlResumenFormas',
  'totalDelFormulario', 'efectivoDelFormulario', 'motivosParaNoGuardar', 'pintarTotalYGuardado',
  'subirCobranza', 'esErrorDeRed', 'normalizarCliente', 'momentoArgentina',
  ...FUNCIONES_ASENTAR,
]
const CONSTANTES = [
  'ZONA_AR', 'ACENTOS_COB', 'SIN_ACENTOS_COB', 'DIAS_MAXIMO_DIFERIDO', 'ETIQUETA_ESTADO_COBRANZA', 'ETIQUETA_ESTADO_CHEQUE',
  'puedeCargar', 'puedeVerTodo', 'puedeProcesar', 'puedeEditarAnular', 'TEXTO_BOTON_CHEQUE_MANO',
  ...CONSTANTES_ASENTAR,
]

const NUSS = { id: 'u-nuss', nombre: 'Cucuruchos Nuss', activo: true, prefijo: 'N', logo_url: 'logo.png' }
const DOLCE = { id: 'u-dolce', nombre: 'Dolce Pasta', activo: true, prefijo: 'D', logo_url: null }
const MENGUI = { id: 'u-mengui', nombre: 'Mengui', activo: true, prefijo: 'O', logo_url: null }
const TALLER = { id: 'u-taller', nombre: 'Taller', activo: true, prefijo: 'T', logo_url: null }
const PRUEBA = { id: 'u-prueba', nombre: 'Pruebas (robot)', activo: true, prefijo: 'X', logo_url: null }
const VIEJA = { id: 'u-vieja', nombre: 'Unidad dada de baja', activo: false, prefijo: null, logo_url: null }
const UNIDADES = [DOLCE, TALLER, PRUEBA, NUSS, VIEJA, MENGUI]
const FABRICA = { ok: true, unidades: new Set(['u-prueba']), personas: new Set(), soyDePrueba: false }

const MAL = '"><b data-xss="cli">'
const MAL_ESC = '&quot;&gt;&lt;b data-xss=&quot;cli&quot;&gt;'

// Lo que devuelve buscar_clientes: la empresa pedida, más una fila de otra y
// una inactiva (la función ya filtra: la pantalla vuelve a mirar).
function clientesDe(unidad) {
  return [
    { cliente_id: 'c-zeta', nombre: 'Zeta Helados', razon_social: 'ZETA SRL', localidad: 'Rosario', empresa: 'X', unidad_negocio_id: unidad, activo: true, saldo: 1500 },
    { cliente_id: 'c-jm', nombre: 'J&M', razon_social: 'J Y M SA', localidad: 'Córdoba', empresa: 'X', unidad_negocio_id: unidad, activo: true, saldo: 250000 },
    { cliente_id: 'c-mal', nombre: 'Kiosco ' + MAL, razon_social: MAL, localidad: MAL, empresa: 'X', unidad_negocio_id: unidad, activo: true, saldo: null },
    { cliente_id: 'c-otra', nombre: 'De otra empresa', unidad_negocio_id: 'u-otra', activo: true, saldo: 0 },
    { cliente_id: 'c-apagado', nombre: 'Apagado', unidad_negocio_id: unidad, activo: false, saldo: 0 },
  ]
}

function sandbox({ tareas = ['cargar', 'ver_todo', 'procesar'], rol = 'usuario', barra = null, fabrica = FABRICA, fabricaLista = true } = {}) {
  const S = construirCon(ARCHIVO, {
    preludio: PRELUDIO, funciones: FUNCIONES, constantes: CONSTANTES,
    retorno: `estado, __els, __llamadas, __rpcs(){ return __rpcs }, __setRpc(f){ __rpcImpl = f }, MS_BUSCAR_CLIENTE`,
  })
  S.estado.misTareas = new Set(tareas.map(t => 'cobranzas:' + t))
  S.estado.miRolApp = rol
  S.estado.unidades = UNIDADES
  S.estado.unidadElegida = barra
  S.estado.fabrica = fabrica
  S.estado.fabricaLista = fabricaLista
  S.__setRpc(async (n, p) => {
    if (n === 'buscar_clientes') return { data: clientesDe(p.p_unidad_negocio_id), error: null }
    if (n === 'proyectos_taller') return { data: [], error: null }
    return { data: null, error: null }
  })
  return S
}
const PROCESAR = { tareas: ['cargar', 'ver_todo', 'procesar'] }
const CHOFER = { tareas: ['cargar'] }

const el = (S, id) => S.__els.get(id) ?? { hidden: undefined, innerHTML: '', textContent: '' }
const esperar = async (n = 8) => { for (let i = 0; i < n; i++) await new Promise(r => setImmediate(r)) }
const rpcs = (S, nombre) => S.__rpcs().filter(r => r.nombre === nombre)

// Un cheque de papel confirmado.
function conCheque(S, f) {
  f.fotos = [{ id: 'f1', storage_path: 'uid/c/f1.jpg', subida: true, leida: true }]
  const ch = S.chequeVacio('f1')
  Object.assign(ch, {
    banco_codigo: '007', sucursal_codigo: '386', codigo_postal: '3218', dv_ruta: 6,
    numero: '66259862', dv_numero: 8, cuenta: '09420314667', dv_cuenta: 0,
    tipo: 'comun', fecha_emision: '2026-09-20', importe: '1.000,00', confirmado: true,
  })
  f.cheques = [ch]
  return f
}

async function pruebas() {
  // ══ 1. QUIEN CONTROLA: PRIMERO LA EMPRESA ═══════════════════════════════════
  {
    const S = sandbox(PROCESAR)
    S.abrirFormularioNuevo()
    const f = S.estado.form
    chk('procesar: la cobranza nueva se marca para asentar', f.asentar === true && S.esFormAsentado(f))
    chk('procesar: se ve la elección de empresa y NO el cliente escrito a mano',
      el(S, 'cob-asentar').hidden === false && el(S, 'cob-campo-cliente-libre').hidden === true)
    const emp = el(S, 'cob-empresas').innerHTML
    const orden = [...emp.matchAll(/data-empresa="([^"]+)"/g)].map(m => m[1])
    chk('las empresas: Nuss, Dolce Pasta, Mengui y Taller, en ese orden', orden.join(',') === 'u-nuss,u-dolce,u-mengui,u-taller', orden.join(','))
    chk('la fábrica de pruebas NO aparece para una cuenta real', !emp.includes('u-prueba') && !/Pruebas/.test(emp))
    chk('una unidad dada de baja no aparece', !emp.includes('u-vieja'))
    chk('cada empresa con su nombre corto', />Nuss<\/span>/.test(emp) && />Dolce Pasta<\/span>/.test(emp) && />Mengui<\/span>/.test(emp) && />Taller<\/span>/.test(emp))
    chk('sin barra elegida, ninguna viene marcada', !/aria-pressed="true"/.test(emp) && (emp.match(/aria-pressed="false"/g) || []).length === 4)
    chk('con logo: un <img> SIN src en el HTML (el src se pone por propiedad)', /<img data-logo-empresa="u-nuss" alt="">/.test(emp) && !/src=/.test(emp))
    chk('sin logo: su círculo de color con las letras', /style="background:oklch\(0\.52 0\.1 130\)" aria-hidden="true">DP<\/span>/.test(emp))
    chk('sin empresa, la lista de clientes no se ve y no se busca nada',
      el(S, 'cob-campo-clientes').hidden === true && rpcs(S, 'buscar_clientes').length === 0)
    chk('lo que falta: la empresa', S.motivosParaNoGuardar().includes('Elegí la empresa de la cobranza.'))
    chk('el botón dice "Guardar y asentar" y queda deshabilitado',
      el(S, 'cob-btn-guardar').textContent === 'Guardar y asentar' && el(S, 'cob-btn-guardar').disabled === true)
    chk('el subtítulo dice que queda asentada', S.__llamadas.subtitulos.at(-1) === 'Nueva cobranza (queda asentada)')

    // El logo por propiedad, solo con un nombre de archivo válido.
    const img1 = { dataset: { logoEmpresa: 'u-nuss' }, src: '' }
    const img2 = { dataset: { logoEmpresa: 'u-dolce' }, src: '' }
    S.ponerLogosEmpresas({ querySelectorAll: () => [img1, img2] })
    chk('ponerLogosEmpresas: el logo de Nuss va por src, relativo a la raíz', img1.src === '../logo.png')
    chk('ponerLogosEmpresas: sin logo, no inventa un src', img2.src === '')
    const raro = sandbox(PROCESAR)
    raro.estado.unidades = [{ ...NUSS, logo_url: 'javascript:alert(1)' }]
    const img3 = { dataset: { logoEmpresa: 'u-nuss' }, src: '' }
    raro.ponerLogosEmpresas({ querySelectorAll: () => [img3] })
    chk('ponerLogosEmpresas: un logo que no es un nombre de imagen no se pone', img3.src === '')
    chk('htmlMarcaEmpresa: un logo inválido cae al círculo de color', !/<img/.test(raro.htmlMarcaEmpresa({ ...NUSS, logo_url: '../x.png' })))
  }

  // Hasta saber cuál es la fábrica de pruebas, ninguna empresa.
  {
    const S = sandbox({ ...PROCESAR, fabricaLista: false })
    S.abrirFormularioNuevo()
    chk('sin la fábrica de pruebas leída: no se ofrece ninguna empresa', !/data-empresa/.test(el(S, 'cob-empresas').innerHTML) &&
      /Leyendo las empresas/.test(el(S, 'cob-empresas').innerHTML))
    S.estado.fabricaLista = true
    S.pintarAsentar()
    chk('al llegar, se ofrecen', /data-empresa="u-nuss"/.test(el(S, 'cob-empresas').innerHTML))
  }
  // Una cuenta de la fábrica de pruebas sí la ve.
  {
    const S = sandbox({ ...PROCESAR, fabrica: { ...FABRICA, soyDePrueba: true } })
    S.abrirFormularioNuevo()
    chk('una cuenta de prueba ve la fábrica de pruebas', /data-empresa="u-prueba"/.test(el(S, 'cob-empresas').innerHTML))
  }

  // ══ 2. LA BARRA DE ARRIBA CON UNA FÁBRICA ELEGIDA ══════════════════════════
  {
    const S = sandbox({ ...PROCESAR, barra: 'u-dolce' })
    S.abrirFormularioNuevo()
    await esperar()
    const emp = el(S, 'cob-empresas').innerHTML
    chk('barra en Dolce Pasta: viene marcada Dolce Pasta', S.estado.form.unidad_id === 'u-dolce' &&
      /data-empresa="u-dolce" aria-pressed="true"/.test(emp) && (emp.match(/aria-pressed="true"/g) || []).length === 1)
    const b = rpcs(S, 'buscar_clientes')
    chk('y ya busca los clientes de ESA empresa, sin texto', b.length === 1 && b[0].params.p_unidad_negocio_id === 'u-dolce' && b[0].params.p_busqueda === null,
      JSON.stringify(b))
  }
  {
    const S = sandbox({ ...PROCESAR, barra: 'u-prueba' })
    S.abrirFormularioNuevo()
    chk('barra en una unidad que no se ofrece: no queda marcada', S.estado.form.unidad_id === null)
  }

  // ══ 3. DESPUÉS, SOLO LOS CLIENTES DE ESA EMPRESA ══════════════════════════
  {
    const S = sandbox(PROCESAR)
    S.abrirFormularioNuevo()
    S.elegirEmpresa('u-nuss')
    await esperar()
    const f = S.estado.form
    chk('elegir Nuss: queda elegida', f.unidad_id === 'u-nuss' && /data-empresa="u-nuss" aria-pressed="true"/.test(el(S, 'cob-empresas').innerHTML))
    const b = rpcs(S, 'buscar_clientes')
    chk('busca con p_unidad_negocio_id de Nuss', b.length === 1 && b[0].params.p_unidad_negocio_id === 'u-nuss' && b[0].params.p_busqueda === null)
    chk('la lista de clientes se ve', el(S, 'cob-campo-clientes').hidden === false)
    const lista = el(S, 'cob-lista-clientes').innerHTML
    const ids = [...lista.matchAll(/data-cliente-id="([^"]+)"/g)].map(m => m[1])
    chk('solo los clientes ACTIVOS de esa empresa', ids.length === 3 && !ids.includes('c-otra') && !ids.includes('c-apagado'), ids.join(','))
    chk('sin búsqueda, por nombre', ids.join(',') === 'c-jm,c-mal,c-zeta', ids.join(','))
    chk('cada cliente con su saldo', /Debe \$/.test(lista))
    const botonSinSaldo = (lista.match(/<button[^>]*data-cliente-id="c-mal"[\s\S]*?<\/button>/) || [''])[0]
    chk('un saldo que no vino no dice nada (ni "$ 0,00" ni "en cero")', botonSinSaldo !== '' && !/cob-cliente-op__saldo/.test(botonSinSaldo), botonSinSaldo)
    chk('asentada: nunca pide el cliente escrito a mano', !S.motivosParaNoGuardar().includes('Falta el cliente.'))
    chk('el nombre, la razón social y la localidad van escapados', lista.includes('Kiosco ' + MAL_ESC) && !lista.includes(MAL))
    chk('todavía falta el cliente', S.motivosParaNoGuardar().includes('Elegí el cliente de la lista.'))

    // Buscar escribiendo: espera y manda el texto.
    S.alEscribirClienteAsentar({ target: { value: 'jm' } })
    chk('no busca en cada tecla (espera)', rpcs(S, 'buscar_clientes').length === 1)
    await new Promise(r => setTimeout(r, S.MS_BUSCAR_CLIENTE + 60))
    await esperar()
    const b2 = rpcs(S, 'buscar_clientes')
    chk('al rato busca "jm" en Nuss', b2.length === 2 && b2[1].params.p_busqueda === 'jm' && b2[1].params.p_unidad_negocio_id === 'u-nuss', JSON.stringify(b2[1]))
    S.alEscribirClienteAsentar({ target: { value: 'j' } })
    await new Promise(r => setTimeout(r, S.MS_BUSCAR_CLIENTE + 60))
    await esperar()
    chk('con una sola letra no filtra (manda null)', rpcs(S, 'buscar_clientes').at(-1).params.p_busqueda === null)

    // Elegir uno.
    S.elegirClienteAsentar('c-jm')
    chk('elegido: el formulario guarda el id y el nombre', f.cliente_id === 'c-jm' && f.cliente === 'J&M')
    chk('elegido: se ve con "Cambiar" y el buscador se esconde',
      /data-cambiar-cliente/.test(el(S, 'cob-lista-clientes').innerHTML) && /J&amp;M/.test(el(S, 'cob-lista-clientes').innerHTML) &&
      el(S, 'cob-asentar-buscar').hidden === true)
    chk('ya no falta ni la empresa ni el cliente', !S.motivosParaNoGuardar().some(m => /empresa|cliente/i.test(m)))
    S.cambiarClienteAsentar()
    chk('Cambiar: suelta el cliente y vuelve a buscar', f.cliente_id === null && f.cliente === '' && el(S, 'cob-asentar-buscar').hidden === false)

    // Cambiar de empresa suelta el cliente.
    await esperar()
    S.elegirClienteAsentar('c-zeta')
    chk('(antes de cambiar de empresa, el cliente quedó elegido)', f.cliente_id === 'c-zeta')
    S.elegirEmpresa('u-dolce')
    await esperar()
    chk('cambiar de empresa suelta el cliente y busca en la nueva', f.cliente_id === null &&
      rpcs(S, 'buscar_clientes').at(-1).params.p_unidad_negocio_id === 'u-dolce')
    chk('una empresa que no se ofrece no se elige', (S.elegirEmpresa('u-prueba'), f.unidad_id === 'u-dolce'))
  }

  // Una respuesta vieja no pisa la nueva.
  {
    const S = sandbox(PROCESAR)
    let soltarVieja
    S.__setRpc(async (n, p) => {
      if (n !== 'buscar_clientes') return { data: null, error: null }
      if (p.p_unidad_negocio_id === 'u-nuss') { await new Promise(r => { soltarVieja = r }); return { data: [{ cliente_id: 'c-nuss', nombre: 'De Nuss', unidad_negocio_id: 'u-nuss', activo: true }], error: null } }
      return { data: [{ cliente_id: 'c-dolce', nombre: 'De Dolce', unidad_negocio_id: 'u-dolce', activo: true }], error: null }
    })
    S.abrirFormularioNuevo()
    S.elegirEmpresa('u-nuss')
    S.elegirEmpresa('u-dolce')
    await esperar()
    soltarVieja()
    await esperar()
    const lista = el(S, 'cob-lista-clientes').innerHTML
    chk('la lista de Nuss que llegó tarde no pisa la de Dolce Pasta', /c-dolce/.test(lista) && !/c-nuss/.test(lista), lista)
  }
  // Dos búsquedas en la MISMA empresa: la que llega tarde no pisa la última.
  {
    const S = sandbox(PROCESAR)
    let soltarVieja
    S.__setRpc(async (n, p) => {
      if (n !== 'buscar_clientes') return { data: null, error: null }
      if (p.p_busqueda === 'zz') { await new Promise(r => { soltarVieja = r }); return { data: [{ cliente_id: 'c-zz', nombre: 'Zz', unidad_negocio_id: 'u-nuss', activo: true }], error: null } }
      return { data: [{ cliente_id: 'c-ultima', nombre: 'Última', unidad_negocio_id: 'u-nuss', activo: true }], error: null }
    })
    S.abrirFormularioNuevo()
    S.elegirEmpresa('u-nuss')
    await esperar()
    S.estado.asentar.busqueda = 'zz'
    S.buscarClientesAsentar()
    S.estado.asentar.busqueda = 'ultima'
    S.buscarClientesAsentar()
    await esperar()
    soltarVieja()
    await esperar()
    const lista = el(S, 'cob-lista-clientes').innerHTML
    chk('misma empresa: la búsqueda vieja no pisa la última', /c-ultima/.test(lista) && !/c-zz/.test(lista), lista)
  }
  // Si la búsqueda falla, se dice, y se puede reintentar.
  {
    const S = sandbox(PROCESAR)
    S.__setRpc(async () => ({ data: null, error: { message: 'boom' } }))
    S.abrirFormularioNuevo()
    S.elegirEmpresa('u-mengui')
    await esperar()
    const lista = el(S, 'cob-lista-clientes').innerHTML
    chk('si falla: lo dice, con "Volver a intentar"', /No se pudo leer la lista de clientes/.test(lista) && /data-reintentar-clientes/.test(lista))
    S.__setRpc(async (n, p) => ({ data: clientesDe(p.p_unidad_negocio_id), error: null }))
    S.alTocarEnAsentar({ target: { closest: () => ({ dataset: { reintentarClientes: '1' } }) } })
    await esperar()
    chk('reintentar vuelve a buscar y muestra la lista', /data-cliente-id="c-jm"/.test(el(S, 'cob-lista-clientes').innerHTML))
    S.__setRpc(async () => ({ data: null, error: null }))
    S.cambiarClienteAsentar()
    await esperar()
    chk('si la base contesta null: dice que no se puede ver', /no se puede ver la lista de clientes/.test(el(S, 'cob-lista-clientes').innerHTML))
  }

  // ══ 4. GUARDAR: cargar_cobranza_asentada ══════════════════════════════════
  {
    const S = sandbox({ ...PROCESAR, barra: 'u-dolce' })
    S.abrirFormularioNuevo()
    await esperar()
    const f = conCheque(S, S.estado.form)
    f.efectivo = '99.000,00'
    f.comprobante_referencia = 'R 12'
    f.transferencias = []
    S.elegirClienteAsentar('c-jm')
    chk('lista para guardar: nada falta', S.motivosParaNoGuardar().length === 0, S.motivosParaNoGuardar().join(' | '))
    S.__setRpc(async (n) => n === 'cargar_cobranza_asentada'
      ? { data: { importe: 100000, saldo_cliente: 150000, id: f.id, asentada: true }, error: null }
      : { data: null, error: null })
    await S.guardarCobranza()
    const llamadas = S.__rpcs().filter(r => /cobranza/.test(r.nombre))
    chk('guarda con cargar_cobranza_asentada, y con nada más', llamadas.length === 1 && llamadas[0].nombre === 'cargar_cobranza_asentada', llamadas.map(r => r.nombre).join(','))
    const p = llamadas[0]?.params ?? {}
    chk('los diez parámetros, con esos nombres', Object.keys(p).sort().join(',') ===
      'p_cheques,p_cliente_id,p_comprobante_referencia,p_efectivo,p_fecha,p_fotos,p_id,p_observaciones,p_proyecto_id,p_transferencias', Object.keys(p).join(','))
    chk('p_id es el id del formulario (el reintento no duplica)', p.p_id === f.id)
    chk('p_cliente_id es el cliente de la lista', p.p_cliente_id === 'c-jm')
    chk('el efectivo como número', p.p_efectivo === 99000)
    chk('el cheque viaja', Array.isArray(p.p_cheques) && p.p_cheques.length === 1 && p.p_fotos.length === 1)
    chk('las transferencias SIEMPRE como lista (aunque vacía)', Array.isArray(p.p_transferencias) && p.p_transferencias.length === 0)
    chk('sin Taller, sin proyecto', p.p_proyecto_id === null)
    const esperado = 'Cobranza asentada · J&M (Dolce Pasta) · ' + S.formatearImporte(100000) + ' · quedó debiendo ' + S.formatearImporte(150000)
    chk('el aviso: "Cobranza asentada · J&M (Dolce Pasta) · $ … · quedó debiendo $ …"', S.__llamadas.exitos.at(-1) === esperado, S.__llamadas.exitos.at(-1))
    chk('se cierra el formulario y vuelve al listado', S.estado.form === null && S.__llamadas.vistas.at(-1) === 'listado')
  }
  // El saldo a favor, en cero y el reintento.
  {
    const S = sandbox(PROCESAR)
    const f = { cliente: 'J&M', unidad_id: 'u-nuss', transferencias: [], cheques: [], echecks: [], efectivo: '' }
    chk('saldo a favor', S.textoCobranzaAsentada(f, { importe: 5000, saldo: -2000 }) === 'Cobranza asentada · J&M (Nuss) · ' + S.formatearImporte(5000) + ' · le quedó ' + S.formatearImporte(2000) + ' a favor')
    chk('saldo en cero', /su cuenta quedó en cero$/.test(S.textoCobranzaAsentada(f, { importe: 5000, saldo: 0 })))
    chk('un reintento: "ya estaba asentada" (sin inventar el saldo)', /ya estaba asentada$/.test(S.textoCobranzaAsentada(f, { importe: null, saldo: null, reintento: true })))
    chk('sin saldo, no lo inventa', S.textoCobranzaAsentada(f, { importe: 5000, saldo: null }) === 'Cobranza asentada · J&M (Nuss) · ' + S.formatearImporte(5000))
  }
  {
    const S = sandbox(PROCESAR)
    S.abrirFormularioNuevo()
    S.elegirEmpresa('u-nuss'); await esperar(); S.elegirClienteAsentar('c-jm')
    conCheque(S, S.estado.form)
    S.__setRpc(async (n) => n === 'cargar_cobranza_asentada' ? { data: { id: 'x', reintento: true }, error: null } : { data: null, error: null })
    await S.guardarCobranza()
    chk('reintento (la base devuelve reintento: true): se da por asentada', /^Cobranza asentada · J&M \(Nuss\) · .* · ya estaba asentada$/.test(S.__llamadas.exitos.at(-1)), S.__llamadas.exitos.at(-1))
  }
  // Un error de la base se muestra TAL CUAL y la cobranza queda abierta.
  {
    const S = sandbox(PROCESAR)
    S.abrirFormularioNuevo()
    S.elegirEmpresa('u-nuss'); await esperar(); S.elegirClienteAsentar('c-jm')
    conCheque(S, S.estado.form)
    S.__setRpc(async (n) => n === 'cargar_cobranza_asentada'
      ? { data: null, error: { message: 'No hay caja de efectivo de la empresa en esa fábrica: creala antes de asentar.' } }
      : { data: null, error: null })
    await S.guardarCobranza()
    chk('error de la base: tal cual, pegado al botón', el(S, 'cob-error-guardar').textContent === 'No hay caja de efectivo de la empresa en esa fábrica: creala antes de asentar.' &&
      el(S, 'cob-error-guardar').hidden === false && S.estado.form !== null)
  }
  // Sin señal: queda en el celular para reintentar con el mismo id.
  {
    const S = sandbox(PROCESAR)
    S.abrirFormularioNuevo()
    S.elegirEmpresa('u-nuss'); await esperar(); S.elegirClienteAsentar('c-jm')
    conCheque(S, S.estado.form)
    S.__setRpc(async (n) => n === 'cargar_cobranza_asentada' ? { data: null, error: { message: 'Failed to fetch' } } : { data: null, error: null })
    await S.guardarCobranza()
    chk('sin señal: se guarda en el celular, no se pierde', /Se guardó en el celular/.test(S.__llamadas.exitos.at(-1) ?? ''))
  }

  // ══ 5. LAS CUATRO FORMAS: SOLO TRANSFERENCIAS ENTRA ════════════════════════
  {
    const S = sandbox(PROCESAR)
    S.estado.cuentasBancoLista = [
      { id: 'cta-nuss', nombre: 'Macro Nuss', unidad_negocio_id: 'u-nuss' },
      { id: 'cta-dolce', nombre: 'Macro Dolce', unidad_negocio_id: 'u-dolce' },
    ]
    S.estado.cuentasBanco = new Map(S.estado.cuentasBancoLista.map(c => [c.id, c]))
    S.abrirFormularioNuevo()
    S.elegirEmpresa('u-nuss'); await esperar(); S.elegirClienteAsentar('c-zeta')
    const f = S.estado.form
    f.transferencias = [{ ...S.transferenciaVacia('2026-10-01'), cuenta_id: 'cta-nuss', cuenta_nombre: 'Macro Nuss', importe: '50.000,00' }]
    chk('solo con una transferencia: se puede guardar', !S.motivosParaNoGuardar().some(m => /forma de pago|transferencias todavía/.test(m)), S.motivosParaNoGuardar().join(' | '))
    chk('las cuentas que se ofrecen son de la empresa elegida', S.cuentasParaElegir('').map(c => c.id).join(',') === 'cta-nuss')
    S.__setRpc(async (n) => n === 'cargar_cobranza_asentada' ? { data: { importe: 50000, saldo_cliente: 0 }, error: null } : { data: null, error: null })
    await S.guardarCobranza()
    const p = rpcs(S, 'cargar_cobranza_asentada')[0]?.params ?? {}
    chk('la transferencia viaja con su cuenta', p.p_transferencias?.length === 1 && p.p_transferencias[0].cuenta_id === 'cta-nuss', JSON.stringify(p.p_transferencias))
    const S2 = sandbox(PROCESAR)
    S2.estado.cuentasBancoLista = S.estado.cuentasBancoLista
    S2.estado.cuentasBanco = S.estado.cuentasBanco
    S2.abrirFormularioNuevo()
    S2.elegirEmpresa('u-nuss')
    S2.estado.form.transferencias = [{ ...S2.transferenciaVacia('2026-10-01'), cuenta_id: 'cta-nuss', cuenta_nombre: 'Macro Nuss', importe: '1,00' }]
    S2.elegirEmpresa('u-dolce')
    chk('cambiar de empresa suelta la cuenta de banco de la otra', S2.estado.form.transferencias[0].cuenta_id === '')
    const S3 = sandbox(PROCESAR)
    S3.abrirFormularioNuevo(); S3.elegirEmpresa('u-nuss'); await esperar(); S3.elegirClienteAsentar('c-zeta')
    chk('sin ninguna forma de pago: falta algo', S3.motivosParaNoGuardar().includes('Cargá al menos una forma de pago: efectivo, un cheque, un e-cheque o una transferencia.'))
  }

  // ══ 6. EL TALLER PIDE EL PROYECTO ══════════════════════════════════════════
  {
    const S = sandbox(PROCESAR)
    const PROY = [
      { id: 'p-1', nombre: 'Máquina ' + MAL, destino: 'externo', estado: 'en_curso', cliente_id: 'c-jm' },
      { id: 'p-2', nombre: 'Interno', destino: 'interno', estado: 'en_curso', cliente_id: 'c-jm' },
      { id: 'p-3', nombre: 'De otro', destino: 'externo', estado: 'aprobado', cliente_id: 'c-zeta' },
      { id: 'p-4', nombre: 'Cancelado', destino: 'externo', estado: 'cancelado', cliente_id: 'c-jm' },
    ]
    S.__setRpc(async (n, p) => {
      if (n === 'buscar_clientes') return { data: clientesDe(p.p_unidad_negocio_id), error: null }
      if (n === 'proyectos_taller') return { data: PROY, error: null }
      if (n === 'cargar_cobranza_asentada') return { data: { importe: 1000, saldo_cliente: 0 }, error: null }
      return { data: null, error: null }
    })
    S.abrirFormularioNuevo()
    S.elegirEmpresa('u-taller'); await esperar()
    chk('Taller sin cliente: no pide proyecto todavía', el(S, 'cob-campo-proyecto').hidden === true && rpcs(S, 'proyectos_taller').length === 0)
    S.elegirClienteAsentar('c-jm'); await esperar()
    chk('Taller con cliente: lee los proyectos', rpcs(S, 'proyectos_taller').length === 1)
    const html = el(S, 'cob-campo-proyecto').innerHTML
    chk('ofrece SOLO los proyectos externos y no cancelados de ESE cliente', /value="p-1"/.test(html) && !/p-2|p-3|p-4/.test(html))
    chk('el nombre del proyecto va escapado', html.includes('Máquina ' + MAL_ESC) && !html.includes(MAL))
    chk('se puede elegir "Ninguno en particular"', /<option value="ninguno">Ninguno en particular<\/option>/.test(html))
    chk('sin elegir: falta el proyecto', S.motivosParaNoGuardar().includes('Elegí a qué proyecto del Taller va (o «Ninguno en particular»).'))
    conCheque(S, S.estado.form)
    S.alElegirProyecto({ target: { id: 'cob-proyecto', value: 'p-1' } })
    chk('elegido: ya no falta', !S.motivosParaNoGuardar().some(m => /proyecto/.test(m)))
    await S.guardarCobranza()
    chk('el proyecto viaja en p_proyecto_id', rpcs(S, 'cargar_cobranza_asentada')[0]?.params?.p_proyecto_id === 'p-1')
    chk('"Ninguno en particular" viaja como null', S.proyectoParaBase({ proyecto_id: 'ninguno' }) === null && S.proyectoParaBase({ proyecto_id: null }) === null)
  }
  {
    const S = sandbox(PROCESAR)
    S.__setRpc(async (n, p) => n === 'buscar_clientes' ? { data: clientesDe(p.p_unidad_negocio_id), error: null } : { data: null, error: null })
    S.abrirFormularioNuevo(); S.elegirEmpresa('u-taller'); await esperar(); S.elegirClienteAsentar('c-jm'); await esperar()
    chk('sin permiso del Taller (null): lo dice y no traba', /no se ven los proyectos/.test(el(S, 'cob-campo-proyecto').innerHTML) &&
      !S.motivosParaNoGuardar().some(m => /proyecto/.test(m)))
  }
  {
    const S = sandbox(PROCESAR)
    S.abrirFormularioNuevo(); S.elegirEmpresa('u-nuss'); await esperar(); S.elegirClienteAsentar('c-jm'); await esperar()
    chk('otra empresa que no es el Taller: no pide proyecto', el(S, 'cob-campo-proyecto').hidden === true && rpcs(S, 'proyectos_taller').length === 0)
  }

  // ══ 7. LOS DEMÁS: COMO SIEMPRE ═════════════════════════════════════════════
  {
    const S = sandbox({ ...CHOFER, barra: 'u-dolce' })
    S.abrirFormularioNuevo()
    const f = S.estado.form
    chk('sin procesar: la cobranza NO se marca para asentar', f.asentar !== true && !S.esFormAsentado(f))
    chk('sin procesar: no hay empresa ni lista; el cliente se escribe', el(S, 'cob-asentar').hidden === true && el(S, 'cob-campo-cliente-libre').hidden === false)
    chk('sin procesar: no busca clientes', rpcs(S, 'buscar_clientes').length === 0)
    chk('sin procesar: lo que falta es el cliente escrito', S.motivosParaNoGuardar().includes('Falta el cliente.') &&
      !S.motivosParaNoGuardar().some(m => /empresa|de la lista/.test(m)))
    chk('sin procesar: el botón dice "Guardar cobranza"', el(S, 'cob-btn-guardar').textContent === 'Guardar cobranza')
    chk('sin procesar: el subtítulo de siempre', S.__llamadas.subtitulos.at(-1) === 'Nueva cobranza')
    f.cliente = 'el Turco'
    conCheque(S, f)
    S.__setRpc(async () => ({ data: { id: f.id, ya_existia: false }, error: null }))
    await S.guardarCobranza()
    const llamadas = S.__rpcs().filter(r => /cobranza/.test(r.nombre))
    chk('sin procesar: guarda con guardar_cobranza (queda por asentar)', llamadas.length === 1 && llamadas[0].nombre === 'guardar_cobranza', llamadas.map(r => r.nombre).join(','))
    chk('sin procesar: el cliente viaja como lo escribió', llamadas[0]?.params?.p_cliente === 'el Turco' && !('p_cliente_id' in (llamadas[0]?.params ?? {})))
    chk('sin procesar: el aviso de siempre', S.__llamadas.exitos.at(-1) === 'Cobranza guardada.')
  }
  // Una edición nunca se asienta sola.
  {
    const S = sandbox(PROCESAR)
    chk('una edición no es una cobranza ya asentada', !S.esFormAsentado({ asentar: true, modo: 'edicion' }))
    chk('sin la marca, tampoco', !S.esFormAsentado({ modo: 'nueva' }) && !S.esFormAsentado(null))
  }

  // ══ 8. EL FUENTE ═══════════════════════════════════════════════════════════
  {
    chk('el init repinta la empresa al llegar las unidades y la fábrica de pruebas',
      /asegurarFabrica\(\)\.then\(\(\) => \{ if \(esFormAsentado\(estado\.form\)\) pintarAsentar\(\) \}\)/.test(FUENTE) &&
      /if \(esFormAsentado\(estado\.form\)\) pintarAsentar\(\)\n {6}\}\)/.test(FUENTE))
    chk('las unidades traen prefijo y logo', /\.from\('unidades_negocio'\)\.select\('id, nombre, activo, prefijo, logo_url'\)/.test(FUENTE))
    chk('los listeners están conectados', /getElementById\('cob-asentar'\)\.addEventListener\('click', alTocarEnAsentar\)/.test(FUENTE) &&
      /getElementById\('cob-asentar-buscar'\)\.addEventListener\('input', alEscribirClienteAsentar\)/.test(FUENTE) &&
      /getElementById\('cob-campo-proyecto'\)\.addEventListener\('change', alElegirProyecto\)/.test(FUENTE))
    chk('los botones de empresa miden 64px y van en dos columnas',
      /\.cob-empresas \{\s*display: grid;\s*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/.test(FUENTE) &&
      /\.cob-empresa \{[^}]*min-height: 64px;/.test(FUENTE))
    chk('la empresa elegida va en naranja (lo que se toca)', /\.cob-empresa\[aria-pressed="true"\] \{\s*border-color: var\(--naranja\);/.test(FUENTE))
  }
}

pruebas().then(() => {
  const total = ok + fallas.length
  for (const f of fallas) console.log('  ✗', f)
  console.log(`${ok}/${total} ${fallas.length ? 'ROJO' : 'verde'}`)
  process.exit(fallas.length ? 1 : 0)
}).catch(err => {
  console.log('EXCEPCIÓN:', err && err.stack || err)
  console.log('ROJO')
  process.exit(1)
})
