// Mutaciones de la barra de unidad en la gestión de Producción (ver test-produccion-gestion-barra-unidad.js).
const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-produccion-gestion-barra-unidad.js'),
  original: path.join(__dirname, '..', 'modulos', 'produccion-gestion.html'),
  variable: 'ARCHIVO_GESTION',
  funciones: [],
  manuales: [
    { nombre: 'Todas no pide elegir', de: "      if (!elegida) return undefined                    // Todas: se elige acá\n      return unidades.includes(elegida) ? elegida : null", a: "      if (!elegida) return null\n      return unidades.includes(elegida) ? elegida : null" },
    { nombre: 'una unidad sin Producción cuenta', de: "      return unidades.includes(elegida) ? elegida : null\n    }\n\n    function textoSinProduccionEnBarra", a: "      return elegida\n    }\n\n    function textoSinProduccionEnBarra" },
    { nombre: 'el selector de arriba con la barra fija', de: "unidades.length < 2 || !!estado.unidadBarra\n", a: "unidades.length < 2\n" },
    { nombre: 'las secciones abren igual', de: "      if (sinUnidadPorBarra()) { mostrarError(textoSinProduccionEnBarra()); return }\n      const unidades = unidadesDeConfig()", a: "      const unidades = unidadesDeConfig()" },
    { nombre: 'los indicadores no lo dicen', de: "cont.innerHTML = sinUnidadPorBarra() ? `<div class=\"pr-aviso\">${esc(textoSinProduccionEnBarra())}</div>` : ''", a: "cont.innerHTML = ''" },
    { nombre: 'cambiar la barra no cambia la unidad', de: "      if (segun === estado.unidadId) { pintarSelectorGestion(); return }\n      elegirUnidadGestion(segun)", a: "      pintarSelectorGestion()" },
    { nombre: 'sin Producción no deja la unidad en null', de: "      if (segun === null) {\n        estado.unidadId = null\n", a: "      if (segun === null) {\n" },
    { nombre: 'la barra no se anota', de: "      estado.unidadBarra = elegida ?? null\n      const segun = unidadSegunBarra()", a: "      const segun = unidadSegunBarra()" },
  ],
})
