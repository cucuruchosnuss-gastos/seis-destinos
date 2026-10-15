// Mutaciones de test-cuentas-corrientes-pago-mixto.js (pago con cheques de
// cualquier empresa y pago mixto, 15/10/2026). Ver mutar.js.
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
    funciones: ['htmlFilaCartera', 'htmlListaCartera', 'pintarTotalCartera'],
    equivalentes: [
      { expr: 'esc(cobra)', motivo: 'texto armado con formatearFecha() de una fecha y palabras fijas: sin ningún carácter que escapar en los datos de prueba' },
      { expr: "esc(c.numero ?? '—')", motivo: 'lo cubre test-cuentas-corrientes-cheques-pago.js / -xss.js con marcas en el número; acá los números son letras y dígitos' },
      { expr: 'esc(linea2)', motivo: 'lo cubre test-cuentas-corrientes-xss.js (banco y librador con marcas); acá van vacíos' },
      { expr: "esc(linea2 || '—')", motivo: 'lo cubre test-cuentas-corrientes-xss.js (banco y librador con marcas); acá van vacíos' },
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
      // ── El reparto ────────────────────────────────────────────────────────
      { nombre: 'el reparto no ordena por fecha (los cheques no cubren la más vieja)', de: ".sort((x, y) => String(x.a.fecha ?? '').localeCompare(String(y.a.fecha ?? '')) || x.i - y.i)", a: '.sort((x, y) => x.i - y.i)' },
      { nombre: 'el reparto ordena de la más nueva a la más vieja', de: ".sort((x, y) => String(x.a.fecha ?? '').localeCompare(String(y.a.fecha ?? '')) || x.i - y.i)", a: ".sort((x, y) => String(y.a.fecha ?? '').localeCompare(String(x.a.fecha ?? '')) || x.i - y.i)" },
      { nombre: 'con la misma fecha, el orden se invierte', de: "localeCompare(String(y.a.fecha ?? '')) || x.i - y.i)", a: "localeCompare(String(y.a.fecha ?? '')) || y.i - x.i)" },
      { nombre: 'el reparto sin centavos', de: '      let quedan = Math.round(Number(montoCheques) * 100)', a: '      let quedan = Number(montoCheques) * 100' },
      { nombre: 'el reparto: los cheques cubren la factura entera aunque no alcancen', de: '        const conCheques = Math.min(total, Math.max(quedan, 0))', a: '        const conCheques = quedan > 0 ? total : 0' },
      { nombre: 'el reparto: los cheques no se descuentan', de: '        quedan -= conCheques\n', a: '' },
      { nombre: 'el reparto: el resto no recibe lo que quedó', de: '        if (total - conCheques > 0) resto.push(', a: '        if (false) resto.push(' },
      { nombre: 'el reparto: el resto recibe la factura entera', de: 'resto.push({ factura_pendiente_id: a.factura_pendiente_id, monto_aplicado: (total - conCheques) / 100 })', a: 'resto.push({ factura_pendiente_id: a.factura_pendiente_id, monto_aplicado: total / 100 })' },
      { nombre: 'el reparto manda la fecha a la base', de: 'cheques.push({ factura_pendiente_id: a.factura_pendiente_id, monto_aplicado: conCheques / 100 })', a: 'cheques.push({ factura_pendiente_id: a.factura_pendiente_id, monto_aplicado: conCheques / 100, fecha: a.fecha })' },
      { nombre: 'una aplicación en cero viaja', de: '        if (!(total > 0)) continue\n', a: '' },
      // ── El resumen ────────────────────────────────────────────────────────
      { nombre: 'el resumen no dice cuántos son de otra empresa', de: '...otras.map(g => `${g.cheques.length} de ${g.nombre}`)', a: '' },
      { nombre: 'el resumen no suma el resto', de: '      const cTotal = cCheques + cResto\n', a: '      const cTotal = cCheques\n' },
      { nombre: 'el resumen no dice el medio del resto', de: '      if (cResto > 0) t += ` + ${NOMBRE_COMPLETAR[completar] ?? completar} ${formatearImporte(cResto / 100)}`\n', a: '' },
      { nombre: 'el resumen cuenta los cheques sin tildar', de: '      const tildados = (cheques ?? []).filter(c => c.tildado)\n      if (!tildados.length)', a: '      const tildados = (cheques ?? [])\n      if (!tildados.length)' },
      { nombre: 'el resumen no avisa lo que queda a favor', de: '      if (cAplicado >= cTotal) return', a: '      if (true) return' },
      { nombre: 'el resumen suma el resto aunque no se complete', de: '      const cResto = completar && Number(montoResto) > 0 ?', a: '      const cResto = Number(montoResto) > 0 ?' },
      { nombre: 'el resumen va por innerHTML', de: '      el.textContent = texto\n    }', a: '      el.innerHTML = texto\n    }' },
      { nombre: 'el resumen se ve sin la cartera', de: "      const texto = medioPagoSeleccionado === 'cartera' && !estado.pagoRestoPendiente\n", a: '      const texto = !estado.pagoRestoPendiente\n' },
      { nombre: 'el resumen no mira las facturas tildadas', de: "aplicaciones: facturasParaPago.filter(f => f.checked).map(f => ({ numero: f.numero, monto: f.monto })),", a: "aplicaciones: facturasParaPago.map(f => ({ numero: f.numero, monto: f.monto }))," },
      // ── Completar con ─────────────────────────────────────────────────────
      { nombre: 'el monto total no suma el resto', de: "      const resto = estado.pagoCompletar ? Math.round((montoDeCampo('campo-resto-pago') ?? 0) * 100) : 0", a: '      const resto = 0' },
      { nombre: 'el monto total suma el resto sin completar', de: "      const resto = estado.pagoCompletar ? Math.round(", a: "      const resto = true ? Math.round(" },
      { nombre: 'el monto con la cartera vuelve a ser solo los cheques', de: "ponerNumero(document.getElementById('campo-monto-pago'), tildados.length ? montoTotalCartera() : null)", a: "ponerNumero(document.getElementById('campo-monto-pago'), tildados.length ? sumaCheques(carteraPago) : null)" },
      { nombre: '"Completar con" no aparece con la cartera', de: "      document.getElementById('grupo-completar-pago').hidden = !enCartera\n", a: "      document.getElementById('grupo-completar-pago').hidden = true\n" },
      { nombre: 'el campo del resto no aparece', de: "      document.getElementById('grupo-resto-pago').hidden = !c\n", a: "      document.getElementById('grupo-resto-pago').hidden = true\n" },
      { nombre: 'la cuenta no sigue a "Completar con"', de: "      const medio = medioPagoSeleccionado === 'cartera' ? estado.pagoCompletar : medioPagoSeleccionado", a: '      const medio = medioPagoSeleccionado' },
      { nombre: 'otro medio no olvida "Completar con"', de: "      if (medioPagoSeleccionado !== 'cartera') estado.pagoCompletar = null\n", a: '' },
      { nombre: 'volver a "Solo cheques" no borra el resto', de: "      if (!estado.pagoCompletar) ponerNumero(document.getElementById('campo-resto-pago'), null)\n", a: '' },
      { nombre: '"Completar con" se puede cambiar con el resto pendiente', de: '      if (estado.pagoRestoPendiente) return\n      estado.pagoCompletar = valor || null', a: '      estado.pagoCompletar = valor || null' },
      { nombre: 'el resto no es un campo de número', de: "'campo-saldo-inicial-importe', 'campo-resto-pago']", a: "'campo-saldo-inicial-importe']" },
      // ── Confirmar ─────────────────────────────────────────────────────────
      { nombre: 'mixto: no se manda el resto', de: '        if (completar) {\n          estado.pagoRestoPendiente = {', a: '        if (false) {\n          estado.pagoRestoPendiente = {' },
      { nombre: 'mixto: los cheques llevan TODAS las aplicaciones', de: "        const base = { proveedorId: estado.ficha.proveedorId, unidadId: estado.ficha.unidadId, aplicaciones: reparto.cheques }", a: "        const base = { proveedorId: estado.ficha.proveedorId, unidadId: estado.ficha.unidadId, aplicaciones }" },
      { nombre: 'mixto: el resto lleva TODAS las aplicaciones', de: '{ gastoCheques, medio: completar, monto: montoResto, aplicaciones: reparto.resto, fecha }', a: '{ gastoCheques, medio: completar, monto: montoResto, aplicaciones, fecha }' },
      { nombre: 'mixto: el resto se paga con el total', de: '{ gastoCheques, medio: completar, monto: montoResto, aplicaciones: reparto.resto, fecha }', a: '{ gastoCheques, medio: completar, monto, aplicaciones: reparto.resto, fecha }' },
      { nombre: 'mixto: el reparto mira el total y no los cheques', de: ".map(f => ({ factura_pendiente_id: f.id, monto_aplicado: f.monto, fecha: f.fecha })), sumaCheques(carteraPago))", a: ".map(f => ({ factura_pendiente_id: f.id, monto_aplicado: f.monto, fecha: f.fecha })), monto)" },
      { nombre: 'mixto: el reparto sin la fecha de cada factura', de: 'monto_aplicado: f.monto, fecha: f.fecha })), sumaCheques', a: 'monto_aplicado: f.monto })), sumaCheques' },
      { nombre: 'mixto: el resto como "cheque"', de: '        p_medio_pago: pend.medio, p_cuenta_id: cuentaId,', a: "        p_medio_pago: 'cheque', p_cuenta_id: cuentaId," },
      { nombre: 'mixto: el resto sin cuenta', de: '        p_medio_pago: pend.medio, p_cuenta_id: cuentaId,', a: '        p_medio_pago: pend.medio, p_cuenta_id: null,' },
      { nombre: 'mixto: el resto en otra fecha', de: '        p_fecha_pago: pend.fecha, p_aplicaciones: pend.aplicaciones,', a: '        p_fecha_pago: null, p_aplicaciones: pend.aplicaciones,' },
      { nombre: 'mixto: sin el resto no frena', de: "        if (completar && !(Number.isFinite(montoResto) && montoResto > 0))\n          return mostrarError(", a: '        if (false)\n          return mostrarError(' },
      { nombre: 'mixto: no pide la cuenta del resto', de: "medioPagoSeleccionado === 'transferencia' || !!completar", a: "medioPagoSeleccionado === 'transferencia'" },
      { nombre: 'mixto: no frena lo aplicado por encima del saldo', de: '        if (pasada) return mostrarError(', a: '        if (false) return mostrarError(' },
      { nombre: 'mixto: el aviso de éxito no menciona el resto', de: '          ? (completar\n            ?', a: '          ? (false\n            ?' },
      // ── Si el segundo falla ───────────────────────────────────────────────
      { nombre: 'falla el resto: se reintenta todo (vuelven los cheques)', de: '      if (estado.pagoRestoPendiente) {\n        const btnResto', a: '      if (false) {\n        const btnResto' },
      { nombre: 'falla el resto: no queda pendiente', de: '      if (error) {\n        pintarRestoPendiente(error.message)', a: '      if (error) {\n        estado.pagoRestoPendiente = null\n        pintarRestoPendiente(error.message)' },
      { nombre: 'falla el resto: igual se cierra con éxito', de: '          if (!(await registrarRestoPendiente())) {', a: '          if (!(await registrarRestoPendiente()) && false) {' },
      { nombre: 'falla el resto: no se recarga la ficha', de: "            // La ficha ya muestra el pago de los cheques.\n            try {\n              await Promise.all([cargarFichaSaldos(), cargarFichaMovimientos(), cargarFichaCreditos()])", a: '            // La ficha ya muestra el pago de los cheques.\n            try {\n              await Promise.all([cargarFichaMovimientos(), cargarFichaCreditos()])' },
      { nombre: 'falla el resto: el aviso no dice que los cheques ya se pagaron', de: '      return `Los cheques ya quedaron pagados${gasto}. Falta registrar el resto de ${formatearImporte(pend?.monto)}: ${mensaje}`', a: '      return `Falta registrar el resto de ${formatearImporte(pend?.monto)}: ${mensaje}`' },
      { nombre: 'falla el resto: el aviso sin el error de la base', de: '      return `Los cheques ya quedaron pagados${gasto}. Falta registrar el resto de ${formatearImporte(pend?.monto)}: ${mensaje}`', a: '      return `Los cheques ya quedaron pagados${gasto}. Falta registrar el resto de ${formatearImporte(pend?.monto)}.`' },
      { nombre: 'falla el resto: el aviso sin el gasto', de: "      const gasto = pend?.gastoCheques ? ` (gasto ${String(pend.gastoCheques).slice(0, 8)})` : ''", a: "      const gasto = ''" },
      { nombre: 'falla el resto: el aviso no se ve', de: '      aviso.hidden = !pend\n', a: '      aviso.hidden = true\n' },
      { nombre: 'falla el resto: un repintado borra el error', de: '      if (pend && mensaje != null) pend.error = mensaje\n', a: '      if (pend) pend.error = mensaje\n' },
      { nombre: 'falla el resto: el error no va también como toast', de: '        mostrarError(textoRestoPendiente(pend, error.message))\n        return false', a: '        return false' },
      { nombre: 'falla el resto: los cheques se pueden volver a tocar', de: "      document.getElementById('grupo-cartera-pago').hidden = !!pend || medioPagoSeleccionado !== 'cartera'", a: "      document.getElementById('grupo-cartera-pago').hidden = medioPagoSeleccionado !== 'cartera'" },
      { nombre: 'falla el resto: los medios siguen habilitados', de: ".forEach(b => { b.disabled = !!pend })", a: '.forEach(b => { b.disabled = false })' },
      { nombre: 'falla el resto: las facturas se pueden volver a tocar', de: "      document.getElementById('grupo-facturas-pago').hidden = !!pend\n", a: '' },
      { nombre: 'falla el resto: el resto se puede cambiar', de: "      document.getElementById('campo-resto-pago').readOnly = !!pend\n", a: '' },
      { nombre: 'falla el resto: el botón no dice "Registrar el resto"', de: "pend ? 'Registrar el resto' : 'Confirmar pago'", a: "'Confirmar pago'" },
      { nombre: 'sin red en el segundo: va como error de los cheques', de: "      } catch (e) {\n        error = { message: e?.message ?? String(e) }\n      }", a: '      } finally {}' },
      { nombre: 'reintentar: no lee la cuenta elegida ahora', de: "      const cuentaId = document.getElementById('campo-cuenta-pago-cc').value || null\n      if (!cuentaId) { mostrarError('Seleccioná la cuenta.'); return false }", a: "      const cuentaId = 'cta-ef'" },
      { nombre: 'reintentar bien: queda pendiente', de: '      estado.pagoRestoPendiente = null\n      return true', a: '      return true' },
      // ── Lo que se vio en la pantalla ──────────────────────────────────────
      { nombre: 'el botón elegido se aclara con el mouse encima', de: '    .btn-tipo-doc--seleccionado:hover { border-color: var(--color-acento); background: var(--color-acento); }\n', a: '' },
      { nombre: 'las líneas del cheque vuelven a ser sueltas (se montan sobre el importe)', de: '    .cartera-pago__linea1 { display: block; }\n', a: '' },
      { nombre: 'cerrar con el resto pendiente no avisa', de: '      if (pend) mostrarError(`Quedó sin registrar el resto de', a: '      if (false) mostrarError(`Quedó sin registrar el resto de' },
    ],
  },
])
