// ADMINISTRACIÓN — Listas de precios: los INSUMOS a precio fijo o a costo + %
// (09/10/2026).
//
// Exige:
//  - se leen con precios_insumos_lista(p_lista_id, p_fecha null), y el costo
//    de la fábrica con costos_insumos SOLO con stock:ver_costos ahí;
//  - un renglón dice "Precio fijo $ X por kg" o "Costo + N % → $ X por kg";
//    sin_costo = true va en bordó con "falta cargar el costo";
//  - los renglones de la grilla de arriba (solo precio_caja) no se repiten;
//  - "Costo + %" solo lo ve quien tiene stock:ver_costos en la fábrica de la
//    lista; costo 1.000 + 15 % dice $ 1.150 en la vista previa y viajan
//    p_recargo_costo_pct = 15 y p_precio_unitario = null; un precio fijo viaja
//    al revés; EXACTAMENTE uno de los dos;
//  - cambiar de modo vacía el campo; un doble toque manda una vez; el error de
//    la base va tal cual;
//  - todo texto de la base escapado.
//
//   node pruebas/test-administracion-costos.js

const path = require('path')
const fs = require('fs')
const { construirAdministracion } = require('./sandbox-administracion')
const { arnes } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/administracion.html')
const src = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${src.length} bytes)`)
const { chk, fin } = arnes()

const CAT = {
  productos: [], presentaciones: [], marcas: [],
  insumos: [
    { id: 'i1', nombre: 'Harina 000', marca: 'Molino', unidad_medida: 'kg', categoria: 'Harinas', activo: true },
    { id: 'i2', nombre: 'Bolsa', marca: null, unidad_medida: 'un', categoria: 'Bolsas', activo: true },
    { id: 'i3', nombre: 'Azúcar', marca: null, unidad_medida: 'kg', categoria: 'Azúcares y secos', activo: true },
    { id: 'i9', nombre: 'Vieja', marca: null, unidad_medida: 'kg', categoria: 'Harinas', activo: false },
  ],
}
// Como la devuelve la base: los numeric como texto.
const PRECIOS_INS = [
  { insumo_id: 'i1', insumo: 'Harina 000', unidad_medida: 'kg', precio_unitario: '1500', tipo: 'fijo', recargo_costo_pct: null, vigente_desde: '2026-10-01', sin_costo: false },
  { insumo_id: 'i2', insumo: 'Bolsa', unidad_medida: 'un', precio_unitario: '57.5', tipo: 'costo_mas_pct', recargo_costo_pct: '15', vigente_desde: '2026-10-01', sin_costo: false },
  { insumo_id: 'i3', insumo: 'Azúcar', unidad_medida: 'kg', precio_unitario: null, tipo: 'costo_mas_pct', recargo_costo_pct: '20', vigente_desde: '2026-10-01', sin_costo: true },
  // Uno de la grilla de arriba (solo precio_caja): no se repite acá.
  { insumo_id: 'i9', insumo: 'Vieja', unidad_medida: 'kg', precio_unitario: null, tipo: 'fijo', recargo_costo_pct: null, vigente_desde: '2026-09-01', sin_costo: false },
]
const COSTOS = [
  { insumo_id: 'i1', costo_unitario: '1000.0000' },
  { insumo_id: 'i2', costo_unitario: '50' },
  { insumo_id: 'i3', costo_unitario: null },
]

function nuevo({ verCostos = true } = {}) {
  const S = construirAdministracion(ARCHIVO)
  S.estado.misTareas = new Map([['retiros:ver', { unidades: ['u-n'] }], ['retiros:precios', { unidades: ['u-n'] }],
    ...(verCostos ? [['stock:ver_costos', { unidades: ['u-n'] }]] : [])])
  S.estado.clientes = []
  S.estado.catalogo = CAT
  S.estado.catalogoEmpresa = 'u-n'
  S.__tablas.listas_precios = [{ id: 'l1', nombre: 'Mayoristas', moneda: 'ARS', activa: true }]
  S.__tablas.lista_precios_items = []
  S.__setRpc((n) => {
    if (n === 'precios_insumos_lista') return { data: PRECIOS_INS, error: null }
    if (n === 'costos_insumos') return { data: COSTOS, error: null }
    if (n === 'lista_completa') return { data: null, error: null }
    return { data: null, error: null }
  })
  return S
}
const tarjeta = S => S.__els.get('ad-lista-insumos').innerHTML
const rpcs = (S, n) => S.__llamadas.rpc.filter(r => r[0] === n)
const esperar = () => new Promise(r => setImmediate(r))

async function abierta(op) {
  const S = nuevo(op)
  await S.abrirLista('l1')
  await esperar(); await esperar()
  return S
}

async function correr() {
  // ── Lectura y renglones ────────────────────────────────────────────────
  {
    const S = await abierta()
    const p = rpcs(S, 'precios_insumos_lista')
    chk('lee precios_insumos_lista con la lista y fecha null', p.length === 1 && p[0][1].p_lista_id === 'l1' && p[0][1].p_fecha === null, JSON.stringify(p))
    const c = rpcs(S, 'costos_insumos')
    chk('con ver_costos lee el costo de la fábrica', c.length === 1 && c[0][1].p_unidad_negocio_id === 'u-n')
    const h = tarjeta(S)
    chk('precio fijo', /Precio fijo \$ 1\.500,00 por kg · desde el 01\/10\/2026/.test(h), h)
    chk('costo + %', /Costo \+ 15 % → \$ 57,50 por u/.test(h), h)
    chk('sin costo en bordó con "falta cargar el costo"', /ad-insumo-precio--sin-costo[\s\S]*?Costo \+ 20 % · falta cargar el costo/.test(h))
    chk('un renglón de la grilla de arriba no se repite', !/Vieja/.test(h))
    chk('se puede agregar', /id="ad-ins-agregar"/.test(h))
    chk('dice que valorizar todavía usa la grilla de arriba', /todavía se propone el precio de la grilla de arriba/.test(h))
  }
  // Sin ver_costos: no se lee el costo, y el % no se ve.
  {
    const S = await abierta({ verCostos: false })
    chk('sin ver_costos: no se llama a costos_insumos', rpcs(S, 'costos_insumos').length === 0)
    S.estado.lista.insumos.filas = PRECIOS_INS.map(f => f.tipo === 'costo_mas_pct' ? { ...f, recargo_costo_pct: null } : f)
    S.pintarInsumosLista()
    const h = tarjeta(S)
    chk('sin ver_costos: dice "Sobre el costo" sin el %', /Sobre el costo → \$ 57,50 por u/.test(h) && !/Costo \+ 15/.test(h), h)
    S.abrirEditorInsumoLista('i2')
    const h2 = tarjeta(S)
    chk('sin ver_costos: el editor no ofrece "Costo + %"', !/data-ins-modo="costo"/.test(h2) && /data-ins-modo="fijo"/.test(h2))
    chk('sin ver_costos: un renglón a costo se edita como precio fijo', S.estado.lista.insumosEd.modo === 'fijo')
    S.cambiarModoInsumoLista('costo')
    chk('sin ver_costos: no se puede pasar a costo', S.estado.lista.insumosEd.modo === 'fijo')
  }

  // ── Costo + 15 % sobre 1.000 ───────────────────────────────────────────
  {
    const S = await abierta()
    S.abrirEditorInsumoLista('i1')
    chk('un precio fijo arranca en fijo con su precio', S.estado.lista.insumosEd.modo === 'fijo' && S.__els.get('ad-ins-precio').value === '1.500')
    S.cambiarModoInsumoLista('costo')
    chk('cambiar de modo vacía el campo', S.estado.lista.insumosEd.valor === null && S.__els.get('ad-ins-pct').value === '')
    S.__els.get('ad-ins-pct').value = '15'
    S.pintarPreviaInsumoLista()
    const previa = S.__els.get('ad-ins-previa').textContent
    chk('vista previa: costo 1.000 + 15 % = 1.150', /Costo \$ 1\.000,00 \+ 15 % = \$ 1\.150,00 por kg/.test(previa), previa)
    S.__setRpc((n) => n === 'guardar_precio_insumo_lista' ? { data: 'id', error: null } : (n === 'precios_insumos_lista' ? { data: PRECIOS_INS, error: null } : { data: COSTOS, error: null }))
    const a = S.guardarInsumoLista(), b = S.guardarInsumoLista()
    await Promise.all([a, b])
    const g = rpcs(S, 'guardar_precio_insumo_lista')
    chk('doble toque: UNA llamada', g.length === 1, g.length)
    chk('viaja p_recargo_costo_pct = 15 y p_precio_unitario = null', g[0]?.[1].p_recargo_costo_pct === 15 && g[0]?.[1].p_precio_unitario === null, JSON.stringify(g[0]))
    chk('con la lista, el insumo y la fecha', g[0]?.[1].p_lista_id === 'l1' && g[0]?.[1].p_insumo_id === 'i1' && /^\d{4}-\d{2}-\d{2}$/.test(g[0]?.[1].p_vigente_desde))
    chk('guardado: relee los renglones', rpcs(S, 'precios_insumos_lista').length === 2)
    chk('guardado: cierra el editor', S.estado.lista.insumosEd === null)
    chk('guardado: lo dice', S.__llamadas.exitos.includes('Precio del insumo guardado.'))
  }
  // Precio fijo: al revés.
  {
    const S = await abierta()
    S.abrirEditorInsumoLista(null)
    chk('agregar: pide el insumo (solo los activos)', /<option value="i1"/.test(tarjeta(S)) && !/<option value="i9"/.test(tarjeta(S)))
    await S.guardarInsumoLista()
    chk('sin insumo no se manda', rpcs(S, 'guardar_precio_insumo_lista').length === 0 && S.__els.get('ad-ins-error').textContent === 'Elegí el insumo.')
    S.estado.lista.insumosEd.insumoId = 'i3'
    S.pintarInsumosLista()
    S.__els.get('ad-ins-precio').value = '2.345,6789'
    S.__setRpc((n) => n === 'guardar_precio_insumo_lista' ? { data: 'id', error: null } : { data: [], error: null })
    await S.guardarInsumoLista()
    const g = rpcs(S, 'guardar_precio_insumo_lista')
    chk('precio fijo: p_precio_unitario con 4 decimales y p_recargo_costo_pct null', g[0]?.[1].p_precio_unitario === 2345.6789 && g[0]?.[1].p_recargo_costo_pct === null, JSON.stringify(g[0]))
  }
  // Validaciones y el error de la base.
  {
    const S = await abierta()
    S.abrirEditorInsumoLista('i2')
    chk('un renglón a costo arranca en costo con su %', S.estado.lista.insumosEd.modo === 'costo' && S.__els.get('ad-ins-pct').value === '15')
    S.__els.get('ad-ins-pct').value = '-100'
    await S.guardarInsumoLista()
    chk('-100 % no se manda', rpcs(S, 'guardar_precio_insumo_lista').length === 0 && /-100/.test(S.__els.get('ad-ins-error').textContent))
    S.__els.get('ad-ins-pct').value = '10'
    S.__setRpc((n) => n === 'guardar_precio_insumo_lista' ? { data: null, error: { message: 'Para poner un % sobre el costo tenés que tener permiso de ver costos.' } } : { data: [], error: null })
    await S.guardarInsumoLista()
    chk('el error de la base, tal cual', S.__els.get('ad-ins-error').textContent === 'Para poner un % sobre el costo tenés que tener permiso de ver costos.' && S.__els.get('ad-ins-error').hidden === false)
    chk('y el botón vuelve a andar', S.__els.get('ad-ins-guardar').disabled === false && S.estado.lista.insumosEd.enviando === false)
  }
  // Sin costo cargado: la vista previa lo dice, nunca "$ 0".
  {
    const S = await abierta()
    S.abrirEditorInsumoLista('i3')
    S.__els.get('ad-ins-pct').value = '20'
    S.pintarPreviaInsumoLista()
    const previa = S.__els.get('ad-ins-previa').textContent
    chk('sin costo: lo dice', /todavía no tiene costo cargado/.test(previa) && !/\$ 0/.test(previa), previa)
  }
  // Error al leer: se dice; la grilla no se cae.
  {
    const S = nuevo()
    S.__setRpc((n) => n === 'precios_insumos_lista' ? { data: null, error: { message: 'No tenés permiso.' } } : { data: null, error: null })
    await S.abrirLista('l1')
    await esperar(); await esperar()
    chk('error al leer: lo dice', /No se pudieron leer los precios de insumos: No tenés permiso\./.test(tarjeta(S)))
    chk('la grilla se abrió igual', S.estado.lista.error === null)
  }
  // Escapado.
  {
    const malo = '"><img src=x onerror=alert(1)>'
    const S = nuevo()
    S.estado.catalogo = { ...CAT, insumos: [{ id: 'i"><b>', nombre: malo, marca: malo, unidad_medida: '<i>kg', activo: true }] }
    S.__setRpc((n) => n === 'precios_insumos_lista'
      ? { data: [{ ...PRECIOS_INS[0], insumo_id: 'z"><u>', insumo: malo, unidad_medida: '<i>kg' }], error: null }
      : { data: [], error: null })
    await S.abrirLista('l1')
    await esperar(); await esperar()
    S.abrirEditorInsumoLista(null)
    S.estado.lista.insumosEd.insumoId = 'i"><b>'
    S.pintarInsumosLista()
    const h = tarjeta(S)
    chk('ningún <img crudo', !/<img src=x/.test(h), h)
    chk('el nombre escapado', /&quot;&gt;&lt;img src=x/.test(h))
    chk('los ids escapados', !/<u>|<b>/.test(h) && /data-insumo-precio-editar="z&quot;&gt;&lt;u&gt;"/.test(h) && /value="i&quot;&gt;&lt;b&gt;"/.test(h))
    chk('la unidad escapada', !/<i>/.test(h) && /&lt;i&gt;kg/.test(h))
    S.estado.lista.insumosEd = null
    S.abrirEditorInsumoLista('z"><u>')
    const h3 = tarjeta(S)
    chk('editando un renglón: el nombre escapado', /<p class="ad-insumo-precio__nombre">&quot;&gt;&lt;img/.test(h3) && !/<img src=x/.test(h3), h3)
    const S2 = nuevo()
    S2.__setRpc((n) => n === 'precios_insumos_lista' ? { data: null, error: { message: malo } } : { data: null, error: null })
    await S2.abrirLista('l1')
    await esperar(); await esperar()
    chk('el error escapado', !/<img src=x/.test(tarjeta(S2)) && /&lt;img/.test(tarjeta(S2)))
  }
  // El cableado.
  chk('la tarjeta está en la vista de la lista', /<div id="ad-lista-insumos"><\/div>/.test(src))
  chk('las tareas de stock se leen con su alcance', /\.in\('modulo', \[[^\]]*'stock'[^\]]*\]\)/.test(src))
}

correr().then(() => fin(), e => { chk('la suite corre sin excepción', false, String(e && e.stack || e)); fin() })
