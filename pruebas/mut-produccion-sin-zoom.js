// Mutaciones de test-produccion-sin-zoom.js (la planta sin zoom, 30/09/2026,
// y el deslizar para recargar de vuelta, 01/10/2026). Ver mutar.js (los tres
// guards: suite verde sobre el limpio, ancla única, mutación que cambia algo).
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
    { nombre: 'vuelve el zoom por doble toque',
      de: '    html, body { touch-action: manipulation; }', a: '    html, body { touch-action: auto; }' },
    { nombre: 'se vuelve a bloquear el deslizar para recargar',
      de: '    html, body { touch-action: manipulation; }', a: '    html, body { touch-action: manipulation; }\n    body { overscroll-behavior-y: none; }' },
    { nombre: 'el buscador de operarios vuelve a 15 px',
      de: 'flex: 1; height: 100%; font-size: 16px; color: var(--p-tinta); outline: none; }', a: 'flex: 1; height: 100%; font-size: 15px; color: var(--p-tinta); outline: none; }' },
    { nombre: 'el motivo de la receta vuelve a 15 px',
      de: 'border: 0; outline: none; font-size: 16px; background: transparent; }', a: 'border: 0; outline: none; font-size: 15px; background: transparent; }' },
    { nombre: 'el "hasta" del maestro vuelve a 14 px',
      de: 'padding: 0 8px; font-size: 16px; width: auto; border-radius: 8px; }', a: 'padding: 0 8px; font-size: 14px; width: auto; border-radius: 8px; }' },
    { nombre: 'el buscador del maestro vuelve a 15 px',
      de: '      padding: 0 10px; font-size: 16px; color: var(--p-tinta);\n    }', a: '      padding: 0 10px; font-size: 15px; color: var(--p-tinta);\n    }' },
    { nombre: 'la barra parada reserva la columna de "Recargar"',
      de: 'grid-template-areas: "otro quien reloj salir" "nav nav nav nav";', a: 'grid-template-areas: "otro quien reloj recargar salir" "nav nav nav nav nav";' },
    // Lo que queda a medio cargar.
    { nombre: 'al irse la página no se guarda nada',
      de: "      window.addEventListener('pagehide', guardarCargaAMedias)\n", a: '' },
    { nombre: 'el producto no guarda sus cajas',
      de: 'cajas: campo ? leerCampoNumero(campo) : null }', a: 'cajas: null }' },
    { nombre: 'el producto sin elegir también se guarda',
      de: "if (estado.vista === 'pr-agregar-prod' && a && !a.corrige && a.productoId && p?.turno?.id) {", a: "if (estado.vista === 'pr-agregar-prod' && a && !a.corrige && p?.turno?.id) {" },
    { nombre: 'corrigiendo un sublote también se guarda',
      de: "if (estado.vista === 'pr-agregar-prod' && a && !a.corrige && a.productoId && p?.turno?.id) {", a: "if (estado.vista === 'pr-agregar-prod' && a && a.productoId && p?.turno?.id) {" },
    { nombre: 'lo viejo del producto no se borra',
      de: "      } else guardarSesion(CLAVE_AGREGAR_A_MEDIAS, null)\n", a: '      }\n' },
    { nombre: 'la parada sin empezar también se guarda',
      de: "if (estado.vista === 'pr-paradas' && f?.turnoId && paradaNuevaEmpezada(f)) {", a: "if (estado.vista === 'pr-paradas' && f?.turnoId) {" },
    { nombre: 'la parada se guarda "mandando"',
      de: 'JSON.stringify({ ...f, enviando: false, errorBase: \'\', intentado: false })', a: 'JSON.stringify({ ...f })' },
    { nombre: 'se recupera en cualquier máquina',
      de: '      if (!g || g.turnoId !== turnoId) return null\n', a: '      if (!g) return null\n' },
    { nombre: 'se recupera más de una vez',
      de: '      guardarSesion(clave, null)\n      return g\n', a: '      return g\n' },
    { nombre: 'el producto no se recupera',
      de: '      if (aMedias?.campos?.productoId) {', a: '      if (false) {' },
    { nombre: 'las cajas no se recuperan',
      de: "        if (aMedias.cajas != null) ponerNumero(document.getElementById('pr-agregar-cajas'), aMedias.cajas)\n", a: '' },
    { nombre: 'la parada no se recupera',
      de: '        estado.paradaNueva = g ? { ...paradaNuevaVacia(p.turno), ...g } : paradaNuevaVacia(p.turno)', a: '        estado.paradaNueva = paradaNuevaVacia(p.turno)' },
    { nombre: 'un guardado roto traba',
      de: '      try { g = JSON.parse(crudo) } catch { g = null }', a: '      g = JSON.parse(crudo)' },
  ],
})
