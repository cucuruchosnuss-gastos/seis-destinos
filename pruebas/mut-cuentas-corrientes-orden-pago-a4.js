// Mutaciones de test-cuentas-corrientes-orden-pago-a4.js (la orden de pago
// A4, 31/10/2026, rama ci-prueba/orden-pago-a4). Ver mutar.js. De a una.
// La suite ancla su baseline al commit FIJO 1c20f98, nunca a HEAD (y sobre
// 1c20f98 da ROJO: la hoja A4 no existía).
//
//   node pruebas/mut-cuentas-corrientes-orden-pago-a4.js
'use strict'
const path = require('path')
const { correrMutacionesEnVarios } = require('./mutar')

const RAIZ = path.join(__dirname, '..')
const SUITE = path.join(__dirname, 'test-cuentas-corrientes-orden-pago-a4.js')

correrMutacionesEnVarios([
  {
    suite: SUITE,
    original: process.env.ARCHIVO_BASE_MUT || path.join(RAIZ, 'modulos/cuentas-corrientes.html'),
    funciones: ['htmlOrdenPago'],
    equivalentes: [
      { expr: 'esc(fechaOrden(c?.fecha_pago))', motivo: 'fechaOrden() devuelve dd/mm/aaaa armado por formatearFecha() de una fecha que pasó /^\\d{4}-\\d{2}-\\d{2}$/, o "—"' },
      { expr: 'esc(fechaOrden(f?.fecha))', motivo: 'fechaOrden() devuelve dd/mm/aaaa armado por formatearFecha() de una fecha que pasó /^\\d{4}-\\d{2}-\\d{2}$/, o "—"' },
      { expr: 'esc(fechaOrden(d?.fecha))', motivo: 'fechaOrden() devuelve dd/mm/aaaa armado por formatearFecha() de una fecha que pasó /^\\d{4}-\\d{2}-\\d{2}$/, o "—"' },
      { expr: 'esc(lineaSaldo.sentido)', motivo: "lineaSaldoOrdenPago(): 'le debemos', 'a nuestro favor' o '' (constantes del código)" },
      { expr: 'esc(importeEnLetras(d?.total))', motivo: 'importeEnLetras() devuelve letras mayúsculas armadas con las tablas del código, o "—"' },
      { expr: 'esc(sub)', motivo: 'textoAnterioresFactura(): un literal con dos formatearImporte() (números)' },
    ],
    manuales: [
      // ── Los cheques ───────────────────────────────────────────────────────
      { nombre: 'vuelve el librador en la fila del cheque', de: "<td>${esc(fechaOrden(c?.fecha_pago))}</td><td class=\"op-num\">${importeHtml(c?.importe)}</td>", a: "<td>${esc(fechaOrden(c?.fecha_pago))}</td><td>${esc((c?.librador ?? []).map(l => l?.nombre).join('; '))}</td><td class=\"op-num\">${importeHtml(c?.importe)}</td>" },
      { nombre: 'el cheque dice de qué empresa / cliente venía', de: "${c?.es_echeq ? ' <strong>eCheq</strong>' : ''}</td>", a: "${c?.es_echeq ? ' <strong>eCheq</strong>' : ''} ${esc(c?.de_empresa ?? '')}</td>" },
      { nombre: 'vuelve la columna "Librador" (cabecera)', de: '<th>Fecha de pago</th><th class="op-num">Importe</th>', a: '<th>Fecha de pago</th><th>Librador</th><th class="op-num">Importe</th>' },
      { nombre: 'la compacta no corta el banco en un renglón', de: '    .op-a4--compacta .op-banco { display: inline-block; max-width: 28mm;', a: '    .op-a4--compacta .op-banco-no { display: inline-block; max-width: 28mm;' },
      { nombre: 'el subtotal de los cheques en cero', de: "pie(3, 'Subtotal cheques', t.cCheques)", a: "pie(3, 'Subtotal cheques', 0)" },
      // ── Transferencias, efectivo, QR ──────────────────────────────────────
      { nombre: 'la transferencia sin su cuenta', de: "${esc(b.conCuenta ? (o?.cuenta || '—') : b.titulo)}", a: '${esc(b.titulo)}' },
      { nombre: 'el efectivo con la caja de la que salió', de: "{ medio: 'efectivo', titulo: 'Efectivo', subtotal: 'Subtotal efectivo', conCuenta: false }", a: "{ medio: 'efectivo', titulo: 'Efectivo', subtotal: 'Subtotal efectivo', conCuenta: true }" },
      { nombre: 'los bloques sin su subtotal', de: '}</tbody>${pie(1, esc(b.subtotal), t.porMedio.get(b.medio) ?? 0)}</table></div>`)', a: '}</tbody></table></div>`)' },
      { nombre: 'QR sumado a las transferencias', de: "      for (const o of otros) porMedio.set(o?.medio ?? '', (porMedio.get(o?.medio ?? '') ?? 0) + c(o?.importe))", a: "      for (const o of otros) { const m = o?.medio === 'qr' ? 'transferencia' : (o?.medio ?? ''); porMedio.set(m, (porMedio.get(m) ?? 0) + c(o?.importe)) }" },
      { nombre: 'efectivo antes que las transferencias', de: "      { medio: 'transferencia', titulo: 'Transferencias', subtotal: 'Subtotal transferencias', conCuenta: true },\n      { medio: 'qr', titulo: 'QR', subtotal: 'Subtotal QR', conCuenta: true },\n      { medio: 'efectivo', titulo: 'Efectivo', subtotal: 'Subtotal efectivo', conCuenta: false },", a: "      { medio: 'efectivo', titulo: 'Efectivo', subtotal: 'Subtotal efectivo', conCuenta: false },\n      { medio: 'transferencia', titulo: 'Transferencias', subtotal: 'Subtotal transferencias', conCuenta: true },\n      { medio: 'qr', titulo: 'QR', subtotal: 'Subtotal QR', conCuenta: true }," },
      // ── Facturas y lo anterior ────────────────────────────────────────────
      { nombre: 'sin el subrenglón de lo anterior', de: "              const sub = ant ? textoAnterioresFactura(ant) : ''", a: "              const sub = ''" },
      { nombre: 'la factura sin su número', de: '<span class="op-nowrap">${esc(numeroParaMostrar(f?.numero))}</span>', a: '<span class="op-nowrap">—</span>' },
      { nombre: 'el tipo sin traducir ("factura")', de: "      return { factura: 'Factura', nota_debito: 'Nota de débito', nota_credito: 'Nota de crédito' }[t] ?? t", a: '      return t' },
      { nombre: '"otro" se imprime', de: "      if (!t || t === 'otro') return ''", a: "      if (!t) return ''" },
      { nombre: 'lo anterior cuenta los pagos de la propia orden', de: '!propios.has(a.gasto_id) && antes(a.created_at)', a: 'antes(a.created_at)' },
      { nombre: 'lo anterior cuenta lo del mismo instante (corte no estricto)', de: 'return Number.isFinite(x) && x < corte', a: 'return Number.isFinite(x) && x <= corte' },
      { nombre: 'lo anterior cuenta lo posterior a la orden', de: 'return Number.isFinite(x) && x < corte', a: 'return Number.isFinite(x)' },
      { nombre: 'los créditos anteriores no cuentan', de: "      for (const a of creditos ?? []) if (antes(a.created_at)) sumar(a.factura_pendiente_id, 'creditos', a.monto_aplicado)\n", a: '' },
      { nombre: 'lo anterior sumado sin centavos', de: "x[campo] = (Math.round(x[campo] * 100) + Math.round((Number(monto) || 0) * 100)) / 100", a: 'x[campo] = Math.round(x[campo] + (Number(monto) || 0))' },
      { nombre: 'un error al leer lo anterior se toma como nada', de: '        if (ap?.error || ac?.error || fp?.error) return null\n', a: '' },
      { nombre: 'sin aplicaciones leídas igual devuelve null (no un mapa vacío)', de: '        if (!facturaIds.length) return new Map()\n', a: '        if (!facturaIds.length) return null\n' },
      { nombre: 'abrir la orden no lee lo anterior', de: 'leerSaldoOrdenPago(ordenId), leerAnterioresOrdenPago(ordenId),', a: 'leerSaldoOrdenPago(ordenId), null,' },
      { nombre: 'abrir la orden no le pasa lo anterior', de: '      hoja.innerHTML = htmlOrdenPago(res.data, { saldo, anteriores })', a: '      hoja.innerHTML = htmlOrdenPago(res.data, { saldo })' },
      // ── Las cajas ─────────────────────────────────────────────────────────
      { nombre: 'TOTAL PAGADO del total original (no el vivo)', de: '<div class="op-caja__total"><span>TOTAL PAGADO</span><span>${importeHtml(d?.total)}</span></div>', a: '<div class="op-caja__total"><span>TOTAL PAGADO</span><span>${importeHtml(d?.total_original ?? d?.total)}</span></div>' },
      { nombre: 'TOTAL FACTURAS = solo lo aplicado', de: '        cFacturas: cAplicado + cQueda,', a: '        cFacturas: cAplicado,' },
      { nombre: 'la caja de lo pagado sin los subtotales', de: '            ${subtotalesPago}\n', a: '' },
      { nombre: 'la caja de facturas sin lo aplicado y lo que queda', de: "            ${facturas.length ? filaCaja('Aplicado en este pago', t.cAplicado) + filaCaja('Les queda', t.cQueda) : ''}\n", a: '' },
      { nombre: 'las cajas no se estiran a la misma altura', de: '.op-totales { display: grid; grid-template-columns: 9fr 11fr; gap: 4mm; margin-top: 3mm; align-items: stretch; }', a: '.op-totales { display: grid; grid-template-columns: 9fr 11fr; gap: 4mm; margin-top: 3mm; align-items: start; }' },
      { nombre: 'el total de cada caja no va pegado abajo', de: '.op-caja__total { margin-top: auto;', a: '.op-caja__total {' },
      { nombre: 'las cajas con otras columnas que las de arriba', de: '.op-totales { display: grid; grid-template-columns: 9fr 11fr;', a: '.op-totales { display: grid; grid-template-columns: 1fr 1fr;' },
      // ── El total y las letras ─────────────────────────────────────────────
      { nombre: 'el "Son…" del total original', de: '<div class="op-letras">Son ${esc(importeEnLetras(d?.total))}</div>', a: '<div class="op-letras">Son ${esc(importeEnLetras(d?.total_original ?? d?.total))}</div>' },
      { nombre: 'lo pagado en las cuentas, del total original', de: '      const cPagado = c(d?.total)\n', a: '      const cPagado = c(d?.total_original ?? d?.total)\n' },
      // ── La franja ─────────────────────────────────────────────────────────
      { nombre: 'nunca "Queda saldo pendiente"', de: "      if (t.cQueda > 0) lineas.push(", a: '      if (false) lineas.push(' },
      { nombre: 'nunca "Queda a favor"', de: "      if (t.cFavor > 0) lineas.push(", a: '      if (false) lineas.push(' },
      { nombre: 'nunca "Facturas canceladas"', de: "      if (!lineas.length && hayFacturas) lineas.push(", a: '      if (false) lineas.push(' },
      { nombre: '"Facturas canceladas" también sin facturas', de: "      if (!lineas.length && hayFacturas) lineas.push(", a: '      if (!lineas.length) lineas.push(' },
      { nombre: 'a favor del proveedor (no de la empresa)', de: "franjaOrdenPago(t, { empresa, hayFacturas: facturas.length > 0 })", a: "franjaOrdenPago(t, { empresa: p.razon_social, hayFacturas: facturas.length > 0 })" },
      { nombre: 'lo que queda a favor, del a_favor de la base (no de lo que no se aplicó)', de: '        cFavor: Math.max(0, cPagado - cAplicado),', a: '        cFavor: c(d?.a_favor),' },
      { nombre: 'la franja sin el importe', de: "${l.importe != null ? `<span>${importeHtml(l.importe)}</span>` : ''}", a: '' },
      // ── El saldo de la cuenta ─────────────────────────────────────────────
      { nombre: 'el saldo: "le debemos" y "a nuestro favor" al revés', de: "sentido: c > 0 ? 'le debemos' : c < 0 ? 'a nuestro favor' : ''", a: "sentido: c > 0 ? 'a nuestro favor' : c < 0 ? 'le debemos' : ''" },
      { nombre: 'el saldo en cero dice "le debemos"', de: "sentido: c > 0 ? 'le debemos'", a: "sentido: c >= 0 ? 'le debemos'" },
      { nombre: 'el saldo sin restar el crédito', de: "      const c = Math.round((Number(saldo.deuda) || 0) * 100) - Math.round((Number(saldo.credito) || 0) * 100)\n      return { importe:", a: "      const c = Math.round((Number(saldo.deuda) || 0) * 100)\n      return { importe:" },
      { nombre: 'el saldo a favor en negativo', de: 'return { importe: Math.abs(c) / 100,', a: 'return { importe: c / 100,' },
      { nombre: 'sin la línea del saldo', de: '        ${lineaSaldo ? `<div class="op-saldo-cuenta">', a: '        ${false ? `<div class="op-saldo-cuenta">' },
      { nombre: 'la línea del saldo dos veces', de: '<span class="op-saldo-cuenta__sentido">${esc(lineaSaldo.sentido)}</span>` : \'\'}</div>` : \'\'}', a: '<span class="op-saldo-cuenta__sentido">${esc(lineaSaldo.sentido)}</span>` : \'\'}</div><div class="op-saldo-cuenta">otra</div>` : \'\'}' },
      // ── Observaciones ─────────────────────────────────────────────────────
      { nombre: 'sin las observaciones de la orden', de: '        ${obs ? `<div class="op-seccion op-observaciones">', a: '        ${false ? `<div class="op-seccion op-observaciones">' },
      { nombre: 'observaciones en blanco igual se imprimen', de: "      const obs = String(d?.observaciones ?? '').trim()", a: "      const obs = String(d?.observaciones ?? '')" },
      // ── Anulada ───────────────────────────────────────────────────────────
      { nombre: 'anulada: sin el aviso ni el sello', de: "        ${anulada ? '<div class=\"op-anulada\"", a: "        ${false ? '<div class=\"op-anulada\"" },
      { nombre: 'anulada: no se lee la marca de la base', de: '      const anulada = d?.anulada === true\n', a: '      const anulada = false\n' },
      { nombre: 'al abrir una anulada sigue con los botones', de: '      if (res.data.anulada === true) {\n', a: '      if (false) {\n' },
      { nombre: 'una anulada se marca pero conserva los botones', de: "        hoja.classList?.add('op-hoja--anulada')\n        botonesOrdenPago(false)\n        return\n", a: "        hoja.classList?.add('op-hoja--anulada')\n        return\n" },
      { nombre: 'base "no anulada" + gastos anulados: ANULADA entera', de: "      if (anulacion === 'anulada' && anuladaBase === false) anulacion = 'en_parte'\n", a: '' },
      { nombre: 'una sana no vuelve a mostrar los botones', de: "      hoja.classList?.remove('op-hoja--anulada')\n      botonesOrdenPago(true)\n", a: "      hoja.classList?.remove('op-hoja--anulada')\n" },
      { nombre: 'los botones: solo "Imprimir"', de: "      for (const id of ['btn-imprimir-orden', 'btn-enviar-orden']) {", a: "      for (const id of ['btn-imprimir-orden']) {" },
      { nombre: 'enviar arma el PDF de una anulada', de: "      if (!actual || document.getElementById('orden-pago-hoja').classList?.contains('op-hoja--anulada')) return\n", a: '      if (!actual) return\n' },
      { nombre: 'enviar sin orden abierta igual arma el PDF', de: "      if (!actual || document.getElementById('orden-pago-hoja').classList?.contains('op-hoja--anulada')) return\n", a: "      if (document.getElementById('orden-pago-hoja').classList?.contains('op-hoja--anulada')) return\n" },
      // ── La versión compacta ───────────────────────────────────────────────
      { nombre: 'nunca la versión compacta', de: '      const compacta = Math.max(renglonesPago, renglonesFacturas) > RENGLONES_OP_COMPACTA\n', a: '      const compacta = false\n' },
      { nombre: 'la compacta un renglón antes', de: '      const compacta = Math.max(renglonesPago, renglonesFacturas) > RENGLONES_OP_COMPACTA\n', a: '      const compacta = Math.max(renglonesPago, renglonesFacturas) >= RENGLONES_OP_COMPACTA\n' },
      { nombre: 'la compacta mira solo los cheques', de: '      const compacta = Math.max(renglonesPago, renglonesFacturas) > RENGLONES_OP_COMPACTA\n', a: '      const compacta = renglonesPago > RENGLONES_OP_COMPACTA\n' },
      // ── "Enviar" ──────────────────────────────────────────────────────────
      { nombre: 'enviar comparte aunque el navegador no acepte archivos', de: "typeof navigator.share === 'function' && navigator.canShare?.({ files: [archivo] })", a: "typeof navigator.share === 'function'" },
      { nombre: 'si la persona cancela el share, igual descarga', de: "            if (err?.name === 'AbortError') return\n", a: '' },
      { nombre: 'sin share no descarga', de: '        descargarOrdenPago(blob, nombre)\n', a: '' },
      { nombre: 'después de compartir también descarga', de: "          try { await navigator.share({ files: [archivo], title: nombre.replace(/\\.pdf$/, '') }); return } catch (err) {", a: "          try { await navigator.share({ files: [archivo], title: nombre.replace(/\\.pdf$/, '') }) } catch (err) {" },
      { nombre: 'el archivo sin tipo PDF', de: "new File([blob], nombre, { type: 'application/pdf' })", a: 'new File([blob], nombre, {})' },
      { nombre: 'el PDF no se achica para entrar en una hoja', de: 'const escala = Math.min(190 / canvas.width, 277 / canvas.height)', a: 'const escala = 190 / canvas.width' },
      { nombre: 'el PDF con el ancho de la pantalla (en el celular, una columna)', de: "cont.style.cssText = 'position:fixed;left:-10000px;top:0;background:#fff;width:194mm'", a: "cont.style.cssText = 'position:fixed;left:-10000px;top:0;background:#fff;width:100%'" },
      { nombre: 'el contenedor del PDF queda en la página', de: '      } finally {\n        cont.remove()\n      }', a: '      } finally {\n      }' },
      { nombre: 'doble toque arma dos PDF', de: '      if (btn?.disabled) return\n', a: '' },
      { nombre: 'el botón queda deshabilitado después', de: '      } finally {\n        if (btn) btn.disabled = false\n      }', a: '      } finally {\n      }' },
      { nombre: 'sin las librerías no las carga', de: '        for (const url of LIBRERIAS_PDF_OP) await cargarScriptOP(url)\n', a: '' },
      { nombre: 'un PDF que falla no se avisa', de: "          mostrarError('No se pudo armar el PDF de la orden de pago: ' + (err?.message ?? err))\n", a: '' },
      { nombre: 'el nombre del archivo con caracteres prohibidos', de: "      const limpio = (s) => String(s ?? '').replace(/[\\\\/:*?\"<>|\\u0000-\\u001f]+/g, ' ').replace(/\\s+/g, ' ').trim()", a: "      const limpio = (s) => String(s ?? '').trim()" },
      { nombre: 'el botón "Enviar" no se escucha', de: "    document.getElementById('btn-enviar-orden').addEventListener('click', enviarOrdenPago)\n", a: '' },
    ],
  },
])
