// Mutaciones de test-produccion-abrir-pendiente.js (abrir un turno con una
// planilla pendiente de completar). Ver mutar.js.
//
//   node pruebas/mut-produccion-abrir-pendiente.js

const path = require('path')
const { correrMutacionesProduccion } = require('./mutar-produccion')

correrMutacionesProduccion({
  suite: path.join(__dirname, 'test-produccion-abrir-pendiente.js'),
  escape: 'esc',
  funciones: ['htmlPendientesAbrir'],
  equivalentes: [
    { expr: 'esc(titulo)', motivo: 'titulo es "Hay N planilla(s) pendiente(s)…" con N contado en el cliente: no hay texto de la base adentro' },
  ],
  manuales: [
    // ── La pendiente NO ocupa la máquina ────────────────────────────────
    { nombre: 'el tablero trae también las pendientes como abiertas', de: "        .eq('unidad_negocio_id', unidadId).eq('estado', 'abierto')\n      if (e2) throw e2", a: "        .eq('unidad_negocio_id', unidadId).in('estado', ['abierto', 'pendiente_completar'])\n      if (e2) throw e2" },
    { nombre: 'Abrir turno no ofrece las libres', de: "      const ofrecibles = (estado.tablero ?? []).filter(e => !e.turno || esDeAyer(e, hoy))", a: "      const ofrecibles = (estado.tablero ?? []).filter(e => e.turno && esDeAyer(e, hoy))" },
    { nombre: 'Abrir turno ofrece también las abiertas de hoy', de: "      const ofrecibles = (estado.tablero ?? []).filter(e => !e.turno || esDeAyer(e, hoy))", a: "      const ofrecibles = (estado.tablero ?? [])" },
    // ── Las pendientes al lado del error ────────────────────────────────
    { nombre: 'no se muestran las pendientes al fallar', de: "        if (!deRed) mostrarPendientesAlAbrir(form)\n", a: "\n" },
    { nombre: 'se leen las pendientes también con un corte de red', de: "        if (!deRed) mostrarPendientesAlAbrir(form)\n", a: "        mostrarPendientesAlAbrir(form)\n" },
    { nombre: 'el error de la base se tapa', de: "        err.textContent = deRed ? MENSAJE_ABRIR_SIN_RED : (e?.message || 'No se pudo abrir el turno.')", a: "        err.textContent = deRed ? MENSAJE_ABRIR_SIN_RED : 'No se pudo abrir el turno.'" },
    { nombre: 'confirmar no limpia las pendientes de antes', de: "      err.hidden = true\n      document.getElementById('pr-abrir-pendientes').innerHTML = ''\n      try {", a: "      err.hidden = true\n      try {" },
    { nombre: 'entrar a Abrir no limpia las pendientes de antes', de: "      document.getElementById('pr-abrir-error').hidden = true\n      document.getElementById('pr-abrir-pendientes').innerHTML = ''\n      pintarAbrir()", a: "      document.getElementById('pr-abrir-error').hidden = true\n      pintarAbrir()" },
    { nombre: 'una respuesta vieja se pinta igual', de: "      if (estado.abrir !== form) return\n      cont.innerHTML = htmlPendientesAbrir(", a: "      cont.innerHTML = htmlPendientesAbrir(" },
    { nombre: 'una lectura que falla rompe en vez de callar', de: "        console.warn('pendientes de completar (abrir):', err)\n        return\n", a: "        console.warn('pendientes de completar (abrir):', err)\n        lista = [{ id: 'inventada', lote: 0, maquina_id: null }]\n" },
    { nombre: 'sin pendientes dibuja un aviso vacío', de: "      const lista = pendientes ?? []\n      if (!lista.length) return ''\n      const nombre = id => (maquinas ?? []).find(m => m.id === id)?.nombre ?? 'Máquina'\n      const uno", a: "      const lista = pendientes ?? []\n      const nombre = id => (maquinas ?? []).find(m => m.id === id)?.nombre ?? 'Máquina'\n      const uno" },
    { nombre: 'el plural se pierde', de: "      const uno = lista.length === 1\n", a: "      const uno = true\n" },
    { nombre: 'el botón no lleva el id de la planilla', de: 'data-planilla="${esc(t.id)}">Completar', a: 'data-pendiente="${esc(t.id)}">Completar' },
    { nombre: 'nadie escucha los botones de las pendientes', de: "      document.getElementById('pr-abrir-pendientes').addEventListener('click', ev => {\n        const b = ev.target.closest('[data-planilla]'); if (b) { tocar(); abrirPlanilla(b.dataset.planilla) }\n      })\n", a: "" },
    { nombre: 'falta el contenedor en el HTML', de: '        <div id="pr-abrir-pendientes"></div>\n', a: '' },
  ],
})
