// Carga las funciones de números de js/utils.js para las suites, y un <input>
// falso que se comporta como el del navegador al tipear, borrar y pegar.
//
// Se EJECUTA el código real de utils.js (sin los `export`), no una copia: si
// alguien cambia leerNumeroAr, cambia lo que prueban todas las suites.

const fs = require('fs')
const path = require('path')

const RUTA_UTILS = process.env.UTILS_TEST || path.join(__dirname, '..', 'js', 'utils.js')

// El fuente de utils.js listo para meter en un preludio de sandbox: sin
// `export` y con un Event mínimo. Define leerNumeroAr, formatearNumeroAr,
// enlazarCampoNumero, ponerNumero y leerCampoNumero en el scope.
function fuenteNumeros() {
  const src = fs.readFileSync(RUTA_UTILS, 'utf8')
  const ini = src.indexOf('// ═══ Números en formato argentino')
  if (ini === -1) throw new Error('utils.js: no está la sección de números')
  const cuerpo = src.slice(ini).replace(/^export /gm, '')
  return `
    var Event = (typeof Event !== 'undefined') ? Event : function Event(tipo, op) { this.type = tipo; this.bubbles = !!(op && op.bubbles) }
    ${cuerpo}
  `
}

function cargarNumeros() {
  return new Function(fuenteNumeros() + '\nreturn { leerNumeroAr, formatearNumeroAr, enlazarCampoNumero, ponerNumero, leerCampoNumero }')()
}

// Un <input> que imita lo que hace el navegador con cada tecla: dispara
// beforeinput (cancelable), si no se canceló aplica el cambio y dispara input.
function inputFalso(valor = '') {
  const oyentes = {}
  const el = {
    type: 'number', inputMode: '', _valor: valor, selectionStart: valor.length, selectionEnd: valor.length,
    // Como el navegador: asignar el valor desde código manda el cursor al final.
    get value() { return this._valor },
    set value(v) { this._valor = String(v); this.selectionStart = this.selectionEnd = this._valor.length },
    atributos: {},
    setAttribute(k, v) { this.atributos[k] = v },
    setSelectionRange(a, b) { this.selectionStart = a; this.selectionEnd = b },
    addEventListener(t, f) { (oyentes[t] = oyentes[t] || []).push(f) },
    dispatchEvent(ev) { for (const f of oyentes[ev.type] || []) f(ev); return true },
    eventosInput: 0,
  }
  el.addEventListener('input', () => { el.eventosInput++ })
  function disparar(tipo, extra) {
    let cancelado = false
    const ev = { type: tipo, preventDefault() { cancelado = true }, ...extra }
    for (const f of oyentes[tipo] || []) f(ev)
    return cancelado
  }
  el.cursor = (p) => { el.selectionStart = el.selectionEnd = p; return el }
  el.teclear = (texto) => {
    for (const ch of texto) {
      if (disparar('beforeinput', { inputType: 'insertText', data: ch })) continue
      const v = el.value, a = el.selectionStart, b = el.selectionEnd
      el.value = v.slice(0, a) + ch + v.slice(b)
      el.selectionStart = el.selectionEnd = a + 1
      disparar('input', {})
    }
    return el
  }
  el.borrar = (veces = 1) => {
    for (let i = 0; i < veces; i++) {
      if (disparar('beforeinput', { inputType: 'deleteContentBackward' })) continue
      const v = el.value, a = el.selectionStart, b = el.selectionEnd
      if (a !== b) { el.value = v.slice(0, a) + v.slice(b); el.selectionStart = el.selectionEnd = a }
      else if (a > 0) { el.value = v.slice(0, a - 1) + v.slice(a); el.selectionStart = el.selectionEnd = a - 1 }
      disparar('input', {})
    }
    return el
  }
  el.suprimir = () => {
    if (disparar('beforeinput', { inputType: 'deleteContentForward' })) return el
    const v = el.value, a = el.selectionStart
    el.value = v.slice(0, a) + v.slice(a + 1)
    el.selectionStart = el.selectionEnd = a
    disparar('input', {})
    return el
  }
  // Lo que hacen algunos teclados (autocompletar, composición): cambian el
  // valor sin un beforeinput de tipo insertText y disparan solo el input.
  el.escribirCrudo = (texto, cursor = texto.length) => {
    el.value = texto
    el.selectionStart = el.selectionEnd = cursor
    disparar('input', {})
    return el
  }
  el.pegar = (texto) => {
    if (disparar('paste', { clipboardData: { getData: () => texto } })) return el
    const v = el.value, a = el.selectionStart, b = el.selectionEnd
    el.value = v.slice(0, a) + texto + v.slice(b)
    disparar('input', {})
    return el
  }
  return el
}

module.exports = { fuenteNumeros, cargarNumeros, inputFalso, RUTA_UTILS }
