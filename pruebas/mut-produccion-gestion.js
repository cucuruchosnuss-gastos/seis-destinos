// Mutaciones de test-produccion-gestion.js (los indicadores de la gestión,
// con el diseño "Producción · Gestión" del 26/09/2026). Ver mutar.js y
// mutar-produccion.js.
//
//   node pruebas/mut-produccion-gestion.js
//
// UN RUNNER POR VEZ: dos corridas en paralelo se pisan el mut-tmp-*.html.

const path = require('path')
const { correrMutacionesProduccion } = require('./mutar-produccion')

correrMutacionesProduccion({
  suite: path.join(__dirname, 'test-produccion-gestion.js'),
  escape: 'esc',
  funciones: ['renderAhora', 'renderHoy', 'renderSemana', 'renderRendimiento', 'renderScrap', 'renderPendientes',
    'htmlTarjetaIndicador', 'htmlFallaInd', 'htmlSinDatosInd', 'htmlDiferenciaInd', 'pintarSelectorGestion'],
  soloGestion: ['renderAhora'],
  equivalentes: [
    { expr: 'esc(t.id)', motivo: 'el id de la tarjeta es una constante del código (TARJETAS_INDICADORES)' },
    { expr: 'esc(t.titulo)', motivo: 'el título de la tarjeta es una constante del código' },
    { expr: 'esc(ctx)', motivo: 'el contexto lo arma el código con números y palabras fijas' },
    { expr: 'esc(textoMasas)', motivo: 'un número formateado y la palabra "masa(s)"' },
    { expr: 'esc(textoCajas)', motivo: 'un número formateado y la palabra "caja(s)"' },
    { expr: 'esc(hace)', motivo: 'minutos y horas formateados por el código' },
    { expr: "esc(horaArgentina(p.desde) || '—')", motivo: 'una hora HH:MM de Intl, o una raya' },
    { expr: 'esc(que)', motivo: 'texto constante del código' },
    { expr: 'esc(contexto)', motivo: 'texto constante del código' },
    { expr: 'esc(dif.texto)', motivo: 'un número formateado con su flecha, o una raya' },
    { expr: 'esc(enteroInd(totalHoy))', motivo: 'un número formateado' },
    { expr: 'esc(enteroInd(f.hoy))', motivo: 'un número formateado' },
    { expr: 'esc(enteroInd(s.cajas))', motivo: 'un número formateado' },
    { expr: 'esc(enteroInd(s.unidades))', motivo: 'un número formateado' },
    { expr: 'esc(rotulo)', motivo: 'texto constante del código' },
    { expr: 'esc(valor)', motivo: 'números formateados por formatearNumeroAr, horas y minutos, o una raya' },
    { expr: 'esc(promedio)', motivo: 'un número formateado con "u/kg", o una raya' },
    { expr: 'esc(formatearNumeroAr(Math.abs(numeroInd(f.diferencia_pct)), { decimales: 1 }))', motivo: 'un número formateado' },
    { expr: 'esc(formatearNumeroAr(v, { decimales: 1, minimos: 0 }))', motivo: 'un número formateado' },
    { expr: 'esc(enteroInd(n))', motivo: 'un número formateado' },
    { expr: 'esc(largo)', motivo: 'texto constante del código' },
    { expr: 'esc(corto)', motivo: 'texto constante del código' },
    { expr: 'esc(hora)', motivo: 'una hora HH:MM de Intl' },
  ],
  manuales: [
    // Nunca un cero de un null
    { nombre: 'un null pasa a ser 0', de: "      if (v === null || v === undefined || v === '') return null\n      const n = Number(v)", a: '      const n = Number(v)' },
    { nombre: 'la diferencia con un dato que falta se calcula igual', de: "      if (a === null || b === null) return { texto: '—', clase: '' }\n", a: '' },
    { nombre: 'la diferencia negativa pierde el signo', de: "${d > 0 ? '▲ +' : '▼ −'}", a: "${d > 0 ? '▲ +' : '▼ '}" },
    { nombre: 'la diferencia sin flecha (solo color)', de: "${d > 0 ? '▲ +' : '▼ −'}", a: "${d > 0 ? '+' : '−'}" },
    { nombre: 'el igual no dice "= 0"', de: "if (d === 0) return { texto: '= 0', clase: 'pr-ind-igual' }", a: "if (d === 0) return { texto: '0', clase: '' }" },
    { nombre: 'los minutos de parada sin horas', de: '      return `${Math.floor(t / 60)} h ${t % 60} min`', a: '      return `${t} min`' },
    { nombre: 'el scrap no se pasa a porcentaje', de: '(s / m) * 100', a: '(s / m)' },
    { nombre: 'la masa en 0 se divide igual', de: "      if (s === null || m === null || m <= 0) return '—'", a: "      if (s === null || m === null) return '—'" },
    // Hoy: un null de la suma es "no salió"; un texto raro, "no se sabe"
    { nombre: 'un null de cajas_por_producto es "no se sabe"', de: '      if (v === null || v === undefined) return 0\n', a: '' },
    { nombre: 'un texto raro en las cajas cuenta como cero', de: '      if (v === null || v === undefined) return 0\n      return numeroInd(v)', a: '      return numeroInd(v) ?? 0' },
    { nombre: 'la suma ignora un dato raro', de: '      for (const v of valores) { if (v === null) return null; t += v }', a: '      for (const v of valores) { t += v ?? 0 }' },
    { nombre: 'hoy no salió muestra un 0', de: "`<span class=\"pg-prod__cajas\">${f.salio ? `${esc(enteroInd(f.hoy))}<span class=\"pg-prod__u\"> cajas</span>` : '—'}</span>`", a: "`<span class=\"pg-prod__cajas\">${esc(enteroInd(f.hoy))}<span class=\"pg-prod__u\"> cajas</span></span>`" },
    { nombre: 'sin producción no se dice', de: "      if (!filas.some(f => f.salio)) {", a: '      if (false) {' },
    { nombre: 'el día pasado de otra semana', de: "          ? `El ${dia} pasado salieron", a: "          ? `El día anterior salieron" },
    { nombre: 'el contexto de hoy sin el día', de: "      return dia ? `vs. ${dia} pasado` : ''", a: "      return 'vs. la semana pasada'" },
    // Semana
    { nombre: 'semana sin turnos dibuja ceros', de: "      if (numeroInd(s.turnos) === 0) return htmlSinDatosInd('Sin producción esta semana'", a: "      if (false) return htmlSinDatosInd('Sin producción esta semana'" },
    { nombre: 'el motivo más común no se dice', de: "s.motivo_parada_mas_comun ? `más común: ${s.motivo_parada_mas_comun}` : 'sin un motivo que se repita'", a: "'sin un motivo que se repita'" },
    { nombre: 'las masas sin modificadas ni chocolate', de: "renglon('Masas', enteroInd(s.masas), notaMasas)", a: "renglon('Masas', enteroInd(s.masas), '')" },
    // Rendimiento: la regla del 10 % (decisión de Facu)
    { nombre: 'el umbral pasa a −9', de: '    const UMBRAL_RINDE_POCO = -10', a: '    const UMBRAL_RINDE_POCO = -9' },
    { nombre: 'el umbral pasa a −11', de: '    const UMBRAL_RINDE_POCO = -10', a: '    const UMBRAL_RINDE_POCO = -11' },
    { nombre: 'el −10 justo rinde poco (no estricto)', de: '      return dif !== null && dif < UMBRAL_RINDE_POCO', a: '      return dif !== null && dif <= UMBRAL_RINDE_POCO' },
    { nombre: 'un null rinde poco', de: '      return dif !== null && dif < UMBRAL_RINDE_POCO', a: '      return (dif ?? -100) < UMBRAL_RINDE_POCO' },
    { nombre: 'rinde poco con un número fijo y no contra su producto', de: '      return dif !== null && dif < UMBRAL_RINDE_POCO', a: '      return numeroInd(f?.unidades_por_kg) !== null && numeroInd(f?.unidades_por_kg) < 250' },
    { nombre: 'el rendimiento del mejor al peor', de: '          return x - y', a: '          return y - x' },
    { nombre: 'los sin dato van primero', de: '          if (x === null) return 1\n', a: '          if (x === null) return -1\n' },
    { nombre: 'no se agrupa por producto', de: "        const k = f?.producto ?? '—'", a: "        const k = 'todos'" },
    { nombre: 'el bajo no va en bordó', de: "const clase = bajo ? 'bajo' : (v !== null && v === mejor ? 'mejor' : 'medio')", a: "const clase = v !== null && v === mejor ? 'mejor' : 'medio'" },
    { nombre: 'con un solo lote se marca un mejor', de: '        const mejor = valores.length >= 2 ? max : null', a: '        const mejor = max' },
    { nombre: 'la barra sin proporción', de: '            const ancho = v !== null && max > 0 ? Math.max(2, Math.round((v / max) * 100)) : 0', a: '            const ancho = v !== null ? 100 : 0' },
    { nombre: 'la frase del bordó no se dice', de: '            const fraseRinde = bajo\n', a: '            const fraseRinde = false\n' },
    { nombre: 'el promedio del producto no se dice', de: '<span class="pg-rend__prom">promedio ${esc(promedio)}</span>', a: '<span class="pg-rend__prom"></span>' },
    // Scrap
    { nombre: 'el scrap sin dato es 0 %', de: "`<span class=\"pg-rend__valor\">${v === null ? '—' : `${esc(formatearNumeroAr(v, { decimales: 1, minimos: 0 }))} %`}</span></li>`", a: "`<span class=\"pg-rend__valor\">${esc(formatearNumeroAr(v ?? 0, { decimales: 1, minimos: 0 }))} %</span></li>`" },
    { nombre: 'scrap malformado no se detecta', de: '      const lista = d?.scrap_por_lote\n      if (!Array.isArray(lista)) return null', a: '      const lista = d?.scrap_por_lote ?? []' },
    // Pendientes
    { nombre: 'todo en cero no dice "Nada pendiente"', de: '      if (turnos === 0 && planillas === 0 && conos === 0) {', a: '      if (false) {' },
    { nombre: 'un pendiente null cuenta como nada', de: "        if (n === null) return `<div class=\"pg-pend pg-pend--nose\">${cuerpoPend(null, largo, corto)}</div>`\n", a: "        if (n === null) return ''\n" },
    { nombre: 'el turno de otro día no es grave', de: "turnos === 1 ? 'turno de otro día' : 'turnos de otro día', true)", a: "turnos === 1 ? 'turno de otro día' : 'turnos de otro día', false)" },
    { nombre: 'el botón de conos sin configurar', de: "        if (tieneTarea('configurar')) return boton(conos, 'conos'", a: "        if (true) return boton(conos, 'conos'" },
    // Cada tarjeta independiente
    { nombre: 'un render que tira rompe todo', de: "        try { cuerpo = t.render(datos); ctx = t.contexto ? t.contexto(datos) : '' } catch (err) { console.error(`indicador ${t.id}:`, err); cuerpo = null }", a: "        cuerpo = t.render(datos); ctx = t.contexto ? t.contexto(datos) : ''" },
    { nombre: 'un bloque mal no dice que no se pudo cargar', de: "        if (cuerpo == null) cuerpo = htmlFallaInd('Esta tarjeta no se pudo cargar. Las demás están bien.', 'Vino un dato que la pantalla no entiende.')", a: "        if (cuerpo == null) cuerpo = ''" },
    { nombre: 'el error de la RPC sin Reintentar', de: '`<button type="button" class="pr-btn pr-btn--secundario" data-ind-reintentar="1">Reintentar</button></div></div>`', a: '`</div></div>`' },
    { nombre: 'Reintentar no vuelve a pedir', de: "if (ev.target.closest('[data-ind-reintentar]')) return cargarIndicadores()", a: "if (ev.target.closest('[data-ind-reintentar]')) return null" },
    { nombre: 'ahora malformado no se detecta', de: '      const lista = d?.ahora\n      if (!Array.isArray(lista)) return null', a: '      const lista = d?.ahora' },
    { nombre: 'semana null no se detecta', de: "      if (!s || typeof s !== 'object' || Array.isArray(s)) return null", a: '      if (!s) return null' },
    { nombre: 'el error de la RPC se ignora', de: '        if (e) throw e\n        datos = data', a: '        datos = data' },
    { nombre: 'la respuesta vieja pisa a la nueva', de: '      if (turno !== turnoIndicadores) return\n', a: '' },
    { nombre: 'sin unidad se pide igual', de: "      if (!estado.unidadId) { cont.innerHTML = ''; return }\n", a: '' },
    // El orden de las tarjetas (el del celular)
    { nombre: 'pendientes va al final', de: "      { id: 'pendientes', titulo: 'Pendientes', render: renderPendientes },\n", a: '', archivo: 'gestion' },
    { nombre: 'semana antes que pendientes', de: "      { id: 'pendientes', titulo: 'Pendientes', render: renderPendientes },\n      { id: 'semana', titulo: 'Semana', render: renderSemana, contexto: contextoSemana },", a: "      { id: 'semana', titulo: 'Semana', render: renderSemana, contexto: contextoSemana },\n      { id: 'pendientes', titulo: 'Pendientes', render: renderPendientes }," },
    { nombre: 'sin la tarjeta de scrap', de: "      { id: 'scrap', titulo: 'Scrap por lote de harina', render: renderScrap, contexto: () => '% de la masa · 30 días' },\n", a: '' },
    // Ahora
    { nombre: 'las paradas no van primero', de: '      const orden = [...lista.filter(tieneParadaInd), ...lista.filter(m => !tieneParadaInd(m))]', a: '      const orden = lista' },
    { nombre: 'la parada no se marca', de: "const clase = p ? 'parada' : (pendiente ? 'pendiente' : 'abierta')", a: "const clase = 'abierta'" },
    { nombre: 'la parada sin el chip PARADA', de: `const chip = p ? '<span class="pg-chip pg-chip--parada">PARADA</span>'`, a: `const chip = p ? ''` },
    { nombre: 'la pendiente de completar no se marca', de: `(pendiente ? '<span class="pr-ind-chip">Pendiente de completar</span>' :`, a: '(false ? 1 :' },
    { nombre: 'la hora de la parada en UTC', de: "horaArgentina(p.desde) || '—'", a: "new Date(p.desde).toISOString().slice(11, 16)" },
    // El día
    { nombre: 'hoy se pide con p_fecha', de: '      if (estado.fechaInd) params.p_fecha = estado.fechaInd', a: '      params.p_fecha = estado.fechaInd ?? hoyArgentina()' },
    { nombre: 'otro día se pide sin p_fecha', de: '      if (estado.fechaInd) params.p_fecha = estado.fechaInd', a: '' },
    { nombre: '› pasa de hoy', de: '      if (nueva > hoy) return false', a: '' },
    { nombre: 'volver a hoy deja la fecha puesta', de: '      estado.fechaInd = nueva === hoy ? null : nueva', a: '      estado.fechaInd = nueva' },
    { nombre: '› prendido en hoy', de: "document.getElementById('pr-ind-dia-despues').disabled = f >= hoy", a: "document.getElementById('pr-ind-dia-despues').disabled = false" },
    // Los números del menú
    { nombre: 'el número de planillas de otra unidad', de: '      const n = i && !i.error && i.unidadId === estado.unidadId ? numeroInd', a: '      const n = i && !i.error ? numeroInd' },
    { nombre: 'el número en cero se muestra', de: '      const ok = Number.isInteger(n) && n > 0', a: '      const ok = Number.isInteger(n)' },
    { nombre: 'sin tope de 99', de: "el.textContent = ok ? (n > 99 ? '99+' : String(n)) : ''", a: "el.textContent = ok ? String(n) : ''" },
    { nombre: 'cambiar de unidad deja el número viejo', de: '      estado.indicadores = null\n      pintarNumerosMenu()\n', a: '' },
    // La unidad
    { nombre: 'el selector se ve con una sola unidad', de: "document.getElementById('pr-gestion-unidad-campo').hidden = unidades.length < 2", a: "document.getElementById('pr-gestion-unidad-campo').hidden = false" },
    { nombre: 'el segmentado no marca la elegida', de: `data-gestion-unidad="\${esc(id)}" aria-pressed="\${id === estado.unidadId ? 'true' : 'false'}"`, a: `data-gestion-unidad="\${esc(id)}" aria-pressed="false"` },
    { nombre: 'el segmentado no elige', de: "const b = ev.target.closest('[data-gestion-unidad]'); if (b) elegirUnidadGestion(b.dataset.gestionUnidad)", a: "const b = ev.target.closest('[data-gestion-unidad]')" },
    { nombre: 'la unidad elegida no se recuerda', de: '      guardarPreferencia(CLAVE_UNIDAD_GESTION, id)\n', a: '' },
    { nombre: 'se elige una unidad ajena', de: '      if (!unidadesDeGestion().includes(id)) return false\n', a: '' },
    { nombre: 'la guardada no se valida', de: '      if (guardada && unidades.includes(guardada)) return guardada', a: '      if (guardada) return guardada' },
    { nombre: 'cambiar de unidad no recarga los indicadores', de: "      if (estado.vista === 'pr-inicio') cargarIndicadores()\n", a: '' },
    { nombre: 'el historial no sigue a la unidad', de: '      if (estado.historial) estado.historial.unidadId = id\n', a: '' },
    { nombre: 'el arranque no lee la guardada', de: 'leerPreferencia(CLAVE_UNIDAD_GESTION))', a: 'null)' },
    { nombre: 'la fábrica de pruebas aparece', de: '      return new Map(sinUnidadesDePrueba(filas ?? [], fabrica).map(u => [u.id, u.nombre]))', a: '      return new Map((filas ?? []).map(u => [u.id, u.nombre]))', archivo: 'gestion' },
    // A dónde llevan los pendientes
    { nombre: 'pendientes sin filtrar', de: "mostrarHistorial({ estado: 'pendiente_completar', desde", a: "mostrarHistorial({ estado: '', desde" },
    { nombre: 'abiertos sin filtrar', de: "mostrarHistorial({ estado: 'abierto', desde", a: "mostrarHistorial({ estado: '', desde" },
    { nombre: 'conos no abre Marcas', de: "if (que === 'conos') return mostrarConfig('marcas')", a: "if (que === 'conos') return mostrarConfig()" },
    // La pantalla
    { nombre: 'los accesos de configuración se ven sin configurar', de: "for (const b of document.querySelectorAll('[data-ir-config]')) b.hidden = !tieneTarea('configurar')", a: "for (const b of document.querySelectorAll('[data-ir-config]')) b.hidden = false" },
    { nombre: 'tamaños de tablet', de: 'body { --pr-alto-boton: 44px; font-size: 15px; }', a: 'body { --pr-alto-boton: 56px; font-size: 18px; }' },
    { nombre: 'sin "‹ Volver"', de: '      <a href="../dashboard.html" class="pr-header__volver" id="pr-gestion-volver" title="Volver al inicio de la app">&lsaquo; Volver</a>\n', a: '' },
    { nombre: 'dos columnas en la compu', de: '.pg-gestion .pr-indicadores { display: grid; gap: 16px; align-items: start; grid-template-columns: repeat(3, minmax(0, 1fr)); }', a: '.pg-gestion .pr-indicadores { display: grid; gap: 16px; align-items: start; grid-template-columns: repeat(2, minmax(0, 1fr)); }' },
  ],
})
