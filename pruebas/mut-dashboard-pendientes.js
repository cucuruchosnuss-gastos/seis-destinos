// Mutaciones de test-dashboard-pendientes.js. Ver mutar.js (mismos guards:
// suite verde sobre el limpio, ancla única, la mutación cambia el archivo, el
// sub-proceso leyó el mutado). De a una.
//
//   node pruebas/mut-dashboard-pendientes.js

const path = require('path')
// Reparte cada mutación entre dashboard.html y js/modulos.js: ver mutar-dashboard.js.
const { correrMutacionesDashboard } = require('./mutar-dashboard')

correrMutacionesDashboard({
  suite: path.join(__dirname, 'test-dashboard-pendientes.js'),
  // Desde el 29/09/2026 las burbujas de las tarjetas son el PIE de cada
  // tarjeta del tablero (js/tablero.js): las mutaciones de lo que se mudó
  // apuntan ahí (mutar-dashboard.js las reparte).
  funciones: [],
  escape: 'escDash',
  manuales: [
    { nombre: 'materia_prima mal mapeado', de: "materia_prima: 'materia-prima',", a: "materia_prima: 'materia_prima'," },
    { nombre: 'cuentas_corrientes sin mapear', de: "      cuentas_corrientes: 'cuentas-corrientes',\n", a: '' },
    { nombre: 'una cantidad null cuenta', de: "if (fila.cantidad === null || fila.cantidad === undefined || fila.cantidad === '' || !Number.isInteger(n) || n <= 0) continue", a: 'if (!Number.isInteger(n) || n < 0) continue' },
    { nombre: 'un módulo desconocido se usa tal cual', de: "if (!clave) { console.warn('mis_pendientes: módulo sin tarjeta', fila?.modulo); continue }", a: "if (!clave) continue" },
    { nombre: 'la tarjeta muestra la última clave y no la suma', de: '        actual.total += n\n', a: '        actual.total = n\n' },
    { nombre: 'el detalle no dice la cantidad', de: 'return `${fila.cantidad} ${frase}`', a: 'return frase' },
    { nombre: 'el escape no escapa comillas', de: ".replace(/\"/g, '&quot;')", a: '' },
    { nombre: 'cheques sin mapear', de: "      cheques: 'cheques',\n", a: '' },
    { nombre: 'produccion sin mapear (los conos no llegan a ninguna burbuja)', de: "      produccion: 'produccion',\n", a: '' },
    { nombre: 'produccion mapeado a otra tarjeta', de: "      produccion: 'produccion',", a: "      produccion: 'stock'," },
    { nombre: 'Cheques no pide tareas', de: "      if (!modulo.requiereTareas) return true\n", a: '      return true\n' },
    { nombre: 'Cheques cuelga de su propia clave y no de cobranzas', de: 'misModulos.includes(modulo.requiereModulo ?? modulo.clave)', a: 'misModulos.includes(modulo.clave)' },
    { nombre: 'super_admin no ve Cheques sin la fila', de: "      return esSuperAdmin || modulo.requiereTareas.some(t => misTareas.has(t))", a: "      return modulo.requiereTareas.some(t => misTareas.has(t))" },
    { nombre: 'Cheques acepta también cargar', de: "requiereTareas: ['cobranzas:ver_todo', 'cobranzas:procesar'],", a: "requiereTareas: ['cobranzas:ver_todo', 'cobranzas:procesar', 'cobranzas:cargar']," },
    // ── El pie de las tarjetas del tablero (js/tablero.js) ──────────────
    { nombre: 'un error de mis_pendientes no avisa (y el pie diría "Nada pendiente")', de: '    else m.pendError = true\n', a: '' },
    { nombre: 'un error de mis_pendientes deja números inventados', de: '    if (pend) m.resolver = [...(m.resolver ?? []), ...resolverDePendientes(clave, pend, visibles)]', a: "    m.resolver = [...(m.resolver ?? []), ...resolverDePendientes(clave, pend ?? new Map([['caja:solicitudes_mi_caja', 3]]), visibles)]" },
    { nombre: 'la respuesta vieja pisa la nueva', de: '  if (estado.turnos.get(clave) !== turno) return false\n', a: '' },
    { nombre: 'el cero cuenta', de: '    if (!Number.isInteger(n) || n <= 0) continue\n    const k = ', a: '    if (!Number.isInteger(n) || n < 0) continue\n    const k = ' },
    { nombre: 'un texto se vuelve un número', de: '    if (!Number.isInteger(n) || n <= 0) continue\n    const k = ', a: '    if (n <= 0) continue\n    const k = ' },
    { nombre: 'un módulo sin tarjeta cae en cualquier tarjeta', de: '    if (destino !== clave) continue\n', a: '' },
    { nombre: 'no se recarga al volver a la pestaña', de: "if (doc.visibilityState === 'visible' && quieto()) cargarTodo()", a: 'if (false) cargarTodo()' },
    { nombre: 'el texto del pie sin escapar', de: '<span class="tb-res__t">${escTab(r.t)}</span>', a: '<span class="tb-res__t">${r.t}</span>' },
    { nombre: 'el pie no dice que no se pudo saber', de: "      ? '<div class=\"tb-pie__nota\">No se pudo saber qué hay pendiente.</div>'", a: "      ? ''" },
    { nombre: 'la tarjeta pierde su clave', de: 'data-tarjeta="${escTab(t.clave)}"', a: 'data-tarjeta=""' },
    { nombre: 'volver a cargar duplica el renglón', de: '    if (pend) m.resolver = [...(m.resolver ?? []), ...resolverDePendientes(clave, pend, visibles)]', a: '    if (pend) m.resolver = [...(m.resolver ?? []), ...resolverDePendientes(clave, pend, visibles), ...resolverDePendientes(clave, pend, visibles)]' },
  ],
})
