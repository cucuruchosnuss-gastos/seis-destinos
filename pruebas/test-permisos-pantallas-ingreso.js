// Permisos en pantalla de Ingreso (11/10/2026, M1 del informe
// .claude/traspasos/2026-10-10-permisos.md): "Cargar ingreso" solo con
// materia_prima:cargar en alguna fábrica, y el wizard ofrece solo las fábricas
// donde puede cargar (puedeCargarEn, la regla de tiene_tarea_alcance que piden
// las policies INSERT de materia_prima_ingresos / _items). Antes Tomás y
// Yanina (el módulo sin ninguna tarea de materia_prima) hacían el wizard
// entero y fallaban al confirmar con un error de RLS crudo.
//
//   node pruebas/test-permisos-pantallas-ingreso.js
//   ARCHIVO_TEST=<copia de modulos/materia-prima.html> node pruebas/test-permisos-pantallas-ingreso.js
'use strict'

const fs = require('fs')
const path = require('path')
const { construirCon } = require('./sandbox')
const { extraerFn } = require('./extraer')
const { arnes } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos', 'materia-prima.html')
const HTML = fs.readFileSync(ARCHIVO, 'utf8')
// El runner de mutaciones confirma con esta línea que se leyó la copia mutada.
console.log(`ARCHIVO ${ARCHIVO} (${HTML.length} bytes)`)
const SCRIPT = HTML.slice(HTML.indexOf('<script type="module">'))
const { chk, esperas, fin } = arnes()

const NUSS = 'u-nuss', DOLCE = 'u-dolce', MENGUI = 'u-mengui'
const UNIDADES = [{ id: NUSS, nombre: 'Cucuruchos Nuss' }, { id: DOLCE, nombre: 'Dolce Pasta' }, { id: MENGUI, nombre: 'Mengui' }]
// Una copia de antes del 11/10/2026 no tiene puedeCargarAlguna: se reemplaza
// por lo que hacía (el botón siempre), así corre y da ROJO por lo que afirma.
const TIENE_ALGUNA = /function puedeCargarAlguna\(/.test(SCRIPT)

const PRELUDIO = `
  var FABRICA_SIN_DATOS = { ok: false, unidades: new Set(), personas: new Set(), soyDePrueba: false }
  function sinUnidadesDePrueba(filas, fabrica) { return (filas ?? []).filter(u => !fabrica?.unidades?.has(u.id) || fabrica?.soyDePrueba) }
  var __errores = []
  function mostrarError(m) { __errores.push(m) }
  function nuevoEl(id) { return { id, innerHTML: '', value: '', hidden: true, removeAttribute(a) { if (a === 'hidden') this.hidden = false }, querySelectorAll: () => [], classList: { toggle() {} } } }
  var __els = new Map()
  var document = { getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) } }
  function wizardVacio() { return { encabezado: { unidadId: '' } } }
  function renderizarTogglesTipoDoc() {} function resetearPaso1() {} function renderizarAvisoDesdeGasto() {}
  function irAPasoWz() {} async function cargarCatalogoInsumos() {} async function cargarProveedores() {}
  function esc(s) { return String(s ?? '') }
  ${TIENE_ALGUNA ? '' : 'function puedeCargarAlguna() { return true }'}
  var estado = { miRolApp: 'usuario', misTareas: new Set(), alcances: new Map(), unidades: [], fabrica: FABRICA_SIN_DATOS,
    barra: { elegida: null }, wizard: null }
`
function nuevo({ rol = 'usuario', alcance } = {}) {
  const S = construirCon(ARCHIVO, {
    preludio: PRELUDIO,
    funciones: ['puedeCargarEn', 'unidadesParaElegir', ...(TIENE_ALGUNA ? ['puedeCargarAlguna'] : []), 'poblarSelectUnidades', 'abrirWizard'],
    retorno: 'estado, __el(id) { return document.getElementById(id) }, __errores, puedeCargarAlguna',
  })
  S.estado.unidades = UNIDADES
  S.estado.miRolApp = rol
  if (alcance !== undefined) {
    S.estado.misTareas = new Set(['materia_prima:cargar'])
    S.estado.alcances = new Map([['materia_prima:cargar', alcance]])
  }
  return S
}

// ── "Cargar ingreso" ──────────────────────────────────────────────────────
chk('M1: Tomás / Yanina (el módulo sin materia_prima:cargar) no pueden cargar', nuevo().puedeCargarAlguna() === false)
chk('M1: con ver_todo pero sin cargar, tampoco', (() => { const S = nuevo(); S.estado.misTareas = new Set(['materia_prima:ver_todo']); S.estado.alcances = new Map([['materia_prima:ver_todo', { todas: true }]]); return S.puedeCargarAlguna() === false })())
chk('M1: con cargar en una fábrica, sí', nuevo({ alcance: { unidades: [DOLCE] } }).puedeCargarAlguna() === true)
chk('M1: un super_admin, sí', nuevo({ rol: 'super_admin' }).puedeCargarAlguna() === true)
{
  const init = extraerFn(SCRIPT, 'init')
  chk('M1: init esconde "Cargar ingreso" sin poder cargar en ninguna fábrica',
    /document\.getElementById\('btn-abrir-wizard'\)\.hidden = !puedeCargarAlguna\(\)/.test(init))
}

// ── Las fábricas del wizard ───────────────────────────────────────────────
{
  const S = nuevo({ alcance: { unidades: [DOLCE, MENGUI] } })
  const ids = S.unidadesParaElegir().map(u => u.id)
  chk('M1: el wizard ofrece solo las fábricas donde puede cargar', ids.join() === [DOLCE, MENGUI].join(), ids.join())
  S.estado.wizard = { encabezado: { unidadId: '' } }
  S.poblarSelectUnidades()
  const html = S.__el('campo-unidad-negocio').innerHTML
  chk('M1: el selector no ofrece Cucuruchos Nuss', !html.includes('Cucuruchos Nuss') && html.includes('Dolce Pasta'), html)
}
chk('M1: con alcance "todas", las tres', nuevo({ alcance: { todas: true } }).unidadesParaElegir().length === 3)
chk('M1: un super_admin, las tres', nuevo({ rol: 'super_admin' }).unidadesParaElegir().length === 3)

esperas.push((async () => {
  {
    const S = nuevo()
    const r = await S.abrirWizard()
    chk('M1: sin poder cargar, el wizard no se abre', r === false && S.estado.wizard === null)
    chk('M1: y lo dice', S.__errores.some(m => /hace falta el permiso de registrar ingresos/.test(m)), JSON.stringify(S.__errores))
  }
  {
    const S = nuevo({ alcance: { unidades: [MENGUI] } })
    await S.abrirWizard()
    chk('M1: con una sola fábrica donde carga, viene puesta', S.estado.wizard?.encabezado.unidadId === MENGUI)
  }
})())

fin()
