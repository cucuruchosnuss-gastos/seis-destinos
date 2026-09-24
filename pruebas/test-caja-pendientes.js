// Burbujas de pendientes de modulos/caja.html (24/09/2026).
//
// mis_pendientes() devuelve para caja dos claves —solicitudes_mi_caja y
// solicitudes_empresa— y la tarjeta del dashboard muestra su SUMA. Adentro de
// Caja cada una va en su lugar, con el número DE LA RPC (nunca un recuento
// propio), así lo que dice la tarjeta se encuentra:
//   - mi caja  → "Mi caja" del listado (o mi fila, si ese botón no se muestra)
//                y la sección de solicitudes de MI ficha;
//   - empresa  → el atajo "Empresa" (las dos ubicaciones, gate ver_empresa SIN
//                bypass) y la sección de solicitudes de la ficha de Empresa.
//
// Se EJECUTA el código real (sandbox con clausura desde los puntos de
// entrada): la agrupación, el render de cada burbuja, el repintado, la carga
// con su turno, las secciones que la contienen, el orden de las solicitudes
// (las que tengo que responder arriba y la sección abierta) y el refresco
// después de resolver una.
//
//   node pruebas/test-caja-pendientes.js
//   ARCHIVO_TEST=otra-copia.html node pruebas/test-caja-pendientes.js

const path = require('path')
const { construirCon, scriptModulo } = require('./sandbox')
const { arnes, marca, chequearMarcas, leer } = require('./circuito-comun')
const { extraerFn } = require('./extraer')
const { fuenteNumeros } = require('./numeros-comun')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/caja.html')
const FUENTE = leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

// Red, navegación y cargas pesadas: se stubean en el preludio.
const STUBS = new Set([
  'verificarSesion', 'mostrarBannerVersion', 'mostrarError', 'mostrarExito', 'formatearFecha',
  'abrirDetallePersona', 'abrirDirectorio', 'abrirModalMovimiento', 'abrirModalTraspaso',
  'responderSolicitud', 'abrirModalRechazo', 'cancelarSolicitud',
  'refrescarSaldosDeFicha', 'actualizarBadgePendientesListado', 'cargarMovimientos', 'cargarSolicitudesPendientes',
  'init',
])

const ENTRADAS = [
  'esc', 'agruparPendientesCaja', 'htmlBurbujaCaja', 'pintarBurbujasCaja', 'cargarPendientesCaja',
  'tipoBurbujaDeFicha', 'miCajaTieneBoton', 'puedoResponderSolicitud',
  'renderizarSolicitudesPendientes', 'renderizarFilaSolicitud', 'renderizarTarjetaPersona',
  'renderizarAccionesDetalle', 'refrescarTrasResolucionSolicitud',
]

function clausura(src) {
  const nombresFn = new Set([...src.matchAll(/(?:^|\n)\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g)].map(m => m[1]))
  const posConst = new Map([...src.matchAll(/\n {4}const ([A-Za-z_$][\w$]*)\s*=/g)].map(m => [m[1], m.index + 1]))
  const fns = new Set(), consts = []
  const cola = [...ENTRADAS]
  const mirar = (texto) => {
    for (const m of texto.matchAll(/[A-Za-z_$][\w$]*/g)) {
      const id = m[0]
      if (nombresFn.has(id) && !fns.has(id) && !STUBS.has(id)) cola.push(id)
      if (posConst.has(id) && !consts.includes(id)) {
        consts.push(id)
        const resto = src.slice(posConst.get(id))
        const f = resto.slice(1).search(/\n {4}(?:const|let|function|async function|\/\/)/)
        mirar(resto.slice(0, f === -1 ? 400 : f + 1))
      }
    }
  }
  while (cola.length) {
    const n = cola.shift()
    if (fns.has(n) || STUBS.has(n)) continue
    let texto
    try { texto = extraerFn(src, n) } catch (e) { chk(`existe la función ${n}`, false, e.message); continue }
    fns.add(n)
    mirar(texto)
  }
  consts.sort((a, b) => posConst.get(a) - posConst.get(b))
  return { funciones: [...fns], constantes: consts }
}

