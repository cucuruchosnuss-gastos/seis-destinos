// Mutaciones de test-stock-recuento.js. Ver mutar.js (los tres guards: suite
// verde sobre el limpio, ancla única, mutación que cambia algo).
//
//   node pruebas/mut-stock-recuento.js
//
// Sin automáticas: los renders tocados ya están en el barrido de escapado del
// módulo; acá se rompe COMPORTAMIENTO, y cada mutación tiene que dar ROJO.

const path = require('path')
const { correrMutaciones } = require('./mutar')

const RAIZ = path.join(__dirname, '..')

correrMutaciones({
  suite: path.join(__dirname, 'test-stock-recuento.js'),
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/stock.html'),
  funciones: [],
  manuales: [
    // ── 1. La clave del resumen ───────────────────────────────────────────
    { nombre: 'el resumen previo al cierre no pide contenido_por_bulto (el bug)',
      de: "from('v_stock_por_lote')\n        .select('insumo_id, lote, contenido_por_bulto, saldo')",
      a: "from('v_stock_por_lote')\n        .select('insumo_id, lote, saldo')" },
    { nombre: 'claveSaldo pierde el tercer componente',
      de: "      return `${insumoId}|${lote ?? ''}|${contenido ?? ''}`",
      a: "      return `${insumoId}|${lote ?? ''}`" },
    // ── 2. El botón "0" ───────────────────────────────────────────────────
    { nombre: 'el botón "0" no marca sucio (no pasa por anotarCantidad)',
      de: '      ponerNumero(input, 0)\n      anotarCantidad(itemId, input.value)\n',
      a: '      ponerNumero(input, 0)\n      item.cantidad_contada = 0\n' },
    { nombre: 'el botón "0" no escribe el campo (no pasa por ponerNumero)',
      de: '      ponerNumero(input, 0)\n      anotarCantidad(itemId, input.value)\n',
      a: "      anotarCantidad(itemId, '0')\n" },
    { nombre: 'el botón "0" aparece en un recuento cerrado',
      de: "      const abierto = estado.recuento?.estado === 'abierto'",
      a: '      const abierto = true' },
    { nombre: 'el botón "0" no aparece nunca',
      de: "      const abierto = estado.recuento?.estado === 'abierto'",
      a: '      const abierto = false' },
    { nombre: 'el aria-label no escapa el nombre',
      de: 'aria-label="No hay: poner 0 en ${esc(i.nombre)}"',
      a: 'aria-label="No hay: poner 0 en ${i.nombre}"' },
    { nombre: 'el botón no queda deshabilitado después de tocarlo',
      de: '      if (cero) cero.disabled = item.cantidad_contada === 0\n', a: '' },
    { nombre: 'el renglón ya en 0 dibuja el botón habilitado',
      de: "${i.cantidad_contada === 0 ? 'disabled' : ''}>0</button>", a: '>0</button>' },
    { nombre: 'el botón no tiene listener',
      de: "        btn.addEventListener('click', () => ponerCeroRec(btn.dataset.cero))\n", a: '' },
    { nombre: 'el botón mide menos de 44px',
      de: '      min-height: 2.75rem;\n      padding: 0 0.75rem;', a: '      min-height: 2rem;\n      padding: 0 0.75rem;' },
    // ── Payload ───────────────────────────────────────────────────────────
    { nombre: 'guardar_conteo pierde la observación',
      de: "          observacion: i.observacion ?? '',\n", a: '' },
    // ── 3. El aviso ───────────────────────────────────────────────────────
    { nombre: 'el aviso no se agrega al texto del modal',
      de: '      cont.textContent += avisoRenglonSinPresentacion(insumo, lote, contenido)\n', a: '' },
    { nombre: 'el aviso ignora que el renglón ya está en 0',
      de: '        i.contenido_por_bulto === null && i.cantidad_contada !== 0)', a: '        i.contenido_por_bulto === null)' },
    { nombre: 'el aviso salta también al agregar sin presentación',
      de: "      if (contenido === null || contenido === undefined) return ''\n", a: '' },
  ],
})
