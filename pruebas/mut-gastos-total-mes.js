// Mutaciones del recuadro del total de Gastos (ver test-gastos-total-mes.js).
//
// Antes de mutar: la suite tiene que dar ROJO contra el gastos.html de
// ANTES del arreglo, anclado al commit fijo BASE e9fdabf (el main donde Facu vio
// el total cortado con "En el mes"). Si un día pasa en verde contra ese archivo,
// la suite dejó de probar el bug y las mutaciones no dicen nada.
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { correrMutaciones } = require('./mutar')

const RAIZ = path.join(__dirname, '..')
const SUITE = path.join(__dirname, 'test-gastos-total-mes.js')
const BASE_ANTES_DEL_ARREGLO = 'e9fdabf'

{
  const tmp = path.join(__dirname, 'mut-tmp-gastos-total-mes-antes.html')
  fs.writeFileSync(tmp, execFileSync('git', ['show', `${BASE_ANTES_DEL_ARREGLO}:modulos/gastos.html`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }))
  let rojo = false, salida = ''
  try {
    salida = execFileSync(process.execPath, [SUITE], { encoding: 'utf8', env: { ...process.env, ARCHIVO_TEST: tmp }, stdio: ['ignore', 'pipe', 'pipe'] })
  } catch (err) {
    rojo = true
    salida = (err.stdout || '') + (err.stderr || '')
  } finally {
    fs.rmSync(tmp, { force: true })
  }
  const ultima = salida.trim().split('\n').pop()
  if (!rojo || !/ROJO/.test(ultima)) {
    console.log(`ABORTADO: la suite NO da rojo contra el gastos.html de ${BASE_ANTES_DEL_ARREGLO} (antes del arreglo): ${ultima}`)
    process.exit(2)
  }
  console.log(`antes del arreglo (${BASE_ANTES_DEL_ARREGLO}): ${ultima}`)
}

const CARD = '<div class="grilla-totales__card grilla-totales__card--total">'

correrMutaciones({
  suite: SUITE,
  original: path.join(RAIZ, 'modulos', 'gastos.html'),
  funciones: [],
  manuales: [
    // La grilla
    { nombre: 'la grilla vuelve a auto-fit', de: '      grid-template-columns: repeat(2, minmax(0, 1fr));', a: '      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));' },
    { nombre: 'las columnas se estiran por su contenido', de: '      grid-template-columns: repeat(2, minmax(0, 1fr));', a: '      grid-template-columns: repeat(2, 1fr);' },
    { nombre: 'el layout vuelve al style="" de la grilla', de: '<div id="total-gastos" class="grilla-totales" hidden>', a: '<div id="total-gastos" class="grilla-totales" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(160px, 1fr));" hidden>' },
    { nombre: '"Por unidad" deja de ir en su renglón', de: '    .grilla-totales__card--unidades {\n      grid-column: 1 / -1;\n', a: '    .grilla-totales__card--unidades {\n' },
    { nombre: 'en el celular, dos columnas', de: '        grid-template-columns: 1fr !important;\n', a: '\n' },
    // La tarjeta del total
    { nombre: 'la tarjeta recorta (sin overflow: visible)', de: '      container-type: inline-size;\n      overflow: visible;\n', a: '      container-type: inline-size;\n' },
    { nombre: 'la tarjeta con overflow: hidden', de: '      container-type: inline-size;\n      overflow: visible;\n', a: '      container-type: inline-size;\n      overflow: hidden;\n' },
    { nombre: 'sin container-type (el cqi no mide la tarjeta)', de: '      container-type: inline-size;\n      overflow: visible;\n', a: '      overflow: visible;\n' },
    { nombre: 'sin alto mínimo', de: '      min-height: 5.5rem;\n      border-radius: 18px;', a: '      border-radius: 18px;' },
    { nombre: 'la columna del número no puede achicarse', de: '    .grilla-totales__texto {\n      flex: 1 1 auto;\n      min-width: 0;\n', a: '    .grilla-totales__texto {\n      flex: 1 1 auto;\n' },
    // El número
    { nombre: 'la letra no se achica (sin clamp)', de: '      font-size: clamp(1.125rem, 11cqi, 1.75rem);\n', a: '\n' },
    { nombre: 'el clamp no achica nada', de: 'clamp(1.125rem, 11cqi, 1.75rem)', a: 'clamp(1.75rem, 11cqi, 1.75rem)' },
    { nombre: 'el cqi demasiado grande', de: 'clamp(1.125rem, 11cqi, 1.75rem)', a: 'clamp(1.125rem, 20cqi, 1.75rem)' },
    { nombre: 'el número no baja de renglón (nowrap)', de: '      white-space: normal;\n      overflow-wrap: anywhere;\n', a: '      white-space: nowrap;\n      overflow-wrap: anywhere;\n' },
    { nombre: 'el número corta con puntos suspensivos', de: '      white-space: normal;\n      overflow-wrap: anywhere;\n', a: '      white-space: normal;\n      overflow-wrap: anywhere;\n      text-overflow: ellipsis;\n' },
    { nombre: 'sin overflow-wrap (en la compu no baja aunque no entre)', de: '      white-space: normal;\n      overflow-wrap: anywhere;\n', a: '      white-space: normal;\n' },
    // El render
    { nombre: 'la tarjeta pierde su clase', de: CARD, a: '<div class="grilla-totales__card">' },
    { nombre: 'la tarjeta depende del período', de: CARD, a: '<div class="grilla-totales__card ${estado.filtros.rangoRapido === \'mes\' ? \'\' : \'grilla-totales__card--total\'}">' },
    { nombre: 'overflow: hidden escrito en la tarjeta', de: CARD, a: '<div class="grilla-totales__card grilla-totales__card--total" style="overflow:hidden">' },
    { nombre: 'la columna del número sin su clase', de: '          <div class="grilla-totales__texto">\n', a: '          <div>\n' },
    { nombre: 'el número recortado en el JS', de: "${formatearImporte(totalARS, 'ARS')}", a: "${formatearImporte(totalARS, 'ARS').slice(0, 10)}" },
  ],
})
