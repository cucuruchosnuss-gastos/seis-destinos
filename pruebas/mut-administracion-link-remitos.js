// Mutaciones de test-administracion-link-remitos.js (lo que quedó en
// Administración de los remitos de Rosario, 28/10/2026): mutan
// modulos/administracion.html (ARCHIVO_TEST) y js/remitos-comun.js
// (ARCHIVO_COMUN_REMITOS). Ver mutar.js.
//
// BASELINE FIJO: la suite tiene que dar ROJO sobre la Administración de
// 133555d (el main del que salió la rama ci-prueba/modulo-remitos-dolce, con
// la revisión adentro). Nunca HEAD.
//
//   node pruebas/mut-administracion-link-remitos.js
//
// UN RUNNER POR VEZ.
'use strict'

const path = require('path')
const fs = require('fs')
const { execFileSync } = require('child_process')
const { correrMutacionesEnVarios } = require('./mutar')

const RAIZ = path.join(__dirname, '..')
const SUITE = path.join(__dirname, 'test-administracion-link-remitos.js')
const BASE = '133555d'

if (process.env.MUT_SOLO_ANCLAS !== '1') {
  const viejo = execFileSync('git', ['show', `${BASE}:modulos/administracion.html`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  const tmp = path.join(__dirname, 'mut-tmp-base-administracion-link-remitos.html')
  fs.writeFileSync(tmp, viejo)
  let rojo = false
  try {
    execFileSync(process.execPath, [SUITE], { encoding: 'utf8', env: { ...process.env, ARCHIVO_TEST: tmp }, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 })
  } catch { rojo = true } finally { fs.rmSync(tmp, { force: true }) }
  console.log(rojo ? `BASELINE ${BASE}: la suite da ROJO sobre la Administración de antes (bien).` : `ABORTADO: la suite da VERDE sobre ${BASE}: no prueba lo nuevo.`)
  if (!rojo) process.exit(2)
}

correrMutacionesEnVarios([{
  suite: SUITE,
  original: path.join(RAIZ, 'modulos/administracion.html'),
  variable: 'ARCHIVO_TEST',
  funciones: [],
  manuales: [
    { nombre: 'null cuenta como sin control', de: "estado.sinControl.set(unidadId, data?.controla_stock_terminado === false)", a: "estado.sinControl.set(unidadId, data?.controla_stock_terminado !== true)" },
    { nombre: 'la orden se lee sin numero_remito', de: 'division_pct_a, numero_remito, talonario, condiciones_especiales\')', a: 'division_pct_a, condiciones_especiales\')' },
    { nombre: 'la lista se lee sin numero_remito', de: 'comision_modo, comision_importe, numero_remito, numero_remito_n, talonario\')', a: 'comision_modo, comision_importe\')' },
    { nombre: 'Dolce sin el link', de: "      if (el) el.innerHTML = sinControlStockEmpresa() ? '<p class=\"ad-link-remitos\"><a href=\"remitos-dolce.html?pestana=revisar\">Remitos Dolce →</a></p>' : ''", a: "      if (el) el.innerHTML = ''" },
    { nombre: 'el link también en Nuss', de: "      if (el) el.innerHTML = sinControlStockEmpresa() ? '<p", a: "      if (el) el.innerHTML = true ? '<p" },
    { nombre: 'el link a otra pestaña', de: 'remitos-dolce.html?pestana=revisar', a: 'remitos-dolce.html' },
    { nombre: 'Órdenes no pinta el link', de: '      await leerSinControl(estado.empresaId)\n      pintarLinkRemitos()', a: '      await leerSinControl(estado.empresaId)' },
    { nombre: 'Órdenes no lee si controla el stock', de: '      await leerSinControl(estado.empresaId)\n      pintarLinkRemitos()', a: '      pintarLinkRemitos()' },
    { nombre: 'la lista de Dolce vacía', de: "      return estado.ordenes.map(htmlFilaOrden).join('')", a: "      return ''" },
    { nombre: 'la cuenta de Dolce en cero', de: '      const n = Array.isArray(estado.ordenes) ? estado.ordenes.length : 0', a: '      const n = 0' },
    { nombre: 'Nuevo acopio sin las categorías', de: 'gruposRemito(cat, busqueda, CATEGORIAS_PRODUCTO)', a: 'gruposRemito(cat, busqueda)' },
    { nombre: 'la ficha sin el remito', de: "${remito ? `<p class=\"ad-orden-remito\" data-orden-remito>${esc(remito)}</p>` : ''}", a: '' },
    { nombre: 'la ficha sin el sello Acopio', de: '${htmlSelloOrden(o)}${htmlSelloEntre(o)}${htmlSelloAcopio(o)}</div><div class="ad-datos">', a: '${htmlSelloOrden(o)}${htmlSelloEntre(o)}</div><div class="ad-datos">' },
    { nombre: 'la hoja sin el N° de remito', de: "numeroRemito: limpio(o.numero_remito) || null, talonario: o.talonario === 'acopio' ? 'acopio' : null,", a: "numeroRemito: null, talonario: o.talonario === 'acopio' ? 'acopio' : null," },
    { nombre: 'la hoja sin el talonario', de: "numeroRemito: limpio(o.numero_remito) || null, talonario: o.talonario === 'acopio' ? 'acopio' : null,", a: 'numeroRemito: limpio(o.numero_remito) || null, talonario: null,' },
  ],
}, {
  suite: SUITE,
  original: path.join(RAIZ, 'js', 'remitos-comun.js'),
  variable: 'ARCHIVO_COMUN_REMITOS',
  funciones: [],
  manuales: [
    { nombre: 'el remito nunca se nombra', de: "  if (!n) return ''\n  return `${talonarioDe(o) === 'acopio' ? 'Acopio' : 'Remito'} N° ${n}`", a: "  return ''" },
    { nombre: 'todo es acopio', de: "${talonarioDe(o) === 'acopio' ? 'Acopio' : 'Remito'} N° ${n}", a: 'Acopio N° ${n}' },
    { nombre: 'el acopio dice Remito', de: "${talonarioDe(o) === 'acopio' ? 'Acopio' : 'Remito'} N° ${n}", a: 'Remito N° ${n}' },
    { nombre: 'el sello Acopio nunca', de: "  return o?.talonario === 'acopio' ? '<span class=\"ad-sello ad-sello--acopio\">Acopio</span>' : ''", a: "  return ''" },
    { nombre: 'el sello Acopio siempre', de: "  return o?.talonario === 'acopio' ? '<span", a: "  return true ? '<span" },
  ],
}])
