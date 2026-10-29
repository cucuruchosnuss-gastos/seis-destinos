// Mutaciones de test-modulos-remitos-dolce.js (la tarjeta de Remitos Dolce,
// 28/10/2026): mutan js/modulos.js (ARCHIVO_MODULOS) y js/barra-lateral.js
// (ARCHIVO_BARRA). Ver mutar.js.
//
// BASELINE FIJO: la suite tiene que dar ROJO sobre js/modulos.js de 133555d
// (el main del que salió la rama: la tarjeta no existía). Nunca HEAD.
//
//   node pruebas/mut-modulos-remitos-dolce.js
//
// UN RUNNER POR VEZ.
'use strict'

const path = require('path')
const fs = require('fs')
const { execFileSync } = require('child_process')
const { correrMutacionesEnVarios } = require('./mutar')

const RAIZ = path.join(__dirname, '..')
const SUITE = path.join(__dirname, 'test-modulos-remitos-dolce.js')
const BASE = '133555d'

if (process.env.MUT_SOLO_ANCLAS !== '1') {
  const viejo = execFileSync('git', ['show', `${BASE}:js/modulos.js`], { cwd: RAIZ, encoding: 'utf8' })
  const tmp = path.join(__dirname, 'mut-tmp-base-modulos-remitos-dolce.js')
  fs.writeFileSync(tmp, viejo)
  let rojo = false
  try {
    execFileSync(process.execPath, [SUITE], { encoding: 'utf8', env: { ...process.env, ARCHIVO_MODULOS: tmp }, stdio: ['ignore', 'pipe', 'pipe'] })
  } catch { rojo = true } finally { fs.rmSync(tmp, { force: true }) }
  console.log(rojo ? `BASELINE ${BASE}: la suite da ROJO sobre js/modulos.js de antes (bien).` : `ABORTADO: la suite da VERDE sobre ${BASE}: no prueba lo nuevo.`)
  if (!rojo) process.exit(2)
}

correrMutacionesEnVarios([{
  suite: SUITE,
  original: path.join(RAIZ, 'js', 'modulos.js'),
  variable: 'ARCHIVO_MODULOS',
  funciones: [],
  manuales: [
    { nombre: 'sin mirar el alcance', de: "  if (!modulo.alcanceEn) return modulo.requiereTareas.some(t => tareas.has(t))\n", a: '  return modulo.requiereTareas.some(t => tareas.has(t))\n' },
    { nombre: 'el alcance de cualquier fábrica', de: '(Array.isArray(a.unidades) && a.unidades.map(String).includes(String(modulo.alcanceEn)))', a: 'Array.isArray(a.unidades)' },
    { nombre: '"todas" con cualquier valor', de: '(a.todas === true ||', a: '(!!a.todas ||' },
    { nombre: 'sin "todas"', de: '(a.todas === true ||', a: '(false ||' },
    { nombre: 'el alcance sin tener la tarea', de: 'const a = tareas.has(t) ? misAlcances?.get?.(t) : null', a: 'const a = misAlcances?.get?.(t)' },
    { nombre: 'sin alcances leídos, se ve', de: "    return !!a && typeof a === 'object' && (", a: "    return !a || (" },
    { nombre: 'super_admin no la ve', de: '  if (esSuperAdmin || porTarea) return true\n', a: '  if (porTarea) return true\n' },
    { nombre: 'otra fábrica', de: "    alcanceEn: '118b348c-43ec-4f6c-8bc2-27ab6f24b761',", a: "    alcanceEn: '91d2d5e8-b60f-43bb-97ae-85bb355f57b2'," },
    { nombre: 'sin retiros:ver', de: "    requiereTareas: ['retiros:cargar', 'retiros:ver'],\n    alcanceEn", a: "    requiereTareas: ['retiros:cargar'],\n    alcanceEn" },
    { nombre: 'sin pedir el módulo retiros', de: "    requiereModulo: 'retiros',\n    requiereTareas: ['retiros:cargar', 'retiros:ver'],", a: "    sinFilaModulo: true,\n    requiereTareas: ['retiros:cargar', 'retiros:ver']," },
    { nombre: 'sin color propio', de: "  'remitos-dolce': [0.50, 0.13, 250],\n", a: '' },
    { nombre: 'fuera de la barra ordenada', de: "'retiros', 'remitos-dolce', 'administracion'", a: "'retiros', 'administracion'" },
  ],
}, {
  suite: SUITE,
  original: path.join(RAIZ, 'js', 'barra-lateral.js'),
  variable: 'ARCHIVO_BARRA',
  funciones: [],
  manuales: [
    { nombre: 'sin ícono', de: "  'remitos-dolce': 'M6 3h9l3 3v15H6zM9 9h6M9 13h6M9 17h4',\n", a: '' },
    { nombre: 'la barra no lee el alcance', de: "select('modulo, tarea, alcance')", a: "select('modulo, tarea')" },
    { nombre: 'la barra no pasa los alcances', de: 'modulosDeBarra({ esAdmin, esSuperAdmin, misModulos, misTareas, misAlcances })', a: 'modulosDeBarra({ esAdmin, esSuperAdmin, misModulos, misTareas })' },
  ],
}])
