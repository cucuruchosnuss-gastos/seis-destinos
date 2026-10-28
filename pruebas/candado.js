// EL CANDADO DE INTEGRACIÓN (28/10/2026, ensayo-confiable).
//
// Dos sesiones integraron a main al mismo tiempo y tuvieron que repetir
// respaldo, merge y 20 minutos de pruebas. Ahora quien integra toma antes un
// candado: la rama REMOTA integrando/<nombre>. Mientras otra sesión tenga uno
// vigente (renovado hace menos de VIGENCIA_MIN minutos), se espera y se avisa.
//
//   npm run candado -- tomar <nombre>              → lo toma (o lo renueva si ya es tuyo); si lo tiene otro, espera
//   npm run candado -- tomar <nombre> --esperar 30 → espera hasta 30 min (por defecto 120; 0 = no espera)
//   npm run candado -- soltar <nombre>             → lo suelta (borra integrando/<nombre>)
//   npm run candado -- ver                         → quién lo tiene
//
// <nombre>: el tema de lo que se integra (ensayo-confiable, tablet-x…).
//
// CÓMO: el candado es un commit chiquito (árbol vacío) cuyo mensaje dice desde
// cuándo lo tiene esa sesión; su fecha de commit es la última renovación. Se
// sube con `git push origin <commit>:refs/heads/integrando/<nombre>`. Renovar
// es un commit nuevo encima del anterior (avanza la rama, nunca hace falta
// --force). Las ramas integrando/** no disparan ningún workflow (esos corren en
// main y en ci-prueba/**).
//
// SI DOS LO TOMAN A LA VEZ: cada una sube el suyo, espera ASIENTO_SEG (que
// llegue el de la otra) y vuelve a mirar: gana el que lo tiene desde antes
// (empate: por nombre); la otra borra el suyo y espera. Un candado sin renovar
// hace más de VIGENCIA_MIN minutos se da por abandonado (se ignora, no se borra:
// es de otra sesión). Una integración larga lo renueva con `tomar` (por
// ejemplo, después de cada rama).
'use strict'
const { spawnSync } = require('child_process')

const VIGENCIA_MIN = 90
const REMOTO = process.env.CANDADO_REMOTO || 'origin'
const PAUSA_SEG = Number(process.env.CANDADO_PAUSA_SEG ?? 120)
const ASIENTO_SEG = Number(process.env.CANDADO_ASIENTO_SEG ?? 15)
const PREFIJO = 'refs/heads/integrando/'
// Copia local de los candados remotos (fuera de refs/remotes: no se mezclan con las ramas).
const LOCAL = `refs/candados/${REMOTO}/`
const ARBOL_VACIO = '4b825dc642cb6eb9a060e54bf8d69288fbee4904'

const nombreValido = (n) => typeof n === 'string' && /^[a-z0-9][a-z0-9._-]{0,60}$/i.test(n)

// El mensaje del commit del candado, y de vuelta.
const mensaje = (nombre, desde) => `candado integrando/${nombre} desde ${new Date(desde).toISOString()}`
function desdeDe(asunto, fecha) {
  const m = String(asunto || '').match(/ desde (\S+)$/)
  const t = m ? Date.parse(m[1]) : NaN
  return Number.isFinite(t) ? t : fecha
}

// ¿Quién tiene el candado? candados: [{ nombre, desde, fecha }] (ms). El
// vigente que lo tiene desde antes (empate: por nombre), o null si no hay.
function dueno(candados, ahora) {
  const vigentes = candados.filter(c => ahora - c.fecha < VIGENCIA_MIN * 60000)
  vigentes.sort((a, b) => a.desde - b.desde || (a.nombre < b.nombre ? -1 : 1))
  return vigentes[0] || null
}

function git(args, opciones = {}) {
  const r = spawnSync('git', args, { encoding: 'utf8', ...opciones })
  if (r.status !== 0 && !opciones.puedeFallar) throw new Error(`git ${args.join(' ')}: ${(r.stderr || r.stdout).trim()}`)
  return r
}

// Los candados de GitHub, con sus fechas. → [{ nombre, sha, desde, fecha }]
function traer() {
  git(['fetch', '--quiet', '--prune', '--no-tags', REMOTO, `+${PREFIJO}*:${LOCAL}*`])
  const salida = git(['for-each-ref', '--format=%(refname)%09%(objectname)%09%(committerdate:unix)%09%(contents:subject)', LOCAL]).stdout
  return salida.split('\n').filter(Boolean).map(l => {
    const [ref, sha, unix, asunto] = l.split('\t')
    const fecha = Number(unix) * 1000
    return { nombre: ref.slice(LOCAL.length), sha, fecha, desde: desdeDe(asunto, fecha) }
  })
}

