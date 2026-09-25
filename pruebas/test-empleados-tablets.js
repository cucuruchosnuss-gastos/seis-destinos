// Las cuentas de las tablets de la fábrica (empleados.es_dispositivo) en
// modulos/empleados.html: NO son personas.
//
// Se EJECUTAN las funciones reales del archivo (agrupar, la fila, las cifras
// y la sección del PIN) con datos de prueba:
//  - van en un grupo aparte, "Tablets de la fábrica", siempre al final, y
//    nunca en el grupo de su unidad;
//  - llevan la etiqueta "Tablet" y no el chip de rol;
//  - no cuentan en las cifras de personas;
//  - su ficha no pide el estado del PIN ni dibuja la sección (un PIN es de
//    una persona que usa la tablet, no de la tablet);
//  - una fila sin es_dispositivo (null / ausente) sigue siendo una persona;
//  - el nombre de la tablet y el de su unidad van escapados.
//
//   node pruebas/test-empleados-tablets.js

const path = require('path')
const { arnes, marca, chequearMarcas, leer } = require('./circuito-comun')
const { extraerFn } = require('./extraer')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/empleados.html')
const FUENTE = leer(ARCHIVO)
const { chk, fin } = arnes()
// Un bloque que tira (una función que no existe, un undefined) es una FALLA,
// no un corte de la suite: así la mutación se lee como rojo por una razón.
function bloque(fn) { try { fn() } catch (e) { chk('bloque sin excepción', false, String(e && e.message || e)) } }

const FNS = ['esc', 'iniciales', 'colorAvatar', 'formatearCuil', 'esDispositivo', 'ordenarGrupo', 'agruparEmpleados', 'renderizarFilaEmpleado', 'renderizarStats', 'htmlSeccionPin', 'abrirFicha']
let codigo = ''
for (const n of FNS) {
  try { codigo += extraerFn(FUENTE, n) + '\n' } catch (e) { chk(`existe la función ${n}`, false, e.message) }
}

function armar(estado) {
  const dom = {}
  const el = (id) => (dom[id] ||= { id, innerHTML: '', textContent: '', hidden: true, style: {} })
  const llamadas = { pin: [], ficha: 0 }
  const document = { getElementById: el }
  const f = new Function('estado', 'document', 'llamadas', `
    const TITULO_PIN = '<h3>PIN de producción</h3>'
    const PALETA_AVATAR = ['#111']
    function estadoDelPin(p) { return { texto: p.tiene_pin ? 'PIN propio' : 'Sin PIN', clase: 'x' } }
    function htmlPanelPin() { return '' }
    function reiniciarPin(id) { estado.pin = { empleadoId: id, cargando: true, datos: null, error: false } }
    function renderizarFicha() { llamadas.ficha++ }
    function cargarEstadoPin(id) { llamadas.pin.push(id) }
    ${codigo}
    const faltante = (n) => () => { throw new Error('no existe ' + n) }
    return {
      esDispositivo: typeof esDispositivo === 'function' ? esDispositivo : faltante('esDispositivo'),
      agruparEmpleados, renderizarFilaEmpleado, renderizarStats, htmlSeccionPin, abrirFicha,
    }
  `)
  return { api: f(estado, document, llamadas), dom, llamadas }
}

const U1 = 'u-cn', U2 = 'u-dp'
const baseEstado = () => ({
  maestros: { unidadesNegocio: [{ id: U1, nombre: 'Cucuruchos Nuss' }, { id: U2, nombre: 'Dolce Pasta' }] },
  empleados: [
    { id: 'p1', nombre: 'Ana Pérez', unidad_negocio_id: U1, auth_user_id: 'a1', rol_app: 'usuario', rol: 'Operaria', es_dispositivo: false },
    { id: 'p2', nombre: 'Beto Díaz', unidad_negocio_id: U2, auth_user_id: null, rol_app: 'usuario', rol: 'Masero' },
    { id: 'p3', nombre: 'Caro Ruiz', unidad_negocio_id: U1, auth_user_id: 'a3', rol_app: 'usuario', rol: 'Admin', es_dispositivo: null },
    { id: 't1', nombre: 'Tablet Producción · Cucuruchos Nuss', unidad_negocio_id: U1, auth_user_id: 'at1', rol_app: 'usuario', rol: null, tipo: 'sistema', es_dispositivo: true },
    { id: 't2', nombre: 'Tablet Producción · Dolce Pasta', unidad_negocio_id: U2, auth_user_id: 'at2', rol_app: 'usuario', rol: null, tipo: 'sistema', es_dispositivo: true },
  ],
  pin: {},
})

