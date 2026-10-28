// Los segundos de cada spec, anotados en la corrida de GitHub (28/10/2026).
//
// Solo en CI (lo suma playwright.config.js). Al terminar, escribe un AVISO
// (::notice) con "spec=segundos;…": los avisos de una corrida se leen sin
// credenciales (el log no), y `npm run tiempos:navegador`
// (pruebas/tiempos-navegador.js) los baja a e2e/tiempos-navegador.json, con el
// que mitades.js reparte las dos mitades.
//
// Un aviso de GitHub es corto: va de a pedazos de menos de LARGO caracteres,
// "tiempos-navegador 1/2", "2/2"…
const path = require('path')

const LARGO = 3000

// Map spec → segundos → los textos de los avisos.
function avisos(segundos, mitad = '') {
  const partes = [...segundos].sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([f, s]) => `${f.replace(/\.spec\.js$/, '')}=${Math.max(1, Math.round(s))}`)
  const pedazos = []
  let actual = ''
  for (const p of partes) {
    if (actual && actual.length + p.length + 1 > LARGO) { pedazos.push(actual); actual = '' }
    actual = actual ? `${actual};${p}` : p
  }
  if (actual) pedazos.push(actual)
  const sufijo = mitad ? ` mitad ${mitad}` : ''
  return pedazos.map((t, i) => `::notice title=tiempos-navegador${sufijo} ${i + 1}/${pedazos.length}::${t}`)
}

class ReporterTiempos {
  constructor() { this.segundos = new Map() }
  onTestEnd(test, result) {
    const f = path.basename(test.location.file)
    this.segundos.set(f, (this.segundos.get(f) || 0) + result.duration / 1000)
  }
  onEnd() {
    for (const linea of avisos(this.segundos, process.env.E2E_MITAD)) console.log(linea)
  }
  printsToStdio() { return false }
}

module.exports = ReporterTiempos
module.exports.avisos = avisos
module.exports.LARGO = LARGO
