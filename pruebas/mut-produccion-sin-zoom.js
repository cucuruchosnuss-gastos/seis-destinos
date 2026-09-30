// Mutaciones de test-produccion-sin-zoom.js (la planta sin zoom, 30/09/2026).
// Ver mutar.js (los tres guards: suite verde sobre el limpio, ancla única,
// mutación que cambia algo).
//
//   node pruebas/mut-produccion-sin-zoom.js
'use strict'
const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-produccion-sin-zoom.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/produccion.html'),
  funciones: [],
  manuales: [
    { nombre: 'el viewport deja agrandar',
      de: 'initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover', a: 'initial-scale=1, user-scalable=no, viewport-fit=cover' },
    { nombre: 'el viewport deja hacer zoom con los dedos',
      de: 'initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover', a: 'initial-scale=1, maximum-scale=1, viewport-fit=cover' },
    { nombre: 'vuelve "deslizar para recargar"',
      de: '    html, body { touch-action: manipulation; overscroll-behavior-y: none; }', a: '    html, body { touch-action: manipulation; }' },
    { nombre: 'vuelve el zoom por doble toque',
      de: '    html, body { touch-action: manipulation; overscroll-behavior-y: none; }', a: '    html, body { overscroll-behavior-y: none; }' },
    { nombre: 'el buscador de operarios vuelve a 15 px',
      de: 'flex: 1; height: 100%; font-size: 16px; color: var(--p-tinta); outline: none; }', a: 'flex: 1; height: 100%; font-size: 15px; color: var(--p-tinta); outline: none; }' },
    { nombre: 'el motivo de la receta vuelve a 15 px',
      de: 'border: 0; outline: none; font-size: 16px; background: transparent; }', a: 'border: 0; outline: none; font-size: 15px; background: transparent; }' },
    { nombre: 'el "hasta" del maestro vuelve a 14 px',
      de: 'padding: 0 8px; font-size: 16px; width: auto; border-radius: 8px; }', a: 'padding: 0 8px; font-size: 14px; width: auto; border-radius: 8px; }' },
    { nombre: 'el buscador del maestro vuelve a 15 px',
      de: '      padding: 0 10px; font-size: 16px; color: var(--p-tinta);\n    }', a: '      padding: 0 10px; font-size: 15px; color: var(--p-tinta);\n    }' },
    { nombre: 'recargar no pregunta nunca',
      de: '      if (!hayAlgoAMedioCargar()) { recargarPantalla(); return }', a: '      recargarPantalla(); return' },
    { nombre: 'recargar pregunta siempre',
      de: '      return VISTAS_A_MEDIO_CARGAR.includes(estado.vista)', a: '      return true' },
    { nombre: 'la pregunta no se pinta',
      de: '      estado.recargarPide = true\n      pintarLateral()', a: '      estado.recargarPide = true' },
    { nombre: 'la pregunta no dice lo que se pierde',
      de: 'Se pierde lo que estás cargando y todavía no mandaste.', a: '¿Seguro?' },
    { nombre: 'la barra no tiene "Recargar"',
      de: "        `<button type=\"button\" class=\"pr-lat__salir pr-lat__recargar\" id=\"pr-btn-recargar\" aria-label=\"Recargar\">${icono('recargar', 17)}<span>Recargar</span></button>` +\n", a: '' },
    { nombre: '"Sí, recargar" no recarga',
      de: '      estado.recargarPide = false\n      window.location.reload()', a: '      estado.recargarPide = false' },
    { nombre: '"No, seguir" no cierra',
      de: "        if (ev.target.closest('#pr-recargar-no')) { estado.recargarPide = false; pintarLateral(); return }", a: "        if (ev.target.closest('#pr-recargar-no')) { return }" },
    { nombre: 'la cierre de planilla no pregunta',
      de: "'pr-paradas', 'pr-cierre', 'pr-receta'", a: "'pr-paradas', 'pr-receta'" },
  ],
})
