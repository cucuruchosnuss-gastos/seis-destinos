// Suite: Conos de papel (modulos/conos.html, 10/10/2026).
//
// Se EJECUTA el código real de la pantalla (las funciones puras y el armado
// de la orden de compra) con los datos de la maqueta (datos-maqueta/conos.js):
// los botones que suman, quién ve qué pestaña (Mauricio: ver + recibir), que no
// se asigna más que el total del pliego, las cuentas de la O.C. del 321
// ($ 2.160.000 + 21 % = $ 2.613.600), los logos nuevos en rojo, sin permiso de
// precios ningún precio, y el escape de todo lo que viene de la base.
//
//   node pruebas/test-conos.js
//   ARCHIVO_TEST=otra-copia.html node pruebas/test-conos.js

const path = require('path')
const { construirCon } = require('./sandbox')
const { arnes } = require('./circuito-comun')
const { fuenteNumeros } = require('./numeros-comun')
const DATOS = require('./datos-maqueta/conos')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/conos.html')
console.log(`ARCHIVO ${ARCHIVO} (${require('fs').readFileSync(ARCHIVO, 'utf8').length} bytes)`)
const { chk, fin } = arnes()

const FUNCIONES = ['esc', 'nombrePapel', 'miles', 'plata', 'precio3', 'hoyAr', 'fechaCorta', 'sumarCantidad', 'permisosDe',
  'vistasDe', 'diasAlcanza', 'textoAlcanza', 'alertasStock', 'conoEnUso', 'normalizarBusqueda', 'agruparPorPapel',
  'precioVigente', 'precioDeCelda', 'cuentasPliego', 'asignadoDe', 'chequeoAsignar', 'textoAsignado', 'numeroOC',
  'nombreArchivoOC', 'renglones', 'itemsOrdenados', 'htmlOrdenCompra']
const CONSTANTES = ['NOMBRE_PAPEL', 'ORDEN_PAPELES', 'TAMANOS_PLIEGO', 'BOTONES_ANOTAR', 'BOTONES_PLIEGO', 'IVA_PCT',
  'DIAS_AVISO', 'MOSTRAR_NEGATIVOS_CONOS', 'RENGLONES_MINIMOS_OC', 'ZONA_AR']
const S = construirCon(ARCHIVO, {
  preludio: fuenteNumeros(), funciones: FUNCIONES, constantes: CONSTANTES,
  retorno: CONSTANTES.join(', '),
})

// ── 1. Los botones SUMAN ────────────────────────────────────────────────────
{
  const valor = t => S.BOTONES_ANOTAR.find(b => b.texto === t)?.n
  chk('×½ = 5.000, ×1 = 10.000, ×2 = 20.000, ×3 = 30.000, ×4 = 40.000',
    valor('×½') === 5000 && valor('×1') === 10000 && valor('×2') === 20000 && valor('×3') === 30000 && valor('×4') === 40000)
  let c = null
  c = S.sumarCantidad(c, valor('×1'))
  c = S.sumarCantidad(c, valor('×½'))
  c = S.sumarCantidad(c, valor('×4'))
  chk('×1 + ×½ + ×4 = 55.000 (suman, no reemplazan)', c === 55000, c)
  chk('sumar sobre lo tipeado (12.000 + ×2 = 32.000)', S.sumarCantidad(12000, 20000) === 32000)
  chk('vacío cuenta como cero', S.sumarCantidad('', 10000) === 10000 && S.sumarCantidad(undefined, 5000) === 5000)
  chk('en el pliego, los botones son 5.000 y 10.000', S.BOTONES_PLIEGO.join() === '5000,10000')
  chk('los dos tamaños de pliego: 120.000 y 240.000', S.TAMANOS_PLIEGO.join() === '120000,240000')
}

