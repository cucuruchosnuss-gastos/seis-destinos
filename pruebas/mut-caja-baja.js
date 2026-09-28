// Mutaciones de test-caja-baja.js. Ver mutar.js (mismos guards: suite verde
// sobre el limpio, ancla única, la mutación cambia el archivo, el sub-proceso
// leyó el mutado). De a una.
//
//   node pruebas/mut-caja-baja.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-caja-baja.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos', 'caja.html'),
  funciones: [],
  manuales: [
    { nombre: 'la contraparte no saca a los dados de baja',
      de: '      candidatos = candidatos.filter(c => c?.activo !== false)\n', a: '' },
    { nombre: 'la contraparte saca también a los que no traen activo',
      de: 'candidatos = candidatos.filter(c => c?.activo !== false)', a: 'candidatos = candidatos.filter(c => c?.activo === true)' },
    { nombre: 'el filtro va después de sumar a Empresa (Empresa desaparece)',
      de: "        candidatos = [...candidatos, { id: estado.idEmpresa, nombre: estado.nombresEmpleados[estado.idEmpresa] }]\n      }\n",
      a: "        candidatos = [...candidatos, { id: estado.idEmpresa, nombre: estado.nombresEmpleados[estado.idEmpresa] }]\n      }\n      candidatos = candidatos.filter(c => c?.activo !== false && c.id !== estado.idEmpresa)\n" },
    { nombre: 'los super admins sin traer activo',
      de: "select('id, nombre, tipo, caja_raiz, oculto_como_contraparte, activo')", a: "select('id, nombre, tipo, caja_raiz, oculto_como_contraparte')" },
    { nombre: 'los super admins filtran activo en la consulta',
      de: "oculto_como_contraparte, activo').eq('rol_app', 'super_admin')", a: "oculto_como_contraparte, activo').eq('rol_app', 'super_admin').eq('activo', true)" },
    { nombre: 'el mapa de nombres vuelve a filtrar activos',
      de: ".select('id, nombre, unidad_negocio_id')\n", a: ".select('id, nombre, unidad_negocio_id').eq('activo', true)\n" },
  ],
})
