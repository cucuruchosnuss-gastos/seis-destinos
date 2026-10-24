// Mutaciones de test-produccion-conos-parecidos.js ("¿Quisiste decir…?" al
// crear un cono en la tablet, 21/10/2026). Ver mutar.js y mutar-produccion.js.
//
//   node pruebas/mut-produccion-conos-parecidos.js
//
// UN RUNNER POR VEZ.

const path = require('path')
const { correrMutacionesProduccion } = require('./mutar-produccion')

correrMutacionesProduccion({
  suite: path.join(__dirname, 'test-produccion-conos-parecidos.js'),
  escape: 'esc',
  funciones: ['htmlParecidos'],
  manuales: [
    // Al escribir
    { nombre: 'busca en cada tecla (sin esperar)', de: '      p.reloj = setTimeout(() => buscarParecidos(), ESPERA_PARECIDOS_MS)', a: '      p.reloj = null; buscarParecidos()' },
    { nombre: 'espera otro tiempo', de: '    const ESPERA_PARECIDOS_MS = 300', a: '    const ESPERA_PARECIDOS_MS = 1000' },
    { nombre: 'busca con 2 letras', de: '    const MIN_LETRAS_PARECIDOS = 3', a: '    const MIN_LETRAS_PARECIDOS = 2' },
    { nombre: 'busca aunque no haya internet', de: "      if (texto.length < MIN_LETRAS_PARECIDOS || (typeof navigator !== 'undefined' && navigator.onLine === false)) {", a: '      if (texto.length < MIN_LETRAS_PARECIDOS) {' },
    { nombre: 'una respuesta vieja pisa a la nueva', de: '        if (estadoParecidos() !== p || turno !== p.turno) return\n        p.lista = listaParecidos(data)', a: '        if (estadoParecidos() !== p) return\n        p.lista = listaParecidos(data)' },
    { nombre: 'el "igual" no se lee', de: "        .map(p => ({ marca_id: p.marca_id, nombre: String(p.nombre), igual: p.igual === true }))", a: "        .map(p => ({ marca_id: p.marca_id, nombre: String(p.nombre), igual: false }))" },
    { nombre: 'sin "¿Quisiste decir…?"', de: "        h += '<p class=\"pr-ag__parecidos-titulo\">¿Quisiste decir…?</p><div class=\"pr-ag__parecidos-lista\">' +", a: "        h += '<div class=\"pr-ag__parecidos-lista\">' +" },
    { nombre: 'el botón no cambia con uno igual', de: "textContent = parecidoIgual(p?.lista) ? 'Es otro cono, crearlo igual' : 'Agregarlo'", a: "textContent = 'Agregarlo'" },
    { nombre: 'los botones chicos', de: '    .pr-ag__parecido { min-height: 56px;', a: '    .pr-ag__parecido { min-height: 32px;', archivo: 'planta' },
    // Elegir un parecido
    { nombre: 'elegir un parecido no elige', de: '      cerrarConoNuevo()\n      elegirCono(marcaId)\n', a: '      cerrarConoNuevo()\n' },
    { nombre: 'elegir uno dado de baja lo elige igual', de: "      if (!(estado.catalogo?.marcas ?? []).some(m => m.id === marcaId)) {\n        // Fuera", a: "      if (false) {\n        // Fuera" },
    // Igual → confirmar → p_es_otro
    { nombre: 'con uno igual no pregunta', de: '      if (igual) return confirmarEsOtroCono(igual.nombre, igual.marca_id)\n', a: '' },
    { nombre: 'confirmar no manda p_es_otro', de: "esOtro ? { p_nombre: nombre, p_es_otro: true } : { p_nombre: nombre }", a: '{ p_nombre: nombre }' },
    { nombre: 'p_es_otro siempre', de: "esOtro ? { p_nombre: nombre, p_es_otro: true } : { p_nombre: nombre }", a: '{ p_nombre: nombre, p_es_otro: true }' },
    { nombre: 'el Sí no crea', de: '      }, () => crearConoNuevo({ esOtro: true }), marcaId ? () => elegirParecido(marcaId) : null)', a: '      }, () => null, marcaId ? () => elegirParecido(marcaId) : null)' },
    { nombre: 'el No no elige el que existe', de: '      }, () => crearConoNuevo({ esOtro: true }), marcaId ? () => elegirParecido(marcaId) : null)', a: '      }, () => crearConoNuevo({ esOtro: true }), null)' },
    { nombre: 'la pregunta no nombra el cono', de: '        titulo: `¿Seguro que no es ${existente}?`,', a: "        titulo: '¿Seguro?'," },
    // El error de la base
    { nombre: 'el error "ya existe" no ofrece elegir', de: '        if (existente && p) {', a: '        if (false) {' },
    { nombre: 'el nombre del error mal leído', de: "/^Ya existe el cono (.+?): elegí ese\\./", a: "/^Ya existe el cono (.+?): /" },
    { nombre: 'el error de la base se tapa', de: "        err.textContent = e?.message || 'No se pudo agregar el cono.'\n        err.hidden = false\n        const existente", a: "        err.textContent = 'No se pudo agregar el cono.'\n        err.hidden = false\n        const existente" },
    // Las conexiones
    { nombre: 'escribir no busca parecidos', de: "      document.getElementById('pr-agregar-cono-nombre').addEventListener('input', () => programarParecidos())\n", a: '' },
    { nombre: 'tocar un parecido no lo elige', de: "const b = ev.target.closest('[data-parecido]'); if (b) return elegirParecido(b.dataset.parecido)", a: "const b = null" },
  ],
})
