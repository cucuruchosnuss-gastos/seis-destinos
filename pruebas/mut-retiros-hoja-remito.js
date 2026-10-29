// Mutaciones de test-retiros-hoja-remito.js ("Remito N° X" en la hoja de la
// orden, 27/10/2026): mutan js/retiros-comun.js, que la suite recibe por
// ARCHIVO_COMUN_RETIROS. Ver mutar.js.
//
// BASELINE FIJO: antes de mutar, la suite tiene que dar ROJO sobre el común
// de ANTES del cambio (BASE = f364914, el pedido del que salió la rama
// ci-prueba/remitos-rosario-revisar). Nunca HEAD.
//
//   node pruebas/mut-retiros-hoja-remito.js
'use strict'

const path = require('path')
const fs = require('fs')
const { execFileSync } = require('child_process')
const { correrMutacionesEnVarios } = require('./mutar')

const RAIZ = path.join(__dirname, '..')
const SUITE = path.join(__dirname, 'test-retiros-hoja-remito.js')
const BASE = 'f364914'

{
  let viejo = null
  try {
    viejo = execFileSync('git', ['show', `${BASE}:js/retiros-comun.js`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  } catch {
    console.log(`(sin el historial de git: no se corre el baseline ${BASE})`)
  }
  if (viejo !== null) {
    const tmp = path.join(__dirname, 'mut-tmp-base-retiros-hoja-remito.js')
    fs.writeFileSync(tmp, viejo)
    let rojo = false
    try {
      execFileSync(process.execPath, [SUITE], { encoding: 'utf8', env: { ...process.env, ARCHIVO_COMUN_RETIROS: tmp }, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 })
    } catch { rojo = true } finally { fs.rmSync(tmp, { force: true }) }
    console.log(rojo ? `BASELINE ${BASE}: la suite da ROJO sobre el común de antes (bien).` : `ABORTADO: la suite da VERDE sobre ${BASE}: no prueba lo nuevo.`)
    if (!rojo) process.exit(2)
  }
}

correrMutacionesEnVarios([{
  suite: SUITE,
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'js', 'retiros-comun.js'),
  variable: 'ARCHIVO_COMUN_RETIROS',
  funciones: [],
  manuales: [
    { nombre: 'nunca dice el remito', de: "  if (!n) return ''\n  return `${orden?.talonario === 'acopio' ? 'Acopio' : 'Remito'} N° ${n}`", a: "  return ''" },
    { nombre: 'el acopio dice "Remito"', de: "${orden?.talonario === 'acopio' ? 'Acopio' : 'Remito'} N° ${n}", a: 'Remito N° ${n}' },
    { nombre: 'todo es acopio', de: "${orden?.talonario === 'acopio' ? 'Acopio' : 'Remito'} N° ${n}", a: 'Acopio N° ${n}' },
    { nombre: 'el número sin limpiar', de: "  const n = String(orden?.numeroRemito ?? '').trim()\n  if (!n) return ''", a: "  const n = String(orden?.numeroRemito ?? '')\n  if (!n) return ''" },
    { nombre: 'sin número dice "Remito N° "', de: "  if (!n) return ''\n  return `${orden?.talonario", a: "  return `${orden?.talonario" },
    { nombre: 'sin escHoja en la hoja', de: '<span class="rh-orden__remito">${escHoja(remito)}</span>', a: '<span class="rh-orden__remito">${remito}</span>' },
    { nombre: 'la hoja sin el remito', de: "    (remito ? `<span class=\"rh-orden__remito\">${escHoja(remito)}</span>` : '') + `</div></header>` +", a: '    `</div></header>` +' },
    { nombre: 'la hoja con el span vacío sin número', de: "    (remito ? `<span class=\"rh-orden__remito\">${escHoja(remito)}</span>` : '') + `</div></header>` +", a: '    `<span class="rh-orden__remito">${escHoja(remito)}</span></div></header>` +' },
    { nombre: 'el remito antes de la fecha', de: "    `<span class=\"rh-orden__fecha\">${escHoja(fecha)}</span>` +\n    (remito ? `<span class=\"rh-orden__remito\">${escHoja(remito)}</span>` : '') + `</div></header>` +",
      a: "    (remito ? `<span class=\"rh-orden__remito\">${escHoja(remito)}</span>` : '') + `<span class=\"rh-orden__fecha\">${escHoja(fecha)}</span>` + `</div></header>` +" },
    { nombre: 'el texto para compartir sin el remito', de: '  if (textoRemitoHoja(orden)) lineas.splice(1, 0, textoRemitoHoja(orden))\n', a: '' },
    { nombre: 'el texto con el remito al final', de: '  if (textoRemitoHoja(orden)) lineas.splice(1, 0, textoRemitoHoja(orden))\n', a: '  if (textoRemitoHoja(orden)) lineas.push(textoRemitoHoja(orden))\n' },
    { nombre: 'el remito sin su estilo', de: '.rh-orden__remito { font-size: 11px; font-weight: 800; line-height: 1.15; overflow-wrap: anywhere;', a: '.rh-orden__remito { font-size: 11px; line-height: 1.15;' },
    { nombre: 'el remito no corta en el recuadro', de: 'line-height: 1.15; overflow-wrap: anywhere; border-top: 1px solid #000;', a: 'line-height: 1.15; white-space: nowrap; border-top: 1px solid #000;' },
  ],
}, {
  // La Carga (28/10/2026): lo que trae mis_ordenes_retiro llega a la hoja.
  suite: SUITE,
  original: path.join(RAIZ, 'modulos', 'retiros.html'),
  variable: 'ARCHIVO_TEST',
  funciones: [],
  manuales: [
    { nombre: 'la Carga sin el número', de: "        numeroRemito: limpio(o.numero_remito) || null, talonario: o.talonario === 'acopio' ? 'acopio' : null,\n", a: '' },
    { nombre: 'la Carga sin limpiar el número', de: 'numeroRemito: limpio(o.numero_remito) || null,', a: 'numeroRemito: o.numero_remito || null,' },
    { nombre: 'la Carga sin el talonario', de: "talonario: o.talonario === 'acopio' ? 'acopio' : null,", a: 'talonario: null,' },
    { nombre: 'la Carga: todo es acopio', de: "talonario: o.talonario === 'acopio' ? 'acopio' : null,", a: "talonario: 'acopio'," },
    { nombre: 'la Carga lee otro campo', de: 'numeroRemito: limpio(o.numero_remito) || null,', a: 'numeroRemito: limpio(o.numeroRemito) || null,' },
  ],
}])
