// Mutaciones de test-accesos-tablets.js. Ver mutar.js.
//
//   node pruebas/mut-accesos-tablets.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

const RAIZ = path.join(__dirname, '..')

correrMutaciones({
  suite: path.join(__dirname, 'test-accesos-tablets.js'),
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/accesos.html'),
  funciones: ['htmlTarjetaUsuario', 'renderizarUsuarios'],
  manuales: [
    { nombre: 'esDispositivo acepta cualquier valor verdadero',
      de: 'return emp?.es_dispositivo === true', a: 'return !!emp?.es_dispositivo' },
    { nombre: 'la consulta no trae es_dispositivo',
      de: 'rol_app, es_dispositivo, unidad_negocio_id, unidades_negocio', a: 'rol_app, unidad_negocio_id, unidades_negocio' },
    { nombre: 'las tablets se mezclan con las personas',
      de: 'const personas = lista.filter(e => !esDispositivo(e))', a: 'const personas = lista' },
    { nombre: 'las tablets no se dibujan',
      de: '${tablets.map(htmlTarjetaUsuario).join(\'\')}', a: '' },
    { nombre: 'la tarjeta de la tablet lleva chip de rol',
      de: "        const chip = tablet\n", a: "        const chip = false\n" },
    { nombre: 'la tablet muestra el CUIL en vez de qué es',
      de: "        const segundaLinea = tablet\n", a: "        const segundaLinea = false\n" },
    { nombre: 'las cifras cuentan la tablet',
      de: 'const conAcceso   = empleadosConAcceso().filter(e => !esDispositivo(e))', a: 'const conAcceso   = empleadosConAcceso()' },
    { nombre: 'los botones de la lista no se enganchan (quedan en htmlTarjetaUsuario)',
      de: "      cont.querySelectorAll('.btn-editar-usuario').forEach(btn => {\n        btn.addEventListener('click', () => abrirModalEditar(btn.dataset.id))\n      })\n",
      a: '' },
  ],
})