// ── 2. Quién ve qué ─────────────────────────────────────────────────────────
{
  const claves = p => S.vistasDe(p).map(v => v.clave).join()
  const pablo = S.permisosDe(['ver', 'pedir', 'precios', 'recibir'], false)
  chk('Pablo (las cuatro): Por pedir primero, Stock, Pliegos, Todos los conos y Precios', claves(pablo) === 'porpedir,stock,pliegos,todos,precios', claves(pablo))
  const mauricio = S.permisosDe(['ver', 'recibir'], false)
  chk('Mauricio (ver + recibir): Stock, Pendientes de entrega y Todos los conos', claves(mauricio) === 'stock,entregas,todos', claves(mauricio))
  chk('Mauricio no ve "Por pedir" ni precios', !mauricio.pedir && !mauricio.precios && !claves(mauricio).includes('porpedir') && !claves(mauricio).includes('precios'))
  chk('"Pendientes de entrega" se llama así', S.vistasDe(mauricio).find(v => v.clave === 'entregas')?.texto === 'Pendientes de entrega')
  chk('super_admin: todo', claves(S.permisosDe([], true)) === 'porpedir,stock,pliegos,todos,precios')
  chk('solo precios: solo Precios del papel', claves(S.permisosDe(['precios'], false)) === 'precios')
  chk('sin tareas: nada (la pantalla dice que no tiene acceso)', S.vistasDe(S.permisosDe([], false)).length === 0)
  chk('solo recibir sin ver: nada (no puede leer los pliegos)', S.vistasDe(S.permisosDe(['recibir'], false)).length === 0)
}

// ── 3. No se asigna más que el total ────────────────────────────────────────
{
  const its = [{ marca_id: 'a', cantidad: 200000 }, { marca_id: 'b', cantidad: 30000 }]
  const no = S.chequeoAsignar(its, 240000, 'c', 20000)
  chk('230.000 asignados + 20.000 no entra en 240.000', no.ok === false && no.error === 'No entra: quedan 10.000 por asignar en este pliego.', no.error)
  const si = S.chequeoAsignar(its, 240000, 'c', 10000)
  chk('+ 10.000 entra justo: falta 0', si.ok && si.asignado === 240000 && si.falta === 0)
  const mismo = S.chequeoAsignar(its, 240000, 'b', 40000)
  chk('cambiar la cantidad de un cono que ya está REEMPLAZA la suya (200.000 + 40.000 entra)', mismo.ok && mismo.asignado === 240000)
  chk('negativo: no', S.chequeoAsignar(its, 240000, 'c', -1).ok === false)
  chk('el texto de arriba: "Asignado 230.000 de 240.000 · faltan 10.000"', S.textoAsignado(230000, 240000) === 'Asignado 230.000 de 240.000 · faltan 10.000')
  chk('completo', S.textoAsignado(240000, 240000) === 'Asignado 240.000 de 240.000 · completo')
  chk('asignadoDe suma las cantidades', S.asignadoDe(its) === 230000 && S.asignadoDe(null) === 0)
}

// ── 4. Las cuentas y el precio ──────────────────────────────────────────────
{
  const c = S.cuentasPliego(240000, 9, 21)
  chk('O.C. del 321: 240.000 × $ 9 = $ 2.160.000', c.subtotal === 2160000)
  chk('IVA 21 % = $ 453.600', c.impuesto === 453600)
  chk('total $ 2.613.600', c.total === 2613600)
  const n = S.cuentasPliego(240000, 6.75, 21)
  chk('obra nature: 240.000 × 6,75 = 1.620.000 + 340.200 = 1.960.200', n.subtotal === 1620000 && n.impuesto === 340200 && n.total === 1960200)
  const sin = S.cuentasPliego(240000, null, 21)
  chk('sin precio: subtotal, impuesto y total en null (se muestran "—", nunca $ 0)', sin.subtotal === null && sin.total === null && S.plata(sin.total) === '—')
  const precios = DATOS.tablas.cono_papel_precios
  chk('precio vigente de obra 240.000: $ 9', S.precioVigente(precios, 'obra', 240000, '2026-10-10') === 9)
  chk('obra 120.000 usa el más parecido (240.000): $ 9', S.precioVigente(precios, 'obra', 120000, '2026-10-10') === 9)
  chk('antes de que rija, no hay precio', S.precioVigente(precios, 'obra', 240000, '2026-09-01') === null)
  const dos = [...precios, { papel: 'obra', cantidad: 120000, precio_unitario: 10, vigente_desde: '2026-09-01' }]
  chk('con precio para 120.000 y para 240.000, cada pliego usa el de su tamaño (aunque el otro sea más nuevo)',
    S.precioVigente(dos, 'obra', 120000, '2026-10-10') === 10 && S.precioVigente(dos, 'obra', 240000, '2026-10-10') === 9)
  const futuro = [...precios, { papel: 'obra', cantidad: 240000, precio_unitario: 10, vigente_desde: '2026-11-01' }]
  chk('un precio futuro no rige todavía', S.precioVigente(futuro, 'obra', 240000, '2026-10-10') === 9)
  const celda = S.precioDeCelda(futuro, 'obra', 240000, '2026-10-10')
  chk('la celda dice el vigente y el que viene', celda.vigente?.precio_unitario === 9 && celda.futuro?.precio_unitario === 10 && celda.historial.length === 2)
  chk('una celda sin precio: vigente null ("sin cargar")', S.precioDeCelda(precios, 'obra', 120000, '2026-10-10').vigente === null)
  chk('el precio por cono con 3 decimales: "9,000"', S.precio3(9) === '9,000' && S.precio3(6.75) === '6,750')
}

