// Mutaciones de test-produccion-pestanas.js (las pestañas de las máquinas,
// 01/10/2026). Ver mutar.js y mutar-produccion.js.
//
//   node pruebas/mut-produccion-pestanas.js
//
// UN RUNNER POR VEZ: dos corridas en paralelo se pisan el mut-tmp-*.html.

const path = require('path')
const { correrMutacionesProduccion } = require('./mutar-produccion')

correrMutacionesProduccion({
  suite: path.join(__dirname, 'test-produccion-pestanas.js'),
  escape: 'esc',
  funciones: ['htmlPestanasMaquinas'],
  soloPlanta: ['htmlPestanasMaquinas'],
  manuales: [
    // El nombre corto.
    { nombre: 'el número sin la M', de: "      if (/^\\d+$/.test(resto)) return 'M' + resto\n", a: "      if (/^\\d+$/.test(resto)) return resto\n" },
    { nombre: 'sin nombre, vacío', de: "      if (!s) return 'Máq.'\n", a: "      if (!s) return ''\n" },
    // Qué pestañas.
    { nombre: 'pestañas en cualquier pantalla', de: '      if (!VISTAS_CON_PESTANAS.includes(estado.vista)) return null\n      const actualId', a: '      const actualId' },
    { nombre: 'sin Paradas en la lista', de: "const VISTAS_CON_PESTANAS = ['pr-planilla', 'pr-agregar-prod', 'pr-paradas', 'pr-cierre', 'pr-receta']", a: "const VISTAS_CON_PESTANAS = ['pr-planilla', 'pr-agregar-prod', 'pr-cierre', 'pr-receta']" },
    { nombre: 'la pendiente no tiene pestaña', de: '        if (p?.turno?.id === actualId) lista.unshift(', a: '        if (false) lista.unshift(' },
    { nombre: 'mientras carga no hay activa', de: '      return estado.planilla?.turno?.id ?? estado.planillaPedida ?? null', a: '      return estado.planilla?.turno?.id ?? null' },
    { nombre: 'la receta mira la planilla', de: "      if (estado.vista === 'pr-receta') return estado.salaTurno?.id ?? null\n", a: '' },
    { nombre: 'la activa no mira su planilla', de: '          ? !!paradaEnCurso(estado.planilla.paradas) : x.parada', a: '          ? x.parada : x.parada' },
    { nombre: 'nunca hay activa', de: '        const activa = x.turnoId === actualId\n', a: '        const activa = false\n' },
    // El HTML.
    { nombre: 'sin aria-current', de: "${x.activa ? ' aria-current=\"page\"' : ''} aria-label", a: "${''} aria-label" },
    { nombre: 'sin el puntito', de: "      (x.parada ? '<span class=\"pr-pest__punto\" aria-hidden=\"true\"></span>' : '') +", a: "      '' +" },
    { nombre: 'no se lee si está parada', de: "${x.parada ? ', parada' : ''}`", a: '`' },
    // La cabecera.
    { nombre: 'con pestañas sigue el contexto de texto', de: "      document.getElementById('pr-cab-ctx').hidden = conPestanas || !c.ctx", a: "      document.getElementById('pr-cab-ctx').hidden = !c.ctx" },
    { nombre: 'nunca se aprieta', de: "cab.classList?.toggle('pr-cab--apretada', n >= 3)", a: "cab.classList?.toggle('pr-cab--apretada', false)" },
    { nombre: 'apretada sigue la fecha', de: '    .pr-cab--apretada .pr-cab__reloj { display: none; }\n', a: '' },
    { nombre: 'las pestañas bajan de renglón', de: '.pr-cab__maquinas { display: flex; align-items: stretch; gap: 4px;', a: '.pr-cab__maquinas { display: flex; flex-wrap: wrap; align-items: stretch; gap: 4px;' },
    { nombre: 'la activa sin el naranja', de: '.pr-pest--activa { border: 2px solid var(--p-acento); background: var(--p-acento-suave);', a: '.pr-pest--activa { border: 2px solid var(--p-borde); background: var(--p-tarjeta);' },
    { nombre: 'el puntito en naranja', de: '.pr-pest__punto { width: 10px; height: 10px; border-radius: 50%; background: var(--p-mal);', a: '.pr-pest__punto { width: 10px; height: 10px; border-radius: 50%; background: var(--p-acento);' },
    { nombre: 'nadie escucha las pestañas', de: '        if (b) cambiarDeMaquina(b.dataset.pestanaTurno)\n', a: '' },
    // Cambiar de máquina.
    { nombre: 'la misma máquina vuelve a abrir', de: "      if (turnoId === turnoDePantalla()) return 'misma'\n", a: '' },
    { nombre: 'Paradas vuelve a la planilla', de: "        if (v === 'pr-paradas') return abrirPlanilla(turnoId, 'pr-paradas')\n", a: '' },
    { nombre: 'el cierre vuelve a la planilla', de: "          if (estado.planilla?.turno?.id === turnoId && estado.vista === 'pr-planilla') return mostrarCierre()\n", a: '' },
    { nombre: 'Lo producido vuelve a la planilla', de: "        if (v === 'pr-agregar-prod') return abrirLoProducido(turnoId)\n", a: '' },
    { nombre: 'a medio cargar no pregunta', de: '      if (aMedioCargar()) {\n        pedirConfirmacion({ titulo: \'¿Dejar esto sin guardar?\'', a: '      if (false) {\n        pedirConfirmacion({ titulo: \'¿Dejar esto sin guardar?\'' },
    { nombre: 'la sala no cambia de máquina', de: "      if (v === 'pr-receta') { await elegirMaquinaSala(turnoId); return 'sala' }", a: "      if (v === 'pr-receta') { return 'sala' }" },
    // La respuesta vieja no pisa.
    { nombre: 'una respuesta vieja pisa la planilla', de: '        // Otra pestaña tocada mientras esta cargaba: gana la última.\n        if (pedidoPlanilla !== estado.pedidoPlanilla) return\n', a: '' },
  ],
})
