// El módulo Pedidos en el CATALOGO_TAREAS de accesos.html (23/09/2026).
//
// Tres tareas —ver, cargar, configurar— con alcance por unidad, colgando del
// módulo 'pedidos' (la fila de la tabla modulos ya existe, orden 10). Las RPCs
// gatean con tiene_tarea_alcance() —verificado con pg_get_functiondef el
// 23/09/2026—, así que el alcance del catálogo tiene su otra mitad en el
// servidor y no es un selector que no restringe nada.
//
// Las tres están en chk_tarea_valida (leído con pg_get_constraintdef el
// 24/09/2026: 43 claves); test-accesos-produccion.js compara el catálogo
// contra esa lista entera.
//
//   node pruebas/test-accesos-pedidos.js

const fs = require('fs')
const path = require('path')
const { extraerConst } = require('./extraer')
const { arnes } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/accesos.html')
const src = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${src.length} bytes)`)
const { chk, fin } = arnes()

const CATALOGO = new Function(extraerConst(src, 'CATALOGO_TAREAS') + '\nreturn CATALOGO_TAREAS')()
const grupo = CATALOGO.find(g => g.grupo === 'Pedidos')
chk('hay grupo Pedidos', !!grupo)
chk('el grupo cuelga del módulo pedidos (guión: la clave de la tabla modulos es "pedidos")', JSON.stringify(grupo?.modulos) === '["pedidos"]')
chk('tiene exactamente tres tareas', (grupo?.tareas || []).length === 3)
for (const tarea of ['ver', 'cargar', 'configurar']) {
  const t = (grupo?.tareas || []).find(x => x.modulo === 'pedidos' && x.tarea === tarea)
  chk(`pedidos:${tarea} está`, !!t)
  chk(`pedidos:${tarea} con alcance por unidad`, t?.conAlcance === true)
  chk(`pedidos:${tarea} tiene label`, typeof t?.label === 'string' && t.label.length > 10)
  chk(`pedidos:${tarea} tiene descripción`, typeof t?.descripcion === 'string' && t.descripcion.length > 60)
  chk(`pedidos:${tarea} sin dependencias`, !t?.requiere)
  chk(`pedidos:${tarea} la descripción no trae comillas que rompan el globo`, !/[<>]/.test(t?.descripcion || ''))
}
const claves = CATALOGO.flatMap(g => g.tareas || []).map(t => `${t.modulo}:${t.tarea}`)
chk('ninguna clave de pedidos repetida en otro grupo', claves.filter(k => k.startsWith('pedidos:')).length === 3)
chk('el label de cargar dice que el estado no se elige', /no se elige/.test((grupo?.tareas || []).find(t => t.tarea === 'cargar')?.descripcion || ''))
chk('el label de configurar habla de los apodos', /apodos/.test((grupo?.tareas || []).find(t => t.tarea === 'configurar')?.label || ''))
chk('ya no queda el aviso de que falta el CHECK', !/todavía NO están en el CHECK/.test(src))

fin()
