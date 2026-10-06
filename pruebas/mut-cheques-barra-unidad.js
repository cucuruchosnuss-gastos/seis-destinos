// Mutaciones de test-cheques-barra-unidad.js (28/09/2026): la cartera filtra
// por la barra de unidad de arriba. Ver mutar.js: guard de suite verde sobre
// el limpio, ancla única y mutación que cambia el archivo; corren de a una.
//
//   node pruebas/mut-cheques-barra-unidad.js

const path = require('path')
const { correrMutaciones } = require('./mutar')
// La cartera vive en una región de administracion.html: se muta SOLO ahí.
const { ARCHIVO_CHEQUES, limitesCheques } = require('./fuente-cheques')

correrMutaciones({
  region: limitesCheques,
  suite: path.join(__dirname, 'test-cheques-barra-unidad.js'),
  original: process.env.ARCHIVO_BASE || ARCHIVO_CHEQUES,
  escape: 'esc',
  // Los escapes que importan acá (título y notas) van como manuales.
  funciones: [],
  manuales: [
    // ── El filtro ──
    { nombre: 'la unidad elegida no filtra nada',
      de: "      if (!elegida) return filas\n      return filas.filter(ch => (mantener && ch.id === mantener) ||",
      a: "      return filas\n      return filas.filter(ch => (mantener && ch.id === mantener) ||" },
    { nombre: 'el cheque pedido de otra unidad desaparece',
      de: 'return filas.filter(ch => (mantener && ch.id === mantener) ||', a: 'return filas.filter(ch => false ||' },
    { nombre: 'los sin unidad desaparecen (copia de la regla en vez de pasaFiltroUnidad)',
      de: 'pasaFiltroUnidad(unidadDeCheque(ch, cobranzas)?.id ?? null, elegida))', a: 'unidadDeCheque(ch, cobranzas)?.id === elegida)' },
    { nombre: 'la lista no pasa por el filtro de la unidad',
      de: 'chequesDeLaUnidad(filasPorPlazo(), estado.unidadElegida, estado.cobranzas, estado.destacado)', a: 'filasPorPlazo()' },
    { nombre: 'la lista no mantiene el cheque pedido',
      de: 'chequesDeLaUnidad(filasPorPlazo(), estado.unidadElegida, estado.cobranzas, estado.destacado)', a: 'chequesDeLaUnidad(filasPorPlazo(), estado.unidadElegida, estado.cobranzas)' },
    // ── El total y los que vencen ──
    { nombre: 'el total de la unidad suma también los sin unidad',
      de: '        if (!u) sinUnidad.push(ch)\n', a: '        if (!u) { sinUnidad.push(ch); deLaUnidad.push(ch) }\n' },
    { nombre: 'el total de la unidad es el de todas',
      de: '      estado.cartera = resumenCartera(deLaUnidad)', a: '      estado.cartera = resumenCartera(filas)' },
    { nombre: 'vencen no cuenta los sin unidad',
      de: 'resumenVencimientos([...deLaUnidad, ...sinUnidad], hoy)', a: 'resumenVencimientos(deLaUnidad, hoy)' },
    { nombre: 'no dice cuántos de los que vencen son sin unidad',
      de: '      venc.sinUnidad = resumenVencimientos(sinUnidad, hoy).cantidad\n', a: '' },
    { nombre: 'los sin unidad no se dicen aparte',
      de: 'estado.carteraDetalle = { unidad: nombre, sinUnidad: resumenCartera(sinUnidad) }', a: 'estado.carteraDetalle = { unidad: nombre }' },
    { nombre: 'antes de las cobranzas muestra un total de la unidad inventado',
      de: '      if (!estado.cobranzasListas) {\n        estado.cartera = null', a: '      if (false) {\n        estado.cartera = null' },
    { nombre: 'si la carga falló dice "calculando" para siempre',
      de: 'estado.carteraDetalle = estado.error ? null : { unidad: nombre, cargando: true }', a: 'estado.carteraDetalle = { unidad: nombre, cargando: true }' },
    { nombre: 'Todas: sin el desglose por unidad',
      de: 'estado.carteraDetalle = desglose.length > 1 ? { desglose } : null', a: 'estado.carteraDetalle = null' },
    { nombre: 'Todas: desglose con un solo grupo',
      de: 'estado.carteraDetalle = desglose.length > 1 ? { desglose } : null', a: 'estado.carteraDetalle = desglose.length > 0 ? { desglose } : null' },
    // "const desglose = estado.cobranzasListas ? … : []" pasado a true NO se
    // muta: es EQUIVALENTE hoy. Antes de las cobranzas estado.cobranzas es un
    // Map vacío, así que todo cheque cae en "Sin unidad", queda un solo grupo
    // y no hay desglose igual. La guarda queda como red por si algún día las
    // cobranzas llegan de a partes.
    // ── La barra ──
    { nombre: 'la unidad elegida no se guarda',
      de: 'estado.unidadElegida = e?.elegida ? String(e.elegida) : null', a: 'estado.unidadElegida = null' },
    { nombre: 'las unidades de la barra no se guardan (el nombre no sale)',
      de: 'estado.unidadesBarra = Array.isArray(e?.unidades) ? e.unidades : []', a: 'estado.unidadesBarra = []' },
    { nombre: 'la misma unidad otra vez limpia la selección',
      de: '      if (estado.unidadElegida === antes) return\n', a: '' },
    // (06/10/2026: desde Cheques "Emitidos" la función tiene una línea más
    // después de renderizarCheques(); las anclas terminan en ella.)
    { nombre: 'cambiar la barra no limpia la selección',
      de: '      soltarSeleccionPorFiltro()\n      recalcularResumen()\n      pintarFiltrosCheques()\n      renderizarCheques()\n      if (estado.vista',
      a: '      recalcularResumen()\n      pintarFiltrosCheques()\n      renderizarCheques()\n      if (estado.vista' },
    { nombre: 'cambiar la barra no recalcula el total',
      de: '      soltarSeleccionPorFiltro()\n      recalcularResumen()\n      pintarFiltrosCheques()\n      renderizarCheques()\n      if (estado.vista',
      a: '      soltarSeleccionPorFiltro()\n      pintarFiltrosCheques()\n      renderizarCheques()\n      if (estado.vista' },
    { nombre: 'cambiar la barra no repinta la lista',
      de: '      soltarSeleccionPorFiltro()\n      recalcularResumen()\n      pintarFiltrosCheques()\n      renderizarCheques()\n      if (estado.vista',
      a: '      soltarSeleccionPorFiltro()\n      recalcularResumen()\n      pintarFiltrosCheques()\n      if (estado.vista' },
    { nombre: 'cambiar la barra vuelve a consultar',
      de: '      soltarSeleccionPorFiltro()\n      recalcularResumen()\n      pintarFiltrosCheques()\n      renderizarCheques()\n      if (estado.vista',
      a: '      soltarSeleccionPorFiltro()\n      refrescarTodo()\n      if (estado.vista' },
    { nombre: 'no se suscribe a la barra',
      de: '      alCambiarUnidad(alCambiarLaBarra)\n', a: '' },
    { nombre: 'la barra no se aplica al arrancar',
      de: '      aplicarEleccionBarra(eleccion)\n      await refrescarTodo()', a: '      await refrescarTodo()' },
    { nombre: 'la primera carga sale sin la unidad (se aplica después)',
      de: '      aplicarEleccionBarra(eleccion)\n      await refrescarTodo()', a: '      await refrescarTodo()\n      aplicarEleccionBarra(eleccion)' },
    // ── Lo que se dice ──
    { nombre: 'el título no nombra la unidad',
      de: "const titulo = unidad ? `En cartera · ${unidad}` : 'En cartera'", a: "const titulo = 'En cartera'" },
    { nombre: 'el título sin escapar',
      de: '<div class="chq-cartera__k">${esc(titulo)}</div>\n        <div class="chq-cartera__v">', a: '<div class="chq-cartera__k">${titulo}</div>\n        <div class="chq-cartera__v">' },
    { nombre: '"calculando" muestra un total',
      de: '      if (detalle?.cargando) {', a: '      if (false) {' },
    { nombre: 'la nota de los sin unidad no sale',
      de: '      if (sinU?.cantidad) {', a: '      if (false) {' },
    { nombre: 'el desglose de Todas no sale',
      de: 'if (Array.isArray(detalle?.desglose) && detalle.desglose.length > 1) {', a: 'if (false) {' },
    { nombre: 'las notas sin escapar',
      de: "${notas.map(t => `<div class=\"chq-cartera__sub\">${esc(t)}</div>`).join('')}", a: "${notas.map(t => `<div class=\"chq-cartera__sub\">${t}</div>`).join('')}" },
    { nombre: 'el aviso de vencimientos no dice los sin unidad',
      de: "const sinUnidad = v.sinUnidad ? ` · ${v.sinUnidad === 1 ? '1 sin unidad' : `${v.sinUnidad} sin unidad`}` : ''", a: "const sinUnidad = ''" },
    { nombre: 'el vacío no dice que hay una unidad elegida',
      de: '        vacio.textContent = estado.unidadElegida\n', a: '        vacio.textContent = false\n' },
    { nombre: 'el aviso del cheque pedido de otra unidad no sale',
      de: '      if (aviDestacado) lineas.push(aviDestacado)\n', a: '' },
    { nombre: 'el aviso del cheque pedido sale siempre vacío',
      de: "      if (!u || u.id === elegida) return ''", a: "      return ''" },
    { nombre: 'el aviso del cheque pedido sale aunque sea de la misma unidad',
      de: "      if (!u || u.id === elegida) return ''", a: "      if (!u) return ''" },
    // ── La marca "Sin unidad" del celular ──
    { nombre: 'celular: sin la marca "Sin unidad"',
      de: 'const marcaSinUnidad = estado.unidadElegida && !unidadCh', a: 'const marcaSinUnidad = false && !unidadCh' },
    { nombre: 'celular: la marca también con Todas',
      de: 'const marcaSinUnidad = estado.unidadElegida && !unidadCh', a: 'const marcaSinUnidad = !unidadCh' },
    { nombre: 'celular: la marca va al final del renglón',
      de: '<div class="chq-tarjeta__l2">${marcaSinUnidad}${venc ?', a: '<div class="chq-tarjeta__l2">${venc ?' },
    { nombre: 'css: la marca se puede cortar',
      de: '.chq-tarjeta__sin-unidad { font-weight: 600; flex-shrink: 0; }', a: '.chq-tarjeta__sin-unidad { font-weight: 600; }' },
  ],
})
