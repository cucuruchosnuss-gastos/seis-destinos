// Suite: las cuentas de las tablets de la fábrica NO son personas en Gastos.
//
// Las tablets de Producción tienen fila en `empleados` (es_dispositivo = true,
// tipo = 'sistema') para poder loguearse. No se les atribuye un gasto ni se
// ofrecen en ninguna lista de personas del módulo. Se filtra EN EL CLIENTE con
// esCuentaDeTablet(): un .neq('tipo','sistema') en la consulta descartaría en
// silencio las filas con tipo null.
//
// Los renders se EJECUTAN (poblarSelectEmpleados con un document falso), y
// además se afirma sobre el TEXTO de los .select(): el doble de supabase no
// mira las columnas pedidas, así que sacar `tipo` de una consulta solo se ve ahí.
//
//   node pruebas/test-gastos-tablets.js
//   ARCHIVO_TEST=otra-copia.html node pruebas/test-gastos-tablets.js

const path = require('path')
const { construirCon } = require('./sandbox')
const { arnes, leer } = require('./circuito-comun')
const { extraerFn } = require('./extraer')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/gastos.html')
const FUENTE = leer(ARCHIVO)
const { chk, fin } = arnes()

// Personas de prueba: dos naaloo, una admin, una con tipo NULL y otra sin el
// campo (no se tienen que descartar), la Empresa y dos tablets.
const EMPLEADOS = [
  { id: 'e-ana',  nombre: 'Ana',   tipo: 'naaloo' },
  { id: 'e-beto', nombre: 'Beto',  tipo: 'naaloo' },
  { id: 'e-adm',  nombre: 'Admin', tipo: 'admin' },
  { id: 'e-null', nombre: 'Sin tipo', tipo: null },
  { id: 'e-sint', nombre: 'Sin campo tipo' },
  { id: 'e-emp',  nombre: 'Empresa', tipo: 'empresa' },
  { id: 't-cn',   nombre: 'Tablet Producción · Cucuruchos Nuss', tipo: 'sistema' },
  { id: 't-dp',   nombre: 'Tablet Producción · Dolce Pasta',     tipo: 'sistema' },
]

const PRELUDIO = `
  function nuevoEl(id) {
    return { id, innerHTML: '', textContent: '', value: '', hidden: false, disabled: false, style: {}, dataset: {}, addEventListener(){} }
  }
  var __els = new Map()
  var document = { getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) } }
  function cerrarProyectoNuevoWizard() {}
  var estado = {
    miRolApp: 'usuario', miEmpleadoId: 'e-ana', misTareas: new Set(['gastos:ver_exportar']),
    maestros: { empleados: [], unidades: [{ id: 'u1', nombre: 'Cucuruchos Nuss' }] },
  }
`
const S = construirCon(ARCHIVO, {
  preludio: PRELUDIO,
  funciones: ['esc', 'tieneTarea', 'esCuentaDeTablet', 'personasElegibles', 'personasParaEditar', 'poblarSelectEmpleados'],
  retorno: 'estado, __els',
})
S.estado.maestros.empleados = EMPLEADOS.map(e => ({ ...e }))

// ── esCuentaDeTablet ─────────────────────────────────────────────────────
chk('tipo sistema es tablet', S.esCuentaDeTablet({ tipo: 'sistema' }) === true)
for (const t of ['naaloo', 'admin', 'empresa', null, undefined, '']) {
  chk(`tipo ${JSON.stringify(t)} NO es tablet`, S.esCuentaDeTablet({ tipo: t }) === false)
}
chk('null no rompe', S.esCuentaDeTablet(null) === false)

// ── personasElegibles ────────────────────────────────────────────────────
const ids = S.personasElegibles().map(e => e.id)
chk('ninguna tablet entre las elegibles', !ids.includes('t-cn') && !ids.includes('t-dp'), ids.join(','))
for (const id of ['e-ana', 'e-beto', 'e-adm', 'e-null', 'e-sint', 'e-emp']) {
  chk(`${id} sigue entre las elegibles`, ids.includes(id), ids.join(','))
}
chk('estado.maestros.empleados queda COMPLETO (resolución de nombres por id)',
  S.estado.maestros.empleados.length === EMPLEADOS.length)

