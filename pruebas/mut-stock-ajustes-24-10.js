// Mutaciones de test-stock-ajustes-24-10.js (Costos: el bulto del catálogo;
// lotes usados sin ingreso: la unidad de la base). Ver mutar.js (los tres
// guards). Corren de a una.
//
//   node pruebas/mut-stock-ajustes-24-10.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-stock-ajustes-24-10.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/stock.html'),
  // El esc() de htmlFilaSinIngreso lo cubre mut-stock-lotes-sin-ingreso; el
  // de la unidad, además, va a mano abajo.
  funciones: [],
  manuales: [
    // ── a) Costos: el catálogo manda ─────────────────────────────────────
    { nombre: 'costos no lee el catálogo',
      de: '        cargarBultosCatalogoCostos(),\n', a: '        null,\n' },
    { nombre: 'el catálogo se lee sin contenido_bulto',
      de: ".from('insumos').select('id, contenido_bulto, vista_preferida')", a: ".from('insumos').select('id, vista_preferida')" },
    { nombre: 'el catálogo se lee sin vista_preferida',
      de: ".from('insumos').select('id, contenido_bulto, vista_preferida')", a: ".from('insumos').select('id, contenido_bulto')" },
    { nombre: 'la fábrica le gana al catálogo',
      de: '      const contenido = delCatalogo ?? (delStock && delStock > 0 ? delStock : null)',
      a: '      const contenido = (delStock && delStock > 0 ? delStock : null) ?? delCatalogo' },
    { nombre: 'sin catálogo no se usa la fábrica (el azúcar sin bulto)',
      de: '      const contenido = delCatalogo ?? (delStock && delStock > 0 ? delStock : null)',
      a: '      const contenido = delCatalogo' },
    { nombre: 'un 0 del catálogo cuenta como bulto',
      de: '      const delCatalogo = cat && cat.contenido > 0 ? cat.contenido : null',
      a: '      const delCatalogo = cat && cat.contenido !== null ? cat.contenido : null' },
    { nombre: 'la vista del catálogo no cuenta (la lecitina sin stock por kg)',
      de: "      return { contenido, vista: s?.vista_preferida ?? cat?.vista ?? 'base' }",
      a: "      return { contenido, vista: s?.vista_preferida ?? 'base' }" },
    { nombre: 'el catálogo se lee cada vez',
      de: '      if (estado.bultosCatalogo) return\n', a: '      if (false) return\n' },
    { nombre: 'un catálogo que no se lee rompe los costos',
      de: "        console.error('No se pudo leer lo que trae cada bulto en el catálogo:', err)",
      a: '        throw err' },
    { nombre: 'un catálogo que no se lee queda vacío para siempre',
      de: "        console.error('No se pudo leer lo que trae cada bulto en el catálogo:', err)",
      a: '        estado.bultosCatalogo = new Map()' },
    { nombre: 'el catálogo sin pasar el texto a número',
      de: '.map(i => [i.id, { contenido: numeroCosto(i.contenido_bulto), vista: i.vista_preferida ?? null }])',
      a: '.map(i => [i.id, { contenido: i.contenido_bulto, vista: i.vista_preferida ?? null }])' },
    // ── d) La unidad de los lotes sin ingreso ────────────────────────────
    { nombre: 'el renglón no guarda la unidad de la base',
      de: '        unidad_medida: unidadSinIngreso(x.unidad_medida),\n', a: "        unidad_medida: 'kg',\n" },
    { nombre: 'la pantalla dice siempre kg',
      de: 'formatearCantidadStock(g.kg, unidadSinIngreso(g.unidad_medida))', a: "formatearCantidadStock(g.kg, 'kg')" },
    { nombre: 'la unidad sin escapar',
      de: '${esc(formatearCantidadStock(g.kg, unidadSinIngreso(g.unidad_medida)))}', a: '${formatearCantidadStock(g.kg, unidadSinIngreso(g.unidad_medida))}' },
    { nombre: 'la unidad sin recortar (en blanco no cae a kg)',
      de: "      const t = String(u ?? '').trim()\n", a: "      const t = String(u ?? '')\n" },
    { nombre: 'sin respaldo kg',
      de: "      return t || 'kg'\n", a: "      return t || ''\n" },
  ],
})
