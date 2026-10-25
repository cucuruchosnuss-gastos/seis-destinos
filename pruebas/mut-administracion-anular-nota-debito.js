// Mutaciones de test-administracion-anular-nota-debito.js (quién puede anular
// una nota de débito: la regla de anular_nota_debito). Ver mutar.js. De a una.
//
//   node pruebas/mut-administracion-anular-nota-debito.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-administracion-anular-nota-debito.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/administracion.html'),
  // Ninguna interpolación nueva: el botón y el panel ya estaban.
  funciones: [],
  manuales: [
    { nombre: 'como antes: retiros:precios de cualquier fábrica',
      de: "      return tieneTarea('cobranzas', 'procesar') || puedeEn('retiros', 'precios', unidadId)\n",
      a: "      return tieneTarea('cobranzas', 'procesar') || tieneTarea('retiros', 'precios')\n" },
    { nombre: 'la fábrica de la barra en vez de la de la nota',
      de: "      return tieneTarea('cobranzas', 'procesar') || puedeEn('retiros', 'precios', unidadId)\n",
      a: "      return tieneTarea('cobranzas', 'procesar') || puedeEn('retiros', 'precios')\n" },
    { nombre: 'cobranzas:procesar no alcanza',
      de: "      return tieneTarea('cobranzas', 'procesar') || puedeEn('retiros', 'precios', unidadId)\n",
      a: "      return puedeEn('retiros', 'precios', unidadId)\n" },
    { nombre: 'la recibida también con cobranzas:procesar',
      de: "      if (d.direccion === 'recibida') return tieneTarea('cuentas_corrientes', 'registrar_pago')\n      return tieneTarea('cobranzas', 'procesar') || puedeEn(",
      a: "      if (d.direccion === 'recibida') return tieneTarea('cuentas_corrientes', 'registrar_pago') || tieneTarea('cobranzas', 'procesar')\n      return tieneTarea('cobranzas', 'procesar') || puedeEn(" },
    { nombre: 'una anulada se puede anular',
      de: "      if (!d || d.estado === 'anulada') return false\n      if (d.direccion === 'recibida') return tieneTarea('cuentas_corrientes', 'registrar_pago')\n      return tieneTarea('cobranzas', 'procesar') || puedeEn(",
      a: "      if (!d) return false\n      if (d.direccion === 'recibida') return tieneTarea('cuentas_corrientes', 'registrar_pago')\n      return tieneTarea('cobranzas', 'procesar') || puedeEn(" },
    { nombre: 'sin fábrica de la nota, la de la barra',
      de: 'function puedeAnularNotaDebito(d, unidadId = estado.notaDebito?.unidadId ?? null)',
      a: 'function puedeAnularNotaDebito(d, unidadId = estado.notaDebito?.unidadId ?? estado.empresaId)' },
    { nombre: 'la fábrica leída no se guarda (queda la de la barra)',
      de: '      estado.notaDebito.unidadId = unidadId ?? null\n', a: '      estado.notaDebito.unidadId = estado.empresaId\n' },
    { nombre: 'la fábrica no se lee',
      de: "[supabase.rpc('datos_nota_debito', { p_id: id }), leerUnidadNotaDebito(id)]",
      a: "[supabase.rpc('datos_nota_debito', { p_id: id }), null]" },
    { nombre: 'la fábrica se lee sin filtrar por la nota',
      de: ".select('id, unidad_negocio_id').eq('id', id).maybeSingle()", a: ".select('id, unidad_negocio_id').maybeSingle()" },
    { nombre: 'si la fábrica no se puede leer, la hoja tampoco',
      de: "        console.error('No se pudo leer la fábrica de la nota de débito:', err)\n        return null\n",
      a: '        throw err\n' },
  ],
})
