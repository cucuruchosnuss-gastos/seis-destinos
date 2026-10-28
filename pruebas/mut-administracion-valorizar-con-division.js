// Mutaciones de test-administracion-valorizar-con-division.js (valorizar con
// la división en una sola pantalla y las órdenes de pedido N1 / N2,
// 28/10/2026): mutan modulos/administracion.html, que la suite recibe por
// ARCHIVO_TEST. Ver mutar.js.
//
// BASELINE FIJO: antes de mutar, la suite tiene que estar en ROJO sobre la
// Administración de ANTES del cambio (BASE = ac3cb25, el main del que salió
// la rama ci-prueba/valorizar-con-division). Nunca HEAD. Y la mutación "la
// fila no se actualiza al valorizar" vuelve a poner el código de ese día (la
// lista vaciada sin repintar): la suite la tiene que matar.
//
//   node pruebas/mut-administracion-valorizar-con-division.js
//
// UN RUNNER POR VEZ.

const path = require('path')
const fs = require('fs')
const { execFileSync } = require('child_process')
const { correrMutaciones } = require('./mutar')
const { limitesAdministracion } = require('./fuente-cheques')

const RAIZ = path.join(__dirname, '..')
const SUITE = path.join(__dirname, 'test-administracion-valorizar-con-division.js')
const BASE = 'ac3cb25'

