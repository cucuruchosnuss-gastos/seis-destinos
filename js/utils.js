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

  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('toast--visible'))
  })

  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.classList.remove('toast--visible')
  }, 3500)
}

export function mostrarError(mensaje) {
  _renderizarToast(mensaje, 'error')
}

export function mostrarExito(mensaje) {
  _renderizarToast(mensaje, 'exito')
}
