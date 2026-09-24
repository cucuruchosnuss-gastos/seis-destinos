// Mutaciones de test-accesos-pedidos.js. Ver mutar.js.
//
//   node pruebas/mut-accesos-pedidos.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-accesos-pedidos.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/accesos.html'),
  funciones: [],
  manuales: [
    { nombre: 'el grupo cuelga de produccion', de: "        modulos: ['pedidos'],", a: "        modulos: ['produccion'],\n        // x" },
    { nombre: 'ver sin alcance', de: "{ modulo: 'pedidos', tarea: 'ver',        label: 'Ver los pedidos de los clientes y su avance', conAlcance: true,", a: "{ modulo: 'pedidos', tarea: 'ver',        label: 'Ver los pedidos de los clientes y su avance'," },
    { nombre: 'cargar con otra clave', de: "{ modulo: 'pedidos', tarea: 'cargar',", a: "{ modulo: 'pedidos', tarea: 'carga'," },
    { nombre: 'configurar pide ver', de: "label: 'Dar de alta y editar los clientes y sus apodos', conAlcance: true,", a: "label: 'Dar de alta y editar los clientes y sus apodos', conAlcance: true, requiere: ['pedidos:ver']," },
    { nombre: 'la descripción de cargar pierde el "no se elige"', de: 'El estado pendiente / en producción / listo no se elige: lo decide el avance.', a: 'El estado se elige a mano.' },
    { nombre: 'vuelve el aviso del CHECK', de: '// Las tres están en el CHECK chk_tarea_valida desde el 23/09/2026', a: '// estas tres claves todavía NO están en el CHECK' },
  ],
})
