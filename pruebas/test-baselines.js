// Todo commit de referencia (baseline) de las pruebas tiene que existir y
// estar en la historia de main (30/09/2026).
//
// Caso real: un subagente rebasó su rama y una suite nueva quedó comparando
// contra su commit de ANTES del rebase (2b35240). En la compu andaba (el
// commit existe en el repo local) y en GitHub "Pruebas" dio rojo, porque
// allá ese commit no existe. Esta prueba lo dice antes de subir: busca los
// hashes en los renglones que hablan de un baseline (BASE, BASES, git show,
// baseline) y exige que cada uno sea un antepasado de HEAD.

const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const RAIZ = path.join(__dirname, '..')
let ok = 0, mal = 0
const chk = (nombre, cond, detalle) => {
  if (cond) ok++
  else { mal++; console.log('FALLA:', nombre, detalle ?? '') }
}

// Sin consola de por medio: en Windows el "^" de "h^{commit}" lo come cmd.
const git = (...args) => {
  try { execFileSync('git', args, { cwd: RAIZ, stdio: 'ignore' }); return true } catch { return false }
}

const RENGLON_BASELINE = /BASE|git show|baseline/i
const HASH = /['"`]([0-9a-f]{7,40})['"`]/g

const hashes = new Map()
for (const archivo of fs.readdirSync(__dirname).filter(f => f.endsWith('.js')).sort()) {
  if (archivo === 'test-baselines.js') continue
  const lineas = fs.readFileSync(path.join(__dirname, archivo), 'utf8').split('\n')
  lineas.forEach((l, i) => {
    if (!RENGLON_BASELINE.test(l)) return
    for (const m of l.matchAll(HASH)) {
      const h = m[1]
      // Solo dígitos es un número de cheque o de cuenta, no un commit.
      if (!/[a-f]/.test(h)) continue
      if (!hashes.has(h)) hashes.set(h, [])
      hashes.get(h).push(`${archivo}:${i + 1}`)
    }
  })
}

chk('se encontraron baselines para revisar (si no, la búsqueda no está mirando nada)', hashes.size >= 10, hashes.size)

for (const [h, donde] of hashes) {
  const existe = git('cat-file', '-e', `${h}^{commit}`)
  chk(`el baseline ${h} existe en el repo`, existe, donde.join(', '))
  if (existe) chk(`el baseline ${h} está en la historia de main (no es de una rama rebasada)`, git('merge-base', '--is-ancestor', h, 'HEAD'), donde.join(', '))
}

console.log(`${ok}/${ok + mal}  ${mal ? 'ROJO' : 'verde'}`)
process.exit(mal ? 1 : 0)
