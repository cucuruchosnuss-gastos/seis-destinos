// Las cuentas de las tablets de la fábrica (empleados.es_dispositivo) en
// "Usuarios y roles" de modulos/accesos.html.
//
// Siguen en la lista —tienen login y permisos, y un super_admin tiene que
// poder editarlos— pero NO son personas:
//  - van después de todas las personas, bajo "Tablets de la fábrica";
//  - llevan la etiqueta "Tablet" en vez del chip de rol, y en lugar del CUIL
//    dicen qué son y de qué unidad;
//  - no cuentan como usuarios activos;
//  - conservan "Editar" (sus módulos y tareas se editan acá);
//  - los filtros (texto, módulo) las alcanzan igual que a una persona;
//  - una fila con es_dispositivo null sigue siendo una persona;
//  - todo texto de la base va escapado.
//
//   node pruebas/test-accesos-tablets.js

const path = require('path')
const { arnes, marca, chequearMarcas, leer } = require('./circuito-comun')
const { extraerFn } = require('./extraer')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/accesos.html')
const FUENTE = leer(ARCHIVO)
const { chk, fin } = arnes()
function bloque(fn) { try { fn() } catch (e) { chk('bloque sin excepción', false, String(e && e.message || e)) } }

const FNS = ['esc', 'soloDigitos', 'iniciales', 'colorAvatar', 'formatearCuil', 'esDispositivo', 'empleadosConAcceso', 'modulosDeEmpleado', 'renderizarStats', 'renderizarUsuarios', 'htmlTarjetaUsuario']
let codigo = ''
for (const n of FNS) {
  try { codigo += extraerFn(FUENTE, n) + '\n' } catch (e) { chk(`existe la función ${n}`, false, e.message) }
}

function armar(estado) {
  const dom = {}
  const consultados = []
  const el = (id) => (dom[id] ||= { id, innerHTML: '', hidden: true, querySelectorAll: (sel) => { consultados.push(sel); return [] } })
  const document = { getElementById: el }
  const f = new Function('estado', 'document', `
    const PALETA_AVATAR = ['#111']
    const MODULOS_INFO = [{ key: 'produccion', label: 'Producción' }, { key: 'stock', label: 'Stock' }]
    function abrirModalEditar() {}
    function confirmarQuitarMfa() {}
    ${codigo}
    const falta = (n) => () => { throw new Error('no existe ' + n) }
    return {
      esDispositivo: typeof esDispositivo === 'function' ? esDispositivo : falta('esDispositivo'),
      renderizarStats, renderizarUsuarios,
    }
  `)
  return { api: f(estado, document), dom, consultados }
}

const baseEstado = () => ({
  solicitudes: [],
  miEmpleado: { id: 'yo' },
  filtrosUsuarios: { texto: '', rol: '', modulo: '' },
  empleadoModulos: [
    { empleado_id: 't1', modulo: 'produccion' }, { empleado_id: 't1', modulo: 'stock' },
    { empleado_id: 'p1', modulo: 'produccion' },
  ],
  empleados: [
    { id: 't1', nombre: 'Tablet Producción · Mengui', cuil: null, auth_user_id: 'at1', rol_app: 'usuario', es_dispositivo: true, unidades_negocio: { nombre: 'Mengui' } },
    { id: 'p1', nombre: 'Zoe Luna', cuil: '20123456789', auth_user_id: 'a1', rol_app: 'usuario', es_dispositivo: false, unidades_negocio: { nombre: 'Mengui' } },
    { id: 'p2', nombre: 'Ana Sosa', cuil: '27123456789', auth_user_id: 'a2', rol_app: 'super_admin', es_dispositivo: null },
    { id: 'p3', nombre: 'Sin Acceso', cuil: '20999999999', auth_user_id: null, rol_app: 'usuario' },
  ],
})

