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
    // La tarjeta.
    { nombre: 'la tarjeta de Producción abre otra pantalla', de: "url: 'modulos/produccion-gestion.html',", a: "url: 'modulos/stock.html'," },
    { nombre: 'la tarjeta de una persona abre la planta', de: "url: 'modulos/produccion-gestion.html',", a: "url: 'modulos/produccion.html'," },
    { nombre: 'la tarjeta no sabe a dónde llevar a una tablet', de: "        urlDispositivo: 'modulos/produccion.html',\n", a: '' },
    { nombre: 'el enlace ignora urlDispositivo', de: 'href="${(esDispositivo && modulo.urlDispositivo) || modulo.url}"', a: 'href="${modulo.url}"' },
    { nombre: 'la tarjeta deja de ser azul', de: "        proximamente: false,\n        color: 'azul'", a: "        proximamente: false,\n        color: 'verde'" },

    // ── Entrar derecho: el guard del BUCLE ───────────────────────────────
    // Sin la exigencia de una tarea, una tablet sin tareas rebota entre el
    // dashboard y la planta (que vuelve con su sinAcceso()) sin salida.
    { nombre: 'entra derecho sin mirar las tareas (el bucle)', de: "      return TAREAS_PRODUCCION.some(t => misTareas.has(t))", a: '      return true' },
    { nombre: 'le alcanza una tarea de cualquier módulo', de: "      return TAREAS_PRODUCCION.some(t => misTareas.has(t))", a: '      return misTareas.size > 0' },
    { nombre: 'falta una de las tres tareas', de: "const TAREAS_PRODUCCION = ['produccion:cargar', 'produccion:ver', 'produccion:configurar']", a: "const TAREAS_PRODUCCION = ['produccion:cargar', 'produccion:ver']" },

    // ── Entrar derecho: quién ────────────────────────────────────────────
    { nombre: 'una persona también entra derecho a la planta', de: '      if (esDispositivo !== true) return false\n', a: '' },
    { nombre: 'cualquier valor verdadero es una tablet', de: '      if (esDispositivo !== true) return false', a: '      if (!esDispositivo) return false' },
    { nombre: 'la consulta no trae es_dispositivo', de: ".select('id, rol_app, es_dispositivo')", a: ".select('id, rol_app')" },
    { nombre: 'esDispositivo se decide con un valor verdadero cualquiera', de: 'const esDispositivo = miEmpleado.es_dispositivo === true', a: 'const esDispositivo = !!miEmpleado.es_dispositivo' },

    // ── Entrar derecho: cómo se navega ───────────────────────────────────
    { nombre: 'deja el dashboard en el historial (href y no replace)', de: "      window.location.replace('modulos/produccion.html')", a: "      window.location.href = 'modulos/produccion.html'" },
    { nombre: 'sigue dibujando el dashboard mientras navega', de: '      await new Promise(() => {})\n', a: '' },
  ],
})