const PRELUDIO = `
  ${fuenteNumeros()}
  var __warns = [], __errores = []
  var console = { log(){}, warn(...a){ __warns.push(a.join(' ')) }, error(...a){ __errores.push(a.join(' ')) } }
  function nuevoEl(id) {
    const el = {
      id, innerHTML: '', textContent: '', value: '', className: '', hidden: false, checked: false, disabled: false,
      title: '', dataset: {}, style: {},
      querySelector: () => nuevoEl('hijo'), querySelectorAll: () => [], addEventListener(){}, focus(){},
      removeAttribute(){}, setAttribute(){}, remove(){},
      classList: { add(){}, remove(){}, toggle(){}, contains: () => false },
    }
    return el
  }
  var __els = new Map()
  var document = {
    getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) },
    querySelectorAll: () => [], querySelector: (s) => nuevoEl(s), addEventListener(){},
    createElement: (t) => nuevoEl('creado-' + t), visibilityState: 'visible',
  }
  var location = { href: 'https://x.test/modulos/caja.html' }
  var window = { location: { set href(v) {}, replace(v) {} } }
  var __rpcLlamadas = []
  var __rpc = async () => ({ data: [], error: null })
  function __consulta() {
    const q = {}
    for (const k of ['select', 'eq', 'neq', 'in', 'is', 'order', 'gte', 'lte', 'limit', 'or', 'not']) q[k] = () => q
    q.maybeSingle = () => q
    q.then = (res, rej) => Promise.resolve({ data: [], error: null, count: 0 }).then(res, rej)
    return q
  }
  var supabase = { from: () => __consulta(), rpc: (n, p) => { __rpcLlamadas.push(n); return __rpc(n, p) } }
  function mostrarError() {} function mostrarExito() {}
  function formatearFecha(fecha) { const [a, m, d] = fecha.split('-'); return d + '/' + m + '/' + a }
  function abrirDetallePersona() {} function abrirDirectorio() {} function abrirModalMovimiento() {} function abrirModalTraspaso() {}
  function responderSolicitud() {} function abrirModalRechazo() {} function cancelarSolicitud() {}
  async function refrescarSaldosDeFicha() {} async function actualizarBadgePendientesListado() {}
  async function cargarMovimientos() {} async function cargarSolicitudesPendientes() {}
`

const RETORNO = 'estado, __el(id){ return document.getElementById(id) }, __warns, __errores, __rpcLlamadas, __setRpc(f){ __rpc = f }'

function nuevoSandbox() {
  const { funciones, constantes } = clausura(scriptModulo(ARCHIVO))
  const S = construirCon(ARCHIVO, { preludio: PRELUDIO, funciones, constantes, retorno: RETORNO })
  const E = S.estado
  E.miEmpleado = { id: 'yo', nombre: 'Yo', rol_app: 'usuario' }
  E.idEmpresa = 'emp'
  E.misTareasCaja = new Set(['ver_empresa'])
  E.nombresEmpleados = { yo: 'Yo', p1: 'Persona 1', emp: 'Empresa' }
  E.maestros.unidadesNegocio = []
  E.saldos = []
  return S
}

const FILAS = [
  { modulo: 'caja', clave: 'solicitudes_mi_caja', cantidad: 1, texto: 'Movimientos por aceptar en mi caja' },
  { modulo: 'caja', clave: 'solicitudes_empresa', cantidad: 1, texto: 'Movimientos por aceptar en la caja de la empresa' },
  { modulo: 'cobranzas', clave: 'por_controlar', cantidad: 7, texto: 'Cobranzas por controlar' },
]

// El contenido de una burbuja: el número que se ve.
const numeroDe = (html) => ((html || '').match(/<span class="burbuja-caja"[^>]*>([^<]*)<\/span>/) || [])[1]
const labelDe = (html) => ((html || '').match(/aria-label="([^"]*)"/) || [])[1]
const titleDe = (html) => ((html || '').match(/title="([^"]*)"/) || [])[1]

