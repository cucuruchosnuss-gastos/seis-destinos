// Mutaciones de test-remitos-dolce-ilustracion.js (el cono de papel
// ilustración a la vista, 30/10/2026): mutan modulos/remitos-dolce.html
// (ARCHIVO_TEST), js/remitos-comun.js (ARCHIVO_COMUN_REMITOS) y
// modulos/retiros.html (ARCHIVO_RETIROS). Ver mutar.js.
//
// BASELINE FIJO: la suite tiene que dar ROJO sobre el js/remitos-comun.js de
// 302b351 (la rama ci-prueba/remitos-mas-simple antes del cono de
// ilustración). Nunca HEAD.
//
//   node pruebas/mut-remitos-dolce-ilustracion.js
//
// UN RUNNER POR VEZ.
'use strict'

const path = require('path')
const fs = require('fs')
const { execFileSync } = require('child_process')
const { correrMutacionesEnVarios } = require('./mutar')

const RAIZ = path.join(__dirname, '..')
const SUITE = path.join(__dirname, 'test-remitos-dolce-ilustracion.js')
const BASE = '302b351'

if (process.env.MUT_SOLO_ANCLAS !== '1') {
  let viejo = null
  try {
    viejo = execFileSync('git', ['show', `${BASE}:js/remitos-comun.js`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  } catch {
    console.log(`(sin el historial de git: no se corre el baseline ${BASE})`)
  }
  if (viejo !== null) {
    const tmp = path.join(__dirname, 'mut-tmp-base-remitos-comun-ilustracion.js')
    fs.writeFileSync(tmp, viejo)
    let rojo = false
    try {
      execFileSync(process.execPath, [SUITE], { encoding: 'utf8', env: { ...process.env, ARCHIVO_COMUN_REMITOS: tmp }, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 })
    } catch { rojo = true } finally { fs.rmSync(tmp, { force: true }) }
    console.log(rojo ? `BASELINE ${BASE}: la suite da ROJO sobre el común de antes (bien).` : `ABORTADO: la suite da VERDE sobre ${BASE}: no prueba lo nuevo.`)
    if (!rojo) process.exit(2)
  }
}

correrMutacionesEnVarios([{
  suite: SUITE,
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/remitos-dolce.html'),
  variable: 'ARCHIVO_TEST',
  escape: 'esc',
  funciones: [],
  equivalentes: [],
  manuales: [
    { nombre: 'Remitos no lee papel_ilustracion', de: ".select('id, nombre, papel_ilustracion')", a: ".select('id, nombre')" },
    { nombre: 'el buscador sin "(ilustración)"', de: '${esc(nombreConoRemito(m))}</button>', a: '${esc(m.nombre)}</button>' },
    { nombre: 'el buscador sin escapar', de: '${esc(nombreConoRemito(m))}</button>', a: '${nombreConoRemito(m)}</button>' },
    { nombre: 'el cono elegido sin "(ilustración)"', de: '      const elegido = nombreConoPorIdRemito(cat, r.marcaId)', a: "      const elegido = r.marcaId ? ((cat?.marcas ?? []).find(m => m.id === r.marcaId)?.nombre ?? '') : ''" },
  ],
}, {
  suite: SUITE,
  original: path.join(RAIZ, 'js', 'remitos-comun.js'),
  variable: 'ARCHIVO_COMUN_REMITOS',
  funciones: [],
  manuales: [
    { nombre: 'nunca "(ilustración)"', de: "  return m?.papel_ilustracion === true ? n + ' (ilustración)' : n", a: '  return n' },
    { nombre: 'siempre "(ilustración)"', de: "  return m?.papel_ilustracion === true ? n + ' (ilustración)' : n", a: "  return n + ' (ilustración)'" },
    { nombre: 'sin nombre igual devuelve algo', de: "  if (!n) return ''\n  return m?.papel_ilustracion", a: '  return m?.papel_ilustracion' },
    { nombre: 'el renglón con el nombre crudo', de: '  const cono = pr.con_cono ? (r.marcaId ? nombreConoPorIdRemito(cat, r.marcaId) : ', a: "  const cono = pr.con_cono ? (r.marcaId ? ((cat?.marcas ?? []).find(m => m.id === r.marcaId)?.nombre ?? '') : " },
    { nombre: 'el cono que no está queda vacío', de: "  return m ? nombreConoRemito(m) : 'Cono que no se pudo leer'", a: "  return m ? nombreConoRemito(m) : ''" },
  ],
}, {
  suite: SUITE,
  original: path.join(RAIZ, 'modulos/retiros.html'),
  variable: 'ARCHIVO_RETIROS',
  funciones: [],
  manuales: [
    { nombre: 'la Carga no lee papel_ilustracion', de: ".select('id, nombre, estado_alta, papel_ilustracion')", a: ".select('id, nombre, estado_alta')" },
    { nombre: 'la hoja con el nombre de la orden', de: 'conoNombre: conoParaHoja(r, estado.catalogo),', a: 'conoNombre: limpio(r.marca) || null,' },
    { nombre: 'la hoja nunca "(ilustración)"', de: "(m.papel_ilustracion === true ? ' (ilustración)' : '')", a: "''" },
    { nombre: 'la hoja busca el cono por nombre', de: '      const m = r?.marca_id ? (cat?.marcas ?? []).find(x => x.id === r.marca_id) : null', a: '      const m = null' },
    { nombre: 'un cono fuera del catálogo queda sin nombre', de: '      return limpio(r?.marca) || null\n    }\n\n    function conoDeRenglonMio', a: '      return null\n    }\n\n    function conoDeRenglonMio' },
  ],
}])
