// Mutaciones de test-produccion-receta-cambio.js (la receta que cambia en
// medio del turno y la reventa fuera del catálogo de la planta, 30/09/2026).
// Ver mutar.js y mutar-produccion.js.
//
//   node pruebas/mut-produccion-receta-cambio.js
//
// UN RUNNER POR VEZ: dos corridas en paralelo se pisan el mut-tmp-*.html.

const path = require('path')
const { correrMutacionesProduccion } = require('./mutar-produccion')

correrMutacionesProduccion({
  suite: path.join(__dirname, 'test-produccion-receta-cambio.js'),
  escape: 'esc',
  manuales: [
    // Las cantidades
    { nombre: 'lo nuevo sale de la anterior (el bug)', de: ' && !nuevos.has(it.ingrediente_id)\n', a: '\n' },
    { nombre: 'cantidadesDesde no calcula los nuevos', de: "      const nuevos = partida === 'anterior' ? nuevosEnReceta({ original, anterior }) : new Set()", a: '      const nuevos = new Set()' },
    // nuevosEnReceta
    { nombre: 'un ingrediente en 0 en la receta vigente cuenta como nuevo', de: "        if (!(Number(it.cantidad_kg ?? 0) > 0)) continue\n        const enMasa", a: '        const enMasa' },
    { nombre: 'lo que la anterior no tiene no es nuevo', de: '        if (!enMasa) { out.add(it.ingrediente_id); continue }', a: '        if (!enMasa) continue' },
    { nombre: 'sin cambio de receta igual se marca nuevo', de: '        if (!cambio) continue\n', a: '' },
    { nombre: 'no se mira la receta vieja', de: "        if (!(Number(enVieja?.cantidad_kg ?? 0) > 0) && !(Number(enMasa.cantidad_simple_kg ?? 0) > 0)) out.add(it.ingrediente_id)", a: "        if (!(Number(enMasa.cantidad_simple_kg ?? 0) > 0)) out.add(it.ingrediente_id)" },
    { nombre: 'recetaCambio: la misma receta cuenta como cambio', de: '      if (vieja.receta_id === d.original.receta_id) return null\n', a: '' },
    // elegirComo
    { nombre: 'la masa no guarda los nuevos', de: "      b.nuevos = b.partida === 'anterior' ? [...nuevosEnReceta(d)] : []", a: '      b.nuevos = []' },
    { nombre: 'Original también marca nuevos', de: "      b.nuevos = b.partida === 'anterior' ? [...nuevosEnReceta(d)] : []", a: '      b.nuevos = [...nuevosEnReceta(d)]' },
    { nombre: 'los "otro" de la anterior no vienen', de: "      b.otros = b.partida === 'anterior' ? otrosDeLaAnterior(d) : []", a: '      b.otros = []' },
    { nombre: 'Original trae los "otro" de la anterior', de: "      b.otros = b.partida === 'anterior' ? otrosDeLaAnterior(d) : []", a: '      b.otros = otrosDeLaAnterior(d)' },
    // otrosDeLaAnterior. (Sin la guarda de ingrediente_id no cambia nada: un
    // renglón del catálogo no trae ingrediente_libre y lo saca el largo del
    // nombre. Por eso no se muta.)
    { nombre: 'el "otro" no se marca de la anterior', de: "kg: redondearKg(kg), deAnterior: true })", a: 'kg: redondearKg(kg) })' },
    // La lectura
    { nombre: 'la receta de la anterior no se lee', de: '          estado.datosMasa.anterior.receta = await leerRecetaDeLaAnterior(estado.datosMasa)', a: '          estado.datosMasa.anterior.receta = null' },
    { nombre: 'un error de la receta anterior voltea la sala', de: "          console.error('receta de la masa anterior:', err)\n          estado.datosMasa.anterior.receta = null", a: '          throw err' },
    { nombre: 'la versión vieja no se lee', de: "      return { receta_id: recetaId, version: r.data?.version ?? null, items: ri.data ?? [], quitados }", a: "      return { receta_id: recetaId, version: null, items: ri.data ?? [], quitados }" },
    { nombre: 'los renglones viejos no se leen', de: "      return { receta_id: recetaId, version: r.data?.version ?? null, items: ri.data ?? [], quitados }", a: "      return { receta_id: recetaId, version: r.data?.version ?? null, items: [], quitados }" },
    { nombre: 'los quitados no se nombran', de: "      return { receta_id: recetaId, version: r.data?.version ?? null, items: ri.data ?? [], quitados }", a: "      return { receta_id: recetaId, version: r.data?.version ?? null, items: ri.data ?? [], quitados: [] }" },
    // (El atajo de la misma receta no se muta: sin él se lee la misma receta
    // de la tabla y recetaCambioDesdeAnterior compara el id igual.)
    // El aviso y la marca
    { nombre: 'el aviso no se pinta', de: '      cambio.hidden = !textoCambio', a: '      cambio.hidden = true' },
    { nombre: 'el aviso sin las versiones', de: '? `La receta cambió (v${c.desde} → v${c.hasta}) desde la masa anterior.`', a: "? 'La receta cambió desde la masa anterior.'" },
    { nombre: 'el aviso sin lo nuevo', de: '      if (nombres.length) partes.push(`Nuevo en la receta: ${nombres.join(\', \')}.`)', a: '' },
    { nombre: 'el aviso sin lo que ya no está', de: "      const quitados = c ? (d.anterior.receta?.quitados ?? []) : []", a: '      const quitados = []' },
    { nombre: 'sin la marca "nuevo en la receta"', de: "        `${nuevo ? ' <span class=\"pr-rec__nuevo\">nuevo en la receta</span>' : ''}</span>` +", a: "        '</span>' +" },
    // El "otro" en solo lectura
    { nombre: 'con Anterior el "otro" se puede tocar', de: "(b.otros ?? []).map(o => htmlFilaOtro(o, b.como === 'modificar')).join('')", a: "(b.otros ?? []).map(o => htmlFilaOtro(o)).join('')" },
    { nombre: 'con Modificar el "otro" no se puede tocar', de: "(b.otros ?? []).map(o => htmlFilaOtro(o, b.como === 'modificar')).join('')", a: "(b.otros ?? []).map(o => htmlFilaOtro(o, false)).join('')" },
    { nombre: 'el "otro" de solo lectura sin escapar', de: "          `<span class=\"pr-rec__ing\"><span class=\"pr-rec__nombre\"><span class=\"pr-rec__sello\">OTRO</span> ${esc(o.nombre)}</span>` +\n          `<span class=\"pr-rec__marca\">${esc(marca)}</span></span>` +\n          `<span class=\"pr-rec__cant pr-rec__cant--fija\">", a: "          `<span class=\"pr-rec__ing\"><span class=\"pr-rec__nombre\"><span class=\"pr-rec__sello\">OTRO</span> ${o.nombre}</span>` +\n          `<span class=\"pr-rec__marca\">${esc(marca)}</span></span>` +\n          `<span class=\"pr-rec__cant pr-rec__cant--fija\">" },
    { nombre: 'el "otro" de solo lectura sin decir de dónde viene', de: "      const marca = o.deAnterior ? 'escrito a mano · de la masa anterior' : 'escrito a mano'", a: "      const marca = 'escrito a mano'" },
    // La reventa
    { nombre: 'la reventa se ofrece para producir', de: '      const productos = (leidos ?? []).filter(p => p?.origen_producto_id == null)', a: '      const productos = leidos ?? []' },
    { nombre: 'la consulta no trae origen_producto_id', de: "select('id, nombre, tipo_masa, orden, color, origen_producto_id').eq('unidad_negocio_id', unidadId)", a: "select('id, nombre, tipo_masa, orden, color').eq('unidad_negocio_id', unidadId)" },
    { nombre: 'las presentaciones de la reventa se piden', de: '      const ids = productos.map(p => p.id)\n      let presentaciones = []', a: '      const ids = (leidos ?? []).map(p => p.id)\n      let presentaciones = []' },
  ],
})
