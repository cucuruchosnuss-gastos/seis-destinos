// Mutaciones de test-administracion-valorizar-legible.js (el nombre del
// renglón con "× N u.", el descuento del cono y la caja con cono con la
// aritmética de numeric, 30/10/2026): mutan modulos/administracion.html, que
// la suite recibe por ARCHIVO_TEST. Ver mutar.js.
//
// BASELINE FIJO: antes de mutar, la suite tiene que estar en ROJO sobre la
// Administración de ANTES del cambio (BASE = f3d7152, de donde salió la rama
// ci-prueba/valorizar-legible). Nunca HEAD.
//
//   node pruebas/mut-administracion-valorizar-legible.js
//
// UN RUNNER POR VEZ.

const path = require('path')
const fs = require('fs')
const { execFileSync } = require('child_process')
const { correrMutaciones } = require('./mutar')
const { limitesAdministracion } = require('./fuente-cheques')

const RAIZ = path.join(__dirname, '..')
const SUITE = path.join(__dirname, 'test-administracion-valorizar-legible.js')
const BASE = 'f3d7152'

if (!process.env.MUT_SOLO_ANCLAS) {
  const viejo = execFileSync('git', ['show', `${BASE}:modulos/administracion.html`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  const tmp = path.join(__dirname, 'mut-tmp-base-administracion-valorizar-legible.html')
  fs.writeFileSync(tmp, viejo)
  let rojo = false
  try {
    execFileSync(process.execPath, [SUITE], { encoding: 'utf8', env: { ...process.env, ARCHIVO_TEST: tmp }, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 })
  } catch { rojo = true } finally { fs.rmSync(tmp, { force: true }) }
  console.log(rojo ? `BASELINE ${BASE}: la suite da ROJO sobre la Administración de antes (bien).` : `ABORTADO: la suite da VERDE sobre ${BASE}: no prueba lo nuevo.`)
  if (!rojo) process.exit(2)
}

correrMutaciones({
  region: limitesAdministracion,
  suite: SUITE,
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/administracion.html'),
  escape: 'esc',
  funciones: ['htmlNombreRenglon', 'htmlDescuentoGuardado', 'htmlOrigenPrecio', 'htmlNombreHojaPunto'],
  equivalentes: [
    { expr: "esc('(−' + textoPct(pct) + ' %)')", motivo: 'un % formateado por el código (textoPct de un número): sin texto de la base' },
  ],
  manuales: [
    // El nombre del renglón
    { nombre: 'sin las unidades de la caja', de: "      const u = textoUnidadesRemito(pr)\n", a: "      const u = ''\n" },
    { nombre: 'las unidades sin negrita', de: "' <strong class=\"ad-renglon__u\">' + esc(u) + '</strong>'", a: "' ' + esc(u)" },
    { nombre: 'vuelve el "· Sin cono" final', de: "      const cono = pr?.con_cono ? p.cono : ''\n", a: '      const cono = p.cono\n' },
    { nombre: 'sin el cono aunque sea con cono', de: "      const cono = pr?.con_cono ? p.cono : ''\n", a: "      const cono = ''\n" },
    { nombre: 'el renglón con el nombre viejo', de: "        descHtml = esc(desc) + htmlNombreRenglon(cat, it)", a: "        descHtml = esc(desc + [p.producto, p.presentacion, p.cono].join(' · '))" },
    // El descuento
    { nombre: 'sin el descuento al valorizar', de: "            descuento: textoDescuentoPrecio(r.datos, nombreCono, d.orden.moneda || 'ARS') }", a: '            descuento: \'\' }' },
    { nombre: 'el descuento sin el cono', de: "(limpio(nombreCono) ? ' ' + limpio(nombreCono) : '')", a: "''" },
    { nombre: 'el descuento sin el precio de antes', de: "      if (antes !== null) partes.push('antes ' + importeHoja(antes, moneda))\n", a: '' },
    { nombre: 'el descuento en rojo', de: '<div class="ad-renglon__origen ad-renglon__descuento" data-descuento>', a: '<div class="ad-renglon__origen ad-renglon__origen--grave" data-descuento>' },
    { nombre: 'el descuento con 0 %', de: '      if (pct === null || pct === 0) return \'\'\n      const antes', a: "      if (pct === null) return ''\n      const antes" },
    { nombre: 'la orden valorizada sin el (−5 %)', de: "${esc(importeHoja(precio, moneda) + ' x ' + porQue)}${htmlDescuentoGuardado(it)}", a: "${esc(importeHoja(precio, moneda) + ' x ' + porQue)}" },
    { nombre: 'la orden no lee el descuento', de: 'precio_caja, subtotal, descuento_pct, lote,', a: 'precio_caja, subtotal, lote,' },
    // Las hojas N1 / N2
    { nombre: 'la hoja con el nombre de la base', de: '        ? filas.map(r => `<tr><td>${htmlNombreHojaPunto(datos, r)}</td>` +', a: '        ? filas.map(r => `<tr><td>${esc(r.descripcion)}</td>` +' },
    { nombre: 'la hoja de otra orden con el nombre de la abierta', de: "d?.orden?.id && d.orden.id === datos?.orden_id && Array.isArray(d.items)", a: 'Array.isArray(d?.items)' },
    { nombre: 'la devolución sin su palabra en la hoja', de: "r.tipo === 'devolucion' ? 'Devolución: ' :", a: "r.tipo === 'devolucion' ? '' :" },
    // La caja con cono como la base
    { nombre: 'vuelve el redondeo a 4 en el medio', de: '      const unidad = multiplicarNumeric(dividirNumeric(c, us), recargo)', a: '      const unidad = multiplicarNumeric({ v: (dividirNumeric(c, us).v + 500000000000n) / 1000000000000n, s: 4 }, recargo)' },
    { nombre: 'la división con 4 decimales menos', de: '      const escala = Math.min(1000, Math.max(16 - q * 4, a.s, b.s, 0))', a: '      const escala = Math.min(1000, Math.max(12 - q * 4, a.s, b.s, 0))' },
    { nombre: 'la división sin el ajuste del primer grupo', de: '      if (pa.primero < pb.primero) q--\n', a: '' },
    { nombre: 'la división trunca (no redondea)', de: '      return { v: t >= 0n ? (t + 5n) / 10n : (t - 5n) / 10n, s: escala }', a: '      return { v: t / 10n, s: escala }' },
    { nombre: 'el final trunca (no redondea)', de: '      return Number(t >= 0n ? (t + 5n) / 10n : (t - 5n) / 10n) / 100\n', a: '      return Number(t / 10n) / 100\n' },
    { nombre: 'sin el recargo de la lista', de: '      return cuentaNumeric(nuevo, upcSin, pct, conito, upcCon)', a: '      return cuentaNumeric(nuevo, upcSin, 0, conito, upcCon)' },
    { nombre: 'sin el conito', de: '      return plataNumeric(multiplicarNumeric(sumarNumeric(unidad, co), uc))', a: '      return plataNumeric(multiplicarNumeric(unidad, uc))' },
    { nombre: 'la cuenta con los decimales de la compu', de: '      return cuentaNumeric(nuevo, upcSin, pct, conito, upcCon)', a: '      return Math.round((nuevo / upcSin * (1 + pct / 100) + conito) * upcCon * 100) / 100' },
  ],
})
