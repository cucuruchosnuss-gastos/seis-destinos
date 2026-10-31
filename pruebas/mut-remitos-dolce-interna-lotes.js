// Mutaciones de test-remitos-dolce-interna-lotes.js (Remitos Dolce →
// Revisar: el aviso de orden interna y los lotes de cada renglón,
// 29/10/2026): mutan modulos/remitos-dolce.html (ARCHIVO_TEST). Ver mutar.js.
//
// BASELINE FIJO: la suite tiene que dar ROJO sobre el remitos-dolce.html de
// 497c393 (el main del que salió la rama ci-prueba/recibir-entre-empresas).
// Nunca HEAD.
//
//   node pruebas/mut-remitos-dolce-interna-lotes.js
//
// UN RUNNER POR VEZ.
'use strict'

const path = require('path')
const fs = require('fs')
const { execFileSync } = require('child_process')
const { correrMutaciones } = require('./mutar')

const RAIZ = path.join(__dirname, '..')
const SUITE = path.join(__dirname, 'test-remitos-dolce-interna-lotes.js')
const BASE = '497c393'

if (process.env.MUT_SOLO_ANCLAS !== '1') {
  let viejo = null
  try {
    viejo = execFileSync('git', ['show', `${BASE}:modulos/remitos-dolce.html`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  } catch {
    console.log(`(sin el historial de git: no se corre el baseline ${BASE})`)
  }
  if (viejo !== null) {
    const tmp = path.join(__dirname, 'mut-tmp-base-remitos-dolce-interna-lotes.html')
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
    // La orden interna
    { nombre: 'el aviso sin escapar', de: '${esc(textoOrdenInterna(grupo))}', a: '${textoOrdenInterna(grupo)}' },
    { nombre: 'sin el aviso antes de confirmar', de: '${rmDescartar}${rmInterna}<div class="ad-barra-acciones">', a: '${rmDescartar}<div class="ad-barra-acciones">' },
    { nombre: 'el aviso abajo de los botones', de: '${rmDescartar}${rmInterna}<div class="ad-barra-acciones">', a: '${rmDescartar}<div class="ad-barra-acciones">${rmInterna}' },
    { nombre: 'la misma fábrica cuenta como otra empresa', de: "      if (!u || u === (rm?.fila?.unidad_negocio_id ?? estado.empresaId)) return null", a: '      if (!u) return null' },
    { nombre: 'una empresa desconocida sin respaldo', de: "?.nombre) || 'la otra empresa del grupo'", a: '?.nombre)' },
    { nombre: 'el texto sin la empresa', de: 'va en tránsito hasta que ${empresa} la reciba.`', a: 'va en tránsito.`' },
    { nombre: 'confirmada sin "en tránsito"', de: "(grupo ? `Va en tránsito hasta que ${grupo} la reciba. ` : '')", a: "''" },
    { nombre: 'confirmada a cualquiera dice "en tránsito"', de: "(grupo ? `Va en tránsito hasta que ${grupo} la reciba. ` : '')", a: '`Va en tránsito hasta que ${grupo} la reciba. `' },
    // Los lotes
    { nombre: '"Asignado" en vez de "Lotes:"', de: '">Lotes: ${deCuanto}</span>', a: '">Asignado ${deCuanto}</span>' },
    { nombre: 'sin el amarillo cuando no suman', de: "${a.falta === 0 ? '' : ' ad-rm-lotes__asignado--falta'}", a: '' },
    { nombre: 'amarillo también cuando suman', de: "${a.falta === 0 ? '' : ' ad-rm-lotes__asignado--falta'}", a: ' ad-rm-lotes__asignado--falta' },
    { nombre: 'agregar lote no agrega', de: '      r.lotes = [...filasLotesRemito(r).map(l => ({ ...l })), { lote: \'\', cajas: null }]', a: '      r.lotes = filasLotesRemito(r).map(l => ({ ...l }))' },
    { nombre: 'quitar lote no quita', de: '      r.lotes = filasLotesRemito(r).filter((_, j) => j !== Number(k))', a: '      r.lotes = filasLotesRemito(r).map(l => ({ ...l }))' },
    { nombre: 'lo leído sin precargar los lotes', de: "        lotes: pres ? (Array.isArray(it?.lotes) ? it.lotes : []).map(l => ({ lote: String(l?.lote ?? ''), cajas: cajasLoteRemito(l) || null }))\n", a: '        lotes: pres ? []\n' },
    { nombre: 'el lote sin recortar', de: 'lote: normalizarLoteRemito(l.lote).slice(0, LARGO_LOTE_REMITO), cajas: cajasLoteRemito(l) }))', a: 'lote: normalizarLoteRemito(l.lote), cajas: cajasLoteRemito(l) }))' },
  ],
})
