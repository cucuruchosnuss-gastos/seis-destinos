// Mutaciones de test-administracion-comisiones.js (la comisión de una orden de
// retiro, 06/10/2026). Ver mutar.js.
//
//   node pruebas/mut-administracion-comisiones.js
//
// UN RUNNER POR VEZ.

const path = require('path')
const { correrMutaciones } = require('./mutar')
const { limitesAdministracion } = require('./fuente-cheques')

const FORMATEADO = 'un importe o un porcentaje formateado por el código (importeHoja / formatearNumeroAr): sin datos de texto de la base'

correrMutaciones({
  region: limitesAdministracion,
  suite: path.join(__dirname, 'test-administracion-comisiones.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/administracion.html'),
  escape: 'esc',
  funciones: ['htmlComisionOrden', 'htmlPanelComision'],
  equivalentes: [
    { expr: 'esc(m)', motivo: "constante del código: 'porcentaje', 'monto' o 'ninguna'" },
    { expr: 'esc(t)', motivo: 'constante del código: el texto del botón del segmento' },
    { expr: "esc('La comisión habitual de este cliente es ' + textoPorcentaje(c.habitual) + '.')", motivo: 'un número formateado (comisionHabitualDe() solo deja pasar números)' },
    { expr: 'esc(textoCalculoComision(o.total, c.modo, c.valor, o.moneda))', motivo: FORMATEADO },
    { expr: 'esc(importeHoja(o.total, moneda))', motivo: FORMATEADO },
    { expr: 'esc(rotuloComision(o))', motivo: FORMATEADO },
    { expr: 'esc(importeHoja(imp, moneda))', motivo: FORMATEADO },
    { expr: 'esc(importeHoja(totalConComision(o.total, imp), moneda))', motivo: FORMATEADO },
    { expr: 'esc(texto)', motivo: 'texto constante del código con un número formateado' },
  ],
  manuales: [
    // El cálculo
    { nombre: 'el porcentaje sin redondear', de: '      return Math.round(Number((t * v).toFixed(6))) / 100\n    }', a: '      return t * v / 100\n    }' },
    { nombre: 'más de 100 % se acepta', de: "      if (modo !== 'porcentaje' || v > 100) return null", a: "      if (modo !== 'porcentaje' || v > 1000) return null" },
    { nombre: '0 se acepta', de: '      if (!Number.isFinite(v) || v <= 0) return null\n      if (modo === \'monto\')', a: '      if (!Number.isFinite(v) || v < 0) return null\n      if (modo === \'monto\')' },
    { nombre: 'el monto sin redondear', de: "      if (modo === 'monto') return Math.round(Number((v * 100).toFixed(6))) / 100", a: "      if (modo === 'monto') return v" },
    { nombre: 'sin comisión no es 0', de: "      if (modo === 'ninguna') return 0\n      if (valor === null", a: "      if (modo === 'ninguna') return null\n      if (valor === null" },
    { nombre: 'el total resta la comisión', de: '      return Math.round(Number(((t + i) * 100).toFixed(6))) / 100', a: '      return Math.round(Number(((t - i) * 100).toFixed(6))) / 100' },
    { nombre: 'el total sin centavos exactos', de: '      return Math.round(Number(((t + i) * 100).toFixed(6))) / 100', a: '      return t + i' },
    { nombre: 'sin comisión manda el valor', de: "      return { p_orden_id: d.orden.id, p_modo: c.modo, p_valor: c.modo === 'ninguna' ? null : c.valor }", a: '      return { p_orden_id: d.orden.id, p_modo: c.modo, p_valor: c.valor }' },
    // El filtro
    { nombre: 'el filtro trae las ya cargadas', de: "        (o.comision_modo ?? null) === null && comisionHabitualDe(cli) !== null", a: '        comisionHabitualDe(cli) !== null' },
    { nombre: 'el filtro no mira la habitual', de: "        (o.comision_modo ?? null) === null && comisionHabitualDe(cli) !== null", a: "        (o.comision_modo ?? null) === null" },
    { nombre: 'una habitual 0 cuenta', de: '      return Number.isFinite(v) && v > 0 ? v : null', a: '      return Number.isFinite(v) && v >= 0 ? v : null' },
    { nombre: 'la consulta no pide "sin comisión"', de: ".eq('estado_valorizacion', 'valorizada').is('comision_modo', null)", a: ".eq('estado_valorizacion', 'valorizada')" },
    { nombre: 'la lista no se filtra por cliente', de: '      const ordenes = filtros.sinComision ? ordenesComisionSinCargar(data ?? [], clientes) : (data ?? [])', a: '      const ordenes = data ?? []' },
    { nombre: 'sin clientes el filtro inventa', de: "      if (filtros.sinComision && !Array.isArray(clientes)) throw new Error('Sin la lista de clientes no se sabe quién tiene comisión.')\n", a: '' },
    { nombre: 'los dos filtros conviven', de: "      if (origen === 'ad-filtro-comision' && sinComision.checked) sinValorizar.checked = false\n", a: '' },
    { nombre: 'la fila no suma la comisión', de: '        ? importeHoja(conComision ? totalConComision(o.total, o.comision_importe) : o.total, o.moneda) : \'sin valorizar\'', a: "        ? importeHoja(o.total, o.moneda) : 'sin valorizar'" },
    { nombre: 'la fila de una anulada suma la comisión', de: "      const conComision = o.estado !== 'anulada' && Number(o.comision_importe) > 0", a: '      const conComision = Number(o.comision_importe) > 0' },
    // El detalle
    { nombre: 'sin Subtotal / Comisión / Total', de: '      if (conImporte) {\n        partes.push', a: '      if (false) {\n        partes.push' },
    { nombre: 'sin aviso de recalcular', de: "        if (comisionDesactualizada(o)) partes.push(", a: "        if (false) partes.push(" },
    { nombre: 'una anulada muestra la comisión', de: "        total = o.estado === 'anulada' ? `<p class=\"ad-total\">Total ${esc(importeHoja(o.total, o.moneda))}</p>` : htmlComisionOrden(d)", a: '        total = htmlComisionOrden(d)' },
    { nombre: 'sin cobranzas:procesar', de: "        (puedeEn('retiros', 'precios', o.unidad_negocio_id) || tieneTarea('cobranzas', 'procesar'))", a: "        puedeEn('retiros', 'precios', o.unidad_negocio_id)" },
    { nombre: 'precios en cualquier empresa', de: "        (puedeEn('retiros', 'precios', o.unidad_negocio_id) || tieneTarea('cobranzas', 'procesar'))", a: "        (tieneTarea('retiros', 'precios') || tieneTarea('cobranzas', 'procesar'))" },
    // El panel
    { nombre: 'sin habitual elige porcentaje solo', de: '      } else if (habitual !== null) {\n        modo = \'porcentaje\'', a: '      } else {\n        modo = \'porcentaje\'' },
    { nombre: 'cambiar de modo conserva el valor', de: "      c.valor = modo === 'porcentaje' ? c.habitual : null\n", a: '' },
    { nombre: 'doble toque manda dos veces', de: '      if (!c || c.enviando || estado.trabajando) return\n      const err = validarComision', a: '      if (!c) return\n      const err = validarComision' },
    { nombre: 'se manda sin validar', de: '      if (err) { c.error = err; pintarOrden(); return }\n', a: '' },
    { nombre: 'el error de la base se tapa', de: "        c.error = e?.message || 'No se pudo cargar la comisión. Probá de nuevo.'", a: "        c.error = 'No se pudo cargar la comisión. Probá de nuevo.'" },
    { nombre: 'después de un error el botón queda trabado', de: '        c.enviando = false\n        estado.trabajando = false\n        pintarOrden()', a: '        estado.trabajando = false\n        pintarOrden()' },
    // La hoja: la comisión es interna
    { nombre: 'la hoja suma la comisión', de: "        total: o.estado_valorizacion === 'valorizada' ? o.total : null,", a: "        total: o.estado_valorizacion === 'valorizada' ? (totalConComision(o.total, o.comision_importe) ?? o.total) : null," },
    // La cuenta del cliente
    { nombre: 'sin la etiqueta Comisión', de: "      comision: 'Comisión',\n", a: '' },
    { nombre: 'el número de la orden en la comisión', de: ".replace(/ · Comisión orden N°\\s*\\d+/, ' · Comisión')", a: '' },
    { nombre: 'el código sale dos veces', de: "base.replace(/^Orden de retiro (?:N°\\s*\\d+|[A-Z]+-\\d+)/, '')", a: "base.replace(/^Orden de retiro N°\\s*\\d+/, '')" },
    // La ficha
    { nombre: 'la habitual no está en la ficha', de: "['plazo_pago_dias', 'dias'], ['comision_habitual', 'porcentaje'],", a: "['plazo_pago_dias', 'dias']," },
    { nombre: 'la comisión habitual viaja en la ficha', de: "          const { error } = await supabase.rpc('guardar_ficha_cliente', { p_cliente_id: f.id, p_datos: resto })", a: "          const { error } = await supabase.rpc('guardar_ficha_cliente', { p_cliente_id: f.id, p_datos: datos })" },
    { nombre: 'la comisión habitual no se manda', de: '        if (conComision) {', a: '        if (false) {' },
    { nombre: 'la comisión borrada viaja como cero', de: "      return v === '' || v === null || v === undefined ? null : Number(v)", a: "      return v === '' || v === null || v === undefined ? 0 : Number(v)" },
    { nombre: 'la comisión que falla después de la ficha se tapa', de: "            f.error = 'Se guardó la ficha, MENOS la comisión habitual: ' + (error.message || 'no se pudo guardar.')", a: "            f.error = null" },
    { nombre: 'la comisión sola que falla se tapa', de: '            if (!fichaGuardada) throw error\n', a: '' },
    { nombre: 'más de 100 % se manda', de: "        f.error = 'La comisión habitual va de 0 a 100 %.'; pintarPieFicha(); return", a: '' },
  ],
})
