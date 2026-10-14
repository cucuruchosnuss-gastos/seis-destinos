// Mutaciones de test-gastos-prestamos.js (pagar la cuota de un préstamo desde
// el wizard de Gastos, 13/10/2026). Ver mutar.js.
//
//   node pruebas/mut-gastos-prestamos.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

const NUM = 'un número o una fecha del código: sacarle el esc() no cambia nada'
const CONST = 'un texto fijo del código o un valor con CHECK (ARS / USD)'

correrMutaciones({
  suite: path.join(__dirname, 'test-gastos-prestamos.js'),
  original: path.join(__dirname, '..', 'modulos', 'gastos.html'),
  funciones: ['htmlTarjetaPrestamo', 'htmlOpcionesCuentaPrestamo', 'htmlPartePrestamo', 'htmlPagoPrestamo', 'htmlPrestamos'],
  equivalentes: [
    ['esc(i)', NUM], ['esc(n)', NUM], ['esc(m)', CONST], ['esc(px.numero)', NUM], ['esc(f.cuotas)', NUM],
    ['esc(f.cuotas_pagas ?? 0)', NUM], ['esc(f.cuotas ?? 0)', NUM], ['esc(cuota.numero)', NUM], ['esc(c.numero)', NUM],
    ['esc(fechaPrestamo(px.vencimiento))', NUM], ['esc(fechaPrestamo(cuota.vencimiento))', NUM], ['esc(fechaPrestamo(c.vencimiento))', NUM],
    ['esc(formatearImporte(px.falta, f.moneda))', NUM], ['esc(formatearImporte(f.saldo, f.moneda))', NUM],
    ['esc(formatearImporte(cuota.falta, f.moneda))', NUM], ['esc(formatearImporte(cuota.importe, f.moneda))', NUM],
    ['esc(hoy)', NUM], ["esc(pg.fecha ?? '')", NUM], ['esc(c.texto)', 'el cálculo: números formateados y textos fijos'],
    ['esc(ps.error)', CONST], ['esc(pg.errorDetalle)', CONST], ["esc(pg.error ?? '')", 'arranca vacío: el error se escribe con textContent'],
    ['esc(NOMBRE_MONEDA_PRESTAMO[m])', CONST], ['esc(x.moneda)', CONST],
    ['esc(f.id)', 'uuid de la base'], ['esc(c.id)', 'uuid de la base'], ['esc(o.value)', 'uuid de la base'],
  ].map(([expr, motivo]) => ({ expr, motivo })),
  manuales: [
    { nombre: 'el préstamo sin pedir el permiso', de: 'esCategoriaPrestamos(categoriaSeleccionada) && puedeUsarCuentasEmpresa()\n    }', a: 'esCategoriaPrestamos(categoriaSeleccionada)\n    }' },
    { nombre: 'el préstamo también por Vehículos', de: 'return !viaVehiculos && !!unidadSeleccionada && esCategoriaPrestamos', a: 'return !!unidadSeleccionada && esCategoriaPrestamos' },
    { nombre: 'la línea del permiso al revés', de: "const mostrar = esCategoriaPrestamos(categoriaSeleccionada) && !puedeUsarCuentasEmpresa()", a: "const mostrar = esCategoriaPrestamos(categoriaSeleccionada) && puedeUsarCuentasEmpresa()" },
    { nombre: 'el dólar multiplica en vez de dividir', de: "monedaPrestamo === 'USD' ? monto / t : monto * t", a: "monedaPrestamo === 'USD' ? monto * t : monto / t" },
    { nombre: 'no redondea la conversión', de: "return redondearPlata(monedaPrestamo === 'USD' ? monto / t : monto * t)", a: "return (monedaPrestamo === 'USD' ? monto / t : monto * t)" },
    { nombre: 'redondeo multiplicando (1,005 → 1,00)', de: "return Number(Math.round(Number(v + 'e2')) + 'e-2')", a: 'return Math.round(v * 100) / 100' },
    { nombre: 'sin la tolerancia de 0,01', de: 'centavos > centavosPrestamo(f) + 1 }', a: 'centavos > centavosPrestamo(f) }' },
    { nombre: 'el texto sin el tipo de cambio', de: "if (otra) t += ' a ' + textoTipoCambio(tc)", a: "if (false) t += ' a ' + textoTipoCambio(tc)" },
    { nombre: 'deja una fecha futura', de: "if (String(fecha) > String(hoy)) return 'La fecha no puede ser futura.'", a: 'if (false) return 1' },
    { nombre: 'no pide el tipo de cambio', de: "if (x.moneda !== moneda && numeroPositivo(tc) === null) return 'Poné el tipo de cambio (pesos por dólar).'", a: '' },
    { nombre: 'deja una cuenta de otra moneda', de: 'if (c.moneda !== x.moneda) return', a: 'if (false) return' },
    { nombre: 'una cuenta inactiva sirve', de: 'return c && c.activa ? c : null', a: 'return c ?? null' },
    { nombre: 'no valida pasarse', de: '      if (r.pasa) return textoTePasas(cuota, moneda, r.imputado)\n', a: '\n' },
    { nombre: 'el tipo de cambio va siempre', de: 'p_tipo_cambio: necesitaTipoCambio(partes, moneda) ? Number(tc) : null,', a: 'p_tipo_cambio: Number(tc),' },
    { nombre: 'el monto sin redondear', de: 'monto: redondearPlata(x.monto), cuenta_id: x.cuentaId', a: 'monto: x.monto, cuenta_id: x.cuentaId' },
    { nombre: 'muestra los cancelados', de: ".filter(f => f?.estado !== 'cancelado')", a: '' },
    { nombre: 'una respuesta vieja pisa la nueva', de: "        if (turno !== turnoPrestamos) return\n        if (r?.error) throw r.error", a: '        if (r?.error) throw r.error' },
    { nombre: 'ofrece las cuotas pagas', de: 'filter(c => Number(c?.falta) > 0.005)', a: 'filter(c => true)' },
    { nombre: 'sin las cuentas de la Empresa', de: 'const deEmpresa = idEmp && idEmp !== estado.miEmpleadoId ?', a: 'const deEmpresa = false ?' },
    { nombre: 'no filtra la moneda de las propias', de: 'cuentasDe(estado.miEmpleadoId).filter(c => c.moneda === moneda)', a: 'cuentasDe(estado.miEmpleadoId).filter(c => true)' },
    { nombre: 'la parte no trae lo que falta', de: 'pg.partes = [parteNuevaPrestamo(pg.fila.moneda, falta === null ? null : redondearPlata(falta))]', a: 'pg.partes = [parteNuevaPrestamo(pg.fila.moneda, null)]' },
    { nombre: 'la parte no elige la única cuenta', de: "return { moneda, monto, cuentaId: cuentas.length === 1 ? cuentas[0].value : null }", a: 'return { moneda, monto, cuentaId: null }' },
    { nombre: 'otra parte en la misma moneda', de: "const otra = pg.fila.moneda === 'USD' ? 'ARS' : 'USD'", a: 'const otra = pg.fila.moneda' },
    { nombre: 'cambiar la moneda deja la cuenta', de: "      x.moneda = moneda\n      x.cuentaId = cuentas.length === 1 ? cuentas[0].value : null", a: '      x.moneda = moneda' },
    { nombre: 'elegir una cuota paga', de: '!cuotasConSaldo(pg).some(c => String(c.id) === String(id))) return', a: 'false) return' },
    { nombre: 'el doble toque manda dos veces', de: "      const pg = estado.prestamo?.elegido\n      if (!pg || pg.enviando) return\n      const cuota = cuotaElegidaPrestamo(pg)", a: "      const pg = estado.prestamo?.elegido\n      if (!pg) return\n      const cuota = cuotaElegidaPrestamo(pg)" },
    { nombre: 'el error de la base genérico', de: "pg.error = err?.message || 'No se pudo registrar el pago.", a: "pg.error = 'No se pudo registrar el pago." },
    { nombre: 'no vuelve a la lista de gastos', de: '      estado.prestamo = null\n      cerrarWizard()', a: '      estado.prestamo = null' },
    { nombre: 'paga sin validar', de: '      if (falla) { pg.error = falla; pintarErrorPrestamo(); return }\n', a: '\n' },
    { nombre: 'la fecha no arranca hoy', de: "partes: [], tc: null, fecha: hoyIsoAr(), enviando: false", a: "partes: [], tc: null, fecha: null, enviando: false" },
    { nombre: 'tocar Préstamos va siempre al formulario', de: "irASubpaso(vaAPrestamos() ? 'prestamo' : 'detalles')", a: "irASubpaso('detalles')" },
    { nombre: 'entrar al paso no lo abre', de: "      if (id === 'prestamo') abrirPrestamos()\n", a: '\n' },
    { nombre: 'Detalles no pinta la línea del permiso', de: '        actualizarSelectorCuentaGasto()\n        pintarAvisoPermisoPrestamos()', a: '        actualizarSelectorCuentaGasto()' },
    { nombre: 'Atrás va a otro lado', de: "getElementById('btn-prestamo-atras').addEventListener('click', () => irASubpaso('categoria'))", a: "getElementById('btn-prestamo-atras').addEventListener('click', () => irASubpaso('destino'))" },
    { nombre: 'los campos con letra chica', de: '#prestamo-tc, #prestamo-fecha { font-size: 16px;', a: '#prestamo-tc, #prestamo-fecha { font-size: 14px;' },
    { nombre: 'tipear el monto no lo lee', de: 'if (x) x.monto = leerCampoNumero(t)', a: 'if (x) x.monto = x.monto' },
    { nombre: 'el monto sin el formato argentino', de: "        enlazarCampoNumero(el, { decimales: 2 })\n", a: '\n' },
  ],
})