// ── Agrupar ─────────────────────────────────────────────────────────────
bloque(() => {
  const { api } = armar(baseEstado())
  const grupos = api.agruparEmpleados()
  const ultimo = grupos[grupos.length - 1]
  chk('hay un grupo "Tablets de la fábrica"', grupos.some(g => g.nombre === 'Tablets de la fábrica'))
  chk('el grupo de tablets va AL FINAL', ultimo?.nombre === 'Tablets de la fábrica', ultimo?.nombre)
  chk('el grupo de tablets tiene las dos tablets', ultimo?.lista.map(e => e.id).sort().join() === 't1,t2')
  const cn = grupos.find(g => g.nombre === 'Cucuruchos Nuss')
  chk('la tablet NO va en el grupo de su unidad', cn && !cn.lista.some(e => e.id === 't1'))
  chk('una persona con es_dispositivo null sigue en su unidad', cn && cn.lista.some(e => e.id === 'p3'))
  chk('una persona sin es_dispositivo sigue en su unidad', grupos.find(g => g.nombre === 'Dolce Pasta')?.lista.some(e => e.id === 'p2'))
  chk('esDispositivo es estricto (solo true)', api.esDispositivo({ es_dispositivo: 'true' }) === false && api.esDispositivo({ es_dispositivo: true }) === true && api.esDispositivo(null) === false)
})
// Sin tablets no aparece el grupo.
bloque(() => {
  const e = baseEstado(); e.empleados = e.empleados.filter(x => !x.es_dispositivo)
  const { api } = armar(e)
  chk('sin tablets no se dibuja el grupo', !api.agruparEmpleados().some(g => g.nombre === 'Tablets de la fábrica'))
})

// ── La fila ─────────────────────────────────────────────────────────────
bloque(() => {
  const { api } = armar(baseEstado())
  const htmlT = api.renderizarFilaEmpleado(baseEstado().empleados[3])
  chk('la fila de la tablet lleva la etiqueta "Tablet"', />Tablet</.test(htmlT))
  chk('la fila de la tablet NO lleva chip de rol', !/chip-rol/.test(htmlT))
  chk('la fila de la tablet dice qué es y su unidad', /Cuenta de la tablet de la fábrica · Cucuruchos Nuss/.test(htmlT))
  chk('la fila de la tablet conserva data-id para abrir la ficha', /data-id="t1"/.test(htmlT))
  const htmlP = api.renderizarFilaEmpleado(baseEstado().empleados[0])
  chk('la fila de una persona NO dice Tablet', !/chip-tablet/.test(htmlP) && /chip-rol/.test(htmlP))
})

// ── Las cifras ──────────────────────────────────────────────────────────
bloque(() => {
  const { api, dom } = armar(baseEstado())
  api.renderizarStats()
  const h = dom['empleados-stats'].innerHTML
  const total = (h.match(/Total empleados<\/div>\s*<div class="stat-card__valor">(\d+)/) || [])[1]
  const acceso = (h.match(/Con acceso a la app<\/div>\s*<div class="stat-card__valor">(\d+)/) || [])[1]
  chk('el total de empleados no cuenta las tablets (3 personas)', total === '3', total)
  chk('"Con acceso" no cuenta las tablets (2)', acceso === '2', acceso)
})

// ── La ficha y el PIN ───────────────────────────────────────────────────
bloque(() => {
  const e = baseEstado()
  const { api, llamadas } = armar(e)
  api.abrirFicha('t1')
  chk('abrir la ficha de una tablet NO pide el estado del PIN', llamadas.pin.length === 0, JSON.stringify(llamadas.pin))
  chk('la ficha de la tablet se abre igual', llamadas.ficha === 1)
  e.pin = { empleadoId: 't1', cargando: false, error: false, datos: { tiene_pin: true, puede_asignar: true } }
  chk('la sección del PIN no se dibuja para una tablet, aunque la base conteste', api.htmlSeccionPin() === '')
  api.abrirFicha('p1')
  chk('abrir la ficha de una persona SÍ pide el estado del PIN', llamadas.pin.includes('p1'))
  e.pin = { empleadoId: 'p1', cargando: false, error: false, datos: { tiene_pin: true, puede_asignar: true } }
  chk('la sección del PIN se dibuja para una persona', /PIN de producción/.test(api.htmlSeccionPin()))
})

// ── La consulta trae la columna ─────────────────────────────────────────
// El doble de arriba no mira el .select(): sin la columna en la consulta,
// es_dispositivo llegaría undefined y toda tablet sería una persona.
chk('la consulta de empleados trae es_dispositivo', /from\('empleados'\)\s*\n?\s*\.select\('[^']*\bes_dispositivo\b[^']*'\)/.test(FUENTE))

// ── Escapado ────────────────────────────────────────────────────────────
bloque(() => {
  const e = baseEstado()
  e.maestros.unidadesNegocio[0].nombre = 'CN' + marca('unidad')
  const t = { ...e.empleados[3], id: 't' + marca('id'), nombre: 'Tab' + marca('nombre') }
  const { api } = armar(e)
  chequearMarcas(chk, 'fila de tablet', api.renderizarFilaEmpleado(t), ['id', 'nombre', 'unidad'])
  // La fila de una persona, en el mismo render: separar las tablets no puede
  // haber dejado sin escapar la rama de siempre.
  const p = { ...e.empleados[0], id: 'p' + marca('pid'), nombre: 'Ana' + marca('pnombre'), rol: 'Op' + marca('prol'), rol_app: 'usuario' + marca('prolapp') }
  chequearMarcas(chk, 'fila de persona', api.renderizarFilaEmpleado(p), ['pid', 'pnombre', 'prol', 'prolapp'])
  // Las iniciales son un pedazo del nombre: '<b' da '<B'.
  const hIni = api.renderizarFilaEmpleado({ ...e.empleados[0], nombre: '<b' })
  chk('las iniciales de la persona van escapadas', hIni.includes('&lt;B') && !hIni.includes('><B<'))
})

fin()
