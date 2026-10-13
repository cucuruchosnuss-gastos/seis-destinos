// Mutaciones de test-permisos-pantallas-stock.js (M8 y B8, 11/10/2026). De a una.
//
//   node pruebas/mut-permisos-pantallas-stock.js
'use strict'

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-permisos-pantallas-stock.js'),
  original: path.join(__dirname, '..', 'modulos', 'stock.html'),
  funciones: [],
  manuales: [
    // M8
    { nombre: 'M8: con solo ver_costos, "sin acceso"', de: '      if (!verStock && !gestiona && !ajusta && !veCostos) {', a: '      if (!verStock && !gestiona && !ajusta) {' },
    { nombre: 'M8: no abre derecho en Costos', de: "      const inicial = desdeUrl === 'traspaso' ? 'stock' : (desdeUrl ?? (soloCostos ? 'costos' : vistas[0]))", a: "      const inicial = desdeUrl === 'traspaso' ? 'stock' : (desdeUrl ?? vistas[0])" },
    { nombre: 'M8: no carga los costos al abrir en Costos', de: "      if (inicial === 'costos') await cargarCostos()\n", a: '' },
    { nombre: 'M8: "Volver al stock" sin vista de stock', de: "      document.getElementById('btn-volver-de-costos').hidden = !verStock", a: "      document.getElementById('btn-volver-de-costos').hidden = false" },
    { nombre: 'M8: sin la pestaña Costos', de: '      const pestanaCostos = veCostos && !verStock && vistas.length > 0', a: '      const pestanaCostos = false' },
    { nombre: 'M8: pestaña Costos también con stock:ver', de: '      const pestanaCostos = veCostos && !verStock && vistas.length > 0', a: '      const pestanaCostos = veCostos && vistas.length > 0' },
    { nombre: 'M8: ?vista=costos no se acepta', de: "    const VISTAS_DESDE_URL = ['catalogo', 'costos', 'traspaso']", a: "    const VISTAS_DESDE_URL = ['catalogo', 'traspaso']" },
    { nombre: 'M8: veCostos sin la tarea', de: "      const veCostos = estado.miRolApp === 'super_admin' || estado.misTareas.has('stock:ver_costos')", a: "      const veCostos = estado.miRolApp === 'super_admin'" },
    { nombre: 'M8: veCostos para cualquiera', de: "      const veCostos = estado.miRolApp === 'super_admin' || estado.misTareas.has('stock:ver_costos')", a: '      const veCostos = true' },
    // B8
    { nombre: 'B8: la lista se lee sin mirar el permiso', de: "      if (!puedeTareaEn('retiros:precios', origen)) {\n        t.lista = null", a: "      if (false) {\n        t.lista = null" },
    { nombre: 'B8: precio_venta sin mirar el permiso', de: "      if (t.sinPermisoPrecio || !puedeTareaEn('retiros:precios', t.origenId)) { r.precioEstado = 'sin_permiso'; pintarPrecioTrp(r); return }\n", a: '' },
    { nombre: 'B8: el texto no dice que se escribe a mano', de: "      if (t.sinPermisoPrecio || r.precioEstado === 'sin_permiso') return TEXTO_SIN_PERMISO_PRECIO_TRP\n", a: '' },
    { nombre: 'B8: el alcance no cuenta (cualquier fábrica)', de: '      const alcance = estado.alcancesTareas?.get(clave)\n      if (alcance && alcance.todas === true) return true\n      return Array.isArray(alcance?.unidades) && alcance.unidades.map(String).includes(String(unidadId))', a: '      return true' },
    { nombre: 'B8: puedeTareaEn sin super_admin', de: "      if (estado.miRolApp === 'super_admin') return true\n      if (!estado.misTareas.has(clave)) return false\n      const alcance = estado.alcancesTareas?.get(clave)", a: "      if (!estado.misTareas.has(clave)) return false\n      const alcance = estado.alcancesTareas?.get(clave)" },
  ],
})
