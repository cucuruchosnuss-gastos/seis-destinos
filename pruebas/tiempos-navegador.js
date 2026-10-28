// Refresca e2e/tiempos-navegador.json con los segundos de la última corrida
// en verde del Navegador de GitHub (28/10/2026, ensayo-confiable).
//
//   npm run tiempos:navegador                    → la última en verde de main
//   npm run tiempos:navegador -- --rama ci-prueba/x   → la de esa rama
//   npm run tiempos:navegador -- --corrida 123456     → esa corrida
//   npm run tiempos:navegador -- --lista              → muestra, no escribe
//
// De dónde: e2e/reporter-tiempos.js deja en cada mitad un AVISO
// "tiempos-navegador …" con "spec=segundos;…". Los avisos de una corrida se
// leen sin credenciales con la API pública (el repo es público; el log no).
// Un spec que esa corrida no midió conserva lo que tenía; uno que ya no
// existe se va. Después de refrescar: commitear el .json (el reparto de las
// mitades sale de ahí, ver e2e/mitades.js).
'use strict'
const fs = require('fs')
const path = require('path')

const REPO = 'cucuruchosnuss-gastos/seis-destinos'
const API = `https://api.github.com/repos/${REPO}`
const ARCHIVO = path.join(__dirname, '..', 'e2e', 'tiempos-navegador.json')

// Los textos de los avisos → Map spec → segundos (de todas las mitades).
function leerAvisos(avisos) {
  const out = new Map()
  for (const a of avisos) {
    if (!/^tiempos-navegador\b/.test(a.title || '')) continue
    for (const par of String(a.message || '').split(';')) {
      const m = par.trim().match(/^(.+)=(\d+)$/)
      if (m) out.set(`${m[1]}.spec.js`, Number(m[2]))
    }
  }
  return out
}

// Lo viejo + lo medido, solo de los specs que existen, ordenado del más largo
// al más corto (así el .json se lee como la lista de los que pesan).
function combinar(viejos, medidos, specs) {
  const out = {}
  const existe = new Set(specs)
  const todos = new Map([...Object.entries(viejos)].filter(([s]) => existe.has(s)))
  for (const [s, seg] of medidos) if (existe.has(s)) todos.set(s, seg)
  for (const [s, seg] of [...todos].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))) out[s] = seg
  return out
}

async function pedir(url) {
  const r = await fetch(url, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'seis-destinos-tiempos' } })
  if (!r.ok) throw new Error(`GitHub respondió ${r.status} a ${url}`)
  return r.json()
}

async function main() {
  const args = process.argv.slice(2)
  const valor = (n) => { const i = args.indexOf(n); return i === -1 ? null : args[i + 1] }
  const rama = valor('--rama') || 'main'
  let corrida = valor('--corrida')
  if (!corrida) {
    const r = await pedir(`${API}/actions/workflows/navegador.yml/runs?branch=${encodeURIComponent(rama)}&status=success&per_page=1`)
    if (!r.workflow_runs?.length) { console.log(`No hay corridas en verde del Navegador en ${rama}.`); process.exit(1) }
    corrida = r.workflow_runs[0].id
  }
  const info = await pedir(`${API}/actions/runs/${corrida}`)
  const { jobs } = await pedir(`${API}/actions/runs/${corrida}/jobs?per_page=100`)
  const avisos = []
  for (const j of jobs) avisos.push(...await pedir(`${API}/check-runs/${j.id}/annotations?per_page=100`))
  const medidos = leerAvisos(avisos)
  if (!medidos.size) {
    console.log(`La corrida ${corrida} no tiene avisos "tiempos-navegador" (¿es de antes del 28/10/2026, cuando se sumó e2e/reporter-tiempos.js?).`)
    process.exit(1)
  }
  const { listarSpecs } = require('../e2e/mitades')
  const viejo = JSON.parse(fs.readFileSync(ARCHIVO, 'utf8'))
  const segundos = combinar(viejo.segundos, medidos, listarSpecs())
  const fecha = (info.created_at || '').slice(0, 10).split('-').reverse().join('/')
  const nuevo = { fuente: `corrida ${corrida} de ${info.head_branch} (${fecha}, ${String(info.head_sha).slice(0, 7)}); se refresca con npm run tiempos:navegador`, segundos }
  console.log(`Corrida ${corrida} (${info.head_branch}, ${fecha}): ${medidos.size} specs medidos.`)
  for (const [s, seg] of Object.entries(segundos)) {
    const antes = viejo.segundos[s]
    if (antes !== seg) console.log(`  ${s.padEnd(42)} ${antes ?? '—'} → ${seg}`)
  }
  if (args.includes('--lista')) return
  fs.writeFileSync(ARCHIVO, JSON.stringify(nuevo, null, 2) + '\n')
  console.log(`Escrito ${path.relative(process.cwd(), ARCHIVO)}: falta commitearlo.`)
}

if (require.main === module) main().catch(e => { console.error(e.message); process.exit(1) })

module.exports = { leerAvisos, combinar }
