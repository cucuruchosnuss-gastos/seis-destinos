// Mutaciones de test-produccion-color-caja.js. Ver mutar.js. De a una.
//
//   node pruebas/mut-produccion-color-caja.js

const path = require('path')
const { correrMutacionesEnVarios } = require('./mutar')

const suite = path.join(__dirname, 'test-produccion-color-caja.js')
const RAIZ = path.join(__dirname, '..')

correrMutacionesEnVarios([
  {
    suite, original: path.join(RAIZ, 'modulos', 'produccion-gestion.html'), funciones: [], variable: 'ARCHIVO_TEST',
    manuales: [
      { nombre: 'falta un color del CHECK', de: "      terracota: { nombre: 'Terracota', lch: [0.56, 0.13, 35] },\n    }\n    const ESPECIALES_PRODUCTO", a: "    }\n    const ESPECIALES_PRODUCTO" },
      { nombre: 'el elegido no manda', de: '      if (elegido) return tonoProducto(elegido.lch)\n', a: '' },
      { nombre: 'el select no trae el color', de: "select('id, nombre, tipo_masa, activo, orden, categoria, color')\n        .eq('unidad_negocio_id', c.unidadId).order('orden').order('nombre')\n      if (e2)", a: "select('id, nombre, tipo_masa, activo, orden, categoria')\n        .eq('unidad_negocio_id', c.unidadId).order('orden').order('nombre')\n      if (e2)" },
      { nombre: 'Automático no manda null', de: '      return { p_producto_id: productoId, p_color: valor || null }', a: "      return { p_producto_id: productoId, p_color: valor || 'amarillo' }" },
      { nombre: 'si la base rechaza, el color queda', de: '      if (!r.ok) p.color = anterior\n', a: '' },
      { nombre: 'el error del color no va pegado', de: "`${p.nombre}: ${valor ? COLORES_ELEGIBLES[valor]?.nombre ?? valor : 'color automático'}.`, 'pr-cfg-prod-color')", a: "`${p.nombre}: ${valor ? COLORES_ELEGIBLES[valor]?.nombre ?? valor : 'color automático'}.`)" },
      { nombre: 'el detalle sin el selector de color', de: '        `<div class="pc-prod__cuerpo">${aviso}` + htmlColoresProducto(p, c) +', a: '        `<div class="pc-prod__cuerpo">${aviso}` +' },
      { nombre: 'Automático nunca marcado', de: " aria-pressed=\"${valor === actual}\" title=", a: " aria-pressed=\"${!!valor && valor === actual}\" title=" },
      { nombre: 'el click del color no hace nada', de: "      if (ds.prodColor !== undefined) { const [id, valor] = ds.prodColor.split('|'); cambiarColorProducto(id, valor || null); return }\n", a: '' },
      { nombre: 'la caja con la unidad equivocada', de: '      return { p_unidad_negocio_id: unidadId, p_insumo_id: insumoId || null }', a: '      return { p_unidad_negocio_id: null, p_insumo_id: insumoId || null }' },
      { nombre: 'si la base rechaza, la caja queda', de: '      if (!r.ok) d.cajaPredeterminada = anterior\n', a: '' },
      { nombre: 'el select ofrece cualquier insumo', de: "      const cajas = (d.insumos ?? []).filter(i => i.categoria === 'Cajas' && (i.activo !== false || i.id === d.cajaPredeterminada))", a: '      const cajas = (d.insumos ?? [])' },
      { nombre: 'el select no marca la actual', de: "\"${i.id === d.cajaPredeterminada ? ' selected' : ''}>${esc(textoInsumoEmpaque(i))}</option>`).join('')\n      return cabeza +", a: "\">${esc(textoInsumoEmpaque(i))}</option>`).join('')\n      return cabeza +" },
      { nombre: 'el cambio del select no hace nada', de: '        if (t.dataset?.cajaPred !== undefined) return cambiarCajaPredeterminada(t.value)\n', a: '' },
      { nombre: 'sin leerla se ofrece igual', de: "      if (d.cajaPredeterminada === undefined) {\n", a: '      if (false) {\n' },
    ],
  },
  {
    suite, original: path.join(RAIZ, 'modulos', 'produccion.html'), funciones: [], variable: 'ARCHIVO_PLANTA',
    manuales: [
      { nombre: 'la planta ignora el color elegido', de: '      if (elegido) {\n        const [L, C, H] = elegido.lch', a: '      if (false) {\n        const [L, C, H] = elegido.lch' },
      { nombre: 'la planta con otro tono', de: "      violeta: { nombre: 'Violeta', lch: [0.52, 0.15, 300] },\n      marron: { nombre: 'Marrón', lch: [0.48, 0.07, 55] },\n      marron_claro: { nombre: 'Marrón claro', lch: [0.68, 0.07, 75] },\n      rosa: { nombre: 'Rosa', lch: [0.66, 0.13, 350] },\n      celeste_gris: { nombre: 'Celeste gris', lch: [0.52, 0.07, 195] },\n      oliva: { nombre: 'Oliva', lch: [0.58, 0.1, 120] },\n      terracota: { nombre: 'Terracota', lch: [0.56, 0.13, 35] },\n    }\n\n    function indiceDeNombre", a: "      violeta: { nombre: 'Violeta', lch: [0.5, 0.15, 300] },\n      marron: { nombre: 'Marrón', lch: [0.48, 0.07, 55] },\n      marron_claro: { nombre: 'Marrón claro', lch: [0.68, 0.07, 75] },\n      rosa: { nombre: 'Rosa', lch: [0.66, 0.13, 350] },\n      celeste_gris: { nombre: 'Celeste gris', lch: [0.52, 0.07, 195] },\n      oliva: { nombre: 'Oliva', lch: [0.58, 0.1, 120] },\n      terracota: { nombre: 'Terracota', lch: [0.56, 0.13, 35] },\n    }\n\n    function indiceDeNombre" },
      { nombre: 'la planta no trae el color', de: ".select('id, nombre, tipo_masa, orden, color, origen_producto_id').eq('unidad_negocio_id', unidadId)", a: ".select('id, nombre, tipo_masa, orden, origen_producto_id').eq('unidad_negocio_id', unidadId)" },
    ],
  },
])
