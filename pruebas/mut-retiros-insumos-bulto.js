// Mutaciones de los insumos POR BULTO en la Carga de órdenes de retiro
// (23/10/2026, modulos/retiros.html). Cada una rompe la regla a propósito y
// test-retiros-insumos-bulto.js tiene que dar rojo. Corren de a una.
//
//   node pruebas/mut-retiros-insumos-bulto.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-retiros-insumos-bulto.js'),
  original: path.join(__dirname, '..', 'modulos/retiros.html'),
  funciones: [],
  manuales: [
    { nombre: 'el catálogo no trae la vista',
      de: ".select('id, nombre, marca, categoria, unidad_medida, vista_preferida').eq('activo', true)",
      a: ".select('id, nombre, marca, categoria, unidad_medida').eq('activo', true)" },
    { nombre: 'no se lee lo que trae un bulto',
      de: '      return conBultosDeInsumos(cat, t.error ? [] : t.data, await leerContenidosInsumos(unidadId))',
      a: '      return cat' },
    { nombre: 'si falla la lectura del contenido, se cae el catálogo',
      de: "      } catch (err) {\n        console.error('No se pudo leer lo que trae cada bulto:', err)\n      }",
      a: '      } finally {}' },
    { nombre: 'ignora la vista del insumo (la lecitina en bultos)',
      de: '        unidad: r.unidad ?? ins?.unidad_medida, vista: ins?.vista_preferida,',
      a: "        unidad: r.unidad ?? ins?.unidad_medida, vista: 'bulto'," },
    { nombre: 'EL BUG: la bolsa se guarda como 1 kg (no convierte lo escrito)',
      de: '      const { base, error } = cantidadDesdeCampo(escrito, modoInsumoRenglon(r))\n      r.cantidad = base',
      a: '      const { base, error } = { base: escrito, error: null }\n      r.cantidad = base' },
    { nombre: 'el campo vuelve a decir los kilos',
      de: '      return desdeUnidadBase(base, modo) ?? r3(Number(base) / modo.contenido)',
      a: '      return Number(base)' },
    { nombre: '"+" suma un kilo en vez de un bulto',
      de: '      const paso = modo?.enBultos ? modo.contenido : 1',
      a: '      const paso = 1' },
    { nombre: 'sin el "= 50 kg" debajo',
      de: "      return n === null ? '' : '= ' + cantidadInsumoHoja(n, r.unidad)",
      a: "      return ''" },
    { nombre: 'el lote guarda lo escrito sin convertir',
      de: 'ponerCantidadLote(t.dataset.rLoteCant, t.dataset.lote, r?.insumoId ? cantidadDesdeCampo(escrito, modoInsumoRenglon(r)).base : escrito)',
      a: 'ponerCantidadLote(t.dataset.rLoteCant, t.dataset.lote, escrito)' },
    { nombre: 'el campo no dice "bultos de 25 kg"',
      de: "¿Cuánto se lleva? (${esc(modo?.enBultos ? modo.rotulo : (unidadHoja(r.unidad) || 'unidad'))})",
      a: "¿Cuánto se lleva? (${esc(unidadHoja(r.unidad) || 'unidad')})" },
    { nombre: 'al lado del lote dice "kg"',
      de: "${esc(r.insumoId ? (modoInsumoRenglon(r)?.enBultos ? 'bultos' : unidadCorta(r.unidad)) : 'cajas')}",
      a: "${esc(r.insumoId ? unidadCorta(r.unidad) : 'cajas')}" },
    { nombre: '"quedan" y "hay" sin los bultos',
      de: '      if (!modo?.enBultos || n === null || n === undefined || n === \'\') return cantidadInsumoHoja(n, r.unidad)',
      a: '      return cantidadInsumoHoja(n, r.unidad)' },
    { nombre: 'en bultos, sin los kilos al lado',
      de: "      return textoSegunVista({ cantidad: n, unidad: r.unidad, vista: 'bulto', contenido: modo.contenido }, { conKilos: true })",
      a: "      return textoSegunVista({ cantidad: n, unidad: r.unidad, vista: 'bulto', contenido: modo.contenido })" },
    { nombre: 'la tarjeta del renglón en kilos',
      de: "        return { q: formatearNumeroAr(b, { decimales: 3, minimos: 0 }), u: modo.rotulo }",
      a: "        return { q: cantidadInsumoHoja(n, r.unidad).replace(/ \\S+$/, ''), u: unidadHoja(r?.unidad) || '' }" },
    { nombre: 'la opción del catálogo en kilos',
      de: "      const cuanto = o.grupo === 'insumos' ? cantidadRenglon({ insumoId: o.insumoId, unidad: o.unidad }, o.stock) : `${enteroHoja(o.stock)} cajas`",
      a: "      const cuanto = o.grupo === 'insumos' ? cantidadInsumoHoja(o.stock, o.unidad) : `${enteroHoja(o.stock)} cajas`" },
    { nombre: 'la hoja no sabe lo que trae un bulto',
      de: '            contenido: contenidoParaHoja(r.insumo_id, r.unidad_medida) }',
      a: '            contenido: null }' },
  ],
})
