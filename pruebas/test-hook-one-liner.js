// El hook que rechaza los one-liners que editan archivos (28/09/2026):
// .claude/hooks/sin-one-liners-de-edicion.js, registrado en .claude/settings.json.
// Se prueba el script DE VERDAD, pasándole por stdin el JSON que manda
// Claude Code, y que settings.json lo registre para Bash y PowerShell.
'use strict'

const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const RAIZ = path.join(__dirname, '..')
const HOOK = process.env.ARCHIVO_TEST || path.join(RAIZ, '.claude', 'hooks', 'sin-one-liners-de-edicion.js')
console.log(`ARCHIVO ${HOOK} (${fs.readFileSync(HOOK, 'utf8').length} bytes)`)

let ok = 0, mal = 0
function chk(nombre, cond, det = '') { if (cond) ok++; else { mal++; console.log('  FALLA: ' + nombre + (det ? ' — ' + det : '')) } }

function correr(entrada) {
  const r = spawnSync(process.execPath, [HOOK], { input: entrada, encoding: 'utf8' })
  return { codigo: r.status, err: r.stderr }
}
const bash = (command) => correr(JSON.stringify({ tool_name: 'Bash', tool_input: { command } }))

const BLOQUEA = [
  ['node -e con writeFileSync', `node -e "const fs=require('fs');fs.writeFileSync('a.html', s.replace('x','y'))"`],
  ['node --eval con appendFileSync', `node --eval "require('fs').appendFileSync('CLAUDE.md','\\nhola')"`],
  ['python -c con open w', `python -c "open('x.html','w').write(t)"`],
  ['python3 -c con write_text', `python3 -c "from pathlib import Path; Path('a').write_text('b')"`],
  ['node -p con renameSync', `node -p "require('fs').renameSync('a','b')"`],
  ['node.exe -e después de un cd', `cd x && node.exe -e "fs.writeFileSync(f, s)"`],
  ['py -c con os.remove', `py -c "import os; os.remove('a')"`],
]
const DEJA = [
  ['node -e de solo lectura', `node -e "console.log(require('fs').readFileSync('a','utf8').length)"`],
  ['python -c que cuenta CR', `python -c "print(open('a','rb').read().count(bytes([13])))"`],
  ['node con un archivo', `node pruebas/correr-todo.js`],
  ['un script de edición en archivo', `node "C:/scratch/editar-x.js"`],
  ['git con writeFileSync en el mensaje', `git commit -m "saca writeFileSync del hook"`],
  ['sin comando', ''],
]
for (const [n, c] of BLOQUEA) {
  const r = bash(c)
  chk('bloquea: ' + n, r.codigo === 2, `código ${r.codigo}`)
  chk('el mensaje remite a editar-archivos: ' + n, /editar-archivos/.test(r.err))
}
for (const [n, c] of DEJA) chk('deja pasar: ' + n, bash(c).codigo === 0)

// PowerShell manda el mismo campo command.
chk('bloquea también desde PowerShell', correr(JSON.stringify({ tool_name: 'PowerShell', tool_input: { command: `node -e "fs.writeFileSync('a','b')"` } })).codigo === 2)
// Una entrada que no entiende no traba la sesión.
chk('entrada rota: deja pasar', correr('no es json').codigo === 0)
chk('sin tool_input: deja pasar', correr('{}').codigo === 0)

// settings.json lo registra.
const S = JSON.parse(fs.readFileSync(path.join(RAIZ, '.claude', 'settings.json'), 'utf8'))
const pre = S?.hooks?.PreToolUse || []
const entrada = pre.find(h => (h.hooks || []).some(x => /sin-one-liners-de-edicion\.js/.test(x.command)))
chk('settings.json registra el hook en PreToolUse', !!entrada)
chk('para Bash y para PowerShell', !!entrada && /Bash/.test(entrada.matcher) && /PowerShell/.test(entrada.matcher), entrada?.matcher)

console.log(`${ok}/${ok + mal} ${mal ? 'ROJO' : 'verde'}`)
process.exit(mal ? 1 : 0)
