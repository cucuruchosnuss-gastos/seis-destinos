// Permisos en pantalla de Proyectos Taller (11/10/2026, B4 del informe
// .claude/traspasos/2026-10-10-permisos.md): con taller:cargar o
// taller:gestionar SIN taller:ver, la base no deja leer ningún proyecto
// (proyectos_taller, resumen_proyecto, tareas_taller y las policies piden
// taller:ver o precios). La pantalla lo dice en vez de mostrar listas vacías.
// init() se EJECUTA entero con el sandbox del módulo.
//
//   node pruebas/test-permisos-pantallas-taller.js
//   ARCHIVO_TEST=<copia de modulos/taller.html> node pruebas/test-permisos-pantallas-taller.js
'use strict'

const { construirTaller } = require('./sandbox-taller')
const { arnes } = require('./circuito-comun')
const { chk, fin } = arnes()

const fs = require('fs')
const path = require('path')
const RUTA = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos', 'taller.html')
const HTML = fs.readFileSync(RUTA, 'utf8')
// El runner de mutaciones confirma con esta línea que se leyó la copia mutada.
console.log(`ARCHIVO ${RUTA} (${HTML.length} bytes)`)
// Los elementos del HTML estático, para que init() los encuentre.
const IDS = [...HTML.slice(0, HTML.indexOf('<script type="module">')).matchAll(/ id="([^"$]+)"/g)].map(m => m[1])

async function entrar(tareas, rol = 'usuario') {
  const S = construirTaller()
  for (const id of IDS) S.__el(id)
  S.__el('tl-sin-acceso').hidden = true
  S.document.querySelector = (sel) => S.__el(sel)
  S.__setSesion({ user: { id: 'auth-1' } })
  S.__tablas.empleados = [{ id: 'emp-1', rol_app: rol }]
  S.__tablas.empleado_tareas = tareas.map(t => ({ tarea: t }))
  S.__tablas.unidades_negocio = [{ id: 'u-t', nombre: 'Taller' }]
  S.__setRpc(async (n) => n === 'proyectos_taller' ? { data: [], error: null } : { data: null, error: null })
  await S.init()
  await new Promise(r => setTimeout(r, 0))
  return S
}

;(async () => {
  for (const tareas of [['cargar'], ['gestionar'], ['cargar', 'gestionar']]) {
    const S = await entrar(tareas)
    const aviso = S.__el('tl-sin-acceso')
    chk(`B4: con ${tareas.join(' + ')} sin ver, se ve el aviso`, aviso.hidden === false, String(aviso.hidden))
    chk(`B4: con ${tareas.join(' + ')}, el aviso nombra el permiso que falta`, /hace falta el permiso «Ver los proyectos del Taller»/.test(aviso.textContent), aviso.textContent)
    chk(`B4: con ${tareas.join(' + ')}, no pide los proyectos (saldrían vacíos)`, !S.__llamadas.rpc.some(x => x[0] === 'proyectos_taller' || x[0] === 'tareas_taller'), JSON.stringify(S.__llamadas.rpc.map(x => x[0])))
    chk(`B4: con ${tareas.join(' + ')}, no lo saca de la pantalla con un error`, !S.__llamadas.errores.length, JSON.stringify(S.__llamadas.errores))
  }
  {
    const S = await entrar(['ver', 'cargar'])
    chk('B4: con ver, sin aviso', S.__el('tl-sin-acceso').hidden !== false)
    chk('B4: con ver, pide los proyectos', S.__llamadas.rpc.some(x => x[0] === 'proyectos_taller'))
  }
  {
    const S = await entrar(['precios'])
    chk('B4: con precios (la base también lo acepta), sin aviso', S.__el('tl-sin-acceso').hidden !== false)
  }
  {
    const S = await entrar([], 'super_admin')
    chk('B4: un super_admin, sin aviso', S.__el('tl-sin-acceso').hidden !== false)
  }
  {
    const S = await entrar([])
    chk('B4: sin ninguna tarea, sigue el "no tenés acceso" de siempre', /No tenés acceso a Proyectos Taller/.test(S.__el('tl-sin-acceso').textContent))
  }
})().then(() => fin(), e => { chk('sin excepción', false, e.stack); fin() })
