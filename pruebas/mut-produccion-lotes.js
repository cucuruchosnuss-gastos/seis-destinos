// Mutaciones de test-produccion-lotes.js ("terminar la tablet", parte 3). Ver mutar.js.
//
//   node pruebas/mut-produccion-lotes.js

const path = require('path')
const { correrMutacionesProduccion } = require('./mutar-produccion')

correrMutacionesProduccion({
  suite: path.join(__dirname, 'test-produccion-lotes.js'),
  escape: 'esc',
  funciones: ['htmlFilaLote', 'htmlPanelLote', 'htmlCeldaLote', 'htmlEscribirLote'],
  equivalentes: [
    { expr: 'esc(textoCantidad(f.queda))', motivo: 'textoCantidad() de un número finito solo produce dígitos, la coma y "kg"/"g": sin esc() sale idéntico' },
    { expr: 'esc(textoFechaLote(f.desde))', motivo: 'textoFechaLote() solo produce "dd/mm/aaaa" (dígitos y barras) o vacío: sin esc() sale idéntico' },
    { expr: 'esc(pl.errorEscribir)', motivo: 'errorEscribir solo toma el texto fijo "Escribí el lote." (usarLoteEscrito): sin esc() sale idéntico' },
  ],
  manuales: [
    // b) Una sola opción vacía.
    { nombre: 'vuelven las dos opciones vacías (siempre "Se terminó")', de: "      return e.terminado ? 'Se terminó · elegí otro' : 'Elegí el lote'", a: "      return 'Se terminó · elegí otro'" },
    { nombre: 'nunca dice "Se terminó"', de: "      return e.terminado ? 'Se terminó · elegí otro' : 'Elegí el lote'", a: "      return 'Elegí el lote'" },
    { nombre: 'el terminado no va en bordó', de: "      if (e.terminado) clases.push('pr-rec__lote--terminado')\n      else if (vacio)", a: "      if (vacio)" },
    // c) El lote sin ingreso cargado.
    { nombre: 'vuelve el bug: el lote que no está en stock se da por terminado', de: '      if (!enLista) return conQuedan({ ...base, sinIngreso: true }, ins.insumo_id, l.lote)', a: '      if (!enLista) return { ...base, terminado: true, falta: true }' },
    { nombre: 'sin la nota "sin ingreso cargado"', de: "      const nota = e.sinIngreso ? '<span class=\"pr-rec__lote-nota\">sin ingreso cargado</span>' : htmlCeldaQueda(e)", a: "      const nota = htmlCeldaQueda(e)" },
    { nombre: 'el escrito a mano no dice "sin ingreso cargado"', de: "sinIngreso: !(ins.lotes ?? []).some(x => x.lote === texto) }", a: 'sinIngreso: false }' },
    { nombre: 'el lote de la anterior no viaja en el payload', de: "? b.lotes[it.ingrediente_id] : null\n        const lote = l && !l.sinLote ? String(l.lote ?? '').trim() : ''", a: "? b.lotes[it.ingrediente_id] : null\n        const lote = l && !l.sinLote && !l.manual && false ? String(l.lote ?? '').trim() : ''" },
    // "Se terminó".
    { nombre: '"Se terminó" no suelta el lote', de: "      b.lotes[ingredienteId] = { insumo_id: antes?.insumo_id || '', lote: null, manual: false, sinLote: false, terminado: true }", a: '      void antes' },
    { nombre: '"Se terminó" no marca terminado', de: "      b.lotes[ingredienteId] = { insumo_id: antes?.insumo_id || '', lote: null, manual: false, sinLote: false, terminado: true }", a: "      b.lotes[ingredienteId] = { insumo_id: antes?.insumo_id || '', lote: null, manual: false, sinLote: false }" },
    { nombre: '"Se terminó" se olvida de qué insumo era', de: "insumo_id: antes?.insumo_id || '', lote: null, manual: false, sinLote: false, terminado: true }", a: "insumo_id: '', lote: null, manual: false, sinLote: false, terminado: true }" },
    { nombre: 'el terminado no se lee', de: '      if (l && l.terminado) return { ...base, terminado: true, falta: true }\n', a: '' },
    { nombre: 'el terminado no se guarda en el borrador', de: "terminado: true }\n      b.payload = null\n      estado.errorReceta = null\n      guardarBorradorMasa(b)", a: "terminado: true }\n      b.payload = null\n      estado.errorReceta = null" },
    { nombre: 'el panel no ofrece "Se terminó"', de: "      const hayElegido = !e.terminado && !e.falta && !!e.l && !e.l.sinLote", a: '      const hayElegido = false' },
    { nombre: 'el panel ofrece "Se terminó" también terminado', de: "      const hayElegido = !e.terminado && !e.falta && !!e.l && !e.l.sinLote", a: '      const hayElegido = true' },
    // a) El panel.
    // (28/09/2026) La ventana de lotes: una lista, el más viejo primero, filtros por marca.
    { nombre: 'el lote a mano entra en la lista', de: '        if (o.manual) return\n', a: '' },
    { nombre: 'la lista no se ordena por fecha', de: '        if (a.desde && b.desde && a.desde !== b.desde) return a.desde < b.desde ? -1 : 1\n', a: '' },
    { nombre: 'el filtro por marca no filtra', de: '      const filas = filtro ? todas.filter(f => f.marca === filtro) : todas', a: '      const filas = todas' },
    { nombre: 'el más viejo no se destaca', de: "(viejo ? '<span class=\"pr-lp__fila-primero\">EL MÁS VIEJO · USALO PRIMERO</span>' : '')", a: "''" },
    { nombre: 'quedan sale del catálogo y no de stock_para_masa', de: '(quedaDelLote(o.insumo_id, o.lote) ?? (Number.isFinite(o.stock) ? o.stock : null))', a: '(Number.isFinite(o.stock) ? o.stock : null)' },
    { nombre: 'el renglón sin cuánto queda', de: '(f.queda != null ? `<span class="pr-lp__fila-queda">', a: '(false ? `<span class="pr-lp__fila-queda">' },
    { nombre: 'el renglón sin la marca', de: '<strong>${esc(f.marca)}</strong> ${lote}', a: '${lote}' },
    { nombre: 'la tarjeta elegida no se marca', de: '      const elegido = e.terminado ? -1 : indiceLote(e.ops, e.l)\n      const pl = estado.panelLote ?? {}', a: '      const elegido = -1\n      const pl = estado.panelLote ?? {}' },
    { nombre: 'el lote puesto no dice que es el de la masa anterior', de: "f.i === elegido ? notaElegido : ''", a: "''" },
    // Planta v2: tocar un renglón lo MARCA y "Usar …" lo pone.
    { nombre: 'tocar un renglón no lo marca', de: '      pl.sel = Number(indice)\n      pintarPanelLote()', a: '      pintarPanelLote()' },
    { nombre: 'tocar un renglón lo pone de una (vuelve el comportamiento viejo)', de: '      pl.sel = Number(indice)\n      pintarPanelLote()', a: '      elegirOpcionLote(pl.ingredienteId, String(indice)); cerrarPanelLote(); return' },
    { nombre: '"Usar …" no cierra', de: '      elegirOpcionLote(pl.ingredienteId, String(i))\n      cerrarPanelLote()', a: '      elegirOpcionLote(pl.ingredienteId, String(i))' },
    { nombre: '"Usar …" no pone el lote', de: '      elegirOpcionLote(pl.ingredienteId, String(i))\n      cerrarPanelLote()', a: '      cerrarPanelLote()' },
    { nombre: '"Usar …" usa el puesto y no el marcado', de: '      const i = Number.isInteger(pl.sel) ? pl.sel : indiceLote(e.ops, e.l)', a: '      const i = indiceLote(e.ops, e.l)' },
    { nombre: '"Usar …" no dice cuál', de: '>Usar ${esc(sel.marca)}${sel.o.sinLote ?', a: '>Usar${sel.o.sinLote ?' },
    { nombre: 'el botón "Usar …" no se escucha', de: "        if (ev.target.closest('#pr-lote-panel-usar-lista')) { usarLoteDeLista(); return }", a: "        if (ev.target.closest('#pr-lote-panel-usar-lista')) { return }" },
    { nombre: 'Escape no cierra', de: "      if (ev.key === 'Escape') { ev.preventDefault(); cerrarPanelLote(); return }\n", a: '' },
    { nombre: 'el foco no da la vuelta', de: "      const focos = [...panel.querySelectorAll('button:not([disabled]), input')]\n      if (!focos.length) return\n      const i = focos.indexOf(document.activeElement)\n      if (ev.shiftKey && i <= 0) { ev.preventDefault(); focos[focos.length - 1].focus() }\n", a: "      const focos = [...panel.querySelectorAll('button:not([disabled]), input')]\n      if (!focos.length) return\n      const i = focos.indexOf(document.activeElement)\n" },
    { nombre: 'el foco no vuelve al renglón', de: '`[data-lote="${pl.ingredienteId}"]`', a: "'body'" },
    { nombre: 'el renglón no abre el panel', de: "const b = ev.target.closest('[data-lote]'); if (b) abrirPanelLote(b.dataset.lote)", a: "const b = ev.target.closest('[data-lote]'); void b" },
    { nombre: 'con el campo abierto y sin lotes, la lista vacía se sigue mostrando', de: "        tarjetas: pl.escribir && !todas.length ? '' : filtrosHtml + listaHtml,", a: "        tarjetas: filtrosHtml + listaHtml," },
    { nombre: 'renglones chicos', de: '    .pr-lp__tarjeta { display: flex; align-items: center; gap: 12px; min-height: 54px;', a: '    .pr-lp__tarjeta { display: flex; align-items: center; gap: 12px; min-height: 30px;' },
    { nombre: 'sin scroll interno de la lista', de: 'class="pr-lp__filas" data-scroll-propio>', a: 'class="pr-lp__filas">' },
    { nombre: 'la ventana puede pasar la pantalla', de: '      width: min(640px, 100%); max-height: min(500px, calc(100dvh - 24px));', a: '      width: min(640px, 100%);' },
    { nombre: 'el link de escribir sin su borde punteado', de: '    .pr-lp__manual { width: 100%; min-height: 44px; border-radius: 12px; border: 2px dashed var(--p-acento);', a: '    .pr-lp__manual { width: 100%; min-height: 44px; border-radius: 12px; border: 2px solid var(--p-acento);' },
    // La fecha (desde la planta con dos modos sale de stock_para_masa, sin stock:ver).
    { nombre: 'la fecha vuelve a pedir stock:ver', de: "      estado.lotesDesde = null\n      try {\n        const { data, error } = await supabase.rpc('stock_para_masa'", a: "      estado.lotesDesde = null\n      if (puedeVerStockEn(estado.unidadId) !== true) return\n      try {\n        const { data, error } = await supabase.rpc('stock_para_masa'" },
    { nombre: 'la fecha se guarda con la clave equivocada', de: "m.set(`${ins.insumo_id}|${l.lote}`, l.desde)", a: "m.set(`${l.lote}`, l.desde)" },
    { nombre: 'la fecha no se muestra', de: "      const sub = nota || (f.desde ? `Ingresó el ${esc(textoFechaLote(f.desde))}` : '')", a: '      const sub = nota' },
    // Parte 0 (28/09/2026): escribir un lote desde CUALQUIER estado.
    { nombre: 'el link del lote a mano se fue', de: "        return '<button type=\"button\" class=\"pr-lp__manual\" data-lote-escribir>", a: "        return '' || '<button type=\"button\" class=\"pr-lp__manual\">" },
    { nombre: 'vuelve el bug: después de "Se terminó" no hay de qué insumo escribir', de: "      if (hay(e.l?.insumo_id)) return e.l.insumo_id\n      if (hay(it.insumo_preferido_id)) return it.insumo_preferido_id\n      return posibles[0]?.insumo_id ?? null", a: "      return e.l?.insumo_id ?? null" },
    { nombre: 'sin lotes con stock la ventana NO abre con el campo', de: "      const escribir = modo === 'lote' && !conStock", a: "      const escribir = false" },
    { nombre: 'la ventana abre SIEMPRE con el campo', de: "      const escribir = modo === 'lote' && !conStock", a: "      const escribir = modo === 'lote'" },
    { nombre: 'el campo no se ofrece: sin data-lote-manual', de: 'id="pr-lote-panel-escribir" data-lote-manual="${esc(it.ingrediente_id)}"', a: 'id="pr-lote-panel-escribir"' },
    { nombre: '"Usar este lote" vacío pone un lote vacío', de: "      if (!texto) { pl.errorEscribir = 'Escribí el lote.'; pintarPanelLote(); enfocarEscribir(); return }\n", a: '' },
    { nombre: '"Usar este lote" no recorta los bordes', de: "      const texto = String(pl.texto ?? '').trim()", a: "      const texto = String(pl.texto ?? '')" },
    { nombre: '"Usar este lote" no cierra', de: "      guardarBorradorMasa(b)\n      pintarReceta()\n      cerrarPanelLote()\n    }\n\n    function enfocarEscribir", a: "      guardarBorradorMasa(b)\n      pintarReceta()\n    }\n\n    function enfocarEscribir" },
    { nombre: '"Usar este lote" no lo marca como escrito a mano', de: "      b.lotes[pl.ingredienteId] = { insumo_id: insId, lote: texto, manual: true, sinLote: false }", a: "      b.lotes[pl.ingredienteId] = { insumo_id: insId, lote: texto, manual: false, sinLote: false }" },
    { nombre: 'el insumo elegido para escribir no se respeta', de: "      if (hay(pl?.insumoEscribir)) return pl.insumoEscribir\n", a: '' },
    { nombre: 'tocar el link no abre el campo', de: "        if (ev.target.closest('[data-lote-escribir]')) { abrirEscribirLote(); return }", a: "        if (ev.target.closest('[data-lote-escribir]')) { return }" },
    { nombre: 'la opción a mano de la lista cierra en vez de abrir el campo', de: "      if (o.manual) { abrirEscribirLote(o.insumo_id); return }\n", a: '' },
    { nombre: 'el link queda ABAJO de la lista', de: '          <div class="pr-lp__otros" id="pr-lote-panel-otros"></div>\n          <div class="pr-lp__tarjetas" id="pr-lote-panel-tarjetas"></div>', a: '          <div class="pr-lp__tarjetas" id="pr-lote-panel-tarjetas"></div>\n          <div class="pr-lp__otros" id="pr-lote-panel-otros"></div>' },
    { nombre: 'el lote se ve dos veces en el renglón', de: '<span class="pr-rec__lote-texto">${esc(texto)}</span>${nota}</button>', a: '<span class="pr-rec__lote-texto">${esc(texto)}</span>${nota}</button><span>${esc(texto)}</span>' },
    { nombre: 'las fechas no se leen', de: '      await leerStockMasa()\n', a: '' },
    { nombre: 'la lectura del stock que falla rompe la masa', de: "        console.error('stock para la masa:', err)\n        estado.stockMasa = null", a: '        throw err' },
    { nombre: 'la lectura del stock que falla no avisa', de: '        estado.stockMasaError = true\n', a: '' },
  ],
})
