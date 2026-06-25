const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

export function formatearFecha(fecha) {
  const d = new Date(fecha)
  const dia = String(d.getDate()).padStart(2, '0')
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const anio = d.getFullYear()
  return `${dia}/${mes}/${anio}`
}

export function calcularPeriodo(fecha) {
  const d = new Date(fecha)
  return `${MESES[d.getMonth()]} ${d.getFullYear()}`
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
