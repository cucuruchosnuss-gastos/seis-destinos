// Mutaciones de test-produccion-sin-cono.js (un solo "sin cono", 10/10/2026).
// Ver mutar.js y mutar-produccion.js.
//
//   node pruebas/mut-produccion-sin-cono.js

const path = require('path')
const { correrMutacionesProduccion } = require('./mutar-produccion')

correrMutacionesProduccion({
  suite: path.join(__dirname, 'test-produccion-sin-cono.js'),
  escape: 'esc',
  funciones: [],
  manuales: [
    // La planta: agregar.
    { nombre: 'vuelve el botón "Común" a la lista de conos', de: "      return botones + nada\n    }",
      a: "      return '<button type=\"button\" class=\"pr-cono pr-cono--comun\" data-marca=\"\">Común<span class=\"pr-cono__nota\">con cono, sin marca</span></button>' + botones + nada\n    }" },
    { nombre: 'un cono sin id vuelve a elegirse', de: "      if (!a || !id) return\n      if (a.conCono !== true)", a: "      if (!a) return\n      if (a.conCono !== true)" },
    { nombre: 'confirmar no mira si falta el cono', de: "      if (faltaConoAgregar(a)) { err.textContent = TEXTO_ELEGI_CONO; err.hidden = false; return }\n", a: '' },
    { nombre: 'faltaConoAgregar no mira la presentación (siempre falso)', de: "      return !!pr?.con_cono && !a?.marcaId", a: "      return false" },
    { nombre: 'faltaConoAgregar pide cono también sin cono', de: "      return !!pr?.con_cono && !a?.marcaId", a: "      return !a?.marcaId" },
    { nombre: 'el aviso no dice la salida ("Sin cono")', de: "con nombre. Si es común, elegí «Sin cono».'", a: "con nombre.'", archivo: 'planta' },
    { nombre: 'el paso del cono vuelve a decir "Común"', de: "(marca ? marca.nombre : (a.marcaId ? 'Cono que ya no está' : ''))", a: "(marca ? marca.nombre : (a.marcaId ? 'Cono que ya no está' : 'Común'))" },
    { nombre: 'el paso del cono que falta no se puede tocar', de: "        tocable: x.clave === 'cono' && conoPendiente && x.clave !== a.paso }))", a: "        tocable: false }))" },
    { nombre: 'el paso tocable no dice "falta elegir"', de: "(x.tocable ? 'falta elegir' : '—')", a: "'—'" },
    // La planta: corregir y los renglones viejos.
    { nombre: 'corregir un viejo abre en las cajas', de: "paso: !pr ? 'producto' : (pr.con_cono && !it.marca_id ? 'cono' : 'cajas')", a: "paso: !pr ? 'producto' : 'cajas'" },
    { nombre: 'corregir un viejo da el cono por elegido', de: "marcaElegida: !!pr && (!pr.con_cono || !!it.marca_id),", a: "marcaElegida: !!pr," },
    { nombre: 'el renglón viejo vuelve a decir "Común" en su columna', de: "`<span class=\"pr-fp__falta-cono\">${esc(TEXTO_FALTA_CONO)}</span>`", a: "htmlChipCono('Común', null)" },
    { nombre: 'describirProducido vuelve a decir "Común"', de: "marca: marcaNombre ?? (pr.con_cono ? TEXTO_FALTA_CONO : 'Sin cono'),", a: "marca: marcaNombre ?? 'Común'," },
    // La gestión.
    { nombre: 'gestión · Corregir no mira si falta el cono', de: "      if (e.cat && presentacionCorr(e, e.presentacionId)?.con_cono && !e.marcaId) return TEXTO_ELEGI_CONO\n", a: '' },
    { nombre: 'gestión · vuelve "Común (sin marca)" al select', de: "(e.marcaId ? '' : opcion('', 'Elegí el cono', true, ' disabled'))", a: "opcion('', 'Común (sin marca)', !e.marcaId)" },
    { nombre: 'gestión · "Elegí el cono" queda aunque haya cono', de: "(e.marcaId ? '' : opcion('', 'Elegí el cono', true, ' disabled'))", a: "opcion('', 'Elegí el cono', !e.marcaId, ' disabled')" },
    { nombre: 'gestión · nombreConoStock dice "Común" sin marca', de: "      return pr?.con_cono ? TEXTO_FALTA_CONO.toLocaleLowerCase('es') : ''", a: "      return 'Común'" },
    { nombre: 'gestión · nombreConoStock dice "falta el cono" también sin cono', de: "      return pr?.con_cono ? TEXTO_FALTA_CONO.toLocaleLowerCase('es') : ''", a: "      return TEXTO_FALTA_CONO.toLocaleLowerCase('es')" },
    { nombre: 'gestión · el stock terminado no saca la parte vacía', de: "        const clave = [prod?.nombre ?? 'Producto', pr?.nombre ?? 'Presentación', marcaNombre].filter(Boolean).join(' · ')", a: "        const clave = [prod?.nombre ?? 'Producto', pr?.nombre ?? 'Presentación', marcaNombre].join(' · ')" },
  ],
})
