// Las anclas de TODAS las mutaciones, en segundos (25/10/2026).
//
//   node pruebas/test-anclas-mutaciones.js
//
// Cada mut-*.js que usa el runner de mutar.js (directo, o por mutar-produccion /
// mutar-dashboard) se corre con MUT_SOLO_ANCLAS=1: arma sus mutaciones sin
// correr nada y aborta si el texto de una mutación a mano ya no existe o no es
// único, o si falta una función. Así el ancla que dejó vieja un cambio aparece
// en `npm run pruebas`, con la línea más parecida, y no al final de un runner de
// 10 minutos (lo pidieron las dos tareas de la Tanda C del 24/10/2026).
//
// No se revisan (se nombran al final): las mut-*.js con runner propio y las que
// corren algo antes de mutar (un git show y la suite sobre el archivo viejo):
// en este modo igual lo correrían.

'use strict'
const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawn } = require('child_process')

const DIR = __dirname
const RAIZ = path.join(DIR, '..')
const TOPE_MS = 120000

// Las que ya tenían un ancla rota cuando nació esta prueba (25/10/2026: rotas
// igual en d2d1dc1 y en 7f5d1cd; hoy esos runners abortan sin mutar nada).
// La lista SOLO se achica: la que se arregla se saca de acá (si se arregla y
// sigue en la lista, la prueba da rojo), y una rota que no está da rojo.
const YA_ROTAS = new Set([
  'mut-administracion-cuenta-a-orden.js', 'mut-administracion-prestamos.js', 'mut-administracion-seguridad.js',
  'mut-caja-ingreso-externo.js', 'mut-cheques-barra-unidad.js', 'mut-cheques-celular.js',
  'mut-cheques-vista.js', 'mut-conos-todos.js', 'mut-cuenta-unica.js', 'mut-cuentas-corrientes-nota-credito.js',
  'mut-cuentas-corrientes-pago-mixto.js', 'mut-cuentas-corrientes-saldo-inicial.js', 'mut-dashboard-pendientes.js',
  'mut-embeds-ambiguos.js', 'mut-permisos-pantallas-stock.js', 'mut-produccion-acceso.js', 'mut-produccion-cierre.js',
  'mut-produccion-color-caja.js', 'mut-produccion-color.js', 'mut-produccion-pantallas.js', 'mut-produccion-pin.js',
  'mut-produccion-sesion.js', 'mut-produccion-sin-empaque.js', 'mut-produccion-tablet.js', 'mut-stock-fabrica-pruebas.js',
])

const todas = fs.readdirSync(DIR).filter(f => /^mut-.*\.js$/.test(f)).sort()
const revisar = [], saltear = []
for (const f of todas) {
  const t = fs.readFileSync(path.join(DIR, f), 'utf8')
  const usaRunner = /require\('\.\/mutar(-produccion|-dashboard)?'\)/.test(t)
  const correAlgo = /\b(execFileSync|execSync|spawnSync|spawn|execFile)\s*\(/.test(t)
  if (usaRunner && !correAlgo) revisar.push(f)
  else saltear.push(f + (usaRunner ? ' (corre algo antes de mutar)' : ' (runner propio)'))
}

function uno(f) {
  return new Promise(resolve => {
    const env = { ...process.env, MUT_SOLO_ANCLAS: '1' }
    delete env.ARCHIVO_TEST
    const p = spawn(process.execPath, [path.join(DIR, f)], { cwd: RAIZ, env, stdio: ['ignore', 'pipe', 'pipe'] })
    let salida = ''
    p.stdout.on('data', d => { salida += d })
    p.stderr.on('data', d => { salida += d })
    let tope = false
    const reloj = setTimeout(() => { tope = true; salida += '\n(TOPE: no terminó en ' + TOPE_MS / 1000 + ' s: ¿corre las mutaciones igual?)'; p.kill() }, TOPE_MS)
    p.on('close', codigo => {
      clearTimeout(reloj)
      // En este modo nada se corre: cada archivo dice ANCLAS OK y nadie aborta
      // (el código de salida no alcanza: un mut-*.js que suma sus tandas a mano
      // sale con 1 porque en este modo no hay nada "detectado").
      const ok = !tope && codigo !== 2 && /ANCLAS OK/.test(salida) && !/ABORTADO/.test(salida)
      resolve({ f, ok, salida })
    })
  })
}

async function main() {
  const resultados = []
  const cola = [...revisar]
  const enParalelo = Math.max(2, Math.min(8, os.cpus().length - 1))
  await Promise.all(Array.from({ length: enParalelo }, async () => {
    while (cola.length) resultados.push(await uno(cola.shift()))
  }))
  resultados.sort((a, b) => a.f.localeCompare(b.f))
  const nuevas = resultados.filter(r => !r.ok && !YA_ROTAS.has(r.f))
  const arregladas = resultados.filter(r => r.ok && YA_ROTAS.has(r.f))
  const viejas = resultados.filter(r => !r.ok && YA_ROTAS.has(r.f))
  for (const r of nuevas) {
    console.log(`ROTA ${r.f}`)
    console.log(r.salida.trim().split('\n').filter(l => !/^Suite sobre el limpio/.test(l)).slice(-25).map(l => '     | ' + l).join('\n'))
  }
  for (const r of arregladas) console.log(`ARREGLADA ${r.f}: sacala de YA_ROTAS en ${path.basename(__filename)}`)
  const avisos = resultados.flatMap(r => r.salida.split('\n').filter(l => l.includes('AVISO:')).map(l => `${r.f}: ${l.trim()}`))
  for (const a of avisos) console.log('aviso ' + a)
  if (saltear.length) console.log(`No se revisan ${saltear.length}: ${saltear.join(', ')}`)
  if (viejas.length) console.log(`Siguen rotas de antes ${viejas.length} (YA_ROTAS; con MUT_SOLO_ANCLAS=1 node pruebas/<archivo> se ve cuál ancla)`)
  const mal = nuevas.length + arregladas.length
  console.log(`${resultados.length - viejas.length - nuevas.length}/${resultados.length - viejas.length} mut-*.js con todas sus anclas` +
    `${mal ? ` — ROJO: ${nuevas.length} rotas nuevas, ${arregladas.length} arregladas sin sacar de la lista` : ''}` +
    `${avisos.length ? ` (${avisos.length} avisos de equivalencias viejas)` : ''}`)
  process.exit(mal ? 1 : 0)
}

main()
