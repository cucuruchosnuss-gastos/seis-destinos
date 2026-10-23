// Mutaciones de test-cuentas-corrientes-orden-pago-copias.js (la orden de
// pago con ORIGINAL y DUPLICADO, sin librador y más compacta, 23/10/2026).
// Ver mutar.js. Las de esc() de htmlOrdenPago las miden -pago-mixto y -xss
// (con marcas en cada dato); acá van solo las de este pedido.
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
      { nombre: 'vuelve el librador en la fila del cheque', de: "<td>${esc(fechaOrden(c.fecha_pago))}</td><td class=\"op-num\">${importeHtml(c.importe)}</td>", a: "<td>${esc(fechaOrden(c.fecha_pago))}</td><td>${esc((c.librador ?? []).map(l => l?.nombre).join('; '))}</td><td class=\"op-num\">${importeHtml(c.importe)}</td>" },
      // ── Las dos copias ────────────────────────────────────────────────────
      { nombre: 'una sola copia', de: "    const COPIAS_ORDEN_PAGO = ['ORIGINAL', 'DUPLICADO']", a: "    const COPIAS_ORDEN_PAGO = ['ORIGINAL']" },
      { nombre: 'el duplicado primero', de: "    const COPIAS_ORDEN_PAGO = ['ORIGINAL', 'DUPLICADO']", a: "    const COPIAS_ORDEN_PAGO = ['DUPLICADO', 'ORIGINAL']" },
      { nombre: 'las dos copias dicen ORIGINAL', de: '${copia(r)}</div>`).join(\'\')', a: '${copia(\'ORIGINAL\')}</div>`).join(\'\')' },
      { nombre: 'la copia sin su rótulo', de: '            <div class="op-cab__copia">${rotulo}</div>\n', a: '' },
      { nombre: 'el rótulo arriba del título, no bajo el número', de: '            <div class="op-cab__titulo-texto">ORDEN DE PAGO</div>', a: '            <div class="op-cab__copia">${rotulo}</div><div class="op-cab__titulo-texto">ORDEN DE PAGO</div>' },
      { nombre: 'el duplicado con la clase del original (no saltaría de hoja)', de: '<div class="op-copia op-copia--${r.toLowerCase()}"', a: '<div class="op-copia op-copia--original"' },
      { nombre: 'el duplicado sin la firma de quien autorizó', de: '          <div class="op-firma">Autorizó</div>', a: "          ${rotulo === 'ORIGINAL' ? '<div class=\"op-firma\">Autorizó</div>' : ''}" },
      { nombre: 'el duplicado sin las firmas', de: '        <div class="op-firmas">', a: "        <div class=\"op-firmas\"${rotulo === 'DUPLICADO' ? ' hidden' : ''}>" },
      // ── Se cancelan los siguientes comprobantes ───────────────────────────
      { nombre: 'con facturas igual dice "Pago a cuenta"', de: '      const filasFacturas = facturas.length\n', a: '      const filasFacturas = false\n' },
      { nombre: 'el aplicado muestra el importe de la factura', de: '<td class="op-num">${importeHtml(f.aplicado)}</td>', a: '<td class="op-num">${importeHtml(f.importe)}</td>' },
      { nombre: 'la factura sin su número', de: "<td>${esc(numeroParaMostrar(f.numero) || '—')}</td>", a: "<td>—</td>" },
      { nombre: 'la factura sin su fecha', de: '<td>${esc(fechaOrden(f.fecha))}</td>', a: '<td>—</td>' },
      { nombre: 'viajan también las facturas sin tildar', de: '        .filter(f => f.checked && centavosDe(f.monto) > 0)\n        .map(f => ({ factura_pendiente_id: f.id, monto_aplicado: centavosDe(f.monto) / 100 }))', a: '        .filter(f => centavosDe(f.monto) > 0)\n        .map(f => ({ factura_pendiente_id: f.id, monto_aplicado: centavosDe(f.monto) / 100 }))' },
      { nombre: 'viaja el saldo entero en vez de lo aplicado', de: '        .map(f => ({ factura_pendiente_id: f.id, monto_aplicado: centavosDe(f.monto) / 100 }))', a: '        .map(f => ({ factura_pendiente_id: f.id, monto_aplicado: centavosDe(f.saldo) / 100 }))' },
      { nombre: 'abrir la orden no la dibuja', de: '      hoja.innerHTML = htmlOrdenPago(res.data)\n', a: '' },
      // ── La hoja de impresión ──────────────────────────────────────────────
      { nombre: 'en la pantalla se ven las dos copias', de: '    .op-copia--duplicado { display: none; }\n', a: '' },
      { nombre: 'al imprimir el duplicado no sale', de: '      html.op-imprimiendo .op-copia--duplicado { display: block;', a: '      html.op-imprimiendo .op-copia--duplicado { display: none;' },
      { nombre: 'el duplicado no empieza en otra hoja', de: ' break-before: page; page-break-before: always; }', a: ' }' },
      { nombre: 'la nota de las dos hojas se imprime', de: '      html.op-imprimiendo .op-nota-copias { display: none !important; }\n', a: '' },
      { nombre: 'la letra de la hoja vuelve a 10.5pt', de: 'font-size: 8.5pt; line-height: 1.25;', a: 'font-size: 10.5pt; line-height: 1.35;' },
      { nombre: 'la letra de la tabla vuelve a 9.5pt', de: '.op-tabla { width: 100%; border-collapse: collapse; font-size: 7.5pt; }', a: '.op-tabla { width: 100%; border-collapse: collapse; font-size: 9.5pt; }' },
      { nombre: 'el rótulo sin su estilo', de: 'font-size: 8pt; font-weight: 800; letter-spacing: 0.1em; }', a: 'font-size: 8pt; }' },
      { nombre: 'el modal no avisa que salen dos hojas', de: '>Se imprimen dos hojas iguales: ORIGINAL y DUPLICADO, las dos con las firmas.</p>', a: '></p>' },
      { nombre: 'imprimir no marca el html', de: "      raiz.classList.add('op-imprimiendo')\n", a: '' },
    ],
  },
])
