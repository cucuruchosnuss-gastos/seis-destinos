// Mutaciones de Buscar → "Precios" (ver test-buscar-precios.js). Muta
// modulos/buscar.html: cada esc() de la fila y del historial (automáticas) y
// el buscador, la copia de Stock y de qué fábrica se piden (a mano).
//
//   node pruebas/mut-buscar-precios.js
const path = require('path')
const { correrMutacionesEn } = require('./mutar')

correrMutacionesEn({
  suite: path.join(__dirname, 'test-buscar-precios.js'),
  original: path.join(__dirname, '..', 'modulos', 'buscar.html'),
  funciones: ['htmlFilaPrecio', 'htmlHistorialPrecios', 'pintarChipsPrecios', 'pintarListaPrecios'],
  equivalentes: [
    { expr: 'esc(textoIvaPrecio(f.alicuota_iva))', motivo: 'número: textoIvaPrecio formatea un numeric (o "—")' },
  ],
  manuales: [
    // La copia de Stock
    { nombre: 'el precio chico con 2 decimales', de: 'plataCosto(v, Math.abs(v) < 10 ? 4 : 2)', a: 'plataCosto(v, 2)' },
    { nombre: 'la factura A sin su nombre', de: "factura_a: 'Factura A', ", a: '' },
    { nombre: 'una compra sin proveedor', de: "return ['Compra', f.proveedor, textoComprobante(f.comprobante), fecha]", a: "return ['Compra', textoComprobante(f.comprobante), fecha]" },
    { nombre: 'las compras de todas las fábricas', de: '.filter(c => c?.materia_prima_ingresos?.unidad_negocio_id === unidad && numeroCosto', a: '.filter(c => numeroCosto' },
    { nombre: 'el bulto sin IVA', de: 'plataCosto(Math.round(fin * c * 100) / 100)', a: "plataCosto(Math.round(numeroCosto(f.precio_unitario) * c * 100) / 100)" },
    { nombre: 'el normalizar sin sacar acentos', de: ".normalize('NFD').replace(/[\\u0300-\\u036f]/g, '')", a: ".normalize('NFD')" },
    // El buscador
    { nombre: 'el buscador no mira la marca', de: "const texto = normalizar(`${f.insumo} ${f.marca || ''}`)", a: 'const texto = normalizar(f.insumo)' },
    { nombre: 'el buscador pide la frase entera', de: '        return palabras.every(p => texto.includes(p))', a: "        return texto.includes(palabras.join(' '))" },
    { nombre: 'el buscador con alguna palabra alcanza', de: '        return palabras.every(p => texto.includes(p))', a: '        return !palabras.length || palabras.some(p => texto.includes(p))' },
    { nombre: 'la cuenta no dice cuántos de cuántos', de: "return visibles === total ? plural(", a: 'return true ? plural(' },
    // La fila y el historial
    { nombre: 'la fila sin el bulto', de: "${bulto ? `<span class=\"bu-precio__bulto\" data-col=\"bulto\">${esc(`Por ${bulto}`)}</span>` : ''}", a: '' },
    { nombre: 'la fila sin de dónde salió', de: '<span class="bu-precio__origen">${esc(textoOrigenPrecio(f))}</span>', a: '' },
    { nombre: 'el final muestra el precio sin IVA', de: '${esc(`${plataPrecioCompra(f.precio_final)} ${unidad}`)}', a: '${esc(`${plataPrecioCompra(f.precio_unitario)} ${unidad}`)}' },
    { nombre: 'el anulado no se tacha', de: "<div class=\"bu-hist${m.anulado ? ' bu-hist--anulado' : ''}\" data-hist=\"manual\">", a: '<div class="bu-hist" data-hist="manual">' },
    { nombre: 'el error de las compras no se dice', de: "const avisoCompras = h.errorCompras ?", a: 'const avisoCompras = false ?' },
    // De qué fábrica
    { nombre: 'con "Todas" y una sola fábrica pregunta igual', de: '      if (lista.length === 1) return lista[0].id\n', a: '' },
    { nombre: 'la barra no manda', de: '      if (estado.unidadBarra) return lista.some(u => u.id === estado.unidadBarra) ? estado.unidadBarra : null', a: '      if (false) return null' },
    { nombre: 'sin permiso en la barra muestra igual', de: "      if (estado.unidadBarra && !lista.some(u => u.id === estado.unidadBarra)) {\n        pintarAviso('bu-precios-aviso', `No tenés", a: "      if (false) {\n        pintarAviso('bu-precios-aviso', `No tenés" },
    { nombre: 'los chips se ven con la barra en una fábrica', de: '      cont.hidden = !!estado.unidadBarra || lista.length < 2', a: '      cont.hidden = lista.length < 2' },
    { nombre: 'el error de la base no va tal cual', de: "        p.error = mensajeDe(error)\n      } else {\n        p.filas", a: "        p.error = 'error'\n      } else {\n        p.filas" },
    { nombre: 'una respuesta vieja pisa a la nueva', de: '      if (turno !== p.turno) return\n', a: '' },
    { nombre: 'el historial se vuelve a leer cada vez', de: '      if (!p.historiales.has(insumoId)) {', a: '      if (true) {' },
    { nombre: 'tocar otra vez no lo cierra', de: '      if (p.abierto === insumoId) { p.abierto = null; pintarListaPrecios(); return }\n', a: '' },
    { nombre: 'los cargados a mano de todas las fábricas', de: ".eq('unidad_negocio_id', unidad).eq('insumo_id', insumoId)", a: ".eq('insumo_id', insumoId)" },
  ],
})
