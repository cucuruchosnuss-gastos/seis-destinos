// Mutaciones de test-accesos-baja.js. Ver mutar.js (mismos guards). De a una.
//
//   node pruebas/mut-accesos-baja.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-accesos-baja.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos', 'accesos.html'),
  funciones: [],
  manuales: [
    { nombre: 'los usuarios incluyen a los dados de baja',
      de: '        .filter(e => e?.activo !== false)\n    }', a: '\n    }' },
    { nombre: 'los usuarios sacan también a los que no traen activo',
      de: '        .filter(e => e?.activo !== false)\n    }', a: '        .filter(e => e?.activo === true)\n    }' },
    { nombre: 'la consulta deja de traer activo',
      de: "select('id, nombre, rol, cuil, activo, auth_user_id,", a: "select('id, nombre, rol, cuil, auth_user_id," },
  ],
})
