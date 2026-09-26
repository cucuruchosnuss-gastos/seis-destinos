// Mutaciones de test-empleados-tablets.js. Ver mutar.js.
//
//   node pruebas/mut-empleados-tablets.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

const RAIZ = path.join(__dirname, '..')

correrMutaciones({
  suite: path.join(__dirname, 'test-empleados-tablets.js'),
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/empleados.html'),
  funciones: ['renderizarFilaEmpleado'],
  manuales: [
    { nombre: 'esDispositivo acepta cualquier valor verdadero',
      de: 'return emp?.es_dispositivo === true', a: 'return !!emp?.es_dispositivo' },
    { nombre: 'esDispositivo nunca da true',
      de: 'return emp?.es_dispositivo === true', a: 'return false' },
    { nombre: 'la consulta no trae es_dispositivo',
      de: 'contacto_emergencia_telefono, es_dispositivo', a: 'contacto_emergencia_telefono' },
    { nombre: 'la tablet cae en el grupo de su unidad',
      de: "        if (esDispositivo(emp)) {\n          tablets.push(emp)\n        } else if", a: "        if (false) {\n          tablets.push(emp)\n        } else if" },
    { nombre: 'el grupo de tablets no se agrega',
      de: "      if (tablets.length) grupos.push({ nombre: 'Tablets de la fábrica', lista: tablets })", a: '' },
    { nombre: 'el grupo de tablets va primero',
      de: "      if (tablets.length) grupos.push({ nombre: 'Tablets de la fábrica', lista: tablets })", a: "      if (tablets.length) grupos.unshift({ nombre: 'Tablets de la fábrica', lista: tablets })" },
    { nombre: 'la fila de la tablet es la de una persona',
      de: "    function renderizarFilaEmpleado(emp) {\n      if (esDispositivo(emp)) {", a: "    function renderizarFilaEmpleado(emp) {\n      if (false) {" },
    { nombre: 'la fila no dice Tablet',
      de: '<span class="chip-tablet">Tablet</span>\n            </div>\n            <div class="tarjeta-lista__subtitulo">Cuenta',
      a: '<span class="chip-tablet"></span>\n            </div>\n            <div class="tarjeta-lista__subtitulo">Cuenta' },
    { nombre: 'las cifras cuentan las tablets',
      de: 'const personas  = personasVisibles().filter(e => !esDispositivo(e))', a: 'const personas  = personasVisibles()' },
    { nombre: 'la ficha de la tablet pide el PIN igual',
      de: '      if (esDispositivo(emp)) return\n', a: '' },
    { nombre: 'la sección del PIN se dibuja para una tablet',
      de: "      if (esDispositivo(estado.empleados.find(e => e.id === p.empleadoId))) return ''\n", a: '' },
  ],
})
