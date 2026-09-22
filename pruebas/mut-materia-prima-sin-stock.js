// Mutaciones de test-materia-prima-sin-stock.js. Ver mutar.js.
//
//   node pruebas/mut-materia-prima-sin-stock.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

const RAIZ = path.join(__dirname, '..')

correrMutaciones({
  suite: path.join(__dirname, 'test-materia-prima-sin-stock.js'),
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/materia-prima.html'),
  funciones: [],
  manuales: [
    { nombre: 'validarItems vuelve a exigir lote con la casilla marcada',
      de: "item.tipo === 'materia_prima' && !item.yaRecibido && !ingresoNoSumaStock(w)", a: "item.tipo === 'materia_prima' && !item.yaRecibido" },
    { nombre: 'el helper deja de mirar si es factura',
      de: 'return !!w && esFactura(w.encabezado?.tipoDoc) && !!w.sinStock', a: 'return !!w && !!w.sinStock' },
    { nombre: 'el helper deja de mirar la casilla',
      de: 'return !!w && esFactura(w.encabezado?.tipoDoc) && !!w.sinStock', a: 'return !!w && esFactura(w.encabezado?.tipoDoc)' },
    { nombre: 'el payload marca lote_ilegible cuando no hay lote',
      de: 'lote_ilegible: !!item.loteIlegible,', a: "lote_ilegible: !!item.loteIlegible || !String(item.lote || '').trim()," },
    { nombre: 'la tarjeta cerrada vuelve a mostrar "Sin lote" con la casilla',
      de: "        : ingresoNoSumaStock(estado.wizard) ? ''\n", a: '' },
    { nombre: 'la tarjeta abierta dice siempre OBLIGATORIO',
      de: "<div class=\"item-mp__bloque-label\">Lote ${ingresoNoSumaStock(estado.wizard)", a: "<div class=\"item-mp__bloque-label\">Lote ${false" },
    { nombre: 'la tarjeta abierta deja de dibujar el campo de lote con la casilla',
      de: "        : item.tipo === 'materia_prima'\n        ? `<div class=\"item-mp__bloque\">", a: "        : item.tipo === 'materia_prima' && !ingresoNoSumaStock(estado.wizard)\n        ? `<div class=\"item-mp__bloque\">" },
    { nombre: 'el bloque de la casilla se muestra también en remitos',
      de: "document.getElementById('wz-bloque-sin-stock').hidden = !esFactura(w.encabezado.tipoDoc)", a: "document.getElementById('wz-bloque-sin-stock').hidden = false" },
    { nombre: 'el render de la casilla no refleja si está marcada',
      de: "document.getElementById('campo-sin-stock').checked = !!w.sinStock", a: "document.getElementById('campo-sin-stock').checked = false" },
    { nombre: 'cambiar el tipo de documento no redibuja la casilla',
      de: "        btn.classList.toggle('wz-toggle--sel', btn.dataset.valor === valor)\n      })\n      renderizarBloqueSinStock()", a: "        btn.classList.toggle('wz-toggle--sel', btn.dataset.valor === valor)\n      })" },
    { nombre: 'entrar a Datos no dibuja la casilla',
      de: "if (id === 'datos')     { actualizarAvisoSinProveedor(); renderizarBloqueSinStock() }", a: "if (id === 'datos')     actualizarAvisoSinProveedor()" },
    { nombre: 'salir de Datos no pide el motivo',
      de: "        if (m.length < 3) return mostrarError('Escribí por qué esta mercadería no suma stock.')", a: "        if (false) return mostrarError('Escribí por qué esta mercadería no suma stock.')" },
    { nombre: 'la casilla no redibuja las tarjetas al cambiar',
      de: '      if (estado.wizard.items?.length) renderizarItems()\n', a: '' },
    { nombre: 'el detalle deja de pedir ingreso_id',
      de: ".select('id, ingreso_id, cantidad, lote,", a: ".select('id, cantidad, lote," },
    { nombre: 'el detalle muestra "Sin lote" también con sin_stock_motivo',
      de: "              : sinStock.has(item.ingreso_id) ? ''\n", a: '' },
  ],
})
