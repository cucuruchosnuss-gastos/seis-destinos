// Mutaciones de test-administracion-importar.js (el importador de la carga
// inicial). Ver mutar.js.
//
//   node pruebas/mut-administracion-importar.js
//
// UN RUNNER POR VEZ: dos corridas en paralelo se pisan el mut-tmp-*.html.

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-administracion-importar.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/administracion.html'),
  escape: 'esc',
  funciones: ['htmlFilaImportar', 'htmlVistaPrevia'],
  equivalentes: [
    { expr: 'esc(f.estado)', motivo: "el estado de una fila es una constante del código ('ok' / 'error' / 'ignorada')" },
    { expr: "esc(ETIQUETA_FILA[f.estado] ?? '')", motivo: 'texto constante del código' },
  ],
  manuales: [
    // Los dígitos verificadores
    { nombre: 'el CUIT sin dígito verificador', de: "      return (r === 11 ? 0 : r === 10 ? 9 : r) === d[10]", a: '      return true' },
    { nombre: 'el CUIT: 10 no pasa a 9', de: "      return (r === 11 ? 0 : r === 10 ? 9 : r) === d[10]", a: "      return (r === 11 ? 0 : r) === d[10]" },
    { nombre: 'el CBU sin el segundo dígito verificador', de: "      return dv(0, [7, 1, 3, 9, 7, 1, 3]) === d[7] && dv(8, [3, 9, 7, 1, 3, 9, 7, 1, 3, 9, 7, 1, 3]) === d[21]", a: "      return dv(0, [7, 1, 3, 9, 7, 1, 3]) === d[7]" },
    { nombre: 'el CBU sin el primer dígito verificador', de: "      return dv(0, [7, 1, 3, 9, 7, 1, 3]) === d[7] && dv(8, [3, 9, 7, 1, 3, 9, 7, 1, 3, 9, 7, 1, 3]) === d[21]", a: "      return dv(8, [3, 9, 7, 1, 3, 9, 7, 1, 3, 9, 7, 1, 3]) === d[21]" },
    { nombre: 'un CUIT inválido no se marca', de: "          else if (!cuitValido(dig)) f.errores.push(`El CUIT ${dig} no es válido: el dígito verificador no cierra.`)\n", a: '' },
    { nombre: 'un CBU corto pasa', de: "          if (dig.length !== 22) f.errores.push(", a: "          if (false) f.errores.push(" },
    { nombre: 'un mail mal escrito pasa', de: "          if (!/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(mail)) f.errores.push(", a: "          if (false) f.errores.push(" },
    // Nombres repetidos
    { nombre: 'un nombre que ya existe en la empresa pasa', de: "        else if (existentes.has(claveNombreCliente(nombre))) f.errores.push(", a: "        else if (false) f.errores.push(" },
    { nombre: 'la comparación de nombres distingue mayúsculas', de: '      return limpio(n).toLowerCase()', a: '      return limpio(n)' },
    { nombre: 'repetido en el archivo marca solo la segunda', de: '        for (const f of grupo) f.errores.push(texto(numeros.filter(n => n !== f.numero)))', a: '        for (const f of grupo.slice(1)) f.errores.push(texto(numeros.filter(n => n !== f.numero)))' },
    { nombre: 'los repetidos en el archivo no se marcan', de: '        if (grupo.length < 2) continue', a: '        continue' },
    { nombre: 'un CUIT repetido se vuelve error', de: "            if (cuits.has(dig)) f.avisos.push(", a: "            if (cuits.has(dig)) f.errores.push(" },
    // Otros datos
    { nombre: 'la lista no se busca', de: "          if (!l) f.errores.push(`No hay una lista de precios «${lista}» en esta empresa.`)", a: "          if (false) f.errores.push('')" },
    { nombre: 'el plazo sin tope', de: "          if (n === null || n > 365) f.errores.push(", a: "          if (n === null) f.errores.push(" },
    { nombre: 'la ficha manda todo aunque venga vacío', de: "        if (d[c] !== undefined && d[c] !== null && d[c] !== '') ficha[c] = d[c]", a: '        ficha[c] = d[c] ?? null' },
    { nombre: 'un número ilegible vale cero', de: "      if (!t) return null\n      return leerNumeroAr(t, { decimales, negativos })", a: "      if (!t) return 0\n      return leerNumeroAr(t, { decimales, negativos }) ?? 0" },
    // Nada se guarda hasta confirmar; solo las buenas
    { nombre: 'pedir guardar ya guarda', de: '      im.confirmar = true\n      pintarImportar()\n    }', a: '      im.confirmar = true\n      confirmarImportacion()\n    }' },
    { nombre: 'la vista previa guarda', de: "        im.archivo = nombreArchivo\n", a: "        im.archivo = nombreArchivo\n        im.confirmar = true\n        confirmarImportacion()\n" },
    { nombre: 'se guardan también las filas con errores', de: "      const buenas = im.filas.filter(f => f.estado === 'ok')", a: "      const buenas = im.filas.filter(f => f.estado !== 'ignorada')" },
    { nombre: 'confirmar sin haberlo pedido guarda', de: '      if (!im?.confirmar || im.guardando || im.terminado) return', a: '      if (!im || im.guardando || im.terminado) return' },
    { nombre: 'una importación terminada se vuelve a guardar', de: '      if (!im?.confirmar || im.guardando || im.terminado) return', a: '      if (!im?.confirmar || im.guardando) return' },
    { nombre: 'se puede guardar dos veces', de: '      if (!im?.filas || im.guardando || im.terminado) return', a: '      if (!im?.filas || im.guardando) return' },
    { nombre: 'la ficha va con otro id', de: "                const r = await supabase.rpc('guardar_ficha_cliente', { p_cliente_id: id, p_datos: p.ficha })", a: "                const r = await supabase.rpc('guardar_ficha_cliente', { p_cliente_id: null, p_datos: p.ficha })" },
    { nombre: 'la ficha fallida cuenta como guardada', de: "                if (r.error) { f.resultado = { ok: false, mensaje: `Se creó el cliente pero la ficha no se guardó:", a: "                if (false) { f.resultado = { ok: false, mensaje: `Se creó el cliente pero la ficha no se guardó:" },
    { nombre: 'el error de la base se tapa', de: "            f.resultado = { ok: false, mensaje: err?.message || 'No se pudo guardar.' }\n          }", a: "            f.resultado = { ok: false, mensaje: 'No se pudo guardar.' }\n          }" },
    // Precios
    { nombre: 'un precio igual al vigente se guarda', de: "            if (vig && Number(vig.precio_caja) === n) { f.ignorada = true;", a: "            if (false) { f.ignorada = true;" },
    { nombre: 'el insumo viaja como presentación', de: "            f.datos = g.insumoId ? { insumo_id: g.insumoId, precio_caja: n } : { presentacion_id: g.presentacionId, precio_caja: n }", a: "            f.datos = { presentacion_id: g.presentacionId, precio_caja: n }" },
    { nombre: 'un código desconocido pasa', de: "        else if (!g) f.errores.push('El código no es de un producto", a: "        else if (false) f.errores.push('El código no es de un producto" },
    { nombre: 'los precios sin la lista elegida', de: "      if (im.tipo === 'precios' && !im.listaId) { im.error = 'Elegí primero la lista de precios.'; pintarImportar(); return }\n      im.error = null", a: '      im.error = null' },
    { nombre: 'guardar_precios con otra fecha', de: "{ p_lista_id: im.listaId, p_vigente_desde: im.desde, p_items: buenas.map(f => f.datos) }", a: "{ p_lista_id: im.listaId, p_vigente_desde: hoyArgentina(), p_items: buenas.map(f => f.datos) }" },
    { nombre: 'la plantilla de precios sin el precio actual', de: "vig ? Number(vig.precio_caja) : '', '']", a: "'', '']" },
    // Saldos
    { nombre: 'el saldo ya cargado no se marca', de: "        if (c && !f.ignorada && ctx?.conSaldo instanceof Set && ctx.conSaldo.has(c.id)) {", a: '        if (false) {' },
    { nombre: 'quién ya tiene saldo se busca sin el tipo', de: ".select('cliente_id').eq('tipo', 'saldo_inicial').in('cliente_id', ids)", a: ".select('cliente_id').in('cliente_id', ids)" },
    { nombre: 'sin retiros:ver se consulta igual', de: "        if (puedeEn('retiros', 'ver') && ids.length) {", a: '        if (ids.length) {' },
    { nombre: 'un saldo en cero se carga', de: "          else if (n === 0) { f.ignorada = true;", a: "          else if (false) { f.ignorada = true;" },
    { nombre: 'una fecha futura pasa', de: "          else if (fe > hoy) f.errores.push('La fecha no puede ser posterior a hoy.')\n", a: '' },
    { nombre: 'el saldo sin la observación', de: 'p_fecha: f.datos.fecha, p_observacion: f.datos.observacion ?? null,', a: 'p_fecha: f.datos.fecha, p_observacion: null,' },
    { nombre: 'la plantilla de saldos con los inactivos', de: "(clientes ?? []).filter(c => c.activo !== false).map(c =>", a: '(clientes ?? []).map(c =>' },
    // Permiso y resumen
    { nombre: 'Importar sin retiros:precios', de: "      { id: 'importar', titulo: 'Importar', permiso: ['retiros', 'precios'] },", a: "      { id: 'importar', titulo: 'Importar', permiso: ['retiros', 'ver'] }," },
    { nombre: 'el resumen no dice los errores', de: "        else if (f.estado === 'error') { resultado = 'Con errores: no se intentó'; detalle = f.errores.join(' ') }", a: "        else if (f.estado === 'error') { resultado = 'Con errores: no se intentó'; detalle = '' }" },
    { nombre: 'el CSV se interpreta', de: "{ type: 'string', raw: true }", a: "{ type: 'string' }" },
    { nombre: 'el CSV solo en UTF-8', de: "      catch { return new TextDecoder('windows-1252').decode(bytes) }", a: "      catch { return new TextDecoder('utf-8').decode(bytes) }" },
    { nombre: 'SheetJS de otro lado', de: "    const LIBRERIA_XLSX = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'", a: "    const LIBRERIA_XLSX = 'https://unpkg.com/xlsx/dist/xlsx.full.min.js'" },
  ],
})