if (!process.env.MUT_SOLO_ANCLAS) {
  const viejo = execFileSync('git', ['show', `${BASE}:modulos/administracion.html`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  const tmp = path.join(__dirname, 'mut-tmp-base-administracion-valorizar-con-division.html')
  fs.writeFileSync(tmp, viejo)
  let rojo = false
  try {
    execFileSync(process.execPath, [SUITE], { encoding: 'utf8', env: { ...process.env, ARCHIVO_TEST: tmp }, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 })
  } catch { rojo = true } finally { fs.rmSync(tmp, { force: true }) }
  console.log(rojo ? `BASELINE ${BASE}: la suite da ROJO sobre la Administración de antes (bien).` : `ABORTADO: la suite da VERDE sobre ${BASE}: no prueba lo nuevo.`)
  if (!rojo) process.exit(2)
}

const FORMATEADO = 'un importe o una fecha formateados por el código (importeHoja / fechaCorta / textoAFavor): sin texto de la base'
const PARTE = "constante del código: 'A', 'B' o 'UNICA', o su id armado con idFc() / en minúsculas"

correrMutaciones({
  region: limitesAdministracion,
  suite: SUITE,
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/administracion.html'),
  escape: 'esc',
  funciones: ['htmlTotalesPunto', 'htmlHojaPunto', 'htmlPuntoFacturar', 'htmlFacturasOrden', 'pintarFacturar', 'actualizarFacturar'],
  equivalentes: [
    { expr: "esc('TOTAL: ' + plata(datos?.total_b) + textoAFavor(datos?.total_b))", motivo: FORMATEADO },
    { expr: "esc('TOTAL: ' + plata(datos?.total_a) + textoAFavor(datos?.total_a))", motivo: FORMATEADO },
    { expr: "esc('Total productos: ' + plata(datos?.subtotal_a))", motivo: FORMATEADO },
    { expr: "esc('Total comisiones: ' + plata(datos?.comision_total))", motivo: FORMATEADO },
    { expr: 'esc(plata(r.precio))', motivo: FORMATEADO },
    { expr: 'esc(plata(r.subtotal))', motivo: FORMATEADO },
    { expr: "esc('Fecha ' + fechaCorta(datos?.fecha))", motivo: FORMATEADO },
    { expr: 'esc(parte)', motivo: PARTE },
    { expr: 'esc(p)', motivo: PARTE },
    { expr: 'esc(id)', motivo: PARTE },
    { expr: "esc(idFc('guardada', parte))", motivo: PARTE },
    { expr: "esc(idFc('ver-pdf', parte))", motivo: PARTE },
    { expr: "esc(idFc('pdf-rotulo', parte))", motivo: PARTE },
    { expr: "esc(idFc('factura-error', parte))", motivo: PARTE },
    { expr: "esc(idFc('factura', parte))", motivo: PARTE },
    { expr: "esc(idFc('punto', parte))", motivo: PARTE },
    { expr: "esc(idFc('totales', parte))", motivo: PARTE },
    { expr: "esc(idFc('imprimir', parte))", motivo: PARTE },
    { expr: "esc(idFc('compartir', parte))", motivo: PARTE },
    { expr: "esc(idFc('punto-error', parte))", motivo: PARTE },
    { expr: 'esc(n)', motivo: 'un número de CONDICIONES_RAPIDAS (constante del código)' },
    { expr: "esc(n + '/' + (100 - n))", motivo: 'un número de CONDICIONES_RAPIDAS (constante del código)' },
  ],
  manuales: [
    // El código de cada punto
    { nombre: 'el punto al final del código (N-0036-1)', de: "      if (/^[^-]+-/.test(c)) return c.replace(/^([^-]+)-/, (_, letra) => letra + n + '-')", a: "      if (/^[^-]+-/.test(c)) return c + '-' + n" },
    { nombre: 'el punto con la letra de la base (N-0036-A)', de: '      const n = NUMERO_PUNTO[parte]\n      if (!n) return c', a: '      const n = parte\n      if (!n) return c' },
    { nombre: 'la condición sin el N2', de: "      return `${codigoPunto(codigo, 'A')}: ${textoPct(a)} % · ${codigoPunto(codigo, 'B')}: ${textoPct(complementoPct(a))} %`", a: "      return `${codigoPunto(codigo, 'A')}: ${textoPct(a)} %`" },
    { nombre: 'con 100/0 salen los dos puntos', de: "      return PARTES_DIVISION.filter(p => p === 'A' ? n > 0 : n < 100)", a: '      return [...PARTES_DIVISION]' },
    { nombre: 'sin condición en el cliente no es 100/0', de: '      return numeroONulo(o?.division_pct_a) ?? numeroONulo(cli?.pct_parte_a) ?? 100', a: '      return numeroONulo(o?.division_pct_a) ?? numeroONulo(cli?.pct_parte_a) ?? 50' },
    { nombre: 'la condición del cliente no se precarga', de: '      return numeroONulo(o?.division_pct_a) ?? numeroONulo(cli?.pct_parte_a) ?? 100', a: '      return numeroONulo(o?.division_pct_a) ?? 100' },
    { nombre: 'la de la orden no manda sobre la del cliente', de: '      return numeroONulo(o?.division_pct_a) ?? numeroONulo(cli?.pct_parte_a) ?? 100', a: '      return numeroONulo(cli?.pct_parte_a) ?? numeroONulo(o?.division_pct_a) ?? 100' },
    { nombre: 'la orden no lee la división', de: "comision_cargada_en, division_pct_a, numero_remito, talonario')", a: "comision_cargada_en, numero_remito, talonario')" },
    { nombre: 'la orden no lee las facturas', de: '      const facturas = await leerFacturasDeOrden(o)', a: '      const facturas = []' },
    // El papel
    { nombre: 'un vendedor en $ 0 sale', de: '        .filter(c => Number(c?.monto) > 0)', a: '        .filter(c => !!c)' },
    { nombre: 'el vendedor con su %', de: "esc(limpio(c.nombre) + ': ' + plata(c.monto))", a: "esc(limpio(c.nombre) + ' (' + textoPct(c.pct) + '%): ' + plata(c.monto))" },
    { nombre: 'Total comisiones con el %', de: "esc('Total comisiones: ' + plata(datos?.comision_total))", a: "esc('Total comisiones (' + textoPct(datos?.comision_pct_total) + '%): ' + plata(datos?.comision_total))" },
    { nombre: 'el TOTAL del N1 sin las comisiones', de: "esc('TOTAL: ' + plata(datos?.total_a) + textoAFavor(datos?.total_a))", a: "esc('TOTAL: ' + plata(datos?.subtotal_a) + textoAFavor(datos?.total_a))" },
    { nombre: 'el N2 con el total del N1', de: "esc('TOTAL: ' + plata(datos?.total_b) + textoAFavor(datos?.total_b))", a: "esc('TOTAL: ' + plata(datos?.total_a) + textoAFavor(datos?.total_b))" },
    { nombre: 'el N2 con los totales del N1', de: "      if (parte !== 'A') return `<p class=\"opv__total\"", a: "      if (parte === 'Z') return `<p class=\"opv__total\"" },
    { nombre: 'TOTAL PARTE A', de: "esc('TOTAL: ' + plata(datos?.total_a) + textoAFavor(datos?.total_a))", a: "esc('TOTAL PARTE A: ' + plata(datos?.total_a) + textoAFavor(datos?.total_a))" },
    { nombre: 'la fecha con el % del punto', de: "esc('Fecha ' + fechaCorta(datos?.fecha))", a: "esc('Fecha ' + fechaCorta(datos?.fecha) + ' · Parte A: ' + textoPct(datos?.pct_a) + ' %')" },
    { nombre: 'el encabezado sin "ORDEN DE PEDIDO"', de: '<p class="opv__titulo">ORDEN DE PEDIDO</p>', a: '<p class="opv__titulo">ORDEN</p>' },
    { nombre: 'el encabezado sin el código', de: '<p class="opv__codigo">${esc(codigoPunto(datos?.codigo, parte))}</p>', a: '<p class="opv__codigo">${esc(datos?.codigo)}</p>' },
    { nombre: 'el encabezado chico', de: '    .opv__codigo { margin: 0; font-size: 28pt;', a: '    .opv__codigo { margin: 0; font-size: 14pt;' },
    { nombre: 'sin el recuadro del PDF aprobado', de: 'padding: 7mm 6mm 5.5mm; border: 1px solid #a8a29e; border-radius: 2.5mm; }', a: 'padding: 7mm 6mm 5.5mm; }' },
    { nombre: 'el TOTAL sin la línea de arriba', de: '    .opv .opv__total { border-top: 1.5px solid #111; margin-top: 2mm; padding-top: 1.6mm; }\n', a: '' },
    { nombre: 'con el pie de la orden', de: '<div class="opv__totales">${htmlTotalesPunto(datos, parte, moneda)}</div></article>`', a: '<div class="opv__totales">${htmlTotalesPunto(datos, parte, moneda)}</div><p>${esc(\'Orden \' + datos?.codigo + \' · total de la orden \' + plata(datos?.total_orden))}</p></article>`' },
    { nombre: 'la hoja con la factura de ARCA', de: '<p class="opv__codigo">${esc(codigoPunto(datos?.codigo, parte))}</p></header>', a: '<p class="opv__codigo">${esc(codigoPunto(datos?.codigo, parte))}</p>${esc(facturasPorParte(datos?.facturas)[parte]?.numero ? \'Factura \' + facturasPorParte(datos?.facturas)[parte].numero : \'\')}</header>' },
    { nombre: 'la tabla con las cantidades del otro punto', de: "      const k = parte === 'A' ? 'a' : 'b'", a: "      const k = parte === 'A' ? 'b' : 'a'" },
    { nombre: 'el PDF sin el cliente en el nombre', de: "      return `Orden de pedido ${codigoPunto(datos?.codigo, parte)}${cli ? ' - ' + cli : ''}.pdf`", a: "      return `Orden de pedido ${codigoPunto(datos?.codigo, parte)}.pdf`" },
    { nombre: 'el nombre del PDF con letras prohibidas', de: ".replace(/[\\\\/:*?\"<>|]+/g, ' ')", a: '' },
    // Imprimir y compartir: uno por punto
    { nombre: 'imprimir saca los dos puntos', de: '`<div class="opv-papel">${htmlHojaPunto(fc.datos, parte, fc.moneda)}</div>`', a: "`<div class=\"opv-papel\">${htmlHojaPunto(fc.datos, 'A', fc.moneda)}${htmlHojaPunto(fc.datos, 'B', fc.moneda)}</div>`" },
    { nombre: 'imprimir sin A4 vertical', de: "      document.getElementById('ad-impresion').innerHTML = '<style>@media print { @page { size: A4 portrait; margin: 12mm; } }</style>' +\n        `<div class=\"opv-papel\">", a: "      document.getElementById('ad-impresion').innerHTML = '' +\n        `<div class=\"opv-papel\">" },
    { nombre: 'imprimir sin esperar el guardado', de: '      if (!puntoListo(fc, parte)) return\n      olvidarHoja(impresionHoja())', a: '      if (!fc?.datos) return\n      olvidarHoja(impresionHoja())' },
    { nombre: 'el PDF con los dos puntos', de: '      cont.innerHTML = htmlHojaPunto(datos, parte, moneda)', a: "      cont.innerHTML = htmlHojaPunto(datos, 'A', moneda) + htmlHojaPunto(datos, 'B', moneda)" },
    { nombre: 'el PDF con el nombre del otro punto', de: '        const nombre = nombrePdfPunto(datos, parte)', a: "        const nombre = nombrePdfPunto(datos, 'A')" },
    { nombre: 'compartir un punto que no existe', de: '      const fc = estado.facturar\n      if (!puntoListo(fc, parte)) return\n      const pp', a: '      const fc = estado.facturar\n      if (!fc?.datos) return\n      const pp' },
    // La pantalla
    { nombre: 'la pantalla con un cliente del grupo', de: "o.estado_valorizacion === 'valorizada' && !ordenEntreEmpresas(o) && puedeEn('retiros', 'precios', o.unidad_negocio_id)\n    }\n\n    // Los vendedores, desde", a: "o.estado_valorizacion === 'valorizada' && puedeEn('retiros', 'precios', o.unidad_negocio_id)\n    }\n\n    // Los vendedores, desde" },
    { nombre: 'la pantalla solo con ver', de: "o.estado_valorizacion === 'valorizada' && !ordenEntreEmpresas(o) && puedeEn('retiros', 'precios', o.unidad_negocio_id)\n    }\n\n    // Los vendedores, desde", a: "o.estado_valorizacion === 'valorizada' && !ordenEntreEmpresas(o) && puedeEn('retiros', 'ver', o.unidad_negocio_id)\n    }\n\n    // Los vendedores, desde" },
    { nombre: 'el bloque de solo lectura repetido', de: "(d.valorizar || entre || puedeFacturar(o) ? '' : htmlFacturasOrden(d))", a: "(d.valorizar || entre ? '' : htmlFacturasOrden(d))" },
    { nombre: 'la pantalla a la vista mientras se valoriza', de: '      const va = !!o && !d.error && !d.valorizar && puedeFacturar(o)', a: '      const va = !!o && !d.error && puedeFacturar(o)' },
    { nombre: 'abrir la orden guarda', de: '      const guardar = estado.facturarAlValorizar === o.id', a: '      const guardar = true' },
    { nombre: '"Otro %" sin precargar', de: '      ponerNumero(otro, fc.pctA)\n      pintarVendedoresFacturar()', a: '      pintarVendedoresFacturar()' },
    { nombre: 'el botón rápido elegido sin marcar', de: "numeroONulo(fc.pctA) === n ? 'true' : 'false'", a: "'false'" },
    { nombre: 'el punto que no va se ve igual', de: '        caja.hidden = !partes.includes(p)', a: '        caja.hidden = false' },
    { nombre: 'los importes no se actualizan', de: "          tot.innerHTML = fc.datos ? htmlTotalesPunto(fc.datos, p, fc.moneda) : (fc.cargando ? '<div class=\"ad-vacio\">Calculando…</div>' : '')", a: "          if (!tot.innerHTML) tot.innerHTML = fc.datos ? htmlTotalesPunto(fc.datos, p, fc.moneda) : ''" },
    { nombre: 'Imprimir no espera el guardado', de: '        if (imp) imp.disabled = !listo', a: '        if (imp) imp.disabled = false' },
    { nombre: 'sin "Guardando…"', de: "          : facturarPendiente(fc) ? 'Guardando…'", a: "          : false ? 'Guardando…'" },
    { nombre: 'el retardo no cuenta como pendiente', de: '      return !!fc && (!!fc.reloj || fc.guardando || fc.cargando)', a: '      return !!fc && (fc.guardando || fc.cargando)' },
    { nombre: 'el botón rápido no escribe "Otro %"', de: "      ponerNumero(document.getElementById('ad-fc-otro'), fc.pctA)\n      programarGuardarFacturar(fc)", a: '      programarGuardarFacturar(fc)' },
    { nombre: 'cambiar un vendedor no cambia nada', de: '      v.pct = valor\n      programarGuardarFacturar(fc)', a: '      programarGuardarFacturar(fc)' },
    // Se guarda solo
    { nombre: 'sin retardo: una llamada por tecla', de: '      fc.reloj = setTimeout(() => guardarFacturar(fc), ESPERA_GUARDAR_DIVISION)', a: '      guardarFacturar(fc)' },
    { nombre: 'el retardo anterior no se cancela', de: '      if (fc.reloj) clearTimeout(fc.reloj)\n      fc.reloj = setTimeout', a: '      fc.reloj = setTimeout' },
    { nombre: 'el retardo largo', de: '    const ESPERA_GUARDAR_DIVISION = 400', a: '    const ESPERA_GUARDAR_DIVISION = 4000' },
    { nombre: 'el turno no sube con un cambio', de: '      fc.turno++\n      fc.errorGuardar = null', a: '      fc.errorGuardar = null' },
    { nombre: 'una respuesta vieja pisa a la nueva', de: '        if (turno === fc.turno) {\n          fc.datos = data\n          fc.errorGuardar = null', a: '        if (true) {\n          fc.datos = data\n          fc.errorGuardar = null' },
    { nombre: 'dos guardados en camino', de: '      if (fc.enCamino) { fc.otraVez = true; return }\n', a: '' },
    { nombre: 'lo que esperaba no se vuelve a mandar', de: '        if (fc.otraVez) { fc.otraVez = false; if (!fc.reloj) guardarFacturar(fc) }\n        if (estado.facturar === fc) actualizarFacturar()\n      }\n    }', a: '        fc.otraVez = false\n        if (estado.facturar === fc) actualizarFacturar()\n      }\n    }' },
    { nombre: 'un % que no sirve se manda igual', de: '      if (invalido) { fc.errorGuardar = invalido; if (estado.facturar === fc) actualizarFacturar(); return }\n', a: '' },
    { nombre: 'el error de la base se tapa', de: "fc.errorGuardar = err?.message || 'No se pudo guardar. Probá de nuevo.'", a: "fc.errorGuardar = 'No se pudo guardar. Probá de nuevo.'" },
    { nombre: 'las comisiones no viajan', de: "const viaje = supabase.rpc('guardar_division_orden', parametrosDivision(fc.ordenId, fc.pctA, fc.comisiones))", a: "const viaje = supabase.rpc('guardar_division_orden', parametrosDivision(fc.ordenId, fc.pctA, null))" },
    { nombre: 'guardar no guarda (solo calcula)', de: "const viaje = supabase.rpc('guardar_division_orden', parametrosDivision(fc.ordenId, fc.pctA, fc.comisiones))", a: "const viaje = supabase.rpc('datos_division_orden', parametrosDivision(fc.ordenId, fc.pctA, fc.comisiones))" },
    { nombre: 'la orden abierta no se entera', de: '      if (o?.id === ordenId) o.division_pct_a = pctA\n', a: '' },
    { nombre: 'salir pierde el cambio que esperaba', de: '      if (fc?.reloj) { clearTimeout(fc.reloj); guardarFacturar(fc) }', a: '      if (fc?.reloj) clearTimeout(fc.reloj)' },
    // Valorizar en la misma pantalla
    { nombre: 'al valorizar la condición no se guarda', de: '        if (!entre) estado.facturarAlValorizar = d.orden.id\n', a: '' },
    { nombre: 'la condición se guarda con otro %', de: "        viaje = fc.enCamino = supabase.rpc('guardar_division_orden', parametrosDivision(o.id, fc.pctA, null))", a: "        viaje = fc.enCamino = supabase.rpc('guardar_division_orden', parametrosDivision(o.id, 100, null))" },
    // El listado al día (el código del 28/10/2026 a la mañana: vacía la lista y no repinta)
    { nombre: 'la fila no se actualiza al valorizar (el código de antes)', de: "        actualizarFilaOrden(d.orden.id, { estado_valorizacion: 'valorizada', total: data?.total ?? d.orden.total, moneda: data?.moneda ?? d.orden.moneda })\n        await abrirOrden(d.orden.id)\n        if (estado.orden?.orden?.id === d.orden.id) actualizarFilaOrden(d.orden.id, estado.orden.orden)", a: '        estado.ordenes = null\n        await abrirOrden(d.orden.id)' },
    { nombre: 'la fila se actualiza pero no se repinta', de: '      estado.ordenes[i] = { ...estado.ordenes[i], ...nuevos }\n      pintarOrdenes()', a: '      estado.ordenes[i] = { ...estado.ordenes[i], ...nuevos }' },
    { nombre: 'la fila no sabe de la condición guardada', de: '      actualizarFilaOrden(ordenId, { division_pct_a: pctA })', a: '      actualizarFilaOrden(ordenId, {})' },
    { nombre: 'la factura no repinta la fila', de: '        actualizarFilaOrden(fc.ordenId, {})\n', a: '' },
    { nombre: 'anular vacía la lista sin repintar', de: "        actualizarFilaOrden(d.orden.id, { estado: 'anulada' })\n        await abrirOrden(d.orden.id)\n        if (estado.orden?.orden?.id === d.orden.id) actualizarFilaOrden(d.orden.id, estado.orden.orden)", a: '        estado.ordenes = null\n        await abrirOrden(d.orden.id)' },
    // Se relee solo
    { nombre: 'relee con la pestaña escondida', de: '      return !!v && !v.hidden && Array.isArray(estado.ordenes) && !document.hidden', a: '      return !!v && !v.hidden && Array.isArray(estado.ordenes)' },
    { nombre: 'relee con el listado fuera de la vista', de: '      return !!v && !v.hidden && Array.isArray(estado.ordenes) && !document.hidden', a: '      return !!v && Array.isArray(estado.ordenes) && !document.hidden' },
    { nombre: 'releer no trae lo nuevo', de: '        estado.ordenes = lista\n        pintarOrdenes()\n        if (caja) caja.scrollTop = scroll', a: '        pintarOrdenes()\n        if (caja) caja.scrollTop = scroll' },
    { nombre: 'sin releer al volver a la pestaña', de: "      document.addEventListener('visibilitychange', () => { if (!document.hidden) releerOrdenesEnSilencio() })\n", a: '' },
    { nombre: 'sin releer al tomar el foco', de: "      window.addEventListener('focus', () => releerOrdenesEnSilencio())\n", a: '' },
    { nombre: 'sin releer cada minuto', de: '      setInterval(() => releerOrdenesEnSilencio(), RELEER_ORDENES_CADA)\n', a: '' },
    { nombre: 'releer cada 10 minutos', de: '    const RELEER_ORDENES_CADA = 60000', a: '    const RELEER_ORDENES_CADA = 600000' },
    // Las facturas
    { nombre: 'la factura con la parte equivocada', de: '{ p_orden_id: fc.ordenId, p_parte: parte, p_numero: numero, p_archivo_url: ruta }', a: "{ p_orden_id: fc.ordenId, p_parte: 'A', p_numero: numero, p_archivo_url: ruta }" },
    { nombre: 'el aviso de la factura con el rótulo viejo', de: 'mostrarExito(`${codigoPunto(fc.codigo, parte)}: se guardó la factura ${numero}.`)', a: 'mostrarExito(`${fc.codigo}-${parte}: se guardó la factura ${numero}.`)' },
    { nombre: 'el número de factura sin largo mínimo', de: '      return n.length < 3 || n.length > 40 ?', a: '      return n.length < 1 || n.length > 400 ?' },
    { nombre: 'el PDF de la factura fuera de la carpeta del usuario', de: 'return `${uid}/facturas-venta/${unidadId}/${anio}/${codigo}-${parte}.pdf`', a: 'return `facturas-venta/${unidadId}/${anio}/${codigo}-${parte}.pdf`' },
    { nombre: 'la factura: el error de la base se tapa', de: "c.error = err?.message || 'No se pudo guardar la factura. Probá de nuevo.'", a: "c.error = 'No se pudo guardar la factura. Probá de nuevo.'" },
    { nombre: 'la factura guardada no se ve', de: "      if (g) { g.textContent = f?.numero ? 'Factura ' + f.numero : 'sin cargar';", a: "      if (g) { g.textContent = 'sin cargar';" },
    { nombre: 'el PDF guardado no se puede ver', de: '      if (ver) ver.hidden = !f?.archivo_url', a: '      if (ver) ver.hidden = true' },
  ],
})
