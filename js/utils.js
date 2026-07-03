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
