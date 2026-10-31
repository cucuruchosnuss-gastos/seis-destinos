// Mutaciones de test-cobranzas-arreglos-30-10.js (arreglos de la auditoría
// del 30/10/2026, puntos 3 y 5a, en modulos/cobranzas.html). Ver mutar.js.
//
// Antes de mutar, el BASELINE: sobre el código de antes del cambio
// (git show 1c20f98:modulos/cobranzas.html, el origin/main del que salió la
// rama; commit FIJO, nunca HEAD) la suite tiene que dar ROJO.
//
//   node pruebas/mut-cobranzas-arreglos-30-10.js
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { correrMutaciones } = require('./mutar')

const SUITE = path.join(__dirname, 'test-cobranzas-arreglos-30-10.js')
const BASE_ANTES = '1c20f98'
if (process.env.MUT_SOLO_ANCLAS !== '1') {
  const tmp = path.join(__dirname, 'mut-tmp-arreglos-30-10-cob-antes.html')
  let antes = null
  try {
    antes = execFileSync('git', ['show', `${BASE_ANTES}:modulos/cobranzas.html`], { encoding: 'utf8', cwd: path.join(__dirname, '..'), maxBuffer: 64 * 1024 * 1024 })
  } catch {
    console.log(`(sin el historial de git: no se corre el baseline ${BASE_ANTES})`)
  }
  if (antes !== null) {
    fs.writeFileSync(tmp, antes)
    let rojo = false
    let salida = ''
    try {
      salida = execFileSync(process.execPath, [SUITE], { encoding: 'utf8', env: { ...process.env, ARCHIVO_TEST: tmp }, stdio: ['ignore', 'pipe', 'pipe'] })
    } catch (err) { rojo = true; salida = String(err.stdout || '') }
    fs.unlinkSync(tmp)
    console.log(`Baseline ${BASE_ANTES} (antes del cambio): ${salida.trim().split('\n').pop()}`)
    if (!rojo) { console.log('ABORTADO: la suite da VERDE sobre el código de antes del cambio: no lo está probando.'); process.exit(2) }
  }
}

correrMutaciones({
  suite: SUITE,
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/cobranzas.html'),
  // Las dos funciones nuevas no pintan HTML: no hay escapes que sacar.
  funciones: [],
  manuales: [
    // Punto 3: p_cobranza_id
    { nombre: 'p_cobranza_id solo en una edición (lo de antes)', de: '      return f?.id || null\n', a: "      return f?.modo === 'edicion' ? f.id : null\n" },
    { nombre: 'p_cobranza_id siempre null', de: '      return f?.id || null\n', a: '      return null\n' },
    { nombre: 'p_cobranza_id undefined sin id', de: '      return f?.id || null\n', a: '      return f?.id\n' },
    { nombre: 'la llamada no usa el id del formulario', de: 'p_cobranza_id: idParaRevisarRepetidos(f) })', a: 'p_cobranza_id: null })' },
    { nombre: 'la llamada vuelve a depender del modo', de: 'p_cobranza_id: idParaRevisarRepetidos(f) })', a: "p_cobranza_id: f.modo === 'edicion' ? f.id : null })" },
    // Punto 5a: los medios sin cobro no cuentan
    { nombre: 'itemsDeAplicacion vuelve a recorrer todos los medios', de: '        for (const m of mediosConCobro(f)) for (const d of docs) {', a: '        for (const m of MEDIOS_APLICAR) for (const d of docs) {' },
    { nombre: 'mediosConCobro devuelve todos', de: '      return MEDIOS_APLICAR.filter(m => centavosAplicar(cobrado[m]) > 0)', a: '      return MEDIOS_APLICAR' },
    { nombre: 'mediosConCobro acepta cero', de: '      return MEDIOS_APLICAR.filter(m => centavosAplicar(cobrado[m]) > 0)', a: '      return MEDIOS_APLICAR.filter(m => centavosAplicar(cobrado[m]) >= 0)' },
    { nombre: 'mediosConCobro mira el total y no el medio', de: '      return MEDIOS_APLICAR.filter(m => centavosAplicar(cobrado[m]) > 0)', a: '      return MEDIOS_APLICAR.filter(m => centavosAplicar(cobrado.cheque + cobrado.transferencia + cobrado.efectivo) > 0)' },
    { nombre: 'mediosConCobro saca los que SÍ se cobraron', de: '      return MEDIOS_APLICAR.filter(m => centavosAplicar(cobrado[m]) > 0)', a: '      return MEDIOS_APLICAR.filter(m => !(centavosAplicar(cobrado[m]) > 0))' },
    { nombre: 'mediosConCobro limpia lo escrito al ocultar (no se conserva)', de: '      const cobrado = cobradoPorMedio(f)\n      return MEDIOS_APLICAR', a: '      const cobrado = cobradoPorMedio(f)\n      for (const m of MEDIOS_APLICAR) if (!(centavosAplicar(cobrado[m]) > 0) && f?.aplicacion?.medios?.[m]) f.aplicacion.medios[m].montos = {}\n      return MEDIOS_APLICAR' },
  ],
})
