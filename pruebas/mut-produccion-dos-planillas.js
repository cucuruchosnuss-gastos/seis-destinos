// Mutaciones de test-produccion-dos-planillas.js (dos planillas abiertas en
// la misma tablet, y "Borrar" en cada parada, 07/10/2026). Ver mutar.js y
// mutar-produccion.js: cada mutación va al archivo donde está su código.
//
//   node pruebas/mut-produccion-dos-planillas.js
//
// UN RUNNER POR VEZ: dos corridas en paralelo se pisan el mut-tmp-*.html.

const path = require('path')
const { correrMutacionesProduccion } = require('./mutar-produccion')

correrMutacionesProduccion({
  suite: path.join(__dirname, 'test-produccion-dos-planillas.js'),
  escape: 'esc',
  funciones: [],
  manuales: [
    // La planilla que llega tarde.
    { nombre: 'recargarPlanilla pisa sin mirar', de: '      const l = await leerPlanilla(turnoId)\n      if (!planillaSigue(turnoId, pedido)) return\n      estado.planilla = ', a: '      const l = await leerPlanilla(turnoId)\n      estado.planilla = ' },
    { nombre: 'planillaSigue siempre dice que sí', de: "      return estado.pedidoPlanilla === pedido && String(estado.planilla?.turno?.id ?? '') === String(turnoId)", a: '      return true' },
    { nombre: 'planillaSigue mira solo el turno', de: "      return estado.pedidoPlanilla === pedido && String(estado.planilla?.turno?.id ?? '') === String(turnoId)", a: "      return String(estado.planilla?.turno?.id ?? '') === String(turnoId)" },
    { nombre: 'repintarConCola pisa sin mirar', de: '      if (!planillaSigue(turnoId, pedido)) return\n      estado.planilla = { ...planillaConCola(estado.planilla)', a: '      estado.planilla = { ...planillaConCola(estado.planilla)' },
    { nombre: 'el tiempo real de Agregar y Cierre pisa sin mirar', de: '          if (planillaSigue(turnoId, pedido)) estado.planilla = ', a: '          estado.planilla = ' },
    // Borrar.
    { nombre: 'la parada no tiene "Borrar"', de: "          borrar + '</div>'", a: "          '</div>'" },
    { nombre: 'una parada en la cola también se ofrece borrar', de: "        const borrar = String(p.id ?? '').startsWith('cola:') ? ''", a: "        const borrar = false ? ''" },
    { nombre: 'Borrar no cierra la ventana', de: "if (b) { cerrarVentanaParadas(); return abrirEditorDesdePlanilla('borrar', b.dataset.paradaBorrar) }", a: "if (b) abrirEditorDesdePlanilla('borrar', b.dataset.paradaBorrar)" },
    // La gestión.
    { nombre: 'gestión: Borrar sigue escondido en Corregir', de: "      return (acciones?.editar ? `<button type=\"button\" class=\"pr-btn pr-btn--secundario pr-renglon__accion\" data-parada-editar=\"${esc(p.id)}\">Corregir</button>` : '') +", a: "      if (acciones?.editar) return `<button type=\"button\" class=\"pr-btn pr-btn--secundario pr-renglon__accion\" data-parada-editar=\"${esc(p.id)}\">Corregir</button>`\n      return '' +" },
  ],
})
