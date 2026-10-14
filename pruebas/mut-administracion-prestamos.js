// Mutaciones de test-administracion-prestamos.js (la sección Préstamos de
// Administración, 13/10/2026). Ver mutar.js.
//
//   node pruebas/mut-administracion-prestamos.js
//
// UN RUNNER POR VEZ.

const path = require('path')
const { correrMutaciones } = require('./mutar')
const { limitesAdministracion } = require('./fuente-cheques')

const NUM = 'un número, una fecha o un importe formateado por el código: sacarle el esc() no cambia nada'
const CONST = 'un texto fijo del código'

correrMutaciones({
  region: limitesAdministracion,
  suite: path.join(__dirname, 'test-administracion-prestamos.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/administracion.html'),
  escape: 'esc',
  funciones: ['htmlFilaPrestamoAd', 'htmlFilasCuotas', 'htmlAltaPrestamo', 'htmlCuotasAlta', 'htmlCuotaDetalle', 'htmlPagoAd', 'htmlEditarPrestamo', 'pintarPrestamosAd', 'pintarPrestamoAd'],
  equivalentes: [
    ['esc(i)', NUM], ['esc(i + 1)', NUM], ["esc('Vencimiento de la cuota ' + (i + 1))", NUM], ["esc('Importe de la cuota ' + (i + 1))", NUM],
    ["esc(c.vencimiento ?? '')", 'una fecha: el campo date no acepta otra cosa'],
    ["esc('Pagado ' + importeHoja(pagados[i], c.moneda ?? 'ARS'))", NUM],
    ['esc(m)', "constante del código: 'ARS' o 'USD'"], ['esc(NOMBRE_MONEDA_AD[m])', CONST], ['esc(String(a.moneda === m))', CONST],
    ['esc(k)', CONST], ['esc(t)', CONST], ['esc(String(a.modo === k))', CONST],
    ["esc(a.fecha ?? '')", 'una fecha'], ["esc(a.primerVenc ?? '')", 'una fecha'],
    ["esc(a.enviando ? 'Guardando…' : 'Crear el préstamo')", CONST], ["esc(a.error ?? '')", 'arranca vacío: el error se escribe con textContent'],
    ['esc(s.texto)', NUM],
    ["esc('Vencen todos los meses desde el primero. Podés cambiar cada una; cambiar el total, la cantidad o el primer vencimiento las vuelve a armar.')", CONST],
    ["esc(a.modo === 'distintas'\n          ? 'Poné la cantidad de cuotas y el primer vencimiento para armar las cuotas.'\n          : 'Poné el total, la cantidad de cuotas y el primer vencimiento para armar las cuotas.')", CONST],
    ["esc('Saldo ' + importeHoja(f.saldo, f.moneda))", NUM], ['esc(textoProximaCuota(f, hoy))', NUM],
    ["esc('Cuota ' + c.numero + ' · vence ' + fechaCorta(c.vencimiento))", NUM], ['esc(importeHoja(c.importe, moneda))', NUM],
    ['esc(pct)', NUM], ["esc('Pagado de la cuota ' + c.numero)", NUM],
    ["esc('Pagado ' + importeHoja(c.pagado, moneda) + ' (' + formatearNumeroAr(pct, { decimales: 1, minimos: 0 }) + ' %) · falta ' + importeHoja(c.falta, moneda) + (vencida ? ' · vencida' : ''))", NUM],
    ["esc(fechaCorta(pg.fecha) + ' · cuota ' + pg.cuota_numero)", NUM], ['esc(importeHoja(pg.monto, pg.moneda))', NUM],
    ["esc(an.enviando ? 'Anulando…' : 'Sí, anular el pago')", CONST], ["esc(an.error ?? '')", 'arranca vacío: el error se escribe con textContent'],
    ["esc(e.enviando ? 'Guardando…' : 'Guardar los cambios')", CONST], ["esc(e.error ?? '')", 'arranca vacío: el error se escribe con textContent'],
    ['esc(ps.error)', CONST], ['esc(ui.error)', CONST],
    ["esc(ps.filtro === 'cancelado' ? 'No hay préstamos cancelados.' : 'No hay préstamos activos. Cargá uno con «Nuevo préstamo».')", CONST],
    ["esc('Todavía no hay pagos. Las cuotas se pagan en Gastos, con la categoría «Préstamos».')", CONST],
  ].map(([expr, motivo]) => ({ expr, motivo })),
  manuales: [
    { nombre: 'la sección sin pedir gastos_empresa', de: "{ id: 'prestamos', titulo: 'Préstamos', global: true, tareas: ['gastos:gastos_empresa'] }", a: "{ id: 'prestamos', titulo: 'Préstamos', global: true, tareas: ['gastos:ver_exportar', 'gastos:gastos_empresa'] }" },
    { nombre: 'no lee las tareas de gastos', de: "'cobranzas', 'cuentas_corrientes', 'gastos']).eq('habilitado', true)", a: "'cobranzas', 'cuentas_corrientes']).eq('habilitado', true)" },
    { nombre: 'la lista sin la barra de arriba', de: "p_unidad_negocio_id: estado.unidadBarra ?? null, p_incluir_cancelados: true", a: "p_unidad_negocio_id: null, p_incluir_cancelados: true" },
    { nombre: 'la lista sin los cancelados', de: "p_unidad_negocio_id: estado.unidadBarra ?? null, p_incluir_cancelados: true", a: "p_unidad_negocio_id: estado.unidadBarra ?? null, p_incluir_cancelados: false" },
    { nombre: 'la fábrica de pruebas aparece', de: "return sinUnidadesDePrueba(Array.isArray(data) ? data : [], estado.fabrica, f => f?.unidad_negocio_id)", a: "return Array.isArray(data) ? data : []" },
    { nombre: 'el filtro mezcla activos y cancelados', de: "return (ps?.filas ?? []).filter(f => (ps.filtro === 'cancelado') === (f?.estado === 'cancelado'))", a: 'return ps?.filas ?? []' },
    { nombre: 'la portada cuenta los cancelados', de: "const activos = (filas ?? []).filter(f => f?.estado === 'activo')", a: 'const activos = filas ?? []' },
    { nombre: 'la portada no cuenta las vencidas', de: '          if (v < hoy) vencidos++\n', a: '\n' },
    { nombre: 'la portada no cuenta los préstamos', de: "      if (SECCIONES.some(s => s.id === 'prestamos' && seccionVisible(s))) contarPrestamosPortada(p, turno)\n", a: '\n' },
    { nombre: 'la pestaña no abre la sección', de: "      else if (id === 'prestamos') mostrarPrestamos()\n", a: '\n' },
    { nombre: 'no sigue a la barra', de: "      if (estado.vista === 'ad-vista-prestamos') mostrarPrestamos()\n", a: '\n' },
    { nombre: 'sin permiso abre igual', de: "      if (!puedePrestamos()) { mostrarInicio(); return }\n      mostrarVista('ad-vista-prestamos')", a: "      mostrarVista('ad-vista-prestamos')" },
    { nombre: 'una respuesta vieja pisa la nueva', de: '        const filas = await leerPrestamos()\n        if (turno !== turnoPrestamos) return', a: '        const filas = await leerPrestamos()' },
    { nombre: 'la última no absorbe el redondeo', de: 'importe: (i === n - 1 ? ultima : base) / 100', a: 'importe: base / 100' },
    { nombre: 'cuotas iguales sin redondear a centavos', de: 'const base = Math.floor(t / n), ultima = t - base * (n - 1)', a: 'const base = t / n, ultima = t - base * (n - 1)' },
    { nombre: 'los vencimientos no son mensuales', de: 'vencimiento: sumarMesesIso(primerVenc, i), importe: (i', a: 'vencimiento: primerVenc, importe: (i' },
    { nombre: 'el 31 no cae al último día', de: 'String(Math.min(d, ultimo)).padStart(2', a: 'String(d).padStart(2' },
    { nombre: 'acepta cuotas con decimales', de: "if (t === null || t <= 0 || !Number.isInteger(n) || n < 1", a: "if (t === null || t <= 0 || n < 1" },
    { nombre: 'no exige que la suma dé el total', de: "      if (suma !== t) return `Las cuotas suman", a: "      if (false) return `Las cuotas suman" },
    { nombre: 'no pide la empresa', de: "      if (!a?.unidad) return 'Elegí la empresa.'\n", a: '\n' },
    { nombre: 'nombre de una letra', de: "      if (limpio(a.nombre).length < 2) return 'Poné un nombre al préstamo.'", a: "      if (limpio(a.nombre).length < 1) return 'Poné un nombre al préstamo.'" },
    { nombre: 'acepta una cuota sin vencimiento', de: "        if (!esFechaIso(c?.vencimiento)) return `La cuota ${i} no tiene vencimiento.`\n", a: '\n' },
    { nombre: 'el acreedor vacío va vacío', de: 'p_nombre: limpio(a.nombre), p_acreedor: limpio(a.acreedor) || null,', a: 'p_nombre: limpio(a.nombre), p_acreedor: limpio(a.acreedor),' },
    { nombre: 'el alta no arranca en la empresa de la barra', de: 'const unidad = empresas.some(e => e.id === estado.unidadBarra) ? estado.unidadBarra :', a: 'const unidad = false ? estado.unidadBarra :' },
    { nombre: 'con distintas arma iguales', de: "a.cuotas = (a.modo === 'distintas' ? cuotasDistintas(a.cantidad, a.primerVenc) : cuotasIguales(a.total, a.cantidad, a.primerVenc)) ?? []", a: 'a.cuotas = cuotasIguales(a.total, a.cantidad, a.primerVenc) ?? []' },
    { nombre: 'crear: el doble toque manda dos veces', de: '      const a = ps.alta\n      if (!a || a.enviando) return', a: '      const a = ps.alta\n      if (!a) return' },
    { nombre: 'crear: el error de la base genérico', de: "a.error = err?.message || 'No se pudo crear el préstamo.", a: "a.error = 'No se pudo crear el préstamo." },
    { nombre: 'crear sin validar', de: '      const falla = validarAltaPrestamo(a)\n      if (falla) { a.error = falla; pintarErrorAlta(); return }', a: '      const falla = null' },
    { nombre: 'crear no vuelve a leer la lista', de: "      mostrarExito('Préstamo creado: «' + limpio(a.nombre) + '».')\n      await mostrarPrestamos()", a: "      mostrarExito('Préstamo creado: «' + limpio(a.nombre) + '».')" },
    { nombre: 'la barra no se corta en 100', de: 'return Math.max(0, Math.min(100, n))', a: 'return Math.max(0, n)' },
    { nombre: 'la barra sin el ancho', de: '<span style="width: ${esc(pct)}%"></span>', a: '<span></span>' },
    { nombre: 'el saldo del detalle mal', de: 'const saldo = (centavosAd(p.total) ?? 0) - (centavosAd(p.pagado) ?? 0)', a: 'const saldo = centavosAd(p.total) ?? 0' },
    { nombre: 'el anulado sin tachar', de: "class=\"ad-prestamo-pago${pg.anulado ? ' ad-prestamo-pago--anulado' : ''}\"", a: 'class="ad-prestamo-pago"' },
    { nombre: 'un anulado se puede anular', de: "      if (pg.anulado) return h + `<p class=\"ad-error-pegado\">${esc('Anulado: ' + (pg.anulado_motivo || 'sin motivo'))}</p></div>`\n", a: '\n' },
    { nombre: 'sin el tipo de cambio en el pago', de: "const otra = pg.moneda !== monedaPrestamo && Number(pg.tipo_cambio) > 0", a: 'const otra = false' },
    { nombre: 'anular sin motivo', de: "      if (motivo.length < LARGO_MINIMO_MOTIVO_PAGO) { an.error = 'Poné el motivo.'; pintarErrorPago(); return }\n", a: '\n' },
    { nombre: 'anular: el motivo sin recortar', de: "p_pago_id: an.pagoId, p_motivo: motivo }", a: "p_pago_id: an.pagoId, p_motivo: an.motivo }" },
    { nombre: 'anular: el doble toque manda dos veces', de: '      const an = ui?.anulando\n      if (!an || an.enviando) return', a: '      const an = ui?.anulando\n      if (!an) return' },
    { nombre: 'anular: el error de la base genérico', de: "an.error = err?.message || 'No se pudo anular el pago.", a: "an.error = 'No se pudo anular el pago." },
    { nombre: 'anular no vuelve a leer', de: "      mostrarExito('Pago anulado: la plata vuelve a la cuenta de donde salió.')\n      await abrirPrestamoAd(ui.id)", a: "      mostrarExito('Pago anulado: la plata vuelve a la cuenta de donde salió.')" },
    { nombre: 'editar: una cuota puede valer menos que lo pagado', de: 'if (centavosAd(e.cuotas[i].importe) < pag) return', a: 'if (false) return' },
    { nombre: 'editar: se puede sacar una cuota con pagos', de: "      if ((d?.cuotas ?? []).some(c => Number(c.numero) > e.cuotas.length && cuotaConPagos(d, c.numero))) {", a: '      if (false) {' },
    { nombre: 'editar: quitar la última aunque tenga pagos', de: '      if (cuotaConPagos(ui.data, e.cuotas.length)) return\n', a: '\n' },
    { nombre: 'editar: agregar sin mes siguiente', de: 'vencimiento: ultima ? sumarMesesIso(ultima.vencimiento, 1) : null', a: 'vencimiento: ultima ? ultima.vencimiento : null' },
    { nombre: 'editar: el doble toque manda dos veces', de: '      const e = ui?.editar\n      if (!e || e.enviando) return\n      const falla', a: '      const e = ui?.editar\n      if (!e) return\n      const falla' },
    { nombre: 'editar: el error de la base genérico', de: "e.error = err?.message || 'No se pudo guardar.", a: "e.error = 'No se pudo guardar." },
    { nombre: 'lo vencido pierde contra el gris', de: '.ad-prestamo-vencida, .ad-fila__meta.ad-prestamo-vencida { color', a: '.ad-prestamo-vencida { color' },
    { nombre: 'en el celular la fecha y el importe lado a lado', de: '      .ad-prestamo-cuota-fila { grid-template-columns: 1.75rem minmax(0, 1fr); }\n', a: '\n' },
    { nombre: 'los eventos no se conectan', de: '      conectarPrestamosAd()\n      document.getElementById', a: '      document.getElementById' },
  ],
})
