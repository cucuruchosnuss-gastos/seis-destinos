// El módulo Órdenes de retiro en el CATALOGO_TAREAS de accesos.html
// (26/09/2026).
//
// Cuatro tareas —cargar, ver, anular, precios— con alcance por unidad,
// colgando del módulo 'retiros' (la fila de la tabla modulos ya existe, orden
// 11). Las RPCs gatean con tiene_tarea_alcance() —verificado con
// pg_get_functiondef el 26/09/2026—, así que el alcance del catálogo tiene su
// otra mitad en el servidor. Las cuatro están en chk_tarea_valida (47 claves,
// leído el 26/09/2026); test-accesos-produccion.js compara el catálogo entero.
//
//   node pruebas/test-accesos-retiros.js

const fs = require('fs')
const path = require('path')
const { extraerConst } = require('./extraer')
const { arnes } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/accesos.html')
const src = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${src.length} bytes)`)
const { chk, fin } = arnes()

const CATALOGO = new Function(extraerConst(src, 'CATALOGO_TAREAS') + '\nreturn CATALOGO_TAREAS')()
const grupo = CATALOGO.find(g => g.grupo === 'Órdenes de retiro')
chk('hay grupo "Órdenes de retiro"', !!grupo)
chk('el grupo cuelga del módulo retiros', JSON.stringify(grupo?.modulos) === '["retiros"]')
chk('tiene exactamente cuatro tareas', (grupo?.tareas || []).length === 4)
for (const tarea of ['cargar', 'ver', 'anular', 'precios']) {
  const t = (grupo?.tareas || []).find(x => x.modulo === 'retiros' && x.tarea === tarea)
  chk(`retiros:${tarea} está`, !!t)
  chk(`retiros:${tarea} con alcance por unidad`, t?.conAlcance === true)
  chk(`retiros:${tarea} tiene label`, typeof t?.label === 'string' && t.label.length > 10)
  chk(`retiros:${tarea} tiene descripción`, typeof t?.descripcion === 'string' && t.descripcion.length > 60)
  chk(`retiros:${tarea} sin dependencias`, !t?.requiere)
  chk(`retiros:${tarea} la descripción no trae < ni >`, !/[<>]/.test(t?.descripcion || ''))
}
const t = (x) => (grupo?.tareas || []).find(y => y.tarea === x)
chk('cargar dice que es SIN precios', /sin precios/i.test(t('cargar')?.label || '') && /No muestra ni pide precios/.test(t('cargar')?.descripcion || ''))
chk('cargar dice que cada persona ve solo lo suyo', /solo las órdenes que cargó/.test(t('cargar')?.descripcion || ''))
chk('ver, anular y precios dicen que son de Administración', ['ver', 'anular', 'precios'].every(x => /Administración/.test(t(x)?.descripcion || '')))
chk('precios dice que ahí nace la deuda', /nace la deuda/.test(t('precios')?.descripcion || ''))
const claves = CATALOGO.flatMap(g => g.tareas || []).map(x => `${x.modulo}:${x.tarea}`)
chk('ninguna clave de retiros repetida en otro grupo', claves.filter(k => k.startsWith('retiros:')).length === 4)

fin()
