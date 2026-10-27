// El detalle de la factura de compra en modulos/gastos.html (27/10/2026): el
// 👁 de Cuentas corrientes abre gastos.html?factura=<id>, y la factura que
// cargó Ingreso de materia prima no tiene comprobante_url: la foto y los
// renglones salen de detalle_factura_compra().
//
// Se EJECUTA el código real del módulo (las funciones se extraen del
// <script>; los números salen del utils.js real con fuenteNumeros).
//
// Qué se prueba:
//  1. armarDetalleFacturaCompra(): el precio con IVA calculado, el total del
//     renglón (leído, o cantidad × precio si falta), los totales leídos o
//     sumados, y lo que entró al stock.
//  2. htmlDetalleFacturaCompra(): la tabla, los totales, el caso sin renglones
//     (leyenda + lo que entró al stock, sin precios), sin permiso, otro error
//     y la factura que no vino de Ingreso.
//  3. puedeVerFotoComprobante() con la carpeta /mp/ y las tareas de CC.
//  4. mostrarDetalleFactura(): cuándo llama a la RPC, qué foto usa, y que un
//     error de permiso no rompe la pantalla.
//
//   node pruebas/test-gastos-detalle-factura-compra.js
//   ARCHIVO_TEST=otra-copia.html node pruebas/test-gastos-detalle-factura-compra.js

const path = require('path')
const { construirCon } = require('./sandbox')
const { fuenteNumeros } = require('./numeros-comun')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/gastos.html')

let ok = 0
const fallas = []
function chk(nombre, condicion, detalle) {
  if (condicion) ok++
  else fallas.push(nombre + (detalle !== undefined ? ` — ${typeof detalle === 'string' ? detalle : JSON.stringify(detalle)}` : ''))
}

const PRELUDIO = `
  ${fuenteNumeros()}
  var console = { log(){}, warn(){}, error(){} }
  var estado = { sesion: { user: { id: 'uid-yo' } }, miRolApp: 'usuario', misTareas: new Set(), facturaDetalleActual: null }
  function nuevoEl(id) {
    return { id, innerHTML: '', hidden: false, addEventListener(){}, removeAttribute(){ this.hidden = false } }
  }
  var __els = new Map()
  var document = { getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) } }
  var lucide = { createIcons(){} }
  var __factura = null
  var __rpc = { data: null, error: null }
  var __llamadas = { rpc: [], errores: [] }
  var supabase = {
    from: () => {
      const q = {}
      for (const k of ['select', 'eq']) q[k] = () => q
      q.maybeSingle = async () => ({ data: __factura, error: null })
      return q
    },
    rpc: async (n, args) => { __llamadas.rpc.push([n, args]); return __rpc },
  }
  function mostrarError(m) { __llamadas.errores.push(m) }
  function formatearFecha(f) { return f }
  function iconoCategoriaHtml() { return '' }
  function entrarAVista() {} function arribaDeLaVista() {}
  function mostrarFormularioEdicionFactura() {} function mostrarFormularioInteres() {}
`

const FUNCIONES = [
  'esc', 'tieneTarea', 'formatearImporte',
  'rutaDeComprobante', 'puedeVerFotoComprobante', 'htmlSeccionComprobante',
  'numeroDetalleCompra', 'redondearDetalleCompra', 'armarDetalleFacturaCompra', 'clasificarErrorDetalleCompra',
  'textoCantidadDetalleCompra', 'textoAlicuotaDetalleCompra', 'htmlDetalleFacturaCompra',
  'mostrarDetalleFactura',
]
const CONSTANTES = ['MENSAJES_FOTO', 'MENSAJES_DETALLE_COMPRA']

const S = construirCon(ARCHIVO, {
  preludio: PRELUDIO, funciones: FUNCIONES, constantes: CONSTANTES,
  retorno: `estado, __llamadas, __contenido(){ return document.getElementById('detalle-factura-contenido').innerHTML },
    __setFactura(f){ __factura = f }, __setRpc(r){ __rpc = r }, __limpiar(){ __llamadas.rpc.length = 0; __llamadas.errores.length = 0 }`,
})

// Lo que devuelve la RPC para una factura de Ingreso (datos con la forma real
// de ocr_crudo: el precio y el total del renglón son sin IVA).
const RENGLONES = [
  { descripcion: 'Harina 000 x 25 kg', cantidad: 50, unidad: 'un', precio_unitario: 950, alicuota_iva: 21, precio_total: 47500 },
  { descripcion: 'Azúcar', cantidad: 5000, unidad: 'kg', precio_unitario: 16280, alicuota_iva: 10.5, precio_total: 3256000 },
]
const DETALLE = {
  origen: 'materia_prima', ingreso_id: 'ing-1', foto_url: 'otro-uid/mp/1793040090436-75hfie.jpg',
  tipo_doc: 'Factura A', numero_doc: '0001-00001234', fecha: '2026-10-20',
  importe_neto: 3303500, importe_iva: 351855, importe_total: 3655355,
  renglones_factura: RENGLONES,
  items_ingreso: [{ insumo: 'Harina 000', marca: 'Pureza', unidad: 'kg', cantidad: 1250, precio_unitario: 38, alicuota_iva: 21 }],
}

