// Diálogos propios que reemplazan a window.prompt / window.confirm en
// modulos/cobranzas.html (21/09/2026).
//
// Se EJECUTAN las funciones reales —abrirDialogo, cerrarDialogo,
// teclaEnDialogo, confirmarConDialogo, elegirFotoConDialogo,
// agregarChequeAMano y descartarBorradorLocal— con un document falso que
// sigue el foco, despacha teclas y hace clic en los botones que el render
// dibujó. Lo que se afirma:
//  - agregar un cheque a mano con UNA foto no abre ningún diálogo;
//  - con tres fotos, elegir la 2 deja el cheque con esa foto_id;
//  - Cancelar y Escape hacen lo mismo que el prompt en null: no se agrega y se
//    avisa con el mismo mensaje de antes;
//  - descartar un borrador: "Descartar" borra (dbBorrar con el store y el id),
//    "Cancelar" y Escape no;
//  - el foco va al diálogo al abrir, vuelve al botón que lo abrió al cerrar, y
//    Tab / Shift+Tab ciclan adentro;
//  - estático: cero window.prompt / window.confirm / prompt( / confirm( /
//    alert( en el <script>, salvo en comentarios.
//
// Archivo bajo prueba: ARCHIVO_TEST, o modulos/cobranzas.html.

const fs = require('fs')
const path = require('path')
const { construirCon } = require('./sandbox')
const { bloquesScript, analizar } = require('./escaner-interpolaciones')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/cobranzas.html')

// El sub-proceso VERIFICA que leyó el archivo que el runner le pasó.
const FUENTE = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${FUENTE.length} bytes)`)

let ok = 0
const fallas = []
function chk(nombre, condicion, detalle) {
  if (condicion) ok++
  else fallas.push(nombre + (detalle !== undefined ? ` — ${String(detalle).slice(0, 300)}` : ''))
}

const PRELUDIO = `
  var console = { error(){}, log(){}, warn(){} }
  var crypto = { randomUUID: (() => { let n = 0; return () => 'uuid-' + (++n) })() }

  // --- DOM falso que sigue el foco -------------------------------------------
  var __listenersDoc = new Map()
  function nuevoEl(id, extra) {
    const el = {
      id, innerHTML: '', textContent: '', value: '', hidden: false, disabled: false,
      dataset: {}, src: '', __listeners: new Map(),
      addEventListener(t, f) { if (!el.__listeners.has(t)) el.__listeners.set(t, []); el.__listeners.get(t).push(f) },
      click() { for (const f of el.__listeners.get('click') ?? []) f({ stopPropagation(){} }) },
      focus() { document.activeElement = el },
      querySelectorAll: () => [],
      querySelector: () => null,
      classList: { add(){}, remove(){}, toggle(){} },
      ...extra,
    }
    return el
  }
  var __els = new Map()
  var document = {
    activeElement: null,
    getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) },
    querySelectorAll: () => [],
    addEventListener(t, f) { if (!__listenersDoc.has(t)) __listenersDoc.set(t, new Set()); __listenersDoc.get(t).add(f) },
    removeEventListener(t, f) { __listenersDoc.get(t)?.delete(f) },
  }
  function __tecla(key, shiftKey = false) {
    const ev = { key, shiftKey, prevenido: false, preventDefault() { ev.prevenido = true } }
    for (const f of [...(__listenersDoc.get('keydown') ?? [])]) f(ev)
    return ev
  }

  // Los botones de las fotos salen del innerHTML que dibujó el render: se
  // crean UNA vez por dibujo, así el listener que se registra es el del botón
  // que después se toca.
  var __botonesFoto = []
  var __htmlFotos = null
  function __botonesDeFotos() {
    const cont = document.getElementById('cob-dlg-fotos-opciones')
    if (cont.innerHTML !== __htmlFotos) {
      __htmlFotos = cont.innerHTML
      __botonesFoto = [...cont.innerHTML.matchAll(/data-elegir-foto="([^"]*)"/g)]
        .map(m => nuevoEl('foto-' + m[1], { dataset: { elegirFoto: m[1] } }))
    }
    return __botonesFoto
  }
  // Los enfocables de cada diálogo, en el orden del HTML.
  function __prepararDom() {
    const opciones = document.getElementById('cob-dlg-fotos-opciones')
    opciones.querySelectorAll = (sel) => sel === '[data-elegir-foto]' ? __botonesDeFotos() : []
    opciones.querySelector = () => null
    document.getElementById('cob-dialogo-foto').querySelectorAll = () =>
      [...__botonesDeFotos(), document.getElementById('cob-dlg-foto-cancelar')]
    document.getElementById('cob-dialogo-confirmar').querySelectorAll = () =>
      [document.getElementById('cob-dlg-confirmar-no'), document.getElementById('cob-dlg-confirmar-si')]
    // Los dos diálogos arrancan ocultos, como en el HTML.
    document.getElementById('cob-dialogo-foto').hidden = true
    document.getElementById('cob-dialogo-confirmar').hidden = true
    // El cableado de los botones fijos: la función REAL del módulo.
    conectarDialogos()
  }

  // --- estado y dependencias stubeadas ---------------------------------------
  var dialogoAbierto = null
  var __llamadas = { errores: [], dbBorrar: [], refrescarLocales: 0, guardarBorrador: 0, urlDeFoto: 0 }
  function mostrarError(m) { __llamadas.errores.push(m) }
  function guardarBorrador() { __llamadas.guardarBorrador++ }
  function pintarCheques() {} function pintarTotalYGuardado() {}
  async function urlDeFoto() { __llamadas.urlDeFoto++; return null }
  async function dbBorrar(store, id) { __llamadas.dbBorrar.push([store, id]) }
  async function refrescarLocales() { __llamadas.refrescarLocales++ }
  var estado = { form: null }
