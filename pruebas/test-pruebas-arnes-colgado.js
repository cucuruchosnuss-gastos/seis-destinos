// EL ARNÉS DE LAS SUITES (arnes() de pruebas/circuito-comun.js): una suite
// colgada es ROJO (21/10/2026).
//
// Si una rama async espera una promesa que nunca se resuelve, node se queda
// sin trabajo y sale con código 0 SIN imprimir el resultado: la suite parecía
// verde y el runner de mutaciones contaba "escapó" sin que se hubiera
// afirmado nada. Esta suite corre suites chiquitas en otro proceso y fija:
//  - lo de siempre: todo bien → 0 y "verde"; un chk falso o una rama que
//    tira → 1 y "ROJO";
//  - una rama colgada → 1 y "ROJO", nombrando el motivo, aunque los chk que
//    sí corrieron estén bien;
//  - una suite que nunca llama a fin() → 1 y "ROJO".
//
//   node pruebas/test-pruebas-arnes-colgado.js

const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawnSync } = require('child_process')
const { arnes } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, 'circuito-comun.js')
console.log(`ARCHIVO ${ARCHIVO} (${fs.readFileSync(ARCHIVO, 'utf8').length} bytes)`)
const { chk, fin } = arnes()

const DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'arnes-'))
function correr(nombre, cuerpo) {
  const archivo = path.join(DIR, nombre + '.js')
  fs.writeFileSync(archivo, `const { arnes } = require(${JSON.stringify(ARCHIVO)})\nconst { chk, esperas, fin } = arnes()\n${cuerpo}\n`)
  const r = spawnSync(process.execPath, [archivo], { encoding: 'utf8', timeout: 30000 })
  return { codigo: r.status, salida: (r.stdout || '') + (r.stderr || '') }
}

{
  const r = correr('bien', "chk('uno', true)\nesperas.push(Promise.resolve().then(() => chk('dos', true)))\nfin()")
  chk('todo bien: sale con 0', r.codigo === 0, r.salida)
  chk('todo bien: "2/2  verde"', /^2\/2  verde$/m.test(r.salida), r.salida)
}
{
  const r = correr('chk-falso', "chk('uno', true)\nchk('dos', false)\nfin()")
  chk('un chk falso: sale con 1 y dice ROJO', r.codigo === 1 && /1\/2  ROJO/.test(r.salida) && /✗ dos/.test(r.salida), r.salida)
}
{
  const r = correr('rama-tira', "esperas.push(Promise.reject(new Error('se rompió')))\nfin()")
  chk('una rama que tira: sale con 1', r.codigo === 1 && /rama async sin excepción/.test(r.salida) && /ROJO/.test(r.salida), r.salida)
}
{
  const r = correr('colgada', "chk('uno', true)\nesperas.push(new Promise(() => {}).then(() => chk('nunca', true)))\nfin()")
  chk('una rama colgada: sale con 1 (antes salía con 0)', r.codigo === 1, `código ${r.codigo}: ${r.salida}`)
  chk('una rama colgada: dice ROJO con el total', /1\/2  ROJO/.test(r.salida), r.salida)
  chk('una rama colgada: nombra el motivo', /quedó colgada/.test(r.salida), r.salida)
}
{
  // El caso real: dos llamadas, y el doble de la base guarda solo la ÚLTIMA
  // respuesta: la primera queda esperando para siempre.
  const r = correr('doble-toque', [
    'let soltar',
    'const rpc = () => new Promise(r => { soltar = r })',
    'const p1 = rpc()',
    'const p2 = rpc()',
    'soltar()',
    "esperas.push(Promise.all([p1, p2]).then(() => chk('una sola llamada', true)))",
    'fin()',
  ].join('\n'))
  chk('el doble toque que retiene una sola respuesta: ROJO', r.codigo === 1 && /ROJO/.test(r.salida), `código ${r.codigo}: ${r.salida}`)
}
{
  const r = correr('sin-fin', "chk('uno', true)")
  chk('una suite que no llama a fin(): sale con 1', r.codigo === 1 && /se llamó a fin\(\)/.test(r.salida) && /ROJO/.test(r.salida), `código ${r.codigo}: ${r.salida}`)
}
{
  const r = correr('fin-tarde', "setTimeout(() => { chk('después', true); fin() }, 50)")
  chk('fin() después de un timer: verde (no se corta antes)', r.codigo === 0 && /^1\/1  verde$/m.test(r.salida), r.salida)
}

fs.rmSync(DIR, { recursive: true, force: true })
fin()
