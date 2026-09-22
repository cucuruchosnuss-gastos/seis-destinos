// Mutaciones de test-cheques-unidad.js (tarea A2, 22/09/2026). Ver mutar.js:
// guard de suite verde sobre el limpio, ancla única y mutación que cambia el
// archivo; corren de a una.
//
//   node pruebas/mut-cheques-unidad.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

const RAIZ = path.join(__dirname, '..')

correrMutaciones({
  suite: path.join(__dirname, 'test-cheques-unidad.js'),
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/cheques.html'),
  escape: 'esc',
  // Cada ${esc(...)} de estas funciones pierde su esc(), de a uno.
  funciones: ['htmlCeldaUnidad', 'pintarSelectorUnidades'],
  equivalentes: [
    { expr: 'esc(SIN_UNIDAD)', motivo: "constante del código ('sin_unidad'), sin ningún carácter que escapar" },
    { expr: 'esc(TEXTO_SIN_UNIDAD)', motivo: "constante del código ('Sin unidad'), sin ningún carácter que escapar" },
  ],
  manuales: [
    // ── Tarjeta del celular ──
    { nombre: 'la tarjeta: la unidad sin escapar en el title',
      de: 'tabindex="0" title="${esc(textoUnidad)}"${htmlAriaElegido(ch)}>', a: 'tabindex="0" title="${textoUnidad}"${htmlAriaElegido(ch)}>' },
    { nombre: 'la tarjeta: la unidad sin escapar en el texto oculto',
      de: '<span class="chq-oculto">${esc(textoUnidad)}</span>', a: '<span class="chq-oculto">${textoUnidad}</span>' },
    { nombre: 'la tarjeta: sin la unidad en el title',
      de: 'tabindex="0" title="${esc(textoUnidad)}"${htmlAriaElegido(ch)}>', a: 'tabindex="0"${htmlAriaElegido(ch)}>' },
    { nombre: 'la tarjeta: sin el texto oculto',
      de: '            <span class="chq-oculto">${esc(textoUnidad)}</span>\n', a: '' },
    // ── Columna ──
    { nombre: '"Sin unidad" sin su gris',
      de: '<span class="chq-sin-unidad">${esc(TEXTO_SIN_UNIDAD)}</span>', a: '${esc(TEXTO_SIN_UNIDAD)}' },
    { nombre: 'css: "Sin unidad" deja de ser gris',
      de: '.chq-sin-unidad { color: var(--color-texto-suave); }', a: '.chq-sin-unidad { }' },
    { nombre: 'una unidad sin nombre dice "null"',
      de: "nombre: nombre || 'Unidad sin nombre' }", a: 'nombre: String(cob.unidad_negocio_nombre) }' },
    { nombre: 'la columna no se puede ordenar',
      de: "            ${htmlEncabezadoOrden('unidad', 'Unidad')}", a: '            <th scope="col">Unidad</th>' },
    { nombre: 'Unidad no está en el selector del celular',
      de: "      { id: 'unidad', nombre: 'Unidad', tipo: 'texto' },\n", a: '' },
    { nombre: 'ordenar: "Sin unidad" como nombre (deja de ir al final)',
      de: "        case 'unidad': return unidadDeCheque(ch, cobranzas)?.nombre ?? null", a: "        case 'unidad': return unidadDeCheque(ch, cobranzas)?.nombre ?? TEXTO_SIN_UNIDAD" },
    { nombre: 'ordenar por unidad no mira nada',
      de: "        case 'unidad': return unidadDeCheque(ch, cobranzas)?.nombre ?? null\n", a: '' },
    // ── Filtro ──
    { nombre: 'filasVisibles ignora la unidad',
      de: '      return filtrarPorUnidad(filasPorPlazo(), estado.filtros.unidad, estado.cobranzas)', a: '      return filasPorPlazo()' },
    { nombre: 'filtrar: "Sin unidad" se trata como un id',
      de: '        return filtro === SIN_UNIDAD ? !u : u?.id === filtro', a: '        return u?.id === filtro' },
    { nombre: 'filtrar: sin filtro no devuelve todo',
      de: '      if (!filtro) return filas\n', a: '' },
    { nombre: 'la unidad no cuenta como filtro puesto',
      de: "|| !!f.banco || !!f.unidad || !!f.soloVencen", a: "|| !!f.banco || !!f.soloVencen" },
    { nombre: 'limpiar no vacía el select de unidad',
      de: "      document.getElementById('chq-filtro-unidad').value = ''\n", a: '' },
    { nombre: 'los filtros por defecto no traen unidad',
      de: "const FILTROS_CHEQUES_DEFECTO = { estado: 'en_cartera', numero: '', banco: '', unidad: '' }", a: "const FILTROS_CHEQUES_DEFECTO = { estado: 'en_cartera', numero: '', banco: '' }" },
    // ── Selector ──
    { nombre: 'las opciones salen de lo filtrado y no de todos los cheques',
      de: 'unidadesDeCheques(estado.cobranzaIdsDeCheques ?? [], estado.cobranzas)', a: 'unidadesDeCheques(estado.filas.map(f => f.cobranza_id), estado.cobranzas)' },
    { nombre: 'las opciones sin ordenar por nombre',
      de: "const unidades = [...porId.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))", a: 'const unidades = [...porId.values()]' },
    { nombre: 'sin la opción "Sin unidad"',
      de: "        `<option value=\"${esc(SIN_UNIDAD)}\">${esc(TEXTO_SIN_UNIDAD)}</option>`", a: "        ''" },
    { nombre: 'sin la opción "Todas las unidades"',
      de: `sel.innerHTML = '<option value="">Todas las unidades</option>' +`, a: 'sel.innerHTML = ' },
    { nombre: 'con el filtro puesto y un solo grupo, el campo se esconde',
      de: "document.getElementById('chq-campo-unidad').hidden = grupos < 2 && !elegido", a: "document.getElementById('chq-campo-unidad').hidden = grupos < 2" },
    { nombre: 'con un solo grupo el campo se ve igual',
      de: "document.getElementById('chq-campo-unidad').hidden = grupos < 2 && !elegido", a: "document.getElementById('chq-campo-unidad').hidden = grupos < 1 && !elegido" },
    { nombre: 'la unidad elegida sin cheques desaparece del selector',
      de: '      if (elegido && elegido !== SIN_UNIDAD && !unidades.some(u => u.id === elegido)) {', a: '      if (false) {' },
    // ── El cambio del selector ──
    { nombre: 'cambiar la unidad no limpia la selección',
      de: "        estado.filtros.unidad = ev.target.value\n        guardarPreferencias()\n        soltarSeleccionPorFiltro()\n", a: "        estado.filtros.unidad = ev.target.value\n        guardarPreferencias()\n" },
    { nombre: 'cambiar la unidad no se guarda',
      de: "        estado.filtros.unidad = ev.target.value\n        guardarPreferencias()\n", a: "        estado.filtros.unidad = ev.target.value\n" },
    { nombre: 'cambiar la unidad vuelve a consultar en vez de redibujar',
      de: "        soltarSeleccionPorFiltro()\n        pintarFiltrosCheques()\n        renderizarCheques()\n", a: "        soltarSeleccionPorFiltro()\n        cargarCheques()\n" },
    // ── Preferencias ──
    { nombre: 'la unidad guardada no vuelve',
      de: "        estado.filtros.unidad = typeof f.unidad === 'string' &&", a: "        estado.filtros.unidad = '' && typeof f.unidad === 'string' &&" },
    { nombre: 'una unidad guardada cualquiera entra sin validar',
      de: "(f.unidad === SIN_UNIDAD || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(f.unidad)) ? f.unidad : ''", a: "true ? f.unidad : ''" },
    // ── Consultas ──
    { nombre: 'v_cobranzas sin la unidad',
      de: "select('id, cliente, estado, fecha, cargada_por_nombre, unidad_negocio_id, unidad_negocio_nombre')", a: "select('id, cliente, estado, fecha, cargada_por_nombre')" },
    { nombre: 'el resumen sin cobranza_id',
      de: "select('id, cobranza_id, banco_codigo, estado, importe, tipo, fecha_emision, fecha_pago')", a: "select('id, banco_codigo, estado, importe, tipo, fecha_emision, fecha_pago')" },
    { nombre: 'las cobranzas del resumen se repiten',
      de: "estado.cobranzaIdsDeCheques = [...new Set(filas.map(x => String(x.cobranza_id ?? '')).filter(Boolean))]", a: "estado.cobranzaIdsDeCheques = filas.map(x => String(x.cobranza_id ?? '')).filter(Boolean)" },
    { nombre: 'el resumen no pinta el selector de unidades',
      de: '      pintarSelectorBancos()\n      pintarSelectorUnidades()\n', a: '      pintarSelectorBancos()\n' },
    // ── Resumen de la selección ──
    { nombre: 'desglose: "Sin unidad" no va al final',
      de: '(a.id === null) - (b.id === null) || ', a: '' },
    { nombre: 'desglose: total sin centavos',
      de: '        g.centavos += Math.round(Number(ch.importe) * 100)', a: '        g.centavos += Number(ch.importe) * 100' },
    { nombre: 'una sola unidad igual muestra el desglose',
      de: '      if (desglose.length === 1) return desglose[0].nombre\n', a: '' },
    { nombre: 'desglose: plural siempre',
      de: "${g.cantidad === 1 ? '1 cheque' : `${g.cantidad} cheques`}", a: '${g.cantidad} cheques' },
    { nombre: 'el desglose va por innerHTML',
      de: '      unidades.textContent = r.cantidad ? textoUnidadesSeleccion', a: '      unidades.innerHTML = r.cantidad ? textoUnidadesSeleccion' },
    { nombre: 'el desglose nunca se esconde',
      de: '      unidades.hidden = !unidades.textContent', a: '      unidades.hidden = false' },
    { nombre: 'la barra no deja su alto',
      de: "if (Number.isFinite(alto) && document.body.style?.setProperty) document.body.style.setProperty('--chq-alto-barra', `${alto}px`)", a: '' },
    { nombre: 'css: el espacio de abajo no sigue el alto de la barra',
      de: 'calc(var(--chq-alto-barra, 0px) + 1rem)', a: '0px' },
  ],
})
