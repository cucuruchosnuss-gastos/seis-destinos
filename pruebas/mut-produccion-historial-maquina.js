// Mutaciones de test-produccion-historial-maquina.js (4h · el historial de
// una máquina en Sala de masa, la planta con dos modos). Ver mutar.js.
//
//   node pruebas/mut-produccion-historial-maquina.js

const path = require('path')
const { correrMutacionesProduccion } = require('./mutar-produccion')

correrMutacionesProduccion({
  suite: path.join(__dirname, 'test-produccion-historial-maquina.js'),
  escape: 'esc',
  funciones: ['htmlMasaHist', 'htmlIngredientesHist', 'htmlAnularHist', 'htmlDetalleHist'],
  equivalentes: [
    { expr: "esc(horaArgentina(m.hora) || '—')", motivo: 'una hora HH:MM formateada por Intl, o una raya' },
    { expr: 'esc(textoGramos(g))', motivo: 'textoGramos(): signo, dígitos y " g"' },
    { expr: 'esc(textoCantidad(kg))', motivo: 'formatearNumeroAr() + " kg" o " g" de un número finito' },
  ],
  manuales: [
    { nombre: 'la lista trae las masas de todas las máquinas', de: '        const masas = await leerMasasSala([turnoId])', a: '        const masas = await leerMasasSala(maquinasAbiertas().map(x => x.turno.id))' },
    { nombre: 'la anulada cuenta en el título', de: '      const vivas = (h.masas ?? []).filter(x => !x.anulada).length', a: '      const vivas = (h.masas ?? []).length' },
    { nombre: 'arranca elegida la primera y no la última', de: '      h.elegida = (ultima ?? masAlta)?.id ?? null', a: '      h.elegida = h.masas?.[0]?.id ?? null' },
    { nombre: 'la elegida no se marca', de: "aria-pressed=\"${elegida ? 'true' : 'false'}\">` +\n        `<span class=\"pr-hm__masa-l1\">", a: "aria-pressed=\"false\">` +\n        `<span class=\"pr-hm__masa-l1\">" },
    { nombre: 'la anulada no lo dice en la lista', de: "      return `<button type=\"button\" class=\"pr-hm__masa${m.anulada ? ' pr-hm__masa--anulada' : ''}\"", a: "      return `<button type=\"button\" class=\"pr-hm__masa\"" },
    { nombre: 'sin el tamaño en la lista', de: '<span class="pr-hm__masa-l1">Masa ${esc(m.nro)} · ${m.doble ? \'Doble\' : \'Simple\'}</span>', a: '<span class="pr-hm__masa-l1">Masa ${esc(m.nro)}</span>' },
    { nombre: 'la barra no marca la máquina del historial', de: "      const marcada = estado.vista === 'pr-hist-maq' ? (estado.histMaq?.turnoId ?? null) : (estado.salaTurno?.id ?? null)", a: '      const marcada = estado.salaTurno?.id ?? null' },
    { nombre: 'la nota de anular no dice cuál', de: '      nota.textContent = ultima ? `Solo se puede anular la última masa (la ${ultima.nro}).` : \'\'', a: "      nota.textContent = ultima ? 'Solo se puede anular la última masa.' : ''" },
    { nombre: 'el botón no nombra la máquina', de: "      document.getElementById('pr-hm-nueva').textContent = `+ Nueva masa para ${h.maquinaNombre}`", a: "      document.getElementById('pr-hm-nueva').textContent = '+ Nueva masa'" },
    // El detalle.
    { nombre: 'no dice quién la hizo', de: "      const quien = (estado.personal ?? []).find(x => x.id === m.masero_id)?.nombre ?? ''", a: "      const quien = ''" },
    { nombre: 'no muestra el motivo', de: '      if (m.motivo) html += ', a: '      if (false) html += ' },
    { nombre: 'no dice por qué se anuló', de: '      if (m.anulada && m.anulada_motivo) html += ', a: '      if (false) html += ' },
    { nombre: 'nunca dice "agregado"', de: "            if (!(rec > 0)) cambioReceta = ' <span class=\"pr-rec__agregado\">agregado</span>'", a: "            if (false) cambioReceta = ''" },
    { nombre: 'no muestra lo que cambió', de: '              if (g !== 0) cambioReceta = ', a: '              if (false) cambioReceta = ' },
    { nombre: 'la diferencia no va en bordó', de: '<span class="pr-rec__dif pr-rec__dif--aleja">${esc(textoGramos(g))}</span>`', a: '<span class="pr-rec__dif">${esc(textoGramos(g))}</span>`' },
    { nombre: 'sin receta igual compara', de: '          if (d.receta && x.ingrediente_id) {', a: '          if (x.ingrediente_id) {\n            d.receta = d.receta ?? new Map()' },
    { nombre: 'muestra lo que la receta tiene en 0 y no se usó', de: "        .filter(x => Number(x.cantidad_simple_kg ?? 0) > 0 || (!!d.receta && (d.receta.get(x.ingrediente_id) ?? 0) > 0))\n", a: '' },
    { nombre: 'el escrito a mano pierde el nombre', de: "(x.ingrediente_libre ?? 'Otro')", a: "'Otro'" },
    { nombre: 'sin la marca del insumo', de: "      const marcaIng = x.insumos ? (x.insumos.marca || x.insumos.nombre || '') :", a: "      const marcaIng = false ? '' :" },
    { nombre: 'sin el lote', de: "${x.lote ? `lote ${esc(x.lote)}` : 'sin lote'}", a: "${'sin lote'}" },
    { nombre: 'no aclara que es doble', de: "${m.doble ? ': esta fue doble, lleva el doble de todo' : ''}", a: "${''}" },
    { nombre: 'un error de lectura se muestra como "Cargando…"', de: "      if (d && d.error) html += '<p class=\"pr-aviso pr-aviso--grave\">No se pudo leer el detalle de esta masa.</p>'\n      else ", a: '      ' },
    { nombre: 'masa_items sin los embeds', de: ", ingredientes(nombre, orden), insumos(nombre, marca)')", a: "')" },
    { nombre: 'la receta de otra masa', de: ".eq('receta_id', m.receta_id)", a: ".eq('receta_id', 'r-otra')" },
    { nombre: 'una respuesta vieja pisa el detalle', de: "        if (pedido !== estado.pedidoDetalleHist || estado.histMaq !== h) return\n        h.detalle.items", a: '        h.detalle.items' },
    // Anular.
    { nombre: 'se ofrece anular una que no es la última', de: '      if (ultima && ultima.id === m.id && tieneTarea(\'cargar\')) {', a: '      if (tieneTarea(\'cargar\')) {' },
    { nombre: 'se anula sin produccion:cargar', de: "      if (!ultima || ultima.id !== h.elegida || !tieneTarea('cargar')) return", a: "      if (!ultima || ultima.id !== h.elegida) return" },
    { nombre: 'pedir anular otra que no es la última', de: "      if (!ultima || ultima.id !== h.elegida || !tieneTarea('cargar')) return", a: "      if (!ultima) return" },
    { nombre: 'anular sin motivo', de: "      if (motivo.length < 3) { a.error = 'Escribí por qué (al menos 3 letras).'; return pintarHistMaq() }", a: '' },
    { nombre: 'el motivo no se recorta', de: "      const motivo = String(a.motivo ?? '').trim()\n      if (motivo.length < 3) { a.error = 'Escribí por qué (al menos 3 letras).'; return pintarHistMaq() }", a: "      const motivo = String(a.motivo ?? '')\n      if (motivo.length < 3) { a.error = 'Escribí por qué (al menos 3 letras).'; return pintarHistMaq() }" },
    { nombre: 'el error de la base se tapa', de: "        a.error = e?.message || 'No se pudo anular la masa.'\n        pintarHistMaq()", a: "        a.error = 'No se pudo anular la masa.'\n        pintarHistMaq()" },
    { nombre: 'Cancelar no cierra', de: '      estado.histMaq.anular = null\n      pintarHistMaq()', a: '      pintarHistMaq()' },
    { nombre: 'tocar otra masa deja abierto anular', de: '      h.elegida = masaId\n      h.anular = null', a: '      h.elegida = masaId' },
    // Navegación.
    { nombre: 'una máquina cerrada abre un historial vacío', de: '      if (!e) return mostrarSala()\n      const pedido = (estado.pedidoHistMaq', a: '      if (!e) return\n      const pedido = (estado.pedidoHistMaq' },
    { nombre: '"+ Nueva masa" no abre la máquina', de: '      await elegirMaquinaSala(turnoId)\n    }', a: '    }' },
    { nombre: 'el listener no elige la masa', de: '        if (m) { elegirMasaHist(m.dataset.hmMasa); return }', a: '        if (m) return' },
  ],
})
