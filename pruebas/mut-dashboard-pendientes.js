// Mutaciones de test-dashboard-pendientes.js. Ver mutar.js (mismos guards:
// suite verde sobre el limpio, ancla única, la mutación cambia el archivo, el
// sub-proceso leyó el mutado). De a una.
//
//   node pruebas/mut-dashboard-pendientes.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-dashboard-pendientes.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'dashboard.html'),
  funciones: ['htmlBurbuja'],
  escape: 'escDash',
  manuales: [
    { nombre: 'materia_prima mal mapeado', de: "materia_prima: 'materia-prima',", a: "materia_prima: 'materia_prima'," },
    { nombre: 'cuentas_corrientes sin mapear', de: "      cuentas_corrientes: 'cuentas-corrientes',\n", a: '' },
    { nombre: 'un error deja la burbuja vieja', de: "      document.querySelectorAll('.tarjeta-modulo__burbuja').forEach(b => b.remove())\n", a: '' },
    { nombre: 'un error pinta lo que había', de: "        console.error('mis_pendientes:', err)\n        porModulo = null", a: "        console.error('mis_pendientes:', err)\n        return" },
    { nombre: 'la respuesta vieja pisa la nueva', de: '      if (turno !== turnoPendientes) return\n', a: '' },
    { nombre: 'el cero dibuja burbuja', de: "      if (!p || !(p.total > 0)) return ''", a: "      if (!p) return ''" },
    { nombre: 'una cantidad null cuenta', de: "if (fila.cantidad === null || fila.cantidad === undefined || fila.cantidad === '' || !Number.isInteger(n) || n <= 0) continue", a: 'if (!Number.isInteger(n) || n < 0) continue' },
    { nombre: 'un módulo desconocido se usa tal cual', de: "if (!clave) { console.warn('mis_pendientes: módulo sin tarjeta', fila?.modulo); continue }", a: "if (!clave) continue" },
    { nombre: 'sin aria-label', de: ' aria-label="${detalle}"', a: '' },
    { nombre: 'sin title', de: ' title="${detalle}"', a: '' },
    { nombre: 'sin tope 99+', de: "p.total > 99 ? '99+' : String(p.total)", a: 'String(p.total)' },
    { nombre: 'no se recarga al volver', de: "if (document.visibilityState === 'visible') cargarPendientes()", a: "if (false) cargarPendientes()" },
    { nombre: 'el detalle no dice la cantidad', de: 'return `${fila.cantidad} ${frase}`', a: 'return frase' },
    { nombre: 'el escape no escapa comillas', de: ".replace(/\"/g, '&quot;')", a: '' },
    { nombre: 'cheques sin mapear', de: "      cheques: 'cheques',\n", a: '' },
    { nombre: 'Cheques no pide tareas', de: "      if (!modulo.requiereTareas) return true\n", a: '      return true\n' },
    { nombre: 'Cheques cuelga de su propia clave y no de cobranzas', de: 'misModulos.includes(modulo.requiereModulo ?? modulo.clave)', a: 'misModulos.includes(modulo.clave)' },
    { nombre: 'super_admin no ve Cheques sin la fila', de: "      return esSuperAdmin || modulo.requiereTareas.some(t => misTareas.has(t))", a: "      return modulo.requiereTareas.some(t => misTareas.has(t))" },
    { nombre: 'Cheques acepta también cargar', de: "requiereTareas: ['cobranzas:ver_todo', 'cobranzas:procesar'],", a: "requiereTareas: ['cobranzas:ver_todo', 'cobranzas:procesar', 'cobranzas:cargar']," },
    { nombre: 'repintar duplica', de: "    function pintarBurbujas(porModulo) {\n      document.querySelectorAll('.tarjeta-modulo__burbuja').forEach(b => b.remove())", a: "    function pintarBurbujas(porModulo) {\n      if (!porModulo) document.querySelectorAll('.tarjeta-modulo__burbuja').forEach(b => b.remove())" },
  ],
})
