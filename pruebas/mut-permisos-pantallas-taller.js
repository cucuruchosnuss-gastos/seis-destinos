// Mutaciones de test-permisos-pantallas-taller.js (B4, 11/10/2026). De a una.
//
//   node pruebas/mut-permisos-pantallas-taller.js
'use strict'

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-permisos-pantallas-taller.js'),
  original: path.join(__dirname, '..', 'modulos', 'taller.html'),
  funciones: [],
  manuales: [
    { nombre: 'B4: sin el aviso (entra con listas vacías)', de: '      if (!puedeVer()) { avisoFaltaVer(); return }\n', a: '' },
    { nombre: 'B4: el aviso pero sigue cargando', de: '      if (!puedeVer()) { avisoFaltaVer(); return }', a: '      if (!puedeVer()) { avisoFaltaVer() }' },
    { nombre: 'B4: puedeVer sin precios', de: "    const puedeVer = () => tieneTarea('ver') || tieneTarea('precios')", a: "    const puedeVer = () => tieneTarea('ver')" },
    { nombre: 'B4: puedeVer con cargar', de: "    const puedeVer = () => tieneTarea('ver') || tieneTarea('precios')", a: "    const puedeVer = () => tieneTarea('ver') || tieneTarea('precios') || tieneTarea('cargar')" },
    { nombre: 'B4: el aviso no se muestra', de: "      el.textContent = TEXTO_FALTA_VER\n      el.hidden = false", a: '      el.textContent = TEXTO_FALTA_VER' },
    { nombre: 'B4: el aviso no nombra el permiso', de: "Para ver los proyectos hace falta el permiso «Ver los proyectos del Taller».", a: 'No se pueden ver los proyectos.' },
    { nombre: 'B4: el aviso lo saca de la pantalla', de: '      if (!puedeVer()) { avisoFaltaVer(); return }', a: "      if (!puedeVer()) { sinAcceso('No tenés acceso a Proyectos Taller. Te llevamos al inicio…'); return }" },
  ],
})
