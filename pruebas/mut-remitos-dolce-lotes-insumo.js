// Mutaciones de test-remitos-dolce-lotes-insumo.js (Remitos Dolce: lotes en
// los renglones de insumo, 29/10/2026): mutan modulos/remitos-dolce.html
// (ARCHIVO_TEST). Ver mutar.js.
//
// BASELINE FIJO: la suite tiene que dar ROJO sobre el remitos-dolce.html de
// 302b351 (la punta de ci-prueba/remitos-mas-simple, de donde salen los lotes
// de insumo). Nunca HEAD.
//
//   node pruebas/mut-remitos-dolce-lotes-insumo.js
//
// UN RUNNER POR VEZ.
'use strict'

const path = require('path')
const fs = require('fs')
const { execFileSync } = require('child_process')
const { correrMutaciones } = require('./mutar')

const RAIZ = path.join(__dirname, '..')
const SUITE = path.join(__dirname, 'test-remitos-dolce-lotes-insumo.js')
const BASE = '302b351'

if (process.env.MUT_SOLO_ANCLAS !== '1') {
  let viejo = null
  try {
    viejo = execFileSync('git', ['show', `${BASE}:modulos/remitos-dolce.html`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  } catch {
    console.log(`(sin el historial de git: no se corre el baseline ${BASE})`)
  }
  if (viejo !== null) {
    const tmp = path.join(__dirname, 'mut-tmp-base-remitos-dolce-lotes-insumo.html')
    fs.writeFileSync(tmp, viejo)
    let rojo = false
    try {
      execFileSync(process.execPath, [SUITE], { encoding: 'utf8', env: { ...process.env, ARCHIVO_TEST: tmp }, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 })
    } catch { rojo = true } finally { fs.rmSync(tmp, { force: true }) }
    console.log(rojo ? `BASELINE ${BASE}: la suite da ROJO sobre el módulo de antes (bien).` : `ABORTADO: la suite da VERDE sobre ${BASE}: no prueba lo nuevo.`)
    if (!rojo) process.exit(2)
  }
}

correrMutaciones({
  suite: SUITE,
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/remitos-dolce.html'),
  escape: 'esc',
  funciones: [],
  equivalentes: [],
  manuales: [
    { nombre: 'el insumo sin lotes en el editor', de: "htmlSaldoAcopioRemito(rm, r, i) + htmlLotesRemito(r, i) : r.insumoId ? htmlLotesRemito(r, i) : '')", a: "htmlSaldoAcopioRemito(rm, r, i) + htmlLotesRemito(r, i) : '')" },
    { nombre: 'el insumo con "Cajas"', de: "      if (!r?.insumoId) return 'Cajas'\n", a: "      return 'Cajas'\n" },
    { nombre: 'el rótulo sin la unidad', de: "      return u ? `Cantidad (${u})` : 'Cantidad'", a: "      return 'Cantidad'" },
    { nombre: 'el rótulo sin escapar', de: '<span>${esc(rotulo)}</span>', a: '<span>${rotulo}</span>' },
    { nombre: 'inputmode numérico también en insumo', de: "inputmode=\"${r?.insumoId ? 'decimal' : 'numeric'}\"", a: 'inputmode="numeric"' },
    { nombre: 'a la base como cajas', de: 'lote: normalizarLoteRemito(l.lote).slice(0, LARGO_LOTE_REMITO), cantidad: cantidadLoteInsumo(l) }))', a: 'lote: normalizarLoteRemito(l.lote).slice(0, LARGO_LOTE_REMITO), cajas: cantidadLoteInsumo(l) }))' },
    { nombre: 'el lote del insumo sin mayúsculas', de: 'lotes.map(l => ({ lote: normalizarLoteRemito(l.lote).slice(0, LARGO_LOTE_REMITO), cantidad:', a: 'lotes.map(l => ({ lote: String(l.lote).trim().slice(0, LARGO_LOTE_REMITO), cantidad:' },
    { nombre: 'el insumo no manda lotes', de: '        lotes: pres || r?.insumoId ? lotesRemitoParaBase(r) : [],', a: '        lotes: pres ? lotesRemitoParaBase(r) : [],' },
    { nombre: 'los decimales se pierden (cajas enteras)', de: '      return r?.insumoId ? cantidadLoteInsumo(l) : cajasLoteRemito(l)', a: '      return cajasLoteRemito(l)' },
    { nombre: 'la suma sin redondear', de: "      const asignado = Math.round((r?.lotes ?? []).reduce((s, l) => s + cantidadLoteRemito(r, l), 0) * 1000) / 1000", a: '      const asignado = (r?.lotes ?? []).reduce((s, l) => s + cantidadLoteRemito(r, l), 0)' },
    { nombre: 'sin milésimas', de: '? Math.round(n * 1000) / 1000 : 0', a: '? n : 0' },
    { nombre: 'una cantidad negativa suma', de: '&& Number.isFinite(n) && n > 0 ? Math.round(n * 1000) / 1000 : 0', a: '&& Number.isFinite(n) ? Math.round(n * 1000) / 1000 : 0' },
    { nombre: 'lo leído del insumo sin precargar', de: "          : typeof it?.insumo_id === 'string' && it.insumo_id ? (Array.isArray(it?.lotes) ? it.lotes : []).map(l => ({ lote: String(l?.lote ?? ''), cajas: cantidadLoteInsumo(l) || null })) : [],", a: '          : [],' },
    { nombre: 'lo leído sin mirar "cantidad"', de: '      const v = l?.cajas ?? l?.cantidad', a: '      const v = l?.cajas' },
    { nombre: 'el insumo dice cajas en el pie', de: "      if (!r?.insumoId) return `${enteroHoja(n)} ${n === 1 ? 'caja' : 'cajas'}`", a: "      return `${enteroHoja(n)} ${n === 1 ? 'caja' : 'cajas'}`" },
    { nombre: 'el pie del insumo con "cajas"', de: "      const deCuanto = ins ? `${esc(cantidadRenglonRemito(r, a.asignado).replace(/ \\S+$/, ''))} de ${esc(cantidadRenglonRemito(r, a.pedido))}`", a: "      const deCuanto = false ? ''" },
    { nombre: 'el de más del insumo sin la unidad', de: "${esc(ins ? cantidadRenglonRemito(r, -a.falta) : enteroHoja(-a.falta))} de más", a: '${esc(enteroHoja(-a.falta))} de más' },
    { nombre: 'sin lote: el texto del producto', de: "${ins ? 'Sin lotes escritos sale de los lotes más viejos con stock.' : 'Sin lotes escritos sale como «SIN LOTE».'}", a: 'Sin lotes escritos sale como «SIN LOTE».' },
    { nombre: 'sin cantidad: el texto del producto', de: "${ins ? 'Poné la cantidad y escribí de qué lotes sale.' : 'Poné las cajas y escribí de qué lotes salen.'}", a: 'Poné las cajas y escribí de qué lotes salen.' },
    { nombre: 'pasar a producto deja los lotes del insumo', de: '      if (r.insumoId) r.lotes = []\n      r.presentacionId = pr.id', a: '      r.presentacionId = pr.id' },
  ],
})
