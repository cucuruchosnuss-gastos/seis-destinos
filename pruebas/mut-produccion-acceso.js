// Mutaciones de test-produccion-acceso.js (B1 de Producción). Ver mutar.js.
//
//   node pruebas/mut-produccion-acceso.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-produccion-acceso.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/produccion.html'),
  escape: 'esc',
  funciones: [],
  manuales: [
    { nombre: 'super_admin sin bypass', de: "return estado.miRolApp === 'super_admin' || estado.misTareas.has(tarea)", a: 'return estado.misTareas.has(tarea)' },
    { nombre: 'se entra solo con cargar', de: 'const puedeEntrar = () => TAREAS_PRODUCCION.some(tieneTarea)', a: "const puedeEntrar = () => tieneTarea('cargar')" },
    { nombre: 'todas:true no da todas', de: '      if (alcance && alcance.todas === true) return activas\n', a: '' },
    { nombre: 'la lista no se cruza con las activas', de: '      return activas.filter(id => lista.includes(id))', a: '      return lista' },
    // (Sacar el `if (!estado.misTareas.has(tarea)) return []` es EQUIVALENTE:
    // sin la tarea el alcance es undefined y la lista sale vacía igual.)
    { nombre: 'super_admin sin todas las unidades', de: "      if (estado.miRolApp === 'super_admin') return activas\n", a: '' },
    { nombre: 'lee tareas sin filtrar habilitado', de: ".eq('empleado_id', emp.id).eq('modulo', 'produccion').eq('habilitado', true)", a: ".eq('empleado_id', emp.id).eq('modulo', 'produccion')" },
    { nombre: 'sin permiso se queda', de: '      if (!puedeEntrar()) {\n        sinAcceso(', a: '      if (false) {\n        sinAcceso(' },
  ],
})
