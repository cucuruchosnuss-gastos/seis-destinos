// Mutaciones de test-produccion-gestion.js (la gestión, parte 2: los
// indicadores y la unidad). Ver mutar.js y mutar-produccion.js.
//
//   node pruebas/mut-produccion-gestion.js
//
// UN RUNNER POR VEZ: dos corridas en paralelo se pisan el mut-tmp-*.html.

const path = require('path')
const { correrMutacionesProduccion } = require('./mutar-produccion')

correrMutacionesProduccion({
  suite: path.join(__dirname, 'test-produccion-gestion.js'),
  escape: 'esc',
  funciones: ['renderAhora', 'renderHoy', 'renderSemana', 'renderRendimiento', 'renderPendientes',
    'htmlTarjetaIndicador', 'htmlDatoInd', 'pintarSelectorGestion'],
  soloGestion: ['renderAhora'],
  equivalentes: [
    { expr: 'esc(t.id)', motivo: 'el id de la tarjeta es una constante del código (TARJETAS_INDICADORES)' },
    { expr: 'esc(t.titulo)', motivo: 'el título de la tarjeta es una constante del código' },
    { expr: 'esc(cuenta)', motivo: 'números formateados por formatearNumeroAr y palabras fijas' },
    { expr: 'esc(enteroInd(f?.hoy))', motivo: 'un número formateado: dígitos y puntos, o una raya' },
    { expr: 'esc(enteroInd(f?.semana_pasada))', motivo: 'un número formateado: dígitos y puntos, o una raya' },
    { expr: 'esc(dif.texto)', motivo: 'un número formateado con su signo, o una raya' },
    { expr: 'esc(enteroInd(f?.unidades))', motivo: 'un número formateado' },
    { expr: "esc(formatearNumeroAr(numeroInd(f?.kg_harina), { decimales: 3, minimos: 0 }))", motivo: 'un número formateado' },
    { expr: "esc(formatearNumeroAr(numeroInd(f?.unidades_por_kg), { decimales: 1 }))", motivo: 'un número formateado' },
    { expr: 'esc(enteroInd(n))', motivo: 'un número formateado' },
    { expr: 'esc(que)', motivo: 'texto constante del código' },
    { expr: "esc(horaArgentina(p.desde) || '—')", motivo: 'una hora HH:MM de Intl, o una raya' },
    { expr: 'esc(duracionTexto(p.desde, null, ahora))', motivo: 'minutos y horas formateados por el código' },
    { expr: 'esc(rotulo)', motivo: 'texto constante del código' },
    { expr: 'esc(valor)', motivo: 'números formateados por formatearNumeroAr, horas y minutos, o una raya' },
  ],
  manuales: [
    // Nunca un cero de un null
    { nombre: 'un null pasa a ser 0', de: "      if (v === null || v === undefined || v === '') return null\n      const n = Number(v)", a: '      const n = Number(v)' },
    { nombre: 'la diferencia con un dato que falta se calcula igual', de: "      if (a === null || b === null) return { texto: '—', clase: '' }\n", a: '' },
    { nombre: 'la diferencia negativa pierde el signo', de: "${d > 0 ? '+' : '−'}", a: "${d > 0 ? '+' : ''}" },
    { nombre: 'los minutos de parada sin horas', de: '      return `${Math.floor(t / 60)} h ${t % 60} min`', a: '      return `${t} min`' },
    { nombre: 'el scrap no se pasa a porcentaje', de: '(s / m) * 100', a: '(s / m)' },
    { nombre: 'la masa en 0 se divide igual', de: "      if (s === null || m === null || m <= 0) return '—'", a: "      if (s === null || m === null) return '—'" },
    // Rendimiento
    { nombre: 'el rendimiento del mejor al peor', de: '        return x - y', a: '        return y - x' },
    { nombre: 'los sin dato van primero', de: '        if (x === null) return 1\n', a: '        if (x === null) return -1\n' },
    { nombre: 'el peor no va en bordó', de: `<tr\${i === peor ? ' class="pr-ind--peor"' : ''}>`, a: '<tr>' },
    // Cada tarjeta independiente
    { nombre: 'un render que tira rompe todo', de: '        try { cuerpo = t.render(datos) } catch (err) { console.error(`indicador ${t.id}:`, err); cuerpo = null }', a: '        cuerpo = t.render(datos)' },
    { nombre: 'un bloque mal no dice "No se pudo leer"', de: `        if (cuerpo == null) cuerpo = '<div class="pr-ind__error">No se pudo leer este dato.</div>'`, a: "        if (cuerpo == null) cuerpo = ''" },
    { nombre: 'ahora malformado no se detecta', de: '      const lista = d?.ahora\n      if (!Array.isArray(lista)) return null', a: '      const lista = d?.ahora' },
    { nombre: 'semana null no se detecta', de: "      if (!s || typeof s !== 'object' || Array.isArray(s)) return null", a: '      if (!s) return null' },
    { nombre: 'el error de la RPC se ignora', de: '        if (e) throw e\n        datos = data', a: '        datos = data' },
    { nombre: 'la respuesta vieja pisa a la nueva', de: '      if (turno !== turnoIndicadores) return\n', a: '' },
    { nombre: 'sin unidad se pide igual', de: "      if (!estado.unidadId) { cont.innerHTML = ''; return }\n", a: '' },
    // Ahora
    { nombre: 'la parada no se marca', de: "const clase = p ? 'parada' : (pendiente ? 'pendiente' : 'abierta')", a: "const clase = 'abierta'" },
    { nombre: 'la pendiente de completar no se marca', de: `\${pendiente ? '<span class="pr-ind-chip">Pendiente de completar</span>' : ''}`, a: '' },
    { nombre: 'la hora de la parada en UTC', de: "horaArgentina(p.desde) || '—'", a: "new Date(p.desde).toISOString().slice(11, 16)" },
    // La unidad
    { nombre: 'el selector se ve con una sola unidad', de: "document.getElementById('pr-gestion-unidad-campo').hidden = unidades.length < 2", a: "document.getElementById('pr-gestion-unidad-campo').hidden = false" },
    { nombre: 'la unidad elegida no se recuerda', de: '      guardarPreferencia(CLAVE_UNIDAD_GESTION, id)\n', a: '' },
    { nombre: 'se elige una unidad ajena', de: '      if (!unidadesDeGestion().includes(id)) return false\n', a: '' },
    { nombre: 'la guardada no se valida', de: '      if (guardada && unidades.includes(guardada)) return guardada', a: '      if (guardada) return guardada' },
    { nombre: 'cambiar de unidad no recarga los indicadores', de: "      if (estado.vista === 'pr-inicio') cargarIndicadores()\n", a: '' },
    { nombre: 'el historial no sigue a la unidad', de: '      if (estado.historial) estado.historial.unidadId = id\n', a: '' },
    { nombre: 'el arranque no lee la guardada', de: 'leerPreferencia(CLAVE_UNIDAD_GESTION))', a: 'null)' },
    // A dónde llevan los pendientes
    { nombre: 'pendientes sin filtrar', de: "mostrarHistorial({ estado: 'pendiente_completar', desde", a: "mostrarHistorial({ estado: '', desde" },
    { nombre: 'abiertos sin filtrar', de: "mostrarHistorial({ estado: 'abierto', desde", a: "mostrarHistorial({ estado: '', desde" },
    { nombre: 'conos no abre Marcas', de: "if (que === 'conos') return mostrarConfig('marcas')", a: "if (que === 'conos') return mostrarConfig()" },
    { nombre: 'el botón de conos sin configurar', de: "      const conos = tieneTarea('configurar')", a: '      const conos = true' },
    // La pantalla
    { nombre: 'los accesos de configuración se ven sin configurar', de: "for (const b of document.querySelectorAll('[data-ir-config]')) b.hidden = !tieneTarea('configurar')", a: "for (const b of document.querySelectorAll('[data-ir-config]')) b.hidden = false" },
    { nombre: 'tamaños de tablet', de: 'body { --pr-alto-boton: 44px; font-size: 15px; }', a: 'body { --pr-alto-boton: 56px; font-size: 18px; }' },
    { nombre: 'sin "‹ Volver"', de: '      <a href="../dashboard.html" class="pr-header__volver" id="pr-gestion-volver" title="Volver al inicio de la app">&lsaquo; Volver</a>\n', a: '' },
  ],
})
