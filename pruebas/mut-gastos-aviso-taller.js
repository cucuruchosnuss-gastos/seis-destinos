// Mutaciones del aviso del Taller en el wizard de Gastos (ver
// test-gastos-aviso-taller.js).
const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-gastos-aviso-taller.js'),
  original: path.join(__dirname, '..', 'modulos', 'gastos.html'),
  funciones: [],
  manuales: [
    { nombre: 'avisa también por Vehículos', de: '      if (viaVehiculos || !unidadSeleccionada) return false', a: '      if (!unidadSeleccionada) return false' },
    { nombre: 'avisa sin empresa elegida', de: '      if (viaVehiculos || !unidadSeleccionada) return false', a: '      if (viaVehiculos) return false' },
    { nombre: 'avisa con el Taller elegido', de: '      if (esUnidadTaller(unidadSeleccionada)) return false\n', a: '\n' },
    { nombre: 'avisa sin proyectos abiertos', de: '      if (!(estado.maestros.proyectos ?? []).length) return false\n', a: '\n' },
    { nombre: 'avisa aunque no pueda elegir el Taller', de: '      return !!unidadTallerElegible()\n    }', a: '      return true\n    }' },
    { nombre: 'otro texto', de: "const TEXTO_AVISO_TALLER = '¿Es de un proyecto del Taller? '", a: "const TEXTO_AVISO_TALLER = '¿Es del Taller? '" },
    { nombre: '"Elegí Taller." deja de ser un botón', de: "'<button type=\"button\" class=\"aviso-taller__link\" data-elegir-taller>Elegí Taller.</button>'", a: "'Elegí Taller.'" },
    { nombre: 'se pinta solo debajo de las empresas', de: "for (const id of ['aviso-taller-destino', 'aviso-taller-categoria']) {\n        const el", a: "for (const id of ['aviso-taller-destino']) {\n        const el" },
    { nombre: 'escondido queda con el texto adentro', de: "          : ''\n        el.hidden = !mostrar", a: "          : esc(TEXTO_AVISO_TALLER)\n        el.hidden = !mostrar" },
    { nombre: 'nunca se ve', de: '        el.hidden = !mostrar', a: '        el.hidden = true' },
    { nombre: '"Elegí Taller." no pone el Taller', de: '      unidadSeleccionada   = t.id\n', a: '\n' },
    { nombre: '"Elegí Taller." no avanza', de: "      unidadSeleccionada   = t.id\n      irASubpaso('categoria')", a: '      unidadSeleccionada   = t.id' },
    { nombre: '"Elegí Taller." deja el vehículo', de: '      vehiculoSeleccionado = null\n      vehiculoFueElegido   = false\n      viaVehiculos         = false\n      unidadSeleccionada   = t.id', a: '      viaVehiculos         = false\n      unidadSeleccionada   = t.id' },
    { nombre: 'la grilla no pinta el aviso', de: '      actualizarBotonDestinoSiguiente()\n      pintarAvisoTaller()', a: '      actualizarBotonDestinoSiguiente()' },
    { nombre: 'el paso Categoría no pinta el aviso', de: '        renderizarGrillaCategorias()\n        pintarAvisoTaller()', a: '        renderizarGrillaCategorias()' },
    { nombre: 'tocar "Elegí Taller." no hace nada', de: "if (ev.target.closest('[data-elegir-taller]')) elegirTaller()", a: "if (false) elegirTaller()" },
    { nombre: 'no va en chico', de: '      margin: 0.75rem 0 0;\n      font-size: 0.8125rem;', a: '      margin: 0.75rem 0 0;\n      font-size: 1rem;' },
  ],
})
