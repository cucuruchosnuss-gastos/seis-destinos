// Recorre la planta en la maqueta y deja una captura y la medición de cada
// pantalla (28/09/2026, la tablet real). Es la herramienta para MIRAR mientras
// se ajusta el CSS; la prueba que corre en cada push es 8-planta-tamanos.spec.js,
// que usa estos mismos pasos.
//
//   node e2e/maqueta/servir.js 4180   (en otra terminal)
//   node e2e/recorrer-planta.js [carpeta] [ancho×alto ...]
//
// Sin tamaños, recorre 1000×540, 600×940 y 1280×800.
const path = require('path')
const fs = require('fs')
const { chromium } = require('@playwright/test')
const { medirPantalla } = require('./medir-pantalla')
const { PASOS_PLANTA } = require('./pasos-planta')

async function recorrer(page, base, carpeta, etiqueta) {
  const salida = []
  for (const [nombre, fn, medir = true] of PASOS_PLANTA) {
    try {
      await fn(page)
    } catch (err) {
      salida.push({ nombre, error: String(err.message).split('\n')[0] })
      await page.screenshot({ path: path.join(carpeta, `${etiqueta}-${nombre}-ERROR.png`) })
      break
    }
    if (!medir) continue
    await page.waitForTimeout(150)
    const m = await page.evaluate(`(${medirPantalla.toString()})()`)
    await page.screenshot({ path: path.join(carpeta, `${etiqueta}-${nombre}.png`) })
    salida.push({ nombre, scroll: m.scroll ? `${m.altoDoc} en ${m.alto}` : '', scrollX: m.scrollX, afuera: m.afuera, cortadas: m.cortadas, lote: m.lote })
  }
  return salida
}

async function main() {
  const carpeta = process.argv[2] || path.join(__dirname, 'resultados', 'recorrido-planta')
  const tamanos = (process.argv.slice(3).length ? process.argv.slice(3) : ['1000x540', '600x940', '1280x800']).map(t => t.split('x').map(Number))
  fs.mkdirSync(carpeta, { recursive: true })
  const nav = await chromium.launch()
  for (const [ancho, alto] of tamanos) {
    const page = await nav.newPage({ viewport: { width: ancho, height: alto }, locale: 'es-AR', timezoneId: 'America/Argentina/Buenos_Aires' })
    page.setDefaultTimeout(4000)
    const errores = []
    page.on('pageerror', e => errores.push(e.message))
    await page.goto(`http://localhost:${process.env.PUERTO_MAQUETA || 4180}/modulos/produccion.html?maqueta=produccion`, { timeout: 60000, waitUntil: 'domcontentloaded' })
    const r = await recorrer(page, 'http://localhost:4180', carpeta, `${ancho}x${alto}`)
    console.log(`\n══ ${ancho}×${alto}`)
    for (const x of r) {
      const mal = x.error || x.scroll || x.scrollX || x.afuera?.length || x.cortadas?.length || x.lote?.length
      console.log(`${mal ? '✗' : '✓'} ${x.nombre}${x.error ? ' ERROR ' + x.error : ''}${x.scroll ? ' SCROLL ' + x.scroll : ''}${x.scrollX ? ' SCROLL-X' : ''}`)
      for (const a of x.afuera ?? []) console.log('    afuera: ' + a)
      for (const c of (x.cortadas ?? []).slice(0, 8)) console.log('    cortada: ' + c)
      for (const l of x.lote ?? []) console.log('    lote: ' + l)
    }
    if (errores.length) console.log('ERRORES JS: ' + errores.join(' | '))
    await page.close()
  }
  await nav.close()
}

main().catch(e => { console.error(e); process.exit(1) })
