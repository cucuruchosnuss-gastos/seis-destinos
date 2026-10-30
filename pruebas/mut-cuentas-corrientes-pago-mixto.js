// Mutaciones de test-cuentas-corrientes-pago-mixto.js (los cheques de cualquier
// empresa, 15/10/2026; el pago en los dos sentidos con una sola llamada y la
// orden de pago, 20/10/2026). Ver mutar.js.
//
//   node pruebas/mut-cuentas-corrientes-pago-mixto.js
'use strict'
const path = require('path')
const { correrMutacionesEnVarios } = require('./mutar')

const RAIZ = path.join(__dirname, '..')
const SUITE = path.join(__dirname, 'test-cuentas-corrientes-pago-mixto.js')

correrMutacionesEnVarios([
  {
    suite: SUITE,
    original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/cuentas-corrientes.html'),
    funciones: ['htmlFilaCartera', 'htmlListaCartera', 'pintarTotalCartera', 'htmlOrdenPago'],
    equivalentes: [
      { expr: 'esc(cobra)', motivo: 'texto armado con formatearFecha() de una fecha y palabras fijas: sin ningún carácter que escapar en los datos de prueba' },
      { expr: "esc(c.numero ?? '—')", motivo: 'lo cubre test-cuentas-corrientes-cheques-pago.js / -xss.js con marcas en el número; acá los números son letras y dígitos' },
      { expr: 'esc(linea2)', motivo: 'lo cubre test-cuentas-corrientes-xss.js (banco y librador con marcas); acá van vacíos' },
      { expr: "esc(linea2 || '—')", motivo: 'lo cubre test-cuentas-corrientes-xss.js (banco y librador con marcas); acá van vacíos' },
      // La orden de pago (20/10/2026): fechaOrden() solo devuelve dd/mm/aaaa
      // de una fecha validada con dígitos o "—", e importeEnLetras() solo
      // letras: no hay nada que escapar, con cualquier dato.
      { expr: 'esc(fechaOrden(f.fecha))', motivo: 'fechaOrden(): dígitos validados por regex o "—"' },
      { expr: 'esc(fechaOrden(c.fecha_pago))', motivo: 'fechaOrden(): dígitos validados por regex o "—"' },
      { expr: 'esc(fechaOrden(d?.fecha))', motivo: 'fechaOrden(): dígitos validados por regex o "—"' },
      { expr: 'esc(fechaOrden(o.fecha))', motivo: 'fechaOrden(): dígitos validados por regex o "—"' },
      { expr: 'esc(importeEnLetras(d?.total))', motivo: 'importeEnLetras(): solo letras de las tablas del código' },
    ],
    manuales: [
      // ── Los cheques de todas las empresas ─────────────────────────────────
      { nombre: 'vuelve a ofrecer solo los de la empresa que paga', de: "cob.estado === 'procesada' && !!cob.unidad_negocio_id && (cob.moneda", a: "cob.estado === 'procesada' && cob.unidad_negocio_id === unidadId && (cob.moneda" },
      { nombre: 'se ofrece un cheque de una cobranza sin empresa', de: "cob.estado === 'procesada' && !!cob.unidad_negocio_id && (cob.moneda", a: "cob.estado === 'procesada' && (cob.moneda" },
      { nombre: 'ningún cheque se marca de otra empresa', de: '          otraEmpresa: cobranzas.get(ch.cobranza_id).unidad_negocio_id !== unidadId,', a: '          otraEmpresa: false,' },
      { nombre: 'el cheque no sabe el nombre de su empresa', de: '          unidadNombre: cobranzas.get(ch.cobranza_id).unidad_negocio_nombre ?? null,', a: '          unidadNombre: null,' },
      // ── El agrupado ───────────────────────────────────────────────────────
      { nombre: 'la empresa que paga no va primero', de: '.sort((a, b) => (Number(b.propia) - Number(a.propia)) || String(a.nombre)', a: '.sort((a, b) => String(a.nombre)' },
      { nombre: 'las otras empresas no van por nombre', de: "|| String(a.nombre).localeCompare(String(b.nombre), 'es'))", a: ')' },
      { nombre: 'ninguna empresa es la propia', de: 'propia: c.unidadId === unidadPagaId, cheques: [] })', a: 'propia: false, cheques: [] })' },
      { nombre: 'la lista no se guarda agrupada (las casillas apuntan mal)', de: '        carteraPago = agruparChequesPorEmpresa(ofrecidos, unidadId).flatMap(g => g.cheques)', a: '        carteraPago = ofrecidos' },
      { nombre: 'sin títulos de empresa en la lista', de: "          html += `<div class=\"cartera-pago__grupo\">${esc(c.unidadNombre ?? '—')}</div>`\n", a: '' },
      { nombre: 'un título por cheque (no por empresa)', de: '        if (i === 0 || c.unidadId !== empresa) {', a: '        if (true) {' },
      { nombre: 'sin "de Dolce Pasta" en la fila', de: "      const deOtra = c.otraEmpresa ? `<span class=\"cartera-pago__empresa\">de ${esc(c.unidadNombre ?? '—')}</span>` : ''", a: "      const deOtra = ''" },
      { nombre: '"de …" también en los de la empresa que paga', de: "      const deOtra = c.otraEmpresa ? `<span", a: "      const deOtra = true ? `<span" },
      { nombre: 'la fábrica de pruebas no se saca', de: 'sinUnidadesDePrueba(chequesParaPagar(cheques, cobranzas, unidadId, bancos), estado.fabrica, c => c.unidadId === unidadId ? null : c.unidadId)', a: 'chequesParaPagar(cheques, cobranzas, unidadId, bancos)' },
      { nombre: 'no se pide el nombre de la empresa', de: ".select('id, estado, unidad_negocio_id, unidad_negocio_nombre, moneda, cliente')", a: ".select('id, estado, unidad_negocio_id, moneda, cliente')" },
      // ── El aviso de otra empresa ──────────────────────────────────────────
      { nombre: 'el aviso dice al revés quién le debe a quién', de: '? `Este cheque es de ${duena}: queda como deuda de ${paga} con ${duena} (Entre empresas)`', a: '? `Este cheque es de ${duena}: queda como deuda de ${duena} con ${paga} (Entre empresas)`' },
      { nombre: 'el aviso de varios en singular', de: "      return cantidad === 1\n", a: '      return true\n' },
      { nombre: 'el aviso cuenta los no tildados', de: "(cheques ?? []).filter(c => c.tildado && c.unidadId !== unidadPagaId)", a: "(cheques ?? []).filter(c => c.unidadId !== unidadPagaId)" },
      { nombre: 'el aviso incluye la empresa que paga', de: "(cheques ?? []).filter(c => c.tildado && c.unidadId !== unidadPagaId)", a: "(cheques ?? []).filter(c => c.tildado)" },
      { nombre: 'el aviso no se muestra', de: '      caja.hidden = !avisos.length\n', a: '      caja.hidden = true\n' },
      { nombre: 'el aviso no se escribe', de: "      caja.innerHTML = avisos.map(t => `<p class=\"cartera-pago__aviso\">${esc(t)}</p>`).join('')\n", a: '' },
      // ── Las cuentas ───────────────────────────────────────────────────────
      { nombre: 'las facturas cuentan las no tildadas', de: '      const cFacturas = (facturas ?? []).filter(f => f.checked).reduce(', a: '      const cFacturas = (facturas ?? []).reduce(' },
      { nombre: 'los cheques cuentan los no tildados', de: '      const cCheques = (cheques ?? []).filter(c => c.tildado).reduce(', a: '      const cCheques = (cheques ?? []).reduce(' },
      { nombre: 'los valores no suman el resto', de: '      const cValores = cCheques + cResto\n', a: '      const cValores = cCheques\n' },
      { nombre: 'las cuentas sin centavos', de: '      return Number.isFinite(x) ? Math.round(x * 100) : 0', a: '      return Number.isFinite(x) ? x * 100 : 0' },
      { nombre: 'la cartera cerrada igual suma sus cheques', de: '        cheques: estado.pagoCheques ? carteraPago : [],\n        montoResto: montoDeCampo', a: '        cheques: carteraPago,\n        montoResto: montoDeCampo' },
      // ── La diferencia ─────────────────────────────────────────────────────
      { nombre: 'faltan valores no se avisa', de: "      if (t.cFacturas > t.cValores) return { tipo: 'faltan',", a: "      if (false) return { tipo: 'faltan'," },
      { nombre: 'sin facturas no es pago a cuenta', de: "      if (!t.cFacturas) return { tipo: 'a_cuenta',", a: "      if (false) return { tipo: 'a_cuenta'," },
      { nombre: 'lo que sobra no se avisa', de: "      if (t.cValores > t.cFacturas) return { tipo: 'a_favor',", a: "      if (false) return { tipo: 'a_favor'," },
      { nombre: 'la barra muestra la diferencia con signo', de: 'importeHtml(Math.abs(t.cDiferencia) / 100, moneda)', a: 'importeHtml(t.cDiferencia / 100, moneda)' },
      // ── Aplicar a las más viejas ──────────────────────────────────────────
      { nombre: 'aplicar: no ordena por fecha', de: ".sort((a, b) => String(a.f.fecha ?? '9999').localeCompare(String(b.f.fecha ?? '9999')) || a.i - b.i)", a: '.sort((a, b) => a.i - b.i)' },
      { nombre: 'aplicar: de la más nueva a la más vieja', de: ".sort((a, b) => String(a.f.fecha ?? '9999').localeCompare(String(b.f.fecha ?? '9999')) || a.i - b.i)", a: ".sort((a, b) => String(b.f.fecha ?? '9999').localeCompare(String(a.f.fecha ?? '9999')) || a.i - b.i)" },
      { nombre: 'aplicar: la última entera aunque no alcance', de: '        const parte = Math.min(saldo, quedan)\n', a: '        const parte = saldo\n' },
      { nombre: 'aplicar: no descuenta lo aplicado', de: '        quedan -= parte\n', a: '' },
      { nombre: 'aplicar: no destilda las que no entran', de: "      const res = (facturas ?? []).map(f => ({ ...f, checked: false, monto: 0 }))", a: "      const res = (facturas ?? []).map(f => ({ ...f }))" },
      { nombre: 'aplicar: toca la lista original', de: "      const res = (facturas ?? []).map(f => ({ ...f, checked: false, monto: 0 }))", a: "      const res = (facturas ?? []); res.forEach(f => { f.checked = false; f.monto = 0 })" },
      { nombre: 'aplicar: tilda una con saldo 0', de: '        if (!saldo) continue\n', a: '' },
      { nombre: 'aplicar: el botón no hace nada', de: '      facturasParaPago = aplicarAFacturasViejas(facturasParaPago, totalesPagoActuales().cValores)\n', a: '' },
      // ── Completar ─────────────────────────────────────────────────────────
      { nombre: 'completar: pisa lo que ya había escrito', de: '      return (Math.max(centavosDe(montoActual), 0) + falta) / 100', a: '      return falta / 100' },
      { nombre: 'completar: completa aunque no falte', de: '      if (falta <= 0) return null\n', a: '' },
      { nombre: 'completar: el botón no escribe el monto', de: "      ponerNumero(document.getElementById('campo-monto-pago'), nuevo)\n", a: '' },
      // ── Lo que frena ──────────────────────────────────────────────────────
      { nombre: 'validar: deja confirmar con facturas > valores', de: '      if (t.cFacturas > t.cValores) return `Faltan', a: '      if (false) return `Faltan' },
      { nombre: 'validar: deja una fecha futura', de: "      if (fecha > hoy) return 'La fecha del pago no puede ser futura.'", a: "      if (false) return 'La fecha del pago no puede ser futura.'" },
      { nombre: 'validar: deja confirmar sin valores', de: '      if (t.cValores <= 0) return enPesos', a: '      if (false) return enPesos' },
      { nombre: 'validar: un monto sin medio', de: '      if (t.cResto > 0 && !medio) return enPesos', a: '      if (false) return enPesos' },
      { nombre: 'validar: un monto sin cuenta', de: "      if (t.cResto > 0 && !cuentaId) return 'Seleccioná la cuenta.'", a: "      if (false) return 'Seleccioná la cuenta.'" },
      { nombre: 'validar: pide cuenta también con solo cheques', de: "      if (t.cResto > 0 && !cuentaId) return 'Seleccioná la cuenta.'", a: "      if (!cuentaId) return 'Seleccioná la cuenta.'" },
      { nombre: 'validar: deja aplicar más que el saldo', de: '        if (centavosDe(f.monto) > centavosDe(f.saldo)) return', a: '        if (false) return' },
      { nombre: 'validar: deja una tildada en cero', de: '        if (centavosDe(f.monto) <= 0) return `Poné cuánto', a: '        if (false) return `Poné cuánto' },
      { nombre: 'validar: cheques en dólares', de: "      if (!enPesos && (chequeIds ?? []).length) return", a: "      if (false) return" },
      { nombre: 'confirmar: frena sin decirlo', de: '        estado.pagoError = falla\n', a: '' },
      // ── Los parámetros ────────────────────────────────────────────────────
      { nombre: 'params: sin cheques viaja null en vez de lista vacía', de: '        p_cheque_ids: chequeIds ?? [],', a: '        p_cheque_ids: chequeIds?.length ? chequeIds : null,' },
      { nombre: 'params: el resto en centavos', de: '        p_monto_resto: conResto ? t.cResto / 100 : 0,', a: '        p_monto_resto: conResto ? t.cResto : 0,' },
      { nombre: 'params: sin resto igual manda el medio', de: '        p_medio_resto: conResto ? medio : null,', a: '        p_medio_resto: medio,' },
      { nombre: 'params: sin resto igual manda la cuenta', de: '        p_cuenta_resto: conResto ? cuentaId : null,', a: '        p_cuenta_resto: cuentaId,' },
      { nombre: 'params: viajan las no tildadas', de: "        .filter(f => f.checked && centavosDe(f.monto) > 0)\n        .map(f => ({ factura_pendiente_id", a: "        .filter(f => centavosDe(f.monto) > 0)\n        .map(f => ({ factura_pendiente_id" },
      { nombre: 'params: observaciones sin recortar', de: "        p_observaciones: String(observaciones ?? '').trim() || null,", a: "        p_observaciones: observaciones ?? null," },
      { nombre: 'params: no lee las observaciones del campo', de: "            observaciones: document.getElementById('campo-observaciones-orden').value,", a: '            observaciones: null,' },
      // ── El resumen ────────────────────────────────────────────────────────
      { nombre: 'el resumen no dice cuántos son de otra empresa', de: '...otras.map(g => `${g.cheques.length} de ${g.nombre}`)', a: '' },
      { nombre: 'el resumen no suma el resto', de: '      const cTotal = cCheques + cResto\n', a: '      const cTotal = cCheques\n' },
      { nombre: 'el resumen no dice el medio', de: "      if (cResto > 0) partes.push(`${NOMBRE_MEDIO[medio] ?? 'Efectivo, transferencia o QR'} ${formatearImporte(cResto / 100, moneda)}`)\n", a: '' },
      { nombre: 'el resumen cuenta los cheques sin tildar', de: '      const tildados = (cheques ?? []).filter(c => c.tildado)\n      const cCheques = Math.round', a: '      const tildados = (cheques ?? [])\n      const cCheques = Math.round' },
      { nombre: 'el resumen no avisa lo que queda a favor', de: '      if (cAplicado >= cTotal) return', a: '      if (true) return' },
      { nombre: 'el resumen va por innerHTML', de: '      resumen.textContent = texto\n', a: '      resumen.innerHTML = texto\n' },
      { nombre: 'el resumen no mira las facturas tildadas', de: "        aplicaciones: facturasParaPago.filter(f => f.checked).map(f => ({ numero: f.numero, monto: f.monto })),", a: "        aplicaciones: facturasParaPago.map(f => ({ numero: f.numero, monto: f.monto }))," },
      // ── El pie ────────────────────────────────────────────────────────────
      { nombre: 'el pie: "Completar" no aparece', de: "      document.getElementById('btn-completar-diferencia').hidden = d.tipo !== 'faltan'", a: "      document.getElementById('btn-completar-diferencia').hidden = true" },
      { nombre: 'el pie: "Aplicar a las más viejas" no aparece', de: '      document.getElementById(\'btn-aplicar-viejas\').hidden =\n        !(t.cValores > 0', a: '      document.getElementById(\'btn-aplicar-viejas\').hidden = true || \n        !(t.cValores > 0' },
      { nombre: 'el pie: faltan no se pinta en bordó', de: "      aviso.classList.toggle('pago-aviso--falta', d.tipo === 'faltan')", a: "      aviso.classList.toggle('pago-aviso--falta', false)" },
      { nombre: 'el pie: el error no se pinta', de: '      err.hidden = !estado.pagoError\n', a: '      err.hidden = true\n' },
      { nombre: 'el pie: un cambio no borra el error viejo', de: '    function refrescarPago() {\n      estado.pagoError = null\n', a: '    function refrescarPago() {\n' },
      // ── Confirmar ─────────────────────────────────────────────────────────
      { nombre: 'confirmar: en pesos vuelve el pago simple', de: '        if (enPesos) {\n          // UNA sola llamada', a: '        if (false) {\n          // UNA sola llamada' },
      { nombre: 'confirmar: un doble toque manda dos veces', de: '    async function confirmarPago() {\n      if (estado.pagoEnviando) return\n', a: '    async function confirmarPago() {\n' },
      { nombre: 'confirmar: el error de la base con prefijo', de: '        estado.pagoError = err?.message || String(err)\n', a: "        estado.pagoError = 'Error al registrar el pago: ' + (err?.message || String(err))\n" },
      { nombre: 'confirmar: no se abre la orden', de: '          if (data?.orden_pago_id) await abrirOrdenPago(data.orden_pago_id)\n', a: '' },
      { nombre: 'confirmar: no se recarga la ficha', de: '          cerrarModalPago()\n          await recargarFichaDespuesDePago()\n          if (data', a: '          cerrarModalPago()\n          if (data' },
      { nombre: 'confirmar: el botón queda trabado', de: '        estado.pagoEnviando = false\n        btn.classList.remove', a: '        btn.classList.remove' },
      { nombre: 'confirmar: un error de la base igual cierra', de: '          if (error) throw error\n          mostrarExito(textoExitoPago(data))', a: '          mostrarExito(textoExitoPago(data))' },
      { nombre: 'el aviso sin el número de la orden', de: "      const numero = typeof r?.numero_texto === 'string' && r.numero_texto.trim() ? ` Orden de pago ${r.numero_texto.trim()}.` : ''", a: "      const numero = ''" },
      { nombre: 'en dólares: el monto en centavos', de: '            p_monto: t.cResto / 100,', a: '            p_monto: t.cResto,' },
      // ── La orden de pago ──────────────────────────────────────────────────
      { nombre: 'la orden dice de qué empresa venía el cheque', de: "<td>${esc(c.banco ?? '—')}${c.es_echeq ? ' <strong>eCheq</strong>' : ''}</td>", a: "<td>${esc(c.banco ?? '—')}${c.es_echeq ? ' <strong>eCheq</strong>' : ''} ${esc(c.de_empresa ?? '')}</td>" },
      { nombre: 'la orden imprime la cuenta', de: "<tr><td>${esc(NOMBRE_MEDIO_ORDEN[o.medio] ?? o.medio ?? '—')}</td>", a: "<tr><td>${esc(NOMBRE_MEDIO_ORDEN[o.medio] ?? o.medio ?? '—')} ${esc(o.cuenta ?? '')}</td>" },
      { nombre: 'la orden sin "eCheq"', de: "${c.es_echeq ? ' <strong>eCheq</strong>' : ''}", a: '' },
      { nombre: 'la orden sin el total en letras', de: '        <div class="op-letras">Son ${esc(importeEnLetras(d?.total))}</div>\n', a: '' },
      { nombre: 'la orden: el saldo a favor siempre', de: "        ${favor > 0 ? `<div class=\"op-favor\">", a: "        ${true ? `<div class=\"op-favor\">" },
      { nombre: 'la orden: sin facturas no dice "Pago a cuenta"', de: "        : '<p>Pago a cuenta</p>'", a: "        : ''" },
      { nombre: 'la orden: el CUIT sin guiones', de: '      return d.length === 11 ? `${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10)}` : String(cuit ?? \'\').trim()', a: "      return String(cuit ?? '').trim()" },
      { nombre: 'la orden: el logo de cualquier dirección', de: "      return /^[a-z0-9][a-z0-9._-]*\\.(png|jpe?g|webp)$/i.test(n) && !n.includes('..') ? n : null", a: '      return n || null' },
      { nombre: 'la orden: sin el saldo que queda', de: '<td class="op-num">${importeHtml(f.saldo_actual)}</td>', a: '<td class="op-num">—</td>' },
      { nombre: 'la orden: sin quién la generó', de: '        ${d?.creada_por ? `<div class="op-pie">Generada por ${esc(d.creada_por)}</div>` : \'\'}', a: '' },
      { nombre: 'la orden que no se pudo leer no lo dice', de: "        hoja.innerHTML = `<p class=\"pago-error\">No se pudo leer la orden de pago: ${esc(res?.error?.message ?? 'no vino nada')}. Reimprimila desde la ficha del proveedor.</p>`\n        return\n", a: '        return\n' },
      { nombre: 'imprimir: no marca el html', de: "      raiz.classList.add('op-imprimiendo')\n", a: '' },
      { nombre: 'cerrar la orden no saca la marca de imprimir', de: "      document.getElementById('modal-orden-pago').hidden = true\n      document.documentElement.classList.remove('op-imprimiendo')", a: "      document.getElementById('modal-orden-pago').hidden = true" },
      // ── En letras ─────────────────────────────────────────────────────────
      { nombre: 'letras: "cien" también en "ciento uno"', de: "      if (c) partes.push(n === 100 ? 'cien' : LETRAS_CENTENA[c])", a: "      if (c) partes.push(c === 1 ? 'cien' : LETRAS_CENTENA[c])" },
      { nombre: 'letras: "uno mil"', de: "        if (corto) t = t.replace(/veintiuno$/, 'veintiún').replace(/(^|\\s)uno$/, '$1un')", a: '        if (false) t = t' },
      { nombre: 'letras: "un mil"', de: "      if (miles === 1) partes.push('mil')", a: "      if (false) partes.push('mil')" },
      { nombre: 'letras: "uno millones"', de: "      if (millones === 1) partes.push('un millón')", a: "      if (false) partes.push('un millón')" },
      { nombre: 'letras: sin "de" en los millones justos', de: "(millonesJustos ? ' de' : '')", a: "''" },
      { nombre: 'letras: "un pesos"', de: "(pesos === 1 ? ' peso' : ' pesos')", a: "' pesos'" },
      { nombre: 'letras: sin los centavos', de: '      return `${textoPesos} con ${textoCent}`.toUpperCase()', a: '      return textoPesos.toUpperCase()' },
      { nombre: 'letras: centavos sin redondear', de: '      const c = Math.round(Math.abs(Number(importe)) * 100)', a: '      const c = Math.floor(Math.abs(Number(importe)) * 100)' },
      // ── La orden de cada pago, en su renglón (30/10/2026) ────────────────────
      { nombre: 'ficha: el número sin el prefijo de la empresa', de: "      const prefijo = estado.maestros?.unidades?.find(u => u.id === unidadId)?.prefijo ?? ''", a: "      const prefijo = ''" },
      { nombre: 'pagos: las órdenes se leen sin permiso', de: "      if (!(tieneTarea('cuentas_corrientes', 'registrar_pago') || tieneTarea('cuentas_corrientes', 'ver_todo'))) return mapa", a: '      if (false) return mapa' },
      { nombre: 'pagos: la orden con el prefijo de otra empresa', de: 'texto: numeroTextoOrden(o.unidad_negocio_id, o.numero)', a: "texto: numeroTextoOrden('u-n', o.numero)" },
      { nombre: 'pagos: un gasto sin orden igual trae una', de: '          for (const g of data ?? []) if (g.orden_pago_id) gastoAOrden.set(g.id, g.orden_pago_id)', a: "          for (const g of data ?? []) gastoAOrden.set(g.id, g.orden_pago_id ?? 'op-1')" },
      { nombre: 'pagos: se leen también las facturas', de: "      const ids = [...new Set((filas ?? []).filter(m => m.tipo === 'pago' && m.gasto_id).map(m => m.gasto_id))]\n      const gastoAOrden", a: "      const ids = [...new Set((filas ?? []).map(m => m.gasto_id ?? m.factura_pendiente_id))]\n      const gastoAOrden" },
      // ── Abrir el formulario y la cuenta ───────────────────────────────────
      { nombre: 'abrir: vuelve a pedir la sugerencia FIFO', de: "      if (estado.pagoFacturaElegida) facturasParaPago = elegirSoloFactura(facturasParaPago, estado.pagoFacturaElegida, montoDeCampo('campo-monto-pago'))", a: "      await supabase.rpc('sugerir_facturas_fifo', {})\n      if (estado.pagoFacturaElegida) facturasParaPago = elegirSoloFactura(facturasParaPago, estado.pagoFacturaElegida, montoDeCampo('campo-monto-pago'))" },
      { nombre: 'abrir: las facturas vienen tildadas', de: "        saldo: Number(x.saldo_pendiente) || 0,\n        checked: false,", a: "        saldo: Number(x.saldo_pendiente) || 0,\n        checked: true," },
      { nombre: 'abrir: sin filtrar por moneda', de: "          .eq('moneda', moneda)\n          .in('estado', ['pendiente', 'parcial'])\n          .order('fecha_factura', { ascending: true }))", a: "          .in('estado', ['pendiente', 'parcial'])\n          .order('fecha_factura', { ascending: true }))" },
      { nombre: 'la cartera cerrada no destilda', de: '      if (!estado.pagoCheques) carteraPago.forEach(c => { c.tildado = false })\n      pintarCarteraPago()', a: '      pintarCarteraPago()' },
      { nombre: 'el QR sale de una caja de efectivo', de: "transferencia: 'banco', qr: 'banco' }", a: "transferencia: 'banco', qr: 'efectivo' }" },
      // ── Lo que se vio en la pantalla ──────────────────────────────────────
      { nombre: 'el botón elegido se aclara con el mouse encima', de: '    .btn-tipo-doc--seleccionado:hover { border-color: var(--color-acento); background: var(--color-acento); }\n', a: '' },
      { nombre: 'las líneas del cheque vuelven a ser sueltas (se montan sobre el importe)', de: '    .cartera-pago__linea1 { display: block; }\n', a: '' },
      { nombre: 'al imprimir se ve todo', de: '      html.op-imprimiendo body > *:not(#modal-orden-pago) { display: none !important; }\n', a: '' },
      { nombre: 'el monto de una factura sin máximo', de: 'enlazarCampoNumero(inp, { decimales: 2, max: facturasParaPago[i].saldo > 0 ? facturasParaPago[i].saldo : undefined })', a: 'enlazarCampoNumero(inp, { decimales: 2 })' },
    ],
  },
])
