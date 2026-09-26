// Mutaciones de test-empleados-fabrica-pruebas.js. Ver mutar.js.
// Cada una saca UNA llamada al filtro de la fábrica de pruebas (o rompe su
// cableado) y exige que la suite se ponga en rojo.
//
//   node pruebas/mut-empleados-fabrica-pruebas.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

const RAIZ = path.join(__dirname, '..')

correrMutaciones({
  suite: path.join(__dirname, 'test-empleados-fabrica-pruebas.js'),
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/empleados.html'),
  funciones: [],
  manuales: [
    { nombre: 'unidadesVisibles no filtra',
      de: 'return sinUnidadesDePrueba(estado.maestros.unidadesNegocio, estado.fabrica)',
      a: 'return estado.maestros.unidadesNegocio' },
    { nombre: 'personasVisibles no usa el filtro compartido',
      de: 'const lista = sinPersonasDePrueba(estado.empleados, f)',
      a: 'const lista = estado.empleados' },
    { nombre: 'personasVisibles no mira es_prueba',
      de: "return (f?.ok && !f.soyDePrueba) ? lista.filter(e => e?.es_prueba !== true) : lista",
      a: 'return lista' },
    { nombre: 'es_prueba se aplica aunque la fábrica no se haya leído',
      de: "return (f?.ok && !f.soyDePrueba) ? lista.filter(e => e?.es_prueba !== true) : lista",
      a: "return (!f?.soyDePrueba) ? lista.filter(e => e?.es_prueba !== true) : lista" },
    { nombre: 'es_prueba se aplica también a la cuenta de prueba',
      de: "return (f?.ok && !f.soyDePrueba) ? lista.filter(e => e?.es_prueba !== true) : lista",
      a: "return (f?.ok) ? lista.filter(e => e?.es_prueba !== true) : lista" },
    { nombre: 'las cifras cuentan a los robots',
      de: 'const personas  = personasVisibles().filter(e => !esDispositivo(e))',
      a: 'const personas  = estado.empleados.filter(e => !esDispositivo(e))' },
    // EQUIVALENTE, por eso no va: sacar solo unidadesVisibles() de
    // agruparEmpleados() no cambia nada visible, porque las personas de la
    // unidad robot ya las saca personasVisibles() y un grupo vacío no se
    // dibuja. El filtro de unidad queda ahí como segunda barrera.
    { nombre: 'los grupos se llenan con todas las personas',
      de: '      personasVisibles().forEach(emp => {',
      a: '      estado.empleados.forEach(emp => {' },
    { nombre: 'el selector de la edición ofrece todas las unidades',
      de: '${unidadesVisibles().map(u => `<option value="${esc(u.id)}" ${u.id === emp.unidad_negocio_id',
      a: '${estado.maestros.unidadesNegocio.map(u => `<option value="${esc(u.id)}" ${u.id === emp.unidad_negocio_id' },
    { nombre: 'la importación ofrece todas las unidades',
      de: '        unidadesVisibles().map(u => `<option value="${esc(u.id)}">${esc(u.nombre)}</option>`).join(\'\')',
      a: '        estado.maestros.unidadesNegocio.map(u => `<option value="${esc(u.id)}">${esc(u.nombre)}</option>`).join(\'\')' },
    { nombre: 'init no guarda la fábrica',
      de: '      estado.fabrica = await fabricaP\n', a: '      await fabricaP\n' },
    { nombre: 'init no carga la fábrica',
      de: '      const fabricaP = cargarFabricaDePruebas(supabase)', a: '      const fabricaP = Promise.resolve(FABRICA_SIN_DATOS)' },
    { nombre: 'la importación no usa las opciones filtradas',
      de: "innerHTML = htmlOpcionesEmpresaImport()", a: "innerHTML = ''" },
    { nombre: 'la consulta no trae es_prueba',
      de: 'es_dispositivo, es_prueba\')', a: 'es_dispositivo\')' },
  ],
})
