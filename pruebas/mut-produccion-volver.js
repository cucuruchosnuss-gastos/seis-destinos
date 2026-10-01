// Mutaciones de test-produccion-volver.js. Ver mutar.js. De a una.
//
//   node pruebas/mut-produccion-volver.js

const path = require('path')
const { correrMutacionesEnVarios } = require('./mutar')

const suite = path.join(__dirname, 'test-produccion-volver.js')
const RAIZ = path.join(__dirname, '..')

correrMutacionesEnVarios([
  {
    suite, original: path.join(RAIZ, 'modulos', 'produccion.html'), funciones: [], variable: 'ARCHIVO_TEST',
    manuales: [
      { nombre: 'el botón no se escucha', de: "      document.getElementById('pr-cab-volver').addEventListener('click', volverEnPlanta)\n", a: '' },
      { nombre: 'el ancho no es fijo', de: '      width: 112px; min-height: 44px; flex-shrink: 0; box-sizing: border-box;', a: '      min-height: 44px; flex-shrink: 0; box-sizing: border-box;' },
      { nombre: 'el Inicio también tiene botón', de: "      if (!v || VISTAS_INICIO.includes(v)) return null\n", a: "      if (!v) return null\n" },
      { nombre: 'Sala de masa vuelve a Producción', de: "      return estado.modo === 'masa' ? mostrarSala() : mostrarTablero()", a: "      return mostrarTablero()" },
      { nombre: 'el paso anterior es el mismo', de: "        if (i > 0) return { tipo: 'paso', texto: 'Atrás', paso: pasos[i - 1].clave }", a: "        if (i > 0) return { tipo: 'paso', texto: 'Atrás', paso: pasos[i].clave }" },
      { nombre: 'los pasos no vuelven al anterior', de: "      if (d.tipo === 'paso') { irAPasoAgregar(d.paso); return 'paso' }\n", a: '' },
      { nombre: 'no pregunta antes de salir', de: "      if (aMedioCargar()) {\n        pedirConfirmacion({ titulo: '¿Salir sin guardar?'", a: "      if (false) {\n        pedirConfirmacion({ titulo: '¿Salir sin guardar?'" },
      { nombre: 'abrir con máquinas no pregunta', de: "        case 'pr-abrir': return (estado.abrir?.filas ?? []).some(f => f.elegida && !f.bloqueada)\n", a: '' },
      { nombre: 'corregir no pregunta', de: '(estado.agregar.productoId || estado.agregar.corrige)', a: '(estado.agregar.productoId)' },
      { nombre: '"No" igual sale', de: '      if (si && c?.accion) return c.accion()', a: '      if (c?.accion) return c.accion()' },
      { nombre: 'la pregunta no se cierra', de: "      estado.confirma = null\n      pintarConfirma()\n      if (si && c?.accion)", a: "      pintarConfirma()\n      if (si && c?.accion)" },
      { nombre: 'mostrarVista deja la pregunta', de: '      if (estado.confirma) { estado.confirma = null; pintarConfirma() }\n', a: '' },
      { nombre: 'pintarAgregar no repinta el botón', de: '      // "‹ Atrás" o "‹ Inicio" según el paso.\n      pintarVolver()\n', a: '' },
      { nombre: 'el botón se ve sin barra', de: "      const d = lateralVisible() ? destinoVolver() : null", a: "      const d = destinoVolver()" },
      { nombre: 'el texto no cambia', de: "      document.getElementById('pr-cab-volver-texto').textContent = d.texto\n", a: '' },
    ],
  },
])