// ── 5. Para cuántos días alcanza ────────────────────────────────────────────
{
  chk('6.000 con 9.000 en 30 días: ~20 días', S.diasAlcanza(6000, 9000) === 20)
  chk('sin consumo: null ("sin consumo")', S.diasAlcanza(10000, 0) === null && S.textoAlcanza(null) === 'sin consumo')
  chk('stock negativo: 0 ("no alcanza")', S.diasAlcanza(-2000, 4000) === 0 && S.textoAlcanza(0) === 'no alcanza')
  const { negativos, pocos } = S.alertasStock(DATOS.rpc.conos_stock)
  // Por ahora (21/10/2026) los negativos NO se muestran: FIBRO no se avisa.
  // Lo de las dos posiciones de la constante está en test-conos-negativos.js.
  chk('arriba: FIBRO (negativo) NO se avisa mientras no se muestren los negativos', negativos.length === 0 && S.MOSTRAR_NEGATIVOS_CONOS === false)
  chk('arriba: CASERATO alcanza para menos de 30 días', pocos.map(f => f.cono).join() === 'CASERATO', pocos.map(f => f.cono).join())
  chk('un cono apagado y en cero no se lista; uno con stock sí', !S.conoEnUso({ activa: false, stock: 0, en_camino: 0, en_armado: 0, consumo_30d: 0 }) && S.conoEnUso({ activa: false, stock: 5 }))
}

// ── 6. Por pedir, agrupado por papel ────────────────────────────────────────
{
  const g = S.agruparPorPapel(DATOS.rpc.conos_por_pedir)
  chk('obra blanco primero, con su total: 190.000', g[0].papel === 'obra' && g[0].total === 190000, JSON.stringify(g.map(x => [x.papel, x.total])))
  chk('ilustración después: 20.000', g[1].papel === 'ilustracion' && g[1].total === 20000)
  chk('nombres de los papeles', S.nombrePapel('obra') === 'Obra blanco' && S.nombrePapel('obra_nature') === 'Obra nature' && S.nombrePapel('ilustracion') === 'Ilustración')
}

