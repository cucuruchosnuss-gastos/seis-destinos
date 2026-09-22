const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

export function formatearFecha(fecha) {
  const [anio, mes, dia] = fecha.split('-')
  return `${dia}/${mes}/${anio}`
}

export function calcularPeriodo(fecha) {
  const [anio, mes] = fecha.split('-')
  return `${MESES[Number(mes) - 1]} ${anio}`
}

// ── Contraseñas ───────────────────────────────────────────────────────────────
// Vive acá y no duplicado en cada pantalla porque son CUATRO los lugares donde
// se elige una contraseña nueva (el modal del dashboard, los dos formularios de
// registro y la pantalla de restablecer). Con una copia por archivo, subir el
// mínimo otra vez obligaría a acordarse de los cuatro.
//
// El servidor exige hoy 10 caracteres y NADA más (no está configurado
// "required characters" en el panel). O sea que esta validación es más estricta
// que la de Supabase, que es el lado seguro para equivocarse: nadie va a pasar
// estos requisitos y aun así comerse un rechazo en inglés.
export const LARGO_MINIMO_CONTRASENA = 10

export function validarContrasena(texto) {
  const valor = texto ?? ''

  // Se usan clases Unicode y no rangos ASCII: con /[A-Z]/ una contraseña que
  // arranca con "Ángel" no contaría la mayúscula. Y "símbolo" se define como
  // "ni letra ni número", que es complementario exacto de las otras dos — así
  // ningún carácter queda sin clasificar ni cuenta dos veces.
  const requisitos = {
    largo:     valor.length >= LARGO_MINIMO_CONTRASENA,
    mayuscula: /\p{Lu}/u.test(valor),
    minuscula: /\p{Ll}/u.test(valor),
    numero:    /\p{N}/u.test(valor),
    simbolo:   /[^\p{L}\p{N}]/u.test(valor),
  }

  return { ...requisitos, todoOk: Object.values(requisitos).every(Boolean) }
}

const ETIQUETAS_REQUISITOS = [
  ['largo',     `Al menos ${LARGO_MINIMO_CONTRASENA} caracteres`],
  ['mayuscula', 'Una mayúscula'],
  ['minuscula', 'Una minúscula'],
  ['numero',    'Un número'],
  ['simbolo',   'Un símbolo'],
]

export function renderizarRequisitos(contenedor, resultado) {
  if (!contenedor) return
  contenedor.classList.add('requisitos-contrasena')
  contenedor.replaceChildren(
    ...ETIQUETAS_REQUISITOS.map(([clave, etiqueta]) => _filaRequisito(!!resultado?.[clave], etiqueta))
  )
}

export function renderizarCoincidencia(contenedor, coinciden) {
  if (!contenedor) return
  contenedor.classList.add('requisitos-contrasena')
  contenedor.replaceChildren(_filaRequisito(!!coinciden, 'Las contraseñas coinciden'))
}

function _filaRequisito(cumplido, etiqueta) {
  const fila = document.createElement('div')
  fila.className = cumplido ? 'requisito requisito--ok' : 'requisito'

  // El ✓ / ○ va como TEXTO, no como pseudo-elemento de CSS ni como un simple
  // cambio de color: así lo lee un lector de pantalla y no hace falta poder
  // distinguir el verde del gris para saber qué falta.
  const simbolo = document.createElement('span')
  simbolo.className = 'requisito__simbolo'
  simbolo.textContent = cumplido ? '✓' : '○'
  fila.appendChild(simbolo)

  const texto = document.createElement('span')
  texto.textContent = etiqueta
  fila.appendChild(texto)

  return fila
}

let toastTimer = null

function _renderizarToast(mensaje, tipo) {
  let toast = document.getElementById('toast-global')
  if (!toast) {
    toast = document.createElement('div')
    toast.id = 'toast-global'
    document.body.appendChild(toast)
  }

  toast.textContent = mensaje
  toast.className = `toast toast--${tipo}`
  // Un lector de pantalla anuncia el error apenas aparece; el éxito, sin
  // interrumpir.
  toast.setAttribute('role', tipo === 'error' ? 'alert' : 'status')

  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('toast--visible'))
  })

  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.classList.remove('toast--visible')
  }, duracionToast(mensaje))
}

// Cuánto tiempo queda a la vista un cartel. Los errores de la base vienen
// ENTEROS (a propósito: dicen qué cheque no pudo salir y por qué) y en 3,5
// segundos no se alcanzaban a leer. Mínimo 3,5 s, unos 60 ms por carácter, y
// como mucho 12 s.
export function duracionToast(mensaje) {
  const largo = String(mensaje ?? '').length
  return Math.min(12000, Math.max(3500, largo * 60))
}

