// Mutaciones de test-produccion-planta.js (la planta, 25/09/2026). Ver
// mutar.js y mutar-produccion.js.
//
//   node pruebas/mut-produccion-planta.js
//
// UN RUNNER POR VEZ: dos corridas en paralelo se pisan el mut-tmp-*.html.

const path = require('path')
const { correrMutacionesProduccion } = require('./mutar-produccion')

correrMutacionesProduccion({
  suite: path.join(__dirname, 'test-produccion-planta.js'),
  escape: 'esc',
  funciones: ['htmlMaestrosPin', 'htmlPersonaAcceso', 'htmlNotaAcceso', 'sinAcceso', 'htmlMaestroEnBarra'],
  soloPlanta: ['sinAcceso'],
  manuales: [
    // d) el acceso maestro sin "¿Quién sos?"
    { nombre: 'la barra no ofrece el acceso maestro', de: "      if (estado.maestro) return ''\n      return '<button type=\"button\" class=\"pr-barra__maestro\"", a: "      return ''\n      return '<button type=\"button\" class=\"pr-barra__maestro\"" },
    { nombre: 'la barra no escucha el acceso maestro', de: "if (ev.target.closest('#pr-btn-barra-maestro')) { abrirMaestro(); return }", a: '' },
    { nombre: 'el maestro ve la lista de ¿Quién sos?', de: "document.getElementById('pr-quien-col').hidden = enMaestro", a: "document.getElementById('pr-quien-col').hidden = false" },
    { nombre: 'con un solo maestro no se elige solo', de: 'if (maestros.length === 1) { p.personaId = maestros[0].id', a: 'if (false) { p.personaId = maestros[0].id' },
    { nombre: 'la fila de nombres aparece con un solo maestro', de: "if (maestros.length < 2) return ''", a: "if (maestros.length < 1) return ''" },
    { nombre: 'la fila muestra a todo el personal', de: 'filter(x => x.es_maestro === true)', a: 'filter(x => true)' },
    { nombre: 'se prueba el PIN sin saber quién es', de: '        if (candidatos.length !== 1) {\n          p.mensaje = { texto: candidatos.length ?', a: '        if (false) {\n          p.mensaje = { texto: candidatos.length ?' },
    { nombre: 'elegir acepta a alguien que no es maestro', de: 'const m = maestrosDisponibles().find(x => x.id === id)', a: 'const m = (estado.personal ?? []).find(x => x.id === id)' },
    { nombre: 'no carga el personal', de: '      if (!Array.isArray(estado.personal) || !estado.personal.length) {\n        try {', a: '      if (false) {\n        try {' },
    { nombre: 'cancelar el maestro no vuelve al modo', de: '        if (estado.persona) return entrarAlModo()\n        return mostrarQuien()', a: '        return mostrarQuien()' },
    { nombre: 'verificado, la lista queda escondida', de: '      estado.quienMaestro = false\n      pintarQuienMaestro()\n      tocar()', a: '      estado.quienMaestro = false\n      tocar()' },
    // e) dar acceso por hoy
    { nombre: 'el masero sin PIN no va primero', de: 'const primero = p => Array.isArray(p.puestos) && p.puestos.includes(puesto) && p.tiene_pin === false', a: 'const primero = p => false' },
    { nombre: 'no dice que no tiene PIN', de: "if (p?.tiene_pin === false) partes.push('sin PIN')", a: '' },
    { nombre: 'la nota no explica el PIN de un día', de: '      if (p.tiene_pin === false) {\n        return `<div class="pr-aviso">', a: '      if (false) {\n        return `<div class="pr-aviso">' },
    // sin acceso: nunca al dashboard
    { nombre: 'sinAcceso vuelve al dashboard', de: '      el.innerHTML = `<p>${esc(texto)}</p>${linksHtml}`\n      el.hidden = false\n', a: '      el.innerHTML = `<p>${esc(texto)}</p>${linksHtml}`\n      el.hidden = false\n      setTimeout(() => { window.location.href = \'../dashboard.html\' }, 2500)\n' },
    // g) Atrás
    { nombre: 'la planilla vuelve a "‹ Máquinas"', de: 'id="pr-planilla-volver"><span aria-hidden="true">←</span> Atrás</button>', a: 'id="pr-planilla-volver">‹ Máquinas</button>' },
    { nombre: 'el Atrás de las masas va después del título', de: '          <button type="button" class="pr-btn pr-btn--secundario pr-atras" id="pr-masas-volver"><span aria-hidden="true">←</span> Atrás</button>\n          <h1 class="pr-titulo">Masas del turno</h1>\n', a: '          <h1 class="pr-titulo">Masas del turno</h1>\n          <button type="button" class="pr-btn pr-btn--secundario pr-atras" id="pr-masas-volver"><span aria-hidden="true">←</span> Atrás</button>\n' },
    // h) el manifest
    { nombre: 'la planta usa el manifest de la app', de: '<link rel="manifest" href="../manifest.webmanifest">', a: '<link rel="manifest" href="../manifest.json">' },
    { nombre: 'otro theme-color', de: '<meta name="theme-color" content="#3F4655">', a: '<meta name="theme-color" content="#1a2a52">' },
    { nombre: 'sin apple-touch-icon', de: '  <link rel="apple-touch-icon" href="../icons/planta-192.png">\n', a: '' },
  ],
})
