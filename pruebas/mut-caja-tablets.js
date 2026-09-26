// Mutaciones de test-caja-tablets.js. Ver mutar.js (mismos guards: suite
// verde sobre el limpio, ancla única, la mutación cambia el archivo, el
// sub-proceso leyó el mutado). De a una.
//
//   node pruebas/mut-caja-tablets.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-caja-tablets.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos', 'caja.html'),
  funciones: [],
  manuales: [
    // El predicado
    { nombre: 'el predicado nunca marca tablets', de: "      return e?.tipo === 'sistema'\n", a: '      return false\n' },
    { nombre: 'el predicado descarta también los tipo null', de: "      return e?.tipo === 'sistema'\n", a: "      return e?.tipo !== 'naaloo' && e?.tipo !== 'admin' && e?.tipo !== 'empresa'\n" },
    { nombre: 'el predicado mira otra columna', de: "      return e?.tipo === 'sistema'\n", a: "      return e?.es_dispositivo === true\n" },
    // Lista de personas
    { nombre: 'personas sin filtrar tablets', de: '(data || []).filter(e => !esCuentaDeTablet(e)), estado.fabrica)', a: '(data || []), estado.fabrica)' },
    { nombre: 'personas sin traer tipo', de: ".select('id, nombre, tipo, unidad_negocio_id, rol_app, caja_raiz, oculto_como_contraparte')", a: ".select('id, nombre, unidad_negocio_id, rol_app, caja_raiz, oculto_como_contraparte')" },
    { nombre: 'personas filtran tipo en SQL', de: ".eq('tiene_acceso', true).eq('activo', true).order('nombre')", a: ".eq('tiene_acceso', true).eq('activo', true).neq('tipo', 'sistema').order('nombre')" },
    // Super admins
    { nombre: 'super admins sin filtrar tablets', de: 'estado.superAdmins = (data || []).filter(e => !esCuentaDeTablet(e))', a: 'estado.superAdmins = data || []' },
    { nombre: 'super admins sin traer tipo', de: ".select('id, nombre, tipo, caja_raiz, oculto_como_contraparte')", a: ".select('id, nombre, caja_raiz, oculto_como_contraparte')" },
    // Selector de contraparte
    { nombre: 'la contraparte no filtra tablets', de: 'candidatos.filter(c => !c.oculto_como_contraparte && !esCuentaDeTablet(c))', a: 'candidatos.filter(c => !c.oculto_como_contraparte)' },
  ],
})
