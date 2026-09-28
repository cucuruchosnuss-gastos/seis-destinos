// ¿La app responde? (27/09/2026). Lo corre GitHub cada 30 minutos
// (.github/workflows/salud.yml) y falla si algo no contesta. NO es una suite:
// sale a internet, así que correr-todo.js no lo corre (no empieza con test-).
//
// Qué mira:
//  1. Las páginas de GitHub Pages cargan (200) y son la app (su <title>).
//  2. Auth de Supabase contesta (auth/v1/health → 200, GoTrue).
//  3. LA BASE contesta con la clave pública: una lectura sin sesión tiene que
//     volver con el error 42501 ("permission denied") que da POSTGRES mismo.
//     Eso prueba que PostgREST llegó a la base y la base respondió; una base
//     caída da 5xx o un PGRST000/PGRST001, y un 200 querría decir que una
//     tabla quedó abierta sin sesión, que también es una alarma.
//
//   node pruebas/salud-en-vivo.js
//   SD_URL_APP / SD_URL_BASE / SD_CLAVE_PUBLICA para apuntar a otro lado.
'use strict'

const URL_APP = process.env.SD_URL_APP || 'https://cucuruchosnuss-gastos.github.io/seis-destinos/'
const URL_BASE = process.env.SD_URL_BASE || 'https://xtorxouhzuizdvawqakb.supabase.co'
// La clave publicable: es pública (está en js/supabase.js), no es un secreto.
const CLAVE = process.env.SD_CLAVE_PUBLICA || 'sb_publishable_G8GZe2uAvb6VdJ1S4DD8nA_CC7iugYw'
const ESPERA_MS = 20000

const PAGINAS = [
  ['login.html', 'Seis Destinos'],
  ['dashboard.html', 'Seis Destinos'],
  ['modulos/produccion.html', 'Planta'],
]

// ── La decisión (pura, para las pruebas) ──────────────────────────────────

function evaluarPagina({ status, cuerpo, marca }) {
  if (status !== 200) return `respondió ${status ?? 'nada'}`
  const titulo = /<title>([^<]*)<\/title>/i.exec(cuerpo || '')?.[1] ?? ''
  if (!titulo.includes(marca)) return `no parece la app (título «${titulo || 'sin título'}»)`
  return null
}

function evaluarAuth({ status, cuerpo }) {
  if (status !== 200) return `respondió ${status ?? 'nada'}`
  try { if (JSON.parse(cuerpo).name !== 'GoTrue') return 'no parece el servicio de Auth' } catch { return 'no devolvió JSON' }
  return null
}

function evaluarBase({ status, cuerpo }) {
  let json = null
  try { json = JSON.parse(cuerpo) } catch { /* sigue */ }
  if (status === 200) return 'una tabla se pudo leer SIN sesión (debería dar permiso denegado)'
  if (status === 401 && json?.code === '42501') return null
  if (json?.code) return `respondió ${status} ${json.code}${json.message ? ': ' + json.message : ''}`
  return `respondió ${status ?? 'nada'}`
}

// ── La red ────────────────────────────────────────────────────────────────

async function pedir(url, opciones = {}) {
  const control = new AbortController()
  const t = setTimeout(() => control.abort(), ESPERA_MS)
  try {
    const r = await fetch(url, { ...opciones, signal: control.signal, redirect: 'follow' })
    return { status: r.status, cuerpo: await r.text() }
  } catch (err) {
    return { status: null, cuerpo: '', error: err.name === 'AbortError' ? `no contestó en ${ESPERA_MS / 1000} s` : err.message }
  } finally { clearTimeout(t) }
}

async function revisar() {
  const resultados = []
  for (const [ruta, marca] of PAGINAS) {
    const r = await pedir(new URL(ruta, URL_APP).href)
    resultados.push({ que: `La página ${ruta}`, falla: r.error ?? evaluarPagina({ ...r, marca }) })
  }
  const a = await pedir(`${URL_BASE}/auth/v1/health`, { headers: { apikey: CLAVE } })
  resultados.push({ que: 'Auth de Supabase', falla: a.error ?? evaluarAuth(a) })
  const b = await pedir(`${URL_BASE}/rest/v1/unidades_negocio?select=id&limit=1`, { headers: { apikey: CLAVE } })
  resultados.push({ que: 'La base de datos', falla: b.error ?? evaluarBase(b) })
  return resultados
}

async function main() {
  const resultados = await revisar()
  const lineas = resultados.map(r => `${r.falla ? '✗' : '✓'} ${r.que}${r.falla ? ': ' + r.falla : ''}`)
  console.log(lineas.join('\n'))
  if (process.env.GITHUB_STEP_SUMMARY) {
    const fs = require('fs')
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## ¿La app responde?\n\n${resultados.map(r => `- ${r.falla ? '❌' : '✅'} ${r.que}${r.falla ? ': ' + r.falla : ''}`).join('\n')}\n`)
  }
  const mal = resultados.filter(r => r.falla).length
  console.log(mal ? `\n${mal} de ${resultados.length} NO responden` : `\n${resultados.length}/${resultados.length} responden`)
  process.exit(mal ? 1 : 0)
}

if (require.main === module) main()

module.exports = { evaluarPagina, evaluarAuth, evaluarBase, PAGINAS }
