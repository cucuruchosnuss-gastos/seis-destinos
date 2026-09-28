// Suite de imports.js y del ruteo de mutaciones de mutar.js (28/09/2026).
//
// Lo que se afirma: mudar código de un HTML a js/ no obliga a tocar ninguna
// prueba. extraerFn / extraerConst lo buscan en lo que el texto importa, cada
// archivo de js/ se reemplaza por su variable (y el alias viejo sigue), y el
// runner de mutaciones manda cada mutación al archivo donde está su código.
//
// La parte de punta a punta corre sobre una pantalla DE MENTIRA armada en una
// carpeta temporal (PRUEBAS_DIR_JS apunta su js/), así no depende de cómo esté
// hoy ningún módulo real.
'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFileSync } = require('child_process')

const RAIZ = path.join(__dirname, '..')
let ok = 0, mal = 0
function chk(nombre, cond, detalle = '') {
  if (cond) ok++
  else { mal++; console.log('  FALLA: ' + nombre + (detalle ? ' — ' + detalle : '')) }
}

// ── 1. Sobre el repo real ───────────────────────────────────────────────
{
  const { extraerFn, extraerConst } = require('./extraer')
  const imports = require('./imports')
  const dash = fs.readFileSync(path.join(RAIZ, 'dashboard.html'), 'utf8')
  chk('moduloVisible NO está en el dashboard (vive en js/modulos.js)', !/function moduloVisible\s*\(/.test(dash))
  let t = ''
  try { t = extraerFn(dash, 'moduloVisible') } catch (e) { t = 'ERROR ' + e.message }
  chk('extraerFn la encuentra por el import', /^function moduloVisible\(/.test(t), t.slice(0, 80))
  let c = ''
  try { c = extraerConst(dash, 'MODULOS') } catch (e) { c = 'ERROR ' + e.message }
  chk('extraerConst encuentra MODULOS por el import', c.startsWith('var MODULOS = '), c.slice(0, 60))
  let err = ''
  try { extraerFn(dash, 'estaFuncionNoExiste') } catch (e) { err = e.message }
  chk('lo que no está en ningún lado sigue diciendo NO EXISTE', /NO EXISTE la función estaFuncionNoExiste/.test(err))

  const imps = imports.importsDe("import {\n  a,\n  b,\n} from '../js/utils.js'\nimport { x } from 'https://cdn.jsdelivr.net/npm/y/+esm'\nimport './js/solo.js'\nimport { z } from '../js/utils.js'")
  chk('importsDe lee el import multilínea, el de efecto y no repite', JSON.stringify(imps) === JSON.stringify(['utils.js', 'solo.js']), JSON.stringify(imps))
  chk('importsDe ignora lo que viene de un CDN', !imps.some(n => n.includes('esm')))
  chk('variableDe', imports.variableDe('cobranzas-comun.js') === 'ARCHIVO_JS_COBRANZAS_COMUN')
  chk('alias viejo de modulos.js', imports.ALIAS['modulos.js'] === 'ARCHIVO_MODULOS')

  // Recursivo: la barra lateral importa modulos.js.
  let r = ''
  try { r = extraerFn("import { x } from '../js/barra-lateral.js'", 'agruparPendientes') } catch (e) { r = 'ERROR ' + e.message }
  chk('busca en lo que importa lo importado (recursivo)', /^function agruparPendientes\(/.test(r), r.slice(0, 60))

  // Reemplazo por variable, nueva y vieja, en un sub-proceso (las rutas se leen una vez por proceso).
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'imp-'))
  const copia = path.join(tmp, 'modulos.js')
  fs.writeFileSync(copia, fs.readFileSync(path.join(RAIZ, 'js', 'modulos.js'), 'utf8').replace('export function moduloVisible(', 'export function moduloVisible(/*MARCA*/'))
  const probar = (env) => execFileSync(process.execPath, ['-e', `const {extraerFn}=require(${JSON.stringify(path.join(__dirname, 'extraer'))});const d=require('fs').readFileSync(${JSON.stringify(path.join(RAIZ, 'dashboard.html'))},'utf8');process.stdout.write(extraerFn(d,'moduloVisible').includes('MARCA')?'SI':'NO')`], { encoding: 'utf8', env: { ...process.env, ARCHIVO_JS_MODULOS: '', ARCHIVO_MODULOS: '', ...env } })
  chk('ARCHIVO_JS_MODULOS reemplaza js/modulos.js', probar({ ARCHIVO_JS_MODULOS: copia }).endsWith('SI'))
  chk('el alias ARCHIVO_MODULOS sigue valiendo', probar({ ARCHIVO_MODULOS: copia }).endsWith('SI'))
  const inf = probar({ ARCHIVO_JS_MODULOS: copia })
  chk('informa lo que leyó ("ARCHIVO <ruta> (N bytes)")', inf.includes(`ARCHIVO ${copia} (${fs.readFileSync(copia, 'utf8').length} bytes)`))
  chk('sin variable lee el real', probar({}).endsWith('NO'))
}

// ── 2. El ruteo, sobre una pantalla de mentira ──────────────────────────
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'imp-rut-'))
  fs.mkdirSync(path.join(tmp, 'modulos')); fs.mkdirSync(path.join(tmp, 'js'))
  const HTML = path.join(tmp, 'modulos', 'pantalla.html')
  fs.writeFileSync(HTML, [
    '<!doctype html><html><body>',
    '  <script type="module">',
    "    import { pintar, esc } from '../js/pieza.js'",
    '    function local(x) {',
    '      return `<b>${esc(x)}</b>`',
    '    }',
    '  </script>',
    '</body></html>', ''].join('\n'))
  fs.writeFileSync(path.join(tmp, 'js', 'pieza.js'), [
    'export function esc(t) {',
    "  return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')",
    '}',
    'export function pintar(x) {',
    '  return `<i>${esc(x)}</i>`',
    '}', ''].join('\n'))
  const SUITE = path.join(tmp, 'suite.js')
  fs.writeFileSync(SUITE, [
    "const fs = require('fs')",
    `const { extraerFn } = require(${JSON.stringify(path.join(__dirname, 'extraer'))})`,
    `const ruta = process.env.ARCHIVO_TEST || ${JSON.stringify(HTML)}`,
    "const html = fs.readFileSync(ruta, 'utf8')",
    "console.log(`ARCHIVO ${ruta} (${html.length} bytes)`)",
    "const cod = ['esc', 'pintar', 'local'].map(f => extraerFn(html, f)).join('\\n') + '\\nreturn { pintar, local }'",
    "const { pintar, local } = new Function(cod)()",
    "const malo = '<img>'",
    "const bien = !pintar(malo).includes('<img') && !local(malo).includes('<img')",
    "console.log(bien ? '1/1 verde' : '0/1 ROJO')",
    'process.exit(bien ? 0 : 1)', ''].join('\n'))

  const env = { ...process.env, PRUEBAS_DIR_JS: path.join(tmp, 'js') }
  const salida = execFileSync(process.execPath, ['-e', `
    const { planificarMutaciones, correrMutaciones } = require(${JSON.stringify(path.join(__dirname, 'mutar'))})
    const opts = { suite: ${JSON.stringify(SUITE)}, original: ${JSON.stringify(HTML)}, funciones: ['local', 'pintar'],
      manuales: [{ nombre: 'esc deja pasar <', de: "    .replace(/</g, '&lt;')".trim(), a: ".replace(/</g, '<')" }] }
    const plan = planificarMutaciones(opts)
    console.log('PLAN ' + JSON.stringify(plan.map(t => ({ archivo: require('path').basename(t.original), variable: t.variable, funciones: t.funciones, manuales: t.manuales.map(m => m.nombre) }))))
    const r = correrMutaciones({ ...opts, salir: false })
    console.log('RES ' + JSON.stringify(r))
    const soloHtml = planificarMutaciones({ ...opts, funciones: ['local'], manuales: [] })
    console.log('SOLOHTML ' + JSON.stringify(soloHtml))
  `], { encoding: 'utf8', env })
  const plan = JSON.parse((salida.match(/^PLAN (.*)$/m) || [])[1] || '[]')
  const res = JSON.parse((salida.match(/^RES (.*)$/m) || [])[1] || '{}')
  chk('dos tandas: el HTML y js/pieza.js', plan.length === 2, JSON.stringify(plan))
  chk('lo del HTML se queda en el HTML, por ARCHIVO_TEST', plan[0]?.archivo === 'pantalla.html' && plan[0]?.variable === 'ARCHIVO_TEST' && JSON.stringify(plan[0]?.funciones) === '["local"]')
  chk('la función mudada va a js/pieza.js, por ARCHIVO_JS_PIEZA', plan[1]?.archivo === 'pieza.js' && plan[1]?.variable === 'ARCHIVO_JS_PIEZA')
  chk('la función de js/ genera su mutación de escape', (plan[1]?.manuales || []).some(n => /^pintar: sin esc\(\)/.test(n)), JSON.stringify(plan[1]?.manuales))
  chk('la mutación a mano va al archivo donde está su texto', (plan[1]?.manuales || []).includes('esc deja pasar <'))
  chk('las tres mutaciones se DETECTAN (el sub-proceso leyó cada copia mutada)', res.detectadas === 3 && res.total === 3 && res.fallas === 0, JSON.stringify(res) + '\n' + salida)
  chk('sin nada mudado, el plan es null (el runner hace lo de antes)', /^SOLOHTML null$/m.test(salida))
}

// ── 3. Sangría ─────────────────────────────────────────────────────────
{
  const { variantesSinSangria } = require('./mutar')
  chk('variantesSinSangria saca 4 espacios', variantesSinSangria('    a\n    b').includes('a\nb'))
}

console.log(`${ok}/${ok + mal} ${mal ? 'ROJO' : 'verde'}`)
process.exit(mal ? 1 : 0)