export function mostrarError(mensaje) {
  _renderizarToast(mensaje, 'error')
}

export function mostrarExito(mensaje) {
  _renderizarToast(mensaje, 'exito')
}

// ═══ Números en formato argentino ═══════════════════════════════════════════
//
// La regla del proyecto: punto de miles, coma decimal. "387.300,50" son
// trescientos ochenta y siete mil trescientos pesos con cincuenta.
//
// POR QUÉ ES COMPARTIDO (excepción consciente a "cada módulo duplica sus
// helpers"): si un módulo leyera "387.300" como 387,3, un cheque de 387 mil se
// guardaría como 387 pesos SIN NINGÚN ERROR. Una sola lectura para todos es lo
// que impide que dos módulos entiendan distinto el mismo texto.
//
// Tres clases de número, y solo dos pasan por acá:
//  - IMPORTE (plata): decimales: 2.
//  - CANTIDAD (kilos, bultos, unidades): los decimales que el campo admita.
//  - IDENTIFICADOR (cheque, cuenta, CUIT, lote, número de comprobante...): NO
//    se tocan. Se comparan dígito por dígito contra un papel, y un punto de
//    miles en el medio los vuelve irreconocibles.
//
// ponerNumero() es la ÚNICA forma de escribir un número en un campo desde
// código (prellenado del OCR, abrir para editar, restaurar un borrador).

const _configCampoNumero = new WeakMap()

// Texto → número, o null si no se puede leer sin adivinar. Nunca inventa.
//  - "2.000.000" → 2000000 · "387.300,50" → 387300.5 · "1,5" → 1.5
//  - Excepción por lo pegado: SIN coma y con UN solo punto seguido de 1 o 2
//    dígitos al final, ese punto es decimal ("387300.50" → 387300.5). Con 3
//    dígitos es de miles ("1.500" → 1500).
//  - Más decimales que los permitidos, grupos de miles mal armados, dos comas,
//    espacios internos, letras: null.
//  - Un NÚMERO se devuelve tal cual (si es finito): viene de la base o del OCR.
export function leerNumeroAr(texto, { decimales = 2, negativos = false } = {}) {
  if (typeof texto === 'number') {
    if (!Number.isFinite(texto)) return null
    if (texto < 0 && !negativos) return null
    return texto
  }
  if (texto === null || texto === undefined) return null
  let s = String(texto).trim()
  if (s.startsWith('$')) s = s.slice(1).trim()
  if (s === '') return null
  let signo = 1
  if (s.startsWith('-')) {
    if (!negativos) return null
    signo = -1
    s = s.slice(1)
  }
  if (!/^[0-9.,]+$/.test(s)) return null
  const comas = s.split(',').length - 1
  if (comas > 1) return null
  // Un grupo de miles no empieza con 0: "0.300", "00.300" y "012.345" no son
  // miles. Con "0" como parte entera, el punto es decimal (ver abajo).
  const GRUPOS = /^[1-9]\d{0,2}(\.\d{3})+$/
  let entero
  let decimal = ''
  if (comas === 1) {
    [entero, decimal] = s.split(',')
    if (!/^\d*$/.test(decimal)) return null
    if (entero === '' && decimal === '') return null
    if (entero === '') entero = '0'
    if (entero.includes('.')) {
      if (!GRUPOS.test(entero)) return null
      entero = entero.replace(/\./g, '')
    } else if (!/^\d+$/.test(entero)) return null
  } else {
    const puntos = s.split('.').length - 1
    if (puntos === 0) entero = s
    // "0.300" y "0.5": parte entera 0, así que el punto es decimal. Si sobran
    // decimales para el campo, el chequeo de abajo da null.
    else if (puntos === 1 && /^0\.\d+$/.test(s)) [entero, decimal] = s.split('.')
    else if (puntos === 1 && /^\d+\.\d{1,2}$/.test(s)) [entero, decimal] = s.split('.')
    else if (GRUPOS.test(s)) entero = s.replace(/\./g, '')
    else return null
  }
  if (decimal.length > decimales) return null
  const n = Number(entero + (decimal ? '.' + decimal : ''))
  if (!Number.isFinite(n)) return null
  return signo * n + 0
}

