// Mutaciones de test-cuentas-corrientes-proveedor-una-lista.js (la cuenta del
// proveedor en una sola lista, la orden en el renglón del pago, la orden de
// pago en una hoja con la línea del saldo). Ver mutar.js. De a una.
// La suite ancla su baseline al commit FIJO e6e0c74, nunca a HEAD.
//
//   node pruebas/mut-cuentas-corrientes-proveedor-una-lista.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

// La línea del saldo, las observaciones y las firmas de htmlOrdenPago (31/10/2026).
const LINEA_SENTIDO = "${lineaSaldo.sentido ? ` <span class=\"op-saldo-cuenta__sentido\">${esc(lineaSaldo.sentido)}</span>` : ''}"
const LINEA_SALDO = "        ${lineaSaldo ? `<div class=\"op-saldo-cuenta\"><span>Saldo de la cuenta:</span> <span class=\"op-saldo-cuenta__numero\">${importeHtml(lineaSaldo.importe)}</span>" + LINEA_SENTIDO + "</div>` : ''}"
const OBS_Y_FIRMAS = [
  "        ${obs ? `<div class=\"op-seccion op-observaciones\"><div class=\"op-seccion__titulo\">Observaciones</div><div>${esc(obs)}</div></div>` : ''}",
  '        <div class="op-firmas">',
  '          <div class="op-firma">Recibí conforme (proveedor) — firma y aclaración</div>',
  '          <div class="op-firma">Autorizó</div>',
  '        </div>',
].join('\n')

