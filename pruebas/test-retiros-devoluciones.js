// DEVOLUCIONES Y REPOSICIONES EN LA ORDEN DE RETIRO (22/10/2026), en la CARGA
// (modulos/retiros.html), en "Mis retiros" y en la hoja (js/retiros-comun.js).
//
// El cliente trae cajas (rotura, humedad, error de pedido…). En la MISMA orden
// se carga un renglón de DEVOLUCIÓN: producto, cajas, motivo (chips + texto,
// 3 letras o más), lote que trae (opcional, hasta 40) y qué se hace:
//  - "Se descuenta de la orden" → tipo 'devolucion': NO saca stock (sin lotes);
//  - "Se reponen" → tipo 'reposicion': sale de un lote, como un retiro.
// Y las cajas devueltas: se descartan (por defecto) o vuelven al stock.
// Una orden puede tener SOLO devoluciones. La carga no muestra plata.
//
//   node pruebas/test-retiros-devoluciones.js
// Overrides: ARCHIVO_TEST (retiros.html), ARCHIVO_COMUN_RETIROS (el común).

process.env.TZ = 'UTC'

const path = require('path')
const fs = require('fs')
const { construirRetiros } = require('./sandbox-retiros')
const { RUTA_COMUN_RETIROS } = require('./fuente-cobranzas')
const { arnes } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/retiros.html')
const src = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${src.length} bytes)`)
console.log(`ARCHIVO ${RUTA_COMUN_RETIROS} (${fs.readFileSync(RUTA_COMUN_RETIROS, 'utf8').length} bytes)`)
const { chk, esperas, fin } = arnes()
const nuevo = () => construirRetiros(ARCHIVO)

const CAT = {
  productos: [
    { id: 'p-cuc', nombre: 'Cucurucho grande', categoria: 'cucuruchones' },
    { id: 'p-cho', nombre: 'Cannoli', categoria: 'especiales' },
  ],
  presentaciones: [
    { id: 'pr-cuc-sin', producto_id: 'p-cuc', nombre: 'Caja x 100', con_cono: false, unidades_por_caja: 100, stock_cajas: 40 },
    { id: 'pr-cho-sin', producto_id: 'p-cho', nombre: 'Caja x 50', con_cono: false, unidades_por_caja: 50, stock_cajas: 0 },
  ],
  marcas: [],
  insumos: [{ id: 'i-har', nombre: 'Harina 000', marca: 'Molino', categoria: 'Harinas', unidad_medida: 'kg', stock: 250 }],
}
const CLIENTES = [{ id: 'c1', nombre: 'Distribuidora Anatolia', razon_social: 'ANATOLIA SRL', apodos: [], activo: true }]

function conEmpresa(S) {
  S.estado.empresaId = 'u-n'
  S.estado.catalogo = CAT
  S.estado.catalogoEmpresa = 'u-n'
  S.estado.clientes = CLIENTES
  S.estado.form = S.formVacio()
  return S.estado.form
}
const conLotes = (S, lista) => S.estado.lotes.set(S.claveLotes('pr-cuc-sin', null), { cargando: false, error: null, lista })
const LOTES = [{ lote: '7021-1', saldo: 15, desde: '2026-10-01' }, { lote: '7022-1', saldo: 25, desde: '2026-10-02' }]

// Una orden con un retiro (10 cajas) y una devolución del mismo producto.
function conDevolucion(S, { trato = 'descuenta', cajas = 3, motivo = 'Rotura', texto = '', lote = '', destino = 'descarte' } = {}) {
  const f = conEmpresa(S)
  S.elegirCliente('c1')
  S.elegirProductoRenglon(0, 'p-cuc')
  f.renglones[0].cajas = 10
  f.editando = null
  S.agregarDevolucion()
  const i = f.editando
  S.elegirProductoRenglon(i, 'p-cuc')
  f.renglones[i].cajas = cajas
  if (motivo) S.elegirMotivoDevolucion(i, motivo)
  f.renglones[i].dev.motivoTexto = texto
  f.renglones[i].dev.lote = lote
  if (trato) S.elegirTratoDevolucion(i, trato)
  S.elegirDestinoDevolucion(i, destino)
  return { f, i }
}

// ── El botón y el renglón ───────────────────────────────────────────────────
{
  chk('la carga tiene el botón "Devolución de mercadería"', /id="rt-agregar-devolucion"[^>]*>[^<]*Devolución de mercadería</.test(src))
  const S = nuevo()
  const f = conEmpresa(S)
  S.agregarDevolucion()
  const r = f.renglones[f.editando]
  chk('abre un renglón de devolución (reusa el vacío: no apila)', f.renglones.length === 1 && S.esRenglonDev(r))
  chk('arranca: se descartan, sin motivo y sin elegir qué se hace', r.dev.destino === 'descarte' && r.dev.motivo === null && r.dev.trato === null)
  S.agregarDevolucion()
  chk('tocar de nuevo no agrega otro vacío', f.renglones.length === 1)
  const h = S.htmlEleccionRenglon(r, 0, CAT)
  chk('el catálogo de una devolución dice que es una devolución', /rt-sello--dev">Devolución</.test(h))
  chk('ofrece solo producto terminado (sin insumos)', !/data-r-insumo/.test(h) && /data-r-producto/.test(h))
  chk('y también lo que NO tiene stock (el cliente trae lo que trae)', /data-presentacion="pr-cho-sin"/.test(h))
  const hr = S.htmlEleccionRenglon({ busqueda: '' }, 0, CAT)
  chk('un retiro sigue sin mostrar lo sin stock al no buscar', !/data-presentacion="pr-cho-sin"/.test(hr) && /data-r-insumo/.test(hr))
  // Tipear en el buscador redibuja solo las opciones (en el contenedor del renglón).
  const opciones = { innerHTML: '' }
  S.__els.get('rt-renglones').querySelector = () => opciones
  S.buscarCatalogoRenglon(0, 'har')
  chk('tipear en el buscador de una devolución sigue sin insumos', r.busqueda === 'har' && !/data-r-insumo/.test(opciones.innerHTML) && /Nada coincide/.test(opciones.innerHTML), opciones.innerHTML)
  f.renglones.push(S.renglonNuevo())
  S.buscarCatalogoRenglon(1, 'har')
  chk('en un retiro el mismo texto encuentra el insumo', /data-r-insumo/.test(opciones.innerHTML))
}
{
  const S = nuevo()
  const { f, i } = conDevolucion(S, { trato: null })
  const r = f.renglones[i]
  const h = S.htmlRenglon(r, i, CAT, false)
  chk('el renglón pregunta "¿Cuántas cajas devuelve?"', /¿Cuántas cajas devuelve\?/.test(h))
  chk('los 5 motivos en chips', ['Rotura', 'Humedad', 'Vencido', 'Error de pedido', 'Otro'].every(m => h.includes(`data-valor="${m}"`)) && /data-r-dev-motivo/.test(h))
  chk('el motivo elegido marcado', /data-valor="Rotura" aria-pressed="true"/.test(h))
  chk('el lote que trae (opcional, hasta 40)', /data-r-dev-lote="1"[^>]*maxlength="40"/.test(h))
  chk('los dos botones grandes', /data-valor="descuenta"[^>]*><strong>Se descuenta de la orden</.test(h) && /data-valor="repone"[^>]*><strong>Se reponen</.test(h))
  chk('"Las cajas devueltas": se descartan (marcado) o vuelven al stock', /Las cajas devueltas/.test(h) && /data-valor="descarte" aria-pressed="true">Se descartan</.test(h) && /data-valor="stock" aria-pressed="false">Vuelven al stock</.test(h))
  chk('sin elegir qué se hace, no se agrega', S.faltanRenglon(r) === 'elegí si se descuenta de la orden o se reponen')
  chk('una devolución no pide lotes (no saca stock)', !/rt-lote__titulo/.test(h) && S.listaLotesDe(r) === null && !S.renglonConLotes(r))
  chk('el botón dice "Agregar la devolución"', /Agregar la devolución · 3 cajas/.test(h))
  chk('NADA de plata en el renglón', !/\$\s?\d|precio|importe|subtotal/i.test(h))
}

// ── El motivo: chips + texto, 3 letras o más ────────────────────────────────
{
  const S = nuevo()
  const { f, i } = conDevolucion(S, { motivo: null })
  const r = f.renglones[i]
  chk('sin motivo no se agrega', S.faltanRenglon(r) === 'elegí el motivo de la devolución')
  S.elegirMotivoDevolucion(i, 'Inventado')
  chk('un motivo que no es de la lista no se toma', r.dev.motivo === null)
  S.elegirMotivoDevolucion(i, 'Otro')
  chk('"Otro" sin texto no alcanza', S.faltanRenglon(r) === 'escribí el motivo de la devolución (al menos 3 letras)' && S.motivoDevolucion(r.dev) === null)
  r.dev.motivoTexto = ' 12 '
  chk('números no son letras', /al menos 3 letras/.test(S.faltanRenglon(r)))
  r.dev.motivoTexto = 'ab1'
  chk('dos letras no alcanzan', /al menos 3 letras/.test(S.faltanRenglon(r)))
  r.dev.motivoTexto = '  se mojó  '
  chk('"Otro" con texto: el motivo es el texto, limpio', S.faltanRenglon(r) === null && S.motivoDevolucion(r.dev) === 'se mojó')
  S.elegirMotivoDevolucion(i, 'Humedad')
  chk('un chip con detalle: "Humedad: se mojó"', S.motivoDevolucion(r.dev) === 'Humedad: se mojó')
  r.dev.motivoTexto = ''
  chk('un chip solo: "Humedad"', S.motivoDevolucion(r.dev) === 'Humedad' && S.faltanRenglon(r) === null)
  S.elegirMotivoDevolucion(i, 'Error de pedido')
  chk('todos los chips tienen 3 letras o más', S.MOTIVOS_DEVOLUCION.filter(m => m !== 'Otro').every(m => S.letrasDe(m) >= 3))
  r.dev.lote = 'X'.repeat(41)
  chk('un lote de más de 40 no pasa', /hasta 40/.test(S.faltanRenglon(r)))
  r.dev.lote = '6249-a'
  chk('un lote corto sí', S.faltanRenglon(r) === null)
  r.dev.destino = 'otro'
  chk('un destino raro no pasa', S.faltanRenglon(r) === 'elegí qué se hace con las cajas devueltas')
  S.elegirDestinoDevolucion(i, 'basura')
  chk('elegir un destino que no existe no cambia nada', r.dev.destino === 'otro')
  S.elegirTratoDevolucion(i, 'regalar')
  chk('un trato que no existe no se toma', r.dev.trato === 'descuenta')
}
{
  // Tipear el motivo o el lote no redibuja (se perdería el foco) y se guarda.
  const S = nuevo()
  const { f, i } = conDevolucion(S)
  const antes = S.__els.get('rt-renglones').innerHTML
  const t = { dataset: { rDevTexto: String(i) }, value: 'llegó aplastada' }
  chk('escribir el detalle lo guarda', S.escribirDevolucion(t) === true && f.renglones[i].dev.motivoTexto === 'llegó aplastada')
  chk('sin redibujar el renglón', S.__els.get('rt-renglones').innerHTML === antes)
  chk('y queda en el borrador', /llegó aplastada/.test(S.__ls.get(S.CLAVE_BORRADOR) || ''))
  S.escribirDevolucion({ dataset: { rDevLote: String(i) }, value: 'L'.repeat(60) })
  chk('el lote se corta en 40', f.renglones[i].dev.lote.length === 40)
  chk('otro campo no es de la devolución', S.escribirDevolucion({ dataset: { rCajas: '0' }, value: '3' }) === false)
}

// ── Lo que viaja a la base ──────────────────────────────────────────────────
{
  const S = nuevo()
  const { f } = conDevolucion(S, { texto: 'cayó del camión', lote: ' 6249-1 ', destino: 'stock' })
  const p = S.parametrosRegistrar(f)
  chk('el retiro viaja como siempre (sin tipo)', p.p_items[0].tipo === undefined && p.p_items[0].cajas === 10)
  const d = p.p_items[1]
  chk('la devolución: tipo devolucion, cajas, motivo, lote y destino', d.tipo === 'devolucion' && d.cajas === 3 && d.presentacion_id === 'pr-cuc-sin' &&
    d.motivo === 'Rotura: cayó del camión' && d.lote_devuelto === '6249-1' && d.destino === 'stock', JSON.stringify(d))
  chk('la devolución NO lleva lotes (no saca nada)', d.lotes === undefined)
  chk('ningún dato de plata en el payload', !/precio|importe|total|saldo|subtotal|credito|lista/i.test(JSON.stringify(p)))
  f.renglones[1].dev.lote = '   '
  f.renglones[1].dev.destino = 'descarte'
  chk('sin lote viaja null y "descarte"', S.itemParaBase(f.renglones[1]).lote_devuelto === null && S.itemParaBase(f.renglones[1]).destino === 'descarte')
}
{
  const S = nuevo()
  const { f, i } = conDevolucion(S, { trato: 'repone' })
  conLotes(S, LOTES)
  const r = f.renglones[i]
  chk('una reposición sí saca stock: tiene lotes', S.saleDelStock(r) && Array.isArray(S.listaLotesDe(r)) && S.renglonConLotes(r))
  const h = S.htmlRenglon(r, i, CAT, false)
  chk('y pregunta de qué lote salen', /¿De qué lote salen las que se reponen\?/.test(h) && /data-r-lote-cant/.test(h))
  S.completarLotes(i)
  const it = S.itemParaBase(r)
  chk('viaja tipo reposicion con sus lotes', it.tipo === 'reposicion' && JSON.stringify(it.lotes) === JSON.stringify([{ lote: '7021-1', cajas: 3 }]), JSON.stringify(it))
  r.cajas = 50
  r.lotes = {}
  chk('pedir más de lo que hay es faltante (como un retiro)', S.faltanteProducto(r) === 10)
  r.lotes = { '7021-1': 3 }
  S.elegirTratoDevolucion(i, 'descuenta')
  chk('pasarla a devolución suelta los lotes y el faltante', JSON.stringify(r.lotes) === '{}' && S.faltanteProducto(r) === 0 && S.itemParaBase(r).lotes === undefined)
}

// ── Una orden con SOLO devoluciones ─────────────────────────────────────────
{
  const S = nuevo()
  const f = conEmpresa(S)
  S.elegirCliente('c1')
  // El primer renglón vacío pasa a ser la devolución.
  S.agregarDevolucion()
  chk('el renglón vacío del arranque pasa a devolución', f.renglones.length === 1 && S.esRenglonDev(f.renglones[0]))
  S.elegirProductoRenglon(0, 'p-cho')
  f.renglones[0].cajas = 4
  S.elegirMotivoDevolucion(0, 'Vencido')
  S.elegirTratoDevolucion(0, 'descuenta')
  chk('una orden con SOLO una devolución se puede confirmar', S.faltanOrden(f).length === 0, S.faltanOrden(f).join(' '))
  chk('el total: 0 cajas que se lleva y las devueltas', S.totalCajasForm(f) === 0 && S.textoTotalForm(f) === '0 cajas · devueltas 4')
  let params = null
  S.__setRpc(async (n, p) => {
    if (n === 'registrar_orden_retiro') { params = p; return { data: { orden_id: 'o-d', numero: 30, codigo: 'N-0030', stock_insuficiente: [] }, error: null } }
    return { data: [], error: null }
  })
  S.revisar()
  chk('revisar pasa al resumen', S.estado.vista === 'rt-vista-resumen')
  const r = S.__els.get('rt-resumen').innerHTML
  chk('el resumen tiene la sección Devoluciones', /Devoluciones · 1/.test(r) && /Se descuenta de la orden · Vencido · se descartan/.test(r) && />−4 <small>cajas/.test(r))
  chk('sin plata en el resumen', !/\$\s?\d|precio|importe|subtotal/i.test(r))
  esperas.push(S.confirmar().then(() => {
    chk('se confirma con UNA llamada, la devolución sola', params && params.p_items.length === 1 && params.p_items[0].tipo === 'devolucion' && params.p_items[0].motivo === 'Vencido')
    chk('y queda confirmada', S.estado.vista === 'rt-vista-hecho' && /N-0030/.test(S.__els.get('rt-hecho').innerHTML))
  }))
}

// ── La orden armada: la sección "Devoluciones" ──────────────────────────────
{
  const S = nuevo()
  const { f, i } = conDevolucion(S, { lote: '6249' })
  f.editando = null
  S.agregarDevolucion()
  const k = f.editando
  S.elegirProductoRenglon(k, 'p-cuc')
  f.renglones[k].cajas = 2
  S.elegirMotivoDevolucion(k, 'Humedad')
  S.elegirTratoDevolucion(k, 'repone')
  S.elegirDestinoDevolucion(k, 'stock')
  f.editando = null
  S.pintarRenglones()
  const h = S.__els.get('rt-orden-lista').innerHTML
  const iDev = h.indexOf('Devoluciones · 2')
  chk('las devoluciones van en su sección, después de lo que se lleva', iDev > 0 && h.indexOf('data-r-editar="0"') < iDev && h.indexOf(`data-r-editar="${i}"`) > iDev && h.indexOf(`data-r-editar="${k}"`) > iDev)
  chk('la devolución con "−" y su motivo', /rt-item__q">−3</.test(h) && /Rotura · lote 6249 · se descartan/.test(h))
  chk('la reposición: "Se repone · sin cargo" (la carga no muestra plata)', /Se repone · sin cargo · Humedad · vuelven al stock/.test(h) && /rt-item__q">2</.test(h))
  chk('ni un "$" en la orden armada', !/\$/.test(h))
  chk('el título cuenta lo que se lleva y el total suma devueltas', /Lo que se lleva · 1 renglón/.test(S.__els.get('rt-orden-titulo').innerHTML) && /12 cajas · devueltas 5/.test(S.__els.get('rt-orden-titulo').innerHTML))
  chk('lo que se lleva: el retiro y la reposición (la devolución no sale)', S.totalCajasForm(f) === 12 && S.totalDevueltasForm(f) === 5)
}
{
  // Un borrador con una devolución vieja (le faltan campos) se completa.
  const S = nuevo()
  const f = conEmpresa(S)
  f.renglones = [{ ...S.renglonNuevo(), dev: { motivo: 'Rotura' } }, { ...S.renglonNuevo(), dev: 'basura' }]
  S.reconciliarRenglones(f, CAT)
  chk('el borrador completa la devolución', f.renglones[0].dev.destino === 'descarte' && f.renglones[0].dev.trato === null && f.renglones[0].dev.motivo === 'Rotura')
  chk('y una devolución rota se descarta (queda retiro)', f.renglones[1].dev === undefined)
}

// ── Mis retiros: el tipo de cada renglón ────────────────────────────────────
const MIA = {
  orden_id: 'o-m', codigo: 'N-0031', fecha: '2026-10-22', estado: 'confirmada', cliente: 'Distribuidora Anatolia', transporte: null, observaciones: null, cargada_en: '2026-10-22T14:00:00Z',
  // La devolución se cargó PRIMERO: la hoja y el detalle la llevan a su sección.
  renglones: [
    { orden: 1, tipo: 'producto', producto: 'Cucurucho grande', presentacion: 'Caja x 100', marca: null, cajas: 3, unidades: 300, movimiento: 'devolucion', motivo_devolucion: 'Rotura', lote_devuelto: '6249', destino_devuelto: 'descarte', lotes: null },
    { orden: 2, tipo: 'producto', producto: 'Cucurucho grande', presentacion: 'Caja x 100', marca: null, cajas: 10, unidades: 1000, movimiento: 'retiro', lotes: [{ lote: '7021-1', cajas: 10 }] },
    { orden: 3, tipo: 'producto', producto: 'Cannoli', presentacion: 'Caja x 50', marca: null, cajas: 2, unidades: 100, movimiento: 'reposicion', motivo_devolucion: 'Humedad', lote_devuelto: null, destino_devuelto: 'stock', lotes: [{ lote: '7030-2', cajas: 2 }] },
  ],
}
{
  const S = nuevo()
  conEmpresa(S)
  const rs = S.renglonesParaHoja(MIA)
  chk('mis_ordenes_retiro: el tipo sale de "movimiento"', rs.map(r => r.movimiento).join() === 'devolucion,retiro,reposicion')
  chk('con el motivo, el lote devuelto y el destino', rs[0].motivo === 'Rotura' && rs[0].loteDevuelto === '6249' && rs[0].destino === 'descarte' && rs[2].destino === 'stock')
  chk('un renglón viejo sin movimiento es un retiro', S.renglonesParaHoja({ renglones: [{ tipo: 'producto', cajas: 1 }] })[0].movimiento === 'retiro')
  chk('las cajas de la orden: sin la devolución', S.cajasDeOrden(MIA) === 12 && S.devueltasDeOrden(MIA) === 5)
  const fila = S.htmlFilaMia(MIA)
  chk('la fila dice cuánto devolvió', /12 cajas · devolvió 5/.test(fila))
  const det = S.htmlDetalleMio(MIA)
  chk('el detalle tiene la sección Devoluciones, después de lo que se llevó', /Devoluciones · 2/.test(det) && det.indexOf('Devoluciones · 2') > det.indexOf('10 cajas · Cucurucho grande') &&
    det.indexOf('−3 cajas') > det.indexOf('Devoluciones · 2') && (det.match(/−3 cajas/g) || []).length === 1)
  chk('la devolución con "−", el motivo, el lote y qué se hizo', /−3 cajas · Cucurucho grande · Caja x 100/.test(det) && /Se descuenta de la orden · Rotura · lote 6249 · se descartan/.test(det))
  chk('la reposición: sin cargo y de qué lote salió', /Se repone · sin cargo · Humedad · vuelven al stock · sale de los lotes 7030-2 \(2\)/.test(det))
  chk('el total: 12 cajas · devueltas 5', /12 cajas <small>· devueltas 5<\/small>/.test(det))
  chk('ni un "$" en Mis retiros', !/\$/.test(det + fila))
  const hoja = S.ordenParaHoja(MIA)
  chk('la hoja ordena: los retiros primero, las devoluciones después', hoja.renglones.map(r => r.movimiento).join() === 'retiro,devolucion,reposicion')
  chk('un reintento no ve faltantes en una devolución (no tiene lotes)', S.faltantesDeLotes(MIA).length === 0)
}

// ── La hoja (js/retiros-comun.js) ───────────────────────────────────────────
const EMPRESA = { id: 'u-n', nombre: 'Cucuruchos Nuss', logo_url: 'logo-cucuruchos-nuss.png' }
const HOJA = {
  codigo: 'N-0031', estado: 'confirmada', fecha: '2026-10-22', cargadaEn: '2026-10-22T14:00:00Z', cargadaPor: 'Emanuel Romero', moneda: 'ARS', total: -1500,
  empresa: EMPRESA, cliente: { nombre: 'Distribuidora Anatolia' },
  renglones: [
    { producto: 'Cannoli', presentacion: 'Caja x 50', cono: 'Sin cono', cajas: 2, movimiento: 'reposicion', motivo: 'Humedad', loteDevuelto: null, destino: 'stock', lotes: [{ lote: '7030-2', cajas: 2 }], precio: 0, subtotal: 0 },
    { producto: 'Cucurucho grande', presentacion: 'Caja x 100', cono: 'Sin cono', cajas: 1, unidades: 100, lotes: [{ lote: '7021-1', cajas: 1 }], precio: 1500, subtotal: 1500 },
    { producto: 'Cucurucho grande', presentacion: 'Caja x 100', cono: 'Sin cono', cajas: 2, movimiento: 'devolucion', motivo: 'Rotura', loteDevuelto: '6249', destino: 'descarte', lotes: [], precio: 1500, subtotal: -3000 },
  ],
}
{
  const S = nuevo()
  const orden = { ...HOJA, renglones: S.ordenarRenglonesHoja(HOJA.renglones) }
  chk('ordenarRenglonesHoja: retiros primero, cada grupo en su orden', orden.renglones.map(r => r.movimiento ?? 'retiro').join() === 'retiro,reposicion,devolucion')
  const h = S.htmlHoja(orden, { conPrecios: false })
  chk('la hoja tiene la sección DEVOLUCIONES (una vez por copia)', (h.match(/rh-devuelto__titulo">DEVOLUCIONES</g) || []).length === 2)
  chk('el título va en la PRIMERA devolución (adentro del renglón: se mide igual)', /<tr class="rh-fila rh-devuelto rh-devuelto--primera"><td class="rh-num rh-cajas">2<\/td><td class="rh-producto"><span class="rh-devuelto__titulo">DEVOLUCIONES/.test(h))
  chk('la devolución con "−" y el lote que trajo', /<td class="rh-num rh-cajas">−2<\/td>/.test(h) && /<td class="rh-lote">6249<\/td>/.test(h))
  chk('el motivo debajo del producto', /rh-devuelto__motivo">Devolución · Rotura · lote 6249 · se descartan</.test(h) && /rh-devuelto__motivo">Reposición · Humedad · vuelven al stock</.test(h))
  chk('la reposición: de qué lote salió', /<td class="rh-lote">7030-2<\/td>/.test(h))
  chk('un retiro sigue igual que siempre (con la hoja nueva del 26/10/2026)', /<tr class="rh-fila"><td class="rh-num rh-cajas">1<\/td><td class="rh-producto">Cucurucho grande<\/td><td class="rh-desc">×100<\/td>/.test(h))
  chk('la fila TOTAL: lo que se lleva (retiro + reposición) y las devueltas', /<td colspan="3" class="rh-total__rotulo">TOTAL · 3 cajas de producto<span class="rh-total__insumos"> · devueltas 4<\/span>/.test(h))
  chk('la hoja sin precios no tiene plata ni "a favor"', !/\$|a favor/.test(h))
  const hp = S.htmlHoja(orden, { conPrecios: true })
  // importeHoja separa el "$" con un espacio duro (\s lo toma).
  chk('con precios: la devolución al precio de lista y el subtotal negativo', /\$\s1\.500,00<\/td><td class="rh-num rh-plata">\$\s-3\.000,00/.test(hp))
  chk('con precios: la reposición "Se repone" y $ 0', /rh-plata">Se repone<\/td><td class="rh-num rh-plata">\$\s0,00</.test(hp))
  chk('el total negativo: "a favor del cliente"', /· devueltas 4 · a favor del cliente/.test(hp) && /\$\s-1\.500,00/.test(hp))
  chk('un total positivo no dice "a favor"', !/a favor/.test(S.htmlHoja({ ...orden, total: 100 }, { conPrecios: true })))
  chk('totalCajasOrden no cuenta la devolución', S.totalCajasOrden(orden) === 3 && S.totalCajasDevueltas(orden) === 4)
  chk('totalUnidadesOrden tampoco', S.totalUnidadesOrden({ renglones: [{ cajas: 1, unidades: 100 }, { cajas: 2, unidades: 200, movimiento: 'devolucion' }] }) === 100)
  chk('una orden sin devoluciones no tiene la sección', !/DEVOLUCIONES|devueltas/.test(S.htmlHoja({ ...HOJA, renglones: [HOJA.renglones[1]] }, { conPrecios: true })))
  const txt = S.textoOrden(orden)
  chk('el texto para compartir: la sección y el total', /\nDevoluciones:\n- 2 cajas · Cannoli · Caja x 50 · Sin cono \(Reposición · Humedad · vuelven al stock\)\n- −2 cajas · Cucurucho grande · Caja x 100 · Sin cono \(Devolución · Rotura · lote 6249 · se descartan\)/.test(txt) && /Total: 3 cajas · devueltas 4/.test(txt), txt)
  chk('sin precios en el texto', !/\$/.test(txt))
  chk('cada devolución va UNA vez (en su sección, no con lo que se lleva)', (txt.match(/Rotura/g) || []).length === 1 && (txt.match(/Cannoli/g) || []).length === 1)
  // Escape: el motivo y el lote son texto de la base.
  const x = S.htmlHoja({ ...orden, renglones: [{ ...HOJA.renglones[2], motivo: '<img src=x>', loteDevuelto: '"><b>' }] })
  chk('el motivo y el lote se escapan', !/<img src=x>/.test(x) && !/"><b>/.test(x) && /&lt;img src=x&gt;/.test(x) && /<td class="rh-lote">&quot;&gt;&lt;b&gt;<\/td>/.test(x))
  chk('detalleDevolucionHoja de un retiro es vacío', S.detalleDevolucionHoja({ cajas: 1 }) === '')
}
{
  // En la orden armada y en el detalle, el motivo también se escapa.
  const S = nuevo()
  const { f, i } = conDevolucion(S, { motivo: 'Otro', texto: '<script>x</script>', lote: '<b>' })
  f.editando = null
  S.pintarRenglones()
  const h = S.__els.get('rt-orden-lista').innerHTML
  chk('la orden armada escapa el motivo y el lote', !/<script>|<b>/.test(h) && /&lt;script&gt;/.test(h))
  const det = S.htmlDetalleMio({ ...MIA, renglones: [{ ...MIA.renglones[0], motivo_devolucion: '<i>m</i>', lote_devuelto: '<u>' }] })
  chk('Mis retiros escapa el motivo y el lote', !/<i>m<\/i>|<u>/.test(det))
  const ed = S.htmlRenglon(f.renglones[i], i, CAT, false)
  chk('el campo del detalle se escapa en su value', /value="&lt;script&gt;x&lt;\/script&gt;"/.test(ed) && /value="&lt;b&gt;"/.test(ed))
}

fin()