// Número → "2.000.000,50". Con null, undefined, '' o NaN: "—". Nunca
// "$ NaN" ni "$ 0,00" por un dato que no está.
//  - decimales: los que se muestran como máximo (se redondea a esos).
//  - minimos: los que se muestran siempre (default: todos). Con minimos: 0,
//    "1.500" y "1,5" en vez de "1.500,00" y "1,50".
export function formatearNumeroAr(n, { decimales = 2, minimos = decimales } = {}) {
  if (n === null || n === undefined || n === '') return '—'
  const v = typeof n === 'number' ? n : Number(String(n).trim())
  if (!Number.isFinite(v)) return '—'
  const negativo = v < 0
  let [entero, dec = ''] = Math.abs(v).toFixed(decimales).split('.')
  while (dec.length > minimos && dec.endsWith('0')) dec = dec.slice(0, -1)
  entero = entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const texto = entero + (dec ? ',' + dec : '')
  return (negativo && /[1-9]/.test(texto) ? '-' : '') + texto
}

// Lo que se escribe en un campo: sin decimales si es entero, y si no, al menos
// dos (o todos los permitidos, si son menos): 387300.5 → "387.300,50".
function _textoParaCampo(n, decimales) {
  const entero = Number.isInteger(n)
  return formatearNumeroAr(n, { decimales, minimos: entero ? 0 : Math.min(2, decimales) })
}

// Formatea el texto crudo de un campo mientras se escribe: dígitos agrupados de
// a tres con punto, y una sola coma si hay decimales (los decimales de más se
// descartan). Todo lo que no sea dígito, la coma o el signo se ignora.
function _formatearMientrasSeEscribe(crudo, decimales, negativos) {
  let signo = ''
  let entero = ''
  let decimal = ''
  let vioComa = false
  for (let i = 0; i < crudo.length; i++) {
    const c = crudo[i]
    if (c === '-' && negativos && !signo && entero === '' && !vioComa) signo = '-'
    else if (c >= '0' && c <= '9') {
      if (vioComa) { if (decimal.length < decimales) decimal += c } else entero += c
    } else if (c === ',' && decimales > 0 && !vioComa) vioComa = true
  }
  entero = entero.replace(/^0+(?=\d)/, '')
  if (vioComa && entero === '') entero = '0'
  const agrupado = entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return signo + agrupado + (vioComa ? ',' + decimal : '')
}

// El cursor se ubica por "caracteres con sentido" (dígitos, coma, signo): los
// puntos de miles aparecen y desaparecen, así que contarlos lo correría.
function _significativosAntes(texto, pos) {
  let k = 0
  for (let i = 0; i < pos && i < texto.length; i++) if (/[0-9,-]/.test(texto[i])) k++
  return k
}

function _posicionTrasSignificativos(texto, k) {
  if (k <= 0) return 0
  let vistos = 0
  for (let i = 0; i < texto.length; i++) {
    if (/[0-9,-]/.test(texto[i])) { vistos++; if (vistos === k) return i + 1 }
  }
  return texto.length
}

function _reformatearCampo(input, cursorCrudo) {
  const cfg = _configCampoNumero.get(input)
  const crudo = input.value
  const pos = cursorCrudo ?? input.selectionStart ?? crudo.length
  const k = _significativosAntes(crudo, pos)
  const nuevo = _formatearMientrasSeEscribe(crudo, cfg.decimales, cfg.negativos)
  if (cfg.max != null) {
    const v = leerNumeroAr(nuevo, cfg)
    if (v !== null && v > cfg.max) {
      // Pasarse del máximo no escribe nada: vuelve a lo que había.
      input.value = cfg.ultimo
      try { input.setSelectionRange(cfg.ultimoCursor, cfg.ultimoCursor) } catch {}
      return
    }
  }
  input.value = nuevo
  // Los ceros a la izquierda que el formato saca ("007" → "7") estaban antes
  // del cursor: se descuentan del conteo para que el cursor no se corra.
  const digitosCrudo = crudo.replace(/[^0-9,]/g, '')
  const ceros = (digitosCrudo.match(/^0+(?=\d)/) || [''])[0].length
  const cerosAntes = Math.min(ceros, _significativosAntes(crudo.replace(/-/g, ' '), pos))
  // Y el "0" que el formato agrega delante de una coma tipeada primero (",5"
  // → "0,5") queda antes del cursor: se suma.
  const ceroAgregado = /^-?0,/.test(nuevo) && !/^-?0/.test(digitosCrudo) ? 1 : 0
  const p = _posicionTrasSignificativos(nuevo, Math.max(0, k - cerosAntes + ceroAgregado))
  try { input.setSelectionRange(p, p) } catch {}
  cfg.ultimo = nuevo
  cfg.ultimoCursor = p
}

