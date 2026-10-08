// Mutaciones de test-produccion-masas-compactas.js (la lista de masas
// compacta, 08/10/2026): planta y gestión. Ver mutar.js y mutar-produccion.js.
//
//   node pruebas/mut-produccion-masas-compactas.js

const path = require('path')
const { correrMutacionesProduccion } = require('./mutar-produccion')

correrMutacionesProduccion({
  suite: path.join(__dirname, 'test-produccion-masas-compactas.js'),
  escape: 'esc',
  funciones: ['htmlRenglonMasa', 'htmlMasaReceta', 'htmlFilaMasaTurno', 'htmlCuerpoMasa', 'htmlMasaHistorial', 'htmlFormulaMasa'],
  soloPlanta: ['htmlRenglonMasa'],
  equivalentes: [
    { expr: "esc(horaArgentina(m?.hora) || '—')", motivo: 'una hora HH:MM formateada por Intl, o una raya' },
    { expr: "esc(cuandoMasa(m) || '—')", motivo: 'fechaCorta() y horaArgentina() (Intl), o una raya' },
  ],
  manuales: [
    // El renglón.
    { nombre: 'una "anterior" se dice Anterior', de: "      return m?.origen === 'modificada' ? 'Modificada' : 'Original'\n    }\n\n    function htmlOrigenMasa", a: "      return m?.origen === 'modificada' ? 'Modificada' : (m?.origen === 'anterior' ? 'Anterior' : 'Original')\n    }\n\n    function htmlOrigenMasa" },
    { nombre: 'la modificada no va en bordó', de: "<span class=\"pr-mc__origen${m?.origen === 'modificada' ? ' pr-mc__origen--modificada' : ''}\">", a: '<span class="pr-mc__origen">' },
    { nombre: 'la anulada no lo dice', de: "      if (m?.anulada) return '<span class=\"pr-rm__anulada\">Anulada</span>'\n", a: '' },
    { nombre: 'la tirada no lo dice', de: "      if (esTirada(m)) return '<span class=\"pr-tirada\">Tirada</span>'\n", a: '' },
    { nombre: 'sin el chip de chocolate', de: "      return m?.es_chocolate ? '<span class=\"pr-chip-choco\">Chocolate</span>' : ''", a: "      return ''" },
    { nombre: 'sin el tamaño', de: "        `<span class=\"pr-mc__tam\">${m?.doble ? 'Doble' : 'Simple'}</span>` +", a: '' },
    { nombre: 'sin el origen', de: '        htmlOrigenMasa(m) +\n', a: '' },
    { nombre: 'la fórmula vuelve a la lista de la receta', de: "        htmlRenglonMasa(m) + '</button>'\n    }\n\n    function htmlMasaRecetaPendiente", a: "        htmlRenglonMasa(m) + htmlCuerpoMasa(m, { items: [] }) + '</button>'\n    }\n\n    function htmlMasaRecetaPendiente" },
    { nombre: 'la lista de la receta no abre la ventana', de: 'class="pr-rm__fila pr-mc${m.anulada ? \' pr-rm__fila--anulada\' : \'\'}${tirada ? \' pr-rm__fila--tirada\' : \'\'}" data-masa-ver="${esc(m.id)}" aria-haspopup="dialog">', a: 'class="pr-rm__fila pr-mc${m.anulada ? \' pr-rm__fila--anulada\' : \'\'}${tirada ? \' pr-rm__fila--tirada\' : \'\'}">' },
    { nombre: 'el historial de la máquina no apunta al detalle', de: ' aria-controls="pr-hm-detalle">`', a: '>`' },
    { nombre: '"Masas del turno": una anulada ofrece Anular', de: "      const estadoHtml = (m.anulada || tirada) ? ''", a: "      const estadoHtml = false ? ''" },
    { nombre: '"Masas del turno": sin la máquina', de: "        `<span class=\"pr-mc__maq\">${esc(nombreDeTurno(m.turno_id))}</span></button>` +", a: "        '</button>' +" },
    { nombre: 'el listener de la receta no abre la ventana', de: "        const ver = ev.target.closest('[data-masa-ver]'); if (ver) { abrirVerMasa(ver.dataset.masaVer); return }\n", a: '' },
    { nombre: 'el listener de "Masas del turno" no abre la ventana', de: "        const ver = ev.target.closest('[data-masa-ver]'); if (ver) abrirVerMasa(ver.dataset.masaVer)\n", a: '' },
    // El detalle.
    { nombre: 'cuándo sin la fecha', de: '      return [fechaCorta(m?.hora), horaArgentina(m?.hora)].filter(Boolean).join', a: '      return [horaArgentina(m?.hora)].filter(Boolean).join' },
    { nombre: 'no dice quién la cargó', de: "      return (estado.personal ?? []).find(x => x.id === m?.masero_id)?.nombre ?? ''", a: "      return ''" },
    { nombre: 'el detalle sin el motivo', de: "quien ? `la cargó ${esc(quien)}` : '', m.motivo ? `“${esc(m.motivo)}”` : ''", a: "quien ? `la cargó ${esc(quien)}` : ''" },
    { nombre: 'no dice por qué se anuló', de: '      if (m.anulada && m.anulada_motivo) html += `<p class="pr-hm__motivo"><span class="pr-hm__rotulo">Se anuló:', a: '      if (false) html += `<p class="pr-hm__motivo"><span class="pr-hm__rotulo">Se anuló:' },
    { nombre: 'no dice por qué se tiró', de: '      if (!m.anulada && esTirada(m)) html += `<p class="pr-hm__motivo"><span class="pr-hm__rotulo">Se tiró:', a: '      if (false) html += `<p class="pr-hm__motivo"><span class="pr-hm__rotulo">Se tiró:' },
    { nombre: 'un error de lectura dice "Cargando…"', de: "      if (d && d.error) html += '<p class=\"pr-aviso pr-aviso--grave\">No se pudo leer el detalle de esta masa.</p>'\n      else if (!d || d.items == null) html += '<p class=\"pr-texto-suave\">Cargando…</p>'\n      else html += htmlIngredientesHist(d, m)\n      return html", a: "      if (!d || d.items == null || d.error) html += '<p class=\"pr-texto-suave\">Cargando…</p>'\n      else html += htmlIngredientesHist(d, m)\n      return html" },
    { nombre: 'leerDetalleMasa lee otra masa', de: "          .eq('masa_id', m.id),", a: "          .eq('masa_id', 'otra'),", },
    { nombre: 'leerDetalleMasa sin la receta', de: "          ? supabase.from('receta_items').select('ingrediente_id, cantidad_kg').eq('receta_id', m.receta_id)\n          : Promise.resolve({ data: null, error: null }),\n      ])\n      if (it.error) throw it.error", a: "          ? Promise.resolve({ data: null, error: null })\n          : Promise.resolve({ data: null, error: null }),\n      ])\n      if (it.error) throw it.error" },
    { nombre: 'leerDetalleMasa se traga el error', de: '      if (it.error) throw it.error\n      if (rec.error) throw rec.error\n      return {', a: '      return {' },
    // La ventana.
    { nombre: 'la ventana no se muestra', de: "      document.getElementById('pr-masa-ventana').hidden = false\n", a: '' },
    { nombre: 'el foco no va a cerrar', de: "      document.getElementById('pr-masa-ventana-cerrar').focus()\n", a: '' },
    { nombre: 'una respuesta vieja pisa la ventana', de: "        if (pedido !== estado.pedidoVerMasa || estado.verMasa?.masaId !== masaId) return\n        estado.verMasa.detalle.items", a: '        estado.verMasa.detalle.items' },
    { nombre: 'un error de lectura no se marca', de: "        console.error('detalle de la masa:', err)\n        estado.verMasa.detalle.error = true", a: "        console.error('detalle de la masa:', err)" },
    { nombre: 'la ventana busca solo en la receta', de: '      return [...(estado.masasReceta ?? []), ...(estado.masasTurno ?? [])].find(', a: '      return [...(estado.masasReceta ?? [])].find(' },
    { nombre: 'la ventana sin la máquina', de: "      document.getElementById('pr-masa-ventana-sub').textContent = maq === '—' ? '' : maq", a: "      document.getElementById('pr-masa-ventana-sub').textContent = ''" },
    { nombre: 'el título sin el tamaño', de: "textContent = `Masa ${m.nro ?? '—'} · ${m.doble ? 'Doble' : 'Simple'}`", a: "textContent = `Masa ${m.nro ?? '—'}`" },
    { nombre: 'cerrar no esconde la ventana', de: "      estado.verMasa = null\n      document.getElementById('pr-masa-ventana').hidden = true\n      if (!v || !devolverFoco) return", a: "      estado.verMasa = null\n      if (!v || !devolverFoco) return" },
    { nombre: 'el foco no vuelve al renglón', de: '      if (el) el.focus()\n    }\n\n    function teclaVerMasa', a: '    }\n\n    function teclaVerMasa' },
    { nombre: 'Escape no cierra', de: "      if (ev.key === 'Escape') { ev.preventDefault(); cerrarVerMasa(); return }\n      if (ev.key !== 'Tab') return\n      const focos = [...document.getElementById('pr-masa-ventana')", a: "      if (ev.key !== 'Tab') return\n      const focos = [...document.getElementById('pr-masa-ventana')" },
    { nombre: 'Tab se sale de la ventana', de: "      else if (!ev.shiftKey && i === focos.length - 1) { ev.preventDefault(); focos[0].focus() }\n    }\n\n    // \"Sacar al masero\"", a: "    }\n\n    // \"Sacar al masero\"" },
    { nombre: 'irse a otra pantalla deja la ventana abierta', de: '      if (estado.verMasa && id !== estado.vista) cerrarVerMasa({ devolverFoco: false })\n', a: '' },
    { nombre: 'el atrás no cierra la ventana', de: "      if (estado.verMasa) { cerrarVerMasa(); return 'ventana' }\n", a: '' },
    // La gestión.
    { nombre: 'gestión: una "anterior" dice Anterior', de: "      return m?.origen === 'modificada' ? 'Modificada' : 'Original'\n    }\n\n    // La fórmula", a: "      return m?.origen === 'modificada' ? 'Modificada' : (m?.origen === 'anterior' ? 'Anterior' : 'Original')\n    }\n\n    // La fórmula" },
    { nombre: 'gestión: la fórmula vuelve debajo de cada masa', de: '      let det = \'\'\n      if (abierta) {', a: '      let det = \'\'\n      if (true) {' },
    { nombre: 'gestión: sin aria-expanded', de: 'data-masa-hist="${esc(m.id)}" aria-expanded="${abierta ? \'true\' : \'false\'}"', a: 'data-masa-hist="${esc(m.id)}"' },
    { nombre: 'gestión: sin aria-controls', de: "${abierta ? ` aria-controls=\"${esc(idDet)}\"` : ''}>`", a: '>`' },
    { nombre: 'gestión: la modificada no va en bordó', de: "<span class=\"pg-masa__origen${m.origen === 'modificada' ? ' pg-masa__origen--modificada' : ''}\">", a: '<span class="pg-masa__origen">' },
    { nombre: 'gestión: sin el tamaño', de: "        `<span class=\"pg-masa__tam\">${m.doble ? 'Doble' : 'Simple'}</span>${marca}` +", a: '        `${marca}` +' },
    { nombre: 'gestión: la anulada no lo dice', de: "      const marca = m.anulada ? '<span class=\"pg-masa__marca\">Anulada</span>'", a: "      const marca = m.anulada ? ''" },
    { nombre: 'gestión: la tirada no se tacha', de: "${tirada ? ' pg-masa--tirada' : ''}\">${renglon}${det}</li>`", a: '">${renglon}${det}</li>`' },
    { nombre: 'gestión: no dice quién', de: '<p>La cargó <strong>${esc(d.nombres.get(m.masero_id) ?? \'—\')}</strong>', a: '<p>La cargó <strong>—</strong>' },
    { nombre: 'gestión: sin la fecha', de: '        const cuando = [fechaCorta(m.hora), horaArgentina(m.hora)].filter(Boolean)', a: '        const cuando = [horaArgentina(m.hora)].filter(Boolean)' },
    { nombre: 'gestión: sin la diferencia', de: '            : `<p>${esc(textoDiferencias(diferenciaDeMasa(m, d)))}</p>`) +', a: "            : '') +" },
    { nombre: 'gestión: sin la fórmula', de: "          htmlFormulaMasa(m, d) + '</div>'", a: "          '</div>'" },
    { nombre: 'gestión: la fórmula con lo que va en 0', de: '      const suyos = d.items.filter(i => i.masa_id === m.id && Number(i.cantidad_kg) > 0).sort(', a: '      const suyos = d.items.filter(i => i.masa_id === m.id).sort(' },
    { nombre: 'gestión: la fórmula sin orden', de: '.sort((a, z) => orden(a) - orden(z))\n      if (!suyos.length)', a: '\n      if (!suyos.length)' },
    { nombre: 'gestión: sin la marca', de: "        const marca = ins ? (ins.marca || ins.nombre || '') : (i.insumo_id ? 'Insumo'", a: "        const marca = ins ? '' : (i.insumo_id ? 'Insumo'" },
    { nombre: 'gestión: sin el lote fuera de stock', de: "${i.lote_fuera_de_stock ? ' · fuera de stock' : ''}", a: '' },
    { nombre: 'gestión: sin insumo dice "sin lote"', de: ": (i.insumo_id ? 'sin lote' : 'no lleva lote')", a: ": 'sin lote'" },
    { nombre: 'gestión: alternar no cierra la abierta', de: '      estado.masaHistAbierta = estado.masaHistAbierta === masaId ? null : masaId', a: '      estado.masaHistAbierta = masaId' },
    { nombre: 'gestión: alternar abre una que no está', de: "      if (!(estado.detalleHistorial?.masas ?? []).some(m => m.id === masaId)) return false\n", a: '' },
    { nombre: 'gestión: el listener no alterna', de: "        const mh = ev.target.closest('[data-masa-hist]'); if (mh) return alternarMasaHistorial(mh.dataset.masaHist)\n", a: '' },
  ],
})
