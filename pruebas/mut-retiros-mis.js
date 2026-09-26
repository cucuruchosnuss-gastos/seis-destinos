// Mutaciones de test-retiros-mis.js ("Mis retiros" en la carga). Ver mutar.js.
//
//   node pruebas/mut-retiros-mis.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-retiros-mis.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/retiros.html'),
  escape: 'esc',
  funciones: ['htmlFilaMia', 'htmlMisRetiros', 'htmlDetalleMio'],
  equivalentes: [
    { expr: 'esc(estado.errorMis)', motivo: 'texto constante del código: lo pone mostrarMisRetiros()' },
    { expr: 'esc(enteroHoja(cajasDeOrden(o)))', motivo: 'número formateado por enteroHoja(): solo dígitos y puntos' },
  ],
  manuales: [
    { nombre: 'lee la tabla de órdenes', de: "      const { data, error } = await supabase.rpc('mis_ordenes_retiro', { p_unidad_negocio_id: estado.empresaId, p_desde: null })", a: "      const { data, error } = await supabase.from('ordenes_retiro').select('*').eq('unidad_negocio_id', estado.empresaId)" },
    { nombre: 'pide las de otra empresa', de: "supabase.rpc('mis_ordenes_retiro', { p_unidad_negocio_id: estado.empresaId, p_desde: null })", a: "supabase.rpc('mis_ordenes_retiro', { p_unidad_negocio_id: null, p_desde: null })" },
    { nombre: 'una anulada sin sello', de: "${anulada ? '<span class=\"rt-sello\">Anulada</span>' : ''}", a: '' },
    { nombre: 'el cliente no se busca por nombre', de: '      return (estado.clientes ?? []).find(c => normalizar(c.nombre) === n) ?? { nombre: o?.cliente ?? \'Cliente\' }', a: "      return { nombre: o?.cliente ?? 'Cliente' }" },
    { nombre: 'la hoja sin quién la cargó', de: '        cargadaPor: estado.miNombre,', a: "        cargadaPor: ''," },
    { nombre: 'la hoja de la carga con precios', de: '{ conPrecios: false, copias: COPIAS_IMPRESION }', a: '{ conPrecios: true, copias: COPIAS_IMPRESION }' },
    { nombre: 'el cono con cono y sin marca no es "Común"', de: "      return pr.con_cono ? 'Común' : 'Sin cono'", a: "      return 'Sin cono'" },
    { nombre: 'la marca no se usa', de: '      if (r?.marca) return r.marca\n', a: '' },
    { nombre: 'una orden que no está se abre', de: '      const o = (estado.mis ?? []).find(x => x.orden_id === id)\n      if (!o) return', a: '      const o = (estado.mis ?? []).find(x => x.orden_id === id) ?? estado.mis?.[0]\n      if (!o) return' },
    { nombre: 'sin encontrar la hecha no se avisa', de: "        if (!o) { h.error = 'La orden se confirmó pero no se pudo leer para imprimirla. Buscala en «Mis retiros».'; pintarHecho(); return }", a: '        if (!o) { pintarHecho(); return }' },
    { nombre: 'enviar sin el mail del cliente', de: "        const r = await enviarOrden(hoja, { conPrecios: false, email: hoja.cliente?.email ?? null })", a: "        const r = await enviarOrden(hoja, { conPrecios: false, email: null })" },
    { nombre: 'el aviso de enviar no se muestra', de: "      a.hidden = !obj?.aviso", a: '      a.hidden = true' },
    { nombre: 'un error de lectura se lee como lista vacía', de: "        estado.errorMis = 'No se pudieron leer tus retiros. Revisá la conexión y volvé a entrar.'", a: '        estado.mis = []' },
  ],
})
