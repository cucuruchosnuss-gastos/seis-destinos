// Mutaciones de test-conos-parecidos.js ("¿Quisiste decir…?" al crear un cono
// en Conos de papel, 21/10/2026). Ver mutar.js.
//
//   node pruebas/mut-conos-parecidos.js
//
// UN RUNNER POR VEZ.

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-conos-parecidos.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/conos.html'),
  escape: 'esc',
  funciones: ['htmlResultados', 'confirmarEsOtroCono'],
  equivalentes: [
    { expr: 'esc(destino)', motivo: "constante del código: 'anotar' o 'agregar'" },
  ],
  manuales: [
    // Al escribir
    { nombre: 'busca en cada tecla (sin esperar)', de: '      par.reloj = setTimeout(() => buscarParecidos(destino), ESPERA_PARECIDOS_MS)', a: '      buscarParecidos(destino)' },
    { nombre: 'espera otro tiempo', de: '    const ESPERA_PARECIDOS_MS = 300', a: '    const ESPERA_PARECIDOS_MS = 1000' },
    { nombre: 'busca con 2 letras', de: '    const MIN_LETRAS_PARECIDOS = 3', a: '    const MIN_LETRAS_PARECIDOS = 2' },
    { nombre: 'busca aunque no se ofrezca crear', de: '      const nuevo = ofrecerConoNuevo(texto)\n', a: '      const nuevo = textoConoNuevo(texto) || null\n' },
    { nombre: 'busca aunque no haya internet', de: "      if (!texto || texto.length < MIN_LETRAS_PARECIDOS || (typeof navigator !== 'undefined' && navigator.onLine === false)) return", a: '      if (!texto || texto.length < MIN_LETRAS_PARECIDOS) return' },
    { nombre: 'una respuesta vieja pisa a la nueva', de: '        if (turno !== par.turno || texto !== par.texto) return\n', a: '' },
    { nombre: 'los resultados no se repintan al llegar', de: '        par.lista = []\n      }\n      pintarResultados(destino)\n    }', a: '        par.lista = []\n      }\n    }' },
    // Lo que se ve
    { nombre: 'sin "¿Quisiste decir…?"', de: "        filas.push('<p class=\"cn-parecidos-titulo\">¿Quisiste decir…?</p>')\n", a: '' },
    { nombre: 'los parecidos van después del botón', de: '      if (parecidos.length) {\n        filas.push', a: '      if (parecidos.length) {\n        filas.unshift' },
    { nombre: 'los parecidos de otro texto se muestran', de: '      const vigente = !!textoNuevo && par?.texto === textoNuevo', a: '      const vigente = !!textoNuevo && !!par' },
    { nombre: 'un parecido de la lista se repite', de: '(par.lista ?? []).filter(x => !ids.has(x.marca_id))', a: '(par.lista ?? [])' },
    { nombre: 'el botón no cambia con uno igual', de: "${otro ? 'Es otro cono, crearlo igual' : '+ Cono nuevo'}", a: "${'+ Cono nuevo'}" },
    { nombre: 'el "igual" no se lee', de: "        .map(p => ({ marca_id: p.marca_id, nombre: String(p.nombre), igual: p.igual === true }))", a: "        .map(p => ({ marca_id: p.marca_id, nombre: String(p.nombre), igual: false }))" },
    // Igual → confirmar → p_es_otro
    { nombre: 'con uno igual no pregunta', de: '      if (igual) { confirmarEsOtroCono(nombre, destino, igual); return }\n', a: '' },
    { nombre: 'confirmar no manda p_es_otro', de: "esOtro ? { p_nombre: textoConoNuevo(nombre), p_es_otro: true } : { p_nombre: textoConoNuevo(nombre) }", a: '{ p_nombre: textoConoNuevo(nombre) }' },
    { nombre: 'p_es_otro siempre', de: "esOtro ? { p_nombre: textoConoNuevo(nombre), p_es_otro: true } : { p_nombre: textoConoNuevo(nombre) }", a: '{ p_nombre: textoConoNuevo(nombre), p_es_otro: true }' },
    { nombre: 'el Sí no crea', de: "accion: () => proponerCono(nombre, destino, { esOtro: true }) })", a: 'accion: () => null })' },
    { nombre: 'la pregunta no nombra el cono', de: 'abrirModal(`¿Seguro que no es ${igual.nombre}?`,', a: "abrirModal('¿Seguro?'," },
    { nombre: 'el No no elige el que existe', de: ' data-modal-cerrar ${atributo}="${esc(igual.marca_id)}"', a: ' data-modal-cerrar' },
    // El error de la base
    { nombre: 'el error "ya existe" no ofrece elegir', de: '        if (existente && par.texto === textoConoNuevo(nombre)) {', a: '        if (false) {' },
    { nombre: 'el nombre del error mal leído', de: "/^Ya existe el cono (.+?): elegí ese\\./", a: "/^Ya existe el cono (.+?): /" },
    { nombre: 'después de crear quedan los parecidos', de: '        limpiarParecidos(destino)\n        if (destino', a: '        if (destino' },
    // Elegir un parecido
    { nombre: 'un parecido que no estaba no se suma', de: '      if (!id || estado.conoPorId.has(id)) return\n', a: '      return\n' },
    // Las conexiones
    { nombre: 'Anotar no busca parecidos', de: "        programarParecidos('anotar', ev.target.value)\n", a: '' },
    { nombre: 'Agregar no busca parecidos', de: "programarParecidos('agregar', ev.target.value); pintarResultadosAgregar()", a: 'pintarResultadosAgregar()' },
  ],
})
