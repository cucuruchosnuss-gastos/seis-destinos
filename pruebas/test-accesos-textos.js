// Textos visibles de las tareas de Cobranzas en el CATALOGO_TAREAS de accesos.html.
//
// En Cobranzas los estados se muestran como "Por controlar" (registrada) y
// "Asentada" (procesada). El catálogo es lo que lee quien reparte permisos, así
// que no puede seguir hablando de "procesada"/"registrada". Las CLAVES no
// cambian: son las que viajan a empleado_tareas y al CHECK chk_tarea_valida.
//
// Uso: node pruebas/test-accesos-textos.js
//      ARCHIVO_TEST=otro.html node pruebas/test-accesos-textos.js
const fs = require('fs')
const path = require('path')
const { extraerConst } = require('./extraer.js')

const archivo = process.env.ARCHIVO_TEST
  ? path.resolve(process.env.ARCHIVO_TEST)
  : path.join(__dirname, '..', 'modulos', 'accesos.html')
const src = fs.readFileSync(archivo, 'utf8')
console.log(`leído ${archivo} (${src.length} bytes)`)

const CATALOGO_TAREAS = new Function(extraerConst(src, 'CATALOGO_TAREAS') + '\nreturn CATALOGO_TAREAS')()
if (!Array.isArray(CATALOGO_TAREAS)) throw new Error('CATALOGO_TAREAS no es un array')

let ok = 0, fallas = 0
function chk(nombre, cond) {
  if (cond) ok++
  else { fallas++; console.log('FALLA: ' + nombre) }
}

const tareas = CATALOGO_TAREAS.flatMap(g => g.tareas || []).filter(t => t.modulo === 'cobranzas')
chk('las claves de cobranzas son exactamente cargar, ver_todo, procesar, editar_anular',
  JSON.stringify(tareas.map(t => t.tarea).sort()) === JSON.stringify(['cargar', 'editar_anular', 'procesar', 'ver_todo']))

const PROHIBIDO = /procesad|registrad|Marcar cobranzas/i
for (const t of tareas) {
  chk(`${t.tarea}: tiene label y descripcion`, typeof t.label === 'string' && typeof t.descripcion === 'string')
  chk(`${t.tarea}: el label no usa las palabras viejas (${t.label})`, !PROHIBIDO.test(t.label || ''))
  chk(`${t.tarea}: la descripcion no usa las palabras viejas`, !PROHIBIDO.test(t.descripcion || ''))
}

const porClave = Object.fromEntries(tareas.map(t => [t.tarea, t]))
chk('procesar se llama "Controlar y asentar cobranzas"', porClave.procesar?.label === 'Controlar y asentar cobranzas')
chk('editar_anular nombra el estado "por controlar" en el label', /por controlar/.test(porClave.editar_anular?.label || ''))
chk('editar_anular remite a la tarea por su label nuevo', (porClave.editar_anular?.descripcion || '').includes('"Controlar y asentar cobranzas"'))

console.log(`\n${ok} ok, ${fallas} fallas`)
process.exit(fallas ? 1 : 0)