const hhmm = (ms) => new Date(ms).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
const dormir = (seg) => new Promise(r => setTimeout(r, seg * 1000))

// Sube (o renueva) el candado propio. mio: el que ya había (o undefined).
function subir(nombre, mio, ahora) {
  const desde = mio ? mio.desde : ahora
  const args = ['commit-tree', ARBOL_VACIO, '-m', mensaje(nombre, desde)]
  if (mio) args.push('-p', mio.sha)
  const sha = git(args).stdout.trim()
  git(['push', '--quiet', REMOTO, `${sha}:${PREFIJO}${nombre}`])
}

function borrar(nombre) {
  git(['push', '--quiet', REMOTO, '--delete', `${PREFIJO}${nombre}`], { puedeFallar: true })
  git(['update-ref', '-d', `${LOCAL}${nombre}`], { puedeFallar: true })
}

async function tomar(nombre, esperarMin) {
  const t0 = Date.now()
  for (;;) {
    const ahora = Date.now()
    const candados = traer()
    const mio = candados.find(c => c.nombre === nombre)
    const d = dueno(candados, ahora)
    for (const c of candados) {
      if (c.nombre !== nombre && ahora - c.fecha >= VIGENCIA_MIN * 60000) console.log(`(integrando/${c.nombre} no se renueva desde las ${hhmm(c.fecha)}: lo doy por abandonado)`)
    }
    if (d && d.nombre !== nombre) {
      const vence = d.fecha + VIGENCIA_MIN * 60000
      console.log(`ESPERO: está integrando integrando/${d.nombre} (desde las ${hhmm(d.desde)}; si no lo renueva, vence a las ${hhmm(vence)}).`)
      if ((Date.now() - t0) / 60000 + PAUSA_SEG / 60 > esperarMin) {
        console.log(`No lo suelta dentro de los ${esperarMin} min de espera: no tomé el candado. No integres todavía.`)
        return 1
      }
      await dormir(PAUSA_SEG)
      continue
    }
    const renovar = Boolean(mio && d && d.nombre === nombre)
    subir(nombre, renovar ? mio : undefined, ahora)
    if (renovar) { console.log(`Candado renovado: integrando/${nombre} (lo tenés desde las ${hhmm(mio.desde)}).`); return 0 }
    // Recién tomado: que llegue el de otra sesión que lo haya tomado a la vez.
    await dormir(ASIENTO_SEG)
    const ganador = dueno(traer(), Date.now())
    if (ganador && ganador.nombre === nombre) {
      console.log(`Candado tomado: integrando/${nombre}. Al terminar (o si algo falla): npm run candado -- soltar ${nombre}`)
      return 0
    }
    console.log(`Lo tomó a la vez integrando/${ganador ? ganador.nombre : '?'}, desde antes: suelto el mío y espero.`)
    borrar(nombre)
  }
}

function soltar(nombre) {
  const mio = traer().find(c => c.nombre === nombre)
  if (!mio) { console.log(`No hay ningún integrando/${nombre}: nada que soltar.`); return 0 }
  borrar(nombre)
  console.log(`Candado suelto: integrando/${nombre} ya no existe.`)
  return 0
}

function ver() {
  const ahora = Date.now()
  const candados = traer()
  if (!candados.length) { console.log('Nadie está integrando: el candado está libre.'); return 0 }
  const d = dueno(candados, ahora)
  for (const c of candados) {
    const estado = ahora - c.fecha >= VIGENCIA_MIN * 60000 ? 'ABANDONADO (no se renueva)' : d && d.nombre === c.nombre ? 'TIENE EL CANDADO' : 'esperando a que se resuelva el empate'
    console.log(`integrando/${c.nombre}: desde las ${hhmm(c.desde)}, renovado a las ${hhmm(c.fecha)} — ${estado}`)
  }
  return 0
}

async function main() {
  const [accion, nombre, ...resto] = process.argv.slice(2)
  const i = resto.indexOf('--esperar')
  const esperarMin = i === -1 ? 120 : Number(resto[i + 1])
  if (accion === 'ver') return ver()
  if (!['tomar', 'soltar'].includes(accion) || !nombreValido(nombre) || !Number.isFinite(esperarMin)) {
    console.log('Uso: npm run candado -- tomar <nombre> [--esperar <min>] | soltar <nombre> | ver   (nombre: letras, números, - . _)')
    return 2
  }
  return accion === 'tomar' ? tomar(nombre, esperarMin) : soltar(nombre)
}

if (require.main === module) main().then(c => process.exit(c), e => { console.error(e.message); process.exit(1) })

module.exports = { dueno, desdeDe, mensaje, nombreValido, VIGENCIA_MIN, PREFIJO }
