// Mutaciones de las suites de Producción, que desde el 25/09/2026 prueban DOS
// archivos: la planta (modulos/produccion.html, por ARCHIVO_TEST) y la gestión
// (modulos/produccion-gestion.html, por ARCHIVO_GESTION). Ver mutar.js.
//
// Reparte cada mutación en el archivo donde está lo que muta:
//  - las AUTOMÁTICAS (sacar un esc()), por función: una función que está en
//    los dos archivos (cada uno tiene su copia) se muta en los DOS, así cada
//    copia tiene que estar cubierta; `soloPlanta` / `soloGestion` lo acotan;
//  - las A MANO, por su texto: si está en un solo archivo va ahí; si está en
//    los dos va a la planta, salvo que la mutación diga `archivo: 'gestion'`
//    o `archivo: 'ambos'`.
// Una función o un texto que no está en NINGUNO aborta: sería una mutación
// que no mide nada.

const fs = require('fs')
const path = require('path')
const { correrMutacionesEnVarios } = require('./mutar')

const PLANTA = process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/produccion.html')
const GESTION = process.env.ARCHIVO_BASE_GESTION || path.join(__dirname, '..', 'modulos/produccion-gestion.html')

function tieneFuncion(src, nombre) {
  return new RegExp(`\\n\\s*(?:async\\s+)?function\\s+${nombre}\\s*\\(`).test(src)
}

function correrMutacionesProduccion({ suite, funciones = [], manuales = [], equivalentes = [], escape = 'esc', soloPlanta = [], soloGestion = [] }) {
  const P = fs.readFileSync(PLANTA, 'utf8')
  // Una suite que no lee la gestión no puede detectar nada ahí: todo va a la planta.
  const leeGestion = /ARCHIVO_GESTION/.test(fs.readFileSync(suite, 'utf8'))
  const G = leeGestion ? fs.readFileSync(GESTION, 'utf8') : ''
  const fP = [], fG = [], faltan = []
  for (const f of funciones) {
    const enP = tieneFuncion(P, f) && !soloGestion.includes(f)
    const enG = tieneFuncion(G, f) && !soloPlanta.includes(f)
    if (enP) fP.push(f)
    if (enG) fG.push(f)
    if (!enP && !enG) faltan.push(`función ${f}`)
  }
  const mP = [], mG = []
  for (const m of manuales) {
    const enP = P.includes(m.de), enG = G.includes(m.de)
    if (!enP && !enG) { faltan.push(`«${m.nombre}»`); continue }
    const dest = m.archivo ?? (enP ? 'planta' : 'gestion')
    if ((dest === 'planta' || dest === 'ambos') && enP) mP.push(m)
    if ((dest === 'gestion' || dest === 'ambos') && enG) mG.push({ ...m, nombre: m.nombre + (dest === 'ambos' ? ' (gestión)' : '') })
  }
  if (faltan.length) {
    console.log('ABORTADO: esto no está en ninguno de los dos archivos:')
    for (const f of faltan) console.log('  ' + f)
    process.exit(2)
  }
  const tandas = []
  if (fP.length || mP.length) tandas.push({ suite, original: PLANTA, funciones: fP, manuales: mP, equivalentes, escape, variable: 'ARCHIVO_TEST' })
  if (fG.length || mG.length) tandas.push({ suite, original: GESTION, funciones: fG, manuales: mG, equivalentes, escape, variable: 'ARCHIVO_GESTION' })
  correrMutacionesEnVarios(tandas)
}

module.exports = { correrMutacionesProduccion }
