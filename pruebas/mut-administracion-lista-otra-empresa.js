// Mutaciones de test-administracion-lista-otra-empresa.js (valorizar con la
// lista de otra empresa del grupo, 27/10/2026): mutan
// modulos/administracion.html, que la suite recibe por ARCHIVO_TEST. Ver
// mutar.js.
//
// BASELINE FIJO: antes de mutar, la suite tiene que dar ROJO sobre la
// Administración de ANTES del cambio (BASE = 5e6ca2b, de donde salió la rama
// ci-prueba/acopios). Nunca HEAD.
//
//   node pruebas/mut-administracion-lista-otra-empresa.js
//
// UN RUNNER POR VEZ.
'use strict'

const path = require('path')
const fs = require('fs')
const { execFileSync } = require('child_process')
const { correrMutaciones } = require('./mutar')

const RAIZ = path.join(__dirname, '..')
const SUITE = path.join(__dirname, 'test-administracion-lista-otra-empresa.js')
const BASE = '5e6ca2b'

if (!process.env.MUT_SOLO_ANCLAS) {
  let viejo = null
  try {
    viejo = execFileSync('git', ['show', `${BASE}:modulos/administracion.html`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  } catch {
    console.log(`(sin el historial de git: no se corre el baseline ${BASE})`)
  }
  if (viejo !== null) {
    const tmp = path.join(__dirname, 'mut-tmp-base-administracion-lista-otra-empresa.html')
    fs.writeFileSync(tmp, viejo)
    let rojo = false
    try {
      execFileSync(process.execPath, [SUITE], { encoding: 'utf8', env: { ...process.env, ARCHIVO_TEST: tmp }, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 })
    } catch { rojo = true } finally { fs.rmSync(tmp, { force: true }) }
    console.log(rojo ? `BASELINE ${BASE}: la suite da ROJO sobre la Administración de antes (bien).` : `ABORTADO: la suite da VERDE sobre ${BASE}: no prueba lo nuevo.`)
    if (!rojo) process.exit(2)
  }
}

correrMutaciones({
  suite: SUITE,
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/administracion.html'),
  escape: 'esc',
  funciones: [],
  manuales: [
    { nombre: 'nunca busca la equivalente', de: '      if (!unidad) return propio\n', a: '      return propio\n' },
    { nombre: 'la equivalente en la empresa de la orden', de: '      const pres = await presentacionEnUnidad(it.presentacion_id, unidad)', a: "      const pres = await presentacionEnUnidad(it.presentacion_id, 'u-d')" },
    { nombre: 'la misma empresa también busca', de: '        return u && u !== unidadOrden ? u : null', a: '        return u' },
    { nombre: 'consulta aunque la lista ya se conozca', de: '      if (estado.listas?.unidad === unidadOrden && (estado.listas.filas ?? []).some(l => l?.id === listaId)) return null\n', a: '' },
    { nombre: 'la lista sin buscarla por id', de: ".select('id, unidad_negocio_id').eq('id', listaId).maybeSingle()", a: ".select('id, unidad_negocio_id').maybeSingle()" },
    { nombre: 'se queda con el precio de la de Dolce', de: '      const r = pres === it.presentacion_id ? await propio : await leerPrecioVenta(listaId, { ...it, presentacion_id: pres }, fecha)', a: '      const r = await propio' },
    { nombre: 'pide de nuevo sin equivalente', de: '      const r = pres === it.presentacion_id ? await propio :', a: '      const r = false ? await propio :' },
    { nombre: 'acepta cualquier respuesta de la equivalencia', de: "        return typeof data === 'string' && data ? data : presentacionId", a: '        return data' },
    { nombre: 'la equivalencia que falla tira', de: "        console.error('No se pudo buscar el producto equivalente en la otra empresa:', err)\n        return presentacionId", a: "        console.error('No se pudo buscar el producto equivalente en la otra empresa:', err)\n        throw err" },
    { nombre: 'sin decir de qué empresa es el precio', de: " + (r.empresaLista ? ' · de ' + r.empresaLista : '')", a: '' },
    { nombre: 'la lista de otra empresa como siempre', de: '        if (!porClave.has(k)) porClave.set(k, leerPrecioVentaEn(listaId, it, o.fecha, unidadLista))', a: '        if (!porClave.has(k)) porClave.set(k, leerPrecioVenta(listaId, it, o.fecha))' },
  ],
})
