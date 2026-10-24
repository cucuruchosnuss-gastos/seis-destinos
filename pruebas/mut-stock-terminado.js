// Mutaciones de test-stock-terminado.js: el producto terminado de Stock
// (23/10/2026). Las automáticas sacan cada esc() de los html*Terminado; las a
// mano rompen una regla por vez. De a una. Ver mutar.js.
//
//   node pruebas/mut-stock-terminado.js
'use strict'

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-stock-terminado.js'),
  original: path.join(__dirname, '..', 'modulos', 'stock.html'),
  funciones: ['htmlFormTerminado', 'htmlHistorialTerminado', 'htmlDetalleTerminado', 'htmlLineaTerminado', 'htmlTerminado'],
  // Sacarles el esc() no cambia ninguna salida posible: son números, fechas
  // armadas con dígitos, constantes del código o uuids de la base.
  equivalentes: [
    { expr: 'esc(textoCajasTerminado(saldoLoteTerminado(l, lote)))', motivo: 'número: suma de enteros, con formatearNumeroAr' },
    { expr: 'esc(textoCajasTerminado(g.saldo))', motivo: 'número: suma de enteros, con formatearNumeroAr' },
    { expr: 'esc(textoCajasTerminado(l.total))', motivo: 'número: suma de enteros, con formatearNumeroAr' },
    { expr: 'esc(textoCajasTerminado(p.total))', motivo: 'número: suma de enteros, con formatearNumeroAr' },
    { expr: "esc((cajas > 0 ? '+' : '') + formatearNumeroAr(cajas, { decimales: 0 }))", motivo: 'número: las cajas de un movimiento (integer en la base)' },
    { expr: 'esc(v)', motivo: 'constante MOTIVOS_AJUSTE_TERMINADO del código' },
    { expr: 'esc(et)', motivo: 'constante MOTIVOS_AJUSTE_TERMINADO del código' },
    { expr: 'esc(LARGO_LOTE_PTM)', motivo: 'constante numérica del código' },
    { expr: 'esc(fechaCortaTerminado(m.fecha))', motivo: 'fecha armada solo con dígitos y "/" (o vacía): fechaCortaTerminado usa un regex de dígitos' },
    { expr: 'esc(fechaCortaTerminado(g.desde))', motivo: 'fecha armada solo con dígitos y "/" (o vacía)' },
    { expr: 'esc(movs.length - tope)', motivo: 'número: resta de un .length y un entero' },
    { expr: 'esc(l.movs.length)', motivo: 'número: un .length' },
    { expr: "esc(negativos === 1 ? '1 lote en negativo' : negativos + ' lotes en negativo')", motivo: 'número (un .length) y texto fijo' },
    { expr: 'esc(l.clave)', motivo: 'tres uuid de la base (unidad, presentación, cono: columnas uuid, verificadas el 23/10/2026) unidos con "|"' },
    { expr: 'esc(f.clave)', motivo: 'tres uuid de la base unidos con "|" (la clave de la línea)' },
  ],
  manuales: [
    // El nombre de la devolución, igual que en la gestión de Producción (24/10/2026)
    { nombre: 'la devolución sin "de cliente"', de: "      devolucion: 'Devolución de cliente',", a: "      devolucion: 'Devolución'," },
    // El texto de la línea
    { nombre: 'el cono no va en la línea', de: '      const partes = [l?.presentacion, l?.cono].map(', a: '      const partes = [l?.presentacion].map(' },
    { nombre: 'las unidades por caja se repiten siempre', de: '        if (!numeros.includes(upc)) texto +=', a: '        if (true) texto +=' },
    { nombre: 'las unidades por caja nunca', de: '        if (!numeros.includes(upc)) texto +=', a: '        if (false) texto +=' },
    { nombre: '"1.800" no se reconoce en el nombre', de: ".replace(/(\\d)\\.(?=\\d{3}\\b)/g, '$1')", a: '' },
    { nombre: '"1 cajas"', de: "${Math.abs(v) === 1 ? 'caja' : 'cajas'}", a: "${'cajas'}" },
    // Las líneas desde el libro
    { nombre: 'el total no suma', de: '        l.total += cajas\n', a: '' },
    { nombre: 'los lotes, los más nuevos primero', de: "          String(a.desde ?? '9999').localeCompare(String(b.desde ?? '9999')) || String(a.lote).localeCompare(String(b.lote))),", a: "          String(b.desde ?? '9999').localeCompare(String(a.desde ?? '9999')) || String(b.lote).localeCompare(String(a.lote)))," },
    { nombre: 'los movimientos, los más viejos primero', de: "          String(b.fecha ?? '').localeCompare(String(a.fecha ?? '')) || String(b.created_at ?? '').localeCompare(String(a.created_at ?? ''))),", a: "          String(a.fecha ?? '').localeCompare(String(b.fecha ?? '')) || String(a.created_at ?? '').localeCompare(String(b.created_at ?? ''))),"},
    { nombre: 'el cono no separa las líneas', de: '        const clave = claveLineaTerminado(m.unidad_negocio_id, m.presentacion_id, m.marca_id)', a: '        const clave = claveLineaTerminado(m.unidad_negocio_id, m.presentacion_id, null)' },
    // Qué se ve
    { nombre: 'sin buscar se ven también las líneas en cero', de: '(q ? coincideLineaTerminado(l, q) : tieneStockLineaTerminado(l))', a: '(q ? coincideLineaTerminado(l, q) : true)' },
    { nombre: 'buscando no aparecen las líneas en cero', de: '(q ? coincideLineaTerminado(l, q) : tieneStockLineaTerminado(l))', a: '(q ? coincideLineaTerminado(l, q) && tieneStockLineaTerminado(l) : tieneStockLineaTerminado(l))' },
    { nombre: 'la barra de arriba no filtra', de: '        pasaFiltroUnidad(l.unidadId, unidadBarra) && (q ?', a: '        true && (q ?' },
    { nombre: 'no se busca por lote', de: ", l.cono ?? '', ...(l.lotes ?? []).map(g => g.lote)].join(' '))", a: ", l.cono ?? ''].join(' '))" },
    { nombre: 'buscar con UNA palabra alcanza', de: '      return palabras.every(p => texto.includes(p))', a: '      return palabras.some(p => texto.includes(p))' },
    { nombre: 'los productos sin su orden', de: '            .sort((a, b) => porOrden(a.orden, b.orden) || String(a.nombre).localeCompare(String(b.nombre)))', a: '            .sort((a, b) => String(b.nombre).localeCompare(String(a.nombre)))' },
    { nombre: 'los conos antes que sin cono', de: '                (a.cono ? 1 : 0) - (b.cono ? 1 : 0) ||', a: '                (b.cono ? 1 : 0) - (a.cono ? 1 : 0) ||' },
    { nombre: 'sin el nombre de la fábrica con varias', de: '        return variasFabricas ? `<h3 class="ptm-fabrica">', a: '        return false ? `<h3 class="ptm-fabrica">' },
    { nombre: 'el lote en cero se lista', de: '      const conSaldo = (l.lotes ?? []).filter(g => g.saldo !== 0)', a: '      const conSaldo = (l.lotes ?? [])' },
    { nombre: 'la línea siempre abierta', de: '      const abierta = t.abiertas.has(l.clave)', a: '      const abierta = true' },
    { nombre: 'lo negativo sin rojo en la línea', de: "<span class=\"ptm-linea__cajas${l.total < 0 ? ' ptm-neg' : ''}\">", a: '<span class="ptm-linea__cajas">' },
    { nombre: 'el lote negativo sin fondo rojo', de: "<li class=\"ptm-lote${g.saldo < 0 ? ' ptm-lote--neg' : ''}\">", a: '<li class="ptm-lote">' },
    { nombre: 'sin el aviso de lotes en negativo', de: "      const negativos = (l.lotes ?? []).filter(g => g.saldo < 0).length\n", a: '      const negativos = 0\n' },
    { nombre: 'el CSS de lo negativo no es rojo', de: '    .ptm-neg { color: var(--rojo-oscuro); }', a: '    .ptm-neg { color: var(--color-texto); }' },
    // El historial
    { nombre: 'el ajuste sin su motivo', de: "        const motivo = m.tipo === 'ajuste' && String(m.motivo ?? '').trim()", a: "        const motivo = false && String(m.motivo ?? '').trim()" },
    { nombre: 'todos los tipos muestran el motivo', de: "        const motivo = m.tipo === 'ajuste' && String(m.motivo ?? '').trim()", a: "        const motivo = String(m.motivo ?? '').trim()" },
    { nombre: 'el historial sin tope', de: '      const filas = movs.slice(0, tope).map(m => {', a: '      const filas = movs.map(m => {' },
    { nombre: '"Ver más" no suma', de: '        t.historial.set(d.ptmMas, (t.historial.get(d.ptmMas) ?? 0) + HISTORIAL_PTM)', a: '        t.historial.set(d.ptmMas, (t.historial.get(d.ptmMas) ?? 0))' },
    // Lecturas
    { nombre: 'el libro sin el motivo', de: ".select('id, unidad_negocio_id, presentacion_id, marca_id, lote, cajas, tipo, motivo, fecha, created_at')", a: ".select('id, unidad_negocio_id, presentacion_id, marca_id, lote, cajas, tipo, fecha, created_at')" },
    { nombre: 'una sola página', de: '        if ((data ?? []).length < FILAS_POR_PAGINA_PTM) break\n        if (pagina === TOPE_PAGINAS_PTM - 1) incompleto = true', a: '        break' },
    { nombre: 'nunca dice incompleto', de: '        if (pagina === TOPE_PAGINAS_PTM - 1) incompleto = true\n      }\n      // La fábrica de pruebas', a: '      }\n      // La fábrica de pruebas' },
    { nombre: 'la fábrica de pruebas aparece', de: "      return { filas: sinUnidadesDePrueba(filas, estado.fabrica, f => f?.unidad_negocio_id), incompleto }", a: '      return { filas, incompleto }' },
    { nombre: 'un error de lectura no se dice', de: "        t.error = 'No se pudo leer el stock de producto terminado. Revisá la conexión y tocá Actualizar.'\n", a: '' },
    // Permisos
    { nombre: 'corregir sin mirar el alcance', de: "      return puedeAjustar() && puedeTareaEn('stock:ajustar_inventario', unidadId)", a: '      return puedeAjustar()' },
    { nombre: 'corregir con stock:ver', de: "      return puedeAjustar() && puedeTareaEn('stock:ajustar_inventario', unidadId)", a: "      return puedeTareaEn('stock:ver', unidadId)" },
    { nombre: 'abrir la corrección sin permiso', de: '      if (!t || !l || !puedeCorregirTerminadoEn(l.unidadId)) return', a: '      if (!t || !l) return' },
    { nombre: '"+ Otro lote" sin permiso', de: '      const otro = puede\n', a: '      const otro = true\n' },
    // La corrección
    { nombre: 'sin pedir Sumar o Restar', de: "      if (f.signo !== '+' && f.signo !== '-') falta.push('elegir Sumar o Restar')\n", a: '' },
    { nombre: 'cajas con decimales pasan', de: '      if (!(Number.isInteger(f.cajas) && f.cajas > 0)) falta.push(', a: '      if (!(f.cajas > 0)) falta.push(' },
    { nombre: 'cajas en cero pasan', de: '      if (!(Number.isInteger(f.cajas) && f.cajas > 0)) falta.push(', a: '      if (!(Number.isInteger(f.cajas))) falta.push(' },
    { nombre: 'sin pedir el tipo', de: "      if (!MOTIVOS_AJUSTE_TERMINADO.some(([v]) => v === f.tipo)) falta.push('por qué se corrige')\n", a: '' },
    { nombre: 'motivo de 2 letras pasa', de: "      if (String(f.motivo ?? '').trim().length < 3) falta.push(", a: "      if (String(f.motivo ?? '').trim().length < 2) falta.push(" },
    { nombre: 'sin pedir el lote nuevo', de: "      if (f.otro && !lote) falta.push('el lote (si no tiene, escribí SIN LOTE)')\n", a: '' },
    { nombre: 'el lote largo pasa', de: '      if (lote.length > LARGO_LOTE_PTM) falta.push(', a: '      if (false) falta.push(' },
    { nombre: 'restar manda positivo', de: "        p_cajas: f.signo === '-' ? -f.cajas : f.cajas,", a: '        p_cajas: f.cajas,' },
    { nombre: 'sin el cono', de: '        p_marca_id: l.marcaId ?? null,', a: '        p_marca_id: null,' },
    { nombre: 'el motivo con espacios', de: "        p_motivo: String(f.motivo ?? '').trim(),", a: '        p_motivo: f.motivo,' },
    { nombre: 'el lote nuevo sin mayúsculas', de: "      return f?.otro ? String(f.loteNuevo ?? '').trim().toUpperCase() : (f?.lote ?? '')", a: "      return f?.otro ? String(f.loteNuevo ?? '').trim() : (f?.lote ?? '')" },
    { nombre: 'llama aunque falte algo', de: '      if (!l || faltaFormTerminado(f).length) { pintarFormTerminado(); return }', a: '      if (!l) { pintarFormTerminado(); return }' },
    { nombre: 'dos toques, dos llamadas', de: '      if (!f || f.enviando) return\n      const l = lineaTerminado(f.clave)\n      f.intentado = true', a: '      if (!f) return\n      const l = lineaTerminado(f.clave)\n      f.intentado = true' },
    { nombre: 'el error de la base se pisa con uno propio', de: '        f.errorBase = err?.message ? String(err.message) : TEXTO_ERROR_RED_PTM', a: '        f.errorBase = TEXTO_ERROR_RED_PTM' },
    { nombre: 'el error de la base no se ve', de: '        error.hidden = !texto\n', a: '        error.hidden = true\n' },
    { nombre: 'el botón trabado siempre', de: '        guardar.disabled = !!f.enviando', a: '        guardar.disabled = true' },
    { nombre: 'el botón nunca se traba', de: '        guardar.disabled = !!f.enviando', a: '        guardar.disabled = false' },
    { nombre: 'después de guardar no relee', de: '        await cargarTerminado({ silencioso: true })\n      } catch (err) {\n        console.error(\'ajustar_stock_terminado:\'', a: '      } catch (err) {\n        console.error(\'ajustar_stock_terminado:\'' },
    { nombre: 'sin el mensaje de éxito', de: '        t.exito = { clave: f.clave, texto: textoExitoTerminado(f) }\n', a: '' },
    { nombre: '"Queda" con el signo al revés', de: "      const despues = antes + (f.signo === '-' ? -f.cajas : f.cajas)", a: "      const despues = antes + (f.signo === '-' ? f.cajas : -f.cajas)" },
    { nombre: 'las cajas no se leen del campo', de: "      if (campo === 'cajas') f.cajas = leerCampoNumero(e.target)", a: "      if (campo === 'cajas') f.cajas = Number(e.target.value)" },
    { nombre: 'el campo de cajas con decimales', de: '        enlazarCampoNumero(cajas, { decimales: 0 })', a: '        enlazarCampoNumero(cajas, { decimales: 2 })' },
    { nombre: 'el refresco pisa la corrección', de: "      if (estado.vista === 'terminado' && estado.ptm?.form) return true\n", a: '' },
    { nombre: 'Sumar/Restar no se marca', de: "        b.setAttribute('aria-pressed', b.dataset.ptmSigno === f.signo ? 'true' : 'false')", a: "        b.setAttribute('aria-pressed', 'false')" },
  ],
})