// Convierte un <input> en un campo de número argentino: type="text" con el
// teclado numérico del celular, los puntos de miles puestos mientras se
// escribe, el cursor en su lugar al escribir y al borrar en el medio, y pegar
// "387.300,50" o "387300.50" funcionando. La coma se deja escribir solo si hay
// decimales; el punto tipeado se toma como coma decimal (el teclado del celular
// ofrece uno u otro según el aparato, y los puntos de miles los pone el campo).
export function enlazarCampoNumero(input, { decimales = 2, max = null, negativos = false } = {}) {
  if (!input || _configCampoNumero.has(input)) return input
  input.type = 'text'
  input.inputMode = decimales > 0 ? 'decimal' : 'numeric'
  if (input.setAttribute) {
    input.setAttribute('inputmode', decimales > 0 ? 'decimal' : 'numeric')
    input.setAttribute('autocomplete', 'off')
  }
  const cfg = { decimales, max, negativos, ultimo: '', ultimoCursor: 0 }
  _configCampoNumero.set(input, cfg)

  input.addEventListener('beforeinput', (e) => {
    const v = input.value
    const ini = input.selectionStart ?? v.length
    const fin = input.selectionEnd ?? ini
    if (e.inputType === 'insertText' && (e.data === '.' || e.data === ',')) {
      e.preventDefault()
      if (decimales === 0 || v.slice(0, ini).includes(',') || v.slice(fin).includes(',')) return
      input.value = v.slice(0, ini) + ',' + v.slice(fin)
      _reformatearCampo(input, ini + 1)
      input.dispatchEvent(_eventoFormateado())
      return
    }
    // Borrar un punto de miles no borraría nada (el formato lo vuelve a
    // poner): se borra el dígito de al lado, que es lo que la persona quiso.
    if (ini === fin && e.inputType === 'deleteContentBackward' && ini > 0 && v[ini - 1] === '.') {
      e.preventDefault()
      if (ini < 2) return
      input.value = v.slice(0, ini - 2) + v.slice(ini)
      _reformatearCampo(input, ini - 2)
      input.dispatchEvent(_eventoFormateado())
      return
    }
    if (ini === fin && e.inputType === 'deleteContentForward' && v[ini] === '.') {
      e.preventDefault()
      input.value = v.slice(0, ini) + v.slice(ini + 2)
      _reformatearCampo(input, ini)
      input.dispatchEvent(_eventoFormateado())
    }
  })

  input.addEventListener('paste', (e) => {
    const texto = (e.clipboardData && e.clipboardData.getData) ? e.clipboardData.getData('text') : ''
    e.preventDefault()
    const n = leerNumeroAr(texto, cfg)
    // Lo que no se puede leer sin adivinar no se pega: el campo queda como estaba.
    if (n === null) return
    if (max != null && n > max) return
    ponerNumero(input, n)
    input.dispatchEvent(_eventoFormateado())
  })

  input.addEventListener('input', (e) => {
    // Los eventos que dispara este mismo código ya vienen formateados: solo
    // avisan a los listeners del módulo que el valor cambió.
    if (e && e.__formateado) return
    _reformatearCampo(input)
  })

  if (input.value) {
    const n = leerNumeroAr(input.value, cfg)
    input.value = n === null ? '' : _textoParaCampo(n, decimales)
  }
  cfg.ultimo = input.value
  return input
}

function _eventoFormateado() {
  const ev = new Event('input', { bubbles: true })
  ev.__formateado = true
  return ev
}

// La ÚNICA forma de escribir un número en un campo desde código. Recibe un
// NÚMERO (el OCR y la base devuelven números: se ponen con esto, nunca como
// texto). Un string se lee con leerNumeroAr; null o ilegible deja el campo
// vacío. No dispara eventos: el que llama sabe qué recalcular.
export function ponerNumero(input, n) {
  if (!input) return
  const cfg = _configCampoNumero.get(input) || { decimales: 2, negativos: false }
  const v = typeof n === 'number' ? (Number.isFinite(n) ? n : null) : leerNumeroAr(n, cfg)
  input.value = v === null ? '' : _textoParaCampo(v, cfg.decimales)
  if (_configCampoNumero.has(input)) {
    cfg.ultimo = input.value
    cfg.ultimoCursor = input.value.length
  }
}

// Lee un campo con la configuración con la que se enlazó (sus decimales y si
// admite negativos). En un campo no enlazado, 2 decimales y sin negativos.
export function leerCampoNumero(input, opciones) {
  if (!input) return null
  const cfg = opciones || _configCampoNumero.get(input) || { decimales: 2, negativos: false }
  return leerNumeroAr(input.value, cfg)
}