// ── 7. La orden de compra del 321 ───────────────────────────────────────────
const nombres = new Map(DATOS.rpc.conos_stock.map(c => [c.marca_id, c.cono]))
const nombreDe = id => nombres.get(id) ?? 'Cono'
const P321 = DATOS.tablas.cono_pliegos.find(p => p.numero === 321)
const ITEMS321 = DATOS.tablas.cono_pliego_items.filter(i => i.pliego_id === P321.id)
const CONFIG = Object.fromEntries(DATOS.tablas.conos_config.map(c => [c.clave, c.valor]))
const PAPEL = DATOS.tablas.cono_papeles.find(p => p.papel === 'obra')
const NUSS = DATOS.tablas.unidades_negocio[0]
const oc = (extra = {}) => S.htmlOrdenCompra({ pliego: P321, items: ITEMS321, papel: PAPEL, config: CONFIG, nuss: NUSS, nombreDe, precio: 9, conPrecios: true, ...extra })
{
  const h = oc()
  const texto = h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
  chk('dice ORDEN DE COMPRA', /ORDEN DE COMPRA/.test(h))
  chk('FECHA 29/09/2026 y O.C. Nº 321', /FECHA<\/span><span>29\/09\/2026<\/span><span>O\.C\. Nº<\/span><span>321<\/span>/.test(h))
  chk('PROVEEDOR: MUSUMECI SRL, en renglones', /PROVEEDOR<\/div>\s*<p>MUSUMECI SRL<\/p><p>At\. Adrián Musumeci<\/p>/.test(h))
  chk('RAZÓN SOCIAL: PAZ MIRTA, CUIT, domicilio y teléfono', /PAZ MIRTA/.test(h) && /C\.U\.I\.T: 20-92410679-5/.test(h) && /<p>Las Gredas 2555<\/p><p>Córdoba Capital<\/p>/.test(h) && /Teléfono: 3513125236/.test(h))
  chk('SOLICITANTE Pablo y ENVIAR VÍA Transporte Propio', /SOLICITANTE<\/div><div class="oc-valor">Pablo/.test(h) && /ENVIAR VÍA<\/div><div class="oc-valor">Transporte Propio/.test(h))
  chk('las columnas CÓDIGO / DESCRIPCIÓN / CANT. / PRECIO UNIT. / IVA / TOTAL', /CÓDIGO<\/th><th>DESCRIPCIÓN<\/th><th[^>]*>CANT\.<\/th><th[^>]*>PRECIO UNIT\.<\/th><th[^>]*>IVA<\/th><th[^>]*>TOTAL<\/th>/.test(h))
  chk('la primera línea es la descripción del papel', h.indexOf('Papel Obra Blanco 70 gramos') < h.indexOf('ASPEN'))
  chk('ASPEN 50.000 · 9,000 · X · 450.000,00', /<td>ASPEN<\/td><td class="n">50\.000<\/td><td class="n">9,000<\/td><td class="c">X<\/td><td class="n">450\.000,00<\/td>/.test(h))
  chk('un renglón por cono (16) y en orden alfabético', (h.match(/<td class="c">X<\/td><td class="n">[\d.]+,00<\/td>/g) || []).length === 16 && h.indexOf('>ASPEN<') < h.indexOf('>CASERATO<') && h.indexOf('>WOLLEN<') < h.indexOf('>YOMO<'))
  chk('los logos nuevos (FIBRO y HELANUS) van en ROJO en la tabla', /<tr class="oc-logo"><td><\/td><td>FIBRO<\/td>/.test(h) && /<tr class="oc-logo"><td><\/td><td>HELANUS<\/td>/.test(h) && !/<tr class="oc-logo"><td><\/td><td>ASPEN/.test(h))
  chk('el rojo de la tabla está en el CSS de la hoja', /\.oc-tabla tr\.oc-logo td:not\(:first-child\) \{ color: #D00000/.test(require('fs').readFileSync(ARCHIVO, 'utf8')))
  chk('la cantidad total: 240.000', /<tr class="oc-final"><td>0<\/td><td><\/td><td class="n">240\.000<\/td>/.test(h))
  chk('SUBTOTAL 2.160.000,00 · IMPONIBLE · 21,000% · IMPUESTO 453.600,00 · TOTAL $2.613.600,00',
    /SUBTOTAL<\/td><td class="n">2\.160\.000,00/.test(h) && /IMPONIBLE<\/td><td class="n">2\.160\.000,00/.test(h)
    && /21,000%/.test(h) && /IMPUESTO<\/td><td class="n">453\.600,00/.test(h) && /TOTAL<\/td><td class="n">\$2\.613\.600,00/.test(h))
  chk('"FECHA DE ENTREGA: 01/10/2026"', /<b>FECHA DE ENTREGA<\/b>: 01\/10\/2026/.test(h))
  chk('"Se adjunta Logos Nuevos:" y en rojo "FIBRO, HELANUS"', /Se adjunta Logos Nuevos:<\/p>\s*<p class="oc-rojo">FIBRO, HELANUS<\/p>/.test(h))
  chk('los comentarios del pliego', /<p><b>PAPEL OBRA BLANCO 70<\/b><\/p>/.test(h))
  chk('rellena hasta 15 renglones como mínimo (con 4 conos, 11 vacíos)', (() => {
    const h4 = oc({ items: ITEMS321.slice(0, 4) })
    return (h4.match(/<td class="n">-<\/td><td class="c">X<\/td><td class="n">-<\/td>/g) || []).length === 1 + 11
  })())
  chk('con versión 2: "O.C. Nº 321 · v2"', /O\.C\. Nº<\/span><span>321 · v2<\/span>/.test(oc({ pliego: { ...P321, version: 2 } })))
  chk('el archivo: Pliego-321-Musumeci.pdf / Pliego-321-v2-Musumeci.pdf', S.nombreArchivoOC(P321) === 'Pliego-321-Musumeci.pdf' && S.nombreArchivoOC({ ...P321, version: 2 }) === 'Pliego-321-v2-Musumeci.pdf')
  chk('sin logos nuevos: "Se adjunta Logos Nuevos: —"', /Se adjunta Logos Nuevos: —/.test(oc({ items: ITEMS321.map(i => ({ ...i, logo_nuevo: false })) })))
  chk('el logo de Nuss arriba', /<img src="\.\.\/logo-cucuruchos-nuss\.png"/.test(h))
  chk('texto plano sin "undefined" ni "NaN"', !/undefined|NaN/.test(texto))
}
// Sin permiso de precios: ningún precio.
{
  const h = oc({ conPrecios: false })
  chk('sin precios: no aparece 9,000 ni 2.613.600 ni 2.160.000', !/9,000/.test(h) && !/2\.613\.600/.test(h) && !/2\.160\.000/.test(h) && !/450\.000/.test(h))
  chk('sin precios: las cantidades sí (50.000 y 240.000)', /50\.000/.test(h) && /240\.000/.test(h))
}
// XSS: lo que viene de la base, escapado.
{
  const malo = '"><img src=x onerror=alert(1)>'
  const h = S.htmlOrdenCompra({
    pliego: { ...P321, comentarios: malo + ' · ' + malo, fecha_pedido: malo }, items: [{ marca_id: 'm', cantidad: 10000, logo_nuevo: true }],
    papel: { descripcion_oc: malo }, config: { oc_razon_social: malo, oc_cuit: malo, oc_domicilio: malo, oc_telefono: malo, oc_solicitante: malo, oc_envio: malo, oc_proveedor_texto: malo },
    nuss: { domicilio: malo, telefono: malo }, nombreDe: () => malo, precio: 9, conPrecios: true,
  })
  chk('ningún <img del texto llega crudo a la O.C.', !/<img src=x/.test(h), h.match(/<img src=x[^>]*/)?.[0])
  chk('se ve escapado', /&lt;img src=x onerror=alert\(1\)&gt;/.test(h))
  chk('esc() escapa las cinco', S.esc('<a href="x">&\'') === '&lt;a href=&quot;x&quot;&gt;&amp;&#39;')
}

// ── 8. Formatos ─────────────────────────────────────────────────────────────
{
  chk('miles: 240.000; ausente "—" (nunca 0)', S.miles(240000) === '240.000' && S.miles(null) === '—' && S.miles('') === '—')
  chk('plata: $ 2.613.600,00', S.plata(2613600) === '$ 2.613.600,00')
  chk('fechaCorta: 01/10/2026', S.fechaCorta('2026-10-01') === '01/10/2026' && S.fechaCorta(null) === '—')
  chk('hoy en Argentina (a las 01:00 UTC todavía es el día anterior)', S.hoyAr(new Date('2026-10-11T01:00:00Z')) === '2026-10-10')
  chk('renglones de la config: separa por " · "', S.renglones('A · B ·  C').join('|') === 'A|B|C' && S.renglones(null).length === 0)
  chk('numeroOC sin versión: "321"', S.numeroOC(P321) === '321')
}

fin()
