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
    { nombre: 'un rótulo vuelve a 0.95rem', de: '    .pr-dato__rotulo { font-size: 1.125rem;', a: '    .pr-dato__rotulo { font-size: 0.95rem;' },
    { nombre: 'botones de 48 px', de: '      --pr-alto-boton: 56px;', a: '      --pr-alto-boton: 48px;' },
    // El ancla vieja era «font-size: 18px;\n    }»: dejó de existir cuando el
    // body ganó los colores de modo debajo. Va anclada a la línea de arriba,
    // que sí es del mismo bloque.
    { nombre: 'texto base de 16 px', de: '      --pr-alto-boton: 56px;\n      font-size: 18px;', a: '      --pr-alto-boton: 56px;\n      font-size: 16px;' },
    { nombre: 'sin permiso se queda', de: '      if (!puedeEntrar()) {\n        sinAcceso(', a: '      if (false) {\n        sinAcceso(' },
    { nombre: 'la barra de modos baja a 48 px', de: '      min-height: 64px; align-items: stretch;', a: '      min-height: 48px; align-items: stretch;' },
    { nombre: 'los modos no se reparten el ancho', de: '      flex: 1 1 0; min-width: 0; min-height: 56px;', a: '      flex: 0 0 auto; min-width: 0; min-height: 56px;' },
    { nombre: 'el nombre del modo pierde el espaciado', de: '      font: inherit; font-size: 1.375rem; font-weight: 800; letter-spacing: 0.1em;', a: '      font: inherit; font-size: 1.375rem; font-weight: 800;' },
  ],
})