async function casos() {
  // ── 1. Agrupación ───────────────────────────────────────────────────────
  {
    const S = nuevoSandbox()
    const g = S.agruparPendientesCaja(FILAS)
    chk('mi caja = 1', g.mi?.total === 1, JSON.stringify(g))
    chk('empresa = 1', g.empresa?.total === 1, JSON.stringify(g))
    chk('la suma de las dos es 2 (lo que muestra la tarjeta del dashboard)', (g.mi?.total || 0) + (g.empresa?.total || 0) === 2)
    chk('otro módulo no entra', Object.keys(g).sort().join() === 'empresa,mi', JSON.stringify(Object.keys(g)))
    chk('el detalle dice cantidad + texto en minúscula', g.mi?.detalle === '1 movimientos por aceptar en mi caja', g.mi?.detalle)
    chk('otro módulo no se avisa por consola', S.__warns.length === 0, S.__warns.join('|'))

    const S2 = nuevoSandbox()
    const g2 = S2.agruparPendientesCaja([{ modulo: 'caja', clave: 'otra_cosa', cantidad: 3, texto: 'x' }])
    chk('clave de caja desconocida: se ignora', Object.keys(g2).length === 0, JSON.stringify(g2))
    chk('clave de caja desconocida: se avisa por consola', S2.__warns.some(w => w.includes('otra_cosa')), S2.__warns.join('|'))

    for (const [nombre, c] of [['0', 0], ['null', null], ['undefined', undefined], ["''", ''], ['texto', 'abc'], ['1.5', 1.5], ['-1', -1], ['true', true], ["'0'", '0']]) {
      const g3 = S.agruparPendientesCaja([{ modulo: 'caja', clave: 'solicitudes_mi_caja', cantidad: c, texto: 't' }])
      chk(`cantidad ${nombre} → sin burbuja`, !g3.mi, JSON.stringify(g3))
    }
    chk("cantidad '3' (texto de dígitos) cuenta 3", S.agruparPendientesCaja([{ modulo: 'caja', clave: 'solicitudes_mi_caja', cantidad: '3', texto: 't' }]).mi?.total === 3)
    chk('entrada que no es lista → nada', Object.keys(S.agruparPendientesCaja(null)).length === 0)
  }

  // ── 2. Carga y repintado: las dos, cada una en su lugar ─────────────────
  {
    const S = nuevoSandbox()
    S.estado.personaAbierta = 'yo'
    S.__setRpc(async (n) => ({ data: n === 'mis_pendientes' ? FILAS : null, error: null }))
    await S.cargarPendientesCaja()
    chk('llama a mis_pendientes', S.__rpcLlamadas.includes('mis_pendientes'), S.__rpcLlamadas.join())
    const mi = S.__el('burbuja-btn-mi-caja').innerHTML
    const emp = S.__el('burbuja-btn-empresa-atajo').innerHTML
    chk('"Mi caja" dice 1', numeroDe(mi) === '1', mi)
    chk('"Empresa" dice 1', numeroDe(emp) === '1', emp)
    chk('la suma de las dos burbujas es 2', Number(numeroDe(mi)) + Number(numeroDe(emp)) === 2)
    chk('el atajo Empresa de la ficha propia dice 1', numeroDe(S.__el('burbuja-detalle-empresa-atajo').innerHTML) === '1')
    chk('la sección de solicitudes de MI ficha lleva la de mi caja', labelDe(S.__el('burbuja-solicitudes').innerHTML) === '1 movimientos por aceptar en mi caja', S.__el('burbuja-solicitudes').innerHTML)
    chk('aria-label de mi caja', labelDe(mi) === '1 movimientos por aceptar en mi caja', mi)
    chk('title de mi caja', titleDe(mi) === '1 movimientos por aceptar en mi caja', mi)
    chk('aria-label de empresa', labelDe(emp) === '1 movimientos por aceptar en la caja de la empresa', emp)
    chk('title de empresa', titleDe(emp) === '1 movimientos por aceptar en la caja de la empresa', emp)
    chk('sin retiros_todos ni movimientos_todos, la de mi caja va en mi fila del listado', numeroDe(S.__el('burbuja-tarjeta-propia').innerHTML) === '1')

    // Ficha de Empresa abierta: su sección lleva la de empresa.
    S.estado.personaAbierta = 'emp'
    S.pintarBurbujasCaja()
    chk('la sección de solicitudes de la ficha de Empresa lleva la de empresa', labelDe(S.__el('burbuja-solicitudes').innerHTML) === '1 movimientos por aceptar en la caja de la empresa', S.__el('burbuja-solicitudes').innerHTML)
    // Ficha de otra persona: nada.
    S.estado.personaAbierta = 'p1'
    S.pintarBurbujasCaja()
    chk('la ficha de otra persona no lleva burbuja', S.__el('burbuja-solicitudes').innerHTML === '', S.__el('burbuja-solicitudes').innerHTML)
    S.estado.personaAbierta = null
    S.pintarBurbujasCaja()
    chk('sin ficha abierta la sección no lleva burbuja', S.__el('burbuja-solicitudes').innerHTML === '')

    // Con el botón "Mi caja" visible, mi fila no la repite.
    S.estado.misTareasCaja = new Set(['ver_empresa', 'retiros_todos'])
    S.pintarBurbujasCaja()
    chk('con "Mi caja" visible, mi fila no repite la burbuja', S.__el('burbuja-tarjeta-propia').innerHTML === '')
    chk('con "Mi caja" visible, el botón la tiene', numeroDe(S.__el('burbuja-btn-mi-caja').innerHTML) === '1')
    S.estado.misTareasCaja = new Set(['ver_empresa', 'movimientos_todos'])
    S.pintarBurbujasCaja()
    chk('movimientos_todos también muestra "Mi caja": mi fila no la repite', S.__el('burbuja-tarjeta-propia').innerHTML === '')
  }

  // ── 3. Sin ver_empresa no hay burbuja de empresa (tampoco un super_admin) ─
  {
    const S = nuevoSandbox()
    S.estado.misTareasCaja = new Set()
    S.estado.miEmpleado.rol_app = 'super_admin'
    S.estado.personaAbierta = 'emp'
    S.__setRpc(async () => ({ data: FILAS, error: null }))
    await S.cargarPendientesCaja()
    chk('sin ver_empresa: el atajo Empresa no lleva burbuja', S.__el('burbuja-btn-empresa-atajo').innerHTML === '', S.__el('burbuja-btn-empresa-atajo').innerHTML)
    chk('sin ver_empresa: el atajo de la ficha no lleva burbuja', S.__el('burbuja-detalle-empresa-atajo').innerHTML === '')
    chk('sin ver_empresa: la sección de Empresa no lleva burbuja', S.__el('burbuja-solicitudes').innerHTML === '')
    chk('sin ver_empresa: la de mi caja sigue', numeroDe(S.__el('burbuja-btn-mi-caja').innerHTML) === '1')
    // Sin idEmpresa resuelto, tampoco.
    S.estado.misTareasCaja = new Set(['ver_empresa'])
    S.estado.idEmpresa = null
    S.pintarBurbujasCaja()
    chk('sin idEmpresa: el atajo Empresa no lleva burbuja', S.__el('burbuja-btn-empresa-atajo').innerHTML === '')
  }

  // ── 4. Cero / null / fallo → nada, y borra lo que había ──────────────────
  {
    const S = nuevoSandbox()
    S.estado.personaAbierta = 'yo'
    S.__setRpc(async () => ({ data: FILAS, error: null }))
    await S.cargarPendientesCaja()
    chk('(previo) había burbujas', numeroDe(S.__el('burbuja-btn-mi-caja').innerHTML) === '1')

    S.__setRpc(async () => ({ data: [
      { modulo: 'caja', clave: 'solicitudes_mi_caja', cantidad: 0, texto: 'x' },
      { modulo: 'caja', clave: 'solicitudes_empresa', cantidad: null, texto: 'x' },
    ], error: null }))
    await S.cargarPendientesCaja()
    for (const id of ['burbuja-btn-mi-caja', 'burbuja-btn-empresa-atajo', 'burbuja-detalle-empresa-atajo', 'burbuja-solicitudes', 'burbuja-tarjeta-propia']) {
      chk(`0 / null: ${id} vacío`, S.__el(id).innerHTML === '', S.__el(id).innerHTML)
    }

    await (async () => { S.__setRpc(async () => ({ data: FILAS, error: null })); await S.cargarPendientesCaja() })()
    S.__setRpc(async () => ({ data: null, error: { message: 'boom' } }))
    await S.cargarPendientesCaja()
    chk('error de la RPC: estado en null (no se sabe)', S.estado.pendientesCaja === null)
    for (const id of ['burbuja-btn-mi-caja', 'burbuja-btn-empresa-atajo', 'burbuja-solicitudes']) {
      chk(`error de la RPC: ${id} vacío (nunca el número viejo)`, S.__el(id).innerHTML === '', S.__el(id).innerHTML)
    }
    chk('error de la RPC: se loguea', S.__errores.some(e => e.includes('mis_pendientes')))

    await (async () => { S.__setRpc(async () => ({ data: FILAS, error: null })); await S.cargarPendientesCaja() })()
    S.__setRpc(async () => { throw new Error('sin red') })
    await S.cargarPendientesCaja()
    chk('excepción de red: burbuja vacía', S.__el('burbuja-btn-mi-caja').innerHTML === '' && S.estado.pendientesCaja === null)
  }

  // ── 5. Una respuesta vieja no pisa la nueva ──────────────────────────────
  {
    const S = nuevoSandbox()
    let soltarVieja
    const vieja = new Promise(r => { soltarVieja = r })
    let n = 0
    S.__setRpc(() => {
      n++
      if (n === 1) return vieja.then(() => ({ data: [{ modulo: 'caja', clave: 'solicitudes_mi_caja', cantidad: 5, texto: 'Viejo' }], error: null }))
      return Promise.resolve({ data: [{ modulo: 'caja', clave: 'solicitudes_mi_caja', cantidad: 2, texto: 'Nuevo' }], error: null })
    })
    const p1 = S.cargarPendientesCaja()
    const p2 = S.cargarPendientesCaja()
    await p2
    soltarVieja()
    await p1
    chk('la respuesta vieja no pisa la nueva', numeroDe(S.__el('burbuja-btn-mi-caja').innerHTML) === '2', S.__el('burbuja-btn-mi-caja').innerHTML)
    chk('el estado es el de la nueva', S.estado.pendientesCaja?.mi?.total === 2)
  }

  // ── 6. Texto malicioso en `texto`, escapado ─────────────────────────────
  {
    const S = nuevoSandbox()
    S.estado.personaAbierta = 'yo'
    S.__setRpc(async () => ({ data: [
      { modulo: 'caja', clave: 'solicitudes_mi_caja', cantidad: 1, texto: marca('texto_mi') },
      { modulo: 'caja', clave: 'solicitudes_empresa', cantidad: 1, texto: marca('texto_emp') },
    ], error: null }))
    await S.cargarPendientesCaja()
    chequearMarcas(chk, 'burbuja de mi caja', S.__el('burbuja-btn-mi-caja').innerHTML, ['texto_mi'])
    chequearMarcas(chk, 'burbuja de empresa', S.__el('burbuja-btn-empresa-atajo').innerHTML, ['texto_emp'])
    chequearMarcas(chk, 'burbuja de la sección', S.__el('burbuja-solicitudes').innerHTML, ['texto_mi'])
    // Y en las plantillas que la traen puesta.
    S.estado.origenFicha = 'directo'
    S.renderizarAccionesDetalle('yo')
    chequearMarcas(chk, 'acciones de la ficha con la burbuja de empresa', S.__el('detalle-persona-acciones').innerHTML, ['texto_emp'])
  }

  // ── 7. 99+ ──────────────────────────────────────────────────────────────
  {
    const S = nuevoSandbox()
    S.__setRpc(async () => ({ data: [{ modulo: 'caja', clave: 'solicitudes_mi_caja', cantidad: 150, texto: 'X' }], error: null }))
    await S.cargarPendientesCaja()
    chk('más de 99 dice 99+', numeroDe(S.__el('burbuja-btn-mi-caja').innerHTML) === '99+')
    chk('el aria-label dice el número real', labelDe(S.__el('burbuja-btn-mi-caja').innerHTML) === '150 x')
    // El guard propio del render (hoy agruparPendientesCaja ya filtra el cero,
    // pero el render no depende de eso: un estado armado por otro camino no
    // dibuja un "0").
    S.estado.pendientesCaja = { mi: { total: 0, detalle: '0 x' }, empresa: { total: -2, detalle: 'x' } }
    chk('htmlBurbujaCaja con total 0 no dibuja nada', S.htmlBurbujaCaja('mi') === '', S.htmlBurbujaCaja('mi'))
    chk('htmlBurbujaCaja con total negativo no dibuja nada', S.htmlBurbujaCaja('empresa') === '')
    S.estado.pendientesCaja = null
    chk('htmlBurbujaCaja sin datos (null) no dibuja nada', S.htmlBurbujaCaja('mi') === '')
    chk('htmlBurbujaCaja con un tipo desconocido no dibuja nada', (S.estado.pendientesCaja = { otro: { total: 3, detalle: 'x' } }, S.htmlBurbujaCaja('otro') === ''))
  }

  // ── 8. Cada burbuja adentro de SU elemento ───────────────────────────────
  {
    const src = FUENTE
    chk('el slot de "Mi caja" está ADENTRO del botón #btn-mi-caja',
      /<button[^>]*id="btn-mi-caja"[^>]*>[^<]*<span id="burbuja-btn-mi-caja"><\/span><\/button>/.test(src))
    chk('el slot de "Empresa" está ADENTRO del botón #btn-empresa-atajo',
      /<button[^>]*id="btn-empresa-atajo"[^>]*>[^<]*<span id="burbuja-btn-empresa-atajo"><\/span><\/button>/.test(src))

    const S = nuevoSandbox()
    S.estado.pendientesCaja = S.agruparPendientesCaja(FILAS)
    S.estado.origenFicha = 'directo'
    S.renderizarAccionesDetalle('yo')
    const acc = S.__el('detalle-persona-acciones').innerHTML
    chk('ficha propia (directo): la burbuja de empresa está ADENTRO del botón #btn-detalle-empresa-atajo',
      /<button[^>]*id="btn-detalle-empresa-atajo"[^>]*>Empresa<span id="burbuja-detalle-empresa-atajo"><span class="burbuja-caja"[^>]*>1<\/span><\/span><\/button>/.test(acc), acc)
    chk('la burbuja de mi caja NO está en las acciones de la ficha', !/movimientos por aceptar en mi caja/.test(acc))

    S.estado.personaAbierta = 'yo'
    S.estado.solicitudesPendientes = []
    S.renderizarSolicitudesPendientes()
    const secMi = S.__el('detalle-persona-solicitudes').innerHTML
    chk('mi ficha: la burbuja de mi caja está ADENTRO del <summary> de la sección',
      /<summary[^>]*>Movimientos pendientes \(0\)<span id="burbuja-solicitudes"><span class="burbuja-caja"[^>]*aria-label="1 movimientos por aceptar en mi caja"[^>]*>1<\/span><\/span><\/summary>/.test(secMi), secMi)
    S.estado.personaAbierta = 'emp'
    S.renderizarSolicitudesPendientes()
    const secEmp = S.__el('detalle-persona-solicitudes').innerHTML
    chk('ficha de Empresa: la burbuja de empresa está ADENTRO del <summary>',
      /<summary[^>]*>[^<]*<span id="burbuja-solicitudes"><span class="burbuja-caja"[^>]*aria-label="1 movimientos por aceptar en la caja de la empresa"/.test(secEmp), secEmp)
    S.estado.personaAbierta = 'p1'
    S.renderizarSolicitudesPendientes()
    chk('ficha de otra persona: el <summary> sin burbuja', !/burbuja-caja/.test(S.__el('detalle-persona-solicitudes').innerHTML))

    const miFila = S.renderizarTarjetaPersona({ id: 'yo', nombre: 'Yo' })
    chk('listado: la burbuja de mi caja está ADENTRO del título de MI fila',
      /<div class="tarjeta-lista" data-id="yo">[\s\S]*<div class="tarjeta-lista__titulo">Yo<span id="burbuja-tarjeta-propia"><span class="burbuja-caja"[^>]*>1<\/span><\/span><\/div>/.test(miFila), miFila)
    const otraFila = S.renderizarTarjetaPersona({ id: 'p1', nombre: 'Persona 1' })
    chk('listado: la fila de otra persona no tiene burbuja ni slot', !/burbuja/.test(otraFila), otraFila)
  }

  // ── 9. Dentro de la sección: las que tengo que responder, arriba y abiertas ─
  {
    const S = nuevoSandbox()
    S.estado.personaAbierta = 'yo'
    const base = { monto: 5, moneda: 'ARS', medio_pago: 'efectivo', cuenta_origen_id: null, cuenta_destino_id: null, fecha: '2026-09-10', descripcion: null }
    S.estado.solicitudesPendientes = [
      { ...base, id: 'esperando', origen_empleado_id: 'yo', destino_empleado_id: 'p1', creado_por: 'yo' },
      { ...base, id: 'responder', origen_empleado_id: 'p1', destino_empleado_id: 'yo', creado_por: 'p1' },
    ]
    S.renderizarSolicitudesPendientes()
    const h = S.__el('detalle-persona-solicitudes').innerHTML
    chk('con algo para responder, la sección arranca ABIERTA', /<details open>/.test(h), h.slice(0, 120))
    const iResp = h.indexOf('data-id="responder"'), iEsp = h.indexOf('data-id="esperando"')
    chk('las dos solicitudes se dibujaron', iResp !== -1 && iEsp !== -1)
    chk('la que tengo que responder va ARRIBA de la que espera a otro', iResp !== -1 && iEsp !== -1 && iResp < iEsp)
    chk('no se reordenó el estado (solo lo que se muestra)', S.estado.solicitudesPendientes[0].id === 'esperando')

    S.estado.solicitudesPendientes = [S.estado.solicitudesPendientes[0]]
    S.renderizarSolicitudesPendientes()
    chk('sin nada para responder, la sección arranca CERRADA', /<details>/.test(S.__el('detalle-persona-solicitudes').innerHTML))

    // puedoResponderSolicitud: la misma regla que los botones.
    const R = S.puedoResponderSolicitud
    chk('responder: parte y no creador', R({ origen_empleado_id: 'p1', destino_empleado_id: 'yo', creado_por: 'p1' }) === true)
    chk('no responder: creador', R({ origen_empleado_id: 'yo', destino_empleado_id: 'p1', creado_por: 'yo' }) === false)
    chk('no responder: tercero', R({ origen_empleado_id: 'p1', destino_empleado_id: 'p2', creado_por: 'p1' }) === false)
    chk('con Empresa y usuario común: no', R({ origen_empleado_id: 'emp', destino_empleado_id: 'yo', creado_por: 'p1' }) === false)
    S.estado.miEmpleado.rol_app = 'super_admin'
    chk('con Empresa y super_admin: sí, aunque la haya creado', R({ origen_empleado_id: 'emp', destino_empleado_id: 'p1', creado_por: 'yo' }) === true)
  }

  // ── 10. Refrescos: al resolver una solicitud, al volver a la pestaña, al abrir ─
  {
    const S = nuevoSandbox()
    S.estado.personaAbierta = 'yo'
    S.estado.origenFicha = 'directo'
    await S.refrescarTrasResolucionSolicitud(false)
    chk('después de rechazar/cancelar se vuelve a pedir mis_pendientes', S.__rpcLlamadas.includes('mis_pendientes'), S.__rpcLlamadas.join())
    const S2 = nuevoSandbox()
    S2.estado.personaAbierta = 'yo'
    await S2.refrescarTrasResolucionSolicitud(true)
    chk('después de aceptar se vuelve a pedir mis_pendientes', S2.__rpcLlamadas.includes('mis_pendientes'))

    const src = scriptModulo(ARCHIVO)
    chk('al volver a la pestaña se recargan las burbujas',
      /document\.addEventListener\('visibilitychange', \(\) => \{\s*if \(document\.visibilityState === 'visible' && estado\.miEmpleado\) cargarPendientesCaja\(\)/.test(src))
    const init = extraerFn(src, 'init')
    const iEmp = init.indexOf('await cargarEmpresa()'), iPend = init.indexOf('cargarPendientesCaja()')
    chk('init pide las burbujas, DESPUÉS de resolver la Empresa', iEmp !== -1 && iPend !== -1 && iEmp < iPend)
  }
}

esperas.push(casos())
fin()
