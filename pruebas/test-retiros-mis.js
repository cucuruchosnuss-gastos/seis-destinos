// "MIS RETIROS" en la carga (modulos/retiros.html, 26/09/2026): lo que cargó
// ESTA persona, por mis_ordenes_retiro(), para reimprimir o reenviar. Nunca
// lee las tablas ordenes_retiro ni orden_retiro_items: quien solo carga no
// puede, y aunque pudiera vería las órdenes de todos.
//
//   node pruebas/test-retiros-mis.js

const path = require('path')
const fs = require('fs')
const { construirRetiros } = require('./sandbox-retiros')
const { arnes, marca, chequearMarcas } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/retiros.html')
const src = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${src.length} bytes)`)
const { chk, esperas, fin } = arnes()
const nuevo = () => construirRetiros(ARCHIVO)

const MIAS = [
  { orden_id: 'o-1', codigo: 'N-0012', fecha: '2026-09-26', estado: 'confirmada', cliente: 'Distribuidora Anatolia', transporte: 'Expreso Norte', observaciones: null, cargada_en: '2026-09-26T17:32:00Z',
    renglones: [{ producto: 'Cucurucho grande', presentacion: 'Caja x 100', marca: null, cajas: 10, unidades: 1000, lotes: [{ lote: '7030-1', cajas: 10 }] }] },
  { orden_id: 'o-2', codigo: 'N-0011', fecha: '2026-09-25', estado: 'anulada', cliente: 'Kiosco Pepe', transporte: null, observaciones: 'x', cargada_en: '2026-09-25T12:00:00Z',
    renglones: [{ producto: 'Cucurucho grande', presentacion: 'Caja x 100 con cono', marca: 'LOLO', cajas: 3, unidades: 300, lotes: [] }] },
]
const CAT = {
  productos: [{ id: 'p-cuc', nombre: 'Cucurucho grande', tipo_masa: 'Común' }],
  presentaciones: [
    { id: 'pr-sin', producto_id: 'p-cuc', nombre: 'Caja x 100', con_cono: false, unidades_por_caja: 100 },
    { id: 'pr-con', producto_id: 'p-cuc', nombre: 'Caja x 100 con cono', con_cono: true, unidades_por_caja: 100 },
  ],
  marcas: [],
}
const CLIENTES = [{ id: 'c1', nombre: 'Distribuidora Anatolia', razon_social: 'ANATOLIA SRL', cuit: '30712345678', domicilio: 'Av. 1', localidad: 'Córdoba', email: 'compras@anatolia.com', apodos: [], activo: true }]

function preparar(S) {
  S.estado.empresaId = 'u-n'
  S.estado.catalogo = CAT
  S.estado.catalogoEmpresa = 'u-n'
  S.estado.clientes = CLIENTES
  S.__setRpc(async (n, p) => n === 'mis_ordenes_retiro' ? { data: MIAS, error: null } : { data: null, error: null })
}

{
  const S = nuevo()
  preparar(S)
  esperas.push(S.mostrarMisRetiros().then(() => {
    const llamadas = S.__llamadas.rpc.filter(x => x[0] === 'mis_ordenes_retiro')
    chk('usa mis_ordenes_retiro con la empresa elegida', llamadas.length === 1 && llamadas[0][1].p_unidad_negocio_id === 'u-n')
    chk('NUNCA lee las tablas de órdenes', !S.__llamadas.consultas.some(c => ['ordenes_retiro', 'orden_retiro_items', 'cliente_movimientos'].includes(c[0])))
    const h = S.__els.get('rt-mis-lista').innerHTML
    chk('lista cada orden con su CÓDIGO', /N-0012/.test(h) && /N-0011/.test(h))
    chk('con fecha, cliente y cajas', /26\/09\/2026 · Distribuidora Anatolia · 10 cajas/.test(h))
    chk('una anulada lo dice', /rt-fila--anulada/.test(h) && />Anulada</.test(h))
    chk('sin plata', !/\$|precio|saldo|importe/i.test(h))
    S.abrirMia('o-1')
    chk('abrir una muestra su detalle', S.estado.vista === 'rt-vista-mio' && S.__els.get('rt-mio-titulo').textContent === 'Orden N-0012')
    chk('con los lotes de cada renglón', /lotes 7030-1 \(10\)/.test(S.__els.get('rt-mio-cuerpo').innerHTML))
    chk('y los botones de la hoja habilitados', ['imprimir', 'enviar', 'compartir'].every(b => S.__els.get(`rt-mio-${b}`).disabled === false))
    S.imprimirDesde('mio')
    const hoja = S.__els.get('rt-impresion').innerHTML
    chk('reimprimir arma la hoja con dos copias', S.__impresiones() === 1 && (hoja.match(/<section class="rh-copia/g) || []).length === 2)
    chk('con el cliente completo (buscado por nombre en la empresa)', /ANATOLIA SRL/.test(hoja) && /CUIT 30712345678/.test(hoja))
    chk('quién la cargó: la persona de la sesión', /Cargó<\/span> Emanuel Romero/.test(hoja))
    chk('y SIN precios', !/Precio x caja|Subtotal|\$/.test(hoja))
    S.abrirMia('o-2')
    S.imprimirDesde('mio')
    const h2 = S.__els.get('rt-impresion').innerHTML
    chk('una anulada se imprime con ANULADA cruzado', /class="rh-anulada"/.test(h2))
    chk('el cono de un renglón sin marca, con cono, es "Común"; con marca, la marca', S.conoDeRenglonMio({ producto: 'Cucurucho grande', presentacion: 'Caja x 100 con cono', marca: null }, CAT) === 'Común' &&
      S.conoDeRenglonMio({ producto: 'Cucurucho grande', presentacion: 'Caja x 100', marca: null }, CAT) === 'Sin cono' &&
      S.conoDeRenglonMio({ marca: 'LOLO' }, CAT) === 'LOLO')
    S.abrirMia('no-existe')
    chk('una orden que no está en la lista no se abre', S.estado.mio.orden.orden_id === 'o-2')
  }))
}
{
  const S = nuevo()
  preparar(S)
  S.__setRpc(async () => ({ data: null, error: { message: 'x' } }))
  esperas.push(S.mostrarMisRetiros().then(() => {
    chk('si falla, lo dice (sin inventar una lista vacía)', /No se pudieron leer tus retiros/.test(S.__els.get('rt-mis-lista').innerHTML))
  }))
}
{
  const S = nuevo()
  preparar(S)
  S.__setRpc(async () => ({ data: [], error: null }))
  esperas.push(S.mostrarMisRetiros().then(() => {
    chk('sin órdenes, lo dice', /No cargaste ninguna orden/.test(S.__els.get('rt-mis-lista').innerHTML))
  }))
}
{
  chk('el archivo no lee NUNCA las tablas de órdenes', !/from\('(ordenes_retiro|orden_retiro_items)'\)/.test(src))
  chk('la única lectura de órdenes es mis_ordenes_retiro', (src.match(/rpc\('mis_ordenes_retiro'/g) || []).length === 1)
}
// La hoja recién confirmada también se lee de mis_ordenes_retiro.
{
  const S = nuevo()
  preparar(S)
  S.estado.hecho = { ordenId: 'o-1', codigo: 'N-0012', faltantes: [], reintento: false, orden: null, error: null, aviso: null, cliente: CLIENTES[0] }
  esperas.push(S.cargarOrdenHecha().then(() => {
    chk('la orden recién cargada se lee con mis_ordenes_retiro para imprimirla', S.estado.hecho.orden?.orden_id === 'o-1')
    chk('y los botones se habilitan', S.__els.get('rt-hecho-imprimir').disabled === false)
  }))
  const T = nuevo()
  preparar(T)
  T.__setRpc(async () => ({ data: [], error: null }))
  T.estado.hecho = { ordenId: 'o-9', codigo: 'N-0019', faltantes: [], reintento: false, orden: null, error: null, aviso: null }
  esperas.push(T.cargarOrdenHecha().then(() => {
    chk('si no se encuentra, se dice y los botones quedan apagados', /Buscala en «Mis retiros»/.test(T.__els.get('rt-hecho-error').textContent) && T.__els.get('rt-hecho-imprimir').disabled === true)
  }))
}
// Enviar desde "Mis retiros": el mail del cliente, sin precios.
{
  const S = nuevo()
  preparar(S)
  S.estado.mis = MIAS
  S.abrirMia('o-1')
  S.__win.html2canvas = async () => ({ width: 1000, height: 700, toDataURL: () => 'data:,' })
  S.__win.jspdf = { jsPDF: function () { this.addImage = () => {}; this.output = () => new Blob(['%PDF']) } }
  S.__doc.querySelector = (sel) => /data-lib=/.test(sel) ? {} : null
  S.__setNav({})
  esperas.push(S.enviarDesde('mio').then(() => {
    chk('enviar descarga el PDF y abre el mail del cliente', /^mailto:compras%40anatolia\.com/.test(S.__win.location.href))
    chk('y lo dice pegado a los botones', /Adjuntá el PDF/.test(S.__els.get('rt-mio-aviso').textContent) && S.__els.get('rt-mio-aviso').hidden === false)
  }))
}
{
  const S = nuevo()
  chk('texto del resultado: compartido', /se compartió/.test(S.textoResultadoEnvio({ modo: 'compartido' })))
  chk('cancelar no dice nada', S.textoResultadoEnvio({ modo: 'cancelado' }) === null)
  chk('sin mail del cliente, lo dice', /no tiene un mail cargado/.test(S.textoResultadoEnvio({ modo: 'descargado', nombre: 'x.pdf', conMail: false })))
}
// HTML malicioso
{
  const S = nuevo()
  preparar(S)
  const mala = { orden_id: marca('id'), codigo: marca('codigo'), fecha: '2026-09-26', estado: 'confirmada', cliente: marca('cliente'), transporte: marca('transporte'), observaciones: marca('obs'), cargada_en: '2026-09-26T10:00:00Z',
    renglones: [{ producto: marca('producto'), presentacion: marca('presentacion'), marca: marca('cono'), cajas: 1, unidades: 1, lotes: [{ lote: marca('lote'), cajas: 1 }] }] }
  chequearMarcas(chk, 'fila de mis retiros', S.htmlFilaMia(mala), ['id', 'codigo', 'cliente'])
  chequearMarcas(chk, 'detalle mío', S.htmlDetalleMio(mala), ['cliente', 'transporte', 'obs', 'producto', 'presentacion', 'cono', 'lote'])
  S.estado.errorMis = marca('error')
  chequearMarcas(chk, 'error de mis retiros', S.htmlMisRetiros(), ['error'])
}

fin()
