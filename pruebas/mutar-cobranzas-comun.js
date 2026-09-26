// Mutaciones sobre js/cobranzas-comun.js, para las suites de Cobranzas.
//
// Desde el 22/09/2026 los helpers que Cobranzas comparte con Cheques
// (dvBcra, formatearImporte, las fechas, nombreBancoDe, textoSalidaCheque…)
// viven en js/cobranzas-comun.js y ya no en modulos/cobranzas.html. mutar.js
// muta el HTML; esto muta el archivo común y le pasa la copia mutada a la
// suite por ARCHIVO_COMUN, que es la variable que lee pruebas/fuente-cobranzas.js.
//
// Los MISMOS tres guards de mutar.js, por los mismos bugs documentados:
//  - Si la suite NO está verde con el común limpio, no se muta nada.
//  - Cada mutación necesita un ancla ÚNICA en el común; si no, aborta.
//  - Una mutación que no cambia nada es un error del test; y la suite tiene
//    que INFORMAR cuántos bytes leyó del común ("COMUN <ruta> (N bytes)"),
//    para confirmar que leyó el mutado y no el limpio.
//
// Corre DE A UNA. No termina el proceso si todo sale bien: devuelve el
// resultado para que el mut-*.js siga con las mutaciones del HTML.

const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { RUTA_COMUN } = require('./fuente-cobranzas')

function correrMutacionesComun({ suite, manuales }) {
  const src = fs.readFileSync(RUTA_COMUN, 'utf8')
  const TMP = path.join(__dirname, `mut-tmp-comun-${path.basename(suite, '.js')}.js`)

  function correr(archivoComun) {
    const env = { ...process.env }
    if (archivoComun) env.ARCHIVO_COMUN = archivoComun
    else delete env.ARCHIVO_COMUN
    try {
      return { rojo: false, salida: execFileSync(process.execPath, [suite], { encoding: 'utf8', env, stdio: ['ignore', 'pipe', 'pipe'] }) }
    } catch (err) {
      return { rojo: true, salida: (err.stdout || '') + (err.stderr || '') }
    }
  }

  const limpio = correr(null)
  if (limpio.rojo) {
    console.log('ABORTADO (común): la suite NO está verde con el común limpio.')
    console.log(limpio.salida)
    process.exit(2)
  }
  const unica = (aguja) => src.split(aguja).length === 2
  const ambiguas = manuales.filter(m => !unica(m.de)).map(m => `«${m.nombre}»: el texto a reemplazar ${src.includes(m.de) ? 'NO ES ÚNICO' : 'NO EXISTE'} en ${RUTA_COMUN}`)
  if (ambiguas.length) {
    console.log('ABORTADO (común): mutaciones sin ancla única:')
    for (const a of ambiguas) console.log('  ' + a)
    process.exit(2)
  }

  let detectadas = 0
  const escaparon = [], errores = []
  for (const m of manuales) {
    const mutado = src.replace(m.de, () => m.a)   // con función: "$'", "$&" y "$$" no se expanden
    if (mutado === src) { errores.push(`${m.nombre}: la mutación no cambió nada`); continue }
    fs.writeFileSync(TMP, mutado)
    const r = correr(TMP)
    const leido = (r.salida.match(/COMUN .* \((\d+) bytes\)/) || [])[1]
    if (Number(leido) !== mutado.length) { errores.push(`${m.nombre}: la suite leyó ${leido} bytes del común y se escribieron ${mutado.length}`); continue }
    if (r.rojo) detectadas++
    else escaparon.push(m.nombre)
  }
  try { fs.unlinkSync(TMP) } catch { /* no estaba */ }

  for (const e of escaparon) console.log('  ESCAPÓ (común): ' + e)
  for (const e of errores) console.log('  ERROR DEL TEST (común): ' + e)
  const total = manuales.length - errores.length
  console.log(`común: ${detectadas}/${total} mutaciones detectadas`)
  if (escaparon.length || errores.length) process.exit(1)
  return { detectadas, total }
}

// Lo que cada suite imprime para que el runner confirme qué común leyó.
function informarComun() {
  console.log(`COMUN ${RUTA_COMUN} (${fs.readFileSync(RUTA_COMUN, 'utf8').length} bytes)`)
}

module.exports = { correrMutacionesComun, informarComun }