async function main() {
  // ══ 1. El armado ═════════════════════════════════════════════════════════
  {
    const m = S.armarDetalleFacturaCompra(DETALLE)
    chk('con renglones: no es "sin detalle"', m.sinDetalle === false)
    chk('dos renglones', m.renglones.length === 2)
    chk('precio con IVA al 21 %: 950 → 1.149,50', m.renglones[0].unitarioConIva === 1149.5, m.renglones[0])
    chk('precio con IVA al 10,5 %: 16.280 → 17.989,40', m.renglones[1].unitarioConIva === 17989.4, m.renglones[1])
    chk('el total del renglón es el leído (sin IVA)', m.renglones[0].total === 47500)
    chk('los totales de abajo son los leídos de la factura',
      m.totales.neto === 3303500 && m.totales.iva === 351855 && m.totales.total === 3655355, m.totales)

    const sinTotales = S.armarDetalleFacturaCompra({
      ingreso_id: 'i', renglones_factura: [
        { descripcion: 'A', cantidad: 2000, unidad: 'un', precio_unitario: 279.98, alicuota_iva: 21, precio_total: null },
        { descripcion: 'B', cantidad: '3', unidad: 'kg', precio_unitario: '100', alicuota_iva: '10.5', precio_total: '300' },
      ],
    })
    chk('sin total leído: cantidad × precio (2000 × 279,98 = 559.960)', sinTotales.renglones[0].total === 559960, sinTotales.renglones[0])
    chk('los números que vienen como texto se leen', sinTotales.renglones[1].cantidad === 3 && sinTotales.renglones[1].alicuota === 10.5)
    chk('sin neto leído: suma de los renglones', sinTotales.totales.neto === 560260, sinTotales.totales)
    chk('sin IVA leído: suma del IVA de cada renglón (117.591,60 + 31,50)', sinTotales.totales.iva === 117623.1, sinTotales.totales)
    chk('sin total leído: neto + IVA', sinTotales.totales.total === 677883.1, sinTotales.totales)

    const sinAlicuota = S.armarDetalleFacturaCompra({
      ingreso_id: 'i', renglones_factura: [{ descripcion: 'C', cantidad: 100, unidad: 'un', precio_unitario: 51600, alicuota_iva: null, precio_total: 5160000 }],
    })
    chk('sin alícuota: el precio con IVA queda en null (no se inventa)', sinAlicuota.renglones[0].unitarioConIva === null)
    chk('sin alícuota ni IVA leído: el IVA y el total quedan en null', sinAlicuota.totales.iva === null && sinAlicuota.totales.total === null)
    chk('sin alícuota: el neto igual se suma', sinAlicuota.totales.neto === 5160000)

    const vacio = S.armarDetalleFacturaCompra({ ingreso_id: 'i', renglones_factura: [], items_ingreso: DETALLE.items_ingreso })
    chk('sin renglones: es "sin detalle"', vacio.sinDetalle === true)
    chk('sin renglones: los totales quedan en null (no "$ 0")', vacio.totales.neto === null && vacio.totales.iva === null && vacio.totales.total === null)
    chk('lo que entró al stock se arma', vacio.items.length === 1 && vacio.items[0].insumo === 'Harina 000' && vacio.items[0].cantidad === 1250)

    const raro = S.armarDetalleFacturaCompra({ ingreso_id: 'i', renglones_factura: 'no es lista', items_ingreso: null })
    chk('renglones que no son lista: vacío, sin tirar', raro.renglones.length === 0 && raro.items.length === 0)
  }

  // ══ 2. El HTML ═══════════════════════════════════════════════════════════
  {
    const h = S.htmlDetalleFacturaCompra({ data: DETALLE, error: null }, 'ARS')
    chk('la sección se titula "Detalle de la factura"', h.includes('Detalle de la factura'))
    chk('la tabla tiene las seis columnas',
      ['Descripción', 'Cantidad', 'P. unit. sin IVA', 'IVA', 'P. unit. con IVA', 'Total sin IVA'].every(c => h.includes(`>${c}</th>`)))
    chk('la cantidad va con su unidad', h.includes('5.000 kg') && h.includes('50 un'))
    chk('el precio sin IVA', h.includes('$ 950,00'))
    chk('el IVA en %', h.includes('21 %') && h.includes('10,5 %'))
    chk('el precio con IVA calculado', h.includes('$ 1.149,50') && h.includes('$ 17.989,40'))
    chk('el total del renglón', h.includes('$ 3.256.000,00'))
    chk('abajo neto, IVA y total', /Neto<\/span>[\s\S]*\$ 3\.303\.500,00/.test(h) && /IVA<\/span>[\s\S]*\$ 351\.855,00/.test(h) &&
      /Total<\/span>[\s\S]*\$ 3\.655\.355,00/.test(h))
    chk('la tabla se desplaza dentro de la sección (celular)', h.includes('detalle-compra__scroll'))
    chk('con renglones no aparece la leyenda de sin detalle', !h.includes('no tiene el detalle leído'))
    chk('la moneda de la factura', S.htmlDetalleFacturaCompra({ data: DETALLE, error: null }, 'USD').includes('USD 950,00'))

    const v = S.htmlDetalleFacturaCompra({ data: { ...DETALLE, renglones_factura: [], importe_neto: null, importe_iva: null, importe_total: null }, error: null })
    chk('sin renglones: la leyenda "La factura no tiene el detalle leído"', v.includes('La factura no tiene el detalle leído'))
    chk('sin renglones: lo que entró al stock (insumo, marca, cantidad)', v.includes('Harina 000') && v.includes('Pureza') && v.includes('1.250 kg'))
    chk('sin renglones: sin precios', !/\$ /.test(v) && !v.includes('P. unit.'))
    chk('sin renglones ni totales: no dibuja neto/IVA/total', !v.includes('Neto'))

    const sp = S.htmlDetalleFacturaCompra({ data: null, error: { code: 'P0001', message: 'No tenés permiso para ver el detalle de esta factura' } })
    chk('sin permiso: "No tenés permiso para ver el detalle"', sp.includes('No tenés permiso para ver el detalle') && sp.includes('Detalle de la factura'))
    chk('sin permiso: no dibuja tabla', !sp.includes('<table'))
    const sp2 = S.htmlDetalleFacturaCompra({ data: null, error: { code: '42501', message: 'permission denied for function detalle_factura_compra' } })
    chk('sin el grant (42501): también sin permiso', sp2.includes('No tenés permiso para ver el detalle'))
    const otro = S.htmlDetalleFacturaCompra({ data: null, error: { code: '', message: 'Failed to fetch' } })
    chk('otro error (red): dice que no se pudo cargar, no que falta permiso', otro.includes('No se pudo cargar el detalle') && !otro.includes('permiso'))

    chk('factura que no vino de Ingreso (sin ingreso_id): nada', S.htmlDetalleFacturaCompra({ data: { origen: 'gastos', foto_url: null }, error: null }) === '')
    chk('factura inexistente (null): nada', S.htmlDetalleFacturaCompra({ data: null, error: null }) === '')
    chk('sin resultado: nada', S.htmlDetalleFacturaCompra(null) === '')

    // Lo del OCR va escapado.
    const x = S.htmlDetalleFacturaCompra({ data: { ingreso_id: 'i', renglones_factura: [{ descripcion: '<img src=x onerror=alert(1)>', unidad: '"><b>', cantidad: 1, precio_unitario: 1, alicuota_iva: 21 }] }, error: null })
    chk('la descripción y la unidad del OCR van escapadas', !x.includes('<img') && !x.includes('"><b>') && x.includes('&lt;img'))
  }

  // ══ 3. La foto: la carpeta /mp/ ══════════════════════════════════════════
  {
    const ruta = 'otro-uid/mp/1793040090436-75hfie.jpg'
    S.estado.misTareas = new Set()
    chk('/mp/ sin tareas de CC: decide Storage (null), no "sin permiso"', S.puedeVerFotoComprobante(ruta) === null)
    chk('/mp/ sin tareas de CC: muestra el botón', S.htmlSeccionComprobante(ruta).includes('data-ruta-comprobante'))
    S.estado.misTareas = new Set(['cuentas_corrientes:ver_todo'])
    chk('/mp/ con cuentas_corrientes:ver_todo: true', S.puedeVerFotoComprobante(ruta) === true)
    S.estado.misTareas = new Set(['cuentas_corrientes:registrar_pago'])
    chk('/mp/ con cuentas_corrientes:registrar_pago: true', S.puedeVerFotoComprobante(ruta) === true)
    S.estado.misTareas = new Set()
    chk('la carpeta propia sigue en true', S.puedeVerFotoComprobante('uid-yo/mp/x.jpg') === true)
    chk('la de Gastos ajena sin tareas sigue en false', S.puedeVerFotoComprobante('otro-uid/x.jpg') === false)
    chk('otra subcarpeta ajena sigue en null', S.puedeVerFotoComprobante('otro-uid/remitos/x.jpg') === null)
  }

  // ══ 4. mostrarDetalleFactura() ═══════════════════════════════════════════
  {
    const base = {
      id: 'f1', razon_social: 'Molino SA', tipo_documento: 'Factura A', numero_comprobante: '0001-00001234',
      importe: 3655355, moneda: 'ARS', fecha_factura: '2026-10-20', lugar: null, observaciones: null,
      comprobante_url: null, estado: 'pendiente', saldo_pendiente: 3655355, proveedor_id: 'p1', modulo_origen: 'materia_prima',
      proveedores: { id: 'p1', razon_social: 'Molino SA' }, categorias: null, unidades_negocio: { id: 'u1', nombre: 'Cucuruchos Nuss' },
    }
    S.estado.misTareas = new Set(['cuentas_corrientes:ver_todo'])

    S.__limpiar(); S.__setFactura(base); S.__setRpc({ data: DETALLE, error: null })
    await S.mostrarDetalleFactura('f1')
    let c = S.__contenido()
    chk('de Ingreso: llama a detalle_factura_compra con el id', S.__llamadas.rpc.length === 1 &&
      S.__llamadas.rpc[0][0] === 'detalle_factura_compra' && S.__llamadas.rpc[0][1].p_factura_id === 'f1', S.__llamadas.rpc)
    chk('de Ingreso: usa la foto del ingreso', c.includes('data-ruta-comprobante="otro-uid/mp/1793040090436-75hfie.jpg"'))
    chk('de Ingreso: dibuja el detalle', c.includes('Detalle de la factura') && c.includes('$ 1.149,50'))
    chk('de Ingreso: la pantalla de siempre sigue (proveedor, importe)', c.includes('Molino SA') && c.includes('$ 3.655.355,00'))

    S.__limpiar(); S.__setFactura({ ...base, comprobante_url: 'uid-yo/propia.jpg' }); S.__setRpc({ data: { ...DETALLE, foto_url: 'uid-yo/propia.jpg' }, error: null })
    await S.mostrarDetalleFactura('f1')
    chk('de Ingreso con foto propia: igual llama (por los renglones) y usa la foto de la factura',
      S.__llamadas.rpc.length === 1 && S.__contenido().includes('data-ruta-comprobante="uid-yo/propia.jpg"'))

    S.__limpiar(); S.__setFactura({ ...base, modulo_origen: 'gastos', comprobante_url: 'uid-yo/propia.jpg' })
    await S.mostrarDetalleFactura('f1')
    chk('de Gastos con foto: NO llama a la RPC', S.__llamadas.rpc.length === 0)
    chk('de Gastos con foto: la foto de la factura, sin sección de detalle',
      S.__contenido().includes('data-ruta-comprobante="uid-yo/propia.jpg"') && !S.__contenido().includes('Detalle de la factura'))

    S.__limpiar(); S.__setFactura({ ...base, modulo_origen: 'gastos' }); S.__setRpc({ data: { origen: 'gastos', foto_url: null }, error: null })
    await S.mostrarDetalleFactura('f1')
    chk('de Gastos sin foto: llama, y sin ingreso no dibuja ni foto ni detalle',
      S.__llamadas.rpc.length === 1 && !S.__contenido().includes('Detalle de la factura') && !S.__contenido().includes('data-ruta-comprobante'))

    S.__limpiar(); S.__setFactura(base); S.__setRpc({ data: null, error: { code: 'P0001', message: 'No tenés permiso para ver el detalle de esta factura' } })
    await S.mostrarDetalleFactura('f1')
    c = S.__contenido()
    chk('sin permiso: la pantalla se dibuja igual', c.includes('Molino SA') && c.includes('Destino y clasificación'))
    chk('sin permiso: "No tenés permiso para ver el detalle"', c.includes('No tenés permiso para ver el detalle'))
    chk('sin permiso: no salta un error general', S.__llamadas.errores.length === 0, S.__llamadas.errores)

    S.__limpiar(); S.__setFactura({ ...base, modulo_origen: 'gastos' }); S.__setRpc({ data: null, error: { code: 'P0001', message: 'x' } })
    await S.mostrarDetalleFactura('f1')
    chk('de Gastos sin foto y con error: no muestra un detalle que no existe', !S.__contenido().includes('Detalle de la factura'))
  }

  const total = ok + fallas.length
  for (const f of fallas) console.log('  ✗ ' + f)
  console.log(`${ok}/${total}${fallas.length ? '  ROJO' : '  verde'}`)
  process.exit(fallas.length ? 1 : 0)
}

main().catch(e => { console.log('EXCEPCIÓN', e && e.stack || e); process.exit(1) })
