// Mutaciones de test-remitos-dolce-acopio.js (el saldo del acopio al revisar
// un remito, en Remitos Dolce desde el 28/10/2026; antes eran parte de
// mut-administracion-acopios.js): mutan modulos/remitos-dolce.html
// (ARCHIVO_TEST). Ver mutar.js.
//
// BASELINE FIJO: la suite tiene que dar ROJO sobre la Administración de
// 133555d (el main del que salió la rama: el saldo vivía ahí y el módulo no
// existía). Nunca HEAD.
//
//   node pruebas/mut-remitos-dolce-acopio.js
//
// UN RUNNER POR VEZ.
'use strict'

const path = require('path')
const fs = require('fs')
const { execFileSync } = require('child_process')
const { correrMutaciones } = require('./mutar')

const RAIZ = path.join(__dirname, '..')
const SUITE = path.join(__dirname, 'test-remitos-dolce-acopio.js')
const BASE = '133555d'

if (process.env.MUT_SOLO_ANCLAS !== '1') {
  const viejo = execFileSync('git', ['show', `${BASE}:modulos/administracion.html`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  const tmp = path.join(__dirname, 'mut-tmp-base-remitos-dolce-acopio.html')
  fs.writeFileSync(tmp, viejo)
  let rojo = false
  try {
    execFileSync(process.execPath, [SUITE], { encoding: 'utf8', env: { ...process.env, ARCHIVO_TEST: tmp }, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 })
  } catch { rojo = true } finally { fs.rmSync(tmp, { force: true }) }
  console.log(rojo ? `BASELINE ${BASE}: la suite da ROJO sobre la Administración de antes (bien).` : `ABORTADO: la suite da VERDE sobre ${BASE}: no prueba lo nuevo.`)
  if (!rojo) process.exit(2)
}

correrMutaciones({
  suite: SUITE,
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/remitos-dolce.html'),
  escape: 'esc',
  funciones: ['htmlSaldoAcopioRemito'],
  equivalentes: [
    { expr: 'esc(clase)', motivo: 'una de dos clases constantes del código (ad-rm-acopio / ad-rm-acopio--falta)' },
    { expr: 'esc(i)', motivo: 'el índice del renglón (un número) en un data-rm-acopio' },
    { expr: 'esc(texto)', motivo: 'textos del código con números contados acá (enteroHoja) o el error constante de leer el acopio' },
  ],
  manuales: [
    { nombre: 'el buscador del remito sin "(también en…)"', de: 'data-rm-cliente="${esc(c.id)}">` +\n          `<span class="ad-opcion-cliente__nombre">${esc(limpio(c.nombre) + textoTambienEn(c) + (apodo',
      a: 'data-rm-cliente="${esc(c.id)}">` +\n          `<span class="ad-opcion-cliente__nombre">${esc(limpio(c.nombre) + (apodo' },
    // El saldo en la revisión del remito
    { nombre: 'el saldo también con talonario Oficial', de: "      if (!f || f.talonario !== 'acopio' || !f.clienteId || !r?.presentacionId || r.omitir === true) return null", a: '      if (!f || !f.clienteId || !r?.presentacionId || r.omitir === true) return null' },
    { nombre: 'el omitido con saldo', de: "      if (!f || f.talonario !== 'acopio' || !f.clienteId || !r?.presentacionId || r.omitir === true) return null", a: "      if (!f || f.talonario !== 'acopio' || !f.clienteId || !r?.presentacionId) return null" },
    { nombre: 'sin mirar el cono', de: 'claveAcopio(x.presentacion_id, x.marca_id) === k)\n        .reduce', a: 'x.presentacion_id === r.presentacionId)\n        .reduce' },
    { nombre: 'cuenta los anulados', de: "estadoAcopio(x) === 'activo' && claveAcopio(x.presentacion_id, x.marca_id) === k", a: 'claveAcopio(x.presentacion_id, x.marca_id) === k' },
    { nombre: 'lo que pide solo este renglón', de: 'const pide = (f.renglones ?? []).filter(', a: 'const pide = [r].filter(' },
    { nombre: 'justo no alcanza', de: 'alcanza: saldo > 0 && pide <= saldo', a: 'alcanza: saldo > 0 && pide < saldo' },
    { nombre: 'sin amarillo', de: "        clase += ' ad-rm-acopio--falta'\n", a: '' },
    { nombre: 'el acopio de todos los clientes', de: 'a.filas = await leerAcopios(rm.fila?.unidad_negocio_id ?? estado.empresaId, a.clienteId)', a: 'a.filas = await leerAcopios(rm.fila?.unidad_negocio_id ?? estado.empresaId, null)' },
    { nombre: 'elegir el cliente no lee el acopio', de: '      pintarRemito()\n      cargarAcopiosRemito()\n    }\n\n    function cambiarClienteRemito', a: '      pintarRemito()\n    }\n\n    function cambiarClienteRemito' },
    { nombre: 'pasar a Acopio no lee el acopio', de: '      pintarRemito()\n      cargarAcopiosRemito()\n    }\n\n    function elegirClienteRemito', a: '      pintarRemito()\n    }\n\n    function elegirClienteRemito' },
    { nombre: 'las cajas no actualizan el saldo', de: '        pintarPieLotesRemito(d.rmCantidad)\n        pintarAcopiosRemito()', a: '        pintarPieLotesRemito(d.rmCantidad)' },
    { nombre: 'el renglón sin el saldo', de: '(r.presentacionId ? htmlSaldoAcopioRemito(rm, r, i) + htmlLotesRemito(r, i) : \'\')', a: "(r.presentacionId ? htmlLotesRemito(r, i) : '')" },
  ],
})
