// Mutaciones de Conos de papel (ver test-conos.js y test-conos-xss.js).
const path = require('path')
const { correrMutacionesEnVarios } = require('./mutar')

const HTML = path.join(__dirname, '..', 'modulos', 'conos.html')
const comunes = { original: HTML, funciones: [], salir: false }

correrMutacionesEnVarios([
  { ...comunes, suite: path.join(__dirname, 'test-conos.js'), manuales: [
    { nombre: 'los botones reemplazan en vez de sumar', de: '      return a + n\n    }', a: '      return n\n    }' },
    { nombre: '×½ vale 10.000', de: "{ texto: '×½', n: 5000 }", a: "{ texto: '×½', n: 10000 }" },
    { nombre: 'los botones del pliego son 1.000', de: 'const BOTONES_PLIEGO = [5000, 10000]', a: 'const BOTONES_PLIEGO = [1000, 10000]' },
    { nombre: 'sin pedir igual ve "Por pedir"', de: "      if (p.pedir) v.push({ clave: 'porpedir', texto: 'Por pedir' })", a: "      if (p.pedir || p.ver) v.push({ clave: 'porpedir', texto: 'Por pedir' })" },
    { nombre: 'sin precios igual ve Precios', de: "      if (p.precios) v.push({ clave: 'precios', texto: 'Precios del papel' })", a: "      v.push({ clave: 'precios', texto: 'Precios del papel' })" },
    { nombre: 'Mauricio ve la lista completa de pliegos', de: "      else if (p.ver) v.push({ clave: 'entregas', texto: 'Pendientes de entrega' })", a: "      else if (p.ver) v.push({ clave: 'pliegos', texto: 'Pliegos' })" },
    { nombre: 'Por pedir no va primero', de: "      if (p.pedir) v.push({ clave: 'porpedir', texto: 'Por pedir' })\n      if (p.ver || p.pedir) v.push({ clave: 'stock', texto: 'Stock' })", a: "      if (p.ver || p.pedir) v.push({ clave: 'stock', texto: 'Stock' })\n      if (p.pedir) v.push({ clave: 'porpedir', texto: 'Por pedir' })" },
    { nombre: 'super_admin no tiene bypass', de: 'const tiene = x => !!esSuper || t.has(x)', a: 'const tiene = x => t.has(x)' },
    { nombre: 'se puede asignar más que el total', de: '      if (otros + cantidadNueva > total) return', a: '      if (false) return' },
    { nombre: 'el chequeo suma el mismo cono dos veces', de: "      const otros = (items ?? []).filter(i => i.marca_id !== marcaId)", a: "      const otros = (items ?? [])" },
    { nombre: 'el IVA no se suma al total', de: '      return { cantidad: cant, subtotal: sub / 100, impuesto: imp / 100, total: (sub + imp) / 100 }', a: '      return { cantidad: cant, subtotal: sub / 100, impuesto: imp / 100, total: sub / 100 }' },
    { nombre: 'sin precio se calcula con 0', de: "      if (precio === null || precio === undefined || !Number.isFinite(Number(precio))) {\n        return { cantidad: cant, subtotal: null, impuesto: null, total: null }\n      }", a: '' },
    { nombre: 'el precio no mira la fecha', de: "p.papel === papel && String(p.vigente_desde) <= hoy)\n      cands.sort", a: "p.papel === papel)\n      cands.sort" },
    { nombre: 'el precio no mira la cantidad parecida', de: "        Math.abs(a.cantidad - cantidadTotal) - Math.abs(b.cantidad - cantidadTotal)\n        || ", a: '        ' },
    { nombre: 'sin consumo dice 0 días', de: "      if (!Number.isFinite(c) || c <= 0) return null", a: "      if (!Number.isFinite(c) || c <= 0) return 0" },
    { nombre: 'los negativos no se avisan', de: '        if (Number(f.stock) < 0) { negativos.push(f); continue }', a: '        if (false) { negativos.push(f); continue }' },
    { nombre: 'se avisan los de 30 días o más', de: '        if (d !== null && d < DIAS_AVISO) pocos.push(f)', a: '        if (d !== null) pocos.push(f)' },
    { nombre: 'el total por papel no suma', de: '        g.total += Number(f.cantidad) || 0', a: '        g.total = Number(f.cantidad) || 0' },
    { nombre: 'la O.C. sin la versión', de: "      return String(pliego.numero) + (Number(pliego.version) > 1 ? ` · v${pliego.version}` : '')", a: '      return String(pliego.numero)' },
    { nombre: 'los logos nuevos no van en rojo en la tabla', de: "        i.logo_nuevo ? 'oc-logo' : ''))", a: "        ''))" },
    { nombre: 'la O.C. muestra precios sin permiso', de: "      const precioTxt = conPrecios ? precio3(precio) : '-'", a: '      const precioTxt = precio3(precio)' },
    { nombre: 'la O.C. no lista los logos nuevos', de: '      const nuevos = lista.filter(i => i.logo_nuevo).map(i => nombreDe(i.marca_id))', a: '      const nuevos = []' },
    { nombre: 'la O.C. no rellena renglones', de: '      while (conos.length < RENGLONES_MINIMOS_OC)', a: '      while (false)' },
    { nombre: 'la O.C. sin la fecha de entrega', de: "<p><b>FECHA DE ENTREGA</b>: ${esc(fechaCorta(pliego.fecha_entrega_estimada))}</p>", a: '<p></p>' },
    { nombre: 'la O.C. sin los comentarios', de: "${renglones(pliego.comentarios).map(r => `<p><b>${esc(r)}</b></p>`).join('')}", a: '' },
    { nombre: 'el nombre del cono sin escapar en la O.C.', de: "const conos = lista.map(i => fila('', esc(nombreDe(i.marca_id))", a: "const conos = lista.map(i => fila('', (nombreDe(i.marca_id))" },
    { nombre: 'la razón social sin escapar', de: '<p>${esc(cfg.oc_razon_social ?? \'—\')}</p>', a: '<p>${cfg.oc_razon_social ?? \'—\'}</p>' },
    { nombre: 'un ausente se muestra 0', de: "      if (n === null || n === undefined || n === '' || !Number.isFinite(Number(n))) return '—'\n      return formatearNumeroAr(Number(n), { decimales: 0 })", a: "      return formatearNumeroAr(Number(n) || 0, { decimales: 0 })" },
    { nombre: 'hoy en UTC', de: "{ timeZone: ZONA_AR, year: 'numeric'", a: "{ timeZone: 'UTC', year: 'numeric'" },
    { nombre: 'el precio sin 3 decimales', de: "      return formatearNumeroAr(Number(n), { decimales: 3 })", a: "      return formatearNumeroAr(Number(n), { decimales: 2 })" },
  ] },
  { original: path.join(__dirname, '..', 'js', 'modulos.js'), funciones: [], salir: false, variable: 'ARCHIVO_MODULOS',
    suite: path.join(__dirname, 'test-conos-catalogo.js'), manuales: [
    { nombre: 'la tarjeta pide la fila del módulo', de: '  const habilitado = esAdmin || modulo.sinFilaModulo === true || (misModulos', a: '  const habilitado = esAdmin || (misModulos' },
    { nombre: 'la tarjeta no pide tareas', de: "    requiereTareas: ['conos:ver', 'conos:pedir', 'conos:precios', 'conos:recibir'],", a: '' },
    { nombre: 'la tarjeta sin recibir', de: "    requiereTareas: ['conos:ver', 'conos:pedir', 'conos:precios', 'conos:recibir'],", a: "    requiereTareas: ['conos:pedir', 'conos:precios'],\n    requiereTareas2: [ 'conos:ver', 'conos:recibir']," },
  ] },
  { original: path.join(__dirname, '..', 'modulos', 'accesos.html'), funciones: [], salir: false,
    suite: path.join(__dirname, 'test-conos-catalogo.js'), manuales: [
    { nombre: 'el grupo de conos no se ve sin módulo', de: '      if (grupo.siempreVisible) return true\n', a: '' },
    { nombre: 'cualquier grupo se ve siempre', de: '      if (grupo.siempreVisible) return true\n', a: '      return true\n' },
    { nombre: 'otro texto para recibir', de: "label: 'Recibir pliegos de conos'", a: "label: 'Recibir conos'" },
  ] },
  { ...comunes, suite: path.join(__dirname, 'test-conos-xss.js'), manuales: [
    { nombre: 'el nombre del cono sin escapar en la lista de stock', de: '<span class="cn-stock-nombre">${esc(f.cono)}', a: '<span class="cn-stock-nombre">${f.cono}' },
    { nombre: 'la nota de lo anotado sin escapar', de: "${an.nota ? ' · ' + esc(an.nota) : ''}", a: "${an.nota ? ' · ' + an.nota : ''}" },
    { nombre: 'el motivo de anulación sin escapar', de: 'Anulado: ${esc(p.anulado_motivo ?? \'\')}', a: 'Anulado: ${p.anulado_motivo ?? \'\'}' },
    { nombre: 'los comentarios del detalle sin escapar', de: '<p><b>Comentarios:</b> ${esc(p.comentarios)}</p>', a: '<p><b>Comentarios:</b> ${p.comentarios}</p>' },
  ] },
])
