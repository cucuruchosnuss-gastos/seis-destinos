// La sección "PIN de producción" de la ficha de modulos/empleados.html.
//
// Se EJECUTAN los renders y el flujo entero con un document falso: una
// assertion sobre el call site no dice nada del callee, y el único test que
// prueba que un helper existe es correr el código.
//
// Lo que blinda, y por qué cada cosa:
//  - QUIÉN VE QUÉ LO DECIDE LA BASE. estado_pin_produccion() devuelve NULL a
//    quien no tiene ni produccion:configurar ni empleados:ver_editar, y ahí la
//    sección ENTERA no se dibuja (ni siquiera el título, que por eso vive
//    adentro del contenedor). Y 'puede_asignar' es produccion:configurar, más
//    restrictivo que ver la sección: con solo ver_editar se ve el estado y NO
//    aparece ningún botón. La pantalla no inventa un gate propio.
//  - SI LA LLAMADA FALLA NO SE INVENTA UN ESTADO. Un "Sin PIN" falso llevaría a
//    asignarle un PIN nuevo a alguien que ya tiene el suyo. Se dice que no se
//    pudo leer, y nunca aparece ninguno de los tres chips.
//  - EL PIN ES UN IDENTIFICADOR, NO UNA CANTIDAD: el campo es type="text" +
//    inputmode, nunca type="number" (que se come la coma) y nunca pasa por
//    enlazarCampoNumero (que le metería separador de miles). Lo que viaja a la
//    RPC es el TEXTO tipeado, no un Number.
//  - EL ERROR VA PEGADO AL BOTÓN que lo provoca, nunca en un banner arriba, y
//    el botón se traba SOLO mientras se manda, nunca por lo que falta.
//  - El mensaje de la base se muestra TAL CUAL (incluido el del PIN demasiado
//    obvio, que el cliente NO replica: una segunda copia de esa lista
//    rechazaría lo que la base acepta, y al revés).
//  - Una respuesta que llega tarde no pisa la ficha que está abierta ahora.
//
//   node pruebas/test-empleados-pin.js
//   ARCHIVO_TEST=otra-copia.html node pruebas/test-empleados-pin.js

const path = require('path')
const { construirCon, scriptModulo } = require('./sandbox')
const { arnes, marca, chequearMarcas, leer } = require('./circuito-comun')
const { extraerFn } = require('./extraer')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/empleados.html')
const FUENTE = leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

const STUBS = new Set(['verificarSesion', 'mostrarBannerVersion', 'mostrarError', 'mostrarExito', 'formatearFecha'])

// El punto de entrada: abrirFicha() arranca la carga del PIN, y renderizarFicha
// dibuja la sección. La clausura arrastra todo lo demás desde ahí, así que si
// mañana una de las funciones del PIN deja de estar colgada de la ficha, el
// sandbox se arma sin ella y las pruebas que la usan se ponen en rojo.
const RENDERS = ['abrirFicha', 'cerrarFicha', 'renderizarFicha', 'renderizarPin', 'htmlSeccionPin', 'esc']

