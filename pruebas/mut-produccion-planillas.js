// Mutaciones de test-produccion-planillas.js (la lista "Planillas" de la
// gestión arranca en las cerradas, 08/10/2026). Ver mutar.js.
//
//   node pruebas/mut-produccion-planillas.js
//
// UN RUNNER POR VEZ: dos corridas en paralelo se pisan el mut-tmp-*.html.

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-produccion-planillas.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/produccion-gestion.html'),
  escape: 'esc',
  funciones: [],
  manuales: [
    { nombre: 'el menú vuelve a decir Historial', de: '<span class="pg-menu__txt">Planillas</span>', a: '<span class="pg-menu__txt">Historial</span>' },
    { nombre: 'el título vuelve a "Historial de producción"', de: '<h1 class="pr-titulo">Planillas</h1>', a: '<h1 class="pr-titulo">Historial de producción</h1>' },
    { nombre: 'volver del detalle dice Historial', de: 'id="pr-historial-detalle-volver">‹ Planillas</button>', a: 'id="pr-historial-detalle-volver">‹ Historial</button>' },
    { nombre: 'en el HTML viene marcada Todas', de: 'data-historial-estado="cerrado" aria-pressed="true"', a: 'data-historial-estado="cerrado" aria-pressed="false"' },
    { nombre: 'sin el botón Abiertas', de: '              <button type="button" class="pg-seg__op" data-historial-estado="abierto" aria-pressed="false">Abiertas</button>\n', a: '' },
    { nombre: 'Todas primero', de: '              <button type="button" class="pg-seg__op" data-historial-estado="" aria-pressed="false">Todas</button>\n', a: '' },
    { nombre: 'botones chicos', de: '.pr-historial-estados .pg-seg__op { min-height: 44px; }', a: '.pr-historial-estados .pg-seg__op { min-height: 32px; }' },
    { nombre: 'arranca en Todas', de: "hasta: hoy, maquina: '', estado: 'cerrado' }", a: "hasta: hoy, maquina: '', estado: '' }" },
    { nombre: 'entrar desde el menú no vuelve a Cerradas', de: "      if (!filtro) estado.historial.estado = 'cerrado'\n", a: '' },
    { nombre: 'entrar con filtro también pisa a Cerradas', de: "      if (!filtro) estado.historial.estado = 'cerrado'", a: "      estado.historial.estado = 'cerrado'" },
    { nombre: 'mostrar no pinta el segmentado', de: '      pintarEstadosHistorial()\n      document.getElementById(\'pr-historial-detalle\').hidden = true', a: "      document.getElementById('pr-historial-detalle').hidden = true" },
    { nombre: 'el segmentado marca todos', de: "b.dataset.historialEstado === actual ? 'true' : 'false'", a: "'true'" },
    { nombre: 'el segmentado no desmarca', de: "b.dataset.historialEstado === actual ? 'true' : 'false'", a: "b.dataset.historialEstado === actual ? 'true' : b.getAttribute('aria-pressed')" },
    { nombre: 'el toque no cambia el estado', de: '        estado.historial.estado = b.dataset.historialEstado\n', a: '' },
    { nombre: 'el toque deja marcado "Planillas pendientes"', de: '        estado.historial.desdePendientes = false\n        pintarEstadosHistorial(); pintarMenuActivo(); cargarHistorial()', a: '        pintarEstadosHistorial(); pintarMenuActivo(); cargarHistorial()' },
    { nombre: 'el toque no recarga', de: 'pintarEstadosHistorial(); pintarMenuActivo(); cargarHistorial()', a: 'pintarEstadosHistorial(); pintarMenuActivo()' },
    { nombre: 'el estado elegido no filtra la consulta', de: "        if (h.estado) q = q.eq('estado', h.estado)\n", a: '' },
  ],
})
