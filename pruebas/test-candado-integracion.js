// El candado de integración (candado.js, npm run candado): quién lo tiene, y
// tomarlo / renovarlo / esperar / soltarlo contra un "GitHub" de juguete (un
// repo vacío en una carpeta temporal) con dos sesiones. 28/10/2026.
//
//   node pruebas/test-candado-integracion.js

const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawn, spawnSync } = require('child_process')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, 'candado.js')
console.log(`ARCHIVO ${ARCHIVO} (${fs.readFileSync(ARCHIVO, 'utf8').length} bytes)`)
// Node carga como JavaScript un archivo de extensión desconocida (el mut-tmp-*.html).
const { dueno, desdeDe, mensaje, nombreValido, VIGENCIA_MIN, PREFIJO } = require(ARCHIVO)

let ok = 0
const fallas = []
function chk(nombre, cond, detalle) {
  if (cond) ok++
  else { fallas.push(nombre); console.log(`  ✗ ${nombre}${detalle !== undefined ? ' — ' + detalle : ''}`) }
}

// ── Las piezas ───────────────────────────────────────────────────────────
const MIN = 60000
const T = Date.parse('2026-10-28T12:00:00Z')
chk('vence a los 90 minutos sin renovar', VIGENCIA_MIN === 90)
chk('la rama es integrando/<nombre>', PREFIJO === 'refs/heads/integrando/')
chk('sin candados, nadie lo tiene', dueno([], T) === null)
chk('uno vigente lo tiene', dueno([{ nombre: 'a', desde: T - 10 * MIN, fecha: T - 10 * MIN }], T)?.nombre === 'a')
chk('uno sin renovar hace 90 min o más ya no', dueno([{ nombre: 'a', desde: T - 90 * MIN, fecha: T - 90 * MIN }], T) === null)
chk('… pero renovado hace poco sí, aunque lo tenga desde hace 3 h', dueno([{ nombre: 'a', desde: T - 180 * MIN, fecha: T - 5 * MIN }], T)?.nombre === 'a')
const dos = [{ nombre: 'b', desde: T - 1 * MIN, fecha: T - 1 * MIN }, { nombre: 'a', desde: T - 2 * MIN, fecha: T - 2 * MIN }]
chk('dos a la vez: gana el que lo tiene desde antes', dueno(dos, T)?.nombre === 'a')
chk('… aunque el otro haya renovado después (cuenta desde cuándo, no la renovación)', dueno([{ nombre: 'a', desde: T - 30 * MIN, fecha: T }, { nombre: 'b', desde: T - 1 * MIN, fecha: T - 1 * MIN }], T)?.nombre === 'a')
chk('… y con empate, por nombre', dueno([{ nombre: 'z', desde: T, fecha: T }, { nombre: 'm', desde: T, fecha: T }], T)?.nombre === 'm')
chk('un abandonado más viejo no le gana a uno vigente', dueno([{ nombre: 'viejo', desde: T - 200 * MIN, fecha: T - 100 * MIN }, { nombre: 'b', desde: T, fecha: T }], T)?.nombre === 'b')
chk('el mensaje dice desde cuándo, y se lee de vuelta', desdeDe(mensaje('x', T), 0) === T, mensaje('x', T))
chk('un mensaje sin fecha usa la del commit', desdeDe('otra cosa', 123) === 123 && desdeDe('candado desde basura', 7) === 7)
chk('nombres válidos', nombreValido('ensayo-confiable') && nombreValido('tablet.v2_b'))
chk('… y no válidos (vacío, con barra, con espacio, con ..)', !nombreValido('') && !nombreValido('a/b') && !nombreValido('a b') && !nombreValido('-a') && !nombreValido(undefined))