function clausura(src) {
  const nombresFn = new Set([...src.matchAll(/(?:^|\n)\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g)].map(m => m[1]))
  const posConst = new Map([...src.matchAll(/\n {4}const ([A-Za-z_$][\w$]*)\s*=/g)].map(m => [m[1], m.index + 1]))
  const fns = new Set(), consts = []
  const cola = [...RENDERS]
  const mirar = (texto) => {
    for (const m of texto.matchAll(/[A-Za-z_$][\w$]*/g)) {
      const id = m[0]
      if (nombresFn.has(id) && !fns.has(id) && !STUBS.has(id)) cola.push(id)
      if (posConst.has(id) && !consts.includes(id)) {
        consts.push(id)
        const resto = src.slice(posConst.get(id))
        const corte = resto.slice(1).search(/\n {4}(?:const|let|function|async function|\/\/)/)
        mirar(resto.slice(0, corte === -1 ? 400 : corte + 1))
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

// El document falso guarda los handlers, así se puede TOCAR el botón en vez de
// llamar a la función por su nombre: lo que se prueba es el camino real.
const PRELUDIO = `
  var console = { log(){}, warn(){}, error(){} }
  var __focos = []
  var __els = new Map()
  // Los ids que solo EXISTEN cuando el HTML de la sección los dibuja. Si
  // getElementById devolviera siempre un elemento, un listener colgado de un
  // botón inexistente pasaría por bueno y "el panel está cerrado" no se podría
  // distinguir de "el panel está abierto".
  var __dibujados = ['btn-pin-asignar', 'btn-pin-cancelar', 'btn-pin-guardar', 'pin-valor']
  function nuevoEl(id) {
    const el = {
      id, textContent: '', value: '', className: '', hidden: false, disabled: false,
      title: '', type: '', dataset: {}, style: {}, __handlers: {}, __html: '',
      querySelector: () => null, querySelectorAll: () => [],
      addEventListener(ev, f) { (el.__handlers[ev] = el.__handlers[ev] || []).push(f) },
      removeEventListener(){}, focus(){ __focos.push(id) }, click(){}, removeAttribute(){}, setAttribute(){},
      closest: () => null, remove(){}, appendChild(){}, append(){},
      classList: { add(){}, remove(){}, toggle(){}, contains: () => false },
    }
    Object.defineProperty(el, 'innerHTML', {
      get() { return el.__html },
      set(v) {
        el.__html = v
        // El navegador REEMPLAZA los nodos, y los listeners de los viejos se
        // van con ellos. Sin esto cada render dejaría un handler más colgado
        // del mismo botón, y tocarlo una vez lo dispararía N.
        if (id === 'ficha-pin') for (const k of __dibujados) __els.delete(k)
      },
    })
    return el
  }
  var document = {
    body: nuevoEl('body'),
    getElementById(id) { if (!__existe(id)) return null; if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) },
    querySelectorAll: () => [], querySelector: () => null, addEventListener(){},
    createElement: (t) => nuevoEl('creado-' + t),
  }
  function __existe(id) {
    if (!__dibujados.includes(id)) return true
    return (__els.has('ficha-pin') ? __els.get('ficha-pin').innerHTML : '').includes('id="' + id + '"')
  }
  function __tocar(id) {
    const el = document.getElementById(id)
    if (!el) return false
    for (const f of (el.__handlers.click || []).slice()) f()
    return true
  }
  var lucide = { createIcons(){} }
  function setTimeout(f) { f() }
  var __rpcs = []
  var __responder = async () => ({ data: null, error: null })
  var supabase = {
    from: () => { const q = {}; for (const k of ['select','eq','order','maybeSingle']) q[k] = () => q; q.then = (r) => Promise.resolve({ data: [], error: null }).then(r); return q },
    rpc: (n, a) => { __rpcs.push([n, a]); return __responder(n, a) },
  }
  var __llamadas = { errores: [], exitos: [] }
  function mostrarError(m) { __llamadas.errores.push(m) }
  function mostrarExito(m) { __llamadas.exitos.push(m) }
  function formatearFecha(v) { return String(v ?? '') }
  function mostrarBannerVersion() {}
  async function verificarSesion() { return { user: { id: 'uid-yo' } } }
  var debounceBusquedaEmpleados
`

const RETORNO = 'estado, __els, __rpcs, __llamadas, __focos, __tocar, ' +
  '__el(id){ if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) }, ' +
  '__responderCon(f){ __responder = f }'

const PERSONA = { id: 'emp-1', nombre: marca('nombre'), rol_app: 'usuario', auth_user_id: null, unidad_negocio_id: null }
const OTRA = { id: 'emp-2', nombre: 'Otra persona', rol_app: 'usuario', auth_user_id: null, unidad_negocio_id: null }

let S
try {
  const { funciones, constantes } = clausura(scriptModulo(ARCHIVO))
  S = construirCon(ARCHIVO, { preludio: PRELUDIO, funciones, constantes, retorno: RETORNO })
} catch (e) {
  chk('el sandbox se arma con las funciones reales del archivo', false, String(e && e.stack || e))
}
if (S) esperas.push(correr(S))

// Deja la ficha de PERSONA abierta con lo que conteste estado_pin_produccion.
async function abrir(S, respuesta) {
  S.__responderCon(async (n) => (n === 'estado_pin_produccion' ? respuesta : { data: null, error: null }))
  S.abrirFicha(PERSONA.id)
  await new Promise(r => setImmediate(r))
  return S.__el('ficha-pin').innerHTML
}

async function correr(S) {
  const E = S.estado
  E.empleados = [PERSONA, OTRA]
  E.maestros.unidadesNegocio = []
  E.miEmpleado = { id: 'yo', rol_app: 'usuario' }

  // ── La RPC decide si la sección existe ───────────────────────────────────
  let html = await abrir(S, { data: null, error: null })
  chk('null: la sección ENTERA no se dibuja (tampoco el título)', html === '', html.slice(0, 120))
  const llamada = S.__rpcs.find(r => r[0] === 'estado_pin_produccion')
  chk('se consulta estado_pin_produccion con el id de la persona de la ficha',
    llamada && llamada[1].p_empleado_id === PERSONA.id, JSON.stringify(llamada))

  // ── Los tres estados ─────────────────────────────────────────────────────
  const casos = [
    [{ tiene_pin: false, debe_cambiar: false, puede_asignar: true }, 'Sin PIN', 'chip-pin--gris', 'Asignar PIN'],
    [{ tiene_pin: true, debe_cambiar: true, puede_asignar: true }, 'PIN pendiente de cambiar', 'chip-pin--alerta', 'Resetear PIN'],
    [{ tiene_pin: true, debe_cambiar: false, puede_asignar: true }, 'PIN propio', 'chip-pin--ok', 'Resetear PIN'],
  ]
  for (const [datos, texto, clase, rotulo] of casos) {
    html = await abrir(S, { data: datos, error: null })
    chk(`estado «${texto}»: se dibuja la sección con su título`, /PIN de producción/.test(html))
    chk(`estado «${texto}»: el chip dice el estado`, html.includes(`>${texto}</span>`), html.slice(0, 200))
    chk(`estado «${texto}»: el chip lleva su clase`, html.includes(`chip-pin ${clase}`))
    chk(`estado «${texto}»: el botón dice «${rotulo}»`, html.includes(`id="btn-pin-asignar">${rotulo}</button>`), html.slice(0, 400))
    // Los otros dos textos no pueden aparecer a la vez: si aparecieran, el
    // chequeo de arriba pasaría igual y no diría nada.
    for (const [, otro] of casos) if (otro !== texto) chk(`estado «${texto}»: no dice también «${otro}»`, !html.includes(`>${otro}</span>`))
  }

  // ── puede_asignar: false — se ve el estado, NO el botón ──────────────────
  html = await abrir(S, { data: { tiene_pin: true, debe_cambiar: false, puede_asignar: false }, error: null })
  chk('sin puede_asignar: el estado se ve igual', html.includes('>PIN propio</span>'))
  chk('sin puede_asignar: NO hay botón de asignar ni de resetear',
    !/btn-pin-asignar/.test(html) && !/Resetear PIN|Asignar PIN/.test(html), html.slice(0, 400))
  // Y aunque alguien fuerce el panel abierto con un PIN válido, la pantalla no
  // llama a la RPC: el permiso lo dice la base, y la barrera dura está del lado
  // del servidor (asignar_pin_produccion exige produccion:configurar).
  E.pin.panel = true
  S.renderizarPin()
  S.__el('pin-valor').value = '0417'
  {
    const antes = S.__rpcs.length
    await S.guardarPin()
    chk('sin puede_asignar: guardarPin() no llama a la RPC ni con el panel forzado y un PIN válido', S.__rpcs.length === antes)
  }
  E.pin.panel = false

  // ── Si la llamada falla NO se inventa un estado ──────────────────────────
  html = await abrir(S, { data: null, error: { message: 'se cayó la red' } })
  chk('error: se dice que no se pudo leer', /No se pudo leer el estado del PIN/.test(html), html.slice(0, 200))
  chk('error: NO aparece ninguno de los tres chips (un "Sin PIN" falso sería lo peor)',
    !/chip-pin/.test(html) && !/Sin PIN/.test(html), html.slice(0, 200))
  chk('error: tampoco aparece el botón', !/btn-pin-asignar/.test(html))

  // ── Mientras se espera la respuesta no se dibuja nada ────────────────────
  let soltar
  S.__responderCon((n) => (n === 'estado_pin_produccion' ? new Promise(r => { soltar = r }) : Promise.resolve({ data: null, error: null })))
  S.abrirFicha(PERSONA.id)
  chk('cargando: no se dibuja NADA (ni un título que después desaparezca)', S.__el('ficha-pin').innerHTML === '')
  soltar({ data: { tiene_pin: true, debe_cambiar: false, puede_asignar: true }, error: null })
  await new Promise(r => setImmediate(r))
  chk('cargando: cuando contesta, la sección aparece', /PIN propio/.test(S.__el('ficha-pin').innerHTML))

  // ── Una respuesta que llega tarde no pisa la ficha abierta AHORA ─────────
  S.__responderCon((n) => (n === 'estado_pin_produccion' ? new Promise(r => { soltar = r }) : Promise.resolve({ data: null, error: null })))
  S.abrirFicha(PERSONA.id)
  const lenta = soltar
  S.abrirFicha(OTRA.id)
  const rapida = soltar
  rapida({ data: { tiene_pin: false, debe_cambiar: false, puede_asignar: true }, error: null })
  await new Promise(r => setImmediate(r))
  lenta({ data: { tiene_pin: true, debe_cambiar: true, puede_asignar: true }, error: null })
  await new Promise(r => setImmediate(r))
  chk('una respuesta vieja no pisa la ficha que está abierta ahora',
    /Sin PIN/.test(S.__el('ficha-pin').innerHTML) && !/pendiente de cambiar/.test(S.__el('ficha-pin').innerHTML),
    S.__el('ficha-pin').innerHTML.slice(0, 200))

  // ── El panel: se abre desde el botón ─────────────────────────────────────
  html = await abrir(S, { data: { tiene_pin: false, debe_cambiar: false, puede_asignar: true }, error: null })
  chk('el panel no está abierto de entrada', !/id="pin-valor"/.test(html))
  chk('se toca "Asignar PIN"', S.__tocar('btn-pin-asignar'))
  html = S.__el('ficha-pin').innerHTML
  chk('el panel se abre con el campo del PIN', /id="pin-valor"/.test(html))
  chk('el campo es type="text" + inputmode, nunca type="number"',
    /<input type="text" id="pin-valor" inputmode="numeric"/.test(html) && !/type="number"/.test(html))
  chk('el campo lleva maxlength 4 y no arrastra un valor', /maxlength="4"/.test(html) && !/id="pin-valor"[^>]*value=/.test(html))
  chk('el foco va al campo', S.__focos.includes('pin-valor'))
  chequearMarcas(chk, 'el panel nombra a la persona', html, ['nombre'])

  // ── Validación: el error va PEGADO al botón y el botón NO se apaga ───────
  S.__el('pin-valor').value = '123'
  let antes = S.__rpcs.length
  await S.guardarPin()
  html = S.__el('ficha-pin').innerHTML
  chk('un PIN corto no se manda a la base', S.__rpcs.length === antes)
  chk('el error del PIN corto se dice, con el largo', /El PIN tiene que ser de 4 números\./.test(html), html.slice(0, 600))
  chk('el error va PEGADO al botón, dentro del panel, no en un banner ni en un toast',
    html.indexOf('ficha-pin__error') > html.indexOf('ficha-pin__panel') &&
    html.indexOf('ficha-pin__error') < html.indexOf('btn-pin-guardar') && S.__llamadas.errores.length === 0)
  chk('el botón NO queda deshabilitado por lo que falta', !/id="btn-pin-guardar" disabled/.test(html))

  // ── El PIN viaja como TEXTO, y el botón se traba solo mientras manda ─────
  S.__el('pin-valor').value = '0417'
  let soltarGuardado
  S.__responderCon((n) => (n === 'asignar_pin_produccion'
    ? new Promise(r => { soltarGuardado = r })
    : Promise.resolve({ data: { tiene_pin: true, debe_cambiar: true, puede_asignar: true }, error: null })))
  antes = S.__rpcs.length
  const enVuelo = S.guardarPin()
  html = S.__el('ficha-pin').innerHTML
  chk('mientras manda, el botón SÍ queda deshabilitado', /id="btn-pin-guardar" disabled/.test(html), html.slice(0, 600))
  const guardado = S.__rpcs[antes]
  chk('llama a asignar_pin_produccion con el id de la persona',
    guardado && guardado[0] === 'asignar_pin_produccion' && guardado[1].p_empleado_id === PERSONA.id, JSON.stringify(guardado))
  chk('el PIN viaja como TEXTO, con sus ceros a la izquierda (es un identificador)',
    guardado && guardado[1].p_pin === '0417' && typeof guardado[1].p_pin === 'string', JSON.stringify(guardado && guardado[1]))
  soltarGuardado({ data: null, error: null })
  await enVuelo
  html = S.__el('ficha-pin').innerHTML
  chk('al guardar bien, el panel se cierra', !/id="pin-valor"/.test(html))
  chk('al guardar bien, se avisa con un toast', S.__llamadas.exitos.includes('PIN asignado.'))
  chk('al guardar bien, el estado se vuelve a leer de la base y ahora dice que hay PIN',
    /PIN pendiente de cambiar/.test(html) && /Resetear PIN/.test(html), html.slice(0, 400))
  // El PIN tipeado no sobrevive: el campo redibujado no arrastra ningún valor.
  chk('el campo del PIN nunca se redibuja con un valor adentro', !/id="pin-valor"[^>]*value=/.test(html))

  // ── El error de la base se muestra TAL CUAL, pegado al botón ─────────────
  chk('se reabre el panel', S.__tocar('btn-pin-asignar'))
  S.__el('pin-valor').value = '1234'
  const DE_LA_BASE = 'El PIN tiene que ser de 4 números y no tan obvio (nada de 1234 ni cuatro iguales).'
  S.__responderCon(async (n) => (n === 'asignar_pin_produccion' ? { data: null, error: { message: DE_LA_BASE } } : { data: null, error: null }))
  await S.guardarPin()
  html = S.__el('ficha-pin').innerHTML
  chk('el cliente NO replica la lista de PINes obvios: 1234 llega a la base', S.__rpcs.some(r => r[0] === 'asignar_pin_produccion' && r[1].p_pin === '1234'))
  chk('el mensaje de la base se muestra TAL CUAL', html.includes(S.esc(DE_LA_BASE)), html.slice(0, 700))
  chk('el error de la base va pegado al botón, no a un toast', /ficha-pin__error/.test(html) && S.__llamadas.errores.length === 0)
  chk('con el error, el panel sigue abierto para corregir', /id="pin-valor"/.test(html))
  chk('con el error, el botón vuelve a estar habilitado', !/id="btn-pin-guardar" disabled/.test(html))
  chk('cuando la base rechaza, el campo redibujado tampoco arrastra el PIN', !/id="pin-valor"[^>]*value=/.test(html))
  // Y el borrado a mano, que es lo que cubre el instante ANTES del redibujo.
  S.__el('pin-valor').value = '0417'
  S.olvidarCampoPin()
  chk('olvidarCampoPin() vacía el campo', S.__el('pin-valor').value === '')

  // Un error sin mensaje no deja al panel mudo.
  S.__el('pin-valor').value = '0417'
  S.__responderCon(async (n) => (n === 'asignar_pin_produccion' ? { data: null, error: {} } : { data: null, error: null }))
  await S.guardarPin()
  chk('un error sin mensaje cae a un texto propio', /No se pudo guardar el PIN\./.test(S.__el('ficha-pin').innerHTML))

  // ── Cancelar y cerrar la ficha ───────────────────────────────────────────
  S.__el('pin-valor').value = '9999'
  chk('se toca Cancelar', S.__tocar('btn-pin-cancelar'))
  chk('Cancelar cierra el panel', !/id="pin-valor"/.test(S.__el('ficha-pin').innerHTML))
  chk('Cancelar no deja el error de antes colgado', !/ficha-pin__error/.test(S.__el('ficha-pin').innerHTML))

  S.cerrarFicha()
  chk('cerrar la ficha suelta el PIN', E.pin.empleadoId === null && E.pin.datos === null && E.pin.panel === false)

  chk('ningún camino del PIN usó un toast de error (el error vive pegado al botón)', S.__llamadas.errores.length === 0, S.__llamadas.errores.join(' | '))
}

// ── Chequeo estático: lo que no se puede ver ejecutando ────────────────────
//
// Una assertion contra el fuente matchea también los COMENTARIOS, y los dos
// primeros chequeos hablan justamente de cosas que el código EXPLICA por
// escrito ("nunca type=number", "nunca enlazarCampoNumero"): sin sacar los
// comentarios darían rojo por la frase que dice que no hay que hacerlo. Se
// filtran las líneas que SON un comentario; las menciones del archivo son
// todas de renglón completo.
const CODIGO = scriptModulo(ARCHIVO).split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n')
chk('estático: el PIN NUNCA pasa por enlazarCampoNumero ni por leerCampoNumero (es un identificador, no una cantidad)',
  !/enlazarCampoNumero|leerCampoNumero|ponerNumero/.test(CODIGO))
chk('control: el filtro de comentarios no se comió el código', CODIGO.length > scriptModulo(ARCHIVO).length * 0.5)

// Mirando cada etiqueta <input> y no el archivo entero: así ningún comentario
// que NOMBRE type="number" puede hacer fallar —ni tapar— este chequeo.
const INPUTS = [...FUENTE.matchAll(/<input [^>]*>/g)].map(m => m[0])
chk('estático: ningún <input> del archivo es type="number"',
  INPUTS.length >= 5 && INPUTS.every(t => !/type="number"/.test(t)), INPUTS.length + ' inputs')

chk('estático: el título de la sección se dibuja ADENTRO del contenedor (si no, quedaría un título solo cuando no hay nada que mostrar)',
  /<div id="ficha-pin"><\/div>/.test(FUENTE) &&
  /const TITULO_PIN = '<div class="modal-ficha__seccion-titulo">PIN de producción<\/div>'/.test(FUENTE))

// La pantalla no inventa un gate propio: el permiso lo dice la RPC.
chk('estático: ninguna función del PIN chequea tareas por su cuenta',
  ['htmlSeccionPin', 'renderizarPin', 'guardarPin', 'cargarEstadoPin', 'htmlPanelPin']
    .every(n => !/tieneTarea\(/.test(extraerFn(CODIGO, n))))

// El campo se vacía a mano en los tres caminos que sueltan el panel. El
// re-render lo reemplaza igual, pero el PIN no tiene que sobrevivir ni un
// instante de más — y eso, después del redibujo, ya no se puede observar.
chk('estático: el PIN tipeado se olvida a mano al guardar, al cancelar y al cambiar de ficha',
  ['guardarPin', 'cerrarPanelPin', 'reiniciarPin'].every(n => /olvidarCampoPin()/.test(extraerFn(CODIGO, n))))

chk('estático: el PIN no se guarda en ningún almacenamiento del navegador',
  !/localStorage|sessionStorage|indexedDB/.test(CODIGO))

fin()
