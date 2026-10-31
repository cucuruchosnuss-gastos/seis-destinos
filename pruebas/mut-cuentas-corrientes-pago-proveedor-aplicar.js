// Mutaciones de test-cuentas-corrientes-pago-proveedor-aplicar.js (la factura
// elegida viaja y la pregunta de "dejarlo a cuenta"; "Aplicar a facturas";
// anular un pago y la orden anulada; 30/10/2026). Ver mutar.js.
//
//   node pruebas/mut-cuentas-corrientes-pago-proveedor-aplicar.js
'use strict'
const path = require('path')
const { correrMutacionesEnVarios } = require('./mutar')

const RAIZ = path.join(__dirname, '..')
const SUITE = path.join(__dirname, 'test-cuentas-corrientes-pago-proveedor-aplicar.js')

correrMutacionesEnVarios([
  {
    suite: SUITE,
    original: process.env.ARCHIVO_BASE_MUT || path.join(RAIZ, 'modulos/cuentas-corrientes.html'),
    funciones: ['htmlACuentaPago', 'htmlPanelAnularPago', 'htmlAccionesDetallePago', 'htmlFilasAplicarPago', 'htmlOrdenAnulada'],
    equivalentes: [
    ],
    manuales: [
      // ── 1. La factura elegida viaja ───────────────────────────────────────
      { nombre: 'tocar el renglón de una factura no la tilda (el caso BADIC)', de: "      if (!t?.closest || t.closest('input, button, a, select, textarea, label')) return\n      const fila = t.closest('.fila-fifo')", a: "      return\n      const fila = t.closest('.fila-fifo')" },
      { nombre: 'el renglón se da vuelta también al tocar la casilla (doble toque)', de: "      if (!t?.closest || t.closest('input, button, a, select, textarea, label')) return\n      const fila = t.closest('.fila-fifo')", a: "      if (!t?.closest) return\n      const fila = t.closest('.fila-fifo')" },
      { nombre: 'el renglón tilda una casilla apagada', de: "      const chk = fila?.querySelector('.check-fifo')\n      if (!chk || chk.disabled) return", a: "      const chk = fila?.querySelector('.check-fifo')\n      if (!chk) return" },
      { nombre: 'tildar no marca la factura', de: '      const f = facturasParaPago[i]\n      if (!f) return\n      f.checked = !!si', a: '      const f = facturasParaPago[i]\n      if (!f) return\n      f.checked = false' },
      { nombre: 'tildar no pone el saldo', de: '        f.monto = f.saldo\n        const cont', a: '        const cont' },
      { nombre: 'tildar no pinta el renglón', de: "      fila?.classList?.toggle('fila-fifo--tildada', f.checked)\n      refrescarPago()", a: '      refrescarPago()' },
      { nombre: 'las aplicaciones no viajan', de: '        .filter(f => f.checked && centavosDe(f.monto) > 0)\n        .map(f => ({ factura_pendiente_id: f.id,', a: '        .filter(f => false)\n        .map(f => ({ factura_pendiente_id: f.id,' },
      // ── 2. La pregunta de "dejarlo a cuenta" ──────────────────────────────
      { nombre: 'sin factura elegida se manda sin preguntar', de: '      if (!estado.pagoACuentaConfirmado && facturasParaPago.some(', a: '      if (false && facturasParaPago.some(' },
      { nombre: 'pregunta aunque haya una factura elegida', de: "&& !aplicacionesPago(facturasParaPago).length) {\n        estado.pagoPreguntaACuenta = true", a: ") {\n        estado.pagoPreguntaACuenta = true" },
      { nombre: 'pregunta aunque no haya facturas pendientes', de: '      if (!estado.pagoACuentaConfirmado && facturasParaPago.some(f => centavosDe(f.saldo) > 0) && ', a: '      if (!estado.pagoACuentaConfirmado && ' },
      { nombre: '"Sí, dejarlo a cuenta" no cuenta como respuesta', de: '      estado.pagoACuentaConfirmado = true\n      estado.pagoPreguntaACuenta = false\n      return confirmarPago()', a: '      estado.pagoPreguntaACuenta = false\n      return confirmarPago()' },
      // (Sin la guarda de siDejarACuenta igual manda una vez: confirmarPago
      // tiene la suya. La prueba del doble toque la cubre la de confirmarPago.)
      { nombre: 'un cambio no borra la respuesta', de: '      estado.pagoPreguntaACuenta = false\n      estado.pagoACuentaConfirmado = false\n      pintarPiePago()', a: '      estado.pagoPreguntaACuenta = false\n      pintarPiePago()' },
      { nombre: 'un cambio no esconde la pregunta', de: '      estado.pagoError = null\n      estado.pagoPreguntaACuenta = false\n', a: '      estado.pagoError = null\n' },
      { nombre: 'la pregunta no se muestra', de: "      document.getElementById('confirmar-a-cuenta-pago').hidden = !estado.pagoPreguntaACuenta", a: "      document.getElementById('confirmar-a-cuenta-pago').hidden = true" },
      { nombre: '"Elegir una factura" no esconde la pregunta', de: '    function elegirFacturaEnVezDeACuenta() {\n      estado.pagoPreguntaACuenta = false\n', a: '    function elegirFacturaEnVezDeACuenta() {\n' },
      { nombre: 'el texto de la pregunta cambia', de: 'No elegiste ninguna factura: el pago va a quedar a cuenta. ¿Seguro?</p>', a: 'El pago va a quedar a cuenta.</p>' },
      { nombre: 'el renglón de la lista no escucha el toque', de: "    document.getElementById('lista-fifo').addEventListener('click', alTocarRenglonFactura)\n", a: '' },
      { nombre: 'el renglón vuelve a no tener cursor de mano', de: '    #lista-fifo .fila-fifo, #aplicar-pago-lista .fila-fifo { cursor: pointer; }\n', a: '' },
      // ── 3. "A cuenta $ X · Aplicar a facturas" ────────────────────────────
      { nombre: 'a cuenta: cuenta créditos agotados', de: "        if (!c?.origen_gasto_id || c.estado !== 'disponible') continue", a: '        if (!c?.origen_gasto_id) continue' },
      { nombre: 'a cuenta: suma sin centavos', de: '      return new Map([...cent].map(([k, v]) => [k, v / 100]))', a: '      return new Map([...cent].map(([k, v]) => [k, v]))' },
      { nombre: 'a cuenta: el botón aunque no haya nada', de: "      if (!gastoId || !(centavosDe(aCuenta) > 0)) return ''", a: "      if (!gastoId) return ''" },
      { nombre: 'a cuenta: el botón sin permiso', de: '      return puede\n        ? `<button type="button" class="btn-a-cuenta-pago"', a: '      return true\n        ? `<button type="button" class="btn-a-cuenta-pago"' },
      { nombre: 'a cuenta: el renglón pide otra tarea', de: "m?.moneda, tieneTarea('cuentas_corrientes', 'registrar_pago'))", a: "m?.moneda, tieneTarea('cuentas_corrientes', 'aplicar_credito'))" },
      { nombre: 'a cuenta: el renglón del pago no lo muestra', de: "              ${esPago ? htmlACuentaEnFila(m) : ''}\n", a: '' },
      { nombre: 'la ficha no lee de qué pago salió cada crédito', de: 'monto_original, monto_disponible, estado, origen_gasto_id\')', a: 'monto_original, monto_disponible, estado\')' },
      { nombre: 'aplicar: abre sin permiso', de: "      if (!gastoId || !tieneTarea('cuentas_corrientes', 'registrar_pago')) return\n      const turno = ++turnoAplicarPago", a: '      if (!gastoId) return\n      const turno = ++turnoAplicarPago' },
      { nombre: 'aplicar: sin filtrar por moneda', de: "        .eq('moneda', gasto.moneda || 'ARS')\n", a: '' },
      { nombre: 'aplicar: sin filtrar por empresa', de: "        .eq('unidad_negocio_id', gasto.unidad_negocio_id)\n        .eq('moneda', gasto.moneda || 'ARS')", a: "        .eq('moneda', gasto.moneda || 'ARS')" },
      { nombre: 'aplicar: no propone de la más vieja a la más nueva', de: '      ap.facturas = aplicarAFacturasViejas(facturas, cACuenta)', a: '      ap.facturas = facturas' },
      { nombre: 'aplicar: ofrece facturas sin saldo', de: '      const facturas = (fr?.data ?? []).filter(x => centavosDe(x.saldo_pendiente) > 0).map(', a: '      const facturas = (fr?.data ?? []).map(' },
      { nombre: 'aplicar: el a cuenta cuenta créditos agotados', de: ".eq('origen_gasto_id', gastoId).eq('estado', 'disponible')),", a: ".eq('origen_gasto_id', gastoId)),\n" },
      { nombre: 'aplicar: un pago anulado se puede aplicar', de: "      if (g.data.estado === 'anulado') return fin('Ese pago está anulado.')\n", a: '' },
      { nombre: 'aplicar: viajan también las no tildadas', de: "p_aplicaciones: aplicacionesPago(ap.facturas) })", a: "p_aplicaciones: ap.facturas.map(f => ({ factura_pendiente_id: f.id, monto_aplicado: f.monto })) })" },
      { nombre: 'aplicar: deja aplicar más de lo que hay a cuenta', de: '      if (t.cQueda < 0) return `Este pago tiene', a: '      if (false) return `Este pago tiene' },
      { nombre: 'aplicar: deja una tildada sin monto', de: "        if (centavosDe(f.monto) <= 0) return `Poné cuánto se aplica a la factura ${f.numero ?? '—'} (o destildala).`\n        if (centavosDe(f.monto) > centavosDe(f.saldo)) return `Lo aplicado a la factura ${f.numero ?? '—'} supera su saldo pendiente.`\n      }\n      const t = totalesAplicarPago", a: "        if (centavosDe(f.monto) > centavosDe(f.saldo)) return `Lo aplicado a la factura ${f.numero ?? '—'} supera su saldo pendiente.`\n      }\n      const t = totalesAplicarPago" },
      { nombre: 'aplicar: el error de la base no va tal cual', de: '        ap.error = res.error.message || String(res.error)', a: "        ap.error = 'No se pudo aplicar.'" },
      { nombre: 'aplicar: un doble toque manda dos veces', de: '      if (!ap || ap.enviando || ap.cargando || !ap.gasto) return\n      const moneda', a: '      if (!ap || ap.cargando || !ap.gasto) return\n      const moneda' },
      { nombre: 'aplicar: después no se recarga la ficha', de: '      if (estado.ficha) await recargarFichaDespuesDePago()\n      if (accionesPago?.gastoId === ap.gastoId', a: '      if (accionesPago?.gastoId === ap.gastoId' },
      { nombre: 'aplicar: el detalle abierto no se vuelve a leer', de: "      if (accionesPago?.gastoId === ap.gastoId && !document.getElementById('modal-detalle-pago').hidden) await abrirModalDetallePago(ap.gastoId)", a: '' },
      { nombre: 'aplicar: el aviso no dice lo que queda a cuenta', de: "(queda > 0 ? ` Queda a cuenta ${formatearImporte(queda, moneda)}.` : ' No queda nada a cuenta.')", a: "''" },
      { nombre: 'aplicar: tildar propone el saldo entero aunque no alcance', de: '        f.monto = (queda > 0 ? Math.min(centavosDe(f.saldo), queda) : centavosDe(f.saldo)) / 100', a: '        f.monto = centavosDe(f.saldo) / 100' },
      { nombre: 'aplicar: escribir un monto no tilda', de: '      if (centavosDe(f.monto) > 0 && !f.checked) {\n        f.checked = true\n        const fila = t.closest', a: '      if (false) {\n        f.checked = true\n        const fila = t.closest' },
      { nombre: 'aplicar: el pie no avisa que te pasás', de: '          (t.cQueda < 0\n', a: '          (false\n' },
      { nombre: 'aplicar: "Aplicar" no se traba mientras manda', de: '      btn.disabled = !!(ap.cargando || ap.enviando || !ap.gasto || !ap.facturas.length)', a: '      btn.disabled = !!(ap.cargando || !ap.gasto || !ap.facturas.length)' },
      // ── 4. Anular un pago ─────────────────────────────────────────────────
      { nombre: 'anular: los cheques solo por pago_gasto_id', de: "        leerSeguroCC(supabase.from('cobranza_cheques').select(COLS_CHEQUE).eq('salida_gasto_id', gastoId)),", a: '        null,' },
      { nombre: 'anular: los cheques no van en el orden del pago', de: "      const lugar = (c) => { const k = String(gasto.descripcion ?? '').indexOf(`N° ${c.numero}`); return k < 0 ? Infinity : k }", a: '      const lugar = (c) => Infinity' },
      { nombre: 'anular: la factura vuelve a deber otro importe', de: '`${nombre} vuelve a deber ${formatearImporte(ap.monto, moneda)}`', a: '`${nombre} vuelve a deber ${formatearImporte(0, moneda)}`' },
      { nombre: 'anular: la vista previa no dice los cheques', de: "          ? `Vuelven a la cartera: ${a.cheques.map(c => `N° ${c.numero ?? '—'} (${formatearImporte(c.importe)})`).join(', ')}`", a: "          ? 'Vuelven los cheques'" },
      { nombre: 'anular: la vista previa no dice lo que quedó a cuenta', de: "      if (centavosDe(a?.aCuenta) > 0) lineas.push(`Se anula lo que quedó a cuenta: ${formatearImporte(a.aCuenta, moneda)}`)\n", a: '' },
      { nombre: 'anular: la deuda entre empresas también con la empresa que paga', de: '        if (!c.unidadId || !g.unidad_negocio_id || c.unidadId === g.unidad_negocio_id) continue', a: '        if (!c.unidadId || !g.unidad_negocio_id) continue' },
      { nombre: 'anular: no dice la deuda entre empresas', de: '      for (const x of otras.values()) lineas.push(`Se da vuelta la deuda con ${x.nombre} por ${formatearImporte(x.cent / 100)} (Entre empresas)`)\n', a: '' },
      { nombre: 'anular: promete devolver plata en un pago sin cuenta', de: "      if (['efectivo', 'transferencia'].includes(g.medio_pago) && g.cuenta_id) lineas.push(", a: "      if (['efectivo', 'transferencia', 'qr'].includes(g.medio_pago)) lineas.push(" },
      { nombre: 'anular: dice que la orden queda anulada aunque tenga otro pago', de: '      if (a?.ordenTexto && !(a.otrosOrden ?? []).length) lineas.push(', a: '      if (a?.ordenTexto) lineas.push(' },
      { nombre: 'anular: no avisa del otro pago de la orden', de: '      for (const o of a?.otrosOrden ?? []) {\n        avisos.push(', a: '      for (const o of []) {\n        avisos.push(' },
      { nombre: 'anular: no avisa que el crédito ya se usó', de: "      if (a?.creditoUsado) avisos.push(", a: '      if (false) avisos.push(' },
      { nombre: 'anular: el crédito usado no se detecta como la base', de: '        creditoUsado: creditos.some(c => centavosDe(c.monto_disponible) < centavosDe(c.monto_original)),', a: '        creditoUsado: false,' },
      { nombre: 'anular: la factura que creó el pago no se distingue', de: "          laCreoElPago: !!a.facturas_pendientes?.origen_gasto_id && a.facturas_pendientes.origen_gasto_id === gastoId,", a: '          laCreoElPago: false,' },
      { nombre: 'anular: sin pedir el motivo', de: "      if (!motivo) { x.error = 'Poné el motivo de la anulación.'; pintarAccionesDetallePago(); return }\n", a: '' },
      { nombre: 'anular: el motivo viaja sin recortar', de: "{ p_gasto_id: a.gastoId, p_motivo: motivo })", a: "{ p_gasto_id: a.gastoId, p_motivo: x.motivo })" },
      { nombre: 'anular: un doble toque manda dos veces', de: '      const x = a?.anular\n      if (!x || x.enviando) return', a: '      const x = a?.anular\n      if (!x) return' },
      { nombre: 'anular: el error de la base no va tal cual', de: '        x.error = res.error.message || String(res.error)', a: "        x.error = 'No se pudo anular.'" },
      { nombre: 'anular: con el error, sigue trabado', de: '      if (res?.error) {\n        x.enviando = false\n', a: '      if (res?.error) {\n' },
      { nombre: 'anular: después no se recarga la ficha', de: '      if (estado.ficha) await recargarFichaDespuesDePago()\n      // El detalle se vuelve a leer', a: '      // El detalle se vuelve a leer' },
      { nombre: 'anular: el detalle no se vuelve a leer', de: "      if (accionesPago === a && !document.getElementById('modal-detalle-pago').hidden) await abrirModalDetallePago(a.gastoId)", a: '' },
      { nombre: 'anular: el aviso no dice que los cheques volvieron', de: "        ? 'Pago anulado: los cheques volvieron a la cartera y las facturas vuelven a deberse.'", a: "        ? 'Pago anulado.'" },
      { nombre: 'anular: sin gastos:editar_anular no se puede el de otro… ni con ella', de: "        (tieneTarea('gastos', 'editar_anular') || ", a: '        (false || ' },
      { nombre: 'anular: el propio no se puede', de: " || (!!estado.miEmpleadoId && g.empleado_id === estado.miEmpleadoId))", a: ')' },
      { nombre: 'anular: el propio sin saber quién soy', de: '(!!estado.miEmpleadoId && g.empleado_id === estado.miEmpleadoId)', a: '(g.empleado_id === estado.miEmpleadoId)' },
      { nombre: 'anular: se ofrece en un pago ya anulado', de: "      return !!g && g.estado !== 'anulado' &&", a: '      return !!g &&' },
      { nombre: 'anular: el detalle anulado no ofrece pagar de nuevo', de: "          (puedePagar ? '<button type=\"button\" class=\"btn-pago-ayuda\" data-pagar-de-nuevo>Hacer el pago de nuevo</button>' : '')", a: "''" },
      { nombre: '"Hacer el pago de nuevo" no pasa a la empresa del pago', de: '      if (g.unidad_negocio_id && estado.ficha.unidadId !== g.unidad_negocio_id) cambiarUnidadFicha(g.unidad_negocio_id)\n', a: '' },
      { nombre: '"Hacer el pago de nuevo" no abre el pago', de: '      cerrarModalDetallePago()\n      if (g.unidad_negocio_id', a: '      return\n      if (g.unidad_negocio_id' },
      { nombre: '"Cancelar" no cierra el panel', de: '        if (!a.anular?.enviando) { a.anular = null; pintarAccionesDetallePago() }', a: '' },
      { nombre: 'abrir el detalle no carga sus acciones', de: "      cargarAccionesDetallePago(gastoId)   // \"Aplicar a facturas\" y \"Anular el pago\" (30/10/2026), aparte\n", a: '' },
      // ── 5. La orden anulada ───────────────────────────────────────────────
      { nombre: 'orden: "en parte" se ve como anulada entera', de: "      for (const [id, x] of por) if (x.anulados) res.set(id, x.anulados === x.total ? 'anulada' : 'en_parte')", a: "      for (const [id, x] of por) if (x.anulados) res.set(id, 'anulada')" },
      { nombre: 'orden: sin anulados también se marca', de: '      for (const [id, x] of por) if (x.anulados) res.set(', a: '      for (const [id, x] of por) if (true) res.set(' },
      { nombre: 'orden: el renglón no sabe si se anuló', de: 'texto: numeroTextoOrden(o.unidad_negocio_id, o.numero), anulacion: anulacion.get(o.id) ?? null })', a: 'texto: numeroTextoOrden(o.unidad_negocio_id, o.numero), anulacion: null })' },
      { nombre: 'orden: la anulación se lee solo de los pagos de la lista (sin el anulado)', de: '        const anulacion = await leerAnulacionOrdenes(opIds)\n', a: '        const anulacion = new Map()\n' },
      { nombre: 'orden: el renglón dibuja la anulada como siempre', de: "${ordenPago ? (ordenPago.anulacion ? htmlOrdenAnulada(", a: "${ordenPago ? (false ? htmlOrdenAnulada(" },
      { nombre: 'orden: la anulada se puede reimprimir', de: "${ordenPago && !ordenPago.anulacion ? `<button", a: "${ordenPago ? `<button" },
      { nombre: 'orden: no dice "ANULADA EN PARTE"', de: "${anulacion === 'en_parte' ? 'ANULADA EN PARTE' : 'ANULADA'}</span></div>`", a: "ANULADA</span></div>`" },
      { nombre: 'orden: sin tachar', de: "<div class=\"${clase}\"><s>${esc('Orden de pago ' + texto)}</s> <span", a: "<div class=\"${clase}\">${esc('Orden de pago ' + texto)} <span" },
      { nombre: 'detalle anulado: no dice su orden', de: "          (a.ordenTexto ? htmlOrdenAnulada(a.ordenTexto, (a.otrosOrden ?? []).length ? 'en_parte' : 'anulada', 'detalle-pago-orden') : '') +\n", a: '' },
      // 31/10/2026 (rama ci-prueba/orden-pago-a4): re-ancladas (la hoja tiene también "Enviar").
      { nombre: 'hoja: no se marca anulada', de: '      // Anulada en parte (30/10/2026): se lee aparte, por sus gastos.\n      marcarHojaAnulada(ordenId, turno, res.data.anulada)\n', a: '' },
      { nombre: 'hoja anulada: sigue con "Imprimir"', de: "anulacion = 'en_parte'\n      hoja.classList?.add('op-hoja--anulada')\n", a: "anulacion = 'en_parte'\n" },
      { nombre: 'hoja anulada: sin el aviso', de: "      hoja.innerHTML = `<div class=\"op-anulada\" role=\"alert\">", a: "      hoja.innerHTML = '' + `<div hidden class=\"op-anulada\" role=\"alert\">" },
      { nombre: 'hoja anulada: el botón se ve', de: '+ hoja.innerHTML\n      botonesOrdenPago(false)\n    }', a: '+ hoja.innerHTML\n    }' },
      { nombre: 'hoja: marca otra orden abierta después', de: "      if (turno !== turnoOrdenPago || !anulacion) return\n", a: '      if (!anulacion) return\n' },
      { nombre: 'hoja sana: queda marcada de antes', de: "      hoja.classList?.remove('op-hoja--anulada')\n      botonesOrdenPago(true)\n", a: '' },
      { nombre: 'imprimir: imprime una anulada', de: "      if (document.getElementById('orden-pago-hoja').classList?.contains('op-hoja--anulada')) return\n", a: '' },
    ],
  },
])