bloque(() => {
  const e = baseEstado()
  const { api, dom, consultados } = armar(e)
  api.renderizarUsuarios()
  const h = dom['lista-usuarios'].innerHTML
  chk('después de dibujar se enganchan "Editar" y "Quitar verificación"',
    consultados.includes('.btn-editar-usuario') && consultados.includes('.btn-quitar-mfa'), JSON.stringify(consultados))
  const iTit = h.indexOf('Tablets de la fábrica')
  const iTab = h.indexOf('data-id="t1"')
  const iP1 = h.indexOf('data-id="p1"'), iP2 = h.indexOf('data-id="p2"')
  chk('hay un grupo "Tablets de la fábrica"', iTit !== -1)
  chk('la tablet está en la lista', iTab !== -1)
  chk('las dos personas están en la lista', iP1 !== -1 && iP2 !== -1)
  chk('la tablet va DESPUÉS del título del grupo', iTit !== -1 && iTab > iTit)
  chk('las personas van ANTES del grupo de tablets', iP1 !== -1 && iP2 !== -1 && iP1 < iTit && iP2 < iTit)
  chk('una persona con es_dispositivo null no cae en tablets', iP2 !== -1 && iP2 < iTit)
  const tarjTab = h.slice(iTab, h.indexOf('</div>\n          </div>', iTab) + 1 || undefined)
  chk('la tablet lleva la etiqueta "Tablet"', /chip-tablet">Tablet</.test(tarjTab))
  chk('la tablet NO lleva chip de rol', !/chip-rol/.test(tarjTab))
  chk('la tablet dice qué es y su unidad en vez del CUIL', /Cuenta de la tablet de la fábrica · Mengui/.test(tarjTab))
  chk('la tablet conserva "Editar"', /btn-editar-usuario" data-id="t1"/.test(h))
  chk('la tablet muestra sus módulos', /Producción<\/span>/.test(tarjTab) && /Stock<\/span>/.test(tarjTab))
  chk('una persona sigue con su chip de rol y sin chip Tablet',
    /data-id="p1"[\s\S]*?chip-rol--usuario/.test(h) && !/data-id="p1"[\s\S]*?chip-tablet[\s\S]*?Tablets de la fábrica/.test(h))
  chk('quien no tiene acceso no aparece', !h.includes('data-id="p3"'))
})

// Sin tablets no aparece el título.
bloque(() => {
  const e = baseEstado(); e.empleados = e.empleados.filter(x => !x.es_dispositivo)
  const { api, dom } = armar(e)
  api.renderizarUsuarios()
  chk('sin tablets no se dibuja el grupo', !dom['lista-usuarios'].innerHTML.includes('Tablets de la fábrica'))
})

// Los filtros alcanzan a la tablet.
bloque(() => {
  const e = baseEstado(); e.filtrosUsuarios.texto = 'mengui'
  const { api, dom } = armar(e)
  api.renderizarUsuarios()
  const h = dom['lista-usuarios'].innerHTML
  chk('filtrar por texto encuentra la tablet', h.includes('data-id="t1"') && !h.includes('data-id="p1"'))
  const e2 = baseEstado(); e2.filtrosUsuarios.modulo = 'stock'
  const r2 = armar(e2); r2.api.renderizarUsuarios()
  chk('filtrar por módulo deja solo la tablet', r2.dom['lista-usuarios'].innerHTML.includes('data-id="t1"') && !r2.dom['lista-usuarios'].innerHTML.includes('data-id="p1"'))
})

// Cifras.
bloque(() => {
  const { api, dom } = armar(baseEstado())
  api.renderizarStats()
  const h = dom['accesos-stats'].innerHTML
  const activos = (h.match(/Usuarios activos<\/div>\s*<div class="stat-card__valor">(\d+)/) || [])[1]
  chk('"Usuarios activos" no cuenta la tablet (2 personas)', activos === '2', activos)
})

chk('la consulta de empleados trae es_dispositivo', /from\('empleados'\)\.select\('[^']*\bes_dispositivo\b/.test(FUENTE))

// Escapado.
bloque(() => {
  const e = baseEstado()
  e.empleados[0] = { ...e.empleados[0], id: 't' + marca('id'), nombre: 'Tab' + marca('nombre'), unidades_negocio: { nombre: 'U' + marca('unidad') } }
  e.empleados[1] = { ...e.empleados[1], nombre: 'Zoe' + marca('pnombre'), cuil: 'x' + marca('cuil') }
  const { api, dom } = armar(e)
  api.renderizarUsuarios()
  chequearMarcas(chk, 'usuarios', dom['lista-usuarios'].innerHTML, ['id', 'nombre', 'unidad', 'pnombre', 'cuil'])
})
bloque(() => {
  const e = baseEstado()
  e.empleadoModulos.push({ empleado_id: 't1', modulo: 'x' + marca('modulo') })
  e.empleados[0] = { ...e.empleados[0], nombre: '<b' }
  const { api, dom } = armar(e)
  api.renderizarUsuarios()
  const h = dom['lista-usuarios'].innerHTML
  chequearMarcas(chk, 'módulo desconocido de una tablet', h, ['modulo'])
  chk('las iniciales van escapadas', h.includes('&lt;B') && !h.includes('><B<'))
})
// Solo true es tablet: un valor raro no saca a nadie de las personas.
bloque(() => {
  const e = baseEstado()
  e.empleados[1] = { ...e.empleados[1], es_dispositivo: 'true' }
  const { api, dom } = armar(e)
  api.renderizarUsuarios()
  const h = dom['lista-usuarios'].innerHTML
  chk('es_dispositivo "true" (texto) sigue siendo persona', h.indexOf('data-id="p1"') < h.indexOf('Tablets de la fábrica'))
})

fin()
