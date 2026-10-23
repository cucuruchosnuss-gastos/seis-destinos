// Mutaciones de los insumos POR BULTO en Administración (23/10/2026):
// modulos/administracion.html (valorizar, la orden, la lista de precios) y
// js/retiros-comun.js (la hoja), que la suite recibe por
// ARCHIVO_COMUN_RETIROS. Cada una rompe la regla a propósito y
// test-administracion-insumos-bulto.js tiene que dar rojo. Corren de a una.
//
//   node pruebas/mut-administracion-insumos-bulto.js

const path = require('path')
const { correrMutacionesEnVarios } = require('./mutar')

const RAIZ = path.join(__dirname, '..')
const SUITE = path.join(__dirname, 'test-administracion-insumos-bulto.js')

correrMutacionesEnVarios([
  {
    suite: SUITE,
    original: path.join(RAIZ, 'modulos/administracion.html'),
    funciones: [],
    manuales: [
      // De dónde sale lo que trae un bulto
      { nombre: 'lee el contenido sin stock:ver',
        de: "      if (!unidadId || !puedeEn('stock', 'ver', unidadId)) return m",
        a: '      if (!unidadId) return m' },
      { nombre: 'el catálogo no trae la vista',
        de: ".select('id, nombre, marca, unidad_medida, categoria, activo, vista_preferida').order('categoria')",
        a: ".select('id, nombre, marca, unidad_medida, categoria, activo').order('categoria')" },
      { nombre: 'el catálogo no le suma el contenido a cada insumo',
        de: '        insumos: (insumos ?? []).map(i => ({ ...i, contenido: contenidos.get(i.id) ?? null })),',
        a: '        insumos: insumos ?? [],' },
      { nombre: 'los movimientos de la orden sin contenido_por_bulto',
        de: ".select('insumo_id, lote, cantidad, contenido_por_bulto').eq('orden_retiro_id', id)",
        a: ".select('insumo_id, lote, cantidad').eq('orden_retiro_id', id)" },
      { nombre: 'los lotes del renglón no mandan (dos presentaciones van por bulto)',
        de: '      const contenido = propios.length ? contenidoUnico(propios) : (ins?.contenido ?? null)',
        a: '      const contenido = ins?.contenido ?? null' },
      { nombre: 'ignora la vista del insumo (la lecitina por bulto)',
        de: '      return modoDePrecio({ unidad: ins?.unidad_medida, vista: ins?.vista_preferida, contenido })',
        a: "      return modoDePrecio({ unidad: ins?.unidad_medida, vista: 'bulto', contenido })" },
      // La orden
      { nombre: 'la orden dice la cantidad en kilos',
        de: "        desc = cant.texto + ' · ' + [pi.nombre, pi.marca]",
        a: "        desc = cantidadInsumoHoja(it.cantidad, pi.unidad) + ' · ' + [pi.nombre, pi.marca]" },
      { nombre: 'sin el total en kilos debajo',
        de: "        detalle = (cant.kilos ? cant.kilos + ' · ' : '') + 'Insumo · '",
        a: "        detalle = 'Insumo · '" },
      { nombre: 'el precio guardado se muestra por kilo aunque sea por bulto',
        de: '        const precio = modo?.porBulto\n          ? precioDesdeBase(',
        a: '        const precio = false\n          ? precioDesdeBase(' },
      { nombre: 'el precio guardado vuelve multiplicando (17.499,90)',
        de: "          ? precioDesdeBase(it.precio_caja, modo, { decimalesBase: 2, subtotal: it.subtotal, cantidad: it.cantidad })",
        a: "          ? Math.round(it.precio_caja * modo.contenido * 100) / 100" },
      { nombre: 'sin el precio por kilo chico debajo',
        de: "          (modo?.porBulto ? `<div class=\"ad-texto-suave ad-renglon__por-base\">${esc(textoPrecioPorBase(it.precio_caja, modo, moneda))}</div>` : '') + '</div>'",
        a: "          '</div>'" },
      // Valorizar
      { nombre: 'valorizar no pasa los precios de la lista a bulto',
        de: '      prepararPreciosPorBulto(d, vigente)\n      v.cargando = false',
        a: '      v.cargando = false' },
      { nombre: 'EL BUG: lo escrito por bulto viaja como precio por kilo',
        de: '        d.valorizar.precios[itemId] = precioABase(valor, modo)',
        a: '        d.valorizar.precios[itemId] = valor' },
      { nombre: 'lo que se manda no se recalcula desde lo que se ve',
        de: '        v.precios[it.id] = precioABase(bulto, modo)\n',
        a: '' },
      // La lista de precios
      { nombre: 'la tarjeta sigue por kilo',
        de: '      const modo = modoPrecioInsumo(estado.catalogo, f.insumo_id)\n      if (f.tipo === \'costo_mas_pct\') {',
        a: '      const modo = null\n      if (f.tipo === \'costo_mas_pct\') {' },
      { nombre: 'el editor guarda lo escrito por bulto como precio por kilo',
        de: "        p_precio_unitario: ed.modo === 'fijo' ? precioABase(valor, modoPrecioInsumo(estado.catalogo, ed.insumoId)) : null,",
        a: "        p_precio_unitario: ed.modo === 'fijo' ? valor : null," },
      { nombre: 'el editor abre con el precio por kilo',
        de: "precioDesdeBase(numeroONull(f.precio_unitario), modoPrecio, { decimalesBase: 4 })) : null,",
        a: 'numeroONull(f.precio_unitario)) : null,' },
      { nombre: 'el campo del editor no dice "por bulto"',
        de: "      const unidad = modoPrecio?.porBulto ? 'por ' + modoPrecio.rotulo : porUnidadInsumo(insumo?.unidad_medida)",
        a: '      const unidad = porUnidadInsumo(insumo?.unidad_medida)' },
      { nombre: 'la grilla guarda lo escrito por bulto como precio por kilo',
        de: "          ? { insumo_id: String(clave).slice(4), precio_caja: precioABase(Number(precio), modo) }",
        a: "          ? { insumo_id: String(clave).slice(4), precio_caja: Number(precio) }" },
      { nombre: 'la grilla compara por kilo y vuelve a guardar lo que no cambió',
        de: "const actualFijo = !actual ? null : modo?.porBulto ? bultoDeVersion(actual, modo) : String(clave)",
        a: "const actualFijo = !actual ? null : String(clave)" },
      { nombre: '"Aumentar todo" sube el precio por kilo de una fila por bulto',
        de: "        const base = modo?.porBulto ? bultoDeVersion(v, modo) : f.insumoId ? precioFijoDeVersion(v) : numeroONull(v.precio_caja)",
        a: "        const base = f.insumoId ? precioFijoDeVersion(v) : numeroONull(v.precio_caja)" },
      { nombre: 'la fila de la grilla dice "por kg"',
        de: '      return modo?.porBulto ? [f.marca, \'por \' + modo.rotulo].map(limpio).filter(Boolean).join(\' · \') : f.presentacion',
        a: '      return f.presentacion' },
    ],
  },
  // ── La hoja (js/retiros-comun.js) ──────────────────────────────────────
  {
    suite: SUITE,
    variable: 'ARCHIVO_COMUN_RETIROS',
    original: path.join(RAIZ, 'js/retiros-comun.js'),
    funciones: [],
    manuales: [
      { nombre: 'la hoja dice la cantidad en kilos',
        de: '  return r?.esInsumo ? cantidadInsumoBultoHoja(r.cantidad, r.unidad, r.contenido) : enteroHoja(r?.cajas)',
        a: '  return r?.esInsumo ? cantidadInsumoHoja(r.cantidad, r.unidad) : enteroHoja(r?.cajas)' },
      { nombre: 'la hoja sin los kilos entre paréntesis',
        de: '  return r.enBultos ? `${r.cabeza} ${r.cola} (${kilos})` : kilos',
        a: '  return r.enBultos ? `${r.cabeza} ${r.cola}` : kilos' },
      { nombre: 'el precio de la hoja por kilo',
        de: '    const p = r?.esInsumo ? precioInsumoHoja(r, moneda) : importeHoja(r?.precio, moneda)',
        a: '    const p = importeHoja(r?.precio, moneda)' },
      { nombre: 'el precio de la hoja multiplica sin mirar el subtotal (17.499,90)',
        de: '  const p = importeHoja(precioDesdeBase(r?.precio, modo, { decimalesBase: 2, subtotal: r?.subtotal, cantidad: r?.cantidad }), moneda)',
        a: '  const p = importeHoja(Math.round(r?.precio * modo.contenido * 100) / 100, moneda)' },
      { nombre: 'el texto para compartir en kilos',
        de: '      lineas.push(`- ${cantidadInsumoBultoHoja(r.cantidad, r.unidad, r.contenido)} · ${nombreInsumoHoja(r)}${lotesI}`)',
        a: '      lineas.push(`- ${cantidadInsumoHoja(r.cantidad, r.unidad)} · ${nombreInsumoHoja(r)}${lotesI}`)' },
    ],
  },
])
