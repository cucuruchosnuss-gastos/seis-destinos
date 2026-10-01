// Mutaciones de test-produccion-tirar.js (tirar una masa: se hizo y se tiró,
// lo que se usó queda descontado; 30/09/2026). Ver mutar.js y
// mutar-produccion.js: cada mutación va al archivo donde está su código.
//
//   node pruebas/mut-produccion-tirar.js
//
// UN RUNNER POR VEZ: dos corridas en paralelo se pisan el mut-tmp-*.html.

const path = require('path')
const { correrMutacionesProduccion } = require('./mutar-produccion')

correrMutacionesProduccion({
  suite: path.join(__dirname, 'test-produccion-tirar.js'),
  escape: 'esc',
  funciones: ['htmlTirada', 'htmlTirarUltima', 'renderTiradas'],
  soloGestion: ['renderTiradas'],
  equivalentes: [
    { expr: "esc(horaArgentina(m.hora) || '—')", motivo: 'horaArgentina devuelve "HH:MM" (dígitos y dos puntos) o vacío, y el respaldo es "—": ningún carácter escapable' },
  ],
  manuales: [
    // Las lecturas
    { nombre: 'la sala no lee si la masa se tiró', de: "anulada, anulada_motivo, descartada, descarte_motivo, masero_id, motivo, receta_id'", a: "anulada, anulada_motivo, masero_id, motivo, receta_id'" },
    { nombre: 'el tablero no lee descartada', de: "select('turno_id, hora, descartada')", a: "select('turno_id, hora')" },
    { nombre: 'la planilla no lee descartada', de: "es_chocolate, masero_id, descartada, descarte_motivo').eq('turno_id', turnoId)", a: "es_chocolate, masero_id').eq('turno_id', turnoId)" },
    // esTirada / la última
    { nombre: 'esTirada acepta cualquier cosa "verdadera"', de: '      return m?.descartada === true\n', a: '      return !!m?.descartada\n' },
    { nombre: 'la última anulable no saltea la tirada', de: 'const vivas = (masas ?? []).filter(m => !m.anulada && !esTirada(m))', a: 'const vivas = (masas ?? []).filter(m => !m.anulada)' },
    // La fila
    { nombre: 'la fila tirada sin su clase', de: "${tirada ? ' pr-rm__fila--tirada' : ''}\">` +\n        `<span class=\"pr-rm__nro\">", a: "\">` +\n        `<span class=\"pr-rm__nro\">" },
    { nombre: 'la fila tirada sigue con sus chips y sin "Tirada"', de: "(tirada ? htmlTirada(m) : chipsDeMasa(m))}</span></div>`", a: "chipsDeMasa(m)}</span></div>`" },
    { nombre: 'la tirada se considera aunque esté anulada', de: '    function htmlMasaReceta(m) {\n      const tirada = !m.anulada && esTirada(m)', a: '    function htmlMasaReceta(m) {\n      const tirada = esTirada(m)' },
    { nombre: 'htmlTirada sin el motivo', de: "Tirada${m?.descarte_motivo ? `: <span class=\"pr-tirada__motivo\">${esc(m.descarte_motivo)}</span>` : ''}", a: 'Tirada' },
    { nombre: 'el CSS tacha la fila entera (también "Tirada")', de: '.pr-rm__fila--tirada .pr-rm__nro, .pr-rm__fila--tirada .pr-rm__det { text-decoration: line-through;', a: '.pr-rm__fila--tirada { text-decoration: line-through;' },
    { nombre: 'el botón de tirar no va en bordó', de: '.pr-btn--tirar { background: #fff; border-color: var(--p-mal); color: var(--p-mal-txt);', a: '.pr-btn--tirar { background: #fff;' },
    // La columna
    { nombre: 'la cuenta suma las tiradas', de: 'const cuantas = (estado.masasReceta ?? []).filter(m => !m.anulada && !esTirada(m)).length', a: 'const cuantas = (estado.masasReceta ?? []).filter(m => !m.anulada).length' },
    { nombre: 'no aparece "Tirar la última masa"', de: "            '<button type=\"button\" class=\"pr-btn pr-btn--tirar pr-rm__anular-btn\" data-tirar-ultima=\"1\">Tirar la última masa</button></div>'", a: "            '</div>'" },
    { nombre: 'el panel de tirar no se abre', de: "else if (estado.tirarUltima && estado.tirarUltima.masaId === ultima.id) pie = htmlTirarUltima(ultima)", a: 'else if (false) pie = htmlTirarUltima(ultima)' },
    { nombre: 'el panel no dice qué pasa con el stock', de: '<strong>La masa se tira: lo que se usó queda descontado del stock.</strong> ', a: '' },
    { nombre: 'el panel sin ejemplos', de: "        '<p class=\"pr-rm__tirar-ejemplos\">Por ejemplo: “se puso el triple de azúcar”, “se cortó la luz”.</p>' +\n", a: '' },
    { nombre: 'el campo del motivo se autocompleta', de: 'id="pr-rm-tirar-motivo" class="pr-input" maxlength="300" autocomplete="off"', a: 'id="pr-rm-tirar-motivo" class="pr-input" maxlength="300"' },
    { nombre: 'el motivo no se repinta', de: "if (inputTirar) inputTirar.value = estado.tirarUltima?.motivo ?? ''", a: 'if (inputTirar) inputTirar.value = ""' },
    { nombre: 'mientras se tira el centro no se atenúa', de: "!!estado.anularUltima || !!estado.tirarUltima)", a: '!!estado.anularUltima)' },
    // Pedir / cancelar / confirmar
    { nombre: 'pedir tirar no cierra el de anular', de: '      tocar()\n      estado.anularUltima = null\n      estado.tirarUltima = { masaId: ultima.id', a: '      tocar()\n      estado.tirarUltima = { masaId: ultima.id' },
    { nombre: 'pedir anular no cierra el de tirar', de: '      tocar()\n      estado.tirarUltima = null\n      estado.anularUltima = {', a: '      tocar()\n      estado.anularUltima = {' },
    { nombre: 'cancelar no cierra el panel', de: '    function cancelarTirarUltima() {\n      estado.tirarUltima = null', a: '    function cancelarTirarUltima() {\n      estado.tirarUltima = estado.tirarUltima' },
    { nombre: 'sin motivo igual se manda', de: "if (!motivo) { t.error = 'Contá por qué se tiró: es obligatorio.'; return pintarMasasReceta() }", a: '' },
    { nombre: 'el doble toque manda dos veces', de: '      const t = estado.tirarUltima\n      if (!t || t.enviando) return', a: '      const t = estado.tirarUltima\n      if (!t) return' },
    { nombre: 'el motivo viaja sin recortar', de: "{ p_masa_id: t.masaId, p_motivo: motivo }", a: "{ p_masa_id: t.masaId, p_motivo: t.motivo }" },
    { nombre: 'se llama a anular en vez de tirar', de: "supabase.rpc('tirar_masa', {", a: "supabase.rpc('anular_masa', {" },
    { nombre: 'el error de la base se tapa con un genérico', de: "t.error = e?.message || 'No se pudo tirar la masa.'", a: "t.error = 'No se pudo tirar la masa.'" },
    { nombre: 'un error de la base se toma como éxito', de: "supabase.rpc('tirar_masa', { p_masa_id: t.masaId, p_motivo: motivo })\n        if (error) throw error", a: "supabase.rpc('tirar_masa', { p_masa_id: t.masaId, p_motivo: motivo })" },
    { nombre: 'después de tirar no se releen las masas', de: "mostrarExito('Masa tirada: lo que se usó queda descontado del stock.')\n        await cargarMasasReceta()", a: "mostrarExito('Masa tirada: lo que se usó queda descontado del stock.')" },
    { nombre: 'el éxito no dice la consecuencia', de: "mostrarExito('Masa tirada: lo que se usó queda descontado del stock.')", a: "mostrarExito('Listo.')" },
    { nombre: 'después de tirar el panel queda abierto', de: "        if (error) throw error\n        estado.tirarUltima = null\n", a: '        if (error) throw error\n' },
    { nombre: 'el botón no se traba mientras manda', de: "      const btn = document.getElementById('pr-rm-tirar-confirmar')\n      if (btn) btn.disabled = true", a: "      const btn = document.getElementById('pr-rm-tirar-confirmar')" },
    // Eventos
    { nombre: 'el botón de tirar no está conectado', de: "if (ev.target.closest('[data-tirar-ultima]')) { pedirTirarUltima(); return }", a: '' },
    { nombre: 'el motivo tipeado no se guarda', de: "if (ev.target.id === 'pr-rm-tirar-motivo' && estado.tirarUltima) estado.tirarUltima.motivo = ev.target.value", a: '' },
    { nombre: 'mostrar la receta no cierra el panel de tirar', de: '      estado.anularUltima = null\n      estado.tirarUltima = null\n', a: '      estado.anularUltima = null\n' },
    // Masas del turno
    { nombre: 'masas del turno: la tirada ofrece "Anular"', de: "        : tirada ? htmlTirada(m)\n", a: '' },
    { nombre: 'masas del turno: la tirada sin su clase', de: "${tirada ? ' pr-masa-fila--tirada' : ''}\">` +", a: '">` +' },
    { nombre: 'pedir anular una tirada abre el diálogo', de: '      if (!m || esTirada(m)) return\n      estado.anulando = masaId', a: '      if (!m) return\n      estado.anulando = masaId' },
    // Historial de la máquina
    { nombre: 'historial: la tirada sin su clase', de: "${tirada ? ' pr-hm__masa--tirada' : ''}\" data-hm-masa", a: '" data-hm-masa' },
    { nombre: 'historial: la tirada con chips y sin "Tirada"', de: "(tirada ? htmlTirada(m) : chipsDeMasa(m))}</span></button>`", a: "chipsDeMasa(m)}</span></button>`" },
    { nombre: 'detalle: sin "Se tiró:"', de: "      if (!m.anulada && esTirada(m)) html += `<p class=\"pr-hm__motivo\"><span class=\"pr-hm__rotulo\">Se tiró:</span> ${esc(m.descarte_motivo || 'sin motivo')} · lo que se usó quedó descontado del stock.</p>`\n", a: '' },
    { nombre: 'historial: la cuenta suma las tiradas', de: 'const vivas = (h.masas ?? []).filter(x => !x.anulada && !esTirada(x)).length', a: 'const vivas = (h.masas ?? []).filter(x => !x.anulada).length' },
    // Tablero, sala y planilla
    { nombre: 'tablero: la cuenta suma las tiradas', de: 'masas: mias.filter(x => !esTirada(x)).length,', a: 'masas: mias.length,' },
    { nombre: 'el número estimado no cuenta las tiradas', de: 'nro: (e.masasHechas ?? e.masas) + 1 }', a: 'nro: e.masas + 1 }' },
    { nombre: 'planilla: la cuenta suma las tiradas', de: '      const lista = todas.filter(m => !esTirada(m))\n', a: '      const lista = todas\n' },
    { nombre: 'planilla: no dice las tiradas aparte', de: "        (tiradas ? ` · ${tiradas === 1 ? '1 tirada' : `${tiradas} tiradas`}` : '')", a: "        ''" },
    { nombre: 'una de chocolate tirada cuenta como chocolate', de: '.some(m => m.es_chocolate && !esTirada(m))', a: '.some(m => m.es_chocolate)' },
    { nombre: 'el cierre cuenta las tiradas', de: 'const masas = (p?.masas ?? []).filter(m => !esTirada(m))', a: 'const masas = p?.masas ?? []' },
    // Anterior
    { nombre: 'Anterior: no dice que se tiró', de: "${anteriorFueTirada(a) ? ' <span class=\"pr-como__choco pr-como__tirada\">· tirada</span>' : ''}", a: '' },
    { nombre: 'Anterior: el title no dice que se tiró', de: '      return partes.join(\' · \') + choco + tirada\n', a: '      return partes.join(\' · \') + choco\n' },
    { nombre: 'anteriorFueTirada mira cualquier masa', de: '.some(m => m.id === a.masa_id && esTirada(m))', a: '.some(m => esTirada(m))' },
    { nombre: 'no se redibujan las opciones al saberlo', de: 'if (anteriorFueTirada(estado.datosMasa?.anterior)) repintarOpcionesReceta()', a: '' },

    // ── LA GESTIÓN ──
    { nombre: 'las tiradas de 7 días y no de 14', de: "const desde = sumarDias(fin, -13), corte = sumarDias(fin, -6)", a: "const desde = sumarDias(fin, -6), corte = sumarDias(fin, -6)" },
    { nombre: 'la semana mal cortada', de: "const desde = sumarDias(fin, -13), corte = sumarDias(fin, -6)", a: "const desde = sumarDias(fin, -13), corte = sumarDias(fin, -7)" },
    { nombre: 'las tiradas de todas las unidades', de: ".select('id, maquina_id, fecha').eq('unidad_negocio_id', unidadId).gte('fecha', desde)", a: ".select('id, maquina_id, fecha').gte('fecha', desde)" },
    { nombre: 'se cuentan también las no tiradas', de: ".in('turno_id', ids).eq('descartada', true).eq('anulada', false)", a: ".in('turno_id', ids).eq('anulada', false)" },
    { nombre: 'los kilos cuentan el agua (sin insumo)', de: "if (!it.insumo_id || !enSemana.has(it.masa_id)) continue", a: "if (!enSemana.has(it.masa_id)) continue" },
    { nombre: 'los kilos cuentan la semana anterior', de: "if (!it.insumo_id || !enSemana.has(it.masa_id)) continue", a: "if (!it.insumo_id) continue" },
    { nombre: 'un error de los renglones se traga', de: "          if (r2.error) throw r2.error\n", a: '' },
    { nombre: 'un error de los turnos se traga', de: "        if (e1) throw e1\n        const ids = (turnos ?? []).map(t => t.id)", a: "        const ids = (turnos ?? []).map(t => t.id)" },
    { nombre: 'el motivo se agrupa distinguiendo mayúsculas', de: ".trim().toLocaleLowerCase('es').replace(/\\s+/g, ' ')", a: '.trim()' },
    { nombre: 'por máquina sin ordenar', de: "return [...mapa.values()].sort((a, z) => z.n - a.n || String(a.nombre).localeCompare(String(z.nombre), 'es'))", a: 'return [...mapa.values()]' },
    { nombre: 'sin tiradas: un cero en vez de la frase', de: "if (d.semana === 0) return htmlSinDatosInd('Ninguna masa tirada'", a: "if (d.semana === -1) return htmlSinDatosInd('Ninguna masa tirada'" },
    { nombre: 'un dato con otra forma no se rechaza', de: "if (!d || typeof d !== 'object' || !Number.isInteger(d.semana)) return null", a: 'if (!d) return null' },
    { nombre: 'sin la diferencia con la semana anterior', de: '<span class="pg-tir__dif">${esc(dif.texto)} contra la semana anterior</span>', a: '' },
    { nombre: 'la tarjeta no está en el arreglo', de: "      { id: 'tiradas', titulo: 'Masas tiradas', render: renderTiradas, contexto: () => '7 días · lo que se usó quedó descontado', propia: true },\n", a: '' },
    { nombre: 'la tarjeta usa los datos de la RPC (no los suyos)', de: "      if (t.propia) {\n        const p = estado.tiradas", a: "      if (false) {\n        const p = estado.tiradas" },
    { nombre: 'la falla de las tiradas dice lo de la RPC', de: "t.propia ? 'No se pudieron leer las masas tiradas.' : 'No se pudieron cargar los indicadores.'", a: "'No se pudieron cargar los indicadores.'" },
    { nombre: 'las tiradas no se guardan al llegar', de: '      const tir = await tiradas\n      if (turno !== turnoIndicadores) return\n      estado.tiradas = tir', a: '      const tir = await tiradas\n      if (turno !== turnoIndicadores) return' },
    { nombre: 'no se pone a cargar antes de pedir', de: '      estado.tiradas = { cargando: true }\n      cont.innerHTML = htmlIndicadores(null, null, true)', a: '      cont.innerHTML = htmlIndicadores(null, null, true)' },
    { nombre: 'historial de la gestión sin "Tirada:"', de: "          : m.descartada === true ? `<br><strong>Tirada:</strong> ${esc(m.descarte_motivo ?? '')} · lo que se usó quedó descontado del stock`\n", a: '' },
    { nombre: 'historial de la gestión: la cuenta suma las tiradas', de: 'const vivas = d.masas.filter(m => !m.anulada && m.descartada !== true).length', a: 'const vivas = d.masas.filter(m => !m.anulada).length' },
    { nombre: 'historial de la gestión no lee descartada', de: "anulada, anulada_motivo, descartada, descarte_motivo, es_chocolate').eq('turno_id', turnoId)", a: "anulada, anulada_motivo, es_chocolate').eq('turno_id', turnoId)" },
  ],
})
