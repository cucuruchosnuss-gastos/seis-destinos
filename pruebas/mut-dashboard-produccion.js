// Mutaciones de test-dashboard-produccion.js. Ver mutar.js (mismos guards:
// suite verde sobre el limpio, ancla única, la mutación cambia el archivo, el
// sub-proceso leyó el mutado). De a una.
//
//   node pruebas/mut-dashboard-produccion.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-dashboard-produccion.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'dashboard.html'),
  // Esta suite no dibuja HTML: no hay esc() que sacar. Todo va a mano.
  funciones: [],
  manuales: [
    // La tarjeta (parte 1 del módulo, ya cubierta).
    { nombre: 'la tarjeta de Producción abre otra pantalla', de: "url: 'modulos/produccion.html',\n        proximamente: false,\n        color: 'azul'", a: "url: 'modulos/stock.html',\n        proximamente: false,\n        color: 'azul'" },
    { nombre: 'la tarjeta deja de ser azul', de: "        url: 'modulos/produccion.html',\n        proximamente: false,\n        color: 'azul'", a: "        url: 'modulos/produccion.html',\n        proximamente: false,\n        color: 'verde'" },

    // ── Entrar derecho: el guard del BUCLE ───────────────────────────────
    // El más importante de esta lista. Sin la exigencia de una tarea, una
    // cuenta con el módulo y sin tareas rebota entre el dashboard y
    // produccion.html (que vuelve con su sinAcceso()) sin salida por la UI.
    { nombre: 'entra derecho sin mirar las tareas (el bucle)', de: "      return TAREAS_PRODUCCION.some(t => misTareas.has(t))", a: '      return true' },
    { nombre: 'le alcanza una tarea de cualquier módulo', de: "      return TAREAS_PRODUCCION.some(t => misTareas.has(t))", a: '      return misTareas.size > 0' },
    { nombre: 'falta una de las tres tareas', de: "const TAREAS_PRODUCCION = ['produccion:cargar', 'produccion:ver', 'produccion:configurar']", a: "const TAREAS_PRODUCCION = ['produccion:cargar', 'produccion:ver']" },

    // ── Entrar derecho: la marca de una vez por sesión ───────────────────
    { nombre: 'se entra derecho siempre, no una vez por sesión', de: "      if (yaFue) return false\n", a: '' },
    { nombre: 'redirige aunque no haya podido dejar constancia', de: '      if (recordado) {', a: '      if (true) {' },
    { nombre: 'no deja constancia de que entró derecho', de: "      try { sessionStorage.setItem('dashboard.directoProduccion', '1'); recordado = true } catch {}", a: '      try { recordado = true } catch {}' },

    // ── Entrar derecho: cuándo ───────────────────────────────────────────
    { nombre: 'entra derecho con más de un módulo visible', de: "      if (modulosVisibles.length !== 1 || modulosVisibles[0].clave !== 'produccion') return false", a: "      if (!modulosVisibles.length || modulosVisibles[0].clave !== 'produccion') return false" },
    { nombre: 'entra derecho con cualquier módulo único', de: "      if (modulosVisibles.length !== 1 || modulosVisibles[0].clave !== 'produccion') return false", a: '      if (modulosVisibles.length !== 1) return false' },
    { nombre: 'un admin entra derecho', de: '      if (esAdmin || esSuperAdmin) return false\n', a: '' },
    { nombre: 'un super_admin entra derecho', de: '      if (esAdmin || esSuperAdmin) return false', a: '      if (esAdmin) return false' },

    // ── Entrar derecho: cómo se navega ───────────────────────────────────
    { nombre: 'deja el dashboard en el historial (href y no replace)', de: "        window.location.replace('modulos/produccion.html')", a: "        window.location.href = 'modulos/produccion.html'" },
    { nombre: 'sigue dibujando el dashboard mientras navega', de: '        await new Promise(() => {})\n', a: '' },
  ],
})