// ── Con un GitHub de juguete y dos sesiones ──────────────────────────────
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'candado-'))
const script = path.join(tmp, 'candado.js')
fs.copyFileSync(ARCHIVO, script)
const g = (cwd, ...a) => spawnSync('git', a, { cwd, encoding: 'utf8' })
g(tmp, 'init', '-q', '--bare', 'github.git')
const remoto = path.join(tmp, 'github.git')
for (const s of ['a', 'b']) {
  g(tmp, 'clone', '-q', remoto, s)
  g(path.join(tmp, s), 'config', 'user.email', `${s}@x`)
  g(path.join(tmp, s), 'config', 'user.name', s)
}
const A = path.join(tmp, 'a'), B = path.join(tmp, 'b')
const ENV = { ...process.env, CANDADO_PAUSA_SEG: '1', CANDADO_ASIENTO_SEG: '0' }
const candado = (cwd, ...a) => spawnSync(process.execPath, [script, ...a], { cwd, encoding: 'utf8', env: ENV })
const enGithub = () => g(tmp, '--git-dir', remoto, 'for-each-ref', '--format=%(refname:short) %(objectname)', 'refs/heads/integrando/').stdout.trim()
const salida = (r) => (r.stdout || '') + (r.stderr || '')

;(async () => {
  try {
    let r = candado(A, 'ver')
    chk('ver: libre', r.status === 0 && /el candado está libre/.test(r.stdout), salida(r))
    r = candado(A, 'tomar', 'tema-a')
    chk('A toma el candado', r.status === 0 && /Candado tomado: integrando\/tema-a/.test(r.stdout), salida(r))
    const primero = enGithub()
    chk('… y en GitHub aparece la rama integrando/tema-a', /^integrando\/tema-a [0-9a-f]{40}$/.test(primero), primero)
    r = candado(B, 'tomar', 'tema-b', '--esperar', '0')
    chk('B no lo puede tomar: dice quién lo tiene y que no integre', r.status === 1 && /ESPERO: está integrando integrando\/tema-a/.test(r.stdout) && /No integres todavía/.test(r.stdout), salida(r))
    chk('… y no deja su rama', !/tema-b/.test(enGithub()), enGithub())
    r = candado(B, 'ver')
    chk('ver dice quién lo tiene', /integrando\/tema-a: .*TIENE EL CANDADO/.test(r.stdout), salida(r))
    r = candado(A, 'tomar', 'tema-a')
    const renovado = enGithub()
    chk('A lo renueva', r.status === 0 && /Candado renovado/.test(r.stdout) && renovado !== primero, salida(r))
    const sha1 = primero.split(' ')[1], sha2 = renovado.split(' ')[1]
    chk('… con un commit ENCIMA del anterior (sin --force)', g(tmp, '--git-dir', remoto, 'rev-parse', `${sha2}^`).stdout.trim() === sha1)
    chk('… que sigue diciendo desde cuándo lo tiene', g(tmp, '--git-dir', remoto, 'log', '-1', '--format=%s', sha2).stdout.trim() === g(tmp, '--git-dir', remoto, 'log', '-1', '--format=%s', sha1).stdout.trim())

    // B espera; A lo suelta al rato; B lo toma solo.
    const esperaB = new Promise((resolve) => {
      const p = spawn(process.execPath, [script, 'tomar', 'tema-b', '--esperar', '1'], { cwd: B, env: ENV })
      let out = ''
      p.stdout.on('data', d => { out += d })
      p.stderr.on('data', d => { out += d })
      p.on('exit', (code) => resolve({ code, out }))
    })
    await new Promise(res => setTimeout(res, 2500))
    r = candado(A, 'soltar', 'tema-a')
    chk('A lo suelta', r.status === 0 && /Candado suelto/.test(r.stdout), salida(r))
    const rb = await esperaB
    chk('B esperaba avisando, y lo toma cuando A lo suelta', rb.code === 0 && /ESPERO/.test(rb.out) && /Candado tomado: integrando\/tema-b/.test(rb.out), rb.out)
    chk('… y en GitHub queda solo el de B', /^integrando\/tema-b \S+$/.test(enGithub()), enGithub())
    r = candado(A, 'soltar', 'tema-a')
    chk('soltar uno que no existe no rompe nada', r.status === 0 && /nada que soltar/.test(r.stdout))
    r = candado(B, 'soltar', 'tema-b')

    // Uno abandonado (sin renovar hace 2 h) no frena a nadie.
    const viejo = spawnSync('git', ['commit-tree', '4b825dc642cb6eb9a060e54bf8d69288fbee4904', '-m', 'candado integrando/viejo desde 2026-01-01T00:00:00.000Z'],
      { cwd: A, encoding: 'utf8', env: { ...process.env, GIT_COMMITTER_DATE: new Date(Date.now() - 120 * MIN).toISOString() } }).stdout.trim()
    g(A, 'push', '-q', 'origin', `${viejo}:refs/heads/integrando/viejo`)
    r = candado(B, 'tomar', 'tema-b', '--esperar', '0')
    chk('uno sin renovar hace 2 h se da por abandonado: B lo toma igual', r.status === 0 && /integrando\/viejo no se renueva/.test(r.stdout) && /Candado tomado/.test(r.stdout), salida(r))
    chk('… sin borrar el abandonado (es de otra sesión)', /integrando\/viejo/.test(enGithub()))
    r = candado(B, 'ver')
    chk('ver lo marca ABANDONADO', /integrando\/viejo: .*ABANDONADO/.test(r.stdout), salida(r))

    // Dos a la vez: si A sube el suyo mientras B lo tiene desde antes, A pierde y borra el suyo.
    const desdeAntes = spawnSync('git', ['commit-tree', '4b825dc642cb6eb9a060e54bf8d69288fbee4904', '-m', `candado integrando/rapido desde ${new Date(Date.now() - 1000).toISOString()}`], { cwd: A, encoding: 'utf8' }).stdout.trim()
    g(B, 'push', '-q', 'origin', '--delete', 'integrando/tema-b')
    g(A, 'push', '-q', 'origin', `${desdeAntes}:refs/heads/integrando/rapido`)
    const conAsiento = spawnSync(process.execPath, [script, 'tomar', 'tema-a', '--esperar', '0'], { cwd: A, encoding: 'utf8', env: { ...ENV, CANDADO_PAUSA_SEG: '0' } })
    chk('si otro ya lo tiene, A ni siquiera sube el suyo', conAsiento.status === 1 && !/tema-a/.test(enGithub()), salida(conAsiento))
    g(A, 'push', '-q', 'origin', '--delete', 'integrando/rapido')

    // Y si el otro llega MIENTRAS A espera que se asiente lo suyo: A vuelve a
    // mirar, ve que el otro lo tiene desde antes, borra el suyo y espera.
    const carrera = new Promise((resolve) => {
      const p = spawn(process.execPath, [script, 'tomar', 'tema-a', '--esperar', '0'], { cwd: A, env: { ...ENV, CANDADO_ASIENTO_SEG: '8' } })
      let out = ''
      p.stdout.on('data', d => { out += d })
      p.stderr.on('data', d => { out += d })
      p.on('exit', (code) => resolve({ code, out }))
    })
    const t0 = Date.now()
    while (!/tema-a/.test(enGithub()) && Date.now() - t0 < 20000) await new Promise(res => setTimeout(res, 100))
    const otro = spawnSync('git', ['commit-tree', '4b825dc642cb6eb9a060e54bf8d69288fbee4904', '-m', `candado integrando/otro desde ${new Date(Date.now() - 60000).toISOString()}`], { cwd: B, encoding: 'utf8' }).stdout.trim()
    g(B, 'push', '-q', 'origin', `${otro}:refs/heads/integrando/otro`)
    const rc = await carrera
    chk('dos a la vez: el que llegó con "desde" posterior lo suelta y no integra', rc.code === 1 && /Lo tomó a la vez integrando\/otro/.test(rc.out) && /No integres todavía/.test(rc.out), rc.out)
    chk('… y borra su rama de GitHub', !/tema-a/.test(enGithub()) && /integrando\/otro/.test(enGithub()), enGithub())

    r = candado(A, 'tomar', 'mal/nombre')
    chk('un nombre con barra no se acepta', r.status === 2 && /Uso:/.test(r.stdout))
    r = candado(A, 'otra-cosa', 'x')
    chk('una acción desconocida tampoco', r.status === 2)
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true })
  }

  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'))
  chk('npm run candado corre candado.js', pkg.scripts.candado === 'node pruebas/candado.js', pkg.scripts.candado)
  const reglas = fs.readFileSync(path.join(__dirname, '..', 'docs', 'memoria', 'reglas-de-integracion.md'), 'utf8')
  chk('reglas-de-integracion.md explica el candado', /npm run candado -- tomar/.test(reglas) && /npm run candado -- soltar/.test(reglas))

  console.log(`\n${ok}/${ok + fallas.length} verificaciones OK`)
  process.exit(fallas.length ? 1 : 0)
})()
