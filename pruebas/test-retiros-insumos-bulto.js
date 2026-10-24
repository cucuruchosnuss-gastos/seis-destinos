// ÓRDENES DE RETIRO (la Carga) — los insumos POR BULTO (23/10/2026, rama
// ci-prueba/unidades-por-bulto).
//
// El pedido de Facu: un insumo con insumos.vista_preferida = 'bulto' y un
// contenido conocido se pide y se muestra en BULTOS ("¿Cuánto se lleva?
// (bultos de 50 kg)" y debajo "= 50 kg"); el renglón y la base siguen en la
// unidad base. Es el mismo caso que motivó js/cantidades.js: 1 bolsa de
// azúcar se mandaba como 1 kg.
//
// Exige, ejecutando las funciones REALES de modulos/retiros.html:
//  - el catálogo de insumos se lee con vista_preferida y lo que trae un bulto
//    PRIMERO de insumos.contenido_bulto (24/10/2026: sin stock:ver igual hay
//    bulto; el colorante Nico, bidón de 25 kg); solo si es null, de
//    v_stock_insumos (de la empresa); si esa lectura falla, todo sigue en su
//    unidad;
//  - azúcar (50 kg): "1" en el campo deja 50 kg en el renglón y en lo que va
//    a la base; "+" suma un bulto (50 kg); el campo vuelve a decir "1";
//  - harina (25 kg): lo de cada lote también se escribe en bultos y se guarda
//    en kilos; "quedan" y "hay" dicen bultos con los kilos al lado;
//  - óleo (20 kg) en la tarjeta del renglón: "2" / "bultos de 20 kg";
//  - lecitina (vista base) y un 'bulto' sin contenido conocido: por kg;
//  - la hoja: "4 bultos de 25 kg (100 kg)".
//
//   node pruebas/test-retiros-insumos-bulto.js

