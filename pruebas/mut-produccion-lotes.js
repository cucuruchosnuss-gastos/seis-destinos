// Mutaciones de test-produccion-lotes.js ("terminar la tablet", parte 3). Ver mutar.js.
//
//   node pruebas/mut-produccion-lotes.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-produccion-lotes.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/produccion.html'),
  escape: 'esc',
  funciones: ['htmlTarjetaLote', 'htmlPanelLote', 'htmlCeldaLote'],
  equivalentes: [
    { expr: 'esc(textoCantidad(o.stock))', motivo: 'textoCantidad() de un número finito solo produce dígitos, la coma y "kg"/"g": sin esc() sale idéntico' },
    { expr: 'esc(fecha)', motivo: 'textoFechaLote() solo produce "dd/mm/aaaa" (dígitos y barras) o vacío: sin esc() sale idéntico' },
  ],
  manuales: [
    // b) Una sola opción vacía.
    { nombre: 'vuelven las dos opciones vacías (siempre "Se terminó")', de: "      return e.terminado ? 'Se terminó · elegí otro' : 'Elegí el lote'", a: "      return 'Se terminó · elegí otro'" },
    { nombre: 'nunca dice "Se terminó"', de: "      return e.terminado ? 'Se terminó · elegí otro' : 'Elegí el lote'", a: "      return 'Elegí el lote'" },
    { nombre: 'el terminado no va en bordó', de: "      if (e.terminado) clases.push('pr-rec__lote--terminado')\n      else if (vacio)", a: "      if (vacio)" },
    // c) El lote sin ingreso cargado.
    { nombre: 'vuelve el bug: el lote que no está en stock se da por terminado', de: '      if (!enLista) return { ...base, sinIngreso: true }', a: '      if (!enLista) return { ...base, terminado: true, falta: true }' },
    { nombre: 'sin la nota "sin ingreso cargado"', de: "      const nota = e.sinIngreso ? '<span class=\"pr-rec__lote-nota\">sin ingreso cargado</span>' : ''", a: "      const nota = ''" },
    { nombre: 'el escrito a mano no dice "sin ingreso cargado"', de: "sinIngreso: !!texto && !(ins.lotes ?? []).some(x => x.lote === texto) }", a: 'sinIngreso: false }' },
    { nombre: 'el lote de la anterior no viaja en el payload', de: "        const lote = l && !l.sinLote ? String(l.lote ?? '').trim() : ''", a: "        const lote = l && !l.sinLote && !l.manual && false ? String(l.lote ?? '').trim() : ''" },
    // "Se terminó".
    { nombre: '"Se terminó" no suelta el lote', de: "      b.lotes[ingredienteId] = { insumo_id: '', lote: null, manual: false, sinLote: false, terminado: true }", a: '      void ingredienteId' },
    { nombre: '"Se terminó" no marca terminado', de: "      b.lotes[ingredienteId] = { insumo_id: '', lote: null, manual: false, sinLote: false, terminado: true }", a: "      b.lotes[ingredienteId] = { insumo_id: '', lote: null, manual: false, sinLote: false }" },
    { nombre: 'el terminado no se lee', de: '      if (l && l.terminado) return { ...base, terminado: true, falta: true }\n', a: '' },
    { nombre: 'el terminado no se guarda en el borrador', de: "terminado: true }\n      b.payload = null\n      estado.errorReceta = null\n      guardarBorradorMasa(b)", a: "terminado: true }\n      b.payload = null\n      estado.errorReceta = null" },
    { nombre: 'el panel no ofrece "Se terminó"', de: "      const hayElegido = !e.terminado && !e.falta && !!e.l && !e.l.sinLote", a: '      const hayElegido = false' },
    { nombre: 'el panel ofrece "Se terminó" también terminado', de: "      const hayElegido = !e.terminado && !e.falta && !!e.l && !e.l.sinLote", a: '      const hayElegido = true' },
    // a) El panel.
    { nombre: '"Otro lote" mezclado con las tarjetas', de: '        if (o.manual) {\n          otros.push(', a: '        if (false) {\n          otros.push(' },
    { nombre: 'la tarjeta sin cuánto queda', de: "      const queda = o.stock != null && Number.isFinite(o.stock)", a: '      const queda = false' },
    { nombre: 'la tarjeta sin la marca', de: "      const marca = ins ? (ins.marca || ins.nombre || '') : ''", a: "      const marca = ''" },
    { nombre: 'la tarjeta elegida no se marca', de: '      const elegido = e.terminado ? -1 : indiceLote(e.ops, e.l)\n      const tarjetas', a: '      const elegido = -1\n      const tarjetas' },
    { nombre: 'elegir una tarjeta no cierra', de: "      elegirOpcionLote(pl.ingredienteId, String(indice))\n      cerrarPanelLote(o.manual ? 'manual' : 'renglon')", a: '      elegirOpcionLote(pl.ingredienteId, String(indice))' },
    { nombre: 'elegir una tarjeta no elige', de: "      elegirOpcionLote(pl.ingredienteId, String(indice))\n      cerrarPanelLote(", a: "      cerrarPanelLote(" },
    { nombre: 'Escape no cierra', de: "      if (ev.key === 'Escape') { ev.preventDefault(); cerrarPanelLote(); return }\n", a: '' },
    { nombre: 'el foco no da la vuelta', de: "      const focos = [...panel.querySelectorAll('button:not([disabled])')]\n      if (!focos.length) return\n      const i = focos.indexOf(document.activeElement)\n      if (ev.shiftKey && i <= 0) { ev.preventDefault(); focos[focos.length - 1].focus() }\n", a: "      const focos = [...panel.querySelectorAll('button:not([disabled])')]\n      if (!focos.length) return\n      const i = focos.indexOf(document.activeElement)\n" },
    { nombre: 'el foco no vuelve al renglón', de: '`[data-lote="${pl.ingredienteId}"]`', a: "'body'" },
    { nombre: 'el renglón no abre el panel', de: "const b = ev.target.closest('[data-lote]'); if (b) abrirPanelLote(b.dataset.lote)", a: "const b = ev.target.closest('[data-lote]'); void b" },
    { nombre: 'sin mensaje cuando no hay lotes', de: "'<p class=\"pr-lp__vacio\">No hay lotes con stock cargado de este insumo.</p>'", a: "''" },
    { nombre: 'la etiqueta vuelve a "El lote no está en la lista"', de: "`Otro lote de ${quien}` : 'Otro lote de este insumo',", a: "`Otro lote de ${quien}` : 'El lote no está en la lista'," },
    { nombre: 'tarjetas pegadas', de: '    .pr-lp__tarjetas { display: flex; flex-direction: column; gap: 0.625rem;', a: '    .pr-lp__tarjetas { display: flex; flex-direction: column; gap: 0;' },
    { nombre: 'tarjetas chicas', de: '      min-height: 88px; display: flex; align-items: center; gap: 1rem;', a: '      min-height: 40px; display: flex; align-items: center; gap: 1rem;' },
    { nombre: 'sin scroll interno', de: 'gap: 0.625rem; overflow-y: auto; min-height: 0;', a: 'gap: 0.625rem; min-height: 0;' },
    // La fecha.
    { nombre: 'la fecha se consulta sin stock:ver', de: '      if (puedeVerStockEn(estado.unidadId) !== true) return\n', a: '' },
    { nombre: 'la fecha no toma la más vieja', de: "          if (!m.has(k) || String(r.desde) < String(m.get(k))) m.set(k, r.desde)", a: '          m.set(k, r.desde)' },
    { nombre: 'la fecha no se muestra', de: "        (fecha ? `<span class=\"pr-lp__fecha\">desde ${esc(fecha)}</span>` : '') +", a: '' },
    { nombre: 'las fechas no se leen', de: '      await leerFechasLotes(estado.datosMasa)\n', a: '' },
    { nombre: 'la lectura de fechas que falla rompe la masa', de: "        console.error('fechas de los lotes:', err)\n        estado.lotesDesde = null", a: '        throw err' },
  ],
})