correrMutaciones({
  suite: path.join(__dirname, 'test-cuentas-corrientes-proveedor-una-lista.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/cuentas-corrientes.html'),
  funciones: [],
  manuales: [
    // La lista
    { nombre: 'el saldo corrido solo si no da cero (como antes)',
      de: '        const lineaSaldo = (!todas && m.unidad_negocio_id)', a: '        const lineaSaldo = (!todas && m.unidad_negocio_id && saldoAcum !== 0)' },
    { nombre: 'el saldo en cero dice "Saldo a favor"',
      de: "saldoAcum < 0 ? 'Saldo a favor' : 'Saldo'}", a: "'Saldo a favor'}" },
    { nombre: 'el filtro "Pagos" sin los créditos',
      de: "      else if (f.tipo === 'pago')  filas = filas.filter(m => ['pago', 'credito_aplicado'].includes(m.tipo))", a: "      else if (f.tipo === 'pago')  filas = filas.filter(m => m.tipo === 'pago' && m.factura_pendiente_id)" },
    { nombre: 'lo que resta en el mismo color que lo que suma',
      de: "        const claseMonto = monto < 0 ? 'fila-movimiento__monto--reduce' : 'fila-movimiento__monto--deuda'\n        const esFactura", a: "        const claseMonto = 'fila-movimiento__monto--deuda'\n        const esFactura" },
    { nombre: 'el saldo a favor del corte dice "Crédito aplicado"',
      de: "      if (m?.tipo === 'credito_aplicado' && m.credito_id && !m.factura_pendiente_id) return 'Saldo a favor'\n", a: '' },
    { nombre: 'el resumen nombra el saldo a favor como crédito aplicado',
      de: "      if (m?.tipo === 'credito_aplicado' && m.credito_id && !m.factura_pendiente_id) return { comprobante: 'Saldo a favor', detalle: m.referencia || '' }\n", a: '' },
    // La orden en el renglón del pago
    { nombre: 'la orden no se lee con los movimientos',
      de: '        cargarOrdenesDePagos(data ?? []),\n', a: '        new Map(),\n' },
    { nombre: 'el renglón no dice la orden',
      // (30/10/2026, al unir pago-proveedor-aplicar: la orden anulada va por
      // htmlOrdenAnulada; la sana, como siempre.)
      de: "              ${ordenPago ? (ordenPago.anulacion ? htmlOrdenAnulada(ordenPago.texto, ordenPago.anulacion, 'fila-movimiento__orden') : `<div class=\"fila-movimiento__orden\">${esc('Orden de pago ' + ordenPago.texto)}</div>`) : ''}\n", a: '' },
    { nombre: 'el número de la orden sin escapar',
      de: "${esc('Orden de pago ' + ordenPago.texto)}", a: "${'Orden de pago ' + ordenPago.texto}" },
    { nombre: 'sin "Reimprimir" en el renglón',
      de: "            ${ordenPago && !ordenPago.anulacion ? `<button type=\"button\" class=\"btn-pago-ayuda\" data-reimprimir-orden=\"${esc(ordenPago.id)}\">Reimprimir</button>` : ''}\n", a: '' },
    { nombre: 'el id de la orden sin escapar',
      de: 'data-reimprimir-orden="${esc(ordenPago.id)}"', a: 'data-reimprimir-orden="${ordenPago.id}"' },
    { nombre: '"Reimprimir" no abre la orden',
      de: '        btn.addEventListener(\'click\', () => abrirOrdenPago(btn.dataset.reimprimirOrden))', a: "        btn.addEventListener('click', () => {})" },
    { nombre: 'las órdenes se leen sin permiso',
      de: "      if (!(tieneTarea('cuentas_corrientes', 'registrar_pago') || tieneTarea('cuentas_corrientes', 'ver_todo'))) return mapa", a: '      if (false) return mapa' },
    { nombre: 'un error deja órdenes a medias (con la orden de otro pago)',
      de: "        console.error('No se pudieron leer las órdenes de pago de los pagos:', e)\n        return new Map()", a: "        console.error('No se pudieron leer las órdenes de pago de los pagos:', e)\n        return new Map([['g-op', { id: 'op-7', texto: 'N-OP-00007' }]])" },
    { nombre: 'la orden de otra empresa con el prefijo de la ficha',
      de: 'texto: numeroTextoOrden(o.unidad_negocio_id, o.numero)', a: "texto: numeroTextoOrden('u-n', o.numero)" },
    // La orden de pago: la línea del saldo
    { nombre: 'sin la línea del saldo',
      de: "        ${lineaSaldo ? `<div class=\"op-saldo-cuenta\">", a: "        ${false ? `<div class=\"op-saldo-cuenta\">" },
    { nombre: 'el saldo sin restar el crédito',
      de: "- Math.round((Number(saldo.credito) || 0) * 100)", a: '' },
    // 31/10/2026 (rama ci-prueba/orden-pago-a4): "Saldo de la cuenta: $ X"
    // con "le debemos" o "a nuestro favor", antes de las firmas.
    { nombre: 'a favor dice "le debemos"',
      de: "sentido: c > 0 ? 'le debemos' : c < 0 ? 'a nuestro favor' : ''", a: "sentido: c !== 0 ? 'le debemos' : ''" },
    { nombre: 'a favor con el importe en negativo',
      de: 'return { importe: Math.abs(c) / 100,', a: 'return { importe: c / 100,' },
    { nombre: 'en cero dice "a nuestro favor"',
      de: "c < 0 ? 'a nuestro favor' : ''", a: "'a nuestro favor'" },
    { nombre: 'sin saldo leído inventa $ 0,00',
      de: '      if (!saldo) return null\n', a: '      if (!saldo) saldo = { deuda: 0, credito: 0 }\n' },
    { nombre: 'el saldo de todas las monedas',
      de: ".eq('unidad_negocio_id', op.unidad_negocio_id).eq('moneda', 'ARS')", a: ".eq('unidad_negocio_id', op.unidad_negocio_id)" },
    { nombre: 'el saldo de todas las empresas',
      de: ".eq('proveedor_id', op.proveedor_id).eq('unidad_negocio_id', op.unidad_negocio_id)", a: ".eq('proveedor_id', op.proveedor_id)" },
    { nombre: 'un error del saldo se toma como cero',
      de: '        if (e2) return null\n', a: '' },
    { nombre: 'abrir la orden no le pasa el saldo',
      de: '      hoja.innerHTML = htmlOrdenPago(res.data, { saldo, anteriores })', a: '      hoja.innerHTML = htmlOrdenPago(res.data, { anteriores })' },
    { nombre: 'la línea sin "le debemos" / "a nuestro favor"',
      de: LINEA_SENTIDO, a: '' },
    { nombre: 'la línea abajo de las firmas',
      de: LINEA_SALDO + '\n' + OBS_Y_FIRMAS, a: OBS_Y_FIRMAS + '\n' + LINEA_SALDO },
    { nombre: 'vuelve el rótulo de copia',
      de: '            <div class="op-cab__dato">Fecha ${esc(fechaOrden(d?.fecha))}</div>\n          </div>', a: '            <div class="op-cab__dato">Fecha ${esc(fechaOrden(d?.fecha))}</div>\n            <div class="op-cab__copia">DUPLICADO</div>\n          </div>' },
  ],
})
