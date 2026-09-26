// Mutaciones de test-produccion-stock-retiros.js (lo que salió por retiros en
// el stock terminado de la gestión, 26/09/2026). Ver mutar.js y mutar-produccion.js.
//
//   node pruebas/mut-produccion-stock-retiros.js
//
// UN RUNNER POR VEZ: dos corridas en paralelo se pisan el mut-tmp-*.html.

const path = require('path')
const { correrMutacionesProduccion } = require('./mutar-produccion')

correrMutacionesProduccion({
  suite: path.join(__dirname, 'test-produccion-stock-retiros.js'),
  escape: 'esc',
  funciones: ['htmlRetirosStock'],
  equivalentes: [
    { expr: 'esc(fechaDelDia(m.fecha))', motivo: 'una fecha dd/mm/aaaa que arma el código' },
    { expr: 'esc(cuenta)', motivo: 'un número formateado y las palabras "salieron / volvieron" y "cajas"' },
    { expr: 'esc(r.nota)', motivo: 'texto constante del código' },
  ],
  manuales: [
    // Qué se pide
    { nombre: 'los movimientos sin orden_retiro_id', de: "select('presentacion_id, marca_id, lote, cajas, unidades, tipo, orden_retiro_id, fecha, motivo, created_at')", a: "select('presentacion_id, marca_id, lote, cajas, unidades, tipo, fecha, motivo, created_at')" },
    { nombre: 'las órdenes con el número en vez del código', de: "select('id, codigo, estado')", a: "select('id, numero, estado')" },
    { nombre: 'se piden todas las órdenes y no las de estas salidas', de: ".in('id', [...new Set(salidas.map(m => m.orden_retiro_id))])", a: '' },
    // El permiso
    { nombre: 'sin permiso se consulta igual', de: '      if (permiso !== false) {\n        try {\n          ordenes = await leer(', a: '      if (true) {\n        try {\n          ordenes = await leer(' },
    { nombre: 'sin saber el permiso no se intenta', de: '      if (permiso !== false) {\n        try {\n          ordenes = await leer(', a: '      if (permiso === true) {\n        try {\n          ordenes = await leer(' },
    { nombre: 'sin super_admin con bypass', de: "      if (estado.miRolApp === 'super_admin') return true\n      if (estado.retirosVer === undefined) return null", a: '      if (estado.retirosVer === undefined) return null' },
    { nombre: 'el alcance no se mira', de: '      return lista.includes(String(unidadId))\n    }\n\n    // En un navegador', a: '      return true\n    }\n\n    // En un navegador' },
    { nombre: 'sin leer el permiso: "no tiene"', de: "        console.error('permiso de retiros:', err)\n        estado.retirosVer = undefined", a: "        console.error('permiso de retiros:', err)\n        estado.retirosVer = null" },
    { nombre: 'el permiso de otro módulo', de: ".eq('modulo', 'retiros').eq('tarea', 'ver')", a: ".eq('modulo', 'stock').eq('tarea', 'ver')" },
    { nombre: 'el permiso no se carga al entrar', de: '      await cargarPermisoRetiros()\n', a: '' },
    // El código
    { nombre: 'sin permiso se inventa un código', de: "      if (info.permiso === false) return { codigo: null, nota: 'sin permiso para ver el código' }", a: "      if (info.permiso === false) return { codigo: `N-${String(id).slice(-4)}`, nota: '' }" },
    { nombre: 'un error de la consulta se toma como "sin permiso"', de: "      if (info.error) return { codigo: null, nota: 'no se pudo leer el código' }", a: "      if (info.error) return { codigo: null, nota: 'sin permiso para ver el código' }" },
    { nombre: 'la anulada no se marca', de: "anulada: o.estado === 'anulada'", a: 'anulada: false' },
    { nombre: 'un código que no llegó se inventa', de: "      return { codigo: null, nota: 'no se pudo leer el código' }\n    }", a: "      return { codigo: 'N-0000', nota: '' }\n    }" },
    // Qué se lista
    { nombre: 'un ajuste que no es de un retiro se lista', de: '(movs ?? []).filter(m => m.orden_retiro_id && (m.tipo', a: '(movs ?? []).filter(m => (m.orden_retiro_id || m.tipo === \'ajuste\') && (m.tipo' },
    { nombre: 'las anulaciones no se listan', de: "(m.tipo === 'despacho' || m.tipo === 'ajuste')", a: "(m.tipo === 'despacho')" },
    { nombre: 'lo más viejo primero', de: 'String(b.fecha).localeCompare(String(a.fecha))', a: 'String(a.fecha).localeCompare(String(b.fecha))' },
    { nombre: 'mismo día sin desempate por la hora', de: " || String(b.created_at ?? '').localeCompare(String(a.created_at ?? ''))", a: '' },
    { nombre: 'la anulación se dice como un retiro', de: '        const vuelve = m.tipo === \'ajuste\'\n', a: '        const vuelve = false\n' },
    { nombre: 'las cajas con signo', de: 'textoEntero(Math.abs(n))', a: 'textoEntero(n)' },
    { nombre: 'unas cajas que no llegaron son cero', de: "${n === null ? '—' : textoEntero(Math.abs(n))}", a: '${textoEntero(Math.abs(n ?? 0))}' },
    { nombre: 'el motivo de la anulación no se dice', de: "        const motivoRetiro = vuelve && m.motivo ?", a: '        const motivoRetiro = false ?' },
    { nombre: 'sin permiso no se explica arriba', de: "      const avisoPermisoRetiros = info.permiso === false\n", a: '      const avisoPermisoRetiros = false\n' },
    { nombre: 'sin salidas igual se dibuja', de: '      if (!salidas.length) return \'\'\n      const avisoPermisoRetiros', a: '      const avisoPermisoRetiros' },
    { nombre: 'sin salidas igual se consulta', de: '      if (!salidas.length) return\n      const unidad = estado.stockUnidad', a: '      const unidad = estado.stockUnidad' },
    { nombre: 'la sección no se limpia al recargar', de: "      cajaRetiros.innerHTML = ''\n", a: '' },
    { nombre: 'la respuesta de otra unidad pisa', de: '      if (estado.stockUnidad !== unidad) return\n      cajaRetiros.innerHTML', a: '      cajaRetiros.innerHTML' },
  ],
})
