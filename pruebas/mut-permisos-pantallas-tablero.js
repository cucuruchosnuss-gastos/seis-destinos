// Mutaciones de test-permisos-pantallas-tablero.js (M2, M3, M4, M7, M8, B9;
// 11/10/2026). Las anclas viven en js/modulos.js, js/tablero.js y
// js/barra-lateral.js: el runner las muta ahí. De a una.
//
//   node pruebas/mut-permisos-pantallas-tablero.js
'use strict'

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-permisos-pantallas-tablero.js'),
  original: path.join(__dirname, '..', 'dashboard.html'),
  funciones: [],
  escape: 'escTab',
  manuales: [
    // M3 / M2: Administración por tarea
    { nombre: 'M3: Administración sin cobranzas:procesar', de: "    tambienConTareas: ['retiros:precios', 'cobranzas:procesar', 'cobranzas:ver_todo',", a: "    tambienConTareas: ['retiros:precios', 'cobranzas:ver_todo'," },
    { nombre: 'M3: Administración sin cobranzas:ver_todo', de: "    tambienConTareas: ['retiros:precios', 'cobranzas:procesar', 'cobranzas:ver_todo',", a: "    tambienConTareas: ['retiros:precios', 'cobranzas:procesar'," },
    { nombre: 'M2: Administración sin pedidos:configurar', de: "      'pedidos:configurar', 'cuentas_corrientes:alta_proveedor'],", a: "      'cuentas_corrientes:alta_proveedor']," },
    { nombre: 'M2: Administración sin alta_proveedor', de: "      'pedidos:configurar', 'cuentas_corrientes:alta_proveedor'],", a: "      'pedidos:configurar']," },
    { nombre: 'moduloVisible ignora tambienConTareas sin el módulo', de: '  if (!habilitado) return porTarea', a: '  if (!habilitado) return false' },
    { nombre: 'tambienConTareas para cualquiera', de: '  if (!habilitado) return porTarea', a: '  if (!habilitado) return true' },
    // M8: Stock con ver_costos
    { nombre: 'M8: Stock sin ver_costos', de: "    tambienConTareas: ['stock:ver_costos'],", a: '' },
    { nombre: 'M8: la tarjeta no abre Costos', de: "  if (u.tareas.some(t => tareas.has(t)) && !u.salvo.some(t => tareas.has(t))) return u.url", a: '' },
    { nombre: 'M8: Costos aunque tenga stock:ver', de: '&& !u.salvo.some(t => tareas.has(t))) return u.url', a: ') return u.url' },
    { nombre: 'M8: el tablero usa la url de siempre', de: "url: (esDispositivo && m.urlDispositivo) || urlDeModulo(m, ctx ?? {}) })", a: 'url: (esDispositivo && m.urlDispositivo) || m.url })' },
    { nombre: 'M8: la barra usa la url de siempre', de: "    .map(m => { const url = urlDeModulo(m, ctx ?? {}); return url === m.url ? m : { ...m, url } })\n", a: '' },
    // M4
    { nombre: 'M4: CC sin chequear ver_todo', de: "  if (!ctx.tieneTarea('cuentas_corrientes:ver_todo')) {", a: '  if (false) {' },
    // B9
    { nombre: 'B9: Ingreso sin chequear las tareas', de: "  if (!['materia_prima:cargar', 'materia_prima:ver_todo', 'materia_prima:editar_anular'].some(t => ctx.tieneTarea(t))) {", a: '  if (false) {' },
    { nombre: 'B9: Ingreso pide solo ver_todo', de: "  if (!['materia_prima:cargar', 'materia_prima:ver_todo', 'materia_prima:editar_anular'].some(t => ctx.tieneTarea(t))) {", a: "  if (!ctx.tieneTarea('materia_prima:ver_todo')) {" },
    // M7
    { nombre: 'M7: siempre a Administración', de: "  const urlCtrl = ctx.tieneTarea('cobranzas:procesar') ? 'modulos/administracion.html?seccion=cobranzas' : 'modulos/cobranzas.html'", a: "  const urlCtrl = 'modulos/administracion.html?seccion=cobranzas'" },
    { nombre: 'M7: siempre a Cobranzas', de: "  const urlCtrl = ctx.tieneTarea('cobranzas:procesar') ? 'modulos/administracion.html?seccion=cobranzas' : 'modulos/cobranzas.html'", a: "  const urlCtrl = 'modulos/cobranzas.html'" },
  ],
})
