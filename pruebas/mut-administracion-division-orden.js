// Mutaciones de test-administracion-division-orden.js (dividir una orden para
// facturar, la condición de venta del cliente y las comisiones de los 3
// vendedores, 21/10/2026). Ver mutar.js.
//
//   node pruebas/mut-administracion-division-orden.js
//
// UN RUNNER POR VEZ.

const path = require('path')
const { correrMutaciones } = require('./mutar')
const { limitesAdministracion } = require('./fuente-cheques')

const FORMATEADO = 'un importe, un % o una fecha formateados por el código (importeHoja / textoPct / fechaCorta): sin texto de la base'
const PARTE = "constante del código: 'A', 'B' o 'UNICA' (partesFacturaOrden() solo devuelve esas)"
const CONSTANTE = 'texto constante del código'

correrMutaciones({
  region: limitesAdministracion,
  suite: path.join(__dirname, 'test-administracion-division-orden.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/administracion.html'),
  escape: 'esc',
  funciones: ['htmlBloqueParte', 'htmlHojaDivision', 'htmlFacturasOrden', 'htmlFacturaDivision', 'pintarDivision', 'htmlVendedoresPct', 'pintarComisiones', 'pintarVendedoresFicha'],
  equivalentes: [
    { expr: "esc('Total comisiones (' + textoPct(datos.comision_pct_total) + '%): ' + plata(datos.comision_total))", motivo: FORMATEADO },
    { expr: "esc('TOTAL PARTE A: ' + plata(datos.total_a))", motivo: FORMATEADO },
    { expr: "esc('TOTAL PARTE B: ' + plata(datos.total_b))", motivo: FORMATEADO },
    { expr: "esc('Total productos: ' + plata(datos.subtotal_a))", motivo: FORMATEADO },
    { expr: "esc('Fecha ' + fechaCorta(datos.fecha) + ' · Parte ' + parte + ': ' + textoPct(pct) + ' %')", motivo: FORMATEADO + '; la parte es A o B' },
    { expr: 'esc(plata(r.precio))', motivo: FORMATEADO },
    { expr: 'esc(plata(r.subtotal))', motivo: FORMATEADO },
    { expr: 'esc(como)', motivo: 'texto constante del código con porcentajes formateados (textoPct)' },
    { expr: 'esc(parte)', motivo: PARTE },
    { expr: 'esc(p)', motivo: PARTE },
    { expr: 'esc(id)', motivo: "la parte en minúsculas ('a', 'b', 'unica') o el prefijo del código con el orden del vendedor pasado por Number()" },
    { expr: "esc('Volver al de la configuración (' + textoPct(f.defecto) + ' %)')", motivo: FORMATEADO },
    { expr: 'esc(c.error)', motivo: CONSTANTE + ' (cargarComisiones solo pone uno fijo)' },
    { expr: 'esc(textoTotalComisiones(c))', motivo: FORMATEADO },
    { expr: 'esc(c.errorVendedores)', motivo: CONSTANTE + ' (cargarVendedoresFicha solo pone uno fijo)' },
  ],
  manuales: [
    // Los %: el otro se completa con la diferencia a 100
    { nombre: 'el complemento sin redondear', de: '      return Math.round((100 - n) * 100) / 100', a: '      return 100 - n' },
    { nombre: 'el complemento acepta fuera de 0 a 100', de: '      if (!Number.isFinite(n) || n < 0 || n > 100) return null\n      return Math.round', a: '      if (!Number.isFinite(n)) return null\n      return Math.round' },
    { nombre: 'la ficha no completa el otro %', de: '      ponerNumero(document.getElementById(idOtro), complementoPct(leerCampoNumero(document.getElementById(idCampo))))', a: '      ponerNumero(document.getElementById(idOtro), leerCampoNumero(document.getElementById(idCampo)))' },
    { nombre: 'la ventana no completa B', de: "      if (cual === 'a') ponerNumero(b, complementoPct(leerCampoNumero(a)))", a: "      if (cual === 'a') ponerNumero(b, leerCampoNumero(a))" },
    { nombre: 'la ventana no completa A desde B', de: "      else if (cual === 'b') ponerNumero(a, complementoPct(leerCampoNumero(b)))\n", a: '' },
    { nombre: 'la suma de % con coma flotante', de: '      return ns.reduce((s, n) => s + Math.round(n * 100), 0) / 100', a: '      return ns.reduce((s, n) => s + n, 0)' },
    // La configuración de comisiones
    { nombre: 'la sección se ve sin retiros:precios', de: "{ id: 'comisiones', titulo: 'Configuración de comisiones', global: true, tareas: ['retiros:precios'] }", a: "{ id: 'comisiones', titulo: 'Configuración de comisiones', global: true, tareas: ['retiros:precios', 'retiros:ver'] }" },
    { nombre: 'la configuración guarda el % viejo', de: '{ p_vendedor_id: vendedorId, p_pct: pct }', a: '{ p_vendedor_id: vendedorId, p_pct: numeroONulo(v.pct_defecto) }' },
    { nombre: 'la configuración: tipear no cambia nada', de: '      c.valores[vendedorId] = valor\n', a: '' },
    { nombre: 'la configuración se manda sin validar', de: '      if (e.error) { pintarComisiones(); return }\n', a: '' },
    { nombre: 'la configuración: doble toque manda dos', de: '      if (e.enviando) return\n      const pct = numeroONulo(c.valores[vendedorId])', a: '      const pct = numeroONulo(c.valores[vendedorId])' },
    { nombre: 'la configuración: el error de la base se tapa', de: "e.error = err?.message || 'No se pudo guardar. Probá de nuevo.'", a: "e.error = 'No se pudo guardar. Probá de nuevo.'" },
    // La ficha
    { nombre: 'la ficha no lee la condición', de: 'comision_habitual, pct_parte_a, proveedor_id, observaciones', a: 'comision_habitual, proveedor_id, observaciones' },
    { nombre: 'la ficha no muestra la condición', de: '        llenarCondicionVenta(c)\n', a: '' },
    { nombre: 'la ficha no lee los propios del cliente', de: '        const propio = propias?.[v.id] !== undefined && propias?.[v.id] !== null', a: '        const propio = false' },
    { nombre: 'cambiar un vendedor no lo deja propio', de: '      v.pct = valor\n      v.propio = true\n', a: '      v.pct = valor\n' },
    { nombre: 'volver a la configuración no vuelve', de: '      v.propio = false\n      v.pct = v.defecto\n      pintarVendedoresFicha()', a: '      pintarVendedoresFicha()' },
    { nombre: 'el de la configuración viaja con su %', de: 'pct: v.propio ? numeroONulo(v.pct) : null', a: 'pct: numeroONulo(v.pct)' },
    { nombre: 'un propio vaciado no vuelve a la configuración', de: '        for (const v of c.vendedores ?? []) if (v.propio && numeroONulo(v.pct) === null) { v.propio = false; v.pct = v.defecto }\n', a: '' },
    { nombre: 'A vacío viaja como 0', de: '{ p_cliente_id: f.id, p_pct_a: pctA, p_comisiones: comisiones }', a: '{ p_cliente_id: f.id, p_pct_a: pctA ?? 0, p_comisiones: comisiones }' },
    { nombre: 'la condición se manda sin validar', de: '      if (c.error) { pintarCondicionVenta(); return }\n', a: '' },
    { nombre: 'la condición: doble toque manda dos', de: "      if (c.enviando) return\n      const pctA = leerCampoNumero(document.getElementById('ad-f-pct-a'))", a: "      const pctA = leerCampoNumero(document.getElementById('ad-f-pct-a'))" },
    { nombre: 'la condición: el error de la base se tapa', de: "c.error = err?.message || 'No se pudo guardar la condición de venta. Probá de nuevo.'", a: "c.error = 'No se pudo guardar la condición de venta. Probá de nuevo.'" },
    { nombre: 'la condición: las órdenes no se enteran', de: '        // Las órdenes leen la condición de la lista de clientes: que la relea.\n        estado.clientes = null\n', a: '' },
    // La orden
    { nombre: 'la orden no lee la división', de: "comision_cargada_en, division_pct_a')", a: "comision_cargada_en')" },
    { nombre: 'la orden no lee las facturas', de: '      const facturas = await leerFacturasDeOrden(o)', a: '      const facturas = []' },
    { nombre: 'facturas ilegibles = sin facturas', de: "        console.error('No se pudieron leer las facturas de la orden:', err)\n        return null", a: "        console.error('No se pudieron leer las facturas de la orden:', err)\n        return []" },
    { nombre: 'la condición del cliente no divide', de: '      return hay(o?.division_pct_a) || hay(cli?.pct_parte_a)', a: '      return hay(o?.division_pct_a)' },
    { nombre: 'siempre A y B (nunca la única)', de: '      const base = seDivide ? PARTES_DIVISION : [PARTE_UNICA]', a: '      const base = PARTES_DIVISION' },
    { nombre: 'precios en cualquier empresa', de: "o.estado_valorizacion === 'valorizada' && !ordenEntreEmpresas(o) && puedeEn('retiros', 'precios', o.unidad_negocio_id)\n    }", a: "o.estado_valorizacion === 'valorizada' && !ordenEntreEmpresas(o) && tieneTarea('retiros', 'precios')\n    }" },
    { nombre: 'el botón aparece sin valorizar', de: "document.getElementById('ad-btn-dividir').hidden = !(puedeDividir(o) && !d.valorizar)", a: "document.getElementById('ad-btn-dividir').hidden = !(!!o && puedeEn('retiros', 'precios', o.unidad_negocio_id))" },
    // La ventana
    { nombre: 'sin condición: los propios del cliente no se usan', de: 'pct: propias[v.id] !== undefined && propias[v.id] !== null ? propias[v.id] : numeroONulo(v.pct_defecto) }))', a: 'pct: numeroONulo(v.pct_defecto) }))' },
    { nombre: 'sin condición: el texto de la base se tapa', de: "dv.aviso = err?.message || 'No se pudo leer la división de la orden. Probá de nuevo.'", a: "dv.aviso = 'No se pudo leer la división de la orden. Probá de nuevo.'" },
    { nombre: 'los vendedores no viajan a la base', de: 'p_comisiones: comisiones?.length ? parametrosComisiones(comisiones) : null', a: 'p_comisiones: null' },
    { nombre: 'un cambio puntual de un vendedor no se manda', de: '      v.pct = valor\n      programarVistaDivision(dv)', a: '      programarVistaDivision(dv)' },
    { nombre: 'un vendedor vacío sirve en la orden', de: '      return validarComisiones(comisiones)\n    }', a: '      return validarComisiones(comisiones, { vacioSirve: true })\n    }' },
    { nombre: 'la vista previa no manda los % nuevos', de: "const { data, error } = await supabase.rpc('datos_division_orden', parametrosDivision(dv.ordenId, pctA, dv.comisiones))", a: "const { data, error } = await supabase.rpc('datos_division_orden', parametrosDivision(dv.ordenId, null, null))" },
    { nombre: 'la vista previa GUARDA', de: "const { data, error } = await supabase.rpc('datos_division_orden', parametrosDivision(dv.ordenId, pctA, dv.comisiones))", a: "const { data, error } = await supabase.rpc('guardar_division_orden', parametrosDivision(dv.ordenId, pctA, dv.comisiones))" },
    { nombre: 'la vista previa con A vacío llama igual', de: "const invalido = pctA === null ? 'Poné el % de la parte A para ver cómo queda.' : validarDivision(pctA, dv.comisiones)", a: 'const invalido = null' },
    { nombre: 'una vista previa vieja pisa a la nueva', de: '        if (estado.division !== dv || turno !== dv.turno) return\n        dv.datos = data\n        dv.aviso = null', a: '        if (estado.division !== dv) return\n        dv.datos = data\n        dv.aviso = null' },
    { nombre: 'guardar no imprime', de: '        imprimirDivision(data)\n', a: '' },
    { nombre: 'guardar sin validar', de: '      if (dv.errorGuardar) { pintarDivision(); return }\n', a: '' },
    { nombre: 'guardar: doble toque manda dos', de: '      if (!dv || dv.guardando) return\n      const { a } = camposDivision()', a: '      if (!dv) return\n      const { a } = camposDivision()' },
    { nombre: 'guardar: el error de la base se tapa', de: "dv.errorGuardar = err?.message || 'No se pudo guardar la división. Probá de nuevo.'", a: "dv.errorGuardar = 'No se pudo guardar la división. Probá de nuevo.'" },
    { nombre: 'la orden abierta no se entera', de: '          o.division_pct_a = data?.pct_a ?? pctA\n', a: '' },
    // La hoja
    { nombre: 'los totales como renglón de la tabla', de: '`<tbody>${cuerpo}</tbody></table><div class="ad-dvh__totales">${totales}</div></section>`', a: '`<tbody>${cuerpo}<tr><td colspan="4">${totales}</td></tr></tbody></table></section>`' },
    { nombre: 'la hoja sin una línea por vendedor', de: "plata(datos.subtotal_a))}</p>${vendedores}`", a: "plata(datos.subtotal_a))}</p>`" },
    { nombre: 'el total de comisiones con otro monto', de: "plata(datos.comision_total))", a: "plata(datos.subtotal_a))" },
    { nombre: 'el % total de comisiones mal', de: 'textoPct(datos.comision_pct_total)', a: 'textoPct(datos.pct_a)' },
    { nombre: 'los renglones en 0 se imprimen', de: 'return Number.isFinite(n) && n !== 0 })', a: 'return Number.isFinite(n) })' },
    { nombre: 'la B con las cantidades de la A', de: "      const k = parte === 'A' ? 'a' : 'b'", a: "      const k = 'a'" },
    { nombre: 'el TOTAL PARTE A sin las comisiones', de: "esc('TOTAL PARTE A: ' + plata(datos.total_a))", a: "esc('TOTAL PARTE A: ' + plata(datos.subtotal_a))" },
    { nombre: 'la B con el total de la A', de: "esc('TOTAL PARTE B: ' + plata(datos.total_b))", a: "esc('TOTAL PARTE B: ' + plata(datos.total_a))" },
    { nombre: 'el pie sin el total de la orden', de: "' · total de la orden ' + importeHoja(datos.total_orden, moneda)", a: "' · total de la orden ' + importeHoja(datos.total_a, moneda)" },
    { nombre: 'el número de ARCA no sale en la hoja', de: '(factura?.numero ? ` <span class="ad-dvh__factura">', a: '(false ? ` <span class="ad-dvh__factura">' },
    { nombre: 'la hoja no es A4 vertical', de: "'<style>@media print { @page { size: A4 portrait; margin: 12mm; } }</style>' +", a: "'' +" },
    // Las facturas
    { nombre: 'la factura con la parte equivocada', de: '{ p_orden_id: dv.ordenId, p_parte: parte, p_numero: numero, p_archivo_url: ruta }', a: "{ p_orden_id: dv.ordenId, p_parte: 'A', p_numero: numero, p_archivo_url: ruta }" },
    { nombre: 'el número sin limpiar', de: "String(document.getElementById(`ad-dv-numero-${id}`).value ?? '').trim()", a: "String(document.getElementById(`ad-dv-numero-${id}`).value ?? '')" },
    { nombre: 'el número sin largo mínimo', de: '      return n.length < 3 || n.length > 40 ?', a: '      return n.length < 1 || n.length > 400 ?' },
    { nombre: 'el PDF sin validar', de: '      c.error = validarNumeroFactura(numero) ?? validarPdfFactura(archivo)', a: '      c.error = validarNumeroFactura(numero)' },
    { nombre: 'el PDF fuera de la carpeta del usuario', de: 'return `${uid}/facturas-venta/${unidadId}/${anio}/${codigo}-${parte}.pdf`', a: 'return `facturas-venta/${unidadId}/${anio}/${codigo}-${parte}.pdf`' },
    { nombre: 'el PDF pisa (upsert)', de: "{ contentType: 'application/pdf', upsert: false }", a: "{ contentType: 'application/pdf', upsert: true }" },
    { nombre: 'un PDF repetido no prueba otro nombre', de: "      if (/exist|duplicate/i.test(String(error.message ?? '')) || String(error.statusCode) === '409') {", a: '      if (false) {' },
    { nombre: 'el PDF que no sube se ignora', de: "      throw new Error('No se pudo subir el PDF: ' + (error.message || 'probá de nuevo.'))", a: '      return null' },
    { nombre: 'la factura: doble toque manda dos', de: '      if (c.enviando) return\n      const id = parte.toLowerCase()', a: '      const id = parte.toLowerCase()' },
    { nombre: 'la factura: el error de la base se tapa', de: "c.error = err?.message || 'No se pudo guardar la factura. Probá de nuevo.'", a: "c.error = 'No se pudo guardar la factura. Probá de nuevo.'" },
    { nombre: 'la factura de otra parte se manda', de: '      if (!dv || !partesFacturaOrden(dv.seDivide, dv.facturas).includes(parte)) return', a: '      if (!dv) return' },
    { nombre: 'la orden no ve la factura guardada', de: '          d.facturas = [...d.facturas.filter(f => f.parte !== parte), { parte, ...nueva }]\n', a: '' },
    { nombre: 'el PDF abre con opener', de: 'if (pestana) { pestana.opener = null; pestana.location.href = data.signedUrl }', a: 'if (pestana) { pestana.location.href = data.signedUrl }' },
    { nombre: 'el PDF firmado por una hora', de: "await supabase.storage.from('comprobantes').createSignedUrl(ruta, 300)", a: "await supabase.storage.from('comprobantes').createSignedUrl(ruta, 3600)" },
  ],
})