`

const FUNCIONES = [
  'enfocablesDe', 'teclaEnDialogo', 'abrirDialogo', 'cerrarDialogo',
  'confirmarConDialogo', 'elegirFotoConDialogo', 'agregarChequeAMano',
  'descartarBorradorLocal', 'chequeVacio', 'conectarDialogos',
]

function nuevo() {
  const S = construirCon(ARCHIVO, {
    preludio: PRELUDIO, funciones: FUNCIONES, constantes: ['STORE_BORRADORES'],
    retorno: `estado, __els, __doc: document, __llamadas, __tecla, __prepararDom, __botonesDeFotos,
      __abierto(){ return dialogoAbierto }, __escuchasTeclado(){ return __listenersDoc.get('keydown')?.size ?? 0 }, __store(){ return STORE_BORRADORES }`,
  })
  S.__prepararDom()
  return S
}

const tick = () => new Promise(r => setImmediate(r))
const formCon = (n) => ({ id: 'form-1', fotos: Array.from({ length: n }, (_, i) => ({ id: 'foto-id-' + (i + 1) })), cheques: [] })
const MSG_SIN_FOTO = 'No se agregó el cheque: hay que decir a qué foto corresponde.'

async function main() {
  // ── Elegir foto: UNA foto, sin diálogo ──────────────────────────────────
  {
    const S = nuevo()
    S.estado.form = formCon(1)
    const p = S.agregarChequeAMano()
    await tick(); await tick()
    // Si se abriera un diálogo, la promesa no resolvería nunca: se cierra con
    // Escape para que la suite no se cuelgue, y el chk de abajo ya lo marcó.
    const seAbrio = S.__abierto() !== null
    if (seAbrio) S.__tecla('Escape')
    await p
    chk('1 foto: no se abre ningún diálogo (ni por un rato)', !seAbrio)
    chk('1 foto: se agrega un cheque', S.estado.form.cheques.length === 1)
    chk('1 foto: el cheque queda con la única foto', S.estado.form.cheques[0]?.foto_id === 'foto-id-1')
    chk('1 foto: no se abre ningún diálogo', S.__abierto() === null && S.__els.get('cob-dialogo-foto').hidden === true)
    chk('1 foto: no se dibujan opciones', !S.__els.get('cob-dlg-fotos-opciones')?.innerHTML)
    chk('1 foto: se guarda el borrador', S.__llamadas.guardarBorrador === 1)
  }

  // ── Elegir foto: tres fotos, elegir la 2 ────────────────────────────────
  {
    const S = nuevo()
    S.estado.form = formCon(3)
    const opener = S.__doc.getElementById('cob-btn-cheque-mano')
    opener.focus()
    const p = S.agregarChequeAMano()
    await tick()
    const dlg = S.__els.get('cob-dialogo-foto')
    const botones = S.__botonesDeFotos()
    chk('3 fotos: se abre el diálogo', dlg.hidden === false && S.__abierto() !== null)
    chk('3 fotos: tres opciones', botones.length === 3, botones.length)
    const html = S.__els.get('cob-dlg-fotos-opciones').innerHTML
    chk('3 fotos: los botones dicen "Foto 1", "Foto 2", "Foto 3"', /Foto 1\b/.test(html) && /Foto 2\b/.test(html) && /Foto 3\b/.test(html))
    chk('3 fotos: se piden las miniaturas', S.__llamadas.urlDeFoto === 3)
    chk('3 fotos: al abrir el foco va al diálogo (primera opción)', S.__doc.activeElement === botones[0])
    chk('3 fotos: todavía no se agregó nada', S.estado.form.cheques.length === 0)
    botones[1].click()
    await p
    chk('3 fotos, elige la 2: se agrega un cheque', S.estado.form.cheques.length === 1)
    chk('3 fotos, elige la 2: el cheque queda con la foto 2', S.estado.form.cheques[0]?.foto_id === 'foto-id-2', S.estado.form.cheques[0]?.foto_id)
    chk('3 fotos, elige la 2: el diálogo se cierra', dlg.hidden === true && S.__abierto() === null)
    chk('3 fotos, elige la 2: el foco vuelve al botón que lo abrió', S.__doc.activeElement === opener)
    chk('3 fotos, elige la 2: sin mensaje de error', S.__llamadas.errores.length === 0)
    chk('3 fotos, elige la 2: se guarda el borrador', S.__llamadas.guardarBorrador === 1)
    chk('3 fotos: al cerrar se deja de escuchar el teclado', !S.__tecla('Escape').prevenido)
    chk('3 fotos: al cerrar se saca el listener de teclado del document', S.__escuchasTeclado() === 0, S.__escuchasTeclado())
  }

  // ── Elegir foto: Cancelar = prompt en null ──────────────────────────────
  {
    const S = nuevo()
    S.estado.form = formCon(3)
    const opener = S.__doc.getElementById('cob-btn-cheque-mano')
    opener.focus()
    const p = S.agregarChequeAMano()
    await tick()
    S.__els.get('cob-dlg-foto-cancelar').click()
    await p
    chk('cancelar: no se agrega ningún cheque', S.estado.form.cheques.length === 0)
    chk('cancelar: el mismo aviso que con el prompt en null', S.__llamadas.errores.length === 1 && S.__llamadas.errores[0] === MSG_SIN_FOTO, S.__llamadas.errores)
    chk('cancelar: no se guarda el borrador', S.__llamadas.guardarBorrador === 0)
    chk('cancelar: el diálogo se cierra', S.__els.get('cob-dialogo-foto').hidden === true)
    chk('cancelar: el foco vuelve al botón que lo abrió', S.__doc.activeElement === opener)
  }

  // ── Elegir foto: Escape = cancelar ──────────────────────────────────────
  {
    const S = nuevo()
    S.estado.form = formCon(3)
    const opener = S.__doc.getElementById('cob-btn-cheque-mano')
    opener.focus()
    const p = S.agregarChequeAMano()
    await tick()
    const ev = S.__tecla('Escape')
    await p
    chk('escape (foto): se consume la tecla', ev.prevenido)
    chk('escape (foto): no se agrega ningún cheque', S.estado.form.cheques.length === 0)
    chk('escape (foto): el mismo aviso que con el prompt en null', S.__llamadas.errores[0] === MSG_SIN_FOTO, S.__llamadas.errores)
    chk('escape (foto): el diálogo se cierra', S.__els.get('cob-dialogo-foto').hidden === true)
    chk('escape (foto): el foco vuelve al botón que lo abrió', S.__doc.activeElement === opener)
  }

  // ── Se cambió de formulario con el diálogo abierto ──────────────────────
  {
    const S = nuevo()
    const viejo = formCon(3)
    S.estado.form = viejo
    const p = S.agregarChequeAMano()
    await tick()
    S.estado.form = formCon(2)
    S.__botonesDeFotos()[1].click()
    await p
    chk('otro formulario: el cheque no se agrega al que ya no está en pantalla', viejo.cheques.length === 0 && S.estado.form.cheques.length === 0)
    chk('otro formulario: no se guarda ningún borrador', S.__llamadas.guardarBorrador === 0)
  }

  // ── Foco atrapado: Tab y Shift+Tab ciclan ───────────────────────────────
  {
    const S = nuevo()
    S.estado.form = formCon(3)
    const p = S.agregarChequeAMano()
    await tick()
    const botones = S.__botonesDeFotos()
    const cancelar = S.__els.get('cob-dlg-foto-cancelar')
    cancelar.focus()
    const e1 = S.__tecla('Tab')
    chk('tab desde el último vuelve al primero', e1.prevenido && S.__doc.activeElement === botones[0])
    const e2 = S.__tecla('Tab', true)
    chk('shift+tab desde el primero va al último', e2.prevenido && S.__doc.activeElement === cancelar)
    botones[1].focus()
    const e3 = S.__tecla('Tab')
    chk('tab en el medio lo maneja el navegador (no se intercepta)', !e3.prevenido && S.__doc.activeElement === botones[1])
    S.__doc.activeElement = S.__doc.getElementById('algo-de-afuera')
    const e4 = S.__tecla('Tab')
    chk('tab con el foco afuera lo trae al primero', e4.prevenido && S.__doc.activeElement === botones[0])
    const e5 = S.__tecla('a')
    chk('otra tecla no se intercepta', !e5.prevenido)
    S.__tecla('Escape'); await p
  }

  // ── Descartar borrador: sí / no / Escape ────────────────────────────────
  for (const caso of ['si', 'no', 'escape']) {
    const S = nuevo()
    const opener = S.__doc.getElementById('boton-descartar')
    opener.focus()
    const p = S.descartarBorradorLocal('borrador-7')
    await tick()
    const dlg = S.__els.get('cob-dialogo-confirmar')
    chk(`descartar (${caso}): se abre el diálogo`, dlg.hidden === false)
    chk(`descartar (${caso}): el foco va al diálogo (Cancelar, el primero)`, S.__doc.activeElement === S.__els.get('cob-dlg-confirmar-no'))
    chk(`descartar (${caso}): el botón de sí dice "Descartar"`, S.__els.get('cob-dlg-confirmar-si').textContent === 'Descartar')
    chk(`descartar (${caso}): el texto avisa que no se puede recuperar`, /No se puede recuperar/.test(S.__els.get('cob-dlg-confirmar-texto').textContent))
    chk(`descartar (${caso}): nada se borra antes de responder`, S.__llamadas.dbBorrar.length === 0)
    if (caso === 'si') S.__els.get('cob-dlg-confirmar-si').click()
    else if (caso === 'no') S.__els.get('cob-dlg-confirmar-no').click()
    else chk('descartar (escape): se consume la tecla', S.__tecla('Escape').prevenido)
    await p
    if (caso === 'si') {
      chk('descartar (si): se borra con el store y el id', S.__llamadas.dbBorrar.length === 1 &&
        S.__llamadas.dbBorrar[0][0] === S.__store() && S.__llamadas.dbBorrar[0][1] === 'borrador-7', JSON.stringify(S.__llamadas.dbBorrar))
      chk('descartar (si): se refrescan los locales', S.__llamadas.refrescarLocales === 1)
    } else {
      chk(`descartar (${caso}): NO se borra`, S.__llamadas.dbBorrar.length === 0)
      chk(`descartar (${caso}): no se refresca`, S.__llamadas.refrescarLocales === 0)
    }
    chk(`descartar (${caso}): el diálogo se cierra`, dlg.hidden === true && S.__abierto() === null)
    chk(`descartar (${caso}): el foco vuelve al botón que lo abrió`, S.__doc.activeElement === opener)
  }

  // ── Tab en el diálogo de confirmar ──────────────────────────────────────
  {
    const S = nuevo()
    const p = S.descartarBorradorLocal('x')
    await tick()
    S.__els.get('cob-dlg-confirmar-si').focus()
    chk('confirmar: tab desde el último vuelve al primero',
      S.__tecla('Tab').prevenido && S.__doc.activeElement === S.__els.get('cob-dlg-confirmar-no'))
    chk('confirmar: shift+tab desde el primero va al último',
      S.__tecla('Tab', true).prevenido && S.__doc.activeElement === S.__els.get('cob-dlg-confirmar-si'))
    S.__tecla('Escape'); await p
  }

  // ── Estático: ni prompt, ni confirm, ni alert en el <script> ────────────
  {
    const re = /\b(?:window\s*\.\s*)?(prompt|confirm|alert)\s*\(/g
    const encontrados = []
    for (const b of bloquesScript(FUENTE)) {
      const { rangos } = analizar(b.codigo, b.ini, FUENTE)
      const comentarios = rangos.filter(([a, z]) => b.codigo.startsWith('//', a) || b.codigo.startsWith('/*', a))
      const enComentario = (off) => comentarios.some(([a, z]) => off >= a && off < z)
      let m
      while ((m = re.exec(b.codigo)) !== null) {
        // Un identificador que TERMINA en prompt/confirm (p. ej. confirmarSalida)
        // no matchea por el \\b; uno que es propiedad de otro objeto sí se mira.
        const antes = b.codigo.slice(Math.max(0, m.index - 1), m.index)
        if (antes === '.' && !m[0].startsWith('window')) continue
        if (enComentario(m.index)) continue
        encontrados.push(m[0] + ' en «' + b.codigo.slice(m.index - 30, m.index + 40).replace(/\s+/g, ' ') + '»')
      }
    }
    chk('estático: cero prompt / confirm / alert en el <script> (salvo comentarios)', encontrados.length === 0, encontrados.join(' | '))
  }

  if (fallas.length) for (const f of fallas) console.log('  ✗ ' + f)
  const total = ok + fallas.length
  console.log(`${ok}/${total} ${fallas.length ? 'ROJO' : 'verde'}`)
  terminado = true
  process.exit(fallas.length ? 1 : 0)
}

// Si una promesa de un diálogo no resolviera nunca, Node termina sin llegar
// al final de main() y saldría con 0: eso tiene que ser ROJO, no verde.
let terminado = false
process.on('exit', (codigo) => {
  if (!terminado && codigo === 0) { console.log('SIN TERMINAR: una promesa quedó colgada'); console.log('0/1 ROJO'); process.exitCode = 1 }
})
main().then(() => { terminado = true }).catch(e => { console.log('EXCEPCIÓN:', e && e.stack || e); console.log('0/1 ROJO'); process.exit(1) })
