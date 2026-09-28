// El módulo Proyectos Taller en el CATALOGO_TAREAS de accesos.html
// (28/09/2026).
//
// Cuatro tareas —ver, cargar, gestionar, precios— SIN alcance, colgando del
// módulo 'taller' (la fila de la tabla modulos existe, orden 12). Las RPCs
// gatean con _puede_taller(tarea) = tiene_tarea('taller', tarea) o
// super_admin —verificado con pg_get_functiondef el 28/09/2026—, sin unidad:
// marcar conAlcance dibujaría un selector que nada aplica. Las cuatro están en
// chk_tarea_valida (51 claves); test-accesos-produccion.js compara el catálogo.
//
//   node pruebas/test-accesos-taller.js
'use strict'

const fs = require('fs')
const path = require('path')
const { extraerConst } = require('./extraer')
const { arnes } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/accesos.html')
const src = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${src.length} bytes)`)
const { chk, fin } = arnes()

const CATALOGO = new Function(extraerConst(src, 'CATALOGO_TAREAS') + '\nreturn CATALOGO_TAREAS')()
const grupo = CATALOGO.find(g => g.grupo === 'Proyectos Taller')
chk('hay grupo "Proyectos Taller"', !!grupo)
chk('el grupo cuelga del módulo taller', JSON.stringify(grupo?.modulos) === '["taller"]')
chk('tiene exactamente cuatro tareas', (grupo?.tareas || []).length === 4)
for (const tarea of ['ver', 'cargar', 'gestionar', 'precios']) {
  const t = (grupo?.tareas || []).find(x => x.modulo === 'taller' && x.tarea === tarea)
  chk(`taller:${tarea} está`, !!t)
  chk(`taller:${tarea} SIN alcance por unidad`, !t?.conAlcance)
  chk(`taller:${tarea} tiene label`, typeof t?.label === 'string' && t.label.length > 10)
  chk(`taller:${tarea} tiene descripción`, typeof t?.descripcion === 'string' && t.descripcion.length > 60)
  chk(`taller:${tarea} sin dependencias`, !t?.requiere)
  chk(`taller:${tarea} la descripción no trae < ni >`, !/[<>]/.test(t?.descripcion || ''))
}
const t = (x) => (grupo?.tareas || []).find(y => y.tarea === x)
chk('ver dice que no incluye precios', /Sin precios/.test(t('ver')?.descripcion || ''))
chk('gestionar dice que no incluye precios de venta', /No incluye precios/.test(t('gestionar')?.descripcion || ''))
chk('precios dice que sin ella no se ve ningún precio', /no ve ningún precio/.test(t('precios')?.descripcion || ''))
const claves = CATALOGO.flatMap(g => g.tareas || []).map(x => `${x.modulo}:${x.tarea}`)
chk('ninguna clave de taller repetida en otro grupo', claves.filter(k => k.startsWith('taller:')).length === 4)

// La tarea vieja de Gastos: sigue (el passthrough), pero dice que ya no se usa.
const vieja = CATALOGO.flatMap(g => g.tareas || []).find(x => x.modulo === 'gastos' && x.tarea === 'gestionar_proyectos')
chk('gastos:gestionar_proyectos sigue en el catálogo', !!vieja)
chk('y dice que ya no se usa y a dónde se mudó', /ya no se usa/.test(vieja?.label || '') && /Proyectos Taller/.test(vieja?.descripcion || ''))

fin()
