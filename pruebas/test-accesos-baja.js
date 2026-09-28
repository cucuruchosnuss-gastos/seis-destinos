// Accesos y las personas DADAS DE BAJA (28/09/2026).
//
// Quien está dado de baja (empleados.activo = false, desde Empleados con
// dar_de_baja_empleado) conserva su cuenta de Auth pero no puede entrar a la
// app, así que en "Usuarios y roles":
//  - no aparece en la lista ni cuenta como "Activo";
//  - una fila sin la columna `activo` no se saca (la red de siempre);
//  - estado.empleados queda COMPLETO: el match de una solicitud nueva contra
//    un dado de baja sigue diciendo "inactivo" (calcularEstadoMatch).
//
// Se EJECUTAN renderizarStats, renderizarUsuarios y calcularEstadoMatch con un
// document falso; el nombre del dado de baja trae HTML malicioso.
//
//   node pruebas/test-accesos-baja.js

const path = require('path')
const { arnes, leer } = require('./circuito-comun')
const { extraerFn } = require('./extraer')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/accesos.html')
const FUENTE = leer(ARCHIVO)
const { chk, fin } = arnes()
function bloque(fn) { try { fn() } catch (e) { chk('bloque sin excepción', false, String(e && e.message || e)) } }

const MALO = '"><img src=x onerror=alert(1)>'
const FNS = ['esc', 'soloDigitos', 'iniciales', 'colorAvatar', 'formatearCuil', 'esDispositivo', 'empleadosConAcceso', 'modulosDeEmpleado', 'renderizarStats', 'renderizarUsuarios', 'htmlTarjetaUsuario', 'calcularEstadoMatch']
let codigo = ''
for (const n of FNS) {
  try { codigo += extraerFn(FUENTE, n) + '\n' } catch (e) { chk(`existe la función ${n}`, false, e.message) }
}

function armar(estado) {
  const dom = {}
  const el = (id) => (dom[id] ||= { id, innerHTML: '', hidden: true, querySelectorAll: () => [] })
  const document = { getElementById: el }
  const f = new Function('estado', 'document', `
    const PALETA_AVATAR = ['#111']
    const MODULOS_INFO = [{ key: 'gastos', label: 'Gastos' }]
    function abrirModalEditar() {}
    function confirmarQuitarMfa() {}
    function abrirSesiones() {}
    const sinPersonasDePrueba = (filas) => filas
    ${codigo}
    return { renderizarStats, renderizarUsuarios, calcularEstadoMatch }
  `)
  return { api: f(estado, document), dom }
}

const baseEstado = () => ({
  solicitudes: [],
  miEmpleado: { id: 'yo' },
  filtrosUsuarios: { texto: '', rol: '', modulo: '' },
  empleadoModulos: [{ empleado_id: 'baja', modulo: 'gastos' }],
  empleados: [
    { id: 'p1', nombre: 'Zoe Luna', cuil: '20123456789', auth_user_id: 'a1', rol_app: 'usuario', activo: true },
    { id: 'p2', nombre: 'Sin Columna', cuil: '20111111112', auth_user_id: 'a2', rol_app: 'usuario' },
    { id: 'baja', nombre: 'Dado De Baja ' + MALO, cuil: '20333333334', auth_user_id: 'a3', rol_app: 'usuario', activo: false },
    { id: 'bajasin', nombre: 'Baja Sin Cuenta', cuil: '20444444445', auth_user_id: null, rol_app: 'usuario', activo: false },
  ],
})

bloque(() => {
  const { api, dom } = armar(baseEstado())
  api.renderizarUsuarios()
  const h = dom['lista-usuarios'].innerHTML
  chk('el dado de baja no está en "Usuarios y roles"', !h.includes('data-id="baja"'), h.slice(0, 300))
  chk('su nombre no llegó al HTML (ni crudo ni escapado)', !h.includes('Dado De Baja'), h.slice(0, 300))
  chk('el activo sí está', h.includes('data-id="p1"'))
  chk('una fila sin la columna activo sigue', h.includes('data-id="p2"'))
})

bloque(() => {
  const { api, dom } = armar(baseEstado())
  api.renderizarStats()
  const h = dom['accesos-stats'].innerHTML
  const m = h.match(/Activos<\/div>\s*<div class="stat-card__submetric-valor">(\d+)</)
  chk('"Activos" no cuenta al dado de baja', m && m[1] === '2', m && m[1])
})

bloque(() => {
  // Filtrar por módulo no lo trae de vuelta.
  const e = baseEstado()
  e.filtrosUsuarios.modulo = 'gastos'
  const { api, dom } = armar(e)
  api.renderizarUsuarios()
  chk('filtrando por un módulo suyo, tampoco aparece', !dom['lista-usuarios'].innerHTML.includes('data-id="baja"'))
})

bloque(() => {
  // El match de una solicitud contra alguien dado de baja SIN cuenta sigue
  // diciendo "inactivo": estado.empleados queda completo.
  const e = baseEstado()
  const { api } = armar(e)
  chk('la lista maestra conserva al dado de baja', e.empleados.some(x => x.id === 'baja'))
  chk('una solicitud con el CUIL de un dado de baja sin cuenta da "inactivo"',
    api.calcularEstadoMatch({ cuil: '20-44444444-5' }).tipo === 'inactivo')
})

chk('la consulta de empleados trae activo', /from\('empleados'\)\.select\('[^']*\bactivo\b/.test(FUENTE))
chk('la consulta de empleados no filtra activo', !/from\('empleados'\)\.select\('[^']*'\)\.eq\('activo'/.test(FUENTE))

fin()
