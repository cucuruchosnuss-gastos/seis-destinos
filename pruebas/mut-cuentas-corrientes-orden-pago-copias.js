// Mutaciones de test-cuentas-corrientes-orden-pago-copias.js (la orden de
// pago sin librador y más compacta, 23/10/2026; desde el 30/10/2026 en UNA
// sola hoja, sin ORIGINAL/DUPLICADO: las mutaciones de las copias son ahora
// las que las vuelven a poner).
// Ver mutar.js. Las de esc() de htmlOrdenPago las miden -pago-mixto y -xss
// (con marcas en cada dato); acá van solo las de este pedido.
// 31/10/2026 (rama ci-prueba/orden-pago-a4): re-ancladas a la hoja A4 de
// dos columnas (mismo sentido de cada mutación).
//
//   node pruebas/mut-cuentas-corrientes-orden-pago-copias.js
'use strict'
const path = require('path')
const { correrMutacionesEnVarios } = require('./mutar')

const RAIZ = path.join(__dirname, '..')
const SUITE = path.join(__dirname, 'test-cuentas-corrientes-orden-pago-copias.js')

correrMutacionesEnVarios([
  {
    suite: SUITE,
    original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/cuentas-corrientes.html'),
    funciones: [],
    manuales: [
      // ── El librador ───────────────────────────────────────────────────────
      { nombre: 'vuelve la columna "Librador" (cabecera)', de: '<th>Fecha de pago</th><th class="op-num">Importe</th>', a: '<th>Fecha de pago</th><th>Librador</th><th class="op-num">Importe</th>' },
      { nombre: 'vuelve el librador en la fila del cheque', de: "<td>${esc(fechaOrden(c?.fecha_pago))}</td><td class=\"op-num\">${importeHtml(c?.importe)}</td>", a: "<td>${esc(fechaOrden(c?.fecha_pago))}</td><td>${esc((c?.librador ?? []).map(l => l?.nombre).join('; '))}</td><td class=\"op-num\">${importeHtml(c?.importe)}</td>" },
      // ── Una sola hoja (30/10/2026) ─────────────────────────────────────────
      { nombre: 'vuelve el rótulo ORIGINAL bajo el número', de: '            <div class="op-cab__dato">Fecha ${esc(fechaOrden(d?.fecha))}</div>\n          </div>', a: '            <div class="op-cab__dato">Fecha ${esc(fechaOrden(d?.fecha))}</div>\n            <div class="op-cab__copia">ORIGINAL</div>\n          </div>' },
      { nombre: 'vuelve el envoltorio de copias', de: '        <div class="op-cab">\n          <div class="op-cab__emisor">', a: '<div class="op-copia op-copia--original" data-copia="ORIGINAL"></div>\n        <div class="op-cab">\n          <div class="op-cab__emisor">' },
      { nombre: 'la cabecera dos veces (dos hojas)', de: '        <div class="op-cab">\n          <div class="op-cab__emisor">', a: '        <div class="op-cab"></div><div class="op-cab">\n          <div class="op-cab__emisor">' },
      { nombre: 'sin la firma de quien autorizó', de: '          <div class="op-firma">Autorizó</div>\n', a: '' },
      { nombre: 'sin la firma del proveedor', de: '          <div class="op-firma">Recibí conforme (proveedor) — firma y aclaración</div>\n', a: '' },
      // ── Se cancelan los siguientes comprobantes ───────────────────────────
      { nombre: 'con facturas igual dice "Pago a cuenta"', de: '      const filasFacturas = facturas.length\n', a: '      const filasFacturas = false\n' },
      { nombre: 'el aplicado muestra el importe de la factura', de: '<td class="op-num">${importeHtml(f?.aplicado)}</td>', a: '<td class="op-num">${importeHtml(f?.importe)}</td>' },
      { nombre: 'la factura sin su número', de: '<span class="op-nowrap">${esc(numeroParaMostrar(f?.numero))}</span>', a: '<span class="op-nowrap">—</span>' },
      { nombre: 'la factura sin su fecha', de: '<td>${esc(fechaOrden(f?.fecha))}</td>', a: '<td>—</td>' },
      { nombre: 'viajan también las facturas sin tildar', de: '        .filter(f => f.checked && centavosDe(f.monto) > 0)\n        .map(f => ({ factura_pendiente_id: f.id, monto_aplicado: centavosDe(f.monto) / 100 }))', a: '        .filter(f => centavosDe(f.monto) > 0)\n        .map(f => ({ factura_pendiente_id: f.id, monto_aplicado: centavosDe(f.monto) / 100 }))' },
      { nombre: 'viaja el saldo entero en vez de lo aplicado', de: '        .map(f => ({ factura_pendiente_id: f.id, monto_aplicado: centavosDe(f.monto) / 100 }))', a: '        .map(f => ({ factura_pendiente_id: f.id, monto_aplicado: centavosDe(f.saldo) / 100 }))' },
      { nombre: 'abrir la orden no la dibuja', de: '      hoja.innerHTML = htmlOrdenPago(res.data, { saldo, anteriores })\n', a: '' },
      // ── La hoja de impresión ──────────────────────────────────────────────
      { nombre: 'vuelve la regla del duplicado en otra hoja', de: '    .op-saldo-cuenta {', a: '    html.op-imprimiendo .op-copia--duplicado { display: block; break-before: page; }\n    .op-saldo-cuenta {' },
      { nombre: 'la letra de la hoja vuelve a 10.5pt', de: 'font-size: 8.5pt; line-height: 1.25;', a: 'font-size: 10.5pt; line-height: 1.35;' },
      { nombre: 'la letra de la tabla vuelve a 9.5pt', de: '.op-tabla { width: 100%; border-collapse: collapse; font-size: 7.5pt; }', a: '.op-tabla { width: 100%; border-collapse: collapse; font-size: 9.5pt; }' },
      { nombre: 'vuelve el aviso de las dos hojas en el modal', de: '      <div class="op-hoja-marco"><div class="op-hoja" id="orden-pago-hoja"></div></div>', a: '      <p class="op-nota-copias" id="nota-copias-orden">Se imprimen dos hojas iguales: ORIGINAL y DUPLICADO, las dos con las firmas.</p>\n      <div class="op-hoja-marco"><div class="op-hoja" id="orden-pago-hoja"></div></div>' },
      { nombre: 'imprimir no marca el html', de: "      raiz.classList.add('op-imprimiendo')\n", a: '' },
    ],
  },
])
