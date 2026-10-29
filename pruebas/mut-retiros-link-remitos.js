// Mutaciones de test-retiros-link-remitos.js (el link a Remitos Dolce en la
// Carga, 28/10/2026): mutan modulos/retiros.html (ARCHIVO_TEST). Ver mutar.js.
//
// BASELINE FIJO: la suite tiene que dar ROJO sobre la Carga de 133555d (el
// main del que salió la rama: "Subir remitos Rosario" todavía estaba ahí).
// Nunca HEAD.
//
//   node pruebas/mut-retiros-link-remitos.js
//
// UN RUNNER POR VEZ.
'use strict'

const path = require('path')
const fs = require('fs')
const { execFileSync } = require('child_process')
const { correrMutaciones } = require('./mutar')

const RAIZ = path.join(__dirname, '..')
const SUITE = path.join(__dirname, 'test-retiros-link-remitos.js')
const BASE = '133555d'

if (process.env.MUT_SOLO_ANCLAS !== '1') {
  const viejo = execFileSync('git', ['show', `${BASE}:modulos/retiros.html`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  const tmp = path.join(__dirname, 'mut-tmp-base-retiros-link-remitos.html')
  fs.writeFileSync(tmp, viejo)
  let rojo = false
  try {
    execFileSync(process.execPath, [SUITE], { encoding: 'utf8', env: { ...process.env, ARCHIVO_TEST: tmp }, stdio: ['ignore', 'pipe', 'pipe'] })
  } catch { rojo = true } finally { fs.rmSync(tmp, { force: true }) }
  console.log(rojo ? `BASELINE ${BASE}: la suite da ROJO sobre la Carga de antes (bien).` : `ABORTADO: la suite da VERDE sobre ${BASE}: no prueba lo nuevo.`)
  if (!rojo) process.exit(2)
}

correrMutaciones({
  suite: SUITE,
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/retiros.html'),
  funciones: [],
  manuales: [
    { nombre: 'el link sin mirar si carga ahí', de: '      return empresasDeCarga().filter(e => sin.has(e.id))', a: '      return (estado.empresas ?? []).filter(e => sin.has(e.id))' },
    { nombre: 'el link en todas las fábricas', de: '      return empresasDeCarga().filter(e => sin.has(e.id))', a: '      return empresasDeCarga()' },
    { nombre: 'null cuenta como sin control', de: 'filter(u => u?.controla_stock_terminado === false && ids.includes(u.id))', a: 'filter(u => u?.controla_stock_terminado !== true && ids.includes(u.id))' },
    { nombre: 'una fábrica donde no carga cuenta', de: 'filter(u => u?.controla_stock_terminado === false && ids.includes(u.id))', a: 'filter(u => u?.controla_stock_terminado === false)' },
    { nombre: 'el link en medio de la orden', de: "(id === 'rt-vista-form' && paso === 'cliente')", a: "(id === 'rt-vista-form')" },
    { nombre: 'el link sin mirar si puede', de: '      el.hidden = !(enVista && puedeSubirRemitos())', a: '      el.hidden = !enVista' },
    { nombre: 'pintarEncabezado no prende el link', de: '      pintarEntradaRemitos(id, paso)\n', a: '' },
    { nombre: 'el link a otra pestaña', de: 'href="remitos-dolce.html?pestana=subir"', a: 'href="remitos-dolce.html"' },
    { nombre: 'al arrancar no se lee qué fábricas', de: '      leerFabricasSinControl().then(() => { if (estado.vista) pintarEncabezado() })\n', a: '' },
  ],
})
