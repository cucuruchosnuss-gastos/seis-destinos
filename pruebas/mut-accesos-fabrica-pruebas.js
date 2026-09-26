// Mutaciones de test-accesos-fabrica-pruebas.js: saca cada filtro de la
// fábrica de pruebas, de a uno, y exige que la suite se ponga en rojo.
// Ver mutar.js.
//
//   node pruebas/mut-accesos-fabrica-pruebas.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

const RAIZ = path.join(__dirname, '..')

correrMutaciones({
  suite: path.join(__dirname, 'test-accesos-fabrica-pruebas.js'),
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/accesos.html'),
  // Sin mutaciones automáticas de esc(): el escapado lo cubre test-accesos-textos / xss.
  funciones: [],
  manuales: [
    { nombre: 'Usuarios y roles y las cifras no sacan a las personas de prueba',
      de: 'return sinPersonasDePrueba(estado.empleados.filter(e => e.auth_user_id), estado.fabrica)',
      a: 'return estado.empleados.filter(e => e.auth_user_id)' },
    { nombre: 'las unidades elegibles no sacan la de prueba',
      de: 'return sinUnidadesDePrueba(estado.maestros.unidadesNegocio, estado.fabrica)',
      a: 'return estado.maestros.unidadesNegocio' },
    { nombre: 'el alcance por unidad usa la lista sin filtrar',
      de: "${a.todas ? '' : unidadesElegibles().map(u =>",
      a: "${a.todas ? '' : estado.maestros.unidadesNegocio.map(u =>" },
    { nombre: 'el selector de unidad al aprobar usa la lista sin filtrar',
      de: '        unidadesElegibles().map(u => `<option',
      a: '        estado.maestros.unidadesNegocio.map(u => `<option' },
    { nombre: 'la consulta de empleados no trae unidad_negocio_id',
      de: 'rol_app, es_dispositivo, unidad_negocio_id, unidades_negocio!',
      a: 'rol_app, es_dispositivo, unidades_negocio!' },
    { nombre: 'init no guarda la fábrica en el estado',
      de: '      estado.fabrica = await fabricaPromesa\n',
      a: '      await fabricaPromesa\n' },
    { nombre: 'init no carga la fábrica',
      de: '      const fabricaPromesa = cargarFabricaDePruebas(supabase)\n',
      a: '      const fabricaPromesa = Promise.resolve(FABRICA_SIN_DATOS)\n' },
    { nombre: 'init carga la fábrica recién después de los módulos (sin paralelo)',
      de: '      const fabricaPromesa = cargarFabricaDePruebas(supabase)\n\n      const { data: modulosData, error: errorModulos } = await supabase\n        .from(\'modulos\')\n        .select(\'*\')\n        .eq(\'activo\', true)\n        .order(\'orden\')\n',
      a: '      const { data: modulosData, error: errorModulos } = await supabase\n        .from(\'modulos\')\n        .select(\'*\')\n        .eq(\'activo\', true)\n        .order(\'orden\')\n      const fabricaPromesa = cargarFabricaDePruebas(supabase)\n' },
    { nombre: 'init dibuja antes de tener la fábrica',
      de: '      estado.fabrica = await fabricaPromesa\n      await cargarTodo()\n',
      a: '      await cargarTodo()\n      estado.fabrica = await fabricaPromesa\n' },
  ],
})