// ── poblarSelectEmpleados (selector del wizard), ejecutado ───────────────
S.poblarSelectEmpleados('u1')
const html = S.__els.get('campo-empleado').innerHTML
chk('wizard: ninguna tablet en el selector', !/Tablet|t-cn|t-dp/.test(html), html)
chk('wizard: la persona con tipo null aparece', html.includes('value="e-null"'))
chk('wizard: la persona sin campo tipo aparece', html.includes('value="e-sint"'))
chk('wizard: naaloo aparece', html.includes('value="e-ana"') && html.includes('value="e-beto"'))
chk('wizard: el admin sigue en su grupo, con "(Admin)"', /value="e-adm"[^>]*>Admin \(Admin\)/.test(html), html)
chk('wizard: Empresa aparece como antes (no es tablet)', html.includes('value="e-emp"'))
chk('wizard: el admin va DESPUÉS del separador', html.indexOf('──') > -1 && html.indexOf('──') < html.indexOf('e-adm'))
chk('wizard: queda elegida la persona propia', S.__els.get('campo-empleado').value === 'e-ana')

// Una lista con SOLO tablets no deja ninguna persona
S.estado.maestros.empleados = [{ id: 't-cn', nombre: 'Tablet', tipo: 'sistema' }]
S.poblarSelectEmpleados('u1')
chk('wizard: solo tablets → ninguna opción de persona',
  !S.__els.get('campo-empleado').innerHTML.includes('t-cn'))
S.estado.maestros.empleados = EMPLEADOS.map(e => ({ ...e }))

// ── personasParaEditar (selector de la edición) ──────────────────────────
const edit = S.personasParaEditar({ empleado_id: 'e-ana', empleados: { id: 'e-ana' } }).map(e => e.id)
chk('edición: ninguna tablet', !edit.includes('t-cn') && !edit.includes('t-dp'), edit.join(','))
chk('edición: tipo null aparece', edit.includes('e-null'))
chk('edición: Empresa aparece', edit.includes('e-emp'))
const editTablet = S.personasParaEditar({ empleado_id: 't-cn', empleados: { id: 't-cn' } }).map(e => e.id)
chk('edición: un gasto que YA es de una tablet no pierde su persona', editTablet.includes('t-cn'))
chk('edición: pero no se ofrecen las OTRAS tablets', !editTablet.includes('t-dp'))
const editSinEmbed = S.personasParaEditar({ empleado_id: 't-dp' }).map(e => e.id)
chk('edición: sin embed, usa empleado_id', editSinEmbed.includes('t-dp'))
chk('edición: personasParaEditar no muta la lista maestra',
  S.estado.maestros.empleados.length === EMPLEADOS.length)

// ── Call sites y consultas (el doble no mira el .select()) ───────────────
const fnEdicion = extraerFn(FUENTE, 'mostrarFormularioEdicionGasto')
chk('el select de la edición se arma con personasParaEditar(g)',
  /<select id="edit-empleado">[\s\S]*?\$\{personasParaEditar\(g\)\.map\(/.test(fnEdicion))
chk('el select de la edición NO recorre estado.maestros.empleados crudo',
  !/<select id="edit-empleado">[\s\S]{0,120}estado\.maestros\.empleados\.map/.test(fnEdicion))
chk('poblarSelectEmpleados parte de personasElegibles()',
  /const todos\s+= personasElegibles\(\)/.test(extraerFn(FUENTE, 'poblarSelectEmpleados')))

const consultas = FUENTE.match(/\.from\('v_empleados_publico'\)\s*\.select\('[^']*'\)\s*\.eq\('activo', true\)/g) || []
chk('hay dos consultas de lista de personas activas', consultas.length === 2, String(consultas.length))
for (const q of consultas) chk(`la consulta trae tipo: ${q.slice(0, 80)}`, /select\('[^']*\btipo\b/.test(q), q)
// En código la llamada va encadenada a un ')'; el comentario la nombra suelta.
chk('nunca se filtra la tablet en SQL con .neq(tipo)', !/\)\s*\.neq\(\s*'tipo'/.test(FUENTE))
const iTablet = FUENTE.indexOf('function esCuentaDeTablet')
chk('el comentario nombra la regla de fondo es_dispositivo',
  iTablet > 0 && /es_dispositivo/.test(FUENTE.slice(iTablet - 1500, iTablet)))

fin()