const path = require('path')
const fs = require('fs')
const { construirRetiros } = require('./sandbox-retiros')
const { arnes } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/retiros.html')
const src = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${src.length} bytes)`)
const { chk, esperas, fin } = arnes()
const nuevo = () => construirRetiros(ARCHIVO)
const nb = s => String(s ?? '').replace(/[  ]/g, ' ')

const CAT = {
  productos: [], presentaciones: [], marcas: [],
  insumos: [
    { id: 'harina', nombre: 'Harina 000', marca: 'Júpiter', categoria: 'Harinas', unidad_medida: 'kg', stock: 6250, vista_preferida: 'bulto', contenido: 25 },
    { id: 'azucar', nombre: 'Azúcar', marca: null, categoria: 'Azúcares', unidad_medida: 'kg', stock: 500, vista_preferida: 'bulto', contenido: 50 },
    { id: 'oleo', nombre: 'Óleo margarina', marca: 'Ultra', categoria: 'Grasas', unidad_medida: 'kg', stock: 200, vista_preferida: 'bulto', contenido: 20 },
    { id: 'lecitina', nombre: 'Lecitina de soja', marca: null, categoria: 'Aditivos', unidad_medida: 'kg', stock: 12, vista_preferida: 'base', contenido: 25 },
    { id: 'sal', nombre: 'Sal', marca: null, categoria: 'Secos', unidad_medida: 'kg', stock: 100, vista_preferida: 'bulto', contenido: null },
  ],
}

function conEmpresa(S) {
  S.estado.empresaId = 'u-n'
  S.estado.catalogo = CAT
  S.estado.catalogoEmpresa = 'u-n'
  S.estado.clientes = [{ id: 'c1', nombre: 'Anatolia', apodos: [], activo: true }]
  S.estado.form = S.formVacio()
  return S.estado.form
}
const selDe = (S, tabla) => ((S.__llamadas.consultas.find(c => c[0] === tabla) || [null, []])[1].find(f => f[0] === 'select') || [null, ''])[1]

// ── El catálogo: la vista y lo que trae un bulto ─────────────────────────
{
  const S = nuevo()
  S.__tablas.marcas_personalizadas = []
  S.__tablas.insumos = [{ id: 'azucar', nombre: 'Azúcar', marca: null, categoria: 'Azúcares', unidad_medida: 'kg', vista_preferida: 'bulto' }]
  S.__tablas.v_stock_insumos = [{ insumo_id: 'azucar', contenido_unico: '50' }]
  S.__setRpc(async (n) => n === 'catalogo_para_retiro'
    ? { data: { productos: [], insumos: [{ insumo_id: 'azucar', nombre: 'Azúcar', marca: null, categoria: 'Azúcares', unidad_medida: 'kg', stock: 500 }] }, error: null }
    : { data: null, error: null })
  esperas.push(S.leerCatalogo('u-n').then(cat => {
    const a = cat.insumos.find(i => i.id === 'azucar')
    chk('los insumos se leen con vista_preferida', /vista_preferida/.test(selDe(S, 'insumos')))
    chk('lo que trae un bulto sale de v_stock_insumos.contenido_unico', /contenido_unico/.test(selDe(S, 'v_stock_insumos')) && a.contenido === 50 && a.vista_preferida === 'bulto')
  }))
  const T = nuevo()
  T.__tablas.marcas_personalizadas = []
  T.__tablas.insumos = [{ id: 'azucar', nombre: 'Azúcar', unidad_medida: 'kg', vista_preferida: 'bulto' }]
  T.__tablas.v_stock_insumos = () => ({ data: null, error: { message: 'permiso' } })
  T.__setRpc(async (n) => n === 'catalogo_para_retiro'
    ? { data: { productos: [], insumos: [{ insumo_id: 'azucar', nombre: 'Azúcar', unidad_medida: 'kg', stock: 500 }] }, error: null }
    : { data: null, error: null })
  esperas.push(T.leerCatalogo('u-n').then(cat => {
    const a = cat.insumos.find(i => i.id === 'azucar')
    chk('si no se puede leer lo que trae un bulto, el catálogo carga igual, sin contenido', a && a.contenido === null)
  }))
  // El catálogo manda (24/10/2026): insumos.contenido_bulto lo lee cualquier
  // usuario logueado; v_stock_insumos (stock:ver) solo cubre los null.
  const U = nuevo()
  U.__tablas.marcas_personalizadas = []
  U.__tablas.insumos = [
    { id: 'harina', nombre: 'Harina 000', marca: 'Júpiter', categoria: 'Harinas', unidad_medida: 'kg', vista_preferida: 'bulto', contenido_bulto: '25' },
    { id: 'colorante', nombre: 'Colorante', marca: 'Nico', categoria: 'Aditivos', unidad_medida: 'kg', vista_preferida: 'bulto', contenido_bulto: '25' },
    { id: 'sal', nombre: 'Sal', marca: null, categoria: 'Secos', unidad_medida: 'kg', vista_preferida: 'bulto', contenido_bulto: null },
  ]
  // Sin stock:ver la vista vuelve vacía (la RLS no da error): igual hay bulto.
  U.__tablas.v_stock_insumos = []
  U.__setRpc(async (n) => n === 'catalogo_para_retiro'
    ? { data: { productos: [], insumos: [
      { insumo_id: 'harina', nombre: 'Harina 000', marca: 'Júpiter', categoria: 'Harinas', unidad_medida: 'kg', stock: 250 },
      { insumo_id: 'colorante', nombre: 'Colorante', marca: 'Nico', categoria: 'Aditivos', unidad_medida: 'kg', stock: 50 },
      { insumo_id: 'sal', nombre: 'Sal', marca: null, categoria: 'Secos', unidad_medida: 'kg', stock: 100 },
    ] }, error: null }
    : { data: null, error: null })
  esperas.push(U.leerCatalogo('u-n').then(cat => {
    const de = id => cat.insumos.find(i => i.id === id)
    chk('los insumos se leen con contenido_bulto', /contenido_bulto/.test(selDe(U, 'insumos')))
    chk('sin nada en v_stock_insumos (sin stock:ver), la harina trae 25 kg del catálogo', de('harina').contenido === 25)
    chk('el colorante Nico (bidón de 25 kg) también', de('colorante').contenido === 25 && de('colorante').vista_preferida === 'bulto')
    chk('la sal (contenido_bulto null, sin stock) sigue sin contenido', de('sal').contenido === null)
    U.estado.empresaId = 'u-n'
    U.estado.catalogo = cat
    U.estado.catalogoEmpresa = 'u-n'
    U.estado.form = U.formVacio()
    U.elegirInsumoRenglon(0, 'colorante')
    const m = U.modoInsumoRenglon(U.estado.form.renglones[0])
    chk('el colorante Nico se pide en bidones de 25 kg', m?.enBultos === true && m.contenido === 25)
  }))
  const V = nuevo()
  V.__tablas.marcas_personalizadas = []
  V.__tablas.insumos = [
    { id: 'harina', nombre: 'Harina 000', marca: 'Júpiter', categoria: 'Harinas', unidad_medida: 'kg', vista_preferida: 'bulto', contenido_bulto: 25 },
    { id: 'sal', nombre: 'Sal', marca: null, categoria: 'Secos', unidad_medida: 'kg', vista_preferida: 'bulto', contenido_bulto: null },
  ]
  V.__tablas.v_stock_insumos = [{ insumo_id: 'harina', contenido_unico: 50 }, { insumo_id: 'sal', contenido_unico: 25 }]
  V.__setRpc(async (n) => n === 'catalogo_para_retiro'
    ? { data: { productos: [], insumos: [
      { insumo_id: 'harina', nombre: 'Harina 000', marca: 'Júpiter', categoria: 'Harinas', unidad_medida: 'kg', stock: 250 },
      { insumo_id: 'sal', nombre: 'Sal', marca: null, categoria: 'Secos', unidad_medida: 'kg', stock: 100 },
    ] }, error: null }
    : { data: null, error: null })
  esperas.push(V.leerCatalogo('u-n').then(cat => {
    const de = id => cat.insumos.find(i => i.id === id)
    chk('el catálogo (25) le gana al stock (50)', de('harina').contenido === 25)
    chk('con contenido_bulto null, sale del stock como antes (sal 25)', de('sal').contenido === 25)
  }))
}

// ── EL CASO: 1 bolsa de azúcar de 50 kg ──────────────────────────────────
{
  const S = nuevo()
  const f = conEmpresa(S)
  S.elegirInsumoRenglon(0, 'azucar')
  const r = f.renglones[0]
  const modo = S.modoInsumoRenglon(r)
  chk('azúcar se pide en bultos de 50 kg', modo.enBultos === true && nb(modo.rotulo) === 'bultos de 50 kg')
  const h = nb(S.htmlRenglon(r, 0, CAT, false))
  chk('el campo dice "¿Cuánto se lleva? (bultos de 50 kg)"', h.includes('¿Cuánto se lleva? (bultos de 50 kg)'))
  chk('"hay 10 bultos (500 kg)"', h.includes('hay 10 bultos (500 kg)'))
  S.ponerCantidadInsumo(0, 1)
  chk('"1" bolsa deja 50 kg en el renglón', r.cantidad === 50)
  chk('… y a la base van 50 kg', S.itemParaBase(r).cantidad === 50)
  chk('debajo, "= 50 kg"', nb(S.textoEquivaleRenglon(r)) === '= 50 kg')
  chk('el campo vuelve a decir 1 (bulto)', S.cantidadEnCampo(r.cantidad, modo) === 1)
  S.sumarAlRenglon(0, 1)
  chk('"+" suma un bulto: 100 kg', r.cantidad === 100)
  S.sumarAlRenglon(0, -1)
  chk('"−" resta un bulto: 50 kg', r.cantidad === 50)
  S.ponerCantidadInsumo(0, 0.5)
  chk('medio bulto: 25 kg', r.cantidad === 25)
  S.ponerCantidadInsumo(0, null)
  chk('vacío no es cero', r.cantidad === null && S.textoEquivaleRenglon(r) === '')
}

// ── Harina: los lotes también en bultos ──────────────────────────────────
{
  const S = nuevo()
  const f = conEmpresa(S)
  S.elegirInsumoRenglon(0, 'harina')
  const r = f.renglones[0]
  S.estado.lotes.set('ins|harina', { cargando: false, error: null, lista: [{ lote: 'H-1', saldo: 100, desde: '2026-10-01' }, { lote: 'H-2', saldo: 6150, desde: '2026-10-10' }] })
  S.ponerCantidadInsumo(0, 4)
  chk('4 bolsas de 25 kg = 100 kg', r.cantidad === 100)
  const modo = S.modoInsumoRenglon(r)
  // Lo que se escribe en un lote pasa por la misma conversión que el campo.
  S.ponerCantidadLote(0, 'H-1', S.cantidadDesdeCampo(2, modo).base)
  S.ponerCantidadLote(0, 'H-2', S.cantidadDesdeCampo(2, modo).base)
  chk('2 bultos del lote H-1 = 50 kg', r.lotes['H-1'] === 50 && r.lotes['H-2'] === 50)
  chk('a la base van los lotes en kilos', JSON.stringify(S.itemParaBase(r).lotes) === JSON.stringify([{ lote: 'H-1', cantidad: 50 }, { lote: 'H-2', cantidad: 50 }]))
  const h = nb(S.htmlLoteRenglon(r, 0))
  chk('"quedan 4 bultos (100 kg)" en el lote', h.includes('quedan <strong>4 bultos (100 kg)</strong>'), h.slice(0, 600))
  chk('al lado del campo del lote dice "bultos"', h.includes('rt-lote-fila__unidad">bultos<'))
  chk('el handler de los lotes convierte lo escrito', /cantidadDesdeCampo\(escrito, modoInsumoRenglon\(r\)\)\.base/.test(src))
  const tarjeta = nb(S.htmlTarjetaRenglon(r, 0, CAT, false))
  chk('la tarjeta del renglón: "4" / "bultos de 25 kg"', tarjeta.includes('>4<') && tarjeta.includes('bultos de 25 kg'))
}

// ── Óleo en la tarjeta y la opción del catálogo ──────────────────────────
{
  const S = nuevo()
  const f = conEmpresa(S)
  S.elegirInsumoRenglon(0, 'oleo')
  S.ponerCantidadInsumo(0, 2)
  chk('óleo: 2 baldes de 20 kg = 40 kg', f.renglones[0].cantidad === 40)
  const p = S.partesCantidadInsumo(f.renglones[0], 40)
  chk('la tarjeta: "2" / "bultos de 20 kg"', p.q === '2' && nb(p.u) === 'bultos de 20 kg')
  const o = { grupo: 'insumos', insumoId: 'harina', unidad: 'kg', stock: 6250 }
  chk('la opción del catálogo: "hay 250 bultos (6.250 kg)"', nb(S.textoStockOpcion(o)) === 'hay 250 bultos (6.250 kg)')
  const ps = S.partesStockOpcion(o)
  chk('… en grande "250" y debajo "bultos de 25 kg"', ps.q === '250' && nb(ps.u) === 'bultos de 25 kg')
}

// ── Lecitina y lo que no tiene contenido: por kg ─────────────────────────
{
  const S = nuevo()
  const f = conEmpresa(S)
  S.elegirInsumoRenglon(0, 'lecitina')
  const r = f.renglones[0]
  chk('lecitina (vista base): por kg', S.modoInsumoRenglon(r).enBultos === false)
  chk('el campo dice "(kg)"', nb(S.htmlRenglon(r, 0, CAT, false)).includes('¿Cuánto se lleva? (kg)'))
  S.ponerCantidadInsumo(0, 1.5)
  chk('"1,5" de lecitina son 1,5 kg', r.cantidad === 1.5)
  S.sumarAlRenglon(0, 1)
  chk('"+" en kg suma 1 kg', r.cantidad === 2.5)
  const S2 = nuevo()
  const f2 = conEmpresa(S2)
  S2.elegirInsumoRenglon(0, 'sal')
  chk('sal (bulto sin contenido conocido): por kg, sin romperse', S2.modoInsumoRenglon(f2.renglones[0]).enBultos === false)
  S2.ponerCantidadInsumo(0, 3)
  chk('"3" de sal son 3 kg', f2.renglones[0].cantidad === 3)
}

// ── La hoja ──────────────────────────────────────────────────────────────
{
  const S = nuevo()
  conEmpresa(S)
  const o = { renglones: [
    { tipo: 'insumo', insumo: 'Harina 000', marca_insumo: 'Júpiter', cantidad: 100, unidad_medida: 'kg', insumo_id: 'harina', lotes: [] },
    { tipo: 'insumo', insumo: 'Lecitina de soja', marca_insumo: null, cantidad: 2, unidad_medida: 'kg', insumo_id: 'lecitina', lotes: [] },
  ] }
  const rs = S.renglonesParaHoja(o)
  chk('la hoja sabe lo que trae un bulto de harina (y la lecitina no)', rs[0].contenido === 25 && rs[1].contenido === null)
  chk('"4 bultos de 25 kg (100 kg)"', nb(S.cantidadHoja(rs[0])) === '4 bultos de 25 kg (100 kg)')
  chk('la lecitina sigue "2 kg"', nb(S.cantidadHoja(rs[1])) === '2 kg')
  chk('la hoja de la Carga NO tiene precios', !/rh-plata/.test(S.htmlFilaHoja(rs[0], false, 'ARS')))
}

fin()
